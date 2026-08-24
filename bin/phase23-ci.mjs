#!/usr/bin/env node

// Bounded GitHub Actions observer for Phase 23.
//
// This command is intentionally outside the local quality gate. It performs
// one read-only observation of one caller-supplied run, sanitizes the result,
// and delegates classification to the pure externalCi module. It never reads
// logs when a required job has steps=[], because that is already meaningful
// external execution evidence. It never writes raw logs or credentials.

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKSPACE_ROOT = path.resolve(ROOT, '..', '..');
const REPOSITORY = 'quantdale/night-watch';
const WORKFLOW_NAME = 'Nightwatch hardening';
const REQUIRED_JOB_NAMES = ['Executable quality gate'];
const LOG_TIMEOUT = 30_000;
const API_TIMEOUT = 30_000;

function fail(code) {
  throw new Error(`PHASE23_CI_OBSERVER_BLOCKED:${code}`);
}

class ExternalObservationError extends Error {
  constructor(readonlyCode) {
    super(readonlyCode);
    this.name = 'ExternalObservationError';
    this.classification = readonlyCode;
  }
}

function parseArgs(argv) {
  const args = { _: [] };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') { args.help = true; continue; }
    if (!arg.startsWith('--')) { args._.push(arg); continue; }
    const separator = arg.indexOf('=');
    if (separator < 0) fail('FLAGS_REQUIRE_EQUALS');
    const key = arg.slice(2, separator);
    if (!/^[a-z][a-z0-9-]{0,48}$/.test(key) || Object.hasOwn(args, key)) fail('UNKNOWN_OR_DUPLICATE_FLAG');
    args[key] = arg.slice(separator + 1);
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
      compilerOptions: {
        target: typescript.ScriptTarget.ES2022,
        module: typescript.ModuleKind.CommonJS,
        moduleResolution: typescript.ModuleResolutionKind.Node10,
        esModuleInterop: true,
        skipLibCheck: true,
      },
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
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 10_000,
    maxBuffer: 64 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const head = result.status === 0 ? result.stdout.trim() : '';
  if (!/^[0-9a-f]{40}$/.test(head)) fail('NIGHTWATCH_HEAD_UNAVAILABLE');
  return head;
}

function ghEnvironment() {
  const allowed = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR,
    LANG: 'C',
    LC_ALL: 'C',
    GH_HOST: process.env.GH_HOST,
  };
  // Authentication is consumed by gh only. It is never printed, serialized,
  // or passed to a child other than this one bounded read-only request.
  if (process.env.GH_TOKEN !== undefined) allowed.GH_TOKEN = process.env.GH_TOKEN;
  if (process.env.GITHUB_TOKEN !== undefined) allowed.GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  return Object.fromEntries(Object.entries(allowed).filter(([, value]) => value !== undefined));
}

