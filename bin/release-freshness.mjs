#!/usr/bin/env node
// @ts-check

// ---------------------------------------------------------------------------
// NW-HIST-008 — RELEASE_BRANCH_FRESHNESS read-only driver (local-only).
//
// Loads the owner-declared ref inventory, observes ONLY local read-only Git
// metadata through fixed argv (`rev-parse --verify`, `cat-file -e`,
// `merge-base --is-ancestor`), and writes the sanitized freshness report.
//
// Permanent boundaries: never fetches, pulls, pushes, checks out, resets,
// creates branches or worktrees, or queries a remote; no network, database,
// cloud, or CI contact; no product code is executed. The report vocabulary is
// branch/ref containment only — it never claims deployment.
//
// Usage: node bin/release-freshness.mjs [--inventory <path>] [--json] [--out <path>]
// Exit: 0 no STALE · 1 STALE present · 2 inventory/infrastructure error.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';
import { loadTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_INVENTORY = 'config/release-refs.v1.json';
const DEFAULT_OUTPUT = 'artifacts/release-freshness/current.json';
const MAX_INVENTORY_BYTES = 64 * 1024;
const MAX_REPORT_BYTES = 8 * 1024 * 1024;
const GIT_TIMEOUT_MS = 10_000;
const GIT_MAX_BUFFER = 512 * 1024;

/** @type {import('./lib/operator-cli.mjs').OperatorCliMetadata} */
const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'release-freshness',
  entry: 'bin/release-freshness.mjs',
  purpose: 'Classify declared fix containment against declared local refs, read-only local Git only; never claims deployment.',
  group: 'validate',
  flags: [
    { name: '--inventory', shape: 'path', summary: 'owner-declared ref inventory (default config/release-refs.v1.json, at most 64 KiB)' },
    { name: '--json', shape: 'boolean', summary: 'emit the sanitized report as JSON' },
    { name: '--out', shape: 'path', summary: 'report destination (default artifacts/release-freshness/current.json)' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: ['artifacts/release-freshness/current.json'],
};

/**
 * @param {string} code
 * @param {string} [detail]
 */
function fail(code, detail) {
  process.stderr.write(detail === undefined ? `[release-freshness] ERROR: ${code}\n` : `[release-freshness] ERROR: ${code}: ${detail}\n`);
  process.exitCode = 2;
}

/**
 * NW-AUD-009: the caller's exact schema validator for the freshness report.
 * The publication boundary admits nothing this shape does not carry, before
 * any filesystem change.
 *
 * @param {unknown} payload
 */
function validateFreshnessReport(payload) {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('REPORT_NOT_AN_OBJECT');
  const report = /** @type {Record<string, unknown>} */ (payload);
  if (report.schemaVersion !== 'nightwatch.release-freshness-report.v1') throw new Error('REPORT_SCHEMA_INVALID');
  if (report.freshness !== 'LOCAL_TRACKING_REF_ONLY') throw new Error('REPORT_FRESHNESS_INVALID');
  if (report.deploymentClaim !== 'NONE') throw new Error('REPORT_DEPLOYMENT_CLAIM_INVALID');
  if (report.inventoryDigest !== null && typeof report.inventoryDigest !== 'string') throw new Error('REPORT_INVENTORY_DIGEST_INVALID');
  if (!Array.isArray(report.rows)) throw new Error('REPORT_ROWS_INVALID');
  for (const row of report.rows) {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) throw new Error('REPORT_ROW_INVALID');
    const value = /** @type {Record<string, unknown>} */ (row);
    if (typeof value.verdict !== 'string') throw new Error('REPORT_ROW_VERDICT_INVALID');
    if (!Array.isArray(value.reasonCodes)) throw new Error('REPORT_ROW_REASON_CODES_INVALID');
  }
  if (typeof report.reportDigest !== 'string' || !/^[a-z]{3}:sha256:[0-9a-f]{24}$/.test(report.reportDigest)) throw new Error('REPORT_DIGEST_INVALID');
}

/**
 * NW-AUD-009: publish the sanitized freshness report through the ONE governed
 * local-report boundary. Same-directory exclusive staging and an atomic
 * replace, so an observer sees the previous complete report or the new
 * complete report, never a truncated intermediate, and a symlinked or
 * non-regular destination is refused rather than followed.
 *
 * @param {import('../src/core/changeIntelligence/releaseFreshness').ReleaseFreshnessReport} report
 * @param {string} destination
 * @returns {string | null} the categorical publication failure, or null on success
 */
function publishReport(report, destination) {
  const { publishLocalReport } = loadTypeScriptModule('src/core/policy/localReportPublication.ts', { root });
  const published = publishLocalReport({
    profile: 'CURRENT_REPLACE',
    payload: report,
    validate: validateFreshnessReport,
    maxBytes: MAX_REPORT_BYTES,
    destination,
    digest: (canonical) => `sha256:${crypto.createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 24)}`,
  });
  return published.ok ? null : published.failure;
}

/**
 * @param {string} repositoriesRoot
 * @param {string} repoId
 * @returns {string}
 */
function repoPathFor(repositoriesRoot, repoId) {
  const [org, name] = String(repoId).split('/');
  if (!org || !name || !/^[a-z0-9._-]+$/i.test(org) || !/^[a-z0-9._-]+$/i.test(name) || org === '..' || name === '..') {
    throw new Error('UNSAFE_REPOSITORY_ID');
  }
  const resolved = path.resolve(repositoriesRoot, org, name);
  if (!resolved.startsWith(`${repositoriesRoot}${path.sep}`)) {
    throw new Error('REPOSITORY_PATH_ESCAPE');
  }
  return resolved;
}

/**
 * One bounded fixed-argv Git spawn. `git` is the only program this driver
 * executes; the argument list is built by this module and never contains
 * shell text, and the child environment is the explicit allowlist.
 */
/**
 * @param {string} repoPath
 * @param {string[]} args
 * @returns {{ kind: 'ERROR', status: number, stdout: string, stderr: string } | { kind: 'OK', status: number, stdout: string, stderr: string }}
 */
function runGit(repoPath, args) {
  const result = spawnSync('git', args, {
    cwd: repoPath,
    env: buildChildEnvironment(process.env),
    shell: false,
    encoding: 'utf8',
    timeout: GIT_TIMEOUT_MS,
    maxBuffer: GIT_MAX_BUFFER,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) return { kind: 'ERROR', status: -1, stdout: '', stderr: '' };
  return { kind: 'OK', status: typeof result.status === 'number' ? result.status : -1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

/** @typedef {{ state: 'ERROR' } | { state: 'AVAILABLE', sha: string } | { state: 'UNAVAILABLE' }} LocalCommit */

/**
 * @param {string} repositoriesRoot
 * @returns {import('../src/core/changeIntelligence/releaseFreshness').ReleaseAncestryOracle}
 */
function createOracle(repositoriesRoot) {
  /** @type {Map<string, string>} */
  const repoPaths = new Map();
  /**
   * @param {string} repoId
   * @returns {string}
   */
  const repoPath = (repoId) => {
    const cached = repoPaths.get(repoId);
    if (cached !== undefined) return cached;
    const resolved = repoPathFor(repositoriesRoot, repoId);
    repoPaths.set(repoId, resolved);
    return resolved;
  };
  return {
    /**
     * @param {string} repoId
     * @param {string} sha
     * @returns {LocalCommit}
     */
    pin(repoId, sha) {
      const result = runGit(repoPath(repoId), ['cat-file', '-e', `${sha}^{commit}`]);
      if (result.kind === 'ERROR') return { state: 'ERROR' };
      return result.status === 0 ? { state: 'AVAILABLE', sha } : { state: 'UNAVAILABLE' };
    },
    /**
     * @param {string} repoId
     * @param {string} ref
     * @returns {LocalCommit}
     */
    ref(repoId, ref) {
      const result = runGit(repoPath(repoId), ['rev-parse', '--verify', '--quiet', ref]);
      if (result.kind === 'ERROR') return { state: 'ERROR' };
      if (result.status !== 0) return { state: 'UNAVAILABLE' };
      const sha = result.stdout.trim();
      return /^[0-9a-f]{40}$/.test(sha) ? { state: 'AVAILABLE', sha } : { state: 'ERROR' };
    },
    /**
     * @param {string} repoId
     * @param {string} fixSha
     * @param {string} refTipSha
     * @returns {'CONTAINED' | 'NOT_CONTAINED' | 'ERROR'}
     */
    ancestor(repoId, fixSha, refTipSha) {
      const result = runGit(repoPath(repoId), ['merge-base', '--is-ancestor', fixSha, refTipSha]);
      if (result.kind === 'ERROR') return 'ERROR';
      if (result.status === 0) return 'CONTAINED';
      if (result.status === 1) return 'NOT_CONTAINED';
      return 'ERROR';
    },
  };
}

function main() {
  const cli = defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url });
  if (cli.stop) return;
  if (!cli.ok) {
    process.exitCode = 2;
    return;
  }
  const inventoryArg = cli.flags['--inventory'];
  const inventoryPath = typeof inventoryArg === 'string' && inventoryArg.trim() !== '' ? inventoryArg : path.join(root, DEFAULT_INVENTORY);
  const outArg = cli.flags['--out'];
  const outPath = typeof outArg === 'string' && outArg.trim() !== '' ? outArg : path.join(root, DEFAULT_OUTPUT);

  let inventory;
  try {
    const stat = fs.statSync(inventoryPath);
    if (!stat.isFile() || stat.size > MAX_INVENTORY_BYTES) throw new Error('inventory must be a regular file of at most 64 KiB');
    inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  } catch (error) {
    fail('INVENTORY_UNREADABLE', error instanceof Error ? error.message : 'unknown read failure');
    return;
  }

  let core;
  let topology;
  try {
    core = loadTypeScriptModule('src/core/changeIntelligence/releaseFreshness.ts', { root });
    // M6 (7.8/B-10): the ONE sibling-root resolution.
    topology = loadTypeScriptModule('src/core/policy/sourceTopology.ts', { root });
  } catch (error) {
    fail('CORE_LOAD_FAILED', error instanceof Error ? error.message : 'unknown load failure');
    return;
  }

  // The repositories root is NEVER derived from this checkout's location: a
  // C-00 session worktree lives outside the workspace tree. The sibling-root
  // constant (or an explicit NIGHTWATCH_REPOS_ROOT) is the only source.
  const repositoriesRoot = path.resolve(topology.resolveSiblingRoot());
  const report = core.releaseFreshnessReport(inventory, createOracle(repositoriesRoot));

  // NW-AUD-009: publication goes through the governed boundary; a refusal is
  // the same categorical REPORT_WRITE_FAILED the direct write reported.
  const publicationFailure = publishReport(report, path.resolve(outPath));
  if (publicationFailure !== null) {
    fail('REPORT_WRITE_FAILED', publicationFailure);
    return;
  }

  if (cli.flags['--json'] === true) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    for (const row of report.rows) {
      process.stdout.write(`[release-freshness] ${String(row.rowId)} ${row.verdict}${row.reasonCodes.length > 0 ? ` ${row.reasonCodes.join(',')}` : ''}\n`);
    }
    process.stdout.write(`[release-freshness] freshness=LOCAL_TRACKING_REF_ONLY deploymentClaim=NONE digest=${report.reportDigest}\n`);
  }

  const hasStale = report.rows.some((row) => row.verdict === 'RELEASE_BRANCH_STALE');
  const hasInfrastructureError = report.rows.some((row) => row.verdict === 'INVENTORY_INVALID' || row.verdict === 'GIT_ERROR');
  process.exitCode = hasInfrastructureError ? 2 : hasStale ? 1 : 0;
}

if (typeof process.argv[1] === 'string' && path.basename(process.argv[1]) === 'release-freshness.mjs') {
  main();
}
