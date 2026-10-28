/* =====================================================================
   Finance Dashboard — v1 SQL  (traditional payments, Batch.Kind = 2)
   ---------------------------------------------------------------------
   Q1  Summary       — one row per Kind-2 batch   (run list, KPIs, trend,
                        run-detail header)
   Q2  Transactions  — payment rows for one batch (run-detail table)
   Q3  Txn count     — pager total for one batch

   Schema: UnionTemplate.  Database: CloudToolz_anmfvicA_Prod.

   ---------------------------------------------------------------------
   TUNED 2026-09-03 after an actual execution plan (v1 took 25s / 19.2s
   engine time for 1178 rows over 2026-01-01 → now).  See PERF notes at
   the bottom of this file for the measurements the rewrite is based on.

   The whole query is CPU-bound at MAXDOP 1 (CpuTime 19,247ms vs
   ElapsedTime 19,253ms; zero physical reads — it is all in the buffer
   pool).  86% of that was ONE operator: the hash aggregate, re-evaluating
   a 5-deep nested *string* CASE eighteen times per row across 1.2M rows.
   The fix is to aggregate twice: collapse to (BatchId, Status, TokenType)
   first, then pivot the handful of rows that survive.
   ---------------------------------------------------------------------

   Corrections from the 27-Aug live cut still apply (SQL-DATASETS.md §6a):
     · grain is one row per BatchId, dated by Batch.RunDate  (§6a.2)
     · 365-day window, not 90                                 (§6a.1)
     · every payment lands in exactly one bucket + Error/Other so the row
       sums to its total                                      (§6a.3)

   Column provenance: the execution plan CONFIRMS every column this file
   uses, including the ones previously marked "from docs, verify before
   prod" — Payments.CrmId(3)/TokenType(9)/ChargeDate(10)/Status(15)/
   Processed(16)/ResponseCode(20)/Amount(24)/Reference(27)/BatchId(29)/
   ResponseMessage(39), Batch.RunDate/CreatedDate/Kind/Type/Status,
   Invoices.Balance(24)/Status(27), PaymentLines.PaymentId/InvoiceId.
   Payments.ChargeDate is datetimeoffset (the plan shows an implicit
   convert to datetimeoffset(7)).  The only unconfirmed thing left is the
   contact table behind CrmId (OPEN #6).

   Open items flagged inline as  -- OPEN #n  (SQL-DATASETS.md §7).
   ===================================================================== */


/* =====================================================================
   INDEXES — run once.  Q2 and Q3 CANNOT be fixed by rewriting; they each
   scan all 2.16M rows of Payments to return 9, because there is no index
   on Payments.BatchId at all.  The plan asks for one with 96% and 99.98%
   estimated impact.

   This is a CloudToolz-managed database, so get their sign-off before
   creating it (and check it survives their upgrades).  Q1's rewrite below
   does NOT depend on it — do the rewrite first, it needs no DDL.

   One index serves all three queries: the key order also removes Q2's
   sort (and with it Q2's 39MB memory grant for a 9-row result).
   ===================================================================== */
/*
CREATE NONCLUSTERED INDEX IX_Payments_Batch_Charge
    ON UnionTemplate.Payments (BatchId, ChargeDate DESC, Id DESC)
    INCLUDE (Status, TokenType, Amount);
-- ~2.16M rows × ~40 bytes ≈ 90MB.

-- Batch statistics were last updated 2026-05-28 with 621 modifications
-- against 2,772 rows (22% churn), which is part of why Q1 estimated
-- 36 output rows and got 1,178:
UPDATE STATISTICS UnionTemplate.Batch;
*/


/* =====================================================================
   Q1 — SUMMARY  (one row per Kind-2 batch)

   Written as ONE statement so it can go straight into a CloudToolz Flow.
   The inner GROUP BY is an optimiser barrier — SQL Server will not fold
   it into the outer aggregate — so the two-stage collapse is guaranteed
   without temp tables.  (If you ever need to force it harder, the temp
   table variant is at the bottom of this file.)
   ===================================================================== */
