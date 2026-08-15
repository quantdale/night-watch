// ---------------------------------------------------------------------------
// Nightwatch Phase 8A — deterministic synthetic proposer.
//
// This is the only proposer class in Phase 8A. Its output is intentionally
// treated as untrusted unknown data by the evaluator, including the malformed
// fixtures used by the adversarial matrix.
//
// Phase 8B.1.0 — the proposer now also exposes CONCRETE portfolio fixtures
// (`VALID_MATRIX_EXPAND`, `VALID_MATRIX_EXPAND_COLLAPSE`) driven by the single
// trusted portfolio definitions in `portfolio.ts`. The historical
// `VALID_MATRIX` fixture keeps its fixed expansion semantics for direct
// callers and old replay descriptors; the controller resolves the default
// live alias to a concrete fixture before persisting a replay descriptor.
// ---------------------------------------------------------------------------

import {
  candidateIdFor,
} from './validation';
import {
  SELFDEV_CANDIDATE_KIND,
  SELFDEV_CANDIDATE_SCHEMA_VERSION,
  SELFDEV_PROPOSER_CLASS,
  SELFDEV_PUBLICATION,
  SELFDEV_TARGET_SURFACE,
  ZERO_SELFDEV_SAFETY_VECTOR,
  type SelfDevCandidate,
  type SelfDevSafetyVector,
} from './types';
import { SELFDEV_SOURCE_REFS } from './registry';
import {
  SELFDEV_EXPAND_SUMMARY_VARIANT,
  SELFDEV_EXPAND_THEN_COLLAPSE_VARIANT,
  type SelfDevSyntheticProposalVariant,
} from './portfolio';

export const SELFDEV_SYNTHETIC_BASE_NIGHTWATCH_SHA = '0'.repeat(40);
export const SELFDEV_SYNTHETIC_CREATED_AT = '2026-08-14T00:00:00.000Z';

export type SyntheticProposalFixture =
  | 'VALID_MATRIX'
  | 'VALID_MATRIX_EXPAND'
  | 'VALID_MATRIX_EXPAND_COLLAPSE'
  | 'UNKNOWN_FIELD'
  | 'UNSAFE_ACTION'
  | 'UNSAFE_ASSERTION'
  | 'UNSAFE_FIXTURE'
  | 'OVERSIZED'
  | 'DUPLICATE'
  | 'SCOPE_ESCALATION'
  | 'FAKE_COVERAGE'
  | 'CODE_FIELD'
  | 'PATCH_FIELD'
  | 'GIT_REQUEST'
  | 'MODEL_REQUEST'
  | 'PRIVACY_VALUE';

export interface SyntheticProposerOptions {
  readonly baseNightwatchSha?: string;
  readonly seed?: number;
  readonly fixture?: SyntheticProposalFixture;
}

export interface SelfDevProposer {
  readonly proposerClass: typeof SELFDEV_PROPOSER_CLASS;
  propose(options?: SyntheticProposerOptions): readonly unknown[];
}

function timestampFor(seed: number): string {
  const second = String(seed % 60).padStart(2, '0');
  return `2026-08-14T00:00:${second}.000Z`;
}

function assertOptions(options: SyntheticProposerOptions): { readonly baseNightwatchSha: string; readonly seed: number; readonly fixture: SyntheticProposalFixture } {
  const baseNightwatchSha = options.baseNightwatchSha ?? SELFDEV_SYNTHETIC_BASE_NIGHTWATCH_SHA;
  if (!/^[0-9a-f]{40}$/.test(baseNightwatchSha)) throw new Error('SELFDEV_PROPOSER_BASE_SHA_INVALID');
  const seed = options.seed ?? 0;
  if (!Number.isInteger(seed) || seed < 0 || seed > 999) throw new Error('SELFDEV_PROPOSER_SEED_INVALID');
  const fixture = options.fixture ?? 'VALID_MATRIX';
  return { baseNightwatchSha, seed, fixture };
}

/**
 * Candidate coverage claims in the historical style: only the state-action
 * and transition classes are claimed (the oracle class is implied by the
 * registry and never claimed separately). Claims are declarations validated
 * against the allowlist; novelty is always re-derived from execution.
 */
function coverageClaimsForVariant(variant: SelfDevSyntheticProposalVariant): readonly string[] {
  return variant.coverageClasses.filter((coverageClass) => coverageClass.startsWith('state-action:') || coverageClass.startsWith('transition:'));
}

function makeCandidate(input: {
  readonly baseNightwatchSha: string;
  readonly seed: number;
  readonly variant: SelfDevSyntheticProposalVariant;
  readonly actionIds?: readonly string[];
  readonly assertionIds?: readonly string[];
  readonly coverageClaims?: readonly string[];
  readonly fixtureId?: string;
  readonly targetSurface?: string;
  readonly title?: string;
  readonly safety?: SelfDevSafetyVector;
}): SelfDevCandidate {
  const draft = {
    schemaVersion: SELFDEV_CANDIDATE_SCHEMA_VERSION,
    candidateKind: SELFDEV_CANDIDATE_KIND,
    generatorClass: SELFDEV_PROPOSER_CLASS,
    baseNightwatchSha: input.baseNightwatchSha,
    fixtureId: input.fixtureId ?? input.variant.fixtureId,
    targetSurface: input.targetSurface ?? SELFDEV_TARGET_SURFACE,
    title: input.title ?? input.variant.title,
    rationaleClass: 'STATE_TRANSITION' as const,
    actionIds: input.actionIds ?? [...input.variant.actionIds],
    assertionIds: input.assertionIds ?? [...input.variant.assertionIds],
    coverageClaims: input.coverageClaims ?? coverageClaimsForVariant(input.variant),
    sourceRefs: [SELFDEV_SOURCE_REFS[0]!],
    createdAt: timestampFor(input.seed),
    safety: input.safety ?? ZERO_SELFDEV_SAFETY_VECTOR,
    publication: SELFDEV_PUBLICATION,
    adoptionAuthority: 'NONE' as const,
  } as Omit<SelfDevCandidate, 'candidateId'>;
  return { ...draft, candidateId: candidateIdFor(draft) };
}

