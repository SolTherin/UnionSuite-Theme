# Agreement page — session handover

Date: 2 October 2026
Branch: `theme/contact-page-v3` (the folder is untracked; nothing committed)
Status: WIP prototype built and checked offline. Not approved. Nothing has
been deployed to iMIS, promoted to the theme or added to the usage guide.

Read [README.md](README.md) for the design: the old → theme mapping, the
proposed theme changes and the full open decisions. This file records where
the work stands and what to do next.

## Goal

Bring the Manage Agreement test page in iMIS (`/Agreements_ManageAgreement`,
built before the theme) in line with the UnionSuite theme. The owner chose a
full rebuild from theme components (the contact page v2/v3 playbook), with
features the theme lacks proposed as theme candidates.

## Owner decisions (2 October 2026)

- Full rebuild from theme components, not a reskin.
- Features without a theme equivalent (milestones, meetings, attachment
  editing) are proposed as theme candidates.
- Confetti is replaced by the theme's task completion effect from the Home
  page tasks.
- Use the current CCO as it is in the theme: `us-cco-sticky-tabs us-cco-rail`,
  Tab display style Vertical right. No CCO changes. Tabs load one at a time
  (in-place switch), not all on one page as the old custom switcher did.
- Keep the existing IQA definitions; change the Query Template HTML only.
- Banner: keep the original v1 layout (ID, name, status, Actions on the top
  row; description and facts below), with the left rail coloured to match
  the status pill.
- Banner top row is static (Banner primary IQA). The bottom row comes from a
  client-configurable IQA, like the contact page details IQAs.
- Sub-section links in the rail (the old sidebar's per-card links) are wanted
  but deferred until after the MVP.

## What exists

| Item | State |
| --- | --- |
| `index.html` prototype | Five CCO tabs (Overview, Activity, Coverage, Terms & Schedule, Reports) built from native iMIS wrapper fixtures, the live theme CSS/JS and the candidates. Each iPart's type, CSS class and template is in the comment above it. |
| Query Templates (`templates/`) | Banner, Tasks, Milestones, Contacts, Attachments, Meetings, Notes, Terms. All use the aliases from the live templates the owner supplied. Each header lists iPart settings and fields. |
| Agreement actions | `agreement-actions.candidate.js`: every `CA_*` launcher as a registered `us-action-agreements-*` action (same popup URLs), the CloudToolz helper (base URL via `/api/query`), and the task saver. |
| Theme candidates | `theme-candidate-task-rows.js` (T1), `theme-candidate.js` (T2 query states, A1 milestones, A3 attachment editor, B1 banner facts loader, B2 field groups loader), `theme-candidate.css` (A1–A6). |
| Fixture | `agreement-page.js` renders sample rows through the real templates and answers CloudToolz, ZenTokens and the tag and banner details IQAs offline. |

## Verified (offline prototype only)

Checked in the browser at 1280–1366px, light and dark, no console errors:

- Every list renders through its real template with the live aliases.
- Task tick: theme celebration, save through the agreement saver, row slides
  out, footer count updates. Failure reverts and shows "Not saved. Try again."
- Milestone status: rail and count update, Complete plays the effect, the
  completed filter hides the row; a failed save reverts with an error.
- Attachment editor: tag suggestions, keyboard pick, save, row update.
- Heading actions and banner Actions open the right popup URL and refresh the
  owning list in place (the replacement for `CA_reloadList` and friends).
- Banner: two rows, condensed single row on scroll, status tones (Active,
  Pending, Expired; others neutral), details row loaded from the details IQA
  with a Tone-* priority badge.
- `node prototypes/wip/agreement-page/build-task-rows-candidate.cjs --check`
  passes: the task-rows candidate matches the theme block.

## Not verified (needs iMIS)

- Any real CloudToolz call (`/ca/complete-task`, `/ca/update-attachment`,
  `/flowz/sharepoint/download`) and the ZenToken step.
- `/api/query` against the real IQAs: CloudToolzUrl (`Description` column),
  `ZenFileTags` (`Ordinal`, `TagName`) and the banner details IQA filter name.
- Action context: `AgreementID` / `AgreementNum` read from the page URL; the
  native popup close callback and in-place Query Template refresh on the live
  page (needs stable `ste_container_ci…` IDs).
- The rail and in-place CCO switching with these iParts.
- The BeyondForm panel with `us-query-template us-form` (only a fixture here).
- Phone widths. Only desktop widths were checked.

## Waiting on the owner

1. **Banner details IQA**: built by the owner, 3 October 2026, at
   `$/_i4u_/Core/CA/v2/API - Manage Agreement - Banner Details`;
   still to check its filter (`AgreementNum`, the ordinal) and columns, made from
   Banner secondary with re-aliased columns (`Description`,
   `Additional-Agreement type`, `Additional-Priority`, `Tone-Priority`,
   `Additional-Opened`, `Additional-Lead`, `Additional-Last updated`).
2. **Agreement statuses**: the full list, to set each status tone (A6).
3. **Agreement Details, Key Dates, Resolution**: layout settled (owner,
   3 October 2026) and built as candidate B2 (`US-FIELD-GROUPS`): each panel
   is laid out by its IQA's column names (`Group-Label` sub-heading, `1-Label`
   new line, `Tone-Label` badge, `Alert-*` status alert as on v1's Resolution
   card, — for blank). Build notes in `Field-Groups-IQA-Build.md`. One shared template,
   `templates/Agreement-Field-Groups-Query-Template.html`. Needed: the three
   IQAs with re-aliased columns (filter `AgreementNum`: the agreement's
   `Ordinal`, search label `AgreementNum`), and the filter name confirmed.
