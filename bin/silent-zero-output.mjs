#!/usr/bin/env node
// @ts-check

// ---------------------------------------------------------------------------
// NW-PROJ-003 (Wave 2, static precursor) — silent zero-output driver.
//
// Loads the owner-declared handler/input contracts, reads the declared source
// through the confined sibling-source boundary, runs the bounded static guard
// analysis, and writes the sanitized report. This is NOT a runtime claim: the
// report carries runtimeFailureClaim NONE. No product code executes.
//
// Usage: node bin/silent-zero-output.mjs [--config <path>] [--json] [--out <path>]
// Exit: 0 no precursor · 1 precursor present · 2 declaration error.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';
import { loadTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_CONFIG = 'config/silent-zero-output-contracts.v1.json';
const DEFAULT_OUTPUT = 'artifacts/silent-zero-output/current.json';
const MAX_CONFIG_BYTES = 64 * 1024;

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'silent-zero-output',
  entry: 'bin/silent-zero-output.mjs',
  purpose: 'Statically check declared handler skip paths against declared required input roles; precursor observation only, runtimeFailureClaim NONE.',
  group: 'validate',
  flags: [
    { name: '--config', shape: 'path', summary: 'owner-declared silent-zero-output contracts (default config/silent-zero-output-contracts.v1.json, at most 64 KiB)' },
    { name: '--json', shape: 'boolean', summary: 'emit the sanitized report as JSON' },
    { name: '--out', shape: 'path', summary: 'report destination (default artifacts/silent-zero-output/current.json)' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: ['artifacts/silent-zero-output/current.json'],
};

function fail(code, detail) {
  process.stderr.write(detail === undefined ? `[silent-zero-output] ERROR: ${code}\n` : `[silent-zero-output] ERROR: ${code}: ${detail}\n`);
  process.exitCode = 2;
}

function main() {
  const cli = defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url });
  if (cli.stop) return;
  if (!cli.ok) {
    process.exitCode = 2;
    return;
  }
  const configArg = cli.flags['--config'];
  const configPath = typeof configArg === 'string' && configArg.trim() !== '' ? configArg : path.join(root, DEFAULT_CONFIG);
  const outArg = cli.flags['--out'];
  const outPath = typeof outArg === 'string' && outArg.trim() !== '' ? outArg : path.join(root, DEFAULT_OUTPUT);

  let configText;
  try {
    configText = fs.readFileSync(configPath, 'utf8');
  } catch {
    return fail('CONFIG_UNREADABLE', configPath);
  }
  if (configText.length > MAX_CONFIG_BYTES) return fail('CONFIG_TOO_LARGE');
  let config;
  try {
    config = JSON.parse(configText);
  } catch {
    return fail('CONFIG_INVALID_JSON');
  }

  const { createSiblingSourceAccess } = loadTypeScriptModule('src/core/source/siblingSource.ts');
  const { DEFAULT_SIBLING_ROOT } = loadTypeScriptModule('src/core/source/siblingRoot.ts');
  const core = loadTypeScriptModule('src/core/source/silentZeroOutput.ts');

  const siblingRoot = path.resolve(process.env.NIGHTWATCH_REPOS_ROOT ?? DEFAULT_SIBLING_ROOT);
  const access = createSiblingSourceAccess(siblingRoot);
  const report = core.runSilentZeroOutput({ config, reader: access.reader, currentness: access.currentness });

  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  } catch (error) {
    return fail('REPORT_WRITE_FAILED', String(error?.code ?? 'UNKNOWN'));
  }

  for (const handler of report.handlers) process.stdout.write(`[silent-zero-output] ${handler.handlerId} ${handler.verdict}\n`);
  process.stdout.write(`[silent-zero-output] digest=${report.reportDigest} handlers=${report.handlers.length}\n`);
  const precursor = report.handlers.some((handler) => handler.verdict === 'STATIC_ZERO_OUTPUT_PRECURSOR');
  const invalid = report.handlers.some((handler) => handler.verdict === 'DECLARATION_INVALID');
  process.exitCode = invalid ? 2 : precursor ? 1 : 0;
}

main();
