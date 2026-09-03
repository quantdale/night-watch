// C-08 — bounded extractors for the two locally available deployment-evidence
// artifacts. Data-only: both take already-read text; the sibling-source
// boundary performs every read.
//
// The strength of each artifact is asserted here, once, so no caller has to
// decide it:
//
//   ouchan/build/config.yaml       DEPLOYMENT_FACT, and only NEGATIVELY
//   ripple-ui/src/config/common.js SOURCE_FACT (client configuration)
//
// The second is the one that matters. It is committed, current, and names real
// hosts per environment, so it reads as authoritative — but it states what the
// FRONTEND CALLS, not what the infrastructure SERVES. Classifying it
// DEPLOYMENT_FACT would be the exact error C-08 exists to avoid.

import crypto from 'node:crypto';
import {
  DEPLOYMENT_EXTRACTOR_VERSION,
  type BuildExclusion,
  type DeploymentEvidence,
  type HostMatrixEntry,
} from './deploymentBinding';

const MAX_ARTIFACT_BYTES = 2_000_000;
const MAX_HOST_MATRIX_ENTRIES = 256;
const MAX_BUILD_EXCLUSIONS = 512;
const SAFE_HOST = /^[a-z0-9.-]{1,253}$/i;
const SAFE_ENVIRONMENT = /^[a-z0-9_-]{1,32}$/i;
const SAFE_SERVICE_PATTERN = /^(?:re:|!re:)?[A-Za-z0-9_.*|()\][:^$-]{1,120}$/;

/** Digest over the NORMALIZED structure, so reformatting is not a change. */
function structureDigest(value: unknown): string {
  const canonical = (input: unknown): string => {
    if (input === null || typeof input !== 'object') return JSON.stringify(input) ?? 'null';
    if (Array.isArray(input)) return `[${input.map(canonical).join(',')}]`;
    const record = input as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
  };
  return `dep:sha256:${crypto.createHash('sha256').update(canonical(value), 'utf8').digest('hex').slice(0, 24)}`;
}

export interface ExtractionResult<T> {
  readonly entries: readonly T[];
  readonly evidence: DeploymentEvidence | null;
  /** True when the artifact exceeded a bound, so the result is incomplete. */
  readonly truncated: boolean;
}

/**
 * Extract the host matrix. Bounded, syntax-directed, and deliberately narrow:
 * it recognises `env: 'https://host/prefix'` and template forms, and refuses
 * anything it cannot parse rather than guessing a host.
 *
 * Returns SOURCE_FACT evidence. That classification is not negotiable here.
 */
