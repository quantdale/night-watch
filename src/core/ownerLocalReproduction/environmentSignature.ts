// ---------------------------------------------------------------------------
// M5 (6.12, C-18) — known environment signatures.
//
// A reproduced check can fail for reasons that have nothing to do with the
// product: an unshared network refusing a dial, a missing toolchain, a denied
// sandbox path, a port already bound, an exhausted resource. Such a failure is
// REAL output but it is not evidence about the product, so it must be
// classified before the assertion-failure test can claim it — otherwise a
// candidate is admitted on the strength of the environment.
//
// Data-only: a fixed, bounded signature table and a pure classifier over a
// bounded slice of already-captured, already-scrubbed text. No fs, network,
// process, or AI authority.
// ---------------------------------------------------------------------------

export const ENVIRONMENT_SIGNATURE_VERSION = 'nightwatch.environment-signature.v1' as const;

/** The closed signature vocabulary. */
export const ENVIRONMENT_SIGNATURES = [
  'NETWORK_DIAL',
  'DNS_RESOLUTION',
  'PERMISSION_DENIED',
  'PORT_IN_USE',
  'TOOLCHAIN_MISSING',
  'RESOURCE_LIMIT',
] as const;
export type EnvironmentSignature = (typeof ENVIRONMENT_SIGNATURES)[number];

/** Bounded scan window: environment noise appears early in Go test output. */
export const ENVIRONMENT_SIGNATURE_SCAN_CHARS = 64_000;

interface SignatureRule {
  readonly signature: EnvironmentSignature;
  readonly pattern: RegExp;
}

/**
 * Fixed patterns, checked in this order. Each is a deliberate, reviewable
 * statement about a class of environment-caused failure — never a heuristic
 * over product text.
 */
const SIGNATURE_RULES: readonly SignatureRule[] = Object.freeze([
  {
    signature: 'DNS_RESOLUTION',
    pattern: /no such host|Temporary failure in name resolution|server misbehaving|lookup .* on .*:\d+/i,
  },
  {
    signature: 'NETWORK_DIAL',
    pattern: /dial tcp|connection refused|network is unreachable|i\/o timeout|connection reset by peer|EOF$/im,
  },
  {
    signature: 'PORT_IN_USE',
    pattern: /address already in use|bind: address already in use|listen tcp .*: bind/i,
  },
  {
    signature: 'TOOLCHAIN_MISSING',
    pattern: /executable file not found in \$PATH|command not found|go: cannot find main module|no such tool/i,
  },
  {
    signature: 'RESOURCE_LIMIT',
    pattern: /cannot allocate memory|out of memory|no space left on device|too many open files/i,
  },
  {
    signature: 'PERMISSION_DENIED',
    pattern: /permission denied|operation not permitted|read-only file system/i,
  },
]);

export interface EnvironmentSignatureVerdict {
  readonly schemaVersion: typeof ENVIRONMENT_SIGNATURE_VERSION;
  readonly matched: boolean;
  readonly signature: EnvironmentSignature | null;
}

/**
 * Classify captured output. The FIRST matching signature wins (the table is
 * ordered from most specific to most generic), and a non-match reports
 * `signature: null` rather than a guess.
 */
export function classifyEnvironmentSignature(text: string): EnvironmentSignatureVerdict {
  const bounded = typeof text === 'string' ? text.slice(0, ENVIRONMENT_SIGNATURE_SCAN_CHARS) : '';
  if (bounded.length === 0) {
    return Object.freeze({ schemaVersion: ENVIRONMENT_SIGNATURE_VERSION, matched: false, signature: null });
  }
  for (const rule of SIGNATURE_RULES) {
    if (rule.pattern.test(bounded)) {
      return Object.freeze({ schemaVersion: ENVIRONMENT_SIGNATURE_VERSION, matched: true, signature: rule.signature });
    }
  }
  return Object.freeze({ schemaVersion: ENVIRONMENT_SIGNATURE_VERSION, matched: false, signature: null });
}

/** The refusal code admission reports for an environment-caused failure. */
export const ENVIRONMENT_DEPENDENT_REFUSAL = 'ENVIRONMENT_DEPENDENT' as const;
