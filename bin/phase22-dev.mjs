#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Nightwatch Phase 22 local operator surface.
//
// `manifest`, `preflight`, `acceptance --dry-run`, `results`, and `explain`
// are local/read-only by default. The only path that may invoke a real
// launcher is `acceptance --execute --env=dev --storage-state=... --manifest=...`.
// The launcher itself owns the final source/auth/containment gate and the
// single bounded campaign. This command never discovers live targets.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const ROOT = process.cwd();
const WORKSPACE_ROOT = path.resolve(ROOT, '..', '..');
const HELP = `Phase 22 contained DEV operator surface

  node bin/phase22-dev.mjs manifest --snapshot=/tmp/exact-source --source-sha=<40hex> [--out=/external/manifest.json]
  node bin/phase22-dev.mjs preflight --manifest=/external/manifest.json [--env=dev --storage-state=/external/state.json]
  node bin/phase22-dev.mjs acceptance --dry-run --manifest=/external/manifest.json
  node bin/phase22-dev.mjs acceptance --execute --env=dev --storage-state=/external/state.json --manifest=/external/manifest.json
  node bin/phase22-dev.mjs results --results=/external/results.json
  node bin/phase22-dev.mjs explain <safe-id> --manifest=/external/manifest.json

The default path is local. No --all flag or dynamic target discovery exists.
`;

function parseArgs(argv) {
  const out = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') { out.help = true; continue; }
    if (!arg.startsWith('--')) { out._.push(arg); continue; }
    const separator = arg.indexOf('=');
    if (separator !== -1) { out[arg.slice(2, separator)] = arg.slice(separator + 1); continue; }
    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith('--')) { out[arg.slice(2)] = next; index += 1; }
    else out[arg.slice(2)] = true;
  }
  return out;
}

function fail(code) {
  throw new Error(`PHASE22_OPERATOR_BLOCKED:${code}`);
}

function loadTypeScriptModule(file) {
  return loadRuntimeTypeScriptModule(file, { root: ROOT });
}

function safeJson(file) {
  if (typeof file !== 'string' || !path.isAbsolute(file)) fail('JSON_PATH_MUST_BE_ABSOLUTE');
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { fail('JSON_UNREADABLE'); }
}

function currentNightwatchSha() {
  try {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
    if (!/^[0-9a-f]{40}$/.test(sha)) fail('NIGHTWATCH_SHA_UNAVAILABLE');
    return sha;
  } catch { fail('NIGHTWATCH_SHA_UNAVAILABLE'); }
}

function sourceReader(snapshot) {
  if (typeof snapshot !== 'string' || !path.isAbsolute(snapshot)) fail('SOURCE_SNAPSHOT_MUST_BE_ABSOLUTE');
  let root;
  try { root = fs.realpathSync(snapshot); }
  catch { fail('SOURCE_SNAPSHOT_UNAVAILABLE'); }
  return {
    readFile(_repoId, relativePath) {
      if (typeof relativePath !== 'string' || relativePath.startsWith('/') || relativePath.includes('..') || relativePath.includes('\\') || relativePath.includes('\0')) return null;
      const file = path.resolve(root, relativePath);
      if (file !== root && !file.startsWith(root + path.sep)) return null;
      try { return fs.readFileSync(file, 'utf8'); }
      catch { return null; }
    },
  };
}

