// ---------------------------------------------------------------------------
// Nightwatch — generic PASSIVE protocol oracles.
//
// These checks are protocol-level only (RECON_B §6.1 H1/H8 baseline): a
// response carrying an unexpected status, or a body that cannot be parsed as
// the JSON / NDJSON the server claimed it is. They carry NO business
// invariants — product/data invariants are Phase 6+.
//
// All `body`/`url` inputs arrive ALREADY REDACTED from the caller. Oracle
// diagnostics intentionally contain metadata only; response content is never
// included in an oracle message.
// ---------------------------------------------------------------------------

import { checkResourceStatus, type ResourceImpact, type ResourceRole } from './resourceChecks';

export interface UnexpectedStatusIssue {
  type: 'unexpected-status';
  severity: 'error' | 'warn';
  oracleSeverity: 'anomaly';
  protocolExpected: 'http-status';
  protocolObserved: 'unexpected-status';
  resourceRole?: ResourceRole;
  impact?: ResourceImpact;
  message: string;
}

export interface MalformedJsonIssue {
  type: 'malformed-json';
  severity: 'error';
  oracleSeverity: 'anomaly';
  protocolExpected: 'json';
  protocolObserved: 'invalid-json';
  message: string;
}

export interface MalformedNdjsonIssue {
  type: 'malformed-ndjson';
  severity: 'error';
  oracleSeverity: 'anomaly';
  protocolExpected: 'ndjson';
  protocolObserved: 'invalid-ndjson';
  message: string;
}

/**
 * HTTP status check.
 * - status >= 500 → error (server-side protocol failure).
 * - 401/403 → null: auth states vary per environment; Phase 1 does not
 *   classify them as issues.
 * - other 4xx → null: may be valid business rejections, not protocol failures.
 */
export function checkUnexpectedStatus(
  status: number,
  url: string,
  resourceRole: ResourceRole = 'OTHER',
): UnexpectedStatusIssue | null {
  return checkResourceStatus({ status, role: resourceRole, url });
}

/**
 * True when the body has >= 2 non-empty lines and every one of them starts
 * with '{' — i.e. it is NDJSON-shaped, owned by the NDJSON oracle.
 */
function looksLikeNdjson(body: string): boolean {
  const lines = body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return lines.length >= 2 && lines.every((l) => l.startsWith('{'));
}

function wantsJson(body: string, contentType: string | undefined): boolean {
  // Content-type claim: JSON (but NOT NDJSON — the NDJSON oracle owns that).
  const normalizedContentType = contentType?.toLowerCase();
  if (
    normalizedContentType !== undefined &&
    normalizedContentType.includes('json') &&
    !normalizedContentType.includes('ndjson') &&
    !normalizedContentType.includes('json-seq') &&
    !normalizedContentType.includes('stream')
  ) {
    return true;
  }
  // A declared non-JSON type is not a JSON-parser invitation. This prevents
  // HTML/login/text responses from being parsed merely because a URL looks
  // API-like. Sniff only when Content-Type is genuinely absent.
  if (normalizedContentType !== undefined) return false;
  // Missing Content-Type: only sniff when the body looks like JSON (single
  // JSON value, not multi-line NDJSON) and is small enough.
  const trimmed = body.trim();
  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && body.length < 200_000) {
    return !looksLikeNdjson(body);
  }
  return false;
}

/**
 * JSON body check. Only when the response claims JSON (or Content-Type is
 * absent and the body clearly looks like one JSON value). Successfully parsed
 * → null; otherwise a metadata-only anomaly.
 */
export function checkJsonBody(
  body: string,
  url: string,
  contentType: string | undefined,
  status?: number,
  bodyComplete = true,
): MalformedJsonIssue | null {
  // A response with no body is not malformed JSON unless a separately known
  // endpoint contract requires a body. Nightwatch has no such contract here.
  // Redirect bodies are browser control-flow responses, not application JSON.
  if (!bodyComplete || body.trim() === '' || status === 204 || status === 205 || (status !== undefined && status >= 300 && status < 400)) {
    return null;
  }
  if (!wantsJson(body, contentType)) return null;
  try {
    JSON.parse(body);
    return null;
  } catch {
    return {
      type: 'malformed-json',
      severity: 'error',
      oracleSeverity: 'anomaly',
      protocolExpected: 'json',
      protocolObserved: 'invalid-json',
      message: `malformed-json: ${url}`,
    };
  }
}

function wantsNdjson(body: string, contentType: string | undefined): boolean {
  // text/event-stream is NOT NDJSON (SSE frames are 'data: ...' lines) —
  // never flag it with the NDJSON oracle.
  if (contentType !== undefined && /event-stream/i.test(contentType)) return false;
  const normalizedContentType = contentType?.toLowerCase();
  if (
    normalizedContentType !== undefined &&
    (normalizedContentType.includes('ndjson') || normalizedContentType.includes('json-seq') || normalizedContentType.includes('stream'))
  ) {
    return true;
  }
  // A declared non-streaming type is authoritative. Do not sniff an
  // application/html or text/plain response as NDJSON merely because it has
  // multiple brace-prefixed lines.
  if (normalizedContentType !== undefined) return false;
  return looksLikeNdjson(body);
}

/**
 * NDJSON body check. Only when the response claims ndjson/stream (or the body
 * is NDJSON-shaped). Every non-empty line must parse as JSON; the first
 * failing line is reported with its 1-based line number and a preview.
 * Empty body → null (nothing to check).
 */
export function checkNdjsonBody(
  body: string,
  url: string,
  contentType: string | undefined,
  status?: number,
  bodyComplete = true,
): MalformedNdjsonIssue | null {
  if (!bodyComplete || body.trim() === '' || status === 204 || status === 205 || (status !== undefined && status >= 300 && status < 400)) return null;
  if (!wantsNdjson(body, contentType)) return null;
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (line.trim() === '') continue;
    try {
      JSON.parse(line);
    } catch {
      return {
        type: 'malformed-ndjson',
        severity: 'error',
        oracleSeverity: 'anomaly',
        protocolExpected: 'ndjson',
        protocolObserved: 'invalid-ndjson',
        message: `malformed-ndjson: ${url}: invalid line ${i + 1}`,
      };
    }
  }
  return null;
}
