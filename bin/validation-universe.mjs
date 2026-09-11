#!/usr/bin/env node
// @ts-check

// NW-08 — discover the validation universe and report its classification.
//
// Discovery is from tracked Git paths, not a directory walk, so an untracked
// scratch file cannot enter the universe and a tracked one cannot escape it.
// The gate selection is read from the SAME versioned manifests the required
// lanes execute from, so this cannot claim coverage the gate does not provide.
//
//   node bin/validation-universe.mjs            # human text, exit 1 on any violation
//   node bin/validation-universe.mjs --json     # the full judgement as JSON
//   node bin/validation-universe.mjs --digest   # just the computed digest

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { classifyValidationUniverse } from './lib/validation-universe.mjs';
import {
  LANE_STATE_SCHEMA,
  loadLaneState,
  reportLaneState,
  validateLaneState,
} from './lib/validation-lane-state.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DECLARATION = path.join('config', 'validation-universe.v1.json');

const ROOT_TEST_RE = /^(?:tests|scenarios)\/.*\.(?:test|smoke)\.ts$/;
const UI_TEST_RE = /^ui\/.*\.test\.(?:ts|tsx)$/;
const BIN_RE = /^bin\/.*\.mjs$/;
/** Browser-driven checks and owner-run manual harnesses are executable too. */
const BROWSER_RE = /^tests\/browser\/.*\.browser\.ts$/;
const MANUAL_RE = /^tests\/manual\/.*\.ts$/;

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
}

