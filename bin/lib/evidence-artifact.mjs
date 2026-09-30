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

/**
 * R3-08 / corrections task 8.7 — the lane-artifact demotion, extracted pure so
 * it is executed on fixtures: a PROVEN lane whose binding declares an artifact
 * that does not exist AT its bound SHA is demoted. `existsAtSha` is injected;
 * every failure is ABSENT (a stub that answers true fails the fixture).
 *
 * @param {ReadonlyArray<{ laneId: string, reportedClass: string }>} lanes
 * @param {ReadonlyMap<string, { evidenceSha: string | null, artifactPaths: readonly string[] } | null | undefined>} bindings
 * @param {(sha: string, artifactPath: string) => boolean} existsAtSha
 * @returns {{ demoted: Set<string>, findings: string[] }}
 */
export function laneArtifactDemotions(lanes, bindings, existsAtSha) {
  const demoted = new Set();
  const findings = [];
  for (const lane of lanes) {
    if (lane.reportedClass !== 'PROVEN') continue;
    const binding = bindings.get(lane.laneId);
    const laneSha = typeof binding?.evidenceSha === 'string' && SHA_RE.test(binding.evidenceSha) ? binding.evidenceSha : null;
    if (laneSha === null) continue;
    for (const declared of Array.isArray(binding?.artifactPaths) ? binding.artifactPaths : []) {
      let exists = false;
      try {
        exists = existsAtSha(laneSha, declared) === true;
      } catch {
        exists = false;
      }
      if (!exists) {
        demoted.add(lane.laneId);
        findings.push(`EVIDENCE_ARTIFACT_ABSENT_AT_SHA:${lane.laneId}:${declared}`);
        break;
      }
    }
  }
  return { demoted, findings };
}
