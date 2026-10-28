/* =====================================================================
   Finance Dashboard — v1 Q1 rewrite verification
   ---------------------------------------------------------------------
   Runs the ORIGINAL Q1 and the TUNED Q1 over the same window and diffs
   every column of every row.  Run this once before trusting the tuned
   query's numbers: the bucket logic was retyped from nested string CASEs
   to raw-int tests, and MaxProcessingDays was re-derived.

   Expect: "0 rows — outputs are identical" and a timing gap of roughly
   19-34s vs low single digits.  (Ran 3 Sep 2026: 34,032ms vs 3,366ms,
   1,179 rows each, both diffs empty.)

   SECOND USE — proving the `_Unsynced` twins really are unused.  #old
   below deliberately KEEPS the twin codes (91/93/94/95/96/98/99/910) in
   its buckets; the tuned query has dropped them.  So re-running this now
   is an empirical test of that claim across the whole window:
     · empty diff  → no payment in the data carries a twin code, and
                     dropping them changed nothing.  Claim confirmed.
     · any rows    → twins DO occur; the diff names the batches and shows
                     exactly how many payments moved into Other.
   Either way you learn something, for the price of one more run.

   Both versions are handed the SAME @Now so MaxProcessingDays is
   comparable (the original called SYSUTCDATETIME() inline, so running
   them minutes apart across midnight could otherwise show a 1-day diff
   that is not a real difference).

   Takes ~25s+, almost all of it the original.  Read-only, but it is
   prod — run it when the box is quiet.
   ===================================================================== */

SET NOCOUNT ON;

DECLARE @FromDate date              = '2026-01-01';   -- same window as the plan capture
DECLARE @ToDate   date              = '9999-12-31';
DECLARE @Now      datetimeoffset(7) = SYSUTCDATETIME();
DECLARE @t0 datetime2 = SYSUTCDATETIME(), @tOld int, @tNew int;

IF OBJECT_ID('tempdb..#old') IS NOT NULL DROP TABLE #old;
IF OBJECT_ID('tempdb..#new') IS NOT NULL DROP TABLE #new;


/* =====================================================================
   ORIGINAL Q1  →  #old
   ===================================================================== */
;WITH PaymentRow AS (
    SELECT
        p.Id, p.BatchId, p.Amount, p.Status, p.ChargeDate,
        CASE
            WHEN p.Status IN (1, 91)          THEN 'Pending'
            WHEN p.Status IN (3, 10, 93, 910) THEN 'Processing'
            WHEN p.Status IN (4, 5, 94, 95)   THEN 'Cleared'
            WHEN p.Status IN (6, 15, 16, 96)  THEN 'Declined'
            WHEN p.Status IN (8, 9, 98, 99)   THEN 'Error'
            ELSE 'Other'
        END AS Bucket,
        CASE
            WHEN p.TokenType IN (11, 1) THEN 'cc'
            WHEN p.TokenType IN (22, 2) THEN 'dd'
            ELSE 'other'
        END AS Method,
        CASE WHEN p.Status IN (3, 10, 93, 910)
             THEN DATEDIFF(day, p.ChargeDate, @Now) END AS ProcessingDays
    FROM UnionTemplate.Payments p
    JOIN UnionTemplate.Batch    b ON b.Id = p.BatchId
    WHERE b.Kind = 2
      AND b.RunDate >= @FromDate
      AND b.RunDate <  @ToDate
),
UnprocessedDecline AS (
    SELECT pr.Id AS PaymentId
    FROM PaymentRow pr
    JOIN UnionTemplate.PaymentLines pl ON pl.PaymentId = pr.Id
    JOIN UnionTemplate.Invoices     i  ON i.Id = pl.InvoiceId
                                      AND i.Status  = 0
                                      AND i.Balance > 0
    WHERE pr.Bucket = 'Declined'
    GROUP BY pr.Id
)
SELECT
    b.Id                          AS BatchId,
    b.RunDate,
    CONVERT(time, b.CreatedDate)  AS RunTime,
    b.Status                      AS BatchStatusRaw,
    b.Type                        AS BatchTypeId,
    CASE b.Type
        WHEN 0 THEN 'Membership Payments — Daily'
        WHEN 1 THEN 'Membership Payments — Bulk Run'
        ELSE        'Membership Payments'
    END                           AS BatchName,
    COUNT_BIG(*)                  AS TotalCount,
    SUM(pr.Amount)                AS TotalValue,
    SUM(CASE WHEN pr.Bucket='Pending'    THEN 1 ELSE 0 END)         AS PendingCount,
    SUM(CASE WHEN pr.Bucket='Pending'    THEN pr.Amount ELSE 0 END) AS PendingValue,
    SUM(CASE WHEN pr.Bucket='Processing' THEN 1 ELSE 0 END)         AS ProcessingCount,
    SUM(CASE WHEN pr.Bucket='Processing' THEN pr.Amount ELSE 0 END) AS ProcessingValue,
    SUM(CASE WHEN pr.Bucket='Cleared'    THEN 1 ELSE 0 END)         AS ClearedCount,
    SUM(CASE WHEN pr.Bucket='Cleared'    THEN pr.Amount ELSE 0 END) AS ClearedValue,
    SUM(CASE WHEN pr.Bucket='Declined'   THEN 1 ELSE 0 END)         AS DeclinedCount,
    SUM(CASE WHEN pr.Bucket='Declined'   THEN pr.Amount ELSE 0 END) AS DeclinedValue,
    SUM(CASE WHEN pr.Bucket='Error'      THEN 1 ELSE 0 END)         AS ErrorCount,
    SUM(CASE WHEN pr.Bucket='Error'      THEN pr.Amount ELSE 0 END) AS ErrorValue,
    SUM(CASE WHEN pr.Bucket='Other'      THEN 1 ELSE 0 END)         AS OtherCount,
    SUM(CASE WHEN pr.Bucket='Other'      THEN pr.Amount ELSE 0 END) AS OtherValue,
    SUM(CASE WHEN pr.Method='dd'    THEN 1 ELSE 0 END)         AS DDCount,
    SUM(CASE WHEN pr.Method='dd'    THEN pr.Amount ELSE 0 END) AS DDValue,
    SUM(CASE WHEN pr.Method='cc'    THEN 1 ELSE 0 END)         AS CCCount,
    SUM(CASE WHEN pr.Method='cc'    THEN pr.Amount ELSE 0 END) AS CCValue,
    SUM(CASE WHEN pr.Method='other' THEN 1 ELSE 0 END)         AS OtherMethodCount,
    SUM(CASE WHEN pr.Method='other' THEN pr.Amount ELSE 0 END) AS OtherMethodValue,
    SUM(CASE WHEN ud.PaymentId IS NOT NULL THEN 1 ELSE 0 END) AS DeclinedUnprocessedCount,
    MAX(pr.ProcessingDays)                                    AS MaxProcessingDays
