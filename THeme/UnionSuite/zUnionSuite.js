/* Embedded icons: Lucide v1.8.0 (Funnel, Download, Maximize, Minimize,
   ArrowUpDown, ArrowUp and ArrowDown).
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

The following Lucide icons are derived from the Feather project:

airplay, alert-circle, alert-octagon, alert-triangle, aperture, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar, cast, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard, clock, code, columns, command, compass, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, crosshair, database, divide-circle, divide-square, dollar-sign, download, external-link, feather, frown, hash, headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link, loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, move, music, navigation-2, navigation, octagon, pause-circle, percent, plus-circle, plus-square, plus, power, radio, rss, search, server, share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet, target, terminal, trash-2, trash, triangle, tv, type, upload, x-circle, x-octagon, x-square, x, zoom-in, zoom-out

The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
/* US-APPEARANCE:START */
/* Document-level preference; zzDarkMode.css owns every appearance style.
   Include shared JS in each themed iframe/popup as well as the main page. */
(function () {
  'use strict';
  if (window.UnionSuiteAppearance) { window.UnionSuiteAppearance.refresh(); return; }
  const root = document.documentElement;
  const config = window.UnionSuiteAppearanceConfig || {};
  const storageKey = typeof config.storageKey === 'string' && config.storageKey ? config.storageKey : 'union-suite:appearance:v1';
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const eventName = 'unionsuite:appearancechange';
  let storageAvailable = true;
  let preference = read();
  function valid(value) { return value === 'dark' || value === 'light' ? value : null; }
  function read() {
    try { return valid(window.localStorage.getItem(storageKey)); }
    catch (_) { storageAvailable = false; return null; }
  }
  function state() {
    return Object.freeze({preference, scheme:preference || (media.matches ? 'dark' : 'light'), storageAvailable,
      enabled:window.getComputedStyle(root).getPropertyValue('--us-dark-mode-enabled').trim() === '1'});
  }
  function render() {
    const current = state();
    if (current.enabled) root.setAttribute('data-us-color-scheme',current.scheme);
    else root.removeAttribute('data-us-color-scheme');
    window.dispatchEvent(new CustomEvent(eventName,{detail:current}));
  }
  // Storage events cover other tabs/windows. Same-origin descendant documents
  // also receive page-only choices when storage is unavailable. No CSS injection.
  function syncFrames(target) {
    try {
      if (target !== window && target.UnionSuiteAppearance?.storageKey === storageKey) {
        target.UnionSuiteAppearance.receive(preference,storageAvailable);
      }
      for (let i=0; i<target.frames.length; i++) syncFrames(target.frames[i]);
    } catch (_) { /* Cross-origin documents retain their own appearance. */ }
  }
  function setPreference(value) {
    if (value !== null && value !== 'system' && value !== 'light' && value !== 'dark') return;
    preference = valid(value);
    try {
      if (preference) window.localStorage.setItem(storageKey,preference);
      else window.localStorage.removeItem(storageKey);
      storageAvailable = true;
    } catch (_) { storageAvailable = false; }
    render();
    let top = window;
    try { if (window.top.location.origin === window.location.origin) top = window.top; } catch (_) {}
    syncFrames(top);
  }
  function receive(value,available) { preference = valid(value); storageAvailable = available; render(); }
  function refresh() { render(); }
  // A newly mounted same-origin frame can inherit an unsaved parent choice.
  try {
    if (window.parent !== window && window.parent.UnionSuiteAppearance?.storageKey === storageKey) {
      const parentState = window.parent.UnionSuiteAppearance.getState();
      preference = parentState.preference; storageAvailable = parentState.storageAvailable;
    }
  } catch (_) {}
  window.UnionSuiteAppearance = Object.freeze({storageKey,getState:state,setPreference,receive,refresh,
    toggle:() => setPreference(state().scheme === 'dark' ? 'light' : 'dark'), reset:() => setPreference(null)});
  media.addEventListener('change',() => { if (!preference) render(); });
  window.addEventListener('storage',event => {
    if (event.key !== storageKey && event.key !== null) return;
    try { if (event.storageArea && event.storageArea !== window.localStorage) return; } catch (_) {}
    preference = read(); render();
  });
  window.addEventListener('pageshow',refresh);
  window.addEventListener('load',refresh,{once:true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',refresh,{once:true});
  render();
})();
/* US-APPEARANCE:END */

/* US-ACTION-SAFETY:START — internal guard shared by the two public action APIs. */
(function () {
  'use strict';
  if (window.UnionSuiteActionSafety) return;
  const painted = new WeakMap();
  let notice;
  const message = 'Action unavailable: conflicting definitions. Contact your administrator.';
  function announce(element, event) {
    event?.preventDefault(); event?.stopImmediatePropagation();
    if (!notice?.isConnected) {
      notice = document.createElement('div'); notice.className = 'us-action-conflict-notice';
      notice.setAttribute('role', 'status'); document.body.append(notice);
    }
    notice.hidden = false; notice.textContent = message;
    element.dispatchEvent(new CustomEvent('us:action-error', {bubbles:true,
      detail:{phase:'conflict', actionId:element.dataset.usActionConflict, error:new Error(message)}}));
  }
  function clear(element) {
    const previous = painted.get(element); if (!previous) return;
    previous.badge.remove();
    Object.entries(previous.attributes).forEach(([name,value]) => {
      if (value === null) element.removeAttribute(name); else element.setAttribute(name,value);
    });
    element.classList.remove('us-action-conflict'); element.removeAttribute('data-us-action-conflict');
    painted.delete(element);
  }
  function decorate(key, element, conflict) {
    if (!conflict) {clear(element);return;}
    if (painted.has(element) && element.dataset.usActionConflict === key) return;
    clear(element);
    const attributes = Object.fromEntries(['href','tabindex','disabled','aria-disabled','aria-label','title'].map(name => [name,element.getAttribute(name)]));
    const title = element.getAttribute('aria-label') || element.getAttribute('title') || element.textContent.trim();
    const badge = document.createElementNS('http://www.w3.org/2000/svg','svg');
    Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'2','aria-hidden':'true',focusable:'false',class:'us-action-conflict-icon'}).forEach(([name,value]) => badge.setAttribute(name,value));
    const path = document.createElementNS(badge.namespaceURI,'path');
    path.setAttribute('d','M12 3 2 21h20L12 3z M12 9v5 M12 17v1');badge.append(path);
    painted.set(element,{attributes,badge});element.append(badge);
    element.classList.add('us-action-conflict');element.setAttribute('data-us-action-conflict',key);
    element.removeAttribute('href');element.removeAttribute('disabled');element.setAttribute('aria-disabled','true');element.setAttribute('tabindex','0');
    element.setAttribute('aria-label',title+'. '+message);element.setAttribute('title',title+'. '+message);
  }
  // Stop target/inline and bubbling legacy click handlers for a known conflict.
  // Earlier window/document capture handlers and direct function calls cannot be undone.
  document.addEventListener('click',event => {
    const element = event.target.closest?.('[data-us-action-conflict]');
    if (element && !element.closest('.us-report-no-styling,[data-us-actions-ignore]')) announce(element,event);
  },true);
  document.addEventListener('keydown',event => {
    // Removing href prevents navigation but also removes native Enter activation.
    const element = event.target.closest?.('a[data-us-action-conflict]');
    if (element && (event.key === 'Enter' || event.key === ' ') && !element.closest('.us-report-no-styling,[data-us-actions-ignore]')) announce(element,event);
  },true);
  function metadata(value, required) {
    if (value?.owner == null && value?.source == null && !required) return null;
    if (!value || typeof value.owner !== 'string' || !value.owner.trim() || typeof value.source !== 'string' || !value.source.trim()) throw new TypeError('Action registration requires nonempty owner and source strings');
    return {owner:value.owner.trim(),source:value.source.trim()};
  }
  function create(namespace, changed) {
    const records = new Map();
    function inspect(key) {
      const record=records.get(key);
      return {key,namespace,status:!record?'unconfigured':record.conflict?'conflict':record.configured?'configured':'registered',
        registrations:record?record.claims.map(c=>({owner:c.owner,source:c.source})):[]};
    }
    function put(key,value,meta,replace=false) {
      let record=records.get(key);
      const known=record?.claims.find(c=>meta?c.owner===meta.owner&&c.source===meta.source:!c.named&&c.value===value);
      if (!replace && known) return {accepted:false,record}; // Repeated include, retain the current definition.
      const claim={...(meta||{owner:'legacy',source:'unspecified'}),named:!!meta,value};
      if (!record) {record={value,claims:[claim],conflict:false,configured:replace};records.set(key,record);}
      else if (replace) {
        if (!known) record.claims.push(claim);
        record.value=value;record.conflict=false;record.configured=true;
      } else {
        record.claims.push(claim);record.conflict=true;
        const detail=inspect(key);
        console.error('[UnionSuite] Conflicting action definitions',detail);
        document.dispatchEvent(new CustomEvent('us:action-conflict',{detail}));
      }
      if (replace && notice) notice.hidden=true;
      changed();return {accepted:replace||!record.conflict,record};
    }
    return {put,inspect,list:()=>[...records.keys()].map(inspect),has:key=>records.has(key),get:key=>records.get(key)?.value,
      definitions:key=>{const record=records.get(key);return !record?[]:record.conflict?record.claims.map(claim=>claim.value):[record.value];},
      conflicted:key=>!!records.get(key)?.conflict,
      remove(key,value){const record=records.get(key);if(record && (arguments.length===1 || record.value===value && !record.conflict)){records.delete(key);changed();}},
      decorate:(key,element)=>decorate(key,element,!!records.get(key)?.conflict),
      block(key,element,event){if(!records.get(key)?.conflict)return false;announce(element,event);return true;}};
  }
  window.UnionSuiteActionSafety=Object.freeze({create,metadata,clear,decorate});
})();
/* US-ACTION-SAFETY:END */

/* US-ACTION-REFRESH:START — native IQA requests, scoped identities and one queue. */
(function () {
  'use strict';
  if (window.UnionSuiteRefresh) return;
  const gridSelector = '[id$="_ContentPanel"] > [id$="_ListerPanel"] > [data-gridid]';
  const refreshSelector = 'input[id$="_ResultsGrid_RefreshButton"][data-ajaxupdatedcontrolid]';
  let tail = Promise.resolve();
  const identities = new WeakMap(); let identitySequence = 0;
  function uniqueId(id) {
    if (!id) return null;
    const matches = document.querySelectorAll('#' + CSS.escape(id));
    if (matches.length !== 1) throw new Error('Refresh identity is missing or duplicated: ' + id);
    return matches[0];
  }
  function identity(element) {
    if (!element) return null;
    if (!identities.has(element)) identities.set(element, 'instance-' + (++identitySequence));
    return {id:element.id || null, element, key:element.id || identities.get(element)};
  }
  function current(ref) {
    if (!ref) throw new Error('No refresh origin is available. Configure an explicit target.');
    if (ref.id) return uniqueId(ref.id);
    if (!ref.element.isConnected) throw new Error('The refresh target was replaced and has no stable ID.');
    return ref.element;
  }
  function ownGrids(root) {
    const container = root.closest('.ContentItemContainer');
    return [root, ...root.querySelectorAll(gridSelector)].filter(node => node.matches(gridSelector) && node.closest('.ContentItemContainer') === container);
  }
  function capture(trigger, owner) {
    const container = (owner || trigger)?.closest('.ContentItemContainer');
    const root = owner || trigger?.closest('.panel')?.parentElement || container || trigger;
    let grids = root ? ownGrids(root) : [];
    const inGrid = trigger?.closest('[data-gridid]');
    if (inGrid?.matches(gridSelector) && inGrid.closest('.ContentItemContainer') === container) grids = [inGrid];
    return Object.freeze({owner:identity(root), container:identity(container),
      report:grids.length === 1 ? identity(grids[0].parentElement.parentElement) : null,
      ambiguous:grids.length > 1});
  }
  function reportControl(origin) {
    if (origin?.ambiguous) throw new Error('The action origin contains multiple reports. Configure an explicit refresh target.');
    if (!origin?.report) throw new Error('This action has no native IQA origin. Configure a refresh callback or explicit report.');
    const content = current(origin.report);
    if (!content.matches('[id$="_ContentPanel"]')) throw new Error('The original report identity now belongs to another component.');
    if (origin.container && content.closest('.ContentItemContainer') !== current(origin.container)) throw new Error('The report no longer belongs to its original iPart.');
    const grids = content.querySelectorAll(':scope > [id$="_ListerPanel"] > [data-gridid]');
    if (grids.length !== 1) throw new Error('Native IQA structure is missing or ambiguous.');
    const grid = grids[0];
    const buttons = [...content.querySelectorAll(refreshSelector)].filter(button => button.closest('[id$="_ContentPanel"]') === content && button.closest('.ContentItemContainer') === content.closest('.ContentItemContainer'));
    if (buttons.length !== 1) throw new Error('Expected one native IQA Refresh control.');
    const button = buttons[0], updated = uniqueId(button.getAttribute('data-ajaxupdatedcontrolid'));
    if (!updated || !(updated === content || content.contains(updated)) || !(updated === grid || updated.contains(grid) || grid.contains(updated))) throw new Error('Native Refresh targets a different component.');
    if (button.disabled || button.getAttribute('aria-disabled') === 'true') throw new Error('The native Refresh control is disabled.');
    return button;
  }
  function manager() {
    const value = window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
    if (!value || ['get_isInAsyncPostBack','add_beginRequest','remove_beginRequest','add_endRequest','remove_endRequest'].some(name => typeof value[name] !== 'function')) throw new Error('An awaitable ASP.NET async-postback manager is not available.');
    return value;
  }
  function waitIdle(prm, timeout, signal) {
    return new Promise((resolve, reject) => {
      let timer;
      function finish(error) { clearTimeout(timer); prm.remove_endRequest(ended); signal?.removeEventListener('abort', aborted); error ? reject(error) : resolve(); }
      function ended() { queueMicrotask(() => { if (!prm.get_isInAsyncPostBack()) finish(); }); }
      function aborted() { finish(new Error('Refresh cancelled before activation.')); }
      if (signal?.aborted) { reject(new Error('Refresh cancelled before activation.')); return; }
      if (!prm.get_isInAsyncPostBack()) { resolve(); return; }
      prm.add_endRequest(ended); signal?.addEventListener('abort', aborted, {once:true});
      timer = setTimeout(() => finish(new Error('Timed out waiting for the current native request.')), timeout);
    });
  }
  async function postback(resolveControl, {timeout=30000, startTimeout=1000, signal}={}) {
    const prm = manager();
    await waitIdle(prm, timeout, signal);
    if (signal?.aborted) throw new Error('Refresh cancelled before activation.');
    return new Promise((resolve, reject) => {
      let button, started = false, finished = false, startTimer, endTimer;
      function finish(error) {
        if (finished) return; finished = true;
        clearTimeout(startTimer); clearTimeout(endTimer);
        prm.remove_beginRequest(begin); prm.remove_endRequest(end);
        window.removeEventListener('pagehide', leaving); signal?.removeEventListener('abort', aborted);
        error ? reject(error) : resolve({status:'refreshed', controlId:button.id});
      }
      function begin(sender, args) {
        if (args.get_postBackElement?.() !== button) {
          if (started) finish(new Error('The native refresh was interrupted by another request.'));
          return;
        }
        started = true; clearTimeout(startTimer);
        endTimer = setTimeout(() => finish(new Error('Native refresh timed out; its server outcome is unknown.')), timeout);
      }
      function end(sender, args) {
        if (!started) return;
        const error = args?.get_error?.();
        // Do not suppress native errors. Existing iMIS handlers retain ownership.
        finish(error || undefined);
      }
      function leaving() { finish(new Error('The refresh caused navigation instead of a supported async update.')); }
      function aborted() { finish(new Error(started ? 'Refresh wait cancelled; the native request may still complete.' : 'Refresh cancelled before activation.')); }
      prm.add_beginRequest(begin); prm.add_endRequest(end);
      window.addEventListener('pagehide', leaving); signal?.addEventListener('abort', aborted, {once:true});
      try {
        button = resolveControl();
        if (signal?.aborted) { aborted(); return; }
        if (prm.get_isInAsyncPostBack()) throw new Error('Another native request started before this refresh could activate.');
        startTimer = setTimeout(() => finish(new Error('The native Refresh did not start an accepted async request.')), startTimeout);
        button.click();
      } catch (error) { finish(error); }
    });
  }
  function enqueue(resolveControl, options={}) {
    for (const key of ['timeout','startTimeout']) if (options[key] != null && (!Number.isFinite(options[key]) || options[key] <= 0)) return Promise.reject(new TypeError(key + ' must be a positive number.'));
    const request = tail.then(() => postback(resolveControl, options));
    tail = request.catch(() => {});
    return request;
  }
  function origins(selector, options, origin) {
    if (typeof selector !== 'string' || !selector.trim()) throw new TypeError('Refresh requires a selector.');
    const scope = options.scope === 'page' ? document : options.scope instanceof Element ? options.scope : current(origin?.owner);
    if (options.scope != null && options.scope !== 'page' && options.scope !== 'origin' && !(options.scope instanceof Element)) throw new TypeError('Refresh scope must be page, origin or an Element.');
    const targets = [...scope.querySelectorAll(selector)];
    if (scope instanceof Element && scope.matches(selector)) targets.unshift(scope);
    const match = options.match || 'one';
    if (!['one','all'].includes(match)) throw new TypeError('Refresh match must be one or all.');
    if (!targets.length || (match === 'one' && targets.length !== 1)) throw new Error('Refresh selector has ' + targets.length + ' matches: ' + selector);
    const seen = new Set();
    return targets.map(target => capture(target, target)).filter(item => {
      reportControl(item); const key = item.report.key;
      if (seen.has(key)) return false; seen.add(key); return true;
    });
  }
  function facade(origin, options={}) {
    return Object.freeze({
      originReport: extra => enqueue(() => reportControl(origin), {...options,...extra}),
      async iqa(selector, extra={}) {
        const targets = origins(selector, extra, origin), results = [];
        for (const item of targets) results.push(await enqueue(() => reportControl(item), {...options,...extra}));
        return results;
      }
    });
  }
  async function plan(config, env, progress={completed:[], next:0}) {
    if (!config) return progress;
    const refresh = facade(env.origin), callbackEnv = {...env, refresh};
    if (config.run) { await config.run(callbackEnv); progress.next = 1; return progress; }
    const targets = config.targets || [], seen = new Set(progress.completed);
    for (let i = progress.next; i < targets.length; i++) {
      const target = targets[i];
      if (target.type === 'custom') { await target.run(callbackEnv); }
      else {
        const matches = target.type === 'origin-report' ? [env.origin] : origins(target.selector, target, env.origin);
        for (const item of matches) {
          reportControl(item); const key = item.report.key;
          if (seen.has(key)) continue;
          await enqueue(() => reportControl(item), target);
          seen.add(key); progress.completed.push(key);
        }
      }
      progress.next = i + 1;
    }
    return progress;
  }
  window.UnionSuiteRefresh = Object.freeze({version:'1.0', capture, forOrigin:facade, plan,
    iqa:(selector,options={}) => facade(options.origin).iqa(selector, options),
    native:(origin,options) => enqueue(() => reportControl(origin),options)});
})();
/* US-ACTION-REFRESH:END */

