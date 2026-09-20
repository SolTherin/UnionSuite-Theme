
// Offline preview only. Never invokes supplied business handlers.
const datasets={native:[['',['Email','View public profile','Print info','Donate','Order','Register','Generate renewal','Resolve duplicates']]],quick:[['',['Email Member','SMS Member']],['',['Add Note','Add New Job']],['',['Create Case','Create Quick Case']],['',['Resolve Duplicate']],['',['Assign Workbench']]],agreement:[['Add entry',['Add Note / Attachment','Add Contact','Add Meeting','Add Task','Add Milestone']],['Agreement management',['Update Details','Clone Agreement']],['Communication',['Email Negotiating Team','Email Members']]],banner:[['Record',['View details','Edit details']],['Create',['Add note','Add task']],['More',['Archive record']]]};
const glyphs={Email:'mail','View public profile':'user','Print info':'printer','Add Note / Attachment':'note','Add Contact':'address-book','Add Meeting':'calendar','Add Task':'square-check','Add Milestone':'flag','Update Details':'pencil','Clone Agreement':'copy','Email Negotiating Team':'mail','Email Members':'mail','View details':'eye','Edit details':'pencil','Add note':'note','Add task':'square-check','Archive record':'archive'};
function render(){const type=document.querySelector('#source').value;document.querySelectorAll('.stage').forEach(stage=>{stage.innerHTML='<div class="stage-bar"><span>'+({native:'Native iMIS',quick:'Member quick actions',agreement:'Agreement · A126',banner:'Shared record banner'}[type])+'</span></div><details open><summary class="trigger">'+(type==='quick'?'Quick Actions':'Actions')+'</summary><div class="menu"></div></details>';const menu=stage.querySelector('.menu');datasets[type].forEach(([label,items])=>{const group=document.createElement('section');if(label){const heading=document.createElement('div');heading.className='group-label';heading.textContent=label;group.append(heading)}items.forEach(name=>{const b=document.createElement('button');b.type='button';b.className='item';if(document.querySelector('#icons').checked){const i=document.createElement('i');i.className='ti ti-'+(glyphs[name]||'chevron-right');i.setAttribute('aria-hidden','true');b.append(i)}b.append(document.createTextNode(name));group.append(b)});menu.append(group)});const nested=document.createElement('section');nested.className='submenu-example';const subId='submenu-'+stage.closest('.option').classList[1];nested.innerHTML='<button type="button" class="item submenu-trigger" aria-expanded="false" aria-controls="'+subId+'">Export / share<span aria-hidden="true">›</span></button><div class="menu submenu" id="'+subId+'" hidden><div class="group-label">Export / share</div><button type="button" class="item">Download PDF</button><button type="button" class="item">Download CSV</button><button type="button" class="item">Copy link</button></div>';menu.prepend(nested);const trigger=nested.querySelector('.submenu-trigger'),sub=nested.querySelector('.submenu');
if(stage.closest('.v5')){const glow=document.createElement('span');glow.className='submenu-traveller';glow.setAttribute('aria-hidden','true');sub.append(glow)}
let layoutAnimation=null;
const geometry=()=>{const css=getComputedStyle(sub);return {height:sub.getBoundingClientRect().height+'px',paddingTop:css.paddingTop,paddingBottom:css.paddingBottom,marginTop:css.marginTop,marginBottom:css.marginBottom}};
const collapsed={height:'0px',paddingTop:'0px',paddingBottom:'0px',marginTop:'0px',marginBottom:'0px'};
const closeSub=(focus=false,instant=false)=>{
 const from=sub.hidden?null:geometry();layoutAnimation?.cancel();layoutAnimation=null;
 trigger.setAttribute('aria-expanded','false');if(focus||sub.contains(document.activeElement))trigger.focus();sub.inert=true;
 const inline=matchMedia('(max-width:950px)').matches||document.body.classList.contains('mobile');
 if(from&&!instant&&stage.closest('.v5')&&inline&&stage.querySelector('details').open&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
  sub.classList.add('is-closing');layoutAnimation=sub.animate([from,collapsed],{duration:400,easing:'cubic-bezier(.22,1,.36,1)'});
  layoutAnimation.onfinish=()=>{sub.hidden=true;sub.classList.remove('is-closing');layoutAnimation=null};
 }else{sub.hidden=true;sub.classList.remove('is-closing')}
};
sub.closePreview=closeSub;
const openSub=(focus=false)=>{const from=sub.hidden?collapsed:geometry();layoutAnimation?.cancel();layoutAnimation=null;sub.inert=false;sub.classList.remove('is-closing');stage.querySelectorAll('.submenu-trigger').forEach(other=>{if(other!==trigger){other.setAttribute('aria-expanded','false');document.getElementById(other.getAttribute('aria-controls')).hidden=true}});trigger.setAttribute('aria-expanded','true');sub.classList.remove('is-drawing');sub.hidden=false;sub.removeAttribute('style');if(!matchMedia('(max-width:950px)').matches&&!document.body.classList.contains('mobile')){const r=trigger.getBoundingClientRect(),w=Math.min(250,innerWidth-24);sub.style.width=w+'px';const x=r.right+w<=innerWidth-12?r.right-2:Math.max(12,r.left-w+2);sub.style.left=x+'px';sub.style.top=Math.max(12,Math.min(r.top,innerHeight-sub.offsetHeight-12))+'px';}const inline=matchMedia('(max-width:950px)').matches||document.body.classList.contains('mobile');
if(stage.closest('.v4')&&inline&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
 const style=getComputedStyle(sub),height=sub.getBoundingClientRect().height;
 if(stage.closest('.v5')){sub.style.setProperty('--submenu-travel',(height-14)+'px');
 // Commit the reset before starting both decorative animations together.
 void sub.offsetHeight;sub.classList.add('is-drawing');}
 const reveal=sub.animate([from,{height:height+'px',paddingTop:style.paddingTop,paddingBottom:style.paddingBottom,marginTop:style.marginTop,marginBottom:style.marginBottom}],{duration:400,easing:'cubic-bezier(.22,1,.36,1)'});
 layoutAnimation=reveal;reveal.onfinish=()=>{layoutAnimation=null;if(focus&&!sub.hidden)sub.querySelector('button').focus()};
}else if(focus)sub.querySelector('button').focus()};
trigger.addEventListener('click',()=>trigger.getAttribute('aria-expanded')==='true'?closeSub():openSub());trigger.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();openSub(true)}});nested.addEventListener('keydown',e=>{if((e.key==='Escape'||e.key==='ArrowLeft')&&!sub.hidden){e.preventDefault();e.stopPropagation();closeSub(true)}});stage.querySelector('details').addEventListener('toggle',e=>{if(!e.target.open)closeSub(false,true)});
if(document.querySelector('#states').checked){const section=document.createElement('section');section.innerHTML='<div class="group-label">State examples</div><button class="item" disabled>Unavailable action</button><button class="item danger">Delete example</button>';menu.append(section)}if(stage.closest('.v5'))animateActionMenu(stage);stage.querySelector('details').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();if(e.currentTarget.closePreviewMenu)e.currentTarget.closePreviewMenu();else e.currentTarget.open=false;e.currentTarget.querySelector('summary').focus()}});});}
document.querySelectorAll('#source,#icons,#states').forEach(c=>c.addEventListener('change',render));document.querySelector('#width').addEventListener('change',e=>{document.body.classList.toggle('mobile',e.target.checked);closeSubmenus(true)});document.addEventListener('click',e=>{const item=e.target.closest('.item');if(!item||item.disabled||item.classList.contains('submenu-trigger'))return;document.querySelector('#status').textContent=item.textContent+' — preview only; no action was run.';const d=item.closest('details');d.open=false;d.querySelector('summary').focus()});render();

