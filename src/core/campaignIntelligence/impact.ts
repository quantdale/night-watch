// Phase 19 — behavior-level source impact bridge.
//
// The existing change-intelligence selector remains the source of journey
// selection evidence. This module projects that evidence, changed paths, and
// already-admitted semantic bindings into contract/scenario consequences. It
// intentionally does not read a repository or derive an execution target.

import type { ChangedFile, SelectionResult } from "../changeIntelligence";
import {
  CAMPAIGN_SOURCE_CURRENTNESS,
  type CampaignImpactBinding,
  type CampaignImpactClass,
  type CampaignImpactReason,
  type CampaignImpactReport,
  type CampaignImpactRow,
  type CampaignReasonCode,
  type CampaignSourceCurrentness,
  safeCampaignDigest,
} from "./types";

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/;
const SAFE_PATH_RE = /^[A-Za-z0-9_./:@+\-]{1,240}$/;
const SAFE_DIGEST_RE = /^(?:[0-9a-f]{64}|(?:cs|sha256|ev|sc|sci|fp):[A-Za-z0-9:_-]{8,})$/;

function invalid(reason: string): never {
  throw new Error(`CAMPAIGN_IMPACT_INVALID:${reason}`);
}

function safeId(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !SAFE_ID_RE.test(value)) invalid(`${field}_ID`);
  if (/(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(value)) invalid(`${field}_PRIVACY`);
}

function safePath(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !SAFE_PATH_RE.test(value)) invalid(`${field}_PATH`);
  if (/(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(value)) {
    invalid(`${field}_PRIVACY`);
  }
}

function safeArray(values: readonly string[], field: string): readonly string[] {
  if (!Array.isArray(values) || values.length > 128) invalid(`${field}_ARRAY`);
  const normalized = values.map((value) => {
    safeId(value, field);
    return value;
  });
  return [...new Set(normalized)].sort((left, right) => left.localeCompare(right));
}

function currentness(value: unknown, field: string): CampaignSourceCurrentness {
  if (!CAMPAIGN_SOURCE_CURRENTNESS.includes(value as CampaignSourceCurrentness)) {
    invalid(`${field}_CURRENTNESS`);
  }
  return value as CampaignSourceCurrentness;
}

function pathClass(path: string): string {
  const normalized = path.toLowerCase();
  if (/(?:router|route|routing|navigation)/.test(normalized)) return "ROUTE";
  if (/(?:request|client|api|transport|query|payload)/.test(normalized)) return "REQUEST_SHAPE";
  if (/(?:response|serializer|schema|dto|handler|controller)/.test(normalized)) return "RESPONSE_SHAPE";
  if (/(?:oracle|expectation|semantic|invariant)/.test(normalized)) return "ORACLE_BINDING";
  return "SOURCE_COMPONENT";
}

