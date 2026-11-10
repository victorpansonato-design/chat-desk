import { defineConfig } from '@playwright/test';

const externalBaseURL = process.env.BASE_URL;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  workers: 4,
  forbidOnly: !!process.env.CI,
  reporter: [['list']],
  use: {
    baseURL: externalBaseURL || 'http://127.0.0.1:5174',
    channel: process.env.CI ? 'chromium' : 'chrome',
    viewport: { width: 1280, height: 860 },
    launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
    permissions: ['microphone'],
  },
  webServer: externalBaseURL ? undefined : {
    command: 'npm run preview -- --host 127.0.0.1 --strictPort',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