function closeSubmenus(instant=false){document.querySelectorAll('.submenu').forEach(s=>s.closePreview?.(false,instant))}window.addEventListener('resize',()=>closeSubmenus(true));window.addEventListener('scroll',e=>{if(!matchMedia('(max-width:950px)').matches&&!document.body.classList.contains('mobile')&&!e.target.closest?.('.submenu'))closeSubmenus()},true);document.addEventListener('click',e=>{if(!e.target.closest('.submenu-example'))closeSubmenus()});

// Option 5: animate the outer disclosure's real height; native details stays open until collapse finishes.
function animateActionMenu(stage){
 const details=stage.querySelector('details'),summary=details.querySelector('summary'),menu=summary.nextElementSibling;
 let wanted=details.open,motion=null;
 summary.setAttribute('aria-expanded',String(wanted));
 const zero={height:'0px',paddingTop:'0px',paddingBottom:'0px',marginTop:'0px',borderTopWidth:'0px',borderBottomWidth:'0px'};
 const measure=()=>{const s=getComputedStyle(menu);return {height:menu.getBoundingClientRect().height+'px',paddingTop:s.paddingTop,paddingBottom:s.paddingBottom,marginTop:s.marginTop,borderTopWidth:s.borderTopWidth,borderBottomWidth:s.borderBottomWidth}};
 function setOpen(open){
  const from=details.open?measure():zero;motion?.cancel();motion=null;wanted=open;
  summary.setAttribute('aria-expanded',String(open));menu.inert=!open;
  if(!open&&menu.contains(document.activeElement))summary.focus();
  if(matchMedia('(prefers-reduced-motion:reduce)').matches){details.open=open;menu.classList.remove('menu-moving');return}
  details.open=true;
  const to=open?measure():zero;menu.classList.add('menu-moving');
  motion=menu.animate([from,to],{duration:400,easing:'cubic-bezier(.22,1,.36,1)'});
  motion.onfinish=()=>{motion=null;menu.classList.remove('menu-moving');details.open=wanted};
 }
 summary.addEventListener('click',e=>{e.preventDefault();setOpen(!wanted)});
 details.closePreviewMenu=()=>setOpen(false);
 details.addEventListener('toggle',()=>{if(!details.open){motion?.cancel();motion=null;wanted=false;summary.setAttribute('aria-expanded','false');menu.inert=true;menu.classList.remove('menu-moving')}});
}
