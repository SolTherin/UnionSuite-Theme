
const query=document.querySelector('.tb-search-input'),body=document.querySelector('.tb-dd-body'),dropdown=document.querySelector('#tb-search-dropdown');
const names=['Alex Morgan','Morgan Engineering','Jamie Morgan','Taylor Morgan','Sam Morgan','Casey Morgan','Robin Morgan','Jordan Morgan','Drew Morgan','Morgan Regional Services'];
const rows=names.map((name,i)=>({name,kind:(i===1||i===9)?'organisation':'person',id:String(900101+i),meta:i===1?'Employer · Active':i===9?'Workplace · Active':i===5?'Regular Member · Suspended':'Regular Member · Active',email:'demo'+(i+1)+'@example.com',phone:'0400 111 '+String(100+i)}));
let mode='name';
function node(tag,cls,text){const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n}
function render(){
 dropdown.hidden=false;body.replaceChildren();
 if(['loading','empty','error'].includes(mode)){
 const message=node('div','tb-dd-msg',mode==='loading'?'Searching…':mode==='empty'?'No matching records. Try a name, ID, email or mobile.':'Search unavailable. Please try again.');
 message.setAttribute('role','status');
 if(mode==='loading'&&document.body.dataset.proposed==='true'){message.classList.add('tb-dd-loading');const spinner=node('span','section-loader-spinning-circles');spinner.setAttribute('aria-hidden','true');message.prepend(spinner)}
 body.append(message);return}
 const term=query.value.toLowerCase(),matches=rows.filter(r=>[r.name,r.id,r.email,r.phone].some(v=>v.toLowerCase().includes(term)));
 if(!matches.length){body.append(node('div','tb-dd-msg','No matching records. Try another search.'));return}
 for(const r of matches){const a=node('a','tb-dd-item');a.href='#';const info=node('div','');info.style.minWidth='0';info.append(node('div','tb-dd-name',r.name),node('div','tb-dd-meta',r.meta));if(mode==='email'||mode==='phone'){
 const value=mode==='email'?r.email:r.phone,line=node('div','tb-dd-match'),start=value.toLowerCase().indexOf(term);
 line.append(document.createTextNode(mode==='email'?'Preferred email: ':'Preferred mobile: '));
 if(start>=0&&term){line.append(document.createTextNode(value.slice(0,start)),node('strong','',value.slice(start,start+term.length)),document.createTextNode(value.slice(start+term.length)))}else line.append(document.createTextNode(value));info.append(line)}
 if(document.body.dataset.proposed==='true'){
 const icon=node('span','tb-dd-kind '+r.kind);icon.setAttribute('aria-hidden','true');
 icon.innerHTML=r.kind==='organisation'?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V4h11v17M15 10h5v11M2 21h20M8 21v-4h3v4M7 8h1m3 0h1M7 12h1m3 0h1m6 2h1m-1 3h1"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg>';
 a.append(icon);info.className='tb-dd-info';
 }
 a.append(info,node('span','tb-dd-id',r.id));a.onclick=e=>{e.preventDefault();document.querySelector('.demo-feedback').textContent='Demo selection: '+r.name+' ('+r.id+'). No navigation.'};body.append(a)}
}
query.oninput=()=>{if(['loading','empty','error'].includes(mode))mode='name';render()};
query.onfocus=()=>dropdown.hidden=false;
document.addEventListener('keydown',e=>{if(e.key==='Escape'){dropdown.hidden=true;query.focus();dropdown.hidden=true}if(['ArrowDown','ArrowUp'].includes(e.key)){const items=[...body.querySelectorAll('a')];if(!items.length)return;e.preventDefault();let i=items.indexOf(document.activeElement);i=e.key==='ArrowDown'?(i+1)%items.length:(i-1+items.length)%items.length;items[i].focus()}});
window.addEventListener('message',e=>{if(e.source!==parent||!e.data?.taskbarDemo)return;mode=e.data.taskbarDemo;query.value=mode==='email'?'example.com':mode==='phone'?'111':'morgan';render()});
const go=document.querySelector('.tb-btn');go.onclick=()=>{go.disabled=true;if(document.body.dataset.proposed==='true'){go.replaceChildren(node('span','demo-ring'));go.setAttribute('aria-label','Checking record')}else go.textContent='Checking…';setTimeout(()=>{go.disabled=false;go.textContent='Go';go.removeAttribute('aria-label');document.querySelector('.demo-feedback').textContent='Demo lookup complete. No record opened.'},1200)};
render();
