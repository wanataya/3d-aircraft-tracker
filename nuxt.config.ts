import { defineNuxtConfig } from 'nuxt/config'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-22',
  runtimeConfig: {
    // Private keys (only available on server-side)
    // (none currently needed)
    
    // Public keys (exposed to client-side)
    public: {
      appName: process.env.NUXT_PUBLIC_APP_NAME || 'Aircraft Tracker 3D',
      appDescription: process.env.NUXT_PUBLIC_APP_DESCRIPTION || 'A 3D aircraft tracking system',
      tcpHost: process.env.TCP_HOST || 'demo.example.com',
      tcpPort: process.env.TCP_PORT || '30003',
      wsProxyPort: process.env.WS_PROXY_PORT || '8080',
      wsProxyHost: process.env.WS_PROXY_HOST || 'localhost'
    }
  },
  app: {
    head: {
      title: 'Aircraft Tracker 3D',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'A 3D aircraft tracking system using Leaflet' }
      ],
      link: [
        { rel: 'stylesheet', href: 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' }
      ],
      script: [
        { src: 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js' }
      ]
    }
  },
  css: [
    '@/assets/css/leaflet-custom.css',
    '@/assets/css/main.css'
  ],
  build: {
    transpile: ['three', 'leaflet']
  }
})
