# Activity feed IQAs

Status: draft, 1 October 2026. Specification for step 1 of the
[feed plan](../../../THEME-ACTIVITY-FEED.md#7-implementation-and-acceptance):
the IQAs behind the Recent activity feed (item 32 in this folder's
[README](README.md#activity-feed)). Nothing here is built in iMIS yet.

Section 6 is the setup and client configuration process, written to become
client-facing documentation.

## 1. How the feed uses its IQAs

Each activity type has **two IQAs**:

| IQA | Who maintains it | When it runs | What it controls |
|---|---|---|---|
| **Core IQA**, for example `Interactions` | UnionSuite. Fixed columns; clients do not edit it | When the feed first appears, then as the user pages, filters or widens the date range | The collapsed card (type line, headline, preview, date), the note shown when the card opens, and the View full details button |
| **Details IQA**, for example `Interactions Details` | The client. Add, remove, rename or reorder columns freely | Once per record, the first time a user opens that card | The labelled fields at the top of the opened card (Handled by, Deadline, Workbench…) |

The feed (`US-ACTIVITY-FEED` in `zUnionSuite.js`) calls both with
`GET /api/query`. The core IQAs are merged newest first and paged per source.
A details IQA is asked for one record, filtered on the contact and the
record's `ActivityKey`, and the result is kept for as long as the page is
open, so reopening a card makes no further request.

Why two IQAs: the core set stays identical for every client, so the card
design and paging cannot be broken by a client edit, and the list stays small
and fast because the client's fields are only fetched for the cards someone
opens. Only the records a user actually opens cost a second request.

The six activity types:

| Type | Core IQA | Details IQA | Host `data-type` | Direction |
|---|---|---|---|---|
| Interactions | `Interactions` | `Interactions Details` | `interaction` | — |
| Zidebar notes | `Zidebar Notes` | `Zidebar Notes Details` | `note` | — |
| Outbound calls | `Outbound Calls` | `Outbound Calls Details` | `call` | `out` |
| Outbound emails | `Outbound Emails` | `Outbound Emails Details` | `email` | `out` |
| Outbound email resends | `Outbound Email Resends` | `Outbound Email Resends Details` | `email` | `out` |
| Inbound emails | `Inbound Emails` | `Inbound Emails Details` | `email` | `in` |
| Meetings | `Meetings` | `Meetings Details` | `meeting` | — |

Outbound email resends is a second source on the Emails type (section 4.4),
so the table has seven sources under six filter types.

Folders (decision, 1 October 2026):

| Folder | Holds | Who edits |
|---|---|---|
| `$/_i4u_/SandBox/CRM Layouts/Contact Profile/Activity` | The core IQAs and the history IQAs (fixed column contracts) | UnionSuite only |
| `$/_i4u_/SandBox/CRM Layouts/Contact Profile/Client Activities` | Every details IQA (`… Details`) | Clients |

The host sets `data-us-activity-details-folder` to the client folder (section 5);
the feed runs details IQAs from there and everything else from
`data-us-activity-folder`.

**Both folders are SandBox placeholders.** Before production, move the IQAs to
their production folders and update both host attributes (and the folder in the
checking scripts, section 8 and `Outbound-Emails-IQA-Probe.js`).

A type without a details IQA still works: leave `data-details` off its
source and its cards open to the note and the button only.

## 2. Core IQAs

### 2.1 Columns

Each core IQA returns only the columns its type has data for. A column that
is left out is treated as blank, so never pad an IQA with `''` columns: each
one is sent on every row. Only three things are required:

- `ActivityKey` and `ActivityDate`, both with a value
- `Subject` or `Summary` (either or both columns); each row needs a value in
  one of them

Section 4 gives the exact columns for each type. Values render as plain
text, never HTML.

| Alias | Required | Shown | Rule |
|---|---|---|---|
| `ActivityKey` | Yes, with a value | — | Unique within this IQA, for example the record's Ordinal. The details IQA is filtered on it. Rows without one are skipped |
| `ActivityDate` | Yes, with a value | Date column, month groups | When the activity happened, not when the record was last modified. Return the date/time column itself, not formatted text (the feed reads `YYYY-MM-DD` with an optional time). Rows without a readable date are skipped |
| `Subject` | Subject or Summary | Headline | Only for types with a title or subject |
| `Summary` | Subject or Summary | Preview line | Keep it short, for example `LEFT(…, 300)`. A row with neither a Subject nor a Summary is skipped |
| `Detail` | No | The note, when the card opens | Plain text. Cap it, for example `LEFT(…, 2000)`; the full record stays on its own page |
| `CreatedBy` | No | "by …" on the type line | Who recorded or sent it, or `System` for automated records |
| `Priority` | No | Flag on the type line | Only `High` and `Urgent` show a flag; any other value, including `Normal`, shows none. Leave it out for types without a priority |
| `Category` | No | After the type name on the type line ("INTERACTION · Call") | A sub-type within the source, such as an interaction's Interaction Type. Searchable |
| `FollowUpRequired` | No | Follow-up badge on the type line | `true`, `1` or `yes` makes the record a follow-up task (section 2.4). When the IQA returns this column it alone decides; without it, any `FollowUpDate` makes a task |
| `FollowUpDate` | No | Follow-up badge | The task's deadline. Return the date column itself. A task without one shows **Follow-up** with no date |
| `FollowUpNotes` | No | Under a "Follow-up" heading when the card opens | What needs to be done. Plain text; searchable while the card is collapsed. Shown only on a follow-up task |
| `FollowUpActioned` | No | Follow-up badge | `true`, `1` or `yes` marks the follow-up done |
| `Pinned` | No | Pin at the card’s top left and an amber left edge | `true`, `1` or `yes` marks a pinned record (pinned notes on the Summary page) |
| `DoNotCall` | No | Red no-entry alert icon leading the type line | `true`, `1` or `yes`: the member asked not to be called again, for example on a campaign call |
| `CaseRef`, `CaseUrl` | No | Linked case on the type line | The case reference and its page |
| `RecordUrl` | No | View full details button | The record's own view page. Blank hides the button |
| `Direction` | No | Direction word | `In` or `Out`; only needed to override the host's `data-direction` |

URLs must be same-site `http(s)` addresses or root-relative paths; anything
else is shown as plain text.

There is deliberately no status column: most types have none. A status or
outcome a client wants to show goes in the details IQA
(`Additional-Outcome`).

### 2.2 Filters

| Filter | Name sent | Condition | Required? | Notes |
|---|---|---|---|---|
| Contact | `ID` | the activity's party ID **equals** the value | Required | The host fills the value from `{#query.ID}` |
| Start date | `StartDate` | `ActivityDate` **greater than or equal to** the value | **Optional** | Sent as `YYYY-MM-DD` (today minus 90, 180 or 365 days). **All time sends no StartDate**, so a required filter would fail with HTTP 400 |

The name sent must match the IQA filter's property name, or its Search Label
when one is set; confirm with `GET /api/QueryParameterDefinition?QueryPath=…`.
No other prompted filter may be required.

### 2.3 Sort, uniqueness and paging

- **Sort:** save the IQA sorted by `ActivityDate` descending, then
  `ActivityKey` descending. `/api/query` ignores any sort in the request, and
  paging uses `offset`, so without the tie-break two records with the same
  date can repeat or go missing between pages.
- **One row per activity:** joins that multiply rows (attachments,
  recipients, attendees, linked cases) must be aggregated or left out.
  Duplicates use up the page limit and show as repeated cards.
- **Paging:** the feed asks for `limit=20` per source and `limit=1` for the
  type counts, which read `TotalCount`. Select only the type's columns from
  section 4: every extra column is sent for every row.

### 2.4 Follow-up and pinned flags

An interaction marked for follow-up is a task; a pinned one appears in the
pinned notes on the Summary page. The card shows both on the collapsed type
line, so they come from the core IQA:

| Flag | Shown as | When |
|---|---|---|
| Follow-up open | Neutral badge with a clock: **Follow-up 22 May** (**Follow-up today** on the day; **Follow-up** with no deadline) | A task, not actioned, deadline today, later or blank |
| Follow-up overdue | Amber badge with a clock: **Overdue 12 May** | A task, not actioned, `FollowUpDate` before today |
| Follow-up done | Muted badge with a tick: **Follow-up done** | A task with `FollowUpActioned` true |
| Pinned | Amber pin at the card’s top left, before the type, and an amber left edge on the card, matching the Summary page’s pinned notes. The pin is labelled "Pinned" for screen readers and on hover | `Pinned` true |
| Do not call | Red no-entry icon leading the type line (after the pin, when both), labelled "Do not call" | `DoNotCall` true |

A follow-up is a badge because it carries a date and a state; pinned is an
icon because it carries neither. Searching "follow-up" or "pinned" finds
these records, and while Interactions is chosen a pin toggle at the end of
the search field shows pinned records only, paging on until enough are
found. Other types leave these columns out.

A record is a task when `FollowUpRequired` is true. A `FollowUpRequired` of
false hides the badge and the follow-up notes even when a date or notes
are stored. `FollowUpNotes` shows in the opened card under a **Follow-up**
heading, before the record's own note.

## 3. Details IQAs

### 3.1 Columns

| Column | Rule |
|---|---|
| `Additional-<Label>` | Any number, any order. Each becomes one field in the opened card, labelled with the text after `Additional-` |
| Anything else | Ignored by the feed. The key and filter columns can stay in the display list |

- **Labels:** the text after the prefix is shown as written, so
  `Additional-Handled by` shows **Handled by**. A name without spaces is
  split into words: `Additional-HandledBy` also shows **Handled by**, and
  acronyms keep their capitals (`Additional-EBAClause` shows **EBA clause**).
  `Additional_` with an underscore also works.
- **Order:** fields appear in the IQA's display column order.
- **Blank values** are left out for that record, so an optional field only
  appears when it has a value.
- **Dates** show as `22 May 2026`, with the time when it is not midnight
  (`12 May 2026, 5:00 pm`). Return the date column itself, not formatted text.
- **True/false** values show as Yes and No.
- **Everything else** is shown as text, exactly as returned. Format numbers
  and codes in the IQA if they need it.

Confirmed in iMIS (1 October 2026, `Outbound Email Resends Details`): an alias
with a hyphen and a space (`Additional-Original to`) comes back from
`/api/query` exactly as written, and the columns came back in display order
(section 7, question 1).

### 3.2 Filters

| Filter | Name sent | Condition | Required? |
|---|---|---|---|
| Contact | `ID` | the record's party ID **equals** the value | Required |
| Record | `ActivityKey` | the column that the core IQA returns as `ActivityKey` **equals** the value | Required |

Give the record filter the Search Label `ActivityKey` if the underlying
column has another name (for example Ordinal). Both filters are sent every
time: the contact filter keeps a key that is only unique per contact (a
party-linked Ordinal) pointing at the right record.

The IQA should return one row. If it returns several, the first is used.

### 3.3 Loading, errors and search

- The card opens straight away; its fields show "Loading details…" until the
  details arrive, then replace it.
- If the details IQA fails, the card says so with a **Retry** button. The
  note and View full details still show.
- If it returns no row, or only blank values, the card shows no fields.
- Search covers the core columns of every loaded card: Subject, Summary,
  the full `Detail` note, CreatedBy, Category and CaseRef. The note is part of
  every card from the start (hidden until the card opens), so a word that
  appears only in the note finds the card while it is collapsed. Search does
  not open the card.
- Details fields are searchable only for cards already opened; search never
  loads them. Put anything staff need to search on into the core columns,
  usually the note.

## 4. The six types

The business objects behind every type except Interactions and outbound
emails are not yet confirmed (section 7, question 2). Each table is the
type's complete core column list: build exactly these, and leave out a row
marked "if tracked" when the source has no such field. Suggested details
columns follow each table.

### 4.1 Interactions

Source: `i4u_UT_Interactions`.

| Core alias | Source | Example |
|---|---|---|
| `ActivityKey` | `Ordinal` | `3107` |
| `ActivityDate` | Interaction date and time | `2026-05-08T16:20:00` |
| `Subject` | Title, if tracked | |
| `Summary` | Note, first 300 characters | Submitted through the member portal: leaving nursing to travel from July. |
| `Detail` | Full note, capped | |
| `CreatedBy` | Staff member who recorded it; `System` or `Member portal` for automated rows | Member portal |
| `Category` | Interaction Type (Call, Email, In Person, Note, Other, Site Meeting…) | Other |
| `Priority` | Priority | `Urgent` |
| `FollowUpRequired` | `FollowUpRequired` | `true` |
| `FollowUpDate` | `FollowUpDate` (the deadline) | `2026-05-22` |
| `FollowUpNotes` | `FollowUpNotes` (what needs to be done) | Confirm the last shift with the ward manager. |
| `FollowUpActioned` | `FollowUpActioned` | `false` |
| `Pinned` | Pin Interaction | `true` |
| `CaseRef` | The linked case's `CaseID`, through `CaseOrdinal` (below) | `C202` |
| `CaseUrl` | `/Cases_ManageCase?CaseID=<CaseID>&CaseNum=<case Ordinal>`, or `''` with no case | `/Cases_ManageCase?CaseID=C202&CaseNum=198` |
| `RecordUrl` | Interaction view page | |

The interaction holds only the case's Ordinal (`CaseOrdinal`), and the link
needs both values, so join the cases table. Use a LEFT join, so interactions
without a case are kept, and test the joined row, so a missing case gets no
link:

```sql
SELECT
    i.[Ordinal]  AS [ActivityKey],
    i.[Date]     AS [ActivityDate],
    c.[CaseID]   AS [CaseRef],
    CASE WHEN c.[Ordinal] IS NULL THEN ''
         ELSE '/Cases_ManageCase?CaseID=' + c.[CaseID]
              + '&CaseNum=' + CAST(c.[Ordinal] AS varchar(20))
    END          AS [CaseUrl]
FROM vBoi4u_UT_Interactions AS i
LEFT JOIN i4u_UT_Cases AS c
    ON c.[Ordinal] = i.[CaseOrdinal]
```

A join rather than a subquery per column: the case row is read once for
both values, and a duplicate `Ordinal` in the cases table cannot fail the
query (keep `Ordinal` unique there; a duplicate would repeat the
interaction). In an IQA, add the cases business object as a second source
with a left outer relation on `CaseOrdinal` = `Ordinal`.

Suggested details: `Additional-Handled by`, `Additional-Workbench`,
`Additional-Attachments`.

If calls or meetings are stored as interactions of a particular type, filter
them out here so nothing appears twice.

### 4.2 Zidebar Notes

Built the same way as Interactions: one row per note, filtered on the note's
party ID.

| Core alias | Source | Example |
|---|---|---|
| `ActivityKey` | Note Ordinal | `812` |
| `ActivityDate` | Note date and time | `2026-05-11T09:30:00` |
| `Subject` | Note title, if tracked | Roster change agreed |
| `Summary` | Note text, first 300 characters | Manager agreed to move the member off night shifts from June. |
| `Detail` | Full note text, capped | |
| `CreatedBy` | Staff member who wrote it | A. Smith |
| `Priority` | Priority, if tracked | |
| `CaseRef`, `CaseUrl` | Linked case, if tracked | |
| `RecordUrl` | `/_i4u_/Core/Zidebar/NoteDetails.aspx?NoteOrdinal=` plus the Ordinal (section 7, question 3) | |

Suggested details: `Additional-Category`, `Additional-Visible to member`,
`Additional-Attachments`.

### 4.3 Outbound Calls

The call form has two free-text fields, Call Summary (1,000 characters) and
Additional Notes (4,000). Both go in the core IQA, so both are searchable
while the card is collapsed:

| Core alias | Source | Example |
|---|---|---|
| `ActivityKey` | Call record key | `5521` |
| `ActivityDate` | Call start time | `2026-05-12T10:15:00` |
| `Summary` | Call Summary, in full (it is clamped to two lines while collapsed and shown in full when the card opens) | No answer; voicemail about the $185.00 still outstanding. |
| `Detail` | Additional Notes, in full or capped (see below). The host source sets `data-detail-label="Additional notes"`, so the notes are headed when the card opens; a call without notes shows no heading | |
| `CreatedBy` | Caller | J. Patel |
| `Priority` | Priority | `High` |
| `FollowUpDate`, `FollowUpActioned` | Follow Up and Follow Up Date | |
| `DoNotCall` | Do Not Call | `true` |
| `RecordUrl` | Call view page | |

At full length a page of 20 calls is up to about 100 KB. If very long notes
are common, cap `Detail` (for example `LEFT(…, 2000)`); View full details
shows the rest, but search then misses the cut-off part.

Suggested details: `Additional-Call rating`, `Additional-Outcome` (Left
message, Completed), `Additional-With`, `Additional-Duration` (as display
text, for example `14m 05s`), `Additional-Phone number`.

### 4.4 Outbound Emails

Each **send** is its own card: the original send and every resend. The
business objects, joins, criteria and column mappings are in
[Outbound-Emails-Build.md](Outbound-Emails-Build.md); this section is the
contract. Two sources share the Emails type and its count:

| Source | Core IQA | One card per | `ActivityKey` | `Category` |
|---|---|---|---|---|
| `emails-out` | `Outbound Emails` | recipient row (an original send) | the recipient key | — (left out) |
| `emails-resent` | `Outbound Email Resends` | `Resent` event | the event key | `Resend` |

iMIS records a resend as a `Resent` event on the original recipient row, with
the address the copy went to in the event's reason, so the resend source reads
the events table. Only message types Email (0) and AdvancedEmail (2) are
included, and a send with no address (queued only) is left out.

| Core alias | Source | Example |
|---|---|---|
| `ActivityKey` | Recipient key (original) or event key (resend) | |
| `ActivityDate` | The send's own time: the recipient row's created time, or the resend event's time | `2026-05-10T08:00:00` |
| `Subject` | Email subject | Overdue payment reminder – Q1 2026 |
| `CreatedBy` | The sender's full name | James Driscoll |
| `Category` | `'Resend'`, on `Outbound Email Resends` only | Resend |
| `RecordUrl` | The native email preview (below) | |

No `Summary` or `Detail`: only HTML bodies are stored (section 7, question
4), so the full email opens in the preview instead.

`RecordUrl` is a custom expression built from the keys:
`/iParts/Common/InteractionLog/InteractionPreview.aspx?CommunicationLogId=<log key>&PartyId=<ID>&RecipientId=<recipient key>`.
Both email sources set `data-record-popup="true"`, so View full details opens it
in the native iMIS popup, where the full email text is shown.

Details (the metadata in an opened card): `Additional-To` (the address sent
to), `Additional-Status` (the latest delivery event), `Additional-Type` (the
communication reason), `Additional-Message type`, `Additional-Last event`,
`Additional-Last event detail` (the reason behind the latest status, such as a
bounce reason). On a resend, `Additional-To` is the address the copy went to and
`Additional-Original to` the original recipient's. Attachments and a campaign are
not included (no campaign data exists on sent emails).

The business objects (`_i4u_UT_OutboundEmails`, `_i4u_UT_OutboundEmails_History`)
are built on iMIS views, because the business object designer cannot use the
`CommunicationLog` tables; their definitions and the five IQAs are in
[Outbound-Emails-Build.md](Outbound-Emails-Build.md).

### 4.5 Inbound Emails

Shares the Emails type filter and count with Outbound Emails.

| Core alias | Source | Example |
|---|---|---|
| `ActivityKey` | Received email key | `4410` |
| `ActivityDate` | Received time | `2026-05-08T16:25:00` |
| `Subject` | Email subject | Resignation |
| `Summary` | Plain-text preview, first 300 characters | Leaving nursing to travel from July; please confirm the next steps. |
| `Detail` | Plain-text body, capped | |
| `CreatedBy` | Staff member or team it was assigned to | Membership team |
| `RecordUrl` | Email view page | |

Suggested details: `Additional-From`, `Additional-Attachments`.

If inbound and outbound mail share one business object, build both core IQAs
from it with opposite direction criteria.

### 4.6 Meetings

| Core alias | Source | Example |
|---|---|---|
| `ActivityKey` | Meeting key | `770` |
| `ActivityDate` | Start time | `2026-05-06T17:30:00` |
| `Subject` | Meeting title | Grievance meeting with the employer |
| `Summary` | Outcome or notes, first 300 characters | Employer agreed to review overtime rostering on the ward. |
| `Detail` | Full notes, capped | |
| `CreatedBy` | Organiser or staff lead | M. Chen |
| `CaseRef`, `CaseUrl` | Linked case | |
| `RecordUrl` | Meeting view page | |

Suggested details: `Additional-Outcome`, `Additional-Attendees` (one line; aggregate, never one
row per attendee), `Additional-Duration`, `Additional-Location`.

Filter the contact on attendance, so a meeting shows on every attendee's
feed.

### 4.6 Sent email delivery history (proposed)

Design only, in the prototype (`US-ACTIVITY-EVENTS`, item 37 in the
README); not in the theme yet. A sent email send has several delivery
events (queued, delivered, bounced, opened). Each send is its own card (a
resend is a separate card, section 4.4), so the history shows only **that
send's** events, inside the opened card under a "Delivery history" heading,
between the details fields and the note.

They come from a third IQA per source, `Outbound Emails History`, named on
the host with `data-events` (heading: `data-events-label`). It is run for
one record when its card opens, beside the details IQA, with the same two
filters (`ID` and `ActivityKey`, both required), and returns one row per
event, sorted oldest first, then by event type (the feed reads at most 50).
For an original send it filters on the recipient key and leaves out the
`Resent` event, which is the resend's own card; the resend source has no
history IQA. Events that arrive after a resend (a later bounce, say) are
listed on the original, as events carry no link to a particular send.

| Column | Required | Shown as |
|---|---|---|
| `EventDate` | Yes | "10 Sep, 1:00 pm"; the time is left out at midnight. Return the date/time column itself |
| `Event` | Yes | The event, for example `Queued`, `Delivered`, `Bounce`, `Open`. Rows without one are skipped |
| `EventDetail` | No | A short note under the event, for example the bounce reason |
| `EventTone` | No | `danger` (red dot and text, for a bounce), `success` (green dot, for a delivery) or `warning` |

`EventTone` is a custom expression on the event type code: Dropped, Bounce and
Spam Report are `danger`; Delivered, Open and Click are `success`; Deferred
and Unsubscribe are `warning`; Queued, Generated and Resent are blank.

An email without attempts shows no history. Like the details, the
history is not searchable until its card has been opened.

## 5. Host iPart

A Query Template Display on the Activity tab whose IQA returns one row, the
viewed contact, filtered on the page's `ID`. Its Query Template field:

```html
<div class="us-activity-feed"
     data-us-activity-folder="$/_i4u_/SandBox/CRM Layouts/Contact Profile/Activity"
     data-us-activity-filter="ID" data-us-activity-value="{#query.ID}"
     data-us-activity-details-folder="$/_i4u_/SandBox/CRM Layouts/Contact Profile/Client Activities"
     data-us-activity-start="StartDate" data-us-activity-days="90">
  <ul class="us-activity__sources" hidden>
    <li data-source="interactions" data-query="Interactions" data-details="Interactions Details" data-type="interaction"></li>
    <li data-source="zidebar-notes" data-query="Zidebar Notes" data-details="Zidebar Notes Details" data-type="note"></li>
    <li data-source="calls-out" data-query="Outbound Calls" data-details="Outbound Calls Details" data-detail-label="Additional notes" data-type="call" data-direction="out"></li>
    <li data-source="emails-out" data-query="Outbound Emails" data-details="Outbound Emails Details" data-type="email" data-direction="out" data-record-popup="true"></li>
    <li data-source="emails-resent" data-query="Outbound Email Resends" data-details="Outbound Email Resends Details" data-type="email" data-direction="out" data-record-popup="true"></li>
    <li data-source="emails-in" data-query="Inbound Emails" data-details="Inbound Emails Details" data-type="email" data-direction="in"></li>
    <li data-source="meetings" data-query="Meetings" data-details="Meetings Details" data-type="meeting"></li>
  </ul>
</div>
```

| Attribute | On | Purpose |
|---|---|---|
| `data-us-activity-folder` | Feed | Folder of the core IQAs |
| `data-us-activity-details-folder` | Feed | Folder of the details IQAs (the client folder, `…/Contact Profile/Client Activities`). Optional; defaults to the core folder. History IQAs (`data-events`) always run from the core folder |
| `data-query` | Source | Core IQA name |
| `data-details` | Source | Details IQA name. Optional; leave it off for a type with no details |
| `data-events`, `data-events-label` | Source | Proposed (section 4.6): the attempt history IQA and its heading. Optional |
| `data-detail-label` | Source | A heading above the `Detail` note when the card opens, for example `Additional notes` on calls. Optional; shown only on records that have a note |
| `data-record-popup` | Source | `true`, `1` or `yes`: View full details opens `RecordUrl` in the native iMIS popup (`ShowDialog_NoReturnValue`, 80% × 80%, titled with the Subject) instead of navigating. Same-site URLs without a fragment only; otherwise, or without the popup service, the link navigates. Optional; used for the email preview page |
| `data-history` | Source | The IQA page for that type, for "View all calls". Optional |
| `data-us-activity-history` | Feed | The full history page. Optional |

## 6. Setup and client configuration process

Draft wording for client documentation. Steps 1–4 are UnionSuite setup;
steps 5–7 are what a client does to change the fields shown in an opened
activity card.

### Setting up the feed (UnionSuite)

1. **Create the core IQAs** (and any history IQAs) in the activity folder,
   one per type, with the columns in section 2.1, the filters in 2.2 and the
   sort in 2.3. Do not give clients edit access to these.
2. **Create a starter details IQA** for each type (section 3) in the client
   folder, filtered on `ID` and `ActivityKey`. Include any fields every client
   wants, as `Additional-` columns.
3. **Add the host iPart** on the contact page's Activity tab (section 5).
4. **Check each IQA** with section 8.

### Changing the fields in an opened card (client)

5. **Open the details IQA** for the activity type in the client folder
   (`…/Contact Profile/Client Activities`), for example `Interactions Details`. Do not edit the IQA without "Details" in its name:
   it controls the card layout and paging.
6. **To add a field,** add a display column and set its alias to
   `Additional-` followed by the label to show, for example
   `Additional-Deadline` or `Additional-Handled by`. The field appears in
   every opened card of that type that has a value for it.
   - To remove a field, remove the column.
   - To rename one, change the text after `Additional-`.
   - To reorder them, reorder the display columns.
   - Return dates as date columns so they show as `22 May 2026`.
   - Keep each field short: long text belongs in the note or on the record's
     own page.
7. **Save the IQA and reload the contact page.** Open a card of that type to
   see the change. No theme or page change is needed.

A details IQA must keep its two filters (`ID` and `ActivityKey`) and must
return at most one row per record. Columns without the `Additional-` prefix
are not shown, so key and helper columns can stay in the display list.

## 7. Open questions

1. **Alias format.** Answered (1 October 2026): `Additional-Original to` came
   back from `GET /api/query` exactly as written, hyphen and space included,
   and in display column order (`ActivityKey`, `Additional-To`,
   `Additional-Original to`). One three-column IQA is not proof that order is
   always kept, so keep the feed's own ordering by the returned keys.
2. **Source business objects.** `i4u_UT_Interactions` is confirmed, and sent
   emails are (1 October 2026): `CommunicationLog`, `CommunicationLogRecipient`
   and `CommunicationLogEvent`, behind the custom business objects `_i4u_UT_OutboundEmails` and
   `_i4u_UT_OutboundEmails_History` ([Outbound-Emails-Build.md](Outbound-Emails-Build.md)).
   Which objects hold Zidebar notes, calls, received emails and meetings, and
   are any of them interactions of a particular type?
3. **Zidebar note page.** Does `NoteDetails.aspx` open a contact's note from
   `NoteOrdinal` alone, or does it also need the contact ID (the Agreement
   page passes `AgreementID`)?
4. **Email bodies.** Answered for sent emails (1 October 2026): only HTML is
   stored (`Text` is empty on 159 of 160 logs), so the email IQAs return no
   `Summary` or `Detail` and the full email opens in the native preview popup. The feed shows
   text only; stripping HTML in SQL is costly on large histories.
5. **Zidebar tasks and pins.** Can Zidebar notes also be follow-up tasks
   (`&Task=true`) or pinned? If so, their core IQA returns the same three
   columns as Interactions.
6. **Details folder.** Answered (1 October 2026): yes. Every details IQA lives
   in `$/_i4u_/SandBox/CRM Layouts/Contact Profile/Client Activities`, set with
   `data-us-activity-details-folder`; core and history IQAs stay in
   `…/Contact Profile/Activity`.
7. **View pages.** The destination for each `RecordUrl`, `CaseUrl`, the full
   history page and each type's "View all" page. Sent emails are settled: the
   native preview, `/iParts/Common/InteractionLog/InteractionPreview.aspx`,
   in a popup (`data-record-popup`).

## 8. Checking the IQAs

Run from the browser console on the dev site, signed in as a staff member,
with a contact that has a long history.

```javascript
const token = document.querySelector('#__RequestVerificationToken')?.value;
const folder = '$/_i4u_/SandBox/CRM Layouts/Contact Profile/Activity/';
const run = async (name, extra = {}) => {
  const params = new URLSearchParams({QueryName: folder + name, ID: '104019', limit: '20', offset: '0', ...extra});
  const started = performance.now();
  const response = await fetch('/api/query?' + params, {
    headers: {Accept: 'application/json', RequestVerificationToken: token}
  });
  const data = await response.json();
  const rows = data.Items?.$values ?? data.Items;
  console.log(name, response.status, Math.round(performance.now() - started) + 'ms',
    'TotalCount', data.TotalCount, rows);
  return rows;
};
const rows = await run('Interactions');
await run('Interactions', {StartDate: '2026-07-02'});
await run('Interactions Details', {ActivityKey: rows[0].ActivityKey, limit: '1'});
```

Core IQAs:

| Check | Pass |
|---|---|
| Filters | `QueryParameterDefinition` lists `ID` (required) and `StartDate` (optional), and nothing else required |
| No start date | A request without `StartDate` returns 200, not 400 |
| Start date | Every row's `ActivityDate` is on or after it; `TotalCount` falls |
| Columns | Exactly the type's columns from section 4, aliases spelt as written (a misspelt optional alias silently shows nothing); every row has a key, a readable date and a Subject or Summary; no `''` padding; no HTML |
| Order | Newest first; equal dates in the same order on repeated runs |
| Paging | `offset=0,limit=10` then `offset=10,limit=10` gives the same 20 rows as `offset=0,limit=20` |
| Uniqueness | No repeated `ActivityKey` across all pages |
| Access | The same calls succeed for an ordinary staff account |
| Speed | Time `limit=20` and `limit=1` on the largest histories, for comparison with the current UNION query |

Details IQAs:

| Check | Pass |
|---|---|
| Filters | `ID` and `ActivityKey` are both required and named exactly so |
| One record | A known key returns exactly one row; an unknown key returns none |
| Columns | Every shown column's name starts with `Additional-`; the prefix and label come back as written |
| Order | The columns come back in display order |
| Speed | One record returns quickly on the largest histories |
