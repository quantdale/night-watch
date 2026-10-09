// F-11 / D-08 (M10 task 11.6) — the UI lockfile half of the dependency
// assessment, LOCAL ONLY.
//
// The root assessment in `./index` judges `package.json`, the root
// `package-lock.json`, the tracked sources and the governed documents. Until
// D-08 was opened it said nothing whatever about `ui/control-center`, whose own
// manifest and lockfile carry a much larger closure (218 resolved packages
// against the root's eleven) and whose advisory surface the census recorded as
// "2 unrecorded moderate advisories" — a claim with no identifier, no affected
// range and no scan record anywhere in the repository.
//
// This module applies the SAME three rules to that lockfile:
//
//   1. a transitive assessment — the lockfile's OWN declaration is compared
//      with its manifest, and every declared package's resolved version is
//      read out of the transitive closure rather than asserted;
//   2. a version pin — every declared specifier must be an exact `x.y.z`
//      pin, so an unrequested minor cannot arrive through a range;
//   3. reachability — each declared package is classified by which tracked UI
//      sources actually import it, which is what separates the production
//      bundle closure from the test/toolchain closure.
//
// The ONLINE advisory half is deliberately NOT faked here. No registry query is
// authorized in this task's scope (the single authorized query belongs to task
// 15.4), so the record carries `result: 'UNVERIFIABLE'` and this module
// enforces the SHAPE of that honesty: an unverifiable scan must say why, must
// name the task that will resolve it, must cite where each advisory identifier
// came from, and must never claim a reachability disposition the metadata does
// not support. A `CLEAN` result without an executed query is a finding.
//
// This module is pure: no filesystem, process, network, Git or clock authority.
// The caller supplies the parsed manifest, the parsed lockfile, the tracked UI
// sources and the current date.

import { computeDueDate, stripComments } from './text';
import type { DependencyCurrencyFinding } from './index';

export const UI_LOCKFILE_ASSESSMENT_VERSION = 'nightwatch.ui-lockfile-assessment.v1' as const;

/** The only shape of specifier the UI manifest is allowed to declare. */
const EXACT_PIN_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

/** Files under `ui/` that legitimately import devDependencies without being tests. */
const TEST_SOURCE_RE = /\.(?:test|spec)\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

const UI_TEXT_EXTENSIONS_RE = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs|json|css|html)$/;
export type UiPackageKind = 'dependency' | 'devDependency';

export type UiAdvisoryReachability =
  | 'UNVERIFIABLE'
  | 'UNREACHABLE_IN_NIGHTWATCH'
  | 'REACHABLE_DEV_TEST_ONLY'
  | 'REACHABLE_PRODUCTION';

export type UiAdvisoryScanResult = 'UNVERIFIABLE' | 'ADVISORIES_RECORDED' | 'NO_ADVISORIES_FOUND';

export interface UiDeclaredPackage {
  readonly name: string;
  readonly specifier: string;
  readonly kind: UiPackageKind;
  readonly resolvedVersion: string;
}

/**
 * The recorded snapshot of the UI lockfile at its last assessment. The
 * `toolchainImporters` list is the structural basis of the reachability
 * argument: files under `ui/control-center` that are not application code and
 * are not tests, yet legitimately import devDependencies.
 */
export interface UiLockfileSnapshot {
  readonly manifestPath: string;
  readonly lockfilePath: string;
  readonly packageName: string;
  readonly packageVersion: string;
  readonly lockfileVersion: number;
  readonly packageCount: number;
  readonly declared: readonly UiDeclaredPackage[];
  readonly toolchainImporters: readonly string[];
}

export interface UiAdvisoryRecord {
  /** The advisory identifier, recorded verbatim. Never inferred. */
  readonly advisoryId: string;
  /** Where the identifier was read from. Mandatory for an UNVERIFIED field. */
  readonly metadataSource: string;
  readonly affectedPackage: string;
  readonly affectedRange: string;
  readonly severity: string;
  readonly fixedIn: string;
  readonly reachability: UiAdvisoryReachability;
  readonly reachabilityEvidence: string;
}

export interface UiAdvisoryScanRecord {
  readonly result: UiAdvisoryScanResult;
  readonly executed: boolean;
  readonly queryDate: string | null;
  readonly registry: string | null;
  readonly unverifiableReason: string | null;
  readonly deferredToTask: string | null;
  readonly advisories: readonly UiAdvisoryRecord[];
}

export interface UiLockfileAssessmentRecord {
  readonly assessmentDate: string;
  readonly intervalDays: number;
  readonly lockfileSha256: string;
  readonly snapshot: UiLockfileSnapshot;
  readonly advisoryScan: UiAdvisoryScanRecord;
}

