import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Recharts + Supabase make up most of the bundle and are needed on first paint.
  build: { chunkSizeWarningLimit: 1200 },
})
