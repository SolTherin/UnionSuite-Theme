# Agreement field panels: IQA build notes

Build notes for the four IQAs that feed the agreement's field panels: Summary
and Key dates on Overview, Agreement details and Resolution on Details
(layout v2, `index-v2.html`; the current layout keeps them all on Overview,
without Summary). Each panel is laid out by its IQA's column
names (candidate B2, `US-FIELD-GROUPS` in `theme-candidate.js`); the rules are
in [templates/Agreement-Field-Groups-Query-Template.html](templates/Agreement-Field-Groups-Query-Template.html).

Status (3 October 2026): not built. The column sources below come from the
existing IQAs as decoded from `Claude\sandbox-bulk-export.xml` (exported in
June 2026) with `Claude\iqa-blob-parser`. Check them against the live
definitions before building.

## Approach

Build four **new** IQAs, three by copying the existing ones, then re-alias and add
columns. Do not edit the existing IQAs: the live Manage Agreement page still
renders from them, and the new panels use them unchanged as the iPart source.

| Panel | Existing IQA (iPart source, unchanged) | New IQA (read by the loader) |
| --- | --- | --- |
| Agreement details | `$/_i4u_/SandBox/CA/Data - Manage Agreement - Agreement Details` | `$/_i4u_/SandBox/CA/Agreement Details` |
| Key dates | `$/_i4u_/SandBox/CA/Data - Manage Agreement - Key Dates` | `$/_i4u_/SandBox/CA/Agreement Key Dates` |
| Resolution | `$/_i4u_/SandBox/CA/Data - Manage Agreement - Resolution` | `$/_i4u_/SandBox/CA/Agreement Resolution` |
| Summary | `$/_i4u_/SandBox/CA/Query Template - Manage Agreement - Banner Primary` (any one-row IQA on `@url:AgreementID`) | `$/_i4u_/SandBox/CA/Agreement Summary` (new, not a copy) |

The SandBox folder is a placeholder; when it changes, update the
`data-us-fields-query` attribute in each panel's template too.

## Shared rules

- **Filter.** The existing IQAs filter `AgreementID` Equal `@url:AgreementID`,
  a URL parameter. The loader calls `GET /api/query` with a named filter, so
  the new IQAs need a prompted filter instead. It uses the agreement's
  `Ordinal`, the table's key, which the page URL carries as `AgreementNum`
  (owner, 3 October 2026: key on the ordinal where possible; `AgreementID`
  stays the identifier people read):

  | Filter property | Operator | Prompt | Search label |
  | --- | --- | --- | --- |
  | Agreements `Ordinal` | Equal | Required | `AgreementNum` |

  The panels send `AgreementNum` from the page URL
  (`data-us-fields-filter="AgreementNum"`); the search label is the name
  `/api/query` matches. Confirm it with
  `GET /api/QueryParameterDefinition?QueryPath=…`.
- **Aliases are the layout.** Column order is display order. `Group-Label`
  puts a field under a sub-heading, `1-Label` starts a new line with no
  sub-heading, `Tone-Label` colours the field Label as a badge, and
  `Alert-Title` / `Alert-Message` / `Alert-Tone` make the status alert;
  `Alert-Only` true shows the alert without the fields.
  Spaces and hyphens in aliases are fine: the activity feed details IQAs use
  the same form (`Additional-Handled by`).
- **Only displayed columns.** Every column is shown, so leave out keys
  (`Ordinal`, `StaffLeadID`) and anything not meant for the panel.
- **Values.** Return dates as dates (the loader formats them). Blank shows —.
- **Expressions** reference a business object by its view name, as the IQA
  designer writes them: `[vBoI4u_UT_CA_CollectiveAgreements].[Status]`.

## 1. `Agreement Details`

> One agreement's details for the Overview's Agreement details panel, laid
> out by column name.

Copy of `Data - Manage Agreement - Agreement Details`. Sources (all as now):

| Source | Alias | Join |
| --- | --- | --- |
| `I4u_UT_CA_CollectiveAgreements` | Agreements | — |
| `_I4u_UT_CA_AgreementTags` | Tags | left, `Ordinal = AgreementOrdinal` |
| `_i4u_UT_Contact_Name` | LeadStaff | left, `StaffLeadID = ID` |
| `i4u_UT_Workbench` | Workbench | left, `Workbench = Ordinal` |

Filter: `AgreementNum` as above (replaces the URL filter).

| Alias | Value |
| --- | --- |
| `Agreement number` | Agreements `AgreementID` |
| `Type` | Agreements `Type` |
| `Status` | Agreements `Status` |
| `Tone-Status` | Status tone expression (below) |
| `Lead staff` | LeadStaff `FULL_NAME` |
| `Coverage-Industry` | Agreements `Industry` |
| `Coverage-Sector` | Agreements `Sector` |
| `Coverage-Workbench` | Workbench `WorkbenchName` |
| `Classification-Tags` | Tags `Tags` |
| `Classification-Subtags` | Tags `Subtags` |
| `1-Agreement link` | Link expression (below) |

