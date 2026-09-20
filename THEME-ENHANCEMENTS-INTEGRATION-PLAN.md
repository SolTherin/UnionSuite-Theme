# Theme enhancement integration: loader and file structure

Reviewed 20 September 2026. **Option C taskbar design approved and locked for implementation. Loader architecture and production integration remain planned; this is not a deployment instruction.**

This maps the iMIS Enhanced implementation plan into the existing UnionSuite theme. The current request changes the delivery destination from a separate enhancement suite to this theme. Existing feature scope and behaviour remain the starting point; CDN-only delivery and a second taskbar are not prerequisites.

Reviewed inputs:

- [Implementation plan](<../iMIS Enhanced/IMPLEMENTATION-PLAN.md>) and [feature plan](<../iMIS Enhanced/ENHANCEMENTS-PLAN.md>), updated 19 September.
- [Current IQA output](<../iMIS Enhanced/upload/IQA-Theme/IQA-Enhancements.js>), 216,748 bytes at review. This is the current integration input; the older 55 KB baseline is incomplete by comparison.
- Existing [theme core](THeme/UnionSuite/zUnionSuite.js), [taskbar](THeme/UnionSuite/Scripts/UnionSuiteTaskbar.js), action registrations, client settings and stylesheet ownership.
- RiSE/metadata/source-overlay probes, the reviewed route catalogue and existing IQA module sources, available locally.
- Approved [Option C taskbar reference](references/Taskbar-Workshop.html), [Recents reference](references/Recents-Workshop.html), their maintained `prototypes/` sources and shared `prototypes/approved/taskbar/Popup-Shell.css`. The design contract below supersedes earlier Pencil/Done and alternative-layout requirements for these features.

## Recommendation

Use one `index.js` in the theme root. Keep existing general theme behaviour in `zUnionSuite.js`, retain the theme's `UnionSuiteTaskbar.js`, and add independently loaded feature files for distinct pages and substantial stateful features.

Keep the current IQA designer as one deployment file initially. Its internal modules already provide useful boundaries, and importing/restyling it does not require simultaneously changing its packaging. Separate larger new features where they have different loading conditions, data ownership or lifecycles. Do not create a file for every button or copy operation.

The target below uses classic browser-ready scripts with explicit registration and script-element loading. No bundler or ES-module conversion is required for the initial integration.

## Current implementation versus planned work

| Area | Evidence in the current files | Integration work |
|---|---|---|
| Shared theme and taskbar | Theme core, actions, appearance, banners, report enhancements, contact search/history and Biscuit exist. | Put their existing files under one loader. Extend the theme taskbar; do not also load the external `taskbar-inject.js`. Preserve current search behaviour and dependencies. |
| IQA designer | Current output contains QuickAdd, business-object search, SQL copy/edit tools, searchable filter/sort fields, Display select/clear, filter-value history, Display/Sorting drag order, filter and source workspaces, relationships, SQL editor, help, Enhance switch, path/key copy and Ctrl/Cmd+S. | Port the current output, align CSS/icons, add explicit registration/duplicate protection and reconcile lifecycle with the loader. Existing code is not evidence that integration/live acceptance has passed. |
| RiSE editor | URL block, deep-links, verb decoration and zone layout have console probes; preview has CSI reference code. | Convert to repeat-safe modules. Add content key copying and the shared Enhance control. Preserve native form state/actions. |
| Palette and bookmarks | Reviewed CSV and approved Option C prototype exist, including grouped results, stars, full-row drag, animated placeholders and keyboard reordering. | Port the approved UI into the owning modules; implement catalogue/schema conversion, normal per-user store, ownership contract and optional GM owner. Prototype state is session-only. |
| IQA/content Recents | Approved narrow popup prototype exists with Mine first/default, compact scope control and Refresh feedback. | Port the UI; implement document-backed top-10 lists, verified Mine filtering/modified-by fields and native editor-opening actions. Contact history remains separate. |
| IQA browser path copy | Native address-field/legacy references exist. | New page-scoped toolbar module. Designer-header path copying does not implement this browser feature. |
| Object Browser URL copy and Panel Definition ID copy | Legacy Quicklinks implementations exist. | Extract each into its own page-scoped module. |
| Developer tools | Metadata and field-source probes exist. | One dev controller with two independently enabled tools; production lifecycle, reliable identity resolution and accurate copy feedback. |
| Dialog shortcuts | IQA already handles Ctrl/Cmd+S. | Shared dialog helper adds Maximise/Restore and Save for other verified editors, with one owner per action. |

