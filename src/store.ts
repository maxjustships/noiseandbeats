import type { BeatType, NoiseColor } from './lib/types';

type Listener = () => void;

export interface Store<T> {
  get: () => T;
  set: (value: T) => void;
  subscribe: (listener: Listener) => () => void;
}

function atom<T>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<Listener>();

  return {
    get: () => value,
    set: (next) => {
      if (Object.is(value, next)) return;
      value = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const isPlaying = atom(false);
export const bpm = atom(60);
export const noiseColor = atom<NoiseColor>('brown');
export const beatType = atom<BeatType>('pulse');
export const noiseVolume = atom(0.5);
export const beatVolume = atom(0.5);
export const isZen = atom(false);
export const timerRemaining = atom<number | null>(null);
