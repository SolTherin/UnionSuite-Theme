-- Outbound Emails: investigation queries (READ-ONLY, run in SSMS on the dev tenant).
-- Run each section on its own and paste the results back. Nothing here writes data.
-- Replace the test values in section 0 if your test send changes.

DECLARE @TestId        varchar(50)      = '104203';
DECLARE @TestContact   uniqueidentifier = 'BC854884-D024-4D91-B9C9-27B2DDB2105F';
DECLARE @TestLog       uniqueidentifier = '01A0F508-7F11-7746-909B-3F765ADABBD6';

-- ===========================================================================
-- 1. Event types: names and codes (tone mapping; exact spelling of 'Resent')
-- ===========================================================================
SELECT * FROM CommunicationLogEventTypeRef ORDER BY 1;

-- ===========================================================================
-- 2. What the vBo editor can already see: existing communication views/tables
-- ===========================================================================
SELECT TABLE_TYPE, TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%Communication%'
   OR TABLE_NAME LIKE '%Attachment%'
   OR TABLE_NAME LIKE '%Campaign%'
ORDER BY TABLE_TYPE, TABLE_NAME;

-- ===========================================================================
-- 3. Columns of the four core tables (look for an event key and any extra
--    attempt/send columns)
-- ===========================================================================
SELECT TABLE_NAME, ORDINAL_POSITION, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('CommunicationLog', 'CommunicationLogRecipient',
                     'CommunicationLogEvent', 'CommunicationLogEventTypeRef')
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- ===========================================================================
-- 4. HOW A RESEND IS RECORDED (the key question)
--    4a. Which event types occur, and how often
-- ===========================================================================
SELECT ET.CommunicationLogEventTypeName AS EventName,
       COUNT(*)                         AS Events,
       COUNT(DISTINCT EV.CommunicationLogRecipientKey) AS Recipients
FROM CommunicationLogEvent EV
LEFT JOIN CommunicationLogEventTypeRef ET
    ON EV.CommunicationLogEventTypeCode = ET.CommunicationLogEventTypeCode
GROUP BY ET.CommunicationLogEventTypeName
ORDER BY Events DESC;

--    4b. Every event of the test send (confirm Queued / Delivered / Resent)
SELECT EV.*, ET.CommunicationLogEventTypeName
FROM CommunicationLogEvent EV
INNER JOIN CommunicationLogRecipient R
    ON EV.CommunicationLogRecipientKey = R.CommunicationLogRecipientKey
LEFT JOIN CommunicationLogEventTypeRef ET
    ON EV.CommunicationLogEventTypeCode = ET.CommunicationLogEventTypeCode
WHERE R.CommunicationLogKey = @TestLog
  AND R.ContactKey = @TestContact
ORDER BY EV.EventDateTime;

--    4c. Did the resend create a NEW log or recipient row? Look for the same
--        subject sent to the same contact (more than one row = new row per resend)
SELECT L.CommunicationLogKey, L.Subject, L.CreatedOn,
       R.CommunicationLogRecipientKey, R.Address, R.CreatedOn AS RecipientCreatedOn
FROM CommunicationLogRecipient R
INNER JOIN CommunicationLog L
    ON R.CommunicationLogKey = L.CommunicationLogKey
WHERE R.ContactKey = @TestContact
ORDER BY R.CreatedOn DESC;

--    4d. Is the Resent address (EventReason) ever different from the
--        recipient's own address? (a copy to another address vs a true resend)
SELECT TOP (50)
       R.Address AS RecipientAddress, EV.EventReason AS ResentTo, EV.EventDateTime
FROM CommunicationLogEvent EV
INNER JOIN CommunicationLogEventTypeRef ET
    ON EV.CommunicationLogEventTypeCode = ET.CommunicationLogEventTypeCode
   AND ET.CommunicationLogEventTypeName = 'Resent'
INNER JOIN CommunicationLogRecipient R
    ON EV.CommunicationLogRecipientKey = R.CommunicationLogRecipientKey
ORDER BY EV.EventDateTime DESC;

--    4e. How many recipient rows have more than one Resent event?
SELECT x.ResentCount, COUNT(*) AS Recipients
FROM (
    SELECT EV.CommunicationLogRecipientKey, COUNT(*) AS ResentCount
    FROM CommunicationLogEvent EV
    INNER JOIN CommunicationLogEventTypeRef ET
        ON EV.CommunicationLogEventTypeCode = ET.CommunicationLogEventTypeCode
       AND ET.CommunicationLogEventTypeName = 'Resent'
    GROUP BY EV.CommunicationLogRecipientKey
) x
GROUP BY x.ResentCount
ORDER BY x.ResentCount;

