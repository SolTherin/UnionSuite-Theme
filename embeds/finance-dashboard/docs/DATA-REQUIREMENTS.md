# Finance Dashboard — data requirements & API call plan

Every data point the two surfaces render, where it comes from in iMIS, and the
call plan that fetches it. The plan is chosen to trade off two things that pull
in opposite directions: **fewest API calls** and **least browser work**.

**Headline: the whole dashboard is one API call, and the browser never loads a
payment row it isn't showing.** That falls out of one decision — aggregate in
SQL views, not in JavaScript — explained in §1.

> **See also `SQL-DATASETS.md`** — the *physical* mapping onto the real
> `UnionTemplate` payment schema (resolved lookup codes, the base flattening view,
> the `BatchSummary` aggregation SQL). It also records the shift from reusing
> ReportBuilder's **generic** proc (the framing much of §1 below is built around) to
> a **dedicated CloudToolz endpoint** that aggregates server-side and can bundle
> datasets in one response — which relaxes several constraints §1 treats as fixed.

---

## 1. The constraint that decides everything

Data comes through HubReportBuilder's CloudToolz contract, reused verbatim
(`Claude/Data Template display/ct-api.js`, `Claude/ReportBuilder/docs/CLOUDTOOLZ-INTEGRATION.md`).
One fixed endpoint, one generic proc:

```
POST {ctBase}/Template/HubReports/FetchData
{ datasource, filters, logic, orderBy, orderDir, orderByJson, offset, pageSize }
header: HubReportMode: definition | preview | count | report | download
```

`UnionSuite.sp_HubReports_Datasource` **filters, sorts, pages and counts one
table or view. It does not aggregate.** No GROUP BY, no SUM. Whatever shape the
view has is the shape the browser gets.

That matters because of volume. At current rates a weekday produces roughly
400–700 payments across ~4–5 runs, so:

| Window | Payment rows | Batch rows |
|---|---|---|
| 7 days | ~2,500 | ~20 |
| 30 days | ~10,000 | ~90 |
| 90 days | ~30,000 | ~280 |

`report` mode is capped at 500 rows by the proc, so aggregating 90 days of
payments in the browser means **60+ paged calls**, several MB of JSON, and a
multi-second reduce on the main thread — to render numbers that are a few hundred
bytes.

(Those 60+ calls could now run *concurrently* — the ZenToken turns out to be
reusable, not single-use; see §4. That weakens the latency half of this argument but
not the other two: the payload and the main-thread reduce are unchanged, and 60
concurrent requests against the proc is its own problem. Aggregating in SQL is still
right.)

**So the aggregation goes in SQL views, and the browser fetches the summary.**
Everything below follows from that. Payment-grain rows are fetched only for the
one run on screen, one page at a time.

### What this rules out, and why

| Alternative | Why not |
|---|---|
| Fetch payments, aggregate client-side | 60+ calls, MBs of JSON, seconds of main-thread work (above) |
| One call per KPI / per chart | 8–12 calls per load, each with its own token round-trip; and they'd disagree with each other if a payment settles between calls |
| A separate daily-volume view for the trend chart | Not needed. The trend is the batch rows summed by date — the summary view already carries date + collected + declined per batch. Saves a call for free |
| A batch × payment-type view | Not needed. Payment types are a **fixed set of six**, so they pivot into columns on the summary view. Saves a call, and gives the run screen its by-type table for nothing |

---

## 2. View 1 — `UnionSuite.vw_HubFinance_BatchSummary`

**Grain: one row per payment run (batch). One row per `UnionTemplate.Batch`.**

This single view powers the *entire* dashboard surface and most of the run
screen. ~280 rows for 90 days — comfortably inside one 500-row `report` page, so
it is **one call**.

It is deliberately wide (pre-pivoted) rather than tall. A tall view (batch ×
status, or batch × type) would be ~1,700 rows over 90 days and need paging;
wide keeps it to one call and one page, and costs the browser nothing because
the column set is fixed.

### Identity & header

| Column | Source | Feeds |
|---|---|---|
| `BatchId` | `UnionTemplate.Batch.ID` | row key, `?BatchID=` param, transaction filter |
| `BatchRef` | batch number / display id | shown as "Batch 2226"; the id itself is the bare int |
| `BatchName` | batch name | run title, search |
| `BatchKind` | `Batch.Kind` (1 invoice, 2 payment, 3 PRD invoice, 4 PRD payment) | run grouping, invoice-vs-payment logic |
| `BatchType` | `Batch.Type` (Daily = adhoc, Bulk = auto-generated) | type label, search |
| `BatchDescription` | batch description | run sub-line ("iMIS Autopay", "reconciliation") |
| `RunDate` | batch created date (**date only**) | date grouping, range filter, trend x-axis |
| `RunTime` | batch created time | run screen header |
| `BatchStatusRaw` | `Batch.Status` (lookup) | audit / reconciliation against the derived state |

