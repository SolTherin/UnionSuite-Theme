/* UnionSuite CCO 0.1.0 - generated sandbox trial */
(() => {
'use strict';
// src/contracts.js
// iMIS wrappers shared by the runtime and the native JsonSettings editor.
function unwrap(value) {
  return value && typeof value === 'object' && '$value' in value ? value.$value : value;
}

function objectValue(value, label = 'value') {
  value = unwrap(value);
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { throw new Error(`${label} is invalid JSON.`); }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value;
}

function collection(value, label) {
  const rows = unwrap(value)?.$values ?? unwrap(value);
  if (!Array.isArray(rows)) throw new Error(`Unexpected ${label} response.`);
  return rows;
}

function property(record, name) {
  if (record[name] !== undefined) return unwrap(record[name]);
  const props = record.Properties?.$values ?? record.Properties;
  return Array.isArray(props) ? unwrap(props.find(p => p.Name === name)?.Value) : undefined;
}

function guid(value, label = 'Key') {
  value = unwrap(value);
  if (typeof value !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value) || /^0{8}(?:-0{4}){3}-0{12}$/.test(value)) {
    throw new Error(`${label} must be a non-empty GUID. Check iMIS token substitution and configuration.`);
  }
  return value.toLowerCase();
}

function placementIdentity(contentKey, contentItemKey) {
  return { contentKey: guid(contentKey, 'ContentKey'), contentItemKey: guid(contentItemKey, 'ContentItemKey') };
}

function placementId(identity) {
  return `${identity.contentKey.replaceAll('-', '')}-${identity.contentItemKey.replaceAll('-', '')}`;
}

function verifiedPlacement(body, identity) {
  const envelope = objectValue(body, 'ContentItem');
  const rows = envelope.Items !== undefined ? collection(envelope.Items, 'ContentItem list') : [envelope];
  const matches = rows.filter(row => {
    const record = objectValue(row, 'ContentItem row');
    const data = record.Data === undefined ? {} : objectValue(record.Data, 'ContentItem Data');
    // Reject conflicts between direct, Data and property-bag identities; never trust a filter alone.
    return [['ContentKey', identity.contentKey], ['ContentItemKey', identity.contentItemKey]].every(([name, expected]) => {
      const values = [data, record].flatMap(owner => {
        const props = owner.Properties?.$values ?? owner.Properties;
        return [unwrap(owner[name]), ...(Array.isArray(props) ? props.filter(p => p.Name === name).map(p => unwrap(p.Value)) : [])];
      }).filter(v => v !== undefined);
      return values.length > 0 && values.every(v => typeof v === 'string' && v.toLowerCase() === expected);
    });
  });
  if (matches.length !== 1) throw new Error('Configuration lookup did not return exactly one matching ContentKey + ContentItemKey placement.');
  return objectValue(matches[0]);
}

function placementSettings(row) {
  const data = row.Data === undefined ? {} : objectValue(row.Data);
  for (const owner of [data, row]) {
    for (const name of ['JsonSettings', 'Settings']) {
      const candidate = property(owner, name);
      if (candidate !== undefined && candidate !== null && candidate !== '') return objectValue(candidate, name);
    }
  }
  throw new Error('No JsonSettings configuration was found. Configure this UnionSuite CCO placement.');
}

function validateConfig(input) {
  const value = objectValue(input, 'JsonSettings');
  if (value.schemaVersion !== 1) throw new Error('Unsupported or missing CCO schemaVersion. Reopen the configuration editor.');
  const textSetting = (key, fallback, max) => {
    const text = value[key] ?? fallback;
    if (typeof text !== 'string' || text.length > max) throw new Error(`Invalid ${key}.`);
    return text.trim();
  };
  const preload = value.preload ?? 'off';
  if (!['off', 'sequential-idle'].includes(preload)) throw new Error('Unsupported preload policy.');
  if (value.popupBridge !== undefined && typeof value.popupBridge !== 'boolean') throw new Error('popupBridge must be true or false.');
  if (value.orientation !== undefined && !['horizontal', 'vertical'].includes(value.orientation)) throw new Error('Unsupported tab orientation.');
  const urlParameter = textSetting('urlParameter', '', 60);
  if (urlParameter && (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(urlParameter) || /^(?:id|contactid|partyid|customerid|context|websitekey|contentkey|contentitemkey|templatetype|imode|iuniformkey|ioperation|documenttypecode|dialogcacheparam|ispopup|popup|pageinstancekey|donotcache|us-cco-)/i.test(urlParameter))) throw new Error('Choose a URL parameter such as Directory; identity and renderer parameters are reserved.');
  const urlValue = value.urlValue ?? 'name';
  if (!['key', 'name', 'number'].includes(urlValue)) throw new Error('Unsupported tab URL value format.');
  return {
    schemaVersion: 1,
    urlParameter, urlValue,
    folderDocumentVersionId: guid(value.folderDocumentVersionId, 'Folder document-version key'),
    folderPathLabel: textSetting('folderPathLabel', '', 500),
    caption: textSetting('caption', 'Content pages', 120) || 'Content pages',
    initialDocumentVersionId: value.initialDocumentVersionId ? guid(value.initialDocumentVersionId, 'Initial page key') : '',
    orientation: value.orientation ?? 'vertical', preload, popupBridge: value.popupBridge ?? false
  };
}

function mergeConfig(existing, edits) {
  const original = objectValue(existing, 'Existing JsonSettings');
  if (original.schemaVersion !== undefined && original.schemaVersion !== 1) throw new Error('Unsupported existing schemaVersion. It was not overwritten.');
  return { ...original, ...validateConfig({ ...original, ...edits, schemaVersion: 1 }) };
}

// src/api.js

function webRoot(win) {
  const root = String(win.gWebRoot || '').replace(/\/+$/, '');
  const url = new URL(root || '/', win.location.origin);
  if (url.origin !== win.location.origin || url.search || url.hash) throw new Error('The iMIS web root must be same-origin.');
  return url.pathname.replace(/\/+$/, '');
}

function createApi(win) {
  return async (method, path, payload, signal) => {
    const controller = new win.AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) controller.abort();
    const timeout = win.setTimeout(() => controller.abort(new Error('The iMIS request timed out after 30 seconds.')), 30000);
    try {
      const token = win.document.querySelector('input[name="__RequestVerificationToken"], input#__RequestVerificationToken')?.value;
      const response = await win.fetch(`${webRoot(win)}/api/${path}`, {
        method, signal: controller.signal, credentials: 'same-origin', cache: 'no-store', redirect: 'error',
        headers: { Accept: 'application/json', ...(token ? { RequestVerificationToken: token } : {}), ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(payload === undefined ? {} : { body: JSON.stringify(payload) })
      });
      if (!response.ok) throw new Error(`iMIS request failed (HTTP ${response.status}). Check access and session status.`);
      let result;
      try { result = await response.json(); } catch { throw new Error('iMIS returned an unexpected non-JSON response. Check session status.'); }
      if (unwrap(result?.IsSuccessStatusCode) === false || unwrap(result?.IsValid) === false) throw new Error('iMIS reported that the requested operation failed.');
      return result;
    } finally {
      win.clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  };
}

// src/documents.js

function folderRequest(folderVersionKey) {
  return {
    $type: 'Asi.Soa.Core.DataContracts.GenericExecuteRequest, Asi.Contracts',
    OperationName: 'FindDocumentsInFolder', EntityTypeName: 'Document',
    Parameters: {
      $type: 'System.Collections.ObjectModel.Collection`1[[System.Object, mscorlib]], mscorlib',
      $values: [guid(folderVersionKey, 'Folder document-version key'), { $type: 'System.String[], mscorlib', $values: ['CON', 'CFL'] }, { $type: 'System.Boolean', $value: true }]
    },
    ParameterTypeName: {
      $type: 'System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib',
      $values: ['System.String', 'System.String[]', 'System.Boolean']
    }
  };
}

function folderPages(body) {
  if (unwrap(body?.IsSuccessStatusCode) === false) throw new Error('iMIS could not list this folder.');
  const rows = collection(body?.Result !== undefined ? body.Result : body, 'folder');
  const pages = [], seen = new Set();
  let folders = 0, excluded = 0;
  for (const value of rows) {
    const row = objectValue(value, 'Folder row');
    const type = property(row, 'DocumentTypeId');
    if (type === 'CFL') { folders++; continue; } // Deliberately no traversal; cycles cannot recurse.
    if (type !== 'CON') throw new Error('Folder listing contains an unexpected document type.');
    const id = guid(property(row, 'DocumentVersionId'), 'Page document-version key');
    if (seen.has(id)) throw new Error('Folder listing contains duplicate page document-version keys.');
    seen.add(id);
    const name = property(row, 'Name'), alternate = property(row, 'AlternateName');
    if (typeof name !== 'string' || !name.trim() || (alternate != null && typeof alternate !== 'string')) throw new Error('Folder listing contains an invalid page name.');
    const statusValue = property(row, 'Status');
    const status = unwrap(statusValue?.Name ?? statusValue?.Description ?? statusValue);
    // Known explicit non-published records fail closed. Unknown status shapes need a live contract.
    if (status !== undefined && status !== null && status !== '' && status !== 'Published') { excluded++; continue; }
    if (property(row, 'IsPublished') === false || property(row, 'IsDeleted') === true || property(row, 'IsAuthorized') === false) { excluded++; continue; }
    pages.push({ id, name: name.trim(), caption: alternate?.trim() || name.trim() });
  }
  pages.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) || a.id.localeCompare(b.id));
  return { pages, folders, excluded };
}

