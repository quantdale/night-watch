// Corrections task 6.1 (VE-01) — the repository formatter policy.
//
// Two independent claims are proven here:
//
//   1. The policy disables every byte-rewriting pass (biome's formatter and
//      organize-imports; the linter too, because its autofix is how the
//      `let` -> `const` class of out-of-band rewrites arrived), and
//      `.editorconfig` pins the two normalizers OFF while declaring only the
//      byte invariants the corpus actually satisfies.
//   2. A formatter run under that policy changes no tracked file — proven
//      two ways: a POSITIVE CONTROL where the same tool with the formatter
//      enabled really does rewrite a deliberately misformatted probe (so the
//      no-op below cannot be an absent, broken or inert tool), and the full
//      tracked corpus run from a disposable `git archive` copy (so the proof
//      is literal — every tracked file, hashed before and after — while a
//      policy regression can never rewrite the working tree).
import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BIOME_ENTRY = createRequire(path.join(REPO_ROOT, 'package.json')).resolve('@biomejs/biome/bin/biome');
/** The harness's own Prettier, installed outside the repository. */
const PRETTIER_TOOLS_ENTRY = path.join(os.homedir(), '.pi-lens', 'tools', 'node_modules', 'prettier', 'bin', 'prettier.cjs');
const MISFORMATTED_PROBE = "const x = 'a'\nconst y   =   1;\nexport { x, y };\n";
const CONTROL_CONFIG = `${JSON.stringify(
  {
    $schema: 'https://biomejs.dev/schemas/2.5.14/schema.json',
    formatter: { enabled: true },
    linter: { enabled: false },
    assist: { enabled: false },
  },
  null,
  2,
)}\n`;

/**
 * R4-17 / review-4 task 4.4 — a probe INSIDE the repository (gitignored via
 * `.tmp-*`) so the repository's own `.prettierignore` / `.prettierrc` govern
 * it. A scratch file outside the tree is governed by no repository config at
 * all, so it cannot prove that the policy neutralises an in-repo run.
 */
function repoProbe(name: string): string {
  const file = path.join(REPO_ROOT, `.tmp-prettier-probe-${process.pid}-${name}.ts`);
  return file;
}

function scratch(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nw-formatter-policy-'));
}

function run(command: string, args: string[], cwd: string) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    timeout: 120_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  expect(result.error, `${command} failed to spawn: ${String(result.error)}`).toBeUndefined();
  return result;
}

function runBiome(args: string[], cwd: string) {
  return run(process.execPath, [BIOME_ENTRY, ...args], cwd);
}

// ---------------------------------------------------------------------------
// R3-14 / corrections task 8.13 — Prettier neutralisation is FILE-RELATIVE.
// `.prettierignore` is honoured only from the directory Prettier runs in; a
// run from a parent working directory ignored it. `.prettierrc` with
// `requirePragma: true` is resolved per FILE, so an out-of-band run can never
// rewrite a tracked file whatever its cwd. The behavioural control runs when a
// Prettier binary is available; otherwise its absence is declared explicitly.
// ---------------------------------------------------------------------------

/**
 * R4-17 / review-4 task 4.4 — find a REAL Prettier.
 *
 * The previous resolver looked only at `NIGHTWATCH_PRETTIER_BIN` and the repo's
 * `node_modules/.bin/prettier`, so on every host without a local install it
 * returned null, the behavioural control skipped, and the parent-cwd control
 * ran a `node -e` one-liner instead of Prettier. `prettier` is now a declared
 * devDependency (so CI installs it), and the harness's own tools path is a
 * last-resort fallback so a checkout that was never `npm install`ed still
 * exercises the control.
 */
