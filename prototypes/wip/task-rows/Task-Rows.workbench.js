// Workbench controls only. No task, search or completion behaviour lives here:
// that is the shared theme's, and the point of the prototype is to watch it.
(function () {
  'use strict';

  const stages = document.querySelector('.wb-stages');
  const scheme = document.querySelector('[data-wb-scheme]');
  const width = document.querySelector('[data-wb-width]');
  const widthValue = document.querySelector('[data-wb-width-value]');
  const reset = document.querySelector('[data-wb-reset]');

  // Completing a task removes its row, so each stage keeps its rendered markup.
  const original = new Map();
  document.querySelectorAll('.wb-stage__frame').forEach(frame => original.set(frame, frame.innerHTML));

  function applyScheme(value) {
    const appearance = window.UnionSuiteAppearance;
    if (appearance) appearance.setPreference(value);
    else document.documentElement.setAttribute('data-us-color-scheme', value);
  }

  function applyWidth(value) {
    stages.style.setProperty('--wb-stage-width', value + 'px');
    widthValue.value = value + 'px';
  }

  scheme.addEventListener('change', () => applyScheme(scheme.value));
  width.addEventListener('input', () => applyWidth(width.value));

  // Tier buttons are shortcuts to the container widths the proposal changes at.
  document.querySelectorAll('[data-wb-tier]').forEach(button => {
    button.addEventListener('click', () => {
      width.value = button.dataset.wbTier;
      applyWidth(width.value);
    });
  });

  reset.addEventListener('click', () => {
    original.forEach((markup, frame) => {
      frame.innerHTML = markup;
      frame.style.removeProperty('width');
    });
    // Let the shared controllers pick the restored rows up again.
    window.UnionSuiteTaskRows?.refresh();
    window.UnionSuiteIqaFilters?.refresh();
  });

  // Follow a scheme restored from storage by the shared appearance controller.
  function syncScheme() {
    const state = window.UnionSuiteAppearance?.getState();
    if (state?.scheme) scheme.value = state.scheme;
  }

  window.addEventListener('unionsuite:appearancechange', syncScheme);
  syncScheme();
  applyWidth(width.value);
})();
