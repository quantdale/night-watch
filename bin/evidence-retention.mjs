#!/usr/bin/env node

// Local evidence retention for repository-owned generated run artifacts.
//
// Status is the default and is strictly read-only. Removal requires the
// explicit owner flag --apply, operates on whole unreferenced run directories
// only, and never rewrites, truncates or replaces an artifact — so the
// immutable-evidence and no-replace identity patterns the evidence and review
// stores depend on are preserved.
//
// It reads only inside the repository, never contacts a network, never touches
// $HOME/.nightwatch private stores, and never inspects a sibling repository.
//
// NW-AUD-005: an APPLY is bracketed by the crash-consistent retention journal
// (`src/core/evidenceRetention/retentionJournal.ts`), which is the ONLY
// authority for a deletion receipt. A durable PREPARED intent is published
// BEFORE the first removal, a TERMINAL record is published and RE-VERIFIED
// afterwards, and only a verified terminal record may be read as a receipt.
// A journal failure is a categorical non-success with a non-zero exit, never a
// best-effort write: an interrupted apply can no longer leave a receipt whose
// last word is `STARTED` with an empty deleted set.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from './lib/typescript-runtime-loader.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli, invokedDirectly } from './lib/operator-cli.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_VERSION = 'nightwatch.evidence-retention.v1';
const RECEIPT_SCHEMA_VERSION = 'nightwatch.evidence-retention-receipt.v1';
const ARTIFACT_ROOT_NAME = 'artifacts';
const RECEIPT_DIRECTORY = path.join('.nightwatch', 'retention');
const CONFIRMATION_TOKEN_PATTERN = /^sha256:[0-9a-f]{24}$/;
const DEFAULT_KEEP_RECENT = 100;
const MAX_ENTRIES = 100_000;
const MAX_SCAN_BYTES = 32 * 1024 * 1024;
// Directories whose tracked text can bind an artifact to durable project
// truth. Anything outside this set cannot make an artifact load-bearing.
const REFERENCE_SOURCES = Object.freeze(['.agent', 'docs', 'openspec', 'config']);

/**
 * One enumerated artifact-root entry, exactly as the pure classifier observes
 * it. `kind` is the closed vocabulary the classifier refuses on.
 *
 * @typedef {import('../src/core/evidenceRetention/index').RetentionEntryObservation['kind']} RetentionEntryKind
 */

/**
 * The parsed operator request. `--root` exists so the removal path can be
 * exercised against a disposable store; it is validated before any enumeration.
 *
 * @typedef {{ readonly command: 'status' | 'plan', readonly json: boolean, readonly apply: boolean, readonly confirm: string | null, readonly keepRecent: number, readonly suppliedRoot: string | null }} EvidenceRetentionOptions
 */

/**
 * One removal outcome. A target that is no longer a plain directory, or is a
 * symlink, is preserved with its own reason code.
 *
 * @typedef {{ readonly name: string, readonly result: 'PRESERVED' | 'REMOVED', readonly reasonCode: string }} RetentionRemovalResult
 */

/**
 * Every field a retention report can carry. The refusal-first blocked reports
 * carry a subset, so the report is the partial shape and the render reads the
 * fields that are always present after the blocked early return.
 *
 * @typedef {{ readonly schemaVersion: string, readonly artifactRoot: string, readonly keepRecent: number, readonly entryCount: number, readonly refusedCount: number, readonly candidateCount: number, readonly reclaimableBytes: number | null, readonly referenceScanComplete: boolean, readonly confirmationToken: string, readonly refusedByReason: Record<string, number>, readonly candidates: string[], readonly mode: string, readonly result: string, readonly code: string, readonly removalResults: readonly RetentionRemovalResult[], readonly removedCount: number, readonly deletedSet: readonly { readonly name: string, readonly bytes: number | null }[], readonly deletedBytes: number | null, readonly appliedAt: string, readonly gitHead: string | null, readonly recordPath: string | null, readonly receiptFinalized: boolean }} RetentionReportFields
 */

