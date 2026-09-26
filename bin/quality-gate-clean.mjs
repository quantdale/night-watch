#!/usr/bin/env node

// Disposable pristine-checkout qualification. The clone is local and
// temporary; it never reuses node_modules, sibling state, auth state, or
// generated artifacts from the source checkout.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';
import { GATE_RECEIPT_PATH_ENV, readPersistedGateReceipt } from './lib/gate-receipt.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli, invokedDirectly } from './lib/operator-cli.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Budgets are bounded and independently overridable. The install and the
// gate have different cold-start profiles, so one shared constant made a
// cold checkout that reached ten groups report TIMEOUT instead of a
// verdict. A malformed override fails closed (ENVIRONMENT_MISMATCH).
const DEFAULT_CLEAN_INSTALL_TIMEOUT_MS = 600_000;
const DEFAULT_CLEAN_GATE_TIMEOUT_MS = 3_600_000;
const MIN_CLEAN_TIMEOUT_MS = 60_000;
const MAX_CLEAN_TIMEOUT_MS = 7_200_000;
export function resolveCleanTimeout(name, fallback, environment = process.env) {
  const raw = environment[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < MIN_CLEAN_TIMEOUT_MS || value > MAX_CLEAN_TIMEOUT_MS) return null;
  return value;
}
const packageManager = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'quality-gate-clean',
  entry: 'bin/quality-gate-clean.mjs',
  purpose: 'Qualify a pristine local clone through npm ci --ignore-scripts and the authoritative gate.',
  group: 'validate',
  usage: 'node bin/quality-gate-clean.mjs [--help]',
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: ['disposable checkout under the system temporary directory'],
};

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function git(args, cwd) {
  return spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 60_000, maxBuffer: 2 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

function safeEnvironment(extra = {}) {
  const environment = buildChildEnvironment(process.env, { NIGHTWATCH_ENV: 'local', NIGHTWATCH_GATE_ENVIRONMENT: 'CLEAN_CHECKOUT' });
  environment.TZ = 'UTC';
  environment.LC_ALL = 'C';
  environment.LANG = 'C';
  environment.NO_COLOR = '1';
  environment.NIGHTWATCH_HEADED = '0';
  for (const [key, value] of Object.entries(extra)) environment[key] = value;
  return environment;
}

// R2-N3 / task 4.7 — sibling-absent by default. The clean gate runs against
// an EMPTY disposable sibling root unless the owner opts in explicitly; a
// sibling mode is only ever an explicit, recorded choice.
export function resolveCleanSiblingMode(environment = process.env) {
  const raw = environment['NIGHTWATCH_CLEAN_SIBLING_MODE'];
  if (raw === undefined || raw === '' || raw === 'ABSENT') return { mode: 'ABSENT', ok: true, root: null };
  if (raw === 'OPT_IN_SIBLING') {
    const configured = environment['NIGHTWATCH_REPOS_ROOT']?.trim() || environment['NIGHTWATCH_SIBLING_ROOT']?.trim();
    if (configured === undefined || configured === '') return { mode: 'OPT_IN_SIBLING', ok: false, root: null };
    return { mode: 'OPT_IN_SIBLING', ok: true, root: configured };
  }
  return { mode: 'INVALID', ok: false, root: null };
}

/**
 * Measured sibling identity (never a claim): the sorted top-level listing
 * plus, for every direct git worktree, the porcelain digest and HEAD. An
 * empty root digests as the empty listing; nothing here writes.
 */
export function siblingIdentityManifest(siblingRoot) {
  const hash = crypto.createHash('sha256');
  let entries;
  try {
    entries = fs.readdirSync(siblingRoot).sort();
  } catch {
    return { ok: false, digest: 'UNREADABLE', entryCount: -1 };
  }
  let worktrees = 0;
  for (const entry of entries) {
    hash.update(`${entry}\n`);
    const full = path.join(siblingRoot, entry);
    if (!fs.existsSync(path.join(full, '.git'))) continue;
    worktrees += 1;
    const status = git(['status', '--porcelain'], full);
    hash.update(`status:${status.status === 0 ? sha256(status.stdout) : 'UNREADABLE'}\n`);
    const head = git(['rev-parse', 'HEAD'], full);
    hash.update(`head:${head.status === 0 ? head.stdout.trim() : 'UNREADABLE'}\n`);
  }
  return { ok: true, digest: `sha256:${hash.digest('hex').slice(0, 24)}`, entryCount: entries.length, worktrees };
}

function resolveNode22Toolchain(extra = {}) {
  const environment = safeEnvironment(extra);
  // D-19: the pinned runtime is Node 22 (Node 20 is EOL). Receipts carry the
  // exact node and npm versions (NW-AUD-004 narrowed), never only a major.
  if (Number(process.versions.node.split('.')[0]) === 22) {
    const npmFast = spawnSync(packageManager, ['--version'], { cwd: root, env: environment, encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'pipe'] });
    return {
      environment,
      nodeMajor: 22,
      nodeVersion: process.version,
      npmVersion: npmFast.status === 0 && !npmFast.error ? (npmFast.stdout ?? '').trim() : null,
    };
  }
  // Development hosts may not have Node 22 installed globally. Resolve the
  // pinned major into npm's disposable cache, then put only its bin directory
  // first so the existing npm CLI runs under that verified Node binary. CI
  // uses setup-node and takes the direct branch above.
  const resolved = spawnSync(packageManager, ['exec', '--yes', '--package=node@22', '--', 'node', '-p', 'process.execPath'], {
    cwd: root, env: environment, encoding: 'utf8', timeout: 120_000, maxBuffer: 256 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (resolved.status !== 0 || resolved.error) return null;
  const executable = (resolved.stdout ?? '').trim();
  if (!path.isAbsolute(executable)) return null;
  try {
    const stat = fs.lstatSync(executable);
    if (!stat.isFile() || stat.isSymbolicLink()) return null;
  } catch {
    return null;
  }
  const nodeMajor = Number((spawnSync(executable, ['-p', 'process.versions.node.split(\'.\')[0]'], { encoding: 'utf8', timeout: 30_000 }).stdout ?? '').trim());
  if (nodeMajor !== 22) return null;
  const nodeVersion = (spawnSync(executable, ['-p', 'process.version'], { encoding: 'utf8', timeout: 30_000 }).stdout ?? '').trim() || null;
  const nodeBin = path.dirname(executable);
  environment.PATH = `${nodeBin}${path.delimiter}${environment.PATH ?? ''}`;
  const npmCheck = spawnSync(packageManager, ['--version'], { cwd: root, env: environment, encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'pipe'] });
  if (npmCheck.status !== 0 || npmCheck.error) return null;
  return { environment, nodeMajor, nodeVersion, npmVersion: (npmCheck.stdout ?? '').trim() || null };
}

const CLEAN_RECEIPT_DIRECTORY = path.join(root, 'artifacts', 'gate-receipts');

function emit(receipt, code = 0) {
  receipt.receiptDigest = `clean-receipt:sha256:${sha256(JSON.stringify(receipt)).slice(0, 24)}`;
  // B-14 / D-18 — the clean receipt is persisted to the ignored receipts
  // directory, not only printed: an evidence receipt nobody can re-read is
  // not evidence. Persistence failure is its own failure (exit 3), never a
  // silent success.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  try {
    fs.mkdirSync(CLEAN_RECEIPT_DIRECTORY, { recursive: true });
    const digestSuffix = String(receipt.receiptDigest).split(':')[2] ?? 'unknown';
    fs.writeFileSync(
      path.join(CLEAN_RECEIPT_DIRECTORY, `clean-checkout-${stamp}-${digestSuffix}.json`),
      `${JSON.stringify(receipt)}\n`,
      { encoding: 'utf8', mode: 0o600 },
    );
  } catch (error) {
    console.log(JSON.stringify(receipt));
    process.stderr.write(`[quality-gate-clean] RECEIPT_PERSISTENCE_FAILED: ${error instanceof Error ? error.message : 'unknown'}\n`);
    process.exitCode = 3;
    return;
  }
  console.log(JSON.stringify(receipt));
  process.exitCode = code;
}

