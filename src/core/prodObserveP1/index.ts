// ---------------------------------------------------------------------------
// Nightwatch MA-8 / F-13 — the P1 observation-scope public surface.
//
// What this cone MUST NEVER import (enforced by
// `checkP1ObservationScopeBoundary`, not by this comment — the scanner strips
// comments so documenting the boundary here is not itself a violation):
//
//   - `core/prodObserve` (the C-11 request chain; F-12 both directions)
//   - the active production request path / dispatch machinery
//   - the replay / minimization executor
//   - DEV / NEXT campaign execution or environment loading
//   - browser navigation, fetch/XHR, click/type/submit actuation
//   - authenticated-state creation (login, credentials, storage state)
//   - network or process capability (`node:net`, `node:http`, `child_process`)
// ---------------------------------------------------------------------------

export {
  P1_GATE_DENIAL_CODES,
  P1_OBSERVATION_DENIAL_CODES,
  P1_OBSERVATION_SCOPE_CHAIN_VERSION,
  P1_OBSERVATION_SCOPE_GATES,
  P1_OBSERVE_AUTHORIZATION_CLASS,
  P1_OBSERVATION_STAGE,
  P1_OBSERVER_IDENTITY_CLASSES,
  P1_ATTRIBUTION_CAPABILITIES,
  P1_ATTRIBUTION_CLASSES,
  P1_REQUESTABLE_AUTHORIZATION_CLASSES,
  P1_SESSION_OUTCOMES,
  P1_SUBJECT_PROVENANCE_CLASSES,
  p1ObserverIdentitySatisfies,
  type P1AdmissionDecision,
  type P1AttributionCapability,
  type P1AttributionClass,
  type P1GateOutcome,
  type P1GateResult,
  type P1ObservationDenialCode,
  type P1ObservationScopeGate,
  type P1ObservationStage,
  type P1ObservationSubject,
  type P1ObserverIdentityClass,
  type P1RequestableAuthorizationClass,
  type P1SessionOutcome,
  type P1SubjectProvenanceClass,
} from './types';
export {
  P1_OBSERVE_GRANT_VERSION,
  clearP1ObserveGrantRegistryForTest,
  consumeP1ObserveGrant,
  isRegisteredP1Grant,
  issueP1ObserveGrant,
  p1GrantLifecycleState,
  revokeP1ObserveGrant,
  validateP1ObserveGrant,
  type IssueP1GrantRequest,
  type P1GrantLifecycleState,
  type P1GrantValidation,
  type P1GrantValidationRequest,
  type P1ObserveGrant,
} from './authorization';
export {
  P1_CONFIG_INTEGRITY_FAILURES,
  P1_MAX_OBSERVATION_WINDOW_MS,
  P1_SCOPE_CONFIG_ENV,
  P1_SCOPE_CONFIG_SCHEMA,
  isAdmittedP1Host,
  loadP1ScopeConfig,
  type P1ConfigIntegrityFailure,
  type P1ObservationWindow,
  type P1ScopeConfig,
  type P1ScopeConfigLoadRequest,
  type P1ScopeConfigLoadResult,
} from './scopeConfig';
export {
  P1_KILL_SWITCH_VERSION,
  createP1StopFileProbe,
  evaluateP1KillSwitch,
  type P1KillSwitchProbe,
  type P1KillSwitchState,
} from './killSwitch';
export {
  P1_OBSERVATION_SCOPE_VERSION,
  evaluateP1ObservationScope,
  p1ScopeChainDefinitionDigest,
  type P1AdmissionInput,
  type P1AdmissionOutcome,
} from './observer';
export {
  classifyObservedRequest,
  classifyP1Session,
  isP1SessionPass,
  tallyAttribution,
  type AttributedRequest,
  type ObservedRequestEvidence,
  type P1SessionAttributionTally,
  type P1SessionVerdictInput,
} from './attribution';
export {
  attachP1ObservationSession,
  clearP1SessionAttachStateForTest,
  type P1AttachRequest,
  type P1ObservationEventSource,
  type P1SessionBounds,
  type P1SessionResult,
  type P1SessionTermination,
} from './session';
