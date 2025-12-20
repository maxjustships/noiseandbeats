export type NoiseColor = 'brown' | 'red' | 'pink' | 'white' | 'green' | 'blue' | 'black' | 'off';
export type BeatType = 'kick' | 'pulse' | 'binaural' | 'off';

export interface AppState {
  isPlaying: boolean;
  bpm: number;
  noiseColor: NoiseColor;
  beatType: BeatType;
  volume: number; // 0.0 to 1.0
  isZen: boolean;
  timerDuration: number | null; // in minutes, null if infinite
  timerRemaining: number | null; // in seconds
}