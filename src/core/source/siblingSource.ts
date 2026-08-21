// ---------------------------------------------------------------------------
// Nightwatch Phase 9A.1 — read-only sibling source access (SPEC §28, §41,
// §42).
//
// The ONLY module allowed to touch Alphaus sibling checkouts: bounded
// read-only file reads + git HEAD resolution from .git metadata. No child
// processes, no network, no writes, no git mutations — a dirty sibling
// checkout is read as-is and never modified. Paths are confined to the
// configured sibling root; traversal and symlink escape attempts return
// null (fail-closed).
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import type { RealSourceCurrentness, RealSourceReader } from '../../oracles/expectations/recipes/types';

export const DEFAULT_SIBLING_ROOT = '/home/dalepalaca/go/src/alphaus-main/REPOSITORIES';

const REPO_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
/** Repository-relative path: no leading slash, no backslash, no traversal. */
const RELATIVE_PATH_RE = /^[^/\\][^\\]*$/;

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface SiblingSourceAccess {
  readonly reader: RealSourceReader;
  readonly currentness: RealSourceCurrentness;
  readonly root: string;
}

/** Read-only git HEAD resolution (no child process, no writes). */
export function resolveGitHead(repoRoot: string): string | null {
  try {
    const headFile = path.join(repoRoot, '.git', 'HEAD');
    const head = fs.readFileSync(headFile, 'utf8').trim();
    const refMatch = /^ref:\s*(.+)$/.exec(head);
    if (refMatch !== null && refMatch[1] !== undefined) {
      const refPath = path.join(repoRoot, '.git', refMatch[1]);
      if (fs.existsSync(refPath)) {
        const sha = fs.readFileSync(refPath, 'utf8').trim();
        if (/^[0-9a-f]{40}$/.test(sha)) return sha;
      }
    }
    if (/^[0-9a-f]{40}$/.test(head)) return head;
    // packed-refs fallback for the HEAD ref
    const packedPath = path.join(repoRoot, '.git', 'packed-refs');
    if (fs.existsSync(packedPath)) {
      for (const line of fs.readFileSync(packedPath, 'utf8').split(/\r?\n/)) {
        if (line.includes('refs/heads/') || line.includes('HEAD')) {
          const sha = line.split(' ', 1)[0];
          if (sha !== undefined && /^[0-9a-f]{40}$/.test(sha)) return sha;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function createSiblingSourceAccess(root: string): SiblingSourceAccess {
  const resolvedRoot = path.resolve(root);

  function repoRootFor(repoId: string): string | null {
    if (!REPO_ID_RE.test(repoId)) return null;
    const candidate = path.resolve(resolvedRoot, repoId);
    if (candidate !== resolvedRoot && !candidate.startsWith(resolvedRoot + path.sep)) return null;
    if (!fs.existsSync(path.join(candidate, '.git'))) return null;
    return candidate;
  }

  const reader: RealSourceReader = {
    readFile(repoId: string, relativePath: string): string | null {
      const repoRoot = repoRootFor(repoId);
      if (repoRoot === null) return null;
      if (!RELATIVE_PATH_RE.test(relativePath) || relativePath.includes('..')) return null;
      const file = path.resolve(repoRoot, relativePath);
      if (file !== repoRoot && !file.startsWith(repoRoot + path.sep)) return null;
      try {
        if (!fs.existsSync(file)) return null;
        return fs.readFileSync(file, 'utf8');
      } catch {
        return null;
      }
    },
  };

  const currentness: RealSourceCurrentness = {
    currentSnapshot(repoId: string): { repoId: string; sha: string } | null {
      const repoRoot = repoRootFor(repoId);
      if (repoRoot === null) return null;
      const sha = resolveGitHead(repoRoot);
      return sha === null ? null : { repoId, sha };
    },
  };

  return { reader, currentness, root: resolvedRoot };
}
