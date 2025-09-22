import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'

// Minimal, clean baseline config
export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      // Enable React Fast Refresh
      fastRefresh: true,
      // Include .tsx files
      include: "**/*.{jsx,tsx}",
    }),
    // Patch Supabase postgrest wrapper to avoid default import from CJS
    {
      name: 'patch-postgrest-wrapper',
      enforce: 'pre',
      transform(code, id) {
        if (id.includes('@supabase/postgrest-js/dist/esm/wrapper.mjs')) {
          const patched = code.replace("import index from '../cjs/index.js'", "import * as index from '../cjs/index.js'")
          return { code: patched, map: null }
        }
        return null
      }
    },
    mode === 'analyze' && visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ].filter(Boolean),
  define: {
    // Fix for some CommonJS modules
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled', 'zustand', 'use-sync-external-store']
  },
  esbuild: {
    target: 'esnext',
    logLevel: 'warning'
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom',
      'react/jsx-runtime',
      'prop-types',
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/material/styles',
      '@mui/material/utils',
      '@mui/icons-material',
      '@mui/system',
      '@mui/utils',
      'zustand',
      '@tanstack/react-query',
      'pdfjs-dist'
    ],
    exclude: ['@mui/private-theming'],
    force: true
  },
  server: {
    host: true, // allow LAN access and avoids "use --host to expose" message
    port: 3001,
    strictPort: false, // allow fallback if 3001 is taken
    open: true,
    cors: true,
    watch: {
      // OneDrive/Network folders on Windows often need polling to detect changes reliably
      usePolling: true,
      interval: 100,
      ignored: ['**/node_modules/**', '**/.git/**']
    },
    hmr: {
      // Explicit HMR config tends to be more stable on some Windows setups
      protocol: 'ws',
      host: 'localhost',
      // Let Vite choose a free port automatically
      port: undefined
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
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
          pdf: ['pdfjs-dist']
        }
      }
    },
    assetsInclude: ['**/*.worker.js']
  }
}))
