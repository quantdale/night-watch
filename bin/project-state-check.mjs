#!/usr/bin/env node
/**
 * Phase 8B.1-R1.1 — read-only Nightwatch project-state truth check
 * (`nightwatch.project-state.v2`).
 *
 * Answers: "Do CURRENT project-level facts agree with mechanically derivable
 * source and authority?" It is deliberately NARROW: it validates a structured
 * truth block in docs/CURRENT_STATE.md against facts computed from trusted
 * code (the real adopted-case validator/renderer and the real portfolio
 * selector) plus repository authority markers. It never parses arbitrary
 * prose, never re-implements selfDev/portfolio semantics, and never becomes
 * its own authority.
 *
 * This is a separate authority boundary from `nightwatch.agent-continuity.v2`
 * (which answers "is THIS TASK internally recoverable and truthful?").
 * Project-state v2 assumes continuity v2 passes for the active task and
 * verifies that itself by running `bin/agent-state.mjs` as a read-only
 * subprocess.
 *
 * The check performs ZERO writes: no filesystem mutation, no Git mutation,
 * no network, no model, no DB/infrastructure, no external calls. It only
 * reads files and runs read-only Git commands.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from './lib/typescript-runtime-loader.mjs';
import {
  findDuplicateFields,
  fieldValue,
  fieldValueInLineRange,
  isTerminalNextActionText,
  normalizeProjectVerdictEffect,
  normalizeTaskStatus,
  parseMarkdownSections,
  parseKeyValuesWithLocations,
  // The approved-checkpoint allowlist. Imported from the shared protocol
  // module rather than from bin/agent-state.mjs, whose top-level CLI code
  // writes to stdout and would corrupt this checker's JSON receipt.
  isApprovedCheckpointPath,
} from './agent-continuity-protocol.mjs';
// The handoff header is owned by the handoff protocol module, so its
// planning-only status and predecessor fields are read through that module
// rather than re-derived here. It is a pure parser: no fs, no child
// process, no network.
import { HANDOFF_PLANNING_ONLY_STATUS, parseHandoffHeader } from './planner-handoff-protocol.mjs';
// F-02's lane record and the operator CLI listing are the checks behind two
// advance conditions. Both are imported from their own modules rather than
// re-derived here, so a lane-state or listing change cannot leave the
// certification judging a stale copy.
import {
  collectRevisitDue,
  loadLaneState,
  reportLaneState,
  validateLaneState,
} from './lib/validation-lane-state.mjs';
import { operatorCommandListing } from './lib/operator-command-listing.mjs';

const PROJECT_STATE_PROTOCOL_VERSION = 'nightwatch.project-state.v2';
const BLOCK_SECTION_HEADING = '## Project-state v2 (machine-checked truth block)';
const LIVE_STATE_BLOCK_HEADING = '## Live-state v2 (machine-checked cross-check)';
const OWNED_PROJECT_STATE_FIELDS = new Set([
  'PROJECT_STATE_PROTOCOL_VERSION',
  'RELEASE_CERTIFICATION_PROTOCOL_VERSION',
  'PROJECT_COMPLETION_STATUS',
  'RELEASE_CHECKPOINT_SHA',
  'LIVE_HEAD_SHA',
  'LAST_SUBSTANTIVE_IMPLEMENTATION_SHA',
  'LAST_LOCALLY_VALIDATED_SHA',
  'LAST_CLEAN_VALIDATED_SHA',
  'CI_OBSERVED_SHA',
  'CI_EXECUTED_SHA',
  'CI_STATUS',
  'FINAL_DOCUMENTATION_SHA',
  'FINAL_CI_AUTHORITY',
  'LIVE_HEAD_AUTHORITY',
  'CURRENT_TASK_AUTHORITY',
  'VALIDATED_IMPLEMENTATION_AUTHORITY',
  'CANONICAL_CATALOG_TARGET',
  'CANONICAL_CATALOG_ENTRY_COUNT',
  'CANONICAL_CATALOG_SHA256',
  'CANONICAL_CATALOG_STRATEGY',
  'PHASE_8_STATUS',
  'PHASE_8B_1_STATUS',
  'NEXT_PORTFOLIO_MEMBER',
  'PROMOTION_AUTHORIZATION_LIFECYCLE',
  'EFFECTIVE_NEXT_PROMOTION_AUTHORITY',
]);
const OWNED_LIVE_STATE_FIELDS = new Set([
  'LIVE_STATE_PROTOCOL_VERSION',
  'LIVE_TASK_ID',
  'LIVE_PHASE',
  'LIVE_TASK_STATUS',
  'LIVE_PROJECT_COMPLETION_STATUS',
  'LIVE_PROJECT_VERDICT_EFFECT',
  'LIVE_NEXT_ACTION_STATE',
  'LIVE_COMPLETION_CLAIM',
]);
const FORBIDDEN_IMPLEMENTATION_AUTHORITY_FIELDS = new Set([
  'LAST_VALIDATED_IMPLEMENTATION_SHA',
  'CURRENT_SHA',
  'FINAL_SHA',
  'CURRENT_LOCAL_HEAD',
  'CURRENT_REMOTE_HEAD',
  'LAST_PUSHED_SHA',
]);
const FORBIDDEN_DOCUMENTATION_AUTHORITY_FIELDS = new Set(['LAST_DOCUMENTATION_CHECKPOINT_SHA']);
const R1_TASK_STATE_PATH = '.agent/tasks/phase-8b-1-r1-owner-gated-canonical-promotion-retry/STATE.md';
const MAX_CURRENT_STATE_BYTES = 512 * 1024;
const MAX_BLOCK_LINE_CHARS = 1024;
const RELEASE_CERTIFICATION_PROTOCOL = 'nightwatch.release-certification.v1';
const PROJECT_COMPLETION_STATUSES = new Set([
  'NONE',
  'IN_PROGRESS',
  'PROJECT_NOT_COMPLETE_BLOCKED',
  'PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED',
  'PROJECT_COMPLETE_AND_CI_CERTIFIED',
  'IMPLEMENTATION_COMPLETE_OPERATIONAL_ACCEPTANCE_PENDING',
  'OPERATIONALLY_ACCEPTED',
  'REAL_SYSTEM_EXECUTION_VERIFIED_EFFICACY_UNPROVEN',
  'OPERATIONAL_ACCEPTANCE_BLOCKED',
  'OPERATIONAL_ACCEPTANCE_FAILED',
]);
const COMPLETION_BY_ACTIVE_STATUS = new Map([
  ['IN_PROGRESS', new Set(['IN_PROGRESS', 'IMPLEMENTATION_COMPLETE_OPERATIONAL_ACCEPTANCE_PENDING'])],
  ['BLOCKED', new Set(['PROJECT_NOT_COMPLETE_BLOCKED', 'OPERATIONAL_ACCEPTANCE_BLOCKED'])],
  ['COMPLETE', new Set([
    'PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED',
    'PROJECT_COMPLETE_AND_CI_CERTIFIED',
    'OPERATIONALLY_ACCEPTED',
    'REAL_SYSTEM_EXECUTION_VERIFIED_EFFICACY_UNPROVEN',
    'OPERATIONAL_ACCEPTANCE_FAILED',
  ])],
  ['NONE', new Set(['NONE'])],
]);
const CI_STATUSES = new Set(['NOT_OBSERVED', 'NO_STEPS_EXTERNAL_NON_EVIDENCE', 'EXECUTED_PASS', 'EXECUTED_FAIL']);
const SHA_OR_DISCOVER = /^(?:DISCOVER_FROM_GIT|[0-9a-f]{40})$/i;
const SHA_OR_NONE = /^(?:NONE|[0-9a-f]{40})$/i;

function parseArgs(argv) {
  const rootIndex = argv.indexOf('--root');
  if (rootIndex !== -1) {
    const supplied = argv[rootIndex + 1];
    if (!supplied || supplied.startsWith('--')) throw new Error('PROJECT_STATE_USAGE_INVALID: --root requires a directory');
    return path.resolve(supplied);
  }
  return process.cwd();
}

function fail(errors, code) {
  errors.push(code);
}

function gitEnv(root = process.cwd()) {
  return {
    PATH: '/usr/bin:/bin',
    HOME: root,
    GIT_CONFIG_GLOBAL: '/dev/null',
    LANG: 'C',
    LC_ALL: 'C',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_CONFIG_NOSYSTEM: '1',
  };
}

function gitReadOnly(root, args) {
  const result = spawnSync('git', args, {
    cwd: root,
    env: gitEnv(root),
    shell: false,
    encoding: 'utf8',
    timeout: 5_000,
    maxBuffer: 512 * 1024,
  });
  if (result.status !== 0) return null;
  return result.stdout ?? '';
}

function loadTypeScriptModule(root, file) {
  return loadRuntimeTypeScriptModule(file, { root });
}

function parseKeyValueBlock(text, heading = BLOCK_SECTION_HEADING, ownedFields = OWNED_PROJECT_STATE_FIELDS) {
  const fields = new Map();
  const lines = [];
  const duplicates = [];
  const unknown = [];
  if (text.length > MAX_CURRENT_STATE_BYTES) return { malformed: true, oversized: true, fields: null, lines, duplicates, unknown };
  const start = text.indexOf(heading);
  if (start === -1) return null;
  const fenceStart = text.indexOf('\n```', start);
  if (fenceStart === -1) return null;
  const afterFence = text.indexOf('\n', fenceStart + 1);
  const fenceEnd = text.indexOf('\n```', afterFence + 1);
  if (fenceEnd === -1) return null;
  const block = text.slice(afterFence + 1, fenceEnd);
  for (const line of block.split(/\r?\n/)) {
    if (line.trim() === '') continue;
    if (line.length > MAX_BLOCK_LINE_CHARS) return { malformed: true, oversized: true, fields: null, lines, duplicates, unknown };
    const match = /^(?<key>[^:#][^:]*):\s*(?<value>.*)$/.exec(line);
    if (!match?.groups) return { malformed: true, fields: null, lines };
    const key = match.groups.key.trim();
    if (fields.has(key)) duplicates.push(key);
    if (!ownedFields.has(key)) unknown.push(key);
    if (key.length > MAX_BLOCK_LINE_CHARS || match.groups.value.length > MAX_BLOCK_LINE_CHARS) {
      return { malformed: true, oversized: true, fields: null, lines, duplicates, unknown };
    }
    if (fields.has(key)) continue;
    fields.set(key, match.groups.value.trim());
    lines.push(key);
  }
  return { malformed: false, oversized: false, fields, lines, duplicates, unknown };
}

function readActiveContinuity(root) {
  try {
    const active = fs.readFileSync(path.join(root, '.agent/ACTIVE_TASK.md'), 'utf8');
    const parsed = parseKeyValuesWithLocations(active);
    const starts = [...parseMarkdownSections(active).sections.values()].map((section) => section.start);
    const preambleEnd = starts.length > 0 ? Math.min(...starts) - 1 : Number.POSITIVE_INFINITY;
    const metadataValue = (key) => fieldValueInLineRange(parsed, key, 0, preambleEnd);
    return {
      parsed,
      status: normalizeTaskStatus(metadataValue('Status')),
      effect: metadataValue('PROJECT_VERDICT_EFFECT'),
      taskId: metadataValue('Task ID'),
      phase: metadataValue('Phase'),
      nextAction: metadataValue('Next action'),
      // C-10.5 A10: ACTIVE_TASK is already declared
      // VALIDATED_IMPLEMENTATION_AUTHORITY, so its validated-implementation
      // anchor is the authority the project baseline is checked against.
      // Both spellings are accepted. The uppercase continuity field is
      // canonical, but ACTIVE_TASK.md has long carried the prose-style
      // metadata line too, and a validator that reads only one spelling would
      // silently not fire on the other — which is how a staleness check
      // becomes decorative.
      validatedImplementationSha: metadataValue('LAST_VALIDATED_IMPLEMENTATION_SHA')
        ?? metadataValue('Last validated implementation SHA'),
      substantiveCheckpointSha: metadataValue('LAST_SUBSTANTIVE_CHECKPOINT_SHA')
        ?? metadataValue('Last substantive checkpoint SHA'),
    };
  } catch {
    return { parsed: null, status: null, effect: undefined, taskId: undefined, phase: undefined, nextAction: undefined, validatedImplementationSha: undefined, substantiveCheckpointSha: undefined };
  }
}

// ---------------------------------------------------------------------------
// F-12 — release certification (`nightwatch.release-certification.v1`).
//
// The definition lives in config/release-certification.v1.json and the pure
// judgement lives in src/core/releaseCertification/index.ts. This block is the
// only I/O: it gathers each condition's output from the check that owns it,
// then binds and evaluates. It performs zero writes and only read-only Git
// commands.
// ---------------------------------------------------------------------------
const RELEASE_DEFINITION_PATH = 'config/release-certification.v1.json';
const RULE_QUANTIFIERS = new Set(['TOTALITY', 'EXISTENCE']);
const ZERO_LANE_COUNTS = Object.freeze({ proven: 0, externallyBlocked: 0, neverAttempted: 0, staleEvidence: 0 });
const HEX40 = /^[0-9a-f]{40}$/i;

function readJsonAt(root, relative) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
  } catch {
    return null;
  }
}

function probeLaneState(root, substantiveSha, isAncestor, today) {
  const loaded = loadLaneState(root);
  if (!loaded.ok) {
    return {
      output: { state: 'UNAVAILABLE_CAPABILITY', detail: loaded.errors.map((entry) => entry.code).join(',') || 'lane state unreadable' },
      counts: { ...ZERO_LANE_COUNTS },
    };
  }
  const universe = readJsonAt(root, 'config/validation-universe.v1.json');
  const classes = universe !== null && universe.classes !== null && typeof universe.classes === 'object'
    ? Object.keys(universe.classes)
    : [];
  const errors = validateLaneState(loaded.lanes, classes);
  const reported = reportLaneState(loaded.lanes, substantiveSha, isAncestor);
  const due = collectRevisitDue(loaded.lanes, today);
  const counts = { proven: 0, externallyBlocked: 0, neverAttempted: 0, staleEvidence: 0 };
  for (const lane of reported) {
    if (lane.reportedClass === 'PROVEN') counts.proven += 1;
    else if (lane.reportedClass === 'PROVEN (STALE_EVIDENCE)') counts.staleEvidence += 1;
    else if (lane.reportedClass === 'BLOCKED_EXTERNAL') counts.externallyBlocked += 1;
    else if (lane.reportedClass === 'UNAVAILABLE_CAPABILITY') counts.neverAttempted += 1;
  }
  const findings = [
    ...errors.map((entry) => `${entry.code}:${entry.detail}`),
    ...due.map((entry) => `REVISIT_DUE:${entry.laneId}@${entry.revisitDate}`),
    ...reported.filter((lane) => lane.staleEvidence).map((lane) => `STALE_EVIDENCE:${lane.laneId}`),
  ];
  return {
    output: findings.length === 0
      ? { state: 'MET', detail: `${reported.length} lanes; proven=${counts.proven} stale=${counts.staleEvidence} blocked=${counts.externallyBlocked} never=${counts.neverAttempted}` }
      : { state: 'UNMET', detail: findings.join('; ') },
    counts,
  };
}

function probeCiBlockRecord(blockFields) {
  const status = blockFields.get('CI_STATUS');
  const observed = blockFields.get('CI_OBSERVED_SHA') ?? 'NONE';
  const executed = blockFields.get('CI_EXECUTED_SHA') ?? 'NONE';
  const checkpoint = blockFields.get('LAST_SUBSTANTIVE_IMPLEMENTATION_SHA') ?? 'NONE';
  if (status === 'EXECUTED_PASS' && HEX40.test(executed) && executed === checkpoint) {
    return { state: 'MET', detail: `exact-head CI executed PASS at ${executed}` };
  }
  return {
    state: 'UNMET',
    detail: `CI_STATUS=${status ?? 'ABSENT'} CI_OBSERVED_SHA=${observed} CI_EXECUTED_SHA=${executed} at checkpoint ${checkpoint}`,
  };
}

function probeLedgerAgreement(agentText) {
  const audit = /\[agent-audit\]\s+tasks=(\d+)\s+strict_v2=(\d+)\s+legacy_v1=(\d+)\s+legacy_declared=(\d+)\s+legacy_undeclared=(\d+)\s+strict_errors=(\d+)/.exec(agentText);
  if (audit === null) return { state: 'UNAVAILABLE_CAPABILITY', detail: 'agent-state ledger audit line not found' };
  const ledgerErrors = [...agentText.matchAll(/\[agent-check\]\s+ERROR:\s+(LEDGER_[A-Z0-9_]+)/g)].map((match) => match[1]);
  const strictErrors = Number(audit[6]);
  const legacyUndeclared = Number(audit[5]);
  if (ledgerErrors.length === 0 && strictErrors === 0 && legacyUndeclared === 0) {
    return { state: 'MET', detail: `strict_errors=0 legacy_undeclared=0 ledger_errors=0 tasks=${audit[1]}` };
  }
  return {
    state: 'UNMET',
    detail: `ledger_errors=${ledgerErrors.join(',') || 'none'} strict_errors=${strictErrors} legacy_undeclared=${legacyUndeclared}`,
  };
}

function probeOperatorCli(root) {
  let listing;
  try {
    listing = operatorCommandListing(root);
  } catch {
    return { state: 'UNAVAILABLE_CAPABILITY', detail: 'operator command listing failed' };
  }
  const bins = listing.bins.length;
  const undeclared = listing.entries.filter((entry) => !entry.declared).length;
  const declaredBroken = listing.entries.filter((entry) => entry.declared && entry.error !== null).length;
  const conforming = listing.entries.filter((entry) => entry.metadata !== null && entry.error === null).length;
  if (bins > 0 && undeclared === 0 && declaredBroken === 0) {
    return { state: 'MET', detail: `discovered=${bins} conforming=${conforming}` };
  }
  return { state: 'UNMET', detail: `discovered=${bins} conforming=${conforming} undeclared=${undeclared} declaredBroken=${declaredBroken}` };
}

function probeDocumentationCurrency(root, ruleNames) {
  const required = ['checkDocumentRoleCurrency', 'checkAppendOnlyArchives', 'checkGovernedStatusWords'];
  if (ruleNames !== null && !required.every((name) => ruleNames.includes(name))) {
    return { state: 'UNAVAILABLE_CAPABILITY', detail: 'documentation-currency rules are not all registered in hardening:check' };
  }
  const result = spawnSync(process.execPath, [path.join('bin', 'hardening-check.mjs'), '--report-documentation-currency'], {
    cwd: root,
    env: gitEnv(root),
    shell: false,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 1024 * 1024,
  });
  if (result.status !== 0 || typeof result.stdout !== 'string' || result.stdout === '') {
    return { state: 'UNAVAILABLE_CAPABILITY', detail: 'hardening-check documentation-currency report failed to run' };
  }
  const findings = /documentation-currency:\s+(\d+)\s+finding/.exec(result.stdout);
  if (findings === null) return { state: 'UNAVAILABLE_CAPABILITY', detail: 'documentation-currency report produced no finding count' };
  const count = Number(findings[1]);
  return count === 0
    ? { state: 'MET', detail: 'documentation-currency: 0 findings' }
    : { state: 'UNMET', detail: `documentation-currency: ${count} findings` };
}

function probeWorkspaceClaims(agentText) {
  const audit = /legacy_undeclared=(\d+)/.exec(agentText);
  const claims = [...agentText.matchAll(/\[agent-check\]\s+WARNING:\s+(CLAIM_TASK_[A-Z0-9_]+)/g)].map((match) => match[1]);
  const legacyUndeclared = audit === null ? null : Number(audit[1]);
  if (legacyUndeclared === null) return { state: 'UNAVAILABLE_CAPABILITY', detail: 'agent-state audit totals not found' };
  if (claims.length === 0 && legacyUndeclared === 0) {
    return { state: 'MET', detail: 'no claim-task attention; legacy_undeclared=0' };
  }
  return { state: 'UNMET', detail: `claim_findings=${claims.join(',') || 'none'} legacy_undeclared=${legacyUndeclared}` };
}

// Group 9 (F-11): the dependency-currency record is evaluated through its
// pure module. The lane class decides only whether the online advisory
// assessment ran; the Vue review conditions, the runtime qualification, the
// lockfile verification and the clean-claim guard are mechanized here.
const DEPENDENCY_CURRENCY_RECORD_PATH = 'config/dependency-currency.v1.json';
const DEPENDENCY_SOURCE_RE = /\.(?:ts|mjs)$/;

function readTrackedSources(root) {
  const listed = gitReadOnly(root, ['ls-files']);
  if (listed === null) return [];
  const sources = [];
  for (const line of listed.split('\n')) {
    const file = line.trim();
    if (!DEPENDENCY_SOURCE_RE.test(file)) continue;
    if (file.startsWith('ui/') || file.endsWith('.d.ts') || file.endsWith('.d.mts')) continue;
    try {
      sources.push({ path: file, text: fs.readFileSync(path.join(root, file), 'utf8') });
    } catch {
      // An unreadable tracked source is omitted; the call-site scan is
      // non-vacuous because a vanished fixture call site is itself a finding.
    }
  }
  return sources;
}

function readGovernedDocuments(root) {
  // The clean-claim guard judges CURRENT-TRUTH surfaces: README.md and every
  // document whose declared role is CURRENT_TRUTH. APPEND_ONLY_ARCHIVE
  // documents keep historical records verbatim — including quotes of claims
  // later shown wrong — and are not rewritten or judged as current truth.
  const paths = ['README.md'];
  const roles = readJsonAt(root, 'config/document-role.v1.json');
  if (roles !== null && Array.isArray(roles.documents)) {
    for (const entry of roles.documents) {
      if (entry !== null && typeof entry === 'object' && entry.role === 'CURRENT_TRUTH' && typeof entry.path === 'string') paths.push(entry.path);
    }
  }
  const documents = [];
  for (const file of paths) {
    try {
      documents.push({ path: file, text: fs.readFileSync(path.join(root, file), 'utf8') });
    } catch {
      // A missing governed document is reported by the documentation-currency
      // rule; the clean-claim scan records the documents it could read.
    }
  }
  return documents;
}

function safeErrorLabel(error) {
  const message = error instanceof Error ? error.message : '';
  return /^[A-Z][A-Z0-9_]*$/.test(message) ? message : 'DEPENDENCY_CURRENCY_EVALUATION_FAILED';
}

function probeDependencyCurrency(root, lane, today) {
  const { evaluateDependencyCurrency } = loadTypeScriptModule(root, 'src/core/dependencyCurrency/index.ts');
  const record = readJsonAt(root, DEPENDENCY_CURRENCY_RECORD_PATH);
  const packageJson = readJsonAt(root, 'package.json');
  if (record === null || packageJson === null) {
    return { state: 'UNAVAILABLE_CAPABILITY', detail: 'dependency-currency record or package.json unreadable' };
  }
  let matrix = '';
  try {
    matrix = fs.readFileSync(path.join(root, 'docs/HOST-CAPABILITY-MATRIX.md'), 'utf8');
  } catch {
    matrix = '';
  }
  let observedLockfileSha256 = null;
  try {
    observedLockfileSha256 = `sha256:${createHash('sha256').update(fs.readFileSync(path.join(root, 'package-lock.json'))).digest('hex')}`;
  } catch {
    observedLockfileSha256 = null;
  }
  const rootRequire = createRequire(path.join(root, 'package.json'));
  return evaluateDependencyCurrency({
    record,
    today,
    packageJson,
    sources: readTrackedSources(root),
    documents: readGovernedDocuments(root),
    matrixText: matrix,
    observed: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      kernelRelease: os.release(),
    },
    observedLockfileSha256,
    advisoryLaneClass: lane.class,
    resolveSpecifier: (specifier) => {
      try {
        rootRequire.resolve(specifier);
        return true;
      } catch {
        return false;
      }
    },
  });
}

function probeDependencyAdvisory(root, today) {
  const loaded = loadLaneState(root);
  if (!loaded.ok) return { state: 'UNAVAILABLE_CAPABILITY', detail: 'lane state unreadable' };
  const lane = loaded.lanes.find((entry) => entry.laneId === 'dependency-advisory');
  if (lane === undefined) return { state: 'UNMET', detail: 'no dependency-advisory lane record' };

  let currency;
  try {
    currency = probeDependencyCurrency(root, lane, today);
  } catch (error) {
    return { state: 'UNAVAILABLE_CAPABILITY', detail: `dependency-currency evaluation unavailable: ${safeErrorLabel(error)}` };
  }
  if (!currency.ok) {
    const findings = currency.findings.slice(0, 6).map((finding) => `${finding.code}: ${finding.detail}`);
    const remaining = currency.findings.length - findings.length;
    if (remaining > 0) findings.push(`${remaining} further finding(s)`);
    return { state: 'UNMET', detail: findings.join('; ') };
  }

  const runtime = currency.runtimeQualification === null ? 'runtime unresolved' : `runtime ${currency.runtimeQualification.state}`;
  const due = `vueReviewDue=${currency.vueReviewDueDate ?? 'NONE'} lockfileVerificationDue=${currency.lockfileVerificationDueDate ?? 'NONE'}`;
  if (lane.class === 'PROVEN') return { state: 'MET', detail: `dependency advisory executed; ${runtime}; ${due}` };
  const condition = typeof lane.unblockCondition === 'string' && lane.unblockCondition.trim() !== '';
  const current = typeof lane.revisitDate === 'string' && lane.revisitDate >= today;
  if (condition && current) {
    return { state: 'MET', detail: `recorded unavailable: ${lane.class}; owner action and revisit ${lane.revisitDate}; ${runtime}; ${due}` };
  }
  return { state: 'UNMET', detail: `class=${lane.class} condition=${condition} revisit=${lane.revisitDate ?? 'NONE'}` };
}

function probeCliContract(root) {
  const config = readJsonAt(root, 'config/bin-typecheck.v1.json');
  if (config === null) return { state: 'UNAVAILABLE_CAPABILITY', detail: 'config/bin-typecheck.v1.json unreadable' };
  const mode = config.mode;
  const exemptions = Array.isArray(config.exemptions) ? config.exemptions : [];
  if (mode === 'BLOCKING' && exemptions.length === 0) {
    return { state: 'MET', detail: 'bin type-check lane BLOCKING; loader contract audit in tests/unit/cliImplementationContract.test.ts' };
  }
  return { state: 'UNMET', detail: `bin type-check lane mode=${mode ?? 'ABSENT'}; exemptions=${exemptions.length}; full conformance is required before blocking` };
}

function probeRuleRegistry(root) {
  const result = spawnSync(process.execPath, [path.join('bin', 'hardening-check.mjs'), '--list-rules'], {
    cwd: root,
    env: gitEnv(root),
    shell: false,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.status !== 0 || typeof result.stdout !== 'string' || result.stdout.trim() === '') {
    return { output: { state: 'UNAVAILABLE_CAPABILITY', detail: 'hardening-check --list-rules unavailable' }, names: null };
  }
  let registry;
  try {
    registry = JSON.parse(result.stdout);
  } catch {
    return { output: { state: 'UNAVAILABLE_CAPABILITY', detail: 'hardening-check --list-rules produced no JSON registry' }, names: null };
  }
  const rules = Array.isArray(registry.rules) ? registry.rules : [];
  if (rules.length === 0) return { output: { state: 'UNMET', detail: 'rule registry is empty' }, names: [] };
  const unprobed = rules.filter((rule) => !Number.isInteger(rule.probeCount) || rule.probeCount < 1).map((rule) => rule.name);
  const badQuantifier = rules.filter((rule) => !RULE_QUANTIFIERS.has(rule.quantifier)).map((rule) => rule.name);
  if (unprobed.length === 0 && badQuantifier.length === 0) {
    return {
      output: { state: 'MET', detail: `${rules.length} rules; every rule has >=1 recorded probe and an explicit quantifier` },
      names: rules.map((rule) => rule.name),
    };
  }
  return {
    output: { state: 'UNMET', detail: `rules=${rules.length} unprobed=${unprobed.join(',') || 'none'} bad_quantifier=${badQuantifier.join(',') || 'none'}` },
    names: rules.map((rule) => rule.name),
  };
}

function probeAccessibility(root) {
  const unit = fs.existsSync(path.join(root, 'tests/unit/accessibilityAudit.test.ts'));
  const browser = fs.existsSync(path.join(root, 'tests/browser/accessibilityCertification.browser.ts'));
  if (!unit || !browser) return { state: 'UNMET', detail: `check absent: unit=${unit} browser=${browser}` };
  return {
    state: 'UNAVAILABLE_CAPABILITY',
    detail: 'the accessibility check is registered but no certification result at the certified checkpoint is recorded in machine-readable project state',
  };
}

/**
 * Categorical evidence lineage for NW-AUD-010. Distinguishes exit 0, exit 1,
 * timeout/signal, spawn failure, and malformed output. Only two successful
 * exit-1 ancestry queries establish DIVERGENT; operational failure is always
 * GIT_INDETERMINATE — never a proven negative relation.
 */
