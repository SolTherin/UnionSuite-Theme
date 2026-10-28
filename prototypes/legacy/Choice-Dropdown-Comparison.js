
document.querySelectorAll('[data-indeterminate]').forEach(e=>e.indeterminate=true);
document.querySelectorAll('.combo').forEach((combo,index)=>{
 const input=combo.querySelector('input'),toggle=combo.querySelector('button'),popup=combo.querySelector('.rcbSlide'),list=combo.querySelector('.rcbList'),status=combo.querySelector('.status');
 const values=['(None)','Invalid address','Return to sender'];let selected='Invalid address',active=-1;
 function draw(){list.replaceChildren();const term=input.value.toLowerCase();values.filter(v=>v.toLowerCase().includes(term)).forEach(v=>{const li=document.createElement('li');li.className='rcbItem';li.id='option-'+index+'-'+values.indexOf(v);li.role='option';li.setAttribute('aria-selected',String(v===selected));li.textContent=v;li.onmousedown=e=>e.preventDefault();li.onclick=()=>choose(v);list.append(li)});if(!list.children.length){const e=document.createElement('div');e.className='empty';e.textContent='No matching options';list.append(e)}active=-1;input.removeAttribute('aria-activedescendant')}
 function open(){popup.hidden=false;input.setAttribute('aria-expanded','true');toggle.setAttribute('aria-expanded','true')}
 function close(){popup.hidden=true;input.setAttribute('aria-expanded','false');toggle.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant')}
 function choose(v){selected=v;input.value=v;status.textContent='Selected: '+v;close()}
 input.oninput=()=>{draw();open()};toggle.onclick=()=>{if(popup.hidden){input.value='';draw();open();input.focus()}else close()};
 input.onkeydown=e=>{const items=[...list.querySelectorAll('[role=option]')];if(e.key==='Escape'){close();return}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();open();if(!items.length)return;active=(active+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;items.forEach((n,i)=>n.classList.toggle('rcbHovered',i===active));input.setAttribute('aria-activedescendant',items[active].id)}if(e.key==='Enter'&&active>=0&&!popup.hidden){e.preventDefault();choose(items[active].textContent)}};
 draw();
});

document.querySelectorAll('[name="checkbox-colour"]').forEach(control=>control.addEventListener("change",()=>{if(control.checked)document.querySelector(".orange").dataset.checkboxColour=control.value}));
