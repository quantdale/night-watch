// ---------------------------------------------------------------------------
// Nightwatch group 11 — the semantic capability's acceptance class as data
// (F-10). The versioned config is the single source; the TS surface validates
// it fail-closed at load, freezes it, and renders it; `bin/semantic-compat.mjs`
// reads the same file so a bin presentation cannot drift from the module.
//
// Pure: no network, no fs, no child processes, no persistence. The JSON is a
// static import, validated before use.
// ---------------------------------------------------------------------------

import raw from '../../../config/semantic-acceptance-class.v1.json';
import {
  SEMANTIC_ACCEPTANCE_CLASS_SCHEMA,
  SEMANTIC_ACCEPTANCE_CAPABILITY,
  SEMANTIC_ACCEPTANCE_STATUS_TAGS,
  SEMANTIC_CAPABILITY_ACCEPTANCE_CLASSES,
  SEMANTIC_DEV_ACCEPTANCE_RESULTS,
  type SemanticAcceptancePermanentClosurePath,
  type SemanticAcceptanceStatus,
  type SemanticAcceptanceUnblockPath,
} from './types';

export const SEMANTIC_ACCEPTANCE_UNBLOCK_ARTEFACT_KEYS = [
  'authArtefact',
  'authorizationClass',
  'containmentEnvelope',
  'targetSet',
  'acceptanceCriteria',
  'expectedEvidence',
] as const;

export type SemanticAcceptanceUnblockArtefactKey = (typeof SEMANTIC_ACCEPTANCE_UNBLOCK_ARTEFACT_KEYS)[number];

const MAX_ARTEFACT_LENGTH = 1_024;

function nonEmptyBounded(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_ARTEFACT_LENGTH;
}

/** Every required unblock-path artefact, or the missing/invalid keys. A path
 *  missing any of them fails its own check (task 11.4). */
export function validateUnblockPathRecord(path: SemanticAcceptanceUnblockPath): readonly string[] {
  const invalid: string[] = [];
  if (path === null || typeof path !== 'object') return [...SEMANTIC_ACCEPTANCE_UNBLOCK_ARTEFACT_KEYS];
  if (path.label !== 'UNBLOCK_PHASE_9B_10B') invalid.push('label');
  for (const key of SEMANTIC_ACCEPTANCE_UNBLOCK_ARTEFACT_KEYS) {
    if (!nonEmptyBounded(path[key])) invalid.push(key);
  }
  return invalid;
}

/** Every required permanent-closure record field, or the missing/invalid keys
 *  (task 11.6). A closure without a reason is not terminal, it is pending. */
export function validatePermanentClosurePathRecord(path: SemanticAcceptancePermanentClosurePath): readonly string[] {
  const invalid: string[] = [];
  if (path === null || typeof path !== 'object') return ['label', 'terminalStatus', 'reason', 'acceptanceClassAfterClosure', 'consequence'];
  if (path.label !== 'CLOSE_PHASE_9B_10B_PERMANENTLY') invalid.push('label');
  if (!nonEmptyBounded(path.terminalStatus)) invalid.push('terminalStatus');
  if (typeof path.reason !== 'string' || path.reason.trim().length < 12) invalid.push('reason');
  if (path.acceptanceClassAfterClosure !== 'CLOSED_SYNTHETIC_ONLY') invalid.push('acceptanceClassAfterClosure');
  if (!nonEmptyBounded(path.consequence)) invalid.push('consequence');
  return invalid;
}

/** Strict validation of the whole acceptance-class record. Throws
 *  `SEMANTIC_ACCEPTANCE_CLASS_INVALID:<detail>`. */
export function validateSemanticAcceptanceStatus(value: SemanticAcceptanceStatus): void {
  const fail = (detail: string): never => {
    throw new Error(`SEMANTIC_ACCEPTANCE_CLASS_INVALID:${detail}`);
  };
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail('object');
  if (value.schemaVersion !== SEMANTIC_ACCEPTANCE_CLASS_SCHEMA) fail('schemaVersion');
  if (value.capability !== SEMANTIC_ACCEPTANCE_CAPABILITY) fail('capability');
  if (!SEMANTIC_CAPABILITY_ACCEPTANCE_CLASSES.includes(value.acceptanceClass)) fail('acceptanceClass');
  if (!SEMANTIC_DEV_ACCEPTANCE_RESULTS.includes(value.devResult)) fail('devResult');
  if (value.blocker !== null && !nonEmptyBounded(value.blocker)) fail('blocker');
  if (value.blockerSince !== null && !/^\d{4}-\d{2}-\d{2}$/.test(value.blockerSince)) fail('blockerSince');
  if (typeof value.syntheticOnly !== 'boolean') fail('syntheticOnly');
  if (value.syntheticOnly !== (value.acceptanceClass !== 'DEV_ACCEPTED')) fail('syntheticOnly-coherence');
  const decision = value.ownerDecision;
  if (decision === null || typeof decision !== 'object') fail('ownerDecision');
  if (decision.taskId !== '11.3') fail('ownerDecision.taskId');
  if (decision.state !== 'PENDING_OWNER_DECISION' && decision.state !== 'DECIDED') fail('ownerDecision.state');
  const unblockInvalid = validateUnblockPathRecord(decision.unblockPath);
  if (unblockInvalid.length > 0) fail(`ownerDecision.unblockPath:${unblockInvalid.join(',')}`);
  const closureInvalid = validatePermanentClosurePathRecord(decision.permanentClosurePath);
  if (closureInvalid.length > 0) fail(`ownerDecision.permanentClosurePath:${closureInvalid.join(',')}`);
  if (!Array.isArray(decision.consequences) || decision.consequences.length < 2 || decision.consequences.some((entry) => !nonEmptyBounded(entry))) {
    fail('ownerDecision.consequences');
  }
}