## Proposed deployed structure

Existing files are marked `[existing]`; all other runtime files below are proposed. `UnionSuiteIQA.js` is a port of existing functionality, not a completed theme integration. File names are the recommended final names.

```text
THeme/
├── UnionSuite/
│   ├── index.js                         # the only header script include
│   ├── zUnionSuite.js                   # existing shared theme behaviour
│   ├── 99-Orion.css                     # existing native foundation
│   ├── zUnionSuite.css                  # tokens and added component styles
│   ├── zzDarkMode.css                   # dark-specific styles; loaded last
│   ├── Tabler.css + Tabler/             # existing icons/font/licence
│   ├── Scripts/
│   │   ├── ActionDefinitions.js         # [existing] standard business actions
│   │   ├── UnionSuiteTaskbar.js          # [existing] sole search/taskbar owner
│   │   ├── UnionSuiteSitewide.js         # taskbar attachment and feature controls
│   │   ├── UnionSuiteIQA.js              # port of current IQA output bundle
│   │   ├── UnionSuiteRiSEEditor.js       # RiSE controller + small editor features
│   │   ├── UnionSuiteIQABrowser.js       # folder/selected-query path copying
│   │   ├── UnionSuiteObjectBrowser.js    # uploaded file/image URL copying
│   │   ├── UnionSuitePanelList.js        # PanelDefinitionId copying
│   │   ├── UnionSuiteDevTools.js         # dev gate and two independent controls
│   │   ├── Shared/
│   │   │   ├── Lifecycle.js             # ready, remount, cleanup, safe preferences
│   │   │   ├── ImisContext.js           # staff/editor/frame context + current user
│   │   │   ├── ImisApi.js               # request helpers, FindByPath, native adapters
│   │   │   ├── Icons.js                 # shared theme icon names/rendering
│   │   │   ├── Feedback.js              # toast/live feedback; reuse theme clipboard
│   │   │   ├── EditorControls.js        # Enhance switch and URL-key/session helper
│   │   │   └── DialogShortcuts.js       # only supported Telerik dialog contexts
│   │   ├── Sitewide/
│   │   │   ├── RouteCatalogue.js        # shared catalogue validation/cache/fallback
│   │   │   ├── CommandPalette.js        # search, smart tags and pin requests
│   │   │   ├── Bookmarks.js             # strip, edit/reorder and ownership contract
│   │   │   ├── BookmarkStore.js         # verified normal iMIS persistence adapter
│   │   │   └── Recents.js               # recently modified IQAs/content, Sitewide/Mine
│   │   ├── RiSE/
│   │   │   ├── DeepLinks.js             # asynchronous IQA/panel target resolution
│   │   │   └── DesignerChrome.js        # zone layout and native verb decoration
│   │   ├── DevTools/
│   │   │   ├── ContentInspector.js      # viewed-page identity/metadata panel
│   │   │   └── FieldSources.js          # native field-ID badges on record pages
│   │   └── Vendor/
│   │       └── fuse-6.6.2.js            # existing palette engine, if retained
│   ├── Data/
│   │   ├── command-palette-routes.json
│   │   └── command-palette-routes.schema.json
│   ├── Usage-Guide.html                 # [existing] generated offline handbook
│   └── docs/                           # [existing] guide/example sources
└── UnionSuite-Client/
    ├── Config.js                       # [existing] settings; expanded as needed
    ├── Actions.js                      # [existing] client action registrations
    ├── Branding.css                    # [existing] generated client branding
    └── Override.css                    # [existing] deliberate client differences

userscript/
└── imis-plus-supplementary.user.js      # optional separately installed GM owner

tools/                                 # build/check tools; not runtime dependencies
references/                            # generated component previews
```

