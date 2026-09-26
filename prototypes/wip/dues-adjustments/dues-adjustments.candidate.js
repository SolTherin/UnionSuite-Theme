/* US-ADJUSTMENTS:START — member dues adjustments list.
   Candidate for zUnionSuite.js, translated from the supplied Union
   Innovation Hub design (supplied/Adjustments-3a.dc.html), which ran on the
   x-dc `DCLogic` runtime. None of that runtime carries over: rows render
   server-side as Query Template results and this script only enhances them.

   Owner: a Query Template Display iPart with the CSS class us-adjustments.
   One result (the author template, see README) is:
     <div class="us-adjustment" data-us-adjustment-status="{#query.Status}">
       <button type="button" class="us-adjustment__row" aria-expanded="false">…</button>
       <div class="us-adjustment__panel" hidden>…</div>
     </div>

   The script adds what one result's template cannot own:
   - column headings above the set (a Query Template has no header template);
   - the active count in the panel title, and a Show historical toggle
     (the IQA icon button, in the heading's utilities where the filter
     button sits), since iMIS generates the heading from the iPart title;
   - an empty state when every row is filtered out;
   - disclosure wiring: ids, aria-controls, one open row at a time;
   - the status badge's tone, from the Status value;
   - removal of the credit meter on rows without a credit.
   With JavaScript off every row still reads, and every detail panel stays
   hidden but present in the source order.

   Config (optional): window.UnionSuiteAdjustmentsConfig = {
     columns: ['Type', 'Period', 'Reason', 'Detail', 'Status'],
     tones: { active: 'success', scheduled: 'primary' },  // us-badge--<tone>
     past: ['expired', 'ended', 'cancelled']               // hidden by default
   } */
