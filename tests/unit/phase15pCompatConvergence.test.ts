// ---------------------------------------------------------------------------
// Nightwatch Phase 15P A15 — compatibility / dead-code / version convergence
// guard suite (permanent).
//
// Locks in the Phase 15P A15 audit results so convergence cannot silently
// regress:
//
//   1. VERSION SINGLE OWNERSHIP — every `nightwatch.*` version string declared
//      as an exported constant has exactly ONE owning module across src/
//      (mechanical source scan). Competing constants claiming the same schema
//      fail here.
//   2. PINNED TABLES REFERENCE, NOT RE-INLINE — the checkpoint runtime-contract
//      version pins and the artifact-validation acceptance table carry exactly
//      the owning modules' constant values.
//   3. CANONICAL REASON-CODE TABLES ARE REFERENCED — the semantic-confidence
//      declared-missing-evidence blocker map is bound to the canonical
//      MISSING_EVIDENCE_VOCABULARY; candidate lifecycle terminality stays
//      derived from its frozen state table.
//   4. MARKED COMPATIBILITY-ONLY SURFACES — stableLifecycleJson and
//      stablePromotionResultJson are @deprecated byte-identical aliases of the
//      one canonical serializer stableCampaignJson; a lint-style scan proves
//      no new-code module (src/** outside their defining files) imports them,
//      while existing callers keep byte-identical output (compat round-trip).
//   5. DELETED DEAD PATHS STAY UNREACHABLE — safetyVectorIsZero and
//      parseSemanticTriageEvidence (proven zero-caller exports removed by A15)
//      remain absent from their module surfaces while the surviving neighbors
//      still work.
//   6. INTERMEDIATE vs DURABLE BRIEF LAYERING — the triage morning-brief /
//      overnight-summary shapes stay intermediate-only strings distinct from
//      the durable campaign morning-brief artifact version.
//
// Synthetic/local only: fixtures are repository-owned synthetic values. No
// DEV, no real product, no network, no credentials.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import {
  CANDIDATE_LIFECYCLE_EVENTS,
  CANDIDATE_LIFECYCLE_STATES,
  CANDIDATE_LIFECYCLE_VERSION,
  initialLifecycleRecord,
  isTerminalCandidateLifecycleState,
  stableLifecycleJson,
  transitionCandidateLifecycle,
} from '../../src/core/campaign/candidateLifecycle';
import {
  CAMPAIGN_CHECKPOINT_VERSION,
  CAMPAIGN_MORNING_BRIEF_VERSION,
  CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED,
} from '../../src/core/campaign/types';
import { stableCampaignJson } from '../../src/core/campaign/identity';
import { PROMOTION_RESULT_VERSION, stablePromotionResultJson } from '../../src/core/triage/promotionResult';
import { TRIAGE_REPLAY_PLAN_VERSION, TRIAGE_REPLAY_PLAN_V2_VERSION } from '../../src/core/triage/replayPlan';
import {
  ANOMALY_CLUSTER_VERSION,
  DOSSIER_VERSION,
  MORNING_BRIEF_VERSION,
  OVERNIGHT_SUMMARY_VERSION,
} from '../../src/core/triage/types';
import { DOSSIER_VERSION_V2 } from '../../src/core/triage/dossierV2';
import {
  MISSING_EVIDENCE_VOCABULARY,
  SEMANTIC_TRIAGE_EVIDENCE_VERSION,
  createSemanticTriageEvidence,
  validateSemanticTriageEvidence,
} from '../../src/core/triage/semanticTriageEvidence';
import { rankSemanticConfidence, verifyDeclaredMissingBlockersBoundToVocabulary } from '../../src/core/triage/semanticConfidence';
import { SEMANTIC_EVALUATION_RECEIPT_VERSION, SEMANTIC_EVALUATION_RECEIPT_VERSION_V1 } from '../../src/oracles/semantic/receipts';
import { SEMANTIC_CAMPAIGN_BUNDLE_VERSION } from '../../src/core/source/semanticCampaignBundle';
import { REPORT_VERSION } from '../../src/oracles/expectations/extract/contractCoverageReport';
import { ARTIFACT_KIND_VERSION_ACCEPTANCE, KNOWN_ARTIFACT_KINDS } from '../../src/core/artifactValidation/types';
import * as minimizerNs from '../../src/core/triage/minimizer';
import * as evidenceNs from '../../src/core/triage/semanticTriageEvidence';