let cached: SemanticAcceptanceStatus | null = null;

/** The semantic capability's frozen acceptance-class record. */
export function semanticAcceptanceStatus(): SemanticAcceptanceStatus {
  if (cached === null) {
    const value = raw as unknown as SemanticAcceptanceStatus;
    validateSemanticAcceptanceStatus(value);
    cached = Object.freeze({
      ...value,
      ownerDecision: Object.freeze({
        ...value.ownerDecision,
        unblockPath: Object.freeze({ ...value.ownerDecision.unblockPath }),
        permanentClosurePath: Object.freeze({ ...value.ownerDecision.permanentClosurePath }),
        consequences: Object.freeze([...value.ownerDecision.consequences]),
      }),
    });
  }
  return cached;
}

/** The one-line render every surface uses: the class, the DEV result, and the
 *  blocker. A surface that presents the capability without this line does not
 *  render the class. */
export function renderSemanticAcceptanceClass(status: SemanticAcceptanceStatus = semanticAcceptanceStatus()): string {
  return [
    `${SEMANTIC_ACCEPTANCE_STATUS_TAGS.acceptanceClass}=${status.acceptanceClass}`,
    `${SEMANTIC_ACCEPTANCE_STATUS_TAGS.devResult}=${status.devResult}`,
    `${SEMANTIC_ACCEPTANCE_STATUS_TAGS.blocker}=${status.blocker ?? 'NONE'}`,
  ].join('; ');
}

const CAPABILITY_PRESENTATION_MARKERS: readonly RegExp[] = [
  /semantic oracle/i,
  /semantic layer/i,
  /src\/oracles\//,
  new RegExp(SEMANTIC_ACCEPTANCE_STATUS_TAGS.acceptanceClass),
];

export interface SemanticAcceptanceSurfaceVerdict {
  readonly surface: string;
  readonly presentsCapability: boolean;
  readonly rendersAcceptanceClass: boolean;
  readonly missing: readonly string[];
  readonly ok: boolean;
}

/** Check one surface: if it presents the semantic capability at all, it must
 *  render the class, the DEV result and the blocker. */
export function checkSemanticAcceptanceSurface(
  surface: string,
  text: string,
  status: SemanticAcceptanceStatus = semanticAcceptanceStatus(),
): SemanticAcceptanceSurfaceVerdict {
  const presentsCapability = CAPABILITY_PRESENTATION_MARKERS.some((marker) => marker.test(text));
  const required = [
    { token: status.acceptanceClass, tag: SEMANTIC_ACCEPTANCE_STATUS_TAGS.acceptanceClass },
    { token: status.devResult, tag: SEMANTIC_ACCEPTANCE_STATUS_TAGS.devResult },
    ...(status.blocker === null ? [] : [{ token: status.blocker, tag: SEMANTIC_ACCEPTANCE_STATUS_TAGS.blocker }]),
  ];
  const missing = required.filter((entry) => !text.includes(entry.token)).map((entry) => entry.tag);
  const rendersAcceptanceClass = missing.length === 0;
  return Object.freeze({
    surface,
    presentsCapability,
    rendersAcceptanceClass,
    missing: Object.freeze(missing),
    ok: !presentsCapability || rendersAcceptanceClass,
  });
}

/** The repository surfaces that present the capability to a reader. The
 *  Control Center presents it through the meta contract, which carries the
 *  same datum (see `ControlCenterMetaDto.semanticAcceptance`). */
export const SEMANTIC_ACCEPTANCE_PRESENTATION_SURFACES: readonly string[] = Object.freeze([
  'README.md',
  'docs/ARCHITECTURE.md',
]);
