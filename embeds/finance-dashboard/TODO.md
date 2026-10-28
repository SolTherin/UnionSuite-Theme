# Finance Dashboard — TODO / handover

**Last updated 4 Sep 2026.** Written to pick this up cold on another machine.
Read `README.md` for what the app *is*; this file is what is left to do.

---

## Where it stands

**28 Oct 2026: moved into the theme repo** at `embeds/finance-dashboard/`,
which replaces the OneDrive folder `Claude/Finance Dashboard`. The live iMIS
pages `@/_i4u_/Core/UnionPay/Dashboard/Finance-Dashboard` and `…/Batch-Detail`
hold the 16 Oct `--inline` builds, and an export of them matches a rebuild
from here. No code changed in the move.

**Latest versions — 16 Oct 2026.** `index.html`, `payment-run.html` and the
embeds in `dist/` are the current build, in the **Union Suite theme** (now the
default everywhere; `node build-embed.js --plain` for the old look). Since the
4 Sep build: header aligned to the content column, retry removed from the
dashboard and the batch page (v2), labelled compact run cards, payment-type chips on the batch
page (needs the Flow change in §2), paged CSV export with progress, loading
skeletons, and a fix for previews that open pages as `data:` /
`about:srcdoc`. The 4 Sep embeds are in `dist/archive/2026-09-04/`.

**Dashboard (payment runs page): data layer done, not deployed.**
Q1 runs live (~4s for ~1,179 Kind-2 batches over 9 months, verified
column-for-column identical to the pre-tuning version). `fd-data.js` does the
CloudToolz 3-step relay and maps Q1 into the shape the views want. The KPI row,
trend, payments-by-type and runs list all work off pre-aggregated data with no
`run.txns`. **Never yet run end-to-end against the live endpoint from inside
iMIS** — the relay transport is proven by `ct-probe.browser.js`, the app's own
call path is not.

**Batch detail page: parked, nothing wired.** See §2.

**Arrears: v2, parked.** SQL written, page split out, still reduces over
`run.txns` and needs repointing at `v2-declines.sql` before it can run live.

---

## 1. Dashboard — to go live

- [ ] **Publish the assets to Cloudflare Pages.** The 8 KB CDN embed is useless
      until `fd-config.js`, `fd-core.js`, `fd-data.js`, `fd-run.js`,
      `fd-dashboard.js`, `fd-boot.js` and `fd-styles.css` are live at
      `hubfinancedashboard.pages.dev`. Nothing else here is blocked by it.
- [ ] **Paste `dist/dashboard-embed.html`** into the RiSE content record at
      `/_i4u_/Core/UnionPay/Dashboard/Finance-Dashboard.aspx`.
      Regenerate first: `node build-embed.js` then `node test/simulate-filter.js`.
- [ ] **Change the Flow's `@ToDate`** from `9999-12-31` to tomorrow, or scheduled
      retries (future-dated runs) appear in v1. `fd-data.js` already sends the
      right value; this is the Flow's own default.
- [ ] **First live load from inside iMIS.** The one untested path. Watch for:
      a CORS failure at step 3 (shows as a bare `TypeError: Failed to fetch`),
      and numbers arriving as strings (they did not in the probe, but the app's
      own mapping has not been exercised).
- [ ] **Role-gate the RiSE page.** These surfaces expose every member's payment
      detail. Not optional — the app has no access control of its own since the
      host allow-list was removed.
- [ ] Exclude `docs/`, `test/` and the SQL files from the Pages output (Pages
      root directory `embeds/finance-dashboard`; see README → Deploying).
- [ ] Fix `esc()` being unsafe in the `onclick` JS-string contexts it is used in
      (`REVIEW-2026-07.md`). Lower priority now that most handlers are
      `data-*`, but the remaining string interpolation is still there.

---

## 2. Batch detail page — the active piece

**Endpoint B is live and the page is wired to it (4 Sep 2026).**
`LoadData/PaymentBatch` returns FOUR sets as one composed object —
`TransactionData` (Q2, which also carries the pager total), `DeclineReasons`
(Q4), `BatchHeader` (Q5, Q1's shape for one batch) and `PaymentByType` (Q6,
method × status). Verified against batch 3837: 13,801 payments, 12,628
declines, and the sets agree with each other and with the raw table.

Done: `FDConfig.endpoints.run` set · `loadRun()`/`loadTransactions()` rewritten
to one call · `rowToTxn()` added · `renderDetail`'s three `run.txns` reductions
repointed at Q4/Q6/`stats` · `boot()` no longer runs Q1 across 365 days ·
`StillOwed` wired.

