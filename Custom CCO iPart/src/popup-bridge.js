const bridgeMarker = Symbol('UnionSuiteCCO.popupBridge');

export function installPopupBridge(child, parent) {
  let original, wrapper, disposed = false;
  function reconcile() {
    if (disposed) return;
    try {
      const current = child.ShowDialog_NoReturnValue;
      if (current === wrapper || typeof current !== 'function' || current[bridgeMarker]) return;
      original = current;
      let forwarding = false;
      wrapper = function (...args) {
        const target = parent.ShowDialog_NoReturnValue;
        if (typeof target !== 'function') return original.apply(child, args);
        if (target === wrapper || forwarding) throw new Error('CCO popup forwarding loop prevented.');
        forwarding = true;
        try { return target.apply(parent, args); } // Preserve callback function objects and their child closure.
        finally { forwarding = false; }
      };
      wrapper[bridgeMarker] = true;
      child.ShowDialog_NoReturnValue = wrapper;
    } catch { /* Navigation may temporarily make the frame inaccessible. */ }
  }
  reconcile();
  const timer = parent.setInterval(reconcile, 500); // Also catches helper replacement during a partial update.
  return () => {
    disposed = true;
    parent.clearInterval(timer);
    try { if (wrapper && child.ShowDialog_NoReturnValue === wrapper) child.ShowDialog_NoReturnValue = original; } catch { /* Navigated away. */ }
  };
}
