// Home preview integration with the current two-task screenshot fixture.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.abort());
  const load=async()=>{await page.setContent(fs.readFileSync('references/Home-Preview.html','utf8'));await page.waitForFunction(()=>document.querySelector('#home-task-ipart[data-us-query-display]')&&document.querySelectorAll('#task-list>section').length===2);};
  await page.emulateMedia({reducedMotion:'reduce'});await load();
  const ipart=page.locator('#home-task-ipart'),rows=page.locator('#task-list>section:visible'),funnel=ipart.locator('.us-iqa-filter-toggle'),completed=ipart.locator('.us-task-completed-toggle'),input=ipart.locator('input[type=search]');
  assert.equal(await ipart.getAttribute('class'),'us-query-search us-task-completed-filter us-action-home-add-task');
  assert(await ipart.evaluate(n=>n.parentElement.classList.contains('ContentItemContainer')));
  const add=ipart.getByRole('button',{name:'Add task',exact:true});assert.equal(await add.locator('svg').count(),1);await add.click();
  assert.equal(await page.locator('#dialog-title').textContent(),'Add task');await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  await funnel.click();await input.fill('missing name');assert.equal(await rows.count(),0);await input.fill('IP');assert.equal(await rows.count(),1);
  await input.fill('');assert.equal(await rows.count(),2);
  await page.locator('[data-task-toggle="task-1"]').click();await page.waitForFunction(()=>document.querySelectorAll('#task-list>section:not([data-us-query-search-hidden])').length===1);
  await completed.click();await page.waitForFunction(()=>document.querySelectorAll('#task-list>section:not([data-us-query-search-hidden])').length===2);
  assert.match(await page.locator('[data-task-row="task-1"]').innerText(),/Actioned/);
  await page.locator('[data-task-toggle="task-1"]').press('Space');assert.equal(await page.locator('[data-task-toggle="task-1"]').getAttribute('aria-checked'),'false');
  await completed.click();assert.equal(await rows.count(),2);
  await page.getByRole('button',{name:'Preview empty tasks'}).click();assert.equal(await rows.count(),0);
  await page.getByRole('button',{name:'Restore sample tasks'}).click();assert.equal(await rows.count(),2);
  await page.emulateMedia({reducedMotion:'no-preference'});await load();
  await page.locator('[data-task-toggle="task-1"]').click();
  await page.waitForFunction(()=>!document.querySelector('.home-task-item.is-leaving')&&document.querySelectorAll('#task-list>section:not([data-us-query-search-hidden])').length===1);
  await completed.click();await page.waitForFunction(()=>document.querySelectorAll('#task-list>section:not([data-us-query-search-hidden])').length===2);
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);console.log('PASS current Home sample: registered Add action, search, completion/reopen/filter, empty/restore, motion and mobile.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
