// ---------------------------------------------------------------------------
// NW-AUD-020 — reproduction baseline for the four known semantic-admission
// defect classes, proven against LIVE source before any fix.
//
// Every assertion below pins CURRENT defective behavior with evidence from
// recon/wave1-aud020-census.md (zero drift since planning SHA 34517c9b).
// The M5 implementation must DELIBERATELY INVERT each of these pins; a fix
// that leaves one green has not fixed the defect it names.
//
//   A. PASSIVE UNKNOWN CONTINUATION — networkObserver relabels unknown API
//      traffic PASSIVE (navigation kinds OR no intent) and only mutation /
//      action-caused unknown abort, so passive crosses route.continue().
//   B. TIMER-BASED CAUSALITY LOSS — engine closes intent after a fixed
//      250 ms sleep, BEFORE required-network and observation settlement.
//   C. NAVIGATION AS AMBIENT AUTHORITY — navigation/null intent is exactly
//      the passive relabel (fixtures ship startup unknowns today).
//   D. HOST-ONLY REDIRECT FALLBACK — the CDP Fetch guard destructures the
//      request URL only (no method), and host policy allows any path.
//
// Local/synthetic only: no real product traffic is used or implied.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import { decideBrowserHttp } from '../../src/core/safety/policyConsumers';
import type { EnvironmentConfig } from '../../src/core/environment/types';
import { RunRecorder } from '../../src/core/evidence/runRecorder';
import { RunMonitor } from '../../src/state/run';
import { createNightwatchContext } from '../../src/browser/context';
import { fixtureBootstrapExemptions } from '../../src/browser/fixtures/bootstrapExemptions';
import { startFixtureServer } from '../../src/browser/fixtures/fixtureServer';
import type { EndpointSemanticRule } from '../../src/core/safety/endpointSemantics';

const ROOT = path.join(__dirname, '..', '..');
const read = (relative: string): string => fs.readFileSync(path.join(ROOT, relative), 'utf8');

function fixtureEnvironment(origin: string): EnvironmentConfig {
  const host = new URL(origin).host;
  return {
    name: 'local',
    label: 'nw-aud-020 reproduction baseline',
    uiBaseUrl: origin,
    apiHosts: [host],
    authHosts: [],
    allowedHosts: [host, 'localhost'],
    staticAssetHosts: [],
    telemetryHosts: [],
    optionalThirdPartySupportHosts: [],
    browserBackgroundHosts: [],
    failOn: [],
  };
}

