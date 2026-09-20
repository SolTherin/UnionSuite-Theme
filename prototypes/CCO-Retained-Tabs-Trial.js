/* Console-only trial for CCO-Testing.aspx. Reload the outer page to remove.
 * Native tab clicks are intercepted only for this CCO. No server configuration is changed.
 * Frame load is document completion, not proof that all queries or saves succeeded.
 */
(() => {
  'use strict';
  const config = { ownerId: 'ste_container_ciDirectory', parameter: 'Directory', height: 800, preloadDelay: 1500, timeout: 45000 };
  if (window !== window.top) throw new Error('Run in the OUTER page Console, not a child frame.');
  if (!location.pathname.endsWith('/CCO-Testing.aspx')) throw new Error('Open CCO-Testing.aspx first.');
  if (window.usCcoTrial) throw new Error('Reload the outer page to remove the previous trial first.');
  if (typeof window.ShowDialog_NoReturnValue !== 'function') throw new Error('Outer popup helper is missing.');
  const root = document.getElementById(config.ownerId);
  const cco = root?.querySelector('.cco');
  const strip = cco?.querySelector(':scope > .RadTabStrip, :scope > .RadTabStripVertical');
  const multi = cco?.querySelector(':scope > .RadMultiPage');
  const links = [...(strip?.querySelectorAll(':scope > .rtsLevel > .rtsUL > .rtsLI > .rtsLink') || [])];
  const names = links.map(a => a.querySelector('.rtsTxt')?.textContent.trim() || a.textContent.trim());
  const initial = links.findIndex(a => a.classList.contains('rtsSelected'));
  if (!multi || initial < 0 || new Set(names).size !== names.length) throw new Error('Expected one CCO with unique tab labels and a selected tab.');
  const disabled = i => links[i].getAttribute('aria-disabled') === 'true' || links[i].classList.contains('rtsDisabled');
  const base = new URL(location.href);
  base.hash = '';
  // DocumentVersionKey values from the active folder export, 12 September 2026.
  const contentKeys = {
    'People search': 'db3c1d27-64f4-4fc3-a733-574e6121f885',
    'Overview': '3c14817d-43ac-4e27-8322-51b07abcf579',
    'About': '91e8d33b-da44-43eb-8374-0331e97157ab',
    'Finance': 'cdc342af-d36b-41f4-b018-df6e4f9bcacd',
    'Notes and Interactions': '82e89200-9ece-4f43-8451-bc14a7ca8f60',
    'Worksite Search': 'e811b19d-bd9d-445e-9830-18bd45651018'
  };
  if (names.some(name => !Object.hasOwn(contentKeys, name))) throw new Error('Unmapped tab. Update the trial from the current folder export.');
  function tabUrl(i, framed = true) {
    const u = framed ? new URL('/iMIS/ContentManagement/ContentPreview.aspx', base.origin) : new URL(base);
    if (!framed) {
      for (const key of [...u.searchParams.keys()]) {
        if ([config.parameter.toLowerCase(), 'templatetype'].includes(key.toLowerCase())) u.searchParams.delete(key);
      }
      u.searchParams.set(config.parameter, names[i]);
      return u.href;
    }
    const reserved = new Set([config.parameter.toLowerCase(), 'templatetype', 'imode', 'iuniformkey', 'ioperation', 'documenttypecode', 'dialogcacheparam', 'ispopup', 'popup']);
    base.searchParams.forEach((value,key) => { if (!reserved.has(key.toLowerCase())) u.searchParams.append(key,value); });
    Object.entries({iMode:'Execute', iUniformKey:contentKeys[names[i]], iOperation:'Execute', TemplateType:'E', DocumentTypeCode:'CON', IsPopup:'true'})
      .forEach(([key,value]) => u.searchParams.set(key,value));
    return u.href;
  }
  document.getElementById('us-about-popup-test')?.remove();
  document.getElementById('us-cco-frame-test')?.remove();
  const host = document.createElement('div');
  host.id = 'us-cco-retained-trial';
  host.style.cssText = 'min-width:0;grid-column:2;grid-row:1';
  host.hidden = true;
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.style.cssText = 'margin:0;padding:8px 12px;font:13px system-ui';
  const fallback = document.createElement('a');
  fallback.textContent = 'Open selected tab normally';
  fallback.style.cssText = 'display:inline-block;margin:0 12px 8px';
  host.append(status, fallback);
  multi.after(host);
  const entries = new Map();
  let current = initial;
  const nativeDisplay = multi.style.display;
  links.forEach((a,i) => { if (!a.id) a.id = 'us-cco-retained-tab-' + i; });
  function report() {
    const entry = entries.get(current);
    status.textContent = entry?.state === 'loaded'
      ? names[current] + ' — retained frame. ' + (entry.bridge ? 'Outer popup bridge installed.' : 'Popup bridge unavailable on this page.')
      : entry?.state === 'timeout' ? names[current] + ' is taking longer than expected; loading may still finish. Use the normal-page link if needed.'
      : 'Loading ' + names[current] + '…';
    fallback.href = tabUrl(current, false);
  }
  function load(i) {
    if (entries.has(i)) return entries.get(i).done;
    const frame = document.createElement('iframe');
    frame.id = 'us-cco-retained-frame-' + i;
    frame.title = names[i];
    frame.style.cssText = 'width:100%;height:' + config.height + 'px;border:0;background:white';
    frame.style.display = current === i ? 'block' : 'none';
    frame.hidden = current !== i;
    const entry = { frame, state: 'loading', bridge: false };
    let finish;
    entry.done = new Promise(resolve => { finish = resolve; });
    entries.set(i, entry);
    const timer = setTimeout(() => { entry.state = 'timeout'; finish(); if (current === i) report(); }, config.timeout);
    // Reinstall after every frame navigation, including native postbacks.
    frame.addEventListener('load', () => {
      if (!root.isConnected) return;
      clearTimeout(timer);
      entry.state = 'loaded';
      entry.bridge = false;
      try {
        const child = frame.contentWindow;
        if (typeof child.ShowDialog_NoReturnValue === 'function') {
          child.ShowDialog_NoReturnValue = function (...args) {
            return window.ShowDialog_NoReturnValue.apply(window, args);
          };
          entry.bridge = true;
        }
      } catch (error) { console.warn('[CCO trial] Frame access unavailable:', names[i], error.name); }
      finish();
      if (current === i) report();
      console.info('[CCO trial] Document loaded:', names[i], 'popup bridge:', entry.bridge);
    });
    frame.src = tabUrl(i);
    host.append(frame);
    return entry.done;
  }
  function select(i) {
    if (!Number.isInteger(i) || !links[i] || disabled(i)) return;
    current = i;
    strip.setAttribute('aria-activedescendant', links[i].id);
    multi.style.display = i === initial ? nativeDisplay : 'none';
    host.hidden = i === initial;
    host.style.display = i === initial ? 'none' : 'block';
    links.forEach((a,n) => {
      a.classList.toggle('rtsSelected', n === i);
      a.classList.remove('rtsBefore', 'rtsAfter', 'rtsHoverBefore', 'rtsHoverAfter');
      a.setAttribute('aria-selected', String(n === i));
      if (n !== initial) a.setAttribute('aria-controls', 'us-cco-retained-frame-' + n);
      a.tabIndex = n === i ? 0 : -1;
    });
    entries.forEach((entry,n) => {
      entry.frame.hidden = n !== i;
      entry.frame.style.display = n === i ? 'block' : 'none';
    });
    if (i !== initial) { load(i); report(); }
  }
  const events = new AbortController();
  window.addEventListener('click', e => {
    const i = links.findIndex(a => a === e.target || a.contains(e.target));
    if (i < 0) return;
    e.preventDefault(); e.stopImmediatePropagation(); select(i);
  }, {capture:true, signal:events.signal});
  window.addEventListener('keydown', e => {
    const i = links.indexOf(e.target);
    if (i < 0) return;
    const enabled = links.map((_,n) => n).filter(n => !disabled(n));
    const at = enabled.indexOf(i);
    let next = i;
    if (['ArrowRight','ArrowDown'].includes(e.key)) next = enabled[(at+1)%enabled.length];
    else if (['ArrowLeft','ArrowUp'].includes(e.key)) next = enabled[(at+enabled.length-1)%enabled.length];
    else if (e.key === 'Home') next = enabled[0];
    else if (e.key === 'End') next = enabled.at(-1);
    else if (!['Enter',' '].includes(e.key)) return;
    e.preventDefault(); e.stopImmediatePropagation(); links[next].focus(); select(next);
  }, {capture:true, signal:events.signal});
  window.usCcoTrial = {select, entries, names, config};
  select(initial);
  const preload = setTimeout(async () => {
    for (let i=0; i<names.length; i++) {
      if (!root.isConnected) break;
      if (i !== initial && !disabled(i)) await load(i);
    }
  }, config.preloadDelay);
  const observer = new MutationObserver(() => {
    if (root.isConnected && strip.isConnected && multi.isConnected) return;
    clearTimeout(preload); events.abort(); host.remove(); observer.disconnect();
    console.warn('[CCO trial] Native CCO was replaced. Reload before reinstalling the trial.');
  });
  observer.observe(document.body, {childList:true, subtree:true});
  console.info('[CCO trial] Installed for', names, 'with native initial content:', names[initial]);
})();
