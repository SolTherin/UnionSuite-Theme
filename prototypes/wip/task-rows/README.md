# Task row display

Status: active WIP, with a proposed layout to review. The `.us-task` row is
**already implemented** — its styles are the `US-TASK-ROWS` section of
`THeme/UnionSuite/zUnionSuite.css` and its behaviour the matching section of
`THeme/UnionSuite/zUnionSuite.js`. This folder is a workbench for working on that
display, not a second implementation of it.

## Problem

The row shows a title, a member and a date, and nothing else. Staff cannot see what
a task is actually about without leaving the list, and the list is going into two
places with very different widths: the homepage panel (measured at 598–891px,
depending on viewport) and a dedicated tasks page (1100px+).

The current row also does not survive real query values. At a 720px list, a completed
label carrying an author — "Actioned 3 September 2026 by Member Services" — took 296px
and left 318px for the title; at 384px the title collapsed to about one character per
line. Actioned labels are now date-only (below), but the row still has no cap, so any
long right-hand value does the same thing. A blank member gives a 48px row against
66px, so list rhythm changes with the data.

## What the workbench is

One page. Each scenario renders **twice at the same width** — `Current` (the shipped
row) and `Proposed` — so the two can be compared directly. Rows come from real Query
Templates inside the wrappers iMIS generates (`ContentItemContainer` → iPart class
div → panel → `QueryTemplateSet` → `QueryTemplateItem`), and the styles and
behaviour are the real shared theme files. The proposal is a stylesheet scoped to
`.wb-variant--proposed`, so the current rows on the same page are untouched.

Scenarios: **everyday list** (with the real search, Show completed and footer),
**content extremes**, **single row**, and the **outstanding-only template** (current
only).

Controls: tier buttons (380 / 620 / 900 / 1200), a width slider, light/dark and
Reset rows. Each stage frame is also drag-resizable. Completion is local, as in
production: ticking plays the real celebration and exit sequence and writes nothing.

## The proposal

A row with four zones — check · title and note · meta · due — that changes shape
with **the width of the list, not the window**, because one viewport can hold a
598px panel and a 1150px page. Container queries, as the theme already uses for
`us-attention`, `us-membership` and `us-panel-fields`.

| Tier | List width | Shape | Row height |
| --- | --- | --- | --- |
| Compact | < 480px | Title and note stack; member and due share the last line; origin hidden | ~86px |
| Standard | ≥ 480px | Title, note and meta in the primary column; due right-aligned in its own 10rem column | ~86px |

An earlier draft added a third tier above 860px that aligned title, member, type
and due into four columns. **Dropped:** columns with no headers read as a sortable
table, and the Query Template Display cannot sort. The due date keeps its own
right-aligned column — one alignment axis, not four — and the title and note cap
their measure (62ch and 78ch) so a 1200px page does not stretch them past reading
width.

Decisions taken, and why:

- **The title is a link** (`a.us-task__title`) and the destination is a placeholder.
  The shipped CSS already supports `:is(a, button).us-task__open`, so an open
  affordance was anticipated; opening itself stays out of scope for now.
- **The title always wins width** — `minmax(18ch, 1fr)`, capped at 62ch of text.
  The date column sizes to its own label and is capped at 12rem, so it can never
  take the title's space. 12rem fits the longest real label, "Actioned 30 September
  2026" (172px at 12px); a fixed 10rem column wrapped every Actioned date onto two
  lines. Each row is its own grid, so a short "Due today" hands the spare width to
  the title and the right edge still lines up down the list.
- **The note is one line, clamped with CSS, and there is no Read more.** Clamped
  text still matches the header search; the banner's Read more pattern hides the
  full copy, which would silently stop it matching. A per-row toggle would also add
  a third tab stop and make row heights jump mid-list. The rest of the note belongs
  to the task popup. If one line proves too thin, add the toggle as clamp-removal,
  not as the banner's two-copy swap.
- **No task type.** It was the weakest field and the width is better spent.
- **A person icon precedes the member**, using the same glyph as the taskbar's
  person results. Inline SVG, `aria-hidden`, so screen readers just hear the name.
- **The member name links to the contact record** (`MemberUrl`, the same `*Url`
  convention the contacts template uses). It keeps the meta line's appearance
  instead of taking link colour — two differently coloured links in one row compete
  — and shows an underline on hover. It is a sibling of the title link, not nested
  inside it.
