const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../../.tmp-iqa-integration/node_modules/playwright');
const { startServer } = require('../tools/preview.cjs');
const { ids } = require('./fixtures.cjs');

// Synthetic content, with the outer ContentWizardDisplay > div > row and
// nested panel/field rows taken from the supplied native CCO DOM structure.
function childPage(index) {
  const roots = ['ContentWizardDisplay ClearFix', 'ContentPanel', 'EmptyMasterContentPanel'];
  const panel = (label, content) => `<div class="panel"><div class="panel-heading"><h2 class="panel-title">${label}</h2></div><div class="panel-body-container"><div class="panel-body">${content}</div></div></div>`;
  const fieldRow = '<div class="FullWidth PanelEditorReadOnlyForm"><div><div class="row nested-row"><div class="BreakWord col-md-6">Membership type</div><div class="BreakWord col-md-6">Community</div></div></div></div>';
  const wrapped = index === 1 ? '<div class="author-class">' : index === 2 ? '<div class="">' : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Outer gutter fixture</title>
    <link rel="stylesheet" href="/native.css"><link rel="stylesheet" href="/orion.css"><link rel="stylesheet" href="/theme.css">
    <style>body{margin:0;padding:0;font:14px/1.5 system-ui}.panel-title{font-size:16px}.fixture-gap{margin-block:24px}.fixture-tall{height:620px}#nested-grid table{min-width:900px}#nested-grid td{padding:8px}button,input{max-width:100%}#balanced{width:auto}</style>
    </head><body><form><div id="MainPanel"><div class="EmptyMasterContentPanel" style="height:420px"><div class="${roots[index]}"><div id="layout-root"><div class="row" id="outer-row">
    <div class="col-sm-8"><div class="iMIS-WebPart"><div class="ContentItemContainer">${wrapped}${panel('Membership summary', `<label>Search this page <input id="search" type="search"></label><div class="fixture-gap">${fieldRow}</div><div class="fixture-tall">Content remains in the main page flow.</div><p id="left-end">End of membership summary</p>`)}${wrapped ? '</div>' : ''}</div></div></div>
    <div class="col-sm-4"><div class="ContentItemContainer">${panel('Contact details', `<p>Responsive right column</p><button type="button" id="right-action">Update details</button><p id="right-status">Ready</p><div class="ContentWizardDisplay"><div><div class="row nested-layout-row"><div class="col-sm-12">Nested iPart layout</div></div></div></div><div class="RadGrid" id="nested-grid"><table><tr><td>A deliberately wide native report keeps its own scroll area</td></tr></table></div>`)}</div><div class="ContentItemContainer">No-styling content without a panel.</div></div>
    </div></div></div><div class="ContentPanel"><div class="container" id="balanced"><div class="row" id="balanced-row"><div class="col-sm-12">An ordinary padded container retains its balanced gutters.</div></div></div></div><p id="end-marker">End of the complete tab page</p></div></div></form>
    <script>document.getElementById('right-action').onclick=()=>document.getElementById('right-status').textContent='Updated';</script></body></html>`;
}

(async () => {
  const service = await startServer({ preload:'sequential-idle' });
  const browser = await chromium.launch({ channel:'msedge', headless:true });
  try {
    const context = await browser.newContext({ viewport:{ width:1280, height:900 } });
    const css = {
      '/native.css':fs.readFileSync(path.resolve(__dirname, '../../Native CSS/10-UltraWaveResponsive.css'), 'utf8'),
      '/orion.css':fs.readFileSync(path.resolve(__dirname, '../../THeme/UnionSuite/99-Orion.css'), 'utf8')
    };
    let loads = 0;
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== service.url || /\.(woff2?|ttf|png|svg|jpg)(\?|$)/i.test(url.pathname)) return route.abort();
      if (css[url.pathname]) return route.fulfill({ contentType:'text/css', body:css[url.pathname] });
      if (url.pathname.endsWith('ContentPreview.aspx')) {
        loads++;
        return route.fulfill({ contentType:'text/html', body:childPage(ids.pages.indexOf(url.searchParams.get('iUniformKey'))) });
      }
      return route.continue();
    });
    const baseline = await context.newPage();
    await baseline.setViewportSize({ width:984, height:900 });
    await baseline.goto(`${service.url}/iMIS/ContentManagement/ContentPreview.aspx?iUniformKey=${ids.pages[0]}`);
    const before = await baseline.evaluate(() => {
      const shell = document.querySelector('#MainPanel > .EmptyMasterContentPanel'), row = document.getElementById('outer-row');
      return { overflow:shell.scrollWidth - shell.clientWidth, margin:getComputedStyle(row).marginLeft, width:row.getBoundingClientRect().width };
    });
    assert.equal(before.margin, '-20px', 'full Orion cascade supplies a 40px gutter');
    assert.equal(before.overflow, 20, 'zero-padding popup shell reproduces the 20px outer-row overflow');
    assert.equal(before.width, 1024);
    await baseline.close();

    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const frame = () => page.locator('.us-cco__panel:not([hidden]) iframe');
    const ready = () => page.waitForFunction(() => document.querySelector('.us-cco__panel:not([hidden])')?.getAttribute('aria-busy') === 'false');
    const check = async () => {
      await ready();
      // ResizeObserver measures on the next animation frame after a viewport
      // change; a retained tab can already be marked ready during that reflow.
      await page.waitForFunction(() => {
        const node = document.querySelector('.us-cco__panel:not([hidden]) iframe');
        return node?.contentDocument?.getElementById('end-marker')?.getBoundingClientRect().bottom <= node.clientHeight + 1;
      });
      const result = await frame().evaluate(node => {
        const doc = node.contentDocument, child = node.contentWindow, style = n => child.getComputedStyle(n);
        return {
          width:child.innerWidth, scroll:doc.documentElement.scrollWidth, height:node.clientHeight,
          end:doc.getElementById('end-marker').getBoundingClientRect().bottom,
          outer:style(doc.getElementById('outer-row')).marginLeft,
          nested:[...doc.querySelectorAll('.nested-row,.nested-layout-row,#balanced-row')].map(n => style(n).marginLeft),
          columns:[...doc.querySelectorAll('#outer-row > div')].map(n => n.getBoundingClientRect().toJSON()),
          controls:[...doc.querySelectorAll('#search,#right-action,#left-end')].map(n => n.getBoundingClientRect().toJSON()),
          clipping:[doc.documentElement, doc.body, doc.querySelector('form'), doc.querySelector('#MainPanel > .EmptyMasterContentPanel')].map(n => style(n).overflowX),
          grid:{ width:doc.getElementById('nested-grid').clientWidth, scroll:doc.getElementById('nested-grid').scrollWidth }
        };
      });
      assert.ok(result.scroll <= result.width + 1, `whole child page must fit: ${JSON.stringify(result)}`);
      assert.equal(result.outer, '0px');
      assert.deepEqual(result.nested, ['-20px', '-20px', '-20px'], 'nested fields/iParts and balanced containers retain native gutters');
      assert.ok(result.controls.every(r => r.left >= 0 && r.right <= result.width + 1), 'content remains reachable on both edges');
      assert.ok(result.clipping.every(v => v === 'visible'), 'fit is not achieved by hiding overflow');
      assert.ok(result.grid.scroll > result.grid.width, 'wide native report keeps internal scrolling');
      assert.ok(result.end <= result.height + 1, 'complete page determines the frame height');
      if (result.width < 768) assert.ok(result.columns[1].top >= result.columns[0].bottom - 1, 'native columns stack');
      else assert.equal(result.columns[0].top, result.columns[1].top, 'native columns remain side by side');
      return result;
    };
    await page.goto(service.url); await check();
    await frame().contentFrame().locator('#search').fill('retained gutter check');
    await page.waitForFunction(() => window.UnionSuiteCCO.diagnostics()[0].frames.filter(f => f.state === 'ready').length === 3);
    const loaded = loads;
    for (const width of [1280, 900, 390, 1480]) {
      await page.setViewportSize({ width, height:900 });
      for (const index of [0, 1, 2]) {
        await page.getByRole('tab').nth(index).click(); await check();
      }
      if (width === 1280 || width === 390) await page.screenshot({ path:path.resolve(__dirname, `../references/test-output/frame-gutters-${width === 1280 ? 'desktop' : 'mobile'}.png`), fullPage:true });
    }
    await page.getByRole('tab').first().click(); await check();
    assert.equal(await frame().contentFrame().locator('#search').inputValue(), 'retained gutter check');
    assert.equal(loads, loaded, 'resizing/revealing retained tabs does not reload');
    await frame().evaluate(node => {
      const root = node.contentDocument.getElementById('layout-root');
      root.outerHTML = root.outerHTML;
    });
    await check();
    // Replacement above intentionally replaces native handlers; reloading must
    // restore them, and also reinstall the scoped gutter stylesheet.
    await page.getByRole('button', { name:'refresh tab', exact:true }).click(); await check();
    await frame().contentFrame().locator('#right-action').click();
    assert.equal(await frame().contentFrame().locator('#right-status').textContent(), 'Updated');
    const stable = (await check()).height;
    await page.waitForTimeout(500);
    assert.equal((await check()).height, stable, 'gutter correction does not introduce a size feedback loop');
    await page.evaluate(() => window.UnionSuiteCCO.dispose());
    assert.equal(await page.locator('iframe').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS actual native/Orion/shared CSS: reproduced 20px overflow; outer rows fit on all three tabs at 390/900/1280/1480px, with nested/balanced gutters, native grid scrolling, retained state, replacement, refresh and stable height.');
  } finally { await browser.close(); await new Promise(resolve => service.server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
