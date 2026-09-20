import test from 'node:test';
import assert from 'node:assert/strict';
import { guid, placementIdentity, verifiedPlacement, placementSettings, validateConfig, mergeConfig } from '../src/contracts.js';
import { createApi, webRoot } from '../src/api.js';
import { folderRequest, folderPages } from '../src/documents.js';
import { selectionParameter, resolveTabValue, tabLinkValue, effectiveContext, pageUrl } from '../src/history.js';
import { installPopupBridge } from '../src/popup-bridge.js';

const key = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const identity = placementIdentity(key(1), key(2));
const config = { schemaVersion: 1, folderDocumentVersionId: key(3) };
const row = (parent = key(1)) => ({ Data: { ContentKey: parent, ContentItemKey: key(2), JsonSettings: JSON.stringify(config) } });

test('identity requires both resolved GUIDs, rejects nil and unresolved tokens', () => {
  for (const invalid of [undefined, '', '[x-contentKey]', 'stub123', key(1).slice(0, 12), '00000000-0000-0000-0000-000000000000']) assert.throws(() => guid(invalid));
  assert.throws(() => placementIdentity(key(1), ''));
  assert.equal(guid('DB3C1D27-64F4-4FC3-A733-574E6121F885'), 'db3c1d27-64f4-4fc3-a733-574e6121f885');
});

test('copied placements use the containing key; wrong, conflicting and ambiguous rows fail', () => {
  assert.deepEqual(placementSettings(verifiedPlacement({ Items: { $values: [row(key(4)), row()] } }, identity)), config);
  assert.throws(() => verifiedPlacement({ Items: [row(key(4))] }, identity));
  assert.throws(() => verifiedPlacement({ Items: [row(), row()] }, identity));
  assert.throws(() => verifiedPlacement({ ...row(), ContentKey: key(4) }, identity));
  assert.throws(() => verifiedPlacement({ ...row(), Properties: { $values: [{ Name: 'ContentKey', Value: key(4) }] } }, identity));
  assert.throws(() => verifiedPlacement({ Data: { ContentItemKey: key(2) } }, identity));
  assert.throws(() => verifiedPlacement({ Items: { invalid: true } }, identity));
});

test('typed values, Data JSON, property bags and Settings alias are supported', () => {
  const bag = { Properties: { $values: [
    { Name: 'ContentKey', Value: { $value: key(1) } },
    { Name: 'ContentItemKey', Value: { $value: key(2) } },
    { Name: 'Settings', Value: { $value: JSON.stringify(config) } }
  ] } };
  assert.deepEqual(placementSettings(verifiedPlacement(bag, identity)), config);
  assert.deepEqual(placementSettings(verifiedPlacement({ Data: JSON.stringify(row().Data) }, identity)), config);
  assert.throws(() => placementSettings({ Data: { JsonSettings: '{bad', Settings: config } }));
});

test('config defaults to selected-only, preserves foreign settings and rejects invalid future schemas', () => {
  assert.equal(validateConfig(config).preload, 'off');
  assert.equal(validateConfig(config).popupBridge, false);
  assert.equal(validateConfig(config).urlValue, 'name');
  assert.equal(validateConfig({ ...config, urlValue:'key' }).urlValue, 'key');
  assert.deepEqual(mergeConfig({ ...config, foreign: { keep: true } }, { caption: 'Directory' }).foreign, { keep: true });
  assert.throws(() => mergeConfig({ ...config, schemaVersion: 2 }, { caption: 'Directory' }));
  for (const invalid of [{ schemaVersion: 2 }, { preload: 'all' }, { popupBridge: 'true' }, { orientation: 'diagonal' }, { caption: {} }, { folderDocumentVersionId: 'path' }]) assert.throws(() => validateConfig({ ...config, ...invalid }));
});

