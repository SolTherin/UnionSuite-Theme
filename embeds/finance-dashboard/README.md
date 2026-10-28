# Finance Dashboard — payment runs

> **Picking this up? Start with [`TODO.md`](TODO.md)** — current state, what is
> left, and the decisions already settled. This file describes what the app is.

Payment-run tracking for iMIS: a dashboard of every run over the last 7 / 30 / 90
days, and a dedicated screen for any single run.

Plain vanilla JS / HTML / CSS. **No framework, no build step, no npm.** Deployed
to Cloudflare Pages and embedded in iMIS as runtime-URL iParts, the same way
HubReportBuilder and Data Templates are.

**Where it lives (28 Oct 2026).** This folder in the UnionSuite theme repo is
the source of truth. It was folded in from the OneDrive project
`Claude/Finance Dashboard`, which is now superseded. Paths written as
`Claude/…` below are sibling projects in that OneDrive folder, outside this
repo.

**What is live in iMIS.** Two RiSE content records hold the self-contained
(`--inline`) builds from 16 Oct 2026, pasted in directly rather than loaded
from Pages:

| Surface | iMIS content record |
|---|---|
| Run list | `@/_i4u_/Core/UnionPay/Dashboard/Finance-Dashboard` |
| Run detail | `@/_i4u_/Core/UnionPay/Dashboard/Batch-Detail` |

An iMIS export of both on 28 Oct 2026 matched `node build-embed.js --inline`
from this folder, apart from changes the iMIS editor makes when it saves: it
drops the header comment and rewrites `<i>` to `<em>`.

---

## Three surfaces, three self-contained pages

| Surface | File | v1? | Shows |
|---|---|---|---|
| **Run list** | `index.html` | ✅ | KPI row, daily-volume trend, payments by type, all runs grouped by date |
| **Run detail** | `payment-run.html?BatchID=<run id>` | ✅ | One run: KPIs, by-type / outcome / decline-reason breakdowns, and its transactions |
| **Arrears** | `arrears.html` | ✗ v2 | Declined payments across the window: KPIs, declines by reason, searchable transaction table |

**Each page is self-contained** — its own shell, its own range control, its own
data load, and it loads only the JS it needs (`payment-run.html` pulls neither
`fd-dashboard.js` nor `fd-arrears.js`, and so on). Nothing is cached between
them: navigating re-fetches, which is a deliberate choice over a `sessionStorage`
cache. Cost is one query per page load; benefit is that no page can show another
page's stale figures.

Clicking a run in the list **navigates** to the run detail page; the run page has
"Back to dashboard" in its header. Because it is a real navigation, each run gets
its own URL and history entry, so the browser Back button, bookmarking and
open-in-new-tab all work.

Embedded, that navigation moves between **separate RiSE pages** on the iMIS host —
the app is inlined into the iMIS page, so `window.location` *is* the iMIS page's
URL, and `?BatchID=` lands on the host page's query string.
`FDConfig.imisPages` maps each surface to its page; see `fd-config.js`. No two
surfaces may share a RiSE page — each is a different runtime-URL iPart, and
`fd-core.js` → `checkConfig()` warns if any two are configured the same.

If `imisPages.run` isn't set, `FD.openRun()` falls back to swapping a hidden
detail view into the list page (no URL change, no Back button) — so a
half-configured deploy still works instead of dead-ending. That fallback is a
safety net, not a supported end state. `imisPages.arrears` stays **null in v1**,
so nothing routes to a page that isn't deployed.

---

## Files

