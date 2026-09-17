// C-05 — the owner-approved source universe, and the discovery that is NOT it.
//
// This module exists to make one sentence mechanical:
//
//     A repository DISCOVERED is not a repository ADMITTED.
//
// Before C-05 the sentence had nowhere to live. Admission was computed as
// `RIPPLE_REPOSITORIES.filter(scope === 'IN_SCOPE')` INTERSECTED with the keys
// of a local `APPROVED_ROOTS` literal in `approvedScan.ts`. Neither list was
// the owner-approved universe: the real membership rule was an intersection
// nobody had written down, and a repository present in one record and absent
// from the other was SILENTLY not admitted. Silence in the direction of
// reading less looks safe and is actually unfalsifiable — you cannot tell a
// deliberate exclusion from a bookkeeping slip.
//
// So this file is the single admission authority. `approvedScan.ts` projects
// from it and reconciles it against the change-intelligence map, where a
// disagreement is now a DECLARED ERROR rather than a quiet subtraction.
//
// This is data-only policy. It deliberately has no filesystem, process or
// network authority; the sibling-source boundary performs every read. That is
// what makes it safe for discovery to point at hundreds of repositories.

/** Shared proto/SDK service roots, admitted per-root inside repositories that
 * were already universe members (C-02a for `openapiv2`, C-03 for these). */
const SERVICE_ROOTS = Object.freeze([
  'admin', 'billing', 'cost', 'cover', 'flags', 'flow', 'gc', 'iam', 'luster',
  'operations', 'org', 'preferences', 'pricing', 'prism', 'vortex',
]);

/**
 * THE owner-approved universe. A repository is admitted if and only if it
 * appears here, and it may be read only within the roots named here.
 *
 * Every entry carries the authorization that admitted it, because "why is this
 * readable" is the question an auditor actually asks. A root added without an
 * authorization line is a root nobody approved.
 */
export const OWNER_APPROVED_UNIVERSE: Readonly<Record<string, readonly string[]>> = Object.freeze({
  // Phase 25 initial universe.
  'mobingilabs/ripple-ui': Object.freeze(['src']),
  // Wave 2 / OQ-5: `tests` admitted ONLY for the two PHP product families that
  // carry the historically evidenced static test-oracle material. Read-only
  // static classification; no product test executes and no other root is added.
  'mobingilabs/ripple-api': Object.freeze(['src', 'tests']),
  'mobingilabs/ouchan': Object.freeze(['services', 'pkg']),
  'alphauslabs/grpc-chunk-parser': Object.freeze(['src']),
  // Phase 25, plus `openapiv2` per C-02a and the proto service roots per C-03 —
  // both per-root changes inside an existing member, not repository admissions.
  'alphauslabs/blueapi': Object.freeze([...SERVICE_ROOTS, 'openapiv2']),
  // C-03: mechanically required by the join, because ouchan registers through
  // the generated SDK and the SDK's `ServiceName` constant proves the binding.
  'alphauslabs/blue-sdk-go': Object.freeze([...SERVICE_ROOTS]),
  // C-05 repository admissions, owner-named and limited to these two.
  //
  // `openapiv2` holds the committed generated Swagger artifact, consumed by the
  // EXISTING `parseOpenApiRoutes` — the same path C-02a used for
  // `blueapi/openapiv2`, so no second parser is introduced.
  'alphauslabs/blueinternal': Object.freeze(['openapiv2']),
  // Structurally identical to the already-admitted `mobingilabs/ripple-api`:
  // the same `src/App/Route/Config/Routing.yaml`, the same
  // `Handler`/`Middleware`/`Route/Providor` layout, and the same quoted
  // `"verb:/path":` route-key form the existing YAML parser already consumes.
  // Wave 2 / OQ-5: `tests` admitted only for bounded static test-oracle
  // classification, exactly like the sibling entry above.
  'mobingilabs/wave-api': Object.freeze(['src', 'tests']),
});

/**
 * The repositories C-05 admitted, named explicitly. This exists so that
 * "no third repository was admitted" is checkable against a literal rather
 * than against a diff.
 */
export const C05_ADMITTED_REPOSITORY_IDS = Object.freeze([
  'alphauslabs/blueinternal',
  'mobingilabs/wave-api',
]);

