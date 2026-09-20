const assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const html=require('./iqa-expand-example.cjs').documentHtml();
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:650}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));await page.route('**/*',route=>route.abort());
  const reset=async()=>{await page.goto('about:blank');await page.setContent(html);await page.locator('[data-us-iqa-column-table]').waitFor();await page.evaluate(()=>IqaExpandDemo.delay=60000)};
  const end=async()=>{await page.evaluate(()=>IqaExpandDemo.end());assert.equal(await page.locator('.us-iqa-find-overlay,[data-us-iqa-progress-replaced],[aria-busy="true"]').count(),0)};
  const click=()=>page.locator('#visit-one-GECBtnExpandColumn').click();
  const bounds=async()=>{
   await page.waitForFunction(()=>{
    const overlay=document.querySelector('.us-iqa-row-overlay'),row=document.getElementById('visit-one-row');
    if(!overlay||overlay.hidden)return false;
    const a=overlay.getBoundingClientRect(),b=row.getBoundingClientRect();
    return ['left','top','width','height'].every(key=>Math.abs(a[key]-b[key])<1);
   });
  };
  await reset();
  await page.evaluate(()=>{window.nativeControl=document.getElementById('visit-one-GECBtnExpandColumn');window.nativeClicks=0;nativeControl.addEventListener('click',()=>window.nativeClicks++);const second=document.createElement('div');second.id='other_UpdateProgress1';second.textContent='Other report loading';document.body.append(second)});
  await click();await bounds();
  assert.equal(await page.locator('.us-iqa-find-overlay').count(),1);
  assert.equal(await page.locator('#visit-one-row').getAttribute('aria-busy'),'true');
  assert.equal(await page.locator('tbody[aria-busy],#visit-two-row[aria-busy],#visit-three-row[aria-busy]').count(),0);
  assert.equal(await page.locator('#expand-example_UpdateProgress1').evaluate(el=>getComputedStyle(el).display),'none');
  assert.equal(await page.locator('#other_UpdateProgress1').getAttribute('data-us-iqa-progress-replaced'),null);
  assert.equal(await page.locator('.us-iqa-refresh-status').textContent(),'Loading row details');
  assert.equal(await page.evaluate(()=>nativeClicks===1&&nativeControl===document.getElementById('visit-one-GECBtnExpandColumn')&&!nativeControl.disabled),true);
  assert.equal(await page.locator('.us-iqa-column-resizer').count(),3);
  await page.screenshot({path:'.tmp-iqa-integration/iqa-row-loading.png'});await end();
  // Keyboard expand/collapse use the same accepted native lifecycle.
  await page.evaluate(()=>IqaExpandDemo.delay=100);
  await page.locator('#visit-one-GECBtnExpandColumn').press('Enter');await page.locator('#visit-one-detail').waitFor({state:'visible'});
  await page.evaluate(()=>IqaExpandDemo.delay=60000);await click();await bounds();assert.equal(await page.locator('#visit-one-detail').isVisible(),true);await end();
  // Cancellation and unrelated grid requests never inherit a row indicator.
  await page.evaluate(()=>IqaExpandDemo.cancelled=true);await click();assert.equal(await page.locator('.us-iqa-find-overlay').count(),0);
  await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));
  await page.evaluate(()=>IqaExpandDemo.begin(document.getElementById('expand-example_ResultsGrid')));assert.equal(await page.locator('.us-iqa-find-overlay').count(),0);await end();
  await page.evaluate(()=>{IqaExpandDemo.cancelled=false;IqaExpandDemo.source=document.getElementById('expand-example_ResultsGrid')});await click();await bounds();await end();
  await page.evaluate(()=>{const grid=document.createElement('div');grid.dataset.gridid='other';grid.id='other-grid';document.body.append(grid);IqaExpandDemo.source=grid});await click();assert.equal(await page.locator('.us-iqa-find-overlay').count(),0);await end();
  // Replaced rows are reconciled by ID; removed rows leave no stale visual.
  await page.evaluate(()=>{IqaExpandDemo.source=null;document.getElementById('visit-one-row').setAttribute('aria-busy','false')});await click();
  await page.evaluate(()=>{window.oldRow=document.getElementById('visit-one-row');const row=oldRow.cloneNode(true);row.removeAttribute('aria-busy');oldRow.replaceWith(row)});
  await page.waitForFunction(()=>oldRow.getAttribute('aria-busy')==='false'&&document.getElementById('visit-one-row').getAttribute('aria-busy')==='true');await bounds();
  await page.evaluate(()=>document.getElementById('visit-one-row').remove());await page.locator('.us-iqa-row-overlay').waitFor({state:'hidden'});
  assert.equal(await page.locator('#expand-example_UpdateProgress1').evaluate(el=>getComputedStyle(el).display),'none');await end();
  // Clip inside scrolling containers; don't fall back to report-wide loading offscreen.
  await reset();await click();
  await page.evaluate(()=>{const root=document.getElementById('expand-example_ResultsGrid');root.style.cssText='height:100px;overflow:auto';document.querySelector('#expand-example-table').style.width='1400px';root.scrollTop=80;root.scrollLeft=150});
  await page.waitForFunction(()=>{const o=document.querySelector('.us-iqa-row-overlay'),root=document.getElementById('expand-example_ResultsGrid');return o.hidden||o.getBoundingClientRect().top>=root.getBoundingClientRect().top});
  await page.evaluate(()=>{document.body.style.paddingTop='1000px'});await page.locator('.us-iqa-row-overlay').waitFor({state:'hidden'});
  assert.equal(await page.locator('#expand-example_UpdateProgress1').evaluate(el=>getComputedStyle(el).display),'none');await end();
  // Failure/endRequest and page navigation restore existing accessibility state.
  await reset();await page.evaluate(()=>document.getElementById('visit-one-row').setAttribute('aria-busy','false'));await click();
  await page.evaluate(()=>IqaExpandDemo.end(new Error('Simulated failed request')));
  assert.equal(await page.locator('#visit-one-row').getAttribute('aria-busy'),'false');assert.equal(await page.locator('.us-iqa-find-overlay').count(),0);
  for(const type of ['pagehide','pageshow']){await click();await page.evaluate(type=>window.dispatchEvent(new Event(type)),type);assert.equal(await page.locator('.us-iqa-find-overlay,[data-us-iqa-progress-replaced]').count(),0);await end()}
  // Opt-out retains native loading, and reduced motion retains a static spinner.
  await page.evaluate(()=>document.querySelector('.us-report').classList.add('us-report-no-styling'));await click();assert.equal(await page.locator('.us-iqa-find-overlay').count(),0);assert.equal(await page.locator('#expand-example_UpdateProgress1').evaluate(el=>getComputedStyle(el).display),'block');assert.equal(await page.locator('#expand-example_UpdateProgress1').getAttribute('data-us-iqa-progress-replaced'),null);await end();
  await page.evaluate(()=>document.querySelector('.us-report').classList.remove('us-report-no-styling'));await page.emulateMedia({reducedMotion:'reduce'});await click();
  assert.equal(await page.locator('.us-iqa-row-overlay').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.us-iqa-row-overlay').getBoundingClientRect().right<=innerWidth);await end();
  assert.deepEqual(errors,[]);
  console.log('Passed: row-only bounds/fade, expand/collapse/keyboard, native indicator ownership, accepted-request routing, cancellation, partial replacement/removal, clipping, failure/navigation cleanup, ARIA restoration, opt-out and reduced motion.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