**Server-side filter + search: DONE and verified live, 4 Sep 2026.**
Q2 takes `@Bucket` / `@Search`; `ZenQL_TransactionCount` (Q3) deleted — Q2
returns `COUNT(*) OVER () AS TxnTotal` over the FILTERED set, so the pager
total can never disagree with the rows beside it. Verified against batch 3837
from a logged-in iMIS console, all six checks passing:

| check | result |
|---|---|
| unfiltered `TxnTotal` | 13,801 |
| `Bucket=Declined` `TxnTotal` | **12,628** (not 13,801 — @Bucket reaches SQL) |
| every returned row really is Declined | yes |
| no-match search | 0 rows |
| `Search='50%'` treated as a literal, not a wildcard | 0 rows |
| `TransactionCount` set gone from the response | yes |

**Measured 718–867ms per call** with the index still parked and Q4's `EXISTS`
running over all 12,628 declines each time. That is the evidence that parking
the index was the right call — revisit only if it degrades.

Client side, done at the same time: search debounced 300ms (it was wired to
`input`, i.e. one full scan per keystroke), a stale-response guard in
`renderDetailTable` (two fetches can be in flight and responses are not
ordered), and `RUN_CACHE` capped at 24 entries (its key includes the search
string, so it grew per keystroke).

⚠ Do NOT pass `Bucket`/`Search` to the Q4/Q5/Q6 activities. Those panels
describe the whole run; filtering them makes them agree with the table instead
of the batch.

**Payload `Mode`: DONE and verified live, 4 Sep 2026.**
The endpoint takes a `Mode` in the request body:

| `Mode` | Runs | Sent by |
|---|---|---|
| `full` | Q2 + Q4 + Q5 + Q6 | `loadRun()` — opening a run |
| `transactions` | Q2 only | `loadTransactions()` — filter, search, page |

Measured on batch 3837: **full ~780ms, transactions ~365ms — 405ms saved on
every filter click, search and page change.** Q4/Q5/Q6 are the expensive half,
which is why the panels are not re-fetched: they describe the whole run and do
not change when the table is filtered.

Flow shape: `Validation → TransactionData → Switch`, with `Full` AND
**`Default`** both routed to `BatchHeader → DeclineReasons → PaymentByType`,
and `Transactions` going straight to the collation. Default MUST route to the
full branch — failing open costs a slow response, failing closed returns no
`BatchHeader` and the page reports a real batch as "run not found". Verified:
an absent Mode and an unrecognised Mode both return the panels.

The Switch's `Done` output is disconnected — its semantics are undocumented,
and if it fires when the Switch resolves rather than when the branch finishes,
the collation could race `PaymentByType`. Nothing needs it.

Both JS activities are written as a single parenthesised IIFE, because the
engine takes the value of the LAST EXPRESSION — a bare `{ ... }` is parsed as
a block, not an object (and a single-property one silently evaluates to the
value rather than erroring). They also probe `activities[name]` for existence
rather than branching on the mode, so they report what actually ran.

Client side: `RUN_CACHE` reuse is asymmetric — a `full` payload satisfies
either request, a lean one only satisfies `transactions`. Without that,
a lean payload could land under the key `loadRun()` wants and the run would
render as "not found". Covered by tests.

**Pagination + CSV export: DONE 4 Sep 2026.** 28 tests passing.

*Pager* — windowed, so 139 pages render as `‹ 1 … 68 69 70 71 72 … 139 ›`
rather than 139 buttons. Lives inside `#txn-table-slot` so it is replaced with
the table and can never show a stale position. `min-width` on the buttons stops
the row reflowing as the number of digits changes.

⚠ `renderDetailTable` SELF-CORRECTS a page past the end, and the reason is
subtle: Q2's total comes from `COUNT(*) OVER ()`, so an out-of-range page
returns no rows AND THEREFORE NO TOTAL. `total` reads 0, the pager renders
nothing, and the user is stranded on a blank table with no control to escape.
That is indistinguishable from a genuinely empty result, so the recovery is to
retry at page 1 — which has rows whenever any exist. Found by a test, not by
inspection.

*CSV* — exports the CURRENT VIEW (chips + search), which is the whole run when
nothing is filtered; the filename says which, so a file on someone's desktop is
self-describing. Since 16 Oct 2026 it is PAGED: `C.csvPageSize` (1,000) rows
per request, one after another, behind a progress toast with Cancel — 14 calls
for the worst batch, not the 139 a 100-row page would need. `Mode=transactions`,
uncached — those pages would evict the whole page cache. If a view exceeds
`C.csvMaxRows` (25,000) the user is TOLD the file is truncated rather than
handed a short file that looks complete.

