#!/usr/bin/env node

// Small, deterministic checker for Nightwatch's repository-native agent-state
// protocol. It reads local files and git HEAD only; it never starts a browser,
// opens a socket, or rewrites state.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildChildEnvironment } from './child-environment.mjs';

const ACTIVE_STATUSES = new Set(['NONE', 'IN_PROGRESS', 'BLOCKED', 'COMPLETE']);
const REQUIRED_ACTIVE_FIELDS = [
  'Task ID',
  'Phase',
  'Title',
  'Status',
  'Task directory',
  'Starting SHA',
  'Last validated implementation SHA',
  'Current milestone',
  'Last checkpoint',
  'Next action',
];
const REQUIRED_PLAN_HEADINGS = [
  '# ',
  '## Purpose',
  '## Starting State',
  '## Scope',
  '## Non-Goals',
  '## Safety Constraints',
  '## Architecture / Approach',
  '## Milestones',
  '## Validation Strategy',
  '## Decision Log',
  '## Discoveries',
  '## Deferred Work',
  '## Completion Criteria',
];
const REQUIRED_STATE_HEADINGS = [
  '# Task State',
  '## Identity',
  '## Objective',
  '## Current Milestone',
  '## Completed Milestones',
  '## Work In Progress',
  '## Exact Next Action',
  '## Files Changed',
  '## Validation Ledger',
  '## Decisions Made During This Task',
  '## Discoveries',
  '## Blockers',
  '## Safety Events',
  '## Deferred / Follow-Up',
  '## Resume Recipe',
  '## Completion Snapshot',
];

function parseArgs(argv) {
  const rootIndex = argv.indexOf('--root');
  if (rootIndex !== -1) {
    const supplied = argv[rootIndex + 1];
    if (!supplied || supplied.startsWith('--')) {
      throw new Error('--root requires a directory');
    }
    return path.resolve(supplied);
  }
  return process.cwd();
}

function readFile(root, relativePath, errors) {
  const file = path.join(root, relativePath);
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    errors.push(`missing or unreadable file: ${relativePath}`);
    return null;
  }
}

function parseKeyValueFile(text) {
  const fields = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = /^(?<key>[^:#][^:]*):\s*(?<value>.*)$/.exec(line);
    if (!match?.groups) continue;
    const key = match.groups.key.trim();
    if (!fields.has(key)) fields.set(key, match.groups.value.trim());
  }
  return fields;
}

function requireHeadings(text, headings, label, errors) {
  for (const heading of headings) {
    if (heading === '# ') {
      if (!/^#\s+\S/m.test(text)) errors.push(`${label} missing H1 heading`);
    } else if (!text.split(/\r?\n/).some((line) => line.trim() === heading)) {
      errors.push(`${label} missing required heading: ${heading}`);
    }
  }
}

function checkSha(value, label, errors) {
  if (!/^[0-9a-f]{40}$/i.test(value ?? '')) {
    errors.push(`${label} must be a 40-character git SHA`);
  }
}

function isCommit(root, sha) {
  return commandOutput(root, ['cat-file', '-e', `${sha}^{commit}`]) !== null;
}

function isAncestor(root, ancestor, descendant) {
  const result = spawnSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], {
    cwd: root,
    encoding: 'utf8',
    env: buildChildEnvironment(process.env),
    timeout: 10_000,
    maxBuffer: 256 * 1024,
  });
  return result.status === 0;
}

function committedChangedPaths(root, from, to) {
  const output = commandOutput(root, ['diff', '--name-only', '--no-renames', `${from}..${to}`]);
  if (output === null) return null;
  return output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).sort();
}

function continuityValue(stateFields, upperName, legacyName) {
  return stateFields.get(upperName) ?? stateFields.get(legacyName);
}

