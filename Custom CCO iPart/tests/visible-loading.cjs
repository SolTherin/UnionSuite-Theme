// Hidden preloads must receive a first visible sizing pass before they are painted.
const assert = require('node:assert/strict');
const {chromium} = require('../../.tmp-iqa-integration/node_modules/playwright');
const {startServer} = require('../tools/preview.cjs');
const {ids} = require('./fixtures.cjs');
(async () => {
  const service = await startServer({preload:'sequential-idle', config:{orientation:'horizontal'}});
  const browser = await chromium.launch({channel:'msedge', headless:true});
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/ContentPreview.aspx?*', async route => {
      const response = await route.fetch();
      const body = (await response.text()).replace('</body>', `<script>
        window.visibleResizes=0;
        addEventListener('resize',()=>{if(frameElement.getBoundingClientRect().width){
          window.visibleResizes++;
          setTimeout(()=>document.body.dataset.layout='sized',500);
        }});
      </script></body>`);
      await route.fulfill({response,body});
    });
    const tabs = page.getByRole('tab');
    const panel = index => page.locator('.us-cco__panel').nth(index);
    const ready = index => page.waitForFunction(index => {
      const panel = document.querySelectorAll('.us-cco__panel')[index];
      return panel?.getAttribute('aria-busy') === 'false' && panel.querySelector('iframe')?.style.visibility !== 'hidden';
    }, index);
    await page.goto(service.url);
    await ready(0);
    await page.waitForFunction(()=>window.UnionSuiteCCO.diagnostics()[0].frames.length===3 && window.UnionSuiteCCO.diagnostics()[0].frames.every(f=>f.state==='ready'));
    const requests = service.requests.filter(r=>r.pathname.endsWith('ContentPreview.aspx')).length;
    assert.equal(await panel(1).locator('iframe').evaluate(n=>n.style.visibility),'hidden');
    // Wait longer than the former document-load timer before the first selection.
    await page.waitForTimeout(1400);
    await tabs.nth(1).click();
    assert.equal(await panel(1).getAttribute('aria-busy'),'true');
    assert.equal(await panel(1).locator('iframe').evaluate(n=>n.style.visibility),'hidden');
    assert.equal(await panel(1).locator('.us-cco__loader').isVisible(),true);
    await tabs.nth(1).locator('[data-us-cco-spinner]').waitFor();
    assert.equal(await panel(1).locator('.us-cco__loader').evaluate(n=>getComputedStyle(n).animationName),'section-circles-forward');
    await ready(1);
    assert.equal(await panel(1).locator('iframe').evaluate(n=>n.contentDocument.body.dataset.layout),'sized');
    await tabs.nth(0).click(); await tabs.nth(1).click();
    assert.equal(await panel(1).getAttribute('aria-busy'),'false','previously presented tabs stay immediate');
    assert.equal(service.requests.filter(r=>r.pathname.endsWith('ContentPreview.aspx')).length,requests,'no reload on reveal');
    // Interrupt the first presentation and allow more than its timer to elapse.
    await tabs.nth(2).click(); await page.waitForTimeout(200); await tabs.nth(0).click();
    await page.waitForTimeout(1400); await tabs.nth(2).click();
    assert.equal(await panel(2).getAttribute('aria-busy'),'true');
    await ready(2);
    // The whole CCO can also finish loading behind the outer Tasks section.
    await page.addInitScript(()=>new MutationObserver(()=>{
      const mount=document.querySelector('[data-us-cco]');
      if(mount&&!mount.dataset.testHidden){mount.dataset.testHidden='true';mount.parentElement.style.display='none';}
    }).observe(document,{childList:true,subtree:true}));
    await page.goto(service.url);
    await page.waitForFunction(()=>window.UnionSuiteCCO?.diagnostics()[0]?.frames.length===3 && window.UnionSuiteCCO.diagnostics()[0].frames.every(f=>f.state==='ready'));
    await page.waitForTimeout(1400);
    await page.locator('[data-us-cco]').evaluate(n=>n.parentElement.style.display='');
    await page.waitForFunction(()=>document.querySelector('.us-cco__panel').getAttribute('aria-busy')==='true');
    assert.equal(await panel(0).locator('iframe').evaluate(n=>n.style.visibility),'hidden');
    await ready(0);
    await tabs.nth(1).click();
    await page.evaluate(()=>window.UnionSuiteCCO.dispose());
    await page.waitForTimeout(1400);
    assert.equal(await page.locator('.us-cco__frame,[data-us-cco-spinner]').count(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS delayed preload selection, first visible resize/spinner, warm retention, interrupted reveal, hidden outer section and disposal.');
  } finally { await browser.close(); await new Promise(resolve=>service.server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1;});

