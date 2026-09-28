// @ts-check

// VC-06 — clean-checkout receipt honesty.
//
// Three defects lived inline in `bin/quality-gate-clean.mjs` and are
// corrected here as pure, independently testable logic:
//
// 1. The final verdict computed `siblingIdentityUnchanged ? gateResult : ...`,
//    so a DIRTY post-run checkout fell through to the inner gate's PASS — the
//    dirty conjunct was present in the receipt but erased from the verdict.
//    `resolveCleanCheckoutVerdict` gives every conjunct its own precedence and
//    never erases one.
// 2. Sibling identity measured only the empty disposable stand-in with a
//    name-only top-level listing. `siblingIdentityManifest` (v2) walks with a
//    bounded depth and entry budget — git worktrees bound via read-only
//    status+HEAD, non-git content by path and size — and the caller measures
//    the REAL product-resolved sibling root read-only as well.
// 3. Early-exit receipts omitted `siblingMode` and the exact versions. They
//    are now built by `cleanEarlyReceipt`, so every exit carries them.
//
// Everything here is LOCAL and read-only: git is invoked with
// `--no-optional-locks`, so a status/rev-parse never refreshes an index — in
// particular never inside a sibling repository, which this workspace never
// writes.

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const CLEAN_RECEIPT_SCHEMA = 'nightwatch.clean-checkout-receipt.v1';
export const SIBLING_MANIFEST_METHOD = 'nightwatch.sibling-manifest.v2';
const MANIFEST_MAX_ENTRIES = 50_000;
const MANIFEST_MAX_DEPTH = 6;
const MANIFEST_DIGEST_CHARS = 24;
const GIT_TIMEOUT_MS = 60_000;
const NPM_TIMEOUT_MS = 30_000;

/** @param {string} value */
function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * git with optional locks disabled: every status/rev-parse the clean gate
 * performs must never refresh an index — least of all inside a sibling
 * repository, which this workspace never writes.
 *
 * @param {readonly string[]} args
 * @param {string} cwd
 * @returns {{ status: number | null, stdout: string, stderr: string, error?: Error }}
 */
