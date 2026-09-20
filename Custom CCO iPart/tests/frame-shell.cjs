const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../../.tmp-iqa-integration/node_modules/playwright');
const { startServer } = require('../tools/preview.cjs');

(async () => {
  const service = await startServer({ preload:'sequential-idle' });
  const browser = await chromium.launch({ channel:'msedge', headless:true });
  try {
    const page = await browser.newPage({ viewport:{ width:1280, height:900 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/native-base.css', route => route.fulfill({ contentType:'text/css', body:fs.readFileSync(path.resolve(__dirname, '../../.preview/10-UltraWaveResponsive.css'), 'utf8') }));
    await page.route('**/ContentPreview.aspx?*', async route => {
      const response = await route.fetch();
      const body = (await response.text())
        .replace('<style>', '<link rel="stylesheet" href="/native-base.css"><style>')
        .replace('</head>', `<style>
          body{padding:0;max-height:100vh;overflow:hidden}
          #MainPanel,#MainPanel > .EmptyMasterContentPanel{height:calc(100vh - 60px);max-height:calc(100vh - 60px);overflow:auto}
          .ContentPanel{padding:16px}#long-content{height:1100px;background:#eef6f9;padding:16px}
          #native-widget{height:96px;max-height:96px;overflow:auto;padding:0}
        </style></head>`)
        .replace('<body>', '<body><form id="child-form"><div id="MainPanel"><div class="EmptyMasterContentPanel"><div class="ContentPanel">')
        .replace('</body>', `<div id="long-content">Content below the membership summary</div><div class="ContentItemContainer"><div class="panel"><div class="container EmptyMasterContentPanel" id="native-widget"><div style="height:240px">A native widget retains its own scroll region</div></div></div></div><p id="end-marker">End of the complete child page</p></div></div></div></form><script>
          // Model a popup template's resize callback: the child reserves space
          // from its viewport while the parent tries to size to the child.
          // This is a synthetic callback, not captured native JavaScript.
          let resizeTimer;
          function popupLayout(){
            document.querySelectorAll('#MainPanel,#MainPanel > .EmptyMasterContentPanel').forEach(node=>{
              node.style.height = Math.max(0,innerHeight-60)+'px';
              node.style.maxHeight = Math.max(0,innerHeight-60)+'px';
            });
          }
          addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(popupLayout,60)});
          popupLayout();
        </script></body>`);
      await route.fulfill({ response, body });
    });
    const frame = () => page.locator('.us-cco__panel:not([hidden]) iframe');
    const ready = () => page.waitForFunction(() => document.querySelector('.us-cco__panel:not([hidden])')?.getAttribute('aria-busy') === 'false');
    const snapshot = () => frame().evaluate(node => {
      const doc = node.contentDocument, child = node.contentWindow;
      return {
        height:node.clientHeight,
        end:doc.getElementById('end-marker').getBoundingClientRect().bottom,
        rootScroll:doc.documentElement.scrollHeight,
        shellOverflow:[...doc.querySelectorAll('#MainPanel,#MainPanel > .EmptyMasterContentPanel,.ContentPanel')].map(n => n.scrollHeight - n.clientHeight),
        widgetHeight:doc.getElementById('native-widget').clientHeight,
        widgetScroll:doc.getElementById('native-widget').scrollHeight,
        horizontal:doc.documentElement.scrollWidth - child.innerWidth
      };
    });
    const fits = async () => {
      await ready();
      const result = await snapshot();
      assert.ok(result.height > 1400, `Full content must determine height, not popup viewport: ${JSON.stringify(result)}`);
      assert.ok(result.end <= result.height + 1 && result.rootScroll <= result.height + 1, 'last content is inside the frame');
      assert.ok(result.shellOverflow.every(n => n <= 1), 'outer shells do not scroll or clip content');
      assert.equal(result.widgetHeight, 96); assert.ok(result.widgetScroll > 200, 'nested widget sizing survives');
      assert.ok(result.horizontal <= 1, 'child width still fits');
    };
    await page.goto(service.url);
    await ready();
    await fits();
    const height = (await snapshot()).height;
    const samples = [];
    for (let i = 0; i < 16; i++) { await page.waitForTimeout(100); samples.push((await snapshot()).height); }
    assert.ok(samples.every(n => n === height), `No progressive shrink/resize cycle: ${samples.join(',')}`);
    await page.screenshot({ path:path.resolve(__dirname, '../references/test-output/frame-shell-desktop.png'), fullPage:true });
    await frame().evaluate(n => n.contentDocument.getElementById('search').value = 'retained through popup sizing');
    for (const index of [1, 2, 0]) { await page.getByRole('tab').nth(index).click(); await fits(); }
    assert.equal(await frame().evaluate(n => n.contentDocument.getElementById('search').value), 'retained through popup sizing');
    await page.setViewportSize({ width:390, height:844 }); await fits();
    await page.screenshot({ path:path.resolve(__dirname, '../references/test-output/frame-shell-mobile.png'), fullPage:true });
    // Partial replacement introduces new inline popup dimensions after load.
    await frame().evaluate(n => {
      const panel = n.contentDocument.querySelector('.EmptyMasterContentPanel');
      panel.outerHTML = panel.outerHTML.replace(/height: [\d.]+px/g, 'height: 250px');
    });
    await fits();
    await page.getByRole('button', { name:'refresh tab', exact:true }).click(); await fits();
    const before = (await snapshot()).height;
    await frame().evaluate(n => n.contentDocument.getElementById('long-content').style.height = '100px');
    await page.waitForFunction(before => document.querySelector('.us-cco__panel:not([hidden]) iframe').clientHeight < before - 800, before);
    const shrunk = await snapshot();
    assert.ok(shrunk.end <= shrunk.height + 1, 'real content removal can still shrink the frame');
    await page.evaluate(() => window.UnionSuiteCCO.dispose());
    assert.equal(await page.locator('iframe').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS popup-shell feedback regression: stable natural height, no nested page scroll, retained tabs, mobile, partial replacement, refresh, real content shrink and cleanup.');
  } finally { await browser.close(); await new Promise(resolve => service.server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
