// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — M1 pre-implementation oracle-ceiling reproduction.
//
// Proves the CURRENT (pre-Phase-9) oracle ceiling on the five seeded
// semantic defect fixtures: every seeded defect body is protocol-valid
// (HTTP 200 + correct content type + parseable JSON), so the existing
// protocol oracles PASS / produce no issue and the Phase 5 API oracle
// returns ORACLE_PASS — no semantic anomaly is detectable by construction
// (no semantic oracle exists at this commit).
//
// These results are EXPECTED_ORACLE_CEILING (the Phase 9 baseline), not
// bugs in the old phases. The same fixtures must be detected semantically
// by the Phase 9 oracle matrix (M7-M9) and rejected by nothing here.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { checkJsonBody, checkUnexpectedStatus } from '../../src/oracles/protocol/passiveChecks';
import { evaluateApiResponse } from '../../src/api/phase5/oracle';
import type { ApiOperation } from '../../src/api/phase5/types';

const CORPUS_ROOT = path.join(__dirname, '..', '..', 'corpus', 'phase9', 'defects');

interface DefectStep {
  stepId: string;
  kind: string;
  status: number;
  contentType: string;
  bodyFile: string;
}

interface DefectManifest {
  scenarioId: string;
  semanticDefectClass: string;
  protocolValid: boolean;
  steps: readonly DefectStep[];
}

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadDefect(directory: string): { manifest: DefectManifest; bodies: Record<string, string> } {
  const root = path.join(CORPUS_ROOT, directory);
  const manifest = readJson(path.join(root, 'manifest.json')) as DefectManifest;
  const bodies: Record<string, string> = {};
  for (const step of manifest.steps) {
    const body = fs.readFileSync(path.join(root, step.bodyFile), 'utf8');
    if (step.bodyFile in bodies) throw new Error(`duplicate body file ${step.bodyFile}`);
    bodies[step.bodyFile] = body;
  }
  return { manifest, bodies };
}

function syntheticOperation(operationId: string): ApiOperation {
  return {
    operationId,
    product: 'ripple',
    service: 'synthetic',
    sourceRepo: 'corpus/phase9/source-fixture',
    sourceSHA: 'fixture-synthetic-sha',
    frontendCallsites: [],
    httpMethod: 'GET',
    pathTemplate: '/synthetic/read',
    semanticPurpose: 'synthetic phase 9 fixture',
    semanticClass: 'KNOWN_READ',
    authClass: 'NONE_LOCAL_FIXTURE',
    responseShapePolicy: {
      oracleId: `${operationId}.json`,
      expectedContentType: 'application/json',
      shape: 'JSON_OBJECT_OR_ARRAY',
      persistBody: false,
      maxBytes: 2 * 1024 * 1024,
    },
    streamingType: 'SINGLE_JSON',
    requiredHostClass: 'LOCAL_LOOPBACK',
    replayPolicy: 'LOCAL_ONLY',
    sourceProvenance: ['corpus/phase9/source-fixture'],
    journeyLinks: [],
    generationStatus: 'GENERATION_ELIGIBLE',
  };
}

const REQUIRED_DEFECTS = [
  'http200-error-envelope',
  'list-detail-identity-mismatch',
  'stale-state-after-transition',
  'aggregate-total-relation-mismatch',
  'cardinality-relation-mismatch',
] as const;

test.describe('Phase 9 M1 — current oracle ceiling on the seeded semantic defects (EXPECTED_ORACLE_CEILING)', () => {
  for (const directory of REQUIRED_DEFECTS) {
    test(`protocol/API oracles pass the seeded defect fixture ${directory}`, () => {
      const { manifest, bodies } = loadDefect(directory);
      expect(manifest.protocolValid).toBe(true);

      const stepEntries = Object.entries(bodies);
      expect(stepEntries.length).toBeGreaterThan(0);

      for (const [bodyFile, body] of stepEntries) {
        const step = manifest.steps.find((item) => item.bodyFile === bodyFile);
        expect(step, `step metadata for ${bodyFile}`).toBeDefined();
        const url = `https://synthetic.local${step!.stepId}`;

        // 1. Generic passive protocol oracles: 200 status and parseable JSON
        //    must produce NO issue.
        expect(checkUnexpectedStatus(step!.status, url)).toBeNull();
        expect(checkJsonBody(body, url, step!.contentType, step!.status)).toBeNull();

        // 2. Phase 5 API oracle: protocol-valid body must reach ORACLE_PASS.
        const observation = evaluateApiResponse(
          syntheticOperation(manifest.scenarioId),
          step!.status,
          { 'content-type': step!.contentType },
          Buffer.from(body, 'utf8'),
        );
        expect(observation.result).toBe('ORACLE_PASS');

        // 3. No semantic anomaly is detectable at this commit: there is no
        //    semantic oracle; the semantic channel does not exist yet.
        expect(manifest.protocolValid && observation.result === 'ORACLE_PASS').toBe(true);
      }
    });
  }

  test('records the exact ceiling: 5/5 seeded semantic classes are protocol-valid and semantically invisible', () => {
    const counts: Record<string, { protocolValid: boolean; protocolResults: string[] }> = {};
    for (const directory of REQUIRED_DEFECTS) {
      const { manifest, bodies } = loadDefect(directory);
      const results: string[] = [];
      for (const [bodyFile, body] of stepEntries(manifest, bodies)) {
        const step = manifest.steps.find((item) => item.bodyFile === bodyFile)!;
        results.push(
          evaluateApiResponse(
            syntheticOperation(manifest.scenarioId),
            step.status,
            { 'content-type': step.contentType },
            Buffer.from(body, 'utf8'),
          ).result,
        );
      }
      counts[manifest.semanticDefectClass] = { protocolValid: manifest.protocolValid, protocolResults: results };
    }
    // The five required seeded classes all exist, are protocol-valid, and
    // every protocol-valid step evaluates to ORACLE_PASS today.
    expect(Object.keys(counts).sort()).toEqual([
      'AGGREGATE_TOTAL_RELATION_MISMATCH',
      'CARDINALITY_RELATION_MISMATCH',
      'HTTP_200_ERROR_ENVELOPE',
      'LIST_DETAIL_IDENTITY_MISMATCH',
      'STALE_STATE_AFTER_TRANSITION',
    ]);
    for (const [cls, entry] of Object.entries(counts)) {
      expect(entry.protocolValid, cls).toBe(true);
      expect(entry.protocolResults.every((result) => result === 'ORACLE_PASS'), cls).toBe(true);
    }
    // Baseline for the Phase 9 improvement proof (M14): protocol detection
    // of the required semantic fixtures is 0/5 today.
    expect(
      Object.values(counts).every((entry) => entry.protocolResults.every((result) => result === 'ORACLE_PASS')),
    ).toBe(true);
  });
});

function stepEntries(manifest: DefectManifest, bodies: Record<string, string>): Array<[string, string]> {
  return Object.entries(bodies);
}
