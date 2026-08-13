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
    if (!/^NIGHTWATCH_[A-Z0-9_]+$/.test(key)) throw new Error(`CHILD_ENV_EXPLICIT_KEY_INVALID:${key}`);
    if (value !== undefined) childEnvironment[key] = value;
  }
  return childEnvironment;
}

export const CHILD_ENV_INHERITED_KEYS = INHERITED_KEYS;
