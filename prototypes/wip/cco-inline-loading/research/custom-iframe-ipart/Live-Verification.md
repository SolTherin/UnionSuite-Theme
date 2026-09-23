# Live acceptance record — dedicated UnionSuite CCO

Status: **the user confirmed the uploaded configuration page opens after correcting the ZIP path** to include `UnionSuite-CCO/`. A screenshot exposed misdecoded em dashes in its dropdown; static upload text has now been changed to ASCII, locally checked, and requires re-upload. Save/reopen, runtime identity and other gates remain unverified. Historical staff tests of the reference API/frames/bridge are documented in research/Findings-and-Decisions.md; they do not pass these gates for the new implementation. Local fixtures use synthetic keys and member data.

## Locally implemented and tested

Popup sizing follow-up (14 September 2026): the user supplied an active iframe at 480px and confirmed an inline height on `#MainPanel .EmptyMasterContentPanel` together with native `overflow:auto`; removing overflow stops the observed shrink. The new frame adapter neutralizes height/min/max-height and overflow on the outer template shells while excluding nested iPart/widget containers. `node tests/frame-shell.cjs` reproduces the earlier clipped state and now passes stable-height sampling, all fixture tabs, mobile, repeated inline resize writes, partial replacement, refresh, content removal and cleanup. Its resize callback is simulated, not copied native JavaScript. The corrected package still needs live re-upload and confirmation.

Responsive-width follow-up (14 September 2026): user reports horizontal scrolling on every tab. The CCO now normalizes the child document roots and outer native page-shell widths. `node tests/frame-width.cjs` reproduces native shell overflow with the saved UltraWave stylesheet and checks all three fixture tabs at 390, 900, 1280 and 1480px parent widths, responsive columns/gutters, reachable controls, retained input, nested iPart sizing, native grid scroll regions, refresh and both tab orientations. This is local evidence; the user's actual child documents were not available to inspect. Verify each deployed tab at wide/narrow widths and after search/paging or other native updates.

Subsequent user confirmation: the compatibility update fixed page persistence; the screenshot shows six tabs and a rendered About page. People search retains its search when returning to the tab. The next reported issue is a contact link opening inside the frame; the supplied route is `/UTNewTheme/Party.aspx?ID=...`. A parent-target navigation update passes local tests with that route and synthetic IDs, but its live retest is pending. The save issue is reported resolved, though the bundled changes do not identify one isolated root cause.

Latest user report: configuration popup saves and closes, then the containing page loses the new placement on Save. Supplied console logs contain telemetry CORS failures and general framework/CSP warnings, without a CCO exception or failed save response. The local Hub Widgets comparison led to save-compatibility changes (input sync, native name, native validator, scoped handlers, Enter guard and ng-non-bindable). `tests/editor-save.cjs` passes simulated host cases; the actual cause and live fix are **not confirmed**.

Contract tests cover exact pair matching, wrong/ambiguous/conflicting records, wrapper shapes, config validation, typed folder request, ordering, filtering, repeated context and popup argument identity. Browser scenarios cover selected-only and selected-first preloading, clicked/in-flight priority, retained input, Back/Forward, clean and dirty context changes, two instances and copied identities, visible errors/retry, popup callback ownership/replacement/reload, wrapper variants, duplicate/nested mounts, partial replacement/cleanup and native editor field/save-event round-trip. Desktop/narrow layouts were visually inspected.

Commands and evidence: `node --test tests/contracts.test.mjs`; `node tests/browser.cjs`; `references/test-output/browser-results.json` and PNG captures. This is local HTTP on installed Edge with simple synthetic HTML. Event timings are fixture observations, not server performance benchmarks. `selection` measures synchronous selection work, not next paint. Frame timing includes the local document load event, not a native operation completion signal.

## Required live order

