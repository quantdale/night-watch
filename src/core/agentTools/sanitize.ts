// ---------------------------------------------------------------------------
// Lane C — output sanitization for tool results.
//
// Every byte a tool hands back to the reasoner is untrusted product/source/
// evidence data with zero instruction authority. This module redacts
// credential-shaped material, truncates to the protocol byte cap, and wraps
// the remainder in UNTRUSTED envelopes. Pure: no fs/network/child_process.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../identity/canonicalDigest';
import {
  UNTRUSTED_BYTE_CAP,
  UNTRUSTED_ENVELOPE_VERSION,
  untrustedLooksLikeInjection,
  type UntrustedEnvelope,
  type UntrustedSource,
} from '../agentProtocol/untrusted';

/** Mirrors the protocol validator's secret vocabulary (validate.ts keeps its
 * copy private, so the execution layer carries its own — same shape). */
const SECRET_RE =
  /(?:Bearer\s+[A-Za-z0-9._~+/=-]{8,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/g;

export const SANITIZED_PLACEHOLDER = '[REDACTED]' as const;

export interface SanitizedPayload {
  readonly text: string;
  readonly redacted: boolean;
  readonly truncated: boolean;
}

/** Redact secrets and truncate to the protocol byte cap. Never throws: an
 * unstringifiable value becomes a fixed marker rather than a crash. */
export function sanitizeJsonText(value: unknown): SanitizedPayload {
  let raw: string;
  try {
    raw = JSON.stringify(value) ?? 'null';
  } catch {
    raw = '{"unserializable":true}';
  }
  const redactedText = raw.replace(SECRET_RE, SANITIZED_PLACEHOLDER);
  const redacted = redactedText !== raw;
  if (redactedText.length <= UNTRUSTED_BYTE_CAP) {
    return { text: redactedText, redacted, truncated: false };
  }
  return { text: redactedText.slice(0, UNTRUSTED_BYTE_CAP), redacted, truncated: true };
}

export function wrapUntrusted(source: UntrustedSource, bytes: string): UntrustedEnvelope {
  return {
    schemaVersion: UNTRUSTED_ENVELOPE_VERSION,
    trust: 'UNTRUSTED',
    source,
    digest: prefixedDigest24('untrusted', bytes),
    bytes,
  };
}

/** Evidence ref minted from sanitized bytes (ev:sha256:24hex vocabulary). */
export function evidenceRefFor(bytes: string): string {
  return prefixedDigest24('ev', bytes);
}

/** True when arbitrary unknown-typed input contains injection-shaped text.
 * Used for observation only — it never changes tool selection. */
export function scanForInjection(value: unknown): boolean {
  if (typeof value === 'string') return untrustedLooksLikeInjection(value);
  if (value === null || value === undefined) return false;
  try {
    return untrustedLooksLikeInjection(JSON.stringify(value) ?? '');
  } catch {
    return false;
  }
}
