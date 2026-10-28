import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ORIGIN = 'https://babywetter.test';
const workerSource = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const cacheName = workerSource.match(/const CACHE_NAME = '([^']+)'/)?.[1];

function pathFor(key) {
  const value = key instanceof Request ? key.url : String(key);
  return new URL(value, ORIGIN).pathname;
}

function createWorkerHarness(fetchImpl) {
  const listeners = new Map();
  const cacheContents = new Map();
  const cacheFor = (name) => {
    if (!cacheContents.has(name)) cacheContents.set(name, new Map());
    const contents = cacheContents.get(name);
    return {
      async match(key) {
        return contents.get(pathFor(key))?.clone() ?? null;
      },
      async put(key, response) {
        contents.set(pathFor(key), response.clone());
      },
      async addAll() {}
    };
  };
  const caches = {
    async open(name) {
      return cacheFor(name);
    },
    async match(key) {
      for (const contents of [...cacheContents.values()].reverse()) {
        const response = contents.get(pathFor(key));
        if (response) return response.clone();
      }
      return null;
    },
    async keys() {
      return [...cacheContents.keys()];
    }
  };
  class WorkerRequest extends Request {
    constructor(input, init) {
      super(typeof input === 'string' ? new URL(input, ORIGIN) : input, init);
    }
  }
  const self = {
    location: { origin: ORIGIN },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    }
  };
  vm.runInNewContext(workerSource, {
    self,
    caches,
    URL,
    Request: WorkerRequest,
    Response,
    fetch: fetchImpl,
    Promise,
    setTimeout
  }, { filename: 'sw.js' });

  return {
    cacheFor,
    cacheName,
    async request(path) {
      let result;
      const request = new WorkerRequest(new URL(path, ORIGIN), { method: 'GET' });
      listeners.get('fetch')({
        request,
        respondWith(response) {
          result = Promise.resolve(response);
        }
      });
      assert.ok(result, 'fetch handler should call respondWith');
      return result;
    }
  };
}

test('online app-shell requests refresh the cache from the network', async () => {
  const requests = [];
  const worker = createWorkerHarness(async (request) => {
    requests.push(request);
    return new Response('fresh renderer');
  });
  const cache = await worker.cacheFor(worker.cacheName);
  await cache.put('/ui/render.js', new Response('stale renderer'));

  const response = await worker.request('/ui/render.js');

  assert.equal(await response.text(), 'fresh renderer');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].cache, 'reload');
  assert.equal(await (await cache.match('/ui/render.js')).text(), 'fresh renderer');
});

test('offline app-shell requests fall back to the cached version', async () => {
  const worker = createWorkerHarness(async () => {
    throw new TypeError('offline');
  });
  const cache = await worker.cacheFor(worker.cacheName);
  await cache.put('/ui/render.js', new Response('cached renderer'));

  const response = await worker.request('/ui/render.js');

  assert.equal(await response.text(), 'cached renderer');
});

test('clothing images remain cache-first for offline use', async () => {
  let networkRequests = 0;
  const worker = createWorkerHarness(async () => {
    networkRequests += 1;
    throw new TypeError('offline');
  });
  const cache = await worker.cacheFor(worker.cacheName);
  await cache.put('/assets/clothing/body.webp', new Response('cached image'));

  const response = await worker.request('/assets/clothing/body.webp');

  assert.equal(await response.text(), 'cached image');
  assert.equal(networkRequests, 0);
});
