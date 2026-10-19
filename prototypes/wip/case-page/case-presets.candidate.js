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
    // The Overview's Tasks; Add task opens the composer (C40).
    'us-case-tasks': [
      'us-query-template', 'us-query-search', 'us-task-completed-filter',
      'us-task-progress', 'us-list-scroll', 'us-action-cases-add-task'
    ],
    // The Activity tab's All activity (C27): the add actions, of which the
    // heading shows the chosen type's, the Details view opt-in and its
    // section. Over the class field's 100 characters without the preset.
    'us-case-all-activity': [
      'us-action-cases-add-note', 'us-action-cases-add-meeting', 'us-action-cases-add-attachment',
      'us-activity-details', 'us-tab-panel', 'us-tabset-activity', 'us-tab-all'
    ],
    // The Activity tab's detailed views (C27): each is a Details view of All
    // activity (us-activity-detail-<key>), in the All activity section, and
    // starts with its filters open (C24). The 100-character class field
    // cannot hold these with the section classes, so the preset adds them.
    // Meetings (C22): the detailed rows.
    'us-case-meetings-detail': [
      'us-query-template', 'us-meetings', 'us-query-search', 'us-query-search-open',
      'us-task-completed-filter', 'us-task-progress', 'us-action-cases-add-meeting',
      'us-activity-detail', 'us-activity-detail-meetings', 'us-tab-panel', 'us-tabset-activity', 'us-tab-all'
    ],
    // The Overview's Meetings; Add meeting opens the composer (C40).
    'us-case-meetings': [
      'us-query-template', 'us-meetings', 'us-task-completed-filter',
      'us-task-progress', 'us-list-scroll', 'us-action-cases-add-meeting'
    ],
    // The Overview's newest three files (C26): no search, Upload (the
    // composer, C40) in the heading.
    'us-case-attachments-recent': [
      'us-query-template', 'us-attachments', 'us-action-cases-add-attachment'
    ],
    // The Attachments tab: Upload opens the composer in the card (C39).
    'us-case-attachments': [
      'us-query-template', 'us-attachments', 'us-query-search', 'us-query-search-open',
      'us-list-scroll', 'us-action-cases-add-attachment'
    ],
    // Notes: the ledger, as a Details view (C27).
    'us-case-notes': [
      'us-query-template', 'us-notes', 'us-notes--ledger', 'us-query-search',
      'us-query-search-open', 'us-list-scroll', 'us-action-cases-add-note',
      'us-activity-detail', 'us-activity-detail-notes', 'us-tab-panel', 'us-tabset-activity', 'us-tab-all'
    ],
    // us-case-parties is in the theme (sectionPresets, 14 October 2026).
    // The case team; Add staff opens the composer (C40).
    'us-case-staff': [
      'us-query-template', 'us-contacts-tiles', 'us-contacts-grouped',
      'us-contacts-group-tone', 'us-contacts-lead-first', 'us-action-cases-add-staff'
    ]
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