The vendor file is conditional on retaining the existing fuzzy-search implementation. If retained, preserve its supplied code/licence and load it only for the palette. Do not introduce a second fuzzy-search library.

`Data/command-palette-routes.schema.json` supports catalogue authoring/validation, not a second browser request on every page. Runtime catalogue validation belongs to `RouteCatalogue.js`.

## Boundaries and function ownership

| File or group | Owns | Reason for this boundary |
|---|---|---|
| `index.js` | Capture its own URL; release manifest; bootstrap promise; dependency/file loading; route selection; optional module load requests. | One installation point, with no business feature implementation. |
| `Shared/Lifecycle.js` | First mount before/after DOM readiness; one shared endRequest dispatcher for migrated/new modules; subscription disposal; bounded late-WebForms attachment; safe preference access and async generation guards. | Every imported/new module needs the same lifecycle contract. Existing core/taskbar observers are not rewritten just to claim a single subscription for the whole theme. |
| `Shared/ImisContext.js` | Supported document classification, website/application context and logged-in identity from `__ClientContext`. | Distinguishes a staff document, editor and CCO frame without confusing logged-in and selected parties. Classification is DOM-only; it does not wait for a bookmark API. |
| `Shared/ImisApi.js` | Request-verification token, same-origin JSON requests, named-filter query execution and shared Document FindByPath. | Shared network mechanics and document resolution. Keep feature-specific Recents filters and pin persistence contracts in their owning files. Add PageMethods wrappers only when a real consumer uses them; missing PageMethods is not a global startup failure. |
| `Shared/Icons.js` + `Shared/Feedback.js` | Consistent icon rendering, toasts and accessible feedback. | Avoid per-feature icon sets, injected styles and contradictory copy messages. Reuse `.us-copy`/`data-us-copy-target` for ordinary copy buttons. If programmatic copying is needed, expose it from the existing theme copy owner rather than adding a second delegated listener. |
| `Shared/EditorControls.js` | Reusable Enhance switch, native action-row placement adapter and validated `iUniformKey` reading/retention scoped to editor sessions. | IQA and RiSE share the presentation and identity pattern. Their preferences and native selectors remain separate. This is not the viewed-page metadata resolver. |
| `Shared/DialogShortcuts.js` | Verified owning RadWindow, Ctrl/Cmd+M; Ctrl/Cmd+S in supported non-IQA editors. | Works independently of the taskbar and data stores. IQA's existing Save handler remains the sole IQA Save owner. |
| `UnionSuiteSitewide.js` | Attach approved Option C hosts around the existing taskbar; main-row order, bookmarks-bar toggle/visibility, Recents placement and reconnect after host replacement; dev controls as separately planned. | Keeps layout/attachment separate from search, persistence and feature UIs. It must not remove the taskbar on teardown. |
| `Sitewide/RouteCatalogue.js` | One versioned catalogue, TTL/revalidation, validated cache, fallback and route resolution. | Both bookmarks and palette need the same data; stable IDs survive label/URL edits. |
| `Sitewide/CommandPalette.js` | Visible button/Ctrl+Space entry, full-text/fuzzy results, smart tags for ID/username/event/keyword/docs, bookmarks-first groups, whole-row focus, navigation and route-ID star requests. Mount/dispose bookmark reorder controls through Bookmarks. | Owns result/search/keyboard state; reads the bookmark snapshot and sends mutations to its sole owner. |
| `Sitewide/Bookmarks.js` | Empty initial pin set; first-five icon strip and full labelled bar; accessible labels; star/unstar and pointer/keyboard reorder; floating row, placeholder and slide cleanup; pin-event/state contract. No main-row edit pencil. | Owns pin order and reusable palette reorder interaction. Check active ownership before render, applying responses and saving. Missing catalogue entries stay removable; failed saves remain visibly unsaved. |
| `Sitewide/BookmarkStore.js` | Normal per-user iMIS reads/writes, environment/user cache keys, revalidation and multi-tab conflict handling. | The unverified storage API is isolated. No guessed endpoint, Party UDF or unrestricted GM bridge. Anonymous/missing identity prevents personal writes. |
| `Sitewide/Recents.js` | Approved 420px popup, IQAs above content, Mine default/left and Sitewide right, compact equal-width scope buttons, Refresh/busy feedback, two top-10 modified-document lists, loading/empty/error states and native editor actions. | Different API contract and lifecycle from pins and existing recent-contact history. Fetch on opening or filter changes. |
| `UnionSuiteIQA.js` | All current designer modules, help, path/key actions, native Save shortcut and IQA settings. | Preserve the current unit while styling and loading are integrated. Its output already contains the four larger workspace/SQL modules. |
| `UnionSuiteRiSEEditor.js` | RiSE controller, Enhance preference, full/relative URL copying, editor DVK copying and preview toggle. | These small features share one document and on/off lifecycle. No individual `CopyUrl.js`, `CopyKey.js` or `PreviewToggle.js` is necessary. |
| `RiSE/DeepLinks.js` | The two IQA source-label variants and multi-instance panel captions; verified folder/query/panel destinations. | Async lookups, deduplication, paging, duplicate captions and stale responses warrant an independent file. Preserve dots in names and literal underscores in paths. |
| `RiSE/DesignerChrome.js` | Configure/Copy To/Move To/Minimize/Restore/Remove icon decoration, hidden Connect and zone header/footer actions. | Related DOM adaptation, cleanup and native-action preservation belong together. Preview coordinates via scoped state/classes from the controller. |
| Browser/list files | IQA path; uploaded-file public URL; panel GUID copying, respectively. | Separate native pages and markup. Share clipboard/icon helpers; retain one file per page rather than one per button. |
| Dev controller + two tool files | Master dev state; independently controlled content inspector and record-field source overlay. | One logical DevTools feature/owner as planned, with separate physical implementations. Large metadata resolution need not load merely to show field badges. |
| Optional userscript | GM pin storage, bookmark takeover, UI/actions while GM-owned and pinned-ID announcements. | GM storage privileges require userscript installation. The normal theme loader cannot supply them. |