function matchesPath(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function impactReasonForClass(value: CampaignImpactClass): CampaignReasonCode | null {
  switch (value) {
    case "CHANGED_CONTRACT": return "CHANGED_CONTRACT";
    case "CHANGED_ROUTE": return "CHANGED_ROUTE";
    case "CHANGED_REQUEST_SHAPE": return "CHANGED_REQUEST_SHAPE";
    case "CHANGED_RESPONSE_SHAPE": return "CHANGED_RESPONSE_SHAPE";
    case "CHANGED_ORACLE_BINDING": return "CHANGED_ORACLE_BINDING";
    case "CHANGED_SOURCE_ADJACENCY": return "CHANGED_SOURCE_ADJACENCY";
    default: return null;
  }
}

function validateBinding(binding: CampaignImpactBinding): void {
  safeId(binding.memberId, "MEMBER");
  safeId(binding.product, "PRODUCT");
  safeId(binding.surface, "SURFACE");
  safeId(binding.journeyClass, "JOURNEY");
  safeId(binding.semanticContractId, "CONTRACT");
  safeArray(binding.expectationIds, "EXPECTATION");
  safeArray(binding.scenarioIds, "SCENARIO");
  if (binding.affectedPathPrefixes.length === 0 || binding.affectedPathPrefixes.length > 32) invalid("PREFIX_COUNT");
  for (const prefix of binding.affectedPathPrefixes) safePath(prefix, "PREFIX");
  if (binding.sourceSha !== null) safeId(binding.sourceSha, "SOURCE_SHA");
  if (binding.evidenceDigest !== null && !SAFE_DIGEST_RE.test(binding.evidenceDigest)) invalid("EVIDENCE_DIGEST");
  currentness(binding.sourceCurrentness, "BINDING");
  if (typeof binding.supported !== "boolean") invalid("SUPPORTED");
  if (!Array.isArray(binding.impactClasses) || binding.impactClasses.length > 16) invalid("IMPACT_CLASSES");
  for (const impactClass of binding.impactClasses) if (impactReasonForClass(impactClass) === null && impactClass !== "COVERAGE_ONLY" && impactClass !== "UNKNOWN") invalid("IMPACT_CLASS");
}

function validateChangedFiles(files: readonly Pick<ChangedFile, "repoId" | "path" | "status">[]): void {
  if (!Array.isArray(files) || files.length > 512) invalid("CHANGED_FILE_COUNT");
  for (const file of files) {
    safeId(file.repoId, "REPO");
    safePath(file.path, "CHANGED");
    if (!["add", "modify", "delete", "rename"].includes(file.status)) invalid("CHANGED_STATUS");
  }
}

function selectionFacts(selection: Pick<SelectionResult, "selectedJourneys" | "impactReasons" | "deterministicDigest"> | null): {
  readonly selectedJourneys: ReadonlySet<string>;
  readonly selectedReasonJourneys: ReadonlySet<string>;
  readonly digest: string | null;
} {
  if (selection === null) return { selectedJourneys: new Set(), selectedReasonJourneys: new Set(), digest: null };
  if (!SAFE_DIGEST_RE.test(selection.deterministicDigest)) invalid("SELECTION_DIGEST");
  return {
    selectedJourneys: new Set(selection.selectedJourneys.map((entry) => entry.journeyId)),
    selectedReasonJourneys: new Set(selection.impactReasons.map((entry) => entry.journeyId)),
    digest: selection.deterministicDigest,
  };
}

/** Build a deterministic behavior-level impact report from sanitized inputs. */
export function buildCampaignImpactReport(input: {
  readonly sourceCurrentness: CampaignSourceCurrentness;
  readonly changedFiles: readonly Pick<ChangedFile, "repoId" | "path" | "status">[];
  readonly bindings: readonly CampaignImpactBinding[];
  readonly knownExpectationIds?: readonly string[];
  readonly selection?: Pick<SelectionResult, "selectedJourneys" | "impactReasons" | "deterministicDigest"> | null;
}): CampaignImpactReport {
  currentness(input.sourceCurrentness, "SOURCE");
  validateChangedFiles(input.changedFiles);
  if (!Array.isArray(input.bindings) || input.bindings.length > 512) invalid("BINDING_COUNT");
  const bindingIds = new Set<string>();
  for (const binding of input.bindings) {
    validateBinding(binding);
    if (bindingIds.has(binding.memberId)) invalid("DUPLICATE_MEMBER");
    bindingIds.add(binding.memberId);
  }
  const knownExpectations = safeArray(input.knownExpectationIds ?? [], "KNOWN_EXPECTATION");
  const facts = selectionFacts(input.selection ?? null);
  const changedPathClasses = [...new Set(input.changedFiles.map((file) => pathClass(file.path)))].sort();
  const rows: CampaignImpactRow[] = [];
  const boundExpectations = new Set<string>();

  for (const binding of [...input.bindings].sort((left, right) => left.memberId.localeCompare(right.memberId))) {
    const localChanged = input.changedFiles.filter((file) => matchesPath(file.path, binding.affectedPathPrefixes));
    const sourceInvalid = input.sourceCurrentness !== "CURRENT" && input.sourceCurrentness !== "SYNTHETIC_ONLY";
    const bindingInvalid = binding.sourceCurrentness !== "CURRENT" && binding.sourceCurrentness !== "SYNTHETIC_ONLY";
    const selectedByChange = facts.selectedJourneys.has(binding.journeyClass) || facts.selectedReasonJourneys.has(binding.journeyClass);
    const affected = localChanged.length > 0 || sourceInvalid || bindingInvalid || selectedByChange;
    const reasons: CampaignImpactReason[] = [];
    const classes = new Set<CampaignImpactClass>();
    for (const file of localChanged) {
      classes.add("CHANGED_SOURCE_ADJACENCY");
      reasons.push({ code: "CHANGED_SOURCE_ADJACENCY", impactClass: "CHANGED_SOURCE_ADJACENCY", memberId: binding.memberId, contractId: binding.semanticContractId, safePathClass: pathClass(file.path) });
      for (const declared of binding.impactClasses) {
        const reasonCode = impactReasonForClass(declared);
        if (reasonCode !== null) {
          classes.add(declared);
          reasons.push({ code: reasonCode, impactClass: declared, memberId: binding.memberId, contractId: binding.semanticContractId, safePathClass: pathClass(file.path) });
        }
      }
    }
    if (selectedByChange) {
      classes.add("SELECTED_BY_CHANGE_INTELLIGENCE");
      reasons.push({ code: "CHANGED_SOURCE_ADJACENCY", impactClass: "SELECTED_BY_CHANGE_INTELLIGENCE", memberId: binding.memberId, contractId: binding.semanticContractId, safePathClass: "CHANGE_INTELLIGENCE_SELECTION" });
    }
    if (sourceInvalid || bindingInvalid) {
      reasons.push({ code: input.sourceCurrentness === "STALE" || binding.sourceCurrentness === "STALE" ? "STALE_SEMANTIC_AUTHORITY" : "SOURCE_UNAVAILABLE", impactClass: "UNKNOWN", memberId: binding.memberId, contractId: binding.semanticContractId, safePathClass: "SOURCE_CURRENTNESS" });
      classes.add("UNKNOWN");
    }
    for (const expectationId of binding.expectationIds) boundExpectations.add(expectationId);
    const requiresRederivation = affected && (classes.has("CHANGED_CONTRACT") || classes.has("CHANGED_ORACLE_BINDING") || sourceInvalid || bindingInvalid);
    const invalidated = affected && (sourceInvalid || bindingInvalid);
    rows.push({
      memberId: binding.memberId,
      product: binding.product,
      surface: binding.surface,
      semanticContractId: binding.semanticContractId,
      affected,
      currentness: input.sourceCurrentness === "CURRENT" ? binding.sourceCurrentness : input.sourceCurrentness,
      impactClasses: [...classes].sort(),
      expectationIds: safeArray(binding.expectationIds, "EXPECTATION"),
      scenarioIds: safeArray(binding.scenarioIds, "SCENARIO"),
      reasons: [...new Map(reasons.map((reason) => [`${reason.code}:${reason.safePathClass}`, reason])).values()].sort((left, right) => `${left.code}:${left.safePathClass}`.localeCompare(`${right.code}:${right.safePathClass}`)),
      requiresRederivation,
      invalidated,
    });
  }

  const affectedRows = rows.filter((row) => row.affected);
  const affectedContractIds = affectedRows.map((row) => row.semanticContractId).sort();
  const affectedExpectationIds = [...new Set(affectedRows.flatMap((row) => row.expectationIds))].sort();
  const affectedScenarioIds = [...new Set(affectedRows.flatMap((row) => row.scenarioIds))].sort();
  const orphanedExpectationIds = knownExpectations.filter((id) => !boundExpectations.has(id));
  const invalidatedContractIds = rows.filter((row) => row.invalidated).map((row) => row.semanticContractId).sort();
  const requiresRederivationContractIds = rows.filter((row) => row.requiresRederivation).map((row) => row.semanticContractId).sort();
  const newlyUncoveredSurfaceIds = rows.filter((row) => row.affected && (row.expectationIds.length === 0 || row.invalidated)).map((row) => `${row.product}:${row.surface}`).sort();
  const core = {
    schemaVersion: "nightwatch.campaign-impact-report.v1" as const,
    sourceCurrentness: input.sourceCurrentness,
    changedPathClasses,
    rows,
    affectedContractIds: [...new Set(affectedContractIds)],
    affectedExpectationIds,
    affectedScenarioIds,
    orphanedExpectationIds,
    invalidatedContractIds: [...new Set(invalidatedContractIds)],
    requiresRederivationContractIds: [...new Set(requiresRederivationContractIds)],
    newlyUncoveredSurfaceIds: [...new Set(newlyUncoveredSurfaceIds)],
    selectionDigest: facts.digest,
  };
  return { ...core, deterministicDigest: safeCampaignDigest(core, "cimpact") };
}
