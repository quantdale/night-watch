// F-12 — release definition and verdict (`nightwatch.release-certification.v1`).
//
// This module turns "what would advance PROJECT_COMPLETION_STATUS" into data
// and a deterministic judgement. It is PURE: no filesystem, process, network,
// clock or persistence authority. The caller (bin/project-state-check.mjs)
// supplies the project truth block's completion status and checkpoint, the
// lane-state counts, the external production-track status, and the output of
// the check named by each advance condition. Every condition result therefore
// resolves from a check's output; a condition that names no registered check
// fails the definition itself.
//
// The production path (C-12 → C-14, P4) is deliberately NOT an advance
// condition: it is externally gated and is reported as a separate track.
//
// Vocabulary:
//   MET                     the named check passed at the certified checkpoint
//   UNMET                   the named check ran and failed
//   UNAVAILABLE_CAPABILITY  the named check exists elsewhere but not here yet
//   BLOCKED_EXTERNAL        the named check is blocked by an external party
//   STALE_EVIDENCE          the condition evidence predates the certified
//                           checkpoint, so it is unmet and the certification is
//                           refused
//
// 13.8 is an owner decision and is represented faithfully: `nextStatus.state`
// is PENDING_OWNER_DECISION and the safe default stays OPERATIONALLY_ACCEPTED
// until the owner names the next status. No code here invents that name.

export const RELEASE_CERTIFICATION_VERSION = 'nightwatch.release-certification.v1' as const;
export const RELEASE_CERTIFICATION_DEFINITION_PATH = 'config/release-certification.v1.json' as const;

export const RELEASE_CONDITION_STATES = [
  'MET',
  'UNMET',
  'UNAVAILABLE_CAPABILITY',
  'BLOCKED_EXTERNAL',
  'STALE_EVIDENCE',
] as const;

export type ReleaseConditionState = (typeof RELEASE_CONDITION_STATES)[number];
export type ReleaseCheckState = Exclude<ReleaseConditionState, 'STALE_EVIDENCE'>;

export interface ReleaseCheckOutput {
  readonly state: ReleaseCheckState;
  readonly detail: string;
}

export interface ReleaseAdvanceCheck {
  readonly id: string;
  readonly title: string;
  /** The capability group whose work creates the check; null for existing checks. */
  readonly capabilityGroup: string | null;
  /** False until the programme group that creates the check has landed. */
  readonly implemented: boolean;
  /** The artifact or command whose output the check resolves from. */
  readonly evidenceOrigin: string;
}

