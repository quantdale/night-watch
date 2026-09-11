// ---------------------------------------------------------------------------
// Schema version lifecycle — bump-time impact report (F-17, owner cost).
//
// An orphaned store is silent today: the owner discovers it when a review that
// existed yesterday reads as NO_REVIEW. This report makes the cost visible at
// CHANGE time: which stores hold records of the affected family, how many of
// them are at the old version, and which disposition the change declares.
//
// Pure: the caller supplies the counts; `storeCounts.ts` is the only fs
// surface. The report is emitted by `bin/schema-lifecycle.mjs bump-report`
// and is intentionally NOT part of any gate.
// ---------------------------------------------------------------------------

import type { SchemaFamilyDeclaration, SchemaStoreLocation } from './types';

export const SCHEMA_BUMP_IMPACT_VERSION = 'nightwatch.schema-bump-impact.v1' as const;

export interface PersistedStoreImpact {
  readonly store: SchemaStoreLocation;
  /** Safe display location: repository-relative or a fixed private marker. */
  readonly location: string;
  readonly affectedRecords: number;
  readonly totalRecords: number;
}

export interface SchemaBumpImpactReport {
  readonly schemaVersion: typeof SCHEMA_BUMP_IMPACT_VERSION;
  readonly family: string;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly persisted: boolean;
  readonly disposition: 'MIGRATE' | 'READ_COMPATIBLE' | 'ORPHAN' | null;
  readonly impacts: readonly PersistedStoreImpact[];
  readonly findings: readonly string[];
  readonly lines: readonly string[];
  readonly ok: boolean;
}

export interface BuildBumpImpactInput {
  readonly declaration: SchemaFamilyDeclaration;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly impacts?: readonly PersistedStoreImpact[];
}

export function buildSchemaBumpImpactReport(input: BuildBumpImpactInput): SchemaBumpImpactReport {
  const { declaration, fromVersion, toVersion } = input;
  const impacts = [...(input.impacts ?? [])].sort((left, right) => left.store.localeCompare(right.store));
  const disposition = declaration.dispositions.find(
    (entry) => entry.fromVersion === fromVersion && entry.toVersion === toVersion,
  ) ?? null;
  const findings: string[] = [];
  if (declaration.persisted && disposition === null) {
    findings.push(`SCHEMA_DISPOSITION_MISSING:${declaration.family}:v${fromVersion}->v${toVersion}`);
  }
  if (declaration.currentVersion !== toVersion) {
    findings.push(`SCHEMA_BUMP_TARGET_NOT_CURRENT:${declaration.family}:declared=${String(declaration.currentVersion)}:bump=${toVersion}`);
  }
  const lines: string[] = [
    `[schema-bump] ${declaration.family} v${fromVersion} -> v${toVersion}`,
    `[schema-bump] persisted=${declaration.persisted} store=${declaration.store} disposition=${disposition === null ? 'NONE' : disposition.kind}`,
  ];
  if (disposition !== null) lines.push(`[schema-bump] reason: ${disposition.reason}`);
  if (impacts.length === 0) {
    lines.push('[schema-bump] affected stores: none observed at this location');
  } else {
    for (const impact of impacts) {
      lines.push(`[schema-bump] store=${impact.store} location=${impact.location} affected=${impact.affectedRecords}/${impact.totalRecords}`);
    }
  }
  for (const finding of findings) lines.push(`[schema-bump] FINDING: ${finding}`);
  return {
    schemaVersion: SCHEMA_BUMP_IMPACT_VERSION,
    family: declaration.family,
    fromVersion,
    toVersion,
    persisted: declaration.persisted,
    disposition: disposition === null ? null : disposition.kind,
    impacts,
    findings,
    lines,
    ok: findings.length === 0,
  };
}
