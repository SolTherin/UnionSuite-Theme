# Native CCO current findings

Updated 23 September 2026. This supplements the [22 September findings](2026-09-22-Native-CCO-Findings.md), preserving the later evidence and implementation status. See the [current handover](2026-09-23-Native-CCO-Handover.md) for the exact stopping point.

## Objective and established foundation

The objective remains fast native CCO tab switching by fetching a tab's HTML and inserting it into the existing page. A uses child ContentPreview responses; B fetches the parent page with a selected tab. Both have user-supplied successful HTML-insertion reports. A felt faster, but B retains the parent control naming scope and is the current basis for the Cases experiment. Neither HTML insertion nor an available constructor proves working native actions.

Verified page/context:

| Item | Value |
| --- | --- |
| Sandbox origin | `https://uhubemsdev.imiscloud.com` |
| Account page | `/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Account_Page_Staff.aspx` (some URLs have a `/UTStaff/` prefix) |
| Outer CCO | `#ste_container_ciAccountpagetabs` |
| Parent DVK | `bc60a070-2cb9-4bb7-82ba-11b450bf958a` |
| CCO placement | `b511e4d0-55d8-4a38-b20d-f26d82b1af72` |
| Verified parent routing | `b511e4d055d8=Cases`; captions are supported. Preserve all other current query parameters, including repeated values. |
| Native tabs | 15; About index 1, Cases index 8 in supplied reports. Main trial discovers captions rather than assuming these indexes. |

Previous Document/config discovery and A/B timings remain in the older findings. Do not redo endpoint discovery to address the present parser failure.

## Cases control contract now supplied

Grid ID:

`ctl01_TemplateBody_WebPartManager1_gwpciAccountpagetabs_ciAccountpagetabs_Cases_ResultsGrid_Grid1`

Master table is that ID plus `_ctl00`; manager global is that ID plus `_jsmanager`; grid state is that ID plus `_ClientState`. The native baseline had `$find(gridId)` registered and attached to the live grid. Grid descriptor properties are strict JSON, with `ClientID`, dollar-separated `UniqueID`, `_masterClientID`, `clientStateFieldID` and native table/key/settings properties. Row key values and serialized table data were deliberately not exported. Source values must stay local to the browser.

The grid's four events are `gridCreated`, `rowCreated`, `rowDeselected` and `rowSelected`, referencing the corresponding `OnGridCreated`, `OnRowCreated`, `OnRowDeselected` and `OnRowSelected` methods on `window['<gridId>_jsmanager']`. The fourth descriptor argument is `null`; this does not eliminate the manager dependency.

The manager is `Asi_Web_BusinessDataGrid2`, created with:

```js
{
  GridClientId: '<actual grid ID above>',
  IsMultiSelect: false,
  TrackItemSelectionAcrossPostbacks: false,
  IsSelectedByDefault: false,
  DeltaKeys: '',
  ClientOnRowSelected: null,
  ClientOnRowDeselected: null
}
```

The captured constructor is 2,172 characters. With these settings, `OnGridCreated` retains the grid and the other event callbacks perform no selection-tracking/custom-callback work. No manager `dispose`, `destroy`, initialization or unload method was found. Its internal dynamic-function callback helper is unreachable with the null callback settings. The native setup line also contained Listers/chosen/IIFE code; those surrounding statements are not part of the scoped trial and must not be replayed.

## Pagination changed the required controls

The user reduced the Cases report page size specifically to test pagination. The earlier B inventory listed just the grid; the smaller-page response listed two controls and four removed hidden inputs. The first v0.6.0 trial from About therefore stopped at `Cases contract: additional native controls need inspection.` It had not attempted initialization.

The additional control is the grid's `RadComboBox RadComboBox_MetroTouch  PageSizeDropDown`, ID:

`ctl01_TemplateBody_WebPartManager1_gwpciAccountpagetabs_ciAccountpagetabs_Cases_ResultsGrid_Grid1_ctl00_ctl03_ctl01_PageSizeComboBox`

The [supplied pager capture](evidence/cases-pager-source.json) resolves its setup:

- `Telerik.Web.UI.RadComboBox`, script 37 line 54 (offset 13553), emitted before the grid at line 57 (offset 15237).
- Events: `selectedIndexChanged: Telerik.Web.UI.Grid.ChangePageSizeComboHandler` and `selectedIndexChanging: Telerik.Web.UI.Grid.ChangingPageSizeComboHandler`.
- Component references `null`; `postBackSources` empty.
- Property keys: `_dropDownWidth`, `_height`, `_skin`, `_text`, `_uniqueId`, `_value`, `clientStateFieldID`, `collapseAnimation`, `enableAriaSupport`, `expandAnimation`, `itemData`, `localization`, `selectedIndex`.
- Captured widths/heights zero, ARIA support true, selected index zero, four item-data entries. Arbitrary string/item values were omitted. `_uniqueId` is the dollar-separated pager ID; its state ID is the pager ID plus `_ClientState`.
- Grid and pager state inputs were both inside the grid, with underscore-separated input names. `Cases_ResultsGrid_HiddenKeyField1` was outside it with a dollar-separated name. The initializer still does not restore that separate hidden key field.

The pager source capture was read-only: one fresh Cases parent GET, no insertion, control creation or server action. Initially its asynchronous Promise/clipboard behavior confused the workflow. The helper now works without an installed probe, logs waiting/completion, and saves redacted output as `window.usCcoCasesPagerResult` before attempting clipboard copy. Its result is already retained in the handover and need not be recaptured now.

## Implementation through v0.7.0

`startCasesTrial()` is an explicit opt-in B mode for this Account Page Staff CCO. It requires a clean native non-Cases starting tab and already loaded native resources. It preserves member/query context, allows Cases plus return to the original native tab, and refuses to overwrite retained native manager/control objects.

The scoped adapter validates one manager setup, one grid descriptor and the optional exact page-size dropdown. It validates properties, identifiers, callbacks, empty references and dropdown-before-grid order. It uses existing native constructors, restores only the grid/pager state fields, creates the manager and dropdown before the grid, and checks `$find` registration plus current-element/master-table attachment. It does not execute fetched script bodies or automatically sort/page/save.

Owned components are tracked separately from original native objects. Refresh, switching, Stop and construction failure dispose discoverable owned controls and release only the owned manager reference. Cleanup avoids disposing later native replacement objects, including through parent disposal; those cases explicitly report incomplete cleanup/reload required. It also detects external grid/pager replacement. Constructor allocations made before registry/element attachment remain unobservable, so native creation failures require reload even after discoverable objects are disposed.

`casesReport()` survives Stop and reports initialization attempts, insertion inventory, grid/pager registration and cleanup. Ordinary A/B modes retain their prior behavior. The canonical theme and usage guide were not modified for this WIP.

## Latest live failure and partial v0.7.1 change

The user ran v0.7.0 from About and supplied [this failure](evidence/probe-b-cases-trial-v0.7.0-failure.json): `Ambiguous slash after a closing brace.` Both expected controls were inventoried, `existingComponentIds` was empty and **`initializationAttempted` was false**. No inserted-grid registration or real pagination has yet succeeded live.

The limited `scanScript()` deliberately refuses `/` after `}` because it cannot distinguish an object/division expression from a completed block followed by a regex. Comments are recognized before that check. Earlier v0.5.1 diagnostics found the grid descriptor in script 37 but reported an ambiguous slash in script 16 at offset 191, line 3. The subsequently supplied normalized 197-character focus helper contains `table.focus()` and passes local scanning; that earlier error was not reproduced. **The latest v0.7.0 report contains no script location, so its exact triggering source is still unknown.**

The initializer was scanning all inline scripts mentioning the grid ID, even a helper with no creation code. The current untested 0.7.1 source narrows this to scripts containing `$create(...)` candidate text or the exact manager name. Scripts that remain candidates still go through the scanner and all contract validation. Errors from that scan now append script index and available line/offset. No shared-scanner logic was changed. This is a plausible targeted correction, not proof that the live failure is resolved.

Implementation stopped immediately after that edit. No regression for this new filter has been written, and no syntax check/test/live retry has run on 0.7.1. Review nested error coordinates from `callArguments()` before relying on whole-script offsets. The next agent must finish and verify this work before asking for another live trial.

## Verification and outstanding acceptance