⚠ `csvField()` does TWO things and both are load-bearing: CSV quoting (member
names contain commas), and **neutralising spreadsheet formula injection** by
prefixing a tab to any value starting with `= + - @`. Excel and Sheets execute
those on open and this file goes to finance staff. Do not "tidy" that away.
Also a UTF-8 BOM, or Excel reads the file as the system codepage and mangles
non-ASCII names.

Remaining, ordered:

- [ ] **`declineKind()` defaults unknown reasons to Soft**, so the retry button
      currently offers to retry all 12,628 declines including
      "Invalid Cash Account ID". Needs the finance-supplied ReasonCode map
      (SQL-DATASETS.md §6) before that button does anything real.
- [ ] **Payment-type chips need the Flow updated (16 Oct 2026).** The batch
      page now sends `PaymentType` (`cc` / `dd` / `other`, null = all) with
      every transactions call, and Q2 in `v1-payments.sql` filters on it. Until
      the CloudToolz Flow passes `PaymentType` through to Q2, the chips will
      highlight but the table and CSV will still show every type.
- [ ] **CSV export is now paged (16 Oct 2026)** — `csvPageSize` (1,000) rows per
      request, sequential, with a progress toast and Cancel. Worst batch is 14
      calls; not yet timed live.
- [ ] **First live load from inside iMIS** — the run page has still only been
      exercised against saved fixtures and direct `fetch` calls, never from a
      real iMIS origin with the app's own code path.

**PARKED — the `Payments.BatchId` index.** Q2, Q4, Q5 and Q6 each full-scan all
2.16M rows of `Payments` to answer for one batch, because nothing indexes
`BatchId`. Measured end to end on batch 3837 (4 Sep 2026, the worst case in the
data — 13,801 payments, 12,628 of them declines):

| call | time |
|---|---|
| `Mode=full` (opening a run) | ~780ms |
| `Mode=transactions` (filter, search, page) | ~365ms |

Parked, and the numbers are why: sub-second on the worst batch is tolerable,
and dropping Q3 plus adding `Mode` took more off the common path than the index
would have. Ask CloudToolz for it before this goes in front of finance staff,
and ask whether it survives their upgrades:
```sql
CREATE NONCLUSTERED INDEX IX_Payments_Batch_Charge
    ON UnionTemplate.Payments (BatchId, ChargeDate DESC, Id DESC)
    INCLUDE (Status, TokenType, Amount);
```
~90 MB. It also removes Q2's sort and its 39 MB memory grant. Nothing in §2 is
blocked by it — only the load time is.

**Already resolved — do not re-litigate:** member name (`ZenCRM.Individuals.ID`
→ `FullName`, `ImisId`), the `stillOwed` rename, the `data-fd-action`
conversion, and the shell (no `on*` attributes, survives the iMIS filter).

**Open item #8 — SETTLED 4 Sep 2026.** The relay DOES return multiple result
sets. Verified against a live `LoadData/PaymentBatch` Flow returning a composed
object from a JS activity:
```js
setVariable('Result', {
  Payments:    activities.ZenQL_Payments.ResultSet(),
  Individuals: activities.ZenQL_Individuals.ResultSet()
});
```
Both arrays arrived intact, so **endpoint B returns its sets as one composed
object** — no `FOR JSON`, no separate calls. Types came back clean in the same
test: `CrmId` and `Individuals.Id` are both JS numbers and `Amount` is a real
number, so no numeric-as-string coercion is needed for those.
That was the last open item on the list.

(Q3 was later dropped entirely — Q2 carries `COUNT(*) OVER ()` — so the
composed object now holds four sets, or one under `Mode=transactions`.)

---

## 3. v2 backlog

- **Arrears page** — `arrears.html` + `fd-arrears.js` + `v2-declines.sql` all
  written and parked. Needs the JS repointed at Q4/Q5/Q6: it currently loads
  every declined transaction in the window and filters in JS, which will not
  survive real volumes (one test batch alone held 12,628 declines).
  `imisPages.arrears` stays `null` until it ships.
- **Scheduled retries** — future-dated runs are payment retries. v1 excludes
  them via `@ToDate`; v2 should surface them, probably as a "Scheduled" group in
  the runs list, alongside the retry queue that creates them.
- **Retry declines on the batch page** — the header's `Retry declines (n)`
  button was removed from v1 on 16 Oct 2026 (not ready). Its `retry-soft`
  handler in `fd-boot.js` is parked; needs the ReasonCode map (§2) first.
