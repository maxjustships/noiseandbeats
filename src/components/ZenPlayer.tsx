import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  beatType,
  beatVolume,
  bpm,
  isPlaying,
  isZen,
  noiseColor,
  noiseVolume,
  timerRemaining,
  type Store,
} from '../store';
import { audio } from '../lib/AudioEngine';
import { loadPreset, savePreset } from '../lib/presets';
import { nextTimerDuration, tickTimer } from '../lib/timer';
import type { BeatType, NoiseColor } from '../lib/types';

const COLORS: NoiseColor[] = ['brown', 'red', 'pink', 'white', 'green', 'blue', 'black', 'off'];
const BEATS: BeatType[] = ['pulse', 'kick', 'binaural', 'off'];
const REPOSITORY_URL = 'https://github.com/maxjustships/noiseandbeats';

function useStore<T>(store: Store<T>) {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element
    && Boolean(target.closest('button, a, input, select, textarea, [contenteditable="true"], [role="dialog"]'));
}

export default function ZenPlayer() {
  const $isPlaying = useStore(isPlaying);
  const $bpm = useStore(bpm);
  const $noiseColor = useStore(noiseColor);
  const $beatType = useStore(beatType);
  const $noiseVolume = useStore(noiseVolume);
  const $beatVolume = useStore(beatVolume);
  const $timer = useStore(timerRemaining);

  const [showToast, setShowToast] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [isSaveMode, setSaveMode] = useState(false);
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [presetStatus, setPresetStatus] = useState('No preset loaded');
  const toastTimer = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogCloseRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const toast = useCallback((message: string) => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    setShowToast(message);
    toastTimer.current = window.setTimeout(() => {
      setShowToast(null);
      toastTimer.current = null;
    }, 2200);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (showHelp) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (!dialog.open) dialog.showModal();
      window.requestAnimationFrame(() => dialogCloseRef.current?.focus());
      return;
    }

    if (dialog.open) dialog.close();
    const returnFocus = returnFocusRef.current;
    if (returnFocus) window.requestAnimationFrame(() => returnFocus.focus());
  }, [showHelp]);

  useEffect(() => {
    if (!$isPlaying || $timer === null) return;

    const interval = window.setInterval(() => {
      const next = tickTimer(timerRemaining.get(), isPlaying.get());
      timerRemaining.set(next);

      if (next === 0) {
        isPlaying.set(false);
        timerRemaining.set(null);
        void audio.togglePlay(false);
        toast('Session complete');
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [$isPlaying, $timer === null, toast]);

  const markCustom = useCallback(() => {
    setActivePreset(null);
    setPresetStatus('Custom settings');
  }, []);

  const togglePlay = useCallback(async (forceState?: boolean) => {
    const next = forceState ?? !isPlaying.get();
    isPlaying.set(next);

    try {
      await audio.togglePlay(next);
      toast(next ? 'Playing' : 'Paused');
    } catch (error) {
      console.error('Unable to change audio state', error);
      isPlaying.set(false);
      toast('Audio unavailable');
    }
  }, [toast]);

  const adjustBpm = useCallback((delta: number) => {
    const next = Math.max(30, Math.min(220, bpm.get() + delta));
    bpm.set(next);
    markCustom();
    toast(`Tempo ${next} BPM`);
  }, [markCustom, toast]);

  const cycleNoise = useCallback((direction: 1 | -1) => {
    const index = COLORS.indexOf(noiseColor.get());
    const next = COLORS[(index + direction + COLORS.length) % COLORS.length];
    noiseColor.set(next);
    markCustom();
    toast(`Noise ${next}`);
  }, [markCustom, toast]);

  const adjustNoiseVolume = useCallback((delta: number) => {
    const next = Math.max(0, Math.min(1, Number((noiseVolume.get() + delta).toFixed(2))));
    noiseVolume.set(next);
    markCustom();
    toast(`Noise volume ${Math.round(next * 100)}%`);
  }, [markCustom, toast]);

  const cycleBeat = useCallback((direction: 1 | -1) => {
    const index = BEATS.indexOf(beatType.get());
    const next = BEATS[(index + direction + BEATS.length) % BEATS.length];
    beatType.set(next);
    markCustom();
    toast(`Beat ${next}`);
  }, [markCustom, toast]);

  const adjustBeatVolume = useCallback((delta: number) => {
    const next = Math.max(0, Math.min(1, Number((beatVolume.get() + delta).toFixed(2))));
    beatVolume.set(next);
    markCustom();
    toast(`Beat volume ${Math.round(next * 100)}%`);
  }, [markCustom, toast]);

  const cycleTimer = useCallback(() => {
    const next = nextTimerDuration(timerRemaining.get());
    timerRemaining.set(next);
    toast(next === null ? 'Timer off' : `Timer ${Math.round(next / 60)} minutes`);
  }, [toast]);

  const setControlsVisible = useCallback((visible: boolean) => {
    isZen.set(!visible);
    setShowControls(visible);
    toast(visible ? 'Controls visible' : 'Controls hidden');
  }, [toast]);

  const handlePreset = useCallback((id: number) => {
    if (isSaveMode) {
      if (savePreset(id)) {
        setActivePreset(id);
        setPresetStatus(`Preset ${id} saved and active`);
        setSaveMode(false);
        toast(`Preset ${id} saved`);
      } else {
        setPresetStatus('Preset save failed');
        toast('Save failed');
      }
      return;
    }

    if (loadPreset(id)) {
      setActivePreset(id);
      setPresetStatus(`Preset ${id} loaded`);
      toast(`Preset ${id} loaded`);
    } else {
      setActivePreset(null);
      setPresetStatus(`Preset ${id} is empty`);
      toast(`Preset ${id} empty`);
    }
  }, [isSaveMode, toast]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (showHelp) {
      if (event.key === 'Escape' || event.key === '?') {
        event.preventDefault();
        setShowHelp(false);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setControlsVisible(!showControls);
      return;
    }

    if (isInteractiveTarget(event.target) || event.metaKey || event.altKey) return;

    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      const id = Number(event.key);
      if (event.ctrlKey) {
        if (savePreset(id)) {
          setActivePreset(id);
          setPresetStatus(`Preset ${id} saved and active`);
          toast(`Preset ${id} saved`);
        } else {
          setPresetStatus('Preset save failed');
          toast('Save failed');
        }
      } else if (loadPreset(id)) {
        setActivePreset(id);
        setPresetStatus(`Preset ${id} loaded`);
        toast(`Preset ${id} loaded`);
      } else {
        setActivePreset(null);
        setPresetStatus(`Preset ${id} is empty`);
        toast(`Preset ${id} empty`);
      }
      return;
    }

    const key = event.key.toLowerCase();
    const actions: Record<string, () => void> = {
      ' ': () => { void togglePlay(); },
      ']': () => adjustBpm(5),
      '[': () => adjustBpm(-5),
      k: () => cycleNoise(1),
      j: () => cycleNoise(-1),
      h: () => adjustNoiseVolume(-0.05),
      l: () => adjustNoiseVolume(0.05),
      i: () => cycleBeat(1),
      u: () => cycleBeat(-1),
      y: () => adjustBeatVolume(-0.05),
      o: () => adjustBeatVolume(0.05),
      t: cycleTimer,
      '?': () => setShowHelp(true),
    };

    const action = actions[key];
    if (action) {
      event.preventDefault();
      action();
    }
  }, [
    adjustBeatVolume,
    adjustBpm,
    adjustNoiseVolume,
    cycleBeat,
    cycleNoise,
    cycleTimer,
    setControlsVisible,
    showControls,
    showHelp,
    toast,
    togglePlay,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const controlButton = 'control-button';
  const timerLabel = $timer === null ? 'Timer off' : `${formatTime($timer)} remaining`;

  const BpmControl = () => (
    <section className="control-group" aria-labelledby="bpm-label">
      <div id="bpm-label" className="control-label">BPM</div>
      <output className="control-value" aria-live="polite">{$bpm}</output>
      <div className="control-actions">
        <button type="button" onClick={() => adjustBpm(-5)} className={controlButton} aria-label="Decrease tempo by 5 BPM"><span aria-hidden="true">−</span></button>
        <button type="button" onClick={() => adjustBpm(5)} className={controlButton} aria-label="Increase tempo by 5 BPM"><span aria-hidden="true">+</span></button>
      </div>
    </section>
  );

  const NoiseControl = () => (
    <section className="control-group" aria-labelledby="noise-label">
      <div id="noise-label" className="control-label">Noise</div>
      <button type="button" onClick={() => cycleNoise(1)} className="control-value capitalize" aria-label={`Noise ${$noiseColor}; choose next noise`}>{$noiseColor}</button>
      <div className="control-actions">
        <button type="button" onClick={() => cycleNoise(-1)} className={controlButton} aria-label="Previous noise"><span aria-hidden="true">‹</span></button>
        <button type="button" onClick={() => cycleNoise(1)} className={controlButton} aria-label="Next noise"><span aria-hidden="true">›</span></button>
      </div>
    </section>
  );

  const NoiseVolumeControl = () => (
    <section className="control-group" aria-labelledby="noise-volume-label">
      <div id="noise-volume-label" className="control-label">Noise vol</div>
      <output className="control-value" aria-live="polite">{Math.round($noiseVolume * 100)}%</output>
      <div className="control-actions">
        <button type="button" onClick={() => adjustNoiseVolume(-0.05)} className={controlButton} aria-label="Decrease noise volume"><span aria-hidden="true">−</span></button>
        <button type="button" onClick={() => adjustNoiseVolume(0.05)} className={controlButton} aria-label="Increase noise volume"><span aria-hidden="true">+</span></button>
      </div>
    </section>
  );

  const BeatControl = () => (
    <section className="control-group" aria-labelledby="beat-label">
      <div id="beat-label" className="control-label">Beat</div>
      <button type="button" onClick={() => cycleBeat(1)} className="control-value capitalize" aria-label={`Beat ${$beatType}; choose next beat`}>{$beatType}</button>
      <div className="control-actions">
        <button type="button" onClick={() => cycleBeat(-1)} className={controlButton} aria-label="Previous beat"><span aria-hidden="true">‹</span></button>
        <button type="button" onClick={() => cycleBeat(1)} className={controlButton} aria-label="Next beat"><span aria-hidden="true">›</span></button>
      </div>
    </section>
  );

  const BeatVolumeControl = () => (
    <section className="control-group" aria-labelledby="beat-volume-label">
      <div id="beat-volume-label" className="control-label">Beat vol</div>
      <output className="control-value" aria-live="polite">{Math.round($beatVolume * 100)}%</output>
      <div className="control-actions">
        <button type="button" onClick={() => adjustBeatVolume(-0.05)} className={controlButton} aria-label="Decrease beat volume"><span aria-hidden="true">−</span></button>
        <button type="button" onClick={() => adjustBeatVolume(0.05)} className={controlButton} aria-label="Increase beat volume"><span aria-hidden="true">+</span></button>
      </div>
    </section>
  );

  const PresetsControl = () => (
    <section className="control-group" aria-labelledby="presets-label">
      <div id="presets-label" className="control-label">Presets</div>
      <div className="preset-slots" aria-label="Preset slots">
        {[1, 2, 3, 4, 5].map((id) => (
          <button
            type="button"
            key={id}
            onClick={() => handlePreset(id)}
            className={`preset-button ${isSaveMode ? 'preset-button-save' : ''} ${activePreset === id ? 'preset-button-active' : ''}`}
            aria-label={`${isSaveMode ? 'Save to' : 'Load'} preset ${id}${activePreset === id ? ', active' : ''}`}
            aria-pressed={activePreset === id}
          >
            {id}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setSaveMode((current) => !current)}
        className={`save-mode-button ${isSaveMode ? 'save-mode-button-active' : ''}`}
        aria-pressed={isSaveMode}
      >
        {isSaveMode ? 'Cancel save' : 'Save current'}
      </button>
    </section>
  );

  return (
    <main className={`instrument ${$isPlaying ? 'instrument-playing' : 'instrument-paused'}`}>
      {$isPlaying ? (
        <button type="button" className="play-surface" onClick={() => void togglePlay()} aria-label="Pause audio">
          <span className="breathing-orb" style={{ animationDuration: `${60 / $bpm * 4}s` }} aria-hidden="true" />
          <span className="sr-only">Audio is playing. Activate to pause.</span>
        </button>
      ) : (
        <button type="button" className="start-control" onClick={() => void togglePlay()} aria-label="Start audio">
          <span className="start-title">FOCUS</span>
          <span className="start-state">PAUSED · START</span>
        </button>
      )}

      {$timer !== null && (
        <button type="button" onClick={cycleTimer} className="timer-readout" aria-label={`${timerLabel}; change timer`}>
          {formatTime($timer)}
        </button>
      )}

      {!showControls && (
        <button type="button" onClick={() => setControlsVisible(true)} className="settings-toggle" aria-label="Show controls">
          <span aria-hidden="true">≡</span>
        </button>
      )}

      {showControls && (
        <section className="controls-overlay" aria-label="Audio controls">
          <div className="controls-shell">
            <div className="controls-topline">
              <button type="button" onClick={() => setShowHelp(true)} className="quiet-button" aria-haspopup="dialog">Guide <span aria-hidden="true">?</span></button>
              <button type="button" onClick={() => setControlsVisible(false)} className="quiet-icon-button" aria-label="Hide controls"><span aria-hidden="true">×</span></button>
            </div>

            <div className="controls-grid">
              {BpmControl()}
              {NoiseControl()}
              {NoiseVolumeControl()}
              {BeatControl()}
              {BeatVolumeControl()}
              {PresetsControl()}
            </div>

            <div className="session-row">
              <button type="button" onClick={cycleTimer} className="timer-control" aria-label={`${timerLabel}; cycle timer duration`}>
                <span className="control-label">Timer</span>
                <span>{timerLabel}</span>
              </button>
              <div className="state-readout" aria-label="Current session state">
                <span className={`state-dot ${$isPlaying ? 'state-dot-playing' : ''}`} aria-hidden="true" />
                <span>{$isPlaying ? 'Playing' : 'Paused'}</span>
                <span aria-hidden="true">·</span>
                <span>{presetStatus}</span>
              </div>
            </div>

            <footer className="instrument-footer">
              <span>Noise &amp; Beats</span>
              <span aria-hidden="true">·</span>
              <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">GitHub</a>
              <span aria-hidden="true">·</span>
              <a href={`${REPOSITORY_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer">MIT</a>
              <span aria-hidden="true">·</span>
              <span>presets stay local</span>
            </footer>
          </div>
        </section>
      )}

      <div className="toast-region" role="status" aria-live="polite" aria-atomic="true">
        {showToast && <span className="toast">{showToast}</span>}
      </div>

      <dialog
        ref={dialogRef}
        className="guide-dialog"
        aria-labelledby="guide-title"
        onCancel={(event) => {
          event.preventDefault();
          setShowHelp(false);
        }}
        onClose={() => setShowHelp(false)}
      >
        <div className="guide-heading">
          <h2 id="guide-title">Noise &amp; Beats guide</h2>
          <button ref={dialogCloseRef} type="button" onClick={() => setShowHelp(false)} className="quiet-icon-button" aria-label="Close guide"><span aria-hidden="true">×</span></button>
        </div>

        <p className="guide-copy">Generated in your browser for focused work or a steady background. Noise colors are filtered white-noise approximations, not calibrated acoustic spectra. Keep the volume comfortable; binaural mode is best heard with stereo headphones.</p>

        <dl className="shortcut-list">
          <div><dt>Space</dt><dd>Play / pause</dd></div>
          <div><dt>J / K</dt><dd>Previous / next noise</dd></div>
          <div><dt>H / L</dt><dd>Noise volume − / +</dd></div>
          <div><dt>U / I</dt><dd>Previous / next beat</dd></div>
          <div><dt>Y / O</dt><dd>Beat volume − / +</dd></div>
          <div><dt>[ / ]</dt><dd>Tempo − / +</dd></div>
          <div><dt>0–9</dt><dd>Load preset</dd></div>
          <div><dt>Ctrl + 0–9</dt><dd>Save preset</dd></div>
          <div><dt>T</dt><dd>Cycle timer</dd></div>
          <div><dt>Esc</dt><dd>Show / hide controls</dd></div>
          <div><dt>?</dt><dd>Open / close guide</dd></div>
        </dl>

        <div className="guide-note">
          <p>No account, analytics, telemetry, or cloud sync. Presets use this browser's local storage and can disappear when site data is cleared.</p>
          <p>Open source under the <a href={`${REPOSITORY_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer">MIT License</a>. Source and issues are on <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">GitHub</a>.</p>
        </div>
      </dialog>
    </main>
  );
}
