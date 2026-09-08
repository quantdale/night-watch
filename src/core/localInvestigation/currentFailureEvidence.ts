// ---------------------------------------------------------------------------
// W10 M6 — bounded, sanitized current-failure triage evidence.
//
// WHY THIS EXISTS
// A qualifying CURRENT_SOURCE_REPEATED_TEST_FAILURE proves a pre-existing
// repository check fails repeatably, but the proof receipt itself carries no
// triage content: no test name, no failing file, no failure text. This module
// turns that qualifying outcome into USEFUL triage evidence — which check
// failed, where, with what stable fingerprint — WITHOUT granting proof
// authority.
//
// AUTHORITY BOUNDARY (load-bearing)
// - This evidence is ADVISORY triage only. It never asserts defect status,
//   novelty, severity, or admission. Being reproduced is NOT being a bug:
//   no field here names a bug, a finding, or a disposition.
// - A model can never mint this: `matchingFreshExecutions` is HOST-observed
//   and must clear the frozen W9 two-matching-executions bar, or derivation
//   returns null. Nothing the reasoner sends can substitute for it.
// - Only TEST_ASSERTION_FAILURE qualifies. Build, timeout, process and
//   environment outcomes return null, as does any nonzero exit whose output
//   carries no parsed assertion-failure marker.
// - Test file and test name are parsed MECHANICALLY from captured Go test
//   output. Ambiguity yields null for that field — never a guess.
// - `summary` is UNTRUSTED, secret-scrubbed, path-stripped, hard-capped
//   text. It carries zero instruction authority: prompt-injection content
//   passes through only as inert text and mints no field.
// - The evidence object never contains argv, a command string, an absolute
//   path, an environment value, or a module-cache path.
//
// Pure data + string transforms. No fs/network/process/AI authority.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../identity/canonicalDigest';

export const CURRENT_FAILURE_EVIDENCE_SCHEMA_VERSION =
  'nightwatch.current-failure-evidence.v1' as const;

/** The only classification this evidence can ever carry. */
export const CURRENT_FAILURE_EVIDENCE_CLASSIFICATION = 'TEST_ASSERTION_FAILURE' as const;
export type CurrentFailureEvidenceClassification =
  typeof CURRENT_FAILURE_EVIDENCE_CLASSIFICATION;

/** Digest prefix for the normalized-failure fingerprint (distinct from `fp`). */
export const CURRENT_FAILURE_EVIDENCE_FINGERPRINT_PREFIX = 'cfe' as const;

export const CURRENT_FAILURE_EVIDENCE_FINGERPRINT_RE =
  /^cfe:sha256:[0-9a-f]{24}$/;

/** Hard caps. Triage evidence must never crowd out the case it annotates. */
export const CURRENT_FAILURE_EVIDENCE_CAPS = Object.freeze({
  /** Per-stream byte cap on captured output; beyond this the input is refused. */
  maxCapturedBytesPerStream: 1_048_576,
  /** Hard byte cap on the scrubbed summary. */
  maxSummaryBytes: 512,
  /** Maximum failure-relevant lines the summary is built from. */
  maxSummaryLines: 12,
  /** Maximum grounded source paths carried. */
  maxGroundedSourcePaths: 32,
  /** Maximum chars per grounded source path. */
  maxGroundedPathChars: 512,
  /** Maximum chars for the host-supplied package path. */
  maxPackagePathChars: 256,
  /** Frozen W9 bar: minimum host-observed matching fresh executions. */
  minMatchingFreshExecutions: 2,
});

/**
 * Bounded, sanitized triage evidence for one qualifying repeated current-source
 * test failure. Advisory only: no defect, novelty, severity, or admission
 * status is asserted anywhere in this shape.
 */