export const RELEASE_ADVANCE_CHECKS: readonly ReleaseAdvanceCheck[] = Object.freeze([
  { id: 'validation-lane-state', title: 'validation lane state resolves every declared class', capabilityGroup: 'G2', implemented: true, evidenceOrigin: 'config/validation-lane-state.v1.json + config/validation-universe.v1.json' },
  { id: 'ci-block-record', title: 'exact-head CI executed or its block record is current', capabilityGroup: 'G3', implemented: true, evidenceOrigin: 'project-state block CI anchors + lane exact-checkpoint-ci' },
  { id: 'yield-campaign-result', title: 'autonomous yield campaign completed with per-case reasons', capabilityGroup: 'G12', implemented: false, evidenceOrigin: 'group-12 yield campaign result' },
  { id: 'ledger-agreement', title: 'change ledger and spec baseline agree with task truth', capabilityGroup: 'G1', implemented: true, evidenceOrigin: 'bin/agent-state.mjs ledger diagnostics' },
  { id: 'operator-cli-sweep', title: 'CLI contract sweep passes over every entry point', capabilityGroup: 'G4', implemented: true, evidenceOrigin: 'bin/lib/operator-command-listing.mjs static listing + sweep suite' },
  { id: 'documentation-currency-rules', title: 'document-role and status-ledger checks pass', capabilityGroup: 'G7', implemented: true, evidenceOrigin: 'bin/hardening-check.mjs' },
  { id: 'workspace-claims', title: 'no workspace claim names a terminal task and no legacy record is undisposed', capabilityGroup: 'G6', implemented: true, evidenceOrigin: 'bin/agent-state.mjs claim and legacy diagnostics' },
  { id: 'dependency-advisory-lane', title: 'dependency assessment executed or currently recorded unavailable', capabilityGroup: 'G9', implemented: true, evidenceOrigin: 'lane dependency-advisory in config/validation-lane-state.v1.json' },
  { id: 'dead-architecture-closure-check', title: 'no unreferenced module and no unremoved unimported barrel', capabilityGroup: 'G14', implemented: false, evidenceOrigin: 'group-14 reachability and retention check' },
  { id: 'cli-implementation-contract', title: 'loader paths and symbols resolve, bin type-checks, every entry point has an executing test', capabilityGroup: 'G15', implemented: true, evidenceOrigin: 'config/bin-typecheck.v1.json + bin/lib/cli-implementation-contract.mjs' },
  { id: 'structural-rule-registry', title: 'every structural rule is comment-proof, occurrence-complete and mutation-probed', capabilityGroup: 'G16', implemented: true, evidenceOrigin: 'bin/hardening-check.mjs --list-rules' },
  { id: 'schema-version-lifecycle-check', title: 'every schema identifier is declared and no persisted bump lacks a disposition', capabilityGroup: 'G17', implemented: false, evidenceOrigin: 'group-17 schema lifecycle check' },
  { id: 'ui-error-taxonomy-check', title: 'every ApiErrorKind renders distinguishably through the failure path', capabilityGroup: 'G18', implemented: false, evidenceOrigin: 'group-18 UI render harness' },
  { id: 'configuration-contract-check', title: 'every environment variable is declared, validated and printable', capabilityGroup: 'G19', implemented: false, evidenceOrigin: 'group-19 configuration contract check' },
  { id: 'accessibility-certification', title: 'no colour-only status distinction, contrast pairs meet their ratio, workflows complete by keyboard', capabilityGroup: 'G20', implemented: true, evidenceOrigin: 'tests/unit/accessibilityAudit.test.ts + tests/browser/accessibilityCertification.browser.ts' },
  { id: 'authenticated-capability-lifecycle-check', title: 'every authenticated lane pre-flights its artefact and refuses a non-VALID one before any effect', capabilityGroup: 'G21', implemented: false, evidenceOrigin: 'group-21 capture-sidecar pre-flight' },
]);

const CHECK_BY_ID = new Map(RELEASE_ADVANCE_CHECKS.map((check) => [check.id, check]));

export interface ReleaseCertificationNextStatus {
  readonly state: 'PENDING_OWNER_DECISION';
  readonly safeDefault: string;
  readonly ownerDecision: string;
  readonly statement: string;
}

export interface ReleaseCertificationExternalTrack {
  readonly id: string;
  readonly stages: readonly string[];
  readonly excludedFromAdvanceConditions: boolean;
  readonly checks: readonly string[];
  readonly statement: string;
}

export interface ReleaseAdvanceConditionDefinition {
  readonly id: string;
  readonly order: number;
  readonly title: string;
  readonly check: string;
  /** A 40-hex SHA, the 'HEAD' marker, or null when no evidence was earned. */
  readonly evidenceSha: string | null;
  readonly evidence: string;
}

export interface ReleaseCertificationDefinition {
  readonly schemaVersion: string;
  readonly definitionName: string;
  readonly certifiedCheckpointField: string;
  readonly advanceStatuses: readonly string[];
  readonly nextStatus: ReleaseCertificationNextStatus;
  readonly externalTrack: ReleaseCertificationExternalTrack;
  readonly presentationSurfaces: readonly string[];
  readonly conditions: readonly ReleaseAdvanceConditionDefinition[];
}

export interface ReleaseDefinitionError {
  readonly code: string;
  readonly detail: string;
}

const SHA_RE = /^[0-9a-f]{40}$/i;
const EVIDENCE_SHA_RE = /^(?:HEAD|[0-9a-f]{40})$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const entries = value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
  return entries.length === value.length ? entries : null;
}

/**
 * Structural validation of the certification record. Every condition must
 * name a check registered in RELEASE_ADVANCE_CHECKS; a condition with no
 * backing check fails the definition itself. A condition may not name a check
 * on the excluded external production track.
 */