Keep the existing `window.imisPlus` registration shape described in the source plan (`modules`, `helpers`, `config`) for the new enhancement runtime, without replacing it on subsequent loads. Existing `window.UnionSuite*` theme APIs stay intact. Each feature has one explicit registration and one owner; filenames do not require renaming storage keys or duplicating globals.

## Approved design: Option C — Combined

Approved by James on 20 September 2026. This section is the implementation baseline for the taskbar, bookmarks, command palette and Recents. A/B and the separate bookmark editor remain historical comparison tools; they are not production layout options. Approval covers the design and interaction contract, not completed storage/API integration or live acceptance.

### Taskbar and bookmarks bar

- Extend the existing theme taskbar. Main-row order: brand, up to five bookmark icons, divider, bookmarks-bar toggle, Go to… palette button, divider, existing contact Quick Search, Full Search and appearance control. Keep the existing contact search/history and Biscuit behaviour.
- The first five saved bookmarks populate the main row in saved order. Five is a maximum, including on narrow screens; controls may wrap. Give icon-only links accessible destination names and tooltips. A new user starts with no bookmarks; the four/nine workshop samples are fixtures only.
- Omit the edit pencil. Stars in the palette add/remove bookmarks, and its drag handles or keyboard commands change their order. The external workshop Edit bookmarks button and move-button editor are not production taskbar controls.
- The toggle sits immediately to the right of the bookmark/control divider, before Go to…. It shows/hides a labelled second bar containing all bookmarks, including the first five. Keep its label and `aria-expanded` state accurate and associate it with its controlled bar.
- Start the bar collapsed. Retain visibility through feature rerenders/host remounts within the active document. Cross-visit persistence of visibility is not part of this approved design; bookmark data persistence belongs to BookmarkStore.
- Put Recents at the right of the labelled bookmarks bar. Its normal entry is available when that bar is shown. Any programmatic Recents entry must reveal the bar before positioning the popup.
- All labelled bookmarks wrap as needed. Preserve constrained Quick Search sizing and main-row alignment; keep Biscuit perched on the main header edge and use the reference's below-1060px hiding rule. Recheck against actual native header widths during implementation.

