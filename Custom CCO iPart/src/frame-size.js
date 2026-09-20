// Keep each same-origin child in normal page flow without moving its Web Forms DOM.
export function installFrameSize(frame, host) {
  const child = frame.contentWindow, doc = child.document;
  const events = new child.AbortController();
  let pending = null, disposed = false;
  // The popup template sizes EmptyMasterContentPanel from its viewport. A
  // scrollable shell would feed that height back into our parent measurement.
  // Let the outer page flow naturally; keep nested iPart/widget sizing intact.
  const outsideComponents = ':not(:where(.ContentItemContainer, .iMIS-WebPart, .RadGrid, .RadWindow, :is(.ContentItemContainer, .iMIS-WebPart, .RadGrid, .RadWindow) *))';
  const style = doc.createElement('style');
  style.setAttribute('data-us-cco-frame-style', '');
  style.textContent = `
    /* The native base sets html/body/form to width:100%. With page margins that
       exceeds the iframe viewport. Auto width includes those margins instead. */
    html, body, body > form {
      box-sizing:border-box !important;
      width:auto !important; min-width:0 !important; max-width:100% !important;
      height:auto !important; min-height:0 !important; max-height:none !important;
      overflow:visible !important;
    }
    body { display:flow-root !important; overflow-wrap:anywhere; }
    /* Only page-shell wrappers: do not reset panels, grid columns or the
       containers that belong to a nested iPart, native grid or popup. */
    :is(#MainPanel, .EmptyMasterContentPanel, .ContentPanel, .container, .container-fluid, .wrapper, #doc, #doc2, #doc3, #doc4)${outsideComponents} {
      box-sizing:border-box !important;
      width:auto !important; min-width:0 !important; max-width:100% !important;
    }
    /* Override native inline popup height even when its resize callback writes
       again. This belongs only to the embedded page's outer template shell. */
    :is(#MainPanel, .EmptyMasterContentPanel)${outsideComponents} {
      height:auto !important; min-height:0 !important; max-height:none !important;
      overflow:visible !important;
    }
    /* Native outer layout rows assume padding in the containing CCO. That
       padding is outside this iframe and cannot balance its negative gutters.
       Clear only the page layout's outer margins; keep column padding, nested
       iPart/field rows, and rows in ordinary padded containers unchanged. */
    :is(.ContentWizardDisplay, .ContentPanel, .EmptyMasterContentPanel)${outsideComponents} > div:not(.container):not(.container-fluid) > .row${outsideComponents} {
      margin-left:0 !important; margin-right:0 !important;
    }
  `;
  doc.head.append(style);

  function measure() {
    pending = null;
    if (disposed || !frame.isConnected || !frame.getBoundingClientRect().width) return;
    const body = doc.body;
    if (!body) return;
    const bounds = body.getBoundingClientRect(), css = child.getComputedStyle(body);
    // Unlike documentElement.scrollHeight, body geometry can shrink below the
    // old viewport. flow-root includes floats and prevents collapsed margins.
    const bottom = bounds.top + child.scrollY + Math.max(bounds.height, body.scrollHeight) + (parseFloat(css.marginBottom) || 0);
    const minimum = parseFloat(host.getComputedStyle(frame).minHeight) || 0;
    const height = Math.ceil(Math.max(minimum, bottom));
    if (frame.style.height !== `${height}px`) frame.style.height = `${height}px`;
  }
  function queue() {
    if (!disposed && pending === null) pending = host.requestAnimationFrame(measure);
  }
  const content = new child.ResizeObserver(queue);
  content.observe(doc.documentElement);
  content.observe(doc.body);
  // Includes partial postbacks, expanded panels, text updates and validation.
  const mutations = new child.MutationObserver(queue);
  mutations.observe(doc.documentElement, { subtree:true, childList:true, characterData:true, attributes:true });
  const viewport = new host.ResizeObserver(queue);
  viewport.observe(frame); // Width changes and hidden-to-visible retained tabs.
  doc.addEventListener('load', queue, { capture:true, signal:events.signal });
  doc.fonts?.addEventListener('loadingdone', queue, { signal:events.signal });
  child.addEventListener('resize', queue, { signal:events.signal });
  measure();
  return () => {
    disposed = true;
    if (pending !== null) host.cancelAnimationFrame(pending);
    content.disconnect(); mutations.disconnect(); viewport.disconnect(); events.abort();
    style.remove();
  };
}