// ---------------------------------------------------------------------------
// Mechanical helpers (pure fs reads over the current worktree).
// ---------------------------------------------------------------------------

function collectTsFiles(rootDir: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.ts')) out.push(full);
    }
  };
  walk(rootDir);
  return out;
}

const REPO_SRC = path.join(process.cwd(), 'src');

interface VersionDeclaration {
  readonly name: string;
  readonly value: string;
  readonly file: string;
}

const VERSION_DECL_RE = /^export const ([A-Z0-9_]+) = '(nightwatch\.[^']+)' as const;|^export const ([A-Z0-9_]+) = "(nightwatch\.[^"]+)" as const;/;

function scanVersionDeclarations(): VersionDeclaration[] {
  const decls: VersionDeclaration[] = [];
  for (const file of collectTsFiles(REPO_SRC)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const line of text.split('\n')) {
      const match = VERSION_DECL_RE.exec(line);
      if (match) {
        decls.push({ name: match[1] ?? match[3]!, value: match[2] ?? match[4]!, file: path.relative(process.cwd(), file) });
      }
    }
  }
  return decls;
}

// ---------------------------------------------------------------------------
// 1. Version-string single ownership across src/.
// ---------------------------------------------------------------------------

test.describe('Phase 15P A15 — version-string single ownership', () => {
  test('every nightwatch.* exported version constant has exactly one owning module', () => {
    const decls = scanVersionDeclarations();
    expect(decls.length).toBeGreaterThanOrEqual(100);
    const byValue = new Map<string, VersionDeclaration[]>();
    for (const decl of decls) {
      const owners = byValue.get(decl.value) ?? [];
      owners.push(decl);
      byValue.set(decl.value, owners);
    }
    const duplicates = [...byValue.entries()].filter(([, owners]) => new Set(owners.map((o) => o.file)).size > 1);
    expect(duplicates, duplicates.map(([v, o]) => `${v} declared by ${o.map((x) => x.file).join(', ')}`).join('; ')).toEqual([]);
  });

  test('cone schema versions are owned by their canonical modules', () => {
    const decls = scanVersionDeclarations();
    const ownerOf = (value: string): string | null => decls.find((d) => d.value === value)?.file ?? null;
    expect(ownerOf(CANDIDATE_LIFECYCLE_VERSION)).toBe('src/core/campaign/candidateLifecycle.ts');
    expect(ownerOf(TRIAGE_REPLAY_PLAN_VERSION)).toBe('src/core/triage/replayPlan.ts');
    expect(ownerOf(TRIAGE_REPLAY_PLAN_V2_VERSION)).toBe('src/core/triage/replayPlan.ts');
    expect(ownerOf(PROMOTION_RESULT_VERSION)).toBe('src/core/triage/promotionResult.ts');
    expect(ownerOf(CAMPAIGN_CHECKPOINT_VERSION)).toBe('src/core/campaign/types.ts');
    expect(ownerOf(CAMPAIGN_MORNING_BRIEF_VERSION)).toBe('src/core/campaign/types.ts');
    expect(ownerOf(DOSSIER_VERSION)).toBe('src/core/triage/types.ts');
    expect(ownerOf(DOSSIER_VERSION_V2)).toBe('src/core/triage/dossierV2.ts');
    expect(ownerOf(ANOMALY_CLUSTER_VERSION)).toBe('src/core/triage/types.ts');
    expect(ownerOf(SEMANTIC_EVALUATION_RECEIPT_VERSION)).toBe('src/oracles/semantic/receipts.ts');
    expect(ownerOf(SEMANTIC_EVALUATION_RECEIPT_VERSION_V1)).toBe('src/oracles/semantic/receipts.ts');
    expect(ownerOf(SEMANTIC_CAMPAIGN_BUNDLE_VERSION)).toBe('src/core/source/semanticCampaignBundle.ts');
    expect(ownerOf(REPORT_VERSION)).toBe('src/oracles/expectations/extract/contractCoverageReport.ts');
  });
});

