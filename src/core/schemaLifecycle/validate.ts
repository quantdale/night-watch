// ---------------------------------------------------------------------------
// Schema version lifecycle — the structural rule.
//
// Pure and total: given the discovered identifiers, the declarations, the
// registry ids and the text of docs/DECISIONS.md, it returns every violation.
// It performs no I/O, so the same judgement can be run by the CLI, by the
// proof suite, and by any future hardening rule.
//
// The rule fails when:
//   - the scanner discovered nothing (a non-vacuous count is required);
//   - a discovered identifier has no declaration naming its exact version,
//     with the file that declares it named in the finding;
//   - a declaration names a family or version the scanner did not discover;
//   - a persisted family is missing exactly one CURRENT version;
//   - a persisted non-current version carries no MIGRATE / READ_COMPATIBLE /
//     ORPHAN disposition (or a probe's adversarial evidence);
//   - a disposition's proof field names an unregistered migration, fixture or
//     decision, or a registered fixture proves nothing;
//   - a persisted flag and store location disagree.
//
// ORPHAN is never a default reached by omission: it requires a decision
// reference that exists in docs/DECISIONS.md. Absence fails.
// ---------------------------------------------------------------------------

import { migrationById } from './migrations';
import { probeEvidenceFor } from './fixtures';
import {
  SCHEMA_VERSION_LIFECYCLE_VERSION,
  type DiscoveredSchemaIdentifier,
  type SchemaFamilyDeclaration,
  type SchemaLifecycleFinding,
  type SchemaLifecycleJudgement,
  type SchemaVersionDisposition,
} from './types';

/**
 * Does docs/DECISIONS.md carry a heading for `D-<n>`?
 */
export function decisionsCarry(decisionsText: string, decisionRef: string): boolean {
  const match = /^D-([0-9]+)$/.exec(decisionRef.trim());
  if (match === null || match[1] === undefined) return false;
  return new RegExp(`^##\\s+D-${match[1]}\\b`, 'm').test(decisionsText);
}

function coveredRoleForKind(kind: SchemaVersionDisposition['kind']): string {
  if (kind === 'MIGRATE') return 'MIGRATED';
  if (kind === 'READ_COMPATIBLE') return 'READ_COMPATIBLE';
  if (kind === 'ORPHAN') return 'ORPHANED';
  // 17.4: there is no presumed default disposition. An unknown runtime kind
  // must fail the role comparison, never fall through to ORPHANED (which a
  // matching ORPHANED role would then silently accept).
  return 'UNKNOWN_DISPOSITION_KIND';
}

export interface ValidateSchemaLifecycleInput {
  readonly discovered: readonly DiscoveredSchemaIdentifier[];
  readonly declarations: readonly SchemaFamilyDeclaration[];
  readonly decisionsText: string;
  readonly registeredMigrationIds: readonly string[];
  readonly registeredFixtureIds: readonly string[];
}

