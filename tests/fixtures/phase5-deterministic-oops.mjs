#!/usr/bin/env node
// Deterministic local substitute for the source-built OOPS binary.
//
// This fixture deliberately implements only the restricted Phase 5 relay
// request: one loopback HTTP GET, no response-body read, no output, and no
// external URL or notification capability. The parent adapter still owns
// scenario parsing, executable provenance, oracle projection, and cleanup.

import fs from 'node:fs';
import http from 'node:http';

const args = process.argv.slice(2);
if (args.length !== 3 || args[0] !== '--scenarios' || args[2] !== '--skip-result-notif') process.exit(2);

let document;
try {
  document = JSON.parse(fs.readFileSync(args[1], 'utf8'));
} catch {
  process.exit(2);
}

const request = document?.run?.[0]?.http;
if (
  request?.method !== 'GET' ||
  typeof request?.url !== 'string' ||
  !request.url.startsWith('http://127.0.0.1:') ||
  typeof request?.headers?.['X-Nightwatch-Operation-Id'] !== 'string'
) process.exit(2);

let target;
try {
  target = new URL(request.url);
} catch {
  process.exit(2);
}
if (target.hostname !== '127.0.0.1' || target.port === '' || !/^\/v1\/operations\/[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/.test(target.pathname)) process.exit(2);

const child = http.request({
  hostname: '127.0.0.1',
  port: Number(target.port),
  path: target.pathname,
  method: 'GET',
  headers: {
    Accept: 'application/json',
    'X-Nightwatch-Operation-Id': request.headers['X-Nightwatch-Operation-Id'],
  },
}, (response) => {
  // The status is intentionally not interpreted here. The relay observation
  // is the oracle authority, including assertion failures; the child only
  // proves that the restricted request path can complete.
  response.resume();
  response.once('end', () => process.exit(0));
});
child.once('error', () => process.exit(2));
child.end();
