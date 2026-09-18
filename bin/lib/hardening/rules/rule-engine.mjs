#!/usr/bin/env node
// @ts-check

/**
 * Invariant family: the rule engine's soundness self-check.
 *
 * This module analyses the OTHER rule modules, so it deliberately imports no
 * registry: the registry is passed in. That keeps the module graph acyclic —
 * registry.mjs imports every family module including this one, and no family
 * module imports registry.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  root,
  fail,
  readDataFile,
  codeWithCommentsBlanked,
  PROBE_REGISTRY_PATH,
  RULE_ENGINE_ENTRY,
  RULE_ENGINE_SOURCE_DIRECTORY,
} from '../kernel.mjs';

/** Where rule modules live; kept in step with registry.mjs by the check below. */
const RULE_MODULE_DIRECTORY = `${RULE_ENGINE_SOURCE_DIRECTORY}/rules`;

/**
 * Read one rule-engine source file as RAW text plus an offset-preserving
 * comment-blanked view. Both are needed: the raw text locates `function`
 * declarations (whose names are real even inside the blanked view), and the
 * blanked view is what every position is reported against, so a reported line
 * is the line a reviewer opens.
 * @param {string} file
 */
function engineSource(file) {
  const raw = fs.readFileSync(path.join(root, file), 'utf8');
  return { raw, code: codeWithCommentsBlanked(raw) };
}

/**
 * Every file whose text this self-check analyses: the family modules plus the
 * entry point. The entry point is included because a rule could be defined
 * there by mistake, and that must fail rather than escape the scan.
 * @param {string[]} moduleFiles
 */
function analysedFiles(moduleFiles) {
  return [...moduleFiles.map((name) => `${RULE_MODULE_DIRECTORY}/${name}.mjs`), RULE_ENGINE_ENTRY];
}

/**
 * F-16 rule-engine soundness self-check.
 *
 * Facts this proves about the checker itself:
 *
 *   1. A fail-if-absent matcher MUST NOT be applied to the raw accessor,
 *      directly or through a local binding. `readIncludingComments` exists for
 *      negative (fail-if-present) rules and data files; a positive assertion
 *      satisfied by a literal that lives only in a comment is not an assertion.
 *      An assertion whose subject genuinely IS comment text declares that with
 *      `readCommentText()`, which is admitted here by name. Reported per line,
 *      across every rule module.
 *
 *   2. G16.11 — THE REGISTRY IS THE ENUMERATION AUTHORITY. A rule module on
 *      disk that the registry does not import fails. A registry entry naming a
 *      module or a rule that does not exist fails. A rule a module exports and
 *      the registry does not carry fails. A duplicate identity, a duplicate
 *      order position, an empty registry and a collapsed rule count all fail.
 *      Enumeration is checked to be the SAME set the run path uses, so
 *      `--list-rules` cannot drift from what actually executes.
 *
 *   3. Every rule carries an explicit quantifier and a recorded subject; a
 *      TOTALITY rule may not be implemented with a direct first-match
 *      extraction unless that singleton is recorded and justified.
 *
 *   4. Every registered rule has at least one recorded negative probe, and the
 *      probe registry names no rule that is not registered.
 *
 *   5. A scan that excludes the engine's own source uses the single-owner
 *      `isRuleEngineSource()` predicate rather than an open-coded path, so the
 *      exclusion cannot go stale the next time the engine gains a module.
 *
 * @param {ReadonlyArray<{name: string, module: string, family: string, quantifier: string, subject: string, firstMatch?: string, implementation?: Function, run?: Function}>} registry
 */