export interface UiLockfileProbe {
  readonly id: string;
  readonly target: string;
  readonly expectedFinding: string;
}

export interface UiLockfileAssessmentSection {
  readonly schemaVersion: string;
  readonly note: string;
  readonly versionPinPolicy: string;
  readonly advisoryLaneId: string;
  readonly record: UiLockfileAssessmentRecord;
}

export interface UiLockfileInput {
  /** The raw `uiLockfileAssessment` section, parsed fail-closed. */
  readonly section: unknown;
  /**
   * The record's whole top-level negative-probe array. The UI half selects the
   * `UI_*` entries from it, so one probe array serves both halves of the
   * assessment exactly as the existing `DC-*` entries already do.
   */
  readonly probes: readonly unknown[];
  readonly today: string;
  readonly manifest: unknown;
  readonly lockfile: unknown;
  /** Every tracked UI file that is not the manifest or the lockfile itself. */
  readonly uiSources: readonly { readonly path: string; readonly text: string }[];
  readonly observedLockfileSha256: string | null;
}

export interface UiResolvedPackage {
  readonly name: string;
  readonly specifier: string;
  readonly kind: UiPackageKind;
  readonly resolvedVersion: string;
  /** A tracked UI file imports this package. */
  readonly importedByTrackedSources: boolean;
  /** True for a `*.test.*` file, for a recorded toolchain importer, or for the manifest/lockfile. */
  readonly confinedToTestAndToolchain: boolean;
}