The group names (Coverage, Classification) are a proposal; rename or drop the
prefixes freely.

**`Tone-Status`**, the same tones as the banner's status pill (A6):

```sql
CASE
  WHEN [vBoI4u_UT_CA_CollectiveAgreements].[Status] IN ('Active', 'Approved', 'Signed', 'Ratified', 'Finalised', 'Completed') THEN 'success'
  WHEN [vBoI4u_UT_CA_CollectiveAgreements].[Status] IN ('Pending', 'Draft', 'New', 'Open', 'In progress', 'Negotiating', 'In negotiation') THEN 'warning'
  WHEN [vBoI4u_UT_CA_CollectiveAgreements].[Status] IN ('Expired', 'Terminated', 'Disputed', 'Lapsed', 'Overdue') THEN 'danger'
  ELSE ''
END
```

**`1-Agreement link`**: the loader links a value only when it starts with
`http`, and the sample stores `www.fairwork.com/…`, so add the scheme:

```sql
CASE
  WHEN [vBoI4u_UT_CA_CollectiveAgreements].[Hyperlink] LIKE 'http%' THEN [vBoI4u_UT_CA_CollectiveAgreements].[Hyperlink]
  WHEN ISNULL([vBoI4u_UT_CA_CollectiveAgreements].[Hyperlink], '') <> '' THEN 'https://' + [vBoI4u_UT_CA_CollectiveAgreements].[Hyperlink]
  ELSE ''
END
```

Checks:

- **Tags join.** If an agreement can have more than one `AgreementTags` row,
  the IQA returns several rows and the panel shows only the first. Confirm it
  is one row per agreement.
- **Codes.** `Type` (`EBA_SupportedBargaining`), `Industry` (`AGR`) and
  `Sector` may be codes with lookup descriptions, as `Priority` has
  (`_I4u_UT_Lookup_Agreement_Priority`). If so, join the lookup and use its
  `DESCRIPTION`.

## 2. `Agreement Key Dates`

> One agreement's key dates for the Overview's Key dates panel, laid out by
> column name.

Copy of `Data - Manage Agreement - Key Dates`. Source:
`I4u_UT_CA_CollectiveAgreements` (Agreements). Remove the `i4u_UT_CA_UnionData`
(UDFields) join: no column uses it, and a second row there would duplicate the
agreement.

Filter: `AgreementNum` as above.

| Alias | Value |
| --- | --- |
| `Bargaining-Start` | `StartDate` |
| `Bargaining-Completed` | `CompletedDate` |
| `Bargaining-Approved` | `ApprovedDate` |
| `Term-Effective` | `EffectiveDate` (new; optional) |
| `Term-Expiry` | `ExpiryDate` |
| `Term-Re-negotiation` | `RenegotiationDate` |

The panel is single column (`us-field-groups--single`, owner 2 October 2026).
For a plain list without sub-headings, drop the prefixes: `Start`,
`Completed`, `Approved`, `Expiry`, `Renegotiation`. `EffectiveDate` is on the
agreement table but not in the current panel; include it if wanted.

## 3. `Agreement Resolution`

> One agreement's resolution for the Details tab's Resolution panel: the
> outcome fields, laid out by column name. No status alert: that moved to
> Summary (owner, 3 October 2026).

Copy of `Data - Manage Agreement - Resolution`. Remove the UDFields join, as
for Key dates. Add the contact name business object twice, so the approver
and signatory show names instead of IDs:

| Source | Alias | Join |
| --- | --- | --- |
| `I4u_UT_CA_CollectiveAgreements` | Agreements | — |
| `_i4u_UT_Contact_Name` | ApprovedByContact | left, `ApprovedBy = ID` |
| `_i4u_UT_Contact_Name` | SignedByContact | left, `SignedBy = ID` |

Filter: `AgreementNum` as above.

| Alias | Value |
| --- | --- |
| `Outcome type` | Agreements `OutcomeType` |
| `Approved date` | Agreements `ApprovedDate` |
| `1-Approved by` | ApprovedByContact `FULL_NAME` |
| `1-Signed by` | SignedByContact `FULL_NAME` |
| `2-Outcome` | Agreements `Outcome` |

Before resolution every field is blank, so the panel shows dashes. To show
a line instead, add the `Alert-*` columns with a neutral tone and
`Alert-Only` true for unresolved statuses (see section 4).

Checks:

- **Second copy of a source.** If the IQA designer will not add
  `_i4u_UT_Contact_Name` twice, return the IDs for now
  (`1-Approved by` = `ApprovedBy`) and note it here.
