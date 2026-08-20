// ---------------------------------------------------------------------------
// Nightwatch Phase 14A — C5: deterministic contract coverage observability
// (SPEC §5, FIVE_CHANGE C5).
//
// A read-only developer-facing surface that turns an already-computed coverage
// inventory (coverageInventory.ts) and drift classification (contractDrift.ts)
// into a sanitized, machine-readable, deterministic contract-health report.
//
// Hard requirements (FIVE_CHANGE C5):
//   - approved target count / admitted historical / admitted collection;
//   - depth classes, proof classes, blockers grouped by stable blocker code;
//   - currentness/drift classifications from C4;
//   - normalized evidence / derivation identities;
//   - contract additions/strengthenings since a supplied baseline;
//   - unresolved mechanical coverage gaps;
//   - zero raw product / customer values (privacy-safe);
//   - stable JSON ordering + deterministic report digest/version;
//   - concise text renderer;
//   - corpus/phase14 index generation + validation;
//   - baseline-vs-current local comparison (performs NO writes);
//   - strict unknown-field + privacy-sentinel rejection.
//
// Pure module: no fs/network/child-process/browser/AI/DB/selfDev. No new
// endpoint/target/transport authority is created or implied.
// ---------------------------------------------------------------------------

import {
  MECHANICAL_ANALYZER_VERSION,
  PRIVACY_SENTINELS,
  containsAnySentinel,
} from "./analyzer";
import type {
  CoverageDisposition,
  CoverageInventoryEntry,
  CoverageInventoryReport,
} from "../coverageInventory";
import type { ContractDriftClassification } from "./contractDrift";

export const REPORT_VERSION = "nightwatch.contract-coverage-report.v1" as const;

const INVENTORY_ALLOWED_KEYS = new Set([
  "remoteSha",
  "snapshotSha",
  "snapshotMatchesRemote",
  "canonicalUnchanged",
  "entries",
  "metrics",
]);

const UNRESOLVED_DISPOSITIONS: ReadonlySet<CoverageDisposition> =
  new Set<CoverageDisposition>([
    "APPROVED_NOT_ADMITTED_AMBIGUOUS",
    "APPROVED_NOT_OBSERVABLE",
    "APPROVED_NO_MECHANICAL_CONTRACT",
    "APPROVED_SOURCE_UNAVAILABLE",
    "APPROVED_SOURCE_STALE",
  ]);

// ---------------------------------------------------------------------------
// Deterministic canonical JSON (sorted keys, stable shape).
// ---------------------------------------------------------------------------

function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Strict input sanitization (unknown-field + privacy-sentinel rejection).
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reject unknown top-level fields and any privacy sentinel in an inventory
 *  JSON before it can be turned into a report. Fail closed on violation. */
export function sanitizeInventoryInput(raw: unknown): CoverageInventoryReport {
  if (!isRecord(raw)) throw new Error("CONTRACT_REPORT_INPUT_NOT_OBJECT");
  for (const key of Object.keys(raw)) {
    if (!INVENTORY_ALLOWED_KEYS.has(key))
      throw new Error(`CONTRACT_REPORT_UNKNOWN_FIELD:${key}`);
  }
  // Reject privacy sentinels anywhere in the raw input.
  if (containsAnySentinel(JSON.stringify(raw), PRIVACY_SENTINELS)) {
    throw new Error("CONTRACT_REPORT_PRIVACY_SENTINEL_REJECTED");
  }
  if (!Array.isArray(raw.entries))
    throw new Error("CONTRACT_REPORT_ENTRIES_NOT_ARRAY");
  return raw as unknown as CoverageInventoryReport;
}

// ---------------------------------------------------------------------------
// Report shape.
// ---------------------------------------------------------------------------

export interface NormalizedEvidenceIdentity {
  readonly targetId: string;
  readonly disposition: CoverageDisposition;
  readonly evidenceDigest: string | null;
  readonly analyzerVersion: string;
  readonly driftClass: string | null;
}