/** @typedef {Partial<RetentionReportFields>} RetentionReport */

/** @type {import('./lib/operator-cli.mjs').OperatorCliMetadata} */
const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'evidence-retention',
  entry: 'bin/evidence-retention.mjs',
  purpose: 'Plan or apply whole-run evidence retention over repository-owned artifacts only.',
  group: 'manage-evidence',
  commands: [
    { name: 'status', summary: 'report the retention state without removing anything' },
    { name: 'plan', summary: 'dry-run the same computation and removal set' },
  ],
  defaultCommand: 'status',
  flags: [
    { name: '--json', shape: 'boolean', summary: 'emit exactly one JSON document' },
    { name: '--apply', shape: 'boolean', summary: 'execute the removal plan deliberately' },
    { name: '--confirm', shape: 'string', summary: 'the dry-run confirmation token for this exact plan' },
    { name: '--keep-recent', shape: 'integer', summary: 'number of recent runs to keep' },
    { name: '--root', shape: 'path', summary: 'operate on a disposable evidence store' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: [],
};

/**
 * @param {readonly string[]} argv
 * @returns {EvidenceRetentionOptions}
 */
function parseArgs(argv) {
  /** @type {'status' | 'plan'} */
  let command = 'status';
  let json = false;
  let apply = false;
  let confirm = null;
  let keepRecent = DEFAULT_KEEP_RECENT;
  // --root exists so the REMOVAL path can be exercised against a disposable
  // store in tests. Without it the only way to test removal would be against
  // the real evidence store, and an untested removal path is worse than a
  // bounded flag. It is validated before any enumeration.
  let suppliedRoot = null;
  const seen = new Set();
  for (const argument of argv) {
    if (argument === 'status' || argument === 'plan') {
      if (seen.has('command')) throw new Error('USAGE_MULTIPLE_COMMANDS');
      command = argument;
      seen.add('command');
    } else if (argument === '--json') {
      if (seen.has('json')) throw new Error('USAGE_DUPLICATE_JSON');
      json = true;
      seen.add('json');
    } else if (argument === '--apply') {
      if (seen.has('apply')) throw new Error('USAGE_DUPLICATE_APPLY');
      apply = true;
      seen.add('apply');
    } else if (argument.startsWith('--confirm=')) {
      if (seen.has('confirm')) throw new Error('USAGE_DUPLICATE_CONFIRM');
      const value = argument.slice('--confirm='.length);
      if (!CONFIRMATION_TOKEN_PATTERN.test(value)) throw new Error('USAGE_CONFIRM_INVALID');
      confirm = value;
      seen.add('confirm');
    } else if (argument.startsWith('--keep-recent=')) {
      if (seen.has('keep')) throw new Error('USAGE_DUPLICATE_KEEP_RECENT');
      const value = Number.parseInt(argument.slice('--keep-recent='.length), 10);
      if (!Number.isInteger(value) || value < 0 || value > MAX_ENTRIES) throw new Error('USAGE_KEEP_RECENT_INVALID');
      keepRecent = value;
      seen.add('keep');
    } else if (argument.startsWith('--root=')) {
      if (seen.has('root')) throw new Error('USAGE_DUPLICATE_ROOT');
      const value = argument.slice('--root='.length);
      if (value.length === 0 || value.length > 4096) throw new Error('USAGE_ROOT_INVALID');
      suppliedRoot = value;
      seen.add('root');
    } else if (argument === '--help') {
      process.stdout.write('Usage: node bin/evidence-retention.mjs [status|plan] [--keep-recent=N] [--root=DIR] [--json] [--apply --confirm=TOKEN]\n');
      process.exit(0);
    } else {
      throw new Error(`USAGE_UNKNOWN_ARGUMENT:${argument}`);
    }
  }
  if (apply && confirm === null) throw new Error('USAGE_APPLY_REQUIRES_CONFIRM');
  if (!apply && confirm !== null) throw new Error('USAGE_CONFIRM_REQUIRES_APPLY');
  return { command, json, apply, confirm, keepRecent, suppliedRoot };
}

/**
 * @param {string} target
 * @returns {number | null}
 */
function directoryBytes(target) {
  // Bounded, no-follow recursive size. Any unreadable entry makes the whole
  // measurement null, which the classifier treats as UNPROVABLE and refuses.
  let total = 0;
  /** @type {string[]} */
  const stack = [target];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return null;
    }
    for (const entry of entries) {
      const child = path.join(current, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        stack.push(child);
        continue;
      }
      try {
        total += fs.lstatSync(child).size;
      } catch {
        return null;
      }
    }
  }
  return total;
}

