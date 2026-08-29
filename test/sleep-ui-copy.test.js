import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('sleep loose-bedding UI copy is broader than sleep-bag-only wording', async () => {
  const source = await readFile(new URL('../ui/render.js', import.meta.url), 'utf8');
  assert.match(source, /SLEEP_NO_LOOSE_BLANKET_OVER_BAG:\s*\['Keine lose Bettware im Bett'/);
  assert.match(source, /unabhängig davon, ob ein Schlafsack getragen wird/);
  assert.doesNotMatch(source, /Keine lose Decke zusätzlich über dem Schlafsack verwenden/);
});
