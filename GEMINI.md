# Noises & Beats

## Project Overview

**Noises & Beats** is a high-performance, minimalist web application designed for productivity and focus. It generates "colors" of noise (Brown, Pink, White, etc.) and rhythmic beats (Binaural, Pulse, Kick) in real-time using the Web Audio API.

The project emphasizes a "Zen," distraction-free user experience, featuring a dark monochromatic UI and keyboard-first controls. It is built to be deployed as a static site (e.g., on Cloudflare Pages) and supports full offline usage as a Progressive Web App (PWA).

## Tech Stack

- **Framework:** [Astro](https://astro.build/) (Static Site Generation, Shell)
- **UI Library:** [React](https://react.dev/) (Interactive components, Audio state)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **State Management:** [Nanostores](https://github.com/nanostores/nanostores)
- **PWA:** [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Offline support, Service Worker)
- **Icons:** [Lucide React](https://lucide.dev/) (UI Icons)
- **Audio:** Native Web Audio API (No external assets)
- **Package Manager:** `pnpm`

## Architecture & Design

### Audio Engine
- Located in `src/lib/AudioEngine.ts`.
- Uses a **Lookahead Scheduler** pattern for precise timing.
- Generates audio procedurally (oscillators, noise buffers, filters) to ensure small bundle size and instant loading.
- **Noise Types:** Brown, Pink, White, Green, Blue, Black.
- **Beat Types:** Kick, Pulse, Binaural.

### User Interface
- **Zen Mode:** The interface is designed to fade out or minimize distractions.
- **Keyboard Control:** The app is designed to be controlled primarily via keyboard shortcuts (vim-like navigation for volume/BPM).
- **Interactive Controls:** Styled buttons with Lucide icons for intuitive mouse/touch interaction.
- **Entry Point:** `src/pages/index.astro` hosts the main shell and meta tags.
- **Main Component:** `src/components/ZenPlayer.tsx` handles the interactive UI and mounts the Audio Engine.

### PWA & Offline Support
- **Manifest:** Generated via `vite-plugin-pwa` in `astro.config.mjs` (`manifest.webmanifest`).
- **Service Worker:** Generated via a custom post-build script (`scripts/generate-sw.mjs`) using `workbox-build`.
  - **Reason:** Standard `vite-plugin-pwa` generation runs before Astro generates `index.html` (SSG), causing the HTML to be missing from the precache.
  - **Mechanism:** The `build` script runs `astro build && node scripts/generate-sw.mjs` to ensure the final `dist/index.html` is captured.
- **Caching:** Precaches all `dist/` assets (HTML, CSS, JS, SVG) for full offline functionality.
- **Updates:** Configured with `clientsClaim: true` and `skipWaiting: true` for immediate updates.

## Building and Running

This project uses `pnpm`.

### Development
Start the local development server:
```bash
pnpm run dev
# or
npm run dev
```

### Production Build
Build the project for production (runs Astro build + SW generation):
```bash
pnpm run build
```

### Preview
Preview the production build locally:
```bash
pnpm run preview
```

## Directory Structure

- `src/`
  - `components/`: React UI components (e.g., `ZenPlayer.tsx`).
  - `lib/`: Core logic, specifically `AudioEngine.ts` and `presets.ts`.
  - `pages/`: Astro routes (only `index.astro`).
  - `store.ts`: Nanostores state definitions.
- `docs/`: Project documentation and design plans.
- `public/`: Static assets (favicon, etc.). Note: `manifest.webmanifest` is auto-generated.

## Development Conventions

- **State:** Use Nanostores for sharing state between React components and the Audio Engine if necessary, or localized React state for purely UI concerns.
- **Styling:** Use utility-first Tailwind CSS. Keep custom CSS in `src/styles/global.css` to a minimum.
- **Performance:** Ensure the `AudioContext` is suspended/resumed correctly to respect browser autoplay policies.
- **PWA:** Ensure `vite-plugin-pwa` configuration in `astro.config.mjs` is updated if new asset types are added.
