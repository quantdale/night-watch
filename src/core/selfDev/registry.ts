// ---------------------------------------------------------------------------
// Nightwatch Phase 8A — allowlisted local synthetic registry.
//
// These are structural descriptors, not generated callbacks. Candidate data
// can name an entry but cannot supply a selector, URL, request, command,
// expression, or executable oracle. The evaluator interprets this fixed
// table with deterministic code.
// ---------------------------------------------------------------------------

import { SELFDEV_TARGET_SURFACE, type SelfDevReasonCode } from './types';
import { SelfDevRegistryError } from './validation';
import { sha256Digest } from './canonical';

export const SELFDEV_FIXTURE_ID = 'selfdev.fixture.local-regression.v1' as const;
export const SELFDEV_SOURCE_REFS = Object.freeze([
  'selfdev.source.evaluator',
  'selfdev.source.registry',
  'selfdev.source.synthetic-proposer',
] as const);

export const SELFDEV_COVERAGE_CLASSES = Object.freeze([
  'state-action:ready:selfdev.synthetic.observe-ready',
  'state-action:ready:selfdev.synthetic.expand-summary',
  'state-action:expanded:selfdev.synthetic.collapse-summary',
  'transition:ready-read-only-observation',
  'transition:ready-read-only-expansion',
  'transition:expanded-read-only-collapse',
  'oracle:structural-stable',
] as const);

export type SelfDevStateId = 'selfdev.state.ready.v1' | 'selfdev.state.expanded.v1';

export interface SelfDevActionDescriptor {
  readonly actionId: string;
  readonly fromStateId: SelfDevStateId;
  readonly toStateId: SelfDevStateId;
  readonly transitionClass: string;
  readonly coverageClasses: readonly string[];
  readonly oracleClass: 'STRUCTURAL_STABLE';
  readonly semanticClass: 'LOCAL_READ_ONLY';
  readonly mutation: false;
  readonly externalContact: false;
}

export interface SelfDevAssertionDescriptor {
  readonly assertionId: string;
  readonly assertionClass: 'EXPECTED_STATE_ID' | 'EXPECTED_TRANSITION_CLASS' | 'EXPECTED_ORACLE_CLASS' | 'EXPECTED_STABLE_FINGERPRINT' | 'EXPECTED_SAFETY_VECTOR';
  readonly expectedValue: string;
}

export interface SelfDevFixtureDescriptor {
  readonly fixtureId: typeof SELFDEV_FIXTURE_ID;
  readonly targetSurface: typeof SELFDEV_TARGET_SURFACE;
  readonly initialStateId: SelfDevStateId;
  readonly stateIds: readonly SelfDevStateId[];
}

export const SELFDEV_FIXTURE: SelfDevFixtureDescriptor = Object.freeze({
  fixtureId: SELFDEV_FIXTURE_ID,
  targetSurface: SELFDEV_TARGET_SURFACE,
  initialStateId: 'selfdev.state.ready.v1',
  stateIds: ['selfdev.state.ready.v1', 'selfdev.state.expanded.v1'] as SelfDevStateId[],
});

export const SELFDEV_ACTIONS: readonly SelfDevActionDescriptor[] = Object.freeze([
  {
    actionId: 'selfdev.synthetic.observe-ready',
    fromStateId: 'selfdev.state.ready.v1',
    toStateId: 'selfdev.state.ready.v1',
    transitionClass: 'READ_ONLY_OBSERVATION',
    coverageClasses: [
      'state-action:ready:selfdev.synthetic.observe-ready',
      'transition:ready-read-only-observation',
      'oracle:structural-stable',
    ],
    oracleClass: 'STRUCTURAL_STABLE',
    semanticClass: 'LOCAL_READ_ONLY',
    mutation: false,
    externalContact: false,
  },
  {
    actionId: 'selfdev.synthetic.expand-summary',
    fromStateId: 'selfdev.state.ready.v1',
    toStateId: 'selfdev.state.expanded.v1',
    transitionClass: 'READ_ONLY_EXPANSION',
    coverageClasses: [
      'state-action:ready:selfdev.synthetic.expand-summary',
      'transition:ready-read-only-expansion',
      'oracle:structural-stable',
    ],
    oracleClass: 'STRUCTURAL_STABLE',
    semanticClass: 'LOCAL_READ_ONLY',
    mutation: false,
    externalContact: false,
  },
  {
    actionId: 'selfdev.synthetic.collapse-summary',
    fromStateId: 'selfdev.state.expanded.v1',
    toStateId: 'selfdev.state.ready.v1',
    transitionClass: 'READ_ONLY_COLLAPSE',
    coverageClasses: [
      'state-action:expanded:selfdev.synthetic.collapse-summary',
      'transition:expanded-read-only-collapse',
      'oracle:structural-stable',
    ],
    oracleClass: 'STRUCTURAL_STABLE',
    semanticClass: 'LOCAL_READ_ONLY',
    mutation: false,
    externalContact: false,
  },
]);

