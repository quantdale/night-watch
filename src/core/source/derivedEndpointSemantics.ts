// C-07 — derived endpoint semantics, and the DEV target funnel.
//
// `RIPPLE_ENDPOINT_SEMANTIC_REGISTRY` is intentionally `[]`, under a rule its
// own header states: "HTTP method is not a read/write contract. Only
// source-backed, exact rules may classify an API endpoint as KNOWN_READ or
// KNOWN_MUTATION." C-07's job is to DERIVE that registry from evidence the
// earlier campaigns established — not to repopulate it by hand, and not to
// revive the retired eleven-row catalog as safety authority.
//
// The derivation's honest result, measured over all 1,851 operations:
//
//   PROVEN_MUTATION_CAPABLE  1,107
//   READ_ONLY_METHOD_ONLY      485
//   UNSUPPORTED                179
//   CONDITIONAL_MUTATION        80
//   READ_ONLY_PROVEN             0   <- the class does not appear
//
// So the derived registry contains ZERO `KNOWN_READ` entries. The 485
// method-only operations are the temptation: promoting them would produce a
// registry that looks productive while asserting a read contract from an HTTP
// verb, which is exactly what the module above forbids and what C-06 spent a
// campaign disproving. They stay `UNKNOWN`.
//
// GENERATION IS NOT EXECUTION. Nothing here admits a target, issues a request,
// or grants authority. It observes what the unchanged admission chain decided
// and reports the funnel.
//
// Data-only: no filesystem, process or network authority.

export const DERIVED_SEMANTICS_VERSION = 'nightwatch.derived-endpoint-semantics.v1' as const;

/**
 * Derived classification. Wider than the legacy three-value type, because
 * `AMBIGUOUS` and `UNSUPPORTED` are different facts from `UNKNOWN` and
 * collapsing them would hide why an operation is not usable.
 */
export const DERIVED_SEMANTIC_CLASSIFICATIONS = [
  'KNOWN_READ', 'MUTATION_CAPABLE', 'UNKNOWN', 'AMBIGUOUS', 'UNSUPPORTED',
] as const;
export type DerivedSemanticClassification = (typeof DERIVED_SEMANTIC_CLASSIFICATIONS)[number];

/** The evidence class that produced a classification. Never prose. */
export const SEMANTIC_EVIDENCE_BASES = [
  'EFFECT_CLOSURE_PROOF',
  'EFFECT_CLOSURE_REFUTATION',
  'CONDITIONAL_MUTATION_EVIDENCE',
  /** GET verb and nothing else. Never sufficient for KNOWN_READ. */
  'METHOD_ONLY_NO_EFFECT_PROOF',
  'ROUTE_IDENTITY_UNPROVEN',
  'ANALYZER_UNSUPPORTED',
  'CONFLICTING_EVIDENCE',
] as const;
export type SemanticEvidenceBasis = (typeof SEMANTIC_EVIDENCE_BASES)[number];

/** The read-only classifications the source layer produces. */
export type SourceReadOnlyClassificationInput =
  | 'READ_ONLY_PROVEN' | 'PROVEN_MUTATION_CAPABLE' | 'CONDITIONAL_MUTATION'
  | 'READ_ONLY_METHOD_ONLY' | 'UNSUPPORTED' | 'PROVEN_READ_ONLY';

export interface DerivedSemanticEntry {
  readonly schemaVersion: typeof DERIVED_SEMANTICS_VERSION;
  readonly operationId: string;
  readonly repository: string;
  readonly method: string;
  readonly routeTemplate: string;
  readonly classification: DerivedSemanticClassification;
  /** Every entry names what produced it. A rule without this is not admitted. */
  readonly evidenceBasis: SemanticEvidenceBasis;
  readonly sourceReadOnlyClassification: string;
  readonly routeProof: string;
  readonly runtimeBinding: string;
  readonly sourceSha: string;
  readonly evidenceDigest: string;
}

export interface OperationSemanticInput {
  readonly operationId: string;
  readonly repository: string;
  readonly method: string;
  readonly routeTemplate: string;
  readonly readOnlyClassification: string;
  readonly routeProof: string;
  readonly runtimeBinding: string;
  readonly sourceSha: string;
  readonly evidenceDigest: string;
}

/**
 * Derive ONE operation's semantics.
 *
 * The `READ_ONLY_METHOD_ONLY` branch is the load-bearing one: it yields
 * `UNKNOWN` with basis `METHOD_ONLY_NO_EFFECT_PROOF`, never `KNOWN_READ`.
 */