/* US-UNIFIED-ACTIONS:START — one definition, per-control context, one lifecycle. */
(function () {
  'use strict';
  if (window.UnionSuiteActions) { window.UnionSuiteActions.refresh(); return; }
  const safety = window.UnionSuiteActionSafety.create('action', () => schedule());
  const controls = new Map(), generated = new Map(), slots = new Map(), locks = new Set(), windows = new Set();
  const classOwners = new Map();
  const reserved = new Set(['us-action-conflict','us-action-conflict-icon','us-action-conflict-notice','us-action-tooltip']);
  const excluded = element => !!element.closest('.us-report-no-styling,[data-us-actions-ignore]');
  const classes = element => [...element.classList].filter(name => /^us-action-[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name) && !reserved.has(name));
  const thenable = value => value && typeof value.then === 'function';
  let scheduled = false, sequence = 0, accessResolver = null, notice;
  const ownAttrs = ['type','role','tabindex','aria-label','aria-disabled','aria-busy','aria-haspopup','title','href','target','rel'];
  const runtimeClasses = ['us-command','us-icon-button','TextButton','us-outline-button','us-panel-action--text','us-panel-action','us-actions__item','us-actions__item--danger','DangerButton'];
  function put(element, name, value) {
    if (value == null) { if (element.hasAttribute(name)) element.removeAttribute(name); }
    else if (element.getAttribute(name) !== String(value)) element.setAttribute(name, String(value));
  }
  function announce(message, env, phase, error, retry) {
    if (!notice?.isConnected) { notice = document.createElement('div'); notice.className = 'us-command-notice'; notice.setAttribute('role','status'); document.body.append(notice); }
    notice.replaceChildren(document.createTextNode(message));
    if (retry) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Retry refresh';
      button.addEventListener('click', async () => { if (button.disabled) return; button.disabled = true; try { await retry(); notice.textContent = 'View refreshed.'; } catch (failure) { button.disabled = false; button.title = 'Refresh failed. You can retry the view refresh.'; console.error('[UnionSuiteActions] Refresh retry failed',failure); } });
      notice.append(button);
    }
    if (error) {
      console.error('[UnionSuiteActions]', env?.key, phase, error);
      (env?.trigger?.isConnected ? env.trigger : document).dispatchEvent(new CustomEvent('us:action-error',{bubbles:true,detail:{key:env?.key,actionId:env?.key,phase,error}}));
    }
  }
  function size(value, fallback) {
    if (value == null) return fallback;
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
    if (typeof value === 'string' && /^\d+(?:\.\d+)?px$/.test(value) && parseFloat(value) > 0) return parseFloat(value);
    if (typeof value === 'string' && /^(?:[1-9]\d?|100)%$/.test(value)) return value;
    throw new TypeError('Popup dimensions require positive pixels or whole percentages from 1% to 100%.');
  }
  function url(value, popup=false) {
    if (typeof value !== 'string' || !/^(https?:\/\/|\/(?!\/)|#|\.\.?\/)/i.test(value) || /[\u0000-\u001f\\]/.test(value)) throw new TypeError('Use an HTTP(S) or relative action URL.');
    const parsed = new URL(value, document.baseURI);
    if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password) throw new TypeError('Use an HTTP(S) action URL without credentials.');
    if (popup && parsed.hash) throw new TypeError('Native popup URLs cannot contain a fragment.');
    return parsed;
  }
  function object(value, name) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(name + ' must be an object.'); }
  function validate(key, value) {
    if (!/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/.test(key)) throw new TypeError('Use a namespaced action key.');
    object(value,'Definition'); window.UnionSuiteActionSafety.metadata(value,true);
    if (typeof value.className !== 'string' || !/^us-action-[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value.className) || reserved.has(value.className)) throw new TypeError('Supply one us-action-AREA-COMMAND class.');
    const p = value.presentation, a = value.action, context = value.context || {};
    object(p,'presentation'); object(a,'action'); object(context,'context');
    if (typeof p.label !== 'string' || !p.label.trim()) throw new TypeError('presentation.label is required.');
    if (p.icon != null && !/^(plus|pencil|trash|ti-[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(p.icon)) throw new TypeError('Use plus, pencil, trash or one Tabler glyph class.');
    for (const name of ['default','header','row','menu']) if (p[name] != null && !['button','icon','link','menu-item'].includes(p[name])) throw new TypeError('Invalid presentation mode: ' + name);
    if (p.tone != null && !['default','danger'].includes(p.tone)) throw new TypeError('presentation.tone must be default or danger.');
    if (p.order != null && !Number.isFinite(p.order)) throw new TypeError('presentation.order must be numeric.');
    for (const [name, field] of Object.entries(context)) {
      if (!/^[a-zA-Z][\w]*$/.test(name) || ['__proto__','constructor','prototype'].includes(name)) throw new TypeError('Invalid context field name.');
      object(field,'context.' + name);
      if (field.resolve != null && typeof field.resolve !== 'function') throw new TypeError('Context resolve must be a function.');
      if (field.validate != null && typeof field.validate !== 'function') throw new TypeError('Context validate must be a function.');
      if (field.required != null && typeof field.required !== 'boolean') throw new TypeError('Context required must be boolean.');
      if (!field.resolve && !Object.hasOwn(field,'value')) {
        if (!['trigger','owner','closest','query'].includes(field.from)) throw new TypeError('Unknown context source for ' + name);
        if (field.from === 'query') { if (typeof field.parameter !== 'string' || !field.parameter) throw new TypeError('Query context needs a named parameter.'); }
        else if (!/^data-[a-z][a-z0-9-]*$/.test(field.attribute || '')) throw new TypeError('Attribute context needs a data-* attribute.');
        if (field.from === 'closest') { if (!field.selector) throw new TypeError('Closest context needs a selector.'); document.createElement('div').matches(field.selector); }
      }
    }
    if (!['function','popup','navigate'].includes(a.type)) throw new TypeError('action.type must be function, popup or navigate.');
    if (a.type === 'function' && typeof a.run !== 'function') throw new TypeError('Function actions require run.');
    if (a.type !== 'function' && !(typeof a.href === 'string' || typeof a.href === 'function')) throw new TypeError('Popup/navigation actions require href.');
    if (a.type !== 'function' && a.run != null) throw new TypeError('Choose one execution operation.');
    if (a.disabled != null && typeof a.disabled !== 'boolean') throw new TypeError('action.disabled must be boolean.');
    if (a.requires != null && (!Array.isArray(a.requires) || a.requires.some(name => !/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(name)))) throw new TypeError('requires must list named function dependencies.');
    if (a.recordKey != null && !(typeof a.recordKey === 'function' || Array.isArray(a.recordKey) && a.recordKey.every(name => Object.hasOwn(context,name)))) throw new TypeError('recordKey must be a function or context field names.');
    if (a.confirm != null && !(typeof a.confirm === 'function' || typeof a.confirm.message === 'string' && a.confirm.message.trim())) throw new TypeError('confirm requires a message or function.');
    if (a.access != null) {
      object(a.access,'access');
      if (!(typeof a.access.check === 'function' || typeof a.access.permission === 'string' && a.access.permission)) throw new TypeError('access requires check or permission.');
      if (a.access.denied != null && !['hide','disable'].includes(a.access.denied)) throw new TypeError('access.denied must be hide or disable.');
    }
    if (a.eligible != null && typeof a.eligible !== 'function') throw new TypeError('eligible must be a function.');
    if (a.type === 'navigate' && (a.confirm || a.refresh)) throw new TypeError('Use a function action for confirmation or refresh around navigation.');
    if (a.target != null && !['_self','_blank'].includes(a.target)) throw new TypeError('Navigation target must be _self or _blank.');
    if (a.popup != null) {
      object(a.popup,'popup'); size(a.popup.width,'90%'); size(a.popup.height,'90%');
      for (const name of ['onBeforeClose','onClose','onError']) if (a.popup[name] != null && typeof a.popup[name] !== 'function') throw new TypeError('popup.' + name + ' must be a function.');
      for (const name of ['title','iconUrl','templateType','windowName']) if (a.popup[name] != null && typeof a.popup[name] !== 'string') throw new TypeError('popup.' + name + ' must be a string.');
      for (const name of ['closeWindowOnCommit','preserveStatefulBusinessContainer']) if (a.popup[name] != null && typeof a.popup[name] !== 'boolean') throw new TypeError('popup.' + name + ' must be boolean.');
      if (a.popup.fullscreenBelow != null && (!Number.isFinite(a.popup.fullscreenBelow) || a.popup.fullscreenBelow < 0)) throw new TypeError('fullscreenBelow must be nonnegative pixels.');
    }
    if (a.refresh != null) {
      const r = a.refresh; object(r,'refresh');
      if (r.when !== (a.type === 'popup' ? 'close' : 'success')) throw new TypeError('Use refresh.when close for popups or success for functions.');
      if (Boolean(r.run) === Boolean(r.targets)) throw new TypeError('Choose refresh.run or refresh.targets.');
      if (r.run && typeof r.run !== 'function') throw new TypeError('refresh.run must be a function.');
      if (r.targets) {
        if (!Array.isArray(r.targets)) throw new TypeError('refresh.targets must be an array.');
        r.targets.forEach(t => {
          object(t,'refresh target');
          if (!['origin-report','iqa','custom'].includes(t.type)) throw new TypeError('Unknown refresh target.');
          if (t.type === 'custom' && typeof t.run !== 'function') throw new TypeError('Custom refresh requires run.');
          if (t.type === 'iqa') { if (!t.selector) throw new TypeError('IQA refresh requires selector.'); document.createElement('div').matches(t.selector); }
          if (t.match != null && !['one','all'].includes(t.match)) throw new TypeError('Refresh match must be one or all.');
        });
      }
    }
    // Copy option objects, retaining function/DOM references without mutating client definitions.
    return Object.freeze({...value, presentation:Object.freeze({...p}), context:Object.freeze(Object.fromEntries(Object.entries(context).map(([name,field]) => [name,Object.freeze({...field})]))),
      action:Object.freeze({...a, requires:a.requires && [...a.requires], recordKey:Array.isArray(a.recordKey) ? [...a.recordKey] : a.recordKey,
        popup:a.popup && Object.freeze({...a.popup}), access:a.access && Object.freeze({...a.access}),
        refresh:a.refresh && Object.freeze({...a.refresh,targets:a.refresh.targets?.map(t => Object.freeze({...t}))})})});
  }
  function rebuildClasses() {
    classOwners.clear();
    for (const item of safety.list()) {
      for(const definition of safety.definitions(item.key)) {
        const keys = classOwners.get(definition.className) || [];
        if(!keys.includes(item.key))keys.push(item.key); classOwners.set(definition.className, keys);
      }
    }
  }
  function status(key) {
    const result = safety.inspect(key), definition = safety.get(key);
    if (definition && (classOwners.get(definition.className)?.length || 0) > 1) result.status = 'conflict';
    return {...result, className:definition?.className || null};
  }
  function define(key, value, replace=false) {
    if (replace && value === null) { safety.remove(key); rebuildClasses(); refresh(); return status(key); }
    const definition = validate(key,value);
    safety.put(key, definition, window.UnionSuiteActionSafety.metadata(value,true),replace);
    rebuildClasses(); refresh(); return status(key);
  }
  function ownerFor(element) {
    const info = generated.get(element); if (info) return info.owner;
    const panel = element.closest('.panel');
    if (panel && panel.closest('.ContentItemContainer') === element.closest('.ContentItemContainer')) return panel.parentElement;
    return element.closest('.us-banner') || element.closest('.ContentItemContainer') || element;
  }
  function environment(state) {
    return {key:state.key, actionId:state.key, trigger:state.element, element:state.element, owner:state.owner, wrapper:state.owner,
      origin:window.UnionSuiteRefresh.capture(state.element,state.owner), placement:state.placement};
  }
  function raw(field, env) {
    if (field.resolve) return field.resolve(env);
    if (Object.hasOwn(field,'value')) return field.value;
    if (field.from === 'query') return new URLSearchParams(location.search).get(field.parameter);
    const source = field.from === 'trigger' ? env.trigger : field.from === 'owner' ? env.owner : env.trigger.closest(field.selector);
    return source?.getAttribute(field.attribute) ?? null;
  }
  function contextFor(definition, env) {
    const values = {}, pending = [];
    function consume(name, field, value) {
      if (typeof value === 'string') value = value.trim();
      if (value != null && !['string','number','boolean'].includes(typeof value)) throw new Error('Context ' + name + ' must resolve to a scalar value.');
      if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Invalid context: ' + name);
      if (typeof value === 'string' && value.includes('{#query.')) throw new Error('Unresolved query field: ' + name);
      if (field.required && (value == null || value === '')) throw new Error('Missing required context: ' + name);
      const result = field.validate && value != null && value !== '' ? field.validate(value,env) : true;
      function complete(valid) { if (valid !== true) throw new Error(typeof valid === 'string' ? valid : 'Invalid context: ' + name); values[name] = value; }
      return thenable(result) ? Promise.resolve(result).then(complete) : complete(result);
    }
    for (const [name, field] of Object.entries(definition.context)) {
      const value = raw(field,env);
      const result = thenable(value) ? Promise.resolve(value).then(value => consume(name,field,value)) : consume(name,field,value);
      if (thenable(result)) pending.push(result);
    }
    return pending.length ? Promise.all(pending).then(() => Object.freeze(values)) : Object.freeze(values);
  }
  function dependency(name) { return name.split('.').reduce((value,key) => value?.[key],window); }
  function inputStamp(state) {
    const fields = Object.entries(state.definition?.context || {}).map(([name,field]) => [name,field.resolve ? 'resolver' : raw(field,environment(state))]);
    return JSON.stringify([state.key,classes(state.element),fields,state.owner?.id,location.search,state.element.disabled===true,!!state.element.closest('fieldset[disabled],.disabled,.aspNetDisabled')]);
  }
  function evaluate(state) {
    const definition = state.definition, env = environment(state);
    if (definition.action.disabled || state.element.disabled || state.original['aria-disabled']==='true' || state.element.closest('fieldset[disabled],.disabled,.aspNetDisabled')) return {status:'disabled',reason:'This action is disabled.'};
    const missing = definition.action.requires?.find(name => typeof dependency(name) !== 'function');
    if (missing) return {status:'dependency',reason:'Required function is unavailable: ' + missing};
    if (definition.action.type === 'popup' && typeof window.ShowDialog_NoReturnValue !== 'function') return {status:'dependency',reason:'The native popup service is unavailable.'};
    const context = contextFor(definition,env);
    function contextual(context) {
      const ready = {...env,context}, access = definition.action.access;
      function permitted(value) {
        if (value !== true) return {status:'denied',reason:typeof value === 'string' ? value : 'You do not have access to this action.'};
        const eligible = definition.action.eligible ? definition.action.eligible(ready) : true;
        function accepted(value) {
          if (value !== true) return {status:'ineligible',reason:typeof value === 'string' ? value : 'This action is unavailable for this record.'};
          const outcome = {status:'ready',reason:'',env:ready};
          if (definition.action.type === 'navigate') {
            const destination = typeof definition.action.href === 'function' ? definition.action.href(ready) : definition.action.href;
            if (thenable(destination)) return Promise.resolve(destination).then(value => ({...outcome,href:url(value).href}));
            outcome.href = url(destination).href;
          }
          return outcome;
        }
        return thenable(eligible) ? Promise.resolve(eligible).then(accepted) : accepted(eligible);
      }
      if (access?.permission && !access.check && !accessResolver) return {status:'dependency',reason:'The permission provider is not configured.'};
      const allowed = access ? access.check ? access.check(ready) : accessResolver(access.permission,ready) : true;
      return thenable(allowed) ? Promise.resolve(allowed).then(permitted) : permitted(allowed);
    }
    return thenable(context) ? Promise.resolve(context).then(contextual) : contextual(context);
  }
  function recordToken(state, env=state.env) {
    const recipe = state.definition?.action.recordKey;
    const value = typeof recipe === 'function' ? recipe(env) : Array.isArray(recipe) ? recipe.map(name => env.context[name]) : env?.context && Object.keys(env.context).length ? Object.entries(env.context).sort(([a],[b]) => a.localeCompare(b)) : state.owner;
    if (thenable(value)) throw new Error('recordKey must be synchronous.');
    return state.key + ':' + (value instanceof Element ? window.UnionSuiteRefresh.capture(value,value).owner.key : JSON.stringify(value));
  }
  function glyph(name) {
    if (name.startsWith('ti-')) { const icon = document.createElement('i'); icon.className = 'ti ' + name; icon.setAttribute('aria-hidden','true'); return icon; }
    const icon = document.createElementNS('http://www.w3.org/2000/svg','svg');
    Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'2','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'}).forEach(([name,value]) => icon.setAttribute(name,value));
    const path = document.createElementNS(icon.namespaceURI,'path');
    path.setAttribute('d', {plus:'M12 5v14 M5 12h14',pencil:'m16 3 5 5-13 13H3v-5L16 3z M14 5l5 5',trash:'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7'}[name]); icon.append(path); return icon;
  }
  function paint(state) {
    const element = state.element, definition = state.definition, p = definition?.presentation;
    const mode = p?.[state.placement] || p?.default || 'button';
    const label = p?.label || state.original['aria-label'] || state.original.title || state.originalLabel || 'Action';
    const signature = JSON.stringify([label,p?.icon,mode,p?.tone]);
    window.UnionSuiteActionSafety.clear(element);
    if (signature !== state.paintSignature) {
      runtimeClasses.forEach(name => { if (!state.originalClasses.has(name)) element.classList.remove(name); });
      element.classList.add('us-command');
      if (state.placement === 'header') element.classList.add('us-panel-action');
      if (mode === 'menu-item') element.classList.add('us-actions__item');
      else if (mode === 'link') element.classList.add('us-panel-action--text');
      else element.classList.add('TextButton',mode === 'icon' && p?.icon ? 'us-icon-button' : 'us-outline-button');
      if (p?.tone === 'danger') element.classList.add(mode === 'menu-item' ? 'us-actions__item--danger' : 'DangerButton');
      const nodes = []; if (p?.icon) nodes.push(glyph(p.icon));
      if (mode !== 'icon' || !p?.icon) { const text = document.createElement('span'); text.textContent = label; nodes.push(text); }
      element.replaceChildren(...nodes); state.paintSignature = signature;
    }
    const conflict = state.status === 'conflict';
    let busy = !!state.running;
    if (!busy && state.token) busy = locks.has(state.token);
    const disabled = state.status !== 'ready' || busy;
    const accessible = label + (definition?.action.type === 'navigate' && definition.action.target === '_blank' ? ' (opens in a new tab)' : '');
    const reason = busy ? 'Action in progress.' : state.reason;
    put(element,'aria-label',accessible + (disabled && reason ? '. ' + reason : ''));
    put(element,'title',accessible + (disabled && reason ? '. ' + reason : ''));
    put(element,'aria-disabled',disabled ? 'true' : null); put(element,'aria-busy',busy || state.status === 'pending' ? 'true' : null);
    put(element,'aria-haspopup',definition?.action.type === 'popup' ? 'dialog' : null);
    if (element.tagName === 'BUTTON') put(element,'type','button');
    if (element.tagName === 'A') {
      const navigation = definition?.action.type === 'navigate';
      put(element,'href',!disabled && navigation ? state.href : null);
      put(element,'role',navigation ? null : 'button'); put(element,'tabindex','0');
      put(element,'target',navigation ? definition.action.target : null);
      put(element,'rel',navigation && definition.action.target === '_blank' ? 'noopener' : null);
    }
    put(element,'data-us-command-state',busy ? 'busy' : state.status);
    put(element,'data-us-command-key',state.key || '');
    const hide = state.status === 'denied' && definition?.action.access?.denied === 'hide';
    element.toggleAttribute('data-us-command-hidden',!!hide);
    if (conflict) window.UnionSuiteActionSafety.decorate(state.key || 'class-conflict',element,true);
  }
  function check(state, force=false) {
    if (!state.definition || state.status === 'conflict') { paint(state); return; }
    let stamp;
    try { stamp = inputStamp(state); } catch (error) { state.status='context'; state.reason=error.message; paint(state); return; }
    if (!force && state.stamp === stamp && state.checkedDefinition === state.definition) { paint(state); return; }
    state.stamp = stamp; state.checkedDefinition = state.definition;
    const generation = ++state.generation, definition = state.definition;
    function complete(outcome) {
      if (!state.element.isConnected || generation !== state.generation || state.definition !== definition) return;
      Object.assign(state,outcome);
      if(outcome.status==='ready'){
        try{state.token=recordToken(state,outcome.env);}catch(error){state.status='context';state.reason=error.message;state.token=null;}
      }else state.token=null;
      paint(state);
    }
    try {
      const result = evaluate(state);
      if (thenable(result)) { state.status='pending'; state.reason='Checking action context and access.'; paint(state); Promise.resolve(result).then(complete,error => complete({status:'context',reason:error.message})); }
      else complete(result);
    } catch (error) { complete({status:'context',reason:error.message}); }
  }
  function release(state) {
    state.generation++; window.UnionSuiteActionSafety.clear(state.element);
    ownAttrs.forEach(name => put(state.element,name,state.original[name]));
    runtimeClasses.forEach(name => { if (!state.originalClasses.has(name)) state.element.classList.remove(name); });
    ['data-us-command-key','data-us-command-state','data-us-command-hidden'].forEach(name => state.element.removeAttribute(name));
    state.element.replaceChildren(...state.originalNodes); controls.delete(state.element);
  }
  function refresh(revalidate=false) {
    scheduled = false;
    for (const [owner,entry] of slots) if (!owner.isConnected || !entry.container.isConnected) slots.delete(owner);
    // Existing native/query slots are preferred. Generic panel iParts may need one.
    document.querySelectorAll('[class*="us-action-"]').forEach(owner => {
      if (owner.matches('button,a') || !classes(owner).length || excluded(owner)) return;
      const panel = [...owner.children].find(node => node.matches('.panel'));
      if (!panel || panel.closest('.ContentItemContainer') !== owner.closest('.ContentItemContainer')) return;
      const header = panel.querySelector(':scope > .panel-heading');
      if (!header?.querySelector('.panel-title')?.textContent.trim()) return;
      let container = window.UnionSuiteIqaFilters?.getActionSlot(owner) || header.querySelector(':scope > .us-panel-actions > [data-us-panel-actions-slot]');
      if (!container) {
        const actions = document.createElement('div'); actions.className='us-panel-actions us-iqa-report-actions'; actions.setAttribute('data-us-command-slot','');
        container = document.createElement('div'); container.className='us-iqa-custom-actions'; container.setAttribute('data-us-panel-actions-slot',''); actions.append(container); header.append(actions);
      }
      slots.set(owner,{container});
    });
    for (const [element, info] of generated) {
      const slot = slots.get(info.owner)?.container;
      const keys = classOwners.get(info.className), def = keys?.length === 1 ? safety.get(keys[0]) : null;
      const tag = def?.action.type === 'navigate' ? 'A' : 'BUTTON';
      if (!info.owner.isConnected || excluded(info.owner) || !info.owner.classList.contains(info.className) || !slot?.isConnected || element.parentElement !== slot || element.tagName !== tag) {
        if (controls.has(element)) release(controls.get(element)); element.remove(); generated.delete(element);
      }
    }
    for (const [owner,{container}] of slots) {
      if (excluded(owner)) continue;
      const tokens = classes(owner).sort((a,b) => (safety.get(classOwners.get(a)?.[0])?.presentation.order || 0) - (safety.get(classOwners.get(b)?.[0])?.presentation.order || 0));
      tokens.forEach((className,index) => {
        let element = [...generated].find(([node,info]) => info.owner === owner && info.className === className)?.[0];
        if (!element) {
          const keys=classOwners.get(className), def=keys?.length===1?safety.get(keys[0]):null;
          element=document.createElement(def?.action.type==='navigate'?'a':'button'); element.className=className;
          do { element.id='us-command-'+(++sequence); } while(document.getElementById(element.id));
          generated.set(element,{owner,className}); container.append(element);
        }
      });
      const shell = container.parentElement;
      if (!tokens.length && shell.hasAttribute('data-us-command-slot') && !container.children.length) { shell.remove(); slots.delete(owner); }
    }
    for (const state of controls.values()) if (!state.element.isConnected || excluded(state.element) || !classes(state.element).length) release(state);
    document.querySelectorAll('button[class*="us-action-"],a[class*="us-action-"]').forEach(element => {
      const tokens=classes(element); if (!tokens.length || excluded(element)) return;
      let state=controls.get(element);
      if (!state) {
        const original=Object.fromEntries([...ownAttrs,'disabled'].map(name=>[name,element.getAttribute(name)]));
        state={element,original,originalNodes:[...element.childNodes],originalClasses:new Set(element.classList),originalLabel:element.textContent.trim(),generation:0}; controls.set(element,state);
      }
      state.owner=ownerFor(element); state.placement=generated.has(element)?'header':element.closest('.us-actions,.us-banner__menu-panel,.dropdown-menu,.actions-menu')?'menu':element.closest('tr,.QueryTemplateItem')?'row':'default';
      const keys=tokens.flatMap(token=>classOwners.get(token)||[]);
      state.key=keys.length===1?keys[0]:null; state.definition=state.key?safety.get(state.key):null;
      if (tokens.length>1 || keys.length>1 || state.key && status(state.key).status==='conflict') { state.generation++;state.stamp=null;state.status='conflict'; state.reason='Action unavailable: conflicting definitions.'; }
      else if (!state.definition) { state.status='unconfigured'; state.reason='This action is not configured.'; }
      else if(state.status==='conflict'||state.status==='unconfigured') {state.stamp=null;state.status='pending';}
      check(state,revalidate);
    });
    // Match the native toolbar's grouping, then apply configured order within
    // each group. Both reconcilers must agree or they can keep moving children.
    for (const {container} of slots.values()) {
      const rank=node=>node.classList.contains('us-panel-action--text')?0:node.classList.contains('us-icon-button')?1:node.classList.contains('us-iqa-report-utilities')?2:3;
      const order=node=>controls.get(node)?.definition?.presentation.order||0;
      const ordered=[...container.children].sort((a,b)=>rank(a)-rank(b)||order(a)-order(b));
      ordered.forEach((node,index)=>{if(container.children[index]!==node)container.insertBefore(node,container.children[index]||null);});
    }
  }
  function schedule() { if (scheduled) return; scheduled=true; setTimeout(() => refresh(),0); }
  function popupError(definition, env, error, phase) {
    const handler=definition.action.popup?.onError;
    if(handler)Promise.resolve().then(()=>handler({...env,error,phase})).catch(failure=>console.error('[UnionSuiteActions] Error callback failed',failure));
  }
  async function popup(definition, env, isCurrent) {
    const action=definition.action, options=action.popup||{};
    const destination=typeof action.href==='function'?await action.href(env):action.href;
    if (!await isCurrent()) throw new Error('The action or record changed before the editor opened.');
    const target=url(destination,true); if(options.fullscreenBelow&&innerWidth<options.fullscreenBelow)target.searchParams.set('Mode','Maximized');
    const name=options.windowName || 'UnionSuite-'+env.key.replace(/\./g,'-')+'-'+(++sequence);
    if(windows.has(name))throw new Error('This editor window is already open.');
    windows.add(name);
    return new Promise((resolve,reject)=>{
      let closed=false;
      function before(dialog,closeEvent){
        try{const result=options.onBeforeClose({...env,dialog,closeEvent});if(thenable(result)){Promise.resolve(result).catch(error=>announce('The editor could not close.',env,'beforeClose',error));throw new Error('onBeforeClose must be synchronous.');}if(result===false)closeEvent?.set_cancel?.(true);}
        catch(error){closeEvent?.set_cancel?.(true);announce('The editor could not close.',env,'beforeClose',error);popupError(definition,env,error,'beforeClose');}
      }
      function close(dialog,closeEvent){if(closed)return;closed=true;windows.delete(name);queueMicrotask(async()=>{try{const result={...env,dialog,closeEvent};if(options.onClose)await options.onClose(result);resolve(result);}catch(error){reject(error);}});}
      try{window.ShowDialog_NoReturnValue(target.href,options.args??null,size(options.width,'90%'),size(options.height,'90%'),options.title||definition.presentation.label,
        options.iconUrl||null,options.templateType||'E',options.onBeforeClose?before:null,name,options.closeWindowOnCommit===true,options.preserveStatefulBusinessContainer===true,close,options.sourceObject??env.trigger);}
      catch(error){windows.delete(name);reject(error);}
    });
  }
  async function invoke(element, event) {
    const state=controls.get(element); if(!state||state.running)return;
    const definition=state.definition; if(!definition||state.status==='conflict')return;
    state.running=true;paint(state);let token,env,phase='context',success=false;
    const stamp=inputStamp(state);
    async function isCurrent(){
      if(!element.isConnected||excluded(element)||safety.get(state.key)!==definition||status(state.key).status==='conflict'||inputStamp(state)!==stamp)return false;
      const latest=await evaluate(state);
      const sorted=value=>JSON.stringify(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)));
      return latest.status==='ready'&&sorted(latest.env.context)===sorted(env.context)&&element.isConnected&&!excluded(element)&&safety.get(state.key)===definition&&status(state.key).status!=='conflict'&&inputStamp(state)===stamp;
    }
    try{
      const resolved=await evaluate(state);Object.assign(state,resolved);
      if(resolved.status!=='ready'){announce(resolved.reason,environment(state),'context');return;}
      env={...resolved.env,event,refresh:window.UnionSuiteRefresh.forOrigin(resolved.env.origin)};
      token=recordToken(state,env);if(locks.has(token)){token=null;return;}locks.add(token);schedule();
      phase='confirm';
      if(definition.action.confirm){const accepted=typeof definition.action.confirm==='function'?await definition.action.confirm(env):window.confirm(definition.action.confirm.message);if(accepted!==true)return;}
      if(!await isCurrent())throw new Error('The action or record changed before execution.');
      window.UnionSuiteActionMenus?.closeFor(element);
      phase='execute';
      const result=definition.action.type==='popup'?await popup(definition,env,isCurrent):await definition.action.run(env);success=true;
      phase='refresh';
      const progress={completed:[],next:0},refreshEnv={...env,result};
      try{await window.UnionSuiteRefresh.plan(definition.action.refresh,refreshEnv,progress);}
      catch(error){
        announce(definition.action.type==='popup'?'The editor closed, but the view could not refresh.':'The action completed, but the view could not refresh.',env,'refresh',error,()=>window.UnionSuiteRefresh.plan(definition.action.refresh,refreshEnv,progress));popupError(definition,env,error,'refresh');return;
      }
      if(definition.action.successMessage)announce(definition.action.successMessage,env,'success');
      (element.isConnected?element:document).dispatchEvent(new CustomEvent('us:action-complete',{bubbles:true,detail:{key:env.key,status:definition.action.type==='popup'?'closed':'completed'}}));
    }catch(error){
      announce(success?'The action completed, but follow-up work failed.':'The action could not complete. '+error.message,env||environment(state),phase,error);
      popupError(definition,env,error,phase);
    }finally{
      if(token)locks.delete(token);state.running=false;
      if(element.isConnected){check(state,true);if(definition.action.type==='popup'&&document.activeElement===document.body)element.focus({preventScroll:true});}
      schedule();
    }
  }
  document.addEventListener('click',event=>{
    const element=event.target.closest?.('button,a');if(!element||excluded(element)||!classes(element).length)return;
    if(!controls.has(element))refresh();const state=controls.get(element);if(!state)return;
    if(state.definition?.action.type==='navigate'&&state.status==='ready'&&!state.running){
      // A prepared anchor retains native modifier/middle-click semantics. Context
      // changes invalidate its href during enhancement; function/popup actions recheck asynchronously.
      if(inputStamp(state)!==state.stamp){event.preventDefault();event.stopImmediatePropagation();check(state,true);return;}
      window.UnionSuiteActionMenus?.closeFor(element);event.stopImmediatePropagation();
      if(element.tagName!=='A'){event.preventDefault();if(state.definition.action.target==='_blank')window.open(state.href,'_blank','noopener');else location.assign(state.href);}
      return;
    }
    event.preventDefault();event.stopImmediatePropagation();
    if(state.status!=='ready'||state.running){if(!state.running)announce(state.reason||'This action is unavailable.',environment(state),state.status);return;}
    void invoke(element,event);
  },true);
  document.addEventListener('keydown',event=>{const element=event.target.closest?.('a[data-us-command-key]');if(element&&element.getAttribute('role')==='button'&&(event.key==='Enter'||event.key===' ')){event.preventDefault();element.click();}},true);
  document.addEventListener('us:panel-actions-ready',event=>{if(event.detail?.wrapper&&event.detail?.container){slots.set(event.detail.wrapper,{container:event.detail.container});schedule();}});
  function start(){refresh();new MutationObserver(records=>{
    const meaningful=record=>{
      if(record.type==='childList')return !record.target.closest?.('.us-command,.us-command-notice,.us-action-conflict-notice');
      if(record.attributeName==='class'){
        const relevant=value=>(value||'').split(/\s+/).filter(name=>name==='us-report-no-styling'||/^us-action-/.test(name)&&!reserved.has(name)).sort().join(' ');
        return relevant(record.oldValue)!==relevant(record.target.getAttribute('class'));
      }
      return record.oldValue!==record.target.getAttribute(record.attributeName)&&(record.attributeName==='id'||record.attributeName==='disabled'||record.attributeName.startsWith('data-')&&!record.attributeName.startsWith('data-us-command')&&!record.attributeName.startsWith('data-us-action-conflict'));
    };
    if(records.some(meaningful))schedule();
  }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeOldValue:true});}
  window.UnionSuiteActions=Object.freeze({version:'2.0',define:(key,value)=>define(key,value),configure:(key,value)=>define(key,value,true),
    getActionStatus:status,listActions:()=>safety.list().map(item=>status(item.key)),has:safety.has,
    refresh:()=>refresh(true),setAccessResolver(fn){if(fn!==null&&typeof fn!=='function')throw new TypeError('Access resolver must be a function or null.');accessResolver=fn;refresh(true);}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('load',()=>refresh(true),{once:true});window.addEventListener('popstate',()=>refresh(true));
})();
/* US-UNIFIED-ACTIONS:END */

/* Union Suite IQA reports: filter disclosure, grouped utilities and expanded view.
   Native Query Menu full report styling and available filter/export utilities are automatic.
   Optional iPart CSS class examples:
     us-report us-filters-collapsible
     us-report us-filters-collapsible us-filters-collapsed
     us-report us-filters-collapsible us-report-expandable
   SearchContactsClass is a supported legacy alias for us-report.
   us-filters-collapsed overrides saved choices on initialization/reconciliation.
   Without that class, user choices survive refreshes
   in this browser tab. A different query or initial-state class resets that
   preference. No filter values are stored, cleared, cloned or disabled.
   Export is moved as one native dropdown, not copied. Its original slot is
   restored before an AJAX replacement so iMIS can dispose/update it normally. */
