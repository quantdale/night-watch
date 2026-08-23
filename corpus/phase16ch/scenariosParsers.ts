// ---------------------------------------------------------------------------
// Phase 16CH corpus — parser matrices: strict inert-handoff document, strict
// plan-manifest document, and the combined runtime-plan document boundary
// (EOL variants, BOM, empty/hostile content).
// ---------------------------------------------------------------------------

import { parseCampaignPlanManifestDocument } from "../../src/core/portfolio/manifest";
import {
  parseDevHandoffPackageDocument,
  parsePortfolioRuntimePlanDocument,
} from "../../src/core/portfolio/runtimeBinding";
import {
  normalizeOutcome,
  pairScope,
  parse,
  OTHER_PF_ID,
  OTHER_PLAN_STYLE_ID,
  type HardeningScenario,
} from "./core";

const RUNTIME_PLAN_DOCUMENT_VERSION = "nightwatch.portfolio-runtime-plan-document.v1";

export function parserHandoffScenarios(): HardeningScenario[] {
  const base = pairScope();
  const rawHandoff = (): Record<string, unknown> => JSON.parse(JSON.stringify(base.handoff));
  const scenarios: HardeningScenario[] = [];
  const add = (id: string, expected: string, mutate: (record: Record<string, unknown>) => void) =>
    scenarios.push({
      id,
      group: "PARSER_HANDOFF",
      expected,
      run: parse(() => {
        const record = rawHandoff();
        mutate(record);
        return parseDevHandoffPackageDocument(record);
      }),
    });

  add("PHO-001-wrong-handoff-version", "DEV_HANDOFF_INVALID:handoffVersion", (r) => { r.handoffVersion = "nightwatch.dev-handoff.v0"; });
  add("PHO-002-executable-marker-not-false-bool", "DEV_HANDOFF_INVALID:not-inert", (r) => { r.executable = true; });
  add("PHO-003-executable-marker-non-boolean", "DEV_HANDOFF_INVALID:not-inert", (r) => { r.executable = 1; });
  add("PHO-004-executable-marker-string-false", "DEV_HANDOFF_INVALID:not-inert", (r) => { r.executable = "false"; });
  add("PHO-005-token-empty-string", "DEV_HANDOFF_INVALID:token-class", (r) => { r.requiredAuthorizationToken = ""; });
  add("PHO-006-token-wrong-class", "DEV_HANDOFF_INVALID:token-class", (r) => { r.requiredAuthorizationToken = "SOME_OTHER_TOKEN_CLASS"; });
  add("PHO-007-environment-production-shaped", "DEV_HANDOFF_INVALID:environment", (r) => { r.environmentRestriction = "PRODUCTION_ALLOWED"; });
  add("PHO-008-environment-trailing-space", "DEV_HANDOFF_INVALID:environment", (r) => { r.environmentRestriction = "DEV_ONLY_NEVER_PRODUCTION "; });
  add("PHO-009-plan-id-bad-format", "DEV_HANDOFF_INVALID:planId", (r) => { r.planId = "plan:sha256:zzzz"; });
  add("PHO-010-plan-manifest-digest-bad-format", "DEV_HANDOFF_INVALID:planManifestDigest", (r) => { r.planManifestDigest = "manifest:sha256:aaaaaaaaaaaaaaaaaaaaaaaa"; });
  add("PHO-011-portfolio-digest-bad-prefix", "DEV_HANDOFF_INVALID:portfolioDigest", (r) => { r.portfolioDigest = "sha256:bbbbbbbbbbbbbbbbbbbbbbbb"; });
  add("PHO-012-digest-bad-format", "DEV_HANDOFF_INVALID:digest", (r) => { r.digest = "handoff:sha256:zz-not-hex"; });
  add("PHO-013-total-units-negative", "DEV_HANDOFF_INVALID:units", (r) => { r.totalAllocatedUnits = -1; });
  add("PHO-014-total-units-fractional", "DEV_HANDOFF_INVALID:units", (r) => { r.totalAllocatedUnits = 1.5; });
  add("PHO-015-total-units-string", "DEV_HANDOFF_INVALID:units", (r) => { r.totalAllocatedUnits = "24"; });
  add("PHO-016-members-duplicate-entry", "DEV_HANDOFF_INVALID:member", (r) => {
    const ids = [...(r.selectedMemberIds as string[])];
    r.selectedMemberIds = [ids[0]!, ...ids];
  });
  add("PHO-017-members-unknown-format-entry", "DEV_HANDOFF_INVALID:member", (r) => {
    const ids = [...(r.selectedMemberIds as string[])];
    r.selectedMemberIds = ["bogus-member-id", ...ids.slice(1)];
  });
  add("PHO-018-members-not-array", "DEV_HANDOFF_INVALID:members", (r) => { r.selectedMemberIds = "journey:x"; });
  add("PHO-019-obligations-reordered", "DEV_HANDOFF_INVALID:obligations", (r) => {
    const obligations = [...(r.runtimeObligations as string[])];
    r.runtimeObligations = [obligations[1]!, obligations[0]!, ...obligations.slice(2)];
  });
  add("PHO-020-obligations-dropped", "DEV_HANDOFF_INVALID:obligations", (r) => {
    r.runtimeObligations = (r.runtimeObligations as string[]).slice(1);
  });
  add("PHO-021-unknown-field-sentinel-valued", "DEV_HANDOFF_UNKNOWN_FIELD:UNKNOWN_FIELD", (r) => { r.TOKEN_SENTINEL = "TOKEN_SENTINEL"; });
  add("PHO-022-tampered-core-stale-digest", "DEV_HANDOFF_INVALID:digestRecomputationMismatch", (r) => {
    r.totalAllocatedUnits = (r.totalAllocatedUnits as number) + 7;
  });
  add("PHO-023-missing-digest-field", "DEV_HANDOFF_UNKNOWN_FIELD:MISSING_FIELD", (r) => { delete r.digest; });
  add("PHO-024-non-record-document", "DEV_HANDOFF_INVALID:OBJECT_REQUIRED", () => undefined);
  scenarios.pop();
  scenarios.push({
    id: "PHO-024-non-record-document",
    group: "PARSER_HANDOFF",
    expected: "DEV_HANDOFF_INVALID:OBJECT_REQUIRED",
    run: parse(() => parseDevHandoffPackageDocument("not-a-record")),
  });
  return scenarios;
}

