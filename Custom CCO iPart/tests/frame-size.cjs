const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('../../.tmp-iqa-integration/node_modules/playwright');
const { startServer } = require('../tools/preview.cjs');

(async () => {
  const service = await startServer({ preload:'sequential-idle' });
  const browser = await chromium.launch({ channel:'msedge', headless:true });
  try {
    const page = await browser.newPage({ viewport:{ width:1280, height:900 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/ContentPreview.aspx?*', async route => {
      const response = await route.fetch();
      const body = (await response.text()).replace('</head>', `<style>
        html,body{height:100%;min-height:100%}body{margin:8px;padding:24px}
        #long-content{height:1100px;background:linear-gradient(#eef6f9,#dbe8ee);padding:16px}
        @media(max-width:500px){#long-content{height:1400px}}
      </style></head>`).replace('</body>', '<div id="long-content">Long content: scroll the main page</div><p id="end-marker">End of child content</p></body>');
      await route.fulfill({ response, body });
    });
    const frame = () => page.locator('.us-cco__panel:not([hidden]) iframe');
    const ready = () => page.waitForFunction(() => {
      const panel = document.querySelector('.us-cco__panel:not([hidden])');
      return panel?.getAttribute('aria-busy') === 'false' && panel.querySelector('iframe')?.style.visibility !== 'hidden';
    });
    const fits = () => page.waitForFunction(() => {
      const frame = document.querySelector('.us-cco__panel:not([hidden]) iframe');
      if (!frame?.contentDocument?.body) return false;
      const doc = frame.contentDocument;
      const bottom = doc.body.getBoundingClientRect().bottom + parseFloat(frame.contentWindow.getComputedStyle(doc.body).marginBottom);
      // Wait for shrinking to finish too: an old oversized viewport already
      // contains all content, but its queued resize has not necessarily run.
      return frame.clientHeight > 1000 && Math.abs(frame.clientHeight - bottom) <= 1 && doc.documentElement.scrollHeight <= frame.clientHeight + 1 && doc.getElementById('end-marker').getBoundingClientRect().bottom <= frame.clientHeight;
    });
    const edit = (code) => frame().evaluate((node, source) => node.contentWindow.eval(source), code);
    for (const wrapper of ['direct', 'wrapped', 'empty', 'none']) {
      await page.goto(`${service.url}/?wrapper=${wrapper}`); await ready(); await fits();
      assert.ok(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight), 'main page owns vertical scrolling');
    }
    const initial = await frame().evaluate(n => n.clientHeight);
    // An ordinary child update must both grow and shrink the retained viewport.
    await edit("document.getElementById('long-content').style.height='2100px'");
    await page.waitForFunction(initial => document.querySelector('.us-cco__panel:not([hidden]) iframe').clientHeight > initial + 900, initial);
    await edit("document.getElementById('long-content').style.height='100px'");
    await page.waitForFunction(initial => document.querySelector('.us-cco__panel:not([hidden]) iframe').clientHeight < initial - 800, initial);
    // A floated layout is included even though it extends below normal flow.
    await edit("document.getElementById('long-content').style.cssText='height:1600px;float:left;width:50%'");
    await fits();
    await edit("document.getElementById('long-content').style.cssText=''");
    await fits();
    const stableHeight = await frame().evaluate(n => n.clientHeight);
    await page.waitForTimeout(400);
    assert.equal(await frame().evaluate(n => n.clientHeight), stableHeight, 'no growing resize feedback loop from 100% body and padding');
    await page.screenshot({ path:path.resolve(__dirname, '../references/test-output/frame-size-desktop.png'), fullPage:true });

    // Hidden preloads are measured after becoming visible; warm tabs retain edits.
    await page.waitForFunction(() => window.UnionSuiteCCO.diagnostics()[0].frames.length === 3 && window.UnionSuiteCCO.diagnostics()[0].frames.every(f => f.state === 'ready'));
    const requests = service.requests.filter(r => r.pathname.endsWith('ContentPreview.aspx')).length;
    await frame().evaluate(n => n.contentDocument.getElementById('search').value = 'retained sizing state');
    await page.getByRole('tab').nth(1).click(); await ready(); await fits();
    await page.locator('.us-cco__panel').first().locator('iframe').evaluate(n => n.contentDocument.getElementById('long-content').style.height = '2300px');
    await page.getByRole('tab').first().click(); await fits();
    await page.waitForFunction(() => document.querySelector('.us-cco__panel iframe').clientHeight > 2400);
    assert.equal(await frame().evaluate(n => n.contentDocument.getElementById('search').value), 'retained sizing state');
    assert.equal(service.requests.filter(r => r.pathname.endsWith('ContentPreview.aspx')).length, requests);
    // Reflow at mobile width also changes content height.
    await edit("document.getElementById('long-content').style.height=''");
    await page.setViewportSize({ width:390, height:844 }); await fits();
    assert.ok(await frame().evaluate(n => n.clientHeight) > stableHeight + 250);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path:path.resolve(__dirname, '../references/test-output/frame-size-mobile.png'), fullPage:true });

    // Full child navigation installs fresh observers; replacing body covers DOM updates.
    await frame().evaluate(n => n.contentWindow.location.reload()); await ready(); await fits();
    await edit("document.body.innerHTML='<div style=\"height:1900px\">Updated results</div><p id=\"end-marker\">New end</p>'");
    await fits();
    // Host partial replacement must release observers along with the old frames.
    await page.locator('[data-us-cco]').evaluate(n => { window.oldFrame = n.querySelector('iframe'); n.outerHTML = n.outerHTML.replace(/>[\s\S]*$/, '></div>'); });
    await ready(); await fits();
    assert.equal(await page.evaluate(() => window.oldFrame.isConnected), false);
    service.options.config = { orientation:'horizontal' };
    await page.reload(); await ready(); await fits();
    assert.equal(await page.locator('.tabs-horizontal').count(), 1);
    await page.evaluate(() => window.UnionSuiteCCO.dispose());
    assert.equal(await page.locator('iframe').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS content-height growth/shrink, root minimums, floats, page scrolling, wrappers, preloads, retained state, mobile reflow, child reload, partial replacement, horizontal layout and disposal.');
  } finally { await browser.close(); await new Promise(resolve => service.server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