export const SELFDEV_ASSERTIONS: readonly SelfDevAssertionDescriptor[] = Object.freeze([
  { assertionId: 'selfdev.assert.state.ready', assertionClass: 'EXPECTED_STATE_ID', expectedValue: 'selfdev.state.ready.v1' },
  { assertionId: 'selfdev.assert.state.expanded', assertionClass: 'EXPECTED_STATE_ID', expectedValue: 'selfdev.state.expanded.v1' },
  { assertionId: 'selfdev.assert.transition.observation', assertionClass: 'EXPECTED_TRANSITION_CLASS', expectedValue: 'READ_ONLY_OBSERVATION' },
  { assertionId: 'selfdev.assert.transition.expansion', assertionClass: 'EXPECTED_TRANSITION_CLASS', expectedValue: 'READ_ONLY_EXPANSION' },
  { assertionId: 'selfdev.assert.transition.collapse', assertionClass: 'EXPECTED_TRANSITION_CLASS', expectedValue: 'READ_ONLY_COLLAPSE' },
  { assertionId: 'selfdev.assert.oracle.structural-stable', assertionClass: 'EXPECTED_ORACLE_CLASS', expectedValue: 'STRUCTURAL_STABLE' },
  { assertionId: 'selfdev.assert.fingerprint.stable', assertionClass: 'EXPECTED_STABLE_FINGERPRINT', expectedValue: 'sha256:' },
  { assertionId: 'selfdev.assert.safety.zero', assertionClass: 'EXPECTED_SAFETY_VECTOR', expectedValue: 'ZERO' },
]);

export const SELFDEV_BASELINE_COVERAGE = Object.freeze([
  'state-action:ready:selfdev.synthetic.observe-ready',
  'transition:ready-read-only-observation',
  'oracle:structural-stable',
] as const);

export const SELFDEV_BASELINE_EQUIVALENT_FINGERPRINT = sha256Digest({
  fixtureId: SELFDEV_FIXTURE_ID,
  actionIds: ['selfdev.synthetic.observe-ready'],
  assertionIds: ['selfdev.assert.state.ready', 'selfdev.assert.transition.observation'],
});

function fail(code: SelfDevReasonCode): never {
  throw new SelfDevRegistryError(code as 'SCOPE_FIXTURE_UNKNOWN' | 'UNKNOWN_ACTION' | 'UNKNOWN_ASSERTION' | 'SCOPE_SOURCE_REF_UNKNOWN' | 'SCOPE_COVERAGE_CLAIM_UNKNOWN');
}

export function resolveSelfDevFixture(fixtureId: string): SelfDevFixtureDescriptor {
  if (fixtureId !== SELFDEV_FIXTURE.fixtureId) fail('SCOPE_FIXTURE_UNKNOWN');
  return SELFDEV_FIXTURE;
}

export function resolveSelfDevAction(actionId: string): SelfDevActionDescriptor {
  const action = SELFDEV_ACTIONS.find((candidate) => candidate.actionId === actionId);
  if (action === undefined) fail('UNKNOWN_ACTION');
  if (action.mutation || action.externalContact || action.semanticClass !== 'LOCAL_READ_ONLY') fail('UNKNOWN_ACTION');
  return action;
}

export function resolveSelfDevActions(actionIds: readonly string[]): readonly SelfDevActionDescriptor[] {
  return actionIds.map(resolveSelfDevAction);
}

export function resolveSelfDevAssertion(assertionId: string): SelfDevAssertionDescriptor {
  const assertion = SELFDEV_ASSERTIONS.find((candidate) => candidate.assertionId === assertionId);
  if (assertion === undefined) fail('UNKNOWN_ASSERTION');
  return assertion;
}

export function resolveSelfDevAssertions(assertionIds: readonly string[]): readonly SelfDevAssertionDescriptor[] {
  return assertionIds.map(resolveSelfDevAssertion);
}

export function assertSelfDevSourceRefs(sourceRefs: readonly string[]): void {
  for (const sourceRef of sourceRefs) {
    if (!SELFDEV_SOURCE_REFS.includes(sourceRef as (typeof SELFDEV_SOURCE_REFS)[number])) fail('SCOPE_SOURCE_REF_UNKNOWN');
  }
}

export function assertSelfDevCoverageClaims(coverageClaims: readonly string[]): void {
  for (const coverageClaim of coverageClaims) {
    if (!SELFDEV_COVERAGE_CLASSES.includes(coverageClaim as (typeof SELFDEV_COVERAGE_CLASSES)[number])) fail('SCOPE_COVERAGE_CLAIM_UNKNOWN');
  }
}
