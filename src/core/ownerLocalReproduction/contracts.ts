// ---------------------------------------------------------------------------
// W9 frozen contract — host-derived owner-local executable reproduction.
//
// WHAT THIS IS
// The vocabulary shared by (a) target discovery, which decides whether an
// approved owner-local source path belongs to an offline-executable package,
// (b) the disposable executor, which runs it under hard bounds, and (c) the
// reproduction provider that mints receipts.
//
// AUTHORITY BOUNDARY (load-bearing)
// The reasoner supplies an approved source path and its observed source
// evidence ref, nothing else. Every executable fact — module root, package
// dir, executor kind, argv, environment, toolchain, limits — is DERIVED by
// Nightwatch from the repository's own package metadata. There is deliberately
// no field anywhere in this contract that can carry a model-chosen command,
// argument, executable path, environment variable, URL, or Git operation.
//
// Pure data. No fs/network/process authority in this module.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../identity/canonicalDigest';
import { TARGET_DIGEST_PREFIX } from '../localInvestigation/currentSourceProof';

export const OWNER_LOCAL_REPRODUCTION_TARGET_VERSION =
  'nightwatch.owner-local-reproduction-target.v1' as const;
export const OWNER_LOCAL_REPRODUCTION_ATTEMPT_VERSION =
  'nightwatch.owner-local-reproduction-attempt.v1' as const;

/**
 * Supported executable classes. Exactly one in v1: a Go package inside a
 * module that vendors its dependencies, so `go test -mod=vendor` needs no
 * network and no module download.
 */
export const OWNER_LOCAL_EXECUTOR_KINDS = ['GO_VENDORED_PACKAGE_TEST'] as const;
export type OwnerLocalExecutorKind = (typeof OWNER_LOCAL_EXECUTOR_KINDS)[number];

/** Offline prerequisites a target declares and the executor must verify. */
export const OWNER_LOCAL_PREREQUISITES = [
  'MODULE_MANIFEST',
  'VENDOR_DIRECTORY',
  'PACKAGE_TEST_FILES',
  'TOOLCHAIN_BINARY',
  'TOOLCHAIN_VERSION_SATISFIED',
  'NETWORK_DISABLED',
] as const;
export type OwnerLocalPrerequisite = (typeof OWNER_LOCAL_PREREQUISITES)[number];

/** Hard host-owned ceilings. Never widened by anything the reasoner sends. */
export interface OwnerLocalReproductionLimits {
  /** Wall ceiling for enumerating + copying the bounded execution closure. */
  readonly materializeMs: number;
  /** Wall ceiling for one package execution. */
  readonly executionMs: number;
  /** Captured stdout/stderr cap per execution. */
  readonly capturedOutputBytes: number;
  /** Materialization file-count ceiling. */
  readonly materializedFiles: number;
  /** Materialization byte ceiling. */
  readonly materializedBytes: number;
  /** Fresh disposable executions performed per reproduction attempt. */
  readonly executions: number;
}

export const DEFAULT_OWNER_LOCAL_REPRODUCTION_LIMITS: OwnerLocalReproductionLimits = Object.freeze({
  materializeMs: 120_000,
  executionMs: 180_000,
  capturedOutputBytes: 256 * 1024,
  materializedFiles: 20_000,
  materializedBytes: 512 * 1024 * 1024,
  executions: 2,
});

/**
 * A host-derived executable reproduction target. Carries only structured
 * facts; the executor turns it into an argv array itself.
 */
export interface OwnerLocalReproductionTarget {
  readonly schemaVersion: typeof OWNER_LOCAL_REPRODUCTION_TARGET_VERSION;
  readonly repository: string;
  /** Approved source path (`repo:relative/path`) that this target was derived from. */
  readonly sourcePath: string;
  /** Source file path relative to the repository root. */
  readonly sourceRelativePath: string;
  /** Content digest of the inspected source, from the source provider. */
  readonly sourceContentDigest: string;
  /** Module root relative to the repository root ('.' when the repo root is the module). */
  readonly moduleRelativePath: string;
  /** Package directory relative to the module root ('.' when the module root is the package). */
  readonly packageRelativePath: string;
  readonly executor: OwnerLocalExecutorKind;
  readonly repositoryHeadSha: string;
  readonly prerequisites: readonly OwnerLocalPrerequisite[];
  readonly limits: OwnerLocalReproductionLimits;
}

