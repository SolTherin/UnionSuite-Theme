import { guid } from './contracts.js';
import { webRoot } from './api.js';

const activePageEditors = new WeakMap();

export function pageEditingEnabled(win) {
  // The native flag is authoritative: the live parent has true without the
  // body class. Fall back to native markers only when the flag is unavailable.
  if (typeof win.gIsEasyEditEnabled === 'boolean') return win.gIsEasyEditEnabled;
  return !!(win.document.body?.classList.contains('TemplateAreaEasyEditOn') || win.document.querySelector('.ste-toggle.on'));
}

export function contentEditorUrl(win, id) {
  let context;
  try { context = JSON.parse(win.document.getElementById('__ClientContext')?.value || '{}'); } catch { /* Older pages expose gWebSiteRoot instead. */ }
  const root = new URL(context?.websiteRoot || win.gWebSiteRoot || `${webRoot(win)}/`, win.location.origin);
  if (root.origin !== win.location.origin || !/^https?:$/.test(root.protocol) || root.username || root.password) throw new Error('The Content Designer website root must be same-origin.');
  root.pathname = root.pathname.replace(/\/*$/, '/'); root.search = ''; root.hash = '';
  const url = new URL('AsiCommon/Controls/ContentManagement/ContentDesigner/ContentRecordEdit.aspx', root);
  url.search = new URLSearchParams({ Mode:'Maximized', iUniformKey:guid(id), iOperation:'Edit', TemplateType:'E', DocumentTypeCode:'CON' }).toString();
  return url.href;
}

export function openPageEditor(win, page, button, signal, closed) {
  if (signal.aborted || !pageEditingEnabled(win)) return;
  if (activePageEditors.has(win)) throw new Error('Close the current page editor before editing another tab.');
  const launch = win.ShowDialog_NoReturnValue;
  if (typeof launch !== 'function') throw new Error('Content Designer is unavailable on this page. Reload the containing page and try again.');
  const url = contentEditorUrl(win, page.id);
  let finished = false, closeTimer = null;
  const session = {};
  const release = () => {
    if (activePageEditors.get(win) === session) activePageEditors.delete(win);
    button.removeAttribute('aria-disabled');
  };
  const abort = () => {
    finished = true; win.clearTimeout(closeTimer); release();
  };
  const onClose = () => {
    if (finished) return;
    finished = true; release();
    // Our close handler runs before iMIS's closeHandler. Defer refresh/focus
    // until native dialog teardown and focus restoration have completed.
    closeTimer = win.setTimeout(() => {
      signal.removeEventListener('abort', abort);
      if (!signal.aborted) closed();
    }, 0);
  };
  activePageEditors.set(win, session);
  button.setAttribute('aria-disabled', 'true');
  signal.addEventListener('abort', abort, { once:true });
  try {
    // Verified on the deployed iMIS: argument 8 is beforeClose, argument 12
    // is close. Neither is a Save-only notification. The native helper adds
    // IsPopup/DialogCacheParam and maximizes ContentRecordEdit itself.
    launch.call(win, url, null, '90%', '90%', `Edit ${page.caption} page`, null, 'E', null, null, false, false, onClose, null);
  } catch (error) {
    abort(); signal.removeEventListener('abort', abort); throw error;
  }
}