export interface UiLockfileAssessmentResult {
  readonly ok: boolean;
  readonly findings: readonly DependencyCurrencyFinding[];
  readonly reviewDue: boolean;
  readonly reviewDueDate: string | null;
  readonly advisoryResult: UiAdvisoryScanResult | null;
  readonly resolved: readonly UiResolvedPackage[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asPositiveInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The dependency maps of a parsed `package.json`, or null when unusable. */
export function readUiManifest(manifest: unknown): {
  readonly name: string;
  readonly version: string;
  readonly dependencies: Record<string, string>;
  readonly devDependencies: Record<string, string>;
} | null {
  if (!isRecord(manifest)) return null;
  const name = asString(manifest.name);
  const version = asString(manifest.version);
  if (name === null || version === null) return null;
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  for (const [target, source] of [['dependencies', dependencies], ['devDependencies', devDependencies]] as const) {
    const map = isRecord(manifest[target]) ? manifest[target] : null;
    if (map === null) continue;
    for (const key of Object.keys(map)) {
      const specifier = asString(map[key]);
      if (specifier !== null) source[key] = specifier;
    }
  }
  return { name, version, dependencies, devDependencies };
}

/**
 * The resolved `node_modules/<name>` map of an npm v2/v3 lockfile, plus the
 * root package's own declaration. Every entry's `version` is what the
 * transitive closure actually installs, which is the only honest source for a
 * vulnerability range comparison.
 */
export function readUiLockfile(lockfile: unknown): {
  readonly name: string;
  readonly version: string;
  readonly lockfileVersion: number;
  readonly packageCount: number;
  readonly rootDependencies: Record<string, string>;
  readonly rootDevDependencies: Record<string, string>;
  readonly resolvedVersions: Record<string, string>;
} | null {
  if (!isRecord(lockfile)) return null;
  const name = asString(lockfile.name);
  const version = asString(lockfile.version);
  if (name === null || version === null) return null;
  const packages = isRecord(lockfile.packages) ? lockfile.packages : null;
  if (packages === null) return null;
  const lockfileVersion = asPositiveInt(lockfile.lockfileVersion);
  if (lockfileVersion === null) return null;

  const root = isRecord(packages['']) ? packages[''] : null;
  const rootDependencies: Record<string, string> = {};
  const rootDevDependencies: Record<string, string> = {};
  for (const [target, source] of [['dependencies', rootDependencies], ['devDependencies', rootDevDependencies]] as const) {
    const map = root !== null && isRecord(root[target]) ? root[target] : null;
    if (map === null) continue;
    for (const key of Object.keys(map)) {
      const specifier = asString(map[key]);
      if (specifier !== null) source[key] = specifier;
    }
  }

  /** @type {Record<string, string>} */
  const resolvedVersions: Record<string, string> = {};
  /** @type {Record<string, number>} */
  const resolvedDepth: Record<string, number> = {};
  let packageCount = 0;
  for (const key of Object.keys(packages)) {
    const entry = packages[key];
    if (!isRecord(entry)) continue;
    if (key === '') continue;
    // A workspace/link entry carries no version of its own; the entry it links
    // to does, so it is not a resolved package in its own right.
    if (typeof entry.link === 'string') continue;
    const resolved = asString(entry.version);
    if (resolved === null) continue;
    packageCount += 1;
    const marker = 'node_modules/';
    const index = key.lastIndexOf(marker);
    const name = index === -1 ? key : key.slice(index + marker.length);
    // The shallowest path wins, which is npm's own resolution rule for a name
    // that appears at more than one depth in the tree.
    const previous = resolvedDepth[name];
    if (previous === undefined || key.length < previous) {
      resolvedVersions[name] = resolved;
      resolvedDepth[name] = key.length;
    }
  }
  return { name, version, lockfileVersion, packageCount, rootDependencies, rootDevDependencies, resolvedVersions };
}

/** Where a package is imported, using the same specifier grammar as the root scan. */
function importSites(text: string, name: string): readonly string[] {
  const pattern = new RegExp(
    `(?:import\\s+(?:[^'"]+\\s+from\\s+)?|require\\s*\\(\\s*|import\\s*\\(\\s*)['"]${escapeRegExp(name)}(?:\\/[^'"]*)?['"]`,
    'g',
  );
  return [...stripComments(text).matchAll(pattern)].map(() => name);
}

/** The probe targets this half of the assessment owns; they share the record's one probe array. */
export const UI_PROBE_CODE_RE = /^UI_/;

/** The `UI_*` negative probes of the record's shared probe array. */
export function selectUiProbes(probes: readonly unknown[]): readonly UiLockfileProbe[] {
  /** @type {UiLockfileProbe[]} */
  const selected: UiLockfileProbe[] = [];
  for (const entry of probes) {
    if (!isRecord(entry)) continue;
    const id = asString(entry.id);
    const target = asString(entry.target);
    const expectedFinding = asString(entry.expectedFinding);
    if (id === null || target === null || expectedFinding === null) continue;
    if (!UI_PROBE_CODE_RE.test(expectedFinding)) continue;
    selected.push({ id, target, expectedFinding });
  }
  return selected;
}

/** Parse the `uiLockfileAssessment` section, failing closed on any malformed field. */
export function parseUiLockfileAssessmentSection(raw: unknown): {
  readonly ok: boolean;
  readonly section: UiLockfileAssessmentSection | null;
  readonly findings: readonly DependencyCurrencyFinding[];
} {
  const findings: DependencyCurrencyFinding[] = [];
  if (!isRecord(raw)) {
    return { ok: false, section: null, findings: [{ code: 'UI_RECORD_INVALID', detail: 'the uiLockfileAssessment section is not an object' }] };
  }
  if (raw.schemaVersion !== UI_LOCKFILE_ASSESSMENT_VERSION) {
    findings.push({ code: 'UI_RECORD_SCHEMA_UNSUPPORTED', detail: String(raw.schemaVersion ?? 'ABSENT') });
  }
  const advisoryLaneId = asString(raw.advisoryLaneId);
  if (advisoryLaneId === null) findings.push({ code: 'UI_RECORD_INVALID', detail: 'advisoryLaneId is missing' });
  const versionPinPolicy = asString(raw.versionPinPolicy);
  if (versionPinPolicy === null) findings.push({ code: 'UI_RECORD_INVALID', detail: 'versionPinPolicy is missing' });

  const recordRaw = isRecord(raw.record) ? raw.record : null;
  const snapshotRaw = recordRaw !== null && isRecord(recordRaw.snapshot) ? recordRaw.snapshot : null;
  const scanRaw = recordRaw !== null && isRecord(recordRaw.advisoryScan) ? recordRaw.advisoryScan : null;

  const assessmentDate = recordRaw === null ? null : asString(recordRaw.assessmentDate);
  const intervalDays = recordRaw === null ? null : asPositiveInt(recordRaw.intervalDays);
  const lockfileSha256 = recordRaw === null ? null : asString(recordRaw.lockfileSha256);
  if (assessmentDate === null || computeDueDate(assessmentDate, intervalDays ?? 0) === null) {
    findings.push({ code: 'UI_RECORD_INVALID', detail: `record.assessmentDate is invalid: ${String(assessmentDate)}` });
  }
  if (intervalDays === null) findings.push({ code: 'UI_RECORD_INVALID', detail: 'record.intervalDays is not a positive integer' });
  if (lockfileSha256 === null || !/^sha256:[0-9a-f]{64}$/.test(lockfileSha256)) {
    findings.push({ code: 'UI_RECORD_INVALID', detail: `record.lockfileSha256 is invalid: ${String(lockfileSha256)}` });
  }

  const manifestPath = snapshotRaw === null ? null : asString(snapshotRaw.manifestPath);
  const lockfilePath = snapshotRaw === null ? null : asString(snapshotRaw.lockfilePath);
  const packageName = snapshotRaw === null ? null : asString(snapshotRaw.packageName);
  const packageVersion = snapshotRaw === null ? null : asString(snapshotRaw.packageVersion);
  const lockfileVersion = snapshotRaw === null ? null : asPositiveInt(snapshotRaw.lockfileVersion);
  const packageCount = snapshotRaw === null ? null : asPositiveInt(snapshotRaw.packageCount);
  if (manifestPath === null || lockfilePath === null || packageName === null || packageVersion === null) {
    findings.push({ code: 'UI_RECORD_INVALID', detail: 'record.snapshot identity is incomplete' });
  }
  if (lockfileVersion === null) findings.push({ code: 'UI_RECORD_INVALID', detail: 'record.snapshot.lockfileVersion is not a positive integer' });
  if (packageCount === null) findings.push({ code: 'UI_RECORD_INVALID', detail: 'record.snapshot.packageCount is not a positive integer' });

  /** @type {UiDeclaredPackage[]} */
  const declared: UiDeclaredPackage[] = [];
  if (snapshotRaw === null || !Array.isArray(snapshotRaw.declared)) {
    findings.push({ code: 'UI_RECORD_INVALID', detail: 'record.snapshot.declared is missing' });
  } else {
    for (const entry of snapshotRaw.declared) {
      if (!isRecord(entry)) continue;
      const name = asString(entry.name);
      const specifier = asString(entry.specifier);
      const kind = asString(entry.kind);
      const resolvedVersion = asString(entry.resolvedVersion);
      if (name === null || specifier === null || resolvedVersion === null || (kind !== 'dependency' && kind !== 'devDependency')) continue;
      declared.push({ name, specifier, kind, resolvedVersion });
    }
    if (declared.length === 0) findings.push({ code: 'UI_RECORD_INVALID', detail: 'record.snapshot.declared is empty' });
  }

  const toolchainImporters: string[] = [];
  if (snapshotRaw !== null && Array.isArray(snapshotRaw.toolchainImporters)) {
    for (const entry of snapshotRaw.toolchainImporters) {
      const value = asString(entry);
      if (value !== null) toolchainImporters.push(value);
    }
    if (toolchainImporters.length === 0) findings.push({ code: 'UI_RECORD_INVALID', detail: 'record.snapshot.toolchainImporters is empty' });
  } else if (snapshotRaw !== null) {
    findings.push({ code: 'UI_RECORD_INVALID', detail: 'record.snapshot.toolchainImporters is missing' });
  }

  const advisories: UiAdvisoryRecord[] = [];
  let advisoryResult: UiAdvisoryScanResult | null = null;
  let advisoryExecuted = false;
  let advisoryQueryDate: string | null = null;
  let advisoryRegistry: string | null = null;
  let advisoryReason: string | null = null;
  let advisoryDeferred: string | null = null;
  if (scanRaw === null) {
    findings.push({ code: 'UI_RECORD_INVALID', detail: 'record.advisoryScan is missing' });
  } else {
    advisoryResult = asString(scanRaw.result) as UiAdvisoryScanResult | null;
    if (advisoryResult !== 'UNVERIFIABLE' && advisoryResult !== 'ADVISORIES_RECORDED' && advisoryResult !== 'NO_ADVISORIES_FOUND') {
      findings.push({ code: 'UI_RECORD_INVALID', detail: `record.advisoryScan.result is unsupported: ${String(scanRaw.result)}` });
      advisoryResult = null;
    }
    advisoryExecuted = scanRaw.executed === true;
    advisoryQueryDate = asString(scanRaw.queryDate);
    advisoryRegistry = asString(scanRaw.registry);
    advisoryReason = asString(scanRaw.unverifiableReason);
    advisoryDeferred = asString(scanRaw.deferredToTask);
    if (Array.isArray(scanRaw.advisories)) {
      for (const entry of scanRaw.advisories) {
        if (!isRecord(entry)) continue;
        const advisoryId = asString(entry.advisoryId);
        if (advisoryId === null) continue;
        advisories.push({
          advisoryId,
          metadataSource: asString(entry.metadataSource) ?? '',
          affectedPackage: asString(entry.affectedPackage) ?? 'UNVERIFIED',
          affectedRange: asString(entry.affectedRange) ?? 'UNVERIFIED',
          severity: asString(entry.severity) ?? 'UNVERIFIED',
          fixedIn: asString(entry.fixedIn) ?? 'UNVERIFIED',
          reachability: (asString(entry.reachability) ?? 'UNVERIFIABLE') as UiAdvisoryReachability,
          reachabilityEvidence: asString(entry.reachabilityEvidence) ?? '',
        });
      }
    }
  }

  const complete =
    findings.length === 0
    && advisoryLaneId !== null
    && versionPinPolicy !== null
    && assessmentDate !== null
    && intervalDays !== null
    && lockfileSha256 !== null
    && manifestPath !== null
    && lockfilePath !== null
    && packageName !== null
    && packageVersion !== null
    && lockfileVersion !== null
    && packageCount !== null
    && declared.length > 0
    && toolchainImporters.length > 0
    && advisoryResult !== null;

  // `advisoryResult` is narrowed by the same fail-closed guard: an unsupported
  // or absent result leaves the section unusable rather than defaulting.
  if (!complete || recordRaw === null || snapshotRaw === null || scanRaw === null || advisoryResult === null) {
    return { ok: false, section: null, findings };
  }
  return {
    ok: true,
    section: {
      schemaVersion: UI_LOCKFILE_ASSESSMENT_VERSION,
      note: asString(raw.note) ?? '',
      versionPinPolicy,
      advisoryLaneId,
      record: {
        assessmentDate,
        intervalDays,
        lockfileSha256,
        snapshot: {
          manifestPath,
          lockfilePath,
          packageName,
          packageVersion,
          lockfileVersion,
          packageCount,
          declared,
          toolchainImporters,
        },
        advisoryScan: {
          result: advisoryResult,
          executed: advisoryExecuted,
          queryDate: advisoryQueryDate,
          registry: advisoryRegistry,
          unverifiableReason: advisoryReason,
          deferredToTask: advisoryDeferred,
          advisories,
        },
      },
    },
    findings,
  };
}

/** The advisory result must agree with whether a query was executed. */
function advisoryContradictions(scan: UiAdvisoryScanRecord): readonly DependencyCurrencyFinding[] {
  const findings: DependencyCurrencyFinding[] = [];
  const count = scan.advisories.length;
  if (scan.result === 'NO_ADVISORIES_FOUND' && !scan.executed) {
    findings.push({
      code: 'UI_LOCKFILE_ADVISORY_CLEAN_CLAIM',
      detail: 'advisoryScan.result is NO_ADVISORIES_FOUND but no registry query was executed; an absent scan is never a passing scan',
    });
  }
  if (scan.result === 'UNVERIFIABLE' && scan.executed) {
    findings.push({
      code: 'UI_LOCKFILE_ADVISORY_RESULT_CONTRADICTION',
      detail: 'advisoryScan.result is UNVERIFIABLE while executed is true; an executed query has a result',
    });
  }
  if (scan.result === 'NO_ADVISORIES_FOUND' && count > 0) {
    findings.push({ code: 'UI_LOCKFILE_ADVISORY_RESULT_CONTRADICTION', detail: `advisoryScan.result is NO_ADVISORIES_FOUND but ${count} advisories are recorded` });
  }
  if (scan.result === 'ADVISORIES_RECORDED' && count === 0) {
    findings.push({ code: 'UI_LOCKFILE_ADVISORY_RESULT_CONTRADICTION', detail: 'advisoryScan.result is ADVISORIES_RECORDED but no advisory is recorded' });
  }
  if (scan.result === 'UNVERIFIABLE') {
    if (scan.unverifiableReason === null || scan.unverifiableReason.trim().length === 0) {
      findings.push({ code: 'UI_LOCKFILE_ADVISORY_UNVERIFIABLE_UNEXPLAINED', detail: 'advisoryScan.result is UNVERIFIABLE but no unverifiableReason is recorded' });
    }
    if (scan.deferredToTask === null || scan.deferredToTask.trim().length === 0) {
      findings.push({ code: 'UI_LOCKFILE_ADVISORY_UNVERIFIABLE_UNEXPLAINED', detail: 'advisoryScan.result is UNVERIFIABLE but no deferredToTask names the authority that will resolve it' });
    }
  }
  if (scan.executed && (scan.queryDate === null || scan.registry === null)) {
    findings.push({ code: 'UI_LOCKFILE_ADVISORY_QUERY_UNRECORDED', detail: 'advisoryScan.executed is true but the query date or registry is missing' });
  }
  return findings;
}

/**
 * An advisory whose metadata is absent must say where its identifier came from,
 * and a POSITIVE reachability claim must not be made about a package whose
 * affected range is unverified. Those two rules are what stop a fabricated
 * advisory or a borrowed reachability verdict from entering the record.
 */
function advisoryHonesty(advisories: readonly UiAdvisoryRecord[]): readonly DependencyCurrencyFinding[] {
  const findings: DependencyCurrencyFinding[] = [];
  const positive = new Set<UiAdvisoryReachability>(['UNREACHABLE_IN_NIGHTWATCH', 'REACHABLE_DEV_TEST_ONLY', 'REACHABLE_PRODUCTION']);
  for (const advisory of advisories) {
    const unverified = [advisory.affectedPackage, advisory.affectedRange, advisory.severity, advisory.fixedIn].includes('UNVERIFIED');
    if (unverified && advisory.metadataSource.trim().length === 0) {
      findings.push({
        code: 'UI_LOCKFILE_ADVISORY_METADATA_UNSOURCED',
        detail: `${advisory.advisoryId} carries UNVERIFIED metadata but no metadataSource; an identifier must name where it was read from`,
      });
    }
    if (advisory.reachability !== 'UNVERIFIABLE' && advisory.reachabilityEvidence.trim().length === 0) {
      findings.push({
        code: 'UI_LOCKFILE_ADVISORY_REACHABILITY_UNEVIDENCED',
        detail: `${advisory.advisoryId} claims reachability ${advisory.reachability} with no reachabilityEvidence`,
      });
    }
    if (positive.has(advisory.reachability) && advisory.affectedPackage === 'UNVERIFIED') {
      findings.push({
        code: 'UI_LOCKFILE_ADVISORY_REACHABILITY_UNEVIDENCED',
        detail: `${advisory.advisoryId} claims reachability ${advisory.reachability} while its affected package is UNVERIFIED; a reachability verdict needs a known affected package`,
      });
    }
    if (advisory.reachability === 'UNVERIFIABLE' && advisory.reachabilityEvidence.trim().length === 0) {
      findings.push({
        code: 'UI_LOCKFILE_ADVISORY_REACHABILITY_UNEVIDENCED',
        detail: `${advisory.advisoryId} records reachability UNVERIFIABLE with no explanation of what is missing`,
      });
    }
  }
  return findings;
}

/**
 * The three UI rules over one supplied snapshot: the transitive closure is
 * read, the pins are verified, and the reachability of every declared package
 * is classified from the tracked UI sources.
 */
export function assessUiLockfile(input: UiLockfileInput): UiLockfileAssessmentResult {
  const uiProbes = selectUiProbes(input.probes);
  if (uiProbes.length === 0) {
    return {
      ok: false,
      findings: [{ code: 'UI_PROBES_MISSING', detail: 'the UI lockfile assessment registers no negative probe' }],
      reviewDue: false,
      reviewDueDate: null,
      advisoryResult: null,
      resolved: [],
    };
  }
  const parsed = parseUiLockfileAssessmentSection(input.section);
  if (!parsed.ok || parsed.section === null) {
    return {
      ok: false,
      findings: parsed.findings,
      reviewDue: false,
      reviewDueDate: null,
      advisoryResult: null,
      resolved: [],
    };
  }
  const section = parsed.section;
  const record = section.record;
  const findings: DependencyCurrencyFinding[] = [];

  if (input.uiSources.length === 0) {
    findings.push({
      code: 'UI_LOCKFILE_SOURCE_SET_EMPTY',
      detail: 'no tracked UI source was supplied to the reachability scan; an empty scan is not a passing scan',
    });
  }

  const manifest = readUiManifest(input.manifest);
  if (manifest === null) {
    return { ok: false, findings: [...findings, { code: 'UI_MANIFEST_INVALID', detail: `${record.snapshot.manifestPath} is not a readable manifest` }], reviewDue: false, reviewDueDate: null, advisoryResult: record.advisoryScan.result, resolved: [] };
  }
  const lockfile = readUiLockfile(input.lockfile);
  if (lockfile === null) {
    return { ok: false, findings: [...findings, { code: 'UI_LOCKFILE_INVALID', detail: `${record.snapshot.lockfilePath} has no readable packages map` }], reviewDue: false, reviewDueDate: null, advisoryResult: record.advisoryScan.result, resolved: [] };
  }

  const declaredNames = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies });
  if (manifest.name !== record.snapshot.packageName || manifest.version !== record.snapshot.packageVersion) {
    findings.push({
      code: 'UI_LOCKFILE_SNAPSHOT_DRIFT',
      detail: `the manifest is ${manifest.name}@${manifest.version} but the recorded snapshot is ${record.snapshot.packageName}@${record.snapshot.packageVersion}`,
    });
  }
  if (lockfile.lockfileVersion !== record.snapshot.lockfileVersion) {
    findings.push({
      code: 'UI_LOCKFILE_LOCKFILE_VERSION_UNSUPPORTED',
      detail: `${record.snapshot.lockfilePath} is lockfileVersion ${lockfile.lockfileVersion} but the recorded snapshot assessed ${record.snapshot.lockfileVersion}`,
    });
  }
  if (lockfile.name !== manifest.name || lockfile.version !== manifest.version) {
    findings.push({
      code: 'UI_LOCKFILE_IDENTITY_MISMATCH',
      detail: `${record.snapshot.lockfilePath} declares ${lockfile.name}@${lockfile.version} but ${record.snapshot.manifestPath} declares ${manifest.name}@${manifest.version}`,
    });
  }
  if (lockfile.packageCount !== record.snapshot.packageCount) {
    findings.push({
      code: 'UI_LOCKFILE_PACKAGE_COUNT_DRIFT',
      detail: `${record.snapshot.lockfilePath} resolves ${lockfile.packageCount} packages but the recorded snapshot assessed ${record.snapshot.packageCount}; the transitive closure changed`,
    });
  }
  if (input.observedLockfileSha256 !== null && input.observedLockfileSha256 !== record.lockfileSha256) {
    findings.push({
      code: 'UI_LOCKFILE_DIGEST_MISMATCH',
      detail: `${record.snapshot.lockfilePath} is ${input.observedLockfileSha256} but the assessment recorded ${record.lockfileSha256}; a resolution change is a reproducibility failure`,
    });
  }