export function parseReleaseCertificationDefinition(record: unknown): {
  readonly ok: boolean;
  readonly errors: readonly ReleaseDefinitionError[];
  readonly definition: ReleaseCertificationDefinition | null;
} {
  const errors: ReleaseDefinitionError[] = [];
  if (!isRecord(record)) {
    return { ok: false, errors: [{ code: 'RELEASE_DEFINITION_UNREADABLE', detail: 'the certification record is not an object' }], definition: null };
  }
  if (record.schemaVersion !== RELEASE_CERTIFICATION_VERSION) {
    errors.push({ code: 'RELEASE_DEFINITION_SCHEMA_UNSUPPORTED', detail: String(record.schemaVersion ?? 'ABSENT') });
  }
  const definitionName = typeof record.definitionName === 'string' ? record.definitionName : '';
  if (definitionName.trim() === '') errors.push({ code: 'RELEASE_DEFINITION_NAME_MISSING', detail: 'definitionName' });
  const certifiedCheckpointField = typeof record.certifiedCheckpointField === 'string' ? record.certifiedCheckpointField : '';
  if (!/^[A-Z][A-Z0-9_]*$/.test(certifiedCheckpointField)) {
    errors.push({ code: 'RELEASE_DEFINITION_CHECKPOINT_FIELD_INVALID', detail: String(record.certifiedCheckpointField ?? 'ABSENT') });
  }
  const advanceStatuses = toStringArray(record.advanceStatuses);
  if (advanceStatuses === null || advanceStatuses.length === 0) {
    errors.push({ code: 'RELEASE_DEFINITION_ADVANCE_STATUSES_INVALID', detail: 'advanceStatuses must be a non-empty string array' });
  }

  const nextStatusRaw = record.nextStatus;
  let nextStatus: ReleaseCertificationNextStatus | null = null;
  if (!isRecord(nextStatusRaw)) {
    errors.push({ code: 'RELEASE_DEFINITION_NEXT_STATUS_INVALID', detail: 'nextStatus must be an object' });
  } else {
    const state = nextStatusRaw.state;
    const safeDefault = nextStatusRaw.safeDefault;
    const ownerDecision = nextStatusRaw.ownerDecision;
    const statement = nextStatusRaw.statement;
    if (state !== 'PENDING_OWNER_DECISION') errors.push({ code: 'RELEASE_DEFINITION_NEXT_STATUS_STATE', detail: String(state ?? 'ABSENT') });
    if (typeof safeDefault !== 'string' || safeDefault.length === 0) errors.push({ code: 'RELEASE_DEFINITION_NEXT_STATUS_SAFE_DEFAULT', detail: String(safeDefault ?? 'ABSENT') });
    if (typeof ownerDecision !== 'string' || ownerDecision.length === 0) errors.push({ code: 'RELEASE_DEFINITION_NEXT_STATUS_OWNER_DECISION', detail: String(ownerDecision ?? 'ABSENT') });
    if (typeof statement !== 'string' || statement.length === 0) errors.push({ code: 'RELEASE_DEFINITION_NEXT_STATUS_STATEMENT', detail: 'statement' });
    if (
      state === 'PENDING_OWNER_DECISION'
      && typeof safeDefault === 'string' && safeDefault.length > 0
      && typeof ownerDecision === 'string' && ownerDecision.length > 0
      && typeof statement === 'string' && statement.length > 0
    ) {
      nextStatus = { state, safeDefault, ownerDecision, statement };
    }
  }

  const externalRaw = record.externalTrack;
  let externalTrack: ReleaseCertificationExternalTrack | null = null;
  if (!isRecord(externalRaw)) {
    errors.push({ code: 'RELEASE_DEFINITION_EXTERNAL_TRACK_INVALID', detail: 'externalTrack must be an object' });
  } else {
    const id = externalRaw.id;
    const stages = toStringArray(externalRaw.stages);
    const checks = toStringArray(externalRaw.checks);
    const statement = externalRaw.statement;
    const excluded = externalRaw.excludedFromAdvanceConditions;
    if (typeof id !== 'string' || id.length === 0) errors.push({ code: 'RELEASE_DEFINITION_EXTERNAL_TRACK_ID', detail: String(id ?? 'ABSENT') });
    if (stages === null) errors.push({ code: 'RELEASE_DEFINITION_EXTERNAL_TRACK_STAGES', detail: 'stages must be a string array' });
    if (checks === null) errors.push({ code: 'RELEASE_DEFINITION_EXTERNAL_TRACK_CHECKS', detail: 'checks must be a string array' });
    if (excluded !== true) errors.push({ code: 'RELEASE_DEFINITION_EXTERNAL_TRACK_EXCLUSION', detail: 'excludedFromAdvanceConditions must be true' });
    if (typeof statement !== 'string' || statement.length === 0) errors.push({ code: 'RELEASE_DEFINITION_EXTERNAL_TRACK_STATEMENT', detail: 'statement' });
    if (
      typeof id === 'string' && id.length > 0 && stages !== null && checks !== null && excluded === true
      && typeof statement === 'string' && statement.length > 0
    ) {
      externalTrack = { id, stages, excludedFromAdvanceConditions: true, checks, statement };
    }
  }

  const presentationSurfaces = toStringArray(record.presentationSurfaces);
  if (presentationSurfaces === null || presentationSurfaces.length === 0) {
    errors.push({ code: 'RELEASE_DEFINITION_PRESENTATION_SURFACES_INVALID', detail: 'presentationSurfaces must be a non-empty string array' });
  }

  const conditions: ReleaseAdvanceConditionDefinition[] = [];
  const rawConditions = record.conditions;
  if (!Array.isArray(rawConditions) || rawConditions.length === 0) {
    errors.push({ code: 'RELEASE_DEFINITION_CONDITIONS_EMPTY', detail: 'conditions must be a non-empty array' });
  } else {
    const seenIds = new Set<string>();
    for (const raw of rawConditions) {
      if (!isRecord(raw)) {
        errors.push({ code: 'RELEASE_DEFINITION_CONDITION_INVALID', detail: 'a condition entry is not an object' });
        continue;
      }
      const id = typeof raw.id === 'string' ? raw.id : '';
      const title = typeof raw.title === 'string' ? raw.title : '';
      const check = typeof raw.check === 'string' ? raw.check : '';
      const evidence = typeof raw.evidence === 'string' ? raw.evidence : '';
      const order = typeof raw.order === 'number' && Number.isInteger(raw.order) ? raw.order : -1;
      const evidenceShaRaw = raw.evidenceSha;
      const evidenceSha = typeof evidenceShaRaw === 'string' && evidenceShaRaw.length > 0 ? evidenceShaRaw : null;
      if (id === '') errors.push({ code: 'RELEASE_DEFINITION_CONDITION_ID', detail: 'a condition has no id' });
      else if (seenIds.has(id)) errors.push({ code: 'RELEASE_DEFINITION_CONDITION_DUPLICATE', detail: id });
      if (id !== '') seenIds.add(id);
      if (title.trim() === '') errors.push({ code: 'RELEASE_DEFINITION_CONDITION_TITLE', detail: id });
      if (evidence.trim() === '') errors.push({ code: 'RELEASE_DEFINITION_CONDITION_EVIDENCE', detail: id });
      if (!Number.isInteger(order) || order <= 0) errors.push({ code: 'RELEASE_DEFINITION_CONDITION_ORDER', detail: id });
      if (evidenceSha !== null && !EVIDENCE_SHA_RE.test(evidenceSha)) {
        errors.push({ code: 'RELEASE_DEFINITION_CONDITION_EVIDENCE_SHA', detail: `${id}: ${evidenceSha}` });
      }
      // F-12: a condition with no backing check fails the definition itself.
      if (!CHECK_BY_ID.has(check)) {
        errors.push({ code: 'RELEASE_DEFINITION_CHECK_UNBACKED', detail: `${id}: ${check || 'ABSENT'}` });
      }
      if (externalTrack !== null && externalTrack.checks.includes(check)) {
        errors.push({ code: 'RELEASE_DEFINITION_PRODUCTION_CONDITION', detail: `${id}: ${check}` });
      }
      conditions.push({ id, order, title, check, evidenceSha, evidence });
    }
    const orders = conditions.map((condition) => condition.order).sort((left, right) => left - right);
    for (let index = 0; index < orders.length; index += 1) {
      if (orders[index] !== index + 1) {
        errors.push({ code: 'RELEASE_DEFINITION_ORDER_INVALID', detail: orders.join(',') });
        break;
      }
    }
  }

  if (
    errors.length > 0
    || nextStatus === null
    || externalTrack === null
    || advanceStatuses === null
    || presentationSurfaces === null
  ) {
    return { ok: false, errors, definition: null };
  }
  return {
    ok: true,
    errors,
    definition: {
      schemaVersion: RELEASE_CERTIFICATION_VERSION,
      definitionName,
      certifiedCheckpointField,
      advanceStatuses,
      nextStatus,
      externalTrack,
      presentationSurfaces,
      conditions: [...conditions].sort((left, right) => left.order - right.order),
    },
  };
}