function validateAnchor(root, value, label, head, errors) {
  if (!value) {
    errors.push(`${label} is required`);
    return false;
  }
  if (!/^[0-9a-f]{40}$/i.test(value)) {
    errors.push(`${label} must be a 40-character git SHA`);
    return false;
  }
  if (!isCommit(root, value)) {
    errors.push(`${label} does not identify a commit in repository history`);
    return false;
  }
  if (head && !isAncestor(root, value, head)) {
    errors.push(`${label} is not an ancestor of live Git HEAD ${head}`);
    return false;
  }
  return true;
}

function checkContinuity(stateFields, root, head, errors, warnings) {
  const validated = continuityValue(stateFields, 'LAST_VALIDATED_IMPLEMENTATION_SHA', 'Last validated implementation SHA');
  const substantive = continuityValue(stateFields, 'LAST_SUBSTANTIVE_CHECKPOINT_SHA', 'Last substantive checkpoint SHA') ?? validated;
  const documentation = continuityValue(stateFields, 'LAST_DOCUMENTATION_CHECKPOINT_SHA', 'Last documentation checkpoint SHA');
  const starting = continuityValue(stateFields, 'STARTING_SHA', 'Starting SHA');

  const validatedOk = validateAnchor(root, validated, 'STATE LAST_VALIDATED_IMPLEMENTATION_SHA', head, errors);
  const substantiveOk = validateAnchor(root, substantive, 'STATE LAST_SUBSTANTIVE_CHECKPOINT_SHA', head, errors);
  if (!stateFields.has('LAST_SUBSTANTIVE_CHECKPOINT_SHA') && substantive) {
    warnings.push('LEGACY_CONTINUITY: LAST_SUBSTANTIVE_CHECKPOINT_SHA inferred from the validated implementation anchor');
  }
  if (starting) validateAnchor(root, starting, 'STATE STARTING_SHA', head, errors);

  if (validatedOk && substantiveOk && validated !== substantive) {
    const rolePaths = isAncestor(root, substantive, validated) ? committedChangedPaths(root, substantive, validated) : null;
    const docsOnly = rolePaths !== null && rolePaths.every((file) => isApprovedCheckpointPath(file));
    errors.push(
      docsOnly
        ? `INVALID_IMPLEMENTATION_ROLE: LAST_VALIDATED_IMPLEMENTATION_SHA ${validated} is a documentation-only descendant of substantive checkpoint ${substantive}`
        : `INVALID_IMPLEMENTATION_ROLE: LAST_VALIDATED_IMPLEMENTATION_SHA ${validated} must equal LAST_SUBSTANTIVE_CHECKPOINT_SHA ${substantive}`,
    );
  }

  if (documentation) {
    const documentationOk = validateAnchor(root, documentation, 'INVALID_DOCUMENTATION_CHECKPOINT: STATE LAST_DOCUMENTATION_CHECKPOINT_SHA', head, errors);
    if (documentationOk && substantiveOk) {
      if (!isAncestor(root, substantive, documentation)) {
        errors.push(`INVALID_DOCUMENTATION_CHECKPOINT: ${documentation} is before or unrelated to substantive checkpoint ${substantive}`);
      } else {
        const documentationPaths = committedChangedPaths(root, substantive, documentation);
        if (documentationPaths === null) {
          errors.push('INVALID_DOCUMENTATION_CHECKPOINT: unable to inspect the checkpoint range');
        } else {
          const disallowed = documentationPaths.filter((file) => !isApprovedCheckpointPath(file));
          if (disallowed.length > 0) {
            errors.push(`INVALID_DOCUMENTATION_CHECKPOINT: range contains non-documentation paths: ${disallowed.join(', ')}`);
          }
        }
      }
    }
  }

  for (const name of ['LAST_PUSHED_SHA', 'CURRENT_LOCAL_HEAD', 'CURRENT_REMOTE_HEAD']) {
    const value = stateFields.get(name);
    if (value && value !== 'DISCOVER_FROM_GIT' && value !== 'DEPRECATED_HISTORICAL_ONLY') checkSha(value, `STATE ${name}`, errors);
  }
  const legacyCurrent = stateFields.get('Current SHA');
  if (legacyCurrent) {
    checkSha(legacyCurrent, 'STATE deprecated Current SHA', errors);
    warnings.push('DEPRECATED_CONTINUITY_FIELD: STATE Current SHA is ignored; live HEAD comes from Git');
  }
  const liveRemoteHead = commandOutput(root, ['rev-parse', 'origin/main'])?.trim() ?? null;
  if (head) console.log(`[agent-check] LIVE GIT HEAD: ${head}${liveRemoteHead ? `; LIVE origin/main: ${liveRemoteHead}` : ''}`);
}

