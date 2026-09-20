UnionSuite CCO 0.1.0 - standalone iMIS upload package

REFERENCE THESE FILES IN YOUR NEW CLIENT-BASED CONTENT TYPE

URL to display items at runtime: the uploaded URL of display.html
URL to configure content items: the uploaded URL of configure.html

Both HTML files include their own JavaScript and CSS. No runtime.js,
stylesheet upload, asset hostname edit or external CDN is required.
Upload/extract this folder using your iMIS server's supported process,
then use the actual HTTPS URLs it provides for these two files.
The files must be served as HTML, not a download attachment or ZIP entry.

SETUP
1. Create a NEW Client-based Content Type: UnionSuite CCO - Trial.
2. Set the runtime and configure fields to the two uploaded file URLs.
   During testing, append ?DoNotCache=1 if needed to bypass iMIS caching.
3. Add the Content Type to a restricted sandbox content page.
4. Configure its folder DocumentVersionId, caption and optional initial page.
   Use Check folder contents, then native Save or Save & Close.
5. Reopen settings to verify persistence. Leave both trial options off first.
6. Verify the selected page, then enable preload and popup bridge individually.

IMPORTANT
- display.html is fetched/substituted by iMIS and runs in the iMIS page.
  Do not open it inside a separate iframe or replace the [x-...] tokens
  manually. iMIS must substitute BOTH ContentKey and ContentItemKey.
- Configure must run in the native editor with its JsonSettings field.
- This upload variant inlines runtime JS instead of the external bootstrap
  in the hosted build. Local browser fixtures test it, but live iMIS must
  confirm inline scripts/styles survive fetching and execute under its CSP.
- If loading remains or settings do not appear, check script execution
  and token substitution before debugging API permissions.
- ContentPreview routing, permissions, native forms/dialogs, history,
  dirty state and realistic performance still require live acceptance.
- No DLLs, session credentials, production keys or sample member data are
  included. Native child pages and APIs are accessed on the current iMIS site.
- This is a sandbox trial, not a production-approved release.

See README-installation.md and Live-Verification.md in the source workspace
for the full installation contract and outstanding release gates.
