// ---------------------------------------------------------------------------
// Nightwatch — pure resolved-address policy.
//
// This module intentionally has no Node/runtime imports. It parses numeric
// IPv4/IPv6 text exactly, classifies the complete answer set, and returns
// only bounded categorical facts to the proxy. Socket and DNS authority live
// outside this module.
//
// Range rationale: the special-use classes below cover the private, shared,
// documentation, benchmark, link-local, multicast, and reserved ranges in
// RFC 6890, RFC 1918, RFC 6598, RFC 5737, RFC 2544, RFC 3849, and the IANA
// special-purpose registries. The implementation uses integer range checks,
// not textual-prefix matching.
// ---------------------------------------------------------------------------

export const RESOLVED_ADDRESS_POLICY_VERSION = 'phase-1.2-resolved-address-policy-v1' as const;
export const MAX_RESOLVED_ADDRESS_COUNT = 8;
export const MAX_RESOLVED_ADDRESS_LENGTH = 45;

export type AddressFamily = 4 | 6;
export type AddressPolicyEnvironment = 'local' | 'dev' | 'next';

export type ResolvedAddressClass =
  | 'unspecified'
  | 'loopback'
  | 'private'
  | 'unique-local'
  | 'link-local'
  | 'shared'
  | 'documentation'
  | 'benchmark'
  | 'multicast'
  | 'broadcast'
  | 'reserved'
  | 'special-use'
  | 'global-unicast'
  | 'invalid';

export interface ResolvedAddressRecord {
  readonly address: string;
  readonly family: AddressFamily;
}

export interface ParsedResolvedAddress {
  readonly canonicalAddress: string;
  readonly family: AddressFamily;
  readonly value: bigint;
  readonly mapped: boolean;
  readonly mappedIpv4: string | null;
}

export interface ResolvedAddressClassification {
  readonly valid: boolean;
  readonly canonicalAddress: string | null;
  readonly family: AddressFamily | null;
  readonly addressClass: ResolvedAddressClass;
  /** Alias retained so callers can use the semantic field name directly. */
  readonly classification: ResolvedAddressClass;
  readonly mapped: boolean;
  readonly mappedIpv4: string | null;
}

export type AddressAdmissionReason =
  | 'EMPTY_ANSWER'
  | 'ANSWER_SET_OVERSIZED'
  | 'ANSWER_ADDRESS_OVERSIZED'
  | 'MALFORMED_ADDRESS'
  | 'ADDRESS_FAMILY_MISMATCH'
  | 'LOCAL_ADDRESS_NOT_EXACT'
  | 'ADDRESS_POLICY_DENIED'
  | 'MIXED_ANSWER_SET'
  | 'MAPPED_ADDRESS_UNSUPPORTED';

export interface AdmittedResolvedAddress {
  readonly address: string;
  readonly family: AddressFamily;
  readonly addressClass: Exclude<ResolvedAddressClass, 'invalid'>;
  readonly mapped: boolean;
}

export type ResolvedAddressAdmission =
  | {
      readonly outcome: 'admitted';
      readonly kind: 'admitted';
      readonly addresses: readonly AdmittedResolvedAddress[];
      readonly selected: AdmittedResolvedAddress;
      readonly answerCount: number;
      readonly reason: 'ADDRESS_SET_ACCEPTED';
    }
  | {
      readonly outcome: 'denied' | 'failed';
      readonly kind: 'denied' | 'failed';
      readonly addresses: readonly [];
      readonly selected: null;
      readonly answerCount: number;
      readonly reason: AddressAdmissionReason;
    };

function parseDecimalOctet(value: string): number | null {
  if (!/^[0-9]{1,3}$/.test(value) || (value.length > 1 && value.startsWith('0'))) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 255 ? parsed : null;
}

function parseIpv4Value(address: string): bigint | null {
  const parts = address.split('.');
  if (parts.length !== 4) return null;
  const octets = parts.map(parseDecimalOctet);
  if (octets.some((octet) => octet === null)) return null;
  return octets.reduce((value, octet) => (value << 8n) | BigInt(octet as number), 0n);
}

function formatIpv4Value(value: bigint): string {
  return [24n, 16n, 8n, 0n]
    .map((shift) => Number((value >> shift) & 255n))
    .join('.');
}

function parseHexGroup(value: string): number | null {
  if (!/^[0-9a-f]{1,4}$/i.test(value)) return null;
  return Number.parseInt(value, 16);
}

