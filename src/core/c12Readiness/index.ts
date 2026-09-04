// Nightwatch AH-1 — C-12 operator-readiness preflight (local-only advisory).

export {
  C12_READINESS_VERSION,
  C12_MAX_OBSERVATION_WINDOW_MS,
  C12_SUBJECT_PROVENANCE_CLASSES,
  C12_BLOCKER_CODES,
} from './types';
export type {
  C12SubjectProvenance,
  C12BlockerCode,
  C12ImplementationBinding,
  C12PqBinding,
  C12OperatorSubject,
  C12ScopeConfigDescriptor,
  C12DeploymentFact,
  C12AttributionDescriptor,
  C12AuthorizationDescriptor,
  C12ReadinessInput,
  C12Blocker,
  C12ReadinessReport,
} from './types';
export { evaluateC12Readiness } from './preflight';
