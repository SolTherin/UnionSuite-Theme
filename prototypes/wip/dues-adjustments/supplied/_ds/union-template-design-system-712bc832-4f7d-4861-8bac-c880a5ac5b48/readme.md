# Union Innovation Hub — Design System

A design system for **Union Innovation Hub (UIH)** interfaces that live inside
**iMIS** — the association/union membership platform. UIH builds staff- and
member-facing tools that embed as templates within an iMIS RiSE site. The
surrounding iMIS site provides a **static header, side navigation, and footer**
that stay consistent across every page; UIH templates render *inside* that
chrome and must feel native to it while being clearly their own product.

This system was reverse-engineered from the **Report Builder** — a browser-based,
self-service iMIS reporting tool — which is the most complete expression of the
UIH template language available in source form.

## Sources

- **HubReportBuilder** — https://github.com/Union-Innovation-Hub/HubReportBuilder
  (branch `main`). The primary source: `report-builder.css` (the full token set
  and every component style), `index.html` (markup + Font Awesome icon usage),
  `README.md` / `CLAUDE.md` (product behaviour). Explore this repo to build
  richer, more accurate UIH designs.
- **imis-Template-Design** — https://github.com/Union-Innovation-Hub/imis-Template-Design
  ⚠️ **Was not accessible** during authoring (404 on every ref — likely renamed,
  or not granted to the import app). Its intended contribution — the iMIS
  platform shell — is now covered by the Membership Profile design project below.
- **Membership Profile design project** — the HUB member-record exploration
  (`Membership Profile.html`, Option E "HUB Hybrid Soft", the selected
  direction). Source of the **HUB platform layer**: the top bar, dark navy side
  nav, Source Sans 3 typography, the navy record banner, KPI band, soft cards,
  person rows, alerts, and the section rail.
- **Agreement / Case Management prototype** — the attached
  `Agreement-Management-Prototype.html` (+ `-CSS.html`). Source of the record
  **casework patterns**: collapsible record banner, right-hand accordion section
  nav, task lists with a completion bar, milestone tracker, activity timeline,
  resolution banner, and notes/contacts feeds — restyled into the HUB language.

> The two repos are private. This README stores the URLs so a reader with access
> can go deeper; do not assume the reader can open them.

### Two layers: platform vs tool

This system spans **two related visual layers**, both authentically UIH:
- **HUB platform layer** (navy `#13283f` + orange `#f47b20`, Source Sans 3) —
  the surrounding iMIS shell and record pages (member, case/agreement). Tokens in
  `tokens/platform.css` (`--uih-hub-*`, `--uih-navy`, `--uih-sidebar`, …).
- **Report Builder tool layer** (brand blue `#1a4b8c`, system font) — a specific
  embedded reporting tool. Tokens in `tokens/colors.css` (`--uih-brand*`).

Use the platform layer for shells, record pages, and new record-style tools; the
Report Builder layer is that one tool's established look. Both ship together.

---

## Content fundamentals

How UIH writes copy, drawn from the Report Builder UI and docs:

- **Voice: plain, task-first, and reassuring.** The product exists so staff
  *don't* need a developer. Copy names the action and its payoff:
  "Load a saved report to begin.", "No filters — all records returned.",
  "first 500 shown — export for full data".
- **Second person, imperative for actions.** Buttons and prompts address the
  user directly and start with a verb: *Display on Page*, *Export to CSV*,
  *Select all*, *Make available to everyone*, *Back to preview*.
- **Sentence case everywhere** except small structural labels, which are
  **UPPERCASE with wide tracking** (section headers like `DATASOURCE`,
  `COLUMNS`, field-group eyebrows like `AVAILABLE FIELDS`).
- **Short, literal, unhyped.** No marketing adjectives, no exclamation. Status
  is stated flatly: "Report settings changed — these results are out of date.",
  "Report names are unique within their scope."
- **Numbers are concrete and formatted.** Record counts use thousands
  separators ("86,085 records"); dates display `dd/MM/yyyy`.
- **Emoji are not part of the UI voice.** The current app uses Font Awesome
  icons; emoji appear only as a legacy fallback in the old iPart snippet and
  should not be used in new work.
