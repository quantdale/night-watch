#!/usr/bin/env node

// Pure receipt adapter for the Phase 23 pre-DEV authority core. The facts file
// is a sanitized owner-local boundary: this command never reads credentials,
// source payloads, browser state, or raw CI logs, and it never contacts an
// external service.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKSPACE_ROOT = path.resolve(ROOT, '..', '..');

function fail(code) {
  throw new Error(`PHASE23_PREDEV_BLOCKED:${code}`);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') { args.help = true; continue; }
    if (!arg.startsWith('--')) { args._.push(arg); continue; }
    const separator = arg.indexOf('=');
    if (separator < 0) fail('FLAGS_REQUIRE_EQUALS');
    const key = arg.slice(2, separator);
    if (!/^[a-z][a-z0-9-]{0,48}$/.test(key) || Object.hasOwn(args, key)) fail('UNKNOWN_OR_DUPLICATE_FLAG');
    args[key] = arg.slice(separator + 1);
  }
  return args;
}

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

function help() {
  process.stdout.write('Usage: node bin/phase23-predev.mjs evaluate --facts=/external/sanitized-facts.json [--out=/external/receipt.json]\n');
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) help();
  else {
    if (args._[0] !== 'evaluate') fail('UNKNOWN_COMMAND');
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
