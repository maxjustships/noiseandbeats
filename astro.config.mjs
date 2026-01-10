import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import { VitePWA } from 'vite-plugin-pwa';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), tailwind()],
  vite: {
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'og-image.svg'],
        manifest: {
          name: "Noises & Beats",
          short_name: "Noises&Beats",
          description: "Minimalist audio tool for productivity and focus.",
          theme_color: "#000000",
          background_color: "#000000",
          display: "standalone",
          start_url: "/",
          scope: "/",
          icons: [
            {
              src: "/favicon.svg",
              sizes: "any",
              type: "image/svg+xml"
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,txt}'],
          navigateFallback: '/index.html',
          clientsClaim: true,
          skipWaiting: true,
        },
        devOptions: {
          enabled: true
        }
      })
    ]
  }
});
