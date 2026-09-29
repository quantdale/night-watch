import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/testSetup.ts',
    css: true,
    restoreMocks: true,
    // VD-02: the G18 UI-harness execution receipt (see scripts/receipt-reporter.mjs).
    reporters: ['default', './scripts/receipt-reporter.mjs'],
  },
});
