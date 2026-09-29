import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
// The gate's diagnostic boundary is plain ESM so it can be exercised directly
// rather than inferred from a whole gate run. R-11 added `bin/lib/gate-receipt.d.mts`,
// so it is now typed and `parseSafeDetails` correctly returns `null` when no
// structured child receipt is present.
import { parseCounts, parseSafeDetails, type GateReceiptSafeDetails } from '../../bin/lib/gate-receipt.mjs';
import { topologyReceiptDigest } from '../../bin/lib/topology-gate.mjs';

const root = process.cwd();

/**
 * These cases all supply a structured receipt, so details MUST be present.
 * Asserting that explicitly is the point rather than an inconvenience: a null
 * here would mean the gate silently contributed no diagnostics, which is the
 * exact regression this suite guards.
 */
function requireDetails(value: GateReceiptSafeDetails | null): GateReceiptSafeDetails {
  expect(value).not.toBeNull();
  return value as GateReceiptSafeDetails;
}

function syntheticReceiptLine(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schemaVersion: 'nightwatch.synthetic-campaign.v1',
    fileCount: 12,
    total: 128,
    passed: 121,
    skipped: null,
    didNotRun: 5,
    failed: 2,
    failedLocations: ['tests/unit/eligibilityCensus.test.ts:211', 'tests/unit/l6Containment.test.ts:10'],
    deepContainmentLane: 'NOT_EXERCISED_BWRAP_UNAVAILABLE',
    result: 'TEST_FAILURE',
    ...overrides,
  });
}

test.describe('synthetic campaign manifest', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'config/synthetic-campaign.v1.json'), 'utf8'));

  test('is a versioned data-only manifest with a serial zero-retry contract', () => {
    expect(manifest.schemaVersion).toBe('nightwatch.synthetic-campaign.v1');
    expect(manifest.execution).toMatchObject({ project: 'nightwatch', workers: 1, retries: 0, serial: true });
    // Retries would let a nondeterministic failure pass; parallel workers would
    // let the namespace and port-binding suites interfere with each other.
  });

  test('every declared file is a tracked test path that exists, with no duplicates', () => {
    expect(Array.isArray(manifest.files)).toBe(true);
    expect(manifest.files.length).toBeGreaterThan(0);
    expect(new Set(manifest.files).size).toBe(manifest.files.length);
    for (const file of manifest.files) {
      expect(file).toMatch(/^tests\/(?:unit|smoke)\/[A-Za-z0-9._/-]+\.test\.ts$/);
      expect(fs.existsSync(path.join(root, file))).toBe(true);
    }
  });

  test('carries the adversarial matrices the campaign exists to run', () => {
    // Membership, not mere string presence: silently dropping either matrix out
    // of the required campaign is the regression this asserts against.
    expect(manifest.files).toContain('tests/unit/workspaceIsolation.test.ts');
    expect(manifest.files).toContain('tests/unit/l6Containment.test.ts');
  });

  test('carries every campaign certification suite that claims to be certified', () => {
    // C-11 lesson 5.3: a suite absent from every manifest does not run in the
    // authoritative gate, and a certification claim resting on it is empty.
    // Membership, not string presence — dropping a line from the manifest must
    // fail here rather than quietly retire the evidence.
    for (const suite of [
      'tests/unit/c02bProtoLexer.test.ts',
      'tests/unit/c02bProtoSurface.test.ts',
      'tests/unit/c02bProtoCorroboration.test.ts',
      'tests/unit/c03GoRegistration.test.ts',
      'tests/unit/c03GrpcTopology.test.ts',
      'tests/unit/c04FrontendConsumer.test.ts',
      'tests/unit/c04FrontendGraph.test.ts',
      'tests/unit/c15bSystemMap.test.ts',
      'tests/unit/c15bControlCenterAuthority.test.ts',
    ]) expect(manifest.files).toContain(suite);
  });
});

