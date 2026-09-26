const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '../../..');
const sourcePath = path.join(__dirname, 'index.html');
const outputPath = path.join(__dirname, 'Contact-Page-v3-Standalone.html');
const missingAssets = new Set();
const embeddedAssets = new Set();

const mimeTypes = {
  '.eot': 'application/vnd.ms-fontobject',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

// An empty image avoids a broken path for unused vendor selectors whose assets
// are not present in this project checkout.
const emptyImage = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

function localFile(href) {
  const decoded = decodeURIComponent(href);
  return path.resolve(__dirname, decoded);
}

function embeddedUrl(value, stylesheetPath) {
  const reference = value.trim();
  if (/^(?:data:|blob:|#)/i.test(reference)) return `url("${reference}")`;
  if (/^(?:https?:|\/\/)/i.test(reference)) {
    throw new Error(`Remote asset in ${stylesheetPath}: ${reference}`);
  }

  const fragmentStart = reference.indexOf('#');
  const withQuery = fragmentStart < 0 ? reference : reference.slice(0, fragmentStart);
  const fragment = fragmentStart < 0 ? '' : reference.slice(fragmentStart);
  // A cache-busting query (Tabler's "tabler-icons.woff2?v3.31.0") names no
  // file; the data: URL does not need it.
  const assetName = withQuery.split('?')[0];
  const assetPath = assetName.startsWith('/')
    ? path.join(projectRoot, assetName.slice(1))
    : path.resolve(path.dirname(stylesheetPath), assetName);

  if (!fs.existsSync(assetPath)) {
    missingAssets.add(path.relative(projectRoot, assetPath).replaceAll('\\', '/'));
    return `url("${emptyImage}")`;
  }

  const mime = mimeTypes[path.extname(assetPath).toLowerCase()];
  if (!mime) throw new Error(`Unknown asset type: ${assetPath}`);
  embeddedAssets.add(assetPath);
  let content = fs.readFileSync(assetPath);

  // Sprites such as NavbarSprite.svg hide every icon and show the one named
  // by the URL fragment with :target. A data: URL gives the browser no target,
  // so every icon stays hidden. Embed a copy that shows the named icon instead.
  const iconId = /^#([\w-]+)$/.exec(fragment)?.[1];
  const svg = mime === 'image/svg+xml' ? content.toString('utf8') : '';
  if (iconId && svg.includes(':target')) {
    const shown = svg.replace(/<\/svg>\s*$/, `<style>#${iconId}{display:block}</style></svg>`);
    return `url("data:${mime};base64,${Buffer.from(shown).toString('base64')}")`;
  }

  return `url("data:${mime};base64,${content.toString('base64')}${fragment}")`;
}

function inlineStylesheet(href, id) {
  const stylesheetPath = localFile(href);
  let css = fs.readFileSync(stylesheetPath, 'utf8');

  // The theme's Google Fonts imports are its only remote dependencies. Browser
  // font fallbacks keep this export usable without an internet connection.
  css = css.replace(/^@import\s+url\(["']?https?:\/\/[^\r\n]+;\s*$/gm, '');
  css = css.replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi, (_, doubleQuoted, singleQuoted, bare) => {
    return embeddedUrl(doubleQuoted ?? singleQuoted ?? bare, stylesheetPath);
  });
  css = css.replace(/<\/style/gi, '<\\/style');

  return `<style data-source="${href}"${id ? ` id="${id}"` : ''}>\n${css}\n</style>`;
}

function inlineScript(href) {
  const scriptPath = localFile(href);
  const js = fs.readFileSync(scriptPath, 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script data-source="${href}">\n${js}\n</script>`;
}

let html = fs.readFileSync(sourcePath, 'utf8');
html = html.replace(/<!--\s*Contact page v3 — WIP layout prototype\.[\s\S]*?-->/, '<!-- Generated standalone contact page v3 preview. Edit index.html and run build-standalone.cjs. -->');
html = html.replace('WIP · sample data · live theme CSS/JS + candidate', 'WIP · sample data · standalone preview');
html = html.replace(/^  <a href="\.\.\/contact-page-v2\/index\.html">Open v2<\/a>\r?\n/m, '');
html = html.replace(/^  <a href="\.\.\/\.\.\/crm-contact-Prototype\.html">Open v1<\/a>\r?\n/m, '');

let stylesheetCount = 0;
html = html.replace(/^  <link rel="stylesheet" href="([^"]+)"(?: id="([^"]+)")?>\r?\n/gm, (_, href, id) => {
  stylesheetCount++;
  return `  ${inlineStylesheet(href, id)}\n`;
});

let scriptCount = 0;
html = html.replace(/^<script src="([^"]+)"><\/script>\r?\n/gm, (_, href) => {
  scriptCount++;
  return `${inlineScript(href)}\n`;
});

if (stylesheetCount !== 11 || scriptCount !== 11) {
  throw new Error(`Expected eleven stylesheets and eleven scripts (including the Tabler icon sheet and the activity cards and dues adjustments candidates); found ${stylesheetCount} and ${scriptCount}.`);
}
if (/<(?:link\s+rel="stylesheet"|script\s+src=)/i.test(html)) {
  throw new Error('The output still contains a linked stylesheet or script.');
}

if (process.argv.includes('--check')) {
  if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, 'utf8') !== html) {
    throw new Error('Standalone HTML is out of date. Run node build-standalone.cjs.');
  }
  console.log('Standalone HTML is current.');
} else {
  fs.writeFileSync(outputPath, html);
  console.log(`Built ${path.relative(projectRoot, outputPath)} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB).`);
}

console.log(`Embedded ${stylesheetCount} stylesheets, ${scriptCount} scripts and ${embeddedAssets.size} local assets.`);
if (missingAssets.size) {
  console.log(`${missingAssets.size} assets referenced by vendor stylesheets are absent from this checkout; empty images were substituted:`);
  for (const asset of [...missingAssets].sort()) console.log(`  ${asset}`);
}
