/* Agreement page section presets (candidate).

   The iMIS iPart CSS class field truncates at 100 characters, and most
   agreement panels need more: the query features, the theme options and
   the panel's add action. The theme already solves this with section
   presets: one authored class expands to the classes it bundles. Each
   panel's CSS class field holds its preset, plus us-panel-fill when it
   shares a row (layout, so not part of a preset).

   Promotion target: add these entries to sectionPresets in zUnionSuite.js
   and list the presets in queryDisplaySelector and the matching
   zUnionSuite.css selectors, so first paint is styled. Until then this file
   stands in, and must load BEFORE zUnionSuite.js so the theme sees the
   expanded classes when it sets up search and actions. The preset class
   stays on the element; the contacts scripts read us-agreement-contacts to
   apply the agreement's search wording. Contacts: option 7, grouped tiles
   (owner, 3 October 2026); the others: owner, 3 October 2026, when the
   Tasks class hit the limit. */
(function () {
  'use strict';
  if (window.UnionSuiteAgreementPresets) return;

  const presets = {
    'us-agreement-tasks': [
      'us-query-template', 'us-query-search', 'us-task-completed-filter',
      'us-task-progress', 'us-list-scroll', 'us-action-agreements-add-task'
    ],
    'us-agreement-milestones': [
      'us-query-template', 'us-milestones', 'us-task-completed-filter',
      'us-task-progress', 'us-action-agreements-add-milestone'
    ],
    'us-agreement-meetings': [
      'us-query-template', 'us-meetings', 'us-task-completed-filter',
      'us-task-progress', 'us-list-scroll', 'us-action-agreements-add-meeting'
    ],
    'us-agreement-attachments': [
      'us-query-template', 'us-attachments', 'us-query-search',
      'us-list-scroll', 'us-action-agreements-upload-attachment'
    ],
    'us-agreement-notes': [
      'us-query-template', 'us-notes', 'us-notes--ledger', 'us-query-search',
      'us-list-scroll', 'us-action-agreements-add-note'
    ],
    'us-agreement-terms': [
      'us-query-template', 'us-query-search', 'us-list-scroll',
      'us-action-agreements-add-term', 'us-action-agreements-remove-terms'
    ],
    'us-agreement-contacts': [
      'us-query-template', 'us-contacts-tiles', 'us-contacts-grouped',
      'us-contacts-facets', 'us-contacts-group-filter', 'us-contacts-group-tone',
      'us-query-search', 'us-action-agreements-add-contact',
      'us-action-agreements-email-contacts'
    ]
  };
  const selector = Object.keys(presets).map(name => '.' + name).join(', ');

  // Idempotent: once the classes are present nothing changes, so the
  // observer settles after the first pass.
  function expand() {
    document.querySelectorAll(selector).forEach(element => {
      Object.keys(presets).forEach(preset => {
        if (element.classList.contains(preset)) presets[preset].forEach(name => element.classList.add(name));
      });
    });
  }

  expand();
  // Panels arrive while the page parses and again when an iPart refreshes
  // in place, so expand whenever nodes are added.
  new MutationObserver(records => {
    if (records.some(record => record.addedNodes.length)) expand();
  }).observe(document.documentElement, {subtree: true, childList: true});

  window.UnionSuiteAgreementPresets = Object.freeze({expand, presets: Object.freeze({...presets})});
})();
