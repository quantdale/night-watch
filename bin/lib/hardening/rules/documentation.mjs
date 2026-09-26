#!/usr/bin/env node
// @ts-check

/**
 * Invariant family: documentation, continuity and project-state truth.
 *
 * Document roles and bounds, append-only archives, governed status words,
 * agent continuity v2, project-state v2, the planner handoff, decision-identity
 * uniqueness and documentation freshness. The shared property is that a durable
 * document never claims a status the mechanically derivable source contradicts.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  root,
  childEnvironment,
  fail,
  withoutComments,
  readIncludingComments,
  read,
  readDataFile,
  sha256Prefix,
  gitResult,
} from '../kernel.mjs';
import { loadDocumentRoleCorrections, loadReleaseEvidenceBindings } from '../../release-evidence.mjs';

/**
 * NW-08. The gate had no mechanical relationship to the set of tests that
 * EXIST. Its required lanes select from versioned manifests, and the
 * data-only inventory validated those declarations against each other —
 * never against what was discovered on disk. Measured at this campaign: 341
 * tracked root test/smoke files, 227 selected by required lanes, 114 in no
 * lane at all, including safety-relevant suites. A newly added test joined
 * the repository silently and every gate stayed green without it.
 *
 * This rule runs in a REQUIRED gate group, so an unclassified test now fails
 * the gate. "Covered by a different lane" is a legitimate answer; "covered by
 * nothing, and nobody noticed" is the defect.
 */
/**
 * NW-14. The host capability matrix must not go stale.
 *
 * Dependency and platform claims outlive their evidence quietly: the `vue`
 * devDependency was once removed as "unused" while a test still reached it
 * through `require.resolve` (DEF-FC-03), and the qualified-host requirements
 * lived only in prose that nothing checked. So the matrix is bound to two
 * mechanical facts.
 *
 * First, every DECLARED dependency must be assessed in it. A dependency
 * added without an assessment is the failure this catches — the manifest is
 * the source of truth, so the document cannot fall behind it.
 *
 * Second, every capability token the CODE actually probes must be named. A
 * capability that exists in the runtime but not in the matrix is an
 * unqualified host waiting to inherit a pass it never earned. Each anchor is
 * checked in its source too, so a renamed probe fails here rather than
 * leaving a matrix row describing something that no longer exists.
 */
/**
 * NW-07. Decision identities must be unambiguous.
 *
 * Five numbers — D-29, D-30, D-31, D-33 and D-34 — were each issued for two
 * unrelated decisions, so a citation of "D-31" could mean minimization or DEV
 * credentials. The document's own rule forbids editing a decision, and
 * renumbering one of a pair would silently rewrite evidence other documents
 * already cite, so the collisions are recorded in an erratum instead.
 *
 * This rule enforces the part that matters going forward: a duplicate that
 * the erratum does NOT record is a new collision, and it fails. Both titles
 * must appear, so an erratum row cannot be satisfied by naming the number
 * alone.
 */
/**
 * NW-07. A live PLAN must not contradict its own STATE.
 *
 * The parent programme's PLAN read "W0 IN_PROGRESS, W1-W5 NOT_STARTED" while
 * its own STATE recorded W0-W10 complete and certified, so a fresh reader
 * following the PLAN would have restarted work that had already shipped.
 * This campaign's own PLAN had drifted the same way at four milestones —
 * which is how the rule was tested: it failed on live data before it passed.
 *
 * The rule is deliberately narrow, because NW-07's constraint is to apply
 * new strict rules only to explicitly versioned live schemas:
 *
 *   - only the ACTIVE task, never the 140+ historical task directories;
 *   - only continuity v2, so legacy v1 prose is never judged;
 *   - only one direction. A milestone the STATE reports COMPLETE must not
 *     still read NOT_STARTED or IN_PROGRESS in the PLAN. The reverse is
 *     legitimate: a PLAN milestone may be complete before the STATE's
 *     narrative section mentions it.
 */
export function checkActiveMilestoneProgression() {
  const activeText = readDataFile('.agent/ACTIVE_TASK.md');
  if (activeText.length === 0) return;
  const directory = /^Task directory:\s*(\S+)\s*$/m.exec(activeText)?.[1];
  if (directory === undefined || !directory.startsWith('.agent/tasks/')) return;
  const stateText = readDataFile(`${directory}/STATE.md`);
  const planText = readIncludingComments(`${directory}/PLAN.md`);
  if (stateText.length === 0 || planText.length === 0) return;
  // Only the versioned live schema.
  if (!stateText.includes('nightwatch.agent-continuity.v2')) return;

  // The milestone identifier form is `M<n>` or `G<n>`. Scanning only `M<n>`
  // silently exempted every campaign that numbered its milestones `G1..Gn` —
  // a rule that never ran over most of the live corpus.
  //
  // The completion TOKEN is captured rather than assumed. The rule previously
  // required the PLAN to read exactly `COMPLETE`, while the sibling
  // `nw07ContinuityCoherence` suite requires the PLAN to MATCH whatever the
  // STATE says. A campaign whose milestones are `COMPLETE_LOCAL` — the normal
  // case for work validated locally but not yet CI-verified — could satisfy
  // one guard or the other but never both. The binding that both express is
  // "the PLAN agrees with the STATE", so that is what is asserted here.
  const complete = new Map();
  for (const match of stateText.matchAll(/\*\*((?:M|G)\d+)\b[^*]*?\b(COMPLETE(?:_LOCAL)?)\b/g)) {
    complete.set(match[1], match[2]);
  }
  for (const [milestone, reported] of [...complete].sort()) {
    const section = new RegExp(`^### ${milestone} —[\\s\\S]*?(?=^### |\\n## )`, 'm').exec(planText);
    if (section === null) {
      fail(`${directory}/PLAN.md has no '### ${milestone}' section although STATE.md reports it ${reported}`);
      continue;
    }
    const status = /^- \*\*Status:\*\*\s*(\S+)/m.exec(section[0])?.[1];
    if (status === undefined) {
      fail(`${directory}/PLAN.md milestone ${milestone} has no Status line although STATE.md reports it ${reported}`);
      continue;
    }
    if (status !== reported) {
      fail(`${directory}/PLAN.md milestone ${milestone} reads ${status} but STATE.md reports it ${reported}; a reader following the PLAN would redo shipped work`);
    }
  }
}

export function checkDecisionIdentityUniqueness() {
  const file = 'docs/DECISIONS.md';
  const text = readIncludingComments(file);
  if (text.length === 0) {
    fail(`${file} is missing`);
    return;
  }
  const headings = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = /^## (D-\d+) — (.+)$/.exec(line);
    if (match === null) continue;
    const id = match[1];
    if (!headings.has(id)) headings.set(id, []);
    headings.get(id).push(match[2].trim());
  }
  if (headings.size < 50) {
    fail(`${file} yielded only ${headings.size} decision headings; the scan is broken rather than the document clean`);
    return;
  }
  for (const [id, titles] of [...headings].sort((left, right) => left[0].localeCompare(right[0]))) {
    if (titles.length === 1) continue;
    // A recorded collision must name the number AND every colliding title,
    // so the erratum cannot be satisfied by a bare mention.
    const recorded = titles.every((title) => {
      const row = new RegExp(`\\|\\s*${id}[a-z]\\s*\\|\\s*${id}\\s*\\|\\s*${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\|`);
      return row.test(text);
    });
    if (!recorded) {
      fail(`${file} issues ${id} ${titles.length} times and the erratum does not record every colliding title; a new decision must take the next unused number`);
    }
  }
}

