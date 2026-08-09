// ---------------------------------------------------------------------------
// Nightwatch — redaction layer.
//
// EVERY piece of evidence (network lines, console lines, events, URLs) passes
// through a RedactionLayer BEFORE persistence. The layer:
//   1. scrubs exact secret values registered at runtime (e.g. the value of an
//      Authorization header observed on a request);
//   2. redacts sensitive headers entirely;
//   3. redacts sensitive URL query parameters;
//   4. redacts common secret shapes in bodies (Bearer tokens, JWTs, AWS keys,
//      private keys, JSON secret fields).
//
// Redaction is applied by callers; the layer itself performs no I/O.
// ---------------------------------------------------------------------------

export const SENSITIVE_HEADERS: ReadonlySet<string> = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-user',
  'x-rbac-filter',
  'x-auth-token',
  'x-access-token',
  'x-refresh-token',
  'x-id-token',
  'x-csrf-token',
  'x-csrf',
  'x-auth',
]);

/** Query parameters whose values are always redacted. */
const SENSITIVE_QUERY_PARAMS = new Set([
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'api_key',
  'apikey',
  'key',
  'secret',
  'signature',
  'sig',
  'password',
  'passwd',
  'auth',
  'code',
  'state',
  'session',
]);

const REDACTED = '[REDACTED]';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Regex-based shape redaction, applied AFTER registered secrets. */
const SHAPE_PATTERNS: ReadonlyArray<{ re: RegExp; replacement: string }> = [
  // Authorization: Bearer <token>
  { re: /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi, replacement: `Bearer ${REDACTED}` },
  // JWT (three base64url segments)
  { re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, replacement: `${REDACTED}:jwt` },
  // AWS access key id
  { re: /\bAKIA[0-9A-Z]{16}\b/g, replacement: `${REDACTED}:aws-key` },
  // JSON secret fields
  {
    re: /("(?:access_token|refresh_token|id_token|password|passwd|client_secret|client-id|api_key|apikey|secret|private_key|authorization|cookie|session)"\s*:\s*)"[^"]{0,500}"/gi,
    replacement: '$1"[REDACTED]"',
  },
  // PEM private keys (multiline)
  {
    re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    replacement: `${REDACTED}:private-key`,
  },
];

/** Hosts/URLs may carry credentials too (user:pass@host) — redact them. */
const URL_USERINFO_RE = /^([a-z][a-z0-9+.-]*:\/\/)([^/@\s]+)@/i;

export class RedactionLayer {
  private readonly secrets: Array<{ re: RegExp; value: string }> = [];

  /** Register an exact secret value; all future redact* calls scrub it. */
  addSecret(value: string | undefined | null): void {
    if (!value) return;
    const v = value.trim();
    if (v.length < 4) return; // too short to be meaningful; avoids over-redaction
    if (this.secrets.some((s) => s.value === v)) return;
    this.secrets.push({ re: new RegExp(escapeRegExp(v), 'g'), value: v });
  }

  get secretCount(): number {
    return this.secrets.length;
  }

  static isSensitiveHeader(name: string): boolean {
    return SENSITIVE_HEADERS.has(name.toLowerCase().trim());
  }

  /** Redact free text (event messages, console output, bodies...). */
  redactText(text: string): string {
    let out = text;
    for (const s of this.secrets) out = out.replace(s.re, REDACTED);
    for (const p of SHAPE_PATTERNS) out = out.replace(p.re, p.replacement);
    return out;
  }

  /** Redact a full URL string (query params + userinfo). */
  redactUrl(url: string): string {
    let out = this.redactText(url);
    // userinfo
    const m = out.match(URL_USERINFO_RE);
    if (m && m[1] !== undefined && m[2] !== undefined) {
      out = out.replace(URL_USERINFO_RE, `${m[1]}${REDACTED}@`);
    }
    // query params
    try {
      const u = new URL(out);
      let changed = false;
      for (const key of Array.from(u.searchParams.keys())) {
        if (SENSITIVE_QUERY_PARAMS.has(key.toLowerCase())) {
          u.searchParams.set(key, REDACTED);
          changed = true;
        }
      }
      if (changed) {
        // URL re-serialization percent-encodes the bracket placeholder;
        // restore it for readable evidence (value is still redacted).
        out = u.toString().replace(/%5BREDACTED%5D/g, REDACTED);
      }
    } catch {
      // not a parseable URL — fall back to regex-based query redaction
      out = out.replace(
        /([?&])((?:access_?token|id_?token|api_?key|apikey|secret|signature|sig|password|passwd|auth|code|state|session|key)=)[^&#]*/gi,
        `$1$2${REDACTED}`
      );
    }
    return out;
  }

  /** Redact a headers map in place-safe way (returns a new object). */
  redactHeaders(headers: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [name, value] of Object.entries(headers)) {
      if (RedactionLayer.isSensitiveHeader(name)) {
        out[name] = REDACTED;
      } else {
        out[name] = this.redactText(value);
      }
    }
    return out;
  }

  /** Redact an array of name:value header strings (as in response.allHeaders()). */
  redactHeaderEntries(entries: Array<{ name: string; value: string }>): Array<{ name: string; value: string }> {
    return entries.map((e) => ({
      name: e.name,
      value: RedactionLayer.isSensitiveHeader(e.name) ? REDACTED : this.redactText(e.value),
    }));
  }
}

export function createRedactionLayer(): RedactionLayer {
  return new RedactionLayer();
}
