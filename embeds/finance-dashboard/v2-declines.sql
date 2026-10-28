/* =====================================================================
   Finance Dashboard — V2: declines / arrears view  (NOT IN v1)
   ---------------------------------------------------------------------
   DEFERRED 3 Sep 2026.  v1 is the payment runs page + the batch details
   page only.  The declines/arrears dashboard is v2, and these queries are
   written but parked.

   v1 must therefore HIDE the entry point: the "Declined" KPI card is
   clickable (fd-dashboard.js ~line 153, `onclick="FD.showDeclines()"`) and
   is the only way into #view-declines.  Drop the `action` on that KPI in
   v1 or it leads to an unbuilt view.

   ⚠ TODO BEFORE THIS FILE RUNS — strip the payment token from Reason.
     Gateway messages embed Payments.Token verbatim, e.g.
       "Declined Invalid Cash Account ID for token : nlcb9aqocwivlk67fy4j"
     so grouping on the raw ResponseMessage yields one row PER TOKEN rather
     than one per reason, and renders a live CC/DD token on screen.  v1's Q4
     was fixed 4 Sep 2026 (v1-payments.sql) with:
         REPLACE(p.ResponseMessage, p.Token, '')
     FIVE occurrences here still use the bare column and must ALL change
     together — `grep -n "p.ResponseMessage" v2-declines.sql` finds them
     (line numbers move, so they are listed by query):
       Q4  SELECT ... AS Reason
       Q4  GROUP BY — a verbatim repeat of the SELECT expression, because
           SQL Server cannot GROUP BY an alias.  These two move as a pair
           or the query will not compile.
       Q5  SELECT ... AS Reason   (the per-row reason shown in the table)
       Q5  `= @Reason` filter
       Q6  `= @Reason` filter
     The filters must match the SELECTs exactly: the reason chip the user
     clicks carries the DISPLAYED string, so if the filter compares it
     against an unstripped message the chip silently returns zero rows.
     Safe as written — verified on batch 3837 (4 Sep 2026): 12,628 declines,
     0 with a NULL Token, and REPLACE would return NULL for those.

   Q4  Reasons — per (run × reason).  Powers the header totals and the
                 reason filter chips.  Small; fetch whole.
   Q5  Rows    — individual declined payments, paged + filtered SERVER-side.
   Q6  Count   — total for Q5's pager.

   Why not fold into Q1: Q1 is one row per batch.  These need per-payment
   grain, and reason text is unbounded so it cannot become fixed columns.

   Window and Kind-2 filter match v1-payments.sql exactly, so the numbers
   reconcile with DeclinedCount there.
   ===================================================================== */

DECLARE @FromDate date = '2026-01-01';   -- Flow parameters, as per Q1
DECLARE @ToDate   date = '9999-12-31';


/* =====================================================================
   Q4 — DECLINE REASONS  (run × reason)
   Client derives from this: total declined value, affected-run count
   (distinct BatchId), and the reason chips (sum by Reason).
   Deliberately NO unprocessed-count here — it needs the PaymentLines /
   Invoices EXISTS, which at ~12k declines per batch is far too much work
   for a panel header.  That number already exists per run in Q1.
   ===================================================================== */
SELECT
    p.BatchId,
    b.RunDate,
    ISNULL(NULLIF(LTRIM(RTRIM(p.ResponseMessage)), ''), '(no reason given)') AS Reason,
    p.ResponseCode        AS ReasonCode,
    COUNT(*)              AS DeclineCount,
    SUM(p.Amount)         AS DeclineValue
FROM UnionTemplate.Payments p
INNER JOIN UnionTemplate.Batch b
    ON b.Id = p.BatchId
WHERE b.Kind = 2
  AND b.RunDate >= @FromDate
  AND b.RunDate <  @ToDate
  AND p.Status IN (6,15)          -- declined; 15 = PSANZ payment importer
GROUP BY
    p.BatchId,
    b.RunDate,
    ISNULL(NULLIF(LTRIM(RTRIM(p.ResponseMessage)), ''), '(no reason given)'),
    p.ResponseCode
ORDER BY DeclineCount DESC;


/* =====================================================================
   Q5 — DECLINED PAYMENT ROWS  (paged, filtered)

   The current UI loads every decline and filters in JS.  That does not
   survive live volumes — one test batch alone held 12,628 declines — so
   reason-filter, search and paging are all pushed into SQL here.

   Member name resolved 3 Sep 2026 (was open item #6): CrmId joins to
   ZenCRM.Individuals.ID, name column is FullName.  @Search therefore
   matches member name as well as reference, so the UI's "member,
   reference, run" placeholder is honest.
   ===================================================================== */
