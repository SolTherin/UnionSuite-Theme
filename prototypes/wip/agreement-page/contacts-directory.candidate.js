/* Agreement contacts — options 5 and 6 script under review (contacts-compare.html).
   Not installed and not loaded by the agreement page.
   US-CONTACT-FACETS   group and role chips, and labelled search suggestions */

/* US-CONTACT-FACETS:START — filters over a contacts list.
   Target: new block beside US-CONTACT-GROUPS in zUnionSuite.js.
   Reads data-us-contact-group, -role, -type and -name from each row (a
   roster row or a tile), so the filters follow whatever the client
   configures. One filter value per attribute; attributes combine. Chips
   exist only when the list has more than four contacts.

   Two placements, chosen by the wrapper's classes:
   us-contacts-facets                a strip above the list: a summary line
                                     with Clear, a Group row and a Role row
                                     of chips (roles past six behind "+N more").
   us-contacts-facets us-contacts-group-filter
                                     group chips inside the theme's filter
                                     disclosure (us-query-search's funnel),
                                     the count beside the panel title, and
                                     suggestions under the search field as
                                     the user types: matching names, roles,
                                     groups and types, each labelled by its
                                     attribute (the v1 page's behaviour).
                                     Picking one filters on that attribute
                                     exactly and clears the typed text.

   Groups are numbered in IQA order (data-us-contact-group-index) for
   us-contacts-group-tint. A row the filters exclude gets the hidden
   attribute; the theme's search and US-CONTACT-GROUPS both treat a hidden
   section as off the page, so their counts follow without a change. */