| Gate | Sandbox procedure | Evidence to record | Status |
|---|---|---|---|
| 1. Asset fetch and tokens | Choose new sandbox URLs; verify runtime directory trailing slash, config direct reachability, CSS and script execution; inspect both substituted attributes. Stop here if tokens remain unresolved. | Host URLs, no redirect, actual pair, browser/CSP result | Not run |
| 2. Config persistence | Save/reopen folder key, path label, caption, optional initial key and both trial flags; preserve unrelated JSON; test empty/malformed/future schema. | Redacted before/after JSON, current native save IDs | Not run |
| 3. Identity isolation | Two placements, copied page with same full placement key, containing embedded page, duplicate/mismatched response. | Each API query pair and returned pair; no cross-config render | Not run |
| 4. Folder/roles | Empty, denied, deleted, unpublished, malformed, nested/cyclic folders; intended staff, member and unauthenticated sessions. Verify actual type/status wrappers and service security filtering. | Role matrix, permitted page names/keys, excluded cases | Not run |
| 5. Selected frame | Start with preload and bridge off. Test ContentPreview availability and chrome, blocked framing, sign-in, HTML errors, timeouts, retry and full-page route for each role. | Actual route/status/chrome/access outcomes | Not run |
| 6. Native controls | Search, sort, paging, refresh, downloads, links, forms, validation and postbacks. | Before/after state and any console/network errors | Not run |
| 7. Speed | Enable sequential idle. Measure cold selected page, selected deep link, clicked queued page, warm revisit, requests and memory with realistic tabs. | Medians/distribution, roles, tab count, data size, device and network | Not run |
| 8. Popup | Enable bridge. Save, cancel, failed validation, nested dialogs, multiple loaded frames, helper replacement, parent navigation and child navigation. | Parent viewport sizing; save refreshes only originating child; cleanup | Not run |
| 9. Context/history | ID changes via URL and native host interactions; repeated/case-sensitive query values; two CCOs; direct links; Back/Forward after native child navigation. | No stale member shown; selection history and child history policy accepted | Not run |
| 10. Dirty state/lifecycle | Unsaved edits, searches, AJAX save, script edits, page reload, browser unload, partial update/removal, config changes and context discard/revert. | No silent loss; app-specific clean/invalidation adapters identified and tested | Not run |
| 11. Accessibility/layout | Keyboard entry/exit, manual arrows/Home/End/Enter/Space, active-only focus, real screen reader, narrow screens, zoom, frame scrolling, reduced motion, popup focus return. | Assistive technology/browser/viewport observations | Not run |
| 12. Theme/docs/release | Approve visual treatment; promote accepted tokens/styles through correct owners; update and build/check parent Usage Guide; choose explicitly authorized target. | Guide/browser checks, role/performance acceptance, release authorization | Not run |

If a role can list or execute content it should not access, stop rollout and resolve server permissions/route policy. Do not add a draft-content lookup or infer publication from the client. A frame `load` event is insufficient to prove successful content rendering. A generic browser cannot reliably detect all native dirty/save state, HTML error responses or context changes outside the URL.

## Tab page editor — 14 September 2026

Loading-spacing follow-up: the user reported the pencil overlapping the native tab spinner. `tests/tab-actions.cjs` reproduced that overlap before the correction and now passes vertical/horizontal desktop and touch cases. It holds an actual tab request open, checks separation from both the caption and the full pencil hit target, verifies stable label size and editor activation while loading, then checks Easy Edit off and ready cleanup. The correction is confined to the CCO's scoped stylesheet; install the rebuilt ZIP and confirm spacing on the real tabs.

The user supplied live parent/child probes showing Easy Edit enabled in the parent and disabled in Execute preview children, with no editable items/controls even when IsPopup was false. They supplied the native ContentRecordEdit launch route plus `ShowDialog_NoReturnValue`, `ShowDialog` and `SetupRadWindow` implementations. The wrapper forwards without returning; SetupRadWindow attaches argument 8 to beforeClose and argument 12 to close, then attaches the native closeHandler. The new integration uses argument 12 and defers refresh/focus until that native handling finishes.

Local `tests/page-editor.cjs` passes with native/shared CSS and shared JavaScript: parent flag/marker visibility, each page's key and site-root URL, keyboard controls, no tab/URL change on open, Cancel/X and Save close, cancelled beforeClose, dirty accept/decline, duplicate launch/close, one editor across two CCOs, retained tabs, focus return, wrapper variants, configuration/context changes and disposal, horizontal and 390px touch layouts. The standalone upload test also verifies the correct editor route/callback and refresh of only the edited page. Existing 22 browser scenarios and outer-gutter regression pass. These tests simulate the native launcher; they do not verify server-side Save/Publish.

After replacing the ZIP: enable parent Easy Edit, open each real tab's pencil, confirm the intended page's Content Designer and normal permissions, edit/Save/Publish/close, and check the refreshed page. Check Cancel/X refresh, retained searches in other tabs, the unsaved-change prompt and focus return. Saving without closing intentionally leaves the child intact until close. Changing tab captions/order/folder membership requires Reload configuration. No live deployment or editor write was performed during implementation.

## Record template

```text
Date / tester / browser:
Sandbox host and build:
Role and containing ContentKey + ContentItemKey:
Gate / scenario:
Expected:
Observed:
Redacted evidence (never cookies, verification tokens or member HTML):
Pass / fail / follow-up:
```

