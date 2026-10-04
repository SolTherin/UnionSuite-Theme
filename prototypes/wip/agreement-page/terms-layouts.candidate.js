/* US-TERM-GROUPS (candidate; terms-compare.html options 5 and 6) — group
   headings for us-terms--by-status and us-terms--by-category. The IQA sorts
   by the grouped field, so each run of rows with the same status or category
   gets one heading with a count. A blank category gathers under
   "Uncategorised". Counts follow the theme's search, and a heading hides when
   search hides every row under it. Headings are not sections, so the theme's
   search and result counts ignore them. */
(function () {
  'use strict';
  if (window.UnionSuiteTermGroups) return;

  const modes = {
    'us-terms--by-status': row => ({
      name: row.querySelector('.us-term__status')?.textContent.trim() || 'No status',
      status: row.getAttribute('data-us-term-status') || ''
    }),
    'us-terms--by-category': row => ({
      name: (row.getAttribute('data-us-term-category') || '').trim() || 'Uncategorised',
      status: null
    })
  };

  function modeOf(set) {
    const wrapper = set.closest('.us-terms');
    const mode = wrapper && Object.keys(modes).find(name => wrapper.classList.contains(name));
    return mode ? modes[mode] : null;
  }

  function build(set) {
    const groupOf = modeOf(set);
    const existing = [...set.querySelectorAll(':scope > .us-term-group')];
    if (!groupOf) {
      existing.forEach(heading => heading.remove());
      return;
    }

    const runs = [];
    [...set.children].filter(child => child.localName === 'section').forEach(section => {
      const row = section.querySelector('.us-term');
      if (!row) return;
      const group = groupOf(row);
      const last = runs[runs.length - 1];
      if (last && last.name === group.name) last.sections.push(section);
      else runs.push({...group, sections: [section]});
    });

    // Rebuild only when the grouping changed: headings in place, same names.
    const placed = existing.length === runs.length && runs.every((run, index) =>
      existing[index].getAttribute('data-us-term-group') === run.name &&
      existing[index].nextElementSibling === run.sections[0]);
    if (!placed) {
      existing.forEach(heading => heading.remove());
      runs.forEach(run => {
        const heading = document.createElement('h3');
        heading.className = 'us-term-group';
        heading.setAttribute('data-us-term-group', run.name);
        if (run.status !== null) heading.setAttribute('data-us-term-status', run.status);
        const name = document.createElement('span');
        name.textContent = run.name;
        const count = document.createElement('span');
        count.className = 'us-term-group__count';
        heading.append(name, count);
        run.sections[0].before(heading);
      });
    }

    const headings = [...set.querySelectorAll(':scope > .us-term-group')];
    runs.forEach((run, index) => {
      const shown = run.sections.filter(section => !section.hidden && !section.hasAttribute('data-us-query-search-hidden')).length;
      const count = headings[index].querySelector('.us-term-group__count');
      if (count.textContent !== String(shown)) count.textContent = String(shown);
      if (headings[index].hidden !== !shown) headings[index].hidden = !shown;
    });
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      document.querySelectorAll('.us-terms .QueryTemplateSet').forEach(set => {
        if (!set.closest('.us-report-no-styling')) build(set);
      });
    });
  }

  new MutationObserver(records => {
    if (records.some(record => (record.type === 'childList' &&
        [...record.addedNodes, ...record.removedNodes].some(node => node.localName === 'section')) ||
        record.attributeName === 'data-us-query-search-hidden' ||
        (record.attributeName === 'hidden' && record.target.localName === 'section') ||
        (record.attributeName === 'class' && record.target.classList.contains('us-terms')))) schedule();
  }).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-us-query-search-hidden', 'hidden', 'class']
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();

  window.UnionSuiteTermGroups = Object.freeze({refresh: schedule, version: '0.1-candidate'});
})();

/* US-TERM-EXPAND (candidate; terms-compare.html option 7) — open and close
   us-terms--expand rows with a slide (owner, 4 October 2026: transitions
   theme-wide), and close an open row from a click anywhere on it, not only
   its first line, as an activity history card does.
   A native <details> shows and hides its content at once, so the summary's
   click is taken over: opening sets the row open with the details hidden,
   then slides them in; closing slides them out, then closes the row. The
   slide is the theme's fold() (US-RECORD-CARDS): height and fade, reversing
   from where it is when clicked again mid-way, instant under reduced
   motion. Without the theme script the rows open and close at once.
   Buttons, links and form fields keep their own clicks; a click that ends a
   text selection leaves the row open, so the description can be copied. */
