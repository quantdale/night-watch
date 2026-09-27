// ---------------------------------------------------------------------------
// M5 (C-19, design D7) — the AgentFindingRecord.
//
// An admitted finding used to exist only as an in-memory admission result with
// no stable identity and no source binding: nothing tied it to a campaign, a
// candidate, the repository HEAD (and tree digest) it was reproduced against,
// the failing-test fingerprint, the reproduction receipts, or the reasoner
// that produced it. This module derives that identity MECHANICALLY from the
// already-verified admission inputs and content-addresses it, so a later
// persistence layer can store and re-read the exact same record.
//
// Rules:
//   - Every value is derived from harness-observed receipts/proofs or from a
//     host-supplied identity map. A model draft can never reach this module.
//   - Unknown or unusable host identity input is IGNORED (the field stays
//     null) rather than fabricated; the record never invents a HEAD, a tree
//     digest, a fingerprint, or a reasoner identity.
//   - The dossier id is `afr:sha256:<24>` over the canonical stable JSON of
//     the record payload with `dossierId` omitted; `validateAgentFindingRecord`
//     recomputes it, so a tampered id or payload fails closed.
//
// Pure data + derivation: no fs, network, clock, or AI authority.
// ---------------------------------------------------------------------------

import { prefixedDigest24, stableJsonSorted } from '../identity/canonicalDigest';
import {
  CURRENT_SOURCE_DISCRIMINATOR_ORIGINS,
  CURRENT_SOURCE_FAILURE_CLASSES,
  CURRENT_SOURCE_PROOF_KINDS,
} from './currentSourceProof';
import type { LocalReproductionReceipt } from './types';

export const AGENT_FINDING_RECORD_VERSION = 'nightwatch.agent-finding-record.v1' as const;
export const AGENT_FINDING_RECORD_ID_PREFIX = 'afr' as const;
export const AGENT_FINDING_RECORD_ID_RE = /^afr:sha256:[0-9a-f]{24}$/;

export const AGENT_FINDING_RECORD_CAPS = Object.freeze({
  maxSources: 32,
  maxReproductionIds: 32,
  maxProvenanceRefs: 64,
  maxLabelChars: 256,
  maxPathChars: 512,
  maxDigestChars: 160,
});

const FAILURE_FINGERPRINT_RE = /^fp:sha256:[0-9a-f]{24}$/;
const TRIAGE_FINGERPRINT_RE = /^cfe:sha256:[0-9a-f]{24}$/;
const SHA_RE = /^[0-9a-f]{7,64}$/;
const DIGEST_RE = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,159}$/;
const REPOSITORY_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/;
// Provider-unique source paths are `repo:relative/path`, so the colon is part
// of the vocabulary; absolute paths and dot segments stay refused.
const SAFE_PATH_RE = /^(?!\/)(?!.*\.\.)[A-Za-z0-9._+:/:-]{1,512}$/;
const IDENTIFIER_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;

/**
 * M5 (6.15/NW-AUD-046): the CLOSED vocabulary of presentation fields whose
 * model-supplied value can be missing. A defaulted field is recorded by name,
 * so a reader can never mistake a fallback for grounded model content.
 */
export const PRESENTATION_FIELDS = [
  'title',
  'description',
  'recommendedSeverity',
  'severityConfidence',
  'severityRationale',
  'confidence',
  'alternativeHypotheses',
] as const;
export type PresentationField = (typeof PRESENTATION_FIELDS)[number];
const TEST_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*(?:\/[A-Za-z_][A-Za-z0-9_]*)*$/;

/** Host-observed repository identity for one approved source path. */
export interface AgentFindingRecordSourceIdentity {
  readonly sourcePath: string;
  readonly repository: string | null;
  readonly headSha: string | null;
  readonly treeDigest: string | null;
}

export interface AgentFindingRecordSource {
  readonly sourcePath: string;
  readonly repository: string | null;
  readonly headSha: string | null;
  /** Host-observed `git rev-parse HEAD^{tree}`-style digest, when supplied. */
  readonly treeDigest: string | null;
  readonly contentDigest: string | null;
}

export interface AgentFindingRecordTestIdentity {
  readonly testFile: string | null;
  readonly testName: string | null;
  readonly packageRelativePath: string | null;
  readonly discriminatorOrigin: string | null;
  readonly failureClass: string | null;
}

