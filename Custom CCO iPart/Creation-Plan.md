# Creation plan — dedicated UnionSuite CCO

## Implementation checkpoint — 12 September 2026

The phase 1–2 vertical slice now exists locally in `src/` and generated `dist/` assets. Retained frames, opt-in preload/popup trials and initial accessibility/history/context/lifecycle policies are also implemented locally. `README-installation.md` describes the actual contract (including automatic full-pair selection parameter names); `Live-Verification.md` records acceptance status. All phases below remain the release plan: mocked checks do not pass live acceptance, and no production theme integration or deployment has occurred.

## Proposed architecture

A client-based RiSE Content Type with a hosted configuration HTML page and runtime shell. iMIS substitutes placement/page tokens into the shell. Shared JS initializes each mount independently, reads its exact ContentItem row, and uses JsonSettings for folder and behaviour choices. Retained same-origin frames host native content pages. No custom server DLL, native CCO modification or discovery POST is required.

Proposed mount (names not yet implemented):

```html
<div class="us-cco" data-us-cco
     data-content-item-key="[x-contentItemKey]"
     data-content-key="[x-contentKey]"></div>
```

Use an external bootstrap script in the hosted shell, as HubForms does. No inline onclick handlers. Confirm token substitution in the new Content Type before any dependent work. Tokens identify the containing content record, which may itself be embedded, not necessarily the outermost document.

## Phase 1 — identity/configuration vertical slice

1. Implement runtime-shell.html and a config page, adapting reference-code/HubForms. Choose new hosting URLs; do not deploy or overwrite the copied HubForms URLs.
2. Test iMIS runtime-fetch URL trailing slash and configuration asset reachability. HubForms uses Pages runtime and R2/CDN config due to observed fetch behaviour; treat this as a proven reference, not universal hosting policy.
3. Configuration writes a folder DocumentVersionId plus display path/caption. Keys drive requests; paths are labels. Save through the native JsonSettings editor mechanism and preserve unrelated properties. Validate save/reopen.
4. Runtime fetches ContentItem with both substituted keys, validates matching Data.ContentItemKey AND Data.ContentKey, rejects ambiguous/wrong records. Accept the wrapper shapes shown in reference code; adapt form-specific parsing to CCO settings.
5. Handle unresolved tokens, missing config, denied access, empty folder and failures visibly. Test two placements on one page and copied pages with identical placement keys.

Acceptance: saved folder config round-trips; two instances resolve their own config; no manual GUIDs in author HTML.

## Phase 2 — folder and selected page

1. Use verified FindDocumentsInFolder request. Check service success flag as well as HTTP status. Validate response types and keys; handle nested folders/cycles deliberately.
2. Match native published/permission behaviour. The API permission profile has only been established for staff in these tests. Test each intended role before broadening use.
3. Sort by Name and label with AlternateName (fallback Name). Use document-version keys as internal identities; do not map by captions alone.
4. Load only initial selected page. Validate ContentPreview route availability/status across roles or choose a verified published execution route. Show loading/error/retry and explicit full-page fallback.
5. Same-origin frame with meaningful title, accessible tab controls and active-only focus. Do not nest the runtime shell in a cross-origin frame.

Acceptance: native search, sorting/paging, downloads, links and forms work; no duplicate page header; selected tab deep link loads correctly.

## Phase 3 — speed and retained state

Load active tab immediately. Sequential idle preloading is a starting policy, not a locked timing requirement. Prioritize a clicked tab over queued speculative work. Avoid preloading all large pages simultaneously. Report switching as instant only for ready frames. Measure initial load, time-to-ready, warm switch, request counts and memory with realistic tabs.

Cache per containing key + placement key + destination + effective context parameters. Invalidate when ID/context or config changes. Avoid persistent browser storage of member HTML or API payloads. Consider max retained frames only after measuring; do not evict dirty frames silently.

## Phase 4 — popup bridge and lifecycle

Port the tested ShowDialog_NoReturnValue bridge. Parent renders popup for viewport percentages; child callback retains child context. Mark originals to avoid double-wrapping; reinstall after load; restore/dispose correctly; avoid forwarding loops. Test save/cancel, validation failures, nested dialogs, multiple frames and parent/child navigation.

Initialize idempotently, dispose replaced mounts/listeners/observers, and integrate with ASP.NET partial replacement. Do not scan/wrap every nested iPart as another CCO. Follow the repository iPart wrapper contract: CSS class produces a separate div inside ContentItemContainer.

## Phase 5 — navigation/accessibility

Implement keyboard arrows/Home/End, clear selected/focus states and mobile layout. Choose and document whether selection uses stable page ID, unique caption or another stable key. Parent query/history must support Back/Forward and direct links without reloading. Namespace selection parameters per instance. Decide how child link navigation affects browser history and frame state; provide a deliberate open-full-page action.

Carry parent context parameters while reserving renderer and CCO-owned params. Repeated parameter handling must be explicit. Test ID changes and multiple CCOs. Dirty state, save warnings and navigation policy need live validation before rollout.

## Phase 6 — theme/docs and release

Use UnionSuite tokens and existing CCO/tab comparison as visual reference; standalone secondary-navigation styling on grey backgrounds remains undecided. Do not lock an unapproved style through this build.

Keep native foundation changes in 99-Orion.css, UnionSuite additions in zUnionSuite.css/js, and client differences in client Override.css. Only promote tested behaviour. Update Usage-Guide.source.html and build/check the standalone guide when adding supported theme features. Include copyable inner author HTML, placement instructions, configuration steps, lifecycle and limits. Verify offline guide and live iMIS browser behaviour. Publish only with user authorization for the chosen target.

## Suggested source layout

runtime-shell.html; config.html; src/config.js; src/documents.js; src/runtime.js; src/frames.js; src/popup-bridge.js; src/history.js; src/styles.css; tests/; README-installation.md.

Avoid a framework unless needed. The native form pages are already isolated by frames; Shadow DOM on the navigation shell is an optional choice and can block shared theme selectors. Prefer an explicit theme integration decision.

## Release gates

- Identity/config wrong-row and two-instance checks.
- Folder order, nesting, empty/denied/deleted/unpublished records.
- Cold/ready/in-flight/error tab selection, context change and repeated URL params.
- Native IQA search/sort/paging/refresh; popup Save refresh stays in originating child.
- Viewport sizing, keyboard, focus, narrow screens, reduced motion.
- Partial postback replacement, mount disposal, no leaked bridges or duplicate handlers.
- Back/Forward, deep link, child navigation, unsaved state.
- Real measurements under intended staff/member roles; mocks alone are insufficient.
