import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
// The gate's diagnostic boundary is plain ESM so it can be exercised directly
// rather than inferred from a whole gate run. R-11 added `bin/lib/gate-receipt.d.mts`,
// so it is now typed and `parseSafeDetails` correctly returns `null` when no
// structured child receipt is present.
import { parseCounts, parseSafeDetails, type GateReceiptSafeDetails } from '../../bin/lib/gate-receipt.mjs';

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
    expect(parseSafeDetails(line)).toEqual({ failedLocations: [] });
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
