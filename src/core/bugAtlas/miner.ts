// ---------------------------------------------------------------------------
// Lane D — read-only local Git history miner.
//
// Best-effort historical intelligence over sibling checkouts that are already
// present on disk (NIGHTWATCH_REPOS_ROOT ?? DEFAULT_SIBLING_ROOT). Read-only
// by construction: the only child-process verbs are `rev-parse
// --is-inside-work-tree` and `log` with fixed argv, no shell, an isolated
// environment, timeouts, and byte caps. No checkout, no config, no fetch, no
// writes of any kind; company repos are never commented on, pushed, or
// mutated. Commit text is untrusted: injection-shaped notes are kept as inert
// data and counted as quarantined, secrets are redacted, and every heuristic
// parse is labelled OBSERVATION/LOW — INFERENCE, never SOURCE_FACT.
//
// When no local history is available the miner reports DATA_BLOCKED with a
// machine-readable reason and zero records instead of fabricating history.
// ---------------------------------------------------------------------------

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { BUG_ATLAS_RECORD_VERSION, type BugAtlasRecord } from '../agentProtocol/atlas';
import { untrustedLooksLikeInjection } from '../agentProtocol/untrusted';
import { buildGitChildEnvironment } from '../process/childEnvironment';
import { DEFAULT_SIBLING_ROOT } from '../source/siblingSource';
import { capTextField, redactCredentialsInText } from './sanitize';
import {
  BUG_ATLAS_FIELD_BYTE_CAP,
  BUG_ATLAS_MINER_MAX_COMMITS_PER_REPO,
  BUG_ATLAS_MINER_MAX_REPOS,
  BUG_ATLAS_MINER_VERSION,
  type BugAtlasMinerCounts,
  type BugAtlasMinerOptions,
  type BugAtlasMinerReport,
} from './types';

const REPO_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SHA_RE = /^[0-9a-f]{5,64}$/i;
/** Heuristic fix signal in a commit subject. Deliberately narrow. */
const FIX_LIKE_RE = /\b(fix|fixes|fixed|fixing|hotfix|bugfix|regression|defect|CVE-\d{4}-\d+|incident)\b/i;
const GIT_TIMEOUT_MS = 10_000;
const GIT_MAX_BUFFER = 2 * 1024 * 1024;

export interface ParsedCommit {
  readonly repository: string;
  readonly sha: string;
  readonly subject: string;
  readonly body: string;
}

