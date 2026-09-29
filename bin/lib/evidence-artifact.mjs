// @ts-check

/**
 * VB-02 / RV-03 (corrections tasks 2.2, 7.3) — does a declared evidence
 * artifact exist AT a bound commit (`git cat-file -e <sha>:<path>`)?
 *
 * Every failure is ABSENT: a malformed sha or path, an unknown object, a
 * timeout, a signal or a spawn error never reads as present. Read-only git with
 * a fixed minimal environment; the repository root is the only input.
 */

import { spawnSync } from 'node:child_process';

const SHA_RE = /^[0-9a-f]{40}$/i;
const SAFE_PATH_RE = /^(?!\/)(?!.*\.\.)[A-Za-z0-9._/-]{1,200}$/;

/**
 * @param {string} root
 * @param {string} sha
 * @param {string} artifactPath
 * @returns {boolean}
 */
export function evidenceArtifactExistsAtSha(root, sha, artifactPath) {
  if (typeof sha !== 'string' || !SHA_RE.test(sha)) return false;
  if (typeof artifactPath !== 'string' || !SAFE_PATH_RE.test(artifactPath)) return false;
  const result = spawnSync('git', ['cat-file', '-e', `${sha}:${artifactPath}`], {
    cwd: root,
    env: { PATH: '/usr/bin:/bin', HOME: root, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_OPTIONAL_LOCKS: '0', LANG: 'C', LC_ALL: 'C' },
    shell: false,
    encoding: 'utf8',
    timeout: 5_000,
    maxBuffer: 64 * 1024,
  });
  return result.status === 0;
}
