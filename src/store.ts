import { atom } from 'nanostores';
import type { NoiseColor, BeatType } from './lib/types';

export const isPlaying = atom<boolean>(false);
export const bpm = atom<number>(60);
export const noiseColor = atom<NoiseColor>('brown');
export const beatType = atom<BeatType>('pulse');
export const noiseVolume = atom<number>(0.5);
export const beatVolume = atom<number>(0.5);
export const isZen = atom<boolean>(false);

// Timer logic could be here or in a hook
export const timerRemaining = atom<number | null>(null);