// src/history.js

function selectionParameter(identity) { return `us-cco-${placementId(identity)}`; }

function tabNameValue(caption) { return caption.trim().replace(/\s+/g, '-'); }

// Incoming links accept every supported representation, independently of the
// author's preferred format for links written when a tab is clicked.
function resolveTabValue(pages, value) {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const normalized = value.trim().toLowerCase();
  const keyed = pages.find(page => page.id === normalized);
  if (keyed) return keyed;
  // Reserve positive integer values for positions in the available tab list.
  if (/^[1-9]\d*$/.test(normalized)) return pages[Number(normalized) - 1];
  const named = pages.filter(page => page.caption.toLowerCase() === normalized || tabNameValue(page.caption).toLowerCase() === normalized);
  return named.length === 1 ? named[0] : undefined;
}

function tabLinkValue(pages, page, format) {
  if (format === 'number') return String(pages.indexOf(page) + 1);
  // A numeric/key-shaped caption can resolve to a different tab. Keep generated
  // links round-trippable by using this page's stable key in that case.
  const name = tabNameValue(page.caption);
  if (format === 'name' && resolveTabValue(pages, name)?.id === page.id) return name;
  return page.id;
}

const customParameters = new WeakMap();
function registerSelectionParameter(win, name, owner) {
  if (!name) return () => {};
  let names = customParameters.get(win);
  if (!names) { names = new Map(); customParameters.set(win, names); }
  const key = name.toLowerCase();
  if (names.has(key) && names.get(key) !== owner) throw new Error('Another CCO uses this URL parameter. Give each collection a unique parameter name.');
  names.set(key, owner);
  return () => { if (names.get(key) === owner) names.delete(key); };
}

function effectiveContext(url, win) {
  const reserved = new Set(['templatetype', 'imode', 'iuniformkey', 'ioperation', 'documenttypecode', 'dialogcacheparam', 'ispopup', 'popup', 'pageinstancekey', 'donotcache']);
  const result = new URLSearchParams();
  for (const [key, value] of url.searchParams) {
    const lower = key.toLowerCase();
    if (!reserved.has(lower) && !customParameters.get(win)?.has(lower) && !lower.startsWith('us-cco-') && !lower.startsWith('__')) result.append(key, value);
  }
  // Keep repeated-value order (it can be significant), but normalize inter-key ordering.
  result.sort();
  return result;
}

function contextSignature(win, href = win.location.href) { return effectiveContext(new URL(href), win).toString(); }

function pageUrl(win, id) {
  const url = new URL(`${webRoot(win)}/iMIS/ContentManagement/ContentPreview.aspx`, win.location.origin);
  url.search = effectiveContext(new URL(win.location.href), win).toString();
  for (const [key, value] of Object.entries({ iMode: 'Execute', iUniformKey: guid(id), iOperation: 'Execute', TemplateType: 'E', DocumentTypeCode: 'CON', IsPopup: 'true' })) url.searchParams.set(key, value);
  return url.href;
}

// Notify consumers of host SPA/context changes as well as this component's selection changes.
function watchHistory(win, changed) {
  const originals = new Map();
  for (const method of ['pushState', 'replaceState']) {
    const original = win.history[method];
    function wrapped(...args) { const result = original.apply(this, args); changed(); return result; }
    originals.set(method, { original, wrapped });
    win.history[method] = wrapped;
  }
  win.addEventListener('popstate', changed);
  return () => {
    win.removeEventListener('popstate', changed);
    for (const [method, { original, wrapped }] of originals) if (win.history[method] === wrapped) win.history[method] = original;
  };
}