- **ID match.** `ApprovedBy` and `SignedBy` hold IDs such as `23116`; confirm
  they match `_i4u_UT_Contact_Name.ID`, as `StaffLeadID` does for the lead.

## 4. `Agreement Summary`

> Where one agreement stands, for the top of Overview: a status alert, then
> the key details the client chooses, laid out by column name.

New IQA (owner, 3 October 2026: Summary leads Overview, full width). Source:
`I4u_UT_CA_CollectiveAgreements` (Agreements). Add joins only for the
details chosen.

Filter: `AgreementNum` as above.

| Alias | Value |
| --- | --- |
| `Alert-Title` | Agreements `Status` |
| `Alert-Message` | Alert message expression (below) |
| `Alert-Tone` | Alert tone expression (below) |
| `Outcome type` | Agreements `OutcomeType` |
| `Start` | Agreements `StartDate` |
| `Expiry` | Agreements `ExpiryDate` |
| `Renegotiation` | Agreements `RenegotiationDate` |

The key details are a proposal: any columns work, laid out by the usual
rules (groups, numbered lines, `Tone-*`). The banner already shows type,
priority, opened, lead and last updated, so choose things it does not.
Keep them on one line at full width: no number prefixes.

The alert replaces v1's Resolution status banner: the status as the title,
a line saying whether the agreement is finalised, coloured by status. A
blank status leaves the alert out, as v1 did. The status lists match the
banner (A6), so the banner's side bar, its pill and the alert agree; extend
all three lists together once the full status list is known (README open
decision 3).

**`Alert-Tone`**:

```sql
CASE
  WHEN [vBoI4u_UT_CA_CollectiveAgreements].[Status] IN ('Active', 'Approved', 'Signed', 'Ratified', 'Finalised', 'Completed') THEN 'success'
  WHEN [vBoI4u_UT_CA_CollectiveAgreements].[Status] IN ('Pending', 'Draft', 'New', 'Open', 'In progress', 'Negotiating', 'In negotiation') THEN 'warning'
  WHEN [vBoI4u_UT_CA_CollectiveAgreements].[Status] IN ('Expired', 'Terminated', 'Disputed', 'Lapsed', 'Overdue') THEN 'danger'
  ELSE ''
END
```

**`Alert-Message`** (v1's two messages, plus one for ended agreements):

```sql
CASE
  WHEN [vBoI4u_UT_CA_CollectiveAgreements].[Status] IN ('Active', 'Approved', 'Signed', 'Ratified', 'Finalised', 'Completed') THEN 'This agreement has been finalised.'
  WHEN [vBoI4u_UT_CA_CollectiveAgreements].[Status] IN ('Expired', 'Terminated', 'Disputed', 'Lapsed', 'Overdue') THEN 'This agreement is no longer in force.'
  WHEN ISNULL([vBoI4u_UT_CA_CollectiveAgreements].[Status], '') <> '' THEN 'This agreement has not yet been finalised.'
  ELSE ''
END
```

**`Alert-Only`** (optional): `true` shows the alert without the key
details. Summary's details apply at every stage, so it is left out here;
it suits a panel whose fields mean nothing yet, such as Resolution before
the agreement is finalised:

```sql
CASE
  WHEN [vBoI4u_UT_CA_CollectiveAgreements].[Status] IN ('Active', 'Approved', 'Signed', 'Ratified', 'Finalised', 'Completed') THEN 'false'
  ELSE 'true'
END
```

## Testing

On any iMIS staff page while signed in (it needs the page's hidden
`__RequestVerificationToken`), run in the browser console. It lists each
IQA's filter names, then the column names and values for one agreement, which
should match the alias tables above in order:

```js
const headers = {Accept: 'application/json', RequestVerificationToken: document.querySelector('#__RequestVerificationToken')?.value};
for (const name of ['Agreement Summary', 'Agreement Details', 'Agreement Key Dates', 'Agreement Resolution']) {
  const path = '$/_i4u_/SandBox/CA/' + name;
  const params = await fetch('/api/QueryParameterDefinition?QueryPath=' + encodeURIComponent(path), {headers}).then(r => r.json());
  const rows = await fetch('/api/query?' + new URLSearchParams({QueryName: path, AgreementNum: '123', limit: '1'}), {headers}).then(r => r.json());
  console.log(name, params, rows.Items?.$values?.[0] ?? rows);
}
```

Use the `Ordinal` of a real agreement in place of `123`. Then open the Manage
Agreement test page with `?AgreementID=A107&AgreementNum=123` and check
each panel renders with `data-us-fields-state="ready"`.

Optional, to save a call per panel: test whether `/api/query` resolves a
`@url:AgreementNum` filter from its own query string. If it does, one IQA
could serve as both the iPart source and the loader's query.