export function validateSchemaLifecycle(input: ValidateSchemaLifecycleInput): SchemaLifecycleJudgement {
  const findings: SchemaLifecycleFinding[] = [];
  const fail = (code: SchemaLifecycleFinding['code'], detail: string): void => {
    findings.push({ code, detail });
  };

  const discovered = [...input.discovered].sort((left, right) => left.identifier.localeCompare(right.identifier));
  const declarations = [...input.declarations].sort((left, right) => left.family.localeCompare(right.family));
  const migrationIds = new Set(input.registeredMigrationIds);
  const fixtureIds = new Set(input.registeredFixtureIds);

  // 1. Non-vacuous scan. Checked before anything else so a scanner that stops
  // matching can never present as a clean repository.
  if (discovered.length === 0) {
    fail('SCHEMA_SCAN_EMPTY', 'the scanner discovered zero schema identifiers under src/');
    return judgement(discovered, declarations, findings, 0, 0);
  }

  const byFamily = new Map<string, SchemaFamilyDeclaration>();
  for (const declaration of declarations) {
    if (byFamily.has(declaration.family)) {
      fail('SCHEMA_DECLARATION_DUPLICATE', declaration.family);
      continue;
    }
    byFamily.set(declaration.family, declaration);
  }

  // 2. Every discovered identifier is declared at its exact version, and every
  // declaration resolves to discovered bytes.
  const discoveredKeys = new Set(discovered.map((entry) => `${entry.family}.v${entry.version}`));
  const declaredKeys = new Set<string>();
  for (const entry of discovered) {
    const declaration = byFamily.get(entry.family);
    if (declaration === undefined) {
      fail('SCHEMA_UNDECLARED', `${entry.identifier} (${entry.files.join(', ')}) has no declaration for family ${entry.family}`);
      continue;
    }
    if (declaration.versions[entry.version] === undefined) {
      fail('SCHEMA_UNDECLARED', `${entry.identifier} (${entry.files.join(', ')}) is not declared on family ${entry.family}`);
      continue;
    }
    declaredKeys.add(`${entry.family}.v${entry.version}`);
  }
  for (const declaration of declarations) {
    const declaredVersions = Object.keys(declaration.versions).map((version) => Number(version));
    if (declaredVersions.length === 0) {
      fail('SCHEMA_DECLARATION_STALE', `${declaration.family} declares no versions`);
    }
    for (const version of declaredVersions) {
      const key = `${declaration.family}.v${version}`;
      if (!discoveredKeys.has(key)) {
        fail('SCHEMA_DECLARATION_STALE', `${key} is declared but no longer exists under src/`);
      }
    }
  }

  // 3. Persisted-vs-memory coherence.
  for (const declaration of declarations) {
    const storeIsMemory = declaration.store === 'IN_MEMORY';
    if (declaration.persisted === storeIsMemory) {
      fail('SCHEMA_STORE_LOCATION_INVALID', `${declaration.family} persisted=${declaration.persisted} store=${declaration.store}`);
    }
    if (!declaration.persisted && declaration.dispositions.length > 0) {
      fail('SCHEMA_MEMORY_DISPOSITION_PRESENT', `${declaration.family} is in-memory but carries ${declaration.dispositions.length} disposition(s)`);
    }
    if (declaration.persisted && declaration.store === 'IN_MEMORY') {
      fail('SCHEMA_STORE_LOCATION_INVALID', `${declaration.family} is persisted with no store location`);
    }
  }

  // 4. Persisted families need exactly one CURRENT and a disposition for every
  // non-current discovered version.
  const referencedFixtureIds = new Set<string>();
  for (const declaration of declarations) {
    const discoveredVersions = Object.keys(declaration.versions)
      .map((version) => Number(version))
      .filter((version) => discoveredKeys.has(`${declaration.family}.v${version}`))
      .sort((left, right) => left - right);
    if (!declaration.persisted) continue;

    const currentVersions = discoveredVersions.filter((version) => declaration.versions[version] === 'CURRENT');
    if (declaration.currentVersion === null || currentVersions.length !== 1 || currentVersions[0] !== declaration.currentVersion) {
      fail(
        'SCHEMA_CURRENT_VERSION_INVALID',
        `${declaration.family} persisted currentVersion=${declaration.currentVersion} but roles mark [${currentVersions.join(', ')}] CURRENT`,
      );
    }

    for (const version of discoveredVersions) {
      if (version === declaration.currentVersion) continue;
      const role = declaration.versions[version];
      if (role === 'SYNTHETIC_PROBE') {
        if (probeEvidenceFor(declaration.family, version) === null) {
          fail('SCHEMA_PROBE_UNREGISTERED', `${declaration.family}.v${version} is a probe with no registered adversarial evidence`);
        }
        continue;
      }
      if (role !== 'READ_COMPATIBLE' && role !== 'MIGRATED' && role !== 'ORPHANED') {
        fail(
          'SCHEMA_DISPOSITION_MISSING',
          `${declaration.family}.v${version} (${role}) has no MIGRATE/READ_COMPATIBLE/ORPHAN disposition`,
        );
        continue;
      }
      const disposition = declaration.dispositions.find((entry) => entry.fromVersion === version);
      if (disposition === undefined) {
        fail('SCHEMA_DISPOSITION_MISSING', `${declaration.family}.v${version} is persisted ${role} but carries no disposition`);
        continue;
      }
      if (coveredRoleForKind(disposition.kind) !== role) {
        fail(
          'SCHEMA_DISPOSITION_ROLE_MISMATCH',
          `${declaration.family}.v${version} role=${role} disposition=${disposition.kind}`,
        );
      }
      if (disposition.kind === 'MIGRATE') {
        if (disposition.migrationId === undefined || !migrationIds.has(disposition.migrationId) || migrationById(disposition.migrationId) === null) {
          fail('SCHEMA_MIGRATION_UNREGISTERED', `${declaration.family}.v${version} names migration ${String(disposition.migrationId)}`);
        } else {
          const migration = migrationById(disposition.migrationId);
          if (migration !== null && migration.schemaFamily !== declaration.family) {
            fail('SCHEMA_MIGRATION_UNREGISTERED', `${declaration.family}.v${version} names a migration that belongs to ${migration.schemaFamily}`);
          }
        }
      }
      if (disposition.kind === 'READ_COMPATIBLE') {
        if (disposition.fixtureId === undefined || !fixtureIds.has(disposition.fixtureId)) {
          fail('SCHEMA_FIXTURE_UNREGISTERED', `${declaration.family}.v${version} names fixture ${String(disposition.fixtureId)}`);
        } else {
          referencedFixtureIds.add(disposition.fixtureId);
        }
      }
      if (disposition.kind === 'ORPHAN') {
        if (disposition.decisionRef === undefined || !decisionsCarry(input.decisionsText, disposition.decisionRef)) {
          fail('SCHEMA_ORPHAN_DECISION_MISSING', `${declaration.family}.v${version} names decision ${String(disposition.decisionRef)}; ORPHAN is never a default`);
        }
      }
    }
  }

  // 5. A registered fixture that proves nothing is itself a defect: the
  // registry is evidence, not a wish list.
  for (const fixtureId of fixtureIds) {
    if (!referencedFixtureIds.has(fixtureId)) {
      fail('SCHEMA_FIXTURE_ORPHANED', `fixture ${fixtureId} is registered but no READ_COMPATIBLE disposition references it`);
    }
  }

  return judgement(discovered, declarations, findings, migrationIds.size, fixtureIds.size);
}

function judgement(
  discovered: readonly DiscoveredSchemaIdentifier[],
  declarations: readonly SchemaFamilyDeclaration[],
  findings: readonly SchemaLifecycleFinding[],
  migrationCount: number,
  fixtureCount: number,
): SchemaLifecycleJudgement {
  return {
    schemaVersion: SCHEMA_VERSION_LIFECYCLE_VERSION,
    discoveredCount: discovered.length,
    familyCount: declarations.length,
    persistedFamilyCount: declarations.filter((declaration) => declaration.persisted).length,
    fixtureCount,
    migrationCount,
    findings,
    ok: findings.length === 0,
  };
}