// `--help` is the bounded, side-effect-free observation surface: the shared
// parser answers it before probing Git, cloning the checkout, or invoking npm.
const cli = invokedDirectly(import.meta.url) ? defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url }) : { stop: true };
if (!cli.stop) {

const headResult = git(['rev-parse', 'HEAD'], root);
const statusResult = git(['status', '--porcelain'], root);
const head = headResult.status === 0 ? headResult.stdout.trim() : null;
const installTimeout = resolveCleanTimeout('NIGHTWATCH_CLEAN_INSTALL_TIMEOUT_MS', DEFAULT_CLEAN_INSTALL_TIMEOUT_MS);
const gateTimeout = resolveCleanTimeout('NIGHTWATCH_CLEAN_GATE_TIMEOUT_MS', DEFAULT_CLEAN_GATE_TIMEOUT_MS);
if (!head || statusResult.status !== 0 || statusResult.stdout.trim() !== '' || installTimeout === null || gateTimeout === null) {
  emit({ schemaVersion: 'nightwatch.clean-checkout-receipt.v1', sourceHead: head, nodeMajor: Number(process.versions.node.split('.')[0]), installResult: 'NOT_RUN', gateResult: 'NOT_RUN', finalResult: 'ENVIRONMENT_MISMATCH' }, 1);
} else {
  // R2-N3 / task 4.7 — sibling-absent by default: the clean gate's children
  // see an EMPTY disposable sibling root. Sibling mode is only an explicit,
  // recorded opt-in that names its own root.
  const siblingMode = resolveCleanSiblingMode();
  if (!siblingMode.ok) {
    emit({ schemaVersion: 'nightwatch.clean-checkout-receipt.v1', sourceHead: head, nodeMajor: Number(process.versions.node.split('.')[0]), installResult: 'ENVIRONMENT_MISMATCH', gateResult: 'NOT_RUN', finalResult: 'ENVIRONMENT_MISMATCH' }, 1);
  } else {
  const absentSiblingRoot = siblingMode.mode === 'ABSENT' ? fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-clean-sibling-absent-')) : null;
  const effectiveSiblingRoot = absentSiblingRoot ?? siblingMode.root;
  const siblingIdentityBefore = siblingIdentityManifest(effectiveSiblingRoot);
  const clone = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-quality-gate-clean-'));
  try {
    const cloneResult = git(['clone', '--local', '--no-hardlinks', root, clone], root);
    if (cloneResult.status !== 0) {
      emit({ schemaVersion: 'nightwatch.clean-checkout-receipt.v1', sourceHead: head, nodeMajor: Number(process.versions.node.split('.')[0]), installResult: 'INSTALL_FAILURE', gateResult: 'NOT_RUN', finalResult: 'INSTALL_FAILURE' }, 1);
    } else {
      // Keep the disposable checkout on the permitted target branch. The
      // planner handoff contract binds Target Branch to `main`, so a detached
      // clean clone would make an otherwise valid exact-head route fail.
      const checkout = git(['checkout', '--quiet', '-B', 'main', head], clone);
      const cloneBranch = git(['rev-parse', '--abbrev-ref', 'HEAD'], clone);
      const cloneHead = git(['rev-parse', 'HEAD'], clone);
      const cleanBefore = git(['status', '--porcelain'], clone);
      if (checkout.status !== 0 || cloneBranch.status !== 0 || cloneBranch.stdout.trim() !== 'main' || cloneHead.status !== 0 || cloneHead.stdout.trim() !== head || cleanBefore.status !== 0 || cleanBefore.stdout.trim() !== '' || fs.existsSync(path.join(clone, 'node_modules'))) {
        emit({ schemaVersion: 'nightwatch.clean-checkout-receipt.v1', sourceHead: head, nodeMajor: Number(process.versions.node.split('.')[0]), installResult: 'ENVIRONMENT_MISMATCH', gateResult: 'NOT_RUN', finalResult: 'ENVIRONMENT_MISMATCH' }, 1);
      } else {
        const toolchain = resolveNode22Toolchain({ NIGHTWATCH_REPOS_ROOT: effectiveSiblingRoot });
        if (toolchain === null) {
          emit({ schemaVersion: 'nightwatch.clean-checkout-receipt.v1', sourceHead: head, nodeMajor: null, installResult: 'ENVIRONMENT_MISMATCH', gateResult: 'NOT_RUN', finalResult: 'ENVIRONMENT_MISMATCH' }, 1);
        } else {
          const { environment } = toolchain;
          const install = spawnSync(packageManager, ['ci', '--ignore-scripts'], { cwd: clone, env: environment, encoding: 'utf8', timeout: installTimeout, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
          if (install.status !== 0 || install.error) {
            emit({ schemaVersion: 'nightwatch.clean-checkout-receipt.v1', sourceHead: head, nodeMajor: toolchain.nodeMajor, installResult: install.error?.code === 'ETIMEDOUT' ? 'TIMEOUT' : 'INSTALL_FAILURE', gateResult: 'NOT_RUN', finalResult: install.error?.code === 'ETIMEDOUT' ? 'TIMEOUT' : 'INSTALL_FAILURE' }, 1);
          } else {
            // R-11: the inner receipt is recovered from a STRUCTURED FILE the
            // gate itself wrote, not by scraping stdout for a schema token.
            // Scraping was how the C-10.5 failing-group detail was lost, and it
            // let any child shadow the real receipt by printing a matching
            // line. The destination lives in this wrapper's own temporary
            // directory, deliberately OUTSIDE the disposable clone, so writing
            // it can never dirty the checkout the clean gate is measuring.
            const receiptDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-clean-gate-receipt-'));
            const receiptFile = path.join(receiptDirectory, 'clean-inner-gate-receipt.json');
            let gateReceipt = null;
            let receiptSource = 'NOT_READ';
            let receiptError = null;
            let stdoutReceiptDigest = null;
            let cleanAfter = null;
            let gateTimedOut = false;
            try {
              const gate = spawnSync(packageManager, ['run', 'gate:clean-exec'], { cwd: clone, env: { ...environment, CI: 'true', [GATE_RECEIPT_PATH_ENV]: receiptFile }, encoding: 'utf8', timeout: gateTimeout, maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
              const output = `${gate.stdout ?? ''}\n${gate.stderr ?? ''}`;
              cleanAfter = git(['status', '--porcelain'], clone);

              const persisted = readPersistedGateReceipt(receiptFile, { gitHead: head, environmentClass: 'CLEAN' });
              if (persisted.status === 'READ') {
                gateReceipt = persisted.receipt;
                receiptSource = 'STRUCTURED_FILE';
              } else {
                receiptError = persisted.code;
              }

              // stdout is still parsed, purely as a CROSS-CHECK. It is never the
              // authority, and a disagreement fails closed rather than picking
              // whichever copy looks better.
              const receiptLine = output.split(/\r?\n/).reverse().find((line) => line.includes('nightwatch.quality-gate-receipt.v1'));
              try {
                const parsed = receiptLine ? JSON.parse(receiptLine) : null;
                if (parsed && typeof parsed.receiptDigest === 'string') stdoutReceiptDigest = parsed.receiptDigest;
              } catch {
                stdoutReceiptDigest = null;
              }

              if (gateReceipt === null) {
                receiptError = receiptError ?? 'GATE_RECEIPT_UNAVAILABLE';
              } else if (stdoutReceiptDigest !== null && stdoutReceiptDigest !== gateReceipt.receiptDigest) {
                receiptError = 'GATE_RECEIPT_DIGEST_MISMATCH';
              }

              gateTimedOut = gate.error?.code === 'ETIMEDOUT';
            } finally {
              fs.rmSync(receiptDirectory, { recursive: true, force: true });
            }

            const gateResult = receiptError !== null
              ? (gateTimedOut ? 'TIMEOUT' : 'UNKNOWN_FAILURE')
              : gateReceipt.finalResult;
            const checkoutStillClean = cleanAfter !== null && cleanAfter.status === 0 && cleanAfter.stdout.trim() === '';
            // The sibling identity is MEASURED before and after the gate, never
            // asserted: any drift fails the clean gate with its own verdict.
            const siblingIdentityAfter = siblingIdentityManifest(effectiveSiblingRoot);
            const siblingIdentityUnchanged = siblingIdentityBefore.ok && siblingIdentityAfter.ok && siblingIdentityBefore.digest === siblingIdentityAfter.digest;
            const finalResult = siblingIdentityUnchanged && receiptError === null && gateResult === 'PASS' && checkoutStillClean ? 'PASS' : (siblingIdentityUnchanged ? gateResult : 'SIBLING_IDENTITY_DRIFT');
            emit({
              schemaVersion: 'nightwatch.clean-checkout-receipt.v1',
              sourceHead: head,
              packageLockDigest: `sha256:${sha256(fs.readFileSync(path.join(clone, 'package-lock.json'), 'utf8'))}`,
              nodeMajor: toolchain.nodeMajor,
              nodeVersion: toolchain.nodeVersion ?? null,
              npmVersion: toolchain.npmVersion ?? null,
              nodeRequirement: '22',
              installResult: 'PASS',
              gateResult,
              gateReceiptSource: receiptSource,
              gateReceiptError: receiptError,
              gateReceiptStdoutDigest: stdoutReceiptDigest,
              gateReceiptDigest: gateReceipt?.receiptDigest ?? null,
              gateDefinitionDigest: gateReceipt?.gateDefinitionDigest ?? null,
              gateGroups: Array.isArray(gateReceipt?.groups) ? gateReceipt.groups : [],
              cleanBefore: cleanBefore.stdout.trim() === '',
              cleanAfter: checkoutStillClean,
              nodeModulesReused: false,
              authStateProvided: false,
              ownerFindingStateProvided: false,
              siblingMode: siblingMode.mode,
              siblingRootClass: absentSiblingRoot !== null ? 'EMPTY_DISPOSABLE' : 'OPT_IN_CONFIGURED',
              siblingIdentityBefore: siblingIdentityBefore.digest,
              siblingIdentityAfter: siblingIdentityAfter.digest,
              siblingIdentityUnchanged,
              finalResult,
            }, finalResult === 'PASS' ? 0 : 1);
          }
        }
      }
    }
  } finally {
    fs.rmSync(clone, { recursive: true, force: true });
    if (absentSiblingRoot !== null) fs.rmSync(absentSiblingRoot, { recursive: true, force: true });
  }
  }
}

}