DECLARE @FromDate date             = DATEADD(day, -365, CAST(SYSUTCDATETIME() AS date));  -- §6a.1
/* @ToDate is EXCLUSIVE. Default = tomorrow, so today is in and future-dated
   runs are out. Those are payment RETRIES scheduled ahead; showing them is a
   v2 task (open item #11). Excluding them here is deliberate — previously they
   were returned by SQL and then silently dropped by the client's daysAgo
   filter, which looked identical but was an accident. The Flow should pass the
   same value; pass '9999-12-31' to see scheduled retries. */
DECLARE @ToDate   date             = DATEADD(day, 1, CAST(SYSUTCDATETIME() AS date));
DECLARE @Now      datetimeoffset(7) = SYSUTCDATETIME();  -- typed once; avoids a per-row convert

SELECT
    b.Id                          AS BatchId,
    b.RunDate,
    CONVERT(time, b.CreatedDate)  AS RunTime,
    b.Status                      AS BatchStatusRaw,
    b.Type                        AS BatchTypeId,
    /* Run label + sub-line — Batch has NO Name and NO Description column, so
       both are synthesised from b.Type.  Wording confirmed by finance
       3 Sep 2026 (was OPEN #7).

       ⚠ THE NAMES ARE INVERTED RELATIVE TO THE LOOKUP TABLE — do not "fix"
         this.  UnionTemplate.Lookup calls Type 0 "Daily", but its own
         description is "adhoc payments"; Type 1 is "Bulk" = "Auto generated
         runs".  The business calls the AUTOMATED one the "Daily Run", so:

           Type 1  (Lookup "Bulk")   → "Daily Run" / Autopay
           Type 0  (Lookup "Daily")  → "Other"     / Adhoc Payments

         Confirmed against live rows: a Type 1 batch held 13,801 payments
         (automated), a Type 0 batch held 11 (adhoc).                      */
    CASE b.Type
        WHEN 1 THEN 'Membership Dues — Daily Run'
        WHEN 0 THEN 'Membership Dues — Other'
        ELSE        'Membership Dues'
    END                           AS BatchName,
    CASE b.Type
        WHEN 1 THEN 'Autopay'
        WHEN 0 THEN 'Adhoc Payments'
        ELSE        ''
    END                           AS BatchDescription,

    SUM(a.Cnt)                    AS TotalCount,
    SUM(a.Val)                    AS TotalValue,

    /* ---- status buckets: count + value -------------------------------
       Tested against the raw int, never against a derived label.  ISNULL
       guards a NULL Status so it still lands in Other and the row sums.

       The `_Unsynced` twins (91/93/94/95/96/98/99/910) are GONE: confirmed
       3 Sep 2026 that they are not used.  If one ever does appear it now
       falls into Other rather than being silently absorbed into a real
       bucket — i.e. Other is the canary, which is what §4's audit note
       asked for.  Watch OtherCount.                                      */
    SUM(CASE WHEN a.Status = 1          THEN a.Cnt ELSE 0 END) AS PendingCount,
    SUM(CASE WHEN a.Status = 1          THEN a.Val ELSE 0 END) AS PendingValue,
    SUM(CASE WHEN a.Status IN (3,10)    THEN a.Cnt ELSE 0 END) AS ProcessingCount,
    SUM(CASE WHEN a.Status IN (3,10)    THEN a.Val ELSE 0 END) AS ProcessingValue,
    SUM(CASE WHEN a.Status IN (4,5)     THEN a.Cnt ELSE 0 END) AS ClearedCount,     -- 4+5 both Cleared: 4/5 differ only by iMIS sync state, irrelevant here
    SUM(CASE WHEN a.Status IN (4,5)     THEN a.Val ELSE 0 END) AS ClearedValue,
    SUM(CASE WHEN a.Status IN (6,15) THEN a.Cnt ELSE 0 END) AS DeclinedCount,    -- 15 = PSANZ payment importer decline
    SUM(CASE WHEN a.Status IN (6,15) THEN a.Val ELSE 0 END) AS DeclinedValue,
    SUM(CASE WHEN a.Status IN (8,9)     THEN a.Cnt ELSE 0 END) AS ErrorCount,
    SUM(CASE WHEN a.Status IN (8,9)     THEN a.Val ELSE 0 END) AS ErrorValue,
    SUM(CASE WHEN ISNULL(a.Status,-1) NOT IN (1,3,10,4,5,6,15,8,9)
                                        THEN a.Cnt ELSE 0 END) AS OtherCount,
    SUM(CASE WHEN ISNULL(a.Status,-1) NOT IN (1,3,10,4,5,6,15,8,9)
                                        THEN a.Val ELSE 0 END) AS OtherValue,

    /* ---- method split (v1 = dd + cc, plus a catch-all) --------------- */
    SUM(CASE WHEN a.TokenType IN (22,2)  THEN a.Cnt ELSE 0 END) AS DDCount,
    SUM(CASE WHEN a.TokenType IN (22,2)  THEN a.Val ELSE 0 END) AS DDValue,
    SUM(CASE WHEN a.TokenType IN (11,1)  THEN a.Cnt ELSE 0 END) AS CCCount,   -- 1 + 11 = cc (split by instrument)
    SUM(CASE WHEN a.TokenType IN (11,1)  THEN a.Val ELSE 0 END) AS CCValue,
    SUM(CASE WHEN ISNULL(a.TokenType,-1) NOT IN (22,2,11,1)
                                         THEN a.Cnt ELSE 0 END) AS OtherMethodCount,
    SUM(CASE WHEN ISNULL(a.TokenType,-1) NOT IN (22,2,11,1)
                                         THEN a.Val ELSE 0 END) AS OtherMethodValue,

    /* ---- actions + review -------------------------------------------
       DATEDIFF runs ONCE per batch here, over the oldest still-processing
       charge date, instead of 1.2M times inside the aggregate.           */
    ISNULL(rt.DeclinedUnprocessedCount, 0) AS DeclinedUnprocessedCount,
    DATEDIFF(day,
             MIN(CASE WHEN a.Status IN (3,10) THEN a.FirstCharge END),
             @Now)                         AS MaxProcessingDays