INTO #old
FROM PaymentRow pr
JOIN UnionTemplate.Batch b ON b.Id = pr.BatchId
LEFT JOIN UnprocessedDecline ud ON ud.PaymentId = pr.Id
GROUP BY b.Id, b.RunDate, b.CreatedDate, b.Status, b.Type;

SET @tOld = DATEDIFF(millisecond, @t0, SYSUTCDATETIME());
SET @t0   = SYSUTCDATETIME();


/* =====================================================================
   TUNED Q1  →  #new     (must stay byte-identical to v1-payments.sql)
   ===================================================================== */
SELECT
    b.Id                          AS BatchId,
    b.RunDate,
    CONVERT(time, b.CreatedDate)  AS RunTime,
    b.Status                      AS BatchStatusRaw,
    b.Type                        AS BatchTypeId,
    CASE b.Type
        WHEN 0 THEN 'Membership Payments — Daily'
        WHEN 1 THEN 'Membership Payments — Bulk Run'
        ELSE        'Membership Payments'
    END                           AS BatchName,
    SUM(a.Cnt)                    AS TotalCount,
    SUM(a.Val)                    AS TotalValue,
    SUM(CASE WHEN a.Status = 1          THEN a.Cnt ELSE 0 END) AS PendingCount,
    SUM(CASE WHEN a.Status = 1          THEN a.Val ELSE 0 END) AS PendingValue,
    SUM(CASE WHEN a.Status IN (3,10)    THEN a.Cnt ELSE 0 END) AS ProcessingCount,
    SUM(CASE WHEN a.Status IN (3,10)    THEN a.Val ELSE 0 END) AS ProcessingValue,
    SUM(CASE WHEN a.Status IN (4,5)     THEN a.Cnt ELSE 0 END) AS ClearedCount,
    SUM(CASE WHEN a.Status IN (4,5)     THEN a.Val ELSE 0 END) AS ClearedValue,
    SUM(CASE WHEN a.Status IN (6,15,16) THEN a.Cnt ELSE 0 END) AS DeclinedCount,
    SUM(CASE WHEN a.Status IN (6,15,16) THEN a.Val ELSE 0 END) AS DeclinedValue,
    SUM(CASE WHEN a.Status IN (8,9)     THEN a.Cnt ELSE 0 END) AS ErrorCount,
    SUM(CASE WHEN a.Status IN (8,9)     THEN a.Val ELSE 0 END) AS ErrorValue,
    SUM(CASE WHEN ISNULL(a.Status,-1) NOT IN (1,3,10,4,5,6,15,16,8,9)
                                        THEN a.Cnt ELSE 0 END) AS OtherCount,
    SUM(CASE WHEN ISNULL(a.Status,-1) NOT IN (1,3,10,4,5,6,15,16,8,9)
                                        THEN a.Val ELSE 0 END) AS OtherValue,
    SUM(CASE WHEN a.TokenType IN (22,2)  THEN a.Cnt ELSE 0 END) AS DDCount,
    SUM(CASE WHEN a.TokenType IN (22,2)  THEN a.Val ELSE 0 END) AS DDValue,
    SUM(CASE WHEN a.TokenType IN (11,1)  THEN a.Cnt ELSE 0 END) AS CCCount,
    SUM(CASE WHEN a.TokenType IN (11,1)  THEN a.Val ELSE 0 END) AS CCValue,
    SUM(CASE WHEN ISNULL(a.TokenType,-1) NOT IN (22,2,11,1)
                                         THEN a.Cnt ELSE 0 END) AS OtherMethodCount,
    SUM(CASE WHEN ISNULL(a.TokenType,-1) NOT IN (22,2,11,1)
                                         THEN a.Val ELSE 0 END) AS OtherMethodValue,
    ISNULL(rt.DeclinedUnprocessedCount, 0) AS DeclinedUnprocessedCount,
    DATEDIFF(day,
             MIN(CASE WHEN a.Status IN (3,10) THEN a.FirstCharge END),
             @Now)                         AS MaxProcessingDays
