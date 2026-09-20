const fs = require('node:fs');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {chromium} = require('../.tmp-iqa-integration/node_modules/playwright');
const source = fs.readFileSync('Mascot/pip-koala.source.html', 'utf8');
const oldSource = fs.readFileSync('.preview/pip-v1-before.source.html', 'utf8');
const wrap = source => '<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:24px}</style>' + source;

(async () => {
  const browser = await chromium.launch({channel:'msedge', headless:true});
  const errors = [];
  try {
    async function pageFor(content, options = {}) {
      const page = await browser.newPage({viewport:{width:740, height:490}, ...options});
      page.on('pageerror', error => errors.push(error.message));
      await page.clock.install({time:new Date('2026-09-15T00:00:00Z')});
      await page.clock.pauseAt(new Date('2026-09-15T00:00:00Z'));
      await page.setContent(wrap(content));
      // Start through the real replay control so the clock has a known origin.
      await page.locator('.pip-replay').click();
      return page;
    }
    const page = await pageFor(source);
    const root = page.locator('#pip-mascot-demo');
    const character = page.locator('.pip-character');
    await page.clock.runFor(400);
    assert.equal(await root.getAttribute('data-phase'), 'peek');
    await page.clock.runFor(1700);
    assert.equal(await root.getAttribute('data-phase'), 'visit');
    assert(await root.evaluate(el => el.classList.contains('is-arriving')));
    await page.clock.runFor(1000);
    assert(await root.evaluate(el => el.classList.contains('is-waving')));
    await page.screenshot({path:'.preview/pip-v1-wave.png'});
    await page.clock.runFor(1800);
    assert(!await root.evaluate(el => el.classList.contains('is-arriving') || el.classList.contains('is-waving')));
    assert.equal(await page.locator('.pip-creature').evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.mouse.move(30, 130);
    await page.clock.runFor(400);
    const turn = await root.evaluate(el => el.style.getPropertyValue('--pip-turn'));
    assert(Number.parseFloat(turn) < 0, 'head follows pointer');
    await page.screenshot({path:'.preview/pip-v1-look.png'});
    await page.mouse.move(739, 489);
    assert.equal(await root.evaluate(el => el.style.getPropertyValue('--pip-turn')), '0deg');
    await character.focus();
    await page.keyboard.press('Enter');
    await page.clock.runFor(500);
    assert(await root.evaluate(el => el.classList.contains('is-waving')));
    await page.keyboard.press('Space');
    await page.clock.runFor(2200);
    assert(!await root.evaluate(el => el.classList.contains('is-waving')));
    await page.clock.runFor(12000);
    assert.equal(await root.getAttribute('data-phase'), 'visit', 'focused mascot stays visible');
    await character.evaluate(el => el.blur());
    await page.clock.runFor(2100);
    assert(['away','leaving'].includes(await root.getAttribute('data-phase')));
    await page.clock.runFor(750);
    assert.equal(await root.getAttribute('data-phase'), 'away');
    await page.locator('.pip-replay').click();
    await page.clock.runFor(3200);
    await page.locator('.pip-replay').click();
    assert(!await root.evaluate(el => el.classList.contains('is-waving')));
    assert.equal(await root.evaluate(el => el.style.getPropertyValue('--pip-turn')), '0deg');
    await page.clock.runFor(5100);
    assert.equal(await root.getAttribute('data-phase'), 'visit');
    await page.mouse.move(30, 130);
    await page.emulateMedia({reducedMotion:'reduce'});
    await new Promise(resolve => setTimeout(resolve, 100));
    await page.clock.runFor(100);
    assert.equal(await root.evaluate(el => el.style.getPropertyValue('--pip-turn')), '0deg');
    assert.equal(await root.evaluate(el => el.getAnimations({subtree:true}).length), 0);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await new Promise(resolve => setTimeout(resolve, 100));
    await page.clock.runFor(100);
    assert.equal(await page.locator('.pip-figure').evaluate(el => getComputedStyle(el).animationName), 'pip-breathe');
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    await page.clock.runFor(20000);
    assert.equal(await root.getAttribute('data-phase'), 'away');
    assert.equal(await root.getAttribute('class'), '');
    console.log('PASS: arrival, wave settling/repeat, gaze/reset, keyboard focus, departure, replay, live reduced motion and disposal');

    // Compare the actual resting geometry/paint against the original v1 drawing.
    const original = await pageFor(oldSource, {reducedMotion:'reduce'});
    const updated = await pageFor(source, {reducedMotion:'reduce'});
    await original.clock.runFor(500);
    await updated.clock.runFor(500);
    const appearance = page => page.evaluate(() => [...document.querySelectorAll('.pip-ear,.pip-body,.pip-belly,.pip-head,.pip-tuft,.pip-eye,.pip-nose,.pip-mouth,.pip-cheek,.pip-paw')].map(el => {
      const r = el.getBoundingClientRect(), c = getComputedStyle(el);
      return {class:el.className, x:r.x, y:r.y, w:r.width, h:r.height, colour:c.backgroundColor, border:c.border, radius:c.borderRadius, shadow:c.boxShadow};
    }));
    assert.deepEqual(await appearance(updated), await appearance(original));
    await updated.clock.runFor(2600);
    assert.equal(await updated.locator('#pip-mascot-demo').evaluate(el => el.getAnimations({subtree:true}).length), 0);
    assert(await updated.locator('#pip-mascot-demo').evaluate(el => el.classList.contains('is-waving')));
    console.log('PASS: original v1 resting shapes, positions, colours, outlines and shadows match; reduced-motion greeting is static');

    for (const [name, options] of [
      ['desktop', {viewport:{width:900,height:580}, colorScheme:'light'}],
      ['mobile-dark', {viewport:{width:390,height:620}, colorScheme:'dark', hasTouch:true, isMobile:true}]
    ]) {
      const preview = await browser.newPage(options);
      preview.on('pageerror', error => errors.push(error.message));
      await preview.route('https://**/*', route => route.abort());
      await preview.goto(pathToFileURL(require('node:path').resolve('Mascot/pip-koala.html')).href);
      const frame = preview.frames().find(frame => frame !== preview.mainFrame());
      await frame.locator('.pip-replay').click();
      await preview.waitForTimeout(3300);
      assert.equal(await frame.locator('#pip-mascot-demo').getAttribute('data-phase'), 'visit');
      assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await preview.screenshot({path:'.preview/pip-v1-' + name + '.png', fullPage:true});
      await preview.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: generated export works at desktop and mobile widths, light/dark, without external helpers; no page errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
