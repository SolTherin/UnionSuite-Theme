# Taskbar design workshop

Status: Option C approved and locked on 20 September 2026. Its design and acceptance criteria are recorded in `THEME-ENHANCEMENTS-INTEGRATION-PLAN.md` at the project root. Production integration remains planned.

Open `references/Taskbar-Workshop.html` directly in a browser. It is one offline HTML file with embedded CSS, JavaScript, icons and fictional data. It opens with approved Option C selected; A and B remain historical comparisons:

- **A — One row:** personal bookmark icons replace the four fixed management shortcuts. Go to… and Recents sit beside contact Quick Search.
- **B — Bookmark row:** labelled bookmarks occupy a second row, leaving more room for search and other controls above.

The preview includes a searchable command palette, pin/unpin controls, an editable bookmark order, overflow, empty and populated bookmark states, and recently modified IQAs/content with Sitewide and Mine filters. Use the width and appearance controls to compare responsive and dark states. Ctrl+Space opens the palette; arrow keys browse results; Enter opens the selected example; Escape closes the panel. Bookmark editing supports move buttons, Alt+Up/Down and drag handles.

**C — Combined:** up to five bookmark icons remain in the main row. A toggle shows or hides a labelled bar containing all bookmarks, including those first five. The edit pencil is omitted in C. Palette stars still add/remove bookmarks, and the external workshop Edit bookmarks control remains available for testing order. The bar starts collapsed; its visibility survives switching layouts during the session and resets with Reset demo. On narrow screens the controls wrap while retaining the five-bookmark maximum.

Option C refinements: Recents lives at the right of the toggleable bookmarks bar. Its external workshop shortcut also reveals that bar. In the palette, matching bookmarks appear first in saved order, followed by a divider and Other destinations. Drag a bookmark using its grip onto another bookmarked row to move it to that position. The same handle supports Alt+Up/Down; changes immediately update the main five and the full bar. Pinning/unpinning moves destinations between groups. A/B retain their original palette and Recents placement.

Palette dragging now uses pointer capture: the full row follows the pointer, with a blank dashed placeholder that moves between bookmarked rows as they reflow. Releasing inside the list commits the previewed order; Escape, loss of pointer capture, or release outside the list cancels. Near the top or bottom edge the list scrolls automatically. When filtering, only matching bookmark slots are reordered; nonmatching bookmarks retain their positions. Keyboard reordering remains available on the grip.

Surrounding palette rows slide into position over 180ms as the placeholder moves. The held row uses 80% opacity so the drop position remains visible underneath. Rapid direction changes continue from the current visual position; hit testing uses settled positions to avoid jitter. Reduced-motion preferences disable these slides.

Bookmarked palette rows include a left inset for the drag handle, keeping its visible keyboard focus ring inside the rounded row boundary.

Arrow-key destination navigation outlines the entire palette row. Tabbing to the drag handle or bookmark star retains that control's individual focus indicator.

The palette search wrapper owns one continuous background across the search icon, input and Esc hint, including in dark mode.

In option C, the bookmarks-bar toggle is a star that sits to the right of the divider separating pinned shortcuts from controls, immediately after Go to….

Recents now opens with Mine selected. Option C uses the selected narrow 420px popup, with IQAs above content in one scrolling column and a visible Refresh footer. Reset demo also restores Mine. The separate Recents workshop retains its width controls for further experimentation.

The palette, Recents and bookmark editor use `prototypes/approved/taskbar/Popup-Shell.css` for their common visual shell. It adapts the existing theme dialog conventions: 14px title, muted title bar and divider, 8px corners, token-based shadow, compact close control with danger hover/focus, and consistent footer spacing. Popup positioning and interactions remain component-owned. This shared prototype stylesheet is also embedded in the standalone Recents workshop; it is not a production theme change.

## Source and generation

Maintained sources are `Taskbar-Workshop.source.html`, `Taskbar-Workshop.css`, `Taskbar-Workshop.frame.html`, `Taskbar-Workshop.frame.css`, `Taskbar-Workshop.frame.js` and `Taskbar-Workshop.controls.js` in this directory. Generate from the project root:

```powershell
node tools/build-taskbar-workshop.cjs
node tools/build-taskbar-workshop.cjs --check
```

The builder embeds the actual `UnionSuiteTaskbar.js`, shared theme styles, appearance controller and existing offline taskbar fixture. It embeds the existing Tabler font and uses Fuse 6.6.2 from the sibling `iMIS Enhanced/CSI Chrome Extension/source/lib/fuse/` directory at build time. No external files are needed to open the generated preview.

For an in-app browser preview, run `node .preview/taskbar-workshop-server.cjs`, then open `http://127.0.0.1:4619/references/Taskbar-Workshop.html`.

## Trial decisions and limits

- Four example bookmarks are shown initially for comparison; the Empty / first visit option demonstrates the intended unconfigured state. Sample choices are not proposed mandatory defaults.
- Bookmark labels, palette destinations, recent records and author names are illustrative. Navigation is intercepted. Changes remain in this open preview and reset on reload.
- Recents means recently modified IQAs and content pages. Existing contact history remains part of Quick Search. Sitewide and Mine use fictional records; query definitions, permissions, storage and API integration are future work.
- The palette uses the existing theme icon family. It searches a small illustrative destination list; importing the complete destination registry belongs to implementation.
- Biscuit and the existing search/appearance controls come from the production script. The approved reference hides Biscuit below 1060px to free space; verify native header sizing during integration.
- Preview widths are capped by the available browser width. Enlarge the browser to inspect the full 1180px desktop example.
- Drag reordering is desktop-oriented; move buttons provide an alternative. Native iMIS partial postbacks and live routes are outside this design trial.
- The integration plan now contains the approved C design. Production theme files remain unchanged; the external Edit bookmarks test control and A/B layouts are outside production scope.

See `design-qa.md` at the project root for the taskbar workshop checks.

Theme alignment follow-up: shared compact 36px controls now use theme border, surface, focus and radius tokens. Supporting labels use 12px text, destination titles use 13px, and Refresh uses the shared us-button-spinner with disabled and aria-busy states. The palette search uses field-focus tokens only while focused. Common shell styling is maintained in Popup-Shell.css; these remain prototype changes.

Recents scope switcher: restored the compact standalone segmented control, with 28px buttons, equal 72px minimum widths, Mine first, and no underline. It uses theme surface, text, radius and shadow tokens, without the larger home-page us-section-tabs component.

Recents section headings stick at the top of the scrolling list while their section is visible; Content replaces IQAs as it reaches the top. The shared shell supplies an opaque theme surface and divider in both appearances.