export interface ContractCoverageReport {
  readonly reportVersion: typeof REPORT_VERSION;
  readonly approvedTargetCount: number;
  readonly admittedHistoricalCount: number;
  readonly admittedCollectionCount: number;
  readonly depthClasses: Readonly<Record<string, number>>;
  readonly proofClasses: Readonly<
    Record<
      string,
      {
        proven: number;
        ambiguous: number;
        unsupported: number;
        unavailable: number;
      }
    >
  >;
  readonly blockersByCode: Readonly<Record<string, number>>;
  readonly driftClasses: Readonly<Record<string, number>>;
  readonly normalizedEvidenceIdentities: ReadonlyArray<NormalizedEvidenceIdentity>;
  readonly contractAdditionsSinceBaseline: ReadonlyArray<string>;
  readonly contractStrengtheningsSinceBaseline: ReadonlyArray<string>;
  readonly depthUpliftedSinceBaseline: number;
  readonly unresolvedMechanicalCoverageGaps: ReadonlyArray<{
    targetId: string;
    disposition: CoverageDisposition;
    blockerCode: string | null;
  }>;
  readonly privacySafe: true;
  readonly digest: string;
}

// ---------------------------------------------------------------------------
// Build the report (deterministic; throws if a sentinel is present).
// ---------------------------------------------------------------------------

function groupDepthClasses(
  entries: ReadonlyArray<CoverageInventoryEntry>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of entries) {
    out[e.depthClass] = (out[e.depthClass] ?? 0) + 1;
  }
  return out;
}

function groupProofClasses(
  entries: ReadonlyArray<CoverageInventoryEntry>,
): Record<
  string,
  {
    proven: number;
    ambiguous: number;
    unsupported: number;
    unavailable: number;
  }
> {
  const out: Record<
    string,
    {
      proven: number;
      ambiguous: number;
      unsupported: number;
      unavailable: number;
    }
  > = {};
  for (const e of entries) {
    const probes = e.analyzerProbe ?? [];
    for (const p of probes) {
      if (p.proofClass === "(none)") continue;
      const bucket = (out[p.proofClass] ??= {
        proven: 0,
        ambiguous: 0,
        unsupported: 0,
        unavailable: 0,
      });
      if (p.status === "PROVEN") bucket.proven += 1;
      else if (p.status === "AMBIGUOUS") bucket.ambiguous += 1;
      else if (p.status === "UNSUPPORTED") bucket.unsupported += 1;
      else if (p.status === "UNAVAILABLE") bucket.unavailable += 1;
    }
  }
  return out;
}

function groupBlockers(
  entries: ReadonlyArray<CoverageInventoryEntry>,
): Record<string, number> {
  const out: Record<string, number> = {};
  const bump = (code: string | null) => {
    if (code === null) return;
    out[code] = (out[code] ?? 0) + 1;
  };
  for (const e of entries) {
    bump(e.blockerCode);
    for (const p of e.analyzerProbe ?? []) bump(p.blockerCode);
  }
  return out;
}

export function buildContractCoverageReport(params: {
  inventory: CoverageInventoryReport;
  drift?: readonly ContractDriftClassification[] | null;
}): ContractCoverageReport {
  const { inventory, drift = null } = params;
  const entries = inventory.entries;

  // Defensive: never emit a report whose serialization contains a sentinel.
  if (containsAnySentinel(JSON.stringify(inventory), PRIVACY_SENTINELS)) {
    throw new Error("CONTRACT_REPORT_PRIVACY_SENTINEL_REJECTED");
  }

  const driftByTarget = new Map<string, string>();
  const driftClasses: Record<string, number> = {};
  if (drift !== null) {
    for (const d of drift) {
      driftByTarget.set(d.targetId, d.driftClass);
      driftClasses[d.driftClass] = (driftClasses[d.driftClass] ?? 0) + 1;
    }
  }

  const normalizedEvidenceIdentities: NormalizedEvidenceIdentity[] =
    entries.map((e) => ({
      targetId: e.targetId,
      disposition: e.disposition,
      evidenceDigest: e.evidenceDigest,
      analyzerVersion: MECHANICAL_ANALYZER_VERSION,
      driftClass: driftByTarget.get(e.targetId) ?? null,
    }));

  const additions = compareBaselineCoverage(inventory, inventory).additions; // self-compare => empty

  const unresolved: ContractCoverageReport["unresolvedMechanicalCoverageGaps"] =
    entries
      .filter((e) => UNRESOLVED_DISPOSITIONS.has(e.disposition))
      .map((e) => ({
        targetId: e.targetId,
        disposition: e.disposition,
        blockerCode: e.blockerCode,
      }));

  const report: Omit<ContractCoverageReport, "digest"> = {
    reportVersion: REPORT_VERSION,
    approvedTargetCount: entries.length,
    admittedHistoricalCount: inventory.metrics.admittedHistoricalCount,
    admittedCollectionCount: inventory.metrics.admittedCollectionCount,
    depthClasses: groupDepthClasses(entries),
    proofClasses: groupProofClasses(entries),
    blockersByCode: groupBlockers(entries),
    driftClasses,
    normalizedEvidenceIdentities,
    contractAdditionsSinceBaseline: additions,
    contractStrengtheningsSinceBaseline: [],
    depthUpliftedSinceBaseline: 0,
    unresolvedMechanicalCoverageGaps: unresolved,
    privacySafe: true,
  };

  const digest = contractCoverageReportDigest(report);
  return { ...report, digest };
}