FROM (
    /* ---- STAGE 1: collapse 1.2M payments to ~one row per
       (batch × status × method).  This is the whole optimisation: every
       CASE above now runs over a few thousand rows, not 1.2 million.  --- */
    SELECT
        p.BatchId,
        p.Status,
        p.TokenType,
        COUNT_BIG(*)      AS Cnt,
        SUM(p.Amount)     AS Val,
        MIN(p.ChargeDate) AS FirstCharge
    FROM UnionTemplate.Payments p
    JOIN UnionTemplate.Batch    bs ON bs.Id = p.BatchId
    WHERE bs.Kind = 2                  -- traditional payments (NULL-Kind batches excluded, OPEN #10)
      AND bs.RunDate >= @FromDate      -- window on the RUN date, not the payment date (§6a.2)
      AND bs.RunDate <  @ToDate
    GROUP BY p.BatchId, p.Status, p.TokenType
) a

JOIN UnionTemplate.Batch b ON b.Id = a.BatchId

LEFT JOIN (
    /* ---- The one invoice seam (SQL-DATASETS.md §8 "v1 build seam").
       A decline needs action only while its invoice is still open with a
       balance.  Rewritten as EXISTS driven FROM the declined payments:
       payment → PaymentLines seek (IX_UT_PaymentLines_PaymentId_InvoiceId)
       → Invoices PK seek.  All seeks over ~2k declines.

       The v1 draft had this as a CTE, which the optimiser inverted: it
       scanned all 3,414,762 rows of Invoices looking for Status=0 first,
       then joined outward.  EXISTS also removes the need for a DISTINCT
       to collapse the payment↔invoice many-to-many.

       DROP this whole subquery (and the ISNULL above) to keep v1 strictly
       Payments + Batch; the count then means "declined" rather than
       "declined and still owed".                                        */
    SELECT p.BatchId, COUNT_BIG(*) AS DeclinedUnprocessedCount
    FROM UnionTemplate.Payments p
    JOIN UnionTemplate.Batch    br ON br.Id = p.BatchId
    WHERE br.Kind = 2
      AND br.RunDate >= @FromDate
      AND br.RunDate <  @ToDate
      AND p.Status IN (6,15)
      AND EXISTS (
            SELECT 1
            FROM UnionTemplate.PaymentLines pl
            JOIN UnionTemplate.Invoices     i ON i.Id = pl.InvoiceId
            WHERE pl.PaymentId = p.Id
              AND i.Status  = 0            -- reopened / never paid
              AND i.Balance > 0)           -- still owed (OPEN #5)
    GROUP BY p.BatchId
) rt ON rt.BatchId = a.BatchId

/* Inner join to Batch, so a run with NO payments at all does not appear.
   That matches the pre-rewrite behaviour — flagging it because it is
   adjacent to OPEN #10 (the batches whose buckets are all zero). Switch
   to `FROM Batch b LEFT JOIN (stage1) a` if finance wants empty runs
   listed; every SUM then needs an ISNULL.                              */
GROUP BY b.Id, b.RunDate, b.CreatedDate, b.Status, b.Type, rt.DeclinedUnprocessedCount
ORDER BY b.RunDate DESC, b.Id DESC;

GO

/* =====================================================================
   Q2 — TRANSACTIONS  (payment rows for one run)

   Unchanged in shape — it is already minimal.  It is slow purely for want
   of the index above: 2,163,359 rows read, 120,926 logical reads, 550ms,
   to return 9 rows.  With IX_Payments_Batch_Charge this becomes a seek
   plus a 100-row range scan and ~100 key lookups, and the ORDER BY is
   satisfied by the index (no sort, no memory grant).
   ===================================================================== */
DECLARE @BatchId int = 0;     -- the run  (?BatchID=)
DECLARE @Offset  int = 0;     -- paging: page N -> N * @Fetch
DECLARE @Fetch   int = 100;
DECLARE @Bucket  varchar(20)  = NULL;   -- status chip: Pending/Processing/Cleared/Declined/Error/Other
DECLARE @Search  nvarchar(200) = NULL;  -- free text: reference, member id, member name
DECLARE @PaymentType varchar(10) = NULL; -- type chip: cc / dd / other  (added 16 Oct 2026)
DECLARE @Now     datetimeoffset(7) = SYSUTCDATETIME();   -- own copy: separate batch from Q1

/* The Flow passes parameters as STRINGS. OFFSET/FETCH reject anything but an
   integer type (msg 1054), so cast once here rather than relying on implicit
   conversion — which also keeps the BatchId predicate sargable. */
DECLARE @BatchIdInt int = CAST(@BatchId AS int);
DECLARE @OffsetInt  int = CAST(@Offset  AS int);
DECLARE @FetchInt   int = CAST(@Fetch   AS int);

/* Normalise the two filters ONCE, so the predicates below stay readable.
   - blank/whitespace and the literal 'all' both mean "no filter"
   - LIKE wildcards in user input are escaped via character classes, or a
     member searching for "50%" matches every row instead of none. Order
     matters: '[' must be escaped before '%' and '_'. */
DECLARE @BucketFilter varchar(20) = NULLIF(NULLIF(LTRIM(RTRIM(@Bucket)), ''), 'all');
DECLARE @TypeFilter   varchar(10) = NULLIF(NULLIF(LTRIM(RTRIM(@PaymentType)), ''), 'all');
DECLARE @SearchLike nvarchar(400) =
    CASE WHEN NULLIF(LTRIM(RTRIM(@Search)), '') IS NULL THEN NULL
         ELSE '%' + REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(@Search)),
                    '[', '[[]'), '%', '[%]'), '_', '[_]') + '%'
    END;

