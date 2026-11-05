import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// The preview proxy reaches the dev server through a sandbox host name that
// changes whenever the environment is recreated, so the allowlist is extended
// with a wildcard for that domain instead of a fixed host.
const sandboxHostDomain = process.env.BASE44_SANDBOX_HOST_DOMAIN

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'نظام المعرض',
        short_name: 'المعرض',
        description: 'إدارة معرض أثاث — يعمل بالكامل بدون إنترنت',
        lang: 'ar',
        dir: 'rtl',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: './',
        scope: './',
        background_color: '#F5F5F7',
        theme_color: '#1C1C1E',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
      },
    }),
  ],
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    ...(sandboxHostDomain ? { allowedHosts: [`.${sandboxHostDomain}`] } : {}),
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
})