// src/popup-bridge.js
const bridgeMarker = Symbol('UnionSuiteCCO.popupBridge');

function installPopupBridge(child, parent) {
  let original, wrapper, disposed = false;
  function reconcile() {
    if (disposed) return;
    try {
      const current = child.ShowDialog_NoReturnValue;
      if (current === wrapper || typeof current !== 'function' || current[bridgeMarker]) return;
      original = current;
      let forwarding = false;
      wrapper = function (...args) {
        const target = parent.ShowDialog_NoReturnValue;
        if (typeof target !== 'function') return original.apply(child, args);
        if (target === wrapper || forwarding) throw new Error('CCO popup forwarding loop prevented.');
        forwarding = true;
        try { return target.apply(parent, args); } // Preserve callback function objects and their child closure.
        finally { forwarding = false; }
      };
      wrapper[bridgeMarker] = true;
      child.ShowDialog_NoReturnValue = wrapper;
    } catch { /* Navigation may temporarily make the frame inaccessible. */ }
  }
  reconcile();
  const timer = parent.setInterval(reconcile, 500); // Also catches helper replacement during a partial update.
  return () => {
    disposed = true;
    parent.clearInterval(timer);
    try { if (wrapper && child.ShowDialog_NoReturnValue === wrapper) child.ShowDialog_NoReturnValue = original; } catch { /* Navigated away. */ }
  };
}

// src/navigation.js
// Ordinary same-origin page links should leave the CCO, while native controls
// continue to use their own handlers and the child's independent Web Forms state.
function installChildNavigation(child) {
  const originals = new Map();
  function restore(link) {
    if (!originals.has(link)) return;
    const target = originals.get(link);
    if (link.getAttribute('target') === '_parent') {
      if (target === null) link.removeAttribute('target');
      else link.setAttribute('target', target);
    }
    originals.delete(link);
  }
  function click(event) {
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    restore(link);
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (link.hasAttribute('download') || link.getAttribute('role') === 'button' || link.hasAttribute('onclick')) return;
    if (link.getAttribute('data-us-cco-navigation') === 'child') return;
    const target = (link.getAttribute('target') || child.document.querySelector('base[target]')?.getAttribute('target') || '').toLowerCase();
    if (target && target !== '_self') return; // Respect explicit new/named windows and parent/top targets.
    let url;
    try { url = new URL(link.getAttribute('href'), child.document.baseURI); } catch { return; }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== child.location.origin) return;
    // Same-page anchors, filter links and paging stay in their child document.
    if (url.pathname.toLowerCase() === child.location.pathname.toLowerCase()) return;
    const filename = url.pathname.split('/').pop();
    if (/\.[^./]+$/.test(filename) && !/\.aspx$|\.html?$/i.test(filename)) return;
    if (/^(?:download|export|attachment)[^/]*\.aspx$/i.test(filename)) return;
    if ([...url.searchParams.keys()].some(key => /^(?:download|downloadfile|attachment)$/i.test(key))) return;
    originals.set(link, link.getAttribute('target'));
    // Leave default navigation to the browser: later handlers may still cancel,
    // and normal beforeunload/unsaved-change handling remains intact.
    link.setAttribute('target', '_parent');
  }
  child.document.addEventListener('click', click);
  return () => {
    child.document.removeEventListener('click', click);
    for (const link of originals.keys()) restore(link);
  };
}

// src/frame-size.js
// Keep each same-origin child in normal page flow without moving its Web Forms DOM.
function installFrameSize(frame, host) {
  const child = frame.contentWindow, doc = child.document;
  const events = new child.AbortController();
  let pending = null, disposed = false;
  // The popup template sizes EmptyMasterContentPanel from its viewport. A
  // scrollable shell would feed that height back into our parent measurement.
  // Let the outer page flow naturally; keep nested iPart/widget sizing intact.
  const outsideComponents = ':not(:where(.ContentItemContainer, .iMIS-WebPart, .RadGrid, .RadWindow, :is(.ContentItemContainer, .iMIS-WebPart, .RadGrid, .RadWindow) *))';
  const style = doc.createElement('style');
  style.setAttribute('data-us-cco-frame-style', '');
  style.textContent = `
    /* The native base sets html/body/form to width:100%. With page margins that
       exceeds the iframe viewport. Auto width includes those margins instead. */
    html, body, body > form {
      box-sizing:border-box !important;
      width:auto !important; min-width:0 !important; max-width:100% !important;
      height:auto !important; min-height:0 !important; max-height:none !important;
      overflow:visible !important;
    }
    body { display:flow-root !important; overflow-wrap:anywhere; }
    /* Only page-shell wrappers: do not reset panels, grid columns or the
       containers that belong to a nested iPart, native grid or popup. */
    :is(#MainPanel, .EmptyMasterContentPanel, .ContentPanel, .container, .container-fluid, .wrapper, #doc, #doc2, #doc3, #doc4)${outsideComponents} {
      box-sizing:border-box !important;
      width:auto !important; min-width:0 !important; max-width:100% !important;
    }
    /* Override native inline popup height even when its resize callback writes
       again. This belongs only to the embedded page's outer template shell. */
    :is(#MainPanel, .EmptyMasterContentPanel)${outsideComponents} {
      height:auto !important; min-height:0 !important; max-height:none !important;
      overflow:visible !important;
    }
    /* Native outer layout rows assume padding in the containing CCO. That
       padding is outside this iframe and cannot balance its negative gutters.
       Clear only the page layout's outer margins; keep column padding, nested
       iPart/field rows, and rows in ordinary padded containers unchanged. */
    :is(.ContentWizardDisplay, .ContentPanel, .EmptyMasterContentPanel)${outsideComponents} > div:not(.container):not(.container-fluid) > .row${outsideComponents} {
      margin-left:0 !important; margin-right:0 !important;
    }
  `;
  doc.head.append(style);

  function measure() {
    pending = null;
    if (disposed || !frame.isConnected || !frame.getBoundingClientRect().width) return;
    const body = doc.body;
    if (!body) return;
    const bounds = body.getBoundingClientRect(), css = child.getComputedStyle(body);
    // Unlike documentElement.scrollHeight, body geometry can shrink below the
    // old viewport. flow-root includes floats and prevents collapsed margins.
    const bottom = bounds.top + child.scrollY + Math.max(bounds.height, body.scrollHeight) + (parseFloat(css.marginBottom) || 0);
    const minimum = parseFloat(host.getComputedStyle(frame).minHeight) || 0;
    const height = Math.ceil(Math.max(minimum, bottom));
    if (frame.style.height !== `${height}px`) frame.style.height = `${height}px`;
  }
  function queue() {
    if (!disposed && pending === null) pending = host.requestAnimationFrame(measure);
  }
  const content = new child.ResizeObserver(queue);
  content.observe(doc.documentElement);
  content.observe(doc.body);
  // Includes partial postbacks, expanded panels, text updates and validation.
  const mutations = new child.MutationObserver(queue);
  mutations.observe(doc.documentElement, { subtree:true, childList:true, characterData:true, attributes:true });
  const viewport = new host.ResizeObserver(queue);
  viewport.observe(frame); // Width changes and hidden-to-visible retained tabs.
  doc.addEventListener('load', queue, { capture:true, signal:events.signal });
  doc.fonts?.addEventListener('loadingdone', queue, { signal:events.signal });
  child.addEventListener('resize', queue, { signal:events.signal });
  measure();
  return () => {
    disposed = true;
    if (pending !== null) host.cancelAnimationFrame(pending);
    content.disconnect(); mutations.disconnect(); viewport.disconnect(); events.abort();
    style.remove();
  };
}

