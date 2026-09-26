# Contact page v3

Status: approved, last updated 25 September 2026. The owner approved the v3
candidate (items 1–28) on 25 September 2026. It is not yet in the theme:
nothing in `THeme/` has changed, and the move starts only when the owner says
so. [THEME-CHANGES.md](THEME-CHANGES.md) tracks every change to make. Nothing
is committed.

Item 32, the recent activity feed on the Activity tab, was added on
25 September 2026 after that approval and is **proposed, not yet approved**.
See [Activity feed](#activity-feed).

## Resume here

1. Start the preview (see [Preview](#preview)) and open v3.
2. The paragraph-margin trim now applies to all native messages (item 22,
   owner decision 24 September 2026). Finish the dark mode checks listed under
   [Verification status](#verification-status).
3. Work through [Open decisions](#open-decisions). When the owner says to
   begin, work through [THEME-CHANGES.md](THEME-CHANGES.md).
4. Remaining UX ideas are in [Next ideas](#next-ideas); tab counts and the
   Sections filter are built (item 17).

## History

| Version | Location | What it is |
| --- | --- | --- |
| v1 | `prototypes/crm-contact-Prototype.html` | Original standalone mock-up with its own palette, sidebar, stat tiles and sub-tab pills. Owner likes its density, notes layout, header contrast, expandable failed payments, banner layout and sidebar menu. |
| v2 | `prototypes/wip/contact-page-v2/` | v1 rebuilt from existing theme components (contact banner, native CCO, section switcher, Needs Attention, native panels and reports, list shells). Correct but too loose. Its README holds the v1 → v2 component mapping. |
| v3 | this folder | v2 plus proposed theme changes (`theme-candidate*.css` / `.js`) that restore v1's density and add new components. |
| v4 | `archive/contact-page-v4 (rejected banner toggle)` (ignored) | Rejected: collapse toggle and collapsed Sections picker in the banner. |

## Preview

Start the `static-node` configuration in `.claude/launch.json` (port 8778),
then open:

```text
http://localhost:8778/prototypes/wip/contact-page-v3/index.html
```

The Claude preview pane needs the server: opening the file directly shows a
snapshot without the linked theme CSS/JS. While Claude drives the pane, it may
not accept clicks; it responds again when Claude stops.

### Standalone export

Run `node prototypes/wip/contact-page-v3/build-standalone.cjs` from the project
root to create `Contact-Page-v3-Standalone.html` in this folder. The generated
file embeds the stylesheets, scripts and available local image assets used by
`index.html`, so it can be copied and opened without the project folder or a
preview server. Run the same command with `--check` to confirm it is current.
Edit the linked sources, then rebuild; do not edit the generated file.

The standalone toolbar omits links to v1 and v2 because those files are outside
the export. The theme's remote Google Fonts imports are omitted so the file can
work offline; the browser uses its font fallbacks. Vendor stylesheet images that
are absent from this checkout are replaced with empty images during the build.
SVG sprites that pick their icon with `:target` (such as `NavbarSprite.svg`, used
by the rail toggle) are embedded as a copy that shows the named icon, because a
`data:` URL gives the browser no fragment target and every icon stayed hidden.

Toolbar controls (prototype only):

| Control | Effect |
| --- | --- |
| Tabs: right/left | Stands in for the CCO iPart's "Tab display style" setting: swaps the classes iMIS renders for "Vertical right" (`tabs-right`, `RadTabStripRight`; the page default, 25 September 2026) and "Vertical left" (`tabs-left`, `RadTabStripLeft`). Remembered in `localStorage` key `cv3TabsSide`. |
| Contact: individual/organisation | Switches the sample contact type, which fills the banner eyebrow and picks the avatar icon (item 19). Not remembered. |
| Mode: light/dark | Calls the theme's `UnionSuiteAppearance.toggle()`, so `zzDarkMode.css` applies exactly as on the site. Remembered in the theme's own key `union-suite:appearance:v1` (`UnionSuiteAppearance.reset()` returns to the system setting). |
| Pays by: auto debit / invoice / payroll | Cycles the sample member through the three payment types: auto debit (card or bank account, charged automatically; owes failed debits), invoice (BPAY or EFT; owes open and overdue invoices) and payroll deduction (the employer pays from salary, pre-tax; owes deductions the employer did not remit). Changes Finance Billing, Balance, Outstanding and payment history (item 26). Not remembered. |
| Adjustments: active / none | None: Active and upcoming adjustments shows its No results text, "No active or upcoming adjustments.", as iMIS does (the result set is omitted), and drops its count, column headings and info tone; the panel and its Add adjustment menu stay. Not remembered. |
| Arrears: overdue / none | Overdue: the member owes an overdue amount for their payment type. None: it is settled (payment history gains the settling payment) and Outstanding lists only what is not yet due, so it disappears for auto debit and payroll members. Also sets Finance Balance and the tone of Balance and Outstanding, the Summary Financial status, the Summary overdue alert, the bell, the Finance tab badge and the tracker. Not remembered. |
| Trackers: live / all clear | Makes every contact tracker IQA return 0 (a member in good standing) to show the all-clear line of item 28. Combine with "Invoice: not yet due" to see a single tracker hidden. Not remembered. |
| Activity: all sources / one failing | One failing: the Meetings activity IQA returns HTTP 500, so the activity feed shows its incomplete-list notice with Retry (item 32). Reloads the feed. Not remembered. |
| Raise sample alert | Adds a third alert to the fixture and re-checks the bell's count. |
| Button sizes | Opens a strip comparing standard, small, alert and beside-a-field buttons, with measured heights. |

Fixtures: tab counts come from a sample Tab Counts response (Finance "!" danger,
Cases 2 warning); alerts, trackers and the
five activity source IQAs come from offline `fetch` responses in
`contact-page.js`. The activity responses honour `ID`, `StartDate`, `limit` and
`offset`, and answer after 150–450ms each.

Browser state used by the candidate and fixtures:

| Key | Purpose | Reset |
| --- | --- | --- |
| `UnionSuiteCcoRail` | Saved collapse choice (`collapsed` / `expanded`). | `UnionSuiteCcoRail.reset()` |
| `UnionSuiteAlertsSeen` | Newest alert key and count last opened, per query and contact. | Remove the key |
| `cv3TabsSide` | Prototype rail side (right unless set to `left`). | Toolbar button |

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page composition with native iMIS wrapper fixtures. Links the real `99-Orion.css`, `zUnionSuite.css`, client CSS, `zzDarkMode.css`, `zUnionSuite.js`, `Scripts/ActionDefinitions.js` and client `Actions.js`, then the candidate files. `theme-candidate-iqa-columns.js` loads before `zUnionSuite.js`.  Also links `../activity-cards/activity-cards.candidate.css` and `.js` (the record cards the activity feed renders; its `fold()` also animates the adjustment rows), `../dues-adjustments/dues-adjustments.candidate.css` and `.js` (the Active and upcoming adjustments list, item 33), and the theme's `Tabler/tabler-icons.min.css` (the icon sheet directly: the `Tabler.css` shim is an `@import` the standalone build does not follow). |
| `THEME-CHANGES.md` | Checklist of every change to make in the theme, by target file, with the decisions that shape the move. |
| `build-standalone.cjs` / `Contact-Page-v3-Standalone.html` | Reproducible single-file export of `index.html` with local CSS, JS and available image assets embedded. |
| `theme-candidate.css` | Proposed CSS, sections 1–17, 21–23, 25, 27–31 and 32 (items 19 and 20 are in section 3; item 18 is script only). Each section names its target in the theme and uses the theme's own selectors, so an approved section moves across unchanged. |
| `theme-candidate.js` | Proposed `US-IQA-ROW-GROUPS`, `US-CCO-RAIL-COLLAPSE`, `US-BANNER-ALERTS`, `US-CCO-SIDEBAR`, `US-BANNER-ROW`, `US-IQA-SCROLL-EDGES`, `US-ATTENTION-HIDE-ZERO` and `US-ACTIVITY-FEED` blocks for `zUnionSuite.js`. |
| `theme-candidate-iqa-columns.js` | Candidate replacement for the whole `US-IQA-COLUMNS` block (item 18). |
| `theme-candidate-heading-menus.js` | Candidate `US-ACTION-HEADING-MENUS` (item 31): dropdowns in panel headings, configured like heading buttons. Loads straight after `zUnionSuite.js`, before `ActionDefinitions.js` and the client `Actions.js`, so menus can be registered there. |
| `theme-candidate-copy.js` | Candidate replacement for the whole `US-COPY` block (item 27): the flash lasts as long as its CSS animation, and a "Copied" label shows beside the button. Loads before `zUnionSuite.js`. |
| `Member-Notes-Compact-Query-Template.html` | Candidate author template for compact (v1-layout) notes. |
| `contact-page.css` / `contact-page.js` | Prototype layout, offline `fetch` fixtures, CCO tab simulation, toolbar controls and demo-only command toasts. |
| `finance-actions.fixture.js` | Prototype-only registrations for the finance and membership actions (item 26), so the theme runtime draws their heading buttons and keeps the row links; clicks show a demo toast, except View details, which `contact-page.js` answers with a stand-in for the Transaction detail popup (`<dialog id="cv3-transaction">` in `index.html`, sample data in `contact-page.js`). Loaded after the client `Actions.js`. |

## Proposed theme changes

Measurements are from a 1280–1335px desktop viewport. "Site-wide" items change
every page that uses the component; "opt-in" items need a class on the iPart.

| # | Change | Before → after | Scope | Target |
| --- | --- | --- | --- | --- |
| 1 | Panel header tokens: min height, padding, title 15 → 14px, weight 700. Touch pointers 64 → 56px. | Header 56 → 44px | Site-wide: panels, IQA reports, list shells, Needs Attention heading | Tokens at the top of `zUnionSuite.css` and the `pointer: coarse` override |
| 2 | Section switcher: 30px buttons, 3px track, 72px minimum width, no separator. Touch keeps 44px. | About 54 → 38px | Site-wide: `us-section-tabs` | `US-SECTION-TABS` |
| 3 | Banner uses v1's styling, in the one-row layout of item 20: status badges immediately left of the actions (8px, the actions' own spacing). 22px name, 48px avatar with a visible ring, uppercase fact labels, smaller member-status badge. Stacks as before below 900px. No template change (the summary becomes `display: contents`). | Banner 209 → 105px (166px wrapped); condensed 61px | Site-wide: all banners | `US-BANNER-COMPONENT` |
| 4 | Needs Attention cards 96 → 72px, 26px numbers. Leaving out the `<header>` is the no-header mode; no class needed. | Tracker 152 → 76px | Site-wide: `us-attention` | `US-ATTENTION` |
| 5 | `us-cco-cards` (also brought by `us-cco-rail`, item 16): no shared content box; panels sit on the page background. The rail becomes a standalone nav (transparent rows, pale accent selection, accent marker, 36px tabs, 20px gutter). Rail width and gap become tokens (`--us-cco-rail-width`, `--us-cco-cards-gap`). Nested CCOs keep V5/H2. Phones (600px and below, 24 September 2026): the content box also goes (16px gap above the first panel), so panel text starts 39px in instead of 58px on a 375px screen. | — | Opt-in per CCO iPart | New block after `US-NATIVE-TABS-COMPONENT`; tokens in `US-NATIVE-TABS-PAGE-LAYOUT` |
| 6 | Read-only data panel fields: padding 12 → 6px; panel body padding reduced. | Field 64 → 52px | Site-wide: `[data-us-panel]` read-only | Data display panel rules |
| 7 | Header contrast: report column headers `--neutral-200` with a `--neutral-300` rule (the old token resolved almost to the panel header shade). | Column head `#f3f4f4` → `#e5e6e7` | Site-wide: native reports | IQA token block after `US-IQA-BASELINE` |
| 8 | `us-iqa-row-groups`: adjacent rows sharing the first column collapse under the first row with a toggle. When every hidden row has the same status badge, the toggle names it and takes its tone (v1's failed attempts: "› 2 declined" in red); otherwise "n more". Expanded detail rows read as one block, as in v1: tone tint (or grey), no rules between them, 12px text, a dot in place of the repeated key (still in the cell for export and screen readers), one tinted rule closing the group (24 September 2026). Rows stay native (sorting, paging, export unchanged). See [Row groups](#row-groups). | — | Opt-in per Query Menu iPart | New CSS after the IQA report rules; `US-IQA-ROW-GROUPS` JS |
| 9 | `us-alerts`: lighter native messages (pale border, 4px coloured left edge, 13px text, even padding; outer paragraph margins trimmed by item 22) and an optional `.us-alerts__actions` group with small buttons that follow the message text (16px after it, or wrapped underneath and aligned with the text when the line is full). Alerts live on the Summary tab. | Alert 57 → 48px; buttons 37 → 28px | Opt-in per iPart | New block after the native feedback messages |
| 10 | `us-cco-collapsible` (also brought by `us-cco-rail`, item 16): collapsible vertical CCO rail. See [Collapsible rail](#collapsible-rail). | Content +240px wide when collapsed | Opt-in per CCO iPart | New block after `US-NATIVE-TABS-COMPONENT`; `US-CCO-RAIL-COLLAPSE` JS |
| 11 | Buttons: standard `TextButton` text 15px/500 → 13px/600, height held at 36px to match form fields. `SmallButton` / `UseSmallButton` fixed at 28px with 12px text (was 85% of the surrounding text). Alert buttons are small automatically. | Standard 37 → 36px | Site-wide: every native button | `99-Orion.css` base button rule and `.SmallButton` (Orion is project-owned; change it in place) |
| 12 | Banner alert bell with count badge and popup list. See [Alert bell](#alert-bell). | 1 small request per page | Opt-in per banner template | `US-BANNER-COMPONENT` (after Quick Actions); `US-BANNER-ALERTS` JS; `Banner-Contact-Template.html` |
| 13 | Compact notes (v1 layout): `us-notes` with `Member-Notes-Compact-Query-Template.html`. Meta line (author, date, type badge right), then the text; optional subject leads in bold. `us-notes--pinned` adds the warning background, accent edge and pin icon. See [Compact notes template](#compact-notes-template). | Note 156 → 84px | Opt-in per notes iPart | New block after the list shell rules; new template in `guides/usage/templates/List-Templates/` |
| 14 | Read-only panel labels: 11px semibold uppercase, 0.06em spacing, muted (matching column headers and banner facts); values 14px medium, strongest text colour, 2px below. Edit forms unchanged. | Label 12px/500 → 11px/600 caps; value 13px/400 → 14px/500 | Site-wide: `[data-us-panel]` read-only | Data display panel rules |
| 15 | Right-hand rail from the CCO iPart's own "Tab display style: Vertical right" setting (iMIS renders `tabs-right` on the `.cco` element and `RadTabStripRight` on the strip, in the same markup order as "Vertical left"; confirmed from a live page, 25 September 2026). With `us-cco-cards` or `us-cco-rail`: rail on the right of the content, away from the iMIS navigation. Toggle top right with mirrored icons; collapsed bar right-aligned; animation anchored to the right. Replaces the `us-cco-rail-right` class first proposed. | — | Per CCO iPart setting | New block after item 5 |
| 16 | `us-cco-rail`: v1's edge-attached sidebar rail, for chosen CCOs only. One class: it brings the card layout (item 5) and the collapsible rail (item 10), and takes its side from the iPart setting (item 15). Renamed from `us-cco-sidebar`, which also needed `us-cco-cards` and `us-cco-collapsible` (25 September 2026). See [Sidebar rail](#sidebar-rail). | Panel flush with banner edge and bottom | Opt-in per CCO iPart | New block after item 15; `US-CCO-SIDEBAR` JS |
| 17 | Sidebar extras, tailored to `us-cco-rail` only: tab search and tab counts. See [Sidebar search and tab counts](#sidebar-search-and-tab-counts). | 1 request per page when configured | Opt-in with the sidebar | New block after item 16; `US-CCO-SIDEBAR` JS |
| 18 | Report columns fit their panel: until someone resizes a column, a native report's columns share the grid's available width in proportion to their natural widths (never below each column's floor: its whole text when that fits in 140px, otherwise its longest word, so text never breaks mid-word; candidate 1.5, 24 September 2026; a short badge or button in the cell counts at its own font, padding, border and icon, so a status badge never wraps, 25 September 2026), so a report that narrows or widens after load (window resize, the collapsible rail) refits instead of keeping its load-time width and scrolling sideways. User-resized widths are kept as before. `theme-candidate-iqa-columns.js` is the whole `US-IQA-COLUMNS` block (1.5-candidate), generated from the theme block with only `fitPanelWidth`, `entry.base`/`userSized` and the version changed. | Sideways scroll removed | Site-wide: native reports | Replace `US-IQA-COLUMNS` in `zUnionSuite.js` |
| 19 | Contact banner identity: the eyebrow shows the contact type from the query instead of the fixed word "Contact", and the ID gets the theme's copy button. An empty avatar with `data-us-contact-kind` shows the taskbar quick search's person or company drawing instead of initials (`Organisation`, `Organization` or `Company` show the building; any other value the person), sized from the avatar so it condenses with the banner. The copy button in the eyebrow is 24px (44px on touch), pulled into the line so the eyebrow keeps its 18px height, and centred on the capitals and digits (`vertical-align: calc(.5cap - 8px)`). See [Contact type](#contact-type). | Eyebrow "Contact · 004821" → "Individual · 004821 ⧉"; initials → icon | Opt-in: contact banner template | `US-BANNER-COMPONENT` (after the avatar rules); `Banner-Contact-Template.html` |
| 20 | One-row banner, replacing the two-row grid first proposed in item 3; locked in by the owner. See [One-row banner](#one-row-banner). Phones (24 September 2026): the badges and the actions share one row under the name, badges left, bell and Quick Actions right; condensed, Quick Actions sits at the right of the second row. | Banner 149 → 105px when the details fit | Site-wide: all banners | `US-BANNER-COMPONENT` (CSS section 3); `US-BANNER-ROW` JS |
| 21 | Dark mode for the candidate: items 5, 7, 8, 10 and 16 used brand/neutral ramp steps, which `zzDarkMode.css` keeps light, so sidebar tab text was unreadable, the selected tab stayed pale and report column heads stayed `#e5e6e7`. CSS section 21 re-points each use at the dark palette (`--dm-selected`, `--dm-hover`, `--bg-sunken`, `--text-link`). | Column head in dark `#e5e6e7` → `#263740` | Site-wide in dark mode (follows its items) | `zzDarkMode.css`, beside each component's dark overrides |
| 22 | Native messages: trim the first child's top margin and the last child's bottom margin inside every `Asi*` message, so authored paragraphs get even padding. Margins between paragraphs stay; iMIS-generated messages (bare text) are unchanged. Replaces item 9's us-alerts-only trim (Finding 6). | Authored message bottom gap 13px + padding → padding only | Site-wide: all native messages | `US-MESSAGES`, after the shared message box rule |
| 23 | Report scroll edges: a native report wider than its panel fades the edge with hidden columns (32px mask on the right while more lies right, on the left once scrolled), so a clipped column no longer looks like the table's end. A mask, not a shadow, because header and row cells paint over the grid's background. `US-IQA-SCROLL-EDGES` sets `data-us-scroll-more` (`start`, `end`) on scroll, resize and partial updates; right-to-left pages mirror. | — | Site-wide: native reports that scroll sideways | CSS section 23 after the IQA report rules; `US-IQA-SCROLL-EDGES` JS beside `US-IQA-COLUMNS` |
| 24 | Sections shortcut: Alt+S (Option+S on a Mac, matched on the physical key) from anywhere, even while typing. Expanded: focuses the sticky rail's "Find a section" box (or the current tab). Collapsed: scrolls the Sections bar 8px under the pinned banner, re-checks once the scroll settles, and opens the list with its search focused. Phones: opens the sticky dropdown. A keycap ("Alt S" / "⌥S") shows in the search box until it is used; the Sections button's tooltip and `aria-keyshortcuts` name it. `UnionSuiteCcoSidebar.jumpToSections()` exposes it. Replaces "scroll to top on switch": the non-sticky bar is only reachable at the top, so the shortcut brings it there. No `accesskey` or theme Alt shortcut uses S (checked in the saved Orion page and the theme). | — | `us-cco-sidebar` CCOs | `US-CCO-SIDEBAR` JS; keycap CSS in section 17 |
| 25 | Panel tones: `us-panel-tone-danger` / `-warning` / `-info` on a panel iPart mark it as needing attention; `us-panel-tone-auto` takes the tone of the most serious status badge inside (danger, then warning) and otherwise stays plain, using `:has()`, no script. Tinted heading (`--danger-bg` / `--info-bg`) and tinted border (a 4px leading tone bar was tried and declined). Overrides the iPart's `--iqa-*` tokens on `.panel`, so no specificity contest with the heading rules; dark mode follows the remapped status tokens. | — | Opt-in per panel iPart | CSS section 25, after the panel and report heading rules |
| 26 | Finance tab (page composition and client actions, not theme CSS), rebuilt to the owner's list, 25 September 2026, for all three payment types (auto debit, invoice, payroll deduction; only invoice members have invoices). Above the switcher: **Billing**, three rows of two (billing category, payment type, frequency, amount with a "Waiver applied" badge, default billing method, next payment date; each value appears once) with a **Manage billing** menu: Change membership (first: a new payment type goes through that form, because clients tie payment types to frequencies and categories), Update billing method (a new card, a new expiry, new account details), Raise invoice (every member), Refresh pricing. Beside it **Balance** (arrears, outstanding, credit available with one line per credit; Apply credit; auto tone), the two panels equal height. Then, full width, **Outstanding** (what is owed for the payment type: open and overdue invoices, failed debits, deductions the employer did not remit; Make payment; auto tone; not rendered when empty) and **Active adjustments** (Waiver, Suspension, Membership change, with details, fee effect, dates and status; an **Add adjustment** menu: Add waiver, Suspend membership; always shown, with the grid's "No active adjustments" row and no tone when empty). Switcher: Payment history, Adjustments (active and historical; the same Add adjustment menu), Payment methods, Tax statements, Admin (staff overrides; staff only), Legacy (read-only, excluded from balances). References in Outstanding, Credit available and Payment history open one **Transaction detail** popup (details with a status icon, line items, history, related transactions linked; Send to member, and Make payment for an invoice with an amount owing). Status badges carry icons (item 30). Summary is unchanged (owner, 25 September 2026). | — | Contact page | Page layout; Transaction detail content page; `UnionSuite-Client/Actions.js` |
| 27 | Copy flash: the copied text is highlighted instead of ringed. A rectangle exactly the size of the text (no padding; 3px radius) fills the target, its edges softened by a 3px blur of the same colour, holds briefly, then fades slowly over 1.6s; the candidate US-COPY script (`theme-candidate-copy.js`) removes the class after the CSS animation's own length instead of a fixed 700ms, so CSS alone sets the timing. The banner ID copy button stays compact (24px) except on touch pointers; it had also grown to 44px in any window 950px or narrower. A "Copied" label (success colour at 75%, 11px medium) appears 4px past the copy icon (measured from the icon, so the gap is the same on a 44px touch button) while its tick shows, positioned outside the button so nothing moves, fading in during the flash's hold, then fading out at exactly the flash's rate; aria-hidden, since the live region already announces "Copied". The accent colour at 60% everywhere, including the banner. The glow colour is a registered property (`@property --us-copy-glow`) so the fill and shadow animate; reduced motion shows it static. | Outline ring → glow | Site-wide: every `us-copy` / banner copy target | CSS section 27, replacing `.us-copy-flash` and `@keyframes us-copy-flash` in `US-COPY`; `theme-candidate-copy.js` replaces the `US-COPY` script block |
| 28 | Quiet trackers: `us-attention--hide-zero` beside `us-attention` hides zero-count cards (the rest share the row, dividers between visible cards only); when every card is zero, the row gives way to one "✓ Nothing needs attention" line, so an all-clear still reads as loaded. Unavailable counts ("—") always show. Used on the contact trackers; the home dashboard keeps its zeros unless opted in. | Tracker 76px → 40px when all clear | Opt-in per Needs Attention block | CSS section 28; `US-ATTENTION-HIDE-ZERO` JS (on promotion, filter inside the `US-ATTENTION` loader) |
| 30 | Status icons in badges: `us-badge--icon` beside `us-badge` adds a 14px icon before the text, chosen by tone (tick, cross, warning sign, clock, minus), or by `data-us-icon` (check, cross, alert, clock, refund, ended) when statuses share a tone. Status reads by shape as well as colour. Used on Finance payment, invoice and adjustment statuses and in the Transaction detail popup. | — | Opt-in per badge | CSS section 30, `US-BADGES` after the tone rules |
| 33 | Adjustments (proposed, not yet approved), 26 September 2026: the owner's dues adjustments design (`prototypes/wip/dues-adjustments/`, where its Query Template, field list and decisions live) as two layouts. Above the Finance switcher, **Active and upcoming adjustments**: a Query Template Display (`us-query-template us-adjustments us-panel-tone-info us-action-finance-add-adjustment`) with Status, Type, Fee effect and Period (start – end) at a glance, plus Reason on panels 1100px and wider (revised 26 September 2026; was Type, Fee effect, Starts, Ends, Status); an upcoming row's fee effect muted; relative time under the period ("5 months left", "Starts in 5 months"; amber when an active adjustment ends within 30 days); rows stack into cards at 760px and narrower; each row expands, with the activity history's fold animation, to its reason, amount, changed attributes, note, who created it and Edit / End adjustment / View affected transactions. Column headings in the iPart's Header field, "No active or upcoming adjustments." in its No results field; the info tone drops when there are none. On the Adjustments tab, **All adjustments**: the standard native Query Menu grid of every adjustment, active and upcoming included, Type linking to the record (`finance.view-adjustment`). Both use the same type names, fee-effect wording, status badges and dates. | Two Query Menu grids (Active adjustments, All adjustments) → a Query Template list above the switcher + one native grid on the tab | Opt-in: `us-adjustments` on the Query Template iPart; the grid needs no class | `dues-adjustments.candidate.css` and `US-ADJUSTMENTS` JS from `prototypes/wip/dues-adjustments/` (its danger outline-button fix → `zUnionSuite.css` / `zzDarkMode.css`); section 25 (empty Query Template stays plain) and section 30 (status badges keep to one line) additions |
| 32 | Recent activity feed (proposed, not yet approved): one list on the Activity tab built from five IQAs (Interactions, Outbound calls, Outbound emails, Inbound emails, Meetings) with `GET /api/query`, replacing the Notes and Communications sub-tabs (Documents stays). Each row is a record card from the activity cards workbench (`prototypes/wip/activity-cards/`, `US-RECORD-CARDS`): the owner's original card structure on theme tokens (type line, headline, preview, date column; colour only on the rail icon and for importance). Search and date range fold behind the heading's filter button; the type filters (slim section switcher) stay visible, and a chosen type shows a "View all …" link to its IQA page. See [Activity feed](#activity-feed). | Notes panel + communications grid → one feed | Opt-in: a `.us-activity-feed` element | CSS section 32 (the feed chrome); the card CSS and `US-RECORD-CARDS` from `prototypes/wip/activity-cards/`; `US-ACTIVITY-FEED` JS |
| 31 | Heading menus: a dropdown in a panel heading, configured exactly like a heading button. One definition with the button's shape and `action: {type: 'menu', items: [action keys]}`, placed by its `us-action-*` class in the iPart CSS class field. It renders as the theme's `.us-actions` dropdown (Quick Actions' motion and keyboard handling); each item is an ordinary control with the item action's class, so the action runtime labels, checks and runs it. The toggle matches the heading's outline buttons (32px). The top level draws the side line and travelling glint of the theme's submenus when it opens (same line keyframe and timing); deeper levels are unchanged. The line spans the items exactly and grows with the list as it unfolds, the glint riding its tip; items start 5px past the line, so the hover fill never covers it. Used for Manage billing and Add adjustment. | Three heading buttons → one menu | Opt-in per iPart, by class | `US-UNIFIED-ACTIONS` (accept type `menu`; render it in the heading slot); CSS section 31 in `US-ACTION-MENUS` |

### Collapsible rail

Item 10. Add `us-cco-collapsible` to the CCO iPart's CSS class field (usually
with `us-cco-cards`). `us-cco-rail` includes it. The side follows the iPart's
"Tab display style" setting.
Desktop only; mobile, nested CCOs and Easy Edit are unchanged.

**Toggle and states**

- An icon button (the iMIS navigation's collapse/expand icons) sits at the top
  of the rail's column and keeps exactly the same position in both states.
  Expanded, the rail starts beneath it and the content starts level with it.
  The CCO is pulled up 16px, halving the native 32px gap to the iPart above.
- Collapsed, a "Sections: <current>" dropdown (the existing mobile All
  sections picker) replaces the rail beside the toggle, and the content goes
  full width. The dropdown uses the banner Quick Actions chevron (filled
  10x6, turns 180 degrees over 220ms) and the theme's dropdown motion: it
  unfolds from zero height over `--us-actions-duration` (default 400ms,
  `cubic-bezier(.22, 1, .36, 1)`) and folds back on every close path, via a
  short-lived, non-interactive copy because the theme closes the details
  instantly.
- When the open tab starts with a section switcher that fits beside the
  bar's controls, it shares the Sections row: the content starts in that
  row, the bar shrinks to its controls on the rail's side and the switcher's
  block leaves room and centres on the Sections box. Otherwise the switcher
  keeps its own row. Runtime attributes and properties
  (`data-us-cco-sections-inline`, `data-us-cco-sections-host`,
  `--us-cco-bar-space`, `--us-cco-sections-offset`) are managed by the script;
  do not author them.
- The choice is saved per browser for every page (`UnionSuiteCcoRail`); with
  no saved choice the rail collapses below 1200px. API:
  `UnionSuiteCcoRail.collapse() / expand() / reset() / refresh()`.

**Animation** (where the browser supports same-document view transitions;
reduced motion and other browsers switch instantly)

- Duration: one setting, `--us-cco-rail-motion: 1000ms`, read by both the
  stylesheet and the script. (Tried at 460ms, 720ms and 1.5s; the owner chose
  1s on 24 September 2026.)
- The menu is the only snapshot (the page root is not captured). Collapsing,
  the whole menu folds up from the bottom to the height of the Sections box,
  then moves sideways into the box's position; expanding reverses this. It
  morphs into the Sections box itself, not the full-width bar. Its snapshots
  are clipped to their box and anchored to the rail's side.
- The content stays live and follows the fold block by block: each top-level
  block of the open tab (panel, report or row) starts at its old width and
  animates its side margins to the new width as the menu's edge passes it,
  bottom block first when collapsing and top block first when expanding (each
  at least 20% of the duration). Panels grow smoothly, text re-wraps
  continuously and reports refit with them (item 18).
- The content glides vertically in the first half in both directions (ease in
  and out): collapsing, it moves down out of the Sections row while the menu
  folds into it; expanding, it rises as the Sections box leaves.
- Start widths are applied before the new state is first painted, so the
  final layout never flashes. The menu's snapshots are clipped below the page
  chrome (`--us-cco-rail-clip-top`, the lowest bottom edge of `#hd`, the
  taskbar and the banner surface), because the browser draws snapshots above
  the whole page; without it the expanding panel covered the banner.

### Sidebar rail

Item 16. Add `us-cco-rail` to the CCO iPart's CSS class field; it is not
default styling. It brings `us-cco-cards` and `us-cco-collapsible` with it, so
those are not added separately. Choose the side with the iPart's own "Tab
display style" (Vertical left or Vertical right). The contact page uses
`us-cco-sticky-tabs us-cco-rail` with Vertical right; the sticky class stays
separate until the theme's sticky script also recognises `us-cco-rail`
([THEME-CHANGES.md](THEME-CHANGES.md)).

- Square white panel with one border on the content side: page structure
  like the banner, not a content card. In the page-level column it bleeds
  through the column's half-gutter to the page edge (exactly the banner's
  edge). When a banner is directly above, it rises to meet the banner (the
  gap is measured by `US-CCO-SIDEBAR` JS; nothing is covered if another block
  sits between). Nested columns keep the normal inset.
- Full-width 40px rows, 13px semibold `--neutral-700`, `--bg-subtle` hover,
  `--brand-50` selection with `--brand-700` text and a 3px `--brand-600` bar
  on the outer (page-edge) side, mirrored for a right rail. Theme tokens, so
  client branding applies.
- The toggle sits 10px inside the panel's outer
  edge and 8px below the banner, with 8px between it and the search box. The
  collapsed Sections bar rises to match, so the toggle does not move; the
  Sections box is top-aligned with it. The bar's cover above is 4px, matching
  its gap to the banner, so it never overlaps the banner.
- v1's group headings are not possible on native tabs; counts are item 17.
- Phones (600px and below): the theme's horizontal tab strip is hidden and
  its All sections dropdown is the only control, labelled "Sections:
  <current tab>". It is attached to the banner like the desktop panel:
  edge to edge in the page-level column (text on the content's 20px inset),
  square, white with a bottom border, meeting the banner's bottom edge, and
  sticky directly beneath the pinned banner while scrolling
  (`--us-cco-rail-sticky-top`, measured by `US-CCO-SIDEBAR` from the
  pinned banner and any fixed top chrome). The list opens over the content.
  Opening it does not focus the search box on phones, so the on-screen
  keyboard does not cover the list; desktop still focuses it. Other CCOs
  keep the theme's mobile picker and tab strip.

### Sidebar search and tab counts

Item 17. Both exist only for CCOs with `us-cco-rail`; no other tab control
gets them.

Search appears above the tabs and at the top of the collapsed Sections list
(which focuses it on open) once the menu has enough tabs. Enter opens the first
match, Escape clears, Down moves to the results; typing never reaches
Telerik's tab keys. Settings, in the client `Config.js` (plain JavaScript):

```javascript
window.UnionSuiteCcoSidebarConfig = {
  ...window.UnionSuiteCcoSidebarConfig,
  search: true,      // false hides the search box
  searchMinTabs: 8   // show search once the menu has this many tabs
};
```

Counts (v1's nav badges): add a hidden placeholder to the banner template (the
banner supplies the contact ID), next to the alert bell:

```html
<div class="us-cco-counts" hidden
  data-us-counts-query="$/_i4u_/SandBox/CRM Layouts/Contact_Page/Tab Counts"
  data-us-counts-filter="ID" data-us-counts-value="{#query.ID}"></div>
```

- Mark only what needs attention — open cases, money owing. A count of how many
  records a tab holds is noise (a long-standing member can have hundreds of
  notes), so the IQA returns no row for tabs like Activity.
- One IQA returning a row per tab: `Tab` (the exact tab label), `Count`,
  optional `Tone` (`danger`, `warning`, `info`; blank is neutral) and optional
  `Badge` (text such as `!` shown instead of the number). A count of 0 with no
  badge shows nothing. `ID` is an example filter name; confirm it with
  `GET /api/QueryParameterDefinition`.
- One `GET /api/query` per page load; failures leave the tabs unmarked.
  `UnionSuiteCcoSidebar.reloadCounts()` re-reads them. No placeholder means no
  counts.
- Counts render from `data-us-count` via CSS, so tab text and the collapsed
  list's labels are unchanged (Finding 15).

### Alert bell

Item 12. Place in the banner template's `.us-banner__actions`, before Quick
Actions:

```html
<div class="us-banner__alerts"
  data-us-alerts-query="$/_i4u_/SandBox/CRM Layouts/Contact_Page/Alerts"
  data-us-alerts-filter="ID" data-us-alerts-value="{#query.ID}"
  data-us-alerts-tab="Summary"></div>
```

- One IQA, sorted newest first, with a named filter for the contact. `ID` is
  an example: confirm the real filter with `GET /api/QueryParameterDefinition`.
  Output aliases: `AlertKey` (unique), `Severity` (`danger`, `warning`,
  `important`, `info`, `success`), `Title`, `Message`, `AlertDate` (display
  text), optional `Link`.
- Page load: one `GET /api/query` with `limit=1`. `TotalCount` sets the badge;
  the newest `AlertKey` and the count decide "new" against what this browser
  last opened. Opening the popup: one `GET /api/query` with `limit=100`, which
  then marks the list seen. (Owner asked for this count-then-list pattern.)
- Badge: red while something is new, an outlined count once seen, hidden at 0.
  The popup shows a severity edge, title, message, date and optional link, and
  ends with "View on Summary →", which selects that CCO tab. Escape and outside
  clicks close it. Below 900px the popup opens rightwards from the bell
  (the actions start at the left edge), except in the condensed banner,
  where the bell is at the right and it opens leftwards as on desktop.
- Condensed banner on phones (600px and below, where it wraps): the bell
  stays on the name line at the right and the status pill starts the
  second line beside Quick Actions (the actions group becomes
  `display: contents` so the bell and menu are placed separately).
- The Summary alerts should be a Query Template Display on the same IQA so
  both agree. The prototype's Summary alerts are static.
- `UnionSuiteBannerAlerts.reload()` re-checks counts. A placeholder with no
  query, filter or value, or an unsubstituted `{#…}`, is hidden.

### One-row banner

Item 20, locked in by the owner on 24 September 2026 after comparing it with
the two-row grid first proposed in item 3. Removing the alert badges had left
that grid with an empty top-middle cell and empty space under the identity;
the one-row layout removes both. It is the banner layout in section 3 of
`theme-candidate.css` (no modifier class):

- **Fits** (`data-us-banner-fit="row"`): identity | details | status |
  actions in one row, all vertically centred. A light 1px rule separates the
  details from the identity, 24px from each; it uses the theme's existing
  banner divider colour (the line between a description and the facts:
  `--banner-border` mixed with 15% `--banner-text`) and is as tall as the
  details. Banner 105px; condensed 61px as before (the rule fades out with
  the details).
- **Does not fit** (`"wrap"`): identity, status and actions in the top row;
  the details take a second row starting under the avatar, aligned with the
  banner's left edge, below a full-width light rule in the same colour,
  12px from the identity and 12px from the facts. The rule sits on the
  details inside the condensing fold, so it collapses with them. Banner
  166px (149px without the rule). The theme's details already had a top
  divider, which the candidate had removed on desktop; mobile keeps the
  theme's own.
- Facts are 24px apart instead of 32px in both states.
- `US-BANNER-ROW` tries the one-row layout and keeps it only if every fact
  stays on one line at full width, so long values wrap sooner. It measures
  on width changes (not while condensed; again after the banner expands)
  and exposes `UnionSuiteBannerRow.refresh()`. The sample contact fits from
  about 1,400px wide.
- Below 900px the banner stacks as before.
- The script runs for every banner; the rules are skipped inside
  `us-report-no-styling`.

### Contact type

Item 19. In `Banner-Contact-Template.html`, one query alias fills both the
eyebrow and the avatar (the ID needs a page-unique `id` for the copy button):

```html
<span class="us-banner__avatar" data-us-contact-kind="{#query.ContactType}" aria-hidden="true"></span>
...
<span class="us-banner__eyebrow">{#query.ContactType} · <span id="contact-banner-id">{#query.ID}</span><button type="button" class="us-copy" data-us-copy-target="contact-banner-id" aria-label="Copy contact ID" title="Copy contact ID"></button></span>
```

- `ContactType` returns display text such as `Individual` or `Organisation`.
  The taskbar quick search decides person or company from the contact's
  `COMPANY_RECORD` value; the banner IQA should derive `ContactType` from the
  same flag (confirm the field in the IQA; the label wording is the owner's
  choice, e.g. Staff for staff contacts).
- The avatar stays empty: initials are no longer shown on the contact banner.
  Other banners keep their initials; the icon applies only when the attribute
  is present.

### Row groups

Item 8. Put the grouping value (for example the payment reference) in the first
display column and sort by it, newest first within each group. The first row of
each group is the summary; the rest are detail rows. Groups cannot span result
pages, and sorting by another column dissolves them. The toggle's accessible
name comes from a stored key, not the cell text.

### Compact notes template

Item 13. Fields: `AuthorName`, `CreatedOn`, `NoteBody` (required); `NoteType`
and `NoteTitle` (optional; select `''` with the alias when unused). Blank
optional fields collapse. Both templates are kept for now: see the root
`TODO.md` item "Member notes templates".

### Activity feed

Item 32, proposed 25 September 2026. The direction and reasons are in the
root [feed plan](../../../THEME-ACTIVITY-FEED.md): one API-driven module
(`US-ACTIVITY-FEED` in `theme-candidate.js`) instead of five Query Template
Displays merged in the browser.

- **Host:** a one-row Query Template Display on the Activity tab whose
  template is the `.us-activity-feed` element, so iMIS fills in
  `data-us-activity-value="{#query.ID}"`. One `<li>` per source IQA names
  its query, type (`call`, `email`, `meeting`, `sms`, `note`, `interaction`)
  and optional direction. No inline script, so the RiSE content filter has
  nothing to break.
- **Field contract (every source IQA):** `ActivityKey`, `ActivityDate`,
  `Subject`, `Summary` required; `Detail`, `StaffName`, `With`, `Duration`,
  `Outcome`, `OutcomeTone`, `CaseRef`, `CaseUrl`, `RecordUrl`,
  `AttachmentCount`, `Direction` optional. Sorted newest first; filtered on
  the contact and the named `StartDate` filter.
- **Behaviour:** loads on first sight, one request per source in parallel.
  Rows merge newest first and show only once no source with unloaded rows
  could hold a newer one, so Show more and the type filters page every source
  correctly (tested: 45 of 45 rows in exact order with 3-row pages). Type
  counts are the sources' real `TotalCount`s. The date range re-queries.
  Search covers loaded rows and says so. A failed source shows a notice with
  Retry and is never counted as zero.
- **Filters:** on a wide feed (880px and over, measured on the feed itself,
  so a narrow panel on a wide page still counts as narrow) search and the date
  range sit at the end of the type filters' line and the heading's filter
  button hides; they stay visible there whatever was left folded on a
  smaller window. On a narrow feed they are hidden behind a filter button in
  the panel heading, the theme's own `US-QUERY-SEARCH` toggle as on the home
  page tasks (same classes, icon, labels and 180ms fold); closing clears the
  search and keeps the range, which the footer names. The type filters stay
  visible for quick navigation and real counts (owner, 25 September 2026);
  search also matches type and direction words as a shortcut.
- **Date range (26 September 2026):** Last 90 days (default), 6 months,
  12 months or All time; "Last 30 days" was removed. Sources are newest
  first, so a shorter range is the front of a longer one: narrowing folds the
  older cards (and emptied month groups) away with no requests for rows;
  widening keeps the cards and lets each source page on from where it
  stopped. Only the type counts re-query (one row per source). Tested: 12
  months to 90 days folded 13 cards and 6 month groups away; widening kept
  every card and resumed paging at each source's offset.
- **Motion (26 September 2026):** cards update in place, so type, search and
  range changes fold cards in and out instead of redrawing the list; the
  switcher's underline slides to the chosen type (the theme's
  `data-us-section-indicator` marker, as on the home page switcher).
- **Search highlight:** matches get a faint accent highlight (CSS Custom
  Highlights, so the card text is untouched; browsers without them show
  none).
- **Reusable filter toggle (owner note, 25 September 2026):** this toggle
  should become one shared theme component for showing filters on any Query
  Template Display or Content HTML block, as IQA reports already hide their
  filters behind a similar toggle. Today the feed builds it locally
  (`headingToggle` and `setFiltersOpen` in `US-ACTIVITY-FEED`), copying the
  `US-QUERY-SEARCH` markup. Extract one helper that both use, and that IQA
  report filters can share, before promotion.
- **Rows:** record cards (`US-RECORD-CARDS` and `activity-cards.candidate.css`,
  loaded from `prototypes/wip/activity-cards/`). The feed builds the same
  markup as that folder's `templates/Activity-Card.html`; the card script
  expands cards and the feed remembers which are open across re-renders.
  Subject is optional (most calls and interactions have none);
  `PriorityFlag` (High or Urgent) shows a flag.
- **View all:** each source `<li>` can carry `data-history`, the IQA page for
  its type; while that type is chosen, "View all calls" (emails, meetings…)
  shows at the end of the type filters and fades in and out.
- **To confirm in iMIS:** REST access to each IQA for staff, the real
  start-date filter names (`GET /api/QueryParameterDefinition`), paging cost
  on large histories against the current UNION query, and plain-text email
  bodies.

## Owner decisions

These were requested or accepted in the prototype. Theme promotion still needs
explicit approval.

23 September 2026:

- Keep vertical CCO tabs: some clients have 15+ tabs, which a horizontal strip
  handles badly. Add a collapse button like the standard iMIS navigation,
  auto-collapsing below 1200px.
- The collapse button stays in one position in both states, at the top of the
  rail's column. The content starts level with it, so there is no empty row
  under the banner.
- Rejected: the toggle and collapsed Sections picker in the banner (v4).
- Offer a right-hand rail to separate the tabs from the iMIS navigation.
- Alerts move to the Summary tab; a banner bell (Facebook-style badge) shows
  them on every tab. Count first, full list on open.
- Tracker without a header; smaller, v1-like density throughout; v1's banner
  layout with v2's condensing; v1's header contrast; v1's expandable failed
  payments; v1's notes layout.
- Compact sizes should be the theme default rather than opt-in (recommended,
  accepted when v3 was requested).
- Panel labels: the uppercase recommendation is accepted.
- Keep both notes templates for now and revisit later (root `TODO.md`).
- Panel title icons: dropped. There is no way to add icons to an iPart header
  title today; a CSS-class icon feature is possible but not proposed.

24 September 2026:

- CCO menu: v1's sidebar styling as a special class (`us-cco-sidebar`, now `us-cco-rail`) for
  some CCOs, not the default. Edge-attached v1 shape rather than a floating
  card: the menu is page structure, matching the banner.
- Tab search and tab counts belong to that tailored sidebar option only, not
  general theme behaviour; search is configurable.
- Toggle spacing: equal 8px above and below; it no longer lines up with the
  alerts.
- Animation: collapse folds the menu up from the bottom into the Sections
  box, then slides it into place; the content expands smoothly block by block
  as live layout, and glides vertically; duration 1s.
- The section switcher shares the collapsed Sections row when it fits.
- The Sections dropdown uses the Quick Actions chevron and dropdown motion.
- Reports must not keep their load-time width when their panel narrows
  (item 18).
- Banner: no alert-type badges (such as "Overdue" or "Resignation pending");
  they duplicate the alerts and the bell. Only the member status badge stays,
  placed immediately left of the alert bell. The theme's contact banner
  template already shows only the status.
- Banner identity: the eyebrow shows the contact type (Individual,
  Organisation) instead of "Contact", the ID has a copy button, and the
  avatar shows the quick search's person or company icon instead of initials
  (item 19).
- Phones: in the condensed banner the alert bell and the status pill swap
  places (bell on the name line); with the v1 sidebar menu, keep only the
  Sections dropdown and attach it to the bottom of the banner.
- Banner blank space: compared the two-row layout with the one-row layout
  (24px fact spacing) in both its fitted and wrapped states, then asked for
  a light separator between the identity and the details when they share
  the row, then locked in the one-row layout (item 20). Asked for the same
  light rule, horizontal, when the details wrap under the identity.
- Collapsed rail: keep the toggle and Sections row, but it is no longer
  sticky; it scrolls away with the page (a pinned full-width row cost about
  48px of every scrolled screen). The expanded rail stays sticky, since it
  takes no extra height. Phones keep their sticky Sections dropdown.
- Expanding no longer draws the menu over the banner mid-animation (clip
  below the page chrome, item 10). Owner then saw the page jump to the bottom
  when collapsing, with the menu animation left halfway down the screen:
  scroll anchoring is now off during the transition and the scroll position
  is restored after the layout switch (item 10). Not reproducible in Claude's
  hidden preview pane (it skips view transitions); owner to confirm.
- Phones: Quick Actions to the right of the banner (item 20); no CCO content
  box, so panels sit on the page (item 5); reports keep readable column
  widths and scroll sideways instead of breaking text mid-word (item 18).
- Accepted from the UX recommendations: report scroll edges (item 23); an
  Alt+S sections shortcut rather than a single key (item 24), which also
  answers "scroll to top on switch" because the non-sticky bar is only
  reachable at the top; and one overdue format (below).
- Overdue content rule (IQA and template authors, not theme CSS): a status
  badge says only the state ("Overdue", always danger tone); where there are
  no amount and date columns, show "amount since date" ("$185 since 01 Mar");
  the day count goes in the tooltip ("74 days overdue"). The fixtures follow
  it; Open invoices said "Overdue 74 days" and Membership summary used the
  warning tone.
- Finance actions (owner asked: second Actions button on Finance, or the
  banner menu, tab-dependent or always?). Decision: neither alone. Each
  action sits on the panel it changes (theme action registry: the
  `us-action-*` class on the panel iPart puts it in the heading); the banner
  menu never changes by tab and gains only Make Payment, which also sits on
  the Summary overdue alert. Suspend and Change Membership move to the
  Membership tab (they change membership status, not money). Suspend is a
  pause for leave (travel, parental), not a penalty: no danger tone, no
  confirm; its editor (leave dates, reason) is the check, and it stays off
  the overdue alert.
- Outstanding invoices moves above the Finance switcher so money owed is
  seen first (danger tone, item 25); the Invoices sub-tab goes. Active
  adjustments sit beside it (info tone) and on the Summary tab's Membership
  summary; the full history stays on the Adjustments tab, renamed
  "Adjustment history". Both Query Menu iParts should not render when their
  query returns no rows. See item 26.
- An invoice that is issued but not yet due (a new quarterly invoice) must
  not look overdue. Outstanding invoices stays above the switcher (money is
  owed), but its tone follows the status badge (`us-panel-tone-auto`): "Due"
  (neutral badge) leaves it plain; an optional "Due soon" (warning) tints it
  amber; "Overdue" tints it red. The IQA decides the status. Only overdue
  raises the alarm elsewhere (Summary alert, bell, Finance tab badge,
  tracker). Finance summary's "Overdue" field became "Balance owing"
  ("$185 overdue since 01 Mar" red, or "$185 due 01 Jul" neutral).
  Open: a contact-scoped tracker at zero reads "0 Overdue invoices"; decide
  whether zero-count contact trackers hide. Answered 25 September 2026: yes,
  opt-in (item 28). Some zero: only the non-zero cards show and reflow.
  All zero (a member in good standing, the common case): one "Nothing
  needs attention" line instead of four "0" cards, rather than hiding the
  tracker, which would look the same as a failed load.
- 25 September 2026: the resignation alert stays as it is ("Save member"
  covers retention). The collapsed rail no longer jumps the page (scroll
  anchoring fix, item 10), confirmed by the owner.
- 25 September 2026: alert buttons follow the message text (item 9) instead
  of sitting at the far right edge, which left 700–850px between a message
  and its action on wide screens. No hover effect on the alert itself: only
  the buttons act, so a whole-alert hover would promise a click that does
  nothing.
- 25 September 2026: the v3 candidate is approved (items 1–28), but not to
  be moved into the theme yet; [THEME-CHANGES.md](THEME-CHANGES.md) tracks
  the changes. The v1 sidebar menu is locked in for the contact page (the
  menu toggle is gone) and the candidate on/off toggle is removed. Tabs on
  the right are the contact page default; the theme keeps both sides.
- 25 September 2026: the rail is one class, `us-cco-rail` (was
  `us-cco-sidebar` plus `us-cco-cards` and `us-cco-collapsible`), and its
  side is the CCO iPart's own "Tab display style" setting instead of
  `us-cco-rail-right`. The live markup showed the theme ignored that setting
  (every vertical strip was forced into the left column), so plain
  "Vertical right" CCOs now mirror V5 too (section 29).
- 25 September 2026: Finance tab rebuilt to the owner's list (item 26): key
  billing info, balance (arrears, open invoices, credit), open invoices,
  credits and every active adjustment above the switcher; history,
  adjustments, payment methods, tax, staff overrides and legacy transactions
  below. Invoices and payments open one detail popup with Send to member.
  The Summary tab stays as it was.
- 25 September 2026: members pay by auto debit, invoice or payroll deduction,
  and only invoice members have invoices. Open invoices became Outstanding,
  a full-width list of whatever is owed for the payment type; credits moved
  into Balance. No panel that can be empty sits beside another, so a member
  who owes nothing sees Billing and Balance, then Active adjustments.
- 25 September 2026: Raise invoice is for every member, whatever the payment
  type (one-off charges such as events), so it stays in the Billing heading.
- 25 September 2026: Active adjustments always shows, with "No active
  adjustments" when there are none. Heading actions that belong together
  become menus (item 31): Manage billing and Add adjustment. Change
  membership moved to Manage billing, because changing payment type goes
  through the Change membership form. Billing shows each value once. The
  top level of heading menus gets the submenus' side line and glint.
  Payroll frequency varies by employer but shows as the member's own
  Payment frequency, like any other member (no employer pay-cycle field).
- 26 September 2026: the adjustments section is rebuilt from the owner's dues
  adjustments design (item 33). Active adjustments became **Active and
  upcoming adjustments**, a Query Template list of the adjustments affecting
  fees now or soon, still always shown above the switcher with Add adjustment
  and the info tone. The Adjustments tab's grid is **All adjustments**, every
  adjustment including active and upcoming ones, with no add action of its
  own. Rows, not activity-style cards: every adjustment has the same fields,
  which read best in columns and line up with the grid. The Membership
  summary's Active adjustment line now matches the waiver's 30 Sep 2026 end
  (it said 30 Jun 2026).
- Paragraph margin trim for all native messages (item 22); dark mode toggle
  in the toolbar and dark fixes for the candidate (item 21).

## Findings

Theme issues and facts found while building v1 → v3:

1. **Orion sets the root font size to 10px.** The theme's rem-based banner
   sizes render smaller than intended (the 3.5rem avatar is 35px, not 56px).
   The candidate uses pixels for the avatar; review other rem values.
2. **Report column header token drift.** The IQA token block's fallback is v1's
   `#e2e8f0`, but `--bg-sunken` resolves almost to the panel header shade, so
   the contrast disappeared. Item 7 fixes it.
3. **`SmallButton` is not broken but inconsistent.** Its 85% font is relative
   to the surrounding text (11px inside a 13px alert). Item 11 fixes sizes.
   (An early test suggested it kept its height; that was flex stretching.)
4. **Standard button size lives in `99-Orion.css`**, not `zUnionSuite.css`.
   No touch-size (44px) rule exists for standard buttons today.
5. **Needs Attention loader cannot scope to a contact.** It reads a folder of
   IQAs but passes no contact ID, and it still calls the deprecated `/api/iqa`.
   A contact-scoped tracker folder (`$/_i4u_/SandBox/CRM Layouts/Contact_Page/Trackers`)
   needs a contact parameter and a move to `GET /api/query`.
6. **Native messages keep paragraph margins.** An authored `<p>` inside any
   `Asi*` message adds a 13px bottom margin, so the bottom padding looks
   larger. Item 22 trims the first child's top and last child's bottom margin
   in every native message (owner decision 24 September 2026); it replaces the
   us-alerts-only trim first built into item 9.
7. **Banner link colour leaks into popups.** `.us-banner__surface a` is white
   and underlined; any popup inside the banner must override it (fixed for
   the bell).
8. **Native grids are only promoted as reports** inside the Query Menu chain
   `[id$=_ContentPanel] > [id$=_ListerPanel] > [data-gridid]`.
9. **The `us-banner-page` layout** sets the banner's inline padding to half the
   gutter so banner text aligns with content; do not override it.
10. **The member Quick Actions** items are disabled offline because the site
    popup functions are not present; this is expected in the prototype.
11. **The mobile All sections picker** (`UnionSuiteTabs`) is prepended into
    every vertical strip and hidden on desktop; the collapsed rail reuses it.
12. **Notes `ContactMethod`** in the existing template means the interaction
    channel (e.g. Phone call), not the member's phone/email records. Rename on
    promotion (tracked in `TODO.md`).
13. Console errors mentioning `closest is not a function` came from test
    scripts dispatching synthetic events on `document`; real input cannot
    produce them.
14. **The vertical tab strip is a stacking context** (grid item with
    `z-index: 1`). Anything overlapping it, such as the sidebar toggle, needs
    a higher `z-index`.
15. **`UnionSuiteTabs` builds the collapsed list's labels from each tab's
    full text** (`textContent`) and closes the list on desktop whenever it
    refreshes. Decorations inside tabs must not add text (counts use an
    attribute and `::after`), and nothing should trigger its refresh while
    the list is open.
16. **The collapsed list's button rule** (`[data-us-cco-rail="collapsed"] >
    .RadTabStripVertical > .us-tab-sections .us-tab-section-options button`)
    is specific enough to override add-on layout; match it.
17. **`US-IQA-COLUMNS` fixes column widths at load** (1.3): in panel mode the
    table keeps its first measured width, so any later narrowing (window
    resize, collapsible rail) scrolls sideways. Item 18 fixes it.
18. **View-transition snapshots cannot stretch.** Animating content as
    snapshots made it flash as the old and new layouts swapped. The rail
    animation therefore snapshots only the menu (root `view-transition-name:
    none`) and animates the content's real layout with Web Animations.
19. **Snapshot overflow is visible by default.** A `::view-transition-group`
    must set `overflow: clip`, or a tall snapshot spills outside its morphing
    box.
20. **A `<details>` `toggle` event arrives a frame late**, after the browser
    has drawn the list open or closed. Animations started from it flash the
    full list on opening and leave a blank frame on closing. The Sections
    dropdown motion therefore starts from the `open` attribute change (a
    mutation observer runs before the next paint) and keeps the list's drawn
    size current while it is open, so a filtered or half-opened list folds
    from its real size. The Quick Actions code should be checked for the same
    issue when this is promoted.
21. **Report column fit squeezes phone reports** (item 18). On a 375px
    phone the Email addresses report's columns shrink until words break
    mid-word ("Pref / erre / d"); the theme's per-column minimum is
    smaller than a word. Pending: stop fitting at the longest word (or
    scroll sideways) on narrow panels.

## Verification status

Tested in the preview browser (Chromium) at 1280px and 375px, with no console
errors from real input:

- Toolbar comparisons; CCO tab and section switching; sticky expanded rail
  under the condensed banner; collapsed bar scrolling away with the page
  (24 September 2026); auto-collapse at 1100px vs 1280px.
- Collapse/expand in all four side/state combinations: toggle position
  identical, Sections box top-aligned with the toggle, bar cover not
  overlapping the banner.
- Animation, frozen at points in both directions: menu fold then slide;
  content blocks at their old widths on the first frame (no flash); blocks
  resizing bottom-up (collapse) and top-down (expand); vertical glide; clean
  finish with no leftover inline styles or transition names.
- Report fit: the Email addresses report measured 1214px mid-animation, 978px
  expanded and 1218px collapsed, never scrolling sideways.
- Sections row sharing on Profile (switcher 196–234px, box 197–233px); not on
  Summary or Finance, whose first blocks are not switchers.
- Sections dropdown: chevron and 400ms open/close motion with no flash on
  opening or jump on closing (frame-sampled), copy removed after closing.
- Collapse glide: the top alert moves down in the first half and is never
  covered by the Sections bar (paused mid-animation; tested while the bar was
  still sticky).
- Banner: status badge 8px from the bell; eyebrow copy button centred on the
  text within 0.2px at 24px and 44px, copying on a real click; person and
  organisation avatar icons, condensed too. One-row banner: row at 1,400px
  and wider (105px, vertical separator), wrapped at 1,200–1,325px (166px,
  horizontal separator 12px from the identity and the facts, full content
  width), condensed 61px with the separator faded out, re-measured after
  expanding; mobile unchanged.
- Sidebar: edge alignment with the banner on both sides, panel meeting the
  banner, search (filtering, Enter, Escape, focus on open), counts and tones in
  the rail and the collapsed list.
- Phones (375px): condensed banner with the bell on the name line and
  status/Quick Actions below, bell popup on screen when condensed (20–363px)
  and expanded (27–370px), and at 720px condensed (one line, popup
  leftwards). Sidebar dropdown meeting the banner (0px gap, 375px wide),
  tab strip hidden, "Sections: Summary" updating to "Sections: Profile"
  on selection, sticking at 113px under the pinned banner; desktop sidebar
  and collapsed label unchanged.
- Row groups, the alert bell (count, new/seen, list, Escape, outside click,
  "View on Summary"), mobile with no horizontal overflow.
- Activity feed (item 32, 25 September 2026): no requests while the
  Activity tab is hidden; five parallel requests on first sight; merged order,
  months and no duplicates checked against the full fixture, including 3-row
  paging across sources and the Emails filter; the date range re-queries;
  search makes no requests; the failing-source notice and Retry; dark mode
  contrast (lowest 7.56:1); 375px with no horizontal overflow.

Dark mode (24 September 2026, item 21): Summary and Finance tabs, v1 sidebar
rail, report column heads and the prototype toolbar. Not yet checked in dark:
the other tabs, the alert bell popup, row group detail rows, the collapsed
Sections list and the button strip.

Not yet verified: the rest of dark mode (above); other browsers (view
transitions fall back to instant); live iMIS (native CCO switching with the
extra toggle element in the CCO wrapper, partial postbacks, Telerik tab
handlers, IQA export with row groups, real `/api/query` responses and filter
names, report column fit with real grids and user-resized columns); agreement,
case, staff and dashboard banners with the new banner layout; the button change
against real forms and `references/Button-Reference.html`; animation
performance on long tabs with many blocks.

## Open decisions

1. `us-cco-cards` is opt-in because a CCO whose tabs hold plain text would put
   that text on the grey page. Make it the default if every CCO uses panels?
2. The banner layout (item 3) affects every banner type. Review agreement,
   case, staff and dashboard banners before approval.
3. Contact trackers: add the contact parameter to the Needs Attention loader
   (Finding 5); keep them on Summary only or show them on every tab?
4. Collapsible rail: one saved choice for every page, or per page?
5. The "Sections: …" label is rewritten by the candidate script; on promotion
   it belongs in `UnionSuiteTabs`, which builds the picker.
6. Alert bell "seen" is per browser, not per user across devices (a per-user
   record needs an iMIS table or panel). The popup is read-only; actions stay
   on the Summary alerts.
7. Compact notes: replace the existing template or keep both (root `TODO.md`).
8. Resolved 25 September 2026: rail side is the CCO iPart's own "Tab
   display style" setting (Vertical left or Vertical right), not a class.
   The contact page uses Vertical right.
9. Resolved 24 September 2026: the paragraph margin trim applies to all native
   messages (item 22, Finding 6).
10. Item 18 changes every native report: confirm fit-to-width in panel mode is
    wanted site-wide (user-resized widths are still kept).
11. One-row banner (item 20) is locked in for the contact banner; check
    agreement, case, staff and dashboard banners with it (different identity
    and detail content) as part of open decision 2.
12. Activity feed (item 32): the card layout, decided in the activity cards
    workbench, and whether the feed replacing Notes and Communications is
    right for every contact page.

## Next ideas

Proposed to the owner, highest value first. 1 and 2 are built for the tailored
sidebar (item 17); 4 is built for the contact ID (item 19):

1. Tab counts or warning dots on the rail from the tracker data.
2. A filter box in the collapsed Sections dropdown for 15+ tabs.
3. Open the same tab when moving to the next contact.
4. Copy buttons on banner facts (the theme's copy button component exists).
5. Tasks for this member on Summary (reuse the home task rows).
6. One activity timeline instead of Notes/Communications/Cases sub-tabs
   ("Combined activity feed" in `TODO.md`). Built as item 32; the card
   layout is still being decided.
7. Content-shaped loading placeholders on tab switch.
8. Hide or dim empty tabs.

## Promotion checklist

Superseded by [THEME-CHANGES.md](THEME-CHANGES.md), which lists each change by
target file. The summary below is kept for reference.

1. Get explicit approval per item; site-wide items (1–4, 6, 7, 11, 14, 18, 20, 22, 23)
   need review against other pages first.
2. Move each CSS section into its named target in `zUnionSuite.css`, or
   `99-Orion.css` for item 11. Change the icon URLs to
   `images/NavbarSprite.svg#…`. Keep the view-transition rules and
   `--us-cco-rail-motion` with item 10.
3. Move the JS blocks into `zUnionSuite.js` and replace `US-IQA-COLUMNS`
   with `theme-candidate-iqa-columns.js` (item 18; re-apply the change if the
   theme block has moved on); move the collapsed label logic into
   `UnionSuiteTabs`.
4. Update `Banner-Contact-Template.html` (bell and counts placeholders,
   contact type eyebrow, ID copy button and avatar icon, with a `ContactType`
   alias in its IQA); add
   the `UnionSuiteCcoSidebarConfig` setting to the client `Config.js`; add the
   compact notes template and its field definitions
   (`guides/usage/source/query-field-definitions.cjs`); add Alerts and Tab
   Counts IQA field lists.
5. Document `us-cco-cards`, `us-cco-collapsible`, `us-cco-rail`, the
   Vertical right setting, `us-iqa-row-groups`, `us-alerts`, `us-notes`, the bell,
   the no-header tracker, the button sizes and the report column fit in the
   usage guide source.
6. Rebuild: `node tools/build-theme-usage.cjs`, then `--check` and
   `node tools/check-usage-sources.cjs`; rebuild the banner, home and reference
   previews.
7. Verify dark mode and the live checks listed above; add live checks to
   `TODO.md`.
8. Move this specification to `prototypes/approved/` when accepted, per
   `AGENTS.md`; archive v1/v2 research only after useful content is retained.
