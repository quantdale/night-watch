/**
 * Explicit environment boundaries for TypeScript-owned local child
 * processes. Browser-facing JavaScript launchers use the equivalent
 * repository-root builder in bin/child-environment.mjs because those
 * launchers execute before TypeScript is loaded.
 */

const INHERITED_KEYS = [
  'PATH',
  'Path',
  'TMPDIR',
  'TMP',
  'TEMP',
  'LANG',
  'LC_ALL',
] as const;

export function buildChildEnvironment(parentEnvironment: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const childEnvironment: NodeJS.ProcessEnv = {};
  for (const key of INHERITED_KEYS) {
    const value = parentEnvironment[key];
    if (value !== undefined) childEnvironment[key] = value;
  }
  return childEnvironment;
}
/** A non-interactive, configuration-isolated environment for read-only Git. */
export function buildGitChildEnvironment(parentEnvironment: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return {
    ...buildChildEnvironment(parentEnvironment),
    HOME: '/nonexistent',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_TERMINAL_PROMPT: '0',
    GIT_OPTIONAL_LOCKS: '0',
  };
}
