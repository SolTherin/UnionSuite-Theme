const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.CCO_PLAYWRIGHT_PATH || '../../.tmp-iqa-integration/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await context.newPage(), requests = [], errors = [];
    page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../references/Usage-Guide.html')).href);
    assert.equal(await page.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), true);
    await page.locator('[data-copy="settings"]').click();
    await page.waitForFunction(() => document.getElementById('copy-status').textContent === 'Copied.');
    assert.equal(await page.locator('#copy-status').textContent(), 'Copied.');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    assert.equal(JSON.parse(copied).preload, 'off');
    await page.locator('[data-copy-text="us-cco"]').click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'us-cco');
    await page.locator('[data-copy="page-editor-control"]').click();
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), /aria-label="Edit About page"/);
    await page.locator('#page-editor').evaluate(node => node.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.resolve(__dirname, '../references/test-output/guide-page-editor-desktop.png') });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.resolve(__dirname, '../references/test-output/guide-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.resolve(__dirname, '../references/test-output/guide-mobile.png') });
    await page.locator('#page-editor').evaluate(node => node.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.resolve(__dirname, '../references/test-output/guide-page-editor-mobile.png') });
    assert.deepEqual(requests, []); assert.deepEqual(errors, []);
    console.log('PASS offline guide: inline images, actual copy controls, desktop/narrow layout, zero HTTP requests, no browser errors.');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
