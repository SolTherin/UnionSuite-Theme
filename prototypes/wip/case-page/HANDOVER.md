# Case page: handover (12 October 2026)

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
  `Case-Page-Standalone.html`, is ignored by Git; 9 stylesheets, 8 scripts).
- **Every add on the page is in place** (US-INLINE-COMPOSER, C40), approved by
  the owner, and **now in the shared theme** (12 October 2026): the block
  after the action engine in `zUnionSuite.js`, its section in
  `zUnionSuite.css`, two dark details in `zzDarkMode.css`, and the usage
  guide's `#inline-composer` (live example, copyable spec, field types,
  popup contract; test `usage/tests/test-inline-composer.cjs`). The case
  specs are in `Scripts/ActionDefinitions.js` (the Case page actions block,
  20 October 2026; they were `case-actions.candidate.js`).
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

**The pieces** (US-INLINE-COMPOSER in the theme; the case specs in
`Scripts/ActionDefinitions.js`):

- `UnionSuiteComposers.define(key, spec)` defines two actions: `key` (the
  section's add button, a toggle; pressed again it puts the composer away
  *keeping the draft*; Cancel and Escape discard) and `key + '-form'` (the full
  popup, keeping its authored label: the composer's More options and the
  banner's Actions items).
- A spec declares the composer's fields as data (textarea, text, date, time,
  select, checkbox, files, combobox), `required`, `shownBy`, `confirm` (an
  "are you sure"), `submit`, `lists`, `arrive`, `feed`, `keepOpen`. Field and
  type details are in the block's header and the guide.
- **On save:** the button spins for the save only. On success the composer
  clears (keepOpen: tasks, staff, parties) or folds away, and at the same moment
  a **holding row** opens where `arrive` says (`top`, `bottom` of the rows
  showing, or `{field, attribute, order}`: meetings by date). It shows what was
  typed, a tick that draws itself (ring 640ms, check 480ms after 440ms: the
  owner asked for it "2x as slow") and "Saved" (it is saved), then a soft
  shimmer until the real row arrives.
- **Query Template sections:** `UnionSuiteRefresh.queryTemplate(selector,
  {insert: true, holding})` (US-ACTION-REFRESH) reads the page quietly, with
  the refresh's queue, timeout and checks; rows compared by record (ordinal, otherwise text), and
  only new rows go in. Each takes its holding row's place (matched by the
  `Ordinal` the save returns; otherwise in order): in the same place it grows
  from the holding row's height with its contents fading in; elsewhere the
  holding row closes as it opens. Rows the page no longer has close (the
  Overview's newest three attachments). Template parts marked `data-us-live`
  (the "View all attachments (n)" count) take the new text. Nothing else in
  the section changes; the theme then dresses the new row
  (`UnionSuiteIqaFilters`, `UnionSuiteActions`, `UnionSuiteTaskRows`,
  `UnionSuiteActionMenus` refreshes, and a `us:query-template-refreshed` event
  whose `detail.inserted` is the number of rows added, 0 included).
- **Feed sections (the timeline):** the holding row is a record card (the tick
  in the timeline node). The feed then calls the new theme method
  `UnionSuiteActivityFeed.reload(feed, {quiet: true, types})` (in
  `zUnionSuite.js`, documented in the usage guide), which re-runs only the
  record type's source IQAs from the start and folds in only the new cards: no
  "Loading activity…", no redraw. `types` is the spec's `feed`, default its kind
  (tasks show as notes).
- **Other lists the save changes** take their new rows quietly too (feeds by
  the quiet reload), and all the Query Template lists of one save share one
  page read. Before, the others refreshed under the overlay.
- **More options** (owner, 11 October 2026) carries the draft into the popup
  (a one-time `usDraft` key; the popup's theme takes it and fills
  `form.fill`, or HubForms reads `UnionSuiteComposers.received()`) and
  leaves the composer underneath. The popup reports `{saved: true, Ordinal}`
  or `{cancel: true}` as it closes (BeyondFormz: a submit script, in the
  guide); saved clears the composer at once, cancel keeps it, nothing passed
  compares the lists. Try it here with `window.casePopupResult`.
- **Meetings dated before today** ask first: "That date has passed. Save the
  meeting anyway?", Save becoming "Save anyway"; changing anything withdraws it.
  Today is `UnionSuiteQueryStatesConfig.today` when set (previews pin it), else
  the local date.
- **A refreshed feed keeps its type** (C41, now native in `US-ACTIVITY-FEED`): the
  section remembers the chosen type and picks it again when the feed is rebuilt.
- **Add party's quick add** lists the members at the primary party's workplace
  (proposed `API - Workplace Members` IQA, filtered by `CaseNum`); its More
  options is the full popup, "a comprehensive search function for the entire
  db". People already on the case show but cannot be picked
  (`data-us-contact-id` in the section).

## Live requirements (not built)

- **CloudToolz add endpoints** must return the new record's `{Ordinal}` (or
  `{Ordinals}` for several files): `/cases/quick-add/note`,
  `/cases/quick-add/task`, `/cases/quick-add/meeting`,
  `/cases/quick-add/attachment` (files as Base64 in JSON, with TagOrdinals and
  TagNames from the Tags multiselect, read from `POST /zidebar/sharepoint/tagsprefill`,
  whose answer is to confirm; the CloudToolz
  helper only sends JSON), `/cases/quick-add/staff` and
  `/cases/quick-add/contact` (the add party composer), named by the owner,
  20 October 2026.
