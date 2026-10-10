# Case page: handover (10 October 2026)

Start here, then read `README.md` (candidates C1–C41, files, data sources, open
decisions). This file keeps what the README does not: the decisions and their
reasons, how the pieces fit, what is still open, and the traps found along the
way.

## Where things stand

- **The case page prototype** (`index.html`, served at
  `http://localhost:8778/prototypes/wip/case-page/index.html?CaseID=C217&CaseNum=214#overview`
  by the `static-node` launch config) has rail tabs Overview, Details,
  Activity, Parties, Attachments. Sample data and stubs: `case-page.js`.
  Standalone export: `node build-standalone.cjs` then `--check` (the output,
  `Case-Page-Standalone.html`, is ignored by Git; 10 stylesheets, 10 scripts).
- **Every add on the page is in place** (US-INLINE-COMPOSER, C40), approved by
  the owner. Its next step is promotion into the theme (below).
- **Approved, not built:** `prototypes/approved/list-search-and-paging/`, the
  theme's own paging and search-everything for lists, with the found record
  kept in view in context. Read it before touching list search or paging.

## Adding records: how it works and why

The owner's brief, in order (all 10 October 2026):

1. "Apply the same format to all add functions within the cases page -
   including on the overview tab. then wrap that style into the theme."
2. "The banner actions should just open the popup"; a composer only ever
   opens in the section whose button was pressed.
3. UX is the highest priority: "save data, row slides down. no report
   reloading. no flashes."
4. Not over-built: rendering rows in the browser from the IQA's stored
   template (the definition blob holds the Query Template HTML) was explored
   and rejected as too complex for a transition. The simple version won.

**The pieces** (`composer.candidate.js`, `composer.candidate.css`,
`case-actions.candidate.js`):

- `UnionSuiteComposers.define(key, spec)` defines two actions: `key` (the
  section's add button, a toggle; pressed again it puts the composer away
  *keeping the draft*; Cancel and Escape discard) and `key + '-form'` (the full
  popup, keeping its authored label: the composer's More options and the
  banner's Actions items).
- A spec declares the composer's fields as data (textarea, text, date, time,
  select, checkbox, files, combobox), `required`, `shownBy`, `confirm` (an
  "are you sure"), `submit`, `lists`, `arrive`, `feed`, `keepOpen`. Field and
  type details are in the file header.
- **On save:** the button spins for the save only. On success the composer
  clears (keepOpen: tasks, staff, parties) or folds away, and at the same moment
  a **holding row** opens where `arrive` says (`top`, `bottom` of the rows
  showing, or `{field, attribute, order}`: meetings by date). It shows what was
  typed, a tick that draws itself (ring 640ms, check 480ms after 440ms: the
  owner asked for it "2x as slow") and "Saved" (it is saved), then a soft
  shimmer until the real row arrives.
- **Query Template sections:** the page is read quietly (the same URL the
  theme's refresh uses), rows compared by record (ordinal, otherwise text), and
  only new rows go in. Each takes its holding row's place (matched by the
  `Ordinal` the save returns; otherwise in order): in the same place it grows
  from the holding row's height with its contents fading in; elsewhere the
  holding row closes as it opens. Rows the page no longer has close (the
  Overview's newest three attachments). Template parts marked `data-us-live`
  (the "View all attachments (n)" count) take the new text. Nothing else in
  the section changes; the theme then dresses the new row
  (`UnionSuiteIqaFilters`, `UnionSuiteActions`, `UnionSuiteTaskRows`,
  `UnionSuiteActionMenus` refreshes, and a `us:query-template-refreshed` event
  with `detail.inserted`).
- **Feed sections (the timeline):** the holding row is a record card (the tick
  in the timeline node). The feed then calls the new theme method
  `UnionSuiteActivityFeed.reload(feed, {quiet: true, types})` (in
  `zUnionSuite.js`, documented in the usage guide), which re-runs only the
  record type's source IQAs from the start and folds in only the new cards: no
  "Loading activity…", no redraw. `types` is the spec's `feed`, default its kind
  (tasks show as notes).
- **Other lists the save changes** follow: feeds quietly, Query Templates by
  the theme's normal refresh.
- **Meetings dated before today** ask first: "That date has passed. Save the
  meeting anyway?", Save becoming "Save anyway"; changing anything withdraws it.
  Today is `UnionSuiteQueryStatesConfig.today` when set (previews pin it), else
  the local date.
- **A refreshed feed keeps its type** (C41, `case-activity.candidate.js`): the
  section remembers the chosen type and picks it again when the feed is rebuilt.
- **Add party's quick add** lists the members at the primary party's workplace
  (proposed `API - Workplace Members` IQA, filtered by `CaseNum`); its More
  options is the full popup, "a comprehensive search function for the entire
  db". People already on the case show but cannot be picked
  (`data-us-contact-id` in the section).

## Live requirements (not built)

- **CloudToolz add endpoints** must return the new record's `{Ordinal}` (or
  `{Ordinals}` for several files): `/cases/add-note`, `add-task`,
  `add-meeting`, `add-attachment` (files as Base64 in JSON: the CloudToolz
  helper only sends JSON), `add-staff`, `add-party`.
