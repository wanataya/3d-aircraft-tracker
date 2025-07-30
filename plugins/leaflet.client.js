import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin(() => {
  // Leaflet is now loaded via CDN in nuxt.config.ts
  console.log('Leaflet plugin initialized')
});