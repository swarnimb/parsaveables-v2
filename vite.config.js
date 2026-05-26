import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const isDemoBuild = process.env.VITE_DEMO_MODE === 'true'

// https://vitejs.dev/config/
export default defineConfig({
  base: isDemoBuild ? '/parsaveables-v2/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // In demo builds, replace the Supabase env vars with empty strings BEFORE
  // Vite injects import.meta.env. Without this, dynamic indexing like
  // import.meta.env[key] causes Vite to embed the entire env (incl. anon key)
  // into the bundle. Demo bundles must contain zero prod credentials.
  define: isDemoBuild
    ? {
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(''),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(''),
      }
    : {},
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Supabase
          'supabase': ['@supabase/supabase-js'],
          // UI libraries
          'ui-vendor': ['framer-motion', 'lucide-react', 'zustand'],
        },
      },
    },
    chunkSizeWarningLimit: 600, // Increase limit slightly to reduce warnings
  },
})
