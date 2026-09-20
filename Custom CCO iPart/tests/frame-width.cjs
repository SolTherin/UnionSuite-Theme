const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../../.tmp-iqa-integration/node_modules/playwright');
const { startServer } = require('../tools/preview.cjs');
const { ids, childHtml } = require('./fixtures.cjs');

function responsiveChild(url) {
  const index = ids.pages.indexOf(url.searchParams.get('iUniformKey'));
  const shells = [
    ['<div class="EmptyMasterContentPanel"><div class="ContentPanel container">', '</div></div>'],
    ['<div id="doc2"><div class="container-fluid">', '</div></div>'],
    ['<div class="wrapper" style="width:1200px;min-width:960px"><div class="container">', '</div></div>']
  ];
  const [open, close] = shells[index < 0 ? 0 : index];
  return childHtml(url.searchParams.get('iUniformKey'), url.searchParams)
    .replace('<style>', '<link rel="stylesheet" href="/native-base.css"><style>')
    .replace('</head>', `<style>
      body{margin:8px;padding:24px}.wrapper{padding:0}
      .width-example{padding:12px;border:1px solid #b8cbd3;background:#eef6f9}
      .ContentItemContainer{min-width:0}.nested-container{width:88px;min-width:88px;max-width:88px;padding:0;margin:0}
      #native-grid{overflow:auto;max-width:100%}#native-grid table{width:840px;min-width:840px}
    </style></head>`)
    .replace('<body>', `<body><form id="child-form">${open}<div class="row"><div class="col-sm-6"><div class="ContentItemContainer"><div class=""><div class="panel width-example">`)
    .replace('</body>', `</div></div></div></div><div class="col-sm-6"><div class="ContentItemContainer"><div class="panel width-example"><h2>Responsive details</h2><p>The two columns stack when this tab gets narrower. Text wraps to the available space.</p><p id="long-word">${'Example'.repeat(24)}</p><div class="container nested-container" id="nested-container">Nested iPart container</div><button type="button" id="right-action">Update details</button><p id="right-status" role="status">Ready</p></div></div></div></div><p id="end-marker">End of tab content</p>${close}</form><script>document.getElementById('right-action').onclick=()=>document.getElementById('right-status').textContent='Updated';</script></body>`);
}

