import { readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const roots = ['src', 'ui'];
const files = ['app.js', 'sw.js'];

const collectJs = (dir) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      collectJs(path);
    } else if (path.endsWith('.js')) {
      files.push(path);
    }
  }
};

for (const root of roots) collectJs(root);

for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Node runtime syntax check passed for ${files.length} files.`);
