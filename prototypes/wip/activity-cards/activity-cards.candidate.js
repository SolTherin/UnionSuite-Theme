/* US-RECORD-CARDS:START — expand and collapse record cards (candidate).
   One delegated handler for every .us-record, whether a Query Template
   rendered it or US-ACTIVITY-FEED did, so templates need no script. The
   toggle button is the accessible control; a click anywhere on the card head
   that is not a link or control does the same. Without this script the
   details stay hidden and View still opens the record.
   Details slide open and closed with fold(), which is also exposed for other
   parts of the card family (filter panels, records filtering in and out).
   Target when approved: zUnionSuite.js, beside the list behaviours; fold()
   belongs with the shared filter-toggle helper (root TODO.md). */
(function () {
  'use strict';

  if (window.UnionSuiteRecordCards) return;

  // The theme's fold timing (US-QUERY-SEARCH filters), a touch longer for
  // details, which carry more content.
  const EASE = 'cubic-bezier(.2, 0, 0, 1)';
  const DETAIL_DURATION = 220;
  const ZERO = {
    height: '0px',
    paddingTop: '0px',
    paddingBottom: '0px',
    marginTop: '0px',
    marginBottom: '0px',
    borderTopWidth: '0px',
    borderBottomWidth: '0px',
    opacity: '0'
  };
  const running = new WeakMap();
  let detailId = 0;

  const reducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  // The element's current box, including any animation in progress, so a
  // reversed toggle carries on from where it is instead of jumping.
  function frame(element) {
    const style = getComputedStyle(element);
    return {
      height: element.getBoundingClientRect().height + 'px',
      paddingTop: style.paddingTop,
      paddingBottom: style.paddingBottom,
      marginTop: style.marginTop,
      marginBottom: style.marginBottom,
      borderTopWidth: style.borderTopWidth,
      borderBottomWidth: style.borderBottomWidth,
      opacity: style.opacity
    };
  }

  // Shows or hides an element with a height and fade transition; the
  // element's hidden attribute holds the final state. Resolves when done.
  function fold(element, open, duration = DETAIL_DURATION) {
    const current = running.get(element);
    if (!current && element.hidden === !open) return Promise.resolve();
    if (reducedMotion() || !element.animate) {
      current?.cancel();
      running.delete(element);
      element.hidden = !open;
      return Promise.resolve();
    }
    element.style.boxSizing = 'border-box';
    const start = element.hidden ? ZERO : frame(element);
    current?.cancel();
    element.hidden = false;
    element.style.overflow = 'hidden';
    const end = open ? frame(element) : ZERO;
    const animation = element.animate([start, end], { duration, easing: EASE });
    running.set(element, animation);
    return animation.finished.then(() => {
      if (running.get(element) !== animation) return;
      running.delete(element);
      element.hidden = !open;
      element.style.overflow = '';
      element.style.boxSizing = '';
    }, () => {});
  }

  function setExpanded(record, open) {
    const toggle = record.querySelector('.us-record__toggle');
    const detail = record.querySelector('.us-record__detail');
    if (!toggle || !detail) return;
    // Templates carry no IDs: the same record can appear in two lists on one
    // page, so the pairing is made here, uniquely, on first use.
    if (!detail.id) detail.id = 'us-record-detail-' + (++detailId);
    toggle.setAttribute('aria-controls', detail.id);
    toggle.setAttribute('aria-expanded', String(open));
    const text = record.querySelector('.us-record__text');
    const before = text ? text.getBoundingClientRect().height : 0;
    record.classList.toggle('is-expanded', open);
    if (text) growText(text, before);
    fold(detail, open);
  }

  // The note text is clamped to two lines until the card opens. Its height
  // change animates alongside the details, so the card never jumps.
  function growText(text, before) {
    running.get(text)?.cancel();
    const after = text.getBoundingClientRect().height;
    if (reducedMotion() || !text.animate || Math.abs(after - before) < 1) return;
    text.style.overflow = 'hidden';
    const animation = text.animate([{ height: before + 'px' }, { height: after + 'px' }], { duration: DETAIL_DURATION, easing: EASE });
    running.set(text, animation);
    animation.finished.then(() => {
      if (running.get(text) !== animation) return;
      running.delete(text);
      text.style.overflow = '';
    }, () => {});
  }

  document.addEventListener('click', event => {
    const record = event.target.closest('.us-record');
    if (!record) return;
    const toggle = event.target.closest('.us-record__toggle');
    const onHead = event.target.closest('.us-record__head') && !event.target.closest('a, button, input, select, textarea');
    if (!toggle && !onHead) return;
    const button = record.querySelector('.us-record__toggle');
    if (!button) return;
    setExpanded(record, button.getAttribute('aria-expanded') !== 'true');
  });

  window.UnionSuiteRecordCards = {
    expand: record => setExpanded(record, true),
    collapse: record => setExpanded(record, false),
    fold
  };
})();
/* US-RECORD-CARDS:END */
