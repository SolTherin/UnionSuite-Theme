# Project TODO

Reconciled 8 September 2026. Implementation status is maintained in
[THEME-INVENTORY.md](THEME-INVENTORY.md); author recipes and installation are in
[Usage-Guide.html](THeme/UnionSuite-Guides/Usage-Guide.html).
Local implementation is distinct from live deployment verification.

## Latest live checks

- [ ] After uploading the refreshed theme/client ZIPs, confirm client Config.js loads before the taskbar, Biscuit greets the signed-in user on the header divider, the five-minute/15-second timings and click sequence work, and native search/partial updates remain usable. Local behaviour and package contents are verified; live deployment is separate.

- [ ] Verify approved V5/H2 native tabs in live iMIS: native selection/cancellation, validation, partial refresh, nested Address tabs and mobile All sections.

- [ ] Verify Orion sidebar primary/submenu colours, accent icon hover, current-page marker, nested hover and keyboard focus in expanded/collapsed modes. Custom image icons retain their artwork.

- [ ] Confirm native IQA uniform rows, selected/hover states and horizontal query selector alignment, semibold label and full-width bottom divider. Preserve three-column filters and top labels in horizontal mode; check the vertical layout too.
- [ ] Confirm the calendar first-open focus has one frame and the month chevron is centred. Check keyboard navigation, Today and month/year actions.
- [ ] Verify IQA refresh overlay positioning, cleanup on completion/error and repeated refreshes.
- [ ] Check remaining Save/Upload/Import adapters with valid and blocked validation, partial/full-page requests and browser Back restoration. Do not infer success from a timeout.
- [ ] Check native validation messages, disabled/read-only fields and specialised widgets in additional forms and narrow columns.
- [ ] Verify authored action icons, keyboard tooltips and partial refreshes on real row actions.

Owner feedback confirms upload forms look good, CCO Next/Previous loading works,
and sign-in / Content Designer loaders work. This is not blanket verification of
all validation, error and recovery paths.

## Next element reviews

