#!/usr/bin/env node
// @ts-check

/**
 * Shared kernel for the hardening rule engine.
 *
 * Every rule module reads source and records findings through exactly these
 * helpers, so there is ONE definition of what "the code" means. The accessor
 * split is the load-bearing part and is enforced by the rule-engine self-check:
 *
 *   read()                 code only — the ONLY accessor a fail-if-absent
 *                          assertion may use, directly or through a local
 *                          binding. A required literal living in a comment
 *                          must not satisfy an assertion.
 *   readIncludingComments() raw — for fail-if-present rules, where a forbidden
 *                          token in a comment is still a forbidden reference.
 *   readCommentText()      raw — the subject IS comment text (a generated-file
 *                          header, a TEST-ONLY brand).
 *   readDataFile()         raw — JSON/YAML/Markdown, where comment-stripping
 *                          would corrupt rather than clarify.
 *
 * `errors` is shared mutable state on purpose: rules call fail() and the entry
 * point reports whatever accumulated. It is exported so the entry point can
 * splice it for the reporting-only modes.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from '../../child-environment.mjs';

/** Repository root, resolved from this module's own location: bin/lib/hardening. */
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/**
 * The rule engine's own source: the entry point plus every module under
 * `bin/lib/hardening/`.
 *
 * Many rules scan all of `src/` and `bin/` for a forbidden literal, and the
 * detector for such a literal necessarily CONTAINS it. Before the G16.9
 * decomposition every one of those scans excluded the single file
 * `bin/hardening-check.mjs` by name; the rule bodies now live in family modules
 * beside this kernel, so the exclusion has to name the engine rather than one
 * of its files. This is the ONLY widening the decomposition makes to any rule's
 * subject, it is exactly the set of files that were previously one file, and
 * `checkRuleEngineSoundness` requires every scan that excludes the engine to
 * use this predicate rather than an open-coded path.
 */
export const RULE_ENGINE_ENTRY = 'bin/hardening-check.mjs';
export const RULE_ENGINE_SOURCE_DIRECTORY = 'bin/lib/hardening';

/** @param {string} file */
export function isRuleEngineSource(file) {
  return file === RULE_ENGINE_ENTRY || file.startsWith(`${RULE_ENGINE_SOURCE_DIRECTORY}/`);
}

/** The recorded negative probe for every registered rule. */
export const PROBE_REGISTRY_PATH = 'config/hardening-rule-probes.v1.json';

/** @type {string[]} Findings accumulated by every rule in this process. */
export const errors = [];

/** Sanitized environment for every child process this engine spawns. */
export const childEnvironment = buildChildEnvironment(process.env);


/**
 * Tokens a `/` may legally follow when it opens a REGEX literal rather than
 * acting as division. Anything else — an identifier, a digit, a closing paren
 * or bracket, a closed string — makes the `/` division.
 */
export const REGEX_ALLOWED_BEFORE = /[(,=:[!&|?{};+\-*%~^<>]|^$/;

/** @param {string} message */
export function fail(message) {
  errors.push(message);
}

/** Strip line and block comments so a structural check reads CODE, not prose. */
/** @param {string} source */
export function withoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/**
 * Read RAW text INCLUDING comments.
 *
 * This is the explicit opt-in raw accessor. It exists for three cases only:
 *   1. negative (`fail-if-present`) rules, where a forbidden token in a
 *      comment is still a forbidden reference;
 *   2. data files (JSON, Markdown, workflow YAML) where comment syntax is
 *      not comment syntax at all;
 *   3. rules genuinely about comment text.
 *
 * A positive (`fail-if-absent`) assertion MUST NOT use this accessor: a
 * comment containing the required literal would satisfy it. The rule-engine
 * self-check (`checkRuleEngineSoundness`) fails such a use.
 * @param {string} file
 */
export function readIncludingComments(file) {
  try {
    return fs.readFileSync(path.join(root, file), 'utf8');
  } catch (error) {
    fail(`cannot read ${file}: ${error instanceof Error ? error.message : String(error)}`);
    return '';
  }
}

/**
 * Read CODE ONLY. This is the default structural accessor: comments are
 * stripped, so a positive assertion cannot be satisfied by prose. Raw text is
 * available only through the explicitly named `readIncludingComments`.
 * @param {string} file
 */
export function read(file) {
  return withoutComments(readIncludingComments(file));
}

/**
 * Source for an assertion whose SUBJECT IS COMMENT TEXT — a generated-file
 * header, a TEST-ONLY brand, a licence banner. This is the only legitimate
 * fail-if-absent read over comment-bearing source: the required literal is
 * supposed to live in a comment, so `read()` (code-only) would be wrong, while
 * a bare `readIncludingComments()` is indistinguishable from the defect the
 * rule-engine self-check hunts. The distinct name declares the intent, and
 * `checkRuleEngineSoundness` admits it for positive assertions.
 *
 * @param {string} file
 */
export function readCommentText(file) {
  return readIncludingComments(file);
}

/**
 * Source for an assertion over a DATA OR PROSE file — JSON, YAML, Markdown,
 * `.gitignore`, a workflow. These have no code/comment distinction to make, and
 * `withoutComments()` would actively corrupt them (a `//` inside a JSON string
 * such as a URL is not a comment). Raw is the correct and only reading, so the
 * name records that the raw read is a property of the file class rather than an
 * unexamined fail-if-absent over comment-bearing code.
 *
 * @param {string} file
 */
export function readDataFile(file) {
  return readIncludingComments(file);
}

/**
 * 1-based line of the first occurrence of `needle`, or 0 when it is absent.
 * Totality-rule failures name the failing line wherever the failure is tied to
 * an occurrence in a file; a return of 0 is only used by callers whose failure
 * is an absence rather than a location.
 * @param {string} source
 * @param {string} needle
 */
export function lineOfText(source, needle) {
  const index = source.indexOf(needle);
  return index < 0 ? 0 : source.slice(0, index).split('\n').length;
}

/**
 * 1-based line of the first match of a GLOBAL regex, or 0 when it never
 * matches. The caller supplies the `g` flag; a non-global pattern would throw
 * from matchAll rather than silently take an ungoverned first match.
 * @param {string} source
 * @param {RegExp} pattern
 */
export function lineOfMatch(source, pattern) {
  for (const match of source.matchAll(pattern)) {
    return source.slice(0, match.index ?? 0).split('\n').length;
  }
  return 0;
}

export function gitFiles() {
  const result = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', env: childEnvironment, timeout: 10_000, maxBuffer: 2 * 1024 * 1024 });
  if (result.status !== 0) {
    fail(`git ls-files failed: ${(result.stderr ?? '').trim()}`);
    return [];
  }
  // The index still lists a file deleted in the working tree until the deletion
  // is committed. The structural checks evaluate the WORKING TREE, and a
  // declared deletion is governed by the workspace deletion gate, not by a
  // reader crashing on a path that no longer exists. Filtering here lets an
  // in-session deletion be validated before integration instead of failing
  // every unrelated rule that iterates tracked source.
  return (result.stdout ?? '').split('\0').filter(Boolean).filter((file) => {
    try {
      return fs.statSync(path.join(root, file)).isFile();
    } catch {
      return false;
    }
  });
}

/**
 * F-15 — every top-level entry point is executed as a process by at least one
 * automated test. Discovery is from the working tree so an untracked new bin
 * cannot hide from the rule before its first commit; a test that only reads the
 * bin's text does not count, and a newly added bin with no executing test fails
 * by name.
 * @param {string} directory
 * @param {(name: string) => boolean} predicate
 * @returns {string[]}
 */
export function walkWorkingTree(directory, predicate) {
  /** @type {string[]} */
  const results = [];
  for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) results.push(...walkWorkingTree(relative, predicate));
    else if (predicate(entry.name)) results.push(relative);
  }
  return results;
}