function parseIpv6Groups(address: string): number[] | null {
  if (address.length === 0 || address.includes('%') || /[^0-9a-f:.]/i.test(address)) return null;
  const compression = address.indexOf('::');
  if (compression !== -1 && address.indexOf('::', compression + 2) !== -1) return null;

  const leftText = compression === -1 ? address : address.slice(0, compression);
  const rightText = compression === -1 ? '' : address.slice(compression + 2);
  const left = leftText === '' ? [] : leftText.split(':');
  const right = rightText === '' ? [] : rightText.split(':');
  if (left.some((part) => part === '') || right.some((part) => part === '')) return null;

  const parts = [...left, ...right];
  const dotted = parts.filter((part) => part.includes('.'));
  if (dotted.length > 1 || (dotted.length === 1 && parts[parts.length - 1] !== dotted[0])) return null;
  // An embedded IPv4 tail is the final address component. `1.2.3.4::` would
  // otherwise be expanded as an IPv4 value followed by zero IPv6 groups.
  if (dotted.length === 1 && compression !== -1 && right.length === 0) return null;

  const groups: number[] = [];
  for (const part of parts) {
    if (part.includes('.')) {
      const ipv4 = parseIpv4Value(part);
      if (ipv4 === null) return null;
      groups.push(Number((ipv4 >> 16n) & 0xffffn), Number(ipv4 & 0xffffn));
    } else {
      const group = parseHexGroup(part);
      if (group === null) return null;
      groups.push(group);
    }
  }

  if (compression === -1) return groups.length === 8 ? groups : null;
  if (groups.length >= 8) return null;
  const missing = 8 - groups.length;
  const leftGroups = leftText === '' ? 0 : left.length;
  return [...groups.slice(0, leftGroups), ...Array.from({ length: missing }, () => 0), ...groups.slice(leftGroups)];
}

function groupsToValue(groups: readonly number[]): bigint {
  return groups.reduce((value, group) => (value << 16n) | BigInt(group), 0n);
}

function valueToGroups(value: bigint): number[] {
  const groups: number[] = [];
  for (let shift = 112n; shift >= 0n; shift -= 16n) groups.push(Number((value >> shift) & 0xffffn));
  return groups;
}

function formatIpv6Value(value: bigint): string {
  const groups = valueToGroups(value);
  let bestStart = -1;
  let bestLength = 1;
  for (let index = 0; index < groups.length;) {
    if (groups[index] !== 0) {
      index += 1;
      continue;
    }
    const start = index;
    while (index < groups.length && groups[index] === 0) index += 1;
    const length = index - start;
    if (length > bestLength) {
      bestStart = start;
      bestLength = length;
    }
  }
  if (bestStart === -1) return groups.map((group) => group.toString(16)).join(':');
  const left = groups.slice(0, bestStart).map((group) => group.toString(16)).join(':');
  const right = groups.slice(bestStart + bestLength).map((group) => group.toString(16)).join(':');
  if (left === '' && right === '') return '::';
  if (left === '') return `::${right}`;
  if (right === '') return `${left}::`;
  return `${left}::${right}`;
}

function parseAddress(address: string, family?: AddressFamily): ParsedResolvedAddress | null {
  if (typeof address !== 'string' || address.length === 0 || address.length > MAX_RESOLVED_ADDRESS_LENGTH) return null;
  if (family !== undefined && family !== 4 && family !== 6) return null;
  if (address.includes(':')) {
    if (family === 4 || address.includes('[') || address.includes(']')) return null;
    const groups = parseIpv6Groups(address);
    if (groups === null) return null;
    const value = groupsToValue(groups);
    const mapped = (value >> 32n) === 0xffffn;
    const mappedIpv4 = mapped ? formatIpv4Value(value & 0xffffffffn) : null;
    return {
      canonicalAddress: formatIpv6Value(value),
      family: 6,
      value,
      mapped,
      mappedIpv4,
    };
  }
  if (family === 6) return null;
  const value = parseIpv4Value(address);
  if (value === null) return null;
  return {
    canonicalAddress: formatIpv4Value(value),
    family: 4,
    value,
    mapped: false,
    mappedIpv4: null,
  };
}

function ipv4InRange(value: bigint, base: string, prefix: number): boolean {
  const start = parseIpv4Value(base);
  if (start === null) return false;
  return (value >> BigInt(32 - prefix)) === (start >> BigInt(32 - prefix));
}