function buildManifest(args) {
  if (args.all !== undefined) fail('DYNAMIC_ALL_FORBIDDEN');
  const sourceSha = args['source-sha'];
  if (typeof sourceSha !== 'string' || !/^[0-9a-f]{40}$/.test(sourceSha)) fail('SOURCE_SHA_REQUIRED');
  const reader = sourceReader(args.snapshot);
  const phase22 = loadTypeScriptModule('src/core/phase22/index.ts');
  const admission = loadTypeScriptModule('src/oracles/expectations/admission.ts');
  const collectionAdmission = loadTypeScriptModule('src/oracles/expectations/collectionAdmission.ts');
  const coverage = loadTypeScriptModule('src/oracles/expectations/coverageInventory.ts');
  const registry = loadTypeScriptModule('src/oracles/expectations/recipes/registry.ts');
  const runtime = loadTypeScriptModule('src/core/campaign/runtimeProfile.ts');
  const snapshot = { repoId: 'mobingilabs/ripple-api', sha: sourceSha };
  const derivation = admission.deriveRealSourceExpectations(registry.REAL_SOURCE_EXPECTATION_RECIPES, snapshot, reader);
  const collection = collectionAdmission.deriveCollectionWideRealSourceExpectations(derivation.derived);
  const collectionByTarget = new Map(collection.derived.map((item) => [item.recipe.targetId, item]));
  const inventory = coverage.buildCoverageInventory({
    reader,
    currentness: { currentSnapshot: () => snapshot },
    snapshot,
    remoteSha: sourceSha,
    canonicalUnchanged: null,
  });
  const runtimeByTarget = new Map(runtime.REAL_RUNTIME_LINKAGE.map((item) => [item.apiOperationId, item]));
  const rows = [];
  for (const entry of inventory.entries) {
    const derived = collectionByTarget.get(entry.targetId);
    if (derived === undefined || entry.sourceSha === null || entry.evidenceDigest === null) continue;
    const linkage = runtimeByTarget.get(entry.targetId);
    const expectationId = derived.collectionExpectationId;
    const projectionIdentity = phase22.phase22Digest({ targetId: entry.targetId, expectationId, sourceSha: entry.sourceSha, evidenceDigest: entry.evidenceDigest }, 'projection:sha256:');
    rows.push({
      targetId: entry.targetId,
      product: 'ripple',
      journeyOrApiAdapter: linkage?.journeyId ?? `unbound:${entry.targetId}`,
      semanticContractId: expectationId,
      expectationId,
      boundSource: { repoId: entry.sourceRepo, sha: entry.sourceSha, evidenceDigest: entry.evidenceDigest },
      observedSource: { repoId: entry.sourceRepo, sha: entry.sourceSha, evidenceDigest: entry.evidenceDigest },
      sourceAvailable: true,
      contractPresent: true,
      derivationSupported: true,
      derivationEvidenceMatches: true,
      semanticsUnchanged: true,
      runtimeBindingAvailable: linkage !== undefined,
      runtimeBindingCurrent: linkage !== undefined,
      projectionAvailable: linkage !== undefined,
      replaySupported: linkage !== undefined,
      mutationRequired: false,
      devHostAllowlisted: linkage !== undefined,
      authorityAllowed: true,
      targetApprovedReadOnly: entry.approvedReadOnly,
      projectionIdentity,
      differentialPairId: null,
      materialClass: 'COLLECTION',
      historicalDevEvidence: entry.targetId === 'ripple.common-exchange.read',
      anticipatedInvariantCount: derived.expectation.invariantDefinitions.length,
      selectionPriority: entry.targetId === 'ripple.common-exchange.read' ? 10 : entry.targetId === 'ripple.payer-exchange.read' ? 20 : entry.targetId === 'ripple.account-inventory.read' ? 30 : 40,
      differentialSecondSurfacePresent: false,
      differentialSecondSurfaceCurrent: false,
      differentialEquivalenceProven: false,
      differentialLeftProjectionAvailable: true,
      differentialRightProjectionAvailable: false,
    });
  }
  const inventoryResult = phase22.buildPhase22CandidateInventory(rows);
  const additionalExclusions = registry.APPROVED_READ_ONLY_TARGET_IDS
    .filter((targetId) => !rows.some((row) => row.targetId === targetId))
    .map((targetId) => ({ targetId, eligibility: 'SYNTHETIC_ONLY', reasonCode: 'NO_CURRENT_MECHANICAL_COLLECTION_CONTRACT' }));
  const candidates = inventoryResult.records.map((record) => record.manifestCandidate).filter((candidate) => candidate !== null);
  const manifest = phase22.createFrozenPhase22Manifest({ nightwatchSha: args['nightwatch-sha'] ?? currentNightwatchSha(), candidates, additionalExclusions });
  return { manifest, inventory: inventoryResult, sourceDerivation: { derivedHistorical: derivation.derived.length, historicalFailures: derivation.failures.length, derivedCollection: collection.derived.length, collectionFailures: collection.failures.length } };
}

