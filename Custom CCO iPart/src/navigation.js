// Ordinary same-origin page links should leave the CCO, while native controls
// continue to use their own handlers and the child's independent Web Forms state.
export function installChildNavigation(child) {
  const originals = new Map();
  function restore(link) {
    if (!originals.has(link)) return;
    const target = originals.get(link);
    if (link.getAttribute('target') === '_parent') {
      if (target === null) link.removeAttribute('target');
      else link.setAttribute('target', target);
    }
    originals.delete(link);
  }
  function click(event) {
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    restore(link);
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (link.hasAttribute('download') || link.getAttribute('role') === 'button' || link.hasAttribute('onclick')) return;
    if (link.getAttribute('data-us-cco-navigation') === 'child') return;
    const target = (link.getAttribute('target') || child.document.querySelector('base[target]')?.getAttribute('target') || '').toLowerCase();
    if (target && target !== '_self') return; // Respect explicit new/named windows and parent/top targets.
    let url;
    try { url = new URL(link.getAttribute('href'), child.document.baseURI); } catch { return; }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== child.location.origin) return;
    // Same-page anchors, filter links and paging stay in their child document.
    if (url.pathname.toLowerCase() === child.location.pathname.toLowerCase()) return;
    const filename = url.pathname.split('/').pop();
    if (/\.[^./]+$/.test(filename) && !/\.aspx$|\.html?$/i.test(filename)) return;
    if (/^(?:download|export|attachment)[^/]*\.aspx$/i.test(filename)) return;
    if ([...url.searchParams.keys()].some(key => /^(?:download|downloadfile|attachment)$/i.test(key))) return;
    originals.set(link, link.getAttribute('target'));
    // Leave default navigation to the browser: later handlers may still cancel,
    // and normal beforeunload/unsaved-change handling remains intact.
    link.setAttribute('target', '_parent');
  }
  child.document.addEventListener('click', click);
  return () => {
    child.document.removeEventListener('click', click);
    for (const link of originals.keys()) restore(link);
  };
}
