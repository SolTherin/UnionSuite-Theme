/* =============================================================================
 * IQA Enhancements — combined script
 * -----------------------------------------------------------------------------
 * One file for the iMIS Intelligent Query Architect Design page
 * (.../iMIS/QueryBuilder/Design.aspx). Delivered via the shared CDN inject
 * (jQuery present on the page, but this script itself is dependency-free).
 *
 * ENHANCE MODE
 *   A toggle pill before the Save button group turns all *gated* modules on/off, live,
 *   with no page reload — state persisted in localStorage['iqaEnhanceMode']
 *   (default: on). Gated modules restore the stock editor on teardown.
 *
 *   ALWAYS ON (independent of the toggle):
 *     • QuickAdd  — injected "Union Template" Business Object quick-add panel
 *
 *   GATED (behind the toggle):
 *     • OverhaulCss         — editor layout/width/colour CSS (body.iqa-enhanced)
 *     • BoSearch            — searchable Business Object input on the source panel
 *     • SqlTools            — copy SQL + lock/unlock expression toolbar
 *     • FilterSortDropdowns — type-to-filter dropdowns on Filters & Sort selects
 *     • UncheckAll          — "uncheck all" checkbox in the Display grid header
 *     • FilterAutocomplete  — per-property value history on filter value inputs
 *     • DragSort            — Display options toolbar + drag ordering (on by default)
 *     • FilterWorkspace     — compact Filters layout + staged within-group reorder
 *     • SourceWorkspace     — staged business-object reorder with one final refresh
 *
 * The editor is an ASP.NET WebForms page (constant partial postbacks); the
 * shell re-runs every module on PageRequestManager endRequest, and each mount
 * is idempotent and self-gating (finds its own target, or no-ops).
 * ========================================================================== */