SELECT
    p.Id                  AS SortKey,      -- unique -> last in ORDER BY, stable OFFSET/FETCH
    /* The pager total, computed over the FILTERED set before OFFSET/FETCH.
       This is why Q3 is gone (see below): a separate COUNT query would have to
       repeat these predicates verbatim, and the day the two drift the pager
       says "1 of 139 pages" over three rows. Same value on every row; an int
       x 100 rows is nothing next to the risk. Zero rows returns zero rows, and
       the client reads the total as 0 — which is correct. */
    COUNT(*) OVER ()      AS TxnTotal,
    p.Reference           AS PaymentRef,
    p.CrmId               AS PartyId,     -- internal CRM key (join key, not for display)
    i.ImisId              AS MemberId,    -- the member number shown in the UI's "Member ID" column
    i.FullName            AS MemberName,
    p.Amount,
    p.Status              AS StatusRaw,
    CASE
        WHEN p.Status = 1              THEN 'Pending'
        WHEN p.Status IN (3, 10)       THEN 'Processing'
        WHEN p.Status IN (4, 5)        THEN 'Cleared'
        WHEN p.Status IN (6, 15)   THEN 'Declined'
        WHEN p.Status IN (8, 9)        THEN 'Error'
        ELSE 'Other'
    END                   AS StatusBucket,
    CASE
        WHEN p.TokenType IN (11, 1) THEN 'cc'
        WHEN p.TokenType IN (22, 2) THEN 'dd'
        ELSE 'other'
    END                   AS PaymentType,
    p.ResponseMessage     AS DeclineReason,
    p.ResponseCode        AS DeclineCode,
    /* Per-row "still needs action": the invoice this payment was paying is
       still open with a balance.  Replaces the old `p.Processed AS IsRetried`
       — Processed has nothing to do with declines (confirmed 3 Sep 2026), so
       exposing it under that alias was wrong.  Lets fd-run.js compute the
       reasons panel's Unproc. column from rows it already has, consistent
       with Q4 and with Q1's run-list badge.                                */
    CASE WHEN EXISTS (
            SELECT 1
            FROM UnionTemplate.PaymentLines pl
            INNER JOIN UnionTemplate.Invoices inv
                ON inv.Id = pl.InvoiceId
            WHERE pl.PaymentId = p.Id
              AND inv.Status  = 0
              AND inv.Balance > 0)
         THEN 1 ELSE 0 END AS StillOwed,   -- `inv`, not `i`: `i` is Individuals below
    CASE WHEN p.Status IN (3, 10)
         THEN DATEDIFF(day, p.ChargeDate, @Now) END AS ProcessingDays,
    p.ChargeDate
