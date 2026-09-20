# Contact mockup — design QA

final result: passed

Source visual: C:/Users/James/AppData/Local/Temp/codex-clipboard-97b09aac-560e-4fbb-84b3-032ee52d469c.png

Rendered evidence: .preview/contact-desktop.png and .preview/contact-mobile.png, captured in the Codex in-app browser on 14 September 2026.

The source is a 1361 × 525 pixel crop of two native contact lists. Desktop implementation capture is 1361 × 900 at a 1361px CSS viewport and 1:1 output density. Both images were opened together in the same comparison tool result. Source is a cropped page section; implementation includes preview controls and context above it. These framing differences and the requested restyling are intentional, not fidelity defects. Mobile capture is 390 × 844, with a visible 375px document content width after the native scrollbar.

## Findings and comparison history

- First browser pass found the added page title inheriting uppercase from the foundation. Fixed with a local text-transform reset; subsequent desktop/mobile captures confirm sentence case. No shared CSS was changed.
- No remaining actionable P0/P1/P2 issues. This is the requested redesign rather than a pixel-for-pixel clone.

## Required visual checks

- Typography: installed theme font and panel typography, prominent 14px names, 13px supporting links, 12px/500 sentence-case badges. Long names wrap; descriptions are regular text. No repeated person icons or empty badge shapes.
- Spacing: two equal native panels, lighter inset row separators, full-width row hover, headings outside bounded 414px scroll areas. At 390px the panels stack and email/phone stack. At the end of the mobile list, the long name and email remain fully visible without horizontal overflow.
- Tokens: installed shared border, surface, text, brand, focus, button and badge values. Delegate uses the shared primary badge, Region a brand tint, General neutral; role colours do not imply success/warning states. The current client seed is deliberately quiet.
- Assets: existing bundled Tabler outline building/mail/phone/close icons embedded with their font; no raster assets are required for this design. Icons and text are crisp in both captures.
- Copy: titles/descriptions corrected; illustrative contacts and example.org addresses; profile destinations clearly identified as local preview dialogs.

Focused mobile evidence shows the coordinator badge, long contact name/email wrapping, visible keyboard outline and fade clearing at the list bottom. Together with the full-width desktop image, all changed details were large enough to inspect without another crop.

## Interactions checked in the browser

- Independent shared search: Christina leaves 1 of 7 delegate rows and all 8 organisers, with the delegate fade removed.
- Unknown name shows No matching results on this page.
- Contact name opens the matching sample profile dialog; Done closes it. Native dialog supports Escape and restores focus.
- Empty email/phone links: zero. Existing destinations retain mailto/tel semantics; no external mail or phone application was launched.
- Keyboard scrolling reaches the end: scrollTop 498, clientHeight 414, scrollHeight 912; fade false. Long content still fits.
- Narrow view toggles the preview grid from two 463px tracks to one 390px track and back.
- No captured browser console errors. Desktop and mobile renders inspected; browser viewport override reset and desktop mockup left open.
- Generated contact preview and standalone usage guide freshness checks passed.

## Limits

Contact row/scroll classes remain trial-only. Production query aliases, live destinations, partial-postback integration and expanded wrapper coverage are outside this mockup. No API requests or persistence added. Forced-colours and reduced-motion fallbacks are present in CSS but not separately visually audited.

---

# Taskbar workshop — 20 September 2026

Shared popup shell: added one `prototypes/approved/taskbar/Popup-Shell.css` input to both preview builders, adapting the existing US-DIALOG-CHROME title/control rules and Dialog-Chrome reference. Palette, Recents and bookmark editor now share 8px corners, token-based shadows, compact 14px title bars with dividers, 30×28px close controls with danger hover/focus and consistent footer spacing. Inspected the light palette and dark narrow Recents popup in-browser; Escape still dismisses the palette and Mine remains selected in Recents. Production stylesheets remain unchanged. Both generated-file checks passed.

Narrow Recents selection: folded the standalone 420px single-column popup into option C, retaining the scroll region and footer. Both prototypes now default to Mine; the taskbar reset restores Mine as well. Browser screenshot confirms option C opens the narrow popup with Mine selected and five IQAs before the content section. Both JavaScript syntax and generated-output checks passed.

Standalone Recents workshop: created independent markup, styles and interactions in `prototypes/Recents-Workshop.*`, generated to `references/Recents-Workshop.html`. No taskbar script or runtime asset loading is required. Opened the generated page in a separate browser tab, inspected the 420px stacked layout with its visible footer, and verified Mine reduces both lists to five examples. Syntax and generation checks passed. This is a separate layout trial; the taskbar workshop remains intact.

Toggle placement follow-up: moved option C's bookmarks-bar toggle into the controls group, just after its left divider and before Go to…. Kept its existing dimensions and remove/recreate lifecycle so rerenders cannot duplicate it. Browser screenshot confirms placement and successful expansion of the bookmark bar. JavaScript syntax and generated-file checks passed.

Palette search surface correction: the native dark-mode input rule was overriding the transparent inner search input. A scoped palette rule now keeps the input and Esc hint transparent over the wrapper's shared surface. Browser screenshot in dark mode confirms a continuous background across icon, text and shortcut. Generated-file check passed.

