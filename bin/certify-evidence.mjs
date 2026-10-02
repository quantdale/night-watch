#!/usr/bin/env node
// @ts-check
// ---------------------------------------------------------------------------
// R5-12 / review-5 task B2.1 — the certification evidence producer.
//
// `produce` measures ONE subject at the certified checkpoint S and STAGES one
// receipt under the git-ignored `artifacts/certification-staging/<S>/` (so the
// tree stays clean for the next producer). `publish` copies the staged PASS
// receipts of S into the TRACKED `evidence/certification/<S>/` directory, ready
// to be committed in a documentary descendant of S. `verify` re-derives every
// tracked receipt of S offline.
//
// Receipts are tamper-evident, not tamper-proof (OD-5): no signature, key or
// MAC. Nothing here contacts an Alphaus system; the only external read is the
// GitHub Actions observation of the run at S (OD-3), by the read-only `gh`.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';
import { CERTIFICATION_EVIDENCE_DIRECTORY, certificationReceiptPath, validateCertificationReceipt } from './lib/certification-evidence.mjs';
import { produceCertificationReceipt, selectCiObservation } from './lib/certify-producers.mjs';
import { gitReadOnly } from './lib/probe-io.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STAGING_DIRECTORY = 'artifacts/certification-staging';
const SHA40_RE = /^[0-9a-f]{40}$/;
/** Upper bound for one producer command (the full regression is the longest). */
const COMMAND_TIMEOUT_MS = 3_600_000;

/** @type {import('./lib/operator-cli.mjs').OperatorCliMetadata} */
const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'certify-evidence',
  entry: 'bin/certify-evidence.mjs',
  purpose: 'Produce, publish and verify certification evidence receipts for the release-certification conditions and lanes at the certified checkpoint.',
  group: 'validate',
  commands: [
    { name: 'produce', summary: 'measure one subject at the certified checkpoint and stage its receipt (git-ignored)' },
    { name: 'publish', summary: 'copy the staged PASS receipts of the certified checkpoint into the tracked evidence directory' },
    { name: 'verify', summary: 'offline re-derivation of every tracked receipt of the certified checkpoint' },
  ],
  commandRequired: true,
  flags: [
    { name: '--subject', shape: 'string', summary: 'the subject to produce (a condition or lane id)' },
    { name: '--root', shape: 'path', summary: 'operate on a different repository root' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: [],
};
const cli = defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url });

/**
 * @param {string} root
 * @returns {Record<string, unknown> | null}
 */