/**
 * @param {string} artifactRoot
 * @returns {import('../src/core/evidenceRetention/index').RetentionEntryObservation[] | null}
 */
function enumerateEntries(artifactRoot) {
  let names;
  try {
    names = fs.readdirSync(artifactRoot, { withFileTypes: true });
  } catch {
    return null;
  }
  if (names.length > MAX_ENTRIES) return null;
  return names.map((entry) => {
    const target = path.join(artifactRoot, entry.name);
    /** @type {RetentionEntryKind} */
    let kind = 'OTHER';
    if (entry.isSymbolicLink()) kind = 'SYMLINK';
    else if (entry.isDirectory()) kind = 'DIRECTORY';
    else if (entry.isFile()) kind = 'FILE';
    let modifiedMs = null;
    try {
      modifiedMs = fs.lstatSync(target).mtimeMs;
    } catch {
      modifiedMs = null;
    }
    const bytes = kind === 'DIRECTORY' ? directoryBytes(target) : null;
    return { name: entry.name, kind, bytes, modifiedMs };
  });
}

/**
 * @param {string} root
 * @returns {string[] | null}
 */
function collectReferenceTokens(root) {
  // Returns null when the scan could not be completed, which refuses every
  // entry rather than allowing a partial scan to prove a negative.
  /** @type {string[]} */
  const tokens = [];
  let scannedBytes = 0;
  for (const source of REFERENCE_SOURCES) {
    const base = path.join(root, source);
    if (!fs.existsSync(base)) continue;
    /** @type {string[]} */
    const stack = [base];
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined) break;
      let entries;
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        return null;
      }
      for (const entry of entries) {
        const child = path.join(current, entry.name);
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) {
          stack.push(child);
          continue;
        }
        if (!/\.(?:md|json|txt|ts|mjs)$/.test(entry.name)) continue;
        let text;
        try {
          const stat = fs.lstatSync(child);
          scannedBytes += stat.size;
          if (scannedBytes > MAX_SCAN_BYTES) return null;
          text = fs.readFileSync(child, 'utf8');
        } catch {
          return null;
        }
        for (const match of text.matchAll(/[A-Za-z0-9][A-Za-z0-9._-]{2,127}/g)) {
          const token = match[0];
          if (token !== undefined) tokens.push(token);
        }
      }
    }
  }
  return tokens;
}

/**
 * @param {string} artifactRoot
 * @param {string} name
 * @returns {RetentionRemovalResult}
 */
function removeCandidate(artifactRoot, name) {
  // Revalidate the exact target immediately before removal. A target that is
  // no longer a plain directory, or is a symlink, is preserved.
  const target = path.join(artifactRoot, name);
  const parent = path.resolve(artifactRoot);
  const resolved = path.resolve(target);
  if (path.dirname(resolved) !== parent) return { name, result: 'PRESERVED', reasonCode: 'TARGET_ESCAPED_ARTIFACT_ROOT' };
  let stat;
  try {
    stat = fs.lstatSync(resolved);
  } catch {
    return { name, result: 'PRESERVED', reasonCode: 'TARGET_DISAPPEARED' };
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) return { name, result: 'PRESERVED', reasonCode: 'TARGET_NOT_A_DIRECTORY' };
  try {
    fs.rmSync(resolved, { recursive: true, force: false });
  } catch {
    return { name, result: 'PRESERVED', reasonCode: 'REMOVAL_FAILED' };
  }
  return { name, result: 'REMOVED', reasonCode: 'UNREFERENCED_AND_NOT_RECENT' };
}