FROM UnionTemplate.Payments p
/* Member name (open item #6, resolved 3 Sep 2026): CrmId -> ZenCRM.Individuals.ID.
   LEFT, deliberately — an INNER JOIN would silently DROP any payment whose
   CrmId has no matching individual (orphaned ids, or non-individual payers),
   making transactions disappear from a run rather than showing a blank name. */
LEFT JOIN ZenCRM.Individuals i
    ON i.ID = p.CrmId
WHERE p.BatchId = @BatchIdInt
  /* Status chip. Tested against the raw int, never against the StatusBucket
     CASE in the select list — comparing to a computed expression is not
     sargable and would throw away the index the moment it exists. The bucket
     definitions here MUST match that CASE; they are the same status lists Q1
     and Q5 use.

     'Awaiting payment' deliberately matches nothing: that is the invoice
     world (Batch.Kind 1), which is v2, so the chip correctly returns an empty
     table rather than an error. */
  AND (@BucketFilter IS NULL
       OR (@BucketFilter = 'Pending'    AND p.Status = 1)
       OR (@BucketFilter = 'Processing' AND p.Status IN (3, 10))
       OR (@BucketFilter = 'Cleared'    AND p.Status IN (4, 5))
       OR (@BucketFilter = 'Declined'   AND p.Status IN (6, 15))
       OR (@BucketFilter = 'Error'      AND p.Status IN (8, 9))
       OR (@BucketFilter = 'Other'      AND ISNULL(p.Status, -1) NOT IN (1,3,10,4,5,6,15,8,9)))
  /* Payment-type chip. Same rule as the status chip: test the raw TokenType,
     never the PaymentType CASE in the select list, and keep these lists in
     step with that CASE (and with Q1's DD/CC split). */
  AND (@TypeFilter IS NULL
       OR (@TypeFilter = 'cc'    AND p.TokenType IN (11, 1))
       OR (@TypeFilter = 'dd'    AND p.TokenType IN (22, 2))
       OR (@TypeFilter = 'other' AND ISNULL(p.TokenType, -1) NOT IN (22, 2, 11, 1)))
  /* Free text, matching what the old client-side filter searched: reference,
     member id, member name. A leading-% LIKE cannot seek, so this is a scan
     over the batch's rows even once IX_Payments_Batch_Charge exists — it stays
     bounded to one batch, which is what makes that acceptable. FullName and
     ImisId come from the LEFT JOIN, so a payment with no matching individual
     simply will not match a name search. */
  AND (@SearchLike IS NULL
       OR p.Reference LIKE @SearchLike
       OR i.ImisId    LIKE @SearchLike
       OR i.FullName  LIKE @SearchLike)
