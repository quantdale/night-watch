#!/usr/bin/env node
/**
 * Nightwatch W8 efficacy corpus runner.
 *
 *   node bin/efficacy-corpus.mjs baseline    # W7-projected request surface
 *   node bin/efficacy-corpus.mjs candidate   # live request surface
 *   node bin/efficacy-corpus.mjs compare     # both, with signed deltas
 *
 * LOCAL only. Deterministic: no provider, no network, no product data. The
 * investigator is the repository-owned stateless simulated investigator, so a
 * before/after comparison isolates the reasoner-visible contract instead of
 * model behaviour. Output is a single JSON document on stdout.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModules } from './lib/typescript-runtime-loader.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli, invokedDirectly } from './lib/operator-cli.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'efficacy-corpus',
  entry: 'bin/efficacy-corpus.mjs',
  purpose: 'Run the deterministic W8 efficacy corpus baseline, candidate or comparison.',
  group: 'inspect-intelligence',
  commands: [
    { name: 'baseline', summary: 'run the W7-projected request surface' },
    { name: 'candidate', summary: 'run the live request surface' },
    { name: 'compare', summary: 'run both and render signed deltas' },
  ],
  defaultCommand: 'compare',
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: [],
};

const cli = invokedDirectly(import.meta.url) ? defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url }) : { stop: true };
const command = cli.stop ? 'compare' : (cli.command ?? 'compare');

function fail(message) {
  process.stderr.write(`NIGHTWATCH_EFFICACY: ${message}\n`);
  process.exitCode = 2;
}

const MODES = new Map([
  ['baseline', 'W7_BASELINE'],
  ['candidate', 'W8_MEMORY'],
]);

if (!cli.stop) {
const [efficacy] = loadTypeScriptModules(['src/core/efficacy/index.ts'], { root });

try {
  if (command === 'compare') {
    const result = await efficacy.runEfficacyBeforeAfter();
    process.stdout.write(`${JSON.stringify({
      schemaVersion: 'nightwatch.efficacy-before-after.v1',
      corpusId: efficacy.EFFICACY_CORPUS_ID,
      baseline: result.baseline,
      candidate: result.candidate,
      comparison: result.comparison,
    }, null, 2)}\n`);
  } else if (MODES.has(command)) {
    const report = await efficacy.runEfficacyCorpus({ mode: MODES.get(command) });
    process.stdout.write(`${JSON.stringify({ corpusId: efficacy.EFFICACY_CORPUS_ID, report }, null, 2)}\n`);
  } else {
    fail(`unknown command ${command}; use baseline|candidate|compare`);
  }
} catch (error) {
  fail(error instanceof Error ? error.message : 'EFFICACY_RUN_FAILED');
}
}
