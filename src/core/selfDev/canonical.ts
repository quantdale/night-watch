// ---------------------------------------------------------------------------
// Nightwatch Phase 8A — deterministic self-development canonicalization.
//
// This module is deliberately local and data-only. It provides stable JSON
// and SHA-256 helpers for candidate/evaluation identity; it does not inspect
// the filesystem, Git, a clock, a model, or any external system.
// ---------------------------------------------------------------------------

import { createHash } from 'node:crypto';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort().map((key) => [key, canonicalize(record[key])]));
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  const encoded = JSON.stringify(canonicalize(value));
  if (encoded === undefined) throw new Error('SELFDEV_CANONICAL_VALUE_INVALID');
  return encoded;
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function sha256Digest(value: unknown): string {
  return `sha256:${sha256Hex(canonicalJson(value))}`;
}