INTO #new
FROM (
    SELECT
        p.BatchId, p.Status, p.TokenType,
        COUNT_BIG(*)      AS Cnt,
        SUM(p.Amount)     AS Val,
        MIN(p.ChargeDate) AS FirstCharge
    FROM UnionTemplate.Payments p
    JOIN UnionTemplate.Batch    bs ON bs.Id = p.BatchId
    WHERE bs.Kind = 2
      AND bs.RunDate >= @FromDate
      AND bs.RunDate <  @ToDate
    GROUP BY p.BatchId, p.Status, p.TokenType
) a
JOIN UnionTemplate.Batch b ON b.Id = a.BatchId
LEFT JOIN (
    SELECT p.BatchId, COUNT_BIG(*) AS DeclinedUnprocessedCount
    FROM UnionTemplate.Payments p
    JOIN UnionTemplate.Batch    br ON br.Id = p.BatchId
    WHERE br.Kind = 2
      AND br.RunDate >= @FromDate
      AND br.RunDate <  @ToDate
      AND p.Status IN (6,15,16)
      AND EXISTS (
            SELECT 1
            FROM UnionTemplate.PaymentLines pl
            JOIN UnionTemplate.Invoices     i ON i.Id = pl.InvoiceId
            WHERE pl.PaymentId = p.Id
              AND i.Status  = 0
              AND i.Balance > 0)
    GROUP BY p.BatchId
) rt ON rt.BatchId = a.BatchId
GROUP BY b.Id, b.RunDate, b.CreatedDate, b.Status, b.Type, rt.DeclinedUnprocessedCount;

SET @tNew = DATEDIFF(millisecond, @t0, SYSUTCDATETIME());


/* =====================================================================
   RESULTS
   ===================================================================== */

/* 1. Timings + row counts. */
SELECT
    @tOld                              AS OriginalMs,
    @tNew                              AS TunedMs,
    CAST(@tOld * 1.0 / NULLIF(@tNew,0) AS decimal(6,1)) AS SpeedupX,
    (SELECT COUNT_BIG(*) FROM #old)    AS OriginalRows,
    (SELECT COUNT_BIG(*) FROM #new)    AS TunedRows;

/* 2. The diff.  EXCEPT compares every column and treats NULL = NULL, so
      an empty result here means the two outputs are byte-identical.
      Note the column types must match for EXCEPT — if this errors on a
      type mismatch, that is itself a finding worth chasing (the original
      SUM(CASE..THEN 1..) yields int where the tuned SUM(a.Cnt) yields
      bigint; CAST in the SELECT list below if so).                     */
SELECT 'in ORIGINAL but not TUNED' AS Side, *
FROM (SELECT * FROM #old EXCEPT SELECT * FROM #new) d1
UNION ALL
SELECT 'in TUNED but not ORIGINAL', *
FROM (SELECT * FROM #new EXCEPT SELECT * FROM #old) d2
ORDER BY Side, BatchId;

/* 3. Sanity check the §6a.3 finding is now fixed: every row must sum to
      its own total.  Any row returned here is a bucket-logic bug.      */
SELECT BatchId, TotalCount,
       PendingCount + ProcessingCount + ClearedCount
     + DeclinedCount + ErrorCount + OtherCount AS BucketSum,
       DDCount + CCCount + OtherMethodCount    AS MethodSum
FROM #new
WHERE TotalCount <> PendingCount + ProcessingCount + ClearedCount
                  + DeclinedCount + ErrorCount + OtherCount
   OR TotalCount <> DDCount + CCCount + OtherMethodCount;

DROP TABLE #old;
DROP TABLE #new;
