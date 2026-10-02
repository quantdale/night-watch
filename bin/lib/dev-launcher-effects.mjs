// @ts-check
// R5-06 / review-5 task A5.1 — the DEV-launcher effect analysis, by AST.
//
// A DEV launcher must call `guardDevLane` FIRST and must do nothing effectful
// between the guard and the point where it short-circuits `--help` /
// `--print-metadata` (`if (cli.stop) …`), because the guard deliberately exempts
// those flags. The R3-12/R4-09 scan matched call SHAPES on parsed statements; the
// review-5 mutants evaded it with twelve equivalent spellings (an IIFE, a
// destructured or aliased binding, `.call`/`Reflect.apply`, a namespace or bare
// named import, a function expression, `globalThis.fetch`, a `let` arrow, and an
// effect placed BEFORE the guard).
//
// This analysis resolves BINDINGS instead of spellings. It builds a symbol table
// of the module's top level (imports of effect-capable modules, aliases and
// destructuring of them, locally declared callables) and then classifies every
// call, `new`, dynamic `import()` and IIFE that RUNS in the judged regions
// (before the guard, and between the guard and the short-circuit). A function
// body that is only declared does not run; an immediately-invoked one does.
// Pure: no filesystem, process or network authority, and no engine dependency.

import typescript from 'typescript';

/** Module -> the effect category its members carry. */
const EFFECT_MODULES = new Map([
  ['child_process', 'PROCESS'], ['worker_threads', 'PROCESS'], ['cluster', 'PROCESS'],
  ['fs', 'FS'], ['fs/promises', 'FS'],
  ['http', 'NETWORK'], ['https', 'NETWORK'], ['http2', 'NETWORK'], ['net', 'NETWORK'], ['tls', 'NETWORK'],
  ['dgram', 'NETWORK'], ['dns', 'NETWORK'], ['dns/promises', 'NETWORK'],
  ['playwright', 'BROWSER'], ['playwright-core', 'BROWSER'], ['@playwright/test', 'BROWSER'],
]);

/** The FS members that mutate (read-only members are not effects). */
export const FS_MUTATIONS = new Set([
  'writeFile', 'writeFileSync', 'appendFile', 'appendFileSync', 'mkdir', 'mkdirSync', 'rm', 'rmSync',
  'rename', 'renameSync', 'copyFile', 'copyFileSync', 'cp', 'cpSync', 'createWriteStream', 'open', 'openSync',
  'unlink', 'unlinkSync', 'symlink', 'symlinkSync', 'rmdir', 'rmdirSync', 'truncate', 'truncateSync',
  'chmod', 'chmodSync', 'chown', 'chownSync', 'utimes', 'utimesSync', 'link', 'linkSync',
  'mkdtemp', 'mkdtempSync', 'writev', 'writevSync', 'futimes', 'futimesSync', 'lchown', 'lchownSync',
]);

/** Imported modules whose members are pure (no process, filesystem-mutation or network effect). */
const PURE_MODULES = new Set(['path', 'path/posix', 'path/win32', 'url', 'util', 'os', 'crypto', 'assert']);
/** Calls into a repository-local import that are known to be pure at load: the guard, the shared parser, and path/URL helpers. */
const PURE_IMPORTED_CALLS = new Set(['defineOperatorCli', 'guardDevLane', 'fileURLToPath', 'pathToFileURL', 'resolveSiblingRoot']);

