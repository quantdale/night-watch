#!/usr/bin/env node

// F-PERF-2 duplicate-work map (task-local analysis harness).
//
// Mechanically derives what each named validation lane selects and which
// expensive work repeats inside one development/certification lifecycle, then
// classifies every overlap with the campaign's five-class vocabulary. Analysis
// only: it never runs a lane and never writes outside its --out directory.
//
// Usage:
//   node .agent/tasks/nightwatch-test-infrastructure-performance-v1/harness/duplicate-work-map.mjs --out=<evidence dir>

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outArgument = process.argv.find((value) => value.startsWith('--out='));
const outDir = outArgument === undefined ? null : outArgument.slice('--out='.length);
if (outDir === null) {
  console.error('usage: duplicate-work-map.mjs --out=<directory>');
  process.exit(2);
}

const TEST_MATCH = [/^tests\/.*\.(?:test|smoke)\.ts$/, /^scenarios\/.*\.smoke\.ts$/];

function trackedFiles() {
  const result = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error('DUPLICATE_WORK_GIT_UNAVAILABLE');
  return (result.stdout ?? '').split('\n').filter(Boolean);
}

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}

function digest(values) {
  const canonical = [...new Set(values)].sort().join('\n');
  return `sha256:${crypto.createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 24)}`;
}

const tracked = trackedFiles();
const fullUniverse = tracked.filter((file) => TEST_MATCH.some((pattern) => pattern.test(file))).sort();
const synthetic = readJson('config/synthetic-campaign.v1.json').files.slice().sort();
const semanticConfig = readJson('config/semantic-compatibility.v1.json');
const semantic = [...new Set([
  ...semanticConfig.phaseSuites.flatMap((suite) => suite.files),
  ...(semanticConfig.supportFiles ?? []),
])].sort();
const ownerProvenance = ['tests/unit/privateArtifactAtomic.test.ts', 'tests/unit/aiOwnerReview.test.ts', 'tests/unit/aiReview.test.ts'];
const smoke = fullUniverse.filter((file) => file.startsWith('tests/smoke/'));
const scripts = readJson('package.json').scripts;

const gateGroups = [
  { id: 'GATE_DEFINITION', commandKey: 'GATE_DEFINITION', executes: 'node bin/quality-gate-spec.mjs', files: [] },
  { id: 'STATIC', commandKey: 'TYPECHECK', executes: 'npm run typecheck', files: [] },
  { id: 'HARDENING', commandKey: 'HARDENING_CHECK', executes: 'npm run hardening:check', files: [] },
  { id: 'HARDENING_PROBES', commandKey: 'HARDENING_PROBES', executes: 'npm run hardening:rules', files: [] },
  { id: 'HANDOFF_TRUTH', commandKey: 'HANDOFF_CHECK', executes: 'node bin/planner-handoff-check.mjs', files: [] },
  { id: 'PROJECT_TRUTH', commandKey: 'PROJECT_CHECK', executes: 'npm run project:check', files: [] },
  { id: 'AGENT_CONTINUITY', commandKey: 'AGENT_CONTINUITY', executes: 'npm run agent:check && npm run agent:audit', files: [] },
  { id: 'SEMANTIC_COMPATIBILITY', commandKey: 'SEMANTIC_COMPATIBILITY', executes: 'npm run test:semantic-compat', files: semantic },
  { id: 'OWNER_PROVENANCE', commandKey: 'OWNER_PROVENANCE', executes: 'npm run test:owner-provenance', files: ownerProvenance },
  { id: 'SYNTHETIC_CAMPAIGN', commandKey: 'SYNTHETIC_CAMPAIGN', executes: 'npm run campaign:synthetic', files: synthetic },
  { id: 'PATCH_INTEGRITY', commandKey: 'PATCH_INTEGRITY', executes: 'node bin/selfdev-catalog-integrity.mjs && git diff --check && git status --porcelain', files: [] },
  { id: 'WORKSPACE_INTEGRITY', commandKey: 'WORKSPACE_INTEGRITY', executes: 'node bin/workspace-integrity.mjs check', files: [] },
];

