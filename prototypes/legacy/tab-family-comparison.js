// Local state simulation only. Each navigation level owns its own panel.
document.querySelectorAll('[role=tablist]').forEach(list=>{
 const tabs=[...list.querySelectorAll('[role=tab]')],panel=document.getElementById(tabs[0]?.getAttribute('aria-controls'));if(!panel)return;
 function select(i,focus){tabs.forEach((t,j)=>{t.classList.toggle('is-active',i===j);if(t.classList.contains('rtsLink'))t.classList.toggle('rtsSelected',i===j);t.setAttribute('aria-selected',String(i===j));t.tabIndex=i===j?0:-1;});panel.setAttribute('aria-labelledby',tabs[i].id);const h=panel.querySelector(':scope > h3');if(h)h.textContent=tabs[i].textContent;if(focus)tabs[i].focus({preventScroll:true});}
 tabs.forEach((tab,i)=>{tab.addEventListener('click',e=>{e.preventDefault();select(i,false);});tab.addEventListener('keydown',e=>{const vertical=list.getAttribute('aria-orientation')==='vertical';let next;if(e.key===(vertical?'ArrowDown':'ArrowRight'))next=(i+1)%tabs.length;else if(e.key===(vertical?'ArrowUp':'ArrowLeft'))next=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();select(next,true);});});
});
