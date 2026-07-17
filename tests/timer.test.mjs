import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadTypeScriptModule } from './helpers/load-typescript.mjs';

test('timer cycles through the established session lengths and back to off', async () => {
  const { nextTimerDuration } = await loadTypeScriptModule('src/lib/timer.ts');
  const sequence = [null];

  for (let index = 0; index < 5; index += 1) {
    sequence.push(nextTimerDuration(sequence.at(-1)));
  }

  assert.deepEqual(sequence, [null, 900, 1500, 2700, 3600, null]);
});

test('timer ticks only while playing and never becomes negative', async () => {
  const { tickTimer } = await loadTypeScriptModule('src/lib/timer.ts');

  assert.equal(tickTimer(10, false), 10);
  assert.equal(tickTimer(null, true), null);
  assert.equal(tickTimer(2, true), 1);
  assert.equal(tickTimer(1, true), 0);
  assert.equal(tickTimer(0, true), 0);
});