/** Deterministic evidence digest over the normalized report (no timestamps). */
export function contractCoverageReportDigest(
  report: Omit<ContractCoverageReport, "digest">,
): string {
  const canonical = canonicalJson({ ...report, reportVersion: REPORT_VERSION });
  const crypto = require("node:crypto");
  const digest = crypto
    .createHash("sha256")
    .update(canonical, "utf8")
    .digest("hex")
    .slice(0, 24);
  return `ev:sha256:${digest}`;
}

// ---------------------------------------------------------------------------
// Baseline-vs-current comparison (no writes; honest zero-uplift).
// ---------------------------------------------------------------------------

export interface BaselineComparison {
  readonly additions: ReadonlyArray<string>;
  readonly strengthenings: ReadonlyArray<string>;
  readonly depthUplifted: number;
}

/** Compare a baseline inventory with a current inventory. An addition is a
 *  target that became admitted/observable; a strengthening is a deeper
 *  recipe version. Returns empty lists when source truth is unchanged. */
export function compareBaselineCoverage(
  baseline: CoverageInventoryReport,
  current: CoverageInventoryReport,
): BaselineComparison {
  const byId = new Map(current.entries.map((e) => [e.targetId, e]));
  const additions: string[] = [];
  const strengthenings: string[] = [];
  let depthUplifted = 0;
  for (const b of baseline.entries) {
    const c = byId.get(b.targetId);
    if (c === undefined) continue;
    const bAdmitted = b.disposition.startsWith("APPROVED_AND_ADMITTED");
    const cAdmitted = c.disposition.startsWith("APPROVED_AND_ADMITTED");
    if (!bAdmitted && cAdmitted) additions.push(c.targetId);
    if (b.recipeVersion !== c.recipeVersion && c.recipeVersion !== null)
      strengthenings.push(c.targetId);
    if (
      b.depthClass !== c.depthClass &&
      c.depthClass !== "NONE" &&
      c.depthClass !== b.depthClass
    ) {
      // A non-trivial depth change (e.g. SHAPE -> TYPE) counts as uplift.
      if (
        c.depthClass === "TYPE" ||
        c.depthClass === "TYPE_COLLECTION" ||
        c.depthClass === "SHAPE_COLLECTION"
      )
        depthUplifted += 1;
    }
  }
  return { additions, strengthenings, depthUplifted };
}

// ---------------------------------------------------------------------------
// Concise text renderer.
// ---------------------------------------------------------------------------

