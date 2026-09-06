// ---------------------------------------------------------------------------
// Wave 4 — read-only pre-fix snapshot from a local Git checkout.
//
// Verbs: `rev-parse --verify`, `diff-tree --name-only`, `show`. No checkout,
// fetch, config, or writes. SHA and path arguments are allowlist-validated
// before they reach argv so a mined record cannot inject options.
// The fix commit message is never included in the visible snapshot.
// ---------------------------------------------------------------------------

import { spawnSync } from 'node:child_process';
import { buildGitChildEnvironment } from '../process/childEnvironment';

export const PRE_FIX_SOURCE_VERSION = 'nightwatch.pre-fix-source.v1' as const;
const GIT_TIMEOUT_MS = 10_000;
const GIT_MAX_BUFFER = 512 * 1024;
const MAX_FILES = 8;
const MAX_FILE_BYTES = 16_384;
const SHA_RE = /^[0-9a-f]{7,40}$/i;
const RELATIVE_PATH_RE = /^(?!\.)(?!-)[A-Za-z0-9._+/-]+$/;

export type PreFixExtractionStatus = 'EXTRACTED' | 'DATA_BLOCKED';

export interface PreFixSnapshot {
  readonly schemaVersion: typeof PRE_FIX_SOURCE_VERSION;
  readonly status: PreFixExtractionStatus;
  readonly reason: string;
  readonly parentSha: string | null;
  readonly files: readonly string[];
  readonly snapshot: string;
}

function blocked(reason: string): PreFixSnapshot {
  return {
    schemaVersion: PRE_FIX_SOURCE_VERSION,
    status: 'DATA_BLOCKED',
    reason,
    parentSha: null,
    files: [],
    snapshot: '',
  };
}

function runGit(repoPath: string, args: readonly string[]): { status: number; stdout: string } {
  const result = spawnSync('git', ['-C', repoPath, ...args], {
    encoding: 'utf8',
    env: buildGitChildEnvironment(),
    timeout: GIT_TIMEOUT_MS,
    maxBuffer: GIT_MAX_BUFFER,
    shell: false,
  });
  if (result.error) throw result.error;
  return { status: result.status ?? -1, stdout: result.stdout ?? '' };
}

function safeSha(value: string): string | null {
  const trimmed = value.trim();
  if (!SHA_RE.test(trimmed)) return null;
  return trimmed;
}

function safePath(value: string): string | null {
  if (!RELATIVE_PATH_RE.test(value) || value.includes('..')) return null;
  return value;
}

export function extractPreFixSnapshot(repoPath: string, fixSha: string): PreFixSnapshot {
  const sha = safeSha(fixSha);
  if (sha === null) return blocked('FIX_SHA_INVALID');
  if (typeof repoPath !== 'string' || repoPath.length === 0) return blocked('REPO_PATH_MISSING');

  let parent: { status: number; stdout: string };
  let names: { status: number; stdout: string };
  try {
    parent = runGit(repoPath, ['rev-parse', '--verify', `${sha}^`]);
    if (parent.status !== 0) return blocked('PARENT_UNAVAILABLE');
    names = runGit(repoPath, ['diff-tree', '--no-commit-id', '--name-only', '-r', `${sha}^`, sha]);
    if (names.status !== 0) return blocked('DIFF_UNAVAILABLE');
  } catch {
    return blocked('GIT_READ_FAILED');
  }

  const parentSha = safeSha(parent.stdout);
  if (parentSha === null) return blocked('PARENT_SHA_INVALID');

  const files: string[] = [];
  for (const line of names.stdout.split('\n')) {
    if (files.length >= MAX_FILES) break;
    const candidate = line.trim();
    if (candidate.length === 0) continue;
    const relative = safePath(candidate);
    if (relative === null) continue;
    files.push(relative);
  }
  if (files.length === 0) return blocked('NO_SAFE_PRE_FIX_FILES');

  const chunks: string[] = [];
  for (const file of files) {
    let shown: { status: number; stdout: string };
    try {
      shown = runGit(repoPath, ['show', `${parentSha}:${file}`]);
    } catch {
      continue;
    }
    if (shown.status !== 0) continue;
    if (shown.stdout.includes('\0')) continue;
    const clipped = shown.stdout.length > MAX_FILE_BYTES ? shown.stdout.slice(0, MAX_FILE_BYTES) : shown.stdout;
    chunks.push(`--- ${file}\n${clipped}`);
  }
  if (chunks.length === 0) return blocked('PRE_FIX_BLOBS_UNAVAILABLE');

  return {
    schemaVersion: PRE_FIX_SOURCE_VERSION,
    status: 'EXTRACTED',
    reason: 'EXTRACTED_OK',
    parentSha,
    files,
    snapshot: chunks.join('\n'),
  };
}