Destination focus correction: arrow-key navigation now draws an inset focus outline around the entire palette row, matching the highlighted area. The inner destination button no longer draws a second outline; handles and stars retain individual keyboard focus. Verified with ArrowDown in the browser and a screenshot of the full-width Manage content row outline. Generated-file check passed.

Drag-handle focus correction: added a 7px left inset to palette rows containing a drag handle. This contains the existing 2px focus outline plus 3px offset without clipping or removing keyboard focus. Browser screenshot after tabbing from the search field confirms the handle ring stays inside the selected row. Generated-file freshness check passed.

Slide-animation follow-up: surrounding palette rows now use 180ms eased position animations when the placeholder changes slots and when the drag ends. Interrupted slides restart from the current visual position; hit testing excludes the animated offset to avoid oscillating targets. Reduced-motion preferences skip the animations. Repeated a browser pointer drag from fourth to first and confirmed the correct resulting order. Syntax and generated-file freshness checks passed; reduced-motion rendering was not separately exercised.

Full-row drag follow-up: replaced the palette's native handle-only drag with pointer capture, a full-width floating row, and a row-height dashed insertion placeholder. Candidate rows reflow immediately around the moving placeholder; dropping commits the shown order. Actual browser pointer drags moved Membership reports from fourth to first and then down again. Releasing outside the list preserved its prior order. Native handle keyboard access remains. Edge scrolling and Escape/pointer-cancel cleanup are implemented; touch and long-list edge scrolling were not separately exercised. Syntax and generated-output checks passed.

Option C palette follow-up: moved the existing Recents control into the toggleable bookmarks bar, preserving its listeners when rebuilding or changing layout. The palette now separates saved-order bookmarks from other destinations and provides draggable grips with Alt+Up/Down keyboard support. Inspected the dark palette divider and handles; used the keyboard handle to move Theme manager above Manage content and confirmed the resulting palette order. Pointer dragging is implemented with native drag/drop events but was not separately exercised by the browser automation.

Option C follow-up: added a combined layout with at most five main-row bookmarks, no edit pencil, and an accessible expanded/collapsed toggle for a labelled all-bookmarks bar. Inspected nine sample bookmarks in light and dark views and at 420px; the main strip remains capped at five while the additional bar wraps all nine. Checked the bar toggle and switching between B and C. A/B remain available. JavaScript syntax and generated-file freshness checks passed.

Result: interactive design trial ready for layout review. Production integration is not assessed by this preview.

Source reference: `references/Taskbar-Dark-Mode.html`, inspected in the in-app browser before building. Comparison: `references/Taskbar-Workshop.html`, which renders the current shared taskbar above the proposal at the same selected width. The baseline uses the actual shared taskbar script and theme styling; the proposed layout adds isolated trial code. Current and proposed bars were inspected together in the comparison screenshot.

## Visual checks and corrections

- Checked a full 1180px desktop example, the available browser width, and a 420px frame; checked light and dark appearance. Captured the comparison, palette, Recents and narrow dark layout in the in-app browser.
- Fixed the first proposed layout's contact-search overlap by applying width constraints to the existing `.tb-search-wrap` grid, with responsive wrapping. Desktop controls now fit on one row for option A. Option B moves labelled bookmarks to a separate shelf.
- Narrow Recents stacks its two lists inside a bounded scroll region. A final correction keeps its heading, scope controls and Refresh footer visible within the preview frame.
- The bookmark-row option gives contact search its original desktop width. The trial header markup keeps Biscuit's native perch aligned with the main header row, preventing overlap with bookmark controls below.
- Palette and popovers use theme surfaces, borders, text colours and existing Tabler outline icons. Bookmark overflow and an empty first-visit state are included. The preview page and sample dashboard remain outside production CSS.

## Browser interactions checked

- Palette search for “events” leaves one destination. Pinning updates bookmarks without closing the palette; fixed the click-away handler to retain the original event path when rendering replaces a clicked row.
- Reordered a bookmark with the move button, removed another, and confirmed the resulting order survived switching between layouts A and B.
- Empty bookmarks opens the palette. Ctrl+Space opens it, arrow navigation focuses a result, Enter simulates navigation, and Escape closes it.
- Recents Sitewide and Mine show the corresponding fictional IQA/content lists. Narrow Sitewide retains its footer and scrolling list.
- Retained Quick Search returns the fictional Alex Morgan and Morgan Engineering records from the existing taskbar fixture.
- Many/empty bookmark presets and appearance/width controls update the preview. No live iMIS write or API integration was exercised.

## Limits

This is a workshop, not a production acceptance test. Live permissions, complete route lists, storage across visits, native partial postbacks and real IQA/content queries remain implementation work. Drag reordering and forced-colours mode were not separately exercised; move-button reordering was checked. The browser tool reported an unattributed MutationObserver error during navigation, without a matching frame runtime error; interactions above remained functional, but this run does not establish a clean browser console.

### Theme control alignment follow-up

Aligned both workshops through Popup-Shell.css: compact controls, readable supporting text, theme radius/shadow tokens and common button states. Removed duplicate heading and shell declarations from component sources. Inspected the dark palette with input focus and arrow-key row focus, dark option C Recents, and the standalone narrow light Recents popup. Refresh visibly showed the shared spinner and disabled button, then restored its normal state with completion feedback. Mine remains first, selected by default, with equal-width scope buttons. Existing drag behavior was not changed or retested in this styling pass.
