// Gateway local que imita o endereço único do Supabase:
//   /auth/v1/*  -> GoTrue (Supabase Auth)
//   /rest/v1/*  -> PostgREST
// Uso exclusivo em desenvolvimento/testes.
import http from 'node:http';

const port = Number(process.env.GATEWAY_PORT ?? 54321);
const routes = [
  { prefix: '/auth/v1', target: Number(process.env.AUTH_PORT ?? 54324) },
  { prefix: '/rest/v1', target: Number(process.env.REST_PORT ?? 54323) },
];

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type, prefer, accept-profile, content-profile, range, x-supabase-api-version',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'access-control-expose-headers': 'content-range, x-supabase-api-version',
};

http
  .createServer((req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors);
      res.end();
      return;
    }
    const route = routes.find((r) => req.url?.startsWith(r.prefix));
    if (!route) {
      res.writeHead(404, cors);
      res.end('not found');
      return;
    }
    const upstream = http.request(
      {
        host: '127.0.0.1',
        port: route.target,
        method: req.method,
        path: req.url.slice(route.prefix.length) || '/',
        headers: { ...req.headers, host: `127.0.0.1:${route.target}` },
      },
      (up) => {
        const headers = { ...up.headers, ...cors };
        res.writeHead(up.statusCode ?? 502, headers);
        up.pipe(res);
      },
    );
    upstream.on('error', () => {
      res.writeHead(502, cors);
      res.end('upstream error');
    });
    req.pipe(upstream);
  })
  .listen(port, '127.0.0.1', () => console.log(`gateway on :${port}`));
