const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.CCO_PLAYWRIGHT_PATH || '../../.tmp-iqa-integration/node_modules/playwright');
const { startServer } = require('../tools/preview.cjs');
const { ids } = require('./fixtures.cjs');
const configure = fs.readFileSync(path.resolve(__dirname, '../upload/UnionSuite-CCO/configure.html'), 'utf8');
const nameId = 'ctl01_TemplateBody_ContentEditorChildControl_ContentItemName_TextField';

(async () => {
  const service = await startServer(), browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/save-fixture', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body>
      <script>window.baseCalls=0;window.baseValid=true;window.originalValidator=function(){window.baseCalls++;window.validatorThis=this;return window.baseValid};window.RunAllValidators=window.originalValidator;window.saved=[];window.parentSaves=0;</script>
      <form id="editor"><input id="${nameId}" value=""><input id="JsonSettings" type="hidden" value='{"schemaVersion":1,"folderDocumentVersionId":"${ids.folder}","caption":"Directory","foreign":true}'>
      ${configure}<button id="ctl01_SaveButton" type="button" onclick="if(RunAllValidators())window.saved.push(JSON.parse(document.getElementById('JsonSettings').value))">Save</button></form>
      <form id="parent"><button id="parent-save" type="submit">Save containing page</button></form>
      <script>document.getElementById('parent').addEventListener('submit',e=>{e.preventDefault();window.parentSaves++});</script>
      </body></html>` }));
    await page.goto(`${service.url}/save-fixture`);
    assert.equal(await page.locator(`#${nameId}`).inputValue(), 'Directory');
    assert.equal(await page.locator('[data-us-cco-config]').evaluate(el => el.classList.contains('ng-non-bindable')), true);
    await page.locator('[data-setting=caption]').fill('Changed without blur');
    assert.equal(await page.evaluate(() => JSON.parse(document.getElementById('JsonSettings').value).caption), 'Changed without blur');
    await page.locator(`#${nameId}`).fill('Author supplied name');
    await page.locator('[data-setting=caption]').fill('Changed again');
    assert.equal(await page.locator(`#${nameId}`).inputValue(), 'Author supplied name');
    await page.locator('[data-setting=caption]').press('Enter');
    assert.equal(new URL(page.url()).pathname, '/save-fixture');
    assert.equal(await page.evaluate(() => window.saved.length), 0);
    await page.locator('#ctl01_SaveButton').click();
    assert.equal(await page.evaluate(() => window.saved.length), 1);
    assert.equal(await page.evaluate(() => window.saved[0].foreign), true);
    await page.evaluate(() => { window.baseValid = false; });
    await page.locator('#ctl01_SaveButton').click();
    assert.equal(await page.evaluate(() => window.saved.length), 1, 'Preserve native validation failure');
    await page.evaluate(() => { window.baseValid = true; });
    await page.locator('[data-setting=folderDocumentVersionId]').fill('invalid');
    assert.equal(await page.evaluate(() => RunAllValidators()), false, 'Block invalid config through native validator');
    await page.locator('#ctl01_SaveButton').click();
    assert.equal(await page.evaluate(() => window.saved.length), 1);
    await page.locator('#parent-save').click();
    assert.equal(await page.evaluate(() => window.parentSaves), 1, 'Unrelated form submit is not intercepted');
    await page.locator('[data-us-cco-config]').evaluate(el => { el.hidden = true; });
    await page.locator('[data-setting=folderDocumentVersionId]').evaluate(el => { el.value = ''; });
    assert.equal(await page.locator('#editor').evaluate(el => el.checkValidity()), true, 'Hidden CCO fields must not impose browser validation on the host form');
    assert.equal(await page.evaluate(() => RunAllValidators()), true, 'Closed config does not invalidate containing page');
    await page.evaluate(() => { document.getElementById('ctl01_SaveButton').click(); });
    assert.equal(await page.evaluate(() => window.saved.length), 2, 'Closed editor does not cancel native Save');
    await page.evaluate(() => window.UnionSuiteCCOEditor.dispose());
    assert.equal(await page.evaluate(() => window.RunAllValidators === window.originalValidator), true);
    assert.deepEqual(errors, []);
    console.log('PASS editor save compatibility: input auto-sync, native name, native validation, Enter guard, foreign and closed-editor page saves, validator cleanup. This is a simulated host, not live page persistence.');
  } finally { await browser.close(); await new Promise(resolve => service.server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
