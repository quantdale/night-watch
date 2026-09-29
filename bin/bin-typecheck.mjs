#!/usr/bin/env node
// @ts-check

// Nightwatch — the `bin/**` type-check lane (F-15.5).
//
// `tsconfig.json` excludes `bin/**` by construction, so a wrongly shaped
// argument to a loaded module is invisible until the bin executes. This lane
// checks every bin under `checkJs` with the root project's `strict` and
// `noUncheckedIndexedAccess` settings.
//
// The lane is deliberately REPORTING while the bin surface is annotated in
// batches: it reports the conformance count without failing solely because
// bins remain non-conforming. The per-file/total ratchets still fail closed
// on growth in every mode. It also fails closed on a stale generated loader
// declaration, inline suppression, stale/unknown exemption, or unavailable
// TypeScript toolchain.
// `--write` regenerates the loader declaration; `--config-check` runs the fast
// self-checks without invoking TypeScript.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { countDiagnosticSilencingAnnotations, judgeRatchet } from './lib/typecheck-ratchet.mjs';
import { extractLoaderCallSites, renderLoaderTypeMap } from './lib/cli-implementation-contract.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** @type {import('./lib/operator-cli.mjs').OperatorCliMetadata} */
const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'bin-typecheck',
  entry: 'bin/bin-typecheck.mjs',
  purpose: 'Check every bin under the root type settings with a conformance count and no weakened gate.',
  group: 'validate',
  flags: [
    { name: '--json', shape: 'boolean', summary: 'emit exactly one JSON document in config-check mode' },
    { name: '--write', shape: 'boolean', summary: 'regenerate the loader declaration' },
    { name: '--config-check', shape: 'boolean', summary: 'run the fast self-checks without TypeScript' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: ['bin/lib/typescript-runtime-loader.d.mts with --write'],
};
const CONFIG_PATH = path.join(ROOT, 'config', 'bin-typecheck.v1.json');
const LOADER_DECLARATION_PATH = path.join(ROOT, 'bin', 'lib', 'typescript-runtime-loader.d.mts');
const TSCONFIG_PATH = path.join(ROOT, 'tsconfig.bin.json');
const SCHEMA = 'nightwatch.bin-typecheck.v1';
const MODES = new Set(['REPORTING', 'BLOCKING']);
const MAX_BUFFER = 32 * 1024 * 1024;
const TYPECHECK_TIMEOUT_MS = 600_000;

/**
 * @typedef {{ schemaVersion?: string, mode?: string, exemptions?: { bin?: string, reason?: string }[], perFileCeilings?: { bin?: string, maxErrors?: number }[], totalCeiling?: number, anyAnnotationBudget?: number }} BinTypecheckConfig
 * @typedef {{ code: string, detail: string }} BinTypecheckError
 */

/** @param {string} file */
function readText(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

/** Every top-level `bin/*.mjs` entry point, sorted. */
function entryPoints() {
  return fs.readdirSync(path.join(ROOT, 'bin'))
    .filter((name) => name.endsWith('.mjs'))
    .sort()
    .map((name) => `bin/${name}`);
}

/** Every JavaScript source and declaration checked by tsconfig.bin.json. */
function binTypecheckFiles() {
  /** @type {string[]} */
  const files = [];
  /** @param {string} directory */
  const walk = (directory) => {
    for (const entry of fs.readdirSync(path.join(ROOT, directory), { withFileTypes: true })) {
      const relative = directory === '.' ? entry.name : `${directory}/${entry.name}`;
      if (entry.isDirectory()) walk(relative);
      else if (entry.name.endsWith('.mjs') || entry.name.endsWith('.d.mts')) files.push(relative);
    }
  };
  walk('bin');
  return files.sort((left, right) => left.localeCompare(right));
}

/** Every JavaScript source under bin/, including bin/lib, for loader extraction. */
function binSources() {
  /** @type {{ file: string, source: string }[]} */
  const files = [];
  /** @param {string} directory */
  const walk = (directory) => {
    for (const entry of fs.readdirSync(path.join(ROOT, directory), { withFileTypes: true })) {
      const relative = directory === '.' ? entry.name : `${directory}/${entry.name}`;
      if (entry.isDirectory()) walk(relative);
      else if (entry.name.endsWith('.mjs')) files.push({ file: relative, source: readText(relative) });
    }
  };
  walk('bin');
  return files.sort((left, right) => left.file.localeCompare(right.file));
}

/**
 * The sources whose widening annotations are budgeted: every bin `.mjs` AND
 * every `.d.mts` declaration under bin/ (RV-07: a widened declaration is as
 * silencing as a widened JSDoc tag).
 */
function annotationSources() {
  /** @type {{ file: string, source: string }[]} */
  const files = [...binSources()];
  /** @param {string} directory */
  const walk = (directory) => {
    for (const entry of fs.readdirSync(path.join(ROOT, directory), { withFileTypes: true })) {
      const relative = `${directory}/${entry.name}`;
      if (entry.isDirectory()) walk(relative);
      else if (entry.name.endsWith('.d.mts')) files.push({ file: relative, source: readText(relative) });
    }
  };
  walk('bin');
  return files.sort((left, right) => left.file.localeCompare(right.file));
}

function expectedLoaderDeclaration() {
  const { callSites } = extractLoaderCallSites(binSources());
  const paths = [...new Set(callSites.flatMap((site) => site.bindings.map((binding) => binding.path)).filter(Boolean))];
  return renderLoaderTypeMap(paths);
}

/** @returns {BinTypecheckConfig} */
function loadConfig() {
  const raw = JSON.parse(readText('config/bin-typecheck.v1.json'));
  if (raw.schemaVersion !== SCHEMA) throw new Error(`BIN_TYPECHECK_CONFIG_SCHEMA_UNSUPPORTED:${String(raw.schemaVersion)}`);
  if (typeof raw.mode !== 'string' || !MODES.has(raw.mode)) throw new Error(`BIN_TYPECHECK_CONFIG_MODE_INVALID:${String(raw.mode)}`);
  if (!Array.isArray(raw.exemptions)) throw new Error('BIN_TYPECHECK_CONFIG_EXEMPTIONS_INVALID');
  if (!Array.isArray(raw.perFileCeilings)) throw new Error('BIN_TYPECHECK_CONFIG_CEILINGS_INVALID');
  // VB-07 / corrections task 2.7 — a missing total or annotation ceiling is
  // a broken ratchet, not an opt-out. Both are required first-class fields.
  if (!Number.isInteger(raw.totalCeiling) || raw.totalCeiling < 0) {
    throw new Error(`BIN_TYPECHECK_CONFIG_TOTAL_CEILING_INVALID:${String(raw.totalCeiling)}`);
  }
  if (!Number.isInteger(raw.anyAnnotationBudget) || raw.anyAnnotationBudget < 0) {
    throw new Error(`BIN_TYPECHECK_CONFIG_ANNOTATION_BUDGET_INVALID:${String(raw.anyAnnotationBudget)}`);
  }
  return raw;
}

/**
 * The per-file diagnostic ceiling ratchet (A-13 / B-07 / D-13 regression
 * guard): while the bin surface is annotated down to zero in batches, no
 * declared file may GROW past its ceiling. The ceiling is enforced in every
 * mode — REPORTING describes the burn-down, it never permits growth.
 * @param {BinTypecheckConfig} config
 */
function loadCeilings(config) {
  /** @type {Map<string, number>} */
  const ceilings = new Map();
  for (const entry of config.perFileCeilings ?? []) {
    if (typeof entry?.bin !== 'string' || !entry.bin.startsWith('bin/')) {
      throw new Error(`BIN_TYPECHECK_CEILING_BIN_INVALID:${JSON.stringify(entry)}`);
    }
    const maxErrors = entry.maxErrors;
    if (typeof maxErrors !== 'number' || !Number.isInteger(maxErrors) || maxErrors < 0) {
      throw new Error(`BIN_TYPECHECK_CEILING_MAX_INVALID:${JSON.stringify(entry)}`);
    }
    if (ceilings.has(entry.bin)) throw new Error(`BIN_TYPECHECK_CEILING_DUPLICATE:${entry.bin}`);
    ceilings.set(entry.bin, maxErrors);
  }
  return ceilings;
}

/** @param {BinTypecheckConfig} config */
function loadExemptions(config) {
  /** @type {Map<string, string>} */
  const exemptions = new Map();
  for (const entry of config.exemptions ?? []) {
    if (typeof entry?.bin !== 'string' || typeof entry.reason !== 'string' || entry.reason.trim().length < 12) {
      throw new Error(`BIN_TYPECHECK_EXEMPTION_ENTRY_INVALID:${JSON.stringify(entry)}`);
    }
    if (exemptions.has(entry.bin)) throw new Error(`BIN_TYPECHECK_EXEMPTION_DUPLICATE:${entry.bin}`);
    exemptions.set(entry.bin, entry.reason);
  }
  return exemptions;
}

// The directives are assembled at runtime so this detector's own source does
// not contain the literal it forbids.
const SUPPRESSION_DIRECTIVES = ['@ts-' + 'nocheck', '@ts-' + 'ignore', '@ts-' + 'expect-error'];

function checkInlineSuppressions() {
  /** @type {BinTypecheckError[]} */
  const errors = [];
  for (const source of binSources()) {
    for (const directive of SUPPRESSION_DIRECTIVES) {
      if (source.source.includes(directive)) errors.push({ code: 'BIN_TYPECHECK_INLINE_SUPPRESSION', detail: `${source.file} ${directive}` });
    }
  }
  return errors;
}

function checkLoaderDeclaration() {
  /** @type {BinTypecheckError[]} */
  const errors = [];
  if (!fs.existsSync(LOADER_DECLARATION_PATH)) {
    return [{ code: 'BIN_TYPECHECK_LOADER_TYPES_MISSING', detail: 'bin/lib/typescript-runtime-loader.d.mts' }];
  }
  const onDisk = fs.readFileSync(LOADER_DECLARATION_PATH, 'utf8');
  const expected = expectedLoaderDeclaration();
  if (onDisk !== expected) errors.push({ code: 'BIN_TYPECHECK_LOADER_TYPES_STALE', detail: 'run: node bin/bin-typecheck.mjs --write' });
  return errors;
}

/**
 * Parse `tsc --pretty false` output into per-file diagnostics.
 * @param {string} output
 */
function diagnosticsByFile(output) {
  /** @type {Map<string, number>} */
  const byFile = new Map();
  for (const line of output.split(/\r?\n/)) {
    const match = /^(.+?)\((\d+),(\d+)\): error TS\d+:/.exec(line);
    if (!match) continue;
    const reportedFile = match[1];
    if (reportedFile === undefined) continue;
    const absolute = path.resolve(ROOT, reportedFile);
    const file = path.relative(ROOT, absolute).split(path.sep).join('/');
    byFile.set(file, (byFile.get(file) ?? 0) + 1);
  }
  return byFile;
}

function runTsc() {
  const tsc = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
  if (!fs.existsSync(tsc)) return { ok: false, output: '', code: 'BIN_TYPECHECK_TOOLCHAIN_UNAVAILABLE' };
  const result = spawnSync(process.execPath, [tsc, '-p', TSCONFIG_PATH, '--pretty', 'false'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: TYPECHECK_TIMEOUT_MS,
    maxBuffer: MAX_BUFFER,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (result.error || output.trim() === '') {
    return { ok: false, output, code: 'BIN_TYPECHECK_TOOLCHAIN_UNAVAILABLE' };
  }
  return { ok: true, output, code: null };
}

function main() {
  const cli = defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url });
  if (cli.stop) return;
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const write = args.includes('--write');
  const configCheck = args.includes('--config-check');
  const config = loadConfig();
  const exemptions = loadExemptions(config);
  const ceilings = loadCeilings(config);
  const bins = entryPoints();
  const checkedFiles = binTypecheckFiles();
  /** @type {BinTypecheckError[]} */
  const hardErrors = [];

  if (bins.length === 0 || checkedFiles.length === 0) hardErrors.push({ code: 'BIN_TYPECHECK_VACUOUS', detail: 'zero entry points or checked source files discovered' });
  for (const bin of exemptions.keys()) {
    if (!bins.includes(bin)) hardErrors.push({ code: 'BIN_TYPECHECK_EXEMPTION_UNKNOWN', detail: bin });
  }
  for (const file of ceilings.keys()) {
    if (!checkedFiles.includes(file)) hardErrors.push({ code: 'BIN_TYPECHECK_CEILING_UNKNOWN', detail: file });
  }
  hardErrors.push(...checkInlineSuppressions());
  hardErrors.push(...checkLoaderDeclaration());

  if (write) {
    fs.writeFileSync(LOADER_DECLARATION_PATH, expectedLoaderDeclaration());
    process.stdout.write(`[typecheck:bin] wrote ${path.relative(ROOT, LOADER_DECLARATION_PATH)}\n`);
    return;
  }

  if (configCheck) {
    const result = hardErrors.length === 0 ? 'PASS' : 'FAIL';
    if (json) {
      process.stdout.write(`${JSON.stringify({ schemaVersion: SCHEMA, mode: config.mode, result, bins: bins.length, exemptions: exemptions.size, hardErrors }, null, 2)}\n`);
    } else {
      for (const error of hardErrors) process.stderr.write(`[typecheck:bin] ERROR: ${error.code}: ${error.detail}\n`);
      process.stdout.write(`[typecheck:bin] config-check ${result}: bins=${bins.length} mode=${config.mode} exemptions=${exemptions.size}\n`);
    }
    if (hardErrors.length > 0) process.exitCode = 1;
    return;
  }

  const run = runTsc();
  /** @type {Map<string, number>} */
  let diagnostics = new Map();
  if (run.ok) {
    diagnostics = diagnosticsByFile(run.output);
    for (const file of diagnostics.keys()) {
      if (!checkedFiles.includes(file)) {
        hardErrors.push({ code: 'BIN_TYPECHECK_DIAGNOSTIC_FILE_UNKNOWN', detail: file });
      }
    }
  } else {
    hardErrors.push({ code: run.code ?? 'BIN_TYPECHECK_TOOLCHAIN_UNAVAILABLE', detail: 'typecheck did not produce a judgement' });
  }

  /** @type {{ bin: string, errors: number }[]} */
  const nonConforming = [];
  let conforming = 0;
  for (const bin of bins) {
    const errors = diagnostics.get(bin) ?? 0;
    if (errors === 0) conforming += 1;
    else nonConforming.push({ bin, errors });
  }
  const exemptedClean = [...exemptions.keys()].filter((bin) => (diagnostics.get(bin) ?? 0) === 0);
  for (const bin of exemptedClean) {
    hardErrors.push({ code: 'BIN_TYPECHECK_EXEMPTION_STALE', detail: `${bin} now passes; remove its exemption` });
  }

  // VB-07 / corrections task 2.7 — the REAL ratchet: every bin's measured
  // count is judged against its declared ceiling (EXCEEDED, or STALE when the
  // file improved without lowering its ceiling in the same change), a
  // non-conforming bin without a ceiling is MISSING, the summed surface is
  // judged against the total ceiling, and the diagnostic-silencing `any`
  // annotation budget prevents JSDoc type widening from disguising diagnostic growth.
  /** @type {{ bin: string, errors: number, maxErrors: number }[]} */
  const ceilingBreach = [];
  const annotationsMeasured = countDiagnosticSilencingAnnotations(annotationSources());
  {
    const ratchet = judgeRatchet({
      // The ratchet covers every file included by tsconfig.bin.json, not just
      // the 76 top-level CLI entry points. This prevents a diagnostic moving
      // into bin/lib from hiding behind an unchanged total.
      perFile: new Map(checkedFiles.map((file) => [file, diagnostics.get(file) ?? 0])),
      total: [...diagnostics.values()].reduce((sum, count) => sum + count, 0),
      annotations: annotationsMeasured,
      config: {
        perFile: ceilings,
        totalCeiling: config.totalCeiling ?? null,
        anyAnnotationBudget: config.anyAnnotationBudget ?? null,
      },
    });
    for (const error of ratchet) {
      hardErrors.push(error);
      const exceeded = /^([^ ]+) has (\d+) diagnostics; ceiling (\d+)/.exec(error.detail);
      const exceededBin = exceeded?.[1];
      const exceededErrors = exceeded?.[2];
      const exceededCeiling = exceeded?.[3];
      if (error.code === 'BIN_TYPECHECK_CEILING_EXCEEDED'
        && exceededBin !== undefined && exceededErrors !== undefined && exceededCeiling !== undefined) {
        ceilingBreach.push({ bin: exceededBin, errors: Number(exceededErrors), maxErrors: Number(exceededCeiling) });
      }
    }
  }

  const blocking = config.mode === 'BLOCKING';
  const blockingFailures = nonConforming.filter((entry) => !exemptions.has(entry.bin));
  const result = hardErrors.length > 0 || (blocking && blockingFailures.length > 0) ? 'FAIL' : 'PASS';
  const report = {
    schemaVersion: SCHEMA,
    mode: config.mode,
    result,
    reportOnly: !blocking,
    totalBins: bins.length,
    conformingBins: conforming,
    typeErrorDiagnostics: [...diagnostics.values()].reduce((total, count) => total + count, 0),
    nonConforming,
    exemptions: [...exemptions.keys()].sort(),
    perFileCeilings: [...ceilings.entries()].map(([bin, maxErrors]) => ({ bin, maxErrors, errors: diagnostics.get(bin) ?? 0 })),
    ceilingBreach,
    totalCeiling: config.totalCeiling ?? null,
    anyAnnotationBudget: config.anyAnnotationBudget ?? null,
    annotationsMeasured,
    hardErrors,
  };

  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    for (const error of hardErrors) process.stderr.write(`[typecheck:bin] ERROR: ${error.code}: ${error.detail}\n`);
    process.stdout.write(
      `[typecheck:bin] ${result}: conformance=${conforming}/${bins.length} mode=${config.mode}` +
        ` errors=${report.typeErrorDiagnostics} exemptions=${exemptions.size} ceilings=${ceilings.size}\n`,
    );
    if (nonConforming.length > 0) {
      process.stdout.write(`[typecheck:bin] non-conforming: ${nonConforming.map((entry) => `${entry.bin}(${entry.errors})`).join(', ')}\n`);
    }
  }
  if (hardErrors.length > 0 || (blocking && blockingFailures.length > 0)) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  process.stderr.write(`[typecheck:bin] ERROR: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
