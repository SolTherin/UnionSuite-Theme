/* =====================================================================
   Finance Dashboard — diagnostics for the v1 open items
   ---------------------------------------------------------------------
   One pass that turns the remaining v1 questions into numbers.  Several
   of these need a decision, but none of them should be decided blind —
   run this first, then take the output to finance.

   Covers open items 2, 4, 6, 9, 10, 11 (SQL-DATASETS.md §7).
   #8 (multi-result-set) is a relay test, not a query — see ct-probe.

   READ-ONLY.  Without IX_Payments_Batch_Charge these are full scans of
   Payments (2.16M rows), so narrow @FromDate if the box is busy.
   ===================================================================== */

DECLARE @FromDate date = DATEADD(day, -365, CAST(SYSUTCDATETIME() AS date));
DECLARE @ToDate   date = '9999-12-31';
DECLARE @Today    date = CAST(SYSUTCDATETIME() AS date);


/* =====================================================================
   #2 — TokenType 1: cc or dd?
   ---------------------------------------------------------------------
   ANSWER: if TokenType 1 has no rows, the question is moot — drop it from
   the cc list and move on.  If it does occur, the split matters and the
   value column tells you how much is riding on the call.
   ===================================================================== */
SELECT
    '2. TokenType mix (Kind 2)' AS Diagnostic,
    p.TokenType,
    l.Description             AS TokenTypeName,
    COUNT(*)                  AS Payments,
    SUM(p.Amount)             AS Value,
    MIN(b.RunDate)            AS FirstSeen,
    MAX(b.RunDate)            AS LastSeen
FROM UnionTemplate.Payments p
INNER JOIN UnionTemplate.Batch b ON b.Id = p.BatchId
LEFT  JOIN UnionTemplate.Lookup l ON l.Id = p.TokenType AND l.Type = 'TokenType'
WHERE b.Kind = 2 AND b.RunDate >= @FromDate AND b.RunDate < @ToDate
GROUP BY p.TokenType, l.Description
ORDER BY Payments DESC;
/* If TokenTypeName is NULL the Lookup Type string is wrong — find it with:
   SELECT DISTINCT Type FROM UnionTemplate.Lookup ORDER BY Type;            */


/* =====================================================================
   #4 — Is Paid (4) materially different from Completed (5)?
   ---------------------------------------------------------------------
   Paid      = bank gave a result, iMIS NOT yet updated
   Completed = same, and iMIS updated
   Both currently count as Cleared, so "Total collected" includes money
   not yet reflected on member records.

   ANSWER: look at StuckDays.  If Status 4 clears within a day it is a
   transient state and folding it into Cleared is right.  If rows sit
   there for weeks, that is real money invisible to iMIS and it needs its
   own bucket + card.
   ===================================================================== */
SELECT
    '4. Paid vs Completed' AS Diagnostic,
    p.Status,
    CASE p.Status WHEN 4 THEN 'Paid (iMIS NOT updated)'
                  WHEN 5 THEN 'Completed (iMIS updated)' END AS Meaning,
    COUNT(*)      AS Payments,
    SUM(p.Amount) AS Value,
    MIN(CAST(p.ChargeDate AS date)) AS OldestCharge,
    MAX(DATEDIFF(day, p.ChargeDate, SYSUTCDATETIME())) AS StuckDays_Max,
    AVG(DATEDIFF(day, p.ChargeDate, SYSUTCDATETIME())) AS StuckDays_Avg
FROM UnionTemplate.Payments p
INNER JOIN UnionTemplate.Batch b ON b.Id = p.BatchId
WHERE b.Kind = 2 AND b.RunDate >= @FromDate AND b.RunDate < @ToDate
  AND p.Status IN (4,5)
GROUP BY p.Status;


/* =====================================================================
   #6 — Where does CrmId point?
   ---------------------------------------------------------------------
   ANSWER: if 6a returns nothing, the contact tables are NOT in this
   database and there is nothing to join — resolve names client-side via
   the iMIS REST API for the ~100 rows on screen, and accept that
   server-side name search is impossible.
   ===================================================================== */
SELECT '6a. candidate contact tables' AS Diagnostic, TABLE_SCHEMA, TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%Name%'
   OR TABLE_NAME LIKE '%Contact%'
   OR TABLE_NAME LIKE '%Party%'
   OR TABLE_NAME LIKE '%Member%'
ORDER BY TABLE_SCHEMA, TABLE_NAME;

/* 6b — what the values actually look like, so you can match them by eye
   against whatever 6a turned up (iMIS has BOTH an int PartyId and a
   varchar ID; CrmId being 104019-shaped suggests the former).           */
SELECT TOP 5 '6b. sample CrmId values' AS Diagnostic, p.CrmId, p.Reference
FROM UnionTemplate.Payments p
WHERE p.CrmId IS NOT NULL;


