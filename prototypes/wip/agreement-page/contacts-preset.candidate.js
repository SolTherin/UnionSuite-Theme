/* Agreement contacts — the option 7 preset under review (contacts-compare.html).
   Not installed and not loaded by the agreement page.

   US-AGREEMENT-CONTACTS preset. The iMIS iPart CSS class field truncates at
   100 characters; option 7 needs nine classes. The theme already solves this
   with section presets: one authored class expands to the classes it
   bundles. Promotion target: add this entry to sectionPresets in
   zUnionSuite.js and list us-agreement-contacts in queryDisplaySelector and
   the matching zUnionSuite.css selectors, so first paint is styled.
   Until then this file stands in, and must load BEFORE zUnionSuite.js so
   the theme sees the expanded classes when it sets up search and actions.
   The preset class stays on the element; the contacts scripts read it to
   apply the agreement's search wording. */
(function () {
  'use strict';
  const preset = 'us-agreement-contacts';
  const classes = [
    'us-query-template', 'us-contacts-tiles', 'us-contacts-grouped',
    'us-contacts-facets', 'us-contacts-group-filter', 'us-contacts-group-tone',
    'us-query-search', 'us-action-agreements-add-contact',
    'us-action-agreements-email-contacts'
  ];

  function expand(root) {
    root.querySelectorAll('.' + preset).forEach(element => {
      classes.forEach(name => element.classList.add(name));
    });
  }

  expand(document);
  new MutationObserver(records => {
    if (records.some(record => record.addedNodes.length)) expand(document);
  }).observe(document.documentElement, {subtree: true, childList: true});
})();
