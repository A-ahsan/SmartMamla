import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Serves the SSLCommerz payment API (server/app.js) at /api on the same address as the site,
// so `npm run dev` is all you need — also from phones on Wi‑Fi.
const paymentApi = () => ({
  name: 'smartmamla-payment-api',
  async configureServer(server) {
    const { default: app } = await import(pathToFileURL(path.resolve('server/app.js')).href)
    server.middlewares.use(app)
  },
  async configurePreviewServer(server) {
    const { default: app } = await import(pathToFileURL(path.resolve('server/app.js')).href)
    server.middlewares.use(app)
  },
})

// `npm run dev`        → http://localhost:5173 (camera works on localhost)
// `npm run dev:phone`  → https://<your-LAN-IP>:5173 so phones on the same Wi‑Fi can use the QR camera
//                        (accept the self-signed certificate warning once on the phone)
export default defineConfig(async ({ mode }) => ({
  plugins: [react(), paymentApi(), ...(mode === 'phone' ? [(await import('@vitejs/plugin-basic-ssl')).default()] : [])],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
}))
