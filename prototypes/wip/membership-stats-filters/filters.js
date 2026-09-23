// OFFLINE MOCKUP ONLY. Generated sample figures, not live IQA results.
// The total matches the 23 September 2026 Stats page (83,091). Everything else
// is invented so that category, type and financial-status filters, and the
// six-month history, all have something to show.
(() => {
  'use strict';

  const period = {current: '1–23 Sept 2026', previous: '1–23 Aug'};
  const EMPTY = null;

  // Apr–Aug are full months; Sept is month to date (23 of 30 days).
  const months = [
    {label: 'Apr', end: '30 Apr', days: 30},
    {label: 'May', end: '31 May', days: 31},
    {label: 'Jun', end: '30 Jun', days: 30},
    {label: 'Jul', end: '31 Jul', days: 31},
    {label: 'Aug', end: '31 Aug', days: 31},
    {label: 'Sept', end: '23 Sept', days: 23, partial: true}
  ];
  // Resignations peak in June, at the end of the financial year.
  const joinSeason = [1.05, 1.2, 0.9, 1.15, 1.3, 1.25];
  const resignSeason = [0.9, 1.0, 1.7, 1.1, 0.9, 0.95];

  const typeNames = ['Regular Member', 'Regular Member - SL', 'Associate Member', 'Student Member'];
  const financialNames = ['Financial', 'Unfinancial', EMPTY];
  // [category, members, type mix, financial mix, monthly join rate, monthly resign rate]
  const groupProfiles = [
    ['Billing Category 1', 26840, [0.70, 0.18, 0.08, 0.04], [0.72, 0.22, 0.06], 0.0060, 0.0040],
    ['Billing Category 2', 19515, [0.62, 0.20, 0.12, 0.06], [0.66, 0.27, 0.07], 0.0050, 0.0045],
    ['Billing Category 3', 14206, [0.55, 0.15, 0.18, 0.12], [0.58, 0.33, 0.09], 0.0045, 0.0050],
    ['Billing Category 4', 9882, [0.40, 0.10, 0.20, 0.30], [0.50, 0.38, 0.12], 0.0080, 0.0060],
    ['Retired', 7904, [0.30, 0.00, 0.70, 0.00], [0.80, 0.15, 0.05], 0.0010, 0.0060],
    [EMPTY, 4744, [0.50, 0.10, 0.20, 0.20], [0.20, 0.35, 0.45], 0.0030, 0.0020]
  ];
  // Students are less likely to be financial; SL members slightly more.
  const typeFinancialBias = [1.0, 1.05, 0.95, 0.7];

  // Seeded random numbers, so the mockup shows the same figures on every load.
  let seed = 20260923;
  const random = () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const noisy = expected => Math.max(0, Math.round(expected * (0.7 + random() * 0.6)));

  const cells = [];
  for (const [group, size, typeMix, financialMix, joinRate, resignRate] of groupProfiles) {
    typeMix.forEach((typeShare, t) => {
      const paidShare = Math.min(0.95, financialMix[0] * typeFinancialBias[t]);
      const rest = (1 - paidShare) / (financialMix[1] + financialMix[2]);
      const mix = [paidShare, financialMix[1] * rest, financialMix[2] * rest];
      mix.forEach((financialShare, f) => {
        const members = Math.round(size * typeShare * financialShare);
        if (!members) return;
        // New members often have no financial status yet; unfinancial members resign more.
        const joinBias = f === 2 ? 1.6 : f === 1 ? 0.6 : 1;
        const resignBias = f === 1 ? 1.8 : f === 2 ? 1.2 : 0.7;
        const joins = months.map((m, i) => noisy(members * joinRate * joinBias * joinSeason[i] * m.days / 30));
        const resigns = months.map((m, i) => noisy(members * resignRate * resignBias * resignSeason[i] * m.days / 30));
        // Same days last month, for the tracker comparison.
        const partOfAugust = count => Math.min(count, Math.round(count * 23 / 31 * (0.85 + random() * 0.3)));
        cells.push({
          group, type: typeNames[t], financial: financialNames[f], members,
          joined: joins[5], resigned: resigns[5],
          joinedBefore: partOfAugust(joins[4]), resignedBefore: partOfAugust(resigns[4]),
          joins, resigns
        });
      });
    });
  }
  // Rounding drifts a few members away from the page total; settle it on the largest cell.
  const drift = 83091 - cells.reduce((total, cell) => total + cell.members, 0);
  cells.reduce((largest, cell) => cell.members > largest.members ? cell : largest).members += drift;

  const dimensions = {
    group: {label: 'Member category', order: ['Billing Category 1', 'Billing Category 2', 'Billing Category 3', 'Billing Category 4', 'Retired', EMPTY]},
    type: {label: 'Membership type', order: ['Regular Member', 'Regular Member - SL', 'Associate Member', 'Student Member']},
    financial: {label: 'Financial status', order: ['Financial', 'Unfinancial', EMPTY]}
  };
  const swatches = {Financial: 'var(--brand-700)', Unfinancial: 'var(--teal-300)', [EMPTY]: 'var(--neutral-300)'};

  const filters = {group: undefined, type: undefined, financial: undefined};
  const isSet = key => filters[key] !== undefined;
  const nameOf = value => value === EMPTY ? '(empty)' : value;
  const number = value => value.toLocaleString('en-AU');
  const percent = (part, whole) => whole ? part / whole * 100 : 0;
  const share = (part, whole) => {
    const value = percent(part, whole);
    if (!whole || value === 0) return '0%';
    if (value < 0.1) return '<0.1%';
    if (value > 99.9 && value < 100) return '>99.9%';
    return value.toFixed(1) + '%';
  };
  const signed = value => value > 0 ? '+' + number(value) : value < 0 ? '−' + number(-value) : '0';

  // A card's own dimension ignores its own filter, so every option stays visible
  // and the selected one is highlighted. All other filters narrow the card.
  const matching = ignore => cells.filter(cell =>
    Object.keys(filters).every(key => key === ignore || !isSet(key) || cell[key] === filters[key]));
  const sum = (rows, field) => rows.reduce((total, row) => total + row[field], 0);
  const byValue = (rows, key) => dimensions[key].order.map(value => {
    const subset = rows.filter(row => row[key] === value);
    return {value, members: sum(subset, 'members'), joined: sum(subset, 'joined'), resigned: sum(subset, 'resigned')};
  });

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const delta = (value, lowerBetter = false) =>
    el('span', 'us-membership__delta' + (value === 0 ? ' is-neutral' : (lowerBetter ? value > 0 : value < 0) ? ' is-negative' : ''), signed(value));

  // One button per option. The button's ::after stretches over the whole row.
  function optionButton(key, value, label) {
    const button = el('button', 'msf-option', label);
    const selected = isSet(key) && filters[key] === value;
    button.type = 'button';
    button.dataset.filter = key;
    button.dataset.value = value === EMPTY ? '' : value;
    button.setAttribute('aria-pressed', String(selected));
    button.title = selected ? 'Clear ' + dimensions[key].label.toLowerCase() + ' filter' : 'Show only ' + nameOf(value);
    return button;
  }
  const rowState = (node, key, value) => {
    node.classList.toggle('is-selected', isSet(key) && filters[key] === value);
    node.classList.toggle('is-dimmed', isSet(key) && filters[key] !== value);
  };

  function scopeText() {
    const parts = Object.keys(dimensions).filter(isSet).map(key => nameOf(filters[key]));
    return parts.length ? parts.join(' · ') : '';
  }

  function renderFilterBar() {
    const bar = document.getElementById('msf-filters'), active = Object.keys(dimensions).filter(isSet);
    const list = el('div', 'msf-filters__chips');
    if (!active.length) list.append(el('span', 'msf-filters__hint', 'Showing all current members. Select a member category, membership type or financial status to filter every card.'));
    for (const key of active) {
      const chip = el('button', 'msf-chip');
      chip.type = 'button';
      chip.dataset.clear = key;
      chip.setAttribute('aria-label', 'Remove filter ' + dimensions[key].label + ': ' + nameOf(filters[key]));
      chip.append(el('span', 'msf-chip__key', dimensions[key].label), el('span', 'msf-chip__value', nameOf(filters[key])), el('span', 'msf-chip__x', '×'));
      list.append(chip);
    }
    const clear = el('button', 'msf-filters__clear', 'Clear all filters');
    clear.type = 'button';
    clear.dataset.clear = 'all';
    clear.hidden = active.length < 2;
    bar.replaceChildren(list, clear);
  }

  function metric(title, value, note) {
    const card = el('div', 'us-membership__metric'), p = el('p');
    card.append(el('h3', '', title), el('strong', '', number(value)));
    p.append(note);
    card.append(p);
    return card;
  }
  function comparison(current, previous, lowerBetter) {
    const change = current - previous, fragment = document.createDocumentFragment();
    fragment.append(delta(change, lowerBetter));
    fragment.append(previous ? ' (' + (change > 0 ? '+' : change < 0 ? '−' : '') + (Math.abs(change) / previous * 100).toFixed(1) + '%)' : ' (previously 0)');
    fragment.append(el('span', 'us-membership__comparison-period', 'vs ' + period.previous));
    return fragment;
  }

  function renderSummary() {
    const rows = matching(), all = sum(cells, 'members'), total = sum(rows, 'members');
    const paid = sum(rows.filter(row => row.financial === 'Financial'), 'members');
    const filtered = Object.keys(dimensions).some(isSet);
    const grid = el('div', 'us-membership__metrics');
    grid.append(
      metric(filtered ? 'Selected members' : 'Total members', total, filtered ? share(total, all) + ' of ' + number(all) + ' current members' : 'Current membership'),
      metric('Financial members', paid, share(paid, total) + ' of ' + (filtered ? 'selected' : 'current') + ' members'),
      metric('Joined this month', sum(rows, 'joined'), comparison(sum(rows, 'joined'), sum(rows, 'joinedBefore'), false)),
      metric('Resigned this month', sum(rows, 'resigned'), comparison(sum(rows, 'resigned'), sum(rows, 'resignedBefore'), true)));
    const scope = scopeText();
    document.querySelector('[data-msf="summary"] .us-membership__content').replaceChildren(grid,
      el('p', 'us-membership__period', 'Month to date: ' + period.current + ' · Compared with the same days in the previous month.' + (scope ? ' Filtered to ' + scope + '.' : '')));
  }

  function renderFinancial() {
    const rows = byValue(matching('financial'), 'financial'), total = rows.reduce((t, r) => t + r.members, 0);
    const paid = rows.find(row => row.value === 'Financial').members;
    const body = el('div', 'us-membership__financial'), donut = el('div', 'us-membership__donut'), legend = el('dl', 'us-membership__legend msf-legend');
    let stop = 0;
    const segments = [];
    for (const row of rows) {
      const colour = isSet('financial') && filters.financial !== row.value ? 'var(--neutral-200)' : swatches[row.value];
      const next = stop + percent(row.members, total);
      segments.push(colour + ' ' + stop + '% ' + next + '%');
      stop = next;
      const entry = el('div', 'msf-row');
      entry.style.setProperty('--us-membership-swatch', swatches[row.value]);
      const dt = el('dt');
      dt.append(optionButton('financial', row.value, nameOf(row.value)));
      entry.append(dt, el('dd', '', number(row.members)));
      rowState(entry, 'financial', row.value);
      legend.append(entry);
    }
    donut.style.background = total ? 'conic-gradient(' + segments.join(',') + ')' : 'var(--neutral-200)';
    donut.setAttribute('role', 'img');
    donut.setAttribute('aria-label', rows.map(row => nameOf(row.value) + ': ' + number(row.members)).join('. '));
    const centre = el('div'), shown = isSet('financial') ? rows.find(row => row.value === filters.financial).members : paid;
    centre.append(el('strong', '', share(shown, total).replace(/^[<>]/, '')), el('span', '', isSet('financial') ? nameOf(filters.financial).toLowerCase() : 'financial'));
    donut.append(centre);
    const unassigned = rows.find(row => row.value === EMPTY).members;
    body.append(donut, legend, el('p', 'us-membership__note', total
      ? (unassigned ? number(unassigned) + ' members have no financial status assigned. They are included in the total.' : 'All selected members have a financial status.')
      : 'No members match the other filters.'));
    document.querySelector('[data-msf="financial"] .us-membership__content').replaceChildren(body);
  }

  function renderGroups() {
    const rows = byValue(matching('group'), 'group');
    const scroll = el('div', 'us-membership__table-scroll'), table = el('table', 'msf-table');
    scroll.tabIndex = 0;
    scroll.setAttribute('role', 'region');
    scroll.setAttribute('aria-label', 'Membership by member category');
    table.append(el('caption', 'us-membership__sr', 'Current members and month-to-date joins and resignations by member category. Select a category to filter the page.'));
    const head = el('thead'), headers = el('tr');
    for (const text of ['Member category', 'Members', 'Joined', 'Resigned', 'Net change']) {
      const th = el('th', '', text);
      th.scope = 'col';
      headers.append(th);
    }
    head.append(headers);
    const line = (label, members, joins, exits) => {
      const tr = el('tr'), th = el('th');
      th.scope = 'row';
      th.append(label);
      tr.append(th);
      for (const n of [members, joins, exits]) tr.append(el('td', '', number(n)));
      const net = el('td');
      net.append(delta(joins - exits));
      tr.append(net);
      return tr;
    };
    const body = el('tbody');
    for (const row of rows) {
      const tr = line(optionButton('group', row.value, nameOf(row.value)), row.members, row.joined, row.resigned);
      tr.className = 'msf-row';
      rowState(tr, 'group', row.value);
      body.append(tr);
    }
    const totals = rows.reduce((t, r) => ({members: t.members + r.members, joined: t.joined + r.joined, resigned: t.resigned + r.resigned}), {members: 0, joined: 0, resigned: 0});
    const foot = el('tfoot');
    foot.append(line('Total', totals.members, totals.joined, totals.resigned));
    table.append(head, body, foot);
    scroll.append(table);
    document.querySelector('[data-msf="groups"] .us-membership__content').replaceChildren(scroll,
      el('p', 'us-membership__note us-membership__note--inset', 'Members are current counts. Joined, resigned and net change cover ' + period.current + '.'));
  }

  function renderTypes() {
    const rows = byValue(matching('type'), 'type'), total = rows.reduce((t, r) => t + r.members, 0);
    const body = el('div', 'us-membership__body'), list = el('dl', 'us-membership__bars msf-bars');
    for (const row of rows) {
      const entry = el('div', 'msf-row'), dt = el('dt'), dd = el('dd', '', number(row.members));
      dt.append(optionButton('type', row.value, nameOf(row.value)));
      dd.append(el('span', '', share(row.members, total)));
      const bar = el('div', 'us-membership__bar'), fill = el('span');
      bar.setAttribute('aria-hidden', 'true');
      fill.style.width = percent(row.members, total) + '%';
      bar.append(fill);
      entry.append(dt, dd, bar);
      rowState(entry, 'type', row.value);
      list.append(entry);
    }
    body.append(list, el('p', 'us-membership__note', total ? number(total) + ' ' + (Object.keys(dimensions).some(key => key !== 'type' && isSet(key)) ? 'matching' : 'current') + ' members across all membership types.' : 'No members match the other filters.'));
    document.querySelector('[data-msf="types"] .us-membership__content').replaceChildren(body);
  }

  // History: month-end counts are worked backwards from today's members,
  // removing each month's joins and adding back its resignations.
  function history(rows) {
    const points = months.map((month, i) => ({...month, joined: 0, resigned: 0, members: 0}));
    for (const row of rows) points.forEach((point, i) => {
      point.joined += row.joins[i];
      point.resigned += row.resigns[i];
    });
    points[5].members = sum(rows, 'members');
    for (let i = 4; i >= 0; i--) points[i].members = points[i + 1].members - points[i + 1].joined + points[i + 1].resigned;
    return points;
  }

  const SVG = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs = {}, text) => {
    const node = document.createElementNS(SVG, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const niceStep = range => {
    const rough = range / 3, power = 10 ** Math.floor(Math.log10(rough || 1)), unit = rough / power;
    return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power;
  };
  const compact = (value, step) => step >= 1000 && Math.abs(value) >= 10000 ? (value / 1000).toLocaleString('en-AU', {maximumFractionDigits: 1}) + 'k' : number(value);
  const plot = {left: 52, right: 16, top: 14, bottom: 26};

  function frame(width, height, ticks, y) {
    const svg = svgEl('svg', {width, height, viewBox: '0 0 ' + width + ' ' + height, class: 'msf-chart__svg'});
    for (const tick of ticks) {
      svg.append(svgEl('line', {x1: plot.left, x2: width - plot.right, y1: y(tick), y2: y(tick), class: 'msf-chart__grid'}));
      svg.append(svgEl('text', {x: plot.left - 8, y: y(tick), class: 'msf-chart__tick', 'text-anchor': 'end', 'dominant-baseline': 'middle'}, compact(tick, ticks[1] - ticks[0])));
    }
    return svg;
  }
  function monthAxis(svg, x, height) {
    months.forEach((month, i) => svg.append(svgEl('text', {x: x(i), y: height - 6, class: 'msf-chart__tick', 'text-anchor': 'middle'}, month.label + (month.partial ? '*' : ''))));
  }
  // Hover bands are wider than the marks; each band carries its month index.
  function hoverBands(svg, x, band, height) {
    months.forEach((month, i) => svg.append(svgEl('rect', {x: x(i) - band / 2, y: 0, width: band, height: height - plot.bottom, class: 'msf-chart__band', 'data-i': i})));
  }

  function lineChart(points, width) {
    const height = 190, values = points.map(point => point.members);
    const low = Math.min(...values), high = Math.max(...values), pad = Math.max((high - low) * 0.25, 4);
    const step = niceStep(high - low + pad * 2), from = Math.floor((low - pad) / step) * step, to = Math.ceil((high + pad) / step) * step;
    const ticks = [];
    for (let tick = from; tick <= to + step / 2; tick += step) ticks.push(tick);
    const band = (width - plot.left - plot.right) / months.length;
    const x = i => plot.left + band * (i + 0.5), y = value => plot.top + (to - value) / (to - from || 1) * (height - plot.top - plot.bottom);
    const svg = frame(width, height, ticks, y);
    monthAxis(svg, x, height);
    const path = points.slice(0, 5).map((point, i) => (i ? 'L' : 'M') + x(i) + ' ' + y(point.members)).join(' ');
    svg.append(svgEl('path', {d: path, class: 'msf-chart__line'}));
    svg.append(svgEl('path', {d: 'M' + x(4) + ' ' + y(points[4].members) + ' L' + x(5) + ' ' + y(points[5].members), class: 'msf-chart__line is-partial'}));
    points.forEach((point, i) => {
      const group = svgEl('g', {class: 'msf-chart__hover', 'data-i': i});
      group.append(svgEl('line', {x1: x(i), x2: x(i), y1: plot.top, y2: height - plot.bottom, class: 'msf-chart__crosshair'}));
      group.append(svgEl('circle', {cx: x(i), cy: y(point.members), r: 5, class: 'msf-chart__marker'}));
      svg.append(group);
    });
    // Direct label on the latest point only.
    svg.append(svgEl('circle', {cx: x(5), cy: y(points[5].members), r: 4, class: 'msf-chart__marker is-latest'}));
    svg.append(svgEl('text', {x: x(5), y: y(points[5].members) - 12, class: 'msf-chart__label', 'text-anchor': 'middle'}, number(points[5].members)));
    hoverBands(svg, x, band, height);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Members at month end: ' + points.map(point => point.end + ' ' + number(point.members)).join(', ') + '.');
    return svg;
  }

  function flowChart(points, width) {
    const height = 150, high = Math.max(1, ...points.flatMap(point => [point.joined, point.resigned]));
    const step = niceStep(high), to = Math.ceil(high / step) * step, ticks = [];
    for (let tick = 0; tick <= to + step / 2; tick += step) ticks.push(tick);
    const band = (width - plot.left - plot.right) / months.length;
    const x = i => plot.left + band * (i + 0.5), y = value => plot.top + (to - value) / to * (height - plot.top - plot.bottom);
    const svg = frame(width, height, ticks, y), barWidth = Math.max(6, Math.min(18, band * 0.26));
    monthAxis(svg, x, height);
    // Rounded 4px data end, square at the baseline.
    const bar = (left, value, className) => {
      if (!value) return;
      const top = y(value), bottom = y(0), r = Math.min(4, (bottom - top), barWidth / 2);
      svg.append(svgEl('path', {class: className, d: `M${left} ${bottom}V${top + r}Q${left} ${top} ${left + r} ${top}H${left + barWidth - r}Q${left + barWidth} ${top} ${left + barWidth} ${top + r}V${bottom}Z`}));
    };
    points.forEach((point, i) => {
      const group = svgEl('g', {class: 'msf-chart__hover', 'data-i': i});
      group.append(svgEl('rect', {x: x(i) - band / 2 + 4, y: plot.top, width: band - 8, height: height - plot.top - plot.bottom, rx: 4, class: 'msf-chart__column-hover'}));
      svg.append(group);
      bar(x(i) - barWidth - 1, point.joined, 'msf-chart__bar is-joined' + (point.partial ? ' is-partial' : ''));
      bar(x(i) + 1, point.resigned, 'msf-chart__bar is-resigned' + (point.partial ? ' is-partial' : ''));
    });
    svg.append(svgEl('line', {x1: plot.left, x2: width - plot.right, y1: y(0), y2: y(0), class: 'msf-chart__baseline'}));
    hoverBands(svg, x, band, height);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Joined and resigned by month: ' + points.map(point => point.label + ' ' + point.joined + ' joined, ' + point.resigned + ' resigned').join('; ') + '.');
    return svg;
  }

  function historyTable(points) {
    const scroll = el('div', 'us-membership__table-scroll msf-trend__table'), table = el('table');
    table.append(el('caption', 'us-membership__sr', 'Members at month end, with joins and resignations for each month.'));
    const head = el('thead'), headers = el('tr');
    for (const text of ['Month', 'Members at month end', 'Joined', 'Resigned', 'Net change']) {
      const th = el('th', '', text);
      th.scope = 'col';
      headers.append(th);
    }
    head.append(headers);
    const body = el('tbody');
    for (const point of points) {
      const tr = el('tr'), th = el('th', '', point.end + (point.partial ? ' (to date)' : ''));
      th.scope = 'row';
      tr.append(th);
      for (const n of [point.members, point.joined, point.resigned]) tr.append(el('td', '', number(n)));
      const net = el('td');
      net.append(delta(point.joined - point.resigned));
      tr.append(net);
      body.append(tr);
    }
    table.append(head, body);
    scroll.append(table);
    return scroll;
  }

  let showTable = false, hoverIndex = -1, trendPoints = [];
  function tooltip(host) {
    let tip = host.querySelector('.msf-tip');
    if (hoverIndex < 0) {
      tip?.remove();
      host.querySelectorAll('.msf-chart__hover').forEach(node => node.classList.remove('is-active'));
      return;
    }
    const point = trendPoints[hoverIndex];
    host.querySelectorAll('.msf-chart__hover').forEach(node => node.classList.toggle('is-active', Number(node.dataset.i) === hoverIndex));
    if (!tip) {
      tip = el('div', 'msf-tip');
      tip.setAttribute('aria-hidden', 'true');
      host.append(tip);
    }
    const line = (label, value, swatch) => {
      const row = el('div', 'msf-tip__row' + (swatch ? ' has-swatch' : ''));
      if (swatch) row.style.setProperty('--msf-swatch', swatch);
      row.append(el('span', '', label), value);
      return row;
    };
    tip.replaceChildren(el('strong', 'msf-tip__title', point.end + (point.partial ? ' · month to date' : ' · month end')),
      line('Members', el('b', '', number(point.members))),
      line('Joined', el('b', '', number(point.joined)), 'var(--teal-600)'),
      line('Resigned', el('b', '', number(point.resigned)), 'var(--accent-700)'),
      line('Net change', delta(point.joined - point.resigned)));
    const band = host.querySelector('.msf-chart__band[data-i="' + hoverIndex + '"]').getBoundingClientRect(), box = host.getBoundingClientRect();
    const centre = band.left + band.width / 2 - box.left, width = tip.offsetWidth;
    tip.style.left = Math.max(8, Math.min(box.width - width - 8, centre + 14 > box.width - width - 8 ? centre - width - 14 : centre + 14)) + 'px';
    tip.style.top = '64px';
  }

  function renderTrend() {
    const host = document.querySelector('[data-msf="trend"] .us-membership__content'), width = Math.max(280, host.clientWidth - 40);
    const points = trendPoints = history(matching()), change = points[5].members - points[0].members;
    const summary = el('div', 'msf-trend__summary'), headline = el('p', 'msf-trend__headline');
    headline.append(el('strong', '', number(points[5].members)), el('span', '', 'members at 23 Sept'));
    const since = el('p', 'msf-trend__change');
    since.append(delta(change), ' since 30 Apr · ' + number(sum(points.slice(1), 'joined')) + ' joined, ' + number(sum(points.slice(1), 'resigned')) + ' resigned');
    summary.append(headline, since);

    const line = el('div', 'msf-chart');
    line.append(el('h3', 'msf-chart__title', 'Members at month end'), lineChart(points, width));
    const legend = el('div', 'msf-chart__legend');
    for (const [label, swatch] of [['Joined', 'var(--teal-600)'], ['Resigned', 'var(--accent-700)']]) {
      const item = el('span', '', label);
      item.style.setProperty('--msf-swatch', swatch);
      legend.append(item);
    }
    const flowHead = el('div', 'msf-chart__head');
    flowHead.append(el('h3', 'msf-chart__title', 'Joined and resigned'), legend);
    const flow = el('div', 'msf-chart');
    flow.append(flowHead, flowChart(points, width));

    const charts = el('div', 'msf-trend__charts');
    charts.append(line, flow);
    charts.hidden = showTable;
    const table = historyTable(points);
    table.hidden = !showTable;
    host.replaceChildren(summary, charts, table, el('p', 'us-membership__note us-membership__note--inset', '* Sept is month to date (1–23 Sept), shown dashed. Earlier months are full calendar months. Sample history only.'));
    const toggle = document.querySelector('[data-msf-table]');
    toggle.textContent = showTable ? 'Show chart' : 'Show table';
    toggle.setAttribute('aria-pressed', String(showTable));
    tooltip(host);
  }

  function renderHeadings() {
    const scope = scopeText();
    for (const node of document.querySelectorAll('[data-msf-scope]')) {
      const own = node.dataset.msfScope;
      const others = Object.keys(dimensions).filter(key => key !== own && isSet(key)).map(key => nameOf(filters[key]));
      node.textContent = others.length ? others.join(' · ') : node.dataset.msfDefault;
    }
    document.getElementById('msf-announce').textContent = scope ? 'Filtered to ' + scope + '.' : 'Showing all current members.';
  }

  function render() {
    renderFilterBar();
    renderSummary();
    renderFinancial();
    renderGroups();
    renderTypes();
    renderTrend();
    renderHeadings();
  }

  function refocus(key, value) {
    const selector = key ? '.msf-option[data-filter="' + key + '"][data-value="' + CSS.escape(value) + '"]' : '#msf-filters .msf-chip, .msf-option';
    document.querySelector(selector)?.focus();
  }

  document.addEventListener('click', event => {
    const option = event.target.closest('.msf-option'), clear = event.target.closest('[data-clear]'), toggle = event.target.closest('[data-msf-table]');
    if (toggle) {
      showTable = !showTable;
      hoverIndex = -1;
      renderTrend();
    } else if (option) {
      const key = option.dataset.filter, value = option.dataset.value === '' ? EMPTY : option.dataset.value;
      filters[key] = isSet(key) && filters[key] === value ? undefined : value;
      render();
      refocus(key, option.dataset.value);
    } else if (clear) {
      for (const key of Object.keys(filters)) if (clear.dataset.clear === 'all' || clear.dataset.clear === key) filters[key] = undefined;
      render();
      refocus();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && Object.keys(dimensions).some(isSet)) {
      for (const key of Object.keys(filters)) filters[key] = undefined;
      render();
    }
  });

  // Shared hover: pointing at a month in either chart highlights it in both.
  const trendHost = document.querySelector('[data-msf="trend"] .us-membership__content');
  trendHost.addEventListener('pointermove', event => {
    const band = event.target.closest('.msf-chart__band'), next = band ? Number(band.dataset.i) : -1;
    if (next !== hoverIndex) {
      hoverIndex = next;
      tooltip(trendHost);
    }
  });
  trendHost.addEventListener('pointerleave', () => {
    hoverIndex = -1;
    tooltip(trendHost);
  });
  let lastWidth = 0;
  new ResizeObserver(() => {
    if (Math.abs(trendHost.clientWidth - lastWidth) < 2) return;
    lastWidth = trendHost.clientWidth;
    renderTrend();
  }).observe(trendHost);

  render();
})();
