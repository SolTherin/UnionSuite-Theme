const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const fixtures = require('../tests/fixtures.cjs');
const root = path.resolve(__dirname, '..');

function startServer(options = {}) {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    requests.push({ pathname: url.pathname, search: url.search, time: performance.now() });
    const send = (body, type = 'text/html', status = 200) => { res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store' }); res.end(body); };
    try {
      if (url.pathname === '/favicon.ico') return send('', 'text/plain', 204);
      if (url.pathname === '/runtime.js') return send(fs.readFileSync(path.join(root, 'dist/runtime.js')), 'text/javascript');
      if (url.pathname === '/cco.css') return send(fs.readFileSync(path.join(root, 'dist/cco.css')), 'text/css');
      if (url.pathname === '/theme.css') {
        const theme = fs.readFileSync(path.join(root, '../THeme/UnionSuite/zUnionSuite.css'), 'utf8');
        return send(theme, 'text/css');
      }
      if (url.pathname === '/theme.js') return send(fs.readFileSync(path.join(root, '../THeme/UnionSuite/zUnionSuite.js')), 'text/javascript');
      if (url.pathname === '/config-demo') {
        const saved = JSON.stringify({ schemaVersion: 1, folderDocumentVersionId: fixtures.ids.folder, caption: 'Directory', foreignProperty: { retained: true } });
        return send(`<!doctype html><html lang="en"><head><title>UnionSuite CCO config fixture</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/theme.css"></head><body style="font-family:system-ui;padding:24px"><h1>Native editor fixture</h1><p>Local trial — Save records JSON in this fixture only.</p><form><input id="JsonSettings" type="hidden" value='${saved}'><input id="__RequestVerificationToken" type="hidden" value="fixture-token">${fs.readFileSync(path.join(root, 'dist/config.html'), 'utf8')}<button id="ctl01_SaveButton" type="button">Save</button><button id="ctl01_SaveAndCloseButton" type="button">Save &amp; Close</button></form><script>window.savedValues=[];for(const button of document.querySelectorAll('#ctl01_SaveButton,#ctl01_SaveAndCloseButton'))button.addEventListener('click',()=>window.savedValues.push(document.getElementById('JsonSettings').value));</script></body></html>`);
      }
      if (url.pathname === '/api/ContentItem') {
        if (options.apiError) return send('{}', 'application/json', options.apiError);
        const config = { schemaVersion: 1, folderDocumentVersionId: fixtures.ids.folder, caption: url.searchParams.get('ContentItemKey') === fixtures.ids.second ? 'Second collection' : 'Directory', preload: options.preload ?? 'off', popupBridge: options.popupBridge ?? true, ...options.config };
        const row = { Data: { ContentKey: url.searchParams.get('ContentKey'), ContentItemKey: url.searchParams.get('ContentItemKey'), JsonSettings: { $value: JSON.stringify(config) } } };
        return send(JSON.stringify({ Items: { $values: options.rows ?? [row] } }), 'application/json');
      }
      if (url.pathname === '/api/Document/_execute') {
        let text = ''; for await (const chunk of req) text += chunk;
        const request = JSON.parse(text);
        requests[requests.length - 1].body = request;
        if (request.OperationName !== 'FindDocumentsInFolder' || req.headers.requestverificationtoken !== 'fixture-token') return send('{}', 'application/json', 400);
        return send(JSON.stringify(options.folderResponse ?? { IsSuccessStatusCode: true, Result: { $values: fixtures.pages } }), 'application/json');
      }
      if (url.pathname === '/iMIS/ContentManagement/ContentPreview.aspx') {
        const id = url.searchParams.get('iUniformKey');
        if (options.frameDelay?.[id]) await new Promise(resolve => setTimeout(resolve, options.frameDelay[id]));
        if (options.frameFailure === id) { res.writeHead(302, { Location: '/login.aspx' }); return res.end(); }
        return send(fixtures.childHtml(id, url.searchParams));
      }
      if (url.pathname === '/login.aspx') return send('<h1>Sign in fixture</h1>');
      if (url.pathname === '/guide') return send(fs.readFileSync(path.join(root, 'references/Usage-Guide.html')));
      return send(fixtures.parentHtml({ wrapper: url.searchParams.get('wrapper') || 'direct', two: url.searchParams.has('two'), copy: url.searchParams.has('copy') }));
    } catch (error) { send(error.message, 'text/plain', 500); }
  });
  return new Promise(resolve => server.listen(options.port ?? 0, '127.0.0.1', () => resolve({ server, requests, options, url: `http://127.0.0.1:${server.address().port}` })));
}
module.exports = { startServer };
if (require.main === module) startServer({ port: 4173, preload: 'sequential-idle' }).then(({ url }) => console.log(`Local synthetic CCO preview: ${url}/?ID=1001&tag=a&tag=b`));
