import { placementIdentity, placementId, verifiedPlacement, placementSettings, validateConfig } from './contracts.js';
import { createApi } from './api.js';
import { folderRequest, folderPages } from './documents.js';
import { selectionParameter, resolveTabValue, tabLinkValue, registerSelectionParameter, contextSignature, watchHistory } from './history.js';
import { FrameStore } from './frames.js';
import { pageEditingEnabled, openPageEditor } from './page-editor.js';

export function element(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  if (tag === 'button') node.type = 'button';
  return node;
}

export class CcoInstance {
  constructor(mount, win, identity) {
    this.mount = mount; this.win = win; this.doc = mount.ownerDocument; this.identity = identity;
    this.parameter = selectionParameter(identity);
    this.events = new win.AbortController();
    this.loadingTimers = new Map();
    this.generation = 0; this.disposed = false; this.pages = []; this.panels = new Map(); this.tabs = new Map();
    this.editButtons = new Map();
    this.mount.addEventListener('us-cco:reload', () => this.requestReload(), { signal: this.events.signal });
    this.load();
  }

  status(text, error = false) {
    this.message.textContent = text;
    this.message.classList.remove('us-cco__sr-only');
    this.message.classList.toggle('us-cco__error', error);
  }

  shell() {
    this.mount.replaceChildren();
    this.message = element(this.doc, 'p', 'us-cco__status', 'Loading content pages...');
    this.message.setAttribute('role', 'status');
    this.message.setAttribute('aria-live', 'polite');
    this.mount.append(this.message);
    const spinner = element(this.doc, 'span', 'section-loader-spinning-circles us-cco__loader');
    spinner.setAttribute('aria-hidden', 'true');
    this.mount.append(spinner);
  }

  async load() {
    this.clearLoadingTimers();
    const generation = ++this.generation;
    this.viewEvents?.abort();
    this.viewEvents = new this.win.AbortController();
    this.request?.abort();
    this.request = new this.win.AbortController();
    this.store?.dispose();
    this.store = null; this.pages = []; this.panels.clear(); this.tabs.clear(); this.editButtons.clear();
    this.blocked = false; this.context = this.win.location.href;
    this.shell();
    this.mount.setAttribute('aria-busy', 'true');
    try {
      const api = createApi(this.win);
      const query = new URLSearchParams({ ContentItemKey: this.identity.contentItemKey, ContentKey: this.identity.contentKey });
      const body = await api('GET', `ContentItem?${query}`, undefined, this.request.signal);
      if (this.disposed || generation !== this.generation) return;
      this.config = validateConfig(placementSettings(verifiedPlacement(body, this.identity)));
      this.unregisterParameter?.();
      this.unregisterParameter = registerSelectionParameter(this.win, this.config.urlParameter, this);
      this.parameter = this.config.urlParameter || selectionParameter(this.identity);
      const listing = folderPages(await api('POST', 'Document/_execute', folderRequest(this.config.folderDocumentVersionId), this.request.signal));
      if (this.disposed || generation !== this.generation) return;
      if (listing.pages.some(page => page.id === this.identity.contentKey)) throw new Error('This folder includes the containing page. Recursive CCO frames are not supported.');
      this.pages = listing.pages;
      if (!this.pages.length) {
        this.status('No available published content pages were returned for this folder. Check folder contents and access.');
        this.addReload();
        return;
      }
      this.render(listing);
    } catch (error) {
      if (this.disposed || generation !== this.generation || error.name === 'AbortError') return;
      this.status(error.message || 'Content pages could not be loaded.', true);
      this.addReload();
    } finally {
      if (!this.disposed && generation === this.generation) this.mount.setAttribute('aria-busy', 'false');
    }
  }

  addReload() {
    const retry = element(this.doc, 'button', 'us-cco__button', 'Reload configuration');
    retry.addEventListener('click', () => this.requestReload(), { signal: this.viewEvents.signal });
    this.mount.append(retry);
  }