  // Rule 1 — the lockfile's OWN declaration must equal its manifest's.
  for (const [target, manifestMap, lockfileMap] of [
    ['dependencies', manifest.dependencies, lockfile.rootDependencies],
    ['devDependencies', manifest.devDependencies, lockfile.rootDevDependencies],
  ] as const) {
    for (const name of Object.keys(manifestMap)) {
      if (lockfileMap[name] === undefined) {
        findings.push({ code: 'UI_LOCKFILE_DECLARATION_DRIFT', detail: `${name} is declared under ${target} in ${record.snapshot.manifestPath} but absent from the lockfile root package` });
      } else if (lockfileMap[name] !== manifestMap[name]) {
        findings.push({
          code: 'UI_LOCKFILE_DECLARATION_DRIFT',
          detail: `${name} is declared ${manifestMap[name]} in ${record.snapshot.manifestPath} but the lockfile root package declares ${lockfileMap[name]}`,
        });
      }
    }
    for (const name of Object.keys(lockfileMap)) {
      if (manifestMap[name] === undefined) {
        findings.push({ code: 'UI_LOCKFILE_DECLARATION_DRIFT', detail: `${name} is declared under ${target} by the lockfile root package but not by ${record.snapshot.manifestPath}` });
      }
    }
  }

  // Rule 2 — the version pin.
  for (const name of declaredNames) {
    const kind = manifest.dependencies[name] !== undefined ? 'dependency' : 'devDependency';
    const specifier = (manifest.dependencies[name] ?? manifest.devDependencies[name]) ?? '';
    if (!EXACT_PIN_RE.test(specifier)) {
      findings.push({
        code: 'UI_LOCKFILE_UNPINNED_SPECIFIER',
        detail: `${record.snapshot.manifestPath} declares ${name}@${specifier} under ${kind}; the UI lockfile policy is an exact pin, so an unrequested release cannot arrive through a range`,
      });
    }
  }

