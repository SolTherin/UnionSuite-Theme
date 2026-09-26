/* Dues adjustments — prototype fixture: the row actions.
   In the product these belong in UnionSuite-Client/Actions.js beside the
   finance actions, each opening its iMIS editor with the adjustment's key
   (from the row) and refreshing the list. Here they only register the
   classes, so the theme's action runtime paints the authored buttons.
   Loads after the contact page v3 finance fixture, which defines the
   finance.add-adjustment heading menu this panel also uses. */
(function () {
  'use strict';
  const actions = window.UnionSuiteActions;
  if (!actions?.define) throw new Error('Load the shared action runtime before the adjustment action fixture.');

  const define = (key, presentation) => actions.define(key, {
    className: 'us-action-' + key.replace(/\./g, '-'),
    owner: 'Dues adjustments prototype',
    source: 'adjustment-actions.fixture.js:' + key,
    presentation: { default: 'button', menu: 'menu-item', ...presentation },
    // Prototype only: no record context, so the buttons are always enabled.
    context: {},
    action: { type: 'function', run: () => ({ demo: true }) }
  });

  define('finance.edit-adjustment', { label: 'Edit', icon: 'pencil', order: 1 });
  define('finance.end-adjustment', { label: 'End adjustment', icon: 'ti-ban', tone: 'danger', order: 2 });
  define('finance.view-adjustment-transactions', { label: 'View affected transactions', icon: 'ti-receipt', order: 3 });
})();