  render(listing) {
    const heading = element(this.doc, 'details', 'us-cco__options');
    heading.append(element(this.doc, 'summary', '', 'Collection options'));
    const reload = element(this.doc, 'button', 'us-cco__button', 'Reload configuration');
    reload.addEventListener('click', () => this.requestReload(), { signal: this.viewEvents.signal });
    heading.append(reload);
    const vertical = this.config.orientation === 'vertical';
    const layout = element(this.doc, 'div', `cco tabs-wrapper tabs-${this.config.orientation}`);
    const strip = element(this.doc, 'div', vertical ? 'RadTabStripVertical RadTabStrip_Orion' : 'RadTabStrip RadTabStrip_Orion');
    const level = element(this.doc, 'div', 'rtsLevel rtsLevel1');
    this.tablist = element(this.doc, 'ul', 'rtsUL us-cco__tabs');
    this.tablist.setAttribute('role', 'tablist');
    this.tablist.setAttribute('aria-label', this.config.caption);
    const mobile = this.win.matchMedia('(max-width: 600px)');
    const orient = () => this.tablist.setAttribute('aria-orientation', vertical && !mobile.matches ? 'vertical' : 'horizontal');
    orient();
    mobile.addEventListener('change', orient, { signal: this.viewEvents.signal });
    this.content = element(this.doc, 'div', 'RadMultiPage us-cco__content');
    level.append(this.tablist); strip.append(level); layout.append(strip, this.content);
    this.mount.append(layout, heading);
    const baseId = `us-cco-${placementId(this.identity)}`;
    for (const [index, page] of this.pages.entries()) {
      const tab = element(this.doc, 'button', 'rtsLink us-cco__tab');
      const outer = element(this.doc, 'span', 'rtsOut');
      const inner = element(this.doc, 'span', 'rtsIn');
      inner.append(element(this.doc, 'span', 'rtsTxt', page.caption));
      outer.append(inner); tab.append(outer);
      tab.id = `${baseId}-tab-${page.id}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', `${baseId}-panel-${page.id}`);
      const panel = element(this.doc, 'section', 'us-cco__panel');
      const spinner = element(this.doc, 'span', 'section-loader-spinning-circles us-cco__loader');
      spinner.setAttribute('aria-hidden', 'true');
      panel.append(spinner);
      panel.id = `${baseId}-panel-${page.id}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.tabIndex = 0;
      const actions = element(this.doc, 'div', 'us-cco__actions');
      const retry = element(this.doc, 'button', 'TextButton us-icon-button us-cco__refresh');
      retry.title = 'refresh tab';
      retry.setAttribute('aria-label', 'refresh tab');
      retry.setAttribute('aria-controls', panel.id);
      const icon = this.doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      for (const [name, value] of Object.entries({ viewBox:'0 0 24 24', width:'18', height:'18', fill:'none', stroke:'currentColor', 'stroke-width':'1.8', 'stroke-linecap':'round', 'stroke-linejoin':'round', 'aria-hidden':'true', focusable:'false' })) icon.setAttribute(name, value);
      const path = this.doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      // Same reload glyph as the native UnionSuite window controls.
      path.setAttribute('d', 'M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 3l1 3M4 12l1 3a8 8 0 0 0 13 3');
      icon.append(path); retry.append(icon);
      retry.addEventListener('click', () => {
        this.refreshTab(page);
      }, { signal: this.viewEvents.signal });
      actions.append(retry); panel.append(actions);
      tab.addEventListener('click', () => this.select(page.id, true), { signal: this.viewEvents.signal });
      tab.addEventListener('keydown', event => {
        const count = this.pages.length;
        let next;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = count - 1;
        const isVertical = this.tablist.getAttribute('aria-orientation') === 'vertical';
        if (event.key === (isVertical ? 'ArrowDown' : 'ArrowRight')) next = (index + 1) % count;
        if (event.key === (isVertical ? 'ArrowUp' : 'ArrowLeft')) next = (index + count - 1) % count;
        if (next !== undefined) {
          event.preventDefault();
          // Manual activation: moving focus does not start an expensive page load.
          for (const button of this.tabs.values()) button.tabIndex = -1;
          const target = this.tabs.get(this.pages[next].id); target.tabIndex = 0; target.focus();
        }
      }, { signal: this.viewEvents.signal });
      this.tabs.set(page.id, tab); this.panels.set(page.id, panel);
      const item = element(this.doc, 'li', 'rtsLI');
      item.setAttribute('role', 'presentation'); item.append(tab);
      const edit = element(this.doc, 'button', 'TextButton us-icon-button us-cco__edit');
      edit.hidden = true;
      edit.title = `Edit ${page.caption} page`;
      edit.setAttribute('aria-label', edit.title);
      edit.setAttribute('aria-haspopup', 'dialog');
      edit.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m16 4 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6z"/></svg>';
      edit.addEventListener('click', () => this.editPage(page, edit), { signal:this.viewEvents.signal });
      this.editButtons.set(page.id, edit); item.append(edit);
      this.tablist.append(item); this.content.append(panel);
    }
    if (listing.folders || listing.excluded) {
      this.mount.append(element(this.doc, 'p', 'us-cco__note', `${listing.folders} nested folders omitted; ${listing.excluded} unavailable or non-published pages omitted.`));
    }
    this.store = new FrameStore(this.win, this.config, entry => this.frameChanged(entry));
    this.syncEditing();
    this.syncSelection();
  }