function writeSafeOutput(file, value) {
  if (typeof file !== 'string') return;
  if (!path.isAbsolute(file)) fail('OUTPUT_PATH_MUST_BE_ABSOLUTE');
  const resolved = path.resolve(file);
  if (resolved === ROOT || resolved.startsWith(ROOT + path.sep) || resolved.startsWith(WORKSPACE_ROOT + path.sep)) fail('OUTPUT_MUST_BE_OUTSIDE_WORKSPACE');
  if (fs.existsSync(resolved) && fs.lstatSync(resolved).isSymbolicLink()) fail('OUTPUT_SYMLINK');
  fs.writeFileSync(resolved, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
}

function checkStorageStatePath(file) {
  if (typeof file !== 'string' || !path.isAbsolute(file)) return false;
  const resolved = path.resolve(file);
  if (resolved.startsWith(ROOT + path.sep) || resolved.startsWith(WORKSPACE_ROOT + path.sep)) return false;
  try {
    const stat = fs.lstatSync(resolved);
    return stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0;
  } catch { return false; }
}

function preflight(args) {
  const phase22 = loadTypeScriptModule('src/core/phase22/index.ts');
  const loaded = safeJson(args.manifest);
  phase22.validatePhase22Manifest(loaded);
  const storageSafe = checkStorageStatePath(args['storage-state']);
  const facts = {
    environmentDev: args.env === undefined || args.env === 'dev',
    productionRejected: args.env !== 'prod' && args.env !== 'production',
    nextRejected: args.env !== 'next',
    l0CdpGuardActive: false,
    l1RouteGuardActive: false,
    l2WebsocketGuardActive: false,
    l3WorkerContainmentActive: false,
    l4UnroutedDetectionActive: false,
    l5LoopbackProxyActive: false,
    quicDisabled: false,
    nonProxiedWebrtcDisabled: false,
    traceDisabled: true,
    screenshotsDisabled: true,
    rawResponsePersistenceDisabled: true,
    rawDomPersistenceDisabled: true,
    mutationRegistryActive: false,
    storageStateExternal: storageSafe,
    storageStateRegularFile: storageSafe,
    storageStateNoSymlink: storageSafe,
    storageStateRestrictivePermissions: storageSafe,
    authStructurallyValid: false,
    authUnexpired: false,
    authPageReadable: false,
    sourceCurrent: false,
    expectationResolved: false,
    journeyApiAdapterCurrent: false,
    ownerPolicyAllows: true,
    noDatabaseOrInfraPath: true,
    cleanNightwatchGitState: execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim() === '',
    manifestFrozen: loaded.frozen === true,
    dryRunPassed: false,
    targetCount: loaded.targets.length,
    plannedObservationContexts: loaded.targets.length * 2,
    manifestDigest: loaded.deterministicDigest,
  };
  const receipt = phase22.createPhase22PreflightReceipt(facts);
  process.stdout.write(JSON.stringify({ receipt, storagePathAccepted: storageSafe, note: 'Authenticated readability/expiry and containment are rechecked by the guarded launcher; this local preflight makes no DEV contact.' }, null, 2) + '\n');
}

function acceptance(args) {
  if (args.all !== undefined) fail('DYNAMIC_ALL_FORBIDDEN');
  if (args['dry-run'] === true) {
    const phase22 = loadTypeScriptModule('src/core/phase22/index.ts');
    const manifest = safeJson(args.manifest);
    const result = phase22.simulatePhase22DevAcceptance(manifest);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return;
  }
  if (args.execute !== true) fail('EXPLICIT_EXECUTE_REQUIRED');
  if (args.env !== 'dev') fail('DEV_ONLY');
  if (typeof args['storage-state'] !== 'string' || !path.isAbsolute(args['storage-state'])) fail('EXTERNAL_STORAGE_STATE_REQUIRED');
  if (typeof args.manifest !== 'string' || !path.isAbsolute(args.manifest)) fail('FROZEN_MANIFEST_REQUIRED');
  if (!checkStorageStatePath(args['storage-state'])) fail('STORAGE_STATE_PATH_GATE');
  const launcher = path.join(ROOT, 'bin', 'phase22-real.mjs');
  const child = spawnSync(process.execPath, [launcher, '--env=dev', `--storage-state=${args['storage-state']}`, `--manifest=${args.manifest}`], { cwd: ROOT, stdio: 'inherit' });
  if (child.error) throw child.error;
  process.exitCode = child.status ?? 1;
}

function results(args) {
  if (typeof args.results !== 'string') fail('RESULTS_PATH_REQUIRED');
  const result = safeJson(args.results);
  const phase22 = loadTypeScriptModule('src/core/phase22/index.ts');
  phase22.assertPhase22NoRawArtifactFields(result);
  process.stdout.write(JSON.stringify({ safe: true, result }, null, 2) + '\n');
}

function explain(args) {
  const safeId = args._[1];
  if (typeof safeId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(safeId)) fail('SAFE_ID_REQUIRED');
  const manifest = safeJson(args.manifest);
  const phase22 = loadTypeScriptModule('src/core/phase22/index.ts');
  phase22.validatePhase22Manifest(manifest);
  const target = manifest.targets.find((item) => item.targetId === safeId);
  const exclusion = manifest.exclusions.find((item) => item.targetId === safeId);
  process.stdout.write(JSON.stringify(target === undefined ? { targetId: safeId, exclusion: exclusion ?? { targetId: safeId, reasonCode: 'NOT_IN_FROZEN_MANIFEST' } } : { targetId: safeId, target }, null, 2) + '\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._.length === 0) { process.stdout.write(HELP); return; }
  const command = args._[0];
  if (command === 'manifest') {
    const result = buildManifest(args);
    writeSafeOutput(args.out, result.manifest);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else if (command === 'preflight') preflight(args);
  else if (command === 'acceptance') acceptance(args);
  else if (command === 'results') results(args);
  else if (command === 'explain') explain(args);
  else fail('UNKNOWN_COMMAND');
}

try { main(); }
catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
