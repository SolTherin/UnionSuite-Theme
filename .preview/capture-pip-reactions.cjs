// Capture the actual offline preview at key animation poses for visual review.
const path = require('node:path'), {pathToFileURL} = require('node:url');
const assert = require('node:assert/strict');
const {chromium} = require('../.tmp-iqa-integration/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({channel:'msedge', headless:true});
  try {
    for (const mobile of [false, true]) {
      const page = await browser.newPage({viewport:{width:mobile ? 390 : 1100,height:720},deviceScaleFactor:2,hasTouch:mobile,isMobile:mobile});
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('https://**/*', route => route.abort());
      await page.clock.install({time:new Date('2026-09-16T23:00:00Z')});
      await page.clock.pauseAt(new Date('2026-09-16T23:00:00Z'));
      await page.goto(pathToFileURL(path.resolve('references/Taskbar-Preview.html')).href);
      await page.waitForTimeout(80);
      for (let i=0;i<21;i++) { await page.clock.runFor(250); await new Promise(resolve=>setTimeout(resolve,8)); }
      if (mobile) await page.locator('[data-pip-preview-scheme]').selectOption('dark');
      const pip = page.locator('.us-taskbar__pip'), button = page.locator('.us-taskbar__pip-button');
      const base = mobile ? 'mobile' : 'desktop';
      const navBefore = await page.locator('.us-taskbar__search').boundingBox();
      async function pose(name, time, capture) {
        await pip.evaluate((el, {name,time}) => {
          const animations = el.getAnimations({subtree:true}).filter(animation => animation.animationName === name || (name === 'us-pip-shy-goodbye' && animation.animationName?.startsWith('us-pip-goodbye-')));
          if (!animations.length) throw Error('Missing animation: '+name);
          for (const animation of animations) { animation.pause(); animation.currentTime = time; }
        }, {name,time});
        await page.locator('#hd').screenshot({path:'.preview/pip-'+base+'-'+capture+'.png'});
      }
      await pose('us-pip-wave', 1100, 'wave');
      if (mobile) await button.tap(); else await button.click();
      await pose('us-pip-wave', 1100, 'click-wave');
      if (mobile) await button.tap(); else await button.click();
      await pose('us-pip-happy-hop', 390, 'hop');
      const clearsTop = await pip.evaluate(el => {
        const top=el.querySelector('button').getBoundingClientRect().top;
        return ['.pip-ear-left','.pip-ear-right','.pip-tuft'].every(selector=>el.querySelector(selector).getBoundingClientRect().top >= top);
      });
      assert(clearsTop, 'hop clears the clipping edge: '+base);
      await page.locator('[data-pip-preview-idle="scratch"]').click();
      await pose('us-pip-head-scratch', 800, 'scratch');
      assert(await pip.evaluate(el=>{
        const paw=el.querySelector('.pip-paw-right').getBoundingClientRect(),head=el.querySelector('.pip-head').getBoundingClientRect();
        return paw.top < head.top+head.height/2 && paw.bottom > head.top && paw.left < head.right && paw.right > head.left;
      }),'raised paw touches the head');
      await page.locator('[data-pip-preview-idle="curious"]').click();
      await pose('us-pip-curious-tilt', 1000, 'tilt');
      assert.equal(await button.getAttribute('aria-label'),'Say goodbye to Biscuit','idle controls preserve the click sequence');
      if (mobile) await button.tap(); else await button.click();
      await pose('us-pip-shy-goodbye', 300, 'duck');
      const hiddenBelowEdge = () => pip.evaluate(el => {
        const bottom=el.querySelector('button').getBoundingClientRect().bottom;
        return ['.pip-ear-left','.pip-ear-right','.pip-tuft','.pip-head'].every(selector=>el.querySelector(selector).getBoundingClientRect().top >= bottom);
      });
      assert(await hiddenBelowEdge(), 'first duck is already below the divider');
      const gazeX = () => pip.locator('.pip-eye-left').evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m41);
      await pose('us-pip-shy-goodbye', 1050, 'look-left');
      assert(await gazeX() < -5, 'looks left');
      await pose('us-pip-shy-goodbye', 1530, 'look-right');
      assert(await gazeX() > 5, 'looks right');
      await pose('us-pip-shy-goodbye', 2040, 'look-at-you');
      assert(Math.abs(await gazeX()) < .1, 'looks at the viewer before the fright');
      await pose('us-pip-shy-goodbye', 2550, 'startle');
      assert(await pip.locator('.pip-mouth').evaluate(el=>parseFloat(getComputedStyle(el).height)>12), 'surprised open mouth');
      assert(await pip.locator('.pip-eye-left').evaluate(el=>parseFloat(getComputedStyle(el).scale)>1), 'eyes widen at the jump');
      assert(await pip.evaluate(el=>el.querySelector('.pip-ear-left').getBoundingClientRect().top >= el.querySelector('button').getBoundingClientRect().top), 'startle clears the top edge');
      await pose('us-pip-shy-goodbye', 3000, 'final-duck');
      assert(await hiddenBelowEdge(), 'last dive ends below the divider');
      await page.clock.runFor(3200);
      assert.equal(await pip.getAttribute('data-phase'),'away');
      assert.deepEqual(await page.locator('.us-taskbar__search').boundingBox(),navBefore,'navigation does not shift');
      assert.deepEqual(errors,[]);
      await page.screenshot({path:'.preview/pip-'+base+'-preview.png',fullPage:true});
      await page.close();
    }
    console.log('PASS: desktop/mouse and mobile/touch sequence, quick ducks, left/right/front gaze, startled face, no clipping, fixed navigation; captured light/dark animation poses');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
