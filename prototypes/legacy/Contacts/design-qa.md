# Contact mockup — design QA

final result: passed

Source visual: C:/Users/James/AppData/Local/Temp/codex-clipboard-97b09aac-560e-4fbb-84b3-032ee52d469c.png

Rendered evidence: ../../.preview/contact-desktop.png and ../../.preview/contact-mobile.png, captured in the Codex in-app browser on 14 September 2026.

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
