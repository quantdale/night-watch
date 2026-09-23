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
  test('A + C: unknown API traffic is relabeled PASSIVE for navigation and no-intent, then continued', () => {
    const observer = read('src/browser/observers/networkObserver.ts');

    // The exact defect ternary: navigation kinds OR null intent => PASSIVE.
    expect(observer).toMatch(
      /action\?\.actionType === 'NAVIGATE_APPROVED_ROUTE' \|\| action\?\.actionType === 'RETURN_TO_ANCHOR' \|\| action === null/,
    );
    expect(observer).toContain("'PASSIVE_UNKNOWN_OBSERVED'");

    // Only two dispositions ever abort; PASSIVE is not among them.
    expect(observer).toMatch(/endpointClassification === 'KNOWN_MUTATION'/);
    expect(observer).toMatch(/semanticObservation\?\.disposition === 'ACTION_CAUSED_UNKNOWN'/);
    expect(observer).not.toMatch(/disposition === 'PASSIVE_UNKNOWN_OBSERVED'\) \{\s*\n\s*await route\.abort/);

    // The allow branch continues every allowed-host request.
    expect(observer).toMatch(/if \(decision\.verdict === 'allow'\) \{[\s\S]{0,2000}await route\.continue\(\);/);

    // Live fixtures ship startup/navigation unknowns that rely on this path.
    const fixture = read('src/browser/fixtures/fixtureServer.ts');
    expect(fixture).toContain("fetch('/api/invoices')");
    expect(fixture).toContain("fetch('/api/billing-groups')");
    const journeyFixture = read('src/browser/fixtures/journeyFixtureServer.ts');
    expect(journeyFixture).toContain('/m/ripple/passive-bootstrap');
    // The journey-level counterpart asserts live: passive unknown counts > 0
    // in tests/unit/journeyEngine.test.ts ("distinguishes passive UNKNOWN").
    const journeyEngineTest = read('tests/unit/journeyEngine.test.ts');
    expect(journeyEngineTest).toMatch(/passiveUnknownCount\)\.toBeGreaterThan\(0\)/);
  });

  test('B: the fixed 250 ms window is the engine causality boundary', () => {
    const engine = read('src/core/journeys/engine.ts');
    expect(engine).toMatch(/const ACTION_SETTLE_MS = 250;/);
    const sleepAt = engine.indexOf('await sleep(ACTION_SETTLE_MS);');
    // The click-path endJourneyIntent is the occurrence AFTER the sleep (an
    // earlier navigation-step end exists and is not the defect site).
    const endAt = engine.indexOf('ctx.network.endJourneyIntent(step.stepId);', sleepAt);
    const requiredNetworkAt = engine.indexOf('waitForRequiredNetwork(ctx, step', endAt);
    const settleBarrierAt = engine.indexOf('waitForNetworkObservationSettle(', requiredNetworkAt);
    expect(sleepAt).toBeGreaterThan(0);
    expect(endAt).toBeGreaterThan(sleepAt);
    // Defect: intent (causality) closes BEFORE later settlement work, so a
    // request landing after the sleep but before required-network settlement
    // observes action === null and becomes PASSIVE (class A relabel).
    expect(requiredNetworkAt).toBeGreaterThan(endAt);
    expect(settleBarrierAt).toBeGreaterThan(endAt);
    // Exploration holds intent across settlement instead — the two causality
    // models are asymmetric (census F5).
    const exploration = read('src/products/ripple/explorationRuntime.ts');
    const explorationEnd = exploration.indexOf('opts.network.endJourneyIntent(action.actionId);');
    const explorationSettle = exploration.indexOf('EXPECTED_READ_NOT_SETTLED');
    expect(explorationEnd).toBeGreaterThan(0);
    expect(explorationSettle).toBeGreaterThan(0);
    expect(explorationEnd).toBeGreaterThan(explorationSettle);
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

  test('C: registry semantics return rule identity only (privacy floor the fix must keep)', () => {
    // Guard rail for the implementation: admission evidence may carry rule
    // identity, never concrete path parameters (M3/M4 privacy contract).
    const endpointSemantics = read('src/core/safety/endpointSemantics.ts');
    expect(endpointSemantics).toMatch(/URL paths and query values are never/);
  });
});
