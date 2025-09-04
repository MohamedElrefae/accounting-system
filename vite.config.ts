import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { visualizer } from "rollup-plugin-visualizer"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
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
    alias: {
      // Force single React/MUI instance to prevent multiple context issues
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-dom/client': path.resolve(__dirname, 'node_modules/react-dom/client.js'),
      '@mui/material': path.resolve(__dirname, 'node_modules/@mui/material'),
      '@mui/system': path.resolve(__dirname, 'node_modules/@mui/system'),
      '@mui/base': path.resolve(__dirname, 'node_modules/@mui/base'),
      '@mui/utils': path.resolve(__dirname, 'node_modules/@mui/utils')
    },
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@mui/material', '@mui/system', '@mui/base', '@mui/utils', '@emotion/react', '@emotion/styled']
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: true,
    chunkSizeWarningLimit: 1000, // Increase limit to 1000kB
    commonjsOptions: {
      transformMixedEsModules: true,
      defaultIsModuleExports: true
    },
    rollupOptions: {
      output: {
        // Improved manual chunks for better code splitting
        manualChunks: (id) => {
          // Core React libraries
          if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) {
            return "react-vendor";
          }
          
          // MUI Core (most commonly used)
          if (id.includes("@mui/material") || id.includes("@mui/system") || id.includes("@emotion")) {
            return "mui-core";
          }
          
          // MUI Icons (separate chunk as its large)
          if (id.includes("@mui/icons-material")) {
            return "mui-icons";
          }
          
          // MUI X components (data grid, charts, date pickers)
          if (id.includes("@mui/x-")) {
            return "mui-x";
          }
          
          // Chart libraries
          if (id.includes("recharts") || id.includes("d3-")) {
            return "charts";
          }
          
          // Supabase and auth
          if (id.includes("@supabase") || id.includes("auth")) {
            return "supabase";
          }
          
          // Form libraries
          if (id.includes("react-hook-form") || id.includes("yup") || id.includes("@hookform")) {
            return "forms";
          }
          
          // Utility libraries
          if (id.includes("dayjs") || id.includes("xlsx") || id.includes("jspdf") || id.includes("zustand")) {
            return "utils";
          }
          
          // Lucide icons
          if (id.includes("lucide-react")) {
            return "icons";
          }
          
          // TanStack Query
          if (id.includes("@tanstack")) {
            return "query";
          }
          
          // Heavy admin components
          if (id.includes("/admin/") || id.includes("UserManagement") || id.includes("RoleManagement")) {
            return "admin-components";
          }
          
          // Charts and reporting components
          if (id.includes("/Transactions/") || id.includes("AccountsTree") || id.includes("TrialBalance")) {
            return "business-components";
          }
          
          // Other large vendor libraries
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
        // Optimize chunk file names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split("/").pop()?.replace(".tsx", "").replace(".ts", "")
            : "chunk";
          return `js/${facadeModuleId}-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split(".") || ['unknown'];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  preview: {
    port: 3000,
    open: true,
  },
}))