function ghJson(args, label) {
  const result = spawnSync('gh', args, {
    cwd: ROOT,
    env: ghEnvironment(),
    encoding: 'utf8',
    timeout: API_TIMEOUT,
    maxBuffer: 4 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error || result.status !== 0) {
    const stderr = String(result.stderr ?? '');
    throw new ExternalObservationError(/\b404\b|not found/i.test(stderr) ? 'WORKFLOW_NOT_FOUND' : 'API_UNOBSERVABLE');
  }
  try { return JSON.parse(result.stdout); }
  catch { throw new ExternalObservationError('API_UNOBSERVABLE'); }
}

function safeString(value, fallback = '') {
  return typeof value === 'string' && value.length <= 512 ? value : fallback;
}

function sanitizeRun(raw, current) {
  return {
    runId: String(raw.id ?? ''),
    status: safeString(raw.status),
    conclusion: raw.conclusion === null ? null : safeString(raw.conclusion, null),
    headSha: safeString(raw.head_sha),
    workflowName: safeString(raw.name),
  };
}

function sanitizeStep(step) {
  return {
    name: safeString(step?.name),
    status: safeString(step?.status),
    conclusion: step?.conclusion === null || step?.conclusion === undefined ? null : safeString(step.conclusion, null),
  };
}

function sanitizeJobs(raw) {
  if (!Array.isArray(raw?.jobs)) return null;
  return raw.jobs.map((job) => ({
    id: String(job?.id ?? ''),
    name: safeString(job?.name),
    status: safeString(job?.status),
    conclusion: job?.conclusion === null || job?.conclusion === undefined ? null : safeString(job.conclusion, null),
    steps: Array.isArray(job?.steps) ? job.steps.slice(0, 256).map(sanitizeStep) : null,
  }));
}

function safeGateReceipt(value) {
  if (value?.schemaVersion !== 'nightwatch.quality-gate-receipt.v1') return null;
  if (typeof value.receiptDigest !== 'string' || !/^receipt:sha256:[0-9a-f]{24}$/.test(value.receiptDigest) || typeof value.gateDefinitionDigest !== 'string' || typeof value.finalResult !== 'string' || !Array.isArray(value.groups)) return null;
  const groups = value.groups.slice(0, 64).map((group) => ({ id: safeString(group?.id), status: safeString(group?.status) }));
  if (groups.some((group) => group.id === '' || group.status === '')) return null;
  return { receiptDigest: value.receiptDigest, gateDefinitionDigest: value.gateDefinitionDigest, finalResult: value.finalResult, groups };
}

function receiptFromLog(log) {
  if (typeof log !== 'string') return null;
  for (const line of log.split(/\r?\n/)) {
    const start = line.indexOf('{"schemaVersion":"nightwatch.quality-gate-receipt.v1"');
    if (start < 0) continue;
    try {
      const parsed = JSON.parse(line.slice(start));
      const receipt = safeGateReceipt(parsed);
      if (receipt !== null) return receipt;
    } catch {
      // The log line is not retained; continue within this one bounded read.
    }
  }
  return null;
}

function readJobLog(runId) {
  const result = spawnSync('gh', ['run', 'view', runId, '--repo', REPOSITORY, '--log'], {
    cwd: ROOT,
    env: ghEnvironment(),
    encoding: 'utf8',
    timeout: LOG_TIMEOUT,
    maxBuffer: 16 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error || result.status !== 0) return { observable: false, receipt: null };
  return { observable: true, receipt: receiptFromLog(result.stdout) };
}

function expectedGate() {
  const definition = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'quality-gate.v1.json'), 'utf8'));
  const canonical = (value) => value === null || typeof value !== 'object'
    ? JSON.stringify(value)
    : Array.isArray(value)
      ? `[${value.map(canonical).join(',')}]`
      : `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return {
    gateDefinitionDigest: `sha256:${crypto.createHash('sha256').update(canonical(definition), 'utf8').digest('hex')}`,
    requiredGroupIds: definition.groups.filter((group) => group.required === true).map((group) => group.id),
  };
}

function reportFor(runId, current, observation, qualityGate) {
  const classification = qualityGate.classifyExternalCi(observation);
  const run = observation.run;
  const jobs = observation.jobs;
  return {
    schemaVersion: 'nightwatch.external-ci-observation.v1',
    repository: REPOSITORY,
    workflowName: WORKFLOW_NAME,
    runId,
    currentHeadSha: current,
    run: run === null ? null : { runId: run.runId, status: run.status, conclusion: run.conclusion, headSha: run.headSha, workflowName: run.workflowName },
    jobs: (jobs ?? []).map((job) => ({ id: job.id, name: job.name, status: job.status, conclusion: job.conclusion, stepCount: job.steps?.length ?? null, executed: job.steps !== null && job.steps.length > 0 })),
    classification,
    observation,
  };
}

function observe(runId) {
  const current = currentHead();
  const qualityGate = loadTypeScriptModule('src/core/qualityGate/externalCi.ts');
  const gate = expectedGate();
  try {
    const rawRun = ghJson(['api', `repos/${REPOSITORY}/actions/runs/${runId}`], 'RUN');
    const rawJobs = ghJson(['api', `repos/${REPOSITORY}/actions/runs/${runId}/jobs?per_page=100`], 'JOBS');
    const run = sanitizeRun(rawRun, current);
    const jobs = sanitizeJobs(rawJobs);
    const requiredJobs = jobs?.filter((job) => REQUIRED_JOB_NAMES.includes(job.name)) ?? [];
    const requiredStepsUnavailable = requiredJobs.length === 0 || requiredJobs.some((job) => job.steps === null || job.steps.length === 0);
    // Empty steps are already a terminal external observation. Avoid a second
    // log call, both to keep the decision bounded and to avoid mislabeling a
    // platform/billing block as a test result.
    const log = requiredStepsUnavailable ? { observable: true, receipt: null } : readJobLog(runId);
    const observation = {
      apiObservable: log.observable,
      workflowFound: true,
      expectedWorkflowName: WORKFLOW_NAME,
      currentHeadSha: current,
      run,
      jobs,
      requiredJobNames: REQUIRED_JOB_NAMES,
      expectedGateDefinitionDigest: gate.gateDefinitionDigest,
      expectedRequiredGroupIds: gate.requiredGroupIds,
      gateReceipt: log.receipt,
    };
    return reportFor(runId, current, observation, qualityGate);
  } catch (error) {
    if (!(error instanceof ExternalObservationError)) throw error;
    const observation = {
      apiObservable: error.classification !== 'API_UNOBSERVABLE',
      workflowFound: error.classification !== 'WORKFLOW_NOT_FOUND',
      expectedWorkflowName: WORKFLOW_NAME,
      currentHeadSha: current,
      run: null,
      jobs: null,
      requiredJobNames: REQUIRED_JOB_NAMES,
      expectedGateDefinitionDigest: gate.gateDefinitionDigest,
      expectedRequiredGroupIds: gate.requiredGroupIds,
      gateReceipt: null,
    };
    return reportFor(runId, current, observation, qualityGate);
  }
}

function writeExternalJson(file, value, label) {
  if (typeof file !== 'string' || !path.isAbsolute(file)) fail(`${label}_MUST_BE_ABSOLUTE`);
  const resolved = path.resolve(file);
  if (resolved === ROOT || resolved.startsWith(ROOT + path.sep) || resolved === WORKSPACE_ROOT || resolved.startsWith(WORKSPACE_ROOT + path.sep)) fail(`${label}_MUST_BE_EXTERNAL`);
  if (fs.existsSync(resolved)) {
    const stat = fs.lstatSync(resolved);
    if (stat.isSymbolicLink() || !stat.isFile()) fail(`${label}_NOT_REGULAR`);
  }
  const parent = path.dirname(resolved);
  if (!fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) fail(`${label}_PARENT_UNAVAILABLE`);
  fs.writeFileSync(resolved, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
}

function help() {
  process.stdout.write('Usage: node bin/phase23-ci.mjs observe --run-id=<github-actions-run-id>\n');
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) help();
  else if (args._[0] !== 'observe' || typeof args['run-id'] !== 'string' || !/^\d+$/.test(args['run-id'])) fail('RUN_ID_REQUIRED');
  else {
    const report = observe(args['run-id']);
    if (args.out !== undefined) writeExternalJson(args.out, report, 'REPORT_OUTPUT');
    const gateReceipt = report.observation.gateReceipt;
    if (args['gate-receipt-out'] !== undefined) {
      if (gateReceipt === null) fail('GREEN_GATE_RECEIPT_UNAVAILABLE');
      writeExternalJson(args['gate-receipt-out'], {
        schemaVersion: 'nightwatch.quality-gate-receipt.v1',
        receiptDigest: gateReceipt.receiptDigest,
        gateDefinitionDigest: gateReceipt.gateDefinitionDigest,
        gitHead: report.currentHeadSha,
        finalResult: gateReceipt.finalResult,
        groups: gateReceipt.groups,
      }, 'GATE_RECEIPT_OUTPUT');
    }
    process.stdout.write(JSON.stringify(report) + '\n');
    process.exitCode = report.classification.classification === 'EXECUTED_GREEN' ? 0 : 1;
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