(function () {
  'use strict';
  if (window.UnionSuiteContactFacets) return;

  const MIN_ROWS = 5;
  const VISIBLE_ROLES = 6;
  const MAX_SUGGESTIONS = 10;
  const SUGGESTION_CAPS = {group: 3, role: 4, type: 2, name: 10};
  const BLANK_GROUP = 'No group';
  // us-agreement-contacts: suggest the person's place on the agreement, not
  // the system type, and say so in the field.
  const AGREEMENT_PLACEHOLDER = 'Search name, role or group';
  const FACETS = ['group', 'role', 'type', 'name'];
  const LABELS = {group: 'Group', role: 'Role', type: 'Type', name: 'Name'};
  const states = new WeakMap();
  let suggestId = 0;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function wrapperOf(set) {
    return set.closest('.us-contacts-facets');
  }

  function attribute(element, name) {
    return (element.getAttribute('data-us-contact-' + name) || '').trim();
  }

  // A row is whatever carries the group in the section. The name falls back
  // to the row's own name element when the template has no attribute.
  function rowsOf(set) {
    return [...set.children]
      .filter(child => child.localName === 'section')
      .map(section => ({section, row: section.querySelector('[data-us-contact-group]')}))
      .filter(entry => entry.row)
      .map(entry => {
        const nameNode = entry.row.querySelector('.us-contact-tile__name, .us-contact-row__name');
        return {
          section: entry.section,
          element: entry.row,
          group: attribute(entry.row, 'group') || BLANK_GROUP,
          role: attribute(entry.row, 'role'),
          type: attribute(entry.row, 'type'),
          name: attribute(entry.row, 'name') || (nameNode ? nameNode.textContent.trim() : '')
        };
      });
  }

  // Values in first-seen order for groups (the IQA sorts by group) and by
  // count, then name, for roles, so the common roles come first.
  function tally(rows, key, order) {
    const counts = new Map();
    rows.forEach(row => {
      if (!row[key]) return;
      counts.set(row[key], (counts.get(row[key]) || 0) + 1);
    });
    const values = [...counts.keys()];
    if (order === 'count') values.sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b));
    return values;
  }

  // Groups are numbered in the order the IQA returns them, blank last and
  // unnumbered, so us-contacts-group-tint can colour the first few.
  function numberGroups(rows, groups) {
    const named = groups.filter(group => group !== BLANK_GROUP);
    rows.forEach(row => {
      const index = named.indexOf(row.group);
      if (index < 0) row.element.removeAttribute('data-us-contact-group-index');
      else if (row.element.getAttribute('data-us-contact-group-index') !== String(index)) {
        row.element.setAttribute('data-us-contact-group-index', String(index));
      }
    });
  }

  function matches(state, row, except) {
    return FACETS.every(facet => facet === except || !state.filters[facet] || row[facet] === state.filters[facet]);
  }

  function activeFacets(state) {
    return FACETS.filter(facet => state.filters[facet]);
  }

  function clearFilters(state) {
    FACETS.forEach(facet => { state.filters[facet] = null; });
    state.moreRoles = false;
  }

  function chip(value) {
    const button = el('button', 'us-contact-chip');
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('data-us-contact-facet-value', value);
    button.append(el('span', '', value), el('span', 'us-contact-chip__count', ''));
    return button;
  }

  function facetRow(facet, label) {
    const row = el('div', 'us-contact-facets__row');
    row.setAttribute('data-us-contact-facet', facet);
    row.append(el('span', 'us-contact-facets__label', label), el('div', 'us-contact-facets__chips'));
    return row;
  }

  function clearButton(text) {
    const clear = el('button', 'us-contact-facets__clear', text);
    clear.type = 'button';
    clear.hidden = true;
    return clear;
  }

  // The chips, and in strip mode the summary line too.
  function buildStrip(state) {
    const node = el('div', 'us-contact-facets' + (state.groupFilter ? ' us-contact-facets--filter' : ''));
    if (!state.groupFilter) {
      const summary = el('p', 'us-contact-facets__summary');
      summary.setAttribute('role', 'status');
      summary.setAttribute('aria-live', 'polite');
      summary.setAttribute('aria-atomic', 'true');
      summary.append(el('span', 'us-contact-facets__count', ''), clearButton('Clear'));
      node.append(summary);
    }
    node.append(facetRow('group', 'Group'));
    if (!state.groupFilter) node.append(facetRow('role', 'Role'));
    return node;
  }

  // Beside the panel title: the count, the active filters and a clear.
  function buildHeadingCount() {
    const node = el('span', 'us-contact-facets__heading-count');
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-atomic', 'true');
    const clear = clearButton('');
    clear.className = 'us-contact-facets__clear us-contact-facets__clear--icon';
    clear.setAttribute('aria-label', 'Clear the contact filters');
    clear.title = 'Clear the contact filters';
    const icon = el('i', 'ti ti-x');
    icon.setAttribute('aria-hidden', 'true');
    clear.append(icon);
    node.append(el('span', 'us-contact-facets__count', ''), clear);
    return node;
  }

  // The suggestion list under the search field.
  function buildSuggest() {
    const node = el('div', 'us-contact-suggest');
    node.id = 'us-contact-suggest-' + (++suggestId);
    node.setAttribute('role', 'listbox');
    node.hidden = true;
    return node;
  }

  function onClick(set, event) {
    const state = states.get(set);
    if (!state) return;
    const target = event.target.closest('button');
    if (!target) return;
    if (target.classList.contains('us-contact-facets__clear')) {
      clearFilters(state);
      // On the agreement panel the clear also empties the text search.
      const wrapper = wrapperOf(set);
      if (state.input && state.input.value && wrapper && wrapper.classList.contains('us-agreement-contacts')) {
        state.input.value = '';
        state.input.dispatchEvent(new Event('input', {bubbles: true}));
      }
    } else if (target.classList.contains('us-contact-chip--more')) {
      state.moreRoles = !state.moreRoles;
    } else if (target.classList.contains('us-contact-chip')) {
      if (target.getAttribute('aria-disabled') === 'true') return;
      const facet = target.closest('[data-us-contact-facet]').getAttribute('data-us-contact-facet');
      const value = target.getAttribute('data-us-contact-facet-value');
      state.filters[facet] = state.filters[facet] === value ? null : value;
    } else {
      return;
    }
    apply(set);
  }

  // Chips are rebuilt only when the values change; counts and pressed state
  // update in place, so focus stays on the chip just pressed.
  function syncChips(container, values, extra) {
    const current = [...container.querySelectorAll('.us-contact-chip:not(.us-contact-chip--more)')];
    const same = current.length === values.length &&
      current.every((node, index) => node.getAttribute('data-us-contact-facet-value') === values[index]);
    if (same) return;
    container.replaceChildren(...values.map(chip));
    if (extra) container.append(extra);
  }

  // Where the chips live: the theme's filter disclosure in group-filter
  // mode (when it exists yet), otherwise above the results.
  function mount(state, set) {
    const wrapper = wrapperOf(set);
    let home = null, first = false;
    if (state.groupFilter && wrapper) {
      const controls = wrapper.querySelector(':scope > .panel > .us-query-search-controls');
      if (controls) { home = controls; first = true; }
      else if (!wrapper.classList.contains('us-query-search')) home = set.parentElement;
    } else {
      home = set.parentElement;
    }
    if (!home) { state.strip.remove(); return; }
    if (first) { if (home.firstElementChild !== state.strip) home.prepend(state.strip); }
    else if (state.strip.nextElementSibling !== set || state.strip.parentElement !== home) set.before(state.strip);
  }

  function mountHeadingCount(state, set) {
    const wrapper = wrapperOf(set);
    const title = wrapper && wrapper.querySelector(':scope > .panel > .panel-heading > .panel-title');
    if (!title) { state.headingCount.remove(); return; }
    if (title.nextElementSibling !== state.headingCount) title.after(state.headingCount);
  }

  /* Suggestions: the theme owns the search input; this listens beside it.
     The list sits in flow under the field row, inside the disclosure. */
  function mountSuggest(state, set) {
    const wrapper = wrapperOf(set);
    const controls = wrapper && wrapper.querySelector(':scope > .panel > .us-query-search-controls');
    const fields = controls && controls.querySelector(':scope > .us-query-filter-fields');
    const input = fields && fields.querySelector('.us-query-search-field input');
    if (!input) { state.suggest.remove(); state.input = null; return; }
    if (fields.nextElementSibling !== state.suggest) fields.after(state.suggest);
    if (wrapper.classList.contains('us-agreement-contacts') && input.placeholder !== AGREEMENT_PLACEHOLDER) {
      input.placeholder = AGREEMENT_PLACEHOLDER;
    }
    if (state.input === input) return;
    state.input = input;
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-expanded', 'false');
    input.addEventListener('input', () => suggest(state, set));
    input.addEventListener('focus', () => suggest(state, set));
    input.addEventListener('blur', () => window.setTimeout(() => closeSuggest(state), 150));
    input.addEventListener('keydown', event => onSuggestKey(state, set, event));
  }

  // Attribute matches first, since they are the quick filters, each capped
  // so a common letter shows a mix; names fill what is left.
  function suggestions(state, set, query) {
    const rows = rowsOf(set);
    const found = [];
    const wrapper = wrapperOf(set);
    const facets = wrapper && wrapper.classList.contains('us-agreement-contacts')
      ? ['group', 'role', 'name'] : ['group', 'role', 'type', 'name'];
    facets.forEach(facet => {
      const room = Math.min(SUGGESTION_CAPS[facet], MAX_SUGGESTIONS - found.length);
      const counts = new Map();
      rows.forEach(row => {
        const value = facet === 'group' && row.group === BLANK_GROUP ? '' : row[facet];
        if (!value || !value.toLowerCase().includes(query)) return;
        if (state.filters[facet] === value) return;
        counts.set(value, (counts.get(value) || 0) + 1);
      });
      [...counts.keys()].sort((a, b) => a.localeCompare(b)).slice(0, room).forEach(value => {
        found.push({facet, value, count: counts.get(value)});
      });
    });
    return found.slice(0, MAX_SUGGESTIONS);
  }

  function suggest(state, set) {
    const input = state.input;
    const query = input.value.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!query) { closeSuggest(state); return; }
    const items = suggestions(state, set, query);
    if (!items.length) { closeSuggest(state); return; }
    state.suggest.replaceChildren(...items.map((item, index) => {
      const option = el('div', 'us-contact-suggest__option');
      option.id = state.suggest.id + '-' + index;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.setAttribute('data-us-contact-facet', item.facet);
      option.setAttribute('data-us-contact-facet-value', item.value);
      option.append(
        el('span', 'us-contact-suggest__kind', LABELS[item.facet]),
        el('span', 'us-contact-suggest__value', item.value),
        el('span', 'us-contact-suggest__count', item.facet === 'name' ? '' : String(item.count)));
      option.addEventListener('mousedown', event => event.preventDefault());
      option.addEventListener('click', () => pick(state, set, item.facet, item.value));
      return option;
    }));
    state.suggest.hidden = false;
    state.activeOption = -1;
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-controls', state.suggest.id);
    input.removeAttribute('aria-activedescendant');
  }

  function closeSuggest(state) {
    if (!state.suggest.hidden) state.suggest.hidden = true;
    state.activeOption = -1;
    if (state.input) {
      state.input.setAttribute('aria-expanded', 'false');
      state.input.removeAttribute('aria-activedescendant');
    }
  }

  function onSuggestKey(state, set, event) {
    const options = [...state.suggest.querySelectorAll('[role="option"]')];
    if (state.suggest.hidden || !options.length) {
      if (event.key === 'Escape' && state.input.value) return;
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      state.activeOption = (state.activeOption + step + options.length) % options.length;
      options.forEach((option, index) => {
        const active = index === state.activeOption;
        option.setAttribute('aria-selected', String(active));
        option.classList.toggle('is-active', active);
        if (active) {
          state.input.setAttribute('aria-activedescendant', option.id);
          option.scrollIntoView({block: 'nearest'});
        }
      });
    } else if (event.key === 'Enter' && state.activeOption >= 0) {
      event.preventDefault();
      const option = options[state.activeOption];
      pick(state, set, option.getAttribute('data-us-contact-facet'), option.getAttribute('data-us-contact-facet-value'));
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeSuggest(state);
    }
  }

  // An exact filter on one attribute; the typed text has done its job.
  function pick(state, set, facet, value) {
    state.filters[facet] = value;
    closeSuggest(state);
    if (state.input) {
      state.input.value = '';
      state.input.dispatchEvent(new Event('input', {bubbles: true}));
      state.input.focus({preventScroll: true});
    }
    apply(set);
  }

  // The heading tokens: the group bare, the rest labelled, because a type
  // and a group can share a word ("External").
  function summaryTokens(state) {
    return activeFacets(state).map(facet => {
      const token = el('span', 'us-contact-facets__token');
      if (facet !== 'group') token.append(el('small', '', LABELS[facet] + ' '));
      token.append(document.createTextNode(state.filters[facet]));
      return token;
    });
  }

  function apply(set) {
    const state = states.get(set);
    if (!state) return;
    const wrapper = wrapperOf(set);
    const rows = rowsOf(set);
    const total = rows.length;
    const groups = tally(rows, 'group');
    numberGroups(rows, groups);
    // A contact with no record link keeps a plain-text name.
    set.querySelectorAll('a[href=""]').forEach(link => link.removeAttribute('href'));
    const noun = total === 1 ? 'contact' : 'contacts';
    if (state.groupFilter) { mountHeadingCount(state, set); mountSuggest(state, set); }

    // Too few to filter: plain rows, nothing hidden by the chips.
    if (total < MIN_ROWS) {
      rows.forEach(row => { if (row.section.hidden) row.section.hidden = false; });
      clearFilters(state);
      set.removeAttribute('data-us-contact-facet-group');
      if (wrapper) wrapper.removeAttribute('data-us-contact-facet-active');
      state.strip.remove();
      if (state.groupFilter) {
        state.headingCount.querySelector('.us-contact-facets__count').replaceChildren(String(total));
        state.headingCount.querySelector('.us-contact-facets__clear').hidden = true;
      }
      refreshGroups();
      return;
    }
    mount(state, set);

    const roles = state.groupFilter ? [] : tally(rows, 'role', 'count');
    if (state.filters.group && !groups.includes(state.filters.group)) state.filters.group = null;
    FACETS.filter(facet => facet !== 'group').forEach(facet => {
      if (state.filters[facet] && !rows.some(row => row[facet] === state.filters[facet])) state.filters[facet] = null;
    });

    const groupRow = state.strip.querySelector('[data-us-contact-facet="group"]');
    const roleRow = state.strip.querySelector('[data-us-contact-facet="role"]');
    groupRow.hidden = groups.length < 2;
    syncChips(groupRow.querySelector('.us-contact-facets__chips'), groups);

    let more = null;
    if (roleRow) {
      roleRow.hidden = roles.length < 2;
      more = roleRow.querySelector('.us-contact-chip--more');
      if (!more) {
        more = el('button', 'us-contact-chip us-contact-chip--more');
        more.type = 'button';
      }
      syncChips(roleRow.querySelector('.us-contact-facets__chips'), roles, more);
    }

    // Counts within the other filters' choices.
    const paint = (row, facet) => {
      row.querySelectorAll('.us-contact-chip:not(.us-contact-chip--more)').forEach(node => {
        const value = node.getAttribute('data-us-contact-facet-value');
        const count = rows.filter(r => r[facet] === value && matches(state, r, facet)).length;
        const pressed = state.filters[facet] === value;
        node.querySelector('.us-contact-chip__count').textContent = String(count);
        node.setAttribute('aria-pressed', String(pressed));
        if (count || pressed) node.removeAttribute('aria-disabled');
        else node.setAttribute('aria-disabled', 'true');
      });
    };
    paint(groupRow, 'group');
    if (roleRow) {
      paint(roleRow, 'role');
      // The role overflow: the pressed role is always among the visible chips.
      const roleChips = [...roleRow.querySelectorAll('.us-contact-chip:not(.us-contact-chip--more)')];
      const hiddenCount = Math.max(0, roleChips.length - VISIBLE_ROLES);
      roleChips.forEach((node, index) => {
        const overflow = index >= VISIBLE_ROLES && !state.moreRoles &&
          node.getAttribute('aria-pressed') !== 'true';
        if (node.hidden !== overflow) node.hidden = overflow;
      });
      more.hidden = !hiddenCount;
      more.textContent = state.moreRoles ? 'Fewer' : '+' + hiddenCount + ' more';
      more.setAttribute('aria-expanded', String(state.moreRoles));
    }

    // Rows, then the summary wherever it lives.
    // On the agreement panel the count also follows the theme's text
    // search, which marks the rows it hides with data-us-query-search-hidden.
    const agreement = !!wrapper && wrapper.classList.contains('us-agreement-contacts');
    let shown = 0, searching = false;
    rows.forEach(row => {
      const match = matches(state, row);
      const searchHidden = agreement && row.section.hasAttribute('data-us-query-search-hidden');
      if (searchHidden) searching = true;
      if (match && !searchHidden) shown++;
      if (row.section.hidden !== !match) row.section.hidden = !match;
    });
    const active = activeFacets(state);
    const filtered = active.length || searching;
    const summaryHome = state.groupFilter ? state.headingCount : state.strip;
    const count = summaryHome.querySelector('.us-contact-facets__count');
    if (state.groupFilter) {
      const parts = filtered ? [shown + ' of ' + total] : [String(total)];
      count.replaceChildren(parts[0]);
      summaryTokens(state).forEach(token => count.append(' · ', token));
    } else {
      count.textContent = active.length
        ? shown + ' of ' + total + ' ' + noun + ' · ' + active.map(facet => state.filters[facet]).join(' · ')
        : total + ' ' + noun;
    }
    summaryHome.querySelector('.us-contact-facets__clear').hidden = !filtered;
    set.toggleAttribute('data-us-contact-facet-group', !!state.filters.group);
    if (wrapper) wrapper.toggleAttribute('data-us-contact-facet-active', !!active.length);
    refreshGroups();
  }

  function refreshGroups() {
    if (window.UnionSuiteContactGroups) window.UnionSuiteContactGroups.refresh();
  }

  function stateFor(set) {
    let state = states.get(set);
    const wrapper = wrapperOf(set);
    const groupFilter = !!wrapper && wrapper.classList.contains('us-contacts-group-filter');
    if (state && state.groupFilter !== groupFilter) {
      state.strip.remove();
      state.headingCount.remove();
      state.suggest.remove();
      state = null;
    }
    if (!state) {
      state = {
        filters: {group: null, role: null, type: null, name: null},
        moreRoles: false, groupFilter, strip: null,
        headingCount: buildHeadingCount(), suggest: buildSuggest(), input: null, activeOption: -1
      };
      state.strip = buildStrip(state);
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
      document.querySelectorAll('.us-contacts-facets .QueryTemplateSet').forEach(set => {
        if (set.closest('.us-report-no-styling')) return;
        stateFor(set);
        apply(set);
      });
    });
  }

  new MutationObserver(records => {
    if (records.some(record => (record.type === 'childList' &&
        [...record.addedNodes, ...record.removedNodes].some(node => node.localName === 'section' || node.localName === 'div')) ||
        (record.type === 'attributes' && record.target.closest && record.target.closest('.us-agreement-contacts')))) schedule();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-us-query-search-hidden']});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();

  window.UnionSuiteContactFacets = Object.freeze({refresh: schedule, version: '0.3-candidate'});
})();
/* US-CONTACT-FACETS:END */

