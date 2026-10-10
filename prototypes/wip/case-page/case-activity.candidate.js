/* US-ACTIVITY-LOAD-ALL (C10, candidate) — a Load all button for the
   activity feed (owner, 8 October 2026: Recent activity needs a load all
   that respects the timeframe filter). Target: US-ACTIVITY-FEED in
   zUnionSuite.js, as a native option.

   Opt in with data-us-activity-load-all on the .us-activity-feed element.
   The button sits beside Show more and shows only while Show more does.
   Pressing it presses Show more until the feed has nothing more to show,
   waiting for each page to load, so it pages exactly as Show more does:
   the chosen timeframe, type filter and every source's paging stay the
   feed's own. A search hides Show more (search covers loaded rows only),
   and so this button too.

   On promotion, replace the presses with the feed's own state (set the
   shown count to everything and fill), keeping the same button, wording
   and opt-in attribute. The feed's limit on requests per fill still
   applies; a very long history may need a second press. */
(function () {
  'use strict';
  if (window.UnionSuiteActivityLoadAll) return;

  const SELECTOR = '.us-activity-feed[data-us-activity-load-all]';
  const MAX_PRESSES = 200;
  const WAIT_MS = 30000;
  let queued = false;

  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

  // Show more is disabled while a page loads; wait until it is free again.
  async function settled(more) {
    const until = Date.now() + WAIT_MS;
    while (more.isConnected && more.disabled && Date.now() < until) await pause(50);
  }

  async function loadAll(feed, button) {
    feed.setAttribute('data-us-loading-all', '');
    button.disabled = true;
    button.textContent = 'Loading all…';
    try {
      for (let presses = 0; presses < MAX_PRESSES; presses++) {
        const more = feed.querySelector('.us-activity__more');
        if (!more) break;
        await settled(more);
        if (more.hidden || more.disabled) break;
        more.click();
        // Let the feed start its page before checking again.
        await pause(30);
      }
    } finally {
      feed.removeAttribute('data-us-loading-all');
      button.disabled = false;
      button.textContent = 'Load all';
      sync(feed);
    }
  }

  function sync(feed) {
    const more = feed.querySelector('.us-activity__more');
    if (!more) return;
    let button = feed.querySelector('.us-activity__all');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'TextButton SmallButton us-outline-button us-activity__all';
      button.textContent = 'Load all';
      const body = more.getAttribute('aria-controls');
      if (body) button.setAttribute('aria-controls', body);
      button.addEventListener('click', () => loadAll(feed, button));
    }
    if (button.previousElementSibling !== more) more.after(button);
    if (!feed.hasAttribute('data-us-loading-all')) button.hidden = more.hidden;
  }

  function refresh() {
    queued = false;
    document.querySelectorAll(SELECTOR).forEach(sync);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refresh);
  }

  // The feed builds its footer when it attaches and toggles Show more as
  // it renders; follow both.
  new MutationObserver(records => {
    if (records.some(record => record.type === 'childList' || record.target.classList?.contains('us-activity__more'))) schedule();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'disabled']});

  window.UnionSuiteActivityLoadAll = Object.freeze({refresh});

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();
})();

/* US-ACTIVITY-WINDOW (C19, candidate) — a feed locked to a recent window,
   for the case Overview's Recent activity (owner, 8 October 2026: the last
   30 days; the full timeline is on the Activity tab). Target: US-ACTIVITY-
   FEED in zUnionSuite.js, as a native fixed-window option.

   Opt in with data-us-activity-window="<days>" on the .us-activity-feed.
   The theme's feed offers no fixed choice and no 30 days, so the window is
   the source IQAs' own (each filters to the last <days> days) and the feed
   asks All time. This then:
   - hides the timeframe choice (CSS), which would offer windows the IQAs
     cannot give;
   - reads "last <days> days" where the feed says "all time" (the count) or
     "recorded" (the empty message);
   - makes the footer link (data-us-activity-history) View all activity,
     opening the Activity tab's All activity section through the theme's
     section link (data-us-section-link, data-us-cco-tab). */
