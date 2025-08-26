import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: true,
    chunkSizeWarningLimit: 1000, // Increase limit to 1000kB
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
})
