/* US-ADJUSTMENTS:START — Active and upcoming adjustments list.
   Candidate for zUnionSuite.js, translated from the supplied Union
   Innovation Hub design (supplied/Adjustments-3a.dc.html), which ran on the
   x-dc `DCLogic` runtime. None of that runtime carries over: rows render
   server-side as Query Template results and this script only enhances them.
   The All adjustments grid is a native Query Menu and needs no script here.

   Owner: a Query Template Display iPart with the CSS class us-adjustments.
   Its Header field holds the column headings and its No results field the
   empty message, so the script adds neither. One result (the Query Template,
   see README) is:
     <div class="us-adjustment" data-us-adjustment-status="{#query.Status}">
       <button type="button" class="us-adjustment__row" aria-expanded="false">…</button>
       <div class="us-adjustment__panel" hidden>…</div>
     </div>

   The script adds what the templates cannot:
   - the result count beside the panel title (iMIS generates the heading);
   - disclosure wiring: ids, aria-controls, one open row at a time, with the
     activity history's fold animation (US-RECORD-CARDS) when it is loaded;
   - the status badge's tone, from the Status value;
   - relative time under a date: "in 12 days" for an upcoming start,
     "11 days left" for an active end, marked when it ends soon;
   - removal of the credit meter on rows without a credit.
   With JavaScript off every row still reads, and every detail panel stays
   hidden but present in the source order.

   Config (optional): window.UnionSuiteAdjustmentsConfig = {
     tones: { active: 'success', upcoming: 'primary' },  // us-badge--<tone>
     soonDays: 30,     // an active end within this many days is marked soon
     today: null       // 'YYYY-MM-DD' to pin today (previews only)
   } */
(function () {
  'use strict';

  if (window.UnionSuiteAdjustments) {
    window.UnionSuiteAdjustments.refresh();
    return;
  }

  const OWNER = '.us-adjustments';
  const DAY = 86400000;
  let uid = 0;

  const settings = () => ({
    tones: { active: 'success', upcoming: 'primary' },
    soonDays: 30,
    today: null,
    ...(window.UnionSuiteAdjustmentsConfig || {})
  });

  const statusOf = item => String(item.dataset.usAdjustmentStatus || '').trim().toLowerCase();
  const itemsOf = owner => Array.from(owner.querySelectorAll('.QueryTemplateSet .us-adjustment'));
  const rowOf = item => item.querySelector(':scope > .us-adjustment__row');
  const panelOf = item => item.querySelector(':scope > .us-adjustment__panel');

  function owners() {
    const easy = window.gIsEasyEditEnabled === true || document.body.classList.contains('TemplateAreaEasyEditOn');
    if (easy) return [];
    return Array.from(document.querySelectorAll(OWNER))
      .filter(owner => !owner.closest('.us-report-no-styling') &&
        owner.querySelector(':scope > .panel > .panel-body-container > .panel-body'));
  }

  // --- Relative time ----------------------------------------------------------

  function startOfDay(value) {
    const date = value ? new Date(value + 'T00:00:00') : new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  // Whole days from today to an ISO date, or null when the field is blank
  // (an open end, such as a credit "until exhausted").
  function daysUntil(iso, today) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || '').trim())) return null;
    return Math.round((startOfDay(iso) - today) / DAY);
  }

  function span(days) {
    if (days === 1) return '1 day';
    if (days < 14) return days + ' days';
    if (days < 60) return Math.round(days / 7) + ' weeks';
    const months = Math.round(days / 30);
    return months === 1 ? '1 month' : months + ' months';
  }

  function setWhen(cell, text, soon) {
    let note = cell.querySelector(':scope > .us-adjustment__when');
    if (!text) {
      if (note) note.remove();
      return;
    }
    if (!note) {
      note = document.createElement('span');
      note.className = 'us-adjustment__when';
      cell.append(note);
    }
    // The leading space keeps the date and this text apart in the row
    // button's accessible name; it collapses away visually in both layouts.
    note.textContent = ' ' + text;
    note.classList.toggle('us-adjustment__when--soon', Boolean(soon));
  }

  function relative(item, config, today) {
    const starts = item.querySelector('.us-adjustment__starts');
    const ends = item.querySelector('.us-adjustment__ends');
    const dateIn = cell => cell?.querySelector('[data-us-adjustment-date]')?.dataset.usAdjustmentDate;
    const status = statusOf(item);

    if (starts) {
      const days = daysUntil(dateIn(starts), today);
      const upcoming = status === 'upcoming' && days !== null && days >= 0;
      setWhen(starts, upcoming ? (days === 0 ? 'today' : 'in ' + span(days)) : '');
    }
    if (ends) {
      const days = daysUntil(dateIn(ends), today);
      const running = status === 'active' && days !== null && days >= 0;
      const text = running ? (days === 0 ? 'ends today' : span(days) + ' left') : '';
      setWhen(ends, text, running && days <= config.soonDays);
    }
  }

  // --- Disclosure ---------------------------------------------------------------

  // The detail panel folds open and closed exactly as the activity history's
  // records do: US-RECORD-CARDS fold() (height, padding and fade, 220ms, the
  // theme's easing, reversible mid-way, instant under reduced motion). Without
  // that helper the panel simply shows and hides.
  function fold(panel, open) {
    const shared = window.UnionSuiteRecordCards?.fold;
    if (shared) return shared(panel, open);
    panel.hidden = !open;
    return Promise.resolve();
  }

  function setOpen(item, open) {
    const row = rowOf(item);
    const panel = panelOf(item);
    if (!row || !panel) return;
    row.setAttribute('aria-expanded', String(open));
    fold(panel, open);
  }

  function toggle(owner, item) {
    const open = rowOf(item).getAttribute('aria-expanded') !== 'true';
    itemsOf(owner).forEach(other => setOpen(other, other === item && open));
  }

  // --- Heading count ------------------------------------------------------------

  function count(owner, total) {
    const title = owner.querySelector(':scope > .panel > .panel-heading .panel-title');
    if (!title) return;
    let badge = title.querySelector('.us-adjustments__count');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'us-badge us-badge--primary us-adjustments__count';
      title.append(badge);
    }
    badge.textContent = String(total);
    badge.title = total + (total === 1 ? ' adjustment' : ' adjustments');
    badge.hidden = total === 0;
  }

  // --- Setup --------------------------------------------------------------------

  function prepare(owner) {
    const config = settings();
    const today = startOfDay(config.today);
    const items = itemsOf(owner);

    items.forEach(item => {
      relative(item, config, today);
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

    count(owner, items.length);
  }

  function refresh() {
    owners().forEach(prepare);
  }

  window.UnionSuiteAdjustments = { refresh };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();
})();
/* US-ADJUSTMENTS:END */