### Palette and bookmark ordering

- Open the centred palette from Go to… or Ctrl+Space. Keep destination search separate from contact Quick Search. Arrow keys browse destination rows, Enter opens the destination, Escape closes, and focus returns to the opener. Tab still reaches each star and drag handle.
- Show matching bookmarks first in saved order, then a divider and Other destinations. Apply the query to both groups. Pin/unpin moves a result between groups and updates both bookmark presentations immediately; persistence failures must remain visible and recoverable.
- Each bookmarked result has a grip. Starting a drag picks up the entire row; the floating row follows the pointer at 80% opacity. Insert a blank, dashed, row-height placeholder at the proposed drop position. Move that placeholder and reorder neighbouring rows in real time.
- Animate surrounding rows into place over 180ms. Direction changes continue from current visual positions; hit testing must avoid animation-induced jitter. Honour reduced motion by skipping slides.
- Drop inside the list commits the shown order. Escape, pointer cancellation/lost capture, or release outside the list cancels. Support edge scrolling and dispose pointer listeners, floating rows and animations on close, rerender or host replacement.
- The grip supports Alt+Up/Down keyboard reordering, with accessible feedback and retained focus. While filtering, reorder only the matching bookmark slots; nonmatching bookmarks keep their positions. Both input methods call the same bookmark owner and persistence path.
- Arrow-key navigation highlights/outlines the whole row, including grip and star. Individual control focus rings stay within the row's rounded boundary. Keep a continuous search background across icon, input and Esc hint in both appearances; apply `--field-focus-colour` and `--field-focus-glow` only while the search field is focused.

### Recents

- Use the approved narrow popup: 420px maximum width, constrained to the viewport, with IQAs above content in a single scroll region. Keep the heading, scope controls and Refresh footer visible; cap the list region at the reference's 315px where space allows and reduce it for short viewports.
- Keep the IQAs/Content section headings sticky at the top of the scroll region while their own section is visible. Content takes over as it reaches the top. Use an opaque theme surface and divider so rows do not show through, in light and dark mode.
- Mine is selected initially and appears on the left; Sitewide is on the right. Use the final compact segmented control: equal columns, 72px minimum button widths, 28px minimum button height, 12px labels, 3px rail padding and 2px gap. The selected button uses the theme surface/shadow. There is no underline, and this control does not use the larger home-page `us-section-tabs` component.
- Retain two independently bounded lists: up to ten modified IQAs and up to ten modified content pages for the selected scope, sorted by last modified. Show the item title, modifier, relative time and appropriate type/destination icons. Mine identifies the authenticated user, not the selected contact.
- Refresh keeps its label, replaces its icon with the shared `.us-button-spinner`, disables duplicate refresh clicks and sets accessible busy state on the control/results. Restore normal state on completion, failure or cancellation; announce completion/failure. The prototype's timed refresh is a simulation, not the production data adapter.
- Close/Escape restores focus. Fetch on first use, scope change or Refresh through the owning module; guard stale responses after a scope change or close. Native editor actions, empty/error/retry states and permission handling still require real data integration.

### Theme styling and implementation sources