// src/frames.js

class FrameStore {
  constructor(win, config, changed) {
    this.win = win;
    this.config = config;
    this.changed = changed;
    this.entries = new Map();
    this.disposed = false;
    this.idle = null;
    this.started = win.performance.now();
  }

  hasDirty() { return [...this.entries.values()].some(entry => entry.dirty); }

  syncAppearance(entry) {
    try {
      const parent = this.win.UnionSuiteAppearance;
      const child = entry.frame.contentWindow?.UnionSuiteAppearance;
      if (!parent || !child || parent.storageKey !== child.storageKey) return;
      const state = parent.getState();
      // Read the current parent preference, not the value when preload started.
      // receive also rechecks CSS availability after a hidden frame is revealed.
      child.receive(state.preference, state.storageAvailable);
    } catch (_) { /* Navigating/cross-origin documents are handled by the loader. */ }
  }

  syncPresentation(entry) {
    if (this.disposed || !entry?.documentLoaded || entry.state === 'error' || this.entries.get(entry.page.id) !== entry) return;
    const rect = entry.frame.getBoundingClientRect();
    const visible = entry.frame.isConnected && rect.width > 0 && rect.height > 0;
    if (visible) this.syncAppearance(entry);
    if (entry.presented) return;
    if (!visible) {
      this.win.clearTimeout(entry.revealTimer);
      entry.revealTimer = null;
      // A hidden preload can finish networking without having a usable layout.
      entry.state = 'ready';
      entry.resolve(entry);
      this.changed(entry);
      return;
    }
    if (entry.revealTimer != null) return;
    entry.state = 'loading';
    // Notify native widgets after their viewport becomes measurable.
    const child = entry.frame.contentWindow;
    child.dispatchEvent(new child.Event('resize'));
    entry.revealTimer = this.win.setTimeout(() => {
      entry.revealTimer = null;
      if (this.disposed || this.entries.get(entry.page.id) !== entry || entry.state === 'error') return;
      const bounds = entry.frame.getBoundingClientRect();
      if (!bounds.width || !bounds.height) { this.syncPresentation(entry); return; }
      this.syncAppearance(entry);
      entry.presented = true;
      entry.state = 'ready';
      entry.frame.style.removeProperty('visibility');
      entry.resolve(entry);
      this.changed(entry);
    }, 1200);
    this.changed(entry);
  }

  ensure(page, panel) {
    if (this.disposed) return null;
    if (this.entries.has(page.id)) return this.entries.get(page.id);
    const frame = this.win.document.createElement('iframe');
    frame.title = page.caption;
    frame.className = 'us-cco__frame';
    // Reserve the frame viewport without painting the child's unfinished layout.
    frame.style.visibility = 'hidden';
    frame.dataset.usCcoChild = 'true';
    frame.referrerPolicy = 'same-origin';
    const entry = { frame, page, panel, state: 'loading', dirty: false, cleanup: () => {}, start: this.win.performance.now(), loadCount: 0 };
    entry.ready = new Promise(resolve => { entry.resolve = resolve; });
    this.entries.set(page.id, entry);
    const fail = message => {
      if (this.disposed || entry.state === 'error' || this.entries.get(page.id) !== entry) return;
      this.win.clearTimeout(entry.timeout);
      entry.cleanup();
      entry.state = 'error';
      entry.error = message;
      frame.remove(); // Stop late/inaccessible loads; retry creates a fresh frame.
      entry.resolve(entry);
      this.changed(entry);
    };
    frame.addEventListener('error', () => fail('This page could not be loaded.'));
    frame.addEventListener('load', () => {
      if (this.disposed || entry.state === 'error' || this.entries.get(page.id) !== entry) return;
      entry.cleanup();
      try {
        const child = frame.contentWindow;
        if (child.location.href === 'about:blank') return;
        if (child.location.origin !== this.win.location.origin || !child.document?.body) throw new Error('This page is no longer accessible in a same-origin frame.');
        if (/\/(?:signin|login|accessdenied|error)(?:\.aspx|\/|$)/i.test(child.location.pathname)) throw new Error('The page redirected to a sign-in or error page. Check access and session status.');
        this.win.clearTimeout(entry.timeout);
        entry.loadCount++;
        entry.documentLoaded = true;
        this.syncAppearance(entry);
        entry.presented = false;
        frame.style.visibility = 'hidden';
        entry.dirty = false;
        entry.readyMs = this.win.performance.now() - entry.start;
        const events = new child.AbortController();
        const markDirty = event => {
          // Search/filter state is retained UI state, not an unsaved data edit.
          if (event.target.matches?.('input[type=search]') || event.target.closest?.('.FilterPanel, [role=search], [data-us-cco-search]')) return;
          if (event.target.matches?.('input:not([type=hidden]):not([type=button]):not([type=submit]), textarea, select, [contenteditable]')) entry.dirty = true;
        };
        child.document.addEventListener('input', markDirty, { capture: true, signal: events.signal });
        child.document.addEventListener('change', markDirty, { capture: true, signal: events.signal });
        // Optional explicit adapter hook after a verified native save; generic detection stays conservative.
        child.document.addEventListener('us-cco:clean', () => { entry.dirty = false; }, { signal: events.signal });
        const unbridge = this.config.popupBridge ? installPopupBridge(child, this.win) : () => {};
        const unnavigate = installChildNavigation(child);
        const unsize = installFrameSize(frame, this.win);
        child.addEventListener('beforeunload', event => {
          if (entry.dirty) { event.preventDefault(); event.returnValue = ''; }
        }, { signal: events.signal });
        // Ancestor page-section switching can reveal a CCO without selecting one
        // of its own tabs. Observe the frame's actual viewport in either case.
        const layout = new this.win.ResizeObserver(() => this.syncPresentation(entry));
        layout.observe(frame);
        entry.cleanup = () => {
          this.win.clearTimeout(entry.revealTimer); entry.revealTimer = null;
          layout.disconnect(); events.abort(); unbridge(); unnavigate(); unsize();
        };
        this.syncPresentation(entry);
      } catch (error) { fail(error.message || 'This page could not be inspected.'); }
    });
    entry.timeout = this.win.setTimeout(() => fail('This page did not finish loading within 45 seconds.'), 45000);
    frame.src = pageUrl(this.win, page.id);
    panel.append(frame);
    this.changed(entry);
    return entry;
  }

