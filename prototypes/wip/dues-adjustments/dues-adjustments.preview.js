/* Preview chrome for the dues adjustments prototype: colour scheme, panel
   width and the Active list's empty state. Not part of the candidate. Width
   presets resize the panels, not the window, so the narrow layout can be
   checked beside the wide one. */
(function () {
  'use strict';

  const root = document.documentElement;
  const scheme = document.querySelector('[data-preview-scheme]');
  const empty = document.querySelector('[data-preview-empty]');
  const frame = document.querySelector('[data-preview-frame]');
  const widths = Array.from(document.querySelectorAll('[data-preview-width]'));

  scheme.addEventListener('click', () => {
    const dark = root.getAttribute('data-us-color-scheme') !== 'dark';
    if (dark) root.setAttribute('data-us-color-scheme', 'dark');
    else root.removeAttribute('data-us-color-scheme');
    scheme.setAttribute('aria-pressed', String(dark));
    scheme.textContent = 'Mode: ' + (dark ? 'dark' : 'light');
  });

  widths.forEach(button => {
    button.addEventListener('click', () => {
      frame.style.maxWidth = button.dataset.previewWidth;
      widths.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    });
  });

  // No results, as iMIS renders it: the result set is omitted and the No
  // results field's HTML takes its place.
  const body = document.querySelector('.us-adjustments .panel-body');
  const set = body.querySelector('.QueryTemplateSet');
  const noResults = document.createElement('p');
  noResults.textContent = 'No active or upcoming adjustments.';
  empty.addEventListener('click', () => {
    const none = empty.getAttribute('aria-pressed') !== 'true';
    if (none) set.replaceWith(noResults);
    else noResults.replaceWith(set);
    empty.setAttribute('aria-pressed', String(none));
    empty.textContent = 'Active: ' + (none ? 'none' : '4 adjustments');
    window.UnionSuiteAdjustments?.refresh();
  });
})();