/** Bare global callables that are effects when nothing local shadows them. */
const GLOBAL_EFFECT_CALLS = new Set(['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'execSync', 'spawnSync', 'spawn', 'exec', 'execFile', 'execFileSync', 'fork']);
const GLOBAL_OBJECTS = new Set(['globalThis', 'global', 'window', 'self']);
const NEW_EFFECTS = new Set(['WebSocket', 'Worker', 'XMLHttpRequest', 'EventSource', 'Socket']);
const BROWSER_MEMBERS = new Set(['chromium', 'firefox', 'webkit', 'launchPersistentContext', 'launch', 'connect']);

/**
 * @typedef {{ kind: 'module', category: string } | { kind: 'member', category: string, member: string } | { kind: 'local' } | { kind: 'import-module', source: string } | { kind: 'import', source: string, member: string } | { kind: 'alias', target: typescript.Expression }} Symbol
 * @typedef {{ line: number, text: string, region: 'BEFORE_GUARD' | 'BEFORE_SHORT_CIRCUIT' }} LauncherEffect
 * @typedef {{ guardFound: boolean, shortCircuitFound: boolean, effects: LauncherEffect[], problems: string[] }} LauncherAnalysis
 * @typedef {object} AnalysisOptions
 * @property {ReadonlySet<string>} [pureLocals]
 * @typedef {object} SampleParts
 * @property {string} [before]
 * @property {string} [between]
 * @property {string} [imports]
 * @typedef {object} SampleIdentity
 * @property {string} id
 * @property {string} name
 * @property {LauncherEffect['region']} [expectRegion]
 * @typedef {SampleParts & SampleIdentity} MutantSample
 */

/** @param {string} specifier */
function isPureSource(specifier) {
  return PURE_MODULES.has(specifier.startsWith('node:') ? specifier.slice('node:'.length) : specifier);
}

/** @param {string} specifier @returns {string | null} */
function categoryOfModule(specifier) {
  return EFFECT_MODULES.get(specifier.startsWith('node:') ? specifier.slice('node:'.length) : specifier) ?? null;
}

/** @param {typescript.Node} node @returns {string | null} */
function stringLiteralText(node) {
  return typescript.isStringLiteral(node) || typescript.isNoSubstitutionTemplateLiteral(node) ? node.text : null;
}

/**
 * Analyse one launcher's source.
 * @param {string} code
 * @param {string} [fileName]
 * @param {AnalysisOptions} [options]
 * @returns {LauncherAnalysis}
 */
export function analyzeDevLauncher(code, fileName = 'launcher.mjs', options = {}) {
  const sourceFile = typescript.createSourceFile(fileName, code, typescript.ScriptTarget.Latest, true, typescript.ScriptKind.JS);
  const pureLocals = options.pureLocals ?? new Set();
  /** @type {Map<string, Symbol>} */
  const symbols = new Map();
  /** @param {typescript.Node} node */
  const lineOf = (node) => sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  /** @param {typescript.Node} node */
  const textOf = (node) => node.getText(sourceFile).replace(/\s+/g, ' ').slice(0, 120);

  // ---- phase 1: the top-level symbol table --------------------------------
  /** @param {typescript.BindingName} name @param {typescript.Expression | undefined} initializer */
  const bind = (name, initializer) => {
    if (typescript.isIdentifier(name)) {
      if (initializer === undefined) return;
      const unwrapped = unwrap(initializer);
      if (typescript.isArrowFunction(unwrapped) || typescript.isFunctionExpression(unwrapped) || typescript.isClassExpression(unwrapped)) {
        symbols.set(name.text, { kind: 'local' });
      } else {
        symbols.set(name.text, { kind: 'alias', target: unwrapped });
      }
    } else if (typescript.isObjectBindingPattern(name) && initializer !== undefined) {
      for (const element of name.elements) {
        const property = element.propertyName !== undefined && typescript.isIdentifier(element.propertyName) ? element.propertyName.text : (typescript.isIdentifier(element.name) ? element.name.text : null);
        if (property === null || !typescript.isIdentifier(element.name)) continue;
        // `const { rmSync: remove } = fs` binds `remove` to `fs.rmSync`.
        symbols.set(element.name.text, { kind: 'alias', target: typescript.factory.createPropertyAccessExpression(unwrap(initializer), property) });
      }
    }
  };
  for (const statement of sourceFile.statements) {
    if (typescript.isImportDeclaration(statement) && typescript.isStringLiteral(statement.moduleSpecifier)) {
      const category = categoryOfModule(statement.moduleSpecifier.text);
      const clause = statement.importClause;
      if (clause === undefined) continue;
      if (category === null) {
        // Not an effect-capable platform module: a pure module's members are pure; any
        // OTHER import (a repository-local module) is a callable whose body is unknown.
        const source = statement.moduleSpecifier.text;
        if (clause.name !== undefined) symbols.set(clause.name.text, { kind: 'import-module', source });
        const named = clause.namedBindings;
        if (named !== undefined && typescript.isNamespaceImport(named)) symbols.set(named.name.text, { kind: 'import-module', source });
        if (named !== undefined && typescript.isNamedImports(named)) {
          for (const element of named.elements) symbols.set(element.name.text, { kind: 'import', source, member: (element.propertyName ?? element.name).text });
        }
        continue;
      }
      if (clause.name !== undefined) symbols.set(clause.name.text, { kind: 'module', category });
      const bindings = clause.namedBindings;
      if (bindings !== undefined && typescript.isNamespaceImport(bindings)) symbols.set(bindings.name.text, { kind: 'module', category });
      if (bindings !== undefined && typescript.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          symbols.set(element.name.text, { kind: 'member', category, member: (element.propertyName ?? element.name).text });
        }
      }
    } else if (typescript.isFunctionDeclaration(statement) && statement.name !== undefined) {
      symbols.set(statement.name.text, { kind: 'local' });
    } else if (typescript.isClassDeclaration(statement) && statement.name !== undefined) {
      symbols.set(statement.name.text, { kind: 'local' });
    } else if (typescript.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) bind(declaration.name, declaration.initializer);
    }
  }
  for (const name of pureLocals) if (symbols.get(name)?.kind === 'local') symbols.delete(name);

  /** @param {typescript.Expression} expression @returns {typescript.Expression} */
  function unwrap(expression) {
    let current = expression;
    while (typescript.isParenthesizedExpression(current) || typescript.isAsExpression(current) || typescript.isNonNullExpression(current) || typescript.isAwaitExpression(current)) current = current.expression;
    return current;
  }

  // ---- phase 2: resolve an expression to what it denotes -------------------
  /**
   * @param {typescript.Expression} expression
   * @param {number} depth
   * @returns {Symbol | { kind: 'global-call', name: string } | null}
   */
  function resolve(expression, depth = 0) {
    if (depth > 8) return null;
    const node = unwrap(expression);
    if (typescript.isIdentifier(node)) {
      const symbol = symbols.get(node.text);
      if (symbol === undefined) return GLOBAL_EFFECT_CALLS.has(node.text) ? { kind: 'global-call', name: node.text } : null;
      if (symbol.kind === 'alias') return resolve(symbol.target, depth + 1);
      return symbol;
    }
    if (typescript.isPropertyAccessExpression(node) || typescript.isElementAccessExpression(node)) {
      const member = typescript.isPropertyAccessExpression(node)
        ? node.name.text
        : (typescript.isElementAccessExpression(node) ? stringLiteralText(node.argumentExpression) : null);
      const base = unwrap(node.expression);
      if (typescript.isIdentifier(base) && GLOBAL_OBJECTS.has(base.text) && symbols.get(base.text) === undefined) {
        return member !== null && GLOBAL_EFFECT_CALLS.has(member) ? { kind: 'global-call', name: member } : null;
      }
      let inner = resolve(base, depth + 1);
      // `fs.promises` is the same module's promise API: its members carry the same effects.
      if (inner !== null && inner.kind === 'member' && inner.member === 'promises') inner = { kind: 'module', category: inner.category };
      if (inner !== null && inner.kind === 'module' && member !== null) return { kind: 'member', category: inner.category, member };
      if (member === null && inner !== null && inner.kind === 'module') return { kind: 'member', category: inner.category, member: '<computed>' };
      if (inner !== null && inner.kind === 'import-module') return { kind: 'import', source: inner.source, member: member ?? '<computed>' };
      return null;
    }
    // `require('child_process')`: a module binding.
    if (typescript.isCallExpression(node) && typescript.isIdentifier(node.expression) && node.expression.text === 'require') {
      const specifier = node.arguments[0] === undefined ? null : stringLiteralText(node.arguments[0]);
      const category = specifier === null ? null : categoryOfModule(specifier);
      return category === null ? null : { kind: 'module', category };
    }
    return null;
  }

  /**
   * Whether calling the denoted callable is an effect.
   * @param {Symbol | { kind: 'global-call', name: string } | null} target
   */
  const isEffectfulCallable = (target) => {
    if (target === null) return false;
    if (target.kind === 'global-call' || target.kind === 'local') return true;
    if (target.kind === 'import-module') return !isPureSource(target.source);
    if (target.kind === 'import') return !isPureSource(target.source) && !PURE_IMPORTED_CALLS.has(target.member);
    if (target.kind === 'member') {
      if (target.category === 'FS') return FS_MUTATIONS.has(target.member) || target.member === '<computed>';
      if (target.category === 'BROWSER') return BROWSER_MEMBERS.has(target.member) || target.member === '<computed>';
      return true;
    }
    return false;
  };

  /**
   * The callable a call expression's callee ultimately invokes, seeing through
   * `.call`, `.apply`, `.bind(...)(...)` and `Reflect.apply(fn, …)`.
   * @param {typescript.CallExpression} call
   * @returns {typescript.Expression}
   */
  function effectiveCallee(call) {
    const callee = unwrap(call.expression);
    if (typescript.isPropertyAccessExpression(callee) && (callee.name.text === 'call' || callee.name.text === 'apply' || callee.name.text === 'bind')) {
      const inner = unwrap(callee.expression);
      // `x.call` where x is not itself an effect keeps `.call` as the member.
      if (resolve(inner) !== null) return inner;
    }
    if (typescript.isPropertyAccessExpression(callee) && typescript.isIdentifier(unwrap(callee.expression)) && /** @type {typescript.Identifier} */ (unwrap(callee.expression)).text === 'Reflect' && callee.name.text === 'apply' && call.arguments[0] !== undefined) {
      return call.arguments[0];
    }
    return callee;
  }

  // ---- phase 3: walk what RUNS in the judged regions -----------------------
  /** @type {LauncherEffect[]} */
  const effects = [];
  /** @param {typescript.Node} node @param {LauncherEffect['region']} region */
  function walk(node, region) {
    if (typescript.isFunctionDeclaration(node) || typescript.isClassDeclaration(node) || typescript.isClassExpression(node) || typescript.isMethodDeclaration(node)
      || typescript.isGetAccessor(node) || typescript.isSetAccessor(node) || typescript.isConstructorDeclaration(node)) return;
    if (typescript.isArrowFunction(node) || typescript.isFunctionExpression(node)) return;
    if (typescript.isCallExpression(node)) {
      const callee = unwrap(node.expression);
      if (callee.kind === typescript.SyntaxKind.ImportKeyword) {
        effects.push({ line: lineOf(node), text: textOf(node), region });
      } else if (typescript.isArrowFunction(callee) || typescript.isFunctionExpression(callee)) {
        // An immediately-invoked function RUNS: its body is judged in place.
        walk(callee.body, region);
      } else if (isEffectfulCallable(resolve(effectiveCallee(node)))) {
        effects.push({ line: lineOf(node), text: textOf(node), region });
      } else if (typescript.isPropertyAccessExpression(callee) && (callee.name.text === 'then' || callee.name.text === 'catch' || callee.name.text === 'finally')) {
        // a promise continuation is a deferred callback: not judged here
      }
    } else if (typescript.isNewExpression(node)) {
      const callee = unwrap(node.expression);
      const name = typescript.isIdentifier(callee) ? callee.text : (typescript.isPropertyAccessExpression(callee) ? callee.name.text : null);
      const resolved = resolve(callee);
      if ((name !== null && NEW_EFFECTS.has(name) && symbols.get(name)?.kind !== 'local') || (resolved !== null && resolved.kind === 'member' && resolved.category !== 'FS' && resolved.category !== 'BROWSER')) {
        effects.push({ line: lineOf(node), text: textOf(node), region });
      }
    }
    typescript.forEachChild(node, (child) => walk(child, region));
  }

  // ---- phase 4: locate the guard and the short-circuit, judge the regions ---
  /** @type {string[]} */
  const problems = [];
  const statements = [...sourceFile.statements];
  /** @param {typescript.Node} node @param {(candidate: typescript.Node) => boolean} predicate */
  const contains = (node, predicate) => {
    let found = false;
    /** @param {typescript.Node} candidate */
    const visit = (candidate) => {
      if (found) return;
      if (predicate(candidate)) { found = true; return; }
      typescript.forEachChild(candidate, visit);
    };
    visit(node);
    return found;
  };
  const isCallTo = (/** @type {string} */ name) => (/** @type {typescript.Node} */ candidate) => typescript.isCallExpression(candidate) && typescript.isIdentifier(candidate.expression) && candidate.expression.text === name;
  const guardIndex = statements.findIndex((statement) => !typescript.isImportDeclaration(statement) && contains(statement, isCallTo('guardDevLane')));
  const cliIndex = statements.findIndex((statement, index) => index > guardIndex && guardIndex >= 0 && contains(statement, isCallTo('defineOperatorCli')));
  const shortCircuitIndex = cliIndex < 0 ? -1 : statements.findIndex((statement, index) => index > cliIndex && contains(statement, (candidate) => typescript.isPropertyAccessExpression(candidate) && candidate.name.text === 'stop'));
  if (guardIndex < 0) problems.push('DEV_LAUNCHER_NO_GUARD no top-level statement calls guardDevLane');
  else if (cliIndex < 0) problems.push('DEV_LAUNCHER_NO_OPERATOR_CLI no defineOperatorCli( statement follows the guard; a help/metadata query would not short-circuit');
  else if (shortCircuitIndex < 0) problems.push('DEV_LAUNCHER_NO_SHORT_CIRCUIT no `.stop` short-circuit statement follows defineOperatorCli(');
  if (guardIndex >= 0) {
    // BEFORE the guard: nothing may run except declarations (R5-06 item 12).
    for (let index = 0; index < guardIndex; index += 1) {
      const statement = statements[index];
      if (statement === undefined || typescript.isImportDeclaration(statement) || typescript.isExportDeclaration(statement)) continue;
      walk(statement, 'BEFORE_GUARD');
    }
    // BETWEEN the guard and the short-circuit.
    const stop = shortCircuitIndex >= 0 ? shortCircuitIndex : statements.length;
    for (let index = guardIndex + 1; index < stop; index += 1) {
      const statement = statements[index];
      if (statement === undefined || typescript.isImportDeclaration(statement) || typescript.isExportDeclaration(statement)) continue;
      walk(statement, 'BEFORE_SHORT_CIRCUIT');
    }
  }
  // The guard statement itself is judged too (a `guardDevLane(…)` call wrapped in other
  // effects inside one block is still an effect); the guard call itself resolves to a
  // pure imported call and is never reported.
  if (guardIndex >= 0) {
    const guardStatement = statements[guardIndex];
    if (guardStatement !== undefined) walk(guardStatement, 'BEFORE_SHORT_CIRCUIT');
  }
  return { guardFound: guardIndex >= 0, shortCircuitFound: shortCircuitIndex >= 0, effects, problems };
}