DECLARE @Reason  nvarchar(400) = NULL;   -- NULL = all reasons (chip: "All reasons")
DECLARE @Search  nvarchar(200) = NULL;   -- NULL = no search
DECLARE @Offset  int = 0;
DECLARE @Fetch   int = 100;

SELECT
    p.Id                  AS SortKey,        -- unique -> stable OFFSET/FETCH
    p.BatchId,
    b.RunDate,
    /* Labels INVERTED vs the Lookup names on purpose — see v1-payments.sql Q1
       and SQL-DATASETS.md §2. Type 1 is the automated "Daily Run". */
    CASE b.Type
        WHEN 1 THEN 'Membership Dues — Daily Run'
        WHEN 0 THEN 'Membership Dues — Other'
        ELSE        'Membership Dues'
    END                   AS BatchName,
    p.Reference           AS PaymentRef,
    p.CrmId               AS PartyId,     -- internal CRM key (join key, not for display)
    i.ImisId              AS MemberId,    -- the member number shown in the UI
    i.FullName            AS MemberName,
    p.Amount,
    p.Status              AS StatusRaw,
    ISNULL(NULLIF(LTRIM(RTRIM(p.ResponseMessage)), ''), '(no reason given)') AS Reason,
    p.ResponseCode        AS ReasonCode,
    /* Per-row "still needs action". Replaces p.Processed AS IsRetried —
       Processed has nothing to do with declines (open item #1, closed). */
    CASE WHEN EXISTS (
            SELECT 1
            FROM UnionTemplate.PaymentLines pl
            INNER JOIN UnionTemplate.Invoices i
                ON i.Id = pl.InvoiceId
            WHERE pl.PaymentId = p.Id
              AND i.Status  = 0
              AND i.Balance > 0)
         THEN 1 ELSE 0 END AS StillOwed,
    p.ChargeDate
FROM UnionTemplate.Payments p
INNER JOIN UnionTemplate.Batch b
    ON b.Id = p.BatchId
LEFT JOIN ZenCRM.Individuals i          -- LEFT: never drop a payment for a missing contact
    ON i.ID = p.CrmId
WHERE b.Kind = 2
  AND b.RunDate >= @FromDate
  AND b.RunDate <  @ToDate
  AND p.Status IN (6,15)
  AND (@Reason IS NULL
       OR ISNULL(NULLIF(LTRIM(RTRIM(p.ResponseMessage)), ''), '(no reason given)') = @Reason)
  AND (@Search IS NULL
       OR p.Reference LIKE '%' + @Search + '%'
       OR i.FullName  LIKE '%' + @Search + '%'
       OR i.ImisId    LIKE '%' + @Search + '%')   -- name + member number (#6 resolved)
ORDER BY b.RunDate DESC, p.Id DESC
OFFSET @Offset ROWS FETCH NEXT @Fetch ROWS ONLY;


/* =====================================================================
   Q6 — COUNT for Q5's pager.  Predicates must stay identical to Q5.
   ===================================================================== */
SELECT COUNT(*) AS DeclineTotal
FROM UnionTemplate.Payments p
INNER JOIN UnionTemplate.Batch b
    ON b.Id = p.BatchId
LEFT JOIN ZenCRM.Individuals i          -- needed only so @Search matches Q5 exactly
    ON i.ID = p.CrmId
WHERE b.Kind = 2
  AND b.RunDate >= @FromDate
  AND b.RunDate <  @ToDate
  AND p.Status IN (6,15)
  AND (@Reason IS NULL
       OR ISNULL(NULLIF(LTRIM(RTRIM(p.ResponseMessage)), ''), '(no reason given)') = @Reason)
  AND (@Search IS NULL
       OR p.Reference LIKE '%' + @Search + '%'
       OR i.FullName  LIKE '%' + @Search + '%'
       OR i.ImisId    LIKE '%' + @Search + '%');


/* =====================================================================
   NOTES
   ---------------------------------------------------------------------
   · Endpoint C = Q4 + Q5 + Q6 in one Flow (same multi-result-set question
     as endpoint B).  Q4 is small enough to re-send on every page/filter
     change; if that proves wasteful, split Q4 to its own call and cache it
     client-side for the range.
   · @Reason matches the SAME normalised expression the client received in
     Q4, so a chip round-trips exactly. Do not compare against raw
     ResponseMessage — NULL/blank reasons would never match.
   · `LIKE '%x%'` cannot use an index. Acceptable because the Kind-2 +
     window + Status predicates cut the set first, but if search gets slow,
     that leading wildcard is the reason.
   · These need IX_Payments_Batch_Charge (v1-payments.sql) as much as Q2/Q3
     do — without it every one of these is a full 2.16M-row scan.
   · UI change required either way: the declines panel must page and ask the
     server on filter/search rather than reducing over runsInRange(), which
     is fd-dashboard.js declinesInRange() at line 438.
   ===================================================================== */
