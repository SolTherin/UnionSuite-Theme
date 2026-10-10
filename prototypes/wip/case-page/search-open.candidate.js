/* US-QUERY-SEARCH-OPEN (C24, candidate) — a list's filters start open
   (owner, 9 October 2026: the Activity tab's Tasks, Meetings and Notes use
   the standard filter toggle, "on by default on all items in the
   activities tab"). Retires C12, which moved the search into the heading.
   Target: US-QUERY-SEARCH in zUnionSuite.js, as an opt-in class.

   Opt in with us-query-search-open beside us-query-search (the Activity
   tab's presets add it). The heading keeps the theme's funnel, and the
   filter area below it starts open rather than closed. The funnel still
   closes it, which clears the search as usual, and the theme's panel
   memory keeps whichever way it was last left, so a list someone closes
   stays closed.

   The theme starts a list closed unless its panel memory says otherwise,
   so this writes "open" to that memory for each opted-in panel that has
   none yet, before the theme runs (load it BEFORE zUnionSuite.js). On
   promotion, the theme's default for a panel with no memory becomes
   !wrapper.classList.contains('us-query-search-open'), and this file goes.
   The key is the theme's (panelMemoryKey: the page path and the panel's
   iMIS content ID). */
(function () {
  'use strict';
  if (window.UnionSuiteSearchOpen) return;

  const SELECTOR = '.us-query-search.us-query-search-open';
  const PREFIX = 'UnionSuite.panelFilters.v1:';

  function seed(wrapper) {
    const container = wrapper.closest('.ContentItemContainer');
    const id = (container && container.id) || wrapper.id;
    if (!id) return;
    const key = PREFIX + window.location.pathname + ':' + id;
    try {
      const remembered = JSON.parse(window.localStorage.getItem(key));
      if (remembered && typeof remembered.collapsed === 'boolean') return;
      window.localStorage.setItem(key, JSON.stringify(Object.assign({}, remembered, {collapsed: false})));
    } catch (_) {
      // Without storage the theme starts the filters closed, as it would.
    }
  }

  function refresh() {
    document.querySelectorAll(SELECTOR).forEach(seed);
  }

  window.UnionSuiteSearchOpen = Object.freeze({refresh});

  // The presets have expanded by now (case-presets.candidate.js loads
  // first), so the panels carry the class when this runs.
  refresh();
})();