// These patterns intentionally target value shapes, not words such as
// "secret" or "cookie" in prose. The test suite plants synthetic values only.
const SECRET_PATTERNS = [
  { label: 'Bearer token', re: /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/i },
  { label: 'JWT-like token', re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/ },
  { label: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'PEM private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  {
    label: 'credential assignment',
    re: /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|authorization)\b\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{8,}/i,
  },
];

function scanForSecrets(root, relativePaths, errors) {
  for (const relativePath of relativePaths) {
    const file = path.join(root, relativePath);
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.re.test(text)) {
        errors.push(`secret-like ${pattern.label} detected in ${relativePath}`);
      }
      pattern.re.lastIndex = 0;
    }
  }
}

function gitHead(root, errors) {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    env: buildChildEnvironment(process.env),
    timeout: 10_000,
    maxBuffer: 256 * 1024,
  });
  if (result.status !== 0) {
    errors.push('unable to read git HEAD');
    return null;
  }
  return result.stdout.trim();
}

// A task-state commit necessarily changes the repository after the last
// validated implementation baseline. Keep this allowlist deliberately narrow:
// arbitrary documentation or source descendants must not look synchronized.
const APPROVED_CHECKPOINT_PATHS = [
  /^AGENTS\.md$/,
  /^\.agent\/(?:ACTIVE_TASK\.md|README\.md|PLANS\.md|templates\/[^/]+\.md)$/,
  /^\.agent\/tasks\/[^/]+\/(?:SPEC|PLAN|STATE|REPORT|ACTIONS|MODELS|EXPLORATION|FRESHNESS|ADVERSARIAL_REVIEW)\.md$/,
  /^corpus\/phase6\/(?:README\.md|runtime-binding-audit\.json)$/,
  /^docs\/(?:ARCHITECTURE|CURRENT_STATE|SAFETY_MODEL|DECISIONS|ROADMAP|CI_HARDENING)\.md$/,
];

function isApprovedCheckpointPath(file) {
  return APPROVED_CHECKPOINT_PATHS.some((pattern) => pattern.test(file));
}

function commandOutput(root, args) {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    env: buildChildEnvironment(process.env),
    timeout: 10_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  if (result.status !== 0) return null;
  return result.stdout ?? '';
}

function changedPaths(root, recordedSha, head) {
  const paths = new Set();
  const committed = commandOutput(root, ['diff', '--name-only', '--no-renames', `${recordedSha}..${head}`]);
  const worktree = commandOutput(root, ['diff', '--name-only', '--no-renames', recordedSha]);
  for (const output of [committed, worktree]) {
    if (output === null) continue;
    for (const file of output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)) paths.add(file);
  }

  // `git diff` does not include untracked files. Include them because a new
  // source/config/test file must be visible as stale before it is committed.
  const status = commandOutput(root, ['status', '--porcelain=v1', '--untracked-files=all', '-z']);
  if (status !== null) {
    const records = status.split('\0').filter(Boolean);
    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      const code = record.slice(0, 2);
      const file = record.slice(3);
      if (file) paths.add(file);
      if (code.includes('R') || code.includes('C')) {
        const original = records[index + 1];
        if (original) {
          paths.add(original);
          index += 1;
        }
      }
    }
  }
  return [...paths].sort();
}

/**
 * Classify the recorded implementation baseline against committed and
 * uncommitted repository changes. This function never rewrites task state.
 */
