/* Option 5 inline reading. WIP only; not installed in UnionSuite.
   Measures the actual list container, including CCO reveal and panel resizing. */
(() => {
  'use strict';
  if (window.UnionSuiteNotesReading) return;

  const rowSelector = '.us-notes--reading .us-note--reading';
  const observedLists = new Map();
  let scheduled = false;
  let nextId = 0;

  function measure(row) {
    if (row.closest('.us-report-no-styling')) return;
    const body = row.querySelector('.us-note__body');
    const toggle = row.querySelector('.us-note__read-toggle');
    if (!body || !toggle || !body.getClientRects().length) return;

    if (!body.id) {
      do { nextId += 1; } while (document.getElementById('us-note-reading-' + nextId));
      body.id = 'us-note-reading-' + nextId;
    }
    toggle.setAttribute('aria-controls', body.id);
    row.classList.add('is-collapsible');
    const expanded = row.classList.contains('is-expanded');
    if (expanded) row.classList.remove('is-expanded');
    const overflows = body.scrollHeight > body.clientHeight + 1;
    if (expanded) row.classList.add('is-expanded');
    toggle.hidden = !overflows && !expanded;
    toggle.setAttribute('aria-expanded', String(expanded));
  }

  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (observedLists.get(entry.target) !== width) {
          observedLists.set(entry.target, width);
          schedule();
        }
      }
    })
    : null;

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      for (const list of observedLists.keys()) {
        if (!list.isConnected) {
          resizeObserver?.unobserve(list);
          observedLists.delete(list);
        }
      }
      document.querySelectorAll('.us-notes--reading .QueryTemplateSet').forEach(list => {
        if (!observedLists.has(list)) {
          observedLists.set(list, -1);
          resizeObserver?.observe(list);
        }
      });
      document.querySelectorAll(rowSelector).forEach(measure);
    });
  }

  document.addEventListener('click', event => {
    const toggle = event.target.closest('.us-note--reading .us-note__read-toggle');
    if (!toggle || toggle.closest('.us-report-no-styling')) return;
    const row = toggle.closest('.us-note--reading');
    const expanded = row.classList.toggle('is-expanded');
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.textContent = expanded ? 'Show less' : 'Read more';
  });

  new MutationObserver(records => {
    if (records.some(record => record.type === 'childList')) schedule();
  }).observe(document.documentElement, {subtree: true, childList: true});
  window.addEventListener('resize', schedule, {passive: true});
  document.fonts?.ready.then(schedule);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();

  window.UnionSuiteNotesReading = Object.freeze({refresh: schedule, version: '0.1-candidate'});
})();
