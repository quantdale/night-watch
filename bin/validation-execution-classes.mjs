#!/usr/bin/env node

// F-PERF-2: execution-class declaration authority.
//
//   node bin/validation-execution-classes.mjs check   # validate the committed declaration
//   node bin/validation-execution-classes.mjs --write # regenerate from mechanical signals
//
// The declaration is versioned data; the judgement is pure TS. `--write` is
// only a regeneration convenience — the committed file is the authority and
// the check refuses a declaration that is weaker than the mechanical
// detection, missing a discovered file, or naming a file that no longer
// exists.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadTypeScriptModules } from './lib/typescript-runtime-loader.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli, invokedDirectly } from './lib/operator-cli.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = path.join(root, 'config', 'validation-execution-classes.v1.json');
const TEST_MATCH = [/^tests\/.*\.(?:test|smoke)\.ts$/, /^scenarios\/.*\.smoke\.ts$/];

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'validation-execution-classes',
  entry: 'bin/validation-execution-classes.mjs',
  purpose: 'Declare and validate one execution class per discovered test file.',
  group: 'validate',
  flags: [
    { name: '--write', shape: 'boolean', summary: 'regenerate the declaration from mechanical signals' },
    { name: '--json', shape: 'boolean', summary: 'emit exactly one JSON document' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: ['config/validation-execution-classes.v1.json (only with --write)'],
};

function discoverTrackedTests() {
  const result = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error('EXECUTION_CLASSES_GIT_UNAVAILABLE');
  return (result.stdout ?? '')
    .split('\n')
    .filter(Boolean)
    .filter((file) => TEST_MATCH.some((pattern) => pattern.test(file)))
    .sort();
}

function readSources(files) {
  const sources = new Map();
  for (const file of files) {
    try {
      sources.set(file, fs.readFileSync(path.join(root, file), 'utf8'));
    } catch {
      // A discovered but unreadable file is simply absent; the validator then
      // fails closed with EXECUTION_CLASS_SOURCE_UNAVAILABLE.
    }
  }
  return sources;
}

const cli = invokedDirectly(import.meta.url) ? defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url }) : { stop: true };
if (!cli.stop) {
  try {
    const [classes] = loadTypeScriptModules(['src/core/validation/executionClasses.ts'], { root });
    const discovered = discoverTrackedTests();
    const sources = readSources(discovered);
    if (cli.flags['--write'] === true) {
      const declaration = classes.buildExecutionClassesDeclaration({ discovered, sources });
      fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(declaration, null, 2)}\n`, 'utf8');
      const counts = {};
      for (const entry of Object.values(declaration.files)) counts[entry.class] = (counts[entry.class] ?? 0) + 1;
      console.log(JSON.stringify({ schemaVersion: declaration.schemaVersion, result: 'WRITTEN', fileCount: discovered.length, counts }));
    } else {
      const declaration = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      const judgement = classes.validateExecutionClasses({ discovered, sources, declaration });
      const counts = {};
      for (const entry of Object.values(declaration.files ?? {})) counts[entry.class] = (counts[entry.class] ?? 0) + 1;
      if (cli.json) {
        console.log(JSON.stringify({ schemaVersion: declaration.schemaVersion, result: judgement.ok ? 'PASS' : 'FAIL', fileCount: discovered.length, counts, violations: judgement.violations }, null, 2));
      } else {
        console.log(`[execution-classes] discovered=${discovered.length} ${Object.entries(counts).map(([key, value]) => `${key}=${value}`).join(' ')}`);
        for (const violation of judgement.violations.slice(0, 16)) console.error(`[execution-classes] ERROR: ${violation.code}: ${violation.detail}`);
        console.log(judgement.ok ? '[execution-classes] PASS: every discovered test carries a non-weakening execution class' : `[execution-classes] FAIL (${judgement.violations.length} violation(s))`);
      }
      if (!judgement.ok) process.exitCode = 1;
    }
  } catch (error) {
    console.error(JSON.stringify({ result: 'CONFIG_INVALID', code: error instanceof Error ? error.message : 'EXECUTION_CLASSES_INVALID' }));
    process.exitCode = 2;
  }
}