  syncEditing() {
    const enabled = pageEditingEnabled(this.win);
    for (const button of this.editButtons.values()) {
      if (button.hidden === enabled) button.hidden = !enabled;
      button.parentElement.classList.toggle('us-cco__tab-editable', enabled);
    }
  }

  refreshTab(page, afterEditor = false) {
    const entry = this.store?.entries.get(page.id), panel = this.panels.get(page.id);
    if (this.disposed || this.blocked || !this.store || !panel || (!afterEditor && entry?.state === 'loading')) return;
    if (entry?.dirty && !this.win.confirm('Discard unsaved changes and refresh this tab?')) return;
    this.store.retry(page, panel);
  }

  editPage(page, button) {
    if (this.disposed || this.blocked || !this.mount.isConnected) return;
    const generation = this.generation, context = contextSignature(this.win);
    try {
      openPageEditor(this.win, page, button, this.viewEvents.signal, () => {
        // A dialog may outlive a removed/reconfigured CCO or a contact change.
        if (this.disposed || this.blocked || generation !== this.generation || !this.mount.isConnected || contextSignature(this.win) !== context) return;
        this.refreshTab(page, true);
        this.syncEditing();
        const focus = button.hidden ? this.tabs.get(page.id) : button;
        if (focus?.isConnected && focus.getBoundingClientRect().width) focus.focus({ preventScroll:true });
      });
    } catch (error) {
      this.status(error.message || 'Content Designer could not be opened.', true);
    }
  }

  syncSelection() {
    if (!this.pages.length || this.blocked) return;
    const query = new URL(this.win.location.href).searchParams;
    const requested = query.get(this.parameter);
    const legacy = query.get(selectionParameter(this.identity));
    const configured = this.config.initialDocumentVersionId;
    const fallback = this.pages.find(page => page.id === configured)?.id || this.pages[0].id;
    const matched = resolveTabValue(this.pages, requested);
    const target = matched?.id || (requested === null && this.pages.find(page => page.id === legacy?.toLowerCase())?.id) || fallback;
    if (this.selected !== target || !this.store?.entries.has(target)) this.select(target, false);
    if (requested && !matched) this.status('The linked tab is unavailable. Showing the default tab.');
  }

  tabUrlValue(page) {
    return tabLinkValue(this.pages, page, this.config.urlValue);
  }

  select(id, writeHistory) {
    if (this.blocked || !this.store) return;
    const page = this.pages.find(item => item.id === id);
    if (!page) return;
    const start = this.win.performance.now();
    const warm = !!this.store.entries.get(id)?.presented;
    this.selected = id;
    this.store.cancelIdle();
    for (const item of this.pages) {
      const active = item.id === id, tab = this.tabs.get(item.id), panel = this.panels.get(item.id);
      tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
      tab.classList.toggle('rtsSelected', active);
      panel.hidden = !active; panel.inert = !active;
      if (!active) this.tabLoading(item.id, false);
    }
    const entry = this.store.ensure(page, this.panels.get(id));
    for (const retained of this.store.entries.values()) this.store.syncPresentation(retained);
    this.frameChanged(entry);
    if (writeHistory) {
      const url = new URL(this.win.location.href);
      const value = this.tabUrlValue(page);
      if (url.searchParams.get(this.parameter) !== value || (this.parameter !== selectionParameter(this.identity) && url.searchParams.has(selectionParameter(this.identity)))) {
        if (this.parameter !== selectionParameter(this.identity)) url.searchParams.delete(selectionParameter(this.identity));
        url.searchParams.set(this.parameter, value);
        this.win.history.pushState(this.win.history.state, '', url);
      }
    }
    this.mount.dispatchEvent(new this.win.CustomEvent('us-cco:timing', { detail: { kind: 'selection', warm, durationMs: this.win.performance.now() - start, retainedFrames: this.store.entries.size } }));
  }

