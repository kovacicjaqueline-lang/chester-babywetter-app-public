import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('sleep loose-bedding UI copy uses the broad safety code and wording', async () => {
  const source = await readFile(new URL('../ui/render.js', import.meta.url), 'utf8');
  assert.match(source, /SLEEP_NO_LOOSE_BEDDING:\s*\['Keine lose Bettware im Schlafbereich'/);
  assert.match(source, /auch wenn kein Schlafsack gewählt ist/);
  assert.doesNotMatch(source, /SLEEP_NO_LOOSE_BLANKET_OVER_BAG:/);
  assert.doesNotMatch(source, /Keine lose Decke zusätzlich über dem Schlafsack verwenden/);
});