- v0.7.0: 30 Cases scenarios and all 70 general probe scenarios passed locally in headless Edge. A later replacement guard passed two targeted replacement scenarios, including one new pager-parent cleanup test: 31 distinct Cases scenarios covered across those runs.
- The test manager body comes from user-supplied native source; grid, pager, registry, HTML and omitted configuration values are synthetic. Passing tests do not validate Telerik's real implementation or the iMIS server lifecycle.
- v0.7.1: no checks performed after the latest edit. Do not carry forward the prior version's pass status as validation of this change.
- Still required live: successful grid/pager initialization; refresh/switch/Stop cleanup; repeatable non-saving native sort/page operation; correct member/context and surrounding page; behavior under actual postback/partial replacement.
- Outer ViewState/event validation and the original native server tab state remain unchanged by the trial. These may prevent native actions even after JavaScript registration succeeds. Do not merge whole-page state or replay global startup scripts to hide that gate.
- Forms/saves, popup refresh, broader native controls, caching/history/public-role behavior and production deployment remain unresolved. The custom iframe iPart is separate and has not been replaced by this experiment.

## Script 37 supplied by the user (23 September, desktop session)

The user pasted native script 37 from a Cases page load (page size 3, two pages). Row keys, member ID and URL values are **not** preserved here. Control identifiers only:

- **The v0.7.1 stop is explained.** Script 37 contains `$create(Sys.UI._UpdateProgress, {associatedUpdatePanelId: '…_Cases_ListerPanel', displayAfter: 500, dynamicLayout: true}, null, null, $get('…_Cases_UpdateProgress1'))`. Its target is inside the fragment, so the contract rejected it. The page-size dropdown and grid descriptors match the captured contract exactly.
- **The Cases grid sits inside an ASP.NET UpdatePanel** (`…_Cases_ListerPanel`). Native sort/page is therefore probably a partial (async) postback already. For inserted content, this depends on `Sys.WebForms.PageRequestManager` knowing that panel. When the page loads on About, the panel is not rendered, so it is probably not registered. This is the central server-side gate.
- **The CCO tab strip does a full postback:** `RadTabStrip` has `_autoPostBack: true`, `_postBackOnClick: true` and `_postBackReference: __doPostBack('…$ciAccountpagetabs$radTab_Top','arguments')`. This is why native tab switching reloads the page. The page also has a `RadAjaxManager` (`ctl01$RadAjaxManager1`) with empty `ajaxSettings`.
- The rest of script 37 is page-wide startup (download managers, search fields, navigation, notifications, CCO manager, RadWindows, RadMultiPage). It must not be replayed.

Next read-only capture: the PageRequestManager registrations on native About and native Cases loads, plus the Network shape of one native Cases sort.

## Native Cases sort request/response supplied (23 September, desktop session)

The user captured one native sort (Date column) on a natively loaded Cases tab in Firefox. The tokens, ViewState, member ID and row content in the paste are **not** preserved here.

- **The sort is an async partial postback.** `POST` to the same page URL with `X-MicrosoftAjax: Delta=true` and `__ASYNCPOST=true`. `ctl01$ScriptManager1` is `…$Cases$ListerPanel|…$Cases$ResultsGrid$Grid1`. `__EVENTTARGET` is the grid unique ID. `__EVENTARGUMENT` is `FireCommand:…$Grid1$ctl00;Sort;Date`. The whole form is posted, including `__VIEWSTATE`, `__RequestVerificationToken`, `PageInstanceKey`, the tab strip client state (`selectedIndexes: ["8"]`) and Cases filter fields.
- **The response is a standard MS AJAX delta.** It updates three panels (`BatchSelectorDisplayControlPanel`, `UserMessagesUpdatePanel`, `Cases$ListerPanel`). It also rotates `__VIEWSTATE` and `__RequestVerificationToken`, and re-emits startup scripts. Those scripts re-create the page-size RadComboBox, the RadGrid and the `Asi_Web_BusinessDataGrid2` manager. PageRequestManager performs this re-initialization and the disposal of replaced components natively.
- **The CCO is wrapped in an UpdatePanel.** `updatePanelIDs` includes `t…$ciAccountpagetabs$updatePanel` (`t` = ChildrenAsTriggers). It was not refreshed by the sort. Only `ctl01$ScriptManager1` is registered as an async control. `postBackControlIDs` lists only the export buttons.
- **Implication:** the native tab click (`__doPostBack('…$radTab_Top', …)`) is a full postback even though a CCO UpdatePanel exists. Likely causes: the tab strip sits outside that panel's client element, the server does not treat it as a trigger, or the server redirects (the URL carries `b511e4d055d8=<index>`). **New direction:** let the native PageRequestManager perform the tab switch as an async postback. That reuses iMIS's own ViewState, token rotation, script re-initialization and disposal instead of reconstructing controls by hand. First test: a read-only PRM/containment diagnostic, then register `radTab_Top` as an async postback control client-side and click a tab.

