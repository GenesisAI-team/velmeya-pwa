import { defineConfig } from 'vitest/config'

// Suite que requiere el Emulator Suite de Firebase en marcha (Auth 9099,
// Firestore 8080): se ejecuta con `pnpm test:emuladores`, típicamente dentro
// de `firebase emulators:exec --project demo-velmeya-local`.
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/test/emuladores/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
  },
})
