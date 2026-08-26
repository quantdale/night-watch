#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Phase 22 single real-campaign launcher.
//
// This is the only executable path allowed to invoke the Phase 22 Playwright
// campaign. It performs all source/manifest/Git/CI/storage gates first, then
// makes exactly one serial child invocation. There is no retry, selector,
// --all, URL override, target discovery, or fallback launcher.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKSPACE_ROOT = path.resolve(ROOT, '..', '..');
const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;

function fail(code) {
  throw new Error(`PHASE22_BLOCKED_BEFORE_DEV:${code}`);
}

function parseArgs(argv) {
  let env;
  let storageState;
  let manifest;
  let help = false;
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') { help = true; continue; }
    if (arg.startsWith('--env=')) { if (env !== undefined) fail('DUPLICATE_ENV'); env = arg.slice(6); continue; }
    if (arg.startsWith('--storage-state=')) { if (storageState !== undefined) fail('DUPLICATE_STORAGE_STATE'); storageState = arg.slice('--storage-state='.length); continue; }
    if (arg.startsWith('--manifest=')) { if (manifest !== undefined) fail('DUPLICATE_MANIFEST'); manifest = arg.slice('--manifest='.length); continue; }
    fail('UNKNOWN_ARGUMENT');
  }
  return { env: env ?? '', storageState: storageState ?? '', manifest: manifest ?? '', help };
}

function loadTypeScriptModule(file) {
  return loadRuntimeTypeScriptModule(file, { root: ROOT });
}

function git(args) {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { fail('GIT_METADATA_UNAVAILABLE'); }
}

function assertGitAndCi() {
  const head = git(['rev-parse', 'HEAD']);
  const remote = git(['rev-parse', 'origin/main']);
  if (!/^[0-9a-f]{40}$/.test(head) || head !== remote) fail('HEAD_NOT_SYNCHRONIZED_WITH_ORIGIN_MAIN');
  if (git(['status', '--porcelain']) !== '') fail('NIGHTWATCH_TREE_DIRTY');
  const runId = process.env.NIGHTWATCH_PHASE_22_CI_RUN_ID;
  if (runId === undefined || !/^\d+$/.test(runId)) fail('EXACT_GREEN_CI_RUN_ID_REQUIRED');
  try {
    const run = JSON.parse(execFileSync('gh', ['api', `repos/quantdale/night-watch/actions/runs/${runId}`, '--jq', '{status,conclusion,head_sha}'], { cwd: ROOT, encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'ignore'] }));
    if (run.status !== 'completed' || run.conclusion !== 'success' || run.head_sha !== head) fail('EXACT_GREEN_CI_REQUIRED');
    const jobs = JSON.parse(execFileSync('gh', ['api', `repos/quantdale/night-watch/actions/runs/${runId}/jobs?per_page=100`, '--jq', '{jobs: [.jobs[] | {status,conclusion,steps}]}'], { cwd: ROOT, encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'ignore'] }));
    if (!Array.isArray(jobs.jobs) || jobs.jobs.length === 0 || jobs.jobs.some((job) => job.status !== 'completed' || job.conclusion !== 'success' || !Array.isArray(job.steps) || job.steps.length === 0)) fail('EXTERNAL_CI_STEPS_UNOBSERVABLE');
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('PHASE22_BLOCKED_BEFORE_DEV:')) throw error;
    fail('EXTERNAL_CI_UNOBSERVABLE');
  }
  return head;
}

function assertManifestPath(file, phase22) {
  if (!path.isAbsolute(file) || file.startsWith(ROOT + path.sep) || file.startsWith(WORKSPACE_ROOT + path.sep)) fail('MANIFEST_SCOPE');
  let stat;
  try { stat = fs.lstatSync(file); }
  catch { fail('MANIFEST_UNAVAILABLE'); }
  if (!stat.isFile() || stat.isSymbolicLink()) fail('MANIFEST_NOT_REGULAR');
  let value;
  try { value = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { fail('MANIFEST_INVALID_JSON'); }
  try { phase22.validatePhase22Manifest(value); }
  catch { fail('MANIFEST_SCHEMA_INVALID'); }
  return value;
}

function assertStoragePath(file) {
  if (!path.isAbsolute(file) || file.startsWith(ROOT + path.sep) || file.startsWith(WORKSPACE_ROOT + path.sep)) fail('STORAGE_STATE_SCOPE');
  let stat;
  try { stat = fs.lstatSync(file); }
  catch { fail('STORAGE_STATE_UNAVAILABLE'); }
  if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) fail('STORAGE_STATE_FILE_PERMISSIONS');
  return file;
}

function sourceReader(root) {
  const resolved = fs.realpathSync(root);
  return {
    readFile(_repoId, relativePath) {
      if (typeof relativePath !== 'string' || relativePath.startsWith('/') || relativePath.includes('..') || relativePath.includes('\\') || relativePath.includes('\0')) return null;
      const file = path.resolve(resolved, relativePath);
      if (file !== resolved && !file.startsWith(resolved + path.sep)) return null;
      try { return fs.readFileSync(file, 'utf8'); }
      catch { return null; }
    },
  };
}

