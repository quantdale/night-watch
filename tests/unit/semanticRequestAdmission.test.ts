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
import path from 'node:path';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import { decideBrowserHttp } from '../../src/core/safety/policyConsumers';
import type { EnvironmentConfig } from '../../src/core/environment/types';

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
});