(function () {
  "use strict";

  // A shared include may execute again after an iMIS partial postback.
  // Keep the existing public namespace for action-slot integrations.
  if (window.UnionSuiteIqaFilters) {
    window.UnionSuiteIqaFilters.refresh();
    return;
  }

  var scope = ":is(.us-report, .SearchContactsClass, [data-us-iqa-native]):not(.us-report-no-styling)";
  var queryDisplayEntries = new Map();
  var querySearchStates = new WeakMap();
  var querySearchId = 0;
  // iMIS adds one div inside ContentItemContainer for the iPart CSS class.
  // Mark the immediate panel owner so action classes and header slots stay local.
  // Explicit query helpers also identify initial no-results output without a list.
  // Exclude containing CCOs/grids/nested iParts from that empty-output fallback.
  var queryDisplaySelector = ':is(.ContentItemContainer, .ContentItemContainer > div):is(:has(> .panel > .panel-body-container > .panel-body > .QueryTemplateSet),:where(.us-query-template,.us-list-scroll,.us-query-search,.us-task-completed-filter):has(> .panel > .panel-body-container > .panel-body):not(:where(:has(> .panel > .panel-body-container > .panel-body :is(.ContentItemContainer,.panel,.cco,.RadGrid,[data-us-cco],.us-banner__surface))))):not(:where(.us-banner,.us-banner *)):not(:has(.us-banner__surface))';

  function syncQueryDisplayActions() {
    document.querySelectorAll("[data-us-cco-empty-heading]").forEach(function (heading) {
      if (heading.textContent.trim() || heading.children.length || !heading.parentElement?.querySelector(":scope > .panel-body-container > .panel-body > .us-cco[data-us-cco]") || heading.closest(".us-report-no-styling")) heading.removeAttribute("data-us-cco-empty-heading");
    });
    document.querySelectorAll(".panel-body > .us-cco[data-us-cco]").forEach(function (mount) {
      if (mount.closest(".us-report-no-styling")) return;
      var container = mount.parentElement.parentElement;
      if (!container.matches(".panel-body-container")) return;
      var panel = container.parentElement;
      if (!panel.matches(".panel")) return;
      var heading = panel.querySelector(":scope > .panel-heading");
      if (heading && !heading.textContent.trim() && !heading.children.length && !heading.hasAttribute("data-us-cco-empty-heading")) heading.setAttribute("data-us-cco-empty-heading", "");
    });
    queryDisplayEntries.forEach(function (entry, wrapper) {
      if (!wrapper.isConnected || !wrapper.matches(queryDisplaySelector) ||
          wrapper.closest('.us-report-no-styling') || !entry.header.isConnected ||
          !entry.header.querySelector('.panel-title')?.textContent.trim() ||
          !entry.actions.isConnected || !entry.customActions.isConnected) {
        disposeQuerySearch(entry);
        if (wrapper.closest('.us-report-no-styling')) querySearchStates.delete(wrapper);
        entry.actions.remove();
        wrapper.removeAttribute('data-us-query-display');
        queryDisplayEntries.delete(wrapper);
      }
    });
    document.querySelectorAll(queryDisplaySelector).forEach(function (wrapper) {
      if (wrapper.closest('.us-report-no-styling')) return;
      var header = wrapper.querySelector(':scope > .panel > .panel-heading');
      if (!header || !header.querySelector('.panel-title')?.textContent.trim()) return;
      var entry = queryDisplayEntries.get(wrapper);
      if (!entry) {
        var actions = header.querySelector(':scope > .us-panel-actions') || document.createElement('div');
        actions.className = 'us-iqa-report-actions us-panel-actions';
        var slot = actions.querySelector('[data-us-panel-actions-slot]') || document.createElement('div');
        slot.className = 'us-iqa-custom-actions';
        slot.setAttribute('data-us-panel-actions-slot', '');
        actions.appendChild(slot);
        header.appendChild(actions);
        wrapper.setAttribute('data-us-query-display', '');
        entry = { wrapper: wrapper, header: header, actions: actions, customActions: slot };
        queryDisplayEntries.set(wrapper, entry);
      }

      syncQuerySearch(entry);
      orderHeaderActions(entry);
      document.dispatchEvent(new CustomEvent('us:panel-actions-ready', {
        detail: { wrapper: wrapper, container: entry.customActions }
      }));
    });
  }

  // Independent query-search and task-completion options share one disclosure.
  // Both filter rendered results without replacing native row controls/visibility.
  function disposeQuerySearch(entry) {
    var search = entry.search;
    if (!search) return;
    stopTaskReveals(search);
    if (search.observer) search.observer.disconnect();
    window.clearTimeout(search.timer);
    if (search.animation) search.animation.cancel();
    search.taskMarkers.forEach(function (node) { node.removeAttribute('data-us-task-completed-content'); });
    search.rows.forEach(function (row) {
      row.removeAttribute('data-us-query-search-hidden');
      row.removeAttribute('data-us-task-completed-row');
    });
    search.filter.remove();
    search.utilities.remove();
    search.status.remove();
    if (search.generatedSetId && search.set.id === search.generatedSetId) search.set.removeAttribute('id');
    entry.search = null;
  }

  function querySearchText(row, set) {
    var item = row.matches('.QueryTemplateItem') ? row : row.querySelector(':scope > .QueryTemplateItem');
    // An authored override is explicit, even when blank. Never read a nested
    // iPart/result's search data or arbitrary data-* configuration attributes.
    var overrides = item ? [item].concat(Array.from(item.querySelectorAll('[data-us-search]'))) : [];
    var override = overrides.find(function (node) {
      return node.hasAttribute('data-us-search') && node.closest('.QueryTemplateItem') === item &&
        node.closest('.QueryTemplateSet') === set &&
        node.closest('.ContentItemContainer') === set.closest('.ContentItemContainer') &&
        !node.closest('.us-report-no-styling');
    });
    if (override) return override.getAttribute('data-us-search').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    var walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT), parts = [], node;
    while ((node = walker.nextNode())) {
      var parent = node.parentElement;
      if (!node.textContent.trim() || parent.closest('.QueryTemplateSet') !== set ||
          parent.closest('script,style,template,[hidden],[aria-hidden="true"],.us-report-no-styling') ||
          parent.closest('.ContentItemContainer') !== set.closest('.ContentItemContainer')) continue;
      var visible = true;
      for (var element = parent; element && element !== set; element = element.parentElement) {
        var style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') { visible = false; break; }
      }
      if (visible) parts.push(node.textContent);
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
  }

  function stopTaskReveals(search) {
    (search.taskReveals || []).forEach(function (run) { run.cancel(); });
    search.taskReveals = [];
  }
  function revealCompletedRows(search, candidates) {
    var motion = matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches) return;
    candidates.forEach(function (row) {
      if (!row.isConnected || row.hasAttribute('data-us-query-search-hidden') || !row.getClientRects().length || getComputedStyle(row).display === 'none' || !row.animate) return;
      var height = row.getBoundingClientRect().height;
      if (!height) return;
      var animation = row.animate([
        {height:'0px', minHeight:'0px', paddingTop:'0px', paddingBottom:'0px', borderTopWidth:'0px', opacity:0, overflow:'hidden'},
        {height:height+'px', minHeight:'0px', opacity:1, overflow:'hidden'}
      ], {duration:300, easing:'ease-in-out'});
      var run = {row:row, cancel:function () { animation.cancel(); motion.removeEventListener('change', changed); }};
      function changed() { if (motion.matches) run.cancel(); }
      motion.addEventListener('change', changed);
      (search.taskReveals || (search.taskReveals=[])).push(run);
      function clean() { motion.removeEventListener('change', changed); search.taskReveals = (search.taskReveals || []).filter(function (item) { return item !== run; }); }
      animation.finished.then(clean, clean);
    });
  }
  function filterQueryResults(search) {
    if (search.timer !== null) window.clearTimeout(search.timer);
    search.timer = null;
    search.taskMarkers.forEach(function (node) { node.removeAttribute('data-us-task-completed-content'); });
    search.taskMarkers = [];
    search.rows.forEach(function (row) {
      row.removeAttribute('data-us-query-search-hidden');
      row.removeAttribute('data-us-task-completed-row');
    });
    search.rows = Array.from(search.set.children).filter(function (row) {
      return row.matches('.QueryTemplateItem') ||
        (row.localName === 'section' && row.querySelector(':scope > .QueryTemplateItem'));
    });
    var query = search.input ? search.input.value.replace(/\s+/g, ' ').trim().toLocaleLowerCase() : '';
    search.state.query = search.input ? search.input.value : '';
    var total = 0, matches = 0, outstanding = 0;
    search.rows.forEach(function (row) {
      var item = row.matches('.QueryTemplateItem') ? row : row.querySelector(':scope > .QueryTemplateItem');
      // Only an explicit marker in this result supplies task state. Do not infer
      // it from translated labels, arbitrary text or a nested iPart's records.
      var marker = search.completedToggle && Array.from(item.querySelectorAll('[data-us-task-completed]')).find(function (node) {
        return node.closest('.QueryTemplateSet') === search.set &&
          node.closest('.ContentItemContainer') === search.set.closest('.ContentItemContainer');
      });
      var completed = !!marker && /^(true|1)$/i.test(marker.getAttribute('data-us-task-completed').trim());
      if (completed) {
        marker.setAttribute('data-us-task-completed-content', '');
        search.taskMarkers.push(marker);
      }
      row.toggleAttribute('data-us-task-completed-row', completed);
      if (row.hidden || item.hidden || window.getComputedStyle(row).display === 'none' ||
          window.getComputedStyle(item).display === 'none') return;
      total++;
      var match = (!query || querySearchText(row, search.set).includes(query)) &&
        (!completed || search.state.showCompleted);
      row.toggleAttribute('data-us-query-search-hidden', !match);
      if (!match && row.contains(document.activeElement)) {
        (search.state.collapsed || search.filter.inert ? (search.input ? search.button : search.completedToggle) : search.input || search.completedToggle).focus({preventScroll:true});
      }
      if (match) {
        matches++;
        var task = item.querySelector(':scope > .us-task, :scope > .card-body > .us-task');
        var summaryCompleted = task ? /^(true|1)$/i.test(task.getAttribute('data-us-task-changing') || task.getAttribute('data-us-task-completed') || '') : completed;
        if (!summaryCompleted) outstanding++;
      }
    });
    (search.taskReveals || []).forEach(function (run) {
      if (!run.row.isConnected || run.row.hasAttribute('data-us-query-search-hidden') || run.row.hidden) run.cancel();
    });
    var message = !query && !search.completedToggle ? '' : matches ? matches + ' of ' + total + ' results on this page.' : 'No matching results on this page.';
    var summarySlot = search.set.parentElement.querySelector(':scope > .us-query-footer > [data-us-task-summary], :scope > .template-footer > .us-query-footer > [data-us-task-summary]');
    if (summarySlot) {
      if (search.status.parentElement !== summarySlot) summarySlot.appendChild(search.status);
      message = outstanding + ' outstanding';
    } else if (search.status.parentElement !== search.set.parentElement) search.set.after(search.status);
    if (search.status.textContent !== message) search.status.textContent = message;
  }

  function nextQuerySearchId() {
    var id;
    do { id = 'us-query-search-' + (++querySearchId); }
    while (document.getElementById(id) || document.getElementById(id + '-input') ||
      document.getElementById(id + '-results') || document.getElementById(id + '-hint'));
    return id;
  }

  function syncQuerySearch(entry) {
    var set = entry.wrapper.querySelector(':scope > .panel > .panel-body-container > .panel-body > .QueryTemplateSet');
    var withSearch = entry.wrapper.classList.contains('us-query-search');
    var withCompleted = entry.wrapper.classList.contains('us-task-completed-filter');
    var enabled = withSearch || withCompleted;
    if (entry.search && (!enabled || entry.search.set !== set || !entry.search.filter.isConnected ||
        !entry.search.utilities.isConnected || !entry.search.status.isConnected ||
        !!entry.search.input !== withSearch || !!entry.search.completedToggle !== withCompleted)) disposeQuerySearch(entry);
    if (!enabled || !set) {
      querySearchStates.delete(entry.wrapper);
      return;
    }
    if (!entry.search) {
      var id = nextQuerySearchId();
      var filter = document.createElement('div');
      filter.className = 'us-query-search-controls';
      filter.id = id;
      filter.hidden = true;
      var controlRow = document.createElement('div');
      controlRow.className = 'us-query-filter-fields';
      filter.appendChild(controlRow);
      var input = null, completedToggle = null;
      if (withSearch) {
        var label = document.createElement('label');
        label.className = 'us-query-search-field';
        label.htmlFor = id + '-input';
        label.appendChild(icon('search'));
        input = document.createElement('input');
        input.type = 'search';
        input.id = id + '-input';
        input.placeholder = 'Search…';
        input.setAttribute('aria-label', 'Search ' + entry.header.querySelector('.panel-title').textContent.trim());
        input.setAttribute('aria-describedby', id + '-hint');
        input.autocomplete = 'off';
        label.appendChild(input);
        var hint = document.createElement('p');
        hint.id = id + '-hint';
        hint.className = 'us-query-search-hint';
        hint.textContent = 'Searches the results on this page.';
        controlRow.appendChild(label);
        filter.appendChild(hint);
      }
      if (withCompleted) {
        completedToggle = document.createElement('button');
        completedToggle.type = 'button';
        completedToggle.className = 'us-task-completed-toggle us-iqa-icon-button';
        completedToggle.setAttribute('aria-label', 'Show completed tasks');
        completedToggle.title = 'Show completed tasks';
        var completedIcon = document.createElement('i');
        completedIcon.className = 'ti ti-checkbox';
        completedIcon.setAttribute('aria-hidden', 'true');
        completedToggle.appendChild(completedIcon);
      }
      var utilities = document.createElement('div');
      utilities.className = 'us-iqa-report-utilities';
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'us-iqa-filter-toggle us-iqa-icon-button';
      button.setAttribute('aria-controls', id);
      button.appendChild(icon('filter'));
      if (completedToggle) utilities.appendChild(completedToggle);
      if (withSearch) utilities.appendChild(button);
      entry.actions.appendChild(utilities);
      set.parentElement.parentElement.before(filter);
      var status = document.createElement('p');
      status.className = 'us-query-search-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.setAttribute('aria-atomic', 'true');
      set.after(status);
      var state = querySearchStates.get(entry.wrapper) || {query:'', collapsed:true, showCompleted:false};
      if (!withSearch) state.query = '';
      if (!withCompleted) state.showCompleted = false;
      querySearchStates.set(entry.wrapper, state);
      var generatedSetId = set.id ? null : id + '-results';
      if (generatedSetId) set.id = generatedSetId;
      if (input) {
        input.setAttribute('aria-controls', set.id);
        input.value = state.query;
      }
      if (completedToggle) {
        completedToggle.setAttribute('aria-controls', set.id);
        completedToggle.setAttribute('aria-pressed', String(!!state.showCompleted));
      }
      var search = entry.search = {
        wrapper:entry.wrapper, filter:filter, button:button, input:input, set:set, completedToggle:completedToggle,
        filterFocusTarget:input || completedToggle,
        utilities:utilities, status:status, state:state, rows:[], taskMarkers:[], timer:null,
        animation:null, originalInert:false, generatedSetId:generatedSetId
      };
      button.addEventListener('click', function () {
        search.state.collapsed = !search.state.collapsed;
        render(search, true);
      });
      if (input) {
        input.addEventListener('input', function () { stopTaskReveals(search); filterQueryResults(search); });
        input.addEventListener('keydown', function (event) {
          if (event.key === 'Enter') event.preventDefault(); // Do not submit the iMIS form.
        });
      }
      if (completedToggle) completedToggle.addEventListener('click', function () {
        stopTaskReveals(search);
        var reveal = search.rows.filter(function (row) { return row.hasAttribute('data-us-task-completed-row') && row.hasAttribute('data-us-query-search-hidden'); });
        search.state.showCompleted = !search.state.showCompleted;
        completedToggle.setAttribute('aria-pressed', String(search.state.showCompleted));
        filterQueryResults(search);
        if (search.state.showCompleted) revealCompletedRows(search, reveal);
      });
      if (window.MutationObserver) {
        search.observer = new MutationObserver(function () {
          if (search.timer === null) search.timer = window.setTimeout(function () { filterQueryResults(search); }, 0);
        });
        search.observer.observe(set, {subtree:true, childList:true, characterData:true,
          attributes:true, attributeFilter:['class','style','hidden','data-us-task-completed','data-us-search','data-us-contact-empty']});
      }
      render(search);
    }
    if (entry.search.input) entry.search.input.setAttribute('aria-label', 'Search ' + entry.header.querySelector('.panel-title').textContent.trim());
    filterQueryResults(entry.search);
  }

  // Only promote a Query Menu's own outer panel, never a surrounding CCO or zone.
  function discoverNativeReports() {
    document.querySelectorAll("[id$='_ContentPanel'] > [id$='_ListerPanel'] > [data-gridid]").forEach(function (grid) {
      var content = grid.parentElement.parentElement;
      var panel = content.closest(".panel");
      var wrapper = panel && panel.parentElement;
      if (wrapper && wrapper.classList.contains("us-report-no-styling")) {
        wrapper.removeAttribute("data-us-iqa-native");
        return;
      }
      var initialSearch = grid.querySelector(":scope > .FilterPanel[id$='_DataSourcePanel'] [id$='_ParametersContainer'], :scope > .FilterPanelHorizontal[id$='_DataSourcePanel'] [id$='_ParametersContainer']") &&
        grid.querySelector(":scope > .ListSearchPrompt[id$='_HideResultsMessagePanel']");
      if (!wrapper || (!grid.querySelector(".RadGrid") && !initialSearch) ||
          panel.closest(".ContentItemContainer") !== grid.closest(".ContentItemContainer")) return;
      if (panel.querySelectorAll("[data-gridid]").length !== 1) return;
      wrapper.setAttribute("data-us-iqa-native", "");
    });
  }

  function orderHeaderActions(entry) {
    var slot = entry.customActions;
    var utilities = entry.utilities || (entry.search && entry.search.utilities);
    if (utilities && utilities.parentElement !== slot) slot.appendChild(utilities);
    var rank = function (node) {
      if (node.classList.contains('us-panel-action--text')) return 0;
      if (node.classList.contains('us-icon-button')) return 1;
      if (node.classList.contains('us-iqa-report-utilities')) return 2;
      return 3;
    };
    var ordered = Array.from(slot.children).sort(function (a,b) { return rank(a)-rank(b); });
    ordered.forEach(function (node,index) { if (slot.children[index] !== node) slot.insertBefore(node,slot.children[index] || null); });
  }

  var filterSelector = ".FilterPanel[id$='_DataSourcePanel'], .FilterPanelHorizontal[id$='_DataSourcePanel']";
  var entries = new Map();
  var states = new Map();
  var timer = null;
  var application = null;
  var requestManager = null;
  var filterDuration = 180; // Milliseconds; set to 0 to disable animation.
  var windowDuration = 240; // Grow/shrink duration; reduced motion skips both.
  var expanded = null;
  var expandedKey = "UnionSuite.iqaExpanded.v1:" + window.location.pathname;
  var expandedIntent = null;
  try { expandedIntent = JSON.parse(window.sessionStorage.getItem(expandedKey)); } catch (_) {}
  var reducedMotion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  // Embedded stroke icons; Plus also supplies the default add-* header action.
  function icon(name) {
    var paths = ({ filter: [
      "M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z"
    ], plus: ["M12 5v14", "M5 12h14"],
    search: ["M21 21l-4.34-4.34", "M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0"],
    download: ["M12 15V3", "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "m7 10 5 5 5-5"],
    expand: ["M8 3H5a2 2 0 0 0-2 2v3", "M21 8V5a2 2 0 0 0-2-2h-3", "M3 16v3a2 2 0 0 0 2 2h3", "M16 21h3a2 2 0 0 0 2-2v-3"],
    restore: ["M8 3v3a2 2 0 0 1-2 2H3", "M21 8h-3a2 2 0 0 1-2-2V3", "M3 16h3a2 2 0 0 1 2 2v3", "M16 21v-3a2 2 0 0 1 2-2h3"] })[name];
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Object.entries({
      viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
      "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round",
      "aria-hidden": "true", focusable: "false"
    }).forEach(function (attribute) { svg.setAttribute(attribute[0], attribute[1]); });
    paths.forEach(function (data) {
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", data);
      svg.appendChild(path);
    });
    return svg;
  }

  function belongsTo(wrapper, element) {
    return element.closest(scope) === wrapper &&
      element.closest(".ContentItemContainer") === wrapper.closest(".ContentItemContainer");
  }

  function storageKey(filter) {
    return "UnionSuite.iqaFilters.v1:" + window.location.pathname + ":" + filter.id;
  }

  function saveState(entry) {
    if (entry.wrapper.classList.contains("us-filters-collapsed")) return;
    states.set(entry.key, entry.state);
    try {
      window.sessionStorage.setItem(entry.key, JSON.stringify(entry.state));
    } catch (_) {
      // The in-memory preference still works if browser storage is unavailable.
    }
  }

  function getState(wrapper, filter) {
    var selector = Array.from(wrapper.querySelectorAll("select[id$='_querySelectDropdown']"))
      .find(function (element) { return belongsTo(wrapper, element); });
    var query = selector ? selector.value : "";
    var initialCollapsed = wrapper.classList.contains("us-filters-collapsed");
    if (initialCollapsed) return { query: query, initialCollapsed: true, collapsed: true };
    var key = storageKey(filter);
    var previous = states.get(key);
    if (!previous) {
      try { previous = JSON.parse(window.sessionStorage.getItem(key)); } catch (_) {}
    }
    if (previous && previous.query === query &&
        previous.initialCollapsed === initialCollapsed &&
        typeof previous.collapsed === "boolean") {
      return previous;
    }
    return { query: query, initialCollapsed: initialCollapsed, collapsed: initialCollapsed };
  }

  function hasError(entry) {
    if (!entry.filter) return false;
    if (entry.filter.querySelector("[aria-invalid='true']")) return true;
    return Array.from(window.Page_Validators || []).some(function (validator) {
      if (validator.enabled === false || validator.isvalid !== false) return false;
      var control = document.getElementById(validator.controltovalidate);
      return entry.filter.contains(validator) || (control && entry.filter.contains(control));
    });
  }

  function finishTransition(entry) {
    if (!entry.filter) return;
    var animation = entry.animation;
    entry.animation = null;
    if (animation) animation.cancel();
    entry.filter.hidden = entry.state.collapsed;
    entry.filter.inert = entry.originalInert;
    entry.filter.removeAttribute("data-us-iqa-filter-animating");
    var filterFocusTarget = entry.filterFocusTarget || entry.input;
    if (filterFocusTarget && !entry.state.collapsed && document.activeElement === entry.button) filterFocusTarget.focus({preventScroll:true});
    if (expanded && expanded.entry === entry) fitExpandedFilters(expanded);
  }

  function frame(filter) {
    var style = window.getComputedStyle(filter);
    return {
      height: filter.getBoundingClientRect().height + "px",
      paddingTop: style.paddingTop, paddingBottom: style.paddingBottom,
      marginTop: style.marginTop, marginBottom: style.marginBottom,
      borderTopWidth: style.borderTopWidth, borderBottomWidth: style.borderBottomWidth,
      opacity: style.opacity
    };
  }

  function render(entry, animate) {
    if (!entry.filter) return;
    var collapsed = entry.state.collapsed;
    if (collapsed && entry.filter.contains(document.activeElement)) entry.button.focus();
    entry.button.setAttribute("aria-expanded", String(!collapsed));
    var label = collapsed ? "Show filters" : "Hide filters";
    entry.button.setAttribute("aria-label", label);
    entry.button.title = label;
    if (!animate || !entry.filter.animate || filterDuration <= 0 ||
        (reducedMotion && reducedMotion.matches) ||
        (!entry.animation && entry.filter.hidden === collapsed)) {
      finishTransition(entry);
      return;
    }
    var zero = {
      height: "0px", paddingTop: "0px", paddingBottom: "0px",
      marginTop: "0px", marginBottom: "0px",
      borderTopWidth: "0px", borderBottomWidth: "0px", opacity: "0"
    };
    // Capture the current visual size before cancelling an in-flight toggle,
    // so rapid clicks reverse smoothly instead of jumping to an endpoint.
    var start = entry.filter.hidden ? zero : frame(entry.filter);
    if (entry.animation) entry.animation.cancel();
    entry.animation = null;
    entry.filter.hidden = false;
    entry.filter.setAttribute("data-us-iqa-filter-animating", "");
    var end = collapsed ? zero : frame(entry.filter);
    entry.filter.inert = true;
    try {
      var animation = entry.filter.animate([start, end], {
        duration: filterDuration, easing: "cubic-bezier(.2, 0, 0, 1)", fill: "both"
      });
      entry.animation = animation;
      animation.onfinish = function () {
        if (entry.animation === animation) finishTransition(entry);
      };
    } catch (_) {
      finishTransition(entry);
    }
  }

  function expandForError(entry) {
    if (entry.filter && entry.state.collapsed && hasError(entry)) {
      entry.state.collapsed = false;
      render(entry);
      saveState(entry);
    }
  }

  function restoreExport(entry) {
    var moved = entry.exportControl;
    if (!moved) return;
    moved.icon.remove();
    moved.button.classList.remove("us-iqa-icon-button");
    ["title", "aria-label"].forEach(function (name) {
      if (moved.labels[name] === null) moved.button.removeAttribute(name);
      else moved.button.setAttribute(name, moved.labels[name]);
    });
    moved.group.classList.remove("us-iqa-native-export");
    if (moved.slot.isConnected) {
      moved.slot.replaceWith(moved.group);
    } else {
      // The original source was replaced without a pageLoading notification.
      // Discard the old moved control; reconciliation will find the new one.
      moved.group.remove();
      moved.slot.remove();
    }
    moved.toolbar.removeAttribute("data-us-iqa-export-relocated");
    moved.toolbar.removeAttribute("data-us-iqa-empty-toolbar");
    entry.exportControl = null;
  }

  function syncExport(entry) {
    var moved = entry.exportControl;
    if (moved && (!moved.slot.isConnected || !moved.group.isConnected)) {
      restoreExport(entry);
      moved = null;
    }
    if (!moved) {
      var gridPanel = Array.from(entry.grid.children).find(function (child) {
        return child.id.endsWith("_GridPanel1");
      });
      if (!gridPanel) return;
      var toolbar = Array.from(gridPanel.children).find(function (child) {
        return child.classList.contains("GridTitlePanel");
      });
      if (!toolbar) return;
      var right = Array.from(toolbar.children).find(function (child) {
        return child.id.endsWith("_TopRightPanel");
      });
      var groups = right ? Array.from(right.querySelectorAll(".btn-group")).filter(function (group) {
        return group.querySelector("button.dropdown-toggle") &&
          group.querySelector(".dropdown-menu a[id*='_btnExport']");
      }) : [];
      if (groups.length !== 1) return;
      var group = groups[0];
      if (group.closest("form") !== entry.actions.closest("form")) return;
      var slot = document.createComment("UnionSuite native Export slot");
      group.before(slot);
      entry.utilities.appendChild(group);
      group.classList.add("us-iqa-native-export");
      var button = group.querySelector("button.dropdown-toggle");
      var labels = { title: button.getAttribute("title"), "aria-label": button.getAttribute("aria-label") };
      var download = icon("download");
      button.appendChild(download);
      button.classList.add("us-iqa-icon-button");
      button.setAttribute("aria-label", "Export options");
      button.title = "Export options";
      moved = { group: group, slot: slot, toolbar: toolbar, button: button, labels: labels, icon: download };
      entry.exportControl = moved;
    }
    moved.toolbar.setAttribute("data-us-iqa-export-relocated", "");
    // Empty nested wrappers/whitespace should not retain a blank toolbar row.
    // Keep native titles, Easy Edit and any other useful controls visible.
    var empty = !moved.toolbar.textContent.trim() && !moved.toolbar.querySelector(
      "a, button, input:not([type='hidden']), select, textarea, img, svg, [role='button']"
    );
    moved.toolbar.toggleAttribute("data-us-iqa-empty-toolbar", empty);
  }

  function rememberExpanded(value) {
    expandedIntent = value;
    try {
      if (value) window.sessionStorage.setItem(expandedKey, JSON.stringify(value));
      else window.sessionStorage.removeItem(expandedKey);
    } catch (_) {}
  }

  function reportId(entry) { return entry.grid.id || entry.grid.getAttribute("data-gridid"); }

  function expandedStructure(entry) {
    if (expanded && expanded.entry === entry) return expanded.structure;
    var grids = Array.from(entry.grid.querySelectorAll(".RadGrid")).filter(function (grid) {
      return belongsTo(entry.wrapper, grid);
    });
    if (grids.length !== 1) return null;
    var grid = grids[0];
    // This adapter is for the captured non-virtualized, single-table RadGrid.
    // Do not restructure grids that already use Telerik's split scrolling DOM.
    var tables = Array.from(grid.children).filter(function (child) { return child.matches("table.rgMasterTable"); });
    if (tables.length !== 1 || !entry.wrapper.closest("form")) return null;
    var table = tables[0];
    var pager = table.tFoot && Array.from(table.tFoot.rows).find(function (row) { return row.matches(".rgPager"); });
    return { grid: grid, table: table, pager: pager || null };
  }

  function paintExpandButton(entry) {
    if (!entry.expandButton) return;
    var active = Boolean(expanded && expanded.entry === entry);
    var label = active ? "Restore report size (Escape)" : "Expand report";
    entry.expandButton.setAttribute("aria-label", label);
    entry.expandButton.setAttribute("aria-pressed", String(active));
    entry.expandButton.title = label;
    entry.expandButton.replaceChildren(icon(active ? "restore" : "expand"));
  }

  function syncExpandable(entry) {
    var enabled = entry.wrapper.classList.contains("us-report-expandable");
    if (!enabled) {
      if (expanded && expanded.entry === entry) releaseExpanded(false, true);
      if (entry.expandButton) entry.expandButton.remove();
      entry.expandButton = null;
      return;
    }
    if (!entry.expandButton) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "us-iqa-icon-button us-iqa-expand-toggle";
      button.setAttribute("aria-controls", entry.grid.id);
      button.addEventListener("click", function () {
        if (expanded && expanded.entry === entry && expanded.phase !== "closing") closeExpanded(true);
        else openExpanded(entry, true);
      });
      entry.utilities.appendChild(button);
      entry.expandButton = button;
    }
    paintExpandButton(entry);
    entry.expandButton.disabled = !expandedStructure(entry);
    if (entry.expandButton.disabled) {
      entry.expandButton.title = "Expand is unavailable for this grid layout";
      entry.expandButton.setAttribute("aria-label", entry.expandButton.title);
    }
  }

  function temporaryStyle(mode, element, name, value) {
    if (!mode.styles.some(function (saved) { return saved.element === element && saved.name === name; })) {
      mode.styles.push({ element: element, name: name, value: element.style.getPropertyValue(name), priority: element.style.getPropertyPriority(name) });
    }
    element.style.setProperty(name, value);
  }

  function clipRect(rect) {
    var width = document.documentElement.clientWidth;
    var height = window.innerHeight;
    var left = Math.max(0, Math.min(rect.left, width - 1));
    var top = Math.max(0, Math.min(rect.top, height - 1));
    return { left: left, top: top, width: Math.max(1, Math.min(rect.left + rect.width, width) - left), height: Math.max(1, Math.min(rect.top + rect.height, height) - top) };
  }

  function visibleRect(element) {
    return clipRect(element.getBoundingClientRect());
  }

  function returnRect(original, fallback) {
    var rect = original && original.returnRect;
    if (!rect || ![rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) return fallback;
    // Copy the saved viewport rectangle; never use the portaled placeholder's
    // current position as the destination of the shrink animation.
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }

  function viewportRect() {
    return { left: 0, top: 0, width: document.documentElement.clientWidth, height: window.innerHeight };
  }

  function rectFrame(rect) {
    return { left: rect.left + "px", top: rect.top + "px", width: rect.width + "px", height: rect.height + "px" };
  }

  function settleWindow(mode) {
    if (expanded !== mode) return;
    if (mode.animation) mode.animation.cancel();
    mode.animation = null;
    mode.entry.wrapper.removeAttribute("data-us-iqa-window-animating");
    if (mode.phase === "closing") releaseExpanded(false, true);
    else {
      mode.phase = "open";
      fitExpandedFilters(mode);
    }
  }

  function animateWindow(mode, from, to, closing, animate) {
    if (mode.animation) mode.animation.cancel();
    mode.animation = null;
    mode.phase = closing ? "closing" : "opening";
    if (!animate || !mode.entry.wrapper.animate || windowDuration <= 0 || (reducedMotion && reducedMotion.matches)) {
      settleWindow(mode);
      return;
    }
    mode.entry.wrapper.setAttribute("data-us-iqa-window-animating", "");
    try {
      var animation = mode.entry.wrapper.animate([rectFrame(from), rectFrame(to)], {
        duration: windowDuration, easing: "cubic-bezier(.2, 0, 0, 1)", fill: "both"
      });
      mode.animation = animation;
      animation.onfinish = function () { if (mode.animation === animation) settleWindow(mode); };
    } catch (_) { settleWindow(mode); }
  }

  function fitExpandedFilters(mode) {
    if (expanded !== mode || mode.phase !== "open") return;
    var filter = mode.nativeFilter;
    if (!filter || filter.hidden) return;
    var parameters = filter.querySelector("[id$='_ParametersContainer']");
    var height = parameters ? parameters.getBoundingClientRect().height + 48 : filter.scrollHeight;
    var fixedHeight = mode.structure.grid.getBoundingClientRect().top - filter.getBoundingClientRect().height;
    var footerHeight = mode.footer ? mode.footer.getBoundingClientRect().height : 0;
    var limit = Math.max(64, Math.min(window.innerHeight * .4, window.innerHeight - fixedHeight - footerHeight - 100));
    temporaryStyle(mode, filter, "--us-iqa-filter-limit", limit + "px");
    filter.toggleAttribute("data-us-iqa-filter-overflow", height > limit);
  }

  function pointPagerUp(mode) {
    if (!mode.structure.pager || !window.$find) return;
    var ui = window.Telerik && window.Telerik.Web && window.Telerik.Web.UI;
    var up = ui && ui.jSlideDirection && ui.jSlideDirection.Up;
    if (up === undefined) return;
    mode.structure.pager.querySelectorAll(".PageSizeDropDown[id]").forEach(function (element) {
      var combo = window.$find(element.id);
      if (!combo || !combo.get_slideDirection || !combo.set_slideDirection) return;
      if (combo.hideDropDown) combo.hideDropDown();
      mode.combos.push({ control: combo, direction: combo.get_slideDirection() });
      combo.set_slideDirection(up);
    });
  }

  function openExpanded(entry, animate) {
    if (!entry.wrapper.classList.contains("us-report-expandable")) return;
    if (expanded && expanded.entry === entry) {
      if (expanded.phase === "closing") animateWindow(expanded, visibleRect(entry.wrapper), viewportRect(), false, animate);
      return;
    }
    var structure = expandedStructure(entry);
    if (!structure) return;
    if (expanded) releaseExpanded(false, false);
    finishTransition(entry);
    var wrapper = entry.wrapper;
    var original = expandedIntent && expandedIntent.id === reportId(entry) ? expandedIntent : null;
    if (original) window.scrollTo({ left: original.x, top: original.y, behavior: "instant" });
    var rect = wrapper.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var from = visibleRect(wrapper);
    var mode = {
      entry: entry, structure: structure, styles: [], fill: [], combos: [],
      animation: null, phase: "opening", footer: null, pagerSlot: null,
      focus: document.activeElement, x: original ? original.x : window.scrollX,
      y: original ? original.y : window.scrollY, returnRect: returnRect(original, from),
      nativeFilter: entry.grid.querySelector(filterSelector)
    };
    expanded = mode;
    try {
      // Moving the original report must not make browser scroll anchoring
      // reposition the page behind the expanding/shrinking overlay.
      temporaryStyle(mode, document.documentElement, "overflow-anchor", "none");
      // Keep the original layout space and page scroll while escaping ancestor
      // clipping/transforms. The native ASP.NET form remains the form owner.
      mode.slot = document.createElement("div");
      mode.slot.setAttribute("aria-hidden", "true");
      mode.slot.style.height = rect.height + "px";
      var computed = window.getComputedStyle(wrapper);
      mode.slot.style.margin = computed.margin;
      wrapper.before(mode.slot);
      // Preserve tokens inherited from page/zone classes after portal placement.
      Array.from(computed).filter(function (name) { return name.indexOf("--") === 0; }).forEach(function (name) {
        temporaryStyle(mode, wrapper, name, computed.getPropertyValue(name));
      });
      var tableWidth = structure.table.getBoundingClientRect().width;
      var gutter = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
      if (gutter) {
        var padding = parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
        temporaryStyle(mode, document.body, "padding-right", padding + gutter + "px");
      }
      wrapper.closest("form").appendChild(wrapper);
      mode.portaled = true;
      wrapper.setAttribute("data-us-iqa-expanded", "");
      [document.documentElement, document.body].forEach(function (element) {
        temporaryStyle(mode, element, "overflow", "hidden");
      });
      var node = structure.grid;
      while (node && node !== wrapper) {
        node.setAttribute("data-us-iqa-fill", "");
        mode.fill.push(node);
        node = node.parentElement;
      }
      mode.scroll = document.createElement("div");
      mode.scroll.className = "us-iqa-data-scroll";
      mode.scroll.tabIndex = 0;
      mode.scroll.setAttribute("role", "region");
      var title = entry.header && entry.header.querySelector(".panel-title");
      mode.scroll.setAttribute("aria-label", (title ? title.textContent.trim() : "Report") + " data");
      mode.scroll.style.setProperty("--us-iqa-table-width", Math.ceil(tableWidth) + "px");
      structure.table.before(mode.scroll);
      mode.scroll.appendChild(structure.table);
      if (structure.pager) {
        mode.pagerSlot = document.createComment("UnionSuite native pager slot");
        structure.pager.before(mode.pagerSlot);
        mode.footer = document.createElement("table");
        mode.footer.className = "us-iqa-pinned-pager";
        mode.footer.setAttribute("role", "presentation");
        var body = document.createElement("tbody");
        mode.footer.appendChild(body);
        body.appendChild(structure.pager);
        structure.grid.appendChild(mode.footer);
      }
      pointPagerUp(mode);
      if (window.ResizeObserver) {
        mode.resize = new ResizeObserver(function () { fitExpandedFilters(mode); });
        mode.resize.observe(wrapper);
        if (mode.nativeFilter) {
          var parameters = mode.nativeFilter.querySelector("[id$='_ParametersContainer']");
          if (parameters) mode.resize.observe(parameters);
        }
      }
      rememberExpanded({ id: reportId(entry), x: mode.x, y: mode.y, returnRect: mode.returnRect });
      paintExpandButton(entry);
      if (entry.expandButton) entry.expandButton.focus({ preventScroll: true });
      window.scrollTo({ left: mode.x, top: mode.y, behavior: "instant" });
      animateWindow(mode, from, viewportRect(), false, animate);
    } catch (error) {
      releaseExpanded(false, true);
      window.console.warn("UnionSuite: report expansion restored after an integration error.", error);
    }
  }

  function releaseExpanded(preserve, focus) {
    var mode = expanded;
    if (!mode) return;
    expanded = null;
    if (!preserve) rememberExpanded(null);
    if (mode.animation) mode.animation.cancel();
    if (mode.resize) mode.resize.disconnect();
    mode.combos.forEach(function (saved) {
      try {
        if (saved.control.hideDropDown) saved.control.hideDropDown();
        saved.control.set_slideDirection(saved.direction);
      } catch (_) {} // A separately disposed Telerik control needs no restoration.
    });
    if (mode.pagerSlot && mode.pagerSlot.parentNode) mode.pagerSlot.replaceWith(mode.structure.pager);
    if (mode.footer) mode.footer.remove();
    if (mode.scroll && mode.scroll.parentNode) mode.scroll.replaceWith(mode.structure.table);
    mode.fill.forEach(function (element) { element.removeAttribute("data-us-iqa-fill"); });
    if (mode.nativeFilter) mode.nativeFilter.removeAttribute("data-us-iqa-filter-overflow");
    var wrapper = mode.entry.wrapper;
    wrapper.removeAttribute("data-us-iqa-expanded");
    wrapper.removeAttribute("data-us-iqa-window-animating");
    mode.styles.reverse().forEach(function (saved) {
      if (saved.value) saved.element.style.setProperty(saved.name, saved.value, saved.priority);
      else saved.element.style.removeProperty(saved.name);
    });
    if (mode.slot && mode.slot.isConnected) mode.slot.replaceWith(wrapper);
    else if (mode.portaled) wrapper.remove(); // Do not resurrect a removed iPart.
    paintExpandButton(mode.entry);
    window.scrollTo({ left: mode.x, top: mode.y, behavior: "instant" });
    if (focus) {
      var target = mode.focus && mode.focus.isConnected ? mode.focus : mode.entry.expandButton;
      if (target && target.isConnected) target.focus({ preventScroll: true });
    }
  }

  function closeExpanded(animate) {
    if (!expanded) return;
    var mode = expanded;
    // Align the underlying page first, while the full-window report covers it.
    // The captured rectangle is the reverse of the original grow animation;
    // a placeholder shifted below the viewport must not pull it downwards.
    window.scrollTo({ left: mode.x, top: mode.y, behavior: "instant" });
    var target = clipRect(mode.returnRect);
    animateWindow(mode, visibleRect(mode.entry.wrapper), target, true, animate);
  }

  function beforeAjaxUpdate() {
    // ASP.NET must see the original tree before disposing UpdatePanel content.
    if (expanded) releaseExpanded(true, false);
    entries.forEach(function (entry) {
      finishTransition(entry);
      restoreExport(entry);
    });
  }

  function dispose(entry, preserveActions) {
    if (expanded && expanded.entry === entry) releaseExpanded(true, false);
    if (entry.observer) entry.observer.disconnect();
    finishTransition(entry);
    restoreExport(entry);
    entry.utilities.remove();
    if (!preserveActions) entry.actions.remove();
    if (entry.tools) entry.tools.remove();
    if (entry.header && !preserveActions) entry.header.removeAttribute("data-us-iqa-filter-heading");
    if (entry.filter) {
      entry.filter.hidden = false;
      entry.filter.removeAttribute("data-us-iqa-filter-region");
    }
  }

  function attach(wrapper, filter, header, grid, retainedActions) {
    var actions = retainedActions || header?.querySelector(":scope > .us-panel-actions") || document.createElement("div");
    actions.className = "us-iqa-report-actions us-panel-actions";
    var customActions = actions.querySelector("[data-us-panel-actions-slot]");
    if (!customActions) {
      customActions = document.createElement("div");
      customActions.className = "us-iqa-custom-actions";
      customActions.setAttribute("data-us-panel-actions-slot", "");
      actions.appendChild(customActions);
    }
    var utilities = document.createElement("div");
    utilities.className = "us-iqa-report-utilities";
    actions.appendChild(utilities);
    var button = filter ? document.createElement("button") : null;
    if (button) {
      button.type = "button";
      button.className = "us-iqa-filter-toggle us-iqa-icon-button";
      button.setAttribute("aria-controls", filter.id);
      button.setAttribute("data-us-iqa-filter-toggle", "");
      button.appendChild(icon("filter"));
      utilities.appendChild(button);
    }
    var entry = {
      wrapper: wrapper, filter: filter, header: header, button: button, grid: grid,
      actions: actions, customActions: customActions, utilities: utilities,
      exportControl: null, expandButton: null, animation: null, originalInert: filter ? filter.inert : false,
      tools: null, observer: null, key: filter ? storageKey(filter) : null,
      state: filter ? getState(wrapper, filter) : null
    };
    if (button) button.addEventListener("click", function () {
      entry.state.collapsed = !entry.state.collapsed;
      if (hasError(entry)) entry.state.collapsed = false;
      render(entry, true);
      saveState(entry);
    });
    if (header) {
      header.appendChild(actions);
      header.setAttribute("data-us-iqa-filter-heading", "");
    } else {
      // Untitled reports group both utilities in one persistent compact row.
      entry.tools = document.createElement("div");
      entry.tools.className = "us-iqa-filter-tools";
      entry.tools.appendChild(actions);
      (filter || grid).before(entry.tools);
    }
    if (filter) filter.setAttribute("data-us-iqa-filter-region", "");
    if (hasError(entry)) entry.state.collapsed = false;
    render(entry);
    if (filter) saveState(entry);
    syncExport(entry);
    syncExpandable(entry);
    if (filter && window.MutationObserver) {
      // Web Forms validators update spans without an AJAX refresh. Observe
      // this filter region only, and never wrap/replace Page_ClientValidate.
      entry.observer = new MutationObserver(function () { expandForError(entry); });
      entry.observer.observe(filter, {
        subtree: true, childList: true, attributes: true,
        attributeFilter: ["aria-invalid", "style", "class"]
      });
    }
    return entry;
  }

  function reconcile() {
    timer = null;
    attachAjax();
    discoverNativeReports();
    syncQueryDisplayActions();
    // Release the baseline Find/Export row before the header claims its native menu.
    if (window.UnionSuiteNativeIqa) window.UnionSuiteNativeIqa.refresh();
    if (expanded && !expanded.slot.isConnected) releaseExpanded(false, false);
    if (expanded && (!expanded.structure.grid.isConnected || !expanded.structure.table.isConnected || !expanded.scroll.isConnected)) {
      releaseExpanded(true, false);
    }
    entries.forEach(function (entry, wrapper) {
      if (!wrapper.isConnected || !wrapper.matches(scope)) {
        dispose(entry);
        entries.delete(wrapper);
      }
    });
    document.querySelectorAll(scope).forEach(function (wrapper) {
      var panel = Array.from(wrapper.children).find(function (child) {
        return child.classList.contains("panel");
      });
      var grids = panel ? Array.from(panel.querySelectorAll("[data-gridid]")).filter(function (grid) {
        return belongsTo(wrapper, grid);
      }) : [];
      var grid = grids.length === 1 ? grids[0] : null;
      var filters = grid ?
        Array.from(grid.querySelectorAll(filterSelector)).filter(function (filter) {
        var parameters = filter.querySelector("[id$='_ParametersContainer']");
        // Only native Query Menu filters with actual input fields are supported.
        return belongsTo(wrapper, filter) && filter.parentElement.hasAttribute("data-gridid") &&
          parameters && parameters.querySelector(
            "select, textarea, input:not([type='hidden']):not([type='submit']):not([type='button'])"
          ) && filter.style.display !== "none" &&
          (!filter.hidden || filter.hasAttribute("data-us-iqa-filter-region"));
      }) : [];
      var filter = filters.length === 1 ? filters[0] : null;
      var header = panel && Array.from(panel.children).find(function (child) {
        var title = child.querySelector(".panel-title");
        return child.classList.contains("panel-heading") && title && title.textContent.trim();
      });
      var entry = entries.get(wrapper);
      var retainedActions = null;
      if (entry && (entry.filter !== filter || entry.header !== header || entry.grid !== grid ||
          !entry.actions.isConnected || (entry.button && !entry.button.isConnected))) {
        // Preserve registered custom controls when only the query/filter body
        // refreshes. Their native nodes and click handlers stay in the header.
        if (grid && header && entry.header === header && entry.actions.isConnected) {
          retainedActions = entry.actions;
        }
        dispose(entry, Boolean(retainedActions));
        entries.delete(wrapper);
        entry = null;
      }
      if (!grid) return;
      if (!entry) {
        entry = attach(wrapper, filter, header, grid, retainedActions);
        entries.set(wrapper, entry);
      } else {
        if (filter) entry.state = getState(wrapper, filter);
        if (hasError(entry)) entry.state.collapsed = false;
        render(entry);
        if (filter) saveState(entry);
        syncExport(entry);
        syncExpandable(entry);
      }

      // Query-only reports can have an empty toolbar without an Export control.
      orderHeaderActions(entry);
      entry.grid.querySelectorAll('.GridTitlePanel').forEach(function(toolbar) {
        var empty = !toolbar.textContent.trim() && !toolbar.querySelector("a,button,input:not([type='hidden']),select,textarea,img,svg,[role='button']");
        toolbar.toggleAttribute('data-us-iqa-empty-toolbar', empty);
      });
      // A central action registry can populate this slot idempotently.
      // Business handlers and URLs must come from that verified registry.
      document.dispatchEvent(new CustomEvent("us:panel-actions-ready", {
        detail: { wrapper: wrapper, container: entry.customActions }
      }));
    });
    // Query selection, sorting and paging can replace the body or the entire
    // iPart. Re-enter using its stable grid ID, without an entrance animation.
    if (!expanded && expandedIntent) {
      var pending = Array.from(entries.values()).find(function (entry) {
        return reportId(entry) === expandedIntent.id;
      });
      if (pending && pending.wrapper.classList.contains("us-report-expandable")) openExpanded(pending, false);
      else rememberExpanded(null);
    }
  }

  function schedule() {
    if (timer === null) timer = window.setTimeout(reconcile, 0);
  }

  function attachAjax() {
    var sys = window.Sys;
    if (!sys) return;
    if (sys.Application && sys.Application !== application && sys.Application.add_load) {
      application = sys.Application;
      application.add_load(schedule);
    }
    if (sys.WebForms && sys.WebForms.PageRequestManager) {
      var manager = sys.WebForms.PageRequestManager.getInstance();
      if (manager && manager !== requestManager && manager.add_endRequest) {
        requestManager = manager;
        if (manager.add_pageLoading) manager.add_pageLoading(beforeAjaxUpdate);
        requestManager.add_endRequest(schedule);
      }
    }
  }

  // Browser validation can fire while required inputs are collapsed.
  document.addEventListener("invalid", function (event) {
    entries.forEach(function (entry) {
      if (entry.filter && entry.filter.contains(event.target)) {
        entry.state.collapsed = false;
        render(entry);
        saveState(entry);
      }
    });
  }, true);

  // Check Web Forms validation after native click handlers have completed,
  // including handlers that cancel their own event after a validation error.
  document.addEventListener("click", function () {
    window.setTimeout(function () { entries.forEach(expandForError); }, 0);
  }, true);

  function visibleElement(element) {
    return Boolean(element.getClientRects().length) && window.getComputedStyle(element).visibility !== "hidden";
  }

  function nativePopupOpen() {
    return Array.from(document.querySelectorAll(
      ".RadWindow, .rwWindow, .modal.show, .modal.in, [role='dialog'][aria-modal='true'], " +
      ".RadComboBoxDropDown, .chosen-with-drop .chosen-drop, .us-iqa-native-export.open .dropdown-menu, " +
      ".us-iqa-native-export.show .dropdown-menu"
    )).some(visibleElement);
  }

  // Give an open native menu/dialog first use of Escape, even if its handler
  // closes the menu before our bubbling listener runs.
  var escapeFromPopup = false;
  document.addEventListener("keydown", function (event) {
    if (expanded && event.key === "Escape") escapeFromPopup = nativePopupOpen() || event.target.matches("select");
  }, true);
  document.addEventListener("keydown", function (event) {
    if (!expanded || event.defaultPrevented) return;
    if (event.key === "Escape" && !escapeFromPopup) {
      event.preventDefault();
      closeExpanded(true);
    } else if (event.key === "Tab" && !nativePopupOpen()) {
      var wrapper = expanded.entry.wrapper;
      var controls = Array.from(wrapper.querySelectorAll(
        "a[href], button, input:not([type='hidden']), select, textarea, [tabindex]"
      )).filter(function (control) { return !control.disabled && control.tabIndex >= 0 && !control.closest("[inert]") && visibleElement(control); });
      var first = controls[0];
      var last = controls[controls.length - 1];
      if (first && (!wrapper.contains(document.activeElement) ||
          (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last))) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      }
    }
  });
  window.addEventListener("resize", function () {
    if (expanded) settleWindow(expanded);
  });
  window.addEventListener("pagehide", beforeAjaxUpdate);
  window.addEventListener("pageshow", schedule);

  window.UnionSuiteIqaFilters = {
    refresh: function () { attachAjax(); schedule(); },
    getActionSlot: function (wrapper) {
      var entry = entries.get(wrapper) || queryDisplayEntries.get(wrapper);
      return entry ? entry.customActions : null;
    },
    restoreReport: function () { closeExpanded(true); }
  };
  if (reducedMotion && reducedMotion.addEventListener) {
    reducedMotion.addEventListener("change", function () {
      if (reducedMotion.matches) {
        entries.forEach(finishTransition);
        queryDisplayEntries.forEach(function (entry) { if (entry.search) finishTransition(entry.search); });
        if (expanded) settleWindow(expanded);
      }
    });
  }
  attachAjax();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }
  window.addEventListener("load", function () { attachAjax(); schedule(); }, { once: true });
})();

