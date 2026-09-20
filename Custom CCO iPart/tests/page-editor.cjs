const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../../.tmp-iqa-integration/node_modules/playwright');
const { startServer } = require('../tools/preview.cjs');
const { ids, pages } = require('./fixtures.cjs');

// Model the deployed native contract supplied by the user: the public wrapper
// returns undefined, argument 8 registers beforeClose, and 12 registers close.
// The fixture never opens an actual editor or saves anything to iMIS.
const nativeDialog = `
window.gIsEasyEditEnabled = false;
window.gWebSiteRoot = location.origin + '/UTNewTheme/';
window.editorCalls = [];
window.ShowDialog = function(...args) {
  const dialog = { args, parentThis:this===window, before:args[7], closed:args[11] };
  window.editorCalls.push(dialog);
  return dialog;
};
window.ShowDialog_NoReturnValue = function(...args) { window.ShowDialog.apply(this,args); };
window.finishEditor = function(reason, cancelledBeforeClose=false, index=window.editorCalls.length-1) {
  const dialog = window.editorCalls[index];
  dialog.before?.(dialog,{reason});
  if (!cancelledBeforeClose) dialog.closed?.(dialog,{reason});
};
`;

(async () => {
  const service = await startServer({ popupBridge:false });
  service.options.folderResponse = { IsSuccessStatusCode:true, Result:{$values:pages.map((p,i) => ({...p, AlternateName:['Overview','About','Notes and Interactions'][i]}))} };
  const browser = await chromium.launch({ channel:'msedge', headless:true });
  const errors = [];
  async function setup(page) {
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/runtime.js', route => route.fulfill({contentType:'text/javascript',body:nativeDialog + fs.readFileSync(path.resolve(__dirname,'../dist/runtime.js'),'utf8')}));
    await page.route('**/ContentPreview.aspx?*', async route => {
      const response = await route.fetch(), index = ids.pages.indexOf(new URL(route.request().url()).searchParams.get('iUniformKey'));
      await route.fulfill({response,body:(await response.text()).replace(/<h2>[^<]+<\/h2>/, `<h2>${['Overview','About','Notes and Interactions'][index]}</h2>`)});
    });
  }
  const ready = (page, count=1) => page.waitForFunction(count => {
    const frames = window.UnionSuiteCCO?.diagnostics()[0]?.frames;
    return frames?.length === count && frames.every(f => f.state === 'ready');
  }, count);
  const enable = async page => {
    await page.evaluate(() => { window.gIsEasyEditEnabled = true; document.body.classList.add('TemplateAreaEasyEditOn'); });
    await page.locator('.us-cco__edit').first().waitFor({state:'visible'});
  };
  const edits = page => page.locator('.us-cco__edit');
  const requests = () => service.requests.filter(r => r.pathname.endsWith('ContentPreview.aspx'));
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900}});
    await setup(page);
    await page.goto(service.url); await ready(page);
    await page.addScriptTag({url:`${service.url}/theme.js`});
    assert.equal(await page.locator('.us-cco__edit[hidden]').count(),3,'Easy Edit off keeps the native tab appearance');
    await page.evaluate(() => document.querySelector('.us-cco__edit').click());
    assert.equal(await page.evaluate(() => window.editorCalls.length),0,'hidden action also checks native Easy Edit state');
    await enable(page);
    const about = page.getByRole('button',{name:'Edit About page',exact:true});
    assert.equal(await about.getAttribute('title'),'Edit About page');
    assert.equal(await about.getAttribute('aria-haspopup'),'dialog');
    assert.equal(await page.locator('[role=tab] button').count(),0,'edit actions are separate controls');
    await page.frameLocator('iframe').locator('#search').evaluate(n => n.type='search');
    await page.frameLocator('iframe').locator('#search').fill('retained search on another tab');
    const originalUrl = page.url(), originalFrame = await page.locator('iframe').evaluate(n => {n.dataset.retained='yes';return n.src;});
    await about.focus(); await page.keyboard.press('Enter');
    const launch = await page.evaluate(() => {
      const d = window.editorCalls[0];
      return {parentThis:d.parentThis,url:d.args[0],width:d.args[2],height:d.args[3],title:d.args[4],template:d.args[6],before:d.before,closeType:typeof d.closed,args:d.args.length};
    });
    assert.equal(launch.parentThis,true); assert.equal(launch.before,null); assert.equal(launch.closeType,'function');
    assert.equal(launch.width,'90%'); assert.equal(launch.height,'90%'); assert.equal(launch.args,13);
    const url = new URL(launch.url);
    assert.equal(url.pathname,'/UTNewTheme/AsiCommon/Controls/ContentManagement/ContentDesigner/ContentRecordEdit.aspx');
    assert.deepEqual(Object.fromEntries(url.searchParams),{Mode:'Maximized',iUniformKey:ids.pages[1],iOperation:'Edit',TemplateType:'E',DocumentTypeCode:'CON'});
    assert.equal(page.url(),originalUrl); assert.equal(await page.getByRole('tab').first().getAttribute('aria-selected'),'true');
    assert.equal(requests().length,1,'opening an unloaded tab editor does not select or load the tab');
    await about.evaluate(n => n.click());
    assert.equal(await page.evaluate(() => window.editorCalls.length),1,'repeat opens do not rebind the native window');
    await page.evaluate(() => window.finishEditor('cancel',true));
    assert.equal(requests().length,1,'a cancelled beforeClose does not refresh');
    await page.evaluate(() => window.finishEditor('cancel')); await ready(page,2);
    assert.equal(requests().length,2,'Cancel closes and refreshes only the edited page');
    assert.equal(new URL(requests()[1].search,service.url).searchParams.get('iUniformKey'),ids.pages[1]);
    assert.equal(await page.locator('iframe[data-retained=yes]').getAttribute('src'),originalFrame);
    assert.equal(await page.frameLocator('iframe[data-retained=yes]').locator('#search').inputValue(),'retained search on another tab');
    assert.equal(await about.evaluate(n => n===document.activeElement),true);
    await page.evaluate(() => window.finishEditor('duplicate-close')); await page.waitForTimeout(50);
    assert.equal(requests().length,2,'duplicate close notification is ignored');

    await page.getByRole('tab',{name:'About',exact:true}).click(); await ready(page,2);
    const child = page.locator('.us-cco__panel:not([hidden]) iframe').contentFrame();
    await child.locator('#search').fill('unsaved form edit');
    await about.click();
    const declined = page.waitForEvent('dialog');
    await page.evaluate(() => window.finishEditor('save'));
    const decline = await declined; assert.equal(decline.message(),'Discard unsaved changes and refresh this tab?'); await decline.dismiss();
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label')==='Edit About page');
    assert.equal(requests().length,2); assert.equal(await child.locator('#search').inputValue(),'unsaved form edit');
    await about.click();
    const accepted = page.waitForEvent('dialog');
    await page.evaluate(() => window.finishEditor('x'));
    await (await accepted).accept(); await ready(page,2);
    assert.equal(requests().length,3); assert.equal(await child.locator('#search').inputValue(),'');
    assert.equal(await page.frameLocator('iframe[data-retained=yes]').locator('#search').inputValue(),'retained search on another tab');
    await about.hover();
    await page.screenshot({path:path.resolve(__dirname,'../references/test-output/page-editor-desktop.png'),fullPage:true});
    assert.ok(await edits(page).evaluateAll(buttons => buttons.every(b => {
      const row=b.parentElement.getBoundingClientRect(), icon=b.getBoundingClientRect(), label=b.previousElementSibling.querySelector('.rtsTxt').getBoundingClientRect();
      return icon.width===36 && icon.left>=row.left && icon.right<=row.right && label.right<=icon.left;
    })),'pencils have full hit targets without covering long captions');

    await about.click();
    await page.evaluate(() => { window.gIsEasyEditEnabled=false; window.UnionSuiteCCO.scan(); });
    assert.equal(await page.locator('.us-cco__edit[hidden]').count(),3,'false flag wins over a stale body marker');
    await page.evaluate(() => window.finishEditor('save')); await ready(page,2);
    await page.waitForFunction(() => document.activeElement?.getAttribute('role')==='tab' && document.activeElement.textContent==='About');
    assert.equal(await page.getByRole('tab',{name:'About',exact:true}).evaluate(n => n===document.activeElement),true,'focus falls back to the tab when its pencil is hidden');
    await page.evaluate(() => { delete window.gIsEasyEditEnabled; window.UnionSuiteCCO.scan(); });
    assert.equal(await about.isVisible(),true,'native body marker supports pages without the global flag');

    await page.evaluate(() => {window.savedLauncher=window.ShowDialog_NoReturnValue;delete window.ShowDialog_NoReturnValue;});
    await about.click(); assert.match(await page.locator('.us-cco__status').textContent(),/Content Designer is unavailable/);
    await page.evaluate(() => window.ShowDialog_NoReturnValue=()=>{throw Error('Native launch failed');});
    await about.click(); assert.match(await page.locator('.us-cco__status').textContent(),/Native launch failed/);
    await page.evaluate(() => {window.ShowDialog_NoReturnValue=window.savedLauncher;const input=document.createElement('input');input.id='__ClientContext';input.type='hidden';input.value=JSON.stringify({websiteRoot:location.origin+'/OtherSite'});document.body.append(input);});
    await about.click();
    assert.ok(await page.evaluate(() => window.editorCalls.at(-1).args[0].includes('/OtherSite/AsiCommon/')),'active website context takes precedence over gWebSiteRoot');
    const stale = await page.evaluate(() => window.editorCalls.length-1);
    await page.evaluate(() => window.UnionSuiteCCO.reload(document.querySelector('[data-us-cco]'))); await ready(page);
    const afterReload = requests().length;
    await page.evaluate(index => window.finishEditor('stale-close',false,index),stale); await page.waitForTimeout(50);
    assert.equal(requests().length,afterReload,'old close callback cannot touch reconfigured frames');
    // The shared hoverable tooltip can cover the row above its owner after a
    // remount under the stationary pointer. Exercise its native dismissal.
    await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Edit About page',exact:true}).click();
    await page.evaluate(() => history.pushState({},'', '?ID=new-contact')); await ready(page);
    const afterContext = requests().length;
    await page.evaluate(() => window.finishEditor('old-contact-close')); await page.waitForTimeout(50);
    assert.equal(requests().length,afterContext,'old-context close is ignored');

    for (const wrapper of ['wrapped','empty','none']) {
      await page.goto(`${service.url}/?wrapper=${wrapper}`); await ready(page); await enable(page);
      await page.getByRole('button',{name:'Edit Overview page',exact:true}).click();
      await page.evaluate(() => window.finishEditor('x')); await ready(page);
      assert.equal(await edits(page).count(),3);
    }
    await page.goto(`${service.url}/?two`); await ready(page); await enable(page);
    await page.waitForFunction(() => window.UnionSuiteCCO.diagnostics().length===2 && window.UnionSuiteCCO.diagnostics().every(c => c.frames[0]?.state==='ready'));
    const collections = page.locator('[data-us-cco]');
    const leftEditor = collections.nth(0).getByRole('button',{name:'Edit About page',exact:true});
    const rightEditor = collections.nth(1).getByRole('button',{name:'Edit About page',exact:true});
    await leftEditor.click(); await rightEditor.click();
    assert.equal(await page.evaluate(() => window.editorCalls.length),1,'placements share one editor launch lock');
    await page.evaluate(() => window.finishEditor('x')); await ready(page,2);
    assert.equal(await page.evaluate(() => window.UnionSuiteCCO.diagnostics()[1].frames.length),1,'editor callback belongs only to its originating CCO');
    service.options.config = {orientation:'horizontal'};
    await page.goto(service.url); await ready(page); await enable(page);
    assert.equal(await page.locator('[role=tablist]').getAttribute('aria-orientation'),'horizontal');
    await page.getByRole('tab').first().focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('tab').nth(1).evaluate(n => n===document.activeElement),true);
    await page.keyboard.press('Tab');
    assert.equal(await about.evaluate(n => n===document.activeElement),true,'Tab reaches the adjacent edit action');
    await page.screenshot({path:path.resolve(__dirname,'../references/test-output/page-editor-horizontal.png'),fullPage:true});
    await about.click(); const beforeDispose = requests().length;
    await page.evaluate(() => window.UnionSuiteCCO.dispose());
    await page.evaluate(() => window.finishEditor('disposed-close')); await page.waitForTimeout(50);
    assert.equal(requests().length,beforeDispose); assert.equal(await page.locator('iframe').count(),0);

    delete service.options.config;
    const touch = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    const mobile = await touch.newPage(); await setup(mobile);
    await mobile.goto(service.url); await ready(mobile); await enable(mobile);
    await mobile.getByRole('button',{name:'Edit Notes and Interactions page',exact:true}).click();
    await mobile.evaluate(() => window.finishEditor('x')); await ready(mobile,2);
    assert.equal(await mobile.getByRole('button',{name:'Edit Notes and Interactions page',exact:true}).evaluate(n => n.getBoundingClientRect().width),44);
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
    await mobile.screenshot({path:path.resolve(__dirname,'../references/test-output/page-editor-mobile.png'),fullPage:true});
    await touch.close();
    assert.deepEqual(errors,[]);
    console.log('PASS page editor: native close contract, Easy Edit visibility, correct site/page URL, separate keyboard controls, close/cancel/X, repeat protection, dirty accept/decline, retained tabs, context/reload/disposal guards, wrappers, horizontal and touch layouts.');
  } finally {await browser.close();await new Promise(resolve => service.server.close(resolve));}
})().catch(error => {console.error(error);process.exitCode=1;});