function currentSourceSnapshot(manifest) {
  const sourceIds = manifest.targets.map((target) => target.source);
  if (sourceIds.length === 0 || sourceIds.some((source) => source.repoId !== 'mobingilabs/ripple-api' || source.sha !== sourceIds[0].sha)) fail('MULTIPLE_OR_UNSUPPORTED_SOURCE_SNAPSHOTS');
  let remoteSha;
  try { remoteSha = execFileSync('gh', ['api', 'repos/mobingilabs/ripple-api/git/refs/heads/master', '--jq', '.object.sha'], { cwd: ROOT, encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { fail('SOURCE_REMOTE_HEAD_UNAVAILABLE'); }
  if (!/^[0-9a-f]{40}$/.test(remoteSha) || remoteSha !== sourceIds[0].sha) fail('MANIFEST_SOURCE_SHA_STALE');
  let snapshot;
  try { snapshot = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase22-source.')); }
  catch { fail('SOURCE_DISPOSABLE_ROOT_UNAVAILABLE'); }
  try {
    const clone = spawnSync('git', ['clone', '--no-checkout', 'https://github.com/mobingilabs/ripple-api.git', snapshot], { cwd: ROOT, stdio: 'ignore', timeout: 120_000 });
    const fetch = spawnSync('git', ['-C', snapshot, 'fetch', '--depth', '1', 'origin', remoteSha], { cwd: ROOT, stdio: 'ignore', timeout: 120_000 });
    const checkout = spawnSync('git', ['-C', snapshot, 'checkout', '--detach', remoteSha], { cwd: ROOT, stdio: 'ignore', timeout: 120_000 });
    const actual = spawnSync('git', ['-C', snapshot, 'rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    if (clone.status !== 0 || fetch.status !== 0 || checkout.status !== 0 || (actual.stdout ?? '').trim() !== remoteSha) fail('SOURCE_DISPOSABLE_SNAPSHOT_INVALID');
    return { snapshot, sha: remoteSha };
  } catch (error) {
    try { fs.rmSync(snapshot, { recursive: true, force: true }); } catch { /* best effort cleanup of owner-created temp */ }
    if (error instanceof Error && error.message.startsWith('PHASE22_BLOCKED_BEFORE_DEV:')) throw error;
    fail('SOURCE_DISPOSABLE_SNAPSHOT_INVALID');
  }
}

function rederiveAndCheckManifest(manifest, source) {
  const admission = loadTypeScriptModule('src/oracles/expectations/admission.ts');
  const collectionAdmission = loadTypeScriptModule('src/oracles/expectations/collectionAdmission.ts');
  const registry = loadTypeScriptModule('src/oracles/expectations/recipes/registry.ts');
  const reader = sourceReader(source.snapshot);
  const snapshot = { repoId: 'mobingilabs/ripple-api', sha: source.sha };
  const historical = admission.deriveRealSourceExpectations(registry.REAL_SOURCE_EXPECTATION_RECIPES, snapshot, reader);
  if (historical.failures.length !== 0) fail('SOURCE_CONTRACT_REDERIVATION_FAILED');
  const collection = collectionAdmission.deriveCollectionWideRealSourceExpectations(historical.derived);
  const byTarget = new Map(collection.derived.map((item) => [item.recipe.targetId, item]));
  for (const target of manifest.targets) {
    const derived = byTarget.get(target.targetId);
    if (derived === undefined || derived.collectionExpectationId !== target.expectationId || derived.evidenceDigest !== target.source.evidenceDigest) fail('MANIFEST_EXPECTATION_EVIDENCE_DRIFT');
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write('Usage: npm run dev-acceptance -- --execute --env=dev --storage-state=/external/state.json --manifest=/external/manifest.json\n');
    return;
  }
  if (args.env !== 'dev' || args.storageState === '' || args.manifest === '') fail('DEV_STORAGE_AND_MANIFEST_REQUIRED');
  const phase22 = loadTypeScriptModule('src/core/phase22/index.ts');
  const head = assertGitAndCi();
  const manifest = assertManifestPath(args.manifest, phase22);
  if (manifest.nightwatchSha !== head) fail('MANIFEST_NIGHTWATCH_SHA_MISMATCH');
  assertStoragePath(args.storageState);
  const source = currentSourceSnapshot(manifest);
  try {
    rederiveAndCheckManifest(manifest, source);
    const ownerRoot = path.join(os.homedir(), '.nightwatch', 'findings', 'phase22', manifest.manifestId.replace(/[^A-Za-z0-9._-]/g, '-'));
    fs.mkdirSync(ownerRoot, { recursive: true, mode: 0o700 });
    fs.chmodSync(ownerRoot, 0o700);
    const artifactsRoot = path.join(ownerRoot, 'artifacts');
    const results = path.join(ownerRoot, 'results.json');
    const pwBin = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'playwright.cmd' : 'playwright');
    const environment = buildChildEnvironment(process.env, {
      NIGHTWATCH_ENV: 'dev',
      NIGHTWATCH_STORAGE_STATE: args.storageState,
      NIGHTWATCH_PHASE_22_REAL: '1',
      NIGHTWATCH_PHASE_22_MANIFEST: args.manifest,
      NIGHTWATCH_PHASE_22_SOURCE_SNAPSHOT: source.snapshot,
      NIGHTWATCH_PHASE_22_ARTIFACT_ROOT: artifactsRoot,
      NIGHTWATCH_PHASE_22_RESULTS: results,
      NIGHTWATCH_TRACE: 'off',
      NIGHTWATCH_HEADED: '0',
    });
    const child = spawnSync(pwBin, ['test', '--config=playwright.phase22.config.ts', '--project=nightwatch', '--workers=1'], { cwd: ROOT, env: environment, stdio: ['ignore', 'pipe', 'pipe'], timeout: 20 * 60 * 1000, maxBuffer: 4 * 1024 * 1024 });
    if (child.stdout !== undefined) process.stdout.write(child.stdout);
    if (child.stderr !== undefined) process.stderr.write(child.stderr);
    if (child.error) throw child.error;
    process.exitCode = child.status ?? 1;
  } finally {
    try { fs.rmSync(source.snapshot, { recursive: true, force: true }); } catch { /* best effort cleanup of owner-created disposable source */ }
  }
}

try { main(); }
catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