  // Rule 3 — the transitive closure, read rather than asserted, plus the
  // reachability classification from the tracked UI sources.
  const resolved: UiResolvedPackage[] = [];
  for (const name of declaredNames) {
    const kind = manifest.dependencies[name] !== undefined ? 'dependency' : 'devDependency';
    const specifier = (manifest.dependencies[name] ?? manifest.devDependencies[name]) ?? '';
    const resolvedVersion = lockfile.resolvedVersions[name];
    if (resolvedVersion === undefined) {
      findings.push({
        code: 'UI_LOCKFILE_RESOLUTION_MISSING',
        detail: `${name}@${specifier} is declared by ${record.snapshot.manifestPath} but has no node_modules/${name} entry in ${record.snapshot.lockfilePath}; the transitive assessment cannot read its installed version`,
      });
      continue;
    }
    if (EXACT_PIN_RE.test(specifier) && resolvedVersion !== specifier) {
      findings.push({
        code: 'UI_LOCKFILE_RESOLUTION_MISMATCH',
        detail: `${name} is pinned at ${specifier} but ${record.snapshot.lockfilePath} resolves ${resolvedVersion}; a pinned specifier that resolves to anything else is drift`,
      });
    }
    const importers = input.uiSources.filter((source) => importSites(source.text, name).length > 0);
    const confined = importers.every((source) => TEST_SOURCE_RE.test(source.path) || record.snapshot.toolchainImporters.includes(source.path));
    if (importers.length > 0 && !confined && kind === 'devDependency') {
      findings.push({
        code: 'UI_LOCKFILE_DEV_DEPENDENCY_IN_APPLICATION_SOURCE',
        detail: `devDependency ${name}@${resolvedVersion} is imported by ${importers.filter((source) => !TEST_SOURCE_RE.test(source.path) && !record.snapshot.toolchainImporters.includes(source.path)).map((source) => source.path).join(', ')}, which is neither a test nor a recorded toolchain importer; it is inside the production bundle closure`,
      });
    }
    if (importers.length === 0 && kind === 'dependency') {
      findings.push({
        code: 'UI_LOCKFILE_DEPENDENCY_UNIMPORTED',
        detail: `dependency ${name}@${resolvedVersion} is imported by no tracked UI source; the reachability map that separates the bundle closure from the test closure is stale`,
      });
    }
    resolved.push({ name, specifier, kind, resolvedVersion, importedByTrackedSources: importers.length > 0, confinedToTestAndToolchain: confined });
  }

