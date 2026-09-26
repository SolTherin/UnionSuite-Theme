/* Contact page v3 — prototype fixture: finance and membership actions.
   In the product these belong in UnionSuite-Client/Actions.js, each opening
   its iMIS editor as a popup with the contact's ID (context partyId from the
   query, as the member.* actions do) and refreshing the report it changes.
   Here they only register the classes, so the theme's action runtime draws
   the panel-heading buttons; contact-page.js shows a demo toast on click.

   One definition, several placements (the class does the placing):
   - Panel headings: the class on the panel iPart's CSS class field.
   - Banner Quick Actions: <button class="us-actions__item us-action-…">.
   - Alert action rows: <button class="TextButton us-action-…">. */
(function () {
  'use strict';
  const actions = window.UnionSuiteActions;
  if (!actions?.define) throw new Error('Load the shared action runtime before the finance action fixture.');

  const define = (key, presentation, extra = {}) => actions.define(key, {
    className: 'us-action-' + key.replace(/\./g, '-'),
    owner: 'Contact page v3 prototype',
    source: 'finance-actions.fixture.js:' + key,
    presentation: { default: 'button', menu: 'menu-item', ...presentation },
    // Prototype only: no contact context, so the buttons are always enabled.
    context: {},
    action: { type: 'function', run: () => ({ demo: true }), ...extra }
  });

  define('finance.make-payment', { label: 'Make payment', icon: 'plus', order: 1 });
  define('finance.raise-invoice', { label: 'Raise invoice', order: 2 });
  define('finance.add-card', { label: 'Add card', icon: 'plus', order: 1 });
  define('finance.add-waiver', { label: 'Add waiver', order: 1 });
  define('finance.refresh-pricing', { label: 'Refresh pricing', order: 1 });
  define('finance.apply-credit', { label: 'Apply credit', order: 1 });
  // Transaction detail popup: send the invoice (or a payment's receipt) to
  // the member. In the product, the popup page's details panel carries it.
  define('finance.send-to-member', { label: 'Send to member', order: 1 });
  define('finance.add-override', { label: 'Add override', icon: 'plus', order: 1 });
  // Row actions. In the product each reads its record from the row's data-*
  // attributes (context from:'trigger'), as the Jobs row actions do:
  // - view-transaction: data-id, data-transaction; opens the Transaction
  //   detail page as a popup (?ID=…&Transaction=…&IsPopup=true).
  // - edit-override: data-id, data-setting; opens the override editor.
  // Here view-transaction opens contact-page.js's stand-in popup instead.
  // useAuthoredLabel keeps each row's own text (the reference number, or
  // Edit / Override); link mode keeps the reference a link.
  // Opens the billing method editor for the member's payment type: for a card,
  // replace the card or update the existing card's expiry; for a bank account,
  // new account details.
  define('finance.update-billing-method', { label: 'Update billing method', order: 1 });

  // Heading menus (theme-candidate-heading-menus.js): configured like buttons
  // and placed by class, each item an action above. Order is the item order.
  const menu = (key, label, items, icon) => window.UnionSuiteHeadingMenus.define(key, {
    className: 'us-action-' + key.replace(/\./g, '-'),
    owner: 'Contact page v3 prototype',
    source: 'finance-actions.fixture.js:' + key,
    presentation: { label, ...(icon ? { icon } : {}), order: 1 },
    action: { type: 'menu', items }
  });
  // Change membership leads Billing: a new payment type goes through that
  // form, because clients tie payment types to frequencies and billing
  // categories (card and debit payers cannot pay yearly, invoice payers
  // cannot pay fortnightly). It also records temporary membership changes.
  menu('finance.manage-billing', 'Manage billing', ['membership.change', 'finance.update-billing-method', 'finance.raise-invoice', 'finance.refresh-pricing']);
  menu('finance.add-adjustment', 'Add adjustment', ['finance.add-waiver', 'membership.suspend'], 'plus');

  define('finance.view-transaction', { label: 'View details', useAuthoredLabel: true, default: 'link' }, {
    run: env => window.cv3OpenTransaction?.(env.trigger.dataset.transaction, env.trigger)
  });
  define('finance.edit-override', { label: 'Edit override', useAuthoredLabel: true });
  // Adjustments (item 33). Each reads data-id and data-adjustment from its
  // control. view-adjustment is the All adjustments grid's Type link (its
  // own text is the label); the other three sit in an Active and upcoming
  // row's detail. End uses the danger tone. contact-page.js shows a toast.
  define('finance.view-adjustment', { label: 'View adjustment', useAuthoredLabel: true, default: 'link' });
  define('finance.edit-adjustment', { label: 'Edit', icon: 'pencil', order: 1 });
  define('finance.end-adjustment', { label: 'End adjustment', icon: 'ti-ban', tone: 'danger', order: 2 });
  define('finance.view-adjustment-transactions', { label: 'View affected transactions', icon: 'ti-receipt', order: 3 });
  define('membership.change', { label: 'Change membership', order: 1 });
  // Suspension is a pause for leave (travel, parental), not a penalty: no
  // danger tone and no confirm. Its editor (leave dates, reason) is the check.
  define('membership.suspend', { label: 'Suspend membership', order: 2 });
  // Resignation alert (Summary and the bell, item 12). Registered like every
  // other action so the runtime paints alert buttons one way: outline with an
  // icon, the likelier step first. Log retention call records the call staff
  // make before a resignation takes effect; Process resignation opens the
  // resignation workflow.
  define('membership.log-retention-call', { label: 'Log retention call', icon: 'ti-phone', order: 1 });
  define('membership.process-resignation', { label: 'Process resignation', icon: 'ti-user-minus', order: 2 });
})();