// ---------------------------------------------------------------------------
// 2. Pinned tables reference owning constants (not re-inlined drift risks).
// ---------------------------------------------------------------------------

test.describe('Phase 15P A15 — pinned version tables reference owners', () => {
  test('checkpoint runtime-contract pins equal the owning constants', () => {
    expect(CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED.candidateLifecycle).toBe(CANDIDATE_LIFECYCLE_VERSION);
    expect(CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED.replayBinding).toBe(TRIAGE_REPLAY_PLAN_V2_VERSION);
    expect(CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED.promotionResult).toBe(PROMOTION_RESULT_VERSION);
  });

  test('artifact acceptance table carries exactly the owning constant values', () => {
    expect([...ARTIFACT_KIND_VERSION_ACCEPTANCE['campaign-checkpoint']]).toEqual([CAMPAIGN_CHECKPOINT_VERSION]);
    expect([...ARTIFACT_KIND_VERSION_ACCEPTANCE['semantic-receipt']]).toEqual([
      SEMANTIC_EVALUATION_RECEIPT_VERSION_V1,
      SEMANTIC_EVALUATION_RECEIPT_VERSION,
    ]);
    expect([...ARTIFACT_KIND_VERSION_ACCEPTANCE['replay-plan']]).toEqual([
      TRIAGE_REPLAY_PLAN_VERSION,
      TRIAGE_REPLAY_PLAN_V2_VERSION,
    ]);
    expect([...ARTIFACT_KIND_VERSION_ACCEPTANCE['cluster']]).toEqual([ANOMALY_CLUSTER_VERSION]);
    expect([...ARTIFACT_KIND_VERSION_ACCEPTANCE['dossier']]).toEqual([DOSSIER_VERSION, DOSSIER_VERSION_V2]);
    expect([...ARTIFACT_KIND_VERSION_ACCEPTANCE['morning-brief']]).toEqual([CAMPAIGN_MORNING_BRIEF_VERSION]);
    expect([...ARTIFACT_KIND_VERSION_ACCEPTANCE['source-bundle']]).toEqual([SEMANTIC_CAMPAIGN_BUNDLE_VERSION]);
    expect([...ARTIFACT_KIND_VERSION_ACCEPTANCE['coverage-report']]).toEqual([REPORT_VERSION]);
    // Unversioned structural shapes stay declared as shape tags.
    expect(ARTIFACT_KIND_VERSION_ACCEPTANCE['observation'].every((v) => v.startsWith('shape:'))).toBe(true);
    expect(ARTIFACT_KIND_VERSION_ACCEPTANCE['reproduction-record']).toEqual(['shape:campaign.reproduction-record.v1']);
    expect(Object.keys(ARTIFACT_KIND_VERSION_ACCEPTANCE).sort()).toEqual([...KNOWN_ARTIFACT_KINDS].sort());
  });

  test('intermediate triage brief versions stay distinct from the durable campaign brief version', () => {
    expect(MORNING_BRIEF_VERSION).not.toBe(CAMPAIGN_MORNING_BRIEF_VERSION);
    expect(OVERNIGHT_SUMMARY_VERSION).not.toBe(CAMPAIGN_MORNING_BRIEF_VERSION);
    expect(CAMPAIGN_MORNING_BRIEF_VERSION).toBe('nightwatch.campaign-morning-brief.private.v1');
  });
});