- Reuse the approved popup shell conventions: theme surface/border/shadow, 8px shell corners via `--radius`, sunken title bar/divider, 14px semibold title, compact 30×28px close control with danger hover/focus, consistent footer spacing and theme Tabler icons.
- Use 12px supporting text and 13px destination/item titles. Go to…, Recents and footer action buttons use the shared 36px compact control scale; the Recents scope control deliberately uses the smaller 28px scale above. Preserve visible keyboard, hover, active and disabled states.
- `prototypes/approved/taskbar/Taskbar-Workshop.frame.html`, `.frame.css` and `.frame.js` are the approved integrated reference. `prototypes/Recents-Workshop.*` retains the isolated popup reference. `prototypes/approved/taskbar/Popup-Shell.css` is the shared preview shell/control source. Outer comparison controls, sample dashboard/data, mock navigation and A/B variants stay in previews.
- Port component styles into `zUnionSuite.css`, dark-specific rules into `zzDarkMode.css`, and fix any affected existing native presentation in `99-Orion.css`. Production does not load `Popup-Shell.css` or duplicate a separate Recents stylesheet. Client overrides retain their established ownership.
- The design fits the existing proposed files: Sitewide owns attachment/visibility; CommandPalette owns results and focus; Bookmarks owns order/reordering and emits updates; BookmarkStore owns saves; Recents owns its popup/data lifecycle. Use shared Icons/Feedback and existing spinner styles. No separate file is required for the grip, placeholder, toggle or shell merely because it is a distinct visual element.

### Implementation acceptance for the approved design

- Compare the implemented C layout against the two approved references in light/dark mode, at desktop and narrow widths, with empty, four, five and more-than-five bookmarks. Verify wrapping, all-bookmark access, Recents placement, native search, Full Search, appearance and Biscuit alignment.
- Check stars, pointer and keyboard reorder, filtered slot preservation, full-row focus, placeholder movement, interrupted slides, reduced motion, edge scrolling and cancellation. Verify order across strip/bar/palette and confirmed persisted state, including save failures and the optional GM owner's takeover.
- Check first-open Mine, equal compact scope widths/no underline, both top-ten limits, authenticated-user filtering, sticky section-heading handoff and a visible footer while scrolling, Refresh busy/error/retry and rapid scope/close changes. Validate actual editor opening and focus return.
- Check double loading, partial taskbar replacement, event disposal and one active owner for each feature. Do not carry the prototype's fake data, timer-based requests or blanket navigation interception into production.

## Updated loader structure

Proposed header include after implementation, using the actual deployed theme URL:

```html
<script src="/App_Themes/UnionSuite/index.js" defer></script>
```

The default client location is resolved as `../UnionSuite-Client/` relative to the loader. Allow a loader attribute/configured bootstrap path for tenants whose client folder has a different name. Never derive asset paths from the current iMIS page. API/record destinations, in contrast, resolve against the active iMIS environment, not the theme/CDN asset origin.

Conceptual load graph, not executable code:

```text
index.js: capture URL + establish one startup promise
│
├─ resolve client Config.js (or declared defaults) and DOM readiness
├─ zUnionSuite.js
│  ├─ ActionDefinitions.js -> client Actions.js
│  └─ existing shared theme features remain available in themed documents
│
├─ Shared/Lifecycle.js + Shared/ImisContext.js
│  └─ classify supported staff/editor/CCO context
│
├─ parent staff page
│  ├─ UnionSuiteTaskbar.js -> UnionSuiteSitewide.js
│  ├─ bookmark strip -> RouteCatalogue.js + Bookmarks.js + BookmarkStore.js
│  ├─ palette open -> CommandPalette.js + shared catalogue + optional Fuse
│  └─ Recents open -> Recents.js + context/API helpers
│
├─ QueryBuilder/Design.aspx -> UnionSuiteIQA.js + its shared helpers
├─ ContentRecordEdit.aspx or ContentDesigner.aspx
│  └─ UnionSuiteRiSEEditor.js + RiSE/DeepLinks.js + RiSE/DesignerChrome.js
├─ AsiCommon/Controls/IQA/Default.aspx -> UnionSuiteIQABrowser.js
├─ AsiCommon/Controls/BSA/Browser.aspx -> UnionSuiteObjectBrowser.js
├─ PanelEditor/PanelDefinitionList.aspx -> UnionSuitePanelList.js
│
├─ confirmed Telerik editor context -> Shared/DialogShortcuts.js
└─ dev mode enabled -> UnionSuiteDevTools.js
   ├─ inspector opened -> DevTools/ContentInspector.js
   └─ sources enabled + supported record DOM -> DevTools/FieldSources.js
```

