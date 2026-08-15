#!/usr/bin/env node
// @ts-check

/**
 * Deterministic, offline repository hardening check.
 *
 * This is intentionally a small structural gate. It does not inspect a
 * network, credentials, sibling repositories, databases, or runtime state.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const childEnvironment = buildChildEnvironment(process.env);

/** @param {string} message */
function fail(message) {
  errors.push(message);
}

/** @param {string} file */
function read(file) {
  try {
    return fs.readFileSync(path.join(root, file), 'utf8');
  } catch (error) {
    fail(`cannot read ${file}: ${error instanceof Error ? error.message : String(error)}`);
    return '';
  }
}

function gitFiles() {
  const result = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', env: childEnvironment, timeout: 10_000, maxBuffer: 2 * 1024 * 1024 });
  if (result.status !== 0) {
    fail(`git ls-files failed: ${(result.stderr ?? '').trim()}`);
    return [];
  }
  return (result.stdout ?? '').split('\0').filter(Boolean);
}

function checkChildProcessBoundaries() {
  const launchers = [
    'bin/phase7-real.mjs',
    'bin/phase5-real.mjs',
    'bin/phase4-real.mjs',
    'bin/phase2b-real.mjs',
    'bin/phase2c-real.mjs',
    'bin/observe-authenticated.mjs',
    'bin/observe-gate.mjs',
    'bin/observe-canary.mjs',
    'bin/auth-capture.mjs',
    'bin/nightwatch.mjs',
  ];
  for (const file of launchers) {
    const source = read(file);
    if (/\.\.\.process\.env/.test(source)) fail(`${file} spreads the parent process environment`);
    if (/shell\s*:\s*true/.test(source)) fail(`${file} enables shell execution`);
    if (!/timeout\s*:/.test(source)) fail(`${file} has no bounded child-process timeout`);
    if (/stdio\s*:\s*['"]inherit['"]/.test(source)) fail(`${file} exposes unbounded child output`);
    if (!/maxBuffer\s*:/.test(source)) fail(`${file} has no bounded child output buffer`);
  }
  const productionSources = gitFiles()
    .filter((file) => (file.startsWith('src/') || file.startsWith('bin/')) && /\.(?:ts|mjs)$/.test(file))
    .filter((file) => file !== 'bin/hardening-check.mjs')
    .map((file) => [file, read(file)]);
  for (const [file, source] of productionSources) {
    if (/import\s*\{[^}]*\bexec(?:File)?\b[^}]*\}\s*from\s*['"]node:child_process['"]/.test(source)) fail(`${file} imports shell-capable child_process exec`);
    if (/child_process\.exec(?:File)?\s*\(/.test(source)) fail(`${file} calls child_process.exec/execFile through a dynamic namespace`);
  }
}

function checkTargetPolicy() {
  for (const file of ['bin/phase7-real.mjs', 'bin/phase5-real.mjs', 'bin/phase4-real.mjs', 'bin/phase2b-real.mjs', 'bin/phase2c-real.mjs', 'bin/observe-authenticated.mjs']) {
    if (!/env\s*!==\s*['"]dev['"]/.test(read(file))) fail(`${file} does not enforce DEV-only automated credential execution`);
  }
  const capture = read('bin/auth-capture.mjs');
  if (!/new Set\(\['dev', 'next'\]\)/.test(capture) || !/human-led|human login/i.test(capture)) fail('auth:capture NEXT exception is not visibly human-led and explicit');
  for (const file of gitFiles().filter((item) => item.startsWith('bin/') && item !== 'bin/hardening-check.mjs')) {
    if (/MULTI_HOUR_CAMPAIGN_BUDGET/.test(read(file))) fail(`${file} references the unauthorized multi-hour budget profile`);
  }
}

function checkTypecheckCoverage() {
  let config;
  try {
    config = JSON.parse(read('tsconfig.json'));
  } catch {
    fail('tsconfig.json is not valid JSON');
    return;
  }
  if (!Array.isArray(config.include) || !config.include.includes('playwright*.config.ts')) fail('tsconfig.json must include the complete playwright*.config.ts root-config pattern');
  for (const file of fs.readdirSync(root).filter((item) => /^playwright.*\.config\.ts$/.test(item))) {
    if (!fs.statSync(path.join(root, file)).isFile()) fail(`root Playwright config is not a regular file: ${file}`);
  }
}

function checkPrivateSurface() {
  const tracked = gitFiles();
  for (const file of tracked) {
    if (/^artifacts\/(?!\.gitkeep$)/.test(file)) fail(`runtime artifact is tracked: ${file}`);
    if (/(?:^|\/)(?:storage[-_]?state|auth[-_]?state|credentials?|secrets?)(?:[._-]|\/|$)/i.test(file) && !/\.(?:ts|mjs|js)$/.test(file)) fail(`credential-like tracked path: ${file}`);
    if (/(?:\.storage-state|\.cookies\.json|\.token(?:s)?\.json|\.trace\.zip|\.har)$/i.test(file)) fail(`private runtime file is tracked: ${file}`);
  }
  const ignore = read('.gitignore');
  for (const required of ['artifacts/*', '.nightwatch/', 'storageState*.json', '*credentials*.json']) {
    if (!ignore.includes(required)) fail(`.gitignore is missing private-runtime rule: ${required}`);
  }
  const adapters = read('src/data/phase6/adapters.ts');
  if (!adapters.includes('assertOwnerPolicyAllows(`${_request.datastore}_DATA_ORACLE`)')) fail('Phase 6 real datastore adapter is missing the owner gate');
}

function checkAiReviewBoundary() {
  const aiDirectory = path.join(root, 'src/core/aiReview');
  const aiFiles = fs.existsSync(aiDirectory)
    ? fs.readdirSync(aiDirectory).filter((file) => file.endsWith('.ts')).map((file) => `src/core/aiReview/${file}`)
    : [];
  if (aiFiles.length === 0) {
    fail('Phase 7B AI review source is missing');
    return;
  }
  const aiSources = aiFiles.map((file) => [file, read(file)]);
  const packageJson = read('package.json');
  if (/(?:"|')?(?:openai|@anthropic-ai|@google\/generative-ai|@aws-sdk\/client-bedrock|langchain|llamaindex)(?:"|')?/i.test(packageJson)) {
    fail('Phase 7B must not add a cloud AI SDK or agent framework');
  }
  for (const [file, source] of aiSources) {
    if (/from\s+['"]node:(?:child_process|dns|net|https)['"]/.test(source)) fail(`${file} imports a prohibited external/process transport capability`);
    if (/\b(?:child_process|process\.env|shell\s*:\s*true|fetch\s*\(|spawn\s*\(|exec(?:File)?\s*\(|fork\s*\(|WebSocket\s*\(|mcp|MCP)\b/i.test(source)) fail(`${file} exposes process, shell, tool, or unbounded network capability`);
    if (/import\s+[^;]*from\s+['"][^'"]*(?:campaign|oracle|actions?|browser|auth|credential|database|data\/phase6|git)[^'"]*['"]/i.test(source)) fail(`${file} imports an authority, product, credential, database, browser, or Git module`);
    if (/from\s+['"]node:fs['"]|\b(?:writeFile|appendFile|renameSync|unlinkSync)\s*\(/.test(source)) fail(`${file} can write arbitrary filesystem state`);
    if (/\b(?:tools|functions)\s*:/.test(source)) fail(`${file} exposes model tool/function fields`);
    if (/(?:OPENAI|ANTHROPIC|GEMINI|BEDROCK).*KEY|API_KEY|AUTHORIZATION\s*:|https?:\/\//i.test(source)) fail(`${file} contains cloud endpoint or credential configuration`);
  }
  const loopback = read('src/core/aiReview/loopbackProvider.ts');
  if (!/validateLoopbackEndpoint/.test(loopback) || !/LOOPBACK_HOSTS/.test(loopback) || !/agent:\s*false/.test(loopback) || !/statusCode !== 200/.test(loopback)) fail('loopback provider containment is incomplete');
  if (!/context\.signal\.aborted/.test(loopback) || !/signal\.addEventListener\(['"]abort['"]/.test(loopback) || !/destroyRequest/.test(loopback)) fail('loopback provider does not actively consume the session AbortSignal');
  const synthetic = read('src/core/aiReview/syntheticProvider.ts');
  if (!/pendingCount/.test(synthetic) || !/signal\.addEventListener\(['"]abort['"]/.test(synthetic)) fail('synthetic PENDING provider does not clean up on AbortSignal');
  const pipeline = read('src/core/aiReview/pipeline.ts');
  if (!/assertOwnerPolicyAllows\('AI_REVIEW_LOCAL'\)/.test(pipeline) || !/assertOwnerPolicyAllows\('AI_ORACLE_SUGGESTION_LOCAL'\)/.test(pipeline) || !/AI_PROVIDER_NOT_LOCAL/.test(pipeline)) fail('AI pipeline is missing explicit owner/local provider gates');
  if (!/performance\.now\(\)/.test(pipeline) || /options\.clock\s*\?\?\s*\(\)\s*=>\s*Date\.now\(\)/.test(pipeline)) fail('AI runtime budget must use a monotonic default clock');
  if (!/signal:\s*AbortSignal/.test(pipeline) || !/timeoutMs:\s*number/.test(pipeline) || !/controller\.abort\(\)/.test(pipeline) || !/remainingRuntimeMs/.test(pipeline)) fail('AI provider boundary is missing monotonic deadline cancellation context');
  const storage = read('src/core/aiReview/storage.ts');
  if (!/PrivateArtifactStore/.test(storage) || !/writeImmutableJson/.test(storage)) fail('AI artifacts are not routed through immutable private storage');
  if (/writeIncomplete\s*\(|\.writeJson\s*\(/.test(storage)) fail('AI immutable artifacts retain a replacement-capable write path');
  if (/aiReview|AI_REVIEW/i.test(read('bin/phase7-real.mjs'))) fail('Phase 7 real launcher must not invoke AI review');
  for (const file of gitFiles().filter((item) => item.startsWith('src/core/campaign/') || item.startsWith('src/oracles/'))) {
    if (/aiReview|AI_REVIEW/i.test(read(file))) fail(`${file} imports or references AI review authority`);
  }
  if (!/SYNTHETIC_LOCAL.*LOOPBACK_LOCAL/.test(read('src/core/aiReview/types.ts').replace(/\s+/g, ' '))) fail('AI provider class allowlist is not local-only');
}

function checkLocalCanaryBoundary() {
  const controller = read('src/core/aiReview/localCanary.ts');
  const cli = read('bin/ai-local-canary.mjs');
  if (!controller || !cli) return;
  const reviewCalls = controller.match(/\bsession\.reviewBugCandidate\s*\(/g) ?? [];
  if (reviewCalls.length !== 1) fail(`local canary has ${reviewCalls.length} review calls; expected exactly one`);
  if (/\bsuggestOracle\s*\(|new\s+AiReviewArtifactStore|AiReviewArtifactStore|\bstore\s*:/.test(controller)) fail('local canary exposes oracle or artifact-store authority');
  if (/from\s+['"][^'"]*(?:campaign|browser|auth|product|finding|database|data\/phase6|git)[^'"]*['"]/i.test(controller)) fail('local canary imports a product or authority path');
  if (/\b(?:fetch|http\.request|https\.request|net\.connect|WebSocket|child_process|spawn|exec(?:File)?|process\.env|readDir|readdir)\b/i.test(controller)) fail('local canary controller contains an unapproved transport, process, or filesystem capability');
  if (!/fixedSyntheticCanaryInput/.test(controller) || !/LOCAL_CANARY_INPUT_VERSION/.test(controller) || !/LOCAL_CANARY_OPERATION/.test(controller)) fail('local canary fixed fixture identity is missing');
  if (!/new\s+LoopbackAiReviewProvider/.test(controller) || !/new\s+AiReviewSession/.test(controller)) fail('local canary does not construct the hardened loopback/session path');
  if (!/candidateReviewAttempts\s*!==\s*0/.test(controller) || !/oracleSuggestionAttempts\s*!==\s*0/.test(controller) || !/providerCalls\s*!==\s*0/.test(controller)) fail('local canary is missing the pre-call counter invariant');
  if (!/candidateReviewAttempts\s*!==\s*1/.test(controller) || !/oracleSuggestionAttempts\s*!==\s*0/.test(controller) || !/providerCalls\s*!==\s*1/.test(controller)) fail('local canary is missing the post-call counter invariant');
  if (!/artifactPath:\s*null/.test(controller) || !/rawModelOutputPersisted:\s*0/.test(controller)) fail('local canary does not enforce in-memory/no-persistence result metadata');
  for (const forbidden of ['--prompt', '--file', '--input-json', '--artifact-id', '--finding-id', '--customer-data', '--system-prompt', '--temperature', '--tools', '--functions', '--stream', '--output', '--publish', '--git', '--browser', '--campaign', '--auth']) {
    if (cli.includes(forbidden)) fail(`local canary CLI exposes forbidden option ${forbidden}`);
  }
  if (/\b(?:fetch|http\.request|https\.request|net\.connect|WebSocket|child_process|spawn|exec(?:File)?|process\.env|readDir|readdir)\b/i.test(cli)) fail('local canary CLI contains an unapproved transport, process, or filesystem capability');
  if (!/parseLocalCanaryArgs/.test(cli) || !/runSingleLocalCanary/.test(cli) || !/formatLocalCanaryPass/.test(cli)) fail('local canary CLI is not a thin controller wrapper');
}

function selfDevelopmentSourceFiles() {
  const directory = path.join(root, 'src', 'core', 'selfDev');
  if (!fs.existsSync(directory)) return [];
  const result = [];
  const visit = (current, relative) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      const child = path.join(relative, entry.name);
      if (entry.isDirectory()) visit(absolute, child);
      else if (entry.isFile() && child.endsWith('.ts')) result.push(child);
    }
  };
  visit(directory, path.join('src', 'core', 'selfDev'));
  return result.sort();
}

function checkSelfDevelopmentBoundary() {
  const files = selfDevelopmentSourceFiles();
  if (files.length === 0) {
    fail('Phase 8A self-development source is missing');
    return;
  }
  const sources = files.map((file) => [file, read(file)]);
  const combined = sources.map(([, source]) => source).join('\n');
  const provenanceManifest = read('src/core/selfDev/provenanceManifest.ts');
  for (const file of files) {
    if (!provenanceManifest.includes(`'${file}'`)) fail(`authoritative provenance manifest omits tracked selfDev source ${file}`);
  }
  const provenance = read('src/core/provenance/localGit.ts');
  if (!/spawnSync\('git', \[\.\.\.args\]/.test(provenance) || !/shell:\s*false/.test(provenance) || !/timeout:\s*5_000/.test(provenance) || !/maxBuffer:\s*512 \* 1024/.test(provenance)) {
    fail('read-only local Git provenance boundary is not fixed-argv, no-shell, and bounded');
  }
  if (!/GIT_OPTIONAL_LOCKS:\s*'0'/.test(provenance)) fail('read-only local Git provenance does not disable optional Git locks');
  if (/\['(?:add|commit|push|pull|fetch|checkout|switch|reset|clean|stash|merge|rebase|cherry-pick|apply|am|tag|branch|config)'/.test(provenance)) fail('local Git provenance contains a forbidden mutation or remote verb');
  for (const file of gitFiles().filter((item) => item.startsWith('src/core/provenance/') && item.endsWith('.ts'))) {
    if (file !== 'src/core/provenance/localGit.ts' && /node:child_process/.test(read(file))) fail(`${file} is an unapproved Git child-process boundary`);
  }
  for (const [file, source] of sources) {
    if (/from\s+['"][^'"]*(?:aiReview|campaign|oracles?|browser|products?|phase6|oops|database|infrastructure|auth|network|git)[^'"]*['"]/i.test(source)) {
      fail(`${file} imports a prohibited Phase 8A authority or transport`);
    }
    if (/node:(?:child_process|fs|net|http|https|dns|tls|worker_threads)/.test(source)) fail(`${file} imports a prohibited runtime capability`);
    if (/\b(?:fetch|http\.request|https\.request|net\.connect|WebSocket|child_process|spawn|exec(?:File)?|eval|Function\s*\(|process\.env)\b/i.test(source)) fail(`${file} exposes a prohibited runtime capability`);
    if (/\b(?:writeFile|appendFile|renameSync|unlinkSync|rmSync|copyFileSync|git\s+(?:apply|add|commit|push))\b/i.test(source)) fail(`${file} contains a source/filesystem/Git write path`);
    if (/\b(?:AiReviewSession|LoopbackAiReviewProvider|SyntheticAiReviewProvider|reviewBugCandidate|suggestOracle|registerAiReviewProvider)\b/.test(source)) fail(`${file} enters Phase 7B AI review authority`);
    if (/register[^\n]*(?:oracle|assertion)|(?:oracle|assertion)[^\n]*register/i.test(source)) fail(`${file} registers executable oracle/assertion authority`);
  }
  const candidateSource = read('src/core/selfDev/validation.ts');
  const keyStart = candidateSource.indexOf('const CANDIDATE_KEYS');
  const keyEnd = candidateSource.indexOf('const CANDIDATE_OPTIONAL_KEYS');
  const keyBlock = keyStart >= 0 && keyEnd > keyStart ? candidateSource.slice(keyStart, keyEnd) : '';
  for (const field of ['code', 'source', 'sourceCode', 'patch', 'diff', 'command', 'shell', 'script', 'url', 'endpoint', 'prompt', 'model', 'tools', 'functions', 'git', 'pathTraversal', 'outputPath']) {
    if (new RegExp(`['"]${field}['"]`).test(keyBlock)) fail(`Phase 8A candidate schema contains forbidden field ${field}`);
  }
  const proposer = read('src/core/selfDev/proposer.ts');
  if (!/class\s+SyntheticDeterministicProposer/.test(proposer)) fail('Phase 8A does not have the sole synthetic deterministic proposer');
  if (/class\s+(?:Local|Cloud|Remote|Agent)[A-Za-z]*Proposer/.test(combined)) fail('Phase 8A contains an unauthorized proposer class');
  const registry = read('src/core/selfDev/registry.ts');
  if (!/SELFDEV_ACTIONS/.test(registry) || !/SELFDEV_ASSERTIONS/.test(registry) || !/resolveSelfDevAction/.test(registry) || !/resolveSelfDevAssertion/.test(registry)) fail('Phase 8A action/assertion allowlists are missing');
  if (/\b(?:callback|executable\s*:\s*true|new\s+Function)\b/i.test(registry)) fail('Phase 8A registry exposes executable candidate behavior');
  const controller = read('src/core/selfDev/controller.ts');
  const storage = read('src/core/selfDev/storage.ts');
  if (!/SELF_DEVELOPMENT_SYNTHETIC_EVALUATION|SELFDEV_SYNTHETIC_BASE_NIGHTWATCH_SHA/.test(controller)) fail('Phase 8A controller lacks its narrow owner/synthetic boundary');
  if (!/PrivateArtifactStore/.test(storage) || !/writeImmutableJson/.test(storage)) fail('Phase 8A private results do not use the hardened immutable private store');
  if (!/validateSessionArtifact/.test(storage) || !/replaySession/.test(storage) || !/readBack/.test(storage)) fail('Phase 8A.1 persistence is missing strict pre-write or read-back replay gates');
  if (!/SELFDEV_PROVENANCE_REQUIRED/.test(controller) || !/provenance/.test(controller)) fail('Phase 8A.1 persistent controller does not require injected provenance');
  const validation = read('src/core/selfDev/validation.ts');
  if (!/sessionArtifactIdFor/.test(validation) || !/assertEvaluationStateInvariant/.test(validation) || !/SELFDEV_SESSION_ARTIFACT_SCHEMA_VERSION/.test(validation)) fail('Phase 8A.1 validation lacks v2 content identity or semantic state invariants');
  const replay = read('src/core/selfDev/replay.ts');
  if (!/canonicalJson\(actual\)/.test(replay) || !/proposals\[index\]/.test(replay) || !/DeterministicReplayClock/.test(replay)) fail('Phase 8A.1 replay is not ordered, exact, and clock-controlled');
  const trust = read('src/core/selfDev/trust.ts');
  if (!/VERIFIED_EXACT_BASE/.test(trust) || !/VERIFIED_SOURCE_EQUIVALENT_DESCENDANT/.test(trust) || !/LEGACY_UNVERIFIED_NOT_ELIGIBLE/.test(trust)) fail('Phase 8A.1 trust assessment is missing currentness or legacy quarantine');
  if (!/assessFutureReviewEligibility/.test(trust)) fail('Phase 8A.1.1 canonical future-review eligibility gate is missing');
  if (!/Number\.isInteger/.test(trust)) fail('Phase 8A.1.1 eligibility prerequisite does not validate pass-count shape at runtime');
  if (!/current:\s*CurrentSelfDevSourceView/.test(trust)) fail('Phase 8A.1.1 eligibility gate does not require a current-source view parameter');
  if (!/SELFDEV_PRIVATE_NAMESPACE/.test(storage) || !/self-development/.test(storage)) fail('Phase 8A private results lack a separate namespace');
  if (!/NOT_AUTHORIZED_PHASE_8A/.test(combined) || !/EVALUATED_PASS_NOT_ADOPTED/.test(combined) || !/PROHIBITED/.test(combined)) fail('Phase 8A result lacks explicit no-adoption/publication authority');
  const cli = read('bin/selfdev-synthetic.mjs');
  if (!/parseArgs/.test(cli) || !/runSyntheticSelfDevSession/.test(cli)) fail('Phase 8A CLI is not a thin synthetic controller wrapper');
  if (/\b(?:child_process|fetch\s*\(|http\.request|https\.request|net\.connect|WebSocket|git\s+(?:add|commit|push|apply)|AiReview|owner-review|database|production|NIGHTWATCH_STORAGE_STATE)\b/i.test(cli)) fail('Phase 8A CLI exposes a prohibited capability');
  if (/fs\.(?:write|append|rename|unlink|rm|copy|mkdir|link)/i.test(cli)) fail('Phase 8A CLI contains a filesystem-write path');
  if (!/readLocalNightwatchProvenance/.test(cli)) fail('Phase 8A synthetic CLI does not derive local Git/source provenance');
  const verifyCli = read('bin/selfdev-verify.mjs');
  if (!/--artifact-id/.test(verifyCli) || !/readOnly:\s*true/.test(verifyCli) || !/assessSelfDevArtifactIntegrity/.test(verifyCli)) fail('Phase 8A.1 verifier CLI lacks exact-ID read-only assessment');
  if (/(?:--latest|--all|--list|--root|--output|--patch|--adopt|--apply|--commit|--push|--model|--prompt|--url|--repo|--force)/.test(verifyCli) && !/SELFDEV_VERIFY_USAGE_INVALID/.test(verifyCli)) fail('Phase 8A.1 verifier CLI does not reject broad selection or mutation options');
  const provenanceCli = read('bin/selfdev-provenance.mjs');
  if (!/readLocalNightwatchProvenance/.test(provenanceCli) || /node:child_process|fs\.(?:write|append|rename|unlink|rm|copy|mkdir|link)/i.test(provenanceCli)) fail('read-only provenance CLI boundary is incomplete');
  const index = read('src/core/selfDev/index.ts');
  if (/export\s+\*\s+from\s+['"]\.\/storage['"]/.test(index) || /createSessionArtifact/.test(index)) fail('selfDev public index exposes a raw artifact constructor or storage wildcard');
  const ownerPolicy = read('src/core/policy/ownerScope.ts');
  if (!/SELF_DEVELOPMENT_SYNTHETIC_EVALUATION/.test(ownerPolicy)) fail('Phase 8A lacks a distinct owner-policy capability');
}

function selfDevSandboxSourceFiles() {
  const directory = path.join(root, 'src', 'core', 'selfDevSandbox');
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => path.join('src', 'core', 'selfDevSandbox', entry.name))
    .sort();
}

function checkPhase8BSandboxBoundary() {
  const files = selfDevSandboxSourceFiles();
  if (files.length === 0) {
    fail('Phase 8B sandbox adoption source is missing');
    return;
  }
  const sources = files.map((file) => [file, read(file)]);
  const combined = sources.map(([, source]) => source).join('\n');
  const provenanceManifest = read('src/core/selfDev/provenanceManifest.ts');
  for (const file of files) {
    if (!provenanceManifest.includes(`'${file}'`)) fail(`authoritative provenance manifest omits tracked selfDevSandbox source ${file}`);
  }
  if (!provenanceManifest.includes("'src/core/selfDev/adoptedCaseCatalog.generated.ts'") || !provenanceManifest.includes("'src/core/selfDev/adoptedCases.ts'")) {
    fail('authoritative provenance manifest omits the adopted-case catalog or its schema module');
  }
  if (!provenanceManifest.includes("'bin/selfdev-adopt-sandbox.mjs'")) fail('authoritative provenance manifest omits the Phase 8B CLI');

  for (const [file, source] of sources) {
    if (/from\s+['"][^'"]*(?:aiReview|campaign|oracles?|browser|products?|phase6|oops|database|infrastructure|auth|network|git)[^'"]*['"]/i.test(source)) {
      fail(`${file} imports a prohibited Phase 8B authority or transport`);
    }
    if (/node:(?:child_process|net|http|https|dns|tls|worker_threads)/.test(source)) fail(`${file} imports a prohibited runtime capability`);
    if (/\b(?:fetch|http\.request|https\.request|net\.connect|WebSocket|child_process|spawn|exec(?:File)?|eval|new\s+Function\s*\(|process\.env)\b/i.test(source)) fail(`${file} exposes a prohibited runtime capability`);
    if (/\bspawnSync\s*\(\s*['"]git['"]/.test(source)) fail(`${file} spawns Git directly`);
    if (/\b(?:AiReviewSession|LoopbackAiReviewProvider|SyntheticAiReviewProvider|reviewBugCandidate|suggestOracle)\b/.test(source)) fail(`${file} enters Phase 7B AI review authority`);
  }
  // The loader may require exactly one bare npm specifier: the already-installed local TypeScript compiler.
  const loader = read('src/core/selfDevSandbox/sandboxLoader.ts');
  const bareRequires = loader.match(/requireFn\(\s*'([^./][^']*)'\s*\)/g) ?? [];
  for (const occurrence of bareRequires) {
    if (!/'typescript'/.test(occurrence)) fail(`sandbox loader requires an unapproved bare module: ${occurrence}`);
  }
  if (!/loadInFlight/.test(loader) || !/SELFDEV_SANDBOX_LOADER_BUSY/.test(loader)) fail('sandbox loader is missing its serial-execution lock');
  if (!/resolvedSandboxRoot/.test(loader) || !/SELFDEV_SANDBOX_LOADER_PATH_ESCAPE/.test(loader)) fail('sandbox loader is missing its path-confinement check');
  if (!/delete requireFn\.cache/.test(loader)) fail('sandbox loader does not clear its module cache');

  const mirror = read('src/core/selfDevSandbox/sandboxMirror.ts');
  if (!/SELFDEV_AUTHORITATIVE_PATHS/.test(mirror)) fail('sandbox mirror does not copy the fixed authoritative source set');
  if (!/isSymbolicLink/.test(mirror)) fail('sandbox mirror is missing symlink rejection');
  if (!/mode:\s*0o700/.test(mirror) || !/mode:\s*0o600/.test(mirror)) fail('sandbox mirror does not use owner-only directory/file permissions');
  if (!/resolvedBase\s*\+\s*path\.sep/.test(mirror)) fail('sandbox cleanup does not confine deletion to the fixed sandbox base');

  const planner = read('src/core/selfDevSandbox/planner.ts');
  if (!/assessFutureReviewEligibility/.test(planner)) fail('Phase 8B planner does not consume the canonical future-review eligibility gate');
  if (!/SELF_DEVELOPMENT_SANDBOX_ADOPTION/.test(planner)) fail('Phase 8B planner is missing its owner-policy gate');
  if (!/ALREADY_ADOPTED/.test(planner) || !/CATALOG_FULL/.test(planner) || !/CATALOG_NONCANONICAL/.test(planner)) fail('Phase 8B planner is missing a required fail-closed gate');
  if (!/sourceBundleDigestBefore\s*!==\s*plan\.sourceBundleDigestBefore/.test(planner) && !/current\.sourceBundleDigest\s*!==\s*plan\.sourceBundleDigestBefore/.test(planner)) {
    fail('Phase 8B planner is missing TOCTOU source-bundle revalidation');
  }

  const executor = read('src/core/selfDevSandbox/sandboxExecutor.ts');
  if (!/SELF_DEVELOPMENT_SANDBOX_ADOPTION/.test(executor)) fail('Phase 8B sandbox executor is missing its owner-policy gate');
  if (!/revalidatePlan/.test(executor)) fail('Phase 8B sandbox executor does not revalidate the plan before mutation');
  if (!/diffSandboxAgainstCanonical/.test(executor) || !/changedFiles\.length\s*!==\s*1/.test(executor)) fail('Phase 8B sandbox executor does not enforce exactly one changed file');
  if (!/cleanupSandboxMirror/.test(executor)) fail('Phase 8B sandbox executor does not clean up its sandbox mirror');
  // The four metamorphic-probe verdicts are proved by the shared pure
  // src/core/selfDev/metamorphicProbes.ts implementation (Phase 8B.1 extracted
  // it so canonical verification can reuse the same proof logic); the
  // executor must still be the one invoking it.
  const metamorphicProbes = read('src/core/selfDev/metamorphicProbes.ts');
  if (!/runMetamorphicProbes/.test(executor)) fail('Phase 8B sandbox executor does not invoke the shared metamorphic proof implementation');
  if (!/REJECTED_DUPLICATE/.test(metamorphicProbes) || !/EVALUATED_PASS_NOT_ADOPTED/.test(metamorphicProbes) || !/REJECTED_SAFETY/.test(metamorphicProbes)) {
    fail('shared metamorphic proof implementation is missing a required probe verdict');
  }
  if (!/SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED/.test(combined) || !/canonicalApply:\s*'PROHIBITED'/.test(combined) || !/publication:\s*'PROHIBITED'/.test(combined)) {
    fail('Phase 8B sandbox result lacks explicit non-canonical/no-publication authority');
  }

  const storage = read('src/core/selfDevSandbox/storage.ts');
  if (!/PrivateArtifactStore/.test(storage) || !/writeImmutableJson/.test(storage)) fail('Phase 8B plan/result storage does not use the hardened immutable private store');
  if (/\.writeJson\s*\(|writeIncomplete\s*\(/.test(storage)) fail('Phase 8B plan/result storage retains a replacement-capable write path');

  const index = read('src/core/selfDevSandbox/index.ts');
  if (!/runSandboxAdoption/.test(index) || !/planAdoption/.test(index)) fail('Phase 8B public index is missing its plan/run entry points');

  const ownerPolicy = read('src/core/policy/ownerScope.ts');
  if (!/SELF_DEVELOPMENT_SANDBOX_ADOPTION/.test(ownerPolicy)) fail('Phase 8B lacks a distinct owner-policy capability');

  const cli = read('bin/selfdev-adopt-sandbox.mjs');
  if (!/inspectSelfDevAdoption/.test(cli) || !/planAdoption/.test(cli) || !/runSandboxAdoption/.test(cli)) fail('Phase 8B CLI is not a thin wrapper over inspect/plan/run');
  if (!/SANDBOX_ONLY/.test(cli)) fail('Phase 8B CLI is missing its fixed confirmation token');
  const forbiddenCliOptions = [
    '--path', '--file', '--source', '--code', '--patch', '--diff', '--repo', '--root',
    '--sandbox-root', '--target', '--command', '--shell', '--model', '--prompt', '--url',
    '--endpoint', '--latest', '--all', '--apply', '--commit', '--push', '--publish', '--force', '--yes',
  ];
  for (const option of forbiddenCliOptions) if (cli.includes(option)) fail(`Phase 8B CLI references a forbidden option ${option}`);
  for (const forbiddenCommand of ['apply', 'promote', 'commit', 'merge', 'install']) {
    if (new RegExp(`command === '${forbiddenCommand}'`).test(cli)) fail(`Phase 8B CLI exposes a forbidden command ${forbiddenCommand}`);
  }
  if (/child_process|fetch\s*\(|http\.request|https\.request|net\.connect|WebSocket|git\s+(?:add|commit|push|apply)/i.test(cli)) fail('Phase 8B CLI exposes a prohibited capability');

  if (!/NOT_AUTHORIZED_PHASE_8A|SANDBOX_ONLY|PROHIBITED/.test(combined)) fail('Phase 8B source lacks explicit authority-boundary markers');

  // Call-graph containment: only the Phase 8B CLI and the sandbox module
  // itself may reach the sandbox source-WRITE executor (`runSandboxAdoption`)
  // or its planner (`planAdoption`). Phase 8B.1's canonical-promotion
  // boundary (`src/core/selfDevPromotion/` + its CLI) is a second, narrower,
  // documented exception: it legitimately needs READ-ONLY access to existing
  // Phase 8B plan/result artifacts (`SelfDevAdoptionPlanStore`/
  // `SelfDevAdoptionResultStore`) and the bounded module loader
  // (`loadSandboxModules`) as part of its trust chain — but never the write
  // executor or planner themselves (enforced separately by
  // checkPhase8B1CanonicalPromotionBoundary).
  const approvedCallers = new Set([...files, 'bin/selfdev-adopt-sandbox.mjs']);
  const approvedReadOnlyCrossBoundaryCallers = new Set([
    ...selfDevPromotionSourceFiles(), 'bin/selfdev-promote-canonical.mjs',
  ]);
  const otherSources = gitFiles()
    .filter((file) => (file.startsWith('src/') || file.startsWith('bin/')) && /\.(?:ts|mjs|js)$/.test(file))
    .filter((file) => !approvedCallers.has(file) && file !== 'bin/hardening-check.mjs' && !file.startsWith('tests/'));
  for (const file of otherSources) {
    const source = read(file);
    if (/\brunSandboxAdoption\s*\(|\bplanAdoption\s*\(/.test(source)) {
      fail(`${file} reaches Phase 8B sandbox-write/plan authority outside the approved boundary`);
    }
    if (!approvedReadOnlyCrossBoundaryCallers.has(file)) {
      if (/\bSelfDevAdoptionPlanStore\b|\bSelfDevAdoptionResultStore\b/.test(source)) {
        fail(`${file} reaches Phase 8B sandbox storage outside the approved boundary`);
      }
      if (/from\s+['"][^'"]*selfDevSandbox[^'"]*['"]/.test(source)) fail(`${file} imports the Phase 8B sandbox boundary outside its approved callers`);
    }
  }
}

function checkImmutablePrivatePublication() {
  const source = read('src/core/policy/privateArtifacts.ts');
  const start = source.indexOf('  writeImmutableJson(');
  const end = source.indexOf('\n  /** Always throws', start);
  const method = start >= 0 && end > start ? source.slice(start, end) : '';
  if (!method) {
    fail('writeImmutableJson method is missing');
    return;
  }
  if (!/fs\.linkSync\(temporary, destination\)/.test(method)) fail('immutable publication does not use atomic linkSync create-if-absent');
  if (/renameSync|\.writeJson\s*\(|\.readJson\s*\(|unlinkSync\(destination\)|copyFileSync|writeFileSync\(destination/.test(method)) fail('immutable publication contains a replacement-capable or unsafe fallback');
  if (!/openSync\(temporary, ['"]wx['"], 0o600\)/.test(source) || !/fs\.fsyncSync\(descriptor\)/.test(source)) fail('private temporary publication is not wx/0600 and file-fsynced');
  if (!/randomBytes\(/.test(source) || !/\.tmp/.test(source)) fail('private temporary names are not process-collision-resistant hidden files');
  if (!/fs\.unlinkSync\(temporary\)/.test(method)) fail('immutable publication does not clean its temporary name');
  if (!/fsyncDirectory\(\)/.test(method) || !/fs\.fsyncSync\(descriptor\)/.test(source)) fail('immutable publication does not fsync the containing directory');
  if (!/PRIVATE_ARTIFACT_NO_REPLACE_UNSUPPORTED/.test(method)) fail('immutable publication lacks a precise unsupported no-replace failure');
  const storage = read('src/core/aiReview/storage.ts');
  if (!/writeBugDraft[\s\S]*writeImmutableJson/.test(storage) || !/writeOracleSuggestion[\s\S]*writeImmutableJson/.test(storage) || !/writeHumanReview[\s\S]*writeImmutableJson/.test(storage)) fail('AI bug/oracle/review writes do not all use immutable publication');
  if (/writeIncomplete\s*\(|\.writeJson\s*\(/.test(storage)) fail('AI immutable storage uses replacement-capable writeJson/writeIncomplete');
}

function checkOwnerDecisionAuthority() {
  const index = read('src/core/aiReview/index.ts');
  if (/export\s+\*\s+from\s+['"]\.\/ownerReview['"]/.test(index)) fail('AI public index wildcard-exports owner review authority');
  if (/ownerDecision|recordOwnerDecision|recordConfirmedOwnerDecision|createHumanReviewRecord/.test(index)) fail('AI public index exposes owner-decision write authority');

  const internal = 'src/core/aiReview/ownerDecision.ts';
  const internalSource = read(internal);
  if (!/function\s+recordOwnerDecision\s*\(/.test(internalSource) || /export\s+function\s+recordOwnerDecision\s*\(/.test(internalSource)) fail('raw unconfirmed owner decision helper is not private');
  if (!/export\s+function\s+recordConfirmedOwnerDecision\s*\(/.test(internalSource) || !/confirmationMatches\(/.test(internalSource) || !/expectedArtifactDigest/.test(internalSource)) fail('internal owner decision boundary is missing confirmation/digest requirements');

  const sourceFiles = gitFiles()
    .filter((file) => (file.startsWith('src/') || file.startsWith('bin/')) && /\.(?:ts|mjs|js)$/.test(file))
    .filter((file) => file !== 'bin/hardening-check.mjs' && file !== internal && file !== 'src/core/aiReview/review.ts');
  for (const file of sourceFiles) {
    const source = read(file);
    if (file !== 'bin/ai-owner-review.mjs' && /[\'\"]ownerDecision\.ts[\'\"]|recordConfirmedOwnerDecision|\bcreateHumanReviewRecord\s*\(|\.writeHumanReview\s*\(/.test(source)) fail(`${file} reaches owner-decision write authority outside the approved boundary`);
  }
  const cli = read('bin/ai-owner-review.mjs');
  if (!/ownerDecision\.ts/.test(cli) || !/recordConfirmedOwnerDecision/.test(cli)) fail('owner-review CLI is not the sole internal owner-decision loader');
  if (!/process\.stdin\.isTTY/.test(cli) || !/process\.stdout\.isTTY/.test(cli)) fail('owner-review CLI is missing its TTY boundary');
  if (!/A = approve draft, R = reject, S = supersede, Q = cancel/.test(cli)) fail('owner-review CLI fixed decision menu is missing');
  if (!/Type \$\{token\} to confirm exactly/.test(cli)) fail('owner-review CLI exact second confirmation is missing');
}

function checkAiInvocationAuthority() {
  const pipeline = read('src/core/aiReview/pipeline.ts');
  const index = read('src/core/aiReview/index.ts');
  if (/export\s+(?:async\s+)?function\s+(?:reviewBugCandidate|suggestOracle)\b/.test(pipeline)) fail('AI pipeline exports an unbudgeted provider execution function');
  if (/export\s+\*\s+from\s+['"]\.\/pipeline['"]/.test(index) || /export\s*\{[^}]*\b(?:reviewBugCandidate|suggestOracle)\b[^}]*\}/s.test(index)) fail('AI public index exposes a raw provider execution function');
  if (!/export\s*\{\s*AiReviewSession\s*\}\s*from\s+['"]\.\/pipeline['"]/.test(index)) fail('AiReviewSession is not the explicit public provider execution boundary');
  if (!/class\s+AiReviewSession/.test(pipeline) || !/private\s+reserveProviderCall/.test(pipeline) || !/this\.providerCalls\s*\+=\s*1/.test(pipeline)) fail('AI session does not contain the canonical synchronous provider reservation');

  const sourceFiles = gitFiles()
    .filter((file) => (file.startsWith('src/') || file.startsWith('bin/')) && /\.(?:ts|mjs|js)$/.test(file))
    .filter((file) => file !== 'bin/hardening-check.mjs');
  for (const file of sourceFiles) {
    const source = read(file);
    if (file !== 'src/core/aiReview/pipeline.ts' && file !== 'src/core/aiReview/localCanary.ts' && /\.\s*(?:reviewBugCandidate|suggestOracle)\s*\(/.test(source)) fail(`${file} directly invokes a raw AI provider operation`);
    if (file !== 'src/core/aiReview/pipeline.ts' && /\binvokeRegisteredProvider\s*\(/.test(source)) fail(`${file} imports or invokes the private AI provider boundary`);
    if (!file.startsWith('src/core/aiReview/') && /\b(?:AiReviewSession|registerAiReviewProvider|invokeRegisteredProvider|reviewBugCandidate|suggestOracle)\b/.test(source)) fail(`${file} imports or invokes AI review execution outside the AI subsystem`);
  }
  const boundaryOccurrences = pipeline.match(/\binvokeRegisteredProvider\s*\(/g) ?? [];
  if (boundaryOccurrences.length !== 2) fail(`AI provider boundary has ${boundaryOccurrences.length} references; expected one definition and one canonical call`);
  if (/new\s+AiReviewSession\s*\(/.test(sourceFiles.filter((file) => !file.startsWith('src/core/aiReview/')).map((file) => read(file)).join('\n'))) fail('runtime source creates automatic AI review sessions outside the AI subsystem');
}

function checkOwnerReviewCliBoundary() {
  const file = 'bin/ai-owner-review.mjs';
  const source = read(file);
  if (!source) return;
  if (!source.includes('ownerReview.ts')) fail(`${file} does not load the provider-free owner-review service`);
  const forbidden = [
    /\bAiReviewSession\b/,
    /\bSyntheticAiReviewProvider\b/,
    /\bLoopbackAiReviewProvider\b/,
    /\bfetch\s*\(/,
    /\b(?:http|https)\.request\s*\(/,
    /\bnet\.connect\s*\(/,
    /\bspawn\s*\(/,
    /\bexec(?:File)?\s*\(/,
    /\bchild_process\b/,
    /\bgit\s+push\b/i,
    /\bGitHub\b/,
    /\bSlack\b/,
    /\b(?:publish|publication|share|export|clipboard|editor|pager)\b/i,
  ];
  for (const pattern of forbidden) if (pattern.test(source)) fail(`${file} references a prohibited execution, transport, publication, or external capability`);
  if (/--(?:approve|reject|supersede|decision(?:=|\b)|yes|force|non-interactive)\b/i.test(source)) fail(`${file} contains a decision argument shortcut`);
  if (/from\s+['"][^'"]*aiReview(?:['"]|\/index)/i.test(source) || /from\s+['"][^'"]*(?:pipeline|syntheticProvider|loopbackProvider)[^'"]*['"]/i.test(source)) fail(`${file} imports an AI execution path rather than the owner-review service`);
  if (/\bwrite(?:Json|File|ImmutableJson|Incomplete)\s*\(/.test(source)) fail(`${file} writes private state directly instead of routing through the owner-review service`);
  if (!/record(?:Confirmed)?OwnerDecision/.test(source) || !/AiReviewArtifactStore/.test(source)) fail(`${file} does not route its sole write through owner-review service/storage`);
}

function checkSyntax() {
  for (const file of fs.readdirSync(path.join(root, 'bin')).filter((item) => item.endsWith('.mjs'))) {
    const result = spawnSync(process.execPath, ['--check', path.join(root, 'bin', file)], { cwd: root, encoding: 'utf8', timeout: 10_000, maxBuffer: 256 * 1024, env: childEnvironment });
    if (result.status !== 0) fail(`node --check failed for bin/${file}: ${(result.stderr ?? '').trim()}`);
  }
}

/**
 * Phase 8B.0.1 closeout integrity: sandbox-base pre-validation ordering,
 * single-strategy binding, complete verified-result metamorphic invariants,
 * and truthful sandbox write accounting. Behavioral tests are primary; these
 * structural assertions guard the same invariants at source level.
 */
function checkPhase8B01CloseoutIntegrity() {
  const mirror = read('src/core/selfDevSandbox/sandboxMirror.ts');
  if (!/ensurePrivateSandboxBase/.test(mirror)) fail('8B.0.1: sandbox mirror lacks the validated base-establishment routine');
  if (!/firstMissingPathnameComponent/.test(mirror)) fail('8B.0.1: sandbox mirror lacks component-wise pathname-chain validation');
  if (!/SELFDEV_SANDBOX_BASE_SYMLINK/.test(mirror) || !/SELFDEV_SANDBOX_BASE_NOT_DIRECTORY/.test(mirror) || !/SELFDEV_SANDBOX_BASE_ANCESTOR_MISSING/.test(mirror)) {
    fail('8B.0.1: sandbox mirror lacks fail-closed chain validation codes');
  }
  if (!/_PERMISSIONS_UNSAFE/.test(mirror) || !/_OWNER/.test(mirror)) {
    fail('8B.0.1: sandbox mirror lacks owner/permission fail-closed validation');
  }
  // The validated base MUST be established before any instance mutation.
  if (!/function createSandboxMirror[\s\S]{0,200}?ensurePrivateSandboxBase\(\);[\s\S]{0,200}?mkdtempSync/.test(mirror)) {
    fail('8B.0.1: createSandboxMirror does not validate the base chain before mkdtemp');
  }
  // Parent mode tightening (established convention) may only chmod a path
  // already proven to be a non-symlink owner-matched directory.
  if (!/function ensureOwnerPrivateDirectory[\s\S]*?assertNoSymlink[\s\S]*?chmodSync/.test(mirror)) {
    fail('8B.0.1: parent repair chmod may precede symlink/owner validation');
  }
  // The base itself must never be chmodded by the establishment routine.
  if (/function ensurePrivateSandboxBase[\s\S]{0,1200}?chmodSync/.test(mirror)) {
    fail('8B.0.1: ensurePrivateSandboxBase chmods a pathname');
  }
  // Cleanup stays confined to the validated base (mirror root strict child).
  if (!/resolvedRoot === resolvedBase \|\| !resolvedRoot\.startsWith\(resolvedBase \+ path\.sep\)/.test(mirror)) {
    fail('8B.0.1: cleanup does not require strict containment beneath the validated base');
  }

  const validation = read('src/core/selfDevSandbox/validation.ts');
  if (!/SELFDEV_ADOPTION_STRATEGY_CLASS/.test(validation)) fail('8B.0.1: plan/result validation does not bind the single strategy constant');
  if (!/PLAN_STRATEGY_MISMATCH/.test(validation)) fail('8B.0.1: plan/adopted-case strategy cross-binding is missing');
  if (!/result\.nonOverreachResult !== 'PASS'/.test(validation)) fail('8B.0.1: verified-result invariant does not require the non-overreach proof PASS');
  if (!/result\.sandboxSourceWrites > 1/.test(validation)) fail('8B.0.1: sandbox write count is not bounded to at most one');
  if (!/NON_OVERREACH_PROBE_UNAVAILABLE/.test(validation)) fail('8B.0.1: NON_OVERREACH_PROBE_UNAVAILABLE is not a valid failure class');

  const executor = read('src/core/selfDevSandbox/sandboxExecutor.ts');
  if (!/let sandboxSourceWrites = 0/.test(executor) || !/sandboxSourceWrites = 1/.test(executor)) fail('8B.0.1: executor does not track actual sandbox writes');
  if (/sandboxSourceWrites:\s*[01],/.test(executor)) fail('8B.0.1: executor hardcodes the sandbox write count instead of the tracked value');
  if (!/probes\.nonOverreachResult === 'NOT_RUN'/.test(executor) || !/NON_OVERREACH_PROBE_UNAVAILABLE/.test(executor)) fail('8B.0.1: executor does not fail closed when the non-overreach probe is unavailable');
  if (!/probes\.nonOverreachResult === 'FAIL'/.test(executor) || !/NON_OVERREACH_REGRESSION/.test(executor)) fail('8B.0.1: executor does not distinguish a failed non-overreach probe');

  const types = read('src/core/selfDevSandbox/types.ts');
  if (!/NON_OVERREACH_PROBE_UNAVAILABLE/.test(types)) fail('8B.0.1: failure-class union lacks NON_OVERREACH_PROBE_UNAVAILABLE');
  if (!/SelfDevAdoptionStrategyClass/.test(types)) fail('8B.0.1: plan/result strategyClass is not the literal single-strategy type');

  const loader = read('src/core/selfDevSandbox/sandboxLoader.ts');
  if (!/finally\s*\{[\s\S]{0,500}?loadInFlight = false/.test(loader)) fail('8B.0.1: sandbox loader lock is not released on every exit path');

  const index = read('src/core/selfDevSandbox/index.ts');
  if (/setSandboxBaseOverrideForTests/.test(index)) fail('8B.0.1: the test-only sandbox-base override leaked into the boundary index');

  const adoptedCases = read('src/core/selfDev/adoptedCases.ts');
  if (!/SelfDevAdoptionStrategyClass/.test(adoptedCases)) fail('8B.0.1: the single strategy class lacks a literal exported type');
}

function selfDevPromotionSourceFiles() {
  const directory = path.join(root, 'src', 'core', 'selfDevPromotion');
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => path.join('src', 'core', 'selfDevPromotion', entry.name))
    .sort();
}

function checkPhase8B1CanonicalPromotionBoundary() {
  const files = selfDevPromotionSourceFiles();
  if (files.length === 0) {
    fail('Phase 8B.1 canonical promotion source is missing');
    return;
  }
  const sources = files.map((file) => [file, read(file)]);
  const combined = sources.map(([, source]) => source).join('\n');
  const provenanceManifest = read('src/core/selfDev/provenanceManifest.ts');
  for (const file of files) {
    if (!provenanceManifest.includes(`'${file}'`)) fail(`authoritative provenance manifest omits tracked selfDevPromotion source ${file}`);
  }
  if (!provenanceManifest.includes("'bin/selfdev-promote-canonical.mjs'")) fail('authoritative provenance manifest omits the Phase 8B.1 CLI');

  const ownerPolicy = read('src/core/policy/ownerScope.ts');
  if (!/SELF_DEVELOPMENT_CANONICAL_ADOPTION/.test(ownerPolicy)) fail('Phase 8B.1 lacks a distinct owner-policy capability');
  if (!/owner-scope-policy\.v2/.test(ownerPolicy)) fail('Phase 8B.1 does not deliberately advance the owner-scope policy version');

  for (const [file, source] of sources) {
    // Deliberately excludes the substring "git" from this prohibited-import
    // scan (unlike the Phase 8B sandbox check): every promotion file is
    // REQUIRED to import the single approved read-only Git provenance
    // boundary (`../provenance/localGit`); a broad "git" substring ban would
    // reject that legitimate, required import.
    if (/from\s+['"][^'"]*(?:aiReview|campaign|oracles?|browser|products?|phase6|oops|database|infrastructure|auth|network)[^'"]*['"]/i.test(source)) {
      fail(`${file} imports a prohibited Phase 8B.1 authority or transport`);
    }
    if (/node:(?:child_process|net|http|https|dns|tls|worker_threads)/.test(source)) fail(`${file} imports a prohibited runtime capability`);
    if (/\b(?:fetch|http\.request|https\.request|net\.connect|WebSocket|child_process|spawn|exec(?:File)?|eval|new\s+Function\s*\(|process\.env)\b/i.test(source)) fail(`${file} exposes a prohibited runtime capability`);
    if (/\bspawnSync\s*\(/.test(source)) fail(`${file} spawns a child process directly instead of using the localGit boundary`);
    if (/\bgit\s+(?:add|commit|push|checkout|restore|reset|clean|stash|merge|rebase|branch|switch|cherry-pick|apply|am|tag)\b/.test(source)) fail(`${file} references a forbidden Git mutation verb`);
    if (/\b(?:AiReviewSession|LoopbackAiReviewProvider|SyntheticAiReviewProvider|reviewBugCandidate|suggestOracle)\b/.test(source)) fail(`${file} enters Phase 7B AI review authority`);
    if (/\brunSandboxAdoption\s*\(|\bplanAdoption\s*\(/.test(source)) fail(`${file} directly invokes Phase 8B sandbox-write/plan authority instead of only its read-only stores`);
  }

  const prepare = read('src/core/selfDevPromotion/prepare.ts');
  if (!/SELF_DEVELOPMENT_CANONICAL_ADOPTION/.test(prepare)) fail('Phase 8B.1 prepare is missing its owner-policy gate');
  if (!/assertRepositoryFullyClean/.test(prepare)) fail('Phase 8B.1 prepare does not require whole-repository cleanliness');
  if (!/assessFutureReviewEligibility/.test(prepare)) fail('Phase 8B.1 prepare does not consume the canonical future-review eligibility gate');
  if (!/ALREADY_ADOPTED/.test(prepare)) fail('Phase 8B.1 prepare is missing its already-adopted fail-closed gate');

  const approve = read('src/core/selfDevPromotion/approve.ts');
  if (!/SELF_DEVELOPMENT_CANONICAL_ADOPTION/.test(approve)) fail('Phase 8B.1 approve is missing its owner-policy gate');
  if (!/SELFDEV_CANONICAL_PROMOTION_APPROVAL_CONFIRMATION/.test(approve)) fail('Phase 8B.1 approve does not require the fixed confirmation token');
  if (!/assertRepositoryFullyClean/.test(approve)) fail('Phase 8B.1 approve does not require whole-repository cleanliness');
  if (!/PROMOTION_SOURCE_ADVANCED/.test(approve)) fail('Phase 8B.1 approve does not fail closed when source has advanced');

  const apply = read('src/core/selfDevPromotion/apply.ts');
  if (!/SELF_DEVELOPMENT_CANONICAL_ADOPTION/.test(apply)) fail('Phase 8B.1 apply is missing its owner-policy gate');
  if (!/claimApprovalConsumption/.test(apply)) fail('Phase 8B.1 apply is missing one-shot approval consumption');
  // The FIRST claim call must precede the LAST invocation of the write
  // helper, so consumption is always claimed strictly before the canonical
  // write is attempted.
  const claimIndex = apply.indexOf('claimApprovalConsumption(');
  const writeIndex = apply.lastIndexOf('atomicWriteTarget(');
  if (claimIndex < 0 || writeIndex < 0 || claimIndex > writeIndex) fail('Phase 8B.1 apply does not consume the approval before the canonical write');
  if (!/isSymbolicLink/.test(apply)) fail('Phase 8B.1 apply is missing symlink rejection on the canonical target');
  if (!/originalMode/.test(apply) || !/chmodSync\(temporary, mode\)/.test(apply)) fail('Phase 8B.1 apply does not preserve the target file mode');
  if (!/TARGET_PATH_ESCAPE/.test(apply)) fail('Phase 8B.1 apply is missing parent-path containment');
  if (!/PROMOTION_SOURCE_ADVANCED/.test(apply)) fail('Phase 8B.1 apply does not require the exact prepared HEAD');
  if (!/ALREADY_ADOPTED/.test(apply)) fail('Phase 8B.1 apply is missing its already-adopted fail-closed gate');
  if (!/CHANGESET_INVALID/.test(apply)) fail('Phase 8B.1 apply does not verify the post-write changeset');
  if (!/APPLIED_RECEIPT_PERSIST_FAILED/.test(apply)) fail('Phase 8B.1 apply does not surface a truthful receipt-persistence failure');

  const verify = read('src/core/selfDevPromotion/verify.ts');
  if (!/SELF_DEVELOPMENT_CANONICAL_ADOPTION/.test(verify)) fail('Phase 8B.1 verify is missing its owner-policy gate');
  if (!/HEAD_ADVANCED/.test(verify)) fail('Phase 8B.1 verify does not require the exact pre-commit HEAD');
  if (!/UNEXPECTED_CHANGESET/.test(verify) || !/UNEXPECTED_STAGED_CHANGE/.test(verify) || !/UNEXPECTED_UNTRACKED_FILE/.test(verify)) {
    fail('Phase 8B.1 verify does not require exactly one dirty tracked file');
  }
  if (!/runMetamorphicProbes/.test(verify)) fail('Phase 8B.1 verify does not reuse the shared metamorphic proof implementation');

  if (!/CANONICAL_APPLIED_VERIFIED_UNCOMMITTED/.test(combined) || !/NOT_PERFORMED_BY_RUNTIME/.test(combined) || !/NOT_AUTHORIZED/.test(combined)) {
    fail('Phase 8B.1 canonical promotion lacks explicit uncommitted/no-runtime-Git authority markers');
  }

  const storage = read('src/core/selfDevPromotion/storage.ts');
  if (!/PrivateArtifactStore/.test(storage) || !/writeImmutableJson/.test(storage)) fail('Phase 8B.1 promotion storage does not use the hardened immutable private store');
  if (/\.writeJson\s*\(|writeIncomplete\s*\(/.test(storage)) fail('Phase 8B.1 promotion storage retains a replacement-capable write path');
  if (!/claimApprovalConsumption/.test(storage)) fail('Phase 8B.1 storage is missing the approval one-shot consumption primitive');

  const index = read('src/core/selfDevPromotion/index.ts');
  if (!/applyPromotion/.test(index) || !/preparePromotion/.test(index) || !/approvePromotion/.test(index) || !/verifyCanonicalPromotion/.test(index)) {
    fail('Phase 8B.1 public index is missing a required entry point');
  }

  const cli = read('bin/selfdev-promote-canonical.mjs');
  if (!/preparePromotion/.test(cli) || !/approvePromotion/.test(cli) || !/applyPromotion/.test(cli) || !/verifyCanonicalPromotion/.test(cli)) {
    fail('Phase 8B.1 CLI is not a thin wrapper over prepare/approve/apply/verify');
  }
  if (!/CANONICAL_ONE_FILE_ONLY/.test(cli)) fail('Phase 8B.1 CLI is missing its fixed approval confirmation token');
  const forbiddenCliOptions = [
    '--path', '--file', '--source', '--code', '--patch', '--diff', '--repo', '--root',
    '--target', '--command', '--shell', '--model', '--prompt', '--url',
    '--endpoint', '--latest', '--all', '--commit', '--push', '--publish', '--force', '--yes', '--rollback',
  ];
  for (const option of forbiddenCliOptions) if (cli.includes(option)) fail(`Phase 8B.1 CLI references a forbidden option ${option}`);
  if (/child_process|fetch\s*\(|http\.request|https\.request|net\.connect|WebSocket|git\s+(?:add|commit|push|apply)/i.test(cli)) fail('Phase 8B.1 CLI exposes a prohibited capability');

  // Call-graph containment: only the Phase 8B.1 CLI and the promotion module
  // itself may reach the canonical-source-write executor.
  const approvedCallers = new Set([...files, 'bin/selfdev-promote-canonical.mjs']);
  const otherSources = gitFiles()
    .filter((file) => (file.startsWith('src/') || file.startsWith('bin/')) && /\.(?:ts|mjs|js)$/.test(file))
    .filter((file) => !approvedCallers.has(file) && file !== 'bin/hardening-check.mjs' && !file.startsWith('tests/'));
  for (const file of otherSources) {
    const source = read(file);
    if (/\bapplyPromotion\s*\(|\bSelfDevCanonicalApplyReceiptStore\b|\bSelfDevCanonicalPromotionApprovalStore\b/.test(source)) {
      fail(`${file} reaches Phase 8B.1 canonical-promotion authority outside the approved boundary`);
    }
    if (/from\s+['"][^'"]*selfDevPromotion[^'"]*['"]/.test(source)) fail(`${file} imports the Phase 8B.1 canonical-promotion boundary outside its approved callers`);
  }
}


function checkPhase8B10PortfolioIntegrity() {
  // Phase 8B.1.0 — bounded deterministic proposal portfolio.
  const portfolio = read('src/core/selfDev/portfolio.ts');
  if (!/SELFDEV_SYNTHETIC_PORTFOLIO_VERSION/.test(portfolio) || !/SELFDEV_SELECTION_ALGORITHM_VERSION/.test(portfolio)) {
    fail('Phase 8B.1.0 portfolio version or selection-algorithm version is missing');
  }
  if (!/deriveAdoptedCaseCoverage/.test(portfolio) || !/selfDevEquivalentFingerprint/.test(portfolio)) {
    fail('Phase 8B.1.0 portfolio must derive coverage/fingerprints from the trusted registry/validation, never free data');
  }
  if (!/SELFDEV_BASELINE_COVERAGE/.test(portfolio)) fail('Phase 8B.1.0 selection must consider the built-in baseline coverage');
  if (/(?:new\s+Function|eval\s*\(|process\.env|Date\.now|Math\.random|performance\.now|node:(?:child_process|fs|net|http|https|dns|tls)|fetch\s*\()/i.test(portfolio)) {
    fail('Phase 8B.1.0 portfolio contains an executable/random/time/network capability');
  }
  if (!/Object\.freeze/.test(portfolio)) fail('Phase 8B.1.0 portfolio is not frozen declarative data');

  const proposer = read('src/core/selfDev/proposer.ts');
  const types = read('src/core/selfDev/types.ts');
  if (!/VALID_MATRIX_EXPAND/.test(proposer) || !/VALID_MATRIX_EXPAND_COLLAPSE/.test(proposer)) {
    fail('Phase 8B.1.0 proposer lacks the concrete portfolio matrix fixtures');
  }
  if (!/VALID_MATRIX_EXPAND/.test(types) || !/VALID_MATRIX_EXPAND_COLLAPSE/.test(types)) {
    fail('Phase 8B.1.0 replay-fixture enum lacks the concrete portfolio fixtures');
  }

  const controller = read('src/core/selfDev/controller.ts');
  if (!/selectNextSyntheticProposalVariant/.test(controller)) fail('Phase 8B.1.0 controller does not consume the deterministic portfolio selector');
  if (!/VALID_MATRIX_EXPAND_COLLAPSE/.test(controller)) fail('Phase 8B.1.0 controller does not resolve the default alias to a concrete portfolio fixture');

  const contract = read('src/core/selfDev/contract.ts');
  if (!/syntheticPortfolioVersion/.test(contract) || !/syntheticSelectionAlgorithmVersion/.test(contract) || !/syntheticProposalPortfolio/.test(contract)) {
    fail('Phase 8B.1.0 contract manifest does not bind the portfolio/selection semantics');
  }
  if (!/nightwatch\.selfdev-contract\.private\.v2/.test(contract)) fail('Phase 8B.1.0 contract manifest version was not deliberately advanced to v2');

  // Production CLIs must never reach the test-only baseline helpers.
  for (const cli of ['bin/selfdev-synthetic.mjs', 'bin/selfdev-verify.mjs', 'bin/selfdev-adopt-sandbox.mjs', 'bin/selfdev-promote-canonical.mjs']) {
    if (/tests\/helpers/.test(read(cli))) fail(`${cli} reaches the test-only source-fixture baseline helpers`);
  }

  // The real canonical adopted-case catalog must remain pure declarative data
  // with zero entries until a real owner-authorized promotion exists (the
  // Phase 8B.1.0 invariant; one-entry/exhausted states are exercised only in
  // temporary source fixtures).
  const catalog = read('src/core/selfDev/adoptedCaseCatalog.generated.ts');
  if (/SELFDEV_ADOPTED_CASES\s*=\s*\[[^\]]/.test(catalog) || !/SELFDEV_ADOPTED_CASES = \[\];/.test(catalog)) {
    fail('the real canonical adopted-case catalog is not empty (Phase 8B.1.0 invariant)');
  }
}

function checkAgentContinuityIntegrity() {
  // The continuity checker and its protocol layer must remain read-only and
  // deterministic: no filesystem mutation, no child processes in the pure
  // module, no network.
  const mutationRe = /(?:fs|node:fs)[\s\S]{0,80}?\b(?:writeFile|writeFileSync|appendFile|appendFileSync|rename|renameSync|chmod|chmodSync|mkdir|mkdirSync|rm|rmSync|unlink|unlinkSync|createWriteStream)\b/;
  for (const file of ['bin/agent-state.mjs', 'bin/agent-continuity-protocol.mjs']) {
    const source = read(file);
    if (mutationRe.test(source)) {
      fail(`${file} contains a filesystem mutation call (continuity checker must be read-only)`);
    }
  }
  const protocolModule = read('bin/agent-continuity-protocol.mjs');
  if (/\b(?:spawnSync|execSync|child_process|fetch\(|https?\.request|net\.)/.test(protocolModule)) {
    fail('bin/agent-continuity-protocol.mjs must stay a pure parsing module (no child processes, no network)');
  }
  if (!/nightwatch\.agent-continuity\.v2/.test(protocolModule)) {
    fail('bin/agent-continuity-protocol.mjs must define the v2 protocol version constant');
  }
  const pkg = read('package.json');
  if (!/"agent:audit"\s*:\s*"node bin\/agent-state\.mjs --audit-history"/.test(pkg)) {
    fail('package.json agent:audit must invoke the local checker with --audit-history');
  }
  const workflow = read('.github/workflows/hardening.yml');
  if (!/Completed-task continuity audit/.test(workflow) || !/npm run agent:audit/.test(workflow)) {
    fail('.github/workflows/hardening.yml must run the Completed-task continuity audit (npm run agent:audit)');
  }
}

checkChildProcessBoundaries();
checkTargetPolicy();
checkTypecheckCoverage();
checkPrivateSurface();
checkAiReviewBoundary();
checkLocalCanaryBoundary();
checkAiInvocationAuthority();
checkOwnerReviewCliBoundary();
checkImmutablePrivatePublication();
checkOwnerDecisionAuthority();
checkSelfDevelopmentBoundary();
checkPhase8BSandboxBoundary();
checkPhase8B01CloseoutIntegrity();
checkPhase8B10PortfolioIntegrity();
checkPhase8B1CanonicalPromotionBoundary();
checkSyntax();

if (errors.length > 0) {
  for (const error of errors) console.error(`[hardening:check] ERROR: ${error}`);
  console.error(`[hardening:check] FAIL (${errors.length} error${errors.length === 1 ? '' : 's'})`);
  process.exitCode = 1;
} else {
  console.log('[hardening:check] PASS: offline structural invariants hold');
}
