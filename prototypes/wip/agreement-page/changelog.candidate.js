// Agreement changelog candidates (decision 14, proposed 4 October 2026;
// changelog-compare.html). Nothing here is in the theme. Target when
// chosen: zUnionSuite.js, a new block after US-INCREASES.

/* US-CHANGELOG:START — an agreement's change history from one row per field
   change (templates/Agreement-Changelog-Query-Template.html), on a Query
   Template Display with us-changelog in its CSS class.
   - Saves: consecutive rows with the same data-us-change-set are one save.
     The save's first shown row gets a head: the area icon (or the
     person's initials on the timeline), a sentence ("Mary O'Conner updated
     the term Paid meetings") and the time; every row shows its field line
     (Status: Not included → Negotiating).
   - Days (the ledger, us-changelog without --timeline): a heading before
     the first row of each day. With us-changelog--rail (option 5) there is
     no heading: each head carries its date and time on the right, as the
     record cards do, and a line joins the icons of one day's saves,
     broken between days. The rows get us-change--day-start (the day's
     first row), us-change--day-end (its last save's head) and
     us-change--day-tail (field lines after that head) for the line.
   - Events (us-changelog--events with --rail, option 8): the head leads
     with what happened ("Task Added", "Agreement Details Updated",
     "Contact Deleted") with who beside it ("· by Mary O'Conner"), then
     the record's name; the date and time stay on the right.
   - Facets: chips in the theme's filter disclosure, by area on the ledger
     and by action on the timeline (the v1 mock-up's type filter), with the
     count beside the panel title, as the terms panel. A row a chip
     excludes gets the hidden attribute, which the theme's search treats
     as off the page.
   Heads and headings follow the rows still shown, so a filter that hides a
   save's first row moves its head to the next. The rows stay where iMIS put
   them; only the added heads and headings change. */
