/* Agreement contacts — option scripts under review (contacts-compare.html).
   Not installed and not loaded by the agreement page.
   US-AVATARS          initials for C0 us-avatar
   US-CONTACT-GROUPS   group headings for C3 us-contacts-roster */

/* US-AVATARS:START — initials from data-us-avatar-name.
   Target: new block in zUnionSuite.js. Takes the first letter of the first
   and last words of the name, skipping titles such as Dr and Ms, and
   writes them only when they change. */
(function () {
  'use strict';
  if (window.UnionSuiteAvatars) return;

  const titles = /^(dr|mr|mrs|ms|miss|prof|sir|hon)\.?$/i;

  function initials(name) {
    const words = String(name || '').trim().split(/\s+/).filter(word => word && !titles.test(word));
    if (!words.length) return '';
    const first = words[0][0];
    const last = words.length > 1 ? words[words.length - 1][0] : '';
    return (first + last).toUpperCase();
  }

  function paint(root) {
    root.querySelectorAll('.us-avatar[data-us-avatar-name]').forEach(avatar => {
      const text = initials(avatar.getAttribute('data-us-avatar-name'));
      if (avatar.textContent !== text) avatar.textContent = text;
    });
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      paint(document);
    });
  }

  new MutationObserver(records => {
    if (records.some(record => record.type === 'childList' && record.addedNodes.length)) schedule();
  }).observe(document.documentElement, {subtree: true, childList: true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();

  window.UnionSuiteAvatars = Object.freeze({refresh: schedule, initials, version: '0.1-candidate'});
})();
/* US-AVATARS:END */

/* US-CONTACT-GROUPS:START — group headings for us-contacts-roster and
   us-contacts-grouped (tiles). Blank groups gather under "No group".
   Target: new block beside US-CONTACTS in zUnionSuite.js.
   The IQA sorts by ContactGroup, so each run of rows with the same
   data-us-contact-group gets one heading with a count. A heading hides
   when search hides every row under it. Headings are not sections, so the
   theme's search and result counts ignore them. */
(function () {
  'use strict';
  if (window.UnionSuiteContactGroups) return;

  // A row is the roster row or a tile: whatever carries the group.
  function rowOf(section) {
    return section.querySelector('[data-us-contact-group]');
  }

  function groupOf(section) {
    const row = rowOf(section);
    return row ? (row.getAttribute('data-us-contact-group') || '').trim() || 'No group' : null;
  }

  function build(set) {
    const sections = [...set.children].filter(child => child.localName === 'section');
    const runs = [];
    sections.forEach(section => {
      const group = groupOf(section);
      if (group === null) return;
      const last = runs[runs.length - 1];
      if (last && last.group === group) last.sections.push(section);
      else runs.push({group, sections: [section]});
    });

    // Headings only help when there is something to group: more than four
    // contacts, and at least one group with more than one person.
    // On the agreement panel (us-agreement-contacts) headings also need at
    // least two groups with two or more people, so a mostly-singleton list
    // is not a heading per card; the cards then show the group themselves.
    const shared = runs.filter(run => run.sections.length >= 2).length;
    const strict = !!set.closest('.us-agreement-contacts');
    if (sections.length <= 4 || runs.every(run => run.sections.length === 1) || (strict && shared < 2)) {
      set.querySelectorAll(':scope > .us-contact-group').forEach(heading => heading.remove());
      return;
    }

    // Rebuild only when the grouping changed: headings in place, same names.
    const existing = [...set.querySelectorAll(':scope > .us-contact-group')];
    const current = existing.map(heading => heading.getAttribute('data-us-contact-group')).join('\n');
    const wanted = runs.map(run => run.group).join('\n');
    const placed = existing.length === runs.length &&
      runs.every((run, index) => existing[index].nextElementSibling === run.sections[0]);
    if (current !== wanted || !placed) {
      existing.forEach(heading => heading.remove());
      runs.forEach(run => {
        const heading = document.createElement('h3');
        heading.className = 'us-contact-group';
        heading.setAttribute('data-us-contact-group', run.group);
        const name = document.createElement('span');
        name.textContent = run.group;
        const count = document.createElement('span');
        count.className = 'us-contact-group__count';
        heading.append(name, count);
        run.sections[0].before(heading);
      });
    }

    // Counts and visibility follow the search.
    const headings = [...set.querySelectorAll(':scope > .us-contact-group')];
    runs.forEach((run, index) => {
      const heading = headings[index];
      const shown = run.sections.filter(section => !section.hasAttribute('data-us-query-search-hidden') && !section.hidden).length;
      // The heading carries the group's tone and index, for its colour dot.
      const first = rowOf(run.sections[0]);
      ['data-us-contact-group-tone', 'data-us-contact-group-index'].forEach(name => {
        const value = first.getAttribute(name);
        if (value === null) heading.removeAttribute(name);
        else if (heading.getAttribute(name) !== value) heading.setAttribute(name, value);
      });
      const count = heading.querySelector('.us-contact-group__count');
      const text = String(shown);
      if (count.textContent !== text) count.textContent = text;
      if (heading.hidden !== !shown) heading.hidden = !shown;
    });
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      document.querySelectorAll('.us-contacts-roster .QueryTemplateSet, .us-contacts-grouped .QueryTemplateSet').forEach(set => {
        if (!set.closest('.us-report-no-styling')) build(set);
      });
    });
  }

  new MutationObserver(records => {
    if (records.some(record => (record.type === 'childList' &&
        [...record.addedNodes, ...record.removedNodes].some(node => node.localName === 'section')) ||
        record.attributeName === 'data-us-query-search-hidden')) schedule();
  }).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-us-query-search-hidden']
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();

  window.UnionSuiteContactGroups = Object.freeze({refresh: schedule, version: '0.1-candidate'});
})();
/* US-CONTACT-GROUPS:END */
