import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Plugin to redirect MUI icon imports to our lightweight icons
function muiIconRedirect(): Plugin {
  const VIRTUAL_PREFIX = '\u0000mui-icon:';

  return {
    name: 'mui-icon-redirect',
    enforce: 'pre',
    resolveId(id) {
      // Redirect any @mui/icons-material/[IconName] import to a virtual module
      // that re-exports the matching SimpleIcons component as default.
      if (id.startsWith('@mui/icons-material/')) {
        const iconName = id.split('/').pop();
        if (iconName) {
          return VIRTUAL_PREFIX + iconName;
        }
      }
      // Redirect the root @mui/icons-material barrel to our SimpleIcons module
      if (id === '@mui/icons-material') {
        return path.resolve(__dirname, './src/components/icons/SimpleIcons.tsx');
      }
      return null;
    },
    load(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        const iconName = id.slice(VIRTUAL_PREFIX.length);
        // Map default import to the named export from SimpleIcons and also
        // re-export all named icons for maximum compatibility.
        return `export { ${iconName} as default } from '@/components/icons/SimpleIcons';\n` +
               `export * from '@/components/icons/SimpleIcons';\n`;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [muiIconRedirect(), react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom',
      'react/jsx-runtime',
      'react-dom/client',
      '@tanstack/react-query',
      'react-router-dom',
      '@mui/material',
      '@mui/system'
    ],
    exclude: [
      '@mui/icons-material'
    ],
    // Increase file limit for Windows
    esbuildOptions: {
      // Prevent scanning too many files
      loader: {
        '.js': 'jsx',
      },
    }
  },
  server: {
    host: true,
    port: 3000,
    open: true,
    fs: {
      strict: false
    },
    watch: {
      // Reduce file watching to prevent EMFILE errors
      ignored: ['**/node_modules/**', '**/.git/**']
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'mui-core': ['@mui/material', '@mui/system'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        }
      }
    }
  }
})