- **Actioned labels carry the date only** — "Actioned 3 September 2026", no author.
  That matches the guide's own field definition and the completion sequence, which
  writes `Actioned <date>` with no author when a row is ticked. The author belongs
  in the task popup.
- **Origin is one composed `CreatedLabel`**, like `TaskDateLabel`, so a missing
  author or date cannot leave "created  by " in the row. It carries its own
  "Created" wording, because two bare dates in one row cannot be told apart. It is
  **right-aligned against the same edge as the due date** — the meta line spans the
  full row width so both sit on one right margin rather than two ragged ones — and
  it is the first thing hidden at phone width, where it returns to the left of the
  member's line.
- **Due state colours the date; no badge.** A badge costs 80–110px of contested
  width. `data-us-task-due-state` carries `overdue` / `today` / `soon` / `none`;
  overdue uses `--danger`, today uses `--warning`, both at 600 weight.
- **The completed date loses its green pill.** The shipped pill wraps to three lines
  inside a fixed date column; `--success` text alone carries the state.
- **Blank values collapse** (`:empty`, and `:has()` for a member that is only an
  icon), so row rhythm follows the layout rather than the data.
- **The checkbox aligns to the title line**, not the middle of a three-line row.
- **The meta line is italic**, so the member and origin read as annotation rather
  than a second paragraph of note. Colour could not do this job: in this client's
  branding `--text-base` and `--text-muted` both resolve to `#545962`, so the
  member, the origin and the note were three identical greys. The member also
  carries 500 weight and `--text-strong`; the origin stays muted.
- **No middot between the meta values** — a separator glyph strands itself at the
  start of a line when the meta wraps. Weight and the icon carry the distinction.
- **Rows, not cards, in both places.** Cards roughly double the vertical cost, which
  is tolerable for four tasks on a homepage and painful for forty on a page.

The proposed row keeps the shipped contract — `.us-task[data-us-task-completed]`,
the toggle as a direct child, `.us-task__open`, `.us-task__copy` and `.us-task__date`
as the element the completion sequence rewrites — so search, the completed filter and
the completion animation all keep working. That is verified in the workbench, not
assumed.

**Implementation note found while building this:** dark mode colours links inside
`.panel-body` at specificity (0,3,1), so a class-only rule for the title loses and
the titles turn blue. The proposal matches `a.us-task__title` deliberately; the theme
will need the same care.

## Maintained sources

| File | Purpose |
| --- | --- |
| `Task-Rows.source.html` | Page shell and marker slots. |
| `Task-Rows.workbench.css` | Page chrome only. Must not style `.us-task`. |
| `Task-Rows.workbench.js` | Controls only. No task behaviour. |
| `Task-Rows.proposed-template.html` | Proposed Query Template. Not yet supported. |
| `Task-Rows.proposed.css` | Proposed styles, scoped to the proposal's frames. |
| `task-specimens.cjs` | Specimen records and scenario definitions. Data only. |
| `../../../tools/build-task-rows-workbench.cjs` | Assembles `references/Task-Rows-Workbench.html`. |

## Preview

```text
node tools/build-task-rows-workbench.cjs
node tools/build-task-rows-workbench.cjs --check
```

Then open `references/Task-Rows-Workbench.html`. The output is generated and rebuilt
locally.

## Open decisions

- **Created by, or assigned by?** If tasks are assigned to staff, the person who
  created the task may not be the person who assigned it, and "Assigned by" is more
  use to whoever holds it. That is a data question, not a layout one.
- **Is one line of note enough?** It reads well here, but the specimens are written
  to be readable at one line. Real notes may bury the point.
- **Meta fields.** Member and origin earn permanent width today. Priority or status
  may deserve a place, and the row has room for one more value at standard width.
- **Does the note belong on the homepage panel at all**, or only on the tasks page?
  Everything here assumes one component in both places.

## When something is settled

Changes land in `zUnionSuite.css` (`US-TASK-ROWS`) with the guide updated in the
same change, per the guide workflow in `AGENTS.md`. The proposed template needs a
supported home in `guides/usage/templates/List-Templates/` with field definitions
for every new alias. Run `tools/test-task-rows.cjs` and
`tools/test-task-celebrations.cjs`, rebuild this workbench and the guide, and move
this folder on as the lifecycle in `../../README.md` describes.

The homepage prototype still uses local `home-task-row` / `home-task-check` classes,
not `.us-task`, so "one component in both places" includes migrating it.