(function () {
  'use strict';

  if (window.UnionSuiteAdjustments) {
    window.UnionSuiteAdjustments.refresh();
    return;
  }

  const OWNER = '.us-adjustments';
  let uid = 0;

  const settings = () => ({
    columns: ['Type', 'Period', 'Reason', 'Detail', 'Status'],
    tones: { active: 'success', scheduled: 'primary' },
    past: ['expired', 'ended', 'cancelled'],
    ...(window.UnionSuiteAdjustmentsConfig || {})
  });

  const statusOf = item => String(item.dataset.usAdjustmentStatus || '').trim().toLowerCase();
  const isPast = (item, config) => config.past.includes(statusOf(item));
  const itemsOf = owner => Array.from(owner.querySelectorAll('.QueryTemplateSet .us-adjustment'));
  const rowOf = item => item.querySelector(':scope > .us-adjustment__row');
  const panelOf = item => item.querySelector(':scope > .us-adjustment__panel');

  function owners() {
    const easy = window.gIsEasyEditEnabled === true || document.body.classList.contains('TemplateAreaEasyEditOn');
    if (easy) return [];
    return Array.from(document.querySelectorAll(OWNER))
      .filter(owner => !owner.closest('.us-report-no-styling') &&
        owner.querySelector(':scope > .panel > .panel-body-container > .panel-body > .QueryTemplateSet'));
  }

  function setOpen(item, open) {
    const row = rowOf(item);
    const panel = panelOf(item);
    if (!row || !panel) return;
    row.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
  }

  function toggle(owner, item) {
    const open = rowOf(item).getAttribute('aria-expanded') !== 'true';
    itemsOf(owner).forEach(other => setOpen(other, other === item && open));
  }

  function head(body, config) {
    let row = body.querySelector(':scope > .us-adjustments__head');
    if (row) return;
    row = document.createElement('div');
    row.className = 'us-adjustments__head';
    row.setAttribute('aria-hidden', 'true');
    // The five labels, then an empty cell over the chevron column.
    config.columns.concat('').forEach(text => {
      const cell = document.createElement('span');
      cell.textContent = text;
      row.append(cell);
    });
    body.prepend(row);
  }

  function heading(owner) {
    const bar = owner.querySelector(':scope > .panel > .panel-heading');
    const title = bar?.querySelector('.panel-title');
    let count = title?.querySelector('.us-adjustments__count');
    if (title && !count) {
      count = document.createElement('span');
      count.className = 'us-badge us-badge--primary us-adjustments__count';
      title.append(count);
    }

    // The heading's action area: reuse the theme's, or create it as the theme
    // does, then the utilities group the IQA icon buttons live in.
    let actions = bar?.querySelector(':scope > .us-panel-actions');
    if (bar && !actions) {
      actions = document.createElement('div');
      actions.className = 'us-iqa-report-actions us-panel-actions';
      const slot = document.createElement('div');
      slot.className = 'us-iqa-custom-actions';
      slot.setAttribute('data-us-panel-actions-slot', '');
      actions.append(slot);
      bar.append(actions);
    }
    let utilities = actions?.querySelector(':scope > .us-iqa-report-utilities');
    if (actions && !utilities) {
      utilities = document.createElement('div');
      utilities.className = 'us-iqa-report-utilities';
      actions.append(utilities);
      // Utilities sit after the custom actions, as the tasks list's do. The
      // theme builds its query-display entry after this script and re-appends
      // its slot then, so keep the utilities last whenever that happens. On
      // promotion, build this toggle where the theme builds the tasks toggle
      // (US-QUERY-SEARCH) and this observer goes.
      const keepLast = () => {
        if (utilities.isConnected && actions.lastElementChild !== utilities) actions.append(utilities);
      };
      new MutationObserver(keepLast).observe(actions, { childList: true });
    }

    // A pressed toggle with a stable name, like the tasks list's Show
    // completed toggle: aria-pressed carries the state, so the name does not
    // flip between Show and Hide.
    let historical = utilities?.querySelector('.us-adjustments__historical');
    if (utilities && !historical) {
      historical = document.createElement('button');
      historical.type = 'button';
      historical.className = 'us-adjustments__historical us-iqa-icon-button';
      historical.setAttribute('aria-pressed', 'false');
      const set = owner.querySelector('.QueryTemplateSet');
      if (set) {
        if (!set.id) set.id = 'us-adjustments-set-' + (++uid);
        historical.setAttribute('aria-controls', set.id);
      }
      const glyph = document.createElement('i');
      glyph.className = 'ti ti-history';
      glyph.setAttribute('aria-hidden', 'true');
      historical.append(glyph);
      historical.addEventListener('click', () => {
        const pressed = historical.getAttribute('aria-pressed') === 'true';
        historical.setAttribute('aria-pressed', String(!pressed));
        apply(owner);
      });
      utilities.append(historical);
    }
    return { count, historical };
  }

  function empty(body) {
    let note = body.querySelector(':scope > .us-adjustments__empty');
    if (!note) {
      note = document.createElement('p');
      note.className = 'us-adjustments__empty';
      note.setAttribute('role', 'status');
      body.append(note);
    }
    return note;
  }

  function apply(owner) {
    const config = settings();
    const body = owner.querySelector(':scope > .panel > .panel-body-container > .panel-body');
    const { count, historical } = heading(owner);
    const showPast = historical ? historical.getAttribute('aria-pressed') === 'true' : true;
    const items = itemsOf(owner);
    const past = items.filter(item => isPast(item, config));
    let visible = 0;

    items.forEach(item => {
      const hide = !showPast && isPast(item, config);
      // A hidden row closes first, so no open panel is left out of view.
      if (hide) setOpen(item, false);
      const result = item.closest('.QueryTemplateSet > *') || item;
      result.hidden = hide;
      if (!hide) visible += 1;
    });

    if (count) {
      count.textContent = String(items.length - past.length);
      count.title = (items.length - past.length) + ' current adjustments';
    }
    if (historical) {
      const name = 'Show historical adjustments (' + past.length + ')';
      historical.hidden = past.length === 0;
      historical.setAttribute('aria-label', name);
      historical.title = name;
    }

    const note = empty(body);
    note.hidden = visible > 0;
    note.textContent = past.length
      ? 'No current adjustments. Use Show historical adjustments to see past ones.'
      : 'No adjustments.';
  }

  function prepare(owner) {
    const config = settings();
    const body = owner.querySelector(':scope > .panel > .panel-body-container > .panel-body');
    head(body, config);

    itemsOf(owner).forEach(item => {
      if (item.dataset.usAdjustmentReady) return;
      item.dataset.usAdjustmentReady = 'true';
      const row = rowOf(item);
      const panel = panelOf(item);
      if (!row || !panel) return;

      if (!panel.id) panel.id = 'us-adjustment-' + (++uid);
      row.setAttribute('aria-controls', panel.id);
      row.setAttribute('aria-expanded', String(!panel.hidden));
      row.addEventListener('click', () => toggle(owner, item));

      const badge = item.querySelector('.us-adjustment__status > .us-badge');
      const tone = config.tones[statusOf(item)];
      if (badge && tone) badge.classList.add('us-badge--' + tone);

      // No credit on this row: the IQA left the meter's max empty.
      const meter = item.querySelector('.us-adjustment__meter');
      const progress = meter?.querySelector('progress');
      if (meter && !(Number(progress?.getAttribute('max')) > 0)) meter.remove();
    });

    apply(owner);
  }

  function refresh() {
    owners().forEach(prepare);
  }

  window.UnionSuiteAdjustments = { refresh };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();
})();
/* US-ADJUSTMENTS:END */
