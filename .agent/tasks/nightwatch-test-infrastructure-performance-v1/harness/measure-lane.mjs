#!/usr/bin/env node

// F-PERF-1 baseline/benchmark measurement harness (task-local).
//
// Runs one named lane with a host-load receipt so a measured duration is never
// separated from the conditions it was measured under. Read-only except for
// the receipt it writes and whatever the measured command itself does.
//
// Usage:
//   node .agent/tasks/nightwatch-test-infrastructure-performance-v1/harness/measure-lane.mjs \
//     --lane=<name> --out=<dir> -- <command> [args...]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);
const separator = argv.indexOf('--');
const options = separator === -1 ? argv : argv.slice(0, separator);
const command = separator === -1 ? [] : argv.slice(separator + 1);
const lane = options.find((value) => value.startsWith('--lane='))?.slice('--lane='.length);
const outDir = options.find((value) => value.startsWith('--out='))?.slice('--out='.length) ?? '.';
if (separator === -1 || command.length === 0 || lane === undefined || lane === '') {
  console.error('usage: measure-lane.mjs --lane=<name> --out=<dir> -- <command> [args...]');
  process.exit(2);
}

function loadAverage() {
  try {
    return fs.readFileSync('/proc/loadavg', 'utf8').trim().split(/\s+/).slice(0, 3).map(Number);
  } catch {
    return null;
  }
}

function competingCensus() {
  const result = spawnSync('ps', ['-eo', 'comm,pcpu', '--sort=-pcpu'], { encoding: 'utf8', timeout: 10_000 });
  if (result.status !== 0) return null;
  const rows = (result.stdout ?? '').split('\n').slice(1).filter(Boolean);
  const counts = new Map();
  let cpu = 0;
  for (const row of rows) {
    const match = /^\s*(\S+)\s+([\d.]+)\s*$/.exec(row);
    if (match === null) continue;
    const name = match[1];
    const percent = Number(match[2]);
    if (!Number.isFinite(percent) || percent < 1) continue;
    cpu += percent;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 8);
  return { busyProcesses: top.map(([name, count]) => ({ name, count })), totalBusyCpuPercent: Math.round(cpu) };
}

const pre = { loadAverage: loadAverage(), census: competingCensus() };
const startedAt = new Date().toISOString();
const start = process.hrtime.bigint();
const result = spawnSync(command[0], command.slice(1), { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: process.env });
const wallMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
const finishedAt = new Date().toISOString();
const post = { loadAverage: loadAverage(), census: competingCensus() };
const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
const count = (pattern) => { const match = pattern.exec(output); return match ? Number(match[1]) : null; };
const receipt = {
  schemaVersion: 'nightwatch.performance-lane-receipt.v1',
  lane,
  command,
  startedAt,
  finishedAt,
  wallMs,
  exitStatus: result.status,
  errorCode: result.error?.code ?? null,
  counts: {
    passed: count(/(\d+)\s+passed/i),
    failed: count(/(\d+)\s+failed/i),
    skipped: count(/(\d+)\s+skipped/i),
    didNotRun: count(/(\d+)\s+did not run/i),
    tests: count(/Total:\s*(\d+)\s+tests?/i),
  },
  host: { platform: os.platform(), cores: os.cpus().length, totalMemMiB: Math.round(os.totalmem() / (1024 * 1024)) },
  load: { pre, post },
  outputTail: output.trim().split('\n').slice(-6),
};
fs.mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, `${lane.replace(/[^a-zA-Z0-9_-]+/g, '-')}.json`);
fs.writeFileSync(file, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ lane, wallMs, exitStatus: result.status, file }));
process.exitCode = result.status === 0 ? 0 : 1;