-- ===========================================================================
-- 5. KEYS AND UNIQUENESS (for ActivityKey and paging)
-- ===========================================================================
--    5a. Is a contact ever listed twice on one log? (duplicates break a
--        one-row-per-send key if the key were log + contact)
SELECT TOP (20) R.CommunicationLogKey, R.ContactKey, COUNT(*) AS RecipientRows
FROM CommunicationLogRecipient R
GROUP BY R.CommunicationLogKey, R.ContactKey
HAVING COUNT(*) > 1
ORDER BY RecipientRows DESC;

--    5b. Does the recipient row's CreatedOn match the first (Queued) event?
SELECT TOP (20)
       R.CreatedOn AS RecipientCreatedOn,
       MIN(EV.EventDateTime) AS FirstEvent,
       DATEDIFF(MILLISECOND, R.CreatedOn, MIN(EV.EventDateTime)) AS GapMs
FROM CommunicationLogRecipient R
INNER JOIN CommunicationLogEvent EV
    ON EV.CommunicationLogRecipientKey = R.CommunicationLogRecipientKey
GROUP BY R.CommunicationLogRecipientKey, R.CreatedOn
ORDER BY R.CreatedOn DESC;

--    5c. Do two events of one recipient ever share the same timestamp?
--        (breaks the oldest-first order without a tie-break key)
SELECT TOP (20) EV.CommunicationLogRecipientKey, EV.EventDateTime, COUNT(*) AS Events
FROM CommunicationLogEvent EV
GROUP BY EV.CommunicationLogRecipientKey, EV.EventDateTime
HAVING COUNT(*) > 1
ORDER BY Events DESC;

-- ===========================================================================
-- 6. BODY TEXT: is a plain-text body stored? (Summary / Detail)
-- ===========================================================================
SELECT
    COUNT(*)                                                    AS Logs,
    SUM(CASE WHEN L.Text IS NULL OR LEN(L.Text) = 0 THEN 1 ELSE 0 END) AS EmptyText,
    SUM(CASE WHEN L.Html IS NULL OR LEN(L.Html) = 0 THEN 1 ELSE 0 END) AS EmptyHtml,
    AVG(LEN(L.Text))                                            AS AvgTextLength
FROM CommunicationLog L;

SELECT TOP (5) L.Subject, LEFT(L.Text, 200) AS TextStart, LEN(L.Text) AS TextLen, LEN(L.Html) AS HtmlLen
FROM CommunicationLog L
ORDER BY L.CreatedOn DESC;

-- ===========================================================================
-- 7. CAMPAIGN, SOURCE AND ATTACHMENTS (Additional-Campaign / -Attachments)
-- ===========================================================================
SELECT L.SourceProcess, COUNT(*) AS Logs
FROM CommunicationLog L
GROUP BY L.SourceProcess
ORDER BY Logs DESC;

SELECT TOP (10) L.SourceCodeKey, L.SourceProcess, L.CommunicationReasonKey, L.Subject
FROM CommunicationLog L
WHERE L.SourceCodeKey IS NOT NULL
ORDER BY L.CreatedOn DESC;

-- ===========================================================================
-- 8. REFERENCE VIEWS: do the joins cover every row? (INNER vs LEFT choices)
-- ===========================================================================
SELECT
    COUNT(*)                                                                    AS RecipientRows,
    SUM(CASE WHEN R.ContactKey IS NULL THEN 1 ELSE 0 END)                       AS NoContactKey,
    SUM(CASE WHEN P.UniformId IS NULL THEN 1 ELSE 0 END)                        AS NoPartyRow
FROM CommunicationLogRecipient R
LEFT JOIN vSoaPartyReference P
    ON R.ContactKey = P.UniformId;

SELECT
    COUNT(*)                                                                    AS Logs,
    SUM(CASE WHEN L.CreatedByUserKey IS NULL THEN 1 ELSE 0 END)                 AS NoCreatedBy,
    SUM(CASE WHEN U.UserId IS NULL THEN 1 ELSE 0 END)                           AS NoUserRow
FROM CommunicationLog L
LEFT JOIN vSoaUserReference U
    ON L.CreatedByUserKey = U.UserId;

-- ===========================================================================
-- 9. EXISTING EXAMPLES: how iMIS itself shapes these (vBo definitions)
-- ===========================================================================
SELECT name, OBJECT_DEFINITION(object_id) AS Definition
FROM sys.views
WHERE name IN ('vBoCommunicationLogSummary', 'vSoaCommunicationLogRecipientSummary',
               'vSoaCommunicationLogSummary');