  // The recorded snapshot must still describe the live lockfile.
  for (const entry of record.snapshot.declared) {
    const live = lockfile.resolvedVersions[entry.name];
    if (live === undefined) {
      findings.push({
        code: 'UI_LOCKFILE_SNAPSHOT_DRIFT',
        detail: `the recorded snapshot declares ${entry.name}@${entry.resolvedVersion} but ${record.snapshot.lockfilePath} no longer resolves it`,
      });
    } else if (live !== entry.resolvedVersion) {
      findings.push({
        code: 'UI_LOCKFILE_SNAPSHOT_DRIFT',
        detail: `the recorded snapshot declares ${entry.name}@${entry.resolvedVersion} but ${record.snapshot.lockfilePath} resolves ${live}`,
      });
    }
    if (manifest.dependencies[entry.name] === undefined && manifest.devDependencies[entry.name] === undefined) {
      findings.push({
        code: 'UI_LOCKFILE_SNAPSHOT_DRIFT',
        detail: `the recorded snapshot declares ${entry.name} but ${record.snapshot.manifestPath} no longer does`,
      });
    }
  }
  const recordedNames = new Set(record.snapshot.declared.map((entry) => entry.name));
  for (const name of declaredNames) {
    if (!recordedNames.has(name)) {
      findings.push({
        code: 'UI_LOCKFILE_SNAPSHOT_DRIFT',
        detail: `${name} is newly declared by ${record.snapshot.manifestPath} and is not in the recorded snapshot; re-run the assessment`,
      });
    }
  }

