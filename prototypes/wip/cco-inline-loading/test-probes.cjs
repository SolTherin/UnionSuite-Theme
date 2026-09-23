const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(path.resolve(__dirname, '../../../.tmp-iqa-integration/node_modules/playwright'));
const source = fs.readFileSync(path.join(__dirname, 'CCO-Inline-Probes.js'), 'utf8');
const callbackCapture = fs.readFileSync(path.join(__dirname, 'Capture-Cases-Callbacks.js'), 'utf8');
const managerCapture = fs.readFileSync(path.join(__dirname, 'Capture-Cases-Manager.js'), 'utf8');
const suppliedCallbacks = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'research/native-cco-handover/evidence/native-cases-callback-source.json'), 'utf8')).report;
const parent = '11111111-1111-4111-8111-111111111111';
const placement = '22222222-2222-4222-8222-222222222222';
const folder = '33333333-3333-4333-8333-333333333333';
const fallbackFolder = '77777777-7777-4777-8777-777777777777';
const pages = ['44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555', '66666666-6666-4666-8666-666666666666'];
const names = ['Original', 'Tasks', 'Other'];
const html = (body, head = '') => '<!doctype html><html><head><title>Fixture</title>' + head + '</head><body>' + body + '</body></html>';
const nativePath = '@/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Account_Page_Staff';
const canonicalHref = '/UTStaff/' + nativePath.slice(2) + '.aspx?ID=10420';
const strip = (selected, id) => `<div id="${id}" class="RadTabStrip"><div class="rtsLevel"><ul class="rtsUL">${names.map((name, i) => `<li class="rtsLI"><a href="#" class="rtsLink ${i === selected ? 'rtsSelected' : ''}" onclick="window.nativeClicks++"><span class="rtsTxt">${name}</span></a></li>`).join('')}</ul></div></div>`;
const cco = (selected = 0, content = '<input id="retained" value="original"><button id="originalButton" type="button">Original listener</button>') => `<div class="ContentItemContainer" id="ste_container_ciDirectory"><div class="author-wrapper"><div class="cco">${strip(selected, 'top')}<div id="multipage" class="RadMultiPage">${names.map((_, i) => `<div class="rmpView" style="display:${selected === i ? 'block' : 'none'}">${i === selected ? content : ''}</div>`).join('')}</div>${strip(selected, 'bottom')}</div></div></div>`;
const content = label => `<div class="ContentItemContainer" id="ste_container_ci${label}"><div class="panel"><p>${label} content</p><input id="edit${label}" value=""><a href="details.aspx">Relative link</a><input type="hidden" name="__VIEWSTATE" value="foreign"><script>window.fetchedScriptRan = true;</script></div></div>`;
// Deliberately synthetic descriptors, not a captured Telerik/iMIS contract.
const diagnosticGrid = '<div class="ContentItemContainer" id="ste_container_Cases"><div class="panel"><div class="RadGrid" id="fixture_Cases_Grid"><table><tr><td>Private fixture row</td></tr></table></div><input type="hidden" id="fixture_Cases_Grid_ClientState" value="PRIVATE-STATE"><div id="fixture_dependency"></div></div></div>';
const diagnosticSetup = `<script>
window.Telerik = { Web: { UI: { RadGrid: function FixtureGrid() {} } } };
window.fixtureLoaded = function() {};
window.$get = id => document.getElementById(id);
window.$create = (type, properties, events, references, element) => {
  window.fixtureControl = { get_element: () => element };
};
window.$find = id => id === 'fixture_Cases_Grid' ? window.fixtureControl : null;
</script>`;
const diagnosticDescriptor = `<script>
$create(Telerik.Web.UI.RadGrid, {"clientStateFieldID":"fixture_Cases_Grid_ClientState","uniqueID":"fixture$Cases$Grid","privateValue":"DO-NOT-REPORT","nested":{"enabled":true}}, {"gridCreated":fixtureLoaded,"command":fixtureMissingCallback}, {"owner":"fixture_dependency"}, $get("fixture_Cases_Grid"));
</script>`;
function documentFixture(settings) {
  const field = (prefix, name, value) => `<${prefix}:${name}>${String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</${prefix}:${name}>`;
  const config = settings.dynamic ? { SourceKey: folder, SourceFolder: '@/_i4u_/Example/Tabs', DefaultSourceKey: fallbackFolder, DefaultSourceFolder: '@/iCore/Example/Tabs' }
    : { UseContentFolder: 'true', ContentFolderKey: folder, URLKeyName: 'Directory', TabbedDialogSettings: 'stale settings ignored' };
  const identity = { ContentKey: settings.wrongParent ? placement : parent, ContentItemKey: settings.wrongPlacement ? parent : placement, ContentItemName: settings.dynamic ? 'Account page tabs — café' : 'Directory' };
  const item = (key = identity.ContentItemKey) => `<a:ContentItem i:type="b:${settings.dynamic ? 'DynamicContentCollectionOrganizer' : 'ContentCollectionOrganizer'}">${Object.entries({ ...identity, ContentItemKey: key }).map(([name, value]) => field('a', name, value)).join('')}${Object.entries(config).map(([name, value]) => field('b', name, value)).join('')}</a:ContentItem>`;
  let xml = `<Content xmlns="http://schemas.imis.com/2008/01/DataContracts/Content" xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:a="http://schemas.imis.com/2008/01/DataContracts/ContentItem" xmlns:b="http://schemas.datacontract.org/2004/07/Asi.Web.iParts.Common.ContentCollectionOrganizer"><ContentItems>${item()}${settings.multipleCcos ? item(fallbackFolder) : ''}</ContentItems></Content>`;
  if (settings.invalidXml) xml = '<Content>';
  if (settings.doctype) xml = '<!DOCTYPE Content []>' + xml;
  const record = {
    DocumentId: '88888888-8888-4888-8888-888888888888', DocumentVersionId: settings.wrongDvk ? placement : parent,
    DocumentTypeId: 'CON', Status: settings.working ? 'Working' : 'Published',
    Data: { $type: 'System.Byte[], mscorlib', $value: settings.invalidBase64 ? '!!!' : Buffer.from(xml).toString('base64') }
  };
  const records = settings.emptyDocuments ? [] : settings.multipleDocuments ? [record, record] : [record];
  return { Items: { $values: records }, TotalCount: settings.paged ? 2 : records.length, HasNext: !!settings.paged };
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
      const entry = { path: url.pathname, search: url.search, method: route.request().method() };
      requests.push(entry);
      let body, type = 'text/html';
      if (url.pathname === '/api/Document') {
        assert.equal(url.searchParams.get('DocumentVersionID'), parent);
        assert.equal(url.searchParams.get('DocumentStatusID'), '40');
        type = 'application/json'; body = JSON.stringify(documentFixture(settings));
      } else if (url.pathname === '/api/ContentItem') {
        if (!url.searchParams.has('ContentKey') || !url.searchParams.has('ContentItemKey')) {
          await route.fulfill({ status: 404, body: 'Both keys are required on the observed tenant.' }); return;
        }
        type = 'application/json';
        body = JSON.stringify({ Items: { $values: [{ Data: {
          ContentKey: settings.wrongParent ? placement : parent, ContentItemKey: settings.wrongPlacement ? parent : placement,
          ContentItemName: settings.dynamic ? 'Account page tabs' : 'Directory',
          ...(settings.dynamic ? {
            $type: 'Asi.Web.iParts.Common.ContentCollectionOrganizer.DynamicContentCollectionOrganizerCommon, Asi.Web.iParts',
            SourceKey: folder, SourceFolder: '@/_i4u_/Example/Tabs',
            DefaultSourceKey: fallbackFolder, DefaultSourceFolder: '@/iCore/Example/Tabs'
          } : {
            UseContentFolder: true, TabbedDialogSettings: 'stale-manual-settings-ignored', ContentFolderKey: folder, URLKeyName: 'Directory'
          })
        } }] } });
      } else if (url.pathname === '/api/Document/_execute') {
        const payload = JSON.parse(route.request().postData());
        entry.operation = payload.OperationName;
        if (payload.OperationName === 'FindByPath') {
          entry.lookupPath = payload.Parameters.$values[0].$value;
          assert.deepEqual(payload.ParameterTypeName.$values, ['System.String']);
          assert.equal(payload.UseJson, false);
          if (settings.identityDelay) await new Promise(resolve => setTimeout(resolve, 180));
          if (settings.identityDenied) { await route.fulfill({ status: 403, body: 'Denied' }); return; }
          const record = {
            DocumentVersionId: settings.identityInvalidKey ? 'not-a-guid' : parent,
            DocumentTypeId: settings.identityWrongType ? 'IQD' : 'CON',
            Path: settings.identityWrongPath ? '@/Other' : entry.lookupPath
          };
          const result = settings.identityEmpty ? null : settings.identityMultiple ? { Documents: [record, record] }
            : settings.identityPaged ? { Documents: { $values: [record] }, HasNext: true }
            : settings.identityWrapped ? { Documents: { $values: [record] } } : record;
          await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ Result: result }) }); return;
        }
        assert.equal(payload.OperationName, 'FindDocumentsInFolder');
        entry.folderKey = payload.Parameters.$values[0];
        if (settings.folderError) { await route.fulfill({ status: 403, body: 'Denied' }); return; }
        type = 'application/json';
        const items = settings.emptySource && entry.folderKey === folder ? [] : pages.map((id, i) => ({ DocumentVersionId: id, DocumentTypeId: 'CON', Name: names[i], AlternateName: settings.duplicateCaption ? 'Tasks' : names[i], Status: 'Published' }));
        body = JSON.stringify({ Result: { $values: items } });
      } else if (url.pathname.includes('ContentPreview')) {
        const index = pages.indexOf(url.searchParams.get('iUniformKey'));
        if (settings.delay && index === 1) await new Promise(resolve => setTimeout(resolve, 180));
        let fragment = content(names[index]);
        if (settings.passwordForm) fragment += '<label>New password<input id="newPassword" type="password" autocomplete="new-password"></label>';
        if (settings.missingPagination) fragment += `<script>var contentItemId = '#missingResults'; var resultsPerPage = '1'; var hidePageNumbers = 'false'; var pageElement = 'section'; jQuery(contentItemId).simplePaginate({});</script>`;
        if (settings.paginationLoss) fragment += `<input type="hidden" id="removedTarget"><script>var contentItemId = '#removedTarget'; var resultsPerPage = '1'; var hidePageNumbers = 'false'; var pageElement = 'section'; jQuery(contentItemId).simplePaginate({});</script>`;
        if (settings.pagination) fragment += `<div id="queryResults"><section>One</section><section>Two</section></div><script>var contentItemId = '#queryResults'; var resultsPerPage = '1'; var hidePageNumbers = 'false'; var pageElement = 'section'; jQuery(contentItemId).simplePaginate({});</script>`;
        if (settings.collision) fragment += '<div id="outside">Collision</div>';
        if (settings.nested) fragment += cco(0, 'Nested content');
        body = settings.login ? html('<input type="password"><input type="submit" class="SignInButton" value="Sign in">') : html('<div id="MainPanel"><div class="EmptyMasterContentPanel">' + fragment + '</div></div>');
      } else {
        const index = Number(url.searchParams.get('tab') || 0);
        if (index) {
          if (settings.diagnosticDelay) await new Promise(resolve => setTimeout(resolve, 100));
          body = html('<header>Repeated parent banner must not be inserted</header>' + cco(settings.wrongTab ? 0 : index, content(names[index]) + (settings.diagnostic ? diagnosticGrid : '')) + (settings.diagnostic ? diagnosticDescriptor : ''));
        } else {
          const identityHead = settings.nativeIdentity ? `<link rel="canonical" href="${settings.canonicalHref || canonicalHref}"><script>window.gWebSiteRoot = 'http://cco.test/UTStaff';</script>` : '';
          body = html('<form><input type="hidden" name="__VIEWSTATE" value="original-state"><div id="outside">Outer content</div>' + cco() + '</form><script>window.nativeClicks=0; window.originalClicks=0; document.getElementById("originalButton").addEventListener("click",()=>window.originalClicks++);</script>' + (settings.diagnostic ? diagnosticSetup : ''), identityHead);
        }
      }
      await route.fulfill({ contentType: type, body });
    });
    try {
      await page.goto('http://cco.test/Page.aspx?ID=1001&tag=a&tag=b');
      await page.addScriptTag({ content: source });
      await run(page, requests);
      assert.deepEqual(errors, []);
      console.log('PASS ' + name); passed++;
    } finally { await context.close(); }
  }
  const childOptions = { parentDvk: parent };
  const child = page => page.evaluate(options => usCcoInline.startChild(options), childOptions);
  const parentMode = page => page.evaluate(() => usCcoInline.startParent({
    selectionParameters: ['tab'],
    tabUrls: { Tasks: location.href + '&tab=1', Other: location.href + '&tab=2' }
  }));
  const select = (page, index) => page.evaluate(i => usCcoInline.select(i), index);
  try {
    const diagnose = page => page.evaluate(() => usCcoInline.gridDiagnostics({ selector: '#ste_container_Cases .RadGrid' }));
    await scenario('manager capture: collects setup and inherited method source without runtime values or calls', async (page, requests) => {
      await page.evaluate(grid => {
        document.querySelector('.rmpView').insertAdjacentHTML('beforeend', grid);
        const element = document.getElementById('fixture_Cases_Grid');
        window.fixtureControl = { get_element: () => element };
        window.fixtureCalls = 0;
        function FixtureManager() { this.privateState = 'default-configuration'; }
        FixtureManager.prototype.OnGridCreated = function() { window.fixtureCalls++; };
        FixtureManager.prototype.OnRowCreated = function() { window.fixtureCalls++; };
        FixtureManager.prototype.OnLoad = function(id) { window.fixtureCalls++; };
        window.fixture_Cases_Grid_jsmanager = new FixtureManager();
        window.fixture_Cases_Grid_jsmanager.privateState = 'PRIVATE-RUNTIME-VALUE';
        Object.defineProperty(window.fixture_Cases_Grid_jsmanager, 'OnRowSelected', { get() { window.fixtureCalls++; return function() {}; } });
        const script = document.createElement('script'); script.type = 'application/x-fixture';
        script.textContent = 'window["fixture_Cases_Grid_jsmanager"] = new FixtureManager();\nwindow["fixture_Cases_Grid_jsmanager"].OnLoad("fixture_Cases_Grid");\n$create(Telerik.Web.UI.RadGrid, {"ClientID":"fixture_Cases_Grid","_clientKeyValues":{"key":"PRIVATE-ROW-VALUE"}}, {"gridCreated":window["fixture_Cases_Grid_jsmanager"].OnGridCreated}, null, $get("fixture_Cases_Grid"));';
        document.body.append(script);
        const diagnose = usCcoInline.gridDiagnostics;
        usCcoInline.gridDiagnostics = () => diagnose({ selector: '#ste_container_Cases .RadGrid' });
        window.copy = text => { window.fixtureCopied = text; };
      }, diagnosticGrid);
      const requestCount = requests.length;
      const result = await page.evaluate(managerCapture);
      assert.equal(result.managerAvailable, true);
      assert.equal(result.startupLines.length, 2);
      assert.equal(result.skippedLines.length, 1);
      assert.match(result.methods.find(item => item.name === 'OnLoad').source, /function\(id\)/);
      assert.equal(result.methods.find(item => item.name === 'OnRowSelected').reason, 'Accessor not invoked.');
      assert.equal(await page.evaluate(() => fixtureCalls), 0);
      const copied = await page.evaluate(() => fixtureCopied);
      // Constructor source can legitimately contain configuration literals;
      // the runtime field's mutated value is never serialized as field data.
      assert.equal(result.fields.find(item => item.name === 'privateState').type, 'string');
      assert.equal(copied.includes('PRIVATE-ROW-VALUE'), false);
      assert.equal(copied.includes('PRIVATE-RUNTIME-VALUE'), false);
      assert.equal(result.fields.some(item => 'value' in item), false);
      assert.equal(requests.length, requestCount);
    }, { diagnostic: true });
    await scenario('manager capture: global accessors and inserted controls are not invoked or captured', async page => {
      await page.evaluate(grid => {
        document.querySelector('.rmpView').insertAdjacentHTML('beforeend', grid);
        window.fixtureControl = { get_element: () => document.getElementById('fixture_Cases_Grid') };
        window.fixtureCalls = 0;
        Object.defineProperty(window, 'fixture_Cases_Grid_jsmanager', { configurable: true, get() { window.fixtureCalls++; return {}; } });
        const diagnose = usCcoInline.gridDiagnostics;
        usCcoInline.gridDiagnostics = () => diagnose({ selector: '#ste_container_Cases .RadGrid' });
      }, diagnosticGrid);
      const result = await page.evaluate(managerCapture);
      assert.equal(result.managerAvailable, false);
      assert.equal(result.managerAccessorSkipped, true);
      assert.equal(await page.evaluate(() => fixtureCalls), 0);
      await parentMode(page); await select(page, 1);
      await assert.rejects(page.evaluate(managerCapture), /registered native Cases grid/);
    }, { diagnostic: true });
    await scenario('grid diagnostics: supplied native focus helper and window manager references', async page => {
      await page.evaluate(({ grid, supplied }) => {
        document.querySelector('.rmpView').insertAdjacentHTML('beforeend', grid.replaceAll('fixture_Cases_Grid', supplied.gridId));
        const add = text => {
          const script = document.createElement('script'); script.type = 'application/x-fixture';
          script.textContent = text; document.body.append(script);
        };
        add(supplied.shortRelatedHelpers[0].source);
        add('$create(Telerik.Web.UI.RadGrid, {}, ' + supplied.eventsSource + ', null, $get("' + supplied.gridId + '"));');
        window[supplied.gridId + '_jsmanager'] = {
          OnGridCreated() {}, OnRowCreated() {}, OnRowDeselected() {}, OnRowSelected() {}
        };
      }, { grid: diagnosticGrid, supplied: suppliedCallbacks });
      const report = await diagnose(page);
      assert.deepEqual(report.unsupportedScripts, []);
      assert.equal(report.descriptors[0].eventsSupported, true);
      assert.deepEqual(report.descriptors[0].events.map(event => event.available), [true, true, true, true]);
      assert.deepEqual(report.descriptors[0].events.map(event => event.name), ['gridCreated', 'rowCreated', 'rowDeselected', 'rowSelected']);
    }, { diagnostic: true });
    await scenario('grid diagnostics: manager lookup supports inherited methods without invoking getters or expressions', async page => {
      await page.evaluate(grid => {
        document.querySelector('.rmpView').insertAdjacentHTML('beforeend', grid);
        window.fixtureGetterCalls = 0;
        window.fixtureManager = Object.create({ OnRowCreated() {} });
        Object.defineProperty(window.fixtureManager, 'OnGridCreated', { get() { window.fixtureGetterCalls++; return function() {}; } });
        const script = document.createElement('script'); script.type = 'application/x-fixture';
        script.textContent = `$create(Telerik.Web.UI.RadGrid, {}, {"gridCreated":window['fixtureManager'].OnGridCreated,"rowCreated":window["fixtureManager"].OnRowCreated,"rowSelected":window[fixtureDynamicName()].OnRowSelected}, null, $get("fixture_Cases_Grid"));`;
        document.body.append(script);
      }, diagnosticGrid);
      const report = await diagnose(page);
      assert.equal(report.descriptors[0].eventsSupported, false);
      assert.deepEqual(report.descriptors[0].events.map(event => event.available), [false, true]);
      assert.equal(await page.evaluate(() => fixtureGetterCalls), 0);
      assert.equal(JSON.stringify(report).includes('fixtureDynamicName'), false);
    }, { diagnostic: true });
    await scenario('callback capture: extracts inline events and a small helper without row properties or execution', async (page, requests) => {
      await page.evaluate(grid => {
        document.querySelector('.rmpView').insertAdjacentHTML('beforeend', grid);
        const add = text => {
          const script = document.createElement('script');
          script.type = 'application/x-fixture'; script.textContent = text; document.body.append(script);
        };
        const properties = {
          ClientID: 'fixture_Cases_Grid',
          _clientKeyValues: { 0: { case: 'PRIVATE-CASE-NUMBER' } },
          _gridTableViewsData: JSON.stringify({ field: 'PRIVATE-TABLE-DATA', braces: '{}', quoted: '"' })
        };
        add('\n$create(Telerik.Web.UI.RadGrid, ' + JSON.stringify(properties, null, 2) + ', {"command":function(sender, args) { window.fixtureCalls++; }}, null, $get("fixture_Cases_Grid"));\nwindow.unrelated = "PRIVATE-OUTER";');
        add('var helper = function() { return "fixture_Cases_Grid"; } / 1;');
        window.fixtureCalls = 0;
        const diagnose = usCcoInline.gridDiagnostics;
        usCcoInline.gridDiagnostics = () => diagnose({ selector: '#ste_container_Cases .RadGrid' });
        window.copy = text => { window.fixtureCopied = text; };
      }, diagnosticGrid);
      const requestCount = requests.length;
      const result = await page.evaluate(callbackCapture);
      assert.equal(result.eventsSource, '{"command":function(sender, args) { window.fixtureCalls++; }}');
      assert.equal(result.referencesSource, 'null');
      assert.equal(result.shortRelatedHelpers.length, 1);
      assert.match(result.shortRelatedHelpers[0].source, /var helper/);
      const copied = await page.evaluate(() => fixtureCopied);
      assert.deepEqual(JSON.parse(copied), result);
      for (const secret of ['PRIVATE-', '_clientKeyValues', '_gridTableViewsData', 'original-state']) assert.equal(copied.includes(secret), false);
      assert.equal(await page.evaluate(() => fixtureCalls), 0);
      assert.equal(await page.evaluate(() => window.fixtureControl), undefined);
      assert.equal(await page.locator('input[name="__VIEWSTATE"]').inputValue(), 'original-state');
      assert.equal(requests.length, requestCount);
    }, { diagnostic: true });
    await scenario('callback capture: rejects inserted sources and malformed matching boundaries', async page => {
      await parentMode(page); await select(page, 1);
      await page.evaluate(() => {
        const diagnose = usCcoInline.gridDiagnostics;
        usCcoInline.gridDiagnostics = () => diagnose({ selector: '#ste_container_Cases .RadGrid' });
        window.copy = () => { throw new Error('Unexpected copy'); };
      });
      await assert.rejects(page.evaluate(callbackCapture), /Run on native Cases/);
      await page.evaluate(grid => {
        usCcoInline.stop();
        document.querySelector('.rmpView').insertAdjacentHTML('beforeend', grid);
        const script = document.createElement('script'); script.type = 'application/x-fixture';
        script.textContent = '$create(Telerik.Web.UI.RadGrid, {"ClientID":"fixture_Cases_Grid"}, {}, {}, $get("fixture_Cases_Grid"));';
        document.body.append(script);
        const report = usCcoInline.gridDiagnostics();
        usCcoInline.gridDiagnostics = () => report;
        script.textContent = script.textContent.replace('$get("fixture_Cases_Grid")', '$get("changed_target")');
      }, diagnosticGrid);
      await assert.rejects(page.evaluate(callbackCapture), /one bounded Cases call ending/);
    }, { diagnostic: true });
    await scenario('grid diagnostics: inspect an attached native baseline without requests or execution', async (page, requests) => {
      await page.evaluate(({ grid, descriptor }) => {
        document.querySelector('.rmpView').insertAdjacentHTML('beforeend', grid);
        // Attach a fake registry baseline; the descriptor stays inert as text.
        window.fixtureControl = { get_element: () => document.getElementById('fixture_Cases_Grid') };
        document.body.insertAdjacentHTML('beforeend', descriptor);
      }, { grid: diagnosticGrid, descriptor: diagnosticDescriptor });
      const count = requests.length;
      const report = await diagnose(page);
      assert.equal(report.rendering, 'native-dom');
      assert.equal(report.registered, true);
      assert.equal(report.attachedToCurrentElement, true);
      assert.equal(report.descriptors.length, 1);
      assert.equal(report.descriptors[0].constructorAvailable, true);
      assert.deepEqual(report.descriptors[0].events.map(event => event.available), [true, false]);
      assert.equal(requests.length, count);
    }, { diagnostic: true });
    await scenario('grid diagnostics: use captured outer startup code and distinguish a stale registry object', async (page, requests) => {
      await page.evaluate(() => { window.fixtureControl = { get_element: () => document.createElement('div') }; });
      await parentMode(page); await select(page, 1);
      const count = requests.length;
      const report = await diagnose(page);
      assert.equal(report.rendering, 'parent-inserted');
      assert.equal(report.registered, true);
      assert.equal(report.attachedToCurrentElement, false);
      assert.equal(report.relatedScripts[0].insideSource, false);
      assert.equal(report.descriptors.length, 1);
      assert.equal(report.descriptors[0].properties.fields.clientStateFieldID.id, 'fixture_Cases_Grid_ClientState');
      assert.equal(report.descriptors[0].properties.fields.clientStateFieldID.liveCount, 0);
      assert.equal(report.descriptors[0].references[0].id, 'fixture_dependency');
      assert.equal(report.hiddenInputs[0].sourceHidden, true);
      assert.equal(report.hiddenInputs[0].liveCount, 0);
      assert.equal(requests.length, count);
      const serialized = JSON.stringify(report);
      for (const secret of ['PRIVATE-STATE', 'DO-NOT-REPORT', 'Private fixture row', 'original-state', '1001']) assert.equal(serialized.includes(secret), false);
      assert.equal(await page.locator('input[name="__VIEWSTATE"]').inputValue(), 'original-state');
      assert.equal(await page.evaluate(() => window.fetchedScriptRan), undefined);
    }, { diagnostic: true });
    await scenario('grid diagnostics: a missing client registration remains distinct from available constructor', async page => {
      await parentMode(page); await select(page, 1);
      const report = await diagnose(page);
      assert.equal(report.radGridTypeAvailable, true);
      assert.equal(report.registered, false);
      assert.equal(report.attachedToCurrentElement, false);
    }, { diagnostic: true });
    await scenario('grid diagnostics: refresh drops old source and rejects a partially replaced grid', async page => {
      await parentMode(page); await select(page, 1);
      await page.evaluate(() => {
        const grid = document.getElementById('fixture_Cases_Grid');
        grid.replaceWith(grid.cloneNode(true));
      });
      await assert.rejects(diagnose(page), /replaced after insertion/);
      await page.evaluate(() => usCcoInline.refresh());
      assert.equal((await diagnose(page)).descriptors.length, 1);
      await select(page, 0);
      await assert.rejects(diagnose(page), /expected one match, found 0/);
      await select(page, 1);
      await page.evaluate(() => usCcoInline.stop());
      await assert.rejects(diagnose(page), /expected one match, found 0/);
    }, { diagnostic: true });
    await scenario('grid diagnostics: refuse a source comparison while a newer tab request is pending', async page => {
      await parentMode(page); await select(page, 1);
      const result = await page.evaluate(async () => {
        const pending = usCcoInline.select(2);
        let message;
        try { usCcoInline.gridDiagnostics({ selector: '#ste_container_Cases .RadGrid' }); }
        catch (error) { message = error.message; }
        await pending;
        return message;
      });
      assert.match(result, /Wait for the tab/);
    }, { diagnostic: true, diagnosticDelay: true });
    await scenario('grid diagnostics: distinguish unsupported script syntax and omit arbitrary expressions', async page => {
      await page.evaluate(grid => {
        document.querySelector('.rmpView').insertAdjacentHTML('beforeend', grid);
        const add = text => { const script = document.createElement('script'); script.type = 'application/x-fixture'; script.textContent = text; document.body.append(script); };
        add(`// $create(Fake, {}, null, null, $get("fixture_Cases_Grid"));\nconst example = '$create(Fake, {}, null, null, $get("fixture_Cases_Grid"))';`);
        add('$create(Telerik.Web.UI.RadGrid, window.DO_NOT_EXECUTE(), {"load":function() { window.DO_NOT_EXECUTE(); }}, null, $get("fixture_Cases_Grid"));');
        add('const example = `fixture_Cases_Grid`;');
        window.DO_NOT_EXECUTE = () => { throw new Error('Diagnostic executed source'); };
      }, diagnosticGrid);
      const report = await diagnose(page);
      assert.equal(report.descriptors.length, 1);
      assert.equal(report.descriptors[0].properties.supported, false);
      assert.equal(report.descriptors[0].eventsSupported, false);
      assert.equal(report.unsupportedScripts.length, 1);
      assert.match(report.unsupportedScripts[0].reason, /Template literal/);
      assert.equal(Number.isInteger(report.unsupportedScripts[0].offset), true);
      assert.equal(JSON.stringify(report).includes('DO_NOT_EXECUTE'), false);
    }, { diagnostic: true });
    await scenario('grid diagnostics: slash syntax and HTML comments do not hide a later descriptor', async page => {
      await page.evaluate(({ grid, descriptor }) => {
        document.querySelector('.rmpView').insertAdjacentHTML('beforeend', grid);
        const script = document.createElement('script'); script.type = 'application/x-fixture';
        script.textContent = [
          '<!-- legacy WebForms wrapper',
          'var width = 960 / 2; width /= 2;',
          'object.if() / 2;',
          'var pattern = /[\\/)]|\\$create\\(Fake, null, null, null, \\$get\\("fixture_Cases_Grid"\\)\\)/g;',
          'if (width) /fixture_Cases_Grid/.test("example");',
          'while (width) { width--; width / 2; }',
          'var factory = function () { return /fixture_Cases_Grid/; };',
          '//<![CDATA[',
          descriptor.replace(/^<script>/, '').replace(/<\/script>$/, ''),
          '//]]>',
          '--> end legacy wrapper'
        ].join('\n');
        document.body.append(script);
      }, { grid: diagnosticGrid, descriptor: diagnosticDescriptor });
      const report = await diagnose(page);
      assert.equal(report.descriptors.length, 1);
      assert.equal(report.descriptors[0].constructor, 'Telerik.Web.UI.RadGrid');
      assert.equal(report.descriptors[0].properties.supported, true);
      assert.deepEqual(report.unsupportedScripts, []);
    }, { diagnostic: true });
    await scenario('grid diagnostics: an unrelated unsupported create target does not hide Cases', async page => {
      await page.evaluate(({ grid, descriptor }) => {
        document.querySelector('.rmpView').insertAdjacentHTML('beforeend', grid);
        const script = document.createElement('script'); script.type = 'application/x-fixture';
        script.textContent = '$create(OuterControl, {}, null, null, document.body);\n' + descriptor.replace(/^<script>/, '').replace(/<\/script>$/, '');
        document.body.append(script);
      }, { grid: diagnosticGrid, descriptor: diagnosticDescriptor });
      const report = await diagnose(page);
      assert.equal(report.descriptors.length, 1);
      assert.equal(report.unsupportedScripts.length, 1);
      assert.match(report.unsupportedScripts[0].reason, /Continuing after this call/);
    }, { diagnostic: true });
    await scenario('grid diagnostics: ambiguous slash and malformed regex report positions without source text', async page => {
      await page.evaluate(grid => {
        document.querySelector('.rmpView').insertAdjacentHTML('beforeend', grid);
        for (const text of ['var value = {} / 2; // fixture_Cases_Grid', 'var pattern = /fixture_Cases_Grid\n']) {
          const script = document.createElement('script'); script.type = 'application/x-fixture'; script.textContent = text; document.body.append(script);
        }
      }, diagnosticGrid);
      const report = await diagnose(page);
      assert.equal(report.descriptors.length, 0);
      assert.deepEqual(report.unsupportedScripts.map(item => item.reason), ['Ambiguous slash after a closing brace.', 'Unterminated regex literal.']);
      assert.equal(report.unsupportedScripts.every(item => Number.isInteger(item.offset) && item.line === 1), true);
    }, { diagnostic: true });
    await scenario('grid diagnostics: reject duplicate target IDs', async page => {
      await page.evaluate(grid => document.querySelector('.rmpView').insertAdjacentHTML('beforeend', grid + grid), diagnosticGrid);
      await assert.rejects(diagnose(page), /expected one match, found 2/);
    }, { diagnostic: true });
    await scenario('grid diagnostics: redact resource queries and unresolved reference strings', async page => {
      await page.evaluate(grid => {
        document.querySelector('.rmpView').insertAdjacentHTML('beforeend', grid);
        const add = (text, src) => {
          const script = document.createElement('script'); script.type = 'application/x-fixture';
          if (src) script.setAttribute('src', src); else script.textContent = text;
          document.body.append(script);
        };
        add('', '/ScriptResource.axd?d=PRIVATE-TOKEN');
        add('', 'data:text/javascript,PRIVATE-SCRIPT');
        add('$create(Telerik.Web.UI.RadGrid, {}, null, {"missing":"PRIVATE-REFERENCE"}, $get("fixture_Cases_Grid"));');
      }, diagnosticGrid);
      const report = await diagnose(page);
      assert.deepEqual(report.resources[0], { path: 'http://cco.test/ScriptResource.axd', queryKeys: ['d'], exactUrlPresentInLiveDocument: true });
      assert.equal(report.resources[1].urlOmitted, true);
      assert.deepEqual(report.descriptors[0].references, [{ name: 'missing', unresolved: true, identifierOmitted: true }]);
      assert.equal(JSON.stringify(report).includes('PRIVATE-'), false);
    }, { diagnostic: true });
    await scenario('native identity: canonical path starts child mode without any keys or Easy Edit', async (page, requests) => {
      const result = await page.evaluate(() => usCcoInline.startChild());
      assert.deepEqual(result.keys, {
        parentDvk: parent, contentKey: parent, contentItemKey: placement,
        pagePath: nativePath, identitySource: 'canonical-path',
        childPages: pages.map((id, index) => ({ tab: names[index], contentKey: id }))
      });
      assert.deepEqual(requests.filter(row => row.lookupPath).map(row => row.lookupPath), [nativePath]);
      assert.equal(requests.some(row => row.path === '/api/ContentItem'), false);
      await select(page, 1);
      const url = new URL(requests.find(row => row.path.includes('ContentPreview')).search, 'http://cco.test');
      assert.equal(url.searchParams.get('ID'), '1001');
      assert.equal(url.searchParams.get('iUniformKey'), pages[1]);
    }, { nativeIdentity: true, dynamic: true });
    await scenario('native identity: keys command handles wrapped result without installing interception', async (page, requests) => {
      const keys = await page.evaluate(() => usCcoInline.keys());
      assert.equal(keys.parentDvk, parent);
      assert.equal(keys.contentItemKey, placement);
      assert.equal(await page.locator('.us-cco-inline-probe').count(), 0);
      await page.locator('#top .rtsLink').nth(1).click();
      assert.equal(await page.evaluate(() => nativeClicks), 1);
      assert.equal(requests.some(row => row.path.includes('ContentPreview')), false);
    }, { nativeIdentity: true, identityWrapped: true });
    await scenario('native identity: explicit DVK preserves the previous lookup path', async (page, requests) => {
      await child(page);
      assert.equal(requests.some(row => row.operation === 'FindByPath'), false);
    }, { nativeIdentity: true });
    await scenario('native identity: explicit content path works without a canonical link', async (page, requests) => {
      const result = await page.evaluate(pagePath => usCcoInline.discover({ pagePath }), nativePath);
      assert.equal(result.identity.source, 'explicit-pagePath');
      assert.deepEqual(requests.filter(row => row.lookupPath).map(row => row.lookupPath), [nativePath]);
    });
    await scenario('native identity: current path fallback strips only the known website root', async (page, requests) => {
      await page.evaluate(() => {
        history.replaceState(null, '', '/imis/_i4u_/Example/Page.aspx?ID=1001');
        window.gWebSiteRoot = '/imis';
      });
      const result = await page.evaluate(() => usCcoInline.keys());
      assert.equal(result.identitySource, 'current-path');
      assert.deepEqual(requests.filter(row => row.lookupPath).map(row => row.lookupPath), ['@/_i4u_/Example/Page']);
    });
    await scenario('native identity: preview route uses its own DVK, never an arbitrary query GUID', async (page, requests) => {
      await page.evaluate(parent => history.replaceState(null, '', '/iMIS/ContentManagement/ContentPreview.aspx?DocumentTypeCode=CON&iUniformKey=' + parent), parent);
      const result = await page.evaluate(() => usCcoInline.keys());
      assert.equal(result.identitySource, 'native-preview-url');
      assert.equal(requests.some(row => row.operation === 'FindByPath'), false);
    });
    for (const [flag, message] of Object.entries({ identityEmpty: /did not resolve/, identityWrongType: /non-content/, identityWrongPath: /different content path/, identityMultiple: /exactly one/, identityPaged: /paged/, identityInvalidKey: /non-zero GUID/, identityDenied: /HTTP 403/ })) {
      await scenario('native identity: rejects ' + flag + ' without guessing alternative paths', async (page, requests) => {
        await assert.rejects(page.evaluate(() => usCcoInline.startChild()), message);
        assert.deepEqual(requests.filter(row => row.lookupPath).map(row => row.lookupPath), [nativePath]);
        assert.equal(requests.some(row => row.path === '/api/Document' || row.folderKey), false);
        assert.equal(await page.locator('.us-cco-inline-probe').count(), 0);
      }, { nativeIdentity: true, [flag]: true });
    }
    await scenario('native identity: rejects a cross-origin canonical URL before requests', async (page, requests) => {
      await assert.rejects(page.evaluate(() => usCcoInline.keys()), /same-origin/);
      assert.equal(requests.some(row => row.path.startsWith('/api/')), false);
    }, { nativeIdentity: true, canonicalHref: 'https://foreign.test/Page.aspx' });
    await scenario('native identity: refuses ambiguous canonical links', async (page, requests) => {
      await page.evaluate(() => document.head.append(document.querySelector('link[rel="canonical"]').cloneNode()));
      await assert.rejects(page.evaluate(() => usCcoInline.keys()), /Multiple canonical/);
      assert.equal(requests.some(row => row.path.startsWith('/api/')), false);
    }, { nativeIdentity: true });
    await scenario('native identity: source changes during lookup prevent installation', async (page, requests) => {
      await page.evaluate(async () => {
        const pending = usCcoInline.startChild();
        await new Promise(resolve => setTimeout(resolve, 30));
        document.querySelector('link[rel="canonical"]').href = '/Other.aspx';
        try { await pending; throw new Error('Unexpected installation'); }
        catch (error) { if (!/Page changed/.test(error.message)) throw error; }
      });
      assert.equal(requests.some(row => row.path === '/api/Document'), false);
      assert.equal(await page.locator('.us-cco-inline-probe').count(), 0);
    }, { nativeIdentity: true, identityDelay: true });
    await scenario('native identity: stop cancels lookup before installing handlers', async page => {
      await page.evaluate(async () => {
        const pending = usCcoInline.startChild();
        usCcoInline.stop();
        try { await pending; throw new Error('Unexpected installation'); }
        catch (error) { if (error.message === 'Unexpected installation') throw error; }
      });
      assert.equal(await page.evaluate(() => usCcoInline.currentUrl), null);
      assert.equal(await page.locator('button').count(), 1);
    }, { nativeIdentity: true, identityDelay: true });
    await scenario('child configuration lookup, insertion, context, suppressed scripts and original restoration', async (page, requests) => {
      await page.locator('#retained').fill('retained value');
      await child(page);
      await page.locator('#top .rtsLink').nth(1).click();
      await page.waitForFunction(() => usCcoInline.report().length === 1);
      assert.equal((await page.locator('#multipage').innerText()).replace(/\s+/g, ' '), 'Tasks content Relative link');
      assert.equal(await page.evaluate(() => window.nativeClicks), 0);
      assert.equal(await page.evaluate(() => window.fetchedScriptRan), undefined);
      assert.equal(await page.locator('input[name="__VIEWSTATE"]').count(), 1);
      assert.equal(await page.locator('input[name="__VIEWSTATE"]').inputValue(), 'original-state');
      const url = new URL(requests.find(row => row.path.includes('ContentPreview')).search, 'http://cco.test');
      assert.deepEqual(url.searchParams.getAll('tag'), ['a', 'b']);
      assert.equal(url.searchParams.get('ID'), '1001');
      assert.equal(url.searchParams.get('iUniformKey'), pages[1]);
      assert.equal(await page.locator('#multipage a').getAttribute('href'), 'http://cco.test/iMIS/ContentManagement/details.aspx');
      await page.locator('#bottom .rtsLink').nth(0).click();
      assert.equal(await page.locator('#retained').inputValue(), 'retained value');
      await page.locator('#originalButton').click();
      assert.equal(await page.evaluate(() => originalClicks), 1);
      await page.evaluate(() => usCcoInline.stop());
      assert.equal(await page.locator('.us-cco-inline-probe').count(), 0);
      assert.equal(requests.filter(row => row.method === 'POST' && row.path !== '/api/Document/_execute').length, 0);
    });
    await scenario('parent extraction uses verified selection, excludes banner and uses no config API', async (page, requests) => {
      await parentMode(page); await select(page, 1);
      assert.equal((await page.locator('#multipage').innerText()).replace(/\s+/g, ' '), 'Tasks content Relative link');
      assert.equal(await page.locator('header').count(), 0);
      assert.equal(requests.some(row => row.path.startsWith('/api/')), false);
      assert.match(await page.evaluate(() => usCcoInline.currentUrl), /tab=1/);
      await page.evaluate(() => {
        window.UnionSuiteRefresh = { queryTemplate: (selector, options) => ({ selector, options }) };
      });
      const refresh = await page.evaluate(() => usCcoInline.refreshQueryTemplate('#ste_container_ciTasks'));
      assert.match(refresh.options.url, /tab=1/);
    });
    await scenario('wrong selected parent tab is rejected without losing original content', async page => {
      await parentMode(page); await select(page, 1);
      assert.equal(await page.locator('#retained').count(), 1);
      assert.match(await page.evaluate(() => usCcoInline.report()[0].error), /did not select/);
    }, { wrongTab: true });
    await scenario('returned parent identity is verified', async page => {
      await assert.rejects(child(page), /parent ContentKey/);
      assert.equal(await page.locator('.us-cco-inline-probe').count(), 0);
    }, { wrongParent: true });
    await scenario('explicit ContentItem mode still requires a placement key', async (page, requests) => {
      await assert.rejects(page.evaluate(parentDvk => usCcoInline.discover({ parentDvk, configSource: 'content-item' }), parent), /both parentDvk and contentItemKey/);
      assert.equal(requests.some(row => row.path.startsWith('/api/')), false);
    });
    await scenario('returned placement identity is verified', async page => {
      await assert.rejects(page.evaluate(options => usCcoInline.discover(options), { ...childOptions, contentItemKey: placement, configSource: 'content-item' }), /ignored the placement filter/);
    }, { wrongPlacement: true });
    await scenario('dynamic CCO resolves its placement and folder from the published document blob', async (page, requests) => {
      await child(page); await select(page, 1);
      const request = requests.find(row => row.path === '/api/Document');
      const params = new URLSearchParams(request.search);
      assert.equal(params.get('DocumentVersionID'), parent); assert.equal(params.get('DocumentStatusID'), '40');
      assert.equal(requests.some(row => row.path === '/api/ContentItem' || row.path === '/api/DocumentSummary'), false);
      assert.deepEqual(requests.filter(row => row.folderKey).map(row => row.folderKey), [folder]);
      assert.equal(await page.locator('#ste_container_ciTasks').count(), 1);
    }, { dynamic: true });
    await scenario('document discovery preserves UTF-8 configuration names and literal folder underscores', async page => {
      const result = await page.evaluate(options => usCcoInline.discover(options), childOptions);
      assert.equal(result.config.contentItemKey, placement);
      assert.equal(result.config.name, 'Account page tabs — café');
      assert.equal(result.config.folderPath, '@/_i4u_/Example/Tabs');
    }, { dynamic: true });
    for (const [flag, message] of Object.entries({ wrongDvk: /DVK filter/, working: /published content page/, emptyDocuments: /exactly one/, multipleDocuments: /exactly one/, paged: /paged/, invalidXml: /valid XML/, invalidBase64: /encoded|base64/i, doctype: /XML declaration/ })) {
      await scenario('document discovery rejects ' + flag, async (page, requests) => {
        await assert.rejects(child(page), message);
        assert.equal(requests.some(row => row.folderKey), false);
        assert.equal(await page.locator('.us-cco-inline-probe').count(), 0);
      }, { [flag]: true });
    }
    await scenario('multiple CCOs require selection and then resolve from the same document', async (page, requests) => {
      await assert.rejects(child(page), /multiple CCOs/);
      await page.evaluate(options => usCcoInline.startChild(options), { ...childOptions, contentItemKey: placement });
      await select(page, 1);
      assert.equal(requests.some(row => row.path === '/api/ContentItem'), false);
      assert.equal(await page.locator('#ste_container_ciTasks').count(), 1);
    }, { dynamic: true, multipleCcos: true });
    await scenario('explicit ContentItem mode remains usable', async (page, requests) => {
      await page.evaluate(options => usCcoInline.startChild(options), { ...childOptions, contentItemKey: placement, configSource: 'content-item' });
      await select(page, 1);
      assert.equal(requests.some(row => row.path === '/api/Document'), false);
      assert.equal(await page.locator('#ste_container_ciTasks').count(), 1);
    }, { dynamic: true });
    await scenario('dynamic CCO uses default folder only after an empty source result', async (page, requests) => {
      await child(page); await select(page, 1);
      assert.deepEqual(requests.filter(row => row.folderKey).map(row => row.folderKey), [folder, fallbackFolder]);
      assert.equal(await page.locator('#ste_container_ciTasks').count(), 1);
    }, { dynamic: true, emptySource: true });
    await scenario('dynamic CCO does not hide a folder API failure with fallback', async (page, requests) => {
      await assert.rejects(child(page), /HTTP 403/);
      assert.deepEqual(requests.filter(row => row.folderKey).map(row => row.folderKey), [folder]);
    }, { dynamic: true, folderError: true });
    await scenario('ambiguous captions reject installation', async page => {
      await assert.rejects(child(page), /unique child DVK/);
    }, { duplicateCaption: true });
    for (const flag of ['login', 'collision']) await scenario((flag === 'login' ? 'authentication: native sign-in' : flag) + ' response preserves existing content', async page => {
      await child(page); await select(page, 1);
      assert.equal(await page.locator('#retained').count(), 1);
      assert.equal(await page.evaluate(() => usCcoInline.report()[0].status), 'failed');
    }, { [flag]: true });
    await scenario('authentication: legitimate password content is inserted', async page => {
      await child(page); await select(page, 1);
      assert.equal(await page.locator('#newPassword').count(), 1);
      assert.equal(await page.evaluate(() => usCcoInline.report()[0].status), 'inserted');
    }, { passwordForm: true });
    await scenario('latest tab wins overlapping requests', async page => {
      await child(page);
      await page.evaluate(async () => {
        const first = usCcoInline.select(1);
        await new Promise(resolve => setTimeout(resolve, 30));
        await usCcoInline.select(2); await first;
      });
      assert.equal(await page.locator('#ste_container_ciOther').count(), 1);
      assert.equal(await page.locator('#ste_container_ciTasks').count(), 0);
    }, { delay: true });
    await scenario('stop during fetch prevents late insertion and permits restarting', async page => {
      await child(page);
      await page.evaluate(async () => {
        const pending = usCcoInline.select(1); usCcoInline.stop(); await pending;
      });
      assert.equal(await page.locator('#retained').count(), 1);
      await parentMode(page); await select(page, 2);
      assert.equal(await page.locator('#ste_container_ciOther').count(), 1);
    }, { delay: true });
    await scenario('initializer failure is reported as inserted but incomplete', async page => {
      await page.evaluate(options => usCcoInline.startChild({ ...options, initialize() { throw new Error('fixture initializer failed'); } }), childOptions);
      await select(page, 1);
      assert.equal(await page.locator('#ste_container_ciTasks').count(), 1);
      assert.equal(await page.evaluate(() => usCcoInline.report()[0].status), 'inserted-initialization-incomplete');
    });
    await scenario('known pagination initializes without executing fetched scripts', async page => {
      await page.evaluate(() => {
        window.jQuery = node => ({ simplePaginate(settings) { window.paginationCall = { id: node.id, settings }; } });
        window.jQuery.fn = { simplePaginate() {} };
      });
      await child(page); await select(page, 1);
      const call = await page.evaluate(() => paginationCall);
      assert.equal(call.id, 'queryResults'); assert.equal(call.settings.elementsPerPage, 1);
      assert.equal(await page.evaluate(() => usCcoInline.report()[0].paginationInitialized), 1);
      assert.equal(await page.evaluate(() => window.fetchedScriptRan), undefined);
    }, { pagination: true });
    await scenario('pagination skips an absent source target and initializes remaining controls', async page => {
      await page.evaluate(() => {
        window.paginationCalls = [];
        window.jQuery = node => ({ simplePaginate() { paginationCalls.push(node.id); } });
        window.jQuery.fn = { simplePaginate() {} };
        window.UnionSuiteActions = { refresh() { window.themeRefreshed = true; } };
      });
      await page.evaluate(options => usCcoInline.startChild({ ...options, initialize() { window.customInitialized = true; } }), childOptions);
      await select(page, 1);
      const report = await page.evaluate(() => usCcoInline.report()[0]);
      assert.equal(report.status, 'inserted');
      assert.deepEqual(report.paginationSkipped, [{ target: '#missingResults', reason: 'absent-from-response' }]);
      assert.equal(report.paginationInitialized, 1);
      assert.deepEqual(await page.evaluate(() => paginationCalls), ['queryResults']);
      assert.equal(await page.evaluate(() => themeRefreshed && customInitialized), true);
    }, { pagination: true, missingPagination: true });
    await scenario('pagination still reports a target lost during insertion and continues', async page => {
      await page.evaluate(() => {
        window.jQuery = () => ({ simplePaginate() {} });
        window.jQuery.fn = { simplePaginate() {} };
        window.UnionSuiteActions = { refresh() { window.themeRefreshed = true; } };
      });
      await child(page); await select(page, 1);
      const report = await page.evaluate(() => usCcoInline.report()[0]);
      assert.equal(report.status, 'inserted-initialization-incomplete');
      assert.equal(report.initializationErrors[0].target, '#removedTarget');
      assert.deepEqual(report.paginationSkipped, []);
      assert.equal(report.paginationInitialized, 1);
      assert.equal(await page.evaluate(() => themeRefreshed), true);
    }, { pagination: true, paginationLoss: true });
    await scenario('pagination failure does not prevent independent theme and custom initializers', async page => {
      await page.evaluate(() => {
        window.UnionSuiteIqaFilters = { refreshQueryTemplates() { throw new Error('fixture theme failure'); } };
        window.UnionSuiteActions = { refresh() { window.themeRefreshed = true; } };
      });
      await page.evaluate(options => usCcoInline.startChild({ ...options, initialize() { window.customInitialized = true; } }), childOptions);
      await select(page, 1);
      const report = await page.evaluate(() => usCcoInline.report()[0]);
      assert.equal(report.status, 'inserted-initialization-incomplete');
      assert.deepEqual(report.initializationErrors.map(item => item.stage), ['pagination', 'UnionSuiteIqaFilters']);
      assert.equal(await page.evaluate(() => themeRefreshed && customInitialized), true);
    }, { pagination: true });
    await scenario('missing pagination dependency is reported without script replay', async page => {
      await child(page); await select(page, 1);
      const report = await page.evaluate(() => usCcoInline.report()[0]);
      assert.equal(report.status, 'inserted-initialization-incomplete');
      assert.match(report.initializationError, /plugin is absent/);
    }, { pagination: true });
    await scenario('changed URL during fetch stops the probe and preserves original content', async page => {
      await child(page);
      await page.evaluate(async () => {
        const pending = usCcoInline.select(1);
        history.replaceState(null, '', '?ID=2002');
        await pending;
      });
      assert.equal(await page.locator('#retained').count(), 1);
      assert.equal(await page.evaluate(() => usCcoInline.currentUrl), null);
    }, { delay: true });
    await scenario('stop during configuration resolution prevents installation', async page => {
      await page.evaluate(async options => {
        const pending = usCcoInline.startChild(options);
        usCcoInline.stop();
        try { await pending; throw new Error('Unexpected installation'); }
        catch (error) { if (error.message === 'Unexpected installation') throw error; }
      }, childOptions);
      assert.equal(await page.evaluate(() => usCcoInline.currentUrl), null);
      assert.equal(await page.locator('button').count(), 1);
    });
    await scenario('native container replacement stops interception', async page => {
      await child(page);
      await page.evaluate(() => document.getElementById('ste_container_ciDirectory').remove());
      await page.waitForFunction(() => usCcoInline.currentUrl === null);
    });
    await scenario('different member context is rejected before fetching', async page => {
      await assert.rejects(page.evaluate(() => usCcoInline.startParent({ selectionParameters: ['tab'], tabUrls: { Tasks: '/Page.aspx?ID=2002&tab=1', Other: '/Page.aspx?ID=2002&tab=2' } })), /changes context/);
    });
    console.log(`${passed} browser scenarios passed (synthetic pages; no iMIS calls).`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