export interface AgentFindingRecordReasonerIdentity {
  readonly executablePath: string;
  readonly executableDigest: string;
  readonly adapterDigest: string | null;
  readonly printCliDigest: string | null;
  readonly printArgsDigest: string | null;
  readonly provider: string | null;
  readonly model: string | null;
}

export interface AgentFindingRecord {
  readonly schemaVersion: typeof AGENT_FINDING_RECORD_VERSION;
  /** Content-addressed identity: `afr:sha256:<24>` over the payload below. */
  readonly dossierId: string;
  readonly campaignId: string;
  readonly candidateId: string;
  readonly sources: readonly AgentFindingRecordSource[];
  /** `fp:sha256:<24>` current-failure fingerprint, or null when unavailable. */
  readonly currentFailureFingerprint: string | null;
  /** `cfe:sha256:<24>` triage fingerprint, or null when unavailable. */
  readonly triageFingerprint: string | null;
  readonly testIdentity: AgentFindingRecordTestIdentity | null;
  readonly reasonerIdentity: AgentFindingRecordReasonerIdentity | null;
  readonly reproductionIds: readonly string[];
  readonly provenanceRefs: readonly string[];
  /** Presentation fields the model did NOT supply (see PRESENTATION_FIELDS). */
  readonly presentationDefaults: readonly string[];
}

export interface AgentFindingRecordDerivation {
  readonly campaignId: string;
  readonly candidateId: string;
  /** The qualifying receipts the admission gate already accepted, in order. */
  readonly receipts: readonly LocalReproductionReceipt[];
  /** Optional host-observed per-source repository identity. */
  readonly sourceIdentities?: readonly AgentFindingRecordSourceIdentity[];
  /** Optional host-observed failing-test file/name supplement. */
  readonly testFile?: string | null;
  readonly testName?: string | null;
  /** Optional host-observed triage fingerprint (`cfe:`). */
  readonly triageFingerprint?: string | null;
  readonly reasonerIdentity?: AgentFindingRecordReasonerIdentity | null;
  /** Presentation fields the model did not supply (6.15/NW-AUD-046). */
  readonly presentationDefaults?: readonly string[];
}

export interface AgentFindingRecordError {
  readonly code: string;
  readonly detail: string;
}

export type ValidateAgentFindingRecordResult =
  | { readonly ok: true; readonly record: AgentFindingRecord }
  | { readonly ok: false; readonly errors: readonly AgentFindingRecordError[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The exact canonical payload the dossier identity is derived from. */
function identityPayload(source: {
  readonly campaignId: string;
  readonly candidateId: string;
  readonly sources: readonly AgentFindingRecordSource[];
  readonly currentFailureFingerprint: string | null;
  readonly triageFingerprint: string | null;
  readonly testIdentity: AgentFindingRecordTestIdentity | null;
  readonly reasonerIdentity: AgentFindingRecordReasonerIdentity | null;
  readonly reproductionIds: readonly string[];
  readonly provenanceRefs: readonly string[];
  readonly presentationDefaults: readonly string[];
}): Record<string, unknown> {
  return {
    version: AGENT_FINDING_RECORD_VERSION,
    campaignId: source.campaignId,
    candidateId: source.candidateId,
    sources: source.sources,
    currentFailureFingerprint: source.currentFailureFingerprint,
    triageFingerprint: source.triageFingerprint,
    testIdentity: source.testIdentity,
    reasonerIdentity: source.reasonerIdentity,
    reproductionIds: source.reproductionIds,
    provenanceRefs: source.provenanceRefs,
    presentationDefaults: source.presentationDefaults,
  };
}

function boundedString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) return null;
  return trimmed;
}

function safePath(value: unknown): string | null {
  const text = boundedString(value, AGENT_FINDING_RECORD_CAPS.maxPathChars);
  if (text === null) return null;
  return SAFE_PATH_RE.test(text) ? text : null;
}

function safeDigest(value: unknown): string | null {
  const text = boundedString(value, AGENT_FINDING_RECORD_CAPS.maxDigestChars);
  if (text === null) return null;
  return DIGEST_RE.test(text) ? text : null;
}

function safeRepository(value: unknown): string | null {
  const text = boundedString(value, AGENT_FINDING_RECORD_CAPS.maxLabelChars);
  if (text === null) return null;
  return REPOSITORY_RE.test(text) ? text : null;
}