ORDER BY p.ChargeDate DESC, p.Id DESC
OFFSET @OffsetInt ROWS FETCH NEXT @FetchInt ROWS ONLY;

/* =====================================================================
   Q3 — SUPERSEDED 4 Sep 2026.  DO NOT RE-ADD.

   Q2 now returns the pager total itself as `COUNT(*) OVER () AS TxnTotal`,
   computed over the filtered set before OFFSET/FETCH.

   Q3 was a second full scan of the same 2.16M rows (820ms measured) that
   produced a number Q2 already had.  Once the filter chips landed it became
   actively dangerous: to stay correct it would have to repeat Q2's @Bucket
   and @Search predicates verbatim, in a different activity, and the first
   time the two drifted the pager would report "139 pages" over a filtered
   list of three rows — with nothing to indicate anything was wrong.

   FLOW: delete the ZenQL_TransactionCount activity.  The endpoint's
   `TransactionCount` set can go with it; fd-data.js reads TxnTotal off the
   first transaction row and only falls back to `TransactionCount` for
   compatibility with a Flow that has not been updated yet.

   Kept here as a tombstone because "there is no count query" is surprising
   enough that someone will otherwise write one again.
   ===================================================================== */


/* =====================================================================
   Q4 — DECLINE REASONS for ONE run   (batch details page, v1)

   Feeds the "Decline reasons" panel in fd-run.js (~line 226): one row per
   reason with count, value and an unprocessed count.  Batch-scoped, so it
   belongs to v1 — the WINDOWED version of this same query (across every
   run in a date range) is the v2 declines dashboard, in v2-declines.sql.

   "Unprocessed" = the decline's invoice is STILL OPEN WITH A BALANCE.
   Same definition as Q1's DeclinedUnprocessedCount, so the run-list badge
   and this panel always agree.

   ⚠ fd-run.js IS WRONG HERE and needs fixing (~line 166): it counts
     `if (!t.processed)` — the Payments.Processed column.  Confirmed
     3 Sep 2026 that Processed has NOTHING TO DO WITH DECLINES, so that
     column is meaningless in this context and the "Unproc." figure on the
     run detail page is currently wrong.  Feed it UnprocessedCount from
     here (or StillOwed per row from Q2) instead.

   ⚠ Soft/hard is NOT returned.  fd-run.js classifies client-side via
     declineKind(reason), keyed on DISPLAY TEXT, defaulting unknown reasons
     to retryable — which decides what a retry batch contains. Moving that
     to a finance-supplied ReasonCode map is tracked in SQL-DATASETS.md §6.
   ===================================================================== */
