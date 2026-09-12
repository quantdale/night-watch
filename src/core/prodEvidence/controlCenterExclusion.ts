// ---------------------------------------------------------------------------
// Nightwatch C-10 / F-18 — the Control Center is structurally excluded from
// the production findings store.
//
// `createFindingsAuthority()` defaults to `.nightwatch/findings`, so a separate
// `prod-findings` root is not read today — but that is correct BY ACCIDENT,
// not by construction. The Control Center is a localhost HTTP server reachable
// by any local process, and `Host`/`Origin` validation is not an authorization
// boundary against local software.
//
// So the exclusion is stated as an invariant and enforced here, by RESOLVED
// PATH EQUIVALENCE rather than string comparison:
//
//   - both candidate and production roots are resolved through `realpath`
//     where they exist, so a symlink pointing at the production store is
//     rejected along with the store itself;
//   - containment is tested in BOTH directions, so neither the production root
//     nor any ancestor of it can be handed to the authority;
//   - both the DEFAULT production root and any environment-configured
//     production root are refused;
//   - the rule applies to the test-only seam as well, so a test seam cannot
//     accidentally become production authority.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PRODUCTION_ARTIFACT_DEFAULT_RELATIVE_ROOT } from './productionFindingsStore';

export const CONTROL_CENTER_PRODUCTION_EXCLUSION_CODE = 'FINDINGS_ROOT_PRODUCTION_EXCLUDED' as const;

/**
 * Resolve a path as far as it exists. A non-existent leaf is normal (the
 * production store may never have been created), but any EXISTING component
 * must be resolved so a symlink cannot disguise the target.
 */
function resolveAsFarAsPossible(target: string): string {
  const absolute = path.resolve(target);
  try {
    return fs.realpathSync(absolute);
  } catch {
    // Walk upward to the deepest existing ancestor, resolve that, then re-append.
    let current = absolute;
    const tail: string[] = [];
    for (;;) {
      const parent = path.dirname(current);
      if (parent === current) return absolute;
      tail.unshift(path.basename(current));
      current = parent;
      try {
        return path.join(fs.realpathSync(current), ...tail);
      } catch {
        // keep walking up
      }
    }
  }
}

function isInsideOrEqual(directory: string, candidate: string): boolean {
  const relative = path.relative(directory, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/**
 * Every root that is production territory: the default location and, when set,
 * the environment-configured location.
 */
export function productionExcludedRoots(): readonly string[] {
  const roots = [path.join(os.homedir(), PRODUCTION_ARTIFACT_DEFAULT_RELATIVE_ROOT)];
  const configured = process.env.NIGHTWATCH_PRODUCTION_STATE_DIR;
  if (configured !== undefined && configured.trim() !== '') roots.push(configured);
  return roots.map(resolveAsFarAsPossible);
}

/**
 * Is this candidate root production territory?
 *
 * True when the candidate IS a production root, is INSIDE one, or CONTAINS one
 * — the last case matters because handing the authority `$HOME/.nightwatch`
 * would otherwise expose `prod-findings` beneath it.
 */
export function isProductionFindingsRoot(candidate: string): boolean {
  if (typeof candidate !== 'string' || candidate.trim() === '') return false;
  const resolved = resolveAsFarAsPossible(candidate);
  for (const production of productionExcludedRoots()) {
    if (isInsideOrEqual(production, resolved)) return true;
    if (isInsideOrEqual(resolved, production)) return true;
  }
  return false;
}

/**
 * The hard invariant. Throwing here rather than returning a status keeps the
 * rule fail-closed at every call site, including the test-only seam.
 */
export function assertNotProductionFindingsRoot(candidate: string): void {
  if (isProductionFindingsRoot(candidate)) {
    throw new Error(CONTROL_CENTER_PRODUCTION_EXCLUSION_CODE);
  }
}