// ---------------------------------------------------------------------------
// 3. Canonical reason-code tables are referenced, not re-inlined.
// ---------------------------------------------------------------------------

test.describe('Phase 15P A15 — canonical reason-code tables referenced', () => {
  test('semantic-confidence blocker map keys are members of MISSING_EVIDENCE_VOCABULARY', () => {
    expect(() => verifyDeclaredMissingBlockersBoundToVocabulary()).not.toThrow();
    expect(MISSING_EVIDENCE_VOCABULARY.length).toBeGreaterThanOrEqual(15);
  });

  test('declared missing-evidence codes map onto blockers through the canonical vocabulary', () => {
    const baseEvidence = {
      expectationId: 'exp:synthetic-a15',
      targetId: 'target:synthetic-a15',
      semanticFindingFingerprint: 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
      invariantDefinitionId: 'inv:synthetic-a15',
      semanticOutcome: 'ANOMALY' as const,
      receiptOutcome: 'ANOMALY' as const,
      receiptVersion: SEMANTIC_EVALUATION_RECEIPT_VERSION,
      sourceRepoId: 'repo:synthetic',
      sourceSha: 'a'.repeat(40),
      sourceEvidenceDigest: 'ev:sha256:' + 'b'.repeat(24),
      sourceDerivationVersion: 'v1',
      sourceCurrentness: 'CURRENT' as const,
      exactReplayStatus: 'REPRODUCED' as const,
      exactFingerprintMatch: true,
      minimalityGuarantee: 'NONE' as const,
      freshContextReproductions: 1,
      minimalSequenceReproductions: 0,
    };
    const withDeclaredGap = createSemanticTriageEvidence({
      ...baseEvidence,
      missingEvidence: ['EXACT_REPLAY_REQUIRED'],
    });
    validateSemanticTriageEvidence(withDeclaredGap);
    const blocked = rankSemanticConfidence({
      evidence: withDeclaredGap,
      browserApiDifferential: 'BROWSER_API_FAILURE_AGREE',
      oracleReliable: true,
      knownFalsePositive: false,
      safetyClean: true,
      privacyClean: true,
      semanticIdentityPresent: true,
    });
    expect(blocked.level).not.toBe('HIGH');
    expect(blocked.blockers).toContain('EXACT_REPLAY_NOT_REPRODUCED');

    // Permanent-scope facts deliberately do not block (documented exclusions).
    const permanentScopeOnly = createSemanticTriageEvidence({
      ...baseEvidence,
      missingEvidence: ['DEPLOYMENT_STATUS_UNRESOLVED'],
    });
    const notBlockedByPermanentScope = rankSemanticConfidence({
      evidence: permanentScopeOnly,
      browserApiDifferential: 'BROWSER_API_FAILURE_AGREE',
      oracleReliable: true,
      knownFalsePositive: false,
      safetyClean: true,
      privacyClean: true,
      semanticIdentityPresent: true,
    });
    expect(notBlockedByPermanentScope.blockers).toEqual([]);
  });

  test('candidate lifecycle terminality stays derived from the frozen state table', () => {
    const terminals = CANDIDATE_LIFECYCLE_STATES.filter((state) =>
      isTerminalCandidateLifecycleState(state));
    expect(terminals.sort()).toEqual(['DOSSIER_READY', 'REJECTED', 'UNRESOLVED']);
    // Unknown events fail closed against the EVENT_SET derived from CANDIDATE_LIFECYCLE_EVENTS.
    expect(() => transitionCandidateLifecycle(initialLifecycleRecord('PROTOCOL_ONLY'), 'NOT_AN_EVENT' as never)).toThrow();
    expect(CANDIDATE_LIFECYCLE_EVENTS.length).toBeGreaterThanOrEqual(11);
  });
});