  frameChanged(entry) {
    if (this.disposed || this.blocked || !entry) return;
    entry.panel.setAttribute('aria-busy', String(entry.state === 'loading'));
    const refresh = entry.panel.querySelector('.us-cco__refresh');
    refresh.setAttribute('aria-disabled', String(entry.state === 'loading'));
    refresh.setAttribute('aria-busy', String(entry.state === 'loading'));
    this.tabs.get(entry.page.id)?.setAttribute('data-state', entry.state);
    this.tabLoading(entry.page.id, entry.page.id === this.selected && entry.state === 'loading');
    if (entry.page.id === this.selected) this.status(entry.state === 'loading' ? `Loading ${entry.page.caption}...` : entry.state === 'error' ? `${entry.error} Use the refresh tab button to try again.` : `${entry.page.caption} ready.`, entry.state === 'error');
    if (entry.page.id === this.selected && entry.state !== 'error') this.message.classList.add('us-cco__sr-only');
    this.store.schedule(this.pages, this.panels, this.selected);
    if (entry.state === 'ready' && entry.reportedLoadCount !== entry.loadCount) {
      entry.reportedLoadCount = entry.loadCount;
      this.mount.dispatchEvent(new this.win.CustomEvent('us-cco:timing', { detail: { kind: 'frame-load', durationMs: entry.readyMs, retainedFrames: this.store.entries.size } }));
    }
  }

  syncLocation() {
    if (contextSignature(this.win) !== contextSignature(this.win, this.context)) {
      if (this.store?.hasDirty()) {
        this.blocked = true; this.store.cancelIdle();
        this.tablist.hidden = true; this.content.hidden = true; this.content.inert = true;
        this.status('Page context changed. The previous pages are hidden because they may contain unsaved changes.');
        if (!this.discard) {
          this.discard = element(this.doc, 'button', 'us-cco__button', 'Discard changes and load current context');
          this.discard.addEventListener('click', () => { this.discard = null; this.load(); }, { signal: this.viewEvents.signal });
          this.mount.append(this.discard);
        }
      } else this.load();
      return;
    }
    if (this.blocked) {
      this.blocked = false; this.tablist.hidden = false; this.content.hidden = false; this.content.inert = false;
      this.discard?.remove(); this.discard = null;
      this.frameChanged(this.store?.entries.get(this.selected));
    }
    this.syncSelection();
  }

  tabLoading(id, loading) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    tab.setAttribute('aria-busy', String(loading));
    if (!loading) {
      this.win.clearTimeout(this.loadingTimers.get(id)); this.loadingTimers.delete(id);
      tab.removeAttribute('data-us-tab-loading');
      tab.querySelector('[data-us-cco-spinner]')?.remove();
    } else if (!this.loadingTimers.has(id) && !tab.querySelector('[data-us-cco-spinner]')) {
      // Native theme appearance/delay, with independent ownership for retained frames.
      this.loadingTimers.set(id, this.win.setTimeout(() => {
        this.loadingTimers.delete(id);
        if (!tab.isConnected || this.disposed) return;
        const spinner = element(this.doc, 'span', 'us-tab-loading-spinner');
        spinner.setAttribute('data-us-cco-spinner', ''); spinner.setAttribute('aria-hidden', 'true');
        tab.setAttribute('data-us-tab-loading', ''); tab.append(spinner);
      }, 150));
    }
  }

  clearLoadingTimers() {
    for (const timer of this.loadingTimers.values()) this.win.clearTimeout(timer);
    this.loadingTimers.clear();
  }

  requestReload() {
    if (this.store?.hasDirty() && !this.win.confirm('Discard unsaved changes in retained pages and reload configuration?')) return;
    this.discard = null; this.load();
  }

  dispose() {
    this.unregisterParameter?.();
    this.clearLoadingTimers();
    this.disposed = true; this.generation++;
    this.request?.abort(); this.events.abort(); this.viewEvents?.abort(); this.store?.dispose();
    this.mount.replaceChildren();
  }
}

