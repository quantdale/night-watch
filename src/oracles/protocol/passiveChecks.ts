// ---------------------------------------------------------------------------
// Nightwatch — generic PASSIVE protocol oracles.
//
// These checks are protocol-level only (RECON_B §6.1 H1/H8 baseline): a
// response carrying an unexpected status, or a body that cannot be parsed as
// the JSON / NDJSON the server claimed it is. They carry NO business
// invariants — product/data invariants are Phase 6+.
//
// All `body`/`url` inputs arrive ALREADY REDACTED from the caller; the preview
// strings embedded in messages are therefore safe to persist.
// ---------------------------------------------------------------------------

export interface UnexpectedStatusIssue {
  type: 'unexpected-status';
  severity: 'error' | 'warn';
  message: string;
}

export interface MalformedJsonIssue {
  type: 'malformed-json';
  severity: 'error';
  message: string;
}

export interface MalformedNdjsonIssue {
  type: 'malformed-ndjson';
  severity: 'error';
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
  url: string
): UnexpectedStatusIssue | null {
  if (status >= 500) {
    return {
      type: 'unexpected-status',
      severity: 'error',
      message: `unexpected-status: HTTP ${status} for ${url}`,
    };
  }
  return null;
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
  if (contentType !== undefined && contentType.includes('json') && !contentType.includes('ndjson')) {
    return true;
  }
  // Content-type missing/misleading: only sniff when the body looks like
  // JSON (single JSON value, not multi-line NDJSON) and is small enough.
  const trimmed = body.trim();
  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && body.length < 200_000) {
    return !looksLikeNdjson(body);
  }
  return false;
}

/**
 * JSON body check. Only when the response claims JSON (or the body clearly
 * looks like a single JSON value). Successfully parsed → null; otherwise an
 * issue carrying a 200-char preview of the (already redacted) body.
 */
export function checkJsonBody(
  body: string,
  url: string,
  contentType: string | undefined
): MalformedJsonIssue | null {
  if (!wantsJson(body, contentType)) return null;
  try {
    JSON.parse(body);
    return null;
  } catch {
    const preview = body.slice(0, 200);
    return {
      type: 'malformed-json',
      severity: 'error',
      message: `malformed-json: ${url}: body is not valid JSON (preview: ${JSON.stringify(preview)})`,
    };
  }
}

function wantsNdjson(body: string, contentType: string | undefined): boolean {
  if (contentType !== undefined && (contentType.includes('ndjson') || contentType.includes('stream'))) {
    return true;
  }
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
  contentType: string | undefined
): MalformedNdjsonIssue | null {
  if (body.trim() === '') return null;
  if (!wantsNdjson(body, contentType)) return null;
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (line.trim() === '') continue;
    try {
      JSON.parse(line);
    } catch {
      const preview = line.slice(0, 200);
      return {
        type: 'malformed-ndjson',
        severity: 'error',
        message: `malformed-ndjson: ${url}: line ${i + 1} is not valid JSON (preview: ${JSON.stringify(preview)})`,
      };
    }
  }
  return null;
}
