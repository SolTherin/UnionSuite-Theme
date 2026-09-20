const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.CCO_PLAYWRIGHT_PATH || '../../.tmp-iqa-integration/node_modules/playwright');
const { startServer } = require('../tools/preview.cjs');
const { ids, mount, parentHtml } = require('./fixtures.cjs');
const directory = path.resolve(__dirname, '../upload/UnionSuite-CCO');
const display = fs.readFileSync(path.join(directory, 'display.html'), 'utf8');
const configure = fs.readFileSync(path.join(directory, 'configure.html'), 'utf8');

(async () => {
  for (const html of [display, configure]) {
    assert.doesNotMatch(html, /[^\x00-\x7F]/, 'Static upload files must survive legacy decoding unchanged');
    assert.doesNotMatch(html, /<(?:script|link)\b[^>]*(?:src|href)=/i);
    assert.doesNotMatch(html, /\{\{[A-Z_]+\}\}|unionsuite-cco\.invalid/);
  }
  assert.match(display, /\[x-contentItemKey\]/);
  assert.match(display, /\[x-contentKey\]/);
  const service = await startServer();
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [], requested = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requested.push(new URL(request.url()).pathname));
    await page.route('**/uploaded-component-host*', route => {
      const substituted = display.replaceAll('[x-contentItemKey]', ids.placement).replaceAll('[x-contentKey]', ids.content);
      const html = parentHtml().replace(mount(), () => substituted)
        .replace('<script src="/runtime.js"></script>', '')
        .replace('<link rel="stylesheet" href="/cco.css">', '');
      return route.fulfill({ contentType: 'text/html', body: html });
    });
    await page.goto(`${service.url}/uploaded-component-host?ID=upload-test&tag=a&tag=b`);
    await page.waitForFunction(() => window.UnionSuiteCCO?.diagnostics()[0]?.frames[0]?.state === 'ready');
    assert.equal(await page.frameLocator('iframe').locator('#context').textContent(), 'upload-test');
    await page.frameLocator('iframe').locator('#search').fill('retained');
    await page.getByRole('tab').nth(1).click();
    await page.waitForFunction(() => window.UnionSuiteCCO.diagnostics()[0].frames.length === 2 && window.UnionSuiteCCO.diagnostics()[0].frames.every(frame => frame.state === 'ready'));
    await page.getByRole('tab').nth(0).click();
    assert.equal(await page.frameLocator('iframe').first().locator('#search').inputValue(), 'retained');
    assert.ok(!requested.includes('/runtime.js') && !requested.includes('/cco.css'));
    assert.equal(await page.locator('.us-cco__tabs').evaluate(el => getComputedStyle(el).display), 'flex');
    await page.frameLocator('iframe').first().locator('#dialog').click();
    assert.equal(await page.frameLocator('iframe').first().locator('#result').textContent(), 'Saved in originating child 1');
    await page.evaluate(() => {
      window.gIsEasyEditEnabled = true;
      window.gWebSiteRoot = location.origin + '/UTNewTheme/';
      window.ShowDialog_NoReturnValue = function(...args) { window.uploadEditor = { parentThis:this===window, args }; };
      document.querySelector('iframe').dataset.retainedUpload = 'true';
      window.UnionSuiteCCO.scan();
    });
    await page.getByRole('button', {name:'Edit Overview page', exact:true}).click();
    assert.deepEqual(await page.evaluate(() => ({
      parentThis:window.uploadEditor.parentThis,
      path:new URL(window.uploadEditor.args[0]).pathname,
      key:new URL(window.uploadEditor.args[0]).searchParams.get('iUniformKey'),
      before:window.uploadEditor.args[7], close:typeof window.uploadEditor.args[11]
    })), {parentThis:true,path:'/UTNewTheme/AsiCommon/Controls/ContentManagement/ContentDesigner/ContentRecordEdit.aspx',key:ids.pages[1],before:null,close:'function'});
    const requestsBeforeEditClose = requested.filter(p => p.endsWith('ContentPreview.aspx')).length;
    const editorRefresh = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname.endsWith('ContentPreview.aspx') && url.searchParams.get('iUniformKey') === ids.pages[1];
    });
    await page.evaluate(() => window.uploadEditor.args[11]());
    await editorRefresh;
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Edit Overview page');
    await page.waitForFunction(() => window.UnionSuiteCCO.diagnostics()[0].frames.every(f => f.state === 'ready'));
    assert.equal(requested.filter(p => p.endsWith('ContentPreview.aspx')).length, requestsBeforeEditClose + 1);
    assert.equal(await page.locator('iframe[data-retained-upload]').count(),1,'uploaded editor close preserves the other tab');
    await page.route('**/uploaded-config-host', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body><input id="JsonSettings" type="hidden" value='{"schemaVersion":1,"folderDocumentVersionId":"${ids.folder}","foreign":true}'>${configure}<button id="ctl01_SaveButton" type="button">Save</button><script>window.saves=0;document.getElementById('ctl01_SaveButton').onclick=()=>window.saves++;</script></body></html>` }));
    await page.goto(`${service.url}/uploaded-config-host`);
    assert.deepEqual(await page.locator('[data-setting=preload] option').allTextContents(), [
      'Off - selected page only', 'Trial - preload sequentially after the selected page'
    ]);
    await page.locator('[data-setting=caption]').fill('Uploaded configuration');
    await page.locator('#ctl01_SaveButton').click();
    const result = await page.evaluate(() => ({ saves: window.saves, settings: JSON.parse(document.getElementById('JsonSettings').value) }));
    assert.equal(result.saves, 1); assert.equal(result.settings.caption, 'Uploaded configuration'); assert.equal(result.settings.foreign, true);
    assert.deepEqual(errors, []);
    await page.goto(`${service.url}/config-demo`);
    await page.screenshot({ path: path.resolve(__dirname, '../references/test-output/config-desktop.png'), fullPage: true });
    console.log('PASS standalone upload: self-contained HTML, substituted pair, selected frame, retained state, popup callback and native config save preparation. Live iMIS fetch/CSP remains unverified.');
  } finally { await browser.close(); await new Promise(resolve => service.server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
