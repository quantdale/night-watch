// ---------------------------------------------------------------------------
// Schema version lifecycle — read-compatibility fixtures and probe evidence.
//
// A READ_COMPATIBLE disposition is a claim that the CURRENT reader still
// accepts an old version's bytes. The claim is proven, not asserted: this
// registry names a fixture and a reader identity, and the schema-lifecycle
// proof suite resolves the reader, feeds it the fixture at the DECLARED
// version, and requires it to read. Removing the reader, the fixture, or the
// accepted version fails that suite.
//
// A SYNTHETIC_PROBE version is the opposite claim: a negative fixture that
// the reader must reject. Its evidence is the adversarial corpus that drives
// it. A probe is never owner data and never a version change.
//
// Data-only: no fs, no network, no persistence.
// ---------------------------------------------------------------------------

export interface ReadCompatibilityFixtureRegistration {
  readonly fixtureId: string;
  readonly schemaFamily: string;
  readonly acceptedVersion: number;
  /** Identity the proof suite resolves to an actual reader invocation. */
  readonly readerId: string;
  readonly description: string;
}

export const READ_COMPATIBILITY_FIXTURES: readonly ReadCompatibilityFixtureRegistration[] = Object.freeze([
  { fixtureId: 'ai-bug-draft-v1', schemaFamily: 'nightwatch.ai-bug-draft.private', acceptedVersion: 1, readerId: 'validateLegacyAiBugDraft', description: 'Phase 7B v1 bug draft read through the retained legacy validator' },
  { fixtureId: 'ai-human-review-v1', schemaFamily: 'nightwatch.ai-human-review.private', acceptedVersion: 1, readerId: 'validateLegacyAiHumanReviewRecord', description: 'Phase 7B v1 human review record read through the retained legacy validator' },
  { fixtureId: 'ai-oracle-suggestion-v1', schemaFamily: 'nightwatch.ai-oracle-suggestion.private', acceptedVersion: 1, readerId: 'validateLegacyAiOracleSuggestion', description: 'Phase 7B v1 oracle suggestion read through the retained legacy validator' },
  { fixtureId: 'bug-dossier-v1', schemaFamily: 'nightwatch.bug-dossier.private', acceptedVersion: 1, readerId: 'validateDossierArtifact', description: 'v1 dossier read through the artifact reader that dispatches v1 and v2' },
  { fixtureId: 'campaign-strategy-state-v1', schemaFamily: 'nightwatch.campaign-strategy-state', acceptedVersion: 1, readerId: 'parseCampaignStrategyState', description: 'v1 campaign strategy resumes with an empty refusal record' },
  { fixtureId: 'phase22-manifest-v1', schemaFamily: 'nightwatch.dev-semantic-acceptance-manifest', acceptedVersion: 1, readerId: 'validatePhase22Manifest', description: 'Phase 22 frozen DEV acceptance manifest read by the retained v1 validator' },
  { fixtureId: 'real-source-recipe-v1', schemaFamily: 'nightwatch.real-source-expectation-recipe', acceptedVersion: 1, readerId: 'validateRealSourceRecipe', description: 'retired v1 recipe read byte-meaning-stable through the current recipe validator' },
  { fixtureId: 'selfdev-evaluation-v1', schemaFamily: 'nightwatch.selfdev-evaluation.private', acceptedVersion: 1, readerId: 'validateLegacySessionArtifact', description: 'legacy v1 self-dev session carrying v1 evaluations read through the legacy reader' },
  { fixtureId: 'selfdev-session-v1', schemaFamily: 'nightwatch.selfdev-session.private', acceptedVersion: 1, readerId: 'validateLegacySessionArtifact', description: 'legacy v1 self-dev session artifact read through the legacy reader' },
  { fixtureId: 'semantic-receipt-v1', schemaFamily: 'nightwatch.semantic-evaluation-receipt', acceptedVersion: 1, readerId: 'validateSemanticEvaluationReceipt', description: 'v1 semantic evaluation receipt read through the current receipt validator' },
  { fixtureId: 'triage-replay-plan-v1', schemaFamily: 'nightwatch.triage-replay-plan.private', acceptedVersion: 1, readerId: 'validateTriageReplayPlan', description: 'v1 triage replay plan read through the current plan validator' },
]);

export interface SyntheticProbeRegistration {
  readonly probeId: string;
  readonly schemaFamily: string;
  readonly version: number;
  /** Adversarial corpus that drives the unsupported-version rejection. */
  readonly evidencePath: string;
  readonly description: string;
}

export const SYNTHETIC_PROBE_EVIDENCE: readonly SyntheticProbeRegistration[] = Object.freeze([
  { probeId: 'phase13-bug-dossier-v9', schemaFamily: 'nightwatch.bug-dossier.private', version: 9, evidencePath: 'src/core/phase13/shadow.ts', description: 'dossier v9 rejected as an unsupported version' },
  { probeId: 'phase13-expectation-derivation-v9', schemaFamily: 'nightwatch.expectation-derivation', version: 9, evidencePath: 'src/core/phase13/shadow.ts', description: 'derivation version v9 rejected as a drift' },
  { probeId: 'phase13-semantic-bundle-v9', schemaFamily: 'nightwatch.semantic-campaign-bundle.private', version: 9, evidencePath: 'src/core/phase13/shadow.ts', description: 'semantic campaign bundle v9 rejected as an unsupported version' },
  { probeId: 'phase13-semantic-receipt-v9', schemaFamily: 'nightwatch.semantic-evaluation-receipt', version: 9, evidencePath: 'src/core/phase13/shadow.ts', description: 'semantic evaluation receipt v9 rejected as an unsupported version' },
  { probeId: 'phase13-semantic-triage-v9', schemaFamily: 'nightwatch.semantic-triage-evidence', version: 9, evidencePath: 'src/core/phase13/shadow.ts', description: 'semantic triage evidence v9 rejected as an unsupported version' },
  { probeId: 'phase13-triage-replay-plan-v9', schemaFamily: 'nightwatch.triage-replay-plan.private', version: 9, evidencePath: 'src/core/phase13/shadow.ts', description: 'triage replay plan v9 rejected as an unsupported version' },
]);

export function fixtureById(fixtureId: string): ReadCompatibilityFixtureRegistration | null {
  return READ_COMPATIBILITY_FIXTURES.find((fixture) => fixture.fixtureId === fixtureId) ?? null;
}

export function probeEvidenceFor(family: string, version: number): SyntheticProbeRegistration | null {
  return SYNTHETIC_PROBE_EVIDENCE.find((probe) => probe.schemaFamily === family && probe.version === version) ?? null;
}
