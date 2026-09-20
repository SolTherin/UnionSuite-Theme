import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n');
const check = process.argv.includes('--check');
const baseArg = process.argv.find(arg => arg.startsWith('--asset-base='));
// This is deliberately a non-resolving hostname until a sandbox host has been chosen.
const base = (baseArg?.slice('--asset-base='.length) || 'https://unionsuite-cco.invalid').replace(/\/+$/, '');
const url = new URL(base);
if (!['https:', 'http:'].includes(url.protocol) || /[<>"'&]/.test(base) || url.search || url.hash || url.username || url.password) throw new Error('asset-base must be a plain HTTP(S) asset directory URL.');

// Restricted, dependency-free concatenation of this small acyclic module graph.
// Fail if unsupported module syntax is introduced instead of silently producing a broken bundle.
function bundle(files, entry) {
  const parts = files.map(file => {
    let source = read(`src/${file}.js`);
    source = source.replace(/^import \{[^\n]+\} from '\.\/[^']+\.js';\n/gm, '').replace(/^export (?=(?:async )?(?:function|class|const) )/gm, '');
    if (/^\s*(?:import|export)\s/m.test(source)) throw new Error(`Unsupported module syntax in ${file}.js`);
    return `// src/${file}.js\n${source}`;
  });
  return `/* UnionSuite CCO 0.1.0 - generated sandbox trial */\n(() => {\n'use strict';\n${parts.join('\n')}\n${entry}(window);\n})();\n`;
}
const runtime = bundle(['contracts', 'api', 'documents', 'history', 'popup-bridge', 'navigation', 'frame-size', 'frames', 'page-editor', 'runtime'], 'installRuntime');
const config = bundle(['contracts', 'api', 'documents', 'folder-search', 'config'], 'installEditor');
const css = read('src/styles.css');
const outputs = {
  'dist/runtime.js': runtime,
  'dist/cco.css': css,
  'dist/embed/index.html': read('runtime-shell.html').replaceAll('{{ASSET_BASE}}', base),
  'dist/config.html': read('config.html').replace('{{CONFIG_CSS}}', css).replace('{{CONFIG_JS}}', config),
  'dist/build-info.json': JSON.stringify({ version: '0.1.0', assetBase: base, status: 'local-trial', deployed: false }, null, 2) + '\n'
};
for (const [file, contents] of Object.entries(outputs)) {
  const destination = path.join(root, file);
  if (check) { if (!fs.existsSync(destination) || read(file) !== contents) throw new Error(`Generated file is stale: ${file}`); }
  else { fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, contents); }
}
console.log(`${check ? 'Checked' : 'Built'} ${Object.keys(outputs).length} isolated trial assets (${base}).`);