(function () {
  'use strict';
  if (window.UnionSuiteActivityWindow) return;

  const SELECTOR = '.us-activity-feed[data-us-activity-window]';
  let queued = false;

  function relabel(feed) {
    const days = Number.parseInt(feed.getAttribute('data-us-activity-window'), 10);
    if (!days) return;
    const span = 'last ' + days + ' days';
    const status = feed.querySelector('.us-activity__status');
    if (status && /all time/.test(status.textContent)) status.textContent = status.textContent.replace(/all time/, span);
    feed.querySelectorAll('.us-activity__body p').forEach(message => {
      if (/ recorded\.$/.test(message.textContent)) message.textContent = message.textContent.replace(/ recorded\.$/, ' in the ' + span + '.');
    });
    const link = feed.parentElement?.querySelector('.us-activity__history') || feed.querySelector('.us-activity__history');
    if (link && !link.hasAttribute('data-us-section-link')) {
      link.setAttribute('data-us-section-link', 'activity:all');
      link.setAttribute('data-us-cco-tab', 'Activity');
      link.textContent = 'View all activity';
    }
  }

  function refresh() {
    queued = false;
    document.querySelectorAll(SELECTOR).forEach(relabel);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refresh);
  }

  // The feed rewrites its count and body as it loads and filters.
  new MutationObserver(records => {
    if (records.some(record => (record.target.nodeType === 1 ? record.target : record.target.parentElement)?.closest?.(SELECTOR))) schedule();
  }).observe(document.documentElement, {subtree: true, childList: true, characterData: true});

  window.UnionSuiteActivityWindow = Object.freeze({refresh});

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();
})();

/* US-ACTIVITY-FILTERS-OPEN (C24, candidate) — the feed's filters start
   open (owner, 9 October 2026: filters "on by default on all items in the
   activities tab"). Target: US-ACTIVITY-FEED in zUnionSuite.js, as a
   native option (filtersOpen starts true).

   Opt in with data-us-activity-filters-open on the .us-activity-feed. A
   wide feed shows its filters inline anyway; a narrow one folds them
   behind the heading's funnel, closed. This opens them, once, the first
   time the feed is narrow with them closed, by pressing the funnel, so
   the feed's own state knows. Closing them afterwards is left alone. */
(function () {
  'use strict';
  if (window.UnionSuiteActivityFiltersOpen) return;

  const SELECTOR = '.us-activity-feed[data-us-activity-filters-open]:not([data-us-activity-filters-opened])';
  let queued = false;

  function open(feed) {
    const toggle = feed.closest('.panel')?.querySelector(':scope > .panel-heading .us-activity__utilities:not([hidden]) .us-iqa-filter-toggle');
    if (!toggle || toggle.getAttribute('aria-expanded') !== 'false') return;
    feed.setAttribute('data-us-activity-filters-opened', '');
    toggle.click();
  }

  function refresh() {
    queued = false;
    document.querySelectorAll(SELECTOR).forEach(open);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refresh);
  }

  // The funnel arrives with the feed and shows or hides as it fits.
  new MutationObserver(records => {
    if (records.some(record => record.type === 'childList' || record.target.classList?.contains('us-activity__utilities'))) schedule();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['hidden']});

  window.UnionSuiteActivityFiltersOpen = Object.freeze({refresh});

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();
})();