test('folder contract has exact typed arguments; sorts by Name and labels by AlternateName', () => {
  const request = folderRequest(key(3));
  assert.equal(request.OperationName, 'FindDocumentsInFolder');
  assert.deepEqual(request.Parameters.$values, [key(3), { $type: 'System.String[], mscorlib', $values: ['CON', 'CFL'] }, { $type: 'System.Boolean', $value: true }]);
  const rows = [
    { DocumentVersionId: key(5), DocumentTypeId: 'CON', Name: 'B', AlternateName: 'First caption' },
    { DocumentVersionId: key(6), DocumentTypeId: 'CON', Name: 'A', AlternateName: 'Second caption', Status: { Name: 'Published' } },
    { DocumentTypeId: 'CFL' },
    { DocumentVersionId: key(7), DocumentTypeId: 'CON', Name: 'Draft', Status: 'Working' },
    { DocumentVersionId: key(8), DocumentTypeId: 'CON', Name: 'Denied', IsAuthorized: false }
  ];
  const result = folderPages({ IsSuccessStatusCode: true, Result: { $values: rows } });
  assert.deepEqual(result.pages.map(p => p.caption), ['Second caption', 'First caption']);
  assert.equal(result.folders, 1); assert.equal(result.excluded, 2);
  assert.deepEqual(folderPages({ Result: [] }).pages, []);
  for (const body of [{ Result: null }, { Result: {} }, { Result: rows, IsSuccessStatusCode: false }, { Result: [rows[0], rows[0]] }, { Result: [{ ...rows[0], DocumentVersionId: 'bad' }] }, { Result: [{ ...rows[0], DocumentTypeId: 'IQD' }] }]) assert.throws(() => folderPages(body));
});

test('API uses current CSRF token, same-origin cookies, no-store and rejects HTTP/service/non-JSON failures', async () => {
  let options;
  const win = { AbortController, setTimeout, clearTimeout, location: { origin: 'https://imis.test' }, gWebRoot: '/virtual/', document: { querySelector: () => ({ value: 'fixture-token' }) }, fetch: async (url, opts) => { options = { url, ...opts }; return { ok: true, json: async () => ({ Result: [] }) }; } };
  await createApi(win)('POST', 'Document/_execute', folderRequest(key(3)));
  assert.equal(options.url, '/virtual/api/Document/_execute');
  assert.equal(options.credentials, 'same-origin'); assert.equal(options.cache, 'no-store'); assert.equal(options.redirect, 'error');
  assert.equal(options.headers.RequestVerificationToken, 'fixture-token');
  for (const response of [{ ok: false, status: 403 }, { ok: true, json: async () => ({ IsSuccessStatusCode: { $value: false } }) }, { ok: true, json: async () => { throw new Error(); } }]) {
    win.fetch = async () => response;
    await assert.rejects(createApi(win)('GET', 'ContentItem'));
  }
  assert.throws(() => webRoot({ ...win, gWebRoot: 'https://other.test' }));
});

test('history namespaces full identity and forwards repeated context without renderer/CCO state', () => {
  const param = selectionParameter(identity);
  assert.notEqual(param, selectionParameter(placementIdentity(key(4), key(2))));
  const url = new URL(`https://imis.test/view?ID=123&tag=b&tag=a&TemplateType=bad&US-CCO-other=bad&${param}=x&PageInstanceKey=bad&__VIEWSTATE=bad`);
  assert.deepEqual([...effectiveContext(url)], [['ID', '123'], ['tag', 'b'], ['tag', 'a']]);
  const child = new URL(pageUrl({ location: url }, key(5)));
  assert.equal(child.origin, url.origin); assert.equal(child.pathname, '/iMIS/ContentManagement/ContentPreview.aspx');
  assert.equal(child.searchParams.get('iUniformKey'), key(5)); assert.equal(child.searchParams.get('TemplateType'), 'E');
  assert.deepEqual(child.searchParams.getAll('tag'), ['b', 'a']);
  assert.equal(child.searchParams.get(param), null);
});

