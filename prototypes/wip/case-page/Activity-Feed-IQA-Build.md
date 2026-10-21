# Case activity feed: IQA build notes

Build notes for the IQAs behind the case page's activity timelines (owner,
21 October 2026): the Overview's Recent activity, the Activity tab's All
activity and its Changes section. All three are the theme's activity feed
(`US-ACTIVITY-FEED`): a one-row Query Template that names a folder of source
IQAs, each read through `GET /api/query`, merged newest first.

Status (21 October 2026): not built. The column contract below is the
theme's (the `US-ACTIVITY-FEED` header in `zUnionSuite.js`); the sample rows
in `case-page.js` follow it.

## Folders

| Folder | Holds | Who changes it |
| --- | --- | --- |
| `$/_i4u_/Core/Cases/Layouts v2/Activity Feed - Base` | The base IQAs: Notes, Emails Out, Emails In, Meetings, Attachments, Changes. One row per record, in the feed's fixed columns. | Fixed: the theme reads these columns by name. |
| `$/_i4u_/Client/Cases - UnionSuite/Layouts/Activity Feed - Details` | The details IQAs: Notes Details, Emails Details, Meetings Details. One row per record, read when its card first opens. | The client: add or remove `Additional-*` columns freely. |

The templates point at them with `data-us-activity-folder` (base) and
`data-us-activity-details-folder` (details). Recent activity, All activity
and Changes all use the same base IQAs: Recent activity's 30 days is the
theme's fixed window (`data-us-activity-window="30"`), sent as `StartDate`,
so there is no Last 30 Days folder.

## Rules for every base IQA

- **Filters, both prompted and named exactly** (the feed sends them by name;
  check with `GET /api/QueryParameterDefinition?QueryPath=…`):
  - `CaseNum`: the case's `Ordinal`, Equal. Not `@url`: the feed passes it.
  - `StartDate`: the record's date, Greater than or equal. Optional: the
    feed leaves it out for All time, so the IQA must run without it.
- **Sort:** `ActivityDate` descending, then the record's ordinal
  descending, so paging is stable when two records share a time.
- **Access:** available through the REST API (the feed calls
  `GET /api/query` with `limit` and `offset`, and reads `TotalCount` for the
  type counts).
- **One row per record.** No joins that repeat a record (one row per tag or
  per recipient): put lists in one column, or in the details IQA.
- **Column names are the aliases below, exactly.** Unused optional columns
  can be left out.
- **Values are text.** The feed shows every value as plain text, never HTML.

### The fixed columns

