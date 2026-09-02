// ---------------------------------------------------------------------------
// Nightwatch C-10 / F-17 + Workstream I — production browser residue controls.
//
// Verified in Nightwatch's favour: there is no `launchPersistentContext` and no
// `userDataDir` in `src/`, so browser contexts are already ephemeral and
// Playwright removes its profile directory on close. The RESIDUAL risk F-17
// names is that the profile exists on disk DURING the session holding cache,
// IndexedDB and localStorage from authenticated pages, and is NOT removed if
// the process is killed or crashes.
//
// This module supplies the local synthetic controls for that, plus the
// production screenshot/trace contract failures. It launches NO browser: it
// produces policy values and performs residue cleanup, and every function here
// is exercised against a disposable synthetic root.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import {
  failProduction,
  pageConsoleTextProhibited,
  screenshotsProhibited,
  tracesProhibited,
  type PrivacyPolicy,
} from '../prodPrivacy';

export const PRODUCTION_BROWSER_PROFILE_VERSION = 'nightwatch.production-browser-profile.v1' as const;

/** Marker that identifies a directory as a Nightwatch production profile. */
const PROFILE_PREFIX = 'nightwatch-prod-profile-';

/**
 * Chromium arguments that keep an authenticated production session off disk as
 * far as the browser permits. `--disk-cache-size=0` plus an in-memory cache
 * keeps response bodies out of the profile; the crash-dump flags stop Chromium
 * writing a minidump that could contain page memory.
 */
export const PRODUCTION_BROWSER_ARGS: readonly string[] = Object.freeze([
  '--disk-cache-size=0',
  '--media-cache-size=0',
  '--disable-application-cache',
  '--disable-gpu-shader-disk-cache',
  '--disable-breakpad',
  '--disable-crash-reporter',
  '--noerrdialogs',
  '--disable-background-networking',
]);

export interface ProductionBrowserProfile {
  readonly version: typeof PRODUCTION_BROWSER_PROFILE_VERSION;
  readonly directory: string;
  readonly args: readonly string[];
  readonly createdAtMs: number;
}

/**
 * Create a private ephemeral profile directory, owner-only.
 *
 * `baseDirectory` is always injected: this module never derives a location
 * from the checkout, and the synthetic suites pass a disposable root so no test
 * writes into a real profile area.
 */
