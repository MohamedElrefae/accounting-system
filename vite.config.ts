import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'

const patchPostgrestWrapperPlugin: PluginOption = {
  name: 'patch-postgrest-wrapper',
  enforce: 'pre',
  transform(code: string, id: string) {
    if (id.includes('@supabase/postgrest-js/dist/esm/wrapper.mjs')) {
      const patched = code.replace(
        "import index from '../cjs/index.js'",
        "import * as index from '../cjs/index.js'",
      )
      return { code: patched, map: null }
    }

    return null
  },
}

// Minimal, clean baseline config
export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [
    react({
      include: ['**/*.jsx', '**/*.tsx'],
    }),
    patchPostgrestWrapperPlugin,
  ]

  if (mode === 'analyze') {
    plugins.push(
      visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      }) as PluginOption,
    )
  }

  return {
    plugins,
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
      'pdfjs-dist',
      'react-router-dom',
      '@supabase/supabase-js'
    ],
    exclude: ['@mui/private-theming'],
    force: false // Changed to false for better caching
  },
  server: {
    host: true, // allow LAN access and avoids "use --host to expose" message
    port: 3000,
    strictPort: true, // force port 3000, fail if taken
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
    // Avoid large sourcemaps in normal production builds to reduce memory footprint
    sourcemap: mode === 'analyze',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      treeshake: { moduleSideEffects: false },
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
  },
  assetsInclude: ['**/*.worker.js'],
}
})
