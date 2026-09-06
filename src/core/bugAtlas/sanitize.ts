// ---------------------------------------------------------------------------
// Lane D — historical-text sanitation.
//
// Every byte of historical record text is UNTRUSTED: it may contain prompt
// injection ("ignore previous instructions …") or leaked secrets. This module
// is pure data handling: cap lengths, redact credential-like spans, and flag
// injection-shaped text so callers keep it inert. It never executes,
// interprets, or follows anything found inside the text. Pure module: no
// fs/network/child_process/AI authority.
// ---------------------------------------------------------------------------

import { createHash } from 'node:crypto';
import {
  UNTRUSTED_BYTE_CAP,
  UNTRUSTED_ENVELOPE_VERSION,
  untrustedLooksLikeInjection,
  type UntrustedEnvelope,
} from '../agentProtocol/untrusted';

export { UNTRUSTED_BYTE_CAP };

const REDACTED = '[REDACTED]';

/**
 * Credential-shaped spans. Conservative on purpose: a false positive costs a
 * redaction marker, a false negative leaks a secret into a persisted record.
 * Private keys match on the BEGIN fence only (the body stays intact but the
 * fence — the exfiltration signal — is neutralised).
 */
const CREDENTIAL_PATTERNS: readonly RegExp[] = [
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{8,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{8,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{8,}\b/g,
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/g,
  /\bBearer\s+[A-Za-z0-9\-._~+/=]{8,}/g,
  /((?:password|passwd|pwd|api[_-]?key|secret[_-]?key|client[_-]?secret|aws_secret_access_key|auth[_-]?token)\s*[:=]\s*)(?!\[REDACTED\])(?:"[^"]+"|'[^']+'|\S+)/gi,
];

export interface RedactionResult {
  readonly text: string;
  readonly redactions: number;
}

/** Redact every credential-shaped span; counts replacements. */
export function redactCredentialsInText(text: string): RedactionResult {
  let redacted = text;
  let redactions = 0;
  for (const pattern of CREDENTIAL_PATTERNS) {
    pattern.lastIndex = 0;
    redacted = redacted.replace(pattern, (match) => {
      redactions += 1;
      // Keep a `key=[REDACTED]` shape for `key: value` pairs so the field
      // still reads as "a credential was here", never the secret itself.
      const separator = match.search(/\s*[:=]\s*/);
      if (separator > 0) return `${match.slice(0, separator)}=${REDACTED}`;
      return REDACTED;
    });
  }
  return { text: redacted, redactions };
}

/** True when the text still carries a credential-shaped span. */
export function containsCredentialLikeSecret(text: string): boolean {
  for (const pattern of CREDENTIAL_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) return true;
  }
  return false;
}

/** Byte-cap a text field; over-long input is truncated with a marker. */
export function capTextField(text: string, cap: number): string {
  if (Buffer.byteLength(text, 'utf8') <= cap) return text;
  const bytes = Buffer.from(text, 'utf8').subarray(0, cap);
  return `${bytes.toString('utf8')}…[TRUNCATED]`;
}

export interface HistoricalTextScan {
  /** Protocol injection screen verdict — quarantined means "data only". */
  readonly quarantined: boolean;
  /** Credential-shaped spans found (and redacted by callers). */
  readonly secretSpans: number;
}

/**
 * Scan one historical text: flag injection-shaped content via the frozen
 * protocol screen and count credential spans. The text itself is never
 * interpreted — the scan result only tells the caller to keep it inert.
 */
export function scanHistoricalText(text: string): HistoricalTextScan {
  return {
    quarantined: untrustedLooksLikeInjection(text),
    secretSpans: redactCredentialsInText(text).redactions,
  };
}

/**
 * Wrap raw historical bytes in a protocol untrusted envelope so downstream
 * consumers see the HISTORICAL_RECORD source and UNTRUSTED trust literal.
 * The envelope carries bytes as data; nothing here grants them authority.
 */
export function wrapHistoricalText(
  bytes: string,
  digestScope: string,
): UntrustedEnvelope {
  const capped =
    Buffer.byteLength(bytes, 'utf8') <= UNTRUSTED_BYTE_CAP
      ? bytes
      : capTextField(bytes, UNTRUSTED_BYTE_CAP);
  const digest = createHash('sha256')
    .update(`nightwatch.bug-atlas:historical-text:${digestScope}\n`, 'utf8')
    .update(capped, 'utf8')
    .digest('hex');
  return {
    schemaVersion: UNTRUSTED_ENVELOPE_VERSION,
    trust: 'UNTRUSTED',
    source: 'HISTORICAL_RECORD',
    digest: `sha256:${digest}`,
    bytes: capped,
  };
}
