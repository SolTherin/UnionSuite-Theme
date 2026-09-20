// Match card bottoms through native iMIS wrappers without fixed heights or new queries.
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>route.abort());
  await page.setContent(fs.readFileSync('references/Membership-Stats.html','utf8'));
  await page.waitForFunction(()=>document.querySelectorAll('[data-us-membership-state="ready"]').length===4);
  async function aligned(){
   const pairs=await page.locator('.row[data-us-membership-row]').evaluateAll(rows=>rows.map(row=>[...row.querySelectorAll('.us-membership')].map(card=>({top:card.getBoundingClientRect().top,bottom:card.getBoundingClientRect().bottom}))));
   assert.equal(pairs.length,2,'only the two paired rows are managed');
   for(const pair of pairs){assert.equal(pair.length,2);assert(Math.abs(pair[0].top-pair[1].top)<1,'card tops match');assert(Math.abs(pair[0].bottom-pair[1].bottom)<1,'card bottoms match');}
  }
  await aligned();assert.equal(await page.evaluate(()=>__membershipExampleCalls.length),8);
  const initial=await page.locator('[data-us-membership="categories"]').evaluate(n=>n.getBoundingClientRect().height);
  await page.locator('[data-us-membership="groups"] tbody').evaluate(n=>{for(let i=0;i<3;i++)n.append(n.firstElementChild.cloneNode(true));});
  await aligned();assert(await page.locator('[data-us-membership="categories"]').evaluate((n,h)=>n.getBoundingClientRect().height>h,initial),'peer grows with added rows');
  await page.locator('[data-us-membership="groups"] tbody').evaluate(n=>{for(let i=0;i<3;i++)n.lastElementChild.remove();});
  await aligned();assert.equal(await page.locator('[data-us-membership="categories"]').evaluate(n=>n.getBoundingClientRect().height),initial,'peer shrinks again');
  // Configured iPart class wrappers live INSIDE ContentItemContainer.
  await page.locator('.us-membership').evaluateAll(cards=>cards.forEach((card,i)=>{if(card.dataset.usMembership==='summary')return;const wrapper=document.createElement('div');wrapper.className=i%2?'author-class':'';card.replaceWith(wrapper);wrapper.append(card);}));
  await page.waitForFunction(()=>document.querySelectorAll('[data-us-membership-stretch="wrapper"]').length>=12);await aligned();
  // Empty native panel shells add wrappers but no competing content.
  await page.locator('.us-membership--trend,[data-us-membership="financial"]').evaluateAll(cards=>cards.forEach(card=>{const panel=document.createElement('div');panel.className='panel';panel.innerHTML='<div class="panel-heading"></div><div class="panel-body-container"><div class="panel-body"></div></div>';card.replaceWith(panel);panel.querySelector('.panel-body').append(card);}));
  await page.waitForFunction(()=>document.querySelectorAll('.panel-body[data-us-membership-stretch]').length===2);await aligned();
  await page.locator('.us-membership--trend,[data-us-membership="financial"]').evaluateAll(cards=>cards.forEach(card=>card.closest('.panel').replaceWith(card)));
  await page.waitForFunction(()=>document.querySelectorAll('.panel-body[data-us-membership-stretch]').length===0);await aligned();
  // An unrelated containing row/CCO must not be promoted.
  await page.locator('.home-stats-native').evaluate(n=>{const row=document.createElement('div');row.className='row unrelated-row';const col=document.createElement('div');col.className='col-sm-12';const cco=document.createElement('div');cco.className='cco';n.replaceWith(row);row.append(col);col.append(cco);cco.append(n);});
  await aligned();assert.equal(await page.locator('.unrelated-row').getAttribute('data-us-membership-row'),null);
  await page.screenshot({path:'.preview/membership-stats-equal-rows.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  const mobile=await page.locator('[data-us-membership="groups"],[data-us-membership="categories"]').evaluateAll(nodes=>nodes.map(n=>({height:n.getBoundingClientRect().height,top:n.getBoundingClientRect().top,bottom:n.getBoundingClientRect().bottom})));
  assert(mobile[1].top>=mobile[0].bottom,'mobile cards stack');assert(mobile[1].height<mobile[0].height-30,'mobile restores natural unequal heights');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page overflow');
  await page.screenshot({path:'.preview/membership-stats-equal-rows-mobile.png',fullPage:true});
  await page.setViewportSize({width:1600,height:1800});
  const group=page.locator('[data-us-membership="groups"]');
  await group.evaluate(n=>n.closest('.row').classList.add('us-report-no-styling'));
  await page.waitForFunction(()=>document.querySelectorAll('[data-us-membership-row]').length===1);
  await group.evaluate(n=>n.closest('.row').classList.remove('us-report-no-styling'));await page.waitForFunction(()=>document.querySelectorAll('[data-us-membership-row]').length===2);await aligned();
  await group.evaluate(n=>{const extra=document.createElement('p');extra.id='unrelated-copy';extra.textContent='Another iPart in this column';n.closest('.WebPartZone').append(extra);});
  await page.waitForFunction(()=>document.querySelectorAll('[data-us-membership-row]').length===1);
  await page.locator('#unrelated-copy').evaluate(n=>n.remove());await page.waitForFunction(()=>document.querySelectorAll('[data-us-membership-row]').length===2);await aligned();
  const oldHtml=await group.evaluate(n=>n.closest('.row').outerHTML);
  await group.evaluate(n=>n.closest('.row').remove());await page.waitForFunction(()=>document.querySelectorAll('[data-us-membership-row]').length===1);
  await page.locator('.home-stats-native').evaluate((n,html)=>{const template=document.createElement('template');template.innerHTML=html;template.content.querySelectorAll('[data-us-membership-row],[data-us-membership-stretch]').forEach(el=>{el.removeAttribute('data-us-membership-row');el.removeAttribute('data-us-membership-stretch');});n.insertBefore(template.content,n.lastElementChild);},oldHtml);
  await page.waitForFunction(()=>document.querySelectorAll('[data-us-membership-row]').length===2);await aligned();
  assert.equal(await page.evaluate(()=>__membershipExampleCalls.length),8,'alignment and replacement reuse data');
  assert.deepEqual(errors,[]);
  console.log('PASS membership layout: matched bottoms, growth/shrink, native/classed/empty wrappers, nested row boundary, mobile, opt-out, unrelated content and replacement.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
