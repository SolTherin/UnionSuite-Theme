# Project TODOs

Requested follow-up work. These items are planned, not implemented.

- [ ] **Lock pages based on access settings.** Respect the current user's iMIS page access settings when displaying, selecting and preloading tabs. Decide whether inaccessible tabs are hidden or shown as locked. Prevent loading restricted pages through tab deep links; verify behaviour across intended roles and context changes. Server-side iMIS permissions remain authoritative.
- [ ] **Configure individual tabs instead of a folder.** Let authors select a content page for each tab, set its label and order, and add or remove tabs. Preserve document-version keys as internal identities. Define migration from existing folder settings and check initial selection, readable URLs, preloading and configuration save/reopen.
- [ ] **Clean up the configuration form.** Simplify and group the fields around tab setup, appearance and behaviour. Move advanced options out of the main flow, improve labels/help and validation, and check keyboard use, narrow layouts and native Save/Save & Close compatibility.

Keep the existing [creation plan and release gates](Creation-Plan.md) and [live verification record](Live-Verification.md) alongside this backlog. Record local checks separately from live iMIS verification.