/**
 * The twelve equivalent spellings review-5 R5-06 evaded the old scan with, each
 * as a synthetic launcher. Every one must report at least one effect.
 * @type {ReadonlyArray<MutantSample>}
 */
export const DEV_LAUNCHER_MUTANT_SAMPLES = Object.freeze([
  { id: 'M01', name: 'arrow IIFE', between: '(() => { fs.rmSync(scratch); })();' },
  { id: 'M02', name: 'destructured fs binding', between: 'const { rmSync } = fs; rmSync(scratch);' },
  { id: 'M03', name: 'Reflect.apply', between: "Reflect.apply(spawnSync, null, ['/bin/true']);" },
  { id: 'M04', name: '.call on an effect', between: "spawnSync.call(null, '/bin/true');" },
  { id: 'M05', name: 'aliased process binding', between: "const run = spawnSync; run('/bin/true');" },
  { id: 'M06', name: 'function expression then call', between: 'const helper = function () { fs.rmSync(scratch); }; helper();' },
  { id: 'M07', name: 'namespace child_process import', imports: "import * as childProcess from 'node:child_process';", between: "childProcess.execFileSync('/bin/true');" },
  { id: 'M08', name: 'bare named fs import', imports: "import { writeFileSync } from 'node:fs';", between: "writeFileSync(scratch, 'x');" },
  { id: 'M09', name: 'globalThis.fetch', between: "globalThis.fetch('http://127.0.0.1:1');" },
  { id: 'M10', name: 'let arrow then call', between: 'let go = () => fs.rmSync(scratch); go();' },
  { id: 'M11', name: '.call on a local function', between: 'function localFn() { fs.rmSync(scratch); }\nlocalFn.call(null);' },
  { id: 'M12', name: 'effect before the guard', before: 'fs.rmSync(scratch);', expectRegion: 'BEFORE_GUARD' },
  // Beyond the twelve the review named: the same default-deny closes the class.
  { id: 'M13', name: 'repository-local imported callable', imports: "import { thing } from './lib/thing.mjs';", between: 'thing();' },
  { id: 'M14', name: 'repository-local namespace member', imports: "import * as lib from './lib/thing.mjs';", between: 'lib.run();' },
  { id: 'M15', name: 'require() of an effect module', between: "const cp = require('child_process'); cp.execSync('/bin/true');" },
  { id: 'M16', name: 'new WebSocket', between: "new WebSocket('ws://127.0.0.1:1');" },
  { id: 'M17', name: 'dynamic import', between: `await ${'import'}('node:child_process');` },
  { id: 'M18', name: 'effect inside try/if blocks', between: 'try { if (scratch) { fs.unlinkSync(scratch); } } catch { /* bounded */ }' },
  { id: 'M19', name: 'computed fs member', between: "fs['rmSync'](scratch);" },
  { id: 'M20', name: 'bind then call', between: "spawnSync.bind(null)('/bin/true');" },
  { id: 'M21', name: 'destructured and renamed process binding', between: "const { spawnSync: launch } = childProcessNamespace; launch('/bin/true');", imports: "import * as childProcessNamespace from 'node:child_process';" },
  { id: 'M22', name: 'alias chain of two', between: "const first = fs.rmSync; const second = first; second(scratch);" },
]);

