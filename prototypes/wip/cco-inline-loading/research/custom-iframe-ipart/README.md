# Custom CCO iPart — start here

> **Retired and archived (23 September 2026).** The custom iframe CCO iPart is no longer a supported feature. Native CCO tab switching without page reloads replaces it: see the [feature WIP](../../README.md). These retained documents record its research, plans and verification. The implementation (source, builds, tests, packages, vendor decompilation) is archived locally in the Git-ignored `archive/Custom CCO iPart/` and remains in Git history. Its usage-guide sections, theme support rules and theme test cases have been removed. Links to archived files are shown as plain text. Statements below are historical.

**Native CCO inline-loading investigation, 22 September 2026:** see the [handover index](../native-cco-handover/README.md) for the latest A/B findings, preserved user reports, restart commands and the next Cases-grid compatibility experiment. That investigation revisits loading within the native CCO; it does not replace the retained-frame implementation described below.

Handover date: 12 September 2026. Development continued locally on the same date: the dedicated runtime/editor vertical slice and optional preload/popup trials are implemented. This is not an installed or production-ready iPart.

## Current implementation

Requested follow-up work is tracked in [Project TODOs](TODO.md).

Tab loading/edit spacing: the spinner now sits before the pencil's full click target while parent Easy Edit is on. Caption space stays reserved in vertical, horizontal and touch layouts; Easy Edit off restores native spacing. Replace the rebuilt ZIP and reload. A browser regression reproduces the previous overlap and checks caption clearance, clickable pencils during loading and ready-state cleanup. See the loading-state example (archived locally: `archive/Custom CCO iPart/references/Usage-Guide.html`).

Tab page editor (14 September 2026): parent Easy Edit now shows a pencil beside each tab. It opens that page in the parent's native Content Designer without selecting the tab. Every editor close, including Cancel/X, refreshes only the edited tab after the existing unsaved-change check and restores focus. Other retained tabs stay intact. The native argument-12 close contract was verified from supplied probes; local browser and standalone-upload tests pass. Replace the rebuilt ZIP and reload; live Save/Publish remains to be checked. See the page editor guide (archived locally: `archive/Custom CCO iPart/references/Usage-Guide.html`).

Outer gutter correction (14 September 2026): Orion's outer rows extend 20px beyond their wrapper. The native CCO's padding balances them, but padding outside a custom CCO iframe cannot balance a row inside it. The child stylesheet now clears horizontal margins only on the supported outer page-layout rows, preserving column padding, nested iPart/field gutters and deliberate grid scrolling. The regression reproduces the 20px overflow with full native/Orion/shared CSS and checks every fixture tab at desktop/mobile widths. Install the rebuilt ZIP; see the gutter gotcha (archived locally: `archive/Custom CCO iPart/references/Usage-Guide.html`) and style ownership table (archived locally: `archive/Custom CCO iPart/references/Usage-Guide.html`). Live verification remains pending.

Popup sizing fix (14 September 2026): the user confirmed that iMIS assigns an inline height to `#MainPanel .EmptyMasterContentPanel`, whose native `overflow:auto` hides content from the frame measurement. The runtime now makes those outer template shells flow at natural height, overriding the inline height and page-level scrolling inside the embedded child only. A browser regression reproduces the previous shrink to 480px and checks stable sizing after native-style resize callbacks, tab switches, updates and refresh. Install the rebuilt upload ZIP; see the popup sizing guide (archived locally: `archive/Custom CCO iPart/references/Usage-Guide.html`).

Responsive-width update (14 September 2026): child page shells now fit the tab's available width, including native 100%-width roots with page margins and fixed/minimum-width outer wrappers. Native columns reflow as the container grows or shrinks. Install the rebuilt upload ZIP and reload the parent page; no new class or setting is required. Tests reproduce the overflow with the bundled iMIS CSS and verify all three fixture tabs at desktop/mobile widths. See the responsive-width guide (archived locally: `archive/Custom CCO iPart/references/Usage-Guide.html`); live confirmation remains pending.

Refresh-control update: Page options and Open full page are removed. A bottom-right icon with the hover text "refresh tab" reloads only its own child page, preserving other retained tabs and checking tracked unsaved edits. Collection options still reloads the whole collection's settings and tab list. Install the rebuilt upload ZIP; see the refresh-control guide (archived locally: `archive/Custom CCO iPart/references/Usage-Guide.html`).

Tab-link update (14 September 2026): incoming navigation accepts a key, tab number, name with spaces, or dashed name under the configured parameter. `Directory=About` and `Directory=Notes-and-Interactions` resolve automatically from the available tabs. An unset URL value format defaults to dashed names; explicit saved formats remain in place. The tab-link guide (archived locally: `archive/Custom CCO iPart/references/Usage-Guide.html`) includes copyable examples. Install the rebuilt upload ZIP and reload the page.

