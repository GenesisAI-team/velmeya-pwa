import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: './src/test/setup.ts',
    // Las pruebas que requieren el Emulator Suite viven en su propia suite:
    // `pnpm test:emuladores` (ver vitest.emuladores.config.ts).
    exclude: [...configDefaults.exclude, 'src/test/emuladores/**'],
  },
})
