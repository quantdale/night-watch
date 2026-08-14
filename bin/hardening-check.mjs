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
  if (!/SELFDEV_PRIVATE_NAMESPACE/.test(storage) || !/self-development/.test(storage)) fail('Phase 8A private results lack a separate namespace');
  if (!/NOT_AUTHORIZED_PHASE_8A/.test(combined) || !/EVALUATED_PASS_NOT_ADOPTED/.test(combined) || !/PROHIBITED/.test(combined)) fail('Phase 8A result lacks explicit no-adoption/publication authority');
  const cli = read('bin/selfdev-synthetic.mjs');
  if (!/parseArgs/.test(cli) || !/runSyntheticSelfDevSession/.test(cli)) fail('Phase 8A CLI is not a thin synthetic controller wrapper');
  if (/\b(?:child_process|fetch\s*\(|http\.request|https\.request|net\.connect|WebSocket|git\s+(?:add|commit|push|apply)|AiReview|owner-review|database|production|NIGHTWATCH_STORAGE_STATE)\b/i.test(cli)) fail('Phase 8A CLI exposes a prohibited capability');
  if (/fs\.(?:write|append|rename|unlink|rm|copy|mkdir|link)/i.test(cli)) fail('Phase 8A CLI contains a filesystem-write path');
  const ownerPolicy = read('src/core/policy/ownerScope.ts');
  if (!/SELF_DEVELOPMENT_SYNTHETIC_EVALUATION/.test(ownerPolicy)) fail('Phase 8A lacks a distinct owner-policy capability');
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
checkSyntax();

if (errors.length > 0) {
  for (const error of errors) console.error(`[hardening:check] ERROR: ${error}`);
  console.error(`[hardening:check] FAIL (${errors.length} error${errors.length === 1 ? '' : 's'})`);
  process.exitCode = 1;
} else {
  console.log('[hardening:check] PASS: offline structural invariants hold');
}
