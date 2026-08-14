// ---------------------------------------------------------------------------
// Nightwatch Phase 8A — deterministic synthetic proposer.
//
// This is the only proposer class in Phase 8A. Its output is intentionally
// treated as untrusted unknown data by the evaluator, including the malformed
// fixtures used by the adversarial matrix.
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
import { SELFDEV_FIXTURE_ID, SELFDEV_SOURCE_REFS } from './registry';

export const SELFDEV_SYNTHETIC_BASE_NIGHTWATCH_SHA = '0'.repeat(40);
export const SELFDEV_SYNTHETIC_CREATED_AT = '2026-08-14T00:00:00.000Z';

export type SyntheticProposalFixture =
  | 'VALID_MATRIX'
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

function makeCandidate(input: {
  readonly baseNightwatchSha: string;
  readonly seed: number;
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
    fixtureId: input.fixtureId ?? SELFDEV_FIXTURE_ID,
    targetSurface: input.targetSurface ?? SELFDEV_TARGET_SURFACE,
    title: input.title ?? 'Expand synthetic summary read-only',
    rationaleClass: 'STATE_TRANSITION' as const,
    actionIds: input.actionIds ?? ['selfdev.synthetic.expand-summary'],
    assertionIds: input.assertionIds ?? ['selfdev.assert.state.expanded', 'selfdev.assert.transition.expansion', 'selfdev.assert.oracle.structural-stable'],
    coverageClaims: input.coverageClaims ?? ['state-action:ready:selfdev.synthetic.expand-summary', 'transition:ready-read-only-expansion'],
    sourceRefs: [SELFDEV_SOURCE_REFS[0]!],
    createdAt: timestampFor(input.seed),
    safety: input.safety ?? ZERO_SELFDEV_SAFETY_VECTOR,
    publication: SELFDEV_PUBLICATION,
    adoptionAuthority: 'NONE' as const,
  } as Omit<SelfDevCandidate, 'candidateId'>;
  return { ...draft, candidateId: candidateIdFor(draft) };
}

function withUnknownField(candidate: SelfDevCandidate, field: string, value: unknown): unknown {
  return { ...candidate, [field]: value };
}

export class SyntheticDeterministicProposer implements SelfDevProposer {
  readonly proposerClass = SELFDEV_PROPOSER_CLASS;

  propose(options: SyntheticProposerOptions = {}): readonly unknown[] {
    const { baseNightwatchSha, seed, fixture } = assertOptions(options);
    const valid = makeCandidate({ baseNightwatchSha, seed });
    const { candidateId: _candidateId, ...duplicateWithoutId } = makeCandidate({ baseNightwatchSha, seed: seed + 1 });
    const duplicateDraft = {
      ...duplicateWithoutId,
      createdAt: timestampFor(seed + 1),
    };
    const duplicate = { ...duplicateDraft, candidateId: candidateIdFor(duplicateDraft) };
    const unsafe = makeCandidate({
      baseNightwatchSha,
      seed: seed + 2,
      title: 'Unsafe synthetic candidate',
      safety: { ...ZERO_SELFDEV_SAFETY_VECTOR, productMutations: 1 },
    });

    if (fixture === 'VALID_MATRIX' || fixture === 'DUPLICATE') return [valid, duplicate, unsafe];
    if (fixture === 'UNKNOWN_FIELD') return [withUnknownField(valid, 'unknownField', 'synthetic')];
    if (fixture === 'UNSAFE_ACTION') return [makeCandidate({ baseNightwatchSha, seed, actionIds: ['selfdev.synthetic.save-settings'] })];
    if (fixture === 'UNSAFE_ASSERTION') return [makeCandidate({ baseNightwatchSha, seed, assertionIds: ['selfdev.assert.unknown'] })];
    if (fixture === 'UNSAFE_FIXTURE') return [makeCandidate({ baseNightwatchSha, seed, fixtureId: '../outside-fixture' })];
    if (fixture === 'OVERSIZED') return [makeCandidate({ baseNightwatchSha, seed, actionIds: Array.from({ length: 9 }, (_, index) => `selfdev.synthetic.action-${index}`) })];
    if (fixture === 'SCOPE_ESCALATION') return [makeCandidate({ baseNightwatchSha, seed, targetSurface: 'DEV' })];
    if (fixture === 'FAKE_COVERAGE') return [makeCandidate({ baseNightwatchSha, seed, coverageClaims: ['coverage:not-real'] })];
    if (fixture === 'CODE_FIELD') return [withUnknownField(valid, 'code', 'return true')];
    if (fixture === 'PATCH_FIELD') return [withUnknownField(valid, 'patch', 'synthetic patch')];
    if (fixture === 'GIT_REQUEST') return [withUnknownField(valid, 'git', { commit: true })];
    if (fixture === 'MODEL_REQUEST') return [withUnknownField(valid, 'model', 'synthetic-model')];
    if (fixture === 'PRIVACY_VALUE') return [makeCandidate({ baseNightwatchSha, seed, title: 'CUSTOMER_SENTINEL regression' })];
    throw new Error('SELFDEV_PROPOSER_FIXTURE_INVALID');
  }
}