## Native theme structure update

The local runtime now emits the native UnionSuite CCO/tab structure and consumes installed theme styles directly. Vertical is the new-setting default; existing saved horizontal settings require selecting Vertical. Recovery controls are collapsed below content. Ready status remains an accessible announcement. This update has not been verified on the live iMIS page. Check desktop/mobile, child content spacing, native dialogs, keyboard navigation and retained search after upload.

Local checks passed: native selected-tab computed styles match a native reference outside the custom mount; 220px rail and 18px/24px content padding; responsive orientation and manual keyboard activation with shared theme JS; 21 runtime browser scenarios; 9 unit tests; upload, editor-save, contact navigation and offline guide checks. Desktop/mobile synthetic screenshots regenerated.

## IQA folder picker

Local simulated-IQA checks pass for positional parameter encoding, optional blank browse, wrapped properties, GUID validation, keyboard result selection, key/path auto-sync, foreign-setting preservation, HTTP 403 and disposal. Verify live query access and the aliases DVK, Path and DocumentName for `$/_i4u_/Core/Admin/CFL Search`; then select a folder, Check folder contents, save and reopen the editor. No live request or deployment was performed.

## Query API contract correction

The user supplied a successful `/api/query?queryname=$/_i4u_/Core/Admin/CFL Search&Path=CFL&limit=20` response with direct Name, DocumentPath and DocumentVersionKey fields. The picker now uses that endpoint and named Path filter; this supersedes the earlier positional `/api/iqa` implementation. Local request/selection/save checks cover the updated contract. Deployment and live picker interaction remain unverified.

## Inline tab loading indicators

Local checks confirm the native theme spinner appears on a loading tab after 150ms, concurrent tab loads keep independent indicators, loading announcements are visually hidden, and ready/warm/disposal states clear the spinner. Verify appearance against the deployed theme in iMIS after replacing the ZIP.

## Silent background preloading

Spinner visibility now follows selection: background loads remain silent, selecting an in-flight/cold tab shows the native indicator, switching away removes it, and warm selection shows none. Local browser checks passed for these transitions. URL selection persistence is unchanged. Verify after uploading in iMIS.

## Configurable tab links and search dirty-state correction

Added urlParameter and urlValue (key/name/number). Local tests pass for deep links, 1-based numbers, retained Back/Forward, child context exclusion, editor persistence, duplicate parameter/caption rejection and reserved names. Native FilterPanel/search controls no longer set custom dirty state; actual edit fields still do. User confirmed popup bridge was disabled; screenshot shows child-bound modal overlay. Enable bridge and reload before Add Address retest. AddAddressPopup body was not supplied, so forwarding that button and its save refresh remain unverified live. Existing popup bridge implementation is unchanged.

## Tab-link aliases and dashed-name default — 14 September 2026

Incoming links now accept all three formats regardless of the configured output format. `Directory=About` and `Directory=Notes-and-Interactions` resolve from the available displayed tabs. Plain names encoded with spaces remain accepted. Missing URL-value settings default to names with whitespace replaced by dashes; explicit key/number settings are preserved. Duplicate or colliding names no longer block the collection: generated links use stable keys for ambiguous names, and ambiguous incoming names use the default tab. This supersedes the caption-rejection behaviour described above. Local checks cover the nine incoming/output combinations, requested-page-first loading, default/editor save, dashed/encoded names, numeric/key precedence, collisions, context isolation and retained Back/Forward. Verify both user-supplied links after replacing the upload ZIP in iMIS.

## Outer row gutters — 14 September 2026

The user reports horizontal scrolling in every custom CCO tab. Comparing the supplied native DOM with the native/Orion/shared CSS identified unbalanced outer row margins across the iframe boundary. A synthetic fixture using the same wrapper structure reproduces exactly 20px of overflow before the correction. `tests/frame-gutters.cjs` passes with all three outer shell variants at 390/900/1280/1480px, nested/balanced gutters unchanged, deliberate native grid scrolling, retained input, class/empty/no-panel wrappers, partial replacement, refresh and stable height. The existing frame-width, frame-shell and frame-size regressions also pass.

The correction is in the CCO package's injected child stylesheet, not a global theme gutter reset. After replacing the ZIP, verify every real tab at desktop and narrow widths, including native partial updates and popup save callbacks. Check document and outer shell scroll widths, visible controls on both edges and stable content height. Locally tested structure is documented in the guide; live confirmation of this correction remains pending.
