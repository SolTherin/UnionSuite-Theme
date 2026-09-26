# Contact page v2

Status: WIP layout prototype (23 September 2026). Not approved or implemented.
Superseded by [v3](../contact-page-v3/README.md), which holds the current
handover, findings and decisions. Keep this folder for its v1 → v2 mapping.

## Problem

`prototypes/crm-contact-Prototype.html` (v1) is a standalone mock-up with its own
palette, cards, sidebar, stat tiles and sub-tab pills. None of it maps to what
iMIS renders or to the UnionSuite theme. v2 re-expresses the same member record
with the theme's existing components so that the page could be built from iPart
configuration and the shared templates.

## Preview

Serve the repository root, then open the page. From the project root, start the
`static-node` configuration in `.claude/launch.json` (port 8778) and browse to:

```text
http://localhost:8778/prototypes/wip/contact-page-v2/index.html
```

Opening the file directly also works in most browsers; the preview pane needs
the server because it snapshots local files without their linked CSS/JS.

## Maintained files

| File | Purpose |
| --- | --- |
| `index.html` | Page composition with native iMIS wrapper fixtures. Links the real `99-Orion.css`, `zUnionSuite.css`, client CSS, `zzDarkMode.css` and `zUnionSuite.js`. |
| `contact-page.css` | Prototype page layout only (toolbar, row spacing, hidden CCO views, toast). |
| `contact-page.js` | Offline only: fetch stub for the Needs Attention loader, CCO tab selection and demo-only command toasts. |

No theme source is changed by this prototype.

## v1 → v2 mapping

| v1 element | v2 theme component |
| --- | --- |
| Gradient top bar, avatar, facts, badges | Contact banner template (`Banner-Contact-Template.html`) with the avatar slot, `us-banner__badge--member-status/--warning/--info`, iPart class `us-banner us-banner-collapsible`, page class `us-banner-page`. |
| Actions dropdown | Banner Quick Actions (`us-actions`, built-in `us-action-member-*` items). Resign, Transfer branch, Record payment and Log call need registered actions before they can be added. |
| Left sidebar nav | Native CCO vertical tabs (approved V5), in-place CCO switching (implemented, automatic), optional `us-cco-sticky-tabs`. |
| Sidebar count badges (`!`, `2`) | Dropped: native CCO tabs cannot carry badges. The Summary trackers carry these counts. |
| Stat tiles | Needs Attention component (`us-attention`) with four contact-scoped counts linking to the relevant tab. Descriptive tiles (member since, payment method, next payment) moved to the banner subtitle or the Membership summary panel. |
| Card headers with icons | Plain native panel titles. |
| Sub-tab pills | Standalone submenu `us-section-navigation` + `us-section-tabs` with `data-us-tab-adapter="page-sections"` and `us-tab-panel us-tabset-{group} us-tab-{key}` on each iPart. |
| Field lists | Native read-only panel editor markup (`PanelEditorReadOnlyForm`, `PanelField`). |
| Tables | Native Query Menu grids (automatic report styling) with `us-badge` status labels. |
| Note cards, timeline, survey cards | Query Template Display with `us-query-template` and the Member Notes / Recent History templates. |
| Coloured alerts | Native message classes `AsiImportant` and `AsiWarning`. |
| Contact method rows with Mark invalid | A grid with flag badges. Editing stays in the native Communication Preferences / contact editors. |
| Collapsible job cards | Jobs grid with a Primary badge; the existing Jobs header actions add and edit. |
| Payment attempt expander | Each attempt is its own grid row. |
| Danger zone and resign modal | Removed from the page; resignation belongs in Quick Actions once a resign action is registered. |

The v1 sample data was inconsistent (Jane Doe / Financial / Monthly beside Sarah
Reynolds / Overdue / Quarterly). v2 uses one consistent record.

## Open decisions

1. **Trackers.** Reuse `us-attention` for contact counts? The current loader
   reads a folder of IQAs but passes no contact ID, so each IQA cannot filter to
   the current record. Options: add a `data-us-iqa-contact` (or URL `ID`)
   parameter to the loader, or keep contact counts in a Query Template. The
   proposed folder is `$/_i4u_/SandBox/CRM Layouts/Contact_Page/Trackers`. The
   loader should also move to `GET /api/query` with a named filter when changed.
2. **Tracker placement.** Summary tab only (current) or above the CCO so they
   show on every tab.
3. **Panel title icons.** None in v2. A possible later theme feature: an iPart
   CSS class such as `us-title-icon-mail` that adds a Tabler glyph before the
   panel title. Not proposed unless there is a clear need.
4. **Record alerts.** Whether resignation and overdue alerts are one Query
   Template (conditional rows) or separate Content iParts with visibility rules.
5. **Tab set.** Eight tabs is long. Candidates to merge: Cases into Activity,
   Membership into Summary/Finance.
