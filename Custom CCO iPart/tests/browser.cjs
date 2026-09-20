const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
// Reuse the workspace's existing Playwright installation; no dependency downloads.
const { chromium } = require(process.env.CCO_PLAYWRIGHT_PATH || '../../.tmp-iqa-integration/node_modules/playwright');
const { startServer } = require('../tools/preview.cjs');
const { ids, mount, wrap } = require('./fixtures.cjs');
const parameter = `us-cco-${ids.content.replaceAll('-', '')}-${ids.placement.replaceAll('-', '')}`;
const out = path.resolve(__dirname, '../references/test-output');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const service = await startServer();
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [], measurements = [];
  const contentRequests = () => service.requests.filter(r => r.pathname.includes('ContentPreview'));
  async function scenario(name, run, options = {}) {
    for (const key of Object.keys(service.options)) delete service.options[key];
    Object.assign(service.options, options); service.requests.length = 0;
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await run(page);
      assert.deepEqual(errors, [], 'Unexpected browser errors');
      results.push({ name, passed: true }); console.log(`PASS ${name}`);
    } finally { await context.close(); }
  }
  const ready = (page, count = 1) => page.waitForFunction(count => window.UnionSuiteCCO?.diagnostics().flatMap(x => x.frames).filter(f => f.state === 'ready').length === count, count);
  const first = page => page.locator('[data-us-cco]').first();
  try {
    await scenario('selected-only cold load, retained input, accessible tabs, keyboard and no parent submit', async page => {
      await page.goto(`${service.url}/?ID=1001&tag=a&tag=b`); await ready(page);
      assert.equal(contentRequests().length, 1);
      const tabs = first(page).getByRole('tab');
      assert.equal(await tabs.nth(0).getAttribute('aria-selected'), 'true');
      const child = first(page).frameLocator('iframe').first();
      await child.locator('#search').fill('retained search');
      await tabs.nth(0).focus(); await tabs.nth(0).press('End');
      assert.equal(await tabs.nth(2).evaluate(el => el === document.activeElement), true);
      assert.equal(contentRequests().length, 1, 'Keyboard focus must not load a tab until activation');
      await tabs.nth(2).press('Enter'); await ready(page, 2);
      await tabs.nth(0).click();
      assert.equal(await child.locator('#search').inputValue(), 'retained search');
      assert.equal(await first(page).locator('[role=tabpanel]:not([hidden])').count(), 1);
      assert.equal(await first(page).locator('[role=tabpanel][hidden]').evaluateAll(els => els.every(el => el.inert)), true);
      assert.equal(await page.evaluate(() => window.parentSubmits), 0);
      assert.equal(contentRequests().length, 2);
      const requestUrl = new URL(contentRequests()[0].search, service.url);
      assert.deepEqual(requestUrl.searchParams.getAll('tag'), ['a', 'b']);
      assert.equal(requestUrl.searchParams.get('ID'), '1001');
      assert.equal(requestUrl.searchParams.get(parameter), null);
      const timing = await page.evaluate(() => window.timing);
      measurements.push({ case: 'retained-switch', requestCount: contentRequests().length, timing });
      await page.screenshot({ path: path.join(out, 'runtime-desktop.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: path.join(out, 'runtime-mobile.png'), fullPage: true });
    });

    await scenario('selected deep link first; sequential preloading waits for it; clicked tab bypasses queue', async page => {
      const selectedResponse = page.waitForResponse(response => response.url().includes('ContentPreview.aspx'));
      await page.goto(`${service.url}/?ID=1001&${parameter}=${ids.pages[1]}`);
      await page.waitForFunction(() => window.UnionSuiteCCO?.diagnostics()[0]?.frames.length === 1);
      await selectedResponse;
      assert.equal(new URL(contentRequests()[0].search, service.url).searchParams.get('iUniformKey'), ids.pages[1]);
      await page.waitForTimeout(150); assert.equal(contentRequests().length, 1);
      await ready(page);
      await page.waitForFunction(() => window.UnionSuiteCCO.diagnostics()[0].frames.length === 2);
      await first(page).getByRole('tab').nth(2).click();
      await ready(page, 3);
      assert.equal(contentRequests().length, 3);
      assert.equal(await first(page).getByRole('tab').nth(2).getAttribute('aria-selected'), 'true');
      measurements.push({ case: 'sequential-preload', requests: contentRequests().map(r => ({ search: r.search, time: r.time })) });
    }, { preload: 'sequential-idle', frameDelay: { [ids.pages[1]]: 500, [ids.pages[0]]: 900 } });

    await scenario('cold/in-flight selection does not duplicate requests', async page => {
      await page.goto(service.url); await ready(page);
      const tabs = first(page).getByRole('tab');
      await tabs.nth(1).click(); await tabs.nth(0).click(); await tabs.nth(1).click();
      await ready(page, 2); assert.equal(contentRequests().length, 2);
    }, { frameDelay: { [ids.pages[1]]: 400 } });

    await scenario('Back/Forward selects retained frames and host context change invalidates clean frames', async page => {
      await page.goto(`${service.url}/?ID=old&tag=a&tag=b`); await ready(page);
      const tabs = first(page).getByRole('tab');
      await tabs.nth(1).click(); await ready(page, 2);
      await tabs.nth(2).click(); await ready(page, 3);
      await page.goBack(); assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
      await page.goForward(); assert.equal(await tabs.nth(2).getAttribute('aria-selected'), 'true');
      assert.equal(contentRequests().length, 3);
      await page.evaluate(() => { const url = new URL(location); url.searchParams.set('ID', 'new'); history.replaceState(history.state, '', url); });
      await ready(page);
      assert.equal(await first(page).locator('iframe').count(), 1);
      assert.equal(await first(page).frameLocator('iframe').locator('#context').textContent(), 'new');
      assert.equal(contentRequests().length, 4);
      assert.equal(service.requests.filter(r => r.pathname === '/api/ContentItem').length, 2);
    });

    await scenario('dirty context is hidden, can restore previous context, and requires deliberate discard', async page => {
      await page.goto(`${service.url}/?ID=old`); await ready(page);
      await first(page).frameLocator('iframe').locator('#search').fill('unsaved');
      const change = value => page.evaluate(value => { const url = new URL(location); url.searchParams.set('ID', value); history.replaceState(null, '', url); }, value);
      await change('new');
      assert.equal(await first(page).locator('.us-cco__content').isVisible(), false);
      assert.equal(contentRequests().length, 1);
      await change('old');
      assert.equal(await first(page).frameLocator('iframe').locator('#search').inputValue(), 'unsaved');
      await change('new');
      await first(page).getByRole('button', { name: 'Discard changes and load current context' }).click();
      await ready(page);
      assert.equal(await first(page).frameLocator('iframe').locator('#context').textContent(), 'new');
      assert.equal(contentRequests().length, 2);
    });

    await scenario('two placements and copied pages use correct pair and independent selection', async page => {
      await page.goto(`${service.url}/?two`); await ready(page, 2);
      const calls = service.requests.filter(r => r.pathname === '/api/ContentItem').map(r => new URL(r.search, service.url).searchParams);
      assert.deepEqual(calls.map(p => p.get('ContentItemKey')).sort(), [ids.placement, ids.second].sort());
      assert.ok(calls.every(p => p.get('ContentKey') === ids.content));
      await first(page).getByRole('tab').nth(1).click(); await ready(page, 3);
      assert.equal(await page.locator('[data-us-cco]').nth(1).getByRole('tab').nth(0).getAttribute('aria-selected'), 'true');
      await page.goto(`${service.url}/?copy`); await ready(page);
      const last = service.requests.filter(r => r.pathname === '/api/ContentItem').at(-1);
      assert.equal(new URL(last.search, service.url).searchParams.get('ContentKey'), ids.copy);
    });

    await scenario('wrong-row response is visible and never lists or loads pages', async page => {
      await page.goto(service.url);
      await first(page).getByText(/exactly one matching/).waitFor();
      assert.equal(contentRequests().length, 0);
      assert.equal(service.requests.filter(r => r.pathname === '/api/Document/_execute').length, 0);
    }, { rows: [{ Data: { ContentKey: ids.copy, ContentItemKey: ids.placement, JsonSettings: '{}' } }] });

    await scenario('unresolved tokens fail before API; fixing mount attributes initializes once', async page => {
      await page.route('**/runtime.js', async route => { await route.fulfill({ path: path.resolve(__dirname, '../dist/runtime.js') }); });
      await page.goto(service.url); await ready(page);
      await page.evaluate(() => { window.UnionSuiteCCO.dispose(); document.querySelector('[data-us-cco]').dataset.contentKey = '[x-contentKey]'; });
      const before = service.requests.filter(r => r.pathname === '/api/ContentItem').length;
      await page.addScriptTag({ url: `${service.url}/runtime.js` });
      await first(page).getByText(/non-empty GUID/).waitFor();
      assert.equal(service.requests.filter(r => r.pathname === '/api/ContentItem').length, before);
      await first(page).evaluate((el, value) => { el.dataset.contentKey = value; }, ids.content);
      await ready(page); assert.equal(service.requests.filter(r => r.pathname === '/api/ContentItem').length, before + 1);
    });

    for (const [name, options, text] of [
      ['denied API', { apiError: 403 }, /HTTP 403/],
      ['service failure', { folderResponse: { IsSuccessStatusCode: false, Result: [] } }, /operation failed/],
      ['empty folder', { folderResponse: { IsSuccessStatusCode: true, Result: [] } }, /No available published/],
      ['missing config', { config: { folderDocumentVersionId: '' } }, /non-empty GUID/]
    ]) await scenario(`${name} has visible recovery without a frame`, async page => {
      await page.goto(service.url); await first(page).getByText(text).waitFor();
      assert.equal(await first(page).locator('iframe').count(), 0);
      assert.equal(await first(page).getByRole('button', { name: 'Reload configuration' }).count(), 1);
    }, options);

    await scenario('refresh icon has tooltip and keyboard support, refreshes only its tab and protects unsaved edits', async page => {
      await page.goto(service.url); await ready(page);
      await page.addScriptTag({ url:`${service.url}/theme.js` });
      const refresh = first(page).getByRole('button', { name:'refresh tab', exact:true });
      const panel = () => first(page).locator('.us-cco__panel:not([hidden])');
      assert.equal(await refresh.getAttribute('title'), 'refresh tab');
      assert.equal(await refresh.textContent(), '');
      assert.equal(await refresh.locator('svg[aria-hidden=true]').count(), 1);
      assert.equal(await first(page).locator('.us-cco__actions a, .us-cco__actions summary').count(), 0);
      await refresh.hover();
      await page.locator('.us-action-tooltip:not([hidden])').waitFor();
      assert.equal(await page.locator('.us-action-tooltip').textContent(), 'refresh tab');
      assert.equal((await refresh.boundingBox()).width, 36);
      await page.screenshot({ path:path.join(out, 'refresh-controls.png'), fullPage:true });
      await page.keyboard.press('Escape');
      await panel().locator('iframe').evaluate(n => { window.retainedFrame = n; n.contentDocument.getElementById('search').value = 'retained other tab'; });
      await first(page).getByRole('tab').nth(1).click(); await ready(page, 2);
      const before = contentRequests().length, location = page.url();
      await refresh.focus(); await page.keyboard.press('Enter');
      assert.equal(await refresh.getAttribute('aria-disabled'), 'true');
      // aria-disabled keeps keyboard focus, while the handler blocks repeat clicks.
      await refresh.evaluate(n => n.click());
      await ready(page, 2);
      assert.equal(contentRequests().length, before + 1);
      assert.equal(new URL(contentRequests().at(-1).search, service.url).searchParams.get('iUniformKey'), ids.pages[1]);
      assert.equal(service.requests.filter(r => r.pathname === '/api/ContentItem').length, 1);
      assert.equal(page.url(), location);
      assert.equal(await refresh.evaluate(n => n === document.activeElement), true);
      await first(page).getByRole('tab').first().click();
      assert.equal(await panel().locator('iframe').evaluate(n => n === window.retainedFrame), true);
      const child = first(page).frameLocator('.us-cco__panel:not([hidden]) iframe');
      assert.equal(await child.locator('#search').inputValue(), 'retained other tab');
      await child.locator('#search').fill('unsaved edit');
      const beforeCancel = contentRequests().length;
      page.once('dialog', dialog => dialog.dismiss());
      await refresh.click();
      assert.equal(contentRequests().length, beforeCancel);
      assert.equal(await child.locator('#search').inputValue(), 'unsaved edit');
      page.once('dialog', dialog => dialog.accept());
      await refresh.click(); await ready(page, 2);
      assert.equal(contentRequests().length, beforeCancel + 1);
      assert.equal(await child.locator('#search').inputValue(), '');
      assert.equal(await page.evaluate(() => window.parentSubmits), 0);
    }, { frameDelay:{ [ids.pages[1]]:300 } });

    await scenario('sign-in redirect offers refresh recovery without a full-page link', async page => {
      await page.goto(service.url);
      await first(page).getByText(/sign-in or error page/).waitFor();
      assert.equal(await first(page).locator('.us-cco__actions a, .us-cco__actions summary').count(), 0);
      assert.equal(await first(page).locator('iframe').count(), 0);
      delete service.options.frameFailure;
      await first(page).getByRole('button', { name: 'refresh tab', exact: true }).click(); await ready(page);
    }, { frameFailure: ids.pages[0] });

    await scenario('popup save callback stays in originating child; helper replacement and navigation reinstall', async page => {
      await page.goto(service.url); await ready(page);
      const frame = first(page).frameLocator('iframe').first();
      await frame.locator('#dialog').click();
      assert.equal(await frame.locator('#result').textContent(), 'Saved in originating child 1');
      assert.equal(await page.evaluate(() => window.popupCalls[0].parentThis), true);
      assert.equal(await page.evaluate(() => window.popupCalls[0].callback === document.querySelector('iframe').contentWindow.callback), true);
      await first(page).getByRole('tab').nth(1).click(); await ready(page, 2);
      await first(page).frameLocator('iframe').nth(1).locator('#dialog').click();
      assert.equal(await frame.locator('#result').textContent(), 'Saved in originating child 1');
      await first(page).getByRole('tab').nth(0).click();
      await frame.locator('body').evaluate(() => { window.ShowDialog_NoReturnValue = function replacement() { window.nativeDialogs++; }; });
      await page.waitForTimeout(600);
      await frame.locator('#dialog').click();
      assert.equal(await frame.locator('#result').textContent(), 'Saved in originating child 2');
      await first(page).getByRole('button', { name: 'refresh tab', exact: true }).click();
      await ready(page, 2); await frame.locator('#dialog').click();
      assert.equal(await frame.locator('#result').textContent(), 'Saved in originating child 1');
    });

    for (const wrapper of ['direct', 'wrapped', 'empty', 'none']) await scenario(`wrapper ${wrapper}, duplicate bootstrap, replaced mounts and cleanup`, async page => {
      await page.goto(`${service.url}/?wrapper=${wrapper}`); await ready(page);
      await page.addScriptTag({ url: `${service.url}/runtime.js` });
      assert.equal(service.requests.filter(r => r.pathname === '/api/ContentItem').length, 1);
      await first(page).evaluate((el, html) => { el.outerHTML = html; }, mount());
      await ready(page);
      assert.equal(await page.locator('iframe').count(), 1);
      assert.equal(service.requests.filter(r => r.pathname === '/api/ContentItem').length, 2);
      await first(page).evaluate(el => el.remove());
      await page.waitForFunction(() => window.UnionSuiteCCO.diagnostics().length === 0);
    });

    await scenario('nested panels are untouched; recursive CCO and duplicate identity mounts are rejected', async page => {
      await page.goto(service.url); await ready(page);
      await first(page).evaluate((el, html) => { const native = document.createElement('div'); native.className = 'panel'; native.id = 'nested-native'; native.textContent = 'Native iPart'; el.append(native); el.insertAdjacentHTML('beforeend', html); }, mount(ids.copy));
      await first(page).getByText(/Nested UnionSuite CCO/).waitFor();
      assert.equal(await page.locator('#nested-native').textContent(), 'Native iPart');
      await page.locator('main').evaluate((el, html) => el.insertAdjacentHTML('beforeend', html), wrap(mount()));
      await page.getByText(/same placement appears twice/).waitFor();
      assert.equal(service.requests.filter(r => r.pathname === '/api/ContentItem').length, 1);
    });

    await scenario('ASP.NET partial replacement disposes mounts and unregisters handlers', async page => {
      await page.addInitScript(() => {
        window.aspCallbacks = { loads: [], deleting: [] };
        const manager = { add_pageLoading: fn => window.aspCallbacks.deleting.push(fn), remove_pageLoading: fn => window.aspCallbacks.deleting.splice(window.aspCallbacks.deleting.indexOf(fn), 1) };
        window.Sys = { Application: { add_load: fn => window.aspCallbacks.loads.push(fn), remove_load: fn => window.aspCallbacks.loads.splice(window.aspCallbacks.loads.indexOf(fn), 1) }, WebForms: { PageRequestManager: { getInstance: () => manager } } };
      });
      await page.goto(service.url); await ready(page);
      assert.deepEqual(await page.evaluate(() => [window.aspCallbacks.loads.length, window.aspCallbacks.deleting.length]), [1, 1]);
      await page.evaluate(html => {
        const panel = document.querySelector('.ContentItemContainer');
        window.aspCallbacks.deleting[0](null, { get_panelsUpdating: () => [panel] });
        panel.innerHTML = html;
        window.aspCallbacks.loads[0]();
      }, mount());
      await ready(page); assert.equal(service.requests.filter(r => r.pathname === '/api/ContentItem').length, 2);
      await page.evaluate(() => window.UnionSuiteCCO.dispose());
      assert.deepEqual(await page.evaluate(() => [window.aspCallbacks.loads.length, window.aspCallbacks.deleting.length]), [0, 0]);
    });

    await scenario('native editor round-trip, foreign properties, save guard, listing and remount', async page => {
      await page.goto(`${service.url}/config-demo`);
      await page.locator('[data-setting=caption]').fill('Member directory');
      await page.locator('#ctl01_SaveButton').click();
      const saved = await page.evaluate(() => JSON.parse(window.savedValues.at(-1)));
      assert.equal(saved.caption, 'Member directory'); assert.deepEqual(saved.foreignProperty, { retained: true });
      assert.equal(saved.folderDocumentVersionId, ids.folder);
      await page.locator('[data-check-folder]').click();
      await page.getByText(/3 content pages returned/).waitFor();
      assert.equal(await page.locator('[data-folder-results] li').count(), 3);
      await page.locator('[data-setting=folderDocumentVersionId]').fill('bad');
      await page.locator('#ctl01_SaveButton').click();
      assert.equal(await page.evaluate(() => window.savedValues.length), 1);
      assert.deepEqual(await page.evaluate(() => JSON.parse(document.getElementById('JsonSettings').value)), saved);
      await page.evaluate(() => { window.UnionSuiteCCOEditor.dispose(); });
      await page.reload();
      await page.evaluate(saved => { document.getElementById('JsonSettings').value = JSON.stringify(saved); window.UnionSuiteCCOEditor.scan(); }, saved);
      assert.equal(await page.locator('[data-setting=caption]').inputValue(), 'Member directory');
      await page.locator('#ctl01_SaveAndCloseButton').click();
      assert.equal(await page.evaluate(() => window.savedValues.length), 1);
      await page.screenshot({ path: path.join(out, 'config-desktop.png'), fullPage: true });
      await page.evaluate(() => { document.getElementById('JsonSettings').value = '{invalid'; window.UnionSuiteCCOEditor.scan(); });
      await page.locator('#ctl01_SaveButton').click();
      assert.equal(await page.evaluate(() => document.getElementById('JsonSettings').value), '{invalid');
      assert.equal(await page.evaluate(() => window.savedValues.length), 1);
    });

    fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify({ testedAt: new Date().toISOString(), browser: await browser.version(), environment: 'Local HTTP fixtures; synthetic data; no iMIS session', results, measurements }, null, 2));
    console.log(`Completed ${results.length} browser scenarios. Evidence: references/test-output/`);
  } finally { await browser.close(); await new Promise(resolve => service.server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
