import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { isPlaying, bpm, noiseColor, beatType, noiseVolume, beatVolume, timerRemaining, isZen } from '../store';
import { audio } from '../lib/AudioEngine';
import { savePreset, loadPreset } from '../lib/presets';
import type { NoiseColor, BeatType } from '../lib/types';
import { Volume2, Activity, Zap, Music, Save, Settings, X, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS: NoiseColor[] = ['brown', 'red', 'pink', 'white', 'green', 'blue', 'black', 'off'];
const BEATS: BeatType[] = ['pulse', 'kick', 'binaural', 'off'];

export default function ZenPlayer() {
  const $isPlaying = useStore(isPlaying);
  const $bpm = useStore(bpm);
  const $noiseColor = useStore(noiseColor);
  const $beatType = useStore(beatType);
  const $noiseVolume = useStore(noiseVolume);
  const $beatVolume = useStore(beatVolume);
  const $timer = useStore(timerRemaining);

  const [showToast, setShowToast] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true); // HUD visibility
  const [showHelp, setShowHelp] = useState(false);
  const [isSaveMode, setSaveMode] = useState(false);
  const [mobilePage, setMobilePage] = useState(0);

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

  const handlePresetClick = (id: number) => {
    if (isSaveMode) {
      if (savePreset(id)) {
        toast(`Preset ${id} Saved`);
        setSaveMode(false); // toggle off after save
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
  };

  // -- Component Pieces --

  const BpmControl = () => (
     <div className="space-y-4 group flex flex-col items-center">
        <div 
            onClick={() => adjustBpm(5)}
            className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-zinc-500 cursor-pointer hover:text-zinc-300"
        >
            <Activity size={16} /> BPM
        </div>
        <div className="text-3xl font-light text-zinc-300">{$bpm}</div>
        <div className="flex justify-center gap-4 text-zinc-500">
            <button onClick={() => adjustBpm(-5)} className="p-3 rounded-xl border border-zinc-800 hover:border-zinc-600 hover:text-white hover:bg-zinc-800 transition-all"><Minus size={18} /></button>
            <button onClick={() => adjustBpm(5)} className="p-3 rounded-xl border border-zinc-800 hover:border-zinc-600 hover:text-white hover:bg-zinc-800 transition-all"><Plus size={18} /></button>
        </div>
     </div>
  );

  const NoiseColorControl = () => (
     <div className="space-y-4 flex flex-col items-center">
        <div 
            onClick={() => cycleNoise(1)}
            className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-zinc-500 cursor-pointer hover:text-zinc-300"
        >
            <Zap size={16} /> Noise
        </div>
        <div 
            onClick={() => cycleNoise(1)}
            className="text-3xl font-light text-zinc-300 capitalize cursor-pointer hover:text-white"
        >
            {$noiseColor}
        </div>
        <div className="flex justify-center gap-4 text-zinc-500">
            <button onClick={() => cycleNoise(-1)} className="p-3 rounded-xl border border-zinc-800 hover:border-zinc-600 hover:text-white hover:bg-zinc-800 transition-all"><ChevronLeft size={18} /></button>
            <button onClick={() => cycleNoise(1)} className="p-3 rounded-xl border border-zinc-800 hover:border-zinc-600 hover:text-white hover:bg-zinc-800 transition-all"><ChevronRight size={18} /></button>
        </div>
     </div>
  );

  const NoiseVolControl = () => (
     <div className="space-y-4 flex flex-col items-center">
        <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
            <Volume2 size={16} /> N. Vol
        </div>
        <div className="text-3xl font-light text-zinc-300">{Math.round($noiseVolume * 100)}%</div>
        <div className="flex justify-center gap-4 text-zinc-500">
            <button onClick={() => adjustNoiseVol(-0.05)} className="p-3 rounded-xl border border-zinc-800 hover:border-zinc-600 hover:text-white hover:bg-zinc-800 transition-all"><Minus size={18} /></button>
            <button onClick={() => adjustNoiseVol(0.05)} className="p-3 rounded-xl border border-zinc-800 hover:border-zinc-600 hover:text-white hover:bg-zinc-800 transition-all"><Plus size={18} /></button>
        </div>
     </div>
  );

  const BeatTypeControl = () => (
     <div className="space-y-4 flex flex-col items-center">
        <div 
            onClick={() => cycleBeat(1)}
            className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-zinc-500 cursor-pointer hover:text-zinc-300"
        >
            <Music size={16} /> Beat
        </div>
        <div 
            onClick={() => cycleBeat(1)}
            className="text-3xl font-light text-zinc-300 capitalize cursor-pointer hover:text-white"
        >
            {$beatType}
        </div>
        <div className="flex justify-center gap-4 text-zinc-500">
            <button onClick={() => cycleBeat(-1)} className="p-3 rounded-xl border border-zinc-800 hover:border-zinc-600 hover:text-white hover:bg-zinc-800 transition-all"><ChevronLeft size={18} /></button>
            <button onClick={() => cycleBeat(1)} className="p-3 rounded-xl border border-zinc-800 hover:border-zinc-600 hover:text-white hover:bg-zinc-800 transition-all"><ChevronRight size={18} /></button>
        </div>
     </div>
  );

  const BeatVolControl = () => (
     <div className="space-y-4 flex flex-col items-center">
        <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
            <Volume2 size={16} /> B. Vol
        </div>
        <div className="text-3xl font-light text-zinc-300">{Math.round($beatVolume * 100)}%</div>
        <div className="flex justify-center gap-4 text-zinc-500">
            <button onClick={() => adjustBeatVol(-0.05)} className="p-3 rounded-xl border border-zinc-800 hover:border-zinc-600 hover:text-white hover:bg-zinc-800 transition-all"><Minus size={18} /></button>
            <button onClick={() => adjustBeatVol(0.05)} className="p-3 rounded-xl border border-zinc-800 hover:border-zinc-600 hover:text-white hover:bg-zinc-800 transition-all"><Plus size={18} /></button>
        </div>
     </div>
  );

  const PresetsControl = () => (
     <div className="space-y-4 group flex flex-col items-center">
        <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
            <Save size={16} /> Presets
        </div>
        <div className="flex flex-wrap justify-center gap-3 px-2">
            {[1, 2, 3, 4, 5].map(id => (
                <button
                    key={id}
                    onClick={() => handlePresetClick(id)}
                    className={`w-10 h-10 rounded-full border flex items-center justify-center text-lg font-light transition-all
                        ${isSaveMode 
                            ? 'border-red-500 text-red-500 animate-pulse bg-red-500/10' 
                            : 'border-zinc-700 hover:border-zinc-400 hover:text-white text-zinc-500'
                        }
                    `}
                >
                    {id}
                </button>
            ))}
        </div>
        <div className="pt-2">
                <button
                onClick={() => setSaveMode(!isSaveMode)}
                className={`text-[10px] uppercase tracking-widest px-4 py-2 rounded-full border transition-all
                    ${isSaveMode 
                        ? 'bg-red-500 text-white border-red-500' 
                        : 'text-zinc-600 border-zinc-800 hover:border-zinc-600 hover:text-zinc-400'
                    }
                `}
                >
                {isSaveMode ? 'Cancel Save' : 'Save Current'}
                </button>
        </div>
     </div>
  );

  const TimerControl = () => (
    <div className="flex flex-col items-center justify-center h-full">
         <div className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Timer</div>
         <button 
            onClick={cycleTimer}
            className="text-xs tracking-widest text-zinc-500 hover:text-white transition-colors uppercase px-6 py-3 border border-zinc-800 hover:border-zinc-500 rounded-lg hover:bg-zinc-800/50"
        >
            {$timer ? 'Adjust Timer' : 'Set Timer'}
        </button>
    </div>
  );

  const CloseControl = () => (
      <div className="flex items-center justify-center h-full">
         <button 
            onClick={() => setShowControls(false)}
            className="flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-white transition-colors group"
         >
              <div className="p-4 rounded-full border border-zinc-800 group-hover:bg-zinc-800 transition-colors">
                 <X size={24} />
              </div>
              <span className="text-[10px] uppercase tracking-widest">Close</span>
         </button>
      </div>
  );

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center transition-colors duration-1000 ${$isPlaying ? 'bg-black text-slate-300' : 'bg-zinc-900 text-slate-400'}`}>
      
      {/* Zen Breathing Visual (Tap to Pause) */}
      {$isPlaying && (
        <motion.div 
            className="absolute inset-0 flex items-center justify-center overflow-hidden cursor-pointer z-10"
            onClick={() => togglePlay()}
            whileTap={{ scale: 0.95 }}
        >
            <div className={`w-64 h-64 rounded-full bg-gradient-to-tr from-slate-800 to-transparent blur-3xl opacity-20 animate-breathe`} 
                 style={{ animationDuration: `${60/$bpm * 4}s` }}
            />
        </motion.div>
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

      {/* Settings Toggle (Visible when controls hidden) */}
      {!showControls && (
          <button 
            onClick={() => setShowControls(true)}
            className="fixed bottom-12 right-12 z-50 p-6 text-zinc-500 hover:text-white transition-all rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 shadow-2xl group"
            aria-label="Settings"
          >
              <Settings size={32} className="group-hover:rotate-90 transition-transform duration-500" />
          </button>
      )}

      {/* Controls Overlay (Full Screen Glass) */}
      <AnimatePresence>
      {showControls && (
        <div className={`
            fixed inset-0 z-40 bg-black/80 backdrop-blur-3xl flex flex-col items-center justify-center
        `}>
            {/* Desktop Layout (Grid 6) */}
            <div className="hidden md:flex w-full max-w-7xl flex-col items-center justify-center h-full relative p-12">
                 <div className="grid grid-cols-6 gap-8 w-full items-start">
                    <BpmControl />
                    <NoiseColorControl />
                    <NoiseVolControl />
                    <BeatTypeControl />
                    <BeatVolControl />
                    <PresetsControl />
                 </div>
                 
                 <div className="mt-20">
                     <TimerControl />
                 </div>

                 {/* Desktop Close Button (Bottom Right) */}
                 <button 
                    onClick={() => setShowControls(false)}
                    className="absolute bottom-12 right-12 p-6 text-zinc-500 hover:text-white transition-all rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 shadow-2xl"
                 >
                    <X size={32} />
                 </button>
            </div>

            {/* Mobile Layout (Swipeable Pages) */}
            <div className="md:hidden w-full h-full relative flex flex-col justify-center">
                <div className="absolute top-8 left-0 right-0 text-center">
                    <h2 className="text-xs font-bold tracking-widest text-zinc-600 uppercase">
                        Studio {mobilePage + 1}/2
                    </h2>
                </div>

                <div className="flex-1 flex items-center w-full overflow-hidden relative">
                    {/* Navigation Arrows */}
                    {mobilePage > 0 && (
                        <button 
                            onClick={() => setMobilePage(0)}
                            className="absolute left-4 z-50 p-4 text-zinc-600 hover:text-white bg-black/20 rounded-full backdrop-blur-sm"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}
                    {mobilePage < 1 && (
                        <button 
                            onClick={() => setMobilePage(1)}
                            className="absolute right-4 z-50 p-4 text-zinc-600 hover:text-white bg-black/20 rounded-full backdrop-blur-sm"
                        >
                            <ChevronRight size={24} />
                        </button>
                    )}

                    <motion.div 
                        className="w-full px-8"
                        key={mobilePage}
                        initial={{ x: mobilePage === 0 ? -300 : 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: mobilePage === 0 ? 300 : -300, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, { offset }) => {
                            const swipe = offset.x;
                            if (swipe < -50 && mobilePage === 0) setMobilePage(1);
                            if (swipe > 50 && mobilePage === 1) setMobilePage(0);
                        }}
                    >
                        {mobilePage === 0 ? (
                            <div className="grid grid-cols-2 gap-y-12 gap-x-4">
                                <NoiseColorControl />
                                <NoiseVolControl />
                                <BeatTypeControl />
                                <BeatVolControl />
                                <BpmControl />
                                <CloseControl />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-y-12 gap-x-4 items-start">
                                <PresetsControl />
                                <TimerControl />
                                <div></div> {/* Empty Spacer */}
                                <CloseControl />
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
      )}
      </AnimatePresence>

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
                      <div>Ctrl+0-9 / Toggle UI</div><div className="text-right">Save Preset</div>
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
