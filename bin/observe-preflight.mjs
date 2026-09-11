#!/usr/bin/env node
/**
 * Phase 2A real-target preflight.
 *
 * This command validates configuration and reports authenticated-capability
 * lifecycle metadata. It never starts a browser, resolves a hostname, opens a
 * socket, reads a cookie value, or contacts an Alphaus environment.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUPPORTED_REAL_ENVS = new Set(['dev', 'next']);
const PROD_SUFFIXES = ['.run.app'];

function usage() {
  console.log('Usage: npm run observe:preflight -- --env=dev|next [--ui-url=https://explicit-host/]');
  console.log('No browser, authentication state, DNS, or network connection is used.');
}

function fail(message) {
  console.error(`[observe:preflight] FAIL: ${message}`);
  process.exitCode = 2;
}

function parseArgs(argv) {
  let env;
  let uiUrl;
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }
    if (arg.startsWith('--env=')) {
      if (env !== undefined) throw new Error('exactly one --env selection is required');
      env = arg.slice('--env='.length);
      continue;
    }
    if (arg.startsWith('--ui-url=')) {
      if (uiUrl !== undefined) throw new Error('--ui-url may be supplied only once');
      uiUrl = arg.slice('--ui-url='.length);
      continue;
    }
    throw new Error(`unknown option ${arg}`);
  }
  return { env: env ?? process.env.NIGHTWATCH_ENV, uiUrl: uiUrl ?? process.env.NIGHTWATCH_UI_URL };
}

function loadConfig(env) {
  const file = path.join(root, 'config', 'environments', `${env}.json`);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`cannot read valid config for ${env}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (parsed?.name !== env || typeof parsed.uiBaseUrl !== 'string') {
    throw new Error(`config for ${env} has an invalid name or uiBaseUrl`);
  }
  for (const field of ['allowedHosts', 'apiHosts', 'authHosts']) {
    if (!Array.isArray(parsed[field]) || parsed[field].some((value) => typeof value !== 'string' || value.trim() === '')) {
      throw new Error(`config for ${env} must define ${field} as an array of non-empty strings`);
    }
  }
  return parsed;
}

function hostFromEntry(entry) {
  const withoutWildcard = entry.startsWith('*.') ? entry.slice(2) : entry;
  return withoutWildcard.replace(/:\d+$/, '').toLowerCase();
}

function hostIsAllowed(hostname, port, entries) {
  const hostPort = port === '' ? hostname : `${hostname}:${port}`;
  return entries.some((entry) => {
    const normalized = entry.toLowerCase();
    return normalized === hostname || normalized === hostPort;
  });
}

function assertNotProduction(host, label) {
  const normalized = host.toLowerCase();
  const knownProduction = new Set([
    'api.alphaus.cloud', 'bluerpc.alphaus.cloud', 'blue.alphaus.cloud',
    'login.alphaus.cloud', 'app.alphaus.cloud', 'service.mobingi.com',
    'login.mobingi.com', 'app.mobingi.com',
  ]);
  if (knownProduction.has(normalized)) {
    throw new Error(`${label} is a known production host and can never be allowlisted`);
  }
  if (PROD_SUFFIXES.some((suffix) => normalized === suffix.slice(1) || normalized.endsWith(suffix))) {
    throw new Error(`${label} is production-class and can never be allowlisted`);
  }
}

function validateTarget(env, config, candidate) {
  let base;
  let target;
  try {
    base = new URL(config.uiBaseUrl);
    target = new URL(candidate);
  } catch (error) {
    throw new Error(`UI URL is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
  for (const [label, url] of [['configured UI URL', base], ['selected UI URL', target]]) {
    if (url.protocol !== 'https:') throw new Error(`${label} must use https for real ${env} observation`);
    if (url.username || url.password) throw new Error(`${label} must not contain embedded credentials`);
    if (url.search || url.hash) throw new Error(`${label} must not contain query parameters or fragments`);
  }
  if (target.hostname.toLowerCase() !== base.hostname.toLowerCase() || target.port !== base.port) {
    throw new Error(`selected UI host must match the verified ${env} uiBaseUrl host`);
  }
  if (target.pathname !== base.pathname) {
    throw new Error(`selected UI path must match the verified ${env} uiBaseUrl path ${base.pathname}`);
  }
  assertNotProduction(target.hostname, 'selected UI host');
  if (!hostIsAllowed(target.hostname.toLowerCase(), target.port, config.allowedHosts)) {
    throw new Error(`selected UI host ${target.hostname.toLowerCase()} is not explicitly allowlisted for ${env}`);
  }
  for (const [kind, entries] of [['API', config.apiHosts], ['auth', config.authHosts]]) {
    if (entries.length === 0) throw new Error(`${env} config has no expected ${kind} hosts`);
    for (const entry of entries) {
      const host = hostFromEntry(entry);
      assertNotProduction(host, `${kind} host ${host}`);
      if (!config.allowedHosts.some((allowed) => hostFromEntry(allowed) === host)) {
        throw new Error(`${kind} host ${host} is not present in the ${env} allowlist`);
      }
    }
  }
  return target;
}

try {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.env || !SUPPORTED_REAL_ENVS.has(parsed.env.trim().toLowerCase())) {
    throw new Error('exactly one supported real environment is required: dev or next; production is forbidden');
  }
  const env = parsed.env.trim().toLowerCase();
  const config = loadConfig(env);
  const target = validateTarget(env, config, parsed.uiUrl ?? config.uiBaseUrl);
  const { collectAuthCapabilityReport } = loadTypeScriptModule('src/auth/capabilityLifecycle.ts', { root });
  const authentication = collectAuthCapabilityReport({
    homeDirectory: os.homedir(),
    environmentVariable: process.env.NIGHTWATCH_STORAGE_STATE ?? null,
    selectedEnvironment: env,
    configuredOrigin: target.origin,
  });
  console.log(JSON.stringify({
    status: 'PASS',
    environment: env,
    target: `${target.origin}${target.pathname || '/'}`,
    uiHost: target.hostname.toLowerCase(),
    apiHosts: config.apiHosts.map(hostFromEntry),
    authHosts: config.authHosts.map(hostFromEntry),
    production: 'explicitly denied',
    authentication: {
      schemaVersion: authentication.schemaVersion,
      checkedAt: authentication.checkedAt,
      entries: authentication.entries.map((entry) => ({
        environment: entry.environment,
        source: entry.source,
        present: entry.present,
        state: entry.state,
        epistemicClass: entry.epistemicClass,
        remainingValidityMs: entry.remainingValidityMs,
        refusalCode: entry.refusalCode,
        remedy: entry.remedy,
        blockedLanes: entry.blockedLanes,
      })),
      // Observed capture lifetimes (`earliestCookieExpiry - captureInstant`)
      // from real records only; the renewal cadence is documented from this
      // measurement, never assumed.
      observedCaptureLifetimes: authentication.observedCaptureLifetimes,
    },
    network: 'no DNS/TCP/browser activity performed; lifecycle metadata only, no cookie value read',
  }, null, 2));
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
