# Native CCO tab switching without page reloads — specification

Status: **draft for approval**, 23 September 2026. Once accepted it moves to
`prototypes/approved/cco-inline-loading/`. It is implemented as a shared-theme
feature only after that, with usage-guide documentation. Evidence: the live
v0.6.0 checklist passed on the sandbox account page (see the WIP README and
`research/native-cco-handover/`).

## Problem

A native iMIS Content Collection Organizer (CCO) tab click posts the whole page
back. The server answers with `Response.Redirect` to the page URL carrying the
tab's key, and the browser reloads everything. Switching tabs is slow, loses
scroll position and repaints the whole page.

## Behaviour

- **Scope: every CCO, automatically.** Every native CCO tab strip on every page
  switches in place once the theme is installed, including CCOs nested inside a
  tab. No author class is required.
- **Opt-outs.** A CCO keeps native behaviour in these cases:
  - `us-report-no-styling` is on the CCO iPart or an ancestor (the theme's existing opt-out);
  - Easy Edit is on;
  - the organiser is not a Telerik tab strip with a multipage (for example wizard layouts).
- **One switch, in place.** Clicking a tab:
  1. fetches the page URL that native navigation would load;
  2. replaces only that CCO's displayed view;
  3. switches the page-level form state (ViewState, generator, event validation,
     anti-forgery token, `PageInstanceKey`, form action, tab and multipage client
     state) to the fetched page;
  4. registers the fetched page's update panels with PageRequestManager;
  5. initializes the view's controls.

  The URL is updated with `history.replaceState`, so reload and shared links land
  on the displayed tab.
- **Native actions.** iMIS's own partial postbacks work unchanged: sorting,
  paging, page size, filters, panel editors, saves and popups. iParts that do a
  full postback natively, such as Communication Preferences Save, still reload
  the page onto the same tab. That is native behaviour and out of scope.
- **URL keys.** Each CCO's tab key (the first 12 hex characters of its placement
  key) is not known in the browser. The first switch of a CCO sends one
  background async tab-strip postback, as a native click does, and reads the tab
  URL from its `pageRedirect`; nothing is applied to the page. The key is then
  cached for the session, per page path and tab strip ID, and later switches
  fetch directly.
- **Initialization of the inserted view,** in native order:
  - the view's JavaScript-typed inline and external scripts;
  - page-level grid managers (`window['<id>_jsmanager']`) for controls in the view;
  - the server's `$create` blocks for controls in the view;
  - one native refresh per uninitialized report lister. One refresh updates every
    lister on the tab; iMIS then returns the grids with their own scripts.
- **Leaving a view** disposes its components and removes the Sys.Application and
  PageRequestManager handlers its initialization registered. Its content is
  replaced with the native `Loading...` placeholder.
- **Concurrency.** A click during a switch or during a native partial postback is
  ignored. (Open decision: queue the latest click instead.)
- **Failure.** If a switch cannot complete (unexpected response, missing view,
  sign-in page, discovery failure), the theme falls back to native navigation to
  the tab URL. No page is left half-switched without that fallback.
- **Back-forward cache.** A page restored with Back resumes normally, with no
  lingering loading state.

## Loading states

- **Tab:** the clicked tab is selected immediately and marked `aria-busy`. After
  the theme's 150 ms delay it shows the existing `us-tab-loading-spinner` with
  `data-us-tab-loading`, like native tab loading today.
- **Content:** the CCO's multipage is blocked from interaction. After the same
  delay it is covered by an opaque theme surface carrying the shared
  `section-loader-spinning-circles`, 180 px down and kept in view when the page
  is scrolled.
- **Announcement:** a polite `role="status"` message announces `Loading <tab>`.
- **Suppressed native indicators:** during the internal lister refreshes, the
  theme's report-refresh overlays and native update-progress images are hidden.
- **Styling:** all of this lives in `zUnionSuite.css`, with dark values in
  `zzDarkMode.css` and reduced motion handled; the trial's inline styles are not
  carried over. The trial found an injected `<style>` element did not apply on
  the live page, so implementation must confirm the shared stylesheet is present
  and ordered correctly.

## Known limits

- `DOMContentLoaded` and `window.load` handlers inside tab content do not fire,
  since the document has already loaded. Page-wide startup statements other than
  grid managers are not replayed. Missing initialization is reported in the
  diagnostics.
- Report row elements with RadButton classes (for example `ContactDetailsEntry_*`)
  are reported as uninitialized. Their live behaviour passed the checklist, so
  they are treated as styling-only unless shown otherwise.
- Fetching a tab costs the same server render as a native switch (0.5–3.5 s
  measured). The saving is the avoided POST, redirect and full-page reload.

## Not in v1

- Background preloading and kept tabs (v2; assessment in the WIP README).
- Making full-postback iParts partial (a broader, non-CCO project).

## Diagnostics

`window.UnionSuiteCcoSwitch` exposes `refresh()`, `report()` (the trial's report
format, without ViewState, tokens or row data) and `disable()` for troubleshooting.
A session-level kill switch returns all CCOs to native behaviour.

## Acceptance

- Automated fixtures in the canonical guide test location cover:
  - switching and nested CCOs;
  - URL-key discovery;
  - form state and panel registration;
  - initialization order;
  - disposal and handler release;
  - loading states, including scrolled pages;
  - opt-outs;
  - failure fallback;
  - report hygiene.
- The live checklist in the WIP README passes on the sandbox, plus one non-account
  page with a CCO.
- Usage guide section: behaviour, opt-outs, loading states, limits and diagnostics.
  There are no author templates, since no authoring is required.

## Open decisions

1. The concurrency rule: ignore clicks during a switch, or queue the latest.
2. The kill switch's form: a session flag, a site setting, or both.
3. Whether a nested CCO's discovered key is cached for the session only, or longer.
