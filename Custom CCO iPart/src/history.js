import { guid, placementId } from './contracts.js';
import { webRoot } from './api.js';

export function selectionParameter(identity) { return `us-cco-${placementId(identity)}`; }

export function tabNameValue(caption) { return caption.trim().replace(/\s+/g, '-'); }

// Incoming links accept every supported representation, independently of the
// author's preferred format for links written when a tab is clicked.
export function resolveTabValue(pages, value) {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const normalized = value.trim().toLowerCase();
  const keyed = pages.find(page => page.id === normalized);
  if (keyed) return keyed;
  // Reserve positive integer values for positions in the available tab list.
  if (/^[1-9]\d*$/.test(normalized)) return pages[Number(normalized) - 1];
  const named = pages.filter(page => page.caption.toLowerCase() === normalized || tabNameValue(page.caption).toLowerCase() === normalized);
  return named.length === 1 ? named[0] : undefined;
}

export function tabLinkValue(pages, page, format) {
  if (format === 'number') return String(pages.indexOf(page) + 1);
  // A numeric/key-shaped caption can resolve to a different tab. Keep generated
  // links round-trippable by using this page's stable key in that case.
  const name = tabNameValue(page.caption);
  if (format === 'name' && resolveTabValue(pages, name)?.id === page.id) return name;
  return page.id;
}

const customParameters = new WeakMap();
export function registerSelectionParameter(win, name, owner) {
  if (!name) return () => {};
  let names = customParameters.get(win);
  if (!names) { names = new Map(); customParameters.set(win, names); }
  const key = name.toLowerCase();
  if (names.has(key) && names.get(key) !== owner) throw new Error('Another CCO uses this URL parameter. Give each collection a unique parameter name.');
  names.set(key, owner);
  return () => { if (names.get(key) === owner) names.delete(key); };
}

export function effectiveContext(url, win) {
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

export function contextSignature(win, href = win.location.href) { return effectiveContext(new URL(href), win).toString(); }

export function pageUrl(win, id) {
  const url = new URL(`${webRoot(win)}/iMIS/ContentManagement/ContentPreview.aspx`, win.location.origin);
  url.search = effectiveContext(new URL(win.location.href), win).toString();
  for (const [key, value] of Object.entries({ iMode: 'Execute', iUniformKey: guid(id), iOperation: 'Execute', TemplateType: 'E', DocumentTypeCode: 'CON', IsPopup: 'true' })) url.searchParams.set(key, value);
  return url.href;
}

// Notify consumers of host SPA/context changes as well as this component's selection changes.
export function watchHistory(win, changed) {
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
