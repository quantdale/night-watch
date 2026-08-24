#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Phase 23 fresh-manifest and bounded DEV operator surface.
//
// `manifest` re-derives source contracts through the existing Phase 22
// admission bridge, then emits a new Phase 23 v2 manifest. The intermediate
// Phase 22 value is never accepted by this command as execution authority.
// `dry-run` is deterministic and contact-free. `execute` remains guarded by
// the exact-head authority path and is intentionally not a discovery surface.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKSPACE_ROOT = path.resolve(ROOT, '..', '..');

function fail(code) {
  throw new Error(`PHASE23_OPERATOR_BLOCKED:${code}`);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') { args.help = true; continue; }
    if (!arg.startsWith('--')) { args._.push(arg); continue; }
    const index = arg.indexOf('=');
    if (index < 0) fail('FLAGS_REQUIRE_EQUALS');
    const key = arg.slice(2, index);
    if (!/^[a-z][a-z0-9-]{0,48}$/.test(key) || Object.hasOwn(args, key)) fail('UNKNOWN_OR_DUPLICATE_FLAG');
    args[key] = arg.slice(index + 1);
  }
  return args;
}

function loadTypeScriptModule(file) {
  const require = createRequire(import.meta.url);
  const typescript = require('typescript');
  const previous = require.extensions['.ts'];
  require.extensions['.ts'] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    const output = typescript.transpileModule(source, {
      fileName: filename,
      compilerOptions: { target: typescript.ScriptTarget.ES2022, module: typescript.ModuleKind.CommonJS, moduleResolution: typescript.ModuleResolutionKind.Node10, esModuleInterop: true, skipLibCheck: true },
    }).outputText;
    module._compile(output, filename);
  };
  try { return require(path.join(ROOT, file)); }
  finally {
    if (previous === undefined) delete require.extensions['.ts'];
    else require.extensions['.ts'] = previous;
  }
}

function currentHead() {
  try {
    const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', timeout: 10_000, maxBuffer: 64 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    const value = result.status === 0 ? result.stdout.trim() : '';
    if (!/^[0-9a-f]{40}$/.test(value)) fail('NIGHTWATCH_SHA_UNAVAILABLE');
    return value;
  } catch { fail('NIGHTWATCH_SHA_UNAVAILABLE'); }
}

function externalRegularFile(file, label) {
  if (typeof file !== 'string' || !path.isAbsolute(file)) fail(`${label}_MUST_BE_ABSOLUTE`);
  const resolved = path.resolve(file);
  if (resolved === ROOT || resolved.startsWith(ROOT + path.sep) || resolved === WORKSPACE_ROOT || resolved.startsWith(WORKSPACE_ROOT + path.sep)) fail(`${label}_MUST_BE_EXTERNAL`);
  try {
    const stat = fs.lstatSync(resolved);
    if (!stat.isFile() || stat.isSymbolicLink()) fail(`${label}_NOT_REGULAR`);
    return resolved;
  } catch { fail(`${label}_UNAVAILABLE`); }
}

function sourceSnapshotDirectory(snapshot) {
  if (typeof snapshot !== 'string' || !path.isAbsolute(snapshot)) fail('SOURCE_SNAPSHOT_MUST_BE_ABSOLUTE');
  try {
    const resolved = fs.realpathSync(snapshot);
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) fail('SOURCE_SNAPSHOT_NOT_DIRECTORY');
    if (resolved === ROOT || resolved.startsWith(ROOT + path.sep) || resolved === WORKSPACE_ROOT || resolved.startsWith(WORKSPACE_ROOT + path.sep)) fail('SOURCE_SNAPSHOT_MUST_BE_EXTERNAL');
    return resolved;
  } catch { fail('SOURCE_SNAPSHOT_UNAVAILABLE'); }
}

function safeJson(file, label) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { fail(`${label}_INVALID_JSON`); }
}