export interface ReleaseLaneCounts {
  readonly proven: number;
  readonly externallyBlocked: number;
  readonly neverAttempted: number;
  readonly staleEvidence: number;
}

export interface ReleaseExternalTrackReport {
  readonly id: string;
  readonly stages: readonly string[];
  readonly state: string;
  readonly detail: string;
}

export interface ReleaseConditionResult {
  readonly id: string;
  readonly order: number;
  readonly title: string;
  readonly check: string;
  readonly capabilityGroup: string | null;
  readonly state: ReleaseConditionState;
  readonly detail: string;
  readonly boundEvidenceSha: string | null;
  readonly resolvedEvidenceSha: string | null;
  readonly staleEvidence: boolean;
}

export interface ReleaseVerdict {
  readonly schemaVersion: string;
  readonly definitionName: string;
  readonly certifiedCheckpointSha: string | null;
  readonly liveHeadSha: string | null;
  readonly projectCompletionStatus: string;
  readonly nextStatus: ReleaseCertificationNextStatus;
  readonly laneCounts: ReleaseLaneCounts;
  readonly conditions: readonly ReleaseConditionResult[];
  readonly conditionsMet: number;
  readonly conditionsUnmet: number;
  readonly advanceClaimed: boolean;
  readonly advanceRefused: boolean;
  readonly certificationRefused: boolean;
  readonly staleEvidenceConditions: readonly string[];
  readonly externalTrack: ReleaseExternalTrackReport;
  readonly definitionErrors: readonly ReleaseDefinitionError[];
}