(function () {
  'use strict';

  /* ---- run only on the IQA Design page ---------------------------------- */
  if (!/\/QueryBuilder\/Design\.aspx$/i.test(location.pathname)) return;

  /* ===========================================================================
   * State
   * ======================================================================== */
  const MODE_KEY = 'iqaEnhanceMode';
  const getMode = () => localStorage.getItem(MODE_KEY) !== 'off';      // default on
  const setMode = (on) => localStorage.setItem(MODE_KEY, on ? 'on' : 'off');
  const safe = (fn) => { try { fn(); } catch (e) { console.error('[IQA-Enh]', e); } };

  /* ===========================================================================
   * Shared helpers
   * ======================================================================== */
  const token = () =>
    (document.getElementById('__RequestVerificationToken')
      || document.querySelector('input[name="__RequestVerificationToken"]'))?.value || '';

  function runQuery(queryName, params) {
    let url = location.origin + '/api/query?QueryName=' + encodeURIComponent(queryName);
    if (params) for (const k in params) url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    return fetch(url, {
      method: 'GET', credentials: 'same-origin',
      headers: { 'RequestVerificationToken': token(), 'Accept': 'application/json' }
    }).then(r => { if (!r.ok) throw new Error('query HTTP ' + r.status); return r.json(); });
  }

  function readRow(item) {
    if (!item) return null;
    let name = item.DocumentName, key = item.DocumentVersionKey,
        desc = (item.Description != null) ? item.Description : item.DocumentDescription;
    if (key == null && item.Properties?.$values) {
      const props = item.Properties.$values;
      const pick = n => { const p = props.find(x => x.Name === n); const v = p && p.Value; return (v && typeof v === 'object') ? v.$value : v; };
      name = pick('DocumentName'); key = pick('DocumentVersionKey'); desc = pick('Description') || pick('DocumentDescription');
    }
    if (!key) return null;
    return { name: name || '(unnamed)', key, desc: String(desc == null ? '' : desc).replace(/\s+/g, ' ').trim() };
  }
  const rowsFrom = (data) => {
    const items = data?.Items?.$values ?? (Array.isArray(data?.Items) ? data.Items : []);
    return items.map(readRow).filter(Boolean);
  };

  function addSource(key) {
    if (typeof window.AddQuickSource === 'function') { window.AddQuickSource(key); return; }
    const sk = document.getElementById('SelectedKeys');
    if (sk && typeof window.submitForm === 'function') { sk.value = key; window.submitForm(sk); }
  }

  async function copyText(text) {
    try { if (navigator.clipboard && isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (_) {}
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (_) {}
    ta.remove(); return ok;
  }

  const elFromHTML = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
  const injectStyle = (id, css) => { if (document.getElementById(id)) return; const s = document.createElement('style'); s.id = id; s.textContent = css; document.head.appendChild(s); };
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const COPY_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
  const GRIP_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="5" r="1.6"></circle><circle cx="9" cy="12" r="1.6"></circle><circle cx="9" cy="19" r="1.6"></circle><circle cx="15" cy="5" r="1.6"></circle><circle cx="15" cy="12" r="1.6"></circle><circle cx="15" cy="19" r="1.6"></circle></svg>`;
  // A copy button's label reserves the width of every message it can show, so
  // swapping in "Copied" or "Copy failed" never resizes the button.
  const copyLabel = (text) => '<span class="iqa-header-copy-label">'
    + '<span class="iqa-header-copy-text">' + escapeHtml(text) + '</span>'
    + [text, 'Copied', 'Copy failed'].map(value => '<span aria-hidden="true">' + escapeHtml(value) + '</span>').join('')
    + '</span>';

  const PENCIL_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41L18.37 3.29a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg>`;

  /* ===========================================================================
   * Busy presentation
   * ---------------------------------------------------------------------------
   * zUnionSuite.js owns this whenever it is loaded. Without it the same theme
   * classes are driven from here, so zUnionSuite.css still supplies every
   * spinner's appearance and no spinner styling is duplicated in this file.
   * ======================================================================== */
  const BUSY_CSS =
      '.iqa-busy-button{position:relative;}'
    // The theme hides a busy button's children; the spinner must stay visible.
    + '.iqa-busy-button > .iqa-busy-spinner{position:absolute;inset-inline-start:50%;top:50%;margin:-8px 0 0 -8px;visibility:visible!important;}';

  const Busy = {
    button(target) {
      // UnionSuiteBusy positions its spinner in document.body. A modal dialog
      // paints in the top layer, above everything in the document, so a button
      // inside one keeps the spinner within itself instead.
      if (window.UnionSuiteBusy && !target.closest('dialog')) return window.UnionSuiteBusy.show(target, { mode: 'center' });
      injectStyle('iqaBusyCss', BUSY_CSS);
      if (target.querySelector('.iqa-busy-spinner')) return { clear() {} };
      const spinner = elFromHTML('<span class="us-button-spinner iqa-busy-spinner" aria-hidden="true"></span>');
      spinner.style.color = getComputedStyle(target).color;
      const label = target.getAttribute('aria-label');
      if (label === null) target.setAttribute('aria-label', target.textContent.trim());
      target.classList.add('iqa-busy-button', 'us-busy-hide-label');
      target.setAttribute('aria-busy', 'true');
      target.append(spinner);
      return { clear() {
        spinner.remove();
        target.classList.remove('iqa-busy-button', 'us-busy-hide-label');
        target.removeAttribute('aria-busy');
        if (label === null) target.removeAttribute('aria-label');
      } };
    },
    // Let the browser paint the busy state before synchronous work blocks it.
    async run(target, work) {
      const handle = Busy.button(target);
      try {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return work();
      } finally { handle.clear(); }
    }
  };

  /* Tab switching. The native tabs post back, and the theme already reserves
     room beside each label so showing the indicator cannot shift the strip. */
  const TabBusy = {
    _selector: '.RadTabStrip .rtsLink[role="tab"],.RadTabStripVertical .rtsLink[role="tab"]',
    _pending: null, _active: null, _timer: 0, _watching: false,
    _owned: () => !window.UnionSuiteTabBusy,
    watch() {
      if (!TabBusy._owned()) { window.UnionSuiteTabBusy.refresh?.(); return; }
      if (TabBusy._watching) return;
      TabBusy._watching = true;
      document.addEventListener('click', event => {
        const tab = event.target.closest?.(TabBusy._selector);
        TabBusy._pending = tab && !tab.closest('.us-report-no-styling,[aria-disabled="true"],.rtsDisabled') ? tab : null;
      }, true);
    },
    begin() {
      if (!TabBusy._owned()) return;
      const tab = TabBusy._pending; TabBusy._pending = null;
      TabBusy.clear();
      if (!tab?.isConnected) return;
      // A short request should not flash an indicator.
      TabBusy._timer = setTimeout(() => {
        if (!tab.isConnected) return;
        const spinner = elFromHTML('<span class="us-tab-loading-spinner" aria-hidden="true"></span>');
        tab.setAttribute('data-us-tab-loading', ''); tab.setAttribute('aria-busy', 'true');
        tab.append(spinner);
        TabBusy._active = { tab, spinner };
      }, 150);
    },
    clear() {
      if (!TabBusy._owned()) return;
      clearTimeout(TabBusy._timer);
      const state = TabBusy._active; TabBusy._active = null;
      if (!state) return;
      state.spinner.remove();
      state.tab.removeAttribute('data-us-tab-loading');
      state.tab.removeAttribute('aria-busy');
    }
  };

  /* ===========================================================================
   * Pointer reordering for the reorder dialogs
   * ---------------------------------------------------------------------------
   * Matches the taskbar command palette: the held item follows the pointer, an
   * empty dashed slot marks where it will land, and the items it displaces
   * slide into place. An item stays in the list it started in, so the filter
   * dialog cannot move a filter between groups.
   *
   * HTML5 drag and drop cannot do this: its drag image is a static bitmap taken
   * at dragstart, and the source element cannot be restyled mid-drag.
   * ======================================================================== */
  function createPointerReorder({ surface, scroller, items, blocked, onDrop, classes }) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const slides = new Map();
    let active = null;

    const stopSlides = () => { slides.forEach(animation => animation.cancel()); slides.clear(); };
    const tops = list => new Map(list.map(item => [item, item.getBoundingClientRect().top]));

    // FLIP: each displaced item animates from where it just was.
    function slide(list, previousTops) {
      if (reducedMotion.matches) return;
      for (const node of list) {
        const previousTop = previousTops.get(node);
        if (previousTop === undefined) continue;
        const distance = previousTop - node.getBoundingClientRect().top;
        if (!Number.isFinite(distance) || Math.abs(distance) < 0.5) continue;
        const animation = node.animate(
          [{ transform: 'translateY(' + distance + 'px)' }, { transform: 'translateY(0)' }],
          { duration: 180, easing: 'cubic-bezier(.2, .8, .2, 1)' });
        slides.set(node, animation);
        animation.onfinish = () => { if (slides.get(node) === animation) slides.delete(node); };
      }
    }

    const middle = (item) => {
      const box = item.getBoundingClientRect();
      // Hit-test settled positions so a sliding item cannot move the target.
      const transform = getComputedStyle(item).transform;
      const shift = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42;
      return box.top - shift + box.height / 2;
    };

    function start(event, handle, item, list) {
      if (event.button !== 0 || !event.isPrimary || active || blocked()) return;
      event.preventDefault();
      handle.focus({ preventScroll: true });

      const box = item.getBoundingClientRect();
      const offset = { x: event.clientX - box.left, y: event.clientY - box.top };
      const others = () => items(list).filter(node => node !== item);

      const placeholder = document.createElement('li');
      placeholder.className = classes.placeholder;
      placeholder.setAttribute('role', 'presentation');
      placeholder.style.height = box.height + 'px';
      item.before(placeholder);

      // The dialog is in the top layer, so the floating copy has to live inside
      // it. Ids and names are dropped and it is inert, so nothing is duplicated.
      const floating = item.cloneNode(true);
      floating.className = (item.className + ' ' + classes.floating).trim();
      floating.setAttribute('aria-hidden', 'true');
      floating.inert = true;
      floating.style.width = box.width + 'px';
      floating.style.height = box.height + 'px';
      floating.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      floating.querySelectorAll('[name]').forEach(node => node.removeAttribute('name'));
      surface.appendChild(floating);
      surface.classList.add('iqa-is-sorting');
      item.classList.add(classes.dragging);

      let point = { x: event.clientX, y: event.clientY };
      let frame = 0;
      let finished = false;

      function position() {
        floating.style.left = (point.x - offset.x) + 'px';
        floating.style.top = (point.y - offset.y) + 'px';
        const rows = others();
        const next = rows.find(node => point.y < middle(node));
        const targetIndex = next ? rows.indexOf(next) : rows.length;
        const currentIndex = rows.filter(node =>
          node.compareDocumentPosition(placeholder) & Node.DOCUMENT_POSITION_FOLLOWING).length;
        if (targetIndex === currentIndex) return;
        const previousTops = tops(rows);
        stopSlides();
        if (next) list.insertBefore(placeholder, next);
        else if (rows.length) rows[rows.length - 1].after(placeholder);
        slide(rows, previousTops);
      }

      // Keep scrolling while the pointer rests against an edge of the list.
      function tick() {
        const bounds = scroller.getBoundingClientRect();
        if (point.y >= bounds.top && point.y <= bounds.bottom) {
          const speed = point.y < bounds.top + 38 ? -7 : point.y > bounds.bottom - 38 ? 7 : 0;
          if (speed) scroller.scrollTop += speed;
        }
        position();
        frame = requestAnimationFrame(tick);
      }

      function finish(commit) {
        if (finished) return;
        finished = true;
        active = null;
        cancelAnimationFrame(frame);
        const previousTops = tops(others());
        stopSlides();
        surface.removeEventListener('pointermove', move);
        surface.removeEventListener('pointerup', release);
        surface.removeEventListener('pointercancel', cancel);
        surface.removeEventListener('lostpointercapture', cancel);
        surface.removeEventListener('keydown', key, true);
        window.removeEventListener('blur', cancel);
        if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
        const landed = commit && !blocked() && placeholder.parentNode === list;
        if (landed) list.insertBefore(item, placeholder);
        placeholder.remove();
        floating.remove();
        item.classList.remove(classes.dragging);
        surface.classList.remove('iqa-is-sorting');
        slide(others(), previousTops);
        handle.focus({ preventScroll: true });
        if (landed) onDrop();
      }

      function move(moveEvent) {
        if (moveEvent.pointerId !== event.pointerId) return;
        moveEvent.preventDefault();
        point = { x: moveEvent.clientX, y: moveEvent.clientY };
        position();
      }
      function release(upEvent) {
        if (upEvent.pointerId !== event.pointerId) return;
        // Releasing away from the list abandons the move, as the palette does.
        const bounds = list.getBoundingClientRect();
        finish(upEvent.clientX >= bounds.left && upEvent.clientX <= bounds.right &&
          upEvent.clientY >= bounds.top && upEvent.clientY <= bounds.bottom);
      }
      function cancel() { finish(false); }
      // Escape cancels the move; the dialog must not close underneath it.
      function key(keyEvent) {
        if (keyEvent.key !== 'Escape') return;
        keyEvent.preventDefault(); keyEvent.stopPropagation(); cancel();
      }

      active = { cancel };
      surface.addEventListener('pointermove', move);
      surface.addEventListener('pointerup', release);
      surface.addEventListener('pointercancel', cancel);
      surface.addEventListener('lostpointercapture', cancel);
      surface.addEventListener('keydown', key, true);
      window.addEventListener('blur', cancel);
      surface.setPointerCapture(event.pointerId);
      frame = requestAnimationFrame(tick);
    }

    return {
      attach(handle, item, list) {
        handle.draggable = false;
        handle.addEventListener('pointerdown', event => start(event, handle, item, list));
        handle.addEventListener('dragstart', event => event.preventDefault());
      },
      cancel() { active?.cancel(); }
    };
  }

  /* ===========================================================================
   * QuickSource config + shared plumbing (QuickAdd + BoSearch)
   * ======================================================================== */
  const LIST_QUERY      = '$/_i4u_/Core/Admin/IQA Builder - Quick Add Business Object List';
  const SECTION_QUERY   = '$/_i4u_/Core/Admin/IQA Builder - Quick Add Business Object Section';
  const SEARCH_PARAM    = 'DocumentName';
  const SECTION_TITLE   = 'Union Template';
  const SECTION_CACHE   = 'iqaBoSearch:section';
  const SECTION_TTL     = 10 * 60 * 1000;
  const MIN_CHARS = 3, MAX_RESULTS = 10, DEBOUNCE_MS = 250;

  function panelBody() {
    const panel = document.querySelector('.QueryQuickSources');
    if (!panel) return null;
    return panel.querySelector('[id$="AddSourcePanel_Body"]') || panel.querySelector('.panel-body');
  }

  function loadSection() {
    try {
      const raw = sessionStorage.getItem(SECTION_CACHE);
      if (raw) { const obj = JSON.parse(raw); if (obj && (Date.now() - obj.t) <= SECTION_TTL) return Promise.resolve(obj.rows); }
    } catch (_) {}
    return runQuery(SECTION_QUERY, null).then(data => {
      const rows = rowsFrom(data);
      try { sessionStorage.setItem(SECTION_CACHE, JSON.stringify({ t: Date.now(), rows })); } catch (_) {}
      return rows;
    });
  }

  function buildQuickAddItem(o) {
    const media = document.createElement('div');
    media.className = 'media iqa-quickadd__media';
    const left = document.createElement('div'); left.className = 'media-left';
    const iconA = document.createElement('a'); iconA.href = 'javascript:void(0)';
    iconA.innerHTML = '<img src="../../assets/images/icons/QuerySources/icon_qs_bo.png" alt="" />';
    left.appendChild(iconA);
    const bodyD = document.createElement('div'); bodyD.className = 'media-body';
    const nameA = document.createElement('a'); nameA.href = 'javascript:void(0)';
    nameA.innerHTML = '<span>' + escapeHtml(o.name) + '</span>';
    bodyD.appendChild(nameA);
    if (o.desc) { const d = document.createElement('div'); d.className = 'iqa-quickadd__desc'; d.textContent = o.desc; bodyD.appendChild(d); }
    media.appendChild(left); media.appendChild(bodyD);
    const go = e => { if (e) e.preventDefault(); addSource(o.key); };
    iconA.addEventListener('click', go); nameA.addEventListener('click', go);
    return media;
  }

  /* ===========================================================================
   * Module: QuickAdd  (ALWAYS ON)
   * ======================================================================== */
  const QuickAdd = {
    mount() {
      const body = panelBody(); if (!body) return;
      injectStyle('iqaQuickAddCss', QUICKADD_CSS);
      const firstPanel = body.querySelector('.panel.panel-border');
      const wrapper = firstPanel ? firstPanel.parentNode : null;
      if (!wrapper) return;

      const native = this._findSection(wrapper, SECTION_TITLE);
      if (native) {
        if (native.dataset.iqaProcessed) return;
        native.dataset.iqaProcessed = '1';
        this._collapseAll(wrapper);
        wrapper.insertBefore(native, wrapper.firstChild);
        this._expand(native);
        this._mergeIntoNative(native);
        return;
      }
      if (document.getElementById('iqaQuickAddPanel')) return;
      this._collapseAll(wrapper);

      const panel = document.createElement('div');
      panel.className = 'panel panel-border Section NeutralShading p-0 iqa-quickadd';
      panel.innerHTML =
        '<a class="panel-heading Distinguish d-block" href="#iqaQuickAddPanel" data-toggle="collapse" aria-expanded="true">' +
          '<h4 class="pull-left">' + escapeHtml(SECTION_TITLE) + '</h4>' +
          '<span class="panel-heading-collapse-img pull-right"></span></a>' +
        '<div id="iqaQuickAddPanel" class="panel-body-container collapse in"><div class="panel-body">' +
          '<div class="iqa-quickadd__items"><div class="iqa-quickadd__note">Loading…</div></div>' +
        '</div></div>';
      wrapper.insertBefore(panel, wrapper.firstChild);

      const itemsEl = panel.querySelector('.iqa-quickadd__items');
      loadSection().then(rows => {
        itemsEl.innerHTML = '';
        if (!rows || !rows.length) { itemsEl.innerHTML = '<div class="iqa-quickadd__note">No quick-add objects configured</div>'; return; }
        rows.forEach(o => itemsEl.appendChild(buildQuickAddItem(o)));
      }).catch(e => { itemsEl.innerHTML = '<div class="iqa-quickadd__note">Could not load quick-add objects</div>'; console.error('[IQA-Enh]', e); });
    },

    _findSection(wrapper, title) {
      const want = title.trim().toLowerCase();
      for (const p of wrapper.querySelectorAll('.panel.panel-border')) {
        if (p.classList.contains('iqa-quickadd')) continue;
        const h = p.querySelector('.panel-heading h4');
        if (h && h.textContent.trim().toLowerCase() === want) return p;
      }
      return null;
    },
    _expand(panel) {
      const head = panel.querySelector('.panel-heading[data-toggle="collapse"]');
      const c = panel.querySelector('.panel-body-container.collapse');
      if (c) { c.classList.add('in'); c.setAttribute('aria-expanded', 'true'); c.style.height = ''; }
      if (head) { head.classList.remove('collapsed'); head.setAttribute('aria-expanded', 'true'); }
    },
    _collapseAll(wrapper) {
      wrapper.querySelectorAll('.panel.panel-border').forEach(p => {
        const head = p.querySelector('.panel-heading[data-toggle="collapse"]');
        const c = p.querySelector('.panel-body-container.collapse');
        if (c) { c.classList.remove('in'); c.setAttribute('aria-expanded', 'false'); }
        if (head) { head.classList.add('collapsed'); head.setAttribute('aria-expanded', 'false'); }
      });
    },
    _collectKeys(panel) {
      const keys = {};
      panel.querySelectorAll('a[href*="AddQuickSource"]').forEach(a => {
        const m = /AddQuickSource\(\s*["']?([0-9a-fA-F-]{36})/.exec(a.getAttribute('href') || '');
        if (m) keys[m[1].toLowerCase()] = true;
      });
      return keys;
    },
    _mergeIntoNative(panel) {
      const container = panel.querySelector('.panel-body'); if (!container) return;
      const have = this._collectKeys(panel);
      loadSection().then(rows => {
        const frag = document.createDocumentFragment();
        (rows || []).forEach(o => { if (!o.key || have[o.key.toLowerCase()]) return; frag.appendChild(buildQuickAddItem(o)); });
        if (!frag.childNodes.length) return;
        const firstMedia = container.querySelector('.media');
        if (firstMedia) container.insertBefore(frag, firstMedia); else container.appendChild(frag);
      }).catch(e => console.error('[IQA-Enh]', e));
    }
  };

  /* ===========================================================================
   * Module: BoSearch  (GATED)
   * ======================================================================== */
  const BoSearch = {
    _abort: null,
    mount() {
      const body = panelBody(); if (!body) return;
      if (document.getElementById('iqaBoSearch')) return;
      injectStyle('iqaBoSearchCss', BOSEARCH_CSS);

      const wrap = document.createElement('div');
      wrap.id = 'iqaBoSearch'; wrap.className = 'iqa-bo-search';
      wrap.innerHTML =
        '<label class="iqa-bo-search__label" for="iqaBoSearchInput">Search business objects</label>' +
        '<div class="iqa-bo-search__box">' +
          '<input id="iqaBoSearchInput" class="iqa-bo-search__input" type="text" placeholder="Type at least 3 characters…" ' +
            'autocomplete="off" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="iqaBoSearchList" spellcheck="false" />' +
          '<span class="iqa-bo-search__spinner" role="status" aria-label="Searching" aria-hidden="true"></span>' +
          '<ul id="iqaBoSearchList" class="iqa-bo-search__list" role="listbox"></ul>' +
        '</div>';

      const header = body.querySelector('.ClearFix.Section');
      if (header && header.parentNode === body) header.insertAdjacentElement('afterend', wrap);
      else body.insertBefore(wrap, body.firstChild);

      this._wire(wrap);
    },
    teardown() { this._abort?.abort(); this._abort = null; document.getElementById('iqaBoSearch')?.remove(); },

    _wire(wrap) {
      this._abort = new AbortController();
      const sig = { signal: this._abort.signal };
      const input = wrap.querySelector('.iqa-bo-search__input');
      const list  = wrap.querySelector('.iqa-bo-search__list');
      const box   = wrap.querySelector('.iqa-bo-search__box');
      let view = [], active = -1, timer = null, term = '';

      const setLoading = on => box.classList.toggle('is-loading', !!on);
      const open = show => { list.classList.toggle('is-open', !!show); input.setAttribute('aria-expanded', show ? 'true' : 'false'); };
      const hint = text => { view = []; active = -1; list.innerHTML = ''; const li = document.createElement('li'); li.className = 'iqa-bo-search__empty'; li.textContent = text; list.appendChild(li); open(true); };

      function render() {
        list.innerHTML = ''; active = -1;
        if (view.length === 0) { hint('No matching business objects'); return; }
        view.forEach((o, i) => {
          const li = document.createElement('li'); li.className = 'iqa-bo-search__item'; li.setAttribute('role', 'option'); li.id = 'iqaBoOpt' + i;
          const name = document.createElement('span'); name.className = 'iqa-bo-search__name'; name.textContent = o.name; li.appendChild(name);
          if (o.desc) { const d = document.createElement('span'); d.className = 'iqa-bo-search__desc'; d.textContent = o.desc; li.appendChild(d); li.title = o.desc; }
          li.addEventListener('mousedown', ev => { ev.preventDefault(); choose(o.key); });
          li.addEventListener('mousemove', () => setActive(i));
          list.appendChild(li);
        });
        open(true);
      }
      function setActive(i) {
        const items = list.querySelectorAll('.iqa-bo-search__item'); if (!items.length) return;
        if (i < 0) i = items.length - 1; if (i >= items.length) i = 0;
        if (active > -1 && items[active]) items[active].classList.remove('is-active');
        active = i; items[active].classList.add('is-active'); items[active].scrollIntoView({ block: 'nearest' });
        input.setAttribute('aria-activedescendant', items[active].id);
      }
      function choose(key) { open(false); setLoading(true); addSource(key); }
      function search(q) {
        term = q; setLoading(true);
        const params = {}; params[SEARCH_PARAM] = q;
        runQuery(LIST_QUERY, params).then(data => {
          if (q !== term) return;
          view = rowsFrom(data).slice(0, MAX_RESULTS); setLoading(false); render();
        }).catch(e => { if (q !== term) return; setLoading(false); hint('Search failed'); console.error('[IQA-Enh]', e); });
      }
      function onType() {
        const q = input.value.trim(); clearTimeout(timer); active = -1;
        if (q.length < MIN_CHARS) { term = ''; setLoading(false); hint('Type at least ' + MIN_CHARS + ' characters'); return; }
        timer = setTimeout(() => search(q), DEBOUNCE_MS);
      }
      input.addEventListener('input', onType, sig);
      input.addEventListener('focus', () => { if (input.value.trim().length < MIN_CHARS) hint('Type at least ' + MIN_CHARS + ' characters'); else open(true); }, sig);
      input.addEventListener('keydown', e => {
        switch (e.key) {
          case 'ArrowDown': e.preventDefault(); setActive(active + 1); break;
          case 'ArrowUp':   e.preventDefault(); setActive(active - 1); break;
          case 'Enter':     if (active > -1 && view[active]) { e.preventDefault(); choose(view[active].key); } break;
          case 'Escape':    open(false); break;
        }
      }, sig);
      document.addEventListener('mousedown', e => { if (!wrap.contains(e.target)) open(false); }, sig);
    }
  };

  /* ===========================================================================
   * Module: SqlTools  (GATED)
   * ======================================================================== */
  const SqlTools = {
    _flashTimers: new Map(),
    _flash(field) {
      if (!field.isConnected) return;
      clearTimeout(this._flashTimers.get(field));
      field.classList.remove('iqa-copy-flash');
      void field.offsetWidth; // Restart the feedback when copying the same field again.
      field.classList.add('iqa-copy-flash');
      this._flashTimers.set(field, setTimeout(() => {
        field.classList.remove('iqa-copy-flash');
        this._flashTimers.delete(field);
      }, 800));
    },
    mount() {
      injectStyle('iqaSqlToolsCss', SQLTOOLS_CSS);
      this._copyButtons();
      this._copyPath();
      this._enhanceExpressions();
    },
    teardown() {
      this._flashTimers.forEach((timer, field) => { clearTimeout(timer); field.classList.remove('iqa-copy-flash'); });
      this._flashTimers.clear();
      document.querySelectorAll('.sqltext-copy-btn, .copied-msg').forEach(e => e.remove());
      document.querySelectorAll('.SQLText[data-copy-btn-added]').forEach(e => { delete e.dataset.copyBtnAdded; });
      document.querySelectorAll('.textarea-wrap').forEach(wrap => {
        const ta = wrap.querySelector('textarea'); if (!ta) return;
        wrap.parentNode.insertBefore(ta, wrap); wrap.remove();
        ta.disabled = false; ta.style.resize = ''; ta.style.height = ''; ta.style.overflowY = ''; ta.style.boxSizing = '';
        delete ta.dataset.enhanced; delete ta.dataset.userResized;
      });
    },

    _copyButtons() {
      document.querySelectorAll('.SQLText').forEach(el => {
        if (el.dataset.copyBtnAdded) return;
        el.dataset.copyBtnAdded = 'true';
        const btn = elFromHTML(`<span class="sqltext-copy-btn" role="button" tabindex="0" title="Copy SQL">${COPY_ICON}</span>`);
        const doCopy = async () => {
          const ok = await copyText(el.innerText || el.textContent || el.value || '');
          if (!btn.isConnected) return;
          if (ok) this._flash(el);
          btn.parentNode.querySelector('.copied-msg')?.remove();
          const msg = document.createElement('span'); msg.className = 'copied-msg'; msg.textContent = ok ? 'Copied' : 'Failed';
          msg.style.cssText = 'color:#0b62c4;margin-left:8px;font-size:12px;';
          btn.insertAdjacentElement('afterend', msg); setTimeout(() => msg.remove(), 1200);
        };
        btn.addEventListener('click', doCopy);
        btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doCopy(); } });
        (el.closest('div') || el.parentNode || el).insertAdjacentElement('beforeend', btn);
      });
    },

    _copyPath() {
      const path = document.querySelector('span[id$="_QueryPath"]');
      if (!path || path.nextElementSibling?.classList.contains('iqa-path-copy')) return;
      const btn = elFromHTML(`<button type="button" class="sqltext-copy-btn iqa-path-copy" title="Copy path" aria-label="Copy query path">${COPY_ICON}</button>`);
      const msg = document.createElement('span');
      msg.className = 'copied-msg'; msg.setAttribute('role', 'status');
      msg.style.cssText = 'color:#0b62c4;margin-left:8px;font-size:12px;';
      path.insertAdjacentElement('afterend', btn);
      btn.insertAdjacentElement('afterend', msg);
      let timer;
      btn.addEventListener('click', async () => {
        const ok = await copyText(path.textContent.trim());
        if (!btn.isConnected) return;
        if (ok) this._flash(path);
        clearTimeout(timer);
        msg.textContent = ok ? 'Copied' : 'Copy failed';
        timer = setTimeout(() => { msg.textContent = ''; }, 1200);
      });
    },

    _enhanceExpressions() {
      const table = document.getElementById('SelectedProperty'); if (!table) return;

      // A long expression in a narrow column wraps over many lines, so growth
      // stops here and the field scrolls. Dragging the resize grip still wins.
      const AUTO_HEIGHT_MAX = 320;
      const autoResize = (ta) => {
        const userMin = ta.dataset.userResized === 'true' ? ta.clientHeight : null;
        ta.dataset.resizingProgrammatically = 'true';
        ta.style.height = 'auto';
        const content = ta.scrollHeight;
        const needed = Math.min(content, AUTO_HEIGHT_MAX);
        const height = userMin != null ? Math.max(needed, userMin) : needed;
        ta.style.height = height + 'px';
        ta.style.overflowY = content > height ? 'auto' : 'hidden';
        requestAnimationFrame(() => { delete ta.dataset.resizingProgrammatically; });
      };
      const iconBtn = (label) => { const el = document.createElement('span'); el.className = 'icon-btn'; el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('aria-label', label); el.title = label; return el; };

      table.querySelectorAll('textarea').forEach(ta => {
        if (ta.dataset.enhanced) return;
        ta.dataset.enhanced = 'true';
        // Vertical-only: a manual width would become an inline style that
        // outlives the column it was dragged in, overflowing narrower layouts.
        ta.disabled = true; ta.style.resize = 'vertical'; ta.style.overflowY = 'hidden'; ta.style.boxSizing = 'border-box';

        const wrapper = document.createElement('div'); wrapper.className = 'textarea-wrap';
        const bar = document.createElement('div'); bar.className = 'icon-bar';
        const editBtn = iconBtn('Edit text'); editBtn.innerHTML = PENCIL_ICON;
        const copyBtn = iconBtn('Copy text'); copyBtn.innerHTML = COPY_ICON;

        ta.parentNode.replaceChild(wrapper, ta);
        wrapper.appendChild(ta); wrapper.appendChild(bar); bar.appendChild(editBtn); bar.appendChild(copyBtn);

        requestAnimationFrame(() => autoResize(ta));
        ta.addEventListener('input', () => autoResize(ta));
        if ('ResizeObserver' in window) {
          new ResizeObserver(entries => { for (const e of entries) { if (e.target.dataset.resizingProgrammatically === 'true') continue; e.target.dataset.userResized = 'true'; } }).observe(ta);
        }

        const toggleEdit = () => {
          const makingEditable = ta.disabled;
          ta.disabled = !makingEditable;
          editBtn.setAttribute('aria-label', makingEditable ? 'Lock text' : 'Edit text');
          editBtn.title = makingEditable ? 'Lock text' : 'Edit text';
          editBtn.classList.toggle('is-editing', makingEditable);
          autoResize(ta);
          if (makingEditable) { ta.focus(); const n = ta.value.length; try { ta.setSelectionRange(n, n); } catch (_) {} }
        };
        editBtn.addEventListener('click', toggleEdit);
        editBtn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleEdit(); } });

        let statusTimer = null, statusEl = null;
        const doCopy = async () => {
          const ok = await copyText(ta.value);
          if (!copyBtn.isConnected) return;
          if (ok) this._flash(ta);
          if (!statusEl) { statusEl = document.createElement('span'); statusEl.className = 'copy-status'; statusEl.textContent = 'Copied'; statusEl.setAttribute('aria-live', 'polite'); statusEl.style.cssText = 'font-size:12px;color:#0b62c4;margin-left:6px;'; copyBtn.insertAdjacentElement('afterend', statusEl); }
          statusEl.textContent = ok ? 'Copied' : 'Copy failed';
          statusEl.style.opacity = '1';
          if (statusTimer) clearTimeout(statusTimer);
          statusTimer = setTimeout(() => { if (statusEl) statusEl.style.opacity = '0'; }, 1200);
        };
        copyBtn.addEventListener('click', doCopy);
        copyBtn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doCopy(); } });
      });
    }
  };

  /* ===========================================================================
   * Module: FilterSortDropdowns  (GATED)
   * ======================================================================== */
  const FilterSortDropdowns = {
    _items: [],
    _label(text) { return text.trim().replace(/^\[([^\]]+)\]\s*/, '$1.'); },
    _isFieldSelect(select) {
      return [...select.options].some(o => /^\[[^\]]+\]\s*\S/.test(o.text.trim()) || /\.SR\d+\|/i.test(o.value));
    },
    mount() {
      injectStyle('iqaDropdownCss', DROPDOWN_CSS);
      this._items = this._items.filter(item => {
        if (item.select.isConnected) { item.sync(); return true; }
        item.dispose(); return false;
      });
      document.querySelectorAll('table.iqa-filter-condition-box select').forEach(select => {
        if (select.matches('select.property') || this._isFieldSelect(select))
          this._create(select, select.matches('select.property') ? 'Add a filter' : 'Select a field');
      });
      document.querySelectorAll('[id$="_SortPanel_Body"] > table > tbody > tr > td:nth-child(2) > select')
        .forEach(select => this._create(select, 'Add a sort'));
    },
    teardown() {
      this._items.forEach(item => item.dispose()); this._items = [];
      document.getElementById('iqaDropdownCss')?.remove();
    },
    _create(select, label) {
      if (this._items.some(item => item.select === select)) return;
      const oldDisplay = select.style.display, abort = new AbortController(), sig = { signal: abort.signal };
      const id = 'iqa-field-' + Math.random().toString(36).slice(2);
      const wrap = elFromHTML(`<div class="iqa-field-picker"><input type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" autocomplete="off" spellcheck="false"><button type="button" tabindex="-1" aria-label="Show fields">▾</button></div>`);
      const input = wrap.querySelector('input'), button = wrap.querySelector('button');
      input.setAttribute('aria-label', label); input.placeholder = label; input.setAttribute('aria-controls', id);
      const list = document.createElement('div'); list.id = id; list.className = 'iqa-field-list';
      list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', label); list.hidden = true;
      document.body.appendChild(list); select.before(wrap); select.style.display = 'none';
      let options = [], active = -1;
      const sync = () => {
        const option = select.options[select.selectedIndex];
        input.value = !option || option.value === 'None' || option.value === '' ? '' : this._label(option.text);
        input.disabled = button.disabled = select.disabled;
      };
      const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; sync(); };
      const position = () => {
        const r = wrap.getBoundingClientRect(), width = Math.min(r.width, innerWidth - 16);
        list.style.width = width + 'px'; list.style.left = Math.max(8, Math.min(r.left, innerWidth - width - 8)) + 'px';
        const below = innerHeight - r.bottom - 8, above = r.top - 8, upwards = below < 240 && above > below;
        list.style.maxHeight = Math.max(60, Math.min(300, upwards ? above : below)) + 'px';
        list.style.top = upwards ? 'auto' : (r.bottom + 2) + 'px';
        list.style.bottom = upwards ? (innerHeight - r.top + 2) + 'px' : 'auto';
      };
      const choose = option => {
        const changed = select.value !== option.value; select.value = option.value; close();
        if (changed) {
          select.dispatchEvent(new Event('input', { bubbles: true }));
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      };
      const render = (query = '') => {
        if (select.disabled) return;
        const q = query.trim().toLowerCase();
        options = [...select.options].filter(o => !o.disabled && !o.hidden && !o.parentElement?.disabled && o.value !== 'None' && o.value !== '' && this._label(o.text).toLowerCase().includes(q));
        list.replaceChildren(); active = -1; input.removeAttribute('aria-activedescendant');
        options.forEach((option, i) => {
          const item = document.createElement('div'); item.id = id + '-' + i; item.setAttribute('role', 'option');
          item.setAttribute('aria-selected', String(option.value === select.value));
          const text = this._label(option.text), index = text.toLowerCase().indexOf(q);
          if (!q) item.textContent = text;
          else {
            const mark = document.createElement('mark'); mark.textContent = text.slice(index, index + q.length);
            item.append(document.createTextNode(text.slice(0, index)), mark, document.createTextNode(text.slice(index + q.length)));
          }
          item.addEventListener('mousedown', e => e.preventDefault());
          item.addEventListener('click', () => { choose(option); input.focus(); }); list.appendChild(item);
        });
        if (!options.length) { const empty = document.createElement('div'); empty.textContent = 'No matching fields'; empty.setAttribute('role', 'status'); list.appendChild(empty); }
        list.hidden = false; input.setAttribute('aria-expanded', 'true'); position();
      };
      const setActive = index => {
        if (!options.length) return;
        active = (index + options.length) % options.length;
        [...list.children].forEach((item, i) => item.classList.toggle('is-active', i === active));
        input.setAttribute('aria-activedescendant', list.children[active].id);
        list.children[active].scrollIntoView({ block: 'nearest' });
      };
      input.addEventListener('focus', () => input.select(), sig);
      input.addEventListener('click', () => { if (list.hidden) render(); }, sig);
      input.addEventListener('input', () => render(input.value), sig);
      input.addEventListener('blur', close, sig);
      input.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault(); if (list.hidden) render();
          setActive(active < 0 ? (e.key === 'ArrowDown' ? 0 : options.length - 1) : active + (e.key === 'ArrowDown' ? 1 : -1));
        } else if (e.key === 'Enter') { e.preventDefault(); if (!list.hidden && active >= 0) choose(options[active]); }
        else if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if (e.key === 'Tab') close();
      }, sig);
      button.addEventListener('mousedown', e => e.preventDefault(), sig);
      button.addEventListener('click', () => { input.focus(); list.hidden ? render() : close(); }, sig);
      select.addEventListener('change', sync, sig);
      document.addEventListener('mousedown', e => { if (!wrap.contains(e.target) && !list.contains(e.target)) close(); }, sig);
      window.addEventListener('resize', close, sig);
      window.addEventListener('scroll', e => { if (!list.hidden && !list.contains(e.target)) close(); }, { capture: true, signal: abort.signal });
      sync();
      this._items.push({ select, sync, dispose() { abort.abort(); list.remove(); wrap.remove(); select.style.display = oldDisplay; } });
    }
  };

  /* ===========================================================================
   * Module: UncheckAll  (GATED) — select/clear Display column selection
   * ======================================================================== */
  const UncheckAll = {
    mount() {
      const table = document.getElementById('SelectedProperty');
      const header = document.querySelector('#SelectedProperty > tbody > tr.GridHeader > td:nth-child(1)');
      if (!header) return;
      if (this._table === table) { this._sync(); return; }
      this.teardown();
      const label = elFromHTML('<label class="iqa-uncheck" title="Select all columns" style="cursor:pointer;margin:0;"><input type="checkbox" id="uncheckAllBox" aria-label="Select all columns"></label>');
      header.appendChild(label);
      const master = label.querySelector('input');
      const boxes = () => [...table.querySelectorAll(':scope > tbody > tr:not(.GridHeader) > td:first-child input[type="checkbox"]')].filter(cb => !cb.disabled);
      const sync = () => {
        const all = boxes(), selected = all.filter(cb => cb.checked).length;
        master.checked = all.length > 0 && selected === all.length;
        master.indeterminate = selected > 0 && selected < all.length;
        master.disabled = !all.length;
        label.title = master.checked ? 'Deselect all columns' : 'Select all columns';
        master.setAttribute('aria-label', label.title);
      };
      master.addEventListener('change', () => {
        const checked = master.checked;
        boxes().forEach(cb => {
          if (cb.checked === checked) return;
          cb.checked = checked;
          cb.dispatchEvent(new Event('input', { bubbles: true }));
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        });
        sync();
      });
      table.addEventListener('change', sync);
      this._table = table; this._sync = sync; sync();
    },
    teardown() {
      this._table?.removeEventListener('change', this._sync);
      this._table = this._sync = null;
      document.querySelector('.iqa-uncheck')?.remove();
    }
  };

  /* ===========================================================================
   * Module: FilterAutocomplete  (GATED)
   * ======================================================================== */
  const FilterAutocomplete = (() => {
    const PREFIX = 'iqaFilterHist::', MAX = 15;
    const attached = [];
    const load = p => { try { return JSON.parse(localStorage.getItem(PREFIX + p)) || []; } catch { return []; } };
    const save = (p, a) => { try { localStorage.setItem(PREFIX + p, JSON.stringify(a.slice(0, MAX))); } catch {} };
    const add  = (p, v) => { v = (v || '').trim(); if (!v) return; const a = load(p).filter(x => x.toLowerCase() !== v.toLowerCase()); a.unshift(v); save(p, a); };
    const del  = (p, v) => save(p, load(p).filter(x => x !== v));
    const propOf = input => { const tr = input.closest('tr'); if (!tr) return ''; return [...tr.querySelectorAll('td')].map(td => td.innerText.trim()).find(t => t) || ''; };
    const eligible = el => { if (!el) return false; if ((el.getAttribute('type') || 'text').toLowerCase() !== 'text') return false; if (el.closest('.iqa-field-picker') || el.readOnly || el.disabled || el.offsetParent === null) return false; if (/ComboBox|Calendar|DatePicker/i.test(el.id || '')) return false; return true; };

    function attach(input) {
      if (input.dataset.iqaHist) return;
      const prop = propOf(input); if (!prop) return;
      input.dataset.iqaHist = '1';
      input.setAttribute('autocomplete', 'off');
      const abort = new AbortController(); const sig = { signal: abort.signal };
      const list = document.createElement('ul'); list.className = 'iqa-hist-list'; document.body.appendChild(list);
      let items = [], active = -1;
      const place = () => { const r = input.getBoundingClientRect(); list.style.left = (scrollX + r.left) + 'px'; list.style.top = (scrollY + r.bottom + 2) + 'px'; list.style.width = r.width + 'px'; };
      const close = () => { list.classList.remove('is-open'); active = -1; };
      const open  = () => { place(); list.classList.add('is-open'); };
      function render() {
        const q = input.value.trim().toLowerCase();
        items = load(prop).filter(v => v.toLowerCase().includes(q));
        list.innerHTML = ''; if (!items.length) return close();
        items.forEach(v => {
          const li = document.createElement('li'); li.className = 'iqa-hist-item';
          const val = document.createElement('span'); val.className = 'iqa-hist-val'; val.textContent = v; val.title = v;
          const x = document.createElement('span'); x.className = 'iqa-hist-del'; x.textContent = '×'; x.title = 'Remove';
          li.append(val, x);
          val.addEventListener('mousedown', e => { e.preventDefault(); choose(v); });
          x.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); del(prop, v); render(); });
          list.appendChild(li);
        });
        open();
      }
      function setActive(i) { const els = [...list.children]; if (!els.length) return; if (i < 0) i = els.length - 1; if (i >= els.length) i = 0; els.forEach(e => e.classList.remove('is-active')); active = i; els[i].classList.add('is-active'); els[i].scrollIntoView({ block: 'nearest' }); }
      function choose(v) { input.value = v; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); close(); }
      input.addEventListener('focus', render, sig);
      input.addEventListener('input', render, sig);
      input.addEventListener('keydown', e => {
        if (!list.classList.contains('is-open')) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
        else if (e.key === 'Enter' && active > -1 && items[active]) { e.preventDefault(); choose(items[active]); }
        else if (e.key === 'Escape') close();
      }, sig);
      input.addEventListener('change', () => add(prop, input.value), sig);
      input.addEventListener('blur', () => { add(prop, input.value); setTimeout(close, 150); }, sig);
      addEventListener('scroll', () => { if (list.classList.contains('is-open')) place(); }, { capture: true, signal: abort.signal });
      attached.push({ input, list, abort });
    }

    return {
      mount() {
        injectStyle('iqaHistCss', HIST_CSS);
        // drop records whose input was replaced by a postback
        for (let i = attached.length - 1; i >= 0; i--) {
          if (!document.contains(attached[i].input)) { attached[i].abort.abort(); attached[i].list.remove(); attached.splice(i, 1); }
        }
        document.querySelectorAll('table.iqa-filter-condition-box input').forEach(el => { if (eligible(el)) attach(el); });
      },
      teardown() {
        attached.forEach(({ input, list, abort }) => { abort.abort(); list.remove(); if (input) { delete input.dataset.iqaHist; input.removeAttribute('autocomplete'); } });
        attached.length = 0;
        document.querySelectorAll('.iqa-hist-list').forEach(l => l.remove());
      }
    };
  })();

  /* ===========================================================================
   * Module: DragSort  (GATED) — drag-reorder Display columns and Sorting priorities
   * ======================================================================== */
  const DragSort = (() => {
    const SS_KEY = 'iqaSortEnabled', STYLE_ID = 'iqasort-style', ROW_ID = 'iqasort-toggle-row';
    let tab = 'Display';
    const activeTab = () => [...document.querySelectorAll('a.rtsSelected .rtsTxt')].map(el => el.textContent.trim()).find(name => name === 'Display' || name === 'Sorting');
    const grid = () => tab === 'Sorting' ? document.querySelector('[id$="_SortPanel_Body"] > table.Grid') : document.getElementById('SelectedProperty');
    const preferenceKey = () => tab === 'Sorting' ? 'iqaPrioritySortEnabled' : SS_KEY;

    let ac = null, tbody = null, baseline = [], rearranged = null, enabled = false;
    let distinctPlacement = null, layoutPanel = null;
    const rows = () => (tbody ? [...tbody.children].filter(tr => tr.__iqa) : []);
    const preferredOn = () => { try { return sessionStorage.getItem(preferenceKey()) !== '0'; } catch (_) { return true; } };
    const remember = on => { try { sessionStorage.setItem(preferenceKey(), on ? '1' : '0'); } catch (_) {} };
    const orderChanged = () => rows().some((tr, i) => tr !== baseline[i] || tr.__iqa.orderSel.value !== tr.__iqa.baseOrder);

    function ensureStyles() {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement('style'); style.id = STYLE_ID;
      style.textContent = `
        .iqa-display-options-layout > .Info { flex:0 0 100%; width:100%; box-sizing:border-box; padding:0 0 12px !important; }
        .iqa-display-options-layout > #SelectedProperty { flex:0 0 100%; width:100%; }
        #${ROW_ID} { display:flex; align-items:center; justify-content:space-between; gap:var(--space-4,16px) var(--space-6,24px); flex-wrap:wrap; flex:0 0 100%; width:100%; min-width:0; box-sizing:border-box; margin:0 0 14px; padding:var(--space-3,12px) var(--space-4,16px); border:1px solid var(--border,#e2e5e9); border-radius:var(--radius-sm,4px); background:var(--bg-subtle,#f8f9fa); }
        #${ROW_ID} .iqasort-settings { display:flex; align-items:center; gap:var(--space-4,16px) 28px; flex-wrap:wrap; min-width:0; }
        #${ROW_ID} .iqasort-distinct-slot:empty { display:none; }
        #${ROW_ID} .iqasort-distinct { display:flex; align-items:center; gap:var(--space-2,8px); margin:0 !important; padding:0 !important; }
        #${ROW_ID} .iqasort-distinct .inputNoBorder { display:inline-flex; align-items:center; gap:var(--space-2,8px); }
        #${ROW_ID} .iqasort-distinct input[type="checkbox"], #${ROW_ID} .iqasort-distinct label { margin:0; }
        #${ROW_ID} .iqasort-distinct .sysicon-info { display:inline-block !important; }
        #${ROW_ID} .iqasort-reorder { display:flex; flex-direction:column; gap:var(--space-1,4px); }
        #${ROW_ID} .iqasort-switch { align-self:flex-start; }
        #${ROW_ID} .iqasort-help { font-size:var(--fs-xs,12px); color:var(--text-muted,#545962); }
        #${ROW_ID} .iqasort-status { font-size:var(--fs-sm,13px); color:var(--text-muted,#545962); }
        #${ROW_ID} .iqasort-actions { display:flex; align-items:center; gap:var(--space-3,12px); flex-wrap:wrap; margin-left:auto; }
        #${ROW_ID} .iqasort-reset { margin:0; white-space:nowrap; }
        @media (max-width:900px) { #${ROW_ID} .iqasort-settings { flex:1 1 100%; } #${ROW_ID} .iqasort-actions { flex:1 1 100%; justify-content:space-between; margin-left:0; } }

        /* Reordering presentation follows the taskbar command palette: a grip
           handle, the held row floating under the pointer, an empty dashed slot
           and the displaced rows sliding into their new places. */
        .iqasort-grip { display:inline-flex; align-items:center; justify-content:center; flex:none; width:24px; height:24px; border-radius:var(--radius-sm,4px); color:var(--text-muted,#545962); cursor:grab; user-select:none; touch-action:none; }
        .iqasort-grip:hover { color:var(--text-link,#006f94); background:var(--bg-sunken,#f1f3f5); }
        .iqasort-grip:active { cursor:grabbing; }
        .iqasort-grip:focus-visible { outline:2px solid var(--border-focus,#006f94); outline-offset:2px; }
        .iqasort-grip > svg { display:block; width:18px; height:18px; }
        /* The handle keeps a column of its own beside the property text. Left
           inline it wraps onto a line above the label as soon as the column is
           narrow enough for the source name to wrap. */
        .iqasort-prop { display:flex; align-items:flex-start; gap:var(--space-1,4px); min-width:0; }
        .iqasort-prop__body { flex:1 1 auto; min-width:0; }
        #SelectedProperty .SQLExpression .iqasort-grip { margin-top:4px; }
        .iqasort-nosel, .iqasort-nosel * { cursor:grabbing !important; user-select:none !important; -webkit-user-select:none !important; }
        .iqasort-dragging { display:none !important; }
        .iqasort-placeholder > td { padding:0 !important; border:0 !important; background:transparent !important; }
        .iqasort-placeholder .iqasort-drop { box-sizing:border-box; border:2px dashed var(--border-focus,#006f94); border-radius:var(--radius-sm,4px); background:transparent; }
        .iqasort-floating { position:fixed; top:0; left:0; z-index:99999; box-sizing:border-box; overflow:hidden; border:1px solid var(--border-focus,#006f94); border-radius:var(--radius-sm,4px); background:var(--bg-surface,#fff); box-shadow:var(--shadow-lg,0 8px 20px rgba(0,27,35,.16)); opacity:.8; pointer-events:none; }
        .iqasort-floating > table { width:100%; margin:0; table-layout:fixed; border-collapse:collapse; }
        .iqasort-moved > td { background:rgba(0,126,168,.10) !important; background:color-mix(in srgb,var(--border-focus,#006f94) 12%,transparent) !important; }
      `;
      document.head.appendChild(style);
    }

    function readRows() {
      const g = grid(); if (!g) return [];
      return [...g.querySelectorAll('tr')].map(tr => {
        // Sorting's final Add sort row has a numeric priority too, but no
        // saved criterion key. Keep it out of dragging and renumbering.
        if (tab === 'Sorting' && !tr.querySelector('td:first-child input[type="hidden"][value^="SC"]')) return null;
        const nameEl = tr.querySelector('td:nth-child(2) b');
        const expression = tr.querySelector('td:nth-child(2) textarea');
        if (!nameEl && !expression && tab !== 'Sorting') return null;
        const orderSel = [...tr.querySelectorAll('select')].find(s => s.options.length && [...s.options].every(o => /^\d+$/.test(o.value)));
        if (!orderSel) return null;
        const src = tr.querySelector('td:nth-child(2) span.small');
        const alias = tr.querySelector('td:nth-child(4) input[type="text"]')?.value.trim();
        const name = nameEl ? nameEl.textContent.trim() : tab === 'Sorting'
          ? (tr.querySelector('td:nth-child(2)')?.textContent.trim() || 'Sort criterion')
          : (alias || 'Custom SQL expression');
        return { tr, name, orderSel, src };
      }).filter(Boolean);
    }

    function indexRows(current = readRows()) {
      tbody = null;
      for (const { tr, name, orderSel, src } of current) {
        tr.__iqa = { orderSel, name, table: (src ? src.textContent : '').replace(/[\[\]]/g, '').trim(), baseOrder: orderSel.value };
        tbody = tr.parentNode;
      }
      return current.length;
    }

    function renumber() {
      let changed = 0;
      rows().forEach((tr, i) => {
        const want = String(i + 1); const sel = tr.__iqa.orderSel;
        if (![...sel.options].some(o => o.value === want)) { console.warn(`${tr.__iqa.name}: no Order option "${want}"`); return; }
        if (sel.value !== want) { sel.value = want; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); changed++; }
        tr.classList.toggle('iqasort-moved', !!rearranged?.has(tr));
        tr.classList.remove('GridRow', 'GridAlternateRow'); tr.classList.add(i % 2 ? 'GridAlternateRow' : 'GridRow');
      });
      status(changed); return changed;
    }

    function status() {
      const row = document.getElementById(ROW_ID); if (!row) return;
      const count = rows().length, changed = enabled && orderChanged();
      const noun = tab === 'Sorting' ? (count === 1 ? 'sort criterion' : 'sort criteria') : (count === 1 ? 'column' : 'columns');
      row.querySelector('.iqasort-status').textContent = `${count} ${noun}` + (changed ? ' · Order changed' : '');
      row.querySelector('[data-act="reset"]').disabled = !changed;
    }

    function enable() {
      if (enabled) return;
      if (activeTab() !== tab) return console.warn('Drag sort: not on the active reordering tab.');
      if (!indexRows()) return console.warn('Drag sort: no property rows with an Order dropdown.');
      ac = new AbortController();
      const on = (el, ev, fn) => el.addEventListener(ev, fn, { signal: ac.signal });
      const g = grid();
      let dragging = null, placeholder = null, floating = null, homeNext = null, pointer = null;
      let grabOffset = { x: 0, y: 0 }, point = { x: 0, y: 0 }, frame = 0;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const slides = new Map();

      baseline = rows();
      baseline.forEach(tr => { tr.__iqa.baseOrder = tr.__iqa.orderSel.value; });
      rearranged = new Set();

      const clearSelection = () => { const s = document.getSelection?.(); if (s && !s.isCollapsed) s.removeAllRanges(); };
      // An empty dashed slot exactly as tall as the row being moved.
      const makePlaceholder = (tr, height) => {
        const ph = document.createElement('tr');
        ph.className = 'iqasort-placeholder'; ph.setAttribute('aria-hidden', 'true');
        const td = document.createElement('td'); td.colSpan = tr.children.length || 9;
        const drop = document.createElement('div'); drop.className = 'iqasort-drop'; drop.style.height = height + 'px';
        td.appendChild(drop); ph.appendChild(td);
        return ph;
      };
      // The held row itself follows the pointer. A table row cannot be floated
      // on its own, so the copy keeps a one-row table with the measured column
      // widths. Ids, names and controls are stripped so the copy stays inert.
      const makeFloating = (tr, box) => {
        const widths = [...tr.children].map(td => td.getBoundingClientRect().width);
        const holder = document.createElement('div');
        holder.className = 'iqasort-floating'; holder.setAttribute('aria-hidden', 'true'); holder.inert = true;
        holder.style.width = box.width + 'px';
        const table = document.createElement('table');
        table.className = tr.closest('table')?.className || '';
        const body = document.createElement('tbody');
        const clone = tr.cloneNode(true);
        clone.classList.remove('iqasort-dragging');
        const fields = [...tr.querySelectorAll('input, select, textarea')];
        [...clone.querySelectorAll('input, select, textarea')].forEach((field, i) => {
          const source = fields[i];
          if (!source) return;
          if (field.type === 'checkbox' || field.type === 'radio') field.checked = source.checked;
          else field.value = source.value;
        });
        clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        clone.querySelectorAll('[name]').forEach(el => el.removeAttribute('name'));
        [...clone.children].forEach((td, i) => { td.style.width = widths[i] + 'px'; });
        body.appendChild(clone); table.appendChild(body); holder.appendChild(table);
        document.body.appendChild(holder);
        return holder;
      };
      const stopSlides = () => { slides.forEach(animation => animation.cancel()); slides.clear(); };
      // FLIP: rows the drop slot displaced slide from where they just were.
      function slideRows(list, previousTops) {
        if (reducedMotion.matches) return;
        for (const node of list) {
          const previousTop = previousTops.get(node);
          if (previousTop === undefined) continue;
          const distance = previousTop - node.getBoundingClientRect().top;
          if (!Number.isFinite(distance) || Math.abs(distance) < 0.5) continue;
          const animation = node.animate(
            [{ transform: 'translateY(' + distance + 'px)' }, { transform: 'translateY(0)' }],
            { duration: 180, easing: 'cubic-bezier(.2, .8, .2, 1)' });
          slides.set(node, animation);
          animation.onfinish = () => { if (slides.get(node) === animation) slides.delete(node); };
        }
      }
      const tops = (list) => new Map(list.map(tr => [tr, tr.getBoundingClientRect().top]));
      const settled = (tr) => {
        const box = tr.getBoundingClientRect();
        // Hit-test settled positions so a sliding row cannot move the target.
        const transform = getComputedStyle(tr).transform;
        const shift = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42;
        return box.top - shift + box.height / 2;
      };
      function position() {
        if (!dragging) return;
        floating.style.left = (point.x - grabOffset.x) + 'px';
        floating.style.top = (point.y - grabOffset.y) + 'px';
        const others = rows().filter(tr => tr !== dragging);
        const next = others.find(tr => point.y < settled(tr));
        const targetIndex = next ? others.indexOf(next) : others.length;
        const currentIndex = others.filter(tr =>
          tr.compareDocumentPosition(placeholder) & Node.DOCUMENT_POSITION_FOLLOWING).length;
        if (targetIndex === currentIndex) return;
        const previousTops = tops(others);
        stopSlides();
        if (next) tbody.insertBefore(placeholder, next);
        else if (others.length) others[others.length - 1].after(placeholder);
        slideRows(others, previousTops);
      }
      // Keep scrolling while the pointer rests against an edge, as the palette
      // does inside its list.
      function tick() {
        if (point.y < 40) window.scrollBy(0, -12);
        else if (point.y > window.innerHeight - 40) window.scrollBy(0, 12);
        position();
        frame = requestAnimationFrame(tick);
      }
      function endDrag(cancelled) {
        if (!dragging) return;
        cancelAnimationFrame(frame); frame = 0;
        const landed = !cancelled && placeholder?.parentNode;
        const moved = dragging;
        const previousTops = tops(rows().filter(tr => tr !== moved));
        stopSlides();
        tbody.insertBefore(moved, landed ? placeholder : homeNext);
        if (landed) rearranged.add(moved);
        placeholder?.remove(); floating?.remove();
        moved.classList.remove('iqasort-dragging');
        dragging = placeholder = floating = homeNext = null;
        g.classList.remove('iqasort-nosel'); renumber();
        slideRows(rows().filter(tr => tr !== moved), previousTops);
      }

      function finishPointer(cancelled) {
        const previous = pointer; pointer = null;
        if (previous?.grip.hasPointerCapture(previous.id)) previous.grip.releasePointerCapture(previous.id);
        endDrag(cancelled);
      }
      function pointRow(event) {
        const row = document.elementFromPoint(event.clientX, event.clientY)?.closest('tr');
        return row?.parentNode === tbody && (row.__iqa || row === placeholder) ? row : null;
      }
      on(document, 'pointermove', event => {
        if (!pointer || event.pointerId !== pointer.id) return;
        if (!dragging && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) < 4) return;
        event.preventDefault();
        point = { x: event.clientX, y: event.clientY };
        if (!dragging) {
          dragging = pointer.row; homeNext = dragging.nextSibling; clearSelection();
          g.classList.add('iqasort-nosel');
          const box = dragging.getBoundingClientRect();
          grabOffset = { x: pointer.x - box.left, y: pointer.y - box.top };
          floating = makeFloating(dragging, box);
          placeholder = makePlaceholder(dragging, box.height);
          tbody.insertBefore(placeholder, dragging);
          dragging.classList.add('iqasort-dragging');
          frame = requestAnimationFrame(tick);
        }
        position();
      });
      on(document, 'pointerup', event => {
        if (pointer && event.pointerId === pointer.id) finishPointer(!pointRow(event));
      });
      on(document, 'pointercancel', event => {
        if (pointer && event.pointerId === pointer.id) finishPointer(true);
      });
      on(document, 'keydown', event => {
        if (pointer && event.key === 'Escape') { event.preventDefault(); finishPointer(true); }
      });
      on(window, 'blur', () => finishPointer(true));
      ac.signal.addEventListener('abort', () => finishPointer(true), { once: true });

      for (const tr of baseline) {
        const cell = tr.querySelector('td:nth-child(2)');
        const grip = elFromHTML(`<span class="iqasort-grip" role="button" tabindex="0">${GRIP_ICON}</span>`);
        grip.title = 'Drag to reorder (or Alt+Up / Alt+Down)';
        grip.draggable = false;
        grip.setAttribute('aria-label', 'Reorder ' + tr.__iqa.name); grip.setAttribute('aria-describedby', 'iqasortHelp');
        addGrip(cell, grip);
        on(grip, 'pointerdown', event => {
          if (event.button !== 0 || !event.isPrimary || pointer) return;
          event.preventDefault(); clearSelection(); grip.focus({ preventScroll: true });
          pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, row: tr, grip };
          grip.setPointerCapture(event.pointerId);
        });
        on(grip, 'lostpointercapture', () => { if (pointer?.grip === grip) finishPointer(true); });
        on(grip, 'dragstart', event => event.preventDefault());
        on(grip, 'keydown', e => {
          if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
          e.preventDefault(); const list = rows(); const i = list.indexOf(tr); const j = e.key === 'ArrowUp' ? i - 1 : i + 1;
          if (j < 0 || j >= list.length) return;
          tbody.insertBefore(tr, e.key === 'ArrowUp' ? list[j] : list[j].nextSibling);
          rearranged.add(tr); renumber(); grip.focus();
        });
      }

      enabled = true; remember(true); syncToggleUi(); status();
    }

    // The handle and the rest of the property cell share a flex row, so the
    // cell keeps its original children inside a body element while dragging is
    // on. Removing the handle alone would leave that element behind.
    function addGrip(cell, grip) {
      const existing = cell.querySelector('.iqasort-prop');
      if (existing) { existing.querySelector('.iqasort-grip')?.remove(); existing.insertBefore(grip, existing.firstChild); return; }
      const body = document.createElement('div');
      body.className = 'iqasort-prop__body';
      while (cell.firstChild) body.appendChild(cell.firstChild);
      const shell = document.createElement('div');
      shell.className = 'iqasort-prop';
      shell.appendChild(grip); shell.appendChild(body);
      cell.appendChild(shell);
    }
    function removeGrips() {
      document.querySelectorAll('.iqasort-prop').forEach(shell => {
        const body = shell.querySelector('.iqasort-prop__body'), cell = shell.parentNode;
        if (body) while (body.firstChild) cell.insertBefore(body.firstChild, shell);
        shell.remove();
      });
      document.querySelectorAll('.iqasort-grip').forEach(el => el.remove());
    }

    function disable({ remember: savePreference = true } = {}) {
      ac?.abort(); ac = null;
      removeGrips();
      document.querySelectorAll('.iqasort-floating, .iqasort-placeholder').forEach(el => el.remove());
      grid()?.classList.remove('iqasort-nosel');
      rows().forEach(tr => { tr.draggable = false; tr.classList.remove('iqasort-moved', 'iqasort-dragging'); });
      enabled = false; if (savePreference) remember(false); syncToggleUi(); status();
    }

    function reset() {
      if (!enabled) return console.warn('Turn drag sort on first.');
      const current = rows(), after = current[current.length - 1]?.nextSibling || null;
      baseline.forEach(tr => tbody.insertBefore(tr, after)); rearranged.clear();
      rows().forEach(tr => { const sel = tr.__iqa.orderSel; if (sel.value !== tr.__iqa.baseOrder) { sel.value = tr.__iqa.baseOrder; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); } });
      rows().forEach((tr, i) => { tr.classList.remove('iqasort-moved', 'GridRow', 'GridAlternateRow'); tr.classList.add(i % 2 ? 'GridAlternateRow' : 'GridRow'); });
      status();
    }

    function restoreOptionsLayout() {
      if (distinctPlacement) {
        const { node, marker } = distinctPlacement;
        node.classList.remove('iqasort-distinct');
        if (marker.parentNode) marker.replaceWith(node);
        distinctPlacement = null;
      }
      layoutPanel?.classList.remove('iqa-display-options-layout'); layoutPanel = null;
    }

    function placeOptions(row, g) {
      if (tab === 'Sorting') return;
      const panel = g.closest('[id$="_DisplayPanel_Body"]') || g.parentElement;
      if (layoutPanel && layoutPanel !== panel) restoreOptionsLayout();
      layoutPanel = panel; panel.classList.add('iqa-display-options-layout');
      const distinct = panel.querySelector('input[id$="_mDistinctCheckBox"]');
      const nativeRow = distinct?.closest('.inputNoBorder')?.parentElement;
      // Move the existing native control and tooltip together, retaining names,
      // event handlers and the native distinct-query confirmation behaviour.
      if (nativeRow && nativeRow.parentElement === panel) {
        if (distinctPlacement) restoreOptionsLayout();
        layoutPanel = panel; panel.classList.add('iqa-display-options-layout');
        const marker = document.createComment('IQA distinct option original position');
        nativeRow.before(marker); distinctPlacement = { node: nativeRow, marker };
        nativeRow.classList.add('iqasort-distinct');
        row.querySelector('.iqasort-distinct-slot').appendChild(nativeRow);
      }
    }

    function buildToggleRow() {
      const g = grid(); if (!g) return;
      const existing = document.getElementById(ROW_ID);
      if (existing) { placeOptions(existing, g); return; }
      const row = document.createElement('div'); row.id = ROW_ID;
      row.setAttribute('role', 'group'); row.setAttribute('aria-label', tab + ' options');
      const label = tab === 'Sorting' ? 'Drag to reorder sort priority' : 'Drag to reorder columns';
      row.innerHTML = `
        <div class="iqasort-settings">
          <div class="iqasort-distinct-slot"></div>
          <div class="iqasort-reorder">
            <label class="us-switch us-switch--primary iqasort-switch">
              <input type="checkbox" id="iqasortToggle" role="switch" aria-describedby="iqasortHelp">
              <span class="us-switch__track" aria-hidden="true"></span>
              <span>${label}</span>
            </label>
            <span id="iqasortHelp" class="iqasort-help">Drag a handle or use Alt + Up / Down.</span>
          </div>
        </div>
        <div class="iqasort-actions">
          <span class="iqasort-status" role="status" aria-live="polite" aria-atomic="true"></span>
          <button type="button" class="TextButton us-outline-button iqasort-reset" data-act="reset" disabled title="Restore the order captured when drag mode was enabled on this page.">Restore starting order</button>
        </div>`;
      g.parentNode.insertBefore(row, g);
      row.querySelector('#iqasortToggle').addEventListener('change', () => {
        if (enabled) disable(); else enable();
        syncToggleUi();
      });
      row.addEventListener('click', e => { if (e.target.dataset?.act !== 'reset') return; e.preventDefault(); reset(); });
      placeOptions(row, g);
    }
    function syncToggleUi() {
      const row = document.getElementById(ROW_ID); if (!row) return;
      // The native checkbox drives aria-checked, the track and the On/Off text.
      const toggle = row.querySelector('#iqasortToggle');
      toggle.checked = enabled; toggle.disabled = !rows().length;
      row.querySelector('.iqasort-help').textContent = !rows().length ? (tab === 'Sorting' ? 'Add sort criteria to use drag ordering.' : 'Add display columns to use drag ordering.')
        : enabled ? (tab === 'Sorting' ? 'Top row sorts first. Drag a handle or use Alt + Up / Down.' : 'Drag a handle or use Alt + Up / Down.') : 'Turn on to drag rows. Your current order is kept.';
    }

    function install() {
      ensureStyles();
      const nextTab = activeTab();
      if (nextTab && nextTab !== tab) {
        disable({ remember: false }); restoreOptionsLayout();
        document.getElementById(ROW_ID)?.remove();
        tbody = null; baseline = []; rearranged = null;
        tab = nextTab;
      }
      if (!nextTab || !grid()) {
        disable({ remember: false }); restoreOptionsLayout();
        document.getElementById(ROW_ID)?.remove();
        tbody = null; baseline = []; rearranged = null;
        return false;
      }
      const current = readRows(), nodes = new Set(current.map(item => item.tr));
      // Keep the starting order and handlers when the same rows survive an
      // update. Abort old handlers before mounting a replaced grid or row set.
      if (enabled && (nodes.size !== baseline.length || baseline.some(tr => !nodes.has(tr) || tr.parentNode !== tbody))) disable({ remember: false });
      buildToggleRow();
      if (!enabled) indexRows(current);
      if (preferredOn() && !enabled && current.length) enable();
      syncToggleUi(); status();
      return true;
    }
    function destroy() {
      disable({ remember: false });
      restoreOptionsLayout();
      document.getElementById(ROW_ID)?.remove();
      document.getElementById(STYLE_ID)?.remove();
      grid()?.querySelectorAll('tr').forEach(tr => { delete tr.__iqa; });
      tbody = null; baseline = []; rearranged = null;
    }

    // expose a console handle too
    window.__iqaSort = { enable, disable, renumber, reset, destroy, install };

    return { mount: install, teardown: destroy };
  })();

  /* ===========================================================================
   * Module: OverhaulCss  (GATED via body.iqa-enhanced)
   * ======================================================================== */
  const OverhaulCss = { mount() { injectStyle('iqaOverhaulCss', OVERHAUL_CSS); }, teardown() { /* inert once body class removed */ } };

  /* ===========================================================================
   * Registries + shell
   * ======================================================================== */
  // BEGIN FILTER WORKSPACE V1
