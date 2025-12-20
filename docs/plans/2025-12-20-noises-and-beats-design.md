# Design: Noises & Beats

## Overview
A high-performance, purely frontend productivity application designed to help users achieve "laser-focus" through programmatically generated noise and rhythmic beats. The application is built for the web, deployable to Cloudflare Pages, and emphasizes a "Zen" aesthetic with keyboard-first controls.

## Architecture
- **Framework:** Astro (for the static shell and SEO performance).
- **Interactive UI:** React components (hydrated with `client:load` for audio state and UI interaction).
- **Styling:** Tailwind CSS (monochromatic, dark theme).
- **Package Manager:** pnpm.
- **Deployment:** Cloudflare Pages.

## Audio Engine (Web Audio API)
The application generates all sounds in real-time without external audio files.
- **Noise Generation:** White noise buffer processed through BiquadFilterNodes to create "colors" (Brown, Pink, White, Green, Blue, Black).
- **Beat Generation:** 
  - **Kick:** Sine wave oscillator with rapid pitch/gain decay.
  - **Pulse:** Slow attack/release oscillator throb.
  - **Binaural:** Stereo-panned oscillators with frequency offsets.
- **Timing:** Lookahead Scheduler pattern using `AudioContext.currentTime` for rock-solid BPM accuracy (30-220 BPM).

## UI/UX & Keyboard Controls
- **Zen Mode:** Minimalist interface that fades out when active. Subtle "breathing" visual synced to the BPM.
- **Keyboard-First:** All interactions are mapped to keys to prevent flow interruption.
  - `Space`: Toggle Play/Pause.
  - `1-6`: Noise Profiles.
  - `B`: Cycle Beat Types.
  - `j/k`: BPM control.
  - `h/l`: Volume control.
  - `T`: Timer entry.
- **Command Palette:** `Shift+K` or similar for a minimal HUD to tweak settings.

## Data Flow
User Input (Key) -> State Update (React/Nanostores) -> Audio Engine Parameter Adjustment -> UI Feedback (Brief Toast).
