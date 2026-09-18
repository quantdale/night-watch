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
          const absolute = path.join(root, op.file);
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
  console.log(`[probe] rules=${campaignRules.length} probes=${probeCount} detected=${detectedCount} undetected=${failureCount} restored=${originals.size} statusUnchanged=${statusUnchanged}`);
  process.exitCode = campaignRules.length === 0 || failureCount > 0 || restoreFailures > 0 || !statusUnchanged ? 1 : 0;
}