/* IQA Filters v1: native compact layout and staged within-group reorder. */
function createFilterWorkspace() {
  function orders(state) {
    return state.groups.map(group => ({ slot: group.slot, filters: group.filters.map(filter => filter.slot) }));
  }
  function nextState(state, move) {
    const next = JSON.parse(JSON.stringify(state));
    const group = next.groups.find(group => group.slot === move.group);
    if (!group) throw new Error('group-missing');
    const index = group.filters.findIndex(filter => filter.slot === move.filter);
    const target = index + (move.direction === 'up' ? -1 : 1);
    if (index < 0 || target < 0 || target >= group.filters.length) throw new Error('move-out-of-range');
    [group.filters[index], group.filters[target]] = [group.filters[target], group.filters[index]];
    return next;
  }
  function plan(state) {
    const group = state.groups.find(group => group.filters.length >= 3);
    if (!group) throw new Error('need-three-filters-in-one-group');
    const move = { group: group.slot, filter: group.filters[group.filters.length - 1].slot, direction: 'up' };
    return [move, { ...move }];
  }
  function urlCheck(value, base, original, stage, allowed = []) {
    const url = new URL(value, base), start = new URL(original);
    url.hash = ''; start.hash = '';
    const query = item => { const params = new URLSearchParams(item.search); params.sort(); return params.toString(); };
    const sameEndpoint = item => item.origin === start.origin && item.pathname.toLowerCase() === start.pathname.toLowerCase();
    const facts = { stage, sameOrigin: url.origin === start.origin,
      samePath: url.pathname.toLowerCase() === start.pathname.toLowerCase(),
      sameQueryAsAddressBar: query(url) === query(start),
      matchesSubmittedOrOriginalQuery: [start, ...allowed.map(item => new URL(item))]
        .some(item => sameEndpoint(item) && query(item) === query(url)) };
    // The native form action is authoritative for POST parameters. Its query string
    // need not equal the address bar. Keep the same-origin, same-editor path boundary.
    return { href: url.href, facts, allowed: facts.sameOrigin && facts.samePath
      && (stage === 'action' || facts.matchesSubmittedOrOriginalQuery) };
  }
  async function execute(initial, moves, io) {
    let page = initial, state = io.read(page);
    for (let index = 0; index < moves.length; index++) {
      if (io.stopped()) throw new Error('stopped-between-moves');
      const expected = nextState(state, moves[index]);
      // The next request uses the previous RESPONSE document, never the stale visible page.
      page = await io.post(page, moves[index], index);
      const actual = io.read(page);
      if (JSON.stringify(orders(actual)) !== JSON.stringify(orders(expected))) throw new Error('unexpected-order');
      if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('filter-values-changed');
      state = actual;
      io.verified(index, state);
    }
    return page;
  }

  function planMoves(before, target) {
    if (before.length !== target.length) throw new Error('groups-changed');
    const working = before.map(group => ({ slot: group.slot, filters: [...group.filters] })), moves = [];
    target.forEach((group, groupIndex) => {
      const current = working[groupIndex];
      if (current.slot !== group.slot || new Set(group.filters).size !== group.filters.length
        || [...current.filters].sort().join('|') !== [...group.filters].sort().join('|')) throw new Error('group-membership-changed');
      group.filters.forEach((filter, position) => {
        let from = current.filters.indexOf(filter);
        while (from > position) {
          moves.push({ group: group.slot, filter, direction: 'up' });
          [current.filters[from - 1], current.filters[from]] = [current.filters[from], current.filters[from - 1]];
          from--;
        }
      });
    });
    return moves;
  }
  function groupExplanation(index, value) {
    if (index === 0) return value === 'AndFalse' ? 'Start with records that do not match this group.' : 'Start with records that match this group.';
    return { AndTrue: 'Keep records from the result above that also match this group.',
      AndFalse: 'Exclude records matching this group from the result above.',
      OrTrue: 'Include records matching this group as well as the result above.',
      OrFalse: 'Include records that do not match this group as well as the result above.' }[value] || 'This group combines with the result above.';
  }
  function groupExpression(groups) {
    let expression = '';
    for (const group of groups) {
      if (!group.count) continue;
      if (!['AndTrue', 'AndFalse', 'OrTrue', 'OrFalse'].includes(group.connector)) return 'Group structure unavailable';
      const term = (group.connector.endsWith('False') ? 'NOT ' : '') + 'Group ' + group.number;
      expression = expression ? '(' + expression + (group.connector.startsWith('Or') ? ' OR ' : ' AND ') + term + ')' : term;
    }
    return expression || 'No filter groups defined';
  }
  if (typeof document === 'undefined') return { orders, nextState, execute, planMoves, urlCheck, groupExplanation, groupExpression };
  const RESULT_KEY = 'iqa:filter-reorder:result:v1';
  const selector = 'input[type="hidden"]';
  let originalURL = new URL(location.href); originalURL.hash = '';
  const result = { timeOrigin: performance.timeOrigin };
  let stale = false, busy = false, stopped = false, dialog = null, mountedRoot = null, mountedMarkers = [], undo = [], changeListener = null;
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function button(text, action, className = 'TextButton') {
    const node = element('button', text, className); node.type = 'button'; node.addEventListener('click', action); return node;
  }
  function restoreLayout() {
    if (mountedRoot && changeListener) mountedRoot.removeEventListener('change', changeListener);
    undo.reverse().forEach(fn => fn()); undo = []; mountedRoot = null; mountedMarkers = []; changeListener = null;
  }
  function moveContents(from, into) {
    const nodes = [...from.childNodes]; nodes.forEach(node => into.appendChild(node));
    // Another module may have disposed one of its widgets since this snapshot.
    // Restore only nodes we still own; never resurrect detached controls.
    undo.push(() => nodes.forEach(node => { if (node.parentNode === into) from.appendChild(node); }));
  }
  function mount() {
    if (dialog || busy) return;
    const scope = document.querySelector('[id$="_FiltersPanel_Body"]');
    const markers = scope ? [...scope.querySelectorAll('input[type="hidden"][value^="FS|"],input[type="hidden"][value^="F|"]')] : [];
    if (mountedRoot === scope && scope && markers.length === mountedMarkers.length && markers.every((node, index) => node === mountedMarkers[index])) { changeListener?.(); return; }
    restoreLayout();
    if (!scope) return;
    let groups; try { groups = groupTables(document); } catch (_) { return; }
    if (!groups.length) return;
    mountedRoot = scope; mountedMarkers = markers;
    const addCondition = [...scope.querySelectorAll('input[type="button"],button')].find(button =>
      (button.value || button.textContent || '').trim().toLowerCase() === 'add condition');
    if (addCondition) {
      const wrapper = addCondition.parentElement;
      const block = wrapper?.tagName === 'DIV' && wrapper.childElementCount === 1 ? wrapper : addCondition;
      const parent = block.parentNode, next = block.nextSibling;
      groups[groups.length - 1].table.after(block);
      undo.push(() => parent.insertBefore(block, next?.parentNode === parent ? next : null));
    }
    if (!document.getElementById('iqaFilterWorkspaceCss')) {
      const style = element('style'); style.id = 'iqaFilterWorkspaceCss'; style.textContent = CSS; document.head.appendChild(style);
    }
    const toolbar = element('div', null, 'iqa-filter-toolbar');
    const message = element('span', '', 'iqa-filter-feedback'); message.setAttribute('role', 'status');
    toolbar.append(message); groups[0].table.before(toolbar); undo.push(() => toolbar.remove());
    try {
      const saved = JSON.parse(sessionStorage.getItem(RESULT_KEY) || 'null');
      if (saved && Date.now() - saved.at < 120000 && saved.url === location.href) {
        const matches = JSON.stringify(orders(read({ doc: document }))) === JSON.stringify(saved.target);
        message.textContent = matches ? 'Filter order applied. Save the query when you are ready.' : 'The refreshed order differs from the requested order. Review the filters before saving.';
      }
      sessionStorage.removeItem(RESULT_KEY);
    } catch (_) {}
    const spans = [], rowData = [], columnGroups = [], descriptions = [], addCells = [];
    const explanation = element('p', 'Each group combines with the result above. The group controls below determine how records are included or excluded.', 'iqa-group-overview');
    toolbar.after(explanation); undo.push(() => explanation.remove());
    const logic = element('div', null, 'iqa-group-logic'), logicLabel = element('label', 'Group logic');
    const logicField = element('textarea'); logicField.id = 'iqaGroupLogic'; logicField.readOnly = true; logicField.rows = 1;
    logicLabel.htmlFor = logicField.id;
    const logicNote = element('small');
    logicNote.id = 'iqaGroupLogicNote'; logicField.setAttribute('aria-describedby', logicNote.id);
    logic.append(logicLabel, logicField, logicNote); explanation.before(logic); undo.push(() => logic.remove());
    const nativeHelp = element('details', null, 'iqa-filter-help');
    nativeHelp.appendChild(element('summary', 'Field help'));
    const header = groups[0].table.querySelector('.GridHeader');
    [[1, 'About the Function setting'], [3, 'About Allow multiple values']].forEach(([index, text]) => {
      const icon = header?.cells[index]?.querySelector('.sysicon-info');
      if (!icon) return;
      const parent = icon.parentNode, next = icon.nextSibling, entry = element('div', text + ' ');
      undo.push(() => parent.insertBefore(icon, next?.parentNode === parent ? next : null));
      entry.appendChild(icon); nativeHelp.appendChild(entry);
    });
    if (nativeHelp.children.length > 1) toolbar.appendChild(nativeHelp);
    groups.forEach((group, index) => {
      const table = group.table, filters = rows(group);
      if (filters.some(filter => filter.row.cells.length !== 8)) return;
      table.classList.add('iqa-compact-filter'); undo.push(() => table.classList.remove('iqa-compact-filter', 'iqa-has-search-label'));
      const columns = element('colgroup'); table.prepend(columns); columnGroups.push(columns); undo.push(() => columns.remove());
      const markerRow = table.querySelector('input[type="hidden"][value^="FS|"]')?.closest('tr');
      if (markerRow) {
        const descriptionRow = element('tr', null, 'iqa-group-description'), cell = element('td');
        const name = element('strong', 'Group ' + (index + 1)), text = element('span');
        cell.append(name, text); descriptionRow.appendChild(cell); markerRow.after(descriptionRow);
        descriptions.push({ index, group, cell, text }); undo.push(() => descriptionRow.remove());
      }
      table.querySelectorAll('td[colspan]').forEach(cell => {
        const original = cell.colSpan; spans.push({ cell, original }); undo.push(() => { cell.colSpan = original; });
      });
      const addRow = table.querySelector('select.property')?.closest('tr');
      if (addRow && addRow.cells.length === 8) {
        const cell = addRow.cells[0], originalSpan = cell.getAttribute('colspan');
        const bar = element('div', null, 'iqa-add-filter-bar'), field = element('div', null, 'iqa-add-filter-field');
        addRow.classList.add('iqa-add-filter-row'); addCells.push(cell);
        undo.push(() => { addRow.classList.remove('iqa-add-filter-row'); if (originalSpan === null) cell.removeAttribute('colspan'); else cell.setAttribute('colspan', originalSpan); });
        undo.push(() => bar.remove()); moveContents(cell, field);
        const reorder = button('Reorder filters', () => Busy.run(reorder, openReorder)); reorder.classList.add('iqa-filter-reorder-button');
        reorder.disabled = !groups.some(item => rows(item).length > 1);
        bar.append(field, reorder); cell.appendChild(bar);
      }
      filters.forEach(filter => {
        const row = filter.row, cells = [...row.cells], select = cells[1].querySelector('select');
        row.classList.add('iqa-rule-row'); undo.push(() => row.classList.remove('iqa-rule-row', 'iqa-searchable-row'));
        const actions = element('div', null, 'iqa-filter-row-actions');
        undo.push(() => actions.remove()); moveContents(cells[7], actions); cells[7].appendChild(actions);
        if (select) {
          const details = element('details', null, 'iqa-filter-options'), summary = element('summary', 'ƒx');
          summary.title = 'Function options'; summary.setAttribute('aria-label', 'Function options');
          const label = element('div', 'Function', 'iqa-function-label');
          const panel = element('div', null, 'iqa-filter-options-panel'); panel.appendChild(label);
          details.append(summary, panel); actions.prepend(details); undo.push(() => details.remove());
          moveContents(cells[1], panel);
          const badge = element('span', null, 'iqa-function-badge'); cells[0].appendChild(badge); undo.push(() => badge.remove());
          const update = () => { badge.textContent = select.value !== 'None' ? 'Function: ' + select.options[select.selectedIndex]?.text : ''; badge.hidden = select.value === 'None'; };
          select.addEventListener('change', update); undo.push(() => select.removeEventListener('change', update)); update();
        }
        if (cells[3].querySelector('input[type="checkbox"]')) {
          const multiple = element('label', null, 'iqa-filter-multiple');
          cells[4].appendChild(multiple); undo.push(() => multiple.remove());
          moveContents(cells[3], multiple); multiple.appendChild(document.createTextNode(' Allow multiple values'));
        }
        const valueWrap = element('div', null, 'iqa-filter-value');
        undo.push(() => valueWrap.remove()); moveContents(cells[4], valueWrap); cells[4].appendChild(valueWrap);
        rowData.push({ row, search: cells[5].querySelector('select') });
      });
    });
    changeListener = () => {
      logic.hidden = groups.length < 2;
      explanation.hidden = groups.length < 2;
      const configuredGroups = groups.map((group, index) => ({ number: index + 1, count: rows(group).length,
        connector: group.table.querySelector('input[type="radio"]:checked')?.value }));
      const expression = groupExpression(configuredGroups);
      if (logicField.value !== expression) logicField.value = expression;
      logicField.rows = Math.min(4, Math.max(1, Math.ceil(expression.length / 90)));
      logicNote.textContent = 'Shows the configured group structure. ' + (configuredGroups.some(group => !group.count) ? 'Empty groups are omitted. ' : '') + 'Runtime SQL can vary with optional filters and aggregates.';
      // Include collapsed groups, and never clear or enable/disable native prompt values.
      const visible = groups.some(group => rows(group).some(filter => /^(Optional|Required)$/.test(filter.row.querySelector('select.options')?.value)));
      groups.forEach(group => group.table.classList.toggle('iqa-has-search-label', visible));
      columnGroups.forEach(columns => {
        columns.replaceChildren(...['22%', '12%', '', '130px', ...(visible ? ['170px'] : []), '128px'].map(width => {
          const col = element('col'); if (width) col.style.width = width; return col;
        }));
      });
      descriptions.forEach(({ index, group, cell, text }) => {
        cell.colSpan = visible ? 6 : 5;
        text.textContent = groupExplanation(index, group.table.querySelector('input[type="radio"]:checked')?.value);
      });
      rowData.forEach(({ row, search }) => row.classList.toggle('iqa-searchable-row', /^(Optional|Required)$/.test(search?.value)));
      spans.forEach(({ cell, original }) => { cell.colSpan = Math.max(1, original - (visible ? 2 : 3)); });
      addCells.forEach(cell => { cell.colSpan = visible ? 6 : 5; });
    };
    scope.addEventListener('change', changeListener); changeListener();
  }
  function openReorder() {
    if (busy || dialog) return;
    restoreLayout(); // Return controls to their native locations before reading/serialising them.
    originalURL = new URL(location.href); originalURL.hash = '';
    let initialState, groups;
    try { initialState = read({ doc: document }); groups = groupTables(document); }
    catch (_) { mount(); return; }
    const initial = { doc: document, url: originalURL.href }, baseline = orders(initialState);
    const lists = [];
    const listItems = list => [...list.children].filter(item => item.dataset.slot);
    stale = false; stopped = false;
    dialog = element('dialog', null, 'iqa-reorder-dialog');
    const title = element('h2', 'Reorder filters'); title.id = 'iqaReorderTitle'; dialog.setAttribute('aria-labelledby', title.id);
    const help = element('p', 'Drag a handle within a group, use Alt + Up / Down, or use the move buttons. Apply order updates the query editor; saving the query is a separate action.');
    const content = element('div', null, 'iqa-reorder-groups');
    const reorder = createPointerReorder({
      surface: dialog, scroller: content, items: listItems, blocked: () => busy,
      onDrop: () => update(),
      classes: { dragging: 'iqa-dragging', placeholder: 'iqa-reorder-placeholder', floating: 'iqa-reorder-floating' }
    });
    const status = element('p', 'No position changes yet.', 'iqa-reorder-status'); status.setAttribute('role', 'status');
    const footer = element('div', null, 'iqa-reorder-actions');
    const getTarget = () => lists.map(({ group, list }) => ({ slot: group.slot, filters: listItems(list).map(item => item.dataset.slot) }));
    const apply = button('Apply order', applyOrder, 'TextButton PrimaryButton');
    const cancel = button('Cancel', cancelOrder, 'TextButton us-outline-button');
    function update() {
      const moves = planMoves(baseline, getTarget());
      apply.disabled = !moves.length || moves.length > 100;
      status.textContent = moves.length > 100 ? 'This order needs more than 100 moves. Apply a smaller rearrangement first.' : moves.length ? moves.length + ' native move' + (moves.length === 1 ? '' : 's') + ' to apply. The editor refreshes once when finished.' : 'No position changes yet.';
      lists.forEach(({ list }) => listItems(list).forEach((item, index) => {
        item.querySelector('[data-direction="up"]').disabled = index === 0;
        item.querySelector('[data-direction="down"]').disabled = index === listItems(list).length - 1;
        item.classList.toggle('iqa-reorder-moved', baseline.find(group => group.slot === list.dataset.group).filters[index] !== item.dataset.slot);
      }));
    }
    groups.forEach((group, index) => {
      const section = element('section'), selected = group.table.querySelector('input[type="radio"]:checked');
      const connective = { AndTrue: index ? 'And' : 'Where', AndFalse: index ? 'And Not' : 'Where Not', OrTrue: 'Or', OrFalse: 'Or Not' }[selected?.value] || '';
      section.appendChild(element('h3', 'Group ' + (index + 1) + ' · ' + connective));
      section.appendChild(element('p', groupExplanation(index, selected?.value), 'iqa-reorder-group-help'));
      const list = element('ol', null, 'iqa-reorder-list'); list.dataset.group = group.slot; lists.push({ group, list });
      rows(group).forEach(filter => {
        const item = element('li'); item.dataset.slot = filter.slot;
        const name = filter.row.querySelector('td.property')?.textContent.trim() || filter.slot;
        const handle = elFromHTML(`<span class="iqa-filter-grip" role="button" tabindex="0">${GRIP_ICON}</span>`);
        handle.title = 'Drag to reorder (or Alt+Up / Alt+Down)';
        handle.setAttribute('aria-label', 'Drag ' + name + '; use the adjacent move buttons for keyboard reordering');
        reorder.attach(handle, item, list);
        const up = button('Move up', () => { if (!busy && item.previousElementSibling) { list.insertBefore(item, item.previousElementSibling); update(); } }, 'TextButton us-outline-button'); up.dataset.direction = 'up'; up.setAttribute('aria-label', 'Move ' + name + ' up');
        const down = button('Move down', () => { if (!busy && item.nextElementSibling) { list.insertBefore(item.nextElementSibling, item); update(); } }, 'TextButton us-outline-button'); down.dataset.direction = 'down'; down.setAttribute('aria-label', 'Move ' + name + ' down');
        handle.addEventListener('keydown', event => {
          if (!busy && event.altKey && /^(ArrowUp|ArrowDown)$/.test(event.key)) { event.preventDefault(); reorder.cancel(); (event.key === 'ArrowUp' ? up : down).click(); handle.focus(); }
        });
        item.append(handle, element('span', name, 'iqa-reorder-name'), up, down); list.appendChild(item);
      });
      if (!list.children.length) section.appendChild(element('p', 'No filters in this group.'));
      section.appendChild(list); content.appendChild(section);
    });
    function close() { reorder.cancel(); dialog?.remove(); dialog = null; mount(); document.querySelector('.iqa-filter-reorder-button')?.focus(); }
    function cancelOrder() {
      if (busy) { stopped = true; cancel.disabled = true; status.textContent = 'Stopping after the current move. Completed moves will remain applied.'; }
      else if (stale) location.replace(originalURL.href);
      else close();
    }
    dialog.addEventListener('cancel', event => { event.preventDefault(); if (!busy && !stale) close(); });
    async function applyOrder() {
      if (busy || stale) return;
      const target = getTarget(), moves = planMoves(baseline, target);
      if (!moves.length || moves.length > 100) return;
      const applying = Busy.button(apply);
      busy = true; apply.disabled = true; cancel.textContent = 'Stop after current move';
      content.inert = true;
      try {
        if (location.href.split('#')[0] !== originalURL.href || JSON.stringify(read(initial)) !== JSON.stringify(initialState)) throw new Error('page-changed-since-staging');
        const finalPage = await execute(initial, moves, { read, stopped: () => stopped,
          post(page, move, index) { status.textContent = 'Applying order: move ' + (index + 1) + ' of ' + moves.length + '…'; return post(page, move, index); },
          verified() {} });
        try { sessionStorage.setItem(RESULT_KEY, JSON.stringify({ at: Date.now(), url: finalPage.url, target })); } catch (_) {}
        status.textContent = 'Order applied. Refreshing the editor…'; cancel.disabled = true;
        location.replace(finalPage.url);
      } catch (error) {
        applying.clear();
        busy = false; cancel.disabled = false; cancel.textContent = stale ? 'Refresh editor' : 'Close';
        status.textContent = stale ? 'The reorder stopped. Some moves may have applied. Refresh the editor to see the current order before continuing.' : 'The reorder could not start. Close this window and try again.';
        const detail = element('small', 'Reason: ' + (/^[a-z-]+$/.test(error.message) ? error.message : 'request-or-browser-error'));
        status.appendChild(document.createElement('br')); status.appendChild(detail);
        // Never retry after an uncertain request or unlock a stale native form.
      }
    }
    footer.append(apply, cancel); dialog.append(title, help, content, status, footer); document.body.appendChild(dialog); update(); dialog.showModal();
  }
  const CSS = `
    .iqa-filter-toolbar{display:flex;align-items:center;gap:14px;margin:12px 0 18px;flex-wrap:wrap}
    .iqa-filter-toolbar:not(:has(> :not(:empty))){display:none}
    .iqa-add-filter-row>td:not(:first-child){display:none}
    .iqa-add-filter-bar{display:flex;align-items:center;gap:16px;width:100%;padding:6px 0}
    .iqa-add-filter-field{flex:0 1 350px;min-width:0}
    .iqa-add-filter-field>.iqa-field-picker{width:100%!important;max-width:100%}
    .iqa-add-filter-bar>.iqa-filter-reorder-button{margin-left:auto;flex:0 0 auto}
    .iqa-filter-feedback{font-size:var(--fs-sm,13px);color:var(--text-muted,#545962)}
    .iqa-filter-help{font-size:var(--fs-sm,13px)}
    .iqa-filter-help summary{cursor:pointer;color:var(--text-link,#006f94)}
    .iqa-filter-help summary:focus-visible{outline:2px solid var(--border-focus,#006f94);outline-offset:2px}
    .iqa-filter-help>div{display:inline-flex;align-items:center;gap:4px;margin:6px 14px 0 0;color:var(--text-muted,#545962)}
    .iqa-filter-help .sysicon.sysicon-info{display:inline-block!important;vertical-align:middle}
    table.iqa-compact-filter{width:100%;table-layout:fixed;margin-bottom:18px}
    .iqa-group-overview{margin:0 0 16px;color:#526173;font-size:13px}
    .iqa-group-logic{margin:4px 0 12px}.iqa-group-logic>label{display:block;font-weight:600;margin-bottom:5px}
    body.iqa-enhanced .iqa-group-logic>textarea{display:block;width:100%!important;max-width:100%;min-height:40px!important;height:auto!important;box-sizing:border-box;padding:9px 12px;border:1px solid #cbd5e1;border-radius:4px;background:#f5f8fb;color:#183a50;font:15px/1.5 Consolas,monospace;resize:vertical}
    .iqa-group-logic>small{display:block;color:#526173;font-size:12px;margin-top:5px}
    .iqa-group-description>td{padding:12px 8px!important;white-space:normal!important;color:#526173}
    .iqa-group-description strong{color:#243343;margin-right:14px}.iqa-group-description span{font-size:13px}
    .iqa-compact-filter .GridHeader>td:nth-child(2),.iqa-compact-filter .GridHeader>td:nth-child(4),.iqa-compact-filter .iqa-rule-row>td:nth-child(2),.iqa-compact-filter .iqa-rule-row>td:nth-child(4){display:none}
    .iqa-compact-filter:not(.iqa-has-search-label) .GridHeader>td:nth-child(7),.iqa-compact-filter:not(.iqa-has-search-label) .iqa-rule-row>td:nth-child(7){display:none}
    .iqa-compact-filter .iqa-rule-row:not(.iqa-searchable-row)>td:nth-child(7)>*{visibility:hidden}
    body.iqa-enhanced .iqa-compact-filter .GridHeader>td{width:auto!important}
    .iqa-compact-filter .iqa-rule-row>td{vertical-align:middle!important;padding:3px 5px;white-space:normal!important}
    .iqa-compact-filter .iqa-rule-row>td:nth-child(1){overflow:visible;white-space:normal}
    .iqa-compact-filter .iqa-rule-row>td:nth-child(3)>select,.iqa-compact-filter .iqa-rule-row>td:nth-child(6)>select,.iqa-compact-filter .iqa-rule-row>td:nth-child(7)>input{width:100%!important;min-width:0;box-sizing:border-box}
    .iqa-filter-value{display:grid;grid-template-columns:110px minmax(100px,1fr);gap:4px 8px;align-items:start}
    .iqa-filter-value>*{grid-column:2;min-width:0;max-width:100%;box-sizing:border-box}
    .iqa-filter-value>select[aria-label="Value type field"]{grid-column:1;grid-row:1 / span 3;margin:0!important}
    body.iqa-enhanced .iqa-compact-filter .iqa-filter-value>input[type=text],body.iqa-enhanced .iqa-compact-filter .iqa-filter-value>select,body.iqa-enhanced .iqa-compact-filter .iqa-filter-value>.iqa-field-picker,body.iqa-enhanced .iqa-compact-filter .iqa-filter-value>.RadComboBox{width:100%!important;max-width:100%!important;min-width:0!important}
    body.iqa-enhanced .iqa-filter-value>.RadComboBox>.rcbInner{display:flex!important;align-items:stretch;width:100%!important;box-sizing:border-box;padding-right:0!important}
    body.iqa-enhanced .iqa-filter-value>.RadComboBox>.rcbInner>input.rcbInput{flex:1 1 0;width:0!important;min-width:0!important;max-width:none!important;box-sizing:border-box;float:none!important}
    body.iqa-enhanced .iqa-filter-value>.RadComboBox>.rcbInner>.rcbActionButton{position:static!important;flex:0 0 32px;width:32px!important;height:auto!important;align-self:stretch;margin:0!important}
    body.iqa-enhanced .iqa-compact-filter .iqa-filter-value>span:has(>.chosen-container){display:block;width:100%;min-width:0}
    body.iqa-enhanced .iqa-compact-filter .iqa-filter-value .chosen-container{width:100%!important;max-width:100%;min-width:0;box-sizing:border-box}
    body.iqa-enhanced .iqa-compact-filter .iqa-filter-value .chosen-choices{width:100%;box-sizing:border-box}
    .iqa-filter-value>span:empty{display:none}.iqa-filter-value>.RadComboBox{padding-bottom:0!important}
    @media(max-width:1200px){.iqa-filter-value{grid-template-columns:minmax(0,1fr)}.iqa-filter-value>*{grid-column:1}.iqa-filter-value>select[aria-label="Value type field"]{grid-row:auto}}
    .iqa-filter-multiple{display:flex;align-items:center;gap:6px;margin:4px 0 0;font-size:var(--fs-sm,13px);white-space:normal}
    .iqa-filter-row-actions{display:flex;align-items:center;justify-content:flex-start;gap:6px;min-height:30px;white-space:nowrap;flex-wrap:nowrap}
    .iqa-filter-row-actions>*{flex-shrink:0}.iqa-filter-row-actions>.DisplayInlineBlock{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
    .iqa-filter-row-actions input[type=image]{margin:0!important;flex-shrink:0}
    .iqa-filter-options{position:relative!important;text-align:left;margin:0;white-space:normal}.iqa-filter-options summary{display:inline-flex;align-items:center;justify-content:center;width:26px;height:30px;box-sizing:border-box;cursor:pointer;color:#087ba7;font:600 17px/1 Georgia,serif;white-space:nowrap;list-style:none;border-radius:4px}.iqa-filter-options summary::-webkit-details-marker{display:none}
    .iqa-filter-options summary:hover{background:#eaf3fc}.iqa-filter-options summary:focus-visible{outline:2px solid #087ba7;outline-offset:1px}
    .iqa-filter-options-panel{position:absolute;right:0;top:calc(100% + 6px);z-index:100;width:180px;padding:10px;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:5px;background:#fff;box-shadow:0 4px 14px #0002}
    body.iqa-enhanced .iqa-compact-filter .iqa-filter-options select{width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box}.iqa-function-label{font-size:12px;margin-top:6px}
    .iqa-function-badge{display:block;font-size:12px;color:#526173;margin-top:4px}
    .iqa-reorder-dialog{width:min(900px,94vw);max-height:90vh;padding:var(--space-6,24px);box-sizing:border-box;border:1px solid var(--border,#e2e5e9);border-radius:var(--radius,8px);background:var(--bg-surface,#fff);color:var(--text-base,#545962);font:var(--fw-normal,400) var(--fs-base,14px)/var(--lh-base,1.5) var(--font-body,"Open Sans","Helvetica Neue",Arial,sans-serif);box-shadow:var(--shadow-lg,0 8px 20px rgba(0,27,35,.16))}
    .iqa-reorder-dialog::backdrop{background:rgb(0 27 35 / .4)}
    .iqa-reorder-dialog h2{margin-top:0;color:var(--text-strong,#1c2024);font:var(--fw-semi,600) var(--fs-xl,22px)/var(--lh-tight,1.25) var(--font-display,"Red Hat Display","Open Sans",Helvetica,Arial,sans-serif)}
    .iqa-reorder-dialog h3{padding:var(--space-2,8px) var(--space-3,12px);border-radius:var(--radius-sm,4px);background:var(--bg-sunken,#f1f3f5);color:var(--text-strong,#1c2024);font-size:var(--fs-md,16px)}
    .iqa-reorder-groups{max-height:55vh;overflow:auto}
    .iqa-reorder-list{list-style:none;padding:0;margin:0}
    .iqa-reorder-list li{display:flex;align-items:center;gap:var(--space-2,8px);padding:10px 4px;border-bottom:1px solid var(--border,#e2e5e9);flex-wrap:wrap}
    .iqa-reorder-name{flex:1;min-width:160px;color:var(--text-strong,#1c2024)}
    .iqa-reorder-group-help{margin:0 12px 10px;font-size:var(--fs-sm,13px);color:var(--text-muted,#545962)}
    .iqa-reorder-actions{display:flex;gap:var(--space-3,12px)}
    .iqa-reorder-status{min-height:24px;font-size:var(--fs-sm,13px);color:var(--text-muted,#545962)}
    .iqa-reorder-list li.iqa-reorder-moved{background:rgba(0,126,168,.10);background:color-mix(in srgb,var(--border-focus,#006f94) 12%,transparent)}
    .iqa-reorder-dialog .iqa-filter-grip{display:inline-flex;align-items:center;justify-content:center;flex:none;width:28px;height:28px;padding:0;border:0;border-radius:var(--radius-sm,4px);background:transparent;color:var(--text-muted,#545962);cursor:grab;user-select:none;touch-action:none}
    .iqa-reorder-dialog .iqa-filter-grip:hover{color:var(--text-link,#006f94);background:var(--bg-sunken,#f1f3f5)}
    .iqa-reorder-dialog .iqa-filter-grip:active{cursor:grabbing}
    .iqa-filter-grip:focus-visible{outline:2px solid var(--border-focus,#006f94);outline-offset:2px}
    .iqa-filter-grip>svg{display:block;width:18px;height:18px}
    .iqa-reorder-dialog.iqa-is-sorting,.iqa-reorder-dialog.iqa-is-sorting *{cursor:grabbing!important;user-select:none}
    .iqa-reorder-list li.iqa-dragging{display:none}
    .iqa-reorder-list li.iqa-reorder-placeholder{box-sizing:border-box;margin:0;padding:0;border:2px dashed var(--border-focus,#006f94);border-radius:var(--radius-sm,4px);background:transparent}
    .iqa-reorder-dialog>li.iqa-reorder-floating{display:flex;align-items:center;gap:var(--space-2,8px);flex-wrap:wrap;position:fixed;top:0;left:0;z-index:1;box-sizing:border-box;padding:10px 4px;border:1px solid var(--border-focus,#006f94);border-radius:var(--radius-sm,4px);background:var(--bg-surface,#fff);box-shadow:var(--shadow-lg,0 8px 20px rgba(0,27,35,.16));opacity:.8;pointer-events:none}
  `;
  return { mount, teardown() {
    if (busy || stale) { stopped = true; return; }
    dialog?.remove(); dialog = null; restoreLayout(); document.getElementById('iqaFilterWorkspaceCss')?.remove();
  } };
  function marker(container, prefix) {
    return Array.from(container.querySelectorAll(selector)).find(input => input.value.startsWith(prefix + '|'));
  }
  function slot(input, prefix) {
    const match = String(input?.value || '').match(new RegExp('^' + prefix + '\\|([A-Za-z0-9_-]{1,64})$'));
    if (!match) throw new Error('invalid-slot-marker');
    return match[1];
  }
  function groupTables(doc) {
    const scope = doc.querySelector('[id$="_FiltersPanel_Body"]') || doc.getElementById('ChildControls');
    if (!scope) throw new Error('filters-panel-missing');
    return Array.from(scope.querySelectorAll(selector)).filter(input => input.value.startsWith('FS|'))
      .map(input => ({ slot: slot(input, 'FS'), table: input.closest('table') }));
  }
  function rows(group) {
    return Array.from(group.table.querySelectorAll(selector))
      .filter(input => input.value.startsWith('F|') && input.closest('table') === group.table)
      .map(input => ({ slot: slot(input, 'F'), row: input.closest('tr') }));
  }
  function read(page) {
    const groups = groupTables(page.doc).map(group => ({ slot: group.slot, filters: rows(group).map(filter => ({
      slot: filter.slot,
      // In-memory comparison only. These values NEVER go into the saved/copyable report.
      values: Array.from(filter.row.querySelectorAll('input,select,textarea')).filter(control =>
        control.name && (control.tagName !== 'INPUT' || /^(text|search|number|date|checkbox|radio)$/i.test(control.type)))
        .map(control => ({ type: control.tagName + ':' + control.type,
          value: control.tagName === 'SELECT' ? Array.from(control.options).filter(option => option.selected).map(option => option.value)
            : /^(checkbox|radio)$/.test(control.type) ? control.checked : control.value }))
    })) }));
    if (!groups.length || new Set(groups.map(group => group.slot)).size !== groups.length) throw new Error('groups-missing-or-ambiguous');
    for (const group of groups) if (new Set(group.filters.map(filter => filter.slot)).size !== group.filters.length) throw new Error('ambiguous-filter-slots');
    return { groups };
  }
  function record() {}
  function checkURL(value, base, stage, allowed = []) {
    const check = urlCheck(value, base, originalURL.href, stage, allowed);
    record('url-check', check.facts);
    if (!check.allowed) {
      throw new Error('response-or-action-url-changed');
    }
    return check.href;
  }
  async function post(page, move, index) {
    const group = groupTables(page.doc).find(group => group.slot === move.group);
    const row = group && rows(group).find(filter => filter.slot === move.filter)?.row;
    const button = row?.querySelector('input[type="image"][title="Move Up"]');
    if (!button || button.disabled || !button.name) throw new Error('native-up-button-unavailable');
    const form = button.form;
    if (!form || form.method.toLowerCase() !== 'post') throw new Error('native-post-form-unavailable');
    if (button.getAttribute('onclick')) throw new Error('button-has-unhandled-client-script');
    const url = checkURL(form.getAttribute('action') || page.url, page.url, 'action');
    const data = new FormData(form);
    // Reproduce an image submitter's coordinates; FormData(form) excludes buttons.
    data.set(button.name + '.x', '1'); data.set(button.name + '.y', '1');
    if (data.has('__EVENTTARGET')) data.set('__EVENTTARGET', '');
    if (data.has('__EVENTARGUMENT')) data.set('__EVENTARGUMENT', '');
    data.delete('__ASYNCPOST');
    const body = new URLSearchParams();
    for (const [name, value] of data) {
      if (typeof value !== 'string') {
        if (value.size > 0) throw new Error('file-upload-present');
        continue;
      }
      body.append(name, value);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    record('post-start', { step: index + 1, filter: move.filter,
      button: /^ctl[0-9][A-Za-z0-9_$:-]{0,220}$/.test(button.name) ? button.name : '[nonstandard name omitted]' });
    // From here onward the server may have processed a move, even if fetch fails.
    stale = true;
    try {
      const response = await fetch(url, { method: 'POST', body, credentials: 'same-origin',
        redirect: 'follow', signal: controller.signal, headers: { 'Accept': 'text/html' } });
      const finalURL = checkURL(response.url, page.url, 'response', [url, page.url]);
      if (!response.ok || !/text\/html/i.test(response.headers.get('content-type') || '')) throw new Error('non-html-or-error-response');
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      // No scripts from the response are executed or inserted into the visible page.
      const error = doc.querySelector('[id$="_ErrorMsgLabel"]');
      if (error?.textContent.trim()) throw new Error('native-filter-error');
      record('post-response', { step: index + 1, status: response.status, redirected: response.redirected,
        documentStayedVisible: performance.timeOrigin === result.timeOrigin });
      return { doc, url: finalURL };
    } finally { clearTimeout(timeout); }
  }

}

  const FilterWorkspace = createFilterWorkspace();
  // END FILTER WORKSPACE V1

  // BEGIN SOURCE WORKSPACE V1
/* IQA Sources v1: stage a source order, apply native adjacent moves, refresh once.
 * Relationship controls/state may change through native iMIS processing. They are
 * submitted from each fresh response, but are not part of reorder verification.
 */
function createSourceWorkspace() {
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const order = state => state.sources.map(source => source.slot);
  const preserved = state => state.sources.map(({ slot, source, alias, type }) => ({ slot, source, alias, type })).sort((a, b) => a.slot.localeCompare(b.slot));
  function nextState(state, source) {
    const next = JSON.parse(JSON.stringify(state)), index = next.sources.findIndex(item => item.slot === source);
    if (index < 1) throw new Error('source-cannot-move-up');
    [next.sources[index - 1], next.sources[index]] = [next.sources[index], next.sources[index - 1]];
    return next;
  }
  function planMoves(before, target) {
    if (new Set(before).size !== before.length || new Set(target).size !== target.length
      || !equal([...before].sort(), [...target].sort())) throw new Error('source-membership-changed');
    const working = [...before], moves = [];
    target.forEach((source, position) => {
      let from = working.indexOf(source);
      while (from > position) {
        moves.push(source);
        [working[from - 1], working[from]] = [working[from], working[from - 1]];
        from--;
      }
    });
    return moves;
  }
  function postbackOptions(script, buttonName) {
    const match = script.trim().match(/^(?:javascript:\s*)?WebForm_DoPostBackWithOptions\(\s*new WebForm_PostBackOptions\(([\s\S]*)\)\s*\)\s*;?$/);
    let args;
    try { args = match && JSON.parse('[' + match[1] + ']'); } catch (_) {}
    // Parse known option data, never eval an onclick or invoke a submit-capable hook.
    if (!args || args.length !== 7 || args[0] !== buttonName || args[1] !== ''
      || typeof args[2] !== 'boolean' || typeof args[3] !== 'string'
      || args[4] !== '' || args[5] !== false || args[6] !== false) throw new Error('unsupported-postback-options');
    return { validation: args[2], validationGroup: args[3] };
  }
  function validate(options, runtime) {
    if (!options.validation) return;
    if (typeof runtime.Page_ClientValidate !== 'function') throw new Error('native-validation-unavailable');
    if (runtime.Page_ClientValidate(options.validationGroup) !== true || runtime.Page_IsValid === false) throw new Error('native-validation-failed');
  }
  function checkURL(value, base, original, stage, allowed = []) {
    const url = new URL(value, base), start = new URL(original); url.hash = ''; start.hash = '';
    const query = item => { const params = new URLSearchParams(item.search); params.sort(); return params.toString(); };
    const endpoint = item => item.origin === start.origin && item.pathname.toLowerCase() === start.pathname.toLowerCase();
    if (!endpoint(url) || (stage === 'response' && ![start, ...allowed.map(item => new URL(item))].some(item => endpoint(item) && query(item) === query(url)))) {
      throw new Error('response-or-action-url-changed');
    }
    return url.href;
  }
  async function execute(initial, moves, io) {
    let page = initial, state = io.read(page);
    for (let index = 0; index < moves.length; index++) {
      if (io.stopped()) throw new Error('stopped-between-moves');
      const expected = nextState(state, moves[index]);
      page = await io.post(page, moves[index], index);
      const actual = io.read(page);
      if (!equal(order(actual), order(expected))) throw new Error('unexpected-source-order');
      if (!equal(preserved(actual), preserved(expected))) throw new Error('source-details-changed');
      // Native relationship refreshes are explicitly allowed, including when the first source changes.
      state = actual;
      io.verified?.(index, state);
    }
    return page;
  }
  function sourceRows(doc) {
    return [...doc.querySelectorAll('input[type="hidden"]')].filter(input => /^SR\d+$/.test(input.value))
      .map(input => ({ slot: input.value, marker: input, row: input.closest('tr') }));
  }
  function read(page) {
    const sources = sourceRows(page.doc).map(({ slot, row }) => {
      const alias = row?.querySelector('input[id*="txtAlias"]');
      if (!alias || !row.cells[0] || !row.cells[2]) throw new Error('source-controls-missing');
      return { slot, alias: alias.value, source: row.cells[0].textContent.trim(), type: row.cells[2].textContent.trim() };
    });
    if (!sources.length || new Set(order({ sources })).size !== sources.length) throw new Error('sources-missing-or-ambiguous');
    return { sources };
  }
  if (typeof document === 'undefined') return { order, preserved, nextState, planMoves, postbackOptions, validate, checkURL, execute, read };
  const RESULT_KEY = 'iqa:source-reorder:result:v1';
  let toolbar = null, mountedMarkers = [], dialog = null, busy = false, stale = false, stopped = false;
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function button(text, action, className = 'TextButton') {
    const node = element('button', text, className); node.type = 'button'; node.addEventListener('click', action); return node;
  }
  function mount() {
    if (dialog || busy || stale) return;
    const rows = sourceRows(document), markers = rows.map(row => row.marker);
    if (toolbar?.isConnected && markers.length === mountedMarkers.length && markers.every((marker, index) => marker === mountedMarkers[index])) return;
    toolbar?.remove(); toolbar = null; mountedMarkers = [];
    if (!rows.length || !rows[0].row) return;
    const table = rows[0].row.closest('table');
    if (!table || rows.some(item => item.row?.closest('table') !== table)) return;
    let state; try { state = read({ doc: document }); } catch (_) { return; }
    if (!document.getElementById('iqaSourceWorkspaceCss')) {
      const style = element('style'); style.id = 'iqaSourceWorkspaceCss'; style.textContent = CSS; document.head.appendChild(style);
    }
    toolbar = element('div', null, 'iqa-source-toolbar'); mountedMarkers = markers;
    const status = element('span', '', 'iqa-source-feedback'); status.setAttribute('role', 'status');
    const reorder = button('Reorder business objects', () => Busy.run(reorder, openReorder)); reorder.classList.add('iqa-source-reorder-button'); reorder.disabled = state.sources.length < 2;
    toolbar.append(status, reorder); table.before(toolbar);
    try {
      const saved = JSON.parse(sessionStorage.getItem(RESULT_KEY) || 'null');
      if (saved && Date.now() - saved.at < 120000 && [saved.url, saved.originalURL].includes(location.href.split('#')[0])) {
        status.textContent = equal(order(state), saved.target) ? 'Business-object order applied. Save the query when you are ready.' : 'The refreshed source order differs from the requested order. Review it before saving.';
      }
      sessionStorage.removeItem(RESULT_KEY);
    } catch (_) {}
  }
  function nativeButton(page, slot) {
    const row = sourceRows(page.doc).find(source => source.slot === slot)?.row;
    const move = row?.querySelector('input[type="image"][title="Move Up"]');
    if (!move || move.disabled || !move.name) throw new Error('native-up-button-unavailable');
    if (!move.form || move.form.method.toLowerCase() !== 'post') throw new Error('native-post-form-unavailable');
    return move;
  }
  function openReorder() {
    if (busy || stale || dialog) return;
    const originalURL = location.href.split('#')[0], initial = { doc: document, url: originalURL };
    let initialState;
    try { initialState = read(initial); } catch (_) { return; }
    if (initialState.sources.length < 2) return;
    const baseline = order(initialState);
    stale = false; stopped = false;
    dialog = element('dialog', null, 'iqa-source-reorder-dialog');
    const title = element('h2', 'Reorder business objects'); title.id = 'iqaSourceReorderTitle'; dialog.setAttribute('aria-labelledby', title.id);
    const help = element('p', 'Drag a handle, use Alt + Up / Down, or use the move buttons. Apply order updates the editor; save the query when you are ready.');
    const content = element('div', null, 'iqa-source-reorder-content'), list = element('ol', null, 'iqa-source-reorder-list'); content.appendChild(list);
    const status = element('p', '', 'iqa-source-reorder-status'); status.setAttribute('role', 'status');
    const footer = element('div', null, 'iqa-source-reorder-actions');
    const apply = button('Apply order', applyOrder, 'TextButton PrimaryButton');
    const cancel = button('Cancel', cancelOrder, 'TextButton us-outline-button');
    const listItems = node => [...node.children].filter(item => item.dataset.slot);
    const items = () => listItems(list);
    const target = () => items().map(item => item.dataset.slot);
    const reorder = createPointerReorder({
      surface: dialog, scroller: content, items: listItems, blocked: () => busy || stale,
      onDrop: () => update(),
      classes: { dragging: 'iqa-source-dragging', placeholder: 'iqa-source-placeholder', floating: 'iqa-source-floating' }
    });
    function update() {
      const positions = target(), moves = planMoves(baseline, positions), changed = positions.filter((slot, index) => slot !== baseline[index]).length;
      apply.disabled = !moves.length || moves.length > 100;
      status.textContent = moves.length > 100 ? 'Please apply a smaller rearrangement first.' : changed ? changed + ' positions changed. The editor will refresh once after applying.' : 'No position changes yet.';
      items().forEach((item, index) => {
        item.querySelector('[data-direction="up"]').disabled = index === 0;
        item.querySelector('[data-direction="down"]').disabled = index === positions.length - 1;
        item.querySelector('.iqa-source-position').textContent = String(index + 1);
        item.classList.toggle('iqa-source-moved', baseline[index] !== item.dataset.slot);
      });
    }
    initialState.sources.forEach(source => {
      const item = element('li'); item.dataset.slot = source.slot;
      const name = source.alias || source.source;
      const handle = elFromHTML(`<span class="iqa-source-grip" role="button" tabindex="0">${GRIP_ICON}</span>`);
      handle.title = 'Drag to reorder (or Alt+Up / Alt+Down)'; handle.setAttribute('aria-label', 'Reorder ' + name + '; Alt + Up or Down, or use the move buttons');
      reorder.attach(handle, item, list);
      function move(direction) {
        if (busy || stale) return;
        reorder.cancel();
        if (direction === 'up' && item.previousElementSibling) list.insertBefore(item, item.previousElementSibling);
        if (direction === 'down' && item.nextElementSibling) list.insertBefore(item.nextElementSibling, item);
        update();
      }
      const up = button('Move up', () => move('up'), 'TextButton us-outline-button');
      const down = button('Move down', () => move('down'), 'TextButton us-outline-button');
      up.dataset.direction = 'up'; down.dataset.direction = 'down';
      up.setAttribute('aria-label', 'Move ' + name + ' up'); down.setAttribute('aria-label', 'Move ' + name + ' down');
      handle.addEventListener('keydown', event => {
        if (event.altKey && /^(ArrowUp|ArrowDown)$/.test(event.key)) { event.preventDefault(); move(event.key === 'ArrowUp' ? 'up' : 'down'); handle.focus(); }
      });
      const label = element('span', name, 'iqa-source-name');
      if (source.source !== name) label.appendChild(element('small', source.source));
      item.append(handle, element('span', '', 'iqa-source-position'), label, up, down); list.appendChild(item);
    });
    function close() {
      reorder.cancel(); dialog?.remove(); dialog = null; mount(); document.querySelector('.iqa-source-reorder-button')?.focus();
    }
    function cancelOrder() {
      if (busy) { stopped = true; cancel.disabled = true; status.textContent = 'Stopping after the current move. Completed moves will remain applied.'; }
      else if (stale) location.replace(originalURL);
      else close();
    }
    dialog.addEventListener('cancel', event => { event.preventDefault(); if (!busy && !stale) close(); });
    async function applyOrder() {
      if (busy || stale) return;
      reorder.cancel();
      const requestedOrder = target(), moves = planMoves(baseline, requestedOrder);
      if (!moves.length || moves.length > 100) return;
      const applying = Busy.button(apply);
      busy = true; apply.disabled = true; cancel.textContent = 'Stop after current move'; content.inert = true;
      try {
        if (location.href.split('#')[0] !== originalURL || !equal(read(initial), initialState)) throw new Error('page-changed-since-staging');
        const firstButton = nativeButton(initial, moves[0]);
        const options = postbackOptions(firstButton.getAttribute('onclick') || '', firstButton.name);
        const finalPage = await execute(initial, moves, { read, stopped: () => stopped,
          async post(page, slot, index) {
            const move = nativeButton(page, slot), form = move.form;
            const currentOptions = postbackOptions(move.getAttribute('onclick') || '', move.name);
            if (!equal(currentOptions, options)) throw new Error('validation-options-changed');
            if (location.href.split('#')[0] !== originalURL || !equal(read(initial), initialState)) throw new Error('visible-editor-state-changed');
            validate(currentOptions, window);
            if (page.doc === document && !form.noValidate && !move.formNoValidate && typeof form.checkValidity === 'function' && !form.checkValidity()) throw new Error('html-form-validation-failed');
            const url = checkURL(form.getAttribute('action') || page.url, page.url, originalURL, 'action');
            // Fresh native fields, including any native relationship updates, are carried forward.
            const data = new FormData(form);
            data.set(move.name + '.x', '1'); data.set(move.name + '.y', '1');
            if (data.has('__EVENTTARGET')) data.set('__EVENTTARGET', '');
            if (data.has('__EVENTARGUMENT')) data.set('__EVENTARGUMENT', '');
            data.delete('__ASYNCPOST');
            const body = new URLSearchParams();
            for (const [name, value] of data) {
              if (typeof value === 'string') body.append(name, value);
              else if (value.size > 0) throw new Error('file-upload-present');
            }
            const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30000);
            status.textContent = 'Applying order: ' + Math.round(index / moves.length * 100) + '%…';
            stale = true; // Once requested, an uncertain outcome must never be retried on the old form.
            try {
              const response = await fetch(url, { method: 'POST', body, credentials: 'same-origin', redirect: 'follow', signal: controller.signal, headers: { Accept: 'text/html' } });
              const finalURL = checkURL(response.url, page.url, originalURL, 'response', [url, page.url]);
              if (!response.ok || !/text\/html/i.test(response.headers.get('content-type') || '')) throw new Error('non-html-or-error-response');
              const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
              if ([...doc.querySelectorAll('[id$="_ErrorMsgLabel"]')].some(label => label.textContent.trim())) throw new Error('native-source-error');
              return { doc, url: finalURL }; // Response scripts are not inserted or executed.
            } finally { clearTimeout(timer); }
          } });
        try { sessionStorage.setItem(RESULT_KEY, JSON.stringify({ at: Date.now(), originalURL, url: finalPage.url, target: requestedOrder })); } catch (_) {}
        status.textContent = 'Order applied. Refreshing the editor…'; cancel.disabled = true;
        location.replace(finalPage.url);
      } catch (error) {
        applying.clear();
        busy = false; cancel.disabled = false; cancel.textContent = stale ? 'Refresh editor' : 'Close';
        const validation = /validation/.test(error.message);
        status.textContent = stale ? 'The reorder stopped. Refresh the editor to see the current order before continuing.' : validation ? 'Close this window and check the editor’s validation messages before trying again.' : 'The reorder could not start. Close this window and try again.';
        console.warn('[IQA Sources reorder]', /^[a-z-]+$/.test(error.message) ? error.message : 'request-or-browser-error');
      }
    }
    footer.append(apply, cancel); dialog.append(title, help, content, status, footer); document.body.appendChild(dialog); update(); dialog.showModal();
  }
  const CSS = `
    .iqa-source-toolbar{display:flex;align-items:center;justify-content:flex-end;gap:16px;flex-wrap:wrap;margin:10px 0 12px}
    .iqa-source-feedback{flex:1;font-size:var(--fs-sm,13px);color:var(--text-muted,#545962)}
    .iqa-source-reorder-dialog{width:min(900px,94vw);max-height:90vh;padding:var(--space-6,24px);box-sizing:border-box;border:1px solid var(--border,#e2e5e9);border-radius:var(--radius,8px);background:var(--bg-surface,#fff);color:var(--text-base,#545962);font:var(--fw-normal,400) var(--fs-base,14px)/var(--lh-base,1.5) var(--font-body,"Open Sans","Helvetica Neue",Arial,sans-serif);box-shadow:var(--shadow-lg,0 8px 20px rgba(0,27,35,.16))}
    .iqa-source-reorder-dialog::backdrop{background:rgb(0 27 35 / .4)}
    .iqa-source-reorder-dialog h2{margin-top:0;color:var(--text-strong,#1c2024);font:var(--fw-semi,600) var(--fs-xl,22px)/var(--lh-tight,1.25) var(--font-display,"Red Hat Display","Open Sans",Helvetica,Arial,sans-serif)}
    .iqa-source-reorder-content{max-height:55vh;overflow:auto}
    .iqa-source-reorder-list{list-style:none;padding:0;margin:0}
    .iqa-source-reorder-list li{display:flex;align-items:center;gap:var(--space-2,8px);padding:10px 4px;border-bottom:1px solid var(--border,#e2e5e9);flex-wrap:wrap}
    .iqa-source-name{flex:1;min-width:160px;overflow-wrap:anywhere;color:var(--text-strong,#1c2024)}
    .iqa-source-name small{display:block;font-size:var(--fs-xs,12px);color:var(--text-muted,#545962)}
    .iqa-source-position{min-width:20px;text-align:center;font-size:var(--fs-xs,12px);color:var(--text-muted,#545962)}
    .iqa-source-reorder-actions{display:flex;gap:var(--space-3,12px)}
    .iqa-source-reorder-status{min-height:24px;font-size:var(--fs-sm,13px);color:var(--text-muted,#545962)}
    .iqa-source-reorder-list li.iqa-source-moved{background:rgba(0,126,168,.10);background:color-mix(in srgb,var(--border-focus,#006f94) 12%,transparent)}
    .iqa-source-reorder-dialog .iqa-source-grip{display:inline-flex;align-items:center;justify-content:center;flex:none;width:28px;height:28px;padding:0;border:0;border-radius:var(--radius-sm,4px);background:transparent;color:var(--text-muted,#545962);cursor:grab;user-select:none;touch-action:none}
    .iqa-source-reorder-dialog .iqa-source-grip:hover{color:var(--text-link,#006f94);background:var(--bg-sunken,#f1f3f5)}
    .iqa-source-reorder-dialog .iqa-source-grip:active{cursor:grabbing}
    .iqa-source-grip:focus-visible{outline:2px solid var(--border-focus,#006f94);outline-offset:2px}
    .iqa-source-grip>svg{display:block;width:18px;height:18px}
    .iqa-source-reorder-dialog.iqa-is-sorting,.iqa-source-reorder-dialog.iqa-is-sorting *{cursor:grabbing!important;user-select:none}
    .iqa-source-reorder-list li.iqa-source-dragging{display:none}
    .iqa-source-reorder-list li.iqa-source-placeholder{box-sizing:border-box;margin:0;padding:0;border:2px dashed var(--border-focus,#006f94);border-radius:var(--radius-sm,4px);background:transparent}
    .iqa-source-reorder-dialog>li.iqa-source-floating{display:flex;align-items:center;gap:var(--space-2,8px);flex-wrap:wrap;position:fixed;top:0;left:0;z-index:1;box-sizing:border-box;padding:10px 4px;border:1px solid var(--border-focus,#006f94);border-radius:var(--radius-sm,4px);background:var(--bg-surface,#fff);box-shadow:var(--shadow-lg,0 8px 20px rgba(0,27,35,.16));opacity:.8;pointer-events:none}
  `;
  return { mount, teardown() {
    if (busy || stale) { stopped = true; return; }
    dialog?.remove(); dialog = null; toolbar?.remove(); toolbar = null; mountedMarkers = [];
    document.getElementById('iqaSourceWorkspaceCss')?.remove();
  } };
}

  const SourceWorkspace = createSourceWorkspace();
  // END SOURCE WORKSPACE V1

  // BEGIN RELATIONSHIP WORKSPACE V1
