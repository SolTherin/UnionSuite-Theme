/* US-INCREASES (candidate; increases-compare.html options 2, 3 and 5; option 4
   is decided and in the theme as US-INCREASES on us-increases. This
   candidate runs beside it on its own root class, us-increases-c, and its
   own globals, UnionSuite*Candidate.) — the
   scheduled increases panel, from one Query Template row per increase
   (templates/Agreement-Increases-Rows-Query-Template.html). A Query
   Template cannot aggregate, so the groups and their totals are worked out
   here from data attributes on the rows:
     data-us-increase-kind      General | Class
     data-us-increase-type      Negotiated | CPI | Fixed amount | Percentage
     data-us-increase-class     the class (C1); blank for general
     data-us-increase-percent   a number, blank unless a percentage
     data-us-increase-amount    a number, blank unless a dollar amount
     data-us-increase-period    the dollar basis (per week)
     data-us-increase-date      ISO date (general)
     data-us-increase-months    months in class (class)
   Totals: percentages add (2% then 3% is 5%; owner's example), or compound
   with us-increases--compound (5.06%), an open decision. Dollar amounts add
   separately, per basis. CPI has no number, so it shows as "+ CPI".
   The IQA sorts general first, then each class, so a group is a run of
   rows; every increase must be on one page (rows per page 100).

   Layouts, by iPart CSS class on the us-increases-c wrapper:
     us-increases--grouped   a heading per group (name, count; with
                             us-increases--totals, the group's total too)
     us-increases--totals    a strip above the list: everyone's total,
                             the classes, when it takes effect
     us-increases--expand    one closed row per group, its total in a
                             column; opening it slides in its increases
     us-increases--matrix    general increases as a dated strip, classes as
                             rows and months in class as columns
   The rows the theme renders stay in place: headings sit between them;
   expand and matrix build a view as the set's first child from copies and
   hide the rows (CSS), so the theme's own handling of the rows is
   untouched. Without this script the rows show as one flat list. */
