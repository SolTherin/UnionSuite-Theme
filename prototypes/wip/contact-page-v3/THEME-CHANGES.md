# Contact page v3: theme changes to make

Status: the v3 candidate was approved by the owner on 25 September 2026.
**Nothing in `THeme/` has been changed yet.** Do not start moving these
changes into the theme until the owner says to begin. Until then, the
prototype keeps loading the candidate files after the theme files.

This file tracks what has to change and where. The detail for each item
(what it does, measurements, scope) is in the
[Proposed theme changes](README.md#proposed-theme-changes) table in the
README. Tick an item off only once it is in the theme and has been checked.

## Decisions that shape the promotion

- 25 September 2026: the whole v3 candidate (items 1–28) is approved.
  Item 26 is page layout and client actions, not theme code.
- 25 September 2026: the contact page CCO uses the v1 sidebar rail, locked
  in. The rail is one class, `us-cco-rail` (renamed from `us-cco-sidebar`;
  it brings `us-cco-cards` and `us-cco-collapsible` with it). CCOs without it
  keep the theme's default vertical tabs.
- 25 September 2026: tabs on the right are the default for the contact
  page. The side is the CCO iPart's own "Tab display style" setting
  (Vertical left or Vertical right), not a class: iMIS renders `tabs-right`
  on the `.cco` element and `RadTabStripRight` on the strip, in the same
  markup order. `us-cco-rail-right` is gone. This answers README open
  decision 8.
- 25 September 2026: the current theme ignores "Vertical right" (its page
  layout forces every vertical strip into the left column). Section 29
  fixes this for every vertical CCO, mirroring V5's attached tabs.

## Before starting

- [ ] Owner says to begin moving changes into the theme.
- [ ] Review the site-wide items (1–4, 6, 7, 11, 14, 18, 20, 22, 23) against
      other pages: agreement, case, staff and dashboard banners (README open
      decisions 2 and 11), and fit-to-width reports site-wide (open
      decision 10).
- [ ] Finish the dark mode checks listed in README
      [Verification status](README.md#verification-status).
- [ ] Move this folder to `prototypes/approved/contact-page-v3/`, as
      `AGENTS.md` requires for approved designs, and update the preview URL,
      the v1/v2 links and the paths in `build-standalone.cjs`.

## `THeme/UnionSuite/zUnionSuite.css`

Each `theme-candidate.css` section names its target and uses the theme's own
selectors, so it moves across unchanged.

- [ ] Item 1, panel header tokens: section 1 → tokens at the top of the file
      and the `pointer: coarse` override.
- [ ] Item 2, section switcher: section 2 → `US-SECTION-TABS`.
- [ ] Items 3, 19 and 20, banner: section 3 → `US-BANNER-COMPONENT`.
- [ ] Item 4, Needs Attention cards: section 4 → `US-ATTENTION`.
- [ ] Item 5, `us-cco-cards`: section 5 → new block after
      `US-NATIVE-TABS-COMPONENT`; rail width and gap tokens in
      `US-NATIVE-TABS-PAGE-LAYOUT`.
- [ ] Items 6 and 14, read-only panel fields and labels: sections 6 and 14 →
      data display panel rules.
- [ ] Item 7, report column headers: section 7 → IQA token block after
      `US-IQA-BASELINE`.
- [ ] Item 8, row groups: section 8 → after the IQA report rules.
- [ ] Item 9, `us-alerts` (buttons follow the text): section 9 → after the
      native feedback messages.
- [ ] Item 10, collapsible rail: section 10 → after
      `US-NATIVE-TABS-COMPONENT`. Change the icon URLs to
      `images/NavbarSprite.svg#…`; keep the view-transition rules and
      `--us-cco-rail-motion`.
- [ ] Item 12, alert bell: section 12 → `US-BANNER-COMPONENT`, after Quick
      Actions.
- [ ] Item 13, compact notes: section 13 → after the list shell rules.
- [ ] Item 15, right-hand rail (from the Vertical right setting):
      section 15 → after item 5.
- [ ] Items 16, 17 and 24, `us-cco-rail`, tab search, counts and shortcut
      keycap: sections 16 and 17 → after item 15. Sections 5 and 10 already
      match `:is(.us-cco-cards, .us-cco-rail)` and
      `:is(.us-cco-collapsible, .us-cco-rail)`.
- [ ] Item 22, message paragraph trim: section 22 → `US-MESSAGES`, after
      the shared message box rule.
- [ ] Item 23, report scroll edges: section 23 → after the IQA report rules.
- [ ] Item 25, panel tones: section 25 → after the panel and report heading
      rules.
- [ ] Item 27, copy flash and "Copied" label: section 27 → replaces
      `.us-copy-flash` and `@keyframes us-copy-flash` in `US-COPY`.
- [ ] Item 28, quiet trackers: section 28 → after `US-ATTENTION`.
- [ ] Item 31, heading menus: section 31 → `US-ACTION-MENUS`, after the
      shared toggle rules (toggle sized like the heading buttons; top-level
      side line and glint: `us-actions-line-draw` and a glint keyframe
      sized from the list, not measured, because US-ACTION-MENUS collapses
      the list and items while it unfolds). Consider the same item inset
      for the theme's own submenus, whose hover fill also covers their line.
- [ ] Item 25 addition: a toned panel whose grid shows `rgNoRecords`, or a
      declared Query Template (`us-query-template`) with no result set, stays
      plain (section 25).
- [ ] Item 30, status icons in badges: section 30 → `US-BADGES`, after the
      tone rules, with its one-line rule (a status never breaks mid-word).
- [ ] Item 33, adjustments (proposed, not yet approved): move
      `prototypes/wip/dues-adjustments/dues-adjustments.candidate.css` into a
      new `US-ADJUSTMENTS` section after the Query Template list rules (its
      dark section into `zzDarkMode.css`). Its danger outline-button fix is a
      shared change: after the outline and warning modifiers in
      `zUnionSuite.css`, and after the dark outline rules in `zzDarkMode.css`.
- [ ] Item 32, activity feed (proposed, not yet approved): section 32 (the
      feed chrome) → a new `US-ACTIVITY-FEED` section after the shared list
      shell rules. Its rows need the record cards first: move
      `prototypes/wip/activity-cards/activity-cards.candidate.css` into a new
      `US-RECORD-CARDS` section (dark values into `zzDarkMode.css`).
- [ ] Item 34, active positions badge (proposed, not yet approved):
      section 34 → `US-BANNER-COMPONENT`, after the alert bell (item 12).
      Its popup rules repeat the bell's; merge them into one shared banner
      popup rule set as both move.
- [ ] Section 29, native "Vertical right" CCOs: the grid rules →
      `US-NATIVE-TABS-PAGE-LAYOUT`; the V5 mirror →
      `US-NATIVE-TABS-COMPONENT`, after the desktop V5 rule. Check against
      the live Telerik `RadTabStripRight_Orion` skin, which the prototype
      does not load.

## `THeme/UnionSuite/99-Orion.css`

- [ ] Item 11, buttons: section 11 → the base button rule and
      `.SmallButton`. Orion is project-owned; change it in place.

## `THeme/UnionSuite/zzDarkMode.css`

- [ ] Item 21, dark mode: section 21 → beside each component's dark
      overrides.

## `THeme/UnionSuite/zUnionSuite.js`

- [ ] Item 8: add `US-IQA-ROW-GROUPS`.
- [ ] Item 10: add `US-CCO-RAIL-COLLAPSE` (its owner selector is
      `.us-cco-collapsible, .us-cco-rail`; it reads the side from `tabs-right`).
- [ ] Item 16: in `US-CCO-STICKY-TABS` (zUnionSuite.js), also
      match `.us-cco-rail`, so a rail needs no second class. The prototype
      keeps `us-cco-sticky-tabs` on the contact CCO until then.
- [ ] Item 12: add `US-BANNER-ALERTS`.
- [ ] Items 16, 17 and 24: add `US-CCO-SIDEBAR` (owner `.us-cco-rail`). Move the "Sections: …"
      label logic into `UnionSuiteTabs`, which builds the picker (README
      open decision 5).
- [ ] Item 18: replace `US-IQA-COLUMNS` with
      `theme-candidate-iqa-columns.js` (its `wordWidth` also counts badges
      and buttons at their own size). Re-apply the change if the theme
      block has moved on since the candidate was generated.
- [ ] Item 20: add `US-BANNER-ROW`.
- [ ] Item 31: in `US-UNIFIED-ACTIONS`, accept `action: {type: 'menu',
      items: [keys]}` in `define` and render a menu definition's heading
      slot entry as the `.us-actions` markup from
      `theme-candidate-heading-menus.js` (items are ordinary controls with
      the item actions' classes). Then drop that file's own registry,
      placeholder hiding and `UnionSuiteHeadingMenus`. Start the top-level
      line draw from `US-ACTION-MENUS`' open handling, as it does for
      submenus.
- [ ] Item 23: add `US-IQA-SCROLL-EDGES` beside `US-IQA-COLUMNS`.
- [ ] Item 27: replace `US-COPY` with `theme-candidate-copy.js`.
- [ ] Item 28: fold `US-ATTENTION-HIDE-ZERO` into the `US-ATTENTION` loader,
      so zero cards are filtered as they render.
- [ ] Item 32: add `US-RECORD-CARDS` (`activity-cards.candidate.js`), then
      `US-ACTIVITY-FEED`, which renders record cards.
- [ ] Item 33: add `US-ADJUSTMENTS` (`dues-adjustments.candidate.js`) after
      `US-RECORD-CARDS`, whose `fold()` animates its rows (or after the shared
      fold helper, if that lands first).
- [ ] Item 34: add `US-BANNER-POSITIONS` after `US-BANNER-ALERTS`. Its
      `field`, `apiRoot` and query request repeat the bell's: share one
      helper between the two blocks.
- [ ] Item 32: extract the heading filter toggle into one shared helper for
      any Query Template Display or Content HTML block (owner note,
      25 September 2026). `US-QUERY-SEARCH`, `US-ACTIVITY-FEED` and the IQA
      report filter toggle should all use it; the feed's local
      `headingToggle`/`setFiltersOpen` copy goes.

## Templates, configuration and IQAs

- [ ] Items 12 and 19: update `Banner-Contact-Template.html` (bell and counts
      placeholders, contact-type eyebrow, ID copy button, avatar icon). Add
      a `ContactType` alias to its IQA.
- [ ] Item 13: add `Member-Notes-Compact-Query-Template.html` to
      `guides/usage/templates/List-Templates/`, with its field definitions in
      `guides/usage/source/query-field-definitions.cjs`. Decide whether it
      replaces the existing notes template (README open decision 7).
- [ ] Item 17: add the `UnionSuiteCcoSidebarConfig` setting to the client
      `Config.js`.
- [ ] Items 12 and 17: document the Alerts and Tab Counts IQA field lists.
- [ ] Items 12 and 28: build the Alerts IQA from deadline-driven or
      actionable conditions only (resignation effective date, suspension
      date, lapse dates), and the contact tracker IQAs so nothing an alert
      covers is also counted (Pending requests excludes a resignation).
      One payment tracker per payment type: Failed payments, Overdue
      invoices, Missed deductions. See README Owner decisions,
      26 September 2026.
- [ ] Item 12: register `membership.log-retention-call` and
      `membership.process-resignation` in the client `Actions.js` (popups
      with the contact's ID), replacing the fixture's; the Alerts IQA's
      resignation template carries their buttons.
- [ ] Item 28: the tracker width cap (section 28) needs
      `--us-attention-shown` set where the `US-ATTENTION` loader filters
      zero cards.
- [ ] Item 34: add the positions placeholder to `Banner-Contact-Template.html`
      (in `.us-banner__status`, after the status badge). Build the Active
      Positions IQA (README [Active positions](README.md#active-positions)):
      active rows only, sorted by a seniority rank on the position type;
      confirm REST access and the filter name.
- [ ] Item 32: build the five activity source IQAs to the field contract
      (README [Activity feed](README.md#activity-feed)) and the one-row host
      Query Template; confirm REST access, the start-date filter names and
      paging cost in iMIS.
- [ ] Item 26: register the finance and membership actions in
      `UnionSuite-Client/Actions.js` as popups with the contact's ID. This
      replaces `finance-actions.fixture.js`. Keep `useAuthoredLabel: true`
      and `default: 'link'` on `finance.view-transaction`, and
      `useAuthoredLabel: true` on `finance.edit-override`, or the runtime
      replaces each row's text with the action label.
- [ ] Item 26: build the Transaction detail content page (popup, called with
      `?ID=…&Transaction=…&IsPopup=true`): a details panel (CSS class
      `us-action-finance-send-to-member us-action-finance-make-payment`),
      Line items and History, each an IQA filtered on the Transaction
      parameter; one page for invoices and payments. Decide what Send to
      member sends for a payment (receipt when paid, notice when declined).
- [ ] Item 26: client `Actions.js` defines `finance.update-billing-method` (opens
      the billing method editor for the payment type) and the two menus,
      `finance.manage-billing` (membership.change, update-billing-method,
      raise-invoice, refresh-pricing) and `finance.add-adjustment`
      (add-waiver, membership.suspend). Set the Active adjustments Query
      Menu's empty text to "No active adjustments" (confirm the setting in
      iMIS; otherwise use a Query Template Display with a No results field).
- [ ] Item 26: an Outstanding IQA that returns what is owed for each payment
      type in one list (open and overdue invoices, failed debits, deductions
      not remitted), with Reference, Type, Description, Due, Amount and
      Status; its Query Menu iPart and Active adjustments' are set not to
      render when empty. Billing reads the payment type and billing method;
      Balance (a Query Template Display) lists each credit under the total.
      Billing and Balance need equal-height panels in their row: a page
      layout rule today (`contact-page.css`); consider a theme option if
      other pages pair panels.
- [ ] Item 26: the Finance IQAs emit reference links
      (`<a class="us-action-finance-view-transaction" data-id=… data-transaction=…>`)
      and status badges with `us-badge--icon`, as the Jobs report emits its
      row buttons. Admin overrides and Legacy need their own IQAs and access
      settings (staff only).

## Usage guide

- [ ] Document in `THeme/UnionSuite/guides/usage/`: `us-cco-cards`,
      `us-cco-collapsible`, `us-cco-rail` (what it includes), the
      "Vertical right" setting for every vertical CCO, `us-iqa-row-groups`, `us-alerts` with inline actions, `us-notes`,
      the bell, tab search, counts and the Alt+S shortcut, the no-header
      tracker, `us-attention--hide-zero`, the panel tones, the button sizes,
      report column fit and scroll edges, and the copy label.
- [ ] Rebuild with `node tools/build-theme-usage.cjs`, then run its `--check`
      and `node tools/check-usage-sources.cjs`. Rebuild the banner, home and
      reference previews.

## After promotion

- [ ] Verify dark mode and the live iMIS checks in README
      [Verification status](README.md#verification-status); add the live
      checks to `TODO.md`.
- [ ] Remove the candidate files from the prototype, or point the prototype
      at the theme alone, and confirm it looks the same.
- [ ] Archive v1/v2 research only after anything useful has been kept.
