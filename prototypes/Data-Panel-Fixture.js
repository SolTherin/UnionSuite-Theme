// Offline example only: no iMIS handlers, record writes or server requests.
(() => {
  const proposed=document.body.dataset.variant==='proposed';
  const definitions=[['status','Status','select',['A - Active','I - Inactive']],['title','Functional title','select',['','Member services','Organiser']],['added','Date added','readonly'],['mobile','Mobile phone','text'],['gender','Gender','select',['','Woman','Man','Non-binary','Prefer not to say']],['updated','Last updated','readonly'],['work','Work phone','text'],['birth','Date of birth','date'],['by','Last updated by','readonly'],['email','Email','email'],['key','Major key','text'],['resume','Resume','file']];
  const initial={status:'A - Active',title:'',added:'8/09/2026',mobile:'',gender:'',updated:'8/09/2026 11:42 AM',work:'',birth:'',by:'DEMOUSER',email:'jamie.morgan@example.org',key:'',resume:''};
  let saved={...initial}, editing=false;
  const grid=document.querySelector('.field-grid'),form=document.querySelector('form'),edit=document.querySelector('[data-edit]'),status=document.querySelector('[role=status]');
  const size=()=>parent.postMessage({type:'data-panel-size',id:document.body.dataset.variant,height:document.body.scrollHeight+8},'*');
  function render(focus=false){
    grid.replaceChildren();form.className=editing?'PanelEditorEditForm':'PanelEditorReadOnlyForm';
    definitions.forEach(([key,label,type,choices])=>{
      const field=document.createElement('div');field.className='PanelField Top'+(!editing||type==='readonly'?' ReadOnly':'');
      const caption=document.createElement(editing&&type!=='readonly'?'label':'span');caption.className='Label';caption.textContent=label;
      const value=document.createElement('div');value.className='PanelFieldValue';
      if(editing&&type==='file'){
        if(!proposed)value.classList.add('us-report-no-styling');
        value.innerHTML='<div class="RadAsyncUpload RadUpload RadUpload_Orion RadUploadPanel"><ul class="ruInputs"><li><span class="ruFileWrap ruStyled"><input type="text" class="ruFakeInput" tabindex="-1" readonly aria-label="Selected resume"><input type="button" class="ruButton ruBrowse" value="Select" tabindex="-1"><input type="file" id="field-resume" class="ruFileInput" accept=".pdf,.doc,.docx" aria-describedby="resume-rules"></span><div class="ruDropZone" style="display:none"><span>Drop files here</span></div></li></ul></div><div class="RadUploadPanelMessage" id="resume-rules"><ul><li>Types: pdf, doc, docx</li><li>Maximum 109.77 MB</li></ul></div>';
        caption.htmlFor='field-resume';const chooser=value.querySelector('[type=file]'),fake=value.querySelector('.ruFakeInput'),zone=value.querySelector('.ruDropZone');fake.value=saved.resume;
        chooser.addEventListener('change',()=>{fake.value=chooser.files[0]?.name||saved.resume;});
        // Offline visual simulation only. Live Telerik owns its own drag/drop and validation.
        value.addEventListener('dragover',e=>{if(Array.from(e.dataTransfer?.types||[]).includes('Files')){e.preventDefault();zone.style.display='block';}});
        value.addEventListener('dragleave',e=>{if(!value.contains(e.relatedTarget))zone.style.display='none';});
        value.addEventListener('drop',e=>{e.preventDefault();zone.style.display='none';status.textContent='Preview only: use Select to choose a file. Nothing is uploaded.';});
      }else if(editing&&type!=='readonly'){
        const input=document.createElement(type==='select'?'select':'input');input.id='field-'+key;input.name=key;caption.htmlFor=input.id;
        if(type==='select')choices.forEach(text=>{const option=document.createElement('option');option.value=text;option.textContent=text||'(None)';input.append(option);});else input.type=type;
        input.value=saved[key];value.append(input);
      }else if(key==='email'&&saved[key]){const link=document.createElement('a');link.href='mailto:'+saved[key];link.textContent=saved[key];value.append(link);}
      else{value.textContent=saved[key]||(proposed?'—':'');if(!saved[key]){value.classList.add('empty');value.setAttribute('aria-label','Not provided');}}
      field.append(caption,value);grid.append(field);
    });
    document.querySelector('.LocalButtonBar').hidden=!editing;edit.disabled=editing;edit.setAttribute('aria-pressed',String(editing));
    if(focus)form.querySelector('input,select')?.focus();requestAnimationFrame(size);
  }
  edit.addEventListener('click',()=>{editing=true;status.textContent='';render(true);});
  document.querySelector('[data-cancel]').addEventListener('click',()=>{editing=false;render();edit.focus();status.textContent='Changes discarded in this example.';});
  form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;saved.resume=form.querySelector('.ruFakeInput')?.value||saved.resume;new FormData(form).forEach((value,key)=>saved[key]=value);editing=false;render();edit.focus();status.textContent='Saved in this example only.';});
  const dialog=document.querySelector('dialog');document.querySelector('[data-settings]').addEventListener('click',()=>dialog.showModal());document.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
  window.addEventListener('message',event=>{if(event.source!==parent||event.data?.type!=='data-panel-command')return;const {action,value}=event.data;
    if(action==='mode')editing=value==='edit';
    if(action==='reset'){saved={...initial};editing=false;status.textContent='';}
    if(action==='filled'){saved=value?{...initial,title:'Member services',mobile:'0400 000 000',gender:'Prefer not to say',work:'03 9000 0000',birth:'1988-04-12',key:'DEMO-1042'}:{...initial};}
    render();
  });
  new ResizeObserver(size).observe(document.body);render();
})();