test.describe('NW-AUD-020 reproduction baseline (defects must later be inverted)', () => {
  test('A + C INVERTED: unknown API traffic is refused pre-effect; labels remain diagnostics only', () => {
    const observer = read('src/browser/observers/networkObserver.ts');

    // THE gate exists and runs BEFORE route.continue inside the allow branch:
    // continuation authority is the admission decision, nothing else.
    expect(observer).toMatch(/function admitApiRequest\(/);
    const apiGateComputedAt = observer.indexOf('const apiGate = endpointMatch === null');
    const gateCheckAt = observer.indexOf('if (!apiGate.admitted)');
    expect(apiGateComputedAt).toBeGreaterThan(0);
    expect(gateCheckAt).toBeGreaterThan(apiGateComputedAt);
    // The HTTP allow-branch continue AFTER the gate (the earlier occurrence
    // is the defensive ws-scheme early-exit, delegated to L2).
    const continueAt = observer.indexOf('await route.continue();', gateCheckAt);
    expect(continueAt).toBeGreaterThan(gateCheckAt);

    // The historical authority branch (disposition decides continuation) is gone.
    expect(observer).not.toContain(
      "if (decision.verdict === 'allow' && semanticObservation?.disposition === 'ACTION_CAUSED_UNKNOWN')",
    );

    // PASSIVE_UNKNOWN_OBSERVED survives ONLY as an assigned diagnostic label;
    // it is never compared — a label can no longer confer authority.
    expect(observer).toContain("'PASSIVE_UNKNOWN_OBSERVED'");
    expect(observer).not.toMatch(/=== 'PASSIVE_UNKNOWN_OBSERVED'/);

    // Navigation is not ambient authority: unknown traffic may consume a
    // bootstrap exemption only under a NAVIGATION-kind generation, and a
    // stale registry snapshot refuses everything.
    expect(observer).toMatch(/generation\.kind !== 'NAVIGATION'/);
    expect(observer).toContain('admissionSourceCurrent === false');
    expect(observer).toMatch(/bootstrapTable\.consume\(/);

    // Live fixtures still EMIT startup unknowns — they now require explicit
    // exemptions (src/browser/fixtures/bootstrapExemptions.ts) or refuse.
    const fixture = read('src/browser/fixtures/fixtureServer.ts');
    expect(fixture).toContain("fetch('/api/invoices')");
    expect(fixture).toContain("fetch('/api/billing-groups')");
    const journeyFixture = read('src/browser/fixtures/journeyFixtureServer.ts');
    expect(journeyFixture).toContain('/m/ripple/passive-bootstrap');
    // The journey-level passive count remains a truthful DIAGNOSTIC label.
    const journeyEngineTest = read('tests/unit/journeyEngine.test.ts');
    expect(journeyEngineTest).toMatch(/passiveUnknownCount\)\.toBeGreaterThan\(0\)/);
    // Explicit fixture exemptions exist and are wired through the context.
    const exemptions = read('src/browser/fixtures/bootstrapExemptions.ts');
    expect(exemptions).toContain('fixture.bootstrap.invoices');
    const context = read('src/browser/context.ts');
    expect(context).toContain('bootstrapExemptions: opts.bootstrapExemptions');
    expect(context).toContain('admissionSourceCurrent: opts.endpointRegistryCurrent');
  });

  test('B INVERTED: authority closes after deterministic settlement, never at the 250 ms pacing sleep', () => {
    const engine = read('src/core/journeys/engine.ts');
    // The pacing constant exists but is documented as pacing, not authority.
    expect(engine).toMatch(/const ACTION_SETTLE_MS = 250;/);
    expect(engine).toContain('Pacing grace after a click');
    expect(engine).not.toContain('Keep the intent classification window open');

    const sleepAt = engine.indexOf('await sleep(ACTION_SETTLE_MS);');
    // Click-path endJourneyIntent: the occurrence AFTER the pacing sleep.
    const endAt = engine.indexOf('ctx.network.endJourneyIntent(step.stepId);', sleepAt);
    const requiredNetworkAt = engine.indexOf('waitForRequiredNetwork(ctx, step', sleepAt);
    const settleBarrierAt = engine.indexOf('waitForNetworkObservationSettle(', requiredNetworkAt);
    expect(sleepAt).toBeGreaterThan(0);
    expect(requiredNetworkAt).toBeGreaterThan(sleepAt);
    // INVERTED: the authority close now sits AFTER required-network and
    // structural settlement, inside a finally (success AND failure settle;
    // no orphan generations).
    expect(endAt).toBeGreaterThan(requiredNetworkAt);
    expect(engine).toContain('failures can never leak an open');
    // The journey-wide observation barrier still finalizes after step close.
    expect(settleBarrierAt).toBeGreaterThan(endAt);
    // Exploration keeps its stronger hold (settle before end) — preserved.
    const exploration = read('src/products/ripple/explorationRuntime.ts');
    const explorationEnd = exploration.indexOf('opts.network.endJourneyIntent(action.actionId);');
    const explorationSettle = exploration.indexOf('EXPECTED_READ_NOT_SETTLED');
    expect(explorationEnd).toBeGreaterThan(0);
    expect(explorationSettle).toBeGreaterThan(0);
    expect(explorationEnd).toBeGreaterThan(explorationSettle);
    // Generations: open on begin, settle on end (authority seam proven at unit level too).
    const observer = read('src/browser/observers/networkObserver.ts');
    expect(observer).toMatch(/generations\.open\(kind\)\.id/);
    expect(observer).toMatch(/generations\.settle\(journeyGeneration\)/);
  });

  test('D INVERTED: the CDP Fetch guard binds method + effective redirect identity to the SAME admission — host policy alone cannot continue API traffic', () => {
    const guard = read('src/browser/network/fetchGuard.ts');
    // The pause handler now destructures the METHOD, the effective resource
    // type, and the redirect-follow-up identity (CDP redirectedRequestId).
    expect(guard).toMatch(/request: \{ url: string; method\?: string \}/);
    expect(guard).toMatch(/redirectedRequestId\?: string/);
    expect(guard).toContain('p.request.method');
    expect(guard).toContain('admitRequest?.(');
    expect(guard).toContain("resourceType ?? 'Other'");
    expect(guard).toContain('typeof p.redirectedRequestId ===');

    // Ordering: inside the host-allow branch the semantic admission runs and
    // a refusal fails the request BEFORE any continue — a same-host unknown
    // or mutation-shaped follow-up can no longer ride host authority alone.
    const allowAt = guard.indexOf("decision.verdict === 'allow'");
    const admissionCallAt = guard.indexOf('admitRequest?.(', allowAt);
    const refusalAt = guard.indexOf('!admission.admitted');
    const failAt = guard.indexOf('Fetch.failRequest', refusalAt);
    const continueAt = guard.indexOf('Fetch.continueRequest', refusalAt);
    expect(allowAt).toBeGreaterThan(0);
    expect(admissionCallAt).toBeGreaterThan(allowAt);
    expect(refusalAt).toBeGreaterThan(admissionCallAt);
    expect(failAt).toBeGreaterThan(refusalAt);
    expect(continueAt).toBeGreaterThan(failAt); // refusal path precedes continue

    // Categorical cross-layer receipt (privacy-safe: no URL in the refusal).
    expect(guard).toContain("message: 'SEMANTIC_ADMISSION_REFUSED'");
    expect(guard).toContain("transport: 'CDP_FOLLOWUP'".replace('FOLLOWUP', 'FETCH'));
    // Layer ownership: only follow-ups are evaluated here; non-redirect
    // API authority (and every bootstrap spend) is owned by L1 — two layers
    // must never evaluate a count-limited budget for the same request.
    expect(guard).toMatch(/isRedirectFollowUp\n|const isRedirectFollowUp/);
    expect(guard).toContain('non-redirect API authority is owned by L1');
    // Playwright's route does not re-intercept redirect follow-ups — which is
    // exactly why this layer must carry semantic authority for them.
    expect(guard).toMatch(/does NOT re-intercept redirect follow-ups/);

    // Host policy itself remains host-only (the premise the guard now
    // compensates for): an unknown same-host mutation-shaped path still
    // ALLOWS at pure host level — admission, not policy, is the backstop.
    const origin = 'http://127.0.0.1:45999';
    const env = fixtureEnvironment(origin);
    const policy = new OutboundPolicy(env);
    expect(decideBrowserHttp(policy, `${origin}/m/ripple/action-unknown`).verdict).toBe('allow');
    expect(decideBrowserHttp(policy, `${origin}/m/blue/billing/v1/billinggroups`).verdict).toBe('allow');

    // The observer exposes the shared gate to the guard.
    const observer = read('src/browser/observers/networkObserver.ts');
    expect(observer).toContain('admitRequest: (');
    const context = read('src/browser/context.ts');
    expect(context).toContain('admitRequest: network.admitRequest');
    // Redirect chains bind the target to the generation that earned the source.
    expect(observer).toContain('setBounded(redirectGenerations, new URL(location, rawUrl).href, sourceGeneration)');
    expect(observer).toMatch(/isRedirectFollowUp/);
    expect(observer).toContain('AMBIGUOUS_ATTRIBUTION');
  });

  test('file header: baseline provenance is recorded', () => {
    const self = read('tests/unit/semanticRequestAdmission.test.ts');
    expect(self).toContain('NW-AUD-020');
    // Classes A, B, C, D are all inverted above once their wiring landed.
    expect(self).toContain('CDP Fetch guard');
  });

  test('E2E bootstrap: budgeted grant reaches upstream once; unexempted and post-settlement fetches open ZERO upstream effect', async ({ browser }) => {
    // Synthetic loopback fixture only. The page's inline script fires, in
    // order: exempt#1 (granted), unregistered (refused), exempt#2 (budget
    // exhausted). After settlement a further exempt fetch must also refuse —
    // authority is navigation-generation state, not route reuse.
    const hits: string[] = [];
    const bootstrapPage = `<!doctype html><script>
        fetch('/api/exempt').catch(() => {});
        fetch('/api/unregistered').catch(() => {});
        fetch('/api/exempt').catch(() => {});
      </script><body>fixture</body>`;
    const server = http.createServer((req, res) => {
      if (req.url === '/' ) {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(bootstrapPage);
        return;
      }
      hits.push(req.url ?? '');
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"synthetic":"ok"}');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('fixture server did not expose a TCP port');
    const origin = `http://127.0.0.1:${address.port}`;
    const host = new URL(origin).host;
    const env: EnvironmentConfig = {
      name: 'local',
      label: 'nw-aud-020 e2e bootstrap',
      uiBaseUrl: origin,
      apiHosts: [host],
      authHosts: [],
      allowedHosts: [host, 'localhost'],
      staticAssetHosts: [],
      telemetryHosts: [],
      optionalThirdPartySupportHosts: [],
      browserBackgroundHosts: [],
      failOn: [],
    };
    const recorder = new RunRecorder({
      runId: `semantic-adm-e2e-${Date.now()}`,
      environment: 'local',
      product: 'ripple',
      browser: 'chromium',
      scenario: 'nw-aud-020-e2e-bootstrap',
    });
    const monitor = new RunMonitor(env.failOn);
    void monitor;
    let ctx: Awaited<ReturnType<typeof createNightwatchContext>> | null = null;
    try {
      ctx = await createNightwatchContext(browser, {
        env,
        recorder,
        uiBaseUrl: origin,
        trace: 'off',
        // Explicit, count-bounded (1 per navigation) exemption — adopted by
        // the reference graph through this very consumption.
        bootstrapExemptions: fixtureBootstrapExemptions(env.name, origin, [
          { id: 'e2e.bootstrap.exempt', routePattern: '^/api/exempt$' },
        ], 1),
      });
      const page = await ctx.page;
      await page.goto(`${origin}/`, { waitUntil: 'load' });

      // All three requests are intercepted during the navigation generation.
      await expect.poll(() => hits.filter((url) => url === '/api/exempt').length, { timeout: 5_000 }).toBe(1);
      const events = () => fs.readFileSync(path.join(recorder.dir, 'events.jsonl'), 'utf8');
      await expect.poll(() => {
        try { return (events().match(/SEMANTIC_ADMISSION_REFUSED/g) ?? []).length; } catch { return 0; }
      }, { timeout: 5_000 }).toBe(2);

      // 1) In-budget exemption reached the upstream exactly once.
      expect(hits.filter((url) => url === '/api/exempt')).toHaveLength(1);
      // 2) ZERO upstream effect for the unregistered refusal.
      expect(hits).not.toContain('/api/unregistered');
      // 3) ZERO upstream effect for the over-budget second exemption.
      expect(hits.filter((url) => url === '/api/exempt')).toHaveLength(1);

      const recorded = events();
      // Two-stage matching (recorded M5 design): an unknown path on an
      // origin+method family that HAS registered exemptions is route drift
      // (MISMATCH); fully-unregistered families (other origin/method/table-
      // empty) prove ADMISSION_BOOTSTRAP_UNREGISTERED in the pure suite.
      expect(recorded).toContain('ADMISSION_BOOTSTRAP_MISMATCH');
      expect(recorded).toContain('ADMISSION_BOOTSTRAP_EXHAUSTED');
      expect(recorded).toContain('BOOTSTRAP_EXEMPT');
      expect(recorded).toContain('e2e.bootstrap.exempt');
      // Refusal receipts are categorical: no path material persists in them.
      const refusalReceipts = recorded
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as { message?: string; data?: Record<string, unknown> })
        .filter((event) => event.message === 'SEMANTIC_ADMISSION_REFUSED');
      expect(refusalReceipts.length).toBeGreaterThanOrEqual(2);
      for (const receipt of refusalReceipts) {
        const receiptText = JSON.stringify(receipt.data);
        expect(receiptText).not.toContain('/api/');
        expect(receiptText).not.toContain('unregistered');
        expect(receiptText).not.toContain('exempt');
      }

      // 4) Wait for DETERMINISTIC settlement (the bounded window closing —
      // an event, not a guess), then the SAME exempt route has no navigation
      // generation to spend under: timing and route equality grant nothing.
      await expect.poll(() => {
        try { return events().includes('NAVIGATION_GENERATION_SETTLED'); } catch { return false; }
      }, { timeout: 5_000 }).toBe(true);
      const settledRefusalBefore = (events().match(/SEMANTIC_ADMISSION_REFUSED/g) ?? []).length;
      await page.evaluate(() => fetch('/api/exempt').catch(() => undefined));
      await expect.poll(() => {
        try {
          return (events().match(/SEMANTIC_ADMISSION_REFUSED/g) ?? []).length;
        } catch {
          return 0;
        }
      }, { timeout: 5_000 }).toBeGreaterThan(settledRefusalBefore);
      expect(hits.filter((url) => url === '/api/exempt')).toHaveLength(1);
      expect(events()).toContain('ADMISSION_UNBOUND_GENERATION');
    } finally {
      if (ctx !== null) await ctx.close();
      await new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      });
    }
  });

  test('Step 5 E2E: proven WS rule + generation opens the loopback socket; unknown WS refuses with ZERO new upstream upgrades', async ({ browser }) => {
    const server = await startFixtureServer('good');
    const wsUrl = `ws://127.0.0.1:${server.port}/api/safety/ws`;
    const env = fixtureEnvironment(server.origin);
    const wsRule: EndpointSemanticRule = {
      id: 'fixture.ws.echo',
      host: '127.0.0.1',
      method: 'WS',
      path: '/api/safety/ws',
      classification: 'KNOWN_READ',
      provenance: 'synthetic local fixture echo (local-only, non-product)',
    };
    const exemptions = fixtureBootstrapExemptions(env.name, server.origin);
    const openSocket = async (page: import('@playwright/test').Page, url: string): Promise<{ open: boolean; echo: string | null }> =>
      page.evaluate((target) => new Promise<{ open: boolean; echo: string | null }>((resolve) => {
        let settled = false;
        const socket = new WebSocket(target);
        const done = (open: boolean, echo: string | null): void => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          try { socket.close(); } catch { /* already closed */ }
          resolve({ open, echo });
        };
        const timer = setTimeout(() => done(false, null), 3_000);
        socket.onopen = () => { socket.send('ping'); };
        socket.onmessage = (event) => done(true, String(event.data));
        socket.onerror = () => done(false, null);
        socket.onclose = () => done(false, null);
      }), url);

    let admittedCtx: Awaited<ReturnType<typeof createNightwatchContext>> | null = null;
    let refusedCtx: Awaited<ReturnType<typeof createNightwatchContext>> | null = null;
    try {
      // Case 1 — proven WS rule + explicit generation admits.
      const recorderA = new RunRecorder({
        runId: `ws-admit-${Date.now()}`,
        environment: 'local',
        product: 'ripple',
        browser: 'chromium',
        scenario: 'nw-aud-020-ws-admit',
      });
      admittedCtx = await createNightwatchContext(browser, {
        env,
        recorder: recorderA,
        uiBaseUrl: server.origin,
        trace: 'off',
        endpointRegistry: [wsRule],
        bootstrapExemptions: exemptions,
      });
      await admittedCtx.page.goto(server.origin + '/', { waitUntil: 'load' });
      admittedCtx.network.beginJourneyIntent('ws-admit-probe', 'WS_ECHO_PROBE');
      let admitted: { open: boolean; echo: string | null };
      try {
        admitted = await openSocket(admittedCtx.page, wsUrl);
      } finally {
        admittedCtx.network.endJourneyIntent('ws-admit-probe');
      }
      expect(admitted.open).toBe(true);
      expect(admitted.echo).toBe('ping');
      expect(server.wsConnections).toBe(1);
      const eventsA = fs.readFileSync(path.join(recorderA.dir, 'events.jsonl'), 'utf8');
      expect(eventsA).toContain('PROVEN_READ');
      expect(eventsA).toContain('"method":"WS"');

      // Case 2 — the SAME server, a context with NO endpoint registry:
      // unknown WS must refuse BEFORE the handshake: zero new upstream
      // upgrades, categorical receipt, no path material.
      const recorderB = new RunRecorder({
        runId: `ws-refuse-${Date.now()}`,
        environment: 'local',
        product: 'ripple',
        browser: 'chromium',
        scenario: 'nw-aud-020-ws-refuse',
      });
      refusedCtx = await createNightwatchContext(browser, {
        env,
        recorder: recorderB,
        uiBaseUrl: server.origin,
        trace: 'off',
        bootstrapExemptions: exemptions,
      });
      await refusedCtx.page.goto(server.origin + '/', { waitUntil: 'load' });
      refusedCtx.network.beginJourneyIntent('ws-refuse-probe', 'WS_ECHO_PROBE');
      let refused: { open: boolean; echo: string | null };
      try {
        refused = await openSocket(refusedCtx.page, wsUrl);
      } finally {
        refusedCtx.network.endJourneyIntent('ws-refuse-probe');
      }
      expect(refused.open).toBe(false);
      // ZERO new upstream effect: the counter is unchanged from case 1.
      expect(server.wsConnections).toBe(1);

      await expect.poll(() => {
        try {
          return fs.readFileSync(path.join(recorderB.dir, 'events.jsonl'), 'utf8').includes('SEMANTIC_ADMISSION_REFUSED');
        } catch {
          return false;
        }
      }, { timeout: 5_000 }).toBe(true);
      const eventsB = fs.readFileSync(path.join(recorderB.dir, 'events.jsonl'), 'utf8');
      const refusalLines = eventsB
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as { message?: string; data?: Record<string, unknown> })
        .filter((event) => event.message === 'SEMANTIC_ADMISSION_REFUSED');
      // Scope to the WEBSOCKET receipt: page-load HTTP fetches may also be
      // refused in this run (their interception races the navigation
      // window/intent — separate, timing-dependent diagnostics), but the
      // socket refusal itself is the deterministic contract under test.
      const wsRefusals = refusalLines.filter((refusal) => refusal.data?.transport === 'WEBSOCKET');
      expect(wsRefusals.length).toBeGreaterThanOrEqual(1);
      for (const refusal of wsRefusals) {
        expect(refusal.data?.method).toBe('WS');
        expect(typeof refusal.data?.admissionCode).toBe('string');
        // Privacy: no route material in the receipt.
        expect(JSON.stringify(refusal.data)).not.toContain('api/safety/ws');
      }
      // No admission was granted anywhere in the refused run.
      expect(eventsB).not.toContain('"admissionVia"');
    } finally {
      if (admittedCtx !== null) await admittedCtx.close();
      if (refusedCtx !== null) await refusedCtx.close();
      await server.close();
    }
  });

  test('Step 8: redirect matrix re-admits the EFFECTIVE follow-up by method+route+generation; a slow redirect cannot revive or borrow a closed generation', async ({ browser }) => {
    const hits: Record<string, number> = {};
    const bump = (urlPath: string): void => { hits[urlPath] = (hits[urlPath] ?? 0) + 1; };
    let releaseGated: () => void = () => { /* armed below */ };
    const hold = new Promise<void>((resolve) => { releaseGated = resolve; });
    const server = http.createServer(async (req, res) => {
      const urlPath = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
      bump(urlPath);
      const redirect = /^\/api\/r(301|302|303|307|308)-(src|dst)$/.exec(urlPath);
      if (redirect !== null) {
        if (redirect[2] === 'src') {
          res.writeHead(Number(redirect[1]), { location: `/api/r${redirect[1]}-dst` });
          res.end();
          return;
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('{"leg":"dst"}');
        return;
      }
      if (urlPath === '/api/gated-src') {
        await hold;
        res.writeHead(302, { location: '/api/gated-dst' });
        res.end();
        return;
      }
      if (urlPath === '/api/gated-dst') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('{"leg":"gated"}');
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<!doctype html><body>redirect matrix fixture</body>');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('fixture server did not expose a TCP port');
    const origin = `http://127.0.0.1:${address.port}`;
    const env = fixtureEnvironment(origin);
    const provenance = 'synthetic local redirect fixture (local-only, non-product)';
    const rules: EndpointSemanticRule[] = [];
    for (const code of [301, 302, 303, 307, 308]) {
      rules.push(
        { id: `fixture.r${code}.src.get`, host: '127.0.0.1', method: 'GET', path: `/api/r${code}-src`, classification: 'KNOWN_READ', provenance },
        { id: `fixture.r${code}.src.post`, host: '127.0.0.1', method: 'POST', path: `/api/r${code}-src`, classification: 'KNOWN_READ', provenance },
        { id: `fixture.r${code}.dst.get`, host: '127.0.0.1', method: 'GET', path: `/api/r${code}-dst`, classification: 'KNOWN_READ', provenance },
      );
    }
    rules.push(
      { id: 'fixture.gated.src.get', host: '127.0.0.1', method: 'GET', path: '/api/gated-src', classification: 'KNOWN_READ', provenance },
      { id: 'fixture.gated.dst.get', host: '127.0.0.1', method: 'GET', path: '/api/gated-dst', classification: 'KNOWN_READ', provenance },
    );
    const recorder = new RunRecorder({
      runId: `redirect-matrix-${Date.now()}`,
      environment: 'local',
      product: 'ripple',
      browser: 'chromium',
      scenario: 'nw-aud-020-redirect-matrix',
    });
    let ctx: Awaited<ReturnType<typeof createNightwatchContext>> | null = null;
    const events = () => fs.readFileSync(path.join(recorder.dir, 'events.jsonl'), 'utf8');
    try {
      ctx = await createNightwatchContext(browser, {
        env,
        recorder,
        uiBaseUrl: origin,
        trace: 'off',
        endpointRegistry: rules,
      });
      const page = await ctx.page;
      await page.goto(`${origin}/`, { waitUntil: 'load' });

      // ---- Redirect status matrix under one explicit ACTION generation ----
      ctx.network.beginJourneyIntent('redirect-matrix', 'REDIRECT_MATRIX');
      let results: Record<string, string | number>;
      try {
        results = await page.evaluate(async (base: string) => {
          const out: Record<string, string | number> = {};
          for (const code of [301, 302, 303, 307, 308]) {
            try { out[`get${code}`] = (await fetch(`${base}/api/r${code}-src`)).status; } catch { out[`get${code}`] = 'REFUSED'; }
          }
          for (const code of [301, 302, 303, 307, 308]) {
            try { out[`post${code}`] = (await fetch(`${base}/api/r${code}-src`, { method: 'POST' })).status; } catch { out[`post${code}`] = 'REFUSED'; }
          }
          return out;
        }, origin);
      } finally {
        ctx.network.endJourneyIntent('redirect-matrix');
      }

      // GET: all five codes preserve method — every follow-up lands.
      for (const code of [301, 302, 303, 307, 308]) {
        expect(results[`get${code}`], `GET ${code}`).toBe(200);
      }
      // POST: the EFFECTIVE follow-up method (what Chrome will actually send)
      // decides admission — asserted against real browser/CDP behavior:
      //   301/302/303 -> GET  => lands on the GET read rule
      //   307/308      -> POST preserved => dst GET-only rule refuses it
      //                   (method mismatch) BEFORE the redirected upstream.
      expect(results.post303, 'POST 303 converts to GET').toBe(200);
      expect(results.post301, 'POST 301 converts to GET in Chromium').toBe(200);
      expect(results.post302, 'POST 302 converts to GET in Chromium').toBe(200);
      expect(results.post307, 'POST 307 preserves method and must refuse').toBe('REFUSED');
      expect(results.post308, 'POST 308 preserves method and must refuse').toBe('REFUSED');

      // Upstream counters (ACTUAL effect evidence):
      expect(hits['/api/r301-src']).toBe(2); // GET + POST sources both admitted
      expect(hits['/api/r307-src']).toBe(2);
      // dst = one GET landing + one POST-converted landing for 301/302/303;
      // exactly one GET landing (the POST never reached upstream) for 307/308.
      expect(hits['/api/r301-dst']).toBe(2);
      expect(hits['/api/r302-dst']).toBe(2);
      expect(hits['/api/r303-dst']).toBe(2);
      expect(hits['/api/r307-dst']).toBe(1);
      expect(hits['/api/r308-dst']).toBe(1);

      // The refused POST follow-ups produced categorical CDP receipts with
      // METHOD_MISMATCH and no route material.
      const refusalReceipts = events()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as { message?: string; data?: Record<string, unknown> })
        .filter((event) => event.message === 'SEMANTIC_ADMISSION_REFUSED' && event.data?.transport === 'CDP_FETCH');
      expect(refusalReceipts.length).toBeGreaterThanOrEqual(2);
      for (const receipt of refusalReceipts) {
        expect(receipt.data?.admissionCode).toBe('ADMISSION_METHOD_MISMATCH');
        expect(JSON.stringify(receipt.data)).not.toContain('/api/r');
      }

      // ---- Slow gated redirect: cross-generation closure (section 8B) ----
      // 1) generation A opens; 2) source admitted under A and reaches the
      // upstream; 3) redirect begins (server holds the 302); 4) A settles;
      // 5) generation B opens; 6) the follow-up is released.
      ctx.network.beginJourneyIntent('redirect-a', 'GATED_REDIRECT_A');
      await page.evaluate((base: string) => { fetch(`${base}/api/gated-src`).catch(() => undefined); }, origin);
      await expect.poll(() => hits['/api/gated-src'] ?? 0, { timeout: 5_000 }).toBe(1); // source effect under A
      ctx.network.endJourneyIntent('redirect-a');
      // Wait for the bounded navigation settlement so orphan assertions are
      // deterministic (the in-flight gated request caps the window).
      await expect.poll(() => {
        try { return events().includes('NAVIGATION_GENERATION_SETTLED'); } catch { return false; }
      }, { timeout: 6_000 }).toBe(true);
      expect(ctx.network.activeGenerations?.() ?? []).toEqual([]); // no orphan from A
      // 5) generation B opens.
      ctx.network.beginJourneyIntent('redirect-b', 'GATED_REDIRECT_B');
      expect((ctx.network.activeGenerations?.() ?? []).length).toBe(1);
      // 6) release the follow-up while B is open.
      releaseGated();
      await expect.poll(() => {
        try {
          return events()
            .split('\n')
            .filter(Boolean)
            .map((line) => JSON.parse(line) as { message?: string; data?: Record<string, unknown> })
            .filter((event) => event.message === 'SEMANTIC_ADMISSION_REFUSED'
              && event.data?.transport === 'CDP_FETCH'
              && event.data?.admissionCode === 'ADMISSION_GENERATION_CLOSED').length;
        } catch { return 0; }
      }, { timeout: 5_000 }).toBeGreaterThanOrEqual(1);
      // The follow-up could not borrow B, revive A, become passive, or fall
      // back to host-only: categorical CLOSED refusal + ZERO redirected
      // upstream effect.
      expect(hits['/api/gated-dst'] ?? 0).toBe(0);
      ctx.network.endJourneyIntent('redirect-b');
      expect(ctx.network.activeGenerations?.() ?? []).toEqual([]); // teardown: no orphans
    } finally {
      releaseGated();
      if (ctx !== null) await ctx.close();
      await new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); });
    }
  });
});