- **Add staff lists** (owner, 21 October 2026): the people from CloudToolz
  `GET /cases/quick-add/StaffList?CaseNum=` (`[{StaffID, StaffName}]`, from when Add staff is pressed,
  read once per page and searched in the page), the Role from
  `$/_i4u_/Core/Cases/Value Lists/Case - Form Data/Get Case Staff Member Types`
  (value column saved, label column shown).
- **Proposed IQA:**
  `$/_i4u_/Core/Cases/API - Workplace Members` (CaseNum and Search in;
  ContactId, ContactName, Number, Classification out; primary party left out).
- **Popup pages:** the `Cases_*` full forms are placeholders to confirm.
- **Parties and staff IQAs** (owner building them, 13 October 2026): the
  primary party and lead staff are stored on the case
  (`[vBoi4u_UT_Cases].[PrimaryContactID]`, `[LeadStaffID]`), so each list's
  `ContactIsLead` is a custom SQL expression returning `'true'`/`'false'`.
  An IQA cannot sort on it, so both lists carry `us-contacts-lead-first`
  (US-LEAD-FIRST, in the theme) and sort on real columns. Party details are
  a second IQA (live: `$/_i4u_/Core/Cases/Layouts v2/Query Template - Manage
  Case - Party Details`, filter `ID`) through US-FIELD-GROUPS, and now load
  only when a party is first shown. Open: the set-primary / set-lead
  endpoints should send `ContactID` / `StaffID` to write the case's columns.
- **Parties are in the theme** (14 October 2026): US-CASE-PARTIES (CSS and
  JS), US-CASE-MEMBER (CSS), the `us-case-parties` preset, and the guide's
  `#case-parties` with the template. The prototype reads that template from
  the guide. Its actions are in `Scripts/ActionDefinitions.js`. Found on the
  live page (owner's paste): `ContactType` returned iMIS's "Please Enter",
  `ContactRole` was blank, the details IQA returned no row for `ID`, and
  the editor merged the meta spans (the template now classes them).
- **iMIS query behaviour learned:** `GET /api/query` returns columns by
  alias/column name (`FULL_NAME`, not "Full Name"); an IQA can serve both the
  page (filtered `@url:AgreementNum`, hidden) and a one-row API call (an
  `Ordinal` optional filter); the definition blob from
  `POST /api/QueryDefinition/_execute` (`FindByPath`) holds the Query Template
  HTML (not used; recorded in case it is needed).
- **Live date output:** Query Templates show DateTime as `d/MM/yyyy`, no time
  (`9/09/2026`); nulls render empty.

## Next steps, in order

1. **List search and paging** (`prototypes/approved/list-search-and-paging/`).
   The quick insert must work with the new pager: today a paged list that
   grows past its page is refreshed in full instead.
2. **BeyondFormz fill:** needs a real BeyondFormz form's markup (field
   names, when it has drawn, whether its upload takes files from a script) to
   write each spec's `form.fill`; the guide's checklist covers setting one up.
3. **Live checks** once uploaded: a composer save on the dev tenant, that the
   theme loads inside iMIS popups (the draft hand-off needs it), and a
   BeyondFormz close value.
4. Smaller, open: the holding row's text starts slightly left of task titles
   (cosmetic; it does not know each list's columns).
5. Carried over: agreement banner match; agreement Members and Organisations
   report columns.

## Traps found this session

- **Function names in one IIFE collide silently.** Twice a new helper
  (`open`, then `place`) shadowed an existing one in the composer (now in
  `zUnionSuite.js`) and every Add button stopped working. Grep for `function NAME(` before
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
- **A guide example frame's `location.origin` reads `"null"`** (srcdoc),
  so a page read there must use `url: 'about:blank'` (also `null`) and a
  stubbed fetch, as the refresh and composer examples do.
- **`String.replace` with theme code as the replacement** turns the ` `data-us-task-completed` comes
  from `TaskCheckCSS` (US-QUERY-STATES), past meetings from the date; the
  completed filter and counts are the theme's (US-QUERY-SEARCH).

## Owner preferences seen this session

- UX first; smooth, honest feedback; no flashes or double animations.
- Asks to talk plans through before code ("talk me through the plan for this
  before writing anything"); give options with a clear recommendation, then
  build when told.
- Prefers the simple version when the complex one is mostly mechanism.
- Terminology: parties (not complainants), attachments (not files).
` in
  `' `data-us-task-completed` comes
  from `TaskCheckCSS` (US-QUERY-STATES), past meetings from the date; the
  completed filter and counts are the theme's (US-QUERY-SEARCH).

## Owner preferences seen this session

- UX first; smooth, honest feedback; no flashes or double animations.
- Asks to talk plans through before code ("talk me through the plan for this
  before writing anything"); give options with a clear recommendation, then
  build when told.
- Prefers the simple version when the complex one is mostly mechanism.
- Terminology: parties (not complainants), attachments (not files).
 + value` into the rest of the page: pass a function. It breaks the
  guide's CCO sticky example today (flagged as its own task), which is why
  `test-query-template-refresh.cjs` fails only its final no-errors check.
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