Shared helpers load once and only before consumers that actually require them. The graph shows feature dependencies, not a requirement to serialize independent branches. Bookmark storage failure must not stop search, palette navigation, the editor or unrelated copy tools. Client action registrations follow standard action registration and their verified business helpers; missing business helpers are not silently replaced.

Important loader contracts:

1. Cache promises by resolved, versioned file URL; wait for both script loading and expected registration. Existing self-starting scripts need adapters/registration markers, not a second startup call. Add a duplicate guard to the imported IQA bundle before mixing it with any loader.
2. Keep one startup promise per document. Dynamic loading must work after DOMContentLoaded. Remounting UI after a postback does not re-download/re-execute script files.
3. Use load/error/time-out handling and isolate dependency failures. A late registration after a timeout must not automatically start a disabled feature. New files register first; the loader/controller starts them after readiness checks.
4. Core theme loading is distinct from staff-only enhancements: do not make appearance, banners and report behaviour depend on a staff marker. Do not inject parent taskbar, pins or palette into CCO/editor frames.
5. The same entry include must reach each required editor document. A parent include alone cannot handle keyboard events inside an iframe. Inline Telerik dialogs are handled only when focus and ownership are confirmed, independently of taskbar mounting.
6. Load catalogue data when bookmarks first need it or the palette first opens. Fetch Recents only when used. Load diagnostics on demand. Keep default-off dev tools and module preferences separate from IQA/RiSE Enhance switches.
7. Preserve `iqaEnhanceMode`, use independent `riseEnhanceMode`, and retain the planned `imisPlus.moduleToggles` / `imisPlus.inspectorOpen` contracts. Safe storage access must fall back to working in-memory state. The current IQA top-level mode reads need hardening for unavailable storage.
8. For the first IQA migration preserve its current always-on QuickAdd and source-capture behaviour while Enhance is Off. A whole-module disable is a separate loader setting. Do not assume the IQA pill presently disables every operation.
9. Capture a central release version in the loader and apply it consistently to child assets. Keep the stable `index.js` URL revalidated/short-cached so releases do not require changing the header. Upload referenced files before publishing the updated loader; do not use a new timestamp on every request.
10. Replace the old individual includes during deployment. Deduplication cannot make arbitrary legacy scripts harmless: remove overlapping standalone IQA, Quicklinks IQA/shortcut, old taskbar and extension injections while retaining required unrelated business helpers.

## Styling and icon integration

- Fix existing native control presentation in `99-Orion.css`; put added editor/palette/bookmark/diagnostic components and tokens in `zUnionSuite.css`.
- Remove migrated hard-coded/injected component styles from the IQA/probe code as each feature is integrated. Scope editor styles to their editor state, including off/restore behaviour. Do not simply place another override layer over injected CSS.
- Use existing semantic surface/text/border/status/focus/type/spacing tokens. Client branding stays in Branding/Override; all dark-specific rules stay in `zzDarkMode.css`.
- Keep the current icon assets. Use the theme's Tabler action conventions and matching existing inline icons where appropriate; expose a common semantic icon adapter for the new features. Do not add another remote icon library or rewrite every existing icon as part of this migration. The existing `UnionSuiteActionIcons` export manages tooltips, not a general SVG factory.
- Reuse the theme's delegated copy controls. Keep record Copy ID/Username within the banners; no new Party script, duplicate button or unrelated username lookup.
- IQA and RiSE use the same redesigned theme-aligned Enhance control, with separate remembered settings and native action-row adapters. Preserve keyboard operation, labels and narrow-window wrapping.
- CSS still loads through the normal theme stylesheet order; the JS index does not need to inject or dynamically reorder the theme stylesheets. Ensure those styles and icon assets also reach the editor documents.

