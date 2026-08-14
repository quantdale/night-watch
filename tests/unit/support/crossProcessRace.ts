import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';

export interface RaceChildResult {
  readonly ok: boolean;
  readonly code?: string;
  readonly label?: string;
}

interface ChildHandle {
  readonly child: ChildProcess;
  readonly result: Promise<{ readonly exitCode: number | null; readonly output: string; readonly error: string }>;
}

function temporaryRoot(prefix: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.chmodSync(root, 0o700);
  return root;
}

function cleanup(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

function startChild(script: string, args: readonly string[]): ChildHandle {
  const child = spawn(process.execPath, [script, ...args], {
    cwd: path.resolve(__dirname, '../../..'),
    env: { PATH: process.env.PATH ?? '' },
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  let error = '';
  child.stdout?.on('data', (chunk: Buffer) => {
    output = (output + chunk.toString('utf8')).slice(-64 * 1024);
  });
  child.stderr?.on('data', (chunk: Buffer) => {
    error = (error + chunk.toString('utf8')).slice(-16 * 1024);
  });
  const result = new Promise<{ readonly exitCode: number | null; readonly output: string; readonly error: string }>((resolve) => {
    child.once('close', (exitCode) => resolve({ exitCode, output, error }));
  });
  return { child, result };
}

async function waitForReady(barrierRoot: string, labels: readonly string[]): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (labels.some((label) => !fs.existsSync(path.join(barrierRoot, `${label}.ready`)))) {
    if (Date.now() >= deadline) throw new Error('SYNTHETIC_BARRIER_READY_TIMEOUT');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

export async function runNodeRace(options: {
  readonly script: string;
  readonly labels: readonly string[];
  readonly argsForLabel: (label: string, barrierRoot: string) => readonly string[];
}): Promise<RaceChildResult[]> {
  const barrierRoot = temporaryRoot('nightwatch-cross-process-barrier-');
  const handles = options.labels.map((label) => startChild(options.script, options.argsForLabel(label, barrierRoot)));
  try {
    await waitForReady(barrierRoot, options.labels);
    const go = fs.openSync(path.join(barrierRoot, 'go'), 'wx', 0o600);
    fs.closeSync(go);
    const completed = await Promise.all(handles.map((handle) => handle.result));
    return completed.map((item) => {
      const line = item.output.trim().split('\n').at(-1) ?? '';
      const parsed = JSON.parse(line) as RaceChildResult;
      if (item.exitCode !== 0) throw new Error(`SYNTHETIC_CHILD_EXIT_${item.exitCode}`);
      return parsed;
    });
  } finally {
    for (const handle of handles) {
      if (handle.child.exitCode === null) handle.child.kill('SIGTERM');
    }
    cleanup(barrierRoot);
  }
}
