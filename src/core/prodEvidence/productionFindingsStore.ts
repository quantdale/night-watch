// ---------------------------------------------------------------------------
// Nightwatch C-10 / Workstream G — the production artifact root.
//
// Production findings live in `$HOME/.nightwatch/prod-findings/`, which is a
// DIFFERENT namespace from the DEV findings root `$HOME/.nightwatch/findings/`
// and carries its own policy identity. Reusing the DEV root would put
// production evidence behind the Control Center's normal findings authority,
// which F-18 requires to be structurally impossible.
//
// The store accepts ONLY SAFE_PRODUCTION_EVIDENCE, re-validated by the
// persistence firewall at the moment of writing. It never accepts a raw
// response object, and there is no method through which one could be supplied.
//
// This campaign builds and synthetically tests the boundary. It NEVER
// populates the store from a real environment.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import {
  assertSourceProvenRoute,
  failProduction,
  NO_PROVEN_ROUTE_VOCABULARY,
  type RouteVocabularySource,
} from '../prodPrivacy';
import { assertOutsideSourceTopology, resolveSourceTopology, type SourceTopology } from '../policy/sourceTopology';
import { assertPersistableProductionEvidence } from './firewall';
import type { SafeProductionEvidence } from '../prodPrivacy';

export const PRODUCTION_ARTIFACT_POLICY_VERSION = 'nightwatch.production-artifact-policy.v1' as const;
export const PRODUCTION_ARTIFACT_ROOT_ENV = 'NIGHTWATCH_PRODUCTION_STATE_DIR' as const;

/** Deliberately NOT `.nightwatch/findings`. Separate namespace, separate identity. */
export const PRODUCTION_ARTIFACT_DEFAULT_RELATIVE_ROOT = path.join('.nightwatch', 'prod-findings');

/** Bounded store: a production root may not grow without limit. */
export const MAX_PRODUCTION_FINDING_FILES = 1000;

const FILE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,160}\.json$/;

/** NW-02: see `src/core/policy/sourceTopology.ts` — this decision must not
 * depend on where the code is checked out. */
const sourceTopology = (): SourceTopology => resolveSourceTopology();

export interface ProductionArtifactPolicyRecord {
  readonly policyVersion: typeof PRODUCTION_ARTIFACT_POLICY_VERSION;
  readonly storageClass: 'OWNER_ONLY_LOCAL_PRODUCTION';
  readonly externalPublication: 'PROHIBITED';
  readonly controlCenterVisibility: 'STRUCTURALLY_EXCLUDED';
  readonly rootClass: 'OUTSIDE_REPOSITORY' | 'INJECTED_TEST_ROOT';
  readonly evidenceSchema: 'nightwatch.production-evidence.v1';
}

function ensureAbsolute(root: string): string {
  if (typeof root !== 'string' || !path.isAbsolute(root)) {
    throw new Error('PRODUCTION_ARTIFACT_ROOT_NOT_ABSOLUTE');
  }
  return path.normalize(root);
}

function assertOutsideCanonicalWorkspace(root: string): void {
  assertOutsideSourceTopology(root, 'PRODUCTION_ARTIFACT_ROOT_INSIDE_REPOSITORY', sourceTopology());
}

/** Refuse a symlink at ANY path component, not merely at the leaf. */
function assertNoSymlinkComponents(target: string, errorCode: string): void {
  const resolved = ensureAbsolute(target);
  const parsed = path.parse(resolved);
  let current = parsed.root;
  for (const component of resolved.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(current);
    } catch {
      // A component that does not exist yet cannot be a symlink.
      continue;
    }
    if (stat.isSymbolicLink()) throw new Error(errorCode);
  }
}

function assertOwnerOnly(stat: fs.Stats, errorCode: string): void {
  if (process.getuid !== undefined && stat.uid !== process.getuid()) throw new Error(`${errorCode}_OWNER`);
  if ((stat.mode & 0o077) !== 0) throw new Error(`${errorCode}_PERMISSIONS_UNSAFE`);
}

function defaultRoot(): string {
  const configured = process.env.NIGHTWATCH_PRODUCTION_STATE_DIR;
  return configured === undefined || configured.trim() === ''
    ? path.join(os.homedir(), PRODUCTION_ARTIFACT_DEFAULT_RELATIVE_ROOT)
    : configured;
}

/**
 * Resolve the production root WITHOUT creating it. Used by the Control Center
 * exclusion rule and by tests that must assert the default location without
 * populating a real store.
 */
export function productionArtifactRoot(injectedRoot?: string): string {
  const root = ensureAbsolute(injectedRoot ?? defaultRoot());
  if (injectedRoot === undefined) assertOutsideCanonicalWorkspace(root);
  return root;
}

export function productionArtifactPolicyRecord(injectedRoot?: string): ProductionArtifactPolicyRecord {
  return {
    policyVersion: PRODUCTION_ARTIFACT_POLICY_VERSION,
    storageClass: 'OWNER_ONLY_LOCAL_PRODUCTION',
    externalPublication: 'PROHIBITED',
    controlCenterVisibility: 'STRUCTURALLY_EXCLUDED',
    rootClass: injectedRoot === undefined ? 'OUTSIDE_REPOSITORY' : 'INJECTED_TEST_ROOT',
    evidenceSchema: 'nightwatch.production-evidence.v1',
  };
}

