// Workbench controls only. No task, search or completion behaviour lives here:
// that is the shared theme's, and the point of the prototype is to watch it.
(function () {
  'use strict';

  // Completion writes are stubbed: this page must never PUT to a tenant, and the
  // failure path is as much a part of the design as the success path.
  let failWrites = false;
  const nativeFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (input, init) {
    const url = String(typeof input === 'string' ? input : input && input.url || '');
    if (url.includes('/api/i4u_UT_Interactions/')) {
      const status = failWrites ? 500 : 200;
      return new Promise(resolve => setTimeout(
        () => resolve(new Response(JSON.stringify({stubbed:true, body:init && init.body}), {status})),
        350
      ));
    }
    return nativeFetch ? nativeFetch(input, init) : Promise.reject(new Error('fetch unavailable'));
  };

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

  const failToggle = document.querySelector('[data-wb-fail]');
  failToggle.addEventListener('change', () => { failWrites = failToggle.checked; });

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
