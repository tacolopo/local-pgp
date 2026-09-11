import { defineConfig } from '@playwright/test';
const port = Number(process.env.PORT || 8787);
export default defineConfig({
  testDir: './test', testMatch: '**/*.spec.js',
  use: { baseURL: `http://127.0.0.1:${port}` },
  webServer: { command: 'npm start', url: `http://127.0.0.1:${port}`, reuseExistingServer: false },
});
