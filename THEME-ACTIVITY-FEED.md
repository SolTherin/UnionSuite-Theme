# Combined activity feed — feature plan

Status: planned direction, documented 2026-09-06. **Not implemented or deployed.**

The [Theme Usage Guide](THeme/UnionSuite/Usage-Guide.html) lists this feature and
its proposed classes under planned work. When implementation begins, keep that
status and authoring contract current alongside this design. Add working templates
and class recipes only after the corresponding source adapter is implemented.

The owner wants one recent-activity block containing records from separate
tables: Calls, Emails, Notes, Meetings and SMS. The supplied screenshot shows
one header, search and date controls, type filters with counts, month groups,
and chronological cards with their own details and actions. The owner reports
poor performance when combining large datasets with UNION; no comparative
benchmark has been run in this project.

## 1. Feature boundary

Build an optional, reusable activity-feed module. Its visual styling belongs in
the theme; its assembly and interaction logic can live in the central theme
JavaScript file. Queries, record mappings and destinations remain configurable
for each deployment. The same module should support member, organisation and
case contexts through explicit configuration.

| Layer | Responsibility |
|---|---|
| Theme CSS | Shared panel, timeline, cards, icons, badges, filters, responsive layout and interaction states |
| Shared JavaScript module | Discover participating sources, assemble cards, sort, group by month, filter loaded items and manage expansion |
| IQAs and display templates | Query each table, apply record/date/access constraints, and emit content with common item metadata |
| Instance configuration | Identify the viewed record and participating sources, labels, initial window, limits and verified action/history destinations |

Ordinary grouped panels remain a separate composition pattern. They can share
a border and heading while retaining their individual lists. This feature also
interleaves records across those lists by time, which requires JavaScript.
It must never activate just because several Query Template Displays share a zone.

The central file is now `THeme/UnionSuite/zUnionSuite.js`; it currently supplies
IQA report utilities, not feed assembly. Follow [the shared include instructions](THeme/UnionSuite/README.md)
and verify the deployed load order. The future feed module should remain separate
within that file and share lifecycle integration where appropriate. No framework
or build step is required by this plan.

## 2. Proposed authoring contract

These names describe planned classes, not functionality currently in the theme.

| Authoring location | Proposed setting | Purpose |
|---|---|---|
| Dedicated zone: Zone CSS class | `us-activity-feed` | Opt this group into feed assembly |
| Zone: Title | `Recent activity` or another configured label | One shared title |
| Zone: Title CSS class | `us-activity-feed-title` | Style and identify the associated title |
| Each participating Query Template Display: CSS class | `us-activity-source` | Include this source in its nearest owning feed |
| Each repeated template item | `us-activity-item` plus the metadata below | Identify one authored activity card |

Place one Query Template Display per source in the dedicated zone. Calls and
Emails can have different templates and card fields. Mark only participating
iParts; unrelated iParts and nested feed instances must remain independent.