/* =====================================================================
   #9 — Trend chart: run date or payment date?
   ---------------------------------------------------------------------
   ANSWER: if PaymentsOnADifferentDate is 0 (or trivial), the two are the
   same thing and the question is moot — keep run date, no second query.
   If it is material, finance has to pick, and payment-dating needs its
   own small 3-column dataset.
   ===================================================================== */
SELECT
    '9. RunDate vs ChargeDate' AS Diagnostic,
    COUNT(*)                                        AS TotalPayments,
    SUM(CASE WHEN CAST(p.ChargeDate AS date) <> b.RunDate THEN 1 ELSE 0 END) AS PaymentsOnADifferentDate,
    COUNT(DISTINCT CASE WHEN CAST(p.ChargeDate AS date) <> b.RunDate THEN b.Id END) AS BatchesAffected,
    MAX(ABS(DATEDIFF(day, b.RunDate, CAST(p.ChargeDate AS date))))          AS MaxDaysApart
FROM UnionTemplate.Payments p
INNER JOIN UnionTemplate.Batch b ON b.Id = p.BatchId
WHERE b.Kind = 2 AND b.RunDate >= @FromDate AND b.RunDate < @ToDate;


/* =====================================================================
   #10 — The NULL-Kind batches
   ---------------------------------------------------------------------
   These were the THREE LARGEST batches in the dataset and `WHERE Kind = 2`
   excludes them all.  If any is a payment run, v1 is silently hiding its
   biggest numbers.

   ANSWER: look at TokenTypes — if they are card/DD tokens (11/1/22/2)
   these are payment runs with a missing Kind, and either the data needs
   fixing or the filter needs widening.
   ===================================================================== */
SELECT
    '10. NULL-Kind batches' AS Diagnostic,
    b.Id            AS BatchId,
    b.Kind,
    b.Type,
    b.RunDate,
    b.Status        AS BatchStatusRaw,
    COUNT(p.Id)     AS Payments,
    SUM(p.Amount)   AS Value,
    COUNT(DISTINCT p.TokenType) AS DistinctTokenTypes,
    MIN(p.TokenType) AS MinTokenType,
    MAX(p.TokenType) AS MaxTokenType,
    MIN(p.Status)   AS MinStatus,
    MAX(p.Status)   AS MaxStatus
FROM UnionTemplate.Batch b
LEFT JOIN UnionTemplate.Payments p ON p.BatchId = b.Id
WHERE b.Kind IS NULL
GROUP BY b.Id, b.Kind, b.Type, b.RunDate, b.Status
ORDER BY Payments DESC;


/* =====================================================================
   #11 — Future-dated runs
   ---------------------------------------------------------------------
   The client filters on daysAgo, so anything dated after today vanishes
   from every range silently.

   ANSWER: if this returns nothing, deprioritise. If scheduled runs are
   routine, they need a decision — in-window, own "Scheduled" group, or
   excluded explicitly (an explicit exclusion is still better than the
   current accidental one).
   ===================================================================== */
SELECT
    '11. future-dated runs' AS Diagnostic,
    b.Id          AS BatchId,
    b.RunDate,
    b.Type        AS BatchTypeId,
    DATEDIFF(day, @Today, b.RunDate) AS DaysAhead,
    COUNT(p.Id)   AS Payments,
    SUM(p.Amount) AS Value
FROM UnionTemplate.Batch b
LEFT JOIN UnionTemplate.Payments p ON p.BatchId = b.Id
WHERE b.Kind = 2
  AND b.RunDate > @Today
GROUP BY b.Id, b.RunDate, b.Type
ORDER BY b.RunDate;


/* =====================================================================
   BONUS — does every payment land in exactly one bucket?
   The §6a.3 finding said 15% of rows did not reconcile.  Anything
   appearing here is a status v1 does not classify; it currently falls to
   Other, which is the canary working as intended, but the list tells you
   WHICH codes are showing up.
   ===================================================================== */
SELECT
    'bonus. unclassified statuses' AS Diagnostic,
    p.Status,
    l.Description AS StatusName,
    COUNT(*)      AS Payments,
    SUM(p.Amount) AS Value
FROM UnionTemplate.Payments p
INNER JOIN UnionTemplate.Batch b ON b.Id = p.BatchId
LEFT  JOIN UnionTemplate.Lookup l ON l.Id = p.Status AND l.Type = 'PaymentStatus'
WHERE b.Kind = 2 AND b.RunDate >= @FromDate AND b.RunDate < @ToDate
  AND p.Status NOT IN (1,3,10,4,5,6,15,8,9)
GROUP BY p.Status, l.Description
ORDER BY Payments DESC;
