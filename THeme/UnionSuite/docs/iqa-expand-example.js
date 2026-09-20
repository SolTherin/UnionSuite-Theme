// Guide-only ASP.NET lifecycle and native row-action simulation. No network requests.
// The loading presentation itself comes from the shared US-IQA-BUSY block.
(function(){
 const handlers={beginRequest:[],endRequest:[],pageLoading:[]},manager={};
 for(const name of Object.keys(handlers)){
  manager['add_'+name]=fn=>handlers[name].push(fn);
  manager['remove_'+name]=fn=>{handlers[name]=handlers[name].filter(item=>item!==fn)};
 }
 window.Sys={WebForms:{PageRequestManager:{getInstance:()=>manager}}};
 let timer=null;
 const demo=window.IqaExpandDemo={delay:900,cancelled:false,source:null,
  begin(source){
   clearTimeout(timer);
   document.getElementById('expand-example_UpdateProgress1').style.display='block';
   for(const fn of handlers.beginRequest)fn(manager,{get_postBackElement:()=>source});
  },
  end(error=null){
   clearTimeout(timer);
   document.getElementById('expand-example_UpdateProgress1').style.display='none';
   for(const fn of handlers.endRequest)fn(manager,{get_error:()=>error});
  }
 };
 document.addEventListener('click',event=>{
  const control=event.target.closest('input.rgExpand,input.rgCollapse');
  if(control){
   event.preventDefault();
   if(demo.cancelled)return;
   demo.begin(demo.source||control);
   timer=setTimeout(()=>{
    const expanded=control.getAttribute('aria-expanded')!=='true';
    const detail=document.getElementById(control.getAttribute('aria-controls'));
    if(control.isConnected&&detail){
     detail.hidden=!expanded;
     control.setAttribute('aria-expanded',String(expanded));
     control.parentElement.setAttribute('aria-expanded',String(expanded));
     control.className=expanded?'rgCollapse':'rgExpand';
     control.value=expanded?'▾':'▸';
     control.title=expanded?'Collapse':'Expand';
     control.setAttribute('aria-label',control.getAttribute('aria-label').replace(/^(Expand|Collapse)/,control.title));
    }
    demo.end();
   },demo.delay);
  }
  if(event.target.closest('[data-demo-sort]')){
   event.preventDefault();
   document.getElementById('expand-example-status').textContent='Date sort activated. Native iMIS owns the actual sort request; this example makes no request.';
  }
 });
})();