function ipv6InRange(value: bigint, base: string, prefix: number): boolean {
  const parsed = parseAddress(base, 6);
  if (parsed === null) return false;
  return (value >> BigInt(128 - prefix)) === (parsed.value >> BigInt(128 - prefix));
}

function classifyIpv4(value: bigint): Exclude<ResolvedAddressClass, 'invalid'> {
  if (ipv4InRange(value, '0.0.0.0', 8)) return 'unspecified';
  if (ipv4InRange(value, '127.0.0.0', 8)) return 'loopback';
  if (ipv4InRange(value, '10.0.0.0', 8) || ipv4InRange(value, '172.16.0.0', 12) || ipv4InRange(value, '192.168.0.0', 16)) return 'private';
  if (ipv4InRange(value, '169.254.0.0', 16)) return 'link-local';
  if (ipv4InRange(value, '100.64.0.0', 10)) return 'shared';
  if (ipv4InRange(value, '224.0.0.0', 4)) return 'multicast';
  if (value === 0xffffffffn) return 'broadcast';
  if (ipv4InRange(value, '192.0.2.0', 24) || ipv4InRange(value, '198.51.100.0', 24) || ipv4InRange(value, '203.0.113.0', 24)) return 'documentation';
  if (ipv4InRange(value, '198.18.0.0', 15)) return 'benchmark';
  if (
    ipv4InRange(value, '192.0.0.0', 24) ||
    ipv4InRange(value, '192.31.196.0', 24) ||
    ipv4InRange(value, '192.52.193.0', 24) ||
    ipv4InRange(value, '192.88.99.0', 24)
  ) return 'special-use';
  if (ipv4InRange(value, '240.0.0.0', 4)) return 'reserved';
  return 'global-unicast';
}

function classifyIpv6(value: bigint): Exclude<ResolvedAddressClass, 'invalid'> {
  if (value === 0n) return 'unspecified';
  if (value === 1n) return 'loopback';
  if (ipv6InRange(value, 'fe80::', 10)) return 'link-local';
  if (ipv6InRange(value, 'fc00::', 7)) return 'unique-local';
  if (ipv6InRange(value, 'ff00::', 8)) return 'multicast';
  if (ipv6InRange(value, '2001:db8::', 32)) return 'documentation';
  if (ipv6InRange(value, '2001:2::', 48)) return 'benchmark';
  if (
    ipv6InRange(value, '100::', 64) ||
    ipv6InRange(value, '64:ff9b::', 96) ||
    ipv6InRange(value, '64:ff9b:1::', 48) ||
    ipv6InRange(value, '2001::', 32) ||
    ipv6InRange(value, '2001:1::', 32) ||
    ipv6InRange(value, '2001:3::', 32) ||
    ipv6InRange(value, '2001:10::', 28) ||
    ipv6InRange(value, '2001:20::', 28) ||
    ipv6InRange(value, '2002::', 16)
  ) return 'special-use';
  const globalStart = 0x20000000000000000000000000000000n;
  const globalEnd = 0x3fffffffffffffffffffffffffffffffn;
  return value >= globalStart && value <= globalEnd ? 'global-unicast' : 'reserved';
}

export function parseResolvedAddress(address: string, family?: AddressFamily): ParsedResolvedAddress | null {
  return parseAddress(address, family);
}

export function normalizeResolvedAddress(address: string, family?: AddressFamily): string | null {
  return parseAddress(address, family)?.canonicalAddress ?? null;
}

export function classifyResolvedAddress(address: string, family?: AddressFamily): ResolvedAddressClassification {
  const parsed = parseAddress(address, family);
  if (parsed === null) {
    return {
      valid: false,
      canonicalAddress: null,
      family: null,
      addressClass: 'invalid',
      classification: 'invalid',
      mapped: false,
      mappedIpv4: null,
    };
  }
  const addressClass = parsed.mapped ? classifyIpv4(parsed.value & 0xffffffffn) : parsed.family === 4 ? classifyIpv4(parsed.value) : classifyIpv6(parsed.value);
  return {
    valid: true,
    canonicalAddress: parsed.canonicalAddress,
    family: parsed.family,
    addressClass,
    classification: addressClass,
    mapped: parsed.mapped,
    mappedIpv4: parsed.mappedIpv4,
  };
}

function exactLocalLoopback(item: ResolvedAddressClassification): boolean {
  return item.valid && !item.mapped && (
    (item.family === 4 && item.canonicalAddress === '127.0.0.1') ||
    (item.family === 6 && item.canonicalAddress === '::1')
  );
}

