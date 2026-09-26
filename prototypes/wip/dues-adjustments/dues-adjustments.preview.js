/* Preview chrome for the dues adjustments prototype: colour scheme and panel
   width. Not part of the candidate. Width presets resize the panel, not the
   window, so the narrow layout can be checked beside the wide one. */
(function () {
  'use strict';

  const root = document.documentElement;
  const scheme = document.querySelector('[data-preview-scheme]');
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
})();
