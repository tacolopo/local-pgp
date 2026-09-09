import http from 'node:http';
import { readFile } from 'node:fs/promises';
const port = Number(process.env.PORT || 8787);
const files = new Map([
  ['/', ['index.html', 'text/html']],
  ['/style.css', ['style.css', 'text/css']],
  ['/app.js', ['app.js', 'text/javascript']],
  ['/app.js.LEGAL.txt', ['app.js.LEGAL.txt', 'text/plain']],
]);
const server = http.createServer(async (req, res) => {
  const headers = {
    'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
  };
  const entry = files.get(req.url);
  if (!['127.0.0.1:' + port, 'localhost:' + port].includes(req.headers.host) || !['GET', 'HEAD'].includes(req.method) || !entry) {
    res.writeHead(404, headers).end();
    return;
  }
  try {
    const body = await readFile(new URL(`./dist/${entry[0]}`, import.meta.url));
    res.writeHead(200, { ...headers, 'Content-Type': `${entry[1]}; charset=utf-8` });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(500, headers).end('Run npm run build first.');
  }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Local PGP: http://127.0.0.1:${port} — Ctrl+C to stop`));
