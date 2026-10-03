# Outbound Emails: business objects and IQAs

The complete build record for the sent-email cards in the contact page's Recent activity
feed: what the data is, why the design is shaped as it is, the two business objects as
deployed, and the five IQAs. The feed contract (column rules, filters, paging) is in
[Activity-IQA-Specs.md](Activity-IQA-Specs.md) sections 2, 3, 4.4 and 4.6.

Related records:

- Investigation queries (read-only, run in SSMS on the dev tenant):
  [Outbound-Emails-Investigation.sql](Outbound-Emails-Investigation.sql).
- Why the business object designer cannot see the `CommunicationLog` tables (decompiled
  from the iMIS binaries):
  [bo-designer-table-list/FINDINGS.md](../../../../iMIS/2017/research/bo-designer-table-list/FINDINGS.md)
  in `Claude\iMIS\2017\research`.

## Status (1 October 2026)

| Item | State |
|---|---|
| Business object `_i4u_UT_OutboundEmails` | Deployed, with `CreatedByUserKey`, `CommunicationReasonKey` and `LastEventReason` added |
| Business object `_i4u_UT_OutboundEmails_History` | Deployed; matches this spec |
| IQAs (five, below) | Built; the probe passes on contact 104203 (1 October 2026), apart from an expected warning: `Additional-Type` is blank because the test email has no communication reason |
| Still to check | The probe as an ordinary staff account (not SysAdmin); paging (the test contact has one send, so pages were not compared); a send with a communication reason |
| Feed: `data-record-popup` (native preview in a popup) | Implemented in `US-ACTIVITY-FEED` (`zUnionSuite.js`), tested |
| Feed: delivery history (`data-events`) | Prototype only (`US-ACTIVITY-EVENTS` in `theme-candidate.js`) |

## Constraints

These decided the design; each was found the hard way.

- **The business object designer joins only.** Left, inner and right joins; no CTEs,
  `UNION`, functions or window functions. Each source can be joined **once** per business
  object, so a second use (for example `ContactMain` for the sender) is joined in the IQA,
  with its key exposed by the business object.
- **IQAs accept custom SQL expressions** in the select list (`CASE`, `CAST`, string
  concatenation), so computed values (`RecordUrl`, `EventTone`, constants) live there.
- **No custom database views.** Only existing tables and views can be sources.
- **The designer cannot use the `CommunicationLog` tables.** `CommunicationLog`,
  `CommunicationLogRecipient`, `CommunicationLogEvent`, `CommunicationLogEventTypeRef`,
  `CommunicationLogStatusRef` and both attachment tables are on iMIS's hard-coded list of
  73 restricted tables (`Asi.RestrictedTables.CannotUseAsBusinessObjectSource`). The
  table picker lists every table and view minus that list; views are never restricted.
  Details in the research findings.
- **`CommunicationReasonRef` would not join** in the designer, so the communication type is
  joined in the IQA.
- **Prefer base tables to heavy views:** `vBoNetContactData` is slow; `ContactMain` is used
  directly.

## The data

Sent email in iMIS (communications log), verified against the dev tenant:

| Table | One row per | Key columns |
|---|---|---|
| `CommunicationLog` | email (one send action) | `CommunicationLogKey`, `Subject`, `Html`, `Text`, `CommunicationReasonKey`, `CreatedByUserKey`, `CreatedOn` |
| `CommunicationLogRecipient` | recipient of that email | `CommunicationLogRecipientKey`, `ContactKey`, `Address`, `MessageType`, `CreatedOn`, `LastCommunicationLogEventTypeCode`, `LastEventReason`, `LastEventDateTime`, `IsSpam`, `IsUnsubscribed` |
| `CommunicationLogEvent` | delivery event for a recipient | `CommunicationLogEventKey`, `CommunicationLogRecipientKey`, `CommunicationLogEventTypeCode`, `EventReason`, `EventDateTime`, `CreatedByUserKey` |

Reference codes:

| Event type (`CommunicationLogEventTypeRef`) | | Message type (`CommunicationMessageTypeRef`) | |
|---|---|---|---|
| 0 Queued | 6 Click | 0 Email | |
| 1 Dropped | 7 Spam Report | 1 SMS | |
| 2 Delivered | 8 Unsubscribe | 2 AdvancedEmail (paid add-on) | |
| 3 Deferred | 9 Generated (print) | 3 Print | |
| 4 Bounce | 10 Resent | | |
| 5 Open | | | |

Findings (dev tenant, 1 October 2026):

- **A resend is an event**, not a new send: a `Resent` event (code 10) on the original
  recipient row, with the address it went to in `EventReason`. One exists (the test send).
- **No plain-text body:** `Text` is empty on 159 of 160 logs; `Html` is stored (up to
  11,000+ characters). The core IQAs return no `Summary` or `Detail` and the native preview
  shows the email.
- **No campaign data:** `SourceProcess` is NULL on every log and `SourceCodeKey` is unused.
  Attachments are left out (decision).
- **iMIS ID:** `ContactMain.SyncContactID`, the column iMIS itself uses. 28 recipient rows
  have no `vSoaPartyReference` row but are all in `ContactMain`. (`ID` matched
  `SyncContactID` on every contact checked: 104203, 138, 159.)
- **Sender:** `CreatedByUserKey` equals the sender's `ContactKey` (a staff user's key is
  their contact key), so the sender's name is `ContactMain.FullName`. All 160 logs have a
  sender who is a contact. `vSoaUserReference.Name` is only the login name.
- **Emails only:** message types 0 and 2. Recipient rows with no `Address` never get past
  Queued (for example five rows, types 0 to 3, for one contact on one log), so they are
  excluded.
- **Several recipient rows per contact per email** are legitimate (one per address or
  message type); each is its own card.
- **Event times can tie** (two events in the same millisecond), so history sorts by
  `EventDate`, then `EventTypeCode`.
- **Recipient `CreatedOn`** is within about 2 seconds of the Queued event; it is the send
  date.

## Design

Each **send** is its own card: the original send and every resend.

| Feed source | IQA | Card is | `ActivityKey` | `Category` |
|---|---|---|---|---|
| `emails-out` | `Outbound Emails` | an original send (one recipient row) | recipient key | — (left out) |
| `emails-resent` | `Outbound Email Resends` | a resend (one `Resent` event) | event key | `Resend` |

Both use `data-type="email"`, so they share the Emails tab and its count (the feed sums
totals across sources of one type). The original's history leaves out the `Resent` event;
the resend card has no history. Events that arrive after a resend (a later bounce, say) are
listed on the original, as events carry no link to a particular send.

Host entries:

```html
<li data-source="emails-out" data-query="Outbound Emails"
    data-details="Outbound Emails Details"
    data-events="Outbound Emails History" data-events-label="Delivery history"
    data-type="email" data-direction="out" data-record-popup="true"></li>
<li data-source="emails-resent" data-query="Outbound Email Resends"
    data-details="Outbound Email Resends Details"
    data-type="email" data-direction="out" data-record-popup="true"></li>
```

`data-record-popup` opens View full details (`RecordUrl`, the native
`InteractionPreview.aspx`) in the iMIS popup via `ShowDialog_NoReturnValue` (80% × 80%,
titled with the Subject), falling back to a normal link if the popup service is missing.
Covered by `tools/test-activity-record-popup.cjs`.

## Sources available to the designer