(function () {
  'use strict';
  if (window.UnionSuiteTermExpand) return;

  const runs = new WeakMap();

  // Open, and not on its way closed.
  function isOpen(term) {
    return term.open && !term.classList.contains('is-closing');
  }

  function setOpen(term, open) {
    const detail = term.querySelector(':scope > .us-term__detail');
    const fold = window.UnionSuiteRecordCards?.fold;
    const run = (runs.get(term) || 0) + 1;
    runs.set(term, run);
    if (!detail || !fold) {
      term.open = open;
      return;
    }
    if (open) {
      term.classList.remove('is-closing');
      if (!term.open) {
        detail.hidden = true;
        term.open = true;
      }
      fold(detail, true);
    } else {
      // The chevron turns back now; the row closes when the slide ends,
      // unless another click has come since.
      term.classList.add('is-closing');
      fold(detail, false).then(() => {
        if (runs.get(term) !== run) return;
        term.open = false;
        detail.hidden = false;
        term.classList.remove('is-closing');
      });
    }
  }

  document.addEventListener('click', event => {
    const term = event.target.closest('.us-terms--expand .us-term--expand');
    if (!term) return;
    const summary = event.target.closest('summary');
    if (summary && summary.parentElement === term) {
      // A control on the first line, such as the status icon, has its own click.
      if (event.target.closest('button, a, input, select, textarea')) return;
      event.preventDefault();
      setOpen(term, !isOpen(term));
      return;
    }
    if (!isOpen(term) || event.target.closest('a, button, input, select, textarea, label')) return;
    if (String(window.getSelection?.() || '').trim()) return;
    setOpen(term, false);
  });

  window.UnionSuiteTermExpand = Object.freeze({open: term => setOpen(term, true), close: term => setOpen(term, false), version: '0.2-candidate'});
})();

/* US-TERM-STATUS (candidate; terms-compare.html option 7) — change a term's
   status from its icon (owner, 4 October 2026). The icon button opens a
   small menu of the statuses, each with its icon, the current one ticked;
   arrow keys, Home and End move, Enter or Space picks, Escape and Tab close.
   A pick shows at once (icon, colour, label, filter counts); a change to
   Included plays the theme's completion confetti
   (UnionSuiteTaskRows.celebrate, as a completed milestone does). The save
   is a hook, UnionSuiteTermStatus.defineSaver(fn), with fn receiving
   {ordinal, status, label, term} and returning a promise. Terms have no
   status endpoint yet, so with no saver the change reverts and the row says
   "Not saved", as a failed save does. */