/* The CTE is not decoration — SQL Server rejects a correlated subquery inside
   an aggregate ("Cannot perform an aggregate function on an expression
   containing an aggregate or a subquery", msg 130), so SUM(CASE WHEN EXISTS
   (...)) will not compile.  Flag each declined payment first, aggregate second.
   Two bonuses: the Reason expression is written once instead of being repeated
   verbatim in the GROUP BY, and StillOwed is the same expression and name Q2
   returns per row, so the panel and the table agree by construction.       */
WITH Declines AS (
    SELECT
        /* REPLACE strips the payment token out of the message.  Gateway
           messages embed Payments.Token verbatim — e.g. "Declined Invalid
           Cash Account ID for token : nlcb9aqocwivlk67fy4j" — so without this
           the panel gets one row PER TOKEN instead of one per reason, and a
           live CC/DD gateway token is rendered on screen.  Measured on batch
           3837 (4 Sep 2026): 3 such declines fragmented into 2 reason rows.

           REPLACE returns NULL if Token is NULL, which would destroy the
           reason rather than trim it.  Verified safe on the same batch:
           12,628 declines, 0 with a NULL Token — a decline implies a payment
           method, so there is always a token to strip.                    */
        ISNULL(NULLIF(LTRIM(RTRIM(
            REPLACE(p.ResponseMessage, p.Token, '')
        )), ''), '(no reason given)') AS Reason,
        p.ResponseCode,
        p.Amount,
        CASE WHEN EXISTS (
                SELECT 1
                FROM UnionTemplate.PaymentLines pl
                INNER JOIN UnionTemplate.Invoices inv
                    ON inv.Id = pl.InvoiceId
                WHERE pl.PaymentId = p.Id
                  AND inv.Status  = 0
                  AND inv.Balance > 0
             ) THEN 1 ELSE 0 END AS StillOwed
    FROM UnionTemplate.Payments p
    WHERE p.BatchId = @BatchId
      AND p.Status IN (6, 15)
)
SELECT
    Reason,
    ResponseCode          AS ReasonCode,
    COUNT(*)              AS DeclineCount,   -- int, not COUNT_BIG: see Q3's note
    SUM(Amount)           AS DeclineValue,
    SUM(StillOwed)        AS UnprocessedCount
FROM Declines
GROUP BY Reason, ResponseCode
ORDER BY DeclineCount DESC;


