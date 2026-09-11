// One owned location for ephemeral runner output and scratch (F-06).
//
// Nineteen `test-results*` roots accumulated because every ad-hoc run chose its
// own output directory, and four `.tmp-*` trees accumulated because scratch had
// no owner. Neither is evidence. This module is the single declarative source
// for those locations:
//
//   - Playwright output resolves to `<PLAYWRIGHT_OUTPUT_ROOT>/<lane>`: one
//     configured root, one subdirectory per lane so two lanes cannot clobber
//     each other's output.
//   - Scratch resolves to `<SCRATCH_ROOT>/<segment...>`: one ignored root.
//
// `bin/nightwatch-hygiene.mjs` cleans exactly these roots plus the historical
// `test-results-*` siblings, and never touches `artifacts/`, the owner-only
// finding/review stores or any tracked file. A structural rule rejects a new
// root-level output or scratch pattern that is not the owned location.
//
// Pure data/path arithmetic: no filesystem access, no clock.

/** The one configured Playwright output root. `.gitignore` ignores it. */
export const PLAYWRIGHT_OUTPUT_ROOT = 'test-results' as const;

/** The one configured scratch root. `.gitignore` ignores the `.tmp-*` pattern. */
export const SCRATCH_ROOT = '.tmp-nightwatch' as const;

const LANE_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;
const SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

/**
 * The historical/owned ephemeral root names. Anything matching this at the
 * repository root is runner output or scratch; only `test-results` and
 * `.tmp-nightwatch` are owned, the rest are the pre-F-06 accumulation.
 */
export const EPHEMERAL_ROOT_PATTERN = /^(?:test-results(?:-[A-Za-z0-9._-]+)?|\.tmp-[A-Za-z0-9._-]+)$/;

/** True for the two owned roots; false for a historical sibling. */
export function isOwnedEphemeralRoot(name: string): boolean {
  return name === PLAYWRIGHT_OUTPUT_ROOT || name === SCRATCH_ROOT;
}

/**
 * Resolve one lane's Playwright output directory under the single configured
 * root. A lane is a stable lowercase identifier, not a caller-chosen path.
 */
export function resolvePlaywrightOutputDir(lane: string): string {
  if (!LANE_PATTERN.test(lane)) throw new Error('EPHEMERAL_LAYOUT_LANE_INVALID');
  return `${PLAYWRIGHT_OUTPUT_ROOT}/${lane}`;
}

/**
 * Resolve one scratch path under the single ignored scratch root. Each segment
 * is validated, so a caller cannot escape the root with `..` or an absolute
 * path.
 */
export function resolveScratchPath(...segments: readonly string[]): string {
  if (segments.length === 0) throw new Error('EPHEMERAL_LAYOUT_SEGMENT_MISSING');
  for (const segment of segments) {
    if (!SEGMENT_PATTERN.test(segment) || segment === '.' || segment === '..') {
      throw new Error('EPHEMERAL_LAYOUT_SEGMENT_INVALID');
    }
  }
  return [SCRATCH_ROOT, ...segments].join('/');
}
