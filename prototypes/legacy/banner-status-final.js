// Preview commands never call real member functions.
for(const [key,label] of Object.entries({email:'Email Member',sms:'SMS Member','add-note':'Add Note','add-job':'Add New Job'})){
 window.UnionSuiteActions.define('preview.'+key,{className:'us-action-preview-'+key,owner:'preview',source:'banner-status-final.js:'+key,presentation:{label,menu:'menu-item'},context:{},action:{type:'function',run:()=>{document.getElementById('action-feedback').textContent=label+' selected — preview only; no member record was changed.';}}});
}
document.getElementById('show-tabs').addEventListener('change',e=>{
 document.querySelectorAll('.us-banner__nav').forEach(n=>n.hidden=!e.target.checked);
});
document.querySelectorAll('.us-banner__tab').forEach(button=>button.addEventListener('click',()=>{
 document.querySelectorAll('.us-banner__tab').forEach(tab=>{
  const selected=tab.textContent===button.textContent;
  tab.classList.toggle('is-active',selected);
  if(selected)tab.setAttribute('aria-current','true');else tab.removeAttribute('aria-current');
 });
 document.getElementById('action-feedback').textContent=button.textContent+' selected — section styling preview only; no page navigation.';
}));