The zone title is outside `.WebPartZone`, as confirmed in
[CMS structure §15](IMIS-CMS-STRUCTURE.md#15-named-zone-and-ipart-settings-traced-end-to-end-2026-09-06).
Resolve its association through the verified layout structure or an explicit
instance mapping. A descendant selector on `us-activity-feed` will not reach it.
Use the layout/group adapter to create one visual block and an accessible heading
association, without pulling unrelated layout content into the feed.

On successful assembly, the combined view has one header and no separate source
panel headers. Preserve source headings and wrappers for fallback and authoring.
Do not automatically promote a source iPart's action into the group header:
group actions require their own explicit configuration. Item links continue to
open verified native view/edit workflows.

The shared header follows the [panel-action button/text-link contract](THEME-PANEL-ACTIONS.md#presentation-and-behaviour).
A View full history action can use text-link styling alongside a configured
button action. Define each action's appearance independently and preserve its
navigation or command semantics.

## 3. Common item metadata

Templates must expose the following values in safely encoded HTML attributes.
Verify the template engine's field substitution and date formatting before
settling exact attribute names and publishing example templates.

| Value | Purpose |
|---|---|
| Source key | Stable source identity, independent of visible heading text |
| Record key | Unique within its source; source + record identifies a card |
| Activity type | Calls, Emails, Notes, Meetings or SMS for filtering and presentation |
| Activity timestamp | Unambiguous ISO 8601 timestamp with timezone, or an agreed equivalent numeric value |
| Card content | Title, summary, optional direction/related-record badge and supported action links |

Each source must define which business date represents the activity, rather than
mixing event dates with arbitrary last-modified dates. Sort newest first, then
use stable source/record keys to break ties. Format visible dates and month
groups using one configured display timezone. Do not parse formatted labels
such as `18 Jul` or silently substitute today's date for missing values.

Use source + record identity to prevent repeat-render duplicates. Do not merge
distinct records because their titles or dates match. If the same real activity
exists in several tables, a separate canonical identity rule is needed.

## 4. Query limits and performance

Filter each query to the viewed record and initial date window before results
reach the browser. Return only fields needed by the summary cards and sort and
limit results at the data source. Expensive full details can stay on their
existing view pages. Client-side hiding does not reduce database work.

Suggested pilot: latest **30 activities**, within the last **90 days**. These
are initial configuration proposals, not measured capacity limits.

- Retrieve up to 30 newest unique records from each source with consistent
  filtering and deterministic ordering.
- With five sources, merge at most 150 candidate cards and show the newest 30.
- Do not divide the limit equally between sources: six per source could miss
  recent calls when calls dominate the history.

For the initial unfiltered view, the global newest N records are contained in
the newest N from every source, assuming complete successful source responses,
consistent ordering, one row per activity and the same query window. Verify that
the actual IQA/iPart result limits enforce this. Joined duplicate rows must not
consume the limit before unique activities are selected.

Measure each query and the full page on representative large contact histories.
Several separate iParts still add execution and rendering cost; they are not
guaranteed to run in parallel or outperform a combined query. Compare the bounded
separate-source approach with the existing UNION implementation before claiming
a performance improvement.

## 5. Search, counts and paging

The first version is a bounded recent-activity view with a configured **View full
history** destination. Keep its controls honest about the data available.

| Feature | Initial behaviour | Extension requiring data-loading work |
|---|---|---|
| Type filters | Filter loaded candidate items, then apply the visible-item limit | Retrieve more records for an exhaustive type history |
| Text search | Search loaded activity summaries, labelled accordingly | Search the full history at each source before limiting results |
| Date filter | Narrow loaded results within the initial query window | Rerun/refetch sources to widen the window |
| Counts | Clearly labelled loaded/matching counts | Verified full totals using the same filters and access rules |
| More items | May reveal already loaded candidates with an explicit limit | Coordinated paging across all sources for a complete history |

Filtering a capped candidate set can miss older matching records. Do not label a
search of loaded items as a complete search, or imply a date range is complete
when its source results were capped. A caption such as `24 of 30` must identify
whether 30 means loaded matches or a verified server total. Do not infer a total
from the number of rendered cards.

Complete-history search, accurate totals and seamless combined paging belong in
a dedicated data-loading component behind the same feed presentation. It must
coordinate per-source progress and a stable global order without omissions or
duplicates. Independent native pagers cannot be treated as one combined pager.
That larger component is outside the initial theme enhancement.

## 6. Assembly, refresh and fallback

- Build the combined output from explicitly marked template items. Preserve
  native iPart wrappers, postback controls, scripts and authoring controls.
  Do not clone or relocate Telerik controls or their event bindings. Confirm a
  safe render/copy strategy for plain authored card markup, including unique
  element IDs, label references and registered item actions, before implementation.
- Hide duplicate source presentation only after a usable combined view exists.
  If the script fails, the separate source displays must remain usable.
- Track expected sources and their state explicitly. An omitted source might be
  unavailable, denied or still loading; absence must not be interpreted as zero
  activities. Retain empty-source output or provide a verified status contract.
- Distinguish loading, no activities, no loaded matches and partial failure.
  Identify an incomplete feed when a source fails rather than presenting it as
  complete. Provide recovery without re-running unrelated actions.
- Reconcile on initial render, delayed tabs and verified iMIS partial updates.
  Re-read current source output, replace obsolete cards and avoid duplicate
  cards/listeners or observer loops. Preserve applicable filter, expansion and
  focus state using stable item identity.
- Associate state with both the feed instance and viewed record. Clear stale
  content when context changes and ignore completions from a previous context.
  Read only data available through the native authorised sources; classes do
  not grant access or justify exposing extra fields in hidden markup.
- In Easy Edit and Content Designer, keep the individual iParts and configuration
  controls accessible. Verify authoring-mode detection before suppressing or
  assembling anything there.

The visual treatment uses theme tokens. Type badges need visible text as well as
colour/icons. Search needs a label, type filters need an exposed selected state,
and expansion controls need keyboard support and expanded-state information.
Do not impose a fixed-height internal scrollbar on every viewport; test the
screenshot's scrolling treatment with keyboard use and narrow screens.

## 7. Implementation and acceptance

1. Capture representative Calls and Emails template output, empty results,
   their native action links and a partial refresh on the actual custom page.
2. Verify metadata emission, record context, source limits, completion signals
   and title/group ownership. Record baseline timings before combining anything.
3. Pilot two sources with shared styling, chronological assembly and fallback.
4. Add loaded-item filters, expansion and explicit counts, then the other sources.
5. Validate the cases below in iMIS before adding the module to the theme.

| Case | Expected result |
|---|---|
| Marker absent; unrelated iPart; two feeds | No accidental assembly or shared instance state |
| Mixed sources and equal timestamps | Deterministic chronological order, unique cards and correct month groups |
| One source dominates latest records | Correct newest N across sources, without per-type quotas |
| Empty, missing, failed or delayed source | Accurate state; no false claim of completeness |
| Partial refresh or changed record | No stale cards, duplicate actions or previous-record results |
| Search/date filter on capped data | Loaded-data scope and counts remain explicit |
| Script failure or authoring mode | Individual displays and editing controls remain usable |
| Keyboard, mobile and long card content | Readable cards, reachable controls and usable scrolling |
| Large histories | Measured query/page timings and bounded payloads |

This feature is T15 in the [updated condensed component inventory](CRM-Member-Profile-Component-Types-Updated.csv).
It composes formatted items (T05/T06) within a group (T10) and adds assembly
behaviour. The newly supplied recent-activity example has no assigned section
number in the original 48-section prototype mapping.

Native capability reference: [iMIS Query Template Display introduction](https://blog.imis.com/q3-2022-imis-product-update)
confirms card-style templates and conditional content. The combining behaviour
and lifecycle described here are this project's proposed extension, not verified
built-in iMIS functionality.