- **Retry from the runs list** — removed from v1 on 16 Oct 2026. The
  Unprocessed column now shows a plain count; the `Retry · n` button, its
  `retry-run` handler (`fd-boot.js`) and `.retry-btn` styles are parked for v2.
  Blocked by the same ReasonCode map as the run page's retry (§2).
- **Invoice world (Batch Kind 1)** — the "Invoices outstanding" KPI reads 0 by
  design in v1 and stays until this lands. Open item #5 belongs to it.
- **PRD / payroll deduction (Kind 3/4)** — v3, load-and-reconcile, not designed.
- **Errors are invisible** — Q1 returns `ErrorCount`/`ErrorValue` and
  `OtherCount`/`OtherValue`, but `runStats` has nowhere to put them. Matters
  most for `imisError` (status 9): money taken with no iMIS record. Needs a
  seventh bucket and a card — a design decision, not wiring.

---

## 4. Decisions made — settled, don't redo

| Decision | |
|---|---|
| Status 4 (`Paid`) = 5 (`Cleared`) | They differ only by iMIS sync state; this dashboard reads CloudToolz |
| Status 15 counts as declined, 16 does not | 15 is the PSANZ payment importer status; 16 falls to `Other` |
| `_Unsynced` twins (91/93/…/910) unused | Dropped from every `IN` list |
| `Payments.Processed` is unrelated to declines | "Unprocessed" = invoice open (`Status 0`) with `Balance > 0` |
| TokenType 1 + 11 = `cc` | Split by instrument |
| Trend dated by `Batch.RunDate` | A bar means "a run happened that day" |
| Type 1 = "Daily Run"/Autopay, Type 0 = "Other"/Adhoc | **INVERTED vs the Lookup names** — see SQL-DATASETS.md §2 |
| Three self-contained pages, no shared cache | Each re-fetches on load |
| Run id is the bare `BatchId`; URL param is `BatchID` | `?BatchID=3837` |
| CDN build is the default; inline is the fallback | Both survive the iMIS filter |
| 4px `border-left` on run cards stays | User confirmed 4 Sep |

---

## 5. Gotchas that will bite

- **iMIS strips `on*` attributes AND decodes HTML entities on save** — including
  inside `<script>` text. The entity decode is fatal: a named quote entity
  becomes a bare `"` and the whole bundle stops parsing. **Run
  `node test/simulate-filter.js` before pasting anything.** Full detail and
  evidence in `test/FINDINGS.md`.
- **Never write a named HTML entity in a `.js` file**, and never put an `on*`
  attribute in an HTML shell. Both work on the dev server and fail in iMIS.
- **`serve.json` must keep `cleanUrls: false`** plus the `/` → `/index.html`
  rewrite, or the run page loses its query string locally.
- **Preview-pane quirk:** subdirectory URLs do not navigate; put test harnesses
  at the project root. And a hidden pane pauses `requestAnimationFrame`, which
  is where the trend chart paints — bars look unpainted until the tab is fronted.
- **Mock mode pins "today" to 6 Jul 2026**; live uses the real date. Anything
  converting a date to `daysAgo` must go through `FDData.today()`.
- **`historyDays` is 365**, not 90: the KPI delta reaches back `rangeDays × 2`,
  so at 90 the 90-day range had no comparison at all.

---

## 6. File map

| | |
|---|---|
| `v1-payments.sql` | Q1 summary, Q2 transactions, Q3 count, Q4 decline reasons + PERF NOTES |
| `v1-payments-verify.sql` | Diffs tuned vs original Q1. Passed 3 Sep |
| `v1-open-items.sql` | Diagnostics for the remaining open questions |
| `v2-declines.sql` | Q4/Q5/Q6 windowed — the arrears page. Parked |
| `build-embed.js` | `node build-embed.js [surface] [--inline] [--plain]` → `dist/` (themed) or `dist/plain/` |
| `dist/archive/2026-09-04/` | The previous, unthemed embeds — reference only |
| `test/simulate-filter.js` | **Run before pasting.** Simulates the iMIS filter, syntax-checks the result |
| `test/FINDINGS.md` | What iMIS does to saved content, with evidence |
| `test/imis-filter-probe.html` | Paste into RiSE to re-test the filter's behaviour |
| `test/compare-filter.js` | Diffs a pasted build against what iMIS served |
| `ct-probe.browser.js` | Paste into an iMIS console to hit a CloudToolz endpoint |
| `docs/SQL-DATASETS.md` | Schema mapping, lookup codes, open items §7 |
| `docs/REVIEW-2026-07.md` | Code review, 8 issues |
