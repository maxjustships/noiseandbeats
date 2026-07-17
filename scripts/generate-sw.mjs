import { generateSW } from 'workbox-build';

const result = await generateSW({
  globDirectory: 'dist/',
  globPatterns: ['**/*.{html,json,js,css,svg,png,ico,txt,webmanifest}'],
  swDest: 'dist/sw.js',
  inlineWorkboxRuntime: true,
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
  clientsClaim: true,
  skipWaiting: true,
  cleanupOutdatedCaches: true,
  navigateFallback: '/index.html',
  runtimeCaching: [
    {
      urlPattern: ({ request }) => request.destination === 'document',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'documents',
        networkTimeoutSeconds: 4,
        expiration: { maxEntries: 10 },
      },
    },
  ],
});

if (result.count === 0) {
  throw new Error('Service worker generation produced an empty precache.');
}

for (const warning of result.warnings) console.warn(warning);
console.log(`Generated one service worker with ${result.count} precached files (${result.size} bytes).`);
