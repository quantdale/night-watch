// M7 task 8.2 (NW-AUD-036 narrowed) — HEAD is re-checked after the scan, a
// mismatched snapshot is refused in the read view, and no code hard-codes
// `sourceSnapshotMatches: true`.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { toPhase24CandidateInput } from '../../src/core/source/surfaces';
import type { RealSourceSurfaceDescriptor } from '../../src/core/source/surfaceTypes';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function descriptorWith(match: boolean | undefined): RealSourceSurfaceDescriptor {
  const base = {
    schemaVersion: 'nightwatch.real-source-surface-descriptor.v1',
    surfaceId: 'surface:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
    targetId: 'ripple.example.read',
    operation: {
      operationId: 'op:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
      sourcePath: 'src/App/Handler/Example.php',
      routeTemplate: '/example',
      method: 'GET',
      readOnlyClassification: 'PROVEN_READ_ONLY',
      runtimeBinding: 'RUNTIME_BOUND_EXACT',
    },
    source: { repoId: 'mobingilabs/ripple-api', sha: 'a'.repeat(40), evidenceDigest: 'ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa' },
    relevantFiles: ['src/App/Handler/Example.php'],
    joins: [],
    contract: {
      requestProof: 'PROVEN',
      responseProof: 'PROVEN',
      requestFieldCount: 0,
      semanticProof: 'UNPROVEN',
      semanticContractIds: [],
      requestEvidenceDigest: 'ev:sha256:bbbbbbbbbbbbbbbbbbbbbbbb',
      responseEvidenceDigest: 'ev:sha256:cccccccccccccccccccccccc',
      requestContractId: 'req:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
      responseContractId: 'res:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
    },
    componentProvenance: { state: 'UNRESOLVED', repository: null, packageName: null, component: null, confidence: 'UNRESOLVED' },
    currentness: 'CURRENT',
    lifecycle: 'ACTIVE',
    projectionCapability: 'UNPROVEN',
    replayCapability: 'UNPROVEN',
    differentialCapability: 'UNPROVEN',
    exclusionReasons: [],
    sourceEvidence: { qualifier: 'DIRECT_SOURCE', generationCurrency: 'NOT_APPLICABLE' },
    readOnlyProof: null,
  } as unknown as RealSourceSurfaceDescriptor;
  if (match === undefined) return base;
  return { ...base, sourceSnapshotMatches: match } as unknown as RealSourceSurfaceDescriptor;
}

test.describe('source snapshot re-check (8.2)', () => {
  test('the phase24 projection carries the verified fact and never invents one', () => {
    expect(toPhase24CandidateInput(descriptorWith(true)).sourceSnapshotMatches).toBe(true);
    expect(toPhase24CandidateInput(descriptorWith(false)).sourceSnapshotMatches).toBe(false);
    // An unavailable re-check stays absent — never `true`.
    expect(toPhase24CandidateInput(descriptorWith(undefined)).sourceSnapshotMatches).toBeUndefined();
  });

  test('the read view requires a VERIFIED match for its proof signal', () => {
    const source = fs.readFileSync(
      path.join(REPO_ROOT, 'src', 'controlCenter', 'authorities', 'campaignAuthority.ts'),
      'utf8',
    );
    expect(source).toContain('candidate.sourceSnapshotMatches === true');
    expect(source).not.toContain('candidate.sourceSnapshotMatches !== false');
  });

  test('no source module hard-codes a matching snapshot', () => {
    const roots = ['src'];
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const absolute = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(absolute);
          continue;
        }
        if (!entry.name.endsWith('.ts')) continue;
        // A comment is not a hard-coded value.
        const text = fs
          .readFileSync(absolute, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/^\s*\/\/.*$/gm, '');
        if (/sourceSnapshotMatches:\s*true/.test(text)) offenders.push(path.relative(REPO_ROOT, absolute));
      }
    };
    for (const root of roots) walk(path.join(REPO_ROOT, root));
    // The Phase 24 SYNTHETIC fixture is allowed to declare its own synthetic
    // match; production source may not.
    const production = offenders.filter((file) => !file.includes('phase24/synthetic.ts'));
    expect(production, `modules hard-coding a matching snapshot: ${production.join(', ')}`).toEqual([]);
  });

  test('the descriptor carries the re-check and the discovery computes it', () => {
    const source = fs.readFileSync(path.join(REPO_ROOT, 'src', 'core', 'source', 'surfaces.ts'), 'utf8');
    expect(source).toContain('currentness.currentSnapshot(repoId)');
    expect(source).toContain('...(snapshotMatches === undefined ? {} : { sourceSnapshotMatches: snapshotMatches })');
    // The scan records the fact on the descriptor; the projection reads it.
    expect(source).toContain('surface.sourceSnapshotMatches');
  });
});