export function sha256Prefix(text) {
  return `sha256:${crypto.createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 24)}`;
}

export function gitResult(args) {
  return spawnSync('git', args, { cwd: root, encoding: 'utf8', env: childEnvironment, timeout: 30_000, maxBuffer: 16 * 1024 * 1024 });
}

export function pathIsInsideDirectory(directory, file) {
  return file === directory || file.startsWith(`${directory}/`);
}

/**
 * Blank comments with spaces so offsets and line numbers are preserved.
 *
 * Offset preservation is the point: `withoutComments` DELETES comment text, so
 * an index into its output no longer addresses the same character of the file,
 * and a line number derived from it is short by however many comment lines came
 * before. Anything that REPORTS A POSITION must scan this instead. Strings,
 * escapes and regex literals are all respected.
 */
export function codeWithCommentsBlanked(source) {
  const characters = source.split('');
  /** @type {'code'|'line'|'block'|'single'|'double'|'template'} */
  let mode = 'code';
  let index = 0;
  let previousSignificant = '';
  while (index < source.length) {
    const character = source[index];
    const next = source[index + 1];
    if (mode === 'code') {
      if (character === '\\') { index += 2; continue; }
      if (character === '/' && next === '/') { characters[index] = ' '; characters[index + 1] = ' '; mode = 'line'; index += 2; continue; }
      if (character === '/' && next === '*') { characters[index] = ' '; characters[index + 1] = ' '; mode = 'block'; index += 2; continue; }
      if (character === "'") { mode = 'single'; index += 1; continue; }
      if (character === '"') { mode = 'double'; index += 1; continue; }
      if (character === '`') { mode = 'template'; index += 1; continue; }
      // A regex literal is consumed whole. Without this, a pattern carrying a
      // quote — `/['"]run['"]/`, and this repository is full of them — reads as
      // a string start, and everything after it, comments included, is blanked
      // or preserved wrongly. Offsets stay right either way; CONTENT does not.
      if (character === '/' && REGEX_ALLOWED_BEFORE.test(previousSignificant)) {
        index += 1;
        let inClass = false;
        while (index < source.length) {
          const inner = source[index];
          if (inner === '\\') { index += 2; continue; }
          if (inner === '\n') break;
          if (inner === '[') { inClass = true; index += 1; continue; }
          if (inner === ']') { inClass = false; index += 1; continue; }
          if (inner === '/' && !inClass) { index += 1; break; }
          index += 1;
        }
        previousSignificant = '/';
        continue;
      }
      if (!/\s/.test(character)) previousSignificant = character;
      index += 1;
      continue;
    }
    if (mode === 'line') {
      if (character === '\n') mode = 'code';
      else characters[index] = ' ';
      index += 1;
      continue;
    }
    if (mode === 'block') {
      if (character === '*' && next === '/') { characters[index] = ' '; characters[index + 1] = ' '; mode = 'code'; index += 2; continue; }
      if (character !== '\n') characters[index] = ' ';
      index += 1;
      continue;
    }
    if (character === '\\') { index += 2; continue; }
    // A closed string is a value, so a `/` after it is division, not a regex.
    if ((mode === 'template' && character === '`') || (mode === 'single' && character === "'") || (mode === 'double' && character === '"')) { mode = 'code'; previousSignificant = character; }
    index += 1;
  }
  return characters.join('');
}
