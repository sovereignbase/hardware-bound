import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'test/compatibility/browsers',
  testMatch: '**/*.spec.ts',
  timeout: 30000,
  reporter: [['list'], ['json', { outputFile: 'test/.results/browsers.json' }]],
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
      testIgnore: '**/native.spec.ts',
      use: { browserName: 'firefox' },
    },
    {
      name: 'webkit',
      testIgnore: '**/native.spec.ts',
      use: { browserName: 'webkit' },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      testIgnore: '**/native.spec.ts',
      use: { ...devices['iPhone 12'] },
    },
  ],
})
