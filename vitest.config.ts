import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/src/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.{js,ts}'],
      exclude: [
        'packages/*/src/**/*.{test,spec}.{js,ts}',
        'packages/*/src/**/*.d.ts',
        'packages/*/dist/**'
      ]
    }
  }
});
