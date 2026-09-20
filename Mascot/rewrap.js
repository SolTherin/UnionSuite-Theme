// Rebuild a browser export without the visualization skill's render.py.
// Usage: node rewrap.js <new.source.html> <out.html> [--title "Page title"] [--shell pip-koala.html]
// Reuses the preview shell (iframe srcdoc, styles, helper scripts) from an existing export
// and swaps in the new source verbatim, so no external tooling is required to rebuild.
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const opt = (flag, fallback) => { const i = args.indexOf(flag); return i === -1 ? fallback : args[i + 1]; };
const positional = args.filter((a, i) => !a.startsWith('--') && (i === 0 || !args[i - 1].startsWith('--')));
const [sourcePath, outPath] = positional;
if (!sourcePath || !outPath) { console.error('Usage: node rewrap.js <source.html> <out.html> [--title "..."] [--shell existing-export.html]'); process.exit(1); }
const shellPath = opt('--shell', path.join(__dirname, 'pip-koala.html'));
const shellSourcePath = shellPath.replace(/\.html$/, '.source.html');
const title = opt('--title', path.basename(outPath, '.html'));
const escape = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const shell = fs.readFileSync(shellPath, 'utf8');
const oldSource = fs.readFileSync(shellSourcePath, 'utf8').trim();
const newSource = fs.readFileSync(sourcePath, 'utf8').trim();
const oldEscaped = escape(oldSource);
if (!shell.includes(oldEscaped)) { console.error('Could not find the shell\'s own source inside ' + shellPath); process.exit(1); }
const oldTitleMatch = shell.match(/<title>(.*?)<\/title>/);
let out = shell.split(oldEscaped).join(escape(newSource));
if (oldTitleMatch) {
  const oldTitle = oldTitleMatch[1];
  out = out.split(`<title>${oldTitle}</title>`).join(`<title>${title}</title>`);
  out = out.split(`&lt;title&gt;${oldTitle}&lt;/title&gt;`).join(`&lt;title&gt;${escape(title)}&lt;/title&gt;`);
  out = out.split(`title="${oldTitle}"`).join(`title="${title}"`);
}
fs.writeFileSync(outPath, out);
console.log(`Wrote ${outPath} (${out.length} bytes) using shell ${path.basename(shellPath)}`);
