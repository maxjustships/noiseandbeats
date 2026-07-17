import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { atom } from './helpers/audio-mocks.mjs';
import { loadTypeScriptModule } from './helpers/load-typescript.mjs';

const storeImport = "import { bpm, noiseColor, beatType, noiseVolume, beatVolume } from '../store';";

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, value);
  }
}

let stores;
let presets;

beforeEach(async () => {
  stores = {
    bpm: atom(72),
    noiseColor: atom('brown'),
    beatType: atom('pulse'),
    noiseVolume: atom(0.4),
    beatVolume: atom(0.3),
  };
  globalThis.__presetStores = stores;
  globalThis.localStorage = new MemoryStorage();
  presets = await loadTypeScriptModule('src/lib/presets.ts', [
    [storeImport, 'const { bpm, noiseColor, beatType, noiseVolume, beatVolume } = globalThis.__presetStores;'],
  ]);
});

test('preset settings round-trip entirely through local storage', () => {
  assert.equal(presets.savePreset(3), true);

  stores.bpm.set(180);
  stores.noiseColor.set('white');
  stores.beatType.set('kick');
  stores.noiseVolume.set(1);
  stores.beatVolume.set(1);

  assert.equal(presets.loadPreset(3), true);
  assert.deepEqual({
    bpm: stores.bpm.get(),
    noiseColor: stores.noiseColor.get(),
    beatType: stores.beatType.get(),
    noiseVolume: stores.noiseVolume.get(),
    beatVolume: stores.beatVolume.get(),
  }, {
    bpm: 72,
    noiseColor: 'brown',
    beatType: 'pulse',
    noiseVolume: 0.4,
    beatVolume: 0.3,
  });
});

test('empty and malformed local storage are treated as empty presets', () => {
  assert.equal(presets.loadPreset(8), false);
  localStorage.setItem('noises_beats_presets', '{not-json');
  assert.equal(presets.loadPreset(8), false);
});

test('a legacy preset is loaded and migrated to the standardized key', () => {
  localStorage.setItem('noises_beats_presets', JSON.stringify({
    2: {
      id: 2,
      bpm: 90,
      noiseColor: 'pink',
      beatType: 'binaural',
      noiseVolume: 0.25,
      beatVolume: 0.2,
    },
  }));

  assert.equal(presets.loadPreset(2), true);
  assert.match(localStorage.getItem('noiseandbeats_presets'), /"bpm":90/);
});

test('storage write failures are reported without throwing', async () => {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => { throw new Error('denied'); },
  };

  const originalError = console.error;
  console.error = () => {};
  try {
    assert.equal(presets.savePreset(1), false);
  } finally {
    console.error = originalError;
  }
});
