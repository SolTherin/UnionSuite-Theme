// Workbench controls only: list width, colour scheme, which variants show and
// the candidate options. The feed is the real US-ACTIVITY-FEED module, fed by
// the workbench's sample-data responses; expanding cards is US-RECORD-CARDS.
(function () {
  'use strict';

  const stages = document.querySelector('.wb-stages');
  const optionSelects = [...document.querySelectorAll('[data-wb-option]')];
  const optionClasses = optionSelects.flatMap(select => [...select.options].map(option => option.value).filter(Boolean));

  function setWidth(width) {
    stages.style.setProperty('--wb-stage-width', width + 'px');
    document.querySelectorAll('[data-wb-tier]').forEach(button => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.wbTier) === width));
    });
  }

  // Options are modifiers on every candidate card list, the feed's included.
  function applyOptions() {
    const chosen = optionSelects.map(select => select.value).filter(Boolean);
    document.querySelectorAll('.wb-variant--candidate .us-records').forEach(list => {
      list.classList.remove(...optionClasses);
      list.classList.add(...chosen);
    });
  }

  document.addEventListener('click', event => {
    const tier = event.target.closest('[data-wb-tier]');
    if (tier) {
      setWidth(Number(tier.dataset.wbTier));
      return;
    }

    if (event.target.closest('[data-wb-reset]')) {
      optionSelects.forEach(select => { select.value = ''; });
      applyOptions();
      return;
    }

    // Sample links go nowhere.
    const link = event.target.closest('a[href^="#"]');
    if (link) event.preventDefault();
  });

  // Appearance drives the theme's own preference (UnionSuiteAppearance), so the
  // choice survives reloads and the menu always shows what the page uses.
  const schemeSelect = document.querySelector('[data-wb-scheme]');
  const showScheme = () => {
    schemeSelect.value = window.UnionSuiteAppearance?.getState().preference || 'system';
  };
  schemeSelect.addEventListener('change', () => {
    window.UnionSuiteAppearance?.setPreference(schemeSelect.value === 'system' ? null : schemeSelect.value);
  });
  window.addEventListener('unionsuite:appearancechange', showScheme);
  showScheme();

  document.querySelector('[data-wb-show]').addEventListener('change', event => {
    document.body.classList.toggle('wb-only-candidate', event.target.value === 'candidate');
  });

  optionSelects.forEach(select => select.addEventListener('change', applyOptions));

  // The frozen original is its own document; keep its frame as tall as its
  // content as widths change and cards expand.
  document.querySelectorAll('iframe.wb-original').forEach(frame => {
    const fit = () => {
      const doc = frame.contentDocument;
      if (doc?.body) frame.style.height = doc.documentElement.scrollHeight + 'px';
    };
    frame.addEventListener('load', () => {
      fit();
      new ResizeObserver(fit).observe(frame.contentDocument.body);
      frame.contentDocument.addEventListener('click', () => requestAnimationFrame(fit));
    });
  });

  // The feed renders after its data arrives, so apply the options to its list
  // once it exists (the list element itself persists across re-renders).
  new MutationObserver(applyOptions).observe(stages, { childList: true, subtree: true, attributes: false });

  setWidth(620);
  applyOptions();
})();
