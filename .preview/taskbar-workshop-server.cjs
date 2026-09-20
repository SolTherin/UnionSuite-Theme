const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const allowed = new Set([
  '/references/Taskbar-Workshop.html',
  '/references/Taskbar-Dark-Mode.html',
  '/references/Taskbar-Preview.html'
]);
http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  if (!allowed.has(pathname)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  fs.readFile(path.join(root, pathname), (error, data) => {
    response.writeHead(error ? 404 : 200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    response.end(error ? 'Not found' : data);
  });
}).listen(4619, '127.0.0.1', () => {
  console.log('Taskbar workshop: http://127.0.0.1:4619/references/Taskbar-Workshop.html');
});
