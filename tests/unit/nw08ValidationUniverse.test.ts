// NW-08 — the validation universe must be mechanically complete.
//
// The gate's required lanes select from versioned manifests, and the
// data-only inventory validated those declarations against each other — never
// against what exists on disk. Measured at this campaign: 341 tracked root
// test/smoke files, 227 selected by required lanes, 114 in no lane at all,
// including safety-relevant suites. A newly added test joined the repository
// silently and every gate stayed green without it.
//
// The judgement is pure, so these cases are fixtures rather than repositories:
// every failure path is exercised on synthetic inputs, and the last case
// asserts the LIVE declaration is complete.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import {
  VALIDATION_EXCLUSION_CLASSES,
  VALIDATION_UNIVERSE_SCHEMA,
  classifyValidationUniverse,
  validationUniverseDigest,
} from '../../bin/lib/validation-universe.mjs';

const ROOT = path.resolve(__dirname, '../..');

interface Judgement {
  readonly ok: boolean;
  readonly digest: string;
  readonly counts: { readonly discovered: number; readonly authoritativeGate: number; readonly classified: number; readonly unclassified: number; readonly byClass: Record<string, number> };
  readonly errors: readonly { readonly code: string; readonly detail: string }[];
}

function codes(judgement: Judgement): string[] {
  return judgement.errors.map((error) => error.code);
}

/** A minimal complete universe: one gate-selected file, one classified file. */
function fixture(overrides: {
  discovered?: readonly string[];
  gateSelected?: readonly string[];
  classes?: Record<string, { reason?: string; evidenceLane?: string; files?: readonly string[] }>;
  digest?: string | undefined;
  schemaVersion?: string;
} = {}): Judgement {
  const discovered = overrides.discovered ?? ['tests/unit/inGate.test.ts', 'tests/unit/excluded.test.ts'];
  const gateSelected = overrides.gateSelected ?? ['tests/unit/inGate.test.ts'];
  const classes = overrides.classes ?? {
    FULL_REGRESSION: {
      reason: 'Offline suites the full canonical regression executes.',
      evidenceLane: 'npm test',
      files: ['tests/unit/excluded.test.ts'],
    },
  };
  const byClass = Object.fromEntries(Object.entries(classes).map(([name, entry]) => [name, [...(entry.files ?? [])]]));
  const digest = 'digest' in overrides ? overrides.digest : validationUniverseDigest({ discovered, gateSelected, byClass });
  const declaration: Record<string, unknown> = {
    schemaVersion: overrides.schemaVersion ?? VALIDATION_UNIVERSE_SCHEMA,
    classes,
  };
  if (digest !== undefined) declaration.inventoryDigest = digest;
  return classifyValidationUniverse({ discovered, gateSelected, declaration }) as Judgement;
}

