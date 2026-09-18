#!/usr/bin/env node
// @ts-check

/**
 * Invariant family: source, loader and schema integrity.
 *
 * The environment surface declaration, parse-level syntax validity, the
 * reference graph (reachability and module barriers) and the schema version
 * lifecycle. The shared property is that the SHAPE of the source — what it
 * reads, what it imports, what versions it persists — is declared and current.
 *
 * `readReferenceGraphConfig`, `referenceGraph` and `evaluateReferenceGraph` are
 * exported because the entry point's `--report-reachability` mode reports the
 * same graph these rules enforce, from one implementation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import typescript from 'typescript';
import {
  root,
  childEnvironment,
  fail,
  readIncludingComments,
  readDataFile,
  gitFiles,
  pathIsInsideDirectory,
  codeWithCommentsBlanked,
  isRuleEngineSource,
} from '../kernel.mjs';
import { collectExportedNames, extractLoaderCallSites, resolveRelativeModule } from '../../cli-implementation-contract.mjs';
import { loadTypeScriptModule } from '../../typescript-runtime-loader.mjs';

/**
 * F-19. Every NIGHTWATCH_* variable a production source reads must be declared
 * in `config/environment-surface.v1.json`, and a runtime-assembled name must
 * be enumerated there rather than invented at the read site.
 */