export interface ReleaseEvaluationInput {
  readonly definition: ReleaseCertificationDefinition;
  readonly checkOutputs: Readonly<Record<string, ReleaseCheckOutput>>;
  readonly certifiedCheckpointSha: string | null;
  readonly liveHeadSha: string | null;
  readonly projectCompletionStatus: string;
  readonly laneCounts: ReleaseLaneCounts;
  readonly externalTrack: ReleaseExternalTrackReport;
  /**
   * Answers whether the first commit is an ancestor of the second. A null
   * answer means ancestry could not be established; staleness is then not
   * asserted (the evidence is reported with a null resolution instead).
   */
  readonly isAncestor?: ((ancestor: string, descendant: string) => boolean | null) | undefined;
}

function resolveEvidenceSha(bound: string | null, liveHeadSha: string | null): string | null {
  if (bound === null) return null;
  if (/^HEAD$/i.test(bound)) return liveHeadSha;
  return bound;
}

/**
 * Evaluate the ordered conditions against the supplied check outputs and bind
 * each condition's evidence SHA to the certified checkpoint. A condition whose
 * evidence strictly precedes the checkpoint reports STALE_EVIDENCE, is unmet,
 * and refuses the certification.
 */
export function evaluateReleaseCertification(input: ReleaseEvaluationInput): ReleaseVerdict {
  const definition = input.definition;
  const conditions: ReleaseConditionResult[] = definition.conditions.map((condition) => {
    const check = CHECK_BY_ID.get(condition.check);
    const output = input.checkOutputs[condition.check];
    let state: ReleaseConditionState;
    let detail: string;
    if (output !== undefined) {
      state = output.state;
      detail = output.detail;
    } else if (check !== undefined && !check.implemented) {
      state = 'UNAVAILABLE_CAPABILITY';
      detail = `check '${condition.check}' is registered and its capability is created by ${check.capabilityGroup ?? 'a later group'}; the check is not present at this checkpoint`;
    } else {
      state = 'UNAVAILABLE_CAPABILITY';
      detail = `check '${condition.check}' produced no output at this checkpoint`;
    }
    const resolvedEvidenceSha = resolveEvidenceSha(condition.evidenceSha, input.liveHeadSha);
    let staleEvidence = false;
    // Staleness is a property of the bound evidence, not of the check's
    // current fortune: evidence earned at an ancestor cannot certify a
    // descendant whether or not the check would pass today.
    if (
      resolvedEvidenceSha !== null
      && input.certifiedCheckpointSha !== null
      && SHA_RE.test(resolvedEvidenceSha)
      && SHA_RE.test(input.certifiedCheckpointSha)
      && resolvedEvidenceSha !== input.certifiedCheckpointSha
      && input.isAncestor !== undefined
      && input.isAncestor(resolvedEvidenceSha, input.certifiedCheckpointSha) === true
    ) {
      staleEvidence = true;
      state = 'STALE_EVIDENCE';
      detail = `${detail}; evidence ${resolvedEvidenceSha} precedes certified checkpoint ${input.certifiedCheckpointSha}`;
    }
    return {
      id: condition.id,
      order: condition.order,
      title: condition.title,
      check: condition.check,
      capabilityGroup: check?.capabilityGroup ?? null,
      state,
      detail,
      boundEvidenceSha: condition.evidenceSha,
      resolvedEvidenceSha,
      staleEvidence,
    };
  });

  const conditionsMet = conditions.filter((condition) => condition.state === 'MET').length;
  const unmet = conditions.filter((condition) => condition.state !== 'MET');
  const staleEvidenceConditions = conditions.filter((condition) => condition.staleEvidence).map((condition) => condition.id);
  const advanceClaimed = definition.advanceStatuses.includes(input.projectCompletionStatus);
  const certificationRefused = staleEvidenceConditions.length > 0;
  const advanceRefused = advanceClaimed && (unmet.length > 0 || certificationRefused);

  return {
    schemaVersion: RELEASE_CERTIFICATION_VERSION,
    definitionName: definition.definitionName,
    certifiedCheckpointSha: input.certifiedCheckpointSha,
    liveHeadSha: input.liveHeadSha,
    projectCompletionStatus: input.projectCompletionStatus,
    nextStatus: definition.nextStatus,
    laneCounts: input.laneCounts,
    conditions,
    conditionsMet,
    conditionsUnmet: conditions.length - conditionsMet,
    advanceClaimed,
    advanceRefused,
    certificationRefused,
    staleEvidenceConditions,
    externalTrack: input.externalTrack,
    definitionErrors: [],
  };
}

