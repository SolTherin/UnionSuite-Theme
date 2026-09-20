const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('../.tmp-iqa-integration/node_modules/playwright');
const source = fs.readFileSync('prototypes/CCO-Retained-Tabs-Trial.js','utf8');
const names = ['People search','Overview','About','Finance','Notes and Interactions','Worksite Search'];
const shell = '<div id="ste_container_ciDirectory"><div class="panel"><div class="cco tabs-wrapper tabs-horizontal"><div class="RadTabStrip"><div class="rtsLevel"><ul class="rtsUL">' + names.map((n,i)=>'<li class="rtsLI"><a href="#" class="rtsLink '+(!i?'rtsSelected':'')+'"><span class="rtsTxt">'+n+'</span></a></li>').join('')+'</ul></div></div><div class="RadMultiPage">Original content</div></div></div></div>';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage(); const requested=[];
  await page.route('**/*', route=>{
   const u=new URL(route.request().url());
   if(u.searchParams.has('TemplateType')) {
    requested.push(u);
    return route.fulfill({contentType:'text/html',body:'<p>Individual content page</p><script>window.ShowDialog_NoReturnValue=function(){}; window.openTest=function(){ShowDialog_NoReturnValue("/test",null,"90%","90%","Example",null,null,null,null,false,false,function(){document.body.dataset.refreshed="yes"},null)}</script>'});
   }
   return route.fulfill({contentType:'text/html',body:shell+'<script>window.calls=0; window.ShowDialog_NoReturnValue=function(...args){window.calls++;args[11]()}</script>'});
  });
  await page.goto('https://fixture.test/CCO-Testing.aspx?ID=123&tag=a&tag=b');
  await page.addScriptTag({content:source});
  const tab=page.locator('#ste_container_ciDirectory > .panel > .cco > .RadTabStrip .rtsLink');
  await tab.nth(2).click();
  const frame=page.frameLocator('#us-cco-retained-frame-2');
  await page.waitForFunction(()=>window.usCcoTrial.entries.get(2)?.bridge);
  assert.equal(await frame.locator('#ste_container_ciDirectory').count(),0);
  assert.equal(new URL(await page.locator('#us-cco-retained-frame-2').getAttribute('src')).searchParams.get('iUniformKey'),'91e8d33b-da44-43eb-8374-0331e97157ab');
  await frame.locator('body').evaluate(()=>window.openTest());
  assert.equal(await page.evaluate(()=>window.calls),1);
  assert.equal(await frame.locator('body').getAttribute('data-refreshed'),'yes');
  await tab.nth(0).click(); await tab.nth(2).click();
  assert.equal(await frame.locator('body').getAttribute('data-refreshed'),'yes');
  await tab.nth(2).press('End');
  await page.waitForFunction(()=>window.usCcoTrial.entries.size===5 && [...window.usCcoTrial.entries.values()].every(e=>e.state==='loaded'));
  assert.equal(await tab.nth(5).getAttribute('aria-selected'),'true');
  assert.equal(requested.length,5);
  for(const u of requested){assert.equal(u.searchParams.get('ID'),'123');assert.deepEqual(u.searchParams.getAll('tag'),['a','b']);assert.equal(u.searchParams.has('Directory'),false);assert.equal(u.pathname,'/iMIS/ContentManagement/ContentPreview.aspx');}
  assert.equal(new URL(page.url()).searchParams.get('Directory'),null);
  console.log('PASS: six tabs, retained state, parent popup with child callback, context parameters, keyboard End, no outer navigation.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
