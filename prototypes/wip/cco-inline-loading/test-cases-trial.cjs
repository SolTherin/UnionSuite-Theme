/* Offline ownership/contract checks. The manager body is user-supplied native
 * evidence; the grid, registry, HTML and properties are synthetic, not Telerik. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(path.resolve(__dirname, '../../../.tmp-iqa-integration/node_modules/playwright'));
const source = fs.readFileSync(path.join(__dirname, 'CCO-Inline-Probes.js'), 'utf8');
const pagerCapture = fs.readFileSync(path.join(__dirname, 'Capture-Cases-Pager.js'), 'utf8');
const evidence = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'research/native-cco-handover/evidence/native-cases-manager-source.json'), 'utf8'));
const callbacks = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'research/native-cco-handover/evidence/native-cases-callback-source.json'), 'utf8')).report;
const suppliedPager = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'research/native-cco-handover/evidence/cases-pager-source.json'), 'utf8')).report;
const id = evidence.gridId, manager = evidence.managerName;
const constructor = evidence.methods.find(item => item.name === 'constructor').source;
const names = ['Overview', 'Cases', 'Other'];
const pathname = '/UTStaff/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Account_Page_Staff.aspx';
// The first helper is the supplied native focus script (`}//]]>` ending). The
// second is unrelated syntax the limited scanner cannot classify.
const focusHelpers = [callbacks.shortRelatedHelpers[0].source, `var t=document.getElementById('${id}_ctl00');if(t){window.helperRan=true;}/t/.test('x');`];
const setupScript = settings => fixture(true, settings).match(/<script>(window\.unrelatedStartup[\s\S]*?)<\/script>/)[1];
const config = { GridClientId: id, IsMultiSelect: false, TrackItemSelectionAcrossPostbacks: false, IsSelectedByDefault: false, DeltaKeys: '', ClientOnRowSelected: null, ClientOnRowDeselected: null };

function fixture(cases, settings) {
  const properties = { ClientID: id, UniqueID: id.replaceAll('_', '$'), _masterClientID: id + '_ctl00', clientStateFieldID: id + '_ClientState', _clientKeyValues: [{ code_CaseNum: 'PRIVATE-ROW-KEY' }], _gridTableViewsData: 'PRIVATE-TABLE-DATA' };
  if (settings.badProperty) properties.unknownOption = true;
  let events = callbacks.eventsSource;
  if (settings.badEvent) events = events.replace('OnGridCreated', 'UnknownMethod');
  const managerConfig = { ...config, ...(settings.badConfig ? { TrackItemSelectionAcrossPostbacks: true } : {}) };
  const assignment = `window['${manager}']=new Asi_Web_BusinessDataGrid2(${JSON.stringify(managerConfig)});`;
  const descriptor = `$create(Telerik.Web.UI.RadGrid, ${JSON.stringify(properties)}, ${events}, null, $get('${id}'));`;
  const pagerId = id + '_ctl00_ctl03_ctl01_PageSizeComboBox';
  const pagerProperties = settings.nativePager ? Object.fromEntries(Object.entries(suppliedPager.descriptor.properties.fields).map(([name, field]) => [name, field.type === 'identifier' ? field.id : field.type === 'array' ? [{ text: 'PRIVATE-COMBO-ITEM', value: '5' }] : field.value ?? 'PRIVATE-PAGER-SETTING'])) : { clientStateFieldID: pagerId + '_ClientState', itemData: [{ text: 'PRIVATE-COMBO-ITEM' }], selectedValue: 'PRIVATE-SELECTION', autoPostBack: false, _postBackReference: "__doPostBack('fixturePager','PageSize')" };
  if (settings.unknownPagerProperty) pagerProperties.unknownOption = true;
  const pagerEvents = settings.nativePager ? suppliedPager.descriptor.eventsSource.replace('ChangingPageSizeComboHandler', settings.badPagerEvent ? 'OtherHandler' : 'ChangingPageSizeComboHandler') : `{"selectedIndexChanged":function(s,a){window.captureCalled=true;$find('${id}').fixturePageSize(s,a);}}`;
  const pagerDescriptor = settings.pager ? `$create(Telerik.Web.UI.RadComboBox, ${JSON.stringify(pagerProperties)}, ${pagerEvents}, ${settings.pagerReferences ? '{"owner":"other"}' : 'null'}, $get('${settings.pagerWrongTarget ? 'otherPager' : pagerId}'));` : '';
  const pagerMarkup = settings.pager ? `<div id="${pagerId}" class="RadComboBox RadComboBox_MetroTouch PageSizeDropDown"><input value="PRIVATE-COMBO-INPUT"></div><input type="hidden" id="${pagerId}_ClientState" name="${pagerId}_ClientState" value="PRIVATE-PAGER-STATE">` : '';
  const content = cases ? `<div class="ContentItemContainer" id="ste_container_Cases"><div class="RadGrid" id="${id}"><table id="${id}_ctl00"><tbody><tr><td>Fixture case</td></tr></tbody></table>${pagerMarkup}${settings.extraComponent ? `<span id="${id}_extra" class="Fixture Extra"></span>` : ''}</div><input type="hidden" id="${id}_ClientState" name="${settings.badState ? '__VIEWSTATE' : id + '_ClientState'}" value="PRIVATE-STATE"><input type="hidden" id="HiddenKeyField1" value="PRIVATE-KEY"><script>window.unrelatedScriptRan=true;</script></div>` : '<button type="button" id="original">Original</button>';
  let setup = settings.pagerAfterGrid ? descriptor + pagerDescriptor : pagerDescriptor + descriptor;
  if (settings.extraComponent) setup += `$create(Telerik.Web.UI.RadToolTip, {"text":"PRIVATE-TIP"}, null, null, $get('${id}_extra'));`;
  if (settings.ambiguousSetup) setup += 'if(window.fixtureFlag){}/fixture/.test("a");';
  if (settings.ambiguousInCall) setup = setup.replace(', null, $get', ', (function(){}/1, null), $get');
  const helpers = settings.focusHelper ? focusHelpers.map(text => `<script>${text}</script>`).join('') : '';
  return `<!doctype html><html><head><title>Cases fixture</title></head><body><form><input id="__VIEWSTATE" name="__VIEWSTATE" type="hidden" value="${cases ? 'FOREIGN' : 'ORIGINAL'}"><div class="ContentItemContainer" id="ste_container_ciAccountpagetabs"><div class="cco"><div class="RadTabStrip" id="tabs">${names.map(name => `<a class="rtsLink ${name === (cases ? 'Cases' : 'Overview') ? 'rtsSelected' : ''}" href="#"><span class="rtsTxt">${name}</span></a>`).join('')}</div><div class="RadMultiPage" id="multi">${names.map(name => `<div class="rmpView" style="display:${name === (cases ? 'Cases' : 'Overview') ? 'block' : 'none'}">${name === (cases ? 'Cases' : 'Overview') ? content : ''}</div>`).join('')}</div></div></div></form>${cases ? `${helpers}<script>window.unrelatedStartup=true;${assignment}${settings.duplicate ? assignment : ''}${setup}</script>` : ''}</body></html>`;
}

// Public API doubles model ownership and disposal, not server behaviour.
function installRuntime({ id, constructor, fail }) {
  window.fixtureRegistry = new Map();
  window.fixtureDisposals = [];
  window.fixtureCreates = 0;
  window.fixtureCreationOrder = [];
  window.fixturePagerEvents = null;
  window.fixtureNativeClicks = 0;
  window.originalNode = document.getElementById('original');
  originalNode.addEventListener('click', () => window.fixtureNativeClicks++);
  window.$get = id => document.getElementById(id);
  window.$find = id => fixtureRegistry.get(id) || null;
  window.Sys = { Application: { getComponents: () => [...fixtureRegistry.values()], get_isCreatingComponents: () => false } };
  window.Telerik = { Web: { UI: { RadGrid: function() {}, RadComboBox: function() {}, Grid: { ChangePageSizeComboHandler() {}, ChangingPageSizeComboHandler() {} } } } };
  const script = document.createElement('script');
  script.textContent = constructor;
  document.head.append(script);
  window.$create = (type, properties, events, references, element) => {
    window.fixtureCreates++;
    fixtureCreationOrder.push(element.id);
    if (fail === 'early') throw new Error('Synthetic before registry failure');
    const component = node => {
      const value = {
        get_id: () => node.id, get_element: () => node,
        dispose() {
          if (fail === 'dispose' && node === element) throw new Error('Synthetic disposal failure');
          fixtureDisposals.push(node.id);
          if (fixtureRegistry.get(node.id) === value) fixtureRegistry.delete(node.id);
          if (node.control === value) node.control = null;
        }
      };
      node.control = value;
      fixtureRegistry.set(node.id, value);
      return value;
    };
    const control = component(element);
    if (type === Telerik.Web.UI.RadComboBox) {
      window.fixturePagerEvents = events;
      if (fail === 'pager') throw new Error('Synthetic partial pager creation failure');
      return control;
    }
    if (fail === 'unregistered') fixtureRegistry.delete(element.id);
    if (fail === 'partial' || fail === 'unregistered') throw new Error('Synthetic partially created failure');
    const table = component(document.getElementById(properties._masterClientID));
    control.get_masterTableView = () => table;
    const disposeRoot = control.dispose;
    control.dispose = () => { table.dispose(); disposeRoot(); };
    events.gridCreated(control, {});
    events.rowCreated(control, {});
    events.rowSelected(control, {});
    events.rowDeselected(control, {});
    return control;
  };
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let passed = 0;
  async function scenario(name, run, settings = {}) {
    if (process.argv[2] && !name.includes(process.argv[2])) return;
    const context = await browser.newContext();
    const page = await context.newPage();
    const requests = [], errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('http://cco.test/**', async route => {
      const url = new URL(route.request().url());
      requests.push({ method: route.request().method(), path: url.pathname, params: [...url.searchParams] });
      const cases = url.searchParams.get('b511e4d055d8') === 'Cases';
      if (cases && settings.delay) await new Promise(resolve => setTimeout(resolve, 120));
      await route.fulfill({ contentType: 'text/html', body: fixture(cases, settings) });
    });
    try {
      await page.goto('http://cco.test' + pathname + '?ID=1001&tag=a&tag=b');
      await page.evaluate(installRuntime, { id, constructor, fail: settings.fail });
      await page.addScriptTag({ content: source });
      await run(page, requests);
      assert.deepEqual(errors, []);
      console.log('PASS ' + name); passed++;
    } finally { await context.close(); }
  }
  const start = page => page.evaluate(() => usCcoInline.startCasesTrial());
  const report = page => page.evaluate(() => usCcoInline.casesReport());
  try {
    await scenario('native pager initializes before grid with exact handlers and cleans up across refresh/switch/stop', async page => {
      const result = await start(page);
      assert.equal(result.cycles[0].status, 'initialized');
      assert.equal(result.cycles[0].pager.registered, true);
      assert.deepEqual(await page.evaluate(() => fixtureCreationOrder), [suppliedPager.pagerId, id]);
      assert.equal(await page.evaluate(() => fixturePagerEvents.selectedIndexChanged === Telerik.Web.UI.Grid.ChangePageSizeComboHandler && fixturePagerEvents.selectedIndexChanging === Telerik.Web.UI.Grid.ChangingPageSizeComboHandler), true);
      assert.equal(await page.locator('input[type=hidden]').count(), 3);
      assert.equal(await page.evaluate(() => document.getElementById('__VIEWSTATE').value), 'ORIGINAL');
      assert.doesNotMatch(JSON.stringify(result), /PRIVATE-/);
      await page.evaluate(() => usCcoInline.refresh());
      await page.evaluate(() => usCcoInline.select(0));
      await page.evaluate(() => usCcoInline.select(1));
      await page.evaluate(() => usCcoInline.stop());
      const final = await report(page);
      assert.equal(final.cycles.every(cycle => cycle.status === 'initialized' && cycle.cleanup.status === 'disposed'), true);
      assert.equal(await page.evaluate(() => fixtureRegistry.size), 0);
      assert.equal(await page.evaluate(() => fixtureDisposals.length), 9);
      assert.equal(await page.locator('input[type=hidden]').count(), 1);
    }, { pager: true, nativePager: true });
    for (const option of ['badPagerEvent', 'unknownPagerProperty', 'pagerAfterGrid', 'pagerReferences']) {
      await scenario('native pager rejects changed contract: ' + option, async page => {
        const result = await start(page);
        assert.equal(result.cycles[0].status, 'failed');
        assert.equal(result.cycles[0].initializationAttempted, false);
        assert.equal(await page.evaluate(() => fixtureCreates), 0);
        assert.equal(await page.locator('#original').count(), 1);
      }, { pager: true, nativePager: true, [option]: true });
    }
    for (const fail of ['pager', 'partial']) {
      await scenario('native pager and grid partial failure clean both controls: ' + fail, async page => {
        const result = await start(page);
        assert.equal(result.cycles[0].status, 'failed');
        assert.equal(result.cycles[0].cleanup.status, 'disposed');
        assert.equal(await page.evaluate(() => fixtureRegistry.size), 0);
        assert.equal(await page.locator('input[type=hidden]').count(), 1);
        assert.equal(await page.evaluate(name => name in window, manager), false);
      }, { pager: true, nativePager: true, fail });
    }
    await scenario('native pager missing handler preserves original before mutation', async page => {
      await page.evaluate(() => { Telerik.Web.UI.Grid.ChangePageSizeComboHandler = undefined; });
      const result = await start(page);
      assert.match(result.cycles[0].error, /required native pager resource/);
      assert.equal(await page.locator('#original').count(), 1);
      assert.equal(await page.evaluate(() => fixtureCreates), 0);
    }, { pager: true, nativePager: true });
    await scenario('native pager existing registry entry is never claimed or disposed', async page => {
      await page.evaluate(id => { fixtureRegistry.set(id, { dispose() { throw new Error('Do not dispose retained pager'); } }); }, suppliedPager.pagerId);
      const result = await start(page);
      assert.match(result.cycles[0].error, /existing component/);
      assert.equal(await page.evaluate(() => fixtureRegistry.size), 1);
    }, { pager: true, nativePager: true });
    await scenario('native pager replacement is protected from parent grid disposal', async page => {
      await start(page);
      await page.evaluate(id => {
        const original = document.getElementById(id), replacement = original.cloneNode(true);
        original.replaceWith(replacement);
        window.replacementPager = { get_element: () => replacement, dispose() { throw new Error('Replacement must survive'); } };
        fixtureRegistry.set(id, replacementPager);
      }, suppliedPager.pagerId);
      await page.waitForFunction(() => usCcoInline.casesReport().status === 'stopped');
      assert.equal(await page.evaluate(id => $find(id) === replacementPager, suppliedPager.pagerId), true);
      assert.equal(await page.evaluate(id => fixtureDisposals.includes(id), id), false);
      assert.equal((await report(page)).cycles[0].cleanup.status, 'incomplete');
    }, { pager: true, nativePager: true });
    await scenario('pager capture works after reload without an installed probe or failed report', async (page, requests) => {
      await page.evaluate(() => { delete window.usCcoInline; });
      const before = requests.length;
      const capture = await page.evaluate(pagerCapture);
      assert.equal(requests.length, before + 1);
      assert.equal(capture.pagerId, id + '_ctl00_ctl03_ctl01_PageSizeComboBox');
      assert.equal(await page.evaluate(() => fixtureCreates), 0);
      assert.equal(await page.evaluate(() => document.getElementById('original') === originalNode), true);
      assert.deepEqual(await page.evaluate(() => window.usCcoCasesPagerResult), capture);
    }, { pager: true });
    await scenario('pager failure keeps inventory; bounded capture makes one GET without insertion or execution', async (page, requests) => {
      const result = await start(page);
      assert.equal(result.cycles[0].status, 'failed');
      assert.equal(result.cycles[0].initializationAttempted, false);
      assert.equal(result.cycles[0].insertion.nativeControls.length, 2);
      assert.equal(result.cycles[0].insertion.status, 'failed');
      await page.evaluate(() => { window.copy = text => { window.copiedPager = text; }; });
      const before = requests.length;
      const capture = await page.evaluate(pagerCapture);
      assert.equal(requests.length, before + 1);
      assert.equal(requests.at(-1).method, 'GET');
      assert.deepEqual(requests.at(-1).params, [['ID', '1001'], ['tag', 'a'], ['tag', 'b'], ['b511e4d055d8', 'Cases']]);
      assert.equal(capture.emittedBeforeGrid, true);
      assert.match(capture.descriptor.eventsSource, /fixturePageSize/);
      assert.equal(capture.descriptor.postBackSources._postBackReference, "__doPostBack('fixturePager','PageSize')");
      assert.equal(capture.descriptor.properties.fields.itemData.length, 1);
      assert.doesNotMatch(await page.evaluate(() => copiedPager), /PRIVATE-|FOREIGN|ORIGINAL/);
      assert.equal(await page.evaluate(() => !!window.captureCalled || !!window.unrelatedStartup || fixtureCreates !== 0), false);
      assert.equal(await page.evaluate(() => document.getElementById('original') === originalNode), true);
    }, { pager: true });
    await scenario('pager capture rejects changed descriptor target', async page => {
      await start(page);
      await page.evaluate(() => { window.usCcoCasesPagerResult = { obsolete: true }; });
      await assert.rejects(page.evaluate(pagerCapture), /exactly one pager descriptor/);
      assert.equal(await page.evaluate(() => 'usCcoCasesPagerResult' in window), false);
    }, { pager: true, pagerWrongTarget: true });
    await scenario('pager capture preserves its result when the clipboard helper fails', async (page, requests) => {
      await start(page);
      await page.evaluate(() => { window.copy = () => { throw new Error('Clipboard unavailable'); }; });
      const before = requests.length;
      const capture = await page.evaluate(pagerCapture);
      assert.equal(requests.length, before + 1);
      const saved = await page.evaluate(() => window.usCcoCasesPagerResult);
      assert.deepEqual(saved, capture);
      assert.doesNotMatch(JSON.stringify(saved), /PRIVATE-|FOREIGN|ORIGINAL/);
      assert.equal(await page.evaluate(() => fixtureCreates), 0);
    }, { pager: true });
    await scenario('pager capture rejects nonempty component references', async page => {
      await start(page);
      await assert.rejects(page.evaluate(pagerCapture), /empty component references/);
    }, { pager: true, pagerReferences: true });
    await scenario('focus-only helpers with a slash after a closing brace do not gate setup and never execute', async page => {
      const result = await start(page);
      assert.equal(result.cycles[0].status, 'initialized');
      assert.equal(result.cycles[0].pager.registered, true);
      assert.deepEqual(await page.evaluate(() => fixtureCreationOrder), [suppliedPager.pagerId, id]);
      assert.equal(await page.evaluate(() => !!(window.helperRan || window.unrelatedStartup || window.unrelatedScriptRan)), false);
      await page.evaluate(() => usCcoInline.stop());
    }, { pager: true, nativePager: true, focusHelper: true });
    for (const option of ['ambiguousSetup', 'ambiguousInCall']) {
      const settings = { pager: true, nativePager: true, focusHelper: true, [option]: true };
      await scenario('ambiguous setup syntax still stops with whole-script location: ' + option, async page => {
        const text = setupScript(settings);
        const offset = text.indexOf('}/') + 1;
        const line = text.slice(0, offset).split('\n').length;
        const result = await start(page);
        assert.equal(result.cycles[0].status, 'failed');
        assert.equal(result.cycles[0].initializationAttempted, false);
        assert.equal(result.cycles[0].error, `Ambiguous slash after a closing brace. [script 3, line ${line}, offset ${offset}]`);
        assert.equal(await page.evaluate(() => fixtureCreates), 0);
        assert.equal(await page.evaluate(() => document.getElementById('original') === originalNode), true);
      }, settings);
    }
    await scenario('unexpected fragment component is named by constructor, target and class without values', async page => {
      const result = await start(page);
      assert.equal(result.cycles[0].status, 'failed');
      assert.equal(result.cycles[0].initializationAttempted, false);
      assert.equal(result.cycles[0].error, `Cases contract: another component descriptor targets the imported fragment: Telerik.Web.UI.RadToolTip -> ${id}_extra (span.Fixture.Extra). [script 1]`);
      assert.doesNotMatch(JSON.stringify(result), /PRIVATE-/);
      assert.equal(await page.evaluate(() => fixtureCreates), 0);
      assert.equal(await page.evaluate(() => document.getElementById('original') === originalNode), true);
    }, { extraComponent: true });
    await scenario('native manager, isolated grid state, source redaction and repeated lifecycle', async (page, requests) => {
      let result = await start(page);
      assert.equal(result.cycles[0].status, 'initialized');
      assert.equal(result.cycles[0].registration.masterTableAttached, true);
      assert.equal(await page.evaluate(() => document.getElementById('__VIEWSTATE').value), 'ORIGINAL');
      assert.equal(await page.locator('input[type=hidden]').count(), 2);
      assert.equal(await page.evaluate(() => !!(window.unrelatedScriptRan || window.unrelatedStartup)), false);
      assert.equal(await page.evaluate(() => document.querySelector('input[id$="_ClientState"]').value), 'PRIVATE-STATE');
      assert.deepEqual(requests[1].params, [['ID', '1001'], ['tag', 'a'], ['tag', 'b'], ['b511e4d055d8', 'Cases']]);
      assert.equal(requests.every(item => item.method === 'GET' && item.path === pathname), true);
      assert.doesNotMatch(JSON.stringify(result), /PRIVATE-|FOREIGN|ORIGINAL/);
      await page.evaluate(() => usCcoInline.refresh());
      await page.evaluate(() => usCcoInline.select(0));
      await page.locator('#original').click();
      assert.equal(await page.evaluate(() => document.getElementById('original') === originalNode && fixtureNativeClicks === 1), true);
      await page.evaluate(() => usCcoInline.select(1));
      await page.evaluate(() => usCcoInline.stop());
      result = await report(page);
      assert.equal(result.status, 'stopped');
      assert.equal(result.cycles.length, 3);
      assert.equal(result.cycles.every(cycle => cycle.cleanup.status === 'disposed'), true);
      assert.equal(await page.evaluate(() => fixtureRegistry.size), 0);
      assert.equal(await page.evaluate(name => name in window, manager), false);
      assert.equal(await page.evaluate(() => fixtureDisposals.length), 6);
    });
    for (const setting of ['badConfig', 'badEvent', 'badProperty', 'badState', 'duplicate']) {
      await scenario('reject changed contract: ' + setting, async page => {
        const result = await start(page);
        assert.equal(result.cycles[0].status, 'failed');
        assert.match(result.cycles[0].error, /Cases contract/);
        assert.equal(await page.evaluate(() => document.getElementById('original') === originalNode), true);
        assert.equal(await page.evaluate(() => fixtureCreates), 0);
      }, { [setting]: true });
    }
    for (const fail of ['early', 'partial', 'unregistered']) {
      await scenario('release partial construction: ' + fail, async page => {
        const result = await start(page);
        assert.equal(result.cycles[0].status, 'failed');
        assert.equal(await page.evaluate(() => fixtureRegistry.size), 0);
        assert.equal(await page.evaluate(name => name in window, manager), false);
        assert.equal(await page.locator('input[id$="_ClientState"]').count(), 0);
        await assert.rejects(page.evaluate(() => usCcoInline.refresh()), /failed/);
        await page.evaluate(() => usCcoInline.stop());
        assert.equal(await page.evaluate(() => document.getElementById('original') === originalNode), true);
      }, { fail });
    }
    await scenario('retained manager is never overwritten', async page => {
      await page.evaluate(name => { window[name] = { retained: true }; }, manager);
      await assert.rejects(start(page), /retained/);
      assert.equal(await page.evaluate(name => window[name].retained, manager), true);
    });
    await scenario('retained component is never disposed', async page => {
      await page.evaluate(id => fixtureRegistry.set(id, { get_id: () => id, dispose: () => { throw new Error('Must not dispose'); } }), id);
      await assert.rejects(start(page), /retained/);
      assert.equal(await page.evaluate(() => fixtureRegistry.size), 1);
    });
    await scenario('missing native resources preserve original', async page => {
      await page.evaluate(() => { window.Asi_Web_BusinessDataGrid2 = undefined; });
      await assert.rejects(start(page), /requires the existing/);
      assert.equal(await page.evaluate(() => document.getElementById('original') === originalNode), true);
    });
    await scenario('other tabs and original refresh stay outside the trial', async page => {
      await start(page);
      await assert.rejects(page.evaluate(() => usCcoInline.select(2)), /Cases and return/);
      await page.evaluate(() => usCcoInline.select(0));
      await assert.rejects(page.evaluate(() => usCcoInline.refresh()), /Cases and return/);
    });
    await scenario('stop aborts a pending response without creating a grid', async page => {
      await page.evaluate(async () => { const pending = usCcoInline.startCasesTrial(); await new Promise(resolve => setTimeout(resolve, 30)); usCcoInline.stop(); await pending; });
      assert.equal(await page.evaluate(() => fixtureCreates), 0);
      assert.equal((await report(page)).status, 'stopped');
    }, { delay: true });
    await scenario('external replacement survives cleanup with explicit incomplete report', async page => {
      await start(page);
      await page.evaluate(({ id, manager }) => {
        const old = document.getElementById(id), replacement = old.cloneNode(true);
        old.replaceWith(replacement);
        window.nativeReplacement = { get_element: () => replacement, get_id: () => id, dispose: () => { throw new Error('Must preserve replacement'); } };
        fixtureRegistry.set(id, nativeReplacement);
        window[manager] = { replacement: true };
      }, { id, manager });
      await page.waitForFunction(() => usCcoInline.casesReport().status === 'stopped');
      assert.equal(await page.evaluate(id => $find(id) === nativeReplacement, id), true);
      assert.equal(await page.evaluate(name => window[name].replacement, manager), true);
      assert.equal((await report(page)).cycles[0].cleanup.status, 'incomplete');
      assert.equal(await page.locator('#original').count(), 0);
    });
    await scenario('native disposal failure is visible and never silently passes', async page => {
      await start(page);
      await page.evaluate(() => usCcoInline.stop());
      const result = await report(page);
      assert.equal(result.cycles[0].cleanup.status, 'incomplete');
      assert.match(result.cleanupError, /reload required/);
    }, { fail: 'dispose' });
    console.log(`${passed} Cases trial scenarios passed (synthetic grid; no live iMIS acceptance).`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