(function () {
  'use strict';
  if (window.UnionSuiteIncreasesCandidate) return;

  const LOCALE = 'en-AU';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // ── Reading the rows ─────────────────────────────────────────

  function number(value) {
    const text = String(value ?? '').replace(/[$,%\s]/g, '');
    if (!text) return null;
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function typeKey(type) {
    if (/cpi/i.test(type)) return 'cpi';
    if (/fixed|\$/i.test(type)) return 'fixed';
    return 'percent';
  }

  function readRow(row, section) {
    const attr = name => (row.getAttribute('data-us-increase-' + name) || '').trim();
    const kind = attr('kind').toLowerCase() === 'class' ? 'class' : 'general';
    const type = attr('type');
    return {
      row,
      section,
      kind,
      type,
      typeKey: typeKey(type),
      className: attr('class'),
      percent: number(attr('percent')),
      amount: number(attr('amount')),
      period: attr('period'),
      date: /^\d{4}-\d{2}-\d{2}/.test(attr('date')) ? attr('date').slice(0, 10) : '',
      months: number(attr('months')),
      when: row.querySelector('.us-increase__when')?.textContent.trim() || '',
      amountText: row.querySelector('.us-increase__amount')?.textContent.trim() || ''
    };
  }

  function rowsOf(set) {
    return [...set.children]
      .filter(child => child.localName === 'section')
      .map(section => ({section, row: section.querySelector('.us-increase')}))
      .filter(entry => entry.row)
      .map((entry, index) => ({...readRow(entry.row, entry.section), index}));
  }

  // Runs of rows with the same kind and class, in IQA order.
  function groupsOf(increases) {
    const groups = [];
    increases.forEach(increase => {
      const name = increase.kind === 'general' ? 'General' : (increase.className || 'No class');
      const last = groups[groups.length - 1];
      if (last && last.name === name && last.kind === increase.kind) last.increases.push(increase);
      else groups.push({name, kind: increase.kind, increases: [increase]});
    });
    return groups;
  }

  // ── Totals ───────────────────────────────────────────────────

  // Six places is enough to stop 0.1 + 0.2 showing as 0.30000000000000004.
  const tidy = value => Math.round(value * 1e6) / 1e6;

  function total(increases, compound) {
    const percents = increases.map(increase => increase.percent).filter(value => value !== null);
    let percent = null;
    if (percents.length) {
      percent = compound
        ? tidy((percents.reduce((product, value) => product * (1 + value / 100), 1) - 1) * 100)
        : tidy(percents.reduce((sum, value) => sum + value, 0));
    }
    const amounts = new Map();
    increases.forEach(increase => {
      if (increase.amount === null) return;
      amounts.set(increase.period, tidy((amounts.get(increase.period) || 0) + increase.amount));
    });
    return {
      percent,
      cpi: increases.some(increase => increase.typeKey === 'cpi' && increase.percent === null),
      amounts: [...amounts].map(([period, amount]) => ({period, amount})),
      compound: Boolean(compound && percents.length > 1)
    };
  }

  function formatPercent(value) {
    return value.toLocaleString(LOCALE, {maximumFractionDigits: 2}) + '%';
  }

  function formatMoney(value) {
    return '$' + value.toLocaleString(LOCALE, {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }

  // The parts of a total, in reading order: "6.5%", "CPI", "$40.00 per week".
  function parts(sum) {
    const list = [];
    if (sum.percent !== null) list.push(formatPercent(sum.percent));
    if (sum.cpi) list.push('CPI');
    sum.amounts.forEach(entry => list.push(formatMoney(entry.amount) + (entry.period ? ' ' + entry.period : '')));
    return list;
  }

  function format(sum) {
    const list = parts(sum);
    return list.length ? list.join(' + ') : '—';
  }

  function formatDate(iso) {
    const [year, month, day] = iso.split('-').map(Number);
    return day + ' ' + MONTHS[month - 1] + ' ' + year;
  }

  // "1 Jul 2026 to 1 Jul 2028", or one date.
  function dateSpan(increases) {
    const dates = increases.map(increase => increase.date).filter(Boolean).sort();
    if (!dates.length) return '';
    const first = formatDate(dates[0]);
    const last = formatDate(dates[dates.length - 1]);
    return first === last ? first : first + ' to ' + last;
  }

  // "after 6 to 12 months", or one number.
  function monthSpan(increases) {
    const months = increases.map(increase => increase.months).filter(value => value !== null).sort((a, b) => a - b);
    if (!months.length) return '';
    const first = months[0];
    const last = months[months.length - 1];
    return 'after ' + (first === last ? first : first + ' to ' + last) + (last === 1 ? ' month' : ' months');
  }

  function countLabel(count, kind) {
    const noun = kind === 'class' ? 'step' : 'increase';
    return count + ' ' + noun + (count === 1 ? '' : 's');
  }

  // "4 increases, 1 Jul 2026 to 1 Jul 2028" or "2 steps, after 6 to 12 months".
  function groupMeta(group) {
    const span = group.kind === 'class' ? monthSpan(group.increases) : dateSpan(group.increases);
    return countLabel(group.increases.length, group.kind) + (span ? ', ' + span : '');
  }

  // ── Shared markup ────────────────────────────────────────────

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // A total as separate parts, so a narrow column wraps between them and
  // never inside "$40.00 per week". The "+" comes from the CSS.
  function totalNode(className, sum) {
    const node = el('span', className);
    const list = parts(sum);
    if (!list.length) node.append(el('span', 'us-increase-sum__part us-increase-sum__part--none', '—'));
    list.forEach(text => node.append(el('span', 'us-increase-sum__part', text)));
    if (sum.compound) node.title = 'Percentages compounded';
    return node;
  }

  function wrapperOf(set) {
    return set.closest('.us-increases-c');
  }

  function isCompound(set) {
    return Boolean(wrapperOf(set)?.classList.contains('us-increases--compound'));
  }

  // What a view was built from; a rebuild with the same key changes nothing.
  function keyOf(set, increases) {
    const wrapper = wrapperOf(set);
    return [wrapper.className, ...increases.map(increase => [
      increase.row.getAttribute('data-us-increase-ordinal'), increase.kind, increase.type, increase.className,
      increase.percent, increase.amount, increase.period, increase.date, increase.months, increase.when, increase.amountText
    ].join('|'))].join('\n');
  }

  // ── Totals strip (us-increases--totals) ──────────────────────

  function buildStrip(groups, compound) {
    const strip = el('dl', 'us-increases-totals');
    const general = groups.filter(group => group.kind === 'general').flatMap(group => group.increases);
    const classes = groups.filter(group => group.kind === 'class');

    const everyone = el('div', 'us-increases-totals__item us-increases-totals__item--everyone');
    everyone.append(el('dt', '', 'Everyone'));
    const everyoneValue = el('dd');
    everyoneValue.append(general.length ? totalNode('us-increase-sum', total(general, compound)) : 'No general increases');
    everyone.append(everyoneValue);
    strip.append(everyone);

    if (classes.length) {
      const item = el('div', 'us-increases-totals__item');
      item.append(el('dt', '', 'By class'));
      const steps = classes.reduce((sum, group) => sum + group.increases.length, 0);
      let text = classes.length + (classes.length === 1 ? ' class, ' : ' classes, ') + countLabel(steps, 'class');
      const ranked = classes
        .map(group => ({name: group.name, percent: total(group.increases, compound).percent}))
        .filter(entry => entry.percent !== null)
        .sort((a, b) => b.percent - a.percent);
      if (ranked.length > 1) text += '; up to ' + formatPercent(ranked[0].percent) + ' (' + ranked[0].name + ')';
      item.append(el('dd', '', text));
      strip.append(item);
    }

    const span = dateSpan(general);
    if (span) {
      const item = el('div', 'us-increases-totals__item');
      item.append(el('dt', '', 'Takes effect'), el('dd', '', span));
      strip.append(item);
    }
    return strip;
  }

  function syncStrip(set, groups, key) {
    const wrapper = wrapperOf(set);
    const existing = set.previousElementSibling?.classList.contains('us-increases-totals') ? set.previousElementSibling : null;
    const wanted = wrapper.classList.contains('us-increases--totals') && groups.length > 0;
    if (!wanted) {
      existing?.remove();
      return;
    }
    if (existing && existing.getAttribute('data-us-increases-key') === key) return;
    const strip = buildStrip(groups, isCompound(set));
    strip.setAttribute('data-us-increases-key', key);
    if (existing) existing.replaceWith(strip);
    else set.before(strip);
  }

  // ── Group headings (us-increases--grouped) ───────────────────

  function buildHeadings(set, groups, key) {
    const existing = [...set.querySelectorAll(':scope > .us-increase-heading')];
    const wanted = wrapperOf(set).classList.contains('us-increases--grouped');
    if (!wanted) {
      existing.forEach(heading => heading.remove());
      return false;
    }
    const placed = existing.length === groups.length && existing.every((heading, index) =>
      heading.getAttribute('data-us-increases-key') === key &&
      heading.nextElementSibling === groups[index].increases[0].section);
    if (placed) return true;
    existing.forEach(heading => heading.remove());
    const withTotals = wrapperOf(set).classList.contains('us-increases--totals');
    const compound = isCompound(set);
    groups.forEach(group => {
      const heading = el('h3', 'us-increase-heading');
      heading.setAttribute('data-us-increase-kind', group.kind);
      heading.setAttribute('data-us-increases-key', key);
      const name = el('span', 'us-increase-heading__name');
      name.append(el('span', '', group.name), el('span', 'us-increase-heading__count', String(group.increases.length)));
      heading.append(name);
      if (withTotals) heading.append(totalNode('us-increase-heading__total us-increase-sum', total(group.increases, compound)));
      group.increases[0].section.before(heading);
    });
    return true;
  }

  // ── Expandable groups (us-increases--expand) ─────────────────

  function buildGroups(groups, compound, openNames) {
    const view = el('div', 'us-increase-groups us-increases-view');
    groups.forEach(group => {
      const details = el('details', 'us-increase-group');
      details.setAttribute('data-us-increase-kind', group.kind);
      details.setAttribute('data-us-increase-group', group.name);
      if (openNames.has(group.name)) details.open = true;

      const summary = el('summary', 'us-increase-group__row');
      const main = el('div', 'us-increase-group__main');
      const meta = el('p', 'us-increase-group__meta', (group.kind === 'general' ? 'Everyone · ' : 'Class · ') + groupMeta(group));
      // How many steps a filter leaves showing (syncFilter).
      meta.append(el('span', 'us-increase-group__shown'));
      main.append(el('h3', 'us-increase-group__title', group.name), meta);
      summary.append(
        el('span', 'us-increase-group__icon'),
        main,
        totalNode('us-increase-group__total us-increase-sum', total(group.increases, compound)),
        el('span', 'us-increase-group__chevron')
      );
      summary.querySelector('.us-increase-group__icon').setAttribute('aria-hidden', 'true');
      summary.querySelector('.us-increase-group__chevron').setAttribute('aria-hidden', 'true');

      const detail = el('div', 'us-increase-group__detail');
      const steps = el('ol', 'us-increase-group__steps');
      group.increases.forEach(increase => {
        const item = el('li', 'us-increase-group__step');
        // The rendered row this step copies, for the filters (syncFilter).
        item.setAttribute('data-us-increase-row', String(increase.index));
        item.append(increase.row.cloneNode(true));
        steps.append(item);
      });
      detail.append(steps);
      details.append(summary, detail);
      view.append(details);
    });
    return view;
  }

  // ── Matrix (us-increases--matrix) ────────────────────────────

  function buildMatrix(groups, compound) {
    const view = el('div', 'us-increase-matrix us-increases-view');
    const general = groups.filter(group => group.kind === 'general').flatMap(group => group.increases);
    const classes = groups.filter(group => group.kind === 'class');

    if (general.length) {
      const block = el('div', 'us-increase-matrix__general');
      const head = el('div', 'us-increase-matrix__head');
      head.append(el('h3', 'us-increase-matrix__title', 'General · everyone'), totalNode('us-increase-matrix__total us-increase-sum', total(general, compound)));
      const line = el('ol', 'us-increase-matrix__timeline');
      general.forEach(increase => {
        const item = el('li', 'us-increase-matrix__event');
        item.setAttribute('data-us-increase-type', increase.type);
        item.append(
          el('span', 'us-increase-matrix__date', increase.when),
          el('span', 'us-increase-matrix__amount', increase.amountText),
          el('span', 'us-increase-matrix__type', increase.type)
        );
        line.append(item);
      });
      block.append(head, line);
      view.append(block);
    }

    if (classes.length) {
      const months = [...new Set(classes.flatMap(group => group.increases.map(increase => increase.months)))]
        .sort((a, b) => (a === null) - (b === null) || a - b);
      const scroller = el('div', 'us-increase-matrix__scroll');
      scroller.tabIndex = 0;
      scroller.setAttribute('role', 'region');
      scroller.setAttribute('aria-label', 'Class increases by months in class');
      const table = el('table', 'us-increase-matrix__table');
      const thead = el('thead');
      const headRow = el('tr');
      headRow.append(el('th', 'us-increase-matrix__class', 'Class'));
      months.forEach(value => {
        const cell = el('th', 'us-increase-matrix__step', value === null ? 'Other' : value + (value === 1 ? ' month' : ' months'));
        headRow.append(cell);
      });
      headRow.append(el('th', 'us-increase-matrix__sum', 'Total'));
      headRow.querySelectorAll('th').forEach(cell => cell.setAttribute('scope', 'col'));
      thead.append(headRow);
      const tbody = el('tbody');
      classes.forEach(group => {
        const row = el('tr');
        const name = el('th', 'us-increase-matrix__class', group.name);
        name.setAttribute('scope', 'row');
        row.append(name);
        months.forEach(value => {
          const cell = el('td', 'us-increase-matrix__step');
          const here = group.increases.filter(increase => increase.months === value);
          if (!here.length) cell.append(el('span', 'us-increase-matrix__empty', '—'));
          here.forEach(increase => {
            const amount = el('span', 'us-increase-matrix__cell', increase.amountText);
            amount.setAttribute('data-us-increase-type', increase.type);
            cell.append(amount);
          });
          row.append(cell);
        });
        const sum = el('td', 'us-increase-matrix__sum');
        sum.append(totalNode('us-increase-sum', total(group.increases, compound)));
        row.append(sum);
        tbody.append(row);
      });
      table.append(thead, tbody);
      scroller.append(table);
      view.append(scroller);
    }
    return view;
  }

  // ── Building ─────────────────────────────────────────────────

  function syncView(set, groups, key) {
    const wrapper = wrapperOf(set);
    const existing = set.querySelector(':scope > .us-increases-view');
    const mode = wrapper.classList.contains('us-increases--expand') ? 'expand'
      : wrapper.classList.contains('us-increases--matrix') ? 'matrix' : null;
    // The rendered rows stay for the theme's search and the filters, out of
    // sight (CSS) and inert, so keyboard and screen reader users meet each
    // increase once, in the view.
    const active = Boolean(mode && groups.length);
    [...set.children].forEach(child => {
      if (child.localName === 'section' && child.inert !== active) child.inert = active;
    });
    if (!active) {
      existing?.remove();
      set.removeAttribute('data-us-increases-view');
      return;
    }
    set.setAttribute('data-us-increases-view', mode);
    if (existing && existing.getAttribute('data-us-increases-key') === key) return;
    const openNames = new Set(existing ? [...existing.querySelectorAll('.us-increase-group[open]')].map(node => node.getAttribute('data-us-increase-group')) : []);
    const view = mode === 'expand' ? buildGroups(groups, isCompound(set), openNames) : buildMatrix(groups, isCompound(set));
    view.setAttribute('data-us-increases-key', key);
    if (existing) existing.replaceWith(view);
    else set.prepend(view);
  }

  // The theme's search and the type chips hide the rendered rows. The
  // expand view is built from copies, so it follows them here: a hidden
  // row's step hides, a group left with none hides, a group with matches
  // opens while the filter is on (and closes again after, if the filter
  // opened it), and each group says how many of its steps show.
  function syncFilter(set) {
    const view = set.querySelector(':scope > .us-increase-groups');
    if (!view) return;
    const sections = [...set.children].filter(child => child.localName === 'section');
    const shown = section => !section.hidden && !section.hasAttribute('data-us-query-search-hidden');
    const filtering = sections.some(section => !shown(section));
    view.querySelectorAll(':scope > .us-increase-group').forEach(group => {
      const steps = [...group.querySelectorAll('.us-increase-group__step')];
      let visible = 0;
      steps.forEach(step => {
        const section = sections[Number(step.getAttribute('data-us-increase-row'))];
        const show = !section || shown(section);
        if (show) visible++;
        if (step.hidden !== !show) step.hidden = !show;
      });
      const hide = filtering && visible === 0;
      if (group.hidden !== hide) group.hidden = hide;
      const note = group.querySelector('.us-increase-group__shown');
      const text = filtering && visible ? '(' + visible + ' of ' + steps.length + ' shown)' : '';
      if (note && note.textContent !== text) note.textContent = text;
      if (filtering && visible && !group.open) {
        group.open = true;
        group.setAttribute('data-us-increase-filter-opened', '');
      } else if (!filtering && group.hasAttribute('data-us-increase-filter-opened')) {
        group.removeAttribute('data-us-increase-filter-opened');
        group.open = false;
      }
    });
  }

  function build(set) {
    const increases = rowsOf(set);
    const groups = groupsOf(increases);
    const key = keyOf(set, increases);
    const headed = buildHeadings(set, groups, key);
    syncStrip(set, groups, key);
    syncView(set, groups, key);
    syncFilter(set);
    // Grouped rows drop the class name each row carries for the flat list.
    set.toggleAttribute('data-us-increases-grouped', headed || set.hasAttribute('data-us-increases-view'));
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      document.querySelectorAll('.us-increases-c .QueryTemplateSet').forEach(set => {
        if (!set.closest('.us-report-no-styling')) build(set);
      });
    });
  }

  // Rows added or removed, a layout class changed, or a filter hid or
  // showed a row. The view and the headings are not sections, so building
  // them does not call back here.
  new MutationObserver(records => {
    if (records.some(record => (record.type === 'childList' &&
        [...record.addedNodes, ...record.removedNodes].some(node => node.localName === 'section')) ||
        (record.attributeName === 'class' && record.target.classList?.contains('us-increases-c')) ||
        (record.attributeName !== 'class' && record.target.localName === 'section' && record.target.closest?.('.us-increases-c')))) schedule();
  }).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'hidden', 'data-us-query-search-hidden']
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();
  document.addEventListener('us:row-patched', schedule);

  window.UnionSuiteIncreasesCandidate = Object.freeze({
    refresh: schedule,
    // For checks: the groups and their totals as the panel shows them.
    totals: set => groupsOf(rowsOf(set)).map(group => ({name: group.name, kind: group.kind, total: format(total(group.increases, isCompound(set)))})),
    format: (increases, compound) => format(total(increases, compound)),
    version: '0.1-candidate'
  });
})();

