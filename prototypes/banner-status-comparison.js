/* Preview controls only; no fixed production status mapping. */
const samples=[['Financial member','#23845B'],['Overdue member','#D58A10'],['Former member','#BD454B'],['Non member','#596579']];
const label=document.getElementById('label'),hex=document.getElementById('hex'),colour=document.getElementById('colour');
function luminance(c){const n=c.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return n[0]*.2126+n[1]*.7152+n[2]*.0722;}
function whiteTextColour(input){
  if(window.UnionSuiteMemberStatus)return window.UnionSuiteMemberStatus.displayColour(input);
  if(1.05/(luminance(input)+.05)>=4.5)return input.toUpperCase();
  const channels=input.slice(1).match(/../g).map(v=>parseInt(v,16));
  const shade=factor=>'#'+channels.map(v=>Math.floor(v*factor).toString(16).padStart(2,'0')).join('').toUpperCase();
  let low=0,high=1;
  for(let i=0;i<24;i++){const mid=(low+high)/2;if(1.05/(luminance(shade(mid))+.05)>=4.5)low=mid;else high=mid;}
  return shade(low);
}
function update(){
  if(!/^#[0-9a-f]{6}$/i.test(hex.value)){document.getElementById('feedback').textContent='Enter a six-digit hex colour, for example #23845B.';return;}
  const source=hex.value.toUpperCase(),c=whiteTextColour(source),l=luminance(c);
  const style=document.documentElement.style;
  style.setProperty('--status',c);
  style.setProperty('--status-ink','#FFFFFF');
  style.setProperty('--status-readable',c);
  style.setProperty('--status-inner-edge',l<.14?'rgba(255,255,255,.5)':'transparent');
  style.setProperty('--status-outer-edge',l>.65?'rgba(36,62,75,.35)':'transparent');
  document.querySelectorAll('.us-banner__surface--member').forEach(n=>n.setAttribute('data-us-status-colour',source));
  window.UnionSuiteMemberStatus?.refresh();
  colour.value=source;
  document.querySelectorAll('.status-label').forEach(n=>n.textContent=label.value||'Status not supplied');
  document.getElementById('feedback').textContent='Client colour '+source+' · Display colour '+c+(source!==c?' (darkened for white text).':'.')+' The pill and strip match; white text has at least 4.5:1 contrast.';
}document.getElementById('preset').addEventListener('change',e=>{[label.value,hex.value]=samples[e.target.value];update();});label.addEventListener('input',update);hex.addEventListener('input',update);colour.addEventListener('input',()=>{hex.value=colour.value;update();});update();
document.querySelector('form').addEventListener('submit',e=>e.preventDefault());