export function checkEnvironmentSurfaceDeclaration() {
  let declaration;
  try {
    declaration = JSON.parse(readDataFile('config/environment-surface.v1.json'));
  } catch (error) {
    fail(`environment surface declaration is unreadable: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  if (declaration === null || typeof declaration !== 'object' || declaration.schemaVersion !== 'nightwatch.environment-surface.v1') {
    fail(`env/environment surface declaration schemaVersion is not nightwatch.environment-surface.v1`);
    return;
  }
  if (!Array.isArray(declaration.variables) || declaration.variables.length === 0) {
    fail('environment surface declaration carries no variables; an empty declaration is not a surface');
    return;
  }
  const declared = new Set();
  for (const entry of declaration.variables) {
    if (entry === null || typeof entry !== 'object' || typeof entry.name !== 'string' || !/^NIGHTWATCH_[A-Z0-9_]+$/.test(entry.name)) {
      fail('environment surface declaration carries an invalid variable entry');
      continue;
    }
    if (typeof entry.secretBearing !== 'boolean' || typeof entry.purpose !== 'string' || entry.purpose.trim().length < 12) {
      fail(`environment surface declaration entry ${entry.name} lacks purpose/secretBearing`);
      continue;
    }
    declared.add(entry.name);
  }
  const assembledEntries = Array.isArray(declaration.assembledReads) ? declaration.assembledReads : [];
  const assembled = new Set(
    assembledEntries
      .filter((entry) => entry !== null && typeof entry === 'object' && typeof entry.construction === 'string')
      .map((entry) => entry.construction),
  );
  for (const entry of assembledEntries) {
    if (entry === null || typeof entry !== 'object' || typeof entry.name !== 'string' || !declared.has(entry.name)) {
      fail('environment surface declaration names an assembled read whose variable is not declared');
    }
  }
  const sources = gitFiles()
    .filter((file) => (file.startsWith('src/') || file.startsWith('bin/')) && /\.(?:ts|mjs)$/.test(file))
    .filter((file) => !isRuleEngineSource(file));
  let discovered = 0;
  for (const file of sources) {
    // Comments are blanked (not removed) so every reported line is the real
    // line a reviewer opens, while a comment can never declare a variable.
    const code = codeWithCommentsBlanked(readIncludingComments(file));
    /** @type {Map<string, number>} */
    const reads = new Map();
    const addRead = (name, match) => {
      const line = code.slice(0, match.index ?? 0).split('\n').length;
      if (!reads.has(name)) reads.set(name, line);
    };
    for (const match of code.matchAll(/process\.env\.(NIGHTWATCH_[A-Z0-9_]+)/g)) addRead(match[1], match);
    for (const match of code.matchAll(/process\.env\[\s*'NIGHTWATCH_([A-Z0-9_]+)'\s*\]/g)) addRead(`NIGHTWATCH_${match[1]}`, match);
    for (const match of code.matchAll(/(?:environment|env)\[\s*'NIGHTWATCH_([A-Z0-9_]+)'\s*\]/g)) addRead(`NIGHTWATCH_${match[1]}`, match);
    for (const [name, line] of reads) {
      discovered += 1;
      if (!declared.has(name)) {
        fail(`environment surface: ${file}:${line} reads ${name} with no declaration in config/environment-surface.v1.json`);
      }
    }
    for (const match of code.matchAll(/process\.env\[\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\]/g)) {
      const identifier = match[1];
      const enumerated = [...assembled].some((construction) => construction.includes(`[${identifier}]`));
      if (!enumerated) {
        const line = code.slice(0, match.index ?? 0).split('\n').length;
        fail(`environment surface: ${file}:${line} reads process.env[${identifier}] with a runtime-assembled name that is not enumerated in assembledReads`);
      }
    }
  }
  if (discovered === 0) {
    fail('environment surface: no NIGHTWATCH_* read was discovered; the scanner is broken rather than the surface clean');
  }
}

export function checkSyntax() {
  const files = fs.readdirSync(path.join(root, 'bin')).filter((item) => item.endsWith('.mjs')).sort();
  if (files.length === 0) return;
  // One batched child performs the same syntax-only parse that per-file
  // `node --check` performed (ESM goal, never executed), without paying one
  // Node startup per file. Any parse error still fails the check with the
  // offending bin file identified.
  const batchedCheck = [
    "const { readFileSync } = require('node:fs');",
    'const vm = require("node:vm");',
    'let failures = 0;',
    'for (const file of process.argv.slice(1)) {',
    '  try { new vm.SourceTextModule(readFileSync(file, "utf8"), { identifier: file }); }',
    '  catch (error) { failures += 1; console.error(String(error && error.stack ? error.stack : error)); }',
    '}',
    'process.exit(failures === 0 ? 0 : 1);',
  ].join('\n');
  const result = spawnSync(process.execPath, ['--experimental-vm-modules', '-e', batchedCheck, ...files.map((file) => path.join(root, 'bin', file))], { cwd: root, encoding: 'utf8', timeout: 60_000, maxBuffer: 4 * 1024 * 1024, env: childEnvironment });
  if (result.status !== 0) fail(`node --check failed for bin/: ${(result.stderr ?? '').trim()}`);
}

/**
 * F-13/F-14. The reference graph over tracked source.
 *
 * R-12 made the test universe total: an unclassified test fails the gate. There
 * was no corresponding rule over SOURCE, so an entire subsystem could typecheck,
 * ship and be referenced by nothing. Two subsystems reached that state, and
 * eleven `index.ts` barrels declared public surfaces nothing imported.
 *
 * This graph resolves three edge kinds, because omitting any one produces false
 * positives that would force the rule to be disabled:
 *
 *   1. static `import`/`export ... from`, `require` and literal dynamic
 *      `import()`;
 *   2. the dynamic `loadTypeScriptModule`/`loadTypeScriptModules` string-literal
 *      paths in `bin/*.mjs` (F-15) — omitting these wrongly marks the Control
 *      Center server, the self-dev sandbox planner/executor, and most of
 *      `src/core` as unreachable;
 *   3. `require.resolve` specifiers, invisible to import scanners and already
 *      the cause of one real break (DEF-FC-03, the Vue fixture).
 *
 * Reachability is forward from executable roots (`tests/`, `bin/`, `ui/`,
 * `scenarios/`) plus any `src` module with an inbound edge from outside its own
 * directory. A dead subsystem cannot bootstrap itself alive through its own
 * internal imports, while a module that is only imported by a live sibling is
 * reached through that sibling — which is exactly the sandbox planner/executor
 * case the naive rule would misreport.
 *
 * A module intended to exist without a consumer appears in the declared
 * reasoned-retention list. The list fails in BOTH directions: an unlisted dead
 * module fails, and a listed module that gains a consumer is stale and fails.
 * `config/reference-graph.v1.json` also declares enforced module barriers; a
 * consumer outside an enforced module must import its barrel, not a deep path.
 */
export const REFERENCE_GRAPH_CONFIG = 'config/reference-graph.v1.json';
export const REFERENCE_GRAPH_ROOTS = Object.freeze(['src/', 'tests/', 'bin/', 'ui/', 'scenarios/']);
export const REFERENCE_GRAPH_SOURCE_RE = /\.(?:ts|tsx|mts|cts|mjs|js|jsx)$/;
export const REFERENCE_GRAPH_CANDIDATE_RE = /^src\/.*\.(?:ts|tsx)$/;

export function readReferenceGraphConfig(rule) {
  let config;
  try {
    config = JSON.parse(readIncludingComments(REFERENCE_GRAPH_CONFIG));
  } catch (error) {
    fail(`${rule} cannot read ${REFERENCE_GRAPH_CONFIG}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
  if (config.schemaVersion !== 'nightwatch.reference-graph.v1') {
    fail(`${rule} ${REFERENCE_GRAPH_CONFIG} schemaVersion is ${String(config.schemaVersion)}, not nightwatch.reference-graph.v1`);
    return null;
  }
  if (!Array.isArray(config.retention)) {
    fail(`${rule} ${REFERENCE_GRAPH_CONFIG} declares no retention list; an absent list is not an empty one`);
    return null;
  }
  if (!Array.isArray(config.enforcedBarriers)) {
    fail(`${rule} ${REFERENCE_GRAPH_CONFIG} declares no enforced-barrier list`);
    return null;
  }
  return config;
}

export function referenceGraphFiles() {
  return gitFiles().filter((file) => (
    REFERENCE_GRAPH_ROOTS.some((prefix) => file.startsWith(prefix))
    && REFERENCE_GRAPH_SOURCE_RE.test(file)
    && !file.endsWith('.d.ts')
    && !file.endsWith('.d.mts')
    && !file.endsWith('.d.cts')
  ));
}

export function referenceModuleDirectory(file) {
  const slash = file.lastIndexOf('/');
  return slash < 0 ? '' : file.slice(0, slash);
}

export function referenceGraphAccess() {
  return {
    /** @param {string} relativePath */
    readSource(relativePath) {
      try {
        return fs.readFileSync(path.join(root, relativePath), 'utf8');
      } catch {
        return null;
      }
    },
    /** @param {string} relativePath */
    fileExists(relativePath) {
      try {
        return fs.statSync(path.join(root, relativePath)).isFile();
      } catch {
        return false;
      }
    },
  };
}

/** @type {{ files: string[], fileSet: Set<string>, edges: { from: string, to: string, kind: string, line: number }[], parsed: number } | null} */
let referenceGraphCache = null;

export function buildReferenceGraph() {
  const files = referenceGraphFiles();
  const fileSet = new Set(files);
  const access = referenceGraphAccess();
  /** @type {{ from: string, to: string, kind: string, line: number }[]} */
  const edges = [];
  const edgeKeys = new Set();
  const addEdge = (from, to, kind, line) => {
    if (typeof to !== 'string' || to.length === 0) return;
    const key = `${from}\0${to}\0${kind}\0${line}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ from, to, kind, line });
  };
  let parsed = 0;
  for (const file of files) {
    const raw = readIncludingComments(file);
    if (raw.length === 0) continue;
    const scriptKind = file.endsWith('.tsx') || file.endsWith('.jsx')
      ? typescript.ScriptKind.TSX
      : file.endsWith('.ts') || file.endsWith('.mts') || file.endsWith('.cts')
        ? typescript.ScriptKind.TS
        : typescript.ScriptKind.JS;
    const sourceFile = typescript.createSourceFile(file, raw, typescript.ScriptTarget.Latest, true, scriptKind);
    parsed += 1;
    const lineOf = (node) => sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    const resolveLiteral = (literal, line, kind) => {
      const specifier = literal.text;
      if (!specifier.startsWith('.')) {
        addEdge(file, `external:${specifier}`, `${kind}_EXTERNAL`, line);
        return;
      }
      const target = resolveRelativeModule(file, specifier, access.fileExists);
      if (target === null) {
        addEdge(file, `unresolved:${specifier}`, `${kind}_UNRESOLVED`, line);
        return;
      }
      addEdge(file, target, kind, line);
    };
    /** @param {typescript.Node} node */
    const visit = (node) => {
      if (
        typescript.isImportDeclaration(node)
        && typescript.isStringLiteralLike(node.moduleSpecifier)
      ) {
        resolveLiteral(node.moduleSpecifier, lineOf(node), 'IMPORT');
      } else if (
        typescript.isExportDeclaration(node)
        && node.moduleSpecifier
        && typescript.isStringLiteralLike(node.moduleSpecifier)
      ) {
        resolveLiteral(node.moduleSpecifier, lineOf(node), 'REEXPORT');
      } else if (typescript.isCallExpression(node)) {
        const callee = node.expression;
        if (
          typescript.isIdentifier(callee)
          && callee.text === 'require'
          && typescript.isStringLiteralLike(node.arguments[0])
        ) {
          resolveLiteral(node.arguments[0], lineOf(node), 'REQUIRE');
        } else if (
          callee.kind === typescript.SyntaxKind.ImportKeyword
          && typescript.isStringLiteralLike(node.arguments[0])
        ) {
          resolveLiteral(node.arguments[0], lineOf(node), 'DYNAMIC_IMPORT');
        } else if (
          typescript.isPropertyAccessExpression(callee)
          && callee.getText(sourceFile) === 'require.resolve'
          && typescript.isStringLiteralLike(node.arguments[0])
        ) {
          resolveLiteral(node.arguments[0], lineOf(node), 'REQUIRE_RESOLVE');
        }
      }
      typescript.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  const binSources = files
    .filter((file) => file.startsWith('bin/') && file.endsWith('.mjs'))
    .map((file) => ({ file, source: readIncludingComments(file) }));
  const loader = extractLoaderCallSites(binSources);
  for (const site of loader.callSites) {
    for (const binding of site.bindings) addEdge(site.file, binding.path, 'LOADER', site.line);
  }
  return { files, fileSet, edges, parsed };
}

export function referenceGraph() {
  if (referenceGraphCache === null) referenceGraphCache = buildReferenceGraph();
  return referenceGraphCache;
}

/** @param {Record<string, unknown>} config @param {string} file */
export function retentionEntryFor(config, file) {
  for (const entry of /** @type {{ path?: unknown, kind?: unknown }[]} */ (config.retention ?? [])) {
    if (entry === null || typeof entry !== 'object' || typeof entry.path !== 'string') continue;
    if (entry.kind === 'DIRECTORY' ? pathIsInsideDirectory(entry.path, file) : entry.path === file) return entry;
  }
  return null;
}

export function evaluateReferenceGraph(graph, config) {
  /** @type {{ code: string, detail: string }[]} */
  const findings = [];
  if (graph.edges.length === 0) {
    return [{ code: 'REFERENCE_GRAPH_EMPTY', detail: 'zero edges resolved; the resolver is broken rather than the repository clean' }];
  }
  if (graph.parsed < 100) {
    return [{ code: 'REFERENCE_GRAPH_VACUOUS', detail: `only ${graph.parsed} tracked source files parsed; discovery is broken` }];
  }
  /** @type {Map<string, { from: string }>} */
  const externalInbound = new Map();
  for (const edge of graph.edges) {
    if (!graph.fileSet.has(edge.to)) continue;
    if (referenceModuleDirectory(edge.from) === referenceModuleDirectory(edge.to)) continue;
    if (!externalInbound.has(edge.to)) externalInbound.set(edge.to, { from: edge.from });
  }
  /** @type {Map<string, string[]>} */
  const outgoing = new Map();
  for (const edge of graph.edges) {
    if (!graph.fileSet.has(edge.to)) continue;
    const list = outgoing.get(edge.from) ?? [];
    list.push(edge.to);
    outgoing.set(edge.from, list);
  }
  const alive = new Set();
  const queue = [];
  const seed = (file) => {
    if (graph.fileSet.has(file) && !alive.has(file)) {
      alive.add(file);
      queue.push(file);
    }
  };
  for (const file of graph.files) if (!file.startsWith('src/')) seed(file);
  for (const file of externalInbound.keys()) if (file.startsWith('src/')) seed(file);
  while (queue.length > 0) {
    const current = /** @type {string} */ (queue.pop());
    for (const next of outgoing.get(current) ?? []) seed(next);
  }
  const access = referenceGraphAccess();
  for (const entry of /** @type {Record<string, unknown>[]} */ (config.retention ?? [])) {
    if (entry === null || typeof entry !== 'object' || typeof entry.path !== 'string') {
      findings.push({ code: 'REFERENCE_RETENTION_SHAPE', detail: 'a retention entry has no path' });
      continue;
    }
    if (!fs.existsSync(path.join(root, entry.path))) {
      findings.push({ code: 'REFERENCE_RETENTION_MISSING', detail: `${entry.path} is retained but does not exist; a retention entry for a removed module is stale` });
    }
    if (typeof entry.reason !== 'string' || entry.reason.trim().length < 12) {
      findings.push({ code: 'REFERENCE_RETENTION_REASON', detail: `${entry.path} is retained without a stated reason` });
    }
  }
  for (const file of graph.files) {
    if (!REFERENCE_GRAPH_CANDIDATE_RE.test(file)) continue;
    const retained = retentionEntryFor(config, file);
    if (alive.has(file)) {
      if (retained !== null) {
        findings.push({ code: 'REFERENCE_RETENTION_STALE', detail: `${file} is retained by ${retained.path} but is now referenced outside its directory; remove the stale retention entry` });
      }
      continue;
    }
    if (retained !== null) continue;
    const exported = collectExportedNames(file, access);
    findings.push({
      code: 'REFERENCE_UNREFERENCED_MODULE',
      detail: `${file} exports=${exported.names.size} has no reference to any export outside its own directory and is not retained; adopt, remove, or declare it in ${REFERENCE_GRAPH_CONFIG}`,
    });
  }
  return findings;
}

export function checkSourceReachability() {
  const config = readReferenceGraphConfig('SOURCE_REACHABILITY');
  if (config === null) return;
  for (const finding of evaluateReferenceGraph(referenceGraph(), config)) {
    fail(`${finding.code} ${finding.detail}`);
  }
}

export function checkModuleBarrierEnforcement() {
  const config = readReferenceGraphConfig('MODULE_BARRIER');
  if (config === null) return;
  const barriers = /** @type {{ module?: unknown, barrel?: unknown, reason?: unknown }[]} */ (config.enforcedBarriers ?? []);
  if (barriers.length === 0) {
    fail('MODULE_BARRIER no enforced module barrier is declared; the rule would pass vacuously');
    return;
  }
  const graph = referenceGraph();
  if (graph.edges.length === 0) {
    fail('MODULE_BARRIER the reference graph resolved zero edges; the barrier rule cannot evaluate fail-closed');
    return;
  }
  for (const barrier of barriers) {
    if (barrier === null || typeof barrier !== 'object' || typeof barrier.module !== 'string' || typeof barrier.barrel !== 'string' || !barrier.barrel.startsWith(`${barrier.module}/`)) {
      fail(`MODULE_BARRIER invalid barrier declaration: ${JSON.stringify(barrier)}`);
      continue;
    }
    if (!fs.existsSync(path.join(root, barrier.barrel))) {
      fail(`MODULE_BARRIER ${barrier.module} declares barrel ${barrier.barrel}, which does not exist`);
      continue;
    }
    if (typeof barrier.reason !== 'string' || barrier.reason.trim().length < 12) {
      fail(`MODULE_BARRIER ${barrier.barrel} is enforced without a stated reason`);
    }
    let inbound = 0;
    for (const edge of graph.edges) {
      if (
        graph.fileSet.has(edge.to)
        && pathIsInsideDirectory(barrier.module, edge.to)
        && edge.to !== barrier.barrel
        && !pathIsInsideDirectory(barrier.module, edge.from)
      ) {
        fail(`MODULE_BARRIER_DEEP_IMPORT ${edge.from}:${edge.line} imports deep path ${edge.to}; consumers outside ${barrier.module} must import its barrel ${barrier.barrel}`);
      }
      if (edge.to === barrier.barrel && !pathIsInsideDirectory(barrier.module, edge.from)) inbound += 1;
    }
    if (inbound === 0) {
      fail(`MODULE_BARRIER_UNUSED ${barrier.barrel} has no consumer outside ${barrier.module}; an enforced barrel must be the boundary consumers actually use`);
    }
  }
}

/**
 * F-17. Every `nightwatch.<name>.v<n>` schema identifier under `src/` must be
 * declared at its exact version, and every declaration must still resolve to
 * discovered bytes. The pure scanner/declaration rule lives in
 * `src/core/schemaLifecycle/check.ts` and is loaded through the bounded
 * runtime loader; this rule fails on each judgement finding with its code and
 * guards the zero-discovered scan so a scanner that stops matching can never
 * present as a clean repository.
 */
export function checkSchemaLifecycle() {
  let lifecycle;
  try {
    lifecycle = loadTypeScriptModule('src/core/schemaLifecycle/check.ts', { root });
  } catch (error) {
    fail(`SCHEMA_LIFECYCLE_LOAD_FAILED src/core/schemaLifecycle/check.ts could not be loaded: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  const result = lifecycle.runSchemaLifecycleCheck({ root });
  const judgement = result?.judgement;
  const discovered = result?.discovered;
  if (!judgement || !Array.isArray(judgement.findings) || !Array.isArray(discovered)) {
    fail('SCHEMA_LIFECYCLE_JUDGEMENT_MALFORMED the schema-lifecycle check returned no usable judgement');
    return;
  }
  if (discovered.length === 0) {
    fail('SCHEMA_SCAN_EMPTY the schema scanner discovered zero identifiers under src/; the scan is broken rather than the repository clean');
    return;
  }
  for (const finding of judgement.findings) {
    fail(`${finding.code} ${finding.detail}`);
  }
}