(function () {
  'use strict';
  if (window.UnionSuiteTermStatus) return;

  const STATUSES = [
    {status: 'negotiating', label: 'Negotiating'},
    {status: 'included', label: 'Included'},
    {status: 'not-included', label: 'Not Included'}
  ];
  const reducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  let saver = null;
  let menu = null;
  let owner = null;

  function statusOf(term) {
    return (term.getAttribute('data-us-term-status') || '').trim().toLowerCase();
  }

  // The icon, the label and the filter all read the row's status.
  function show(term, status, label) {
    term.setAttribute('data-us-term-status', status);
    const badge = term.querySelector('.us-term__status');
    if (badge) {
      badge.setAttribute('data-us-term-status', status);
      badge.textContent = label;
    }
    const button = term.querySelector('.us-term__status-button');
    if (button) button.setAttribute('aria-label', 'Status: ' + label + '. Change status');
  }

  function reportFailure(term) {
    const meta = term.querySelector('.us-term__meta');
    if (!meta) return;
    meta.querySelectorAll('.us-term__error').forEach(node => node.remove());
    const message = document.createElement('span');
    message.className = 'us-term__error';
    message.setAttribute('role', 'status');
    message.textContent = 'Not saved. Try again.';
    meta.append(message);
    setTimeout(() => message.remove(), 6000);
  }

  async function change(term, next) {
    const previous = statusOf(term);
    const previousLabel = term.querySelector('.us-term__status')?.textContent.trim() || '';
    const item = STATUSES.find(entry => entry.status === next);
    if (!item || next === previous || term.getAttribute('aria-busy') === 'true') return;
    const ordinal = (term.getAttribute('data-us-term-ordinal') || '').trim();
    term.setAttribute('aria-busy', 'true');
    // Optimistic, as tasks and milestones are: the effect plays while the
    // save is in flight.
    show(term, next, item.label);
    const button = term.querySelector('.us-term__status-button');
    const celebration = next === 'included' && button ? window.UnionSuiteTaskRows?.celebrate?.(button) : null;
    let saved = true;
    try {
      if (!saver) throw new Error('No term status saver is defined (UnionSuiteTermStatus.defineSaver).');
      if (!/^\d+$/.test(ordinal)) throw new Error('The term has no ordinal.');
      await saver({ordinal, status: next, label: item.label, term});
    } catch (error) {
      saved = false;
      console.warn(error.message);
    }
    await celebration;
    term.removeAttribute('aria-busy');
    if (!saved) {
      show(term, previous, previousLabel);
      reportFailure(term);
    }
    // Counts and the status filter follow once the effect has played, so a
    // filtered row does not vanish under its own confetti.
    window.UnionSuiteTermFacets?.refresh();
  }

  function buildMenu() {
    const node = document.createElement('div');
    node.className = 'us-term-status-menu';
    node.setAttribute('role', 'menu');
    node.setAttribute('aria-label', 'Term status');
    node.hidden = true;
    STATUSES.forEach(entry => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'us-term-status-menu__item';
      item.setAttribute('role', 'menuitemradio');
      item.setAttribute('data-us-term-status', entry.status);
      item.setAttribute('tabindex', '-1');
      item.append(document.createTextNode(entry.label));
      node.append(item);
    });
    node.addEventListener('click', event => {
      const item = event.target.closest('.us-term-status-menu__item');
      if (!item || !owner) return;
      const term = owner.closest('.us-term');
      close(true);
      void change(term, item.getAttribute('data-us-term-status'));
    });
    node.addEventListener('keydown', onMenuKey);
    document.body.append(node);
    return node;
  }

  function items() {
    return [...menu.querySelectorAll('.us-term-status-menu__item')];
  }

  // Under the icon, or above it when the window has no room below.
  function place(button) {
    const rect = button.getBoundingClientRect();
    const height = menu.offsetHeight;
    const below = rect.bottom + 4;
    const top = below + height > window.innerHeight - 8 ? Math.max(8, rect.top - 4 - height) : below;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - menu.offsetWidth - 8);
    menu.style.top = top + 'px';
    menu.style.left = left + 'px';
  }

  function open(button) {
    menu ||= buildMenu();
    if (owner === button) { close(true); return; }
    if (owner) close(false);
    owner = button;
    const current = statusOf(button.closest('.us-term'));
    items().forEach(item => item.setAttribute('aria-checked', String(item.getAttribute('data-us-term-status') === current)));
    menu.hidden = false;
    place(button);
    button.setAttribute('aria-expanded', 'true');
    if (!reducedMotion() && menu.animate) {
      menu.animate([{opacity: 0, transform: 'translateY(-4px)'}, {opacity: 1, transform: 'none'}], {duration: 140, easing: 'cubic-bezier(.2, 0, 0, 1)'});
    }
    (items().find(item => item.getAttribute('aria-checked') === 'true') || items()[0]).focus({preventScroll: true});
  }

  function close(returnFocus) {
    if (!menu || !owner) return;
    const button = owner;
    owner = null;
    button.setAttribute('aria-expanded', 'false');
    if (returnFocus) button.focus({preventScroll: true});
    if (reducedMotion() || !menu.animate) {
      menu.hidden = true;
      return;
    }
    menu.animate([{opacity: 1}, {opacity: 0}], {duration: 100, easing: 'ease-out'}).finished.then(() => {
      if (!owner) menu.hidden = true;
    }, () => {});
  }

  function onMenuKey(event) {
    const list = items();
    const index = list.indexOf(document.activeElement);
    const moves = {ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: list.length - 1};
    if (event.key in moves) {
      event.preventDefault();
      list[(moves[event.key] + list.length) % list.length].focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'Tab') {
      close(false);
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('.us-terms--expand .us-term__status-button');
    if (!button) return;
    // The icon sits on the row's first line; it changes the status, and
    // leaves the row open or closed as it was.
    event.preventDefault();
    if (button.closest('.us-term')?.getAttribute('aria-busy') === 'true') return;
    open(button);
  });

  // A press anywhere else, a scroll or a resize closes the menu.
  document.addEventListener('pointerdown', event => {
    if (owner && !menu.contains(event.target) && event.target !== owner) close(false);
  }, true);
  addEventListener('scroll', event => { if (owner && !menu.contains(event.target)) close(false); }, true);
  addEventListener('resize', () => close(false));

  window.UnionSuiteTermStatus = Object.freeze({
    defineSaver: fn => { saver = typeof fn === 'function' ? fn : null; },
    version: '0.1-candidate'
  });
})();

