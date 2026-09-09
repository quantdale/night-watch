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

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_VERSION = 'nightwatch.evidence-retention.v1';
const ARTIFACT_ROOT_NAME = 'artifacts';
const DEFAULT_KEEP_RECENT = 100;
const MAX_ENTRIES = 100_000;
const MAX_SCAN_BYTES = 32 * 1024 * 1024;
// Directories whose tracked text can bind an artifact to durable project
// truth. Anything outside this set cannot make an artifact load-bearing.
const REFERENCE_SOURCES = Object.freeze(['.agent', 'docs', 'openspec', 'config']);

function parseArgs(argv) {
  let command = 'status';
  let json = false;
  let apply = false;
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
      process.stdout.write('Usage: node bin/evidence-retention.mjs [status|plan] [--keep-recent=N] [--root=DIR] [--json] [--apply]\n');
      process.exit(0);
    } else {
      throw new Error(`USAGE_UNKNOWN_ARGUMENT:${argument}`);
    }
  }
  return { command, json, apply, keepRecent, suppliedRoot };
}

function directoryBytes(target) {
  // Bounded, no-follow recursive size. Any unreadable entry makes the whole
  // measurement null, which the classifier treats as UNPROVABLE and refuses.
  let total = 0;
  const stack = [target];
  while (stack.length > 0) {
    const current = stack.pop();
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

function collectReferenceTokens(root) {
  // Returns null when the scan could not be completed, which refuses every
  // entry rather than allowing a partial scan to prove a negative.
  const tokens = [];
  let scannedBytes = 0;
  for (const source of REFERENCE_SOURCES) {
    const base = path.join(root, source);
    if (!fs.existsSync(base)) continue;
    const stack = [base];
    while (stack.length > 0) {
      const current = stack.pop();
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
        for (const match of text.matchAll(/[A-Za-z0-9][A-Za-z0-9._-]{2,127}/g)) tokens.push(match[0]);
      }
    }
  }
  return tokens;
}

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

  const base = {
    schemaVersion: SCHEMA_VERSION,
    artifactRoot: ARTIFACT_ROOT_NAME,
    keepRecent: options.keepRecent,
    entryCount: plan.entries.length,
    refusedCount: plan.refusedCount,
    candidateCount: plan.candidateCount,
    reclaimableBytes: plan.reclaimableBytes,
    referenceScanComplete: plan.referenceScanComplete,
    refusedByReason: plan.entries
      .filter((entry) => entry.disposition !== 'REMOVAL_CANDIDATE')
      .reduce((counts, entry) => ({ ...counts, [entry.reasonCode]: (counts[entry.reasonCode] ?? 0) + 1 }), {}),
    candidates: plan.entries.filter((entry) => entry.disposition === 'REMOVAL_CANDIDATE').map((entry) => entry.name),
  };

  if (!options.apply) {
    return { ...base, mode: options.command === 'plan' ? 'DRY_RUN' : 'STATUS', result: 'PRESERVED' };
  }

  const removalResults = base.candidates.map((name) => removeCandidate(artifactRoot, name));
  const removed = removalResults.filter((entry) => entry.result === 'REMOVED').length;
  return {
    ...base,
    mode: 'APPLY',
    removalResults,
    removedCount: removed,
    // Reclaiming nothing is a valid, honest outcome, not a failure.
    result: removed === 0 ? 'PRESERVED' : removed === removalResults.length ? 'APPLIED' : 'PARTIAL',
  };
}

function renderText(report) {
  if (report.result === 'BLOCKED') return `Nightwatch evidence retention: BLOCKED ${report.code}\n`;
  const lines = [
    `Nightwatch evidence retention: ${report.result}`,
    `mode=${report.mode} root=${report.artifactRoot} keepRecent=${report.keepRecent}`,
    `entries=${report.entryCount} refused=${report.refusedCount} candidates=${report.candidateCount} reclaimable=${report.reclaimableBytes ?? 'unmeasured'}`,
    `referenceScanComplete=${report.referenceScanComplete}`,
    ...Object.entries(report.refusedByReason).map(([reason, count]) => `  refused ${reason}=${count}`),
  ];
  if (report.mode === 'APPLY') lines.push(`removed=${report.removedCount}/${report.removalResults.length}`);
  return `${lines.join('\n')}\n`;
}

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
