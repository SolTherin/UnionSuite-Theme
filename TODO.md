# Project TODO

Reconciled 8 September 2026. Implementation status is maintained in
[THEME-INVENTORY.md](THEME-INVENTORY.md); author recipes and installation are in
[Usage-Guide.html](THeme/UnionSuite/Usage-Guide.html).
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

## Planned functionality

- [ ] Named panel action injection and verified handlers: [action plan](THEME-PANEL-ACTIONS.md). Shared report action slots/styles already exist.
- [ ] Combined activity feed: [feed plan](THEME-ACTIVITY-FEED.md). Requires source contracts and lifecycle work, not just styling.

- [ ] Enhanced IQA — preview Business Object sources.
- [ ] Enhanced IQA — when quick search returns an exact match, sort it first.
- [ ] Enhanced IQA — add useful functions to the SQL autofill, for example asi_path and asi_GetDate.

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

- [ ] Native CCO tab switching without page reloads: approve the specification and implement it in the shared theme, applying to every CCO. Live feasibility checklist passed; see the [WIP](prototypes/wip/cco-inline-loading/README.md). Background preloading and kept tabs are v2. The custom CCO iPart is retired and archived.