const lanes = [
  { id: 'npm-test', command: scripts.test, files: fullUniverse, expensiveSetup: ['Playwright globalSetup loopback proxy', 'TypeScript in-process transpile', 'fresh worker process per file batch'] },
  { id: 'gate-local', command: scripts['gate:local'], files: gateGroups.flatMap((group) => group.files), groups: gateGroups.map((group) => group.id), expensiveSetup: ['12 serial group dispatches', 'nested npm process per group', 'three Playwright invocations (semantic, owner, synthetic)'] },
  { id: 'gate-clean', command: scripts['gate:clean'], files: gateGroups.flatMap((group) => group.files), groups: gateGroups.map((group) => group.id), expensiveSetup: ['disposable clone', 'npm ci --ignore-scripts', 'the whole gate again inside the clone'] },
  { id: 'campaign-synthetic', command: scripts['campaign:synthetic'], files: synthetic, expensiveSetup: ['manifest load', 'deep containment lane classification', 'serial Playwright invocation'] },
  { id: 'semantic-compat', command: scripts['test:semantic-compat'], files: semantic, expensiveSetup: ['JSON report file under tmpdir', 'serial Playwright invocation'] },
  { id: 'owner-provenance', command: scripts['test:owner-provenance'], files: ownerProvenance, expensiveSetup: ['serial Playwright invocation'] },
  { id: 'hardening-rules', command: scripts['hardening:rules'], files: [], expensiveSetup: ['one fresh Node process per rule probe (94 probes)', 'real guard-file mutation and restore'] },
];

function intersection(left, right) {
  const rightSet = new Set(right);
  return left.filter((file) => rightSet.has(file)).sort();
}

const overlaps = [];
for (let i = 0; i < lanes.length; i += 1) {
  for (let j = i + 1; j < lanes.length; j += 1) {
    const left = lanes[i];
    const right = lanes[j];
    const shared = intersection(left.files, right.files);
    if (shared.length === 0) continue;
    overlaps.push({
      lanes: [left.id, right.id],
      sharedFiles: shared.length,
      sharedDigest: digest(shared),
      sample: shared.slice(0, 5),
    });
  }
}

const classifications = [
  {
    subject: 'gate:clean vs gate:local/local validation',
    classification: 'REQUIRED_INDEPENDENT_REEXECUTION',
    rationale: 'a clean checkout must prove a fresh environment from a disposable clone with npm ci; reusing local state would destroy the property the lane exists to prove',
  },
  {
    subject: 'campaign:synthetic vs npm test (same lifecycle)',
    classification: 'REQUIRED_INDEPENDENT_REEXECUTION',
    rationale: 'the required SYNTHETIC_CAMPAIGN gate group must stand alone in its receipt, and the full regression must be independently complete; within a certification lifecycle the repetition is by design, not accidental',
    fastDevGuidance: 'SAFE_TO_SKIP_IN_FAST_DEV_LANE: the fast lane may select the affected subset instead',
  },
  {
    subject: 'semantic-compatibility vs npm test (same lifecycle)',
    classification: 'REQUIRED_INDEPENDENT_REEXECUTION',
    rationale: 'the compatibility cone has its own skip policy and receipt; the full regression covers the same files independently',
    fastDevGuidance: 'SAFE_TO_SKIP_IN_FAST_DEV_LANE: the fast lane may select the affected subset instead',
  },
  {
    subject: 'owner-provenance vs npm test (same lifecycle)',
    classification: 'REQUIRED_INDEPENDENT_REEXECUTION',
    rationale: 'owner provenance is a required gate group with its own receipt and zero-skip contract',
    fastDevGuidance: 'SAFE_TO_SKIP_IN_FAST_DEV_LANE: the fast lane may select the affected subset instead',
  },
  {
    subject: 'Playwright globalSetup proxy per invocation',
    classification: 'REQUIRED_INDEPENDENT_REEXECUTION',
    rationale: 'each invocation owns its lease and runtime state suffix; sharing a proxy across processes would break containment and port-lease ownership',
  },
  {
    subject: 'agent:check and agent:audit inside AGENT_CONTINUITY',
    classification: 'SAFE_TO_SHARE_WITHIN_ONE_RUN',
    rationale: 'both scan the same task inventory in the same group; a single pass emitting both judgements would be equivalent, pending a semantics-preserving tool change',
  },
  {
    subject: 'loadTypeScriptModules compilation across lanes',
    classification: 'SAFE_TO_CACHE_BY_CONTENT_DIGEST',
    rationale: 'deterministic source-to-module compilation keyed by source SHA and loader version is immutable; a cross-process cache is only safe with those identity keys',
  },
  {
    subject: 'full regression re-running gate-lane files in the same certification run',
    classification: 'REQUIRED_INDEPENDENT_REEXECUTION',
    rationale: 'deduplicating it would change the meaning of either the gate or the full regression; the campaign removes none of it',
  },
];

