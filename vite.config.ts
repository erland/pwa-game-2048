// vite.config.ts
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// If building on GitHub Actions, serve from the repo subpath.
const isCI = process.env.GITHUB_ACTIONS === 'true';
const base = isCI ? '/pwa-game-2048/' : '/';

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      includeAssets: ['icons/apple-touch-icon-180x180.png'],
      manifest: {
        name: '2048',
        short_name: '2048',
        description: 'A 2048 puzzle game as a PWA.',
        start_url: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          // Optionally add maskable icon later:
          // { src: 'icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
      }
    })
  ],
  server: { port: 5173, open: true },
  build: { sourcemap: true }
});
