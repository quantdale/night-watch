// @ts-check
// ---------------------------------------------------------------------------
// Nightwatch Phase 10B — launcher argument parser (pure; unit-testable).
//
// The Phase 10B launcher accepts ONLY the minimum required options:
//   --env=dev
//   --storage-state=/absolute/external/state.json
//   --help | -h
//
// There is deliberately NO journey selector, NO expectation selector, NO
// target selector, and NO arbitrary URL override. The journey is FIXED
// (ripple-common-exchange-read), the target is FIXED
// (ripple.common-exchange.read), and the expectation is FIXED
// (ripple.common-exchange.read.real-source-deep). Any other option is
// rejected fail-closed (authorization §6, §27).
// ---------------------------------------------------------------------------

/**
 * @typedef {{ env: string, storageState: string, help: boolean }} Phase10bLauncherArgs
 */

/**
 * @param {readonly string[]} args
 * @returns {Phase10bLauncherArgs}
 */
export function parsePhase10bLauncherArgs(args) {
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
      if (env !== undefined) throw new Error('phase10b-real accepts --env only once');
      env = arg.slice('--env='.length);
      continue;
    }
    if (arg.startsWith('--storage-state=')) {
      if (storage !== undefined) throw new Error('phase10b-real accepts --storage-state only once');
      storage = arg.slice('--storage-state='.length);
      continue;
    }
    if (arg.startsWith('--journey-id=') || arg === '--journey-id') {
      throw new Error('phase10b-real has no journey selector: the journey is fixed to ripple-common-exchange-read');
    }
    if (arg.startsWith('--expectation-id=') || arg === '--expectation-id') {
      throw new Error('phase10b-real has no expectation selector: the expectation is fixed to ripple.common-exchange.read.real-source-deep');
    }
    if (arg.startsWith('--target-id=') || arg === '--target-id') {
      throw new Error('phase10b-real has no target selector: the target is fixed to ripple.common-exchange.read');
    }
    if (arg.startsWith('--ui-url=') || arg === '--ui-url') {
      throw new Error('phase10b-real accepts no --ui-url override: the canonical exact DEV URL is fixed');
    }
    throw new Error(`phase10b-real does not accept option ${arg}`);
  }
  if (!help) {
    if (env !== 'dev') {
      throw new Error(`phase10b-real requires exactly one --env=dev (got ${env === '' ? 'none' : env}); NEXT and production are forbidden`);
    }
    if (storage === undefined || storage.trim() === '') {
      throw new Error('phase10b-real requires --storage-state=/absolute/external/state.json');
    }
  }
  return { env: env ?? '', storageState: storage ?? '', help };
}

export const PHASE_10B_LAUNCHER_USAGE = [
  'Usage: npm run phase10b:real -- --env=dev --storage-state=/absolute/external/state.json',
  'The journey is fixed to ripple-common-exchange-read (FIRST + one fresh-context replay).',
  'The target is fixed to ripple.common-exchange.read and the deep expectation to',
  'ripple.common-exchange.read.real-source-deep. No journey/expectation/target selector,',
  'no URL override, no retry.',
].join('\n');
