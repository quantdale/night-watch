// ---------------------------------------------------------------------------
// NW-02 — the one authority for "is this path inside Nightwatch or a sibling
// source tree?".
//
// `privateArtifacts.ts` and `productionFindingsStore.ts` each derived their
// own answer from `path.resolve(__dirname, '..', '..', '..')`. That makes a
// SAFETY decision depend on where the code happens to be checked out: from
// the canonical `REPOSITORIES/nightwatch` checkout the excluded set was
// `REPOSITORIES` and its children, but from a C-00 session worktree at
// `$HOME/.nightwatch/worktrees/<name>` it became `$HOME/.nightwatch/worktrees`
// — so a configured private root beneath canonical or a sibling checkout was
// rejected in one supported topology and accepted in another.
//
// The excluded set is therefore built from absolute, checkout-independent
// facts:
//
//   - the sibling `REPOSITORIES` root, which contains the canonical Nightwatch
//     checkout and every sibling company repository, resolved from an explicit
//     root, then `NIGHTWATCH_REPOS_ROOT`, then `DEFAULT_SIBLING_ROOT` — the
//     same order the rest of the repository already uses;
//   - the C-00 session-worktree parent, `$HOME/.nightwatch/worktrees`, which
//     contains every linked implementation worktree;
//   - this checkout's own root, as pure self-protection. In every supported
//     topology it already lies inside one of the two above; in a relocated
//     clone it adds that clone rather than silently permitting it.
//
// Ambiguity fails closed: a configured root that is not absolute is an error,
// never a fallback.
//
// Containment is lexical on normalized paths. That is sound here only because
// callers refuse a symlink at ANY path component before creating anything, so
// a symlinked ancestor cannot smuggle a path into an excluded tree after the
// check. Callers must keep doing that; this module does no I/O.
// ---------------------------------------------------------------------------

import os from 'node:os';
import path from 'node:path';
import { DEFAULT_SIBLING_ROOT } from '../source/siblingRoot';

export const REPOSITORIES_ROOT_ENV = 'NIGHTWATCH_REPOS_ROOT' as const;

/** C-00 default parent of every linked session worktree, relative to $HOME. */
export const SESSION_WORKTREE_PARENT_RELATIVE = path.join('.nightwatch', 'worktrees');

/**
 * This module lives at `src/core/policy/`, so three levels up is the checkout
 * that contains it. Unlike the defect this replaces, that value is used only
 * to exclude the local checkout in ADDITION to the absolute roots above — it
 * never defines the shared answer.
 */
const LOCAL_CHECKOUT_ROOT = path.resolve(__dirname, '..', '..', '..');

export interface SourceTopologyOptions {
  /** Explicit repositories root. Highest precedence; must be absolute. */
  readonly repositoriesRoot?: string;
  /** Explicit session-worktree parent. Must be absolute. */
  readonly sessionWorktreeParent?: string;
  /** Explicit home directory, for tests that must not read the real one. */
  readonly homeDirectory?: string;
  /**
   * Explicit local checkout root, or null to omit the self-protection entry.
   * Tests inject this so a decision can be measured for a topology the test
   * process is not actually running in.
   */
  readonly localCheckoutRoot?: string | null;
  /** Explicit environment, so tests never mutate the real one. */
  readonly environment?: Readonly<Record<string, string | undefined>>;
}

export interface SourceTopology {
  readonly repositoriesRoot: string;
  readonly sessionWorktreeParent: string;
  readonly localCheckoutRoot: string | null;
  /** Deduplicated, sorted. Every root a private store must stay out of. */
  readonly excludedRoots: readonly string[];
}

function requireAbsolute(value: string, code: string): string {
  if (typeof value !== 'string' || value.trim() === '' || !path.isAbsolute(value)) throw new Error(code);
  return path.normalize(value);
}

export function resolveSourceTopology(options: SourceTopologyOptions = {}): SourceTopology {
  const environment = options.environment ?? process.env;
  const configured = options.repositoriesRoot ?? environment[REPOSITORIES_ROOT_ENV] ?? DEFAULT_SIBLING_ROOT;
  const repositoriesRoot = requireAbsolute(configured, 'SOURCE_TOPOLOGY_REPOSITORIES_ROOT_AMBIGUOUS');
  const home = options.homeDirectory ?? os.homedir();
  const sessionWorktreeParent = requireAbsolute(
    options.sessionWorktreeParent ?? path.join(requireAbsolute(home, 'SOURCE_TOPOLOGY_HOME_AMBIGUOUS'), SESSION_WORKTREE_PARENT_RELATIVE),
    'SOURCE_TOPOLOGY_WORKTREE_PARENT_AMBIGUOUS',
  );
  const localCheckoutRoot = options.localCheckoutRoot === null
    ? null
    : requireAbsolute(options.localCheckoutRoot ?? LOCAL_CHECKOUT_ROOT, 'SOURCE_TOPOLOGY_LOCAL_CHECKOUT_AMBIGUOUS');
  const excludedRoots = [...new Set([
    repositoriesRoot,
    sessionWorktreeParent,
    ...(localCheckoutRoot === null ? [] : [localCheckoutRoot]),
  ])].sort((left, right) => left.localeCompare(right));
  return Object.freeze({
    repositoriesRoot,
    sessionWorktreeParent,
    localCheckoutRoot,
    excludedRoots: Object.freeze(excludedRoots),
  });
}

/** True when `candidate` is `directory` itself or anything beneath it. */
export function isInsideDirectory(directory: string, candidate: string): boolean {
  const relative = path.relative(directory, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/**
 * The excluded root containing `candidate`, or null. Returned rather than
 * thrown so a caller can name its own error class while the containment
 * judgement stays in one place.
 */
export function containingSourceRoot(candidate: string, topology: SourceTopology): string | null {
  const resolved = requireAbsolute(candidate, 'SOURCE_TOPOLOGY_CANDIDATE_NOT_ABSOLUTE');
  for (const root of topology.excludedRoots) {
    if (isInsideDirectory(root, resolved)) return root;
  }
  return null;
}

/**
 * Refuse a private-state root that lies inside Nightwatch source, a sibling
 * checkout, or a linked worktree. `errorCode` stays with the caller so each
 * store keeps its own documented failure identity.
 */
export function assertOutsideSourceTopology(
  candidate: string,
  errorCode: string,
  topology: SourceTopology = resolveSourceTopology(),
): void {
  if (containingSourceRoot(candidate, topology) !== null) throw new Error(errorCode);
}
