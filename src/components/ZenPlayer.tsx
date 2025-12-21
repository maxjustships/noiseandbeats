import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { isPlaying, bpm, noiseColor, beatType, noiseVolume, beatVolume, isZen, timerRemaining } from '../store';
import { audio } from '../lib/AudioEngine';
import { savePreset, loadPreset } from '../lib/presets';
import type { NoiseColor, BeatType } from '../lib/types';
import { Volume2, Activity, Zap, Music, Save } from 'lucide-react';

const COLORS: NoiseColor[] = ['brown', 'red', 'pink', 'white', 'green', 'blue', 'black', 'off'];
const BEATS: BeatType[] = ['pulse', 'kick', 'binaural', 'off'];

export default function ZenPlayer() {
  const $isPlaying = useStore(isPlaying);
  const $bpm = useStore(bpm);
  const $noiseColor = useStore(noiseColor);
  const $beatType = useStore(beatType);
  const $noiseVolume = useStore(noiseVolume);
  const $beatVolume = useStore(beatVolume);
  const $isZen = useStore(isZen);
  const $timer = useStore(timerRemaining);

  const [showToast, setShowToast] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true); // HUD visibility
  const [showHelp, setShowHelp] = useState(false);

  // Toast helper
  const toast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2000);
  };

  // Timer Tick
  useEffect(() => {
    let interval: number;
    if ($isPlaying && $timer !== null && $timer > 0) {
      interval = window.setInterval(() => {
        timerRemaining.set($timer - 1);
      }, 1000);
    } else if ($timer === 0) {
      // Timer finished
      isPlaying.set(false);
      audio.togglePlay(false);
      timerRemaining.set(null);
      toast("Session Complete");
    }
    return () => clearInterval(interval);
  }, [$isPlaying, $timer]);

  // --- ZEN LOGIC (Handlers) ---

  const togglePlay = useCallback((forceState?: boolean) => {
    const newState = forceState !== undefined ? forceState : !isPlaying.get();
    isPlaying.set(newState);
    audio.togglePlay(newState);
    toast(newState ? "Focusing..." : "Paused");
  }, []);

  const adjustBpm = useCallback((delta: number) => {
    const newBpm = Math.max(30, Math.min(220, bpm.get() + delta));
    bpm.set(newBpm);
    toast(`Tempo: ${newBpm}`);
  }, []);

  const cycleNoise = useCallback((direction: 1 | -1) => {
    const currentNoiseIdx = COLORS.indexOf(noiseColor.get());
    const nextNoise = COLORS[(currentNoiseIdx + direction + COLORS.length) % COLORS.length];
    noiseColor.set(nextNoise);
    toast(`Noise: ${nextNoise}`);
  }, []);

  const adjustNoiseVol = useCallback((delta: number) => {
     const nv = Math.max(0, Math.min(1, parseFloat((noiseVolume.get() + delta).toFixed(2))));
     noiseVolume.set(nv);
     toast(`Noise Volume: ${Math.round(nv * 100)}%`);
  }, []);

  const cycleBeat = useCallback((direction: 1 | -1) => {
     const bIdx = BEATS.indexOf(beatType.get());
     const nextBeat = BEATS[(bIdx + direction + BEATS.length) % BEATS.length];
     beatType.set(nextBeat);
     toast(`Beat: ${nextBeat}`);
  }, []);

  const adjustBeatVol = useCallback((delta: number) => {
     const bv = Math.max(0, Math.min(1, parseFloat((beatVolume.get() + delta).toFixed(2))));
     beatVolume.set(bv);
     toast(`Beat Volume: ${Math.round(bv * 100)}%`);
  }, []);

  const cycleTimer = useCallback(() => {
    const currentT = timerRemaining.get();
    let nextT: number | null = null;
    let msg = "Timer Stopped";

    if (currentT === null) {
        nextT = 15 * 60;
        msg = "Timer: 15m";
    } else if (currentT <= 15 * 60) {
        nextT = 25 * 60;
        msg = "Timer: 25m";
    } else if (currentT <= 25 * 60) {
        nextT = 45 * 60;
        msg = "Timer: 45m";
    } else if (currentT <= 45 * 60) {
        nextT = 60 * 60;
        msg = "Timer: 60m";
    } else {
        nextT = null;
        msg = "Timer Off";
    }
    
    timerRemaining.set(nextT);
    toast(msg);
  }, []);

  const toggleZen = useCallback(() => {
    if (showControls) {
        isZen.set(true);
        setShowControls(false);
        toast("Zen Mode On");
      } else {
        isZen.set(false);
        setShowControls(true);
        toast("Controls Visible");
      }
  }, [showControls]);


  // Keyboard Handlers
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;

    // Handle Number Keys for Presets (Logic kept inline for now as it's complex)
    if (e.key >= '0' && e.key <= '9') {
        const id = parseInt(e.key);
        if (e.ctrlKey) {
            e.preventDefault();
            if (savePreset(id)) {
                toast(`Preset ${id} Saved`);
            } else {
                toast("Save Failed");
            }
        } else {
            if (loadPreset(id)) {
                toast(`Preset ${id} Loaded`);
            } else {
                toast(`Preset ${id} Empty`);
            }
        }
        return;
    }

    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePlay();
        break;
      
      case 'Escape':
        setShowHelp(false);
        toggleZen();
        break;

      // BPM
      case ']': adjustBpm(5); break;
      case '[': adjustBpm(-5); break;

      // Noise Selection
      case 'k': cycleNoise(1); break;
      case 'j': cycleNoise(-1); break;

      // Noise Volume
      case 'h': adjustNoiseVol(-0.05); break;
      case 'l': adjustNoiseVol(0.05); break;

      // Beat Selection
      case 'i': cycleBeat(1); break;
      case 'u': cycleBeat(-1); break;

      // Beat Volume
      case 'y': adjustBeatVol(-0.05); break;
      case 'o': adjustBeatVol(0.05); break;

      case 'T': 
        cycleTimer(); 
        break;
      
      case '?':
          setShowHelp(prev => !prev);
          break;
    }
  }, [showControls, togglePlay, adjustBpm, cycleNoise, adjustNoiseVol, cycleBeat, adjustBeatVol, cycleTimer, toggleZen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);


  // Format timer
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center transition-colors duration-1000 ${$isPlaying ? 'bg-black text-slate-300' : 'bg-zinc-900 text-slate-400'}`}>
      
      {/* Zen Breathing Visual */}
      {$isPlaying && (
        <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
        >
            <div className={`w-64 h-64 rounded-full bg-gradient-to-tr from-slate-800 to-transparent blur-3xl opacity-20 animate-breathe`} 
                 style={{ animationDuration: `${60/$bpm * 4}s` }}
            />
        </div>
      )}

      {/* Main Status / Prompt - Now Clickable */}
      {!$isPlaying && (
        <div 
            onClick={() => togglePlay()}
            className="z-10 text-center space-y-4 animate-fade-in cursor-pointer p-12 rounded-full hover:bg-white/5 transition-colors"
        >
           <h1 className="text-4xl font-light tracking-[0.2em] text-white">FOCUS</h1>
           <p className="text-sm tracking-widest text-zinc-500">TAP TO START</p>
           <button 
                onClick={(e) => { e.stopPropagation(); setShowHelp(true); }} 
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
           >
             ? for guide
           </button>
        </div>
      )}

      {/* Timer Display - Clickable */}
      {$timer !== null && (
         <button 
            onClick={cycleTimer}
            className="absolute top-8 font-mono text-sm tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors z-50"
         >
            {formatTime($timer)}
         </button>
      )}

      {/* Zen Mode Restore Trigger (Invisible overlay at bottom when controls hidden) */}
      {!showControls && $isPlaying && (
          <div 
            className="absolute inset-x-0 bottom-0 h-24 z-40 cursor-pointer flex items-end justify-center pb-4 opacity-0 hover:opacity-100 transition-opacity"
            onClick={toggleZen}
          >
              <span className="text-xs tracking-widest text-zinc-600 uppercase">Show Controls</span>
          </div>
      )}

      {/* Controls HUD */}
      {showControls && (
        <div className={`absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-5xl px-8 transition-opacity duration-500 ${$isPlaying ? 'opacity-100' : 'opacity-100'}`}>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 text-center select-none">
             
             {/* BPM */}
             <div className="space-y-2 group">
                <div 
                    onClick={() => adjustBpm(5)}
                    className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-zinc-500 cursor-pointer hover:text-zinc-300"
                >
                    <Activity size={12} /> BPM
                </div>
                <div className="text-xl font-light text-zinc-300">{$bpm}</div>
                <div className="flex justify-center gap-4 text-zinc-600">
                    <button onClick={() => adjustBpm(-5)} className="hover:text-white p-2">[-]</button>
                    <button onClick={() => adjustBpm(5)} className="hover:text-white p-2">[+]</button>
                </div>
             </div>

             {/* Noise Color */}
             <div className="space-y-2">
                <div 
                    onClick={() => cycleNoise(1)}
                    className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-zinc-500 cursor-pointer hover:text-zinc-300"
                >
                    <Zap size={12} /> Noise
                </div>
                <div 
                    onClick={() => cycleNoise(1)}
                    className="text-xl font-light text-zinc-300 capitalize cursor-pointer hover:text-white"
                >
                    {$noiseColor}
                </div>
                <div className="flex justify-center gap-4 text-zinc-600">
                    <button onClick={() => cycleNoise(-1)} className="hover:text-white p-2">&lt;</button>
                    <button onClick={() => cycleNoise(1)} className="hover:text-white p-2">&gt;</button>
                </div>
             </div>

             {/* Noise Vol */}
             <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
                    <Volume2 size={12} /> N. Vol
                </div>
                <div className="text-xl font-light text-zinc-300">{Math.round($noiseVolume * 100)}%</div>
                <div className="flex justify-center gap-4 text-zinc-600">
                    <button onClick={() => adjustNoiseVol(-0.05)} className="hover:text-white p-2">[-]</button>
                    <button onClick={() => adjustNoiseVol(0.05)} className="hover:text-white p-2">[+]</button>
                </div>
             </div>

             {/* Beat Type */}
             <div className="space-y-2">
                <div 
                    onClick={() => cycleBeat(1)}
                    className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-zinc-500 cursor-pointer hover:text-zinc-300"
                >
                    <Music size={12} /> Beat
                </div>
                <div 
                    onClick={() => cycleBeat(1)}
                    className="text-xl font-light text-zinc-300 capitalize cursor-pointer hover:text-white"
                >
                    {$beatType}
                </div>
                <div className="flex justify-center gap-4 text-zinc-600">
                    <button onClick={() => cycleBeat(-1)} className="hover:text-white p-2">&lt;</button>
                    <button onClick={() => cycleBeat(1)} className="hover:text-white p-2">&gt;</button>
                </div>
             </div>

             {/* Beat Vol */}
             <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
                    <Volume2 size={12} /> B. Vol
                </div>
                <div className="text-xl font-light text-zinc-300">{Math.round($beatVolume * 100)}%</div>
                <div className="flex justify-center gap-4 text-zinc-600">
                    <button onClick={() => adjustBeatVol(-0.05)} className="hover:text-white p-2">[-]</button>
                    <button onClick={() => adjustBeatVol(0.05)} className="hover:text-white p-2">[+]</button>
                </div>
             </div>

             {/* Presets */}
             <div className="space-y-2 opacity-50 hover:opacity-100 transition-opacity">
                <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
                    <Save size={12} /> Presets
                </div>
                <div className="text-xl font-light text-zinc-300">1-9</div>
                <div className="text-[10px] text-zinc-600">keys only</div>
             </div>

          </div>
          
          <div className="mt-8 text-center flex justify-center gap-8">
             <button 
                onClick={cycleTimer}
                className="text-xs tracking-widest text-zinc-600 hover:text-white transition-colors uppercase p-2"
             >
                {$timer ? 'Adjust Timer' : 'Set Timer'}
             </button>
             <button 
                onClick={toggleZen}
                className="text-xs tracking-widest text-zinc-600 hover:text-white transition-colors uppercase p-2"
             >
                Enter Zen Mode
             </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
             <div className="bg-zinc-800 text-zinc-200 px-6 py-3 rounded-full text-sm tracking-widest shadow-2xl animate-pulse border border-zinc-700">
                {showToast}
             </div>
          </div>
      )}

      {/* Help Modal */}
      {showHelp && (
          <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-800 p-8 max-w-lg w-full rounded-sm shadow-2xl">
                  <h2 className="text-xl font-light text-white mb-6 tracking-widest border-b border-zinc-800 pb-4">CONTROLS</h2>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm text-zinc-400">
                      <div>SPACE</div><div className="text-right">Play / Pause</div>
                      <div>J / K</div><div className="text-right">Prev / Next Noise</div>
                      <div>H / L</div><div className="text-right">Noise Vol - / +</div>
                      <div>U / I</div><div className="text-right">Prev / Next Beat</div>
                      <div>Y / O</div><div className="text-right">Beat Vol - / +</div>
                      <div>[ / ]</div><div className="text-right">BPM - / +</div>
                      <div>0 - 9</div><div className="text-right">Load Preset</div>
                      <div>Ctrl + 0-9</div><div className="text-right">Save Preset</div>
                      <div>T</div><div className="text-right">Cycle Timer</div>
                      <div>ESC</div><div className="text-right">Zen Mode</div>
                  </div>
                  <button 
                    onClick={() => setShowHelp(false)}
                    className="w-full mt-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs tracking-widest transition-colors"
                  >
                      CLOSE
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}