  // The recorded toolchain importers must exist and must still import a
  // devDependency, or the reachability exception they grant is stale.
  for (const importer of record.snapshot.toolchainImporters) {
    const source = input.uiSources.find((candidate) => candidate.path === importer);
    if (source === undefined) {
      findings.push({
        code: 'UI_LOCKFILE_TOOLCHAIN_IMPORTER_DRIFT',
        detail: `recorded toolchain importer ${importer} is not a tracked UI source; the reachability exception it grants is stale`,
      });
      continue;
    }
    const importsDevDependency = Object.keys(manifest.devDependencies).some((name) => importSites(source.text, name).length > 0);
    if (!importsDevDependency) {
      findings.push({
        code: 'UI_LOCKFILE_TOOLCHAIN_IMPORTER_DRIFT',
        detail: `recorded toolchain importer ${importer} imports no declared devDependency; the exception is unnecessary`,
      });
    }
  }

  findings.push(...advisoryContradictions(record.advisoryScan));
  findings.push(...advisoryHonesty(record.advisoryScan.advisories));

  const dueDate = computeDueDate(record.assessmentDate, record.intervalDays);
  const reviewDue = dueDate !== null && input.today > dueDate;
  if (reviewDue) {
    findings.push({
      code: 'UI_LOCKFILE_ASSESSMENT_STALE',
      detail: `assessed ${record.assessmentDate} + ${record.intervalDays}d = ${dueDate} but today is ${input.today}; re-assess ${record.snapshot.lockfilePath}`,
    });
  }

  return {
    ok: findings.length === 0,
    findings,
    reviewDue,
    reviewDueDate: dueDate,
    advisoryResult: record.advisoryScan.result,
    resolved,
  };
}

/** True when a tracked path is a UI source the reachability scan should read. */
export function isUiSourcePath(relative: string, manifestPath: string, lockfilePath: string): boolean {
  if (relative === manifestPath || relative === lockfilePath) return false;
  return UI_TEXT_EXTENSIONS_RE.test(relative);
}