function writeSafeOutput(file, value) {
  if (file === undefined) return;
  const output = externalRegularFileForWrite(file, 'OUTPUT');
  fs.writeFileSync(output, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
}

function externalRegularFileForWrite(file, label) {
  if (typeof file !== 'string' || !path.isAbsolute(file)) fail(`${label}_MUST_BE_ABSOLUTE`);
  const resolved = path.resolve(file);
  if (resolved === ROOT || resolved.startsWith(ROOT + path.sep) || resolved === WORKSPACE_ROOT || resolved.startsWith(WORKSPACE_ROOT + path.sep)) fail(`${label}_MUST_BE_EXTERNAL`);
  if (fs.existsSync(resolved)) {
    const stat = fs.lstatSync(resolved);
    if (stat.isSymbolicLink() || !stat.isFile()) fail(`${label}_NOT_REGULAR`);
  }
  return resolved;
}

function readGateReceipt(file, head) {
  const receipt = safeJson(externalRegularFile(file, 'QUALITY_GATE_RECEIPT'), 'QUALITY_GATE_RECEIPT');
  if (receipt.schemaVersion !== 'nightwatch.quality-gate-receipt.v1' || receipt.finalResult !== 'PASS' || receipt.gitHead !== head || typeof receipt.receiptDigest !== 'string' || !/^receipt:sha256:[0-9a-f]{24}$/.test(receipt.receiptDigest) || typeof receipt.gateDefinitionDigest !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(receipt.gateDefinitionDigest)) fail('QUALITY_GATE_RECEIPT_NOT_EXACT_PASS');
  return receipt;
}

function buildManifest(args) {
  if (args.all !== undefined) fail('DYNAMIC_TARGET_DISCOVERY_FORBIDDEN');
  const snapshot = sourceSnapshotDirectory(args.snapshot);
  const sourceSha = args['source-sha'];
  if (typeof sourceSha !== 'string' || !/^[0-9a-f]{40}$/.test(sourceSha)) fail('SOURCE_SHA_REQUIRED');
  const head = currentHead();
  const receipt = readGateReceipt(args['gate-receipt'], head);
  const child = spawnSync(process.execPath, [
    path.join(ROOT, 'bin', 'phase22-dev.mjs'),
    'manifest',
    `--snapshot=${snapshot}`,
    `--source-sha=${sourceSha}`,
    `--nightwatch-sha=${head}`,
  ], { cwd: ROOT, encoding: 'utf8', timeout: 300_000, maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  if (child.status !== 0 || child.error) fail('SOURCE_DERIVATION_FAILED');
  let derived;
  try { derived = JSON.parse(child.stdout); }
  catch { fail('SOURCE_DERIVATION_RECEIPT_INVALID'); }
  if (derived?.manifest?.schemaVersion !== 'nightwatch.dev-semantic-acceptance-manifest.v1' || derived.manifest.nightwatchSha !== head) fail('HISTORICAL_DERIVATION_BRIDGE_INVALID');
  const phase23 = loadTypeScriptModule('src/core/phase23/manifest.ts');
  const targets = derived.manifest.targets.map((target) => ({
    targetId: target.targetId,
    product: target.product,
    productSurfaceId: target.targetId,
    journeyOrApiAdapter: target.journeyOrApiAdapter,
    expectationId: target.expectationId,
    projectionId: target.projectionIdentity,
    runtimeAdapterId: target.journeyOrApiAdapter,
    source: target.source,
    materialClass: target.materialClass,
    anticipatedInvariantCount: target.anticipatedInvariantCount,
    replay: { firstCount: 1, maxAdditionalContexts: 1, freshContext: true },
    privacy: { rawValuesPersisted: false, rawDomPersisted: false, screenshotsPersisted: false, tracesPersisted: false },
    observation: { mutationAllowed: false, dynamicTargetDiscovery: false },
  }));
  const manifest = phase23.createPhase23Manifest({
    nightwatchSha: head,
    qualityGate: {
      receiptSchemaVersion: receipt.schemaVersion,
      receiptDigest: receipt.receiptDigest,
      gateDefinitionDigest: receipt.gateDefinitionDigest,
      gitHead: receipt.gitHead,
      finalResult: 'PASS',
    },
    targets,
    exclusions: derived.manifest.exclusions.map((exclusion) => ({ targetId: exclusion.targetId, reasonCode: exclusion.reasonCode })),
  });
  writeSafeOutput(args.out, manifest);
  process.stdout.write(JSON.stringify({
    schemaVersion: manifest.schemaVersion,
    manifestId: manifest.manifestId,
    deterministicDigest: manifest.deterministicDigest,
    nightwatchSha: manifest.nightwatchSha,
    sourceSha,
    targetCount: manifest.targets.length,
    excludedCount: manifest.exclusions.length,
    qualityGateReceiptDigest: manifest.qualityGate.receiptDigest,
    gateDefinitionDigest: manifest.qualityGate.gateDefinitionDigest,
    sourceDerivation: derived.sourceDerivation,
  }) + '\n');
}

function dryRun(args) {
  const manifestFile = externalRegularFile(args.manifest, 'MANIFEST');
  const phase23 = loadTypeScriptModule('src/core/phase23/manifest.ts');
  const manifest = safeJson(manifestFile, 'MANIFEST');
  phase23.validatePhase23Manifest(manifest);
  const receipt = phase23.simulatePhase23DevAcceptance(manifest);
  process.stdout.write(JSON.stringify(receipt) + '\n');
  if (args.out !== undefined) writeSafeOutput(args.out, receipt);
}

function gitValue(args, code) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 10_000, maxBuffer: 128 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  if (result.status !== 0) fail(code);
  return result.stdout.trim();
}

function exactCurrentCheckout(head) {
  if (gitValue(['status', '--porcelain'], 'NIGHTWATCH_GIT_STATUS_UNAVAILABLE') !== '') fail('NIGHTWATCH_TREE_DIRTY');
  if (gitValue(['rev-parse', 'origin/main'], 'ORIGIN_HEAD_UNAVAILABLE') !== head) fail('HEAD_NOT_SYNCHRONIZED_WITH_ORIGIN_MAIN');
}

function readCiObservation(file, head, manifest) {
  const report = safeJson(externalRegularFile(file, 'CI_OBSERVATION'), 'CI_OBSERVATION');
  if (report.schemaVersion !== 'nightwatch.external-ci-observation.v1' || report.currentHeadSha !== head || report.observation === null || typeof report.observation !== 'object') fail('CI_OBSERVATION_INVALID');
  const qualityGate = loadTypeScriptModule('src/core/qualityGate/externalCi.ts');
  const observed = qualityGate.classifyExternalCi(report.observation);
  if (observed.classification !== 'EXECUTED_GREEN' || observed.exactHead !== true) fail(`EXTERNAL_CI_NOT_GREEN:${observed.classification}`);
  if (report.observation.expectedGateDefinitionDigest !== manifest.qualityGate.gateDefinitionDigest) fail('EXTERNAL_GATE_DEFINITION_MISMATCH');
  if (report.observation.run?.headSha !== head || report.observation.run?.runId !== report.runId) fail('EXTERNAL_CI_HEAD_OR_RUN_MISMATCH');
  const gateReceipt = report.observation.gateReceipt;
  if (gateReceipt === null || gateReceipt.receiptDigest !== manifest.qualityGate.receiptDigest || gateReceipt.gateDefinitionDigest !== manifest.qualityGate.gateDefinitionDigest || gateReceipt.finalResult !== 'PASS') fail('MANIFEST_NOT_BOUND_TO_EXECUTED_CI_RECEIPT');
  return { report, classification: observed, runId: report.runId };
}

function assertAuthReadiness(file) {
  const authPath = externalRegularFile(file, 'DEV_AUTH');
  const stat = fs.lstatSync(authPath);
  if ((stat.mode & 0o077) !== 0) fail('DEV_AUTH_PERMISSIONS');
  const storage = loadTypeScriptModule('src/browser/fixtures/storageState.ts');
  try { storage.validateStorageStateFile(authPath); }
  catch { fail('DEV_AUTH_STRUCTURAL_VALIDATION'); }
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(authPath, 'utf8')); }
  catch { fail('DEV_AUTH_UNREADABLE'); }
  const cookies = Array.isArray(parsed?.cookies) ? parsed.cookies : [];
  const origins = Array.isArray(parsed?.origins) ? parsed.origins : [];
  const now = Math.floor(Date.now() / 1000);
  const unexpiredCookie = cookies.some((cookie) => cookie !== null && typeof cookie === 'object' && (cookie.expires === -1 || (typeof cookie.expires === 'number' && Number.isFinite(cookie.expires) && cookie.expires > now)));
  const structurallyReadable = origins.every((origin) => origin !== null && typeof origin === 'object' && typeof origin.origin === 'string' && Array.isArray(origin.localStorage));
  if (!structurallyReadable || !unexpiredCookie) fail('DEV_AUTH_EXPIRED_OR_MISSING');
  return authPath;
}

