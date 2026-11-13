import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Static hosts serve 404.html for unknown paths. Making it a copy of index.html lets the React app
// boot on any deep link (/login, /sign/…) and show its own 404 page — a safety net if the host has
// no "/* → /index.html" rewrite rule configured.
const spaFallback = () => ({
  name: 'spa-404-fallback',
  apply: 'build',
  writeBundle(opts) {
    const dir = opts.dir || 'dist'
    fs.copyFileSync(path.join(dir, 'index.html'), path.join(dir, '404.html'))
  },
})

// In dev, /api and /embed.js are proxied to the Node backend (e1000_signer_main).
export default defineConfig({
  plugins: [react(), spaFallback()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/embed.js': 'http://localhost:4000',
    },
  },
})
