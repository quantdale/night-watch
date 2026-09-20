#!/usr/bin/env node

// F-PERF-1: durable, offline timing report.
//
// Aggregates per-invocation Playwright timing documents and persisted
// quality-gate receipts into one ranked report: slowest files, slowest tests,
// lane totals, gate-group durations and unmeasured groups. Read-only and
// offline; it never contacts a network, never spawns a test, and never writes
// into the repository.
//
// The aggregation itself is pure (`src/core/validation/validationTiming.ts`);
// this entry point only performs bounded file reads and rendering.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModules } from './lib/typescript-runtime-loader.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli, invokedDirectly } from './lib/operator-cli.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_DOCUMENT_DIR = path.join(root, 'test-results', 'timings');
const DEFAULT_RECEIPT_DIR = path.join(os.tmpdir(), 'nightwatch-gate-receipts');
const MAX_FILES = 500;
const MAX_FILE_BYTES = 512 * 1024;
const MAX_RECEIPTS = 50;

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'test-timings',
  entry: 'bin/test-timings.mjs',
  purpose: 'Render the offline validation timing report from lane timing documents and gate receipts.',
  group: 'validate',
  flags: [
    { name: '--json', shape: 'boolean', summary: 'emit exactly one JSON report document' },
    { name: '--dir', shape: 'path', summary: 'timing document directory (default test-results/timings)' },
    { name: '--receipts', shape: 'path', summary: 'gate receipt directory (default the system temporary receipts directory)' },
    { name: '--top', shape: 'integer', summary: 'maximum rows per ranking section (default 20, bounded 1..100)' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: [],
};

function readJsonFiles(directory, limit) {
  const values = [];
  let entries;
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return values;
  }
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(directory, entry.name))
    .slice(0, limit);
  for (const file of files) {
    try {
      const stat = fs.lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_FILE_BYTES) continue;
      values.push({ source: path.basename(file), value: JSON.parse(fs.readFileSync(file, 'utf8')) });
    } catch {
      values.push({ source: path.basename(file), value: null });
    }
  }
  return values;
}

const cli = invokedDirectly(import.meta.url) ? defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url }) : { stop: true };
if (!cli.stop) {
  try {
    const flags = cli.flags ?? {};
    const documentDirectory = typeof flags['--dir'] === 'string' ? path.resolve(flags['--dir']) : DEFAULT_DOCUMENT_DIR;
    const receiptDirectory = typeof flags['--receipts'] === 'string' ? path.resolve(flags['--receipts']) : DEFAULT_RECEIPT_DIR;
    const top = flags['--top'] === undefined ? undefined : Number(flags['--top']);
    if (top !== undefined && (!Number.isInteger(top) || top < 1 || top > 100)) {
      console.error(JSON.stringify({ schemaVersion: 'nightwatch.validation-timings-report.v1', result: 'CONFIG_INVALID', code: 'TOP_OUT_OF_RANGE' }));
      process.exitCode = 2;
    } else {
      const [timing] = loadTypeScriptModules(['src/core/validation/validationTiming.ts'], { root });
      const documents = readJsonFiles(documentDirectory, MAX_FILES);
      const receiptValues = readJsonFiles(receiptDirectory, MAX_RECEIPTS);
      const gateReceipts = [];
      for (const entry of receiptValues) {
        const summary = timing.summarizeGateReceipt(entry.value);
        if (summary !== null) gateReceipts.push(summary);
      }
      gateReceipts.sort((left, right) => right.measuredDurationMs - left.measuredDurationMs);
      const report = timing.aggregateTimingDocuments({
        generatedAt: new Date().toISOString(),
        documents,
        gateReceipts,
        ...(top === undefined ? {} : { top }),
      });
      if (cli.json) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      } else {
        process.stdout.write(timing.renderTimingReport(report, top === undefined ? {} : { top }));
      }
    }
  } catch (error) {
    console.error(JSON.stringify({ schemaVersion: 'nightwatch.validation-timings-report.v1', result: 'CONFIG_INVALID', code: error instanceof Error ? error.message : 'TIMINGS_INVALID' }));
    process.exitCode = 2;
  }
}