/* US-INCREASE-EXPAND (candidate; increases-compare.html option 4) — open and
   close us-increases--expand groups with a slide, and close an open group
   from a click anywhere on it, as US-TERM-EXPAND does for the terms rows
   (terms-layouts.candidate.js), which this repeats for the group markup.
   A native <details> shows and hides its content at once, so the summary's
   click is taken over: opening sets the group open with the details
   hidden, then slides them in through the theme's fold()
   (UnionSuiteRecordCards); closing slides them out, then closes the group.
   Instant under reduced motion (fold), and without the theme script.
   Buttons and links keep their own clicks; a click that ends a text
   selection leaves the group open. */
(function () {
  'use strict';
  if (window.UnionSuiteIncreaseExpandCandidate) return;

  const runs = new WeakMap();

  function isOpen(group) {
    return group.open && !group.classList.contains('is-closing');
  }

  function setOpen(group, open) {
    // Opened or closed by hand, the group is no longer the filter's to close.
    group.removeAttribute('data-us-increase-filter-opened');
    const detail = group.querySelector(':scope > .us-increase-group__detail');
    const fold = window.UnionSuiteRecordCards?.fold;
    const run = (runs.get(group) || 0) + 1;
    runs.set(group, run);
    if (!detail || !fold) {
      group.open = open;
      return;
    }
    if (open) {
      group.classList.remove('is-closing');
      if (!group.open) {
        detail.hidden = true;
        group.open = true;
      }
      fold(detail, true);
    } else {
      // The chevron turns back now; the group closes when the slide ends,
      // unless another click has come since.
      group.classList.add('is-closing');
      fold(detail, false).then(() => {
        if (runs.get(group) !== run) return;
        group.open = false;
        detail.hidden = false;
        group.classList.remove('is-closing');
      });
    }
  }

  document.addEventListener('click', event => {
    const group = event.target.closest('.us-increases--expand .us-increase-group');
    if (!group) return;
    const summary = event.target.closest('summary');
    if (summary && summary.parentElement === group) {
      if (event.target.closest('button, a, input, select, textarea')) return;
      event.preventDefault();
      setOpen(group, !isOpen(group));
      return;
    }
    if (!isOpen(group) || event.target.closest('a, button, input, select, textarea, label')) return;
    // A click on an increase in the tray is the increase's (it has the hover
    // and the pencil), so it leaves the group open.
    if (event.target.closest('.us-increase-group__steps')) return;
    if (String(window.getSelection?.() || '').trim()) return;
    setOpen(group, false);
  });

  window.UnionSuiteIncreaseExpandCandidate = Object.freeze({
    open: group => setOpen(group, true),
    close: group => setOpen(group, false),
    version: '0.1-candidate'
  });
})();

