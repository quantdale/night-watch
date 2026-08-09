// ---------------------------------------------------------------------------
// Nightwatch — local fixture app server (Phase 1 + 1.1).
//
// Minimal local web app(s) bound to 127.0.0.1:0 used by smoke tests and as
// the offline default target for the 'local' scenario. ANY path that is not
// /api/* or /assets/* renders the HTML page, so journey routes like '/' and
// '/invoices' work.
//
// Variants:
//   good     — clean passive page (read-only fetches incl. a fake
//              Authorization header and a telemetry probe; no errors).
//   negative — good page PLUS production fetch, console error, page error,
//              malformed-JSON endpoint.
//   safety   — explicit driver page exposing window.__nw helpers used by the
//              network-surface regression suite (SW/worker/WS/SSE/popup/
//              redirect/download probes). No automatic network activity.
//
// The server also speaks a minimal WebSocket echo protocol on /api/safety/ws
// (RFC 6455 handshake + unmasked echo of text frames) so allowed-WebSocket
// tests can prove real communication.
// ---------------------------------------------------------------------------

import http from 'node:http';
import crypto from 'node:crypto';
import type { AddressInfo } from 'node:net';

export type FixtureVariant = 'good' | 'negative' | 'safety';

export interface FixtureRequest {
  method: string;
  url: string;
}

