# Noise & Beats

A quiet, single-screen browser instrument for combining filtered noise with simple rhythmic pulses. It is for people who want a steady background for focused work, reading, or study without accounts, playlists, analytics, or an attention-seeking interface.

**Live demo:** [noiseandbeats.pages.dev](https://noiseandbeats.pages.dev/)

## What it does

- Generates audio locally with the Web Audio API; there are no streamed tracks or required audio downloads.
- Mixes adjustable noise and beat layers at 30–220 BPM.
- Offers pulse, kick, binaural, and off beat modes.
- Provides brown, red, pink, white, green, blue, black, and off noise choices.
- Includes 15, 25, 45, and 60 minute timers.
- Saves numbered presets only in the current browser's local storage.
- Works with pointer, touch, and keyboard controls and can be installed as an offline-capable PWA.

The colored-noise modes are intentionally lightweight approximations: one generated white-noise buffer is shaped with Web Audio biquad filters. They are useful tonal choices, but they are not calibrated implementations of formal spectral-density curves.

## Audio behavior

Audio starts only after a user action, as required by browser autoplay policies. A short look-ahead scheduler places beat envelopes on the `AudioContext` timeline so BPM timing does not depend on React rendering. Noise runs as a looping generated buffer through a color filter and independent gain.

The binaural mode starts two sine oscillators together, pans them hard left and right, and offsets their frequencies by 10 Hz for each half-second pulse. Stereo headphones are needed to perceive the intended channel difference. All layers meet at a reduced master gain and a conservative dynamics compressor/limiter to reduce clipping risk; this is still an audio generator, so begin at a low device volume.

## Privacy

Noise & Beats has no account system, advertising, analytics, telemetry, or cloud sync. Presets are JSON stored under `noiseandbeats_presets` in `localStorage`; an older `noises_beats_presets` value is read once and copied forward for compatibility. Clearing site data, using private browsing, or changing browsers can remove presets.

The installed PWA caches its static application files for offline use. Apart from the browser fetching those files and checking for application updates, the app does not send usage or preset data anywhere.

## Controls

Every function is available through visible buttons. Global shortcuts run only when focus is not on a button, link, form field, or the open guide, which prevents a focused control from activating twice.

| Key | Action |
| --- | --- |
| `Space` | Play or pause |
| `J` / `K` | Previous / next noise |
| `H` / `L` | Decrease / increase noise volume |
| `U` / `I` | Previous / next beat |
| `Y` / `O` | Decrease / increase beat volume |
| `[` / `]` | Decrease / increase BPM by 5 |
| `0`–`9` | Load a preset |
| `Ctrl` + `0`–`9` | Save a preset |
| `T` | Cycle the timer |
| `Esc` | Show or hide controls |
| `?` | Open or close the guide |

## Local development

Requirements:

- Node.js 22 (the repository includes `.nvmrc` and enforces the Node 22 release line)
- pnpm 10.30.2 via Corepack

```sh
nvm use
corepack enable
corepack prepare pnpm@10.30.2 --activate
pnpm install --frozen-lockfile
pnpm dev
```

The development server prints its local URL. Audio must be started with a click, tap, or keyboard action.

## Checks and production build

```sh
pnpm check       # Astro and TypeScript diagnostics
pnpm test        # audio, timer, and local-preset regression tests
pnpm build       # static Astro build, then fail-fast Workbox generation
pnpm audit --prod --audit-level=high
pnpm preview     # serve dist/ locally
```

`pnpm build` writes the static site to `dist/`, then generates exactly one `dist/sw.js` from the completed output. The manifest and icons live in `public/`, so their identity is reviewed and versioned like other public assets.

## Deployment

Production is deployed by Cloudflare Pages' native Git integration when `main` changes. GitHub Actions is verification-only and never deploys.

Cloudflare Pages settings:

- Build command: `pnpm build`
- Build output directory: `dist`
- Node.js: `22`
- Package manager: pnpm 10.30.2 (from `packageManager`)

The versioned `public/_headers` file supplies security and cache headers in the Pages output. The durable public URL and canonical SEO origin are both `https://noiseandbeats.pages.dev/`.

## Limitations

- This is not a medical device or treatment, and it makes no concentration, sleep, or health claims.
- Web Audio behavior, background-tab throttling, and available output volume vary by browser and operating system.
- Binaural mode depends on stereo separation and is not meaningful through a mono speaker.
- Filtered noise colors are tonal approximations, not laboratory-calibrated spectra.
- Presets are local to one browser profile and are not backed up or synchronized.
- The PWA update check requires a connection; the last successfully cached build remains available offline.

## Contributing

Small, focused issues and pull requests are welcome at [github.com/maxjustships/noiseandbeats](https://github.com/maxjustships/noiseandbeats). Please keep changes consistent with the quiet, dark, instrument-like single-screen design and run the checks above before submitting.

## License

[MIT](LICENSE) © 2026 Max.
