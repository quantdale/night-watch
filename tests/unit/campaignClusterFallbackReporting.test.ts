// ---------------------------------------------------------------------------
// D-15 (M10 11.3) — the campaign clustering fallback must REPORT, not drop.
//
// `recomputeClusters` built its semantic observations inside a guard that could
// never throw, and its "fall back to the protocol bucket" push happened AFTER
// `protocolClusters` had already been computed from that same array. The branch
// was therefore doubly dead: unreachable, and useless if reached. A failed
// semantic observation left both paths and vanished from the campaign — no
// cluster, no dossier, no reason on the morning brief.
//
// The fix moves the fallible derivation inside the guard, builds the protocol
// bucket after it, and records every fallback as a Nightwatch internal defect
// carrying the observation's own run id. This suite pins all three properties
// and proves the FAILURE PATH is reachable, which is the only thing that makes
// a fallback honest.
//
// Synthetic values only: no network, no browser, no real product.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

import { semanticContractIdentityFromInvariantId } from '../../src/oracles/semantic/cluster';

const REPO_ROOT = path.resolve(__dirname, '../..');
const ORCHESTRATOR_PATH = path.join(REPO_ROOT, 'src/core/campaign/orchestrator.ts');

/** CODE only, so a prose record of the defect cannot satisfy a structural pin. */
function orchestratorCode(): string {
  return fs
    .readFileSync(ORCHESTRATOR_PATH, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

test.describe('D-15 — a failed semantic observation is reported, never dropped', () => {
  test('the fallback guard wraps the derivation that can actually fail', () => {
    const source = orchestratorCode();
    // Scope every assertion to `recomputeClusters` itself: an unrelated
    // derivation elsewhere in the class is not the fallback under test, and a
    // whole-file scan would conflate them.
    const methodStart = source.indexOf('private recomputeClusters()');
    expect(methodStart, 'recomputeClusters is gone').toBeGreaterThan(-1);
    const methodEnd = source.indexOf('\n  private ', methodStart);
    const method = source.slice(methodStart, methodEnd > methodStart ? methodEnd : undefined);

    const derivationAt = method.indexOf('semanticContractIdentityFromInvariantId({');
    const pushAt = method.indexOf('semanticObservations.push({');
    expect(derivationAt, 'the contract-identity derivation is gone from the clustering path').toBeGreaterThan(-1);
    expect(pushAt, 'the semantic observation push is gone').toBeGreaterThan(-1);
    // Exactly ONE derivation lives in the clustering path, and it is the one
    // inside the guard — a second, unguarded derivation would be the old defect
    // in a new shape.
    expect(method.split('semanticContractIdentityFromInvariantId(').length - 1, 'the clustering path must derive the contract identity exactly once, inside the guard').toBe(1);
    // The NEAREST enclosing guard, found by searching backwards from the call:
    // an earlier `try` in another method is not the one under test.
    const tryAt = method.lastIndexOf('try {', derivationAt);
    const catchAt = method.indexOf('} catch (error) {', derivationAt);
    expect(tryAt, 'the semantic-identity guard is gone').toBeGreaterThan(-1);
    expect(tryAt, 'the derivation must run INSIDE the guard').toBeLessThan(derivationAt);
    expect(catchAt, 'the guard never closes after the derivation').toBeGreaterThan(derivationAt);
    expect(catchAt, 'the push must be INSIDE the guard').toBeGreaterThan(pushAt);
    expect(derivationAt, 'the derivation must run BEFORE the push inside the guard').toBeLessThan(pushAt);
    // The guard's fallback is the bucket push, and it lives in that catch.
    const fallbackAt = method.indexOf('protocolObservations.push(obs);');
    expect(fallbackAt).toBeGreaterThan(catchAt);
  });

  test('the protocol bucket is clustered AFTER the fallback pushes, so the fallback is real', () => {
    const source = orchestratorCode();
    const pushAt = source.indexOf('protocolObservations.push(obs);');
    const clusterAt = source.indexOf('suppressDuplicateClusters(clusterAnomalies(protocolObservations), 100)');
    expect(pushAt).toBeGreaterThan(-1);
    expect(clusterAt).toBeGreaterThan(-1);
    expect(pushAt, 'the fallback push must precede the protocol clustering, or the observation is dropped').toBeLessThan(clusterAt);
    // The stale comment that claimed the fallback "handled itself" is gone.
    expect(source).not.toContain('already handled above by not pushing');
  });

  test('every fallback is reported on the morning brief with the observation identity', () => {
    const source = orchestratorCode();
    const reportAt = source.indexOf('semanticIdentityFailures.push(');
    expect(reportAt, 'a semantic-identity fallback is recorded nowhere').toBeGreaterThan(-1);
    expect(source.slice(reportAt, reportAt + 400)).toContain('NIGHTWATCH_INTERNAL_DEFECT:SEMANTIC_CLUSTER_IDENTITY_FALLBACK');
    expect(source.slice(reportAt, reportAt + 400)).toContain('${obs.runId}');
    // And the recorded failures reach the reporting channel rather than a local
    // variable nobody reads.
    const publishAt = source.indexOf('for (const failure of semanticIdentityFailures)');
    expect(publishAt).toBeGreaterThan(reportAt);
    expect(source.slice(publishAt, publishAt + 220)).toContain('this.nightwatchIssues.push(failure)');
  });

  test('the reporting channel is the durable one the campaign already publishes', () => {
    // nightwatchInternalIssues is a CampaignMorningBrief field, so a reported
    // defect is operator-visible rather than a silent counter.
    const source = orchestratorCode();
    expect(source).toContain('nightwatchInternalIssues: this.nightwatchIssues');
    const brief = fs.readFileSync(path.join(REPO_ROOT, 'src/core/campaign/brief.ts'), 'utf8');
    expect(brief).toContain('nightwatchInternalIssues');
  });

  test('a malformed semantic identity really does fail, so the guard is reachable', () => {
    // The reachable failure, proven directly against the authority the guard
    // calls: a malformed invariant-definition identity is refused, which is
    // exactly the case the old guard pretended to catch.
    const base = {
      expectationId: 'expectation/synthetic-d15',
      targetId: 'target/synthetic-d15',
      sourceProvenance: { repoId: 'repo:synthetic', derivationVersion: 'v1' },
    };
    const good = semanticContractIdentityFromInvariantId({
      ...base,
      invariantDefinitionId: `inv:sha256:${'a'.repeat(24)}`,
    });
    expect(good).toMatch(/^sci:sha256:[0-9a-f]{24}$/);
    // Every one of these shapes is what the derivation refuses, so the guard
    // has a real failure to fall back from.
    for (const invariantDefinitionId of [
      'inv:not-a-digest',
      `inv:sha256:${'a'.repeat(23)}`,
      `inv:sha256:${'a'.repeat(25)}`,
      'not-prefixed',
      '',
    ]) {
      expect(() => semanticContractIdentityFromInvariantId({ ...base, invariantDefinitionId }), invariantDefinitionId).toThrow();
    }
    // A privacy-shaped identity is refused rather than clustered.
    expect(() => semanticContractIdentityFromInvariantId({
      ...base,
      invariantDefinitionId: `inv:sha256:${'b'.repeat(24)}`,
      sourceProvenance: { ...base.sourceProvenance, evidenceDigest: 'ev:sha256:not-a-digest' },
    })).toThrow('SEMANTIC_CLUSTER_EVIDENCE_DIGEST_INVALID');
  });
});