/** Reasons a source path has no supported executable target at all. */
export const OWNER_LOCAL_TARGET_REFUSALS = [
  'PATH_MALFORMED',
  'PATH_NOT_APPROVED',
  'NO_SUPPORTED_EXECUTOR',
  'MODULE_ROOT_NOT_FOUND',
  'VENDOR_DIRECTORY_ABSENT',
  'PACKAGE_TEST_FILES_ABSENT',
  'SOURCE_NOT_CURRENT',
] as const;
export type OwnerLocalTargetRefusal = (typeof OWNER_LOCAL_TARGET_REFUSALS)[number];

/** Reasons a supported target cannot execute in this environment right now. */
export const OWNER_LOCAL_ENVIRONMENT_BLOCKS = [
  'TOOLCHAIN_UNAVAILABLE',
  'TOOLCHAIN_VERSION_UNSATISFIED',
  'WORKSPACE_UNAVAILABLE',
  'CLOSURE_ENUMERATION_FAILED',
  'MATERIALIZATION_LIMIT_EXCEEDED',
  'MATERIALIZATION_FAILED',
  'SIBLING_IDENTITY_DRIFT',
] as const;
export type OwnerLocalEnvironmentBlock = (typeof OWNER_LOCAL_ENVIRONMENT_BLOCKS)[number];

export type OwnerLocalTargetDiscovery =
  | { readonly status: 'SUPPORTED'; readonly target: OwnerLocalReproductionTarget }
  | { readonly status: 'UNSUPPORTED'; readonly refusal: OwnerLocalTargetRefusal }
  | { readonly status: 'BLOCKED'; readonly block: OwnerLocalEnvironmentBlock };

/**
 * Outcome of ONE package execution. `TEST_FAILURE` is the only class that can
 * contribute to a qualifying proof; the others exist so build breakage,
 * missing toolchains and timeouts are never silently promoted.
 */
export const OWNER_LOCAL_EXECUTION_OUTCOMES = [
  'TEST_FAILURE',
  'TEST_PASS',
  'NO_TESTS',
  'BUILD_FAILURE',
  'TIMEOUT',
  'ENVIRONMENT_BLOCKED',
  'PROCESS_FAILURE',
] as const;
export type OwnerLocalExecutionOutcome = (typeof OWNER_LOCAL_EXECUTION_OUTCOMES)[number];

export interface OwnerLocalExecutionRecord {
  /** 1-based attempt ordinal within one reproduction attempt. */
  readonly attempt: number;
  readonly outcome: OwnerLocalExecutionOutcome;
  readonly exitCode: number | null;
  readonly durationMs: number;
  readonly timedOut: boolean;
  /** Stable digest over normalized failing-check identities; null unless TEST_FAILURE. */
  readonly failureFingerprint: string | null;
  /** Captured output size (harness-side accounting only). */
  readonly capturedBytes: number;
  readonly truncated: boolean;
}

/**
 * Executor-owned disposition for one reproduction attempt. The reasoner never
 * sets this: a deterministic refusal must not be re-executed, an environment
 * block must not spin, and only a genuinely transient execution failure earns
 * a bounded retry.
 */
export const OWNER_LOCAL_ATTEMPT_DISPOSITIONS = [
  'DETERMINISTIC_TERMINAL',
  'ENVIRONMENT_BLOCKED',
  'TRANSIENT_RETRYABLE',
] as const;
export type OwnerLocalAttemptDisposition = (typeof OWNER_LOCAL_ATTEMPT_DISPOSITIONS)[number];

/** Sibling identity captured before and after execution. */
export interface SiblingIdentitySnapshot {
  readonly repository: string;
  readonly headSha: string;
  /** Digest over `git status --porcelain` output; detects any working-tree write. */
  readonly statusDigest: string;
}

/**
 * Canonical target digest. Deterministic over the structured target only, so
 * two runs of the same target on the same source produce the same digest.
 */
export function ownerLocalTargetDigest(target: OwnerLocalReproductionTarget): string {
  return prefixedDigest24(TARGET_DIGEST_PREFIX, {
    schemaVersion: target.schemaVersion,
    repository: target.repository,
    sourceRelativePath: target.sourceRelativePath,
    sourceContentDigest: target.sourceContentDigest,
    moduleRelativePath: target.moduleRelativePath,
    packageRelativePath: target.packageRelativePath,
    executor: target.executor,
    repositoryHeadSha: target.repositoryHeadSha,
  });
}
