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
  if (!/PrivateArtifactStore/.test(storage) || !/writeIncomplete/.test(storage)) fail('AI artifacts are not routed through private incomplete-to-ready storage');
  if (/aiReview|AI_REVIEW/i.test(read('bin/phase7-real.mjs'))) fail('Phase 7 real launcher must not invoke AI review');
  for (const file of gitFiles().filter((item) => item.startsWith('src/core/campaign/') || item.startsWith('src/oracles/'))) {
    if (/aiReview|AI_REVIEW/i.test(read(file))) fail(`${file} imports or references AI review authority`);
  }
  if (!/SYNTHETIC_LOCAL.*LOOPBACK_LOCAL/.test(read('src/core/aiReview/types.ts').replace(/\s+/g, ' '))) fail('AI provider class allowlist is not local-only');
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
    if (file !== 'src/core/aiReview/pipeline.ts' && /\.\s*(?:reviewBugCandidate|suggestOracle)\s*\(/.test(source)) fail(`${file} directly invokes a raw AI provider operation`);
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
checkAiInvocationAuthority();
checkOwnerReviewCliBoundary();
checkSyntax();

if (errors.length > 0) {
  for (const error of errors) console.error(`[hardening:check] ERROR: ${error}`);
  console.error(`[hardening:check] FAIL (${errors.length} error${errors.length === 1 ? '' : 's'})`);
  process.exitCode = 1;
} else {
  console.log('[hardening:check] PASS: offline structural invariants hold');
}
