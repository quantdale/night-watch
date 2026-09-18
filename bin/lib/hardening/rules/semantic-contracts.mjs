#!/usr/bin/env node
// @ts-check

/**
 * Invariant family: semantic oracle core purity and integration seams.
 *
 * Phases 9, 9A.1, 9B, 10, 10A/B, 12, 18 and 22, plus the derived-semantics,
 * spec-expectation and EIG boundaries. Each phase contributes the same paired
 * shape: the pure core has no ambient authority (no eval, child process, fs,
 * network, database, AI, self-dev or persistence), and the integration seam is
 * the single declared place that core meets the rest of the system.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  root,
  fail,
  withoutComments,
  readIncludingComments,
  read,
  readDataFile,
  gitFiles,
} from '../kernel.mjs';

/**
 * Phase 9 semantic-core purity (SPEC §76-79): the projections, expectations,
 * invariants, and semantic oracle modules must be deterministic local
 * computation only — no AI, no selfDev/promotion, no DB/infra, no network
 * transport, no child process, no persistence, no campaign/authority
 * imports, no application-code execution.
 */
export function checkPhase9SemanticCorePurity() {
  const phase9Directories = [
    'src/oracles/projections/',
    'src/oracles/expectations/',
    'src/oracles/invariants/',
    'src/oracles/semantic/',
  ];
  // Walk the Phase 9 source directories directly (works on the uncommitted
  // working tree too; the directories are shallow and bounded).
  const files = [];
  for (const directory of phase9Directories) {
    const absolute = path.join(root, directory);
    if (!fs.existsSync(absolute)) continue;
    for (const entry of fs.readdirSync(absolute)) {
      if (entry.endsWith('.ts')) files.push(`${directory}${entry}`);
    }
  }
  if (files.length < 8) fail('Phase 9 semantic core source files are missing');
  for (const file of files) {
    const source = readIncludingComments(file);
    // Phase 13H: campaignTargetMapping is a fixed mapping bridge that type-imports
    // the bundle type; this is pure and does not grant runtime campaign authority.
    const isCampaignTargetMapping = file === 'src/oracles/semantic/campaignTargetMapping.ts';
    const sourceForImportCheck = isCampaignTargetMapping
      ? source.replace(/import\s+type\s+\{[^}]*\}\s+from\s+['"][^'"]*campaign[^'"]*['"]/gi, '')
      : source;
    if (/import\s+[^;]*from\s+['"][^'"]*(?:aiReview|selfDev|selfDevPromotion|selfDevSandbox|phase6|database|infrastructure|dynamo|bigquery|spanner|kubectl|gcloud|aws|child_process|node:http|node:https|node:net|node:dns|node:fs|node:fetch|undici|WebSocket|playwright|campaign|products?|oops)[^'"]*['"]/i.test(sourceForImportCheck)) {
      fail(`${file} imports a forbidden AI/selfDev/Phase6/infra/transport/persistence/authority module`);
    }
    if (/\b(?:child_process|fetch\s*\(|spawn\s*\(|exec(?:File)?\s*\(|writeFile|appendFile|createWriteStream|writeImmutableJson|PrivateArtifactStore|renameSync|unlinkSync|mkdirSync)\b/i.test(source)) {
      fail(`${file} exposes a process, network, or persistence capability`);
    }
  }
}

/**
 * Phase 9 integration seams (SPEC §44, §45, §48): the safe finding path must
 * be wired through the observer hook, the Phase 5 composed stage, and the
 * campaign dossier evidence, without weakening the protocol oracles.
 */
export function checkPhase9IntegrationSeams() {
  const observer = readIncludingComments('src/browser/observers/networkObserver.ts');
  const observerCode = read("src/browser/observers/networkObserver.ts");
  if (!/semanticOracle\?:/.test(observerCode) || !/evaluateSemanticHook/.test(observerCode) || !/semanticFindings\(\)/.test(observerCode)) {
    fail('network observer is missing the Phase 9 semantic hook or findings ledger');
  }
  if (!/checkUnexpectedStatus/.test(observerCode)) fail('network observer lost the protocol oracle wiring');
  const phase5Semantic = read('src/api/phase5/semantic.ts');
  if (!/evaluateApiResponseSemantic/.test(phase5Semantic) || !/evaluateApiResponse\(/.test(phase5Semantic)) {
    fail('Phase 5 semantic stage must compose the existing protocol oracle');
  }
  if (!/ORACLE_PASS/.test(phase5Semantic)) fail('Phase 5 semantic stage must gate on protocol ORACLE_PASS');
  const orchestrator = readIncludingComments('src/core/campaign/orchestrator.ts');
  const orchestratorCode = read("src/core/campaign/orchestrator.ts");
  if (!/toSemanticDossierEvidence/.test(orchestratorCode)) fail('campaign orchestrator must attach semantic dossier evidence');
  const dossier = readIncludingComments('src/core/triage/dossier.ts');
  const dossierCode = read("src/core/triage/dossier.ts");
  // The dossier core carries the sanitized evidence and delegates its
  // validation to the runtime-validation module, which owns the semantic
  // contract. Assert BOTH halves against code, never against prose: requiring
  // `validateSemanticDossierEvidence` inside dossier.ts was satisfied only by a
  // comment naming the symbol, so the delegation could have been deleted
  // without the rule noticing.
  if (!/semanticEvidence/.test(dossierCode) || !/validateDossierRuntime/.test(dossierCode)) {
    fail('dossier must carry sanitized semantic evidence and delegate to the runtime validator');
  }
  const dossierRuntimeCode = read('src/core/triage/dossierRuntimeValidation.ts');
  if (!/validateSemanticDossierEvidence/.test(dossierRuntimeCode) || !/DOSSIER_SEMANTIC_EVIDENCE/.test(dossierRuntimeCode)) {
    fail('dossier runtime validation must strictly validate sanitized semantic evidence');
  }
}

/**
 * Phase 9A.1 real-source expectation core purity: the recipe/extractor/
 * admission/resolver/receipt cores must not execute application code, spawn
 * child processes, touch the filesystem/network, import AI/selfDev/Phase6,
 * or persist anything. The ONLY sibling-source access lives in
 * src/core/source/siblingSource.ts behind injected interfaces.
 */
export function checkPhase9A1RealSourceCorePurity() {
  const directories = [
    'src/oracles/expectations/recipes/',
    'src/oracles/expectations/extract/',
  ];
  const singleFiles = [
    'src/oracles/expectations/admission.ts',
    'src/oracles/expectations/resolver.ts',
    'src/oracles/semantic/receipts.ts',
    'src/oracles/semantic/hook.ts',
  ];
  const files = [...singleFiles];
  for (const directory of directories) {
    const absolute = path.join(root, directory);
    if (!fs.existsSync(absolute)) continue;
    for (const entry of fs.readdirSync(absolute)) {
      if (entry.endsWith('.ts')) files.push(`${directory}${entry}`);
    }
  }
  if (files.length < 6) fail('Phase 9A.1 real-source core source files are missing');
  for (const file of files) {
    const source = readIncludingComments(file);
    if (/import\s+[^;]*from\s+['"][^'"]*(?:aiReview|selfDev|selfDevPromotion|selfDevSandbox|phase6|database|infrastructure|dynamo|bigquery|spanner|kubectl|gcloud|aws|child_process|node:http|node:https|node:net|node:dns|node:fs|node:fetch|undici|WebSocket|playwright|campaign|products?|oops|runRecorder|storage|dossier|artifacts)[^'"]*['"]/i.test(source)) {
      fail(`${file} imports a forbidden AI/selfDev/Phase6/infra/transport/persistence/authority module`);
    }
    if (/\b(?:eval\s*\(|new\s+Function\s*\(|child_process|spawn\s*\(|(?<!\.)exec(?:File)?\s*\(|writeFile|appendFile|createWriteStream|writeImmutableJson|PrivateArtifactStore|renameSync|unlinkSync|mkdirSync|rmSync)\b/i.test(source)) {
      fail(`${file} exposes a code-execution, process, network, or persistence capability`);
    }
  }
}

/**
 * Phase 9A.1 sibling-source reader boundary: the ONLY fs-touching module is
 * strictly READ-ONLY, path-confined, and never spawns processes or touches
 * the network. Write primitives are structurally forbidden.
 */
export function checkPhase9A1SourceReaderBoundary() {
  const reader = readIncludingComments('src/core/source/siblingSource.ts');
  const readerCode = read("src/core/source/siblingSource.ts");
  if (!/createSiblingSourceAccess/.test(readerCode) || !/resolveGitHead/.test(readerCode)) {
    fail('sibling source access module is missing its factory/HEAD resolver');
  }
  if (!/readFileSync|existsSync/.test(readerCode)) fail('sibling source reader must be fs read-only');
  if (/\b(?:writeFileSync|appendFileSync|createWriteStream|mkdirSync|renameSync|unlinkSync|rmSync|copyFileSync|chmodSync|chownSync)\b/.test(reader)) {
    fail('sibling source reader exposes a write capability');
  }
  if (/child_process|spawn\s*\(|(?<!\.)exec(?:File)?\s*\(|node:http|node:https|node:net|node:dns|node:fetch|undici|WebSocket/.test(reader)) {
    fail('sibling source reader must never spawn processes or touch the network');
  }
  // Phase 25 replaces the old lexical-prefix assertion with a structural
  // no-follow containment proof: repo IDs and resolved files are checked
  // beneath the approved root, every existing component is lstat-checked,
  // and regular files are opened with O_NOFOLLOW. Keep this guard focused on
  // those authority properties rather than matching one implementation's
  // string spelling.
  if (!/isPathInside\(candidate,\s*resolvedRoot\)/.test(readerCode) || !/isPathInside\(file,\s*repoRoot\)/.test(readerCode)) fail('sibling source reader must confine paths to the configured root');
  if (!/hasNoSymlinkPath\(file\)/.test(readerCode) || !/O_NOFOLLOW/.test(readerCode) || !/lstatSync/.test(readerCode)) fail('sibling source reader must reject symlink paths before opening files');

  // Phase 25 keeps enumeration and scan coordination subordinate to the same
  // source authority. No sibling-source filesystem import may appear in a
  // coordinator, DTO, or analyzer module.
  for (const file of gitFiles().filter((item) => item.startsWith('src/core/source/') && item.endsWith('.ts') && item !== 'src/core/source/siblingSource.ts')) {
    const source = readIncludingComments(file);
    if (/from\s+['"]node:fs['"]|from\s+['"]node:child_process['"]|from\s+['"]node:(?:net|http|https|dns)['"]/.test(source)) fail(`${file} bypasses the confined sibling source authority`);
    // `(?<!\.)` before `exec` is load-bearing, and its absence was a latent
    // false positive: `RegExp.prototype.exec` is not process execution, and
    // this pattern could not tell `cp.exec(` from `pattern.exec(`. The sibling
    // rule eighteen lines above already spells it this way. It stayed hidden
    // because the only file in this cone that used `.exec()` was
    // `siblingSource.ts`, which the loop excludes; C-08 was the first admitted
    // module to use it and the rule fired on correct code. `child_process` is
    // added to the alternation so tightening `exec` cannot weaken the rule.
    if (/\b(?:writeFile|appendFile|renameSync|unlinkSync|rmSync|mkdirSync|chmodSync|child_process|spawn|(?<!\.)exec(?:File)?|fetch)\s*\(/.test(source)) fail(`${file} exposes source write/process/network authority`);
  }
  const scan = read('src/core/source/scan.ts');
  const scanTypes = readIncludingComments('src/core/source/scanTypes.ts');
  const scanTypesCode = read("src/core/source/scanTypes.ts");
  if (!/enumerateFiles/.test(readerCode) || !/scanSource/.test(scan) || !/configDigest/.test(scanTypesCode)) fail('Phase 25 source inventory is not wired through the confined reader and versioned config');
  if (/readonly\s+(?:sourceText|rawSource|sourceCode)\s*[:?]/.test(scanTypes)) fail('Phase 25 persisted source DTOs contain raw source text fields');
}

/**
 * Phase 9A.1 integration seams: receipts + the evaluation ledger are wired
 * through the observer; the hook is total (never silent); the Phase 5
 * composed stage exposes receipt outcomes.
 */
export function checkPhase9A1IntegrationSeams() {
  const observer = readIncludingComments('src/browser/observers/networkObserver.ts');
  const observerCode = read("src/browser/observers/networkObserver.ts");
  if (!/semanticEvaluations\(\)/.test(observerCode) || !/semanticEvaluationLedgerOverflow\(\)/.test(observerCode)) {
    fail('network observer is missing the Phase 9A.1 evaluation ledger or its explicit overflow flag');
  }
  if (!/buildInternalErrorReceipt/.test(observerCode)) fail('network observer is missing the safe INTERNAL_ERROR receipt fallback');
  if (!/privacyViolation/.test(observerCode) || !/semantic-privacy-contract-violation/.test(observerCode)) {
    fail('network observer is missing the privacy-contract violation escalation');
  }
  const hook = readIncludingComments('src/oracles/semantic/hook.ts');
  const hookCode = read("src/oracles/semantic/hook.ts");
  if (!/evaluateSemanticResolution/.test(hookCode) || !/receipt: SemanticEvaluationReceipt \| null/.test(hookCode)) {
    fail('semantic hook must return a safe evaluation receipt');
  }
  if (!/NO_EXPECTATION/.test(hookCode)) fail('semantic hook lost the NO_EXPECTATION outcome');
  const phase5Semantic = read('src/api/phase5/semantic.ts');
  if (!/receipt: SemanticEvaluationReceipt \| null/.test(phase5Semantic)) {
    fail('Phase 5 semantic stage must expose the evaluation receipt');
  }
  const resolver = readIncludingComments('src/oracles/expectations/resolver.ts');
  const resolverCode = read("src/oracles/expectations/resolver.ts");
  if (!/RESOLVED/.test(resolverCode) || !/SOURCE_STALE/.test(resolverCode) || !/SOURCE_UNAVAILABLE/.test(resolverCode)) {
    fail('real-source resolver lost the fail-closed resolution vocabulary');
  }
}

/**
 * Phase 9B core purity: the freshness classifier, preflight evaluator, and
 * pass-summary modules are PURE — no network, no fs, no child processes, no
 * persistence, no eval, no AI/selfDev/Phase6 imports. The runner collects the
 * facts (remote SHAs, diffs, derivation, proxy/auth booleans) and injects
 * them; the core never performs I/O.
 */
export function checkPhase9bCorePurity() {
  const files = [
    'src/core/phase9b/freshness.ts',
    'src/core/phase9b/preflight.ts',
    'src/core/phase9b/summary.ts',
  ];
  for (const file of files) {
    const source = readIncludingComments(file);
    if (/import\s+[^;]*from\s+['"][^'"]*(?:node:fs|node:http|node:https|node:net|node:dns|node:fetch|undici|WebSocket|child_process|aiReview|selfDev|selfDevPromotion|selfDevSandbox|phase6|database|infrastructure|dynamo|bigquery|spanner|kubectl|gcloud|playwright|runRecorder|storage|dossier|artifacts)[^'"]*['"]/i.test(source)) {
      fail(`${file} imports a forbidden fs/network/process/AI/selfDev/Phase6/persistence/authority module`);
    }
    if (/\b(?:eval\s*\(|new\s+Function\s*\(|child_process|spawn\s*\(|(?<!\.)exec(?:File)?\s*\(|writeFile|appendFile|createWriteStream|mkdirSync|rmSync|unlinkSync|renameSync|fetch\s*\(|node:fs)\b/i.test(source)) {
      fail(`${file} exposes a code-execution, process, network, or persistence capability`);
    }
  }
}

/**
 * Phase 9B integration seams: the context exposes the optional semantic
 * oracle and passes it to the network observer; the Phase 9B runner is
 * gated by the one-shot launcher flag and fixes the common-exchange journey.
 */
export function checkPhase9bIntegrationSeams() {
  const context = readIncludingComments('src/browser/context.ts');
  const contextCode = read("src/browser/context.ts");
  if (!/semanticOracle\?: SemanticResponseOracle/.test(contextCode)) {
    fail('context is missing the optional Phase 9B semanticOracle option');
  }
  if (!/semanticOracle: opts\.semanticOracle/.test(contextCode)) {
    fail('context does not pass the semantic oracle to the network observer');
  }
  const runner = readIncludingComments('tests/manual/phase9b-contained-dev-semantic.ts');
  const runnerCode = read("tests/manual/phase9b-contained-dev-semantic.ts");
  if (!/NIGHTWATCH_PHASE_9B_REAL/.test(runnerCode)) {
    fail('Phase 9B runner is missing the one-shot real-run gate');
  }
  if (!/const SELECTED_JOURNEY_ID = 'ripple-common-exchange-read'/.test(runnerCode)) {
    fail('Phase 9B runner lost its fixed common-exchange journey');
  }
  if (/NIGHTWATCH_PHASE_2B_JOURNEY_ID/.test(runner)) {
    fail('Phase 9B runner must not accept journey selection');
  }
  if (!/NIGHTWATCH_UI_URL is not accepted/.test(runnerCode)) {
    fail('Phase 9B runner must reject any UI URL override');
  }
  const launcher = readIncludingComments('bin/phase9b-launcher-args.mjs');
  const launcherCode = read("bin/phase9b-launcher-args.mjs");
  if (!/no journey selector/.test(launcherCode) || !/--ui-url/.test(launcherCode)) {
    fail('Phase 9B launcher must reject journey/URL selectors');
  }
}

/**
 * Phase 10A deeper-contract core purity: the v2 recipe / type-flow extractor
 * / admission / resolver / invariant surfaces must not execute code (PHP,
 * eval, Function), spawn child processes, touch the filesystem/network, or
 * import AI/selfDev/Phase6/infra/campaign/persistence modules. Read-only
 * source text is injected through the existing RealSourceReader interface.
 */
export function checkPhase10DeeperContractPurity() {
  const files = [
    'src/oracles/expectations/recipes/types.ts',
    'src/oracles/expectations/recipes/validator.ts',
    'src/oracles/expectations/recipes/registry.ts',
    'src/oracles/expectations/extract/php.ts',
    'src/oracles/expectations/extract/evidence.ts',
    'src/oracles/expectations/admission.ts',
    'src/oracles/expectations/resolver.ts',
    'src/oracles/expectations/types.ts',
    'src/oracles/expectations/validator.ts',
    'src/oracles/invariants/evaluate.ts',
    'src/oracles/semantic/oracle.ts',
  ];
  for (const file of files) {
    const source = readIncludingComments(file);
    if (/import\s+[^;]*from\s+['"][^'"]*(?:aiReview|selfDev|selfDevPromotion|selfDevSandbox|phase6|database|infrastructure|dynamo|bigquery|spanner|kubectl|gcloud|aws|child_process|node:http|node:https|node:net|node:dns|node:fs|node:fetch|undici|WebSocket|playwright|campaign|products?|oops|runRecorder|storage|dossier|artifacts|triage)[^'"]*['"]/i.test(source)) {
      fail(`${file} imports a forbidden AI/selfDev/Phase6/infra/transport/persistence/authority module`);
    }
    if (/\b(?:eval\s*\(|new\s+Function\s*\(|child_process|spawn\s*\(|(?<!\.)exec(?:File)?\s*\(|writeFile|appendFile|createWriteStream|writeImmutableJson|PrivateArtifactStore|renameSync|unlinkSync|mkdirSync|rmSync|fetch\s*\()/i.test(source)) {
      fail(`${file} exposes a code-execution, process, network, or persistence capability`);
    }
  }
}

/**
 * Phase 10A integration seams: the v2 recipe schema (2 v2 + 2 v1 registry
 * mix), the type-flow extractor, the TYPE_IN_SET invariant vocabulary, the
 * fail-closed extraction dispatch (admission + resolver), and the evidence
 * digest binding are all wired.
 */
export function checkPhase10IntegrationSeams() {
  const registry = readIncludingComments('src/oracles/expectations/recipes/registry.ts');
  const registryCode = read("src/oracles/expectations/recipes/registry.ts");
  if (!/nightwatch\.real-source-expectation-recipe\.v2/.test(registryCode)) {
    fail('recipe registry is missing the v2 schema constant');
  }
  const extractor = readIncludingComments('src/oracles/expectations/extract/php.ts');
  const extractorCode = read("src/oracles/expectations/extract/php.ts");
  if (!/PHP_ITEM_FIELD_TYPE_FLOW/.test(extractorCode) || !/extractPhpItemFieldTypeFlow/.test(extractorCode)) {
    fail('type-flow extractor is missing from the PHP extractor module');
  }
  if (!/EMPTY_CAST_OBJECT/.test(extractorCode) || !/EMPTY_ARRAY_OR_STRING_KEYS/.test(extractorCode)) {
    fail('type-flow extractor lost a fixed pattern');
  }
  const expectationTypes = read('src/oracles/expectations/types.ts');
  if (!/TYPE_IN_SET/.test(expectationTypes)) fail('TYPE_IN_SET is missing from the invariant vocabulary');
  const invariantEval = read('src/oracles/invariants/evaluate.ts');
  if (!/case 'TYPE_IN_SET'/.test(invariantEval)) fail('TYPE_IN_SET evaluation case is missing');
  const oracle = readIncludingComments('src/oracles/semantic/oracle.ts');
  const oracleCode = read("src/oracles/semantic/oracle.ts");
  if (!/case 'TYPE_IN_SET':\n\s+case 'TYPE_MATCH':/.test(oracleCode) && !/TYPE_IN_SET[\s\S]{0,200}TYPE_CONTRADICTED/.test(oracleCode)) {
    fail('semantic oracle lost the TYPE_IN_SET -> TYPE_CONTRADICTED class mapping');
  }
  const evidence = readIncludingComments('src/oracles/expectations/extract/evidence.ts');
  const evidenceCode = read("src/oracles/expectations/extract/evidence.ts");
  if (!/PHP_ITEM_FIELD_TYPE_FLOW/.test(evidenceCode) || !/unsupported-extraction-kind/.test(evidenceCode)) {
    fail('evidence digest must bind the type-flow extraction and fail closed on unknown kinds');
  }
  const admission = readIncludingComments('src/oracles/expectations/admission.ts');
  const admissionCode = read("src/oracles/expectations/admission.ts");
  if (!/TYPE_FLOW_AMBIGUOUS/.test(admissionCode) || !/TYPE_FLOW_CONTRACT_MISMATCH/.test(admissionCode)) {
    fail('admission lost the type-flow fail-closed vocabulary');
  }
  const resolver = readIncludingComments('src/oracles/expectations/resolver.ts');
  const resolverCode = read("src/oracles/expectations/resolver.ts");
  if (!/PHP_ITEM_FIELD_TYPE_FLOW/.test(resolverCode)) fail('resolver must re-extract the type-flow evidence');
  const corpus = readIncludingComments('corpus/phase10/source-fixture/phase10Fixtures.ts');
  const corpusCode = read("corpus/phase10/source-fixture/phase10Fixtures.ts");
  if (!/real-source-expectation-recipe\.v2/.test(corpusCode)) fail('Phase 10 fixture corpus is missing v2 fixture recipes');
  const historical = readIncludingComments('corpus/phase10/historical/archivedV1Recipes.ts');
  const historicalCode = read("corpus/phase10/historical/archivedV1Recipes.ts");
  if (!/real-source-shape/.test(historicalCode)) fail('archived v1 recipes are missing the historical shape identities');
}

/**
 * Phase 10B deep-acceptance core purity: the deep-acceptance mechanics module
 * is PURE — no network, no fs, no child processes, no persistence, no eval,
 * no AI/selfDev/Phase6/infra/campaign/authority imports. It reuses the pure
 * Phase 9B summary mechanics and only adds deterministic acceptance logic.
 */
export function checkPhase10bCorePurity() {
  const files = ['src/core/phase10b/deepAcceptance.ts'];
  for (const file of files) {
    const source = readIncludingComments(file);
    if (/import\s+[^;]*from\s+['"][^'"]*(?:node:fs|node:http|node:https|node:net|node:dns|node:fetch|undici|WebSocket|child_process|aiReview|selfDev|selfDevPromotion|selfDevSandbox|phase6|database|infrastructure|dynamo|bigquery|spanner|kubectl|gcloud|playwright|runRecorder|storage|dossier|artifacts|campaign)[^'"]*['"]/i.test(source)) {
      fail(`${file} imports a forbidden fs/network/process/AI/selfDev/Phase6/persistence/authority module`);
    }
    if (/\b(?:eval\s*\(|new\s+Function\s*\(|child_process|spawn\s*\(|(?<!\.)exec(?:File)?\s*\(|writeFile|appendFile|createWriteStream|mkdirSync|rmSync|unlinkSync|renameSync|fetch\s*\(|node:fs)\b/i.test(source)) {
      fail(`${file} exposes a code-execution, process, network, or persistence capability`);
    }
  }
}

/**
 * Phase 12 pure-core boundaries (SPEC §27, WORKSTREAM_F §F2): replay plan,
 * semantic confidence, semantic cluster, coverage inventory, and backtest
 * scoring cores must be deterministic, privacy-safe, and network/browser/
 * filesystem/child-process/DB/AI/selfDev isolated. Any future Phase 12 pure
 * core file that violates the import/capability boundary is a hardening
 * failure.
 *
 * This check is intentionally future-proof: it enumerates the bounded set of
 * Phase 12 pure-core locations and enforces the boundary only when those
 * files exist, so parallel workstreams can land their pure cores without
 * hardening drift.
 */
export function checkPhase12PureCoreBoundaries() {
  const candidates = [];
  const globs = [
    'src/core/triage/replay',
    'src/core/triage/confidence',
    'src/core/triage/cluster',
    'src/core/triage/coverage',
    'src/core/triage/inventory',
    'src/core/triage/backtest',
    'src/core/triage/minimizer',
    'src/core/triage/semanticReplay.ts',
    'src/core/portfolio/semanticCoverage.ts',
    'src/oracles/expectations/currentness.ts',
    'src/core/coverage',
    'src/core/backtest',
    'src/oracles/semantic/confidence',
    'src/oracles/semantic/cluster',
    'src/oracles/semantic/inventory',
    'corpus/phase12',
  ];
  for (const tracked of gitFiles()) {
    if (!tracked.endsWith('.ts') && !tracked.endsWith('.mjs')) continue;
    // Exact file or directory prefix match against the bounded allowlist.
    const inPureCore = globs.some((prefix) => tracked === `${prefix}.ts` || tracked === `${prefix}.mjs` || tracked.startsWith(`${prefix}/`));
    if (inPureCore) candidates.push(tracked);
  }
  // Also walk uncommitted working-tree candidates (so local parallel-stream
  // files are still guarded even before commit).
  for (const prefix of globs) {
    const absolute = path.join(root, prefix);
    if (fs.existsSync(absolute) && fs.statSync(absolute).isDirectory()) {
      for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
        if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.mjs'))) {
          const rel = path.join(prefix, entry.name);
          if (!candidates.includes(rel)) candidates.push(rel);
        }
      }
    } else if (fs.existsSync(`${absolute}.ts`)) {
      const rel = `${prefix}.ts`;
      if (!candidates.includes(rel)) candidates.push(rel);
    }
  }
  // Minimizer is already covered by its own invariants but is part of the
  // Phase 12 pure-core set per SPEC §27 — guard it here too.
  if (!candidates.includes('src/core/triage/minimizer.ts') && fs.existsSync(path.join(root, 'src/core/triage/minimizer.ts'))) {
    candidates.push('src/core/triage/minimizer.ts');
  }
  if (candidates.length === 0) return;
  for (const file of candidates.sort()) {
    const source = readIncludingComments(file);
    if (!source) continue;
    if (/from\s+['"]node:(?:fs|child_process|net|http|https|dns|tls|worker_threads)['"]/i.test(source)) {
      fail(`${file} imports a prohibited fs/process/network runtime capability (Phase 12 pure-core boundary)`);
    }
    if (/from\s+['"][^'"]*(?:playwright|puppeteer|browser|page|chromium)[^'"]*['"]/i.test(source)) {
      fail(`${file} imports a browser/page capability (Phase 12 pure-core boundary)`);
    }
    if (/\bchild_process\b|\bspawn\s*\(|\bexec(?:File)?\s*\(|\bfork\s*\(|\bshell\s*:\s*true\b/i.test(source)) {
      fail(`${file} exposes a child_process/shell capability (Phase 12 pure-core boundary)`);
    }
    if (/\bfetch\s*\(|\bWebSocket\s*\(|\bhttp\.request\b|\bhttps\.request\b|\bnet\.connect\b/i.test(source)) {
      fail(`${file} exposes a network transport capability (Phase 12 pure-core boundary)`);
    }
    if (/from\s+['"][^'"]*(?:database|dynamo|bigquery|spanner|gcloud|kubectl|aws|cloud|infrastructure)[^'"]*['"]/i.test(source)) {
      fail(`${file} imports a DB/infra capability (Phase 12 pure-core boundary)`);
    }
    if (/from\s+['"][^'"]*(?:aiReview|selfDev|selfDevPromotion|selfDevSandbox)[^'"]*['"]/i.test(source) || /\b(?:AiReview|SelfDev|SELFDEV_|SELF_DEVELOPMENT)\b/.test(source)) {
      fail(`${file} imports or references AI/selfDev/promotion authority (Phase 12 pure-core boundary)`);
    }
    if (/\b(?:eval\s*\(|new\s+Function\s*\()/i.test(source)) {
      fail(`${file} exposes code execution (eval/Function) (Phase 12 pure-core boundary)`);
    }
  }
}

/**
 * Phase 18 semantic/replay/coverage cores remain pure bounded decision
 * layers. Their richer evidence vocabulary must not become a side door to
 * browser, network, persistence, AI, source-write, or owner-promotion
 * authority.
 */
export function checkPhase18PureCoreSeams() {
  const files = [
    'src/core/triage/semanticReplay.ts',
    'src/core/portfolio/semanticCoverage.ts',
    'src/oracles/expectations/currentness.ts',
  ];
  for (const file of files) {
    const source = readIncludingComments(file);
    if (!source) continue;
    if (/from\s+['"][^'"]*(?:node:fs|node:http|node:https|node:net|node:dns|node:fetch|undici|WebSocket|child_process|playwright|browser|database|dynamo|bigquery|spanner|gcloud|kubectl|aws|cloud|infrastructure|aiReview|selfDev|selfDevPromotion|selfDevSandbox|phase6|storage|campaign\/orchestrator|products?)[^'"]*['"]/i.test(source)) {
      fail(`${file} imports a forbidden Phase 18 authority or transport`);
    }
    if (/\b(?:child_process|fetch\s*\(|spawn\s*\(|exec(?:File)?\s*\(|writeFile|appendFile|createWriteStream|mkdirSync|rmSync|unlinkSync|renameSync|eval\s*\(|new\s+Function\s*\()\b/i.test(source)) {
      fail(`${file} exposes a Phase 18 process, network, persistence, or code-execution capability`);
    }
  }
  const replay = readIncludingComments('src/core/triage/semanticReplay.ts');
  const replayCode = read("src/core/triage/semanticReplay.ts");
  if (replay && (!/SEMANTIC_REPLAY_FIDELITY_VERSION/.test(replayCode) || !/AMBIGUOUS_OCCURRENCE/.test(replayCode) || !/validateSemanticReplayFidelityReceipt/.test(replayCode))) {
    fail('Phase 18 replay core is missing versioned ambiguity/fidelity validation');
  }
  const coverage = readIncludingComments('src/core/portfolio/semanticCoverage.ts');
  const coverageCode = read("src/core/portfolio/semanticCoverage.ts");
  if (coverage && (!/SEMANTIC_COVERAGE_VERSION/.test(coverageCode) || !/SOURCE_EVIDENCE_UNRESOLVED/.test(coverageCode) || !/deterministicDigest/.test(coverageCode))) {
    fail('Phase 18 coverage core is missing bounded currentness/explanation accounting');
  }
  const currentness = readIncludingComments('src/oracles/expectations/currentness.ts');
  const currentnessCode = read("src/oracles/expectations/currentness.ts");
  if (currentness && (!/SourceCurrentnessState/.test(currentnessCode) || !/SYNTHETIC_ONLY/.test(currentnessCode) || !/STALE/.test(currentnessCode))) {
    fail('Phase 18 currentness core is missing explicit fail-closed states');
  }
}

/**
 * Phase 12 authority-set freeze (WORKSTREAM_F §F4): approved read-only
 * target IDs, DEV-reachable target IDs, safe-action catalog authority, and
 * Phase 5 operation IDs must remain byte-identical to the current baseline
 * unless an explicit Phase 12 decision justifies a change. Any drift is a
 * blocker.
 */
export function checkPhase12AuthoritySetsUnchanged() {
  const approved = readIncludingComments('src/oracles/expectations/recipes/registry.ts');
  const approvedCode = read("src/oracles/expectations/recipes/registry.ts");
  const catalog = readIncludingComments('src/api/phase5/catalog.ts');
  const catalogCodeOnly = read("src/api/phase5/catalog.ts");
  const ownerScope = read('src/core/policy/ownerScope.ts');
  const selfDevCatalog = readIncludingComments('src/core/selfDev/adoptedCaseCatalog.generated.ts');
  // Approved read-only target IDs — 6 entries, byte-stable order.
  const approvedIds = ['ripple.payer-exchange.read', 'ripple.common-exchange.read', 'ripple.account-inventory.read', 'ripple.billing-groups.read', 'ripple.billing-groups-legacy.read', 'ripple.billing-group-exchange.read'];
  for (const id of approvedIds) {
    if (!approvedCode.includes(`'${id}'`)) fail(`Phase 12 approved read-only target missing: ${id}`);
  }
  if ((approved.match(/'ripple\.[^']+\.read'/g) ?? []).length !== approvedIds.length) {
    // Count only the APPROVED_READ_ONLY_TARGET_IDS block (first occurrences).
    const block = approved.slice(approved.indexOf('APPROVED_READ_ONLY_TARGET_IDS'), approved.indexOf('DEV_REACHABLE_RECIPE_TARGET_IDS'));
    const count = (block.match(/'ripple\.[^']+\.read'/g) ?? []).length;
    if (count !== approvedIds.length) fail(`Phase 12 approved read-only target count drift: expected ${approvedIds.length}, found ${count}`);
  }
  const devReachable = ['ripple.payer-exchange.read', 'ripple.common-exchange.read', 'ripple.account-inventory.read'];
  for (const id of devReachable) {
    if (!approvedCode.includes(`'${id}'`)) fail(`Phase 12 DEV-reachable target missing: ${id}`);
  }
  const devBlockMatch = approved.match(/DEV_REACHABLE_RECIPE_TARGET_IDS[\s\S]*?Object\.freeze\(\[([\s\S]*?)\]\)/);
  const devTargetCount = devBlockMatch ? (devBlockMatch[1].match(/'ripple\.[^']+\.read'/g) ?? []).length : 0;
  if (devTargetCount !== devReachable.length) fail(`Phase 12 DEV-reachable target count drift: expected ${devReachable.length}, found ${devTargetCount}`);
  // Safe-action catalog version must remain the single Phase 4 authority.
  if (!/SAFE_ACTION_CATALOG_VERSION\s*=\s*'nightwatch\.safe-actions\.phase4\.v1'/.test(read('src/core/exploration/types.ts'))) {
    fail('Phase 12 safe-action catalog version drift');
  }
  // Phase 5 operation IDs — known-read set must remain 6.
  const knownReads = (catalog.match(/operationId:\s*'ripple\.[^']+'/g) ?? []).length;
  // The catalog contains 11 operations total (6 KNOWN_READ + 4 KNOWN_MUTATION + 1 UNKNOWN); we verify the read set specifically.
  const readOps = ['ripple.payer-exchange.read', 'ripple.common-exchange.read', 'ripple.account-inventory.read', 'ripple.billing-groups.read', 'ripple.billing-groups-legacy.read', 'ripple.billing-group-exchange.read'];
  for (const op of readOps) if (!catalogCodeOnly.includes(`operationId: '${op}'`)) fail(`Phase 12 Phase-5 operation missing: ${op}`);
  // Owner scope must remain frozen.
  if (!/FROZEN_BY_OWNER/.test(ownerScope) || !/INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE/.test(ownerScope)) {
    fail('Phase 12 owner-scope freeze marker missing');
  }
  // Canonical selfdev catalog digest/count must be correct for the current
  // authorized state. Expected 2 after variant B canonical promotion.
  const catalogCount = (selfDevCatalog.match(/"adoptedCaseId"/g) ?? []).length;
  if (catalogCount !== 2) fail(`Phase 12 canonical catalog count drift: expected 2, found ${catalogCount}`);
}

/**
 * Phase 10B integration seams: the runner is gated by the one-shot launcher
 * flag, fixes the common-exchange journey / target / DEEP expectation (no
 * selectors, no URL override), and the launcher rejects every selector. The
 * historical Phase 9B runner must STILL fix the historical SHAPE expectation
 * (Phase 10B never rewrites Phase 9B semantics).
 */
export function checkPhase10bIntegrationSeams() {
  const runner = readIncludingComments('tests/manual/phase10b-contained-dev-deep-semantic.ts');
  const runnerCode = read("tests/manual/phase10b-contained-dev-deep-semantic.ts");
  if (!/NIGHTWATCH_PHASE_10B_REAL/.test(runnerCode)) {
    fail('Phase 10B runner is missing the one-shot real-run gate');
  }
  if (!/const SELECTED_JOURNEY_ID = 'ripple-common-exchange-read'/.test(runnerCode)) {
    fail('Phase 10B runner lost its fixed common-exchange journey');
  }
  if (!/const SELECTED_TARGET_ID = 'ripple\.common-exchange\.read'/.test(runnerCode)) {
    fail('Phase 10B runner lost its fixed target');
  }
  if (!/const SELECTED_EXPECTATION_ID = 'ripple\.common-exchange\.read\.real-source-deep'/.test(runnerCode)) {
    fail('Phase 10B runner lost its fixed deep expectation identity');
  }
  if (/NIGHTWATCH_PHASE_2B_JOURNEY_ID/.test(runner)) {
    fail('Phase 10B runner must not accept journey selection');
  }
  if (!/NIGHTWATCH_UI_URL is not accepted/.test(runnerCode)) {
    fail('Phase 10B runner must reject any UI URL override');
  }
  const launcher = readIncludingComments('bin/phase10b-launcher-args.mjs');
  const launcherCode = read("bin/phase10b-launcher-args.mjs");
  if (!/no journey selector/.test(launcherCode) || !/no expectation selector/.test(launcherCode) || !/no target selector/.test(launcherCode) || !/--ui-url/.test(launcherCode)) {
    fail('Phase 10B launcher must reject journey/expectation/target/URL selectors');
  }
  const core = read('src/core/phase10b/deepAcceptance.ts');
  if (!/PHASE_10B_BLOCKED_DEEP_INVARIANT_NOT_OBSERVED/.test(core)) {
    fail('Phase 10B deep acceptance must fail closed when the deep invariant is N/A (root-only PASS is not deep validation)');
  }
  if (!/PHASE_10B_BLOCKED_DEEP_EXPECTATION_DRIFT/.test(core)) {
    fail('Phase 10B deep acceptance must fail closed when the resolved expectation lacks the deep type contract');
  }
  if (!/expectedInvariantTotalFor/.test(core)) {
    fail('Phase 10B must derive the expected invariant total from the resolved expectation');
  }
  const phase9bRunner = read('tests/manual/phase9b-contained-dev-semantic.ts');
  if (!/const SELECTED_EXPECTATION_ID = 'ripple\.common-exchange\.read\.real-source-shape'/.test(phase9bRunner)) {
    fail('historical Phase 9B runner must still fix the historical shape expectation');
  }
}

/**
 * Phase 12A WORKSTREAM_B+D triage/coverage core purity: semanticTriageEvidence, semanticConfidence, dossierV2, coverageInventory, cluster are PURE (no fs/network/child-process/browser/AI/DB/selfDev).
 */
export function checkPhase12TriageCorePurity() {
  const files = [
    'src/core/triage/semanticTriageEvidence.ts',
    'src/core/triage/semanticConfidence.ts',
    'src/core/triage/dossierV2.ts',
    'src/oracles/expectations/coverageInventory.ts',
    'src/oracles/semantic/cluster.ts',
  ];
  for (const file of files) {
    if (!fs.existsSync(path.join(root, file))) continue;
    const source = readIncludingComments(file);
    if (/import\s+[^;]*from\s+['"][^'"]*(?:node:fs|node:http|node:https|node:net|node:dns|node:fetch|undici|WebSocket|child_process|aiReview|selfDev|selfDevPromotion|selfDevSandbox|phase6|database|infrastructure|dynamo|bigquery|spanner|kubectl|gcloud|playwright|runRecorder|storage)[^'"]*['"]/i.test(source)) {
      fail(`${file} imports a forbidden fs/network/process/AI/selfDev/Phase6/persistence/authority module`);
    }
    if (/\b(?:eval\s*\(|new\s+Function\s*\(|child_process|spawn\s*\(|(?<!\.)exec(?:File)?\s*\(|writeFile|appendFile|createWriteStream|mkdirSync|rmSync|unlinkSync|renameSync|fetch\s*\(|node:fs)\b/i.test(source)) {
      fail(`${file} exposes a code-execution, process, network, or persistence capability`);
    }
  }
}

export function checkPhase12TriageIntegrationSeams() {
  const evidence = readIncludingComments('src/core/triage/semanticTriageEvidence.ts');
  const evidenceCode = read("src/core/triage/semanticTriageEvidence.ts");
  if (!/nightwatch\.semantic-triage-evidence\.v1/.test(evidenceCode)) fail('semantic triage evidence missing version');
  if (!/MISSING_EVIDENCE_VOCABULARY/.test(evidenceCode)) fail('semantic triage evidence missing vocabulary');
  const confidence = readIncludingComments('src/core/triage/semanticConfidence.ts');
  const confidenceCode = read("src/core/triage/semanticConfidence.ts");
  if (!/rankSemanticConfidence/.test(confidenceCode)) fail('semantic confidence missing rank function');
  if (!/SAFETY_NONZERO/.test(confidenceCode) || !/PRIVACY_FAILURE/.test(confidenceCode) || !/KNOWN_FALSE_POSITIVE/.test(confidenceCode)) fail('semantic confidence missing mandatory blockers');
  const v2 = readIncludingComments('src/core/triage/dossierV2.ts');
  const v2Code = read("src/core/triage/dossierV2.ts");
  if (!/nightwatch\.bug-dossier\.private\.v2/.test(v2Code)) fail('dossier v2 missing version');
  if (!/isReadySemanticDossier/.test(v2Code)) fail('dossier v2 missing READY predicate');
  if (!/humanReproductionRecipe/.test(v2Code)) fail('dossier v2 missing human recipe');
  // v1 must remain readable: dossier.ts still exports createBugDossier/validateBugDossier
  const dossier = readIncludingComments('src/core/triage/dossier.ts');
  const dossierCode = read("src/core/triage/dossier.ts");
  if (!/DOSSIER_VERSION/.test(dossierCode) || !/validateBugDossier/.test(dossierCode)) fail('dossier v1 compatibility lost');
  const coverage = readIncludingComments('src/oracles/expectations/coverageInventory.ts');
  const coverageCode = read("src/oracles/expectations/coverageInventory.ts");
  if (!/buildCoverageInventory/.test(coverageCode)) fail('coverage inventory missing builder');
  if (!/APPROVED_AND_ADMITTED_COLLECTION/.test(coverageCode) || !/APPROVED_NOT_ADMITTED_AMBIGUOUS/.test(coverageCode) || !/APPROVED_NOT_OBSERVABLE/.test(coverageCode)) fail('coverage inventory missing disposition vocabulary');
  if (!/TYPE_FLOW_AMBIGUOUS/.test(coverageCode)) fail('coverage inventory missing depth-uplift blocker');
  if (!/snapshotMatchesRemote/.test(coverageCode)) fail('coverage inventory missing remote/snapshot match flag');
  const cluster = readIncludingComments('src/oracles/semantic/cluster.ts');
  const clusterCode = read("src/oracles/semantic/cluster.ts");
  if (fs.existsSync(path.join(root, 'src/oracles/semantic/cluster.ts'))) {
    if (!/semanticCluster/.test(clusterCode)) fail('semantic cluster missing identity');
  }
}

/** Phase 22 contained-DEV core purity and launcher seams. The DTO/oracle
 * layer is deterministic and authority-free; the launcher is the only place
 * permitted to perform source snapshot/process work. */
export function checkPhase22CorePurity() {
  const pureFiles = [
    'src/core/phase22/types.ts',
    'src/core/phase22/digest.ts',
    'src/core/phase22/eligibility.ts',
    'src/core/phase22/candidates.ts',
    'src/core/phase22/manifest.ts',
    'src/core/phase22/preflight.ts',
    'src/core/phase22/privacy.ts',
    'src/core/phase22/replay.ts',
    'src/core/phase22/calibration.ts',
    'src/core/phase22/dossierV6.ts',
    'src/core/phase22/dryRun.ts',
  ];
  for (const file of pureFiles) {
    const source = readIncludingComments(file);
    if (/from\s+['"][^'"]*(?:node:fs|node:child_process|node:net|node:http|node:https|node:dns|undici|playwright|browser|runRecorder|storageState|database|dynamo|bigquery|spanner|kubernetes|gcloud|aws|selfDev|persistence)[^'"]*['"]/i.test(source)) fail(`${file} imports an authority or external capability`);
    if (/\b(?:process\.env|fetch\s*\(|WebSocket\s*\(|child_process|spawn\s*\(|exec(?:File)?\s*\(|writeFile|appendFile|createWriteStream|mkdirSync|rmSync|unlinkSync|renameSync|Date\.now\s*\(|Math\.random\s*\(|eval\s*\(|new\s+Function\s*\()\b/i.test(source)) fail(`${file} exposes runtime, process, network, clock, randomness, or persistence authority`);
  }
  const firewall = readIncludingComments('src/oracles/semantic/phase22Firewall.ts');
  const firewallCode = read("src/oracles/semantic/phase22Firewall.ts");
  if (!/guardPhase22SafeObservation/.test(firewallCode) || !/createPhase22PrivacyReceipt/.test(firewallCode) || /rawText|rawBody|responseBody/.test(firewall)) fail('Phase 22 runtime privacy firewall is missing or accepts raw payload fields');
}

export function checkPhase22IntegrationSeams() {
  const types = read('src/core/phase22/types.ts');
  if (!/nightwatch\.dev-semantic-acceptance-manifest\.v1/.test(types) || !/maxTargets: 6/.test(types) || !/maxObservationContexts: 12/.test(types)) fail('Phase 22 manifest bounds/version are missing');
  if (!/PHASE22_REQUIRED_PREFLIGHT_CHECKS/.test(types) || !/l0_cdp_guard_active/.test(types) || !/l5_loopback_proxy_active/.test(types)) fail('Phase 22 preflight V2 check vocabulary is incomplete');
  const manifest = readIncludingComments('src/core/phase22/manifest.ts');
  const manifestCode = read("src/core/phase22/manifest.ts");
  if (!/selectEligible/.test(manifestCode) || !/TARGET_BOUND_OR_MATERIAL_DIVERSITY/.test(manifestCode) || !/frozen: true/.test(manifestCode)) fail('Phase 22 manifest is not deterministic/frozen/bounded');
  const replay = readIncludingComments('src/core/phase22/replay.ts');
  const replayCode = read("src/core/phase22/replay.ts");
  if (!/replayObservationCount > budget\.firstObservationCount/.test(replayCode) || !/retryCount !== 0/.test(replayCode) || !/REAL_MINIMIZATION_NOT_AUTHORIZED/.test(replayCode)) fail('Phase 22 replay/minimization bounds are incomplete');
  const confidence = readIncludingComments('src/core/phase22/calibration.ts');
  const confidenceCode = read("src/core/phase22/calibration.ts");
  if (!/REAL_SOURCE_NOT_CURRENT/.test(confidenceCode) || !/REAL_EXPECTATION_NOT_RESOLVED/.test(confidenceCode) || !/realGatePassed/.test(confidenceCode)) fail('Phase 22 real confidence gate is incomplete');
  const network = readIncludingComments('src/browser/observers/networkObserver.ts');
  const networkCode = read("src/browser/observers/networkObserver.ts");
  if (!/guardPhase22SemanticHookResult/.test(networkCode) || !/phase22PrivacyReceiptLedger/.test(networkCode) || !/phase22PrivacyReceipts/.test(networkCode)) fail('Phase 22 privacy firewall is not attached to the network observer');
  const launcher = readIncludingComments('bin/phase22-real.mjs');
  const launcherCode = read("bin/phase22-real.mjs");
  if (/\.\.\.process\.env/.test(launcher) || /stdio:\s*['"]inherit['"]/.test(launcher) || !/NIGHTWATCH_PHASE_22_REAL/.test(launcherCode) || !/args\.env !== 'dev'/.test(launcherCode) || !/EXACT_GREEN_CI_RUN_ID_REQUIRED/.test(launcherCode)) fail('Phase 22 launcher boundary is incomplete');
  if (!/maxBuffer\s*:/.test(launcherCode) || !/timeout\s*:/.test(launcherCode) || !/--config=playwright\.phase22\.config\.ts/.test(launcherCode)) fail('Phase 22 launcher lacks bounded child execution');
  const cli = read('bin/phase22-dev.mjs');
  if (!/DYNAMIC_ALL_FORBIDDEN/.test(cli) || !/simulatePhase22DevAcceptance/.test(cli) || !/EXPLICIT_EXECUTE_REQUIRED/.test(cli)) fail('Phase 22 local operator surface is missing dry-run/explicit-execute guards');
  const packageJson = readDataFile('package.json');
  for (const script of ['dev-preflight', 'dev-manifest', 'dev-acceptance', 'dev-results', 'dev-explain']) if (!packageJson.includes(`"${script}"`)) fail(`Phase 22 operator script missing: ${script}`);
}

/**
 * C-09 spec-derived expectation boundary.
 *
 * Two rules matter. A spec witness must stay DOCUMENTARY, because that class
 * is what makes it unable to reach READ_ONLY_PROVEN -- the boundary is the
 * class model, not a separate guard. And no assertion may come from prose,
 * because the moment a `description` becomes an expectation the whole
 * provenance chain is decoration.
 */
export function checkC09SpecExpectationBoundary() {
  const expectations = readIncludingComments('src/core/source/specExpectations.ts');
  const expectationsCode = read("src/core/source/specExpectations.ts");
  const inventory = read('src/core/source/specScenarioInventory.ts');
  const proof = readIncludingComments('src/core/source/readOnlyProof.ts');
  const proofCode = read("src/core/source/readOnlyProof.ts");

  // --- W-SPEC stays DOCUMENTARY ---
  if (!/'W-SPEC':\s*'DOCUMENTARY'/.test(proofCode)) {
    fail("C-09 W-SPEC must remain witness class DOCUMENTARY; that class is why a spec witness cannot reach READ_ONLY_PROVEN");
  }
  // --- and the proof still requires a declaration AND an effect witness ---
  if (!/declarationHeld/.test(proofCode) || !/effectHeld/.test(proofCode)) {
    fail('C-09 the read-only proof must keep requiring both a DECLARATION and an EFFECT witness');
  }

  // --- no prose becomes an assertion ---
  const code = withoutComments(expectations);
  for (const prose of ['summary', 'description', 'title', 'example']) {
    // Reading the field name in a REFUSAL list is fine; reading its VALUE into
    // an assertion is not. The refusal list is data, so it is excluded.
    const uses = new RegExp(`(?<!PROSE_FIELDS[^;]{0,200})\\b(?:property|operation|definition)\\.${prose}\\b`).test(code);
    if (uses) fail(`C-09 must not derive an assertion from the prose field ${prose}`);
  }
  // Anchored on the EXPORT, not the bare name: `XPROSE_FIELDS` contains
  // `PROSE_FIELDS`, so an unanchored test passes on a renamed symbol.
  if (!/export const PROSE_FIELDS\s*=/.test(expectationsCode)) {
    fail('C-09 must name the prose fields it refuses, as data rather than as a comment');
  }

  // --- no REQUIRED_KEY class, because the artifacts contain no material ---
  const classesBlock = /export const SPEC_EXPECTATION_CLASSES\s*=\s*\[([\s\S]*?)\]\s*as const;/.exec(expectations);
  if (classesBlock === null) {
    fail('C-09 could not read the SPEC_EXPECTATION_CLASSES declaration');
  } else if (/REQUIRED_KEY/.test(withoutComments(classesBlock[1]))) {
    fail('C-09 must not declare a REQUIRED_KEY expectation class; protobuf3 emits no required arrays and the artifacts contain none');
  }

  // --- no similarity matching anywhere in the derivation ---
  for (const forbidden of ['levenshtein', 'similarity', 'fuzzyMatch']) {
    if (code.toLowerCase().includes(forbidden.toLowerCase())) {
      fail(`C-09 must not match expectations to operations by ${forbidden}; the join is exact by construction`);
    }
  }

  // --- the classification vocabulary keeps OUTSIDE_SCOPE distinct ---
  const vocabularyBlock = /export const SCENARIO_CLASSIFICATIONS\s*=\s*\[([\s\S]*?)\]\s*as const;/.exec(expectations);
  if (vocabularyBlock === null) {
    fail('C-09 could not read the SCENARIO_CLASSIFICATIONS declaration');
  } else {
    const declared = withoutComments(vocabularyBlock[1]);
    for (const member of ['CHECKABLE', 'NON_CHECKABLE', 'AMBIGUOUS', 'UNSUPPORTED',
      'NO_OPERATION_BINDING', 'MULTIPLE_BINDINGS', 'STALE', 'OUTSIDE_SCOPE']) {
      if (!declared.includes(`'${member}'`)) fail(`C-09 scenario classification ${member} is missing from the vocabulary`);
    }
  }
  // Totality is structural.
  if (!/totalityHolds: discovered\.length === scenarios\.length/.test(inventory)) {
    fail('C-09 must assert scenario classification totality against the discovered set');
  }

  // --- both modules stay data-only ---
  for (const file of ['src/core/source/specExpectations.ts', 'src/core/source/specScenarioInventory.ts']) {
    const source = readIncludingComments(file);
    for (const forbidden of ['node:fs', 'node:child_process', 'node:net', 'node:https', 'node:http']) {
      if (source.includes(`from '${forbidden}'`)) fail(`${file} must stay data-only policy (imports ${forbidden})`);
    }
  }
}

/**
 * C-16 EIG and G-16 boundary.
 *
 * The rule that matters most: a ranking is an ORDER, never a permission. The
 * second: under a multiplicative score, an UNKNOWN factor that reaches zero
 * silently deletes a target and one that reaches the maximum silently promotes
 * it, so "we do not know" must sit strictly between.
 */
export function checkC16EigBoundary() {
  const eig = readIncludingComments('src/core/source/expectedInformationGain.ts');
  const eigCode = read("src/core/source/expectedInformationGain.ts");
  const ledger = readIncludingComments('src/core/source/censusFigureLedger.ts');
  const ledgerCode = read("src/core/source/censusFigureLedger.ts");
  const code = withoutComments(eig);

  // --- a ranking grants nothing ---
  if (!/grantsAuthority: false as const/.test(eigCode)) {
    fail('C-16 the EIG projection must state grantsAuthority false as data, not only in prose');
  }
  for (const file of ['src/core/safety/realRunGate.ts', 'src/core/policy/ownerScope.ts', 'src/core/source/universe.ts']) {
    if (/expectedInformationGain/.test(readIncludingComments(file))) {
      fail(`${file} must not consult the EIG ranking; a high score is not execution authority`);
    }
  }
  for (const forbidden of ['process.env', 'node:fs', 'node:child_process', 'credential', 'storageState']) {
    if (code.includes(forbidden)) fail(`src/core/source/expectedInformationGain.ts must take no environment or credential input (${forbidden})`);
  }

  // --- no clock in the score ---
  for (const clock of ['Date.now', 'new Date', 'performance.now', 'hrtime']) {
    if (code.includes(clock)) fail(`C-16 the EIG score must not consume wall-clock time (${clock}); recency comes from proven source-change evidence`);
  }

  // --- UNKNOWN is strictly mid-scale on every factor ---
  for (const factor of ['NOVELTY_LEVELS', 'CONTRACT_DEPTH_LEVELS', 'CHANGE_RECENCY_LEVELS', 'BLAST_RADIUS_LEVELS', 'COST_LEVELS', 'DUPLICATE_RISK_LEVELS']) {
    const block = new RegExp(`export const ${factor}[^=]*=\\s*Object\\.freeze\\(\\{([\\s\\S]*?)\\}\\);`).exec(eig);
    if (block === null) { fail(`C-16 could not read the ${factor} declaration`); continue; }
    const entries = [...withoutComments(block[1]).matchAll(/([A-Z_]+)\s*:\s*(-?\d+)/g)].map((m) => [m[1], Number(m[2])]);
    if (entries.length === 0) { fail(`C-16 ${factor} declares no levels`); continue; }
    const unknown = entries.find(([name]) => name === 'UNKNOWN');
    if (unknown === undefined) { fail(`C-16 ${factor} must declare an explicit UNKNOWN level`); continue; }
    const values = entries.map(([, value]) => Number(value));
    if (Number(unknown[1]) <= Math.min(...values) || Number(unknown[1]) >= Math.max(...values)) {
      fail(`C-16 ${factor} UNKNOWN must sit strictly between its minimum and maximum; a zero deletes a target and a maximum promotes one`);
    }
  }
  // Numerator factors must never be zero, or an UNKNOWN could erase a target.
  for (const factor of ['NOVELTY_LEVELS', 'CONTRACT_DEPTH_LEVELS', 'CHANGE_RECENCY_LEVELS', 'BLAST_RADIUS_LEVELS']) {
    const block = new RegExp(`export const ${factor}[^=]*=\\s*Object\\.freeze\\(\\{([\\s\\S]*?)\\}\\);`).exec(eig);
    if (block === null) continue;
    for (const match of withoutComments(block[1]).matchAll(/[A-Z_]+\s*:\s*(-?\d+)/g)) {
      if (Number(match[1]) <= 0) fail(`C-16 ${factor} levels must all be positive; a zero in the numerator deletes the target`);
    }
  }

  // --- ordering is exact integer arithmetic, and ties are total ---
  if (!/left\.numerator \* right\.denominator - right\.numerator \* left\.denominator/.test(eigCode)) {
    fail('C-16 score ordering must cross-multiply integers rather than divide; a float order depends on rounding');
  }
  if (!/left\.target\.targetId < right\.target\.targetId/.test(eigCode)) {
    fail('C-16 the ranking must break ties on a stable key so the order is total and reproducible');
  }

  // --- G-16: one derived figure source ---
  if (!/export const CENSUS_FIGURES/.test(ledgerCode)) {
    fail('G-16 requires one derived figure source; CENSUS_FIGURES must declare the census measures');
  }
  if (!/export const HISTORICAL_MARKER\s*=/.test(ledgerCode)) {
    fail('G-16 must provide an explicit historical marker so a superseded narrative is retired rather than deleted');
  }
  // The exemption must be a single explicit marker, not a word list. A first
  // draft matched any line containing `was `, which exempts most prose.
  if (/HISTORICAL_MARKERS\s*=/.test(ledger)) {
    fail('G-16 the historical exemption must be one explicit marker, not a list of words that can fire by accident');
  }
  if (!/POLICED_DOCUMENTS/.test(ledgerCode)) {
    fail('G-16 must name the durable documents it polices');
  }
}

/**
 * C-07 derived-semantics boundary.
 *
 * One rule carries this campaign: `READ_ONLY_METHOD_ONLY` must derive
 * `UNKNOWN`, never `KNOWN_READ`. 485 real operations sit in that class, and
 * promoting them would assert a read contract from an HTTP verb — which the
 * endpoint-semantics module forbids in its own header and which C-06 spent a
 * campaign disproving.
 */
export function checkC07DerivedSemanticsBoundary() {
  const derived = readIncludingComments('src/core/source/derivedEndpointSemantics.ts');
  const derivedCode = read("src/core/source/derivedEndpointSemantics.ts");
  const legacy = readIncludingComments('src/core/safety/endpointSemantics.ts');
  const legacyCode = read("src/core/safety/endpointSemantics.ts");
  const code = withoutComments(derived);

  // --- method-only never becomes a read contract ---
  const methodOnly = /case 'READ_ONLY_METHOD_ONLY':[\s\S]{0,600}?return Object\.freeze\(\{[^}]*?classification: '([A-Z_]+)'/.exec(code);
  if (methodOnly === null) {
    fail('C-07 could not read the READ_ONLY_METHOD_ONLY derivation; the load-bearing rule cannot be verified');
  } else if (methodOnly[1] !== 'UNKNOWN') {
    fail(`C-07 READ_ONLY_METHOD_ONLY must derive UNKNOWN, not ${methodOnly[1]}; HTTP method is not a read/write contract`);
  }
  // --- a conditional mutation is still a mutation ---
  const conditional = /case 'CONDITIONAL_MUTATION':[\s\S]{0,600}?return Object\.freeze\(\{[^}]*?classification: '([A-Z_]+)'/.exec(code);
  if (conditional !== null && conditional[1] !== 'MUTATION_CAPABLE') {
    fail(`C-07 CONDITIONAL_MUTATION must derive MUTATION_CAPABLE, not ${conditional[1]}; a gated write is not an absent one`);
  }
  // --- route identity is checked, and taints ---
  if (!/routeProof !== 'PROVEN'/.test(code)) {
    fail('C-07 must taint the classification when route identity is unproven; unknown subject means unusable evidence');
  }
  // --- an unrecognised classification fails closed ---
  if (!/default:/.test(code) || !/CONFLICTING_EVIDENCE/.test(derivedCode)) {
    fail('C-07 must fail closed on an unrecognised source classification rather than falling through to a usable value');
  }

  // --- the legacy hand-authored registry stays empty ---
  if (!/RIPPLE_ENDPOINT_SEMANTIC_REGISTRY: readonly EndpointSemanticRule\[\] = \[\]/.test(legacyCode)) {
    fail('C-07 the hand-authored endpoint semantic registry must stay empty; semantics are derived, and the retired catalog is never safety authority');
  }

  // --- generation is not execution ---
  for (const marker of ['grantsRequestAuthority: false as const']) {
    if (!derivedCode.includes(marker)) fail(`C-07 must state ${marker} as data; a classification is information, not permission`);
  }
  // The existing admission chain has the final word, consulted last.
  if (!/input\.admittedOperationIds\.has/.test(code)) {
    fail('C-07 eligibility must come from the existing admission chain, never from a local decision');
  }
  // EIG may order only the eligible set.
  if (!/return funnel\.eligible;/.test(code)) {
    fail('C-07 orderableTargets must return only the eligible set, so an inadmissible target has no path to a rank');
  }
  // --- data-only ---
  for (const forbidden of ['node:fs', 'node:child_process', 'node:net', 'node:https', 'node:http']) {
    if (derived.includes(`from '${forbidden}'`)) fail(`src/core/source/derivedEndpointSemantics.ts must stay data-only policy (imports ${forbidden})`);
  }
}
