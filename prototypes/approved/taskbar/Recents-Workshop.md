# Recents layout workshop

The scope switcher places Mine first (left) and Sitewide second (right), with equal-width options. Mine remains selected initially. This arrangement is shared with the taskbar preview.

Approved Recents reference for Option C, locked on 20 September 2026 and recorded in `THEME-ENHANCEMENTS-INTEGRATION-PLAN.md` at the project root. The popup remains available separately for inspection; production data integration is planned.

- Offline deliverable: `references/Recents-Workshop.html`.
- Maintained markup: `prototypes/approved/taskbar/Recents-Workshop.source.html`.
- Independent popup and preview styles: `prototypes/approved/taskbar/Recents-Workshop.css`.
- Independent sample data and interactions: `prototypes/approved/taskbar/Recents-Workshop.js`.
- Common theme-aligned popup shell: `prototypes/approved/taskbar/Popup-Shell.css`, shared with the taskbar workshop. Edit it to keep title bars, close controls and footers consistent across both previews.

Rebuild from the project root:

```powershell
node tools/build-recents-workshop.cjs
node tools/build-recents-workshop.cjs --check
```

The builder embeds shared theme styling and the existing Tabler font. The output works as one HTML file without runtime dependencies. Open it directly or run `node .preview/recents-workshop-server.cjs` and browse to `http://127.0.0.1:4620/references/Recents-Workshop.html`.

The popup opens immediately with Mine selected and the narrow 420px layout. This narrow layout has been folded into option C of the taskbar workshop. Controls still offer light/dark, 420/620/800px widths and reopening after Close/Escape. Sitewide/Mine and Refresh use fictional data; clicking a record reports its simulated destination. No live API, stored preferences, or navigation is performed. Further edits remain independent until deliberately folded back into the taskbar.

Theme alignment follow-up: shared compact 36px controls now use theme border, surface, focus and radius tokens. Supporting labels use 12px text, destination titles use 13px, and Refresh uses the shared us-button-spinner with disabled and aria-busy states. The palette search uses field-focus tokens only while focused. Common shell styling is maintained in Popup-Shell.css; these remain prototype changes.

Recents scope switcher: restored the compact standalone segmented control, with 28px buttons, equal 72px minimum widths, Mine first, and no underline. It uses theme surface, text, radius and shadow tokens, without the larger home-page us-section-tabs component.

Recents section headings stick at the top of the scrolling list while their section is visible; Content replaces IQAs as it reaches the top. The shared shell supplies an opaque theme surface and divider in both appearances.
