import { isPlaying, bpm, noiseColor, beatType, volume } from '../store';
import type { NoiseColor, BeatType } from './types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  
  private masterGain: GainNode | null = null;

  // Scheduler
  private nextNoteTime: number = 0;
  private timerID: number | null = null;
  private lookahead = 25.0; // ms
  private scheduleAheadTime = 0.1; // s

  // Binaural/Beat state
  // (State is handled per note in scheduler)

  constructor() {
    // We init context lazily on user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      this.ctx = new AudioContextClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = volume.get();
      this.masterGain.connect(this.ctx.destination);

      // Subscribe to stores to update real-time
      volume.subscribe(v => {
        if (this.masterGain) {
          this.masterGain.gain.setTargetAtTime(v, this.ctx!.currentTime, 0.1);
        }
      });

      noiseColor.subscribe(() => this.updateNoise());
      // bpm and beatType are checked in the scheduler loop
    }
  }

  public async togglePlay(shouldPlay: boolean) {
    if (shouldPlay) {
      this.initContext();
      if (this.ctx?.state === 'suspended') {
        await this.ctx.resume();
      }
      this.startNoise();
      this.startScheduler();
    } else {
      this.stopNoise();
      this.stopScheduler();
      if (this.ctx) await this.ctx.suspend();
    }
  }

  // --- Noise Generator ---
  private createWhiteNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error("No Context");
    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private updateNoise() {
    if (!this.ctx || !isPlaying.get()) return;
    
    // If noise is playing, we might need to change filter
    // Simplest: stop and restart or just update filter params if node exists
    // Since we change filter types, it's safer to re-create the graph or reuse the source if possible.
    // Let's just update the filter node params if possible, or swap it.
    
    const color = noiseColor.get();
    
    if (color === 'off') {
       if (this.noiseGain) this.noiseGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
       return;
    }

    // Ensure noise is running
    if (!this.noiseNode) {
      this.startNoise();
      return; 
    }

    // Update Filter
    if (this.noiseFilter && this.noiseGain) {
      // Ramp gain up
      this.noiseGain.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.5);

      const t = this.ctx.currentTime;
      switch (color) {
        case 'brown':
          this.noiseFilter.type = 'lowpass';
          this.noiseFilter.frequency.setTargetAtTime(150, t, 0.2);
          break;
        case 'red': // slightly brighter brown
          this.noiseFilter.type = 'lowpass';
          this.noiseFilter.frequency.setTargetAtTime(350, t, 0.2);
          break;
        case 'white':
          this.noiseFilter.type = 'allpass'; // No filtering
          break;
        case 'pink':
          // Approx with lowpass + low Q? Or just a specific lowpass
          this.noiseFilter.type = 'lowpass';
          this.noiseFilter.frequency.setTargetAtTime(600, t, 0.2); 
          // True pink is hard with one biquad, but this is "productivity pink"
          break;
        case 'blue':
          this.noiseFilter.type = 'highpass';
          this.noiseFilter.frequency.setTargetAtTime(800, t, 0.2);
          break;
        case 'green': // Nature-like
          this.noiseFilter.type = 'bandpass';
          this.noiseFilter.frequency.setTargetAtTime(1000, t, 0.2);
          this.noiseFilter.Q.value = 0.5;
          break;
        case 'black':
          this.noiseFilter.type = 'lowpass';
          this.noiseFilter.frequency.setTargetAtTime(60, t, 0.2);
          break;
      }
    }
  }

  private startNoise() {
    if (!this.ctx) return;
    // Stop existing
    this.stopNoise();

    const color = noiseColor.get();
    if (color === 'off') return;

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = this.createWhiteNoiseBuffer();
    this.noiseNode.loop = true;

    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0.05; // start low

    this.noiseNode.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain!);

    this.noiseNode.start();
    this.updateNoise(); // Apply initial filter
  }

  private stopNoise() {
    if (this.noiseNode) {
      try { this.noiseNode.stop(); } catch(e) {}
      this.noiseNode.disconnect();
      this.noiseNode = null;
    }
    if (this.noiseFilter) {
      this.noiseFilter.disconnect();
      this.noiseFilter = null;
    }
    if (this.noiseGain) {
      this.noiseGain.disconnect();
      this.noiseGain = null;
    }
  }

  // --- Scheduler & Beats ---
  private startScheduler() {
    if (!this.ctx) return;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.timerID = window.setInterval(() => this.scheduler(), this.lookahead);
  }

  private stopScheduler() {
    if (this.timerID !== null) {
      window.clearInterval(this.timerID);
      this.timerID = null;
    }
  }

  private scheduler() {
    if (!this.ctx) return;
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.nextNoteTime);
      this.nextNote();
    }
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / bpm.get();
    this.nextNoteTime += secondsPerBeat;
  }

  private scheduleNote(time: number) {
    if (!this.ctx || !this.masterGain) return;
    const type = beatType.get();
    if (type === 'off') return;

    // Create Oscillators for the beat
    if (type === 'kick') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
      
      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

      osc.start(time);
      osc.stop(time + 0.5);
    } else if (type === 'pulse') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.type = 'sine';
      osc.frequency.value = 60; // low throb

      // Swell in and out
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.6, time + 0.1);
      gain.gain.linearRampToValueAtTime(0, time + 0.4);

      osc.start(time);
      osc.stop(time + 0.5);
    } else if (type === 'binaural') {
      // 200Hz base, Delta related to State? Let's assume Alpha (10Hz difference)
      const baseFreq = 200;
      const beatFreq = 10; // 10Hz alpha wave

      const oscL = this.ctx.createOscillator();
      const oscR = this.ctx.createOscillator();
      const pannerL = this.ctx.createStereoPanner();
      const pannerR = this.ctx.createStereoPanner();
      const gain = this.ctx.createGain();

      pannerL.pan.value = -1;
      pannerR.pan.value = 1;

      oscL.connect(pannerL);
      pannerL.connect(gain);
      
      oscR.connect(pannerR);
      pannerR.connect(gain);
      
      gain.connect(this.masterGain);

      oscL.frequency.value = baseFreq;
      oscR.frequency.value = baseFreq + beatFreq;

      // Pulse the volume slightly to emphasize rhythm
      gain.gain.setValueAtTime(0.1, time);
      gain.gain.linearRampToValueAtTime(0.3, time + 0.1);
      gain.gain.linearRampToValueAtTime(0.1, time + 0.5);

      oscL.start(time);
      oscR.start(time + 0.6); // slight overlap? no, just pulse
      
      // Actually binaural is usually continuous, but user asked for "Beat".
      // Let's make it a rhythmic pulse of binaural tone.
      oscL.stop(time + 0.5);
      oscR.stop(time + 0.5);
    }
  }
}

export const audio = new AudioEngine();
