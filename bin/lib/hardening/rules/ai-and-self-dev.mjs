#!/usr/bin/env node
// @ts-check

/**
 * Invariant family: AI review, owner decision, and self-development authority.
 *
 * The shared property is AUTHORITY CONTAINMENT: provider execution, owner
 * decision writes, sandbox adoption and canonical promotion each have exactly
 * one approved call site, and every other tracked source is proven not to
 * reach them.
 */

import fs from 'node:fs';
import path from 'node:path';
import typescript from 'typescript';
import {
  root,
  fail,
  withoutComments,
  readIncludingComments,
  read,
  readCommentText,
  readDataFile,
  gitFiles,
  isRuleEngineSource,
} from '../kernel.mjs';

export function checkAiReviewBoundary() {
  const aiDirectory = path.join(root, 'src/core/aiReview');
  const aiFiles = fs.existsSync(aiDirectory)
    ? fs.readdirSync(aiDirectory).filter((file) => file.endsWith('.ts')).map((file) => `src/core/aiReview/${file}`)
    : [];
  if (aiFiles.length === 0) {
    fail('Phase 7B AI review source is missing');
    return;
  }
  const aiSources = aiFiles.map((file) => [file, readIncludingComments(file)]);
  const packageJson = readDataFile('package.json');
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
  const loopbackCode = read('src/core/aiReview/loopbackProvider.ts');
  if (!/validateLoopbackEndpoint/.test(loopbackCode) || !/LOOPBACK_HOSTS/.test(loopbackCode) || !/agent:\s*false/.test(loopbackCode) || !/statusCode !== 200/.test(loopbackCode)) fail('loopback provider containment is incomplete');
  if (!/context\.signal\.aborted/.test(loopbackCode) || !/signal\.addEventListener\(['"]abort['"]/.test(loopbackCode) || !/destroyRequest/.test(loopbackCode)) fail('loopback provider does not actively consume the session AbortSignal');
  const synthetic = readIncludingComments('src/core/aiReview/syntheticProvider.ts');
  const syntheticCode = read('src/core/aiReview/syntheticProvider.ts');
  if (!/pendingCount/.test(syntheticCode) || !/signal\.addEventListener\(['"]abort['"]/.test(syntheticCode)) fail('synthetic PENDING provider does not clean up on AbortSignal');
  const pipeline = readIncludingComments('src/core/aiReview/pipeline.ts');
  const pipelineCode = read('src/core/aiReview/pipeline.ts');
  if (!/assertOwnerPolicyAllows\('AI_REVIEW_LOCAL'\)/.test(pipelineCode) || !/assertOwnerPolicyAllows\('AI_ORACLE_SUGGESTION_LOCAL'\)/.test(pipelineCode) || !/AI_PROVIDER_NOT_LOCAL/.test(pipelineCode)) fail('AI pipeline is missing explicit owner/local provider gates');
  if (!/performance\.now\(\)/.test(pipelineCode) || /options\.clock\s*\?\?\s*\(\)\s*=>\s*Date\.now\(\)/.test(pipeline)) fail('AI runtime budget must use a monotonic default clock');
  if (!/signal:\s*AbortSignal/.test(pipelineCode) || !/timeoutMs:\s*number/.test(pipelineCode) || !/controller\.abort\(\)/.test(pipelineCode) || !/remainingRuntimeMs/.test(pipelineCode)) fail('AI provider boundary is missing monotonic deadline cancellation context');
  const storage = readIncludingComments('src/core/aiReview/storage.ts');
  const storageCode = read('src/core/aiReview/storage.ts');
  if (!/PrivateArtifactStore/.test(storageCode) || !/writeImmutableJson/.test(storageCode)) fail('AI artifacts are not routed through immutable private storage');
  if (/writeIncomplete\s*\(|\.writeJson\s*\(/.test(storage)) fail('AI immutable artifacts retain a replacement-capable write path');
  if (/aiReview|AI_REVIEW/i.test(readIncludingComments('bin/phase7-real.mjs'))) fail('Phase 7 real launcher must not invoke AI review');
  for (const file of gitFiles().filter((item) => item.startsWith('src/core/campaign/') || item.startsWith('src/oracles/'))) {
    if (/aiReview|AI_REVIEW/i.test(readIncludingComments(file))) fail(`${file} imports or references AI review authority`);
  }
  if (!/SYNTHETIC_LOCAL.*LOOPBACK_LOCAL/.test(read('src/core/aiReview/types.ts').replace(/\s+/g, ' '))) fail('AI provider class allowlist is not local-only');
}

export function checkLocalCanaryBoundary() {
  const controller = readIncludingComments('src/core/aiReview/localCanary.ts');
  const controllerCode = read('src/core/aiReview/localCanary.ts');
  const cli = readIncludingComments('bin/ai-local-canary.mjs');
  const cliCode = read('bin/ai-local-canary.mjs');
  if (!controller || !cli) return;
  const reviewCalls = controller.match(/\bsession\.reviewBugCandidate\s*\(/g) ?? [];
  if (reviewCalls.length !== 1) fail(`local canary has ${reviewCalls.length} review calls; expected exactly one`);
  if (/\bsuggestOracle\s*\(|new\s+AiReviewArtifactStore|AiReviewArtifactStore|\bstore\s*:/.test(controller)) fail('local canary exposes oracle or artifact-store authority');
  if (/from\s+['"][^'"]*(?:campaign|browser|auth|product|finding|database|data\/phase6|git)[^'"]*['"]/i.test(controller)) fail('local canary imports a product or authority path');
  if (/\b(?:fetch|http\.request|https\.request|net\.connect|WebSocket|child_process|spawn|exec(?:File)?|process\.env|readDir|readdir)\b/i.test(controller)) fail('local canary controller contains an unapproved transport, process, or filesystem capability');
  if (!/fixedSyntheticCanaryInput/.test(controllerCode) || !/LOCAL_CANARY_INPUT_VERSION/.test(controllerCode) || !/LOCAL_CANARY_OPERATION/.test(controllerCode)) fail('local canary fixed fixture identity is missing');
  if (!/new\s+LoopbackAiReviewProvider/.test(controllerCode) || !/new\s+AiReviewSession/.test(controllerCode)) fail('local canary does not construct the hardened loopback/session path');
  if (!/candidateReviewAttempts\s*!==\s*0/.test(controllerCode) || !/oracleSuggestionAttempts\s*!==\s*0/.test(controllerCode) || !/providerCalls\s*!==\s*0/.test(controllerCode)) fail('local canary is missing the pre-call counter invariant');
  if (!/candidateReviewAttempts\s*!==\s*1/.test(controllerCode) || !/oracleSuggestionAttempts\s*!==\s*0/.test(controllerCode) || !/providerCalls\s*!==\s*1/.test(controllerCode)) fail('local canary is missing the post-call counter invariant');
  if (!/artifactPath:\s*null/.test(controllerCode) || !/rawModelOutputPersisted:\s*0/.test(controllerCode)) fail('local canary does not enforce in-memory/no-persistence result metadata');
  for (const forbidden of ['--prompt', '--file', '--input-json', '--artifact-id', '--finding-id', '--customer-data', '--system-prompt', '--temperature', '--tools', '--functions', '--stream', '--output', '--publish', '--git', '--browser', '--campaign', '--auth']) {
    if (cli.includes(forbidden)) fail(`local canary CLI exposes forbidden option ${forbidden}`);
  }
  if (/\b(?:fetch|http\.request|https\.request|net\.connect|WebSocket|child_process|spawn|exec(?:File)?|process\.env|readDir|readdir)\b/i.test(cli)) fail('local canary CLI contains an unapproved transport, process, or filesystem capability');
  if (!/parseLocalCanaryArgs/.test(cliCode) || !/runSingleLocalCanary/.test(cliCode) || !/formatLocalCanaryPass/.test(cliCode)) fail('local canary CLI is not a thin controller wrapper');
}

export function selfDevelopmentSourceFiles() {
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
export function checkSelfDevTrustRootClosure() {
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

export function checkSelfDevelopmentBoundary() {
  const files = selfDevelopmentSourceFiles();
  if (files.length === 0) {
    fail('Phase 8A self-development source is missing');
    return;
  }
  const sources = files.map((file) => [file, readIncludingComments(file)]);
  const combined = sources.map(([, source]) => source).join('\n');
  const provenanceManifest = read('src/core/selfDev/provenanceManifest.ts');
  for (const file of files) {
    if (!provenanceManifest.includes(`'${file}'`)) fail(`authoritative provenance manifest omits tracked selfDev source ${file}`);
  }
  const provenance = readIncludingComments('src/core/provenance/localGit.ts');
  const provenanceCode = read("src/core/provenance/localGit.ts");
  if (!/spawnSync\('git', \[\.\.\.args\]/.test(provenanceCode) || !/shell:\s*false/.test(provenanceCode) || !/timeout:\s*5_000/.test(provenanceCode) || !/maxBuffer:\s*512 \* 1024/.test(provenanceCode)) {
    fail('read-only local Git provenance boundary is not fixed-argv, no-shell, and bounded');
  }
  if (!/GIT_OPTIONAL_LOCKS:\s*'0'/.test(provenanceCode)) fail('read-only local Git provenance does not disable optional Git locks');
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
  const proposerCode = read("src/core/selfDev/proposer.ts");
  if (!/class\s+SyntheticDeterministicProposer/.test(proposerCode)) fail('Phase 8A does not have the sole synthetic deterministic proposer');
  if (/class\s+(?:Local|Cloud|Remote|Agent)[A-Za-z]*Proposer/.test(combined)) fail('Phase 8A contains an unauthorized proposer class');
  const registry = readIncludingComments('src/core/selfDev/registry.ts');
  const registryCode = read("src/core/selfDev/registry.ts");
  if (!/SELFDEV_ACTIONS/.test(registryCode) || !/SELFDEV_ASSERTIONS/.test(registryCode) || !/resolveSelfDevAction/.test(registryCode) || !/resolveSelfDevAssertion/.test(registryCode)) fail('Phase 8A action/assertion allowlists are missing');
  if (/\b(?:callback|executable\s*:\s*true|new\s+Function)\b/i.test(registry)) fail('Phase 8A registry exposes executable candidate behavior');
  const controller = readIncludingComments('src/core/selfDev/controller.ts');
  const controllerCode = read("src/core/selfDev/controller.ts");
  const storage = readIncludingComments('src/core/selfDev/storage.ts');
  const storageCode = read("src/core/selfDev/storage.ts");
  if (!/SELF_DEVELOPMENT_SYNTHETIC_EVALUATION|SELFDEV_SYNTHETIC_BASE_NIGHTWATCH_SHA/.test(controllerCode)) fail('Phase 8A controller lacks its narrow owner/synthetic boundary');
  if (!/PrivateArtifactStore/.test(storageCode) || !/writeImmutableJson/.test(storageCode)) fail('Phase 8A private results do not use the hardened immutable private store');
  if (!/validateSessionArtifact/.test(storageCode) || !/replaySession/.test(storageCode) || !/readBack/.test(storageCode)) fail('Phase 8A.1 persistence is missing strict pre-write or read-back replay gates');
  if (!/SELFDEV_PROVENANCE_REQUIRED/.test(controllerCode) || !/provenance/.test(controllerCode)) fail('Phase 8A.1 persistent controller does not require injected provenance');
  const validation = readIncludingComments('src/core/selfDev/validation.ts');
  const validationCode = read("src/core/selfDev/validation.ts");
  if (!/sessionArtifactIdFor/.test(validationCode) || !/assertEvaluationStateInvariant/.test(validationCode) || !/SELFDEV_SESSION_ARTIFACT_SCHEMA_VERSION/.test(validationCode)) fail('Phase 8A.1 validation lacks v2 content identity or semantic state invariants');
  const replay = readIncludingComments('src/core/selfDev/replay.ts');
  const replayCode = read("src/core/selfDev/replay.ts");
  if (!/canonicalJson\(actual\)/.test(replayCode) || !/proposals\[index\]/.test(replayCode) || !/DeterministicReplayClock/.test(replayCode)) fail('Phase 8A.1 replay is not ordered, exact, and clock-controlled');
  const trust = readIncludingComments('src/core/selfDev/trust.ts');
  const trustCode = read("src/core/selfDev/trust.ts");
  if (!/VERIFIED_EXACT_BASE/.test(trustCode) || !/VERIFIED_SOURCE_EQUIVALENT_DESCENDANT/.test(trustCode) || !/LEGACY_UNVERIFIED_NOT_ELIGIBLE/.test(trustCode)) fail('Phase 8A.1 trust assessment is missing currentness or legacy quarantine');
  if (!/assessFutureReviewEligibility/.test(trustCode)) fail('Phase 8A.1.1 canonical future-review eligibility gate is missing');
  if (!/Number\.isInteger/.test(trustCode)) fail('Phase 8A.1.1 eligibility prerequisite does not validate pass-count shape at runtime');
  if (!/current:\s*CurrentSelfDevSourceView/.test(trustCode)) fail('Phase 8A.1.1 eligibility gate does not require a current-source view parameter');
  if (!/SELFDEV_PRIVATE_NAMESPACE/.test(storageCode) || !/self-development/.test(storageCode)) fail('Phase 8A private results lack a separate namespace');
  if (!/NOT_AUTHORIZED_PHASE_8A/.test(combined) || !/EVALUATED_PASS_NOT_ADOPTED/.test(combined) || !/PROHIBITED/.test(combined)) fail('Phase 8A result lacks explicit no-adoption/publication authority');
  const cli = readIncludingComments('bin/selfdev-synthetic.mjs');
  const cliCode = read("bin/selfdev-synthetic.mjs");
  if (!/parseArgs/.test(cliCode) || !/runSyntheticSelfDevSession/.test(cliCode)) fail('Phase 8A CLI is not a thin synthetic controller wrapper');
  if (/\b(?:child_process|fetch\s*\(|http\.request|https\.request|net\.connect|WebSocket|git\s+(?:add|commit|push|apply)|AiReview|owner-review|database|production|NIGHTWATCH_STORAGE_STATE)\b/i.test(cli)) fail('Phase 8A CLI exposes a prohibited capability');
  if (/fs\.(?:write|append|rename|unlink|rm|copy|mkdir|link)/i.test(cli)) fail('Phase 8A CLI contains a filesystem-write path');
  if (!/readLocalNightwatchProvenance/.test(cliCode)) fail('Phase 8A synthetic CLI does not derive local Git/source provenance');
  const verifyCli = readIncludingComments('bin/selfdev-verify.mjs');
  const verifyCliCode = read("bin/selfdev-verify.mjs");
  if (!/--artifact-id/.test(verifyCliCode) || !/readOnly:\s*true/.test(verifyCliCode) || !/assessSelfDevArtifactIntegrity/.test(verifyCliCode)) fail('Phase 8A.1 verifier CLI lacks exact-ID read-only assessment');
  if (/(?:--latest|--all|--list|--root|--output|--patch|--adopt|--apply|--commit|--push|--model|--prompt|--url|--repo|--force)/.test(verifyCli) && !/SELFDEV_VERIFY_USAGE_INVALID/.test(verifyCliCode)) fail('Phase 8A.1 verifier CLI does not reject broad selection or mutation options');
  const provenanceCli = readIncludingComments('bin/selfdev-provenance.mjs');
  const provenanceCliCode = read("bin/selfdev-provenance.mjs");
  if (!/readLocalNightwatchProvenance/.test(provenanceCliCode) || /node:child_process|fs\.(?:write|append|rename|unlink|rm|copy|mkdir|link)/i.test(provenanceCli)) fail('read-only provenance CLI boundary is incomplete');
  const index = readIncludingComments('src/core/selfDev/index.ts');
  if (/export\s+\*\s+from\s+['"]\.\/storage['"]/.test(index) || /createSessionArtifact/.test(index)) fail('selfDev public index exposes a raw artifact constructor or storage wildcard');
  const ownerPolicy = read('src/core/policy/ownerScope.ts');
  if (!/SELF_DEVELOPMENT_SYNTHETIC_EVALUATION/.test(ownerPolicy)) fail('Phase 8A lacks a distinct owner-policy capability');
}

export function selfDevSandboxSourceFiles() {
  const directory = path.join(root, 'src', 'core', 'selfDevSandbox');
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => path.join('src', 'core', 'selfDevSandbox', entry.name))
    .sort();
}

export function checkPhase8BSandboxBoundary() {
  const files = selfDevSandboxSourceFiles();
  if (files.length === 0) {
    fail('Phase 8B sandbox adoption source is missing');
    return;
  }
  const sources = files.map((file) => [file, readIncludingComments(file)]);
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
  const loader = readIncludingComments('src/core/selfDevSandbox/sandboxLoader.ts');
  const loaderCode = read("src/core/selfDevSandbox/sandboxLoader.ts");
  const bareRequires = loader.match(/requireFn\(\s*'([^./][^']*)'\s*\)/g) ?? [];
  for (const occurrence of bareRequires) {
    if (!/'typescript'/.test(occurrence)) fail(`sandbox loader requires an unapproved bare module: ${occurrence}`);
  }
  if (!/loadInFlight/.test(loaderCode) || !/SELFDEV_SANDBOX_LOADER_BUSY/.test(loaderCode)) fail('sandbox loader is missing its serial-execution lock');
  if (!/resolvedSandboxRoot/.test(loaderCode) || !/SELFDEV_SANDBOX_LOADER_PATH_ESCAPE/.test(loaderCode)) fail('sandbox loader is missing its path-confinement check');
  if (!/delete requireFn\.cache/.test(loaderCode)) fail('sandbox loader does not clear its module cache');

  const mirror = readIncludingComments('src/core/selfDevSandbox/sandboxMirror.ts');
  const mirrorCode = read("src/core/selfDevSandbox/sandboxMirror.ts");
  if (!/SELFDEV_AUTHORITATIVE_PATHS/.test(mirrorCode)) fail('sandbox mirror does not copy the fixed authoritative source set');
  if (!/isSymbolicLink/.test(mirrorCode)) fail('sandbox mirror is missing symlink rejection');
  if (!/mode:\s*0o700/.test(mirrorCode) || !/mode:\s*0o600/.test(mirrorCode)) fail('sandbox mirror does not use owner-only directory/file permissions');
  if (!/resolvedBase\s*\+\s*path\.sep/.test(mirrorCode)) fail('sandbox cleanup does not confine deletion to the fixed sandbox base');

  const planner = readIncludingComments('src/core/selfDevSandbox/planner.ts');
  const plannerCode = read("src/core/selfDevSandbox/planner.ts");
  if (!/assessFutureReviewEligibility/.test(plannerCode)) fail('Phase 8B planner does not consume the canonical future-review eligibility gate');
  if (!/SELF_DEVELOPMENT_SANDBOX_ADOPTION/.test(plannerCode)) fail('Phase 8B planner is missing its owner-policy gate');
  if (!/ALREADY_ADOPTED/.test(plannerCode) || !/CATALOG_FULL/.test(plannerCode) || !/CATALOG_NONCANONICAL/.test(plannerCode)) fail('Phase 8B planner is missing a required fail-closed gate');
  if (!/sourceBundleDigestBefore\s*!==\s*plan\.sourceBundleDigestBefore/.test(plannerCode) && !/current\.sourceBundleDigest\s*!==\s*plan\.sourceBundleDigestBefore/.test(plannerCode)) {
    fail('Phase 8B planner is missing TOCTOU source-bundle revalidation');
  }

  const executor = readIncludingComments('src/core/selfDevSandbox/sandboxExecutor.ts');
  const executorCode = read("src/core/selfDevSandbox/sandboxExecutor.ts");
  if (!/SELF_DEVELOPMENT_SANDBOX_ADOPTION/.test(executorCode)) fail('Phase 8B sandbox executor is missing its owner-policy gate');
  if (!/revalidatePlan/.test(executorCode)) fail('Phase 8B sandbox executor does not revalidate the plan before mutation');
  if (!/diffSandboxAgainstCanonical/.test(executorCode) || !/changedFiles\.length\s*!==\s*1/.test(executorCode)) fail('Phase 8B sandbox executor does not enforce exactly one changed file');
  if (!/cleanupSandboxMirror/.test(executorCode)) fail('Phase 8B sandbox executor does not clean up its sandbox mirror');
  // The four metamorphic-probe verdicts are proved by the shared pure
  // src/core/selfDev/metamorphicProbes.ts implementation (Phase 8B.1 extracted
  // it so canonical verification can reuse the same proof logic); the
  // executor must still be the one invoking it.
  const metamorphicProbes = readIncludingComments('src/core/selfDev/metamorphicProbes.ts');
  const metamorphicProbesCode = read("src/core/selfDev/metamorphicProbes.ts");
  if (!/runMetamorphicProbes/.test(executorCode)) fail('Phase 8B sandbox executor does not invoke the shared metamorphic proof implementation');
  if (!/REJECTED_DUPLICATE/.test(metamorphicProbesCode) || !/EVALUATED_PASS_NOT_ADOPTED/.test(metamorphicProbesCode) || !/REJECTED_SAFETY/.test(metamorphicProbesCode)) {
    fail('shared metamorphic proof implementation is missing a required probe verdict');
  }
  if (!/SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED/.test(combined) || !/canonicalApply:\s*'PROHIBITED'/.test(combined) || !/publication:\s*'PROHIBITED'/.test(combined)) {
    fail('Phase 8B sandbox result lacks explicit non-canonical/no-publication authority');
  }

  const storage = readIncludingComments('src/core/selfDevSandbox/storage.ts');
  const storageCode = read("src/core/selfDevSandbox/storage.ts");
  if (!/PrivateArtifactStore/.test(storageCode) || !/writeImmutableJson/.test(storageCode)) fail('Phase 8B plan/result storage does not use the hardened immutable private store');
  if (/\.writeJson\s*\(|writeIncomplete\s*\(/.test(storage)) fail('Phase 8B plan/result storage retains a replacement-capable write path');

  // G14.9 resolved the Phase 8B public `index.ts` barrel as REMOVED: its
  // `setSandboxBaseOverrideForTests` test seam must never be re-exported, so a
  // barrel cannot be the only door. The plan/run entry points are still
  // asserted directly on `planner.ts` and `sandboxExecutor.ts` above, and the
  // approved-caller scan below still polices every reach into this module.

  const ownerPolicy = read('src/core/policy/ownerScope.ts');
  if (!/SELF_DEVELOPMENT_SANDBOX_ADOPTION/.test(ownerPolicy)) fail('Phase 8B lacks a distinct owner-policy capability');

  const cli = readIncludingComments('bin/selfdev-adopt-sandbox.mjs');
  const cliCode = read("bin/selfdev-adopt-sandbox.mjs");
  if (!/inspectSelfDevAdoption/.test(cliCode) || !/planAdoption/.test(cliCode) || !/runSandboxAdoption/.test(cliCode)) fail('Phase 8B CLI is not a thin wrapper over inspect/plan/run');
  if (!/SANDBOX_ONLY/.test(cliCode)) fail('Phase 8B CLI is missing its fixed confirmation token');
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
    .filter((file) => !approvedCallers.has(file) && !isRuleEngineSource(file) && !file.startsWith('tests/'));
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

export function checkOwnerDecisionAuthority() {
  const index = readIncludingComments('src/core/aiReview/index.ts');
  if (/export\s+\*\s+from\s+['"]\.\/ownerReview['"]/.test(index)) fail('AI public index wildcard-exports owner review authority');
  if (/ownerDecision|recordOwnerDecision|recordConfirmedOwnerDecision|createHumanReviewRecord/.test(index)) fail('AI public index exposes owner-decision write authority');

  const internal = 'src/core/aiReview/ownerDecision.ts';
  const internalSource = readIncludingComments(internal);
  const internalSourceCode = read(internal);
  if (!/function\s+recordOwnerDecision\s*\(/.test(internalSourceCode) || /export\s+function\s+recordOwnerDecision\s*\(/.test(internalSource)) fail('raw unconfirmed owner decision helper is not private');
  if (!/export\s+function\s+recordConfirmedOwnerDecision\s*\(/.test(internalSourceCode) || !/confirmationMatches\(/.test(internalSourceCode) || !/expectedArtifactDigest/.test(internalSourceCode)) fail('internal owner decision boundary is missing confirmation/digest requirements');

  const sourceFiles = gitFiles()
    .filter((file) => (file.startsWith('src/') || file.startsWith('bin/')) && /\.(?:ts|mjs|js)$/.test(file))
    .filter((file) => !isRuleEngineSource(file) && file !== internal && file !== 'src/core/aiReview/review.ts');
  for (const file of sourceFiles) {
    const source = readIncludingComments(file);
    if (file !== 'bin/ai-owner-review.mjs' && /[\'\"]ownerDecision\.ts[\'\"]|recordConfirmedOwnerDecision|\bcreateHumanReviewRecord\s*\(|\.writeHumanReview\s*\(/.test(source)) fail(`${file} reaches owner-decision write authority outside the approved boundary`);
  }
  const cli = read('bin/ai-owner-review.mjs');
  if (!/ownerDecision\.ts/.test(cli) || !/recordConfirmedOwnerDecision/.test(cli)) fail('owner-review CLI is not the sole internal owner-decision loader');
  if (!/process\.stdin\.isTTY/.test(cli) || !/process\.stdout\.isTTY/.test(cli)) fail('owner-review CLI is missing its TTY boundary');
  if (!/A = approve draft, R = reject, S = supersede, Q = cancel/.test(cli)) fail('owner-review CLI fixed decision menu is missing');
  if (!/Type \$\{token\} to confirm exactly/.test(cli)) fail('owner-review CLI exact second confirmation is missing');
}

export function checkAiInvocationAuthority() {
  const pipeline = readIncludingComments('src/core/aiReview/pipeline.ts');
  const pipelineCode = read('src/core/aiReview/pipeline.ts');
  const index = readIncludingComments('src/core/aiReview/index.ts');
  const indexCode = read('src/core/aiReview/index.ts');
  if (/export\s+(?:async\s+)?function\s+(?:reviewBugCandidate|suggestOracle)\b/.test(pipeline)) fail('AI pipeline exports an unbudgeted provider execution function');
  if (/export\s+\*\s+from\s+['"]\.\/pipeline['"]/.test(index) || /export\s*\{[^}]*\b(?:reviewBugCandidate|suggestOracle)\b[^}]*\}/s.test(index)) fail('AI public index exposes a raw provider execution function');
  if (!/export\s*\{\s*AiReviewSession\s*\}\s*from\s+['"]\.\/pipeline['"]/.test(indexCode)) fail('AiReviewSession is not the explicit public provider execution boundary');
  if (!/class\s+AiReviewSession/.test(pipelineCode) || !/private\s+reserveProviderCall/.test(pipelineCode) || !/this\.providerCalls\s*\+=\s*1/.test(pipelineCode)) fail('AI session does not contain the canonical synchronous provider reservation');

  const sourceFiles = gitFiles()
    .filter((file) => (file.startsWith('src/') || file.startsWith('bin/')) && /\.(?:ts|mjs|js)$/.test(file))
    .filter((file) => !isRuleEngineSource(file));
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

export function checkOwnerReviewCliBoundary() {
  const file = 'bin/ai-owner-review.mjs';
  const source = readIncludingComments(file);
  const sourceCode = read(file);
  if (!source) return;
  if (!sourceCode.includes('ownerReview.ts')) fail(`${file} does not load the provider-free owner-review service`);
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
  if (!/record(?:Confirmed)?OwnerDecision/.test(sourceCode) || !/AiReviewArtifactStore/.test(sourceCode)) fail(`${file} does not route its sole write through owner-review service/storage`);
}

/**
 * Phase 8B.0.1 closeout integrity: sandbox-base pre-validation ordering,
 * single-strategy binding, complete verified-result metamorphic invariants,
 * and truthful sandbox write accounting. Behavioral tests are primary; these
 * structural assertions guard the same invariants at source level.
 */
export function checkPhase8B01CloseoutIntegrity() {
  const mirror = readIncludingComments('src/core/selfDevSandbox/sandboxMirror.ts');
  const mirrorCode = read("src/core/selfDevSandbox/sandboxMirror.ts");
  if (!/ensurePrivateSandboxBase/.test(mirrorCode)) fail('8B.0.1: sandbox mirror lacks the validated base-establishment routine');
  if (!/firstMissingPathnameComponent/.test(mirrorCode)) fail('8B.0.1: sandbox mirror lacks component-wise pathname-chain validation');
  if (!/SELFDEV_SANDBOX_BASE_SYMLINK/.test(mirrorCode) || !/SELFDEV_SANDBOX_BASE_NOT_DIRECTORY/.test(mirrorCode) || !/SELFDEV_SANDBOX_BASE_ANCESTOR_MISSING/.test(mirrorCode)) {
    fail('8B.0.1: sandbox mirror lacks fail-closed chain validation codes');
  }
  if (!/_PERMISSIONS_UNSAFE/.test(mirrorCode) || !/_OWNER/.test(mirrorCode)) {
    fail('8B.0.1: sandbox mirror lacks owner/permission fail-closed validation');
  }
  // The validated base MUST be established before any instance mutation.
  if (!/function createSandboxMirror[\s\S]{0,200}?ensurePrivateSandboxBase\(\);[\s\S]{0,200}?mkdtempSync/.test(mirrorCode)) {
    fail('8B.0.1: createSandboxMirror does not validate the base chain before mkdtemp');
  }
  // Parent mode tightening (established convention) may only chmod a path
  // already proven to be a non-symlink owner-matched directory.
  if (!/function ensureOwnerPrivateDirectory[\s\S]*?assertNoSymlink[\s\S]*?chmodSync/.test(mirrorCode)) {
    fail('8B.0.1: parent repair chmod may precede symlink/owner validation');
  }
  // The base itself must never be chmodded by the establishment routine.
  if (/function ensurePrivateSandboxBase[\s\S]{0,1200}?chmodSync/.test(mirror)) {
    fail('8B.0.1: ensurePrivateSandboxBase chmods a pathname');
  }
  // Cleanup stays confined to the validated base (mirror root strict child).
  if (!/resolvedRoot === resolvedBase \|\| !resolvedRoot\.startsWith\(resolvedBase \+ path\.sep\)/.test(mirrorCode)) {
    fail('8B.0.1: cleanup does not require strict containment beneath the validated base');
  }

  const validation = readIncludingComments('src/core/selfDevSandbox/validation.ts');
  const validationCode = read("src/core/selfDevSandbox/validation.ts");
  if (!/SELFDEV_ADOPTION_STRATEGY_CLASS/.test(validationCode)) fail('8B.0.1: plan/result validation does not bind the single strategy constant');
  if (!/PLAN_STRATEGY_MISMATCH/.test(validationCode)) fail('8B.0.1: plan/adopted-case strategy cross-binding is missing');
  if (!/result\.nonOverreachResult !== 'PASS'/.test(validationCode)) fail('8B.0.1: verified-result invariant does not require the non-overreach proof PASS');
  if (!/result\.sandboxSourceWrites > 1/.test(validationCode)) fail('8B.0.1: sandbox write count is not bounded to at most one');
  if (!/NON_OVERREACH_PROBE_UNAVAILABLE/.test(validationCode)) fail('8B.0.1: NON_OVERREACH_PROBE_UNAVAILABLE is not a valid failure class');

  const executor = readIncludingComments('src/core/selfDevSandbox/sandboxExecutor.ts');
  const executorCode = read("src/core/selfDevSandbox/sandboxExecutor.ts");
  if (!/let sandboxSourceWrites = 0/.test(executorCode) || !/sandboxSourceWrites = 1/.test(executorCode)) fail('8B.0.1: executor does not track actual sandbox writes');
  if (/sandboxSourceWrites:\s*[01],/.test(executor)) fail('8B.0.1: executor hardcodes the sandbox write count instead of the tracked value');
  if (!/probes\.nonOverreachResult === 'NOT_RUN'/.test(executorCode) || !/NON_OVERREACH_PROBE_UNAVAILABLE/.test(executorCode)) fail('8B.0.1: executor does not fail closed when the non-overreach probe is unavailable');
  if (!/probes\.nonOverreachResult === 'FAIL'/.test(executorCode) || !/NON_OVERREACH_REGRESSION/.test(executorCode)) fail('8B.0.1: executor does not distinguish a failed non-overreach probe');

  const types = read('src/core/selfDevSandbox/types.ts');
  if (!/NON_OVERREACH_PROBE_UNAVAILABLE/.test(types)) fail('8B.0.1: failure-class union lacks NON_OVERREACH_PROBE_UNAVAILABLE');
  if (!/SelfDevAdoptionStrategyClass/.test(types)) fail('8B.0.1: plan/result strategyClass is not the literal single-strategy type');

  const loader = readIncludingComments('src/core/selfDevSandbox/sandboxLoader.ts');
  const loaderCode = read("src/core/selfDevSandbox/sandboxLoader.ts");
  if (!/finally\s*\{[\s\S]{0,500}?loadInFlight = false/.test(loaderCode)) fail('8B.0.1: sandbox loader lock is not released on every exit path');

  // G14.9 removed the Phase 8B boundary `index.ts`; the test-only
  // `setSandboxBaseOverrideForTests` seam now has no public barrel to leak
  // into, and the sandbox mirror's own confinement checks below still apply.

  const adoptedCases = read('src/core/selfDev/adoptedCases.ts');
  if (!/SelfDevAdoptionStrategyClass/.test(adoptedCases)) fail('8B.0.1: the single strategy class lacks a literal exported type');
}

export function selfDevPromotionSourceFiles() {
  const directory = path.join(root, 'src', 'core', 'selfDevPromotion');
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => path.join('src', 'core', 'selfDevPromotion', entry.name))
    .sort();
}

export function checkPhase8B1CanonicalPromotionBoundary() {
  const files = selfDevPromotionSourceFiles();
  if (files.length === 0) {
    fail('Phase 8B.1 canonical promotion source is missing');
    return;
  }
  const sources = files.map((file) => [file, readIncludingComments(file)]);
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

  const prepare = readIncludingComments('src/core/selfDevPromotion/prepare.ts');
  const prepareCode = read("src/core/selfDevPromotion/prepare.ts");
  if (!/SELF_DEVELOPMENT_CANONICAL_ADOPTION/.test(prepareCode)) fail('Phase 8B.1 prepare is missing its owner-policy gate');
  if (!/assertRepositoryFullyClean/.test(prepareCode)) fail('Phase 8B.1 prepare does not require whole-repository cleanliness');
  if (!/assessFutureReviewEligibility/.test(prepareCode)) fail('Phase 8B.1 prepare does not consume the canonical future-review eligibility gate');
  if (!/ALREADY_ADOPTED/.test(prepareCode)) fail('Phase 8B.1 prepare is missing its already-adopted fail-closed gate');

  const approve = readIncludingComments('src/core/selfDevPromotion/approve.ts');
  const approveCode = read("src/core/selfDevPromotion/approve.ts");
  if (!/SELF_DEVELOPMENT_CANONICAL_ADOPTION/.test(approveCode)) fail('Phase 8B.1 approve is missing its owner-policy gate');
  if (!/SELFDEV_CANONICAL_PROMOTION_APPROVAL_CONFIRMATION/.test(approveCode)) fail('Phase 8B.1 approve does not require the fixed confirmation token');
  if (!/assertRepositoryFullyClean/.test(approveCode)) fail('Phase 8B.1 approve does not require whole-repository cleanliness');
  if (!/PROMOTION_SOURCE_ADVANCED/.test(approveCode)) fail('Phase 8B.1 approve does not fail closed when source has advanced');

  const apply = readIncludingComments('src/core/selfDevPromotion/apply.ts');
  const applyCode = read("src/core/selfDevPromotion/apply.ts");
  if (!/SELF_DEVELOPMENT_CANONICAL_ADOPTION/.test(applyCode)) fail('Phase 8B.1 apply is missing its owner-policy gate');
  if (!/claimApprovalConsumption/.test(applyCode)) fail('Phase 8B.1 apply is missing one-shot approval consumption');
  // The FIRST claim call must precede the LAST invocation of the write
  // helper, so consumption is always claimed strictly before the canonical
  // write is attempted.
  const claimIndex = apply.indexOf('claimApprovalConsumption(');
  const writeIndex = apply.lastIndexOf('atomicWriteTarget(');
  if (claimIndex < 0 || writeIndex < 0 || claimIndex > writeIndex) fail('Phase 8B.1 apply does not consume the approval before the canonical write');
  if (!/isSymbolicLink/.test(applyCode)) fail('Phase 8B.1 apply is missing symlink rejection on the canonical target');
  if (!/originalMode/.test(applyCode) || !/chmodSync\(temporary, mode\)/.test(applyCode)) fail('Phase 8B.1 apply does not preserve the target file mode');
  if (!/TARGET_PATH_ESCAPE/.test(applyCode)) fail('Phase 8B.1 apply is missing parent-path containment');
  if (!/PROMOTION_SOURCE_ADVANCED/.test(applyCode)) fail('Phase 8B.1 apply does not require the exact prepared HEAD');
  if (!/ALREADY_ADOPTED/.test(applyCode)) fail('Phase 8B.1 apply is missing its already-adopted fail-closed gate');
  if (!/CHANGESET_INVALID/.test(applyCode)) fail('Phase 8B.1 apply does not verify the post-write changeset');
  if (!/APPLIED_RECEIPT_PERSIST_FAILED/.test(applyCode)) fail('Phase 8B.1 apply does not surface a truthful receipt-persistence failure');

  const verify = readIncludingComments('src/core/selfDevPromotion/verify.ts');
  const verifyCode = read("src/core/selfDevPromotion/verify.ts");
  if (!/SELF_DEVELOPMENT_CANONICAL_ADOPTION/.test(verifyCode)) fail('Phase 8B.1 verify is missing its owner-policy gate');
  if (!/HEAD_ADVANCED/.test(verifyCode)) fail('Phase 8B.1 verify does not require the exact pre-commit HEAD');
  if (!/UNEXPECTED_CHANGESET/.test(verifyCode) || !/UNEXPECTED_STAGED_CHANGE/.test(verifyCode) || !/UNEXPECTED_UNTRACKED_FILE/.test(verifyCode)) {
    fail('Phase 8B.1 verify does not require exactly one dirty tracked file');
  }
  if (!/runMetamorphicProbes/.test(verifyCode)) fail('Phase 8B.1 verify does not reuse the shared metamorphic proof implementation');

  if (!/CANONICAL_APPLIED_VERIFIED_UNCOMMITTED/.test(combined) || !/NOT_PERFORMED_BY_RUNTIME/.test(combined) || !/NOT_AUTHORIZED/.test(combined)) {
    fail('Phase 8B.1 canonical promotion lacks explicit uncommitted/no-runtime-Git authority markers');
  }

  const storage = readIncludingComments('src/core/selfDevPromotion/storage.ts');
  const storageCode = read("src/core/selfDevPromotion/storage.ts");
  if (!/PrivateArtifactStore/.test(storageCode) || !/writeImmutableJson/.test(storageCode)) fail('Phase 8B.1 promotion storage does not use the hardened immutable private store');
  if (/\.writeJson\s*\(|writeIncomplete\s*\(/.test(storage)) fail('Phase 8B.1 promotion storage retains a replacement-capable write path');
  if (!/claimApprovalConsumption/.test(storageCode)) fail('Phase 8B.1 storage is missing the approval one-shot consumption primitive');

  const index = readIncludingComments('src/core/selfDevPromotion/index.ts');
  const indexCode = read("src/core/selfDevPromotion/index.ts");
  if (!/applyPromotion/.test(indexCode) || !/preparePromotion/.test(indexCode) || !/approvePromotion/.test(indexCode) || !/verifyCanonicalPromotion/.test(indexCode)) {
    fail('Phase 8B.1 public index is missing a required entry point');
  }

  const cli = readIncludingComments('bin/selfdev-promote-canonical.mjs');
  const cliCode = read("bin/selfdev-promote-canonical.mjs");
  if (!/preparePromotion/.test(cliCode) || !/approvePromotion/.test(cliCode) || !/applyPromotion/.test(cliCode) || !/verifyCanonicalPromotion/.test(cliCode)) {
    fail('Phase 8B.1 CLI is not a thin wrapper over prepare/approve/apply/verify');
  }
  if (!/CANONICAL_ONE_FILE_ONLY/.test(cliCode)) fail('Phase 8B.1 CLI is missing its fixed approval confirmation token');
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
    .filter((file) => !approvedCallers.has(file) && !isRuleEngineSource(file) && !file.startsWith('tests/'));
  for (const file of otherSources) {
    const source = readIncludingComments(file);
    if (/\bapplyPromotion\s*\(|\bSelfDevCanonicalApplyReceiptStore\b|\bSelfDevCanonicalPromotionApprovalStore\b/.test(source)) {
      fail(`${file} reaches Phase 8B.1 canonical-promotion authority outside the approved boundary`);
    }
    if (/from\s+['"][^'"]*selfDevPromotion[^'"]*['"]/.test(source)) fail(`${file} imports the Phase 8B.1 canonical-promotion boundary outside its approved callers`);
  }
}

export function checkPhase8B10PortfolioIntegrity() {
  // Phase 8B.1.0 — bounded deterministic proposal portfolio.
  const portfolio = readIncludingComments('src/core/selfDev/portfolio.ts');
  const portfolioCode = read("src/core/selfDev/portfolio.ts");
  if (!/SELFDEV_SYNTHETIC_PORTFOLIO_VERSION/.test(portfolioCode) || !/SELFDEV_SELECTION_ALGORITHM_VERSION/.test(portfolioCode)) {
    fail('Phase 8B.1.0 portfolio version or selection-algorithm version is missing');
  }
  if (!/deriveAdoptedCaseCoverage/.test(portfolioCode) || !/selfDevEquivalentFingerprint/.test(portfolioCode)) {
    fail('Phase 8B.1.0 portfolio must derive coverage/fingerprints from the trusted registry/validation, never free data');
  }
  if (!/SELFDEV_BASELINE_COVERAGE/.test(portfolioCode)) fail('Phase 8B.1.0 selection must consider the built-in baseline coverage');
  if (/(?:new\s+Function|eval\s*\(|process\.env|Date\.now|Math\.random|performance\.now|node:(?:child_process|fs|net|http|https|dns|tls)|fetch\s*\()/i.test(portfolio)) {
    fail('Phase 8B.1.0 portfolio contains an executable/random/time/network capability');
  }
  if (!/Object\.freeze/.test(portfolioCode)) fail('Phase 8B.1.0 portfolio is not frozen declarative data');

  const proposer = readIncludingComments('src/core/selfDev/proposer.ts');
  const proposerCode = read("src/core/selfDev/proposer.ts");
  const types = read('src/core/selfDev/types.ts');
  if (!/VALID_MATRIX_EXPAND/.test(proposerCode) || !/VALID_MATRIX_EXPAND_COLLAPSE/.test(proposerCode)) {
    fail('Phase 8B.1.0 proposer lacks the concrete portfolio matrix fixtures');
  }
  if (!/VALID_MATRIX_EXPAND/.test(types) || !/VALID_MATRIX_EXPAND_COLLAPSE/.test(types)) {
    fail('Phase 8B.1.0 replay-fixture enum lacks the concrete portfolio fixtures');
  }

  const controller = readIncludingComments('src/core/selfDev/controller.ts');
  const controllerCode = read("src/core/selfDev/controller.ts");
  if (!/selectNextSyntheticProposalVariant/.test(controllerCode)) fail('Phase 8B.1.0 controller does not consume the deterministic portfolio selector');
  if (!/VALID_MATRIX_EXPAND_COLLAPSE/.test(controllerCode)) fail('Phase 8B.1.0 controller does not resolve the default alias to a concrete portfolio fixture');

  const contract = readIncludingComments('src/core/selfDev/contract.ts');
  const contractCode = read("src/core/selfDev/contract.ts");
  if (!/syntheticPortfolioVersion/.test(contractCode) || !/syntheticSelectionAlgorithmVersion/.test(contractCode) || !/syntheticProposalPortfolio/.test(contractCode)) {
    fail('Phase 8B.1.0 contract manifest does not bind the portfolio/selection semantics');
  }
  if (!/nightwatch\.selfdev-contract\.private\.v2/.test(contractCode)) fail('Phase 8B.1.0 contract manifest version was not deliberately advanced to v2');

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
  const catalogCodeOnly = read("src/core/selfDev/adoptedCaseCatalog.generated.ts");
  // Comment-text subject: the required literal IS the generated-file header.
  if (!/^\/\/ GENERATED FILE/.test(readCommentText('src/core/selfDev/adoptedCaseCatalog.generated.ts'))) fail('the real canonical adopted-case catalog lost its generated-file header');
  const catalogCode = catalog.split('\n').filter((line) => !line.trim().startsWith('//'));
  if (/^\s*(?:import|require)\b|function\s+|=>|eval\s*\(|process\.|new\s+Function\s*\(/.test(catalogCode.join('\n'))) {
    fail('the real canonical adopted-case catalog contains executable code');
  }
  if (!/export const SELFDEV_ADOPTED_CASES = (?:\[\]|\[)/.test(catalogCodeOnly)) {
    fail('the real canonical adopted-case catalog does not declare the pure-data SELFDEV_ADOPTED_CASES array literal');
  }
  const integrityBin = read('bin/selfdev-catalog-integrity.mjs');
  if (!/validateAdoptedCatalog/.test(integrityBin) || !/renderAdoptedCatalogSource/.test(integrityBin)) {
    fail('bin/selfdev-catalog-integrity.mjs must reuse validateAdoptedCatalog/renderAdoptedCatalogSource');
  }
  const workflow = readDataFile('.github/workflows/hardening.yml');
  const gateDefinition = readDataFile('config/quality-gate.v1.json');
  if (!(/Phase 8B\.1 catalog integrity \/ checkout cleanliness/.test(workflow) && /selfdev-catalog-integrity\.mjs/.test(workflow)) && !(/npm run gate:ci/.test(workflow) && /PATCH_INTEGRITY/.test(gateDefinition))) {
    fail('the authoritative quality gate must retain catalog/checkout integrity through PATCH_INTEGRITY');
  }
}

export function checkAgentProtocolBoundary() {
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
  const ownerCode = read("src/core/policy/ownerScope.ts");
  if (!/AUTONOMOUS_AGENT_LOCAL/.test(ownerCode)) fail('owner scope is missing AUTONOMOUS_AGENT_LOCAL');
  const finding = read('src/core/agentProtocol/finding.ts');
  for (const literal of ["humanReviewRequired: true", "externalPublication: 'PROHIBITED'", 'autoLeslie: false']) {
    if (!finding.includes(literal)) fail(`autonomous finding authority is missing ${literal}`);
  }
}
