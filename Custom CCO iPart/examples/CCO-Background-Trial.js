/* Console-only CCO trial. Run on CCO-Testing.aspx with People selected.
   Reload the outer page to remove. Not production theme code.
   iframe load measures document completion, not completion of all native queries. */
(() => {
  'use strict';
  if (!location.pathname.endsWith('/CCO-Testing.aspx')) throw new Error('Open CCO-Testing.aspx first.');
  if (window.usCcoTrial) throw new Error('Trial already installed. Reload to start again.');
  const root = document.getElementById('ste_container_ciDirectory');
  const strip = root?.querySelector('.RadTabStrip');
  const multi = root?.querySelector('.RadMultiPage');
  const links = [...(strip?.querySelectorAll('a[role="tab"]') || [])];
  const names = ['People', 'Employer', 'Worksite', 'Finance'];
  if (!multi || links.length !== names.length || links.some((a,i) => a.textContent.trim() !== names[i])) throw new Error('Expected People, Employer, Worksite and Finance in that order.');
  if (links[0].getAttribute('aria-selected') !== 'true') throw new Error('Select People, then run again.');
  const keys = [
    'f9a46552-dad4-444a-81b5-845b1d0128e2',
    '742faab7-8f9a-4dca-8dae-965de830e0d6',
    'a7511b39-bd45-4902-a0e1-a847e6f0778c',
    '90ae814b-5b09-42ff-947d-5210d20d728f'
  ];
  // Preserve repeated values and encoding; never override the child renderer route.
  // Directory belongs to the outer CCO and must not select a nested child CCO.
  const reserved = new Set(['imode','iuniformkey','ioperation','templatetype','documenttypecode','dialogcacheparam','ispopup','directory']);
  const url = i => {
    const child = new URL('/iMIS/ContentManagement/ContentPreview.aspx', location.origin);
    Object.entries({iMode:'Execute', iUniformKey:keys[i], iOperation:'Execute', TemplateType:'E', DocumentTypeCode:'CON', IsPopup:'true'})
      .forEach(([name,value]) => child.searchParams.set(name,value));
    new URLSearchParams(location.search).forEach((value,name) => {
      if (!reserved.has(name.toLowerCase())) child.searchParams.append(name,value);
    });
    return child.href;
  };
  document.getElementById('us-cco-frame-test')?.remove();
  const host = document.createElement('div');
  host.id = 'us-cco-trial';
  const status = document.createElement('p');
  status.setAttribute('role','status');
  status.style.cssText='padding:8px 12px;margin:0;font:13px system-ui';
  host.append(status);
  multi.after(host);
  const frames = new Map();
  let current = 0;
  function report() {
    const entry = frames.get(current);
    status.textContent = current === 0 ? 'Trial: People uses its original content.' : entry?.loaded ? 'Trial: ' + names[current] + ' — retained page. Reload the outer page to remove this trial.' : 'Loading ' + names[current] + '…';
  }
  function load(i) {
    if (frames.has(i)) return frames.get(i).done;
    const frame = document.createElement('iframe');
    frame.id = 'us-cco-trial-panel-' + i;
    frame.title = names[i] + ' directory';
    frame.style.cssText='display:block;width:100%;height:700px;border:0;background:white';
    frame.hidden = current !== i;
    // Explicit display is needed because existing theme rules may override [hidden].
    frame.style.display = current === i ? 'block' : 'none';
    const entry = {frame, loaded:false};
    entry.done = new Promise(resolve => {
      frame.addEventListener('load', () => {
        entry.loaded = true;
        console.info('[CCO trial] Frame document loaded:', names[i]);
        report();
        resolve();
      }, {once:true});
    });
    frames.set(i, entry);
    frame.src = url(i);
    host.append(frame);
    return entry.done;
  }
  function select(i) {
    current = i;
    multi.style.display = i === 0 ? '' : 'none';
    links.forEach((link,n) => {
      link.classList.toggle('rtsSelected',n===i);
      link.classList.remove('rtsBefore','rtsAfter','rtsHoverBefore','rtsHoverAfter');
      link.setAttribute('aria-selected',String(n===i));
      link.tabIndex = n===i ? 0 : -1;
      if(n) link.setAttribute('aria-controls','us-cco-trial-panel-'+n);
    });
    frames.forEach((entry,n) => {
      entry.frame.hidden = n!==i;
      entry.frame.style.display = n===i ? 'block' : 'none';
    });
    if(i) load(i);
    report();
  }
  // Capture before Telerik's ordinary tab click. No native client-state changes.
  function click(e) {
    const index = links.findIndex(a => a === e.target || a.contains(e.target));
    if(index < 0) return;
    e.preventDefault(); e.stopImmediatePropagation(); select(index);
  }
  function key(e) {
    const index = links.indexOf(e.target);
    if(index < 0) return;
    let next = index;
    if(e.key==='ArrowRight') next=(index+1)%names.length;
    else if(e.key==='ArrowLeft') next=(index+names.length-1)%names.length;
    else if(e.key==='Home') next=0;
    else if(e.key==='End') next=names.length-1;
    else if(!['Enter',' '].includes(e.key)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    links[next].focus(); select(next);
  }
  window.addEventListener('click',click,true);
  window.addEventListener('keydown',key,true);
  window.usCcoTrial = {select, frames};
  select(0);
  // Selected-tab clicks may start their frame immediately; speculative work is serial.
  setTimeout(async () => { for (let i=1; i<names.length; i++) await load(i); }, 1000);
  console.info('[CCO trial] Installed. Native People stays in place; Employer, Worksite, then Finance preload. Reload to remove.');
})();
