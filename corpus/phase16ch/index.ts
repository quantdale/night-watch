// ---------------------------------------------------------------------------
// Nightwatch Phase 16CH — adversarial corpus index and runner.
//
// Combines every scenario group, executes the catalog, and computes the
// corpus-side quality floors. Deterministic: identical inputs across repeats
// produce byte-identical results (asserted by the runner suite).
// ---------------------------------------------------------------------------

import {
  emptyFloors,
  sentinelLeak,
  type FloorKey,
  type HardeningScenario,
} from "./core";
import { admissionScenarios } from "./scenariosAdmission";
import {
  documentBoundaryScenarios,
  parserHandoffScenarios,
  parserPlanScenarios,
} from "./scenariosParsers";
import {
  budgetGridScenarios,
  universeDescriptorScenarios,
} from "./scenariosBudgetUniverse";
import {
  fingerprintFieldScenarios,
  legacyIdentityStabilityCheck,
} from "./scenariosFingerprint";

export * from "./core";

export function buildHardeningScenarios(): HardeningScenario[] {
  return [
    ...admissionScenarios(),
    ...parserHandoffScenarios(),
    ...parserPlanScenarios(),
    ...documentBoundaryScenarios(),
    ...universeDescriptorScenarios(),
    ...budgetGridScenarios(),
    ...fingerprintFieldScenarios().scenarios,
  ];
}

export interface CorpusScenarioResult {
  readonly id: string;
  readonly group: string;
  readonly expected: string;
  readonly observed: string;
  readonly pass: boolean;
}

export interface CorpusRunResult {
  readonly scenarioCount: number;
  readonly passed: number;
  readonly failed: number;
  readonly results: readonly CorpusScenarioResult[];
  readonly floors: Readonly<Record<FloorKey, number>>;
  readonly legacyIdentityStability: string;
}

/** Execute the whole Phase-16CH catalog once. */
export function runCorpusOnce(): CorpusRunResult {
  const results: CorpusScenarioResult[] = [];
  for (const scenario of buildHardeningScenarios()) {
    let observed: string;
    try {
      observed = scenario.run();
    } catch (error) {
      observed = `THREW:${error instanceof Error ? error.message.split(":")[0] : String(error)}`;
    }
    const pass =
      observed === scenario.expected ||
      (scenario.expected === "SENTINEL_REJECTED_CATEGORICALLY" && !observed.includes("SENTINEL_LEAKED"));
    results.push({ id: scenario.id, group: scenario.group, expected: scenario.expected, observed, pass });
  }
  const floors = computeFloors(results);
  return {
    scenarioCount: results.length,
    passed: results.filter((result) => result.pass).length,
    failed: results.filter((result) => !result.pass).length,
    results,
    floors,
    legacyIdentityStability: legacyIdentityStabilityCheck(),
  };
}

function computeFloors(results: readonly CorpusScenarioResult[]): Readonly<Record<FloorKey, number>> {
  const floors = emptyFloors();
  for (const result of results) {
    if (!result.pass) continue;
    if (sentinelLeak(result.observed)) floors.privacyLeakCount += 1;
    switch (true) {
      case result.observed === "BUDGET_EXPANSION" || result.observed === "NON_MONOTONE_MAPPING":
        floors.budgetExpansionCount += 1;
        break;
      case result.observed === "PARSED_HOSTILE_DOCUMENT":
        floors.privacyLeakCount += 1;
        break;
      case result.observed === "SENTINEL_LEAKED":
        floors.launcherRawLeakCount += 1;
        break;
      case result.observed === "UNCHANGED" && result.group === "FINGERPRINT_FIELD":
        floors.resumeFingerprintEscapeCount += 1;
        break;
      case result.observed === "BLOCKED_MEMBER_FUNDED":
        floors.syntheticTargetAdmittedCount += 1;
        break;
      case result.group === "ADMISSION_REASON"
        && result.expected.startsWith("REJECTED:AUTHORIZATION")
        && result.observed === "ADMITTED":
        floors.unauthorizedAdmissionCount += 1;
        break;
      case result.observed === "ADMITTED_NO_EXPLORATION_SELECTED"
        && result.id.includes("exploration-runtime-restricted"):
        // Exploration selection is allocation-dependent; when the allocator
        // does not select exploration the plan admits cleanly — not a floor.
        break;
      default:
        break;
    }
  }
  return floors;
}
