// Minimaler statischer Server für labor-arghanion (nur Prüfung). Aufruf: node labor-arghanion/server.mjs [Port]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url));
const typ = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.js': 'text/javascript', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
createServer(async (q, a) => {
  let pfad = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  if (pfad === '/') pfad = '/index.html';
  const voll = normalize(join(dir, pfad));
  if (!voll.startsWith(dir)) { a.writeHead(403); a.end(); return; }
  try {
    const daten = await readFile(voll);
    a.writeHead(200, { 'Content-Type': typ[extname(voll)] || 'application/octet-stream' });
    a.end(daten);
  } catch { a.writeHead(404); a.end('nicht gefunden'); }
}).listen(Number(process.argv[2] || 5206), '127.0.0.1', () => console.log('http://127.0.0.1:' + (process.argv[2] || 5206)));