/* =====================================================================
   PERF NOTES — where the 19.2s actually went (from the 2026-09-03 plan)
   ---------------------------------------------------------------------
   Row-mode ActualElapsedms is cumulative, so each operator's own cost is
   its elapsed minus its children's:

     node  operator                                    own time
     ----  ------------------------------------------  --------
     3     Hash Match (aggregate)                       16,614ms   ← 86%
     4     Hash Match (right outer join, retry CTE)        510ms
     20    Hash Match (Batch → Payments)                   450ms
     25    Clustered Index Scan, Payments (2,163,359)    1,027ms
     16    Clustered Index Scan, Invoices (3,414,762)      597ms
     1     Sort (1,178 rows)                                 5ms

   Three separate faults, in order of size:

   1. THE STRING BUCKETS (16.6s).  `Bucket` and `Method` were derived in a
      CTE as strings.  CTEs are not materialised, so the optimiser inlined
      them — the ComputeScalar at node 24 defines Expr1040..Expr1057, and
      every one of those eighteen expressions re-derives the ENTIRE 5-deep
      nested CASE and then does a collation-aware string compare
      ('Pending' = 'Pending').  Over 1,200,444 rows that is roughly 20M
      nested CASE evaluations and 100M+ string comparisons, single-
      threaded.  Fixed by (a) aggregating to (BatchId, Status, TokenType)
      first so the pivot sees a few thousand rows, and (b) testing the raw
      int, so no string ever appears in a comparison.

   2. THE RETRY CTE INVERTED ITS JOIN ORDER (1.1s + a second evaluation of
      the whole PaymentRow CTE — note Payments appears three times in the
      plan with TableReferenceId 1/2/3, and Batch three times).  The
      optimiser started from every open invoice in the database
      (3,414,762 rows scanned → 5,009 matches) and joined outward, rather
      than starting from the ~2,000 declined payments in the window.
      Fixed by driving from the declined payments with EXISTS, and by
      aggregating the result to one row per batch BEFORE joining, instead
      of a LEFT JOIN at payment grain across 1.2M rows.

   3. NO INDEX ON Payments.BatchId.  Costs Q1 about a second and makes
      Q2/Q3 impossible to fix any other way.

   EQUIVALENCE OF THE ONE REWRITTEN AGGREGATE.  MaxProcessingDays went
   from MAX(DATEDIFF(day, ChargeDate, now)) per row to
   DATEDIFF(day, MIN(ChargeDate), now) per batch.  These are exactly
   equal, not approximately: DATEDIFF(day, c, N) decreases monotonically
   as c increases, so its maximum is always reached at the smallest c.

   PRE-EXISTING, NOT INTRODUCED HERE: ChargeDate is datetimeoffset and
   @Now is UTC (+00:00), which is precisely what the old query did — the
   plan shows it implicitly converting SYSUTCDATETIME() to
   datetimeoffset(7) per row.  But if ChargeDate is stored with a local
   offset (+10:00/+11:00), a day-granularity DATEDIFF against a UTC "now"
   can land a day out at the boundary, which would move the "needs
   review" chip.  Worth checking what offset the rows actually carry.

   Also worth knowing:
     · MAXDOP is 1 (`NonParallelPlanReason="MaxDOPSetToOne"`), so there is
       no parallelism to fall back on — CPU work has to actually shrink.
     · Zero physical reads: this is not an IO problem, and it will not be
       fixed by more memory.
     · Q1's final estimate was 36.5 rows against 1,178 actual, and node 4
       estimated 428,698 against 1,200,444 — a knock-on of the CTE
       double-evaluation plus stale Batch statistics.

   EXPECTED RESULT: the rewrite should remove the 16.6s aggregate almost
   entirely, leaving a plain 3-column hash aggregate over the same 1.2M
   rows (~1s at MAXDOP 1) plus the scan.  Low single-digit seconds,
   without any DDL; the index takes another ~1s off.  MEASURE IT — and
   diff Q1's output against the pre-rewrite version row by row before
   trusting the numbers, since the bucket logic was retyped.

   IF THAT IS STILL TOO SLOW, the next step is an indexed view over stage
   1 — SQL Server would then maintain the (BatchId, Status, TokenType)
   aggregate on write and the dashboard would read a few thousand rows:

     CREATE VIEW UnionTemplate.vw_HubFinance_PaymentAgg WITH SCHEMABINDING AS
     SELECT BatchId, Status, TokenType, COUNT_BIG(*) AS Cnt, SUM(Amount) AS Val
     FROM UnionTemplate.Payments GROUP BY BatchId, Status, TokenType;
     CREATE UNIQUE CLUSTERED INDEX ... ON ... (BatchId, Status, TokenType);

   Caveat: MIN() is not allowed in an indexed view, so MaxProcessingDays
   would need its own small query — but it only touches Processing-status
   rows, which are few.  This adds write overhead to a vendor-managed
   table, so it is a last resort, not a first move.

   TEMP TABLE VARIANT: if the single-statement form ever regresses (a plan
   change, a different parameter sniff), split stage 1 into `SELECT ...
   INTO #Agg`, index it on BatchId, and join to it.  Temp tables get real
   statistics and remove any chance of the optimiser re-inlining, at the
   cost of needing a multi-statement batch or a stored proc behind the
   Flow.
   ===================================================================== */
