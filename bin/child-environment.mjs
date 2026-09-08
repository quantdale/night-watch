// @ts-check

/**
 * Explicit child-process environment boundary.
 *
 * The parent environment is untrusted ambient process state. Only the small
 * platform/runtime allowlist below is inherited; Nightwatch values must be
 * supplied explicitly by the caller. This is allowlisting, not a claim that a
 * privileged local attacker cannot inspect the process.
 */

const INHERITED_KEYS = Object.freeze([
  'PATH',
  'Path',
  'HOME',
  'TMPDIR',
  'TMP',
  'TEMP',
  'LANG',
  'LC_ALL',
  'DISPLAY',
  'WAYLAND_DISPLAY',
  'XDG_RUNTIME_DIR',
  'PLAYWRIGHT_BROWSERS_PATH',
]);

/**
 * Non-Nightwatch keys a launcher may set EXPLICITLY.
 *
 * The namespace rule exists so ambient parent state cannot reach a child, and
 * that stays true: these are never inherited from the parent, only supplied as
 * a host-fixed literal by the launcher itself. Without this list
 * `nightwatch-agent test` was dead on arrival — it passes
 * `NODE_OPTIONS=--expose-gc`, which the namespace check rejected before any
 * suite could run, so the subcommand threw `CHILD_ENV_EXPLICIT_KEY_INVALID`
 * every single time it was invoked.
 */
const EXPLICIT_HOST_FIXED_KEYS = Object.freeze(['NODE_OPTIONS']);

/**
 * @param {NodeJS.ProcessEnv} parentEnvironment
 * @param {Record<string, string | undefined>} explicitValues
 * @returns {NodeJS.ProcessEnv}
 */
export function buildChildEnvironment(parentEnvironment, explicitValues = {}) {
  /** @type {NodeJS.ProcessEnv} */
  const childEnvironment = {};
  for (const key of INHERITED_KEYS) {
    const value = parentEnvironment[key];
    if (value !== undefined) childEnvironment[key] = value;
  }
  for (const [key, value] of Object.entries(explicitValues)) {
    if (!/^NIGHTWATCH_[A-Z0-9_]+$/.test(key) && !EXPLICIT_HOST_FIXED_KEYS.includes(key)) {
      throw new Error(`CHILD_ENV_EXPLICIT_KEY_INVALID:${key}`);
    }
    if (value !== undefined) childEnvironment[key] = value;
  }
  return childEnvironment;
}

export const CHILD_ENV_INHERITED_KEYS = INHERITED_KEYS;

/**
 * Forward captured child stdio to the owner. Launchers that spawn Playwright
 * with piped stdio must call this before exiting, otherwise the official
 * command prints nothing on success or failure.
 *
 * @param {{ stdout?: string | Buffer | null, stderr?: string | Buffer | null }} result
 */
export function emitChildStdio(result) {
  if (result?.stdout !== undefined && result.stdout !== null && result.stdout !== '') {
    process.stdout.write(result.stdout);
  }
  if (result?.stderr !== undefined && result.stderr !== null && result.stderr !== '') {
    process.stderr.write(result.stderr);
  }
}
