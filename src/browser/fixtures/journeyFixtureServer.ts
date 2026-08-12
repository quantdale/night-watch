// ---------------------------------------------------------------------------
// Local fixture for the Phase 2B journey engine.
//
// This server intentionally exposes fixed synthetic routes that mirror the
// reviewed semantic registry shape. It contains no customer-like data and is
// never used by a real DEV run.
// ---------------------------------------------------------------------------

import http from 'node:http';
import type { AddressInfo } from 'node:net';

export type JourneyFixtureVariant =
  | 'good'
  | 'route-mismatch'
  | 'missing-selector'
  | 'mutation-action'
  | 'unknown-action'
  | 'runtime-exception'
  | 'malformed-json'
  | 'cancellation'
  | 'production-destination'
  | 'unknown-destination'
  | 'privacy-secret'
  | 'critical-js-500'
  | 'font-502'
  | 'optional-image-failure'
  | 'js-html'
  | 'csp-block'
  | 'unhandled-rejection'
  | 'console-warning';

export interface JourneyFixtureHandle {
  origin: string;
  host: string;
  requests: Array<{ method: string; url: string }>;
  close(): Promise<void>;
}

function send(res: http.ServerResponse, status: number, type: string, body: string): void {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

function pageHtml(pathname: string, variant: JourneyFixtureVariant): string {
  const marker = pathname.includes('payer-exchange-rate')
    ? '<div class="__ExchangeRate"><div class="__ExchangeRateDataTable"></div></div>'
    : pathname.includes('global-exchange-rate')
      ? '<div class="__GlobalExchangeRateDataTable"></div>'
      : '<div class="__CustomDataTable"></div>';
  const markerHtml = variant === 'missing-selector' ? '' : marker;
  const button = variant === 'mutation-action' || variant === 'unknown-action'
    ? '<button data-nw-control="safe-read-control" type="button">Read-only control</button>'
    : '';
  const actionScript = variant === 'mutation-action'
    ? `document.querySelector('[data-nw-control="safe-read-control"]')?.addEventListener('click', () => fetch('/m/ripple/v2/payer/exchange_rate/2026-08', {method:'POST'}).catch(() => {}));`
    : variant === 'unknown-action'
      ? `document.querySelector('[data-nw-control="safe-read-control"]')?.addEventListener('click', () => fetch('/m/ripple/action-unknown').catch(() => {}));`
      : '';
  const routeMutation = variant === 'route-mismatch'
    ? "history.replaceState({}, '', '/unexpected-route');"
    : '';
  const runtime = variant === 'runtime-exception'
    ? "setTimeout(() => { throw new Error('synthetic runtime exception'); }, 25);"
    : '';
  const destination = variant === 'production-destination'
    ? "fetch('https://api.alphaus.cloud/m/ripple/synthetic').catch(() => {});"
    : variant === 'unknown-destination'
      ? "fetch('https://unknown.synthetic.alphaus.cloud/m/ripple/synthetic').catch(() => {});"
      : '';
  const cancel = variant === 'cancellation'
    ? "const controller = new AbortController(); fetch('/api/cancel', {signal: controller.signal}).catch(() => {}); setTimeout(() => controller.abort(), 1);"
    : '';
  const secret = variant === 'privacy-secret'
    ? "fetch('/m/ripple/privacy-read', {headers: {Authorization: 'Bearer SYNTHETIC_FAKE_SECRET'}}).catch(() => {});"
    : '';
  const csp = variant === 'csp-block'
    ? '<meta http-equiv="Content-Security-Policy" content="script-src \'none\'">'
    : '';
  const resourceTags = [
    variant === 'critical-js-500' || variant === 'js-html' ? '<script src="/static/js/app.js"></script>' : '',
    variant === 'font-502' ? '<link rel="preload" as="font" href="/static/fonts/synthetic.woff2" crossorigin>' : '',
    variant === 'optional-image-failure' ? '<img src="/optional/missing.png" alt="synthetic optional asset">' : '',
  ].join('');
  const rejection = variant === 'unhandled-rejection'
    ? "setTimeout(() => window.dispatchEvent(new Event('unhandledrejection')), 0);"
    : '';
  const warning = variant === 'console-warning'
    ? "console.warn('synthetic warning');"
    : '';
  const readScript = pathname.includes('payer-exchange-rate')
    ? "fetch('/m/ripple/v2/payer/exchange_rate/2026-08').then(() => {}).catch(() => {});"
    : pathname.includes('global-exchange-rate')
      ? "fetch('/m/ripple/exchange_rate/global/aws').then(() => {}).catch(() => {});"
      : "fetch('/m/blue/billing/v1/billinggroups').then(() => {}).catch(() => {}); fetch('/m/ripple/accts?vendor=aws').then(() => {}).catch(() => {});";
  const passiveUnknown = "fetch('/m/ripple/passive-bootstrap').catch(() => {});";
  return `<!doctype html>
<html><head><meta charset="utf-8">${csp}<title>Synthetic Ripple Journey</title>${resourceTags}</head>
<body><div id="app"><div class="q-layout-container layout">${markerHtml}${button}</div></div>
<script>
${readScript}
${passiveUnknown}
${actionScript}
${routeMutation}
${runtime}
${destination}
${cancel}
${secret}
${rejection}
${warning}
</script></body></html>`;
}

export function startJourneyFixtureServer(
  variant: JourneyFixtureVariant = 'good',
): Promise<JourneyFixtureHandle> {
  const requests: Array<{ method: string; url: string }> = [];
  const server = http.createServer((req, res) => {
    const url = req.url ?? '/';
    const pathname = url.split('?')[0] ?? url;
    requests.push({ method: req.method ?? 'GET', url });

    if (pathname === '/api/cancel') {
      setTimeout(() => send(res, 200, 'application/json', '{"cancelled":false}'), 100);
      return;
    }
    if (pathname === '/static/js/app.js') {
      if (variant === 'critical-js-500') {
        send(res, 500, 'application/javascript', 'window.__syntheticApp = false;');
      } else if (variant === 'js-html') {
        send(res, 200, 'text/html', '<html>synthetic wrong content</html>');
      } else {
        send(res, 200, 'application/javascript', 'window.__syntheticApp = true;');
      }
      return;
    }
    if (pathname === '/static/fonts/synthetic.woff2') {
      send(res, variant === 'font-502' ? 502 : 200, variant === 'font-502' ? 'text/plain' : 'font/woff2', 'synthetic-font');
      return;
    }
    if (pathname === '/optional/missing.png') {
      send(res, 404, 'image/png', 'missing');
      return;
    }
    if (variant === 'malformed-json' && pathname.startsWith('/m/ripple/')) {
      send(res, 200, 'application/json', '{"synthetic":');
      return;
    }
    if (pathname === '/m/ripple/v2/payer/exchange_rate/2026-08') {
      send(res, 200, 'application/json', '{"synthetic":"read"}');
      return;
    }
    if (pathname === '/m/ripple/exchange_rate/global/aws') {
      send(res, 200, 'application/json', '{"synthetic":"read"}');
      return;
    }
    if (pathname === '/m/blue/billing/v1/billinggroups' || pathname === '/m/ripple/accts') {
      send(res, 200, 'application/json', '{"synthetic":"read"}');
      return;
    }
    if (pathname === '/m/ripple/passive-bootstrap') {
      send(res, 200, 'application/json', '{"bootstrap":true}');
      return;
    }
    if (pathname === '/m/ripple/privacy-read') {
      send(res, 200, 'application/json', '{"synthetic":"privacy"}');
      return;
    }
    if (pathname === '/m/ripple/action-unknown') {
      send(res, 200, 'application/json', '{"synthetic":"unknown"}');
      return;
    }
    if (pathname === '/m/ripple/v2/payer/exchange_rate/2026-08' && req.method === 'POST') {
      send(res, 200, 'application/json', '{"synthetic":"mutation"}');
      return;
    }
    if (pathname.startsWith('/m/ripple/')) {
      if (variant === 'malformed-json') {
        send(res, 200, 'application/json', '{"synthetic":');
      } else {
        send(res, 200, 'application/json', '{"synthetic":"unreviewed"}');
      }
      return;
    }
    send(res, 200, 'text/html', pageHtml(pathname, variant));
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      const origin = `http://127.0.0.1:${address.port}`;
      resolve({
        origin,
        host: '127.0.0.1',
        requests,
        close: () => new Promise<void>((resolveClose, rejectClose) => {
          server.closeIdleConnections();
          server.close((error) => error ? rejectClose(error) : resolveClose());
        }),
      });
    });
  });
}
