/* Contact page v3 — theme candidate: dropdown menus in panel headings.
   Loads straight after zUnionSuite.js and before ActionDefinitions.js and
   the client Actions.js, where it will live once promoted (inside
   US-UNIFIED-ACTIONS), so client files can register menus.

   US-ACTION-HEADING-MENUS 1.0-candidate — a menu is configured exactly like
   a heading button: one definition, placed by its us-action-* class in the
   iPart CSS class field. The definition has the button's shape with
   action {type: 'menu', items: [action keys]}:

     UnionSuiteHeadingMenus.define('finance.add-adjustment', {
       className: 'us-action-finance-add-adjustment',
       owner: 'Client', source: 'Actions.js:finance.add-adjustment',
       presentation: {label: 'Add adjustment', icon: 'plus', order: 1},
       action: {type: 'menu', items: ['finance.add-waiver',
         'membership.suspend', 'membership.change']}
     });

   The menu is the theme's .us-actions dropdown (Quick Actions' look, motion
   and keyboard handling from US-ACTION-MENUS). Each item is an ordinary
   control carrying the item action's class, so US-UNIFIED-ACTIONS labels,
   checks access and runs it in menu placement, as for a Quick Actions item.
   Until promotion the runtime does not know type 'menu': it draws an
   unconfigured button for the menu's class, which this block hides, and
   this block keeps its own registry. On promotion, UnionSuiteActions.define
   accepts type 'menu' and the heading slot reconciler renders this markup. */
(function () {
  'use strict';

  if (window.UnionSuiteHeadingMenus) {
    window.UnionSuiteHeadingMenus.refresh();
    return;
  }

  const menus = new Map();
  const PLACEHOLDER = 'data-us-heading-menu-placeholder';
  let scheduled = false;

  function define(key, value) {
    if (!/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/.test(key)) throw new TypeError('Use a namespaced menu key.');
    if (!value || typeof value.className !== 'string' || !/^us-action-[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value.className)) throw new TypeError('Supply one us-action-AREA-COMMAND class.');
    if (typeof value.owner !== 'string' || !value.owner.trim() || typeof value.source !== 'string' || !value.source.trim()) throw new TypeError('Menu registration requires nonempty owner and source strings.');
    const presentation = value.presentation || {};
    if (typeof presentation.label !== 'string' || !presentation.label.trim()) throw new TypeError('presentation.label is required.');
    if (presentation.icon != null && presentation.icon !== 'plus') throw new TypeError('Heading menus support the plus icon only.');
    const action = value.action || {};
    if (action.type !== 'menu' || !Array.isArray(action.items) || !action.items.length || action.items.some(item => typeof item !== 'string')) {
      throw new TypeError('Menus need action {type: "menu", items: [action keys]}.');
    }
    if ([...menus.values()].some(menu => menu.className === value.className && menu.key !== key)) throw new TypeError('That class belongs to another menu.');
    menus.set(key, Object.freeze({ key, className: value.className, label: presentation.label.trim(), icon: presentation.icon || null, order: presentation.order || 0, items: Object.freeze([...action.items]) }));
    schedule();
    return key;
  }

  // Item classes come from the action registry, so an item follows its
  // action's own className; the key convention is the fallback.
  function itemClass(key) {
    return window.UnionSuiteActions?.getActionStatus?.(key)?.className || 'us-action-' + key.replace(/\./g, '-');
  }

  function build(menu) {
    const root = document.createElement('div');
    root.className = 'us-actions us-heading-menu';
    root.setAttribute('data-us-heading-menu', menu.key);
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'us-actions__toggle';
    if (menu.icon === 'plus') {
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'aria-hidden': 'true', focusable: 'false', class: 'us-heading-menu__icon' })
        .forEach(([name, value]) => icon.setAttribute(name, value));
      const path = document.createElementNS(icon.namespaceURI, 'path');
      path.setAttribute('d', 'M12 5v14 M5 12h14');
      icon.append(path);
      toggle.append(icon);
    }
    toggle.append(document.createTextNode(menu.label));
    const list = document.createElement('ul');
    list.className = 'us-actions__list';
    menu.items.forEach(key => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'us-actions__item ' + itemClass(key);
      // Replaced by the action's own label when the runtime paints it.
      button.textContent = key;
      item.append(button);
      list.append(item);
    });
    root.append(toggle, list);
    return root;
  }

  // Opening draws the top-level list's side line and sends a glint down it,
  // as US-ACTION-MENUS does for submenus (.us-actions__inline). Nothing is
  // measured: US-ACTION-MENUS collapses the list and its items while it
  // unfolds, so the line and glint are sized from the list in CSS and grow
  // with it. Deeper levels are unchanged.
  function drawOnOpen(root) {
    const toggle = root.querySelector(':scope > .us-actions__toggle');
    const list = root.querySelector(':scope > .us-actions__list');
    new MutationObserver(() => {
      list.classList.remove('us-heading-menu__drawing');
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      requestAnimationFrame(() => list.classList.add('us-heading-menu__drawing'));
    }).observe(toggle, { attributes: true, attributeFilter: ['aria-expanded'] });
  }

  function slotFor(owner) {
    const panel = [...owner.children].find(node => node.matches('.panel'));
    return panel?.querySelector(':scope > .panel-heading > .us-panel-actions > [data-us-panel-actions-slot]') || null;
  }

  function refresh() {
    scheduled = false;
    const wanted = new Set();
    menus.forEach(menu => {
      document.querySelectorAll('.' + menu.className).forEach(owner => {
        if (owner.matches('button, a') || owner.closest('.us-report-no-styling, [data-us-actions-ignore]')) return;
        const slot = slotFor(owner);
        if (!slot) return;
        // The runtime's unconfigured button for the menu class stays in its
        // slot (the runtime removes moved buttons) but is never shown.
        const placeholder = slot.querySelector(':scope > .' + menu.className);
        if (placeholder && !placeholder.hasAttribute(PLACEHOLDER)) {
          placeholder.setAttribute(PLACEHOLDER, '');
          placeholder.setAttribute('aria-hidden', 'true');
        }
        let root = slot.querySelector(':scope > [data-us-heading-menu="' + menu.key + '"]');
        if (!root) {
          root = build(menu);
          slot.append(root);
          drawOnOpen(root);
        }
        wanted.add(root);
      });
    });
    document.querySelectorAll('[data-us-heading-menu]').forEach(root => {
      if (!wanted.has(root)) root.remove();
    });
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(refresh, 0);
  }

  function start() {
    refresh();
    new MutationObserver(records => {
      if (records.some(record => !record.target.closest?.('[data-us-heading-menu]'))) schedule();
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  }

  window.UnionSuiteHeadingMenus = Object.freeze({
    version: '1.0-candidate',
    define,
    refresh,
    list: () => [...menus.values()]
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