Content-height update (14 September 2026): child frames now grow and shrink with their content so the main page scrolls. Install the rebuilt `upload/UnionSuite-CCO.zip` at the existing location and reload the page; no new class or setting is required. Local browser checks cover updates, tab retention, preloads, mobile reflow and cleanup. Live iMIS verification of this update remains outstanding. See the content-height guide (archived locally: `archive/Custom CCO iPart/references/Usage-Guide.html`).

For iMIS-server upload, use upload/UnionSuite-CCO.zip (archived locally: `archive/Custom CCO iPart/upload/UnionSuite-CCO.zip`) or its standalone folder (archived locally: `archive/Custom CCO iPart/upload/UnionSuite-CCO/`). It contains self-contained `display.html` and `configure.html` files plus setup instructions. Reference their actual uploaded URLs; no hostname edit or separate CSS/JS upload is required. This inline packaging variant is locally tested; live iMIS script execution and token substitution remain verification gates.

Start with [README-installation.md](README-installation.md) for the build, local preview, generated assets and exact runtime contracts. [Live-Verification.md](Live-Verification.md) separates passing local tests from every outstanding iMIS gate. The standalone trial usage guide (archived locally: `archive/Custom CCO iPart/references/Usage-Guide.html`) includes screenshots and copyable source.

`runtime-shell.html` and `config.html` are build sources; `src/` contains the framework-free component, `tools/` the local builders/preview and `tests/` the contract/browser fixtures. `dist/` is generated for an intentionally invalid host until a sandbox target is chosen. No production files, theme assets, remote Content Types or vendor DLLs have been changed.

## Goal and selected direction

Build a dedicated UnionSuite client-based Content Collection Organizer. Speed is the user's priority: initial tab loads first, other pages can load in the background, and revisiting a ready tab should switch immediately without reloading the parent. Use native iMIS content pages in retained same-origin frames. Preserve native forms, IQAs, popup callbacks and member context.

Use the proven HubForms client-based Content Type pattern to receive BOTH placement and containing-page keys through token substitution. Fetch our own JsonSettings configuration. Resolve a configured folder by its document-version key, then load its pages individually. Do not base the new implementation on discovery postbacks, GUID stubs, guessing paths, or Easy Edit.

The user requested this package so development can continue in another session. No new task has been created, no assets deployed, and no production theme change is part of this handover.

## Read in this order

1. research/Findings-and-Decisions.md — authoritative consolidated conclusions, including corrections to earlier theories.
2. Creation-Plan.md — phased implementation and acceptance gates.
3. examples/Api-Examples.js and examples/config.example.json — reference contracts, not deployed implementation.
4. examples/CCO-Retained-Tabs-Trial.js — working historical six-tab frame trial.
5. reference-code/HubForms/ — copied integration examples; adapt rather than deploying them unchanged.
6. Sources.md — original projects, evidence and documentation links.

## Status

Confirmed live by user: native CCO configuration API; folder enumeration returning the expected six pages; retained child content frames; query/context forwarding trials; parent-width popup bridge; popup Save refreshing the originating child job report; background POST discovering a stub.

Confirmed failure: stub-to-page SQL lookup returns eight different published pages with the SAME FULL ContentItemKey. A placement key alone is not sufficient identity. Use the pair ContentKey + ContentItemKey and verify returned identities.

Implemented locally: dedicated Content Type assets and configuration editor, exact pair identity/config lookup, immediate folder-driven tabs, one selected frame, retained frames, opt-in sequential idle preload and popup forwarding, manual keyboard activation, namespaced history, context invalidation and conservative dirty/lifecycle handling. Local mocked/fixture evidence is recorded separately from the historical live findings above.

Still outstanding: registration and save/reopen in live iMIS; route/publication/role/native-control checks; complete native dirty/history/popup acceptance; realistic performance/memory measurements; approved production theme/docs integration and deployment. The live checklist remains unpassed.

## Important distinctions

- The runtime shell executes in the iMIS document after iMIS retrieves/substitutes it. Do not put the runtime shell in a cross-origin iframe.
- Child content pages use same-origin iframes to preserve their independent Web Forms state.
- ContentKey in ContentItem API identifies the containing document version. ContentItemKey identifies a placement within that context, and can be reused on copied pages.
- Old DLLs are local research inputs only. Do not deploy or replace vendor assemblies.
- Historical handover/probes are snapshots. Where they conflict, Findings-and-Decisions.md and Creation-Plan.md take precedence.

## Prompt for the next session

Read this folder's README, Findings-and-Decisions and Creation-Plan. Build the phase-one client-based UnionSuite CCO vertical slice using the HubForms token/config pattern and verified Document API. Keep it isolated from production theme deployment. Start with one configured folder, one selected child frame, and correct per-placement identity. Then test preload and the existing popup bridge on iMIS before expanding scope. Preserve implemented/trial/planned distinctions and follow the parent project's AGENTS.md documentation requirements.