export interface CurrentFailureEvidence {
  readonly schemaVersion: typeof CURRENT_FAILURE_EVIDENCE_SCHEMA_VERSION;
  /** Repository-relative `_test.go` path, or null when absent/ambiguous. */
  readonly repositoryRelativeTestFile: string | null;
  /** Parsed `--- FAIL:` test name, or null when absent/ambiguous/malformed. */
  readonly testName: string | null;
  /** Host-supplied package path, relative to the repository root. */
  readonly packagePath: string;
  /** `cfe:sha256:<24>` over the normalized failure text. */
  readonly failureFingerprint: string;
  /** Host-observed count of fresh executions with this fingerprint (>= 2). */
  readonly matchingFreshExecutions: number;
  /** Approved source paths grounding this evidence (`repo:path` or relative). */
  readonly groundedSourcePaths: readonly string[];
  readonly classification: CurrentFailureEvidenceClassification;
  /** Scrubbed, hard-capped, inert failure text. Zero instruction authority. */
  readonly summary: string;
}

/** Host-side input. Every field is host observed; none is model supplied. */
export interface DeriveCurrentFailureEvidenceInput {
  readonly stdout: string;
  readonly stderr: string;
  /** Must be exactly `TEST_ASSERTION_FAILURE`; anything else refuses. */
  readonly failureClass: string;
  /** Host-observed matching fresh executions; must be an integer >= 2. */
  readonly matchingFreshExecutions: number;
  /** Package path relative to the repository root (`.` for the module root). */
  readonly packagePath: string;
  /** Approved source paths grounding this evidence. */
  readonly groundedSourcePaths: readonly string[];
}

// Assertion-failure markers: a named `--- FAIL:` line, a Go panic, a fatal
// runtime error, a testify error trace, a `_test.go:<line>` site, or a race.
// A nonzero exit without one of these is never an assertion failure.
const ASSERTION_MARKER_RE =
  /--- FAIL:|panic:|fatal error:|Error Trace:|_test\.go:\d+|DATA RACE/i;

// Kept for the human summary: failure-evidence lines only, so a command echo
// captured alongside the output can never leak into the evidence object.
const SUMMARY_KEEP_RE =
  /--- FAIL:|^FAIL(?:\s|\t)|_test\.go:\d+|Error Trace:|Error:|panic:|fatal error:|DATA RACE/i;

// Lines that smell like a command invocation are dropped from the summary.
const SUMMARY_DROP_RE = /^\s*\$ |&&|\bgo (test|build|run|vet|list|mod)\b/;

const FAIL_LINE_RE = /^[ \t]*--- FAIL:\s+(\S+)/gm;
const TEST_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*(?:\/[A-Za-z_][A-Za-z0-9_]*)*$/;

