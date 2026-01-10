import { isPlaying, bpm, noiseColor, beatType, noiseVolume, beatVolume } from '../store';


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

  constructor() {
    // We init context lazily on user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      this.ctx = new AudioContextClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);

      // Subscribe to stores
      noiseVolume.subscribe(() => {
        if (this.ctx && this.noiseGain && isPlaying.get()) {
           // Smooth transition for volume changes
           const target = noiseVolume.get() * 0.5; // Scale down a bit as raw noise is loud
           this.noiseGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
        }
      });
      
      noiseColor.subscribe(() => this.updateNoise());
      // beatVolume is read per beat
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

    // Update Filter & Volume
    if (this.noiseFilter && this.noiseGain) {
      // Set volume based on store
      const targetVol = noiseVolume.get() * 0.5;
      this.noiseGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.5);

      const t = this.ctx.currentTime;
      switch (color) {
        case 'brown':
          this.noiseFilter.type = 'lowpass';
          this.noiseFilter.frequency.setTargetAtTime(150, t, 0.2);
          break;
        case 'red': 
          this.noiseFilter.type = 'lowpass';
          this.noiseFilter.frequency.setTargetAtTime(350, t, 0.2);
          break;
        case 'white':
          this.noiseFilter.type = 'allpass'; 
          break;
        case 'pink':
          this.noiseFilter.type = 'lowpass';
          this.noiseFilter.frequency.setTargetAtTime(600, t, 0.2); 
          break;
        case 'blue':
          this.noiseFilter.type = 'highpass';
          this.noiseFilter.frequency.setTargetAtTime(800, t, 0.2);
          break;
        case 'green': 
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
    this.stopNoise();

    const color = noiseColor.get();
    if (color === 'off') return;

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = this.createWhiteNoiseBuffer();
    this.noiseNode.loop = true;

    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseGain = this.ctx.createGain();
    
    // Initial silent start, let updateNoise ramp it up
    this.noiseGain.gain.value = 0; 

    this.noiseNode.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain!);

    this.noiseNode.start();
    this.updateNoise(); 
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

    const bVol = beatVolume.get();

    if (type === 'kick') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
      
      // Peak gain scaled by beatVolume
      gain.gain.setValueAtTime(0.8 * bVol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

      osc.start(time);
      osc.stop(time + 0.5);
    } else if (type === 'pulse') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.type = 'sine';
      osc.frequency.value = 60; 

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.6 * bVol, time + 0.1);
      gain.gain.linearRampToValueAtTime(0, time + 0.4);

      osc.start(time);
      osc.stop(time + 0.5);
    } else if (type === 'binaural') {
      const baseFreq = 200;
      const beatFreq = 10; 

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

      gain.gain.setValueAtTime(0.1 * bVol, time);
      gain.gain.linearRampToValueAtTime(0.3 * bVol, time + 0.1);
      gain.gain.linearRampToValueAtTime(0.1 * bVol, time + 0.5);

      oscL.start(time);
      oscR.start(time + 0.6); 
      
      oscL.stop(time + 0.5);
      oscR.stop(time + 0.5);
    }
  }
}

export const audio = new AudioEngine();