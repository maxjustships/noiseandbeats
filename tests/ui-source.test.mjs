import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { loadTypeScriptModule, transpileTypeScriptFile } from './helpers/load-typescript.mjs';

test('the React instrument transpiles and keeps pointer handlers on semantic controls', async () => {
  await transpileTypeScriptFile('src/components/ZenPlayer.tsx');

  const source = await readFile('src/components/ZenPlayer.tsx', 'utf8');
  assert.doesNotMatch(source, /<div[^>]+onClick=/);
  assert.match(source, /<dialog/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /isInteractiveTarget\(event\.target\)/);
});

test('the local store exposes stable get, set, and subscription behavior', async () => {
  const stores = await loadTypeScriptModule('src/store.ts');
  let notifications = 0;
  const unsubscribe = stores.bpm.subscribe(() => { notifications += 1; });

  stores.bpm.set(60);
  stores.bpm.set(65);
  unsubscribe();
  stores.bpm.set(70);

  assert.equal(notifications, 1);
  assert.equal(stores.bpm.get(), 70);
});
