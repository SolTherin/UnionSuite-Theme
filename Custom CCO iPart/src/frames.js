import { installPopupBridge } from './popup-bridge.js';
import { pageUrl } from './history.js';
import { installChildNavigation } from './navigation.js';
import { installFrameSize } from './frame-size.js';

export class FrameStore {
  constructor(win, config, changed) {
    this.win = win;
    this.config = config;
    this.changed = changed;
    this.entries = new Map();
    this.disposed = false;
    this.idle = null;
    this.started = win.performance.now();
  }

  hasDirty() { return [...this.entries.values()].some(entry => entry.dirty); }

  syncAppearance(entry) {
    try {
      const parent = this.win.UnionSuiteAppearance;
      const child = entry.frame.contentWindow?.UnionSuiteAppearance;
      if (!parent || !child || parent.storageKey !== child.storageKey) return;
      const state = parent.getState();
      // Read the current parent preference, not the value when preload started.
      // receive also rechecks CSS availability after a hidden frame is revealed.
      child.receive(state.preference, state.storageAvailable);
    } catch (_) { /* Navigating/cross-origin documents are handled by the loader. */ }
  }

  syncPresentation(entry) {
    if (this.disposed || !entry?.documentLoaded || entry.state === 'error' || this.entries.get(entry.page.id) !== entry) return;
    const rect = entry.frame.getBoundingClientRect();
    const visible = entry.frame.isConnected && rect.width > 0 && rect.height > 0;
    if (visible) this.syncAppearance(entry);
    if (entry.presented) return;
    if (!visible) {
      this.win.clearTimeout(entry.revealTimer);
      entry.revealTimer = null;
      // A hidden preload can finish networking without having a usable layout.
      entry.state = 'ready';
      entry.resolve(entry);
      this.changed(entry);
      return;
    }
    if (entry.revealTimer != null) return;
    entry.state = 'loading';
    // Notify native widgets after their viewport becomes measurable.
    const child = entry.frame.contentWindow;
    child.dispatchEvent(new child.Event('resize'));
    entry.revealTimer = this.win.setTimeout(() => {
      entry.revealTimer = null;
      if (this.disposed || this.entries.get(entry.page.id) !== entry || entry.state === 'error') return;
      const bounds = entry.frame.getBoundingClientRect();
      if (!bounds.width || !bounds.height) { this.syncPresentation(entry); return; }
      this.syncAppearance(entry);
      entry.presented = true;
      entry.state = 'ready';
      entry.frame.style.removeProperty('visibility');
      entry.resolve(entry);
      this.changed(entry);
    }, 1200);
    this.changed(entry);
  }