/**
 * Compose one synthetic launcher around a mutant sample. Pure.
 * @param {SampleParts} sample
 * @returns {string}
 */
export function composeSyntheticLauncher(sample) {
  return [
    "import { spawnSync } from 'node:child_process';",
    "import fs from 'node:fs';",
    sample.imports ?? '',
    "import { guardDevLane } from './lib/dev-lane-precondition.mjs';",
    "import { defineOperatorCli } from './lib/operator-cli.mjs';",
    "const root = '/x';",
    "const scratch = '/x/scratch';",
    sample.before ?? '',
    "guardDevLane({ root, launcher: 'fixture.mjs', args: process.argv.slice(2) });",
    sample.between ?? '',
    'const cli = defineOperatorCli(META, { entryUrl: import.meta.url });',
    'if (cli.stop) {',
    '} else {',
    "  spawnSync('/bin/true', []);",
    '  fs.rmSync(scratch);',
    '}',
    '',
  ].join('\n');
}

/**
 * The analysis's behavioural self-test: every mutant sample must be reported,
 * the clean launcher must not, and a declared-but-not-run function body must not.
 * @returns {string[]} findings (empty when the analysis is sound)
 */
export function devLauncherAnalysisSelfTest() {
  /** @type {string[]} */
  const findings = [];
  const clean = analyzeDevLauncher(composeSyntheticLauncher({ between: 'const helper = () => { fs.rmSync(scratch); };\nfunction other() { spawnSync("/bin/true"); }\nconst data = JSON.parse(\'{}\');' }));
  if (clean.effects.length > 0 || clean.problems.length > 0 || !clean.guardFound || !clean.shortCircuitFound) {
    findings.push(`DEV_LAUNCHER_ANALYSIS_SELFTEST the clean synthetic launcher was not judged clean (${clean.effects.length} effect(s), ${clean.problems.length} problem(s))`);
  }
  for (const sample of DEV_LAUNCHER_MUTANT_SAMPLES) {
    const result = analyzeDevLauncher(composeSyntheticLauncher(sample));
    const wanted = sample.expectRegion ?? 'BEFORE_SHORT_CIRCUIT';
    if (!result.effects.some((effect) => effect.region === wanted)) {
      findings.push(`DEV_LAUNCHER_ANALYSIS_SELFTEST the analysis missed ${sample.id} (${sample.name}); the R5-06 evasion is back`);
    }
  }
  return findings;
}
