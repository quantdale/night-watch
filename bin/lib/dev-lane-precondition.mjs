/**
 * M8 (task 9.1) — the launcher-side DEV-lane precondition guard.
 *
 * Every DEV-lane launcher calls `assertDevLanePreconditionClear()` as its FIRST
 * executable step, before argument validation, auth validation or any child
 * process, so an OPEN precondition refuses the launch before any external
 * contact can happen.
 */
import path from 'node:path';
import { loadTypeScriptModule } from './typescript-runtime-loader.mjs';

export const DEV_LANE_PRECONDITION_OPEN = 'DEV_LANE_PRECONDITION_OPEN';
export const DEV_LANE_OWNER_TOKEN_ENV = 'NIGHTWATCH_DEV_LANE_OWNER_TOKEN';

/**
 * True when this invocation targets the DEV lane: an explicit `--env=dev` /
 * `--env dev`, or a launcher that is DEV-only by construction (`devOnly`).
 */
export function isDevInvocation(args, options = {}) {
  if (options.devOnly === true) return true;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--env=dev') return true;
    if (arg === '--env' && args[index + 1] === 'dev') return true;
  }
  return false;
}

/**
 * Refuse the launch while a DEV-lane precondition is OPEN. Returns true when
 * the guard applied (DEV invocation), false when the invocation is not DEV.
 */
export function guardDevLane({ root, launcher, args = [], devOnly = false, env = process.env } = {}) {
  if (!isDevInvocation(args, { devOnly })) return false;
  const resolvedRoot = root ?? path.resolve(process.cwd());
  const authority = loadTypeScriptModule('src/core/policy/devLanePreconditions.ts', { root: resolvedRoot });
  authority.assertDevLanePreconditionClear({
    root: resolvedRoot,
    launcher,
    ownerToken: env?.[DEV_LANE_OWNER_TOKEN_ENV],
  });
  return true;
}