  ensure(page, panel) {
    if (this.disposed) return null;
    if (this.entries.has(page.id)) return this.entries.get(page.id);
    const frame = this.win.document.createElement('iframe');
    frame.title = page.caption;
    frame.className = 'us-cco__frame';
    // Reserve the frame viewport without painting the child's unfinished layout.
    frame.style.visibility = 'hidden';
    frame.dataset.usCcoChild = 'true';
    frame.referrerPolicy = 'same-origin';
    const entry = { frame, page, panel, state: 'loading', dirty: false, cleanup: () => {}, start: this.win.performance.now(), loadCount: 0 };
    entry.ready = new Promise(resolve => { entry.resolve = resolve; });
    this.entries.set(page.id, entry);
    const fail = message => {
      if (this.disposed || entry.state === 'error' || this.entries.get(page.id) !== entry) return;
      this.win.clearTimeout(entry.timeout);
      entry.cleanup();
      entry.state = 'error';
      entry.error = message;
      frame.remove(); // Stop late/inaccessible loads; retry creates a fresh frame.
      entry.resolve(entry);
      this.changed(entry);
    };
    frame.addEventListener('error', () => fail('This page could not be loaded.'));
    frame.addEventListener('load', () => {
      if (this.disposed || entry.state === 'error' || this.entries.get(page.id) !== entry) return;
      entry.cleanup();
      try {
        const child = frame.contentWindow;
        if (child.location.href === 'about:blank') return;
        if (child.location.origin !== this.win.location.origin || !child.document?.body) throw new Error('This page is no longer accessible in a same-origin frame.');
        if (/\/(?:signin|login|accessdenied|error)(?:\.aspx|\/|$)/i.test(child.location.pathname)) throw new Error('The page redirected to a sign-in or error page. Check access and session status.');
        this.win.clearTimeout(entry.timeout);
        entry.loadCount++;
        entry.documentLoaded = true;
        this.syncAppearance(entry);
        entry.presented = false;
        frame.style.visibility = 'hidden';
        entry.dirty = false;
        entry.readyMs = this.win.performance.now() - entry.start;
        const events = new child.AbortController();
        const markDirty = event => {
          // Search/filter state is retained UI state, not an unsaved data edit.
          if (event.target.matches?.('input[type=search]') || event.target.closest?.('.FilterPanel, [role=search], [data-us-cco-search]')) return;
          if (event.target.matches?.('input:not([type=hidden]):not([type=button]):not([type=submit]), textarea, select, [contenteditable]')) entry.dirty = true;
        };
        child.document.addEventListener('input', markDirty, { capture: true, signal: events.signal });
        child.document.addEventListener('change', markDirty, { capture: true, signal: events.signal });
        // Optional explicit adapter hook after a verified native save; generic detection stays conservative.
        child.document.addEventListener('us-cco:clean', () => { entry.dirty = false; }, { signal: events.signal });
        const unbridge = this.config.popupBridge ? installPopupBridge(child, this.win) : () => {};
        const unnavigate = installChildNavigation(child);
        const unsize = installFrameSize(frame, this.win);
        child.addEventListener('beforeunload', event => {
          if (entry.dirty) { event.preventDefault(); event.returnValue = ''; }
        }, { signal: events.signal });
        // Ancestor page-section switching can reveal a CCO without selecting one
        // of its own tabs. Observe the frame's actual viewport in either case.
        const layout = new this.win.ResizeObserver(() => this.syncPresentation(entry));
        layout.observe(frame);
        entry.cleanup = () => {
          this.win.clearTimeout(entry.revealTimer); entry.revealTimer = null;
          layout.disconnect(); events.abort(); unbridge(); unnavigate(); unsize();
        };
        this.syncPresentation(entry);
      } catch (error) { fail(error.message || 'This page could not be inspected.'); }
    });
    entry.timeout = this.win.setTimeout(() => fail('This page did not finish loading within 45 seconds.'), 45000);
    frame.src = pageUrl(this.win, page.id);
    panel.append(frame);
    this.changed(entry);
    return entry;
  }

  retry(page, panel) {
    const entry = this.entries.get(page.id);
    if (entry) {
      this.win.clearTimeout(entry.timeout);
      entry.cleanup();
      entry.frame.remove();
      entry.resolve(entry);
      this.entries.delete(page.id);
    }
    return this.ensure(page, panel);
  }

  schedule(pages, panels, activeId) {
    this.cancelIdle();
    if (this.disposed || this.config.preload !== 'sequential-idle') return;
    if (this.entries.get(activeId)?.state !== 'ready') return;
    // Never stack speculative loads. A clicked page may start immediately alongside one in-flight preload.
    if ([...this.entries.values()].some(entry => entry.state === 'loading')) return;
    const next = pages.find(page => !this.entries.has(page.id));
    if (!next) return;
    const run = () => {
      this.idle = null;
      if (!this.disposed) this.ensure(next, panels.get(next.id));
    };
    this.idle = this.win.requestIdleCallback ? { type: 'idle', id: this.win.requestIdleCallback(run, { timeout: 2000 }) } : { type: 'timer', id: this.win.setTimeout(run, 300) };
  }

  cancelIdle() {
    if (!this.idle) return;
    if (this.idle.type === 'idle') this.win.cancelIdleCallback(this.idle.id);
    else this.win.clearTimeout(this.idle.id);
    this.idle = null;
  }

  dispose() {
    this.disposed = true;
    this.cancelIdle();
    for (const entry of this.entries.values()) {
      this.win.clearTimeout(entry.timeout);
      entry.cleanup();
      entry.frame.remove();
      entry.resolve(entry);
    }
    this.entries.clear();
  }
}