export interface FixtureServerHandle {
  origin: string;
  port: number;
  /** Every HTTP request received by the server (method + raw URL), in order. */
  requests: FixtureRequest[];
  /** Number of successful WebSocket upgrades on /api/safety/ws. */
  readonly wsConnections: number;
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

// ---------------------------------------------------------------------------
// Safety variant — explicit driver page. No automatic network activity;
// every probe is triggered by the tests via window.__nw.
// ---------------------------------------------------------------------------

const SAFETY_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Safety Fixture</title>
</head>
<body>
  <h1>Safety Fixture</h1>
  <script>
    window.__nw = {
      // fetchJson(url) -> {ok:true,status} | {ok:false,error}
      fetchJson: (url) => fetch(url).then(r => r.json()).then(() => ({ok:true})).catch((e) => ({ok:false, error:String(e.message ?? e)})),
      // wsOpen(url) -> {open,close,code,messages[]} after open or close/timeout
      wsOpen: (url, send) => new Promise((res) => {
        const out = {open:false, close:false, code:null, messages:[]};
        const ws = new WebSocket(url);
        ws.onopen = () => { out.open = true; if (send) ws.send(send); };
        ws.onmessage = (e) => { out.messages.push(String(e.data)); if (send && out.messages.length >= 1) res(out); };
        ws.onerror = () => {};
        ws.onclose = (e) => { out.close = true; out.code = e.code; res(out); };
        setTimeout(() => res(out), 2500);
      }),
      // esConnect() -> array of SSE messages received (or ['es-error'])
      esConnect: () => new Promise((res) => {
        const got = [];
        const es = new EventSource('/api/safety/events');
        es.onmessage = (e) => { got.push(e.data); if (got.length === 2) { es.close(); res(got); } };
        es.onerror = () => { if (got.length === 0) res(['es-error']); };
        setTimeout(() => { es.close(); res(got); }, 2500);
      }),
      // popup(url) -> 'opened' when a new page is created, 'blocked' otherwise
      popup: (url) => { const w = window.open(url, '_blank'); return w ? 'opened' : 'blocked'; },
      // attemptSW() -> result of navigator.serviceWorker.register
      attemptSW: () => navigator.serviceWorker.register('/safety/sw.js')
        .then(() => 'sw-registered').catch((e) => 'sw-fail:' + String(e.message ?? e)),
      // startWorker() -> dedicated worker fetches a denied host and reports back
      startWorker: () => new Promise((res) => {
        const w = new Worker('/safety/worker.js');
        w.onmessage = (e) => res(String(e.data));
        w.onerror = () => res('worker-error');
        w.postMessage('go');
      }),
      // attemptSharedWorker() -> SharedWorker construction (stub throws)
      attemptSharedWorker: () => { try { new SharedWorker('/safety/shared.js'); return 'shared-created'; } catch (e) { return 'shared-blocked:' + String(e.message ?? e); } },
      // dl(url) -> click an <a download> pointing at url
      dl: (url) => { const a = document.createElement('a'); a.href = url; a.download = 'x.bin'; document.body.appendChild(a); a.click(); return 'clicked'; },
      // setCookieAndFetch(name, value, url) — proves Cookie header redaction
      setCookieAndFetch: (name, value, url) => { document.cookie = name + '=' + value + '; path=/'; return fetch(url).then(() => 'cookie-fetch-ok').catch(() => 'cookie-fetch-fail'); },
    };
  </script>
</body>
</html>`;

const SAFETY_WORKER_JS = `self.onmessage = async () => {
  try {
    const r = await fetch('https://random-host-xyz.alphaus.cloud/from-worker');
    self.postMessage('worker-fetch-ok:' + r.status);
  } catch (e) {
    self.postMessage('worker-fetch-fail:' + (e.message || e));
  }
};`;

const INVOICES_JSON = '[{"id":"inv-1","month":"2026-07","total":123.45,"currency":"USD"}]';
const BILLING_GROUPS_JSON = '[{"id":"bg-1","name":"Fixture BG","currency":"USD"}]';
const STREAM_NDJSON = '{"result":{"i":1}}\n{"result":{"i":2}}\n{"result":{"i":3}}\n';
const POPUP_HTML = '<!doctype html><html><body><h1 id="popup-landed">popup landed</h1></body></html>';

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function send(res: http.ServerResponse, status: number, contentType: string, body: string): void {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(body);
}

export function startFixtureServer(variant: FixtureVariant = 'good'): Promise<FixtureServerHandle> {
  const requests: FixtureRequest[] = [];
  const html =
    variant === 'good' ? GOOD_HTML : variant === 'negative' ? NEGATIVE_HTML : SAFETY_HTML;
  let wsConnections = 0;

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
        case '/api/safety/echo':
          send(res, 200, 'application/json', '{"echo":"ok"}');
          return;
        case '/api/safety/landed':
          send(res, 200, 'application/json', '{"landed":true}');
          return;
        case '/api/safety/events':
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
          res.write('data: hello\n\n');
          setTimeout(() => {
            res.write('data: world\n\n');
            res.end();
          }, 200);
          return;
        case '/api/safety/download':
          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': 'attachment; filename="x.bin"',
          });
          res.end('BINARYDATA');
          return;
        case '/api/safety/popup':
          send(res, 200, 'text/html', POPUP_HTML);
          return;
        case '/api/safety/redirect-ok':
          res.writeHead(302, { Location: '/api/safety/landed' });
          res.end();
          return;
        case '/api/safety/redirect-prod':
          // Production-class denied destination (legacy Alphaus domain) that
          // does NOT resolve (no wildcard DNS on mobingi.com) — the redirect
          // target can never be contacted for real even if a layer fails.
          res.writeHead(302, { Location: 'https://random.mobingi.com/m/ripple/redirected' });
          res.end();
          return;
        case '/api/safety/redirect-unknown':
          res.writeHead(302, { Location: 'https://random-host-xyz.alphaus.cloud/redirected' });
          res.end();
          return;
        case '/api/safety/redirect-telemetry':
          res.writeHead(302, { Location: 'https://sentry.example.invalid/redirected' });
          res.end();
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

    if (variant === 'safety') {
      if (pathname === '/safety/worker.js') {
        send(res, 200, 'application/javascript', SAFETY_WORKER_JS);
        return;
      }
      if (pathname === '/safety/sw.js' || pathname === '/safety/shared.js') {
        // These should NEVER be fetched in a hardened run (SW blocked at the
        // browser level; SharedWorker constructor blocked by the init script).
        // If they ARE fetched, the test sees the request in server.requests()
        // and the run's evidence — a containment failure signal.
        send(res, 200, 'application/javascript', '/* containment probe */');
        return;
      }
    }

    // Everything else renders the app page (journey routes '/' and '/invoices').
    send(res, 200, 'text/html', html);
  });

  // Minimal RFC 6455 WebSocket echo endpoint on /api/safety/ws (any path).
  server.on('upgrade', (req, socket) => {
    const url = req.url ?? '';
    requests.push({ method: 'WS-UPGRADE', url });
    if (!url.startsWith('/api/safety/ws')) {
      socket.destroy();
      return;
    }
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }
    wsConnections += 1;
    const accept = crypto
      .createHash('sha1')
      .update(key + WS_GUID)
      .digest('base64');
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
    );

    // Unmask client frames and echo text/binary frames back (server frames
    // are unmasked per RFC 6455).
    let buf = Buffer.alloc(0);
    socket.on('data', (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk]);
      for (;;) {
        if (buf.length < 2) break;
        const b0 = buf[0]!;
        const b1 = buf[1]!;
        const opcode = b0 & 0x0f;
        let len = b1 & 0x7f;
        let off = 2;
        if (len === 126) {
          if (buf.length < 4) break;
          len = buf.readUInt16BE(2);
          off = 4;
        } else if (len === 127) {
          if (buf.length < 10) break;
          len = Number(buf.readBigUInt64BE(2));
          off = 10;
        }
        const masked = (b1 & 0x80) !== 0;
        const payloadStart = off + (masked ? 4 : 0);
        if (buf.length < payloadStart + len) break;
        let payload = buf.subarray(payloadStart, payloadStart + len);
        if (masked) {
          const mask = buf.subarray(off, off + 4);
          const unmasked = Buffer.alloc(len);
          for (let i = 0; i < len; i++) unmasked[i] = payload[i]! ^ mask[i % 4]!;
          payload = unmasked;
        }
        buf = buf.subarray(payloadStart + len);

        if (opcode === 0x8) {
          // close frame — echo close, end the socket
          try {
            socket.end(Buffer.from([0x88, 0x00]));
          } catch {
            socket.destroy();
          }
          return;
        }
        if (opcode === 0x1 || opcode === 0x2) {
          // text/binary — echo
          let header: Buffer;
          if (len < 126) {
            header = Buffer.from([0x80 | opcode, len]);
          } else if (len < 65536) {
            header = Buffer.alloc(4);
            header[0] = 0x80 | opcode;
            header[1] = 126;
            header.writeUInt16BE(len, 2);
          } else {
            header = Buffer.alloc(10);
            header[0] = 0x80 | opcode;
            header[1] = 127;
            header.writeBigUInt64BE(BigInt(len), 2);
          }
          try {
            socket.write(Buffer.concat([header, payload]));
          } catch {
            socket.destroy();
          }
        }
        // other opcodes (ping/pong) — ignored for the fixture
      }
    });
    socket.on('error', () => {
      /* fixture socket errors are irrelevant */
    });
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
        get wsConnections(): number {
          return wsConnections;
        },
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