(async () => {
  const service = await startServer({ preload:'sequential-idle' });
  const browser = await chromium.launch({ channel:'msedge', headless:true });
  try {
    const context = await browser.newContext({ viewport:{ width:1280, height:900 } });
    const baseCss = fs.readFileSync(path.resolve(__dirname, '../../.preview/10-UltraWaveResponsive.css'), 'utf8');
    let childLoads = 0;
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== service.url) return route.abort();
      if (url.pathname === '/native-base.css') return route.fulfill({ contentType:'text/css', body:baseCss });
      if (url.pathname.endsWith('ContentPreview.aspx')) {
        childLoads++;
        return route.fulfill({ contentType:'text/html', body:responsiveChild(url) });
      }
      return route.continue();
    });
    // Prove that the native fixed-width shell overflows before the CCO adapter.
    const baseline = await context.newPage();
    await baseline.setViewportSize({ width:390, height:844 });
    await baseline.goto(`${service.url}/iMIS/ContentManagement/ContentPreview.aspx?iUniformKey=${ids.pages[1]}`);
    assert.ok(await baseline.evaluate(() => document.documentElement.scrollWidth > innerWidth + 100), 'fixture reproduces native shell overflow');
    await baseline.close();

    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const currentFrame = () => page.locator('.us-cco__panel:not([hidden]) iframe');
    const fits = () => page.waitForFunction(() => {
      const panel = document.querySelector('.us-cco__panel:not([hidden])'), frame = panel?.querySelector('iframe');
      if (panel?.getAttribute('aria-busy') !== 'false' || !frame?.contentDocument?.getElementById('end-marker')) return false;
      const doc = frame.contentDocument, child = frame.contentWindow;
      return doc.documentElement.scrollWidth <= child.innerWidth + 1 &&
        doc.documentElement.scrollHeight <= frame.clientHeight + 1 &&
        Math.abs(frame.getBoundingClientRect().width - panel.clientWidth) <= 1 &&
        doc.getElementById('end-marker').getBoundingClientRect().bottom <= frame.clientHeight;
    });
    const checkContent = async () => {
      const measurements = await currentFrame().evaluate(frame => {
        const doc = frame.contentDocument, child = frame.contentWindow;
        const columns = [...doc.querySelectorAll('.col-sm-6')].map(node => node.getBoundingClientRect().toJSON());
        return {
          innerWidth:child.innerWidth, columns,
          nested:doc.getElementById('nested-container').getBoundingClientRect().width,
          overflow:[doc.documentElement, doc.body, doc.getElementById('child-form')].map(n => child.getComputedStyle(n).overflowX),
          content:[...doc.querySelectorAll('.width-example, #right-action, #end-marker')].map(n => n.getBoundingClientRect().toJSON())
        };
      });
      assert.equal(measurements.nested, 88, 'nested iPart container keeps its own sizing');
      assert.ok(measurements.overflow.every(v => !['hidden', 'clip'].includes(v)), 'content fits without hiding overflow');
      assert.ok(measurements.content.every(r => r.left >= 0 && r.right <= measurements.innerWidth + 1), 'both columns and controls remain within viewport');
      const [first, second] = measurements.columns;
      if (measurements.innerWidth < 768) assert.ok(second.top >= first.bottom - 1, 'native columns stack below their breakpoint');
      else assert.equal(second.top, first.top, 'native columns use their horizontal layout at wide sizes');
    };

    await page.goto(service.url); await fits();
    await currentFrame().contentFrame().locator('#search').fill('retained width state');
    await page.waitForFunction(() => window.UnionSuiteCCO.diagnostics()[0].frames.every(f => f.state === 'ready') && window.UnionSuiteCCO.diagnostics()[0].frames.length === 3);
    const requests = childLoads;
    for (const width of [1280, 900, 390, 1480]) {
      await page.setViewportSize({ width, height:900 });
      for (let index = 0; index < 3; index++) {
        await page.getByRole('tab').nth(index).click(); await fits(); await checkContent();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'parent also fits');
      }
      await currentFrame().contentFrame().getByRole('button', { name:'Update details' }).click();
      assert.equal(await currentFrame().contentFrame().locator('#right-status').textContent(), 'Updated');
      if (width === 1280 || width === 390) await page.screenshot({ path:path.resolve(__dirname, `../references/test-output/frame-width-${width === 1280 ? 'desktop' : 'mobile'}.png`), fullPage:true });
    }
    await page.getByRole('tab').first().click(); await fits();
    assert.equal(await currentFrame().contentFrame().locator('#search').inputValue(), 'retained width state');
    assert.equal(childLoads, requests, 'resizing and tab switching do not reload retained pages');
    // A component may itself share a page-shell class. It must stay excluded,
    // not just its descendants (for example a popup with class="container").
    assert.deepEqual(await currentFrame().evaluate(frame => {
      const doc = frame.contentDocument;
      return ['ContentItemContainer', 'iMIS-WebPart', 'RadGrid', 'RadWindow'].map(name => {
        const node = doc.createElement('div');
        node.className = `${name} container`;
        node.style.cssText = 'width:88px;min-width:88px;max-width:88px;padding:0';
        node.textContent = 'Nested component';
        doc.getElementById('child-form').append(node);
        return node.getBoundingClientRect().width;
      });
    }), [88, 88, 88, 88], 'component roots keep their sizing even with a shared shell class');
    // A partial child update remains responsive, while a grid keeps its deliberate scroll region.
    await currentFrame().evaluate(frame => {
      const panel = frame.contentDocument.querySelector('.width-example');
      panel.insertAdjacentHTML('beforeend', '<div class="RadGrid" id="native-grid"><table><tr><td>Native wide grid</td></tr></table></div>');
    });
    await page.setViewportSize({ width:390, height:844 }); await fits(); await checkContent();
    assert.ok(await currentFrame().evaluate(frame => {
      const grid = frame.contentDocument.getElementById('native-grid');
      return grid.scrollWidth > grid.clientWidth && grid.querySelector('table').getBoundingClientRect().width === 840;
    }), 'a native grid retains its internal sizing without widening the page');
    await page.getByRole('button', { name:'refresh tab', exact:true }).click(); await fits(); await checkContent();
    for (const wrapper of ['wrapped', 'empty', 'none']) {
      await page.goto(`${service.url}/?wrapper=${wrapper}`); await fits(); await checkContent();
    }
    service.options.config = { orientation:'horizontal' };
    await page.reload(); await fits(); await checkContent();
    await page.setViewportSize({ width:1280, height:900 }); await fits(); await checkContent();
    assert.deepEqual(errors, []);
    console.log('PASS reproduced native overflow; all three tab shells fit desktop/mobile and grow/shrink, with native columns, gutters, nested iParts, retained inputs, updates, refresh, wrappers and both tab layouts.');
  } finally { await browser.close(); await new Promise(resolve => service.server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
