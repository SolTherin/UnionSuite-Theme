// Optional read-only console diagnostic. Paste into the containing iMIS page editor,
// not the CCO configuration popup. Does not submit, cancel saves, or print form values.
(() => {
  window.usCcoSaveTrace?.dispose();
  const controller = new AbortController();
  const summary = label => console.info('[CCO page-save trace]', label, {
    page: location.pathname,
    runtimeMounts: document.querySelectorAll('[data-us-cco]').length,
    configMounts: document.querySelectorAll('[data-us-cco-config]').length,
    runtimeInstalled: !!window.UnionSuiteCCO,
    configInstalled: !!window.UnionSuiteCCOEditor,
    nativeNamePresent: !!document.getElementById('ctl01_TemplateBody_ContentEditorChildControl_ContentItemName_TextField'),
    nativeNameEmpty: document.getElementById('ctl01_TemplateBody_ContentEditorChildControl_ContentItemName_TextField')?.value.trim() === ''
  });
  document.addEventListener('click', event => {
    const button = event.target.closest?.('button,input[type=submit],input[type=button],a');
    if (!button || !/save/i.test(button.id + ' ' + (button.textContent || button.value || ''))) return;
    summary('Save clicked');
    setTimeout(() => console.info('[CCO page-save trace]', 'click cancelled', event.defaultPrevented), 0);
  }, { capture: true, signal: controller.signal });
  document.addEventListener('submit', event => setTimeout(() => {
    console.info('[CCO page-save trace]', 'submit event cancelled', event.defaultPrevented);
  }, 0), { capture: true, signal: controller.signal });
  const manager = window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
  const begin = () => summary('ASP.NET request begins');
  const end = (sender, args) => {
    summary('ASP.NET request ends');
    console.info('[CCO page-save trace]', 'ASP.NET error present', !!args.get_error?.());
  };
  manager?.add_beginRequest(begin); manager?.add_endRequest(end);
  window.usCcoSaveTrace = { dispose() {
    controller.abort(); manager?.remove_beginRequest(begin); manager?.remove_endRequest(end);
    delete window.usCcoSaveTrace;
  } };
  summary('installed');
})();
