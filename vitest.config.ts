import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    reporters: 'default',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'src/components/__tests__/csv.*.test.*',
      'src/components/__tests__/opening-balance.*.test.*',
      'src/components/__tests__/navigation.*.test.*',
      'src/components/auth/__tests__/**/*.test.*',
      'src/hooks/__tests__/**/*.test.*',
      'src/services/__tests__/*.test.*',
      'src/utils/__tests__/*.test.*',
      'tests/property/**/*.test.*',
      'tests/integration/**/*.test.*',
    ],
    exclude: [
      'src/components/__tests__/*.tsx',
      'src/pages/**',
      'src/services/__tests__/*service.test.*',
      'src/services/__tests__/*services.test.*',
    ],
  },
})