/** Sorted owner-approved repository identities. */
export function ownerApprovedRepositoryIds(): readonly string[] {
  return Object.freeze(Object.keys(OWNER_APPROVED_UNIVERSE).sort());
}

export function isOwnerApproved(repoId: string): boolean {
  return Object.prototype.hasOwnProperty.call(OWNER_APPROVED_UNIVERSE, repoId);
}

/** Approved roots for a repository, or null when it is not admitted. */
export function approvedRootsFor(repoId: string): readonly string[] | null {
  return isOwnerApproved(repoId) ? OWNER_APPROVED_UNIVERSE[repoId]! : null;
}

export type RepositoryAdmissionClass = 'ADMITTED' | 'DISCOVERED_NOT_ADMITTED';

/**
 * Every property that is NOT a reason to admit a repository. Each one is a
 * plausible-sounding shortcut, and each is refused by construction because
 * `classifyDiscoveredRepositories` consults nothing but the authority above.
 *
 * The last two matter most: `alphauslabs/blueinternal` HAS an OpenAPI document
 * and DOES sit beside the already-admitted `alphauslabs/blueapi`, and neither
 * fact is why it is admitted. An owner authorization is.
 */
export const NON_ADMISSION_PROPERTIES = Object.freeze([
  'REPOSITORY_EXISTS',
  'REPOSITORY_NAME_MATCHES',
  'REPOSITORY_LANGUAGE_MATCHES',
  'ORGANIZATION_DIRECTORY_MATCHES',
  'CONTAINS_OPENAPI_DOCUMENT',
  'CONTAINS_ROUTES',
  'FILESYSTEM_ADJACENT_TO_ADMITTED_REPOSITORY',
]);

export interface DiscoveredRepository {
  readonly repoId: string;
  readonly admission: RepositoryAdmissionClass;
  /** Approved roots, present only for an admitted repository. */
  readonly approvedRoots: readonly string[] | null;
}

export interface RepositoryDiscoveryProjection {
  readonly schemaVersion: 'nightwatch.repository-discovery.v1';
  readonly discoveredCount: number;
  readonly admittedCount: number;
  readonly notAdmittedCount: number;
  /** True when the enumeration that produced the input was bounded out. */
  readonly truncated: boolean;
  /** Null when truncation means the true total is unknowable. */
  readonly totalDiscovered: number | null;
  readonly remainingUnknown: boolean;
  readonly repositories: readonly DiscoveredRepository[];
  /** Admitted identities the enumeration did NOT see, so a missing checkout is
   * visible rather than silently reducing the admitted count. */
  readonly admittedButNotDiscovered: readonly string[];
}

/**
 * Classify an enumerated repository set. Discovery is ADMISSION-FREE: this
 * function reads nothing but the identities handed to it and the authority
 * above. It never inspects file contents, and no property of a discovered
 * repository can promote it.
 *
 * @param discoveredRepoIds identities the boundary actually enumerated
 * @param truncated whether that enumeration hit its bound
 */
export function classifyDiscoveredRepositories(
  discoveredRepoIds: readonly string[],
  truncated = false,
): RepositoryDiscoveryProjection {
  const unique = [...new Set(discoveredRepoIds)].sort();
  const repositories = unique.map((repoId) => {
    const admitted = isOwnerApproved(repoId);
    return Object.freeze({
      repoId,
      admission: (admitted ? 'ADMITTED' : 'DISCOVERED_NOT_ADMITTED') as RepositoryAdmissionClass,
      approvedRoots: admitted ? OWNER_APPROVED_UNIVERSE[repoId]! : null,
    });
  });
  const admittedCount = repositories.filter((repository) => repository.admission === 'ADMITTED').length;
  const seen = new Set(unique);
  return Object.freeze({
    schemaVersion: 'nightwatch.repository-discovery.v1' as const,
    discoveredCount: unique.length,
    admittedCount,
    notAdmittedCount: unique.length - admittedCount,
    truncated,
    // A truncated enumeration cannot report a total. UNKNOWN never becomes a
    // number here, in either direction.
    totalDiscovered: truncated ? null : unique.length,
    remainingUnknown: truncated,
    repositories: Object.freeze(repositories),
    admittedButNotDiscovered: Object.freeze(ownerApprovedRepositoryIds().filter((repoId) => !seen.has(repoId))),
  });
}
