#!/usr/bin/env node

// Small, deterministic checker for Nightwatch's repository-native agent-state
// protocol. It reads local files and git HEAD only; it never starts a browser,
// opens a socket, or rewrites state.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildChildEnvironment } from './child-environment.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';
import {
  PROTOCOL_V2,
  validateTaskV2,
  inspectLegacyTask,
  parseMarkdownSections,
  sectionBodyText,
  parseKeyValuesWithLocations,
  normalizeTaskStatus,
  parseLegacyHistoricalDisposition,
  LEGACY_DISPOSITION_KEY,
  APPROVED_CHECKPOINT_PATHS,
  isApprovedCheckpointPath,
} from './agent-continuity-protocol.mjs';
import { inspectWorkspace } from './workspace-integrity.mjs';
import { validateProgrammeState } from './lib/programme-state.mjs';
import {
  inspectLedgerAgreement,
} from './lib/openspec-ledger.mjs';
import {
  collectRevisitDue,
  loadLaneState,
} from './lib/validation-lane-state.mjs';

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

// DEF-FC-04. The `## Routing and safety` block is what an agent reads to
// decide what it may write, and it is the one part of ACTIVE_TASK.md that a
// campaign-open commit historically left behind: identity fields are rewritten
// while the predecessor's authority prose survives verbatim. A checker cannot
// bind prose, so the block declares `CAMPAIGN` and `SESSION WORKTREE` and both
// are bound here to the active task's own identity.
//
// The session-worktree scan is occurrence-complete on purpose. A rule that
// accepts the document because one correct `session/...` mention exists would
// pass while another line still names a retired worktree — the exact shape
// that let this defect survive a whole campaign.
export function inspectActiveTaskRouting(activeText, taskId, stateBranch) {
  const errors = [];
  // Deliberately not parseMarkdownSections: that helper drops fenced lines,
  // and the routing directives belong inside the authority fence they govern.
  const body = extractSectionRaw(activeText, '## Routing and safety');
  if (body === null || body.trim() === '') {
    errors.push('ACTIVE_TASK_ROUTING_BLOCK_MISSING: no `## Routing and safety` section');
    return { errors, declaredCampaign: undefined, declaredWorktree: undefined };
  }

  const declaredCampaign = matchSingleDirective(body, 'CAMPAIGN', errors);
  const declaredWorktree = matchSingleDirective(body, 'SESSION WORKTREE', errors);

  if (declaredCampaign === undefined) {
    errors.push('ACTIVE_TASK_ROUTING_CAMPAIGN_MISSING: routing block declares no CAMPAIGN');
  } else if (taskId && declaredCampaign !== taskId) {
    errors.push(
      `ACTIVE_TASK_ROUTING_CAMPAIGN_DRIFT: routing block declares CAMPAIGN ${declaredCampaign} but the active task is ${taskId}`
    );
  }

  if (declaredWorktree === undefined) {
    errors.push('ACTIVE_TASK_ROUTING_SESSION_WORKTREE_MISSING: routing block declares no SESSION WORKTREE');
  } else if (stateBranch && declaredWorktree !== stateBranch) {
    errors.push(
      `ACTIVE_TASK_ROUTING_SESSION_WORKTREE_DRIFT: routing block declares SESSION WORKTREE ${declaredWorktree} but STATE.md records branch ${stateBranch}`
    );
  }

  if (declaredWorktree !== undefined) {
    const seen = new Set();
    for (const match of activeText.matchAll(/session\/[A-Za-z0-9._\/-]+/g)) {
      const occurrence = match[0].replace(/[.`,;:)]+$/, '');
      if (occurrence !== declaredWorktree) seen.add(occurrence);
    }
    for (const stray of [...seen].sort()) {
      errors.push(
        `ACTIVE_TASK_ROUTING_FOREIGN_WORKTREE_REFERENCE: ${stray} is named in ACTIVE_TASK.md but the declared SESSION WORKTREE is ${declaredWorktree}`
      );
    }
  }

  return { errors, declaredCampaign, declaredWorktree };
}

function extractSectionRaw(text, heading) {
  const lines = String(text ?? '').split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^##\s+/.test(line.trim()));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

function matchSingleDirective(body, name, errors) {
  const pattern = new RegExp(`^[ \\t]*${name}:[ \\t]*(\\S.*?)[ \\t]*$`, 'gm');
  const values = [...body.matchAll(pattern)].map((match) => match[1]);
  if (values.length === 0) return undefined;
  if (values.length > 1) {
    errors.push(`ACTIVE_TASK_ROUTING_DUPLICATE_DIRECTIVE: ${name} declared ${values.length} times`);
  }
  return values[0];
}

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

function formatProtocolDiagnostic(diagnostic) {
  const location = diagnostic.path === null || diagnostic.path === undefined ? '' : diagnostic.path;
  const line = diagnostic.line === null || diagnostic.line === undefined ? '' : `:${diagnostic.line}`;
  return `${diagnostic.code}${location ? `: ${location}${line}` : ''}${diagnostic.detail ? ` — ${diagnostic.detail}` : ''}`;
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

function parseKeyValueFile(text, scope = 'all') {
  const parsed = parseKeyValuesWithLocations(text);
  let minExclusive = 0;
  let maxInclusive = Number.POSITIVE_INFINITY;
  if (scope === 'identity') {
    const identity = parseMarkdownSections(text).sections.get('Identity');
    // Legacy v1 records do not all carry the v2 section shape. Preserve their
    // warning-only inspection; strict v2 validation still requires Identity.
    if (identity) {
      minExclusive = identity.start;
      maxInclusive = identity.end;
    }
  } else if (scope === 'preamble') {
    const starts = [...parseMarkdownSections(text).sections.values()].map((section) => section.start);
    maxInclusive = starts.length > 0 ? Math.min(...starts) - 1 : Number.POSITIVE_INFINITY;
  }
  const fields = new Map();
  for (const record of parsed.records) {
    if (record.line <= minExclusive || record.line > maxInclusive) continue;
    if (!fields.has(record.key)) fields.set(record.key, record.value);
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

// ---------------------------------------------------------------------------
// Git graph cache (performance-only; verdict semantics are preserved exactly).
//
// The checker historically spawned one short-lived git process per
// cat-file/merge-base query — measured at 880 spawns per run with ~94% of
// CPU time spent inside spawnSync. Repository history is tiny relative to
// that cost, so the complete object-type census plus the full commit-parent
// graph is loaded once per run and both queries are answered in memory with
// the same observable results as `cat-file -e <sha>^{commit}` and
// `merge-base --is-ancestor` (including tag peeling and missing-object
// behavior). Any failure while loading the graph leaves it `null` and every
// query falls back to the original per-call git spawns: the fallback can
// only cost time, never change a verdict.
// ---------------------------------------------------------------------------

let cachedGitGraph; // undefined = not yet attempted; null = unusable
let cachedGitGraphRoot; // the cache is valid only for this repository root

function normalizeSha(value) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function gitSpawn(root, args, extraOptions = {}) {
  return spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    env: buildChildEnvironment(process.env),
    timeout: 10_000,
    maxBuffer: 32 * 1024 * 1024,
    ...extraOptions,
  });
}

/** Peel `<sha>^{commit}` in memory: follow tag objects until a commit. */
function graphResolveCommit(graph, value) {
  let current = normalizeSha(value);
  for (let hops = 0; hops <= 16; hops += 1) {
    const type = graph.types.get(current);
    if (current === '' || type === undefined) return null;
    if (type === 'commit') return current;
    if (type !== 'tag') return null;
    const target = graph.tagTargets.get(current);
    if (target === undefined || target === current) return null;
    current = target;
  }
  return null;
}

/**
 * Parse `git cat-file --batch` output for a known set of requested objects.
 * Responses are matched to requests POSITIONALLY (the `--batch` contract);
 * the echoed OID is deliberately not used as a key because git strips a
 * leading zero when a full SHA starting with `0` is requested on stdin
 * (a request for `0abc…` is answered as `abc…`). Throws on malformed streams
 * so the caller falls back to spawned queries. Returns maps of commit
 * parents and tag targets keyed by the requested (lowercase) SHAs.
 */
function parseCatFileBatch(output, requested) {
  const parents = new Map();
  const tagTargets = new Map();
  let position = 0;
  for (let index = 0; index < requested.length; index += 1) {
    const requestedSha = requested[index];
    const headerEnd = output.indexOf('\n', position);
    if (headerEnd === -1) throw new Error('CAT_FILE_BATCH_TRUNCATED');
    const header = output.slice(position, headerEnd);
    const fields = header.split(' ');
    if (fields.length === 2 && fields[1] === 'missing') {
      position = headerEnd + 1;
      continue;
    }
    if (fields.length !== 3 || !CAT_FILE_TYPES.has(fields[1]) || !Number.isInteger(Number(fields[2])) || Number(fields[2]) < 0) {
      throw new Error('CAT_FILE_BATCH_MALFORMED_HEADER');
    }
    const type = fields[1];
    const size = Number(fields[2]);
    const contentStart = headerEnd + 1;
    const contentEnd = contentStart + size;
    if (output.length < contentEnd + 1) throw new Error('CAT_FILE_BATCH_TRUNCATED');
    const content = output.slice(contentStart, contentEnd);
    position = contentEnd + 1;
    if (type === 'commit') {
      const headerBlockEnd = content.indexOf('\n\n');
      const headerBlock = content.slice(0, headerBlockEnd === -1 ? content.length : headerBlockEnd);
      const commitParents = [];
      for (const line of headerBlock.split('\n')) {
        if (line.startsWith('parent ')) {
          const parent = normalizeSha(line.slice(7).trim());
          if (/^[0-9a-f]{40}$/.test(parent)) commitParents.push(parent);
        }
      }
      parents.set(requestedSha, commitParents);
    } else if (type === 'tag') {
      const objectLine = content.split('\n').find((line) => line.startsWith('object '));
      const target = normalizeSha((objectLine ?? '').slice(7).trim());
      if (/^[0-9a-f]{40}$/.test(target)) tagTargets.set(requestedSha, target);
    }
  }
  return { parents, tagTargets };
}

const CAT_FILE_TYPES = new Set(['commit', 'tag', 'tree', 'blob']);

function loadGitGraph(root) {
  if (cachedGitGraph !== undefined && cachedGitGraphRoot === root) return cachedGitGraph;
  try {
    const census = gitSpawn(root, ['cat-file', '--batch-all-objects', '--batch-check=%(objectname) %(objecttype)']);
    if (census.status !== 0 || typeof census.stdout !== 'string') throw new Error('GIT_OBJECT_CENSUS_UNAVAILABLE');
    const types = new Map();
    const wanted = [];
    for (const line of census.stdout.split('\n')) {
      const separator = line.indexOf(' ');
      if (separator === -1) continue;
      const sha = normalizeSha(line.slice(0, separator));
      const type = line.slice(separator + 1);
      if (!/^[0-9a-f]{40}$/.test(sha)) continue;
      types.set(sha, type);
      if (type === 'commit' || type === 'tag') wanted.push(sha);
    }
    const batch = gitSpawn(root, ['cat-file', '--batch'], { input: `${wanted.join('\n')}\n` });
    if (batch.status !== 0 || typeof batch.stdout !== 'string') throw new Error('GIT_COMMIT_GRAPH_UNAVAILABLE');
    const { parents, tagTargets } = parseCatFileBatch(batch.stdout, wanted);
    cachedGitGraph = Object.freeze({ types, parents, tagTargets });
    cachedGitGraphRoot = root;
  } catch {
    cachedGitGraph = null;
    cachedGitGraphRoot = root;
  }
  return cachedGitGraph;
}

function isCommitSpawned(root, sha) {
  return commandOutput(root, ['cat-file', '-e', `${sha}^{commit}`]) !== null;
}

function isAncestorSpawned(root, ancestor, descendant) {
  const result = spawnSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], {
    cwd: root,
    encoding: 'utf8',
    env: buildChildEnvironment(process.env),
    timeout: 10_000,
    maxBuffer: 256 * 1024,
  });
  return result.status === 0;
}

/** True iff `graph` contains a path from `descendant` back to `ancestor`. */
function graphIsAncestor(graph, ancestor, descendant) {
  const start = graphResolveCommit(graph, descendant);
  const target = graphResolveCommit(graph, ancestor);
  if (start === null || target === null) return false;
  if (start === target) return true;
  const queue = [start];
  const visited = new Set(queue);
  while (queue.length > 0) {
    const commit = queue.pop();
    for (const parent of graph.parents.get(commit) ?? []) {
      if (parent === target) return true;
      if (!visited.has(parent)) {
        visited.add(parent);
        queue.push(parent);
      }
    }
  }
  return false;
}

function isCommit(root, sha) {
  const graph = loadGitGraph(root);
  if (graph === null) return isCommitSpawned(root, sha);
  return graphResolveCommit(graph, sha) !== null;
}

function isAncestor(root, ancestor, descendant) {
  const graph = loadGitGraph(root);
  if (graph === null) return isAncestorSpawned(root, ancestor, descendant);
  return graphIsAncestor(graph, ancestor, descendant);
}

function committedChangedPaths(root, from, to) {
  const output = commandOutput(root, ['diff', '--name-only', '--no-renames', `${from}..${to}`]);
  if (output === null) return null;
  return output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).sort();
}

/**
 * Inspect only the paths directly changed by one claimed commit. A range
 * cannot prove the role of its tip: a real implementation followed by a
 * documentation commit would make the range look substantive. Merge commits
 * are deliberately ambiguous here because a combined diff cannot safely
 * attribute a path to the claimed checkpoint without choosing a parent.
 */
/** Spawned `rev-list --parents -n 1` parent inspection (fallback path). */
function commitParentsSpawned(root, commit) {
  const parentLine = commandOutput(root, ['rev-list', '--parents', '-n', '1', commit]);
  if (parentLine === null) return { status: 'UNKNOWN', paths: null, reason: 'unable to inspect commit parents' };
  const parentFields = parentLine.trim().split(/\s+/).filter(Boolean);
  if (parentFields[0]?.toLowerCase() !== commit.toLowerCase()) return { status: 'UNKNOWN', paths: null, reason: 'commit parent inspection returned an unexpected object' };
  return { status: 'PARENTS_KNOWN', parents: parentFields.slice(1) };
}

function committedPathsForCommit(root, commit) {
  if (!isCommit(root, commit)) return { status: 'UNKNOWN', paths: null, reason: 'commit does not identify a repository commit' };
  // Parent identity comes from the loaded graph when available; `rev-list
  // --parents -n 1` echoes the full requested SHA (unlike `cat-file --batch`
  // stdin responses), so the graph key — the normalized request itself — is
  // exactly equivalent for any commit that passed the isCommit gate above.
  const graph = loadGitGraph(root);
  const graphParents = graph?.parents.get(normalizeSha(commit));
  let parents;
  if (graphParents !== undefined) {
    parents = [...graphParents];
  } else {
    const inspected = commitParentsSpawned(root, commit);
    if (inspected.status !== 'PARENTS_KNOWN') return inspected;
    parents = inspected.parents;
  }
  if (parents.length > 1) return { status: 'AMBIGUOUS', paths: null, reason: 'merge commit role attribution is ambiguous' };
  const output = commandOutput(root, ['diff-tree', '--root', '--no-commit-id', '--name-only', '--no-renames', '-r', commit]);
  if (output === null) return { status: 'UNKNOWN', paths: null, reason: 'unable to inspect commit paths' };
  return {
    status: 'KNOWN',
    paths: output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).sort(),
    parents,
    reason: parents.length === 0 ? 'root commit paths inspected' : 'single-parent commit paths inspected',
  };
}

function classifyCommitRole(root, commit) {
  const inspected = committedPathsForCommit(root, commit);
  if (inspected.status !== 'KNOWN') return { ...inspected, role: 'AMBIGUOUS' };
  const paths = inspected.paths;
  if (paths.length === 0) return { ...inspected, role: 'DOCUMENTATION_ONLY', reason: 'commit changes no paths' };
  const substantivePaths = paths.filter((file) => !isApprovedCheckpointPath(file));
  return {
    ...inspected,
    role: substantivePaths.length === 0 ? 'DOCUMENTATION_ONLY' : 'IMPLEMENTATION',
    substantivePaths,
  };
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
  const startingOk = validateAnchor(root, starting, 'STATE STARTING_SHA', head, errors);
  if (!stateFields.has('LAST_SUBSTANTIVE_CHECKPOINT_SHA') && substantive) {
    warnings.push('LEGACY_CONTINUITY: LAST_SUBSTANTIVE_CHECKPOINT_SHA inferred from the validated implementation anchor');
  }

  const validSha = (value) => /^[0-9a-f]{40}$/i.test(value ?? '') && isCommit(root, value);
  if (validSha(validated) && validSha(starting) && !isAncestor(root, validated, starting) && !isAncestor(root, starting, validated)) {
    errors.push(`INVALID_IMPLEMENTATION_LINEAGE: validated implementation ${validated} and STARTING_SHA ${starting} are unrelated commits`);
  }

  if (validatedOk && substantiveOk && validated !== substantive) {
    const rolePaths = isAncestor(root, substantive, validated) ? committedChangedPaths(root, substantive, validated) : null;
    const docsOnly = rolePaths !== null && rolePaths.every((file) => isApprovedCheckpointPath(file));
    errors.push(
      docsOnly
        ? `INVALID_IMPLEMENTATION_ROLE: LAST_VALIDATED_IMPLEMENTATION_SHA ${validated} is a documentation-only descendant of substantive checkpoint ${substantive}`
        : `INVALID_IMPLEMENTATION_ROLE: LAST_VALIDATED_IMPLEMENTATION_SHA ${validated} must equal LAST_SUBSTANTIVE_CHECKPOINT_SHA ${substantive}`,
    );
  }

  if (validatedOk && substantiveOk && startingOk && validated === substantive) {
    // An anchor carried from before this task is historical implementation
    // truth. Only a different descendant of STARTING_SHA is a new claim whose
    // own commit role must be proven.
    if (isAncestor(root, validated, starting)) {
      // carried-forward implementation or validated == STARTING_SHA
    } else if (!isAncestor(root, starting, validated)) {
      errors.push(`INVALID_IMPLEMENTATION_LINEAGE: validated implementation ${validated} is neither an ancestor of STARTING_SHA ${starting} nor a descendant of it`);
    } else {
      const role = classifyCommitRole(root, validated);
      if (role.role === 'DOCUMENTATION_ONLY') {
        errors.push(`INVALID_IMPLEMENTATION_ROLE: claimed implementation checkpoint ${validated} is documentation-only in its own commit; changing labels cannot create implementation truth`);
      } else if (role.role === 'AMBIGUOUS') {
        errors.push(`INVALID_IMPLEMENTATION_ROLE: unable to prove the claimed implementation checkpoint ${validated} role: ${role.reason}`);
      }
    }
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
  const liveRemoteHead = liveOriginMainHead(root);
  if (head) console.log(`[agent-check] LIVE GIT HEAD: ${head}${liveRemoteHead ? `; LIVE origin/main: ${liveRemoteHead}` : ''}`);
}

// checkContinuity runs once per task record; the remote head cannot change
// within a single read-only checker process, so the first answer per root is
// cached.
const cachedOriginMainHeads = new Map();
function liveOriginMainHead(root) {
  if (!cachedOriginMainHeads.has(root)) {
    cachedOriginMainHeads.set(root, commandOutput(root, ['rev-parse', 'origin/main'])?.trim() ?? null);
  }
  return cachedOriginMainHeads.get(root) ?? null;
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

// The approved-checkpoint allowlist lives in the shared, side-effect-free
// continuity protocol module so other read-only validators can consume it
// WITHOUT importing this CLI, whose top-level code writes to stdout.
export { APPROVED_CHECKPOINT_PATHS, isApprovedCheckpointPath };


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

/**
 * History audit of every `.agent/tasks/<dir>`.
 * - v2 tasks (STATE declares nightwatch.agent-continuity.v2) are strictly
 *   validated (semantics + Git continuity anchors); any error is fatal.
 * - legacy v1 tasks are structurally inspected; warnings only.
 * - task-directory symlinks are rejected/skipped (no traversal outside
 *   `.agent/tasks`).
 * Read-only: never writes, never follows symlinks.
 */
function auditTaskHistory(root, head, auditMode, errors, warnings, skipDirectory) {
  const stats = { total: 0, strictV2: 0, legacyV1: 0, legacyDeclared: 0, legacyUndeclared: 0, strictErrors: 0, legacyWarnings: 0 };
  const tasksRoot = path.join(root, '.agent', 'tasks');
  let entries = [];
  try {
    entries = fs.readdirSync(tasksRoot, { withFileTypes: true });
  } catch {
    return stats;
  }
  for (const entry of entries) {
    if (skipDirectory && entry.name === skipDirectory) continue;
    const dirPath = path.join(tasksRoot, entry.name);
    let lstat;
    try {
      lstat = fs.lstatSync(dirPath);
    } catch {
      continue;
    }
    if (lstat.isSymbolicLink()) {
      stats.legacyWarnings += 1;
      warnings.push(`TASK_DIRECTORY_SYMLINK_REJECTED: .agent/tasks/${entry.name}`);
      if (auditMode) console.log(`[agent-audit] ${entry.name} protocol=SYMLINK_REJECTED`);
      continue;
    }
    if (!lstat.isDirectory()) continue;
    stats.total += 1;
    const readTaskFile = (file) => {
      try {
        return fs.readFileSync(path.join(dirPath, file), 'utf8');
      } catch {
        return null;
      }
    };
    const specText = readTaskFile('SPEC.md');
    const planText = readTaskFile('PLAN.md');
    const stateText = readTaskFile('STATE.md');
    const reportText = readTaskFile('REPORT.md');
    // Continuity anchors may be carried by older v2-compatible fixtures at a
    // later legacy location; strict validateTaskV2 still binds state identity,
    // while the graph checker must not silently skip a stale anchor.
    const stateFields = stateText !== null ? parseKeyValueFile(stateText) : new Map();
    const taskId = stateFields.get('Task ID') ?? entry.name;
    const taskStatus = stateFields.get('Status') ?? 'UNKNOWN';
    const protocol = stateFields.get('CONTINUITY_PROTOCOL_VERSION');
    const isV2 = protocol === PROTOCOL_V2;
    const taskErrors = [];
    const taskWarnings = [];
    const taskNotes = [];

    if (isV2 && stateText !== null) {
      stats.strictV2 += 1;
      const result = validateTaskV2(
        {
          dir: entry.name,
          stateText,
          statePath: `.agent/tasks/${entry.name}/STATE.md`,
          planText,
          planPath: `.agent/tasks/${entry.name}/PLAN.md`,
          reportText,
          reportPath: `.agent/tasks/${entry.name}/REPORT.md`,
        },
        { bindActive: false }
      );
      taskErrors.push(...result.errors.map(formatProtocolDiagnostic));
      if (head) {
        const continuityErrors = [];
        const continuityWarnings = [];
        checkContinuity(stateFields, root, head, continuityErrors, continuityWarnings);
        taskErrors.push(...continuityErrors);
        taskWarnings.push(...continuityWarnings);
      }
      if (taskId !== entry.name) {
        taskErrors.push(`TASK_ID_MISMATCH: .agent/tasks/${entry.name}/STATE.md — STATE task id ${taskId} != directory ${entry.name}`);
      }
      if (specText === null) taskWarnings.push(`LEGACY_TASK_MISSING_SPEC: .agent/tasks/${entry.name} (v2 task without SPEC.md)`);
    } else {
      stats.legacyV1 += 1;
      // F-07: a legacy record that declares itself PERMANENTLY_HISTORICAL with
      // a reason is excluded from the warning count while staying readable.
      // Safety-relevant legacy findings below are never suppressed by a
      // declaration: the disposition covers protocol migration, not evidence.
      const historicalReason = parseLegacyHistoricalDisposition(stateFields.get(LEGACY_DISPOSITION_KEY));
      if (historicalReason !== null) {
        stats.legacyDeclared += 1;
        taskNotes.push(`LEGACY_TASK_DECLARED_PERMANENTLY_HISTORICAL: .agent/tasks/${entry.name} — ${historicalReason}`);
      } else {
        stats.legacyUndeclared += 1;
        taskWarnings.push(`LEGACY_TASK_NOT_STRICTLY_VALIDATED: .agent/tasks/${entry.name}`);
      }
      if (stateText !== null) {
        const sections = parseMarkdownSections(stateText).sections;
        const nextAction = sectionBodyText(sections.get('Exact Next Action'));
        const findings = inspectLegacyTask(
          { reportText, stateNextAction: nextAction, statePath: `.agent/tasks/${entry.name}/STATE.md` },
          taskStatus
        );
        for (const finding of findings) {
          taskWarnings.push(`LEGACY_HIGH_SEVERITY_CONTINUITY_FINDING: ${formatProtocolDiagnostic(finding)}`);
        }
      }
    }
    // W7 durable programme-state integrity. Every discovered PROGRAMME.json is
    // validated from its raw bytes: the duplicate-key scan runs before
    // JSON.parse so a repeated lane key cannot silently discard a historical
    // record again. Read-only: bytes are inspected, never rewritten; malformed
    // documents are errors, never crashes or silent skips.
    const programmeRaw = readTaskFile('PROGRAMME.json');
    if (programmeRaw !== null) {
      let programmeResult = null;
      try {
        programmeResult = validateProgrammeState(programmeRaw);
      } catch (error) {
        programmeResult = null;
        const detail = error instanceof Error ? error.message : String(error);
        taskErrors.push(
          `PROGRAMME_STATE_VALIDATOR_FAILED: .agent/tasks/${entry.name}/PROGRAMME.json — ${detail.replace(/[\0-\x1F\x7F]+/g, '?').slice(0, 120)}`
        );
      }
      if (programmeResult !== null && !programmeResult.ok) {
        for (const programmeDiagnostic of programmeResult.errors) {
          taskErrors.push(`PROGRAMME_STATE_INVALID: .agent/tasks/${entry.name}/PROGRAMME.json — ${programmeDiagnostic}`);
        }
      }
    }

    stats.strictErrors += taskErrors.length;
    // legacy_warnings counts warnings from LEGACY records only. A v2 record's
    // inferred-anchor advisory is not a legacy warning and must not inflate it.
    if (!isV2) stats.legacyWarnings += taskWarnings.length;
    if (auditMode) {
      const protocolLabel = isV2 ? PROTOCOL_V2 : 'LEGACY_V1';
      console.log(
        `[agent-audit] ${entry.name} protocol=${protocolLabel} status=${taskStatus} strict=${isV2 ? 'true' : 'false'} errors=${taskErrors.length} warnings=${taskWarnings.length}`
      );
      for (const taskError of taskErrors) console.log(`[agent-audit]   ERROR: ${taskError}`);
      for (const taskNote of taskNotes) console.log(`[agent-audit]   HISTORICAL: ${taskNote}`);
      for (const taskWarning of taskWarnings) console.log(`[agent-audit]   WARNING: ${taskWarning}`);
    }
    errors.push(...taskErrors);
    // In default check mode, per-task legacy warnings stay summarized; only
    // safety-relevant findings are surfaced individually. In audit mode the
    // per-task lines above are the record; do not duplicate them globally.
    if (!auditMode) {
      for (const taskWarning of taskWarnings) {
        if (taskWarning.startsWith('TASK_DIRECTORY_SYMLINK_REJECTED') || taskWarning.startsWith('LEGACY_HIGH_SEVERITY_CONTINUITY_FINDING')) {
          warnings.push(taskWarning);
        }
      }
    }
  }
  return stats;
}

export function validate(root, auditMode = false) {
  const errors = [];
  const warnings = [];
  const activeText = readFile(root, '.agent/ACTIVE_TASK.md', errors);
  readFile(root, 'AGENTS.md', errors);
  if (activeText === null) return { errors, warnings };

  const active = parseKeyValueFile(activeText, 'preamble');
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
    for (const routingError of inspectActiveTaskRouting(activeText, taskId, stateFields.get('Branch')).errors) {
      errors.push(routingError);
    }
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
      if (stateFields.get('Starting SHA') && active.get('Starting SHA') && stateFields.get('Starting SHA') !== active.get('Starting SHA')) {
        errors.push(`STATE/ACTIVE_TASK starting anchors differ: ${stateFields.get('Starting SHA')} != ${active.get('Starting SHA')}`);
      }
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
    // Phase 8B.1.0.2 — protocol v2 strict validation of the ACTIVE task.
    if (status && status !== 'NONE' && state) {
      const planText = taskTexts.get('PLAN.md');
      const reportText = taskTexts.get('REPORT.md');
      const activeTextForProtocol = activeText;
      const task = {
        dir: taskDirectory,
        stateText: state,
        statePath: path.join(taskDirectory, 'STATE.md'),
        planText: planText ?? null,
        planPath: path.join(taskDirectory, 'PLAN.md'),
        reportText: reportText ?? null,
        reportPath: path.join(taskDirectory, 'REPORT.md'),
        activeText: activeTextForProtocol,
        activePath: '.agent/ACTIVE_TASK.md',
      };
      const protocolResult = validateTaskV2(task, { bindActive: true });
      for (const diagnostic of protocolResult.errors) {
        errors.push(formatProtocolDiagnostic(diagnostic));
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

  // Phase 8B.1.0.2 — history audit of every task directory (v2 strict,
  // legacy summarized). Runs in both agent:check and --audit-history.
  // The ACTIVE task directory is included; identical diagnostics produced by
  // both the bindActive layer and the audit are deduplicated at return.
  const auditHead = gitHead(root, errors);
  const auditStats = auditTaskHistory(root, auditHead, auditMode, errors, warnings, null);
  console.log(
    `[agent-audit] tasks=${auditStats.total} strict_v2=${auditStats.strictV2} legacy_v1=${auditStats.legacyV1} legacy_declared=${auditStats.legacyDeclared} legacy_undeclared=${auditStats.legacyUndeclared} strict_errors=${auditStats.strictErrors} legacy_warnings=${auditStats.legacyWarnings}`
  );
  if (auditStats.legacyUndeclared > 0) {
    warnings.push(
      `LEGACY_TASK_NOT_STRICTLY_VALIDATED: ${auditStats.legacyUndeclared} legacy v1 task(s) are undeclared historical records; declare each PERMANENTLY_HISTORICAL with a reason or migrate it (agent:audit --audit-history for detail)`
    );
  }

  // F-01 completion-ledger truth: a terminal task must not leave unchecked
  // non-declared boxes, and change/task orphans are named rather than skipped.
  const ledger = inspectLedgerAgreement(root);
  errors.push(...ledger.errors);
  warnings.push(...ledger.warnings);
  for (const line of ledger.info) console.log(`[agent-ledger] ${line}`);

  // F-02 lane state: a lane record whose revisit date has passed is reported
  // as due; the record itself is never rewritten here.
  const laneState = loadLaneState(root);
  if (laneState.ok) {
    const today = new Date().toISOString().slice(0, 10);
    for (const due of collectRevisitDue(laneState.lanes, today)) {
      warnings.push(`VALIDATION_LANE_REVISIT_DUE: ${due.laneId} revisit ${due.revisitDate}`);
    }
  }

  // F-11 dependency review dates: a review whose interval has elapsed is
  // reported as due; the record itself is never rewritten here. The pure
  // evaluator in src/core/dependencyCurrency is the project:check authority;
  // this surface reads the same record's dates without loading TypeScript, so
  // `agent:check` stays dependency-light.
  try {
    const record = JSON.parse(fs.readFileSync(path.join(root, 'config', 'dependency-currency.v1.json'), 'utf8'));
    const today = new Date().toISOString().slice(0, 10);
    const reportDue = (id, reviewDate, intervalDays, condition) => {
      if (typeof reviewDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(reviewDate) || !Number.isInteger(intervalDays)) return;
      const due = new Date(Date.UTC(...reviewDate.split('-').map((part) => Number(part))));
      due.setUTCDate(due.getUTCDate() + intervalDays);
      const dueIso = due.toISOString().slice(0, 10);
      if (dueIso < today) {
        warnings.push(`DEPENDENCY_REVIEW_DUE: ${id} due ${dueIso} (reviewed ${reviewDate} + ${intervalDays}d); ${condition}`);
      }
    };
    reportDue('vue-review', record.vueReview?.reviewDate, record.vueReview?.reviewIntervalDays, 'Vue 2.6.12 fixture review conditions');
    reportDue('lockfile-verification', record.lockfileVerification?.date, record.lockfileVerification?.intervalDays, 'disposable npm ci --offline lockfile verification');
  } catch {
    // A missing or malformed record fails project:check; agent:check reports
    // only what it can read.
  }

  // C-00 — repository-global workspace/session integrity. Worktrees isolate
  // HEAD/index/checkout, but info/exclude and hooks are shared, so isolation
  // alone is insufficient. Unknown ownership fails closed.
  const workspace = inspectWorkspace({ root });
  if (workspace.verdict === 'FAIL') {
    for (const violation of workspace.errors) {
      errors.push(`${violation.code}: ${violation.detail}`);
    }
  }
  for (const advisory of workspace.warnings) {
    warnings.push(`${advisory.code}: ${advisory.detail}`);
  }
  // F-07: a claim naming a terminal or unresolvable task is attention, not
  // failure. It is surfaced here with its owner action and never acted on.
  for (const finding of workspace.claimFindings ?? []) {
    warnings.push(`${finding.code}: ${finding.detail} — owner action: ${finding.ownerAction}`);
  }

  return { errors: [...new Set(errors)], warnings };
}

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'agent-state',
  entry: 'bin/agent-state.mjs',
  purpose: 'Validate the active task and history continuity records under the v2 protocol.',
  group: 'validate',
  flags: [
    { name: '--audit-history', shape: 'boolean', summary: 'report the full history inventory' },
    { name: '--root', shape: 'path', summary: 'validate a different repository root' },
  ],
  authorization: 'LOCAL_ONLY',
  artifacts: [],
};

function main() {
  const cli = defineOperatorCli(CLI_METADATA);
  if (cli.stop) return;
  let root;
  const auditMode = process.argv.includes('--audit-history');
  try {
    root = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[agent-check] ERROR: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
    return;
  }
  const result = validate(root, auditMode);
  for (const warning of result.warnings) console.warn(`[agent-check] WARNING: ${warning}`);
  if (result.errors.length > 0) {
    for (const error of result.errors) console.error(`[agent-check] ERROR: ${error}`);
    console.error(`[agent-check] FAIL (${result.errors.length} error${result.errors.length === 1 ? '' : 's'})`);
    process.exitCode = 1;
    return;
  }
  console.log(`[agent-check] PASS${result.warnings.length > 0 ? ` with ${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'}` : ''}: ${root}`);
}

if (typeof process.argv[1] === 'string' && path.basename(process.argv[1]) === 'agent-state.mjs') main();
