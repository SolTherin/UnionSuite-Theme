// PROMOTED 4 October 2026: US-COVERAGE-RULES is in zUnionSuite.js.
// US-COVERAGE-TOTALS below was dropped the same day for a Needs Attention
// tracker (data-us-iqa-filter). Kept as history; pages load the theme.
// Agreement coverage rules candidate (decision 15, option 2 chosen 4 October
// 2026; coverage-compare.html). Nothing here is in the theme. Target when
// chosen: zUnionSuite.js, a new block after US-INCREASES.

/* US-COVERAGE-RULES:START — an agreement's coverage rules from one row per
   rule (templates/Agreement-Coverage-Rules-Query-Template.html), on a Query
   Template Display with us-coverage-rules in its CSS class. The rows carry
   the rules table's own values (Rule1, MatchCondition, Rule2), and this
   block shows them the way the CA: Update Covered Contacts flow applies
   them (checked against the flow, 4 October 2026):
   - Groups: consecutive rows with the same data-us-rule-rank are one group.
     The flow ANDs every active rule in a rank and covers a record that
     matches any rank (or). Each group's section gets the rank's label
     ("Rank 2 · all must match"; "all active rules must match" when one is
     inactive) and, after the first group, an "or"; the group's other rows
     get an "and". Sections are marked us-rule-section, --group-first and
     --group-last, and data-us-rule-group holds the rank, so the layout
     class can draw a box per rank around its rules.
   - Words: Rule1 is a CloudToolz table and field (ZenCrm.Organisations.ImisId)
     or the flow's short form (Workplace.ImisId). The table becomes the
     record it means to a reader (Workplace, Member, Job, Member profile,
     Employer, with an icon) and the field a label (ImisId → iMIS ID);
     MatchCondition becomes a phrase (Equals → is, Not Equals → is not).
     The table's values stay on the row (data-us-rule-target,
     data-us-rule-condition).
   - Status: every rule ends with an Enabled (green) or Disabled (red)
     badge; a disabled rule (data-us-rule-enabled 0) gets us-rule--off and
     is struck through lightly. The flow skips disabled rules. A group
     whose rules are all disabled gets us-rule-section--group-off.
   The covered totals are not here: they belong to the covered records
   panel (US-COVERAGE-TOTALS, below; owner, 4 October 2026).
   The rows stay where iMIS put them; the added words and classes are
   redrawn when the rows change. */