/* Case timeline cards and Details view (C27 to C29, C31, candidates; owner,
   9 October 2026). Target: US-ACTIVITY-FEED in zUnionSuite.js, as source
   options. Each reads the feed's own source list (.us-activity__sources,
   which stays in the page) to know a card's source: a card's
   data-us-activity-id is "<data-source>:<ActivityKey>".

   C27 Details view. On a feed whose iPart carries us-activity-details, a
   source's data-history="#<key>" names a detailed iPart on the page,
   marked us-activity-detail-<key>. The theme shows its View all link while
   that type is chosen; here the link gives way to a Details view toggle
   button (aria-pressed) in the panel heading, first among its buttons
   (owner, 9 October 2026), which swaps the timeline and its search for
   the detailed iPart, right under the filters. Pressing it again, or
   choosing another type, brings the timeline back. On promotion the
   theme's link becomes this button when data-history starts with #.

   C28 Open button label. data-record-label (and data-record-icon, a Tabler
   class) on a source relabel its cards' View full details: emails read
   View email, with an eye.

   C29 Restricted notes. A source's data-restricted is the Summary its IQA
   returns for a restricted note ("Restricted", as the Notes IQA returns
   it). Such a card shows the notes screen's restricted notice, and the
   theme's Show note (US-NOTES-RESTRICTED) checks access for the note whose
   ordinal is the ActivityKey's digits.

   C31 Changes. A change card's Detail, one "Field: old → new" per line,
   becomes a list in the expanded view.

   The chosen type (owner, 9 October 2026). The feed's iPart carries
   data-us-activity-type, the chosen type filter ("all", "note",
   "meeting" …), so the CSS shows the heading's add button for that type
   only: Add note for Notes, Add meeting for Meetings, Upload for Attachments.

   One type (the Changes section; owner, 9 October 2026). A details feed
   whose sources are all one type has nothing to filter: it chooses that
   type once (so its Details view shows from the start) and is marked
   data-us-activity-single, which hides the All · Changes filters. */