/* US-CONTACT-COPY:START — copy a contact's email or phone from its icon.
   Target: new block beside US-CONTACTS in zUnionSuite.js.
   The icon is a .us-contact-tile__copy button before the value. Pressing it
   copies the value, swaps the icon for a green copy icon and flashes the
   line, with no visible text; a hidden status line tells screen readers.
   A button whose value is blank is disabled, so it does nothing. */
(function () {
  'use strict';
  if (window.UnionSuiteContactCopy) return;

  const FLASH_MS = 1400;
  const timers = new WeakMap();
  let status = null;

  function valueOf(button) {
    const value = button.nextElementSibling;
    return value ? value.textContent.trim() : '';
  }

  function sync(root) {
    root.querySelectorAll('.us-contact-tile__copy').forEach(button => {
      const empty = !valueOf(button);
      if (button.disabled !== empty) button.disabled = empty;
    });
  }

  function announce(text) {
    if (!status) {
      status = document.createElement('p');
      status.className = 'us-contact-copy-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      document.body.append(status);
    }
    status.textContent = '';
    requestAnimationFrame(() => { status.textContent = text; });
  }

  async function write(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Older or insecure contexts: a hidden field and execCommand.
      const field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.append(field);
      field.select();
      const done = document.execCommand && document.execCommand('copy');
      field.remove();
      return !!done;
    }
  }

  function flash(button) {
    const line = button.parentElement;
    const icon = button.querySelector('i');
    if (!icon.dataset.usIcon) icon.dataset.usIcon = icon.className;
    clearTimeout(timers.get(button));
    // Restart the flash even on a quick second press.
    line.removeAttribute('data-us-copied');
    void line.offsetWidth;
    line.setAttribute('data-us-copied', '');
    button.setAttribute('data-us-copied', '');
    icon.className = 'ti ti-copy';
    timers.set(button, setTimeout(() => {
      line.removeAttribute('data-us-copied');
      button.removeAttribute('data-us-copied');
      icon.className = icon.dataset.usIcon;
    }, FLASH_MS));
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest('.us-contact-tile__copy');
    if (!button || button.disabled || button.closest('.us-report-no-styling')) return;
    const value = valueOf(button);
    if (!value) return;
    if (await write(value)) {
      flash(button);
      announce(button.getAttribute('aria-label').replace(/^Copy/, 'Copied') + ': ' + value);
    } else {
      announce('Could not copy. Select the text instead.');
    }
  });

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; sync(document); });
  }
  new MutationObserver(schedule).observe(document.documentElement, {subtree: true, childList: true, characterData: true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();

  window.UnionSuiteContactCopy = Object.freeze({refresh: schedule, version: '0.1-candidate'});
})();
/* US-CONTACT-COPY:END */