  retry(page, panel) {
    const entry = this.entries.get(page.id);
    if (entry) {
      this.win.clearTimeout(entry.timeout);
      entry.cleanup();
      entry.frame.remove();
      entry.resolve(entry);
      this.entries.delete(page.id);
    }
    return this.ensure(page, panel);
  }

  schedule(pages, panels, activeId) {
    this.cancelIdle();
    if (this.disposed || this.config.preload !== 'sequential-idle') return;
    if (this.entries.get(activeId)?.state !== 'ready') return;
    // Never stack speculative loads. A clicked page may start immediately alongside one in-flight preload.
    if ([...this.entries.values()].some(entry => entry.state === 'loading')) return;
    const next = pages.find(page => !this.entries.has(page.id));
    if (!next) return;
    const run = () => {
      this.idle = null;
      if (!this.disposed) this.ensure(next, panels.get(next.id));
    };
    this.idle = this.win.requestIdleCallback ? { type: 'idle', id: this.win.requestIdleCallback(run, { timeout: 2000 }) } : { type: 'timer', id: this.win.setTimeout(run, 300) };
  }

  cancelIdle() {
    if (!this.idle) return;
    if (this.idle.type === 'idle') this.win.cancelIdleCallback(this.idle.id);
    else this.win.clearTimeout(this.idle.id);
    this.idle = null;
  }

  dispose() {
    this.disposed = true;
    this.cancelIdle();
    for (const entry of this.entries.values()) {
      this.win.clearTimeout(entry.timeout);
      entry.cleanup();
      entry.frame.remove();
      entry.resolve(entry);
    }
    this.entries.clear();
  }
}

// src/page-editor.js

const activePageEditors = new WeakMap();

function pageEditingEnabled(win) {
  // The native flag is authoritative: the live parent has true without the
  // body class. Fall back to native markers only when the flag is unavailable.
  if (typeof win.gIsEasyEditEnabled === 'boolean') return win.gIsEasyEditEnabled;
  return !!(win.document.body?.classList.contains('TemplateAreaEasyEditOn') || win.document.querySelector('.ste-toggle.on'));
}

