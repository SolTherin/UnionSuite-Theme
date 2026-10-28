DECLARE @FromDate DAte = '2025-01-01'
DECLARE @ToDate DAte = '2026-12-31'
;

WITH RelevantPayments AS (
    SELECT
        P.ID,
        P.BatchId,
        CONVERT(date, P.ChargeDate) AS PaymentDate,
        P.Status,
        P.Amount
    FROM UnionTemplate.Payments P
    WHERE P.ChargeDate >= @FromDate
      AND P.ChargeDate <  @ToDate
),

UnprocessedDeclines AS (
    SELECT
        RP.ID AS PaymentId
    FROM RelevantPayments RP
    INNER JOIN UnionTemplate.PaymentLines PL
        ON PL.PaymentId = RP.ID
    INNER JOIN UnionTemplate.Invoices I
        ON I.ID = PL.InvoiceId
       AND I.Status = 0
    WHERE RP.Status = 6
    GROUP BY
        RP.ID
),

PaymentSummary AS (
    SELECT
        RP.PaymentDate,
        RP.BatchId,

        COUNT_BIG(*) AS PaymentTotalCount,

        SUM(CASE
            WHEN RP.Status IN (4, 5) THEN RP.Amount
            ELSE 0
        END) AS AmountCollected,

        SUM(CASE
            WHEN RP.Status = 1 THEN 1
            ELSE 0
        END) AS PendingPaymentCount,

        SUM(CASE
            WHEN RP.Status IN (2, 3) THEN 1
            ELSE 0
        END) AS ProcessingPaymentCount,

        SUM(CASE
            WHEN RP.Status IN (4, 5) THEN 1
            ELSE 0
        END) AS FinalisedPaymentCount,

        SUM(CASE
            WHEN RP.Status = 6 THEN 1
            ELSE 0
        END) AS DeclinedPaymentCount,

        SUM(CASE
            WHEN UD.PaymentId IS NOT NULL THEN 1
            ELSE 0
        END) AS UnprocessedDeclinedPaymentCount

    FROM RelevantPayments RP
    LEFT JOIN UnprocessedDeclines UD
        ON UD.PaymentId = RP.ID
    GROUP BY
        RP.PaymentDate,
        RP.BatchId
)

SELECT
    PS.PaymentDate,
    PS.BatchId,

    B.Kind AS BatchKindId,
    BK.Description AS BatchKind,

    B.Type AS BatchTypeId,
    BT.DEscription AS BatchType,

    PS.PaymentTotalCount,
    PS.AmountCollected,
    PS.PendingPaymentCount,
    PS.ProcessingPaymentCount,
    PS.FinalisedPaymentCount,
    PS.DeclinedPaymentCount,
    PS.UnprocessedDeclinedPaymentCount

FROM PaymentSummary PS
INNER JOIN UnionTemplate.Batch B
    ON B.ID = PS.BatchId

LEFT JOIN UnionTemplate.Lookup BK
    ON BK.ID = B.Kind
    AND BK.Type = 'BatchKind'
LEFT JOIN UnionTemplate.Lookup BT
    ON BT.ID = B.Type
    AND BT.Type = 'BatchType'
ORDER BY
    PS.PaymentDate DESC,
    PS.BatchId DESC;