test('tab links resolve available keys, positions and unique names independently of output format', () => {
  const pages = [{ id: key(10), caption: 'Overview' }, { id: key(11), caption: 'About' }, { id: key(12), caption: 'Notes & Interactions' }];
  for (const value of [key(11), '2', 'About', 'aBoUt', ' About ']) assert.equal(resolveTabValue(pages, value), pages[1]);
  assert.equal(resolveTabValue(pages, 'Notes & Interactions'), pages[2]);
  assert.equal(resolveTabValue(pages, 'Notes-&-Interactions'), pages[2]);
  assert.equal(tabLinkValue(pages, pages[2], 'name'), 'Notes-&-Interactions');
  for (const value of [null, '', ' ', '0', '-1', '4', '1.5', '02', '2e0', 'Missing', key(99)]) assert.equal(resolveTabValue(pages, value), undefined);
  for (const format of ['key', 'number', 'name']) {
    for (const page of pages) assert.equal(resolveTabValue(pages, tabLinkValue(pages, page, format)), page);
  }
  const available = [pages[0], pages[2]];
  assert.equal(resolveTabValue(available, '2'), pages[2]);
  assert.equal(resolveTabValue(available, key(11)), undefined);
  assert.equal(resolveTabValue(available, 'About'), undefined);
});

test('ambiguous names never choose the first match; keys and numeric positions take precedence', () => {
  const pages = [{ id:key(10), caption:'About' }, { id:key(11), caption:'ABOUT' }, { id:key(12), caption:'1' }, { id:key(13), caption:key(10) }];
  assert.equal(resolveTabValue(pages, 'about'), undefined);
  assert.equal(resolveTabValue(pages, '1'), pages[0]);
  assert.equal(resolveTabValue(pages, key(10)), pages[0]);
  for (const page of pages) {
    assert.equal(tabLinkValue(pages, page, 'name'), page.id);
    assert.equal(resolveTabValue(pages, tabLinkValue(pages, page, 'name')), page);
  }
  const colliding = [{ id:key(20), caption:'Notes and Interactions' }, { id:key(21), caption:'Notes-and-Interactions' }];
  assert.equal(resolveTabValue(colliding, 'Notes-and-Interactions'), undefined);
  assert.equal(resolveTabValue(colliding, 'Notes and Interactions'), colliding[0]);
  for (const page of colliding) assert.equal(tabLinkValue(colliding, page, 'name'), page.id);
});

test('stalled API requests abort visibly and release timeout/listener resources', async () => {
  let expire, cleared = false;
  const win = {
    AbortController, location: { origin: 'https://imis.test' }, document: { querySelector: () => null },
    setTimeout: fn => { expire = fn; return 1; }, clearTimeout: () => { cleared = true; },
    fetch: (url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }))
  };
  const pending = createApi(win)('GET', 'ContentItem');
  expire();
  await assert.rejects(pending, /timed out after 30 seconds/);
  assert.equal(cleared, true);
});

test('popup forwards exact callbacks with parent this, updates replaced helpers, and restores on dispose', () => {
  let tick, forwardedThis, forwarded, cleared;
  const original = function () { return 'native'; };
  const child = { ShowDialog_NoReturnValue: original };
  const parent = { setInterval: fn => { tick = fn; return 42; }, clearInterval: id => { cleared = id; }, ShowDialog_NoReturnValue: function (...args) { forwardedThis = this; forwarded = args; return 'parent'; } };
  const cleanup = installPopupBridge(child, parent);
  const callback = () => {};
  assert.equal(child.ShowDialog_NoReturnValue('url', callback), 'parent');
  assert.equal(forwarded[1], callback); assert.equal(forwardedThis, parent);
  const replacement = function () {};
  child.ShowDialog_NoReturnValue = replacement; tick();
  assert.notEqual(child.ShowDialog_NoReturnValue, replacement);
  cleanup(); assert.equal(child.ShowDialog_NoReturnValue, replacement); assert.equal(cleared, 42);
});
