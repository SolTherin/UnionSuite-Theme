const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('../../.tmp-iqa-integration/node_modules/playwright');
const { startServer } = require('../tools/preview.cjs');
const { ids, pages } = require('./fixtures.cjs');

(async () => {
  const service = await startServer();
  service.options.folderResponse = {IsSuccessStatusCode:true,Result:{$values:pages.map((p,i)=>({...p,AlternateName:['Overview','Notes and Interactions','Finance'][i]}))}};
  const browser = await chromium.launch({ channel:'msedge', headless:true });
  const ready = page => page.waitForFunction(() => { const frames=window.UnionSuiteCCO?.diagnostics()[0]?.frames; return frames?.length && frames.every(f => f.state==='ready'); });
  try {
    for (const [orientation, touch] of [['vertical',false],['horizontal',false],['vertical',true]]) {
      service.options.config = { orientation };
      const context = await browser.newContext({viewport:{width:touch?390:1280,height:900},hasTouch:touch,isMobile:touch});
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => { window.gIsEasyEditEnabled=true; window.ShowDialog_NoReturnValue=(url)=>{window.editedPage=url;}; });
      await page.goto(service.url); await ready(page);
      await page.evaluate(() => { window.ShowDialog_NoReturnValue=(url)=>{window.editedPage=url;}; });
      await page.addScriptTag({url:`${service.url}/theme.js`});
      const tab = page.getByRole('tab').nth(1);
      const labelBefore = await tab.locator('.rtsTxt').boundingBox();
      let release;
      const held = new Promise(resolve => { release=resolve; });
      const intercept = async route => { await held; await route.continue(); };
      await page.route(`**/ContentPreview.aspx?*iUniformKey=${ids.pages[1]}*`, intercept);
      try {
        await tab.click();
        await tab.locator('[data-us-cco-spinner]').waitFor({state:'visible'});
        const measure = await tab.evaluate(tab => {
          const spinner=tab.querySelector('[data-us-cco-spinner]'), edit=tab.parentElement.querySelector('.us-cco__edit');
          const s=spinner.getBoundingClientRect(), e=edit.getBoundingClientRect();
          const range=document.createRange();range.selectNodeContents(tab.querySelector('.rtsTxt'));
          const textRight=Math.max(...[...range.getClientRects()].map(r=>r.right));
          return {gap:e.left-s.right,textGap:s.left-textRight,targetWidth:e.width,hit:edit.contains(document.elementFromPoint(e.x+e.width/2,e.y+e.height/2))};
        });
        assert.ok(measure.gap>=1,`${orientation}/${touch}: spinner overlaps edit target: ${JSON.stringify(measure)}`);
        assert.ok(measure.textGap>=2,`${orientation}/${touch}: spinner overlaps caption: ${JSON.stringify(measure)}`);
        assert.equal(measure.targetWidth,touch?44:36); assert.equal(measure.hit,true);
        const labelBusy=await tab.locator('.rtsTxt').boundingBox();
        assert.equal(labelBusy.width,labelBefore.width,'loading does not resize the caption');
        assert.equal(labelBusy.height,labelBefore.height,'loading does not rewrap the caption');
        await page.screenshot({path:path.resolve(__dirname,`../references/test-output/tab-actions-${touch?'touch':orientation}.png`),fullPage:true});
        await tab.locator('..').getByRole('button',{name:/^Edit /}).click();
        assert.equal(new URL(await page.evaluate(()=>window.editedPage)).searchParams.get('iUniformKey'),ids.pages[1]);
        await page.evaluate(()=>{window.gIsEasyEditEnabled=false;window.UnionSuiteCCO.scan();});
        assert.equal(await page.locator('.us-cco__edit:visible').count(),0);
        const plain = await tab.evaluate(n=>{const s=n.querySelector('[data-us-cco-spinner]').getBoundingClientRect();const t=n.getBoundingClientRect();return {left:s.left,right:s.right,tabLeft:t.left,tabRight:t.right};});
        assert.ok(plain.left>=plain.tabLeft&&plain.right<=plain.tabRight,'Easy Edit off restores a contained native spinner');
      } finally {release();await page.unrouteAll({behavior:'wait'});}
      await ready(page);
      assert.equal(await tab.locator('[data-us-cco-spinner]').count(),0);
      assert.deepEqual(errors,[]);
      await context.close();
      console.log(`PASS tab actions: ${orientation}, ${touch?'touch':'desktop'}; separate spinner/caption/edit hit target, stable label, editor click while loading, Easy Edit off and ready cleanup.`);
    }
  } finally {await browser.close();await new Promise(resolve=>service.server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