export function extractHostMatrix(input: { repoId: string; sourceSha: string; path: string; text: string }): ExtractionResult<HostMatrixEntry> {
  if (input.text.length > MAX_ARTIFACT_BYTES) {
    return { entries: [], evidence: null, truncated: true };
  }
  const entries: HostMatrixEntry[] = [];
  let truncated = false;
  // Resolve same-file `const NAME = 'literal'` bindings so a template segment
  // becomes the value the file itself proves. `APP_PATH` is declared as
  // `const APP_PATH = 'ripple'` in this artifact, so `/m/${APP_PATH}` is
  // provably `/m/ripple` — that is a source fact, not an assumption. A
  // template naming anything NOT declared here stays a wildcard rather than
  // being guessed.
  const literals = new Map<string, string>();
  for (const declaration of input.text.matchAll(/\bconst\s+([A-Za-z_$][A-Za-z0-9_$]{0,63})\s*=\s*['"]([A-Za-z0-9._/-]{1,64})['"]\s*;/g)) {
    literals.set(declaration[1] ?? '', declaration[2] ?? '');
  }
  // `prod: 'https://api.alphaus.cloud/m/${APP_PATH}'` and friends. The URL is
  // split into host and path prefix; a template segment is normalised to a
  // wildcard rather than resolved, because resolving it would require knowing
  // APP_PATH's runtime value, which this file does not prove.
  const pattern = /\b([a-z0-9_-]{1,32})\s*:\s*[`'"]https?:\/\/([a-z0-9.-]{1,253})((?:\/[^`'"]*)?)[`'"]/gi;
  for (const match of input.text.matchAll(pattern)) {
    if (entries.length >= MAX_HOST_MATRIX_ENTRIES) { truncated = true; break; }
    const environment = match[1] ?? '';
    const host = match[2] ?? '';
    if (!SAFE_ENVIRONMENT.test(environment) || !SAFE_HOST.test(host)) continue;
    // Only real environment names are admitted; a key like `localhost` or an
    // unrelated identifier is not an environment.
    if (!['prod', 'next', 'dev', 'qa', 'production', 'staging'].includes(environment.toLowerCase())) continue;
    const rawPrefix = (match[3] ?? '').replace(/\$\{\s*([A-Za-z_$][A-Za-z0-9_$]{0,63})\s*\}/g,
      (_whole, name: string) => literals.get(name) ?? '*');
    const routePrefix = rawPrefix === '' ? '/' : rawPrefix;
    entries.push(Object.freeze({ routePrefix, environment: environment.toLowerCase(), host }));
  }
  const deduped = entries.filter((entry, index, all) =>
    all.findIndex((other) => other.routePrefix === entry.routePrefix && other.environment === entry.environment && other.host === entry.host) === index);
  return {
    entries: Object.freeze(deduped),
    evidence: deduped.length === 0 ? null : Object.freeze({
      repoId: input.repoId,
      sourceSha: input.sourceSha,
      path: input.path,
      extractorVersion: DEPLOYMENT_EXTRACTOR_VERSION,
      digest: structureDigest(deduped),
      // The load-bearing line in this file.
      factCategory: 'SOURCE_FACT' as const,
      hop: 'ROUTE_TO_HOST' as const,
    }),
    truncated,
  };
}

/**
 * Extract per-branch build exclusions from `ouchan/build/config.yaml`.
 *
 * Returns DEPLOYMENT_FACT evidence, because this IS deployment configuration —
 * but it only ever supports the NEGATIVE direction. `build_all: false` means
 * "build modified services only", so a service that is not excluded is
 * eligible to be built rather than known to be deployed. The extractor
 * therefore reports exclusions and says nothing about anything else.
 */
export function extractBuildExclusions(input: { repoId: string; sourceSha: string; path: string; text: string }): ExtractionResult<BuildExclusion> {
  if (input.text.length > MAX_ARTIFACT_BYTES) {
    return { entries: [], evidence: null, truncated: true };
  }
  const exclusions: BuildExclusion[] = [];
  let truncated = false;
  const lines = input.text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const nameMatch = /^\s*-\s*name:\s*["']?([^"'\n#]+?)["']?\s*$/.exec(lines[index] ?? '');
    if (nameMatch === null) continue;
    if (exclusions.length >= MAX_BUILD_EXCLUSIONS) { truncated = true; break; }
    const raw = (nameMatch[1] ?? '').trim();
    if (!SAFE_SERVICE_PATTERN.test(raw)) continue;
    const negated = raw.startsWith('!re:');
    const isRegex = negated || raw.startsWith('re:');
    const servicePattern = negated ? raw.slice(4) : isRegex ? raw.slice(3) : raw;
    // Branches may be an inline array or a following block sequence. Both are
    // read; anything else leaves the entry with no branches, which claims
    // nothing rather than defaulting to "all environments".
    const branches: string[] = [];
    for (let child = index + 1; child < lines.length && child <= index + 12; child += 1) {
      const line = lines[child] ?? '';
      if (/^\s*-\s*name:/.test(line)) break;
      const inline = /^\s*branches:\s*\[([^\]]*)\]/.exec(line);
      if (inline !== null) {
        for (const token of (inline[1] ?? '').split(',')) {
          const branch = token.trim().replace(/^["']|["']$/g, '');
          if (SAFE_ENVIRONMENT.test(branch)) branches.push(branch);
        }
        break;
      }
      if (/^\s*branches:\s*$/.test(line)) {
        for (let item = child + 1; item < lines.length && item <= child + 12; item += 1) {
          const entry = /^\s*-\s*["']?([a-z0-9_-]{1,32})["']?\s*$/i.exec(lines[item] ?? '');
          if (entry === null) break;
          branches.push(entry[1] ?? '');
        }
        break;
      }
    }
    if (servicePattern.length === 0) continue;
    exclusions.push(Object.freeze({ servicePattern, isRegex, negated, branches: Object.freeze([...new Set(branches)].sort()) }));
  }
  return {
    entries: Object.freeze(exclusions),
    evidence: exclusions.length === 0 ? null : Object.freeze({
      repoId: input.repoId,
      sourceSha: input.sourceSha,
      path: input.path,
      extractorVersion: DEPLOYMENT_EXTRACTOR_VERSION,
      digest: structureDigest(exclusions),
      factCategory: 'DEPLOYMENT_FACT' as const,
      hop: 'SERVICE_TO_DEPLOYMENT' as const,
    }),
    truncated,
  };
}

/**
 * Is recorded evidence still current? A digest mismatch means the artifact
 * changed, which makes the binding STALE. It is never silently rebound,
 * because a rebind would let a changed deployment artifact inherit the
 * authority of the binding it replaced.
 */
export function evidenceIsCurrent(recorded: DeploymentEvidence, currentDigest: string, currentSourceSha: string): boolean {
  return recorded.digest === currentDigest
    && recorded.sourceSha === currentSourceSha
    && recorded.extractorVersion === DEPLOYMENT_EXTRACTOR_VERSION;
}
