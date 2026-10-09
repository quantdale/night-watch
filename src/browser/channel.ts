// ---------------------------------------------------------------------------
// Nightwatch — browser channel selection (M11 task 12.1, audit B-09).
//
// The README used to tell an operator that `npx playwright install chromium`
// was the fallback when system Chrome is unavailable. It was not: every
// tracked Playwright config hard-coded `channel: 'chrome'`, so the documented
// fallback required editing tracked files before any lane could use it.
//
// The channel is now selected through ONE declared environment variable
// (`NIGHTWATCH_BROWSER_CHANNEL`, declared in
// `config/environment-surface.v1.json`) with fail-closed validation: an
// unset variable selects the system Chrome default, and any other value is
// refused by name before a browser, a namespace or a subprocess exists. An
// unsupported channel is never silently downgraded, because silently
// launching a different browser than the one the containment contract was
// qualified against is exactly the failure the hard-coding had.
//
// Playwright lanes pass the resolved channel name to Playwright, which
// resolves the executable itself. One lane launches a binary itself — the
// parent-CLI authentication capture runner — so this module also resolves the
// executable and its install directory for the selected channel; `null` means
// no usable browser exists for that channel on this host, and the caller fails
// closed rather than quietly switching channels.
//
// The L6 containment qualification deliberately does NOT consume this
// selection: a containment proof must not change because an operator picked a
// channel for their lanes, and its invariant (the capability is READY whenever
// bwrap is available) must hold under every declared channel. That lane keeps
// its own synthetic browser instrument, like bwrap itself, and reports the
// lane unproven when the instrument is missing.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/** The declared environment variable that selects the browser channel. */
export const BROWSER_CHANNEL_ENV_VAR = 'NIGHTWATCH_BROWSER_CHANNEL' as const;

/**
 * The two channels the browser lanes support.
 *
 * - `chrome` drives the system Google Chrome (the historical default).
 * - `chromium` drives the Playwright-managed Chromium build — the one
 *   `npx playwright install chromium` installs, which needs no system Chrome.
 */
export const SUPPORTED_BROWSER_CHANNELS = ['chrome', 'chromium'] as const;
export type BrowserChannel = (typeof SUPPORTED_BROWSER_CHANNELS)[number];

/** The channel used when the operator declares none. */
export const DEFAULT_BROWSER_CHANNEL: BrowserChannel = 'chrome';

export interface BrowserChannelResolution {
  readonly channel: BrowserChannel;
  /** Whether the value came from the environment or from the default. */
  readonly source: 'default' | 'environment';
}

/** Fail-closed shape guard used by callers before they touch a browser. */
export function isSupportedBrowserChannel(value: string): value is BrowserChannel {
  return (SUPPORTED_BROWSER_CHANNELS as readonly string[]).includes(value);
}

/**
 * Resolve the declared browser channel.
 *
 * An unset (or absent) variable selects the default. A set-but-unsupported
 * value — including an empty string — is refused rather than defaulted, so a
 * typo can never silently launch a different browser than the operator named.
 *
 * @param {Record<string, string | undefined>} environment the environment to read
 * @returns {BrowserChannelResolution} the selected channel and where it came from
 */
export function resolveBrowserChannel(
  environment: Record<string, string | undefined> = process.env,
): BrowserChannelResolution {
  const declared = environment[BROWSER_CHANNEL_ENV_VAR];
  if (declared === undefined) return Object.freeze({ channel: DEFAULT_BROWSER_CHANNEL, source: 'default' });
  const bounded = declared.length > 40 ? `${declared.slice(0, 40)}~` : declared;
  if (!isSupportedBrowserChannel(declared)) {
    throw new Error(`BROWSER_CHANNEL_UNSUPPORTED:${bounded}`);
  }
  return Object.freeze({ channel: declared, source: 'environment' });
}

/**
 * A browser executable a direct-launch lane (one that spawns the binary
 * itself instead of letting Playwright resolve it) can bind and run.
 */
export interface BrowserChannelExecutable {
  /** The browser binary. Always a regular, non-symlink file. */
  readonly executable: string;
  /** The install directory that must be mounted beside it. */
  readonly installDirectory: string;
}