## Async tab-click experiment (23 September, desktop session)

`radTab_Top` was registered client-side as an async postback control, then a tab was clicked. The click became an async POST (`Delta=true`, `ctl01$ScriptManager1|…$radTab_Top`, `__EVENTARGUMENT={"type":0,"index":"8"}`). No response body was visible in Firefox, and it was immediately followed by a full document GET of `?ID=…&b511e4d055d8=9#b511e4d055d8`. This is the `pageRedirect` behaviour predicted by the decompiled `Tab_TabClick` → `Response.Redirect` (see `research/CCO-Decompilation-Findings.md`). The redirected page's `PageRequestManager._initialize` already lists `radTab_Top` as an async control, so native tab clicks were already async POST + redirect; the client registration added nothing. **Native tab switching cannot be made partial.** Inactive views render only `Loading...` placeholders; the CCO `updatePanel` wraps only the hidden `refreshTrigger`.

Next test: `prototypes/wip/cco-inline-loading/Native-Partial-Postback-Trial.js`. It inserts fetched Cases content, switches page-level form state to the fetched page, registers the Cases ListerPanel and lets native partial postbacks (refresh, then a user sort) run. The server's acceptance of the swapped state is the gate.

## Partial-postback trial v0.1.0 — PASSED live (23 September, desktop session)

[Evidence](evidence/partial-postback-trial-v0.1.0-success.json). The trial started from a reloaded About tab. It fetched Cases, inserted its view (scripts removed), detached About's content and switched page-level form state to the fetched page. It then registered `Cases$ListerPanel` with PageRequestManager and triggered the native Cases refresh.

- **Server accepted the switched state.** The refresh returned a normal delta (200, no redirect, no error) updating the Cases ListerPanel. PageRequestManager ran iMIS's own startup scripts, and the grid was then registered and attached. A native user sort (`FireCommand:…;Sort;Date`) then worked as an in-place partial update. **User observation: only the tab refreshed; no page reload.**
- **Every native partial update re-runs page-wide startup scripts** (26 blocks for the refresh, 24 for the sort), including guarded global managers. PageRequestManager does this by design, so replaying server startup blocks is part of iMIS's normal lifecycle.
- **Timing (single sample):** fetch 6,408 ms, refresh 715 ms, sort 616 ms. The fetch is far slower than the earlier Probe B Cases measurements (462/600 ms), so treat it as variance until repeated.
- **Hand-built control reconstruction (Cases trial v0.7.x) is superseded** for lister tabs: the native refresh initializes the grid, pager and manager.

Open: paging/page size/Find filter; a native tab click after the switch; return to About and other tabs (tabs without a lister have no refresh panel, so their controls need another initialization route); popups/saves; repeated switches (component/memory cleanup of detached views); performance with prefetch.

## v0.1.0 follow-up and v0.2.0 (23 September, desktop session)

User follow-up on the switched Cases tab: page 2 and a larger page size both worked in place. Clicking About did nothing: v0.1.0 changed only the tab strip's appearance, and Telerik ignores a click on the tab it still considers selected. A different tab worked through the unchanged native post-and-redirect path, which shows the switched state does not break normal navigation.

v0.2.0 intercepts all tab clicks and switches any tab. It disposes the leaving view and registers the fetched page's own PRM arrays. It then runs the view's scripts and in-view `$create` blocks, and refreshes each lister natively. See the WIP README. It has not yet been run live.

## v0.2.0 live result and v0.3.0 (23 September, desktop session)

User report (no tokens, ViewState or row data). Cases → About → Cases → Finance all displayed, with no page reload. Every lister refresh returned a normal delta (no redirect or error) and grids registered. Timings:

| Tab | Fetch | Initialization | Total |
| --- | --- | --- | --- |
| Cases | 0.69 s | 0.55 s (1 refresh) | 1.2 s |
| About | 1.27 s | 3.5 s (3 sequential refreshes, 1.1–1.25 s each) | 4.8 s |
| Finance | 3.0 s | 0.01 s (no listers, 2 creates) | 3.05 s |

- **One About refresh updates all three About listers** (ContactDetailsList, Jobs, AddressList): each delta listed all three panels. Two of the three refreshes were redundant.
- **Failure on the second About visit, after Finance:** `TypeError: can't access property "_item", e is undefined` in Telerik `_toggleAttribute` ← `_toggleActiveDescendantAttributes`. It fired from a `Sys.Application.raiseLoad` handler during the first lister refresh's `_pageLoaded`. The report ends there with no `end` event. The exception aborted PageRequestManager before `endRequest`. The About lister's `initializeRequest` handler cancels requests while a postback appears in progress, so the About Edit click could not post. Interpretation, not proven: a Telerik control created on Finance leaves its load handler registered after disposal. Natively, tab controls are never disposed without a full reload, so this does not occur in iMIS.
- About's `uninitialized` list included RadAjaxPanel **wrappers** (the component is on the inner element; false positive) and row-level `ContactDetailsEntry_*`, `JobEntry_*` and `AddressEntry_*` elements with RadButton classes. The latter may be styling only; unconfirmed.

v0.3.0 tracks and removes handlers registered by each view's scripts and creates when the view is left, skips listers already initialized, detects a missing `endRequest`, blocks interaction during a switch, and reports page errors and orphaned components. It has not yet been run live.

## v0.3.0 live result — PASSED (23 September, desktop session)

[Evidence](evidence/partial-postback-trial-v0.3.0-success.json). The failing sequence About → Cases → Finance → About completed without page errors. Handlers were released on every leave (Cases 5, Finance 1); no orphaned components remained and PageRequestManager was idle at the end. About took 3.26 s (fetch 2.07 s + one refresh 1.16 s; two listers skipped), down from 4.8 s. This supports, without proving, the leaked-load-handler interpretation of the v0.2.0 failure.

**Panel editors work after switching.** On the switched About tab, MembershipDetails and UTProfile `EditPanelTrigger` opened their inline editors as native partial postbacks. `panelEditor$CancelButton` closed them the same way. Each response was 200 with no redirect or error and updated the RadAjaxPanel plus the About listers. No save was attempted.

Established so far on a switched tab: lister refresh, sort, paging, page size, panel editor open/cancel, and tab switching across Cases, About and Finance. Not yet tested: saves, popups (RadWindow) and popup-to-lister refresh; row-level `*Entry_*` buttons; many repeated switches (memory); back/forward; prefetch and comparison with native tab-switch timing; other roles and pages.

## Scope decision and v0.5.x state (23 September, desktop session)

- **v0.5.1 live:** navigation and sorting worked across seven tabs with no page errors, and the Email Communications manager replay worked. The loading cover rendered unstyled because an injected `<style>` element did not take effect on the live page (cause unknown). v0.5.2 moves all indicator layout to inline element styles, verified locally under a CSP that blocks inline `<style>`. v0.5.3 keeps the report in `sessionStorage` across a reload, with the full-postback cause.
- **Communication Preferences Save is a full postback natively** (no update panel; the user confirmed the native page reloads). The trial matches native behaviour. Saving full-postback iParts without a reload is a broader, non-CCO project.
- **User decision:** get single-tab switching right first. Preloading and keeping tabs in the background (as the custom iPart did) are v2. The feasibility assessment and gates are in the WIP README.

## v0.6.0 live result — full checklist passed (23 September, desktop session)

The user reported every item on the live checklist as passing (WIP README): nested CCOs (discovery then direct fetch), loading cover and tab spinner, report actions, a partial save on a switched tab, editor cancel, the full-postback save reloading onto the same tab, popups, links out and Back, reload, repeated switching, and report hygiene. The only remark: after a case link and Back, the trial's cover lost its layout. It was not investigated at the user's request, since production loading styles will be themed CSS. v0.6.1 adds back-forward-cache restore logging.

**Status:** single-tab partial-postback switching is established as feasible for the account page CCO, including nested CCOs. Next: approve the specification (`prototypes/approved/`), then implement it as a theme feature with guide documentation. Background preload and kept tabs are v2.
