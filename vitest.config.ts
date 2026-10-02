import { defineConfig } from 'vitest/config'

// Testes das regras puras (shared/ e scripts/), sem subir o Nuxt.
export default defineConfig({
  test: {
    include: ['shared/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node'
  }
})