// A `_test.go:<line>` site, optionally under an absolute directory prefix.
const TEST_FILE_SITE_RE =
  /(?:^|[\s("'\[])\/?(?:[A-Za-z0-9_.-]+\/)*([A-Za-z0-9_][A-Za-z0-9_.-]*_test\.go):\d+/gm;

const PACKAGE_PATH_RE = /^(?:\.|[A-Za-z0-9][A-Za-z0-9._/-]*)$/;
const REPO_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SAFE_RELATIVE_PATH_RE = /^[A-Za-z0-9._/-]+$/;
const DOT_SEGMENT_RE = /(^|\/)\.\.(?:\/|$)/;

function isSafePackagePath(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > CURRENT_FAILURE_EVIDENCE_CAPS.maxPackagePathChars) {
    return false;
  }
  if (!PACKAGE_PATH_RE.test(value)) return false;
  if (value.includes('..')) return false;
  return true;
}

function isSafeRelativePath(value: string): boolean {
  if (value.length === 0 || value.length > CURRENT_FAILURE_EVIDENCE_CAPS.maxGroundedPathChars) {
    return false;
  }
  if (!SAFE_RELATIVE_PATH_RE.test(value)) return false;
  if (DOT_SEGMENT_RE.test(value)) return false;
  return true;
}

function isSafeGroundedPath(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (/[\x00-\x1f\x7f]/.test(value)) return false;
  if (/\s/.test(value)) return false;
  if (value.startsWith('/')) return false;
  const colon = value.indexOf(':');
  if (colon >= 0) {
    const repo = value.slice(0, colon);
    const rest = value.slice(colon + 1);
    if (repo === undefined || rest === undefined) return false;
    if (!REPO_RE.test(repo)) return false;
    return isSafeRelativePath(rest);
  }
  return isSafeRelativePath(value);
}

/**
 * Replace absolute filesystem paths with a stable placeholder that keeps the
 * basename (deterministic across disposable directories) and drops the
 * volatile directory prefix.
 */
function replaceAbsolutePaths(text: string, placeholder: string): string {
  return text.replace(
    /(?<![A-Za-z0-9_:.])\/[A-Za-z0-9_~.+-]*(?:\/[A-Za-z0-9_~.+-]*)*/g,
    (match) => {
      const trimmed = match.replace(/\/+$/, '');
      const base = trimmed.slice(trimmed.lastIndexOf('/') + 1);
      return base.length > 0 ? `${placeholder}/${base}` : placeholder;
    },
  );
}

/**
 * Normalize captured failure text so the same logical failure fingerprints
 * identically across fresh runs in different disposable directories:
 * absolute paths, line/column numbers, durations, goroutine ids, memory
 * addresses and timestamps are all projected to stable placeholders, while
 * assertion values and test identities are preserved.
 */
function normalizeFailureText(combined: string): string {
  let out = combined.replace(/\r\n?/g, '\n');
  // ANSI color escapes.
  out = out.replace(/\[[0-9;?]*[A-Za-z]/g, '');
  // Timestamps: ISO-8601, Go log timestamps, bare clock times.
  out = out.replace(
    /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?/g,
    '<TS>',
  );
  out = out.replace(/\b\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?\b/g, '<TS>');
  out = out.replace(/\b\d{2}:\d{2}:\d{2}(?:\.\d+)?\b/g, '<TS>');
  // URLs (may embed per-run tokens).
  out = out.replace(/https?:\/\/[^\s"'`\]\)]+/gi, '<URL>');
  // Absolute paths (disposable temp dirs differ run to run).
  out = replaceAbsolutePaths(out, '<ABS>');
  // Windows absolute paths.
  out = out.replace(/[A-Za-z]:\\[^\s"'`\]\)]*/g, '<ABS>');
  // Go file line/column numbers.
  out = out.replace(/\.go:\d+(?::\d+)?/g, '.go:#');
  // Durations: parenthesized test times first, then compound, then simple.
  out = out.replace(/\(\d+(?:\.\d+)?s\)/g, '(<DUR>)');
  out = out.replace(/\b\d+m\d+(?:\.\d+)?s\b/g, '<DUR>');
  out = out.replace(/\b\d+(?:\.\d+)?(?:ns|µs|us|ms|s|m)\b/g, '<DUR>');
  // Goroutine ids and memory addresses.
  out = out.replace(/goroutine \d+/g, 'goroutine N');
  out = out.replace(/0x[0-9a-fA-F]+/g, '0xADDR');
  // Whitespace: collapse runs, drop blank lines.
  out = out.replace(/[ \t]+/g, ' ');
  const lines: string[] = [];
  for (const line of out.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length > 0) lines.push(trimmed);
  }
  return lines.join('\n');
}

/**
 * Mechanical `--- FAIL:` test-name parse. Exactly one distinct raw name that
 * matches the Go test-identifier shape yields a name; zero, several, or a
 * malformed name yields null — never a guess.
 */
function parseTestName(combined: string): string | null {
  const names = new Set<string>();
  FAIL_LINE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FAIL_LINE_RE.exec(combined)) !== null) {
    const raw = match[1] ?? '';
    if (raw.length === 0 || raw.length > 512) {
      names.add('');
      continue;
    }
    names.add(raw);
  }
  if (names.size !== 1) return null;
  const only = [...names][0];
  if (only === undefined || only.length === 0) return null;
  if (!TEST_NAME_RE.test(only)) return null;
  return only;
}

/**
 * Mechanical `_test.go` site parse. Absolute prefixes project to their
 * basename (the file identity is certain; only the checkout layout is not).
 * Exactly one distinct file yields a path; zero or several yield null.
 */
function parseTestFile(combined: string): string | null {
  const files = new Set<string>();
  TEST_FILE_SITE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TEST_FILE_SITE_RE.exec(combined)) !== null) {
    const raw = match[0] ?? '';
    let file = match[1] ?? '';
    if (file.length === 0 || file.length > 512) return null;
    if (raw.trimStart().startsWith('/')) {
      file = file.slice(file.lastIndexOf('/') + 1);
    } else {
      file = file.replace(/^\.\/+/, '');
    }
    if (file.length === 0 || file.includes('..')) return null;
    files.add(file);
  }
  if (files.size !== 1) return null;
  const only = [...files][0];
  return only === undefined ? null : only;
}

/** Scrub secret-shaped material from free text. Applied before capping. */
function scrubSecrets(text: string): string {
  let out = text;
  // PEM private-key blocks (multiline) and lone markers.
  out = out.replace(
    /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g,
    '[REDACTED]',
  );
  out = out.replace(/-----(?:BEGIN|END) [A-Z0-9 ]*PRIVATE KEY-----/g, '[REDACTED]');
  // Bearer tokens and JWTs.
  out = out.replace(/\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]');
  out = out.replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, '[REDACTED]');
  // AWS-style access key ids and common provider token prefixes.
  out = out.replace(/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED]');
  out = out.replace(
    /\b(ghp|gho|github_pat|xox[bpas]|sk-live|sk-test|AIza)[A-Za-z0-9_-]{8,}/g,
    '[REDACTED]',
  );
  // URLs carrying credentials: redact the userinfo, keep the host.
  out = out.replace(/([a-z][a-z0-9+.-]*:\/\/)([^/@\s]+)@/gi, '$1[REDACTED]@');
  // JSON secret fields.
  out = out.replace(
    /("(?:access_token|refresh_token|id_token|password|passwd|client_secret|api_key|apikey|secret|private_key|authorization|cookie|session)"\s*:\s*)"[^"]{0,500}"/gi,
    '$1"[REDACTED]"',
  );
  // Bare `key=value` / `key: value` secret assignments.
  out = out.replace(
    /\b(api[_-]?key|client_secret|password|passwd|secret|token)\s*[:=]\s*[^\s,;}"']+/gi,
    '$1=[REDACTED]',
  );
  // Long opaque runs: base64-ish, then hex.
  out = out.replace(/\b[A-Za-z0-9+/]{40,}={0,2}\b/g, '[REDACTED]');
  out = out.replace(/\b[0-9a-fA-F]{32,}\b/g, '[REDACTED]');
  return out;
}

