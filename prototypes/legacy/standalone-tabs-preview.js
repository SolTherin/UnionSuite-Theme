/* Local sample only: retain DOM nodes and values; do not intercept iMIS controls. */
(()=>{
 const shell=document.querySelector('.tab-shell'),tabs=[...shell.querySelectorAll('[role=tab]')];
 const panels=tabs.map(tab=>document.getElementById(tab.getAttribute('aria-controls')));
 if(panels.some(panel=>!panel)||new Set(panels).size!==tabs.length)return;
 function select(index,focus=false){tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;panels[i].hidden=i!==index;});if(focus)tabs[index].focus({preventScroll:true});if(focus||document.activeElement===tabs[index]){const tab=tabs[index],list=tab.parentElement;if(tab.offsetLeft<list.scrollLeft)list.scrollLeft=tab.offsetLeft;else if(tab.offsetLeft+tab.offsetWidth>list.scrollLeft+list.clientWidth)list.scrollLeft=tab.offsetLeft+tab.offsetWidth-list.clientWidth;}document.getElementById('switch-status').textContent=tabs[index].textContent+' · switched locally; other sections remain in memory.';}
 tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>select(i));tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;else if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();select(next,true);});});
 document.getElementById('surface').addEventListener('change',e=>shell.dataset.surface=e.target.value);
 document.getElementById('accent').addEventListener('input',e=>shell.style.setProperty('--tab-accent',e.target.value));
 document.getElementById('sticky').addEventListener('change',e=>shell.classList.toggle('sticky',e.target.checked));
 select(0);
})();