- Alert/confirm/prompt dialogs: deferred by owner until an actual Telerik example is encountered. Standard browser dialogs remain unchanged. Content-window title bars and footer styling are implemented.
- [ ] Context/action menu variants and disabled items.
- [ ] Dashboard trackers, figures, progress bars and charts.
- [ ] General native panels/cards, shell navigation and native profile banners.
- [ ] Lookup/multiselect controls outside the approved report scope.
- [ ] Recent-history output. Further Staff Bulletin redesign is parked below; the approved bulletin card styling is implemented.
- [ ] Contact page layout: review and promote the v3 theme candidate (20 proposed changes, including the collapsible CCO rail, v1 sidebar menu, banner alert bell, contact type identity and one-row banner, report column fit and density changes). Handover, owner decisions, open decisions and the promotion checklist are in [contact page v3](prototypes/wip/contact-page-v3/README.md). Nothing is promoted to `THeme/` yet.
- [ ] Agreement page: usage guide and templates. The agreement CSS/JS was promoted into the theme on 3 October 2026 (see [agreement page](prototypes/wip/agreement-page/README.md#proposed-theme-changes)); the guide was held back by the owner. Still to do, per AGENTS.md: move the author templates from `prototypes/wip/agreement-page/templates/` to `THeme/UnionSuite-Guides/usage/templates/`, add their field definitions to `query-field-definitions.cjs`, and document the new components (milestones, meetings, attachments, field groups with sub-headings and status alert, banner facts, task progress, past-meetings placeholder, notes ledger, contacts tiles and filters, `us-panel-fill`, the `us-agreement-*` section presets and the agreement actions) with examples, copyable classes and placement. Then rebuild and run the guide checks, move the folder to `prototypes/approved/` or retire it, and archive the now-duplicate candidate files.
- [ ] Member notes templates: revisit keeping both the existing card template (`Member-Notes-Query-Template.html`: title, meta, body, footer) and the compact v1-layout candidate from [contact page v3](prototypes/wip/contact-page-v3/README.md) (`Member-Notes-Compact-Query-Template.html`, `us-notes`, `us-notes--pinned`). Decide replace vs. keep both, and what the notes data holds (category, interaction channel or both). The existing template's `ContactMethod` alias means the interaction channel (e.g. Phone call), not the member's phone/email records; rename it (e.g. `InteractionType`) in the template, field definitions and guide example when promoting.

## Planned functionality

- [ ] Consolidate Biscuit's shared palette and create a usage index. Share fur, ear, muzzle, collar and tag colour tokens across the taskbar and hammock task-empty state, while keeping each pose's drawing and animation separate. Index production uses, maintained source files and generated previews; distinguish historical mockups from maintained assets. Keep the index in the canonical usage guide, update affected examples and verify both poses in light/dark mode and reduced motion. Consider extracting reusable facial features only as more poses justify it.
- [ ] When editing a panel, automatically call its refresh in the background and show a message that the data has been updated since the page loaded.
- [ ] Named panel action injection and verified handlers: [action plan](THEME-PANEL-ACTIONS.md). Shared report action slots/styles already exist.
- [ ] Reusable filter toggle: one shared theme component that hides a block's filters behind a heading filter button, for any Query Template Display or Content HTML block. `US-QUERY-SEARCH` (home page tasks) and the activity feed each build it today, and IQA reports hide their filters behind a similar toggle; unify them (owner note, 25 September 2026).
- [ ] Combined activity feed: [feed plan](THEME-ACTIVITY-FEED.md). API-driven candidate built in contact page v3 (item 32, 25 September 2026); rows now render the shared record card from `prototypes/wip/activity-cards/` (26 September 2026), which notes, cases and meetings lists can use too; next, build the five source IQAs and confirm REST access, filter names and paging cost in iMIS.
- [ ] Agreement notes, restricted note access check: an endpoint that takes a note's ordinal, checks the signed-in user against the note's restriction and returns the text, or a denied answer. Register it as the loader in `THeme/UnionSuite/Scripts/ActionDefinitions.js` with `UnionSuiteRestrictedNotes.defineLoader(async ({ordinal, row}) => text)` (throw an error with `denied: true` when not permitted); until then restricted notes show the notice without Show note. The Notes IQA returns "Restricted" as the Note of a restricted note and `us-restricted-note` as its NoteClass, the class of the span around the note (owner, 5 October 2026).
- [ ] Agreement terms, single-term delete: the row Delete in the agreement terms rows (`US-TERMS`, `prototypes/wip/agreement-page/templates/Agreement-Terms-Query-Template.html`) confirms in place, then calls an endpoint that deletes one term by its ordinal and refreshes the list. The owner will define the endpoint (4 October 2026). Header Bulk remove keeps the `Delete_Terms.aspx` checkbox form for several terms. The term status save (`UnionSuiteTermStatus.defineSaver`) also has no endpoint yet.
- [ ] Agreement scheduled increases (`US-INCREASES`, `prototypes/wip/agreement-page/templates/Agreement-Increases-Query-Template.html`, decided 4 October 2026): build the Agreement Increases IQA (`prototypes/wip/agreement-page/Increases-IQA-Build.md`); define `agreements.edit-increase` and a delete for one increase (the pencil is a placeholder); decide with the owner whether percentages add or compound, the $ basis (per week, hour or year), how CPI shows, and a $ input for class increases on the add form.
- [ ] Taskbar dev mode: add a developer mode to the taskbar, including a toggle for the native CCO tab-switching session switch (`UnionSuiteCcoSwitch.disable()`/`.enable()`, see the [approved specification](prototypes/approved/cco-inline-loading/README.md#turning-it-off)). The site-wide setting stays in the client `Config.js`. Decide how dev mode is entered and who can see it.

- [ ] Enhanced IQA — preview Business Object sources.
- [ ] Enhanced IQA — when quick search returns an exact match, sort it first.
- [ ] Enhanced IQA — add useful functions to the SQL autofill, for example asi_path and asi_GetDate.
- [ ] Enhanced IQA — add a recents folder to the query explorer.

## Parked by owner

- Staff Bulletin authoring redesign — deferred by owner on 12 September 2026; revisit only when requested. Current workflow is a bulletin management page with editable content blocks and a title/HTML-editor popup. Explore an Add/Edit bulletin form with a template picker (Announcement, Policy/action required, Staff welcome), relevant content fields, an optional link toggle with label/URL, visibility/expiry controls and a card preview. Assess a dedicated standalone iMIS panel/data source versus generating HTML for the existing Content Block; the storage/save approach is not decided or implemented. On resumption, confirm the actual iPart/editor, verify saving and reopening all fields, plan any existing-post migration, and map the homepage query to the chosen source, including blank AlertUrl values for unlinked records. Keep the existing approved card styling and Query Template Display working while this is parked.

- CCO navigation on grey page backgrounds: design decision deferred by owner. Revisit in the existing [CCO menu comparison](references/CCO-Tabs-Comparison.html). Consider an optional standalone secondary navigation style when there is no shared content container: self-contained pale accent selection, orange left marker, closed rounded edges, transparent inactive rows and a gutter beside white panel cards. Compare this with the existing attached V5 treatment; neither the grey page background nor the standalone variant is approved. Keep V5/H2 and current mobile behaviour unchanged until reviewed. This is separate from banner tab-to-zone switching.

- Unselected taskbar layout comparisons remain trial-only. The taskbar and approved Biscuit greeting are implemented in the theme.
- Banner tab-to-zone switching: [plan](prototypes/wip/banner-tabs/Banner-Tabs-Plan.md). Presentation exists; keep template tabs disabled. On resumption, inspect real zone wrappers, preserve nodes/field values, handle titles and layout gaps, support keyboard focus and partial updates, and fail open for missing mappings. All queries initially load; CCO is a separate adapter.

## Completed implementation — no longer open trial tasks

- Taskbar/Biscuit: daily five-minute greeting with normal timed exit, 15-second head-scratch/curious-tilt idles, wave/hop/playful-goodbye clicks, header divider placement and client on/off switch. Upload packages include the approved behaviour; live installation/verification remains separate.
- Approved V5 vertical and H2 horizontal tabs, nested/standalone coverage, mobile scrolling and native All sections adapter.

- Native button token mapping, outline/warning variants and shared busy presentation.
- Approved ordinary/native forms, responsive panel fields and scoped address changes.
- Configurable checkbox/radio colours, select/autocomplete and calendar presentation.
- Theme Upload and XML Import layout, button states and file-drop integration.
- Messages, native validation presentation and native IQA/report styling.
- Selected section circles, popup/panel loaders and IQA refresh overlay.
- Enhanced IQA reorder: Display, Filters and Sources share the taskbar command palette drag — floating held row, dashed drop slot and sliding neighbours.
- CCO, Save, Sign In, Find and scoped upload/import busy adapters.

Unselected loader variants and taskbar comparisons remain demonstrations.
Deploy shared CSS and JS together for behavior changes. Rebuild generated pages
from their sources and run the usage-guide freshness check before delivery.

## Dialog chrome live check

- [ ] Verify Bootstrap RadWindow title/long-title fit, reload, maximize/restore,
  close hover/pressed/focus, native drag/resize and popup footer divider.
  Shared CSS/JS must load in popup documents for the footer change.
  Content window chrome is implemented; alert/confirm/prompt bodies are deferred until encountered.

- [ ] Verify opt-in `us-cco-sticky-tabs` in live iMIS with the member banner, long menus, partial refresh and site-specific overflow wrappers. Local fixture covers sticky positioning and CCO boundaries; grey-background navigation remains deferred.

- [ ] Native CCO tab switching without page reloads: implemented in the shared theme (`US-CCO-SWITCH` in `zUnionSuite.js`/`.css`, `Config.js` setting, guide section `#cco-tab-switching`); 23 offline scenarios pass in `THeme/UnionSuite-Guides/usage/tests/test-cco-switch.cjs`. **Next: live acceptance** against the deployed theme (see the [approved specification](prototypes/approved/cco-inline-loading/README.md) and its implementation guide), then archive the WIP trial per AGENTS. Background preloading and kept tabs are v2. The custom CCO iPart is retired and archived.