export function gitReadOnly(args, cwd) {
  return spawnSync('git', ['--no-optional-locks', ...args], {
    cwd,
    encoding: 'utf8',
    timeout: GIT_TIMEOUT_MS,
    maxBuffer: 2 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/**
 * A read-only clean/dirty measurement of one checkout.
 *
 * @param {string} cwd
 * @returns {{ ok: boolean, clean: boolean }}
 */
export function measureClean(cwd) {
  const status = gitReadOnly(['status', '--porcelain'], cwd);
  const ok = status.status === 0;
  return { ok, clean: ok && (status.stdout ?? '').trim() === '' };
}

/**
 * @param {import('node:fs').Dirent} a
 * @param {import('node:fs').Dirent} b
 * @returns {number}
 */
function compareDirent(a, b) {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

/**
 * Bounded read-only identity of a sibling root (VC-06, method v2).
 *
 * v1 hashed only the sorted top-level names (plus status/HEAD for direct
 * `.git` children), which is why the real `REPOSITORIES` root — two org
 * directories — digested as two names and no repository change could ever
 * move it. v2 walks deterministically (sorted, depth-bounded, entry-bounded):
 *
 * - a directory containing `.git` is a worktree: its read-only
 *   `status --porcelain` digest and HEAD are bound in, and its contents are
 *   measured by git itself (not re-walked);
 * - other directories contribute their name and are descended;
 * - files contribute path and size; symlinks contribute path and target
 *   (never followed, so a cycle cannot deepen the walk);
 * - hitting the entry budget marks the result `truncated` — a disclosed
 *   weaker measurement, never a silently confident one.
 *
 * @param {string} siblingRoot
 * @returns {{ ok: boolean, digest: string, entryCount: number, worktrees: number, files: number, truncated: boolean }}
 */
export function siblingIdentityManifest(siblingRoot) {
  const hash = crypto.createHash('sha256');
  hash.update(`${SIBLING_MANIFEST_METHOD}\n`);
  let rootEntries;
  try {
    rootEntries = fs.readdirSync(siblingRoot, { withFileTypes: true }).sort(compareDirent);
  } catch {
    return { ok: false, digest: 'UNREADABLE', entryCount: -1, worktrees: 0, files: 0, truncated: false };
  }

  let visited = 0;
  let worktrees = 0;
  let files = 0;
  let truncated = false;

  /**
   * @param {string} relativePath
   * @returns {void}
   */
  const measureWorktree = (relativePath) => {
    worktrees += 1;
    const full = path.join(siblingRoot, relativePath);
    const status = gitReadOnly(['status', '--porcelain'], full);
    hash.update(`worktree:${relativePath}:status:${status.status === 0 ? sha256(status.stdout ?? '') : 'UNREADABLE'}\n`);
    const head = gitReadOnly(['rev-parse', 'HEAD'], full);
    hash.update(`worktree:${relativePath}:head:${head.status === 0 ? (head.stdout ?? '').trim() : 'UNREADABLE'}\n`);
  };

  /**
   * @param {import('node:fs').Dirent} entry
   * @param {string} relativePath
   * @param {number} depth
   * @returns {void}
   */
  const visit = (entry, relativePath, depth) => {
    if (visited >= MANIFEST_MAX_ENTRIES) {
      truncated = true;
      return;
    }
    visited += 1;
    const full = path.join(siblingRoot, relativePath);
    if (entry.isDirectory()) {
      if (fs.existsSync(path.join(full, '.git'))) {
        measureWorktree(relativePath);
        return;
      }
      if (depth >= MANIFEST_MAX_DEPTH) {
        hash.update(`depth-truncated:${relativePath}\n`);
        return;
      }
      let children;
      try {
        children = fs.readdirSync(full, { withFileTypes: true }).sort(compareDirent);
      } catch {
        hash.update(`unreadable:${relativePath}\n`);
        return;
      }
      hash.update(`dir:${relativePath}\n`);
      for (const child of children) visit(child, relativePath === '' ? child.name : `${relativePath}/${child.name}`, depth + 1);
      return;
    }
    if (entry.isSymbolicLink()) {
      let target = 'UNREADABLE';
      try {
        target = fs.readlinkSync(full);
      } catch {
        target = 'UNREADABLE';
      }
      hash.update(`link:${relativePath}:${target}\n`);
      return;
    }
    files += 1;
    let size = -1;
    try {
      size = fs.statSync(full).size;
    } catch {
      size = -1;
    }
    hash.update(`file:${relativePath}:${size}\n`);
  };

  const digest = () => `sha256:${hash.digest('hex').slice(0, MANIFEST_DIGEST_CHARS)}`;
  if (fs.existsSync(path.join(siblingRoot, '.git'))) {
    // The root itself is a worktree: git's own status/HEAD is the deep truth.
    measureWorktree('.');
    return { ok: true, digest: digest(), entryCount: rootEntries.length, worktrees, files, truncated };
  }
  for (const entry of rootEntries) visit(entry, entry.name, 1);
  return { ok: true, digest: digest(), entryCount: rootEntries.length, worktrees, files, truncated };
}

/** @type {{ source: 'AMBIENT', nodeMajor: number, nodeVersion: string, npmVersion: string | null } | null} */
let ambientVersions = null;

/**
 * The exact ambient runtime versions an early exit observed. npm is measured
 * once per process; a failed measurement is null, never a guess.
 *
 * @param {string} cwd
 * @returns {{ source: 'AMBIENT', nodeMajor: number, nodeVersion: string, npmVersion: string | null }}
 */
export function ambientToolchainVersions(cwd) {
  if (ambientVersions === null) {
    const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const npm = spawnSync(command, ['--version'], { cwd, encoding: 'utf8', timeout: NPM_TIMEOUT_MS, stdio: ['ignore', 'pipe', 'pipe'] });
    const output = npm.status === 0 && !npm.error ? (npm.stdout ?? '').trim() : '';
    ambientVersions = {
      source: 'AMBIENT',
      nodeMajor: Number(process.versions.node.split('.')[0]),
      nodeVersion: process.version,
      npmVersion: output === '' ? null : output,
    };
  }
  return ambientVersions;
}

/**
 * The clean-checkout receipt shape for an EARLY exit: sibling mode, the
 * real-root resolution class and the exact versions are mandatory fields, so
 * no exit path can silently drop them again (VC-06).
 *
 * @param {object} input
 * @param {string | null} input.sourceHead
 * @param {string} input.siblingMode
 * @param {string} input.realSiblingRootClass
 * @param {{ source: 'AMBIENT' | 'TOOLCHAIN', nodeMajor: number | null, nodeVersion: string | null, npmVersion: string | null }} input.versions
 * @param {string} input.installResult
 * @param {string} input.gateResult
 * @param {string} input.finalResult
 * @returns {{ schemaVersion: string, sourceHead: string | null, nodeMajor: number | null, nodeVersion: string | null, npmVersion: string | null, versionsSource: 'AMBIENT' | 'TOOLCHAIN', siblingMode: string, realSiblingRootClass: string, installResult: string, gateResult: string, finalResult: string }}
 */
export function cleanEarlyReceipt(input) {
  return {
    schemaVersion: CLEAN_RECEIPT_SCHEMA,
    sourceHead: input.sourceHead,
    nodeMajor: input.versions.nodeMajor,
    nodeVersion: input.versions.nodeVersion,
    npmVersion: input.versions.npmVersion,
    versionsSource: input.versions.source,
    siblingMode: input.siblingMode,
    realSiblingRootClass: input.realSiblingRootClass,
    installResult: input.installResult,
    gateResult: input.gateResult,
    finalResult: input.finalResult,
  };
}

/**
 * THE verdict, as one pure function so every conjunct has its own precedence
 * and none can be erased by a fallback (the VC-06 regression: a dirty clone
 * after the gate fell through to the inner gate's PASS).
 *
 * Measurement integrity first (an unmeasurable sibling universe is not a
 * drift and not a pass), then identity drift, then checkout integrity, and
 * only then the inner gate's own result — which the receipt always carries
 * separately, so no information is lost by any precedence.
 *
 * @param {object} input
 * @param {'MEASURED' | 'UNRESOLVED'} input.realSiblingMeasurement
 * @param {boolean} input.siblingIdentityUnchanged
 * @param {boolean} input.checkoutStillClean
 * @param {boolean} input.sourceRootStillClean
 * @param {string} input.gateResult
 * @returns {string}
 */
export function resolveCleanCheckoutVerdict(input) {
  if (input.realSiblingMeasurement !== 'MEASURED') return 'SIBLING_IDENTITY_UNRESOLVED';
  if (!input.siblingIdentityUnchanged) return 'SIBLING_IDENTITY_DRIFT';
  if (!input.checkoutStillClean) return 'CHECKOUT_DIRTY_AFTER_GATE';
  if (!input.sourceRootStillClean) return 'SOURCE_DIRTY_AFTER_RUN';
  return input.gateResult;
}