function acceptableForEnvironment(environment: AddressPolicyEnvironment, item: ResolvedAddressClassification): boolean {
  if (!item.valid || item.mapped) return false;
  if (environment === 'local') return exactLocalLoopback(item);
  return item.addressClass === 'global-unicast';
}

function rejectedReason(environment: AddressPolicyEnvironment, items: readonly ResolvedAddressClassification[]): AddressAdmissionReason {
  if (items.some((item) => item.mapped)) return 'MAPPED_ADDRESS_UNSUPPORTED';
  if (environment === 'local') return 'LOCAL_ADDRESS_NOT_EXACT';
  return 'ADDRESS_POLICY_DENIED';
}

export function admitResolvedAddressSet(
  environment: AddressPolicyEnvironment,
  answers: readonly unknown[],
): ResolvedAddressAdmission {
  if (!Array.isArray(answers) || answers.length === 0) {
    return { outcome: 'failed', kind: 'failed', addresses: [], selected: null, answerCount: 0, reason: 'EMPTY_ANSWER' };
  }
  if (answers.length > MAX_RESOLVED_ADDRESS_COUNT) {
    return { outcome: 'failed', kind: 'failed', addresses: [], selected: null, answerCount: answers.length, reason: 'ANSWER_SET_OVERSIZED' };
  }

  const unique = new Map<string, ResolvedAddressClassification>();
  for (const answer of answers) {
    if (answer === null || typeof answer !== 'object' || Array.isArray(answer)) {
      return { outcome: 'failed', kind: 'failed', addresses: [], selected: null, answerCount: answers.length, reason: 'MALFORMED_ADDRESS' };
    }
    const candidate = answer as Record<string, unknown>;
    const candidateKeys = Object.keys(candidate);
    if (candidateKeys.length !== 2 || candidateKeys.some((key) => key !== 'address' && key !== 'family')) {
      return { outcome: 'failed', kind: 'failed', addresses: [], selected: null, answerCount: answers.length, reason: 'MALFORMED_ADDRESS' };
    }
    if (typeof candidate.address !== 'string') {
      return { outcome: 'failed', kind: 'failed', addresses: [], selected: null, answerCount: answers.length, reason: 'MALFORMED_ADDRESS' };
    }
    if (candidate.address.length > MAX_RESOLVED_ADDRESS_LENGTH) {
      return { outcome: 'failed', kind: 'failed', addresses: [], selected: null, answerCount: answers.length, reason: 'ANSWER_ADDRESS_OVERSIZED' };
    }
    if (candidate.family !== 4 && candidate.family !== 6) {
      return { outcome: 'failed', kind: 'failed', addresses: [], selected: null, answerCount: answers.length, reason: 'MALFORMED_ADDRESS' };
    }
    const classification = classifyResolvedAddress(candidate.address, candidate.family);
    if (!classification.valid) {
      const familyOnly = classifyResolvedAddress(candidate.address);
      return {
        outcome: 'failed',
        kind: 'failed',
        addresses: [],
        selected: null,
        answerCount: answers.length,
        reason: familyOnly.valid ? 'ADDRESS_FAMILY_MISMATCH' : 'MALFORMED_ADDRESS',
      };
    }
    unique.set(`${classification.family}:${classification.canonicalAddress}`, classification);
  }

  const items = [...unique.values()];
  const accepted = items.filter((item) => acceptableForEnvironment(environment, item));
  if (accepted.length !== items.length) {
    const reason = accepted.length > 0 ? 'MIXED_ANSWER_SET' : rejectedReason(environment, items);
    return { outcome: 'denied', kind: 'denied', addresses: [], selected: null, answerCount: answers.length, reason };
  }

  const addresses = accepted
    .map((item) => ({
      address: item.canonicalAddress as string,
      family: item.family as AddressFamily,
      addressClass: item.addressClass as Exclude<ResolvedAddressClass, 'invalid'>,
      mapped: item.mapped,
    }))
    .sort((left, right) => left.family - right.family || left.address.localeCompare(right.address));
  if (addresses.length === 0) {
    return { outcome: 'failed', kind: 'failed', addresses: [], selected: null, answerCount: answers.length, reason: 'EMPTY_ANSWER' };
  }
  return {
    outcome: 'admitted',
    kind: 'admitted',
    addresses,
    selected: addresses[0] as AdmittedResolvedAddress,
    answerCount: answers.length,
    reason: 'ADDRESS_SET_ACCEPTED',
  };
}
