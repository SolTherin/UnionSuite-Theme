/* Comparison-only options 6 and 7. One shared fixture row per field,
   grouped by ChangeSet. These are research views, not iMIS components. */
(function () {
  'use strict';

  const ICONS = {
    Agreement: 'contract', Terms: 'file-text', Increases: 'chart-line',
    Contacts: 'users', Tasks: 'checkbox', Milestones: 'flag',
    Attachments: 'paperclip', Meetings: 'calendar', Coverage: 'building'
  };
  const ACTIONS = {Status: 'Status changed', Updated: 'Updated', Added: 'Added', Removed: 'Removed', Created: 'Created'};
  const states = new Map();
  const fold = (node, open) => window.UnionSuiteRecordCards.fold(node, open);

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function icon(name) {
    const node = element('i', 'ti ti-' + name);
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  function button(className, text) {
    const node = element('button', className, text);
    node.type = 'button';
    return node;
  }

  function title(save) {
    return save.Item || 'Agreement details';
  }

  function dateText(iso, full = false) {
    return new Date(iso).toLocaleDateString('en-AU', {
      day: 'numeric', month: full ? 'long' : 'short', year: full ? 'numeric' : undefined
    });
  }

  function timeText(iso) {
    return new Date(iso).toLocaleTimeString('en-AU', {hour: 'numeric', minute: '2-digit'});
  }

  function metadata(save) {
    return element('span', 'lc-explore__meta', save.ChangedBy + ' · ' + timeText(save.ChangeDate));
  }

  function badge(save) {
    const node = element('span', 'lc-explore__action', ACTIONS[save.Action] || save.Action);
    node.dataset.action = save.Action;
    return node;
  }

  function marker(save) {
    const node = element('span', 'lc-explore__mark');
    node.append(icon(ICONS[save.Area] || 'history'));
    return node;
  }

  function value(text, kind) {
    return element('span', 'lc-explore__value lc-explore__value--' + kind, text || 'Not set');
  }

  function difference(row) {
    const line = element('div', 'lc-explore__diff');
    if (row.Field) {
      line.append(element('span', 'lc-explore__field', row.Field), value(row.OldValue, 'old'), icon('arrow-right'), value(row.NewValue, 'new'));
    } else if (row.NewValue || row.OldValue) {
      line.append(value(row.NewValue || row.OldValue, row.Action === 'Removed' ? 'old' : 'new'));
    } else {
      line.append(element('span', 'lc-explore__meta', 'Record ' + (ACTIONS[row.Action] || 'changed').toLowerCase()));
    }
    return line;
  }

  function comparison(save) {
    const body = element('div', 'lc-explore__comparison');
    const fields = save.rows.filter(row => row.Field || row.OldValue || row.NewValue);
    if (!fields.length) {
      body.append(element('p', 'lc-explore__no-values', 'This save records that the record was ' + (ACTIONS[save.Action] || 'changed').toLowerCase() + '. No field values were recorded.'));
      return body;
    }
    const table = element('table', 'lc-explore__table');
    const caption = element('caption', 'lc-explore__sr', 'Field values in this save');
    const head = element('thead');
    const headings = element('tr');
    ['Field', 'Before', 'After'].forEach(text => {
      const cell = element('th', '', text);
      cell.scope = 'col';
      headings.append(cell);
    });
    head.append(headings);
    const rows = element('tbody');
    fields.forEach(row => {
      const line = element('tr');
      const label = element('th', '', row.Field || 'Record details');
      label.scope = 'row';
      const before = element('td', 'lc-explore__before');
      const after = element('td', 'lc-explore__after');
      // Missing records differ from blank values on an existing record.
      before.append(value(row.OldValue || (['Added', 'Created'].includes(row.Action) ? 'Not present' : ''), 'old'));
      after.append(value(row.NewValue || (row.Action === 'Removed' ? 'Removed' : ''), 'new'));
      line.append(label, before, after);
      rows.append(line);
    });
    table.append(caption, head, rows);
    body.append(table);
    return body;
  }

  function summaryEntry(save, state) {
    const entry = element('li', 'lc-explore__entry');
    const content = element('div', 'lc-explore__content');
    const heading = element('div', 'lc-explore__headline');
    heading.append(element('h3', 'lc-explore__title', title(save)), badge(save));
    const bottom = element('div', 'lc-explore__bottom');
    bottom.append(metadata(save));
    content.append(heading, difference(save.rows[0]), bottom);
    if (save.rows.length > 1) {
      const extra = element('div', 'lc-explore__extra');
      extra.id = 'lc-summary-' + save.ChangeSet;
      extra.hidden = true;
      save.rows.slice(1).forEach(row => extra.append(difference(row)));
      const count = save.rows.length - 1;
      const toggle = button('lc-explore__more', count + ' more ' + (count === 1 ? 'field' : 'fields'));
      toggle.dataset.closedText = toggle.textContent;
      toggle.append(icon('chevron-down'));
      toggle.setAttribute('aria-label', 'Show ' + count + ' more ' + (count === 1 ? 'field' : 'fields') + ' for ' + title(save));
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', extra.id);
      toggle.addEventListener('click', () => {
        setExpanded(toggle, extra, toggle.getAttribute('aria-expanded') !== 'true');
        updateExpandAll(state);
      });
      bottom.append(toggle);
      content.append(extra);
    }
    entry.append(marker(save), content);
    return entry;
  }

  function setExpanded(toggle, extra, open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.firstChild.textContent = open ? 'Fewer fields' : toggle.dataset.closedText;
    toggle.setAttribute('aria-label', toggle.getAttribute('aria-label').replace(/^(Show|Hide)/, open ? 'Hide' : 'Show'));
    fold(extra, open);
  }

  function updateExpandAll(state) {
    if (!state.expandAll) return;
    const toggles = state.items.filter(item => item.matches).map(item => item.node.querySelector('.lc-explore__more')).filter(Boolean);
    const allOpen = toggles.length > 0 && toggles.every(toggle => toggle.getAttribute('aria-expanded') === 'true');
    state.expandAll.textContent = allOpen ? 'Collapse details' : 'Expand details';
    state.expandAll.disabled = !toggles.length;
    state.expandAll.setAttribute('aria-pressed', String(allOpen));
  }

  function inspectorEntry(save, state) {
    const entry = element('li', 'lc-explore__entry');
    const select = button('lc-explore__select');
    select.setAttribute('aria-pressed', 'false');
    select.setAttribute('aria-controls', 'lc-inspector-detail');
    const text = element('span', 'lc-explore__selection-text');
    const top = element('span', 'lc-explore__selection-top');
    top.append(element('span', '', save.Area), element('span', '', dateText(save.ChangeDate)));
    text.append(top, element('span', 'lc-explore__title', title(save)), element('span', 'lc-explore__meta', (ACTIONS[save.Action] || save.Action) + ' · ' + save.rows.length + (save.rows.length === 1 ? ' change' : ' changes')), metadata(save));
    select.append(marker(save), text, icon('chevron-right'));
    select.addEventListener('click', () => selectSave(state, save.ChangeSet));
    select.addEventListener('keydown', event => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const visible = state.items.filter(item => item.matches);
      const index = visible.findIndex(item => item.save.ChangeSet === save.ChangeSet);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1 : Math.max(0, Math.min(visible.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
      visible[next].node.querySelector('button').focus();
      selectSave(state, visible[next].save.ChangeSet);
    });
    entry.append(select);
    return entry;
  }

  function placeInspector(state) {
    const item = state.items.find(item => item.save.ChangeSet === state.selected && item.matches);
    const narrow = state.host.clientWidth < 720;
    const parent = narrow && item ? item.node : state.detailSlot;
    if (state.detail.parentElement !== parent) parent.append(state.detail);
    state.body.classList.toggle('lc-explore__browser--narrow', narrow);
  }

  async function selectSave(state, key, animate = true) {
    const selected = state.items.find(item => item.save.ChangeSet === key && item.matches);
    if (!selected || (state.selected === key && state.detail.childElementCount)) return;
    const revision = ++state.revision;
    state.selected = key;
    state.items.forEach(item => {
      const active = item === selected;
      item.node.classList.toggle('is-selected', active);
      item.node.querySelector('button').setAttribute('aria-pressed', String(active));
    });
    if (animate) await fold(state.detail, false);
    if (revision !== state.revision || !state.host.isConnected) return;
    const save = selected.save;
    const eyebrow = element('p', 'lc-explore__eyebrow', save.Area + ' · ' + (ACTIONS[save.Action] || save.Action));
    const heading = element('h3', 'lc-explore__detail-title', title(save));
    heading.id = 'lc-inspector-detail-title';
    const meta = element('p', 'lc-explore__detail-meta', save.ChangedBy + ' · ' + dateText(save.ChangeDate, true) + ' at ' + timeText(save.ChangeDate));
    const note = element('p', 'lc-explore__detail-note', save.rows.length + (save.rows.length === 1 ? ' change in this save' : ' changes in this save'));
    state.detail.replaceChildren(eyebrow, heading, meta, note, comparison(save));
    state.detail.setAttribute('aria-labelledby', heading.id);
    placeInspector(state);
    if (animate) await fold(state.detail, true);
    else state.detail.hidden = false;
  }

  function filter(state, animate = true) {
    const query = state.search.value.trim().toLocaleLowerCase();
    let count = 0;
    let fields = 0;
    let previousDay = '';
    // Search matches a whole save, keeping the surrounding fields together.
    state.items.forEach(item => {
      item.matches = (!state.area.value || item.save.Area === state.area.value) && (!query || item.search.includes(query));
      if (item.matches) {
        count++;
        fields += item.save.rows.length;
        const day = item.save.ChangeDate.slice(0, 10);
        item.day.hidden = state.kind !== 'summary' || day === previousDay;
        previousDay = day;
      }
      if (animate) fold(item.node, item.matches);
      else item.node.hidden = !item.matches;
      item.node.inert = !item.matches;
      item.node.classList.remove('is-first', 'is-last');
      if (query && item.matches && state.kind === 'summary' && item.save.rows.slice(1).some(row => Object.values(row).join(' ').toLocaleLowerCase().includes(query))) {
        setExpanded(item.node.querySelector('.lc-explore__more'), item.node.querySelector('.lc-explore__extra'), true);
      }
    });
    state.items.find(item => item.matches)?.node.classList.add('is-first');
    state.items.filter(item => item.matches).at(-1)?.node.classList.add('is-last');
    state.body.classList.toggle('is-empty', count === 0);
    state.host.querySelector('.lc-explore__count').textContent = (query || state.area.value ? count + ' of ' + state.items.length : count) + ' saves · ' + fields + ' changes';
    fold(state.empty, count === 0);
    state.clear.disabled = !query && !state.area.value;
    updateExpandAll(state);
    if (state.kind === 'inspector') {
      const current = state.items.find(item => item.save.ChangeSet === state.selected && item.matches);
      if (current) {
        placeInspector(state);
        fold(state.detail, true);
      } else if (count) {
        selectSave(state, state.items.find(item => item.matches).save.ChangeSet, animate);
      } else {
        ++state.revision;
        state.selected = null;
        state.items.forEach(item => {
          item.node.classList.remove('is-selected');
          item.node.querySelector('button').setAttribute('aria-pressed', 'false');
        });
        fold(state.detail, false);
      }
    }
  }

  function mount(host, saves) {
    const old = states.get(host);
    if (old) {
      ++old.revision;
      old.observer?.disconnect();
    }
    const kind = host.dataset.lcExplore;
    const state = {host, kind, items: [], revision: 0, selected: null};
    const controls = element('div', 'lc-explore__controls');
    const searchLabel = element('label', 'lc-explore__search');
    const search = element('input');
    search.type = 'search';
    search.placeholder = 'Search records, people or values';
    search.setAttribute('aria-label', 'Search ' + (kind === 'summary' ? 'change-first timeline' : 'save browser'));
    searchLabel.append(icon('search'), search);
    const area = element('select');
    area.setAttribute('aria-label', 'Filter ' + (kind === 'summary' ? 'timeline' : 'save browser') + ' by area');
    const all = element('option', '', 'All areas');
    all.value = '';
    area.append(all);
    [...new Set(saves.map(save => save.Area))].sort().forEach(name => area.append(element('option', '', name)));
    const clear = button('lc-explore__clear', 'Clear');
    clear.disabled = true;
    state.search = search;
    state.area = area;
    state.clear = clear;
    controls.append(searchLabel, area, clear);
    if (kind === 'summary') {
      state.expandAll = button('lc-explore__expand-all', 'Expand details');
      state.expandAll.addEventListener('click', () => {
        const open = state.expandAll.getAttribute('aria-pressed') !== 'true';
        state.items.filter(item => item.matches).forEach(item => {
          const toggle = item.node.querySelector('.lc-explore__more');
          if (toggle) setExpanded(toggle, item.node.querySelector('.lc-explore__extra'), open);
        });
        updateExpandAll(state);
      });
      controls.append(state.expandAll);
    }
    const body = element('div', kind === 'inspector' ? 'lc-explore__browser' : 'lc-explore__reading');
    state.body = body;
    const list = element('ol', 'lc-explore__list');
    list.setAttribute('aria-label', kind === 'summary' ? 'Changes, newest first' : 'Choose a save, newest first');
    saves.forEach(save => {
      const node = kind === 'summary' ? summaryEntry(save, state) : inspectorEntry(save, state);
      node.dataset.save = save.ChangeSet;
      const day = element('p', 'lc-explore__day', dateText(save.ChangeDate, true));
      day.hidden = true;
      node.prepend(day);
      state.items.push({save, node, day, matches: true, search: save.rows.map(row => Object.values(row).join(' ')).join(' ').toLocaleLowerCase()});
      list.append(node);
    });
    body.append(list);
    if (kind === 'inspector') {
      state.detailSlot = element('div', 'lc-explore__detail-slot');
      state.detail = element('section', 'lc-explore__detail');
      state.detail.id = 'lc-inspector-detail';
      state.detail.hidden = true;
      state.detailSlot.append(state.detail);
      body.append(state.detailSlot);
      state.observer = new ResizeObserver(() => placeInspector(state));
      state.observer.observe(host);
    }
    const empty = element('p', 'lc-explore__empty', 'No matching saves. Try another search or clear the filters.');
    empty.hidden = true;
    state.empty = empty;
    host.querySelector('.lc-explore__mount').replaceChildren(controls, body, empty);
    search.addEventListener('input', () => filter(state));
    area.addEventListener('change', () => filter(state));
    clear.addEventListener('click', () => {
      search.value = '';
      area.value = '';
      filter(state);
      search.focus();
    });
    if (kind === 'inspector') {
      const initial = saves.find(save => save.rows.length > 1) || saves[0];
      if (initial) selectSave(state, initial.ChangeSet, false);
    }
    filter(state, false);
    states.set(host, state);
  }

  function render(rows) {
    const grouped = new Map();
    rows.forEach(row => {
      if (!grouped.has(row.ChangeSet)) grouped.set(row.ChangeSet, {...row, rows: []});
      grouped.get(row.ChangeSet).rows.push(row);
    });
    document.querySelectorAll('[data-lc-explore]').forEach(host => mount(host, [...grouped.values()]));
  }

  window.UnionSuiteChangelogExplorations = Object.freeze({render});
})();
