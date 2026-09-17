#!/usr/bin/env node
// @ts-check

// ---------------------------------------------------------------------------
// NW-PROJ-010 (Wave 2, stage 1) — test-oracle quality driver.
//
// Loads the owner-declared test-oracle quality configuration, reads the
// declared PHP test files through the confined sibling-source boundary, runs
// the bounded static classifier, and writes the sanitized assurance-gap
// report. No product test executes and no product source is mutated.
//
// Stage 1 boundary: the report is an assurance-gap artifact, never a finding.
//
// Usage: node bin/test-oracle-quality.mjs [--config <path>] [--json] [--out <path>]
// Exit: 0 no assurance concern · 1 concern present · 2 declaration error.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';
import { loadTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_CONFIG = 'config/test-oracle-quality.v1.json';
const DEFAULT_OUTPUT = 'artifacts/test-oracle-quality/current.json';
const MAX_CONFIG_BYTES = 64 * 1024;

const CONCERN_VERDICTS = new Set([
  'MIRROR_ONLY',
  'UNDECLARED_SKIP',
  'EARLY_RETURN_DISABLED',
  'ASSERTION_SURFACE_ABSENT',
  'LIVE_INFRA_DEPENDENCY',
  'CLASSIFICATION_AMBIGUOUS',
]);

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'test-oracle-quality',
  entry: 'bin/test-oracle-quality.mjs',
  purpose: 'Statically classify declared PHP test-oracle quality (mirror/skip/early-return/assertion surface) without executing any test; assurance-gap only.',
  group: 'validate',
  flags: [
    { name: '--config', shape: 'path', summary: 'owner-declared test-oracle quality config (default config/test-oracle-quality.v1.json, at most 64 KiB)' },
    { name: '--json', shape: 'boolean', summary: 'emit the sanitized report as JSON' },
    { name: '--out', shape: 'path', summary: 'report destination (default artifacts/test-oracle-quality/current.json)' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: ['artifacts/test-oracle-quality/current.json'],
};

function fail(code, detail) {
  process.stderr.write(detail === undefined ? `[test-oracle-quality] ERROR: ${code}\n` : `[test-oracle-quality] ERROR: ${code}: ${detail}\n`);
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
  const core = loadTypeScriptModule('src/core/source/testOracleQuality.ts');

  const siblingRoot = path.resolve(process.env.NIGHTWATCH_REPOS_ROOT ?? DEFAULT_SIBLING_ROOT);
  const access = createSiblingSourceAccess(siblingRoot);
  const report = core.runTestOracleQuality({ config, reader: access.reader, currentness: access.currentness });

  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  } catch (error) {
    return fail('REPORT_WRITE_FAILED', String(error?.code ?? 'UNKNOWN'));
  }

  if (cli.flags['--json'] === true) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    for (const target of report.targets) {
      process.stdout.write(`[test-oracle-quality] ${target.path} ${target.verdict}\n`);
    }
    process.stdout.write(`[test-oracle-quality] digest=${report.reportDigest} targets=${report.targets.length}\n`);
  }
  if (report.targets.length === 1 && report.targets[0].verdict === 'DECLARATION_INVALID') process.exitCode = 2;
  else if (report.targets.some((target) => CONCERN_VERDICTS.has(target.verdict))) process.exitCode = 1;
  else process.exitCode = 0;
}

main();
