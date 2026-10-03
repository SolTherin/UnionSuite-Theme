/* US-TASK-ROWS:START — task checkbox, completion effect and save.
   Candidate 1.1 (agreement page): generated from the theme block by
   prototypes/wip/agreement-page/build-task-rows-candidate.cjs with only
   defineSaver, the save() lookup and the celebrate export added. Load it
   before zUnionSuite.js; the theme copy then steps aside. */
(function () {
  'use strict';
  if (window.UnionSuiteTaskRows) {window.UnionSuiteTaskRows.refresh();return;}
  const selector='.us-task[data-us-task-completed]:has(> [data-us-task-toggle])';
  const dueLabels=new WeakMap(), runs=new Map();
  const personalMemberLabels = new WeakMap();
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let scheduled=false;
  const completed=root=>/^(true|1)$/i.test((root.getAttribute('data-us-task-completed')||'').trim());
  function syncPersonalTaskLabels() {
    let loggedInPartyId = '';
    try {
      const context = JSON.parse(document.getElementById('__ClientContext')?.value || '{}');
      if (context.isAnonymous !== true && ['string', 'number'].includes(typeof context.loggedInPartyId)) {
        loggedInPartyId = String(context.loggedInPartyId).trim();
      }
    } catch (_) { /* Missing or invalid client context leaves the authored name. */ }
    document.querySelectorAll('.us-task .us-task__member-name').forEach(link => {
      const memberId = (link.getAttribute('data-id') || '').trim();
      const personal = loggedInPartyId && memberId === loggedInPartyId && !link.closest('.us-report-no-styling');
      const original = personalMemberLabels.get(link);
      if (personal) {
        const saved = original || {
          nodes: [...link.childNodes],
          href: link.getAttribute('href'),
          tabindex: link.getAttribute('tabindex'),
          disabled: link.getAttribute('aria-disabled')
        };
        personalMemberLabels.set(link, saved);
        if (link.textContent !== 'Personal Task') {
          saved.nodes = [...link.childNodes];
          link.textContent = 'Personal Task';
        }
        if (link.hasAttribute('href')) saved.href = link.getAttribute('href');
        link.removeAttribute('href');
        if (link.getAttribute('tabindex') !== '-1') link.setAttribute('tabindex', '-1');
        if (link.getAttribute('aria-disabled') !== 'true') link.setAttribute('aria-disabled', 'true');
      } else if (original) {
        // Restore the authored name and link when context or row identity changes.
        if (link.textContent === 'Personal Task') link.replaceChildren(...original.nodes);
        for (const [attribute, value] of [['href', original.href], ['tabindex', original.tabindex], ['aria-disabled', original.disabled]]) {
          if (value === null) link.removeAttribute(attribute); else link.setAttribute(attribute, value);
        }
        personalMemberLabels.delete(link);
      }
    });
  }
  function sync() {
    syncPersonalTaskLabels();
    runs.forEach((run,root)=>{if(!root.isConnected||root.closest('.us-report-no-styling'))run.stopMotion();});
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
  // Completion is stored on the i4u_UT_Interactions row the result came from.
  // PUT updates that row; POST would create a second interaction. The row carries
  // its own identity, so a list whose query does not supply one stays local.
  const saveEntity='i4u_UT_Interactions', saveField='FollowUpActioned';
  function identity(root) {
    const partyId=(root.getAttribute('data-us-task-party-id')||'').trim();
    const ordinal=(root.getAttribute('data-us-task-ordinal')||'').trim();
    return partyId && /^\d+$/.test(ordinal) ? {partyId, ordinal:Number(ordinal)} : null;
  }
  function saveBody(id, done) {
    const property=(name,value)=>({'$type':'Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts', Name:name, Value:value});
    const identityData=(entity,values)=>({
      '$type':'Asi.Soa.Core.DataContracts.IdentityData, Asi.Contracts',
      EntityTypeName:entity,
      IdentityElements:{'$type':'System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib', '$values':values}
    });
    // Partial update: the row key must appear in the identity and as a property,
    // and a Boolean field needs its typed wrapper or iMIS rejects the write.
    return {
      '$type':'Asi.Soa.Core.DataContracts.GenericEntityData, Asi.Contracts',
      EntityTypeName:saveEntity,
      PrimaryParentEntityTypeName:'Party',
      Identity:identityData(saveEntity,[String(id.partyId),String(id.ordinal)]),
      PrimaryParentIdentity:identityData('Party',[String(id.partyId)]),
      Properties:{'$type':'Asi.Soa.Core.DataContracts.GenericPropertyDataCollection, Asi.Contracts', '$values':[
        property('ID',String(id.partyId)),
        property('Ordinal',{'$type':'System.Int32','$value':id.ordinal}),
        property(saveField,{'$type':'System.Boolean','$value':done})
      ]}
    };
  }
  // Candidate: a task row names another save target with
  // data-us-task-save="<key>". Each key is registered once with defineSaver;
  // rows without the attribute keep the i4u_UT_Interactions write below.
  const savers=new Map();
  function defineSaver(key, run) {
    if(typeof key!=='string'||!/^[a-z][a-z0-9.-]*$/.test(key))throw new TypeError('Task saver keys use lowercase letters, digits, dots and dashes.');
    if(typeof run!=='function')throw new TypeError('A task saver needs a function.');
    if(savers.has(key))throw new Error('Task saver '+key+' is already registered.');
    savers.set(key,run);
  }
  async function save(root, done) {
    const saverKey=(root.getAttribute('data-us-task-save')||'').trim();
    if(saverKey) {
      const saver=savers.get(saverKey);
      if(!saver) throw new Error('No task saver is registered for '+saverKey+'.');
      return saver({root, done});
    }
    const id=identity(root);
    if(!id) return;
    const token=document.querySelector('#__RequestVerificationToken');
    const response=await fetch(window.location.origin+'/api/'+saveEntity+'/'+encodeURIComponent(id.partyId)+'/'+id.ordinal, {
      method:'PUT',
      credentials:'same-origin',
      headers:{'Content-Type':'application/json', RequestVerificationToken:token?token.value:''},
      body:JSON.stringify(saveBody(id,done))
    });
    if(!response.ok) throw new Error(saveEntity+' update failed: '+response.status);
  }
  // A failed write must say so where the task is, not in a console nobody reads.
  function reportFailure(root) {
    root.querySelectorAll(':scope > .us-task__save-error').forEach(node=>node.remove());
    const message=document.createElement('span');
    message.className='us-task__save-error';
    message.setAttribute('role','status');
    message.textContent='Not saved. Try again.';
    root.appendChild(message);
    setTimeout(()=>message.remove(), 6000);
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
    // Restored verbatim if the write fails, so a rejected reopen keeps its own
    // actioned date rather than being stamped with today's.
    const originalDate=root.querySelector('.us-task__date')?.textContent;
    let saved=true;
    let motionStopped=false;
    // Scrolling or filtering can end the visual effect while the PUT is still
    // pending. Keep the run (and its click lock) until that request settles.
    function stopMotion() {
      if(motionStopped)return;
      motionStopped=true;
      clearTimeout(timer);
      release?.();
      animations.forEach(animation=>animation.cancel());
      particles.forEach(node=>node.remove());
      row.removeAttribute('data-us-task-exiting');
      row.inert=originalInert;
    }
    const run={stopMotion,finish:()=>{
      if(runs.get(root)!==run)return;
      stopMotion();
      runs.delete(root);
      const outcome=saved?done:!done;
      root.setAttribute('data-us-task-completed',String(outcome));
      root.removeAttribute('data-us-task-changing');
      row.removeAttribute('data-us-task-exiting');row.inert=originalInert;
      button.setAttribute('aria-checked',String(outcome));
      button.title=outcome?'Reopen task':'Mark complete';
      root.classList.toggle('us-task--complete',outcome);
      const date=root.querySelector('.us-task__date');
      if(date) date.textContent=saved
        ? (done?'Actioned '+new Intl.DateTimeFormat(document.documentElement.lang||'en-AU',{day:'numeric',month:'short',year:'numeric'}).format(new Date()):dueLabels.get(root)||'')
        : (originalDate||'');
      if(!saved) reportFailure(root);
      window.UnionSuiteIqaFilters?.refresh();schedule();
    }};
    runs.set(root,run);
    root.setAttribute('data-us-task-changing',String(done));
    button.setAttribute('aria-checked',String(done));button.title=done?'Reopen task':'Mark complete';
    root.classList.toggle('us-task--complete',done);
    const showCompleted=!!wrapper?.querySelector('.us-task-completed-toggle[aria-pressed="true"]');
    // The write starts with the tick, so the celebration covers the round trip.
    const request=save(root,done).catch(error=>{saved=false;console.warn(error.message);});
    if(!done||reducedMotion.matches||typeof root.animate!=='function'){
      await request;
      if(done&&saved&&!showCompleted)moveFocus(row,set,wrapper);
      run.finish();return;
    }
    if(!showCompleted){moveFocus(row,set,wrapper);row.inert=true;row.setAttribute('data-us-task-exiting','');}
    try {
      const mark=button.querySelector('svg path');
      if(mark&&typeof mark.getTotalLength==='function'){
        const length=mark.getTotalLength();
        animations.push(mark.animate([{strokeDasharray:String(length),strokeDashoffset:length},{strokeDasharray:String(length),strokeDashoffset:0}],{duration:280,easing:'ease-out'}));
      }
      const duration=celebrate(button,animations,particles);
      await pause(duration+(showCompleted?0:100));
      if(motionStopped)return;
      // The row only leaves once iMIS has accepted the change; a rejected write
      // brings it back with its original state instead of hiding a lost edit.
      await request;
      if(motionStopped||showCompleted||!saved)return;
      const slide=root.animate([{transform:'translateX(0)',opacity:1},{transform:'translateX(-105%)',opacity:0}],{duration:450,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
      animations.push(slide);await slide.finished;
      if(motionStopped)return;
      const collapse=row.animate([{height:row.getBoundingClientRect().height+'px',minHeight:'0px'},{height:'0px',minHeight:'0px',paddingTop:'0px',paddingBottom:'0px',borderTopWidth:'0px'}],{duration:300,easing:'ease-in-out',fill:'forwards'});
      animations.push(collapse);await collapse.finished;
    } catch(error) {if(error.name!=='AbortError')console.warn('Task animation could not finish.');}
    finally {await request;run.finish();}
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-us-task-toggle]'), root=button?.closest(selector);
    if(root&&!root.closest('.us-report-no-styling')){event.preventDefault();void toggle(root);return;}
    if(event.target.closest('.us-task-completed-toggle')) runs.forEach((run,task)=>{if(task.closest('[data-us-query-display]')===event.target.closest('[data-us-query-display]'))run.stopMotion();});
  });
  document.addEventListener('input',event=>{
    if(event.target.matches('.us-query-search-field input'))runs.forEach((run,task)=>{if(task.closest('[data-us-query-display]')===event.target.closest('[data-us-query-display]'))run.stopMotion();});
  });
  reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)runs.forEach(run=>run.stopMotion());});
  // Fixed celebration overlays must not drift when their source moves.
  addEventListener('scroll',()=>runs.forEach(run=>run.stopMotion()),true);
  addEventListener('resize',()=>runs.forEach(run=>run.stopMotion()));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)runs.forEach(run=>run.stopMotion());});
  // Candidate: the completion effect for other controls, such as a milestone
  // status. Resolves when the effect ends; does nothing under reduced motion.
  // Colours come from the --task-confetti-* properties on the element.
  function celebrateElement(element) {
    if(!(element instanceof Element)||reducedMotion.matches||typeof element.animate!=='function')return Promise.resolve();
    const animations=[],particles=[];
    const duration=celebrate(element,animations,particles);
    return new Promise(resolve=>setTimeout(()=>{particles.forEach(node=>node.remove());resolve();},duration));
  }
  window.UnionSuiteTaskRows={refresh:schedule,defineSaver,celebrate:celebrateElement,version:'1.1-candidate'};
  function start() {
    sync();
    new MutationObserver(records => {
      if (records.some(record => record.type === 'childList' ||
          ['data-us-task-completed', 'data-id', 'value'].includes(record.attributeName) ||
          record.target.closest('.us-report-no-styling') ||
          (record.attributeName === 'class' && record.target.querySelector('.us-task__member-name')))) schedule();
    }).observe(document.body, {subtree:true, childList:true, attributes:true,
      attributeFilter:['data-us-task-completed', 'data-id', 'value', 'class']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
/* US-TASK-ROWS:END */