function buildPhase22ExecutionManifest(manifest, head) {
  const phase22 = loadTypeScriptModule('src/core/phase22/index.ts');
  const candidates = manifest.targets.map((target, index) => ({
    target: {
      targetId: target.targetId,
      product: target.product,
      journeyOrApiAdapter: target.journeyOrApiAdapter,
      semanticContractId: target.expectationId,
      expectationId: target.expectationId,
      source: target.source,
      projectionIdentity: target.projectionId,
      differentialPairId: null,
      replay: {
        required: true,
        maxAdditionalContexts: 1,
        freshContext: true,
        allowedOutcomes: ['REPRODUCED_EXACT', 'REPRODUCED_SEMANTIC_EQUIVALENT', 'REPRESENTATION_CHANGED_CONTRACT_PRESERVED', 'PRECONDITION_DIVERGENCE', 'OBSERVATION_DIVERGENCE', 'SOURCE_STALE', 'CONTRACT_CHANGED', 'NONDETERMINISTIC', 'NOT_REPRODUCED', 'INVALID'],
      },
      observation: {
        allowedObservationClass: 'READ_ONLY_API_AND_BROWSER',
        mutationAllowed: false,
        maxFirstObservations: 1,
        maxReplayObservations: 1,
        dynamicTargetDiscovery: false,
      },
      anticipatedInvariantCount: target.anticipatedInvariantCount,
      requiredPreflightChecks: phase22.PHASE22_REQUIRED_PREFLIGHT_CHECKS,
      materialClass: target.materialClass,
      historicalDevEvidence: false,
      selectionPriority: index + 1,
    },
    eligibility: phase22.classifyPhase22Eligibility({
      targetId: target.targetId,
      facts: {
        hasMechanicalRealSourceProof: true,
        sourceFreshness: 'CURRENT_EXACT',
        runtimeBindingAvailable: true,
        runtimeBindingCurrent: true,
        projectionAvailable: true,
        replaySupported: true,
        mutationRequired: false,
        devHostAllowlisted: true,
        authorityAllowed: true,
        targetApprovedReadOnly: true,
      },
    }),
  }));
  const adapted = phase22.createFrozenPhase22Manifest({ nightwatchSha: head, candidates });
  if (adapted.targets.length !== manifest.targets.length || adapted.targets.some((target, index) => target.targetId !== manifest.targets[index].targetId)) fail('PHASE22_EXECUTION_ADAPTER_DRIFT');
  return adapted;
}