- **Gentle, specific system messages.** Toasts confirm in a few words ("Report
  saved."); warnings explain the consequence, not just the fact.

Vibe: a competent internal tool — calm, dense, trustworthy, government-/
association-grade. It respects the user's time and their data.

---

## Visual foundations

- **Color.** A deep, institutional **brand blue** (`#1a4b8c`) anchors headers,
  table heads, and primary CTAs; a brighter **interactive blue** (`#2563c4`)
  carries buttons, active tabs, focus, and selection; a pale **brand tint**
  (`#e8f0fb`) fills selected rows and badges. A single warm **accent orange**
  (`#e8720c`) is used sparingly (progress fills). Neutrals are cool and light —
  white surfaces on a `#f4f6fa` app background with `#d0d7e3` hairline borders.
  Semantic colors: green success, red danger, **amber** for "preview / sample"
  states, **orange** for "out of date / action needed" alerts. Datasource types
  get their own accents (IQA yellow `#fef9c3`, CloudToolz blue `#2d8fdd`).
- **Type.** The **native system UI stack** (`-apple-system, BlinkMacSystemFont,
  "Segoe UI", Roboto, sans-serif`) — deliberately matching the host iMIS/OS
  chrome rather than introducing a webfont. Compact scale (base 14px, cells and
  buttons 13px, labels 12px, meta 11px, eyebrows 10px). Weights 400/500/600/700.
  Structural labels are uppercase with `.5–.6px` tracking.
- **Spacing.** Tight and information-dense — a 2/4/6/8/10/12px rhythm. Inputs
  pad `6px 9px`, buttons `5px 12px`, table cells `8px 12px`, section headers
  `11px 14px`. Fixed metrics: 52px header, 300px config sidebar.
- **Corner radii.** One default **6px** radius on nearly everything (cards,
  inputs, buttons, panels); 4px on the smallest filter-row inputs; 3px on micro
  badges; **99px pills** for count badges, chips, and logic toggles.
- **Borders.** 1px `#d0d7e3` hairlines separate everything; selected datasource
  rows and logic toggles use a 1.5px emphasis border. An expanded accordion
  header shows a 3px **inset brand-light accent stripe** on its left edge.
- **Shadows.** Restrained: `0 1px 4px rgba(0,0,0,.10)` on cards/tables/panels,
  a deeper `0 4px 20px rgba(0,0,0,.12)` on toasts, and `0 2px 8px rgba(0,0,0,.2)`
  under the brand header. No glow, no colored shadows.
- **Backgrounds.** Flat fills only — **no gradients, no imagery, no texture**.
  Depth comes from the surface/background/border trio and the two shadows.
- **Motion.** Quick and functional. `.12s` for hover fills and tab/color
  changes, `.22s` for opacity fades, `.3s ease` for the accordion max-height
  reveal, `.25s` chevron rotation. No bounce, no springy easing. A `.7s` linear
  spinner and a `.2s` slide-up on toasts.
- **Hover / press.** Hover **darkens or tints**: primary buttons go from
  brand-light to brand; ghost/secondary buttons fill with the sunken `#f4f6fa`;
  rows and chips tint brand-pale; table rows tint brand-pale, table heads go
  brand-light. Destructive hovers use a `#fee2e2` red wash. No scale/shrink on
  press. Disabled controls drop to `0.4` opacity.
- **Selection & focus.** Inputs turn white with a brand-light border on focus;
  checkboxes/radios use brand-light `accent-color`; selected list items tint
  brand-pale with a brand-light border.
- **Cards.** White surface, 1px border, 6px radius, small shadow — quiet and
  rectangular. Saved-report items are compact bordered rows; predefined ones
  carry a brand-pale fill.
- **Transparency & blur.** Only on the brand header, where action buttons and
  the title field use translucent-white fills (`rgba(255,255,255,.12–.22)`).
  No backdrop blur elsewhere.
- **Layout rules.** Fixed 52px header and 300px sidebar; scrolling happens in
  bounded inner regions (field lists, saved lists, results) so structural
  headers and the run panel stay put. Two-panel shell: config left, preview/
  results right.

---

## Iconography

- **Font Awesome 6 (solid, occasionally regular)** is the icon system, used
  throughout the Report Builder (`fa-solid fa-database`, `fa-filter`,
  `fa-table-columns`, `fa-cloud`, `fa-floppy-disk`, `fa-play`, `fa-download`,
  `fa-thumbtack`, `fa-folder-open`, `fa-chevron-down`, `fa-eye`,
  `fa-triangle-exclamation`, and more). Icons render in brand blue or inherit
  the surrounding text color, at 11–16px inline sizes.
- **Load from CDN:** `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css`.
  Every card and UI-kit page here links it; do the same in new work. No custom
  icon font or SVG sprite ships with the source.
- **Unicode symbols** appear as data-kind glyphs in some contexts (⚡ IQA,
  💾 saved, ☁ CloudToolz, ∑ summarise) — mirror these with the Font Awesome
  equivalents (`fa-bolt`, `fa-floppy-disk`, `fa-cloud`, `fa-sigma`).
- **Emoji** are **not** used in current UI — they exist only as a fallback in
  the legacy `ipart-snippet.html`. Don't introduce them.
- **No logo asset** was found in the accessible source. Render the brand name
  "Union Innovation Hub" (or a product name like "Report Builder") in bold 700
  type where a mark would go — white on the brand bar, brand blue on light. See
  `guidelines/brand-wordmark.card.html`. Supply the real mark to replace this.

---

## What's in here (index)

Root files:
- `styles.css` — the global entry point (consumers link this only). `@import`s
  the four token files below.
- `tokens/colors.css` · `tokens/typography.css` · `tokens/spacing.css` ·
  `tokens/effects.css` — CSS custom properties (base values + semantic aliases).
- `readme.md` — this guide.
- `SKILL.md` — Agent-Skill front matter for use in Claude Code.

Foundation specimen cards (`guidelines/`, shown on the Design System tab):
- Colors — Brand, Neutrals & accent, Semantic, Datasource accents.
- Type — Type scale, Family & weights.
- Spacing — Space scale, Radii & shadows.
- Brand — Wordmark, Iconography.

Token files: `tokens/colors.css`, `typography.css`, `spacing.css`, `effects.css`
(Report Builder tool layer), `tokens/platform.css` (HUB platform layer —
navy/orange palette, Source Sans 3, fixed platform metrics), and
`tokens/utilities.css` (selection tints, status pairs, utility radius/shadows,
scrim, skeleton — from the legacy UI Styling Reference).

Guides: `guidelines/conventions.md` (engineering & styling conventions — flex
rules, states, motion, responsive breakpoints, iMIS query-template patterns) and
`guidelines/legacy/UI-Styling-Reference.md` (the legacy reference, preserved in
full — includes canonical iMIS banner markup and merge-field wiring).

### Legacy styling reference — coverage & conflicts

The legacy `UI Styling Reference` used by earlier apps is fully absorbed:

- Page banner / tabs / sub-nav / Actions → `PageBanner` + `--uih-content-*` tokens.
- Buttons, inputs, badges, spinner, progress, toasts, tab panels → existing
  Forms / Indicators / Feedback components.
- Modal, skeleton shimmer, choice items, contact card → the **Utilities** group.
- Status pairs, selection tints, utility radius/shadows → `tokens/utilities.css`.
- Conventions (flex rules, dashed=readonly, divider flips, breakpoints, sticky
  headers, needs-review highlight, iMIS query-template patterns) →
  `guidelines/conventions.md`.

**Conflicts — resolved and applied (this design system is the source of truth):**

1. **In-content primary blue** — legacy `#2563eb` vs HUB `#1f63c9` vs Report
   Builder `#2563c4`. **Applied**: `--uih-primary` (→ HUB blue `#1f63c9`, hover
   `--uih-primary-hover`) is the canonical in-content primary; page-chrome
   actions/tabs stay `#3498db` (`--uih-content-accent`); the Report Builder
   keeps its own blue inside that tool. Legacy `#2563eb` is retired for actions
   — it survives only inside the info/selection status pair (`--uih-info-fg`,
   `--uih-select-*`).
2. **Corner radius** — legacy 10px vs Report Builder 6px vs HUB record cards
   12px. **Applied, by layer**: 6px in the Report Builder tool, 10px
   (`--uih-util-radius`) on content-page panels/modals/banners (incl.
   `PageBanner`), 12px on HUB record cards.
3. **Neutral drift** — legacy bg `#f4f6f9` / border `#dde1e7` vs Report Builder
   `#f4f6fa` / `#d0d7e3` vs HUB `#eef1f5` / `#e3e8ef`. **Applied**: components
   use the layer's tokens; the legacy hexes are not reintroduced.
4. **Warning hue** — legacy `#d97706` vs the layers' amber text tones
   (`#92400e` RB, `#9a6510` HUB). **Applied**: `#d97706` only in the
   needs-review/status-pair treatment (`--uih-warn-fg`); banners keep their
   layer ambers.
5. **Modal scrim** — legacy `rgba(0,0,0,.4)` adopted as `--uih-scrim` (the
   Agreements prototype's navy scrim is superseded).

### Components (`components/`)

Reusable React primitives, grouped by concern. Public names (import from
`window.UnionInnovationHubDesignSystem_712bc8`):

**Report Builder tool layer**
- **Forms** — `Button`, `SearchInput`, `TextInput`, `Checkbox`, `Select`.
- **Navigation** — `SegmentedTabs`, `SectionAccordion`.
- **Data** — `DataTable`, `Pagination`.
- **Indicators** — `Badge`, `Chip`, `Spinner`.
- **Feedback** — `Banner`, `Toast` (with `ToastStack`), `EmptyState`.
- **Layout** — `AppHeader` (with `HeaderTitleInput`).

**HUB platform layer** (Source Sans 3, navy + orange)
- **Platform** — `AppShell` (composes `TopBar` + `SideNav`), `TopBar`, `SideNav`
  (surrounding iMIS app chrome), and `PageBanner` (the dark-slate header for
  non-app / RiSE content pages like the Staff Page — section toggles, sub-nav,
  Actions dropdown).
- **Record** — `RecordBanner`, `StatCard`, `InfoCard`, `FieldRow`, `PersonRow`,
  `AlertsPanel`, `SectionRail`, `StatusPill` — member/case record-page building
  blocks.
- **Casework** — `TaskList`, `MilestoneTrack`, `Timeline`, `AccordionNav` —
  case & agreement record patterns.
- **Utilities** (from the legacy UI Styling Reference) — `Modal`, `Skeleton`,
  `ChoiceItem` (selected / danger / readonly states), `ContactCard` (accent
  pill, aligned columns).
- **Record modules** (record patterns) — `Panel` (module shell),
  `FieldGrid` (read-only detail grid), `AttachmentList`, `NoteList`,
  `MeetingList`, `IqaPanel` (embedded IQA query display), `RecordHeader`
  (navy sticky record banner with grouped Actions menu, full/minimised).
- **Form composition** — `FormField` (label/required/help/error wrapper),
  `TextArea`, `RadioGroup`; compose with `TextInput`, `Select`, `Checkbox`,
  `Button` inside a `Panel` for record edit/add forms.

Each component directory has a `.jsx` implementation, a `.d.ts` props contract,
a `.prompt.md` usage note, and a `@dsCard` HTML specimen.

> **Component inventory note.** These families are derived directly from the
> Report Builder's own CSS/markup — they are the primitives that product uses,
> not a generic "standard set". No component here lacks a counterpart in the
> source. `AppHeader` is included as the template's own header bar (distinct from
> the surrounding iMIS platform chrome).

### UI kits (`ui_kits/`)

- **`report-builder/`** — interactive recreation of the full Report Builder
  two-panel view (load → preview → run → paginate). Entry: `index.html`,
  logic in `ReportBuilder.jsx`. See its `README.md`.
- **`membership-profile/`** — the HUB member record page (Option E): `AppShell`
  + `RecordBanner` + `SectionRail` switching 8 section panels built from record
  primitives. Entry: `index.html`, logic in `MembershipProfile.jsx`.
- **`case-management/`** — the Agreement / Case record page: `AppShell` + case
  `RecordBanner` + `InfoCard` sections (Case Details, Key Dates, Milestones,
  Tasks, Contacts, Notes) with an `AccordionNav` section navigator. Entry:
  `index.html`, logic in `CaseManagement.jsx`.

---

## Caveats & known gaps

- **`imis-Template-Design` repo was inaccessible** — but the iMIS platform shell
  it would have provided is now covered by the **HUB platform layer** (sourced
  from the Membership Profile design project). If that repo holds additional
  chrome (a global footer) or official brand/logo files, re-share it to fold in.
- **Source Sans 3** is the HUB display font (a Google Font). Cards and UI kits
  load it from Google Fonts; consumers should add the same `<link>` (or upload
  the font files). Until then the token falls back to the system stack.
- **No webfont binaries / no logo file** are bundled — the HUB wordmark is the
  italic "HUB" set in type, and the brand name renders in type where a mark
  would go. Confirm against UIH brand guidelines and supply the official mark.
- **Two color layers coexist** (HUB navy/orange platform vs Report Builder blue)
  — this is intentional (platform vs one embedded tool), documented above.