export function deriveSemantics(operation: OperationSemanticInput): DerivedSemanticEntry {
  const base = {
    schemaVersion: DERIVED_SEMANTICS_VERSION,
    operationId: operation.operationId,
    repository: operation.repository,
    method: operation.method,
    routeTemplate: operation.routeTemplate,
    sourceReadOnlyClassification: operation.readOnlyClassification,
    routeProof: operation.routeProof,
    runtimeBinding: operation.runtimeBinding,
    sourceSha: operation.sourceSha,
    evidenceDigest: operation.evidenceDigest,
  } as const;

  // An unproven route identity taints everything downstream: we do not know
  // WHICH operation the evidence is about, so the evidence cannot classify it.
  if (operation.routeProof !== 'PROVEN') {
    return Object.freeze({ ...base, classification: 'AMBIGUOUS', evidenceBasis: 'ROUTE_IDENTITY_UNPROVEN' });
  }
  switch (operation.readOnlyClassification) {
    case 'READ_ONLY_PROVEN':
    case 'PROVEN_READ_ONLY':
      return Object.freeze({ ...base, classification: 'KNOWN_READ', evidenceBasis: 'EFFECT_CLOSURE_PROOF' });
    case 'PROVEN_MUTATION_CAPABLE':
      return Object.freeze({ ...base, classification: 'MUTATION_CAPABLE', evidenceBasis: 'EFFECT_CLOSURE_REFUTATION' });
    case 'CONDITIONAL_MUTATION':
      // Conditional is still capable. A flag that currently disables a write
      // is not a proof that the write cannot happen.
      return Object.freeze({ ...base, classification: 'MUTATION_CAPABLE', evidenceBasis: 'CONDITIONAL_MUTATION_EVIDENCE' });
    case 'READ_ONLY_METHOD_ONLY':
      // 485 operations land here. Promoting them to KNOWN_READ would assert a
      // read contract from an HTTP verb.
      return Object.freeze({ ...base, classification: 'UNKNOWN', evidenceBasis: 'METHOD_ONLY_NO_EFFECT_PROOF' });
    case 'UNSUPPORTED':
      return Object.freeze({ ...base, classification: 'UNSUPPORTED', evidenceBasis: 'ANALYZER_UNSUPPORTED' });
    default:
      // An unrecognised input is a conflict, not a default. Failing closed to
      // AMBIGUOUS keeps an unknown vocabulary member from silently becoming a
      // usable classification.
      return Object.freeze({ ...base, classification: 'AMBIGUOUS', evidenceBasis: 'CONFLICTING_EVIDENCE' });
  }
}

export interface DerivedSemanticRegistry {
  readonly schemaVersion: typeof DERIVED_SEMANTICS_VERSION;
  readonly operationCount: number;
  readonly entryCount: number;
  /** Totality: every operation gets an entry, by construction and assertion. */
  readonly totalityHolds: boolean;
  readonly byClassification: Readonly<Record<DerivedSemanticClassification, number>>;
  readonly byEvidenceBasis: Readonly<Record<string, number>>;
  readonly entries: readonly DerivedSemanticEntry[];
  /** Restated as data: a classification is information, not permission. */
  readonly grantsRequestAuthority: false;
}

/** Derive the whole registry. Totality is structural. */
export function deriveEndpointSemanticRegistry(operations: readonly OperationSemanticInput[]): DerivedSemanticRegistry {
  const entries = operations.map(deriveSemantics);
  const byClassification = Object.fromEntries(DERIVED_SEMANTIC_CLASSIFICATIONS.map((value) => [value, 0])) as Record<DerivedSemanticClassification, number>;
  const byEvidenceBasis: Record<string, number> = Object.fromEntries(SEMANTIC_EVIDENCE_BASES.map((value) => [value, 0]));
  for (const entry of entries) {
    byClassification[entry.classification] += 1;
    byEvidenceBasis[entry.evidenceBasis] = (byEvidenceBasis[entry.evidenceBasis] ?? 0) + 1;
  }
  return Object.freeze({
    schemaVersion: DERIVED_SEMANTICS_VERSION,
    operationCount: operations.length,
    entryCount: entries.length,
    totalityHolds: operations.length === entries.length,
    byClassification: Object.freeze(byClassification),
    byEvidenceBasis: Object.freeze(byEvidenceBasis),
    entries: Object.freeze(entries),
    grantsRequestAuthority: false as const,
  });
}

// --- the DEV target funnel -------------------------------------------------

/** Why a candidate did not become an eligible DEV target. */
export const TARGET_REJECTION_REASONS = [
  'NOT_KNOWN_READ',
  'MUTATION_CAPABLE',
  'SEMANTICS_UNKNOWN',
  'SEMANTICS_AMBIGUOUS',
  'SEMANTICS_UNSUPPORTED',
  'RUNTIME_BINDING_ABSENT',
  'SOURCE_STALE',
  'ADMISSION_CHAIN_EXCLUDED',
] as const;
export type TargetRejectionReason = (typeof TARGET_REJECTION_REASONS)[number];

export interface GeneratedTarget {
  readonly targetId: string;
  readonly operationId: string;
  readonly classification: DerivedSemanticClassification;
  readonly evidenceBasis: SemanticEvidenceBasis;
  /** Set only when the UNCHANGED admission chain admitted the operation. */
  readonly admittedByExistingChain: boolean;
  readonly rejectionReason: TargetRejectionReason | null;
}

