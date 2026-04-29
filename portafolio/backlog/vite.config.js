import { defineConfig } from 'vite'

export default defineConfig({
  base: '/portafolio/backlog/',
  build: {
    assetsDir: 'assets'
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js']
  }
})
