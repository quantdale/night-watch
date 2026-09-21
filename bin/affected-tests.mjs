#!/usr/bin/env node

// F-PERF-4: deterministic affected-test selection.
//
//   node bin/affected-tests.mjs --base=<sha-or-ref> [--json] [--count]
//
// The base is explicit and required: there is no silent default that could
// compare against the wrong history. The change set is every tracked path that
// differs from the base (committed, staged and unstaged) plus untracked files.
// The impact graph is the repository import graph shared with hardening; a
// changed source file the graph cannot place broadens the selection instead of
// being ignored. An empty change set is a refusal.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModules } from './lib/typescript-runtime-loader.mjs';
import { referenceGraph } from './lib/hardening/rules/source-integrity.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli, invokedDirectly } from './lib/operator-cli.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POLICY_PATH = path.join(root, 'config', 'affected-tests.v1.json');
const TEST_MATCH = [/^tests\/.*\.(?:test|smoke)\.ts$/, /^scenarios\/.*\.smoke\.ts$/];

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'affected-tests',
  entry: 'bin/affected-tests.mjs',
  purpose: 'Select the tests impacted by the tracked change set since an explicit base revision.',
  group: 'validate',
  flags: [
    { name: '--base', shape: 'string', summary: 'explicit base revision (sha or ref) to compare against' },
    { name: '--json', shape: 'boolean', summary: 'emit exactly one JSON selection document' },
    { name: '--count', shape: 'boolean', summary: 'print only the selected test count' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: [],
};

function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 30_000, maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`AFFECTED_GIT_FAILED:${args[0]}`);
  return (result.stdout ?? '').split('\n').filter(Boolean);
}

const cli = invokedDirectly(import.meta.url) ? defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url }) : { stop: true };
if (!cli.stop) {
  try {
    const base = typeof cli.flags['--base'] === 'string' ? cli.flags['--base'].trim() : '';
    if (base === '') {
      console.error(JSON.stringify({ schemaVersion: 'nightwatch.affected-tests.v1', ok: false, code: 'AFFECTED_BASE_REQUIRED' }));
      process.exitCode = 2;
    } else {
      const [affected] = loadTypeScriptModules(['src/core/validation/affectedTests.ts'], { root });
      const changed = [...new Set([
        ...git(['diff', '--name-only', '--no-renames', base]),
        ...git(['ls-files', '--others', '--exclude-standard']),
      ])].sort();
      const trackedTests = git(['ls-files', '*.test.ts', '*.smoke.ts']).filter((file) => TEST_MATCH.some((pattern) => pattern.test(file)));
      const untrackedTests = git(['ls-files', '--others', '--exclude-standard']).filter((file) => TEST_MATCH.some((pattern) => pattern.test(file)));
      const testFiles = [...new Set([...trackedTests, ...untrackedTests])].sort();
      const graph = referenceGraph();
      const policy = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
      const result = affected.deriveAffectedTests({
        changedFiles: changed,
        testFiles,
        edges: (graph?.edges ?? []).map((edge) => ({ from: edge.from, to: edge.to })),
        policy: {
          broadenPrefixes: policy.broadenPrefixes ?? [],
          alwaysRun: policy.alwaysRun ?? [],
          sourcePrefixes: policy.sourcePrefixes ?? [],
        },
      });
      if (cli.flags['--count'] === true) {
        console.log(String(result.counts.selected));
      } else if (cli.json) {
        console.log(JSON.stringify(result, null, 2));
      } else if (!affected.affectedSelectionIsRunnable(result)) {
        console.error(`[affected-tests] REFUSED ${result.code}`);
        console.error(JSON.stringify(result, null, 2));
      } else {
        console.log(`[affected-tests] ${result.code} changed=${result.counts.changed} universe=${result.counts.universe} selected=${result.counts.selected} broadened=${result.broadened}`);
        for (const file of result.selectedTests) console.log(file);
      }
      process.exitCode = affected.affectedSelectionIsRunnable(result) ? 0 : 2;
    }
  } catch (error) {
    console.error(JSON.stringify({ schemaVersion: 'nightwatch.affected-tests.v1', ok: false, code: error instanceof Error ? error.message : 'AFFECTED_INVALID' }));
    process.exitCode = 1;
  }
}
