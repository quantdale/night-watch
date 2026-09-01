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
    'bin/quality-gate.mjs',
    'bin/quality-gate-clean.mjs',
    'bin/planner-handoff-check.mjs',
    'bin/semantic-compat.mjs',
    'bin/phase23-ci.mjs',
    'bin/phase23-dev.mjs',
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

function checkL6ProcessNetworkBoundary() {
  const l6 = read('src/core/oops/l6.ts');
  const process = read('src/core/oops/process.ts');
  if (!/nightwatch\.process-network-containment\.v1/.test(l6)) fail('L6 capability is missing its versioned identity');
  for (const option of ['--unshare-user', '--unshare-net', '--unshare-pid', '--as-pid-1', '--die-with-parent', '--new-session', '--clearenv']) {
    if (!l6.includes(option)) fail(`L6 launcher is missing required rootless option ${option}`);
  }
  if (!/--ro-bind/.test(l6) || /['"]\/['"]\s*,\s*['"]\/['"]/.test(l6)) fail('L6 root view is missing or exposes the host root broadly');
  if (!/INHERITED_AF_UNIX_ONLY/.test(l6) || !/websocketRelayFlow/.test(l6) || !/L6_CONTROL_PROTOCOL_VERSION/.test(l6) || !/MAX_FRAME_BYTES/.test(l6)) fail('L6 AF_UNIX control protocol is not versioned/bounded');
  if (/shell\s*:\s*true/.test(l6) || /--privileged|iptables|nftables|sudo\b|tls\s*mitm/i.test(l6)) fail('L6 introduces privileged or shell/network-administration authority');
  if (!/process\.kill\(-child\.pid/.test(l6) || !/--die-with-parent/.test(l6)) fail('L6 process-group/parent-death cleanup is incomplete');
  if (!/qualifyL6RuntimeCapability/.test(process) || !/assertL6RuntimeCapability/.test(process) || !/runL6ContainedOops/.test(process)) fail('authenticated OOPS is not bound to the L6 readiness gate');
  if (!/requiredHostClass === 'DEV_API'/.test(process) || !/RELAY_EPHEMERAL_DEV_SESSION/.test(process)) fail('authenticated OOPS host/auth classes are not L6-gated');
  const capability = read('src/core/oops/sandbox.ts');
  if (!/qualifyL6RuntimeCapability/.test(capability)) fail('legacy OOPS sandbox status does not expose the current L6 qualifier');
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
  const files = fs.readdirSync(path.join(root, 'bin')).filter((item) => item.endsWith('.mjs')).sort();
  if (files.length === 0) return;
  // One batched child performs the same syntax-only parse that per-file
  // `node --check` performed (ESM goal, never executed), without paying one
  // Node startup per file. Any parse error still fails the check with the
  // offending bin file identified.
  const batchedCheck = [
    "const { readFileSync } = require('node:fs');",
    'const vm = require("node:vm");',
    'let failures = 0;',
    'for (const file of process.argv.slice(1)) {',
    '  try { new vm.SourceTextModule(readFileSync(file, "utf8"), { identifier: file }); }',
    '  catch (error) { failures += 1; console.error(String(error && error.stack ? error.stack : error)); }',
    '}',
    'process.exit(failures === 0 ? 0 : 1);',
  ].join('\n');
  const result = spawnSync(process.execPath, ['--experimental-vm-modules', '-e', batchedCheck, ...files.map((file) => path.join(root, 'bin', file))], { cwd: root, encoding: 'utf8', timeout: 60_000, maxBuffer: 4 * 1024 * 1024, env: childEnvironment });
  if (result.status !== 0) fail(`node --check failed for bin/: ${(result.stderr ?? '').trim()}`);
}

function checkPhase23QualityGate() {
  const workflow = read('.github/workflows/hardening.yml');
  const packageJson = read('package.json');
  const runner = read('bin/quality-gate.mjs');
  const spec = read('bin/quality-gate-spec.mjs');
  const semantic = read('bin/semantic-compat.mjs');
  const clean = read('bin/quality-gate-clean.mjs');
  let gate;
  let compatibility;
  try {
    gate = JSON.parse(read('config/quality-gate.v1.json'));
    compatibility = JSON.parse(read('config/semantic-compatibility.v1.json'));
  } catch {
    fail('Phase 23 quality-gate definitions must be valid JSON');
    return;
  }
  if (gate.schemaVersion !== 'nightwatch.quality-gate.v1' || !Array.isArray(gate.groups)) fail('Phase 23 quality-gate schema/version is invalid');
  const requiredGroups = ['GATE_DEFINITION', 'STATIC', 'HARDENING', 'HANDOFF_TRUTH', 'PROJECT_TRUTH', 'AGENT_CONTINUITY', 'SEMANTIC_COMPATIBILITY', 'OWNER_PROVENANCE', 'SYNTHETIC_CAMPAIGN', 'PATCH_INTEGRITY', 'WORKSPACE_INTEGRITY'];
  for (const id of requiredGroups) {
    const group = gate.groups.find((candidate) => candidate.id === id);
    if (!group || group.required !== true) fail(`Phase 23 required quality-gate group missing or optional: ${id}`);
  }
  if (compatibility.schemaVersion !== 'nightwatch.semantic-compatibility.v1' || compatibility.requiredPhaseRange?.first !== 9 || compatibility.requiredPhaseRange?.last !== 26) {
    fail('Phase 26 semantic compatibility manifest must bind Phase 9 through Phase 26');
  }
  if (!Array.isArray(compatibility.phaseSuites) || !compatibility.phaseSuites.some((suite) => suite.phase === 23) || !compatibility.phaseSuites.some((suite) => suite.phase === 24) || !compatibility.phaseSuites.some((suite) => suite.phase === 25) || !compatibility.phaseSuites.some((suite) => suite.phase === 26)) fail('Phase 23/24/25/26 semantic compatibility suite is missing');
  if (!/"gate:ci"\s*:\s*"node bin\/quality-gate\.mjs ci"/.test(packageJson)) fail('package.json must expose the fixed gate:ci entry point');
  if (!/"handoff:check"\s*:\s*"node bin\/planner-handoff-check\.mjs"/.test(packageJson)) fail('package.json must expose the fixed handoff checker entry point');
  if (!/"test:semantic-compat"\s*:\s*"node bin\/semantic-compat\.mjs"/.test(packageJson)) fail('package.json must expose the fixed semantic compatibility entry point');
  if (!/modes\s*=\s*new Set\(\['local', 'ci', 'clean', 'predev'\]\)/.test(runner)) fail('quality-gate runner must use a fixed mode allowlist');
  if (!/commandKey === 'HANDOFF_CHECK'/.test(runner) || !/planner-handoff-check\.mjs/.test(runner)) fail('quality-gate runner must own exactly one fixed handoff checker command');
  if (/shell\s*:\s*true|stdio\s*:\s*['"]inherit['"]|(?<!\.)\bexec(?:File)?\s*\(/.test(runner)) fail('quality-gate runner exposes shell-capable or unbounded child execution');
  if (!/NIGHTWATCH_STORAGE_STATE/.test(runner) || !/GITHUB_TOKEN/.test(runner) || !/environment\.TZ\s*=\s*['"]UTC['"]/.test(runner)) fail('quality-gate runner does not sanitize credentials and host behavior');
  if (!/filePattern/.test(spec) || !/QUALITY_GATE_UNKNOWN_COMMAND/.test(spec) || !/QUALITY_GATE_DEPENDENCY_ORDER_INVALID/.test(spec)) fail('quality-gate spec validator lacks fixed command/dependency fail-closed checks');
  if (!/shell=false|shell=false|spawnSync/.test(semantic) || !/SEMANTIC_COMPATIBILITY_PHASE_OMITTED/.test(semantic)) fail('semantic compatibility runner lacks bounded argv/phase omission checks');
  if (!clean || !/\['ci',\s*'--ignore-scripts'\]/.test(clean) || !/status['\"],\s*['\"]--porcelain/.test(clean)) fail('clean-checkout runner must use npm ci --ignore-scripts and verify Git cleanliness');

  for (const [script, pattern] of [
    ['dev:phase23:manifest', /"dev:phase23:manifest"\s*:\s*"node bin\/phase23-dev\.mjs manifest"/],
    ['dev:phase23:dry-run', /"dev:phase23:dry-run"\s*:\s*"node bin\/phase23-dev\.mjs dry-run"/],
    ['dev:phase23:execute', /"dev:phase23:execute"\s*:\s*"node bin\/phase23-dev\.mjs execute"/],
    ['dev:phase23:predev', /"dev:phase23:predev"\s*:\s*"node bin\/phase23-predev\.mjs evaluate"/],
    ['ci:phase23:observe', /"ci:phase23:observe"\s*:\s*"node bin\/phase23-ci\.mjs observe"/],
  ]) if (!pattern.test(packageJson)) fail(`package.json must expose the fixed Phase 23 operator entry point: ${script}`);

  const phase23Operator = read('bin/phase23-dev.mjs');
  const phase23Manifest = read('src/core/phase23/manifest.ts');
  const phase23Observer = read('bin/phase23-ci.mjs');
  const phase23Predev = read('bin/phase23-predev.mjs');
  if (!/nightwatch\.dev-semantic-acceptance-manifest\.v2/.test(phase23Manifest) || !/DYNAMIC_TARGET_DISCOVERY_FORBIDDEN/.test(phase23Operator) || !/launcherInvocations:\s*1/.test(phase23Operator)) fail('Phase 23 DEV operator lacks the fresh v2 manifest, discovery block, or single-invocation bound');
  if (!/args\.env !== 'dev'/.test(phase23Operator) || !/phase22-real\.mjs/.test(phase23Operator) || !/maxBuffer:/.test(phase23Operator)) fail('Phase 23 DEV operator does not retain the guarded DEV-only Phase 22 execution path');
  if (!/requiredStepsUnavailable/.test(phase23Observer) || !/['"]run['"],\s*['"]view/.test(phase23Observer) || !/REQUIRED_JOB_STEPS_EMPTY/.test(read('src/core/qualityGate/externalCi.ts'))) fail('Phase 23 CI observer does not preserve the empty-step external-block rule');
  if (!/evaluatePreDevAuthority/.test(phase23Predev)) fail('Phase 23 pre-DEV receipt adapter is missing');

  const runCommands = workflow.split(/\r?\n/)
    .filter((line) => /^\s{8}run:\s*/.test(line))
    .map((line) => line.replace(/^\s{8}run:\s*/, '').trim());
  if (/upload-artifact|NIGHTWATCH_STORAGE_STATE|phase22-real|campaign:real|auth:capture/i.test(runCommands.join('\n'))) fail('GitHub workflow contains a private/authenticated execution path');
  if (!/permissions:\s*\n\s+contents:\s+read/.test(workflow)) fail('GitHub workflow permissions must remain contents: read');
  if (!/runs-on:\s*ubuntu-latest/.test(workflow)) fail('GitHub workflow must qualify on ubuntu-latest');
  if (!/node-version:\s*20/.test(workflow)) fail('GitHub workflow must use Node 20');
  const timeout = /timeout-minutes:\s*(\d+)/.exec(workflow);
  if (!timeout || Number(timeout[1]) < 15 || Number(timeout[1]) > 45) fail('GitHub workflow timeout must be a justified bounded 15–45 minute budget');
  if (runCommands.length !== 2 || runCommands[0] !== 'npm ci --ignore-scripts' || runCommands[1] !== 'npm run gate:ci') fail('GitHub workflow must contain only npm ci --ignore-scripts and the authoritative npm run gate:ci commands');
  if ((workflow.match(/^\s{8}run:\s*npm run gate:ci\s*$/gm) ?? []).length !== 1) fail('GitHub workflow must invoke gate:ci exactly once');
  if (/npx playwright test|playwright test|campaign:real|auth:capture|phase22-real|phase7-real|upload-artifact|secrets\./i.test(runCommands.join('\n'))) fail('GitHub workflow run commands contain forbidden direct tests, authenticated execution, or private artifact handling');
  for (const use of workflow.match(/^\s{8}uses:\s*.*$/gm) ?? []) {
    if (!/actions\/(?:checkout|setup-node)@v4/.test(use)) fail(`GitHub workflow uses an unapproved action: ${use.trim()}`);
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

  // Phase 8B.1-R1 — the real canonical adopted-case catalog may legitimately
  // hold 0..SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES entries (EMPTY, one-entry,
  // future two-entry/exhausted states are all supported). The enforced
  // invariants are: the generated file stays pure declarative data (no
  // imports/functions/executable code), the dedicated runtime integrity
  // check reuses the real validator/renderer (never a cardinality-locked
  // regex), and CI executes it. Runtime schema/byte-roundtrip validation
  // happens in bin/selfdev-catalog-integrity.mjs.
  const catalog = read('src/core/selfDev/adoptedCaseCatalog.generated.ts');
  if (!/^\/\/ GENERATED FILE/.test(catalog)) fail('the real canonical adopted-case catalog lost its generated-file header');
  const catalogCode = catalog.split('\n').filter((line) => !line.trim().startsWith('//'));
  if (/^\s*(?:import|require)\b|function\s+|=>|eval\s*\(|process\.|new\s+Function\s*\(/.test(catalogCode.join('\n'))) {
    fail('the real canonical adopted-case catalog contains executable code');
  }
  if (!/export const SELFDEV_ADOPTED_CASES = (?:\[\]|\[)/.test(catalog)) {
    fail('the real canonical adopted-case catalog does not declare the pure-data SELFDEV_ADOPTED_CASES array literal');
  }
  const integrityBin = read('bin/selfdev-catalog-integrity.mjs');
  if (!/validateAdoptedCatalog/.test(integrityBin) || !/renderAdoptedCatalogSource/.test(integrityBin)) {
    fail('bin/selfdev-catalog-integrity.mjs must reuse validateAdoptedCatalog/renderAdoptedCatalogSource');
  }
  const workflow = read('.github/workflows/hardening.yml');
  const gateDefinition = read('config/quality-gate.v1.json');
  if (!(/Phase 8B\.1 catalog integrity \/ checkout cleanliness/.test(workflow) && /selfdev-catalog-integrity\.mjs/.test(workflow)) && !(/npm run gate:ci/.test(workflow) && /PATCH_INTEGRITY/.test(gateDefinition))) {
    fail('the authoritative quality gate must retain catalog/checkout integrity through PATCH_INTEGRITY');
  }
}

function checkAgentContinuityIntegrity() {
  // The continuity checker and its protocol layer must remain read-only and
  // deterministic: no filesystem mutation, no child processes in the pure
  // module, no network.
  const mutationRe = /(?:fs|node:fs)[\s\S]{0,80}?\b(?:writeFile|writeFileSync|appendFile|appendFileSync|rename|renameSync|chmod|chmodSync|mkdir|mkdirSync|rm|rmSync|unlink|unlinkSync|createWriteStream)\b/;
  for (const file of ['bin/agent-state.mjs', 'bin/agent-continuity-protocol.mjs', 'bin/project-state-check.mjs']) {
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
  if (!(/Completed-task continuity audit/.test(workflow) && /npm run agent:audit/.test(workflow)) && !/npm run gate:ci/.test(workflow)) {
    fail('.github/workflows/hardening.yml must run the Completed-task continuity audit (npm run agent:audit)');
  }
  // Phase 8 closure — docs/design checkpoint allowlist: exactly the narrow
  // single-level Markdown pattern; never docs/design/** or non-Markdown.
  const agentState = read('bin/agent-state.mjs');
  if (!/docs\\\/design\\\/\[\^\/\]\+\\\.md\$/.test(agentState)) {
    fail('bin/agent-state.mjs must approve single-level docs/design/*.md checkpoint paths narrowly');
  }
  if (/\^docs\\\/design\\\/\.\*/.test(agentState)) {
    fail('bin/agent-state.mjs must not approve docs/design/** as a documentation checkpoint pattern');
  }
}

function checkProjectStateIntegrity() {
  // Phase 8B.1-R1.1 / campaign hardening — project-memory truth
  // (nightwatch.project-state.v2).
  // The project-state checker must stay a deterministic read-only tool: no
  // filesystem writes, no network, no model, no DB/infrastructure, and the
  // canonical catalog target stays code-defined (no user-supplied path).
  const checker = read('bin/project-state-check.mjs');
  for (const field of ['RELEASE_CERTIFICATION_PROTOCOL_VERSION', 'PROJECT_COMPLETION_STATUS', 'RELEASE_CHECKPOINT_SHA', 'LIVE_HEAD_SHA', 'LAST_SUBSTANTIVE_IMPLEMENTATION_SHA', 'LAST_LOCALLY_VALIDATED_SHA', 'LAST_CLEAN_VALIDATED_SHA', 'CI_OBSERVED_SHA', 'CI_EXECUTED_SHA', 'CI_STATUS', 'FINAL_DOCUMENTATION_SHA', 'FINAL_CI_AUTHORITY']) {
    if (!checker.includes(field)) fail(`project-state checker is missing release-truth field ${field}`);
  }
  if (!/PROJECT_STATE_COMPLETION_STATUS_MISMATCH/.test(checker) || !/PROJECT_STATE_CI_NON_EVIDENCE_MISMATCH/.test(checker) || !/PROJECT_STATE_CI_COMPLETE_WITHOUT_EXECUTION/.test(checker)) {
    fail('project-state checker does not enforce blocked/completion and CI execution semantics');
  }
  if (!/IMPLEMENTATION_COMPLETE_OPERATIONAL_ACCEPTANCE_PENDING/.test(checker)
    || !/OPERATIONALLY_ACCEPTED/.test(checker)
    || !/REAL_SYSTEM_EXECUTION_VERIFIED_EFFICACY_UNPROVEN/.test(checker)
    || !/OPERATIONAL_ACCEPTANCE_BLOCKED/.test(checker)
    || !/OPERATIONAL_ACCEPTANCE_FAILED/.test(checker)
    || !/PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED/.test(checker)
    || !/COMPLETION_BY_ACTIVE_STATUS/.test(checker)) {
    fail('project-state checker must keep historical local-clean complete distinct from operational-acceptance statuses');
  }
  if (/\b(?:fetch\(|https?\.request|net\.|dns\.|WebSocket|child_process\.[a-z]+exec|execSync|spawnSync\([^)]*['"]git['"]\s*,\s*\[[^\]]*(?:add|commit|push|checkout|reset|clean|stash|merge|rebase|cherry-pick|apply|am|tag|branch|config))/i.test(checker)) {
    fail('bin/project-state-check.mjs must stay a read-only local checker (no network, no Git mutation verbs)');
  }
  if (!/SELFDEV_ADOPTED_CATALOG_TARGET_PATH/.test(checker)) fail('bin/project-state-check.mjs must derive the catalog target from the code-defined constant');
  if (!/validateAdoptedCatalog/.test(checker) || !/renderAdoptedCatalogSource/.test(checker)) {
    fail('bin/project-state-check.mjs must reuse the real validator/renderer (never regex/source-parsing truth)');
  }
  if (!/selectNextSyntheticProposalVariant/.test(checker)) {
    fail('bin/project-state-check.mjs must derive the next portfolio member from the real selector');
  }
  if (!/agent-state\.mjs/.test(checker)) fail('bin/project-state-check.mjs must verify active-task continuity v2 through agent-state');
  if (!/nightwatch\.project-state\.v2/.test(checker)) fail('bin/project-state-check.mjs must define the project-state v2 protocol version');
  if (!/OWNED_PROJECT_STATE_FIELDS/.test(checker) || !/PROJECT_STATE_UNKNOWN_FIELD/.test(checker) || !/PROJECT_STATE_REQUIRED_FIELD_MISSING/.test(checker) || !/PROJECT_STATE_DUPLICATE_FIELD/.test(checker)) {
    fail('bin/project-state-check.mjs must enforce an explicit strict owned-key schema');
  }
  if (!/PROJECT_STATE_DUPLICATE_IMPLEMENTATION_AUTHORITY/.test(checker)) {
    fail('bin/project-state-check.mjs must reject competing generic live implementation anchors');
  }
  if (!/PROMOTION_AUTHORIZATION_LIFECYCLE/.test(checker) || !/EFFECTIVE_NEXT_PROMOTION_AUTHORITY/.test(checker) || !/PROJECT_STATE_PROMOTION_LIFECYCLE_INVALID/.test(checker) || !/PROJECT_STATE_EFFECTIVE_PROMOTION_AUTHORITY_INVALID/.test(checker)) {
    fail('bin/project-state-check.mjs must separate and validate promotion lifecycle/effective authority');
  }
  // Phase 8 final closure: the checker must now REQUIRE the terminal
  // PHASE_8_STATUS COMPLETE (the pre-closure IN_PROGRESS pin is gone), while
  // the effective-promotion-authority NONE requirement above stays — closing
  // the research phase never grants standing promotion authority.
  if (!/PROJECT_STATE_PHASE_8_STATUS_MISMATCH/.test(checker)) {
    fail('bin/project-state-check.mjs must enforce PHASE_8_STATUS exactly');
  }
  if (!/PHASE_8_STATUS'\) !== 'COMPLETE'/.test(checker)) {
    fail('bin/project-state-check.mjs must pin PHASE_8_STATUS to COMPLETE (Phase 8 closed)');
  }
  if (/writeFileSync|appendFileSync|createWriteStream|rmSync|unlinkSync|mkdirSync/.test(checker)) {
    fail('bin/project-state-check.mjs contains a filesystem write path');
  }
  const pkg = read('package.json');
  if (!/"project:check"\s*:\s*"node bin\/project-state-check\.mjs"/.test(pkg)) {
    fail('package.json project:check must invoke the local project-state checker');
  }
  const workflow = read('.github/workflows/hardening.yml');
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
  const renderer = read('src/core/selfDev/adoptedCases.ts');
  const catalog = read('src/core/selfDev/adoptedCaseCatalog.generated.ts');
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

function checkPlannerHandoffIntegrity() {
  // The handoff boundary owns only prompt route/currentness. Keep the parser
  // pure and the Git-aware checker local, read-only, bounded, and categorical.
  const protocol = read('bin/planner-handoff-protocol.mjs');
  const checker = read('bin/planner-handoff-check.mjs');
  const prompt = read('.agent/EXECUTION_PROMPT.md');
  if (!/nightwatch\.planner-executor-handoff\.v1/.test(protocol) || !/HANDOFF_REQUIRED_FIELDS/.test(protocol) || !/validateHandoffState/.test(protocol)) {
    fail('planner handoff protocol must define the versioned required-field/state contract');
  }
  if (!/nightwatch\.planner-executor-handoff\.v1/.test(prompt)) fail('.agent/EXECUTION_PROMPT.md must carry the versioned handoff header');
  if (!/HANDOFF_RECEIPT_SCHEMA/.test(checker) || !/HANDOFF_OPENSPEC_FILE_UNTRACKED/.test(checker) || !/HANDOFF_OPENSPEC_NONCANONICAL_FILE/.test(checker)) {
    fail('planner handoff checker must own bounded OpenSpec route integrity');
  }
  if (!/SAFE_RELATIVE_PATH_RE/.test(checker) || !/isSymbolicLink/.test(checker) || !/merge-base/.test(checker)) {
    fail('planner handoff checker must enforce safe paths, regular files, and Git ancestry');
  }
  if (!/shell\s*:\s*false/.test(checker) || !/timeout\s*:\s*10_000/.test(checker) || !/maxBuffer\s*:/.test(checker) || !/GIT_OPTIONAL_LOCKS/.test(checker)) {
    fail('planner handoff checker child processes must be fixed, shell-disabled, and bounded');
  }
  if (/writeFileSync|appendFileSync|createWriteStream|renameSync|unlinkSync|rmSync|mkdirSync/.test(checker)) {
    fail('planner handoff checker contains a filesystem write path');
  }
  if (/\b(?:fetch\s*\(|https?\.request|WebSocket\s*\(|net\.|dns\.)/i.test(checker)) {
    fail('planner handoff checker contains network capability');
  }
  if (/process\.env/.test(checker) || /shell\s*:\s*true/.test(checker) || /stdio\s*:\s*['"]inherit['"]/.test(checker)) {
    fail('planner handoff checker must not inherit ambient credentials or shell/output authority');
  }
  const packageJson = read('package.json');
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
function checkDocumentationTruth() {
  const currentState = read('docs/CURRENT_STATE.md');
  const roadmap = read('docs/ROADMAP.md');
  const activeTask = read('.agent/ACTIVE_TASK.md');
  const executionPrompt = read('.agent/EXECUTION_PROMPT.md');
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
 * Phase 9 semantic-core purity (SPEC §76-79): the projections, expectations,
 * invariants, and semantic oracle modules must be deterministic local
 * computation only — no AI, no selfDev/promotion, no DB/infra, no network
 * transport, no child process, no persistence, no campaign/authority
 * imports, no application-code execution.
 */
function checkPhase9SemanticCorePurity() {
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
    const source = read(file);
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
function checkPhase9IntegrationSeams() {
  const observer = read('src/browser/observers/networkObserver.ts');
  if (!/semanticOracle\?:/.test(observer) || !/evaluateSemanticHook/.test(observer) || !/semanticFindings\(\)/.test(observer)) {
    fail('network observer is missing the Phase 9 semantic hook or findings ledger');
  }
  if (!/checkUnexpectedStatus/.test(observer)) fail('network observer lost the protocol oracle wiring');
  const phase5Semantic = read('src/api/phase5/semantic.ts');
  if (!/evaluateApiResponseSemantic/.test(phase5Semantic) || !/evaluateApiResponse\(/.test(phase5Semantic)) {
    fail('Phase 5 semantic stage must compose the existing protocol oracle');
  }
  if (!/ORACLE_PASS/.test(phase5Semantic)) fail('Phase 5 semantic stage must gate on protocol ORACLE_PASS');
  const orchestrator = read('src/core/campaign/orchestrator.ts');
  if (!/toSemanticDossierEvidence/.test(orchestrator)) fail('campaign orchestrator must attach semantic dossier evidence');
  const dossier = read('src/core/triage/dossier.ts');
  if (!/semanticEvidence/.test(dossier) || !/validateSemanticDossierEvidence/.test(dossier)) {
    fail('dossier must carry strictly validated sanitized semantic evidence');
  }
}

/**
 * Phase 9A.1 real-source expectation core purity: the recipe/extractor/
 * admission/resolver/receipt cores must not execute application code, spawn
 * child processes, touch the filesystem/network, import AI/selfDev/Phase6,
 * or persist anything. The ONLY sibling-source access lives in
 * src/core/source/siblingSource.ts behind injected interfaces.
 */
function checkPhase9A1RealSourceCorePurity() {
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
    const source = read(file);
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
function checkPhase9A1SourceReaderBoundary() {
  const reader = read('src/core/source/siblingSource.ts');
  if (!/createSiblingSourceAccess/.test(reader) || !/resolveGitHead/.test(reader)) {
    fail('sibling source access module is missing its factory/HEAD resolver');
  }
  if (!/readFileSync|existsSync/.test(reader)) fail('sibling source reader must be fs read-only');
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
  if (!/isPathInside\(candidate,\s*resolvedRoot\)/.test(reader) || !/isPathInside\(file,\s*repoRoot\)/.test(reader)) fail('sibling source reader must confine paths to the configured root');
  if (!/hasNoSymlinkPath\(file\)/.test(reader) || !/O_NOFOLLOW/.test(reader) || !/lstatSync/.test(reader)) fail('sibling source reader must reject symlink paths before opening files');

  // Phase 25 keeps enumeration and scan coordination subordinate to the same
  // source authority. No sibling-source filesystem import may appear in a
  // coordinator, DTO, or analyzer module.
  for (const file of gitFiles().filter((item) => item.startsWith('src/core/source/') && item.endsWith('.ts') && item !== 'src/core/source/siblingSource.ts')) {
    const source = read(file);
    if (/from\s+['"]node:fs['"]|from\s+['"]node:child_process['"]|from\s+['"]node:(?:net|http|https|dns)['"]/.test(source)) fail(`${file} bypasses the confined sibling source authority`);
    if (/\b(?:writeFile|appendFile|renameSync|unlinkSync|rmSync|mkdirSync|chmodSync|spawn|exec(?:File)?|fetch)\s*\(/.test(source)) fail(`${file} exposes source write/process/network authority`);
  }
  const scan = read('src/core/source/scan.ts');
  const scanTypes = read('src/core/source/scanTypes.ts');
  if (!/enumerateFiles/.test(reader) || !/scanSource/.test(scan) || !/configDigest/.test(scanTypes)) fail('Phase 25 source inventory is not wired through the confined reader and versioned config');
  if (/readonly\s+(?:sourceText|rawSource|sourceCode)\s*[:?]/.test(scanTypes)) fail('Phase 25 persisted source DTOs contain raw source text fields');
}

/**
 * Phase 9A.1 integration seams: receipts + the evaluation ledger are wired
 * through the observer; the hook is total (never silent); the Phase 5
 * composed stage exposes receipt outcomes.
 */
function checkPhase9A1IntegrationSeams() {
  const observer = read('src/browser/observers/networkObserver.ts');
  if (!/semanticEvaluations\(\)/.test(observer) || !/semanticEvaluationLedgerOverflow\(\)/.test(observer)) {
    fail('network observer is missing the Phase 9A.1 evaluation ledger or its explicit overflow flag');
  }
  if (!/buildInternalErrorReceipt/.test(observer)) fail('network observer is missing the safe INTERNAL_ERROR receipt fallback');
  if (!/privacyViolation/.test(observer) || !/semantic-privacy-contract-violation/.test(observer)) {
    fail('network observer is missing the privacy-contract violation escalation');
  }
  const hook = read('src/oracles/semantic/hook.ts');
  if (!/evaluateSemanticResolution/.test(hook) || !/receipt: SemanticEvaluationReceipt \| null/.test(hook)) {
    fail('semantic hook must return a safe evaluation receipt');
  }
  if (!/NO_EXPECTATION/.test(hook)) fail('semantic hook lost the NO_EXPECTATION outcome');
  const phase5Semantic = read('src/api/phase5/semantic.ts');
  if (!/receipt: SemanticEvaluationReceipt \| null/.test(phase5Semantic)) {
    fail('Phase 5 semantic stage must expose the evaluation receipt');
  }
  const resolver = read('src/oracles/expectations/resolver.ts');
  if (!/RESOLVED/.test(resolver) || !/SOURCE_STALE/.test(resolver) || !/SOURCE_UNAVAILABLE/.test(resolver)) {
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
function checkPhase9bCorePurity() {
  const files = [
    'src/core/phase9b/freshness.ts',
    'src/core/phase9b/preflight.ts',
    'src/core/phase9b/summary.ts',
  ];
  for (const file of files) {
    const source = read(file);
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
function checkPhase9bIntegrationSeams() {
  const context = read('src/browser/context.ts');
  if (!/semanticOracle\?: SemanticResponseOracle/.test(context)) {
    fail('context is missing the optional Phase 9B semanticOracle option');
  }
  if (!/semanticOracle: opts\.semanticOracle/.test(context)) {
    fail('context does not pass the semantic oracle to the network observer');
  }
  const runner = read('tests/manual/phase9b-contained-dev-semantic.ts');
  if (!/NIGHTWATCH_PHASE_9B_REAL/.test(runner)) {
    fail('Phase 9B runner is missing the one-shot real-run gate');
  }
  if (!/const SELECTED_JOURNEY_ID = 'ripple-common-exchange-read'/.test(runner)) {
    fail('Phase 9B runner lost its fixed common-exchange journey');
  }
  if (/NIGHTWATCH_PHASE_2B_JOURNEY_ID/.test(runner)) {
    fail('Phase 9B runner must not accept journey selection');
  }
  if (!/NIGHTWATCH_UI_URL is not accepted/.test(runner)) {
    fail('Phase 9B runner must reject any UI URL override');
  }
  const launcher = read('bin/phase9b-launcher-args.mjs');
  if (!/no journey selector/.test(launcher) || !/--ui-url/.test(launcher)) {
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
function checkPhase10DeeperContractPurity() {
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
    const source = read(file);
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
function checkPhase10IntegrationSeams() {
  const registry = read('src/oracles/expectations/recipes/registry.ts');
  if (!/nightwatch\.real-source-expectation-recipe\.v2/.test(registry)) {
    fail('recipe registry is missing the v2 schema constant');
  }
  const extractor = read('src/oracles/expectations/extract/php.ts');
  if (!/PHP_ITEM_FIELD_TYPE_FLOW/.test(extractor) || !/extractPhpItemFieldTypeFlow/.test(extractor)) {
    fail('type-flow extractor is missing from the PHP extractor module');
  }
  if (!/EMPTY_CAST_OBJECT/.test(extractor) || !/EMPTY_ARRAY_OR_STRING_KEYS/.test(extractor)) {
    fail('type-flow extractor lost a fixed pattern');
  }
  const expectationTypes = read('src/oracles/expectations/types.ts');
  if (!/TYPE_IN_SET/.test(expectationTypes)) fail('TYPE_IN_SET is missing from the invariant vocabulary');
  const invariantEval = read('src/oracles/invariants/evaluate.ts');
  if (!/case 'TYPE_IN_SET'/.test(invariantEval)) fail('TYPE_IN_SET evaluation case is missing');
  const oracle = read('src/oracles/semantic/oracle.ts');
  if (!/case 'TYPE_IN_SET':\n\s+case 'TYPE_MATCH':/.test(oracle) && !/TYPE_IN_SET[\s\S]{0,200}TYPE_CONTRADICTED/.test(oracle)) {
    fail('semantic oracle lost the TYPE_IN_SET -> TYPE_CONTRADICTED class mapping');
  }
  const evidence = read('src/oracles/expectations/extract/evidence.ts');
  if (!/PHP_ITEM_FIELD_TYPE_FLOW/.test(evidence) || !/unsupported-extraction-kind/.test(evidence)) {
    fail('evidence digest must bind the type-flow extraction and fail closed on unknown kinds');
  }
  const admission = read('src/oracles/expectations/admission.ts');
  if (!/TYPE_FLOW_AMBIGUOUS/.test(admission) || !/TYPE_FLOW_CONTRACT_MISMATCH/.test(admission)) {
    fail('admission lost the type-flow fail-closed vocabulary');
  }
  const resolver = read('src/oracles/expectations/resolver.ts');
  if (!/PHP_ITEM_FIELD_TYPE_FLOW/.test(resolver)) fail('resolver must re-extract the type-flow evidence');
  const corpus = read('corpus/phase10/source-fixture/phase10Fixtures.ts');
  if (!/real-source-expectation-recipe\.v2/.test(corpus)) fail('Phase 10 fixture corpus is missing v2 fixture recipes');
  const historical = read('corpus/phase10/historical/archivedV1Recipes.ts');
  if (!/real-source-shape/.test(historical)) fail('archived v1 recipes are missing the historical shape identities');
}

/**
 * Phase 10B deep-acceptance core purity: the deep-acceptance mechanics module
 * is PURE — no network, no fs, no child processes, no persistence, no eval,
 * no AI/selfDev/Phase6/infra/campaign/authority imports. It reuses the pure
 * Phase 9B summary mechanics and only adds deterministic acceptance logic.
 */
function checkPhase10bCorePurity() {
  const files = ['src/core/phase10b/deepAcceptance.ts'];
  for (const file of files) {
    const source = read(file);
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
function checkPhase12PureCoreBoundaries() {
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
    const source = read(file);
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
function checkPhase18PureCoreSeams() {
  const files = [
    'src/core/triage/semanticReplay.ts',
    'src/core/portfolio/semanticCoverage.ts',
    'src/oracles/expectations/currentness.ts',
  ];
  for (const file of files) {
    const source = read(file);
    if (!source) continue;
    if (/from\s+['"][^'"]*(?:node:fs|node:http|node:https|node:net|node:dns|node:fetch|undici|WebSocket|child_process|playwright|browser|database|dynamo|bigquery|spanner|gcloud|kubectl|aws|cloud|infrastructure|aiReview|selfDev|selfDevPromotion|selfDevSandbox|phase6|storage|campaign\/orchestrator|products?)[^'"]*['"]/i.test(source)) {
      fail(`${file} imports a forbidden Phase 18 authority or transport`);
    }
    if (/\b(?:child_process|fetch\s*\(|spawn\s*\(|exec(?:File)?\s*\(|writeFile|appendFile|createWriteStream|mkdirSync|rmSync|unlinkSync|renameSync|eval\s*\(|new\s+Function\s*\()\b/i.test(source)) {
      fail(`${file} exposes a Phase 18 process, network, persistence, or code-execution capability`);
    }
  }
  const replay = read('src/core/triage/semanticReplay.ts');
  if (replay && (!/SEMANTIC_REPLAY_FIDELITY_VERSION/.test(replay) || !/AMBIGUOUS_OCCURRENCE/.test(replay) || !/validateSemanticReplayFidelityReceipt/.test(replay))) {
    fail('Phase 18 replay core is missing versioned ambiguity/fidelity validation');
  }
  const coverage = read('src/core/portfolio/semanticCoverage.ts');
  if (coverage && (!/SEMANTIC_COVERAGE_VERSION/.test(coverage) || !/SOURCE_EVIDENCE_UNRESOLVED/.test(coverage) || !/deterministicDigest/.test(coverage))) {
    fail('Phase 18 coverage core is missing bounded currentness/explanation accounting');
  }
  const currentness = read('src/oracles/expectations/currentness.ts');
  if (currentness && (!/SourceCurrentnessState/.test(currentness) || !/SYNTHETIC_ONLY/.test(currentness) || !/STALE/.test(currentness))) {
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
function checkPhase12AuthoritySetsUnchanged() {
  const approved = read('src/oracles/expectations/recipes/registry.ts');
  const catalog = read('src/api/phase5/catalog.ts');
  const ownerScope = read('src/core/policy/ownerScope.ts');
  const selfDevCatalog = read('src/core/selfDev/adoptedCaseCatalog.generated.ts');
  // Approved read-only target IDs — 6 entries, byte-stable order.
  const approvedIds = ['ripple.payer-exchange.read', 'ripple.common-exchange.read', 'ripple.account-inventory.read', 'ripple.billing-groups.read', 'ripple.billing-groups-legacy.read', 'ripple.billing-group-exchange.read'];
  for (const id of approvedIds) {
    if (!approved.includes(`'${id}'`)) fail(`Phase 12 approved read-only target missing: ${id}`);
  }
  if ((approved.match(/'ripple\.[^']+\.read'/g) ?? []).length !== approvedIds.length) {
    // Count only the APPROVED_READ_ONLY_TARGET_IDS block (first occurrences).
    const block = approved.slice(approved.indexOf('APPROVED_READ_ONLY_TARGET_IDS'), approved.indexOf('DEV_REACHABLE_RECIPE_TARGET_IDS'));
    const count = (block.match(/'ripple\.[^']+\.read'/g) ?? []).length;
    if (count !== approvedIds.length) fail(`Phase 12 approved read-only target count drift: expected ${approvedIds.length}, found ${count}`);
  }
  const devReachable = ['ripple.payer-exchange.read', 'ripple.common-exchange.read', 'ripple.account-inventory.read'];
  for (const id of devReachable) {
    if (!approved.includes(`'${id}'`)) fail(`Phase 12 DEV-reachable target missing: ${id}`);
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
  for (const op of readOps) if (!catalog.includes(`operationId: '${op}'`)) fail(`Phase 12 Phase-5 operation missing: ${op}`);
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
function checkPhase10bIntegrationSeams() {
  const runner = read('tests/manual/phase10b-contained-dev-deep-semantic.ts');
  if (!/NIGHTWATCH_PHASE_10B_REAL/.test(runner)) {
    fail('Phase 10B runner is missing the one-shot real-run gate');
  }
  if (!/const SELECTED_JOURNEY_ID = 'ripple-common-exchange-read'/.test(runner)) {
    fail('Phase 10B runner lost its fixed common-exchange journey');
  }
  if (!/const SELECTED_TARGET_ID = 'ripple\.common-exchange\.read'/.test(runner)) {
    fail('Phase 10B runner lost its fixed target');
  }
  if (!/const SELECTED_EXPECTATION_ID = 'ripple\.common-exchange\.read\.real-source-deep'/.test(runner)) {
    fail('Phase 10B runner lost its fixed deep expectation identity');
  }
  if (/NIGHTWATCH_PHASE_2B_JOURNEY_ID/.test(runner)) {
    fail('Phase 10B runner must not accept journey selection');
  }
  if (!/NIGHTWATCH_UI_URL is not accepted/.test(runner)) {
    fail('Phase 10B runner must reject any UI URL override');
  }
  const launcher = read('bin/phase10b-launcher-args.mjs');
  if (!/no journey selector/.test(launcher) || !/no expectation selector/.test(launcher) || !/no target selector/.test(launcher) || !/--ui-url/.test(launcher)) {
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
function checkPhase12TriageCorePurity() {
  const files = [
    'src/core/triage/semanticTriageEvidence.ts',
    'src/core/triage/semanticConfidence.ts',
    'src/core/triage/dossierV2.ts',
    'src/oracles/expectations/coverageInventory.ts',
    'src/oracles/semantic/cluster.ts',
  ];
  for (const file of files) {
    if (!fs.existsSync(path.join(root, file))) continue;
    const source = read(file);
    if (/import\s+[^;]*from\s+['"][^'"]*(?:node:fs|node:http|node:https|node:net|node:dns|node:fetch|undici|WebSocket|child_process|aiReview|selfDev|selfDevPromotion|selfDevSandbox|phase6|database|infrastructure|dynamo|bigquery|spanner|kubectl|gcloud|playwright|runRecorder|storage)[^'"]*['"]/i.test(source)) {
      fail(`${file} imports a forbidden fs/network/process/AI/selfDev/Phase6/persistence/authority module`);
    }
    if (/\b(?:eval\s*\(|new\s+Function\s*\(|child_process|spawn\s*\(|(?<!\.)exec(?:File)?\s*\(|writeFile|appendFile|createWriteStream|mkdirSync|rmSync|unlinkSync|renameSync|fetch\s*\(|node:fs)\b/i.test(source)) {
      fail(`${file} exposes a code-execution, process, network, or persistence capability`);
    }
  }
}

function checkPhase12TriageIntegrationSeams() {
  const evidence = read('src/core/triage/semanticTriageEvidence.ts');
  if (!/nightwatch\.semantic-triage-evidence\.v1/.test(evidence)) fail('semantic triage evidence missing version');
  if (!/MISSING_EVIDENCE_VOCABULARY/.test(evidence)) fail('semantic triage evidence missing vocabulary');
  const confidence = read('src/core/triage/semanticConfidence.ts');
  if (!/rankSemanticConfidence/.test(confidence)) fail('semantic confidence missing rank function');
  if (!/SAFETY_NONZERO/.test(confidence) || !/PRIVACY_FAILURE/.test(confidence) || !/KNOWN_FALSE_POSITIVE/.test(confidence)) fail('semantic confidence missing mandatory blockers');
  const v2 = read('src/core/triage/dossierV2.ts');
  if (!/nightwatch\.bug-dossier\.private\.v2/.test(v2)) fail('dossier v2 missing version');
  if (!/isReadySemanticDossier/.test(v2)) fail('dossier v2 missing READY predicate');
  if (!/humanReproductionRecipe/.test(v2)) fail('dossier v2 missing human recipe');
  // v1 must remain readable: dossier.ts still exports createBugDossier/validateBugDossier
  const dossier = read('src/core/triage/dossier.ts');
  if (!/DOSSIER_VERSION/.test(dossier) || !/validateBugDossier/.test(dossier)) fail('dossier v1 compatibility lost');
  const coverage = read('src/oracles/expectations/coverageInventory.ts');
  if (!/buildCoverageInventory/.test(coverage)) fail('coverage inventory missing builder');
  if (!/APPROVED_AND_ADMITTED_COLLECTION/.test(coverage) || !/APPROVED_NOT_ADMITTED_AMBIGUOUS/.test(coverage) || !/APPROVED_NOT_OBSERVABLE/.test(coverage)) fail('coverage inventory missing disposition vocabulary');
  if (!/TYPE_FLOW_AMBIGUOUS/.test(coverage)) fail('coverage inventory missing depth-uplift blocker');
  if (!/snapshotMatchesRemote/.test(coverage)) fail('coverage inventory missing remote/snapshot match flag');
  const cluster = read('src/oracles/semantic/cluster.ts');
  if (fs.existsSync(path.join(root, 'src/oracles/semantic/cluster.ts'))) {
    if (!/semanticCluster/.test(cluster)) fail('semantic cluster missing identity');
  }
}

/** Phase 22 contained-DEV core purity and launcher seams. The DTO/oracle
 * layer is deterministic and authority-free; the launcher is the only place
 * permitted to perform source snapshot/process work. */
function checkPhase22CorePurity() {
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
    const source = read(file);
    if (/from\s+['"][^'"]*(?:node:fs|node:child_process|node:net|node:http|node:https|node:dns|undici|playwright|browser|runRecorder|storageState|database|dynamo|bigquery|spanner|kubernetes|gcloud|aws|selfDev|persistence)[^'"]*['"]/i.test(source)) fail(`${file} imports an authority or external capability`);
    if (/\b(?:process\.env|fetch\s*\(|WebSocket\s*\(|child_process|spawn\s*\(|exec(?:File)?\s*\(|writeFile|appendFile|createWriteStream|mkdirSync|rmSync|unlinkSync|renameSync|Date\.now\s*\(|Math\.random\s*\(|eval\s*\(|new\s+Function\s*\()\b/i.test(source)) fail(`${file} exposes runtime, process, network, clock, randomness, or persistence authority`);
  }
  const firewall = read('src/oracles/semantic/phase22Firewall.ts');
  if (!/guardPhase22SafeObservation/.test(firewall) || !/createPhase22PrivacyReceipt/.test(firewall) || /rawText|rawBody|responseBody/.test(firewall)) fail('Phase 22 runtime privacy firewall is missing or accepts raw payload fields');
}

function checkPhase22IntegrationSeams() {
  const types = read('src/core/phase22/types.ts');
  if (!/nightwatch\.dev-semantic-acceptance-manifest\.v1/.test(types) || !/maxTargets: 6/.test(types) || !/maxObservationContexts: 12/.test(types)) fail('Phase 22 manifest bounds/version are missing');
  if (!/PHASE22_REQUIRED_PREFLIGHT_CHECKS/.test(types) || !/l0_cdp_guard_active/.test(types) || !/l5_loopback_proxy_active/.test(types)) fail('Phase 22 preflight V2 check vocabulary is incomplete');
  const manifest = read('src/core/phase22/manifest.ts');
  if (!/selectEligible/.test(manifest) || !/TARGET_BOUND_OR_MATERIAL_DIVERSITY/.test(manifest) || !/frozen: true/.test(manifest)) fail('Phase 22 manifest is not deterministic/frozen/bounded');
  const replay = read('src/core/phase22/replay.ts');
  if (!/replayObservationCount > budget\.firstObservationCount/.test(replay) || !/retryCount !== 0/.test(replay) || !/REAL_MINIMIZATION_NOT_AUTHORIZED/.test(replay)) fail('Phase 22 replay/minimization bounds are incomplete');
  const confidence = read('src/core/phase22/calibration.ts');
  if (!/REAL_SOURCE_NOT_CURRENT/.test(confidence) || !/REAL_EXPECTATION_NOT_RESOLVED/.test(confidence) || !/realGatePassed/.test(confidence)) fail('Phase 22 real confidence gate is incomplete');
  const network = read('src/browser/observers/networkObserver.ts');
  if (!/guardPhase22SemanticHookResult/.test(network) || !/phase22PrivacyReceiptLedger/.test(network) || !/phase22PrivacyReceipts/.test(network)) fail('Phase 22 privacy firewall is not attached to the network observer');
  const launcher = read('bin/phase22-real.mjs');
  if (/\.\.\.process\.env/.test(launcher) || /stdio:\s*['"]inherit['"]/.test(launcher) || !/NIGHTWATCH_PHASE_22_REAL/.test(launcher) || !/args\.env !== 'dev'/.test(launcher) || !/EXACT_GREEN_CI_RUN_ID_REQUIRED/.test(launcher)) fail('Phase 22 launcher boundary is incomplete');
  if (!/maxBuffer\s*:/.test(launcher) || !/timeout\s*:/.test(launcher) || !/--config=playwright\.phase22\.config\.ts/.test(launcher)) fail('Phase 22 launcher lacks bounded child execution');
  const cli = read('bin/phase22-dev.mjs');
  if (!/DYNAMIC_ALL_FORBIDDEN/.test(cli) || !/simulatePhase22DevAcceptance/.test(cli) || !/EXPLICIT_EXECUTE_REQUIRED/.test(cli)) fail('Phase 22 local operator surface is missing dry-run/explicit-execute guards');
  const packageJson = read('package.json');
  for (const script of ['dev-preflight', 'dev-manifest', 'dev-acceptance', 'dev-results', 'dev-explain']) if (!packageJson.includes(`"${script}"`)) fail(`Phase 22 operator script missing: ${script}`);
}

function checkC00WorkspaceIntegrity() {
  // C-00 concurrency and workspace hardening. The inspection core stays
  // read-only and importable by the continuity checker; every mutation lives
  // in the session CLI; the session CLI never rewrites shared history.
  const core = read('bin/workspace-integrity.mjs');
  const mutationRe = /(?:fs|node:fs)[\s\S]{0,80}?\b(?:writeFile|writeFileSync|appendFile|appendFileSync|rename|renameSync|chmod|chmodSync|mkdir|mkdirSync|rm|rmSync|unlink|unlinkSync|createWriteStream)\b/;
  if (mutationRe.test(core)) fail('bin/workspace-integrity.mjs must stay read-only (no filesystem mutation)');
  if (/from 'node:(?:net|http|https|dns|tls)'/.test(core) || /\bfetch\s*\(/.test(core)) fail('bin/workspace-integrity.mjs must not open a network surface');
  if (/shell\s*:\s*true|stdio\s*:\s*['"]inherit['"]|(?<!\.)\bexec(?:File)?\s*\(/.test(core)) fail('bin/workspace-integrity.mjs exposes shell-capable or unbounded child execution');
  if (!/timeout:/.test(core) || !/maxBuffer:/.test(core)) fail('bin/workspace-integrity.mjs lacks bounded child execution');
  for (const invariant of ['WORKSPACE_FORBIDDEN_INDEX_FLAG', 'WORKSPACE_EXCLUDE_DRIFT', 'WORKSPACE_UNEXPECTED_HOOK', 'WORKSPACE_UNOWNED_SESSION_WORKTREE', 'WORKSPACE_UNDECLARED_TRACKED_DELETION', 'WORKSPACE_CANONICAL_DIRTY_WHILE_SESSION_LIVE']) {
    if (!core.includes(invariant)) fail(`C-00 hygiene invariant missing from the inspection core: ${invariant}`);
  }
  if (!/skipWorktreeTags/.test(core) || !/ASSUME_UNCHANGED/.test(core)) fail('C-00 index-flag invariant must reject skip-worktree and assume-unchanged explicitly');
  const session = read('bin/nightwatch-session.mjs');
  if (/--force|--force-with-lease|push\s+--force|'rebase'|'--hard'|clean',\s*'-fd|'stash'/.test(session)) fail('bin/nightwatch-session.mjs must never force-push, rebase, hard-reset, clean, or stash');
  if (!/HEAD:refs\/heads\//.test(session)) fail('bin/nightwatch-session.mjs must integrate by pushing the session branch, never by checking out the canonical branch');
  if (!/SESSION_ALREADY_OWNED/.test(session) || !/SESSION_OWNER_STALE/.test(session) || !/flag: 'wx'/.test(session)) fail('bin/nightwatch-session.mjs must claim ownership with an exclusive create and distinguish live from stale owners');
  if (!/SESSION_REMOVE_REFUSED_LIVE_HOLDER/.test(session) || !/SESSION_REMOVE_REFUSED_UNMERGED/.test(session)) fail("bin/nightwatch-session.mjs must refuse to delete another session's live or unmerged work");
  if (!/SESSION_RECONCILE_CONFLICT/.test(session) || !/merge', '--abort/.test(session)) fail('bin/nightwatch-session.mjs must abort rather than silently resolve a reconcile conflict');
  const checker = read('bin/agent-state.mjs');
  if (!/from '\.\/workspace-integrity\.mjs'/.test(checker)) fail('bin/agent-state.mjs must consume the C-00 workspace inspection core');
  let policy;
  try {
    policy = JSON.parse(read('config/workspace-integrity.v1.json'));
  } catch {
    fail('config/workspace-integrity.v1.json must be valid JSON');
    return;
  }
  if (policy.schemaVersion !== 'nightwatch.workspace-integrity.v1') fail('C-00 workspace policy schema/version is invalid');
  if (!Array.isArray(policy.excludePolicy?.allowedEffectivePatterns) || policy.excludePolicy.allowedEffectivePatterns.length !== 0) fail('C-00 shared exclude policy must allow zero effective patterns');
  if (policy.hookPolicy?.allowedSuffix !== '.sample' || policy.hookPolicy?.requireUnsetHooksPath !== true) fail('C-00 hook policy must permit only samples and require core.hooksPath to be unset');
  if (policy.canonical?.mayHostImplementationSession !== false || policy.canonical?.requireCleanWhenSessionLive !== true) fail('C-00 canonical protection policy is weakened');
  const packageJson = read('package.json');
  for (const script of ['workspace:check', 'workspace:status', 'session:status', 'session:check']) {
    if (!packageJson.includes(`"${script}"`)) fail(`C-00 operator script missing: ${script}`);
  }
  if (!/"workspace:check"\s*:\s*"node bin\/workspace-integrity\.mjs check"/.test(packageJson)) fail('package.json must expose the fixed C-00 workspace checker entry point');
  if (!packageJson.includes('tests/unit/workspaceIsolation.test.ts')) fail('the C-00 adversarial matrix must run inside the required synthetic campaign');
  const agents = read('AGENTS.md');
  if (!/ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY/.test(agents)) fail('AGENTS.md must state the C-00 session/worktree invariant');
}

checkChildProcessBoundaries();
checkL6ProcessNetworkBoundary();
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
checkPlannerHandoffIntegrity();
checkDocumentationTruth();
checkProjectStateIntegrity();
checkPhase9SemanticCorePurity();
checkPhase9IntegrationSeams();
checkPhase9A1RealSourceCorePurity();
checkPhase9A1SourceReaderBoundary();
checkPhase9A1IntegrationSeams();
checkPhase9bCorePurity();
checkPhase9bIntegrationSeams();
checkPhase10DeeperContractPurity();
checkPhase10IntegrationSeams();
checkPhase10bCorePurity();
checkPhase10bIntegrationSeams();
checkPhase12PureCoreBoundaries();
checkPhase18PureCoreSeams();
checkPhase12AuthoritySetsUnchanged();
checkPhase12TriageCorePurity();
checkPhase12TriageIntegrationSeams();
checkPhase22CorePurity();
checkPhase22IntegrationSeams();
checkPhase23QualityGate();
checkC00WorkspaceIntegrity();
checkSyntax();

if (errors.length > 0) {
  for (const error of errors) console.error(`[hardening:check] ERROR: ${error}`);
  console.error(`[hardening:check] FAIL (${errors.length} error${errors.length === 1 ? '' : 's'})`);
  process.exitCode = 1;
} else {
  console.log('[hardening:check] PASS: offline structural invariants hold');
}
