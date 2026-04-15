import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**/*.{js,ts}', 'components/**/*.{js,ts,jsx,tsx}', 'app/**/*.{js,ts,jsx,tsx}'],
      exclude: [
        '**/*.{test,spec}.{js,ts,jsx,tsx}',
        '**/*.d.ts'
      ]
    }
  }
});
