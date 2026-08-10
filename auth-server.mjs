import { createHash, createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, relative, resolve } from 'node:path';

const port = Number(process.env.PORT || 8080);
const root = resolve(process.env.DIAGRAM_STUDIO_DOCS_ROOT || '/app/docs');
const authUser = process.env.DIAGRAM_STUDIO_AUTH_USER || 'Ali Haydar';
const authPassword = process.env.DIAGRAM_STUDIO_PASSWORD;
const sessionSecret = createHash('sha256')
  .update(`${authUser}\0${authPassword || ''}`)
  .digest();
const sessionDuration = 7 * 24 * 60 * 60;

if (!authPassword) {
  throw new Error('DIAGRAM_STUDIO_PASSWORD must be set before starting Diagram Studio');
}

const publicPaths = (pathname) =>
  pathname === '/login' ||
  pathname === '/login/' ||
  pathname.startsWith('/_app/') ||
  pathname === '/diagram-studio-icon.png' ||
  pathname === '/manifest.json' ||
  pathname === '/service-worker.js';

const cookieValue = (request, name) => {
  const cookies = request.headers.cookie?.split(';') || [];
  const prefix = `${name}=`;
  return cookies.map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(prefix))?.slice(prefix.length);
};

const sign = (value) => createHmac('sha256', sessionSecret).update(value).digest('base64url');

const createSession = () => {
  const payload = `${Math.floor(Date.now() / 1000) + sessionDuration}.${randomBytes(16).toString('base64url')}`;
  return `${payload}.${sign(payload)}`;
};

const isAuthenticated = (request) => {
  const token = cookieValue(request, 'diagram_session');
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 3 || Number(parts[0]) < Math.floor(Date.now() / 1000)) return false;

  const expected = sign(`${parts[0]}.${parts[1]}`);
  const actualBuffer = Buffer.from(parts[2]);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
};

const send = (response, status, body, headers = {}) => {
  response.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
  response.end(body);
};

const serveFile = async (response, pathname) => {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const candidate = resolve(root, `.${requested}`);
  if (relative(root, candidate).startsWith('..')) {
    send(response, 404, 'Not found');
    return;
  }

  let filePath = candidate;
  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    if (!extname(filePath)) filePath = join(root, 'index.html');
  }

  try {
    const body = await readFile(normalize(filePath));
    const contentTypes = {
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.ico': 'image/x-icon',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2'
    };
    send(response, 200, body, {
      'Cache-Control': extname(filePath) === '.html' ? 'no-store' : 'public, max-age=31536000, immutable',
      'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream'
    });
  } catch {
    send(response, 404, 'Not found');
  }
};

createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  if (request.method === 'POST' && pathname === '/auth/login') {
    let body = '';
    for await (const chunk of request) body += chunk;
    try {
      const credentials = JSON.parse(body);
      const valid = credentials.username === authUser && credentials.password === authPassword;
      if (!valid) {
        send(response, 401, JSON.stringify({ error: 'Invalid credentials' }), {
          'Content-Type': 'application/json; charset=utf-8'
        });
        return;
      }
      send(response, 204, '', {
        'Set-Cookie': `diagram_session=${createSession()}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${sessionDuration}`
      });
    } catch {
      send(response, 400, 'Invalid request');
    }
    return;
  }

  if (request.method === 'POST' && pathname === '/auth/logout') {
    send(response, 204, '', { 'Set-Cookie': 'diagram_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0' });
    return;
  }

  if (!publicPaths(pathname) && !isAuthenticated(request)) {
    if (request.method === 'GET') {
      response.writeHead(302, { Location: '/login' });
      response.end();
    } else {
      send(response, 401, 'Unauthorized');
    }
    return;
  }

  await serveFile(response, pathname);
}).listen(port, () => console.log(`Diagram Studio listening on ${port}`));
