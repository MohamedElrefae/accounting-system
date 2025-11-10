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

const moduleCompatibilityPlugin: PluginOption = {
  name: 'module-compatibility',
  enforce: 'pre',
  transform(code: string, id: string) {
    // Fix hoist-non-react-statics ESM issue
    if (id.includes('hoist-non-react-statics')) {
      if (code.includes('module.exports =')) {
        return {
          code: code.replace('module.exports =', 'export default'),
          map: null
        }
      }
    }
    
    // Fix emotion-react isolated hnrs issue
    if (id.includes('@emotion/react') && id.includes('_isolated-hnrs')) {
      return {
        code: code.replace(
          "import hoistNonReactStatics from 'hoist-non-react-statics'",
          "import * as hoistNonReactStatics from 'hoist-non-react-statics'; const hoistNonReactStaticsDefault = hoistNonReactStatics.default || hoistNonReactStatics;"
        ).replace(
          /hoistNonReactStatics\(/g,
          'hoistNonReactStaticsDefault('
        ),
        map: null
      }
    }
    
    // Fix MUI colorManipulator ESM issue
    if (id.includes('@mui/system/colorManipulator') || id.includes('createPalette')) {
      if (code.includes("import { darken") && code.includes("from '@mui/system/colorManipulator'")) {
        return {
          code: code.replace(
            /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@mui\/system\/colorManipulator['"]/g,
            "import * as colorManipulator from '@mui/system/colorManipulator'; const { $1 } = colorManipulator;"
          ),
          map: null
        }
      }
    }
    
    // Fix react-is ForwardRef ESM issue
    if (id.includes('react-is') || id.includes('getDisplayName')) {
      if (code.includes("import { ForwardRef") && code.includes("from 'react-is'")) {
        return {
          code: code.replace(
            /import\s*{\s*([^}]+)\s*}\s*from\s*['"]react-is['"]/g,
            "import * as ReactIs from 'react-is'; const { $1 } = ReactIs;"
          ),
          map: null
        }
      }
    }
    
    return null
  },
  generateBundle(options, bundle) {
    // Add module compatibility to all chunks that might need it
    Object.keys(bundle).forEach(fileName => {
      const chunk = bundle[fileName]
      if (chunk.type === 'chunk' && chunk.isEntry === false) {
        // Prepend compatibility code to non-entry chunks
        const compatCode = `(function(){if(typeof window!=='undefined'&&!window.module){window.module={exports:{}};window.exports=window.module.exports;window.global=window;}})();`
        chunk.code = compatCode + chunk.code
      }
    })
  }
}





// Minimal, clean baseline config
export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [
    react({
      include: ['**/*.jsx', '**/*.tsx'],
    }),
    patchPostgrestWrapperPlugin,
    moduleCompatibilityPlugin,
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
    'process.env': '{}',
    // Additional CommonJS compatibility
    'process.browser': 'true',
    'process.version': '"v16.0.0"',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'react-is', '@emotion/react', '@emotion/styled', 'zustand', 'use-sync-external-store']
  },
  esbuild: {
    target: 'esnext',
    logLevel: 'warning'
  },
  optimizeDeps: {
    include: [
      // Core React - ensure these are optimized together
      'react', 
      'react-dom',
      'react/jsx-runtime',
      'react-dom/client',
      'prop-types',
      'react-is',
      // State management
      'zustand',
      'use-sync-external-store/shim',
      // Data layer
      '@tanstack/react-query',
      'react-router-dom',
      '@supabase/supabase-js',
      // ESM compatibility fixes
      'hoist-non-react-statics',
      '@emotion/react',
      '@emotion/styled',
      // MUI system modules for compatibility
      '@mui/system',
      '@mui/system/colorManipulator',
      '@mui/material',
      '@mui/material/styles',
      '@mui/private-theming'
    ],
    exclude: [
      '@mui/icons-material'
    ],
    force: true
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
    sourcemap: mode === 'analyze',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      treeshake: { moduleSideEffects: false },
      output: {
        manualChunks: (id) => {
          // Keep React in main bundle to avoid chunking issues
          if (id.includes('react') || id.includes('react-dom')) {
            return undefined; // Keep in main bundle
          }
          // Data layer chunk
          if (id.includes('@tanstack') || id.includes('@supabase')) {
            return 'data-layer';
          }
          // Heavy features chunk
          if (id.includes('jspdf') || id.includes('xlsx') || id.includes('html2canvas') || id.includes('recharts')) {
            return 'heavy-features';
          }
          // PDF worker chunk
          if (id.includes('pdfjs-dist')) {
            return 'pdf-worker';
          }
          // MUI - keep together to avoid conflicts
          if (id.includes('@mui') || id.includes('@emotion')) {
            return 'mui-lib';
          }
          // Keep state management in main bundle
          if (id.includes('zustand') || id.includes('use-sync-external-store')) {
            return undefined; // Keep in main bundle
          }
          // Node modules chunk
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    },
  },
  assetsInclude: ['**/*.worker.js'],
}
})
