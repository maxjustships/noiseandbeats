import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { atom, MockAudioContext } from './helpers/audio-mocks.mjs';
import { loadTypeScriptModule } from './helpers/load-typescript.mjs';

const storeImport = "import { isPlaying, bpm, noiseColor, beatType, noiseVolume, beatVolume } from '../store';";

let AudioEngine;
let stores;

beforeEach(async () => {
  stores = {
    isPlaying: atom(true),
    bpm: atom(60),
    noiseColor: atom('off'),
    beatType: atom('pulse'),
    noiseVolume: atom(0.5),
    beatVolume: atom(0.5),
  };
  globalThis.__audioStores = stores;
  ({ AudioEngine } = await loadTypeScriptModule('src/lib/AudioEngine.ts', [
    [storeImport, 'const { isPlaying, bpm, noiseColor, beatType, noiseVolume, beatVolume } = globalThis.__audioStores;'],
  ]));
});

function schedule(type, time = 2) {
  const ctx = new MockAudioContext();
  const engine = new AudioEngine();
  stores.beatType.set(type);
  engine.ctx = ctx;
  engine.masterGain = ctx.createGain();
  engine.scheduleNote(time);
  return ctx;
}

describe('beat scheduling characterization', () => {
  test('kick schedules one oscillator for the half-second envelope', () => {
    const ctx = schedule('kick');

    assert.equal(ctx.oscillators.length, 1);
    assert.deepEqual(ctx.oscillators[0].starts, [2]);
    assert.deepEqual(ctx.oscillators[0].stops, [2.5]);
  });

  test('pulse schedules one oscillator for the half-second envelope', () => {
    const ctx = schedule('pulse');

    assert.equal(ctx.oscillators.length, 1);
    assert.deepEqual(ctx.oscillators[0].starts, [2]);
    assert.deepEqual(ctx.oscillators[0].stops, [2.5]);
  });

  test('off schedules no oscillator', () => {
    const ctx = schedule('off');
    assert.equal(ctx.oscillators.length, 0);
  });

  test('binaural schedules both stereo tones concurrently for the full pulse', () => {
    const ctx = schedule('binaural');

    assert.equal(ctx.oscillators.length, 2);
    assert.deepEqual(ctx.panners.map(({ pan }) => pan.value), [-1, 1]);
    assert.deepEqual(ctx.oscillators.map(({ starts }) => starts), [[2], [2]]);
    assert.deepEqual(ctx.oscillators.map(({ stops }) => stops), [[2.5], [2.5]]);
  });
});

test('master output is routed through a conservative dynamics limiter', () => {
  const ctx = new MockAudioContext();
  const engine = new AudioEngine();
  globalThis.window = {
    AudioContext: class {
      constructor() {
        return ctx;
      }
    },
  };

  engine.initContext();

  assert.equal(ctx.compressors.length, 1);
  const limiter = ctx.compressors[0];
  assert.equal(ctx.gains[0].connections[0], limiter);
  assert.equal(limiter.connections[0], ctx.destination);
  assert.ok(limiter.threshold.value <= -3);
  assert.ok(limiter.ratio.value >= 12);
  assert.ok(limiter.attack.value <= 0.01);
});

test('scheduler advances by the current BPM interval', () => {
  const engine = new AudioEngine();
  stores.bpm.set(120);
  engine.nextNoteTime = 10;
  engine.nextNote();
  assert.equal(engine.nextNoteTime, 10.5);
});
