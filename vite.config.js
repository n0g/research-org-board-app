import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/api\.todoist\.com\//,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'todoist-api',
            networkTimeoutSeconds: 10,
          },
        }],
      },
      manifest: false,
    }),
  ],
  build: {
    modulePreload: { polyfill: false },
  },
})
