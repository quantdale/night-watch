// ---------------------------------------------------------------------------
// Nightwatch — local fixture app server (Phase 1).
//
// A minimal read-only web app bound to 127.0.0.1:0 used by the smoke tests
// and as the offline default target for the 'local' scenario. ANY path that
// is not /api/* or /assets/* renders the HTML page, so journey routes like
// '/' and '/invoices' both work. The page fires read-only fetches; the
// 'negative' variant additionally fires a production-host fetch, a console
// error, a page error and a malformed-JSON request.
// ---------------------------------------------------------------------------

import http from 'node:http';
import type { AddressInfo } from 'node:net';

export type FixtureVariant = 'good' | 'negative';

export interface FixtureRequest {
  method: string;
  url: string;
}

export interface FixtureServerHandle {
  origin: string;
  port: number;
  /** Every request received by the server (method + raw URL), in order. */
  requests: FixtureRequest[];
  close(): Promise<void>;
}

// 1x1 transparent PNG.
const LOGO_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

const BASE_FETCHES = `
    console.log('fixture ready');
    fetch('/api/invoices').then(r => r.json()).catch(() => {});
    fetch('/api/billing-groups').then(r => r.json()).catch(() => {});
    fetch('/api/stream').then(r => r.text()).catch(() => {});
    fetch('/api/invoices', { headers: { Authorization: 'Bearer FAKE_SECRET_TOKEN_12345' } }).then(r => r.json()).catch(() => {});
    fetch('https://sentry.example.invalid/ingest?dummy=1').then(r => r.json()).catch(() => {});`;

const GOOD_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Ripple Fixture</title>
  <link rel="stylesheet" href="/assets/app.css">
</head>
<body>
  <img src="/assets/logo.png" alt="logo">
  <h1>Ripple Fixture</h1>
  <script>
    // Passive fixture page: read-only fetches only, no console errors, no throws.
    ${BASE_FETCHES}
  </script>
</body>
</html>`;

const NEGATIVE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Ripple Fixture</title>
  <link rel="stylesheet" href="/assets/app.css">
</head>
<body>
  <img src="/assets/logo.png" alt="logo">
  <h1>Ripple Fixture</h1>
  <script>
    // Negative fixture: adds a production-host fetch, console error, page
    // error and a malformed-JSON endpoint to the passive base.
    ${BASE_FETCHES}
    fetch('https://api.alphaus.cloud/m/ripple/invoices/2026-07').then(r => r.json()).catch(() => {});
    console.error('fixture console error');
    setTimeout(() => { throw new Error('fixture page error'); }, 50);
    fetch('/api/broken').then(r => r.json()).catch(() => {});
  </script>
</body>
</html>`;

const INVOICES_JSON = '[{"id":"inv-1","month":"2026-07","total":123.45,"currency":"USD"}]';
const BILLING_GROUPS_JSON = '[{"id":"bg-1","name":"Fixture BG","currency":"USD"}]';
const STREAM_NDJSON = '{"result":{"i":1}}\n{"result":{"i":2}}\n{"result":{"i":3}}\n';

function send(res: http.ServerResponse, status: number, contentType: string, body: string): void {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(body);
}

export function startFixtureServer(variant: FixtureVariant = 'good'): Promise<FixtureServerHandle> {
  const requests: FixtureRequest[] = [];
  const html = variant === 'good' ? GOOD_HTML : NEGATIVE_HTML;

  const server = http.createServer((req, res) => {
    const url = req.url ?? '/';
    requests.push({ method: req.method ?? 'GET', url });
    const pathname = url.split('?')[0] ?? url;

    if (pathname.startsWith('/api/')) {
      switch (pathname) {
        case '/api/invoices':
          send(res, 200, 'application/json', INVOICES_JSON);
          return;
        case '/api/billing-groups':
          send(res, 200, 'application/json', BILLING_GROUPS_JSON);
          return;
        case '/api/stream':
          send(res, 200, 'application/x-ndjson', STREAM_NDJSON);
          return;
        case '/api/broken':
          if (variant === 'negative') {
            send(res, 200, 'application/json', '{"id": "not json');
          } else {
            send(res, 404, 'application/json', '{"error":"not found"}');
          }
          return;
        default:
          send(res, 404, 'application/json', '{"error":"not found"}');
          return;
      }
    }

    if (pathname.startsWith('/assets/')) {
      if (pathname === '/assets/app.css') {
        send(res, 200, 'text/css', 'body{color:red}');
        return;
      }
      if (pathname === '/assets/logo.png') {
        res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': String(LOGO_PNG.length) });
        res.end(LOGO_PNG);
        return;
      }
      send(res, 404, 'application/json', '{"error":"not found"}');
      return;
    }

    // Everything else renders the app page (journey routes '/' and '/invoices').
    send(res, 200, 'text/html', html);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo;
      const port = addr.port;
      resolve({
        origin: `http://127.0.0.1:${port}`,
        port,
        requests,
        close: () =>
          new Promise<void>((res2, rej2) => {
            // Drop idle keep-alive sockets so close() does not hang on Chrome.
            server.closeIdleConnections();
            server.close((err) => (err ? rej2(err) : res2()));
          }),
      });
    });
  });
}