/** Host locations a vendor or distribution Chrome install can occupy. */
const CHROME_CANDIDATES: readonly string[] = [
  '/opt/google/chrome/chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

/** Base names the resolved Chrome executable must carry to be accepted. */
const CHROME_BASE_NAMES: readonly string[] = ['chrome', 'google-chrome', 'chromium', 'chromium-browser'];

/**
 * Root the Playwright-managed browsers live under, honouring the declared
 * override so an operator-sized browser cache is never assumed.
 *
 * @param {Record<string, string | undefined>} environment the environment to read
 * @returns {string} the browsers directory
 */
export function playwrightBrowsersDirectory(
  environment: Record<string, string | undefined> = process.env,
): string {
  const declared = environment['PLAYWRIGHT_BROWSERS_PATH'];
  if (declared !== undefined && declared.trim() !== '') return declared;
  return path.join(os.homedir(), '.cache', 'ms-playwright');
}

/**
 * Resolve the highest installed revision of the Playwright-managed Chromium.
 *
 * The revision directory name is authoritative (it is the directory Playwright
 * itself created), so no browser version is duplicated here and the resolver
 * cannot drift from the installed build.
 *
 * @param {Record<string, string | undefined>} environment the environment to read
 * @returns {BrowserChannelExecutable | null} the bundled Chromium, or null when none is installed
 */
/** Install-directory names Playwright uses for its Chromium build. */
const BUNDLED_CHROMIUM_DIRECTORY_NAMES: readonly string[] = ['chrome-linux64', 'chrome-linux'];

export function resolveBundledChromiumExecutable(
  environment: Record<string, string | undefined> = process.env,
): BrowserChannelExecutable | null {
  const root = playwrightBrowsersDirectory(environment);
  // A root that is not an absolute path cannot be the Playwright browser cache
  // (an unresolvable home directory is the one case that produces it), and
  // searching a relative path could resolve against an unrelated working
  // directory. Absent is the honest answer.
  if (!path.isAbsolute(root)) return null;
  let revisions: string[] = [];
  try {
    revisions = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^chromium-\d+$/.test(entry.name))
      .map((entry) => entry.name);
  } catch {
    return null;
  }
  revisions.sort((left, right) => Number(left.slice('chromium-'.length)) - Number(right.slice('chromium-'.length)));
  for (const revision of revisions.reverse()) {
    for (const directoryName of BUNDLED_CHROMIUM_DIRECTORY_NAMES) {
      const installDirectory = path.join(root, revision, directoryName);
      const executable = path.join(installDirectory, 'chrome');
      if (isRegularNonSymlinkFile(fs, executable)) {
        return Object.freeze({ executable, installDirectory });
      }
    }
  }
  return null;
}

/**
 * Resolve the executable a direct-launch lane must run for the selected
 * channel. `null` means the selected channel has no usable browser on this
 * host; a caller then fails closed (or reports its lane unproven) rather than
 * falling back to the other channel.
 *
 * No install layout is assumed beyond "a regular, non-symlink executable with
 * an accepted base name": which resource files a given build ships beside the
 * binary is exactly the host detail the old hard-coded path got wrong.
 *
 * @param {BrowserChannel} channel the selected channel
 * @param {Record<string, string | undefined>} environment the environment to read
 * @returns {BrowserChannelExecutable | null} the browser, or null when unavailable
 */
export function resolveBrowserChannelExecutable(
  channel: BrowserChannel,
  environment: Record<string, string | undefined> = process.env,
): BrowserChannelExecutable | null {
  if (channel === 'chromium') return resolveBundledChromiumExecutable(environment);
  for (const candidate of CHROME_CANDIDATES) {
    if (!isRegularNonSymlinkFile(fs, candidate)) continue;
    let resolved: string;
    try {
      resolved = fs.realpathSync(candidate);
    } catch {
      continue;
    }
    if (!CHROME_BASE_NAMES.includes(path.basename(resolved))) continue;
    return Object.freeze({ executable: resolved, installDirectory: path.dirname(resolved) });
  }
  return null;
}

/**
 * @param {typeof import('node:fs')} fsModule
 * @param {string} candidate
 * @returns {boolean}
 */
function isRegularNonSymlinkFile(fsModule: typeof fs, candidate: string): boolean {
  try {
    const stat = fsModule.lstatSync(candidate);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}