test.describe('NW-08 — every discovered test belongs to exactly one class', () => {
  test('a complete universe passes and reports exact counts', () => {
    const judgement = fixture();
    expect(judgement.errors, JSON.stringify(judgement.errors)).toEqual([]);
    expect(judgement.ok).toBe(true);
    expect(judgement.counts.discovered).toBe(2);
    expect(judgement.counts.authoritativeGate).toBe(1);
    expect(judgement.counts.classified).toBe(1);
    expect(judgement.counts.unclassified).toBe(0);
    expect(judgement.counts.byClass).toEqual({ FULL_REGRESSION: 1 });
  });

  test('a NEW test in no lane and no class fails', () => {
    // The defect, reduced to one case: a file lands and nothing notices.
    const judgement = fixture({
      discovered: ['tests/unit/inGate.test.ts', 'tests/unit/excluded.test.ts', 'tests/unit/brandNew.test.ts'],
      digest: undefined,
    });
    expect(codes(judgement)).toContain('VALIDATION_UNIVERSE_UNCLASSIFIED');
    expect(judgement.errors.find((error) => error.code === 'VALIDATION_UNIVERSE_UNCLASSIFIED')?.detail)
      .toBe('tests/unit/brandNew.test.ts');
    expect(judgement.ok).toBe(false);
  });

  test('a file in two classes fails rather than picking one', () => {
    const judgement = fixture({
      classes: {
        FULL_REGRESSION: { reason: 'Offline suites the regression executes.', evidenceLane: 'npm test', files: ['tests/unit/excluded.test.ts'] },
        MANUAL_OWNER: { reason: 'Owner-run harnesses under explicit authorization.', evidenceLane: 'manual', files: ['tests/unit/excluded.test.ts'] },
      },
      digest: undefined,
    });
    expect(codes(judgement)).toContain('VALIDATION_UNIVERSE_DOUBLE_CLASSIFIED');
  });

  test('a declared file that no longer exists fails, so a deleted test cannot linger', () => {
    const judgement = fixture({
      classes: {
        FULL_REGRESSION: { reason: 'Offline suites the regression executes.', evidenceLane: 'npm test', files: ['tests/unit/excluded.test.ts', 'tests/unit/deleted.test.ts'] },
      },
      digest: undefined,
    });
    expect(codes(judgement)).toContain('VALIDATION_UNIVERSE_DECLARED_MISSING_FILE');
  });

  test('a lane selecting a file that does not exist fails, so a stale manifest cannot pass vacuously', () => {
    const judgement = fixture({
      gateSelected: ['tests/unit/inGate.test.ts', 'tests/unit/goneFromDisk.test.ts'],
      digest: undefined,
    });
    expect(codes(judgement)).toContain('VALIDATION_UNIVERSE_GATE_SELECTS_MISSING_FILE');
  });

  test('claiming an excluded class for a file the gate runs fails', () => {
    // Otherwise the declaration would tell a reader the wrong lane covers it.
    const judgement = fixture({
      classes: {
        FULL_REGRESSION: { reason: 'Offline suites the regression executes.', evidenceLane: 'npm test', files: ['tests/unit/excluded.test.ts', 'tests/unit/inGate.test.ts'] },
      },
      digest: undefined,
    });
    expect(codes(judgement)).toContain('VALIDATION_UNIVERSE_GATE_CONTRADICTION');
  });

  test('a class with no reason, no evidence lane, or no members fails', () => {
    const noReason = fixture({
      classes: { FULL_REGRESSION: { evidenceLane: 'npm test', files: ['tests/unit/excluded.test.ts'] } },
      digest: undefined,
    });
    expect(codes(noReason)).toContain('VALIDATION_UNIVERSE_REASON_MISSING');

    const noLane = fixture({
      classes: { FULL_REGRESSION: { reason: 'Offline suites the regression executes.', files: ['tests/unit/excluded.test.ts'] } },
      digest: undefined,
    });
    expect(codes(noLane)).toContain('VALIDATION_UNIVERSE_EVIDENCE_LANE_MISSING');

    // A zero-step class is a class that exists only on paper.
    const empty = fixture({
      discovered: ['tests/unit/inGate.test.ts'],
      gateSelected: ['tests/unit/inGate.test.ts'],
      classes: { FULL_REGRESSION: { reason: 'Offline suites the regression executes.', evidenceLane: 'npm test', files: [] } },
      digest: undefined,
    });
    expect(codes(empty)).toContain('VALIDATION_UNIVERSE_ZERO_MEMBER_CLASS');
  });

  test('an unknown class name fails rather than being accepted as a new lane', () => {
    const judgement = fixture({
      classes: {
        FULL_REGRESSION: { reason: 'Offline suites the regression executes.', evidenceLane: 'npm test', files: ['tests/unit/excluded.test.ts'] },
        SOMEONES_NEW_IDEA: { reason: 'Invented in a hurry, covering nothing.', evidenceLane: 'none', files: ['tests/unit/excluded.test.ts'] },
      },
      digest: undefined,
    });
    expect(codes(judgement)).toContain('VALIDATION_UNIVERSE_CLASS_UNKNOWN');
    expect(VALIDATION_EXCLUSION_CLASSES).not.toContain('SOMEONES_NEW_IDEA');
    // AUTHORITATIVE_GATE is derived, never declarable: a declaration must not
    // be able to claim gate coverage a lane does not provide.
    expect(VALIDATION_EXCLUSION_CLASSES).not.toContain('AUTHORITATIVE_GATE');
  });

  test('a stale or absent digest fails', () => {
    expect(codes(fixture({ digest: 'sha256:000000000000000000000000' }))).toContain('VALIDATION_UNIVERSE_DIGEST_DRIFT');
    expect(codes(fixture({ digest: undefined }))).toContain('VALIDATION_UNIVERSE_DIGEST_ABSENT');
  });

  test('an unsupported declaration schema fails closed', () => {
    expect(codes(fixture({ schemaVersion: 'nightwatch.validation-universe.v0', digest: undefined })))
      .toContain('VALIDATION_UNIVERSE_SCHEMA_UNSUPPORTED');
  });

  test('the digest changes when what exists, what the gate runs, or the classification changes', () => {
    const base = { discovered: ['a', 'b'], gateSelected: ['a'], byClass: { FULL_REGRESSION: ['b'] } };
    const original = validationUniverseDigest(base);
    expect(validationUniverseDigest({ ...base, discovered: ['a', 'b', 'c'] })).not.toBe(original);
    expect(validationUniverseDigest({ ...base, gateSelected: ['a', 'b'] })).not.toBe(original);
    expect(validationUniverseDigest({ ...base, byClass: { MANUAL_OWNER: ['b'] } })).not.toBe(original);
    // Order and duplication are not signal.
    expect(validationUniverseDigest({ discovered: ['b', 'a', 'a'], gateSelected: ['a'], byClass: { FULL_REGRESSION: ['b'] } })).toBe(original);
  });
});

test.describe('NW-08 — the live declaration is complete', () => {
  test('the repository has zero unclassified tests and a pinned digest', () => {
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin/validation-universe.mjs'), '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    expect(result.status, result.stderr).toBe(0);
    const judgement = JSON.parse(result.stdout ?? '{}') as Judgement;
    expect(judgement.errors).toEqual([]);
    expect(judgement.counts.unclassified).toBe(0);
    // Every discovered file is either in the gate or in exactly one class.
    expect(judgement.counts.authoritativeGate + judgement.counts.classified).toBe(judgement.counts.discovered);
    // Discovery is measuring the real repository, not an empty set.
    expect(judgement.counts.discovered).toBeGreaterThan(300);
    expect(judgement.counts.authoritativeGate).toBeGreaterThan(200);

    const declared = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/validation-universe.v1.json'), 'utf8')) as { inventoryDigest: string };
    expect(declared.inventoryDigest).toBe(judgement.digest);
  });
});
