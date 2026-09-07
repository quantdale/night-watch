// ---------------------------------------------------------------------------
// W9 frozen contract — current-source mechanical reproduction proof.
//
// WHY A SECOND PROOF KIND EXISTS
// A historical mined case has a hidden fix commit, so Nightwatch can execute
// the same test twice and observe pre-fix FAIL / post-fix PASS. That
// discriminator is the whole strength of `PRE_FAIL_POST_PASS`. Current
// owner-local source has NO known post-fix revision: there is nothing to run
// "after the fix" because no fix exists. Reusing the historical receipt shape
// for current source would therefore require inventing a post-fix PASS that
// was never observed.
//
// So current-source reproduction gets its OWN explicit, weaker, clearly
// labelled proof kind, and admission treats it through a separate branch.
// Historical receipts keep byte-identical semantics.
//
// ANTI-INFLATION (load-bearing)
// A qualifying current-source proof requires ALL of:
//   - a host-derived executable target (never a model-supplied command);
//   - a pre-existing repository test as the discriminator (a model-authored
//     test never qualifies in v1);
//   - an actual test/assertion failure class — build, environment, timeout
//     and process failures are explicitly non-qualifying;
//   - the same stable failure fingerprint in >= MIN_CURRENT_SOURCE_EXECUTIONS
//     fresh disposable executions;
//   - no network and no sibling mutation observed by the executor;
//   - Nightwatch-minted provenance bound to the inspecting provider.
//
// Pure data + validation. No fs/network/process/AI authority.
// ---------------------------------------------------------------------------

export const OWNER_LOCAL_CURRENT_SOURCE_PROOF_VERSION =
  'nightwatch.owner-local-current-source-proof.v1' as const;

/**
 * The only current-source proof kind in v1. Deliberately narrow: it names
 * exactly what was observed, so no reader can confuse it with the historical
 * pre-fix/post-fix discriminator.
 */
export const CURRENT_SOURCE_PROOF_KINDS = ['CURRENT_SOURCE_REPEATED_TEST_FAILURE'] as const;
export type CurrentSourceProofKind = (typeof CURRENT_SOURCE_PROOF_KINDS)[number];

/**
 * Failure classes an executor may report. Exactly one qualifies; the rest
 * exist so a non-qualifying outcome is recorded honestly instead of being
 * flattened into "reproduced".
 */
export const CURRENT_SOURCE_FAILURE_CLASSES = [
  'TEST_ASSERTION_FAILURE',
  'BUILD_FAILURE',
  'ENVIRONMENT_FAILURE',
  'TIMEOUT',
  'PROCESS_FAILURE',
] as const;
export type CurrentSourceFailureClass = (typeof CURRENT_SOURCE_FAILURE_CLASSES)[number];

/** The single qualifying failure class. A generic nonzero exit is never a bug. */
export const QUALIFYING_CURRENT_SOURCE_FAILURE_CLASS: CurrentSourceFailureClass = 'TEST_ASSERTION_FAILURE';

/**
 * Where the failing check came from. `MODEL_GENERATED_TEST` is reserved and
 * NEVER qualifies in v1: a model-authored test proves only that the model can
 * write a failing assertion.
 */
export const CURRENT_SOURCE_DISCRIMINATOR_ORIGINS = [
  'PRE_EXISTING_REPOSITORY_TEST',
  'MODEL_GENERATED_TEST',
] as const;
export type CurrentSourceDiscriminatorOrigin = (typeof CURRENT_SOURCE_DISCRIMINATOR_ORIGINS)[number];

export const QUALIFYING_CURRENT_SOURCE_DISCRIMINATOR_ORIGIN: CurrentSourceDiscriminatorOrigin =
  'PRE_EXISTING_REPOSITORY_TEST';

/** Minimum fresh disposable executions with an identical failure fingerprint. */
export const MIN_CURRENT_SOURCE_EXECUTIONS = 2 as const;

export const TARGET_DIGEST_PREFIX = 'tgt' as const;
export const FAILURE_FINGERPRINT_PREFIX = 'fp' as const;

const DIGEST_RE = /^(?:tgt|fp):sha256:[0-9a-f]{24}$/;
const SHA_RE = /^[0-9a-f]{7,64}$/;
const CONTENT_DIGEST_RE = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,127}$/;
const REPOSITORY_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/;
const RELATIVE_PATH_RE = /^(?!\/)(?!.*\.\.)[A-Za-z0-9._+/-]{1,512}$/;

/**
 * Nightwatch-minted, provider-bound proof that CURRENT owner-local source
 * fails a pre-existing repository check repeatably. Every field is host
 * observed; none is model supplied.
 */
export interface OwnerLocalCurrentSourceProof {
  readonly schemaVersion: typeof OWNER_LOCAL_CURRENT_SOURCE_PROOF_VERSION;
  readonly proofKind: CurrentSourceProofKind;
  /** Provider id that executed and minted this proof. */
  readonly mintedBy: string;
  /** Approved repository id (`org/repo`). */
  readonly repository: string;
  /** Host-derived executable package path, relative to the repository root. */
  readonly packageRelativePath: string;
  /** Repository HEAD sha at execution time. */
  readonly repositoryHeadSha: string;
  /** Provider-unique approved source path (`repo:relative/path`) that grounded this. */
  readonly sourcePath: string;
  /** Content digest of the inspected source, as reported by the source provider. */
  readonly sourceContentDigest: string;
  /** Digest over the canonical host-derived target descriptor. */
  readonly targetDigest: string;
  /** Stable digest over the normalized failing-check identity set. */
  readonly failureFingerprint: string;
  /** Count of fresh disposable executions that produced `failureFingerprint`. */
  readonly executionCount: number;
  readonly failureClass: CurrentSourceFailureClass;
  readonly discriminatorOrigin: CurrentSourceDiscriminatorOrigin;
  /** Executor-observed: sibling HEAD/status identical before and after. */
  readonly siblingIdentityStable: boolean;
  /** Executor-observed: the execution environment forbade dependency/network fetches. */
  readonly networkDisabled: boolean;
}