function privacyAudit(root) {
  let files = 0;
  const forbiddenName = /(?:auth|storage[-_]?state|cookie|token|secret|screenshot|trace|\.har$|\.zip$|\.png$|\.jpe?g$|\.html?$)/i;
  const forbiddenContent = /(?:<html\b|<body\b|bearer\s+[A-Za-z0-9._-]+|"(?:rawValue|rawBody|rawObserved|responseBody|domText|customerValue|customerId|accountName|mspName|email|members|setMembers)"\s*:\s*(?!false\b|null\b|0\b))/i;
  const visit = (directory) => {
    let entries;
    try { entries = fs.readdirSync(directory, { withFileTypes: true }); }
    catch { fail('PRIVACY_AUDIT_UNREADABLE'); }
    for (const entry of entries) {
      const file = path.join(directory, entry.name);
      let stat;
      try { stat = fs.lstatSync(file); }
      catch { fail('PRIVACY_AUDIT_UNREADABLE'); }
      if (stat.isSymbolicLink()) fail('PRIVACY_AUDIT_SYMLINK');
      if (stat.isDirectory()) { visit(file); continue; }
      if (!stat.isFile()) fail('PRIVACY_AUDIT_NON_REGULAR');
      files += 1;
      if (forbiddenName.test(entry.name)) fail('PRIVACY_AUDIT_PRIVATE_FILE');
      let content;
      try { content = fs.readFileSync(file, 'utf8'); }
      catch { fail('PRIVACY_AUDIT_UNREADABLE'); }
      if (forbiddenContent.test(content)) fail('PRIVACY_AUDIT_RAW_CONTENT');
    }
  };
  if (!fs.existsSync(root)) fail('PRIVACY_AUDIT_ROOT_MISSING');
  visit(root);
  return files;
}