test.describe('quality-gate bounded diagnostics', () => {
  test('a synthetic receipt contributes counts, which a raw Playwright tail cannot', () => {
    const counts = parseCounts(syntheticReceiptLine());
    expect(counts).toEqual({ total: 128, passed: 121, skipped: null, didNotRun: 5, failed: 2 });
  });

  test('didNotRun is its own bucket and is never folded into skipped', () => {
    // The defect this encodes: a serial suite whose first case fails cascades
    // the rest into "did not run", which the old aggregate parser could not
    // see. 121 + 2 reconciled against nothing, and five cases vanished.
    const counts = parseCounts(syntheticReceiptLine());
    expect(counts.skipped).toBeNull();
    expect(counts.didNotRun).toBe(5);
    expect((counts.passed ?? 0) + (counts.failed ?? 0) + (counts.didNotRun ?? 0)).toBe(counts.total);
  });

  test('a total absent from the child receipt is reconstructed across all four buckets', () => {
    const counts = parseCounts(syntheticReceiptLine({ total: null, skipped: 3 }));
    expect(counts.total).toBe(121 + 3 + 5 + 2);
  });

  test('plain Playwright text still yields didNotRun when no structured receipt exists', () => {
    const counts = parseCounts('  2 failed\n  5 did not run\n  121 passed (1.0m)\n');
    expect(counts.failed).toBe(2);
    expect(counts.didNotRun).toBe(5);
    expect(counts.passed).toBe(121);
  });

  test('failing test locations reach the receipt, bounded and categorical', () => {
    const details = requireDetails(parseSafeDetails(syntheticReceiptLine()));
    expect(details.failedLocations).toEqual(['tests/unit/eligibilityCensus.test.ts:211', 'tests/unit/l6Containment.test.ts:10']);
    expect(details.deepContainmentLane).toBe('NOT_EXERCISED_BWRAP_UNAVAILABLE');
  });

  test('the semantic-compatibility schema keeps working and reports no lane', () => {
    const line = JSON.stringify({ schemaVersion: 'nightwatch.semantic-compatibility.v1', total: 1950, passed: 1937, skipped: 13, failed: 0, failedLocations: [] });
    expect(parseCounts(line)).toEqual({ total: 1950, passed: 1937, skipped: 13, didNotRun: null, failed: 0 });
    expect(parseSafeDetails(line)).toEqual({
      failedLocations: [],
      skipPolicy: { result: 'SKIP_REPORT_MISSING', skipped: null, undeclared: null },
    });
  });

  test('skip-policy receipts preserve only bounded counts, known outcomes, and safe locations', () => {
    const semantic = requireDetails(parseSafeDetails(JSON.stringify({
      schemaVersion: 'nightwatch.semantic-compatibility.v1',
      skipped: 2,
      skipPolicy: {
        result: 'UNDECLARED_SKIP',
        declared: 1,
        undeclared: 1,
        undeclaredSkips: ['tests/unit/realSourceCanary.test.ts:102', '/private/customer/path:8', 'tests/unit/../../etc/passwd:1'],
        reason: 'sk-live-DO-NOT-EMIT',
      },
    })));
    expect(semantic.skipPolicy).toEqual({
      result: 'UNDECLARED_SKIP',
      skipped: 2,
      undeclared: 1,
      declared: 1,
      undeclaredSkips: ['tests/unit/realSourceCanary.test.ts:102'],
    });

    const shard = requireDetails(parseSafeDetails(JSON.stringify({
      schemaVersion: 'nightwatch.shard-run-receipt.v1',
      totals: { planned: 26, passed: 25, skipped: 1, didNotRun: 0, failed: 0 },
      shardResults: [
        { skipPolicy: { result: 'PASS', skipped: 1, undeclared: 0 } },
        { skipPolicy: { result: 'SKIP_REPORT_MISSING', skipped: null, undeclared: null } },
      ],
    })));
    expect(shard.skipPolicy).toEqual({
      result: 'SKIP_REPORT_MISSING',
      skipped: null,
      undeclared: null,
    });
    expect(parseCounts(JSON.stringify({
      schemaVersion: 'nightwatch.shard-run-receipt.v1',
      totals: { planned: 26, passed: 25, skipped: 1, didNotRun: 0, failed: 0 },
    }))).toEqual({ total: 26, passed: 25, skipped: 1, didNotRun: 0, failed: 0 });
  });

  test('topology details retain only the runner class, envelope and known unexercised absences', () => {
    const details = requireDetails(parseSafeDetails(JSON.stringify({
      schemaVersion: 'nightwatch.gate-topology-receipt.v1',
      runnerTopologyClass: 'PROVEN_DEGRADED',
      ciClaim: {
        runnerTopologyClass: 'PROVEN_DEGRADED',
        runnerTopologyEnvelope: 'BWRAP_UNAVAILABLE_DEGRADED',
        unexercisedAbsences: ['chrome', 'sibling-root'],
      },
      dynamic: {
        envelope: 'BWRAP_UNAVAILABLE_DEGRADED',
        entries: [
          { absence: 'chrome', notExercised: 'BWRAP_UNAVAILABLE' },
          { absence: 'sibling-root', notExercised: 'BWRAP_UNAVAILABLE' },
        ],
      },
      hostPath: '/private/owner/worktree',
    })));
    expect(details).toEqual({
      failedLocations: [],
      runnerTopologyClass: 'PROVEN_DEGRADED',
      topologyEnvelope: 'BWRAP_UNAVAILABLE_DEGRADED',
      unexercisedAbsences: ['chrome', 'sibling-root'],
      // RV-09: a degraded class is honest but NEVER certifying.
      topologyCertifying: false,
    });

    // RV-09: the receipt's digest and bound commit reach the gate details ONLY
    // when the digest re-derives from the body it claims to describe.
    const body = {
      schemaVersion: 'nightwatch.gate-topology-receipt.v1',
      gitHead: 'c'.repeat(40),
      runnerTopologyClass: 'PROVEN',
      ciClaim: { runnerTopologyClass: 'PROVEN', runnerTopologyEnvelope: 'BUBBLEWRAP', unexercisedAbsences: [], certifying: true },
      dynamic: { envelope: 'BUBBLEWRAP', entries: [] },
    };
    const digest = topologyReceiptDigest(body, (text: string) => createHash('sha256').update(text, 'utf8').digest('hex'));
    const bound = requireDetails(parseSafeDetails(JSON.stringify({ ...body, receiptDigest: digest })));
    expect(bound).toMatchObject({ runnerTopologyClass: 'PROVEN', topologyCertifying: true, topologyGitHead: 'c'.repeat(40), topologyReceiptDigest: digest });
    const forged = requireDetails(parseSafeDetails(JSON.stringify({ ...body, gitHead: 'd'.repeat(40), receiptDigest: digest })));
    expect(forged.topologyReceiptDigest).toBeUndefined();
    const malformedDigest = requireDetails(parseSafeDetails(JSON.stringify({ ...body, receiptDigest: 'sha256:short' })));
    expect(malformedDigest.topologyReceiptDigest).toBeUndefined();

    const invalid = requireDetails(parseSafeDetails(JSON.stringify({
      schemaVersion: 'nightwatch.gate-topology-receipt.v1',
      runnerTopologyClass: 'SECRET',
      ciClaim: { runnerTopologyClass: 'SECRET', runnerTopologyEnvelope: 'unknown', unexercisedAbsences: ['/private/home'] },
      dynamic: { envelope: 'unknown', entries: [{ absence: '/private/home', notExercised: 'secret' }] },
    })));
    expect(invalid.runnerTopologyClass).toBeUndefined();
    expect(invalid.topologyEnvelope).toBeUndefined();
    expect(invalid.unexercisedAbsences).toBeUndefined();

    const falseProof = requireDetails(parseSafeDetails(JSON.stringify({
      schemaVersion: 'nightwatch.gate-topology-receipt.v1',
      runnerTopologyClass: 'PROVEN',
      ciClaim: {
        runnerTopologyClass: 'PROVEN',
        runnerTopologyEnvelope: 'BUBBLEWRAP',
        unexercisedAbsences: [],
      },
      dynamic: { envelope: 'BUBBLEWRAP', entries: [{ absence: 'chrome', notExercised: 'BWRAP_UNAVAILABLE' }] },
    })));
    expect(falseProof.runnerTopologyClass).toBeUndefined();
  });

  test('anything that is not an allowlisted location is dropped, not redacted', () => {
    // Allowlisting is the contract: a location must be a tracked tests/** path
    // plus a line number. Absolute host paths, traversal, source text and
    // secret-shaped strings have no representation and cannot leak by accident.
    const details = requireDetails(parseSafeDetails(syntheticReceiptLine({
      failedLocations: [
        'tests/unit/campaign.test.ts:12',
        '/home/someone/secret/path.test.ts:1',
        'tests/unit/../../etc/passwd:1',
        'expected "sk-live-AKIAEXAMPLE" to equal "redacted"',
        'src/core/oops/l6.ts:511',
        'tests/unit/campaign.test.ts',
        42,
        null,
      ],
    })));
    expect(details.failedLocations).toEqual(['tests/unit/campaign.test.ts:12']);
  });

  test('the location list is bounded so a mass failure cannot flood the receipt', () => {
    const many = Array.from({ length: 200 }, (_, index) => `tests/unit/campaign.test.ts:${index + 1}`);
    expect(requireDetails(parseSafeDetails(syntheticReceiptLine({ failedLocations: many }))).failedLocations).toHaveLength(16);
  });

  test('a malformed containment lane is omitted rather than passed through', () => {
    for (const lane of ['not an enum', 'lower_case', '', 'A'.repeat(200), 12, null]) {
      expect(requireDetails(parseSafeDetails(syntheticReceiptLine({ deepContainmentLane: lane }))).deepContainmentLane).toBeUndefined();
    }
  });

  test('arbitrary child output alone contributes no details at all', () => {
    // Without a structured receipt the gate must stay silent rather than scrape
    // free text, which is what kept raw stderr out of receipts before.
    expect(parseSafeDetails('Error: connect ECONNREFUSED 10.0.0.1:443\n  at Object.<anonymous>\n')).toBeNull();
    expect(parseSafeDetails(JSON.stringify({ schemaVersion: 'some.other.schema.v1', failedLocations: ['tests/unit/campaign.test.ts:1'] }))).toBeNull();
  });

  test('the last structured receipt wins when a child emits several', () => {
    const output = `${syntheticReceiptLine({ failed: 9 })}\n${syntheticReceiptLine({ failed: 2 })}\n`;
    expect(parseCounts(output).failed).toBe(2);
  });
});