| Column | Required | Holds |
| --- | --- | --- |
| `ActivityKey` | yes | The record, unique within its IQA: a letter for the type then the ordinal (`n940`, `e12`, `m40`, `f805`, `c6`). The details IQA is filtered on it, and the restricted-note check reads the note ordinal from its digits. |
| `ActivityDate` | yes | Date and time of the record (server local time, as `/api/query` returns it). Sorts the timeline; the time shows on the card. |
| `Subject` | one of the two | The card's headline. |
| `Summary` | one of the two | The line under the headline, or the headline when there is no Subject. |
| `Detail` | no | Longer text, shown when the card opens (the source's `data-detail-label` heads it). |
| `CreatedBy` | no | Who added it, by name. |
| `Category` | no | A sub-type shown after the type ("Note · Employer"). |
| `Priority` | no | `High` or `Urgent` shows a flag; anything else is ignored. |
| `RecordUrl` | no | The record's own page, for the card's View button (same site only). |
| `Direction` | no | `In` or `Out`; overrides the source's own direction. |
| `FollowUpRequired`, `FollowUpDate`, `FollowUpActioned`, `FollowUpNotes` | no | A note converted to a task: the follow-up badge, and its notes when the card opens. |

## The base IQAs

### Notes

Every note on the case, tasks included (a task is a note with a follow-up).

On a task, the note's **FollowUpNotes is the task itself**, what needs
doing, and its note text is a general note or details about the task (owner,
21 October 2026; the same as the task lists, where FollowUpNotes is the
title). So a task's card leads with the task: it is the `Subject`, the note
text the line under it.

| Column | From |
| --- | --- |
| `ActivityKey` | `'n' + ` the note's `Ordinal` |
| `ActivityDate` | when the note was added (date and time) |
| `Subject` | a task's FollowUpNotes (what needs doing); blank for a plain note |
| `Summary` | the note text, **or the literal `Restricted` for a restricted note** |
| `Category` | the note's category |
| `Priority` | `High` for a high-priority note, else blank |
| `CreatedBy` | the author's name |
| `FollowUpRequired` | `true` / `false` |
| `FollowUpDate` | the follow-up (due) date |
| `FollowUpActioned` | `true` once done |
| `FollowUpNotes` | blank (select `''`): the task is already the `Subject`, and the card would repeat it under a Follow-up heading when opened |
| `RecordUrl` | optional: the note's page |

A custom SQL expression for `Subject`, where `<FollowUpRequired>` and
`<FollowUpNotes>` are the note's columns:

```sql
CASE WHEN <FollowUpRequired> = 1 THEN ISNULL(<FollowUpNotes>, '') ELSE '' END
```

Restricted notes must come back with `Summary` = `Restricted` and no text
anywhere else in the row (`Subject`, `Detail` and `FollowUpNotes` blank,
so a restricted task shows no task text either): the IQA is the only thing
standing between the note and everyone who can open the case. The card then
offers Show note, which asks CloudToolz `/ca/note-access` with the note
ordinal. The starting point is the existing
`$/_i4u_/Core/Cases/Manage Case/Case Notes`.

### Emails Out and Emails In

One IQA per direction, so the feed can page each (the type filter shows them
together as Emails).

| Column | Emails Out | Emails In |
| --- | --- | --- |
| `ActivityKey` | `'e' + ` the email's key | `'e' + ` the email's key (unique across both) |
| `ActivityDate` | when it was sent | when it was received |
| `Subject` | the email's subject | the email's subject |
| `Summary` | `To ` + the recipients' names | `From ` + the sender (`· 2 attachments` when it has any) |
| `CreatedBy` | the sender (staff) | who logged it |
| `RecordUrl` | the email preview (`InteractionPreview.aspx?…`, as the contact page's outbound emails) | the logged email |

Open: where case emails are stored and how they are linked to the case
(README open decision 5). The contact page's outbound emails build
(`prototypes/wip/contact-page-v3/Outbound-Emails-Build.md`) covers the
sent-email side.

### Meetings

| Column | From |
| --- | --- |
| `ActivityKey` | `'m' + ` the meeting's `Ordinal` |
| `ActivityDate` | the meeting's date and start time (midnight when it has no time) |
| `Subject` | the meeting title: `Title`, or `MeetingType – Matter` when it has none (the `MeetingTitle` expression in `templates/Case-Meetings-Query-Template.html`) |
| `Summary` | optional: one line, such as the location |
| `Detail` | the description or agenda (headed Description on the card) |
| `CreatedBy` | who added it |
| `RecordUrl` | optional: the meeting's page |

A future meeting dates the card in the future, so it sorts above today's
records. Starting point: `Manage Case - Meetings - All`.

### Attachments

| Column | From |
| --- | --- |
| `ActivityKey` | `'f' + ` the file's `Ordinal` |
| `ActivityDate` | when it was uploaded |
| `Subject` | the file name |
| `Summary` | its tags, joined with ` · ` (one row per file, not per tag) |
| `CreatedBy` | who uploaded it |

Starting point: the case's CloudFiles storage IQA with its tags.

### Changes

The Changes section's only source: one row **per save**, not per field.

| Column | From |
| --- | --- |
| `ActivityKey` | `'c' + ` the save's key |
| `ActivityDate` | when it was saved |
| `Subject` | the broad kind: `Case created`, `Case updated`, `Party added`, `Staff added`, `Staff updated`, `Staff removed`, `Case linked` … |
| `Summary` | what it touched: the fields (`Priority, Incident date`) or the person (`Lee Hartley (20871)`) |
| `Detail` | one `Field: old → new` per line, lines separated by `CHAR(10)`; `Empty` for a blank old or new value |
| `CreatedBy` | who saved it |

Open: whether the history table records a save key that groups a save's
field changes, or the IQA groups by user and time (README open decision 6).

## The details IQAs

In the Client folder. Each is filtered on `CaseNum` and `ActivityKey` (both
prompted, Equal) and returns one row. Every column whose name starts with
`Additional-` is a labelled line when the card opens, in column order; the
label is the text after the prefix; blank values are left out; dates read
"22 May 2026" and true/false Yes/No.

| IQA | Suggested columns |
| --- | --- |
| Notes Details | `Additional-Staff` (staff the note is assigned to), `Additional-Members` (members it is assigned to) |
| Emails Details | `Additional-From`, `Additional-To`, `Additional-Cc`, `Additional-Bcc` |
| Meetings Details | `Additional-Location`, `Additional-Attendees` |

A restricted note's details IQA must return nothing beyond the assignees.

## The placeholder IQA

Each of the three feed iParts is a Query Template Display on a one-row case
IQA filtered on `@url:CaseID`, selecting the case's `Ordinal` unaliased
(`{#query.Ordinal}` in the templates). It returns nothing else.