(function () {
  'use strict';

  if (window.UnionSuiteChangelog) return;

  // title: the record's name in an event title ("Task Added"); the
  // agreement's own fields are its details ("Agreement Details Updated").
  const AREAS = {
    Agreement: {noun: 'the agreement', title: 'Agreement', icon: 'ti-contract'},
    Terms: {noun: 'the term', title: 'Term', icon: 'ti-file-text'},
    Increases: {noun: 'the increase', title: 'Increase', icon: 'ti-chart-line'},
    Contacts: {noun: 'the contact', title: 'Contact', icon: 'ti-users'},
    Tasks: {noun: 'the task', title: 'Task', icon: 'ti-checkbox'},
    Milestones: {noun: 'the milestone', title: 'Milestone', icon: 'ti-flag'},
    Attachments: {noun: 'the attachment', title: 'Attachment', icon: 'ti-paperclip'},
    Meetings: {noun: 'the meeting', title: 'Meeting', icon: 'ti-calendar'},
    Notes: {noun: 'the note', title: 'Note', icon: 'ti-notes'},
    Coverage: {noun: 'the coverage', title: 'Coverage', icon: 'ti-building'}
  };
  const VERBS = {Created: 'created', Added: 'added', Updated: 'updated', Status: 'changed the status of', Removed: 'removed'};
  // Event titles (us-changelog--events, owner, 4 October 2026).
  const EVENT_WORDS = {Created: 'Created', Added: 'Added', Updated: 'Updated', Status: 'Status Changed', Removed: 'Deleted'};
  const ACTION_ORDER = ['Created', 'Added', 'Updated', 'Status', 'Removed'];
  const ACTION_LABELS = {Created: 'Created', Added: 'Added', Updated: 'Updated', Status: 'Status change', Removed: 'Removed'};
  const ACTION_TONES = {Created: 'primary', Added: 'success', Updated: 'warning', Status: 'primary', Removed: 'danger'};
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const states = new WeakMap();

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  const wrapperOf = set => set.closest('.us-changelog');
  const isTimeline = set => wrapperOf(set).classList.contains('us-changelog--timeline');
  const isRail = set => wrapperOf(set).classList.contains('us-changelog--rail');
  const isEvents = set => wrapperOf(set).classList.contains('us-changelog--events');
  const part = (row, name) => (row.querySelector('.us-change__' + name)?.textContent || '').trim();

  function rowsOf(set) {
    return [...set.children]
      .filter(child => child.localName === 'section')
      .map(section => ({section, row: section.querySelector('.us-change')}))
      .filter(entry => entry.row)
      .map(entry => {
        const iso = entry.row.querySelector('.us-change__when')?.getAttribute('datetime') || '';
        const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
        return {
          ...entry,
          set: entry.row.getAttribute('data-us-change-set') || iso,
          area: entry.row.getAttribute('data-us-change-area') || '',
          action: entry.row.getAttribute('data-us-change-action') || '',
          by: part(entry.row, 'by') || 'Someone',
          item: part(entry.row, 'item'),
          day: match ? match[1] + '-' + match[2] + '-' + match[3] : '',
          date: match ? {year: +match[1], month: +match[2], day: +match[3], hour: +(match[4] || 0), minute: +(match[5] || 0)} : null
        };
      });
  }

  // ── Words ───────────────────────────────────────────────────────

  function timeText(date) {
    return (date.hour % 12 || 12) + ':' + String(date.minute).padStart(2, '0') + ' ' + (date.hour < 12 ? 'am' : 'pm');
  }

  function dayText(date, thisYear) {
    const weekday = DAYS[new Date(date.year, date.month - 1, date.day).getDay()];
    return weekday + ' ' + date.day + ' ' + MONTHS[date.month - 1] + (date.year === thisYear ? '' : ' ' + date.year);
  }

  // "1 Oct", with the year outside the current one, as the record cards.
  function shortDate(date, thisYear) {
    return date.day + ' ' + MONTHS[date.month - 1].slice(0, 3) + (date.year === thisYear ? '' : ' ' + date.year);
  }

  function stampText(date, thisYear) {
    return date.day + ' ' + MONTHS[date.month - 1].slice(0, 3) + (date.year === thisYear ? '' : ' ' + date.year) + ', ' + timeText(date);
  }

  // "Mary O'Conner updated the term Paid meetings": the person and the
  // record stand out; the agreement itself has no record name.
  function sentence(entry) {
    const node = el('p', 'us-change__sentence');
    const area = AREAS[entry.area] || {noun: entry.area ? 'the ' + entry.area.toLowerCase() : 'the record'};
    node.append(el('strong', 'us-change__who', entry.by), ' ' + (VERBS[entry.action] || 'changed') + ' ' + area.noun);
    if (entry.item) node.append(' ', el('strong', 'us-change__what', entry.item));
    return node;
  }

  function initials(name) {
    if (/^system$/i.test(name)) return '';
    return name.split(/\s+/).filter(Boolean).map(word => word[0]).filter(letter => /[A-Za-z]/.test(letter)).slice(0, 2).join('').toUpperCase();
  }

  // "Task Added", "Agreement Details Updated", "Contact Deleted".
  function eventTitle(entry) {
    const area = AREAS[entry.area]?.title || entry.area || 'Record';
    const noun = entry.area === 'Agreement' && entry.action === 'Updated' ? 'Agreement Details' : area;
    return noun + ' ' + (EVENT_WORDS[entry.action] || 'Changed');
  }

  function head(entry, timeline, thisYear, rail, events) {
    const node = el('div', 'us-change__head');
    const mark = el('span', 'us-change__mark');
    mark.setAttribute('aria-hidden', 'true');
    if (timeline) {
      const letters = initials(entry.by);
      if (letters) mark.textContent = letters;
      else mark.append(el('i', 'ti ti-settings'));
      mark.classList.add('us-change__mark--person');
    } else {
      mark.append(el('i', 'ti ' + (AREAS[entry.area]?.icon || 'ti-history')));
    }
    node.append(mark);
    if (timeline) {
      const top = el('p', 'us-change__top');
      top.append(el('strong', 'us-change__who', entry.by));
      const badge = el('span', 'us-badge us-badge--' + (ACTION_TONES[entry.action] || 'primary') + ' us-change__badge', ACTION_LABELS[entry.action] || entry.action);
      top.append(badge);
      if (entry.date) top.append(el('span', 'us-change__time', stampText(entry.date, thisYear)));
      node.append(top);
      const what = el('p', 'us-change__sentence');
      const area = AREAS[entry.area] || {noun: 'the record'};
      what.append((VERBS[entry.action] || 'changed').replace(/^./, letter => letter.toUpperCase()) + ' ' + area.noun);
      if (entry.item) what.append(' ', el('strong', 'us-change__what', entry.item));
      node.append(what);
    } else if (events) {
      // What happened, with who beside it ("Task Added · by Mary O'Conner"),
      // then what it happened to; the date and time sit on the right and
      // the field lines follow as the details.
      const title = el('p', 'us-change__title');
      title.append(el('span', 'us-change__event', eventTitle(entry)), ' ', el('span', 'us-change__meta', 'by ' + entry.by));
      node.append(title);
      if (entry.date) {
        const stamp = el('span', 'us-change__stamp');
        const date = el('time', 'us-change__date', shortDate(entry.date, thisYear));
        date.dateTime = entry.day;
        stamp.append(date, el('span', 'us-change__time', timeText(entry.date)));
        node.append(stamp);
      }
      if (entry.item) node.append(el('p', 'us-change__subject', entry.item));
    } else {
      node.append(sentence(entry));
      if (entry.date && rail) {
        // The record cards' side column: the date over the time.
        const stamp = el('span', 'us-change__stamp');
        const date = el('time', 'us-change__date', shortDate(entry.date, thisYear));
        date.dateTime = entry.day;
        stamp.append(date, el('span', 'us-change__time', timeText(entry.date)));
        node.append(stamp);
      } else if (entry.date) {
        node.append(el('span', 'us-change__time', timeText(entry.date)));
      }
    }
    return node;
  }

  // ── Facets ──────────────────────────────────────────────────────

  function facetOf(set) {
    return isTimeline(set) ? 'action' : 'area';
  }

  function facetValues(set, rows) {
    const key = facetOf(set);
    const values = [...new Set(rows.map(row => row[key]).filter(Boolean))];
    if (key === 'action') values.sort((a, b) => ACTION_ORDER.indexOf(a) - ACTION_ORDER.indexOf(b));
    else values.sort((a, b) => Object.keys(AREAS).indexOf(a) - Object.keys(AREAS).indexOf(b));
    return values;
  }

  function chip(value, label) {
    const button = el('button', 'us-contact-chip');
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('data-us-contact-facet-value', value);
    button.append(el('span', '', label), el('span', 'us-contact-chip__count', ''));
    return button;
  }

  function buildStrip(set) {
    const strip = el('div', 'us-contact-facets us-contact-facets--filter');
    const row = el('div', 'us-contact-facets__row');
    row.setAttribute('data-us-contact-facet', facetOf(set));
    row.append(el('span', 'us-contact-facets__label', facetOf(set) === 'action' ? 'Type' : 'Area'), el('div', 'us-contact-facets__chips'));
    strip.append(row);
    return strip;
  }

  function buildHeadingCount() {
    const node = el('span', 'us-contact-facets__heading-count');
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-atomic', 'true');
    const clear = el('button', 'us-contact-facets__clear us-contact-facets__clear--icon');
    clear.type = 'button';
    clear.hidden = true;
    clear.setAttribute('aria-label', 'Clear the change filters');
    clear.title = 'Clear the change filters';
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
      const input = wrapperOf(set)?.querySelector(':scope > .panel > .us-query-search-controls input');
      if (input && input.value) {
        input.value = '';
        input.dispatchEvent(new Event('input', {bubbles: true}));
      }
    } else if (target.classList.contains('us-contact-chip')) {
      const value = target.getAttribute('data-us-contact-facet-value');
      state.filter = state.filter === value ? null : value;
    } else {
      return;
    }
    state.signature = '';
    apply(set);
  }

  function mount(state, set) {
    const wrapper = wrapperOf(set);
    const controls = wrapper.querySelector(':scope > .panel > .us-query-search-controls');
    if (controls) {
      if (controls.firstElementChild !== state.strip) controls.prepend(state.strip);
    } else if (!wrapper.classList.contains('us-query-search')) {
      if (state.strip.nextElementSibling !== set) set.before(state.strip);
    }
    const title = wrapper.querySelector(':scope > .panel > .panel-heading > .panel-title');
    if (title && title.nextElementSibling !== state.headingCount) title.after(state.headingCount);
  }

  // ── Layout ──────────────────────────────────────────────────────

  function apply(set) {
    const state = states.get(set);
    const wrapper = wrapperOf(set);
    if (!state || !wrapper) return;
    const rows = rowsOf(set);
    const key = facetOf(set);
    const values = facetValues(set, rows);
    if (state.filter && !values.includes(state.filter)) state.filter = null;

    // Chips, rebuilt only when the values change.
    mount(state, set);
    const chips = state.strip.querySelector('.us-contact-facets__chips');
    const current = [...chips.children].map(node => node.getAttribute('data-us-contact-facet-value'));
    if (current.join('|') !== values.join('|')) {
      chips.replaceChildren(...values.map(value => chip(value, key === 'action' ? ACTION_LABELS[value] || value : value)));
    }
    chips.querySelectorAll('.us-contact-chip').forEach(node => {
      const value = node.getAttribute('data-us-contact-facet-value');
      node.querySelector('.us-contact-chip__count').textContent = String(rows.filter(row => row[key] === value).length);
      node.setAttribute('aria-pressed', String(state.filter === value));
    });
    state.strip.hidden = values.length < 2;

    // Rows the chip excludes leave the page.
    rows.forEach(row => {
      const hide = !!state.filter && row[key] !== state.filter;
      if (row.section.hidden !== hide) row.section.hidden = hide;
    });
    const shown = rows.filter(row => !row.section.hidden && !row.section.hasAttribute('data-us-query-search-hidden'));

    // The count beside the title, with a clear while anything filters.
    const searching = rows.some(row => row.section.hasAttribute('data-us-query-search-hidden'));
    const noun = rows.length === 1 ? 'change' : 'changes';
    const count = state.headingCount.querySelector('.us-contact-facets__count');
    const clear = state.headingCount.querySelector('.us-contact-facets__clear');
    count.replaceChildren(state.filter || searching ? shown.length + ' of ' + rows.length + ' ' + noun : rows.length + ' ' + noun);
    if (state.filter) count.append(' · ', el('span', 'us-contact-facets__token', key === 'action' ? ACTION_LABELS[state.filter] : state.filter));
    clear.hidden = !(state.filter || searching);
    wrapper.toggleAttribute('data-us-changelog-filtered', !!state.filter);

    // Heads and day headings follow the rows still shown. Redrawn only when
    // that list changes, so the observer below settles.
    const signature = shown.map(row => rows.indexOf(row)).join(',');
    if (signature === state.signature) return;
    state.signature = signature;
    set.querySelectorAll('.us-change__day, .us-change__head').forEach(node => node.remove());
    rows.forEach(row => row.row.classList.remove('us-change--first', 'us-change--last', 'us-change--day-start', 'us-change--day-end', 'us-change--day-tail'));
    const timeline = isTimeline(set);
    const rail = !timeline && isRail(set);
    const events = rail && isEvents(set);
    const thisYear = Number((wrapper.getAttribute('data-us-changelog-today') || new Date().toISOString()).slice(0, 4));
    let day = '', group = '';
    shown.forEach((entry, index) => {
      if (!timeline && entry.day && entry.day !== day) {
        day = entry.day;
        group = '';
        if (!rail) entry.row.prepend(el('h3', 'us-change__day', dayText(entry.date, thisYear)));
      }
      if (entry.set !== group) {
        group = entry.set;
        entry.row.classList.add('us-change--first');
        const heading = head(entry, timeline, thisYear, rail, events);
        const dayHeading = entry.row.querySelector(':scope > .us-change__day');
        if (dayHeading) dayHeading.after(heading);
        else entry.row.prepend(heading);
      }
      const next = shown[index + 1];
      if (!next || next.set !== entry.set) entry.row.classList.add('us-change--last');
    });

    // The rail's line: from the day's first icon down to its last save's
    // icon; nothing after that, so the next day starts a new line.
    if (rail) {
      const days = [];
      shown.forEach(entry => {
        const last = days[days.length - 1];
        if (last && last.day === entry.day) last.rows.push(entry);
        else days.push({day: entry.day, rows: [entry]});
      });
      days.forEach(({rows: dayRows}) => {
        dayRows[0].row.classList.add('us-change--day-start');
        const heads = dayRows.filter(entry => entry.row.classList.contains('us-change--first'));
        const end = heads[heads.length - 1] || dayRows[0];
        end.row.classList.add('us-change--day-end');
        dayRows.slice(dayRows.indexOf(end) + 1).forEach(entry => entry.row.classList.add('us-change--day-tail'));
      });
    }
    wrapper.setAttribute('data-us-changelog-ready', '');
  }

  function stateFor(set) {
    let state = states.get(set);
    if (!state) {
      state = {filter: null, signature: null, strip: buildStrip(set), headingCount: buildHeadingCount()};
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
      document.querySelectorAll('.us-changelog .QueryTemplateSet').forEach(set => {
        if (set.closest('.us-report-no-styling')) return;
        stateFor(set);
        apply(set);
      });
    });
  }

  document.addEventListener('us:panel-actions-ready', schedule);
  document.addEventListener('us:query-template-refreshed', schedule);
  new MutationObserver(records => {
    if (records.some(record => (record.type === 'childList' &&
        [...record.addedNodes, ...record.removedNodes].some(node => node.localName === 'section')) ||
        (record.type === 'attributes' && record.target.closest?.('.us-changelog')))) schedule();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-us-query-search-hidden']});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();

  window.UnionSuiteChangelog = Object.freeze({refresh: schedule, version: '0.1'});
})();
/* US-CHANGELOG:END */
