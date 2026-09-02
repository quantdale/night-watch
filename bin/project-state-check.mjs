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
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from './lib/typescript-runtime-loader.mjs';
import { isApprovedCheckpointPath } from './agent-state.mjs';
import {
  findDuplicateFields,
  fieldValue,
  fieldValueInLineRange,
  isTerminalNextActionText,
  normalizeProjectVerdictEffect,
  normalizeTaskStatus,
  parseMarkdownSections,
  parseKeyValuesWithLocations,
} from './agent-continuity-protocol.mjs';

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
  return loadRuntimeTypeScriptModule(path.join(root, file), { root });
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
      validatedImplementationSha: metadataValue('LAST_VALIDATED_IMPLEMENTATION_SHA'),
      substantiveCheckpointSha: metadataValue('LAST_SUBSTANTIVE_CHECKPOINT_SHA'),
    };
  } catch {
    return { parsed: null, status: null, effect: undefined, taskId: undefined, phase: undefined, nextAction: undefined, validatedImplementationSha: undefined, substantiveCheckpointSha: undefined };
  }
}

function main() {
  const root = parseArgs(process.argv.slice(2));
  const errors = [];

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
      if (promptStatusValue !== undefined && normalizeTaskStatus(promptStatusValue) !== activeStatus) {
        fail(errors, 'PROJECT_STATE_EXECUTION_PROMPT_STATUS_MISMATCH');
      }
      const promptCampaignId = fieldValue(promptParsed, 'Campaign ID');
      const activeTaskId = activeContinuity.taskId;
      if (promptCampaignId !== undefined && promptCampaignId !== activeTaskId) {
        fail(errors, 'PROJECT_STATE_EXECUTION_PROMPT_TASK_ID_MISMATCH');
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
    if (agentCheck.status !== 0) fail(errors, 'PROJECT_STATE_ACTIVE_TASK_CONTINUITY_FAILED');
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