// ---------------------------------------------------------------------------
// Verdict presentation guard (13.5). The verdict vocabulary distinguishes
// what is proven from what is externally blocked from what was never
// attempted, and the three counts are not optional decoration: a surface that
// presents PROJECT_COMPLETION_STATUS without them fails the render guard.
// ---------------------------------------------------------------------------

export const RELEASE_VERDICT_STATUS_MARKER = 'status:PROJECT_COMPLETION_STATUS=';
export const RELEASE_VERDICT_COUNT_MARKERS = [
  'status:VALIDATION_LANE_PROVEN_COUNT=',
  'status:VALIDATION_LANE_BLOCKED_EXTERNAL_COUNT=',
  'status:VALIDATION_LANE_UNAVAILABLE_CAPABILITY_COUNT=',
] as const;

/**
 * Returns the missing count markers when a surface presents the completion
 * status; an empty array either when the status is absent or when every
 * required count accompanies it.
 */
export function checkVerdictPresentation(text: string): readonly string[] {
  if (!text.includes(RELEASE_VERDICT_STATUS_MARKER)) return [];
  return RELEASE_VERDICT_COUNT_MARKERS.filter((marker) => !text.includes(marker));
}

/** Render the verdict as a compact, count-bearing text surface. */
export function renderReleaseVerdictText(verdict: ReleaseVerdict): string {
  const stateCounts = new Map<string, number>();
  for (const condition of verdict.conditions) {
    stateCounts.set(condition.state, (stateCounts.get(condition.state) ?? 0) + 1);
  }
  const lines = [
    `release verdict ${verdict.schemaVersion}`,
    `status ${verdict.projectCompletionStatus}`,
    `lanes proven=${verdict.laneCounts.proven} externallyBlocked=${verdict.laneCounts.externallyBlocked} neverAttempted=${verdict.laneCounts.neverAttempted} staleEvidence=${verdict.laneCounts.staleEvidence}`,
    `nextStatus ${verdict.nextStatus.state} safeDefault=${verdict.nextStatus.safeDefault} ownerDecision=${verdict.nextStatus.ownerDecision}`,
    `checkpoint ${verdict.certifiedCheckpointSha ?? 'NONE'}`,
    `conditions met=${verdict.conditionsMet}/${verdict.conditions.length} advanceClaimed=${String(verdict.advanceClaimed)} advanceRefused=${String(verdict.advanceRefused)} certificationRefused=${String(verdict.certificationRefused)}`,
    `externalTrack ${verdict.externalTrack.id} state=${verdict.externalTrack.state}`,
  ];
  for (const condition of verdict.conditions) {
    lines.push(`  ${String(condition.order).padStart(2, '0')} ${condition.id} state=${condition.state} evidenceSha=${condition.resolvedEvidenceSha ?? 'NONE'} detail=${condition.detail}`);
  }
  return `${lines.join('\n')}\n`;
}