/**
 * @param {string | null} suppliedRoot
 * @returns {string | null}
 */
function resolveRoot(suppliedRoot) {
  if (suppliedRoot === null) return ROOT;
  const resolved = path.resolve(suppliedRoot);
  let stat;
  try {
    stat = fs.lstatSync(resolved);
  } catch {
    return null;
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) return null;
  let artifactStat;
  try {
    artifactStat = fs.lstatSync(path.join(resolved, ARTIFACT_ROOT_NAME));
  } catch {
    return null;
  }
  if (artifactStat.isSymbolicLink() || !artifactStat.isDirectory()) return null;
  return resolved;
}

/**
 * The confirmation token binds the exact plan the operator reviewed: the
 * store, the window, the completeness of the reference scan, and every
 * candidate name and byte count. A plan that changes in any of those ways
 * yields a different token, so apply cannot silently act on a new plan.
 *
 * @param {string} root
 * @param {number} keepRecent
 * @param {import('../src/core/evidenceRetention/index').RetentionPlan} plan
 * @returns {string}
 */
function computeConfirmationToken(root, keepRecent, plan) {
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    store: path.resolve(root),
    artifactRoot: ARTIFACT_ROOT_NAME,
    keepRecent,
    referenceScanComplete: plan.referenceScanComplete === true,
    refusedCount: plan.refusedCount,
    candidateCount: plan.candidateCount,
    candidates: plan.entries
      .filter((entry) => entry.disposition === 'REMOVAL_CANDIDATE')
      .map((entry) => ({ name: entry.name, bytes: entry.bytes }))
      .sort((left, right) => left.name.localeCompare(right.name)),
  };
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex').slice(0, 24)}`;
}

/** A bounded digest of the exact refusal set, so the receipt can prove it. */
/**
 * @param {import('../src/core/evidenceRetention/index').RetentionPlan} plan
 * @returns {string}
 */
function computeRefusalSetDigest(plan) {
  const lines = plan.entries
    .filter((entry) => entry.disposition !== 'REMOVAL_CANDIDATE')
    .map((entry) => `${entry.name}\t${entry.reasonCode}`)
    .sort();
  return `sha256:${crypto.createHash('sha256').update(lines.join('\n'), 'utf8').digest('hex').slice(0, 24)}`;
}

/** Best-effort repository SHA for the deletion record; null when unavailable. */
/**
 * @param {string} root
 * @returns {string | null}
 */
function readGitHead(root) {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15_000,
    maxBuffer: 4096,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (result.status !== 0) return null;
  const head = (result.stdout ?? '').trim().toLowerCase();
  return /^[0-9a-f]{40}$/.test(head) ? head : null;
}

/**
 * Write the operator receipt under the ignored `.nightwatch/retention/` root, so
 * a deletion is recorded outside the evidence store and cannot itself become a
 * future retention candidate. Returns the repository-relative path, or null
 * when the receipt could not be written.
 *
 * NW-AUD-005: this is the operator-facing rendering of an operation the
 * crash-consistent journal has already made durable. It runs only after a
 * verified TERMINAL record exists, so the file this writes can never be the
 * last word about a half-finished deletion, and a failure here is a
 * categorical non-success for the caller rather than a best-effort write.
 *
 * @param {string} root
 * @param {{ readonly appliedAt: string } & Record<string, unknown>} receipt
 * @returns {string | null}
 */