`RunDate` must be date-only and indexed — it is the only filter the dashboard
sends, and it drives the OFFSET/FETCH ordering.

### Outcome roll-up — count and value per UI bucket

Six buckets, each a `COUNT` and a `SUM(Amount)`:

| Column pair | UI bucket |
|---|---|
| `PendingCount` / `PendingValue` | Pending |
| `ProcessingCount` / `ProcessingValue` | Processing |
| `AwaitingCount` / `AwaitingValue` | Awaiting payment (invoices outstanding) |
| `ClearedCount` / `ClearedValue` | Cleared |
| `ReconciledCount` / `ReconciledValue` | Reconciled |
| `DeclinedCount` / `DeclinedValue` | Declined |
| `ErrorCount` / `ErrorValue` | **Not in the UI yet — see §6** |
| `TotalCount` / `TotalValue` | run total |

Plus two the retry actions need:

| Column | Meaning |
|---|---|
| `DeclinedUnprocessedCount` | Declined and not yet retried — the run-list "Retry · n" button |
| `SoftDeclinedUnprocessedCount` | …and the reason is retryable — the run screen's "Retry declines (n)" button, which must exclude hard declines |

And one for the review tracker:

| Column | Meaning |
|---|---|
| `MaxProcessingDays` | Days the longest-held Processing payment has been waiting. `> 5` ⇒ the run is flagged "to review". Computing this in SQL is what keeps the review chip free — otherwise it needs a payment-grain scan |

### Payment-type pivot — count and value per type

Six fixed types × 2 measures = 12 columns:

`DDCount`/`DDValue`, `CCCount`/`CCValue`, `BpayCount`/`BpayValue`,
`EftCount`/`EftValue`, `InvCount`/`InvValue`, `PrdCount`/`PrdValue`

Feeds the dashboard's "Payments by type" chart (summed across the range) **and**
the run screen's "Payment type" table (that one row).

The run screen's by-type table also shows OK / Pending / Declined per type. That
is type × status = 36 more columns, which is where wide stops being sensible. Two
options, both acceptable:

- **Recommended:** add `{Type}OkCount`, `{Type}PendCount`, `{Type}BadCount` for
  the six types (18 columns). Still one call, still one row per batch.
- Or derive it on the run screen from the transactions already fetched — but that
  is only correct for the *first page*, so it would need a per-batch tall view
  and an extra call. Not worth it.

### Derived in the browser, never fetched

These cost nothing and must not become columns — the client already has the
inputs:

- Run state (Generated / Processing / Finalised) — from `PendingCount` /
  `ProcessingCount` (`fd-core.js` → `runState`)
- Average collected payment — `ClearedValue / ClearedCount`
- Per-date subtotals in the run list — sum the day's batch rows
- Daily volume trend — group batch rows by `RunDate`
- Payments-by-type chart — sum the type columns across the range
- Prior-period delta — the summary already spans 90 days, so the previous
  30-day window is in memory

---

## 3. View 2 — `UnionSuite.vw_HubFinance_DeclineReasons`

**Grain: batch × decline reason.** Only rows where declines exist, so ~2–4 rows
per affected batch.

| Column | Feeds |
|---|---|
| `BatchId` | join / filter |
| `RunDate` | range filter for the declines view |
| `Reason` | reason label |
| `ReasonCode` | gateway code — stable key for the soft/hard classification |
| `IsSoft` | retryable vs terminal. **Classify in SQL, not in JS** — see §6 |
| `DeclineCount` | count |
| `DeclineValue` | value |
| `UnprocessedCount` | not yet retried |

**Fetched lazily, never on dashboard load.** The Declined KPI card's count and
value come from View 1; this view is only needed when the user opens the Declines
area (filter `RunDate >= @from`) or a run screen (filter `BatchId = @id`, ≤ 6
rows).

---

## 4. View 3 — `UnionSuite.vw_HubFinance_Transactions`

**Grain: one row per payment / invoice.** A flattening view over `Payments`,
`Invoice`, the party record and `UnionTemplate.Batch`.

**This is the only payment-grain fetch, and it is always bounded** — one batch,
one page of 100. It is never used for aggregation.