/* US-CONTACTS:START */
(function () {
  'use strict';
  if (window.UnionSuiteContacts) {window.UnionSuiteContacts.refresh();return;}
  var entries=new Map(),pending=false;
  function blank(value){return !value.trim() || /\{#query\./i.test(value);}
  function put(node,name,value){if(value===null){if(node.hasAttribute(name))node.removeAttribute(name);}else if(node.getAttribute(name)!==value)node.setAttribute(name,value);}
  function clearBadgeColour(entry){
    if(!entry.badge)return;
    var badge=entry.badge;
    Object.keys(badge.styles).forEach(function(name){
      var state=badge.styles[name];
      if(badge.node.style.getPropertyValue(name)===state.written){
        if(state.value)badge.node.style.setProperty(name,state.value,state.priority);else badge.node.style.removeProperty(name);
      }
    });
    entry.badge=null;
  }
  function badgeColour(entry,role,value){
    var hex=(value||'').trim();
    var valid=/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex);
    if(entry.badge && (entry.badge.node!==role || !valid))clearBadgeColour(entry);
    if(!role || !valid)return;
    if(hex.length===4)hex='#'+hex.slice(1).split('').map(function(c){return c+c;}).join('');
    hex=hex.toLowerCase();
    var rgb=[1,3,5].map(function(i){var c=parseInt(hex.slice(i,i+2),16)/255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);});
    var luminance=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
    var foreground=(luminance+.05)/.05 >= 1.05/(luminance+.05)?'#000000':'#ffffff';
    if(!entry.badge)entry.badge={node:role,styles:{}};
    var values={'--us-contact-badge-bg':hex,'--us-contact-badge-text':foreground};
    Object.keys(values).forEach(function(name){
      var state=entry.badge.styles[name];
      if(!state)state=entry.badge.styles[name]={value:role.style.getPropertyValue(name),priority:role.style.getPropertyPriority(name)};
      state.written=values[name];
      if(role.style.getPropertyValue(name)!==values[name])role.style.setProperty(name,values[name]);
    });
  }
  function safeLink(value){
    if(value===null || blank(value))return null;
    value=value.trim();
    if(/[\u0000-\u001f\u007f\\]/.test(value))return null;
    if(/^(mailto|tel):\s*\S/i.test(value))return value;
    if(/^(#[^\s]+|\/(?!\/)|\.\.?\/)/.test(value))return value;
    try{var url=new URL(value);if(/^https?:$/.test(url.protocol)&&!url.username&&!url.password)return value;}catch(_){}
    return null;
  }
  function release(root,entry){
    entry.empty.forEach(function(node){node.removeAttribute('data-us-contact-empty');});
    clearBadgeColour(entry);
    entry.links.forEach(function(state,link){if(link.getAttribute('href')===state.written)put(link,'href',state.source);});
    entries.delete(root);
  }
  function refresh(){
    pending=false;
    entries.forEach(function(entry,root){if(!root.isConnected||!root.matches('.us-contact')||root.closest('.us-report-no-styling'))release(root,entry);});
    document.querySelectorAll('.us-contact').forEach(function(root){
      if(root.closest('.us-report-no-styling'))return;
      var entry=entries.get(root);
      if(!entry){entry={empty:new Set(),links:new Map()};entries.set(root,entry);}
      var empty=new Set(), role=root.querySelector(':scope > .us-contact__heading > .us-contact__role');
      if(role&&blank(role.textContent))empty.add(role);
      root.querySelectorAll(':scope > .us-contact__workplace, :scope > .us-contact__details > .us-contact__detail').forEach(function(row){
        var value=row.querySelector(':scope > a');if(!value||blank(value.textContent))empty.add(row);
      });
      var details=root.querySelector(':scope > .us-contact__details');
      if(details && Array.from(details.children).every(function(row){return empty.has(row);}))empty.add(details);
      entry.empty.forEach(function(node){if(!empty.has(node))node.removeAttribute('data-us-contact-empty');});
      empty.forEach(function(node){put(node,'data-us-contact-empty','');});entry.empty=empty;
      badgeColour(entry,role,root.getAttribute('data-us-contact-colour'));
      entry.links.forEach(function(state,link){if(!root.contains(link))entry.links.delete(link);});
      root.querySelectorAll(':scope > .us-contact__heading > a, :scope > .us-contact__workplace > a, :scope > .us-contact__details > .us-contact__detail > a').forEach(function(link){
        var current=link.getAttribute('href'),state=entry.links.get(link);
        if(!state){state={source:current,written:current};entry.links.set(link,state);}else if(current!==state.written)state.source=current;
        state.written=safeLink(state.source);put(link,'href',state.written);
      });
    });
  }
  function schedule(){if(!pending){pending=true;requestAnimationFrame(refresh);}}
  function start(){refresh();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','href','data-us-contact-colour']});}
  window.UnionSuiteContacts={refresh:schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
/* US-CONTACTS:END */

/* US-LIST-SCROLL:START */
(function () {
  'use strict';
  if(window.UnionSuiteListScroll){window.UnionSuiteListScroll.refresh();return;}
  var entries=new Map(),pending=false;
  var selector=':is(.ContentItemContainer,.ContentItemContainer > div).us-list-scroll > .panel > .panel-body-container > .panel-body:has(> .QueryTemplateSet)';
  function put(node,name,value){if(value===null){if(node.hasAttribute(name))node.removeAttribute(name);}else if(node.getAttribute(name)!==value)node.setAttribute(name,value);}
  function restore(body,entry){
    body.removeEventListener('scroll',entry.update);entry.resize?.disconnect();
    body.removeAttribute('data-us-list-scroll-body');entry.frame.removeAttribute('data-us-list-scroll-frame');entry.frame.removeAttribute('data-us-list-more');
    Object.keys(entry.written).forEach(function(name){if(body.getAttribute(name)===entry.written[name])put(body,name,entry.original[name]);});
    entries.delete(body);
  }
  function refresh(){
    pending=false;
    entries.forEach(function(entry,body){if(!body.isConnected||!body.matches(selector)||body.closest('.us-report-no-styling'))restore(body,entry);});
    document.querySelectorAll(selector).forEach(function(body){
      if(body.closest('.us-report-no-styling'))return;
      var entry=entries.get(body),set=body.querySelector(':scope > .QueryTemplateSet');
      if(entry&&entry.set!==set){restore(body,entry);entry=null;}
      if(!entry){
        entry={frame:body.parentElement,set:set,original:{},written:{}};
        ['tabindex','role','aria-label'].forEach(function(name){entry.original[name]=body.getAttribute(name);});
        entry.update=function(){
          var overflow=body.scrollHeight>body.clientHeight+2;
          entry.frame.toggleAttribute('data-us-list-more',overflow&&body.scrollTop+body.clientHeight<body.scrollHeight-2);
          if(entry.original.tabindex===null){entry.written.tabindex=overflow?'0':null;put(body,'tabindex',entry.written.tabindex);}
        };
        if(window.ResizeObserver){entry.resize=new ResizeObserver(entry.update);entry.resize.observe(body);entry.resize.observe(set);}
        body.addEventListener('scroll',entry.update,{passive:true});entries.set(body,entry);
      }
      put(body,'data-us-list-scroll-body','');put(entry.frame,'data-us-list-scroll-frame','');
      if(entry.original.role===null){entry.written.role='region';put(body,'role','region');}
      if(entry.original['aria-label']===null&&!body.hasAttribute('aria-labelledby')){
        var title=body.parentElement.parentElement.querySelector(':scope > .panel-heading > .panel-title');
        entry.written['aria-label']=title?.textContent.trim()||'Query results';put(body,'aria-label',entry.written['aria-label']);
      }
      entry.update();
    });
  }
  function schedule(){if(!pending){pending=true;requestAnimationFrame(refresh);}}
  function start(){refresh();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style','hidden','data-us-query-search-hidden','data-us-contact-empty']});document.fonts?.ready.then(schedule);}
  window.UnionSuiteListScroll={refresh:schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
/* US-LIST-SCROLL:END */

/* US-BANNER-BEHAVIOUR:START */
/* ==========================================================================
   BANNER BEHAVIOUR — canonical shared theme implementation.
   No inline event attributes, cloned content, guessed record IDs or page links.
   Public refresh() supports custom content insertion in addition to native AJAX.
   ========================================================================== */
(function () {
  "use strict";
  if (window.UnionSuiteBanners) {
    window.UnionSuiteBanners.refresh();
    return;
  }

  // iMIS puts the configured CSS class inside the owning ContentItemContainer.
  // Behaviour belongs to that iPart, independently of page/zone/grid nesting.
  var scope = ".ContentItemContainer > .us-banner:is(.us-banner-sticky, .us-banner-collapsible)";
  var entry = null;
  var frame = 0;
  var needsRefresh = false;
  var paused = false;
  var application = null;
  var requestManager = null;
  var collapseAt = 60;
  var expandAt = 16;
  var observer = null;
  var openMenu = null;

  function closeMenu(restoreFocus) {
    if (!openMenu) return;
    var menu = openMenu;
    openMenu = null;
    menu.open = false;
    menu.classList.remove("us-banner__action-menu--upward");
    var trigger = menu.querySelector("summary");
    if (restoreFocus && menu.isConnected && trigger) trigger.focus();
  }

  function positionMenu() {
    if (!openMenu) return;
    if (!openMenu.isConnected || !openMenu.open || !openMenu.getClientRects().length) { closeMenu(false); return; }
    var trigger = openMenu.querySelector("summary");
    var panel = openMenu.querySelector(".us-banner__menu-panel");
    if (!trigger || !panel) return;
    var rect = trigger.getBoundingClientRect();
    var header = document.getElementById("hd");
    var headerRect = header && header.getBoundingClientRect();
    var top = headerRect && headerRect.top <= 1 ? Math.max(0, headerRect.bottom) : 0;
    var below = Math.max(0, window.innerHeight - rect.bottom - 16);
    var above = Math.max(0, rect.top - top - 16);
    var upward = below < Math.min(160, panel.scrollHeight) && above > below;
    openMenu.classList.toggle("us-banner__action-menu--upward", upward);
    writeStyle(panel, "--us-banner-menu-max-height", Math.min(384, upward ? above : below) + "px");
  }

  function writeStyle(el, property, value) {
    if (el.style.getPropertyValue(property) !== value) el.style.setProperty(property, value);
  }

  function schedule(refresh) {
    if (refresh === true) needsRefresh = true;
    if (frame || paused) return;
    frame = window.requestAnimationFrame(function () {
      frame = 0;
      if (needsRefresh) { needsRefresh = false; reconcile(); }
      update();
    });
  }

  function isEasyEdit() {
    return window.gIsEasyEditEnabled === true || document.body.classList.contains("TemplateAreaEasyEditOn");
  }

  function ownSurface(wrapper) {
    var surfaces = wrapper.querySelectorAll(".us-banner__surface");
    // A record query must return one banner, not several overlapping headers.
    return surfaces.length === 1 && surfaces[0].closest(".us-banner") === wrapper ? surfaces[0] : null;
  }

  function foldElements(state) {
    state.folds = state.folds.filter(function (fold) { return state.surface.contains(fold); });
    var candidates = Array.from(state.surface.querySelectorAll(".us-banner__subtitle, .us-banner__details, [data-us-banner-collapse]"));
    candidates.forEach(function (el) {
      if (el.closest(".us-banner") !== state.wrapper || el.closest(".us-banner__fold")) return;
      if (candidates.some(function (other) { return other !== el && other.contains(el); })) return;
      var fold = document.createElement("div");
      var inner = document.createElement("div");
      fold.className = "us-banner__fold";
      inner.className = "us-banner__fold-inner";
      el.before(fold);
      fold.appendChild(inner);
      inner.appendChild(el);
      state.folds.push(fold);
      fold.inert = state.compact;
      if (state.compact) fold.setAttribute("aria-hidden", "true");
    });
  }

  function setCompact(state, compact) {
    if (state.compact === compact) return;
    state.compact = compact;
    state.wrapper.classList.toggle("us-banner--compact", compact);
    state.folds.forEach(function (fold) {
      fold.inert = compact;
      if (compact) fold.setAttribute("aria-hidden", "true");
      else fold.removeAttribute("aria-hidden");
    });
  }

  function release() {
    if (!entry) return;
    var state = entry;
    entry = null;
    state.resize.disconnect();
    state.wrapper.classList.remove("us-banner--enhanced", "us-banner--pinned", "us-banner--compact");
    if (state.originalHeight) state.wrapper.style.setProperty("height", state.originalHeight, state.originalHeightPriority);
    else state.wrapper.style.removeProperty("height");
    ["--us-banner-fixed-top", "--us-banner-fixed-left", "--us-banner-fixed-width"].forEach(function (property) {
      state.surface.style.removeProperty(property);
    });
    state.folds.forEach(function (fold) {
      var inner = fold.firstElementChild;
      if (fold.parentNode && inner) {
        while (inner.firstChild) fold.before(inner.firstChild);
        fold.remove();
      }
    });
  }

  function reconcile() {
    attachAjax();
    if (isEasyEdit() || !window.ResizeObserver) { release(); return; }
    var wrapper = Array.from(document.querySelectorAll(scope)).find(function (candidate) {
      return candidate.getClientRects().length && candidate.getBoundingClientRect().width > 0 && ownSurface(candidate);
    });
    var surface = wrapper && ownSurface(wrapper);
    if (entry && (entry.wrapper !== wrapper || entry.surface !== surface)) release();
    if (!wrapper) return;
    if (!entry) {
      entry = {
        wrapper: wrapper, surface: surface, folds: [], compact: false, pinned: false,
        expandedHeight: surface.getBoundingClientRect().height,
        originalHeight: wrapper.style.getPropertyValue("height"),
        originalHeightPriority: wrapper.style.getPropertyPriority("height"),
        header: null, resize: new ResizeObserver(function () { schedule(); })
      };
      wrapper.classList.add("us-banner--enhanced");
      entry.resize.observe(wrapper);
      entry.resize.observe(surface);
    }
    var header = document.getElementById("hd");
    if (header !== entry.header) {
      if (entry.header) entry.resize.unobserve(entry.header);
      entry.header = header;
      if (header) entry.resize.observe(header);
    }
    foldElements(entry);
  }

  function update() {
    positionMenu();
    if (!entry) return;
    var state = entry;
    if (!state.wrapper.isConnected || !state.wrapper.getClientRects().length) { schedule(true); return; }
    var rect = state.wrapper.getBoundingClientRect();
    var headerRect = state.header && state.header.getBoundingClientRect();
    var top = headerRect && headerRect.top <= 1 ? Math.max(0, headerRect.bottom) : 0;
    var pin = rect.top <= top + .5 && window.innerHeight - top > 140;
    var y = window.scrollY || document.documentElement.scrollTop;
    var compact = state.compact;
    var focusInDetails = state.folds.some(function (fold) { return fold.contains(document.activeElement); });
    var descriptionExpanded = !!state.surface.querySelector('.us-banner__description-toggle[aria-expanded="true"]');
    if (!pin || !state.wrapper.classList.contains("us-banner-collapsible") || y <= expandAt || focusInDetails || descriptionExpanded) compact = false;
    else if (y > collapseAt && state.collapseRequested) compact = true;
    else if (y > collapseAt && !compact) {
      // Reserve enough scroll range that shrinking cannot bounce a short page
      // back across the expansion threshold. Long record pages condense normally.
      compact = document.documentElement.scrollHeight - window.innerHeight > state.expandedHeight + collapseAt;
    }

    if (pin) {
      writeStyle(state.surface, "--us-banner-fixed-top", top + "px");
      writeStyle(state.surface, "--us-banner-fixed-left", rect.left + "px");
      writeStyle(state.surface, "--us-banner-fixed-width", rect.width + "px");
      if (!state.pinned) {
        writeStyle(state.wrapper, "height", state.surface.getBoundingClientRect().height + "px");
        state.wrapper.classList.add("us-banner--pinned");
        state.pinned = true;
      }
    } else if (state.pinned) {
      state.wrapper.classList.remove("us-banner--pinned");
      if (state.originalHeight) state.wrapper.style.setProperty("height", state.originalHeight, state.originalHeightPriority);
      else state.wrapper.style.removeProperty("height");
      state.pinned = false;
    }
    state.collapseRequested = false;
    setCompact(state, compact);
    var height = state.surface.getBoundingClientRect().height;
    if (!state.compact) state.expandedHeight = Math.max(state.expandedHeight, height);
    if (state.pinned) writeStyle(state.wrapper, "height", height + "px");
  }

  function beforeUpdate() {
    closeMenu(false);
    paused = true;
    if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
    release();
  }

  function afterUpdate() { paused = false; schedule(true); }

  function attachAjax() {
    var sys = window.Sys;
    if (!sys) return;
    if (sys.Application && application !== sys.Application) {
      application = sys.Application;
      application.add_load(afterUpdate);
    }
    var manager = sys.WebForms && sys.WebForms.PageRequestManager && sys.WebForms.PageRequestManager.getInstance();
    if (manager && requestManager !== manager) {
      requestManager = manager;
      manager.add_pageLoading(beforeUpdate);
      manager.add_endRequest(afterUpdate);
    }
  }

  window.UnionSuiteBanners = {
    refresh: function () { schedule(true); },
    // Explicit Show less may move focus out of the folding region.
    descriptionClosed: function (surface) {
      if (!entry || entry.surface !== surface || !entry.wrapper.classList.contains('us-banner-collapsible')) return;
      var title = surface.querySelector('.us-banner__title');
      if (!title) return;
      if (entry.folds.some(function (fold) { return fold.contains(document.activeElement); })) {
        var oldTabindex = title.getAttribute('tabindex');
        title.setAttribute('tabindex','-1');
        title.focus({preventScroll:true});
        title.addEventListener('blur',function () {
          if (oldTabindex === null) title.removeAttribute('tabindex'); else title.setAttribute('tabindex',oldTabindex);
        },{once:true});
      }
      entry.collapseRequested = (window.scrollY || document.documentElement.scrollTop) > collapseAt;
      schedule();
    },
    // Read-only diagnostics for a live iMIS page; contains no record data.
    getStatus: function () {
      var candidates = document.querySelectorAll(scope);
      return {
        scriptLoaded: true,
        easyEdit: isEasyEdit(),
        resizeObserverAvailable: !!window.ResizeObserver,
        markedIparts: candidates.length,
        eligibleVisibleIparts: Array.from(candidates).filter(function (wrapper) {
          return wrapper.getClientRects().length && wrapper.getBoundingClientRect().width > 0 && ownSurface(wrapper);
        }).length,
        active: !!entry,
        pinned: !!entry && entry.pinned,
        compact: !!entry && entry.compact
      };
    }
  };
  window.addEventListener("scroll", function () { schedule(); }, { passive: true });
  window.addEventListener("resize", function () { schedule(true); }, { passive: true });
  document.addEventListener("focusin", function (event) {
    if (openMenu && !openMenu.contains(event.target)) closeMenu(false);
    schedule();
  });
  document.addEventListener("focusout", function () { schedule(); });
  document.addEventListener("toggle", function (event) {
    var menu = event.target;
    if (!menu.matches || !menu.matches(".us-banner details.us-banner__action-menu")) return;
    if (menu.hasAttribute("data-us-actions-ready")) return;
    if (menu.open) {
      if (openMenu !== menu) closeMenu(false);
      openMenu = menu;
      positionMenu();
    } else if (openMenu === menu) openMenu = null;
  }, true);
  document.addEventListener("pointerdown", function (event) {
    if (openMenu && !openMenu.contains(event.target)) closeMenu(false);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && openMenu && !event.defaultPrevented) {
      event.preventDefault();
      closeMenu(true);
    }
  });
  document.addEventListener("click", function (event) {
    if (!openMenu) return;
    var action = event.target.closest(".us-banner__menu-item");
    if (action && openMenu.contains(action) && !action.disabled) closeMenu(openMenu.contains(document.activeElement));
  });
  window.addEventListener("pageshow", function () { schedule(true); });

  function start() {
    if (!observer) {
      observer = new MutationObserver(function (records) {
        if (records.some(function (record) {
          if (record.type === "childList") return record.addedNodes.length || record.removedNodes.length;
          return record.target === document.body || record.target.matches(scope) || (entry && record.target === entry.wrapper);
        })) schedule(true);
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
    }
    schedule(true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
  window.addEventListener("load", function () { attachAjax(); schedule(true); }, { once: true });
})();

/* Member profile status colours: independent of the scrolling enhancement. */
(function(){
  'use strict';
  if(window.UnionSuiteMemberStatus)return;
  const selector='.us-banner :is(.us-banner__surface--member,.us-banner__surface--status)';
  function luminance(c){const n=c.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return n[0]*.2126+n[1]*.7152+n[2]*.0722;}
  function displayColour(value){
    const input=/^#[0-9a-f]{6}$/i.test((value||'').trim())?value.trim().toUpperCase():'#596579';
    if(1.05/(luminance(input)+.05)>=4.5)return input;
    const rgb=input.slice(1).match(/../g).map(v=>parseInt(v,16));
    const shade=f=>'#'+rgb.map(v=>Math.floor(v*f).toString(16).padStart(2,'0')).join('').toUpperCase();
    let low=0,high=1;for(let i=0;i<24;i++){const mid=(low+high)/2;if(1.05/(luminance(shade(mid))+.05)>=4.5)low=mid;else high=mid;}
    return shade(low);
  }
  function refresh(){
    document.querySelectorAll(selector).forEach(surface=>{
      if(surface.closest('.us-report-no-styling'))return;
      const c=displayColour(surface.getAttribute('data-us-status-colour'));
      surface.style.setProperty('--member-status-colour',c);
      surface.style.setProperty('--member-status-inner-edge',luminance(c)<.14?'rgba(255,255,255,.5)':'transparent');
      surface.querySelectorAll('.us-banner__badge--member-status').forEach(pill=>{if(!pill.textContent.trim())pill.textContent='Status unavailable';});
    });
  }
  let pending=false;
  function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;refresh();});}
  window.UnionSuiteMemberStatus={refresh:refresh,displayColour:displayColour};
  function start(){refresh();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-us-status-colour','class']});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

/* US-BANNER-BEHAVIOUR:END */

/* US-ACTION-ICONS:START */
(function () {
  'use strict';
  if (window.UnionSuiteActionIcons) return;
  var selector = 'a.us-icon-button[aria-label],button.us-icon-button[aria-label]';
  var tooltip, owner, hovered, focused, timer, dismissed, observer, overTooltip = false;
  function control(node) {
    var item = node && node.closest && node.closest(selector);
    return item && item.getAttribute('aria-label').trim() && item.matches('.TextButton,.btn') && !item.matches(':disabled,[disabled],.disabled,.aspNetDisabled,[aria-disabled="true"],fieldset[disabled] *') ? item : null;
  }
  function hide() {
    if (tooltip) tooltip.hidden = true;
    owner = null;
    overTooltip = false;
    if (observer) observer.disconnect();
  }
  function position() {
    if (!owner || !owner.isConnected || !control(owner) || !owner.getClientRects().length) { hide(); return; }
    var r = owner.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) { hide(); return; }
    var t = tooltip.getBoundingClientRect();
    tooltip.style.left = Math.max(8, Math.min(innerWidth - t.width - 8, r.left + (r.width - t.width) / 2)) + 'px';
    tooltip.style.top = Math.max(8, r.top >= t.height + 14 ? r.top - t.height - 6 : Math.min(innerHeight - t.height - 8, r.bottom + 6)) + 'px';
  }
  function show(item) {
    if (!item || item === dismissed || !item.isConnected) { hide(); return; }
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'us-action-tooltip';
      // aria-label already supplies the accessible name; this is its visual
      // equivalent, so do not announce a duplicate description to readers.
      tooltip.setAttribute('aria-hidden', 'true');
      document.body.appendChild(tooltip);
    }
    if (owner !== item) overTooltip = false;
    owner = item;
    tooltip.toggleAttribute('data-us-taskbar-tooltip', !!item.closest('#injected-taskbar'));
    tooltip.textContent = item.getAttribute('aria-label');
    tooltip.hidden = false;
    position();
    if (!observer && window.MutationObserver) observer = new MutationObserver(function () {
      if (owner && (!owner.isConnected || !control(owner))) hide();
      else if (owner && tooltip.textContent !== owner.getAttribute('aria-label')) {
        tooltip.textContent = owner.getAttribute('aria-label'); position();
      }
    });
    if (observer) observer.observe(document.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'aria-disabled', 'aria-label', 'class']});
  }
  function update() { show(focused || hovered || (overTooltip ? owner : null)); }
  function defer() { clearTimeout(timer); timer = setTimeout(update, 120); }
  document.addEventListener('pointerover', function (event) {
    var item = control(event.target);
    if (item && item !== hovered) { hovered = item; dismissed = null; clearTimeout(timer); show(item); }
  });
  document.addEventListener('pointerout', function (event) {
    if (hovered && !hovered.contains(event.relatedTarget)) {
      hovered = null;
      defer();
    }
  });
  // The label is pointer-transparent: keep it readable while the pointer is
  // over its rectangle, but let controls underneath receive hover and clicks.
  document.addEventListener('pointermove', function (event) {
    if (!owner || !tooltip || tooltip.hidden || event.pointerType === 'touch') return;
    var r = tooltip.getBoundingClientRect();
    var inside = event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
    if (inside) { overTooltip = true; clearTimeout(timer); }
    else if (overTooltip) { overTooltip = false; defer(); }
  });
  document.addEventListener('focusin', function (event) {
    focused = control(event.target); dismissed = null; clearTimeout(timer); update();
  });
  document.addEventListener('focusout', function () { focused = null; defer(); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && owner) { dismissed = owner; clearTimeout(timer); hide(); }
  });
  document.addEventListener('click', function () { if (owner) { dismissed = owner; hide(); } });
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);
  window.addEventListener('blur', hide);
  window.UnionSuiteActionIcons = {version: '1.0', hideTooltip: hide};
})();
/* US-ACTION-ICONS:END */

/* US-FORM-UPLOAD:START — delegated native file enhancement; no upload requests. */
(function(){
 if(window.UnionSuiteForms)return;window.UnionSuiteForms={version:'1.0'};
 function target(e){const zone=e.target.closest?.('.us-form .PanelFieldValue');const input=zone?.querySelector(':scope > input[type=file]');return input&&!input.disabled&&!input.closest('.RadUpload,.RadAsyncUpload,.us-report,.SearchContactsClass,[data-us-iqa-native]')?{zone,input}:null}
 function clear(){document.querySelectorAll('.us-form .is-file-dragging').forEach(e=>e.classList.remove('is-file-dragging'))}
 function status(zone,text){let node=zone.querySelector('[data-us-file-status]');if(!node){node=document.createElement('small');node.className='field-help';node.dataset.usFileStatus='';node.setAttribute('role','status');zone.append(node)}node.textContent=text}
 function accepts(file,input){return !input.accept||input.accept.split(',').some(raw=>{const t=raw.trim().toLowerCase();return t.startsWith('.')?file.name.toLowerCase().endsWith(t):t.endsWith('/*')?file.type.toLowerCase().startsWith(t.slice(0,-1)):file.type.toLowerCase()===t})}
 document.addEventListener('dragover',e=>{const t=target(e);if(!t||!Array.from(e.dataTransfer?.types||[]).includes('Files'))return;e.preventDefault();e.dataTransfer.dropEffect='copy';clear();t.zone.classList.add('is-file-dragging');if(!t.zone.querySelector('.drop-hint')){const hint=document.createElement('span');hint.className='drop-hint';hint.setAttribute('aria-hidden','true');hint.textContent=t.input.multiple?'Drop files here':'Drop one file here';t.zone.append(hint)}});
 document.addEventListener('dragleave',e=>{const t=target(e);if(t&&!t.zone.contains(e.relatedTarget))clear()});
 document.addEventListener('dragend',clear);
 document.addEventListener('drop',e=>{const t=target(e);clear();if(!t||!Array.from(e.dataTransfer?.types||[]).includes('Files'))return;e.preventDefault();const files=Array.from(e.dataTransfer.files);if(!files.length)return;if(!t.input.multiple&&files.length>1){status(t.zone,'Please choose one file at a time.');return}if(files.some(f=>!accepts(f,t.input))){status(t.zone,'Choose a file matching the permitted file types.');return}try{t.input.files=e.dataTransfer.files;t.input.dispatchEvent(new Event('input',{bubbles:true}));t.input.dispatchEvent(new Event('change',{bubbles:true}));status(t.zone,files.map(f=>f.name).join(', '))}catch{status(t.zone,'Use Choose file to select the file.')}});
 document.addEventListener('reset',e=>{clear();e.target.querySelectorAll('[data-us-file-status]').forEach(n=>n.textContent='')});
})();
/* US-FORM-UPLOAD:END */

/* US-BUSY-PRESENTATION:START — shared presentation; callers own requests/availability. */
(function(){
 if(window.UnionSuiteBusy)return;
 const active=new Map();
 function show(button,options={}){
  if(active.has(button))return active.get(button);
  const style=getComputedStyle(button),rect=button.getBoundingClientRect(),input=button.tagName==='INPUT';
  const saved={width:button.style.width,minWidth:button.style.minWidth,paddingLeft:button.style.paddingLeft,textAlign:button.style.textAlign,aria:button.getAttribute('aria-busy'),label:button.getAttribute('aria-label'),hadClass:button.classList.contains('us-busy-hide-label')};
  const spinner=document.createElement('span');spinner.className='us-button-spinner us-busy-indicator';spinner.setAttribute('aria-hidden','true');spinner.style.color=style.color;spinner.style.opacity=style.opacity;
  const label=()=>input?button.value:button.textContent;
  const measure=document.createElement('canvas').getContext('2d');
  function textWidth(){const st=getComputedStyle(button);measure.font=st.font;return measure.measureText(label()).width+(parseFloat(st.letterSpacing)||0)*label().length}
  const compact=options.mode==='center'||button.classList.contains('us-icon-button')||(options.mode!=='label'&&textWidth()+24>button.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight));
  button.style.width=rect.width+'px';button.style.minWidth=rect.width+'px';button.setAttribute('aria-busy','true');
  if(compact){if(!saved.label)button.setAttribute('aria-label',label());button.classList.add('us-busy-hide-label')}
  else{button.style.paddingLeft=((parseFloat(style.paddingLeft)||0)+24)+'px';button.style.textAlign='center'}
  document.body.append(spinner);
  function position(){const r=button.getBoundingClientRect(),st=getComputedStyle(button);let x=r.left+(r.width-16)/2;if(!compact){const centre=r.left+(parseFloat(st.borderLeftWidth)||0)+(parseFloat(st.paddingLeft)||0)+(button.clientWidth-(parseFloat(st.paddingLeft)||0)-(parseFloat(st.paddingRight)||0))/2;x=centre-textWidth()/2-24}spinner.style.left=x+'px';spinner.style.top=(r.top+(r.height-16)/2)+'px';spinner.hidden=!button.isConnected||!r.width||!r.height}
  function clear(){if(active.get(button)!==handle)return;active.delete(button);spinner.remove();for(const key of ['width','minWidth','paddingLeft','textAlign'])button.style[key]=saved[key];if(!saved.hadClass)button.classList.remove('us-busy-hide-label');for(const [attr,value] of [['aria-busy',saved.aria],['aria-label',saved.label]]){if(value===null)button.removeAttribute(attr);else button.setAttribute(attr,value)}window.removeEventListener('scroll',position,true);window.removeEventListener('resize',position);observer?.disconnect()}
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(position):null;const handle={button,clear};active.set(button,handle);observer?.observe(button);position();window.addEventListener('scroll',position,true);window.addEventListener('resize',position);return handle;
 }
 window.UnionSuiteBusy={version:'1.0',show,clear:button=>active.get(button)?.clear()};
 window.addEventListener('pagehide',()=>{for(const h of active.values())h.clear()});
})();
/* US-BUSY-PRESENTATION:END */

/* US-UTILITY-NAV:START — feedback on existing navigation/postback/picker links. */
(function () {
  if (window.UnionSuiteUtilityNav) return;
  const selector = '.navbar-right .nav-aux-cart > a,.navbar-right a.ste-toggle,.navbar-right a.obo-toggle';
  const dialogSelector = '.RadWindow,.floatingAdder,[role="dialog"]';
  const active = new Map();
  let pending = null, manager = null, application = null, observer = null, frame = null;
  function eligible(button) {
    return button?.matches?.(selector) && button.isConnected &&
      !button.closest('.us-report-no-styling,[aria-disabled="true"],.disabled,.aspNetDisabled,[hidden]') &&
      button.getClientRects().length > 0;
  }
  function visibleDialogs() {
    return new Set(Array.from(document.querySelectorAll(dialogSelector)).filter(node =>
      node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden'));
  }
  function clear(button) {
    const entry = active.get(button);
    if (!entry) return;
    active.delete(button);clearTimeout(entry.timer);entry.visual.clear();
    if (pending === entry) pending = null;
    if (!active.size) { observer?.disconnect();observer = null;cancelAnimationFrame(frame);frame = null; }
  }
  function clearAll() { for (const button of active.keys()) clear(button); }
  function inspect() {
    frame = null;
    let dialogs;
    for (const [button,entry] of active) {
      if (!eligible(button) || button.classList.contains('on') !== entry.wasOn) { clear(button);continue; }
      if (button.matches('.obo-toggle') && !entry.request) {
        dialogs ||= visibleDialogs();
        // The native picker now owns the interaction; this link has finished opening it.
        if (Array.from(dialogs).some(node => !entry.dialogs.has(node))) clear(button);
      }
    }
  }
  function schedule() { if (frame === null) frame = requestAnimationFrame(inspect); }
  function show(button) {
    if (active.has(button)) return active.get(button);
    const entry = {button,wasOn:button.classList.contains('on'),dialogs:visibleDialogs(),started:Date.now(),request:false};
    entry.visual = window.UnionSuiteBusy.show(button,{mode:'center'});
    // Navigation can be cancelled and third-party picker variants have no common end event.
    entry.timer = setTimeout(() => clear(button),10000);
    active.set(button,entry);
    if (!observer) {
      observer = new MutationObserver(schedule);
      observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden','aria-hidden','aria-disabled']});
    }
    schedule();return entry;
  }
  function begin(sender,args) {
    const source = args.get_postBackElement?.();
    let entry = active.get(source?.closest?.(selector));
    // ToggleOBO delegates to the native select/clear control in this account menu.
    if (!entry && pending && Date.now()-pending.started < 1500 && pending.button.matches('.obo-toggle') &&
      source?.closest?.('.account-menu') === pending.button.closest('.account-menu')) entry = pending;
    if (entry) { entry.request = true;clearTimeout(entry.timer); }
    pending = null;
  }
  function end() { for (const [button,entry] of active) if (entry.request) clear(button); }
  function attach() {
    const next = window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
    if (next && manager !== next) {
      manager?.remove_beginRequest?.(begin);manager?.remove_endRequest?.(end);
      end();manager = next;manager.add_beginRequest(begin);manager.add_endRequest(end);
    }
    const app = window.Sys?.Application;
    if (app && application !== app) { application?.remove_load?.(attach);application = app;app.add_load(attach); }
  }
  document.addEventListener('click',event => {
    const button = event.target.closest?.(selector);
    if (!eligible(button) || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
      button.hasAttribute('download') || (button.target && button.target !== '_self') || !window.UnionSuiteBusy) return;
    if (active.has(button)) { event.preventDefault();event.stopImmediatePropagation();return; }
    attach();pending = show(button);
    // OBO deliberately returns false after opening its picker. Only cancelled cart
    // navigation can use defaultPrevented as a reliable cancellation signal.
    if (button.matches('.nav-aux-cart > a')) setTimeout(() => { if (event.defaultPrevented) clear(button); },0);
  },true);
  window.UnionSuiteUtilityNav = {version:'1.0',refresh:attach};
  attach();document.addEventListener('DOMContentLoaded',attach,{once:true});window.addEventListener('load',attach,{once:true});
  window.addEventListener('pagehide',clearAll);window.addEventListener('pageshow',clearAll);
})();
/* US-UTILITY-NAV:END */

/* US-BUTTON-BUSY:START — explicit Promise integration only. */
(function(){
 if(window.UnionSuiteButtons)return;const running=new WeakMap();
 window.UnionSuiteButtons={version:'2.0',run:function(button,action,label){
  if(!button||!button.matches('button,input[type=submit],input[type=button]'))return Promise.reject(new TypeError('Pass a native button or submit input.'));
  if(running.has(button))return running.get(button);
  if(button.matches(':disabled'))return Promise.reject(new Error('Button is unavailable.'));
  const input=button.tagName==='INPUT',value=button.value,nodes=input?null:Array.from(button.childNodes),width=button.style.width,min=button.style.minWidth;
  const rect=button.getBoundingClientRect();button.style.width=rect.width+'px';button.style.minWidth=rect.width+'px';button.disabled=true;
  if(input)button.value=label||'Working…';else button.textContent=label||'Working…';
  const visual=UnionSuiteBusy.show(button);
  const promise=Promise.resolve().then(action).finally(()=>{visual.clear();if(input)button.value=value;else button.replaceChildren(...nodes);button.disabled=false;button.style.width=width;button.style.minWidth=min;running.delete(button)});
  running.set(button,promise);return promise;
 }};
})();
/* US-BUTTON-BUSY:END */

/* US-IQA-BUSY:START — native ASP.NET lifecycle; never submit or alter disabled. */
(function(){
 if(window.UnionSuiteIqaBusy)return;
 let manager=null,active=null,application=null;
 function clear(){active?.clear();active=null}
 function showResults(button,row=null){
  const content=button.closest('[id$="_ContentPanel"]'),grid=button.closest('[data-gridid]');
  if(!content||!grid||button.closest('.us-report-no-styling'))return null;
  const rowMode=Boolean(row),rowId=row?.id;
  let target=null,busy=null,progress=null,hadMarker=false,frame=null,closed=false;
  const overlay=document.createElement('div');overlay.className='us-iqa-find-overlay'+(rowMode?' us-iqa-row-overlay':'');overlay.setAttribute('aria-hidden','true');
  const spinner=document.createElement('span');spinner.className='section-loader-spinning-circles';overlay.append(spinner);
  const status=document.createElement('span');status.className='us-iqa-refresh-status';status.setAttribute('role','status');
  document.body.append(overlay,status);
  function releaseTarget(){if(target){if(busy===null)target.removeAttribute('aria-busy');else target.setAttribute('aria-busy',busy)}target=null;}
  function releaseProgress(){if(progress&&!hadMarker)progress.removeAttribute('data-us-iqa-progress-replaced');progress=null;}
  function position(){
   if(closed)return;
   const owner=(content.id&&document.getElementById(content.id))||content;
   const root=(grid.id&&document.getElementById(grid.id))||grid;
   const bodies=!rowMode&&root.isConnected?root.querySelectorAll('.rgMasterTable > tbody'):[];
   const replacement=rowMode&&rowId?document.getElementById(rowId):null;
   // A partial update may replace the row node. Reconcile by its native ID,
   // within this grid only; never dim a different row by positional index.
   const next=rowMode?(row.isConnected&&root.contains(row)?row:replacement&&root.contains(replacement)&&replacement.matches('tr.rgRow,tr.rgAltRow')?replacement:null):bodies.length===1?bodies[0]:null;
   if(next!==target){releaseTarget();target=next;if(target){busy=target.getAttribute('aria-busy');target.setAttribute('aria-busy','true')}}
   const r=target?.getBoundingClientRect();
   let left=r?.left||0,top=r?.top||0,right=r?.right||0,bottom=r?.bottom||0;
   for(let node=target?.parentElement;node&&node!==document.body;node=node.parentElement){
    const style=getComputedStyle(node),rect=node.getBoundingClientRect();
    if(/auto|scroll|hidden|clip/.test(style.overflowX)){left=Math.max(left,rect.left);right=Math.min(right,rect.right)}
    if(/auto|scroll|hidden|clip/.test(style.overflowY)){top=Math.max(top,rect.top);bottom=Math.min(bottom,rect.bottom)}
   }
   left=Math.max(0,left);top=Math.max(0,top);right=Math.min(innerWidth,right);bottom=Math.min(innerHeight,bottom);
   const optedOut=Boolean(owner.closest('.us-report-no-styling'));
   const visible=Boolean(target&&right>left&&bottom>top&&!optedOut);
   if(overlay.hidden===visible)overlay.hidden=!visible;
   const label=!optedOut&&(visible||rowMode)?rowMode?'Loading row details':'Loading results':'';if(status.textContent!==label)status.textContent=label;
   if(visible){for(const [key,value] of Object.entries({left:left+'px',top:top+'px',width:(right-left)+'px',height:(bottom-top)+'px'}))if(overlay.style[key]!==value)overlay.style[key]=value;}
   // Once a native row request is recognised, keep its owning report's broad
   // indicator suppressed through scrolling/replacement until endRequest.
   const indicator=!optedOut&&(visible||rowMode)?owner.querySelector(':scope > .ClearFix > [id$="_UpdateProgress1"]'):null;
   if(indicator!==progress){releaseProgress();progress=indicator;if(progress){hadMarker=progress.hasAttribute('data-us-iqa-progress-replaced');progress.setAttribute('data-us-iqa-progress-replaced','');}}
   frame=requestAnimationFrame(position);
  }
  position();
  return {clear(){if(closed)return;closed=true;cancelAnimationFrame(frame);releaseTarget();releaseProgress();overlay.remove();status.remove();}};
 }
 const sortSelector='.rgMasterTable th.rgHeader a[onclick*="Telerik.Web.UI.Grid.Sort("],.rgMasterTable th.rgHeader a[id*="_Sort_"]';
 const rowSelector='.rgMasterTable td.rgExpandCol :is(input,button):is(.rgExpand,.rgCollapse)';
 let pendingCommand=null;
 // Telerik may report the grid as the source instead of its clicked control.
 // Remember only the current click turn; cancelled clicks never start loading.
 document.addEventListener('click',event=>{
  const control=event.target.closest?.(sortSelector+','+rowSelector);
  pendingCommand=control||null;
  if(control)setTimeout(()=>{if(pendingCommand===control)pendingCommand=null;},0);
 },true);
 function begin(sender,args){
  clear();const source=args.get_postBackElement?.();
  const pending=pendingCommand;pendingCommand=null;
  const command=source?.matches(sortSelector+','+rowSelector)?source:
   pending&&source&&pending.closest('[data-gridid]')&&pending.closest('[data-gridid]')===source.closest('[data-gridid]')?pending:null;
  const find=source?.matches('input.TextButton[id$="_SubmitButton"],button.TextButton[id$="_SubmitButton"]');
  const button=find?source:command;
  if(!button)return;
  if(button.closest('.us-report-no-styling'))return;
  if(!button.closest('.FilterPanel,.us-report,.SearchContactsClass,[data-us-iqa-native]')&&!/_ResultsGrid_/i.test(button.id))return;
  const rowControl=!find&&button.matches(rowSelector),row=rowControl?button.closest('tr.rgRow,tr.rgAltRow'):null;
  if(rowControl&&!row)return;
  const buttonBusy=find?UnionSuiteBusy.show(button,{mode:'center'}):null,results=showResults(button,row);
  active={clear(){buttonBusy?.clear();results?.clear();}};
 }
 function attach(){
  const next=window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
  if(next&&next!==manager){if(manager){manager.remove_beginRequest(begin);manager.remove_endRequest(clear)}clear();manager=next;manager.add_beginRequest(begin);manager.add_endRequest(clear)}
  const app=window.Sys?.Application;
  if(app&&app!==application){application?.remove_load?.(attach);application=app;app.add_load(attach)}
 }
 window.UnionSuiteIqaBusy={version:'3.2',refresh:attach,showResults};
 attach();document.addEventListener('DOMContentLoaded',attach,{once:true});window.addEventListener('load',attach,{once:true});window.addEventListener('pagehide',clear);window.addEventListener('pageshow',clear);
})();
/* US-IQA-BUSY:END */

/* US-NATIVE-LOADERS:START — decorate native indicators; no request interception. */
(function(){
 if(window.UnionSuiteSectionLoading)return;
 const selector='.rwWindowContent.rwLoading,.RadAjax > .raDiv';
 function refresh(){
  document.querySelectorAll('.us-native-loader-host').forEach(host=>{
   if(!host.matches(selector)){host.classList.remove('us-native-loader-host');host.querySelector(':scope > .us-native-section-spinner')?.remove()}
  });
  document.querySelectorAll(selector).forEach(host=>{
   if(!host.querySelector(':scope > .us-native-section-spinner')){
    const spinner=document.createElement('span');spinner.className='section-loader-spinning-circles us-native-section-spinner';spinner.setAttribute('aria-hidden','true');host.append(spinner);
   }
   host.classList.add('us-native-loader-host');
  });
 }
 let queued=false;
 function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;refresh()})}
 function start(){refresh();new MutationObserver(records=>{if(records.some(r=>r.type==='childList'||r.oldValue!==r.target.getAttribute('class')))schedule()}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class'],attributeOldValue:true})}
 window.UnionSuiteSectionLoading={version:'1.0',refresh};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
/* US-NATIVE-LOADERS:END */

/* US-SIGNIN-BUSY:START — observe native disabled state, never read credentials. */
(function(){
 if(window.UnionSuiteSignInBusy)return;
 const selector='input.TextButton.SignInButton[type="submit"]';
 let active=null,manager=null;
 function clear(){active?.clear();active=null}
 function show(button){if(active?.button===button)return;clear();active=UnionSuiteBusy.show(button,{mode:'label'})}
 function attach(){const next=window.Sys?.WebForms?.PageRequestManager?.getInstance?.();if(next&&next!==manager){manager?.remove_endRequest(clear);manager=next;manager.add_endRequest(clear)}}
 function start(){attach();new MutationObserver(records=>{if(active&&(!active.button.isConnected||!active.button.disabled))clear();for(const r of records){if(r.type==='attributes'&&r.oldValue===null&&r.target.matches(selector)&&r.target.disabled)show(r.target)}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled'],attributeOldValue:true})}
 window.UnionSuiteSignInBusy={version:'2.0',refresh:attach};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 window.addEventListener('load',attach,{once:true});window.addEventListener('pagehide',clear);window.addEventListener('pageshow',clear);
})();
/* US-SIGNIN-BUSY:END */

/* US-IQA-NATIVE-ACTIONS:START — align existing controls without replacing handlers. */
(function(){
 if(window.UnionSuiteNativeIqa)return;
 const entries=new Map();
 function refresh(){
  for(const [root,e] of entries){if(!root.isConnected||!e.find.isConnected||!e.marker.isConnected||root.closest('.us-report,.SearchContactsClass,[data-us-iqa-native],.us-report-no-styling')){if(e.marker.isConnected)e.marker.replaceWith(e.group);else e.group.remove();if(e.row.isConnected){e.row.replaceWith(...e.row.childNodes)}entries.delete(root)}}
  document.querySelectorAll('[data-gridid]').forEach(root=>{
   if(entries.has(root)||root.closest('.us-report,.SearchContactsClass,[data-us-iqa-native],.us-report-no-styling'))return;
   const find=root.querySelector(':is(.FilterPanel,.FilterPanelHorizontal) .TextButton[id$="_SubmitButton"]');
   const group=Array.from(root.querySelectorAll('.GridTitlePanel .btn-group')).find(el=>el.querySelector('[id*="_btnExport"]'));
   if(!find||!group)return;
   const marker=document.createComment('native export position'),row=document.createElement('div');row.className='us-native-iqa-actions';group.before(marker);find.before(row);row.append(find,group);entries.set(root,{find,group,marker,row});
  });
 }
 let queued=false;function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;refresh()})}
 function start(){refresh();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true})}
 window.UnionSuiteNativeIqa={version:'1.0',refresh};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
/* US-IQA-NATIVE-ACTIONS:END */

/* US-THEME-UPLOAD-DROP:START — native input events retain Telerik processing. */
(function(){
 if(window.UnionSuiteThemeUpload)return;
 let zone=null,depth=0;
 function reset(){zone?.classList.remove('is-file-dragover');zone=null;depth=0}
 function find(e){const z=e.target.closest?.(':is([id$="_DocumentEditPanel"]:has(input[data-propertyname="Name"]):has(.RadUpload),[id$="_AppThemeEditControl_UploadPanel"],[id$="_ImporterControlPanel"] [id$="_FileUploadPanel"]) .PanelField:has(.RadUpload)');return z&&!z.closest('.us-report-no-styling')&&z.querySelector('input[type=file]:not(:disabled)')?z:null}
 function isFile(e){return Array.from(e.dataTransfer?.types||[]).includes('Files')}
 document.addEventListener('dragenter',e=>{const z=find(e);if(!z||!isFile(e))return;if(zone!==z){reset();zone=z}depth++;zone.classList.add('is-file-dragover')});
 document.addEventListener('dragover',e=>{if(find(e)&&isFile(e)){e.preventDefault();e.dataTransfer.dropEffect='copy'}});
 document.addEventListener('dragleave',e=>{if(zone?.contains(e.target)&&--depth<=0)reset()});
 document.addEventListener('drop',e=>{const z=find(e);reset();if(!z||!isFile(e))return;e.preventDefault();const input=z.querySelector('input[type=file]:not(:disabled)');if(e.dataTransfer.files.length!==1)return;const transfer=new DataTransfer();transfer.items.add(e.dataTransfer.files[0]);input.files=transfer.files;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});
 document.addEventListener('dragend',reset);window.addEventListener('blur',reset);
 window.UnionSuiteThemeUpload={version:'1.2'};
})();
/* US-THEME-UPLOAD-DROP:END */

/* US-NATIVE-VALIDATION:START — presentation bridge for visible ASP.NET validators. */
(function(){
 if(window.UnionSuiteValidation)return;
 const marked=new Map();
 function refresh(){
  const invalid=new Map();
  document.querySelectorAll('.PanelFieldValue .ValidationError').forEach(message=>{
   const style=getComputedStyle(message);
   if(style.display==='none'||style.visibility==='hidden'||!message.getClientRects().length||!message.textContent.trim())return;
   let input=message.controltovalidate?document.getElementById(message.controltovalidate):null;
   if(!input){const candidates=message.closest('.PanelFieldValue').querySelectorAll('input:not([type=hidden],[type=button],[type=submit],[type=checkbox],[type=radio]),select,textarea');if(candidates.length===1)input=candidates[0]}
   if(!input||input.disabled)return;
   if(!invalid.has(input))invalid.set(input,[]);if(message.id)invalid.get(input).push(message.id);
  });
  for(const [input,old] of marked){if(!invalid.has(input)){if(!old.hadClass)input.classList.remove('us-native-invalid');if(old.aria===null)input.removeAttribute('aria-invalid');else input.setAttribute('aria-invalid',old.aria);if(old.description===null)input.removeAttribute('aria-describedby');else input.setAttribute('aria-describedby',old.description);marked.delete(input)}}
  for(const [input,ids] of invalid){if(!marked.has(input))marked.set(input,{hadClass:input.classList.contains('us-native-invalid'),aria:input.getAttribute('aria-invalid'),description:input.getAttribute('aria-describedby')});const old=marked.get(input);if(!input.classList.contains('us-native-invalid'))input.classList.add('us-native-invalid');input.setAttribute('aria-invalid','true');const refs=[...new Set([...(old.description||'').split(/\s+/).filter(Boolean),...ids])];if(refs.length)input.setAttribute('aria-describedby',refs.join(' '))}
 }
 let queued=false;function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;refresh()})}
 function start(){refresh();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style','class','hidden','disabled']})}
 window.UnionSuiteValidation={version:'1.0',refresh};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();window.addEventListener('resize',schedule);
})();
/* US-NATIVE-VALIDATION:END */

/* US-NATIVE-SAVE-BUSY:START — observe native disabled state, never read credentials. */
(function(){
 if(window.UnionSuiteSaveBusy)return;
 const selector='.CommandBar input.TextButton.Save[data-ajaxupdatedcontrolid],input.TextButton.SaveAndClose[data-ajaxupdatedcontrolid]';
 let active=null,manager=null;
 function clear(){active?.clear();active=null}
 function show(button){if(active?.button===button)return;clear();active=UnionSuiteBusy.show(button,{mode:'center'})}
 function attach(){const next=window.Sys?.WebForms?.PageRequestManager?.getInstance?.();if(next&&next!==manager){manager?.remove_endRequest(clear);manager=next;manager.add_endRequest(clear)}}
 function start(){attach();new MutationObserver(records=>{if(active&&(!active.button.isConnected||!active.button.disabled))clear();for(const r of records){if(r.type==='attributes'&&r.oldValue===null&&r.target.matches(selector)&&r.target.disabled)show(r.target)}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled'],attributeOldValue:true})}
 window.UnionSuiteSaveBusy={version:'2.1',refresh:attach};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 window.addEventListener('load',attach,{once:true});window.addEventListener('pagehide',clear);window.addEventListener('pageshow',clear);
})();
/* US-NATIVE-SAVE-BUSY:END */

/* US-WIZARD-BUSY:START — accepted partial requests and native full-page submissions. */
(function(){
 if(window.UnionSuiteWizardBusy)return;
 let manager=null,active=null,application=null,disabledNext=null,pending=null;
 function matches(button){return button?.matches?.('.CommandBar input.TextButton')&&/_gwpciCCO/i.test(button.id)&&/_btn(?:Next|Previous)_\d+$/.test(button.id)}
 function clear(){active?.clear();active=null;pending=null;if(disabledNext){disabledNext.button.disabled=disabledNext.wasDisabled;disabledNext=null}}
 function show(button){
  if(!matches(button)||active?.button===button)return;
  clear();
  if(/_btnNext_\d+$/.test(button.id)){disabledNext={button,wasDisabled:button.disabled};button.disabled=true}
  active=UnionSuiteBusy.show(button,{mode:'center'});
 }
 function begin(sender,args){clear();show(args.get_postBackElement?.())}
 // __doPostBack uses form.submit(), which does not dispatch a submit event.
 // Observe only the clicked wizard form, preserving its original method and return value.
 document.addEventListener('click',event=>{
  const button=event.target;
  if(!matches(button)||button.disabled||!button.form)return;
  const form=button.form,original=form.submit,own=Object.getOwnPropertyDescriptor(form,'submit');
  pending=button;
  let wrapped=null;
  if(typeof original==='function'){
   wrapped=function(){
    const result=original.apply(this,arguments);
    if(this===form)show(button); // Native submission has already captured form values.
    return result;
   };
   try{form.submit=wrapped}catch{}
  }
  setTimeout(()=>{
   if(wrapped&&form.submit===wrapped){if(own)Object.defineProperty(form,'submit',own);else delete form.submit}
   if(pending===button)pending=null;
  },0);
 },true);
 // A submit-type Next uses the browser's default submission path.
 document.addEventListener('submit',event=>{
  const button=event.submitter||pending;
  if(!matches(button)||button.form!==event.target)return;
  setTimeout(()=>{if(!event.defaultPrevented&&button.isConnected)show(button)},0);
 },true);
 function attach(){
  const next=window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
  if(next&&next!==manager){if(manager){manager.remove_beginRequest(begin);manager.remove_endRequest(clear)}clear();manager=next;manager.add_beginRequest(begin);manager.add_endRequest(clear)}
  const app=window.Sys?.Application;
  if(app&&app!==application){application?.remove_load?.(attach);application=app;app.add_load(attach)}
 }
 window.UnionSuiteWizardBusy={version:'1.2',refresh:attach};
 attach();document.addEventListener('DOMContentLoaded',attach,{once:true});window.addEventListener('load',attach,{once:true});window.addEventListener('pagehide',clear);window.addEventListener('pageshow',clear);
})();
/* US-WIZARD-BUSY:END */

/* US-IQA-REFRESH-OVERLAY:START — accepted ASP.NET refresh requests only. */
(function(){
 if(window.UnionSuiteIqaRefresh)return;
 let manager=null,application=null,active=null;
 function clear(){
  if(!active)return;
  const a=active;active=null;a.overlay.remove();a.status.remove();a.observer?.disconnect();
  window.removeEventListener('scroll',a.position,true);window.removeEventListener('resize',a.position);
  if(a.busy===null)a.grid.removeAttribute('aria-busy');else a.grid.setAttribute('aria-busy',a.busy);
 }
 function begin(sender,args){
  clear();const button=args.get_postBackElement?.();
  if(button?.closest('.us-report-no-styling'))return;
  if(!button?.matches('input[type="image"][id$="_ResultsGrid_RefreshButton"][data-ajaxupdatedcontrolid]'))return;
  const grid=document.getElementById(button.getAttribute('data-ajaxupdatedcontrolid'));
  if(!grid)return;
  const overlay=document.createElement('div');overlay.className='us-iqa-refresh-overlay';overlay.setAttribute('aria-hidden','true');
  const spinner=document.createElement('span');spinner.className='section-loader-spinning-circles';overlay.append(spinner);
  const status=document.createElement('span');status.className='us-iqa-refresh-status';status.setAttribute('role','status');status.textContent='Refreshing results';
  const busy=grid.getAttribute('aria-busy');grid.setAttribute('aria-busy','true');
  function position(){if(!grid.isConnected){clear();return}const r=grid.getBoundingClientRect();overlay.hidden=!r.width||!r.height;Object.assign(overlay.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'})}
  const observer=window.ResizeObserver?new ResizeObserver(position):null;
  active={grid,overlay,status,busy,position,observer};document.body.append(overlay,status);position();
  observer?.observe(grid);window.addEventListener('scroll',position,true);window.addEventListener('resize',position);
 }
 function attach(){
  const next=window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
  if(next&&next!==manager){if(manager){manager.remove_beginRequest(begin);manager.remove_endRequest(clear)}clear();manager=next;manager.add_beginRequest(begin);manager.add_endRequest(clear)}
  const app=window.Sys?.Application;if(app&&app!==application){application?.remove_load?.(attach);application=app;app.add_load(attach)}
 }
 window.UnionSuiteIqaRefresh={version:'1.0',refresh:attach};
 attach();document.addEventListener('DOMContentLoaded',attach,{once:true});window.addEventListener('load',attach,{once:true});window.addEventListener('pagehide',clear);window.addEventListener('pageshow',clear);
})();
/* US-IQA-REFRESH-OVERLAY:END */

/* US-THEME-SAVE-BUSY:START — accepted partial requests and native full-page submissions. */
(function(){
 if(window.UnionSuiteThemeSaveBusy)return;
 let manager=null,active=null,application=null,disabledSave=null,pending=null;
 function matches(button){
  // Native task dialogs expose a stable Ok class and task handler.
  if(button?.matches?.('input.TextButton.Ok[data-ajaxupdatedcontrolid][onclick*="ExecuteTask("]'))return true;
  // Cache maintenance has no distinct class; use the stable control suffix.
  if(button?.matches?.('input.TextButton[id$="_PurgeAllCacheButton"][onclick*="WebForm_DoPostBackWithOptions("]'))return true;
  if(button?.matches?.('input.TextButton:is([id$="_AppThemeEditControl_UploadButton"],[id$="_TemplateBody_ImportButton"],[id$="_SaveButton"][onclick*="SaveButtonRefresh("])')||button?.matches?.('[id$="_ImporterControlPanel"] input.TextButton[id$="_TemplateBody_UploadButton"]'))return true;
  // Identify Close by its paired IQA Save control, without hard-coding a
  // generated DesignShell number or enabling unrelated Close buttons.
  if(!button?.matches?.('input.TextButton[id$="_CloseButton"][onclick*="__doPostBack("]'))return false;
  const save=document.getElementById(button.id.replace(/_CloseButton$/,'_SaveButton'));
  return Boolean(save?.matches('input.TextButton[onclick*="SaveButtonRefresh("]')&&save.form===button.form);
 }
 function clear(){active?.clear();active=null;pending=null;if(disabledSave){disabledSave.button.disabled=disabledSave.wasDisabled;disabledSave=null}}
 function show(button){
  if(!matches(button)||active?.button===button)return;
  clear();
  if(matches(button)){disabledSave={button,wasDisabled:button.disabled};button.disabled=true}
  active=UnionSuiteBusy.show(button,{mode:'center'});
 }
 function requestButton(source){
  if(matches(source))return source;
  // Publishing routes the visible OK click through a hidden submit control.
  // Only associate it during that click and within the same native form.
  if(source?.matches?.('input[type="submit"][id$="_ExecuteTaskButton"]')&&
     pending?.matches?.('input.TextButton.Ok[data-ajaxupdatedcontrolid][onclick*="ExecuteTask("]')&&
     source.form===pending.form)return pending;
  return null;
 }
 function begin(sender,args){const button=requestButton(args.get_postBackElement?.());clear();show(button)}
 // __doPostBack uses form.submit(), which does not dispatch a submit event.
 // Observe only the clicked Theme Upload, Import, IQA Save/Close, task OK or cache purge form,
 // preserving its original method and return value.
 document.addEventListener('click',event=>{
  const button=event.target;
  if(!matches(button)||button.disabled||!button.form)return;
  const form=button.form,original=form.submit,own=Object.getOwnPropertyDescriptor(form,'submit');
  pending=button;
  let wrapped=null;
  if(typeof original==='function'){
   wrapped=function(){
    const result=original.apply(this,arguments);
    if(this===form)show(button); // Native submission has already captured form values.
    return result;
   };
   try{form.submit=wrapped}catch{}
  }
  setTimeout(()=>{
   if(wrapped&&form.submit===wrapped){if(own)Object.defineProperty(form,'submit',own);else delete form.submit}
   if(pending===button)pending=null;
  },0);
 },true);
 // The submit-type Save uses the browser's default submission path.
 document.addEventListener('submit',event=>{
  const button=requestButton(event.submitter||pending);
  if(!matches(button)||button.form!==event.target)return;
  setTimeout(()=>{if(!event.defaultPrevented&&button.isConnected)show(button)},0);
 },true);
 function attach(){
  const next=window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
  if(next&&next!==manager){if(manager){manager.remove_beginRequest(begin);manager.remove_endRequest(clear)}clear();manager=next;manager.add_beginRequest(begin);manager.add_endRequest(clear)}
  const app=window.Sys?.Application;
  if(app&&app!==application){application?.remove_load?.(attach);application=app;app.add_load(attach)}
 }
 window.UnionSuiteThemeSaveBusy={version:'1.7',refresh:attach};
 attach();document.addEventListener('DOMContentLoaded',attach,{once:true});window.addEventListener('load',attach,{once:true});window.addEventListener('pagehide',clear);window.addEventListener('pageshow',clear);
})();
/* US-THEME-SAVE-BUSY:END */

/* US-NATIVE-TABS:START */
// Native iMIS remains responsible for selection, keyboard handling and postbacks.
(() => {
  if (window.UnionSuiteTabs) return;
  // Telerik can transfer focus during pointer activation. Keep that focus
  // distinct from keyboard navigation even when :focus-visible is retained.
  document.addEventListener('pointerdown', event => {
    if(event.target.closest?.('.RadTabStrip,.RadTabStripVertical')) document.documentElement.setAttribute('data-us-tabs-pointer','');
    else document.documentElement.removeAttribute('data-us-tabs-pointer');
  },true);
  document.addEventListener('keydown', event => {
    if(!['Shift','Control','Alt','Meta'].includes(event.key)) document.documentElement.removeAttribute('data-us-tabs-pointer');
  },true);
  const entries = new Map();
  let queued = false;
  const mobile = window.matchMedia('(max-width:600px)');
  const disabled = tab => tab.matches('.rtsDisabled,[aria-disabled="true"],[disabled]') || tab.closest('[aria-disabled="true"]');
  function attribute(node, name, value) { if (node.getAttribute(name) !== value) node.setAttribute(name,value); }
  function edges(entry) {
    const level = entry.level;
    attribute(level,'data-more-left',String(level.scrollLeft > 2));
    attribute(level,'data-more-right',String(level.scrollWidth-level.clientWidth-level.scrollLeft > 2));
  }
  function update(entry, reveal) {
    const tabs = [...entry.list.querySelectorAll(':scope > .rtsLI > .rtsLink[role="tab"]')];
    const selected = tabs.find(tab => tab.classList.contains('rtsSelected'));
    if (entry.picker) {
      const signature = tabs.map(tab => tab.textContent.trim()).join('\u0000');
      if (entry.signature !== signature || tabs.some((tab,i) => entry.tabs[i] !== tab)) {
        entry.options.replaceChildren();
        entry.buttons = tabs.map(tab => {
          const button = document.createElement('button');
          button.type = 'button'; button.textContent = tab.textContent.trim();
          button.addEventListener('click', () => {
            if (!tab.isConnected || disabled(tab)) return;
            entry.picker.open = false;
            tab.click(); // Invoke the existing control; never switch panels ourselves.
            if (tab.isConnected) tab.focus({preventScroll:true});
            schedule();
          });
          entry.options.append(button); return button;
        });
        entry.signature = signature;
      }
      entry.buttons.forEach((button,i) => {
        const unavailable = !!disabled(tabs[i]);
        if (button.disabled !== unavailable) button.disabled = unavailable;
        attribute(button,'aria-current',String(tabs[i] === selected));
      });
      if (!mobile.matches) entry.picker.open = false;
    }
    entry.tabs = tabs;
    if (mobile.matches && selected && (reveal || selected !== entry.selected)) {
      const box = entry.level.getBoundingClientRect(), item = selected.getBoundingClientRect();
      if (item.left < box.left+16) entry.level.scrollLeft -= box.left+16-item.left;
      else if (item.right > box.right-16) entry.level.scrollLeft += item.right-box.right+16;
    }
    entry.selected = selected;
    edges(entry);
  }
  function remove(entry) {
    entry.picker?.remove(); entry.resize?.disconnect();
    entry.level.removeEventListener('scroll',entry.scroll);
    entry.level.removeAttribute('data-more-left'); entry.level.removeAttribute('data-more-right');
    entries.delete(entry.strip);
  }
  function refresh(reveal = false) {
    for (const entry of entries.values()) if (!entry.strip.isConnected || !entry.strip.contains(entry.list)) remove(entry);
    document.querySelectorAll('.RadTabStrip,.RadTabStripVertical').forEach(strip => {
      if (entries.has(strip)) return;
      const level = strip.querySelector(':scope > .rtsLevel');
      const list = level?.querySelector(':scope > .rtsUL[role="tablist"]');
      if (!list) return;
      const entry = {strip,level,list,tabs:[],buttons:[]};
      entries.set(strip,entry);
      if (strip.classList.contains('RadTabStripVertical')) {
        const picker = document.createElement('details'); picker.className = 'us-tab-sections';
        const summary = document.createElement('summary'); summary.textContent = 'All sections';
        const options = document.createElement('div'); options.className = 'us-tab-section-options';
        picker.append(summary,options); strip.prepend(picker);
        Object.assign(entry,{picker,summary,options});
        picker.addEventListener('keydown',event => { if (event.key === 'Escape') {event.preventDefault();picker.open=false;summary.focus();} });
      }
      entry.scroll = () => edges(entry);
      level.addEventListener('scroll',entry.scroll,{passive:true});
      if (window.ResizeObserver) {entry.resize=new ResizeObserver(() => update(entry,true));entry.resize.observe(level);}
    });
    entries.forEach(entry => update(entry,reveal));
  }
  function schedule() {if (!queued) {queued=true;requestAnimationFrame(() => {queued=false;refresh();});}}
  function start() {
    refresh(true);
    new MutationObserver(records => {
      if (records.some(record => !record.target.closest?.('.us-tab-sections'))) schedule();
    }).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','aria-selected','aria-disabled','disabled']});
    document.addEventListener('click',event => entries.forEach(entry => {if(entry.picker && !entry.picker.contains(event.target)) entry.picker.open=false;}));
    window.addEventListener('resize',() => refresh(true));
    window.addEventListener('pageshow',() => refresh(true));
    if (window.Sys?.Application) window.Sys.Application.add_load(schedule);
  }
  window.UnionSuiteTabs = {version:'1.0',refresh:() => refresh(true)};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
/* US-NATIVE-TABS:END */

/* US-IQA-COLUMNS:START — single-table native grids; no query or sort replacement. */
(function () {
  'use strict';
  if (window.UnionSuiteIqaColumns) return;
  const entries = new Map(), widths = new Map(), observed = new Set();
  const resizeObserver = window.ResizeObserver ? new ResizeObserver(()=>schedule()) : null;
  const canvas = document.createElement('canvas');
  let queued = false, manager;
  function isId(title) { return /(^|[\s_-])ids?($|[\s_-])/i.test(title.trim()); }
  function rememberStyle(node) { return {node, value: node.getAttribute('style')}; }
  function restoreStyle(saved) { if(saved.value === null) saved.node.removeAttribute('style'); else saved.node.setAttribute('style',saved.value); }
  function dispose(entry) {
    entry.stop?.(); entry.resize?.disconnect();
    entry.handles.forEach(n=>n.remove());
    entry.marked.forEach(n=>n.removeAttribute('data-us-iqa-id-cell'));
    entry.saved.forEach(restoreStyle);
    entry.table.removeAttribute('data-us-iqa-column-table');
    entry.grid.removeAttribute('data-us-iqa-columns');
    entries.delete(entry.table);
  }
  function minWidth(cells) {
    const ctx=canvas.getContext('2d');
    return Math.ceil(Math.max(48,...cells.map(cell=>{
      const s=getComputedStyle(cell);ctx.font=s.font || `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
      let text=cell.textContent.replace(/\s+/g,' ').trim();
      if(s.textTransform==='uppercase')text=text.toUpperCase();
      return ctx.measureText(text).width + Math.max(0,text.length-1)*(parseFloat(s.letterSpacing)||0) + (parseFloat(s.paddingLeft)||0) + (parseFloat(s.paddingRight)||0) + 4;
    })));
  }
  function apply(entry) {
    const rows=Array.from(entry.table.tBodies).flatMap(body=>Array.from(body.rows)).filter(row=>row.matches('.rgRow,.rgAltRow')&&row.cells.length===entry.headers.length&&Array.from(row.cells).every(c=>c.colSpan===1&&c.rowSpan===1));
    entry.headers.forEach((head,i)=>{
      // Keep native indexes: hidden columns still have header/cell/col nodes.
      if(!entry.resizable[i])return;
      const cells=[head,...rows.map(row=>row.cells[i]).filter(Boolean)];
      entry.minimum[i]=entry.ids[i]?minWidth(cells):48;
      if(entry.ids[i])cells.forEach(cell=>{if(!entry.marked.has(cell)){entry.marked.add(cell);cell.setAttribute('data-us-iqa-id-cell','');}});
      entry.values[i]=Math.max(entry.values[i],entry.minimum[i]);
      head.style.width=entry.values[i]+'px';
      if(entry.cols[i])entry.cols[i].style.width=entry.values[i]+'px';
      entry.handles[i].setAttribute('aria-valuenow',String(Math.round(entry.values[i])));
      entry.handles[i].setAttribute('aria-valuemin',String(entry.minimum[i]));
    });
    const total=entry.values.reduce((sum,value,i)=>sum+(entry.visible[i]?value:0),0);
    entry.table.style.tableLayout='fixed';entry.table.style.width=total+'px';entry.table.style.minWidth=total+'px';
  }
  function attach(table,grid) {
    const heads=Array.from(table.tHead?.rows||[]);
    if(heads.length!==1)return;
    const headers=Array.from(heads[0].cells);
    if(!headers.length||headers.some(h=>h.colSpan!==1||h.rowSpan!==1))return;
    const visible=headers.map(h=>h.getBoundingClientRect().width>0);
    // Expand/collapse is a native utility column: retain its measured slot and
    // native width, but do not add a resize target or a data-column minimum.
    const resizable=headers.map((head,i)=>visible[i]&&!head.classList.contains('rgExpandCol'));
    // A hidden column is normal native IQA markup; only defer an entirely hidden table.
    if(!visible.some(Boolean))return;
    const rows=Array.from(table.tBodies).flatMap(b=>Array.from(b.rows)).filter(r=>r.matches('.rgRow,.rgAltRow'));
    if(rows.some(r=>r.cells.length!==headers.length||Array.from(r.cells).some(c=>c.colSpan!==1||c.rowSpan!==1)))return;
    const cols=Array.from(table.querySelectorAll(':scope > colgroup > col'));
    if(cols.length && (cols.length!==headers.length||cols.some(c=>c.span!==1)))return;
    // Leave a Telerik-native resize implementation in control when already present.
    if(grid.querySelector('.rgResizeCol')||grid.querySelector('[class*="rgResizeHandle"]'))return;
    const labels=headers.map(h=>h.textContent.replace(/\s+/g,' ').trim());
    const query=grid.closest('[data-us-iqa-native],.us-report,.SearchContactsClass')?.querySelector('select[id$="_querySelectDropdown"]')?.value||'';
    const key=(table.id||grid.id)+'|'+query+'|'+labels.join('|');
    const cached=widths.get(key);
    const entry={table,grid,headers,cols,key,visible,resizable,ids:labels.map((label,i)=>resizable[i]&&isId(label)),values:headers.map((head,i)=>resizable[i]&&cached?.[i]!=null?cached[i]:head.getBoundingClientRect().width),minimum:[],handles:[],marked:new Set(),saved:[rememberStyle(table),...headers.filter((h,i)=>resizable[i]).map(rememberStyle),...cols.filter((c,i)=>resizable[i]).map(rememberStyle)]};
    entries.set(table,entry);table.setAttribute('data-us-iqa-column-table','');grid.setAttribute('data-us-iqa-columns','');
    headers.forEach((head,i)=>{
      if(!resizable[i])return;
      const handle=document.createElement('span');handle.className='us-iqa-column-resizer';handle.tabIndex=0;
      handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-label','Resize '+labels[i]+' column');
      handle.title='Drag to resize; Left/Right arrows adjust width; Home fits content';
      const guide=()=>handle.style.setProperty('--us-resize-guide-height',Math.max(head.offsetHeight,table.getBoundingClientRect().bottom-head.getBoundingClientRect().top)+'px');
      handle.addEventListener('pointerenter',guide);handle.addEventListener('focus',guide);
      const change=value=>{entry.values[i]=Math.max(entry.minimum[i],value);apply(entry);widths.set(key,entry.values.slice());};
      handle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
      handle.addEventListener('keydown',e=>{
        if(!['ArrowLeft','ArrowRight','Home'].includes(e.key))return;e.preventDefault();e.stopPropagation();
        const rtl=getComputedStyle(table).direction==='rtl'?-1:1;
        const currentCells=Array.from(table.tBodies).flatMap(b=>Array.from(b.rows)).filter(r=>r.matches('.rgRow,.rgAltRow')&&r.cells.length===headers.length).map(r=>r.cells[i]);
        change(e.key==='Home'?minWidth([head,...currentCells]):entry.values[i]+(e.key==='ArrowRight'?1:-1)*rtl*(e.shiftKey?40:10));
      });
      handle.addEventListener('pointerdown',e=>{
        if(e.button!==0)return;e.preventDefault();e.stopPropagation();entry.stop?.();
        const start=e.clientX,initial=entry.values[i],rtl=getComputedStyle(table).direction==='rtl'?-1:1;
        guide();handle.setAttribute('data-us-resizing','');handle.setPointerCapture(e.pointerId);
        const move=event=>change(initial+(event.clientX-start)*rtl);
        const stop=()=>{handle.removeAttribute('data-us-resizing');handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',stop);handle.removeEventListener('pointercancel',stop);handle.removeEventListener('lostpointercapture',stop);if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);entry.stop=null;};
        entry.stop=stop;handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',stop);handle.addEventListener('pointercancel',stop);handle.addEventListener('lostpointercapture',stop);
      });
      head.appendChild(handle);entry.handles[i]=handle;
    });
    apply(entry);
  }
  function refresh() {
    queued=false;
    for(const grid of observed){if(!grid.isConnected){resizeObserver.unobserve(grid);observed.delete(grid);}}
    for(const entry of entries.values()){
      if(!entry.table.isConnected||entry.table.closest('.us-report-no-styling'))dispose(entry);else apply(entry);
    }
    document.querySelectorAll(':is([data-us-iqa-native],.us-report,.SearchContactsClass):not(.us-report-no-styling) [data-gridid] .RadGrid > table.rgMasterTable').forEach(table=>{
      if(resizeObserver&&!observed.has(table.parentElement)){observed.add(table.parentElement);resizeObserver.observe(table.parentElement);}
      if(!entries.has(table)&&!table.closest('.us-report-no-styling'))attach(table,table.parentElement);
    });
    const next=window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
    if(next&&next!==manager){manager=next;manager.add_pageLoading?.(()=>Array.from(entries.values()).forEach(dispose));manager.add_endRequest(schedule);}
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(refresh);}}
  window.UnionSuiteIqaColumns={version:'1.2',refresh:schedule,isIdColumn:isId};
  function start(){schedule();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});document.fonts?.ready.then(schedule);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('resize',schedule);window.addEventListener('pageshow',schedule);
})();
/* US-IQA-COLUMNS:END */

/* US-DATA-PANELS:START — decorate original controls; never replace native handlers. */
(function(){
 if(window.UnionSuiteDataPanels)return;
 function refresh(){
  document.querySelectorAll('.PanelEditorReadOnlyForm,.PanelEditorEditForm,[id$="_multipleInstancePanel"]').forEach(form=>{
   const panel=form.closest('.panel'),root=panel?.parentElement;
   // Panel Editor may add an author-class wrapper (including class="")
   // inside ContentItemContainer. Mark the panel's immediate owner so shared
   // direct-child card selectors work for both shapes.
   if(!root||!root.closest('.ContentItemContainer')||root.closest('.us-report-no-styling'))return;
   const kind=panel.querySelector('[id$="_multipleInstancePanel"]')?'multiple':'single';
   if(root.dataset.usPanel!==kind)root.dataset.usPanel=kind;
   panel.querySelectorAll('.GridTitlePanel').forEach(toolbar=>{
    const empty=!toolbar.textContent.trim()&&!toolbar.querySelector('a,button,input:not([type=hidden]),select,img,svg');
    if(empty&&!toolbar.hasAttribute('data-us-panel-empty-toolbar'))toolbar.setAttribute('data-us-panel-empty-toolbar','');
    else if(!empty)toolbar.removeAttribute('data-us-panel-empty-toolbar');
   });
   const mark=(el,action)=>{if(el.dataset.usPanelAction!==action)el.dataset.usPanelAction=action;if(!el.getAttribute('aria-label')&&el.title)el.setAttribute('aria-label',el.title)};
   panel.querySelectorAll('.panel-heading-options .sysicon-panel-config').forEach(el=>mark(el,'settings'));
   panel.querySelectorAll('.panel-heading-options .sysicon-edit').forEach(el=>mark(el,'edit'));
   panel.querySelectorAll('.panel-heading-options .sysicon-add').forEach(el=>mark(el,'add'));
   panel.querySelectorAll('[id$="_multipleInstancePanel"] a.ImgNoResize:has(img[src$="icon_edit.png"])').forEach(el=>mark(el,'edit'));
   panel.querySelectorAll('[id$="_multipleInstancePanel"] input[type=image][id$="_gbcDeleteColumn"]').forEach(input=>{
    if(input.parentElement.dataset.usPanelAction==='delete')return;
    const wrap=document.createElement('span');wrap.dataset.usPanelAction='delete';input.before(wrap);wrap.append(input);
   });
  });
 }
 let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh()})}
 function start(){refresh();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})}
 window.UnionSuiteDataPanels={version:'1.1',refresh};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
/* US-DATA-PANELS:END */

/* US-ACTION-MENUS:START — approved option 5; explicit actions, no evaluated HTML. */
(function(){
 'use strict';
 if(window.UnionSuiteActionMenus)return;
 const roots=new Map(),toggles=new WeakMap();
 const candidates='.us-actions,.BigButtonLinkList:has(> .BigButtonList),#MemberQuickActions:has(> .dropdown-menu),.CaseActions.dropdown:has(> .dropdown-menu),.actions-wrap:has(> .actions-menu),.us-banner details.us-banner__action-menu';
 const excluded=el=>!!el.closest('.us-report-no-styling,[data-us-actions-ignore]');
 const disabled=el=>!!el.closest(':disabled,[disabled],.disabled,.aspNetDisabled,[aria-disabled="true"],.hidden,[hidden],[inert]');
 const narrow=()=>matchMedia('(max-width:950px)').matches||matchMedia('(pointer:coarse)').matches;
 const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
 const zero={height:'0px',paddingTop:'0px',paddingBottom:'0px',marginTop:'0px',marginBottom:'0px',borderTopWidth:'0px',borderBottomWidth:'0px'};
 let uid=0,status;
 function dimensions(el){const s=getComputedStyle(el);return {height:el.getBoundingClientRect().height+'px',paddingTop:s.paddingTop,paddingBottom:s.paddingBottom,marginTop:s.marginTop,marginBottom:s.marginBottom,borderTopWidth:s.borderTopWidth,borderBottomWidth:s.borderBottomWidth}}
 function duration(root){const value=parseFloat(getComputedStyle(root).getPropertyValue('--us-actions-duration'));return Number.isFinite(value)?Math.max(0,value):400}
 function place(state){
  const {panel,trigger,child,owner}=state;
  panel.classList.toggle('us-actions__inline',child&&narrow());
  if(child&&narrow()){['left','top','width','max-height'].forEach(p=>panel.style.removeProperty(p));return}
  const r=trigger.getBoundingClientRect(),w=Math.min(288,window.innerWidth-24);
  panel.style.width=w+'px';panel.style.maxHeight=Math.max(60,window.innerHeight-24)+'px';
  let x=child?r.right-2:r.right-w,y=r.bottom+8;
  if(child){if(x+w>window.innerWidth-12)x=r.left-w+2;y=r.top}
  else if(y+Math.min(panel.scrollHeight,180)>window.innerHeight-12&&r.top>window.innerHeight-r.bottom){y=Math.max(12,r.top-8-Math.min(panel.scrollHeight,window.innerHeight-24));}
  panel.style.left=Math.max(12,Math.min(x,window.innerWidth-w-12))+'px';
  panel.style.top=Math.max(12,Math.min(y,window.innerHeight-72))+'px';
  panel.style.maxHeight=Math.max(48,window.innerHeight-parseFloat(panel.style.top)-12)+'px';
 }
 function setOpen(state,open,{instant=false,focus=false}={}){
  const {panel,trigger,owner,child}=state;
  if(!owner.root.isConnected)return;
  if(state.open===open&&!state.animation)return;
  const from=panel.hidden?zero:dimensions(panel);
  state.animation?.cancel();state.animation=null;state.open=open;
  trigger.setAttribute('aria-expanded',String(open));panel.inert=!open;
  if(!open&&(focus||panel.contains(document.activeElement)))trigger.focus({preventScroll:true});
  if(open){
   if(!child){for(const item of roots.values())if(item!==owner)setOpen(item.main,false,{instant:true});}
   else for(const other of owner.children)if(other!==state&&other.parent===state.parent)setOpen(other,false,{instant:true});
   if(owner.details)owner.root.open=true;
   panel.classList.remove('us-actions__drawing','us-actions__closing');panel.hidden=false;place(state);
  }else{
   panel.classList.add('us-actions__closing');
   if(!child)for(const item of owner.children)setOpen(item,false,{instant:true});
   else for(const item of owner.children)if(item!==state&&panel.contains(item.trigger))setOpen(item,false,{instant:true});
  }
  const to=open?dimensions(panel):zero;
  const animate=!instant&&!reduced()&&typeof panel.animate==='function';
  if(open&&child&&narrow()&&animate){
   panel.style.setProperty('--us-actions-line-height',Math.max(0,panel.getBoundingClientRect().height-8)+'px');
   void panel.offsetHeight;panel.classList.add('us-actions__drawing');
  }
  function finish(){
   state.animation=null;panel.classList.remove('us-actions__moving');
   if(!state.open){panel.hidden=true;panel.classList.remove('us-actions__closing','us-actions__drawing');if(!child&&owner.details)owner.root.open=false;}
   else if(focus)panel.querySelector('a[href]:not([aria-disabled="true"]),button:not(:disabled)')?.focus({preventScroll:true});
  }
  if(!animate){finish();return}
  panel.classList.add('us-actions__moving');
  const frames=child&&!narrow()?[{opacity:open?0:1},{opacity:open?1:0}]:[from,to];
  state.animation=panel.animate(frames,{duration:duration(owner.root),easing:'cubic-bezier(.22,1,.36,1)'});
  state.animation.onfinish=finish;
 }
 function stateFor(owner,trigger,panel,child=false,parent=null){
  if(!panel.id)panel.id='us-actions-list-'+(++uid);
  trigger.setAttribute('aria-controls',panel.id);trigger.setAttribute('aria-expanded','false');
  trigger.classList.add(child?'us-actions__subtoggle':'us-actions__toggle');
  panel.classList.add('us-actions__list');if(child){panel.classList.add('us-actions__sublist');const glint=document.createElement('span');glint.className='us-actions__glint';glint.setAttribute('aria-hidden','true');panel.append(glint)}
  panel.hidden=true;panel.inert=true;
  const state={owner,trigger,panel,child,parent,open:false,animation:null};toggles.set(trigger,state);return state;
 }
 function decorate(owner){
  const {root}=owner;
  owner.children=owner.children.filter(state=>{if(root.contains(state.trigger)&&root.contains(state.panel))return true;state.animation?.cancel();toggles.delete(state.trigger);return false});
  root.querySelectorAll('.dropdown-header,.actions-menu-label,.us-banner__menu-label').forEach(el=>el.classList.add('us-actions__heading'));
  root.querySelectorAll('.divider,.dropdown-divider').forEach(el=>el.classList.add('us-actions__separator'));
  root.querySelectorAll('.actions-menu-section,.us-banner__menu-group').forEach(el=>el.classList.add('us-actions__group'));
  root.querySelectorAll('.us-actions__branch').forEach(branch=>{
   const trigger=branch.querySelector(':scope > button'),panel=branch.querySelector(':scope > .us-actions__list');
   if(trigger&&panel&&!toggles.has(trigger)){const parent=owner.children.find(s=>s.panel.contains(branch))||owner.main;owner.children.push(stateFor(owner,trigger,panel,true,parent))}
  });
  owner.main.panel.querySelectorAll('a,button').forEach(el=>{
   if(!toggles.has(el))el.classList.add('us-actions__item');

  });
 }
 function refresh(){
  for(const [root,owner] of roots){
   if(!root.isConnected||!root.contains(owner.main.panel)||excluded(root)){

    for(const s of [owner.main,...owner.children]){s.animation?.cancel();toggles.delete(s.trigger);s.panel.inert=false;if(s.child)s.panel.hidden=true;else s.panel.hidden=false;s.panel.classList.remove('us-actions__moving')}
    root.removeAttribute('data-us-actions-ready');roots.delete(root);
   }
  }
  document.querySelectorAll(candidates).forEach(root=>{
   if(excluded(root))return;
   if(roots.has(root)){decorate(roots.get(root));return}
   const trigger=root.querySelector(':scope > .us-actions__toggle,:scope > summary,:scope > button');
   const panel=root.querySelector(':scope > .us-actions__list,:scope > .dropdown-menu,:scope > .actions-menu,:scope > .us-banner__menu-panel');
   if(!trigger||!panel)return;
   const owner={root,details:root.tagName==='DETAILS',main:null,children:[]};
   root.classList.add('us-actions');root.setAttribute('data-us-actions-ready','');
   // The adapter now owns only disclosure. Original item links and commands remain intact.
   root.classList.remove('open');panel.classList.remove('open');trigger.classList.remove('open');if(owner.details)root.open=false;
   owner.main=stateFor(owner,trigger,panel);roots.set(root,owner);decorate(owner);
  });
 }
 function ownerFor(el){const root=el.closest('[data-us-actions-ready]');return roots.get(root)}
 document.addEventListener('click',event=>{
  const el=event.target.closest?.('button,summary,a');if(!el)return;
  const owner=ownerFor(el);if(!owner)return;
  const state=toggles.get(el);
  if(state){event.preventDefault();event.stopImmediatePropagation();if(!disabled(el))setOpen(state,!state.open);return}
  if(disabled(el)){event.preventDefault();event.stopImmediatePropagation();return}
  // Let native item handlers/postbacks/navigation run; never synthesize their click.
  queueMicrotask(()=>{if(!event.defaultPrevented)setOpen(owner.main,false,{instant:true,focus:false})});
 },true);
 document.addEventListener('keydown',event=>{
  const el=event.target,owner=ownerFor(el);if(!owner)return;
  const state=toggles.get(el);
  if(event.key==='ArrowRight'&&state?.child&&!disabled(el)){event.preventDefault();setOpen(state,true,{focus:true});return}
  if(event.key==='Escape'||event.key==='ArrowLeft'){
   const branch=[...owner.children].reverse().find(s=>s.open&&(s.panel.contains(el)||s.trigger===el));
   if(branch){event.preventDefault();event.stopPropagation();setOpen(branch,false,{focus:true});}
   else if(event.key==='Escape'&&owner.main.open){event.preventDefault();event.stopPropagation();setOpen(owner.main,false,{focus:true});}
  }
 });
 document.addEventListener('pointerdown',event=>{for(const owner of roots.values())if(!owner.root.contains(event.target))setOpen(owner.main,false)},true);
 document.addEventListener('focusin',event=>{for(const owner of roots.values())if(!owner.root.contains(event.target))setOpen(owner.main,false,{instant:true})});
 document.addEventListener('toggle',event=>{const owner=roots.get(event.target);if(owner?.details&&!owner.root.open&&owner.main.open)setOpen(owner.main,false,{instant:true})},true);
 function reset(){for(const owner of roots.values())setOpen(owner.main,false,{instant:true})}
 window.addEventListener('resize',reset);window.addEventListener('pagehide',reset);
 window.addEventListener('scroll',event=>{
  for(const owner of roots.values()){
   if(!owner.main.open)continue;
   if(event.target===document||event.target===window||!owner.root.contains(event.target))setOpen(owner.main,false,{instant:true});
   else if(!narrow())for(const child of owner.children)if(!child.panel.contains(event.target))setOpen(child,false,{instant:true});
  }
 },true);
 let scheduled=false;
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh()})}
 function start(){refresh();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})}
 window.UnionSuiteActionMenus={version:'2.0',refresh,closeFor(element){const owner=ownerFor(element);if(owner)setOpen(owner.main,false,{instant:true,focus:true})}};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
/* US-ACTION-MENUS:END */
/* US-DIALOG-PAGE:START — marks only an explicitly requested iMIS popup document. */
(function(){
 'use strict';
 const popup=new URLSearchParams(window.location.search).get('IsPopup');
 if(popup&&popup.toLowerCase()==='true')document.documentElement.setAttribute('data-us-dialog-page','');
})();
/* US-DIALOG-PAGE:END */

/* US-TAB-BUSY:START — native requests, with a delayed inline indicator. */
(function () {
  if (window.UnionSuiteTabBusy) return;
  const selector = '.RadTabStrip .rtsLink[role="tab"],.RadTabStripVertical .rtsLink[role="tab"]';
  let active = null, pendingTab = null, pendingTimer = null, manager = null, application = null;
  function strip(tab) { return tab?.closest('.RadTabStrip,.RadTabStripVertical'); }
  function eligible(tab) {
    return tab?.matches?.(selector) && !tab.closest('.us-report-no-styling,[aria-disabled="true"],.rtsDisabled');
  }
  function clear() { active?.clear(); active = null; }
  function show(tab) {
    clear();
    if (!eligible(tab) || !tab.isConnected) return null;
    const previousBusy = tab.getAttribute('aria-busy');
    const previousMarker = tab.hasAttribute('data-us-tab-loading');
    const spinner = document.createElement('span');
    spinner.className = 'us-tab-loading-spinner'; spinner.setAttribute('aria-hidden', 'true');
    const status = document.createElement('span');
    status.className = 'us-iqa-refresh-status'; status.setAttribute('role', 'status');
    const label = tab.querySelector('.rtsTxt')?.textContent.trim() || 'section';
    let finished = false;
    tab.setAttribute('aria-busy', 'true');
    const timer = setTimeout(() => {
      if (!tab.isConnected) { handle.clear(); return; }
      tab.setAttribute('data-us-tab-loading', ''); tab.append(spinner);
      document.body.append(status); status.textContent = 'Loading ' + label;
    }, 150);
    const observer = new MutationObserver(() => { if (!tab.isConnected) handle.clear(); });
    observer.observe(document.body, {childList:true,subtree:true});
    const handle = { clear() {
      if (finished) return;
      finished = true; clearTimeout(timer); observer.disconnect(); spinner.remove(); status.remove();
      if (previousBusy === null) tab.removeAttribute('aria-busy'); else tab.setAttribute('aria-busy', previousBusy);
      if (!previousMarker) tab.removeAttribute('data-us-tab-loading');
      if (active === handle) active = null;
    }};
    active = handle;
    return handle;
  }
  function resolveTab(source) {
    if (eligible(source)) return source;
    if (pendingTab && source && strip(pendingTab) === (strip(source) || source)) return pendingTab;
    return null;
  }
  function begin(sender, args) {
    const tab = resolveTab(args.get_postBackElement?.());
    pendingTab = null; clearTimeout(pendingTimer); clear();
    if (tab) show(tab);
  }
  document.addEventListener('click', event => {
    const tab = event.target.closest?.(selector);
    pendingTab = eligible(tab) ? tab : null;
    clearTimeout(pendingTimer);
    if (!pendingTab) return;
    pendingTimer = setTimeout(() => { pendingTab = null; }, 1000);
    // Native __doPostBack can submit a whole document without a submit event.
    const form = tab.closest('form');
    if (!form || typeof form.submit !== 'function') return;
    const original = form.submit, own = Object.getOwnPropertyDescriptor(form, 'submit');
    const wrapped = function () {
      const result = original.apply(this, arguments);
      if (this === form && tab.isConnected) show(tab);
      return result;
    };
    try { form.submit = wrapped; } catch { return; }
    setTimeout(() => {
      if (form.submit === wrapped) { if (own) Object.defineProperty(form, 'submit', own); else delete form.submit; }
    }, 0);
  }, true);
  document.addEventListener('submit', event => {
    const tab = pendingTab;
    if (tab?.closest('form') !== event.target) return;
    setTimeout(() => { if (!event.defaultPrevented) show(tab); }, 0);
  }, true);
  function attach() {
    const next = window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
    if (next && manager !== next) {
      manager?.remove_beginRequest(begin); manager?.remove_endRequest(clear);
      clear(); manager = next; manager.add_beginRequest(begin); manager.add_endRequest(clear);
    }
    const app = window.Sys?.Application;
    if (app && app !== application) { application?.remove_load?.(attach); application = app; app.add_load(attach); }
  }
  window.UnionSuiteTabBusy = {version:'1.0', refresh:attach, show};
  attach(); document.addEventListener('DOMContentLoaded',attach,{once:true});
  window.addEventListener('load',attach,{once:true});
  for (const name of ['pagehide','pageshow']) window.addEventListener(name, () => {
    pendingTab = null; clearTimeout(pendingTimer); clear();
  });
})();
/* US-TAB-BUSY:END *//* US-CCO-STICKY-TABS:START */
(function(){
 'use strict';
 if(window.UnionSuiteStickyTabs){window.UnionSuiteStickyTabs.refresh();return}
 const active=new Set(),observed=new Set();let queued=false;
 const resize=new ResizeObserver(schedule);
 function clear(strip){strip.removeAttribute('data-us-cco-sticky');strip.style.removeProperty('--us-cco-sticky-top');strip.style.removeProperty('--us-cco-sticky-height');active.delete(strip)}
 function update(){
  const targets=new Set(),next=new Set();
  const desktop=window.matchMedia('(min-width:601px)').matches;
  const easy=window.gIsEasyEditEnabled===true||document.body.classList.contains('TemplateAreaEasyEditOn');
  if(desktop&&!easy)document.querySelectorAll('.us-cco-sticky-tabs').forEach(owner=>{
   if(owner.closest('.us-report-no-styling'))return;
   const containers=[...(owner.matches('.cco.tabs-wrapper.tabs-vertical')?[owner]:owner.querySelectorAll('.cco.tabs-wrapper.tabs-vertical'))];
   containers.filter(cco=>cco.closest('.us-cco-sticky-tabs')===owner&&!containers.some(other=>other!==cco&&other.contains(cco))).forEach(cco=>{
    const strip=cco.querySelector(':scope > .RadTabStripVertical');
    if(!strip||!strip.querySelector(':scope > .rtsLevel')||!strip.getClientRects().length)return;
    const rect=strip.getBoundingClientRect();let bottom=0;
    // Only actual top chrome overlapping this rail contributes to its offset.
    document.querySelectorAll('#hd,#injected-taskbar,.us-banner--pinned .us-banner__surface').forEach(chrome=>{
     if(!chrome.getClientRects().length)return;targets.add(chrome);
     const r=chrome.getBoundingClientRect(),position=getComputedStyle(chrome).position;
     const pinned=chrome.matches('.us-banner--pinned .us-banner__surface');
     if(r.right<=rect.left||r.left>=rect.right||r.bottom<=0)return;
     if(pinned||position==='fixed'||(position==='sticky'&&r.top<=parseFloat(getComputedStyle(chrome).top)+1)||r.top<=1)bottom=Math.max(bottom,r.bottom);
    });
    const extra=parseFloat(getComputedStyle(owner).getPropertyValue('--us-cco-sticky-offset'))||0;
    const top=Math.max(0,bottom+extra)+8,available=window.innerHeight-top-8;
    if(available<100)return;
    strip.setAttribute('data-us-cco-sticky','');
    strip.style.setProperty('--us-cco-sticky-top',Math.round(top)+'px');
    strip.style.setProperty('--us-cco-sticky-height',Math.floor(available)+'px');
    targets.add(cco);next.add(strip);active.add(strip);
   });
  });
  [...active].forEach(strip=>{if(!next.has(strip))clear(strip)});
  observed.forEach(node=>{if(!targets.has(node)){resize.unobserve(node);observed.delete(node)}});
  targets.forEach(node=>{if(!observed.has(node)){observed.add(node);resize.observe(node)}});
 }
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;update()})}
 function start(){schedule();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']})}
 window.UnionSuiteStickyTabs={refresh:schedule};
 window.addEventListener('scroll',schedule,{passive:true,capture:true});window.addEventListener('resize',schedule);window.addEventListener('pageshow',schedule);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
/* US-CCO-STICKY-TABS:END */

/* US-SECTION-SWITCHER:START */
(function(){
 'use strict';
 if(window.UnionSuiteSections)return;
 const selector='[data-us-tabs][data-us-tab-adapter="page-sections"]',states=new Map(),memory=new Map();
 let serial=0,pending=false,context=location.pathname;
 const indicators=new Map(),animatedLists=new Set();let indicatorFrame=0;
 function scheduleIndicators(list){
  if(list)animatedLists.add(list);
  if(indicatorFrame)return;
  indicatorFrame=requestAnimationFrame(()=>{indicatorFrame=0;syncIndicators();animatedLists.clear();});
 }
 function syncIndicators(){
  const connected=new Map();
  states.forEach(s=>{const list=s.buttons[0].parentElement;if(list.matches('.us-section-tabs')&&list.isConnected&&!list.closest('.us-report-no-styling'))connected.set(list,s);});
  indicators.forEach((p,list)=>{if(!connected.has(list)){p.observer?.disconnect();p.restore();indicators.delete(list);}});
  connected.forEach((s,list)=>{
   let p=indicators.get(list);
   if(!p){
    const restoreAttribute=snapshot(list,['data-us-section-indicator']);
    const styles=['--us-section-indicator-x','--us-section-indicator-y'].map(name=>[name,list.style.getPropertyValue(name),list.style.getPropertyPriority(name)]);
    p={buttons:[],visible:false,observer:typeof ResizeObserver==='function'?new ResizeObserver(()=>scheduleIndicators()):null,restore(){restoreAttribute();styles.forEach(([name,value,priority])=>value?list.style.setProperty(name,value,priority):list.style.removeProperty(name));}};
    indicators.set(list,p);
   }
   if(p.buttons.length!==s.buttons.length||p.buttons.some((button,i)=>button!==s.buttons[i])){
    p.observer?.disconnect();p.buttons=s.buttons.slice();p.observer?.observe(list);p.buttons.forEach(button=>p.observer?.observe(button));
   }
   const button=s.buttons[s.keys.indexOf(s.key)];
   if(!list.getClientRects().length||!button?.offsetWidth){list.removeAttribute('data-us-section-indicator');p.visible=false;return;}
   // The positioned list owns these offsets, so the marker scrolls with its
   // buttons in either direction. No viewport/scroll offsets or polling needed.
   const x=button.offsetLeft+(button.offsetWidth-20)/2,y=button.offsetTop+button.offsetHeight-5;
   if(p.visible&&p.x===x&&p.y===y)return;
   list.setAttribute('data-us-section-indicator',p.visible&&animatedLists.has(list)?'animate':'still');
   list.style.setProperty('--us-section-indicator-x',x+'px');list.style.setProperty('--us-section-indicator-y',y+'px');
   p.x=x;p.y=y;p.visible=true;
  });
 }
 const layoutUndo=[];
 function restoreLayout(){layoutUndo.splice(0).reverse().forEach(fn=>fn());}
 function collapseLayout(){
  restoreLayout();
  const owners=new Set();
  states.forEach(s=>s.panels.forEach(p=>{let n=p.node.parentElement;while(n&&n!==document.body){owners.add(n);n=n.parentElement;}}));
  const depth=n=>{let d=0;while(n.parentElement){d++;n=n.parentElement;}return d;};
  [...owners].sort((a,b)=>depth(b)-depth(a)).forEach(n=>{
   if(!n.matches('.ContentItemContainer,.iMIS-WebPart,.WebPartZone,.row,[class*="col-"]')||n.matches('.us-tab-panel')||n.closest('.us-report-no-styling')||n.hidden)return;
   const children=[...n.children].filter(c=>!c.matches('script,style,input[type="hidden"]'));
   if(!children.length||[...n.childNodes].some(c=>c.nodeType===3&&c.textContent.trim())||!children.every(c=>c.hasAttribute('data-us-section-hidden')||c.hasAttribute('data-us-section-layout-hidden')))return;
   layoutUndo.push(snapshot(n,['hidden','data-us-section-layout-hidden']));n.hidden=true;n.setAttribute('data-us-section-layout-hidden','');
  });
 }
 const valid=s=>/^[a-z][a-z0-9-]*$/.test(s||'');
 function snapshot(node,attrs){const values=attrs.map(a=>[a,node.getAttribute(a)]);return ()=>values.forEach(([a,v])=>v===null?node.removeAttribute(a):node.setAttribute(a,v));}
 function release(){restoreLayout();states.forEach(s=>s.undo.reverse().forEach(fn=>fn()));states.clear();}
 function select(s,key,notify){
  if(!s.keys.includes(key))return false;
  const active=s.buttons[s.keys.indexOf(key)];
  s.panels.forEach(({node,key:k})=>{const hide=k!==key;if(hide&&node.contains(document.activeElement))active.focus({preventScroll:true});node.hidden=hide;node.toggleAttribute('data-us-section-hidden',hide);});
  s.buttons.forEach((button,i)=>{const on=s.keys[i]===key;button.classList.toggle('is-active',on);button.setAttribute('aria-selected',String(on));button.tabIndex=on?0:-1;});
  s.key=key;memory.set(s.group,key);
  collapseLayout();
  scheduleIndicators(notify?active.parentElement:null);
  if(notify)s.menu.dispatchEvent(new CustomEvent('us:sectionchange',{bubbles:true,detail:{group:s.group,key,panels:s.panels.filter(p=>p.key===key).map(p=>p.node)}}));
  return true;
 }
 function refresh(){
  release();
  scheduleIndicators();
  // CCO selection uses pushState query parameters within the same page.
  if(context!==location.pathname){context=location.pathname;memory.clear();}
  if(document.querySelector('.ste-toggle.on')||document.body.classList.contains('EasyEdit'))return;
  const menus=[...document.querySelectorAll(selector)];
  for(const menu of menus){
   const group=menu.dataset.usTabs;
   if(!valid(group)||menus.filter(n=>n.dataset.usTabs===group).length!==1||menu.closest('.us-report-no-styling'))continue;
   const buttons=[...menu.querySelectorAll('button[data-us-tab]')].filter(n=>n.closest(selector)===menu);
   const keys=buttons.map(n=>n.dataset.usTab);
   if(!keys.length||keys.some(k=>!valid(k))||new Set(keys).size!==keys.length||buttons.some(n=>n.disabled||n.hidden||n.getAttribute('aria-disabled')==='true'))continue;
   const list=buttons[0].parentElement;
   if(buttons.some(n=>n.parentElement!==list))continue;
   const nodes=[...document.querySelectorAll('.us-tab-panel.us-tabset-'+group)];
   const panels=nodes.map(node=>({node,key:[...node.classList].filter(c=>c.startsWith('us-tab-')&&c!=='us-tab-panel').map(c=>c.slice(7))}));
   if(!panels.length||panels.some(p=>p.key.length!==1||!keys.includes(p.key[0])||p.node.hidden||p.node.contains(menu)||p.node.matches('.RadMultiPage,.rmpView')||p.node.closest('.us-report-no-styling'))||keys.some(k=>!panels.some(p=>p.key[0]===k)))continue;
   panels.forEach(p=>p.key=p.key[0]);
   // Overlapping owners cannot safely be hidden independently.
   if(panels.some(p=>panels.some(q=>p!==q&&p.node.contains(q.node))))continue;
   const undo=[snapshot(list,['role','aria-label'])],s={menu,group,buttons,keys,panels,undo};
   list.setAttribute('role','tablist');if(!list.hasAttribute('aria-label'))list.setAttribute('aria-label','Page sections');
   panels.forEach(p=>{undo.push(snapshot(p.node,['id','role','aria-labelledby','tabindex','hidden','data-us-section-hidden']));if(!p.node.id)p.node.id='us-section-panel-'+(++serial);p.node.setAttribute('role','tabpanel');p.node.tabIndex=0;});
   buttons.forEach((button,i)=>{undo.push(snapshot(button,['id','role','aria-selected','aria-controls','tabindex','aria-current']));const was=button.classList.contains('is-active');undo.push(()=>button.classList.toggle('is-active',was));if(!button.id)button.id='us-section-tab-'+(++serial);button.setAttribute('role','tab');button.removeAttribute('aria-current');button.setAttribute('aria-controls',panels.filter(p=>p.key===keys[i]).map(p=>p.node.id).join(' '));panels.filter(p=>p.key===keys[i]).forEach(p=>p.node.setAttribute('aria-labelledby',button.id));});
   states.set(menu,s);select(s,memory.get(group)||keys[buttons.findIndex(b=>b.classList.contains('is-active'))]||keys[0],false)||select(s,keys[0],false);
  }
 }
 function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;refresh();});}
 document.addEventListener('click',e=>{const button=e.target.closest('button[data-us-tab]'),s=button&&states.get(button.closest(selector));if(!s)return;e.preventDefault();select(s,button.dataset.usTab,true);});
 document.addEventListener('keydown',e=>{
  const button=e.target.closest('button[data-us-tab]'),s=button&&states.get(button.closest(selector));if(!s)return;
  const i=s.buttons.indexOf(button),rtl=getComputedStyle(button.parentElement).direction==='rtl';let next;
  if(e.key==='ArrowRight')next=(i+(rtl?-1:1)+s.keys.length)%s.keys.length;
  else if(e.key==='ArrowLeft')next=(i+(rtl?1:-1)+s.keys.length)%s.keys.length;
  else if(e.key==='Home')next=0;else if(e.key==='End')next=s.keys.length-1;else return;
  e.preventDefault();s.buttons.forEach((b,j)=>b.tabIndex=j===next?0:-1);s.buttons[next].focus({preventScroll:true});
  const target=s.buttons[next],list=target.parentElement,a=target.getBoundingClientRect(),r=list.getBoundingClientRect();if(a.left<r.left)list.scrollLeft+=a.left-r.left;else if(a.right>r.right)list.scrollLeft+=a.right-r.right;
 });
 window.UnionSuiteSections={refresh:schedule,select:(group,key)=>{const s=[...states.values()].find(s=>s.group===group);return s?select(s,key,true):false;}};
 function start(){refresh();window.addEventListener('resize',()=>scheduleIndicators());document.fonts?.ready.then(()=>scheduleIndicators());new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-us-tabs','data-us-tab','data-us-tab-adapter']});new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});document.querySelectorAll('.ste-toggle').forEach(n=>new MutationObserver(schedule).observe(n,{attributes:true,attributeFilter:['class']}));}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
/* US-SECTION-SWITCHER:END */

/* US-ATTENTION:START — read-only IQA folder counts for Content HTML. */
(function () {
  'use strict';
  if (window.UnionSuiteAttention) { window.UnionSuiteAttention.refresh(); return; }
  const selector = '.us-attention[data-us-iqa-folder]';
  const states = new Map();
  let scheduled = false;
  const unwrap = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;
  const values = value => {
    value = unwrap(value);
    const rows = value?.$values ?? value;
    if (!Array.isArray(rows)) throw Error('Unexpected collection returned by iMIS.');
    return rows;
  };
  const property = (row, name) => {
    row = unwrap(row);
    if (row?.[name] !== undefined) return unwrap(row[name]);
    const props = row?.Properties?.$values ?? row?.Properties;
    return Array.isArray(props) ? unwrap(props.find(p => p.Name === name)?.Value) : undefined;
  };
  const guid = value => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value) && !/^0{8}(?:-0{4}){3}-0{12}$/.test(value);
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function apiRoot() {
    if (!window.gWebRoot) return '/api/';
    const root = new URL(String(window.gWebRoot || '/'), window.location.origin);
    if (root.origin !== window.location.origin || root.search || root.hash) throw Error('Invalid iMIS web root.');
    return root.pathname.replace(/\/+$/, '') + '/api/';
  }
  async function request(path, body, parentSignal) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    parentSignal.addEventListener('abort', abort, {once:true});
    if (parentSignal.aborted) controller.abort();
    const timer = setTimeout(abort, 20000);
    try {
      const token = document.querySelector('input[name="__RequestVerificationToken"], input#__RequestVerificationToken')?.value;
      const response = await fetch(apiRoot() + path, {
        method:body ? 'POST' : 'GET', credentials:'same-origin', cache:'no-store', redirect:'error', signal:controller.signal,
        headers:{Accept:'application/json', ...(token ? {RequestVerificationToken:token} : {}), ...(body ? {'Content-Type':'application/json'} : {})},
        ...(body ? {body:JSON.stringify(body)} : {})
      });
      if (!response.ok) throw Error('iMIS request failed (HTTP ' + response.status + ').');
      const data = await response.json();
      if (!data || unwrap(data.IsSuccessStatusCode) === false || unwrap(data.IsValid) === false) throw Error('iMIS could not complete the query.');
      return data;
    } finally { clearTimeout(timer); parentSignal.removeEventListener('abort', abort); }
  }
  function execute(operation, parameters, types, signal) {
    return request('DocumentSummary/_execute', {
      $type:'Asi.Soa.Core.DataContracts.GenericExecuteRequest, Asi.Contracts', EntityTypeName:'DocumentSummary', OperationName:operation,
      Parameters:{$type:'System.Collections.ObjectModel.Collection`1[[System.Object, mscorlib]], mscorlib', $values:parameters},
      ParameterTypeName:{$type:'System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib', $values:types}, UseJson:false
    }, signal);
  }
  async function queriesInFolder(path, signal) {
    const folder = await execute('FindByPath', [{$type:'System.String',$value:path}], ['System.String'], signal);
    const folderId = property(folder.Result, 'DocumentId');
    if (!guid(folderId)) throw Error('Folder was not found.');
    const response = await execute('FindDocumentsInFolder', [
      {$type:'System.String',$value:folderId},
      {$type:'System.String[], mscorlib',$values:['IQD']},
      {$type:'System.Boolean',$value:true}
    ], ['System.String','System.String[]','System.Boolean'], signal);
    const seen = new Set(), queries = [];
    for (const row of values(response.Result)) {
      if (property(row,'DocumentTypeId') !== 'IQD' || property(row,'IsDeleted') === true || property(row,'IsAuthorized') === false) continue;
      const id = property(row,'DocumentVersionId'), name = property(row,'Name');
      if (!guid(id) || typeof name !== 'string' || !name.trim()) throw Error('Invalid query in folder listing.');
      if (seen.has(id.toLowerCase())) continue;
      seen.add(id.toLowerCase());
      queries.push({id, name:name.trim()});
    }
    queries.sort((a,b) => a.name.localeCompare(b.name,'en',{numeric:true,sensitivity:'base'}) || a.id.localeCompare(b.id));
    return queries.slice(0,4);
  }
  function safeLink(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    let link = value.trim();
    if (/[\u0000-\u001f\u007f\\]/.test(link)) return null;
    if (link.startsWith('#') && link.length > 1) return link;
    if (link.startsWith('~/')) link = apiRoot().replace(/api\/$/,'') + link.slice(2);
    try {
      const url = new URL(link, window.location.href);
      return /^(https?:)$/.test(url.protocol) && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }
  async function queryCount(query, signal) {
    const data = await request('iqa?' + new URLSearchParams({QueryDocumentVersionKey:query.id,Limit:'2'}), null, signal);
    const rows = values(data.Items);
    if (rows.length !== 1 || Number(unwrap(data.TotalCount)) > 1 || unwrap(data.HasNext) === true) throw Error('Each tracker IQA must return exactly one summary row.');
    const rawCount = property(rows[0],'Count'), header = property(rows[0],'Header'), label = property(rows[0],'Label');
    const count = typeof rawCount === 'number' ? rawCount : typeof rawCount === 'string' && /^\d+$/.test(rawCount.trim()) ? Number(rawCount.trim()) : NaN;
    if (!Number.isSafeInteger(count) || count < 0 || typeof header !== 'string' || !header.trim() || typeof label !== 'string' || !label.trim()) throw Error('Invalid Count, Header or Label.');
    return {count, header:header.trim(), label:label.trim(), link:safeLink(property(rows[0],'Link'))};
  }
  function card(data) {
    const li = document.createElement('li');
    const node = element(data.link ? 'a' : 'div','us-attention__card');
    if (data.link) node.href = data.link;
    const number = element('span','us-attention__number',data.count === null ? '—' : data.count.toLocaleString(document.documentElement.lang || 'en-AU'));
    if (data.count === null) number.setAttribute('aria-label','Count unavailable');
    const copy = element('span','us-attention__copy');
    copy.append(element('strong','',data.header),element('span','',data.label));
    node.append(number,copy);
    if (data.link) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('class','us-attention__chevron'); svg.setAttribute('viewBox','0 0 24 24');
      svg.setAttribute('fill','none'); svg.setAttribute('stroke','currentColor'); svg.setAttribute('stroke-width','1.6');
      svg.setAttribute('aria-hidden','true'); svg.setAttribute('focusable','false');
      const path = document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('d','m9 5 7 7-7 7');
      svg.append(path); node.append(svg);
    }
    li.append(node); return li;
  }
  // Navigation feedback is independent of loading the tracker counts.
  const opening = new Map();
  const cardSelector = '.us-attention > .us-attention__items > li > a.us-attention__card[href]';
  function availableCard(link) {
    return link?.matches?.(cardSelector) && link.isConnected && link.getClientRects().length &&
      !link.closest('.us-report-no-styling,[aria-disabled="true"],.disabled,.aspNetDisabled,[hidden]');
  }
  function clearOpening(link) {
    const entry = opening.get(link);
    if (!entry) return;
    opening.delete(link); clearTimeout(entry.timer); entry.spinner.remove();
    entry.attributes.forEach(([name,value]) => value === null ? link.removeAttribute(name) : link.setAttribute(name,value));
  }
  function clearAllOpening() { for (const link of opening.keys()) clearOpening(link); }
  function showOpening(link, automatic) {
    if (automatic) for (const [other,entry] of opening) if (entry.automatic) clearOpening(other);
    const attributes = ['aria-busy','aria-label','data-us-attention-opening'].map(name => [name,link.getAttribute(name)]);
    const spinner = element('span','us-button-spinner us-attention__spinner'); spinner.setAttribute('aria-hidden','true');
    const entry = {attributes,spinner,automatic,href:link.href}; opening.set(link,entry);
    link.setAttribute('aria-busy','true'); link.setAttribute('data-us-attention-opening','');
    link.setAttribute('aria-label','Opening ' + (link.querySelector('.us-attention__copy > strong')?.textContent.trim() || 'report') + '…');
    link.append(spinner);
    // Recover when native navigation does not leave this page. This is a
    // presentation timeout, not a claim that the destination finished loading.
    if (automatic) entry.timer = setTimeout(() => clearOpening(link),10000);
    return entry;
  }
  function runCard(link, action) {
    if (opening.get(link)?.promise) return opening.get(link).promise;
    if (!availableCard(link) || typeof action !== 'function') return Promise.reject(new TypeError('Pass an available Needs Attention link and an action function.'));
    clearOpening(link);
    const entry = showOpening(link,false);
    entry.promise = Promise.resolve().then(action).finally(() => {if (opening.get(link) === entry) clearOpening(link);});
    return entry.promise;
  }
  document.addEventListener('click',event => {
    const link = event.target.closest?.(cardSelector);
    if (!availableCard(link) || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
        link.hasAttribute('download') || !['','_self'].includes(link.getAttribute('target') || document.querySelector('base[target]')?.getAttribute('target') || '')) return;
    if (opening.has(link)) {event.preventDefault();event.stopImmediatePropagation();return;}
    if (link.getAttribute('aria-busy') === 'true') return;
    const url = new URL(link.href);
    if (!/^https?:$/.test(url.protocol) || (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search && (url.hash || link.getAttribute('href').startsWith('#')))) return;
    const entry = showOpening(link,true);
    // A later handler can cancel navigation, or explicitly own its async action
    // through run(). Do not leave a spinner on an unhandled cancelled link.
    setTimeout(() => {if (event.defaultPrevented && opening.get(link) === entry) clearOpening(link);},0);
  },true);
  window.addEventListener('pagehide',clearAllOpening); window.addEventListener('pageshow',clearAllOpening);
  async function load(state) {
    state.controller?.abort();
    const controller = state.controller = new AbortController();
    const current = () => states.get(state.root) === state && state.controller === controller && !controller.signal.aborted && state.root.isConnected;
    for (const link of opening.keys()) if (state.list.contains(link)) clearOpening(link);
    state.list.replaceChildren(); state.list.setAttribute('aria-busy','true');
    state.status.textContent = 'Loading counts…';
    if (document.activeElement === state.retry) {state.status.tabIndex=-1;state.status.focus({preventScroll:true});}
    state.retry.hidden = true;
    try {
      const path = state.path.trim().replace(/\/+$/,'');
      if (!/^\$\/.+/.test(path)) throw Error('Configure an IQA folder path beginning $/.');
      const queries = await queriesInFolder(path, controller.signal);
      const results = await Promise.allSettled(queries.map(query => queryCount(query, controller.signal)));
      if (!current()) return;
      let failed = 0;
      const cards = results.map((result,i) => {
        if (result.status === 'fulfilled') return card(result.value);
        failed++;
        return card({count:null,header:queries[i].name,label:'Count unavailable',link:null});
      });
      state.list.style.setProperty('--us-attention-columns',String(Math.max(1,cards.length)));
      state.list.replaceChildren(...cards);
      state.status.textContent = !queries.length ? 'No tracker queries were found in this folder.' : failed ? (queries.length-failed) + ' of ' + queries.length + ' counts loaded. Check query fields, REST access and sign-in, then retry.' : '';
      state.retry.hidden = !failed;
    } catch {
      if (!current()) return;
      state.status.textContent = 'Couldn’t load Needs Attention. Check the folder path, query access and sign-in, then retry.';
      state.retry.hidden = false;
    } finally {
      if (current()) {
        state.list.removeAttribute('aria-busy');
        if (document.activeElement === state.status && state.list.children.length) {state.list.tabIndex=-1;state.list.focus({preventScroll:true});}
      }
    }
  }
  function refresh() {
    for (const [link,entry] of opening) if (!availableCard(link) || link.href !== entry.href) clearOpening(link);
    states.forEach((state,root) => {
      if (!root.isConnected || !root.matches(selector) || root.closest('.us-report-no-styling') || root.dataset.usIqaFolder !== state.path ||
          root.querySelector(':scope > .us-attention__items') !== state.list || root.querySelector(':scope > .us-attention__status') !== state.status || root.querySelector(':scope > .us-attention__retry') !== state.retry) {
        state.controller?.abort(); state.list.removeAttribute('aria-busy'); states.delete(root);
      }
    });
    document.querySelectorAll(selector).forEach(root => {
      if (states.has(root) || root.closest('.us-report-no-styling')) return;
      const list=root.querySelector(':scope > .us-attention__items'), status=root.querySelector(':scope > .us-attention__status'), retry=root.querySelector(':scope > .us-attention__retry');
      if (!list || !status || !retry) return;
      const state = {root,list,status,retry,path:root.dataset.usIqaFolder};
      states.set(root,state); void load(state);
    });
  }
  function schedule() { if (!scheduled) { scheduled=true; requestAnimationFrame(() => {scheduled=false;refresh();}); } }
  window.UnionSuiteAttention = {refresh:schedule,reload:root => {const state=states.get(root);if(state)void load(state);else schedule();},run:runCard};
  document.addEventListener('click',event => {
    const button=event.target.closest('.us-attention__retry'), state=button && states.get(button.closest(selector));
    if (state && button === state.retry) {event.preventDefault();void load(state);}
  });
  function start() {
    refresh();
    new MutationObserver(records => {
      if (opening.size || records.some(record => record.type === 'attributes' || [...record.addedNodes,...record.removedNodes].some(node => node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector) || node.matches('.us-attention__items,.us-attention__status,.us-attention__retry'))))) schedule();
    }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-us-iqa-folder','class','hidden','aria-disabled','href']});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
/* US-ATTENTION:END */

/* US-TASK-ROWS:START — local checkbox/animation only; persistence is not connected. */
(function () {
  'use strict';
  if (window.UnionSuiteTaskRows) {window.UnionSuiteTaskRows.refresh();return;}
  const selector='.us-task[data-us-task-completed]:has(> [data-us-task-toggle])';
  const dueLabels=new WeakMap(), runs=new Map();
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let scheduled=false;
  const completed=root=>/^(true|1)$/i.test((root.getAttribute('data-us-task-completed')||'').trim());
  function sync() {
    runs.forEach((run,root)=>{if(!root.isConnected||root.closest('.us-report-no-styling'))run.finish();});
    document.querySelectorAll(selector).forEach(root=>{
      if(root.closest('.us-report-no-styling')||runs.has(root))return;
      const button=root.querySelector(':scope > [data-us-task-toggle]'), done=completed(root);
      if(!dueLabels.has(root)) {
        const authored=root.getAttribute('data-us-task-due-label');
        dueLabels.set(root,authored&&!authored.includes('{#')?authored:done?'':root.querySelector('.us-task__date')?.textContent||'');
      }
      button.setAttribute('aria-checked',String(done));
      button.title=done?'Reopen task':'Mark complete';
      root.classList.toggle('us-task--complete',done);
    });
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;sync();});}}
  function moveFocus(row,set,wrapper) {
    if(!row.contains(document.activeElement))return;
    const rows=[...set.children],index=rows.indexOf(row);
    const next=[...rows.slice(index+1),...rows.slice(0,index).reverse()].find(node=>!node.inert&&!node.hasAttribute('data-us-query-search-hidden')&&node.getClientRects().length&&node.querySelector('[data-us-task-toggle]'));
    const search=wrapper?.querySelector('.us-query-search-controls:not([hidden]):not([inert]) input');
    const target=next?.querySelector('[data-us-task-toggle]')||search||wrapper?.querySelector('.us-iqa-filter-toggle');
    if(target)target.focus({preventScroll:true});
    else {set.tabIndex=-1;set.focus({preventScroll:true});}
  }
  const glyphs={
    confetti:'<rect x="7" y="3" width="8" height="17" rx="2"/>',
    star:'<path d="m12 1 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z"/>',
    moon:'<path d="M17 2A10 10 0 1 0 22 17 10 10 0 0 1 17 2Z"/>',
    bat:'<path d="m10 8-1-4 3 2 3-2-1 4c3-4 6-5 10-4-3 4-3 7-2 10-3-2-5-2-7 1l-3 4-3-4c-2-3-4-3-7-1 1-3 1-6-2-10 4-1 7 0 10 4Z"/>'
  };
  function celebrate(button,animations,particles){
    const today=new Date();
    const kind=today.getMonth()===9&&today.getDate()===31?'bats':document.documentElement.getAttribute('data-us-color-scheme')==='dark'?'night':'confetti';
    const duration=kind==='night'?1100:kind==='bats'?1050:800;
    const count=kind==='night'?10:kind==='bats'?7:12;
    const rect=button.getBoundingClientRect(),paint=getComputedStyle(button);
    for(let i=0;i<count;i++){
      const glyph=kind==='night'?(i===0?'moon':'star'):kind==='bats'?(i<5?'bat':'star'):'confetti';
      const el=document.createElement('span');el.className='us-task-particle';el.dataset.usTaskEffect=kind;el.setAttribute('aria-hidden','true');
      el.style.left=(rect.left+rect.width/2)+'px';el.style.top=(rect.top+rect.height/2)+'px';
      el.style.color=paint.getPropertyValue('--task-'+kind+'-'+(i%3+1));
      el.innerHTML='<svg viewBox="0 0 24 24" focusable="false">'+glyphs[glyph]+'</svg>';
      document.body.appendChild(el);particles.push(el);
      const angle=(-165+i*145/(count-1))*Math.PI/180,distance=48+(i%4)*16;
      const dx=Math.cos(angle)*distance,dy=Math.sin(angle)*distance;
      const animation=el.animate([
        {transform:'translate(-50%,-50%) scale(.3)',opacity:0},
        {offset:.2,transform:'translate('+dx*.4+'px,'+dy*.6+'px) scale(1)',opacity:1},
        {offset:.6,transform:'translate('+dx+'px,'+dy+'px) rotate('+(i%2?25:-25)+'deg)',opacity:.9},
        {transform:'translate('+dx*1.2+'px,'+(dy+(kind==='night'?-28:kind==='bats'?-20:55))+'px) rotate('+(i%2?90:-65)+'deg) scale(.6)',opacity:0}
      ],{duration,easing:'ease-out',fill:'forwards'});
      animations.push(animation);animation.finished.then(()=>el.remove()).catch(()=>{});
      if(glyph==='bat')animations.push(el.firstElementChild.animate([{transform:'scaleX(1)'},{transform:'scaleX(.35)'},{transform:'scaleX(1)'}],{duration:160,iterations:Math.ceil(duration/160)}));
    }
    return duration;
  }
  async function toggle(root) {
    if(runs.has(root))return;
    const button=root.querySelector(':scope > [data-us-task-toggle]');
    const set=root.closest('.QueryTemplateSet'), item=root.closest('.QueryTemplateItem');
    if(!set||!item||item.closest('.QueryTemplateSet')!==set)return;
    const row=item.parentElement===set?item:item.parentElement;
    const wrapper=set.closest('[data-us-query-display]');
    const done=!completed(root), originalInert=row.inert;
    const animations=[],particles=[];
    let timer,release;
    const pause=ms=>new Promise(resolve=>{release=resolve;timer=setTimeout(resolve,ms);});
    const run={finish:()=>{
      if(runs.get(root)!==run)return;
      runs.delete(root); clearTimeout(timer);release?.();animations.forEach(animation=>animation.cancel());particles.forEach(node=>node.remove());
      root.setAttribute('data-us-task-completed',String(done));
      root.removeAttribute('data-us-task-changing');
      row.removeAttribute('data-us-task-exiting');row.inert=originalInert;
      const date=root.querySelector('.us-task__date');
      if(date) date.textContent=done?'Actioned '+new Intl.DateTimeFormat(document.documentElement.lang||'en-AU',{day:'numeric',month:'short',year:'numeric'}).format(new Date()):dueLabels.get(root)||'';
      window.UnionSuiteIqaFilters?.refresh();schedule();
    }};
    runs.set(root,run);
    root.setAttribute('data-us-task-changing',String(done));
    button.setAttribute('aria-checked',String(done));button.title=done?'Reopen task':'Mark complete';
    root.classList.toggle('us-task--complete',done);
    const showCompleted=!!wrapper?.querySelector('.us-task-completed-toggle[aria-pressed="true"]');
    if(!done||reducedMotion.matches||typeof root.animate!=='function'){if(done&&!showCompleted)moveFocus(row,set,wrapper);run.finish();return;}
    if(!showCompleted){moveFocus(row,set,wrapper);row.inert=true;row.setAttribute('data-us-task-exiting','');}
    try {
      const mark=button.querySelector('svg path');
      if(mark&&typeof mark.getTotalLength==='function'){
        const length=mark.getTotalLength();
        animations.push(mark.animate([{strokeDasharray:String(length),strokeDashoffset:length},{strokeDasharray:String(length),strokeDashoffset:0}],{duration:280,easing:'ease-out'}));
      }
      const duration=celebrate(button,animations,particles);
      await pause(duration+(showCompleted?0:100));
      if(runs.get(root)!==run||showCompleted)return;
      const slide=root.animate([{transform:'translateX(0)',opacity:1},{transform:'translateX(-105%)',opacity:0}],{duration:450,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
      animations.push(slide);await slide.finished;
      if(runs.get(root)!==run)return;
      const collapse=row.animate([{height:row.getBoundingClientRect().height+'px',minHeight:'0px'},{height:'0px',minHeight:'0px',paddingTop:'0px',paddingBottom:'0px',borderTopWidth:'0px'}],{duration:300,easing:'ease-in-out',fill:'forwards'});
      animations.push(collapse);await collapse.finished;
    } catch(error) {if(error.name!=='AbortError')console.warn('Task animation could not finish.');}
    finally {run.finish();}
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-us-task-toggle]'), root=button?.closest(selector);
    if(root&&!root.closest('.us-report-no-styling')){event.preventDefault();void toggle(root);return;}
    if(event.target.closest('.us-task-completed-toggle')) runs.forEach((run,task)=>{if(task.closest('[data-us-query-display]')===event.target.closest('[data-us-query-display]'))run.finish();});
  });
  document.addEventListener('input',event=>{
    if(event.target.matches('.us-query-search-field input'))runs.forEach((run,task)=>{if(task.closest('[data-us-query-display]')===event.target.closest('[data-us-query-display]'))run.finish();});
  });
  reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)runs.forEach(run=>run.finish());});
  // Fixed celebration overlays must not drift when their source moves.
  addEventListener('scroll',()=>runs.forEach(run=>run.finish()),true);
  addEventListener('resize',()=>runs.forEach(run=>run.finish()));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)runs.forEach(run=>run.finish());});
  window.UnionSuiteTaskRows={refresh:schedule};
  function start(){sync();new MutationObserver(records=>{if(records.some(record=>record.type==='childList'||record.attributeName==='data-us-task-completed'||record.target.closest('.us-report-no-styling')))schedule();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-us-task-completed','class']});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
/* US-TASK-ROWS:END */
/* US-MEMBERSHIP-STATS:START — visible-only Content HTML cards backed by /api/query. */
(() => {
  'use strict';
  if (window.UnionSuiteMembership) { window.UnionSuiteMembership.refresh(); return; }
  const selector='.us-membership[data-us-membership]', states=new Map(), cache=new Map();
  const queries={total:'Total Member Count',financial:'Member Counts by Financial Status',joined:'Members Joined',resigned:'Members Resigned',groups:'Member Counts by Group',categories:'Member Counts by Category'};
  const contracts={total:['MemberCount'],financial:['MemberCount','FinancialStatusCode'],joined:['JoinedCount','GroupCode'],resigned:['ResignedCount','GroupCode'],groups:['MemberCount','GroupCode'],categories:['MemberCount','CategoryCode']};
  const unwrap=v=>v && typeof v==='object' && '$value' in v?v.$value:v;
  const collection=value=>{const rows=unwrap(value)?.$values ?? unwrap(value);if(!Array.isArray(rows))throw Error('Unexpected query response.');return rows;};
  const key=value=>value==null || String(value).trim()===''?null:String(value).trim();
  const label=value=>key(value) ?? '(empty)';
  const number=value=>new Intl.NumberFormat('en-AU').format(value);
  const signed=value=>(value>0?'+':value<0?'−':'')+number(Math.abs(value));
  const percent=(value,total)=>total===0?'0.0':value>0&&value/total*100<.1?'<0.1':value<total&&value/total*100>99.9?'>99.9':(value/total*100).toFixed(1);
  const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const own=(root,cls)=>root.querySelector(':scope > .'+cls);
  function integer(value) {
    value=unwrap(value);
    if(typeof value!=='number' && !(typeof value==='string' && /^\d+(?:\.0+)?$/.test(value.trim())))throw Error('Invalid member count.');
    const n=Number(value);if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid member count.');return n;
  }
  function normalize(rows,type) {
    const [countField,codeField]=contracts[type], groups=new Map();let total=0;
    if(type==='total'&&rows.length!==1)throw Error('The total query must return one summary row.');
    for(let row of rows) {
      row=unwrap(row);
      if(row?.Properties)row=Object.fromEntries(collection(row.Properties).map(p=>[p.Name,unwrap(p.Value)]));
      if(!row||typeof row!=='object')throw Error('Unexpected result row.');
      const count=integer(row[countField]), code=codeField?key(unwrap(row[codeField])):null;
      if(codeField && row[codeField]!=null && !['string','number'].includes(typeof unwrap(row[codeField])))throw Error('Invalid category code.');
      if(code!==null&&groups.has(code))throw Error('Duplicate category code.');
      const entry=groups.get(code)||{code,label:label(code),count:0};entry.count+=count;groups.set(code,entry);total+=count;
      if(!Number.isSafeInteger(total))throw Error('Member count exceeds supported precision.');
    }
    return {total,rows:[...groups.values()].sort((a,b)=>a.code===null?b.code===null?0:1:b.code===null?-1:b.count-a.count||a.label.localeCompare(b.label))};
  }
  function config(root) {
    const folder=(root.dataset.usStatsFolder||'').trim().replace(/\/+$/,'');
    if(!/^\$\/.+/.test(folder))throw Error('Configure the Stats IQA folder.');
    const type=root.dataset.usMembership;
    if(!['summary','financial','groups','categories'].includes(type))throw Error('Unknown membership card.');
    const timeZone=root.dataset.usTimeZone||'Australia/Sydney';
    const now = new Date();
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-AU',{timeZone,year:'numeric',month:'numeric',day:'numeric'}).formatToParts(now).map(p=>[p.type,p.value]));
    const y=Number(parts.year),m=Number(parts.month)-1,d=Number(parts.day);
    const iso=(year,month,day)=>new Date(Date.UTC(year,month,day)).toISOString().slice(0,10);
    const periods={current:{start:iso(y,m,1),end:iso(y,m,d+1)},previous:{start:iso(y,m-1,1),end:iso(y,m-1,Math.min(d,new Date(Date.UTC(y,m,0)).getUTCDate())+1)}};
    const start=root.dataset.usStartParameter||'StartDate',end=root.dataset.usEndParameter||'EndDate';
    const reserved=/^(queryname|querydocumentversionkey|queryurlparameters|limit|offset|parameter)$/i;
    if(start.toLowerCase()===end.toLowerCase()||reserved.test(start)||reserved.test(end))throw Error('Configure distinct named date filters.');
    const names=Object.fromEntries(Object.entries(queries).map(([type,name])=>[type,root.getAttribute('data-us-query-'+type)||name]));
    const financialCodes=(root.dataset.usFinancialCodes||'Financial').split('|').map(s=>s.trim()).filter(Boolean);
    return {folder,type,timeZone,periods,start,end,names,financialCodes,groupLabel:root.dataset.usGroupLabel||'Group'};
  }
  function range(period,year=false) {
    const first=new Date(period.start+'T00:00:00Z'),last=new Date(new Date(period.end+'T00:00:00Z').getTime()-86400000);
    const end=new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',...(year?{year:'numeric'}:{}),timeZone:'UTC'}).format(last);
    return first.getUTCDate()===last.getUTCDate()?end:first.getUTCDate()+'–'+end;
  }
  function apiRoot() {
    if(!window.gWebRoot)return '/api/';
    const root=new URL(String(window.gWebRoot||'/'),window.location.origin);
    if(root.origin!==window.location.origin||root.search||root.hash)throw Error('Invalid iMIS web root.');
    return root.pathname.replace(/\/+$/,'')+'/api/';
  }
  async function fetchRows(path,filters) {
    const rows=[],seen=new Set();let offset=0,total=null;
    for(let page=0;page<20;page++) {
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
      let data;
      try {
        const token=document.querySelector('input[name="__RequestVerificationToken"],input#__RequestVerificationToken')?.value;
        const response=await fetch(apiRoot()+'query?'+new URLSearchParams({QueryName:path,limit:'100',offset:String(offset),...filters}),{
          method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,
          headers:{Accept:'application/json',...(token?{RequestVerificationToken:token}:{})}
        });
        if(!response.ok)throw Error('Membership query failed (HTTP '+response.status+').');
        data=await response.json();
        if(!data||unwrap(data.IsSuccessStatusCode)===false||unwrap(data.IsValid)===false)throw Error('Membership query failed.');
      } finally {clearTimeout(timer);}
      const batch=collection(data.Items),count=data.TotalCount==null?null:integer(data.TotalCount),next=unwrap(data.HasNext);
      if(total!==null&&count!==null&&total!==count)throw Error('Results changed while paging.');
      if(count!==null)total=count;
      const signature=JSON.stringify(batch);if(batch.length&&seen.has(signature))throw Error('Repeated result page.');seen.add(signature);
      rows.push(...batch);
      if(total!==null&&(rows.length>total||(next===false&&rows.length<total)))throw Error('Incomplete membership results.');
      if(next===false || (next!==true&&total!==null&&rows.length===total) || (next==null&&total===null&&batch.length<100))return rows;
      if(!batch.length)throw Error('Membership paging stopped early.');
      const nextOffset=data.NextOffset==null?offset+batch.length:integer(data.NextOffset);
      if(nextOffset!==offset+batch.length)throw Error('Unexpected membership page offset.');offset=nextOffset;
    }
    throw Error('Membership breakdown exceeds 2,000 aggregate rows.');
  }
  function dataset(cfg,type,period) {
    const filters=period?{[cfg.start]:period.start,[cfg.end]:period.end}:{};
    const path=cfg.folder+'/'+cfg.names[type],id=JSON.stringify([apiRoot(),path,filters,type]);
    if(!cache.has(id)) {
      const entry={folder:cfg.folder,status:'pending'};
      entry.promise=fetchRows(path,filters).then(rows=>normalize(rows,type)).then(data=>{entry.status='ready';return data;},error=>{entry.status='failed';throw error;});
      cache.set(id,entry);
    }
    return cache.get(id).promise;
  }
  const good=result=>result?.status==='fulfilled'?result.value:null;
  function matches(total,breakdown){return total&&breakdown&&total.total===breakdown.total;}
  function financialCount(cfg,data){return data.rows.filter(row=>row.code!==null&&cfg.financialCodes.includes(row.code)).reduce((sum,row)=>sum+row.count,0);}
  function delta(value,lowerBetter=false) {
    return el('span','us-membership__delta'+(value===0?' is-neutral':(lowerBetter?value>0:value<0)?' is-negative':''),signed(value));
  }
  function metric(title,value,note) {
    const card=el('div','us-membership__metric');card.append(el('h3','',title),el('strong','',value===null?'—':number(value)));
    const p=el('p');p.append(note || 'Count unavailable');card.append(p);return card;
  }
  function comparison(current,previous,cfg,lowerBetter) {
    if(!current||!previous)return 'Comparison unavailable';
    const change=current.total-previous.total,fragment=document.createDocumentFragment();
    fragment.append(delta(change,lowerBetter));
    fragment.append(previous.total?' ('+(change>0?'+':change<0?'−':'')+(Math.abs(change)/previous.total*100).toFixed(1)+'%)':' (previously 0)');
    fragment.append(el('span','us-membership__comparison-period','vs '+range(cfg.periods.previous)));
    return fragment;
  }
  function summary(state,results) {
    const {cfg,content}=state,[total,financial,joined,joinedBefore,resigned,resignedBefore]=results.map(good);
    const validFinancial=matches(total,financial),paid=validFinancial?financialCount(cfg,financial):null;
    const grid=el('div','us-membership__metrics');
    grid.append(metric('Total members',total?.total??null,total?'Current membership':null),
      metric('Financial members',paid,validFinancial?percent(paid,total.total)+'% of current members':null),
      metric('Joined this month',joined?.total??null,comparison(joined,joinedBefore,cfg,false)),
      metric('Resigned this month',resigned?.total??null,comparison(resigned,resignedBefore,cfg,true)));
    content.replaceChildren(grid,el('p','us-membership__period','Month to date: '+range(cfg.periods.current,true)+' · Compared with the same days in the previous month.'));
    return results.every(r=>r.status==='fulfilled')&&validFinancial;
  }
  function financial(state,results) {
    const {cfg,content}=state,[total,data]=results.map(good);
    if(!matches(total,data))return false;
    const paid=financialCount(cfg,data),rows=[...data.rows].sort((a,b)=>Number(cfg.financialCodes.includes(b.code))-Number(cfg.financialCodes.includes(a.code))||(a.code===null?1:b.code===null?-1:b.count-a.count));
    const body=el('div','us-membership__financial'),donut=el('div','us-membership__donut');let stop=0;
    const colors=['var(--teal-300)','var(--brand-500)','var(--neutral-400)'];let other=0;
    const legend=el('dl','us-membership__legend'),segments=[];
    for(const row of rows) {
      const color=row.code===null?'var(--neutral-300)':cfg.financialCodes.includes(row.code)?'var(--brand-700)':colors[other++%colors.length];
      const next=stop+(total.total?row.count/total.total*100:0);segments.push(color+' '+stop+'% '+next+'%');stop=next;
      const entry=el('div');entry.style.setProperty('--us-membership-swatch',color);entry.append(el('dt','',row.label),el('dd','',number(row.count)));legend.append(entry);
    }
    donut.style.background=total.total?'conic-gradient('+segments.join(',')+')':'var(--neutral-300)';
    donut.setAttribute('role','img');donut.setAttribute('aria-label',rows.map(row=>row.label+': '+number(row.count)).join('. ')||'No current members');
    const centre=el('div');centre.append(el('strong','',percent(paid,total.total)+'%'),el('span','','financial'));donut.append(centre);
    const unassigned=rows.find(row=>row.code===null)?.count||0;
    body.append(donut,legend,el('p','us-membership__note',unassigned?number(unassigned)+' members have no financial status assigned. They are included in the total.':'All current members are included in this breakdown.'));
    content.replaceChildren(body);return true;
  }
  function groups(state,results) {
    const {cfg,content}=state,[total,data,joined,resigned]=results.map(good);
    if(!matches(total,data)||!joined||!resigned)return false;
    const merged=new Map(data.rows.map(row=>[row.code,{...row,joined:0,resigned:0}]));
    for(const [field,set] of [['joined',joined],['resigned',resigned]])for(const row of set.rows){
      if(!merged.has(row.code))merged.set(row.code,{code:row.code,label:row.label,count:0,joined:0,resigned:0});
      merged.get(row.code)[field]+=row.count;
    }
    const scroll=el('div','us-membership__table-scroll');scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','Membership by '+cfg.groupLabel.toLowerCase());
    const table=el('table'),caption=el('caption','us-membership__sr','Current members and month-to-date joins and resignations by '+cfg.groupLabel.toLowerCase()+'.');table.append(caption);
    const head=el('thead'),headers=el('tr');for(const text of [cfg.groupLabel,'Members','Joined','Resigned','Net change']){const th=el('th','',text);th.scope='col';headers.append(th);}head.append(headers);table.append(head);
    const body=el('tbody');
    function row(label,members,joins,exits){const tr=el('tr'),th=el('th','',label);th.scope='row';tr.append(th);for(const n of [members,joins,exits])tr.append(el('td','',number(n)));const net=el('td');net.append(delta(joins-exits));tr.append(net);return tr;}
    for(const item of merged.values())body.append(row(item.label,item.count,item.joined,item.resigned));
    const foot=el('tfoot');foot.append(row('Total',total.total,joined.total,resigned.total));table.append(body,foot);scroll.append(table);
    content.replaceChildren(scroll,el('p','us-membership__note us-membership__note--inset','Members are current counts. Joined, resigned and net change cover '+range(cfg.periods.current,true)+'.'));
    return true;
  }
  function categories(state,results) {
    const [total,data]=results.map(good);if(!matches(total,data))return false;
    const body=el('div','us-membership__body'),list=el('dl','us-membership__bars');
    for(const row of data.rows){
      const entry=el('div'),dd=el('dd','',number(row.count));dd.append(el('span','',percent(row.count,total.total)+'%'));
      const bar=el('div','us-membership__bar');bar.setAttribute('aria-hidden','true');const fill=el('span');fill.style.width=(total.total?row.count/total.total*100:0)+'%';bar.append(fill);
      entry.append(el('dt','',row.label),dd,bar);list.append(entry);
    }
    if(!data.rows.length)body.append(el('p','','No current members.'));
    const unassigned=data.rows.find(row=>row.code===null)?.count||0;
    body.append(list,el('p','us-membership__note',number(total.total)+' current members across all membership types.'+(unassigned?' Includes '+number(unassigned)+' members with no membership type assigned.':'')));
    state.content.replaceChildren(body);return true;
  }
  function visible(root) {
    if(!root.isConnected||document.hidden||root.closest('.us-report-no-styling'))return false;
    function shown(node,win){for(let n=node;n;n=n.parentElement){const style=win.getComputedStyle(n);if(n.hidden||style.display==='none'||style.visibility!=='visible'||style.opacity==='0')return false;}const r=node.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<win.innerHeight&&r.right>0&&r.left<win.innerWidth;}
    if(!shown(root,window))return false;
    try {let win=window;while(win.frameElement){const frame=win.frameElement;win=win.parent;if(!shown(frame,win))return false;}}catch{/* IntersectionObserver also clips through cross-origin frame boundaries. */}
    return true;
  }
  function loading(state) {
    state.root.setAttribute('aria-busy','true');state.status.textContent='';state.retry.hidden=true;
    if(!state.ready){const box=el('div','us-membership__loading'),spinner=el('span','section-loader-spinning-circles');spinner.setAttribute('aria-hidden','true');box.append(spinner,el('span','','Loading membership figures…'));state.content.replaceChildren(box);}
  }
  async function load(state) {
    if(state.loading||!visible(state.root))return;
    state.loading=true;loading(state);const generation=++state.generation;
    const current=()=>states.get(state.root)===state&&generation===state.generation&&state.root.isConnected;
    try {
      const cfg=state.cfg=config(state.root),p=cfg.periods;
      const needed=cfg.type==='summary'?[['total'],['financial'],['joined',p.current],['joined',p.previous],['resigned',p.current],['resigned',p.previous]]:
        cfg.type==='financial'?[['total'],['financial']]:cfg.type==='groups'?[['total'],['groups'],['joined',p.current],['resigned',p.current]]:[['total'],['categories']];
      const results=await Promise.allSettled(needed.map(([type,period])=>dataset(cfg,type,period)));
      if(!current())return;
      const success=({summary,financial,groups,categories})[cfg.type](state,results);
      if(!success&&cfg.type!=='summary')state.content.replaceChildren(el('p','us-membership__unavailable','Membership figures are unavailable.'));
      const period=state.root.querySelector(':scope > .us-membership__heading > [data-us-membership-period]');if(period)period.textContent=range(cfg.periods.current,true);
      state.ready=true;state.failed=!success;state.retry.hidden=success;
      state.status.textContent=success?'':'Some figures could not be loaded or did not reconcile. Retry to check again.';
      state.root.dataset.usMembershipState=success?'ready':'error';
    } catch(error) {
      if(!current())return;
      state.content.replaceChildren(el('p','us-membership__unavailable','Membership figures are unavailable.'));
      state.status.textContent='Check query access and card configuration, then retry.';state.retry.hidden=false;state.failed=true;state.ready=true;state.root.dataset.usMembershipState='error';
    } finally {if(current()){state.loading=false;state.root.removeAttribute('aria-busy');if(state.restoreFocus&&document.activeElement===state.content)state.content.focus({preventScroll:true});state.restoreFocus=false;}}
  }
  let scheduled=false;
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries){const state=states.get(entry.target);if(state&&entry.isIntersecting&&!state.ready)void load(state);}},{threshold:0}):null;
  // Carry Bootstrap's row stretch through only the wrappers owning one card.
  // Never promote containing CCO rows or columns with other visible content.
  const layoutMarks=new Map();
  function alignRows(){
    const rows=new Map(),next=new Map();
    function incidental(node){
      if(node.nodeType===3)return !node.textContent.trim();
      if(node.nodeType!==1)return true;
      if(node.matches('script,style,template,noscript,input[type="hidden"],[hidden]')||getComputedStyle(node).display==='none')return true;
      return node.tagName==='DIV'&&!node.children.length&&!node.textContent.trim();
    }
    function path(card,row){
      const chain=[];let child=card;
      for(let parent=card.parentElement;parent&&parent!==row;parent=parent.parentElement){
        if(parent.tagName!=='DIV'||parent.closest('.us-report-no-styling')||[...parent.childNodes].some(node=>node!==child&&!incidental(node)))return null;
        chain.push(parent);child=parent;
      }
      const column=chain.at(-1);
      return column?.parentElement===row&&[...column.classList].some(cls=>/^col-(?:(?:xs|sm|md|lg|xl|xxl)-)?\d+$/.test(cls))?chain:null;
    }
    document.querySelectorAll('.us-membership').forEach(card=>{
      if(card.closest('.us-report-no-styling')||card.parentElement?.closest('.us-membership'))return;
      const row=card.closest('.row');if(!row)return;
      const chain=path(card,row);if(!chain)return;
      if(!rows.has(row))rows.set(row,[]);rows.get(row).push(chain);
    });
    for(const [row,chains] of rows){
      const columns=chains.map(chain=>chain.at(-1));
      if(columns.length<2||new Set(columns).size!==columns.length||[...row.childNodes].some(node=>!columns.includes(node)&&!incidental(node)))continue;
      next.set(row,['data-us-membership-row','']);
      for(const chain of chains)for(const node of chain)next.set(node,['data-us-membership-stretch',node===chain.at(-1)?'column':'wrapper']);
    }
    for(const [node,[attr]] of layoutMarks)if(!next.has(node)){node.removeAttribute(attr);layoutMarks.delete(node);}
    for(const [node,[attr,value]] of next){if(node.getAttribute(attr)!==value)node.setAttribute(attr,value);layoutMarks.set(node,[attr,value]);}
  }
  function refresh(){
    scheduled=false;
    alignRows();
    states.forEach((state,root)=>{
      if(!root.isConnected||!root.matches(selector)||root.closest('.us-report-no-styling')||own(root,'us-membership__content')!==state.content||own(root,'us-membership__status')!==state.status||own(root,'us-membership__retry')!==state.retry||state.signature!==signature(root)){
        state.generation++;observer?.unobserve(root);root.removeAttribute('aria-busy');states.delete(root);
      }
    });
    document.querySelectorAll(selector).forEach(root=>{
      if(root.closest('.us-report-no-styling'))return;
      let state=states.get(root);
      if(!state){const content=own(root,'us-membership__content'),status=own(root,'us-membership__status'),retry=own(root,'us-membership__retry');if(!content||!status||!retry)return;
        state={root,content,status,retry,ready:false,failed:false,loading:false,generation:0,signature:signature(root)};states.set(root,state);observer?.observe(root);
      }
      if(!state.ready&&!state.loading&&visible(root))void load(state);
    });
  }
  function signature(root){return JSON.stringify([...root.attributes].filter(a=>a.name.startsWith('data-us-')&&!['data-us-membership-state','data-us-membership-period'].includes(a.name)).map(a=>[a.name,a.value]));}
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(refresh);}}
  function reload(root){
    const state=states.get(root);if(!state)return;
    const folder=root.dataset.usStatsFolder?.trim().replace(/\/+$/,'');
    for(const [id,entry] of cache)if(entry.folder===folder)cache.delete(id);
    if(document.activeElement===state.retry){state.content.tabIndex=-1;state.content.focus({preventScroll:true});state.restoreFocus=true;}
    for(const other of states.values())if(other.root.dataset.usStatsFolder?.trim().replace(/\/+$/,'')===folder){other.generation++;other.ready=false;other.failed=false;other.loading=false;other.root.removeAttribute('aria-busy');}
    schedule();
  }
  document.addEventListener('click',event=>{const button=event.target.closest('.us-membership__retry'),root=button?.closest(selector),state=states.get(root);if(state&&button===state.retry){event.preventDefault();reload(root);}});
  document.addEventListener('us:sectionchange',schedule);document.addEventListener('visibilitychange',schedule);
  window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,{passive:true});
  // An embedded content page can finish loading while its parent tab is hidden.
  // Observe the owning frame's ancestors so its later reveal starts the queries.
  const parentObservers=[];
  function watchParents(){
    if(parentObservers.length)return;
    try {let child=window;while(child.frameElement){const frame=child.frameElement,parent=child.parent,watcher=new parent.MutationObserver(schedule);for(let node=frame;node;node=node.parentElement)watcher.observe(node,{attributes:true,attributeFilter:['hidden','style','class']});parent.addEventListener('us:sectionchange',schedule);parent.addEventListener('scroll',schedule,{passive:true});parentObservers.push({watcher,parent});child=parent;}}catch{/* Cross-origin hosts must delay iframe navigation until their tab is visible. */}
  }
  window.addEventListener('pagehide',()=>{for(const {watcher,parent} of parentObservers){watcher.disconnect();parent.removeEventListener('us:sectionchange',schedule);parent.removeEventListener('scroll',schedule);}parentObservers.length=0;});
  window.addEventListener('pageshow',()=>{watchParents();schedule();});watchParents();
  window.UnionSuiteMembership={refresh:schedule,reload};
  function start(){refresh();new MutationObserver(records=>{if(records.some(r=>r.type==='childList'||r.attributeName==='class'||r.attributeName==='hidden'||r.attributeName==='style'||r.attributeName?.startsWith('data-us-')))schedule();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','style','data-us-membership','data-us-stats-folder','data-us-time-zone','data-us-financial-codes','data-us-group-label','data-us-start-parameter','data-us-end-parameter',...Object.keys(queries).map(type=>'data-us-query-'+type)]});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
/* US-MEMBERSHIP-STATS:END */

/* US-COPY:START — reusable, delegated clipboard control. */
(function () {
  'use strict';
  if (window.UnionSuiteCopy) return;
  window.UnionSuiteCopy = {version:'1.0'};
  var pending = new WeakSet(), resets = new WeakMap(), flashes = new WeakMap();
  var live;
  function announce(text) {
    if (!live || !live.isConnected) {
      live = document.createElement('span'); live.className = 'us-copy-announcement';
      live.setAttribute('role','status'); live.setAttribute('aria-live','polite');
      document.body.appendChild(live);
    }
    live.textContent = text;
  }
  function fallback(text) {
    var active = document.activeElement;
    var selection = window.getSelection();
    var ranges = [];
    if (selection) for (var i = 0; i < selection.rangeCount; i++) ranges.push(selection.getRangeAt(i).cloneRange());
    var input = document.createElement('textarea');
    input.value = text;
    input.readOnly = true;
    input.style.cssText = 'position:fixed;top:0;left:-9999px;';
    document.body.appendChild(input);
    try {
      input.select();
      if (!document.execCommand('copy')) throw new Error('Copy unavailable');
    } finally {
      input.remove();
      if (active && active.isConnected) active.focus({preventScroll:true});
      if (selection) { selection.removeAllRanges(); ranges.forEach(function (range) { selection.addRange(range); }); }
    }
  }

  document.addEventListener('click', async function (event) {
    var button = event.target.closest('button.us-copy, button.us-banner__copy');
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true' || pending.has(button) || button.closest('.us-report-no-styling')) return;
    var targetId = button.getAttribute('data-us-copy-target');
    var target;
    if (targetId) {
      var matches = Array.from(document.querySelectorAll('[id]')).filter(function (node) { return node.id === targetId; });
      if (matches.length === 1) target = matches[0];
    } else if (button.matches('.us-banner__copy')) {
      var record = button.closest('.us-banner__record');
      target = record && record.querySelector('.us-banner__record-id');
    }
    var oldTitle = button.getAttribute('title');
    var previous = resets.get(button);
    if (previous) { clearTimeout(previous.timer); oldTitle = previous.title; }
    button.removeAttribute('data-us-copy-state');
    announce('');
    pending.add(button);
    var oldBusy = button.getAttribute('aria-busy');
    button.setAttribute('aria-busy','true');
    try {
      if (!target || target.contains(button)) throw new Error('Missing, duplicate or recursive target');
      var text = (target.matches('input,textarea') ? target.value : target.textContent).trim();
      if (!text) throw new Error('Empty target');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try { await navigator.clipboard.writeText(text); } catch (_) { fallback(text); }
      } else { fallback(text); }
      button.setAttribute('data-us-copy-state','success');
      button.setAttribute('title','Copied');
      announce('Copied');
      if (target.isConnected) {
        clearTimeout(flashes.get(target));
        target.classList.remove('us-copy-flash');
        void target.offsetWidth;
        target.classList.add('us-copy-flash');
        flashes.set(target,setTimeout(function () { target.classList.remove('us-copy-flash'); flashes.delete(target); },700));
      }
    } catch (_) {
      button.setAttribute('data-us-copy-state','error');
      button.setAttribute('title','Could not copy');
      announce('Could not copy. Select the text and copy it manually.');
    } finally {
      pending.delete(button);
      if (oldBusy === null) button.removeAttribute('aria-busy'); else button.setAttribute('aria-busy',oldBusy);
      resets.set(button,{title:oldTitle,timer:setTimeout(function () {
        button.removeAttribute('data-us-copy-state');
        if (oldTitle === null) button.removeAttribute('title'); else button.setAttribute('title',oldTitle);
        resets.delete(button);
      },1600)});
    }
  });
})();
/* US-COPY:END */

/* US-BANNER-DETAILS:START */
(function () {
  'use strict';
  if (window.UnionSuiteBannerDetails) { window.UnionSuiteBannerDetails.refresh(); return; }
  var states = new WeakMap(), sequence = 0, scheduled = false;
  function excerpt(text, limit) {
    var chars = Array.from(text);
    if (chars.length <= limit) return text;
    var short = chars.slice(0, limit - 1).join('');
    var boundary = short.lastIndexOf(' ');
    if (boundary > limit * .65) short = short.slice(0, boundary);
    return short.trimEnd() + '…';
  }
  function render(state) {
    var full = state.full.textContent.trim();
    var limit = Number(state.root.getAttribute('data-us-description-limit'));
    if (!Number.isInteger(limit) || limit < 2) limit = 300;
    var shortened = excerpt(full, limit), long = shortened !== full;
    if (!long) state.open = false;
    if (state.short.textContent !== shortened) state.short.textContent = shortened;
    state.short.hidden = !long || state.open;
    state.full.hidden = long && !state.open;
    state.button.hidden = !long;
    var expansionChanged = state.button.getAttribute('aria-expanded') !== String(state.open);
    state.button.setAttribute('aria-expanded', String(state.open));
    var label = state.open ? 'Show less' : 'Read more';
    if (state.button.textContent !== label) state.button.textContent = label;
    if (expansionChanged && window.UnionSuiteBanners) window.UnionSuiteBanners.refresh();
  }
  function refresh() {
    document.querySelectorAll('.us-banner .us-banner__description[data-us-description-limit]').forEach(function (root) {
      if (root.closest('.us-report-no-styling')) return;
      var full = root.querySelector('[data-us-description-full]');
      if (!full) return;
      var state = states.get(root);
      if (!state || state.full !== full || !root.contains(state.button)) {
        root.querySelectorAll('[data-us-description-generated]').forEach(function (node) { node.remove(); });
        var short = document.createElement('span'), button = document.createElement('button');
        short.setAttribute('data-us-description-generated','');
        button.setAttribute('data-us-description-generated','');
        button.type = 'button'; button.className = 'us-banner__description-toggle';
        if (!full.id) { do { full.id = 'us-description-' + (++sequence); } while (document.getElementById(full.id) !== full && document.getElementById(full.id)); }
        button.setAttribute('aria-controls', full.id);
        root.insertBefore(short,full); root.appendChild(button);
        state = {root:root,full:full,short:short,button:button,open:false};
        states.set(root,state);
        button.addEventListener('click',function () {
          var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          var animate = !reduced && typeof root.animate === 'function';
          var before = animate ? root.getBoundingClientRect().height : 0;
          if (state.animation) { state.animation.cancel(); state.animation = null; }
          state.open = !state.open;
          render(state);
          if (!state.open && window.UnionSuiteBanners && window.UnionSuiteBanners.descriptionClosed) {
            window.UnionSuiteBanners.descriptionClosed(root.closest('.us-banner__surface'));
          }
          if (animate) {
            var after = root.getBoundingClientRect().height;
            if (Math.abs(after - before) > 1) {
              var animation = root.animate([
                {height:before + 'px',overflow:'hidden'},
                {height:after + 'px',overflow:'hidden'}
              ], {duration:240,easing:'cubic-bezier(.4,0,.2,1)'});
              state.animation = animation;
              animation.onfinish = function () { if (state.animation === animation) state.animation = null; };
            }
          }
        });
      }
      render(state);
    });
    document.querySelectorAll('.us-banner .us-banner__facts[data-us-hide-empty-facts]').forEach(function (list) {
      if (list.closest('.us-report-no-styling')) return;
      var facts = Array.from(list.children).filter(function (node) { return node.classList.contains('us-banner__fact'); });
      facts.forEach(function (fact) {
        var value = Array.from(fact.children).find(function (node) { return node.tagName === 'DD'; });
        var blank = !value || !value.textContent.trim();
        if (blank && !fact.hidden) { fact.hidden = true; fact.setAttribute('data-us-empty-fact',''); }
        else if (!blank && fact.hasAttribute('data-us-empty-fact')) { fact.hidden = false; fact.removeAttribute('data-us-empty-fact'); }
      });
      var empty = facts.length && facts.every(function (fact) { return fact.hidden; });
      if (empty && !list.hidden) { list.hidden = true; list.setAttribute('data-us-empty-facts',''); }
      else if (!empty && list.hasAttribute('data-us-empty-facts')) { list.hidden = false; list.removeAttribute('data-us-empty-facts'); }
    });
  }
  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(function () { scheduled = false; refresh(); }); } }
  window.UnionSuiteBannerDetails = {refresh:refresh,excerpt:excerpt};
  function start() { refresh(); new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-us-description-limit','data-us-hide-empty-facts']}); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
/* US-BANNER-DETAILS:END */

/* US-SWITCH:START — delegated, native checkbox state; no persistence. */
(function(){
  if(window.UnionSuiteSwitches)return;
  const timers=new WeakMap();
  document.addEventListener('change',function(event){
    const input=event.target;
    if(!input.matches?.('.us-switch > input[type="checkbox"]')||input.disabled)return;
    const label=input.parentElement;
    clearTimeout(timers.get(label));label.classList.remove('is-switch-moving');
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    void label.offsetWidth;label.classList.add('is-switch-moving');
    timers.set(label,setTimeout(()=>{label.classList.remove('is-switch-moving');timers.delete(label);},260));
  });
  window.UnionSuiteSwitches=Object.freeze({version:1});
})();
/* US-SWITCH:END */