function safeHeadSha(value: unknown): string | null {
  const text = boundedString(value, 64);
  if (text === null) return null;
  return SHA_RE.test(text) ? text : null;
}

function safeTestName(value: unknown): string | null {
  const text = boundedString(value, AGENT_FINDING_RECORD_CAPS.maxLabelChars);
  if (text === null) return null;
  return TEST_NAME_RE.test(text) ? text : null;
}

function safeMember(value: unknown, allowed: readonly string[]): string | null {
  const text = boundedString(value, AGENT_FINDING_RECORD_CAPS.maxLabelChars);
  if (text === null) return null;
  return allowed.includes(text) ? text : null;
}

function safeIdentifier(value: unknown): string | null {
  const text = boundedString(value, AGENT_FINDING_RECORD_CAPS.maxLabelChars);
  if (text === null) return null;
  return IDENTIFIER_RE.test(text) ? text : null;
}

/** Proofs attached to a receipt, validated for shape only (values come from admission). */
function proofOf(receipt: LocalReproductionReceipt): Record<string, unknown> | null {
  const proof = (receipt as { readonly currentSourceProof?: unknown }).currentSourceProof;
  return isRecord(proof) ? proof : null;
}

function mergeSource(
  current: AgentFindingRecordSource | undefined,
  next: AgentFindingRecordSource,
): AgentFindingRecordSource {
  if (current === undefined) return next;
  return {
    sourcePath: current.sourcePath,
    repository: current.repository ?? next.repository,
    headSha: current.headSha ?? next.headSha,
    treeDigest: current.treeDigest ?? next.treeDigest,
    contentDigest: current.contentDigest ?? next.contentDigest,
  };
}

/**
 * Derive the record. Deterministic: identical derivation input yields the
 * identical record and the identical content-addressed dossier id.
 */
