import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// Minimal, clean baseline config
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'analyze' && visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ].filter(Boolean),
  resolve: {
    alias: {},
    dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled', 'zustand', 'use-sync-external-store']
  },
  esbuild: {
    target: 'esnext',
    logLevel: 'warning'
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  server: {
    host: true, // allow LAN access and avoids "use --host to expose" message
    port: 3000,
    strictPort: true, // fail fast if 3000 is taken instead of switching ports silently
    open: true,
    watch: {
      // OneDrive/Network folders on Windows often need polling to detect changes reliably
      usePolling: true,
      interval: 100
    },
    hmr: {
      // Explicit HMR config tends to be more stable on some Windows setups
      protocol: 'ws',
      host: 'localhost'
    }
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
    open: true
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    commonjsOptions: {
      transformMixedEsModules: true
    }
  }
}))
