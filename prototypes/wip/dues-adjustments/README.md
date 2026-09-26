# Member dues adjustments

Status: work in progress, started 26 September 2026, tracked. Not approved.
The component is not in the theme; the shared heading icon button on state
and focus ring it relies on are (26 September 2026, see Theme gaps found).

## Problem

The owner supplied a Claude Design layout for a member's dues adjustments
(`supplied/Adjustments-3a.dc.html`, project "Member dues adjustments
layout"): one list of waivers, suspensions, member changes, credits and
pro-rata periods, each row expanding to its detail and actions, with a control
to show closed ones. It is built on the superseded Union Innovation Hub design
system (`--uih-*` tokens) and the x-dc runtime, neither of which the theme
uses. This prototype rebuilds it on UnionSuite tokens and components, in the
markup iMIS actually produces, and records everything that had to change.

## Preview

Start the `static-node` configuration in `.claude/launch.json` (port 8778),
then open:

```text
http://localhost:8778/prototypes/wip/dues-adjustments/index.html
```

The bar at the top switches light/dark and resizes the panel (Full, 820, 620,
380), not the window, because the layout follows the panel's own width.
"Supplied source" opens the original, which renders from `supplied/`.

## Sources

| File | Purpose |
|---|---|
| `index.html` | The page: live theme CSS/JS in production order, then the candidates. The panel is one Query Template Display iPart's output, eight results. |
| `dues-adjustments.candidate.css` | Candidate component. Target `zUnionSuite.css`, except the marked button fix (also `zUnionSuite.css`) and the dark section (`zzDarkMode.css`). |
| `dues-adjustments.candidate.js` | Candidate behaviour, `US-ADJUSTMENTS`. Target `zUnionSuite.js`. |
| `adjustment-actions.fixture.js` | Prototype-only row actions (Edit, End adjustment, View affected transactions). In the product they belong in `UnionSuite-Client/Actions.js`. |
| `dues-adjustments.preview.css`, `.preview.js` | Preview bar only. Not proposed for the theme. |
| `supplied/` | The owner's export, unchanged: `Adjustments-3a.dc.html` (the design built here), `Member-Adjustments.dc.html` (a larger layout from the same project, not built), `support.js` and `_ds/` (its runtime and tokens). Do not restyle: it is the "before". |

Borrowed from contact page v3 (another WIP, loaded not copied):
`theme-candidate.css` (button sizes, heading menu styles),
`theme-candidate-heading-menus.js` and `finance-actions.fixture.js` (the
`finance.add-adjustment` heading menu). If v3 changes, check this page.

## iMIS configuration

One Query Template Display iPart:

- **CSS class:** `us-adjustments us-action-finance-add-adjustment`. iMIS
  inserts these as a wrapper div around the panel; the second places the
  existing Add adjustment heading menu.
- **Title:** Adjustments. The heading, count and historical toggle come from this.
- **Template:** one result, below. The script adds the column headings, count,
  historical toggle and empty state, which one result's template cannot own.

```html
<div class="us-adjustment" data-us-adjustment-status="{#query.Status}">
  <button type="button" class="us-adjustment__row" aria-expanded="false">
    <span class="us-adjustment__cell us-adjustment__title">{#query.Type}</span>
    <span class="us-adjustment__cell us-adjustment__period">{#query.Period}</span>
    <span class="us-adjustment__cell us-adjustment__reason">{#query.Reason}</span>
    <span class="us-adjustment__cell us-adjustment__detail">{#query.Detail}</span>
    <span class="us-adjustment__cell us-adjustment__status"><span class="us-badge">{#query.Status}</span></span>
    <span class="us-adjustment__cell us-adjustment__chevron"><i class="ti ti-chevron-down" aria-hidden="true"></i></span>
  </button>
  <div class="us-adjustment__panel" hidden>
    <dl class="us-adjustment__fields">
      <div><dt class="us-adjustment__label">Amount</dt><dd class="us-adjustment__value us-adjustment__value--strong">{#query.Amount}</dd></div>
      <div><dt class="us-adjustment__label">Remaining balance</dt><dd class="us-adjustment__value us-adjustment__value--positive">{#query.Remaining}</dd></div>
      <div><dt class="us-adjustment__label">Start date</dt><dd class="us-adjustment__value">{#query.StartDate}</dd></div>
      <div><dt class="us-adjustment__label">End date</dt><dd class="us-adjustment__value">{#query.EndDate}</dd></div>
      <div><dt class="us-adjustment__label">Reason</dt><dd class="us-adjustment__value">{#query.Reason}</dd></div>
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
      <button type="button" class="us-action-finance-edit-adjustment">Edit</button>
      <button type="button" class="us-action-finance-end-adjustment">End adjustment</button>
      <button type="button" class="us-action-finance-view-adjustment-transactions">View affected transactions</button>
    </div>
  </div>
</div>
```

The field names are a proposal, not an existing IQA. Empty fields, an empty
attributes block and an empty note are hidden; the meter is removed when its
`max` is empty. Status drives the badge tone (`active` → success,
`scheduled` → primary) and whether the row is historical (`expired`, `ended`,
`cancelled`), both overridable through `window.UnionSuiteAdjustmentsConfig`.

## What changed to match the theme

### Tokens and visual treatment

| Supplied | Theme | Why |
|---|---|---|
| `--uih-*` palette: brand `#1a4b8c`, interactive `#2563c4`, pale `#e8f0fb` | UnionSuite tokens throughout; brand ramp is teal (`--brand-600` `#006f94`) | AGENTS.md: the theme supersedes the design-system project. No `--uih-*` value or literal hex survives in the candidate. |
| Own card: 12px radius, shadow, grey header band | The native iMIS panel, which the theme already draws as a Query Template card | Matches every other Query Template panel; the component draws no shell. |
| Pale-blue column head with brand-blue text, 10px, .6px tracking | Native IQA grid head: `--iqa-table-head`, `--iqa-muted`, 11px bold, .06em, 9px 12px padding | Lines up with Query Menu grids on the same page. |
| Rows bleed to the card edge, 18px first-cell inset | Rows inside the theme's `--iqa-inset`; cells 10px 12px (`--iqa-row-padding`) | The theme pads every Query Template body; fighting it would make this one list inconsistent. |
| Status pills (`99px` radius): keep-green, info-blue, outlined grey | `.us-badge` (6px radius): `--success`, `--primary`, neutral | Existing component. |
| System font stack | Inter (`--font-ui` / `--iqa-font`) | Theme UI face. |
| Title Case: "Member Change", "Add Adjustment", "End Adjustment", "Credit Total" | Sentence case: "Member change", "Add adjustment", "End adjustment", "Amount" | Theme copy convention (e.g. "Recent activity", "Add waiver"). |
| Dates `01/03/2026` | `01 Mar 2026` | Contact page v3's display format; also unambiguous. Comes from the IQA in the product. |
| Font Awesome 6 from a CDN | Tabler (`ti ti-*`), already loaded by the theme | One icon set; no external request. |
| Hand-built 30×16 switch labelled "Show historical (4)" | An icon toggle: the IQA heading icon button (`.us-iqa-icon-button`, the filter button's component) with Tabler `ti-history` and `aria-pressed`, in `.us-iqa-report-utilities` after the custom actions. Pressed uses the filter button's open state (`--iqa-selected`, `--iqa-link`). | The theme's precedent for exactly this: the tasks list's Show completed toggle (`.us-task-completed-toggle`). Its name, "Show historical adjustments (4)", stays fixed; `aria-pressed` carries the state. |
| Hover: pale tint plus 3px bar | Hover as a native grid row (`--brand-50`); the open row adds the 3px bar | Grid hover plus the CCO rail's selection convention. |
| Expired rows at 60% opacity | Full opacity; muted title/detail and the neutral Expired badge | 60% opacity took text below contrast. |
| Credit bar: a div at a hard-coded 58% | Native `<progress value max>` on `--success-fill` | Real value, readable by assistive technology. |
| No dark mode | `zzDarkMode.css` tokens; rows use `--dm-hover` / `--dm-selected` | The dark palette keeps the brand ramp light, so the light tints cannot be reused. |
| Fixed 900px layout, no narrow state | Stacks into two-column cards below an 880px panel (container query) | The panel can sit in a narrow page column. |

### Buttons and actions

- **Add Adjustment** was a hand-styled button in the card header. It is now the
  existing `finance.add-adjustment` heading menu, placed by the iPart CSS
  class. The menu currently offers Add waiver and Suspend membership only (see
  open decisions).
- **Edit / End Adjustment / View affected transactions** were hand-styled
  outline buttons. They are now action controls (`us-action-finance-*`), which
  the theme's action runtime paints as `TextButton us-outline-button`, End with
  `tone: 'danger'`.

### iMIS delivery (the supplied markup cannot work as authored)

- **`onClick` attributes:** RiSE strips `on*` attributes on save. Behaviour
  moved to the script.
- **Clickable `<div>` rows:** not keyboard reachable. Each row is a
  `<button aria-expanded aria-controls>`.
- **Result wrappers:** iMIS wraps each result in
  `section > .card.QueryTemplateItem > .card-body`. The wrappers use
  `display: contents` so every row still shares one set of column tracks.
- **Column headings, count and historical toggle:** a Query Template has no header
  template and iMIS generates the panel heading from the iPart title, so the
  script inserts them.
- **Per-type fields:** the supplied design changes labels by type ("Waiver
  Amount", "Credit Total", "Pro-rata Amount", "Applied From"). One template
  serves every row, so the fields are fixed (Amount, Remaining balance, Start
  date, End date, Reason) and empty ones are hidden.
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
3. **Shared on state for heading icon toggles — fixed in the theme
   (26 September 2026).** Each toggle used to declare its own on state: the
   filter (`aria-expanded`) and expand toggle had identical copies, and the
   tasks toggle used the accent. `zUnionSuite.css` now has one rule for
   `.us-iqa-icon-button` with `aria-expanded` or `aria-pressed`, plus its
   forced-colours border, and one shared keyboard focus ring for every heading
   icon button (previously three separate rules, and none for a new toggle);
   the historical toggle here inherits both.
4. **No way to add a heading utility from outside US-QUERY-SEARCH.** The
   theme builds `.us-iqa-report-utilities` itself (for the tasks toggle and
   the filter button) after other scripts run, and re-appends its custom
   actions slot when it does. This candidate keeps its utilities last with a
   small observer. On promotion, build the historical toggle where the theme
   builds the tasks toggle and drop the observer.

## Overlap with contact page v3

The v3 Finance tab already has two native Query Menu grids, **Active
adjustments** (always shown, `us-panel-tone-info`) and **All adjustments**
(in a tab), with columns Type, Details, Fee effect, From, To, Status. The
Membership summary also shows an "Active adjustment" badge. This design is one
list with a historical toggle and different columns. They should not both
ship.

## Open decisions

- **Replace v3's two adjustments grids with this list?** And reconcile the
  columns: Detail vs Fee effect, one Period vs From/To.
- **Query Template vs Query Menu.** A Query Menu grid gives native headers,
  sorting and paging but no expandable detail. This design needs the Query
  Template.
- **Changed attributes source.** A variable list of from → to pairs cannot come
  from one IQA row's plain fields. Options: an IQA column that returns the
  pairs pre-rendered as `.us-badge` HTML, a second query per row, or drop the
  block and keep "2 fields updated" in Detail.
- **Historical filtering.** The toggle filters loaded rows. If the IQA pages
  results, past rows beyond the first page never load. Either return every row
  (adjustments per member are few) or make the toggle re-query with a filter.
- **Add adjustment menu items.** The menu has Add waiver and Suspend
  membership. The design also lists Member change and Credit (Pro-rata is
  system-created). Decide which types staff create here.
- **Fixed field set.** Confirm Amount, Remaining balance, Start date, End date
  and Reason cover every type, or whether some types need a type-specific
  label from the IQA.
- **`Member-Adjustments.dc.html`.** Supplied in the same export, not built.
  Confirm whether it is a superseded variant or a second layout to prototype.