/* US-INCREASE-FACETS (candidate; increases-compare.html option 4) — type
   quick filters for a us-increases-c panel with us-query-search, as the terms
   status chips and the contacts' group chips (owner, 4 October 2026: "a
   filter, like the other sections"): one chip per increase type in the list
   (Negotiated, CPI, Fixed amount, Percentage), with a count, inside the
   theme's filter disclosure beside its search; the count beside the panel
   title, with a clear; a dot on the funnel while a chip is pressed. A row
   the chip excludes gets the hidden attribute; the theme's search marks the
   rows it excludes. US-INCREASES carries both into the expand view. The
   chips use the contact facet classes so all three panels match. */
(function () {
  'use strict';
  if (window.UnionSuiteIncreaseFacetsCandidate) return;

  const ORDER = ['negotiated', 'cpi', 'fixed amount', 'percentage'];
  const states = new WeakMap();

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function wrapperOf(set) {
    return set.closest('.us-increases-c.us-query-search');
  }

  function rowsOf(set) {
    return [...set.children]
      .filter(child => child.localName === 'section')
      .map(section => ({section, row: section.querySelector('.us-increase')}))
      .filter(entry => entry.row)
      .map(entry => {
        const label = (entry.row.getAttribute('data-us-increase-type') || '').trim() || 'No type';
        return {section: entry.section, type: label.toLowerCase(), label};
      });
  }

  // The types present, in the order they are described, then any other.
  function types(rows) {
    const labels = new Map();
    rows.forEach(row => {
      if (!labels.has(row.type)) labels.set(row.type, row.label);
    });
    const rank = type => {
      const index = ORDER.indexOf(type);
      return index < 0 ? ORDER.length : index;
    };
    return [...labels.keys()]
      .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
      .map(type => ({type, label: labels.get(type)}));
  }

  function chip(item) {
    const button = el('button', 'us-contact-chip');
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('data-us-contact-facet-value', item.type);
    button.append(el('span', '', item.label), el('span', 'us-contact-chip__count', ''));
    return button;
  }

  function buildStrip() {
    const strip = el('div', 'us-contact-facets us-contact-facets--filter');
    const row = el('div', 'us-contact-facets__row');
    row.setAttribute('data-us-contact-facet', 'type');
    row.append(el('span', 'us-contact-facets__label', 'Type'), el('div', 'us-contact-facets__chips'));
    strip.append(row);
    return strip;
  }

  // Beside the panel title: the count, the pressed type and a clear.
  function buildHeadingCount() {
    const node = el('span', 'us-contact-facets__heading-count');
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-atomic', 'true');
    const clear = el('button', 'us-contact-facets__clear us-contact-facets__clear--icon');
    clear.type = 'button';
    clear.hidden = true;
    clear.setAttribute('aria-label', 'Clear the increase filters');
    clear.title = 'Clear the increase filters';
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
      // The clear also empties the text search, as on the other panels.
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
    apply(set);
  }

  // Chips are rebuilt only when the types change; counts and pressed state
  // update in place, so focus stays on the chip just pressed.
  function syncChips(container, items) {
    const current = [...container.querySelectorAll('.us-contact-chip')];
    const same = current.length === items.length &&
      current.every((node, index) => node.getAttribute('data-us-contact-facet-value') === items[index].type);
    if (!same) container.replaceChildren(...items.map(chip));
  }

  function mount(state, set) {
    const controls = wrapperOf(set).querySelector(':scope > .panel > .us-query-search-controls');
    if (!controls) {
      state.strip.remove();
      return;
    }
    if (controls.firstElementChild !== state.strip) controls.prepend(state.strip);
  }

  function mountHeadingCount(state, set) {
    const title = wrapperOf(set).querySelector(':scope > .panel > .panel-heading > .panel-title');
    if (!title) {
      state.headingCount.remove();
      return;
    }
    if (title.nextElementSibling !== state.headingCount) title.after(state.headingCount);
  }

  function apply(set) {
    const state = states.get(set);
    const wrapper = wrapperOf(set);
    if (!state || !wrapper) return;
    const rows = rowsOf(set);
    const total = rows.length;
    const items = types(rows);
    const noun = total === 1 ? 'increase' : 'increases';
    mountHeadingCount(state, set);
    const count = state.headingCount.querySelector('.us-contact-facets__count');
    const clear = state.headingCount.querySelector('.us-contact-facets__clear');

    // One type, or none: nothing to filter by.
    if (items.length < 2) {
      rows.forEach(row => {
        if (row.section.hidden) row.section.hidden = false;
      });
      state.filter = null;
      state.strip.remove();
      wrapper.removeAttribute('data-us-increase-facet-active');
      count.replaceChildren(total + ' ' + noun);
      clear.hidden = true;
      return;
    }
    mount(state, set);
    if (state.filter && !items.some(item => item.type === state.filter)) state.filter = null;

    const chips = state.strip.querySelector('.us-contact-facets__chips');
    syncChips(chips, items);
    chips.querySelectorAll('.us-contact-chip').forEach(node => {
      const value = node.getAttribute('data-us-contact-facet-value');
      node.querySelector('.us-contact-chip__count').textContent = String(rows.filter(row => row.type === value).length);
      node.setAttribute('aria-pressed', String(state.filter === value));
    });

    // Rows, then the count, which follows the theme's text search too.
    let shown = 0, searching = false;
    rows.forEach(row => {
      const match = !state.filter || row.type === state.filter;
      const searchHidden = row.section.hasAttribute('data-us-query-search-hidden');
      if (searchHidden) searching = true;
      if (match && !searchHidden) shown++;
      if (row.section.hidden !== !match) row.section.hidden = !match;
    });
    const filtered = !!state.filter || searching;
    count.replaceChildren(filtered ? shown + ' of ' + total + ' ' + noun : total + ' ' + noun);
    if (state.filter) count.append(' · ', el('span', 'us-contact-facets__token', items.find(item => item.type === state.filter).label));
    clear.hidden = !filtered;
    wrapper.toggleAttribute('data-us-increase-facet-active', !!state.filter);
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
      document.querySelectorAll('.us-increases-c.us-query-search .QueryTemplateSet').forEach(set => {
        if (set.closest('.us-report-no-styling')) return;
        stateFor(set);
        apply(set);
      });
    });
  }

  // The search controls arrive after the rows (US-QUERY-SEARCH builds them),
  // so their arrival and the search's own marks reschedule this.
  document.addEventListener('us:panel-actions-ready', schedule);
  new MutationObserver(records => {
    if (records.some(record => (record.type === 'childList' &&
        [...record.addedNodes, ...record.removedNodes].some(node => node.localName === 'section' || node.localName === 'div')) ||
        (record.type === 'attributes' && record.target.closest?.('.us-increases-c')))) schedule();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-us-query-search-hidden']});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();

  document.addEventListener('us:row-patched', schedule);
  window.UnionSuiteIncreaseFacetsCandidate = Object.freeze({refresh: schedule, version: '0.1-candidate'});
})();