/* Sources relationship editor. All additions still use the native Add action. */
function createRelationshipWorkspace() {
  function editorURL(value, base) {
    const url = new URL(value, base); url.hash = ''; url.searchParams.sort();
    return url.href;
  }
  function makeIntent(data, current, action, at = Date.now()) {
    const original = new URL(current), submitted = new URL(action || current, current);
    const urls = [editorURL(current)];
    if (submitted.origin === original.origin && submitted.pathname === original.pathname) urls.push(editorURL(submitted.href));
    return { ...data, urls: [...new Set(urls)], at };
  }
  function readIntent(saved, current, now = Date.now()) {
    if (!saved || !['id', 'fields', 'predefined'].includes(saved.mode) || !Number.isFinite(saved.at) || now - saved.at < 0 || now - saved.at >= 300000) return null;
    try {
      const urls = saved.urls || [saved.url];
      return urls.some(url => typeof url === 'string' && editorURL(url) === editorURL(current)) ? saved : null;
    } catch (_) { return null; }
  }
  function field(value, text) {
    const match = String(value).match(/^(.+\.(SR\d+))\|([^|]+)$/);
    return match ? { value, text, source: match[1], slot: match[2], property: match[3] } : null;
  }
  function idFields(fields, sources) {
    return sources.flatMap(source => {
      const matches = fields.filter(item => item.slot === source.slot && /^id$/i.test(item.property));
      return matches.length === 1 ? [{ ...matches[0], alias: source.alias }] : [];
    });
  }
  function isDuplicate(relations, left, right, type) {
    const normal = text => text.replace(/\s+/g, ' ').trim();
    return relations.some(relation => {
      if (relation.type !== type) return false;
      const match = relation.description.match(/\(When (.+) = (.+)\)$/);
      if (!match) return false;
      const a = normal(match[1]), b = normal(match[2]), l = normal(left), r = normal(right);
      return a === l && b === r || type === 'Equal|AND' && a === r && b === l;
    });
  }
  function comboFields(combo) {
    const items = combo.get_items(), fields = [];
    for (let index = 0; index < items.get_count(); index++) {
      const item = items.getItem(index), entry = field(item.get_value(), item.get_text());
      if (entry && (!item.get_enabled || item.get_enabled())) fields.push(entry);
    }
    return fields;
  }
  function setComboValue(combo, value) {
    const methods = ['findItemByValue', 'get_items', 'trackChanges', 'commitChanges', 'set_selectedItem', 'set_selectedIndex', 'set_text', 'set_value', 'get_value'];
    if (methods.some(method => typeof combo?.[method] !== 'function')) throw new Error('field-control-not-ready');
    const item = combo.findItemByValue(value);
    if (!item || (item.get_enabled && !item.get_enabled())) throw new Error('field-not-available');
    const items = combo.get_items(); let index = -1;
    for (let i = 0; i < items.get_count(); i++) if (items.getItem(i) === item) index = i;
    if (index < 0) throw new Error('field-not-available');
    // Public property setters stage the actual native selection without firing a
    // selection event/postback between the two sides. The native Add submits both.
    combo.trackChanges();
    try {
      combo.set_selectedItem(item); combo.set_selectedIndex(index);
      combo.set_text(item.get_text()); combo.set_value(item.get_value());
    } finally { combo.commitChanges(); }
    if (combo.get_value() !== value) throw new Error('field-selection-failed');
  }
  if (typeof document === 'undefined') return { field, idFields, isDuplicate, comboFields, setComboValue, makeIntent, readIntent };
  const KEY = 'iqa:relationship-intent:v1';
  let mounted = null, undo = [], timer = null;
  function el(tag, text, className) { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; }
  function listen(node, event, callback) { node.addEventListener(event, callback); undo.push(() => node.removeEventListener(event, callback)); }
  function hide(node, hidden) { node.hidden = hidden; }
  function remember(data) { try { sessionStorage.setItem(KEY, JSON.stringify(makeIntent(data, location.href, mounted?.form?.getAttribute('action')))); } catch (_) {} }
  function forget() { try { sessionStorage.removeItem(KEY); } catch (_) {} }
  function restore() { clearTimeout(timer); timer = null; undo.reverse().forEach(fn => fn()); undo = []; mounted = null; }
  function move(node, target) {
    const parent = node.parentNode, next = node.nextSibling;
    target.appendChild(node); undo.push(() => parent.insertBefore(node, next?.parentNode === parent ? next : null));
  }
  function captureScroll(node) {
    const containers = [];
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      if (parent.id && (parent.scrollTop || parent.scrollLeft)) containers.push({ id: parent.id, x: parent.scrollLeft, y: parent.scrollTop });
    }
    return { x: window.scrollX, y: window.scrollY, containers };
  }
  function restoreScroll(position) {
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return;
    let cancelled = false;
    const timers = [], frames = [];
    const stop = () => {
      cancelled = true; timers.forEach(clearTimeout); frames.forEach(cancelAnimationFrame);
      ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(event => window.removeEventListener(event, stop, true));
      window.removeEventListener('load', afterLoad);
    };
    const apply = () => {
      if (cancelled) return;
      for (const saved of Array.isArray(position.containers) ? position.containers : []) {
        const container = document.getElementById(saved.id);
        if (container && Number.isFinite(saved.x) && Number.isFinite(saved.y)) container.scrollTo({ left: saved.x, top: saved.y, behavior: 'instant' });
      }
      window.scrollTo({ left: position.x, top: position.y, behavior: 'instant' });
    };
    const afterLoad = () => { frames.push(requestAnimationFrame(apply)); };
    ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(event => window.addEventListener(event, stop, { capture: true, passive: true }));
    window.addEventListener('load', afterLoad, { once: true });
    // Native load handlers and Telerik sizing can run after the first layout.
    frames.push(requestAnimationFrame(() => { apply(); frames.push(requestAnimationFrame(apply)); }));
    [100, 350, 800, 1500].forEach(delay => timers.push(setTimeout(apply, delay)));
    timers.push(setTimeout(stop, 1800));
    undo.push(stop); // Never keep scrolling after teardown or user interaction.
  }
  function mount() {
    const kind = [...document.querySelectorAll('select')].find(select => [...select.options].some(option => option.value === 'Custom')
      && [...select.options].some(option => option.value === 'None') && select.closest('tr')?.querySelector('.JoinButton'));
    if (mounted === kind && kind?.isConnected) return;
    restore(); if (!kind) return;
    const row = kind.closest('tr'), nativeAdd = row.querySelector('.JoinButton'), cell = row.cells[0];
    if (!nativeAdd || !cell || row.cells.length !== 2) return;
    mounted = kind;
    if (!document.getElementById('iqaRelationshipCss')) { const style = el('style'); style.id = 'iqaRelationshipCss'; style.textContent = CSS; document.head.appendChild(style); }
    const originalSpan = cell.colSpan, originalActionHidden = row.cells[1].hidden;
    cell.colSpan = 4; row.cells[1].hidden = true;
    undo.push(() => { cell.colSpan = originalSpan; row.cells[1].hidden = originalActionHidden; });
    const panel = el('section', null, 'iqa-relationship-editor'), heading = el('h3', 'Add relationship');
    const modes = el('div', null, 'iqa-relationship-modes'); modes.setAttribute('role', 'group'); modes.setAttribute('aria-label', 'How to add a relationship');
    const message = el('p', 'Choose how you want to connect your business objects.', 'iqa-relationship-message'); message.setAttribute('role', 'status');
    const predefined = el('div'), custom = el('div', null, 'iqa-relationship-fields'), idPanel = el('div', null, 'iqa-relationship-ids');
    const leftBox = el('div'), typeBox = el('div'), rightBox = el('div');
    function labelBox(box, text, input) { const label = el('label', text); if (input?.id) label.htmlFor = input.id; box.appendChild(label); }
    const combos = [...row.querySelectorAll('.RadComboBox')];
    const nativeType = row.querySelector('select[id$="_mRelationTypeDropDown"]');
    if (kind.value === 'Custom' && (combos.length !== 2 || !nativeType)) { restore(); return; }
    const kindParent = kind.parentNode, kindHidden = kindParent.hidden; undo.push(() => { kindParent.hidden = kindHidden; });
    // Move wrappers, not individual Telerik inputs, retaining IDs, hidden state and native handlers.
    if (combos.length === 2 && nativeType) {
      labelBox(leftBox, 'Left field', combos[0].querySelector('input.rcbInput')); move(combos[0].parentNode, leftBox);
      labelBox(typeBox, 'Join type', nativeType); move(nativeType.parentNode, typeBox);
      labelBox(rightBox, 'Right field', combos[1].querySelector('input.rcbInput')); move(combos[1].parentNode, rightBox);
    }
    labelBox(predefined, 'Predefined relationship', kind); move(kindParent, predefined);
    const originalOptionHidden = [...kind.options].map(option => option.hidden);
    [...kind.options].forEach(option => { if (option.value === 'Custom') option.hidden = true; });
    const blank = [...kind.options].find(option => option.value === 'None'), blankText = blank?.text;
    if (blank) blank.text = 'Select a relationship';
    undo.push(() => { [...kind.options].forEach((option, i) => { option.hidden = originalOptionHidden[i]; }); if (blank) blank.text = blankText; });
    const leftID = el('select'), rightID = el('select'); leftID.id = 'iqaJoinIdLeft'; rightID.id = 'iqaJoinIdRight';
    const idLeftBox = el('div'), idRightBox = el('div'); labelBox(idLeftBox, 'Left business object', leftID); labelBox(idRightBox, 'Right business object', rightID);
    idLeftBox.appendChild(leftID); idRightBox.appendChild(rightID); idPanel.append(idLeftBox, idRightBox);
    custom.append(leftBox, typeBox, rightBox);
    const preview = el('div', '', 'iqa-relationship-preview'); preview.setAttribute('aria-live', 'polite');
    const add = el('button', 'Add relationship', 'TextButton'); add.type = 'button';
    const actions = el('div', null, 'iqa-relationship-actions'); actions.append(preview, add);
    panel.append(heading, modes, message, predefined, idPanel, custom, actions); cell.appendChild(panel); undo.unshift(() => panel.remove());
    let intent = null;
    try { intent = readIntent(JSON.parse(sessionStorage.getItem(KEY) || 'null'), location.href); } catch (_) {}
    // Keep the choice through repeated native refreshes/remounts, not just the
    // first render. Add or Enhance-off clears it; expired/other-editor state is ignored.
    if (!intent) forget();
    const scrollToRestore = intent?.scroll;
    if (scrollToRestore) remember({ ...intent, scroll: null }); // One navigation only.
    let mode = kind.value === 'Custom' ? intent?.mode === 'id' ? 'id' : 'fields' : kind.value !== 'None' ? 'predefined' : '';
    let freshFields = intent?.freshFields === true;
    let clients = null, initialized = false, loading = false, loadFailed = false, loadingTimer = null, pendingScroll = null;
    undo.push(() => clearTimeout(loadingTimer));
    const buttons = new Map();
    function persist() { remember({ mode, left: leftID.value, right: rightID.value, freshFields, scroll: pendingScroll }); }
    function choose(next) {
      if (loading) return;
      mode = next;
      if (next !== 'predefined' && kind.value !== 'Custom') {
        pendingScroll = captureScroll(kind);
        freshFields = next === 'fields' && kind.value === 'None';
        loading = true; render();
        loadingTimer = setTimeout(() => {
          loading = false; loadFailed = true; render();
          message.textContent = 'The field editor has not finished loading. Refresh the editor if it does not open.';
        }, 30000);
        persist(); kind.value = 'Custom'; kind.dispatchEvent(new Event('change', { bubbles: true }));
        message.textContent = 'Opening the field controls…'; add.disabled = true; return;
      }
      if (next === 'predefined' && kind.value === 'Custom') kind.value = 'None';
      persist();
      render();
    }
    for (const [value, text] of [['id', 'Join by ID'], ['fields', 'Choose fields'], ['predefined', 'Predefined relationship']]) {
      const button = el('button', text); button.type = 'button'; listen(button, 'click', () => choose(value)); buttons.set(value, button); modes.appendChild(button);
    }
    function relationships() { return [...row.closest('table').querySelectorAll('input[type="hidden"]')].filter(input => /^RL\d+$/.test(input.value)).map(input => {
      const relation = input.closest('tr'); return { description: relation.cells[0].textContent.trim(), type: relation.querySelector('select')?.value };
    }); }
    function selectedPair() {
      if (!clients) return null;
      if (mode === 'id') return [comboFields(clients[0]).find(item => item.value === leftID.value), comboFields(clients[1]).find(item => item.value === rightID.value)];
      return clients.map(combo => comboFields(combo).find(item => item.value === combo.get_value() && item.text === combo.get_text()));
    }
    function render() {
      const pending = loading || mode === 'id' && !clients && !loadFailed;
      buttons.forEach((button, key) => {
        button.setAttribute('aria-pressed', String(mode === key));
        button.setAttribute('aria-busy', String(key === mode && pending));
        button.classList.toggle('iqa-relationship-loading', key === mode && pending);
        button.disabled = loading || key === mode && pending;
      });
      if (mode === 'id' && typeBox.parentNode !== idPanel) idPanel.insertBefore(typeBox, idRightBox);
      if (mode !== 'id' && typeBox.parentNode !== custom) custom.insertBefore(typeBox, rightBox);
      hide(predefined, mode !== 'predefined'); hide(kindParent, mode !== 'predefined'); hide(idPanel, mode !== 'id'); hide(custom, mode !== 'fields');
      hide(actions, !mode); add.disabled = true; add.textContent = 'Add relationship'; preview.textContent = '';
      if (loading) { message.textContent = 'Opening the field controls…'; return; }
      if (!mode) return;
      if (mode === 'predefined') {
        message.textContent = 'Use a relationship already defined for these business objects.';
        add.disabled = !kind.value || ['None', 'Custom'].includes(kind.value);
        if (!add.disabled) preview.textContent = kind.options[kind.selectedIndex]?.text || '';
        return;
      }
      message.textContent = mode === 'id' ? 'Connect one pair using their Id fields. Review the fields and join type, then add.' : 'Choose a field from each business object and the join type.';
      if (!clients) {
        if (mode === 'id') message.textContent = loadFailed ? 'The Id shortcut is unavailable. Use Choose fields instead.' : 'Loading available Id fields…';
        else add.disabled = combos.length !== 2 || !nativeType || nativeAdd.disabled === true;
        return;
      }
      const pair = selectedPair();
      if (mode === 'id' && (!leftID.options.length || !rightID.options.length)) { message.textContent = 'Id fields are not available for a pair of business objects. Use Choose fields instead.'; return; }
      if (!pair?.every(Boolean)) return;
      if (pair[0].source === pair[1].source) { preview.textContent = 'Choose two different business objects.'; return; }
      const type = nativeType.value, label = nativeType.options[nativeType.selectedIndex]?.text || type;
      preview.textContent = pair[0].text + '  ·  ' + label + '  ·  ' + pair[1].text;
      const duplicate = isDuplicate(relationships(), pair[0].text, pair[1].text, type);
      add.disabled = duplicate || nativeAdd.disabled === true;
      if (duplicate) add.textContent = 'Already joined';
    }
    listen(leftID, 'change', () => { persist(); render(); }); listen(rightID, 'change', () => { persist(); render(); });
    listen(kind, 'change', () => { pendingScroll ||= captureScroll(kind); mode = kind.value === 'Custom' ? mode === 'id' ? 'id' : 'fields' : 'predefined'; persist(); render(); });
    if (nativeType) listen(nativeType, 'change', () => { pendingScroll = captureScroll(nativeType); persist(); render(); });
    listen(add, 'click', () => {
      render(); if (add.disabled) return;
      if (mode === 'id') {
        try {
          setComboValue(clients[0], leftID.value); setComboValue(clients[1], rightID.value);
        } catch (_) { message.textContent = 'The field selection could not be prepared. Use Choose fields to select the fields directly.'; return; }
      }
      forget();
      // Preserve ConfirmCrossJoin, native validation and its actual submit target.
      nativeAdd.click();
    });
    function hydrate(attempt = 0) {
      if (mounted !== kind || !kind.isConnected || combos.length !== 2 || !nativeType) return;
      const found = combos.map(node => typeof window.$find === 'function' ? window.$find(node.id) : null);
      if (found.some(combo => !combo || typeof combo.get_items !== 'function')) {
        if (attempt < 30) timer = setTimeout(() => hydrate(attempt + 1), 250);
        else { loadFailed = true; render(); }
        return;
      }
      clients = found;
      if (!initialized) {
        if (freshFields) {
          clients.forEach(combo => {
            // Only clear iMIS's initial defaults for an explicitly requested NEW
            // custom relationship. Existing draft selections are left intact.
            if (['trackChanges', 'commitChanges', 'set_selectedItem', 'set_selectedIndex', 'set_text', 'set_value'].every(method => typeof combo[method] === 'function')) {
              combo.trackChanges();
              try { combo.set_selectedItem(null); combo.set_selectedIndex(-1); combo.set_text(''); combo.set_value(''); }
              finally { combo.commitChanges(); }
              const input = combo.get_inputDomElement?.();
              if (input) { const placeholder = input.getAttribute('placeholder'); input.setAttribute('placeholder', 'Select a field'); undo.push(() => { if (placeholder === null) input.removeAttribute('placeholder'); else input.setAttribute('placeholder', placeholder); }); }
            }
          });
          freshFields = false;
        }
        const sources = [...row.closest('table').querySelectorAll('input[type="hidden"]')].filter(input => /^SR\d+$/.test(input.value))
          .map(input => ({ slot: input.value, alias: input.closest('tr').querySelector('input[id*="txtAlias"]')?.value || input.value }));
        [leftID, rightID].forEach((select, side) => {
          for (const entry of idFields(comboFields(clients[side]), sources)) { const option = el('option', entry.alias + ' · Id'); option.value = entry.value; select.appendChild(option); }
        });
        if (intent?.left && [...leftID.options].some(option => option.value === intent.left)) leftID.value = intent.left;
        if (intent?.right && [...rightID.options].some(option => option.value === intent.right)) rightID.value = intent.right;
        else if (rightID.options.length > 1) rightID.selectedIndex = 1;
        clients.forEach(combo => {
          const changed = () => { persist(); render(); };
          if (typeof combo.add_selectedIndexChanged === 'function' && typeof combo.remove_selectedIndexChanged === 'function') {
            combo.add_selectedIndexChanged(changed); undo.push(() => combo.remove_selectedIndexChanged(changed));
          }
          const input = combo.get_inputDomElement?.(); if (input) listen(input, 'input', render);
          combo.repaint?.();
        });
        initialized = true;
        if (intent) persist(); // Preserve resolved ID choices, but do not re-clear fresh fields.
      }
      render();
    }
    // Improve existing rows without replacing any native relationship fields/actions.
    const table = row.closest('table');
    [...table.querySelectorAll('input[type="hidden"]')].filter(input => /^RL\d+$/.test(input.value)).forEach(input => {
      const relation = input.closest('tr'), select = relation.querySelector('select'); relation.classList.add('iqa-existing-relationship');
      undo.push(() => relation.classList.remove('iqa-existing-relationship'));
      if (select) { const old = select.getAttribute('aria-label'); select.setAttribute('aria-label', 'Relationship join type'); undo.push(() => { if (old === null) select.removeAttribute('aria-label'); else select.setAttribute('aria-label', old); }); }
    });
    render(); hydrate();
    restoreScroll(scrollToRestore);
  }
  const CSS = `
    .iqa-relationship-editor{margin:12px 0;padding:18px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;white-space:normal}
    .iqa-relationship-editor h3{font-size:17px;margin:0 0 12px}.iqa-relationship-modes{display:flex;gap:0;flex-wrap:wrap;margin-bottom:12px}
    .iqa-relationship-modes button{padding:8px 14px;border:1px solid #cbd5e1;background:#fff;color:#344454;font:inherit;cursor:pointer}
    .iqa-relationship-modes button[aria-pressed=true]{background:#dff4fc;border-color:#168eb8;color:#064b66;font-weight:600}
    .iqa-relationship-modes button:focus-visible{outline:2px solid #087fae;outline-offset:2px}
    .iqa-relationship-modes button.iqa-relationship-loading{cursor:wait;display:inline-flex;align-items:center;gap:8px}
    .iqa-relationship-modes button.iqa-relationship-loading::before{content:"";display:inline-block;width:13px;height:13px;flex:0 0 13px;border:2px solid #bfd4df;border-top-color:#087ba7;border-radius:50%;animation:iqaRelationshipSpin .7s linear infinite}
    @keyframes iqaRelationshipSpin{to{transform:rotate(360deg)}}
    @media(prefers-reduced-motion:reduce){.iqa-relationship-modes button.iqa-relationship-loading::before{animation:none}}
    .iqa-relationship-editor label{display:block;margin-bottom:6px;font-size:13px;font-weight:600}
    .iqa-relationship-editor [hidden]{display:none!important}.iqa-relationship-message{font-size:13px;color:#526173;margin:0 0 14px}
    .iqa-relationship-fields{display:grid;grid-template-columns:minmax(0,1fr) 165px minmax(0,1fr);gap:14px;align-items:start}
    .iqa-relationship-ids{display:grid;grid-template-columns:minmax(0,1fr) 165px minmax(0,1fr);gap:14px;margin-bottom:12px}
    .iqa-relationship-fields>div,.iqa-relationship-ids>div{min-width:0}
    body.iqa-enhanced .iqa-relationship-editor .SubItems{margin:0!important;padding:0!important}
    body.iqa-enhanced .iqa-relationship-editor .InputXXLargeWrapper,body.iqa-enhanced .iqa-relationship-editor .RadComboBox,body.iqa-enhanced .iqa-relationship-editor select{width:100%!important;max-width:100%!important;box-sizing:border-box;min-width:0!important}
    .iqa-relationship-actions{display:flex;gap:16px;align-items:center;justify-content:space-between;margin-top:16px;flex-wrap:wrap}
    .iqa-relationship-preview{flex:1;min-width:200px;overflow-wrap:anywhere;padding:8px 10px;background:#f2f7fa;border-radius:4px;font-size:13px}.iqa-relationship-preview:empty{display:none}
    .iqa-existing-relationship>td{padding-top:12px!important;padding-bottom:12px!important}
    @media(max-width:800px){.iqa-relationship-fields,.iqa-relationship-ids{grid-template-columns:1fr}.iqa-relationship-editor{padding:12px}}
  `;
  return { mount, teardown() { restore(); forget(); document.getElementById('iqaRelationshipCss')?.remove(); } };
}

  const RelationshipWorkspace = createRelationshipWorkspace();
  // END RELATIONSHIP WORKSPACE V1

  // BEGIN SQL EDITOR V1
