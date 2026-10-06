import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('loads with the right title and a single h1', async ({ page }) => {
  await expect(page).toHaveTitle(/Md Irfan Khan/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
})

test('has no detectable WCAG 2.1 AA violations', async ({ page }) => {
  // Let webfonts settle so contrast is measured against final rendering.
  await page.evaluate(() => document.fonts.ready)
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
})

test('never scrolls horizontally', async ({ page }) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
})

test('anchor navigation reaches each section', async ({ page }) => {
  for (const id of ['about', 'impact', 'skills', 'experience', 'projects', 'writing', 'contact']) {
    await page.goto(`/#${id}`)
    await expect(page.locator(`#${id}`)).toBeInViewport({ timeout: 5000 })
  }
})

test('project filters narrow the grid', async ({ page }) => {
  const grid = page.locator('#projects article')
  const total = await grid.count()

  await page.getByRole('button', { name: /^Banking/ }).click()
  await expect(grid).not.toHaveCount(total)

  await page.getByRole('button', { name: /^All/ }).click()
  await expect(grid).toHaveCount(total)
})

test('theme toggle switches the document theme', async ({ page }) => {
  const html = page.locator('html')
  const before = await html.getAttribute('data-theme')
  await page.getByRole('button', { name: /switch to (light|dark) theme/i }).click()
  await expect(html).not.toHaveAttribute('data-theme', before ?? 'dark')
})

test('keyboard users reach the skip link first', async ({ page }) => {
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: /skip to content/i })).toBeFocused()
})

test('interactive targets are at least 44px tall', async ({ page }) => {
  const targets = page.locator('#projects button, .btn')
  const count = await targets.count()
  for (let i = 0; i < count; i++) {
    const box = await targets.nth(i).boundingBox()
    if (box) expect(box.height).toBeGreaterThanOrEqual(43.5)
  }
})

test('the 3D journey layer mounts without taking over the page', async ({ page }) => {
  const layer = page.getByTestId('journey-canvas')
  // The scene is code-split, so give the chunk time to land. WebGL may be
  // unavailable in a given runner; when it is present the layer must be inert —
  // decorative, hidden from assistive tech, and never eating clicks.
  const mounted = await layer
    .waitFor({ state: 'attached', timeout: 10_000 })
    .then(() => true)
    .catch(() => false)
  test.skip(!mounted, 'no WebGL in this environment')

  await expect(layer).toHaveAttribute('aria-hidden', 'true')
  await expect(layer).toHaveCSS('pointer-events', 'none')
  // Scoped to the layer: the liquid cursor draws on a canvas of its own.
  await expect(layer.locator('canvas')).toBeVisible()

  // A control sitting over the scene still receives the click.
  await page.getByRole('button', { name: /switch to (light|dark) theme/i }).click()
})

test('the writing section links out to the real posts', async ({ page }) => {
  const links = page.locator('#writing a[href*="medium.com"]')
  await expect(links).not.toHaveCount(0)
  for (const href of await links.evaluateAll((els) => els.map((e) => e.getAttribute('href')))) {
    expect(href).toMatch(/^https:\/\/medium\.com\//)
  }
})
