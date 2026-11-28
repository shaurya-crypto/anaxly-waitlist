import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Prevent Vite from walking up to parent e:\AI_tutor\postcss.config.mjs
  css: {
    postcss: {
      plugins: [],
    },
  },
})
