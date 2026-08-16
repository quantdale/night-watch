// @ts-check
// ---------------------------------------------------------------------------
// Nightwatch Phase 9B — launcher argument parser (pure; unit-testable).
//
// The Phase 9B launcher accepts ONLY the minimum required options:
//   --env=dev
//   --storage-state=/absolute/external/state.json
//   --help | -h
//
// There is deliberately NO journey selector, NO arbitrary URL override, NO
// expectation selector, and no target override beyond the canonical exact
// DEV URL mechanism. The journey is FIXED (ripple-common-exchange-read).
// Any other option is rejected fail-closed.
// ---------------------------------------------------------------------------

/**
 * @typedef {{ env: string, storageState: string, help: boolean }} Phase9bLauncherArgs
 */

/**
 * @param {readonly string[]} args
 * @returns {Phase9bLauncherArgs}
 */
export function parsePhase9bLauncherArgs(args) {
  /** @type {string | undefined} */
  let env;
  /** @type {string | undefined} */
  let storage;
  let help = false;
  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }
    if (arg.startsWith('--env=')) {
      if (env !== undefined) throw new Error('phase9b-real accepts --env only once');
      env = arg.slice('--env='.length);
      continue;
    }
    if (arg.startsWith('--storage-state=')) {
      if (storage !== undefined) throw new Error('phase9b-real accepts --storage-state only once');
      storage = arg.slice('--storage-state='.length);
      continue;
    }
    if (arg.startsWith('--journey-id=') || arg === '--journey-id') {
      throw new Error('phase9b-real has no journey selector: the journey is fixed to ripple-common-exchange-read');
    }
    if (arg.startsWith('--ui-url=') || arg === '--ui-url') {
      throw new Error('phase9b-real accepts no --ui-url override: the canonical exact DEV URL is fixed');
    }
    throw new Error(`phase9b-real does not accept option ${arg}`);
  }
  if (!help) {
    if (env !== 'dev') {
      throw new Error(`phase9b-real requires exactly one --env=dev (got ${env === '' ? 'none' : env}); NEXT and production are forbidden`);
    }
    if (storage === undefined || storage.trim() === '') {
      throw new Error('phase9b-real requires --storage-state=/absolute/external/state.json');
    }
  }
  return { env: env ?? '', storageState: storage ?? '', help };
}

export const PHASE_9B_LAUNCHER_USAGE = [
  'Usage: npm run phase9b:real -- --env=dev --storage-state=/absolute/external/state.json',
  'The journey is fixed to ripple-common-exchange-read (FIRST + one fresh-context replay).',
  'No journey selector, no URL override, no expectation selector.',
].join('\n');