export function parserPlanScenarios(): HardeningScenario[] {
  const base = pairScope();
  const rawPlan = (): Record<string, unknown> => JSON.parse(JSON.stringify(base.plan));
  const scenarios: HardeningScenario[] = [];
  const add = (id: string, expected: string, mutate: (record: Record<string, unknown>) => void) =>
    scenarios.push({
      id,
      group: "PARSER_PLAN",
      expected,
      run: parse(() => {
        const record = rawPlan();
        mutate(record);
        return parseCampaignPlanManifestDocument(record);
      }),
    });

  add("PPL-001-wrong-manifest-version", "PLAN_MANIFEST_INVALID:manifestVersion", (r) => { r.manifestVersion = "nightwatch.campaign-plan-manifest.v0"; });
  add("PPL-002-wrong-created-basis", "PLAN_MANIFEST_INVALID:createdAtBasis", (r) => { r.createdAtBasis = "WALL_CLOCK"; });
  add("PPL-003-wrong-score-version", "PLAN_MANIFEST_INVALID:scoreVersion", (r) => { r.scoreVersion = "nightwatch.portfolio-priority.v0"; });
  add("PPL-004-wrong-allocation-version", "PLAN_MANIFEST_INVALID:allocationVersion", (r) => { r.allocationVersion = "nightwatch.portfolio-allocation.v0"; });
  add("PPL-005-plan-id-bad-format", "PLAN_MANIFEST_INVALID:planId", (r) => { r.planId = "plan:md5:aaaaaaaaaaaaaaaaaaaaaaaa"; });
  add("PPL-006-portfolio-digest-bad-prefix", "PLAN_MANIFEST_INVALID:portfolioDigest", (r) => { r.portfolioDigest = "hash:bbbbbbbbbbbbbbbbbbbbbbbb"; });
  add("PPL-007-allocation-digest-bad-prefix", "PLAN_MANIFEST_INVALID:allocationDigest", (r) => { r.allocationDigest = "pallocx:bbbbbbbbbbbbbbbbbbbbbbbb"; });
  add("PPL-008-total-units-sum-mismatch", "PLAN_MANIFEST_INVALID:totalAllocatedUnitsMismatch", (r) => { r.totalAllocatedUnits = (r.totalAllocatedUnits as number) + 3; });
  add("PPL-009-member-order-gap", "PLAN_MANIFEST_INVALID:selectedMember.orderNotCanonical", (r) => {
    const members = r.selectedMembers as Record<string, unknown>[];
    if (members.length > 1) (members[1] as { order: number }).order = 5;
    else (members[0] as { order: number }).order = 5;
  });
  add("PPL-010-member-duplicate-id", "PLAN_MANIFEST_INVALID:selectedMember.memberId", (r) => {
    const members = r.selectedMembers as Record<string, unknown>[];
    members.push({ ...JSON.parse(JSON.stringify(members[0])), order: members.length });
  });
  add("PPL-011-member-zero-units", "PLAN_MANIFEST_INVALID:selectedMember.allocatedUnitsPositive", (r) => {
    ((r.selectedMembers as Record<string, unknown>[])[0] as { allocatedUnits: number }).allocatedUnits = 0;
  });
  add("PPL-012-member-negative-retries", "PLAN_MANIFEST_INVALID:selectedMember.maxRetries", (r) => {
    ((r.selectedMembers as Record<string, unknown>[])[0] as { maxRetries: number }).maxRetries = -2;
  });
  add("PPL-013-member-bad-reason-token", "PLAN_MANIFEST_INVALID:selectedMember.reasonToken", (r) => {
    ((r.selectedMembers as Record<string, unknown>[])[0] as { reasons: string[] }).reasons = ["lowercase reason"];
  });
  add("PPL-014-member-bad-depth", "PLAN_MANIFEST_INVALID:selectedMember.expectedSemanticDepth", (r) => {
    ((r.selectedMembers as Record<string, unknown>[])[0] as { expectedSemanticDepth: string }).expectedSemanticDepth = "GALAXY";
  });
  add("PPL-015-member-bad-coverage-class", "PLAN_MANIFEST_INVALID:selectedMember.expectedCoverageClass", (r) => {
    ((r.selectedMembers as Record<string, unknown>[])[0] as { expectedCoverageClass: string }).expectedCoverageClass = "COVERED_TRUST_US";
  });
  add("PPL-016-member-bad-replay-policy", "PLAN_MANIFEST_INVALID:selectedMember.replayPolicy", (r) => {
    ((r.selectedMembers as Record<string, unknown>[])[0] as { replayPolicy: string }).replayPolicy = "ALWAYS_TWICE";
  });
  add("PPL-017-member-bad-minimization-policy", "PLAN_MANIFEST_INVALID:selectedMember.minimizationPolicy", (r) => {
    ((r.selectedMembers as Record<string, unknown>[])[0] as { minimizationPolicy: string }).minimizationPolicy = "AGGRESSIVE";
  });
  add("PPL-018-checkpoint-policy-weakened", "PLAN_MANIFEST_INVALID:checkpointPolicy.resumeRequiresFingerprintMatch", (r) => {
    (r.checkpointPolicy as Record<string, unknown>).resumeRequiresFingerprintMatch = false;
  });
  add("PPL-019-owner-scope-weakened", "PLAN_MANIFEST_INVALID:ownerScopeRequirements", (r) => {
    (r.ownerScopeRequirements as Record<string, unknown>).planningPhaseExecutionAuthority = "RUNTIME_READY";
  });
  add("PPL-020-unselected-not-canonically-sorted", "PLAN_MANIFEST_INVALID:unselectedMembers.notCanonicallySorted", (r) => {
    r.unselectedMembers = [
      { memberId: "pm:sha256:eeeeeeeeeeeeeeeeeeeeeeee", targetId: "ripple.payer-exchange.read", reasonCode: "BUDGET_EXHAUSTED_OR_RESERVE_CONSTRAINT" },
      { memberId: "pm:sha256:dddddddddddddddddddddddd", targetId: "ripple.payer-exchange.read", reasonCode: "BUDGET_EXHAUSTED_OR_RESERVE_CONSTRAINT" },
    ];
  });
  add("PPL-021-unknown-field-sentinel-valued", "PLAN_MANIFEST_UNKNOWN_FIELD:UNKNOWN_FIELD", (r) => { r.CUSTOMER_SENTINEL = "CUSTOMER_SENTINEL"; });
  add("PPL-022-plan-id-recompute-mismatch", "PLAN_MANIFEST_INVALID:planIdRecomputationMismatch", (r) => {
    r.portfolioDigest = OTHER_PF_ID;
  });
  add("PPL-023-manifest-digest-recompute-mismatch", "PLAN_MANIFEST_INVALID:manifestDigestRecomputationMismatch", (r) => {
    r.manifestDigest = OTHER_PLAN_STYLE_ID;
  });
  add("PPL-024-selected-members-not-array", "PLAN_MANIFEST_INVALID:selectedMembers", (r) => { r.selectedMembers = "all"; });
  return scenarios;
}