function execute(args) {
  if (args.all !== undefined) fail('DYNAMIC_TARGET_DISCOVERY_FORBIDDEN');
  if (args.env !== 'dev' || typeof args['storage-state'] !== 'string' || typeof args.manifest !== 'string' || typeof args['ci-observation'] !== 'string') fail('DEV_EXECUTION_ARGUMENTS_REQUIRED');
  const head = currentHead();
  exactCurrentCheckout(head);
  const manifestFile = externalRegularFile(args.manifest, 'MANIFEST');
  const phase23 = loadTypeScriptModule('src/core/phase23/manifest.ts');
  const manifest = safeJson(manifestFile, 'MANIFEST');
  try { phase23.validatePhase23Manifest(manifest); }
  catch { fail('MANIFEST_SCHEMA_INVALID'); }
  if (manifest.nightwatchSha !== head) fail('MANIFEST_NIGHTWATCH_SHA_MISMATCH');
  const ci = readCiObservation(args['ci-observation'], head, manifest);
  const storageState = assertAuthReadiness(args['storage-state']);
  const adapted = buildPhase22ExecutionManifest(manifest, head);
  const ownerRoot = path.join(os.homedir(), '.nightwatch', 'findings', 'phase22', adapted.manifestId.replace(/[^A-Za-z0-9._-]/g, '-'));
  if (fs.existsSync(ownerRoot)) fail('OWNER_OUTPUT_ALREADY_EXISTS');
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase23-adapter-'));
  const adaptedManifestFile = path.join(temporaryRoot, 'phase22-execution-adapter.json');
  fs.writeFileSync(adaptedManifestFile, JSON.stringify(adapted, null, 2) + '\n', { mode: 0o600 });
  try {
    const environment = buildChildEnvironment(process.env, { NIGHTWATCH_PHASE_22_CI_RUN_ID: ci.runId });
    if (process.env.GH_TOKEN !== undefined) environment.GH_TOKEN = process.env.GH_TOKEN;
    if (process.env.GITHUB_TOKEN !== undefined) environment.GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const child = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'phase22-real.mjs'), '--env=dev', `--storage-state=${storageState}`, `--manifest=${adaptedManifestFile}`], {
      cwd: ROOT,
      env: environment,
      encoding: 'utf8',
      timeout: 25 * 60 * 1000,
      maxBuffer: 8 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (child.error?.code === 'ETIMEDOUT') fail('DEV_CAMPAIGN_TIMEOUT');
    if (child.error) fail('DEV_CAMPAIGN_SPAWN_FAILED');
    const privacyFiles = privacyAudit(ownerRoot);
    process.stdout.write(JSON.stringify({
      schemaVersion: 'nightwatch.phase23-dev-result.v1',
      result: child.status === 0 ? 'BOUNDED_DEV_ACCEPTANCE_PASS' : 'DEV_EXECUTION_FAILED',
      manifestId: manifest.manifestId,
      sourceIdentities: [...new Set(manifest.targets.map((target) => `${target.source.repoId}@${target.source.sha}`))],
      targetCount: manifest.targets.length,
      firstCount: manifest.targets.length,
      replayCount: manifest.targets.length,
      totalContexts: manifest.targets.length * 2,
      launcherInvocations: 1,
      retries: 0,
      privacyAudit: 'PASS',
      privacyFilesScanned: privacyFiles,
      childExitCode: child.status,
      externalCiClassification: ci.classification.classification,
      externalCiRunId: ci.runId,
    }) + '\n');
    if (child.status !== 0) process.exitCode = 1;
  } finally {
    try { fs.rmSync(temporaryRoot, { recursive: true, force: true }); } catch { /* bounded owner-created temp cleanup */ }
  }
}

function help() {
  process.stdout.write('Usage: node bin/phase23-dev.mjs manifest --snapshot=/external/source --source-sha=<40hex> --gate-receipt=/external/gate.json [--out=/external/manifest.json]\n');
  process.stdout.write('       node bin/phase23-dev.mjs dry-run --manifest=/external/manifest.json [--out=/external/dry-run.json]\n');
  process.stdout.write('       node bin/phase23-dev.mjs execute --env=dev --storage-state=/external/state.json --manifest=/external/manifest.json --ci-observation=/external/ci.json\n');
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._.length === 0) help();
  else if (args._[0] === 'manifest') buildManifest(args);
  else if (args._[0] === 'dry-run') dryRun(args);
  else if (args._[0] === 'execute') execute(args);
  else fail('UNKNOWN_COMMAND');
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
