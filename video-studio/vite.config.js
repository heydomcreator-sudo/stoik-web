import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev server proxy: přesměruje /api/* na lokální Vercel funkce (vercel dev).
// V produkci tohle řeší Vercel sám, proxy se neuplatní.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
