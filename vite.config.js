import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In dev, /api and /embed.js are proxied to the Node backend (e1000_signer_main).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/embed.js': 'http://localhost:4000',
    },
  },
})
