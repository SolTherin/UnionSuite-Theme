/**
 * fd-config.js — Finance Dashboard deployment configuration
 * © Union Innovation Hub.
 *
 * THIS IS THE ONLY FILE THAT CHANGES PER ENVIRONMENT. Everything else is
 * environment-agnostic. Loaded FIRST, before any other app script.
 *
 * Exposes a single global: `window.FDConfig`.
 */
(function () {
  "use strict";

  window.FDConfig = {

    /* ── Hosting ────────────────────────────────────────────────────────────
       The Cloudflare Pages origin the app's assets are served from. The HTML
       shells build their <link>/<script> URLs from this at RUNTIME, because
       iMIS strips the domain off absolute URLs in static tags. If the Pages
       project is renamed, change it here AND in the loader at the bottom of
       both index.html and payment-run.html (the loader can't read this file —
       it's what loads it). */
    cdn: "https://hubfinancedashboard.pages.dev/",

    /* ── Surfaces ───────────────────────────────────────────────────────────
       The app has two surfaces, each its own page/URL:
         dashboard  → the payment-run list, KPIs and charts   (index.html)
         run        → one payment run in full detail          (payment-run.html)

       `imisPages` maps each surface to the RiSE page that hosts it, as a
       site-relative path. Set BOTH before go-live: they are how the run list
       navigates to the run screen and how the run screen gets back.

       Leave a value null and that surface falls back to an in-page view swap
       (no URL change, no browser Back) — which is what the original single-file
       mockup did. That fallback exists so a half-configured deploy degrades
       instead of dead-ending, not as a supported end state.

       Outside iMIS (dev server, file://) these are ignored and the static
       filenames below are used instead, so the same build runs both ways. */
    imisPages: {
      dashboard: "/_i4u_/Core/UnionPay/Dashboard/Finance-Dashboard.aspx",
      run:       "/_i4u_/Core/UnionPay/Dashboard/Batch-Detail.aspx",
      arrears:   null,   // v2 — leave null so nothing routes to an undeployed page
    },

    /* Static filenames for standalone / dev-server use. */
    files: {
      dashboard: "index.html",
      run:       "payment-run.html",
      arrears:   "arrears.html",
    },

    /* Query-string parameter carrying the run identity between the two
       surfaces. It lands on the HOST page's URL when embedded, so keep it
       distinctive enough not to collide with an iMIS or RiSE parameter. */
    runParam: "BatchID",

    /* ── Data source ────────────────────────────────────────────────────────
       "auto"  detect: live inside iMIS, mock everywhere else
       "mock"  deterministic sample data, no network at all
       "live"  CloudToolz / iMIS REST (see docs/DATA-REQUIREMENTS.md) */
    mode: "auto",

    /* ── CloudToolz endpoints ───────────────────────────────────────────────
       Paths appended to the CloudToolz base URL, which is resolved at runtime
       from the $/ZENTSO/Security/CloudToolzUrl IQA — never hardcode the host.
       Each surface is a self-contained page and calls only its own endpoint.

       `arrears` is not built yet; leave it null.

       `run` returns FIVE result sets as one composed object, built in the
       Flow's JS activity (verified 4 Sep 2026):
         TransactionData  Q2 — one page of payment rows
         TransactionCount Q3 — [{ TxnTotal }] for the pager
         DeclineReasons   Q4 — one row per reason
         BatchHeader      Q5 — [{ … }] one row, Q1's shape for this batch
         PaymentByType    Q6 — method x status cross-tab                 */
    endpoints: {
      dashboard: "UnionTemplate/UnionPay/FinanceDashboard/LoadData/Dashboard",
      run:       "UnionTemplate/UnionPay/FinanceDashboard/LoadData/PaymentBatch",
      arrears:   null,
    },

    /* Days of history fetched in ONE request on load. The 7/30/90 range picker
       then filters that in memory — no refetch per range.

       365, not 90: the KPI row's "vs prior period" delta reaches back
       rangeDays × 2, so at 90 the 90-day range has NO comparison. Measured
       2026-08-27 (SQL-DATASETS.md §6a.1) a full year is ~152 batch rows — one
       comfortable call. The 500-row cap in the old note applied to the generic
       ReportBuilder proc, which this dashboard no longer uses; it has its own
       endpoint returning one pre-aggregated row per run. */
    historyDays: 365,

    /* Pane height once embedded in iMIS. `90dvh` leaves room for the RiSE page's
       own chrome while still filling the screen — a fixed px value cut the app
       off part-way down on taller viewports. `dvh` (not `vh`) so mobile browser
       toolbars collapsing does not leave a gap.
       Set a px value here if a particular page needs a fixed pane instead. */
    embedHeight: "90dvh",

    /* Rows rendered per transaction table page. The DOM, not the network, is
       the limit here — see docs/DATA-REQUIREMENTS.md §5. */
    txnPageSize: 100,

    /* CSV export paging. The export fetches the view csvPageSize rows at a
       time, one request after another, and shows progress between them — the
       largest batch in the data (13,801 rows) is 14 requests. Until the
       BatchId index exists every request scans all of Payments (~365ms
       measured), so fewer, bigger pages finish sooner; 1,000 keeps each
       response to a few hundred KB.

       csvMaxRows is the hard ceiling, so a pathological batch cannot ask the
       browser for something unbounded. If a view ever hits it the user is
       TOLD the file is truncated rather than handed a short file that looks
       complete. */
    csvPageSize: 1000,
    csvMaxRows: 25000,

    /* A run is flagged "to review" when a payment has sat in Processing for
       longer than this. */
    reviewProcessingDays: 5,

    /* No host allow-list: this app runs on any iMIS instance with CloudToolz
       access (decided 4 Sep 2026). Access control is the RiSE page's role
       gating, which is the real control — see docs/DATA-REQUIREMENTS.md §9.
       The old `licensedHosts` check was a licensing measure, never a data one. */

    /* Console tracing for the data layer. */
    debug: false,
  };
})();