function readProjectVerdict(root) {
  const result = spawnSync(process.execPath, [path.join('bin', 'project-state-check.mjs')], {
    cwd: root,
    env: buildChildEnvironment(process.env, {}),
    shell: false,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  try {
    const parsed = JSON.parse(result.stdout ?? '');
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * The read-only GitHub Actions observation of the run at `sha`.
 * @param {string} root
 * @param {string} sha
 */
function observeCi(root, sha) {
  const result = spawnSync('gh', ['run', 'list', '--branch', 'main', '--limit', '50', '--json', 'databaseId,headSha,status,conclusion'], {
    cwd: root,
    env: buildChildEnvironment(process.env, {}),
    shell: false,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.status !== 0) return null;
  try {
    return selectCiObservation(JSON.parse(result.stdout ?? ''), sha);
  } catch {
    return null;
  }
}

/**
 * @param {string} root
 * @param {readonly string[]} argv
 * @returns {{ status: number | null }}
 */
function runCommand(root, argv) {
  const [program, ...args] = argv;
  if (program === undefined) return { status: null };
  const result = spawnSync(program, args, {
    cwd: root,
    env: buildChildEnvironment(process.env, {}),
    shell: false,
    stdio: ['ignore', 'ignore', 'ignore'],
    timeout: COMMAND_TIMEOUT_MS,
  });
  return { status: result.status };
}

/**
 * @param {string} root
 * @param {string} subject
 */
function produce(root, subject) {
  const outcome = produceCertificationReceipt({
    subject,
    io: {
      git: (args) => gitReadOnly(root, args),
      projectVerdict: () => readProjectVerdict(root),
      runCommand: (argv) => runCommand(root, argv),
      observeCi: (sha) => observeCi(root, sha),
    },
  });
  if (!outcome.ok || outcome.receipt === null) {
    process.stdout.write(`${JSON.stringify({ ok: false, subject, code: outcome.code })}\n`);
    process.exitCode = 3;
    return;
  }
  const sha = String(outcome.receipt['sourceHead']);
  const directory = path.join(root, STAGING_DIRECTORY, sha);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, `${subject}.json`), `${JSON.stringify(outcome.receipt, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ ok: true, subject, code: outcome.code, result: outcome.receipt['result'], digest: outcome.receipt['receiptDigest'], sourceHead: sha })}\n`);
  if (outcome.receipt['result'] !== 'PASS') process.exitCode = 1;
}

/**
 * @param {string} directory
 * @returns {string[]}
 */
function jsonFiles(directory) {
  try {
    return fs.readdirSync(directory).filter((name) => name.endsWith('.json')).sort();
  } catch {
    return [];
  }
}

/**
 * @param {string} root
 * @returns {string | null}
 */
function certifiedCheckpoint(root) {
  const release = readProjectVerdict(root)?.['releaseVerdict'];
  const sha = release !== null && typeof release === 'object' ? /** @type {Record<string, unknown>} */ (release)['certifiedCheckpointSha'] : null;
  return typeof sha === 'string' && SHA40_RE.test(sha) ? sha : null;
}

/** @param {string} root */
function publish(root) {
  const sha = certifiedCheckpoint(root);
  if (sha === null) {
    process.stdout.write(`${JSON.stringify({ ok: false, code: 'CERTIFY_CHECKPOINT_UNRESOLVED' })}\n`);
    process.exitCode = 3;
    return;
  }
  const published = [];
  const skipped = [];
  for (const name of jsonFiles(path.join(root, STAGING_DIRECTORY, sha))) {
    const subject = name.slice(0, -'.json'.length);
    const text = fs.readFileSync(path.join(root, STAGING_DIRECTORY, sha, name), 'utf8');
    /** @type {unknown} */
    let body = null;
    try { body = JSON.parse(text); } catch { body = null; }
    const errors = validateCertificationReceipt(body);
    const record = /** @type {Record<string, unknown>} */ (body ?? {});
    if (errors.length > 0 || record['result'] !== 'PASS' || record['sourceHead'] !== sha || record['subject'] !== subject) {
      skipped.push(subject);
      continue;
    }
    const target = path.join(root, certificationReceiptPath(sha, subject));
    if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') !== text) {
      process.stdout.write(`${JSON.stringify({ ok: false, code: 'CERTIFY_PUBLISH_WOULD_OVERWRITE', subject })}\n`);
      process.exitCode = 3;
      return;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
    published.push(subject);
  }
  process.stdout.write(`${JSON.stringify({ ok: true, sourceHead: sha, published, skipped })}\n`);
  if (skipped.length > 0) process.exitCode = 1;
}

/** @param {string} root */
function verify(root) {
  const sha = certifiedCheckpoint(root);
  if (sha === null) {
    process.stdout.write(`${JSON.stringify({ ok: false, code: 'CERTIFY_CHECKPOINT_UNRESOLVED' })}\n`);
    process.exitCode = 3;
    return;
  }
  const directory = path.join(root, CERTIFICATION_EVIDENCE_DIRECTORY, sha);
  const invalid = [];
  const valid = [];
  for (const name of jsonFiles(directory)) {
    const subject = name.slice(0, -'.json'.length);
    /** @type {unknown} */
    let body = null;
    try { body = JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8')); } catch { body = null; }
    const record = /** @type {Record<string, unknown>} */ (body ?? {});
    if (validateCertificationReceipt(body).length === 0 && record['subject'] === subject && record['sourceHead'] === sha) valid.push(subject);
    else invalid.push(subject);
  }
  process.stdout.write(`${JSON.stringify({ ok: invalid.length === 0, sourceHead: sha, valid, invalid })}\n`);
  if (invalid.length > 0) process.exitCode = 1;
}

if (cli.ok === true && cli.stop !== true) {
  const rootFlag = cli.flags['--root'];
  const root = typeof rootFlag === 'string' && rootFlag !== '' ? path.resolve(rootFlag) : ROOT;
  if (cli.command === 'produce') {
    const subject = cli.flags['--subject'];
    if (typeof subject !== 'string' || subject === '') {
      process.stdout.write(`${JSON.stringify({ ok: false, code: 'CERTIFY_SUBJECT_REQUIRED' })}\n`);
      process.exitCode = 2;
    } else produce(root, subject);
  } else if (cli.command === 'publish') publish(root);
  else if (cli.command === 'verify') verify(root);
}