export function deriveAgentFindingRecord(input: AgentFindingRecordDerivation): AgentFindingRecord {
  const identityByPath = new Map<string, AgentFindingRecordSourceIdentity>();
  for (const identity of input.sourceIdentities ?? []) {
    if (!isRecord(identity)) continue;
    const path = safePath(identity.sourcePath);
    if (path === null || identityByPath.has(path)) continue;
    identityByPath.set(path, {
      sourcePath: path,
      repository: safeRepository(identity.repository),
      headSha: safeHeadSha(identity.headSha),
      treeDigest: safeDigest(identity.treeDigest),
    });
  }

  const receipts = [...input.receipts].slice().sort((a, b) => {
    const byId = String(a.reproductionId ?? '').localeCompare(String(b.reproductionId ?? ''));
    if (byId !== 0) return byId;
    return String(a.providerId ?? '').localeCompare(String(b.providerId ?? ''));
  });

  const sourcesByPath = new Map<string, AgentFindingRecordSource>();
  const fingerprints: string[] = [];
  const reproductionIds: string[] = [];
  const provenanceRefs = new Set<string>();
  let testIdentity: AgentFindingRecordTestIdentity | null = null;

  for (const receipt of receipts) {
    const reproductionId = safeIdentifier(receipt.reproductionId);
    if (reproductionId !== null && !reproductionIds.includes(reproductionId)) {
      reproductionIds.push(reproductionId);
    }
    for (const ref of receipt.provenanceRefs ?? []) {
      const text = boundedString(ref, AGENT_FINDING_RECORD_CAPS.maxPathChars);
      if (text !== null && provenanceRefs.size < AGENT_FINDING_RECORD_CAPS.maxProvenanceRefs) {
        provenanceRefs.add(text);
      }
    }
    const sourcePath = safePath(receipt.sourcePath);
    const proof = proofOf(receipt);
    if (sourcePath !== null) {
      const hostIdentity = identityByPath.get(sourcePath);
      const proofKind = proof === null ? null : safeMember(proof['proofKind'], CURRENT_SOURCE_PROOF_KINDS);
      const proofOrigin = proof === null
        ? null
        : safeMember(proof['discriminatorOrigin'], CURRENT_SOURCE_DISCRIMINATOR_ORIGINS);
      const proofFailureClass = proof === null
        ? null
        : safeMember(proof['failureClass'], CURRENT_SOURCE_FAILURE_CLASSES);
      const repository = (proof === null ? null : safeRepository(proof['repository'])) ?? hostIdentity?.repository ?? null;
      const headSha = (proof === null ? null : safeHeadSha(proof['repositoryHeadSha'])) ?? hostIdentity?.headSha ?? null;
      const contentDigest = proof === null ? null : safeDigest(proof['sourceContentDigest']);
      sourcesByPath.set(
        sourcePath,
        mergeSource(sourcesByPath.get(sourcePath), {
          sourcePath,
          repository,
          headSha,
          treeDigest: hostIdentity?.treeDigest ?? null,
          contentDigest,
        }),
      );
      if (proof !== null && proofKind !== null) {
        const fingerprint = boundedString(proof['failureFingerprint'], AGENT_FINDING_RECORD_CAPS.maxDigestChars);
        if (fingerprint !== null && FAILURE_FINGERPRINT_RE.test(fingerprint) && !fingerprints.includes(fingerprint)) {
          fingerprints.push(fingerprint);
        }
        if (testIdentity === null) {
          testIdentity = {
            testFile: safePath(input.testFile),
            testName: safeTestName(input.testName),
            packageRelativePath: safePath(proof['packageRelativePath']),
            discriminatorOrigin: proofOrigin,
            failureClass: proofFailureClass,
          };
        }
      }
    }
  }

  if (testIdentity === null && (input.testFile !== undefined || input.testName !== undefined)) {
    testIdentity = {
      testFile: safePath(input.testFile),
      testName: safeTestName(input.testName),
      packageRelativePath: null,
      discriminatorOrigin: null,
      failureClass: null,
    };
  }

  const sources = [...sourcesByPath.values()]
    .slice()
    .sort((a, b) => a.sourcePath.localeCompare(b.sourcePath))
    .slice(0, AGENT_FINDING_RECORD_CAPS.maxSources);

  const triageCandidate = boundedString(input.triageFingerprint, AGENT_FINDING_RECORD_CAPS.maxDigestChars);
  const triageFingerprint: string | null =
    triageCandidate !== null && TRIAGE_FINGERPRINT_RE.test(triageCandidate) ? triageCandidate : null;

  const reasoner = input.reasonerIdentity ?? null;
  const reasonerIdentity: AgentFindingRecordReasonerIdentity | null =
    reasoner === null
      ? null
      : (() => {
          const executablePath = safePath(reasoner.executablePath);
          const executableDigest = safeDigest(reasoner.executableDigest);
          if (executablePath === null || executableDigest === null) return null;
          return {
            executablePath,
            executableDigest,
            adapterDigest: safeDigest(reasoner.adapterDigest),
            printCliDigest: safeDigest(reasoner.printCliDigest),
            printArgsDigest: safeDigest(reasoner.printArgsDigest),
            provider: safeIdentifier(reasoner.provider),
            model: safeIdentifier(reasoner.model),
          };
        })();

  const campaignId = safeIdentifier(input.campaignId) ?? String(input.campaignId ?? '');
  const candidateIdValue = safeIdentifier(input.candidateId) ?? String(input.candidateId ?? '');
  const currentFailureFingerprint: string | null = fingerprints.length > 0 ? (fingerprints[0] ?? null) : null;
  const recordReproductionIds = reproductionIds.slice(0, AGENT_FINDING_RECORD_CAPS.maxReproductionIds);
  const recordProvenanceRefs = [...provenanceRefs].sort((a, b) => a.localeCompare(b));
  const recordPresentationDefaults = (input.presentationDefaults ?? [])
    .filter((field): field is PresentationField => (PRESENTATION_FIELDS as readonly string[]).includes(field))
    .slice()
    .sort((left, right) => left.localeCompare(right))
    .filter((field, index, all) => index === 0 || all[index - 1] !== field);

  const payload = identityPayload({
    campaignId,
    candidateId: candidateIdValue,
    sources,
    currentFailureFingerprint,
    triageFingerprint,
    testIdentity,
    reasonerIdentity,
    reproductionIds: recordReproductionIds,
    provenanceRefs: recordProvenanceRefs,
    presentationDefaults: recordPresentationDefaults,
  });

  // Content addressing runs over the exact payload persisted below (minus the
  // id itself), so recomputing it in `validateAgentFindingRecord` is a real
  // tamper check rather than a restatement of the same claim.
  const dossierId = prefixedDigest24(AGENT_FINDING_RECORD_ID_PREFIX, payload);

  return Object.freeze({
    schemaVersion: AGENT_FINDING_RECORD_VERSION,
    dossierId,
    campaignId,
    candidateId: candidateIdValue,
    sources,
    currentFailureFingerprint,
    triageFingerprint,
    testIdentity,
    reasonerIdentity,
    reproductionIds: recordReproductionIds,
    provenanceRefs: recordProvenanceRefs,
    presentationDefaults: recordPresentationDefaults,
  });
}

