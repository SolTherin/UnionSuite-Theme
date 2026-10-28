// Offline preview only: no upload or native Telerik event interception.
(()=>{
 function setup(frame){
  const doc=frame.contentDocument;
  const input=doc?.querySelector('.us-native-form-preview :is([id$="_AppThemeEditControl_UploadPanel"],[id$="_ImporterControlPanel"] [id$="_FileUploadPanel"]) .ruFileInput');
  if(!input||input.dataset.dropPreview)return;
  const extension=input.closest('[id$="_ImporterControlPanel"]')?'.xml':'.zip';
  input.dataset.dropPreview='true';input.accept=extension;
  const zone=input.closest('.PanelField');
  const status=doc.createElement('p');status.className='upload-preview-status';status.setAttribute('role','status');status.textContent='Choose a '+extension.slice(1).toUpperCase()+' file or drag it here. Preview only — no upload.';zone.append(status);
  let depth=0;
  const files=e=>Array.from(e.dataTransfer?.types||[]).includes('Files');
  const reset=()=>{depth=0;zone.classList.remove('is-file-dragover')};
  zone.addEventListener('dragenter',e=>{if(!files(e)||input.disabled)return;e.preventDefault();depth++;zone.classList.add('is-file-dragover')});
  zone.addEventListener('dragover',e=>{if(!files(e)||input.disabled)return;e.preventDefault();e.dataTransfer.dropEffect='copy'});
  zone.addEventListener('dragleave',()=>{if(--depth<=0)reset()});
  zone.addEventListener('drop',e=>{
   if(!files(e))return;e.preventDefault();reset();if(input.disabled)return;
   const list=Array.from(e.dataTransfer.files);
   if(list.length!==1||!list[0].name.toLowerCase().endsWith(extension)){status.textContent='Choose one '+extension.slice(1).toUpperCase()+' file.';return}
   if(list[0].size>112400*1024){status.textContent='File exceeds the 112400 KB limit.';return}
   const transfer=new DataTransfer();transfer.items.add(list[0]);input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  input.addEventListener('change',()=>{status.textContent=input.files.length?'Selected: '+input.files[0].name+' — not uploaded.':'No file selected.'});
  doc.addEventListener('dragend',reset);doc.addEventListener('drop',reset);
 }
 document.querySelectorAll('iframe').forEach(frame=>{frame.addEventListener('load',()=>setup(frame));if(frame.contentDocument?.readyState==='complete')setup(frame)});
})();