function resolvePrettierBinary(): string | null {
  const candidates = [
    process.env.NIGHTWATCH_PRETTIER_BIN ?? '',
    path.join(REPO_ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'prettier.cmd' : 'prettier'),
    path.join(REPO_ROOT, 'node_modules', 'prettier', 'bin', 'prettier.cjs'),
    PRETTIER_TOOLS_ENTRY,
  ].filter((candidate) => candidate !== '');
  for (const candidate of candidates) {
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

function nearestPrettierConfig(file: string): { path: string; config: Record<string, unknown> } | null {
  let directory = path.dirname(path.resolve(file));
  for (;;) {
    for (const name of ['.prettierrc', '.prettierrc.json']) {
      const candidate = path.join(directory, name);
      try {
        const config = JSON.parse(fs.readFileSync(candidate, 'utf8')) as Record<string, unknown>;
        return { path: candidate, config };
      } catch {
        // Not this candidate.
      }
    }
    const parent = path.dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
}

test.describe('Prettier neutralisation (R3-14)', () => {
  test('the per-file config requires the pragma, so no tracked file can be rewritten from any cwd', () => {
    const config = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.prettierrc'), 'utf8')) as Record<string, unknown>;
    expect(config.requirePragma).toBe(true);
    expect(fs.readFileSync(path.join(REPO_ROOT, '.prettierignore'), 'utf8')).toContain('*');
    // File-relative resolution: the nearest config for a nested tracked file is
    // the repository's, regardless of the process working directory.
    const target = path.join(REPO_ROOT, 'src', 'core', 'qualityGate', 'definition.ts');
    const nearest = nearestPrettierConfig(target);
    expect(nearest).not.toBeNull();
    expect(nearest?.path).toBe(path.join(REPO_ROOT, '.prettierrc'));
    expect(nearest?.config.requirePragma).toBe(true);
    // A run FROM the parent directory resolves the same per-file config: the
    // old `.prettierignore`-only neutralisation did not. R4-17: this control
    // runs PRETTIER ITSELF from the parent cwd, not a node one-liner — the
    // per-file `requirePragma` config is what neutralises it there.
    expect(nearestPrettierConfig(target)?.config.requirePragma).toBe(true);
    const prettier = resolvePrettierBinary();
    if (prettier === null) {
      // Declared absence, never a silent pass: the lane's skip identity names
      // PRETTIER_BINARY_ABSENT, and the config assertions above still hold.
      expect(fs.existsSync(path.join(REPO_ROOT, 'node_modules', 'prettier')) || process.env.NIGHTWATCH_PRETTIER_BIN !== undefined).toBe(false);
    } else {
      const probe = repoProbe('parent-cwd');
      try {
        fs.writeFileSync(probe, MISFORMATTED_PROBE);
        const before = fs.readFileSync(probe, 'utf8');
        const parentRun = run(prettier, ['--write', probe], path.dirname(REPO_ROOT));
        expect(parentRun.status, String(parentRun.stderr)).toBe(0);
        expect(fs.readFileSync(probe, 'utf8')).toBe(before);
      } finally {
        fs.rmSync(probe, { force: true });
      }
    }
  });

  const prettier = resolvePrettierBinary();
  test('a Prettier run leaves an unmarked probe untouched and formats a pragma-marked one', () => {
    test.skip(prettier === null, 'PRETTIER_BINARY_ABSENT: no Prettier executable on this host; the requirePragma config and the file-relative resolution are asserted above, and this control runs wherever a binary is available');
    // R4-17: the NEGATIVE control is an IN-REPO probe (the repository's own
    // `.prettierignore`/`.prettierrc` govern it), run from a PARENT working
    // directory — the R3-14 regression. Inside the repository nothing is
    // formattable at all, so the PRAGMA positive control uses a scratch
    // directory that carries the repository's own `.prettierrc`.
    const unmarked = repoProbe('unmarked');
    const directory = scratch();
    try {
      fs.writeFileSync(unmarked, MISFORMATTED_PROBE);
      const beforeUnmarked = fs.readFileSync(unmarked, 'utf8');
      const parentRun = run(prettier as string, ['--write', unmarked], path.dirname(REPO_ROOT));
      expect(parentRun.status, String(parentRun.stderr)).toBe(0);
      expect(fs.readFileSync(unmarked, 'utf8')).toBe(beforeUnmarked);
      // The positive control: the repository's own requirePragma config, run
      // from the directory that carries it, formats a pragma-marked file and
      // leaves an unmarked one alone — so the negative control above cannot be
      // an inert or absent tool.
      fs.copyFileSync(path.join(REPO_ROOT, '.prettierrc'), path.join(directory, '.prettierrc'));
      const pragmaMarked = path.join(directory, 'marked.ts');
      const pragmaUnmarked = path.join(directory, 'unmarked.ts');
      fs.writeFileSync(pragmaMarked, `/** @format */\n${MISFORMATTED_PROBE}`);
      fs.writeFileSync(pragmaUnmarked, MISFORMATTED_PROBE);
      const beforeMarked = fs.readFileSync(pragmaMarked, 'utf8');
      const beforePragmaUnmarked = fs.readFileSync(pragmaUnmarked, 'utf8');
      const controlRun = run(prettier as string, ['--write', 'marked.ts', 'unmarked.ts'], directory);
      expect(controlRun.status, String(controlRun.stderr)).toBe(0);
      expect(fs.readFileSync(pragmaMarked, 'utf8')).not.toBe(beforeMarked);
      expect(fs.readFileSync(pragmaUnmarked, 'utf8')).toBe(beforePragmaUnmarked);
    } finally {
      fs.rmSync(unmarked, { force: true });
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});

function trackedFiles(): string[] {
  const result = run('git', ['ls-files'], REPO_ROOT);
  expect(result.status, 'git ls-files must succeed').toBe(0);
  return (result.stdout ?? '').split('\n').filter((line) => line.length > 0);
}

function hashTree(root: string): Map<string, string> {
  const hashes = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      const relative = path.relative(root, full).split(path.sep).join('/');
      hashes.set(relative, crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex'));
    }
  };
  walk(root);
  return hashes;
}

test('the repository policy disables every byte-rewriting pass and pins the normalizers off', () => {
  const biome = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'biome.json'), 'utf8'));
  expect(biome.formatter?.enabled, 'biome.json must disable the formatter').toBe(false);
  expect(biome.assist?.actions?.source?.organizeImports, 'biome.json must disable organize-imports').toBe('off');
  // The linter's autofix produced out-of-band rewrites (the `let` -> `const`
  // class), so the policy disables the linter as well: `check --write` must
  // have nothing left to apply.
  expect(biome.linter?.enabled, 'biome.json must disable the linter autofix surface').toBe(false);
  const editor = fs.readFileSync(path.join(REPO_ROOT, '.editorconfig'), 'utf8');
  expect(editor).toContain('root = true');
  expect(editor).toMatch(/trim_trailing_whitespace\s*=\s*false/);
  expect(editor).toMatch(/insert_final_newline\s*=\s*false/);
  expect(editor).toMatch(/end_of_line\s*=\s*lf/);
  expect(editor).toMatch(/charset\s*=\s*utf-8/);
});

test('control: the same tool with the formatter ENABLED does rewrite the probe', () => {
  const dir = scratch();
  try {
    const control = path.join(dir, 'biome-enabled.json');
    fs.writeFileSync(control, CONTROL_CONFIG);
    const probe = path.join(dir, 'probe.ts');
    fs.writeFileSync(probe, MISFORMATTED_PROBE);
    const result = runBiome(['check', '--write', 'probe.ts', `--config-path=${control}`], dir);
    expect(result.status).toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain('Fixed 1 file');
    const rewritten = fs.readFileSync(probe, 'utf8');
    expect(rewritten).toContain('const x = "a";');
    expect(rewritten).not.toBe(MISFORMATTED_PROBE);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('under the committed policy the probe stays byte-identical through check and format', () => {
  const dir = scratch();
  try {
    const probe = path.join(dir, 'probe.ts');
    const config = path.join(REPO_ROOT, 'biome.json');
    // check --write: the whole fix pipeline is off (formatter + linter
    // autofix + organize-imports), so the run succeeds and applies nothing.
    fs.writeFileSync(probe, MISFORMATTED_PROBE);
    const check = runBiome(['check', '--write', 'probe.ts', `--config-path=${config}`], dir);
    expect(check.status, 'check --write exit').toBe(0);
    expect(`${check.stdout}${check.stderr}`).toContain('No fixes applied');
    expect(fs.readFileSync(probe, 'utf8'), 'check --write rewrote the probe').toBe(MISFORMATTED_PROBE);
    // format --write: the formatter is DISABLED, so every path is ignored and
    // the command refuses with "No files were processed" (exit 1). That
    // refusal is the stronger proof that no formatting pass exists; the
    // control test above proves the same tool rewrites these exact bytes the
    // moment the formatter is enabled.
    fs.writeFileSync(probe, MISFORMATTED_PROBE);
    const format = runBiome(['format', '--write', 'probe.ts', `--config-path=${config}`], dir);
    expect([0, 1], 'format --write exit').toContain(format.status);
    if (format.status !== 0) {
      expect(`${format.stdout}${format.stderr}`).toContain('No files were processed');
    }
    expect(fs.readFileSync(probe, 'utf8'), 'format --write rewrote the probe').toBe(MISFORMATTED_PROBE);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function gitAvailable(): boolean {
  return spawnSync('git', ['--version'], { encoding: 'utf8', shell: false, timeout: 15_000 }).status === 0;
}

test.describe('corpus proofs over the tracked tree', () => {
  test.skip(!gitAvailable(), 'git CLI is unavailable; corpus proofs skipped');

  test('the .editorconfig byte invariants hold for every tracked file', () => {
    const files = trackedFiles();
    expect(files.length).toBeGreaterThan(0);
    const violations: string[] = [];
    for (const file of files) {
      const data = fs.readFileSync(path.join(REPO_ROOT, file));
      if (data.includes(0)) continue; // tracked binary: charset does not apply
      if (!Buffer.from(data.toString('utf8'), 'utf8').equals(data)) violations.push(`${file}: not UTF-8`);
      if (data.includes(Buffer.from('\r'))) violations.push(`${file}: CR byte (not LF)`);
    }
    expect(violations).toEqual([]);
  });

  test('a formatter run under the committed policy changes no tracked file', () => {
    const dir = scratch();
    try {
      // The literal proof runs over EVERY tracked file, but from a disposable
      // copy: even if the policy regressed, the working tree can never be
      // rewritten by this test. The copy set is `git ls-files` — the same
      // tracked universe the validation digest binds — so a newly tracked
      // file (like biome.json itself) is proven over, not silently excluded.
      const tree = path.join(dir, 'tree');
      const files = trackedFiles();
      expect(files.length).toBeGreaterThan(1000);
      for (const file of files) {
        const dest = path.join(tree, file);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(path.join(REPO_ROOT, file), dest);
      }
      // The policy travels with the corpus: biome.json is itself a tracked
      // file, so the run executes under exactly the committed policy.
      expect(fs.existsSync(path.join(tree, 'biome.json'))).toBe(true);
      const before = hashTree(tree);
      expect(before.size).toBe(files.length);
      const result = runBiome(['check', '--write', '.'], tree);
      expect(result.status).toBe(0);
      expect(`${result.stdout}${result.stderr}`).toContain('No fixes applied');
      expect(hashTree(tree), 'the formatter run changed tracked files').toEqual(before);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// RV-19 / corrections task 7.14 — Prettier is neutralised too. The 2026-09-28
// out-of-band rewrite matched Prettier's default style, and the harness that
// produced it ships its own Prettier; Biome's policy alone left that door open.

const PRETTIER_PROBE = "const x = 'a'\nconst y   =   1;\n";
const PRETTIER_ENTRY = path.join(os.homedir(), '.pi-lens', 'tools', 'node_modules', 'prettier', 'bin', 'prettier.cjs');

test('prettier: every path is ignored and the only configuration is the per-file pragma gate', () => {
  const ignore = fs.readFileSync(path.join(REPO_ROOT, '.prettierignore'), 'utf8');
  const patterns = ignore.split('\n').map((line) => line.trim()).filter((line) => line !== '' && !line.startsWith('#'));
  expect(patterns, '.prettierignore must ignore everything with a single `*`').toEqual(['*']);
  const tracked = trackedFiles();
  // R3-14 / corrections task 8.13: `.prettierrc` is the FILE-RELATIVE
  // neutralisation (requirePragma), so it must exist; every OTHER Prettier
  // configuration form stays absent.
  expect(tracked).toContain('.prettierrc');
  const config = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.prettierrc'), 'utf8')) as Record<string, unknown>;
  expect(config.requirePragma).toBe(true);
  for (const configuration of ['.prettierrc.json', '.prettierrc.yaml', '.prettierrc.yml', '.prettierrc.js', '.prettierrc.cjs', '.prettierrc.mjs', 'prettier.config.js', 'prettier.config.cjs', 'prettier.config.mjs']) {
    expect(tracked, `${configuration} must not exist: Prettier is not a repository tool`).not.toContain(configuration);
  }
  expect(tracked).toContain('.prettierignore');
});

test('prettier control: where a Prettier binary exists, it rewrites the probe without the ignore file and leaves it with it', async ({}, testInfo) => {
  if (!fs.existsSync(PRETTIER_ENTRY)) {
    // Not a skip: the always-run policy test above pins the ignore file; the
    // behavioural control simply has no binary to drive on this host.
    testInfo.annotations.push({ type: 'note', description: 'no Prettier binary on this host; behavioural control not exercised' });
    return;
  }
  const withoutPolicy = scratch();
  const withPolicy = scratch();
  try {
    fs.writeFileSync(path.join(withoutPolicy, 'probe.js'), PRETTIER_PROBE);
    const control = run(process.execPath, [PRETTIER_ENTRY, '--write', 'probe.js'], withoutPolicy);
    expect(control.status).toBe(0);
    expect(fs.readFileSync(path.join(withoutPolicy, 'probe.js'), 'utf8'), 'the control must actually be rewritten').toBe('const x = "a";\nconst y = 1;\n');
    fs.writeFileSync(path.join(withPolicy, 'probe.js'), PRETTIER_PROBE);
    fs.copyFileSync(path.join(REPO_ROOT, '.prettierignore'), path.join(withPolicy, '.prettierignore'));
    const governed = run(process.execPath, [PRETTIER_ENTRY, '--write', 'probe.js'], withPolicy);
    expect(governed.status).toBe(0);
    expect(fs.readFileSync(path.join(withPolicy, 'probe.js'), 'utf8'), 'Prettier rewrote the probe despite .prettierignore').toBe(PRETTIER_PROBE);
  } finally {
    fs.rmSync(withoutPolicy, { recursive: true, force: true });
    fs.rmSync(withPolicy, { recursive: true, force: true });
  }
});