/* SQL colouring keeps the native textarea as the editable/submitted control. */
function createSqlEditor(options = {}) {
  const keywords = new Set(('ALL AND AS ASC BETWEEN BY CASE CAST CONVERT DESC DISTINCT ELSE END EXISTS FROM GROUP HAVING IN IS JOIN LEFT LIKE NOT NULL ON OR ORDER OUTER OVER PARTITION RIGHT SELECT THEN TOP UNION WHEN WHERE WITH SUM COUNT MIN MAX AVG COALESCE ISNULL NULLIF IIF CONCAT GETDATE DATEADD DATEDIFF ROUND').split(' '));
  function tokens(sql) {
    const result = [];
    const pattern = /--[^\r\n]*|\/\*[\s\S]*?(?:\*\/|$)|N?'(?:''|[^'])*(?:'|$)|\[(?:\]\]|[^\]])*(?:\]|$)|"(?:""|[^"])*(?:"|$)|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z_0-9]*\b/gi;
    let at = 0;
    for (const match of sql.matchAll(pattern)) {
      if (match.index > at) result.push({ text: sql.slice(at, match.index), type: '' });
      const text = match[0];
      const type = /^(--|\/\*)/.test(text) ? 'comment' : /^N?'/i.test(text) ? 'string' : /^[\["]/.test(text) ? 'identifier' : /^\d/.test(text) ? 'number' : keywords.has(text.toUpperCase()) ? 'keyword' : '';
      result.push({ text, type }); at = match.index + text.length;
    }
    if (at < sql.length) result.push({ text: sql.slice(at), type: '' });
    return result;
  }
  const quote = value => '[' + value.replace(/\]/g, ']]') + ']';
  function complete(before, sources) {
    const fieldDetail = field => [field.label, field.dataType].filter(Boolean).join(' · ');
    const last = tokens(before).at(-1);
    if (last && /^(comment|string)$/.test(last.type)) return null;
    const field = before.match(/(\[(?:\]\]|[^\]])+\]|[\w]+)\.\s*(\[?[\w ]*)$/);
    if (field) {
      const name = field[1].replace(/^\[|\]$/g, '').replace(/\]\]/g, ']');
      const source = sources.find(item => item.sqlName.toLowerCase() === name.toLowerCase());
      if (!source) return null;
      const search = field[2].replace(/^\[/, '').toLowerCase();
      return { start: before.length - field[2].length, options: source.fields.filter(item => item.name.toLowerCase().includes(search) || item.label.toLowerCase().includes(search)).map(item => ({ kind: 'field', label: item.name, detail: fieldDetail(item), insert: quote(item.name) })) };
    }
    const match = before.match(/\[?[A-Za-z_][\w]*$/);
    if (!match || before[match.index - 1] === '.') return null;
    const search = match[0].replace(/^\[/, '').toLowerCase();
    const sourceOptions = sources.filter(item => item.sqlName.toLowerCase().includes(search) || item.label.toLowerCase().includes(search)).map(item => ({ kind: 'source', label: item.sqlName, detail: item.label, insert: quote(item.sqlName) + '.' }));
    const fieldOptions = sources.flatMap(source => source.fields.filter(field => field.name.toLowerCase().includes(search) || field.label.toLowerCase().includes(search)).map(field => ({
      kind: 'field',
      label: quote(source.sqlName) + '.' + quote(field.name),
      sourceLabel: quote(source.sqlName),
      fieldLabel: quote(field.name),
      detail: [source.label, field.label, field.dataType].filter(Boolean).join(' · '),
      insert: quote(source.sqlName) + '.' + quote(field.name)
    })));
    return { start: match.index, options: [...sourceOptions, ...fieldOptions] };
  }
  // Deliberately a conservative lint check, not a complete T-SQL parser.
  function validate(sql) {
    const parts = [], parentheses = [], cases = [];
    const error = (message, index) => {
      const lines = sql.slice(0, index).split('\n');
      return { message, index, line: lines.length, column: lines.at(-1).length + 1 };
    };
    for (let i = 0; i < sql.length;) {
      const start = i, char = sql[i];
      if (/\s/.test(char)) { i++; continue; }
      if (sql.startsWith('--', i)) { const end = sql.indexOf('\n', i); i = end < 0 ? sql.length : end; continue; }
      if (sql.startsWith('/*', i)) {
        let depth = 1; i += 2;
        while (i < sql.length && depth) {
          if (sql.startsWith('/*', i)) { depth++; i += 2; }
          else if (sql.startsWith('*/', i)) { depth--; i += 2; } else i++;
        }
        if (depth) return error('Close the comment with */.', start);
        continue;
      }
      if (char === "'" || char === '"' || char === '[') {
        const end = char === '[' ? ']' : char; let closed = false; i++;
        while (i < sql.length) {
          if (sql[i] === end) {
            if (sql[i + 1] === end) { i += 2; continue; }
            i++; closed = true; break;
          } else i++;
        }
        if (!closed) return error(char === '[' ? 'Close the field or source name with ].' : 'Close the quoted text.', start);
        parts.push({ word: '', index: start }); continue;
      }
      if (char === ']') return error('Unexpected closing bracket ].', i);
      const word = sql.slice(i).match(/^[@#\p{L}_][@#$\p{L}\p{N}_]*/u)?.[0];
      if (word) { parts.push({ word: word.toUpperCase(), index: i }); i += word.length; }
      else { parts.push({ word: char, index: i }); i++; }
    }
    if (!parts.length) return error('Enter a SQL expression.', 0);
    if (parts[0].word === 'SELECT') return error('Enter an expression, or enclose a scalar SELECT subquery in parentheses.', parts[0].index);
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i], word = part.word, previous = parts[i - 1]?.word;
      if (word === '(') parentheses.push(part);
      if (word === ')') {
        if (!parentheses.length) return error('Unexpected closing parenthesis ).', part.index);
        if (['+', '-', '/', '%', '=', '<', '>', '|', '&', '^', ',', '.', 'AND', 'OR'].includes(previous)) return error('Complete the expression before ).', part.index);
        parentheses.pop();
      }
      if (word === ';') return error('Enter one expression without a statement separator (;).', part.index);
      if (word === ',' && !parentheses.length) return error('Enter one expression. Add separate columns individually.', part.index);
      if (word === 'CASE') cases.push({ ...part, state: 'case' });
      else if (['WHEN', 'THEN', 'ELSE', 'END'].includes(word)) {
        const current = cases.at(-1);
        if (!current) return error(word + ' needs a matching CASE.', part.index);
        if (word === 'WHEN') {
          if (!['case', 'then'].includes(current.state)) return error('Complete the preceding CASE branch before WHEN.', part.index);
          if (previous === 'THEN') return error('Enter a result after THEN.', part.index);
          current.state = 'when';
        } else if (word === 'THEN') {
          if (current.state !== 'when' || previous === 'WHEN') return error('THEN needs a condition after WHEN.', part.index);
          current.state = 'then';
        } else if (word === 'ELSE') {
          if (current.state !== 'then' || previous === 'THEN') return error('Complete a WHEN … THEN branch before ELSE.', part.index);
          current.state = 'else';
        } else {
          if (!['then', 'else'].includes(current.state) || ['THEN', 'ELSE'].includes(previous)) return error('Complete the CASE branches before END.', part.index);
          cases.pop();
        }
      }
    }
    if (cases.length) return error('Close this CASE expression with END.', cases.at(-1).index);
    if (parentheses.length) return error('Close this parenthesis with ).', parentheses.at(-1).index);
    const last = parts.at(-1);
    if (['+', '-', '*', '/', '%', '=', '<', '>', '|', '&', '^', '.', ',', 'AND', 'OR', 'NOT', 'IS', 'LIKE', 'BETWEEN', 'AS', 'COLLATE', 'AT'].includes(last.word)) return error('Complete the expression after ' + last.word + '.', last.index);
    return null;
  }
  function createSourceCache(storage, location, now = Date.now) {
    let memory = null, previousScope = '';
    function scope() {
      const params = new Map([...new URLSearchParams(location.search)].map(([key, value]) => [key.toLowerCase(), value.toLowerCase()]));
      const id = params.get('isession') || params.get('iuniformkey') || '';
      const key = 'iqa:sql-sources:v1:' + location.pathname.toLowerCase() + ':' + encodeURIComponent(id);
      if (key !== previousScope) { memory = null; previousScope = key; }
      return { key, persistent: !!id, documentKey: params.get('iuniformkey') || '' };
    }
    function readRecord() {
      const current = scope(); let record = memory;
      if (current.persistent) { try { record = JSON.parse(storage.getItem(current.key) || 'null') || record; } catch (_) {} }
      if (!record || !Number.isFinite(record.at) || now() - record.at > 43200000 || current.documentKey && record.documentKey && current.documentKey !== record.documentKey || !Array.isArray(record.sources)) return null;
      return record;
    }
    function read() { return (readRecord()?.sources || []).filter(source => /^SR\d+$/.test(source.slot) && typeof source.name === 'string' && typeof source.alias === 'string' && typeof source.type === 'string'); }
    function capture(sources, origin = 'live') {
      const current = scope();
      memory = { at: now(), documentKey: current.documentKey, sources, origin };
      if (current.persistent) { try { storage.setItem(current.key, JSON.stringify(memory)); } catch (_) {} }
    }
    return { read, capture, hasSnapshot: () => !!readRecord() };
  }
  function definitionRequest(path) {
    return {
      $type: 'Asi.Soa.Core.DataContracts.GenericExecuteRequest, Asi.Contracts', OperationName: 'FindByPath', EntityTypeName: 'QueryDefinition',
      Parameters: { $type: 'System.Collections.ObjectModel.Collection`1[[System.Object, mscorlib]], mscorlib', $values: [{ $type: 'System.String', $value: path }] },
      ParameterTypeName: { $type: 'System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib', $values: ['System.String'] }, UseJson: false
    };
  }
  function definitionSources(response, path, versionKey = '', queryId = '') {
    const result = response?.Result, doc = result?.Document;
    const same = (a, b) => typeof a === 'string' && a.toLowerCase() === b.toLowerCase();
    if (!same(result?.Path, path) || !same(doc?.Path, path)) throw Error('The saved definition returned a different query path.');
    if (versionKey && !same(doc?.DocumentVersionId, versionKey)) throw Error('The saved definition belongs to a different document version.');
    if (queryId && !same(doc?.DocumentId, queryId)) throw Error('The saved definition does not match the editor query.');
    const sources = result?.Sources?.$values;
    if (!Array.isArray(sources)) throw Error('The saved definition did not contain a source list.');
    const slots = new Set();
    return sources.map(source => {
      if (!/^SR\d+$/.test(source.QuerySourceId) || slots.has(source.QuerySourceId)) throw Error('The saved source identifiers are invalid.');
      slots.add(source.QuerySourceId);
      if (source.QuerySourceType === 1 && (typeof source.BusinessControllerName !== 'string' || !source.BusinessControllerName)) throw Error('A saved business-object name is missing.');
      return { slot: source.QuerySourceId, name: source.BusinessControllerName || '', alias: source.Description || '', type: source.QuerySourceType === 1 ? 'Business Object' : 'Query' };
    });
  }
  function catalog(fields, mapping) {
    const result = new Map();
    for (const field of fields) {
      const source = mapping.find(source => source.slot === field.slot);
      // Do not invent a SQL identifier from a friendly alias or guess the suffix
      // assigned when the same business object occurs more than once.
      if (!source || source.type !== 'Business Object' || !source.name || mapping.filter(other => other.name.toLowerCase() === source.name.toLowerCase()).length !== 1) continue;
      if (!result.has(field.slot)) result.set(field.slot, { slot: field.slot, label: field.alias, sqlName: 'vBo' + source.name, fields: [] });
      const entry = result.get(field.slot);
      if (!entry.fields.some(item => item.name === field.name)) entry.fields.push({ name: field.name, label: field.label, dataType: field.dataType || '' });
    }
    return [...result.values()];
  }
  function definitionProperties(response, expectedName) {
    const result = response?.Result || response;
    if (!result || typeof result.EntityTypeName !== 'string' || result.EntityTypeName.toLowerCase() !== expectedName.toLowerCase()) throw Error('The business-object definition returned a different object.');
    const values = result.Properties?.$values;
    if (!Array.isArray(values)) throw Error('The business-object definition did not contain properties.');
    const seen = new Set(), fields = [];
    for (const property of values) {
      if (property?.Visible === false || typeof property?.Name !== 'string' || !property.Name) continue;
      const key = property.Name.toLowerCase(); if (seen.has(key)) continue; seen.add(key);
      const dataType = typeof property.PropertyTypeName === 'string' && property.PropertyTypeName.trim()
        ? property.PropertyTypeName.trim()
        : (typeof property.ExtendedPropertyInformation?.DbDataType === 'string' ? property.ExtendedPropertyInformation.DbDataType.trim() : '');
      fields.push({ name: property.Name, label: typeof property.Caption === 'string' && property.Caption.trim() ? property.Caption.trim() : property.Name, dataType });
    }
    return fields;
  }
  if (typeof document === 'undefined') return { tokens, complete, quote, validate, createSourceCache, catalog, definitionProperties, definitionRequest, definitionSources };
  const sourceCache = createSourceCache({ getItem: key => sessionStorage.getItem(key), setItem: (key, value) => sessionStorage.setItem(key, value) }, location);
  const boDefinitions = new Map(), boDefinitionLoads = new Map();
  async function loadBusinessObjectDefinitions(mapping) {
    const names = [...new Set(mapping.filter(source => source.type === 'Business Object' && source.name).map(source => source.name))];
    const results = await Promise.allSettled(names.map(async name => {
      const key = name.toLowerCase();
      if (boDefinitions.has(key)) return;
      if (!boDefinitionLoads.has(key)) boDefinitionLoads.set(key, (async () => {
        const requestToken = (document.getElementById('__RequestVerificationToken') || document.querySelector('input[name="__RequestVerificationToken"]'))?.value || '';
        const response = await fetch(new URL('/api/BOEntityDefinition/' + encodeURIComponent(name), location.origin), {
          method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json', ...(requestToken ? { RequestVerificationToken: requestToken } : {}) }
        });
        if (!response.ok) throw Error('Could not load fields for ' + name + ' (HTTP ' + response.status + ').');
        boDefinitions.set(key, definitionProperties(await response.json(), name));
      })().finally(() => boDefinitionLoads.delete(key)));
      await boDefinitionLoads.get(key);
    }));
    const failed = results.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
  }
  function definitionFieldCatalog(mapping) {
    const fields = mapping.flatMap(source => (boDefinitions.get(source.name.toLowerCase()) || []).map(field => ({ slot: source.slot, alias: source.alias || source.name, ...field })));
    return catalog(fields, mapping);
  }
  let definitionLoad = null;
  async function loadSavedSources() {
    if (sourceCache.hasSnapshot()) return;
    if (definitionLoad) return definitionLoad;
    const path = options.getPath?.() || '', versionKey = options.getDocumentKey?.() || '';
    if (!path.startsWith('$/')) throw Error('Open Summary to capture the saved path, or visit Sources to load the current objects.');
    const url = location.href;
    const marker = document.querySelector('#AvailableProperty [data-hidden-value]');
    const queryId = (marker?.getAttribute('data-hidden-value') || '').match(/^([0-9a-f-]{36})\.SR\d+\|/i)?.[1] || '';
    definitionLoad = (async () => {
      const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const token = (document.getElementById('__RequestVerificationToken') || document.querySelector('input[name="__RequestVerificationToken"]'))?.value || '';
        const response = await fetch(new URL('/API/QueryDefinition/_execute', location.origin), {
          method: 'POST', credentials: 'same-origin', redirect: 'error', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { RequestVerificationToken: token } : {}) },
          body: JSON.stringify(definitionRequest(path))
        });
        if (!response.ok) throw Error('Could not load the saved definition (HTTP ' + response.status + ').');
        const mapping = definitionSources(await response.json(), path, versionKey, queryId);
        // Never replace an editor snapshot captured while this request was running.
        if (location.href === url && options.getPath?.() === path && !sourceCache.hasSnapshot()) sourceCache.capture(mapping, 'saved');
      } finally { clearTimeout(timeout); }
    })();
    return definitionLoad;
  }
  function captureSources() {
    const panel = document.querySelector('[id$="_SourcesPanel_Body"]');
    if (!panel || !panel.getClientRects().length) return;
    const mapping = [...panel.querySelectorAll('input[type="hidden"]')].filter(input => /^SR\d+$/.test(input.value)).map(input => {
      const row = input.closest('tr');
      return { slot: input.value, name: row?.cells[0]?.textContent.trim() || '', alias: row?.querySelector('input[id*="txtAlias"]')?.value || '', type: row?.cells[2]?.textContent.trim() || '' };
    });
    sourceCache.capture(mapping);
  }
  function sourceFields() {
    const mapping = sourceCache.read();
    return definitionFieldCatalog(mapping);
  }
  const items = new Map();
  function dispose(ta, item) {
    item.observer?.disconnect(); item.abort.abort();
    item.menu.remove(); item.hint.remove(); item.validation.remove();
    if (item.add) item.add.disabled = item.addDisabled;
    if (item.shell.parentNode) item.shell.replaceWith(ta);
    ta.classList.remove('iqa-sql-input');
    for (const [name, value] of Object.entries(item.attributes)) { if (value === null) ta.removeAttribute(name); else ta.setAttribute(name, value); }
    if (item.spellcheck === null) ta.removeAttribute('spellcheck'); else ta.setAttribute('spellcheck', item.spellcheck);
    items.delete(ta);
  }
  function mount() {
    if (!document.getElementById('iqaSqlEditorCss')) {
      const style = document.createElement('style'); style.id = 'iqaSqlEditorCss';
      style.textContent = `
        .iqa-sql-editor{position:relative;min-width:0;width:100%;background:#fff;border-radius:4px;}
        body.iqa-enhanced #CustomProperty .iqa-sql-editor>textarea.iqa-sql-input,.iqa-sql-editor>pre{font:13px/1.6 Consolas,"Courier New",monospace!important;letter-spacing:normal!important;tab-size:3;white-space:pre-wrap;overflow-wrap:break-word;word-break:normal;padding:10px!important;margin:0!important;box-sizing:border-box!important;text-align:left;}
        body.iqa-enhanced #CustomProperty .iqa-sql-editor>textarea.iqa-sql-input{display:block;position:relative;z-index:1;background:transparent!important;color:transparent!important;-webkit-text-fill-color:transparent;caret-color:#172b4d;overflow:auto;}
        .iqa-sql-editor>pre{position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;border:1px solid transparent;color:#172b4d;background:transparent;}
        .iqa-sql-keyword{color:#7141ac;font-weight:normal}.iqa-sql-string{color:#9c3425}.iqa-sql-comment{color:#587747}.iqa-sql-number{color:#066c91}.iqa-sql-identifier{color:#005a9c}
        .iqa-sql-complete{position:fixed;z-index:100000;max-height:240px;overflow:auto;width:360px;max-width:calc(100vw - 24px);background:#fff;border:1px solid #94a3b8;border-radius:4px;box-shadow:0 4px 12px #0002;padding:3px;color:#172b4d;font:13px/1.4 Consolas,monospace;}
        .iqa-sql-complete[hidden]{display:none}.iqa-sql-complete>[role=option]{display:grid;grid-template-columns:22px minmax(0,1fr);grid-template-areas:"icon label" "icon detail";padding:6px 8px;cursor:pointer;overflow-wrap:anywhere}.iqa-sql-complete>[aria-selected=true]{background:#dcedfc}.iqa-sql-complete-icon{grid-area:icon;align-self:center;display:flex;align-items:center;justify-content:center;width:18px;height:18px;color:#4b5563;background:none}.iqa-sql-complete-icon svg{display:block;width:18px;height:18px;overflow:visible;shape-rendering:crispEdges}.iqa-sql-complete-icon[data-kind=field] svg{width:10px;height:18px}.iqa-sql-complete-label{grid-area:label;min-width:0}.iqa-sql-complete-source{color:#7b8794}.iqa-sql-complete small{grid-area:detail;display:block;color:#64748b;font:12px/1.4 system-ui}.iqa-sql-hint{display:block;margin:5px 0 8px;color:#64748b;font-size:12px;}
        .iqa-sql-validation{margin:5px 0;font-size:13px;color:#526173}.iqa-sql-validation[data-error=true]{color:#a12622}body.iqa-enhanced #CustomProperty textarea.iqa-sql-input[aria-invalid=true]{border-color:#a12622!important}
        @media(forced-colors:active){.iqa-sql-editor>pre{display:none}body.iqa-enhanced #CustomProperty .iqa-sql-editor>textarea.iqa-sql-input{color:CanvasText!important;-webkit-text-fill-color:CanvasText;caret-color:auto}}
      `;
      document.head.appendChild(style);
    }
    for (const [ta, item] of items) if (!ta.isConnected) dispose(ta, item);
    document.querySelectorAll('#CustomProperty textarea').forEach(ta => {
      if (items.has(ta)) return;
      const shell = document.createElement('div'); shell.className = 'iqa-sql-editor';
      const pre = document.createElement('pre'); pre.setAttribute('aria-hidden', 'true');
      const menu = document.createElement('div'); menu.className = 'iqa-sql-complete'; menu.hidden = true; menu.id = 'iqaSqlComplete-' + Math.random().toString(36).slice(2); menu.setAttribute('role', 'listbox'); menu.setAttribute('aria-label', 'SQL suggestions'); document.body.appendChild(menu);
      const hint = document.createElement('small'); hint.className = 'iqa-sql-hint';
      hint.title = 'Suggestions use configured source mappings and authoritative field names from the Business Object definition API. Every Sources load refreshes the mapping, including added or removed objects, and takes precedence over the saved query definition.';
      const readyHint = 'Type a source, field name or alias for suggestions. Use ↑ / ↓ and Tab or Enter to insert; Tab inserts 3 spaces when suggestions are closed; Esc dismisses.';
      hint.textContent = sourceFields().length ? readyHint : 'Click the SQL box to load configured sources and their Business Object fields.';
      const attributes = Object.fromEntries(['role', 'aria-autocomplete', 'aria-expanded', 'aria-controls', 'aria-activedescendant', 'aria-invalid', 'aria-describedby'].map(name => [name, ta.getAttribute(name)]));
      const validation = document.createElement('div'); validation.className = 'iqa-sql-validation'; validation.id = menu.id + '-validation'; validation.setAttribute('role', 'status');
      const add = ta.closest('table')?.querySelector('input[type="submit"], button[type="submit"]');
      const item = { shell, menu, hint, validation, add, addDisabled: add?.disabled, attributes, abort: new AbortController(), spellcheck: ta.getAttribute('spellcheck') };
      ta.before(shell); shell.append(pre, ta); ta.classList.add('iqa-sql-input'); ta.spellcheck = false;
      shell.after(hint); ta.setAttribute('role', 'combobox'); ta.setAttribute('aria-autocomplete', 'list'); ta.setAttribute('aria-controls', menu.id); ta.setAttribute('aria-expanded', 'false');
      hint.after(validation); ta.setAttribute('aria-describedby', [attributes['aria-describedby'], validation.id].filter(Boolean).join(' '));
      const check = () => {
        const issue = validate(ta.value), hasText = !!ta.value.trim();
        validation.dataset.error = String(!!issue && hasText); ta.setAttribute('aria-invalid', String(!!issue && hasText));
        validation.textContent = issue ? (hasText ? `Line ${issue.line}, column ${issue.column}: ${issue.message}` : 'Enter an expression to enable Add.') : 'Basic syntax checks passed. Full SQL validation happens when the query runs.';
        if (add) add.disabled = item.addDisabled || !!issue;
        return issue;
      };
      const guardAdd = event => {
        const issue = check(); if (!issue) return;
        event.preventDefault(); event.stopImmediatePropagation(); ta.focus(); ta.setSelectionRange(issue.index, issue.index);
      };
      add?.addEventListener('click', guardAdd, { capture: true, signal: item.abort.signal });
      ta.form?.addEventListener('submit', event => { if (event.submitter === add) guardAdd(event); }, { capture: true, signal: item.abort.signal });
      let suggestions = null, active = 0;
      const close = () => { menu.hidden = true; suggestions = null; ta.setAttribute('aria-expanded', 'false'); ta.removeAttribute('aria-activedescendant'); };
      const select = () => {
        [...menu.children].forEach((node, i) => node.setAttribute('aria-selected', String(i === active)));
        const node = menu.children[active];
        if (node) {
          ta.setAttribute('aria-activedescendant', node.id);
          if (node.offsetTop < menu.scrollTop) menu.scrollTop = node.offsetTop;
          else if (node.offsetTop + node.offsetHeight > menu.scrollTop + menu.clientHeight) menu.scrollTop = node.offsetTop + node.offsetHeight - menu.clientHeight;
        }
      };
      const position = () => {
        const mirror = document.createElement('div'), caret = document.createElement('span');
        const style = getComputedStyle(ta);
        Object.assign(mirror.style, { position: 'fixed', visibility: 'hidden', width: ta.clientWidth + 'px', boxSizing: 'border-box', font: style.font, padding: style.padding, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', tabSize: '3' });
        mirror.textContent = ta.value.slice(0, ta.selectionStart); caret.textContent = '\u200b'; mirror.appendChild(caret); document.body.appendChild(mirror);
        const origin = mirror.getBoundingClientRect(), point = caret.getBoundingClientRect(), box = ta.getBoundingClientRect();
        const left = box.left + point.left - origin.left - ta.scrollLeft;
        const top = box.top + point.top - origin.top - ta.scrollTop + 22;
        mirror.remove();
        menu.style.left = Math.max(8, Math.min(left, window.innerWidth - menu.offsetWidth - 8)) + 'px';
        menu.style.top = Math.max(8, Math.min(top, window.innerHeight - menu.offsetHeight - 8)) + 'px';
      };
      const suggest = () => {
        if (ta.selectionStart !== ta.selectionEnd) return close();
        suggestions = complete(ta.value.slice(0, ta.selectionStart), sourceFields());
        if (!suggestions?.options.length) return close();
        active = 0; menu.replaceChildren();
        suggestions.options.forEach((option, index) => {
          const node = document.createElement('div'); node.setAttribute('role', 'option'); node.id = menu.id + '-' + index;
          const kind = option.kind === 'source' ? 'source' : 'field';
          node.setAttribute('aria-label', (kind === 'source' ? 'Source: ' : 'Field: ') + option.label + '. ' + option.detail);
          const icon = document.createElement('span'); icon.className = 'iqa-sql-complete-icon'; icon.dataset.kind = kind; icon.setAttribute('aria-hidden', 'true');
          icon.innerHTML = kind === 'source'
            ? '<svg viewBox="0 0 18 18"><rect x="1.5" y="1.5" width="15" height="15" fill="none" stroke="currentColor"/><rect x="2" y="2" width="14" height="3.5" fill="#9aa2ac"/><path d="M1.5 5.5h15M6.5 5.5v11M11.5 5.5v11M1.5 9.17h15M1.5 12.83h15" fill="none" stroke="currentColor"/></svg>'
            : '<svg viewBox="4 0 10 18"><rect x="5" y="1.5" width="8" height="15" fill="none" stroke="currentColor"/><rect x="5.5" y="2" width="7" height="3.5" fill="#9aa2ac"/><path d="M5 5.5h8M5 9.17h8M5 12.83h8" fill="none" stroke="currentColor"/></svg>';
          const label = document.createElement('span'); label.className = 'iqa-sql-complete-label';
          if (kind === 'field' && option.sourceLabel) {
            const sourceName = document.createElement('span'); sourceName.className = 'iqa-sql-complete-source'; sourceName.textContent = option.sourceLabel + '.';
            const fieldName = document.createElement('span'); fieldName.textContent = option.fieldLabel;
            label.append(sourceName, fieldName);
          } else label.textContent = option.label;
          const detail = document.createElement('small'); detail.textContent = option.detail; node.appendChild(detail);
          node.prepend(icon, label);
          node.addEventListener('pointerdown', event => { event.preventDefault(); active = index; accept(); }); menu.appendChild(node);
        });
        menu.hidden = false; ta.setAttribute('aria-expanded', 'true'); select(); position();
      };
      const accept = () => {
        const option = suggestions?.options[active]; if (!option) return;
        const start = suggestions.start, end = ta.selectionEnd;
        const suffix = ta.value.slice(end).match(/^[\w]*\]?/)?.[0] || '';
        close(); ta.focus(); ta.setRangeText(option.insert, start, end + suffix.length, 'end');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      };
      let requestedSources = false;
      ta.addEventListener('focus', async () => {
        if (requestedSources) return;
        requestedSources = true; hint.textContent = 'Loading sources and Business Object fields…'; shell.setAttribute('aria-busy', 'true');
        try {
          await loadSavedSources();
          await loadBusinessObjectDefinitions(sourceCache.read());
          if (item.abort.signal.aborted) return;
          hint.textContent = sourceFields().length ? readyHint : 'No unambiguous business-object suggestions are available. Visit Sources to refresh the current definition.';
          if (document.activeElement === ta) suggest();
        } catch (error) {
          requestedSources = false;
          if (!item.abort.signal.aborted) {
            hint.textContent = (error.name === 'AbortError' ? 'Loading the saved definition timed out.' : error.message) + ' You can continue typing SQL or retry by focusing this field again.';
            if (document.activeElement === ta) suggest();
          }
        } finally { shell.removeAttribute('aria-busy'); }
      }, { signal: item.abort.signal });
      const sync = () => {
        pre.style.width = (ta.clientWidth + 2) + 'px'; pre.style.height = (ta.clientHeight + 2) + 'px';
        pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft;
      };
      const paint = () => {
        const fragment = document.createDocumentFragment();
        for (const token of tokens(ta.value)) {
          const span = document.createElement('span'); span.textContent = token.text;
          if (token.type) span.className = 'iqa-sql-' + token.type;
          fragment.appendChild(span);
        }
        fragment.appendChild(document.createTextNode('\n')); pre.replaceChildren(fragment); sync(); check();
      };
      ta.addEventListener('input', event => { paint(); if (event.isComposing) close(); else suggest(); }, { signal: item.abort.signal });
      ta.addEventListener('change', paint, { signal: item.abort.signal });
      ta.addEventListener('scroll', () => { sync(); close(); }, { signal: item.abort.signal });
      ta.addEventListener('blur', close, { signal: item.abort.signal });
      ta.addEventListener('click', close, { signal: item.abort.signal });
      window.addEventListener('resize', close, { signal: item.abort.signal });
      ta.addEventListener('keydown', event => {
        if (event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
        if (menu.hidden) {
          if (event.key === 'Tab' && !event.shiftKey) {
            event.preventDefault();
            ta.setRangeText('   ', ta.selectionStart, ta.selectionEnd, 'end');
            ta.dispatchEvent(new Event('input', { bubbles: true }));
          }
          return;
        }
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); active = (active + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.options.length) % suggestions.options.length; select(); }
        else if (!event.shiftKey && (event.key === 'Tab' || event.key === 'Enter')) { event.preventDefault(); accept(); }
        else if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab'].includes(event.key)) close();
      }, { signal: item.abort.signal });
      if (typeof ResizeObserver !== 'undefined') { item.observer = new ResizeObserver(sync); item.observer.observe(ta); }
      items.set(ta, item); paint();
    });
  }
  function teardown() { for (const [ta, item] of items) dispose(ta, item); }
  return { mount, teardown, captureSources };
}
if (typeof module !== 'undefined' && module.exports) module.exports = createSqlEditor;

  const SqlEditor = createSqlEditor({ getPath: () => HeaderPath._read().path, getDocumentKey: () => HeaderDocumentKey._read() });
  // END SQL EDITOR V1

  const ALWAYS = [QuickAdd, { mount: () => SqlEditor.captureSources() }];
  const GATED  = [OverhaulCss, BoSearch, SqlTools, FilterSortDropdowns, UncheckAll, FilterAutocomplete, DragSort, FilterWorkspace, SourceWorkspace, RelationshipWorkspace, SqlEditor];

  const mountAlways  = () => ALWAYS.forEach(m => safe(() => m.mount?.()));
  const enableGated  = () => { document.body.classList.add('iqa-enhanced'); GATED.forEach(m => safe(() => m.mount?.())); };
  const disableGated = () => { [...GATED].reverse().forEach(m => safe(() => m.teardown?.())); document.body.classList.remove('iqa-enhanced'); };

  function ensureEnhanceHelp(pill) {
    injectStyle('iqaEnhanceHelpCss', `
      /* Presentation comes from the theme's native button classes. Only the
         dialog's own layout and the compact "?" glyph are set here. */
      #iqaEnhanceHelp{flex:0 0 auto;font-size:var(--fs-md,16px);font-weight:var(--fw-semi,600);line-height:1;}
      #iqaEnhanceHelpDialog{width:min(740px,92vw);max-height:88vh;padding:0;box-sizing:border-box;border:1px solid var(--border,#e2e5e9);border-radius:var(--radius,8px);background:var(--bg-surface,#fff);color:var(--text-base,#545962);font:var(--fw-normal,400) var(--fs-base,14px)/var(--lh-loose,1.65) var(--font-body,"Open Sans","Helvetica Neue",Arial,sans-serif);box-shadow:var(--shadow-lg,0 8px 20px rgba(0,27,35,.16));text-align:left;}
      #iqaEnhanceHelpDialog[open]{display:flex;flex-direction:column;}
      #iqaEnhanceHelpDialog::backdrop{background:rgb(0 27 35 / .4);}
      #iqaEnhanceHelpDialog header{display:flex;align-items:center;justify-content:space-between;gap:var(--space-4,16px);flex-shrink:0;padding:var(--space-4,16px) var(--space-5,20px);border-bottom:1px solid var(--border,#e2e5e9);}
      #iqaEnhanceHelpDialog h2{margin:0;color:var(--text-strong,#1c2024);font:var(--fw-semi,600) var(--fs-xl,22px)/var(--lh-tight,1.25) var(--font-display,"Red Hat Display","Open Sans",Helvetica,Arial,sans-serif);}
      #iqaEnhanceHelpDialog .iqa-help-content{overflow:auto;min-height:0;padding:var(--space-2,8px) var(--space-6,24px) var(--space-6,24px);}
      #iqaEnhanceHelpDialog h3{margin:var(--space-5,20px) 0 var(--space-2,8px);color:var(--text-strong,#1c2024);font-size:var(--fs-md,16px);}
      #iqaEnhanceHelpDialog ul,#iqaEnhanceHelpDialog ol{margin:0;padding-left:22px;}
      #iqaEnhanceHelpDialog li{margin:var(--space-1,4px) 0;}
      #iqaEnhanceHelpDialog .iqa-help-note{margin:var(--space-5,20px) 0 0;padding:var(--space-3,12px);border-radius:var(--radius-sm,4px);background:var(--info-bg,#e4f0f4);}
    `);
    let button = document.getElementById('iqaEnhanceHelp');
    if (!button) {
      button = document.createElement('button'); button.type = 'button'; button.id = 'iqaEnhanceHelp'; button.textContent = '?';
      button.className = 'TextButton us-icon-button';
      button.title = 'About IQA enhancements'; button.setAttribute('aria-label', 'Help with IQA enhancements');
      button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-controls', 'iqaEnhanceHelpDialog');
      button.addEventListener('click', () => {
        let dialog = document.getElementById('iqaEnhanceHelpDialog');
        if (!dialog) {
          dialog = document.createElement('dialog'); dialog.id = 'iqaEnhanceHelpDialog'; dialog.setAttribute('aria-labelledby', 'iqaEnhanceHelpTitle');
          dialog.innerHTML = `<header><h2 id="iqaEnhanceHelpTitle">IQA enhancements</h2><button type="button" class="TextButton us-outline-button" autofocus>Close</button></header>
            <div class="iqa-help-content">
              <h3>Throughout IQA</h3>
              <ul><li>Turn the improvements on or off using <strong>Enhance</strong>.</li>
              <li>Press <strong>Ctrl+S</strong>, or <strong>Command+S</strong> on a Mac, while working in the query designer to save your query. The Save button shows <strong>Saving…</strong> with a spinner while the save is in progress.</li>
              <li>Copy the query path or DocumentVersionKey from the header, even after switching tabs. Hover over either button to see the value. The DocumentVersionKey is captured when you open an existing IQA.</li>
              </ul>
              <h3>Summary</h3>
              <ul><li>Copy the query path or SQL summary with one click.</li><li>Larger fields make descriptions and SQL easier to read.</li></ul>
              <h3>Sources</h3>
              <ol><li>Quick add business objects via search or the <strong>Union Template</strong> quick-add list.</li>
              <li>Drag and drop to reorder business objects (via popup).</li>
              <li>Quick add relationships using <strong>Join by ID</strong>. Original relationships are still available via <strong>Choose fields</strong>, or <strong>Predefined relationship</strong>.</li>
              <li>See when a matching relationship already exists.</li></ol>
              <h3>Filters</h3>
              <ol><li>Type to search on field dropdowns.</li>
              <li>Drag and drop to reorder filters (via popup).</li>
              <li>When multiple filter groups are defined: see numbered groups and grouping order of operations. eg. <strong>((Group 1 OR Group 2) AND Group 3)</strong>.</li>
              <li>Function setting hidden behind the <strong>ƒx</strong> icon.</li>
              <li><strong>Allow multiple values</strong> moved beneath the relevant dropdown.</li>
              <li><strong>Search Label</strong> column hidden when no optional/required fields exist.</li>
              <li>Add condition moved to beneath the last group.</li></ol>
              <h3>Display</h3>
              <ol><li>Drag columns into the order you want.</li>
              <li>Toggle drag and drop off when you don’t need it.</li>
              <li>Use <strong>Reset order</strong> to undo changes you've made via drag and drop.</li>
              <li>Edit or copy custom SQL using the buttons beside the field.</li>
              <li>Type a business-object name, alias, or field name to see matching source and fully qualified field suggestions. All fields in each configured Business Object are included, whether selected or still available, and field suggestions show their data type. Source and field icons identify each result. Suggestions insert the actual SQL source name. Use the arrow keys and Tab or Enter to insert; Escape closes the list. With the list closed, Tab inserts three spaces.</li>
              <li>Configured source mappings are loaded from the current Sources tab or saved query definition. Field names and captions are loaded from the Business Object definition API.</li>
              <li>Common SQL syntax errors show a line and column number and disable <strong>Add</strong> until corrected. These basic checks do not replace full SQL validation when running the query.</li></ol>
              <h3>Sorting</h3>
              <ul><li>Type to search on field dropdowns.</li><li>Drag and drop fields to reorder.</li></ul>
              <p class="iqa-help-note"><strong>Remember:</strong> applying a new order updates the editor. Click <strong>Save</strong>, press <strong>Ctrl+S</strong>, or press <strong>Command+S</strong> on a Mac when you’re ready to save the query.</p>
            </div>`;
          dialog.querySelector('header button').addEventListener('click', () => dialog.close());
          dialog.addEventListener('close', () => document.getElementById('iqaEnhanceHelp')?.focus({ preventScroll: true }));
          dialog.addEventListener('click', event => {
            if (event.target !== dialog) return;
            const bounds = dialog.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
          });
          document.body.appendChild(dialog);
        }
        if (!dialog.open) { dialog.querySelector('.iqa-help-content').scrollTop = 0; dialog.showModal(); }
      });
    }
    if (pill.nextElementSibling !== button) pill.after(button);
  }

  function paintToggle() {
    // Setting the native checkbox is enough: the theme's switch renders the
    // track, thumb and On/Off text from :checked, and exposes aria-checked.
    const input = document.getElementById('iqaEnhanceToggleInput');
    if (input) input.checked = getMode();
  }
  // Tab-local editor memory: Summary supplies the authoritative path. Other tabs
  // may omit it entirely, including after a full native editor refresh.
  const HeaderPath = {
    _record: null,
    _queryKey(search) {
      // QueryKey identifies the IQA; tab selection and other editor parameters do not.
      for (const [name, value] of new URLSearchParams(search)) if (name.toLowerCase() === 'querykey') return value.toLowerCase();
      return '';
    },
    _read() {
      const session = [...new URLSearchParams(location.search)].find(([name]) => name.toLowerCase() === 'isession')?.[1]?.toLowerCase() || '';
      const key = 'iqa:header-path:v1:' + location.pathname.toLowerCase() + (session ? ':session:' + encodeURIComponent(session) : '');
      if (this._storageKey !== key) { this._record = null; this._storageKey = key; }
      const queryKey = this._queryKey(location.search);
      const field = document.querySelector('span[id$="_QueryPath"]');
      let record = this._record;
      try { record = JSON.parse(sessionStorage.getItem(key) || 'null') || record; } catch (_) {}
      const path = field?.textContent.trim() || '';
      const visibleSummary = field?.closest('[id$="_SummaryPanel_Body"]')?.getClientRects().length > 0;
      const previousQueryKey = record?.queryKey || this._queryKey(record?.query || '');
      if (path.startsWith('$/') || visibleSummary) {
        // Only an active Summary can clear an unsaved query's path. Empty hidden
        // Summary controls on other tabs must not erase the captured value.
        record = path.startsWith('$/') ? { path, queryKey, at: Date.now() } : null;
        try { if (record) sessionStorage.setItem(key, JSON.stringify(record)); else sessionStorage.removeItem(key); } catch (_) {}
      } else if (record && (Date.now() - record.at > 43200000 || queryKey && previousQueryKey && queryKey !== previousQueryKey)) {
        record = null;
        try { sessionStorage.removeItem(key); } catch (_) {}
      }
      this._record = record;
      return { path: typeof record?.path === 'string' && record.path.startsWith('$/') ? record.path : '', field };
    },
    mount(pill) {
      const state = this._read();
      let button = document.getElementById('iqaHeaderCopyPath');
      if (!button) {
        button = document.createElement('button'); button.type = 'button';
        button.id = 'iqaHeaderCopyPath'; button.className = 'TextButton us-outline-button iqa-header-copy-button';
        button.innerHTML = COPY_ICON + copyLabel('Path');
        button.setAttribute('aria-label', 'Copy query path');
        const status = document.createElement('span'); status.className = 'iqa-header-copy-status'; status.setAttribute('role', 'status');
        button.appendChild(status);
        let timer;
        button.addEventListener('click', async () => {
          const current = this._read(); if (!current.path) return;
          const ok = await copyText(current.path);
          if (!button.isConnected) return;
          clearTimeout(timer);
          const label = button.querySelector('.iqa-header-copy-text');
          label.textContent = ok ? 'Copied' : 'Copy failed';
          status.textContent = ok ? 'Query path copied' : 'Could not copy query path';
          if (ok) SqlTools._flash(current.field || button);
          timer = setTimeout(() => { label.textContent = 'Path'; status.textContent = ''; }, 1200);
        });
      }
      button.disabled = !state.path;
      button.title = state.path || 'Open Summary to capture the query path';
      if (button.parentElement !== pill.parentElement || button.nextElementSibling !== pill) pill.before(button);
    }
  };
  const HeaderDocumentKey = {
    _record: null,
    _read() {
      const params = new Map([...new URLSearchParams(location.search)].map(([name, value]) => [name.toLowerCase(), value]));
      const session = (params.get('isession') || '').toLowerCase();
      const storageKey = 'iqa:document-key:v1:' + location.pathname.toLowerCase() + ':session:' + encodeURIComponent(session);
      if (this._storageKey !== storageKey) { this._record = null; this._storageKey = storageKey; }
      const supplied = params.get('iuniformkey');
      const valid = value => typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value) && !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(value);
      let record = this._record;
      if (session) { try { record = JSON.parse(sessionStorage.getItem(storageKey) || 'null') || record; } catch (_) {} }
      const newQuery = /^(new|add|create)$/i.test(params.get('imode') || '') || /^(new|add|create)$/i.test(params.get('ioperation') || '');
      if (newQuery) record = null;
      else if (supplied !== undefined) record = valid(supplied) ? { value: supplied, at: Date.now() } : null;
      else if (!session || !valid(record?.value) || !Number.isFinite(record?.at) || Date.now() - record.at > 43200000) record = null;
      this._record = record;
      if (session) { try { if (record) sessionStorage.setItem(storageKey, JSON.stringify(record)); else sessionStorage.removeItem(storageKey); } catch (_) {} }
      return record?.value || '';
    },
    mount(pill) {
      const key = this._read();
      let button = document.getElementById('iqaHeaderCopyDocumentKey');
      if (!button) {
        button = document.createElement('button'); button.type = 'button';
        button.id = 'iqaHeaderCopyDocumentKey'; button.className = 'TextButton us-outline-button iqa-header-copy-button';
        button.innerHTML = COPY_ICON + copyLabel('DocumentVersionKey');
        button.setAttribute('aria-label', 'Copy query DocumentVersionKey');
        const status = document.createElement('span'); status.className = 'iqa-header-copy-status'; status.setAttribute('role', 'status'); button.appendChild(status);
        let timer;
        button.addEventListener('click', async () => {
          const current = this._read(); if (!current) return;
          const ok = await copyText(current); if (!button.isConnected) return;
          clearTimeout(timer);
          const label = button.querySelector('.iqa-header-copy-text');
          label.textContent = ok ? 'Copied' : 'Copy failed';
          status.textContent = ok ? 'DocumentVersionKey copied' : 'Could not copy DocumentVersionKey';
          if (ok) SqlTools._flash(button);
          timer = setTimeout(() => { label.textContent = 'DocumentVersionKey'; status.textContent = ''; }, 1200);
        });
      }
      button.disabled = !key;
      button.title = key || 'Reopen an existing IQA to capture its DocumentVersionKey';
      if (button.parentElement !== pill.parentElement || button.nextElementSibling !== pill) pill.before(button);
    }
  };
  let shortcutSaveState = null;
  function clearShortcutSaving() {
    const state = shortcutSaveState;
    if (!state) return;
    shortcutSaveState = null;
    clearTimeout(state.timer);
    state.spinner.remove();
    state.save.disabled = state.disabled;
    if (state.isInput) state.save.value = state.label;
    if (state.busy === null) state.save.removeAttribute('aria-busy');
    else state.save.setAttribute('aria-busy', state.busy);
  }
  function showShortcutSaving(save) {
    injectStyle('iqaSaveSpinnerCss', '.iqa-save-spinner{display:inline-block;width:16px;height:16px;box-sizing:border-box;border:2px solid #cbd5e1;border-top-color:#007fa3;border-radius:50%;vertical-align:middle;animation:iqaSaveSpin .7s linear infinite;}@keyframes iqaSaveSpin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.iqa-save-spinner{animation:none;}}');
    const spinner = document.createElement('span');
    spinner.className = 'iqa-save-spinner';
    spinner.setAttribute('role', 'status'); spinner.setAttribute('aria-label', 'Saving query');
    const state = { save, spinner, disabled: save.disabled, busy: save.getAttribute('aria-busy'), isInput: save.tagName === 'INPUT', label: save.value };
    shortcutSaveState = state;
    save.disabled = true; save.setAttribute('aria-busy', 'true');
    if (state.isInput) save.value = 'Saving…';
    save.after(spinner);
    // Recover if navigation is cancelled or the native save leaves the page open.
    state.timer = setTimeout(clearShortcutSaving, 30000);
  }
  function handleSaveShortcut(event) {
    if ((!event.ctrlKey && !event.metaKey) || (event.ctrlKey && event.metaKey) || event.altKey || event.shiftKey || event.isComposing || event.key.toLowerCase() !== 's') return;
    const save = document.querySelector('[id$="_DesignShell1_SaveButton"]');
    if (!save) return;
    event.preventDefault();
    // Use the current native control after each postback, including its validation.
    if (shortcutSaveState || event.repeat || save.matches(':disabled, [aria-disabled="true"]') || !save.getClientRects().length || document.querySelector('dialog[open]')) return;
    const prm = window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
    if (prm?.get_isInAsyncPostBack?.()) return;
    let clickEvent;
    const observe = event => { clickEvent = event; };
    save.addEventListener('click', observe, { capture: true, once: true });
    try {
      // Click first: disabling beforehand would suppress native validation/postback.
      save.click();
      if (!clickEvent?.defaultPrevented && window.Page_IsValid !== false) showShortcutSaving(save);
    } finally { save.removeEventListener('click', observe, true); }
  }

  function ensureToggle() {
    const save = document.querySelector('[id$="_DesignShell1_SaveButton"]');
    const group = save?.parentElement;
    if (!group) { document.getElementById('iqaEnhanceToggle')?.remove(); document.getElementById('iqaHeaderCopyPath')?.remove(); document.getElementById('iqaHeaderCopyDocumentKey')?.remove(); document.getElementById('iqaEnhanceHelp')?.remove(); document.getElementById('iqaEnhanceHelpDialog')?.remove(); return; }
    const firstAction = group.querySelector('[id$="_DesignShell1_SaveAsButton"]') || save;
    save.setAttribute('aria-keyshortcuts', 'Control+S Meta+S');
    if (!save.dataset.iqaOriginalTitle) save.dataset.iqaOriginalTitle = save.title || 'Save query';
    save.title = save.dataset.iqaOriginalTitle + ' (Ctrl+S or ⌘S)';

    injectStyle('iqaEnhanceToggleCss',
      '.iqa-editor-actions{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:var(--space-2,8px);}' +
      '.iqa-header-copy-button{display:inline-flex;align-items:center;gap:var(--space-2,8px);margin:0;white-space:nowrap;}' +
      '.iqa-header-copy-button > svg{flex:none;width:16px;height:16px;}' +
      '.iqa-header-copy-label{display:grid;justify-items:center;}' +
      '.iqa-header-copy-label > span{grid-area:1/1;}' +
      '.iqa-header-copy-label > span + span{visibility:hidden;}' +
      '.iqa-header-copy-status{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;}' +
      '.iqa-copy-flash{background-color:rgba(0,126,168,.12)!important;background-color:color-mix(in srgb,var(--border-focus,#006f94) 14%,transparent)!important;}' +
      '#iqaEnhanceToggle{margin:0;}' +
      '#iqaEnhanceToggle > span:not([class]){white-space:nowrap;}');

    let pill = document.getElementById('iqaEnhanceToggle');
    if (!pill) {
      pill = elFromHTML(`<label id="iqaEnhanceToggle" class="us-switch us-switch--primary" title="Turn the IQA editor enhancements on or off">
        <input type="checkbox" role="switch" id="iqaEnhanceToggleInput">
        <span class="us-switch__track" aria-hidden="true"></span>
        <span>Enhance</span>
      </label>`);
      pill.querySelector('input').addEventListener('change', event => {
        const next = event.target.checked; setMode(next);
        if (next) enableGated(); else disableGated();
        paintToggle();
      });
    }
    // Keep the native actions and their handlers in place. Remount after postbacks.
    group.classList.add('iqa-editor-actions');
    if (pill.parentElement !== group || pill.nextElementSibling !== firstAction) group.insertBefore(pill, firstAction);
    paintToggle();
    HeaderPath.mount(pill);
    HeaderDocumentKey.mount(pill);
    ensureEnhanceHelp(pill);
  }

  function run() {
    mountAlways();
    if (getMode()) enableGated();
    ensureToggle();
  }

  /* ---- boot + postback re-run ------------------------------------------- */
  function boot() {
    document.addEventListener('keydown', handleSaveShortcut);
    window.addEventListener('pageshow', clearShortcutSaving);
    TabBusy.watch();
    // DOM readiness is sufficient on every editor tab. Waiting for a Sources
    // or Display control delayed Summary/Sorting startup by over ten seconds.
    run();
    let tries = 0;
    const attachPostbacks = () => {
      try {
        const prm = window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
        if (!prm) return false;
        prm.add_beginRequest(() => TabBusy.begin());
        prm.add_endRequest(() => { TabBusy.clear(); clearShortcutSaving(); run(); });
        return true;
      } catch (_) { return false; }
    };
    // A late ASP.NET runtime must not hold up the visible enhancements.
    if (!attachPostbacks()) {
      const t = setInterval(() => {
        if (attachPostbacks() || ++tries >= 40) clearInterval(t);
      }, 250);
    }
  }

  /* ===========================================================================
   * Styles (module CSS + prefixed overhaul)
   * ======================================================================== */
  var BOSEARCH_CSS =
      '.iqa-bo-search{margin:12px 0 16px;position:relative;font-size:13px;}'
    + '.iqa-bo-search__label{display:block;font-weight:600;color:#475569;margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.03em;}'
    + '.iqa-bo-search__box{position:relative;}'
    + '.iqa-bo-search__input{width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;outline:none;transition:border-color .15s,box-shadow .15s;}'
    + '.iqa-bo-search__input:focus{border-color:#667eea;box-shadow:0 0 0 3px rgba(102,126,234,.15);}'
    + '.iqa-bo-search__box.is-loading .iqa-bo-search__input{padding-right:30px;}'
    + '.iqa-bo-search__spinner{position:absolute;top:50%;right:9px;width:14px;height:14px;margin-top:-7px;box-sizing:border-box;border:2px solid #cbd5e1;border-top-color:#667eea;border-radius:50%;display:none;animation:iqaBoSpin .6s linear infinite;}'
    + '.iqa-bo-search__box.is-loading .iqa-bo-search__spinner{display:block;}'
    + '@keyframes iqaBoSpin{to{transform:rotate(360deg);}}'
    + '.iqa-bo-search__list{list-style:none;margin:0;padding:4px;position:absolute;top:calc(100% + 2px);z-index:1000;left:0;right:0;background:#fff;border:1px solid #cbd5e1;border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,.12);max-height:320px;overflow-y:auto;display:none;}'
    + '.iqa-bo-search__list.is-open{display:block;}'
    + '.iqa-bo-search__item{padding:6px 8px;border-radius:4px;cursor:pointer;display:flex;flex-direction:column;gap:1px;}'
    + '.iqa-bo-search__item.is-active,.iqa-bo-search__item:hover{background:#eef2ff;}'
    + '.iqa-bo-search__name{font-weight:600;color:#1e293b;}'
    + '.iqa-bo-search__desc{color:#64748b;font-size:11px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}'
    + '.iqa-bo-search__empty{padding:8px;color:#94a3b8;text-align:center;}';

  var QUICKADD_CSS =
      '.iqa-quickadd__media{margin-top:0;}'
    + '.iqa-quickadd__media + .iqa-quickadd__media{margin-top:10px;}'
    + '.iqa-quickadd__desc{color:#64748b;font-size:11px;line-height:1.35;margin-top:1px;}'
    + '.iqa-quickadd__note{color:#94a3b8;font-size:12px;padding:2px 0;}';

  var SQLTOOLS_CSS =
      '.textarea-wrap{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 30px;gap:6px;align-items:start;}'
    + 'body.iqa-enhanced #SelectedProperty .textarea-wrap{display:grid!important;grid-template-columns:minmax(0,1fr) 30px!important;width:100%;}'
    /* The width group repeats what the shared .textarea-wrap rule below
       already says, at a specificity that beats the native
       `.SQLExpression td textarea{min-width:300px}`. Without it the field keeps
       that 300px and spills over its toolbar column and the Alias cell as soon
       as the grid is narrower than the expression. */
    + 'body.iqa-enhanced #SelectedProperty .textarea-wrap>textarea{grid-column:1;grid-row:1;width:100%;min-width:0;max-width:100%;}'
    + 'body.iqa-enhanced #SelectedProperty .textarea-wrap>.icon-bar{display:flex!important;flex-direction:column!important;grid-column:2;grid-row:1;gap:4px;margin:0!important;align-self:start;}'
    + '.iqa-copy-flash{background-color:rgba(0,126,168,.12)!important;background-color:color-mix(in srgb,var(--border-focus,#006f94) 14%,transparent)!important;animation:iqaCopyFlash .8s ease-out;}'
    + '@keyframes iqaCopyFlash{0%,25%{box-shadow:inset 0 0 0 9999px rgba(0,126,168,.24);box-shadow:inset 0 0 0 9999px color-mix(in srgb,var(--border-focus,#006f94) 26%,transparent);}100%{box-shadow:inset 0 0 0 9999px transparent;}}'
    + '@media(prefers-reduced-motion:reduce){.iqa-copy-flash{animation:none;box-shadow:inset 0 0 0 9999px rgba(0,126,168,.20);box-shadow:inset 0 0 0 9999px color-mix(in srgb,var(--border-focus,#006f94) 22%,transparent);}}'
    + '.textarea-wrap textarea{display:block;width:100%;min-width:0;box-sizing:border-box;}'
    + '.textarea-wrap textarea:disabled{background:#f7f8fa;color:#12283d;cursor:default;opacity:1;}'
    + '.icon-bar{display:flex;flex-direction:column;gap:4px;margin:0;align-items:center;}'
    + '.icon-btn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;padding:4px;border-radius:5px;border:1px solid #cbd5e1;background:#fff;color:#475569;cursor:pointer;user-select:none;transition:background .12s,border-color .12s,color .12s;}'
    + '.icon-btn:hover{background:#eef2ff;border-color:#94a3b8;}'
    + '.icon-btn:focus{outline:2px solid #4f8fd9;outline-offset:1px;}'
    + '.icon-btn svg{width:18px;height:18px;display:block;}'
    + '.icon-btn.is-editing{background:#0b62c4;border-color:#0b62c4;color:#fff;}'
    + '.copy-status{transition:opacity .2s;opacity:0;}'
    + '.sqltext-copy-btn{display:inline-flex;align-items:center;cursor:pointer;margin-left:8px;vertical-align:middle;color:#475569;}'
    + '.sqltext-copy-btn:hover{color:#0b62c4;}'
    + '.iqa-path-copy{border:0;padding:0;background:transparent;font:inherit;}'
    + '.iqa-path-copy:focus-visible{outline:2px solid #0b62c4;outline-offset:3px;}'
    + '.sqltext-copy-btn svg{width:20px;height:20px;}';

  var DROPDOWN_CSS = `
    .iqa-field-picker{display:flex;position:relative;width:100%;min-width:0;box-sizing:border-box;border:1px solid #ccc;border-radius:4px;background:#fff;overflow:hidden;}
    .iqa-field-picker:focus-within{border-color:#25a0da;box-shadow:0 0 4px #25a0da66;}
    body.iqa-enhanced .iqa-field-picker > input[type="text"]{flex:1 1 0;width:0!important;min-width:0!important;max-width:none!important;border:0!important;box-shadow:none!important;border-radius:0;margin:0;padding:6px 10px;min-height:32px;font:inherit;background:transparent;}
    .iqa-field-picker > button{flex:0 0 32px;border:0;border-left:1px solid #ddd;border-radius:0;background:#f8f8f8;color:#333;padding:0;cursor:pointer;}
    .iqa-field-picker:focus-within > button{background:#25a0da;color:#fff;}
    .iqa-field-list{position:fixed;z-index:100000;overflow:auto;box-sizing:border-box;padding:3px 0;border:1px solid #ccc;background:white;color:#454b54;box-shadow:0 3px 9px #0003;font:inherit;}
    .iqa-field-list[hidden]{display:none;}
    .iqa-field-list > div{padding:6px 10px;overflow-wrap:anywhere;cursor:pointer;}
    .iqa-field-list > div:hover,.iqa-field-list > .is-active{background:#e8e8e8;}
    .iqa-field-list mark{background:#ddd;color:inherit;font-weight:700;}
    table.iqa-filter-condition-box select{width:100%;}
    .sysicon.sysicon-info{display:none!important;}
    table.Grid.iqa-filter-condition-box > tbody > tr.GridHeader > td:nth-child(4){width:10px!important;}
  `;

  var HIST_CSS =
      '.iqa-hist-list{list-style:none;margin:0;padding:4px;position:absolute;z-index:100000;background:#fff;border:1px solid #cbd5e1;border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,.14);max-height:260px;overflow-y:auto;display:none;font-size:13px;}'
    + '.iqa-hist-list.is-open{display:block;}'
    + '.iqa-hist-item{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 8px;border-radius:4px;cursor:pointer;}'
    + '.iqa-hist-item.is-active,.iqa-hist-item:hover{background:#eef2ff;}'
    + '.iqa-hist-val{color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'
    + '.iqa-hist-del{color:#94a3b8;font-weight:700;padding:0 4px;line-height:1;}'
    + '.iqa-hist-del:hover{color:#dc2626;}';

  /* Feature-5 overhaul — every selector prefixed with body.iqa-enhanced so the
     toggle flips it all at once. */
  var OVERHAUL_CSS = [
    'body.iqa-enhanced [id$="_DisplayPanel_Body"] input[type="checkbox"]{width:18px;height:18px;min-width:18px;vertical-align:middle;cursor:pointer;}body.iqa-enhanced [id$="_DisplayPanel_Body"] input[type="checkbox"]:disabled{cursor:default;}',
    'body.iqa-enhanced [id$="_SortPanel_Body"] > table.Grid{width:870px;max-width:100%;min-width:0!important;table-layout:auto;}',
    'body.iqa-enhanced [id$="_SortPanel_Body"] > table.Grid > tbody > tr > td:not([colspan]):nth-child(1){width:8%;}',
    'body.iqa-enhanced [id$="_SortPanel_Body"] > table.Grid > tbody > tr > td:not([colspan]):nth-child(2){width:65%;white-space:normal;overflow-wrap:anywhere;}',
    'body.iqa-enhanced [id$="_SortPanel_Body"] > table.Grid > tbody > tr > td:not([colspan]):nth-child(3){width:23%;}',
    'body.iqa-enhanced [id$="_SortPanel_Body"] > table.Grid > tbody > tr > td:not([colspan]):nth-child(4){width:4%;}',
    'body.iqa-enhanced [id$="_SortPanel_Body"] > table.Grid > tbody > tr > td:nth-child(3) > select,body.iqa-enhanced [id$="_SortPanel_Body"] .iqa-field-picker{width:100%!important;min-width:0;max-width:100%;box-sizing:border-box;}',
    '@media(max-width:600px){body.iqa-enhanced [id$="_SortPanel_Body"] > table.Grid > tbody > tr > td:not([colspan]):nth-child(2){width:55%;}body.iqa-enhanced [id$="_SortPanel_Body"] > table.Grid > tbody > tr > td:not([colspan]):nth-child(3){width:33%;}}',
    'body.iqa-enhanced table.Grid.no-border.align-middle{width:100%;}',
    'body.iqa-enhanced input[id*="_DesignShell1_ctl00_ctl00_ctl00_txtAlias"]{width:100%;}',
    'body.iqa-enhanced table.Grid.no-border.align-middle:not(#SelectedProperty) > tbody > tr.GridHeader > td:nth-child(4){min-width:350px !important;}',
    'body.iqa-enhanced table#SelectedProperty{margin-bottom:25px;}',
    /* Property carries the source and field names, or a whole SQL expression,
       so it takes the largest share. Length and Format are capped because the
       native input and the long date options otherwise collect the spare
       width and leave Property too narrow to read an expression in. */
    'body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(2){width:26%;min-width:200px;}',
    'body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(4), body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(5){width:18% !important;min-width:150px !important;}',
    'body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(4) > input, body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(5) > input{width:100% !important;min-width:0;box-sizing:border-box;}',
    'body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(8){width:80px;}',
    'body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(8) > input{width:100%;min-width:0;box-sizing:border-box;}',
    /* A select is at least as wide as its longest option, so the date formats
       would otherwise claim the widest column on the grid. max-width caps that
       contribution and lets the option text truncate instead. */
    'body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(9) > select{max-width:170px;}',
    /* Below roughly a 1200px editor the fixed minimums are what pushes the grid
       past the viewport, so they give way before the Property column does. */
    '@media(max-width:1200px){'
      + 'body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(2){width:30%;min-width:220px;}'
      + 'body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(4),body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(5){width:auto !important;min-width:100px !important;}'
      + 'body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(9) > select{max-width:130px;}'
      + '}',
    'body.iqa-enhanced textarea[id*=_DesignShell1_ctl00_ctl00_ctl00_SQLTextField]{width:80%;min-height:500px;}',
    'body.iqa-enhanced #ctl00_TemplateBody_DesignShell1_ctl00_ctl00_ctl00_DivAdvancedMode > div:nth-child(3) > div > div.PanelFieldValue{width:100%;}',
    'body.iqa-enhanced #ctl00_TemplateBody_DesignShell1_ctl00_ctl00_ctl00_SummaryPanel_Body > div:nth-child(3) > div, body.iqa-enhanced #ctl00_TemplateBody_DesignShell1_ctl00_ctl00_ctl00_SummaryPanel_Body > div:nth-child(3) > div > textarea{width:80%;}',
    'body.iqa-enhanced #ctl00_TemplateBody_DesignShell1_ctl00_ctl00_ctl00_SummaryPanel_Body > div:nth-child(2) > div.PanelFieldValue{width:80%;}',
    'body.iqa-enhanced #ctl00_TemplateBody_DesignShell1_ctl00_ctl00_ctl00_SummaryPanel_Body > div:nth-child(2) > div > input{width:80%;}',
    'body.iqa-enhanced div#AvailablePanel{display:none;}',
    'body.iqa-enhanced div#CustomTitlePanel{display:none;}',
    'body.iqa-enhanced div#ctl00_TemplateBody_DesignShell1_ctl00_ctl00_ctl00_DisplayPanel_Body{display:flex;flex-direction:row;flex-wrap:wrap;}',
    'body.iqa-enhanced div#CustomPanel{width:990px;min-width:0;max-width:calc(100% - 8px);box-sizing:border-box;}',
    'body.iqa-enhanced #CustomProperty,body.iqa-enhanced #CustomProperty > tbody,body.iqa-enhanced #CustomProperty > tbody > tr{display:block;width:100%;min-width:0;max-width:100%;box-sizing:border-box;}',
    'body.iqa-enhanced #CustomProperty > tbody > tr > td{display:block;width:100%!important;min-width:0!important;max-width:100%;box-sizing:border-box;}',
    'body.iqa-enhanced #CustomProperty .SQLExpression textarea,body.iqa-enhanced #CustomProperty .SQLExpression input[type="text"]{width:100%!important;min-width:0;max-width:100%;box-sizing:border-box;}',
    'body.iqa-enhanced #CustomProperty .SQLExpression td textarea{min-height:350px;resize:vertical;}',
    'body.iqa-enhanced #CustomProperty > tbody > tr:first-child > td:empty{display:none;}',
    '@media(max-width:800px){body.iqa-enhanced div#CustomPanel{width:100%;max-width:100%;margin-left:0!important;}}',
    'body.iqa-enhanced #CustomProperty > tbody > tr:nth-child(1) > td:nth-child(2){display:none;}',
    'body.iqa-enhanced #CustomProperty tr.SQLExpression > td:nth-child(2)::before{content:"Alias";display:block;font-weight:700;margin:8px 0 2px;}'
  ].join('\n');

  // Start after CSS variables have been assigned, including when injected
  // into a document which has already finished loading.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