function writeReceipt(root, receipt) {
  const directory = path.join(root, RECEIPT_DIRECTORY);
  const stamp = receipt.appliedAt.replace(/[^0-9TZ]/g, '').slice(0, 18);
  const file = path.join(directory, `retention-apply-${stamp}-${process.pid}.json`);
  try {
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: 'utf8' });
  } catch {
    return null;
  }
  return path.relative(root, file).split(path.sep).join('/');
}

/**
 * @param {EvidenceRetentionOptions} options
 * @returns {RetentionReport}
 */
function execute(options) {
  const retention = loadRuntimeTypeScriptModule('src/core/evidenceRetention/index.ts', { root: ROOT });
  const root = resolveRoot(options.suppliedRoot);
  if (root === null) {
    return { schemaVersion: SCHEMA_VERSION, result: 'BLOCKED', mode: 'STATUS', code: 'ROOT_UNUSABLE', artifactRoot: ARTIFACT_ROOT_NAME };
  }
  const artifactRoot = path.join(root, ARTIFACT_ROOT_NAME);
  const entries = enumerateEntries(artifactRoot);
  if (entries === null) {
    return {
      schemaVersion: SCHEMA_VERSION,
      result: 'BLOCKED',
      mode: 'STATUS',
      code: 'ARTIFACT_ROOT_UNOBSERVABLE',
      artifactRoot: ARTIFACT_ROOT_NAME,
    };
  }
  const tokens = collectReferenceTokens(root);
  const plan = retention.planRetention({
    referencedTokens: tokens ?? [],
    entries,
    referenceScanComplete: tokens !== null,
    keepRecent: options.keepRecent,
  });
  const confirmationToken = computeConfirmationToken(root, options.keepRecent, plan);
  const refusedByReason = plan.entries
    .filter((entry) => entry.disposition !== 'REMOVAL_CANDIDATE')
    .reduce(
      /**
       * @param {Record<string, number>} counts
       * @param {import('../src/core/evidenceRetention/index').RetentionPlanEntry} entry
       * @returns {Record<string, number>}
       */
      (counts, entry) => ({ ...counts, [entry.reasonCode]: (counts[entry.reasonCode] ?? 0) + 1 }),
      /** @type {Record<string, number>} */ ({}),
    );

  const base = {
    schemaVersion: SCHEMA_VERSION,
    artifactRoot: ARTIFACT_ROOT_NAME,
    keepRecent: options.keepRecent,
    entryCount: plan.entries.length,
    refusedCount: plan.refusedCount,
    candidateCount: plan.candidateCount,
    reclaimableBytes: plan.reclaimableBytes,
    referenceScanComplete: plan.referenceScanComplete,
    confirmationToken,
    refusedByReason,
    candidates: plan.entries.filter((entry) => entry.disposition === 'REMOVAL_CANDIDATE').map((entry) => entry.name),
  };

  if (!options.apply) {
    return { ...base, mode: options.command === 'plan' ? 'DRY_RUN' : 'STATUS', result: 'PRESERVED' };
  }

  // Apply never runs inside a gate or unattended: a CI/gate environment is
  // refused even with the right token, because the token is proof a human
  // reviewed the dry run, not proof the invocation is supervised.
  if (process.env.CI || process.env.NIGHTWATCH_GATE_ACTIVE) {
    return { ...base, mode: 'APPLY', result: 'BLOCKED', code: 'APPLY_REFUSED_NON_INTERACTIVE', deletedSet: [], deletedBytes: 0, removedCount: 0 };
  }
  if (options.confirm !== confirmationToken) {
    return { ...base, mode: 'APPLY', result: 'BLOCKED', code: 'CONFIRMATION_TOKEN_MISMATCH', deletedSet: [], deletedBytes: 0, removedCount: 0 };
  }

  const appliedAt = new Date().toISOString();
  const gitHead = readGitHead(root);
  /** @type {Map<string, number | null>} */
  const candidateBytes = new Map(base.candidates.map((name) => [name, plan.entries.find((candidate) => candidate.name === name)?.bytes ?? null]));
  const receiptBase = {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    retentionSchemaVersion: SCHEMA_VERSION,
    appliedAt,
    gitHead,
    artifactRoot: ARTIFACT_ROOT_NAME,
    keepRecent: options.keepRecent,
    entryCount: plan.entries.length,
    refusedCount: plan.refusedCount,
    candidateCount: plan.candidateCount,
    reclaimableBytes: plan.reclaimableBytes,
    referenceScanComplete: plan.referenceScanComplete,
    refusedByReason,
    refusalSetDigest: computeRefusalSetDigest(plan),
    confirmationToken,
  };
  if (base.candidates.length === 0) {
    // No candidate means no deletion can occur, so no journal operation is
    // opened (the journal refuses an operation with no candidates). The
    // receipt records the honest PRESERVED outcome, and a receipt that cannot
    // be written is still a categorical refusal rather than a silent success.
    const recordPath = writeReceipt(root, { ...receiptBase, status: 'PRESERVED', removedCount: 0, deletedSet: [], deletedBytes: 0 });
    if (recordPath === null) {
      return { ...base, mode: 'APPLY', result: 'BLOCKED', code: 'RECEIPT_WRITE_FAILED', deletedSet: [], deletedBytes: 0, removedCount: 0 };
    }
    return {
      ...base,
      mode: 'APPLY',
      removalResults: [],
      removedCount: 0,
      deletedSet: [],
      deletedBytes: 0,
      appliedAt,
      gitHead,
      recordPath,
      receiptFinalized: true,
      result: 'PRESERVED',
    };
  }

  // NW-AUD-005: the journal, not this file, owns the deletion record. The
  // PREPARED intent is durable BEFORE the first removal; if it cannot be
  // written, nothing is removed — an unrecorded deletion is refused, not
  // performed.
  const journal = retention.retentionJournalStore(path.resolve(root, RECEIPT_DIRECTORY));
  const operationId = `retention-${crypto.randomBytes(12).toString('hex')}`;
  const prepared = retention.prepareRetentionOperation(journal, {
    operationId,
    appliedAt,
    gitHead,
    keepRecent: options.keepRecent,
    // The durable record binds a DIGEST of the reviewed plan's confirmation
    // token, never the operator-facing token itself.
    planConfirmationDigest: `sha256:${crypto.createHash('sha256').update(confirmationToken, 'utf8').digest('hex').slice(0, 24)}`,
    refusalSetDigest: computeRefusalSetDigest(plan),
    entryCount: plan.entries.length,
    refusedCount: plan.refusedCount,
    candidateCount: plan.candidateCount,
    reclaimableBytes: plan.reclaimableBytes,
    referenceScanComplete: plan.referenceScanComplete,
    candidates: base.candidates.map((name) => ({ name, bytes: candidateBytes.get(name) ?? null })),
  });
  if (!prepared.ok) {
    return { ...base, mode: 'APPLY', result: 'BLOCKED', code: 'RETENTION_JOURNAL_PREPARE_FAILED', deletedSet: [], deletedBytes: 0, removedCount: 0 };
  }

  const removalResults = base.candidates.map((name) => removeCandidate(artifactRoot, name));
  const deletedSet = removalResults
    .filter((entry) => entry.result === 'REMOVED')
    .map((entry) => ({ name: entry.name, bytes: candidateBytes.get(entry.name) ?? null }));
  const removed = deletedSet.length;
  const deletedBytes = deletedSet.every((entry) => entry.bytes !== null)
    ? deletedSet.reduce((total, entry) => total + (entry.bytes ?? 0), 0)
    : null;
  const result = removed === 0 ? 'PRESERVED' : removed === removalResults.length ? 'APPLIED' : 'PARTIAL';
  const targets = removalResults.map((entry) => ({
    name: entry.name,
    result: entry.result,
    reasonCode: entry.reasonCode,
    bytes: candidateBytes.get(entry.name) ?? null,
  }));
  // The terminal record is published no-replace and then RE-READ and compared
  // byte-for-byte. A deletion that happened without a verified terminal record
  // is a categorical non-success, never an APPLIED claim over an unproven
  // receipt.
  const finalized = retention.finalizeRetentionOperation(journal, operationId, targets);
  if (!finalized.ok) {
    return { ...base, mode: 'APPLY', result: 'BLOCKED', code: 'RETENTION_JOURNAL_FINALIZE_FAILED', removalResults, removedCount: removed, deletedSet, deletedBytes, appliedAt, gitHead, recordPath: null, receiptFinalized: false };
  }
  // Only a verified TERMINAL record may be read as a deletion receipt; a
  // non-terminal record is refused with RETENTION_JOURNAL_OPERATION_INCOMPLETE.
  let terminal;
  try {
    terminal = retention.assertTerminalRetentionRecord(retention.readRetentionOperation(journal, operationId));
  } catch {
    return { ...base, mode: 'APPLY', result: 'BLOCKED', code: 'RETENTION_JOURNAL_OPERATION_INCOMPLETE', removalResults, removedCount: removed, deletedSet, deletedBytes, appliedAt, gitHead, recordPath: null, receiptFinalized: false };
  }
  const recordPath = writeReceipt(root, { ...receiptBase, status: terminal.status, removedCount: terminal.removedCount, deletedSet: terminal.deletedSet, deletedBytes: terminal.deletedBytes });
  if (recordPath === null) {
    return { ...base, mode: 'APPLY', result: 'BLOCKED', code: 'RECEIPT_WRITE_FAILED', removalResults, removedCount: removed, deletedSet, deletedBytes, appliedAt, gitHead, receiptFinalized: false };
  }
  return {
    ...base,
    mode: 'APPLY',
    removalResults,
    removedCount: removed,
    deletedSet,
    deletedBytes,
    appliedAt,
    gitHead,
    recordPath,
    receiptFinalized: true,
    // Reclaiming nothing is a valid, honest outcome, not a failure.
    result,
  };
}