(function () {
  'use strict';

  if (window.UnionSuiteCoverageRules) return;

  // The flow's alias map (Create Filters), in readers' words. Keys are
  // Rule1's table part, lower case: the CloudToolz table, or the flow's
  // short name for it.
  const RECORDS = {
    'zencrm.organisations': {label: 'Workplace', icon: 'ti-building'},
    workplace: {label: 'Workplace', icon: 'ti-building'},
    'zencrm.individuals': {label: 'Member', icon: 'ti-user'},
    individuals: {label: 'Member', icon: 'ti-user'},
    'uniontemplate.jobs': {label: 'Job', icon: 'ti-briefcase'},
    'uniontemplate.profile': {label: 'Member profile', icon: 'ti-id-badge-2'},
    profile: {label: 'Member profile', icon: 'ti-id-badge-2'},
    'uniontemplate.orgdetails': {label: 'Employer', icon: 'ti-building-factory-2'},
    employer: {label: 'Employer', icon: 'ti-building-factory-2'}
  };
  const FIELDS = {
    imisid: 'iMIS ID', id: 'iMIS ID', companyid: 'Parent organisation', name: 'Name',
    category: 'Category', status: 'Status', membertype: 'Member type',
    startdate: 'Start date', enddate: 'End date', state: 'State', postcode: 'Postcode'
  };
  // The flow turns Equals into = and Not Equals into <>; nothing else runs.
  const CONDITIONS = {equals: 'is', 'not equals': 'is not', notequals: 'is not'};
  const states = new WeakMap();

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function icon(name) {
    const node = el('i', 'ti ' + name);
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  const wrapperOf = set => set.closest('.us-coverage-rules');
  const yes = value => !/^(false|0|no|n)$/i.test(String(value || '').trim());

  function rowsOf(set) {
    return [...set.children]
      .filter(child => child.localName === 'section')
      .map(section => ({section, row: section.querySelector('.us-rule')}))
      .filter(entry => entry.row)
      .map(entry => ({
        ...entry,
        rank: (entry.row.getAttribute('data-us-rule-rank') || '').trim(),
        enabled: yes(entry.row.getAttribute('data-us-rule-enabled'))
      }));
  }

  // "UnionTemplate.Jobs.StartDate" → the record (Job) and the field (Start date).
  function fieldLabel(name) {
    const known = FIELDS[name.toLowerCase().replace(/[\s_-]/g, '')];
    if (known) return known;
    const words = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(' ');
    return words.map((word, index) => index === 0 ? word.charAt(0).toUpperCase() + word.slice(1)
      : /^(ID|[A-Z0-9]{2,})$/.test(word) ? word : word.toLowerCase()).join(' ');
  }

  // Words for one row, once: the record before the test, the field and the
  // condition in readers' words. The table's own values stay as attributes.
  function word(row) {
    const field = row.querySelector('.us-rule__field');
    if (field && !row.hasAttribute('data-us-rule-target')) {
      const target = field.textContent.trim();
      row.setAttribute('data-us-rule-target', target);
      const cut = target.lastIndexOf('.');
      const table = cut > 0 ? target.slice(0, cut) : '';
      const record = RECORDS[table.toLowerCase()] || {label: table.split('.').pop() || 'Record', icon: 'ti-filter'};
      field.textContent = fieldLabel(cut > 0 ? target.slice(cut + 1) : target);
      const entity = el('span', 'us-rule__entity');
      entity.append(icon(record.icon), record.label);
      const test = row.querySelector('.us-rule__test');
      row.insertBefore(entity, test || field);
    }
    const condition = row.querySelector('.us-rule__condition');
    if (condition && !row.hasAttribute('data-us-rule-condition')) {
      const raw = condition.textContent.trim();
      row.setAttribute('data-us-rule-condition', raw);
      condition.textContent = CONDITIONS[raw.toLowerCase()] || raw.toLowerCase();
    }
  }

  // A plain sign, not a badge (owner, 4 October 2026): the colour and icon
  // carry it, the word says it.
  function status(enabled) {
    const sign = el('span', 'us-rule__status');
    sign.setAttribute('data-us-rule-status', enabled ? 'enabled' : 'disabled');
    sign.append(icon(enabled ? 'ti-circle-check' : 'ti-circle-x'), enabled ? 'Enabled' : 'Disabled');
    return sign;
  }

  function apply(set) {
    const state = states.get(set) || {};
    states.set(set, state);
    const rows = rowsOf(set);
    rows.forEach(entry => word(entry.row));

    const shown = rows.filter(entry => !entry.section.hidden && !entry.section.hasAttribute('data-us-query-search-hidden'));
    const signature = shown.map(entry => rows.indexOf(entry) + ':' + entry.rank + ':' + entry.enabled).join(',');
    if (signature === state.signature) return;
    state.signature = signature;

    set.querySelectorAll('.us-rule__or, .us-rule__and, .us-rule__group, .us-rule__status').forEach(node => node.remove());
    rows.forEach(entry => {
      entry.row.classList.remove('us-rule--off');
      entry.section.classList.remove('us-rule-section', 'us-rule-section--group-first', 'us-rule-section--group-last', 'us-rule-section--group-off');
      entry.section.removeAttribute('data-us-rule-group');
    });

    // Consecutive rows with one rank are a group (the IQA sorts by Rank).
    const groups = [];
    shown.forEach(entry => {
      const last = groups[groups.length - 1];
      if (last && last.rank === entry.rank) last.rows.push(entry);
      else groups.push({rank: entry.rank, rows: [entry]});
    });

    groups.forEach((group, index) => {
      const allOff = group.rows.every(entry => !entry.enabled);
      const someOff = !allOff && group.rows.some(entry => !entry.enabled);
      group.rows.forEach((entry, position) => {
        const {row, section} = entry;
        section.classList.add('us-rule-section');
        section.setAttribute('data-us-rule-group', group.rank || String(index + 1));
        if (allOff) section.classList.add('us-rule-section--group-off');
        if (!entry.enabled) row.classList.add('us-rule--off');
        row.append(status(entry.enabled));
        if (position === 0) {
          section.classList.add('us-rule-section--group-first');
          const label = el('p', 'us-rule__group', 'Rank ' + (group.rank || index + 1));
          if (group.rows.length > 1) {
            label.append(el('span', 'us-rule__group-rule', someOff ? ' · all active rules must match' : ' · all must match'));
          }
          section.prepend(label);
          if (index > 0) section.prepend(el('span', 'us-rule__or', 'or'));
        } else {
          row.prepend(el('span', 'us-rule__and', 'and'));
        }
        if (position === group.rows.length - 1) section.classList.add('us-rule-section--group-last');
      });
    });
    wrapperOf(set).setAttribute('data-us-coverage-ready', '');
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      document.querySelectorAll('.us-coverage-rules .QueryTemplateSet').forEach(set => {
        if (set.closest('.us-report-no-styling')) return;
        apply(set);
      });
    });
  }

  document.addEventListener('us:panel-actions-ready', schedule);
  document.addEventListener('us:query-template-refreshed', schedule);
  new MutationObserver(records => {
    if (records.some(record => (record.type === 'childList' &&
        [...record.addedNodes, ...record.removedNodes].some(node => node.localName === 'section')) ||
        (record.type === 'attributes' && record.target.localName === 'section' && record.target.closest?.('.us-coverage-rules')))) schedule();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-us-query-search-hidden', 'hidden']});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();

  window.UnionSuiteCoverageRules = Object.freeze({refresh: schedule, version: '0.3'});
})();
/* US-COVERAGE-RULES:END */

/* US-COVERAGE-TOTALS:START — the agreement's covered totals beside the
   title of the covered records panel (owner, 4 October 2026): "6
   workplaces · 5,431 members covered". The panel is the existing covered
   records IQA (a native Query Menu), so it is switched on by a class:
   us-coverage-totals in that iPart's CSS class field.
   The totals come from a one-row IQA, QUERY below (proposed), run with
   GET /api/query and filtered on AgreementNum from the page URL (as the
   agreement actions read it). It counts the agreement's rows in
   i4u_UT_CA_Coverage_Members, the covered contacts the CA: Update Covered
   Contacts flow syncs back to iMIS, by the contact's type:
     WorkplaceCount  covered workplaces (organisations)
     MemberCount     covered members (individuals)
   A blank or missing count is left out; with neither, or without an
   AgreementNum, nothing shows. A failed request shows nothing and logs a
   warning. Fetched when the panel appears and again when its report
   refreshes (us:query-template-refreshed, us:panel-actions-ready). */
(function () {
  'use strict';

  if (window.UnionSuiteCoverageTotals) return;

  const QUERY = '$/_i4u_/Core/CA/v2/API - Manage Agreement - Coverage Totals';
  const loaded = new WeakMap();

  const unwrap = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;

  function field(row, name) {
    const properties = unwrap(row?.Properties)?.$values;
    if (Array.isArray(properties)) {
      const match = properties.find(item => String(item.Name).toLowerCase() === name.toLowerCase());
      return match ? unwrap(match.Value) : undefined;
    }
    const key = Object.keys(row || {}).find(item => item.toLowerCase() === name.toLowerCase());
    return key ? unwrap(row[key]) : undefined;
  }

  function agreementNum() {
    const value = new URLSearchParams(location.search).get('AgreementNum') || '';
    return /^\d+$/.test(value) ? value : '';
  }

  async function request(number) {
    const params = new URLSearchParams({QueryName: QUERY, limit: '1', offset: '0', AgreementNum: number});
    const token = document.querySelector('input[name="__RequestVerificationToken"], input#__RequestVerificationToken')?.value;
    const response = await fetch('/api/query?' + params, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {Accept: 'application/json', ...(token ? {RequestVerificationToken: token} : {})}
    });
    if (!response.ok) throw Error('HTTP ' + response.status);
    const data = await response.json();
    const rows = unwrap(data.Items)?.$values ?? unwrap(data.Items);
    if (!Array.isArray(rows)) throw Error('Unexpected response');
    return rows[0] || null;
  }

  function words(row) {
    const parts = [];
    [['WorkplaceCount', 'workplace'], ['MemberCount', 'member']].forEach(([name, noun]) => {
      const raw = String(field(row, name) ?? '').replace(/,/g, '').trim();
      const value = Number(raw);
      if (raw && Number.isFinite(value)) parts.push(value.toLocaleString('en-AU') + ' ' + noun + (value === 1 ? '' : 's'));
    });
    return parts.length ? parts.join(' · ') + ' covered' : '';
  }

  function show(wrapper, text) {
    const title = wrapper.querySelector(':scope > .panel > .panel-heading > .panel-title');
    let node = wrapper.querySelector(':scope > .panel > .panel-heading > .us-coverage-count');
    if (!title || !text) {
      node?.remove();
      return;
    }
    if (!node) {
      node = document.createElement('span');
      node.className = 'us-coverage-count';
      node.setAttribute('role', 'status');
    }
    if (title.nextElementSibling !== node) title.after(node);
    node.textContent = text;
  }

  function load(wrapper) {
    const number = agreementNum();
    if (!number) return;
    const run = (loaded.get(wrapper) || 0) + 1;
    loaded.set(wrapper, run);
    request(number).then(row => {
      if (loaded.get(wrapper) === run) show(wrapper, row ? words(row) : '');
    }, error => {
      console.warn('[US-COVERAGE-TOTALS] Totals did not load:', QUERY, error);
    });
  }

  // newOnly: panels not loaded yet (the theme's panel pass can repeat);
  // otherwise every panel, after its report refreshes.
  function refresh(newOnly) {
    document.querySelectorAll('.us-coverage-totals').forEach(wrapper => {
      if (wrapper.closest('.us-report-no-styling')) return;
      if (newOnly === true && loaded.has(wrapper)) return;
      load(wrapper);
    });
  }

  document.addEventListener('us:panel-actions-ready', () => refresh(true));
  document.addEventListener('us:query-template-refreshed', () => refresh(false));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => refresh(true));
  else refresh(true);

  window.UnionSuiteCoverageTotals = Object.freeze({refresh: () => refresh(false), version: '0.1'});
})();
/* US-COVERAGE-TOTALS:END */
