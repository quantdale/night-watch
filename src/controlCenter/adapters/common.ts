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

/**
 * NW-10. The cursor is an OFFSET into the current snapshot, encoded as
 * decimal digits.
 *
 * It was previously emitted and never consumed: `boundedCollection` always
 * sliced from index 0, so every list DTO advertised a `nextCursor` that no
 * layer could honour. The server validated the query parameter and the
 * default collector dropped it, so passing the cursor back returned page one
 * again. Adding client cursor state without this would have produced a "load
 * more" that re-appended the first page forever.
 *
 * A malformed cursor becomes offset 0 as defence in depth — the server
 * already rejects one with `CONTROL_CENTER_PATH_REJECTED` before it reaches
 * here. A cursor past the end clamps to the end, which yields an empty final
 * page rather than silently restarting at the beginning.
 *
 * Because the offset is positional, it is only meaningful within one
 * snapshot. A caller that pages across a snapshot change must reset rather
 * than continue, and the DTO's own generation/digest fields are what tell it
 * to; deduplication by stable identity keeps a shifted page from
 * double-rendering an item in the meantime.
 */
export function boundedCursorOffset(cursor: unknown, total: number): number {
  const text = typeof cursor === 'string' ? cursor : null;
  if (text === null || !/^\d{1,7}$/.test(text)) return 0;
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed) || parsed < 0) return 0;
  return Math.min(parsed, Math.max(total, 0));
}

export function boundedCollection<T>(
  items: readonly T[],
  requestedLimit: unknown = undefined,
  cursor: unknown = undefined,
): ControlCenterCollection<T> {
  const limit = boundedPageLimit(requestedLimit) ?? 50;
  const sortedItems = [...items];
  const offset = boundedCursorOffset(cursor, sortedItems.length);
  const visible = sortedItems.slice(offset, offset + limit);
  const consumed = offset + visible.length;
  // `truncated` means "more remain AFTER this page", which is what a
  // continuation needs. On the first page that is the same claim it made
  // before.
  const truncated = sortedItems.length > consumed;
  const nextCursor: SafeControlCenterCursor | null = truncated
    ? (asSafeControlCenterCursor(String(consumed)) ?? null)
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
