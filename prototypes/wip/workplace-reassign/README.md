# Reassign workplace (confirm a new parent)

Status: work in progress, started 28 October 2026, tracked. Not approved
and not in the theme. Confirm posts to the AllocateToParent Elsa flow and
Cancel closes the popup (`workplace-reassign.js`); tested in the preview
against stand-ins only, not yet in iMIS.

## Problem

Staff move a workplace from one employer (or none) to another. Before the
change is saved they need one screen that confirms:

- which record is being changed (the workplace),
- the employer it belongs to now, or that it has none,
- the employer it will belong to,

with name, type, ID and address for each employer. The screen must be one
Query Template result, so all of it comes from a single IQA row.

It must look right under the UnionSuite theme and also stand alone where the
theme's CSS is not loaded (plain Orion, or another site).

## Preview

Start the `static-node` configuration in `.claude/launch.json` (port 8778),
then open:

```text
http://localhost:8778/prototypes/wip/workplace-reassign/index.html
```

The bar switches the theme on and off (off reloads with `?theme=off`: no
theme CSS and no `zUnionSuite.js`, the embed on its own), light/dark
(theme only), the sample row (Move, No current employer, Same employer) and
the panel width (760, 540, 340). The preview script fills the template with
the sample row as iMIS would; blank fields are empty strings. It also stands
in for iMIS and CloudToolz, so Confirm runs: "Flow reply" picks success, an
`AsiError` reply, or HTTP 500, each after a short pause to show the busy
state.

## Sources

| File | Purpose |
|---|---|
| `templates/Workplace-Reassign-Query-Template.html` | The Query Template field: one result. |
| `workplace-reassign.candidate.css` | The component, `US-REASSIGN`. Target `zUnionSuite.css` if adopted; it needs no dark section, because it only uses tokens. |
| `workplace-reassign.js` | Confirm and Cancel. Confirm sends `data-workplace-id` (PartyId) and `data-to-id` (ParentPartyId) as headers to `api/UnionTemplate/AllocateToParent/Allocate` on CloudToolz, whose URL comes from `$/ZENTSO/Security/CloudToolzUrl` via `GET /api/query`. Shows the theme's button spinner while busy; on success removes the buttons, on an `AsiError` reply or HTTP error keeps them for another try. Cancel closes the RadWindow popup. |
| `Workplace-Reassign-Embed.html` | **Generated.** The CSS in a `<style>` block, the template, then the script: one file to paste into the iPart. Rebuild with `node prototypes/wip/workplace-reassign/build-embed.cjs`; do not edit by hand. |
| `build-embed.cjs` | Builds the embed file from the CSS, template and script above. |
| `index.html` | The iPart output around one result, with the live theme in production order. |
| `workplace-reassign.preview.css`, `.preview.js` | Preview bar and sample rows only. Not proposed for the theme. |

## How it works with and without the theme

- Every colour, face and radius is a theme token with the theme's light value
  as its fallback, collected once as `--rs-*` on `.us-reassign`. With the
  theme, branding and dark mode follow it; without it, the light values show.
- Icons are inline SVG, so Tabler.css is not needed.
- The buttons are native `TextButton` (+ `us-outline-button` for Cancel,
  + `PrimaryButton` for Confirm). Their fallback paint is wrapped in
  `:where()` (no specificity), so the theme and Orion button rules win when
  loaded and the fallback only paints them when they are not. 44px tall at
  `(max-width: 950px)`.
- The layout follows the component's own width (container queries): cards
  stack below 560px, fields stack below 360px.
- The "this workplace" bar uses `--border-focus`, not `--brand-600`, because
  dark mode keeps the brand ramp and a navy brand vanishes on dark surfaces.
- The script needs no theme file either: it has its own slide animation
  rather than the theme's `UnionSuiteRecordCards.fold`, and only reads the
  iMIS page fields `__RequestVerificationToken` and `__ClientContext`. Its
  spinner and replies use theme class names (`us-button-spinner`,
  `AsiSuccess`, `AsiError`), styled by the theme when present and by the
  embed's CSS when not.

## IQA fields

Select every field below, with exactly these aliases; select `''` with the
alias for any that is unused. The template's `{#query.Alias}` references all
of them.

| Alias | Required | Description | Blank |
|---|---|---|---|
| `CurrentRecord_ID` | Yes | The workplace being reassigned (the page's record, from `?ID=`). | — |
| `CurrentRecord` | Yes | Workplace name. | — |
| `CurrentRecord_Address` | No | Workplace one-line address. | Item hidden. |
| `CurrentEmployer_ID` | No | Current parent employer's ID. Also `data-from-id`. | **Switches the Current card to "No current employer"** and the summary to "will be assigned to". |
| `CurrentEmployer` | No | Current employer name. | Hidden with the card's details. |
| `CurrentEmployer_Type` | No | Current employer type. | Shows "—". |
| `CurrentEmployer_Address` | No | Current employer one-line address. | Shows "—". |
| `NewEmployer_ID` | Yes | Chosen employer's ID (from the picker's parameter). | — |
| `NewEmployer` | Yes | Chosen employer name. | — |
| `NewEmployer_EmployerType` | No | Chosen employer type. | Shows "—". |
| `NewEmployer_Address` | No | Chosen employer one-line address. | Shows "—". |
| `SameEmployer` | Yes | `'1'` when the current and new employer IDs match, else `''`. A SQL expression: `CASE WHEN <current employer ID> = <new employer ID> THEN '1' ELSE '' END`; a NULL current employer gives `''`. | Normal confirm. `1` shows the warning and removes Confirm. |

The IQA joins the workplace to its current parent (left join, so a workplace
with no employer still returns a row) and to the chosen employer (by a
prompted filter).

### iPart

- Query Template Display, one result. Title: Reassign workplace.
- Query Template field: the whole of `Workplace-Reassign-Embed.html` (style
  block included). With the theme installed, the template alone is enough
  once the CSS is in `zUnionSuite.css`; until then, use the embed file.
- No results: `<p>The workplace or the chosen employer could not be found.</p>`
  (the row is missing only if either ID is wrong).

## Open decisions

1. **Refresh after success.** The page behind the popup still shows the old
   employer until it reloads. Reload it (or the employer panel) when the
   popup closes?
2. **Where it opens.** A popup from the workplace page's employer field, or a
   step after an employer picker. The picker is not designed here.
3. **Effective date or note.** Not asked for; add if the change needs to be
   dated or explained in the change history.
4. **Standalone dark mode.** Without the theme there are no dark tokens, so
   it shows light. Add a `prefers-color-scheme` fallback only if a themeless
   host needs it.