- **Proposed IQAs:** `$/_i4u_/Core/Cases/API - Staff Search` and
  `$/_i4u_/Core/Cases/API - Workplace Members` (CaseNum and Search in;
  ContactId, ContactName, Number, Classification out; primary party left out).
- **Popup pages:** the `Cases_*` full forms are placeholders to confirm.
- **iMIS query behaviour learned:** `GET /api/query` returns columns by
  alias/column name (`FULL_NAME`, not "Full Name"); an IQA can serve both the
  page (filtered `@url:AgreementNum`, hidden) and a one-row API call (an
  `Ordinal` optional filter); the definition blob from
  `POST /api/QueryDefinition/_execute` (`FindByPath`) holds the Query Template
  HTML (not used; recorded in case it is needed).
- **Live date output:** Query Templates show DateTime as `d/MM/yyyy`, no time
  (`9/09/2026`); nulls render empty.

## Next steps, in order

1. **Promote the composer into the theme** ("step 3"): US-INLINE-COMPOSER
   into `zUnionSuite.js`/`.css` (its own block after the action engine), the
   quiet insert beside US-ACTION-REFRESH, a usage guide section with examples
   and copyable spec, the guide build and checks. Use
   `UnionSuiteRecordCards.fold` for reveal/collapse (AGENTS.md, Motion); the
   prototype has its own `fold`/`unfold`.
2. **List search and paging** (`prototypes/approved/list-search-and-paging/`).
   Do it after or with step 1: the quick add must re-run the new pager.
3. Smaller, open: the holding row's text starts slightly left of task titles
   (cosmetic; it does not know each list's columns); a Query Template list over
   30 rows still uses `simplePaginate` until step 2.
4. Carried over: agreement banner match; agreement Members and Organisations
   report columns.

## Traps found this session

- **Function names in one IIFE collide silently.** Twice a new helper
  (`open`, then `place`) shadowed an existing one in `composer.candidate.js`
  and every Add button stopped working. Grep for `function NAME(` before
  adding one.
- **`array.map(fn)` passes the index** as the second argument:
  `lists.map(renderList)` broke when `renderList` gained a second parameter.
- **The theme's Query Template refresh keeps the `ContentItemContainer` and
  its class wrapper div, and replaces the panel** inside. Keep references to
  the container, not the panel or the set.
- **The sample data serves page reads**: `case-page.js` intercepts a fetch of
  the page itself and returns `index.html` with every list filled, after a
  1.5-second wait (so the quiet insert and the theme refresh behave as in
  iMIS).
- **The preview pane pauses `requestAnimationFrame` and animations when it is
  not drawing** (window behind, pane hidden). Animations, the theme's row
  processing (completed tasks hidden, counts) and anything scheduled on a
  frame stall until a screenshot or a visible pane wakes it. Do not read
  half-finished state as a bug: wake the pane, then check. The pane is also
  often tiny: emulate a viewport (`resize_window` 1100×700) for screenshots,
  and reset it after.
- **Cache:** reload changed files with `fetch(file, {cache: 'reload'})` then
  `location.reload()`; the theme file is at `../../../THeme/UnionSuite/zUnionSuite.js`.
- **Theme state is derived in the browser:** `data-us-task-completed` comes
  from `TaskCheckCSS` (US-QUERY-STATES), past meetings from the date; the
  completed filter and counts are the theme's (US-QUERY-SEARCH).

## Owner preferences seen this session

- UX first; smooth, honest feedback; no flashes or double animations.
- Asks to talk plans through before code ("talk me through the plan for this
  before writing anything"); give options with a clear recommendation, then
  build when told.
- Prefers the simple version when the complex one is mostly mechanism.
- Terminology: parties (not complainants), attachments (not files).
