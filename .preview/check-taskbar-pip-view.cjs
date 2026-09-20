const fs = require('node:fs'), {pathToFileURL} = require('node:url'), path = require('node:path');
const {chromium} = require('../.tmp-iqa-integration/node_modules/playwright');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    for(const [name,options] of [['desktop',{viewport:{width:1000,height:600}}],['mobile',{viewport:{width:390,height:620},isMobile:true,hasTouch:true}]]) {
      const page=await browser.newPage(options),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(pathToFileURL(path.resolve('references/Taskbar-Preview.html')).href);
      if(name==='mobile')await page.selectOption('[data-pip-preview-scheme]','dark');
      await page.waitForFunction(()=>document.querySelector('.us-taskbar__pip').classList.contains('is-waving'));
      await page.waitForTimeout(400);
      await page.screenshot({path:'.preview/taskbar-pip-'+name+'.png'});
      console.log(name,await page.evaluate(()=>({phase:document.querySelector('.us-taskbar__pip').dataset.phase,width:document.documentElement.scrollWidth,viewport:innerWidth,section:document.querySelector('.us-taskbar__pip').getBoundingClientRect().toJSON(),search:document.querySelector('.tb-search-wrap').getBoundingClientRect().toJSON()})),errors);
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