(function () {
  'use strict';
  if (window.UnionSuiteCaseTimeline) return;

  const EASE = 'cubic-bezier(.2, 0, 0, 1)';
  const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let queued = false;

  function sourceOf(record) {
    const feed = record.closest('.us-activity-feed');
    const key = (record.dataset.usActivityId || '').split(':')[0];
    return feed && key ? feed.querySelector(`.us-activity__sources > li[data-source="${CSS.escape(key)}"]`) : null;
  }

  // ── C27 Details view ──────────────────────────────────────────
  const panelFor = key => key ? document.querySelector('.us-activity-detail-' + CSS.escape(key)) : null;

  // The toggle lives in the feed's panel heading, among its buttons.
  const panelOf = feed => feed.closest('.panel');
  const toggleOf = feed => panelOf(feed)?.querySelector(':scope > .panel-heading .us-activity__details-toggle');
  const feedOf = toggle => toggle.closest('.panel')?.querySelector('.us-activity-feed');

  function headingSlot(feed) {
    const heading = panelOf(feed)?.querySelector(':scope > .panel-heading');
    if (!heading) return null;
    let actions = heading.querySelector(':scope > .us-panel-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'us-iqa-report-actions us-panel-actions';
      heading.append(actions);
    }
    return actions.querySelector(':scope > [data-us-panel-actions-slot]') || actions;
  }

  // The chosen type: the one just pressed, or the feed's active filter.
  const typeOf = (feed, chosen) => chosen || feed.querySelector('.us-activity__types button.is-active')?.dataset.usTab || 'all';

  // Shown, at once, for a chosen type whose source names a detailed view
  // (not after the theme's View all link has faded out, 150ms later).
  function syncToggle(feed, chosen) {
    if (!feed.querySelector('.us-activity__types')) return;
    let button = toggleOf(feed);
    if (!button) {
      const slot = headingSlot(feed);
      if (!slot) return;
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'us-panel-action TextButton us-outline-button us-activity__details-toggle';
      button.setAttribute('aria-pressed', 'false');
      button.hidden = true;
      button.innerHTML = '<i class="ti ti-list-details" aria-hidden="true"></i>Details view';
      slot.prepend(button);
    }
    const type = typeOf(feed, chosen);
    const source = type === 'all' ? null : feed.querySelector(`.us-activity__sources > li[data-type="${CSS.escape(type)}"][data-history^="#"]`);
    const key = source ? source.getAttribute('data-history').slice(1) : '';
    const panel = panelFor(key);
    const show = Boolean(panel);
    button.dataset.key = key;
    // A heading redrawn by the theme loses the button; the feed keeps the state.
    button.setAttribute('aria-pressed', String(Boolean(key) && feed.getAttribute('data-us-activity-showing') === key));
    if (panel?.id) button.setAttribute('aria-controls', panel.id);
    if (button.hidden === !show) return;
    button.hidden = !show;
    if (show && !still()) button.animate([{opacity: 0, transform: 'translateX(-4px)'}, {opacity: 1, transform: 'none'}], {duration: 180, easing: EASE});
  }

  // ── C36 Section link ───────────────────────────────────────────
  // A source's data-section-link (with data-section-tab and
  // data-section-label) puts a link in the heading while its type is
  // chosen, through the theme's section links: Attachments shows View all
  // attachments, opening the Attachments tab (owner, 9 October 2026).
  function syncSectionLink(feed, chosen) {
    if (!feed.querySelector('.us-activity__types')) return;
    const type = typeOf(feed, chosen);
    const source = type === 'all' ? null : feed.querySelector(`.us-activity__sources > li[data-type="${CSS.escape(type)}"][data-section-link]`);
    let link = panelOf(feed)?.querySelector(':scope > .panel-heading .us-activity__section-link');
    if (!source) {
      if (link) link.hidden = true;
      return;
    }
    if (!link) {
      const slot = headingSlot(feed);
      if (!slot) return;
      link = document.createElement('a');
      link.className = 'us-panel-action TextButton us-outline-button us-activity__section-link';
      link.href = '#';
      link.hidden = true;
      slot.prepend(link);
    }
    link.setAttribute('data-us-section-link', source.getAttribute('data-section-link'));
    const tab = source.getAttribute('data-section-tab');
    if (tab) link.setAttribute('data-us-cco-tab', tab);
    else link.removeAttribute('data-us-cco-tab');
    const label = source.getAttribute('data-section-label') || 'View all';
    if (link.textContent !== label) {
      link.textContent = label;
      link.insertAdjacentHTML('beforeend', '<i class="ti ti-arrow-right" aria-hidden="true"></i>');
    }
    if (!link.hidden) return;
    link.hidden = false;
    if (!still()) link.animate([{opacity: 0, transform: 'translateX(-4px)'}, {opacity: 1, transform: 'none'}], {duration: 180, easing: EASE});
  }

  function showDetails(feed, key) {
    const current = feed.getAttribute('data-us-activity-showing');
    if (current === key || (!current && !key)) return;
    panelFor(current)?.classList.remove('is-open');
    toggleOf(feed)?.setAttribute('aria-pressed', String(Boolean(key)));
    if (!key) {
      feed.removeAttribute('data-us-activity-showing');
      reveal(feed.querySelector('.us-activity__body'));
      return;
    }
    feed.setAttribute('data-us-activity-showing', key);
    const panel = panelFor(key);
    panel.classList.add('is-open');
    reveal(panel);
  }

  function reveal(element) {
    if (!element || still()) return;
    element.animate([{opacity: 0, transform: 'translateY(-4px)'}, {opacity: 1, transform: 'none'}], {duration: 200, easing: EASE});
  }

  document.addEventListener('click', event => {
    const toggle = event.target.closest('.us-activity-details .us-activity__details-toggle');
    if (toggle) {
      const feed = feedOf(toggle);
      if (!feed) return;
      const key = toggle.dataset.key;
      if (panelFor(key)) showDetails(feed, feed.getAttribute('data-us-activity-showing') === key ? null : key);
      return;
    }
    const type = event.target.closest('.us-activity-details .us-activity__types button');
    if (type) {
      const feed = type.closest('.us-activity-feed');
      showDetails(feed, null);
      syncToggle(feed, type.dataset.usTab);
      syncSectionLink(feed, type.dataset.usTab);
      chosenType(feed, type.dataset.usTab);
      schedule();
    }
  });

  // ── C28, C29 and C31, per card ─────────────────────────────────
  function card(record) {
    const source = sourceOf(record);
    if (!source) return;

    const label = source.getAttribute('data-record-label');
    const open = record.querySelector('.us-record__more a');
    if (label && open && !open.hasAttribute('data-us-record-label')) {
      open.setAttribute('data-us-record-label', '');
      open.textContent = label;
      const icon = (source.getAttribute('data-record-icon') || '').replace(/[^\w-]/g, '');
      if (icon) open.insertAdjacentHTML('afterbegin', `<i class="ti ${icon}" aria-hidden="true"></i>`);
    }

    const restricted = source.getAttribute('data-restricted');
    const text = record.querySelector('.us-record__text');
    if (restricted && text && !text.querySelector('.us-restricted-note') && text.textContent.trim() === restricted) {
      const ordinal = (record.dataset.usActivityId.split(':')[1] || '').replace(/\D/g, '');
      const notice = document.createElement('span');
      notice.className = 'us-restricted-note';
      notice.textContent = restricted;
      text.classList.add('us-note__body');
      text.replaceChildren(notice);
      const holder = record.querySelector('.us-record__card');
      holder.classList.add('us-note');
      const key = document.createElement('span');
      key.hidden = true;
      key.setAttribute('data-ordinal', ordinal);
      holder.append(key);
      window.UnionSuiteRestrictedNotes?.refresh();
    }

    if (record.dataset.usRecordType === 'change') {
      const body = record.querySelector('.us-record__detail > .us-record__body');
      if (body && !body.hasAttribute('data-us-change-list')) {
        const lines = body.textContent.split('\n').map(line => line.trim()).filter(Boolean);
        body.setAttribute('data-us-change-list', '');
        const list = document.createElement('ul');
        list.className = 'us-record__changes';
        lines.forEach(line => {
          const item = document.createElement('li');
          const split = line.indexOf(':');
          if (split > 0) {
            const field = document.createElement('span');
            field.className = 'us-record__change-field';
            field.textContent = line.slice(0, split);
            item.append(field, line.slice(split + 1).trim());
          } else {
            item.textContent = line;
          }
          list.append(item);
        });
        body.replaceChildren(list);
      }
    }
  }

  function single(feed) {
    if (feed.hasAttribute('data-us-activity-single')) return;
    const types = [...feed.querySelectorAll('.us-activity__types button[data-us-tab]')].filter(button => button.dataset.usTab !== 'all');
    if (types.length !== 1) return;
    feed.setAttribute('data-us-activity-single', '');
    types[0].click();
  }

  function chosenType(feed, chosen) {
    const wrapper = feed.closest('.us-activity-details');
    const type = typeOf(feed, chosen);
    if (wrapper && wrapper.getAttribute('data-us-activity-type') !== type) wrapper.setAttribute('data-us-activity-type', type);
  }

  // C41 A refreshed feed keeps its type (owner, 10 October 2026): a refresh
  // (a save elsewhere on the page) builds the feed again, on All. The type
  // chosen in each section is remembered against the section, which
  // outlives the refresh, and chosen again once the new feed has its type
  // filters. Target: US-ACTIVITY-FEED, remembering its own type.
  const remembered = new WeakMap();
  const restored = new WeakSet();

  document.addEventListener('click', event => {
    const chip = event.target.closest?.('.us-activity__types button[data-us-tab]');
    const section = chip?.closest('.ContentItemContainer > div');
    if (section) remembered.set(section, chip.dataset.usTab);
  }, true);

  function keepType(feed) {
    if (restored.has(feed)) return;
    const want = remembered.get(feed.closest('.ContentItemContainer > div'));
    if (!want) {
      restored.add(feed);
      return;
    }
    const chip = feed.querySelector(`.us-activity__types button[data-us-tab="${CSS.escape(want)}"]`);
    if (!chip) return;
    restored.add(feed);
    if (!chip.classList.contains('is-active')) chip.click();
  }

  function refresh() {
    queued = false;
    document.querySelectorAll('.us-activity-feed').forEach(keepType);
    document.querySelectorAll('.us-activity-details .us-activity-feed').forEach(single);
    document.querySelectorAll('.us-activity-details .us-activity-feed').forEach(feed => chosenType(feed));
    document.querySelectorAll('.us-activity-details .us-activity-feed').forEach(feed => syncToggle(feed));
    document.querySelectorAll('.us-activity-details .us-activity-feed').forEach(feed => syncSectionLink(feed));
    document.querySelectorAll('.us-activity-feed .us-record[data-us-activity-id]').forEach(card);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refresh);
  }

  // Cards arrive as the feed renders and pages; the View all link changes
  // with the chosen type.
  new MutationObserver(records => {
    if (records.some(record => record.type === 'childList' || record.target.classList?.contains('us-activity__type-history'))) schedule();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'href']});

  window.UnionSuiteCaseTimeline = Object.freeze({refresh, showDetails});

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();
})();