function contentEditorUrl(win, id) {
  let context;
  try { context = JSON.parse(win.document.getElementById('__ClientContext')?.value || '{}'); } catch { /* Older pages expose gWebSiteRoot instead. */ }
  const root = new URL(context?.websiteRoot || win.gWebSiteRoot || `${webRoot(win)}/`, win.location.origin);
  if (root.origin !== win.location.origin || !/^https?:$/.test(root.protocol) || root.username || root.password) throw new Error('The Content Designer website root must be same-origin.');
  root.pathname = root.pathname.replace(/\/*$/, '/'); root.search = ''; root.hash = '';
  const url = new URL('AsiCommon/Controls/ContentManagement/ContentDesigner/ContentRecordEdit.aspx', root);
  url.search = new URLSearchParams({ Mode:'Maximized', iUniformKey:guid(id), iOperation:'Edit', TemplateType:'E', DocumentTypeCode:'CON' }).toString();
  return url.href;
}

function openPageEditor(win, page, button, signal, closed) {
  if (signal.aborted || !pageEditingEnabled(win)) return;
  if (activePageEditors.has(win)) throw new Error('Close the current page editor before editing another tab.');
  const launch = win.ShowDialog_NoReturnValue;
  if (typeof launch !== 'function') throw new Error('Content Designer is unavailable on this page. Reload the containing page and try again.');
  const url = contentEditorUrl(win, page.id);
  let finished = false, closeTimer = null;
  const session = {};
  const release = () => {
    if (activePageEditors.get(win) === session) activePageEditors.delete(win);
    button.removeAttribute('aria-disabled');
  };
  const abort = () => {
    finished = true; win.clearTimeout(closeTimer); release();
  };
  const onClose = () => {
    if (finished) return;
    finished = true; release();
    // Our close handler runs before iMIS's closeHandler. Defer refresh/focus
    // until native dialog teardown and focus restoration have completed.
    closeTimer = win.setTimeout(() => {
      signal.removeEventListener('abort', abort);
      if (!signal.aborted) closed();
    }, 0);
  };
  activePageEditors.set(win, session);
  button.setAttribute('aria-disabled', 'true');
  signal.addEventListener('abort', abort, { once:true });
  try {
    // Verified on the deployed iMIS: argument 8 is beforeClose, argument 12
    // is close. Neither is a Save-only notification. The native helper adds
    // IsPopup/DialogCacheParam and maximizes ContentRecordEdit itself.
    launch.call(win, url, null, '90%', '90%', `Edit ${page.caption} page`, null, 'E', null, null, false, false, onClose, null);
  } catch (error) {
    abort(); signal.removeEventListener('abort', abort); throw error;
  }
}

// src/runtime.js

function element(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  if (tag === 'button') node.type = 'button';
  return node;
}

class CcoInstance {
  constructor(mount, win, identity) {
    this.mount = mount; this.win = win; this.doc = mount.ownerDocument; this.identity = identity;
    this.parameter = selectionParameter(identity);
    this.events = new win.AbortController();
    this.loadingTimers = new Map();
    this.generation = 0; this.disposed = false; this.pages = []; this.panels = new Map(); this.tabs = new Map();
    this.editButtons = new Map();
    this.mount.addEventListener('us-cco:reload', () => this.requestReload(), { signal: this.events.signal });
    this.load();
  }

  status(text, error = false) {
    this.message.textContent = text;
    this.message.classList.remove('us-cco__sr-only');
    this.message.classList.toggle('us-cco__error', error);
  }

  shell() {
    this.mount.replaceChildren();
    this.message = element(this.doc, 'p', 'us-cco__status', 'Loading content pages...');
    this.message.setAttribute('role', 'status');
    this.message.setAttribute('aria-live', 'polite');
    this.mount.append(this.message);
    const spinner = element(this.doc, 'span', 'section-loader-spinning-circles us-cco__loader');
    spinner.setAttribute('aria-hidden', 'true');
    this.mount.append(spinner);
  }

  async load() {
    this.clearLoadingTimers();
    const generation = ++this.generation;
    this.viewEvents?.abort();
    this.viewEvents = new this.win.AbortController();
    this.request?.abort();
    this.request = new this.win.AbortController();
    this.store?.dispose();
    this.store = null; this.pages = []; this.panels.clear(); this.tabs.clear(); this.editButtons.clear();
    this.blocked = false; this.context = this.win.location.href;
    this.shell();
    this.mount.setAttribute('aria-busy', 'true');
    try {
      const api = createApi(this.win);
      const query = new URLSearchParams({ ContentItemKey: this.identity.contentItemKey, ContentKey: this.identity.contentKey });
      const body = await api('GET', `ContentItem?${query}`, undefined, this.request.signal);
      if (this.disposed || generation !== this.generation) return;
      this.config = validateConfig(placementSettings(verifiedPlacement(body, this.identity)));
      this.unregisterParameter?.();
      this.unregisterParameter = registerSelectionParameter(this.win, this.config.urlParameter, this);
      this.parameter = this.config.urlParameter || selectionParameter(this.identity);
      const listing = folderPages(await api('POST', 'Document/_execute', folderRequest(this.config.folderDocumentVersionId), this.request.signal));
      if (this.disposed || generation !== this.generation) return;
      if (listing.pages.some(page => page.id === this.identity.contentKey)) throw new Error('This folder includes the containing page. Recursive CCO frames are not supported.');
      this.pages = listing.pages;
      if (!this.pages.length) {
        this.status('No available published content pages were returned for this folder. Check folder contents and access.');
        this.addReload();
        return;
      }
      this.render(listing);
    } catch (error) {
      if (this.disposed || generation !== this.generation || error.name === 'AbortError') return;
      this.status(error.message || 'Content pages could not be loaded.', true);
      this.addReload();
    } finally {
      if (!this.disposed && generation === this.generation) this.mount.setAttribute('aria-busy', 'false');
    }
  }

  addReload() {
    const retry = element(this.doc, 'button', 'us-cco__button', 'Reload configuration');
    retry.addEventListener('click', () => this.requestReload(), { signal: this.viewEvents.signal });
    this.mount.append(retry);
  }

  render(listing) {
    const heading = element(this.doc, 'details', 'us-cco__options');
    heading.append(element(this.doc, 'summary', '', 'Collection options'));
    const reload = element(this.doc, 'button', 'us-cco__button', 'Reload configuration');
    reload.addEventListener('click', () => this.requestReload(), { signal: this.viewEvents.signal });
    heading.append(reload);
    const vertical = this.config.orientation === 'vertical';
    const layout = element(this.doc, 'div', `cco tabs-wrapper tabs-${this.config.orientation}`);
    const strip = element(this.doc, 'div', vertical ? 'RadTabStripVertical RadTabStrip_Orion' : 'RadTabStrip RadTabStrip_Orion');
    const level = element(this.doc, 'div', 'rtsLevel rtsLevel1');
    this.tablist = element(this.doc, 'ul', 'rtsUL us-cco__tabs');
    this.tablist.setAttribute('role', 'tablist');
    this.tablist.setAttribute('aria-label', this.config.caption);
    const mobile = this.win.matchMedia('(max-width: 600px)');
    const orient = () => this.tablist.setAttribute('aria-orientation', vertical && !mobile.matches ? 'vertical' : 'horizontal');
    orient();
    mobile.addEventListener('change', orient, { signal: this.viewEvents.signal });
    this.content = element(this.doc, 'div', 'RadMultiPage us-cco__content');
    level.append(this.tablist); strip.append(level); layout.append(strip, this.content);
    this.mount.append(layout, heading);
    const baseId = `us-cco-${placementId(this.identity)}`;
    for (const [index, page] of this.pages.entries()) {
      const tab = element(this.doc, 'button', 'rtsLink us-cco__tab');
      const outer = element(this.doc, 'span', 'rtsOut');
      const inner = element(this.doc, 'span', 'rtsIn');
      inner.append(element(this.doc, 'span', 'rtsTxt', page.caption));
      outer.append(inner); tab.append(outer);
      tab.id = `${baseId}-tab-${page.id}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', `${baseId}-panel-${page.id}`);
      const panel = element(this.doc, 'section', 'us-cco__panel');
      const spinner = element(this.doc, 'span', 'section-loader-spinning-circles us-cco__loader');
      spinner.setAttribute('aria-hidden', 'true');
      panel.append(spinner);
      panel.id = `${baseId}-panel-${page.id}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.tabIndex = 0;
      const actions = element(this.doc, 'div', 'us-cco__actions');
      const retry = element(this.doc, 'button', 'TextButton us-icon-button us-cco__refresh');
      retry.title = 'refresh tab';
      retry.setAttribute('aria-label', 'refresh tab');
      retry.setAttribute('aria-controls', panel.id);
      const icon = this.doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      for (const [name, value] of Object.entries({ viewBox:'0 0 24 24', width:'18', height:'18', fill:'none', stroke:'currentColor', 'stroke-width':'1.8', 'stroke-linecap':'round', 'stroke-linejoin':'round', 'aria-hidden':'true', focusable:'false' })) icon.setAttribute(name, value);
      const path = this.doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      // Same reload glyph as the native UnionSuite window controls.
      path.setAttribute('d', 'M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 3l1 3M4 12l1 3a8 8 0 0 0 13 3');
      icon.append(path); retry.append(icon);
      retry.addEventListener('click', () => {
        this.refreshTab(page);
      }, { signal: this.viewEvents.signal });
      actions.append(retry); panel.append(actions);
      tab.addEventListener('click', () => this.select(page.id, true), { signal: this.viewEvents.signal });
      tab.addEventListener('keydown', event => {
        const count = this.pages.length;
        let next;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = count - 1;
        const isVertical = this.tablist.getAttribute('aria-orientation') === 'vertical';
        if (event.key === (isVertical ? 'ArrowDown' : 'ArrowRight')) next = (index + 1) % count;
        if (event.key === (isVertical ? 'ArrowUp' : 'ArrowLeft')) next = (index + count - 1) % count;
        if (next !== undefined) {
          event.preventDefault();
          // Manual activation: moving focus does not start an expensive page load.
          for (const button of this.tabs.values()) button.tabIndex = -1;
          const target = this.tabs.get(this.pages[next].id); target.tabIndex = 0; target.focus();
        }
      }, { signal: this.viewEvents.signal });
      this.tabs.set(page.id, tab); this.panels.set(page.id, panel);
      const item = element(this.doc, 'li', 'rtsLI');
      item.setAttribute('role', 'presentation'); item.append(tab);
      const edit = element(this.doc, 'button', 'TextButton us-icon-button us-cco__edit');
      edit.hidden = true;
      edit.title = `Edit ${page.caption} page`;
      edit.setAttribute('aria-label', edit.title);
      edit.setAttribute('aria-haspopup', 'dialog');
      edit.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m16 4 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6z"/></svg>';
      edit.addEventListener('click', () => this.editPage(page, edit), { signal:this.viewEvents.signal });
      this.editButtons.set(page.id, edit); item.append(edit);
      this.tablist.append(item); this.content.append(panel);
    }
    if (listing.folders || listing.excluded) {
      this.mount.append(element(this.doc, 'p', 'us-cco__note', `${listing.folders} nested folders omitted; ${listing.excluded} unavailable or non-published pages omitted.`));
    }
    this.store = new FrameStore(this.win, this.config, entry => this.frameChanged(entry));
    this.syncEditing();
    this.syncSelection();
  }

  syncEditing() {
    const enabled = pageEditingEnabled(this.win);
    for (const button of this.editButtons.values()) {
      if (button.hidden === enabled) button.hidden = !enabled;
      button.parentElement.classList.toggle('us-cco__tab-editable', enabled);
    }
  }

  refreshTab(page, afterEditor = false) {
    const entry = this.store?.entries.get(page.id), panel = this.panels.get(page.id);
    if (this.disposed || this.blocked || !this.store || !panel || (!afterEditor && entry?.state === 'loading')) return;
    if (entry?.dirty && !this.win.confirm('Discard unsaved changes and refresh this tab?')) return;
    this.store.retry(page, panel);
  }

  editPage(page, button) {
    if (this.disposed || this.blocked || !this.mount.isConnected) return;
    const generation = this.generation, context = contextSignature(this.win);
    try {
      openPageEditor(this.win, page, button, this.viewEvents.signal, () => {
        // A dialog may outlive a removed/reconfigured CCO or a contact change.
        if (this.disposed || this.blocked || generation !== this.generation || !this.mount.isConnected || contextSignature(this.win) !== context) return;
        this.refreshTab(page, true);
        this.syncEditing();
        const focus = button.hidden ? this.tabs.get(page.id) : button;
        if (focus?.isConnected && focus.getBoundingClientRect().width) focus.focus({ preventScroll:true });
      });
    } catch (error) {
      this.status(error.message || 'Content Designer could not be opened.', true);
    }
  }

  syncSelection() {
    if (!this.pages.length || this.blocked) return;
    const query = new URL(this.win.location.href).searchParams;
    const requested = query.get(this.parameter);
    const legacy = query.get(selectionParameter(this.identity));
    const configured = this.config.initialDocumentVersionId;
    const fallback = this.pages.find(page => page.id === configured)?.id || this.pages[0].id;
    const matched = resolveTabValue(this.pages, requested);
    const target = matched?.id || (requested === null && this.pages.find(page => page.id === legacy?.toLowerCase())?.id) || fallback;
    if (this.selected !== target || !this.store?.entries.has(target)) this.select(target, false);
    if (requested && !matched) this.status('The linked tab is unavailable. Showing the default tab.');
  }

  tabUrlValue(page) {
    return tabLinkValue(this.pages, page, this.config.urlValue);
  }

  select(id, writeHistory) {
    if (this.blocked || !this.store) return;
    const page = this.pages.find(item => item.id === id);
    if (!page) return;
    const start = this.win.performance.now();
    const warm = !!this.store.entries.get(id)?.presented;
    this.selected = id;
    this.store.cancelIdle();
    for (const item of this.pages) {
      const active = item.id === id, tab = this.tabs.get(item.id), panel = this.panels.get(item.id);
      tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
      tab.classList.toggle('rtsSelected', active);
      panel.hidden = !active; panel.inert = !active;
      if (!active) this.tabLoading(item.id, false);
    }
    const entry = this.store.ensure(page, this.panels.get(id));
    for (const retained of this.store.entries.values()) this.store.syncPresentation(retained);
    this.frameChanged(entry);
    if (writeHistory) {
      const url = new URL(this.win.location.href);
      const value = this.tabUrlValue(page);
      if (url.searchParams.get(this.parameter) !== value || (this.parameter !== selectionParameter(this.identity) && url.searchParams.has(selectionParameter(this.identity)))) {
        if (this.parameter !== selectionParameter(this.identity)) url.searchParams.delete(selectionParameter(this.identity));
        url.searchParams.set(this.parameter, value);
        this.win.history.pushState(this.win.history.state, '', url);
      }
    }
    this.mount.dispatchEvent(new this.win.CustomEvent('us-cco:timing', { detail: { kind: 'selection', warm, durationMs: this.win.performance.now() - start, retainedFrames: this.store.entries.size } }));
  }

  frameChanged(entry) {
    if (this.disposed || this.blocked || !entry) return;
    entry.panel.setAttribute('aria-busy', String(entry.state === 'loading'));
    const refresh = entry.panel.querySelector('.us-cco__refresh');
    refresh.setAttribute('aria-disabled', String(entry.state === 'loading'));
    refresh.setAttribute('aria-busy', String(entry.state === 'loading'));
    this.tabs.get(entry.page.id)?.setAttribute('data-state', entry.state);
    this.tabLoading(entry.page.id, entry.page.id === this.selected && entry.state === 'loading');
    if (entry.page.id === this.selected) this.status(entry.state === 'loading' ? `Loading ${entry.page.caption}...` : entry.state === 'error' ? `${entry.error} Use the refresh tab button to try again.` : `${entry.page.caption} ready.`, entry.state === 'error');
    if (entry.page.id === this.selected && entry.state !== 'error') this.message.classList.add('us-cco__sr-only');
    this.store.schedule(this.pages, this.panels, this.selected);
    if (entry.state === 'ready' && entry.reportedLoadCount !== entry.loadCount) {
      entry.reportedLoadCount = entry.loadCount;
      this.mount.dispatchEvent(new this.win.CustomEvent('us-cco:timing', { detail: { kind: 'frame-load', durationMs: entry.readyMs, retainedFrames: this.store.entries.size } }));
    }
  }

  syncLocation() {
    if (contextSignature(this.win) !== contextSignature(this.win, this.context)) {
      if (this.store?.hasDirty()) {
        this.blocked = true; this.store.cancelIdle();
        this.tablist.hidden = true; this.content.hidden = true; this.content.inert = true;
        this.status('Page context changed. The previous pages are hidden because they may contain unsaved changes.');
        if (!this.discard) {
          this.discard = element(this.doc, 'button', 'us-cco__button', 'Discard changes and load current context');
          this.discard.addEventListener('click', () => { this.discard = null; this.load(); }, { signal: this.viewEvents.signal });
          this.mount.append(this.discard);
        }
      } else this.load();
      return;
    }
    if (this.blocked) {
      this.blocked = false; this.tablist.hidden = false; this.content.hidden = false; this.content.inert = false;
      this.discard?.remove(); this.discard = null;
      this.frameChanged(this.store?.entries.get(this.selected));
    }
    this.syncSelection();
  }

  tabLoading(id, loading) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    tab.setAttribute('aria-busy', String(loading));
    if (!loading) {
      this.win.clearTimeout(this.loadingTimers.get(id)); this.loadingTimers.delete(id);
      tab.removeAttribute('data-us-tab-loading');
      tab.querySelector('[data-us-cco-spinner]')?.remove();
    } else if (!this.loadingTimers.has(id) && !tab.querySelector('[data-us-cco-spinner]')) {
      // Native theme appearance/delay, with independent ownership for retained frames.
      this.loadingTimers.set(id, this.win.setTimeout(() => {
        this.loadingTimers.delete(id);
        if (!tab.isConnected || this.disposed) return;
        const spinner = element(this.doc, 'span', 'us-tab-loading-spinner');
        spinner.setAttribute('data-us-cco-spinner', ''); spinner.setAttribute('aria-hidden', 'true');
        tab.setAttribute('data-us-tab-loading', ''); tab.append(spinner);
      }, 150));
    }
  }

  clearLoadingTimers() {
    for (const timer of this.loadingTimers.values()) this.win.clearTimeout(timer);
    this.loadingTimers.clear();
  }

  requestReload() {
    if (this.store?.hasDirty() && !this.win.confirm('Discard unsaved changes in retained pages and reload configuration?')) return;
    this.discard = null; this.load();
  }

  dispose() {
    this.unregisterParameter?.();
    this.clearLoadingTimers();
    this.disposed = true; this.generation++;
    this.request?.abort(); this.events.abort(); this.viewEvents?.abort(); this.store?.dispose();
    this.mount.replaceChildren();
  }
}

function installRuntime(win) {
  if (win.UnionSuiteCCO) { win.UnionSuiteCCO.scan(); return win.UnionSuiteCCO; }
  const instances = new Map(), failures = new WeakMap();
  const doc = win.document;
  let queued = false, disposed = false, application, manager;
  function scan() {
    if (disposed) return;
    for (const [mount, instance] of instances) {
      if (!mount.isConnected || mount.dataset.contentKey?.toLowerCase() !== instance.identity.contentKey || mount.dataset.contentItemKey?.toLowerCase() !== instance.identity.contentItemKey) { instance.dispose(); instances.delete(mount); }
      else instance.syncEditing();
    }
    const owners = new Set([...instances.values()].map(instance => placementId(instance.identity)));
    for (const mount of doc.querySelectorAll('[data-us-cco]')) {
      if (instances.has(mount)) continue;
      try {
        if (win.frameElement?.dataset.usCcoChild || mount.parentElement.closest('[data-us-cco]')) throw new Error('Nested UnionSuite CCO components are not supported in this trial.');
        const identity = placementIdentity(mount.dataset.contentKey, mount.dataset.contentItemKey);
        const key = placementId(identity);
        if (owners.has(key)) throw new Error('The same placement appears twice in this document. Use separate CCO placements.');
        owners.add(key);
        failures.delete(mount);
        instances.set(mount, new CcoInstance(mount, win, identity));
      } catch (error) {
        if (failures.get(mount) !== error.message) { mount.textContent = error.message; mount.setAttribute('role', 'status'); failures.set(mount, error.message); }
      }
    }
    hookAspNet();
  }
  function queueScan() {
    if (!queued) { queued = true; win.queueMicrotask(() => { queued = false; scan(); }); }
  }
  function locationChanged() { for (const instance of instances.values()) instance.syncLocation(); }
  function pageLoading(sender, args) {
    const removed = [...(args.get_panelsDeleting?.() || []), ...(args.get_panelsUpdating?.() || [])];
    for (const [mount, instance] of instances) if (removed.some(panel => panel === mount || panel.contains(mount))) { instance.dispose(); instances.delete(mount); }
  }
  function hookAspNet() {
    const app = win.Sys?.Application;
    if (app && application !== app) { application?.remove_load?.(queueScan); application = app; app.add_load(queueScan); }
    const next = win.Sys?.WebForms?.PageRequestManager?.getInstance?.();
    if (next && manager !== next) { manager?.remove_pageLoading?.(pageLoading); manager = next; next.add_pageLoading(pageLoading); }
  }
  const observer = new win.MutationObserver(records => {
    if (records.some(record => record.attributeName !== 'class' || record.target === doc.body || record.target === doc.documentElement || record.target.matches?.('.ste-toggle'))) queueScan();
  });
  observer.observe(doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-content-key', 'data-content-item-key', 'class'] });
  const unwatch = watchHistory(win, locationChanged);
  const unload = event => {
    if ([...instances.values()].some(instance => instance.store?.hasDirty())) { event.preventDefault(); event.returnValue = ''; }
  };
  win.addEventListener('beforeunload', unload);
  const api = {
    scan,
    reload: mount => instances.get(mount)?.requestReload(),
    diagnostics: () => [...instances.values()].map(instance => ({ placement: placementId(instance.identity), blocked: instance.blocked, frames: [...(instance.store?.entries.values() || [])].map(entry => ({ id: entry.page.id, state: entry.state, dirty: entry.dirty, loadCount: entry.loadCount, readyMs: entry.readyMs })) })),
    dispose() {
      disposed = true; observer.disconnect(); unwatch();
      application?.remove_load?.(queueScan); manager?.remove_pageLoading?.(pageLoading);
      win.removeEventListener('beforeunload', unload);
      for (const instance of instances.values()) instance.dispose();
      instances.clear(); delete win.UnionSuiteCCO;
    }
  };
  win.UnionSuiteCCO = api;
  scan();
  return api;
}

installRuntime(window);
})();
