import { bpm, noiseColor, beatType, noiseVolume, beatVolume } from '../store';
import type { NoiseColor, BeatType } from './types';

export interface Preset {
  id: number;
  bpm: number;
  noiseColor: NoiseColor;
  beatType: BeatType;
  noiseVolume: number;
  beatVolume: number;
}

const STORAGE_KEY = 'noiseandbeats_presets';
const LEGACY_STORAGE_KEY = 'noises_beats_presets';

export function savePreset(id: number): boolean {
  try {
    const current: Preset = {
      id,
      bpm: bpm.get(),
      noiseColor: noiseColor.get(),
      beatType: beatType.get(),
      noiseVolume: noiseVolume.get(),
      beatVolume: beatVolume.get()
    };

    const existing = getPresets();
    existing[id] = current;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return true;
  } catch (e) {
    console.error("Failed to save preset", e);
    return false;
  }
}

export function loadPreset(id: number): boolean {
  try {
    const existing = getPresets();
    const preset = existing[id];
    
    if (preset) {
      bpm.set(preset.bpm);
      noiseColor.set(preset.noiseColor);
      beatType.set(preset.beatType);
      noiseVolume.set(preset.noiseVolume);
      beatVolume.set(preset.beatVolume);
      return true;
    }
    return false;
  } catch (e) {
    console.error("Failed to load preset", e);
    return false;
  }
}

function getPresets(): Record<number, Preset> {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return JSON.parse(current);

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return {};

    const presets = JSON.parse(legacy);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    return presets;
  } catch {
    return {};
  }
}
