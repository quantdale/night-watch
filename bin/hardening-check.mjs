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
import { validateCampaignCertification } from './lib/campaign-certification.mjs';
import {
  findBinsWithoutExecutingTest,
  verifyCliImplementationContract,
} from './lib/cli-implementation-contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROBE_REGISTRY_PATH = 'config/hardening-rule-probes.v1.json';
const errors = [];
const childEnvironment = buildChildEnvironment(process.env);

/** @param {string} message */
function fail(message) {
  errors.push(message);
}

/** Strip line and block comments so a structural check reads CODE, not prose. */
/** @param {string} source */
function withoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/**
 * Read RAW text INCLUDING comments.
 *
 * This is the explicit opt-in raw accessor. It exists for three cases only:
 *   1. negative (`fail-if-present`) rules, where a forbidden token in a
 *      comment is still a forbidden reference;
 *   2. data files (JSON, Markdown, workflow YAML) where comment syntax is
 *      not comment syntax at all;
 *   3. rules genuinely about comment text.
 *
 * A positive (`fail-if-absent`) assertion MUST NOT use this accessor: a
 * comment containing the required literal would satisfy it. The rule-engine
 * self-check (`checkRuleEngineSoundness`) fails such a use.
 * @param {string} file
 */
function readIncludingComments(file) {
  try {
    return fs.readFileSync(path.join(root, file), 'utf8');
  } catch (error) {
    fail(`cannot read ${file}: ${error instanceof Error ? error.message : String(error)}`);
    return '';
  }
}

/**
 * Read CODE ONLY. This is the default structural accessor: comments are
 * stripped, so a positive assertion cannot be satisfied by prose. Raw text is
 * available only through the explicitly named `readIncludingComments`.
 * @param {string} file
 */