4. **Tasks filter**: the old hidden Tasks iPart listed other agreements'
   tasks; the new iPart's IQA must filter on `AgreementNum` from the URL.
5. Contacts layout is settled: option 7, grouped tiles (owner, 3 October
   2026; README decision 10), and is on the prototype page. The Contacts
   IQA needs five new columns (ContactId, ContactUrl, ContactIsLead,
   ContactGroupOrder, ContactGroupTone) and a new sort; the email contacts
   action destination is still a placeholder.
5. Notes layout is settled: option 4, ledger rows (owner, 3 October 2026;
   README decision 9). The Notes IQA needs a new `CreatedTime` column.
6. The remaining README open decisions (attachment View, Upload vs Add note,
   toggle labels, SandBox paths). Key dates is settled: plain fields, single
   column (`us-fields--single`), owner 2 October 2026.

## Next steps

1. Get the owner's answers above; write the three details templates and fill
   in the status list.
2. Owner review of the prototype and the candidates (T1–T6, A1–A6, B1).
   Tasks were reworked on 2 October 2026 to the original agreement layout,
   theme-wide (T3–T5), with lighter type across the page's lists (T6), a
   heading count and no progress bar, and search behind the theme's
   magnifier. `task-rows-check.html` compares the contact-style task rows
   before and after.
3. Build a test copy of the page in iMIS per README "Building it in iMIS",
   loading the candidate files on that page, and run the unverified checks.
4. On approval: move this folder to `prototypes/approved/agreement-page/`
   (AGENTS.md design lifecycle).
5. Promotion: move each candidate into its named target in
   `THeme/UnionSuite/zUnionSuite.css` / `zUnionSuite.js` and the actions into
   `Scripts/ActionDefinitions.js`; promote the templates to
   `THeme/UnionSuite-Guides/usage/templates/` with field definitions in
   `query-field-definitions.cjs`; update the usage guide; then run
   `node tools/build-theme-usage.cjs`, its `--check`, and
   `node tools/check-usage-sources.cjs`.
6. After MVP: rail sub-section links.

## Preview

Start `static-node` from `.claude/launch.json` (port 8778) and open
`http://localhost:8778/prototypes/wip/agreement-page/index.html`. The page must
be served (it fetches the templates). Toolbar: "Saves" switches CloudToolz to
fail; "Mode" toggles dark mode.

## Gotchas

- `/api/query` rows are flat alias-keyed objects, not `Properties.$values`
  (that was `/api/iqa`). Read both shapes; the candidates now do.
- Link-mode actions get `us-command` (inline-flex, centred). Titles that carry
  an action need their own left-aligned rule (A1/A2 do this).
- `us-list` rows need "Display in cards" on; without it they run together.
- The browser pane caches CSS/JS hard; force with `fetch(file, {cache:
  'reload'})` before reloading.
- `theme-candidate-task-rows.js` is generated; edit
  `build-task-rows-candidate.cjs`, not the output.
- In this shell, heredocs containing apostrophes fail; write files with the
  editor tools or a Node script instead.
