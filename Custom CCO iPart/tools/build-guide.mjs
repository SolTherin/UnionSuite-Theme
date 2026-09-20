import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.resolve(root, file), 'utf8').replaceAll('\r\n', '\n');
const esc = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const png = file => `data:image/png;base64,${fs.readFileSync(path.join(root, 'references/test-output', file)).toString('base64')}`;
const results = JSON.parse(read('references/test-output/browser-results.json'));
const values = {
  TOKENS: read('../THeme/UnionSuite/zUnionSuite.css').split('/* US-NATIVE-BUTTONS:START */')[0],
  RUNTIME_IMAGE: png('runtime-desktop.png'), CONFIG_IMAGE: png('config-desktop.png'), FRAME_SIZE_IMAGE: png('frame-size-desktop.png'), REFRESH_IMAGE: png('refresh-controls.png'),
  FRAME_WIDTH_IMAGE: png('frame-width-desktop.png'), FRAME_WIDTH_MOBILE_IMAGE: png('frame-width-mobile.png'),
  FRAME_SHELL_IMAGE: png('frame-shell-desktop.png'),
  FRAME_GUTTERS_IMAGE: png('frame-gutters-desktop.png'), FRAME_GUTTERS_MOBILE_IMAGE: png('frame-gutters-mobile.png'),
  PAGE_EDITOR_IMAGE: png('page-editor-desktop.png'), PAGE_EDITOR_MOBILE_IMAGE: png('page-editor-mobile.png'),
  PAGE_EDITOR_HORIZONTAL_IMAGE: png('page-editor-horizontal.png'),
  TAB_ACTIONS_IMAGE: png('tab-actions-vertical.png'),
  SHELL: esc(read('runtime-shell.html')),
  SETTINGS: esc(JSON.stringify({ schemaVersion: 1, folderDocumentVersionId: '00000000-0000-4000-8000-000000000003', folderPathLabel: '@/Your/Sandbox/Folder', caption: 'Directory', initialDocumentVersionId: '', orientation: 'vertical', urlParameter: 'Directory', urlValue: 'name', preload: 'off', popupBridge: false }, null, 2)),
  TEST_SUMMARY: `${results.results.length} browser scenarios passed on local Edge ${esc(results.browser)}. Evidence date: ${esc(results.testedAt)}. Synthetic data only; live iMIS gates are not run.`
};
const html = read('docs/Usage-Guide.source.html').replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
  if (!(key in values)) throw new Error(`Unknown guide placeholder ${key}`);
  return values[key];
});
const target = path.join(root, 'references/Usage-Guide.html');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== html) throw new Error('Trial usage guide is stale. Run node tools/build-guide.mjs.');
  console.log('Checked standalone trial Usage-Guide.html.');
} else {
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, html);
  console.log('Built standalone trial Usage-Guide.html with inline screenshots and no runtime fetches.');
}