/** Canonical content (id excluded) the dossier identity is derived from. */
export function agentFindingRecordPayload(record: AgentFindingRecord): string {
  return stableJsonSorted(identityPayload(record));
}

export function agentFindingRecordId(record: AgentFindingRecord): string {
  return prefixedDigest24(AGENT_FINDING_RECORD_ID_PREFIX, identityPayload(record));
}

const RECORD_KEYS = [
  'schemaVersion',
  'dossierId',
  'campaignId',
  'candidateId',
  'sources',
  'currentFailureFingerprint',
  'triageFingerprint',
  'testIdentity',
  'reasonerIdentity',
  'reproductionIds',
  'provenanceRefs',
  'presentationDefaults',
] as const;

const SOURCE_KEYS = ['sourcePath', 'repository', 'headSha', 'treeDigest', 'contentDigest'] as const;
const TEST_KEYS = ['testFile', 'testName', 'packageRelativePath', 'discriminatorOrigin', 'failureClass'] as const;
const REASONER_KEYS = [
  'executablePath',
  'executableDigest',
  'adapterDigest',
  'printCliDigest',
  'printArgsDigest',
  'provider',
  'model',
] as const;

function checkExactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
  errors: AgentFindingRecordError[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      errors.push({ code: 'AGENT_FINDING_RECORD_UNKNOWN_FIELD', detail: `${label}.${key} is not a declared field` });
    }
  }
  for (const key of allowed) {
    if (!(key in value)) {
      errors.push({ code: 'AGENT_FINDING_RECORD_MISSING_FIELD', detail: `${label}.${key} is missing` });
    }
  }
}

function nullableString(
  value: unknown,
  label: string,
  errors: AgentFindingRecordError[],
  guard: (candidate: unknown) => string | null,
): string | null {
  if (value === null) return null;
  const text = guard(value);
  if (text === null) {
    errors.push({ code: 'AGENT_FINDING_RECORD_FIELD_MALFORMED', detail: `${label} is malformed` });
  }
  return text;
}

/**
 * Strict, fail-closed validation of a persisted record. Recomputes the
 * content-addressed identity so a tampered payload or dossier id is refused.
 */
