import { generateSW } from 'workbox-build';

generateSW({
  globDirectory: 'dist/',
  globPatterns: [
    '**/*.{html,json,js,css,svg,png,ico,txt,webmanifest}'
  ],
  swDest: 'dist/sw.js',
  ignoreURLParametersMatching: [
    /^utm_/,
    /^fbclid$/
  ],
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
        expiration: {
          maxEntries: 10,
        },
      },
    }
  ]
}).then(({ count, size }) => {
  console.log(`Generated sw.js, which will precache ${count} files, totaling ${size} bytes.`);
}).catch((err) => {
  console.error(`Unable to generate a new service worker.`, err);
});