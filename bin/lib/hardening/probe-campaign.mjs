#!/usr/bin/env node
// @ts-check

/**
 * The rule mutation campaign.
 *
 * Extracted from the entry point by G16.9 so the entry point is orchestration
 * only. The campaign takes the registry as an argument rather than importing
 * it, keeping this module usable against any enumeration the entry point
 * resolves and keeping the module graph acyclic.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root, childEnvironment, PROBE_REGISTRY_PATH } from './kernel.mjs';

/**
 * The active task directory, read the way the rules read it.
 *
 * `checkActiveMilestoneProgression` resolves its subject INDIRECTLY: it reads
 * `.agent/ACTIVE_TASK.md`, follows `Task directory:` and opens that task's
 * `STATE.md`. Probe HC-015 named a fixed task directory instead, so the moment
 * the active task changed the probe began mutating a file the rule no longer
 * opens -- and reported UNDETECTED while the rule was working perfectly.
 *
 * A probe whose rule resolves its subject indirectly must resolve it the SAME
 * way, or probe and rule silently disagree about what is under test. That is
 * the HC-059 rot class, and it stays closed only if the indirection is shared
 * rather than copied.
 */
function activeTaskDirectory() {
  try {
    const active = fs.readFileSync(path.join(root, '.agent/ACTIVE_TASK.md'), 'utf8');
    const directory = /^Task directory:\s*(\S+)\s*$/m.exec(active)?.[1];
    if (typeof directory === 'string' && directory.startsWith('.agent/tasks/')) return directory;
    return null;
  } catch {
    return null;
  }
}

/** Placeholders a probe may use to follow a rule's own indirection. */
const PROBE_PATH_PLACEHOLDER = '<ACTIVE_TASK_DIR>';

/**
 * Resolve a probe's declared path. An unresolvable placeholder THROWS rather
 * than falling back to a literal: a probe that cannot find its subject must
 * fail the campaign, never quietly probe the wrong file.
 * @param {string} file
 */
function resolveProbePath(file) {
  if (!file.includes(PROBE_PATH_PLACEHOLDER)) return file;
  const directory = activeTaskDirectory();
  if (directory === null) {
    throw new Error(`${PROBE_PATH_PLACEHOLDER} is unresolvable: .agent/ACTIVE_TASK.md names no task directory`);
  }
  return file.replace(PROBE_PATH_PLACEHOLDER, directory);
}

/**
 * The rule mutation campaign: apply each recorded probe to real guarded
 * source, run only the probed rule, and require a detected failure. Bytes are
 * restored in a finally and verified afterwards; `git status --porcelain` must
 * be unchanged from before the run.
 */
export function runRuleProbeCampaign(registeredRules, onlyRule, entryPoint) {
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
  /**
   * Files a probe CREATED rather than edited. They restore by deletion, so they
   * are kept out of the byte-restore verification, which would otherwise try to
   * compare a file that is supposed to be gone.
   * @type {Set<string>}
   */
  const createdFiles = new Set();
  let detectedCount = 0;
  let failureCount = 0;
  let probeCount = 0;
  const campaignRules = onlyRule === undefined ? registeredRules : registeredRules.filter((rule) => rule.name === onlyRule);
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
          const absolute = path.join(root, resolveProbePath(op.file));
          // `create` proves a guard whose subject is a file's EXISTENCE — an
          // unregistered rule module is the case that motivated it, and no
          // byte-level edit of an existing file can express it. The file must
          // not already exist, so a probe can never silently overwrite real
          // source, and it restores by deletion.
          if (typeof op.create === 'string') {
            if (fs.existsSync(absolute)) throw new Error(`create target already exists: ${op.file}`);
            fs.mkdirSync(path.dirname(absolute), { recursive: true });
            fs.writeFileSync(absolute, op.create);
            createdFiles.add(absolute);
            touched.push(absolute);
            continue;
          }
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
            throw new Error('unknown probe operation (expected search/replace, append, prepend or create)');
          }
          fs.writeFileSync(absolute, text);
          touched.push(absolute);
        }
        const result = spawnSync(process.execPath, [entryPoint, `--only=${rule.name}`], {
          cwd: root, encoding: 'utf8', env: childEnvironment, timeout: 120_000, maxBuffer: 16 * 1024 * 1024,
        });
        if (result.status !== 0) {
          detected = true;
          usedId = probe.id ?? '(unnamed)';
        }
      } catch (error) {
        console.log(`[probe] ${rule.name} PROBE_ERROR ${probe.id ?? '(unnamed)'}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        for (const absolute of touched) {
          if (createdFiles.has(absolute)) { fs.rmSync(absolute, { force: true }); createdFiles.delete(absolute); continue; }
          fs.writeFileSync(absolute, /** @type {Buffer} */ (originals.get(absolute)));
        }
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
  // Vacuity is stated explicitly rather than inferred. A campaign that ran no
  // rules, or ran rules but executed no probe, proves nothing -- and a gate
  // that treats "no failures" as PASS would report the strongest possible
  // result for the weakest possible run. Both are named so the reason a
  // release-authoritative gate went red is legible in the receipt.
  const vacuousRules = campaignRules.length === 0;
  const vacuousProbes = probeCount === 0;
  if (vacuousRules) console.error('[probe] VACUOUS_CAMPAIGN no rules were selected; the registry or the filter is broken rather than the repository clean');
  if (vacuousProbes) console.error('[probe] VACUOUS_CAMPAIGN no probe was executed; a campaign that mutates nothing detects nothing');
  console.log(`[probe] rules=${campaignRules.length} probes=${probeCount} detected=${detectedCount} undetected=${failureCount} restored=${originals.size} statusUnchanged=${statusUnchanged}`);
  process.exitCode = vacuousRules || vacuousProbes || failureCount > 0 || restoreFailures > 0 || !statusUnchanged ? 1 : 0;
}
