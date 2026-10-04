# Scheduled increases: IQA build notes

Build notes for the IQA behind the Scheduled increases panel on the Terms &
Schedule tab (decision 12 in [README.md](README.md): option 4, now the theme's
`US-INCREASES`). It needs one IQA, one row per increase (section 1). Section 2,
a summary IQA, was only for comparison option 2.

Status (4 October 2026): not built. The columns below are checked against
an export of the dev database's `i4u_UT_CA_Schedule` table (owner, 4 October
2026). The v0.1 IQAs were decoded from `Claude\sandbox-bulk-export.xml`
(June 2026) with `Claude\iqa-blob-parser`.

## What exists (v0.1)

Three IQAs in `$/_i4u_/SandBox/CA/Increases/`, all on one table,
`i4u_UT_CA_Schedule` (view `vBoi4u_UT_CA_Schedule`), each filtered
`AgreementOrdinal` Equal `@url:AgreementNum`:

| IQA | Columns (display name) | Other filters | Sort |
| --- | --- | --- | --- |
| `1. Scheduled Increases - Summary` | `Class`; `IncreaseAmount` with aggregate Sum ("Total Increase (%)") | — | `Type` descending, `Class` |
| `2. Scheduled Increases - General` | `EffectiveDate` ("Effective Date"), `IncreaseAmount` ("Increase Amount (%)"), `IncreaseNum` ("Increase Number") | `Type` = `General` | `IncreaseNum` |
| `3. Scheduled Increases - Class` | `Class`, `MonthsInRole` ("Months In Role"), `IncreaseAmount` ("Increase Amount (%)") | `Type` = `Class`, `Other`; `Class` Equal, prompted | `Class`, `MonthsInRole` |

The table, from the dev export:

| Column | Holds |
| --- | --- |
| `Ordinal` | the key |
| `AgreementOrdinal` | the agreement (blank on some old test rows, which no agreement shows) |
| `Type` | `General`, `Class` or `Fixed` |
| `Class` | the class on `Class` rows; `General` or `Fixed` (the Type again) on the others |
| `IncreaseType` | `CPI` or `Negotiated` on `General` rows; blank on `Class` and `Fixed` rows |
| `IncreaseAmount` | the percentage on `General` and `Class` rows; blank on `Fixed` rows. Often set on CPI rows too (3.15, 12.43), sometimes blank |
| `FixedAmount` | the dollar value on `Fixed` rows; `0` or blank on the others, so read it only when `Type = 'Fixed'` |
| `EffectiveDate` | a datetime on `General` and `Fixed` rows; blank on `Class` rows |
| `MonthsInRole` | months in the class on `Class` rows; blank otherwise |
| `IncreaseNum` | v0.1's running number on `General` rows; often blank |