export function installRuntime(win) {
  if (win.UnionSuiteCCO) { win.UnionSuiteCCO.scan(); return win.UnionSuiteCCO; }
  const instances = new Map(), failures = new WeakMap();
  const doc = win.document;
  let queued = false, disposed = false, application, manager;
  function scan() {
    if (disposed) return;
    for (const [mount, instance] of instances) {
      if (!mount.isConnected || mount.dataset.contentKey?.toLowerCase() !== instance.identity.contentKey || mount.dataset.contentItemKey?.toLowerCase() !== instance.identity.contentItemKey) { instance.dispose(); instances.delete(mount); }
      else instance.syncEditing();
    }
    const owners = new Set([...instances.values()].map(instance => placementId(instance.identity)));
    for (const mount of doc.querySelectorAll('[data-us-cco]')) {
      if (instances.has(mount)) continue;
      try {
        if (win.frameElement?.dataset.usCcoChild || mount.parentElement.closest('[data-us-cco]')) throw new Error('Nested UnionSuite CCO components are not supported in this trial.');
        const identity = placementIdentity(mount.dataset.contentKey, mount.dataset.contentItemKey);
        const key = placementId(identity);
        if (owners.has(key)) throw new Error('The same placement appears twice in this document. Use separate CCO placements.');
        owners.add(key);
        failures.delete(mount);
        instances.set(mount, new CcoInstance(mount, win, identity));
      } catch (error) {
        if (failures.get(mount) !== error.message) { mount.textContent = error.message; mount.setAttribute('role', 'status'); failures.set(mount, error.message); }
      }
    }
    hookAspNet();
  }
  function queueScan() {
    if (!queued) { queued = true; win.queueMicrotask(() => { queued = false; scan(); }); }
  }
  function locationChanged() { for (const instance of instances.values()) instance.syncLocation(); }
  function pageLoading(sender, args) {
    const removed = [...(args.get_panelsDeleting?.() || []), ...(args.get_panelsUpdating?.() || [])];
    for (const [mount, instance] of instances) if (removed.some(panel => panel === mount || panel.contains(mount))) { instance.dispose(); instances.delete(mount); }
  }
  function hookAspNet() {
    const app = win.Sys?.Application;
    if (app && application !== app) { application?.remove_load?.(queueScan); application = app; app.add_load(queueScan); }
    const next = win.Sys?.WebForms?.PageRequestManager?.getInstance?.();
    if (next && manager !== next) { manager?.remove_pageLoading?.(pageLoading); manager = next; next.add_pageLoading(pageLoading); }
  }
  const observer = new win.MutationObserver(records => {
    if (records.some(record => record.attributeName !== 'class' || record.target === doc.body || record.target === doc.documentElement || record.target.matches?.('.ste-toggle'))) queueScan();
  });
  observer.observe(doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-content-key', 'data-content-item-key', 'class'] });
  const unwatch = watchHistory(win, locationChanged);
  const unload = event => {
    if ([...instances.values()].some(instance => instance.store?.hasDirty())) { event.preventDefault(); event.returnValue = ''; }
  };
  win.addEventListener('beforeunload', unload);
  const api = {
    scan,
    reload: mount => instances.get(mount)?.requestReload(),
    diagnostics: () => [...instances.values()].map(instance => ({ placement: placementId(instance.identity), blocked: instance.blocked, frames: [...(instance.store?.entries.values() || [])].map(entry => ({ id: entry.page.id, state: entry.state, dirty: entry.dirty, loadCount: entry.loadCount, readyMs: entry.readyMs })) })),
    dispose() {
      disposed = true; observer.disconnect(); unwatch();
      application?.remove_load?.(queueScan); manager?.remove_pageLoading?.(pageLoading);
      win.removeEventListener('beforeunload', unload);
      for (const instance of instances.values()) instance.dispose();
      instances.clear(); delete win.UnionSuiteCCO;
    }
  };
  win.UnionSuiteCCO = api;
  scan();
  return api;
}
