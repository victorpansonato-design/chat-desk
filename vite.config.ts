import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1' },
  build: { target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'] },
  test: { environment: 'node', include: ['tests/unit/**/*.test.ts'] },
});
