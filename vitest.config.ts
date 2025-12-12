import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    reporters: 'default',
    include: [
      'src/components/__tests__/csv.*.test.*',
      'src/components/__tests__/opening-balance.*.test.*',
      'src/components/__tests__/navigation.*.test.*',
      'src/hooks/__tests__/**/*.test.*',
      'src/services/__tests__/*.test.*',
      'src/utils/__tests__/*.test.*',
    ],
    exclude: [
      'src/components/__tests__/*.tsx',
      'src/pages/**',
      'src/services/__tests__/*service.test.*',
      'src/services/__tests__/*services.test.*',
    ],
  },
})
