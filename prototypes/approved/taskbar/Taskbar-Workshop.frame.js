/* Offline workshop only. No iMIS requests, user preferences or production writes. */
(function () {
  'use strict';

  const proposed = document.body.dataset.variant === 'proposal';
  const query = selector => document.querySelector(selector);
  const notifyParent = detail => window.parent.postMessage({workshop: true, variant: document.body.dataset.variant, ...detail}, '*');
  const icon = name => '<i class="ti ti-' + name + '" aria-hidden="true"></i>';
  const escape = value => String(value).replace(/[&<>"']/g, value => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[value]));
  let toastTimer;

  function toast(message) {
    const node = query('#ws-toast');
    node.textContent = message;
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { node.hidden = true; }, 2800);
  }

  // Both frames use the same appearance API and preview-only storage key.
  window.addEventListener('unionsuite:appearancechange', () => {
    notifyParent({scheme: window.UnionSuiteAppearance.getState().scheme});
  });

  const routes = [
    {id:'admin.iqa', name:'Intelligent Query Architect', short:'IQAs', category:'Administration', icon:'file-search', tags:'queries query builder reports'},
    {id:'content.manage', name:'Manage content', short:'Content', category:'RiSE', icon:'layout', tags:'pages content designer publishing'},
    {id:'admin.themes', name:'Theme manager', short:'Themes', category:'RiSE', icon:'palette', tags:'branding css styles'},
    {id:'members.reports', name:'Membership reports', short:'Reports', category:'Membership', icon:'chart-bar', tags:'renewals statistics reporting'},
    {id:'contacts.find', name:'Find contacts', short:'Contacts', category:'Community', icon:'users', tags:'members people directory'},
    {id:'events.manage', name:'Manage events', short:'Events', category:'Events', icon:'calendar-event', tags:'meetings training registration'},
    {id:'panels.manage', name:'Panel definitions', short:'Panels', category:'RiSE', icon:'layout-grid', tags:'fields panels business objects'},
    {id:'content.files', name:'Document and image library', short:'Library', category:'RiSE', icon:'folders', tags:'files upload images objects'},
    {id:'members.applications', name:'Membership applications', short:'Applications', category:'Membership', icon:'user-plus', tags:'new member join applicants'},
    {id:'community.committees', name:'Manage committees', short:'Committees', category:'Community', icon:'users-group', tags:'groups committee boards'},
    {id:'admin.about', name:'About iMIS', short:'About', category:'Administration', icon:'info-circle', tags:'version system information'},
    {id:'help.docs', name:'iMIS documentation', short:'Help', category:'Help', icon:'book', tags:'docs help support'}
  ];
  const samples = routes.slice(0, 4).map(route => route.id);
  let pins = [...samples];
  let layout = 'hybrid';
  let bookmarkBarVisible = false;
  let recentsControl;
  let paletteDragging = null;
  let scope = 'mine';
  let activeResult = 0;
  let results = routes;
  let returnFocus = null;
  let dragging = null;
  let recentsTimer;
  let recentsVersion = 0;
  const palette = query('#ws-palette');
  const fuzzy = typeof Fuse === 'function' ? new Fuse(routes, {keys:['name', 'short', 'category', 'tags'], threshold: .36, ignoreLocation: true}) : null;
  const recentData = {
    iqa: ['Active members by branch', 'Renewal follow-up list', 'Member contact details', 'New applications this month', 'Overdue membership payments', 'Workplace representatives', 'Event attendance summary', 'Recent member activity', 'Contact email preferences', 'Annual membership snapshot'],
    content: ['Staff home', 'Membership overview', 'New member welcome', 'Contact profile', 'Staff bulletin', 'Renewal information', 'Upcoming events', 'Branch directory', 'Member resources', 'Committee overview']
  };

  function button(label, markup, className, callback) {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = className;
    node.setAttribute('aria-label', label);
    node.title = label;
    node.innerHTML = markup;
    if (callback) node.addEventListener('click', callback);
    return node;
  }

  function closePanels(restoreFocus = false) {
    paletteDragging?.cancel();
    recentsVersion++;
    clearTimeout(recentsTimer);
    setRecentsBusy(false);
    for (const name of ['recents', 'bookmarks']) query('#ws-' + name).hidden = true;
    document.querySelectorAll('.ws-feature-button, #ws-edit-pins').forEach(node => node.setAttribute('aria-expanded', 'false'));
    if (palette.open) palette.close();
    if (restoreFocus) {
      const target = returnFocus?.isConnected ? returnFocus : query('#ws-edit-pins, #ws-toggle-bookmarks');
      target?.focus();
    }
  }

  function positionPanel(panel, trigger) {
    const header = query('.ws-header');
    const top = Math.max(header.getBoundingClientRect().bottom + 8, trigger?.getBoundingClientRect().bottom + 8 || 0);
    panel.style.top = top + window.scrollY + 'px';
    panel.style.maxHeight = Math.max(180, innerHeight - top - 14) + 'px';
  }

  function openPanel(name, trigger) {
    closePanels();
    if (name === 'recents' && layout === 'hybrid' && !bookmarkBarVisible) {
      bookmarkBarVisible = true;
      renderPins();
    }
    returnFocus = trigger || query('[data-open="' + name + '"]') || query('#ws-edit-pins, #ws-toggle-bookmarks');
    const dropdown = query('#tb-search-dropdown');
    if (dropdown) dropdown.hidden = true;
    if (name === 'palette') {
      query('#palette-query').value = '';
      renderPalette();
      palette.showModal();
      query('#palette-query').focus();
      return;
    }
    const panel = query('#ws-' + name);
    panel.hidden = false;
    positionPanel(panel, returnFocus);
    returnFocus?.setAttribute('aria-expanded', 'true');
    if (name === 'recents') renderRecents();
    else renderEditor();
    panel.querySelector('button')?.focus();
  }

  function updatePins(message) {
    renderPins();
    renderEditor();
    if (palette.open) renderPalette(false);
    if (message) query('#ws-live').textContent = message;
  }

  function togglePin(id) {
    const index = pins.indexOf(id);
    if (index === -1) pins.push(id);
    else pins.splice(index, 1);
    const route = routes.find(route => route.id === id);
    updatePins(route.name + (index === -1 ? ' bookmarked.' : ' removed from bookmarks.'));
    query('[data-star="' + id + '"]')?.focus();
  }

  function movePin(id, delta) {
    const from = pins.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= pins.length) return;
    pins.splice(to, 0, pins.splice(from, 1)[0]);
    updatePins('Bookmark moved to position ' + (to + 1) + '.');
    query('[data-pin-row="' + id + '"] button[data-move="' + delta + '"]')?.focus();
  }

  function renderPins() {
    const host = query('#ws-pin-strip');
    if (!host) return;
    query('#ws-toggle-bookmarks')?.remove();
    host.replaceChildren();
    const label = document.createElement('span');
    label.className = 'ws-bookmark-label';
    label.textContent = 'BOOKMARKS';
    host.append(label);
    const items = document.createElement('div');
    items.className = 'ws-pins-items';
    const limit = layout === 'hybrid' ? 5 : layout === 'shelf' ? (innerWidth < 780 ? 3 : 6) : (innerWidth < 480 ? 2 : 4);
    for (const id of pins.slice(0, limit)) {
      const route = routes.find(route => route.id === id);
      items.append(button(route.name, icon(route.icon) + '<span class="ws-pin-label">' + escape(route.short) + '</span>', 'ws-pin', () => toast('Would open ' + route.name + '.')));
    }
    if (!pins.length) items.append(button('Add bookmarks', icon('star') + '<span>Add bookmarks</span>', 'ws-feature-button', event => openPanel('palette', event.currentTarget)));
    if (pins.length > limit && layout !== 'hybrid') items.append(button('Show all ' + pins.length + ' bookmarks', '+' + (pins.length - limit), 'ws-pin-more', event => openPanel('bookmarks', event.currentTarget)));
    host.append(items);
    if (layout === 'hybrid') {
      const toggle = button('Toggle bookmarks bar', icon('star'), 'ws-icon-button ws-bookmark-toggle', () => {
        closePanels();
        bookmarkBarVisible = !bookmarkBarVisible;
        renderPins();
        query('#ws-toggle-bookmarks').focus();
      });
      toggle.id = 'ws-toggle-bookmarks';
      toggle.title = bookmarkBarVisible ? 'Hide bookmarks bar' : 'Show bookmarks bar';
      toggle.setAttribute('aria-expanded', String(bookmarkBarVisible));
      toggle.setAttribute('aria-controls', 'ws-hybrid-bookmarks');
      query('.ws-feature-tools').append(toggle);
      renderHybridBar();
      return;
    }
    const edit = button('Edit bookmarks', icon('pencil'), 'ws-icon-button', event => openPanel('bookmarks', event.currentTarget));
    edit.id = 'ws-edit-pins';
    edit.setAttribute('aria-expanded', String(!query('#ws-bookmarks').hidden));
    edit.setAttribute('aria-controls', 'ws-bookmarks');
    host.append(edit);
  }

  function renderHybridBar() {
    const shelf = query('.ws-bookmark-shelf');
    shelf.hidden = !bookmarkBarVisible;
    shelf.replaceChildren();
    const bar = document.createElement('nav');
    bar.id = 'ws-hybrid-bookmarks';
    bar.className = 'ws-pins ws-hybrid-pins';
    bar.setAttribute('aria-label', 'All bookmarks');
    const label = document.createElement('span');
    label.className = 'ws-bookmark-label';
    label.textContent = 'BOOKMARKS';
    bar.append(label);
    const items = document.createElement('div');
    items.className = 'ws-pins-items';
    for (const id of pins) {
      const route = routes.find(route => route.id === id);
      items.append(button(route.name, icon(route.icon) + '<span class="ws-pin-label">' + escape(route.short) + '</span>', 'ws-pin', () => toast('Would open ' + route.name + '.')));
    }
    if (!pins.length) items.append(button('Add bookmarks', icon('star') + '<span>Add bookmarks</span>', 'ws-feature-button', event => openPanel('palette', event.currentTarget)));
    bar.append(items);
    bar.append(recentsControl);
    shelf.append(bar);
  }

  function reorderPaletteBookmark(id, targetId) {
    const from = pins.indexOf(id);
    const to = pins.indexOf(targetId);
    if (from < 0 || to < 0 || from === to) return;
    pins.splice(to, 0, pins.splice(from, 1)[0]);
    updatePins('Bookmark moved to position ' + (to + 1) + '.');
    query('[data-palette-handle="' + id + '"]')?.focus();
  }

  function startPaletteDrag(event, row, route) {
    if (event.button !== 0 || !event.isPrimary || paletteDragging) return;
    event.preventDefault();
    const host = query('#palette-results');
    const bounds = row.getBoundingClientRect();
    const offset = {x: event.clientX - bounds.left, y: event.clientY - bounds.top};
    const visibleIds = [...host.querySelectorAll('[data-palette-handle]')].map(node => node.dataset.paletteHandle);
    const placeholder = document.createElement('div');
    placeholder.className = 'ws-palette-placeholder';
    placeholder.style.height = bounds.height + 'px';
    placeholder.setAttribute('aria-hidden', 'true');
    row.before(placeholder);
    row.hidden = true;

    // Keep the floating row inside the dialog's top layer, above its scrolling list.
    const floating = row.cloneNode(true);
    floating.hidden = false;
    floating.removeAttribute('data-palette-route');
    floating.classList.remove('is-active');
    floating.classList.add('ws-palette-floating');
    floating.setAttribute('aria-hidden', 'true');
    floating.inert = true;
    floating.style.width = bounds.width + 'px';
    floating.style.height = bounds.height + 'px';
    floating.querySelectorAll('[data-palette-handle], [data-star]').forEach(node => {
      node.removeAttribute('data-palette-handle');
      node.removeAttribute('data-star');
    });
    palette.append(floating);
    palette.classList.add('is-sorting');
    let point = {x: event.clientX, y: event.clientY};
    let frame;
    let finished = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const slideAnimations = new Map();
    const candidates = () => [...host.querySelectorAll('.ws-palette-row')].filter(node => node !== row && visibleIds.includes(node.dataset.paletteRoute));

    function stopSlides() {
      slideAnimations.forEach(animation => animation.cancel());
      slideAnimations.clear();
    }

    function slideRows(rows, previousTops) {
      if (reducedMotion.matches) return;
      for (const node of rows) {
        const previousTop = previousTops.get(node.dataset.paletteRoute);
        const distance = previousTop - node.getBoundingClientRect().top;
        if (!Number.isFinite(distance) || Math.abs(distance) < .5) continue;
        const animation = node.animate([
          {transform: 'translateY(' + distance + 'px)'},
          {transform: 'translateY(0)'}
        ], {duration: 180, easing: 'cubic-bezier(.2, .8, .2, 1)'});
        slideAnimations.set(node, animation);
        animation.onfinish = () => {
          if (slideAnimations.get(node) === animation) slideAnimations.delete(node);
        };
      }
    }

    function position() {
      floating.style.left = point.x - offset.x + 'px';
      floating.style.top = point.y - offset.y + 'px';
      const listBounds = host.getBoundingClientRect();
      if (point.x < listBounds.left || point.x > listBounds.right) return;
      const rows = candidates();
      const next = rows.find(node => {
        const rect = node.getBoundingClientRect();
        // Hit-test settled layout positions so sliding rows cannot move the target.
        const transform = getComputedStyle(node).transform;
        const shift = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42;
        return point.y < rect.top - shift + rect.height / 2;
      });
      const targetIndex = next ? rows.indexOf(next) : rows.length;
      const currentIndex = rows.filter(node => node.compareDocumentPosition(placeholder) & Node.DOCUMENT_POSITION_FOLLOWING).length;
      if (targetIndex === currentIndex) return;
      // FLIP from each row's current visual position, including an interrupted slide.
      const previousTops = new Map(rows.map(node => [node.dataset.paletteRoute, node.getBoundingClientRect().top]));
      stopSlides();
      if (next) next.before(placeholder);
      else if (rows.length) rows[rows.length - 1].after(placeholder);
      slideRows(rows, previousTops);
    }

    function tick() {
      const rect = host.getBoundingClientRect();
      if (point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom) {
        const speed = point.y < rect.top + 38 ? -7 : point.y > rect.bottom - 38 ? 7 : 0;
        if (speed) host.scrollTop += speed;
      }
      position();
      frame = requestAnimationFrame(tick);
    }

    function move(moveEvent) {
      if (moveEvent.pointerId !== event.pointerId) return;
      moveEvent.preventDefault();
      point = {x: moveEvent.clientX, y: moveEvent.clientY};
      position();
    }

    function finish(commit) {
      if (finished) return;
      finished = true;
      paletteDragging = null;
      cancelAnimationFrame(frame);
      const previousTops = new Map(candidates().map(node => [node.dataset.paletteRoute, node.getBoundingClientRect().top]));
      stopSlides();
      palette.removeEventListener('pointermove', move);
      palette.removeEventListener('pointerup', release);
      palette.removeEventListener('pointercancel', cancel);
      palette.removeEventListener('lostpointercapture', cancel);
      window.removeEventListener('blur', cancel);
      if (palette.hasPointerCapture(event.pointerId)) palette.releasePointerCapture(event.pointerId);
      if (commit) {
        const order = [...host.children].flatMap(node => node === placeholder ? [route.id] : node !== row && visibleIds.includes(node.dataset.paletteRoute) ? [node.dataset.paletteRoute] : []);
        // When searching, reorder matching bookmarks while retaining hidden bookmarks' slots.
        let index = 0;
        pins = pins.map(id => visibleIds.includes(id) ? order[index++] : id);
      }
      row.hidden = false;
      placeholder.remove();
      floating.remove();
      palette.classList.remove('is-sorting');
      updatePins(commit ? 'Bookmark order updated.' : 'Bookmark move cancelled.');
      slideRows([...host.querySelectorAll('.ws-palette-row')], previousTops);
      query('[data-palette-handle="' + route.id + '"]')?.focus();
    }

    function release(upEvent) {
      if (upEvent.pointerId !== event.pointerId) return;
      const rect = host.getBoundingClientRect();
      finish(upEvent.clientX >= rect.left && upEvent.clientX <= rect.right && upEvent.clientY >= rect.top && upEvent.clientY <= rect.bottom);
    }
    function cancel() { finish(false); }
    paletteDragging = {cancel};
    palette.addEventListener('pointermove', move);
    palette.addEventListener('pointerup', release);
    palette.addEventListener('pointercancel', cancel);
    palette.addEventListener('lostpointercapture', cancel);
    window.addEventListener('blur', cancel);
    palette.setPointerCapture(event.pointerId);
    query('#ws-live').textContent = 'Moving ' + route.name + '. Escape cancels.';
    position();
    frame = requestAnimationFrame(tick);
  }

  function addPaletteDragHandle(row, route) {
    const handle = button('Reorder ' + route.name, icon('grip-vertical'), 'ws-icon-button ws-palette-drag');
    handle.title = 'Drag to reorder. Alt + Up or Down also moves this bookmark.';
    handle.dataset.paletteHandle = route.id;
    handle.draggable = false;
    handle.setAttribute('aria-keyshortcuts', 'Alt+ArrowUp Alt+ArrowDown');
    handle.addEventListener('keydown', event => {
      if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      const target = pins[pins.indexOf(route.id) + (event.key === 'ArrowUp' ? -1 : 1)];
      if (target) reorderPaletteBookmark(route.id, target);
    });
    handle.addEventListener('pointerdown', event => startPaletteDrag(event, row, route));
    handle.addEventListener('dragstart', event => event.preventDefault());
    row.append(handle);
  }

  function renderEditor() {
    const host = query('#bookmark-editor');
    host.replaceChildren();
    if (!pins.length) {
      host.innerHTML = '<div class="ws-empty"><strong>A place for your favourites.</strong>Open the palette and star the pages you use most.</div>';
      return;
    }
    pins.forEach((id, index) => {
      const route = routes.find(route => route.id === id);
      const row = document.createElement('div');
      row.className = 'ws-bookmark-editor-row';
      row.dataset.pinRow = id;
      row.draggable = true;
      row.innerHTML = icon('grip-vertical') + '<span>' + escape(route.name) + '</span>';
      for (const delta of [-1, 1]) {
        const move = button('Move ' + route.name + (delta < 0 ? ' up' : ' down'), icon(delta < 0 ? 'arrow-up' : 'arrow-down'), 'ws-icon-button', () => movePin(id, delta));
        move.disabled = index + delta < 0 || index + delta >= pins.length;
        move.dataset.move = delta;
        row.append(move);
      }
      row.append(button('Remove ' + route.name, icon('x'), 'ws-icon-button', () => {
        pins.splice(pins.indexOf(id), 1);
        updatePins(route.name + ' removed.');
        const rows = host.querySelectorAll('.ws-bookmark-editor-row');
        rows[Math.min(index, rows.length - 1)]?.querySelector('button:not(:disabled)')?.focus();
        if (!rows.length) query('#add-bookmark').focus();
      }));
      row.addEventListener('keydown', event => {
        if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
          event.preventDefault();
          movePin(id, event.key === 'ArrowUp' ? -1 : 1);
        }
      });
      row.addEventListener('dragstart', event => {
        dragging = id;
        event.dataTransfer.setData('text/plain', id);
        event.dataTransfer.effectAllowed = 'move';
      });
      row.addEventListener('dragover', event => { event.preventDefault(); row.classList.add('is-drop-target'); });
      row.addEventListener('dragleave', () => row.classList.remove('is-drop-target'));
      row.addEventListener('drop', event => {
        event.preventDefault();
        if (dragging && dragging !== id && pins.includes(dragging)) {
          const from = pins.indexOf(dragging);
          const to = pins.indexOf(id);
          pins.splice(to, 0, pins.splice(from, 1)[0]);
          updatePins('Bookmarks reordered.');
        }
        dragging = null;
        row.classList.remove('is-drop-target');
      });
      row.addEventListener('dragend', () => {
        dragging = null;
        host.querySelectorAll('.is-drop-target').forEach(node => node.classList.remove('is-drop-target'));
      });
      host.append(row);
    });
  }

  function renderPalette(reset = true) {
    paletteDragging?.cancel();
    const term = query('#palette-query').value.trim();
    results = term ? (fuzzy ? fuzzy.search(term).map(match => match.item) : routes.filter(route => (route.name + route.tags).toLowerCase().includes(term.toLowerCase()))) : routes;
    if (layout === 'hybrid') {
      const matched = new Map(results.map(route => [route.id, route]));
      results = [...pins.filter(id => matched.has(id)).map(id => matched.get(id)), ...results.filter(route => !pins.includes(route.id))];
    }
    if (reset) activeResult = 0;
    activeResult = Math.max(0, Math.min(activeResult, results.length - 1));
    query('#palette-result-label').textContent = term ? results.length + ' destination' + (results.length === 1 ? '' : 's') : 'All destinations';
    const host = query('#palette-results');
    const scroll = host.scrollTop;
    host.replaceChildren();
    if (!results.length) {
      host.innerHTML = '<div class="ws-empty"><strong>No destinations found</strong>Try “IQA”, “content”, “events” or “members”.</div>';
      return;
    }
    results.forEach((route, index) => {
      const pinned = pins.includes(route.id);
      if (layout === 'hybrid' && (index === 0 || pinned !== pins.includes(results[index - 1].id))) {
        const heading = document.createElement('div');
        heading.className = 'ws-palette-group' + (index ? ' ws-palette-divider' : '');
        heading.textContent = pinned ? 'Bookmarks' : 'Other destinations';
        host.append(heading);
      }
      const row = document.createElement('div');
      row.className = 'ws-palette-row' + (index === activeResult ? ' is-active' : '');
      row.dataset.paletteRoute = route.id;
      if (layout === 'hybrid' && pinned) addPaletteDragHandle(row, route);
      const go = button('Open ' + route.name, icon(route.icon) + '<span>' + escape(route.name) + '<small>' + escape(route.category) + '</small></span>', 'ws-destination', () => {
        closePanels(true);
        toast('Would open ' + route.name + '.');
      });
      go.addEventListener('focus', () => {
        activeResult = index;
        host.querySelectorAll('.ws-palette-row').forEach((node, n) => node.classList.toggle('is-active', n === index));
      });
      const star = button((pinned ? 'Unpin ' : 'Pin ') + route.name, icon(pinned ? 'star-filled' : 'star'), 'ws-icon-button ws-star', () => togglePin(route.id));
      star.dataset.star = route.id;
      star.setAttribute('aria-pressed', String(pinned));
      row.append(go, star);
      host.append(row);
    });
    host.scrollTop = reset ? 0 : scroll;
  }

  function setRecentsBusy(busy) {
    const control = query('#refresh-recents');
    control.disabled = busy;
    control.setAttribute('aria-busy', String(busy));
    control.querySelector('.us-button-spinner').hidden = !busy;
    control.querySelector('.ti').hidden = busy;
    query('#recents-results').setAttribute('aria-busy', String(busy));
  }

  function renderRecents() {
    const host = query('#recents-results');
    host.replaceChildren();
    const people = ['You', 'Alex Morgan', 'You', 'Sam Lee', 'You', 'Priya Shah', 'Alex Morgan', 'You', 'Sam Lee', 'You'];
    const times = ['12m ago', '38m ago', '1h ago', '2h ago', '3h ago', 'Yesterday', 'Yesterday', '2 days ago', '2 days ago', '3 days ago'];
    let count = 0;
    for (const [type, names] of Object.entries(recentData)) {
      const items = names.map((name, index) => ({name, person:people[index], time:times[index]})).filter(item => scope !== 'mine' || item.person === 'You');
      count += items.length;
      const column = document.createElement('section');
      column.className = 'ws-recents-column';
      column.innerHTML = '<h3>' + icon(type === 'iqa' ? 'file-search' : 'layout') + (type === 'iqa' ? 'IQAs' : 'Content') + ' <span>· ' + items.length + '</span></h3>';
      const list = document.createElement('div');
      list.className = 'ws-recents-list';
      for (const item of items) {
        list.append(button('Open ' + item.name, '<span>' + escape(item.name) + '<small>' + item.person + ' · ' + item.time + '</small></span>' + icon('arrow-up-right'), 'ws-recent-item', () => {
          closePanels(true);
          toast('Would open ' + item.name + ' in the ' + (type === 'iqa' ? 'IQA' : 'content') + ' editor.');
        }));
      }
      column.append(list);
      host.append(column);
    }
    query('#recents-count').textContent = scope === 'mine' ? count + ' modified by you' : 'Last 10 of each type';
  }

  function applyLayout(value) {
    layout = value;
    document.body.dataset.layout = value;
    closePanels();
    const strip = query('#ws-pin-strip');
    if (!strip) return;
    const shelf = query('.ws-bookmark-shelf');
    // Preserve the same Recents control and listeners when its shelf is rebuilt.
    query('.ws-feature-tools').append(recentsControl);
    // Move the shared strip out before replacing a previous hybrid shelf.
    query('#injected-taskbar').insertBefore(strip, query('.ws-feature-tools'));
    shelf.replaceChildren();
    shelf.hidden = value !== 'shelf';
    if (value === 'shelf') shelf.append(strip);
    else query('#injected-taskbar').insertBefore(strip, query('.ws-feature-tools'));
    renderPins();
  }

  function start() {
    if (proposed) {
      const bar = query('#injected-taskbar');
      const quickLinks = query('.us-taskbar__quick-links');
      if (!bar || !quickLinks) return;
      const strip = document.createElement('nav');
      strip.className = 'ws-pins';
      strip.id = 'ws-pin-strip';
      strip.setAttribute('aria-label', 'Your bookmarked destinations');
      quickLinks.replaceWith(strip);
      const tools = document.createElement('div');
      tools.className = 'ws-feature-tools';
      for (const [name, glyph, text] of [['palette', 'command', 'Go to…'], ['recents', 'history', 'Recents']]) {
        const control = button(name === 'palette' ? 'Open command palette' : 'Open Recents', icon(glyph) + '<span>' + text + '</span>', 'ws-feature-button', event => {
          if (name !== 'palette' && !query('#ws-' + name).hidden) closePanels(true);
          else openPanel(name, event.currentTarget);
        });
        control.dataset.open = name;
        if (name === 'recents') recentsControl = control;
        control.setAttribute('aria-haspopup', 'dialog');
        control.setAttribute('aria-expanded', 'false');
        control.setAttribute('aria-controls', 'ws-' + name);
        if (name === 'palette') control.setAttribute('aria-keyshortcuts', 'Control+Space');
        tools.append(control);
      }
      strip.after(tools);
      renderPins();
    }
    notifyParent({ready:true});
    if (!proposed) {
      const resize = () => {
        const dropdown = query('#tb-search-dropdown');
        notifyParent({height: dropdown && !dropdown.hidden ? 485 : (innerWidth < 780 ? 185 : 130)});
      };
      new MutationObserver(resize).observe(query('#hd'), {childList:true, subtree:true, attributes:true, attributeFilter:['hidden']});
      window.addEventListener('resize', resize);
      resize();
    }
  }

  query('#palette-query').addEventListener('input', () => renderPalette());
  palette.addEventListener('cancel', event => { event.preventDefault(); closePanels(true); });
  palette.addEventListener('click', event => { if (event.target === palette) { const box = palette.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closePanels(true); } });
  palette.addEventListener('keydown', event => {
    if (paletteDragging && event.key !== 'Escape') {
      event.preventDefault();
      return;
    }
    if (['ArrowDown', 'ArrowUp'].includes(event.key) && results.length) {
      event.preventDefault();
      activeResult = (activeResult + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
      const row = query('#palette-results').querySelectorAll('.ws-palette-row')[activeResult];
      row.querySelector('.ws-destination').focus();
      row.scrollIntoView({block:'nearest'});
    } else if (event.key === 'Enter' && event.target === query('#palette-query') && results.length) {
      event.preventDefault();
      query('#palette-results').querySelectorAll('.ws-palette-row')[activeResult].querySelector('.ws-destination').click();
    }
  });
  document.querySelectorAll('[data-close]').forEach(node => node.addEventListener('click', () => closePanels(true)));
  query('#add-bookmark').addEventListener('click', () => openPanel('palette', query('#ws-edit-pins, #ws-toggle-bookmarks')));
  query('#done-bookmarks').addEventListener('click', () => { closePanels(true); toast('Bookmark order updated for this preview.'); });
  document.querySelectorAll('[data-scope]').forEach(node => node.addEventListener('click', () => {
    scope = node.dataset.scope;
    document.querySelectorAll('[data-scope]').forEach(button => button.setAttribute('aria-pressed', String(button === node)));
    renderRecents();
  }));
  query('#refresh-recents').addEventListener('click', () => {
    const version = ++recentsVersion;
    setRecentsBusy(true);
    query('#recents-count').textContent = 'Refreshing…';
    recentsTimer = setTimeout(() => {
      setRecentsBusy(false);
      if (version !== recentsVersion) return;
      renderRecents();
      query('#ws-live').textContent = 'Recent items refreshed.';
    }, 450);
  });
  document.addEventListener('click', event => {
    // Rendered rows can be replaced before their click reaches document.
    const inside = event.composedPath().some(node => node instanceof Element && node.matches('.ws-popover, .ws-feature-button, .ws-pins, .ws-palette'));
    if (!inside) closePanels();
  });
  document.addEventListener('keydown', event => {
    if (!proposed) return;
    if (event.ctrlKey && event.code === 'Space' && !event.altKey && !event.shiftKey && !event.metaKey && !event.repeat) {
      event.preventDefault();
      if (palette.open) closePanels(true);
      else openPanel('palette', query('[data-open="palette"]'));
    } else if (event.key === 'Escape') closePanels(true);
  });
  window.addEventListener('resize', () => {
    if (proposed) renderPins();
    for (const panel of document.querySelectorAll('.ws-popover:not([hidden])')) positionPanel(panel, returnFocus);
  });
  window.addEventListener('message', event => {
    if (event.source !== parent || !event.data?.workshop) return;
    const message = event.data;
    if (message.scheme && message.scheme !== window.UnionSuiteAppearance.getState().scheme) window.UnionSuiteAppearance.setPreference(message.scheme);
    if (!proposed) return;
    if (message.layout) applyLayout(message.layout);
    if (message.pins) {
      pins = message.pins === 'empty' ? [] : message.pins === 'many' ? routes.slice(0, 9).map(route => route.id) : [...samples];
      closePanels();
      updatePins();
    }
    if (message.open) openPanel(message.open);
    if (message.reset) {
      closePanels();
      pins = [...samples];
      bookmarkBarVisible = false;
      scope = 'mine';
      document.querySelectorAll('[data-scope]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.scope === scope)));
      updatePins();
    }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