function trackedFiles() {
  const result = spawnSync('git', ['ls-files'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 8 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (result.status !== 0) throw new Error('VALIDATION_UNIVERSE_GIT_UNAVAILABLE');
  return (result.stdout ?? '').split('\n').filter((line) => line.length > 0);
}

/** Every executable test or check that exists, by tracked path. */
export function discoverUniverse(tracked) {
  return [
    ...tracked.filter((file) => ROOT_TEST_RE.test(file)),
    ...tracked.filter((file) => UI_TEST_RE.test(file)),
    ...tracked.filter((file) => BIN_RE.test(file)),
    ...tracked.filter((file) => BROWSER_RE.test(file)),
    ...tracked.filter((file) => MANUAL_RE.test(file)),
  ];
}

/**
 * What the REQUIRED gate lanes actually select.
 *
 * Three sources, because the gate has three test-executing groups:
 * the synthetic-campaign file list, the semantic-compatibility phase suites
 * and their support files, and the suites named literally in package.json
 * scripts that required groups invoke.
 */
export function gateSelection({ synthetic, semantic, scripts }) {
  const selected = new Set();
  for (const file of synthetic.files ?? []) selected.add(file);
  for (const suite of Object.values(semantic.phaseSuites ?? {})) {
    const files = Array.isArray(suite) ? suite : (suite?.files ?? []);
    for (const file of files) if (typeof file === 'string') selected.add(file);
  }
  for (const file of semantic.supportFiles ?? []) selected.add(file);
  for (const file of JSON.stringify(scripts ?? {}).match(/(?:tests|scenarios)\/[A-Za-z0-9_/.-]+\.(?:test|smoke)\.ts/g) ?? []) {
    selected.add(file);
  }
  return [...selected];
}

function readLastSubstantiveSha() {
  try {
    const text = fs.readFileSync(path.join(ROOT, '.agent', 'ACTIVE_TASK.md'), 'utf8');
    const match = /^LAST_SUBSTANTIVE_CHECKPOINT_SHA:\s*([0-9a-f]{40})/m.exec(text)
      ?? /^Last validated implementation SHA:\s*([0-9a-f]{40})/m.exec(text);
    return match === null ? null : match[1];
  } catch {
    return null;
  }
}

function isAncestor(left, right) {
  return spawnSync('git', ['merge-base', '--is-ancestor', left, right], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 15_000,
    stdio: ['ignore', 'ignore', 'ignore'],
  }).status === 0;
}

function main() {
  const args = process.argv.slice(2);
  const jsonOnly = args.includes('--json');
  const digestOnly = args.includes('--digest');
  const tracked = trackedFiles();
  const declaration = readJson(DECLARATION);
  let judgement = classifyValidationUniverse({
    discovered: discoverUniverse(tracked),
    gateSelected: gateSelection({
      synthetic: readJson(path.join('config', 'synthetic-campaign.v1.json')),
      semantic: readJson(path.join('config', 'semantic-compatibility.v1.json')),
      scripts: readJson('package.json').scripts,
    }),
    declaration,
  });

  // F-02 lane state as data. Every class declared above must resolve to exactly
  // one lane entry; the fourth report state (STALE_EVIDENCE) is computed here
  // and never stored.
  const declaredClasses = Object.keys(declaration.classes ?? {});
  const laneStateLoad = loadLaneState(ROOT);
  const laneStateErrors = laneStateLoad.ok
    ? validateLaneState(laneStateLoad.lanes, declaredClasses)
    : laneStateLoad.errors;
  const lastSubstantiveSha = readLastSubstantiveSha();
  const laneState = laneStateLoad.ok
    ? {
        schemaVersion: LANE_STATE_SCHEMA,
        lastSubstantiveSha,
        lanes: reportLaneState(laneStateLoad.lanes, lastSubstantiveSha, isAncestor),
      }
    : null;
  judgement = {
    ...judgement,
    laneState,
    errors: [...judgement.errors, ...laneStateErrors],
    ok: judgement.ok && laneStateErrors.length === 0,
  };

  if (digestOnly) {
    process.stdout.write(`${judgement.digest}\n`);
    return;
  }
  if (jsonOnly) {
    process.stdout.write(`${JSON.stringify(judgement, null, 2)}\n`);
  } else {
    const c = judgement.counts;
    process.stdout.write(`[validation-universe] digest=${judgement.digest}\n`);
    process.stdout.write(`[validation-universe] discovered=${c.discovered} authoritativeGate=${c.authoritativeGate} classified=${c.classified} unclassified=${c.unclassified}\n`);
    for (const [name, count] of Object.entries(c.byClass)) {
      process.stdout.write(`[validation-universe] ${name}=${count}\n`);
    }
    if (laneState !== null) {
      const byReported = new Map();
      for (const lane of laneState.lanes) {
        byReported.set(lane.reportedClass, (byReported.get(lane.reportedClass) ?? 0) + 1);
      }
      process.stdout.write(
        `[validation-universe] lane-state: lanes=${laneState.lanes.length}` +
          ` proven=${byReported.get('PROVEN') ?? 0}` +
          ` stale=${byReported.get('PROVEN (STALE_EVIDENCE)') ?? 0}` +
          ` blocked-external=${byReported.get('BLOCKED_EXTERNAL') ?? 0}` +
          ` unavailable=${byReported.get('UNAVAILABLE_CAPABILITY') ?? 0}\n`,
      );
      for (const lane of laneState.lanes) {
        process.stdout.write(
          `[validation-universe] lane ${lane.laneId} class=${lane.reportedClass}` +
            `${lane.revisitDate === null ? '' : ` revisit=${lane.revisitDate}`}\n`,
        );
      }
    }
    for (const error of judgement.errors.slice(0, 24)) {
      process.stderr.write(`[validation-universe] ERROR: ${error.code}: ${error.detail}\n`);
    }
    if (judgement.errors.length > 24) {
      process.stderr.write(`[validation-universe] ERROR: ${judgement.errors.length - 24} further violation(s) not listed\n`);
    }
    process.stdout.write(judgement.ok
      ? '[validation-universe] PASS: every discovered test and check belongs to exactly one class\n'
      : `[validation-universe] FAIL (${judgement.errors.length} violation(s))\n`);
  }
  if (!judgement.ok) process.exitCode = 1;
}

if (typeof process.argv[1] === 'string' && path.basename(process.argv[1]) === 'validation-universe.mjs') {
  main();
}
