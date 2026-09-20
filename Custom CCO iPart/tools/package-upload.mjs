import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
execFileSync(process.execPath, [path.join(root, 'tools/build.mjs')], { stdio: 'inherit' });
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const runtime = read('dist/runtime.js'), css = read('dist/cco.css');
if (/<\/script\b/i.test(runtime) || /<\/style\b/i.test(css)) throw new Error('Unsafe inline HTML delimiter in build output.');
const display = read('runtime-shell.html')
  .replace(/<!--[^]*?-->/, '<!-- Generated UnionSuite CCO 0.1.0: standalone iMIS upload variant. -->')
  .replace('<link rel="stylesheet" href="{{ASSET_BASE}}/cco.css">', `<style>\n${css}</style>`)
  .replace('<script data-cfasync="false" src="{{ASSET_BASE}}/runtime.js" defer></script>', `<script data-cfasync="false">\n${runtime}</script>`);
if (display.includes('{{ASSET_BASE}}') || /<(?:script|link)\b[^>]*(?:src|href)=/i.test(display)) throw new Error('Standalone display still contains an external asset reference.');
const files = {
  'display.html': display,
  'configure.html': read('dist/config.html'),
  'README.txt': `UnionSuite CCO 0.1.0 - standalone iMIS upload package

REFERENCE THESE FILES IN YOUR NEW CLIENT-BASED CONTENT TYPE

URL to display items at runtime:
  ~/iPartSource/UnionSuite-CCO.zip/UnionSuite-CCO/display.html
URL to configure content items:
  ~/iPartSource/UnionSuite-CCO.zip/UnionSuite-CCO/configure.html

Both HTML files include their own JavaScript and CSS. No runtime.js,
stylesheet upload, asset hostname edit or external CDN is required.
Upload UnionSuite-CCO.zip to the same iMIS iPartSource location as your
existing hub-widgets.zip. The HTML files are inside its UnionSuite-CCO/ folder.
iMIS addresses them through its ZIP-backed source path shown above.
Keep that inner folder: the user confirmed these nested paths work in iMIS.
The earlier exported root-level paths were corrected in iMIS afterward.
If hosting as ordinary web files instead, use their actual uploaded URLs.

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
- Static upload text is ASCII to avoid punctuation corruption when iMIS
  decodes the file using a legacy encoding. Authored labels from the API
  are not converted or stripped.
- Normal same-origin links to another page now target the parent document,
  including /UTNewTheme/Party.aspx?ID=... contact links. Same-page paging,
  script controls, downloads and explicit targets keep native handling.
  The exact destination URL is preserved. Live retesting is required.
- Child frames now grow and shrink to content height so the main page scrolls.
  Re-upload this ZIP at the existing location and reload the containing page.
  No new CSS class or setting is required. Retained tabs, content updates and
  responsive reflow are remeasured; native widget scroll areas are preserved.
- The outer MainPanel / EmptyMasterContentPanel now uses natural height and
  visible overflow inside the child frame. This overrides native inline popup
  heights and prevents the repeated shrink to 480px. Nested widgets keep their
  own scroll regions. Re-upload this ZIP; no shared theme change is needed.
- Child page roots and outer native wrappers now fit the tab's available width.
  Native columns reflow when the container grows or shrinks. No horizontal
  page overflow is hidden or clipped; nested iPart/grid sizing is preserved.
- Incoming tab links accept keys, 1-based tab numbers, and names with spaces
  or dashes, regardless of the saved URL value format. Missing format defaults
  to tab names, with spaces written as dashes. Explicit key/number settings
  are retained. Example: Directory=Notes-and-Interactions.
- The page recovery control is now a refresh icon with the tooltip "refresh tab".
  It refreshes only its tab and checks tracked unsaved changes. Open full page
  and the Page options menu are removed. Collection options still offers
  Reload configuration to rebuild the collection and clear retained pages.
- Parent Easy Edit now shows a pencil beside each tab. It opens that entire
  page in the parent's native Content Designer without selecting the tab.
  Every close, including Cancel/X, refreshes only the edited page after the
  unsaved-change check. Other retained tabs stay intact. The popup bridge may
  remain off. Replace this ZIP and reload; no new class or setting is needed.
  Verify native permissions and Save/Publish on your iMIS page after upload.
- Loading tabs now reserve separate space for the spinner and edit pencil,
  including touch targets. Captions stay in place when loading begins.

See README-installation.md and Live-Verification.md in the source workspace
for the full installation contract and outstanding release gates.
`
};
const destination = path.join(root, 'upload/UnionSuite-CCO');
fs.mkdirSync(destination, { recursive: true });
for (const [name, contents] of Object.entries(files)) fs.writeFileSync(path.join(destination, name), contents);
const extras = fs.readdirSync(destination).filter(name => !(name in files));
if (extras.length) throw new Error(`Unexpected files in upload folder; review before zipping: ${extras.join(', ')}`);
console.log(`Prepared standalone upload folder: ${destination}`);
execFileSync(process.execPath, [path.join(root, 'tools/create-upload-zip.mjs')], { stdio: 'inherit' });
