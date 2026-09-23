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

  test('D: the CDP Fetch guard is host-only — URL without method, continue on allow', () => {
    const guard = read('src/browser/network/fetchGuard.ts');
    // The pause handler destructures ONLY the URL: method/path/semantic are
    // never consulted, so a same-host redirect follow-up to an unknown or
    // mutation route continues on host authority alone.
    expect(guard).toMatch(/Fetch\.requestPaused', \(p: \{ requestId: string; request: \{ url: string \} \}\)/);
    expect(guard).not.toMatch(/request: \{ url: string; method/);
    const allowCheckAt = guard.indexOf("decision.verdict === 'allow'");
    const continueAt = guard.indexOf('Fetch.continueRequest', allowCheckAt);
    expect(allowCheckAt).toBeGreaterThan(0);
    expect(continueAt).toBeGreaterThan(allowCheckAt);
    // The handler never reads the request METHOD (only the evidence label
    // `method: 'GUARD'` exists), so no method/path semantics reach L0.
    expect(guard).not.toContain('request.method');
    expect(guard).not.toContain('p.request.method');
    // Playwright's route does not re-intercept redirect follow-ups (stated
    // header contract), which is why the guard alone governs redirects.
    expect(guard).toMatch(/does NOT re-intercept redirect follow-ups/);

    // Behavioral proof: host policy has no path or method authority — an
    // unknown same-host mutation-shaped path is ALLOWED at this layer.
    const origin = 'http://127.0.0.1:45999';
    const env = fixtureEnvironment(origin);
    const policy = new OutboundPolicy(env);
    expect(decideBrowserHttp(policy, `${origin}/m/ripple/action-unknown`).verdict).toBe('allow');
    expect(decideBrowserHttp(policy, `${origin}/m/blue/billing/v1/billinggroups`).verdict).toBe('allow');
  });

  test('file header: baseline provenance is recorded', () => {
    const self = read('tests/unit/semanticRequestAdmission.test.ts');
    expect(self).toContain('NW-AUD-020');
    // Class D (host-only CDP fallback) is pinned here until Step 4 lands;
    // classes A, B, C are inverted above once wiring landed.
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
});
