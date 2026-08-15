// ---------------------------------------------------------------------------
// Phase 8A.1 fixed authoritative source manifest.
//
// The artifact records only the resulting digest. This code-defined list is
// the trust root and must be updated explicitly when authoritative source is
// added; hardening verifies that every tracked selfDev TypeScript file is
// covered.
// ---------------------------------------------------------------------------

export const SELFDEV_SOURCE_BUNDLE_MANIFEST_VERSION = 'nightwatch.selfdev-source-bundle.private.v1' as const;
export const SELFDEV_SOURCE_BUNDLE_ALGORITHM = 'sha256:length-prefixed-relative-path-and-bytes.v1' as const;

export const SELFDEV_AUTHORITATIVE_PATHS = Object.freeze([
  'bin/selfdev-adopt-sandbox.mjs',
  'bin/selfdev-provenance.mjs',
  'bin/selfdev-synthetic.mjs',
  'bin/selfdev-verify.mjs',
  'package-lock.json',
  'package.json',
  'src/core/policy/ownerScope.ts',
  'src/core/policy/privateArtifacts.ts',
  'src/core/provenance/index.ts',
  'src/core/provenance/localGit.ts',
  'src/core/selfDev/adoptedCaseCatalog.generated.ts',
  'src/core/selfDev/adoptedCases.ts',
  'src/core/selfDev/canonical.ts',
  'src/core/selfDev/contract.ts',
  'src/core/selfDev/controller.ts',
  'src/core/selfDev/evaluator.ts',
  'src/core/selfDev/index.ts',
  'src/core/selfDev/proposer.ts',
  'src/core/selfDev/provenanceManifest.ts',
  'src/core/selfDev/registry.ts',
  'src/core/selfDev/replay.ts',
  'src/core/selfDev/storage.ts',
  'src/core/selfDev/trust.ts',
  'src/core/selfDev/types.ts',
  'src/core/selfDev/validation.ts',
  'src/core/selfDevSandbox/index.ts',
  'src/core/selfDevSandbox/planner.ts',
  'src/core/selfDevSandbox/sandboxExecutor.ts',
  'src/core/selfDevSandbox/sandboxLoader.ts',
  'src/core/selfDevSandbox/sandboxMirror.ts',
  'src/core/selfDevSandbox/storage.ts',
  'src/core/selfDevSandbox/types.ts',
  'src/core/selfDevSandbox/validation.ts',
  'tsconfig.json',
] as const);

export function selfDevAuthoritativePaths(): readonly string[] {
  return [...SELFDEV_AUTHORITATIVE_PATHS].sort();
}
