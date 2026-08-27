// ---------------------------------------------------------------------------
// Nightwatch — bounded proxy resolver/admission boundary.
//
// The system resolver is constructed inside this module. Callers can supply a
// deterministic data-only resolver in synthetic tests, but a resolver result
// never supplies a socket, callback, or connector. Every answer is admitted
// by addressPolicy before a protocol handler may create an upstream socket.
// ---------------------------------------------------------------------------

import { lookup } from 'node:dns/promises';
import {
  admitResolvedAddressSet,
  classifyResolvedAddress,
  type AddressAdmissionReason,
  type AddressPolicyEnvironment,
  type AdmittedResolvedAddress,
  type ResolvedAddressRecord,
  type ResolvedAddressAdmission,
} from './addressPolicy';

export const PROXY_RESOLUTION_TIMEOUT_MS = 1_000;
export const PROXY_RESOLUTION_TIMEOUT_MAX_MS = 5_000;

export type ProxyResolutionFailureReason =
  | AddressAdmissionReason
  | 'RESOLVER_ERROR'
  | 'RESOLUTION_TIMEOUT'
  | 'RESOLUTION_CANCELLED';

export interface ProxyResolver {
  resolve(hostname: string): Promise<readonly ResolvedAddressRecord[]>;
}

export interface ProxyResolution {
  readonly outcome: 'admitted' | 'denied' | 'failed';
  readonly reason: 'ADDRESS_SET_ACCEPTED' | 'LITERAL_ADDRESS' | 'LOCALHOST_CANONICALIZED' | ProxyResolutionFailureReason;
  readonly answerCount: number;
  readonly selected: AdmittedResolvedAddress | null;
  readonly addresses: readonly AdmittedResolvedAddress[];
}

interface ResolverSettled {
  readonly kind: 'answers' | 'resolver-error' | 'timeout';
  readonly answers?: readonly unknown[];
}

function boundedTimeout(value: number | undefined): number {
  if (!Number.isInteger(value) || value === undefined || value < 1) return PROXY_RESOLUTION_TIMEOUT_MS;
  return Math.min(value, PROXY_RESOLUTION_TIMEOUT_MAX_MS);
}

function fromAdmission(admission: ResolvedAddressAdmission, literalReason?: 'LITERAL_ADDRESS' | 'LOCALHOST_CANONICALIZED'): ProxyResolution {
  if (admission.outcome === 'admitted') {
    return {
      outcome: 'admitted',
      reason: literalReason ?? admission.reason,
      answerCount: admission.answerCount,
      selected: admission.selected,
      addresses: admission.addresses,
    };
  }
  return {
    outcome: admission.outcome,
    reason: admission.reason,
    answerCount: admission.answerCount,
    selected: null,
    addresses: [],
  };
}

function failure(reason: ProxyResolutionFailureReason): ProxyResolution {
  return { outcome: 'failed', reason, answerCount: 0, selected: null, addresses: [] };
}

/** The only production resolver construction used by the outer proxy. */
export function createSystemProxyResolver(): ProxyResolver {
  return {
    resolve: async (hostname) => {
      const records = await lookup(hostname, { all: true, verbatim: true });
      return records
        .filter((record) => record.family === 4 || record.family === 6)
        .map((record) => ({ address: record.address, family: record.family as 4 | 6 }));
    },
  };
}

function settledAnswers(resolver: ProxyResolver, hostname: string): Promise<ResolverSettled> {
  // The rejection handler is attached immediately so a system lookup that
  // completes after the logical timeout cannot become an unhandled rejection.
  return Promise.resolve()
    .then(() => resolver.resolve(hostname))
    .then(
      (answers) => ({ kind: 'answers' as const, answers: answers as readonly unknown[] }),
      () => ({ kind: 'resolver-error' as const }),
    );
}

function timeoutResult(timeoutMs: number): { promise: Promise<ResolverSettled>; cancel: () => void } {
  let timer: NodeJS.Timeout | undefined;
  const promise = new Promise<ResolverSettled>((resolve) => {
    timer = setTimeout(() => resolve({ kind: 'timeout' }), timeoutMs);
  });
  return {
    promise,
    cancel: () => {
      if (timer !== undefined) clearTimeout(timer);
    },
  };
}

/**
 * Resolve one already-policy-allowlisted hostname and admit its complete
 * bounded answer set. This function must be called only after hostname policy
 * classification has returned `allow`.
 */
export async function resolveAndAdmitTarget(
  hostname: string,
  environment: AddressPolicyEnvironment,
  resolver: ProxyResolver,
  options: { readonly timeoutMs?: number } = {},
): Promise<ProxyResolution> {
  const normalized = hostname.toLowerCase();
  const literal = classifyResolvedAddress(normalized);
  if (literal.valid && literal.canonicalAddress !== null && literal.family !== null) {
    return fromAdmission(
      admitResolvedAddressSet(environment, [{ address: literal.canonicalAddress, family: literal.family }]),
      'LITERAL_ADDRESS',
    );
  }

  // `localhost` is a local semantic name, never an external-DNS authority.
  // The address still goes through the exact local policy check.
  if (normalized === 'localhost') {
    return fromAdmission(
      admitResolvedAddressSet(environment, [{ address: '127.0.0.1', family: 4 }]),
      'LOCALHOST_CANONICALIZED',
    );
  }

  const timeout = timeoutResult(boundedTimeout(options.timeoutMs));
  const settled = await Promise.race([settledAnswers(resolver, normalized), timeout.promise]);
  timeout.cancel();
  if (settled.kind === 'timeout') return failure('RESOLUTION_TIMEOUT');
  if (settled.kind === 'resolver-error' || settled.answers === undefined) return failure('RESOLVER_ERROR');
  return fromAdmission(admitResolvedAddressSet(environment, settled.answers));
}
