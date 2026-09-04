// ---------------------------------------------------------------------------
// MA-8 / F-13 — the P1 passive capability cone, proved structurally.
//
// "Passive" is not a policy the observer promises to follow. It is a property
// of the import graph: the cone imports no module that can navigate, actuate,
// fetch, dispatch, replay, launch, authenticate, or reach the network, so no
// P1 code path can cause production traffic no matter how it is called. These
// tests assert that property over comment-stripped source — the cone
// documents its own boundary in comments (as C-11 does), and documentation
// must never count as a violation.
//
// Runtime behavior (no navigation primitive executes during a session) is
// proved by the mock-subject integration suite; this suite proves the
// stronger claim that no such primitive is even reachable.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import * as p1 from '../../src/core/prodObserveP1';

const CONE = path.resolve(__dirname, '../../src/core/prodObserveP1');

function coneFiles(): string[] {
  return fs
    .readdirSync(CONE)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => path.join(CONE, file))
    .sort();
}

function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
}

function scanned(): { file: string; source: string }[] {
  return coneFiles().map((file) => ({ file, source: withoutComments(fs.readFileSync(file, 'utf8')) }));
}

test('the cone exists and is a sibling of the C-11 cone, never a member', () => {
  const files = coneFiles();
  expect(files.length).toBeGreaterThan(0);
  expect(CONE.endsWith('src/core/prodObserveP1')).toBe(true);
  expect(fs.existsSync(path.resolve(CONE, '../prodObserve/productionRunGate.ts'))).toBe(true);
});

test('the cone never imports the C-11 request chain', () => {
  for (const { file, source } of scanned()) {
    expect(source, file).not.toMatch(/core\/prodObserve[^P]/);
    expect(source, file).not.toMatch(/from\s+['"]\.\.\/prodObserve/);
  }
});

test('the cone has no navigation primitive', () => {
  const forbidden = [/\.goto\(/, /page\.reload/, /goBack\(/, /goForward\(/, /setContent\(/, /bringToFront\(/];
  for (const { file, source } of scanned()) {
    for (const pattern of forbidden) expect(source, `${file} ${pattern}`).not.toMatch(pattern);
  }
});

test('the cone has no actuation primitive', () => {
  const forbidden = [
    /\.click\(/,
    /\.fill\(/,
    /\.type\(/,
    /\.press\(/,
    /\.check\(/,
    /selectOption\(/,
    /mouse\./,
    /keyboard\./,
    /touchscreen\./,
    /dragTo\(/,
  ];
  for (const { file, source } of scanned()) {
    for (const pattern of forbidden) expect(source, `${file} ${pattern}`).not.toMatch(pattern);
  }
});

test('the cone has no network or process capability', () => {
  const forbidden = [
    /node:https?['"]/,
    /node:net['"]/,
    /child_process/,
    /XMLHttpRequest/,
    /WebSocket/,
    /\bfetch\(/,
    /spawn\(/,
    /execFile\(/,
  ];
  for (const { file, source } of scanned()) {
    for (const pattern of forbidden) expect(source, `${file} ${pattern}`).not.toMatch(pattern);
  }
  // The only node: modules the cone may reach are enumerated exactly.
  const allowedNode = new Set(['node:crypto', 'node:fs', 'node:path']);
  for (const { file, source } of scanned()) {
    for (const match of source.matchAll(/from\s+['"](node:[^'"]+)['"]/g)) {
      const imported = match[1] ?? '';
      expect(allowedNode.has(imported), `${file} imports ${imported}`).toBe(true);
    }
  }
});

test('the cone cannot replay, minimize, run DEV/NEXT, or create auth state', () => {
  // NOTE: the quoted 'REPLAY' literal in `P1_REQUESTABLE_AUTHORIZATION_CLASSES`
  // is the class-distinction mechanism itself (a P1 grant must never authorize
  // a run claiming REPLAY authority), not replay machinery — so this suite
  // targets executor-shaped references, never the bare word.
  const forbidden = [
    /realRunGate/,
    /replayExecutor/i,
    /ReplayPlan/,
    /\.replay\(/,
    /minimiz/i,
    /storageState/,
    /addCookies/,
    /httpCredentials/,
    /\.screenshot\(/,
    /tracing\./,
    /browser\.launch/,
    /newContext\(/,
    /setInputFiles\(/,
  ];
  for (const { file, source } of scanned()) {
    for (const pattern of forbidden) expect(source, `${file} ${pattern}`).not.toMatch(pattern);
  }
});

test('the public surface exposes no actuation-capable name', () => {
  for (const name of Object.keys(p1)) {
    expect(name, name).not.toMatch(/navigate|click|fetch|replay|dispatch|login|launch|goto|submit|keyboard|mouse/i);
  }
});

test('the boundary is documented, and the documentation is not a violation', () => {
  const index = fs.readFileSync(path.join(CONE, 'index.ts'), 'utf8');
  // The raw file names the forbidden capabilities (that is the point of the
  // documentation); the stripped form used above must not.
  expect(index).toMatch(/MUST NEVER import/);
  const stripped = withoutComments(index);
  expect(stripped).not.toMatch(/core\/prodObserve[^P]/);
});