function ensureOwnerDirectory(root: string): void {
  assertNoSymlinkComponents(root, 'PRODUCTION_ARTIFACT_ROOT_SYMLINK');
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  fs.chmodSync(root, 0o700);
  assertNoSymlinkComponents(root, 'PRODUCTION_ARTIFACT_ROOT_SYMLINK');
  const stat = fs.lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('PRODUCTION_ARTIFACT_ROOT_NOT_DIRECTORY');
  assertOwnerOnly(stat, 'PRODUCTION_ARTIFACT_ROOT');
}

function safeFileName(fileName: string): string {
  if (!FILE_NAME_RE.test(fileName) || fileName.includes('..')) {
    throw new Error('PRODUCTION_ARTIFACT_FILE_NAME_UNSAFE');
  }
  return fileName;
}

/**
 * Owner-only, bounded, atomic production evidence store.
 *
 * There is deliberately no `writeRaw`, no `writeBody`, no `attachScreenshot`
 * and no `attachTrace`: the only write method takes evidence that must pass
 * the firewall.
 *
 * DEF-C10-5: the store also holds the campaign's source-proven ROUTE
 * vocabulary and re-checks route membership at the durable write. The firewall
 * carries no vocabulary and so can only verify that provenance was RECORDED;
 * membership itself has to be enforced somewhere that knows the proven set,
 * and the durable boundary is that place. A store constructed without a route
 * vocabulary cannot verify route provenance and therefore refuses every write.
 */
export class ProductionFindingsStore {
  readonly root: string;
  readonly policy: ProductionArtifactPolicyRecord;
  private readonly routeVocabulary: RouteVocabularySource;

  constructor(
    options: {
      root?: string;
      createIfMissing?: boolean;
      routeVocabulary?: RouteVocabularySource;
    } = {},
  ) {
    this.root = productionArtifactRoot(options.root);
    if (options.createIfMissing !== false) ensureOwnerDirectory(this.root);
    this.policy = productionArtifactPolicyRecord(options.root);
    this.routeVocabulary = options.routeVocabulary ?? NO_PROVEN_ROUTE_VOCABULARY;
  }

  /** Bounded enumeration of the store's finding files. */
  list(): readonly string[] {
    if (!fs.existsSync(this.root)) return [];
    return fs
      .readdirSync(this.root, { withFileTypes: true })
      .filter((entry) => entry.isFile() && FILE_NAME_RE.test(entry.name))
      .map((entry) => entry.name)
      .sort();
  }

  /**
   * Write one production finding atomically.
   *
   * The firewall runs HERE, at the durable boundary, not merely wherever the
   * DTO was built.
   */
  write(fileName: string, evidence: unknown): string {
    const name = safeFileName(fileName);
    const validated: SafeProductionEvidence = assertPersistableProductionEvidence(evidence);
    // DEF-C10-5: membership, not spelling. A template-SHAPED route carrying a
    // concrete customer identifier passes every syntactic check, so the
    // durable boundary verifies it against the proven set.
    assertSourceProvenRoute(this.routeVocabulary, validated.routeTemplate);

    if (this.list().length >= MAX_PRODUCTION_FINDING_FILES) {
      failProduction('PRODUCTION_PRIVACY_LIMIT_EXCEEDED', 'EVIDENCE_BYTES');
    }

    ensureOwnerDirectory(this.root);
    const destination = path.join(this.root, name);
    const temporary = path.join(this.root, `.nightwatch-prod-${process.pid}-${randomBytes(16).toString('hex')}.tmp`);
    let descriptor: number | undefined;
    try {
      descriptor = fs.openSync(temporary, 'wx', 0o600);
      fs.writeFileSync(descriptor, JSON.stringify(validated, null, 2), { encoding: 'utf8' });
      fs.fsyncSync(descriptor);
      fs.closeSync(descriptor);
      descriptor = undefined;
      fs.chmodSync(temporary, 0o600);
      const stat = fs.lstatSync(temporary);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('PRODUCTION_ARTIFACT_TEMP_UNSAFE');
      assertOwnerOnly(stat, 'PRODUCTION_ARTIFACT_TEMP');
      fs.renameSync(temporary, destination);
      fs.chmodSync(destination, 0o600);
      return destination;
    } catch (error) {
      if (descriptor !== undefined) {
        try {
          fs.closeSync(descriptor);
        } catch {
          // Preserve the original failure.
        }
      }
      try {
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
      } catch {
        // Cleanup is best effort; the original safety failure is what matters.
      }
      throw error;
    }
  }

  /** Read one finding back, re-validating it through the firewall. */
  read(fileName: string): SafeProductionEvidence {
    const name = safeFileName(fileName);
    const target = path.join(this.root, name);
    assertNoSymlinkComponents(target, 'PRODUCTION_ARTIFACT_FILE_SYMLINK');
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('PRODUCTION_ARTIFACT_FILE_UNSAFE');
    assertOwnerOnly(stat, 'PRODUCTION_ARTIFACT_FILE');
    return assertPersistableProductionEvidence(JSON.parse(fs.readFileSync(target, 'utf8')) as unknown);
  }
}
