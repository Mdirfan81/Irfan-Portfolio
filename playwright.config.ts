import { defineConfig, devices } from '@playwright/test'

// CI runners have no GPU, so WebGL is off unless Chromium is told to use its
// software rasteriser. Without this the 3D scene simply never mounts and the
// test that guards it silently skips.
const SOFTWARE_GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']

const chromiumOverride = {
  launchOptions: {
    args: SOFTWARE_GL,
    ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
  },
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  // CI images often ship their own Chromium. Point PW_CHROMIUM_PATH at it to
  // skip `playwright install`; locally, leave it unset and Playwright uses its
  // own managed browsers.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...chromiumOverride },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'], ...chromiumOverride } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
