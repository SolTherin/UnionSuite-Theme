// Preview only: sample destinations and viewport controls. No data requests or writes.
(() => {
  const page=document.body, dialog=document.querySelector('dialog');
  document.getElementById('preview-width').addEventListener('click',event=>{
    const narrow=page.classList.toggle('is-narrow');
    event.currentTarget.setAttribute('aria-pressed',String(narrow));
    event.currentTarget.textContent=narrow?'Wide view':'Narrow view';
  });
  document.addEventListener('click',event=>{
    const link=event.target.closest('.us-contact__name[href],.us-contact__workplace > a[href]');
    if(!link)return;
    event.preventDefault();
    document.getElementById('contact-dialog-title').textContent=link.textContent.trim();
    document.getElementById('contact-dialog-detail').textContent=link.classList.contains('us-contact__name')?'Contact profile':'Workplace profile';
    dialog.showModal();
  });
  for(const id of ['close-contact','done-contact'])document.getElementById(id).addEventListener('click',()=>dialog.close());
})();
