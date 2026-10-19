# Theme consistency — recommendations for review

Status: proposals for owner review, from the live theme review of
`uhubemsdev.imiscloud.com/UTNewTheme` on 13 October 2026. Nothing here is
implemented or approved. The open items are listed in [TODO.md](../../../TODO.md)
under "Theme consistency".

Fixed in the same session, and documented in the usage guide: the taskbar
header at every width, the collapsed tablet sidebar rail, IQA cell wrapping,
the dark-mode CCO shell, sideways page scroll and the Home bulletin column.

Owner decisions so far (13 October 2026):

- The dark jump-button "tabs" (Membership Tasks, My Agreements) are deprecated;
  use the section switcher (`us-section-tabs`, as on Home).
- Native progress trackers will be replaced with stat tiles; standalone tile or
  shell still open.
- Page headings are cleaned up after the contact, case and agreement layouts
  are final.
- Buttons are to be harmonised.
- The workplace/organisation layout has not been mocked up yet.

## 1. Tabs: native CCO strips beside the sidebar and the record rail

Four styles are on the site today:

| Style | Where seen | Keep? |
|---|---|---|
| Section switcher (`us-section-tabs`): grey track, white raised segment, sliding accent underline | Home (Tasks / Search / Stats), contact sub-tabs (Contact info / Employment / Demographics) | Yes — the standard |
| CCO rail (V5), collapsing to the Sections picker | Contact and agreement records | Yes — record navigation |
| H2 attached tabs: folder tabs with an orange top edge | Contact Finance (Payment History … Admin, wrapping onto a second row); Find Contacts (People / Employer / Worksite) | Proposed: restyle |
| Dark jump buttons | Membership Tasks, My Agreements | No — deprecated |

**Recommendation: one "you are here" language, and the switcher for every
horizontal strip.** The sidebar marks the current page with an orange left bar
on a pale selection, and the rail uses an inset orange left bar. The switcher
uses an orange underline. These read as one family. H2's folder tabs don't.

- Draw native horizontal `.RadTabStrip` strips as the switcher, in CSS only, on
  the native markup. Keep the generated IDs, `role="tab"`, postbacks, the
  tab-loading ring and the CCO no-reload switching. The switcher's underline
  motion already handles variable widths and scrolling.
- Never wrap a strip onto a second row. Scroll it sideways with edge fades, as
  the switcher already does. Below 600px, fold it into the same Sections
  picker the rail uses; the native "All sections" adapter already covers mobile.
- Drop the attached join between tab and panel. The page underneath becomes an
  ordinary card with the standard gap, as on Home.
- Nested strips inside a form (Address tabs) use a compact switcher (28px
  segments, like the Recents Mine/Sitewide control). They stay visually
  subordinate to the page's own strip.
- Find Contacts: People / Employer / Worksite become a switcher. The Recent
  contacts row above it aligns to the page gutter (see §5).

This supersedes the approved H2 style for horizontal strips, so it needs a
decision. Proposed next step: add the switcher option to the existing tab
comparison (`tools/build-tab-family-comparison.cjs`), using Finance's seven
tabs and Find Contacts' three, then decide.

## 2. Stat tiles: standalone or in a shell

**Recommendation: one stat-tile component, placed in a titled shell by
default, like Needs Attention; a standalone tile only when one figure stands
alone in a layout column.**

- A shell gives the figures their context ("Agreements", "Calls today"). Four
  large numbers floating in separate cards — the current progress trackers —
  give none.
- Tile anatomy:
  - the number (Red Hat Display, brand navy) and a label;
  - an optional sub-label ("Next 6 months") and an optional accent bar;
  - the whole tile is a link with a chevron when it has a destination;
  - zero is shown muted, with a loading state.
- Narrow screens: tiles wrap into rows inside the shell; separators move with
  them.
- Replace the progress trackers on the Agreement dashboard, My Agreements,
  Events, Outbound Calls (Agent dashboard) and Membership Tasks.

## 3. Page headings: banner or not

**Recommendation: not the record banner — a light page header.** The banner
says "which record": identity, status, facts and record actions. It pins while
you scroll. List, dashboard and admin pages need "where am I" and "what can I
do here".

- A page header:
  - the page title as the h1 (Red Hat Display, about 24px, brand navy);
  - an optional one-line description;
  - an optional section eyebrow ("Collective Agreements");
  - the page's primary action on the right ("Create agreement", "Add
    workbench").
- It sits on the page background. It has no dark surface and doesn't pin.
- Home's greeting is this header with a personal title.
- It could share the banner's markup as a `us-banner--page` variant, but it
  should look plainly different. Dark navy means record; plain means page.
- Pages seen without a heading: Agreement dashboard, Agreement search,
  Reporting, Union Pay dashboard. Pages with one-off headings: Workbenches (a
  slate box in capitals), My Patch ("PATCH / name"), Config Options (capitals)
  and Value Lists.

## 4. Buttons

Seen on the site:

| Example | Today | Proposed role |
|---|---|---|
| IQA Find, Sign In, Create Agreement (BeyondFormz) | Orange fill (`PrimaryButton` / accent) | **Primary**: one per form or panel; auto width, not full width |
| Add task / milestone / meeting / contact, Manage bulletin, Update key dates, panel Action | Outline (`us-outline-button`) | **Secondary** |
| Add New Workbench, Map Organisers ▾, Export (Tabulator), jump buttons | Navy fill (default `TextButton`) | Page action → Primary in the page header; menus and Export → Secondary outline |
| View Payment (every row), Edit (Config Options rows), Review (Membership Tasks rows) | Navy, orange and cyan fills | **Row action**: outline small, or `us-icon-button` with a tooltip; never filled |
| Pager current page, Telerik Go | Cyan, dark teal | Navy selected state, matching the IQA pager |
| Add New Value (Value Lists) | Bare link | Secondary outline |
| Banner Actions ▾ | Glass on navy | Keep — the on-dark variant |

**Recommendation: a three-step hierarchy plus row actions.**

1. Primary: orange fill, one per area.
2. Secondary: outline.
3. Tertiary: `LinkButton`.

- Row and inline actions use `us-icon-button` or a small outline button.
  Destructive actions use `DangerButton`.
- The open question is the default `TextButton`, a navy fill. Making it an
  outline by default would fix most of the list above in one place, because
  native iMIS marks its true primaries with `PrimaryButton` /
  `UsePrimaryButton`.
  - The risk: native screens where a plain `TextButton` is the main action
    would lose their emphasis.
  - Proposed: audit the live screens listed in this review first, then
    decide between "outline by default" and "convert case by case".
- CloudToolz (Tabulator) and Query Template buttons such as `div.TextButton`
  Review pick up these roles once those components are themed (§5).

## 5. Leftover native controls: proposed fixes

Each is a separate TODO; effort is a rough guide.

| Control | Where seen | Proposed fix | Owner file | Effort |
|---|---|---|---|---|
| Telerik date picker (blue calendar sprite, 80px field) | Find Contacts "Birth Date Equals", Finance › Batches "Batch date between" | The themed field height, radius and border tokens; the sprite becomes a Tabler `ti-calendar` icon button, as on the IQA date range; minimum field width of 9em | `99-Orion.css` | S |
| Native lookup field (25px, square, `#999` border) | Agreement dashboard "Status Equals" | Match the themed select: 33px, 6px radius, border tokens; keep the search icon inside the field | `99-Orion.css` | S |
| Recent contacts strip | Find Contacts | Chips use the theme chip style; the red ✖ "Clear" becomes a `LinkButton`; align the row with the page gutter | `zUnionSuite.css` | S |
| Footer language selector and link | Every page | Themed select, or hide it on single-language sites (client setting); raise the footer link to 4.5:1 | `99-Orion.css` | S |
| Native query-menu pages (iCore) | Finance › Batches | Extend the native IQA report adapter so these pages get the card shell; grid headers in the IQA style | `zUnionSuite.css` / `.js` | M |
| Query Template `div.TextButton` | Membership Tasks "Review" (cyan) | Map to the button roles (row action) | `zUnionSuite.css` | S |
| CloudToolz Tabulator grids | Contact Finance payments, Config Options, Manage Tags | A Tabulator skin built on the IQA grid tokens: header, rows, hover, pager (no cyan), row buttons, no fixed-height inner scroll where the page can scroll, full cell text, dark mode | `zUnionSuite.css`, `zzDarkMode.css` | M |
| BeyondFormz forms | Create Agreement | Card shell; two-column field grid from about 900px; 13px labels and 6px radius from the field tokens; primary button at auto width, right-aligned | `zUnionSuite.css` | M |
| Kendo charts | Events dashboard | Series palette from brand/accent tokens; chart titles in the panel heading style; axis labels truncate rather than clip | `zUnionSuite.css` / `.js` | M |
| Cookie consent revoke tab | Every page (bottom-left, over the sidebar and the phone menu bar) | Compact and themed, bottom-right, above the phone menu bar; or hide the tab and add "Cookie preferences" to the footer or account menu | `zUnionSuite.css` | S |
| "Coming soon" nav items | Engagement | A placeholder icon and a muted "Soon" badge, aligned with the other items | `99-Orion.css` | S |
| Progress trackers | See §2 | Replace with stat tiles | — | M |

Accessibility items from the review, kept here because they are theme-level:

- Milestone "In Progress" is orange text on white at 2.1:1. Use the darker
  accent text token, or a pill.
- The banner "High" priority badge is 4.1:1. Darken its text.
- Hubert uses 9–10px text, a 2.1:1 placeholder and a 1.5:1 disabled Search
  button, if Hubert's page is theme-owned.
- Sidebar parent items are `javascript:;` links without `aria-expanded`.

## Open decisions

1. The switcher for native horizontal CCO strips (supersedes H2)?
2. Stat tiles: shell by default, with a standalone variant?
3. A page header separate from the record banner?
4. Buttons: outline-by-default `TextButton`, or case by case?
