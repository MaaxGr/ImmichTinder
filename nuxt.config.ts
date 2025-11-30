// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      // Expose Immich base URL to client for deep-linking
      immichUrl: process.env.IMMICH_URL
    }
  },
  app: {
    head: {
      title: 'Immich Tinder',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap' },
        { rel: 'icon', type: 'image/png', href: '/favicon.png' }
      ]
    }
  }
})