const map = {
  schemaVersion: 'nightwatch.duplicate-work-map.v1',
  generatedAt: new Date().toISOString(),
  universe: { files: fullUniverse.length, digest: digest(fullUniverse) },
  manifests: {
    synthetic: { files: synthetic.length, digest: digest(synthetic) },
    semantic: { files: semantic.length, digest: digest(semantic) },
    ownerProvenance: { files: ownerProvenance.length, digest: digest(ownerProvenance) },
    smoke: { files: smoke.length, digest: digest(smoke) },
  },
  lanes,
  overlaps,
  classifications,
  duplicateFileExecutionsPerCertificationLifecycle: intersectionsCount(),
};

function intersectionsCount() {
  const gateFiles = new Set(gateGroups.flatMap((group) => group.files));
  const repeated = fullUniverse.filter((file) => gateFiles.has(file));
  return { filesRunTwiceWhenNpmTestAndGateLocalBothRun: repeated.length, digest: digest(repeated) };
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'duplicate-work-map.json'), `${JSON.stringify(map, null, 2)}\n`, 'utf8');

const lines = [];
lines.push('# Duplicate-work map (F-PERF-2)');
lines.push('');
lines.push(`Universe: ${map.universe.files} files (${map.universe.digest})`);
lines.push(`Synthetic manifest: ${synthetic.length} files; semantic manifest: ${semantic.length} files; owner provenance: ${ownerProvenance.length} files.`);
lines.push(`Files executed twice when npm test and gate:local both run: ${map.duplicateFileExecutionsPerCertificationLifecycle.filesRunTwiceWhenNpmTestAndGateLocalBothRun}.`);
lines.push('');
lines.push('## Lane overlaps');
lines.push('');
lines.push('| Lane A | Lane B | Shared files |');
lines.push('|---|---|---:|');
for (const overlap of overlaps) lines.push(`| ${overlap.lanes[0]} | ${overlap.lanes[1]} | ${overlap.sharedFiles} |`);
lines.push('');
lines.push('## Classifications');
lines.push('');
for (const entry of classifications) {
  lines.push(`- **${entry.classification}** — ${entry.subject}`);
  lines.push(`  - ${entry.rationale}`);
  if (entry.fastDevGuidance !== undefined) lines.push(`  - ${entry.fastDevGuidance}`);
}
lines.push('');
lines.push('## Expensive setup by lane');
lines.push('');
for (const lane of lanes) {
  lines.push(`- \`${lane.id}\` (${lane.files.length} files): ${lane.expensiveSetup.join('; ')}`);
}
lines.push('');
fs.writeFileSync(path.join(outDir, 'duplicate-work-map.md'), `${lines.join('\n')}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, json: path.join(outDir, 'duplicate-work-map.json'), markdown: path.join(outDir, 'duplicate-work-map.md'), overlaps: overlaps.length }));
