# Finance Dashboard — SQL datasets & schema mapping

How the dashboard's data needs map onto the **real `UnionTemplate` payment schema**, the
resolved lookup codes, and the SQL views that feed the two surfaces.

**Read this with** `DATA-REQUIREMENTS.md` (the logical spec — what each surface renders and
the call plan). This document is the *physical* mapping: real tables, real columns, real
codes, and the view SQL.

> **Design context — dedicated endpoint, not the ReportBuilder generic proc.**
> `DATA-REQUIREMENTS.md` §1 is written around reusing HubReportBuilder's generic
> `Template/HubReports/FetchData` proc, which **cannot aggregate** (no `GROUP BY`), forcing
> everything into wide pre-pivoted views fetched one flat table at a time. For this dashboard
> we are building a **dedicated CloudToolz endpoint** instead, so:
> - Aggregation happens **server-side in SQL** (the views below do the `GROUP BY`).
> - The response can be a **purpose-shaped / nested JSON** object, not a flat row array.
> - **Multiple datasets can be bundled in one response.** Confirmed 4 Sep 2026 (open item
>   #8): the relay preserves them. Compose the object in the Flow's JS activity — no
>   `FOR JSON` needed.
> - Counts/totals come back **inline** (no separate `count`-mode call).
>
> Only the **transport** is reused from ReportBuilder: the 3-step relay auth (resolve CT URL
> → mint ZenToken → POST with party headers) and JSON handling. See
> `Claude/ReportBuilder/docs/CLOUDTOOLZ-INTEGRATION.md`.

---

## 1. Source tables (`UnionTemplate` schema)

| Table | Grain | Role here |
|---|---|---|
| `Batch` | one payment/invoice run | run identity, date, `Kind`, `Type` |
| `Payments` | one payment | transaction rows for **payment runs** (`Kind` 2, 4) |
| `Invoices` | one invoice | transaction rows for **invoice runs** (`Kind` 1, 3) |
| `InvoiceLines` | invoice line | product/area detail — **not used yet** (would drive an "income area" breakdown if added) |
| `PaymentLines` | payment↔invoice link | allocation detail — not needed for the current UI |

### Join graph

```
Batch (Id)
 ├─1:*─ Payments (BatchId)     ← transaction rows for Kind 2 / 4
 │        └─*:*─ Invoices via PaymentLines (PaymentId ↔ InvoiceId)
 └─1:*─ Invoices (BatchId)     ← transaction rows for Kind 1 / 3
          └─1:*─ InvoiceLines (InvoiceId)
Member:      Payments.CrmId / Invoices.CrmId → ZenCRM.Individuals.ID
             → FullName (display name), ImisId (the member number the UI shows)
             LEFT JOIN — an INNER drops payments with no matching individual
```

### Two structural findings

1. **`Batch` has no `Name` or `Description` column** — only `Kind`, `Type`, `Entity`. The
   mock's run titles ("Membership Dues — Daily Run", sub-line "iMIS Autopay") **do not exist
   in the data**. `BatchName` / `BatchDescription` / the type label must be **synthesised
   from `Kind` + `Type`** (a `CASE`, in `vw_HubFinance_BatchSummary` below). Labels to be
   confirmed with finance.
2. **A run's rows live in different tables depending on `Kind`.** Payment runs (Kind 2, 4)
   → `Payments`; invoice runs (Kind 1, 3) → `Invoices`. The base view is therefore a
   `UNION ALL` that normalises both into one transaction shape.

---

## 2. Resolved lookup codes (`UnionTemplate.Lookup`)

Statuses/types are `int`, resolved via `UnionTemplate.Lookup` (keyed by `Type` + `Id`).

### BatchKind
| Id | Meaning | Row source |
|---|---|---|
| 1 | Invoice | `Invoices` |
| 2 | Payment | `Payments` |
| 3 | PRD Remittance Invoices | `Invoices` |
| 4 | PRD Remittance Payments | `Payments` |

### BatchType
| Id | Lookup name | What it actually is | UI label (finance, 3 Sep 2026) | Sub-line |
|---|---|---|---|---|
| 0 | "Daily" | **adhoc payments** | Membership Dues — Other | Adhoc Payments |
| 1 | "Bulk" | **auto-generated runs** | Membership Dues — Daily Run | Autopay |

> ⚠ **The Lookup names are misleading — Type 0 is called "Daily" but means
> *adhoc*.** The business's "Daily Run" is the AUTOMATED one, i.e. Type **1**.
> Confirmed against live rows: a Type 1 batch held 13,801 payments, a Type 0
> batch held 11. Anyone reading only the Lookup will map these backwards.

### PaymentStatus → UI bucket

> **The `_Unsynced` twins are NOT USED** (confirmed 3 Sep 2026). The table below
> keeps them for reference, but `v1-payments.sql` has dropped 91/93/94/95/96/98/
> 99/910 from every `IN` list. If one ever does appear it falls into **Other**
> rather than being silently absorbed into a real bucket — which is exactly the
> canary §4's audit note asks for, so watch `OtherCount`.
>
> `v1-payments-verify.sql` re-run doubles as the empirical proof: its `#old` leg
> still carries the twins, so an empty diff means no payment in the window has
> one.

Base codes and their `_Unsynced` twins map to the **same** bucket.

| Bucket | PaymentStatus Ids | Notes |
|---|---|---|
| Pending | 1, 91 | New — generated, not sent to FZ |
| Processing | 3, 93 (Submitted) · 10, 910 (Processing) | sent to FZ, awaiting result |
| **Collected, not posted** | 4, 94 (Paid) | FZ result in, iMIS not updated. **Decision: own bucket vs Cleared** |
| Cleared | 5, 95 (Completed) — see split | paid + iMIS updated |
| Reconciled | 5, 95 where `Kind ∈ (3,4)` OR `TokenType = 31` (BPAY) | |
| Declined | 6, 96 · 15 (Declined_Error) · 16 (Declined_Manual) | **confirm 15/16 are declines** |
| Error | 8, 98 (GatewayError) · 9, 99 (iMISError) | money-affecting; no UI card yet |
| *excluded* | 2/92 Synced · 7/97 Finalised · 11 Cancelled · 12 Managed · 13 Reversed · 14 Refund | dropped from all roll-ups |

### InvoiceStatus → UI bucket
| Id | Meaning | Bucket |
|---|---|---|
| 0 | Open | Awaiting payment |
| 4 | Handled (scheduled future) | Awaiting payment |
| 3 | Processing | Processing |
| 1 | Closed (paid) | Cleared (Reconciled if `Kind = 3`) |
| -2 | Cancelled During Preview | *excluded* |
| -1 | Preview | *excluded* |
| 2 | Cancelled | *excluded* |
| 5 | WriteOff | *excluded* |
| 6 | Replaced | *excluded* |

> `Closed = paid` is inferred — the doc lists no explicit "paid" invoice status. `Balance`
> (`i.Balance <= 0`) can refine this if `Closed` proves ambiguous.

### TokenType → UI payment type
| UI type | TokenType Ids | Notes |
|---|---|---|
| cc | 11 (Credit Card) · **1 (DD–Credit Card)** | **confirm 1 → cc or dd** |
| dd | 22 (Direct Debit) · 2 (DD–Bank Account) | |
| bpay | 31 | |
| eft | 32 | |
| pd | 3 (Payroll Deduction) | |
| inv | 4 (Invoice) · 41 (Manual Invoice) | |
| *excluded* | 90 (Refund) · 91 (Waiver) | not a collection type |

---

## 3. Datasets & column mapping

Three shapes power everything (see `DATA-REQUIREMENTS.md` §2–4 for the logical version).

| # | Dataset | Grain | Filter | Served in |
|---|---|---|---|---|
| 1 | `BatchSummary` | one row per run | `@from` (window) / `@batchId` | dashboard load; run-screen header |
| 2 | `DeclineReasons` | run × reason | `@from` / `@batchId` | declines area; run screen |
| 3 | `Transactions` | one row per payment | `@batchId` + paging, or declined + `@from` | run screen; declines table |

### Dataset 1 — `BatchSummary`

| Spec field | Source / expression |
|---|---|
| `BatchId` | `b.Id` |
| `BatchRef` | `b.Id` — the bare int IS the id (URL `?BatchID=3837`); "Batch " is a display prefix only |
| `BatchName` | **derived** `CASE b.Kind / b.Type` (no name column) |
| `BatchKind` | `b.Kind` |
| `BatchType` | `b.Type` (0 Daily / 1 Bulk) |
| `BatchDescription` | derived from `Kind`/`Type` (or `b.Entity`) |
| `RunDate` | `b.RunDate` (already `date`) |
| `RunTime` | `CONVERT(time, b.CreatedDate)` |
| `BatchStatusRaw` | `b.Status` |
| status buckets ×6/7 (count+value) | `SUM(CASE WHEN StatusBucket=… )` |
| per-type ×6 (count+value) | `SUM(CASE WHEN PaymentType=… )` |
| `DeclinedUnprocessedCount` | `SUM(CASE WHEN Declined AND IsRetried=0)` |
| `MaxProcessingDays` | `MAX(ProcessingDays)` over Processing rows |

Derived in the browser, never columns: run-state pill (from Pending/Processing counts),
average payment (`ClearedValue/ClearedCount`), date subtotals, daily trend (group by
`RunDate`), payments-by-type chart (sum type columns), prior-period delta (90-day payload in
memory).

### Dataset 2 — `DeclineReasons` (payment runs)

| Spec field | Source |
|---|---|
| `BatchId` | `p.BatchId` |
| `RunDate` | `b.RunDate` |
| `Reason` | `p.ResponseMessage` |
| `ReasonCode` | `p.ResponseCode` (or `p.MerchantAdviceCode`) |
| `IsSoft` | classify on `ReasonCode` (finance-supplied map); default unknown → **hard** |
| `DeclineCount` | `COUNT(*)` |
| `DeclineValue` | `SUM(p.Amount)` |
| `UnprocessedCount` | `SUM(CASE WHEN EXISTS(invoice open + balance))` — **NOT `Processed=0`**; `Processed` is unrelated to declines (open item #1, closed 3 Sep 2026) |

### Dataset 3 — `Transactions` (base view row shape)

| Spec field | Payments branch | Invoices branch |
|---|---|---|
| `BatchId` | `p.BatchId` | `i.BatchId` |
| `PaymentRef` | `p.Reference` | `CAST(i.Id …)` |
| `PartyId` | `p.CrmId` | `i.CrmId` |
| `MemberName` | join contact on `CrmId` (added at row-fetch time) | same |
| `PaymentType` | from `p.TokenType` | `'inv'` (`'pd'` if `Kind 3`) |
| `Amount` | `p.Amount` | `i.Total` (outstanding = `i.Balance`) |
| `StatusBucket` | `CASE p.Status` | `CASE i.Status` |
| `StatusRaw` | `p.Status` | `i.Status` |
| `DeclineReason` | `p.ResponseMessage` | — |
| `ResultNote` | derived (`SettlementDate`, days) | derived |
| `StillOwed` | `EXISTS(invoice open + balance)` — replaces the old `IsRetried`/`p.Processed`, which was unrelated to declines | — |
| `ProcessingDays` | `DATEDIFF(day, p.ChargeDate, now)` | — |
| `SortKey` | `p.Id` (unique) | `i.Id` |

> **Member name is joined at row-fetch time, not in the base view** — the aggregations
> (`BatchSummary`, `DeclineReasons`) don't need it, so keeping it out of the base view avoids
> a per-row contact join on every aggregate.

---

## 4. SQL — base flattening view

```sql
CREATE OR ALTER VIEW UnionTemplate.vw_HubFinance_Transactions AS
WITH tx AS (
    /* ── Payment-run rows (Kind 2 = Payment, 4 = PRD Payment) ── */
    SELECT
        b.Id                      AS BatchId,
        b.RunDate,
        b.Kind                    AS BatchKind,
        b.Type                    AS BatchType,
        'P'                       AS Source,
        p.Id                      AS SortKey,          -- unique, last in ORDER BY
        p.Reference               AS PaymentRef,
        p.CrmId                   AS PartyId,
        p.Amount                  AS Amount,
        CAST(NULL AS smallmoney)  AS Balance,
        p.Status                  AS StatusRaw,
        p.ResponseMessage         AS DeclineReason,
        p.ResponseCode            AS DeclineCode,
        p.Processed               AS IsRetried,   -- ⚠ WRONG, see open item #1: Processed
                                                  -- is unrelated to declines. v1-payments.sql
                                                  -- uses EXISTS(invoice open + balance) as
                                                  -- StillOwed instead. Fix here if this view
                                                  -- is ever built for v2/v3.
        p.ChargeDate,
        CASE WHEN p.Status IN (3,10,93,910)
             THEN DATEDIFF(day, p.ChargeDate, SYSUTCDATETIME()) END AS ProcessingDays,
        /* payment type from TokenType */
        CASE
            WHEN p.TokenType IN (11,1) THEN 'cc'      -- 1 = DD–Credit Card (confirm)
            WHEN p.TokenType IN (22,2) THEN 'dd'
            WHEN p.TokenType = 31      THEN 'bpay'
            WHEN p.TokenType = 32      THEN 'eft'
            WHEN p.TokenType = 3       THEN 'pd'
            WHEN p.TokenType IN (4,41) THEN 'inv'
        END AS PaymentType,
        /* status → UI bucket */
        CASE
            WHEN p.Status IN (1,91)        THEN 'Pending'
            WHEN p.Status IN (3,10,93,910) THEN 'Processing'
            WHEN p.Status IN (4,94)        THEN 'Collected, not posted'   -- Paid (confirm)
            WHEN p.Status IN (5,95) AND (b.Kind IN (3,4) OR p.TokenType = 31)
                                           THEN 'Reconciled'
            WHEN p.Status IN (5,95)        THEN 'Cleared'
            WHEN p.Status IN (6,15,16,96)  THEN 'Declined'
            WHEN p.Status IN (8,9,98,99)   THEN 'Error'
            ELSE NULL                      -- Synced/Finalised/Cancelled/Managed/Reversed/Refund
        END AS StatusBucket
    FROM UnionTemplate.Payments p
    JOIN UnionTemplate.Batch    b ON b.Id = p.BatchId
    WHERE b.Kind IN (2,4)

    UNION ALL

    /* ── Invoice-run rows (Kind 1 = Invoice, 3 = PRD Invoice) ── */
    SELECT
        b.Id, b.RunDate, b.Kind, b.Type,
        'I',
        i.Id,
        CAST(i.Id AS varchar(20)),
        i.CrmId,
        i.Total,
        i.Balance,
        i.Status,
        NULL, NULL, NULL, NULL, NULL,
        CASE WHEN b.Kind = 3 THEN 'pd' ELSE 'inv' END,
        CASE
            WHEN i.Status IN (0,4) THEN 'Awaiting payment'   -- Open / Handled
            WHEN i.Status = 3      THEN 'Processing'
            WHEN i.Status = 1 AND b.Kind = 3 THEN 'Reconciled'
            WHEN i.Status = 1      THEN 'Cleared'             -- Closed = paid
            ELSE NULL                                        -- Preview/Cancelled/WriteOff/Replaced
        END
    FROM UnionTemplate.Invoices i
    JOIN UnionTemplate.Batch    b ON b.Id = i.BatchId
    WHERE b.Kind IN (1,3)
)
SELECT * FROM tx
WHERE StatusBucket IS NOT NULL;   -- excluded statuses drop out of every roll-up
```

> **Audit note (per `DATA-REQUIREMENTS.md` §5):** rather than silently dropping excluded rows,
> add a monitoring `SELECT` that alerts if a row ever lands on `Synced`/`Finalised`/`Refund`
> (documented as unused) — those signal a data change worth catching.

---

## 5. SQL — dashboard aggregation (`BatchSummary`)

```sql
CREATE OR ALTER VIEW UnionTemplate.vw_HubFinance_BatchSummary AS
SELECT
    b.Id                        AS BatchId,
    b.RunDate,
    b.Kind                      AS BatchKind,
    b.Type                      AS BatchType,
    CONVERT(time, b.CreatedDate) AS RunTime,
    b.Status                    AS BatchStatusRaw,
    /* run title — Batch has no Name column, so synthesise (confirm labels) */
    CASE b.Kind
        WHEN 1 THEN 'Membership Dues — Invoices'
        WHEN 2 THEN CASE b.Type WHEN 1 THEN 'Membership Dues — Daily Run'
                                ELSE 'Membership Dues — Other' END
        WHEN 3 THEN 'Payroll Deduction — Invoices'
        WHEN 4 THEN 'Payroll Deduction'
    END                         AS BatchName,

    COUNT(*)                                            AS TotalCount,
    SUM(t.Amount)                                       AS TotalValue,

    /* status buckets — count + value */
    SUM(CASE WHEN t.StatusBucket='Pending'   THEN 1 ELSE 0 END)         AS PendingCount,
    SUM(CASE WHEN t.StatusBucket='Pending'   THEN t.Amount ELSE 0 END)  AS PendingValue,
    SUM(CASE WHEN t.StatusBucket='Processing' THEN 1 ELSE 0 END)        AS ProcessingCount,
    SUM(CASE WHEN t.StatusBucket='Processing' THEN t.Amount ELSE 0 END) AS ProcessingValue,
    SUM(CASE WHEN t.StatusBucket='Awaiting payment' THEN 1 ELSE 0 END)        AS AwaitingCount,
    SUM(CASE WHEN t.StatusBucket='Awaiting payment' THEN t.Amount ELSE 0 END) AS AwaitingValue,
    SUM(CASE WHEN t.StatusBucket='Cleared'    THEN 1 ELSE 0 END)        AS ClearedCount,
    SUM(CASE WHEN t.StatusBucket='Cleared'    THEN t.Amount ELSE 0 END) AS ClearedValue,
    SUM(CASE WHEN t.StatusBucket='Reconciled' THEN 1 ELSE 0 END)        AS ReconciledCount,
    SUM(CASE WHEN t.StatusBucket='Reconciled' THEN t.Amount ELSE 0 END) AS ReconciledValue,
    SUM(CASE WHEN t.StatusBucket='Declined'   THEN 1 ELSE 0 END)        AS DeclinedCount,
    SUM(CASE WHEN t.StatusBucket='Declined'   THEN t.Amount ELSE 0 END) AS DeclinedValue,
    SUM(CASE WHEN t.StatusBucket='Error'      THEN 1 ELSE 0 END)        AS ErrorCount,
    SUM(CASE WHEN t.StatusBucket='Error'      THEN t.Amount ELSE 0 END) AS ErrorValue,
    /* NB: 'Collected, not posted' (Paid) is not summed above yet — add a column pair
       once the bucket decision is made (see Open items). */

    /* per-type count + value (the six UI types) */
    SUM(CASE WHEN t.PaymentType='dd'   THEN 1 ELSE 0 END) AS DDCount,
    SUM(CASE WHEN t.PaymentType='dd'   THEN t.Amount ELSE 0 END) AS DDValue,
    SUM(CASE WHEN t.PaymentType='cc'   THEN 1 ELSE 0 END) AS CCCount,
    SUM(CASE WHEN t.PaymentType='cc'   THEN t.Amount ELSE 0 END) AS CCValue,
    SUM(CASE WHEN t.PaymentType='bpay' THEN 1 ELSE 0 END) AS BpayCount,
    SUM(CASE WHEN t.PaymentType='bpay' THEN t.Amount ELSE 0 END) AS BpayValue,
    SUM(CASE WHEN t.PaymentType='eft'  THEN 1 ELSE 0 END) AS EftCount,
    SUM(CASE WHEN t.PaymentType='eft'  THEN t.Amount ELSE 0 END) AS EftValue,
    SUM(CASE WHEN t.PaymentType='inv'  THEN 1 ELSE 0 END) AS InvCount,
    SUM(CASE WHEN t.PaymentType='inv'  THEN t.Amount ELSE 0 END) AS InvValue,
    SUM(CASE WHEN t.PaymentType='pd'   THEN 1 ELSE 0 END) AS PrdCount,
    SUM(CASE WHEN t.PaymentType='pd'   THEN t.Amount ELSE 0 END) AS PrdValue,

    /* actions + review */
    SUM(CASE WHEN t.StatusBucket='Declined' AND ISNULL(t.IsRetried,0)=0 THEN 1 ELSE 0 END) AS DeclinedUnprocessedCount,
    MAX(t.ProcessingDays) AS MaxProcessingDays
FROM UnionTemplate.Batch b
JOIN UnionTemplate.vw_HubFinance_Transactions t ON t.BatchId = b.Id
GROUP BY b.Id, b.RunDate, b.Kind, b.Type, b.CreatedDate, b.Status;
```

`GetDashboard` endpoint = `SELECT … FROM vw_HubFinance_BatchSummary WHERE RunDate >= @from`
(optionally `FOR JSON`).

---

## 6. Still to write

- **`DeclineReasons` view** — `GROUP BY BatchId, ResponseCode` over the declined subset, plus
  the `IsSoft` classification (needs the finance-supplied reason-code → soft/hard map).
- **`GetRun` bundle** — one response = summary row (`@batchId`) + that batch's decline
  reasons + first transactions page (100) + total txn count. This is where the **member-name
  join** and the composed-JSON-vs-multi-result-set decision land.
- **Transactions row query** — `@batchId` + status/search/page, unique `SortKey` last in the
  order (OFFSET/FETCH correctness).

---

## 6a. Verified against a real first-cut query (27 Aug 2026)

> ⚠ **Which environment this ran against was not recorded.** Later work touched
> at least two (`CloudToolz_anmfvicA_Prod` per the 3 Sep execution plan;
> `uniontemplate-ems-dev-ap` per the Flow probe), and some of it is test data.
> Treat the batch ids and row counts below as a point-in-time observation of an
> unknown environment, not as facts about the target one. Re-measure before
> relying on any of them.

A first `BatchSummary`-shaped query was run against live data — 265 rows,
2025-01-09 → 2026-09-03. Columns returned: `PaymentDate`, `BatchId`,
`BatchKindId`/`BatchKind`, `BatchTypeId`/`BatchType`, `PaymentTotalCount`,
`AmountCollected`, `PendingPaymentCount`, `ProcessingPaymentCount`,
`FinalisedPaymentCount`, `DeclinedPaymentCount`,
`UnprocessedDeclinedPaymentCount`. Findings, all measured:

**1. Payload is ~6× smaller than §1 of DATA-REQUIREMENTS.md assumed.** Real batch
counts, not the mock's estimate:

| Window | Batch rows | Payments they cover |
|---|---|---|
| 7 days | 4 | 19 |
| 30 days | 15 | 29,735 |
| 90 days | 44 | 37,963 |
| 365 days | 152 | 120,443 |
| all (20 months) | 264 | 385,070 |

So one call carries **a full year** comfortably. Consequence:
**raise `FDConfig.historyDays` from 90 to 365.** At 90 the *90-day* range has no
"vs prior period" delta (that needs 180 days of history); at 365 every range gets
one, still in a single call. The payment counts also confirm the other half of the
argument — 30 days spans ~30k payments, so client-side aggregation was never viable.

**2. The grain is `(BatchId, PaymentDate)`, not one row per run.** 257 distinct
batches across 265 rows; 8 batches appear on two dates — sometimes adjacent
(3570: 24+25 Jun 2026), sometimes months apart (698: 30 Jan + 29 Sep 2025; 2024:
20 Aug + 29 Sep 2025). `PaymentDate` is therefore the *payment's* date, not the
run's. That breaks three things at once: one row per run in the list, `?BatchID=`
resolving to a single row, and the per-date group subtotals.
**Fix: group by `b.Id` and date the row with `b.RunDate`.** If the trend chart
must be payment-dated rather than run-dated, that is a separate 3-column dataset
(`PaymentDate`, collected value, declined value) — cheap — not a change to this
one's grain.

**3. The status buckets do not reconcile to the total.**
`Pending + Processing + Finalised + Declined ≠ PaymentTotalCount` on **40 of 265
rows (15%)**, and **24 rows have a non-zero total with every bucket at zero**
(e.g. batch 2405, 4 payments, all buckets `—`). In aggregate it is only 108
payments (0.03%), so no KPI is materially wrong — but a run card that reads
"4 payments" with nothing in any column reads as a bug. Those rows are the
statuses §2 marks *excluded* plus the ones still undecided (`Paid`, `Managed`,
`GatewayError`, `iMISError`).
**Fix: add explicit `OtherCount`/`OtherValue` and `ErrorCount`/`ErrorValue`** so
every payment lands in exactly one bucket and the row adds up. Errors must be
their own column, not folded into Other — see §6 of DATA-REQUIREMENTS.md.

**4. `AmountCollected` is the collected value only** — verified: there is not one
row of 265 where `AmountCollected > 0` disagrees with `FinalisedPaymentCount > 0`.
So the query has exactly **one** money column, and the four other value columns
the UI needs are absent.

**5. `FinalisedPaymentCount` is an ambiguous name — don't keep it.** "Finalised"
is already taken twice: it is the UI's *run-state* label (Generated → Processing →
Finalised) and it is `PaymentStatus` 7/97, which §2 lists as *not used / excluded*.
Whichever this column means, rename to `ClearedCount` (and split `Reconciled` out,
since the UI badges them separately).

**6. Three rows have `NULL` BatchKindId** — batches 620, 630, 636 — and they are
the three largest in the dataset (27,716 / 55,270 / 96,809 payments). The run
label is synthesised from Kind + Type (§3), so these would render an empty title.
Needs a fallback label *and* a question about why the biggest batches have no kind.

**7. One row is future-dated** (2026-09-03, batch 3779, 3 payments Pending) —
scheduled/future-dated payments are real. The client filters on `daysAgo`, so a
future run is silently dropped from every range. Decide: show them in the current
window, give them their own "Scheduled" group, or exclude them explicitly.

---

## 7. Open items — confirm before production

| # | Item | Impact if wrong |
|---|---|---|
| 1 | ~~`Payments.Processed` semantics~~ **CLOSED 3 Sep 2026: `Processed` has nothing to do with declines.** "Unprocessed" is defined solely by the invoice being open (`Status = 0`) with `Balance > 0`. `v1-payments.sql` uses that everywhere; **`fd-run.js` ~line 166 still counts `!t.processed` and is wrong** | was: `DeclinedUnprocessedCount` + retry buttons |
| 2 | ~~`TokenType 1` → `cc` or `dd`?~~ **CLOSED 3 Sep 2026: `cc`.** Split by instrument, so 1 + 11 = `cc`, 2 + 22 = `dd`. Affects only the payments-by-type chart; no total or bucket changes either way | was: payment-type chart/table split |
| 3 | ~~`PaymentStatus 15`/`16` → count as Declined?~~ **CLOSED 3 Sep 2026.** `15` **is** a decline (PSANZ payment importer status) and is counted. `16` is **not** counted — it falls to Other, where a non-zero `OtherCount` will surface it if it ever occurs | was: declined totals |
| 4 | ~~`Paid` (4) → own bucket vs Cleared?~~ **CLOSED 3 Sep 2026: same as Cleared.** 4 and 5 differ only by whether iMIS has been updated; this dashboard reads CloudToolz, so the distinction is irrelevant to it. No "Collected, not posted" bucket or card | was: on-screen collected revenue |
| 5 | Invoice `Closed` (1) = paid? or use `Balance <= 0`? | Awaiting-vs-Cleared split on invoice runs |
| 6 | ~~Member-name source~~ **CLOSED 3 Sep 2026: `ZenCRM.Individuals`.** `Payments.CrmId` = `ZenCRM.Individuals.ID`; name column is `FullName`. Use a **LEFT** join — an INNER would silently drop payments whose CrmId has no individual. Server-side member search is now possible | was: run-screen + declines member column |
| 7 | ~~Run label synthesis~~ **CLOSED 3 Sep 2026.** Type 1 → "Membership Dues — Daily Run" / "Autopay"; Type 0 → "Membership Dues — Other" / "Adhoc Payments". Note this is INVERTED vs the Lookup names — see §2 | was: run titles across both surfaces |
| 8 | ~~CloudToolz relay preserves multiple result sets?~~ **CLOSED 4 Sep 2026: YES.** Verified against a live `LoadData/PaymentBatch` Flow whose JS activity returns a composed object (`setVariable('Result', { Payments: …, Individuals: … })`) — both arrays arrived intact. Endpoint B bundles Q2+Q3+Q4 as **one composed object**; no `FOR JSON`, no separate calls. Same test: `CrmId` and `Individuals.Id` are JS numbers and `Amount` is a real number, so no numeric-as-string coercion for those. Q3's `TxnTotal` was switched `COUNT_BIG` → `COUNT(*)` the same day so it cannot come back as a bigint-as-string either | was: whether `GetRun` bundles in one call |
| 9 | ~~Trend dated by run date or payment date?~~ **CLOSED 3 Sep 2026: `Batch.RunDate`.** A bar means "a run happened that day", not "money moved that day". No second dataset needed — Q1 already carries it. Consequence: for the few batches whose payments span two dates (§6a.2), all their value lands on the run's date | was: one query vs one + a daily dataset |
| 10 | **PARKED 3 Sep 2026** — `NULL`-Kind batches (§6a.6) suspected to be old test data. Note §6a records the 27 Aug cut's date and row counts but **not which environment it ran against**, so those batch ids may not exist in the target env at all. `WHERE Kind = 2` excludes them either way; re-check against prod before go-live. The 24 all-buckets-zero rows (§6a.3) are addressed by the Other/Error columns | run cards that read as broken |
| 11 | **v2** — future-dated runs are **payment retries** scheduled ahead. v1 excludes them explicitly (`@ToDate` = tomorrow, exclusive) rather than relying on the client's `daysAgo` filter dropping them by accident. v2 should surface them, most likely as a "Scheduled" group in the runs list — and it pairs naturally with the retry queue, since `DeclinedUnprocessedCount` is what feeds those retries | v1: nothing; v2: scheduled retries invisible |

---

## 8. Three-domain model & phased build (decided 2026-09-02)

Working through the real payment/invoice/line structure with finance clarified that
the dashboard is not one dataset with a Kind column — it is **three structurally
different worlds**, each with its own tables, lifecycle and buckets. They are built
as **three separate query sets, phased**, not one query filtered three ways.

### The three worlds

| Query set | Batch `Kind` | Primary table | Lifecycle | Phase |
|---|---|---|---|---|
| **Traditional payments** | 2 | `Payments` | Invoices are raised *and* charged in one process (direct debit / auto credit card). Gateway returns success/decline in-process. **A decline reopens the corresponding invoice** (Status → 0) to mark the amount still owed. | **v1** |
| **Invoice / account payers** | 1 | `Invoices` | Invoices raised on a set date (e.g. first of a quarter); the member then pays *at their leisure* via EFT / BPAY / CC. | v2 |
| **PRD — Payroll Deduction** | 3, 4 | load + reconcile | Employer/workplace remits on the member's behalf, pre-tax, direct from salary. Advice arrives **well after the fact**, so this is a load-the-advice-then-reconcile flow, not a charge flow. | v3 |

This supersedes earlier drafts that lumped Kind 4 with Kind 2 and carried
`Reconciled` into the payment world. **Reconciled is a PRD/matching concept — it
does not occur in Kind 2.** BPAY/EFT are invoice-payer methods (v2), not Kind 2.

### v1 scope — traditional payments only (Kind 2)

- **Buckets (4 + Error):** `Pending` (New, not yet sent), `Processing` (Submitted /
  Processing / DD settling), `Cleared` (bank said yes), `Declined` (bank said no),
  plus `Error`/`Other` so every payment lands somewhere and the row sums to its
  total (the §6a.3 15%-don't-reconcile finding). **No `Reconciled`, no `Awaiting
  payment` in v1.**
- **Method types:** realistically only `dd` and `cc` — Kind 2 is direct debit +
  auto credit card. bpay/eft/inv/pd belong to v2/v3.
- **Tables:** `Payments` grouped by `BatchId` for every bucket + method + value +
  total; `Batch` (`WHERE Kind = 2`) for identity/date/label/time. **No invoice
  table in v1** except the one seam below.
- **Query 1 (summary):** one row per Kind-2 batch. **Query 2 (transactions):**
  `Payments` rows for one batch.

### The invoice/line structure (drives the aggregation rules)

```
Invoice        owed amount raised per member (has Status + original & current Balance)
 └─ InvoiceLines   what the owed amount is made of (dues, insurance, …)
Payment        a payment generated/attempted per member (has Amount, Status, TokenType)
 └─ PaymentLines   what a payment is made of

Payment  →  PaymentLines.PaymentId = Payments.ID
PaymentLines → Invoice      via PaymentLines.InvoiceId = Invoice.ID
PaymentLines → InvoiceLine  via PaymentLines.InvoiceLineId = InvoiceLine.ID
```

**Payments do NOT link directly to invoices — only through the line tables, and it
is many-to-many.** One payment can settle several invoices (worked example: a single
$50 CC payment clears a current dues invoice *and* a previously-declined invoice,
$25 + $25, across 4 payment lines).

**Aggregation rules that fall out of this:**

1. **Aggregate at parent grain.** Payment outcomes, collected value and method split
   come straight off `Payments` grouped by `BatchId` — no line join. `Payments.Amount`
   is the payment total; the lines sum to it.
2. **Never `SUM(Payments.Amount)` across a join to the line/invoice tables** — the
   fan-out repeats the parent value once per line (the $50 payment would read $200).
   If you ever aggregate at line grain, sum the *child* (`PaymentLines.Amount`), which
   partitions the parent and ties back out. (This is what makes a future dues-vs-
   insurance *area* split safe — but it needs the lines, so it's deferred to v2+.)
3. **Only cross to the line tables for "still owed".** The one place the payment world
   must read invoices is the retry/unprocessed calc — collapse back to payment grain
   with `GROUP BY PaymentID` (or `EXISTS`) so a multi-invoice payment counts once.

### Invoice status enum (authoritative, from finance)

Stored as `int` with a description in `UnionTemplate.Lookup`. **Key all bucket logic
on the int, never the description string** (int is the contract; text is display).
The lookup does *not* give you the bucket — the six dashboard buckets are a further
collapse the app owns in its `CASE`.

| `Invoices.Status` | Meaning | Also carries |
|---|---|---|
| 0 | Open — unpaid | original balance + **current balance** |
| 1 | Closed — paid | |
| 2 | Cancelled — no longer required | |
| 3 | Processing — payments submitted, awaiting response | |
| 4 | Handled — payment scheduled for a future date | |

There is **no dedicated "declined" invoice status** — a declined payment reopens its
invoice to **Status 0**. So a "declined, still owed" invoice and a brand-new unpaid
one are the same status.

Invoices carry **original/total balance** and **current balance** — use current
balance for anything that means "still owed" (handles partial payments): a $50
invoice with $30 paid owes $20, not $50.

### Status 4 (Handled) is dual-lens — deliberately different columns

The same int lands in different places depending on the question:

- **Retry tracker (`DeclinedUnprocessedCount`) — Status 4 is EXCLUDED.** A declined
  payment counts as "needs action" only while its invoice is Status **0** (open,
  un-actioned). Once the decline is rescheduled the invoice moves to 4 (Handled =
  *the decline has been actioned*), so it leaves the retry queue. It also leaves when
  the invoice is paid (→ 1). Filter: `Invoice.Status = 0 AND current balance > 0`.
- **Awaiting payment bucket (v2) — Status 4 is INCLUDED.** From the invoice's own
  lens the money is still owed, just scheduled: `Status IN (0, 4)`, value =
  `SUM(current balance)`.

No contradiction — "what needs a human to act?" vs "what money is still owed?".

### v1 build seam — stub the still-owed refinement

Because the still-owed check reaches the invoice table, and v2 owns invoices, **v1
stubs it**: return the raw declined count off `Payments` alone; wire the invoice-reopen
(`Status 0 AND balance > 0`) precision in when the invoice query set is built. Keeps v1
strictly `Payments` + `Batch`, Kind 2.

### Delivery method (decided this session)

- Data arrives via a **single anonymous published CloudToolz Flow GET** (not the
  ReportBuilder POST/generic-proc contract). We control the response shape by writing
  the underlying SQL, so the Flow returns purpose-shaped JSON.
- If Query 1's JSON is shaped so each run carries a `stats` object matching
  `fd-core.js` → `runStats` (keys: `count, okCount/okValue, procCount/procValue,
  pendCount/pendValue, waitCount/waitValue, badCount/badValue, badUnprocessed,
  totalValue`) plus `maxProcessingDays` and a per-type breakdown, then `runStats()`
  short-circuits and the list/trend/state-pill/review-chip need **no JS change**. The
  only edits left are the four renderers that read `run.txns` directly
  (`REVIEW-2026-07.md` #1) — repoint them at `run.stats` / the per-type columns.
- Access control is **iMIS page permissions** (finance role), not the anonymous Flow —
  see `DATA-REQUIREMENTS.md` §9.

---

## Cross-references

- `DATA-REQUIREMENTS.md` — logical datasets, call plan, status-mapping rationale, ZenToken findings
- `Claude/ReportBuilder/docs/CLOUDTOOLZ-INTEGRATION.md` — the relay auth + response handling being reused
- `Payment runs.docx` — source status/kind/type semantics (names; codes are in §2 above)
- `fd-core.js` → `runStats` / `runState` — the client-side shape these views must match