function truncateToBytes(value: string, maxBytes: number): string {
  const bytes = Buffer.from(value, 'utf8');
  if (bytes.length <= maxBytes) return value;
  let end = maxBytes;
  while (end > 0) {
    const byte = bytes[end];
    if (byte === undefined) {
      end -= 1;
      continue;
    }
    if ((byte & 0xc0) !== 0x80) break;
    end -= 1;
  }
  return bytes.subarray(0, end).toString('utf8');
}

/**
 * Build the untrusted summary: failure-evidence lines only (never command
 * echoes), secret-scrubbed, path-stripped, control-char-free, hard-capped.
 * Prompt-injection content survives only as inert text inside this string.
 */
function buildSummary(combined: string): string {
  const kept: string[] = [];
  for (const line of combined.split('\n')) {
    if (kept.length >= CURRENT_FAILURE_EVIDENCE_CAPS.maxSummaryLines) break;
    if (!SUMMARY_KEEP_RE.test(line)) continue;
    if (SUMMARY_DROP_RE.test(line)) continue;
    const collapsed = line.replace(/[ \t]+/g, ' ').trim();
    if (collapsed.length > 0) kept.push(collapsed);
  }
  let summary = kept.join('\n');
  summary = scrubSecrets(summary);
  summary = replaceAbsolutePaths(summary, '[path]');
  summary = summary.replace(/[A-Za-z]:\\[^\s"'`\]\)]*/g, '[path]');
  summary = summary.replace(/[^\x09\x0a\x20-\x7e\u00a0-\uffff]/g, '');
  summary = summary.trim();
  if (summary.length === 0) summary = 'test assertion failure';
  return truncateToBytes(summary, CURRENT_FAILURE_EVIDENCE_CAPS.maxSummaryBytes);
}

/**
 * Derive bounded, sanitized triage evidence from a host-observed repeated
 * current-source test failure. Returns null (fail closed) for any
 * non-qualifying class, insufficient executions, unparseable-but-required
 * context, oversize input, or output without a parsed assertion marker.
 * Never throws.
 */
export function deriveCurrentFailureEvidence(
  input: DeriveCurrentFailureEvidenceInput,
): CurrentFailureEvidence | null {
  if (input === null || typeof input !== 'object') return null;
  const { stdout, stderr, failureClass, matchingFreshExecutions, packagePath, groundedSourcePaths } =
    input;
  if (typeof stdout !== 'string' || typeof stderr !== 'string') return null;
  if (
    Buffer.byteLength(stdout, 'utf8') > CURRENT_FAILURE_EVIDENCE_CAPS.maxCapturedBytesPerStream ||
    Buffer.byteLength(stderr, 'utf8') > CURRENT_FAILURE_EVIDENCE_CAPS.maxCapturedBytesPerStream
  ) {
    return null;
  }
  // Only the assertion-failure class qualifies — never lowered.
  if (failureClass !== CURRENT_FAILURE_EVIDENCE_CLASSIFICATION) return null;
  if (
    typeof matchingFreshExecutions !== 'number' ||
    !Number.isSafeInteger(matchingFreshExecutions) ||
    matchingFreshExecutions < CURRENT_FAILURE_EVIDENCE_CAPS.minMatchingFreshExecutions
  ) {
    return null;
  }
  if (!isSafePackagePath(packagePath)) return null;
  if (
    !Array.isArray(groundedSourcePaths) ||
    groundedSourcePaths.length > CURRENT_FAILURE_EVIDENCE_CAPS.maxGroundedSourcePaths
  ) {
    return null;
  }
  const grounded: string[] = [];
  for (const entry of groundedSourcePaths) {
    if (!isSafeGroundedPath(entry)) return null;
    grounded.push(entry);
  }
  const combined = `${stdout}\n${stderr}`;
  // A nonzero exit without a parsed assertion marker is never evidence.
  if (!ASSERTION_MARKER_RE.test(combined)) return null;
  const normalized = normalizeFailureText(combined);
  if (normalized.length === 0) return null;
  const failureFingerprint = prefixedDigest24(
    CURRENT_FAILURE_EVIDENCE_FINGERPRINT_PREFIX,
    normalized,
  );
  if (!CURRENT_FAILURE_EVIDENCE_FINGERPRINT_RE.test(failureFingerprint)) return null;
  return {
    schemaVersion: CURRENT_FAILURE_EVIDENCE_SCHEMA_VERSION,
    repositoryRelativeTestFile: parseTestFile(combined),
    testName: parseTestName(combined),
    packagePath,
    failureFingerprint,
    matchingFreshExecutions,
    groundedSourcePaths: Object.freeze([...grounded]),
    classification: CURRENT_FAILURE_EVIDENCE_CLASSIFICATION,
    summary: buildSummary(combined),
  };
}