export function classifySha(root, recordedSha, suppliedHead = null) {
  const head = suppliedHead ?? commandOutput(root, ['rev-parse', 'HEAD'])?.trim() ?? null;
  if (!head || !/^[0-9a-f]{40}$/i.test(recordedSha ?? '')) {
    return { status: 'STALE', classification: 'INVALID_IMPLEMENTATION_ROLE', head, paths: [], reason: 'recorded SHA or live Git HEAD is unavailable/invalid' };
  }
  if (!isCommit(root, recordedSha)) {
    return { status: 'STALE', classification: 'INVALID_IMPLEMENTATION_ROLE', head, paths: [], reason: 'recorded SHA does not identify a repository commit' };
  }
  if (!isAncestor(root, recordedSha, head)) {
    return { status: 'STALE', classification: 'INVALID_IMPLEMENTATION_ROLE', head, paths: [], reason: 'recorded SHA is not an ancestor of live Git HEAD' };
  }

  const paths = changedPaths(root, recordedSha, head);
  const disallowed = paths.filter((file) => !isApprovedCheckpointPath(file));
  if (disallowed.length > 0) {
    return {
      status: 'STALE',
      classification: 'STALE_IMPLEMENTATION_BASELINE',
      head,
      paths,
      disallowed,
      reason: `implementation/source/test/config or unapproved file changed after the recorded baseline: ${disallowed.join(', ')}`,
    };
  }
  if (head === recordedSha && paths.length === 0) {
    return { status: 'SYNCED', classification: 'SYNCED', head, paths, reason: 'recorded baseline equals live HEAD with no working-tree changes' };
  }
  return {
    status: 'CHECKPOINT_ADVANCE',
    classification: 'CHECKPOINT_ADVANCE',
    head,
    paths,
    reason: 'only approved continuity/documentation state changed after the recorded baseline',
  };
}

