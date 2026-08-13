#!/usr/bin/env node
// @ts-check

/**
 * Deterministic, offline repository hardening check.
 *
 * This is intentionally a small structural gate. It does not inspect a
 * network, credentials, sibling repositories, databases, or runtime state.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const childEnvironment = buildChildEnvironment(process.env);

/** @param {string} message */
function fail(message) {
  errors.push(message);
}

/** @param {string} file */
function read(file) {
  try {
    return fs.readFileSync(path.join(root, file), 'utf8');
  } catch (error) {
    fail(`cannot read ${file}: ${error instanceof Error ? error.message : String(error)}`);
    return '';
  }
}

function gitFiles() {
  const result = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', env: childEnvironment, timeout: 10_000, maxBuffer: 2 * 1024 * 1024 });
  if (result.status !== 0) {
    fail(`git ls-files failed: ${(result.stderr ?? '').trim()}`);
    return [];
  }
  return (result.stdout ?? '').split('\0').filter(Boolean);
}

function checkChildProcessBoundaries() {
  const launchers = [
    'bin/phase7-real.mjs',
    'bin/phase5-real.mjs',
    'bin/phase4-real.mjs',
    'bin/phase2b-real.mjs',
    'bin/phase2c-real.mjs',
    'bin/observe-authenticated.mjs',
    'bin/observe-gate.mjs',
    'bin/observe-canary.mjs',
    'bin/auth-capture.mjs',
    'bin/nightwatch.mjs',
  ];
  for (const file of launchers) {
    const source = read(file);
    if (/\.\.\.process\.env/.test(source)) fail(`${file} spreads the parent process environment`);
    if (/shell\s*:\s*true/.test(source)) fail(`${file} enables shell execution`);
    if (!/timeout\s*:/.test(source)) fail(`${file} has no bounded child-process timeout`);
    if (/stdio\s*:\s*['"]inherit['"]/.test(source)) fail(`${file} exposes unbounded child output`);
    if (!/maxBuffer\s*:/.test(source)) fail(`${file} has no bounded child output buffer`);
  }
  const productionSources = gitFiles()
    .filter((file) => (file.startsWith('src/') || file.startsWith('bin/')) && /\.(?:ts|mjs)$/.test(file))
    .filter((file) => file !== 'bin/hardening-check.mjs')
    .map((file) => [file, read(file)]);
  for (const [file, source] of productionSources) {
    if (/import\s*\{[^}]*\bexec(?:File)?\b[^}]*\}\s*from\s*['"]node:child_process['"]/.test(source)) fail(`${file} imports shell-capable child_process exec`);
    if (/child_process\.exec(?:File)?\s*\(/.test(source)) fail(`${file} calls child_process.exec/execFile through a dynamic namespace`);
  }
}

function checkTargetPolicy() {
  for (const file of ['bin/phase7-real.mjs', 'bin/phase5-real.mjs', 'bin/phase4-real.mjs', 'bin/phase2b-real.mjs', 'bin/phase2c-real.mjs', 'bin/observe-authenticated.mjs']) {
    if (!/env\s*!==\s*['"]dev['"]/.test(read(file))) fail(`${file} does not enforce DEV-only automated credential execution`);
  }
  const capture = read('bin/auth-capture.mjs');
  if (!/new Set\(\['dev', 'next'\]\)/.test(capture) || !/human-led|human login/i.test(capture)) fail('auth:capture NEXT exception is not visibly human-led and explicit');
  for (const file of gitFiles().filter((item) => item.startsWith('bin/') && item !== 'bin/hardening-check.mjs')) {
    if (/MULTI_HOUR_CAMPAIGN_BUDGET/.test(read(file))) fail(`${file} references the unauthorized multi-hour budget profile`);
  }
}

function checkTypecheckCoverage() {
  let config;
  try {
    config = JSON.parse(read('tsconfig.json'));
  } catch {
    fail('tsconfig.json is not valid JSON');
    return;
  }
  if (!Array.isArray(config.include) || !config.include.includes('playwright*.config.ts')) fail('tsconfig.json must include the complete playwright*.config.ts root-config pattern');
  for (const file of fs.readdirSync(root).filter((item) => /^playwright.*\.config\.ts$/.test(item))) {
    if (!fs.statSync(path.join(root, file)).isFile()) fail(`root Playwright config is not a regular file: ${file}`);
  }
}

function checkPrivateSurface() {
  const tracked = gitFiles();
  for (const file of tracked) {
    if (/^artifacts\/(?!\.gitkeep$)/.test(file)) fail(`runtime artifact is tracked: ${file}`);
    if (/(?:^|\/)(?:storage[-_]?state|auth[-_]?state|credentials?|secrets?)(?:[._-]|\/|$)/i.test(file) && !/\.(?:ts|mjs|js)$/.test(file)) fail(`credential-like tracked path: ${file}`);
    if (/(?:\.storage-state|\.cookies\.json|\.token(?:s)?\.json|\.trace\.zip|\.har)$/i.test(file)) fail(`private runtime file is tracked: ${file}`);
  }
  const ignore = read('.gitignore');
  for (const required of ['artifacts/*', '.nightwatch/', 'storageState*.json', '*credentials*.json']) {
    if (!ignore.includes(required)) fail(`.gitignore is missing private-runtime rule: ${required}`);
  }
  const adapters = read('src/data/phase6/adapters.ts');
  if (!adapters.includes('assertOwnerPolicyAllows(`${_request.datastore}_DATA_ORACLE`)')) fail('Phase 6 real datastore adapter is missing the owner gate');
}

function checkSyntax() {
  for (const file of fs.readdirSync(path.join(root, 'bin')).filter((item) => item.endsWith('.mjs'))) {
    const result = spawnSync(process.execPath, ['--check', path.join(root, 'bin', file)], { cwd: root, encoding: 'utf8', timeout: 10_000, maxBuffer: 256 * 1024, env: childEnvironment });
    if (result.status !== 0) fail(`node --check failed for bin/${file}: ${(result.stderr ?? '').trim()}`);
  }
}

checkChildProcessBoundaries();
checkTargetPolicy();
checkTypecheckCoverage();
checkPrivateSurface();
checkSyntax();

if (errors.length > 0) {
  for (const error of errors) console.error(`[hardening:check] ERROR: ${error}`);
  console.error(`[hardening:check] FAIL (${errors.length} error${errors.length === 1 ? '' : 's'})`);
  process.exitCode = 1;
} else {
  console.log('[hardening:check] PASS: offline structural invariants hold');
}