export interface DevTargetFunnel {
  readonly schemaVersion: typeof DERIVED_SEMANTICS_VERSION;
  readonly consideredCount: number;
  readonly generatedCount: number;
  readonly eligibleCount: number;
  readonly rejectedCount: number;
  readonly byRejectionReason: Readonly<Record<string, number>>;
  /** Counts §66 asks for, each measured rather than estimated. */
  readonly mutationCapableCount: number;
  readonly unknownCount: number;
  readonly staleCount: number;
  readonly eligible: readonly GeneratedTarget[];
  readonly rejected: readonly GeneratedTarget[];
  /** Restated: generation is not execution. */
  readonly grantsRequestAuthority: false;
}

/**
 * Build the funnel.
 *
 * `admittedOperationIds` comes from the EXISTING admission chain. This function
 * cannot admit anything: it reads that decision. If the chain admits nothing,
 * the eligible set is empty and every rejection carries its reason — which is
 * the honest output, not a signal to relax a threshold.
 */
export function generateDevTargets(input: {
  readonly registry: DerivedSemanticRegistry;
  readonly admittedOperationIds: ReadonlySet<string>;
  readonly staleOperationIds?: ReadonlySet<string>;
  readonly runtimeBoundOperationIds?: ReadonlySet<string>;
}): DevTargetFunnel {
  const stale = input.staleOperationIds ?? new Set<string>();
  const runtimeBound = input.runtimeBoundOperationIds ?? new Set<string>();
  const eligible: GeneratedTarget[] = [];
  const rejected: GeneratedTarget[] = [];
  const byRejectionReason: Record<string, number> = Object.fromEntries(TARGET_REJECTION_REASONS.map((value) => [value, 0]));
  let mutationCapable = 0;
  let unknown = 0;
  let staleCount = 0;

  for (const entry of input.registry.entries) {
    if (entry.classification === 'MUTATION_CAPABLE') mutationCapable += 1;
    if (entry.classification === 'UNKNOWN') unknown += 1;
    if (stale.has(entry.operationId)) staleCount += 1;

    const reject = (reason: TargetRejectionReason) => {
      byRejectionReason[reason] = (byRejectionReason[reason] ?? 0) + 1;
      rejected.push(Object.freeze({
        targetId: `t:${entry.operationId}`, operationId: entry.operationId,
        classification: entry.classification, evidenceBasis: entry.evidenceBasis,
        admittedByExistingChain: false, rejectionReason: reason,
      }));
    };

    // Ordered so the FIRST failing precondition is the reported reason, which
    // keeps the funnel legible instead of attributing every rejection to the
    // last check that happened to run.
    if (stale.has(entry.operationId)) { reject('SOURCE_STALE'); continue; }
    if (entry.classification === 'MUTATION_CAPABLE') { reject('MUTATION_CAPABLE'); continue; }
    if (entry.classification === 'AMBIGUOUS') { reject('SEMANTICS_AMBIGUOUS'); continue; }
    if (entry.classification === 'UNSUPPORTED') { reject('SEMANTICS_UNSUPPORTED'); continue; }
    if (entry.classification === 'UNKNOWN') { reject('SEMANTICS_UNKNOWN'); continue; }
    if (entry.classification !== 'KNOWN_READ') { reject('NOT_KNOWN_READ'); continue; }
    if (!runtimeBound.has(entry.operationId)) { reject('RUNTIME_BINDING_ABSENT'); continue; }
    // The final word belongs to the existing chain, never to this module.
    if (!input.admittedOperationIds.has(entry.operationId)) { reject('ADMISSION_CHAIN_EXCLUDED'); continue; }
    eligible.push(Object.freeze({
      targetId: `t:${entry.operationId}`, operationId: entry.operationId,
      classification: entry.classification, evidenceBasis: entry.evidenceBasis,
      admittedByExistingChain: true, rejectionReason: null,
    }));
  }

  return Object.freeze({
    schemaVersion: DERIVED_SEMANTICS_VERSION,
    consideredCount: input.registry.entries.length,
    generatedCount: eligible.length + rejected.length,
    eligibleCount: eligible.length,
    rejectedCount: rejected.length,
    byRejectionReason: Object.freeze(byRejectionReason),
    mutationCapableCount: mutationCapable,
    unknownCount: unknown,
    staleCount,
    eligible: Object.freeze(eligible),
    rejected: Object.freeze(rejected),
    grantsRequestAuthority: false as const,
  });
}

/**
 * The ONLY set EIG may order. §67 lets EIG choose ordering among
 * already-admissible targets and forbids it overriding safety, so an
 * inadmissible target must have no path to a rank — a ranked list is something
 * an operator reads as a work queue, and a high score sitting above an
 * inadmissible entry in one is exactly the confusion to prevent.
 */
export function orderableTargets(funnel: DevTargetFunnel): readonly GeneratedTarget[] {
  return funnel.eligible;
}
