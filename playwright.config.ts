import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'test/compatibility/browsers',
  testMatch: '**/*.spec.ts',
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
  },
  webServer: {
    command: 'node test/compatibility/browsers/server.ts',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' },
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
})