/* US-TERM-FACETS (candidate) — status quick filters for us-terms, as the
   agreement contacts' group chips (US-CONTACT-FACETS in its group-filter
   placement; owner, 4 October 2026): one chip per status in the list, with
   a count, inside the theme's filter disclosure; the count beside the panel
   title, with a clear; a dot on the funnel while a chip is pressed. Reads
   data-us-term-status (StatusClass) and the badge text (StatusLabel) from
   each row. Chips exist when the list has two or more statuses. A row the
   chip excludes gets the hidden attribute, which the theme's search and
   US-TERM-GROUPS treat as off the page. The chips use the contact facet
   classes so they match; promotion should give those classes a shared name. */
(function () {
  'use strict';
  if (window.UnionSuiteTermFacets) return;

  const ORDER = ['negotiating', 'included', 'not-included'];
  const states = new WeakMap();

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function wrapperOf(set) {
    return set.closest('.us-terms');
  }

  function rowsOf(set) {
    return [...set.children]
      .filter(child => child.localName === 'section')
      .map(section => ({section, row: section.querySelector('.us-term')}))
      .filter(entry => entry.row)
      .map(entry => ({
        section: entry.section,
        status: (entry.row.getAttribute('data-us-term-status') || '').trim().toLowerCase(),
        label: (entry.row.querySelector('.us-term__status')?.textContent || '').trim() || 'No status'
      }));
  }

  // The statuses present, in bargaining order, then anything else by name.
  function statuses(rows) {
    const labels = new Map();
    rows.forEach(row => { if (!labels.has(row.status)) labels.set(row.status, row.label); });
    const rank = status => { const index = ORDER.indexOf(status); return index < 0 ? ORDER.length : index; };
    return [...labels.keys()]
      .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
      .map(status => ({status, label: labels.get(status)}));
  }

  function chip(item) {
    const button = el('button', 'us-contact-chip');
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('data-us-contact-facet-value', item.status);
    button.append(el('span', '', item.label), el('span', 'us-contact-chip__count', ''));
    return button;
  }

  function buildStrip() {
    const strip = el('div', 'us-contact-facets us-contact-facets--filter');
    const row = el('div', 'us-contact-facets__row');
    row.setAttribute('data-us-contact-facet', 'status');
    row.append(el('span', 'us-contact-facets__label', 'Status'), el('div', 'us-contact-facets__chips'));
    strip.append(row);
    return strip;
  }

  // Beside the panel title: the count, the pressed status and a clear.
  function buildHeadingCount() {
    const node = el('span', 'us-contact-facets__heading-count');
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-atomic', 'true');
    const clear = el('button', 'us-contact-facets__clear us-contact-facets__clear--icon');
    clear.type = 'button';
    clear.hidden = true;
    clear.setAttribute('aria-label', 'Clear the term filters');
    clear.title = 'Clear the term filters';
    const icon = el('i', 'ti ti-x');
    icon.setAttribute('aria-hidden', 'true');
    clear.append(icon);
    node.append(el('span', 'us-contact-facets__count', ''), clear);
    return node;
  }

  function onClick(set, event) {
    const state = states.get(set);
    const target = event.target.closest('button');
    if (!state || !target) return;
    if (target.classList.contains('us-contact-facets__clear')) {
      state.filter = null;
      // The clear also empties the text search, as on the contacts panel.
      const input = wrapperOf(set)?.querySelector(':scope > .panel > .us-query-search-controls input');
      if (input && input.value) {
        input.value = '';
        input.dispatchEvent(new Event('input', {bubbles: true}));
      }
    } else if (target.classList.contains('us-contact-chip')) {
      if (target.getAttribute('aria-disabled') === 'true') return;
      const value = target.getAttribute('data-us-contact-facet-value');
      state.filter = state.filter === value ? null : value;
    } else {
      return;
    }
    apply(set);
  }

  // Chips are rebuilt only when the statuses change; counts and pressed
  // state update in place, so focus stays on the chip just pressed.
  function syncChips(container, items) {
    const current = [...container.querySelectorAll('.us-contact-chip')];
    const same = current.length === items.length &&
      current.every((node, index) => node.getAttribute('data-us-contact-facet-value') === items[index].status);
    if (!same) container.replaceChildren(...items.map(chip));
  }

  // The chips live in the theme's filter disclosure; a panel without the
  // search gets them above the results instead.
  function mount(state, set) {
    const wrapper = wrapperOf(set);
    const controls = wrapper.querySelector(':scope > .panel > .us-query-search-controls');
    if (controls) {
      if (controls.firstElementChild !== state.strip) controls.prepend(state.strip);
    } else if (!wrapper.classList.contains('us-query-search')) {
      if (state.strip.nextElementSibling !== set || state.strip.parentElement !== set.parentElement) set.before(state.strip);
    } else {
      state.strip.remove();
    }
  }

  function mountHeadingCount(state, set) {
    const title = wrapperOf(set).querySelector(':scope > .panel > .panel-heading > .panel-title');
    if (!title) { state.headingCount.remove(); return; }
    if (title.nextElementSibling !== state.headingCount) title.after(state.headingCount);
  }

  function apply(set) {
    const state = states.get(set);
    const wrapper = wrapperOf(set);
    if (!state || !wrapper) return;
    const rows = rowsOf(set);
    const total = rows.length;
    const items = statuses(rows);
    const noun = total === 1 ? 'term' : 'terms';
    mountHeadingCount(state, set);
    const count = state.headingCount.querySelector('.us-contact-facets__count');
    const clear = state.headingCount.querySelector('.us-contact-facets__clear');

    // One status, or none: nothing to filter by.
    if (items.length < 2) {
      rows.forEach(row => { if (row.section.hidden) row.section.hidden = false; });
      state.filter = null;
      state.strip.remove();
      wrapper.removeAttribute('data-us-term-facet-active');
      count.replaceChildren(total + ' ' + noun);
      clear.hidden = true;
      refreshGroups();
      return;
    }
    mount(state, set);
    if (state.filter && !items.some(item => item.status === state.filter)) state.filter = null;

    const chips = state.strip.querySelector('.us-contact-facets__chips');
    syncChips(chips, items);
    chips.querySelectorAll('.us-contact-chip').forEach(node => {
      const value = node.getAttribute('data-us-contact-facet-value');
      const matching = rows.filter(row => row.status === value).length;
      node.querySelector('.us-contact-chip__count').textContent = String(matching);
      node.setAttribute('aria-pressed', String(state.filter === value));
    });

    // Rows, then the count, which follows the theme's text search too.
    let shown = 0, searching = false;
    rows.forEach(row => {
      const match = !state.filter || row.status === state.filter;
      const searchHidden = row.section.hasAttribute('data-us-query-search-hidden');
      if (searchHidden) searching = true;
      if (match && !searchHidden) shown++;
      if (row.section.hidden !== !match) row.section.hidden = !match;
    });
    const filtered = !!state.filter || searching;
    count.replaceChildren(filtered ? shown + ' of ' + total + ' ' + noun : total + ' ' + noun);
    if (state.filter) count.append(' · ', el('span', 'us-contact-facets__token', items.find(item => item.status === state.filter).label));
    clear.hidden = !filtered;
    wrapper.toggleAttribute('data-us-term-facet-active', !!state.filter);
    refreshGroups();
  }

  function refreshGroups() {
    window.UnionSuiteTermGroups?.refresh();
  }

  function stateFor(set) {
    let state = states.get(set);
    if (!state) {
      state = {filter: null, strip: buildStrip(), headingCount: buildHeadingCount()};
      state.strip.addEventListener('click', event => onClick(set, event));
      state.headingCount.addEventListener('click', event => onClick(set, event));
      states.set(set, state);
    }
    return state;
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      document.querySelectorAll('.us-terms .QueryTemplateSet').forEach(set => {
        if (set.closest('.us-report-no-styling')) return;
        stateFor(set);
        apply(set);
      });
    });
  }

  new MutationObserver(records => {
    if (records.some(record => (record.type === 'childList' &&
        [...record.addedNodes, ...record.removedNodes].some(node => node.localName === 'section' || node.localName === 'div')) ||
        (record.type === 'attributes' && record.target.closest?.('.us-terms')))) schedule();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-us-query-search-hidden']});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();

  // A row refreshed in place (US-ROW-PATCH) may change only attributes.
  document.addEventListener('us:row-patched', schedule);
  window.UnionSuiteTermFacets = Object.freeze({refresh: schedule, version: '0.1-candidate'});
})();
