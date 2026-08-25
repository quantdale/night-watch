import { prefixedDigest24 } from '../../core/identity/canonicalDigest';
import {
  asSafeControlCenterCode,
  asSafeControlCenterCursor,
  asSafeControlCenterDigest,
  asSafeControlCenterId,
  boundedPageLimit,
} from '../contracts/common';
import type {
  ControlCenterCollection,
  SafeControlCenterCode,
  SafeControlCenterCursor,
  SafeControlCenterDigest,
  SafeControlCenterId,
} from '../contracts/common';

export function publicIdentity(prefix: string, value: unknown): SafeControlCenterId {
  return prefixedDigest24(prefix, value) as SafeControlCenterId;
}

export function safePublicId(value: unknown, prefix: string): SafeControlCenterId {
  return asSafeControlCenterId(value) ?? publicIdentity(prefix, value);
}

export function safePublicCode(value: unknown, fallback: string): SafeControlCenterCode {
  return asSafeControlCenterCode(value) ?? asSafeControlCenterCode(fallback)!;
}

export function safePublicDigest(value: unknown): SafeControlCenterDigest | null {
  return asSafeControlCenterDigest(value);
}

export function sortedUniqueCodes(values: readonly unknown[]): readonly SafeControlCenterCode[] {
  const codes = values
    .map((value) => asSafeControlCenterCode(value))
    .filter((value): value is SafeControlCenterCode => value !== null);
  return [...new Set(codes)].sort((left, right) => left.localeCompare(right));
}

export function sortedUniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function boundedCollection<T>(items: readonly T[], requestedLimit: unknown = undefined): ControlCenterCollection<T> {
  const limit = boundedPageLimit(requestedLimit) ?? 50;
  const sortedItems = [...items];
  const visible = sortedItems.slice(0, limit);
  const truncated = sortedItems.length > visible.length;
  const nextCursor: SafeControlCenterCursor | null = truncated
    ? (asSafeControlCenterCursor(String(visible.length)) ?? null)
    : null;
  return {
    items: visible,
    page: { limit, nextCursor, truncated },
  };
}

export function boundedCount(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000 ? value : 0;
}

export function boundedDuration(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 604_800_000 ? value : null;
}