function read(file) {
  return withoutComments(readIncludingComments(file));
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
    'bin/nightwatch-agent.mjs',
    'bin/quality-gate.mjs',
    'bin/quality-gate-clean.mjs',
    'bin/planner-handoff-check.mjs',
    'bin/semantic-compat.mjs',
    'bin/phase23-ci.mjs',
    'bin/phase23-dev.mjs',
  ];
  for (const file of launchers) {
    const source = readIncludingComments(file);
    if (/\.\.\.process\.env/.test(source)) fail(`${file} spreads the parent process environment`);
    if (/shell\s*:\s*true/.test(source)) fail(`${file} enables shell execution`);
    if (!/timeout\s*:/.test(source)) fail(`${file} has no bounded child-process timeout`);
    if (/stdio\s*:\s*['"]inherit['"]/.test(source)) fail(`${file} exposes unbounded child output`);
    if (!/maxBuffer\s*:/.test(source)) fail(`${file} has no bounded child output buffer`);
  }
  const productionSources = gitFiles()
    .filter((file) => (file.startsWith('src/') || file.startsWith('bin/')) && /\.(?:ts|mjs)$/.test(file))
    .filter((file) => file !== 'bin/hardening-check.mjs')
    .map((file) => [file, readIncludingComments(file)]);
  for (const [file, source] of productionSources) {
    if (/import\s*\{[^}]*\bexec(?:File)?\b[^}]*\}\s*from\s*['"]node:child_process['"]/.test(source)) fail(`${file} imports shell-capable child_process exec`);
    if (/child_process\.exec(?:File)?\s*\(/.test(source)) fail(`${file} calls child_process.exec/execFile through a dynamic namespace`);
  }
}

function checkL6ProcessNetworkBoundary() {
  const l6 = readIncludingComments('src/core/oops/l6.ts');
  const process = readIncludingComments('src/core/oops/process.ts');
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
  const capability = readIncludingComments('src/core/oops/sandbox.ts');
  if (!/qualifyL6RuntimeCapability/.test(capability)) fail('legacy OOPS sandbox status does not expose the current L6 qualifier');
}

function checkTargetPolicy() {
  for (const file of ['bin/phase7-real.mjs', 'bin/phase5-real.mjs', 'bin/phase4-real.mjs', 'bin/phase2b-real.mjs', 'bin/phase2c-real.mjs', 'bin/observe-authenticated.mjs']) {
    if (!/env\s*!==\s*['"]dev['"]/.test(read(file))) fail(`${file} does not enforce DEV-only automated credential execution`);
  }
  const capture = readIncludingComments('bin/auth-capture.mjs');
  if (!/new Set\(\['dev', 'next'\]\)/.test(capture) || !/human-led|human login/i.test(capture)) fail('auth:capture NEXT exception is not visibly human-led and explicit');
  for (const file of gitFiles().filter((item) => item.startsWith('bin/') && item !== 'bin/hardening-check.mjs')) {
    if (/MULTI_HOUR_CAMPAIGN_BUDGET/.test(readIncludingComments(file))) fail(`${file} references the unauthorized multi-hour budget profile`);
  }
}

function checkTypecheckCoverage() {
  let config;
  try {
    config = JSON.parse(readIncludingComments('tsconfig.json'));
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
  const ignore = readIncludingComments('.gitignore');
  for (const required of ['artifacts/*', '.nightwatch/', 'storageState*.json', '*credentials*.json']) {
    if (!ignore.includes(required)) fail(`.gitignore is missing private-runtime rule: ${required}`);
  }
  const adapters = readIncludingComments('src/data/phase6/adapters.ts');
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
  const aiSources = aiFiles.map((file) => [file, readIncludingComments(file)]);
  const packageJson = readIncludingComments('package.json');
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
  const loopback = readIncludingComments('src/core/aiReview/loopbackProvider.ts');
  if (!/validateLoopbackEndpoint/.test(loopback) || !/LOOPBACK_HOSTS/.test(loopback) || !/agent:\s*false/.test(loopback) || !/statusCode !== 200/.test(loopback)) fail('loopback provider containment is incomplete');
  if (!/context\.signal\.aborted/.test(loopback) || !/signal\.addEventListener\(['"]abort['"]/.test(loopback) || !/destroyRequest/.test(loopback)) fail('loopback provider does not actively consume the session AbortSignal');
  const synthetic = readIncludingComments('src/core/aiReview/syntheticProvider.ts');
  if (!/pendingCount/.test(synthetic) || !/signal\.addEventListener\(['"]abort['"]/.test(synthetic)) fail('synthetic PENDING provider does not clean up on AbortSignal');
  const pipeline = readIncludingComments('src/core/aiReview/pipeline.ts');
  if (!/assertOwnerPolicyAllows\('AI_REVIEW_LOCAL'\)/.test(pipeline) || !/assertOwnerPolicyAllows\('AI_ORACLE_SUGGESTION_LOCAL'\)/.test(pipeline) || !/AI_PROVIDER_NOT_LOCAL/.test(pipeline)) fail('AI pipeline is missing explicit owner/local provider gates');
  if (!/performance\.now\(\)/.test(pipeline) || /options\.clock\s*\?\?\s*\(\)\s*=>\s*Date\.now\(\)/.test(pipeline)) fail('AI runtime budget must use a monotonic default clock');
  if (!/signal:\s*AbortSignal/.test(pipeline) || !/timeoutMs:\s*number/.test(pipeline) || !/controller\.abort\(\)/.test(pipeline) || !/remainingRuntimeMs/.test(pipeline)) fail('AI provider boundary is missing monotonic deadline cancellation context');
  const storage = readIncludingComments('src/core/aiReview/storage.ts');
  if (!/PrivateArtifactStore/.test(storage) || !/writeImmutableJson/.test(storage)) fail('AI artifacts are not routed through immutable private storage');
  if (/writeIncomplete\s*\(|\.writeJson\s*\(/.test(storage)) fail('AI immutable artifacts retain a replacement-capable write path');
  if (/aiReview|AI_REVIEW/i.test(readIncludingComments('bin/phase7-real.mjs'))) fail('Phase 7 real launcher must not invoke AI review');
  for (const file of gitFiles().filter((item) => item.startsWith('src/core/campaign/') || item.startsWith('src/oracles/'))) {
    if (/aiReview|AI_REVIEW/i.test(readIncludingComments(file))) fail(`${file} imports or references AI review authority`);
  }
  if (!/SYNTHETIC_LOCAL.*LOOPBACK_LOCAL/.test(read('src/core/aiReview/types.ts').replace(/\s+/g, ' '))) fail('AI provider class allowlist is not local-only');
}

function checkLocalCanaryBoundary() {
  const controller = readIncludingComments('src/core/aiReview/localCanary.ts');
  const cli = readIncludingComments('bin/ai-local-canary.mjs');
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

/**
 * The self-dev trust root must be CLOSED over its own relative imports.
 *
 * `SELFDEV_AUTHORITATIVE_PATHS` is both the provenance digest input and the
 * exact file set copied into every sandbox fixture mirror, so a listed module
 * that imports an unlisted one produces a mirror that cannot resolve it:
 * "Cannot find module". The existing rule checks only that the sandbox mirror
 * REFERENCES the list.
 *
 * This has now happened twice. DEF-12 recorded it when imports were added to
 * `ownerScope.ts` / `privateArtifacts.ts`; NW-02 and NW-13 repeated it
 * exactly, and in both cases the failure surfaced only when the broad suite
 * ran the sandbox fixtures. The rule below removes the possibility rather
 * than the symptom: every relative import of every listed TypeScript file
 * must itself be listed.
 */
function checkSelfDevTrustRootClosure() {
  const manifest = 'src/core/selfDev/provenanceManifest.ts';
  // Comments must go FIRST. The list carries prose inside the array literal,
  // and an apostrophe in it ("the authoritative set's imports") shifts the
  // quote pairing so a naive scan extracts the text BETWEEN entries instead of
  // the entries — yielding zero TypeScript paths and a rule that passes
  // vacuously. That is exactly how the first version of this rule proved
  // nothing.
  const source = read(manifest);
  const block = /SELFDEV_AUTHORITATIVE_PATHS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\s*as const\)/.exec(source);
  if (block === null) {
    fail(`${manifest} does not declare SELFDEV_AUTHORITATIVE_PATHS as a frozen literal list`);
    return;
  }
  const declared = [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  if (declared.length === 0) {
    fail(`${manifest} declares an empty authoritative path set`);
    return;
  }
  const listed = new Set(declared);
  const typescript = declared.filter((relative) => relative.endsWith('.ts'));
  // A rule that iterates an empty set always passes. The self-dev trust root
  // is majority TypeScript, so an extraction that finds almost none of it has
  // misparsed rather than found a clean manifest.
  if (typescript.length < declared.length / 2) {
    fail(`${manifest}: extracted only ${typescript.length} TypeScript paths from ${declared.length} declared entries; the closure check would pass vacuously`);
    return;
  }
  for (const relative of typescript) {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) {
      fail(`self-dev trust root lists ${relative}, which does not exist`);
      continue;
    }
    const body = withoutComments(fs.readFileSync(absolute, 'utf8'));
    for (const match of body.matchAll(/(?:from|import)\s*\(?\s*['"](\.[^'"]*)['"]/g)) {
      const specifier = match[1];
      const resolvedBase = path.posix.normalize(path.posix.join(path.posix.dirname(relative), specifier));
      const candidates = [`${resolvedBase}.ts`, path.posix.join(resolvedBase, 'index.ts'), resolvedBase];
      const target = candidates.find((candidate) => listed.has(candidate))
        ?? candidates.find((candidate) => fs.existsSync(path.join(root, candidate)));
      if (target === undefined) {
        fail(`self-dev trust root member ${relative} imports ${specifier}, which resolves to no file`);
        continue;
      }
      if (!listed.has(target)) {
        fail(`self-dev trust root is not closed: ${relative} imports ${specifier} (${target}), which is not in SELFDEV_AUTHORITATIVE_PATHS — every sandbox fixture mirror would fail to resolve it`);
      }
    }
  }
}

function checkSelfDevelopmentBoundary() {
  const files = selfDevelopmentSourceFiles();
  if (files.length === 0) {
    fail('Phase 8A self-development source is missing');
    return;
  }
  const sources = files.map((file) => [file, readIncludingComments(file)]);
  const combined = sources.map(([, source]) => source).join('\n');
  const provenanceManifest = readIncludingComments('src/core/selfDev/provenanceManifest.ts');
  for (const file of files) {
    if (!provenanceManifest.includes(`'${file}'`)) fail(`authoritative provenance manifest omits tracked selfDev source ${file}`);
  }
  const provenance = readIncludingComments('src/core/provenance/localGit.ts');
  if (!/spawnSync\('git', \[\.\.\.args\]/.test(provenance) || !/shell:\s*false/.test(provenance) || !/timeout:\s*5_000/.test(provenance) || !/maxBuffer:\s*512 \* 1024/.test(provenance)) {
    fail('read-only local Git provenance boundary is not fixed-argv, no-shell, and bounded');
  }
  if (!/GIT_OPTIONAL_LOCKS:\s*'0'/.test(provenance)) fail('read-only local Git provenance does not disable optional Git locks');
  if (/\['(?:add|commit|push|pull|fetch|checkout|switch|reset|clean|stash|merge|rebase|cherry-pick|apply|am|tag|branch|config)'/.test(provenance)) fail('local Git provenance contains a forbidden mutation or remote verb');
  for (const file of gitFiles().filter((item) => item.startsWith('src/core/provenance/') && item.endsWith('.ts'))) {
    if (file !== 'src/core/provenance/localGit.ts' && /node:child_process/.test(readIncludingComments(file))) fail(`${file} is an unapproved Git child-process boundary`);
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
  const candidateSource = readIncludingComments('src/core/selfDev/validation.ts');
  const keyStart = candidateSource.indexOf('const CANDIDATE_KEYS');
  const keyEnd = candidateSource.indexOf('const CANDIDATE_OPTIONAL_KEYS');
  const keyBlock = keyStart >= 0 && keyEnd > keyStart ? candidateSource.slice(keyStart, keyEnd) : '';
  for (const field of ['code', 'source', 'sourceCode', 'patch', 'diff', 'command', 'shell', 'script', 'url', 'endpoint', 'prompt', 'model', 'tools', 'functions', 'git', 'pathTraversal', 'outputPath']) {
    if (new RegExp(`['"]${field}['"]`).test(keyBlock)) fail(`Phase 8A candidate schema contains forbidden field ${field}`);
  }
  const proposer = readIncludingComments('src/core/selfDev/proposer.ts');
  if (!/class\s+SyntheticDeterministicProposer/.test(proposer)) fail('Phase 8A does not have the sole synthetic deterministic proposer');
  if (/class\s+(?:Local|Cloud|Remote|Agent)[A-Za-z]*Proposer/.test(combined)) fail('Phase 8A contains an unauthorized proposer class');
  const registry = readIncludingComments('src/core/selfDev/registry.ts');
  if (!/SELFDEV_ACTIONS/.test(registry) || !/SELFDEV_ASSERTIONS/.test(registry) || !/resolveSelfDevAction/.test(registry) || !/resolveSelfDevAssertion/.test(registry)) fail('Phase 8A action/assertion allowlists are missing');
  if (/\b(?:callback|executable\s*:\s*true|new\s+Function)\b/i.test(registry)) fail('Phase 8A registry exposes executable candidate behavior');
  const controller = readIncludingComments('src/core/selfDev/controller.ts');
  const storage = readIncludingComments('src/core/selfDev/storage.ts');
  if (!/SELF_DEVELOPMENT_SYNTHETIC_EVALUATION|SELFDEV_SYNTHETIC_BASE_NIGHTWATCH_SHA/.test(controller)) fail('Phase 8A controller lacks its narrow owner/synthetic boundary');
  if (!/PrivateArtifactStore/.test(storage) || !/writeImmutableJson/.test(storage)) fail('Phase 8A private results do not use the hardened immutable private store');
  if (!/validateSessionArtifact/.test(storage) || !/replaySession/.test(storage) || !/readBack/.test(storage)) fail('Phase 8A.1 persistence is missing strict pre-write or read-back replay gates');
  if (!/SELFDEV_PROVENANCE_REQUIRED/.test(controller) || !/provenance/.test(controller)) fail('Phase 8A.1 persistent controller does not require injected provenance');
  const validation = readIncludingComments('src/core/selfDev/validation.ts');
  if (!/sessionArtifactIdFor/.test(validation) || !/assertEvaluationStateInvariant/.test(validation) || !/SELFDEV_SESSION_ARTIFACT_SCHEMA_VERSION/.test(validation)) fail('Phase 8A.1 validation lacks v2 content identity or semantic state invariants');
  const replay = readIncludingComments('src/core/selfDev/replay.ts');
  if (!/canonicalJson\(actual\)/.test(replay) || !/proposals\[index\]/.test(replay) || !/DeterministicReplayClock/.test(replay)) fail('Phase 8A.1 replay is not ordered, exact, and clock-controlled');
  const trust = readIncludingComments('src/core/selfDev/trust.ts');
  if (!/VERIFIED_EXACT_BASE/.test(trust) || !/VERIFIED_SOURCE_EQUIVALENT_DESCENDANT/.test(trust) || !/LEGACY_UNVERIFIED_NOT_ELIGIBLE/.test(trust)) fail('Phase 8A.1 trust assessment is missing currentness or legacy quarantine');
  if (!/assessFutureReviewEligibility/.test(trust)) fail('Phase 8A.1.1 canonical future-review eligibility gate is missing');
  if (!/Number\.isInteger/.test(trust)) fail('Phase 8A.1.1 eligibility prerequisite does not validate pass-count shape at runtime');
  if (!/current:\s*CurrentSelfDevSourceView/.test(trust)) fail('Phase 8A.1.1 eligibility gate does not require a current-source view parameter');
  if (!/SELFDEV_PRIVATE_NAMESPACE/.test(storage) || !/self-development/.test(storage)) fail('Phase 8A private results lack a separate namespace');
  if (!/NOT_AUTHORIZED_PHASE_8A/.test(combined) || !/EVALUATED_PASS_NOT_ADOPTED/.test(combined) || !/PROHIBITED/.test(combined)) fail('Phase 8A result lacks explicit no-adoption/publication authority');
  const cli = readIncludingComments('bin/selfdev-synthetic.mjs');
  if (!/parseArgs/.test(cli) || !/runSyntheticSelfDevSession/.test(cli)) fail('Phase 8A CLI is not a thin synthetic controller wrapper');
  if (/\b(?:child_process|fetch\s*\(|http\.request|https\.request|net\.connect|WebSocket|git\s+(?:add|commit|push|apply)|AiReview|owner-review|database|production|NIGHTWATCH_STORAGE_STATE)\b/i.test(cli)) fail('Phase 8A CLI exposes a prohibited capability');
  if (/fs\.(?:write|append|rename|unlink|rm|copy|mkdir|link)/i.test(cli)) fail('Phase 8A CLI contains a filesystem-write path');
  if (!/readLocalNightwatchProvenance/.test(cli)) fail('Phase 8A synthetic CLI does not derive local Git/source provenance');
  const verifyCli = readIncludingComments('bin/selfdev-verify.mjs');
  if (!/--artifact-id/.test(verifyCli) || !/readOnly:\s*true/.test(verifyCli) || !/assessSelfDevArtifactIntegrity/.test(verifyCli)) fail('Phase 8A.1 verifier CLI lacks exact-ID read-only assessment');
  if (/(?:--latest|--all|--list|--root|--output|--patch|--adopt|--apply|--commit|--push|--model|--prompt|--url|--repo|--force)/.test(verifyCli) && !/SELFDEV_VERIFY_USAGE_INVALID/.test(verifyCli)) fail('Phase 8A.1 verifier CLI does not reject broad selection or mutation options');
  const provenanceCli = readIncludingComments('bin/selfdev-provenance.mjs');
  if (!/readLocalNightwatchProvenance/.test(provenanceCli) || /node:child_process|fs\.(?:write|append|rename|unlink|rm|copy|mkdir|link)/i.test(provenanceCli)) fail('read-only provenance CLI boundary is incomplete');
  const index = readIncludingComments('src/core/selfDev/index.ts');
  if (/export\s+\*\s+from\s+['"]\.\/storage['"]/.test(index) || /createSessionArtifact/.test(index)) fail('selfDev public index exposes a raw artifact constructor or storage wildcard');
  const ownerPolicy = readIncludingComments('src/core/policy/ownerScope.ts');
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
  const sources = files.map((file) => [file, readIncludingComments(file)]);
  const combined = sources.map(([, source]) => source).join('\n');
  const provenanceManifest = readIncludingComments('src/core/selfDev/provenanceManifest.ts');
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
  const loader = readIncludingComments('src/core/selfDevSandbox/sandboxLoader.ts');
  const bareRequires = loader.match(/requireFn\(\s*'([^./][^']*)'\s*\)/g) ?? [];
  for (const occurrence of bareRequires) {
    if (!/'typescript'/.test(occurrence)) fail(`sandbox loader requires an unapproved bare module: ${occurrence}`);
  }
  if (!/loadInFlight/.test(loader) || !/SELFDEV_SANDBOX_LOADER_BUSY/.test(loader)) fail('sandbox loader is missing its serial-execution lock');
  if (!/resolvedSandboxRoot/.test(loader) || !/SELFDEV_SANDBOX_LOADER_PATH_ESCAPE/.test(loader)) fail('sandbox loader is missing its path-confinement check');
  if (!/delete requireFn\.cache/.test(loader)) fail('sandbox loader does not clear its module cache');

  const mirror = readIncludingComments('src/core/selfDevSandbox/sandboxMirror.ts');
  if (!/SELFDEV_AUTHORITATIVE_PATHS/.test(mirror)) fail('sandbox mirror does not copy the fixed authoritative source set');
  if (!/isSymbolicLink/.test(mirror)) fail('sandbox mirror is missing symlink rejection');
  if (!/mode:\s*0o700/.test(mirror) || !/mode:\s*0o600/.test(mirror)) fail('sandbox mirror does not use owner-only directory/file permissions');
  if (!/resolvedBase\s*\+\s*path\.sep/.test(mirror)) fail('sandbox cleanup does not confine deletion to the fixed sandbox base');

  const planner = readIncludingComments('src/core/selfDevSandbox/planner.ts');
  if (!/assessFutureReviewEligibility/.test(planner)) fail('Phase 8B planner does not consume the canonical future-review eligibility gate');
  if (!/SELF_DEVELOPMENT_SANDBOX_ADOPTION/.test(planner)) fail('Phase 8B planner is missing its owner-policy gate');
  if (!/ALREADY_ADOPTED/.test(planner) || !/CATALOG_FULL/.test(planner) || !/CATALOG_NONCANONICAL/.test(planner)) fail('Phase 8B planner is missing a required fail-closed gate');
  if (!/sourceBundleDigestBefore\s*!==\s*plan\.sourceBundleDigestBefore/.test(planner) && !/current\.sourceBundleDigest\s*!==\s*plan\.sourceBundleDigestBefore/.test(planner)) {
    fail('Phase 8B planner is missing TOCTOU source-bundle revalidation');
  }

  const executor = readIncludingComments('src/core/selfDevSandbox/sandboxExecutor.ts');
  if (!/SELF_DEVELOPMENT_SANDBOX_ADOPTION/.test(executor)) fail('Phase 8B sandbox executor is missing its owner-policy gate');
  if (!/revalidatePlan/.test(executor)) fail('Phase 8B sandbox executor does not revalidate the plan before mutation');
  if (!/diffSandboxAgainstCanonical/.test(executor) || !/changedFiles\.length\s*!==\s*1/.test(executor)) fail('Phase 8B sandbox executor does not enforce exactly one changed file');
  if (!/cleanupSandboxMirror/.test(executor)) fail('Phase 8B sandbox executor does not clean up its sandbox mirror');
  // The four metamorphic-probe verdicts are proved by the shared pure
  // src/core/selfDev/metamorphicProbes.ts implementation (Phase 8B.1 extracted
  // it so canonical verification can reuse the same proof logic); the
  // executor must still be the one invoking it.
  const metamorphicProbes = readIncludingComments('src/core/selfDev/metamorphicProbes.ts');
  if (!/runMetamorphicProbes/.test(executor)) fail('Phase 8B sandbox executor does not invoke the shared metamorphic proof implementation');
  if (!/REJECTED_DUPLICATE/.test(metamorphicProbes) || !/EVALUATED_PASS_NOT_ADOPTED/.test(metamorphicProbes) || !/REJECTED_SAFETY/.test(metamorphicProbes)) {
    fail('shared metamorphic proof implementation is missing a required probe verdict');
  }
  if (!/SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED/.test(combined) || !/canonicalApply:\s*'PROHIBITED'/.test(combined) || !/publication:\s*'PROHIBITED'/.test(combined)) {
    fail('Phase 8B sandbox result lacks explicit non-canonical/no-publication authority');
  }

  const storage = readIncludingComments('src/core/selfDevSandbox/storage.ts');
  if (!/PrivateArtifactStore/.test(storage) || !/writeImmutableJson/.test(storage)) fail('Phase 8B plan/result storage does not use the hardened immutable private store');
  if (/\.writeJson\s*\(|writeIncomplete\s*\(/.test(storage)) fail('Phase 8B plan/result storage retains a replacement-capable write path');

  const index = readIncludingComments('src/core/selfDevSandbox/index.ts');
  if (!/runSandboxAdoption/.test(index) || !/planAdoption/.test(index)) fail('Phase 8B public index is missing its plan/run entry points');

  const ownerPolicy = readIncludingComments('src/core/policy/ownerScope.ts');
  if (!/SELF_DEVELOPMENT_SANDBOX_ADOPTION/.test(ownerPolicy)) fail('Phase 8B lacks a distinct owner-policy capability');

  const cli = readIncludingComments('bin/selfdev-adopt-sandbox.mjs');
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
    const source = readIncludingComments(file);
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
  const source = readIncludingComments('src/core/policy/privateArtifacts.ts');
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
  const storage = readIncludingComments('src/core/aiReview/storage.ts');
  if (!/writeBugDraft[\s\S]*writeImmutableJson/.test(storage) || !/writeOracleSuggestion[\s\S]*writeImmutableJson/.test(storage) || !/writeHumanReview[\s\S]*writeImmutableJson/.test(storage)) fail('AI bug/oracle/review writes do not all use immutable publication');
  if (/writeIncomplete\s*\(|\.writeJson\s*\(/.test(storage)) fail('AI immutable storage uses replacement-capable writeJson/writeIncomplete');
}

function checkOwnerDecisionAuthority() {
  const index = readIncludingComments('src/core/aiReview/index.ts');
  if (/export\s+\*\s+from\s+['"]\.\/ownerReview['"]/.test(index)) fail('AI public index wildcard-exports owner review authority');
  if (/ownerDecision|recordOwnerDecision|recordConfirmedOwnerDecision|createHumanReviewRecord/.test(index)) fail('AI public index exposes owner-decision write authority');

  const internal = 'src/core/aiReview/ownerDecision.ts';
  const internalSource = readIncludingComments(internal);
  if (!/function\s+recordOwnerDecision\s*\(/.test(internalSource) || /export\s+function\s+recordOwnerDecision\s*\(/.test(internalSource)) fail('raw unconfirmed owner decision helper is not private');
  if (!/export\s+function\s+recordConfirmedOwnerDecision\s*\(/.test(internalSource) || !/confirmationMatches\(/.test(internalSource) || !/expectedArtifactDigest/.test(internalSource)) fail('internal owner decision boundary is missing confirmation/digest requirements');

  const sourceFiles = gitFiles()
    .filter((file) => (file.startsWith('src/') || file.startsWith('bin/')) && /\.(?:ts|mjs|js)$/.test(file))
    .filter((file) => file !== 'bin/hardening-check.mjs' && file !== internal && file !== 'src/core/aiReview/review.ts');
  for (const file of sourceFiles) {
    const source = readIncludingComments(file);
    if (file !== 'bin/ai-owner-review.mjs' && /[\'\"]ownerDecision\.ts[\'\"]|recordConfirmedOwnerDecision|\bcreateHumanReviewRecord\s*\(|\.writeHumanReview\s*\(/.test(source)) fail(`${file} reaches owner-decision write authority outside the approved boundary`);
  }
  const cli = readIncludingComments('bin/ai-owner-review.mjs');
  if (!/ownerDecision\.ts/.test(cli) || !/recordConfirmedOwnerDecision/.test(cli)) fail('owner-review CLI is not the sole internal owner-decision loader');
  if (!/process\.stdin\.isTTY/.test(cli) || !/process\.stdout\.isTTY/.test(cli)) fail('owner-review CLI is missing its TTY boundary');
  if (!/A = approve draft, R = reject, S = supersede, Q = cancel/.test(cli)) fail('owner-review CLI fixed decision menu is missing');
  if (!/Type \$\{token\} to confirm exactly/.test(cli)) fail('owner-review CLI exact second confirmation is missing');
}

function checkAiInvocationAuthority() {
  const pipeline = readIncludingComments('src/core/aiReview/pipeline.ts');
  const index = readIncludingComments('src/core/aiReview/index.ts');
  if (/export\s+(?:async\s+)?function\s+(?:reviewBugCandidate|suggestOracle)\b/.test(pipeline)) fail('AI pipeline exports an unbudgeted provider execution function');
  if (/export\s+\*\s+from\s+['"]\.\/pipeline['"]/.test(index) || /export\s*\{[^}]*\b(?:reviewBugCandidate|suggestOracle)\b[^}]*\}/s.test(index)) fail('AI public index exposes a raw provider execution function');
  if (!/export\s*\{\s*AiReviewSession\s*\}\s*from\s+['"]\.\/pipeline['"]/.test(index)) fail('AiReviewSession is not the explicit public provider execution boundary');
  if (!/class\s+AiReviewSession/.test(pipeline) || !/private\s+reserveProviderCall/.test(pipeline) || !/this\.providerCalls\s*\+=\s*1/.test(pipeline)) fail('AI session does not contain the canonical synchronous provider reservation');

  const sourceFiles = gitFiles()
    .filter((file) => (file.startsWith('src/') || file.startsWith('bin/')) && /\.(?:ts|mjs|js)$/.test(file))
    .filter((file) => file !== 'bin/hardening-check.mjs');
  for (const file of sourceFiles) {
    const source = readIncludingComments(file);
    if (file !== 'src/core/aiReview/pipeline.ts' && file !== 'src/core/aiReview/localCanary.ts' && /\.\s*(?:reviewBugCandidate|suggestOracle)\s*\(/.test(source)) fail(`${file} directly invokes a raw AI provider operation`);
    if (file !== 'src/core/aiReview/pipeline.ts' && /\binvokeRegisteredProvider\s*\(/.test(source)) fail(`${file} imports or invokes the private AI provider boundary`);
    if (!file.startsWith('src/core/aiReview/') && /\b(?:AiReviewSession|registerAiReviewProvider|invokeRegisteredProvider|reviewBugCandidate|suggestOracle)\b/.test(source)) fail(`${file} imports or invokes AI review execution outside the AI subsystem`);
  }
  const boundaryOccurrences = pipeline.match(/\binvokeRegisteredProvider\s*\(/g) ?? [];
  if (boundaryOccurrences.length !== 2) fail(`AI provider boundary has ${boundaryOccurrences.length} references; expected one definition and one canonical call`);
  if (/new\s+AiReviewSession\s*\(/.test(sourceFiles.filter((file) => !file.startsWith('src/core/aiReview/')).map((file) => readIncludingComments(file)).join('\n'))) fail('runtime source creates automatic AI review sessions outside the AI subsystem');
}

function checkOwnerReviewCliBoundary() {
  const file = 'bin/ai-owner-review.mjs';
  const source = readIncludingComments(file);
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
function checkActiveMilestoneProgression() {
  const activeText = readIncludingComments('.agent/ACTIVE_TASK.md');
  if (activeText.length === 0) return;
  const directory = /^Task directory:\s*(\S+)\s*$/m.exec(activeText)?.[1];
  if (directory === undefined || !directory.startsWith('.agent/tasks/')) return;
  const stateText = readIncludingComments(`${directory}/STATE.md`);
  const planText = readIncludingComments(`${directory}/PLAN.md`);
  if (stateText.length === 0 || planText.length === 0) return;
  // Only the versioned live schema.
  if (!stateText.includes('nightwatch.agent-continuity.v2')) return;

  const complete = new Set();
  for (const match of stateText.matchAll(/\*\*(M\d+)\b[^*]*\bCOMPLETE/g)) complete.add(match[1]);
  for (const milestone of [...complete].sort()) {
    const section = new RegExp(`^### ${milestone} —[\\s\\S]*?(?=^### |\\n## )`, 'm').exec(planText);
    if (section === null) {
      fail(`${directory}/PLAN.md has no '### ${milestone}' section although STATE.md reports it COMPLETE`);
      continue;
    }
    const status = /^- \*\*Status:\*\*\s*(\S+)/m.exec(section[0])?.[1];
    if (status === undefined) {
      fail(`${directory}/PLAN.md milestone ${milestone} has no Status line although STATE.md reports it COMPLETE`);
      continue;
    }
    if (status !== 'COMPLETE') {
      fail(`${directory}/PLAN.md milestone ${milestone} reads ${status} but STATE.md reports it COMPLETE; a reader following the PLAN would redo shipped work`);
    }
  }
}

function checkDecisionIdentityUniqueness() {
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

function checkHostCapabilityMatrix() {
  const matrixFile = 'docs/HOST-CAPABILITY-MATRIX.md';
  const matrix = readIncludingComments(matrixFile);
  if (matrix.length === 0) {
    fail(`${matrixFile} is missing; the qualified-host requirements must be documented`);
    return;
  }
  const manifest = JSON.parse(readIncludingComments('package.json'));
  for (const name of Object.keys({ ...(manifest.dependencies ?? {}), ...(manifest.devDependencies ?? {}) })) {
    if (!matrix.includes(`\`${name}\``)) {
      fail(`${matrixFile} does not assess the declared dependency '${name}'; a dependency without an assessment is an unevidenced claim`);
    }
  }
  // token -> the source that must still probe it
  for (const [token, source] of [
    ['nightwatch.l6-runtime-capability.v1', 'src/core/oops/sandbox.ts'],
    ['TOOLCHAIN_UNAVAILABLE', 'src/core/ownerLocalReproduction/contracts.ts'],
    ['DEFAULT_SIBLING_ROOT', 'src/core/source/siblingSource.ts'],
    ['deepContainmentLane', 'bin/quality-gate.mjs'],
  ]) {
    if (!read(source).includes(token)) {
      fail(`${source} no longer references '${token}'; the host capability matrix row for it is stale`);
      continue;
    }
    if (!matrix.includes(token)) {
      fail(`${matrixFile} does not name the probed host capability '${token}'`);
    }
  }
  // An unqualified host must never inherit a pass, and the matrix must say so.
  // Whitespace-tolerant on purpose: prose wraps, and a rule that a reflowed
  // paragraph can break is a rule that will be "fixed" by deleting it.
  if (!/unsupported\s+capability/i.test(matrix) || !/never\s+inherits?/i.test(matrix)) {
    fail(`${matrixFile} must state that an unqualified host reports unsupported capability and never inherits a pass`);
  }
}

function checkValidationUniverse() {
  const result = spawnSync(process.execPath, [path.join(root, 'bin', 'validation-universe.mjs'), '--json'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 8 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error || typeof result.stdout !== 'string' || result.stdout.trim() === '') {
    fail('validation universe could not be discovered');
    return;
  }
  let judgement;
  try {
    judgement = JSON.parse(result.stdout);
  } catch {
    fail('validation universe judgement was not readable');
    return;
  }
  for (const error of (judgement.errors ?? []).slice(0, 12)) {
    fail(`validation universe: ${error.code}: ${error.detail}`);
  }
  const remaining = (judgement.errors ?? []).length - 12;
  if (remaining > 0) fail(`validation universe: ${remaining} further violation(s)`);
  // A judgement that classified nothing would pass vacuously.
  if ((judgement.counts?.discovered ?? 0) < 100) {
    fail('validation universe discovered implausibly few tests; discovery is broken rather than clean');
  }
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

/**
 * F-15 — the CLI-to-implementation contract. Every path a bin hands to the
 * runtime TypeScript loader must be a string literal, must resolve to a real
 * module, and every symbol the call site reads must be exported by that module.
 * The loader's typed declaration is generated from the same call sites, so a
 * renamed export or a moved module fails here, before any bin executes.
 */
function checkCliImplementationContract() {
  const tracked = gitFiles();
  const binFiles = tracked.filter((file) => /^bin\/.*\.mjs$/.test(file)).sort();
  const files = binFiles.map((file) => ({ file, source: readIncludingComments(file) }));
  const judgement = verifyCliImplementationContract({
    files,
    access: {
      readSource: (relativePath) => {
        try {
          return fs.readFileSync(path.join(root, relativePath), 'utf8');
        } catch {
          return null;
        }
      },
      fileExists: (relativePath) => fs.existsSync(path.join(root, relativePath)),
    },
    readLoaderTypeMap: () => {
      try {
        return fs.readFileSync(path.join(root, 'bin', 'lib', 'typescript-runtime-loader.d.mts'), 'utf8');
      } catch {
        return null;
      }
    },
  });
  for (const finding of judgement.findings) {
    fail(`CLI contract ${finding.code}: ${finding.detail}`);
  }
  // A lane that extracted nothing would otherwise report success vacuously.
  if (judgement.stats.callSites === 0) fail('CLI contract resolved zero loader call sites; the extractor is broken rather than clean');
  if (judgement.stats.distinctPaths === 0) fail('CLI contract resolved zero module paths; the extractor is broken rather than clean');
  if (judgement.stats.literalPaths === 0) fail('CLI contract literal scan found zero referenced paths; the scan is broken rather than clean');
}

/**
 * F-15 — every top-level entry point is executed as a process by at least one
 * automated test. Discovery is from the working tree so an untracked new bin
 * cannot hide from the rule before its first commit; a test that only reads the
 * bin's text does not count, and a newly added bin with no executing test fails
 * by name.
 * @param {string} directory
 * @param {(name: string) => boolean} predicate
 * @returns {string[]}
 */
function walkWorkingTree(directory, predicate) {
  /** @type {string[]} */
  const results = [];
  for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) results.push(...walkWorkingTree(relative, predicate));
    else if (predicate(entry.name)) results.push(relative);
  }
  return results;
}

function checkBinExecutionCoverage() {
  const bins = walkWorkingTree('bin', (name) => name.endsWith('.mjs')).filter((file) => !file.slice('bin/'.length).includes('/'));
  const tests = walkWorkingTree('tests', (name) => name.endsWith('.ts')).map((file) => ({ file, source: readIncludingComments(file) }));
  const coverage = findBinsWithoutExecutingTest({ bins, tests });
  if (coverage.bins.length === 0) {
    fail('BIN_EXECUTION_COVERAGE_VACUOUS: zero tracked bin entry points discovered');
    return;
  }
  for (const bin of coverage.uncovered) {
    fail(`BIN_EXECUTION_COVERAGE_MISSING: ${bin} has no test that executes it as a process`);
  }
}

function checkPhase23QualityGate() {
  const workflow = readIncludingComments('.github/workflows/hardening.yml');
  const packageJson = readIncludingComments('package.json');
  const runner = readIncludingComments('bin/quality-gate.mjs');
  const spec = readIncludingComments('bin/quality-gate-spec.mjs');
  const semantic = readIncludingComments('bin/semantic-compat.mjs');
  const clean = readIncludingComments('bin/quality-gate-clean.mjs');
  let gate;
  let compatibility;
  try {
    gate = JSON.parse(readIncludingComments('config/quality-gate.v1.json'));
    compatibility = JSON.parse(readIncludingComments('config/semantic-compatibility.v1.json'));
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

  const phase23Operator = readIncludingComments('bin/phase23-dev.mjs');
  const phase23Manifest = readIncludingComments('src/core/phase23/manifest.ts');
  const phase23Observer = readIncludingComments('bin/phase23-ci.mjs');
  const phase23Predev = readIncludingComments('bin/phase23-predev.mjs');
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
  const mirror = readIncludingComments('src/core/selfDevSandbox/sandboxMirror.ts');
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

  const validation = readIncludingComments('src/core/selfDevSandbox/validation.ts');
  if (!/SELFDEV_ADOPTION_STRATEGY_CLASS/.test(validation)) fail('8B.0.1: plan/result validation does not bind the single strategy constant');
  if (!/PLAN_STRATEGY_MISMATCH/.test(validation)) fail('8B.0.1: plan/adopted-case strategy cross-binding is missing');
  if (!/result\.nonOverreachResult !== 'PASS'/.test(validation)) fail('8B.0.1: verified-result invariant does not require the non-overreach proof PASS');
  if (!/result\.sandboxSourceWrites > 1/.test(validation)) fail('8B.0.1: sandbox write count is not bounded to at most one');
  if (!/NON_OVERREACH_PROBE_UNAVAILABLE/.test(validation)) fail('8B.0.1: NON_OVERREACH_PROBE_UNAVAILABLE is not a valid failure class');

  const executor = readIncludingComments('src/core/selfDevSandbox/sandboxExecutor.ts');
  if (!/let sandboxSourceWrites = 0/.test(executor) || !/sandboxSourceWrites = 1/.test(executor)) fail('8B.0.1: executor does not track actual sandbox writes');
  if (/sandboxSourceWrites:\s*[01],/.test(executor)) fail('8B.0.1: executor hardcodes the sandbox write count instead of the tracked value');
  if (!/probes\.nonOverreachResult === 'NOT_RUN'/.test(executor) || !/NON_OVERREACH_PROBE_UNAVAILABLE/.test(executor)) fail('8B.0.1: executor does not fail closed when the non-overreach probe is unavailable');
  if (!/probes\.nonOverreachResult === 'FAIL'/.test(executor) || !/NON_OVERREACH_REGRESSION/.test(executor)) fail('8B.0.1: executor does not distinguish a failed non-overreach probe');

  const types = readIncludingComments('src/core/selfDevSandbox/types.ts');
  if (!/NON_OVERREACH_PROBE_UNAVAILABLE/.test(types)) fail('8B.0.1: failure-class union lacks NON_OVERREACH_PROBE_UNAVAILABLE');
  if (!/SelfDevAdoptionStrategyClass/.test(types)) fail('8B.0.1: plan/result strategyClass is not the literal single-strategy type');

  const loader = readIncludingComments('src/core/selfDevSandbox/sandboxLoader.ts');
  if (!/finally\s*\{[\s\S]{0,500}?loadInFlight = false/.test(loader)) fail('8B.0.1: sandbox loader lock is not released on every exit path');

  const index = readIncludingComments('src/core/selfDevSandbox/index.ts');
  if (/setSandboxBaseOverrideForTests/.test(index)) fail('8B.0.1: the test-only sandbox-base override leaked into the boundary index');

  const adoptedCases = readIncludingComments('src/core/selfDev/adoptedCases.ts');
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
  const sources = files.map((file) => [file, readIncludingComments(file)]);
  const combined = sources.map(([, source]) => source).join('\n');
  const provenanceManifest = readIncludingComments('src/core/selfDev/provenanceManifest.ts');
  for (const file of files) {
    if (!provenanceManifest.includes(`'${file}'`)) fail(`authoritative provenance manifest omits tracked selfDevPromotion source ${file}`);
  }
  if (!provenanceManifest.includes("'bin/selfdev-promote-canonical.mjs'")) fail('authoritative provenance manifest omits the Phase 8B.1 CLI');

  const ownerPolicy = readIncludingComments('src/core/policy/ownerScope.ts');
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

  const prepare = readIncludingComments('src/core/selfDevPromotion/prepare.ts');
  if (!/SELF_DEVELOPMENT_CANONICAL_ADOPTION/.test(prepare)) fail('Phase 8B.1 prepare is missing its owner-policy gate');
  if (!/assertRepositoryFullyClean/.test(prepare)) fail('Phase 8B.1 prepare does not require whole-repository cleanliness');
  if (!/assessFutureReviewEligibility/.test(prepare)) fail('Phase 8B.1 prepare does not consume the canonical future-review eligibility gate');
  if (!/ALREADY_ADOPTED/.test(prepare)) fail('Phase 8B.1 prepare is missing its already-adopted fail-closed gate');

  const approve = readIncludingComments('src/core/selfDevPromotion/approve.ts');
  if (!/SELF_DEVELOPMENT_CANONICAL_ADOPTION/.test(approve)) fail('Phase 8B.1 approve is missing its owner-policy gate');
  if (!/SELFDEV_CANONICAL_PROMOTION_APPROVAL_CONFIRMATION/.test(approve)) fail('Phase 8B.1 approve does not require the fixed confirmation token');
  if (!/assertRepositoryFullyClean/.test(approve)) fail('Phase 8B.1 approve does not require whole-repository cleanliness');
  if (!/PROMOTION_SOURCE_ADVANCED/.test(approve)) fail('Phase 8B.1 approve does not fail closed when source has advanced');

  const apply = readIncludingComments('src/core/selfDevPromotion/apply.ts');
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

  const verify = readIncludingComments('src/core/selfDevPromotion/verify.ts');
  if (!/SELF_DEVELOPMENT_CANONICAL_ADOPTION/.test(verify)) fail('Phase 8B.1 verify is missing its owner-policy gate');
  if (!/HEAD_ADVANCED/.test(verify)) fail('Phase 8B.1 verify does not require the exact pre-commit HEAD');
  if (!/UNEXPECTED_CHANGESET/.test(verify) || !/UNEXPECTED_STAGED_CHANGE/.test(verify) || !/UNEXPECTED_UNTRACKED_FILE/.test(verify)) {
    fail('Phase 8B.1 verify does not require exactly one dirty tracked file');
  }
  if (!/runMetamorphicProbes/.test(verify)) fail('Phase 8B.1 verify does not reuse the shared metamorphic proof implementation');

  if (!/CANONICAL_APPLIED_VERIFIED_UNCOMMITTED/.test(combined) || !/NOT_PERFORMED_BY_RUNTIME/.test(combined) || !/NOT_AUTHORIZED/.test(combined)) {
    fail('Phase 8B.1 canonical promotion lacks explicit uncommitted/no-runtime-Git authority markers');
  }

  const storage = readIncludingComments('src/core/selfDevPromotion/storage.ts');
  if (!/PrivateArtifactStore/.test(storage) || !/writeImmutableJson/.test(storage)) fail('Phase 8B.1 promotion storage does not use the hardened immutable private store');
  if (/\.writeJson\s*\(|writeIncomplete\s*\(/.test(storage)) fail('Phase 8B.1 promotion storage retains a replacement-capable write path');
  if (!/claimApprovalConsumption/.test(storage)) fail('Phase 8B.1 storage is missing the approval one-shot consumption primitive');

  const index = readIncludingComments('src/core/selfDevPromotion/index.ts');
  if (!/applyPromotion/.test(index) || !/preparePromotion/.test(index) || !/approvePromotion/.test(index) || !/verifyCanonicalPromotion/.test(index)) {
    fail('Phase 8B.1 public index is missing a required entry point');
  }

  const cli = readIncludingComments('bin/selfdev-promote-canonical.mjs');
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
    const source = readIncludingComments(file);
    if (/\bapplyPromotion\s*\(|\bSelfDevCanonicalApplyReceiptStore\b|\bSelfDevCanonicalPromotionApprovalStore\b/.test(source)) {
      fail(`${file} reaches Phase 8B.1 canonical-promotion authority outside the approved boundary`);
    }
    if (/from\s+['"][^'"]*selfDevPromotion[^'"]*['"]/.test(source)) fail(`${file} imports the Phase 8B.1 canonical-promotion boundary outside its approved callers`);
  }
}


function checkPhase8B10PortfolioIntegrity() {
  // Phase 8B.1.0 — bounded deterministic proposal portfolio.
  const portfolio = readIncludingComments('src/core/selfDev/portfolio.ts');
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

  const proposer = readIncludingComments('src/core/selfDev/proposer.ts');
  const types = readIncludingComments('src/core/selfDev/types.ts');
  if (!/VALID_MATRIX_EXPAND/.test(proposer) || !/VALID_MATRIX_EXPAND_COLLAPSE/.test(proposer)) {
    fail('Phase 8B.1.0 proposer lacks the concrete portfolio matrix fixtures');
  }
  if (!/VALID_MATRIX_EXPAND/.test(types) || !/VALID_MATRIX_EXPAND_COLLAPSE/.test(types)) {
    fail('Phase 8B.1.0 replay-fixture enum lacks the concrete portfolio fixtures');
  }

  const controller = readIncludingComments('src/core/selfDev/controller.ts');
  if (!/selectNextSyntheticProposalVariant/.test(controller)) fail('Phase 8B.1.0 controller does not consume the deterministic portfolio selector');
  if (!/VALID_MATRIX_EXPAND_COLLAPSE/.test(controller)) fail('Phase 8B.1.0 controller does not resolve the default alias to a concrete portfolio fixture');

  const contract = readIncludingComments('src/core/selfDev/contract.ts');
  if (!/syntheticPortfolioVersion/.test(contract) || !/syntheticSelectionAlgorithmVersion/.test(contract) || !/syntheticProposalPortfolio/.test(contract)) {
    fail('Phase 8B.1.0 contract manifest does not bind the portfolio/selection semantics');
  }
  if (!/nightwatch\.selfdev-contract\.private\.v2/.test(contract)) fail('Phase 8B.1.0 contract manifest version was not deliberately advanced to v2');

  // Production CLIs must never reach the test-only baseline helpers.
  for (const cli of ['bin/selfdev-synthetic.mjs', 'bin/selfdev-verify.mjs', 'bin/selfdev-adopt-sandbox.mjs', 'bin/selfdev-promote-canonical.mjs']) {
    if (/tests\/helpers/.test(readIncludingComments(cli))) fail(`${cli} reaches the test-only source-fixture baseline helpers`);
  }

  // Phase 8B.1-R1 — the real canonical adopted-case catalog may legitimately
  // hold 0..SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES entries (EMPTY, one-entry,
  // future two-entry/exhausted states are all supported). The enforced
  // invariants are: the generated file stays pure declarative data (no
  // imports/functions/executable code), the dedicated runtime integrity
  // check reuses the real validator/renderer (never a cardinality-locked
  // regex), and CI executes it. Runtime schema/byte-roundtrip validation
  // happens in bin/selfdev-catalog-integrity.mjs.
  const catalog = readIncludingComments('src/core/selfDev/adoptedCaseCatalog.generated.ts');
  if (!/^\/\/ GENERATED FILE/.test(catalog)) fail('the real canonical adopted-case catalog lost its generated-file header');
  const catalogCode = catalog.split('\n').filter((line) => !line.trim().startsWith('//'));
  if (/^\s*(?:import|require)\b|function\s+|=>|eval\s*\(|process\.|new\s+Function\s*\(/.test(catalogCode.join('\n'))) {
    fail('the real canonical adopted-case catalog contains executable code');
  }
  if (!/export const SELFDEV_ADOPTED_CASES = (?:\[\]|\[)/.test(catalog)) {
    fail('the real canonical adopted-case catalog does not declare the pure-data SELFDEV_ADOPTED_CASES array literal');
  }
  const integrityBin = readIncludingComments('bin/selfdev-catalog-integrity.mjs');
  if (!/validateAdoptedCatalog/.test(integrityBin) || !/renderAdoptedCatalogSource/.test(integrityBin)) {
    fail('bin/selfdev-catalog-integrity.mjs must reuse validateAdoptedCatalog/renderAdoptedCatalogSource');
  }
  const workflow = readIncludingComments('.github/workflows/hardening.yml');
  const gateDefinition = readIncludingComments('config/quality-gate.v1.json');
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
    const source = readIncludingComments(file);
    if (mutationRe.test(source)) {
      fail(`${file} contains a filesystem mutation call (continuity checker must be read-only)`);
    }
  }
  const protocolModule = readIncludingComments('bin/agent-continuity-protocol.mjs');
  if (/\b(?:spawnSync|execSync|child_process|fetch\(|https?\.request|net\.)/.test(protocolModule)) {
    fail('bin/agent-continuity-protocol.mjs must stay a pure parsing module (no child processes, no network)');
  }
  if (!/nightwatch\.agent-continuity\.v2/.test(protocolModule)) {
    fail('bin/agent-continuity-protocol.mjs must define the v2 protocol version constant');
  }
  const pkg = readIncludingComments('package.json');
  if (!/"agent:audit"\s*:\s*"node bin\/agent-state\.mjs --audit-history"/.test(pkg)) {
    fail('package.json agent:audit must invoke the local checker with --audit-history');
  }
  const workflow = readIncludingComments('.github/workflows/hardening.yml');
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

function checkProjectStateIntegrity() {
  // Phase 8B.1-R1.1 / campaign hardening — project-memory truth
  // (nightwatch.project-state.v2).
  // The project-state checker must stay a deterministic read-only tool: no
  // filesystem writes, no network, no model, no DB/infrastructure, and the
  // canonical catalog target stays code-defined (no user-supplied path).
  const checker = readIncludingComments('bin/project-state-check.mjs');
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
  const pkg = readIncludingComments('package.json');
  if (!/"project:check"\s*:\s*"node bin\/project-state-check\.mjs"/.test(pkg)) {
    fail('package.json project:check must invoke the local project-state checker');
  }
  const workflow = readIncludingComments('.github/workflows/hardening.yml');
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

function checkPlannerHandoffIntegrity() {
  // The handoff boundary owns only prompt route/currentness. Keep the parser
  // pure and the Git-aware checker local, read-only, bounded, and categorical.
  const protocol = readIncludingComments('bin/planner-handoff-protocol.mjs');
  const checker = readIncludingComments('bin/planner-handoff-check.mjs');
  const prompt = readIncludingComments('.agent/EXECUTION_PROMPT.md');
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
  const packageJson = readIncludingComments('package.json');
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
  const currentState = readIncludingComments('docs/CURRENT_STATE.md');
  const roadmap = readIncludingComments('docs/ROADMAP.md');
  const activeTask = readIncludingComments('.agent/ACTIVE_TASK.md');
  const executionPrompt = readIncludingComments('.agent/EXECUTION_PROMPT.md');
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
function checkPhase9IntegrationSeams() {
  const observer = readIncludingComments('src/browser/observers/networkObserver.ts');
  if (!/semanticOracle\?:/.test(observer) || !/evaluateSemanticHook/.test(observer) || !/semanticFindings\(\)/.test(observer)) {
    fail('network observer is missing the Phase 9 semantic hook or findings ledger');
  }
  if (!/checkUnexpectedStatus/.test(observer)) fail('network observer lost the protocol oracle wiring');
  const phase5Semantic = readIncludingComments('src/api/phase5/semantic.ts');
  if (!/evaluateApiResponseSemantic/.test(phase5Semantic) || !/evaluateApiResponse\(/.test(phase5Semantic)) {
    fail('Phase 5 semantic stage must compose the existing protocol oracle');
  }
  if (!/ORACLE_PASS/.test(phase5Semantic)) fail('Phase 5 semantic stage must gate on protocol ORACLE_PASS');
  const orchestrator = readIncludingComments('src/core/campaign/orchestrator.ts');
  if (!/toSemanticDossierEvidence/.test(orchestrator)) fail('campaign orchestrator must attach semantic dossier evidence');
  const dossier = readIncludingComments('src/core/triage/dossier.ts');
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
function checkPhase9A1SourceReaderBoundary() {
  const reader = readIncludingComments('src/core/source/siblingSource.ts');
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
  const scan = readIncludingComments('src/core/source/scan.ts');
  const scanTypes = readIncludingComments('src/core/source/scanTypes.ts');
  if (!/enumerateFiles/.test(reader) || !/scanSource/.test(scan) || !/configDigest/.test(scanTypes)) fail('Phase 25 source inventory is not wired through the confined reader and versioned config');
  if (/readonly\s+(?:sourceText|rawSource|sourceCode)\s*[:?]/.test(scanTypes)) fail('Phase 25 persisted source DTOs contain raw source text fields');
}

/**
 * Phase 9A.1 integration seams: receipts + the evaluation ledger are wired
 * through the observer; the hook is total (never silent); the Phase 5
 * composed stage exposes receipt outcomes.
 */
function checkPhase9A1IntegrationSeams() {
  const observer = readIncludingComments('src/browser/observers/networkObserver.ts');
  if (!/semanticEvaluations\(\)/.test(observer) || !/semanticEvaluationLedgerOverflow\(\)/.test(observer)) {
    fail('network observer is missing the Phase 9A.1 evaluation ledger or its explicit overflow flag');
  }
  if (!/buildInternalErrorReceipt/.test(observer)) fail('network observer is missing the safe INTERNAL_ERROR receipt fallback');
  if (!/privacyViolation/.test(observer) || !/semantic-privacy-contract-violation/.test(observer)) {
    fail('network observer is missing the privacy-contract violation escalation');
  }
  const hook = readIncludingComments('src/oracles/semantic/hook.ts');
  if (!/evaluateSemanticResolution/.test(hook) || !/receipt: SemanticEvaluationReceipt \| null/.test(hook)) {
    fail('semantic hook must return a safe evaluation receipt');
  }
  if (!/NO_EXPECTATION/.test(hook)) fail('semantic hook lost the NO_EXPECTATION outcome');
  const phase5Semantic = readIncludingComments('src/api/phase5/semantic.ts');
  if (!/receipt: SemanticEvaluationReceipt \| null/.test(phase5Semantic)) {
    fail('Phase 5 semantic stage must expose the evaluation receipt');
  }
  const resolver = readIncludingComments('src/oracles/expectations/resolver.ts');
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
function checkPhase9bIntegrationSeams() {
  const context = readIncludingComments('src/browser/context.ts');
  if (!/semanticOracle\?: SemanticResponseOracle/.test(context)) {
    fail('context is missing the optional Phase 9B semanticOracle option');
  }
  if (!/semanticOracle: opts\.semanticOracle/.test(context)) {
    fail('context does not pass the semantic oracle to the network observer');
  }
  const runner = readIncludingComments('tests/manual/phase9b-contained-dev-semantic.ts');
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
  const launcher = readIncludingComments('bin/phase9b-launcher-args.mjs');
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
function checkPhase10IntegrationSeams() {
  const registry = readIncludingComments('src/oracles/expectations/recipes/registry.ts');
  if (!/nightwatch\.real-source-expectation-recipe\.v2/.test(registry)) {
    fail('recipe registry is missing the v2 schema constant');
  }
  const extractor = readIncludingComments('src/oracles/expectations/extract/php.ts');
  if (!/PHP_ITEM_FIELD_TYPE_FLOW/.test(extractor) || !/extractPhpItemFieldTypeFlow/.test(extractor)) {
    fail('type-flow extractor is missing from the PHP extractor module');
  }
  if (!/EMPTY_CAST_OBJECT/.test(extractor) || !/EMPTY_ARRAY_OR_STRING_KEYS/.test(extractor)) {
    fail('type-flow extractor lost a fixed pattern');
  }
  const expectationTypes = readIncludingComments('src/oracles/expectations/types.ts');
  if (!/TYPE_IN_SET/.test(expectationTypes)) fail('TYPE_IN_SET is missing from the invariant vocabulary');
  const invariantEval = readIncludingComments('src/oracles/invariants/evaluate.ts');
  if (!/case 'TYPE_IN_SET'/.test(invariantEval)) fail('TYPE_IN_SET evaluation case is missing');
  const oracle = readIncludingComments('src/oracles/semantic/oracle.ts');
  if (!/case 'TYPE_IN_SET':\n\s+case 'TYPE_MATCH':/.test(oracle) && !/TYPE_IN_SET[\s\S]{0,200}TYPE_CONTRADICTED/.test(oracle)) {
    fail('semantic oracle lost the TYPE_IN_SET -> TYPE_CONTRADICTED class mapping');
  }
  const evidence = readIncludingComments('src/oracles/expectations/extract/evidence.ts');
  if (!/PHP_ITEM_FIELD_TYPE_FLOW/.test(evidence) || !/unsupported-extraction-kind/.test(evidence)) {
    fail('evidence digest must bind the type-flow extraction and fail closed on unknown kinds');
  }
  const admission = readIncludingComments('src/oracles/expectations/admission.ts');
  if (!/TYPE_FLOW_AMBIGUOUS/.test(admission) || !/TYPE_FLOW_CONTRACT_MISMATCH/.test(admission)) {
    fail('admission lost the type-flow fail-closed vocabulary');
  }
  const resolver = readIncludingComments('src/oracles/expectations/resolver.ts');
  if (!/PHP_ITEM_FIELD_TYPE_FLOW/.test(resolver)) fail('resolver must re-extract the type-flow evidence');
  const corpus = readIncludingComments('corpus/phase10/source-fixture/phase10Fixtures.ts');
  if (!/real-source-expectation-recipe\.v2/.test(corpus)) fail('Phase 10 fixture corpus is missing v2 fixture recipes');
  const historical = readIncludingComments('corpus/phase10/historical/archivedV1Recipes.ts');
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
function checkPhase18PureCoreSeams() {
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
  if (replay && (!/SEMANTIC_REPLAY_FIDELITY_VERSION/.test(replay) || !/AMBIGUOUS_OCCURRENCE/.test(replay) || !/validateSemanticReplayFidelityReceipt/.test(replay))) {
    fail('Phase 18 replay core is missing versioned ambiguity/fidelity validation');
  }
  const coverage = readIncludingComments('src/core/portfolio/semanticCoverage.ts');
  if (coverage && (!/SEMANTIC_COVERAGE_VERSION/.test(coverage) || !/SOURCE_EVIDENCE_UNRESOLVED/.test(coverage) || !/deterministicDigest/.test(coverage))) {
    fail('Phase 18 coverage core is missing bounded currentness/explanation accounting');
  }
  const currentness = readIncludingComments('src/oracles/expectations/currentness.ts');
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
  const approved = readIncludingComments('src/oracles/expectations/recipes/registry.ts');
  const catalog = readIncludingComments('src/api/phase5/catalog.ts');
  const ownerScope = readIncludingComments('src/core/policy/ownerScope.ts');
  const selfDevCatalog = readIncludingComments('src/core/selfDev/adoptedCaseCatalog.generated.ts');
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
  const runner = readIncludingComments('tests/manual/phase10b-contained-dev-deep-semantic.ts');
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
  const launcher = readIncludingComments('bin/phase10b-launcher-args.mjs');
  if (!/no journey selector/.test(launcher) || !/no expectation selector/.test(launcher) || !/no target selector/.test(launcher) || !/--ui-url/.test(launcher)) {
    fail('Phase 10B launcher must reject journey/expectation/target/URL selectors');
  }
  const core = readIncludingComments('src/core/phase10b/deepAcceptance.ts');
  if (!/PHASE_10B_BLOCKED_DEEP_INVARIANT_NOT_OBSERVED/.test(core)) {
    fail('Phase 10B deep acceptance must fail closed when the deep invariant is N/A (root-only PASS is not deep validation)');
  }
  if (!/PHASE_10B_BLOCKED_DEEP_EXPECTATION_DRIFT/.test(core)) {
    fail('Phase 10B deep acceptance must fail closed when the resolved expectation lacks the deep type contract');
  }
  if (!/expectedInvariantTotalFor/.test(core)) {
    fail('Phase 10B must derive the expected invariant total from the resolved expectation');
  }
  const phase9bRunner = readIncludingComments('tests/manual/phase9b-contained-dev-semantic.ts');
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
    const source = readIncludingComments(file);
    if (/import\s+[^;]*from\s+['"][^'"]*(?:node:fs|node:http|node:https|node:net|node:dns|node:fetch|undici|WebSocket|child_process|aiReview|selfDev|selfDevPromotion|selfDevSandbox|phase6|database|infrastructure|dynamo|bigquery|spanner|kubectl|gcloud|playwright|runRecorder|storage)[^'"]*['"]/i.test(source)) {
      fail(`${file} imports a forbidden fs/network/process/AI/selfDev/Phase6/persistence/authority module`);
    }
    if (/\b(?:eval\s*\(|new\s+Function\s*\(|child_process|spawn\s*\(|(?<!\.)exec(?:File)?\s*\(|writeFile|appendFile|createWriteStream|mkdirSync|rmSync|unlinkSync|renameSync|fetch\s*\(|node:fs)\b/i.test(source)) {
      fail(`${file} exposes a code-execution, process, network, or persistence capability`);
    }
  }
}

function checkPhase12TriageIntegrationSeams() {
  const evidence = readIncludingComments('src/core/triage/semanticTriageEvidence.ts');
  if (!/nightwatch\.semantic-triage-evidence\.v1/.test(evidence)) fail('semantic triage evidence missing version');
  if (!/MISSING_EVIDENCE_VOCABULARY/.test(evidence)) fail('semantic triage evidence missing vocabulary');
  const confidence = readIncludingComments('src/core/triage/semanticConfidence.ts');
  if (!/rankSemanticConfidence/.test(confidence)) fail('semantic confidence missing rank function');
  if (!/SAFETY_NONZERO/.test(confidence) || !/PRIVACY_FAILURE/.test(confidence) || !/KNOWN_FALSE_POSITIVE/.test(confidence)) fail('semantic confidence missing mandatory blockers');
  const v2 = readIncludingComments('src/core/triage/dossierV2.ts');
  if (!/nightwatch\.bug-dossier\.private\.v2/.test(v2)) fail('dossier v2 missing version');
  if (!/isReadySemanticDossier/.test(v2)) fail('dossier v2 missing READY predicate');
  if (!/humanReproductionRecipe/.test(v2)) fail('dossier v2 missing human recipe');
  // v1 must remain readable: dossier.ts still exports createBugDossier/validateBugDossier
  const dossier = readIncludingComments('src/core/triage/dossier.ts');
  if (!/DOSSIER_VERSION/.test(dossier) || !/validateBugDossier/.test(dossier)) fail('dossier v1 compatibility lost');
  const coverage = readIncludingComments('src/oracles/expectations/coverageInventory.ts');
  if (!/buildCoverageInventory/.test(coverage)) fail('coverage inventory missing builder');
  if (!/APPROVED_AND_ADMITTED_COLLECTION/.test(coverage) || !/APPROVED_NOT_ADMITTED_AMBIGUOUS/.test(coverage) || !/APPROVED_NOT_OBSERVABLE/.test(coverage)) fail('coverage inventory missing disposition vocabulary');
  if (!/TYPE_FLOW_AMBIGUOUS/.test(coverage)) fail('coverage inventory missing depth-uplift blocker');
  if (!/snapshotMatchesRemote/.test(coverage)) fail('coverage inventory missing remote/snapshot match flag');
  const cluster = readIncludingComments('src/oracles/semantic/cluster.ts');
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
    const source = readIncludingComments(file);
    if (/from\s+['"][^'"]*(?:node:fs|node:child_process|node:net|node:http|node:https|node:dns|undici|playwright|browser|runRecorder|storageState|database|dynamo|bigquery|spanner|kubernetes|gcloud|aws|selfDev|persistence)[^'"]*['"]/i.test(source)) fail(`${file} imports an authority or external capability`);
    if (/\b(?:process\.env|fetch\s*\(|WebSocket\s*\(|child_process|spawn\s*\(|exec(?:File)?\s*\(|writeFile|appendFile|createWriteStream|mkdirSync|rmSync|unlinkSync|renameSync|Date\.now\s*\(|Math\.random\s*\(|eval\s*\(|new\s+Function\s*\()\b/i.test(source)) fail(`${file} exposes runtime, process, network, clock, randomness, or persistence authority`);
  }
  const firewall = readIncludingComments('src/oracles/semantic/phase22Firewall.ts');
  if (!/guardPhase22SafeObservation/.test(firewall) || !/createPhase22PrivacyReceipt/.test(firewall) || /rawText|rawBody|responseBody/.test(firewall)) fail('Phase 22 runtime privacy firewall is missing or accepts raw payload fields');
}

function checkPhase22IntegrationSeams() {
  const types = readIncludingComments('src/core/phase22/types.ts');
  if (!/nightwatch\.dev-semantic-acceptance-manifest\.v1/.test(types) || !/maxTargets: 6/.test(types) || !/maxObservationContexts: 12/.test(types)) fail('Phase 22 manifest bounds/version are missing');
  if (!/PHASE22_REQUIRED_PREFLIGHT_CHECKS/.test(types) || !/l0_cdp_guard_active/.test(types) || !/l5_loopback_proxy_active/.test(types)) fail('Phase 22 preflight V2 check vocabulary is incomplete');
  const manifest = readIncludingComments('src/core/phase22/manifest.ts');
  if (!/selectEligible/.test(manifest) || !/TARGET_BOUND_OR_MATERIAL_DIVERSITY/.test(manifest) || !/frozen: true/.test(manifest)) fail('Phase 22 manifest is not deterministic/frozen/bounded');
  const replay = readIncludingComments('src/core/phase22/replay.ts');
  if (!/replayObservationCount > budget\.firstObservationCount/.test(replay) || !/retryCount !== 0/.test(replay) || !/REAL_MINIMIZATION_NOT_AUTHORIZED/.test(replay)) fail('Phase 22 replay/minimization bounds are incomplete');
  const confidence = readIncludingComments('src/core/phase22/calibration.ts');
  if (!/REAL_SOURCE_NOT_CURRENT/.test(confidence) || !/REAL_EXPECTATION_NOT_RESOLVED/.test(confidence) || !/realGatePassed/.test(confidence)) fail('Phase 22 real confidence gate is incomplete');
  const network = readIncludingComments('src/browser/observers/networkObserver.ts');
  if (!/guardPhase22SemanticHookResult/.test(network) || !/phase22PrivacyReceiptLedger/.test(network) || !/phase22PrivacyReceipts/.test(network)) fail('Phase 22 privacy firewall is not attached to the network observer');
  const launcher = readIncludingComments('bin/phase22-real.mjs');
  if (/\.\.\.process\.env/.test(launcher) || /stdio:\s*['"]inherit['"]/.test(launcher) || !/NIGHTWATCH_PHASE_22_REAL/.test(launcher) || !/args\.env !== 'dev'/.test(launcher) || !/EXACT_GREEN_CI_RUN_ID_REQUIRED/.test(launcher)) fail('Phase 22 launcher boundary is incomplete');
  if (!/maxBuffer\s*:/.test(launcher) || !/timeout\s*:/.test(launcher) || !/--config=playwright\.phase22\.config\.ts/.test(launcher)) fail('Phase 22 launcher lacks bounded child execution');
  const cli = readIncludingComments('bin/phase22-dev.mjs');
  if (!/DYNAMIC_ALL_FORBIDDEN/.test(cli) || !/simulatePhase22DevAcceptance/.test(cli) || !/EXPLICIT_EXECUTE_REQUIRED/.test(cli)) fail('Phase 22 local operator surface is missing dry-run/explicit-execute guards');
  const packageJson = readIncludingComments('package.json');
  for (const script of ['dev-preflight', 'dev-manifest', 'dev-acceptance', 'dev-results', 'dev-explain']) if (!packageJson.includes(`"${script}"`)) fail(`Phase 22 operator script missing: ${script}`);
}

function checkC00WorkspaceIntegrity() {
  // C-00 concurrency and workspace hardening. The inspection core stays
  // read-only and importable by the continuity checker; every mutation lives
  // in the session CLI; the session CLI never rewrites shared history.
  const core = readIncludingComments('bin/workspace-integrity.mjs');
  const mutationRe = /(?:fs|node:fs)[\s\S]{0,80}?\b(?:writeFile|writeFileSync|appendFile|appendFileSync|rename|renameSync|chmod|chmodSync|mkdir|mkdirSync|rm|rmSync|unlink|unlinkSync|createWriteStream)\b/;
  if (mutationRe.test(core)) fail('bin/workspace-integrity.mjs must stay read-only (no filesystem mutation)');
  if (/from 'node:(?:net|http|https|dns|tls)'/.test(core) || /\bfetch\s*\(/.test(core)) fail('bin/workspace-integrity.mjs must not open a network surface');
  if (/shell\s*:\s*true|stdio\s*:\s*['"]inherit['"]|(?<!\.)\bexec(?:File)?\s*\(/.test(core)) fail('bin/workspace-integrity.mjs exposes shell-capable or unbounded child execution');
  if (!/timeout:/.test(core) || !/maxBuffer:/.test(core)) fail('bin/workspace-integrity.mjs lacks bounded child execution');
  for (const invariant of ['WORKSPACE_FORBIDDEN_INDEX_FLAG', 'WORKSPACE_EXCLUDE_DRIFT', 'WORKSPACE_UNEXPECTED_HOOK', 'WORKSPACE_UNOWNED_SESSION_WORKTREE', 'WORKSPACE_UNDECLARED_TRACKED_DELETION', 'WORKSPACE_CANONICAL_DIRTY_WHILE_SESSION_LIVE']) {
    if (!core.includes(invariant)) fail(`C-00 hygiene invariant missing from the inspection core: ${invariant}`);
  }
  if (!/skipWorktreeTags/.test(core) || !/ASSUME_UNCHANGED/.test(core)) fail('C-00 index-flag invariant must reject skip-worktree and assume-unchanged explicitly');
  const session = readIncludingComments('bin/nightwatch-session.mjs');
  if (/--force|--force-with-lease|push\s+--force|'rebase'|'--hard'|clean',\s*'-fd|'stash'/.test(session)) fail('bin/nightwatch-session.mjs must never force-push, rebase, hard-reset, clean, or stash');
  if (!/HEAD:refs\/heads\//.test(session)) fail('bin/nightwatch-session.mjs must integrate by pushing the session branch, never by checking out the canonical branch');
  if (!/SESSION_ALREADY_OWNED/.test(session) || !/SESSION_OWNER_STALE/.test(session) || !/flag: 'wx'/.test(session)) fail('bin/nightwatch-session.mjs must claim ownership with an exclusive create and distinguish live from stale owners');
  if (!/SESSION_REMOVE_REFUSED_LIVE_HOLDER/.test(session) || !/SESSION_REMOVE_REFUSED_UNMERGED/.test(session)) fail("bin/nightwatch-session.mjs must refuse to delete another session's live or unmerged work");
  if (!/SESSION_RECONCILE_CONFLICT/.test(session) || !/merge', '--abort/.test(session)) fail('bin/nightwatch-session.mjs must abort rather than silently resolve a reconcile conflict');
  const checker = readIncludingComments('bin/agent-state.mjs');
  if (!/from '\.\/workspace-integrity\.mjs'/.test(checker)) fail('bin/agent-state.mjs must consume the C-00 workspace inspection core');
  let policy;
  try {
    policy = JSON.parse(readIncludingComments('config/workspace-integrity.v1.json'));
  } catch {
    fail('config/workspace-integrity.v1.json must be valid JSON');
    return;
  }
  if (policy.schemaVersion !== 'nightwatch.workspace-integrity.v1') fail('C-00 workspace policy schema/version is invalid');
  if (!Array.isArray(policy.excludePolicy?.allowedEffectivePatterns) || policy.excludePolicy.allowedEffectivePatterns.length !== 0) fail('C-00 shared exclude policy must allow zero effective patterns');
  if (policy.hookPolicy?.allowedSuffix !== '.sample' || policy.hookPolicy?.requireUnsetHooksPath !== true) fail('C-00 hook policy must permit only samples and require core.hooksPath to be unset');
  if (policy.canonical?.mayHostImplementationSession !== false || policy.canonical?.requireCleanWhenSessionLive !== true) fail('C-00 canonical protection policy is weakened');
  const packageJson = readIncludingComments('package.json');
  for (const script of ['workspace:check', 'workspace:status', 'session:status', 'session:check']) {
    if (!packageJson.includes(`"${script}"`)) fail(`C-00 operator script missing: ${script}`);
  }
  if (!/"workspace:check"\s*:\s*"node bin\/workspace-integrity\.mjs check"/.test(packageJson)) fail('package.json must expose the fixed C-00 workspace checker entry point');
  // The synthetic file list moved out of the package script into a versioned
  // manifest, so this membership check follows it there. It must keep proving
  // MEMBERSHIP of the C-00 matrix, not merely that the string appears
  // somewhere: dropping the adversarial matrix out of the required campaign is
  // exactly the regression this guard exists to catch.
  const syntheticManifest = JSON.parse(readIncludingComments('config/synthetic-campaign.v1.json'));
  if (syntheticManifest?.schemaVersion !== 'nightwatch.synthetic-campaign.v1') fail('the synthetic campaign manifest schema is unsupported');
  const syntheticCampaignFiles = Array.isArray(syntheticManifest.files) ? syntheticManifest.files : [];
  if (!syntheticCampaignFiles.includes('tests/unit/workspaceIsolation.test.ts')) fail('the C-00 adversarial matrix must run inside the required synthetic campaign');
  if (!syntheticCampaignFiles.includes('tests/unit/l6Containment.test.ts')) fail('the L6 containment matrix must run inside the required synthetic campaign');
  if (syntheticManifest.execution?.workers !== 1 || syntheticManifest.execution?.retries !== 0 || syntheticManifest.execution?.serial !== true) {
    fail('the synthetic campaign must stay serial with zero retries');
  }
  if (!/"campaign:synthetic"\s*:\s*"node bin\/campaign-synthetic\.mjs"/.test(packageJson)) fail('package.json must expose the fixed synthetic campaign launcher entry point');
  const agents = readIncludingComments('AGENTS.md');
  if (!/ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY/.test(agents)) fail('AGENTS.md must state the C-00 session/worktree invariant');
  // C-00 consequence: `.gitignore`'s `node_modules/` rule does not match a
  // `node_modules` SYMLINK, so sharing an install between worktrees can be
  // tracked by an ordinary `git add -A`. A session worktree installs its own
  // dependencies; the dependency tree is never a tracked path.
  for (const file of gitFiles()) {
    if (/(?:^|\/)node_modules(?:\/|$)/.test(file)) fail(`dependency tree must never be tracked: ${file}`);
  }
  // C-00 consequence: a fixture must never write into a directory derived from
  // the checkout's own parent. In an out-of-tree session worktree that parent
  // is the session-worktree root, and stray directories there corrupt the
  // worktree inventory an operator reads.
  const storageStateTest = readIncludingComments('tests/unit/storageState.test.ts');
  if (/(?:mkdirSync|writeFileSync)\([^)]*\bWORKSPACE_ROOT\b|path\.join\(WORKSPACE_ROOT,/.test(storageStateTest)) {
    fail('tests/unit/storageState.test.ts must not write into the real workspace root; use a disposable synthetic root');
  }
  // C-00 consequence: a writing agent's worktree lives outside the workspace
  // tree, so the REPOSITORIES root must never be derived from this checkout's
  // own location. These two surfaces previously did exactly that and broke in
  // an isolated worktree.
  // C-05 adds `bin/change-intelligence.mjs`. It had the same defect and was
  // never covered: `resolve(nightwatchRoot, '../..')` resolved to
  // `$HOME/.nightwatch` from a session worktree, so every git call failed with
  // ENOENT and `npm run change:shadow` could not run there at all. No gate
  // group executes that script, so nothing reported it.
  for (const file of ['tests/unit/changeIntelligenceBacktest.test.ts', 'scenarios/ripple/local.smoke.ts', 'bin/change-intelligence.mjs']) {
    const source = readIncludingComments(file);
    if (!/DEFAULT_SIBLING_ROOT/.test(source)) fail(`${file} must resolve the repositories root through DEFAULT_SIBLING_ROOT`);
    if (/__dirname,\s*'\.\.\/\.\.\/\.\.'|__dirname,\s*'\.\.',\s*'\.\.',\s*'\.\.'/.test(source)) {
      fail(`${file} must not derive the repositories root from its own checkout location`);
    }
  }
  // NW-02. These two private stores had the same defect with worse
  // consequences: the exclusion set that keeps owner state out of Nightwatch
  // and sibling source was derived from module location, so a configured root
  // beneath canonical source was rejected from the canonical checkout and
  // ACCEPTED from a C-00 session worktree. The judgement now belongs to one
  // authority; these surfaces must consume it and must not recompute it.
  const topologyAuthority = 'src/core/policy/sourceTopology.ts';
  const topologySource = read(topologyAuthority);
  if (!/DEFAULT_SIBLING_ROOT/.test(topologySource)) {
    fail(`${topologyAuthority} must resolve the repositories root through DEFAULT_SIBLING_ROOT`);
  }
  if (!/SOURCE_TOPOLOGY_REPOSITORIES_ROOT_AMBIGUOUS/.test(topologySource)) {
    fail(`${topologyAuthority} must fail closed on an ambiguous repositories root`);
  }
  // The call form, not the identifier: a rule satisfied by the surviving
  // import line would pass while the actual call site was replaced.
  for (const [file, errorCode] of [
    ['src/core/policy/privateArtifacts.ts', 'PRIVATE_ARTIFACT_ROOT_INSIDE_REPOSITORY'],
    ['src/core/prodEvidence/productionFindingsStore.ts', 'PRODUCTION_ARTIFACT_ROOT_INSIDE_REPOSITORY'],
  ]) {
    const source = read(file);
    const call = new RegExp(`assertOutsideSourceTopology\\(\\s*root\\s*,\\s*'${errorCode}'`);
    if (!call.test(source)) {
      fail(`${file} must refuse a private root through assertOutsideSourceTopology(root, '${errorCode}', ...)`);
    }
    if (/__dirname/.test(source)) {
      fail(`${file} must not derive a path-safety decision from its own checkout location`);
    }
  }
}

/**
 * C-10 Workstream E — production privacy boundary isolation.
 *
 * design.md 6.5 "boundary isolation": the raw-to-safe projection/analyzer cone
 * must possess NO filesystem, networking, process or publication capability,
 * enforced mechanically rather than by developer convention, so a future
 * change cannot silently reintroduce an escape path. Raw bytes enter through
 * ONE bounded call-scoped reader.
 */
function checkC10ProductionPrivacyBoundary() {
  const coneDirectory = 'src/core/prodPrivacy/';
  const absoluteCone = path.join(root, coneDirectory);
  if (!fs.existsSync(absoluteCone)) {
    fail('C-10 production privacy cone src/core/prodPrivacy/ is missing');
    return;
  }
  const coneFiles = fs
    .readdirSync(absoluteCone)
    .filter((entry) => entry.endsWith('.ts'))
    .map((entry) => `${coneDirectory}${entry}`);
  if (coneFiles.length < 7) fail('C-10 production privacy cone source files are missing');

  for (const file of coneFiles) {
    const source = readIncludingComments(file);
    // No filesystem, transport, process, publication or output-destination import.
    if (/import\s+[^;]*from\s+['"][^'"]*(?:node:fs|node:http|node:https|node:net|node:dgram|node:dns|node:tls|node:child_process|child_process|undici|node-fetch|axios|playwright|@playwright|aiReview|selfDev|phase6|privateArtifacts|prodEvidence|runRecorder|controlCenter|proxy\/)[^'"]*['"]/i.test(source)) {
      fail(`${file} imports a forbidden filesystem/network/process/publication module (C-10 boundary isolation)`);
    }
    // No capability reference even without an import (require, dynamic import,
    // global fetch, an environment-derived output destination).
    if (/(?<![.\w])(?:require\s*\(|child_process|spawn\s*\(|exec(?:File)?\s*\(|fetch\s*\(|writeFile|appendFile|readFile|createWriteStream|createReadStream|mkdirSync|renameSync|unlinkSync|rmSync|openSync|PrivateArtifactStore|ProductionFindingsStore)/.test(source)) {
      fail(`${file} exposes a process, network, or persistence capability (C-10 boundary isolation)`);
    }
    if (/process\.env/.test(source)) {
      fail(`${file} must not derive an output destination from the environment (C-10 boundary isolation)`);
    }
    // node:crypto is the ONLY permitted node builtin, for the structural digest.
    for (const match of source.matchAll(/from\s+['"](node:[a-z_]+)['"]/g)) {
      if (match[1] !== 'node:crypto') {
        fail(`${file} imports the node builtin ${match[1]}; the C-10 cone permits node:crypto only`);
      }
    }
  }

  // Raw bytes enter through exactly one bounded, call-scoped reader.
  const types = readIncludingComments('src/core/prodPrivacy/types.ts');
  if (!/class RawEphemeralSource/.test(types) || !/toJSON\(\): never/.test(types)) {
    fail('C-10 raw bytes must enter through the single call-scoped RawEphemeralSource, which must refuse serialization');
  }
  const projector = readIncludingComments('src/core/prodPrivacy/projector.ts');
  if (!/source instanceof RawEphemeralSource/.test(projector)) {
    fail('C-10 projector must accept raw bytes only through RawEphemeralSource');
  }
  if (!/keyProvenanceRequirement/.test(projector) || !/isSourceProvenKey/.test(projector)) {
    fail('C-10 projector must decide key provenance through the source-proven vocabulary (F-14)');
  }

  // F-15: the two digest families must stay distinct and the structural family
  // must never ingest a value or an unproven key literal.
  const serializer = readIncludingComments('src/core/prodPrivacy/serializer.ts');
  if (!/PRODUCTION_STRUCTURAL_DIGEST_PREFIX/.test(serializer)) {
    fail('C-10 structural digest must use the distinct prodstruct: family (F-15)');
  }
  if (/encounterToken|numericEncounterRef/.test(serializer.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''))) {
    fail('C-10 canonical serializer must never write an ephemeral correlation label (F-15)');
  }
  const policy = readIncludingComments('src/core/prodPrivacy/policy.ts');
  if (!/durableValueDigest: 'ABSENT'/.test(policy)) {
    fail('C-10 production policy must record that no durable value digest exists (F-15)');
  }

  // Workstream F: the persistence firewall must be an independent re-validation
  // at the durable write, and the store must run it.
  const firewall = readIncludingComments('src/core/prodEvidence/firewall.ts');
  for (const required of ['ENCOUNTER_TOKEN_PRESENT', 'DYNAMIC_KEY_LITERAL_PRESENT', 'DIGEST_MISMATCH', 'UNKNOWN_SCHEMA_VERSION']) {
    if (!firewall.includes(required)) fail(`C-10 persistence firewall must reject ${required}`);
  }
  const store = readIncludingComments('src/core/prodEvidence/productionFindingsStore.ts');
  if (!/assertPersistableProductionEvidence/.test(store)) {
    fail('C-10 production store must re-validate through the persistence firewall at the durable write');
  }
  if (!/prod-findings/.test(store)) {
    fail('C-10 production store must use its own prod-findings namespace, never the DEV findings root');
  }
  if (/'\.nightwatch',\s*'findings'/.test(store)) {
    fail('C-10 production store must not resolve the DEV findings root');
  }

  // DEF-C10-5 / F-16: route identity must be decided by source-proven
  // vocabulary MEMBERSHIP, never by the shape regex alone. `ROUTE_TEMPLATE_RE`
  // admits any `[A-Za-z0-9._~-]+` segment, so it cannot tell `accounts` from
  // `481516234299`; relying on it let concrete customer identifiers reach
  // persisted evidence through the route field.
  const routeVocabulary = readIncludingComments('src/core/prodPrivacy/routeVocabulary.ts');
  if (!/isSourceProvenRoute/.test(routeVocabulary) || !/NO_PROVEN_ROUTE_VOCABULARY/.test(routeVocabulary)) {
    fail('C-10 route identity must be decided by a source-proven route vocabulary (DEF-C10-5)');
  }
  if (!/templates\.has\(/.test(routeVocabulary)) {
    fail('C-10 route provenance must be exact-set membership, not a syntactic judgement (DEF-C10-5)');
  }
  const evidenceModule = readIncludingComments('src/core/prodPrivacy/evidence.ts');
  if (!/assertSourceProvenRoute\(\s*request\.routeVocabulary/.test(evidenceModule)) {
    fail('C-10 evidence construction must assert source-proven route provenance (DEF-C10-5)');
  }
  if (!/routeProvenanceDigest/.test(evidenceModule)) {
    fail('C-10 persisted evidence must record route provenance (DEF-C10-5)');
  }
  if (!/assertSourceProvenRoute\(\s*this\.routeVocabulary/.test(store)) {
    fail('C-10 production store must re-check route membership at the durable write (DEF-C10-5)');
  }
  if (!/ROUTE_PROVENANCE_MISSING/.test(firewall)) {
    fail('C-10 persistence firewall must reject evidence lacking route provenance (DEF-C10-5)');
  }
  const parameterProvenance = readIncludingComments('src/core/prodPrivacy/parameterProvenance.ts');
  if (!/assertSourceProvenRoute\(\s*routeVocabulary/.test(parameterProvenance)) {
    fail('C-10 assertRouteTemplateOnly must require route provenance, not shape alone (DEF-C10-5)');
  }
  const audit = readIncludingComments('src/core/prodEvidence/persistenceAudit.ts');
  if (!/provenRouteTemplates/.test(audit)) {
    fail('C-10 persistence audit must flag a persisted route outside the proven set (DEF-C10-5)');
  }

  // F-18: the Control Center findings authority must be structurally excluded
  // from the production store, on EVERY construction route including the seam.
  const authority = readIncludingComments('src/controlCenter/authorities/findingsAuthority.ts');
  if (!/assertNotProductionFindingsRoot/.test(authority)) {
    fail('Control Center findings authority must assert the C-10 production exclusion (F-18)');
  }
  const seam = authority.slice(authority.indexOf('export function createFindingsAuthorityForTests'));
  if (!/assertDevFindingsRoot/.test(seam)) {
    fail('the Control Center test-only findings seam must also refuse the production root (F-18)');
  }
  const exclusion = readIncludingComments('src/core/prodEvidence/controlCenterExclusion.ts');
  if (!/realpathSync/.test(exclusion)) {
    fail('C-10 Control Center exclusion must use resolved-path equivalence, not string comparison (F-18)');
  }
}

/**
 * C-10.5 (A3-A8) — production vocabulary AUTHORITY boundary.
 *
 * C-10 left the minting side of the route/key provenance boundary unowned: a
 * caller could assert a provenance class, supply any shape-valid
 * `ev:sha256:<24 hex>` digest and arbitrary members, and receive a
 * `SOURCE_PROVEN_*` capability. C-10.5 moved authority to trusted derivation.
 * These invariants keep it there — "only the adapter mints" must be a gate,
 * not a convention.
 */
function checkC105ProvenanceAuthorityBoundary() {
  const authority = readIncludingComments('src/core/prodPrivacy/vocabularyAuthority.ts');

  // The runtime brand must be a module-private WeakSet. If it were exported in
  // any form, arbitrary code could register a forged object and the A6
  // JSON-revival refusal would collapse.
  if (!/const MINTED = new WeakSet<object>\(\)/.test(authority)) {
    fail('C-10.5 vocabulary authority must brand capabilities with a module-private WeakSet');
  }
  if (/export\s+(?:const\s+MINTED|function\s+mintedRegistry|\{[^}]*\bMINTED\b)/.test(authority)) {
    fail('C-10.5 the minted-capability registry must never be exported (runtime brand integrity)');
  }

  // Identity must be COMPUTED. A digest parameter anywhere in the mint would
  // restore the forgery the campaign closed.
  if (!/function computeProvenanceDigest\(evidence: ValidatedSourceEvidence\): string/.test(authority)) {
    fail('C-10.5 provenance identity must be computed from validated evidence');
  }
  if (/provenanceDigest\s*:\s*string;?\s*(?:\/\/[^\n]*)?\n[^}]*\}\s*\)\s*:\s*MintedProvenance/.test(authority)) {
    fail('C-10.5 the mint must not accept a caller-supplied provenance digest');
  }
  for (const required of [
    'EVIDENCE_INVENTORY_INCOMPLETE',
    'EVIDENCE_CURRENCY_UNPROVEN',
    'EVIDENCE_SOURCE_IDENTITY',
    'EVIDENCE_REPOSITORY_UNAPPROVED',
    'EVIDENCE_CLASS_MISMATCH',
    'CAPABILITY_NOT_MINTED',
    'CAPABILITY_TEST_ONLY',
  ]) {
    if (!authority.includes(required)) {
      fail(`C-10.5 vocabulary authority must fail closed with ${required}`);
    }
  }
  // Only a COMPLETE inventory may grant authority.
  if (!/evidence\.inventoryState !== 'COMPLETE'/.test(authority)) {
    fail('C-10.5 an incomplete source inventory must deny authority');
  }
  // A generated artifact must be provably CURRENT.
  if (!/qualifier === 'GENERATED_ARTIFACT' && evidence\.currencyState !== 'CURRENT'/.test(authority)) {
    fail('C-10.5 stale or unknown generated evidence must deny authority');
  }

  // Consumption must require the brand, not the shape.
  const routeVocabulary = readIncludingComments('src/core/prodPrivacy/routeVocabulary.ts');
  const keyVocabulary = readIncludingComments('src/core/prodPrivacy/keyVocabulary.ts');
  if (!/if \(!isMintedCapability\(source\)\) return false;/.test(routeVocabulary)) {
    fail('C-10.5 route provenance must require a minted capability, not a matching shape');
  }
  if (!/if \(!isMintedCapability\(source\)\) return false;/.test(keyVocabulary)) {
    fail('C-10.5 key provenance must require a minted capability, not a matching shape');
  }
  if (!/assertProductionVocabularyAuthority\(source\)/.test(routeVocabulary)) {
    fail('C-10.5 production route authority must refuse an unminted or TEST_ONLY capability');
  }
  // The KEY side must be guarded SYMMETRICALLY at the persistence boundary.
  // The guard existed but had no call site, so a TEST_ONLY key vocabulary —
  // genuinely minted, hence a member for `isSourceProvenKey` — carried an
  // arbitrary key literal into persisted evidence through provenFields[].name.
  if (!/assertProductionKeyVocabularyAuthority\(source: KeyVocabularySource\)/.test(keyVocabulary)) {
    fail('C-10.5 the key vocabulary must expose a production authority guard');
  }
  const evidenceAuthority = readIncludingComments('src/core/prodPrivacy/evidence.ts');
  if (!/assertProductionKeyVocabularyAuthority\(vocabulary\)/.test(evidenceAuthority)) {
    fail('C-10.5 evidence construction must require PRODUCTION key vocabulary authority (dead-guard regression)');
  }
  if (!/assertSourceProvenRoute\(\s*request\.routeVocabulary/.test(evidenceAuthority)) {
    fail('C-10.5 evidence construction must require route provenance');
  }

  // The cone's public surface must NOT re-export the mint. A wildcard
  // re-export of the vocabulary modules would put a `'PRODUCTION'` marker
  // argument within reach of every importer of the cone.
  const coneIndex = read('src/core/prodPrivacy/index.ts');
  for (const wildcard of ["export * from './keyVocabulary'", "export * from './routeVocabulary'", "export * from './vocabularyAuthority'"]) {
    if (coneIndex.includes(wildcard)) {
      fail(`C-10.5 the cone public surface must not wildcard-re-export the mint (${wildcard})`);
    }
  }
  for (const minted of ['deriveProvenRouteVocabulary', 'deriveProvenKeyVocabulary', 'mintProvenance']) {
    if (new RegExp(`\\b${minted}\\b`).test(coneIndex)) {
      fail(`C-10.5 ${minted} must not appear on the cone public surface`);
    }
  }

  // The derivation adapter must live OUTSIDE the pure cone (A8).
  if (!fs.existsSync(path.join(root, 'src/core/prodProvenance'))) {
    fail('C-10.5 the source-evidence derivation adapter src/core/prodProvenance/ is missing');
  }

  // Only the trusted adapter and the cone itself may reach the mint.
  const MINT_NAMES = ['deriveProvenRouteVocabulary', 'deriveProvenKeyVocabulary', 'mintProvenance'];
  const ALLOWED_MINT_IMPORTERS = /^src\/core\/(?:prodProvenance|prodPrivacy)\//;
  for (const file of gitFiles()) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
    if (ALLOWED_MINT_IMPORTERS.test(file)) continue;
    const source = read(file);
    for (const name of MINT_NAMES) {
      // An IMPORT of the mint, not a mere mention (tests may name it in prose).
      if (new RegExp(`import[^;]*\\b${name}\\b[^;]*from`).test(source)) {
        fail(`${file} imports the C-10.5 mint ${name}; only src/core/prodProvenance/** may mint production authority`);
      }
    }
  }

  // The TEST-ONLY seam must be reachable from tests only.
  const seamPath = 'src/core/prodProvenance/testOnlySeam.ts';
  const seamSource = readIncludingComments(seamPath);
  if (!/TEST ONLY\. NOT A PRODUCTION AUTHORITY PATH\./.test(seamSource)) {
    fail('C-10.5 the test-only vocabulary seam must be explicitly branded TEST ONLY');
  }
  for (const file of gitFiles()) {
    if ((!file.endsWith('.ts') && !file.endsWith('.tsx')) || file === seamPath) continue;
    if (file.startsWith('tests/')) continue;
    const source = read(file);
    if (/from\s+['"][^'"]*prodProvenance\/testOnlySeam['"]/.test(source)) {
      fail(`${file} imports the C-10.5 TEST-ONLY vocabulary seam; only tests/** may import it`);
    }
  }
  const provenanceIndex = read('src/core/prodProvenance/index.ts');
  if (/testOnlySeam/.test(provenanceIndex)) {
    fail('C-10.5 the provenance derivation surface must not re-export the TEST-ONLY seam');
  }

  // The PHP route adapter must stay fail-closed: C-06 admits no production
  // route today, and C-10.5 must not invent completeness to manufacture one.
  const routeDerivation = readIncludingComments('src/core/prodProvenance/routeVocabularyDerivation.ts');
  if (!/PHP_ROUTE_PROOF_UNAVAILABLE/.test(routeDerivation)) {
    fail('C-10.5 PHP route derivation must fail closed while C-06 admits no production route');
  }
}

/**
 * R-11 proxy/gate reliability invariants (OBS-C105-1).
 *
 * Two mechanisms are protected here. First, the port allocator's PRODUCTION
 * path must keep using the real operating-system availability probe: R-11
 * introduced an injectable availability predicate so the adversarial lease
 * cases could be deterministic, and that seam would be worth nothing — worse
 * than nothing — if production could reach it. Second, the authoritative gate
 * must keep persisting its receipt to a confined path, because OBS-C105-1's
 * failing-group detail was destroyed by a filter over the single stdout copy.
 *
 * Every rule below is negative-probed by
 * `tests/unit/gateReceiptPersistence.test.ts`, so none of them is a regex that
 * merely happens to match.
 */
function checkR11ProxyGateReliability() {
  const lease = readIncludingComments('src/proxy/portLease.ts');
  const leaseSource = withoutComments(lease);

  // The production entry must bind the REAL probe, and must not take an
  // availability parameter that a caller could substitute.
  if (!/export function reserveProxyPortLease\(options:\s*\{\s*root\?:\s*string;\s*preferredPort:\s*number\s*\}\)/.test(leaseSource)) {
    fail('R-11 reserveProxyPortLease must accept only { root?, preferredPort }; an availability parameter would let a caller bypass the real OS probe');
  }
  if (!/return reserveWithAvailability\([^)]*\bportAvailable\)/.test(leaseSource)) {
    fail('R-11 reserveProxyPortLease must pass the real portAvailable probe to the allocator core');
  }
  // The real probe must remain a real TCP bind rather than a stub.
  if (!/function portAvailable\(/.test(leaseSource) || !/net\.createServer\(\)/.test(leaseSource) || !/s\.listen\(/.test(leaseSource)) {
    fail('R-11 portAvailable must retain a real loopback TCP bind probe');
  }
  // Allocator safety properties R-11 must not have weakened.
  for (const [pattern, message] of [
    [/fs\.openSync\(file,\s*'wx',\s*0o600\)/, 'exclusive lease creation with owner-only mode'],
    [/if \(processAlive\(existing\.pid\)\) continue;/, 'live-owner detection at the reclaim decision itself — the bare call name also occurs in the inherited-lease branch, so it must be anchored to this call site'],
    [/PROXY_PORT_LEASE_EXHAUSTED/, 'bounded search exhaustion'],
    [/const CANDIDATE_COUNT = \d+;/, 'a fixed bounded candidate count'],
    [/fs\.lstatSync\(file\)/, 'lstat-based lease inspection so a symlink is never followed'],
    [/current\?\.token === token/, 'token ownership on release'],
  ]) if (!pattern.test(leaseSource)) fail(`R-11 the port allocator must retain ${message}`);

  // The TEST-ONLY availability seam must be branded and unreachable from
  // anything but tests/**.
  if (!/TEST ONLY\. NOT A PRODUCTION AUTHORITY PATH\./.test(lease)) {
    fail('R-11 the injectable availability seam must be explicitly branded TEST ONLY');
  }
  const seamName = 'reserveProxyPortLeaseWithAvailabilityForTest';
  for (const file of gitFiles()) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
    if (file === 'src/proxy/portLease.ts' || file.startsWith('tests/')) continue;
    if (new RegExp(seamName).test(read(file))) {
      fail(`${file} references the R-11 TEST-ONLY availability seam; only tests/** may use it`);
    }
  }

  // No proxy test may reintroduce a probabilistic port choice. This is the
  // exact defect OBS-C105-1 was: a PID-derived port asserted as a guarantee.
  for (const file of gitFiles()) {
    if (!/^tests\/unit\/(?:phase2[34].*|proxy).*\.test\.ts$/i.test(file)) continue;
    const source = read(file);
    for (const [pattern, message] of [
      [/\bMath\.random\(\)/, 'Math.random()'],
      [/\bDate\.now\(\)\s*[%+*]/, 'a Date.now()-derived port'],
      [/(?:preferred|port)\w*\s*=\s*[^;\n]*process\.pid/i, 'a process.pid-derived port'],
    ]) if (pattern.test(source)) {
      fail(`${file} selects a proxy port using ${message}; R-11 forbids probabilistic port selection in proxy tests`);
    }
  }

  // Durable gate receipts.
  const receiptLib = readIncludingComments('bin/lib/gate-receipt.mjs');
  const runner = readIncludingComments('bin/quality-gate.mjs');
  const clean = readIncludingComments('bin/quality-gate-clean.mjs');

  for (const code of [
    'GATE_RECEIPT_PATH_NOT_ABSOLUTE', 'GATE_RECEIPT_PATH_TRAVERSAL', 'GATE_RECEIPT_PATH_INSIDE_REPOSITORY',
    'GATE_RECEIPT_PATH_UNCONFINED', 'GATE_RECEIPT_PATH_PARENT_SYMLINK', 'GATE_RECEIPT_PATH_DESTINATION_SYMLINK',
    'GATE_RECEIPT_FILE_MALFORMED', 'GATE_RECEIPT_STALE_HEAD',
  ]) if (!receiptLib.includes(code)) fail(`R-11 the gate-receipt module must retain the fail-closed code ${code}`);
  // Confinement, not merely validation: an unconfined absolute path would let
  // the gate write anywhere the process can reach.
  if (!/function gateReceiptPermittedRoots\(/.test(receiptLib) || !/os\.tmpdir\(\)/.test(receiptLib)) {
    fail('R-11 the gate-receipt module must confine receipt destinations to permitted temporary roots');
  }
  // Atomicity: exclusive create, fsync, rename. A plain writeFileSync would let
  // a reader observe a truncated receipt.
  if (!/fs\.openSync\(temporary,\s*'wx',\s*0o600\)/.test(receiptLib) || !/fs\.fsyncSync\(/.test(receiptLib) || !/fs\.renameSync\(temporary,\s*file\)/.test(receiptLib)) {
    fail('R-11 receipt persistence must be an exclusive-create, fsync, atomic-rename write');
  }

  if (!/resolveGateReceiptTarget\(\{\s*repositoryRoot: root/.test(runner)) {
    fail('R-11 the quality gate must resolve and validate its receipt destination against the repository root');
  }
  // Validation must precede execution, so an unsafe path costs no test time and
  // is never discovered only after the evidence already exists.
  if (runner.indexOf('resolveGateReceiptTarget(') > runner.indexOf('for (const group of definition.groups)')) {
    fail('R-11 the quality gate must validate its receipt destination BEFORE running any group');
  }
  // One canonical string reaches both destinations, so stdout and file cannot drift.
  if (!/function emitReceipt\(/.test(runner) || !/const canonicalBytes = JSON\.stringify\(receipt\);/.test(runner) || !/console\.log\(canonicalBytes\)/.test(runner) || !/persistGateReceipt\(target\.file, canonicalBytes\)/.test(runner)) {
    fail('R-11 the quality gate must emit ONE canonical receipt string to both stdout and the persisted file');
  }
  if ((runner.match(/console\.log\(/g) ?? []).length !== 1) {
    fail('R-11 the quality gate must write nothing but the receipt to stdout');
  }
  // Anchored to the list, not the bare name: the identifier also appears in the
  // import statement, so an unanchored match stays true with the entry deleted.
  if (!/FORBIDDEN_ENVIRONMENT_KEYS = Object\.freeze\(\[[\s\S]{0,800}?GATE_RECEIPT_PATH_ENV,[\s\S]{0,200}?\]\);/.test(runner) || !/for \(const key of FORBIDDEN_ENVIRONMENT_KEYS\) delete environment\[key\];/.test(runner)) {
    fail('R-11 the quality gate must strip the receipt-path variable from child environments so a child cannot overwrite the run receipt');
  }
  if (!/RECEIPT_PERSISTENCE_FAILED/.test(runner)) {
    fail('R-11 a receipt that cannot be persisted must fail the gate rather than pass quietly');
  }

  if (!/readPersistedGateReceipt\(receiptFile/.test(clean)) {
    fail('R-11 the clean-checkout gate must consume the structured receipt file rather than scraping stdout');
  }
  if (!/GATE_RECEIPT_DIGEST_MISMATCH/.test(clean)) {
    fail('R-11 the clean-checkout gate must fail closed when the file and stdout receipts disagree');
  }
  // The destination must live outside the disposable clone, or writing it would
  // dirty the very checkout the clean gate measures.
  if (!/mkdtempSync\(path\.join\(os\.tmpdir\(\), 'nightwatch-clean-gate-receipt-'\)\)/.test(clean)) {
    fail('R-11 the clean-checkout gate must place its inner receipt outside the disposable clone');
  }
}

/**
 * C-11 `PROD_OBSERVE` boundary invariants.
 *
 * The kernel's value is that production is unreachable unless every authority
 * grants it, so the rules that matter are the ones a future change could
 * silently break: the separation of the production decision path from the
 * DEV/NEXT one (F-11, F-12), the independence of the production allowlist from
 * the deny table (F-10), the external-only configuration (F-09), and D-4.
 *
 * Separation is a property of the IMPORT GRAPH, not of the entry point, so
 * these rules read imports rather than trusting a launcher boundary. Every one
 * is negative-probed.
 */
function checkC11ProdObserveBoundary() {
  const coneDirectory = 'src/core/prodObserve';
  const coneFiles = gitFiles().filter((file) => file.startsWith(`${coneDirectory}/`) && file.endsWith('.ts'));
  if (coneFiles.length === 0) {
    fail('C-11 the PROD_OBSERVE cone is missing');
    return;
  }

  // --- F-12: the production cone may not import the DEV/NEXT/real-run cones ---
  const forbiddenInProductionCone = [
    [/from\s+['"][^'"]*safety\/realRunGate['"]/, 'the generic real-run decision path'],
    [/from\s+['"][^'"]*safety\/hosts['"]/, 'the production deny table (F-10)'],
    [/from\s+['"][^'"]*safety\/canary['"]/, 'the DEV canary'],
    // Patterns must match a RELATIVE import too: `../phase22/manifest` is the
    // same module as `core/phase22/manifest`, and requiring the `core/` segment
    // let the relative form through.
    [/from\s+['"][^'"]*phase22\//, 'the DEV campaign orchestrator'],
    [/from\s+['"][^'"]*phase23\//, 'the DEV acceptance manifest'],
    [/from\s+['"][^'"]*\/environment(?:\/|['"])/, 'the DEV environment loader'],
    [/from\s+['"][^'"]*browser\//, 'the browser cone'],
    [/from\s+['"][^'"]*campaign\//, 'the campaign execution path'],
  ];
  for (const file of coneFiles) {
    const source = read(file);
    for (const [pattern, description] of forbiddenInProductionCone) {
      if (pattern.test(source)) fail(`${file} imports ${description}; the C-11 production cone must stay import-isolated from it`);
    }
    // No dispatcher anywhere in the cone: the kernel DECIDES and cannot contact
    // anything even if every gate were bypassed.
    for (const [pattern, description] of [
      [/from\s+['"]node:https?['"]/, 'an HTTP client'],
      [/from\s+['"]node:net['"]/, 'a socket client'],
      [/from\s+['"]node:dns['"]/, 'a DNS resolver'],
      [/\bfetch\s*\(/, 'fetch()'],
      [/storageState/, 'a storage-state path'],
    ]) if (pattern.test(source)) fail(`${file} contains ${description}; the C-11 production cone must contain no network or credential path`);
  }

  // --- F-12, the other direction: the DEV/NEXT cone may not import production policy ---
  for (const file of gitFiles()) {
    if (!file.endsWith('.ts') || file.startsWith('tests/') || file.startsWith(`${coneDirectory}/`)) continue;
    const source = read(file);
    if (/from\s+['"][^'"]*core\/prodObserve/.test(source)) {
      fail(`${file} imports the C-11 production authorization machinery; only the production cone and tests/** may reach it`);
    }
  }

  // --- F-11: realRunGate gains no production branch and no mode parameter ---
  const realRunGate = read('src/core/safety/realRunGate.ts');
  // Anchored to the DECLARATION and the guarded call site. The bare name
  // appears in both, so matching it alone stayed true when the declaration was
  // renamed away — the DEF-R11-1 vacuity class.
  if (!/function isProductionClassHost\(host: string\): boolean/.test(realRunGate)
    || !/if \(isProductionClassHost\(normalized\)\)/.test(realRunGate)) {
    fail('F-11: realRunGate must keep refusing production-class hosts at its guarded call site');
  }
  if (/PROD_OBSERVE|prodObserve|productionRunGate/.test(realRunGate)) {
    fail('F-11: realRunGate must gain no PROD_OBSERVE branch; the production decision belongs to a separate kernel');
  }
  if (/\bmode\s*[:?]/.test(realRunGate)) {
    fail('F-11: realRunGate must take no mode parameter; parameterizing it would destroy the DEV guard for every existing campaign');
  }

  // --- the chain is a named identity, not a count ---
  const types = readIncludingComments(`${coneDirectory}/types.ts`);
  if (!/PRODUCTION_ADMISSION_CHAIN_VERSION = 'nightwatch\.production-admission-chain\.v1'/.test(types)) {
    fail('C-11 the admission chain must be versioned');
  }
  // Anchored to the export, because the bare identifier is a prefix of any
  // renamed variant such as `HISTORICAL_GATE_MAPPING_REMOVED`.
  if (!/export const HISTORICAL_GATE_MAPPING:/.test(types)) {
    fail('C-11 the mapping from the historical G0-G11 identifiers must stay machine-checkable in source');
  }
  const gateBlock = /PRODUCTION_ADMISSION_GATES = \[([\s\S]*?)\] as const;/.exec(types);
  if (gateBlock === null) {
    fail('C-11 the ordered gate list must be a literal const array');
  } else {
    for (const gate of [
      'G_KILL_SWITCH_ENTRY', 'G_OWNER_AUTHORIZATION', 'G_AUTHORIZATION_CLASS', 'G_CONFIGURATION_INTEGRITY',
      'G_ORGANIZATION_WINDOW', 'G_OBSERVER_IDENTITY', 'G_SOURCE_CURRENCY', 'G_READ_ONLY_PROOF',
      'G_ROUTE_AUTHORITY', 'G_HOST_ADMISSION', 'G_ADDRESS_POLICY', 'G_METHOD_AND_BODY',
      'G_PARAMETER_PROVENANCE', 'G_PRIVACY_CAPABILITY', 'G_CONTAINMENT_READINESS', 'G_BUDGET_RESERVATION',
      'G_BREAKER_STATE', 'G_KILL_SWITCH_PREDISPATCH',
    ]) if (!gateBlock[1].includes(`'${gate}'`)) fail(`C-11 the admission chain is missing the required gate ${gate}`);
    // Configuration integrity supplies the window, so it must precede it or the
    // integrity gate becomes unfalsifiable.
    if (gateBlock[1].indexOf("'G_CONFIGURATION_INTEGRITY'") > gateBlock[1].indexOf("'G_ORGANIZATION_WINDOW'")) {
      fail('C-11 G_CONFIGURATION_INTEGRITY must precede G_ORGANIZATION_WINDOW: the window is read from the config');
    }
  }

  // --- the kill switch is evaluated twice, and the second time is pre-dispatch ---
  const gate = read(`${coneDirectory}/productionRunGate.ts`);
  if ((gate.match(/evaluateKillSwitch\(/g) ?? []).length < 2) {
    fail('C-11 the kill switch must be evaluated at qualification entry AND immediately before dispatch');
  }
  // Reserve BEFORE dispatch: the reservation must be taken inside the chain.
  if (!/input\.budget\.reserve\(/.test(gate)) {
    fail('C-11 the budget reservation must be taken inside the admission chain, before any dispatch');
  }
  // Route authority must delegate to the C-10.5 guard rather than re-deciding.
  if (!/assertSourceProvenRoute\(/.test(gate)) {
    fail('C-11 route authority must consume the C-10.5 source-bound guard');
  }
  // No default policy: a shared module that falls back is a silent allow.
  if (!/privacyPolicy: PrivacyPolicy \| null/.test(gate) || !/PRIVACY_CAPABILITY_ABSENT/.test(gate)) {
    fail('C-11 the privacy policy must be explicitly injected with no default, and a missing policy must deny');
  }

  // --- F-09: the observation config is external-only and never in-repo ---
  const config = read(`${coneDirectory}/observationConfig.ts`);
  for (const code of ['CONFIG_PATH_NOT_ABSOLUTE', 'CONFIG_INSIDE_REPOSITORY', 'CONFIG_INSIDE_WORKSPACE', 'CONFIG_SYMLINK', 'CONFIG_MODE_NOT_OWNER_ONLY']) {
    if (!config.includes(code)) fail(`C-11 the external observation config loader must retain the fail-closed code ${code}`);
  }
  for (const file of gitFiles()) {
    // An in-repo loadable production host list would substitute a naming
    // convention for D-4's structural property.
    if (/^config\/observation\//.test(file)) fail(`${file} is an in-repo production observation config; F-09 requires external-only`);
  }

  // --- D-4 stands ---
  const environment = read('src/core/environment/index.ts');
  if (!/SUPPORTED_ENVIRONMENTS: readonly EnvironmentName\[\] = \['local', 'dev', 'next'\]/.test(environment)) {
    fail('D-4: SUPPORTED_ENVIRONMENTS must remain exactly local, dev, next');
  }
  const decisions = readIncludingComments('docs/DECISIONS.md');
  if (!decisions.includes('## D-4 — Allowlist-only environments; `production.json` documents the rejected surface')
    || !decisions.includes('Only `local`, `dev`, `next` are selectable.')) {
    fail('D-4: the decision text must remain intact');
  }

}

/**
 * MA-8 / F-13 P1 observation-scope invariants.
 *
 * The P1 cone (`src/core/prodObserveP1/`) is a sibling of the C-11 cone, never
 * a member: C-11's boundary asserts its cone's contents and reverse-isolation,
 * so P1 lives beside it and this check guards both the P1 properties and the
 * absence of coupling in either direction.
 */
function checkP1ObservationScopeBoundary() {
  const coneDirectory = 'src/core/prodObserveP1';
  const coneFiles = gitFiles().filter((file) => file.startsWith(`${coneDirectory}/`) && file.endsWith('.ts'));
  if (coneFiles.length === 0) {
    fail('MA-8 the P1 observation-scope cone is missing');
    return;
  }

  // --- F-12: the P1 cone may not import the request, DEV/NEXT, browser, or campaign cones ---
  // Patterns must match a RELATIVE import too (the DEF-C11-3 vacuity class).
  const forbiddenInP1Cone = [
    [/from\s+['"][^'"]*prodObserve[^P][^'"]*['"]/, 'the C-11 request chain (F-12 both directions)'],
    [/from\s+['"][^'"]*\.\.\/prodObserve(\/[^'"]*)?['"]/, 'the C-11 request chain by relative import'],
    [/from\s+['"][^'"]*safety\/realRunGate['"]/, 'the generic real-run decision path'],
    [/from\s+['"][^'"]*phase22\//, 'the DEV campaign orchestrator'],
    [/from\s+['"][^'"]*phase23\//, 'the DEV acceptance manifest'],
    [/from\s+['"][^'"]*\/environment(?:\/|['"])/, 'the DEV environment loader'],
    [/from\s+['"][^'"]*browser\//, 'the browser cone'],
    [/from\s+['"][^'"]*campaign\//, 'the campaign execution path'],
  ];
  for (const file of coneFiles) {
    const source = read(file);
    for (const [pattern, description] of forbiddenInP1Cone) {
      if (pattern.test(source)) fail(`${file} imports ${description}; the P1 cone must stay import-isolated from it`);
    }
    // No dispatcher, navigator, actuator, or credential path anywhere in the
    // cone: the observer DECIDES and OBSERVES and cannot contact or mutate
    // anything even if every gate were bypassed.
    for (const [pattern, description] of [
      [/from\s+['"]node:https?['"]/, 'an HTTP client'],
      [/from\s+['"]node:net['"]/, 'a socket client'],
      [/from\s+['"]node:dns['"]/, 'a DNS resolver'],
      [/\bfetch\s*\(/, 'fetch()'],
      [/\.goto\(/, 'a navigation primitive'],
      [/\.click\(/, 'a click primitive'],
      [/storageState/, 'a storage-state path'],
      [/replayExecutor/i, 'a replay executor'],
    ]) if (pattern.test(source)) fail(`${file} contains ${description}; the P1 cone must contain no traffic, actuation, replay, or credential path`);
  }

  // --- F-12, the other direction: only the P1 cone, the offline rehearsal
  // cone, and tests may reach P1 machinery. The rehearsal cone is the single
  // authorized local consumer (FC-1): it drives the real admission/session/
  // attribution core against mock edges and is itself constrained by
  // checkC12RehearsalBoundary below. ---
  for (const file of gitFiles()) {
    if (!file.endsWith('.ts') || file.startsWith('tests/') || file.startsWith(`${coneDirectory}/`) || file.startsWith('src/core/c12Rehearsal/')) continue;
    const source = read(file);
    if (/from\s+['"][^'"]*core\/prodObserveP1/.test(source)) {
      fail(`${file} imports the P1 observation-scope machinery; only the P1 cone, src/core/c12Rehearsal/, and tests/** may reach it`);
    }
  }

  // --- the C-11 cone must not reach back into P1: no coupling either way ---
  for (const file of gitFiles()) {
    if (!file.endsWith('.ts') || !file.startsWith('src/core/prodObserve/')) continue;
    const source = read(file);
    if (/from\s+['"][^'"]*prodObserveP1/.test(source)) {
      fail(`${file} imports the P1 cone; C-11 stays decoupled from P1`);
    }
  }

  // --- the chain is a named identity, not a count ---
  const types = readIncludingComments(`${coneDirectory}/types.ts`);
  if (!/P1_OBSERVATION_SCOPE_CHAIN_VERSION = 'nightwatch\.p1-observation-scope\.v1'/.test(types)) {
    fail('MA-8 the P1 observation-scope chain must be versioned');
  }
  const gateBlock = /P1_OBSERVATION_SCOPE_GATES = \[([\s\S]*?)\] as const;/.exec(types);
  if (gateBlock === null) {
    fail('MA-8 the P1 ordered gate list must be a literal const array');
  } else {
    for (const gate of [
      'P1_KILL_SWITCH_ENTRY', 'P1_OWNER_AUTHORIZATION', 'P1_AUTHORIZATION_CLASS', 'P1_CONFIGURATION_INTEGRITY',
      'P1_IMPLEMENTATION_IDENTITY', 'P1_PQ_BINDING', 'P1_SUBJECT_PRESENCE', 'P1_SUBJECT_PROVENANCE',
      'P1_HOST_ADMISSION', 'P1_OBSERVATION_WINDOW', 'P1_OBSERVER_IDENTITY', 'P1_PRIVACY_CAPABILITY',
      'P1_EVIDENCE_DESTINATION', 'P1_ATTRIBUTION_CAPABILITY', 'P1_KILL_SWITCH_PREATTACH',
    ]) if (!gateBlock[1].includes(`'${gate}'`)) fail(`MA-8 the P1 observation-scope chain is missing the required gate ${gate}`);
    // Configuration integrity supplies the window AND the implementation
    // binding, so it must precede both or those gates become unfalsifiable
    // (the DEF-C11-1 / DEF-P1-1 class).
    if (gateBlock[1].indexOf("'P1_CONFIGURATION_INTEGRITY'") > gateBlock[1].indexOf("'P1_IMPLEMENTATION_IDENTITY'")) {
      fail('MA-8 P1_CONFIGURATION_INTEGRITY must precede P1_IMPLEMENTATION_IDENTITY: the binding is read from the config');
    }
    if (gateBlock[1].indexOf("'P1_CONFIGURATION_INTEGRITY'") > gateBlock[1].indexOf("'P1_OBSERVATION_WINDOW'")) {
      fail('MA-8 P1_CONFIGURATION_INTEGRITY must precede P1_OBSERVATION_WINDOW: the window is read from the config');
    }
  }
  // Per-gate denial codes stay confined: the map must cover every gate.
  if (!/export const P1_GATE_DENIAL_CODES: Readonly<\s*Record<P1ObservationScopeGate, readonly P1ObservationDenialCode\[\]>\s*>/.test(types)) {
    fail('MA-8 the P1 per-gate denial-code map must stay a total Record over the gate union');
  }

  // --- the kill switch is evaluated at entry, before attach, AND while attached ---
  const observer = read(`${coneDirectory}/observer.ts`);
  if ((observer.match(/evaluateP1KillSwitch\(/g) ?? []).length < 2) {
    fail('MA-8 the kill switch must be evaluated at P1 admission entry AND immediately before attach');
  }
  const session = read(`${coneDirectory}/session.ts`);
  if ((session.match(/evaluateP1KillSwitch\(/g) ?? []).length < 2) {
    fail('MA-8 the kill switch must be evaluated at attach AND on every observation poll');
  }

  // --- sessions are triply bounded, or a stalled observer runs forever ---
  if (!/P1_SESSION_BOUNDS_INVALID/.test(session) || !/maxEvents/.test(session) || !/maxPolls/.test(session)) {
    fail('MA-8 the P1 session must enforce event, poll, and deadline bounds with a categorical refusal');
  }

  // --- attribution fails closed: UNKNOWN and Nightwatch-attributable traffic never pass ---
  const attribution = read(`${coneDirectory}/attribution.ts`);
  for (const token of ['NIGHTWATCH_ATTRIBUTABLE', 'ATTRIBUTION_UNKNOWN', 'NIGHTWATCH_TRAFFIC_DETECTED', 'PASSIVE_OBSERVATION_COMPLETE', 'isP1SessionPass']) {
    if (!attribution.includes(token)) fail(`MA-8 the attribution model must retain ${token}`);
  }

  // --- F-09 for P1: the scope config is external-only and never in-repo ---
  const scopeConfig = read(`${coneDirectory}/scopeConfig.ts`);
  for (const code of ['P1_CONFIG_PATH_NOT_ABSOLUTE', 'P1_CONFIG_INSIDE_REPOSITORY', 'P1_CONFIG_INSIDE_WORKSPACE', 'P1_CONFIG_SYMLINK', 'P1_CONFIG_MODE_NOT_OWNER_ONLY', 'P1_CONFIG_HOST_INVALID', 'P1_CONFIG_DESTINATION_INVALID']) {
    if (!scopeConfig.includes(code)) fail(`MA-8 the external P1 scope config loader must retain the fail-closed code ${code}`);
  }
  for (const file of gitFiles()) {
    if (/^config\/p1scope\//.test(file)) fail(`${file} is an in-repo P1 scope config; F-09 requires external-only`);
  }

}
/**
 * AH-1 finding-handoff and C-12 readiness invariants.
 *
 * Two new pure cones: `src/core/alphausHandoff/` (BugDossier projection to a
 * human-review artifact) and `src/core/c12Readiness/` (local-only advisory
 * preflight). Both must stay import-isolated, transport-free, and free of
 * any external-submission or bounty-scoring surface.
 */
function checkAlphausHandoffBoundary() {
  const cones = ['src/core/alphausHandoff', 'src/core/c12Readiness'];
  for (const coneDirectory of cones) {
    const coneFiles = gitFiles().filter((file) => file.startsWith(`${coneDirectory}/`) && file.endsWith('.ts'));
    if (coneFiles.length === 0) {
      fail(`AH-1 the ${coneDirectory} cone is missing`);
      return;
    }
    for (const file of coneFiles) {
      const source = read(file);
      for (const [pattern, description] of [
        [/from\s+['"]node:(?:net|http|https|dns|child_process|fs|os|path|url|util|events|stream|worker_threads)[^'"]*['"]/, 'a network/process/filesystem runtime import (any subpath)'],
        [/from\s+['"]child_process[^'"]*['"]/, 'a bare child_process import (no node: prefix)'],
        [/import\s*\(\s*['"]node:[^'"]+['"]\s*\)/, 'a dynamic runtime import'],
        [/\brequire\s*\(\s*['"]/, 'a require() call'],
        [/\bundici\b|\bWebSocket\s*\(|\bXMLHttpRequest\s*\(/, 'a global transport constructor'],
        [/from\s+['"][^'"]*browser\//, 'the browser cone'],
        [/from\s+['"][^'"]*campaign\//, 'the campaign execution path'],
        [/from\s+['"][^'"]*auth\//, 'the auth cone'],
        [/from\s+['"][^'"]*prodObserveP1/, 'the P1 machinery (preflight/handoff stay decoupled; tests may still import P1)'],
        [/from\s+['"][^'"]*core\/prodObserve[^P]/, 'the C-11 request chain'],
        [/\bfetch\s*\(/, 'fetch()'],
        [/storageState/, 'a storage-state path'],
        [/from\s+['"][^'"]*(slack|leslie|pondr)[^'"]*['"]/i, 'an external submission import'],
        [/(Slack|Leslie|Pondr)(Client|Webhook|Api|API|Message|Ticket|Issue)|postTo(Slack|Leslie|Pondr)|file(Leslie|Pondr|Slack)Report|create(GitHub|Slack|Pondr)(Issue|Message|Task)/, 'an external submission connector'],
        [/expectedPoints|estimatedReward|rewardTier|bountyPoints|bountyScore|calculateBounty|bountyCalculator/i, 'a bounty-scoring surface'],
      ]) if (pattern.test(source)) fail(`${file} contains ${description}; the AH-1 cones must stay isolated from it`);
    }
  }
  const handoffTypes = read('src/core/alphausHandoff/types.ts');
  const handoff = read('src/core/alphausHandoff/handoff.ts');
  if (!handoff.includes('BugDossier')) fail('AH-1 the handoff must project the canonical BugDossier, not a parallel finding model');
  for (const token of ['nightwatch.alphaus-finding-handoff.v1']) {
    if (!handoff.includes(token) && !handoffTypes.includes(token)) fail(`AH-1 the handoff cone must retain ${token}`);
  }
  // Literal VALUES, not mere token presence: a dummy 'PROHIBITED' string
  // elsewhere must not satisfy this while the authority block is weakened.
  for (const literal of ['humanReviewRequired: true', 'executable: false', "externalPublication: 'PROHIBITED'", 'autoFile: false', 'autoApprove: false']) {
    if (!handoff.includes(literal)) fail(`AH-1 the handoff authority block must retain the literal ${literal}`);
  }
  const preflightTypes = read('src/core/c12Readiness/types.ts');
  const preflight = read('src/core/c12Readiness/preflight.ts');
  for (const token of ['BLOCKED_DEPLOYMENT_FACT', 'BLOCKED_OPERATOR_SUBJECT', 'nightwatch.c12-readiness.v1']) {
    if (!preflight.includes(token) && !preflightTypes.includes(token)) fail(`AH-1 the preflight cone must retain ${token}`);
  }
  if (/consumeP1ObserveGrant|issueP1ObserveGrant|loadP1ScopeConfig/.test(preflight)) {
    fail('AH-1 the preflight must inspect descriptors only; it never consumes grants or loads live scope configs');
  }
  for (const file of gitFiles()) {
    if (!file.endsWith('.ts') || file.startsWith('tests/') || file.startsWith('src/core/alphausHandoff/') || file.startsWith('src/core/c12Readiness/')) continue;
    const source = read(file);
    if (/from\s+['"][^'"]*core\/(alphausHandoff|c12Readiness)/.test(source)) {
      fail(`${file} imports AH-1 machinery; only the AH-1 cones and tests/** may reach it`);
    }
  }
}

/**
 * FC-1 C-12 offline-rehearsal invariants.
 *
 * `src/core/c12Rehearsal/` is the single authorized local consumer of the P1
 * machinery outside tests. The exception is narrow and itself checked: the
 * cone must stay transport/actuation-free, fixture-pinned to the synthetic
 * `.invalid` namespace, structurally incapable of conferring live
 * authorization, and decoupled from the c12Readiness/alphausHandoff cones
 * (version strings are deliberate literal duplicates, the F-12 discipline
 * the P1 cone documents in its own types.ts).
 */
/**
 * FC-2 declared-dependency resolvability.
 *
 * DEF-FC-03: the `vue` devDependency was removed as "unused" while
 * tests/unit/rippleReadiness.test.ts still reached it through
 * `require.resolve('vue/dist/vue.js')`. Stale node_modules residue in the
 * canonical checkout hid the break; only a fresh install failed. Import
 * scanners miss require.resolve, so the invariant is enforced here: every
 * bare module specifier reached from tracked source must be a declared
 * dependency. A dependency a test resolves is by definition used.
 */
function checkDeclaredDependencyResolvability() {
  const manifest = JSON.parse(readIncludingComments('package.json'));
  const declared = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ]);
  const specifierPattern = /(?:require\.resolve\(|import\(|\bfrom\s+)\s*['"]([^'"]+)['"]/g;
  for (const file of gitFiles()) {
    if (!file.endsWith('.ts') && !file.endsWith('.mjs')) continue;
    // ui/** is a separate workspace with its own manifest.
    if (file.startsWith('ui/')) continue;
    const source = read(file);
    for (const match of source.matchAll(specifierPattern)) {
      const specifier = match[1];
      if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('node:')) continue;
      // Template placeholders are not real specifiers.
      if (specifier.includes('${') || specifier.includes('\\')) continue;
      const packageName = specifier.startsWith('@')
        ? specifier.split('/').slice(0, 2).join('/')
        : specifier.split('/')[0];
      if (!declared.has(packageName)) {
        fail(`${file} resolves '${specifier}' but '${packageName}' is not a declared dependency; a package tracked source reaches is used and must stay declared`);
      }
    }
  }
}

function checkC12RehearsalBoundary() {
  const coneDirectory = 'src/core/c12Rehearsal';
  const coneFiles = gitFiles().filter((file) => file.startsWith(`${coneDirectory}/`) && file.endsWith('.ts'));
  if (coneFiles.length === 0) {
    fail('FC-1 the C-12 offline-rehearsal cone is missing');
    return;
  }
  for (const file of coneFiles) {
    const source = read(file);
    for (const [pattern, description] of [
      [/from\s+['"]node:(?:net|http|https|dns|child_process|fs|os|path|url|util|events|stream|worker_threads)[^'"]*['"]/, 'a network/process/filesystem runtime import (any subpath)'],
      [/from\s+['"]child_process[^'"]*['"]/, 'a bare child_process import (no node: prefix)'],
      [/import\s*\(\s*['"]node:[^'"]+['"]\s*\)/, 'a dynamic runtime import'],
      [/\brequire\s*\(\s*['"]/, 'a require() call'],
      [/\bfetch\s*\(/, 'fetch()'],
      [/\.goto\(/, 'a navigation primitive'],
      [/\.click\(/, 'a click primitive'],
      [/storageState/, 'a storage-state path'],
      [/from\s+['"][^'"]*browser\//, 'the browser cone'],
      [/from\s+['"][^'"]*campaign\//, 'the campaign execution path'],
      [/from\s+['"][^'"]*core\/prodObserve[^P]/, 'the C-11 request chain'],
      [/from\s+['"][^'"]*core\/(alphausHandoff|c12Readiness)/, 'an AH-1 cone import (versions stay deliberate literal duplicates)'],
      [/from\s+['"][^'"]*(slack|leslie|pondr)[^'"]*['"]/i, 'an external submission import'],
      [/expectedPoints|estimatedReward|rewardTier|bountyPoints|bountyScore|calculateBounty|bountyCalculator/i, 'a bounty-scoring surface'],
    ]) if (pattern.test(source)) fail(`${file} contains ${description}; the rehearsal cone must stay local-only`);
  }
  const rehearsal = read(`${coneDirectory}/rehearsal.ts`);
  // Occurrence-complete, not merely present: a surviving safe literal on one
  // return path must not license an unsafe one on another (mutation M13).
  for (const [file, source] of [['rehearsal.ts', rehearsal], ['types.ts', read(`${coneDirectory}/types.ts`)]]) {
    for (const assignment of source.match(/liveAuthorization\s*:\s*'[^']*'/g) ?? []) {
      if (!assignment.endsWith("'NOT_CONFERRED_SYNTHETIC_ONLY'")) {
        fail(`${coneDirectory}/${file} assigns ${assignment}; every rehearsal live-authorization value must be NOT_CONFERRED_SYNTHETIC_ONLY`);
      }
    }
  }
  const mockSubject = read(`${coneDirectory}/mockSubject.ts`);
  for (const literal of ['C12_REHEARSAL_REFUSES_NON_SYNTHETIC_HOST', "'NOT_CONFERRED_SYNTHETIC_ONLY'", "'LOCAL_REHEARSAL_PASS'", 'c12LiveReadiness', 'chainDefinitionDigest']) {
    if (!rehearsal.includes(literal)) fail(`FC-1 the rehearsal runner must retain ${literal}`);
  }
  if (!mockSubject.includes('.invalid')) fail('FC-1 the mock subject must stay pinned to the synthetic .invalid host namespace');
  // The readiness-version duplicate must track the AH-1 cone literally.
  const readinessTypes = read('src/core/c12Readiness/types.ts');
  const bound = /C12_READINESS_VERSION_BOUND = '([^']+)'/.exec(rehearsal);
  if (bound === null || !readinessTypes.includes(`C12_READINESS_VERSION = '${bound[1]}'`)) {
    fail('FC-1 the rehearsal readiness-version duplicate has drifted from C12_READINESS_VERSION');
  }
  // The rehearsal cone must actually exercise the production-intended core,
  // not a reimplementation: admission, attach, and grant issuance.
  for (const token of ['evaluateP1ObservationScope', 'attachP1ObservationSession', 'issueP1ObserveGrant']) {
    if (!rehearsal.includes(token)) fail(`FC-1 the rehearsal must drive the real P1 core (${token})`);
  }
}


/**
 * FC-1 finding-review / finding-intel invariants.
 *
 * The `src/core/findingReview/` and `src/core/findingIntel/` cones are pure
 * local lifecycle/intelligence machinery. They must stay free of external
 * submission, bounty-scoring, and organizational-verdict surfaces, and must
 * retain the literal markers that keep local review advisory-only.
 */
function checkFindingFrontierBoundary() {
  const cones = ['src/core/findingReview', 'src/core/findingIntel'];
  for (const coneDirectory of cones) {
    const coneFiles = gitFiles().filter((file) => file.startsWith(`${coneDirectory}/`) && file.endsWith('.ts'));
    if (coneFiles.length === 0) {
      fail(`FC-1 the ${coneDirectory} cone is missing`);
      return;
    }
    for (const file of coneFiles) {
      const source = read(file);
      for (const [pattern, description] of [
        [/from\s+['"]node:(?:net|http|https|dns|child_process|fs|os|path|url|util|events|stream|worker_threads)[^'"]*['"]/, 'a network/process/filesystem runtime import (any subpath)'],
        [/\brequire\s*\(\s*['"]/, 'a require() call'],
        [/\bfetch\s*\(/, 'fetch()'],
        [/from\s+['"][^'"]*(slack|leslie|pondr)[^'"]*['"]/i, 'an external submission import'],
        [/(Slack|Leslie|Pondr)(Client|Webhook|Api|API|Message|Ticket|Issue)|postTo(Slack|Leslie|Pondr)|file(Leslie|Pondr|Slack)Report|create(GitHub|Slack|Pondr)(Issue|Message|Task)/, 'an external submission connector'],
        [/expectedPoints|estimatedReward|rewardTier|bountyPoints|bountyScore|calculateBounty|bountyCalculator/i, 'a bounty-scoring surface'],
        [/from\s+['"][^'"]*core\/(alphausHandoff|c12Readiness|prodObserveP1|prodObserve[^P])/, 'a production-cone import (review/intel bind digests only)'],
      ]) if (pattern.test(source)) fail(`${file} contains ${description}; the finding-frontier cones must stay local-only`);
    }
  }
  const lifecycle = read('src/core/findingReview/lifecycle.ts');
  // Stale-review rejection and the non-equivalence guard are the load-bearing
  // properties: a weakened binding must fail this check, not just tests.
  for (const literal of ['FINDING_REVIEW_STALE', "'NONE_LOCAL_REVIEW_ONLY'"]) {
    if (!lifecycle.includes(literal)) fail(`FC-1 the review lifecycle must retain ${literal}`);
  }
  // Occurrence-complete: the emitted receipt value and the verification
  // comparison must BOTH be the local-only literal. A safe occurrence
  // elsewhere in the file must not satisfy this rule (mutation M12).
  for (const file of ['src/core/findingReview/lifecycle.ts', 'src/core/findingReview/types.ts']) {
    const source = read(file);
    for (const assignment of source.match(/organizationalAuthority\s*(?::|!==|===)\s*'[^']*'/g) ?? []) {
      if (!assignment.endsWith("'NONE_LOCAL_REVIEW_ONLY'")) {
        fail(`${file} carries ${assignment}; local review authority must always be NONE_LOCAL_REVIEW_ONLY`);
      }
    }
  }
  const relationships = read('src/core/findingIntel/relationships.ts');
  for (const literal of ['advisoryOnly: true', "finalVerdictAuthority: 'HUMAN_ORGANIZATIONAL'", 'REGRESSION_CANDIDATE']) {
    if (!relationships.includes(literal)) fail(`FC-1 the relationship classifier must retain ${literal}`);
  }
}
/**
 * RS-1 reviewer-surface invariants.
 *
 * The Control Center reviewer surface projects the FC-1 finding cones. It
 * must not become a second opinion: the cones' advisory markings decide the
 * epistemic class, the local-review non-equivalence guard is re-checked at
 * the surface, and the Alphaus vocabulary it displays must stay identical to
 * the AH-1 vocabulary it is forbidden to import.
 */
function checkReviewerSurfaceBoundary() {
  const adapter = read('src/controlCenter/adapters/reviewerAdapter.ts');
  const contract = read('src/controlCenter/contracts/reviewer.ts');
  const authority = read('src/controlCenter/authorities/reviewerAuthority.ts');

  // --- the projection stays pure ---
  for (const [file, source] of [
    ['src/controlCenter/adapters/reviewerAdapter.ts', adapter],
    ['src/controlCenter/contracts/reviewer.ts', contract],
    ['src/controlCenter/authorities/reviewerAuthority.ts', authority],
  ]) {
    for (const [pattern, description] of [
      [/from\s+['"]node:(?:net|http|https|dns|child_process|fs|os|worker_threads)[^'"]*['"]/, 'a network/process/filesystem import'],
      [/\brequire\s*\(\s*['"]/, 'a require() call'],
      [/\bfetch\s*\(/, 'fetch()'],
      [/process\.env/, 'an environment read'],
      [/from\s+['"][^'"]*(slack|leslie|pondr)[^'"]*['"]/i, 'an external submission import'],
      [/expectedPoints|estimatedReward|rewardTier|bountyPoints|bountyScore|calculateBounty/i, 'a bounty-scoring surface'],
    ]) if (pattern.test(source)) fail(`${file} contains ${description}; the reviewer surface must stay a pure local projection`);
  }

  // --- authority literals, occurrence-complete ---
  // A rule satisfied by one safe occurrence is the DEF-FC-04 / M12 trap: every
  // assignment and comparison must carry the local-only value, not just one.
  for (const [file, source] of [
    ['src/controlCenter/adapters/reviewerAdapter.ts', adapter],
    ['src/controlCenter/contracts/reviewer.ts', contract],
  ]) {
    for (const assignment of source.match(/organizationalAuthority\s*(?::|!==|===)\s*'[^']*'/g) ?? []) {
      if (!assignment.endsWith("'NONE_LOCAL_REVIEW_ONLY'")) {
        fail(`${file} carries ${assignment}; the reviewer surface must always be NONE_LOCAL_REVIEW_ONLY`);
      }
    }
    for (const assignment of source.match(/finalVerdictAuthority\s*(?::|!==|===)\s*'[^']*'/g) ?? []) {
      if (!assignment.endsWith("'HUMAN_ORGANIZATIONAL'")) {
        fail(`${file} carries ${assignment}; the final verdict authority is always HUMAN_ORGANIZATIONAL`);
      }
    }
  }

  // --- the cones decide the epistemic class, not the adapter ---
  for (const literal of [
    "receipt.organizationalAuthority !== 'NONE_LOCAL_REVIEW_ONLY'",
    'CUSTOMER_SENTINEL',
  ]) {
    if (!adapter.includes(literal)) fail(`RS-1 the reviewer adapter must retain ${literal}`);
  }
  // Totality, not presence. Two advisory projections exist, so an
  // includes(literal) rule stays satisfied when one guard is deleted — the
  // DEF-FC-02 / M12 shape. Every emitted `advisoryOnly: true` must be paid for
  // by a guard that rejected a non-advisory input.
  const emitted = (adapter.match(/advisoryOnly:\s*true/g) ?? []).length;
  const guarded = (adapter.match(/advisoryOnly\s*!==\s*true\)\s*fail/g) ?? []).length;
  if (emitted === 0 || guarded !== emitted) {
    fail(`RS-1 the reviewer adapter emits ${emitted} advisoryOnly values but guards ${guarded}; every advisory projection must check its input`);
  }
  // UNKNOWN must stay value-free: no advisory pointer may accompany it.
  if (!/possibleOriginalId !== null\) fail/.test(adapter)) {
    fail('RS-1 an UNKNOWN relationship must carry no advisory pointer');
  }

  // --- the scale probe measures; it never writes ---
  // A benchmark that can touch the finding store is a benchmark that can
  // corrupt the thing it measures. Synthetic corpora stay in memory.
  const probe = read('tests/unit/findingIntelScaleProbe.ts');
  for (const [pattern, description] of [
    [/from\s+['"]node:(?:fs|net|http|https|dns|child_process)[^'"]*['"]/, 'a filesystem/network/process import'],
    [/writeFile|appendFile|mkdirSync|createWriteStream|PrivateArtifactStore|ProductionFindingsStore/, 'a persistence capability'],
    [/\bfetch\s*\(/, 'fetch()'],
    [/Math\.random/, 'Math.random (the corpus must be identical in every process)'],
  ]) if (pattern.test(probe)) fail(`RS-1 the finding-intel scale probe contains ${description}`);

  // --- the pinned literal duplicate cannot drift from AH-1 ---
  const ah1 = readIncludingComments('src/core/alphausHandoff/types.ts');
  for (const [ah1Name, localName] of [
    ['ALPHAUS_SEVERITY_VALUES', 'ALPHAUS_SEVERITY_LITERALS'],
    ['ALPHAUS_CATCH_STAGE_VALUES', 'ALPHAUS_CATCH_STAGE_LITERALS'],
    ['ALPHAUS_SOURCE_VALUES', 'ALPHAUS_SOURCE_LITERALS'],
  ]) {
    const source = new RegExp(`${ah1Name}\\s*=\\s*(\\[[^\\]]*\\])`).exec(ah1);
    const local = new RegExp(`${localName}\\s*=\\s*(\\[[^\\]]*\\])`).exec(authority);
    if (source === null) fail(`RS-1 could not read ${ah1Name} from the AH-1 vocabulary`);
    else if (local === null) fail(`RS-1 could not read ${localName} from the reviewer authority`);
    else if (source[1].replace(/\s+/g, '') !== local[1].replace(/\s+/g, '')) {
      fail(`RS-1 ${localName} has drifted from ${ah1Name}; the duplicate is deliberate and must stay exact`);
    }
  }
}
/**
 * AH-1 documentation-freshness invariants (narrow, against demonstrated
 * failure modes — the 2026-09-01 header that survived MA-8 completion and
 * the historical GREEN claimed as current CI truth). Header dates are UTC
 * calendar days to stay independent of committer timezone.
 */
function checkDocumentationFreshness() {
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
 * C-02b protobuf source-intelligence invariants.
 *
 * Four things in this campaign are load-bearing, and each is the kind of thing
 * a later change could undo without any test noticing, so each is guarded
 * here and negative-probed:
 *
 *   1. the proto modules stay data-in / data-out — no filesystem, process,
 *      network or evaluation authority, and above all no protoc/buf shell-out;
 *   2. only the LEXER sees raw source, which is what makes "no fact from a
 *      comment" a property of the layering rather than a rule to remember;
 *   3. generation currency can leave UNKNOWN only through a per-operation
 *      corroboration (OpenSpec audit A-4);
 *   4. route ambiguity stays scoped to the evidence class (DEF-C02B-1).
 */
function checkC02bProtobufBoundary() {
  const protoModules = ['src/core/source/protoLexer.ts', 'src/core/source/protoDeclarations.ts', 'src/core/source/protoCorroboration.ts'];
  for (const file of protoModules) {
    let source;
    try {
      source = readIncludingComments(file);
    } catch {
      fail(`C-02b the protobuf module ${file} is missing`);
      return;
    }
    for (const [pattern, description] of [
      [/from\s+['"]node:fs['"]|require\(['"](?:node:)?fs['"]\)/, 'filesystem authority'],
      [/from\s+['"]node:child_process['"]|require\(['"](?:node:)?child_process['"]\)/, 'process authority'],
      [/from\s+['"]node:(?:net|http|https|dgram|tls)['"]/, 'network authority'],
      [/\beval\s*\(|new\s+Function\s*\(/, 'dynamic evaluation'],
      // Narrow on purpose. An earlier form of this rule matched the words
      // `protoc-gen-openapiv2` inside a comment explaining a real annotation,
      // which is the C-11 lesson about plausible rules matching irrelevant
      // occurrences of the same identifier. What must be forbidden is a
      // compiler DEPENDENCY or a command string, not the prose.
      [/from\s+['"](?:protobufjs|google-protobuf)|require\(['"](?:protobufjs|google-protobuf)['"]\)/, 'a protobuf compiler dependency'],
      [/['"]protoc['"]|['"]buf['"]/, 'a protobuf compiler command'],
    ]) {
      if (pattern.test(source)) fail(`${file} contains ${description}; the C-02b protobuf path is data-in / data-out only`);
    }
  }

  // --- only the lexer may look at raw source ---
  // The declaration reader must hand `sourceText` straight to `lexProto` and
  // never inspect it again. If it grows a regex or an `indexOf` over the raw
  // text, comment and string handling has escaped the one module that owns it
  // and a fact could be derived from a comment.
  const declarations = readIncludingComments('src/core/source/protoDeclarations.ts');
  const rawSourceUses = (declarations.match(/sourceText/g) ?? []).length;
  if (rawSourceUses !== 2) {
    fail('C-02b protoDeclarations.ts must touch raw source exactly twice — its parameter and the lexProto call; comment and string syntax belongs to the lexer alone');
  }
  if (!/lexProto\(sourceText/.test(declarations)) {
    fail('C-02b protoDeclarations.ts must obtain its tokens from lexProto');
  }
  const lexer = readIncludingComments('src/core/source/protoLexer.ts');
  for (const [pattern, description] of [
    [/UNTERMINATED_COMMENT/, 'an unterminated block comment must fail closed'],
    [/UNTERMINATED_STRING/, 'an unterminated string must fail closed'],
    [/TOKEN_BUDGET_EXHAUSTED/, 'the token ceiling must be categorical'],
    [/DEPTH_EXCEEDED/, 'the nesting ceiling must be categorical'],
  ]) if (!pattern.test(lexer)) fail(`C-02b protoLexer.ts lost a bounding state: ${description}`);

  // --- A-4: currency may not be upgraded by a count ---
  const corroboration = readIncludingComments('src/core/source/protoCorroboration.ts');
  if (!/state\s*!==\s*'CORROBORATED_EXACT'\)\s*return null/.test(corroboration)) {
    fail("C-02b toProtoSurfaceCorroboration must return null unless the per-operation comparison is CORROBORATED_EXACT; without that guard a count alone reaches evaluateGenerationCurrency");
  }
  const generated = readIncludingComments('src/core/source/generatedArtifact.ts');
  const corroborationLiteral = /PROTO_SURFACE_CORROBORATIONS[^=]*=\s*Object\.freeze\(\[\s*\]\)/.test(generated);
  if (!corroborationLiteral) {
    fail('C-02b PROTO_SURFACE_CORROBORATIONS must stay an empty literal; a hand-written corroboration would assert currency without comparing an operation');
  }

  // --- DEF-C02B-1: ambiguity stays scoped to the evidence class ---
  const surfaces = readIncludingComments('src/core/source/surfaces.ts');
  const duplicateKeys = surfaces.match(/const (?:parsedKeys|duplicate)Key[^\n]*|const key = `\$\{entry\.file\.repoId\}[^\n]*/g) ?? [];
  const ambiguityKeyLines = surfaces.split('\n').filter((line) => /\$\{(?:entry\.file|file)\.repoId\}/.test(line) && /route\.(?:method|routeTemplate)|entry\.route\./.test(line));
  if (ambiguityKeyLines.length !== 2) {
    fail('C-02b expected exactly two route-ambiguity key constructions in surfaces.ts; the DEF-C02B-1 guard cannot be verified');
  }
  for (const line of ambiguityKeyLines) {
    if (!line.includes('classifySourceEvidenceQualifier')) {
      fail('C-02b the route-ambiguity key must include the evidence qualifier (DEF-C02B-1): a generated artifact and the source it was generated from are one witness, not two rival declarations');
    }
  }
  if (duplicateKeys.length === 0) fail('C-02b could not locate the route-ambiguity key construction in surfaces.ts');

  // --- no root or repository was admitted ---
  // C-02b's property is that protobuf was admitted as a LANGUAGE and widened
  // no REPOSITORY. The rule originally pinned blueapi's root list literally,
  // which described the state of the day rather than the property: C-03 later
  // admitted the remaining blueapi proto roots under an explicit owner
  // decision, and a rule that fires on an authorized per-root change is
  // guarding the wrong thing.
  //
  // C-05 moved the root declaration into `universe.ts`, which is now the single
  // admission authority, and the "must not admit blueinternal or wave-api"
  // prohibition this rule used to carry is SPENT: C-05 admitted both under
  // explicit owner authorization. Three campaigns each carried their own copy
  // of that prohibition; all three are replaced by one totality rule over the
  // authority in `checkC05UniverseAdmissionBoundary`, which forbids a NINTH
  // repository from any campaign rather than two repositories from three.
  const approved = readIncludingComments('src/core/source/universe.ts');
  if (!/'billing'/.test(approved) || !/'openapiv2'/.test(approved)) {
    fail('C-02b requires the blueapi billing and openapiv2 roots to stay admitted');
  }

}

/**
 * C-03 Go/gRPC topology invariants.
 *
 * The value of this campaign is that a binding is a fact rather than a naming
 * coincidence, and that a truncated enumeration never becomes a completeness
 * claim. Both are one edit away from being untrue, so both are guarded here
 * and negative-probed.
 */
function checkC03GrpcTopologyBoundary() {
  const modules = ['src/core/source/goRegistration.ts', 'src/core/source/protoServiceIndex.ts', 'src/core/source/grpcTopology.ts'];
  for (const file of modules) {
    let source;
    try {
      source = readIncludingComments(file);
    } catch {
      fail(`C-03 the topology module ${file} is missing`);
      return;
    }
    for (const [pattern, description] of [
      [/from\s+['"]node:fs['"]|require\(['"](?:node:)?fs['"]\)/, 'filesystem authority'],
      [/from\s+['"]node:child_process['"]|require\(['"](?:node:)?child_process['"]\)/, 'process authority'],
      [/from\s+['"]node:(?:net|http|https|dgram|tls)['"]/, 'network authority'],
      [/\beval\s*\(|new\s+Function\s*\(/, 'dynamic evaluation'],
      [/['"]go\s+build['"]|['"]go['"]\s*,\s*\[|gopls|go\/types/, 'a Go toolchain dependency'],
    ]) {
      if (pattern.test(source)) fail(`${file} contains ${description}; the C-03 topology path is data-in / data-out only`);
    }
  }

  const registration = readIncludingComments('src/core/source/goRegistration.ts');
  const topology = readIncludingComments('src/core/source/grpcTopology.ts');

  // --- test files may never become topology facts ---
  if (!/_test\.go/.test(registration) || !/export function isTopologyEligibleGoPath/.test(registration)) {
    fail('C-03 the `_test.go` topology exclusion must exist in goRegistration.ts');
  }
  // The CALL SITE, not the identifier. A rule satisfied by the import line
  // stays green while the filter it names is deleted — presence is not proof.
  if (!/goFiles\.filter\(\(file\) => isTopologyEligibleGoPath\(file\.relativePath\)\)/.test(topology)) {
    fail('C-03 the topology builder must apply the `_test.go` exclusion to its file set; two real registrations in pkg/exportcostfilters would otherwise become Cost implementations');
  }

  // --- a binding is a fact only when it is PROVEN ---
  if (!/state === 'PROVEN'[\s\S]{0,200}?SOURCE_FACT|evidenceClass: 'SOURCE_FACT'/.test(topology)) {
    fail('C-03 the topology must classify evidence explicitly');
  }
  // Count ASSIGNMENTS, not the type declaration `'SOURCE_FACT' | 'NOT_A_FACT'`.
  // Requiring the `as const` spelling is what separates the two.
  if ((topology.match(/evidenceClass: 'SOURCE_FACT' as const/g) ?? []).length !== 1) {
    fail("C-03 exactly one construction may set evidenceClass SOURCE_FACT; every other outcome is NOT_A_FACT");
  }

  // --- absence is never a negative fact ---
  // The derived ASSIGNMENT, not the token. The first version of this rule
  // matched the word inside the comment that explains it, so deleting the
  // behaviour left the guard green.
  if (!/absenceReason: enumerationState === 'COMPLETE' \? 'NO_OBSERVED_REGISTRATION' : 'TRUNCATED_ENUMERATION'/.test(topology)) {
    fail('C-03 an unobserved registration must be reported TRUNCATED_ENUMERATION rather than MISSING, derived from the measured enumeration state');
  }
  if (!/repositoryCompleteProof: enumerationState === 'COMPLETE'/.test(topology)) {
    fail('C-03 repositoryCompleteProof must be derived from the measured enumeration state, never asserted');
  }

  // --- W-EFFECT_RPC stays unsupported, and the method prototype says so ---
  if (!/completenessClaim: 'NONE'/.test(topology) || /completenessClaim: '(?!NONE)/.test(topology)) {
    fail("C-03 the method-level prototype must carry completenessClaim NONE; an unobserved handler is not an absent one");
  }
  if (/W_EFFECT_RPC|WRITE_EFFECT_CLOSURE/.test(topology)) {
    fail('C-03 must not implement W-EFFECT_RPC: sound effect proof requires COMPLETE enumeration, which ouchan cannot provide');
  }

  // --- the contract ceilings are unchanged ---
  // The repository-admission half of this rule moved to
  // `checkC05UniverseAdmissionBoundary`; see the note in the C-02b rule.
  const approved = readIncludingComments('src/core/source/approvedScan.ts');
  const sibling = readIncludingComments('src/core/source/siblingSource.ts');
  if (!/MAX_SIBLING_SOURCE_SCAN_FILES = 4096/.test(sibling) || !/MAX_SIBLING_SOURCE_SCAN_BYTES = 64_000_000/.test(sibling)) {
    fail('C-03 must not change the sibling scan contract ceilings; raising them is a separate authorized change');
  }
  if (!/'mobingilabs\/ouchan': 4096/.test(approved)) {
    fail('C-03 ouchan must keep the raised file budget; at 1,024 not one registration daemon is enumerated');
  }

}

/**
 * C-04 frontend consumer invariants.
 *
 * One rule here matters more than the rest: an edge built from a non-literal
 * path must never be a SOURCE_FACT. The others keep the modules data-only and
 * keep customer values out of durable evidence.
 */
function checkC04FrontendConsumerBoundary() {
  const modules = ['src/core/source/vueSfc.ts', 'src/core/source/frontendConsumer.ts', 'src/core/source/frontendJoin.ts'];
  for (const file of modules) {
    let source;
    try {
      source = readIncludingComments(file);
    } catch {
      fail(`C-04 the frontend module ${file} is missing`);
      return;
    }
    for (const [pattern, description] of [
      [/from\s+['"]node:fs['"]|require\(['"](?:node:)?fs['"]\)/, 'filesystem authority'],
      [/from\s+['"]node:child_process['"]/, 'process authority'],
      [/from\s+['"]node:(?:net|http|https|dgram|tls)['"]/, 'network authority'],
      [/\beval\s*\(|new\s+Function\s*\(/, 'dynamic evaluation'],
      [/from\s+['"]@vue\/compiler-sfc['"]|from\s+['"]typescript['"]|jsdom|puppeteer/, 'a frontend toolchain dependency'],
    ]) {
      if (pattern.test(source)) fail(`${file} contains ${description}; the C-04 frontend path is data-in / data-out only`);
    }
  }

  const consumer = readIncludingComments('src/core/source/frontendConsumer.ts');
  const join = readIncludingComments('src/core/source/frontendJoin.ts');

  // --- no SOURCE_FACT from a non-literal path ---
  if (!/if \(pathClass === 'LITERAL' \|\| pathClass === 'STRUCTURAL'\) return 'SOURCE_FACT';/.test(consumer)) {
    fail("C-04 only LITERAL and STRUCTURAL paths may yield SOURCE_FACT; the classifier must state that exactly");
  }
  if ((consumer.match(/return 'SOURCE_FACT';/g) ?? []).length !== 1) {
    fail('C-04 exactly one construction may return SOURCE_FACT from the path classifier');
  }
  if (!/pathClass: 'PARTIAL_SEGMENT'/.test(consumer) || !/pathClass: 'DYNAMIC'/.test(consumer)) {
    fail('C-04 the non-literal path classes must remain distinguishable');
  }

  // --- query and hash never persisted ---
  if (!/const hashIndex = raw\.indexOf\('#'\);/.test(consumer) || !/const queryIndex = withoutHash\.indexOf\('\?'\);/.test(consumer)) {
    fail('C-04 query and hash must be stripped before classification, so a runtime value can never be persisted');
  }

  // --- the join never upgrades ---
  if (!/EVIDENCE_RANK\[left\] <= EVIDENCE_RANK\[right\] \? left : right/.test(join)) {
    fail('C-04 the join must take the WEAKER evidence class of its two inputs');
  }
  if (/joinedEvidenceClass: 'SOURCE_FACT'/.test(join)) {
    fail('C-04 the join must never assign SOURCE_FACT directly; it is derived from the weaker input');
  }

  // --- method never defaulted ---
  if (/method: 'GET'/.test(consumer) || /method \?\? 'GET'/.test(consumer)) {
    fail("C-04 the HTTP method must never be defaulted to GET");
  }

  // --- only declared clients are clients ---
  if (!/tokens\[index \+ 2\]\?\.value !== 'axios'/.test(consumer) || !/tokens\[index \+ 4\]\?\.value !== 'create'/.test(consumer)) {
    fail('C-04 an HTTP client must be recognised from axios.create; otherwise Cookies.get becomes an HTTP GET');
  }


  // --- the shared tokenizer default is unchanged ---
  const lexical = readIncludingComments('src/core/source/lexical.ts');
  if (!/options\.preserveTemplates === true \? sourceText\.slice/.test(lexical)) {
    fail('C-04 template preservation must stay opt-in; every existing caller must lex byte-identically');
  }

}

/**
 * C-15b system map invariants.
 *
 * The map is the surface an operator trusts, so the rules that matter are the
 * ones that would let it lie quietly: an upgraded fact category, a bound that
 * hides its drop count, a layout whose identity omits a load-bearing input, or
 * a Control Center that grows a verb.
 */
function checkC15bSystemMapBoundary() {
  const modules = ['src/core/systemMap/model.ts', 'src/core/systemMap/projections.ts', 'src/core/systemMap/layout.ts'];
  for (const file of modules) {
    let source;
    try {
      source = readIncludingComments(file);
    } catch {
      fail(`C-15b the system map module ${file} is missing`);
      return;
    }
    for (const [pattern, description] of [
      [/from\s+['"]node:fs['"]|require\(['"](?:node:)?fs['"]\)/, 'filesystem authority'],
      [/from\s+['"]node:child_process['"]/, 'process authority'],
      [/from\s+['"]node:(?:net|http|https|dgram|tls)['"]/, 'network authority'],
      [/\beval\s*\(|new\s+Function\s*\(/, 'dynamic evaluation'],
      [/Date\.now\(\)|new Date\(|Math\.random\(/, 'nondeterminism'],
    ]) {
      if (pattern.test(source)) fail(`${file} contains ${description}; the C-15b system map must be deterministic and data-only`);
    }
  }

  const model = readIncludingComments('src/core/systemMap/model.ts');
  const projections = readIncludingComments('src/core/systemMap/projections.ts');
  const layout = readIncludingComments('src/core/systemMap/layout.ts');

  // --- evidence is never upgraded ---
  if (!/CATEGORY_RANK\[left\] <= CATEGORY_RANK\[right\] \? left : right/.test(model)) {
    fail('C-15b weakerFactCategory must return the WEAKER category; a join may never strengthen its inputs');
  }
  if (/export function strongerFactCategory/.test(model)) {
    fail('C-15b must not expose a stronger-category helper; its absence is what guarantees no join can upgrade');
  }

  // --- bounds report exact drops, not a flag ---
  for (const field of ['limit', 'total', 'projected', 'dropped', 'truncated', 'remainingUnknown']) {
    if (!new RegExp(`readonly ${field}:`).test(model)) fail(`C-15b ProjectionBound must carry ${field}; a bare truncated flag cannot say how much was dropped`);
  }
  if (!/const dropped = Math\.max\(0, input\.total - input\.projected\);/.test(model)) {
    fail('C-15b the drop count must be derived from the measured total, never asserted');
  }
  if (!/Math\.max\(0, Math\.trunc\(input\.nodeLimit\)\)/.test(projections)) {
    fail('C-15b projection limits must be clamped before slicing; a negative limit would WIDEN the projection');
  }

  // --- layout identity binds every load-bearing input ---
  for (const bound of ['graphDigest', 'engineId', 'engineVersion', 'projectionVersion', 'options']) {
    if (!new RegExp(`${bound}[,:]`).test(layout)) fail(`C-15b the layout identity must bind ${bound}`);
  }
  if (!/layoutDigest: prefixedDigest24\('systemmaplayout', \{[\s\S]{0,400}?engineVersion: LAYOUT_ENGINE_VERSION/.test(layout)) {
    fail('C-15b the layout digest must include the engine version; a different engine must never collide with this identity');
  }

  // --- empty is not unmeasured ---
  if (!/measurement: 'UNMEASURED'/.test(projections)) {
    fail('C-15b the observed-production-paths query must report UNMEASURED; C-12 has not run and empty must never imply it did');
  }
  if (!/MEASUREMENT_STATES = \['MEASURED', 'UNMEASURED'\]/.test(projections)) {
    fail('C-15b a measured zero and an unmeasured zero must remain distinguishable');
  }

  // --- the seven-state coverage vocabulary is preserved ---
  for (const state of ['PROVEN', 'UNPROVEN', 'UNSUPPORTED', 'TRUNCATED', 'STALE', 'UNKNOWN', 'UNMEASURED']) {
    if (!new RegExp(`'${state}'`).test(model)) fail(`C-15b the coverage vocabulary lost ${state}`);
  }

  // --- the Control Center gains no authority ---
  const meta = readIncludingComments('src/controlCenter/adapters/metaAdapter.ts');
  if (!/executionAuthority: 'NONE'/.test(meta) || !/mutationAuthority: 'NONE'/.test(meta)) {
    fail('C-15b the Control Center must keep executionAuthority and mutationAuthority NONE');
  }
  for (const file of modules) {
    if (/prod-findings/.test(readIncludingComments(file))) fail(`${file} names the production findings store; C-10's exclusion is absolute`);
  }

}

/**
 * Campaign certification registry totality.
 *
 * Three conjuncts, enforced in one place over one declarative registry:
 * every campaign in the task ledger is DECLARED; every declared suite EXISTS
 * on disk; every declared suite is REGISTERED in a lane a REQUIRED gate group
 * runs. The judgement itself is pure and lives in
 * `bin/lib/campaign-certification.mjs`, so every failure path is
 * negative-probed by `tests/unit/r12CampaignCertification.test.ts` rather than
 * only by hand. This function does the I/O and nothing else.
 *
 * Completeness is anchored to the campaign task directories, not to test
 * filenames: a filename rule would have missed all four C-01 suites, none of
 * which is named `c01*`, and would misfire on unrelated suites starting with
 * `c`. The task ledger is real metadata the task protocol already requires.
 */
function checkCampaignCertificationRegistry() {
  const parse = (file) => {
    try {
      return JSON.parse(readIncludingComments(file));
    } catch {
      return undefined;
    }
  };
  const registry = parse('config/campaign-certification.v1.json');
  if (registry === undefined) {
    fail('config/campaign-certification.v1.json must be valid JSON');
    return;
  }
  const gate = parse('config/quality-gate.v1.json');
  if (gate === undefined) {
    fail('config/quality-gate.v1.json must be valid JSON');
    return;
  }
  const lanes = new Map();
  for (const lane of Array.isArray(registry.lanes) ? registry.lanes : []) {
    if (typeof lane !== 'string') continue;
    const manifest = parse(lane);
    if (manifest !== undefined) lanes.set(lane, manifest);
  }
  const taskRoot = typeof registry.campaignTaskRoot === 'string' ? registry.campaignTaskRoot : '.agent/tasks';
  let campaignTasks;
  try {
    campaignTasks = fs.readdirSync(path.join(root, taskRoot), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    fail(`the campaign task ledger ${taskRoot} must be a readable directory`);
    return;
  }
  for (const message of validateCampaignCertification({
    registry,
    gate,
    lanes,
    campaignTasks,
    suiteExists: (suite) => fs.existsSync(path.join(root, suite)),
  })) fail(message);
}

/**
 * C-05 universe admission boundary.
 *
 * This replaces three separate per-campaign prohibitions ("C-02b/C-03/C-04
 * must not admit blueinternal or wave-api"). Each named two repositories and
 * one campaign, so each went obsolete the moment C-05 was authorized to admit
 * exactly those two — and none of them would have stopped a NINTH repository
 * being admitted by a fourth campaign. One rule over the authority does.
 *
 * The invariant is the separation itself: discovery may see any number of
 * repositories, and the admitted set is a literal that a reviewer can read.
 */
function checkC05UniverseAdmissionBoundary() {
  const universe = readIncludingComments('src/core/source/universe.ts');
  const scan = readIncludingComments('src/core/source/approvedScan.ts');

  // --- the admitted set is EXACTLY these eight ---
  const expected = [
    'mobingilabs/ripple-ui', 'mobingilabs/ripple-api', 'mobingilabs/ouchan',
    'alphauslabs/grpc-chunk-parser', 'alphauslabs/blueapi', 'alphauslabs/blue-sdk-go',
    'alphauslabs/blueinternal', 'mobingilabs/wave-api',
  ];
  const block = /export const OWNER_APPROVED_UNIVERSE[^=]*=\s*Object\.freeze\(\{([\s\S]*?)\n\}\);/.exec(universe);
  if (block === null) {
    fail('C-05 could not read the OWNER_APPROVED_UNIVERSE declaration; the admission boundary cannot be verified');
  } else {
    const declared = [...block[1].matchAll(/'([a-z0-9._-]+\/[a-z0-9._-]+)'\s*:/gi)].map((match) => match[1]);
    for (const repoId of expected) {
      if (!declared.includes(repoId)) fail(`C-05 owner-approved universe is missing ${repoId}`);
    }
    for (const repoId of declared) {
      if (!expected.includes(repoId)) fail(`C-05 owner-approved universe admits an unauthorized repository: ${repoId}`);
    }
  }

  // --- admission has exactly ONE authority ---
  // `approvedScan.ts` owned an APPROVED_ROOTS literal, so the real membership
  // rule was an intersection nobody had written down.
  if (/const APPROVED_ROOTS\b/.test(withoutComments(scan))) {
    fail('src/core/source/approvedScan.ts must not declare its own repository allowlist; universe.ts is the single admission authority');
  }
  if (!/from '\.\/universe'/.test(scan)) {
    fail('src/core/source/approvedScan.ts must project the admitted set from universe.ts');
  }
  // --- and a disagreement is DECLARED, in both directions ---
  for (const code of ['REAL_SOURCE_SCAN_UNIVERSE_NOT_IN_DEPENDENCY_MAP', 'REAL_SOURCE_SCAN_DEPENDENCY_MAP_NOT_IN_UNIVERSE']) {
    if (!scan.includes(code)) fail(`src/core/source/approvedScan.ts must fail closed on universe/dependency-map disagreement (${code})`);
  }

  // --- discovery cannot promote ---
  for (const property of ['CONTAINS_OPENAPI_DOCUMENT', 'FILESYSTEM_ADJACENT_TO_ADMITTED_REPOSITORY', 'ORGANIZATION_DIRECTORY_MATCHES']) {
    if (!universe.includes(property)) fail(`C-05 must state ${property} as a non-admission property`);
  }
  // The authority is data-only: the boundary performs every read.
  for (const forbidden of ['node:fs', 'node:child_process', 'node:net', 'node:https']) {
    if (universe.includes(forbidden)) fail(`src/core/source/universe.ts must stay data-only policy (imports ${forbidden})`);
  }

  // --- no current mutable Git state is persisted ---
  const types = readIncludingComments('src/core/changeIntelligence/types.ts');
  const definition = /export interface RepoDefinition \{([\s\S]*?)\n\}/.exec(types);
  if (definition === null) {
    fail('C-05 could not read the RepoDefinition declaration');
  } else {
    for (const field of ['branch', 'trackingSha', 'ahead', 'behind', 'dirty']) {
      if (new RegExp(`(^|\\n)\\s*${field}\\s*:`).test(definition[1])) {
        fail(`RepoDefinition must not persist current mutable Git state (${field}); query it live`);
      }
    }
    // The pins must SURVIVE. Removing them would make every staleness check
    // vacuously pass, which is worse than a stale value: a silent rebind.
    for (const pin of ['checkedOutSha', 'sourceMapSha']) {
      if (!new RegExp(`(^|\\n)\\s*${pin}\\s*:`).test(definition[1])) {
        fail(`RepoDefinition must keep the pinned provenance anchor ${pin}`);
      }
    }
  }
  const map = readIncludingComments('src/core/changeIntelligence/map.ts');
  for (const field of ['branch', 'trackingSha', 'ahead', 'behind', 'dirty']) {
    if (new RegExp(`(^|\\n)\\s{4}${field}:`).test(map)) {
      fail(`src/core/changeIntelligence/map.ts must not persist ${field}; it is current mutable Git state`);
    }
  }
  // --- the unapproved-read guarantee is measured at the CALL ---
  const boundary = readIncludingComments('src/core/source/siblingSource.ts');
  for (const member of ['readLedger', 'admissionRefusals', 'contentReads', 'admissionRefused']) {
    if (!boundary.includes(member)) {
      fail(`src/core/source/siblingSource.ts must keep the C-05 read ledger (${member}); an output-only guarantee cannot distinguish reading nothing from deriving nothing`);
    }
  }
  // Every real analysis path must hand the boundary the approved set. Admission
  // was previously enforced only by which repositories the scan CONFIG listed,
  // so a caller that built its own config was ungated.
  for (const file of ['bin/nightwatch-intelligence.mjs', 'src/controlCenter/authorities/sourceAuthority.ts']) {
    if (!/admittedRepositoryIds/.test(read(file))) {
      fail(`${file} must pass admittedRepositoryIds to the sibling-source boundary so an unadmitted repository cannot be opened`);
    }
  }

  // The one consumer must OBSERVE rather than republish the persisted values.
  const shadow = readIncludingComments('bin/change-intelligence.mjs');
  for (const republished of ['behind: repo.behind', 'ahead: repo.ahead', 'trackingSha: repo.trackingSha', 'branch: repo.branch']) {
    if (shadow.includes(republished)) {
      fail(`bin/change-intelligence.mjs must observe Git state live, not republish the persisted field (${republished})`);
    }
  }
}

/**
 * C-08 deployment-fact boundary.
 *
 * The rule that matters is the one a well-meaning implementation gets wrong:
 * `ripple-ui/src/config/common.js` is committed, current, and names real hosts
 * per environment, so it reads as authoritative — while stating only what the
 * FRONTEND CALLS. What the infrastructure SERVES is a different proposition,
 * and the gap between them is where a stale or rerouted deployment hides. So
 * the host matrix must stay SOURCE_FACT, and only genuine deployment
 * configuration may produce a DEPLOYMENT_FACT.
 */
function checkC08DeploymentBindingBoundary() {
  const binding = readIncludingComments('src/core/source/deploymentBinding.ts');
  const evidence = readIncludingComments('src/core/source/deploymentEvidence.ts');

  // --- the forbidden bases are DECLARED, including the one that arises here ---
  // Read the DECLARATION, not the file. `CLIENT_CONFIGURATION` is also named in
  // the prose explaining why it is forbidden, so a whole-file `includes` passes
  // on the very comment that documents compliance while the array is empty --
  // the same trap the C-02b rule records, and this campaign's own probe caught
  // it here.
  const basesBlock = /export const FORBIDDEN_DEPLOYMENT_FACT_BASES[^=]*=\s*Object\.freeze\(\[([\s\S]*?)\]\);/.exec(binding);
  if (basesBlock === null) {
    fail('C-08 could not read the FORBIDDEN_DEPLOYMENT_FACT_BASES declaration');
  } else {
    const declared = withoutComments(basesBlock[1]);
    for (const basis of ['SERVICE_NAME_SIMILARITY', 'ROUTE_PREFIX_SIMILARITY', 'GUESSED_HOSTNAME',
      'HISTORICAL_FAMILIARITY', 'DOCUMENT_DESCRIBING_EXPECTED_ARCHITECTURE', 'CLIENT_CONFIGURATION']) {
      if (!declared.includes(`'${basis}'`)) fail(`C-08 must declare ${basis} as a forbidden DEPLOYMENT_FACT basis`);
    }
  }

  // --- the host matrix is SOURCE_FACT, and the build config DEPLOYMENT_FACT ---
  const hostMatrixFn = /export function extractHostMatrix[\s\S]*?\n\}/.exec(evidence);
  if (hostMatrixFn === null) {
    fail('C-08 could not read extractHostMatrix; the host-matrix classification cannot be verified');
  } else if (!/factCategory: 'SOURCE_FACT' as const/.test(hostMatrixFn[0])) {
    fail('C-08 the host matrix is CLIENT configuration and must be classified SOURCE_FACT, never DEPLOYMENT_FACT');
  }
  const exclusionFn = /export function extractBuildExclusions[\s\S]*?\n\}/.exec(evidence);
  if (exclusionFn === null) {
    fail('C-08 could not read extractBuildExclusions');
  } else if (!/factCategory: 'DEPLOYMENT_FACT' as const/.test(exclusionFn[0])) {
    fail('C-08 build exclusions are deployment configuration and must be classified DEPLOYMENT_FACT');
  }

  // --- U-1 and U-2 stay unresolved while the manifests are unavailable ---
  if (!/u1: Object\.freeze\(\{ resolved: false as const/.test(binding)
    || !/u2: Object\.freeze\(\{ resolved: false as const/.test(binding)) {
    fail('C-08 U-1 and U-2 must be typed unresolved; resolving them requires the mochi manifests, not a boolean');
  }
  if (!binding.includes('C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS')) {
    fail('C-08 must record C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS as the reason U-1 and U-2 are unknown');
  }

  // --- totality is structural ---
  if (!/totalityHolds: operations\.length === bindings\.length/.test(binding)) {
    fail('C-08 must assert binding totality against the operation population');
  }

  // --- AMBIGUOUS and UNKNOWN stay distinct ---
  // R-13 DEF-R13-4: a file-substring check cannot see a state dropped from
  // the array while its token lingers elsewhere in the file (line 152 still
  // returns 'STALE'). Parse the vocabulary declaration itself.
  const vocabulary = /export const DEPLOYMENT_BINDING_STATES\s*=\s*\[([\s\S]*?)\]/.exec(binding);
  if (vocabulary === null) {
    fail('C-08 could not read the DEPLOYMENT_BINDING_STATES declaration; the vocabulary cannot be verified');
  } else {
    for (const state of ['AMBIGUOUS', 'UNKNOWN', 'PARTIAL', 'STALE', 'UNSUPPORTED', 'EXACT']) {
      if (!new RegExp(`'${state}'`).test(vocabulary[1])) fail(`C-08 binding state ${state} is missing from the vocabulary`);
    }
  }

  // --- the binding modules stay data-only, and grant no authority ---
  for (const file of ['src/core/source/deploymentBinding.ts', 'src/core/source/deploymentEvidence.ts']) {
    const source = readIncludingComments(file);
    for (const forbidden of ['node:fs', 'node:child_process', 'node:net', 'node:https', 'node:http']) {
      if (source.includes(`from '${forbidden}'`)) fail(`${file} must stay data-only policy (imports ${forbidden})`);
    }
  }
  // Knowing where something runs is not permission to call it.
  for (const file of ['src/core/safety/realRunGate.ts', 'src/core/policy/ownerScope.ts']) {
    if (/deploymentBinding|deploymentEvidence/.test(readIncludingComments(file))) {
      fail(`${file} must not consult the deployment binding; a deployment fact grants no request authority`);
    }
  }
  // The cluster config is never read.
  for (const file of ['src/core/source/deploymentBinding.ts', 'src/core/source/deploymentEvidence.ts', 'bin/nightwatch-intelligence.mjs']) {
    if (/kubeconf|kubectl/i.test(read(file))) {
      fail(`${file} must not reference cluster configuration; C-08 reads no cluster`);
    }
  }
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
function checkC09SpecExpectationBoundary() {
  const expectations = readIncludingComments('src/core/source/specExpectations.ts');
  const inventory = readIncludingComments('src/core/source/specScenarioInventory.ts');
  const proof = readIncludingComments('src/core/source/readOnlyProof.ts');

  // --- W-SPEC stays DOCUMENTARY ---
  if (!/'W-SPEC':\s*'DOCUMENTARY'/.test(proof)) {
    fail("C-09 W-SPEC must remain witness class DOCUMENTARY; that class is why a spec witness cannot reach READ_ONLY_PROVEN");
  }
  // --- and the proof still requires a declaration AND an effect witness ---
  if (!/declarationHeld/.test(proof) || !/effectHeld/.test(proof)) {
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
  if (!/export const PROSE_FIELDS\s*=/.test(expectations)) {
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
function checkC16EigBoundary() {
  const eig = readIncludingComments('src/core/source/expectedInformationGain.ts');
  const ledger = readIncludingComments('src/core/source/censusFigureLedger.ts');
  const code = withoutComments(eig);

  // --- a ranking grants nothing ---
  if (!/grantsAuthority: false as const/.test(eig)) {
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
  if (!/left\.numerator \* right\.denominator - right\.numerator \* left\.denominator/.test(eig)) {
    fail('C-16 score ordering must cross-multiply integers rather than divide; a float order depends on rounding');
  }
  if (!/left\.target\.targetId < right\.target\.targetId/.test(eig)) {
    fail('C-16 the ranking must break ties on a stable key so the order is total and reproducible');
  }

  // --- G-16: one derived figure source ---
  if (!/export const CENSUS_FIGURES/.test(ledger)) {
    fail('G-16 requires one derived figure source; CENSUS_FIGURES must declare the census measures');
  }
  if (!/export const HISTORICAL_MARKER\s*=/.test(ledger)) {
    fail('G-16 must provide an explicit historical marker so a superseded narrative is retired rather than deleted');
  }
  // The exemption must be a single explicit marker, not a word list. A first
  // draft matched any line containing `was `, which exempts most prose.
  if (/HISTORICAL_MARKERS\s*=/.test(ledger)) {
    fail('G-16 the historical exemption must be one explicit marker, not a list of words that can fire by accident');
  }
  if (!/POLICED_DOCUMENTS/.test(ledger)) {
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
function checkC07DerivedSemanticsBoundary() {
  const derived = readIncludingComments('src/core/source/derivedEndpointSemantics.ts');
  const legacy = readIncludingComments('src/core/safety/endpointSemantics.ts');
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
  if (!/default:/.test(code) || !/CONFLICTING_EVIDENCE/.test(derived)) {
    fail('C-07 must fail closed on an unrecognised source classification rather than falling through to a usable value');
  }

  // --- the legacy hand-authored registry stays empty ---
  if (!/RIPPLE_ENDPOINT_SEMANTIC_REGISTRY: readonly EndpointSemanticRule\[\] = \[\]/.test(legacy)) {
    fail('C-07 the hand-authored endpoint semantic registry must stay empty; semantics are derived, and the retired catalog is never safety authority');
  }

  // --- generation is not execution ---
  for (const marker of ['grantsRequestAuthority: false as const']) {
    if (!derived.includes(marker)) fail(`C-07 must state ${marker} as data; a classification is information, not permission`);
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

function checkAgentProtocolBoundary() {
  const cone = 'src/core/agentProtocol';
  const coneFiles = gitFiles().filter((file) => file.startsWith(`${cone}/`) && file.endsWith('.ts'));
  if (coneFiles.length === 0) {
    fail('agent protocol cone is missing');
    return;
  }
  for (const file of coneFiles) {
    const source = read(file);
    for (const [pattern, description] of [
      [/from\s+['"]node:(?:net|http|https|dns|child_process|fs|os|path|url|events|stream|worker_threads)[^'"]*['"]/, 'a network/process/filesystem runtime import'],
      [/from\s+['"]child_process[^'"]*['"]/, 'a bare child_process import'],
      [/\brequire\s*\(\s*['"]/, 'a require() call'],
      [/\beval\s*\(|new\s+Function\s*\(/, 'dynamic evaluation'],
      [/from\s+['"][^'"]*core\/aiReview/, 'the aiReview cone'],
      [/from\s+['"][^'"]*core\/campaign\//, 'the campaign execution path'],
      [/from\s+['"][^'"]*browser\//, 'the browser cone'],
      [/(Slack|Leslie|Pondr)(Client|Webhook|Api)|postTo(Slack|Leslie|Pondr)/, 'an external submission connector'],
    ]) if (pattern.test(source)) fail(`${file} contains ${description}; agentProtocol must stay pure`);
  }
  const validate = read('src/core/agentProtocol/validate.ts');
  for (const token of ['UNKNOWN_TOOL', 'UNSAFE_INTENT', 'UNAUTHORIZED_ENVIRONMENT', 'SECRET_ECHO', 'MALFORMED_OUTPUT']) {
    if (!validate.includes(token)) fail(`agentProtocol validator is missing ${token}`);
  }
  const owner = readIncludingComments('src/core/policy/ownerScope.ts');
  if (!/AUTONOMOUS_AGENT_LOCAL/.test(owner)) fail('owner scope is missing AUTONOMOUS_AGENT_LOCAL');
  const finding = read('src/core/agentProtocol/finding.ts');
  for (const literal of ["humanReviewRequired: true", "externalPublication: 'PROHIBITED'", 'autoLeslie: false']) {
    if (!finding.includes(literal)) fail(`autonomous finding authority is missing ${literal}`);
  }
}

function checkReviewStoreBoundary() {
  const types = readIncludingComments('src/core/reviewStore/types.ts');
  const identity = readIncludingComments('src/core/reviewStore/identity.ts');
  const store = readIncludingComments('src/core/reviewStore/store.ts');
  const writeAuthority = readIncludingComments('src/controlCenter/authorities/reviewWriteAuthority.ts');
  const binding = readIncludingComments('src/controlCenter/authorities/reviewBinding.ts');
  const reviewerAuthority = readIncludingComments('src/controlCenter/authorities/reviewerAuthority.ts');
  const policy = readIncludingComments('src/core/policy/privateArtifacts.ts');
  const storeCode = withoutComments(store);
  const identityCode = withoutComments(identity);

  // --- the store owns no I/O of its own ---
  // Every byte goes through PrivateArtifactStore. A store that could also
  // open a file would have a second, unaudited publication path.
  for (const file of ['src/core/reviewStore/types.ts', 'src/core/reviewStore/identity.ts', 'src/core/reviewStore/store.ts', 'src/core/reviewStore/index.ts']) {
    const source = read(file);
    for (const forbidden of ['node:fs', 'node:child_process', 'node:net', 'node:http', 'node:https', 'node:dgram', 'node:worker_threads']) {
      if (source.includes(`'${forbidden}'`)) fail(`${file} must not hold ${forbidden} authority`);
    }
    if (/\bfs\./.test(source) || /\bfetch\s*\(/.test(source) || /require\s*\(/.test(source)) fail(`${file} reaches a filesystem or network primitive directly`);
  }

  // --- publication is occurrence-complete, not sampled ---
  // Every call on the underlying private store is enumerated and checked
  // against an allowlist. A single positive `includes` would pass while one
  // unsafe call sat beside it.
  const allowed = new Set(['writeImmutableJson', 'readJson', 'listJson', 'listTemporaries', 'removeTemporary']);
  const calls = [...storeCode.matchAll(/this\.artifacts\.([A-Za-z0-9_]+)\s*\(/g)].map((match) => match[1]);
  if (calls.length === 0) fail('review store makes no call on the private artifact store at all');
  for (const call of calls) {
    if (!allowed.has(call)) fail(`review store calls a non-allowlisted private-store method: ${call}`);
  }
  // The replacement-capable writers must not appear anywhere in the cone.
  if (/writeJson\s*\(|writeIncomplete\s*\(/.test(storeCode)) fail('review store uses a replacement-capable write');
  if (!storeCode.includes('this.artifacts.writeImmutableJson(')) fail('review store does not publish through the atomic no-replace primitive');

  // --- the canonical validators are INVOKED, not merely imported ---
  // A rule that only checked the import would pass over a cone that imported
  // the validator and never called it.
  for (const invoked of ['verifyReceiptIntegrity(', 'verifyReviewCurrent(', 'validateReviewBinding(', 'isTerminalReviewState(', 'decideReview(', 'initialReviewRecord(']) {
    // The import list carries the bare name; a call carries the name plus an
    // open paren. Counting `name(` occurrences therefore counts CALLS, and a
    // cone that imported the validator and never used it scores zero.
    const uses = storeCode.split(invoked).length - 1;
    if (uses < 1) fail(`review store imports ${invoked.slice(0, -1)} without invoking it`);
  }

  // --- no second, weaker copy of review semantics ---
  // The store must never recompute a receipt digest or re-derive staleness.
  if (/sha256Hex\s*\(/.test(storeCode)) fail('review store recomputes a digest instead of using the canonical validator');
  if (/review:\$\{/.test(storeCode)) fail('review store rebuilds a receipt identity string');
  if (/FINDING_REVIEW_STALE:/.test(storeCode.replace(/startsWith\('FINDING_REVIEW_STALE'\)/g, ''))) fail('review store re-derives a staleness reason');

  // --- validate before publish, and no read-then-write race ---
  const putStart = storeCode.indexOf('putDecision(input: PutReviewDecisionInput)');
  // Anchored on the NEXT METHOD DECLARATION, not on a bare call name: a
  // mutation that introduces `this.fileNamesFor(...)` inside putDecision would
  // otherwise truncate the body being inspected and the rule would report the
  // wrong violation.
  //
  // Matched on the signature PREFIX rather than its full text, because
  // pinning the full parameter list makes the rule fail the moment that
  // method gains an argument — which it did, and the failure said
  // "publishes before validating" rather than "the anchor moved". A
  // structural rule must not be brittle about details it does not govern.
  const putEnd = storeCode.indexOf('\n  fileNamesFor(', putStart);
  const putBody = putStart >= 0 && putEnd > putStart ? storeCode.slice(putStart, putEnd) : '';
  if (!putBody) fail('review store putDecision body could not be located');
  const validateAt = putBody.indexOf('validateStoredReviewEnvelope(');
  const publishAt = putBody.indexOf('writeImmutableJson(');
  if (validateAt < 0 || publishAt < 0 || validateAt > publishAt) fail('review store publishes before validating the bytes it will write');
  if (/existsSync|fileNamesFor\(|this\.read\(/.test(putBody)) fail('review store putDecision performs a raceable read-then-write existence check');
  if (!/REVIEW_STORE_ALREADY_DECIDED/.test(putBody)) fail('review store does not map a publication conflict to a deterministic already-decided result');

  // --- identity is the WHOLE binding ---
  if (!/sha256Hex\(stableJsonSorted\(validateReviewBinding\(binding\)\)\)/.test(identityCode)) {
    fail('review identity is not the digest of the complete validated binding');
  }
  const fileNamePattern = identityCode.match(/REVIEW_FILE_NAME_RE = \/(.*?)\/;/)?.[1] ?? '';
  // Hex only, both components anchored: nothing a caller supplies can reach
  // a file name, so a path-shaped finding id cannot become a path.
  if (!fileNamePattern.startsWith('^review\\.') || !fileNamePattern.endsWith('\\.json$') || !fileNamePattern.includes('[0-9a-f]{12}') || !fileNamePattern.includes('[0-9a-f]{24}')) {
    fail(`review file name shape is not the pinned hex-only pattern: ${fileNamePattern}`);
  }

  // --- the error vocabulary is total in BOTH directions ---
  const declared = [...types.matchAll(/'(REVIEW_STORE_[A-Z_]+)'/g)].map((match) => match[1]);
  const declaredSet = new Set(declared);
  if (declaredSet.size < 8) fail('review store error vocabulary is suspiciously small');
  const raised = new Set([...storeCode.matchAll(/'(REVIEW_STORE_[A-Z_]+)'/g)].map((match) => match[1]));
  for (const code of raised) {
    if (!declaredSet.has(code)) fail(`review store raises an undeclared error code: ${code}`);
  }
  for (const code of declaredSet) {
    if (!raised.has(code)) fail(`review store declares an error code it can never raise: ${code}`);
  }

  // --- the owner-local root is outside the repository, and derived ---
  if (!/assertOutsideCanonicalWorkspace\(root\)/.test(policy)) fail('private artifact root no longer asserts it is outside the repository');
  if (!/if \(injectedRoot === undefined\) assertOutsideCanonicalWorkspace\(root\)/.test(policy)) {
    fail('a derived private artifact root is not held to the outside-the-repository contract');
  }
  if (!/PRIVATE_ARTIFACT_SUBTREES = \['findings', 'reviews'\]/.test(policy)) fail('the private subtree vocabulary is no longer a closed two-member union');
  if (!/assertKnownSubtree\(subtree\)/.test(policy)) fail('the subtree vocabulary is not enforced at runtime');

  // --- recovery can never touch an unknown file ---
  if (!/TEMPORARY_FILE_RE\.test\(name\)/.test(policy)) fail('temporary removal does not require the pinned temporary name shape');
  if (!/PRIVATE_ARTIFACT_NOT_A_TEMPORARY/.test(policy)) fail('temporary removal lacks a refusal for a non-temporary name');

  // --- no review artifact is ever tracked by Git ---
  for (const file of gitFiles()) {
    if (/(?:^|\/)review\.[0-9a-f]{12}\.[0-9a-f]{24}\.json$/.test(file)) fail(`a review store artifact is tracked in Git: ${file}`);
  }

  // --- the write authority is narrow ---
  const writeCode = withoutComments(writeAuthority);
  for (const forbidden of ['node:fs', 'node:child_process', 'node:net', 'node:http', 'node:https']) {
    if (writeCode.includes(`'${forbidden}'`)) fail(`review write authority must not hold ${forbidden} authority`);
  }
  if (/\bfs\./.test(writeCode) || /\bfetch\s*\(/.test(writeCode)) fail('review write authority reaches a filesystem or network primitive directly');
  // Its ONLY persistence is the review store.
  // Built from parts rather than written as a literal: a literal would put a
  // module-specifier shape into this file and the dependency-resolvability
  // check would read it as an import of its own.
  const importSpecifierPattern = new RegExp(['from', String.raw`\s+'([^']+)'`].join(''), 'g');
  const imports = [...writeCode.matchAll(importSpecifierPattern)].map((match) => match[1]);
  for (const specifier of imports) {
    if (!/^\.\.?\//.test(specifier)) fail(`review write authority imports a non-relative module: ${specifier}`);
    if (/prodEvidence|prodObserve|selfDev|alphausHandoff|aiReview|campaign\/|oops|source\/siblingSource/.test(specifier)) {
      fail(`review write authority reaches outside its cone: ${specifier}`);
    }
  }
  if (!/new ReviewStore\(/.test(writeCode)) fail('review write authority does not own a review store');
  if (/PrivateArtifactStore/.test(writeCode)) fail('review write authority bypasses the review store to reach the raw private store');

  // --- nothing in the cone can publish externally ---
  for (const [label, code] of [['review store', storeCode], ['review write authority', writeCode], ['review binding', withoutComments(binding)]]) {
    if (/slack|leslie|pondr|notion|webhook|https?:\/\//i.test(code)) fail(`${label} references an external publication destination`);
    if (/\.publish\s*\(/.test(code)) fail(`${label} reaches a publication method`);
  }

  // --- the read path stays pure and page-bounded ---
  const reviewerCode = withoutComments(reviewerAuthority);
  for (const forbidden of ['node:fs', 'node:child_process', 'node:net', 'node:http']) {
    if (reviewerCode.includes(`'${forbidden}'`)) fail(`reviewer authority must not hold ${forbidden} authority`);
  }
  if (/\bfs\./.test(reviewerCode) || /ReviewStore/.test(reviewerCode)) fail('reviewer authority holds persistence authority instead of receiving a lookup');
  if (!/localReviewLookup/.test(reviewerCode)) fail('reviewer authority has no persisted-review lookup seam');
  // The lookup must be invoked inside the per-row projection, not over the
  // whole corpus: a corpus-wide call would reintroduce the cost M5 removed.
  const projectStart = reviewerCode.indexOf('function projectEntry(');
  if (projectStart < 0) fail('reviewer authority per-row projection could not be located');
  const projectBody = reviewerCode.slice(projectStart);
  if (!/lookupLocalReview\(entry\.dossier\)/.test(projectBody)) fail('persisted review lookup is not performed per rendered row');

  // --- the binding builder is shared, not duplicated ---
  if (!/reviewBindingFor/.test(writeCode)) fail('review write authority does not use the shared binding builder');
  const collector = read('src/controlCenter/server/defaultCollector.ts');
  // Both the CALL and the IMPORT are refused. An unused import derives
  // nothing on its own, but it is the visible precursor to a second
  // derivation, and forbidding only the call leaves the boundary one line
  // away from being crossed silently.
  if (/findingArtifactDigest/.test(collector)) fail('the collector reaches a review-binding digest primitive of its own');
  if (/reviewBindingFor\s*\(|currentReviewArtifacts\s*\(/.test(collector)) fail('the collector derives a review binding of its own');
}

// Rule invocations live in the registered runner at the bottom of this file.
// The registry is the enumeration authority: definition/registration parity
// and per-rule probe coverage are enforced by checkRuleEngineSoundness.
function checkC15cSystemMapTransportBoundary() {
  const contract = readIncludingComments('src/controlCenter/contracts/systemMap.ts');
  const adapter = readIncludingComments('src/controlCenter/adapters/systemMapAdapter.ts');
  const router = readIncludingComments('src/controlCenter/server/router.ts');
  const server = readIncludingComments('src/controlCenter/server/server.ts');
  const ui = readIncludingComments('ui/control-center/src/App.tsx');
  const apiClient = readIncludingComments('ui/control-center/src/api.ts');
  const adapterCode = withoutComments(adapter);
  const uiCode = withoutComments(ui);

  // --- the map describes; it never acts ---
  for (const marker of ["executionAuthority: 'NONE'", "mutationAuthority: 'NONE'"]) {
    if (!adapterCode.includes(marker)) {
      fail(`C-15c the system map adapter must state ${marker} on the wire; a map is not a control panel`);
    }
  }
  if (/executionAuthority: '(?!NONE)/.test(adapterCode) || /mutationAuthority: '(?!NONE)/.test(adapterCode)) {
    fail('C-15c no system map answer may carry an authority other than NONE');
  }

  // --- a bound must be able to say "unknown" ---
  const boundDecl = /export interface ControlCenterProjectionBoundDto \{[\s\S]*?\n\}/.exec(contract);
  if (boundDecl === null) {
    fail('C-15c could not read ControlCenterProjectionBoundDto; the bound contract cannot be verified');
  } else {
    const bound = withoutComments(boundDecl[0]);
    for (const field of ['total', 'dropped']) {
      if (!new RegExp(`readonly ${field}: number \\| null;`).test(bound)) {
        fail(`C-15c ProjectionBoundDto.${field} must be nullable; when the population is unknown a drop count is unknowable, and a non-nullable number forces the transport to invent one`);
      }
    }
    if (!/readonly remainingUnknown: boolean;/.test(bound)) {
      fail('C-15c ProjectionBoundDto must carry remainingUnknown, distinguishing a counted drop from an unknown remainder');
    }
  }

  // --- the UI may not render an unknown as a number ---
  for (const coercion of ['total ?? 0', 'dropped ?? 0', 'total || 0', 'dropped || 0', 'Number(bound.total)', 'Number(bound.dropped)']) {
    if (uiCode.includes(coercion)) {
      fail(`C-15c the UI must not coerce an unknown bound to a number (found ${coercion}); a zero tells the operator they have seen everything`);
    }
  }
  if (!/bound\.total === null \? 'unknown'/.test(uiCode) || !/bound\.dropped === null \? 'unknown'/.test(uiCode)) {
    fail("C-15c the UI must render a null total and a null dropped count as 'unknown'");
  }

  // --- an absence of measurement is not a clean result ---
  if (!/measurement === 'UNMEASURED'/.test(uiCode)) {
    fail('C-15c the UI must distinguish UNMEASURED from measured-and-empty; an unmeasured emptiness is not a clean result');
  }

  // --- unknown addresses are rejected, never guessed ---
  if (!/SYSTEM_MAP_LEVEL_SEGMENTS/.test(router) || !/SYSTEM_MAP_QUERY_SEGMENTS/.test(router)) {
    fail('C-15c the router must resolve system map segments against a closed enum, never by pattern');
  }
  if (/startsWith\('\/api\/v2\/system-map/.test(withoutComments(router))) {
    fail('C-15c system map routes must match exact segments, not a prefix; a prefix match answers a question the operator did not ask');
  }

  // --- transport stays read-only, and v1 is never reinterpreted ---
  const serverCode = withoutComments(server);
  if (!/'GET'|'HEAD'/.test(serverCode)) {
    fail('C-15c the control center server must constrain verbs; the system map transport is GET/HEAD only');
  }
  for (const verb of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    if (new RegExp(`case '${verb}'`).test(serverCode)) {
      fail(`C-15c the control center server must not dispatch ${verb}`);
    }
  }

  // --- progressive disclosure is a transport property ---
  if (/\/api\/v2\/system-map\/all|fetchWholeMap|loadEntireSystemMap/.test(withoutComments(apiClient))) {
    fail('C-15c the client must request one disclosure level at a time; a whole-company payload filtered in the browser defeats bounded projection');
  }

  // --- the adapter projects; it never reaches out ---
  for (const forbidden of ['node:fs', 'node:child_process', 'node:net', 'node:https', 'node:http']) {
    if (adapter.includes(`from '${forbidden}'`)) {
      fail(`src/controlCenter/adapters/systemMapAdapter.ts must stay a pure projection (imports ${forbidden})`);
    }
  }
}

/**
 * F-16 rule-engine soundness self-check.
 *
 * Two mechanical facts about the checker itself:
 *
 *   1. A fail-if-absent matcher MUST NOT be applied directly to the raw
 *      accessor. `readIncludingComments` exists for negative (fail-if-present)
 *      rules and data files; a positive assertion satisfied by a literal that
 *      lives only in a comment is not an assertion at all. Reported per line.
 *      Scope: the scan covers matchers that name the accessor directly. It
 *      does not yet follow a local variable bound from the raw accessor; the
 *      five named conversion sites and every direct form are enforced here,
 *      and the alias population is recorded as remaining work rather than
 *      silently certified.
 *
 *   2. The rule registry is the enumeration authority. Every `check*`
 *      definition is registered exactly once, every registration names a real
 *      definition, every rule carries an explicit quantifier, a rule whose
 *      meaning is TOTALITY may not be implemented with a direct first-match
 *      extraction unless that singleton is recorded and justified, and every
 *      rule carries at least one recorded probe in the mutation registry.
 */
function checkRuleEngineSoundness() {
  const sourcePath = 'bin/hardening-check.mjs';
  let selfSource = '';
  try {
    selfSource = fs.readFileSync(path.join(root, sourcePath), 'utf8');
  } catch (error) {
    fail(`rule-engine self-check cannot read ${sourcePath}: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  const code = withoutComments(selfSource);

  // --- 1. fail-if-absent matcher over the raw accessor -------------------
  const patterns = [
    // !/re/.test(readIncludingComments(...)) or !x.test(readIncludingComments(...))
    { re: /!\s*(?:\/(?:\\.|[^/\\\n])*\/[a-z]*|new\s+RegExp\([^)\n]*\)|[A-Za-z_$][\w$.]*)\.(?:test|includes)\s*\(\s*readIncludingComments\s*\(/g, label: 'negated matcher over raw accessor' },
    // !readIncludingComments(...).includes(x) / .test(x)
    { re: /!\s*readIncludingComments\s*\([^)\n]*\)\.(?:test|includes)\s*\(/g, label: 'negated receiver over raw accessor' },
  ];
  for (const { re, label } of patterns) {
    for (const match of code.matchAll(re)) {
      const line = code.slice(0, match.index).split('\n').length;
      fail(`${sourcePath}:${line} applies a ${label}; a fail-if-absent assertion must call read() (code-only), never readIncludingComments()`);
    }
  }

  // --- 2. registry / definition parity ----------------------------------
  const definitions = [...selfSource.matchAll(/^function (check\w+)\(/gm)].map((match) => match[1]);
  const registered = REGISTERED_RULES.map((rule) => rule.name);
  const definedSet = new Set(definitions);
  const registeredSet = new Set(registered);
  if (definitions.length !== definedSet.size) fail('rule registry parity: a check function is defined more than once');
  if (REGISTERED_RULES.length === 0) {
    fail('rule registry is empty; the runner would report success vacuously');
    return;
  }
  for (const name of definitions) if (!registeredSet.has(name)) fail(`rule ${name} is defined but not registered; the registry is the enumeration authority`);
  for (const name of registered) if (!definedSet.has(name)) fail(`rule ${name} is registered but not defined`);
  if (REGISTERED_RULES.length < 70) fail(`rule registry carries only ${REGISTERED_RULES.length} rules; the registry is broken rather than the repository clean`);

  // --- 3. quantifier completeness and totality honesty ------------------
  const quantifiers = new Set(['EXISTENCE', 'TOTALITY']);
  const REGEX_LITERAL = String.raw`\/(?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^/\\\n])*\/[a-z]*`;
  const firstMatchRe = new RegExp(`((?:${REGEX_LITERAL})|(?:new\\s+RegExp\\([^)\\n]*\\)))\\s*\\.(exec|match)\\s*\\(`, 'g');
  const stringMatchRe = new RegExp(`[A-Za-z_$][\\w$.]*\\.match\\(\\s*(${REGEX_LITERAL})`, 'g');
  const regexFlags = (/** @type {string} */ literal) => {
    if (!literal.startsWith('/')) return literal.includes("'g'") ? 'g' : '';
    let inClass = false;
    for (let index = 1; index < literal.length; index += 1) {
      const character = literal[index];
      if (character === '\\') { index += 1; continue; }
      if (character === '[') { inClass = true; continue; }
      if (character === ']') { inClass = false; continue; }
      if (character === '/' && !inClass) return literal.slice(index + 1);
    }
    return '';
  };
  for (const rule of REGISTERED_RULES) {
    if (!quantifiers.has(rule.quantifier)) fail(`rule ${rule.name} does not declare a quantifier (EXISTENCE or TOTALITY)`);
    if (typeof rule.subject !== 'string' || rule.subject.trim().length < 8) fail(`rule ${rule.name} has no recorded subject`);
    const start = selfSource.indexOf(`function ${rule.name}(`);
    const end = start < 0 ? -1 : selfSource.indexOf('\nfunction ', start + 1);
    const body = start < 0 ? '' : withoutComments(selfSource.slice(start, end < 0 ? selfSource.length : end));
    for (const match of body.matchAll(firstMatchRe)) {
      if (regexFlags(match[1]).includes('g')) continue;
      if (rule.quantifier !== 'TOTALITY') continue;
      if (typeof rule.firstMatch === 'string' && rule.firstMatch.length > 0) continue;
      fail(`rule ${rule.name} is TOTALITY but uses a direct first-match .${match[2]}(...) with no recorded singleton justification (rule-engine :${code.slice(0, start + (match.index ?? 0)).split('\n').length})`);
    }
    for (const match of body.matchAll(stringMatchRe)) {
      if (regexFlags(match[1]).includes('g')) continue;
      if (rule.quantifier !== 'TOTALITY') continue;
      if (typeof rule.firstMatch === 'string' && rule.firstMatch.length > 0) continue;
      fail(`rule ${rule.name} is TOTALITY but uses a direct first-match String.match(...) with no recorded singleton justification`);
    }
  }

  // --- 4. every rule has a recorded probe -------------------------------
  let probeRegistry;
  try {
    probeRegistry = JSON.parse(fs.readFileSync(path.join(root, PROBE_REGISTRY_PATH), 'utf8'));
  } catch (error) {
    fail(`rule probe registry ${PROBE_REGISTRY_PATH} is unreadable: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  if (probeRegistry.schemaVersion !== 'nightwatch.hardening-rule-probes.v1') fail('rule probe registry schema/version is unsupported');
  const probes = probeRegistry.probes ?? {};
  for (const rule of REGISTERED_RULES) {
    const entry = probes[rule.name];
    if (!Array.isArray(entry) || entry.length === 0) fail(`rule ${rule.name} has no recorded negative probe`);
  }
  for (const name of Object.keys(probes)) {
    if (!registeredSet.has(name)) fail(`rule probe registry names an unregistered rule: ${name}`);
  }
}

/**
 * The rule registry: name, invariant family, quantifier, subject, and (only
 * where a first-match extraction is deliberately singleton) the recorded
 * justification. Order is the historical invocation order, so a plain run
 * emits failures in the same sequence it always has.
 */
const REGISTERED_RULES = [
  { name: 'checkChildProcessBoundaries', run: checkChildProcessBoundaries, family: 'process-boundaries', quantifier: 'TOTALITY', subject: 'every launcher bounds child execution and production source cannot reach shell-capable execution' },
  { name: 'checkReviewStoreBoundary', run: checkReviewStoreBoundary, family: 'review-store', quantifier: 'TOTALITY', subject: 'every private-store call, validator invocation, and error code in the review cone is allowlisted', firstMatch: 'the review file-name pattern declaration is a singleton constant' },
  { name: 'checkAgentProtocolBoundary', run: checkAgentProtocolBoundary, family: 'agent-protocol', quantifier: 'EXISTENCE', subject: 'the agent-protocol cone retains its purity and required validator/authority tokens' },
  { name: 'checkL6ProcessNetworkBoundary', run: checkL6ProcessNetworkBoundary, family: 'l6-containment', quantifier: 'EXISTENCE', subject: 'the L6 containment descriptor, AF_UNIX control protocol, and OOPS readiness gate remain present' },
  { name: 'checkTargetPolicy', run: checkTargetPolicy, family: 'target-policy', quantifier: 'TOTALITY', subject: 'every credentialed launcher enforces DEV-only execution and no bin references the unauthorized budget profile' },
  { name: 'checkTypecheckCoverage', run: checkTypecheckCoverage, family: 'typecheck-coverage', quantifier: 'EXISTENCE', subject: 'the root TypeScript configuration covers every Playwright root config' },
  { name: 'checkPrivateSurface', run: checkPrivateSurface, family: 'private-surface', quantifier: 'TOTALITY', subject: 'no tracked path can hold private runtime state and the ignore rules remain complete' },
  { name: 'checkAiReviewBoundary', run: checkAiReviewBoundary, family: 'ai-review', quantifier: 'TOTALITY', subject: 'every AI review module stays local, loopback-contained, and free of cloud/process/persistence authority' },
  { name: 'checkLocalCanaryBoundary', run: checkLocalCanaryBoundary, family: 'ai-review', quantifier: 'EXISTENCE', subject: 'the local canary controller and CLI keep their fixed fixture, counters, and thin-wrapper shape' },
  { name: 'checkAiInvocationAuthority', run: checkAiInvocationAuthority, family: 'ai-review', quantifier: 'TOTALITY', subject: 'every raw provider execution leaves through the budgeted AiReviewSession boundary' },
  { name: 'checkOwnerReviewCliBoundary', run: checkOwnerReviewCliBoundary, family: 'ai-review', quantifier: 'EXISTENCE', subject: 'the owner-review CLI stays TTY-confirmed, provider-free, and routes writes through the review service' },
  { name: 'checkImmutablePrivatePublication', run: checkImmutablePrivatePublication, family: 'private-artifacts', quantifier: 'EXISTENCE', subject: 'immutable publication uses atomic linkSync create-if-absent and every AI artifact write routes through it' },
  { name: 'checkOwnerDecisionAuthority', run: checkOwnerDecisionAuthority, family: 'owner-decision', quantifier: 'TOTALITY', subject: 'owner-decision write authority is reachable only through the confirmed internal helper and its CLI' },
  { name: 'checkSelfDevelopmentBoundary', run: checkSelfDevelopmentBoundary, family: 'self-dev', quantifier: 'TOTALITY', subject: 'every selfDev source stays inside the synthetic, provenance-bound, non-adopting boundary' },
  { name: 'checkSelfDevTrustRootClosure', run: checkSelfDevTrustRootClosure, family: 'self-dev', quantifier: 'TOTALITY', subject: 'every relative import of every SELFDEV_AUTHORITATIVE_PATHS member is itself listed', firstMatch: 'the authoritative path list is a singleton frozen declaration' },
  { name: 'checkPhase8BSandboxBoundary', run: checkPhase8BSandboxBoundary, family: 'self-dev-sandbox', quantifier: 'TOTALITY', subject: 'every sandbox module honors the owner gate, one-file changed bound, mirror confinement, and no-publication authority' },
  { name: 'checkPhase8B01CloseoutIntegrity', run: checkPhase8B01CloseoutIntegrity, family: 'self-dev-sandbox', quantifier: 'EXISTENCE', subject: 'sandbox-base validation ordering, single-strategy binding, and write accounting remain intact' },
  { name: 'checkPhase8B10PortfolioIntegrity', run: checkPhase8B10PortfolioIntegrity, family: 'self-dev-portfolio', quantifier: 'EXISTENCE', subject: 'the deterministic portfolio/contract versions and generated catalog shape remain intact' },
  { name: 'checkPhase8B1CanonicalPromotionBoundary', run: checkPhase8B1CanonicalPromotionBoundary, family: 'self-dev-promotion', quantifier: 'TOTALITY', subject: 'every promotion stage keeps the owner gate, one-shot approval, exact HEAD, and no-runtime-Git authority' },
  { name: 'checkC02bProtobufBoundary', run: checkC02bProtobufBoundary, family: 'c02b-protobuf', quantifier: 'TOTALITY', subject: 'every protobuf module is data-in/data-out, only the lexer sees raw source, and currency requires per-operation corroboration', firstMatch: 'the surface-corroboration declaration is a singleton literal' },
  { name: 'checkC03GrpcTopologyBoundary', run: checkC03GrpcTopologyBoundary, family: 'c03-grpc', quantifier: 'EXISTENCE', subject: 'the Go/gRPC topology classifies evidence as fact only when proven and never claims completeness from truncation' },
  { name: 'checkC04FrontendConsumerBoundary', run: checkC04FrontendConsumerBoundary, family: 'c04-frontend', quantifier: 'EXISTENCE', subject: 'frontend consumer modules are data-only and only literal/structural paths can be SOURCE_FACT' },
  { name: 'checkC15bSystemMapBoundary', run: checkC15bSystemMapBoundary, family: 'c15b-system-map', quantifier: 'TOTALITY', subject: 'the system map is deterministic, never upgrades evidence, reports exact drops, and grants no authority' },
  { name: 'checkC05UniverseAdmissionBoundary', run: checkC05UniverseAdmissionBoundary, family: 'c05-universe', quantifier: 'TOTALITY', subject: 'the owner-approved repository universe is exactly the declared set and admission has one authority', firstMatch: 'the OWNER_APPROVED_UNIVERSE declaration is a singleton object literal' },
  { name: 'checkC08DeploymentBindingBoundary', run: checkC08DeploymentBindingBoundary, family: 'c08-deployment', quantifier: 'TOTALITY', subject: 'every deployment-fact basis is declared forbidden, host matrix stays SOURCE_FACT, and no cluster is consulted', firstMatch: 'the forbidden-bases and binding-state declarations are singleton literals' },
  { name: 'checkC09SpecExpectationBoundary', run: checkC09SpecExpectationBoundary, family: 'c09-spec', quantifier: 'TOTALITY', subject: 'spec witnesses stay DOCUMENTARY, no prose becomes an assertion, and the classification vocabulary is complete', firstMatch: 'the expectation-class and scenario-classification declarations are singleton literals' },
  { name: 'checkC16EigBoundary', run: checkC16EigBoundary, family: 'c16-eig', quantifier: 'TOTALITY', subject: 'every EIG factor keeps UNKNOWN strictly mid-scale and the ranking grants no authority', firstMatch: 'each factor declaration is a singleton frozen object' },
  { name: 'checkC07DerivedSemanticsBoundary', run: checkC07DerivedSemanticsBoundary, family: 'c07-derived', quantifier: 'EXISTENCE', subject: 'method-only derivations stay UNKNOWN, conditional mutations stay mutations, and the hand-authored registry stays empty', firstMatch: 'each source classification case is a singleton switch arm' },
  { name: 'checkC15cSystemMapTransportBoundary', run: checkC15cSystemMapTransportBoundary, family: 'c15c-transport', quantifier: 'TOTALITY', subject: 'the transport is GET/HEAD only, bounds can say unknown, and no authority beyond NONE crosses the wire', firstMatch: 'the projection-bound DTO is a singleton interface declaration' },
  { name: 'checkCampaignCertificationRegistry', run: checkCampaignCertificationRegistry, family: 'campaign-certification', quantifier: 'TOTALITY', subject: 'every campaign in the task ledger is declared, exists, and is selected by a required gate lane' },
  { name: 'checkPlannerHandoffIntegrity', run: checkPlannerHandoffIntegrity, family: 'planner-handoff', quantifier: 'EXISTENCE', subject: 'the handoff protocol stays versioned, read-only, bounded, and package-exposed' },
  { name: 'checkDocumentationTruth', run: checkDocumentationTruth, family: 'documentation', quantifier: 'EXISTENCE', subject: 'live narratives do not contradict the machine-checked completion status', firstMatch: 'the project-completion status key is a singleton machine block' },
  { name: 'checkAgentContinuityIntegrity', run: checkAgentContinuityIntegrity, family: 'agent-continuity', quantifier: 'EXISTENCE', subject: 'the continuity checker stays read-only and the v2 protocol module stays pure' },
  { name: 'checkProjectStateIntegrity', run: checkProjectStateIntegrity, family: 'project-state', quantifier: 'EXISTENCE', subject: 'the project-state checker stays read-only and enforces the strict completion/CI/promotion schema' },
  { name: 'checkPhase9SemanticCorePurity', run: checkPhase9SemanticCorePurity, family: 'phase9-semantic', quantifier: 'TOTALITY', subject: 'every semantic core module is deterministic and free of AI/selfDev/Phase6/transport/persistence authority' },
  { name: 'checkPhase9IntegrationSeams', run: checkPhase9IntegrationSeams, family: 'phase9-semantic', quantifier: 'EXISTENCE', subject: 'the semantic hook, Phase 5 stage, dossier evidence, and protocol oracle wiring remain present' },
  { name: 'checkPhase9A1RealSourceCorePurity', run: checkPhase9A1RealSourceCorePurity, family: 'phase9a1-admission', quantifier: 'TOTALITY', subject: 'every recipe/extractor/admission/resolver/receipt core stays free of execution and I/O authority' },
  { name: 'checkPhase9A1SourceReaderBoundary', run: checkPhase9A1SourceReaderBoundary, family: 'phase9a1-admission', quantifier: 'TOTALITY', subject: 'the sibling source reader is the only fs-touching module and every coordinator stays beneath it' },
  { name: 'checkPhase9A1IntegrationSeams', run: checkPhase9A1IntegrationSeams, family: 'phase9a1-admission', quantifier: 'EXISTENCE', subject: 'the evaluation ledger, safe INTERNAL_ERROR receipt, and privacy escalation remain wired' },
  { name: 'checkPhase9bCorePurity', run: checkPhase9bCorePurity, family: 'phase9b', quantifier: 'TOTALITY', subject: 'the freshness/preflight/summary core performs no I/O or execution' },
  { name: 'checkPhase9bIntegrationSeams', run: checkPhase9bIntegrationSeams, family: 'phase9b', quantifier: 'EXISTENCE', subject: 'the Phase 9B runner keeps its one-shot gate, fixed journey, and selector refusals' },
  { name: 'checkPhase10DeeperContractPurity', run: checkPhase10DeeperContractPurity, family: 'phase10', quantifier: 'TOTALITY', subject: 'every deeper-contract core stays free of execution and I/O authority' },
  { name: 'checkPhase10IntegrationSeams', run: checkPhase10IntegrationSeams, family: 'phase10', quantifier: 'EXISTENCE', subject: 'the v2 recipe schema, type-flow extractor, invariant vocabulary, and historical archives remain wired' },
  { name: 'checkPhase10bCorePurity', run: checkPhase10bCorePurity, family: 'phase10b', quantifier: 'TOTALITY', subject: 'the deep-acceptance mechanics module stays pure' },
  { name: 'checkPhase10bIntegrationSeams', run: checkPhase10bIntegrationSeams, family: 'phase10b', quantifier: 'EXISTENCE', subject: 'the Phase 10B runner keeps its one-shot gate, fixed deep expectation, and historical Phase 9B shape' },
  { name: 'checkPhase12PureCoreBoundaries', run: checkPhase12PureCoreBoundaries, family: 'phase12', quantifier: 'TOTALITY', subject: 'every Phase 12 pure-core candidate is free of browser/network/process/DB/AI authority' },
  { name: 'checkPhase18PureCoreSeams', run: checkPhase18PureCoreSeams, family: 'phase18', quantifier: 'TOTALITY', subject: 'semantic replay/coverage/currentness cores stay pure and retain their bounded vocabulary' },
  { name: 'checkPhase12AuthoritySetsUnchanged', run: checkPhase12AuthoritySetsUnchanged, family: 'phase12', quantifier: 'TOTALITY', subject: 'approved/DEV-reachable target ids, the safe-action catalog version, and the canonical catalog count stay frozen', firstMatch: 'the DEV_REACHABLE_RECIPE_TARGET_IDS block is a singleton declaration; every membership and count assertion uses a global match over the whole file' },
  { name: 'checkPhase12TriageCorePurity', run: checkPhase12TriageCorePurity, family: 'phase12', quantifier: 'TOTALITY', subject: 'semantic triage/confidence/dossier/coverage/cluster cores stay pure' },
  { name: 'checkPhase12TriageIntegrationSeams', run: checkPhase12TriageIntegrationSeams, family: 'phase12', quantifier: 'EXISTENCE', subject: 'triage evidence, confidence blockers, dossier v2, and coverage dispositions remain wired' },
  { name: 'checkPhase22CorePurity', run: checkPhase22CorePurity, family: 'phase22', quantifier: 'TOTALITY', subject: 'every Phase 22 DTO/oracle module is deterministic and authority-free' },
  { name: 'checkPhase22IntegrationSeams', run: checkPhase22IntegrationSeams, family: 'phase22', quantifier: 'EXISTENCE', subject: 'the Phase 22 manifest bounds, preflight vocabulary, launcher gate, and operator scripts remain wired' },
  { name: 'checkPhase23QualityGate', run: checkPhase23QualityGate, family: 'phase23-quality-gate', quantifier: 'EXISTENCE', subject: 'the required gate groups, fixed entry points, workflow bounds, and empty-step rule remain intact', firstMatch: 'the workflow timeout declaration is a singleton' },
  { name: 'checkC00WorkspaceIntegrity', run: checkC00WorkspaceIntegrity, family: 'c00-workspace', quantifier: 'TOTALITY', subject: 'every session/worktree hygiene invariant is enforced and the canonical protection policy is not weakened' },
  { name: 'checkC10ProductionPrivacyBoundary', run: checkC10ProductionPrivacyBoundary, family: 'c10-privacy', quantifier: 'TOTALITY', subject: 'every production privacy cone module is authority-free and the persistence firewall/route provenance remain wired' },
  { name: 'checkC105ProvenanceAuthorityBoundary', run: checkC105ProvenanceAuthorityBoundary, family: 'c105-provenance', quantifier: 'TOTALITY', subject: 'only the trusted adapter can mint production vocabulary authority and the test-only seam stays test-only' },
  { name: 'checkR11ProxyGateReliability', run: checkR11ProxyGateReliability, family: 'r11-proxy-gate', quantifier: 'TOTALITY', subject: 'the proxy allocator keeps the real probe and the gate persists one confined atomic receipt' },
  { name: 'checkC11ProdObserveBoundary', run: checkC11ProdObserveBoundary, family: 'c11-prod-observe', quantifier: 'TOTALITY', subject: 'the production cone is import-isolated from DEV/NEXT paths and the admission chain retains every gate', firstMatch: 'the ordered admission-gate list is a singleton const array' },
  { name: 'checkP1ObservationScopeBoundary', run: checkP1ObservationScopeBoundary, family: 'p1-scope', quantifier: 'TOTALITY', subject: 'the P1 cone stays isolated, triply bounded, and attribution fails closed', firstMatch: 'the ordered P1 gate list is a singleton const array' },
  { name: 'checkAlphausHandoffBoundary', run: checkAlphausHandoffBoundary, family: 'ah1-handoff', quantifier: 'TOTALITY', subject: 'every handoff/readiness cone stays isolated, transport-free, and non-publishing' },
  { name: 'checkDeclaredDependencyResolvability', run: checkDeclaredDependencyResolvability, family: 'declared-dependencies', quantifier: 'TOTALITY', subject: 'every bare module specifier from tracked source is a declared dependency' },
  { name: 'checkC12RehearsalBoundary', run: checkC12RehearsalBoundary, family: 'c12-rehearsal', quantifier: 'TOTALITY', subject: 'the rehearsal cone stays local-only, synthetic-pinned, and occurrence-complete on live-authorization values', firstMatch: 'the readiness-version bound is a singleton constant' },
  { name: 'checkFindingFrontierBoundary', run: checkFindingFrontierBoundary, family: 'fc1-finding-review', quantifier: 'TOTALITY', subject: 'the finding review/intel cones stay advisory-only, local, and occurrence-complete on authority values' },
  { name: 'checkReviewerSurfaceBoundary', run: checkReviewerSurfaceBoundary, family: 'rs1-reviewer-surface', quantifier: 'TOTALITY', subject: 'the reviewer surface stays a pure projection, guards every advisory value, and tracks the AH-1 vocabulary', firstMatch: 'each AH-1 vocabulary declaration is a singleton array literal' },
  { name: 'checkDocumentationFreshness', run: checkDocumentationFreshness, family: 'documentation', quantifier: 'TOTALITY', subject: 'the current-state header date, MA-8 status, GREEN framing, and C-12 readiness never go stale', firstMatch: 'the header date is a singleton line' },
  { name: 'checkActiveMilestoneProgression', run: checkActiveMilestoneProgression, family: 'agent-continuity', quantifier: 'TOTALITY', subject: 'no PLAN milestone that STATE reports COMPLETE still reads NOT_STARTED or IN_PROGRESS', firstMatch: 'each plan milestone section is a singleton section' },
  { name: 'checkDecisionIdentityUniqueness', run: checkDecisionIdentityUniqueness, family: 'documentation', quantifier: 'TOTALITY', subject: 'every duplicated decision number is recorded in the erratum with every colliding title', firstMatch: 'the exec is applied per line inside a loop over every line of the document, so every heading is evaluated' },
  { name: 'checkHostCapabilityMatrix', run: checkHostCapabilityMatrix, family: 'host-capability', quantifier: 'TOTALITY', subject: 'every declared dependency is assessed and every probed capability token is named in the matrix' },
  { name: 'checkValidationUniverse', run: checkValidationUniverse, family: 'validation-universe', quantifier: 'TOTALITY', subject: 'every discovered executable test or check is classified exactly once and the digest does not drift' },
  { name: 'checkSyntax', run: checkSyntax, family: 'syntax', quantifier: 'TOTALITY', subject: 'every top-level bin parses as an ES module' },
  { name: 'checkCliImplementationContract', run: checkCliImplementationContract, family: 'cli-contract', quantifier: 'TOTALITY', subject: 'every loader call site names a string literal path that resolves and exports what the call site reads' },
  { name: 'checkBinExecutionCoverage', run: checkBinExecutionCoverage, family: 'bin-execution', quantifier: 'TOTALITY', subject: 'every top-level bin entry point is executed as a process by at least one test' },
  { name: 'checkRuleEngineSoundness', run: checkRuleEngineSoundness, family: 'rule-engine', quantifier: 'TOTALITY', subject: 'no fail-if-absent matcher uses the raw accessor and registry/probe/quantifier invariants hold' },
];

/**
 * The rule mutation campaign: apply each recorded probe to real guarded
 * source, run only the probed rule, and require a detected failure. Bytes are
 * restored in a finally and verified afterwards; `git status --porcelain` must
 * be unchanged from before the run.
 */
function runRuleProbeCampaign() {
  let registry;
  try {
    registry = JSON.parse(fs.readFileSync(path.join(root, PROBE_REGISTRY_PATH), 'utf8'));
  } catch (error) {
    console.error(`[probe] cannot read ${PROBE_REGISTRY_PATH}: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return;
  }
  const probes = registry.probes ?? {};
  const statusBefore = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8', env: childEnvironment, timeout: 30_000, maxBuffer: 8 * 1024 * 1024 });
  /** @type {Map<string, Buffer>} */
  const originals = new Map();
  let detectedCount = 0;
  let failureCount = 0;
  let probeCount = 0;
  const campaignRules = onlyRule === undefined ? REGISTERED_RULES : REGISTERED_RULES.filter((rule) => rule.name === onlyRule);
  for (const rule of campaignRules) {
    const entries = probes[rule.name];
    if (!Array.isArray(entries) || entries.length === 0) {
      console.log(`[probe] ${rule.name} UNPROVEN (no recorded probe)`);
      failureCount += 1;
      continue;
    }
    let detected = false;
    let usedId = '';
    for (const probe of entries) {
      probeCount += 1;
      const touched = [];
      detected = false;
      usedId = probe.id ?? '(unnamed)';
      try {
        for (const op of Array.isArray(probe.ops) ? probe.ops : []) {
          const absolute = path.join(root, op.file);
          if (!originals.has(absolute)) originals.set(absolute, fs.readFileSync(absolute));
          let text = fs.readFileSync(absolute, 'utf8');
          if (typeof op.search === 'string') {
            const occurrences = text.split(op.search).length - 1;
            if (occurrences < 1) throw new Error(`search literal found ${occurrences} times in ${op.file}`);
            if (occurrences !== 1 && op.all !== true) throw new Error(`search literal occurs ${occurrences} times in ${op.file}; set all:true to probe every occurrence`);
            text = op.all === true ? text.split(op.search).join(op.replace ?? '') : text.replace(op.search, op.replace ?? '');
          } else if (typeof op.append === 'string') {
            text += op.append;
          } else if (typeof op.prepend === 'string') {
            text = op.prepend + text;
          } else {
            throw new Error('unknown probe operation (expected search/replace, append or prepend)');
          }
          fs.writeFileSync(absolute, text);
          touched.push(absolute);
        }
        const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), `--only=${rule.name}`], {
          cwd: root, encoding: 'utf8', env: childEnvironment, timeout: 120_000, maxBuffer: 16 * 1024 * 1024,
        });
        if (result.status !== 0) {
          detected = true;
          usedId = probe.id ?? '(unnamed)';
        }
      } catch (error) {
        console.log(`[probe] ${rule.name} PROBE_ERROR ${probe.id ?? '(unnamed)'}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        for (const absolute of touched) fs.writeFileSync(absolute, /** @type {Buffer} */ (originals.get(absolute)));
      }
      if (detected) {
        detectedCount += 1;
        console.log(`[probe] ${rule.name} DETECTED ${usedId}`);
      } else {
        failureCount += 1;
        console.log(`[probe] ${rule.name} UNDETECTED ${usedId}`);
      }
    }
  }
  let restoreFailures = 0;
  for (const [absolute, bytes] of originals) {
    if (!fs.readFileSync(absolute).equals(bytes)) {
      restoreFailures += 1;
      console.error(`[probe] RESTORE_FAILED ${path.relative(root, absolute)}`);
    }
  }
  const statusAfter = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8', env: childEnvironment, timeout: 30_000, maxBuffer: 8 * 1024 * 1024 });
  const statusUnchanged = (statusAfter.stdout ?? '') === (statusBefore.stdout ?? '');
  if (!statusUnchanged) {
    const beforeLines = new Set((statusBefore.stdout ?? '').split('\n'));
    const afterLines = new Set((statusAfter.stdout ?? '').split('\n'));
    for (const line of beforeLines) if (line && !afterLines.has(line)) console.error(`[probe] STATUS_BEFORE_ONLY ${line}`);
    for (const line of afterLines) if (line && !beforeLines.has(line)) console.error(`[probe] STATUS_AFTER_ONLY ${line}`);
  }
  console.log(`[probe] rules=${campaignRules.length} probes=${probeCount} detected=${detectedCount} undetected=${failureCount} restored=${originals.size} statusUnchanged=${statusUnchanged}`);
  process.exitCode = campaignRules.length === 0 || failureCount > 0 || restoreFailures > 0 || !statusUnchanged ? 1 : 0;
}

const onlyArgument = process.argv.find((argument) => argument.startsWith('--only='));
const onlyRule = onlyArgument?.slice('--only='.length);
if (process.argv.includes('--list-rules')) {
  const probeRegistry = JSON.parse(fs.readFileSync(path.join(root, PROBE_REGISTRY_PATH), 'utf8'));
  console.log(JSON.stringify({
    schemaVersion: 'nightwatch.hardening-rule-registry.v1',
    count: REGISTERED_RULES.length,
    rules: REGISTERED_RULES.map((rule) => ({
      name: rule.name, family: rule.family, quantifier: rule.quantifier, subject: rule.subject,
      probeCount: (probeRegistry.probes?.[rule.name] ?? []).length,
    })),
  }, null, 2));
  process.exit(0);
} else if (process.argv.includes('--probe-campaign')) {
  runRuleProbeCampaign();
} else {
  if (onlyRule !== undefined && !REGISTERED_RULES.some((rule) => rule.name === onlyRule)) {
    console.error(`[hardening:check] ERROR: --only names an unregistered rule: ${onlyRule}`);
    process.exitCode = 2;
  } else {
    for (const rule of REGISTERED_RULES) {
      if (onlyRule !== undefined && rule.name !== onlyRule) continue;
      rule.run();
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`[hardening:check] ERROR: ${error}`);
  console.error(`[hardening:check] FAIL (${errors.length} error${errors.length === 1 ? '' : 's'})`);
  process.exitCode = process.exitCode === 2 ? 2 : 1;
} else if (process.exitCode === undefined) {
  console.log('[hardening:check] PASS: offline structural invariants hold');
}