| Column | Source | Feeds |
|---|---|---|
| `BatchId` | `Batch.ID` | **the filter** (`= @id`) |
| `RunDate` | batch date | declines-list filter, sort |
| `PaymentRef` | payment / invoice reference | Reference column |
| `PartyId` | member id | Member ID column, link to the record |
| `MemberName` | party display name | Member column, search |
| `PaymentType` | derived (dd / cc / bpay / eft / inv / pd) | type chip |
| `Amount` | payment amount | Amount column |
| `StatusBucket` | mapped UI outcome (§5) | status badge, filter chips |
| `StatusRaw` | `Payments.Status` / `Invoice.Status` | audit, support |
| `DeclineReason` | gateway reason text | Result / note column |
| `ResultNote` | settlement note ("settled after 2d") | Result / note column |
| `IsRetried` | already retried | excludes it from a retry batch |
| `ProcessingDays` | days in Processing | ages the held payments |
| `SortKey` | **unique**, e.g. payment id | see the paging note below |

**Paging note.** The proc uses `OFFSET/FETCH`, which needs a stable total order or
pages overlap and drop rows. Always send `orderByJson` ending in a unique column
(`SortKey`). This is a correctness requirement, not a presentation preference.

**Count and rows may be fetched in parallel.** This document previously said they
must not be, because each call mints a single-use ZenToken and overlapping chains
invalidate each other. That was **measured false on 2026-07-25**: one mint serves many
fetches, sequential or parallel, and is valid for at least 5 minutes — the client never
even captures a token value, so there was nothing to invalidate. Details and the test
results: `Claude/ReportBuilder/docs/CLOUDTOOLZ-INTEGRATION.md` §0; script:
`Claude/API Reference/zentoken-lifetime-test.js`.

Still keep a **re-mint-once-and-retry** on a 401 or an unexpectedly empty body — correct
under any token lifetime, and cheap.

---

## 5. Status mapping — source → UI bucket

The UI has six outcome buckets. `Payments.Status` and `Invoice.Status` have far
more values (from `Payment runs.docx`). **This mapping belongs in the view**, so
every surface buckets identically and the mapping is auditable in one place.

| UI bucket | Source statuses |
|---|---|
| Pending | `Payments.New` — generated, not yet sent to FZ |
| Processing | `Payments.Submitted`, `Payments.Processing` |
| Cleared | `Payments.Completed` — FZ result in, iMIS updated |
| Reconciled | `Completed` where `Batch.Kind` ∈ (3, 4) or the batch is a BPAY/PRD reconciliation file |
| Awaiting payment | `Invoice.Handled` / outstanding invoices (`Batch.Kind` = 1) |
| Declined | `Payments.Declined` |
| *(excluded)* | `Cancelled`, `Reversed`, `Write off`, `Replaced`, `-2 Cancelled during preview`, `Refund` |

### Four values need a decision before the view is written

These come straight from the notes in `Payment runs.docx` and change the numbers
on screen, so they are worth confirming rather than guessing:

1. **`Paid`** — "FZ has given a result, but iMIS hasn't been updated". Money is
   collected but the order isn't posted. Cleared or Processing? Recommend a
   **seventh bucket, "Collected, not posted"**: calling it Cleared overstates
   posted revenue, calling it Processing understates collections. It is also
   exactly the queue the dues importer works from, so it is operationally useful.
2. **`Managed`** — "scheduled for future date, Alex to confirm". If it is a
   future-dated payment it is not in this run's outcome at all and should be
   excluded, not counted as Pending.
3. **`Gateway error` / `imisError`** — see §6. Not currently anywhere in the UI.
4. **`Synced` / `Finalised` / `Refund`** — documented as unused. Map them to
   *excluded* and add a `SELECT` to alert if any row ever has them, rather than
   silently dropping rows.

---

## 6. Two gaps worth raising

**a) Errors are invisible.** `Gateway error` (payment not taken) and `imisError`
(payment *was* taken, iMIS failed to record it) are both money-affecting and
neither appears in the mockup. `imisError` in particular is money collected with
no iMIS record — the single most important exception in the list. The
`ErrorCount` / `ErrorValue` columns are in View 1 above for this; the UI needs an
Errors KPI card and a run-list column to match. Flagging rather than building it,
since it changes the agreed design.

**b) Soft/hard decline classification currently lives in JavaScript.**
`fd-core.js` → `DECLINE_KIND` hard-codes six reason strings, and
`declineKind()` defaults anything unrecognised to **Soft** — so a new gateway
reason code silently joins the retry batch. That is fine for a mockup, wrong for
a live retry action. Move it to `vw_HubFinance_DeclineReasons.IsSoft`, keyed on
`ReasonCode` rather than display text, and default unknown codes to *hard*
(exclude from retry) so an unrecognised code costs a manual review rather than a
pointless retry.

Payment types and their colours stay client-side — a closed set of six, purely
presentational, and worth zero API calls.

---

## 7. The call plan

Each *logical fetch* is 2 HTTP requests warm (mint ZenToken → POST FetchData), 3
cold (the `$/ZENTSO/Security/CloudToolzUrl` IQA first, then cached per session).

