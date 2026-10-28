# UnionSuite finance styling trial

Open **Finance Dashboard - UnionSuite.html** from this folder. It connects the
overview, payment-run detail and declined-payment views. The two original HTML
bundles are retained as references and are not loaded by this prototype.

This is a trial, not an installed iMIS component. No production theme CSS or JS
has been changed. Mock data and behaviour live in `finance-unionsuite.js`; page
layout and finance-specific presentation live in `finance-unionsuite.css`.

## Theme dependencies

Keep the prototype in this repository so its relative stylesheet/script links
resolve. Load order is native `99-Orion.css`, bundled `Tabler.css`, shared
`zUnionSuite.css`, the scoped finance CSS, client `Branding.css`, then client
`Override.css`. Shared `zUnionSuite.js` is included once before the demo script.
The prototype inherits the current client's blue/orange seeds. Native font
imports use Google Fonts when connected, with the theme's system fallbacks
offline. It requires no package installation or data service.

The HTML, CSS and JS work from the filesystem when kept together with those
theme files. This is not a self-contained HTML export. A local review server can
also be started from the project root with `node .preview/finance-preview-server.cjs`.

## Class placement and token mapping

| Element | Class placement | Styling source |
| --- | --- | --- |
| Entire prototype | `us-finance` on `body` | Trial CSS scope; no global token overrides |
| Page container | `us-finance-shell` around navigation, main and footer | `--page-gutter`, max-width 1480px |
| Page/run heading | `us-banner` on outer section; `us-banner__surface` on its header | Actual shared banner, `--banner-*` aliases |
| Identity and facts | Existing `us-banner__identity`, `us-banner__title`, `us-banner__subtitle`, `us-banner__facts` and `us-banner__fact` | Shared banner CSS |
| Banner actions | `us-banner__action` on button; `us-banner__action--primary` for Retry | Shared accent/hover and banner tokens |
| Inline report actions | `TextButton LinkButton` on actual button | Native button foundation and shared colours |
| Status labels | `us-badge` on span, plus `--primary`, `--success`, `--warning` or `--danger` modifier | Shared non-interactive badge CSS |
| KPI group/tile | `us-finance-kpis` on group; `us-finance-kpi` on article or native button | Trial layout; surface, border, radius, spacing, font and shadow tokens |
| Chart/summary/report | `us-finance-panel`, `us-finance-panel-heading`, `us-finance-panel-body` | Trial markup matching IQA presentation with shared tokens |
| Table | `us-finance-table` on table inside `us-finance-report-scroll` | Trial plain HTML table; not a native Query Menu/RadGrid |
| Amounts/counts | `us-finance-num` on relevant cells | Right alignment and tabular figures |
| Status filters | `us-finance-filter` on button with `aria-pressed` | Trial controls using brand/surface/border/focus tokens |
| Icons | `ti ti-*` on decorative `i` with `aria-hidden="true"` | Bundled Tabler icon font |

Do not add `us-report` to these plain tables expecting native IQA behaviour.
Their filtering, sorting, paging and export are explicitly local mock behaviour.
For a production version, use native Query Menu markup/adapters and keep page
layout separate from reusable component CSS. `us-finance-*` is trial-only and
must not yet be entered into an iMIS page or iPart configuration.

Example entry structure (the full running example is the sibling HTML file):

```html
<body class="us-finance">
  <div class="us-finance-shell">
    <main id="finance-main" tabindex="-1"></main>
  </div>
</body>
```

## Available interactions

- Overview: 7/30/90-day selection, count/value chart switches, run search,
  Generated/Processing/Finalised/To review filters, run paging and CSV export.
- Select a run name to open its record banner, six KPIs, payment-type/outcome/
  decline summaries and transaction report. Transactions support status/search
  filters, reference/member/amount sorting, 25-row pages and full filtered export.
- Select the Declined KPI to open the cross-run decline report. Filter by reason,
  search, open the originating run or simulate an eligible retry.
- Retry queues only unprocessed soft declines, leaves payment outcomes unchanged,
  disables repeat retries and updates relevant counts. Hard declines and previously
  retried payments are excluded. All changes reset on reload.
- The Finance breadcrumb and browser history return between the views. Hashes
  `#overview`, `#declines` and `#run/RUN-2226` are supported.
- Print uses the browser's print UI; the report contains the current page of rows.
  CSV exports all filtered rows, not only the visible page, with exact cents.

## Accessibility and limits

The fixture uses real buttons/links, labelled search/select controls, visible
keyboard focus, pressed filter states, table captions and column headers,
announced result counts, sorting state and queue feedback. Charts have textual
totals and labelled legends. Meaningful status text accompanies semantic colours.
Wide tables scroll within labelled keyboard-focusable regions with sticky
headers. At smaller widths KPI cards reflow from six to three to two columns;
chart and summary panels stack. Reduced motion is respected.

Sample data is deterministically generated with the same 6 July 2026 snapshot
as the original. The 90-day view omits the prior-period percentage because a full
preceding 90 days is unavailable. `Finalised` retains the original definition:
no Pending or Processing payments; outstanding invoices/declines may remain.
Financial totals are demonstration data. Authentication, permissions, server
queries, actual payment execution and native ASP.NET refresh are not implemented.