// ---------------------------------------------------------------------------
// 4. Marked compatibility-only aliases: round-trip + no new-code imports.
// ---------------------------------------------------------------------------

test.describe('Phase 15P A15 — compatibility-only serializer aliases', () => {
  const representativeValues: readonly unknown[] = [
    null,
    'text',
    42,
    Number.NaN,
    { b: 1, a: [1, { z: undefined, y: 2 }], c: undefined },
    { nested: { deep: [{ k: null }, undefined] } },
    [3, 1, 2],
    { unicode: 'ok', num: Number.POSITIVE_INFINITY },
  ];

  test('aliases stay byte-identical to the canonical stableCampaignJson (compat round-trip)', () => {
    for (const value of representativeValues) {
      const canonical = stableCampaignJson(value);
      expect(stableLifecycleJson(value)).toBe(canonical);
      expect(stablePromotionResultJson(value)).toBe(canonical);
    }
  });

  test('no new-code module imports the deprecated aliases', () => {
    const definingFiles = new Set([
      'src/core/campaign/candidateLifecycle.ts',
      'src/core/triage/promotionResult.ts',
    ]);
    const offenders: string[] = [];
    for (const file of collectTsFiles(REPO_SRC)) {
      const rel = path.relative(process.cwd(), file);
      if (definingFiles.has(rel)) continue;
      const text = fs.readFileSync(file, 'utf8');
      if (/\bstableLifecycleJson\b/.test(text) || /\bstablePromotionResultJson\b/.test(text)) {
        offenders.push(rel);
      }
    }
    expect(offenders, offenders.join(', ')).toEqual([]);
  });

  test('the aliases remain exported for existing callers and tests', () => {
    expect(typeof stableLifecycleJson).toBe('function');
    expect(typeof stablePromotionResultJson).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// 5. Deleted dead paths stay unreachable; surviving surface still works.
// ---------------------------------------------------------------------------

test.describe('Phase 15P A15 — deleted dead exports stay deleted', () => {
  test('minimizer surface no longer exposes safetyVectorIsZero; main API intact', () => {
    expect((minimizerNs as unknown as Record<string, unknown>)['safetyVectorIsZero']).toBeUndefined();
    expect(typeof minimizerNs.minimizeFailure).toBe('function');
  });

  test('semantic triage evidence surface no longer exposes parseSemanticTriageEvidence; validator path intact', () => {
    expect((evidenceNs as unknown as Record<string, unknown>)['parseSemanticTriageEvidence']).toBeUndefined();
    const evidence = createSemanticTriageEvidence({
      expectationId: 'exp:synthetic-a15-roundtrip',
      targetId: 'target:synthetic-a15-roundtrip',
      semanticFindingFingerprint: 'fp:sha256:cccccccccccccccccccccccc',
      invariantDefinitionId: 'inv:synthetic-a15-roundtrip',
      semanticOutcome: 'NO_EXPECTATION',
      receiptOutcome: 'NO_EXPECTATION',
      receiptVersion: SEMANTIC_EVALUATION_RECEIPT_VERSION,
      sourceRepoId: 'repo:synthetic',
      sourceSha: 'b'.repeat(40),
      sourceEvidenceDigest: 'ev:sha256:' + 'd'.repeat(24),
      sourceDerivationVersion: 'v1',
      sourceCurrentness: 'UNKNOWN',
      exactReplayStatus: 'NOT_EVALUATED',
      exactFingerprintMatch: false,
      minimalityGuarantee: 'NONE',
      freshContextReproductions: 0,
      minimalSequenceReproductions: 0,
      missingEvidence: ['SEMANTIC_EXPECTATION_UNRESOLVED'],
    });
    expect(evidence.schemaVersion).toBe(SEMANTIC_TRIAGE_EVIDENCE_VERSION);
    expect(() => validateSemanticTriageEvidence(evidence)).not.toThrow();
  });
});
