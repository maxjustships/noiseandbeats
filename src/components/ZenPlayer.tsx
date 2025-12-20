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

  // Keyboard Handlers
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;

    // Handle Number Keys for Presets
    if (e.key >= '0' && e.key <= '9') {
        const id = parseInt(e.key);
        if (e.ctrlKey) {
            e.preventDefault();
            if (savePreset(id)) {
                toast(`Saved Preset ${id}`);
            } else {
                toast("Error Saving");
            }
        } else {
            if (loadPreset(id)) {
                toast(`Loaded Preset ${id}`);
            } else {
                toast(`Preset ${id} Empty`);
            }
        }
        return;
    }

    switch (e.key) {
      case ' ':
        e.preventDefault();
        const newState = !isPlaying.get();
        isPlaying.set(newState);
        audio.togglePlay(newState);
        toast(newState ? "Focus" : "Paused");
        break;
      
      case 'Escape':
        setShowHelp(false);
        if (showControls) {
          isZen.set(true);
          setShowControls(false);
          toast("Zen Mode");
        } else {
          isZen.set(false);
          setShowControls(true);
          toast("Controls Visible");
        }
        break;

      // BPM
      case ']':
         const newBpm = Math.min(220, bpm.get() + 5);
         bpm.set(newBpm);
         toast(`BPM: ${newBpm}`);
         break;
      case '[':
         const newBpmDown = Math.max(30, bpm.get() - 5);
         bpm.set(newBpmDown);
         toast(`BPM: ${newBpmDown}`);
         break;

      // Noise Selection
      case 'k': // Next Noise
         const currentNoiseIdx = COLORS.indexOf(noiseColor.get());
         const nextNoise = COLORS[(currentNoiseIdx + 1) % COLORS.length];
         noiseColor.set(nextNoise);
         toast(`Noise: ${nextNoise}`);
         break;
      case 'j': // Prev Noise
         const cIdx = COLORS.indexOf(noiseColor.get());
         const prevNoise = COLORS[(cIdx - 1 + COLORS.length) % COLORS.length];
         noiseColor.set(prevNoise);
         toast(`Noise: ${prevNoise}`);
         break;

      // Noise Volume
      case 'h': // Vol Down
         const nvDown = Math.max(0, parseFloat((noiseVolume.get() - 0.05).toFixed(2)));
         noiseVolume.set(nvDown);
         toast(`Noise Vol: ${Math.round(nvDown * 100)}%`);
         break;
      case 'l': // Vol Up
         const nvUp = Math.min(1, parseFloat((noiseVolume.get() + 0.05).toFixed(2)));
         noiseVolume.set(nvUp);
         toast(`Noise Vol: ${Math.round(nvUp * 100)}%`);
         break;

      // Beat Selection
      case 'i': // Next Beat
         const bIdx = BEATS.indexOf(beatType.get());
         const nextBeat = BEATS[(bIdx + 1) % BEATS.length];
         beatType.set(nextBeat);
         toast(`Beat: ${nextBeat}`);
         break;
      case 'u': // Prev Beat
         const cbIdx = BEATS.indexOf(beatType.get());
         const prevBeat = BEATS[(cbIdx - 1 + BEATS.length) % BEATS.length];
         beatType.set(prevBeat);
         toast(`Beat: ${prevBeat}`);
         break;

      // Beat Volume
      case 'y': // Vol Down
         const bvDown = Math.max(0, parseFloat((beatVolume.get() - 0.05).toFixed(2)));
         beatVolume.set(bvDown);
         toast(`Beat Vol: ${Math.round(bvDown * 100)}%`);
         break;
      case 'o': // Vol Up
         const bvUp = Math.min(1, parseFloat((beatVolume.get() + 0.05).toFixed(2)));
         beatVolume.set(bvUp);
         toast(`Beat Vol: ${Math.round(bvUp * 100)}%`);
         break;

      case 'T': // Cycle Timer
          const currentT = timerRemaining.get();
          let nextT: number | null = null;
          let msg = "Timer Off";

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
          break;
      
      case '?':
          setShowHelp(prev => !prev);
          break;
    }
  }, [showControls]);

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

      {/* Main Status / Prompt */}
      {!$isPlaying && (
        <div className="z-10 text-center space-y-4 animate-fade-in">
           <h1 className="text-4xl font-light tracking-[0.2em] text-white">FOCUS</h1>
           <p className="text-sm tracking-widest text-zinc-500">PRESS SPACE</p>
           <button onClick={() => setShowHelp(true)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
             ? for controls
           </button>
        </div>
      )}

      {/* Timer Display */}
      {$timer !== null && (
         <div className="absolute top-8 font-mono text-sm tracking-widest text-zinc-500">
            {formatTime($timer)}
         </div>
      )}

      {/* Controls HUD */}
      {showControls && (
        <div className={`absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-5xl px-8 transition-opacity duration-500 ${$isPlaying ? 'opacity-100' : 'opacity-100'}`}>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 text-center">
             
             {/* BPM */}
             <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
                    <Activity size={12} /> BPM
                </div>
                <div className="text-xl font-light text-zinc-300">{$bpm}</div>
                <div className="text-[10px] text-zinc-600">[ / ]</div>
             </div>

             {/* Noise Color */}
             <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
                    <Zap size={12} /> Noise
                </div>
                <div className="text-xl font-light text-zinc-300 capitalize">{$noiseColor}</div>
                <div className="text-[10px] text-zinc-600">J / K</div>
             </div>

             {/* Noise Vol */}
             <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
                    <Volume2 size={12} /> N. Vol
                </div>
                <div className="text-xl font-light text-zinc-300">{Math.round($noiseVolume * 100)}%</div>
                <div className="text-[10px] text-zinc-600">H / L</div>
             </div>

             {/* Beat Type */}
             <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
                    <Music size={12} /> Beat
                </div>
                <div className="text-xl font-light text-zinc-300 capitalize">{$beatType}</div>
                <div className="text-[10px] text-zinc-600">U / I</div>
             </div>

             {/* Beat Vol */}
             <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
                    <Volume2 size={12} /> B. Vol
                </div>
                <div className="text-xl font-light text-zinc-300">{Math.round($beatVolume * 100)}%</div>
                <div className="text-[10px] text-zinc-600">Y / O</div>
             </div>

             {/* Presets */}
             <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
                    <Save size={12} /> Presets
                </div>
                <div className="text-xl font-light text-zinc-300">1-9</div>
                <div className="text-[10px] text-zinc-600">CTRL+N Save</div>
             </div>

          </div>
          
          <div className="mt-8 text-center">
             <button 
                onClick={() => {
                    setShowControls(false);
                    isZen.set(true);
                }}
                className="text-xs tracking-widest text-zinc-600 hover:text-white transition-colors uppercase"
             >
                Enter Zen Mode (Esc)
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