/**
 * The normal 3-candidate matrix for one selected portfolio variant:
 * [selected-valid, semantic-duplicate-of-selected, unsafe]. The duplicate
 * always duplicates the SELECTED member (same fixture/actions/assertions,
 * different seed/createdAt/candidateId), never a hard-coded expansion case.
 */
function matrixFor(baseNightwatchSha: string, seed: number, variant: SelfDevSyntheticProposalVariant): readonly unknown[] {
  const valid = makeCandidate({ baseNightwatchSha, seed, variant });
  const { candidateId: _candidateId, ...duplicateWithoutId } = makeCandidate({ baseNightwatchSha, seed: seed + 1, variant });
  const duplicateDraft = {
    ...duplicateWithoutId,
    createdAt: timestampFor(seed + 1),
  };
  const duplicate = { ...duplicateDraft, candidateId: candidateIdFor(duplicateDraft) };
  const unsafe = makeCandidate({
    baseNightwatchSha,
    seed: seed + 2,
    variant,
    title: 'Unsafe synthetic candidate',
    safety: { ...ZERO_SELFDEV_SAFETY_VECTOR, productMutations: 1 },
  });
  return [valid, duplicate, unsafe];
}

function withUnknownField(candidate: SelfDevCandidate, field: string, value: unknown): unknown {
  return { ...candidate, [field]: value };
}

export class SyntheticDeterministicProposer implements SelfDevProposer {
  readonly proposerClass = SELFDEV_PROPOSER_CLASS;

  propose(options: SyntheticProposerOptions = {}): readonly unknown[] {
    const { baseNightwatchSha, seed, fixture } = assertOptions(options);
    const valid = makeCandidate({ baseNightwatchSha, seed, variant: SELFDEV_EXPAND_SUMMARY_VARIANT });

    if (fixture === 'VALID_MATRIX' || fixture === 'DUPLICATE' || fixture === 'VALID_MATRIX_EXPAND') {
      return matrixFor(baseNightwatchSha, seed, SELFDEV_EXPAND_SUMMARY_VARIANT);
    }
    if (fixture === 'VALID_MATRIX_EXPAND_COLLAPSE') {
      return matrixFor(baseNightwatchSha, seed, SELFDEV_EXPAND_THEN_COLLAPSE_VARIANT);
    }
    if (fixture === 'UNKNOWN_FIELD') return [withUnknownField(valid, 'unknownField', 'synthetic')];
    if (fixture === 'UNSAFE_ACTION') return [makeCandidate({ baseNightwatchSha, seed, variant: SELFDEV_EXPAND_SUMMARY_VARIANT, actionIds: ['selfdev.synthetic.save-settings'] })];
    if (fixture === 'UNSAFE_ASSERTION') return [makeCandidate({ baseNightwatchSha, seed, variant: SELFDEV_EXPAND_SUMMARY_VARIANT, assertionIds: ['selfdev.assert.unknown'] })];
    if (fixture === 'UNSAFE_FIXTURE') return [makeCandidate({ baseNightwatchSha, seed, variant: SELFDEV_EXPAND_SUMMARY_VARIANT, fixtureId: '../outside-fixture' })];
    if (fixture === 'OVERSIZED') return [makeCandidate({ baseNightwatchSha, seed, variant: SELFDEV_EXPAND_SUMMARY_VARIANT, actionIds: Array.from({ length: 9 }, (_, index) => `selfdev.synthetic.action-${index}`) })];
    if (fixture === 'SCOPE_ESCALATION') return [makeCandidate({ baseNightwatchSha, seed, variant: SELFDEV_EXPAND_SUMMARY_VARIANT, targetSurface: 'DEV' })];
    if (fixture === 'FAKE_COVERAGE') return [makeCandidate({ baseNightwatchSha, seed, variant: SELFDEV_EXPAND_SUMMARY_VARIANT, coverageClaims: ['coverage:not-real'] })];
    if (fixture === 'CODE_FIELD') return [withUnknownField(valid, 'code', 'return true')];
    if (fixture === 'PATCH_FIELD') return [withUnknownField(valid, 'patch', 'synthetic patch')];
    if (fixture === 'GIT_REQUEST') return [withUnknownField(valid, 'git', { commit: true })];
    if (fixture === 'MODEL_REQUEST') return [withUnknownField(valid, 'model', 'synthetic-model')];
    if (fixture === 'PRIVACY_VALUE') return [makeCandidate({ baseNightwatchSha, seed, variant: SELFDEV_EXPAND_SUMMARY_VARIANT, title: 'CUSTOMER_SENTINEL regression' })];
    throw new Error('SELFDEV_PROPOSER_FIXTURE_INVALID');
  }
}