export function checkRuleEngineSoundness(registry) {
  // --- 0. discover the rule modules on disk -----------------------------
  /** @type {string[]} */
  let discovered = [];
  try {
    discovered = fs.readdirSync(path.join(root, RULE_MODULE_DIRECTORY))
      .filter((name) => name.endsWith('.mjs'))
      .map((name) => name.slice(0, -'.mjs'.length))
      .sort();
  } catch (error) {
    fail(`RULE_ENGINE_MODULE_DIRECTORY_UNREADABLE ${RULE_MODULE_DIRECTORY}: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  if (discovered.length === 0) {
    fail(`RULE_ENGINE_NO_RULE_MODULES ${RULE_MODULE_DIRECTORY} contains no rule module; the engine is broken rather than the repository clean`);
    return;
  }

  // --- 1. registry shape ------------------------------------------------
  if (!Array.isArray(registry) || registry.length === 0) {
    fail('RULE_ENGINE_REGISTRY_EMPTY rule registry is empty; the runner would report success vacuously');
    return;
  }
  if (registry.length < 70) {
    fail(`RULE_ENGINE_REGISTRY_COLLAPSED rule registry carries only ${registry.length} rules; the registry is broken rather than the repository clean`);
  }

  const registeredNames = registry.map((rule) => rule.name);
  const registeredSet = new Set(registeredNames);
  if (registeredSet.size !== registeredNames.length) {
    const counts = new Map();
    for (const name of registeredNames) counts.set(name, (counts.get(name) ?? 0) + 1);
    for (const [name, count] of counts) {
      if (count > 1) fail(`RULE_ENGINE_DUPLICATE_RULE_IDENTITY ${name} is registered ${count} times; a rule has exactly one identity`);
    }
  }

  // --- 2. module membership, both directions (G16.11) --------------------
  const declaredModules = new Set(registry.map((rule) => rule.module));
  for (const rule of registry) {
    if (typeof rule.module !== 'string' || rule.module.length === 0) {
      fail(`RULE_ENGINE_RULE_WITHOUT_MODULE ${rule.name} declares no owning rule module`);
    }
  }
  for (const name of discovered) {
    if (!declaredModules.has(name)) {
      fail(`RULE_ENGINE_UNREGISTERED_RULE_MODULE ${RULE_MODULE_DIRECTORY}/${name}.mjs exists but no registered rule names it; the registry is the enumeration authority, so a module outside it would never run`);
    }
  }
  const discoveredSet = new Set(discovered);
  for (const name of declaredModules) {
    if (!discoveredSet.has(name)) {
      fail(`RULE_ENGINE_MISSING_RULE_MODULE registry names module '${name}', which has no ${RULE_MODULE_DIRECTORY}/${name}.mjs on disk`);
    }
  }

  // --- 3. definition / registration parity across every module ----------
  /** @type {Map<string, {file: string, module: string}>} */
  const definitions = new Map();
  /** @type {Map<string, {raw: string, code: string}>} */
  const sources = new Map();
  for (const file of analysedFiles(discovered)) {
    let loaded;
    try {
      loaded = engineSource(file);
    } catch (error) {
      fail(`RULE_ENGINE_SOURCE_UNREADABLE ${file}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    sources.set(file, loaded);
    const moduleName = file === RULE_ENGINE_ENTRY ? '(entry point)' : file.slice(`${RULE_MODULE_DIRECTORY}/`.length, -'.mjs'.length);
    for (const match of loaded.raw.matchAll(/^(?:export )?function (check\w+)\(/gm)) {
      const name = match[1];
      const previous = definitions.get(name);
      if (previous !== undefined) {
        fail(`RULE_ENGINE_DUPLICATE_RULE_DEFINITION ${name} is defined in both ${previous.file} and ${file}`);
        continue;
      }
      definitions.set(name, { file, module: moduleName });
    }
  }

  for (const [name, where] of definitions) {
    if (!registeredSet.has(name)) {
      fail(`RULE_ENGINE_UNREGISTERED_RULE ${name} is defined in ${where.file} but not registered; the registry is the enumeration authority`);
      continue;
    }
    const entry = registry.find((rule) => rule.name === name);
    if (entry !== undefined && where.module !== '(entry point)' && entry.module !== where.module) {
      fail(`RULE_ENGINE_RULE_MODULE_MISMATCH ${name} is defined in module '${where.module}' but registered against '${entry.module}'`);
    }
    if (where.module === '(entry point)') {
      fail(`RULE_ENGINE_RULE_IN_ENTRY_POINT ${name} is defined in ${RULE_ENGINE_ENTRY}; rules belong in an invariant-family module under ${RULE_MODULE_DIRECTORY}`);
    }
  }
  for (const name of registeredNames) {
    if (!definitions.has(name)) fail(`RULE_ENGINE_RULE_NOT_DEFINED ${name} is registered but no rule module defines it`);
  }

  // --- 4. the registry entry resolves to the real implementation --------
  for (const rule of registry) {
    if (typeof rule.implementation !== 'function') {
      fail(`RULE_ENGINE_RULE_WITHOUT_IMPLEMENTATION ${rule.name} carries no resolved implementation`);
      continue;
    }
    if (typeof rule.run !== 'function') {
      fail(`RULE_ENGINE_RULE_NOT_RUNNABLE ${rule.name} carries no runnable entry`);
      continue;
    }
    if (rule.implementation.name !== rule.name) {
      fail(`RULE_ENGINE_RULE_IDENTITY_MISMATCH ${rule.name} resolves to a function named '${rule.implementation.name}'; the registry entry and the implementation must be the same rule`);
    }
  }

  // --- 5. fail-if-absent matcher over the raw accessor ------------------
  const RX = String.raw`\/(?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^/\\\n])*\/[a-z]*`;
  const directPatterns = [
    { re: new RegExp(`!\\s*(?:${RX}|new\\s+RegExp\\([^)\\n]*\\)|[A-Za-z_$][\\w$.]*)\\.(?:test|includes)\\s*\\(\\s*readIncludingComments\\s*\\(`, 'g'), label: 'negated matcher over raw accessor' },
    { re: /!\s*readIncludingComments\s*\([^)\n]*\)\.(?:test|includes)\s*\(/g, label: 'negated receiver over raw accessor' },
  ];
  for (const [file, { raw, code }] of sources) {
    for (const { re, label } of directPatterns) {
      for (const match of code.matchAll(new RegExp(re.source, 'g'))) {
        const line = code.slice(0, match.index).split('\n').length;
        fail(`${file}:${line} applies a ${label}; a fail-if-absent assertion must call read() (code-only), never readIncludingComments()`);
      }
    }
    // Alias form: `const x = readIncludingComments(p)` then `!/lit/.test(x)`.
    const ruleBodies = [...raw.matchAll(/^(?:export )?function (\w+)\(/gm)].map((match, index, all) => ({
      name: match[1],
      start: match.index ?? 0,
      end: index + 1 < all.length ? (all[index + 1].index ?? raw.length) : raw.length,
    }));
    for (const rule of ruleBodies) {
      const body = code.slice(rule.start, rule.end);
      const aliases = new Set();
      for (const binding of body.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*readIncludingComments\s*\(/g)) {
        aliases.add(binding[1]);
      }
      for (const alias of aliases) {
        const guarded = alias.replace(/[$]/g, '\\$');
        const forms = [
          new RegExp(`!\\s*(?:${RX}|[A-Za-z_$][\\w$.]*)\\s*\\.(?:test|includes)\\s*\\(\\s*${guarded}\\s*[,)]`, 'g'),
          new RegExp(`!\\s*${guarded}\\s*\\.(?:includes|match|test|startsWith|endsWith)\\s*\\(`, 'g'),
        ];
        for (const form of forms) {
          for (const hit of body.matchAll(form)) {
            const line = code.slice(0, rule.start + (hit.index ?? 0)).split('\n').length;
            fail(`${file}:${line} applies a fail-if-absent matcher to '${alias}', bound from readIncludingComments() in ${rule.name}; use read() for a code subject or readCommentText() when the subject is comment text`);
          }
        }
      }
    }
  }

  // --- 6. quantifier completeness and totality honesty ------------------
  const quantifiers = new Set(['EXISTENCE', 'TOTALITY']);
  const firstMatchRe = new RegExp(`((?:${RX})|(?:new\\s+RegExp\\([^)\\n]*\\)))\\s*\\.(exec|match)\\s*\\(`, 'g');
  const stringMatchRe = new RegExp(`[A-Za-z_$][\\w$.]*\\.match\\(\\s*(${RX})`, 'g');
  const regexFlags = (/** @type {string} */ literal) => {
    if (!literal.startsWith('/')) return literal.includes("'g'") ? 'g' : '';
    let inClass = false;
    for (let index = 1; index < literal.length; index += 1) {
      const character = literal[index];
      if (character === '\\') { index += 1; continue; }
      if (character === '[') { inClass = true; continue; }
      if (character === ']') { inClass = false; continue; }
      if (character === '/' && !inClass) return literal.slice(index + 1);
    }
    return '';
  };
  for (const rule of registry) {
    if (!quantifiers.has(rule.quantifier)) fail(`rule ${rule.name} does not declare a quantifier (EXISTENCE or TOTALITY)`);
    if (typeof rule.subject !== 'string' || rule.subject.trim().length < 8) fail(`rule ${rule.name} has no recorded subject`);
    const where = definitions.get(rule.name);
    if (where === undefined) continue;
    const loaded = sources.get(where.file);
    if (loaded === undefined) continue;
    const start = loaded.raw.search(new RegExp(`^(?:export )?function ${rule.name}\\(`, 'm'));
    if (start < 0) continue;
    const nextIndex = loaded.raw.slice(start + 1).search(/^(?:export )?function \w+\(/m);
    const end = nextIndex < 0 ? loaded.code.length : start + 1 + nextIndex;
    const body = loaded.code.slice(start, end);
    for (const match of body.matchAll(firstMatchRe)) {
      if (regexFlags(match[1]).includes('g')) continue;
      if (rule.quantifier !== 'TOTALITY') continue;
      if (typeof rule.firstMatch === 'string' && rule.firstMatch.length > 0) continue;
      fail(`rule ${rule.name} is TOTALITY but uses a direct first-match .${match[2]}(...) with no recorded singleton justification (${where.file}:${loaded.code.slice(0, start + (match.index ?? 0)).split('\n').length})`);
    }
    for (const match of body.matchAll(stringMatchRe)) {
      if (regexFlags(match[1]).includes('g')) continue;
      if (rule.quantifier !== 'TOTALITY') continue;
      if (typeof rule.firstMatch === 'string' && rule.firstMatch.length > 0) continue;
      fail(`rule ${rule.name} is TOTALITY but uses a direct first-match String.match(...) with no recorded singleton justification`);
    }
  }

  // --- 7. engine self-exclusion uses the single-owner predicate ---------
  // A scan that excludes the engine's own source must say so through
  // isRuleEngineSource(); an open-coded path silently stops covering the
  // engine's other modules the moment one is added.
  for (const [file, { code }] of sources) {
    if (file === RULE_ENGINE_ENTRY) continue;
    for (const match of code.matchAll(/!==\s*['"]bin\/hardening-check\.mjs['"]/g)) {
      const line = code.slice(0, match.index).split('\n').length;
      fail(`RULE_ENGINE_OPEN_CODED_SELF_EXCLUSION ${file}:${line} excludes the engine by path literal; use isRuleEngineSource() so the exclusion covers every rule module`);
    }
  }

  // --- 8. every rule has a recorded probe -------------------------------
  let probeRegistry;
  try {
    probeRegistry = JSON.parse(readDataFile(PROBE_REGISTRY_PATH));
  } catch (error) {
    fail(`rule probe registry ${PROBE_REGISTRY_PATH} is unreadable: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  if (probeRegistry.schemaVersion !== 'nightwatch.hardening-rule-probes.v1') fail('rule probe registry schema/version is unsupported');
  const probes = probeRegistry.probes ?? {};
  for (const rule of registry) {
    const entry = probes[rule.name];
    if (!Array.isArray(entry) || entry.length === 0) fail(`rule ${rule.name} has no recorded negative probe`);
  }
  for (const name of Object.keys(probes)) {
    if (!registeredSet.has(name)) fail(`rule probe registry names an unregistered rule: ${name}`);
  }
}