export type CurrentSourceProofRefusal =
  | 'PROOF_ABSENT'
  | 'PROOF_MALFORMED'
  | 'PROOF_SCHEMA_UNKNOWN'
  | 'PROOF_KIND_UNKNOWN'
  | 'PROOF_PROVIDER_MISMATCH'
  | 'PROOF_SOURCE_MISMATCH'
  | 'PROOF_FAILURE_CLASS_NOT_QUALIFYING'
  | 'PROOF_DISCRIMINATOR_NOT_QUALIFYING'
  | 'PROOF_EXECUTIONS_INSUFFICIENT'
  | 'PROOF_FINGERPRINT_INVALID'
  | 'PROOF_TARGET_DIGEST_INVALID'
  | 'PROOF_IDENTITY_UNSTABLE'
  | 'PROOF_NETWORK_NOT_DISABLED';

export interface CurrentSourceProofExpectations {
  /** Provider id that produced the receipt carrying this proof. */
  readonly providerId: string;
  /** Approved source path the receipt claims (`repo:relative/path`). */
  readonly sourcePath: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value: unknown, max = 512): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

/**
 * Fail-closed structural + semantic validation. Returns null when the value is
 * a qualifying current-source proof for the given receipt, otherwise the exact
 * refusal reason. Never throws.
 */
export function validateCurrentSourceProof(
  value: unknown,
  expectations: CurrentSourceProofExpectations,
): CurrentSourceProofRefusal | null {
  if (value === undefined || value === null) return 'PROOF_ABSENT';
  if (!isRecord(value)) return 'PROOF_MALFORMED';
  if (value['schemaVersion'] !== OWNER_LOCAL_CURRENT_SOURCE_PROOF_VERSION) return 'PROOF_SCHEMA_UNKNOWN';
  const proofKind = value['proofKind'];
  if (typeof proofKind !== 'string' || !CURRENT_SOURCE_PROOF_KINDS.includes(proofKind as CurrentSourceProofKind)) {
    return 'PROOF_KIND_UNKNOWN';
  }
  if (!nonEmptyString(value['mintedBy'], 128)) return 'PROOF_MALFORMED';
  if (value['mintedBy'] !== expectations.providerId) return 'PROOF_PROVIDER_MISMATCH';
  if (!nonEmptyString(value['repository'], 128) || !REPOSITORY_RE.test(value['repository'] as string)) {
    return 'PROOF_MALFORMED';
  }
  if (
    !nonEmptyString(value['packageRelativePath']) ||
    !RELATIVE_PATH_RE.test(value['packageRelativePath'] as string)
  ) {
    return 'PROOF_MALFORMED';
  }
  if (!nonEmptyString(value['repositoryHeadSha'], 64) || !SHA_RE.test(value['repositoryHeadSha'] as string)) {
    return 'PROOF_MALFORMED';
  }
  if (!nonEmptyString(value['sourcePath'])) return 'PROOF_MALFORMED';
  if (value['sourcePath'] !== expectations.sourcePath) return 'PROOF_SOURCE_MISMATCH';
  if (
    !nonEmptyString(value['sourceContentDigest'], 128) ||
    !CONTENT_DIGEST_RE.test(value['sourceContentDigest'] as string)
  ) {
    return 'PROOF_MALFORMED';
  }
  const targetDigest = value['targetDigest'];
  if (typeof targetDigest !== 'string' || !DIGEST_RE.test(targetDigest)) return 'PROOF_TARGET_DIGEST_INVALID';
  const fingerprint = value['failureFingerprint'];
  if (typeof fingerprint !== 'string' || !DIGEST_RE.test(fingerprint)) return 'PROOF_FINGERPRINT_INVALID';
  const failureClass = value['failureClass'];
  if (
    typeof failureClass !== 'string' ||
    !CURRENT_SOURCE_FAILURE_CLASSES.includes(failureClass as CurrentSourceFailureClass)
  ) {
    return 'PROOF_MALFORMED';
  }
  if (failureClass !== QUALIFYING_CURRENT_SOURCE_FAILURE_CLASS) return 'PROOF_FAILURE_CLASS_NOT_QUALIFYING';
  const origin = value['discriminatorOrigin'];
  if (
    typeof origin !== 'string' ||
    !CURRENT_SOURCE_DISCRIMINATOR_ORIGINS.includes(origin as CurrentSourceDiscriminatorOrigin)
  ) {
    return 'PROOF_MALFORMED';
  }
  if (origin !== QUALIFYING_CURRENT_SOURCE_DISCRIMINATOR_ORIGIN) return 'PROOF_DISCRIMINATOR_NOT_QUALIFYING';
  const executionCount = value['executionCount'];
  if (typeof executionCount !== 'number' || !Number.isInteger(executionCount)) return 'PROOF_MALFORMED';
  if (executionCount < MIN_CURRENT_SOURCE_EXECUTIONS) return 'PROOF_EXECUTIONS_INSUFFICIENT';
  if (value['siblingIdentityStable'] !== true) return 'PROOF_IDENTITY_UNSTABLE';
  if (value['networkDisabled'] !== true) return 'PROOF_NETWORK_NOT_DISABLED';
  return null;
}

/** Convenience predicate over {@link validateCurrentSourceProof}. */
export function isQualifyingCurrentSourceProof(
  value: unknown,
  expectations: CurrentSourceProofExpectations,
): value is OwnerLocalCurrentSourceProof {
  return validateCurrentSourceProof(value, expectations) === null;
}