| Restricted table | Use instead |
|---|---|
| `CommunicationLogRecipient` | `vSoaCommunicationLogRecipientSummary` (a pass-through of every column) |
| `CommunicationLog` | `vSoaCommunicationLogSummary` (every column except `Text`, `Html`, `Communication`) |
| `CommunicationLogRecipient` + `CommunicationLog` | `vBoInteractionLog` (iMIS's InteractionLog business object: recipient inner-joined to its log, every column; no filter) |
| `CommunicationLogEvent` | `vBoInteractionLogEvent` (iMIS's InteractionLogEvent business object: one row per event with `EventTypeCode`, `EventTypeName`, `CommunicationLogKey`, `MessageType`; no filter) |
| `CommunicationLogEventTypeRef` | `vBoCommunicationLogEventTypeRef` |

`vBoInteractionLog` and `vBoInteractionLogEvent` were found by searching view definitions
(`sys.sql_modules`) for `CommunicationLogEvent`.

## Business objects

### `_i4u_UT_OutboundEmails` (view `vBo_i4u_UT_OutboundEmails`)

> Each email sent to a contact, combining the sent email with the recipient's delivery
> record: who it went to, when, and its latest delivery status.

Deployed definition:

```sql
ALTER VIEW [dbo].[vBo_i4u_UT_OutboundEmails]
AS
SELECT [vSoaCommunicationLogRecipientSummary].[CommunicationLogRecipientKey] AS [RecipientKey],
       [vSoaCommunicationLogSummary].[CommunicationLogKey],
       [ContactMain].[ContactKey],
       [ContactMain].[SyncContactID] AS [ID],
       [vSoaCommunicationLogRecipientSummary].[CreatedOn] AS [SentDate],
       [vSoaCommunicationLogSummary].[Subject],
       [vSoaCommunicationLogRecipientSummary].[Address] AS [SentTo],
       [vSoaCommunicationLogRecipientSummary].[MessageType],
       [CommunicationMessageTypeRef].[CommunicationMessageTypeName] AS [MessageTypeName],
       [vBoCommunicationLogEventTypeRef].[CommunicationLogEventTypeName] AS [Status],
       [vSoaCommunicationLogRecipientSummary].[LastEventDateTime],
       [vSoaCommunicationLogRecipientSummary].[IsSpam],
       [vSoaCommunicationLogRecipientSummary].[IsUnsubscribed]
  FROM [CommunicationMessageTypeRef]
	RIGHT JOIN [vSoaCommunicationLogRecipientSummary]
		ON [CommunicationMessageTypeRef].[CommunicationMessageTypeCode] = [vSoaCommunicationLogRecipientSummary].[MessageType]
	INNER JOIN [ContactMain]
		ON [ContactMain].[ContactKey] = [vSoaCommunicationLogRecipientSummary].[ContactKey]
	LEFT JOIN [vBoCommunicationLogEventTypeRef]
		ON [vBoCommunicationLogEventTypeRef].[CommunicationLogEventTypeCode] = [vSoaCommunicationLogRecipientSummary].[LastCommunicationLogEventTypeCode]
	INNER JOIN [vSoaCommunicationLogSummary]
		ON [vSoaCommunicationLogSummary].[CommunicationLogKey] = [vSoaCommunicationLogRecipientSummary].[CommunicationLogKey]
```

The `RIGHT JOIN` from `CommunicationMessageTypeRef` is the same as a left join from the
recipient view.

**To add** (the IQAs need them):

| Column | Source | Why |
|---|---|---|
| `CreatedByUserKey` | `[vSoaCommunicationLogSummary].[CreatedByUserKey]` | IQA join key for the sender's name |
| `CommunicationReasonKey` | `[vSoaCommunicationLogSummary].[CommunicationReasonKey]` | IQA join key for the communication type |
| `LastEventReason` | `[vSoaCommunicationLogRecipientSummary].[LastEventReason]` | The reason behind the latest status (a bounce reason, or a resend's address); optional |

`Status` is the latest delivery event's name (Delivered, Bounce…). The sender is the
**log's** creator; `vBoInteractionLog` would also work as a single source, but its
`CreatedByUserKey` is the recipient row's, not the log's, so the deployed version is kept.

### `_i4u_UT_OutboundEmails_History` (view `vBo_i4u_UT_OutboundEmails_History`)

> Each delivery event for an email sent to a contact (queued, delivered, bounced, opened,
> clicked, resent), together with the email and recipient it belongs to.

Deployed definition (matches this spec; no changes needed):

```sql
ALTER VIEW [dbo].[vBo_i4u_UT_OutboundEmails_History]
AS
SELECT [vBoInteractionLogEvent].[CommunicationLogEventKey] AS [EventKey],
       [vBoInteractionLogEvent].[CommunicationLogRecipientKey] AS [RecipientKey],
       [vBoInteractionLogEvent].[CommunicationLogKey],
       [ContactMain].[SyncContactID] AS [ID],
       [vBoInteractionLogEvent].[EventDateTime] AS [EventDate],
       [vBoInteractionLogEvent].[EventTypeCode],
       [vBoInteractionLogEvent].[EventTypeName] AS [EventName],
       [vBoInteractionLogEvent].[EventReason],
       [vBoInteractionLog].[Subject],
       [vBoInteractionLogEvent].[CreatedByUserKey],
       [vBoInteractionLog].[Address] AS [SentTo],
       [vBoInteractionLogEvent].[MessageType]
  FROM [ContactMain]
	INNER JOIN [vBoInteractionLog]
		ON [ContactMain].[ContactKey] = [vBoInteractionLog].[ContactKey]
	INNER JOIN [vBoInteractionLogEvent]
		ON [vBoInteractionLog].[CommunicationLogRecipientKey] = [vBoInteractionLogEvent].[CommunicationLogRecipientKey]
```

`CreatedByUserKey` is the **event's** creator: for a `Resent` event, the person who resent
it. (Every event in the test data was created by the original sender; confirm on a resend
done by someone else.) The name `_History` covers the resend cards too, as a resend is part
of the email's history.

## IQAs

Folders (both are **SandBox placeholders**, to be replaced with the production folders,
together with the host attributes and the probe's `config`, before going live):

| Folder | IQAs |
|---|---|
| `$/_i4u_/SandBox/CRM Layouts/Contact Profile/Activity` | `Outbound Emails`, `Outbound Email Resends`, `Outbound Emails History` (fixed) |
| `$/_i4u_/SandBox/CRM Layouts/Contact Profile/Client Activities` | `Outbound Emails Details`, `Outbound Email Resends Details` (client-editable) |

The host's `data-us-activity-details-folder` points at the client folder. Expressions
reference a business object's columns by its view name, as the IQA designer writes them.

**Sender join** (IQAs 1 and 3): a contact business object with `ContactKey` and `FullName`,
**left** join on `CreatedByUserKey = ContactKey`. Not `NetContactData` (slow).

**`RecordUrl`** (IQAs 1 and 3; for IQA 3 use `[vBo_i4u_UT_OutboundEmails_History]`):

```sql
'/iParts/Common/InteractionLog/InteractionPreview.aspx?CommunicationLogId='
  + CAST([vBo_i4u_UT_OutboundEmails].[CommunicationLogKey] AS nvarchar(36))
  + '&PartyId=' + [vBo_i4u_UT_OutboundEmails].[ID]
  + '&RecipientId=' + CAST([vBo_i4u_UT_OutboundEmails].[RecipientKey] AS nvarchar(36))
```

If the IQA version has no "In list" operator, use Not equal `1` and Not equal `3` for the
message type. Check filter names with `GET /api/QueryParameterDefinition?QueryPath=…`:
the feed sends `ID`, `StartDate` and `ActivityKey`. `StartDate` must be **optional** on both
core IQAs (All time sends none; a required filter returns HTTP 400).

### 1. `Outbound Emails` (core)

> Emails sent to the contact, one row per send, newest first. Feeds the email cards in the
> contact's Recent activity feed.

Sources: `_i4u_UT_OutboundEmails`; the sender (left join).

| Filter property | Operator | Prompt | Search label |
|---|---|---|---|
| `ID` | Equal | Required | `ID` |
| `SentDate` | Greater than or equal | **Optional** | `StartDate` |
| `MessageType` | In list `0, 2` | No | |
| `SentTo` | Not empty | No | |

| Alias | Value |
|---|---|
| `ActivityKey` | `RecipientKey` |
| `ActivityDate` | `SentDate` |
| `Subject` | `Subject` |
| `CreatedBy` | sender `FullName` |
| `RecordUrl` | expression above |

These are all its columns. Earlier builds also returned `Summary`, `Detail`, `Priority`,
`Category`, `CaseRef` and `CaseUrl` as `''`; remove them (the feed treats a missing column
as blank).

Sort: `SentDate` descending, then `RecipientKey` descending.

### 2. `Outbound Emails Details`

> Delivery details for one sent email: the address it went to, its latest status and
> reason, communication type and message type. Shown when its activity card is opened.

Sources: `_i4u_UT_OutboundEmails`; `CommunicationReasonRef` (`vBoCommunicationReasonRef`),
**left** join on `CommunicationReasonKey` (a send can have no reason).

Filters: `ID` Equal, required; `RecipientKey` Equal, required, search label `ActivityKey`.

| Alias | Value |
|---|---|
| `ActivityKey` | `RecipientKey` |
| `Additional-To` | `[vBo_i4u_UT_OutboundEmails].[SentTo]` |
| `Additional-Status` | `[vBo_i4u_UT_OutboundEmails].[Status]` |
| `Additional-Type` | `[vBoCommunicationReasonRef].[CommunicationReasonName]` |
| `Additional-Message type` | `[vBo_i4u_UT_OutboundEmails].[MessageTypeName]` |
| `Additional-Last event` | `[vBo_i4u_UT_OutboundEmails].[LastEventDateTime]` |
| `Additional-Last event detail` | `[vBo_i4u_UT_OutboundEmails].[LastEventReason]` (once added; otherwise drop the row) |

Optional: `Additional-Spam`, `Additional-Unsubscribed` (`IsSpam`, `IsUnsubscribed`; shown
as Yes/No on every card).

### 3. `Outbound Email Resends` (core)

> Emails resent to the contact, one row per resend, newest first. Each resend appears as its
> own card in the Recent activity feed.

Sources: `_i4u_UT_OutboundEmails_History`; the sender (left join; on a `Resent` event, the
person who resent it).

| Filter property | Operator | Prompt | Search label |
|---|---|---|---|
| `ID` | Equal | Required | `ID` |
| `EventDate` | Greater than or equal | **Optional** | `StartDate` |
| `EventTypeCode` | Equal `10` | No | |
| `MessageType` | In list `0, 2` | No | |

| Alias | Value |
|---|---|
| `ActivityKey` | `EventKey` |
| `ActivityDate` | `EventDate` |
| `Subject` | `Subject` |
| `CreatedBy` | sender `FullName` |
| `Category` | `'Resend'` |
| `RecordUrl` | expression above, on `[vBo_i4u_UT_OutboundEmails_History]` |

These are all its columns. Earlier builds also returned `Summary`, `Detail`, `Priority`,
`CaseRef` and `CaseUrl` as `''`; remove them.

Sort: `EventDate` descending, then `EventKey` descending.

### 4. `Outbound Email Resends Details`

> Details for one resend: the address the copy went to and the original recipient address.
> Shown when its activity card is opened.

Source: `_i4u_UT_OutboundEmails_History`. Filters: `ID` Equal, required; `EventKey` Equal,
required, search label `ActivityKey`.

| Alias | Value |
|---|---|
| `ActivityKey` | `EventKey` |
| `Additional-To` | `EventReason` (the address the copy went to) |
| `Additional-Original to` | `SentTo` |

### 5. `Outbound Emails History`

> The delivery history of one sent email (queued, delivered, bounced, opened, clicked),
> oldest first. Shown in the email's activity card when it is opened.

Source: `_i4u_UT_OutboundEmails_History`.

| Filter property | Operator | Prompt | Search label |
|---|---|---|---|
| `ID` | Equal | Required | `ID` |
| `RecipientKey` | Equal | Required | `ActivityKey` |
| `EventTypeCode` | Not equal `10` | No | |

| Alias | Value |
|---|---|
| `EventDate` | `EventDate` |
| `Event` | `EventName` |
| `EventDetail` | `EventReason` |
| `EventTone` | expression below |

```sql
CASE
  WHEN [vBo_i4u_UT_OutboundEmails_History].[EventTypeCode] IN (1, 4, 7) THEN 'danger'   -- Dropped, Bounce, Spam Report
  WHEN [vBo_i4u_UT_OutboundEmails_History].[EventTypeCode] IN (2, 5, 6) THEN 'success'  -- Delivered, Open, Click
  WHEN [vBo_i4u_UT_OutboundEmails_History].[EventTypeCode] IN (3, 8)    THEN 'warning'  -- Deferred, Unsubscribe
  ELSE ''                                                                              -- Queued, Generated, Resent
END
```

Sort: `EventDate` ascending, then `EventTypeCode` ascending. The feed reads at most 50.

## Testing

Use contact `104203` (the test send `01A0F508-7F11-7746-909B-3F765ADABBD6`, recipient
`01A0F508-7F6E-7764-8485-2CD894CF5688`, with Queued, Delivered and one Resent to
`info@uhub.org.au`). Expected:

- `Outbound Emails`: the send, dated 1 Oct 2026 11:16, by James Driscoll.
- `Outbound Email Resends`: one row dated 11:26, Category `Resend`.
- `Outbound Emails History` for the recipient key: Queued, Delivered (no Resent).
- `Outbound Email Resends Details`: `To` info@uhub.org.au, `Original to`
  jdriscoll@uhub.org.au.

**Probe:** [Outbound-Emails-IQA-Probe.js](Outbound-Emails-IQA-Probe.js) checks all five
IQAs against this spec. Paste it into the browser console on any iMIS page, signed in as
staff (edit its `config` for another contact). It only sends GET requests, prints a PASS /
WARN / FAIL table and keeps everything it fetched in `window.outboundEmailProbe`. It checks:

- filter names (`QueryParameterDefinition`), `ID` required, `StartDate` optional and
  working, `ActivityKey` required on details and history;
- exactly each core IQA's columns (a missing or misspelt alias fails; a leftover `''`
  padding column warns), unique non-blank keys, readable dates, newest first,
  non-overlapping pages, `TotalCount` (and with `limit=1`);
- `Category` (absent or `Resend`), `RecordUrl` (the native preview for this contact and
  recipient), no HTML, a sender name;
- details: one row, the `Additional-*` labels as returned (also answers the alias-format
  question), the expected fields;
- history: oldest first, no `Resent`, valid `EventTone` matching the event, and the test
  send's Queued → Delivered;
- each resend points at a listed send, and the test resend's address.

Run it again as an ordinary staff account (not SysAdmin) to check access. It was dry-run
against a mock of the five IQAs: all checks pass on a correct mock, and a `Resent` event in
the history or a `Resend` category on an original send are reported as failures.

## Approaches tried and rejected

| Approach | Why not |
|---|---|
| Views with CTEs, `UNION ALL` and `ROW_NUMBER` (one view for sends and resends, keys `<recipient>-R<n>`) | The designer allows joins only |
| Building on the base `CommunicationLog*` tables | Restricted tables: the designer never lists them |
| A new pass-through view over `CommunicationLogEvent` | Custom database views cannot be created |
| `vCommunicationLogEventSummary` / `vBoInteractionLogEventSummary` | Aggregated per email (last year, Advanced Email only); no event rows |
| `vSoaPartyReference` for the iMIS ID | Misses 28 recipient contacts |
| `vSoaUserReference` for the sender | Its `Name` is the login name, not the person's name |
| `vBoNetContactData` for names | Slow |
| `CommunicationReasonRef` joined in the business object | Would not join; joined in the IQA instead |
| A plain-text `Summary`/`Detail` | Only HTML is stored; stripping it in SQL is costly |
| REST (`/api/CommunicationLogRecipient`) for the history | Unconfirmed, and cannot list resends as cards; not needed now |

## Docs status

Done: `Activity-IQA-Specs.md` sections 4.4, 4.6, 5 and 7; the contact-page prototype
(resend as its own card, history without `Resent`, the second source, the popup attribute);
`THEME-ACTIVITY-FEED.md` (`data-record-popup`); the research findings.

Still to do when the history feature moves into the theme: the usage-guide sources and
`query-field-definitions.cjs` (the usage guide does not cover the activity feed today).