/**
 * @param {RetentionReport} report
 * @returns {string}
 */
function renderText(report) {
  if (report.result === 'BLOCKED') return `Nightwatch evidence retention: BLOCKED ${report.code}\n`;
  const refusedByReason = report.refusedByReason ?? {};
  const lines = [
    `Nightwatch evidence retention: ${report.result}`,
    `mode=${report.mode} root=${report.artifactRoot} keepRecent=${report.keepRecent}`,
    `entries=${report.entryCount} refused=${report.refusedCount} candidates=${report.candidateCount} reclaimable=${report.reclaimableBytes ?? 'unmeasured'}`,
    `referenceScanComplete=${report.referenceScanComplete}`,
    `confirmationToken=${report.confirmationToken}`,
    ...Object.entries(refusedByReason).map(([reason, count]) => `  refused ${reason}=${count}`),
  ];
  if (report.mode === 'APPLY') {
    lines.push(`removed=${report.removedCount}/${(report.removalResults ?? []).length}`);
    lines.push(`record=${report.recordPath ?? 'unwritten'} receiptFinalized=${report.receiptFinalized === true}`);
  }
  return `${lines.join('\n')}\n`;
}

const cli = invokedDirectly(import.meta.url) ? defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url }) : { stop: true };
if (!cli.stop) {
const options = (() => {
  try {
    return parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'USAGE_INVALID');
    process.exit(2);
  }
})();

try {
  const report = execute(options);
  process.stdout.write(options.json ? `${JSON.stringify(report)}\n` : renderText(report));
  if (report.result === 'BLOCKED') process.exitCode = 2;
} catch {
  if (options.json) process.stdout.write(`${JSON.stringify({ schemaVersion: SCHEMA_VERSION, result: 'BLOCKED', code: 'RETENTION_EXECUTION_BLOCKED' })}\n`);
  else console.error('RETENTION_EXECUTION_BLOCKED');
  process.exitCode = 2;
}
}
