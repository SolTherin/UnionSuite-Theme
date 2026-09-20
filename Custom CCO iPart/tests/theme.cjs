const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require(path.resolve(__dirname, '../../.tmp-iqa-integration/node_modules/playwright'));
const {startServer} = require('../tools/preview.cjs');
(async()=>{
 const service=await startServer(); const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(service.url);await page.addScriptTag({url:service.url+'/theme.js'});await page.waitForFunction(()=>window.UnionSuiteCCO?.diagnostics()[0]?.frames[0]?.state==='ready');
  const tabs=page.locator('[data-us-cco] [role=tab]');
  assert.equal(await page.locator('[role=tablist]').getAttribute('aria-orientation'),'vertical');
  const measure=await page.evaluate(()=>{
   const root=document.querySelector('[data-us-cco]');
   const layout=root.querySelector('.tabs-wrapper');
   const reference=layout.cloneNode(true);reference.id='native-reference';reference.querySelectorAll('iframe').forEach(n=>n.remove());
   reference.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id')); reference.querySelectorAll('[class]').forEach(n=>n.className=n.className.split(' ').filter(c=>!c.startsWith('us-cco')).join(' '));
   document.body.append(reference);
   const props=['backgroundImage','backgroundColor','borderLeftColor','boxShadow','padding','font','borderRadius'];
   const styles=el=>Object.fromEntries(props.map(p=>[p,getComputedStyle(el)[p]]));
   const result={actual:styles(root.querySelector('.rtsSelected')),native:styles(reference.querySelector('.rtsSelected')),width:root.querySelector('.RadTabStripVertical').getBoundingClientRect().width,padding:getComputedStyle(root.querySelector('.RadMultiPage')).padding};
   reference.remove();return result;
  });
  assert.deepEqual(measure.actual,measure.native);assert.equal(measure.width,220);assert.equal(measure.padding,'18px 24px');
  await tabs.first().focus();await page.keyboard.press('ArrowDown');assert.equal(await tabs.nth(1).evaluate(n=>n===document.activeElement),true);
  assert.equal(await tabs.first().getAttribute('aria-selected'),'true');await page.keyboard.press('Enter');assert.equal(await tabs.nth(1).getAttribute('aria-selected'),'true');
  await tabs.first().click();await page.screenshot({path:'references/test-output/runtime-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>document.querySelector('[role=tablist]').getAttribute('aria-orientation')==='horizontal');
  await tabs.first().focus();await page.keyboard.press('ArrowRight');assert.equal(await tabs.nth(1).evaluate(n=>n===document.activeElement),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:'references/test-output/runtime-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  service.options.config={orientation:'horizontal'};await page.reload();await tabs.first().waitFor();
  assert.equal(await page.locator('.RadTabStrip + .RadMultiPage').count(),1);
  console.log('PASS native theme computed-style parity, 220px rail, native content padding, responsive orientation, manual keyboard activation, theme JS and horizontal settings.');
 }finally{await browser.close();await new Promise(r=>service.server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
