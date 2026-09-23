/* Paste in the outer console on Account Page Staff, including after a reload.
 * Makes one read-only GET for Cases. Captures only the page-size dropdown's
 * descriptor shape and bounded callback code. Does not insert or initialize it.
 * No installed probe or previous failed report is required.
 */
(async () => {
  'use strict';
  if (window !== window.top) throw new Error('Use the outer page console.');
  const gridId = 'ctl01_TemplateBody_WebPartManager1_gwpciAccountpagetabs_ciAccountpagetabs_Cases_ResultsGrid_Grid1';
  const initialHref = location.href;
  const url = new URL(initialHref);
  if (!/\/_i4u_\/Core\/Staff-Site-Layouts\/Contact-Layouts\/Individual\/Account_Page_Staff\.aspx$/i.test(url.pathname)) throw new Error('Use the verified Account Page Staff page.');
  url.searchParams.set('b511e4d055d8', 'Cases'); url.hash = '';
  delete window.usCcoCasesPagerResult;
  console.info('[CCO pager capture] Waiting for the Cases response (30-second timeout)…');
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30000);
  let html;
  try {
    const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: controller.signal });
    if (!response.ok || !/\btext\/html\b/i.test(response.headers.get('content-type') || '')) throw new Error('Cases capture did not receive a successful HTML response.');
    html = await response.text();
  } finally { clearTimeout(timer); }
  if (location.href !== initialHref) throw new Error('Page context changed during capture.');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (doc.querySelector('input.SignInButton')) throw new Error('Cases capture returned a sign-in page.');
  const one = (scope, selector) => {
    const nodes = scope.querySelectorAll(selector);
    if (nodes.length !== 1) throw new Error('Expected one capture target: ' + selector);
    return nodes[0];
  };
  const root = one(doc, '#ste_container_ciAccountpagetabs');
  const grid = one(root, '#' + CSS.escape(gridId));
  const pager = one(grid, '.RadComboBox.PageSizeDropDown');
  const pagerId = pager.id;
  if (!pagerId.startsWith(gridId + '_') || !pagerId.endsWith('_PageSizeComboBox')) throw new Error('Unexpected Cases page-size dropdown identity.');
  one(doc, '#' + CSS.escape(pagerId));
  const view = grid.closest('.rmpView');
  const selected = [...root.querySelectorAll('.rtsLink.rtsSelected')];
  if (!view || view.hidden || view.style.display === 'none' || !selected.length || selected.some(link => (link.querySelector('.rtsTxt') || link).textContent.trim() !== 'Cases') || !pager.matches('.RadComboBox.PageSizeDropDown')) {
    throw new Error('Fetched page does not expose the expected selected Cases pager.');
  }
  const scripts = [...doc.scripts], descriptors = [], gridPositions = [];
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const ending = id => new RegExp(',\\s*\\$get\\s*\\(\\s*([\'"])' + escape(id) + '\\1\\s*\\)\\s*\\)\\s*;');
  const shape = (value, key = '', depth = 0) => {
    if (value === null) return { type: 'null' };
    if (Array.isArray(value)) return { type: 'array', length: value.length };
    if (typeof value === 'object') return depth < 6
      ? { type: 'object', fields: Object.fromEntries(Object.entries(value).slice(0, 100).map(([name, child]) => [name, shape(child, name, depth + 1)])), truncated: Object.keys(value).length > 100 }
      : { type: 'object', truncated: true };
    if (typeof value === 'boolean' || typeof value === 'number') return { type: typeof value, value };
    if (typeof value === 'string' && /(?:id|field)$/i.test(key) && (value === pagerId || value === pagerId.replaceAll('_', '$') || doc.getElementById(value) && value.startsWith(gridId))) return { type: 'identifier', id: value };
    return { type: typeof value };
  };
  for (const [scriptIndex, script] of scripts.entries()) {
    if (script.src || !script.textContent.includes(gridId)) continue;
    const text = script.textContent;
    for (const match of text.matchAll(/\$create\s*\(\s*Telerik\.Web\.UI\.(RadComboBox|RadGrid)\s*,\s*/g)) {
      const start = match.index + match[0].length;
      if (text[start] !== '{') continue;
      // Skip the complete JSON property object before collecting callbacks.
      // Never copy grid data, combo item data or hidden-input values.
      let depth = 0, quoted = false, escaped = false, end = -1;
      for (let index = start; index < text.length; index++) {
        const char = text[index];
        if (quoted) {
          if (escaped) escaped = false;
          else if (char === '\\') escaped = true;
          else if (char === '"') quoted = false;
        } else if (char === '"') quoted = true;
        else if (char === '{') depth++;
        else if (char === '}' && --depth === 0) { end = index + 1; break; }
      }
      if (end < 0) continue;
      let properties;
      try { properties = JSON.parse(text.slice(start, end)); } catch { continue; }
      const targetId = match[1] === 'RadGrid' ? gridId : pagerId;
      const remaining = text.slice(end, end + 8000), tail = ending(targetId).exec(remaining);
      if (!tail) continue;
      const argumentsText = remaining.slice(0, tail.index);
      if (/\$create\s*\(/.test(argumentsText)) continue;
      const args = argumentsText.match(/^\s*,\s*([\s\S]+),\s*(null|\{\s*\})\s*$/);
      if (!args) throw new Error('Expected bounded callbacks and empty component references.');
      const position = { scriptIndex, line: text.slice(0, match.index).split('\n').length, offset: match.index };
      if (match[1] === 'RadGrid') { gridPositions.push(position); continue; }
      // This is exact code for inspection, not a reconstruction. _postBackReference
      // may hold the pager command; all other arbitrary property strings stay out.
      const postBackSources = Object.fromEntries(Object.entries(properties).filter(([key, value]) => /postbackreference/i.test(key) && typeof value === 'string').map(([key, value]) => {
        if (value.length > 2500) throw new Error('Pager postback source exceeds the capture bound.');
        return [key, value];
      }));
      descriptors.push({ ...position, constructor: 'Telerik.Web.UI.RadComboBox', properties: shape(properties), eventsSource: args[1].trim(), referencesSource: args[2], postBackSources });
    }
  }
  if (descriptors.length !== 1 || gridPositions.length !== 1) throw new Error('Expected exactly one pager descriptor and one grid descriptor in the fresh response.');
  const descriptor = descriptors[0], gridPosition = gridPositions[0];
  const result = {
    capture: 'cases-pager-source-v1', source: 'fresh-parent-response-not-inserted', gridId, pagerId,
    insideGrid: true, descriptor, gridDescriptorPosition: gridPosition,
    emittedBeforeGrid: descriptor.scriptIndex < gridPosition.scriptIndex || descriptor.scriptIndex === gridPosition.scriptIndex && descriptor.offset < gridPosition.offset,
    hiddenInputs: [...grid.closest('.ContentItemContainer').querySelectorAll('input[type="hidden"][id]')].map(input => ({ id: input.id, name: input.name, insideGrid: grid.contains(input) })),
    scope: 'One same-origin Cases GET. No insertion, initialization, postback or native action. Row data, combo item data and input values omitted. Exact bounded event/postback code included for inspection.'
  };
  // Preserve the redacted result independently of DevTools clipboard helpers.
  // The async console evaluation initially displays a Promise, not this object.
  window.usCcoCasesPagerResult = result;
  console.info('[CCO pager capture] Complete. To copy: copy(JSON.stringify(window.usCcoCasesPagerResult, null, 2));');
  try {
    if (typeof copy === 'function') copy(JSON.stringify(result, null, 2));
    else console.info(JSON.stringify(result, null, 2));
  } catch {
    console.warn('[CCO pager capture] Automatic copying failed. The result is saved in window.usCcoCasesPagerResult; use the command above.');
  }
  return result;
})();
