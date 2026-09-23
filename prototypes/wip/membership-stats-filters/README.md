# Membership Stats: click-to-filter

Status: WIP visual/interaction mockup. Not implemented in the shared theme.

The current Stats cards (`THeme/UnionSuite/guides/usage/templates/Home/Stats/`)
are read-only. This mockup brings back click-to-filter: selecting a member
category, membership type or financial status recalculates every card.

## Behaviour

- **Member category:** click a table row. **Membership type:** click a bar row.
  **Financial status:** click a legend row. Click the selected row again to clear it.
- Filters combine across dimensions, e.g. Billing Category 1 + Financial.
- Tracker bar shows the fully filtered figures. "Total members" becomes
  "Selected members", with its share of all current members.
- Each breakdown card ignores its own filter and applies the others. All of its
  options stay visible: the selected row is highlighted and the rest are dimmed.
  Each card heading names the filters that apply to it.
- Filter chips sit under the page heading. Each chip removes one filter;
  "Clear all filters" appears when two or more are set. Escape clears everything.
- Each option is a real `<button aria-pressed>`, stretched over its row. Filter
  changes are announced in a polite live region.
- **Membership trend** shows mock six-month history for the current filters:
  a month-end members line (Sept dashed as month to date) and joined vs resigned
  columns. Hovering a month highlights it in both charts and shows a tooltip.
  "Show table" swaps the charts for the same figures as a table. Resigned orange
  is under 3:1 contrast, so the table view is required, not optional.

## Files and preview

Maintained files: `index.html`, `filters.css`, `filters.js`. Card styling comes
from `THeme/UnionSuite/zUnionSuite.css`. `filters.css` holds only the page
layout, the selected/dimmed/chip states and the trend charts.

Serve the repository root and open `/prototypes/wip/membership-stats-filters/`.
For example, use the `static-node` entry in `.claude/launch.json` (port 8778).

## Sample data

`filters.js` generates a seeded (repeatable) sample across six categories, four
membership types and three financial statuses. Only the 83,091 total matches the
23 September 2026 Stats page. Each cell has monthly joins and resignations for
Apr–Sept. Resignations peak in June (end of financial year). Month-end counts
are worked backwards from current members.

## Open decisions

- **History source.** Live history still depends on the CloudToolz
  MonthEnd/MemberCount snapshots. Filtering the trend needs those snapshots per
  category, type and status, or joins/resignations by month to work backwards from.
- **Data source.** The live IQAs return one-dimensional counts, so they can't be
  cross-filtered. Options:
  - one cross-tab IQA grouped by category, type and financial status (plus
    joined/resigned equivalents), filtered client-side as in this mockup; or
  - optional GroupCode / CategoryCode / FinancialStatus parameters on the
    existing IQAs, re-queried on every click.
- **Table footer.** Should it keep the column total, or show the selected row
  against the total?
- **Tracker shortcuts.** Should the Financial members metric also act as a
  filter shortcut?
- **Sharing a view.** Should filters persist in the URL hash so a filtered view
  can be linked?
