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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const timeout = 1_800_000;
const packageManager = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function git(args, cwd) {
  return spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 60_000, maxBuffer: 2 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

function safeEnvironment() {
  const environment = buildChildEnvironment(process.env, { NIGHTWATCH_ENV: 'local', NIGHTWATCH_GATE_ENVIRONMENT: 'CLEAN_CHECKOUT' });
  environment.TZ = 'UTC';
  environment.LC_ALL = 'C';
  environment.LANG = 'C';
  environment.NO_COLOR = '1';
  environment.NIGHTWATCH_HEADED = '0';
  return environment;
}

function resolveNode20Toolchain() {
  const environment = safeEnvironment();
  if (Number(process.versions.node.split('.')[0]) === 20) return { environment, nodeMajor: 20 };
  // Development hosts may not have Node 20 installed globally. Resolve the
  // pinned major into npm's disposable cache, then put only its bin directory
  // first so the existing npm CLI runs under that verified Node binary. CI
  // uses setup-node and takes the direct branch above.
  const resolved = spawnSync(packageManager, ['exec', '--yes', '--package=node@20', '--', 'node', '-p', 'process.execPath'], {
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
  if (nodeMajor !== 20) return null;
  const nodeBin = path.dirname(executable);
  environment.PATH = `${nodeBin}${path.delimiter}${environment.PATH ?? ''}`;
  const npmCheck = spawnSync(packageManager, ['--version'], { cwd: root, env: environment, encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'pipe'] });
  if (npmCheck.status !== 0 || npmCheck.error) return null;
  return { environment, nodeMajor };
}

function emit(receipt, code = 0) {
  receipt.receiptDigest = `clean-receipt:sha256:${sha256(JSON.stringify(receipt)).slice(0, 24)}`;
  console.log(JSON.stringify(receipt));
  process.exitCode = code;
}

const headResult = git(['rev-parse', 'HEAD'], root);
const statusResult = git(['status', '--porcelain'], root);
const head = headResult.status === 0 ? headResult.stdout.trim() : null;
if (!head || statusResult.status !== 0 || statusResult.stdout.trim() !== '') {
  emit({ schemaVersion: 'nightwatch.clean-checkout-receipt.v1', sourceHead: head, nodeMajor: Number(process.versions.node.split('.')[0]), installResult: 'NOT_RUN', gateResult: 'NOT_RUN', finalResult: 'ENVIRONMENT_MISMATCH' }, 1);
} else {
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
        const toolchain = resolveNode20Toolchain();
        if (toolchain === null) {
          emit({ schemaVersion: 'nightwatch.clean-checkout-receipt.v1', sourceHead: head, nodeMajor: null, installResult: 'ENVIRONMENT_MISMATCH', gateResult: 'NOT_RUN', finalResult: 'ENVIRONMENT_MISMATCH' }, 1);
        } else {
          const { environment } = toolchain;
          const install = spawnSync(packageManager, ['ci', '--ignore-scripts'], { cwd: clone, env: environment, encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
          if (install.status !== 0 || install.error) {
            emit({ schemaVersion: 'nightwatch.clean-checkout-receipt.v1', sourceHead: head, nodeMajor: toolchain.nodeMajor, installResult: install.error?.code === 'ETIMEDOUT' ? 'TIMEOUT' : 'INSTALL_FAILURE', gateResult: 'NOT_RUN', finalResult: install.error?.code === 'ETIMEDOUT' ? 'TIMEOUT' : 'INSTALL_FAILURE' }, 1);
          } else {
            const gate = spawnSync(packageManager, ['run', 'gate:clean-exec'], { cwd: clone, env: { ...environment, CI: 'true' }, encoding: 'utf8', timeout, maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
            const output = `${gate.stdout ?? ''}\n${gate.stderr ?? ''}`;
            const receiptLine = output.split(/\r?\n/).reverse().find((line) => line.includes('nightwatch.quality-gate-receipt.v1'));
            let gateReceipt = null;
            try { gateReceipt = receiptLine ? JSON.parse(receiptLine) : null; } catch { gateReceipt = null; }
            const cleanAfter = git(['status', '--porcelain'], clone);
            const gateResult = gateReceipt?.finalResult ?? (gate.error?.code === 'ETIMEDOUT' ? 'TIMEOUT' : 'UNKNOWN_FAILURE');
            const finalResult = gateResult === 'PASS' && cleanAfter.status === 0 && cleanAfter.stdout.trim() === '' ? 'PASS' : gateResult;
            emit({
              schemaVersion: 'nightwatch.clean-checkout-receipt.v1',
              sourceHead: head,
              packageLockDigest: `sha256:${sha256(fs.readFileSync(path.join(clone, 'package-lock.json'), 'utf8'))}`,
              nodeMajor: toolchain.nodeMajor,
              nodeRequirement: '20',
              installResult: 'PASS',
              gateResult,
              gateReceiptDigest: gateReceipt?.receiptDigest ?? null,
              gateDefinitionDigest: gateReceipt?.gateDefinitionDigest ?? null,
              gateGroups: Array.isArray(gateReceipt?.groups) ? gateReceipt.groups : [],
              cleanBefore: cleanBefore.stdout.trim() === '',
              cleanAfter: cleanAfter.status === 0 && cleanAfter.stdout.trim() === '',
              nodeModulesReused: false,
              authStateProvided: false,
              ownerFindingStateProvided: false,
              siblingWrites: 0,
              finalResult,
            }, finalResult === 'PASS' ? 0 : 1);
          }
        }
      }
    }
  } finally {
    fs.rmSync(clone, { recursive: true, force: true });
  }
}
