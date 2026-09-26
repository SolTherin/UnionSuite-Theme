# Member dues adjustments

Status: work in progress, started 26 September 2026, tracked. Not approved.
The components are not in the theme; the shared heading icon button on state
and focus ring they rely on are (26 September 2026, see Theme gaps found).
It is folded into contact page v3 as item 33 (26 September 2026): Active and
upcoming adjustments above the Finance switcher, All adjustments on the
Adjustments tab, with v3's own sample data. v3 loads this folder's candidate
CSS and JS, as it loads the activity cards candidate, so this folder stays the
component's source and design record; this page is its focused preview.

## Problem

The owner supplied a Claude Design layout for a member's dues adjustments
(`supplied/Adjustments-3a.dc.html`, project "Member dues adjustments
layout"): one list of waivers, suspensions, member changes, credits and
pro-rata periods, each row expanding to its detail and actions, with a control
to show closed ones. It is built on the superseded Union Innovation Hub design
system (`--uih-*` tokens) and the x-dc runtime, neither of which the theme
uses.

The contact page needs two views, which answer different questions, so this
prototype splits the design in two:

- **Active and upcoming adjustments** — "what is affecting this member's fees
  now or soon?" Always visible, few rows, key details at a glance, each row
  expanding to its detail and actions. Rebuilt from the supplied design on
  UnionSuite tokens, as a Query Template.
- **All adjustments** — "what is the full history?" Every adjustment,
  active rows included, as the theme's standard native Query Menu grid:
  sorting, paging, filters, export and row actions for free, no custom script.

Both are built in the markup iMIS actually produces, and everything that had
to change from the supplied design is recorded below.

## Preview

Start the `static-node` configuration in `.claude/launch.json` (port 8778),
then open:

```text
http://localhost:8778/prototypes/wip/dues-adjustments/index.html
```

The bar at the top switches light/dark, switches the Active list between its
four sample adjustments and its No results state, and resizes the panels
(Full, 820, 620, 380) rather than the window, because the Active list's
layout follows its panel's own width. "Supplied source" opens the original,
which renders from `supplied/`.

The sample's "today" is pinned to 20 August 2026 (inline in `index.html`), so
relative dates stay fixed; production uses the real date.

## Sources

| File | Purpose |
|---|---|
| `index.html` | The page: live theme CSS/JS in production order, then the candidates. Two iPart outputs: the Active and upcoming Query Template Display (four results) and the All adjustments Query Menu (eight rows). |
| `dues-adjustments.candidate.css` | The Active and upcoming list. Target `zUnionSuite.css`, except the marked button fix (also `zUnionSuite.css`) and the dark section (`zzDarkMode.css`). The All grid needs none. Also loaded by contact page v3. |
| `dues-adjustments.candidate.js` | The Active list's behaviour, `US-ADJUSTMENTS`. Target `zUnionSuite.js`. Also loaded by contact page v3. |
| `dues-adjustments.preview.css`, `.preview.js` | Preview bar only. Not proposed for the theme. |
| `supplied/` | The owner's export, unchanged: `Adjustments-3a.dc.html` (the design built here), `Member-Adjustments.dc.html` (a larger layout from the same project, not built), `support.js` and `_ds/` (its runtime and tokens). Do not restyle: it is the "before". |

Borrowed from contact page v3 (another WIP, loaded not copied):
`theme-candidate.css` (button sizes, heading menu styles, status icons in
badges, which keep to one line), `theme-candidate-heading-menus.js` and
`finance-actions.fixture.js` (the `finance.add-adjustment` heading menu and
the adjustment actions: `finance.view-adjustment`, `edit-adjustment`,
`end-adjustment`, `view-adjustment-transactions`; in the product they belong
in `UnionSuite-Client/Actions.js`). Also borrowed from the activity
cards WIP: `activity-cards.candidate.js`, whose `UnionSuiteRecordCards.fold()`
animates the Active rows' detail panels exactly as the activity history's
records open (without it they show and hide instantly). If either changes,
check this page.

## Shared vocabulary

The two layouts read as one family: the same words and badges in both.

| Item | Values |
|---|---|
| Type | Waiver, Membership change, Credit, Suspension, Pro-rata membership ("Membership change" is v3's term; the supplied design said "Member Change") |
| Fee effect | What the adjustment does to fees, in a few words: "50% off fees", "Part-time rate", "$138.50 credit left", "No fees due", "$86.40 pro-rata", "$120.00 waived" |
| Status | Active (`us-badge us-badge--success us-badge--icon`), Upcoming (`us-badge us-badge--primary us-badge--icon`), Expired (`us-badge us-badge--icon` with `data-us-icon="ended"`). "Upcoming" follows contact page v3; the supplied design said "Scheduled". |
| Dates | `01 Mar 2026`; an open end reads "When used up" |

## Active and upcoming adjustments

### iMIS configuration

One Query Template Display iPart:

- **CSS class:** `us-query-template us-adjustments us-action-finance-add-adjustment`.
  iMIS inserts these as a wrapper div around the panel. `us-query-template`
  keeps the theme's card when there are no results (iMIS then omits the result
  set); the last class places the existing Add adjustment heading menu.
- **Title:** Active and upcoming adjustments. The script adds the count badge.
- **Display in cards** and **Hide when there are no results:** leave unchecked.
- **Query:** active and upcoming adjustments for the contact, soonest end first,
  then upcoming by start date.

**Header field** — the column headings, once:

```html
<div class="us-adjustments__head" aria-hidden="true">
  <span>Type</span>
  <span>Fee effect</span>
  <span>Starts</span>
  <span>Ends</span>
  <span>Status</span>
  <span></span>
</div>
```

**Query Template field** — one result; iMIS repeats it:

```html
<div class="us-adjustment" data-us-adjustment-status="{#query.Status}">
  <button type="button" class="us-adjustment__row" aria-expanded="false">
    <span class="us-adjustment__cell us-adjustment__title">{#query.Type}</span>
    <span class="us-adjustment__cell us-adjustment__effect"><span class="us-adjustment__cell-label">Fee effect</span> {#query.FeeEffect}</span>
    <span class="us-adjustment__cell us-adjustment__starts"><span class="us-adjustment__cell-label">Starts</span> <span data-us-adjustment-date="{#query.StartDateIso}">{#query.StartDate}</span></span>
    <span class="us-adjustment__cell us-adjustment__ends"><span class="us-adjustment__cell-label">Ends</span> <span data-us-adjustment-date="{#query.EndDateIso}">{#query.EndDate}</span></span>
    <span class="us-adjustment__cell us-adjustment__status"><span class="us-badge us-badge--icon">{#query.Status}</span></span>
    <span class="us-adjustment__cell us-adjustment__chevron"><i class="ti ti-chevron-down" aria-hidden="true"></i></span>
  </button>
  <div class="us-adjustment__panel" hidden>
    <dl class="us-adjustment__fields">
      <div><dt class="us-adjustment__label">Reason</dt><dd class="us-adjustment__value">{#query.Reason}</dd></div>
      <div><dt class="us-adjustment__label">Amount</dt><dd class="us-adjustment__value us-adjustment__value--strong">{#query.Amount}</dd></div>
      <div><dt class="us-adjustment__label">Remaining balance</dt><dd class="us-adjustment__value us-adjustment__value--positive">{#query.Remaining}</dd></div>
    </dl>
    <div class="us-adjustment__meter">
      <progress value="{#query.RemainingValue}" max="{#query.AmountValue}" aria-label="Credit remaining">{#query.MeterCaption}</progress>
      <div class="us-adjustment__meter-caption">{#query.MeterCaption}</div>
    </div>
    <div>
      <div class="us-adjustment__label">Changed attributes</div>
      <div class="us-adjustment__attrs">{#query.ChangedAttributes}</div>
    </div>
    <div>
      <div class="us-adjustment__label">Note</div>
      <p class="us-adjustment__note">{#query.Note}</p>
    </div>
    <p class="us-adjustment__origin"><i class="ti ti-clock" aria-hidden="true"></i><span>Created by <strong>{#query.CreatedBy}</strong> on {#query.CreatedOn}</span></p>
    <div class="us-adjustment__actions">
      <button type="button" class="us-action-finance-edit-adjustment" data-adjustment="{#query.AdjustmentKey}">Edit</button>
      <button type="button" class="us-action-finance-end-adjustment" data-adjustment="{#query.AdjustmentKey}">End adjustment</button>
      <button type="button" class="us-action-finance-view-adjustment-transactions" data-adjustment="{#query.AdjustmentKey}">View affected transactions</button>
    </div>
  </div>
</div>
```

**No results field:**

```html
<p>No active or upcoming adjustments.</p>
```

**Footer field:** leave blank.

### Query fields

Suggested aliases, not an existing IQA. Every field referenced above must be
selected; for one a row does not use, select `''` with the alias.

| Alias | Required | Description | Blank | Example |
|---|---|---|---|---|
| `AdjustmentKey` | Yes | The adjustment's key, passed to the row actions | — | `ADJ-1049` |
| `Status` | Yes | `Active` or `Upcoming` (drives the badge tone and relative time) | — | `Upcoming` |
| `Type` | Yes | Adjustment type, from the shared vocabulary | — | `Suspension` |
| `FeeEffect` | Yes | The effect on fees, in a few words | — | `No fees due` |
| `StartDate` | Yes | Display date | — | `01 Sep 2026` |
| `StartDateIso` | Yes | The same date as `YYYY-MM-DD`, for "in 12 days" | No relative time | `2026-09-01` |
| `EndDate` | Yes | Display date, or "When used up" for an open end | — | `30 Nov 2026` |
| `EndDateIso` | Optional | `YYYY-MM-DD`, for "11 days left" | No relative time (open end) | `2026-11-30` |
| `Reason` | Optional | Why the adjustment was made | Field hidden | `Parental leave` |
| `Amount` | Optional | Total amount or rate, where the type has one | Field hidden | `$240.00` |
| `Remaining` | Optional | Remaining credit, display value | Field hidden | `$138.50` |
| `RemainingValue` | Optional | Remaining credit as a number | — | `138.50` |
| `AmountValue` | Optional | Total credit as a number; blank removes the meter | Meter removed | `240` |
| `MeterCaption` | Optional | Meter text | — | `$138.50 of $240.00 remaining` |
| `ChangedAttributes` | Optional | Pre-rendered from → to pairs (see open decisions) | Block hidden | — |
| `Note` | Optional | Staff note | Block hidden | `Credit is drawn down…` |
| `CreatedBy` | Yes | Who created it | — | `Alicia Miller` |
| `CreatedOn` | Yes | Display date | — | `12 Aug 2026` |

### At a glance

Each row shows Type, Fee effect, Starts, Ends and Status; everything else is
in the expanded panel. The script adds relative time under a date: "in 12
days" for an upcoming start, "11 days left" for an active end, in the warning
colour when it ends within 30 days (`soonDays`). Closed adjustments never
appear here; they live in All adjustments.

## All adjustments

A standard native Query Menu iPart: no CSS class, no custom script. The theme
styles it as every other report, adds its filter button when the query has
filters, and moves the native Export into the heading.

- **Title:** All adjustments.
- **Query:** every adjustment for the contact, active and upcoming included,
  newest start first.
- **Columns:** Type, Details, Fee effect, From, To, Status, Created by.
- **Type** links to the adjustment record: output it as
  `<a href="#" class="us-action-finance-view-adjustment" data-adjustment="{key}">{Type}</a>`,
  which the action runtime paints as a text row action (as v3's payment
  references do).
- **Status** outputs the shared status badge HTML, as v3's grids do.
- **Details:** the reason and a short description, e.g. "Parental leave ·
  membership kept, no fees debited".

## What changed to match the theme

### Tokens and visual treatment

| Supplied | Theme | Why |
|---|---|---|
| `--uih-*` palette: brand `#1a4b8c`, interactive `#2563c4`, pale `#e8f0fb` | UnionSuite tokens throughout; brand ramp is teal (`--brand-600` `#006f94`) | AGENTS.md: the theme supersedes the design-system project. No `--uih-*` value or literal hex survives in the candidate. |
| Own card: 12px radius, shadow, grey header band | The native iMIS panel, which the theme already draws as a Query Template card | Matches every other Query Template panel; the component draws no shell. |
| Pale-blue column head with brand-blue text, 10px, .6px tracking | Native IQA grid head: `--iqa-table-head`, `--iqa-muted`, 11px bold, .06em, 9px 12px padding | Lines up with the All adjustments grid below it. |
| Rows inset in the card | Edge to edge, no body padding, as the native IQA grid is | The two panels' tables line up exactly. |
| One list with a Show historical control | Two layouts: Active and upcoming (this list) and All adjustments (native grid) | They answer different questions; the grid pages and sorts natively, so no filter control is needed. |
| Columns: Type, Period, Reason, Detail, Status | Type, Fee effect, Starts, Ends, Status; Reason moves into the expanded panel | Fee effect is what staff come for; separate dates carry relative time. |
| Status pills (`99px` radius): keep-green, info-blue, outlined grey; "Scheduled" | `.us-badge` with v3's status icons: success, primary, neutral "ended"; "Upcoming" | Existing components and v3's vocabulary. |
| System font stack | Inter (`--font-ui` / `--iqa-font`) | Theme UI face. |
| Title Case: "Member Change", "Add Adjustment", "End Adjustment" | Sentence case | Theme copy convention. |
| Dates `01/03/2026` | `01 Mar 2026` | Contact page v3's display format. Comes from the IQA in the product. |
| Font Awesome 6 from a CDN | Tabler (`ti ti-*`), already loaded by the theme | One icon set; no external request. |
| Hover: pale tint plus 3px bar | Hover as a native grid row (`--brand-50`); the open row adds the 3px bar | Grid hover plus the CCO rail's selection convention. |
| Credit bar: a div at a hard-coded 58% | Native `<progress value max>` on `--success-fill` | Real value, readable by assistive technology. |
| No dark mode | `zzDarkMode.css` tokens; rows use `--dm-hover` / `--dm-selected` | The dark palette keeps the brand ramp light, so the light tints cannot be reused. |
| Fixed 900px layout, no narrow state | Stacks into cards below an 880px panel (container query), with labelled dates | The panel can sit in a narrow page column. |

### Buttons and actions

- **Add Adjustment** was a hand-styled button in the card header. It is now the
  existing `finance.add-adjustment` heading menu, on the Active panel only.
- **Edit / End Adjustment / View affected transactions** were hand-styled
  outline buttons. They are now action controls (`us-action-finance-*`), which
  the theme's action runtime paints as `TextButton us-outline-button`, End with
  `tone: 'danger'`.

### iMIS delivery (the supplied markup cannot work as authored)

- **`onClick` attributes:** RiSE strips `on*` attributes on save. Behaviour
  moved to the script.
- **Clickable `<div>` rows:** not keyboard reachable. Each row is a
  `<button aria-expanded aria-controls>`, whose accessible name includes the
  cell labels ("Fee effect", "Starts", "Ends").
- **Result wrappers:** iMIS wraps each result in
  `section > .card.QueryTemplateItem > .card-body`. The wrappers use
  `display: contents` so every row still shares one set of column tracks.
- **Column headings and empty state:** the iPart's Header and No results
  fields. The Header wrapper iMIS adds has not been captured, so the head is
  its own grid on the same tracks and does not depend on it.
- **Count:** iMIS generates the panel heading from the iPart title, so the
  script adds the count badge.
- **Per-type fields:** the supplied design changes labels by type ("Waiver
  Amount", "Credit Total", "Applied From"). One template serves every row, so
  the fields are fixed (Reason, Amount, Remaining balance) and empty ones are
  hidden.
- **Conditional blocks:** the credit meter and changed attributes are always in
  the template and hidden when empty, since templates have no conditionals.

## Theme gaps found

These need changes in the shared theme, not only in this component.

1. **Danger tone lost on outline buttons.** For `tone: 'danger'` in button
   placement the action runtime adds `us-outline-button` and `DangerButton`.
   The outline modifier is declared later and resets the border and text, so
   End adjustment rendered exactly like Edit. The candidate CSS includes a fix
   for both schemes: target `zUnionSuite.css` after the outline and warning
   modifiers (around lines 451–489), and `zzDarkMode.css` after its outline
   rules (around line 652). It affects every danger-toned button action.
2. **Heading menu toggle unreadable in dark mode.** The contact page v3
   candidate's `.us-heading-menu > .us-actions__toggle` uses `--brand-800` text
   with no dark override: `#002d3c` on `#1b272f`. Visible here on
   Add adjustment and on v3's own heading menus. Not fixed here because it
   belongs to the v3 candidate.
3. **Status badges broke mid-word — fixed in the v3 candidate.** The base
   badge allows `overflow-wrap: anywhere` for long free text, which split
   "Upcoming" in a narrow grid column. v3's status icon badge (section 30) now
   keeps to one line. v3's panel tone (section 25) also now stays plain on a
   Query Template with no results, as it already did for an empty grid.
4. **Shared on state and focus ring for heading icon toggles — fixed in the
   theme (26 September 2026).** `zUnionSuite.css` now has one on state for
   `.us-iqa-icon-button` with `aria-expanded` or `aria-pressed`, a
   forced-colours border and one keyboard focus ring for every heading icon
   button, including the relocated Export this page's grid uses. Found while
   building this prototype's former Show historical toggle.

## Decisions made

- 26 September 2026: this design replaces contact page v3's adjustments
  section (its Active adjustments and All adjustments grids), and is folded
  into v3 as item 33 the same day.
- Two layouts: Active and upcoming (Query Template, rows expand) and All
  adjustments (native Query Menu grid).
- Active and upcoming includes scheduled (upcoming) adjustments.
- All adjustments includes active and upcoming rows, not only closed ones.
- Active at-a-glance fields: Type, Fee effect, Starts, Ends, Status.
- Active stays as table rows, not activity-style cards (26 September 2026):
  the fields are the same for every adjustment and read best in columns, the
  rows line up with the All adjustments grid below, and the always-visible
  panel stays compact. Narrow panels already stack each row into a labelled
  block. Revisit only if the card family becomes the rule for current-state
  lists too.
- Rows expand with the activity history's fold animation (US-RECORD-CARDS).

## Open decisions

- **Changed attributes source.** A variable list of from → to pairs cannot come
  from one IQA row's plain fields. Options: an IQA column that returns the
  pairs pre-rendered as `.us-badge` HTML, a second query per row, or drop the
  block and rely on the grid's Details text.
- **Add adjustment menu items.** The menu has Add waiver and Suspend
  membership. The design also lists Membership change and Credit (Pro-rata is
  system-created). Decide which types staff create here.
- **Detail fields.** Confirm Reason, Amount and Remaining balance cover every
  type, or whether some types need a type-specific label from the IQA.
- **Ending-soon window.** An active end within 30 days is marked in the
  warning colour. Confirm 30 days.
- **Grid Status and Type HTML.** Both depend on the Query Menu outputting HTML
  in a column, as v3's grids already assume. Confirm on the live IQA.
- **`Member-Adjustments.dc.html`.** Supplied in the same export, not built.
  Confirm whether it is a superseded variant or a second layout to prototype.