export function createEphemeralProductionProfile(
  baseDirectory: string,
  policy: PrivacyPolicy,
  nowMs: number = Date.now(),
): ProductionBrowserProfile {
  if (policy.browserProfile !== 'EPHEMERAL_PRIVATE_NO_CACHE') {
    failProduction('PRODUCTION_PRIVACY_POLICY_FORBIDDEN_CAPABILITY', 'CONE_MISMATCH');
  }
  if (!path.isAbsolute(baseDirectory)) {
    failProduction('PRODUCTION_PRIVACY_BOUNDARY_VIOLATION', 'FIELD_TYPE');
  }
  fs.mkdirSync(baseDirectory, { recursive: true, mode: 0o700 });
  const directory = path.join(baseDirectory, `${PROFILE_PREFIX}${randomBytes(12).toString('hex')}`);
  fs.mkdirSync(directory, { mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  const stat = fs.lstatSync(directory);
  if (stat.isSymbolicLink() || !stat.isDirectory() || (stat.mode & 0o077) !== 0) {
    failProduction('PRODUCTION_PRIVACY_BOUNDARY_VIOLATION', 'FIELD_TYPE');
  }
  return {
    version: PRODUCTION_BROWSER_PROFILE_VERSION,
    directory,
    args: PRODUCTION_BROWSER_ARGS,
    createdAtMs: nowMs,
  };
}

/** Cleanup on normal exit. Idempotent. */
export function cleanupProductionProfile(profileDirectory: string): void {
  if (!path.isAbsolute(profileDirectory)) return;
  if (!path.basename(profileDirectory).startsWith(PROFILE_PREFIX)) {
    // Never recursively remove a directory this module did not name.
    failProduction('PRODUCTION_PRIVACY_BOUNDARY_VIOLATION', 'FIELD_TYPE');
  }
  fs.rmSync(profileDirectory, { recursive: true, force: true });
}

/**
 * Crash-path cleanup: remove production profiles left behind by an interrupted
 * or killed run. This is the branch F-17 says is missing today, so it is
 * exercised directly by the acceptance suite against a simulated crash.
 */
export function sweepStaleProductionProfiles(
  baseDirectory: string,
  options: { readonly nowMs?: number; readonly maxAgeMs?: number } = {},
): { readonly removed: number; readonly inspected: number } {
  const nowMs = options.nowMs ?? Date.now();
  const maxAgeMs = options.maxAgeMs ?? 0;
  if (!fs.existsSync(baseDirectory)) return { removed: 0, inspected: 0 };
  let removed = 0;
  let inspected = 0;
  for (const entry of fs.readdirSync(baseDirectory, { withFileTypes: true })) {
    if (!entry.name.startsWith(PROFILE_PREFIX)) continue;
    inspected += 1;
    const target = path.join(baseDirectory, entry.name);
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(target);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink()) continue;
    if (nowMs - stat.mtimeMs >= maxAgeMs) {
      fs.rmSync(target, { recursive: true, force: true });
      removed += 1;
    }
  }
  return { removed, inspected };
}

/** Production profile directories that still exist — the audit's input. */
export function productionProfileResidue(baseDirectory: string): readonly string[] {
  if (!fs.existsSync(baseDirectory)) return [];
  return fs
    .readdirSync(baseDirectory, { withFileTypes: true })
    .filter((entry) => entry.name.startsWith(PROFILE_PREFIX))
    .map((entry) => path.join(baseDirectory, entry.name))
    .sort();
}

export interface ProductionCaptureRequest {
  readonly screenshot?: boolean;
  readonly trace?: boolean;
  readonly persistPageConsoleText?: boolean;
}

/**
 * The contract failure required by Workstream I: enabling a screenshot, a
 * Playwright trace or page console text retention in the production privacy
 * cone is refused categorically rather than silently downgraded.
 */
export function assertProductionCaptureAllowed(
  policy: PrivacyPolicy,
  request: ProductionCaptureRequest,
): void {
  if (request.screenshot === true && screenshotsProhibited(policy)) {
    failProduction('PRODUCTION_PRIVACY_POLICY_FORBIDDEN_CAPABILITY', 'SCREENSHOTS_PROHIBITED');
  }
  if (request.trace === true && tracesProhibited(policy)) {
    failProduction('PRODUCTION_PRIVACY_POLICY_FORBIDDEN_CAPABILITY', 'TRACE_PROHIBITED');
  }
  if (request.persistPageConsoleText === true && pageConsoleTextProhibited(policy)) {
    failProduction('PRODUCTION_PRIVACY_POLICY_FORBIDDEN_CAPABILITY', 'CONSOLE_TEXT_PROHIBITED');
  }
}

// ---------------------------------------------------------------------------
// Production console events.
// ---------------------------------------------------------------------------

/**
 * A production console event. Categorical ONLY: it carries the message TYPE
 * and nothing the page provided. There is no `text`, no `args`, no `location`
 * and no `stack` field, so a page that emits a response body through
 * `console.log` has nothing to leak into.
 */
export interface ProductionConsoleEvent {
  readonly consoleType: 'log' | 'debug' | 'info' | 'error' | 'warning' | 'other';
  readonly count: number;
}

const CONSOLE_TYPES: ReadonlySet<string> = new Set(['log', 'debug', 'info', 'error', 'warning']);

/**
 * Project a page console message to a categorical event.
 *
 * The page-provided text is a parameter so the boundary is explicit and
 * testable — and it is DISCARDED: the return value has no field that could
 * hold it. This is the "categorical events only, zero page-provided text"
 * option from Workstream I.
 */
export function projectProductionConsoleEvent(
  policy: PrivacyPolicy,
  rawType: string,
  _pageProvidedText: string,
): ProductionConsoleEvent {
  if (!pageConsoleTextProhibited(policy)) {
    failProduction('PRODUCTION_PRIVACY_BOUNDARY_VIOLATION', 'CONE_MISMATCH');
  }
  return {
    consoleType: CONSOLE_TYPES.has(rawType) ? (rawType as ProductionConsoleEvent['consoleType']) : 'other',
    count: 1,
  };
}
