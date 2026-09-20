const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.CCO_PLAYWRIGHT_PATH || '../../.tmp-iqa-integration/node_modules/playwright');
const { startServer } = require('../tools/preview.cjs');

(async () => {
  const service = await startServer(), browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/UTNewTheme/Party.aspx*', route => route.fulfill({ contentType: 'text/html', body: '<h1>Contact record fixture</h1>' }));
    await page.goto(service.url);
    await page.waitForFunction(() => window.UnionSuiteCCO?.diagnostics()[0]?.frames[0]?.state === 'ready');
    const child = page.frameLocator('iframe').first();
    await child.locator('body').evaluate(() => {
      const links = [
        ['contact', '/UTNewTheme/Party.aspx?ID=2002&tag=a&tag=b#details', ''],
        ['popup', '/UTNewTheme/Party.aspx?ID=popup', 'onclick="event.preventDefault();window.popupPreserved=true"'],
        ['postback', 'javascript:void(0)', ''],
        ['paging', location.pathname + '?page=2', ''],
        ['hash', '#section', ''],
        ['download', '/files/example.pdf', 'download'],
        ['export', '/Download.aspx?File=1', ''],
        ['blank', '/UTNewTheme/Party.aspx?ID=new', 'target="_blank"'],
        ['mailto', 'mailto:example@example.test', ''],
        ['external', 'https://other.example.test/contact', ''],
        ['optout', '/UTNewTheme/Party.aspx?ID=stay', 'data-us-cco-navigation="child"'],
        ['late', '/UTNewTheme/Party.aspx?ID=late', ''],
        ['modified', '/UTNewTheme/Party.aspx?ID=modified', '']
      ];
      document.body.insertAdjacentHTML('beforeend', links.map(([id, href, attrs]) => `<a id="${id}" href="${href}" ${attrs}>${id}</a>`).join(' '));
      // Observe targets after the runtime handler; cancel these policy checks before navigation.
      document.addEventListener('click', event => {
        const a = event.target.closest('a');
        if (!a || a.id === 'contact') return;
        window.observed ||= {};
        window.observed[a.id] = a.getAttribute('target');
        event.preventDefault();
      });
    });
    for (const id of ['popup', 'postback', 'paging', 'hash', 'download', 'export', 'blank', 'mailto', 'external', 'optout', 'late']) await child.locator(`#${id}`).click();
    await child.locator('#modified').click({ modifiers: ['Control'] });
    const observed = await child.locator('body').evaluate(() => window.observed);
    for (const id of ['popup', 'postback', 'paging', 'hash', 'download', 'export', 'mailto', 'external', 'optout', 'modified']) assert.equal(observed[id], null, id);
    assert.equal(observed.blank, '_blank'); assert.equal(observed.late, '_parent');
    assert.equal(page.url(), service.url + '/');
    // Native popup helper remains available in the same child.
    await child.locator('#dialog').click();
    assert.equal(await child.locator('#result').textContent(), 'Saved in originating child 1');
    await Promise.all([page.waitForURL('**/UTNewTheme/Party.aspx?ID=2002&tag=a&tag=b#details'), child.locator('#contact').click()]);
    assert.equal(await page.getByRole('heading', { name: 'Contact record fixture' }).count(), 1);
    assert.equal(await page.locator('iframe').count(), 0);

    // Verify delegated handling survives newly inserted links and cleanup restores the original target.
    await page.goto(service.url);
    await page.waitForFunction(() => window.UnionSuiteCCO?.diagnostics()[0]?.frames[0]?.state === 'ready');
    const source = fs.readFileSync(path.resolve(__dirname, '../src/navigation.js'), 'utf8').replace('export function ', 'function ');
    const restored = await page.evaluate(source => {
      const frame = document.querySelector('iframe').contentWindow;
      const doc = frame.document;
      const isolated = doc.implementation.createHTMLDocument('test');
      const simulated = { document: isolated, location: frame.location };
      // Set a real absolute href because this detached document has about:blank as baseURI.
      const a = isolated.createElement('a'); a.href = location.origin + '/UTNewTheme/Party.aspx'; a.target = '_self'; isolated.body.append(a);
      const cleanup = new Function(source + '; return installChildNavigation;')()(simulated);
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
      isolated.addEventListener('click', e => e.preventDefault());
      a.dispatchEvent(event);
      const during = a.target; cleanup();
      return { during, after: a.target };
    }, source);
    assert.deepEqual(restored, { during: '_parent', after: '_self' });
    assert.deepEqual(errors, []);
    console.log('PASS child navigation: real parent contact navigation with exact URL, popup/postback/paging/hash/download/new-tab/modifier exceptions, later cancellation and cleanup.');
  } finally { await browser.close(); await new Promise(resolve => service.server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