export function checkAgentContinuityIntegrity() {
  // The continuity checker and its protocol layer must remain read-only and
  // deterministic: no filesystem mutation, no child processes in the pure
  // module, no network.
  const mutationRe = /(?:fs|node:fs)[\s\S]{0,80}?\b(?:writeFile|writeFileSync|appendFile|appendFileSync|rename|renameSync|chmod|chmodSync|mkdir|mkdirSync|rm|rmSync|unlink|unlinkSync|createWriteStream)\b/;
  for (const file of ['bin/agent-state.mjs', 'bin/agent-continuity-protocol.mjs', 'bin/project-state-check.mjs']) {
    const source = readIncludingComments(file);
    if (mutationRe.test(source)) {
      fail(`${file} contains a filesystem mutation call (continuity checker must be read-only)`);
    }
  }
  const protocolModule = readIncludingComments('bin/agent-continuity-protocol.mjs');
  const protocolModuleCode = read("bin/agent-continuity-protocol.mjs");
  if (/\b(?:spawnSync|execSync|child_process|fetch\(|https?\.request|net\.)/.test(protocolModule)) {
    fail('bin/agent-continuity-protocol.mjs must stay a pure parsing module (no child processes, no network)');
  }
  if (!/nightwatch\.agent-continuity\.v2/.test(protocolModuleCode)) {
    fail('bin/agent-continuity-protocol.mjs must define the v2 protocol version constant');
  }
  const pkg = readDataFile('package.json');
  if (!/"agent:audit"\s*:\s*"node bin\/agent-state\.mjs --audit-history"/.test(pkg)) {
    fail('package.json agent:audit must invoke the local checker with --audit-history');
  }
  const workflow = readDataFile('.github/workflows/hardening.yml');
  if (!(/Completed-task continuity audit/.test(workflow) && /npm run agent:audit/.test(workflow)) && !/npm run gate:ci/.test(workflow)) {
    fail('.github/workflows/hardening.yml must run the Completed-task continuity audit (npm run agent:audit)');
  }
  // Phase 8 closure — docs/design checkpoint allowlist: exactly the narrow
  // single-level Markdown pattern; never docs/design/** or non-Markdown.
  //
  // R-12 note: this rule had never executed — `checkAgentContinuityIntegrity`
  // was defined and never called, so nothing noticed when the allowlist moved
  // from `bin/agent-state.mjs` into the pure protocol module. The assertion is
  // repointed at where the pattern actually lives, and it now matches the
  // literal by containment rather than by a re-escaped regex-of-a-regex, which
  // is what made the original silently unmaintainable.
  // Comments are stripped first: the module's own prose explains that it is
  // deliberately NOT `docs/design/**`, and a raw-text check reads that
  // explanation as the very violation it describes.
  const protocolCode = withoutComments(protocolModule);
  if (!protocolCode.includes('/^docs\\/design\\/[^/]+\\.md$/')) {
    fail('bin/agent-continuity-protocol.mjs must approve single-level docs/design/*.md checkpoint paths narrowly');
  }
  if (protocolCode.includes('docs\\/design\\/.*') || protocolCode.includes('docs/design/**')) {
    fail('bin/agent-continuity-protocol.mjs must not approve docs/design/** as a documentation checkpoint pattern');
  }
}

export function checkProjectStateIntegrity() {
  // Phase 8B.1-R1.1 / campaign hardening — project-memory truth
  // (nightwatch.project-state.v2).
  // The project-state checker must stay a deterministic read-only tool: no
  // filesystem writes, no network, no model, no DB/infrastructure, and the
  // canonical catalog target stays code-defined (no user-supplied path).
  const checker = readIncludingComments('bin/project-state-check.mjs');
  const checkerCode = read("bin/project-state-check.mjs");
  for (const field of ['RELEASE_CERTIFICATION_PROTOCOL_VERSION', 'PROJECT_COMPLETION_STATUS', 'RELEASE_CHECKPOINT_SHA', 'LIVE_HEAD_SHA', 'LAST_SUBSTANTIVE_IMPLEMENTATION_SHA', 'LAST_LOCALLY_VALIDATED_SHA', 'LAST_CLEAN_VALIDATED_SHA', 'CI_OBSERVED_SHA', 'CI_EXECUTED_SHA', 'CI_STATUS', 'FINAL_DOCUMENTATION_SHA', 'FINAL_CI_AUTHORITY']) {
    if (!checkerCode.includes(field)) fail(`project-state checker is missing release-truth field ${field}`);
  }
  if (!/PROJECT_STATE_COMPLETION_STATUS_MISMATCH/.test(checkerCode) || !/PROJECT_STATE_CI_NON_EVIDENCE_MISMATCH/.test(checkerCode) || !/PROJECT_STATE_CI_COMPLETE_WITHOUT_EXECUTION/.test(checkerCode)) {
    fail('project-state checker does not enforce blocked/completion and CI execution semantics');
  }
  if (!/IMPLEMENTATION_COMPLETE_OPERATIONAL_ACCEPTANCE_PENDING/.test(checkerCode)
    || !/OPERATIONALLY_ACCEPTED/.test(checkerCode)
    || !/REAL_SYSTEM_EXECUTION_VERIFIED_EFFICACY_UNPROVEN/.test(checkerCode)
    || !/OPERATIONAL_ACCEPTANCE_BLOCKED/.test(checkerCode)
    || !/OPERATIONAL_ACCEPTANCE_FAILED/.test(checkerCode)
    || !/PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED/.test(checkerCode)
    || !/COMPLETION_BY_ACTIVE_STATUS/.test(checkerCode)) {
    fail('project-state checker must keep historical local-clean complete distinct from operational-acceptance statuses');
  }
  if (/\b(?:fetch\(|https?\.request|net\.|dns\.|WebSocket|child_process\.[a-z]+exec|execSync|spawnSync\([^)]*['"]git['"]\s*,\s*\[[^\]]*(?:add|commit|push|checkout|reset|clean|stash|merge|rebase|cherry-pick|apply|am|tag|branch|config))/i.test(checker)) {
    fail('bin/project-state-check.mjs must stay a read-only local checker (no network, no Git mutation verbs)');
  }
  if (!/SELFDEV_ADOPTED_CATALOG_TARGET_PATH/.test(checkerCode)) fail('bin/project-state-check.mjs must derive the catalog target from the code-defined constant');
  if (!/validateAdoptedCatalog/.test(checkerCode) || !/renderAdoptedCatalogSource/.test(checkerCode)) {
    fail('bin/project-state-check.mjs must reuse the real validator/renderer (never regex/source-parsing truth)');
  }
  if (!/selectNextSyntheticProposalVariant/.test(checkerCode)) {
    fail('bin/project-state-check.mjs must derive the next portfolio member from the real selector');
  }
  if (!/agent-state\.mjs/.test(checkerCode)) fail('bin/project-state-check.mjs must verify active-task continuity v2 through agent-state');
  if (!/nightwatch\.project-state\.v2/.test(checkerCode)) fail('bin/project-state-check.mjs must define the project-state v2 protocol version');
  if (!/OWNED_PROJECT_STATE_FIELDS/.test(checkerCode) || !/PROJECT_STATE_UNKNOWN_FIELD/.test(checkerCode) || !/PROJECT_STATE_REQUIRED_FIELD_MISSING/.test(checkerCode) || !/PROJECT_STATE_DUPLICATE_FIELD/.test(checkerCode)) {
    fail('bin/project-state-check.mjs must enforce an explicit strict owned-key schema');
  }
  if (!/PROJECT_STATE_DUPLICATE_IMPLEMENTATION_AUTHORITY/.test(checkerCode)) {
    fail('bin/project-state-check.mjs must reject competing generic live implementation anchors');
  }
  if (!/PROMOTION_AUTHORIZATION_LIFECYCLE/.test(checkerCode) || !/EFFECTIVE_NEXT_PROMOTION_AUTHORITY/.test(checkerCode) || !/PROJECT_STATE_PROMOTION_LIFECYCLE_INVALID/.test(checkerCode) || !/PROJECT_STATE_EFFECTIVE_PROMOTION_AUTHORITY_INVALID/.test(checkerCode)) {
    fail('bin/project-state-check.mjs must separate and validate promotion lifecycle/effective authority');
  }
  // NW-AUD-010 — categorical release-evidence lineage is load-bearing.
  // The adapter must resolve closed relations (never a bare boolean ancestor
  // callback), name every evidence-failure category, and refuse operational
  // Git failure as proven divergence.
  if (!/resolveEvidenceLineage/.test(checkerCode) || !/STALE_ANCESTOR/.test(checkerCode) || !/FUTURE_DESCENDANT/.test(checkerCode) || !/DIVERGENT/.test(checkerCode) || !/OBJECT_MISSING/.test(checkerCode) || !/GIT_INDETERMINATE/.test(checkerCode)) {
    fail('bin/project-state-check.mjs must resolve categorical evidence lineage (NW-AUD-010)');
  }
  if (/evaluateReleaseCertification\([\s\S]*?isAncestor:/.test(checkerCode)) {
    fail('bin/project-state-check.mjs must not pass a boolean isAncestor callback (NW-AUD-010)');
  }
  for (const code of ['PROJECT_STATE_EVIDENCE_ABSENT', 'PROJECT_STATE_EVIDENCE_FUTURE', 'PROJECT_STATE_EVIDENCE_DIVERGENT', 'PROJECT_STATE_EVIDENCE_UNRESOLVED', 'PROJECT_STATE_STALE_EVIDENCE']) {
    if (!checkerCode.includes(code)) fail(`bin/project-state-check.mjs is missing evidence refusal code ${code}`);
  }
  const evaluator = read('src/core/releaseCertification/index.ts');
  if (!/EVIDENCE_LINEAGE_RELATIONS/.test(evaluator) || !/evaluationDigest/.test(evaluator) || !/checkState/.test(evaluator)) {
    fail('release evaluator must expose categorical lineage, checkState/effective state split, and evaluationDigest (NW-AUD-010)');
  }
  if (!/evidenceRelation === 'EXACT'[\s\S]{0,200}state = checkState/.test(evaluator) && !/evidenceRelation === 'EXACT'[\s\S]{0,400}state = checkState/.test(evaluator)) {
    // Presence of the EXACT branch that copies checkState into effective state.
    if (!/else if \(evidenceRelation === 'EXACT'\)/.test(evaluator)) {
      fail('release evaluator must gate effective MET on EXACT evidence relation (NW-AUD-010)');
    }
  }
  if (!/'EVIDENCE_ABSENT'/.test(evaluator) || !/'EVIDENCE_FUTURE'/.test(evaluator) || !/'EVIDENCE_DIVERGENT'/.test(evaluator) || !/'EVIDENCE_UNRESOLVED'/.test(evaluator)) {
    fail('release evaluator must define absent/future/divergent/unresolved effective states (NW-AUD-010)');
  }
  // Phase 8 final closure: the checker must now REQUIRE the terminal
  // PHASE_8_STATUS COMPLETE (the pre-closure IN_PROGRESS pin is gone), while
  // the effective-promotion-authority NONE requirement above stays — closing
  // the research phase never grants standing promotion authority.
  if (!/PROJECT_STATE_PHASE_8_STATUS_MISMATCH/.test(checkerCode)) {
    fail('bin/project-state-check.mjs must enforce PHASE_8_STATUS exactly');
  }
  if (!/PHASE_8_STATUS'\) !== 'COMPLETE'/.test(checkerCode)) {
    fail('bin/project-state-check.mjs must pin PHASE_8_STATUS to COMPLETE (Phase 8 closed)');
  }
  if (/writeFileSync|appendFileSync|createWriteStream|rmSync|unlinkSync|mkdirSync/.test(checker)) {
    fail('bin/project-state-check.mjs contains a filesystem write path');
  }
  const pkg = readDataFile('package.json');
  if (!/"project:check"\s*:\s*"node bin\/project-state-check\.mjs"/.test(pkg)) {
    fail('package.json project:check must invoke the local project-state checker');
  }
  const workflow = readDataFile('.github/workflows/hardening.yml');
  if (!(/Project-memory truth check/.test(workflow) && /npm run project:check/.test(workflow)) && !/npm run gate:ci/.test(workflow)) {
    fail('.github/workflows/hardening.yml must run the Project-memory truth check (npm run project:check)');
  }
  // Generated-source provenance: the live renderer and the generated catalog
  // must describe the CURRENT two-writer authority model (Phase 8B sandbox
  // mirror-only + Phase 8B.1 owner-gated canonical promotion) and must NOT
  // reintroduce the obsolete sandbox-only sentence or any false
  // runtime-write absolute (R1.1.1: the canonical-promotion executor IS a
  // runtime authority, so "runtime code never writes canonical source" is a
  // contradiction).
  const renderer = readIncludingComments('src/core/selfDev/adoptedCases.ts');
  const catalog = readIncludingComments('src/core/selfDev/adoptedCaseCatalog.generated.ts');
  if (/never in this canonical/.test(renderer) || /never in this canonical/.test(catalog)) {
    fail('live renderer/generated catalog must not reintroduce the obsolete sandbox-only authority sentence');
  }
  const FALSE_RUNTIME_WRITE_ABSOLUTES = [
    'runtime code never writes canonical source',
    'runtime never writes canonical source',
    'runtime never mutates canonical source',
    'canonical source is never written at runtime',
    'canonical source is never changed at runtime',
    'no runtime path can write canonical source',
  ];
  for (const [label, source] of [['renderer', renderer], ['generated catalog', catalog]]) {
    // Check both raw and comment-flattened text so a reintroduction cannot
    // evade the guard by wrapping across comment lines.
    const flattened = source.replace(/\n\s*\/\/\s*/g, ' ');
    for (const phrase of FALSE_RUNTIME_WRITE_ABSOLUTES) {
      if (source.includes(phrase) || flattened.includes(phrase)) {
        fail(`${label} reintroduces the false runtime-write absolute "${phrase}" (PHASE_8B_1_CANONICAL_AUTHORITY_WORDING_DRIFT)`);
      }
    }
  }
  for (const [label, source] of [['renderer', renderer], ['generated catalog', catalog]]) {
    if (!/Phase 8B sandbox/.test(source) || !/disposable/.test(source) || !/private source mirror/.test(source)) {
      fail(`${label} must keep the Phase 8B sandbox mirror-only write authority wording`);
    }
    if (!/owner-gated/.test(source) || !/canonical-promotion/.test(source)) {
      fail(`${label} must describe the separately owner-gated Phase 8B.1 canonical-promotion authority`);
    }
    if (!/No generic self-modification authority/.test(source)) {
      fail(`${label} must state there is no generic self-modification authority`);
    }
    // Multi-line prose checks run on the comment-flattened header (each
    // `// ` line join collapses to a single space), matching the phrases the
    // renderer emits.
    const flattened = source.replace(/\n\s*\/\/\s*/g, ' ');
    if (!/never commits or pushes Git/.test(flattened)) {
      fail(`${label} must state runtime promotion code never commits or pushes Git`);
    }
    if (!/development session/.test(flattened) || !/commit/.test(flattened)) {
      fail(`${label} must state the development session performs the later verified Git commit`);
    }
    if (!/candidates never directly write source/.test(flattened)) {
      fail(`${label} must state candidates never directly write source`);
    }
  }
}

export function checkPlannerHandoffIntegrity() {
  // The handoff boundary owns only prompt route/currentness. Keep the parser
  // pure and the Git-aware checker local, read-only, bounded, and categorical.
  const protocolCodeOnly = read("bin/planner-handoff-protocol.mjs");
  const checker = readIncludingComments('bin/planner-handoff-check.mjs');
  const checkerCode = read("bin/planner-handoff-check.mjs");
  const prompt = readDataFile('.agent/EXECUTION_PROMPT.md');
  if (!/nightwatch\.planner-executor-handoff\.v1/.test(protocolCodeOnly) || !/HANDOFF_REQUIRED_FIELDS/.test(protocolCodeOnly) || !/validateHandoffState/.test(protocolCodeOnly)) {
    fail('planner handoff protocol must define the versioned required-field/state contract');
  }
  if (!/nightwatch\.planner-executor-handoff\.v1/.test(prompt)) fail('.agent/EXECUTION_PROMPT.md must carry the versioned handoff header');
  if (!/HANDOFF_RECEIPT_SCHEMA/.test(checkerCode) || !/HANDOFF_OPENSPEC_FILE_UNTRACKED/.test(checkerCode) || !/HANDOFF_OPENSPEC_NONCANONICAL_FILE/.test(checkerCode)) {
    fail('planner handoff checker must own bounded OpenSpec route integrity');
  }
  if (!/SAFE_RELATIVE_PATH_RE/.test(checkerCode) || !/isSymbolicLink/.test(checkerCode) || !/merge-base/.test(checkerCode)) {
    fail('planner handoff checker must enforce safe paths, regular files, and Git ancestry');
  }
  if (!/shell\s*:\s*false/.test(checkerCode) || !/timeout\s*:\s*10_000/.test(checkerCode) || !/maxBuffer\s*:/.test(checkerCode) || !/GIT_OPTIONAL_LOCKS/.test(checkerCode)) {
    fail('planner handoff checker child processes must be fixed, shell-disabled, and bounded');
  }
  if (/writeFileSync|appendFileSync|createWriteStream|renameSync|unlinkSync|rmSync|mkdirSync/.test(checker)) {
    fail('planner handoff checker contains a filesystem write path');
  }
  if (/\b(?:fetch\s*\(|https?\.request|WebSocket\s*\(|net\.|dns\.)/i.test(checker)) {
    fail('planner handoff checker contains network capability');
  }
  // D-04 / task 4.10 — the ONE ambient read this checker may do is the
  // non-secret gate-mode label (`NIGHTWATCH_GATE_ENVIRONMENT`): a
  // classification input with no credential, path or authority content that
  // lets ci/clean checkouts classify a legitimately absent session worktree.
  // Every other `process.env` use remains forbidden — ambient credentials,
  // tokens, paths and shell/output authority never inherit here.
  const withoutGateModeLabel = checker
    .split(/process\.env\[\s*['"]NIGHTWATCH_GATE_ENVIRONMENT['"]\s*\]/g)
    .join('');
  if (/process\.env/.test(withoutGateModeLabel) || /shell\s*:\s*true/.test(checker) || /stdio\s*:\s*['"]inherit['"]/.test(checker)) {
    fail('planner handoff checker must not inherit ambient credentials or shell/output authority');
  }
  const packageJson = readDataFile('package.json');
  if (!/"handoff:check"\s*:\s*"node bin\/planner-handoff-check\.mjs"/.test(packageJson)) {
    fail('package.json must expose the planner handoff checker');
  }
}

/**
 * Documentation truth hardening (post-acceptance): when the machine-checked
 * truth block says OPERATIONALLY_ACCEPTED at 598e7fa, live narratives must not
 * claim the current operational campaign is still BLOCKED as present tense.
 * Historical BLOCKED is preserved as historical. This catches the class of
 * stale EXECUTION_PROMPT/BLOCKED vs ACTIVE_TASK/COMPLETE divergence that
 * previously escaped agent/project checks (handoff:check alone was not
 * re-run after docs commits and ROADMAP/CURRENT_STATE narratives had no gate).
 */
export function checkDocumentationTruth() {
  const currentState = readDataFile('docs/CURRENT_STATE.md');
  const roadmap = readDataFile('docs/ROADMAP.md');
  const activeTask = readDataFile('.agent/ACTIVE_TASK.md');
  const executionPrompt = readDataFile('.agent/EXECUTION_PROMPT.md');
  const blockMatch = /PROJECT_COMPLETION_STATUS:\s*(\S+)/.exec(currentState);
  const machineStatus = blockMatch ? blockMatch[1].trim() : undefined;
  if (machineStatus === 'OPERATIONALLY_ACCEPTED') {
    // CURRENT_STATE narrative must not claim present-tense BLOCKED for operational acceptance.
    if (/Active task `nightwatch-operational-acceptance-v1` is BLOCKED/.test(currentState)) {
      fail('docs/CURRENT_STATE.md claims live BLOCKED while machine block is OPERATIONALLY_ACCEPTED — stale present-tense contradiction');
    }
    if (/## Current operational-acceptance campaign — blocked/i.test(currentState)) {
      fail('docs/CURRENT_STATE.md has stale "Current operational-acceptance campaign — blocked" heading while machine block is OPERATIONALLY_ACCEPTED');
    }
    if (!/OPERATIONALLY_ACCEPTED at 598e7fa/.test(currentState) && !/OPERATIONALLY_ACCEPTED.*598e7fa/.test(currentState)) {
      fail('docs/CURRENT_STATE.md must document terminal OPERATIONALLY_ACCEPTED at 598e7fa when machine block is ACCEPTED');
    }
    // ROADMAP tail must not claim present-tense current campaign is BLOCKED.
    if (/current campaign is `nightwatch-operational-acceptance-v1` with project status `OPERATIONAL_ACCEPTANCE_BLOCKED`/.test(roadmap)) {
      fail('docs/ROADMAP.md claims live BLOCKED while machine block is OPERATIONALLY_ACCEPTED — stale present-tense contradiction');
    }
    if (!/OPERATIONALLY_ACCEPTED/.test(roadmap)) {
      fail('docs/ROADMAP.md must mention OPERATIONALLY_ACCEPTED when machine block is ACCEPTED');
    }
    // EXECUTION_PROMPT for the predecessor is now superseded by the successor IN_PROGRESS handoff;
    // when active task is the successor IN_PROGRESS, its handoff must be consistent (checked by handoff:check).
    // For defense-in-depth, ensure the new prompt does not claim BLOCKED for the new campaign.
    if (/^Status:\s*BLOCKED/m.test(executionPrompt) && /nightwatch-post-acceptance/.test(executionPrompt)) {
      fail('.agent/EXECUTION_PROMPT.md for post-acceptance campaign must not be BLOCKED at creation');
    }
    // Also ensure active task is not still claiming BLOCKED for operational acceptance while machine is ACCEPTED
    if (/nightwatch-operational-acceptance-v1/.test(activeTask) && /^Status:\s*BLOCKED/m.test(activeTask)) {
      fail('.agent/ACTIVE_TASK.md still claims BLOCKED for operational acceptance while machine block is OPERATIONALLY_ACCEPTED');
    }
  }
}
/**
 * AH-1 documentation-freshness invariants (narrow, against demonstrated
 * failure modes — the 2026-09-01 header that survived MA-8 completion and
 * the historical GREEN claimed as current CI truth). Header dates are UTC
 * calendar days to stay independent of committer timezone.
 */
export function checkDocumentationFreshness() {
  const doc = 'docs/CURRENT_STATE.md';
  const text = readIncludingComments(doc);
  const lines = text.split('\n');
  // --- the header date must cover the document's own last change ---
  const headerDate = /Last updated: \*\*(\d{4}-\d{2}-\d{2})\*\*/.exec(lines.slice(0, 10).join('\n'));
  if (headerDate === null) {
    fail(`${doc} header must carry Last updated: **YYYY-MM-DD**`);
  } else {
    const touched = spawnSync('git', ['log', '-1', '--format=%ad', '--date=unix', '--', doc], { cwd: root, encoding: 'utf8', env: childEnvironment, timeout: 10_000, maxBuffer: 512 * 1024 });
    const touchSeconds = Number((touched.stdout ?? '').trim());
    const touchDate = Number.isFinite(touchSeconds) && touchSeconds > 0 ? new Date(touchSeconds * 1000).toISOString().slice(0, 10) : '';
    if (touched.status === 0 && /^\d{4}-\d{2}-\d{2}$/.test(touchDate) && headerDate[1] < touchDate) {
      fail(`${doc} header date ${headerDate[1]} predates its own last change ${touchDate}; bump the header when the document changes`);
    }
  }
  // --- MA-8 COMPLETE and MA-8 pending cannot both hold as current truth ---
  if (/MA_8_F_13_STATUS[^|\n]*COMPLETE/.test(text)) {
    lines.forEach((line, index) => {
      if (/MA-8[^_a-zA-Z0-9].{0,50}\b(missing|pending|unimplemented|not started)\b/i.test(line)
        && !/histor/i.test(line)
        && !/Resolution \(/.test(lines.slice(Math.max(0, index - 2), index + 1).join('\n'))) {
        fail(`${doc}:${index + 1} claims MA-8 pending while MA_8_F_13_STATUS is COMPLETE`);
      }
    });
  }
  // --- GREEN in the header must be framed as history, never as live CI ---
  lines.slice(0, 30).forEach((line, index) => {
    if (/\bGREEN\b/.test(line) && !/histor/i.test(lines.slice(Math.max(0, index - 1), index + 2).join('\n'))) {
      fail(`${doc}:${index + 1} claims GREEN without historical framing in the live header`);
    }
  });
  // --- C-12 is never documented READY ---
  lines.forEach((line, index) => {
    if (/C-12[^_a-zA-Z0-9].{0,40}\bREADY\b/i.test(line) && !/PENDING|BLOCKED|NOT authorized|never/i.test(line)) {
      fail(`${doc}:${index + 1} documents C-12 READY; synthetic rehearsal READY must never read as live readiness`);
    }
  });
}

/**
 * Group 7 / F-08 — documentation roles, current-truth bounds, and relocations.
 *
 * §5 of `docs/HOST-CAPABILITY-MATRIX.md` names the documents that answer
 * "where are we" and distinguishes them from the append-heavy archives. That
 * mitigation was advisory; nothing prevented a campaign from appending a
 * current-sounding status to an archive, and nothing detected a document that
 * no longer has a role at all. This rule makes the classification mechanical:
 * every top-level `docs/*.md` file has exactly one role, a `CURRENT_TRUTH`
 * document is bounded, and a moved block is verified byte-identically in the
 * archive that received it.
 */
export const DOCUMENT_ROLE_CONFIG = 'config/document-role.v1.json';
export const DOCUMENT_ROLE_VALUES = new Set(['CURRENT_TRUTH', 'APPEND_ONLY_ARCHIVE', 'OPERATOR_REFERENCE']);

export function readDocumentRoleConfig(rule) {
  let config;
  try {
    config = JSON.parse(readIncludingComments(DOCUMENT_ROLE_CONFIG));
  } catch (error) {
    fail(`${rule} cannot read ${DOCUMENT_ROLE_CONFIG}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
  if (config.schemaVersion !== 'nightwatch.document-role.v1') {
    fail(`${rule} ${DOCUMENT_ROLE_CONFIG} schemaVersion is ${String(config.schemaVersion)}, not nightwatch.document-role.v1`);
    return null;
  }
  if (!Array.isArray(config.documents) || config.documents.length === 0) {
    fail(`${rule} ${DOCUMENT_ROLE_CONFIG} declares no documents; the declaration is empty, not clean`);
    return null;
  }
  return config;
}

/** Count lines the way `wc -l` does: a trailing newline is a terminator, not a line. */
export function countDocumentLines(text) {
  if (text.length === 0) return 0;
  return text.endsWith('\n') ? text.split('\n').length - 1 : text.split('\n').length;
}

export function checkDocumentRoleCurrency() {
  const config = readDocumentRoleConfig('DOCUMENT_ROLE');
  if (config === null) return;
  const documentsDirectory = path.join(root, 'docs');
  const actual = fs.readdirSync(documentsDirectory)
    .filter((entry) => entry.endsWith('.md'))
    .filter((entry) => fs.statSync(path.join(documentsDirectory, entry)).isFile())
    .sort()
    .map((entry) => `docs/${entry}`);
  const declared = new Map();
  for (const entry of config.documents) {
    if (entry === null || typeof entry !== 'object' || typeof entry.path !== 'string') {
      fail('DOCUMENT_ROLE a declaration entry has no path');
      continue;
    }
    if (!DOCUMENT_ROLE_VALUES.has(entry.role)) {
      fail(`DOCUMENT_ROLE ${entry.path} declares unknown role ${String(entry.role)}`);
      continue;
    }
    if (declared.has(entry.path)) {
      fail(`DOCUMENT_ROLE ${entry.path} is declared more than once; a file has exactly one role`);
      continue;
    }
    declared.set(entry.path, entry);
    if (entry.role === 'CURRENT_TRUTH') {
      if (!Number.isInteger(entry.maxLines) || entry.maxLines <= 0) {
        fail(`DOCUMENT_ROLE CURRENT_TRUTH ${entry.path} must declare a positive integer maxLines`);
      }
    } else if (entry.maxLines !== undefined) {
      fail(`DOCUMENT_ROLE ${entry.path} declares maxLines but is ${entry.role}; only a CURRENT_TRUTH document is bounded`);
    }
  }
  for (const file of actual) {
    if (!declared.has(file)) fail(`DOCUMENT_ROLE ${file} has no role declaration; a new document must be classified, not missed`);
  }
  for (const file of declared.keys()) {
    if (!actual.includes(file)) fail(`DOCUMENT_ROLE ${file} is declared but does not exist`);
  }
  // A declaration that classified nothing would pass vacuously.
  if (declared.size === 0) fail('DOCUMENT_ROLE classified zero documents; the declaration is broken rather than the repository clean');

  // --- current-truth documents are bounded ---
  for (const [file, entry] of declared) {
    if (entry.role !== 'CURRENT_TRUTH') continue;
    const lines = countDocumentLines(readIncludingComments(file));
    if (Number.isInteger(entry.maxLines) && lines > entry.maxLines) {
      fail(`DOCUMENT_ROLE ${file} has ${lines} lines and exceeds its declared CURRENT_TRUTH maximum of ${entry.maxLines}; relocate the excess into an APPEND_ONLY_ARCHIVE`);
    }
  }

  // --- relocations preserve the moved bytes ---
  const relocationIds = new Set();
  for (const relocation of Array.isArray(config.relocations) ? config.relocations : []) {
    const id = typeof relocation.id === 'string' ? relocation.id : '';
    if (id.length === 0) { fail('DOCUMENT_ROLE a relocation has no id'); continue; }
    if (relocationIds.has(id)) { fail(`DOCUMENT_ROLE relocation id ${id} is declared more than once`); continue; }
    relocationIds.add(id);
    const from = declared.get(relocation.from);
    const to = declared.get(relocation.to);
    if (from === undefined || from.role !== 'CURRENT_TRUTH') {
      fail(`DOCUMENT_ROLE relocation ${id} does not name a declared CURRENT_TRUTH source`);
      continue;
    }
    if (to === undefined || to.role !== 'APPEND_ONLY_ARCHIVE') {
      fail(`DOCUMENT_ROLE relocation ${id} does not name a declared APPEND_ONLY_ARCHIVE destination`);
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(relocation.date ?? ''))) {
      fail(`DOCUMENT_ROLE relocation ${id} has no YYYY-MM-DD date`);
      continue;
    }
    if (!/^sha256:[0-9a-f]{24}$/.test(String(relocation.digest ?? ''))) {
      fail(`DOCUMENT_ROLE relocation ${id} has no sha256:<24 hex> digest of the moved bytes`);
      continue;
    }
    const archiveLines = readIncludingComments(relocation.to).split(/\r?\n/);
    const start = archiveLines.indexOf(`<!--relocation:${id}:start-->`);
    const end = archiveLines.indexOf(`<!--relocation:${id}:end-->`);
    if (start < 0 || end < 0 || end <= start) {
      fail(`DOCUMENT_ROLE relocation ${id} has no start/end marker pair in ${relocation.to}`);
      continue;
    }
    const block = archiveLines.slice(start + 1, end).join('\n');
    const actualDigest = sha256Prefix(block);
    if (actualDigest !== relocation.digest) {
      fail(`DOCUMENT_ROLE relocation ${id} archived bytes are ${actualDigest} but ${relocation.digest} was the text removed from ${relocation.from}; a modified relocation loses the receipt it moved`);
      continue;
    }
    const pointer = `<!--relocated:${id} dated ${relocation.date} to ${relocation.to}-->`;
    const pointerPresent = readIncludingComments(relocation.from).includes(pointer);
    if (!pointerPresent) {
      fail(`DOCUMENT_ROLE relocation ${id} is not announced in ${relocation.from} with the dated pointer ${pointer}`);
    }
  }

  // --- a correction may only excuse an archive line ---
  for (const correction of Array.isArray(config.corrections) ? config.corrections : []) {
    const target = declared.get(correction.path);
    if (target === undefined || target.role !== 'APPEND_ONLY_ARCHIVE') {
      fail(`DOCUMENT_ROLE correction ${String(correction.id)} names ${String(correction.path)}, which is not a declared APPEND_ONLY_ARCHIVE`);
    }
    if (!/^sha256:[0-9a-f]{24}$/.test(String(correction.oldLineSha256 ?? ''))) {
      fail(`DOCUMENT_ROLE correction ${String(correction.id)} has no sha256:<24 hex> oldLineSha256`);
    }
    if (typeof correction.reason !== 'string' || correction.reason.trim().length < 20) {
      fail(`DOCUMENT_ROLE correction ${String(correction.id)} states no reason for the correction`);
    }
  }
}

/**
 * Group 7 / F-08 — archives are append-only in the direction that can be
 * false: existing lines are never modified or deleted, only appended to.
 *
 * The base is the merge-base of HEAD and origin/main when the remote is
 * available, so a session's committed and uncommitted archive edits are both
 * measured against the point the branch left main. The rule reads the diff
 * that the append-only claim is about, so it can only fail for a real
 * modification, never for prose that merely resembles one. The declared
 * correction escape is exact: the removed line's digest must be recorded in
 * `config/document-role.v1.json`.
 *
 * One exemption is structural rather than a weakening. `docs/CURRENT_STATE.md`
 * carries two fenced machine-checked blocks (`nightwatch.project-state.v2` and
 * `nightwatch.live-state.v1`) whose owner rewrites them as current truth; a
 * reader of the file can see the machine blocks are not the historical record.
 * The rule exempts removed lines that fall inside those fenced blocks in the
 * diff base, and only those lines.
 */
export const MACHINE_BLOCK_PROTOCOL_MARKERS = [
  'PROJECT_STATE_PROTOCOL_VERSION: nightwatch.project-state.v2',
  'LIVE_STATE_PROTOCOL_VERSION: nightwatch.live-state.v1',
];

export function machineBlockLineRanges(text) {
  const lines = text.split(/\r?\n/);
  const ranges = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (!MACHINE_BLOCK_PROTOCOL_MARKERS.some((marker) => line.includes(marker))) continue;
    let start = index;
    while (start > 0 && (lines[start] ?? '').trim() !== '```') start -= 1;
    let end = index;
    while (end < lines.length && (lines[end] ?? '').trim() !== '```') end += 1;
    ranges.push([start + 1, end + 1]);
  }
  return ranges;
}

export function resolveArchiveDiffBase() {
  const head = gitResult(['rev-parse', '--verify', 'HEAD']);
  if (head.status !== 0) return null;
  const headSha = (head.stdout ?? '').trim();
  if (!/^[0-9a-f]{40}$/.test(headSha)) return null;
  const remote = gitResult(['rev-parse', '--verify', '--quiet', 'origin/main']);
  if (remote.status !== 0) return headSha;
  const remoteSha = (remote.stdout ?? '').trim();
  if (!/^[0-9a-f]{40}$/.test(remoteSha)) return headSha;
  const mergeBase = gitResult(['merge-base', headSha, remoteSha]);
  const mergeBaseSha = (mergeBase.stdout ?? '').trim();
  return mergeBase.status === 0 && /^[0-9a-f]{40}$/.test(mergeBaseSha) ? mergeBaseSha : headSha;
}

export function checkAppendOnlyArchives() {
  const config = readDocumentRoleConfig('APPEND_ONLY');
  if (config === null) return;
  const archives = new Set((config.documents ?? [])
    .filter((entry) => entry !== null && typeof entry === 'object' && entry.role === 'APPEND_ONLY_ARCHIVE')
    .map((entry) => entry.path));
  if (archives.size === 0) {
    fail('APPEND_ONLY no document is declared APPEND_ONLY_ARCHIVE; the append-only rule has nothing to enforce');
    return;
  }
  /** @type {Map<string, Set<string>>} */
  const corrections = new Map();
  // A-01: correction registrations live in config/document-role-corrections.v1.json
  // (append-only, checkpoint-neutral). The retired inline array is a
  // compatibility fallback only.
  const loadedCorrections = loadDocumentRoleCorrections(root);
  if (!loadedCorrections.ok) {
    fail(`APPEND_ONLY correction registry is invalid: ${loadedCorrections.errors.join(';')}`);
    return;
  }
  for (const correction of loadedCorrections.corrections) {
    if (typeof correction.path !== 'string' || typeof correction.oldLineSha256 !== 'string') continue;
    if (!archives.has(correction.path)) continue;
    if (!corrections.has(correction.path)) corrections.set(correction.path, new Set());
    corrections.get(correction.path).add(correction.oldLineSha256);
  }
  const base = resolveArchiveDiffBase();
  if (base === null) {
    fail('APPEND_ONLY could not resolve a Git diff base; the append-only rule cannot be evaluated fail-closed');
    return;
  }
  // The exempt structure is read from the base revision, so the exemption
  // cannot be widened by an uncommitted edit to the working file.
  const currentStateBase = gitResult(['show', `${base}:docs/CURRENT_STATE.md`]);
  if (currentStateBase.status !== 0) {
    fail(`APPEND_ONLY could not read docs/CURRENT_STATE.md at ${base}; the machine-block exemption cannot be evaluated`);
    return;
  }
  const exemptRanges = machineBlockLineRanges(currentStateBase.stdout ?? '');
  const isExempt = (file, oldLine) => file === 'docs/CURRENT_STATE.md'
    && exemptRanges.some(([start, end]) => oldLine >= start && oldLine <= end);

  const result = gitResult(['diff', '--unified=0', '--no-color', '--no-ext-diff', base, '--', ...archives]);
  if (result.status !== 0) {
    fail(`APPEND_ONLY git diff against ${base} failed: ${(result.stderr ?? '').trim()}`);
    return;
  }
  let currentFile = null;
  let oldLine = 0;
  for (const line of (result.stdout ?? '').split('\n')) {
    const header = /^diff --git a\/(.+) b\/(.+)$/.exec(line);
    if (header !== null) {
      currentFile = header[2] ?? null;
      continue;
    }
    const hunk = /^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@/.exec(line);
    if (hunk !== null) {
      oldLine = Number(hunk[1]);
      continue;
    }
    if (line.startsWith('--- ') || line.startsWith('+++ ')) continue;
    if (line.startsWith('-')) {
      const removed = line.slice(1);
      const removedAt = oldLine;
      oldLine += 1;
      if (currentFile === null || !archives.has(currentFile)) continue;
      if (isExempt(currentFile, removedAt)) continue;
      const digest = sha256Prefix(removed);
      if (corrections.get(currentFile)?.has(digest) === true) continue;
      fail(`APPEND_ONLY ${currentFile}:${removedAt} modifies or deletes an existing line (${digest}); the archive may only be appended to, or the line must be covered by a declared correction`);
    }
  }
}

/**
 * Group 7 / F-08 — status words get the same ledger treatment numbers have.
 *
 * The ledger is `GOVERNED_STATUS_KEYS` in the census-figure module: declared
 * keys and their current values. Only declared keys are governed. A document
 * stating a governed key must state the current value (optionally extended by
 * a parenthetical state) or sit on a line that names the checkpoint it
 * describes. The README measured-status block is part of the same authority:
 * it must state the required keys, including the lanes that have never
 * executed, rather than omitting them.
 */
export const README_STATUS_BLOCK_BEGIN = '<!--status-block:begin-->';
export const README_STATUS_BLOCK_END = '<!--status-block:end-->';

const normalizeStatusToken = (value) => String(value).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

/**
 * Derive `LIVE_TASK_STATUS` from the active task identity preamble
 * (`.agent/ACTIVE_TASK.md`), never from a literal in `src/`. Deliberately
 * narrow: only `Status:` before the first section heading is authority, the
 * same shape `bin/lib/session-authority.mjs` admits. Fail closed: a derived
 * key must not fall back to a guessed or stale value.
 */
export function deriveActiveTaskStatus() {
  let text;
  try {
    text = readDataFile('.agent/ACTIVE_TASK.md');
  } catch {
    return null;
  }
  const preamble = String(text).split(/\r?\n/).reduce((accumulator, line) => {
    if (accumulator.done) return accumulator;
    if (/^##\s+/.test(line)) return { lines: accumulator.lines, done: true };
    accumulator.lines.push(line);
    return accumulator;
  }, { lines: [], done: false }).lines.join('\n');
  const match = /^[ \t]*Status:[ \t]*(.+?)[ \t]*$/m.exec(preamble);
  return match === null ? null : normalizeStatusToken(match[1]);
}

export function parseGovernedStatusLedger(rule) {
  const source = readIncludingComments('src/core/source/censusFigureLedger.ts');
  const block = /export const GOVERNED_STATUS_KEYS[\s\S]*?Object\.freeze\(\[([\s\S]*?)\]\);/m.exec(source);
  if (block === null) {
    fail(`${rule} cannot read the GOVERNED_STATUS_KEYS declaration; the status ledger is missing`);
    return null;
  }
  // The entry regex accepts the quoted literal form and the bare derived
  // sentinel identifier (`currentValue: DERIVED_FROM_ACTIVE_TASK`). A bare
  // identifier that is neither the sentinel nor derived is refused: silently
  // dropping the entry would un-govern the key, which is the exact widening
  // this ledger exists to prevent.
  const entryPattern = /\{ key: '([A-Z0-9_]+)', currentValue: (?:'([A-Z0-9_]+)'|([A-Z][A-Z0-9_]*))([^}]*)\}/g;
  const entries = [...block[1].matchAll(entryPattern)]
    .map((match) => {
      const tail = match[4] ?? '';
      return {
        key: match[1],
        currentValue: match[2] ?? match[3],
        bare: match[2] === undefined,
        derivedFromActiveTask: tail.includes("derivedFrom: 'ACTIVE_TASK_STATUS'"),
        requiredInReadme: tail.includes('requiredInReadme: true'),
      };
    });
  for (const entry of entries) {
    if (!entry.bare) continue;
    if (entry.currentValue === 'DERIVED_FROM_ACTIVE_TASK' && entry.derivedFromActiveTask) continue;
    fail(`${rule} governed status key ${entry.key} uses a non-literal currentValue that is not the derived active-task sentinel`);
    return null;
  }
  if (entries.length < 60) {
    fail(`${rule} parsed only ${entries.length} governed status keys; the ledger is broken rather than the documents clean`);
    return null;
  }
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.key)) fail(`${rule} governed status key ${entry.key} is declared more than once`);
    seen.add(entry.key);
    if (!entry.derivedFromActiveTask) continue;
    // R2-N6: the task lifecycle value is derived from the active task at
    // check time, so opening or closing a task never edits src/.
    const derived = deriveActiveTaskStatus();
    if (derived === null) {
      fail(`${rule} cannot derive ${entry.key} from .agent/ACTIVE_TASK.md; a derived key must not fall back to a literal`);
      return null;
    }
    entry.currentValue = derived;
  }
  return entries;
}

export function checkGovernedStatusWords() {
  const ledger = parseGovernedStatusLedger('STATUS_WORD');
  if (ledger === null) return;
  const config = readDocumentRoleConfig('STATUS_WORD');
  if (config === null) return;
  const documents = (config.documents ?? [])
    .map((entry) => entry.path)
    .filter((file) => typeof file === 'string')
    .map((file) => ({ path: file, text: readIncludingComments(file) }));
  // The README is not under docs/, but §5's current-truth instruction points a
  // reader at it, so a governed status there is governed here too.
  documents.push({ path: 'README.md', text: readDataFile('README.md') });

  const isHistorical = (line) => (
    /<!--status:historical[^>]*?(?:\d{4}-\d{2}-\d{2}|[0-9a-f]{7,40})[^>]*?-->/u.test(line)
    || /\d{4}-\d{2}-\d{2}/.test(line)
    || /\b[0-9a-f]{7,40}\b/.test(line)
    || /supersed|previously|at the time|terminal|archiv/i.test(line)
  );
  const normalize = normalizeStatusToken;
  let statements = 0;
  for (const document of documents) {
    const lines = document.text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      for (const entry of ledger) {
        const table = new RegExp(`\\|\\s*\`?${entry.key}\`?\\s*\\|\\s*\`([^\`]+)\``).exec(line);
        const field = new RegExp(`\\b${entry.key}\\b\\s*[:=]\\s*\`?\\s*([A-Za-z0-9_]+)`).exec(line);
        const statedValues = [];
        if (table?.[1] !== undefined) statedValues.push(table[1]);
        if (field?.[1] !== undefined) statedValues.push(field[1]);
        for (const stated of statedValues) {
          statements += 1;
          const value = normalize(stated);
          if (value === entry.currentValue || value.startsWith(`${entry.currentValue}_`)) continue;
          if (isHistorical(line)) continue;
          fail(`STATUS_WORD ${document.path}:${index + 1} states ${entry.key}: ${value} but the ledger's current value is ${entry.currentValue}; state the current value or add an explicit historical-checkpoint qualifier`);
        }
      }
    }
  }
  // Non-vacuous: the scan must actually see governed statements.
  if (statements === 0) fail('STATUS_WORD found zero governed status statements; the scan is broken rather than the documents clean');

  // --- lane-class counts stay tied to the lane-state ledger ---
  let laneState;
  try {
    laneState = JSON.parse(readDataFile('config/validation-lane-state.v1.json'));
  } catch (error) {
    fail(`STATUS_WORD cannot read config/validation-lane-state.v1.json: ${error instanceof Error ? error.message : String(error)}`);
    laneState = null;
  }
  if (laneState !== null && Array.isArray(laneState.lanes)) {
    const byClass = new Map();
    for (const lane of laneState.lanes) byClass.set(lane.class, (byClass.get(lane.class) ?? 0) + 1);
    const declaredCounts = new Map(ledger.map((entry) => [entry.key, entry.currentValue]));
    const expectedProven = Number(declaredCounts.get('VALIDATION_LANE_PROVEN_COUNT') ?? '');
    const expectedStale = Number(declaredCounts.get('VALIDATION_LANE_STALE_EVIDENCE_COUNT') ?? '');
    const expectedBlocked = Number(declaredCounts.get('VALIDATION_LANE_BLOCKED_EXTERNAL_COUNT') ?? '');
    const expectedUnavailable = Number(declaredCounts.get('VALIDATION_LANE_UNAVAILABLE_CAPABILITY_COUNT') ?? '');
    const laneCount = laneState.lanes.length;
    const provenClass = byClass.get('PROVEN') ?? 0;
    const blockedClass = byClass.get('BLOCKED_EXTERNAL') ?? 0;
    const unavailableClass = byClass.get('UNAVAILABLE_CAPABILITY') ?? 0;
    if (expectedProven + expectedStale !== provenClass) {
      fail(`STATUS_WORD the ledger declares ${expectedProven} PROVEN + ${expectedStale} STALE lanes but validation-lane-state declares ${provenClass} PROVEN lanes`);
    }
    if (expectedBlocked !== blockedClass || expectedUnavailable !== unavailableClass) {
      fail(`STATUS_WORD the ledger declares BLOCKED_EXTERNAL=${expectedBlocked} UNAVAILABLE_CAPABILITY=${expectedUnavailable} but validation-lane-state declares ${blockedClass} and ${unavailableClass}`);
    }
    if (expectedProven + expectedStale + expectedBlocked + expectedUnavailable !== laneCount) {
      fail(`STATUS_WORD ledger lane-class counts do not cover the ${laneCount} declared lanes`);
    }
    // The README's per-lane entries are governed by lane id, not by a prose
    // paraphrase: a lane whose class changes changes the required README value.
    const laneById = new Map(laneState.lanes.map((lane) => [lane.laneId, lane]));
    for (const [ledgerKey, laneId] of [
      ['EXACT_CHECKPOINT_CI_LANE', 'exact-checkpoint-ci'],
      ['OWNER_MANUAL_LANE', 'owner-manual'],
      ['DEPENDENCY_ADVISORY_LANE', 'dependency-advisory'],
    ]) {
      const lane = laneById.get(laneId);
      const declared = declaredCounts.get(ledgerKey);
      if (lane === undefined) fail(`STATUS_WORD validation-lane-state declares no lane ${laneId} for ${ledgerKey}`);
      else if (declared !== lane.class) fail(`STATUS_WORD the ledger declares ${ledgerKey}=${String(declared)} but lane ${laneId} is ${String(lane.class)}`);
    }
    const liveAppSmoke = declaredCounts.get('LIVE_APP_SMOKE_LANE');
    const ownerManual = laneById.get('owner-manual');
    if (ownerManual !== undefined && liveAppSmoke !== ownerManual.class) {
      fail(`STATUS_WORD the ledger declares LIVE_APP_SMOKE_LANE=${String(liveAppSmoke)} but its lane owner-manual is ${String(ownerManual.class)}`);
    }
  }

  // --- the README status block is governed ---
  const readme = readDataFile('README.md');
  const begin = readme.indexOf(README_STATUS_BLOCK_BEGIN);
  const end = readme.indexOf(README_STATUS_BLOCK_END);
  if (begin < 0 || end < 0 || end <= begin) {
    fail(`STATUS_WORD README.md must carry the ledger-governed measured-status block delimited by ${README_STATUS_BLOCK_BEGIN} and ${README_STATUS_BLOCK_END}`);
    return;
  }
  const blockText = readme.slice(begin, end);
  const tags = new Map([...blockText.matchAll(/<!--status:([A-Z0-9_]+)=([A-Za-z0-9_]+)-->/g)].map((match) => [match[1], match[2]]));
  if (tags.size === 0) fail('STATUS_WORD the README measured-status block carries no governed tags; a block that states nothing proves nothing');
  for (const entry of ledger) {
    if (entry.requiredInReadme !== true) continue;
    const stated = tags.get(entry.key);
    if (stated === undefined) {
      fail(`STATUS_WORD the README measured-status block omits ${entry.key}; absence must be stated, not omitted`);
    } else if (stated !== entry.currentValue) {
      fail(`STATUS_WORD the README measured-status block states ${entry.key}=${stated} but the ledger's current value is ${entry.currentValue}`);
    }
  }
}

/**
 * A-01 / D2 — the checkpoint-neutral binding files keep their closed shape.
 *
 * `config/release-evidence.v1.json` and `config/document-role-corrections.v1.json`
 * are documentation-only for a commit ONLY behind their diff-shape guards, and
 * those guards key on exactly what this rule polices: a closed schema and a
 * fixed subject closure. A non-binding key, a mutated or unknown subject, or a
 * malformed value therefore fails here — and classifies substantive for any
 * commit that carries it — instead of laundering a structural change through
 * the documentary checkpoint path.
 */
export function checkReleaseEvidenceBindings() {
  const evidence = loadReleaseEvidenceBindings(root, { requireFile: true });
  if (!evidence.ok) {
    fail(`BINDINGS config/release-evidence.v1.json violates its closed schema: ${evidence.errors.join(';')}`);
    return;
  }
  const expected = new Set();
  try {
    const certification = JSON.parse(readIncludingComments('config/release-certification.v1.json'));
    for (const condition of Array.isArray(certification.conditions) ? certification.conditions : []) {
      if (condition !== null && typeof condition === 'object' && typeof condition.id === 'string') expected.add(condition.id);
    }
  } catch (error) {
    fail(`BINDINGS cannot read config/release-certification.v1.json for subject closure: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  try {
    const laneState = JSON.parse(readIncludingComments('config/validation-lane-state.v1.json'));
    for (const lane of Array.isArray(laneState.lanes) ? laneState.lanes : []) {
      if (lane !== null && typeof lane === 'object' && typeof lane.laneId === 'string') expected.add(lane.laneId);
    }
  } catch (error) {
    fail(`BINDINGS cannot read config/validation-lane-state.v1.json for subject closure: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  if (expected.size === 0) {
    fail('BINDINGS subject closure resolved zero subjects; the closure sources are broken rather than the bindings clean');
    return;
  }
  const actual = new Set(evidence.bySubject.keys());
  for (const subject of expected) {
    if (!actual.has(subject)) fail(`BINDINGS subject ${subject} (certification condition or validation lane) is unbound in config/release-evidence.v1.json`);
  }
  for (const subject of actual) {
    if (!expected.has(subject)) fail(`BINDINGS subject ${subject} is neither a certification condition nor a validation lane; a mutated or invented subject is structural`);
  }
  const corrections = loadDocumentRoleCorrections(root);
  if (!corrections.ok) {
    fail(`BINDINGS config/document-role-corrections.v1.json violates its closed schema: ${corrections.errors.join(';')}`);
  }
}