| File | Role |
|---|---|
| `index.html` | Run-list shell + the runtime asset loader |
| `payment-run.html` | Run-detail shell + the same loader (loads neither `fd-dashboard.js` nor `fd-arrears.js` — that surface renders no list, charts or declines) |
| `arrears.html` | **v2** — arrears shell + the same loader (loads neither `fd-dashboard.js` nor `fd-run.js`) |
| `fd-config.js` | **The only file that changes per environment**: Pages origin, RiSE page paths, data mode, licensed hosts |
| `fd-core.js` | Reference data, formatters, `runStats`/`runState`, badges, toasts, sticky-table sync, licence gate, and `Nav` — the navigation layer |
| `fd-data.js` | Data layer. Deterministic mock data today; the async `load()` / `loadRun()` / `loadTransactions()` signatures are already the live shapes |
| `fd-dashboard.js` | The run list and the charts. **Not** the declines area — that moved to `fd-arrears.js` |
| `fd-run.js` | The run-detail view — serves both its own page and the in-page fallback |
| `fd-arrears.js` | **v2** — the declines/arrears surface. Still reduces over `run.txns`; needs repointing at `v2-declines.sql` before it can run on live data |
| `fd-boot.js` | Loaded last: licence gate, host-page defences, boots whichever surface this document is |
| `fd-styles.css` | All styles, **fully scoped under `.fd-root`**; keyframes prefixed `fd-` |
| `fd-theme-unionsuite.css` | **The Union Suite theme — live since 16 Oct 2026.** Colour/type override layer loaded after `fd-styles.css` by every shell and by `build-embed.js` |
| `fd-theme-series.js` | The theme's chart-series colours (they live in JS, so CSS can't reach them). Loaded before `fd-boot.js` |
| `build-embed.js` | Builds the paste-into-iMIS fragments into `dist/` (themed). `--inline` = self-contained, `--plain` = no theme → `dist/plain/` |
| `dist/` | Generated, ignored by Git. Rebuild with `node build-embed.js` and `node build-embed.js --inline` |
| `embed-harness.html` | Local page for loading a built embed outside iMIS |
| `_headers` | Cloudflare Pages caching + CORS (`no-cache` — filenames aren't content-hashed) |
| `serve.json` | Dev-server config. `cleanUrls` must stay **false** — see Gotchas |
| `v1-payments.sql` | **The v1 live queries** — Q1 summary, Q2 transactions, Q3 pager count, plus a PERF NOTES block recording what the execution plan showed |
| `v1-payments-verify.sql` | Runs the original and tuned Q1 side by side and diffs every column. Passed 3 Sep 2026 |
| `v2-declines.sql` | **v2, parked** — the declines/arrears view (Q4 reasons, Q5 rows, Q6 count). Written but out of v1 scope |
| `ct-probe.browser.js` | Paste into an iMIS page's console to POST at a CloudToolz endpoint and inspect what comes back |
| `docs/DATA-REQUIREMENTS.md` | Every data point, its iMIS source, and the API call plan |
| `docs/REVIEW-2026-07.md` | Code review findings — 8 reproduced issues, none yet fixed. **Read before the live build**: #1 blocks it |
| `Payment Runs Query.sql` | The earliest payment-runs query (27 Aug 2026), before `v1-payments.sql` |

Left in the superseded OneDrive folder, not brought into the repo: `Payment
runs.docx` (source notes on `UnionTemplate.Batch`, `Invoice.Status` and
`Payments.Status`), the original single-file mockups `Finance Dashboard.html`
and `Payment Run Screen.html`, the 14 Sep theme preview pages, and the 4 Sep
unthemed builds in `dist/archive/`. The September UnionSuite styling trial is
in `prototypes/Finance Dashboard/` in this repo.

Each JS file exposes exactly **one** global (`FDConfig`, `FDCore`, `FDData`,
`FDRun`, `FDArrears`, plus `FD` for the inline UI callbacks). The app is inlined
into a live iMIS page, so bare function globals would risk colliding with iMIS's
own scripts.

---

## Running it locally

From the repo root:

```bash
npx serve -p 3134 embeds/finance-dashboard
```

Then open `http://localhost:3134/`. Outside iMIS the app runs in mock mode with
deterministic sample data ("today" is pinned to 6 Jul 2026), pulls FontAwesome
from a CDN, and navigates the two static files.

---

## Deploying

1. Push to GitHub; connect the repo as a Cloudflare Pages project. Framework
   preset **None**, build command **empty**, root directory
   **`embeds/finance-dashboard`**, output directory **`/`** (relative to that
   root). The rest of the theme repo must not be published.
2. Publish `fd-theme-unionsuite.css` and `fd-theme-series.js` along with the
   other `fd-*` files — the shells and CDN embeds load them. If they are missing
   the app still works, unthemed.
3. The project name becomes the subdomain and is **hard-coded in three places** —
   the loader at the bottom of `index.html`, the same loader in
   `payment-run.html`, and `FDConfig.cdn`. Renaming means editing all three.
4. Create **two** RiSE pages, each with a content type whose *"URL to display
   items at runtime"* points at one surface:
   - run list → `https://<project>.pages.dev/?DoNotCache`
   - run detail → `https://<project>.pages.dev/payment-run.html?DoNotCache`
5. Put both RiSE page paths into `FDConfig.imisPages` and push. Without them the
   app falls back to in-page view swapping.
6. Add the production iMIS hostname to `FDConfig.licensedHosts`.
7. Gate both RiSE pages behind a finance role — these views expose every
   member's payment detail (`docs/DATA-REQUIREMENTS.md` §9).
8. Save + publish, Clear Cache, hard-refresh. Check in the Network tab that
   assets hit `<project>.pages.dev` with a 200, not the iMIS host.

Detail on any of that: `Claude/API Reference/Reference Files/iMIS-iParts-Cloudflare-Pages.md`.

---

## Scope — v1 vs v2 (decided 3 Sep 2026)

**v1 = the payment runs page + the batch details page.** Nothing else.

Deploy `index.html` and `payment-run.html`; leave `imisPages.arrears` null.

**v2 = the arrears page, plus scheduled retries.** `arrears.html`,
`fd-arrears.js` and `v2-declines.sql` are written but parked, and the page is
not deployed. The arrears surface was split out of the dashboard on 3 Sep 2026,
so the v1 bundle no longer carries that code at all. Scheduled retries are
future-dated runs — v1 excludes them via `@ToDate`; v2 should surface them,
probably as a "Scheduled" group in the runs list, alongside the retry queue that
creates them.

Consequences for v1:
- The **`Payments.BatchId` index is blocking**, not optional: Q2 and Q3 each
  full-scan 2.16M rows to return one run's page. It is a CloudToolz-managed
  database, so their sign-off is the long-lead item — start it early.
- `REVIEW-2026-07.md` #1 covers two in-scope renderers — `renderKpis` and
  `renderTypeBars` (runs page) — plus `FDRun.renderDetail` (batch page).
  `renderDeclinesTable` left v1 with the arrears split.
- Open items: **all closed.** #8 settled 4 Sep 2026 — the relay does preserve
  multiple result sets, so endpoint B returns Q2+Q3+Q4 as one composed object
  built in the Flow's JS activity. #10 parked; #5 and #11 are v2.
  See `docs/SQL-DATASETS.md` §7.

## Status

Mockup, fully working in mock mode. Verified against the two original artifact
files: identical KPI figures, run counts, per-type totals, run-detail
breakdowns and transaction rows in every range and filter combination.

**The v1 SQL now runs against live production data** (`v1-payments.sql`,
3 Sep 2026) — but nothing has been wired into the app yet, and the app itself
still runs on mock data.

Q1 (summary) returns ~1,179 Kind-2 batches over nine months in **3.4–4s**, down
from 19–34s, after a rewrite driven by an execution plan. Output was verified
column-for-column identical to the pre-rewrite version, and every row now sums
to its own total by bucket and by method — closing the §6a.3 finding that 15% of
rows didn't reconcile. The plan's measurements and the reasoning behind each
change are in the PERF NOTES block at the bottom of `v1-payments.sql`.

**Q2 and Q3 are still unusable**: each full-scans all 2.16M rows of `Payments`
to return a single run's transactions, because there is no index on
`Payments.BatchId`. That cannot be fixed by rewriting — it needs the index at
the top of `v1-payments.sql`, which needs CloudToolz sign-off since
`CloudToolz_anmfvicA_Prod` is vendor-managed.

A useful by-product: the execution plan **confirmed every column** previously
marked "assumed, verify before prod". The only unverified item left is the
contact table behind `CrmId`, so the member-name join is still stubbed.

The remaining blocker is a question for finance, not code: four
`Payments.Status` values (`Paid`, `Managed`, `Gateway error`, `imisError`) have
no agreed home in the UI outcome buckets, and guessing changes the numbers on
screen. v1 currently folds `Paid` (4) into Cleared. Also unresolved: the three
**`NULL`-`Kind` batches**, which are the largest in the dataset (27k/55k/97k
payments) and fall outside `WHERE Kind = 2` entirely.

**Live-data plan (decided 2026-09-02): `docs/SQL-DATASETS.md` §8.** The data is
three structurally different worlds — traditional payments (Batch Kind 2,
`Payments`), invoice/account payers (Kind 1, `Invoices`), and PRD payroll
deduction (Kind 3/4, load+reconcile) — built as **three separate query sets,
phased**. **v1 = Kind 2 payments only**: 4 buckets (Pending/Processing/Cleared/
Declined) + Error, dd/cc methods, two queries off `Payments` + `Batch`. Data
arrives via a single anonymous published CloudToolz **GET** whose JSON shape we
control (not the ReportBuilder POST contract). §8 also records the
invoice/payment many-to-many line structure, the invoice status enum + current
balance, and the Status-4 dual-lens rule.

**A code review (`docs/REVIEW-2026-07.md`) found 8 issues, none yet fixed.** One blocks
the live build: `renderKpis`, `renderTypeBars`, `renderDeclinesTable` and
`FDRun.renderDetail` all read `run.txns` directly, so they throw on the pre-aggregated
shape live mode delivers — which means the claim below that `fd-data.js` is the only file
that changes to go live is **wrong**. Two others are worth doing before any deploy: `esc()`
is unsafe in the `onclick` JS-string contexts it's used in, and the Pages output directory
publishes `Payment runs.docx` and `docs/` publicly.

Two gaps flagged there and not built, because both change the agreed design:
payment **errors** are currently invisible in the UI (including `imisError` —
money taken with no iMIS record), and the **soft/hard decline** classification
that decides what a retry batch contains lives in client-side JS keyed on display
text, defaulting unknown reasons to retryable.

---

## Gotchas

- **`fd-styles.css` must stay scoped under `.fd-root`.** Never add an unscoped
  `body`, `*`, `header` or `table` rule — the app is inlined into the iMIS page
  and it would restyle the host. Design tokens live on `.fd-root`, not `:root`,
  for the same reason. Keyframes are prefixed `fd-` (`slideIn` in particular is a
  name iMIS's own stylesheets use). Verified in a browser: a `header`, `.panel`,
  `.kpi-card`, `th` and `.filter-chip` outside `.fd-root` all keep UA defaults.
- **Enter in any input must not submit the host form.** The app is inlined into
  iMIS's single ASP.NET `<form>`, so Enter triggers a full-page postback and the
  user loses their place. A delegated `keydown` on `.fd-root` preventDefaults it
  (`fd-boot.js`). **This won't reproduce locally — don't remove it.**
- **Nothing may measure layout before `__fdCssReady` resolves.** The shells
  inject `fd-styles.css` at runtime, and a dynamically inserted
  `<link rel=stylesheet>` does **not** block the scripts after it — so the first
  render can measure *unstyled* boxes. Firefox lost that race where Chromium won
  it, and the payments-by-type chart ranked its rows against a 36px unstyled row
  height instead of 18px, overlapping some rows and stranding others (it looked
  fine after any toggle, because by then the CSS had applied). `fd-boot.js` now
  awaits `window.__fdCssReady` (timeout-capped at 4s, so a blocked CDN degrades
  to an unstyled render rather than a blank page) and re-runs the one
  measurement-dependent render on `document.fonts.ready`. If you add anything
  that reads `offsetHeight` / `offsetTop` / `getBoundingClientRect` during boot,
  it goes after that await.
- **No percentage heights on the summary tables.** The three run-detail panels
  used to pin each `Total` row to the bottom of its card via `height: 100%` on
  `.mini-table` plus `height: 100%` on a `.mini-spacer` cell. CSS leaves the
  distribution of a table's extra height across its rows **undefined**: Chromium
  and Edge gave the slack to the spacer (the intended look), **Firefox grew the
  table by roughly its own height and pushed `<tfoot>` out of the card, over the
  Transactions heading.** Replaced with `margin-bottom: auto` on the table. The
  cost is that the three footers no longer line up across the cards — the cards
  are still equal height. Don't put a percentage height back on a table or a
  table cell here.
- **`100vh` is wrong once embedded.** The app is only part of the RiSE page, so
  `fd-boot.js` sets `--fd-height: FDConfig.embedHeight` (default `780px`) inside
  iMIS. Tune it per page.
- **Assets are injected at runtime, not by static tags.** iMIS strips the domain
  off absolute URLs in static `<link>`/`<script src>` tags, so the loaders build
  the URLs in JS instead. After changing a shell, iMIS may serve a cached copy —
  append `?DoNotCache` and/or clear the iMIS cache.
- **`serve.json` must keep `cleanUrls: false`.** With clean URLs on, `serve`
  301s `/payment-run.html?BatchID=2226` to `/payment-run` and **drops the query
  string**, so the run screen loses the run it was opened for. That's a
  dev-server quirk, not an app bug, but it makes the navigation untestable
  locally. Turning `cleanUrls` off also stops `serve` resolving `/` to
  `index.html` (you get a directory listing), which is why `serve.json` adds the
  `/` → `/index.html` rewrite — keep both or neither.
  Chrome caches those 301s **permanently, per full URL including the query
  string**. If a run URL that was hit under the old config keeps redirecting to a
  404, that's the cache, not the code — try a different run, or add a cache
  buster.
- Cloudflare Pages does its own `.html` → clean-URL redirect. It should preserve
  the query string, but **verify it** when the standalone Pages URL is first
  loaded. It doesn't affect the iMIS embed, which navigates RiSE page paths.
- **A CloudToolz count and its rows CAN be fetched in parallel.** An earlier version
  of this list said they couldn't, on the grounds that each mints a single-use ZenToken
  and overlapping chains invalidate each other. Measured 2026-07-25: false — one mint
  serves many fetches, sequential or parallel, and is valid for at least 5 minutes.
  See `Claude/ReportBuilder/docs/CLOUDTOOLZ-INTEGRATION.md` §0 and
  `Claude/API Reference/zentoken-lifetime-test.js`.
- **`??` and `||` can't be mixed unparenthesised** — a `SyntaxError` that
  silently kills a whole IIFE file.
- **The live iMIS pages are pasted inline builds**, not the Pages loader. A
  change here reaches iMIS only after `node build-embed.js --inline`,
  `node test/simulate-filter.js` and a paste into each content record.
