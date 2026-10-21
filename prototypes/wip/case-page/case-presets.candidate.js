/* Case page section presets (candidate).

   The case panels need the same bundles as the agreement panels, with the
   case add actions in place of the agreement ones. The iMIS iPart CSS class
   field truncates at 100 characters, so each panel carries one preset class
   (plus us-panel-fill when it shares a row).

   Promotion target: add these entries to sectionPresets in zUnionSuite.js
   and list the presets in queryDisplaySelector and the matching
   zUnionSuite.css selectors, so first paint is styled. Until then this file
   stands in, and must load BEFORE zUnionSuite.js so the theme sees the
   expanded classes when it sets up search and actions.

   Not carried over: milestones, terms, increases and coverage, which belong
   to agreements. The agreement-only contact wording (the contacts scripts
   read us-agreement-contacts) does not apply to the case contact panels. */
(function () {
  'use strict';
  if (window.UnionSuiteCasePresets) return;

  const presets = {
    // us-case-tasks and us-case-all-activity are in the theme (sectionPresets,
    // 20 and 21 October 2026).
    // us-case-meetings, us-case-meetings-detail, us-case-attachments,
    // us-case-attachments-recent and us-case-staff are in the theme
    // (sectionPresets, 20 October 2026).
    // The Activity tab's detailed views (C27): each is a Details view of All
    // activity (us-activity-detail-<key>), in the All activity section, and
    // starts with its filters open (C24). The 100-character class field
    // cannot hold these with the section classes, so the preset adds them.
    // Notes: the ledger, as a Details view (C27).
    'us-case-notes': [
      'us-query-template', 'us-notes', 'us-notes--ledger', 'us-query-search',
      'us-query-search-open', 'us-list-scroll', 'us-action-cases-add-note',
      'us-activity-detail', 'us-activity-detail-notes', 'us-tab-panel', 'us-tabset-activity', 'us-tab-all'
    ]
    // us-case-parties is in the theme (sectionPresets, 14 October 2026).
  };

  // Idempotent: once the classes are present nothing changes, so the
  // observer settles after the first pass.
  function expand() {
    Object.keys(presets).forEach(preset => {
      document.querySelectorAll('.' + preset).forEach(element => {
        presets[preset].forEach(name => element.classList.add(name));
      });
    });
  }

  expand();
  // Panels arrive while the page parses and again when an iPart refreshes
  // in place, so expand whenever nodes are added.
  new MutationObserver(records => {
    if (records.some(record => record.addedNodes.length)) expand();
  }).observe(document.documentElement, {subtree: true, childList: true});

  window.UnionSuiteCasePresets = Object.freeze({expand, presets: Object.freeze({...presets})});
})();
