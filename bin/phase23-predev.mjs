#!/usr/bin/env node

// Pure receipt adapter for the Phase 23 pre-DEV authority core. The facts file
// is a sanitized owner-local boundary: this command never reads credentials,
// source payloads, browser state, or raw CI logs, and it never contacts an
// external service.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from './lib/typescript-runtime-loader.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKSPACE_ROOT = path.resolve(ROOT, '..', '..');

function fail(code) {
  throw new Error(`PHASE23_PREDEV_BLOCKED:${code}`);
}

/**
 * A-12 / 10.2: the shared operator-CLI contract. The facts/output paths are the
 * only options, and they stay ABSOLUTE and EXTERNAL (the adapter's own boundary
 * check, not the parser's); `--help`/`--print-metadata` answer without reading
 * a facts file, and an unknown option or command is refused with exit 2.
 */
/** @type {import('./lib/operator-cli.mjs').OperatorCliMetadata} */
const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'phase23-predev',
  entry: 'bin/phase23-predev.mjs',
  purpose: 'Evaluate the Phase 23 pre-DEV authority from a sanitized owner-local facts file and emit the receipt; never contacts an external service.',
  group: 'validate',
  commands: [{ name: 'evaluate', summary: 'evaluate the pre-DEV authority from --facts' }],
  commandRequired: true,
  flags: [
    { name: '--facts', shape: 'path', required: true, summary: 'absolute external path of the sanitized facts JSON' },
    { name: '--out', shape: 'path', summary: 'absolute external path for the receipt (mode 0600)' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: [],
};

function loadTypeScriptModule(file) {
  return loadRuntimeTypeScriptModule(file, { root: ROOT });
}

function externalFile(file, label) {
  if (typeof file !== 'string' || !path.isAbsolute(file)) fail(`${label}_MUST_BE_ABSOLUTE`);
  const resolved = path.resolve(file);
  if (resolved === ROOT || resolved.startsWith(ROOT + path.sep) || resolved === WORKSPACE_ROOT || resolved.startsWith(WORKSPACE_ROOT + path.sep)) fail(`${label}_MUST_BE_EXTERNAL`);
  try {
    const stat = fs.lstatSync(resolved);
    if (!stat.isFile() || stat.isSymbolicLink()) fail(`${label}_NOT_REGULAR`);
  } catch { fail(`${label}_UNAVAILABLE`); }
  return resolved;
}

function writeOutput(file, value) {
  if (file === undefined) return;
  const resolved = externalFile(file, 'OUTPUT');
  fs.writeFileSync(resolved, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
}

try {
  const cli = defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url });
  if (cli.ok !== true || cli.stop === true) {
    // The shared parser answered --help/--print-metadata or refused an argument;
    // no facts file was read and no receipt was produced.
  } else if (cli.command !== 'evaluate') fail('UNKNOWN_COMMAND');
  else {
    const args = {
      _: [],
      facts: cli.flags['--facts'],
      out: cli.flags['--out'],
    };
    const factsFile = externalFile(args.facts, 'FACTS');
    let facts;
    try { facts = JSON.parse(fs.readFileSync(factsFile, 'utf8')); }
    catch { fail('FACTS_INVALID_JSON'); }
    const preDev = loadTypeScriptModule('src/core/qualityGate/preDev.ts');
    const receipt = preDev.evaluatePreDevAuthority(facts);
    writeOutput(args.out, receipt);
    process.stdout.write(JSON.stringify(receipt) + '\n');
    process.exitCode = receipt.state === 'READY_FOR_DEV' ? 0 : 1;
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