export function validateAgentFindingRecord(value: unknown): ValidateAgentFindingRecordResult {
  const errors: AgentFindingRecordError[] = [];
  if (!isRecord(value)) {
    return { ok: false, errors: [{ code: 'AGENT_FINDING_RECORD_NOT_OBJECT', detail: 'record is not an object' }] };
  }
  checkExactKeys(value, RECORD_KEYS, 'record', errors);
  if (value['schemaVersion'] !== AGENT_FINDING_RECORD_VERSION) {
    errors.push({
      code: 'AGENT_FINDING_RECORD_SCHEMA_MISMATCH',
      detail: `schemaVersion must be ${AGENT_FINDING_RECORD_VERSION}`,
    });
  }
  const dossierId = value['dossierId'];
  if (typeof dossierId !== 'string' || !AGENT_FINDING_RECORD_ID_RE.test(dossierId)) {
    errors.push({ code: 'AGENT_FINDING_RECORD_ID_MALFORMED', detail: 'dossierId is not afr:sha256:<24>' });
  }
  const campaignId = nullableString(value['campaignId'], 'campaignId', errors, safeIdentifier);
  const candidateId = nullableString(value['candidateId'], 'candidateId', errors, safeIdentifier);
  if (campaignId === null) {
    errors.push({ code: 'AGENT_FINDING_RECORD_FIELD_MALFORMED', detail: 'campaignId is required' });
  }
  if (candidateId === null) {
    errors.push({ code: 'AGENT_FINDING_RECORD_FIELD_MALFORMED', detail: 'candidateId is required' });
  }

  const sourcesValue = value['sources'];
  const sources: AgentFindingRecordSource[] = [];
  if (!Array.isArray(sourcesValue) || sourcesValue.length > AGENT_FINDING_RECORD_CAPS.maxSources) {
    errors.push({ code: 'AGENT_FINDING_RECORD_FIELD_MALFORMED', detail: 'sources must be a bounded array' });
  } else {
    for (const [index, entry] of sourcesValue.entries()) {
      if (!isRecord(entry)) {
        errors.push({ code: 'AGENT_FINDING_RECORD_FIELD_MALFORMED', detail: `sources[${index}] is not an object` });
        continue;
      }
      checkExactKeys(entry, SOURCE_KEYS, `sources[${index}]`, errors);
      const sourcePath = nullableString(entry['sourcePath'], `sources[${index}].sourcePath`, errors, safePath);
      if (sourcePath === null) {
        errors.push({ code: 'AGENT_FINDING_RECORD_FIELD_MALFORMED', detail: `sources[${index}].sourcePath is required` });
        continue;
      }
      sources.push({
        sourcePath,
        repository: nullableString(entry['repository'], `sources[${index}].repository`, errors, safeRepository),
        headSha: nullableString(entry['headSha'], `sources[${index}].headSha`, errors, safeHeadSha),
        treeDigest: nullableString(entry['treeDigest'], `sources[${index}].treeDigest`, errors, safeDigest),
        contentDigest: nullableString(entry['contentDigest'], `sources[${index}].contentDigest`, errors, safeDigest),
      });
    }
  }

  const currentFailureFingerprint = nullableString(
    value['currentFailureFingerprint'],
    'currentFailureFingerprint',
    errors,
    (candidate) => {
      const text = boundedString(candidate, AGENT_FINDING_RECORD_CAPS.maxDigestChars);
      return text !== null && FAILURE_FINGERPRINT_RE.test(text) ? text : null;
    },
  );
  const triageFingerprint = nullableString(value['triageFingerprint'], 'triageFingerprint', errors, (candidate) => {
    const text = boundedString(candidate, AGENT_FINDING_RECORD_CAPS.maxDigestChars);
    return text !== null && TRIAGE_FINGERPRINT_RE.test(text) ? text : null;
  });

  let testIdentity: AgentFindingRecordTestIdentity | null = null;
  const testValue = value['testIdentity'];
  if (testValue !== null) {
    if (!isRecord(testValue)) {
      errors.push({ code: 'AGENT_FINDING_RECORD_FIELD_MALFORMED', detail: 'testIdentity is not an object' });
    } else {
      checkExactKeys(testValue, TEST_KEYS, 'testIdentity', errors);
      testIdentity = {
        testFile: nullableString(testValue['testFile'], 'testIdentity.testFile', errors, safePath),
        testName: nullableString(testValue['testName'], 'testIdentity.testName', errors, safeTestName),
        packageRelativePath: nullableString(
          testValue['packageRelativePath'],
          'testIdentity.packageRelativePath',
          errors,
          safePath,
        ),
        discriminatorOrigin: nullableString(
          testValue['discriminatorOrigin'],
          'testIdentity.discriminatorOrigin',
          errors,
          (candidate) => safeMember(candidate, CURRENT_SOURCE_DISCRIMINATOR_ORIGINS),
        ),
        failureClass: nullableString(testValue['failureClass'], 'testIdentity.failureClass', errors, (candidate) =>
          safeMember(candidate, CURRENT_SOURCE_FAILURE_CLASSES),
        ),
      };
    }
  }

  let reasonerIdentity: AgentFindingRecordReasonerIdentity | null = null;
  const reasonerValue = value['reasonerIdentity'];
  if (reasonerValue !== null) {
    if (!isRecord(reasonerValue)) {
      errors.push({ code: 'AGENT_FINDING_RECORD_FIELD_MALFORMED', detail: 'reasonerIdentity is not an object' });
    } else {
      checkExactKeys(reasonerValue, REASONER_KEYS, 'reasonerIdentity', errors);
      const executablePath = nullableString(
        reasonerValue['executablePath'],
        'reasonerIdentity.executablePath',
        errors,
        safePath,
      );
      const executableDigest = nullableString(
        reasonerValue['executableDigest'],
        'reasonerIdentity.executableDigest',
        errors,
        safeDigest,
      );
      if (executablePath === null || executableDigest === null) {
        errors.push({
          code: 'AGENT_FINDING_RECORD_FIELD_MALFORMED',
          detail: 'reasonerIdentity requires executablePath and executableDigest',
        });
      } else {
        reasonerIdentity = {
          executablePath,
          executableDigest,
          adapterDigest: nullableString(reasonerValue['adapterDigest'], 'reasonerIdentity.adapterDigest', errors, safeDigest),
          printCliDigest: nullableString(reasonerValue['printCliDigest'], 'reasonerIdentity.printCliDigest', errors, safeDigest),
          printArgsDigest: nullableString(reasonerValue['printArgsDigest'], 'reasonerIdentity.printArgsDigest', errors, safeDigest),
          provider: nullableString(reasonerValue['provider'], 'reasonerIdentity.provider', errors, safeIdentifier),
          model: nullableString(reasonerValue['model'], 'reasonerIdentity.model', errors, safeIdentifier),
        };
      }
    }
  }

  const reproductionIdsValue = value['reproductionIds'];
  const reproductionIds: string[] = [];
  if (!Array.isArray(reproductionIdsValue) || reproductionIdsValue.length > AGENT_FINDING_RECORD_CAPS.maxReproductionIds) {
    errors.push({ code: 'AGENT_FINDING_RECORD_FIELD_MALFORMED', detail: 'reproductionIds must be a bounded array' });
  } else {
    for (const entry of reproductionIdsValue) {
      const text = safeIdentifier(entry);
      if (text === null) {
        errors.push({ code: 'AGENT_FINDING_RECORD_FIELD_MALFORMED', detail: 'reproductionIds entry is malformed' });
        continue;
      }
      reproductionIds.push(text);
    }
  }

  const provenanceRefsValue = value['provenanceRefs'];
  const provenanceRefs: string[] = [];
  if (!Array.isArray(provenanceRefsValue) || provenanceRefsValue.length > AGENT_FINDING_RECORD_CAPS.maxProvenanceRefs) {
    errors.push({ code: 'AGENT_FINDING_RECORD_FIELD_MALFORMED', detail: 'provenanceRefs must be a bounded array' });
  } else {
    for (const entry of provenanceRefsValue) {
      const text = boundedString(entry, AGENT_FINDING_RECORD_CAPS.maxPathChars);
      if (text === null) {
        errors.push({ code: 'AGENT_FINDING_RECORD_FIELD_MALFORMED', detail: 'provenanceRefs entry is malformed' });
        continue;
      }
      provenanceRefs.push(text);
    }
  }

  const presentationValue = value['presentationDefaults'];
  const presentationDefaults: string[] = [];
  if (!Array.isArray(presentationValue) || presentationValue.length > PRESENTATION_FIELDS.length) {
    errors.push({ code: 'AGENT_FINDING_RECORD_FIELD_MALFORMED', detail: 'presentationDefaults must be a bounded array' });
  } else {
    for (const entry of presentationValue) {
      if (typeof entry !== 'string' || !(PRESENTATION_FIELDS as readonly string[]).includes(entry)) {
        errors.push({ code: 'AGENT_FINDING_RECORD_FIELD_MALFORMED', detail: 'presentationDefaults entry is not a presentation field' });
        continue;
      }
      presentationDefaults.push(entry);
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const record: AgentFindingRecord = Object.freeze({
    schemaVersion: AGENT_FINDING_RECORD_VERSION,
    dossierId: dossierId as string,
    campaignId: campaignId as string,
    candidateId: candidateId as string,
    sources: Object.freeze(sources),
    currentFailureFingerprint,
    triageFingerprint,
    testIdentity,
    reasonerIdentity,
    reproductionIds: Object.freeze(reproductionIds),
    provenanceRefs: Object.freeze(provenanceRefs),
    presentationDefaults: Object.freeze(presentationDefaults),
  });

  const recomputed = agentFindingRecordId(record);
  if (recomputed !== record.dossierId) {
    return {
      ok: false,
      errors: [
        {
          code: 'AGENT_FINDING_RECORD_ID_MISMATCH',
          detail: `dossierId ${record.dossierId} does not match the record content (${recomputed})`,
        },
      ],
    };
  }
  return { ok: true, record };
}
