// Offline simulation only. Do not load this on iMIS pages.
(() => {
  const cco = document.querySelector('.cco');
  const strip = cco.firstElementChild;
  const list = strip.querySelector('[role="tablist"]');
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const panels = [...cco.querySelector(':scope > .RadMultiPage').children];
  const proposed = cco.classList.contains('us-cco-tabs');
  const vertical = cco.classList.contains('tabs-vertical');
  const orientation = () => vertical && innerWidth > (proposed ? 600 : 767) ? 'vertical' : 'horizontal';
  function resize() {
    list.setAttribute('aria-orientation', orientation());
    parent.postMessage({ type: 'cco-size', id: document.body.dataset.fixture, height: document.body.scrollHeight + 8 }, '*');
  }
  function select(index, focus = false, notify = true) {
    if (!tabs[index] || tabs[index].getAttribute('aria-disabled') === 'true') return;
    tabs.forEach((tab, i) => {
      tab.classList.toggle('rtsSelected', i === index);
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    strip.setAttribute('aria-activedescendant', tabs[index].id);
    if (focus) tabs[index].focus({ preventScroll: true });
    if (focus || notify) tabs[index].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (notify) parent.postMessage({ type: 'cco-select', id: document.body.dataset.fixture, index }, '*');
    requestAnimationFrame(resize);
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', event => { event.preventDefault(); select(index, true); });
    tab.addEventListener('keydown', event => {
      const enabled = tabs.filter(t => t.getAttribute('aria-disabled') !== 'true');
      const current = enabled.indexOf(tab);
      const nextKey = orientation() === 'vertical' ? 'ArrowDown' : 'ArrowRight';
      const previousKey = orientation() === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
      let target;
      if (event.key === nextKey) target = enabled[(current + 1) % enabled.length];
      if (event.key === previousKey) target = enabled[(current - 1 + enabled.length) % enabled.length];
      if (event.key === 'Home') target = enabled[0];
      if (event.key === 'End') target = enabled.at(-1);
      if (event.key === ' ') target = tab;
      if (target) { event.preventDefault(); select(tabs.indexOf(target), true); }
    });
  });
  document.querySelectorAll('[data-demo-find]').forEach(button => button.addEventListener('click', () => {
    button.nextElementSibling.textContent = 'No matching records in this offline example.';
  }));
  // Nested Address tabs are native-looking, local, and independent of outer CCO.
  document.querySelectorAll('.nested-tabs [role="tab"]').forEach(tab => tab.addEventListener('click', event => event.preventDefault()));
  window.addEventListener('message', event => {
    if (event.source !== parent || event.data?.type !== 'cco-command') return;
    const { action, value } = event.data;
    if (action === 'select') select(value, false, false);
    if (action === 'disabled') {
      const last = tabs.at(-1);
      if (value && last.classList.contains('rtsSelected')) select(0, false, false);
      last.classList.toggle('rtsDisabled', value);
      last.setAttribute('aria-disabled', String(value));
    }
    if (action === 'reset') {
      tabs.at(-1).classList.remove('rtsDisabled');
      tabs.at(-1).setAttribute('aria-disabled', 'false');
      document.querySelectorAll('input, select').forEach(field => {
        if (field.tagName === 'SELECT') field.selectedIndex = 0;
        else field.value = '';
      });
      document.querySelectorAll('[data-demo-find]').forEach(button => { button.nextElementSibling.textContent = 'Please enter your search criteria to view results'; });
      select(0, false, false);
      strip.querySelector('.rtsLevel').scrollLeft = 0;
    }
  });
  new ResizeObserver(resize).observe(document.body);
  window.addEventListener('resize', resize);
  select(0, false, false);
})();