⚠ **This arithmetic is now overstated and the table below needs revising** — it assumed
a mint per fetch. The ZenToken is reusable and lasts ≥ 5 min (§4), so with one mint per
page a warm logical fetch is **1** HTTP request, not 2. See the TODO in §8.

| User action | Logical fetches | Notes |
|---|---|---|
| **Dashboard load** | **1** | View 1, `RunDate >= today-90`, `report` mode. ~280 rows |
| Switch 7 / 30 / 90 days | **0** | The 90-day set is already in memory — `FDConfig.historyDays` |
| Run-list filter chip, search, review filter | **0** | In-memory over ~280 rows |
| Open the Declines area | 2 | View 2 (by reason, range) + View 3 (`IsDeclined`, page 1). Lazy |
| Declines reason filter / paging | 1 | One page of View 3 |
| **Open a run — warm** | **2** | View 2 + View 3, both `BatchId = @id`. The batch's summary row is read from the cached dashboard payload |
| Open a run — cold (deep link, fresh tab) | 3 | Plus View 1 filtered to that one `BatchId` |
| Run: filter chip / search / next page | 1 | One page of View 3 |

**Session cache.** The run screen is a *separate page load*, so without a cache
it would refetch the summary. Stash the View 1 payload in `sessionStorage` under
a key that includes the range and a short TTL (~60 s), same origin, same tab —
both surfaces read it. That is what turns a cold 3-fetch run open into a warm 2.
Refresh only from the dashboard, so a stale cache can never be the thing a user
is staring at.

### Sizes and browser cost

| | Rows | JSON | Client work |
|---|---|---|---|
| Dashboard (90 days) | ~280 | ~150–250 KB | Reductions over ~280 objects — microseconds |
| Run screen | 1 summary + ≤6 reasons + 100 txns | ~40 KB | One render pass |

The browser never holds more than ~100 payment rows. The run list renders 63 rows
for 30 days, 189 for 90 — no virtualisation needed. Transaction tables are capped
at `FDConfig.txnPageSize` (100), which is a **DOM** limit, not a network one:
the count comes from `count` mode, so "Showing first 100 of 218" stays honest.

One deliberate remaining hot loop was removed while splitting the files: the
daily-volume chart used to re-filter the whole run set once per day in the range
(O(days × runs)). It is now a single grouped pass — see `fd-dashboard.js` →
`renderTrend`.

---

## 8. Build order

1. **Confirm the four status mappings in §5** with finance. Everything downstream
   depends on them, and getting them wrong is a wrong-numbers bug, not a crash.
2. Write View 1. Verify the 90-day row count is under 500 — if the batch count
   grows past that, page it or drop `historyDays` to 60.
3. Point `FDConfig.mode = "live"` at View 1 and implement `FDData.load()`.
   Nothing else in the app changes: the views already call `load()` /
   `loadRun()` / `loadTransactions()` and nothing else.
4. Write View 3, implement `FDData.loadTransactions()` (`count` then `download`,
   unique `SortKey` last in `orderByJson`). The `count` and `download` calls may run
   in **parallel** — see §4; earlier drafts of this list said sequential.
5. Write View 2, implement the reasons fetch.
6. Add the `sessionStorage` layer (§7).
7. Decide on the Errors surface (§6a) and move the soft/hard classification into
   SQL (§6b).

### TODO — reassess this plan against the ZenToken finding (added 2026-07-25)

The ZenToken turned out to be reusable and valid ≥ 5 min, not single-use per fetch
(§4). Nothing here is *wrong* because of it, but three things were sized against the
old assumption and should be rechecked before implementing:

- [ ] **Revise §7's request arithmetic and its table.** "2 HTTP requests warm per
      logical fetch" assumed a mint each time. With one mint per page it is 1, so every
      row in that table is overstated by roughly half.
- [ ] **Re-decide whether the `sessionStorage` layer (§7) is worth building at all.**
      Its whole justification was turning a cold 3-fetch run open into a warm 2. If a
      cold open is now 2 and a warm one is 1, the cache may be buying a single request
      at the cost of a staleness bug class. Cheaper to drop it than to get it right.
- [ ] **Fetch the run screen's two calls concurrently.** Opening a run needs View 2
      (reasons) + View 3 (transactions page 1), and the declines area likewise. Those
      were specified sequential; `Promise.all` halves the wait.

Run each new view once in `definition` mode first to confirm column names and
types — the column-name/casing mismatch is the usual first failure, and
`reference_imis_iqa_schema` covers extracting the types.

---

## 9. Access control

These views expose every member's payment detail, so the real boundary is **iMIS
page permissions**: put both RiSE pages behind a finance role. The CloudToolz
relay token scopes calls to the logged-in user for *authentication*, not for
row-level authorisation of a back-office report. The `licensedHosts` check in
`fd-config.js` is a licensing control, not a data control — don't confuse the two.
