import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './test', testMatch: '**/*.spec.js',
  use: { baseURL: 'http://127.0.0.1:8787' },
  webServer: { command: 'npm start', url: 'http://127.0.0.1:8787', reuseExistingServer: false },
});