export function validate(root) {
  const errors = [];
  const warnings = [];
  const activeText = readFile(root, '.agent/ACTIVE_TASK.md', errors);
  readFile(root, 'AGENTS.md', errors);
  if (activeText === null) return { errors, warnings };

  const active = parseKeyValueFile(activeText);
  for (const field of REQUIRED_ACTIVE_FIELDS) {
    if (!active.has(field)) errors.push(`ACTIVE_TASK missing field: ${field}`);
  }

  const status = active.get('Status');
  if (status && !ACTIVE_STATUSES.has(status)) {
    errors.push(`ACTIVE_TASK has invalid status: ${status}`);
  }

  if (status !== 'NONE') {
    const taskId = active.get('Task ID') ?? '';
    const taskDirectory = active.get('Task directory') ?? '';
    const expectedDirectory = `.agent/tasks/${taskId}`;
    if (taskId === '' || !/^[a-z0-9][a-z0-9._-]*$/.test(taskId)) {
      errors.push('ACTIVE_TASK Task ID is missing or invalid');
    }
    if (taskDirectory !== expectedDirectory) {
      errors.push(`task ID/directory mismatch: ${taskId} != ${taskDirectory}`);
    }
    if (!fs.existsSync(path.join(root, taskDirectory)) || !fs.statSync(path.join(root, taskDirectory)).isDirectory()) {
      errors.push(`referenced task directory does not exist: ${taskDirectory}`);
    }

    const taskFiles = ['SPEC.md', 'PLAN.md', 'STATE.md', 'REPORT.md'];
    const taskTexts = new Map();
    for (const file of taskFiles) {
      const relativePath = path.join(taskDirectory, file);
      const text = readFile(root, relativePath, errors);
      if (text !== null) taskTexts.set(file, text);
    }
    const plan = taskTexts.get('PLAN.md');
    if (plan !== undefined) requireHeadings(plan, REQUIRED_PLAN_HEADINGS, 'PLAN.md', errors);
    const state = taskTexts.get('STATE.md');
    if (state !== undefined) requireHeadings(state, REQUIRED_STATE_HEADINGS, 'STATE.md', errors);

    const stateFields = state ? parseKeyValueFile(state) : new Map();
    if (state && stateFields.get('Task ID') !== taskId) {
      errors.push(`STATE Task ID does not match ACTIVE_TASK: ${stateFields.get('Task ID') ?? '<missing>'} != ${taskId}`);
    }
    if (state && status !== stateFields.get('Status')) {
      errors.push(`STATE status does not match ACTIVE_TASK: ${stateFields.get('Status') ?? '<missing>'} != ${status}`);
    }
    const head = gitHead(root, errors);
    checkSha(active.get('Starting SHA'), 'ACTIVE_TASK Starting SHA', errors);
    checkSha(active.get('Last validated implementation SHA'), 'ACTIVE_TASK Last validated implementation SHA', errors);
    if (active.has('Current SHA')) {
      checkSha(active.get('Current SHA'), 'ACTIVE_TASK deprecated Current SHA', errors);
      warnings.push('DEPRECATED_CONTINUITY_FIELD: ACTIVE_TASK Current SHA is ignored; use Git for live HEAD');
    }
    if (state) {
      const stateValidated = continuityValue(stateFields, 'LAST_VALIDATED_IMPLEMENTATION_SHA', 'Last validated implementation SHA');
      checkSha(stateFields.get('Starting SHA'), 'STATE Starting SHA', errors);
      checkSha(stateValidated, 'STATE Last validated implementation SHA', errors);
      if (stateValidated && active.get('Last validated implementation SHA') && stateValidated !== active.get('Last validated implementation SHA')) {
        errors.push(`STATE/ACTIVE_TASK validated implementation anchors differ: ${stateValidated} != ${active.get('Last validated implementation SHA')}`);
      }
      checkContinuity(stateFields, root, head, errors, warnings);
    }
    const currentSha = active.get('Last validated implementation SHA');
    if (head && currentSha) {
      const shaResult = classifySha(root, currentSha, head);
      if (shaResult.status === 'SYNCED') {
        console.log(`[agent-check] SHA SYNCED: ${currentSha}`);
      } else if (shaResult.status === 'CHECKPOINT_ADVANCE') {
        warnings.push(
          `CHECKPOINT_ADVANCE: validated implementation SHA ${currentSha} precedes live HEAD ${shaResult.head}; approved paths only: ${shaResult.paths.join(', ') || '(none)'}`
        );
      } else {
        const message = `${shaResult.classification ?? 'STALE_IMPLEMENTATION_BASELINE'} (STALE STATE): validated implementation SHA ${currentSha} vs live Git HEAD ${shaResult.head ?? '<unknown>'}; ${shaResult.reason}`;
        if (shaResult.classification === 'INVALID_IMPLEMENTATION_ROLE' || status === 'COMPLETE') errors.push(message);
        else warnings.push(message);
      }
    }
    scanForSecrets(root, [
      'AGENTS.md',
      '.agent/ACTIVE_TASK.md',
      '.agent/README.md',
      '.agent/PLANS.md',
      path.join(taskDirectory, 'SPEC.md'),
      path.join(taskDirectory, 'PLAN.md'),
      path.join(taskDirectory, 'STATE.md'),
      path.join(taskDirectory, 'REPORT.md'),
    ], errors);
  } else {
    scanForSecrets(root, ['AGENTS.md', '.agent/ACTIVE_TASK.md', '.agent/README.md', '.agent/PLANS.md'], errors);
  }

  return { errors, warnings };
}

function main() {
  let root;
  try {
    root = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[agent-check] ERROR: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
    return;
  }
  const result = validate(root);
  for (const warning of result.warnings) console.warn(`[agent-check] WARNING: ${warning}`);
  if (result.errors.length > 0) {
    for (const error of result.errors) console.error(`[agent-check] ERROR: ${error}`);
    console.error(`[agent-check] FAIL (${result.errors.length} error${result.errors.length === 1 ? '' : 's'})`);
    process.exitCode = 1;
    return;
  }
  console.log(`[agent-check] PASS${result.warnings.length > 0 ? ` with ${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'}` : ''}: ${root}`);
}

main();