function resolveEvidenceLineage(root, evidenceSha, checkpointSha) {
  if (typeof evidenceSha !== 'string' || typeof checkpointSha !== 'string') return 'GIT_INDETERMINATE';
  if (!/^[0-9a-f]{40}$/i.test(evidenceSha) || !/^[0-9a-f]{40}$/i.test(checkpointSha)) return 'GIT_INDETERMINATE';
  const evidence = evidenceSha.toLowerCase();
  const checkpoint = checkpointSha.toLowerCase();
  if (evidence === checkpoint) return 'EXACT';

  const runGit = (args) => {
    try {
      const result = spawnSync('git', args, {
        cwd: root,
        env: gitEnv(root),
        shell: false,
        encoding: 'utf8',
        timeout: 5_000,
        maxBuffer: 512 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      if (result.error) return { kind: 'SPAWN_ERROR' };
      if (result.signal) return { kind: 'SIGNAL' };
      return { kind: 'EXIT', status: result.status, stdout: result.stdout ?? '' };
    } catch {
      return { kind: 'SPAWN_ERROR' };
    }
  };

  const evidenceObject = runGit(['rev-parse', '--verify', '--quiet', `${evidence}^{commit}`]);
  if (evidenceObject.kind !== 'EXIT' || evidenceObject.status !== 0) return 'OBJECT_MISSING';
  const checkpointObject = runGit(['rev-parse', '--verify', '--quiet', `${checkpoint}^{commit}`]);
  if (checkpointObject.kind !== 'EXIT' || checkpointObject.status !== 0) return 'OBJECT_MISSING';

  const evidenceIsAncestor = runGit(['merge-base', '--is-ancestor', evidence, checkpoint]);
  if (evidenceIsAncestor.kind !== 'EXIT') return 'GIT_INDETERMINATE';
  if (evidenceIsAncestor.status === 0) return 'STALE_ANCESTOR';
  if (evidenceIsAncestor.status !== 1) return 'GIT_INDETERMINATE';

  const checkpointIsAncestor = runGit(['merge-base', '--is-ancestor', checkpoint, evidence]);
  if (checkpointIsAncestor.kind !== 'EXIT') return 'GIT_INDETERMINATE';
  if (checkpointIsAncestor.status === 0) return 'FUTURE_DESCENDANT';
  if (checkpointIsAncestor.status !== 1) return 'GIT_INDETERMINATE';
  return 'DIVERGENT';
}

function collectReleaseCheckOutputs(root, blockFields, agentText, substantiveSha, today) {
  const isAncestor = (ancestor, descendant) => gitReadOnly(root, ['merge-base', '--is-ancestor', ancestor, descendant]) !== null;
  const lane = probeLaneState(root, substantiveSha, isAncestor, today);
  const rules = probeRuleRegistry(root);
  return {
    laneCounts: lane.counts,
    outputs: {
      'validation-lane-state': lane.output,
      'ci-block-record': probeCiBlockRecord(blockFields),
      'ledger-agreement': probeLedgerAgreement(agentText),
      'operator-cli-sweep': probeOperatorCli(root),
      'documentation-currency-rules': probeDocumentationCurrency(root, rules.names),
      'workspace-claims': probeWorkspaceClaims(agentText),
      'dependency-advisory-lane': probeDependencyAdvisory(root, today),
      'cli-implementation-contract': probeCliContract(root),
      'structural-rule-registry': rules.output,
      'accessibility-certification': probeAccessibility(root),
    },
  };
}

function collectExternalTrack(root) {
  try {
    const module = loadTypeScriptModule(root, 'src/core/productionTrack/index.ts');
    const reports = module.evaluateProductionTrack();
    const byStatus = new Map();
    for (const report of reports) byStatus.set(report.status, (byStatus.get(report.status) ?? 0) + 1);
    const aggregate = byStatus.has('EXTERNAL_PREREQUISITE_UNMET') ? 'EXTERNAL_PREREQUISITE_UNMET'
      : byStatus.has('REPOSITORY_WORK_REMAINING') ? 'REPOSITORY_WORK_REMAINING'
        : byStatus.has('AWAITING_AUTHORIZATION') ? 'AWAITING_AUTHORIZATION'
          : 'AUTHORIZED';
    return { state: aggregate, detail: reports.map((report) => `${report.stage}:${report.status}`).join(' ') };
  } catch {
    return { state: 'UNAVAILABLE_CAPABILITY', detail: 'production-track module unavailable at this checkpoint' };
  }
}

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'project-state-check',
  entry: 'bin/project-state-check.mjs',
  purpose: 'Validate the docs/CURRENT_STATE.md project-state truth block against derived source.',
  group: 'validate',
  flags: [
    { name: '--root', shape: 'path', summary: 'validate a different repository root' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: [],
};

function main() {
  const cli = defineOperatorCli(CLI_METADATA);
  if (cli.stop) return;
  const root = parseArgs(process.argv.slice(2));
  const errors = [];
  // The release certification needs the parsed block and the agent-state
  // output after section 3, so both are carried out of their local scopes.
  let blockFields = null;
  let agentText = '';
  let releaseVerdict = null;
  let releaseVerdictText = null;

  // 1. Whole-checkout cleanliness (mirrors the catalog-integrity gate).
  const porcelain = gitReadOnly(root, ['status', '--porcelain']);
  if (porcelain === null) fail(errors, 'PROJECT_STATE_GIT_FAILED');
  else if (porcelain.trim() !== '') fail(errors, 'PROJECT_STATE_CHECKOUT_DIRTY');

  // 2. Structured project-state block.
  let currentStateText;
  try {
    currentStateText = fs.readFileSync(path.join(root, 'docs/CURRENT_STATE.md'), 'utf8');
  } catch {
    fail(errors, 'PROJECT_STATE_CURRENT_STATE_MISSING');
    currentStateText = '';
  }
  const activeContinuity = readActiveContinuity(root);
  const parsed = parseKeyValueBlock(currentStateText);
  if (parsed === null) {
    fail(errors, 'PROJECT_STATE_BLOCK_MISSING');
  } else if (parsed.malformed) {
    fail(errors, parsed.oversized ? 'PROJECT_STATE_BLOCK_OVERSIZED' : 'PROJECT_STATE_BLOCK_MALFORMED');
  } else {
    const fields = parsed.fields;
    blockFields = fields;
    for (const key of parsed.duplicates ?? []) fail(errors, 'PROJECT_STATE_DUPLICATE_FIELD');
    for (const key of parsed.unknown ?? []) {
      if (FORBIDDEN_IMPLEMENTATION_AUTHORITY_FIELDS.has(key)) {
        fail(errors, 'PROJECT_STATE_DUPLICATE_IMPLEMENTATION_AUTHORITY');
      } else if (FORBIDDEN_DOCUMENTATION_AUTHORITY_FIELDS.has(key)) {
        fail(errors, 'PROJECT_STATE_DUPLICATE_DOCUMENTATION_AUTHORITY');
      } else {
        fail(errors, 'PROJECT_STATE_UNKNOWN_FIELD');
      }
    }
    for (const key of OWNED_PROJECT_STATE_FIELDS) {
      if (!fields.has(key)) fail(errors, 'PROJECT_STATE_REQUIRED_FIELD_MISSING');
    }
    if (!fields.has('PROJECT_STATE_PROTOCOL_VERSION')) fail(errors, 'PROJECT_STATE_PROTOCOL_MISSING');
    else if (fields.get('PROJECT_STATE_PROTOCOL_VERSION') !== PROJECT_STATE_PROTOCOL_VERSION) fail(errors, 'PROJECT_STATE_PROTOCOL_UNSUPPORTED');

    if (fields.get('LIVE_HEAD_AUTHORITY') !== 'GIT') fail(errors, 'PROJECT_STATE_LIVE_HEAD_AUTHORITY_INVALID');
    if (fields.get('CURRENT_TASK_AUTHORITY') !== '.agent/ACTIVE_TASK.md') fail(errors, 'PROJECT_STATE_CURRENT_TASK_AUTHORITY_INVALID');
    if (fields.get('VALIDATED_IMPLEMENTATION_AUTHORITY') !== '.agent/ACTIVE_TASK.md') fail(errors, 'PROJECT_STATE_VALIDATED_IMPLEMENTATION_AUTHORITY_INVALID');

    const declaredCount = parsed !== null && !parsed.malformed ? fieldsGet(parsed, 'CANONICAL_CATALOG_ENTRY_COUNT') : undefined;
    if (declaredCount !== undefined && !/^(?:0|[1-9][0-9]{0,8})$/.test(declaredCount)) fail(errors, 'PROJECT_STATE_CATALOG_COUNT_MISMATCH');
    if (fields.get('CANONICAL_CATALOG_SHA256') !== undefined && !/^sha256:[0-9a-f]{64}$/.test(fields.get('CANONICAL_CATALOG_SHA256'))) fail(errors, 'PROJECT_STATE_CATALOG_DIGEST_MISMATCH');

    if (fields.get('PROMOTION_AUTHORIZATION_LIFECYCLE') !== 'NONE' && fields.get('PROMOTION_AUTHORIZATION_LIFECYCLE') !== 'SPENT') fail(errors, 'PROJECT_STATE_PROMOTION_LIFECYCLE_INVALID');
    if (fields.get('EFFECTIVE_NEXT_PROMOTION_AUTHORITY') !== 'NONE') fail(errors, 'PROJECT_STATE_EFFECTIVE_PROMOTION_AUTHORITY_INVALID');
    if (fields.get('PHASE_8_STATUS') !== 'COMPLETE') fail(errors, 'PROJECT_STATE_PHASE_8_STATUS_MISMATCH');
    if (fields.get('PHASE_8B_1_STATUS') !== 'COMPLETE_VIA_SUCCESSFUL_RETRY_R1') fail(errors, 'PROJECT_STATE_PHASE_8B_1_STATUS_MISMATCH');

    if (fields.get('RELEASE_CERTIFICATION_PROTOCOL_VERSION') !== RELEASE_CERTIFICATION_PROTOCOL) fail(errors, 'PROJECT_STATE_RELEASE_PROTOCOL_UNSUPPORTED');
    if (!PROJECT_COMPLETION_STATUSES.has(fields.get('PROJECT_COMPLETION_STATUS'))) fail(errors, 'PROJECT_STATE_COMPLETION_STATUS_INVALID');
    if (fields.get('LIVE_HEAD_SHA') !== 'DISCOVER_FROM_GIT') fail(errors, 'PROJECT_STATE_LIVE_HEAD_SHA_NOT_GIT_DISCOVERED');
    for (const key of ['RELEASE_CHECKPOINT_SHA', 'LAST_SUBSTANTIVE_IMPLEMENTATION_SHA', 'LAST_LOCALLY_VALIDATED_SHA', 'LAST_CLEAN_VALIDATED_SHA', 'FINAL_DOCUMENTATION_SHA']) {
      if (!SHA_OR_DISCOVER.test(fields.get(key) ?? '')) fail(errors, `PROJECT_STATE_${key}_INVALID`);
    }
    for (const key of ['CI_OBSERVED_SHA', 'CI_EXECUTED_SHA']) {
      if (!SHA_OR_NONE.test(fields.get(key) ?? '')) fail(errors, `PROJECT_STATE_${key}_INVALID`);
    }
    const liveHeadForRelease = gitReadOnly(root, ['rev-parse', 'HEAD'])?.trim() ?? null;
    const validReleaseAnchor = (value, allowNone = false) => {
      if (value === 'DISCOVER_FROM_GIT' || (allowNone && value === 'NONE')) return true;
      if (!/^[0-9a-f]{40}$/i.test(value ?? '') || liveHeadForRelease === null) return false;
      return gitReadOnly(root, ['cat-file', '-e', `${value}^{commit}`]) !== null
        && gitReadOnly(root, ['merge-base', '--is-ancestor', value, liveHeadForRelease]) !== null;
    };
    for (const key of ['RELEASE_CHECKPOINT_SHA', 'LAST_SUBSTANTIVE_IMPLEMENTATION_SHA', 'LAST_LOCALLY_VALIDATED_SHA', 'LAST_CLEAN_VALIDATED_SHA', 'FINAL_DOCUMENTATION_SHA']) {
      if (!validReleaseAnchor(fields.get(key))) fail(errors, `PROJECT_STATE_${key}_NOT_IN_HISTORY`);
    }
    for (const key of ['CI_OBSERVED_SHA', 'CI_EXECUTED_SHA']) {
      if (!validReleaseAnchor(fields.get(key), true)) fail(errors, `PROJECT_STATE_${key}_NOT_IN_HISTORY`);
    }
    if (!CI_STATUSES.has(fields.get('CI_STATUS'))) fail(errors, 'PROJECT_STATE_CI_STATUS_INVALID');
    if (fields.get('FINAL_CI_AUTHORITY') !== 'GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT') fail(errors, 'PROJECT_STATE_FINAL_CI_AUTHORITY_INVALID');
    const activeStatus = activeContinuity.status;
    const activeEffect = activeContinuity.effect === undefined
      ? undefined
      : normalizeProjectVerdictEffect(activeContinuity.effect);
    if (activeStatus !== null && activeStatus !== undefined && activeStatus !== 'NONE') {
      if (activeContinuity.effect === undefined) {
        fail(errors, 'PROJECT_STATE_VERDICT_EFFECT_MISSING');
      } else if (activeEffect === null) {
        fail(errors, 'PROJECT_STATE_VERDICT_EFFECT_INVALID');
      }
    }
    if (activeContinuity.parsed !== null && findDuplicateFields(activeContinuity.parsed).some(({ key }) => key === 'PROJECT_VERDICT_EFFECT')) {
      fail(errors, 'PROJECT_STATE_VERDICT_EFFECT_DUPLICATE');
    }
    const allowedCompletion = COMPLETION_BY_ACTIVE_STATUS.get(activeStatus);
    let isMismatch = allowedCompletion === undefined || !allowedCompletion.has(fields.get('PROJECT_COMPLETION_STATUS'));
    // Explicit preservation is the only authority that lets an active task
    // retain the already-earned operational verdict. Task names are labels,
    // not authorization. Requalification/supersession tasks may instead
    // truthfully expose an operational failure while still recording work.
    if (isMismatch && activeStatus === 'IN_PROGRESS' && activeEffect === 'PRESERVE' && fields.get('PROJECT_COMPLETION_STATUS') === 'OPERATIONALLY_ACCEPTED') {
      isMismatch = false;
    }
    if (isMismatch && activeStatus === 'IN_PROGRESS' && activeEffect !== 'PRESERVE'
      && (activeEffect === 'REEVALUATE' || activeEffect === 'SUPERSEDE')
      && fields.get('PROJECT_COMPLETION_STATUS') === 'OPERATIONAL_ACCEPTANCE_FAILED') {
      isMismatch = false;
    }
    if (activeStatus === 'IN_PROGRESS' && fields.get('PROJECT_COMPLETION_STATUS') === 'OPERATIONALLY_ACCEPTED'
      && activeContinuity.effect !== undefined && activeEffect !== null && activeEffect !== 'PRESERVE') {
      fail(errors, 'PROJECT_STATE_VERDICT_EFFECT_MISMATCH');
    }
    if (isMismatch) {
      fail(errors, 'PROJECT_STATE_COMPLETION_STATUS_MISMATCH');
    }
    const ciStatus = fields.get('CI_STATUS');
    const observedSha = fields.get('CI_OBSERVED_SHA');
    const executedSha = fields.get('CI_EXECUTED_SHA');
    if (ciStatus === 'NOT_OBSERVED' && (observedSha !== 'NONE' || executedSha !== 'NONE')) fail(errors, 'PROJECT_STATE_CI_OBSERVATION_MISMATCH');
    if (ciStatus === 'NO_STEPS_EXTERNAL_NON_EVIDENCE' && (observedSha === 'NONE' || executedSha !== 'NONE')) fail(errors, 'PROJECT_STATE_CI_NON_EVIDENCE_MISMATCH');
    if ((ciStatus === 'EXECUTED_PASS' || ciStatus === 'EXECUTED_FAIL') && (!/^[0-9a-f]{40}$/i.test(observedSha ?? '') || observedSha !== executedSha)) fail(errors, 'PROJECT_STATE_CI_EXECUTION_MISMATCH');
    if (fields.get('PROJECT_COMPLETION_STATUS') === 'PROJECT_COMPLETE_AND_CI_CERTIFIED' && ciStatus !== 'EXECUTED_PASS') fail(errors, 'PROJECT_STATE_CI_COMPLETE_WITHOUT_EXECUTION');
    if (fields.get('PROJECT_COMPLETION_STATUS') === 'PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED' && ciStatus === 'EXECUTED_FAIL') fail(errors, 'PROJECT_STATE_LOCAL_COMPLETE_WITH_FAILED_CI');
    // CI evidence must describe the CURRENT substantive baseline, not an
    // ancestor of it. These fields are live state, so an observation taken
    // before the baseline advanced says nothing about the baseline in force
    // now, and leaving it in place lets a stale classification (for example
    // "CI executed zero steps") outlive the run it described. That is exactly
    // the drift this campaign found: the block still asserted a zero-step
    // non-evidence CI state for an ancestor SHA while the exact-head run at
    // the current baseline had in fact bootstrapped and executed the gate.
    // Ancestry is mechanically derivable offline, so the staleness is
    // detectable without contacting GitHub.
    const substantiveSha = fields.get('LAST_SUBSTANTIVE_IMPLEMENTATION_SHA');
    const ciEvidenceSha = ciStatus === 'NOT_OBSERVED' ? 'NONE' : observedSha;
    if (
      /^[0-9a-f]{40}$/i.test(ciEvidenceSha ?? '')
      && /^[0-9a-f]{40}$/i.test(substantiveSha ?? '')
      && ciEvidenceSha !== substantiveSha
      && gitReadOnly(root, ['merge-base', '--is-ancestor', ciEvidenceSha, substantiveSha]) !== null
    ) {
      fail(errors, 'PROJECT_STATE_CI_EVIDENCE_STALE');
    }

    // C-10.5 A10 — CROSS-AUTHORITY BASELINE INVARIANT.
    //
    // The check above compares the CI anchor to the substantive anchor, so it
    // only fires when the two DISAGREE. That misses the failure this campaign
    // found: all five live anchors named b99ce4e, an ANCESTOR of the validated
    // C-10 implementation at 23523cc, and because they agreed with each other
    // nothing fired. Pairwise agreement cannot detect a globally stale
    // baseline; only an external reference can.
    //
    // `.agent/ACTIVE_TASK.md` is that reference, and this document already
    // names it `VALIDATED_IMPLEMENTATION_AUTHORITY`. The invariant is
    // DIRECTIONAL — the task says what it validated, the project baseline must
    // not lag it — so no circular truth is created: CURRENT_STATE never becomes
    // the authority for what the task validated, and the task never dictates
    // the baseline's other fields.
    //
    // A documentation-only descendant is legitimate and must PASS: after a
    // validated implementation, the task records and project docs are updated,
    // which necessarily advances the task anchor past the substantive commit.
    // So the range is CLASSIFIED rather than merely compared, reusing the
    // continuity protocol's existing approved-checkpoint allowlist. Only a
    // commit touching an unapproved (implementation, source, test, config)
    // path proves a later substantive implementation exists.
    //
    // Everything here is local: `merge-base` and `diff --name-only` against the
    // object database, no network.
    const taskValidatedSha = activeContinuity.validatedImplementationSha;
    if (
      /^[0-9a-f]{40}$/i.test(substantiveSha ?? '')
      && /^[0-9a-f]{40}$/i.test(taskValidatedSha ?? '')
      && substantiveSha !== taskValidatedSha
      // Strict-ancestor only: a baseline AHEAD of the task anchor is a
      // different condition and is not this check's business.
      && gitReadOnly(root, ['merge-base', '--is-ancestor', substantiveSha, taskValidatedSha]) !== null
    ) {
      const changed = gitReadOnly(root, ['diff', '--name-only', substantiveSha, taskValidatedSha]);
      if (changed === null) {
        // Ancestry held but the range could not be classified. Fail closed:
        // an unclassifiable range must not be assumed documentation-only.
        fail(errors, 'PROJECT_STATE_SUBSTANTIVE_BASELINE_UNVERIFIABLE');
      } else {
        const files = changed.split('\n').map((line) => line.trim()).filter(Boolean);
        const substantive = files.filter((file) => !isApprovedCheckpointPath(file));
        if (substantive.length > 0) {
          // The active task validated an implementation strictly newer than the
          // project baseline. The baseline is stale even if every field in the
          // block agrees with every other field.
          fail(errors, 'PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE');
        }
      }
    }

    // The CI anchor is held to the same reference with its own semantics: it
    // names the commit a run executed at, so it may legitimately sit on a
    // documentation descendant, but it must never certify a commit older than
    // the validated implementation it claims to cover.
    if (
      /^[0-9a-f]{40}$/i.test(executedSha ?? '')
      && /^[0-9a-f]{40}$/i.test(taskValidatedSha ?? '')
      && executedSha !== taskValidatedSha
      && gitReadOnly(root, ['merge-base', '--is-ancestor', executedSha, taskValidatedSha]) !== null
    ) {
      const changed = gitReadOnly(root, ['diff', '--name-only', executedSha, taskValidatedSha]);
      if (changed !== null) {
        const files = changed.split('\n').map((line) => line.trim()).filter(Boolean);
        if (files.some((file) => !isApprovedCheckpointPath(file))) {
          fail(errors, 'PROJECT_STATE_CI_BASELINE_STALE');
        }
      }
    }

    // The live cross-check is a small, explicitly machine-owned snapshot.
    // It is the only documentation narrative outside the truth block that is
    // interpreted. Historical prose remains inert, while a stale live task,
    // phase, status, effect, completion claim, or next-action state fails
    // closed before any campaign authority can be constructed.
    const liveParsed = parseKeyValueBlock(currentStateText, LIVE_STATE_BLOCK_HEADING, OWNED_LIVE_STATE_FIELDS);
    if (liveParsed === null) {
      fail(errors, 'PROJECT_STATE_LIVE_STATE_BLOCK_MISSING');
    } else if (liveParsed.malformed) {
      fail(errors, liveParsed.oversized ? 'PROJECT_STATE_LIVE_STATE_BLOCK_OVERSIZED' : 'PROJECT_STATE_LIVE_STATE_BLOCK_MALFORMED');
    } else {
      const liveFields = liveParsed.fields;
      for (const key of liveParsed.duplicates ?? []) fail(errors, 'PROJECT_STATE_LIVE_STATE_DUPLICATE_FIELD');
      for (const key of liveParsed.unknown ?? []) fail(errors, 'PROJECT_STATE_LIVE_STATE_UNKNOWN_FIELD');
      for (const key of OWNED_LIVE_STATE_FIELDS) {
        if (!liveFields.has(key)) fail(errors, 'PROJECT_STATE_LIVE_STATE_REQUIRED_FIELD_MISSING');
      }
      if (liveFields.get('LIVE_STATE_PROTOCOL_VERSION') !== 'nightwatch.live-state.v1') {
        fail(errors, 'PROJECT_STATE_LIVE_STATE_PROTOCOL_UNSUPPORTED');
      }
      if (activeContinuity.parsed !== null) {
        const actualTaskId = activeContinuity.taskId;
        const actualPhase = activeContinuity.phase;
        const actualNextAction = activeContinuity.nextAction ?? '';
        const expectedNextActionState = isTerminalNextActionText(actualNextAction) ? 'STOP' : 'CONTINUE';
        const expectedCompletionClaim = activeStatus === 'COMPLETE' ? 'COMPLETE' : 'NONE';
        if (liveFields.get('LIVE_TASK_ID') !== actualTaskId) fail(errors, 'PROJECT_STATE_LIVE_TASK_ID_MISMATCH');
        if (liveFields.get('LIVE_PHASE') !== actualPhase) fail(errors, 'PROJECT_STATE_LIVE_PHASE_MISMATCH');
        if (normalizeTaskStatus(liveFields.get('LIVE_TASK_STATUS')) !== activeStatus) fail(errors, 'PROJECT_STATE_LIVE_STATUS_MISMATCH');
        if (liveFields.get('LIVE_PROJECT_COMPLETION_STATUS') !== fields.get('PROJECT_COMPLETION_STATUS')) fail(errors, 'PROJECT_STATE_LIVE_COMPLETION_STATUS_MISMATCH');
        const liveEffect = normalizeProjectVerdictEffect(liveFields.get('LIVE_PROJECT_VERDICT_EFFECT'));
        if (liveEffect === null) fail(errors, 'PROJECT_STATE_LIVE_VERDICT_EFFECT_INVALID');
        if (activeEffect !== null && liveEffect !== activeEffect) fail(errors, 'PROJECT_STATE_LIVE_VERDICT_EFFECT_MISMATCH');
        if (!new Set(['STOP', 'CONTINUE']).has(liveFields.get('LIVE_NEXT_ACTION_STATE'))) fail(errors, 'PROJECT_STATE_LIVE_NEXT_ACTION_INVALID');
        else if (liveFields.get('LIVE_NEXT_ACTION_STATE') !== expectedNextActionState) fail(errors, 'PROJECT_STATE_LIVE_NEXT_ACTION_MISMATCH');
        if (!new Set(['NONE', 'COMPLETE']).has(liveFields.get('LIVE_COMPLETION_CLAIM'))) fail(errors, 'PROJECT_STATE_LIVE_COMPLETION_CLAIM_INVALID');
        else if (liveFields.get('LIVE_COMPLETION_CLAIM') !== expectedCompletionClaim) fail(errors, 'PROJECT_STATE_LIVE_COMPLETION_CLAIM_MISMATCH');
      }
    }

    // EXECUTION_PROMPT is an active handoff, so only its canonical metadata
    // fields participate in this cross-file truth check. Missing optional
    // prompt metadata remains compatible with older records; a present but
    // contradictory status or campaign identity is never treated as prose.
    try {
      const executionPrompt = fs.readFileSync(path.join(root, '.agent/EXECUTION_PROMPT.md'), 'utf8');
      const promptParsed = parseKeyValuesWithLocations(executionPrompt);
      const promptStatusValue = fieldValue(promptParsed, 'Status');
      const activeTaskId = activeContinuity.taskId;
      if (promptStatusValue === HANDOFF_PLANNING_ONLY_STATUS) {
        // READY_FOR_EXECUTION is a planning-only checkpoint, and the handoff
        // protocol REQUIRES it to name the successor campaign while
        // ACTIVE_TASK still holds the terminal predecessor. Demanding that its
        // Status and Campaign ID agree with active-task truth made that
        // documented state unreachable: the status never normalizes to a task
        // status, so the mismatch fired for every planning prompt regardless
        // of identity. The binding that must hold here is the PREDECESSOR
        // one, so assert exactly that rather than skipping the cross-check.
        const header = parseHandoffHeader(executionPrompt);
        const predecessorTaskId = header.fields['Predecessor Task ID'];
        const predecessorStatus = header.fields['Predecessor Status'];
        if (predecessorTaskId !== undefined && predecessorTaskId !== activeTaskId) {
          fail(errors, 'PROJECT_STATE_EXECUTION_PROMPT_TASK_ID_MISMATCH');
        }
        if (predecessorStatus !== undefined && normalizeTaskStatus(predecessorStatus) !== activeStatus) {
          fail(errors, 'PROJECT_STATE_EXECUTION_PROMPT_STATUS_MISMATCH');
        }
      } else {
        if (promptStatusValue !== undefined && normalizeTaskStatus(promptStatusValue) !== activeStatus) {
          fail(errors, 'PROJECT_STATE_EXECUTION_PROMPT_STATUS_MISMATCH');
        }
        const promptCampaignId = fieldValue(promptParsed, 'Campaign ID');
        if (promptCampaignId !== undefined && promptCampaignId !== activeTaskId) {
          fail(errors, 'PROJECT_STATE_EXECUTION_PROMPT_TASK_ID_MISMATCH');
        }
      }
    } catch {
      // A missing prompt is not itself a project-verdict authority failure;
      // ACTIVE_TASK and its bound task record remain the required authority.
    }

    // R1 task durable-status cross-check (deterministic mapping only): the
    // completed R1 task STATE's own structured status line.
    let r1State = '';
    try {
      r1State = fs.readFileSync(path.join(root, R1_TASK_STATE_PATH), 'utf8');
    } catch {
      r1State = '';
    }
    const r1StatusMatch = /^Status:\s*(?<value>[^\r\n]+)$/m.exec(r1State);
    if (!r1StatusMatch || r1StatusMatch.groups.value.trim() !== 'COMPLETE') fail(errors, 'PROJECT_STATE_R1_TASK_STATUS_MISMATCH');
  }

  // 3. Active task authority + continuity v2 (read-only subprocess).
  const activeTaskPath = path.join(root, '.agent/ACTIVE_TASK.md');
  let activeTaskIsRegular = false;
  try {
    const activeTaskStat = fs.lstatSync(activeTaskPath);
    activeTaskIsRegular = activeTaskStat.isFile() && !activeTaskStat.isSymbolicLink();
  } catch {
    activeTaskIsRegular = false;
  }
  if (!activeTaskIsRegular) {
    fail(errors, 'PROJECT_STATE_ACTIVE_TASK_MISSING');
  } else {
    const agentCheck = spawnSync(process.execPath, ['bin/agent-state.mjs', '--root', root], {
      cwd: root,
      env: gitEnv(root),
      shell: false,
      encoding: 'utf8',
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });
    agentText = `${agentCheck.stdout ?? ''}\n${agentCheck.stderr ?? ''}`;
    if (agentCheck.status !== 0) fail(errors, 'PROJECT_STATE_ACTIVE_TASK_CONTINUITY_FAILED');
  }

  // 3b. F-12 release certification. The definition's own validity, the
  // documentation-only-anchor rule, the count-bearing presentation guard, the
  // ordered advance conditions, and the excluded external production track
  // are all evaluated here. Unmet conditions fail the check only when an
  // advance status is claimed; stale evidence refuses the certification.
  if (blockFields !== null) {
    try {
      const certification = loadTypeScriptModule(root, 'src/core/releaseCertification/index.ts');
      const definitionRecord = readJsonAt(root, RELEASE_DEFINITION_PATH);
      if (definitionRecord === null) {
        fail(errors, 'PROJECT_STATE_RELEASE_DEFINITION_MISSING');
      } else {
        const parsedDefinition = certification.parseReleaseCertificationDefinition(definitionRecord);
        if (!parsedDefinition.ok || parsedDefinition.definition === null) {
          for (const entry of parsedDefinition.errors) fail(errors, `PROJECT_STATE_${entry.code}`);
        } else {
          const definition = parsedDefinition.definition;
          // 13.7 — a documentation-only commit is a checkpoint advance, never
          // the implementation anchor.
          const substantiveSha = blockFields.get('LAST_SUBSTANTIVE_IMPLEMENTATION_SHA');
          const liveHeadSha = gitReadOnly(root, ['rev-parse', 'HEAD'])?.trim() ?? null;
          if (HEX40.test(substantiveSha ?? '')) {
            const changed = gitReadOnly(root, ['diff-tree', '--root', '--no-commit-id', '--name-only', '-r', substantiveSha]);
            if (changed === null) {
              fail(errors, 'PROJECT_STATE_IMPLEMENTATION_ANCHOR_UNVERIFIABLE');
            } else {
              const files = changed.split('\n').map((line) => line.trim()).filter(Boolean);
              if (files.length > 0 && files.every((file) => isApprovedCheckpointPath(file))) {
                fail(errors, 'PROJECT_STATE_IMPLEMENTATION_ANCHOR_DOCUMENTATION_ONLY');
              }
            }
          }
          // 13.5 — a surface presenting the status alone fails the guard.
          for (const surface of definition.presentationSurfaces) {
            let surfaceText = null;
            try {
              surfaceText = fs.readFileSync(path.join(root, surface), 'utf8');
            } catch {
              surfaceText = null;
            }
            if (surfaceText === null) continue;
            for (const missing of certification.checkVerdictPresentation(surfaceText)) {
              fail(errors, `PROJECT_STATE_VERDICT_PRESENTED_BARE: ${surface} missing ${missing}`);
            }
          }
          // 13.1/13.2/13.4/13.6 — ordered conditions, each from its check.
          const today = new Date().toISOString().slice(0, 10);
          const certifiedCheckpointSha = HEX40.test(substantiveSha ?? '') ? substantiveSha : liveHeadSha;
          const collected = collectReleaseCheckOutputs(root, blockFields, agentText, certifiedCheckpointSha, today);
          const external = collectExternalTrack(root);
          // NW-AUD-010: one captured evaluation snapshot; HEAD is resolved
          // once above (liveHeadSha) and never re-read per condition.
          let definitionDigest = null;
          try {
            const definitionBytes = fs.readFileSync(path.join(root, RELEASE_DEFINITION_PATH));
            definitionDigest = `sha256:${createHash('sha256').update(definitionBytes).digest('hex')}`;
          } catch {
            definitionDigest = null;
          }
          const headBefore = gitReadOnly(root, ['rev-parse', 'HEAD'])?.trim() ?? null;
          releaseVerdict = certification.evaluateReleaseCertification({
            definition,
            checkOutputs: collected.outputs,
            certifiedCheckpointSha,
            liveHeadSha,
            projectCompletionStatus: blockFields.get('PROJECT_COMPLETION_STATUS') ?? 'NONE',
            laneCounts: collected.laneCounts,
            externalTrack: {
              id: definition.externalTrack.id,
              stages: definition.externalTrack.stages,
              state: external.state,
              detail: external.detail,
            },
            definitionDigest,
            resolveEvidenceRelation: (resolvedEvidenceSha, checkpoint) => {
              const headAfter = gitReadOnly(root, ['rev-parse', 'HEAD'])?.trim() ?? null;
              if (headBefore !== null && headAfter !== null && headBefore !== headAfter) {
                return 'GIT_INDETERMINATE';
              }
              // Literal HEAD tokens were already resolved to liveHeadSha by
              // the pure evaluator from this same snapshot.
              return resolveEvidenceLineage(root, resolvedEvidenceSha, checkpoint);
            },
          });
          const headFinal = gitReadOnly(root, ['rev-parse', 'HEAD'])?.trim() ?? null;
          if (headBefore !== null && headFinal !== null && headBefore !== headFinal) {
            fail(errors, 'PROJECT_STATE_RELEASE_SNAPSHOT_UNSTABLE');
          }
          releaseVerdictText = certification.renderReleaseVerdictText(releaseVerdict);
          if (releaseVerdict.advanceRefused) {
            for (const condition of releaseVerdict.conditions) {
              if (condition.state !== 'MET') {
                fail(errors, `PROJECT_STATE_ADVANCE_CONDITION_UNMET: ${condition.id} (${condition.state})`);
              }
            }
          }
          // Evidence failures refuse certification in the verdict always, but
          // project:check only hard-fails them when an advance is claimed —
          // matching the pre-NW-AUD-010 advance gate while naming every
          // categorical evidence state (not only stale ancestors).
          if (releaseVerdict.advanceClaimed && releaseVerdict.certificationRefused) {
            for (const condition of releaseVerdict.conditions) {
              if (condition.state === 'STALE_EVIDENCE') {
                fail(errors, `PROJECT_STATE_STALE_EVIDENCE: ${condition.id}`);
              } else if (condition.state === 'EVIDENCE_ABSENT') {
                fail(errors, `PROJECT_STATE_EVIDENCE_ABSENT: ${condition.id}`);
              } else if (condition.state === 'EVIDENCE_FUTURE') {
                fail(errors, `PROJECT_STATE_EVIDENCE_FUTURE: ${condition.id}`);
              } else if (condition.state === 'EVIDENCE_DIVERGENT') {
                fail(errors, `PROJECT_STATE_EVIDENCE_DIVERGENT: ${condition.id}`);
              } else if (condition.state === 'EVIDENCE_UNRESOLVED') {
                fail(errors, `PROJECT_STATE_EVIDENCE_UNRESOLVED: ${condition.id}`);
              }
            }
          }
        }
      }
    } catch (error) {
      const code = error instanceof Error ? error.message.split(':')[0] : 'UNKNOWN';
      fail(errors, `PROJECT_STATE_RELEASE_CERTIFICATION_FAILED: ${code}`);
    }
  }

  // 4. Canonical catalog truth (real validator + deterministic renderer).
  let adoptedCases = null;
  let catalogBytes = null;
  try {
    adoptedCases = loadTypeScriptModule(root, 'src/core/selfDev/adoptedCases.ts');
  } catch {
    fail(errors, 'PROJECT_STATE_CATALOG_MODULE_LOAD_FAILED');
  }
  if (adoptedCases !== null) {
    const codeTarget = adoptedCases.SELFDEV_ADOPTED_CATALOG_TARGET_PATH;
    const declaredTarget = parsed !== null && !parsed.malformed ? parsed.fields.get('CANONICAL_CATALOG_TARGET') : undefined;
    if (declaredTarget !== codeTarget) fail(errors, 'PROJECT_STATE_CATALOG_TARGET_MISMATCH');

    const absoluteTarget = path.join(root, codeTarget);
    let targetStat;
    try {
      targetStat = fs.lstatSync(absoluteTarget);
    } catch {
      fail(errors, 'PROJECT_STATE_CATALOG_TARGET_MISSING');
    }
    if (targetStat?.isSymbolicLink() || (targetStat && !targetStat.isFile())) fail(errors, 'PROJECT_STATE_CATALOG_TARGET_NONCANONICAL');
    const tracked = gitReadOnly(root, ['ls-files', '--error-unmatch', '--', codeTarget]);
    if (tracked === null) fail(errors, 'PROJECT_STATE_CATALOG_TARGET_UNTRACKED');

    try {
      catalogBytes = fs.readFileSync(absoluteTarget, 'utf8');
    } catch {
      fail(errors, 'PROJECT_STATE_CATALOG_TARGET_MISSING');
    }
    if (catalogBytes !== null) {
      let validated = null;
      try {
        validated = adoptedCases.validateAdoptedCatalog(adoptedCases.SELFDEV_ADOPTED_CASES);
      } catch {
        fail(errors, 'PROJECT_STATE_CATALOG_INVALID');
      }
      if (validated !== null) {
        const rendered = adoptedCases.renderAdoptedCatalogSource(validated);
        if (catalogBytes !== rendered) fail(errors, 'PROJECT_STATE_CATALOG_RENDERER_MISMATCH');

        const digest = `sha256:${createHash('sha256').update(catalogBytes, 'utf8').digest('hex')}`;
        if (parsed !== null && !parsed.malformed) {
          const blockCount = fieldsGet(parsed, 'CANONICAL_CATALOG_ENTRY_COUNT');
          if (blockCount !== undefined && blockCount !== String(validated.length)) fail(errors, 'PROJECT_STATE_CATALOG_COUNT_MISMATCH');
          if (fieldsGet(parsed, 'CANONICAL_CATALOG_SHA256') !== digest) fail(errors, 'PROJECT_STATE_CATALOG_DIGEST_MISMATCH');
          if (fieldsGet(parsed, 'CANONICAL_CATALOG_STRATEGY') !== adoptedCases.SELFDEV_ADOPTION_STRATEGY_CLASS) fail(errors, 'PROJECT_STATE_CATALOG_STRATEGY_MISMATCH');
        }

        // 5. Next portfolio member via the REAL selector (no reimplementation).
        try {
          const portfolio = loadTypeScriptModule(root, 'src/core/selfDev/portfolio.ts');
          const selection = portfolio.selectNextSyntheticProposalVariant({
            adoptedEquivalentFingerprints: adoptedCases.selfDevAdoptedEquivalentFingerprints(),
            adoptedCoverageClasses: adoptedCases.selfDevAdoptedCoverageClasses(),
          });
          const projectedMember = selection === null ? 'EXHAUSTED' : 'AVAILABLE_NOT_ADOPTED';
          if (parsed !== null && !parsed.malformed && fieldsGet(parsed, 'NEXT_PORTFOLIO_MEMBER') !== projectedMember) {
            fail(errors, 'PROJECT_STATE_NEXT_PORTFOLIO_MEMBER_MISMATCH');
          }
        } catch {
          fail(errors, 'PROJECT_STATE_PORTFOLIO_PROJECTION_FAILED');
        }
      }
    }
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    if (releaseVerdictText !== null) console.error(releaseVerdictText);
    process.exitCode = 1;
    return;
  }

  const validated = adoptedCases.validateAdoptedCatalog(adoptedCases.SELFDEV_ADOPTED_CASES);
  const digest = `sha256:${createHash('sha256').update(catalogBytes, 'utf8').digest('hex')}`;
  const portfolio = loadTypeScriptModule(root, 'src/core/selfDev/portfolio.ts');
  const selection = portfolio.selectNextSyntheticProposalVariant({
    adoptedEquivalentFingerprints: adoptedCases.selfDevAdoptedEquivalentFingerprints(),
    adoptedCoverageClasses: adoptedCases.selfDevAdoptedCoverageClasses(),
  });
  console.log(JSON.stringify({
    status: 'PASS',
    projectStateProtocol: PROJECT_STATE_PROTOCOL_VERSION,
    liveHeadAuthority: 'GIT',
    currentTaskAuthority: '.agent/ACTIVE_TASK.md',
    validatedImplementationAuthority: '.agent/ACTIVE_TASK.md',
    catalogTarget: adoptedCases.SELFDEV_ADOPTED_CATALOG_TARGET_PATH,
    catalogCount: validated.length,
    catalogDigest: digest,
    catalogStrategy: adoptedCases.SELFDEV_ADOPTION_STRATEGY_CLASS,
    rendererRoundTrip: true,
    phase8Status: 'COMPLETE',
    phase8B1Status: 'COMPLETE_VIA_SUCCESSFUL_RETRY_R1',
    nextPortfolioMember: selection === null ? 'EXHAUSTED' : 'AVAILABLE_NOT_ADOPTED',
    promotionAuthorizationLifecycle: fieldsGet(parsed, 'PROMOTION_AUTHORIZATION_LIFECYCLE'),
    effectiveNextPromotionAuthority: fieldsGet(parsed, 'EFFECTIVE_NEXT_PROMOTION_AUTHORITY'),
    activeTaskContinuity: 'PASS',
    checkoutClean: true,
    releaseCertificationProtocol: RELEASE_CERTIFICATION_PROTOCOL,
    projectCompletionStatus: fieldsGet(parsed, 'PROJECT_COMPLETION_STATUS'),
    releaseCheckpointSha: fieldsGet(parsed, 'RELEASE_CHECKPOINT_SHA'),
    liveHeadSha: fieldsGet(parsed, 'LIVE_HEAD_SHA'),
    lastSubstantiveImplementationSha: fieldsGet(parsed, 'LAST_SUBSTANTIVE_IMPLEMENTATION_SHA'),
    lastLocallyValidatedSha: fieldsGet(parsed, 'LAST_LOCALLY_VALIDATED_SHA'),
    lastCleanValidatedSha: fieldsGet(parsed, 'LAST_CLEAN_VALIDATED_SHA'),
    ciObservedSha: fieldsGet(parsed, 'CI_OBSERVED_SHA'),
    ciExecutedSha: fieldsGet(parsed, 'CI_EXECUTED_SHA'),
    ciStatus: fieldsGet(parsed, 'CI_STATUS'),
    finalDocumentationSha: fieldsGet(parsed, 'FINAL_DOCUMENTATION_SHA'),
    finalCiAuthority: fieldsGet(parsed, 'FINAL_CI_AUTHORITY'),
    releaseVerdict,
  }, null, 2));
}

function fieldsGet(parsed, key) {
  return parsed.fields.get(key);
}

try {
  main();
} catch (error) {
  const code = error instanceof Error ? error.message.split(':')[0] : 'PROJECT_STATE_CHECK_FAILED';
  console.error(code);
  process.exitCode = 1;
}
