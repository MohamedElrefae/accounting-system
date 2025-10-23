import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/components/__tests__/csv.*.test.*',
      'src/components/__tests__/opening-balance.*.test.*',
      'src/services/__tests__/*.test.*',
      'src/components/__tests__/navigation.*.test.*',
      'src/utils/__tests__/*.test.*'
    ],
    exclude: [
      'src/components/__tests__/*.tsx',
      'src/pages/**',
'src/services/__tests__/*service.test.*', 'src/services/__tests__/*services.test.*',
    ],
  },
})