function slugRepositoryId(repository: string): string {
  return repository.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

/**
 * Pure commit → record parser. Returns null for commits with no fix signal
 * (not every commit is bug history) or with unusable identifiers. Unknown
 * fields stay null; the parse is OBSERVATION/LOW because only the commit's
 * existence is observed — the bug interpretation is heuristic.
 */
export function parseCommitToRecord(commit: ParsedCommit): {
  readonly record: BugAtlasRecord;
  readonly quarantined: boolean;
  readonly redactions: number;
} | null {
  if (!REPO_ID_RE.test(commit.repository)) return null;
  if (!SHA_RE.test(commit.sha)) return null;
  const subject = commit.subject.trim();
  if (subject.length === 0 || !FIX_LIKE_RE.test(subject)) return null;
  const combined = `${subject}\n${commit.body.trim()}`.trim();
  const quarantined = untrustedLooksLikeInjection(combined);
  const scrubbed = redactCredentialsInText(capTextField(combined, BUG_ATLAS_FIELD_BYTE_CAP));
  const shortSha = commit.sha.toLowerCase().slice(0, 12);
  const record: BugAtlasRecord = {
    schemaVersion: BUG_ATLAS_RECORD_VERSION,
    bugId: `bugatlas-git-${slugRepositoryId(commit.repository)}-${shortSha}`,
    product: null,
    repository: commit.repository,
    service: null,
    symptom: scrubbed.text,
    expected: null,
    actual: null,
    trigger: null,
    rootCause: null,
    fixLocator: `commit ${commit.sha.toLowerCase()}`,
    testsAdded: [],
    violatedInvariant: null,
    detectionSignals: [],
    provenance: {
      category: 'OBSERVATION',
      repository: commit.repository,
      sourceSha: commit.sha.toLowerCase(),
      locator: `commit ${commit.sha.toLowerCase()}`,
      confidence: 'LOW',
    },
    relatedBugIds: [],
  };
  return { record, quarantined, redactions: scrubbed.redactions };
}

/** Parse one `git log` unit-separator block into subject/body pairs. */
export function parseGitLogOutput(output: string): readonly { sha: string; subject: string; body: string }[] {
  const commits: { sha: string; subject: string; body: string }[] = [];
  for (const block of output.split('\x1e')) {
    const trimmed = block.replace(/^[\r\n]+/, '');
    if (trimmed.trim().length === 0) continue;
    const fields = trimmed.split('\x1f');
    if (fields.length < 3) continue;
    const [sha, subject, body] = fields;
    if (sha === undefined || subject === undefined || body === undefined) continue;
    if (!SHA_RE.test(sha.trim())) continue;
    commits.push({ sha: sha.trim(), subject: subject.trim(), body: body.trim() });
  }
  return commits;
}

interface GitResult {
  readonly status: number;
  readonly stdout: string;
}

function runGitReadOnly(repoPath: string, args: readonly string[]): GitResult {
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

function resolveRepositoriesRoot(options: BugAtlasMinerOptions): string | null {
  const configured =
    options.repositoriesRoot ??
    process.env['NIGHTWATCH_REPOS_ROOT'] ??
    DEFAULT_SIBLING_ROOT;
  if (typeof configured !== 'string' || configured.trim().length === 0) return null;
  const resolved = path.resolve(configured.trim());
  try {
    const stat = fs.lstatSync(resolved);
    if (stat.isSymbolicLink() || !stat.isDirectory()) return null;
  } catch {
    return null;
  }
  return resolved;
}

function enumerateAdmittedRepos(
  root: string,
  allowlist: readonly string[] | undefined,
  maxRepos: number,
): readonly { readonly id: string; readonly path: string }[] {
  const allowed = allowlist === undefined ? null : new Set(allowlist);
  const found: { id: string; path: string }[] = [];
  const pushIfGit = (id: string, dir: string): void => {
    if (found.length >= maxRepos) return;
    if (!REPO_ID_RE.test(id)) return;
    if (allowed !== null && !allowed.has(id)) return;
    if (id.toLowerCase().startsWith('nightwatch')) return;
    let entries: string[];
    try {
      if (!fs.lstatSync(dir).isDirectory()) return;
      entries = fs.readdirSync(dir);
    } catch {
      return;
    }
    if (!entries.includes('.git')) return;
    found.push({ id, path: dir });
  };
  let top: string[];
  try {
    top = fs.readdirSync(root);
  } catch {
    return [];
  }
  for (const entry of top.sort()) {
    if (found.length >= maxRepos) break;
    if (entry.startsWith('.')) continue;
    const entryPath = path.join(root, entry);
    try {
      if (fs.lstatSync(entryPath).isSymbolicLink()) continue;
      if (!fs.lstatSync(entryPath).isDirectory()) continue;
    } catch {
      continue;
    }
    // Two shapes: <root>/<repo> (repoId unknown — skip, needs org scope) and
    // <root>/<org>/<repo>. Only org-scoped ids are admitted.
    let nested: string[];
    try {
      nested = fs.readdirSync(entryPath);
    } catch {
      continue;
    }
    if (nested.includes('.git')) continue;
    for (const repo of nested.sort()) {
      if (found.length >= maxRepos) break;
      if (repo.startsWith('.')) continue;
      pushIfGit(`${entry}/${repo}`, path.join(entryPath, repo));
    }
  }
  return found;
}

function emptyCounts(): BugAtlasMinerCounts {
  return {
    repositoriesSeen: 0,
    repositoriesMined: 0,
    commitsScanned: 0,
    commitsKept: 0,
    quarantinedInjection: 0,
    redactedSecrets: 0,
  };
}

function blocked(
  reason: string,
  repositoriesRoot: string | null,
  counts: BugAtlasMinerCounts,
): BugAtlasMinerReport {
  return {
    schemaVersion: BUG_ATLAS_MINER_VERSION,
    status: 'DATA_BLOCKED',
    reason,
    records: [],
    counts,
    minedAt: new Date().toISOString(),
    repositoriesRoot,
  };
}

/**
 * Mine fix-like commits from admitted sibling checkouts. Read-only; returns
 * DATA_BLOCKED (never throws for missing data) when local history is absent.
 * Git execution failures inside an admitted repo are contained per-repo: the
 * repo is skipped and mining continues.
 */
export function mineLocalGitHistory(
  options: BugAtlasMinerOptions = {},
): BugAtlasMinerReport {
  const maxCommits =
    Number.isInteger(options.maxCommitsPerRepo) && (options.maxCommitsPerRepo as number) > 0
      ? Math.min(options.maxCommitsPerRepo as number, BUG_ATLAS_MINER_MAX_COMMITS_PER_REPO)
      : BUG_ATLAS_MINER_MAX_COMMITS_PER_REPO;
  const maxRepos =
    Number.isInteger(options.maxRepos) && (options.maxRepos as number) > 0
      ? Math.min(options.maxRepos as number, BUG_ATLAS_MINER_MAX_REPOS)
      : BUG_ATLAS_MINER_MAX_REPOS;
  const root = resolveRepositoriesRoot(options);
  if (root === null) {
    return blocked('SIBLING_ROOT_MISSING', null, emptyCounts());
  }
  let repos: readonly { readonly id: string; readonly path: string }[];
  try {
    repos = enumerateAdmittedRepos(root, options.repositoryIds, maxRepos);
  } catch {
    return blocked('REPOSITORY_ENUMERATION_FAILED', root, emptyCounts());
  }
  const counts: BugAtlasMinerCounts = { ...emptyCounts(), repositoriesSeen: repos.length };
  if (repos.length === 0) {
    return blocked('NO_ADMISSIBLE_REPOSITORIES', root, counts);
  }
  const records: BugAtlasRecord[] = [];
  const mutable = { ...counts };
  for (const repo of repos) {
    let inside: GitResult;
    let log: GitResult;
    try {
      inside = runGitReadOnly(repo.path, ['rev-parse', '--is-inside-work-tree']);
      if (inside.status !== 0 || inside.stdout.trim() !== 'true') continue;
      log = runGitReadOnly(repo.path, [
        'log',
        `--max-count=${maxCommits}`,
        '--no-merges',
        '--format=%H%x1f%s%x1f%b%x1e',
      ]);
      if (log.status !== 0) continue;
    } catch {
      continue;
    }
    mutable.repositoriesMined += 1;
    for (const commit of parseGitLogOutput(log.stdout)) {
      mutable.commitsScanned += 1;
      const parsed = parseCommitToRecord({
        repository: repo.id,
        sha: commit.sha,
        subject: commit.subject,
        body: commit.body,
      });
      if (parsed === null) continue;
      mutable.commitsKept += 1;
      if (parsed.quarantined) mutable.quarantinedInjection += 1;
      mutable.redactedSecrets += parsed.redactions;
      records.push(parsed.record);
    }
  }
  return {
    schemaVersion: BUG_ATLAS_MINER_VERSION,
    status: 'MINED',
    reason: 'MINED_OK',
    records,
    counts: mutable,
    minedAt: new Date().toISOString(),
    repositoriesRoot: root,
  };
}
