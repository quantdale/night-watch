// @ts-check
// Read-only IO shared by the release-probe collector (`bin/project-state-check.mjs`)
// and the receipt probes (`bin/lib/release-receipt-probes.mjs`): a bounded,
// sanitized, shell-free Git read, a tolerant JSON read, and the TypeScript
// module loader. Extracted by review-5 A4.1 so the probes can be imported and
// driven by tests instead of living inside a CLI whose `main()` runs at import.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from './typescript-runtime-loader.mjs';

/**
 * @param {string} [root]
 * @returns {Record<string, string>}
 */
export function gitEnv(root = process.cwd()) {
  /** @type {Record<string, string>} */
  const environment = {
    PATH: '/usr/bin:/bin',
    HOME: root,
    GIT_CONFIG_GLOBAL: '/dev/null',
    LANG: 'C',
    LC_ALL: 'C',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_CONFIG_NOSYSTEM: '1',
  };
  // D-04 / 4.10 — the gate-mode label is a non-secret classification input;
  // the agent-state child must see the same mode its gate group runs in.
  const gateEnvironment = process.env['NIGHTWATCH_GATE_ENVIRONMENT'];
  if (gateEnvironment !== undefined && gateEnvironment !== '') {
    environment['NIGHTWATCH_GATE_ENVIRONMENT'] = gateEnvironment;
  }
  return environment;
}

/**
 * @param {string} root
 * @param {string[]} args
 * @returns {string | null}
 */
export function gitReadOnly(root, args) {
  const result = spawnSync('git', args, {
    cwd: root,
    env: gitEnv(root),
    shell: false,
    encoding: 'utf8',
    timeout: 5_000,
    maxBuffer: 512 * 1024,
  });
  if (result.status !== 0) return null;
  return result.stdout ?? '';
}

/**
 * @param {string} root
 * @param {string} file
 * @returns {ReturnType<typeof loadRuntimeTypeScriptModule>}
 */
export function loadTypeScriptModule(root, file) {
  return loadRuntimeTypeScriptModule(file, { root });
}


/**
 * @param {string} root
 * @param {string} relative
 * @returns {unknown}
 */
export function readJsonAt(root, relative) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
  } catch {
    return null;
  }
}