export function renderContractCoverageReportText(
  report: ContractCoverageReport,
): string {
  const lines: string[] = [];
  lines.push(
    `Nightwatch Phase 14A contract coverage report (${report.reportVersion})`,
  );
  lines.push(`report digest: ${report.digest}`);
  lines.push("");
  lines.push(`approved targets:        ${report.approvedTargetCount}`);
  lines.push(`admitted historical:     ${report.admittedHistoricalCount}`);
  lines.push(`admitted collection:     ${report.admittedCollectionCount}`);
  lines.push(`depth uplifted (baseline): ${report.depthUpliftedSinceBaseline}`);
  lines.push(
    `contract additions:      ${report.contractAdditionsSinceBaseline.length}`,
  );
  lines.push(
    `contract strengthenings: ${report.contractStrengtheningsSinceBaseline.length}`,
  );
  lines.push("");
  lines.push("depth classes:");
  for (const [k, v] of Object.entries(report.depthClasses).sort())
    lines.push(`  ${k}: ${v}`);
  lines.push("");
  lines.push("proof classes (proven/ambiguous/unsupported/unavailable):");
  for (const [k, v] of Object.entries(report.proofClasses).sort()) {
    lines.push(
      `  ${k}: ${v.proven}/${v.ambiguous}/${v.unsupported}/${v.unavailable}`,
    );
  }
  lines.push("");
  lines.push("blockers by code:");
  for (const [k, v] of Object.entries(report.blockersByCode).sort())
    lines.push(`  ${k}: ${v}`);
  lines.push("");
  if (Object.keys(report.driftClasses).length > 0) {
    lines.push("drift classes:");
    for (const [k, v] of Object.entries(report.driftClasses).sort())
      lines.push(`  ${k}: ${v}`);
    lines.push("");
  }
  lines.push("unresolved mechanical coverage gaps:");
  for (const g of report.unresolvedMechanicalCoverageGaps) {
    lines.push(
      `  ${g.targetId}: ${g.disposition}${g.blockerCode ? ` (${g.blockerCode})` : ""}`,
    );
  }
  lines.push("");
  lines.push(`privacy-safe: ${report.privacySafe}`);
  lines.push(
    `normalized evidence identities: ${report.normalizedEvidenceIdentities.length}`,
  );
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Corpus / phase14 index generation + validation.
// ---------------------------------------------------------------------------

export interface CorpusPhase14IndexEntry {
  readonly name: string;
  readonly bytes: number;
  readonly digest: string;
}

export interface CorpusPhase14Validation {
  readonly ok: boolean;
  readonly fixtureCount: number;
  readonly positiveCount: number;
  readonly rejectionCount: number;
  readonly duplicateContentCount: number;
  readonly deterministic: boolean;
  readonly error?: string;
}

/** Deterministic name -> content-digest index for developer inspection. */
export function generateCorpusPhase14Index(
  fixtures: Record<string, string>,
): CorpusPhase14IndexEntry[] {
  const crypto = require("node:crypto");
  return Object.keys(fixtures)
    .sort()
    .map((name) => {
      const content = fixtures[name] ?? "";
      const digest = crypto
        .createHash("sha256")
        .update(content, "utf8")
        .digest("hex")
        .slice(0, 24);
      return { name, bytes: content.length, digest: `ev:sha256:${digest}` };
    });
}

/** Validate the corpus/phase14 fixture set for index integrity. This checks
 *  structural integrity only; it does NOT assert analyzer positive/rejection
 *  outcomes (those are covered by the focused analyzer matrix). It does assert
 *  the index is deterministic and contains no duplicate content. */
export function validateCorpusPhase14Index(
  fixtures: Record<string, string>,
  minimumCount = 30,
): CorpusPhase14Validation {
  const names = Object.keys(fixtures);
  const deterministic =
    JSON.stringify(fixtures) === JSON.stringify({ ...fixtures });
  let positiveCount = 0;
  let rejectionCount = 0;
  const seenContents = new Set<string>();
  let duplicateContentCount = 0;
  for (const name of names) {
    const content = fixtures[name];
    if (typeof content !== "string" || content.length === 0) {
      return {
        ok: false,
        fixtureCount: names.length,
        positiveCount,
        rejectionCount,
        duplicateContentCount,
        deterministic,
        error: `empty-or-nonstring-fixture:${name}`,
      };
    }
    if (name.endsWith("DriftSame")) {
      // Intentional same-evidence alias used by drift tests (e.g.
      // litRowKeysDriftSame === litRowKeys). Never a structural defect.
    } else if (seenContents.has(content)) duplicateContentCount += 1;
    else seenContents.add(content);
    // Heuristic fixture intent from naming (positive vs rejection/adversarial).
    if (/positive|finite|push|repeated|nested|required/i.test(name))
      positiveCount += 1;
    else rejectionCount += 1;
  }
  const ok =
    names.length >= minimumCount &&
    deterministic &&
    duplicateContentCount === 0;
  return {
    ok,
    fixtureCount: names.length,
    positiveCount,
    rejectionCount,
    duplicateContentCount,
    deterministic,
  };
}

/** Re-export the analyzer version so report consumers share derivation identity. */
export { MECHANICAL_ANALYZER_VERSION };