export function documentBoundaryScenarios(): HardeningScenario[] {
  const base = pairScope();
  const canonicalJson = JSON.stringify({
    documentVersion: RUNTIME_PLAN_DOCUMENT_VERSION,
    handoff: base.handoff,
    planManifest: base.plan,
  });
  const combinedParse = (text: string): (() => unknown) => () =>
    parsePortfolioRuntimePlanDocument(JSON.parse(text) as unknown);

  const scenarios: HardeningScenario[] = [];
  const addText = (id: string, text: string, expected: string) =>
    scenarios.push({ id, group: "DOC_BOUNDARY", expected, run: parse(combinedParse(text)) });

  addText("DOC-001-lf-canonical", `${canonicalJson}\n`, "PARSE_OK");
  addText("DOC-002-crlf-line-endings", `${canonicalJson}\r\n`, "PARSE_OK");
  addText("DOC-003-no-final-newline", canonicalJson, "PARSE_OK");
  addText("DOC-004-extra-final-newlines", `${canonicalJson}\n\n\n`, "PARSE_OK");
  addText("DOC-005-leading-bom", `\uFEFF${canonicalJson}`, "SYNTAX_ERROR");
  addText("DOC-006-empty-document", "", "SYNTAX_ERROR");
  addText("DOC-007-empty-json-object", "{}", "PORTFOLIO_RUNTIME_PLAN_UNKNOWN_FIELD:MISSING_FIELD");
  addText("DOC-008-long-junk-string", "x".repeat(200_000), "SYNTAX_ERROR");

  scenarios.push({
    id: "DOC-009-wrong-document-version",
    group: "DOC_BOUNDARY",
    expected: "PORTFOLIO_RUNTIME_PLAN_INVALID:documentVersion",
    run: parse(() => parsePortfolioRuntimePlanDocument({
      documentVersion: "nightwatch.portfolio-runtime-plan-document.v0",
      handoff: base.handoff,
      planManifest: base.plan,
    })),
  });
  scenarios.push({
    id: "DOC-010-combined-unknown-field",
    group: "DOC_BOUNDARY",
    expected: "PORTFOLIO_RUNTIME_PLAN_UNKNOWN_FIELD:UNKNOWN_FIELD",
    run: parse(() => parsePortfolioRuntimePlanDocument({
      documentVersion: RUNTIME_PLAN_DOCUMENT_VERSION,
      handoff: base.handoff,
      planManifest: base.plan,
      ACCOUNT_SENTINEL: "ACCOUNT_SENTINEL",
    })),
  });
  scenarios.push({
    id: "DOC-011-hostile-sentinel-in-handoff",
    group: "DOC_BOUNDARY",
    expected: "SENTINEL_REJECTED_CATEGORICALLY",
    run: () => {
      try {
        parsePortfolioRuntimePlanDocument({
          documentVersion: RUNTIME_PLAN_DOCUMENT_VERSION,
          handoff: { ...(base.handoff as unknown as Record<string, unknown>), EMAIL_SENTINEL: "EMAIL_SENTINEL" },
          planManifest: base.plan,
        });
        return "PARSED_HOSTILE_DOCUMENT";
      } catch (error) {
        const observed = normalizeOutcome(error);
        return observed.includes("SENTINEL") ? "SENTINEL_LEAKED" : "SENTINEL_REJECTED_CATEGORICALLY";
      }
    },
  });
  scenarios.push({
    id: "DOC-012-hostile-nested-plan-manifest",
    group: "DOC_BOUNDARY",
    expected: "SENTINEL_REJECTED_CATEGORICALLY",
    run: () => {
      try {
        parsePortfolioRuntimePlanDocument({
          documentVersion: RUNTIME_PLAN_DOCUMENT_VERSION,
          handoff: base.handoff,
          planManifest: { ...(base.plan as unknown as Record<string, unknown>), COST_SENTINEL: "COST_SENTINEL" },
        });
        return "PARSED_HOSTILE_DOCUMENT";
      } catch (error) {
        const observed = normalizeOutcome(error);
        return observed.includes("SENTINEL") ? "SENTINEL_LEAKED" : "SENTINEL_REJECTED_CATEGORICALLY";
      }
    },
  });
  return scenarios;
}