## IQA: what should eventually be separate?

For initial deployment, **one `Scripts/UnionSuiteIQA.js`** is the recommendation. The index will load it only in the designer, so dividing it brings maintainability benefits rather than reducing downloads on ordinary pages. The current output has a designer-page execution guard; it does not itself prevent downloading the bundle elsewhere.

If a later extraction is worthwhile, the strongest independent candidates are already identifiable in the output and separate source modules:

- `IQA/FilterWorkspace.js`: filter layout, group explanation and staged reorder.
- `IQA/SourceWorkspace.js`: business-object reorder and native response sequencing.
- `IQA/RelationshipWorkspace.js`: relationship entry modes and field/join handling.
- `IQA/SqlEditor.js`: SQL editing/completion/validation and source-definition cache.

Keep `UnionSuiteIQA.js` as their controller. QuickAdd/search, Display/Sorting controls and header/help actions can remain grouped until their size or independent usage justifies another boundary. Do not extract one file per helper.

Do not lazy-load IQA code solely from the currently visible tab without preserving cross-tab work: SQL source capture currently runs independently of Enhance mode. Check callback references, registration order and source capture before splitting.

Reconcile the full current output with the separate module sources/build scripts before selecting a canonical maintained source. The older baseline plus a subset of modules is not a proven rebuild of the latest output. After migration, maintain theme-owned sources and generate any continued standalone/CDN output from them; avoid two independently edited copies.

## Scope, verification and implementation order

Keep all accepted MVP features in the architecture. Sanitizer, Communications new-tab behaviour, the extension replacement and cross-device GM sync remain deferred; skipped tab icons/BO explorer/live iPart preview do not become loader dependencies. If later requested, Sanitizer warrants its own file, not additions to every feature's API helper.

Before implementing the affected features, verify the normal bookmark storage API and per-user enforcement, Recents document filters/modified-user mapping and native editor keys, stable catalogue IDs/environment-specific destinations, and editor document/selector/RadWindow coverage. These uncertainties do not block building unrelated theme loading or copy features.

New IQA requests use `GET /api/query` with named filters; prompted names come from `GET /api/QueryParameterDefinition?QueryPath=...`. Preserve the existing taskbar query contract during this packaging change; migrate its legacy request separately once its prompts are verified. Do not propagate `/api/iqa` into new code.

Recommended sequence:

1. Implement/test the index using only existing deployed theme files, with dependency/duplicate/failure checks. Include readiness reporting for callers that previously assumed synchronous global availability.
2. Port the current IQA output as one registered file, consolidate styles/icons and preserve preferences, postbacks, Save ownership and existing module checks. Recheck native Save/reopen behaviour in iMIS.
3. Establish shared lifecycle/context/UI/editor helpers; adopt them incrementally without rewriting unrelated core features. Port RiSE and the three browser/list modules, plus confirmed dialog shortcuts.
4. Implement the approved Option C design above in Sitewide attachment, catalogue/palette, bookmarks/storage and Recents as their data contracts are verified. Port the approved reference interaction and shell styles into their owners; keep historical A/B layouts and demo fixtures out of runtime. Preserve taskbar contact search/history and appearance controls throughout.
5. Add the separately installed GM owner and DevTools, with ownership/startup-order and independent-toggle checks.
6. Update installation instructions, copyable include, feature status/examples and the standalone usage guide as implementation lands. Regenerate with `node THeme/UnionSuite/guides/usage/build/build-theme-usage.cjs` and verify `--check`; browser-check changed guide examples. Keep generated previews in `references/` and the guide offline.

Acceptance follows the original plan's section 15: delayed/missing dependencies, double includes, partial replacements, off/on cycles, stale responses, native form persistence, clipboard rejection, correct popup focus, both bookmark owners/startup orders and actual supported-tenant smoke tests. This review does not claim those tests have run.
