const assert = require('node:assert/strict');
const { chromium } = require('../../.tmp-iqa-integration/node_modules/playwright');
const { startServer } = require('../tools/preview.cjs');
const { ids, pages } = require('./fixtures.cjs');

(async () => {
  const service = await startServer({
    config:{ urlParameter:'Directory', urlValue:'key', initialDocumentVersionId:ids.pages[2] },
    folderResponse:{ IsSuccessStatusCode:true, Result:{ $values:pages.map((page, index) => ({ ...page, AlternateName:index === 1 ? 'About' : page.AlternateName })) } }
  });
  const browser = await chromium.launch({ channel:'msedge', headless:true });
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const selected = () => page.getByRole('tab', { selected:true });
    const ready = () => page.waitForFunction(() => {
      const panel = document.querySelector('.us-cco__panel:not([hidden])');
      return panel?.getAttribute('aria-busy') === 'false';
    });
    for (const format of ['key', 'number', 'name']) {
      service.options.config.urlValue = format;
      for (const value of [ids.pages[1], '2', 'About']) {
        service.requests.length = 0;
        await page.goto(`${service.url}/?ID=1001&tag=a&tag=b&Directory=${value}`); await ready();
        assert.equal(await selected().textContent(), 'About', `${format} configuration accepts ${value}`);
        const childRequests = service.requests.filter(r => r.pathname.endsWith('ContentPreview.aspx'));
        assert.equal(childRequests.length, 1, 'only the requested page loads');
        const query = new URLSearchParams(childRequests[0].search);
        assert.equal(query.get('iUniformKey'), ids.pages[1]);
        assert.equal(query.get('ID'), '1001'); assert.deepEqual(query.getAll('tag'), ['a', 'b']);
        assert.equal(query.has('Directory'), false, 'selection aliases are not child context');
      }
      await page.getByRole('tab', { name:'Finance', exact:true }).click(); await ready();
      const expected = format === 'key' ? ids.pages[2] : format === 'number' ? '3' : 'Finance';
      assert.equal(new URL(page.url()).searchParams.get('Directory'), expected, 'clicks retain the configured output format');
      const requestCount = service.requests.filter(r => r.pathname.endsWith('ContentPreview.aspx')).length;
      await page.goBack(); await ready(); assert.equal(await selected().textContent(), 'About');
      await page.goForward(); await ready(); assert.equal(await selected().textContent(), 'Finance');
      assert.equal(service.requests.filter(r => r.pathname.endsWith('ContentPreview.aspx')).length, requestCount, 'Back/Forward retains loaded frames');
      assert.equal(service.requests.filter(r => r.pathname === '/api/ContentItem').length, 1);
    }
    service.options.config.urlValue = 'key';
    for (const [value, caption] of [['aBoUt', 'About'], ['%20About%20', 'About'], ['People-search', 'People search'], ['People%20search', 'People search']]) {
      await page.goto(`${service.url}/?Directory=${value}`); await ready();
      assert.equal(await selected().textContent(), caption);
    }
    await page.reload(); await ready(); assert.equal(await selected().textContent(), 'People search');
    const legacy = `us-cco-${ids.content.replaceAll('-', '')}-${ids.placement.replaceAll('-', '')}`;
    await page.goto(`${service.url}/?${legacy}=${ids.pages[1]}`); await ready();
    assert.equal(await selected().textContent(), 'About', 'old automatic key links remain valid');
    await page.goto(`${service.url}/?${legacy}=${ids.pages[1]}&Directory=Missing`); await ready();
    assert.equal(await selected().textContent(), 'Finance', 'an unavailable explicit alias uses the configured default');
    // An unset format defaults to dashed names, including when no link selected a tab.
    delete service.options.config.urlValue;
    service.options.folderResponse.Result.$values[2].AlternateName = 'Notes and Interactions';
    await page.goto(service.url); await ready();
    await page.getByRole('tab', { name:'About', exact:true }).click(); await ready();
    await page.getByRole('tab', { name:'Notes and Interactions', exact:true }).click(); await ready();
    assert.equal(new URL(page.url()).searchParams.get('Directory'), 'Notes-and-Interactions');
    for (const value of ['Notes-and-Interactions', 'notes-and-interactions', 'Notes%20and%20Interactions']) {
      await page.goto(`${service.url}/?Directory=${value}`); await ready();
      assert.equal(await selected().textContent(), 'Notes and Interactions');
    }
    await page.goto(`${service.url}/config-demo`);
    assert.equal(await page.locator('[data-setting=urlValue]').inputValue(), 'name');
    await page.getByRole('button', { name:'Save', exact:true }).click();
    assert.equal(JSON.parse(await page.locator('#JsonSettings').inputValue()).urlValue, 'name');
    assert.deepEqual(errors, []);
    console.log('PASS all 9 incoming/output format combinations, requested-page-first loading, configured click format, encoded/case-insensitive names, refresh, retained Back/Forward, context isolation, legacy keys and invalid-link fallback.');
  } finally { await browser.close(); await new Promise(resolve => service.server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