Check: with this mapping, agreement 123 (the owner's v0.1 screenshot) gives
General 2 + 2 + 88 + 5 = 97% plus two CPI increases with no figure, Fixed
$2,500 + $288 + $2,000 = $4,788.00, C88 12% and Test 2%, as v0.1 shows.

Not in the table: the dollar basis (per week, per year), a comment on an
increase, and a class order. Class steps are percentages only.

## Approach

Build new IQAs; leave the three v0.1 IQAs alone until the panel moves over.

| Panel | New IQA |
| --- | --- |
| Scheduled increases rows (options 2 to 5) | `$/_i4u_/SandBox/CA/Increases/Agreement Increases` |
| Summary (option 2 only) | `$/_i4u_/SandBox/CA/Increases/Agreement Increases Summary` |

The SandBox folder is a placeholder (README open decision 8).

## Shared rules

- **Filter.** As v0.1 already does, and as the field panels do (key on the
  agreement's `Ordinal`, which the page URL carries as `AgreementNum`;
  owner, 3 October 2026):

  | Filter property | Operator | Value |
  | --- | --- | --- |
  | `AgreementOrdinal` | Equal | `@url:AgreementNum` |

  These IQAs feed Query Template Display iParts, which read the page URL, so
  the URL filter is enough. Only a script loader (`/api/query`, as the field
  panels use) would need a prompted filter with the search label
  `AgreementNum` instead.
- **Every field the template references is selected**, including those used
  only in `data-*` attributes. Select `''` with the alias for anything not
  yet in the table (`AmountPeriod`, `Comment`, `ClassOrder`).
- **Numbers stay numbers.** `Percent` and `Amount` are bare numbers, NULL
  (blank) unless the increase is of that kind: the totals read them, and a
  `0` would count as a value. `AmountText` and `When` are the display text.
- **Expressions** reference the business object by its view name:
  `[vBoi4u_UT_CA_Schedule].[IncreaseAmount]`.

## 1. `Agreement Increases`

> Every scheduled increase for one agreement, one row each, general first
> then each class: for the Scheduled increases panel
> (`templates/Agreement-Increases-Query-Template.html`, theme `US-INCREASES`).

Source: `i4u_UT_CA_Schedule` (the business object over it). Filter:
`AgreementOrdinal` Equal `@url:AgreementNum`. Check the view name,
`vBoi4u_UT_CA_Schedule`, in the IQA designer.

| Alias | Value |
| --- | --- |
| `Ordinal` | `Ordinal` |
| `Kind` | `CASE WHEN [vBoi4u_UT_CA_Schedule].[Type] = 'Class' THEN 'Class' ELSE 'General' END` (Fixed rows are general: everyone gets them) |
| `IncreaseType` | Expression below |
| `Class` | `CASE WHEN [vBoi4u_UT_CA_Schedule].[Type] = 'Class' THEN [vBoi4u_UT_CA_Schedule].[Class] ELSE '' END` (drops the `General` and `Fixed` stored in Class) |
| `Percent` | `CASE WHEN [vBoi4u_UT_CA_Schedule].[Type] IN ('General', 'Class') THEN [vBoi4u_UT_CA_Schedule].[IncreaseAmount] END` (includes a CPI figure when one is recorded) |
| `Amount` | `CASE WHEN [vBoi4u_UT_CA_Schedule].[Type] = 'Fixed' THEN [vBoi4u_UT_CA_Schedule].[FixedAmount] END` (never the `0` stored on other rows) |
| `AmountPeriod` | `''` until the dollar basis is recorded (open question) |
| `EffectiveDate` | `CONVERT(varchar(10), [vBoi4u_UT_CA_Schedule].[EffectiveDate], 23)` (ISO: `2026-07-01`) |
| `MonthsInClass` | `CASE WHEN [vBoi4u_UT_CA_Schedule].[Type] = 'Class' THEN [vBoi4u_UT_CA_Schedule].[MonthsInRole] END` |
| `When` | Expression below |
| `AmountText` | Expression below |
| `IncreaseNum` | `IncreaseNum` |
| `Comment` | `''` until a column exists |

Sort, by table fields (the IQA designer cannot sort on an expression
column): `Type` descending (General, Fixed, Class), then `Class`,
`EffectiveDate`, `MonthsInRole`, `IncreaseNum`, all ascending. The theme
orders the panel itself, so this sort only matters without the theme
script: `US-INCREASES` gathers each group wherever its rows fall, puts
General first and the classes in natural order (C4 before C34), and orders
each group's increases by date or months in class, then `IncreaseNum`.
Rows per page on the iPart: 100 (the groups and totals are worked out from
the rows on the page).

**`IncreaseType`** (the coloured type and the type chips):

```sql
CASE
  WHEN [vBoi4u_UT_CA_Schedule].[Type] = 'Fixed' THEN 'Fixed amount'
  WHEN [vBoi4u_UT_CA_Schedule].[Type] = 'Class' THEN 'Percentage'
  WHEN [vBoi4u_UT_CA_Schedule].[IncreaseType] = 'CPI' THEN 'CPI'
  ELSE 'Negotiated'
END
```

**`When`**:

```sql
CASE
  WHEN [vBoi4u_UT_CA_Schedule].[Type] = 'Class' AND [vBoi4u_UT_CA_Schedule].[MonthsInRole] IS NULL THEN 'Months not set'
  WHEN [vBoi4u_UT_CA_Schedule].[Type] = 'Class' THEN 'After ' + CAST([vBoi4u_UT_CA_Schedule].[MonthsInRole] AS varchar(10))
    + CASE WHEN [vBoi4u_UT_CA_Schedule].[MonthsInRole] = 1 THEN ' month' ELSE ' months' END
  WHEN [vBoi4u_UT_CA_Schedule].[EffectiveDate] IS NULL THEN 'No date'
  ELSE FORMAT([vBoi4u_UT_CA_Schedule].[EffectiveDate], 'd MMM yyyy', 'en-AU')
END
```

**`AmountText`** (the amount with its unit):

```sql
CASE
  WHEN [vBoi4u_UT_CA_Schedule].[Type] = 'Fixed' AND [vBoi4u_UT_CA_Schedule].[FixedAmount] IS NULL THEN 'Not set'
  WHEN [vBoi4u_UT_CA_Schedule].[Type] = 'Fixed' THEN FORMAT([vBoi4u_UT_CA_Schedule].[FixedAmount], 'C2', 'en-AU')
  WHEN [vBoi4u_UT_CA_Schedule].[IncreaseAmount] IS NULL AND [vBoi4u_UT_CA_Schedule].[IncreaseType] = 'CPI' THEN 'CPI'
  WHEN [vBoi4u_UT_CA_Schedule].[IncreaseAmount] IS NULL THEN 'Not set'
  ELSE FORMAT([vBoi4u_UT_CA_Schedule].[IncreaseAmount], '0.##') + '%'
END
```

A CPI increase with a recorded figure shows that figure (`3.15%`) and counts
in the totals; one without shows `CPI`, and the totals add "+ CPI". Append
`+ ' ' + AmountPeriod` to the dollar line once the basis exists.

If the IQA designer rejects `FORMAT`: `When` can use
`CONVERT(varchar(11), [vBoi4u_UT_CA_Schedule].[EffectiveDate], 106)` (`01 Jul 2026`), and the
amounts `CAST(CAST([vBoi4u_UT_CA_Schedule].[IncreaseAmount] AS decimal(9,2)) AS varchar(12)) + '%'`
(`3.50%`) and `'$' + CONVERT(varchar(20), CAST([vBoi4u_UT_CA_Schedule].[FixedAmount] AS money), 1)`
(`$2,500.00`).

Data to tidy, from the dev export: rows with a blank `AgreementOrdinal`
(ordinals 37 to 45; no agreement shows them), a `Fixed` row with no amount
(63; shows "Not set"), and test values such as a 100% CPI (34) and an 88%
negotiated increase (67).

## 2. `Agreement Increases Summary` (option 2 only)

> One row per group for one agreement: General, then each class, with the
> group's total. For the summary panel
> (`templates/Agreement-Increases-Summary-Query-Template.html`).

Source and filter as section 1. Every column not aggregated is grouped on.

| Alias | Aggregate | Value |
| --- | --- | --- |
| `GroupName` | — | `CASE WHEN [vBoi4u_UT_CA_Schedule].[Type] IN ('Class', 'Other') THEN [vBoi4u_UT_CA_Schedule].[Class] ELSE 'General' END` |
| `Kind` | — | as section 1 |
| `GroupSort` | — | as section 1 (sort only) |
| `ClassOrder` | — | as section 1 (sort only) |
| `TotalPercent` | Sum | the `Percent` expression from section 1 |
| `CPI` | Maximum | `CASE WHEN ISNULL([vBoi4u_UT_CA_Schedule].[IncreaseType], '') = 'CPI' THEN 'CPI' ELSE '' END` |
| `TotalAmount` | Sum | the `Amount` expression from section 1 |
| `AmountPeriod` | Maximum | as section 1 (assumes one basis per group) |
| `StepCount` | Count | `Ordinal` |

Sort: `GroupSort`, `ClassOrder`, `GroupName`.

Checks:

- **Aggregates on expressions.** Confirm the IQA designer allows Sum and
  Maximum on a custom SQL expression column. If it does not, option 2 needs
  the source columns themselves, which means fixing the data model first.
- **Sum of NULLs** is NULL, which the template shows as no part. A Sum that
  comes back `0.00` for a group with no percentage would show "0.00%".
- **Formatting.** The sums print as the IQA formats decimals (`6.50`,
  `4788.00`: no thousands separator). Options 3 to 5 format in script
  (`6.5%`, `$4,788.00`).
- **Compounding** cannot be done here; option 2 always adds.

## Testing

Open the Manage Agreement test page with
`?AgreementID=A107&AgreementNum=<ordinal>` and check the rows against the
v0.1 lists. Then, in the browser console, compare the panel's own totals with
the v0.1 summary:

```js
UnionSuiteIncreases.totals(document.querySelector('.us-increases .QueryTemplateSet'))
```

It lists each group and its total as the panel shows it (General 97% + CPI +
$4,788.00, C88 12%, Test 2% for the v0.1 test agreement, assuming its blank
general amounts are CPI).
