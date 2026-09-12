// C-09 — scenario classification, with totality.
//
// §42's requirement is that no scenario is silently dropped. The mechanism is
// the R-12 pattern: the classifier MAPS over the discovered set, so a scenario
// cannot be omitted, and a count assertion proves it.
//
// The substantive finding this encodes: all 332 scenarios in `openspec/changes`
// specify NIGHTWATCH, not the product. They live under
// `openspec/changes/<nightwatch-campaign>/specs/` and say things like "Evidence
// invalidates acceptance" and "Auth expires during execution". A specification
// of the tool cannot bind to a product operation, so every one is
// `OUTSIDE_SCOPE`.
//
// That verdict is derived from the scenario's LOCATION, which is a mechanical
// fact about the corpus, rather than from reading its sentence. Reading the
// sentence would be exactly the natural-language interpretation this campaign
// forbids.
//
// Data-only: the caller supplies the discovered scenario set; the boundary does
// the reading.

import { SCENARIO_CLASSIFICATIONS, type ScenarioClassification } from './specExpectations';

export const SCENARIO_INVENTORY_VERSION = 'nightwatch.spec-scenario-inventory.v1' as const;

/** Why a scenario received its classification. Categorical, never prose. */
export const SCENARIO_CLASSIFICATION_REASONS = [
  /** Under `openspec/changes/**`: a Nightwatch campaign record, so it specifies the tool. */
  'NIGHTWATCH_OWN_SPECIFICATION',
  /** A product claim with an admitted, provenance-bound expectation. */
  'PRODUCT_EXPECTATION_ADMITTED',
  /** A product claim whose assertion no oracle can express. */
  'NO_REPRESENTABLE_ASSERTION',
  /** A product claim binding to no known operation. */
  'NO_MATCHING_OPERATION',
  /** A product claim binding to more than one operation. */
  'MORE_THAN_ONE_MATCHING_OPERATION',
  /** Derived once; the artifact has since changed. */
  'SOURCE_ARTIFACT_CHANGED',
  /** The claim resolves more than one way. */
  'CLAIM_RESOLVES_MULTIPLE_WAYS',
  /** No analyzer exists for this assertion class. */
  'ANALYZER_ABSENT',
] as const;
export type ScenarioClassificationReason = (typeof SCENARIO_CLASSIFICATION_REASONS)[number];

export interface DiscoveredScenario {
  /** Repository-relative path of the spec file the scenario lives in. */
  readonly specPath: string;
  /** The `### Requirement:` heading it sits under, when there is one. */
  readonly requirementTitle: string | null;
  /** The `#### Scenario:` heading text. Carried for identity, never parsed. */
  readonly scenarioTitle: string;
  /** 1-based line of the scenario heading, so an operator can find it. */
  readonly line: number;
}

export interface ClassifiedScenario {
  readonly specPath: string;
  readonly requirementTitle: string | null;
  readonly scenarioTitle: string;
  readonly line: number;
  readonly classification: ScenarioClassification;
  readonly reason: ScenarioClassificationReason;
}

export interface ScenarioInventory {
  readonly schemaVersion: typeof SCENARIO_INVENTORY_VERSION;
  readonly discoveredCount: number;
  readonly classifiedCount: number;
  /** Totality: these must be equal, by construction and by assertion. */
  readonly totalityHolds: boolean;
  readonly byClassification: Readonly<Record<ScenarioClassification, number>>;
  readonly byReason: Readonly<Record<string, number>>;
  readonly scenarios: readonly ClassifiedScenario[];
}

/** A Nightwatch campaign record, established from the path, not the prose. */
export function isNightwatchOwnSpecification(specPath: string): boolean {
  return /^openspec\/changes\/[^/]+\/specs\/[^/]+\/spec\.md$/.test(specPath)
    || /^openspec\/changes\/archive\/[^/]+\/specs\/[^/]+\/spec\.md$/.test(specPath)
    || /^openspec\/specs\/[^/]+\/spec\.md$/.test(specPath)
    || /^openspec\/changes\/[^/]+\/[^/]+\.md$/.test(specPath);
}

/**
 * Classify every discovered scenario. Totality is structural: the result is a
 * map over the input, so a scenario cannot be dropped, and `totalityHolds`
 * asserts the counts agree.
 *
 * `productExpectationOperations` lets a scenario that IS a product claim be
 * marked CHECKABLE. It is empty for the OpenSpec corpus by construction,
 * because none of those scenarios is a product claim — and that is the point
 * rather than a limitation.
 */
export function classifyScenarios(
  discovered: readonly DiscoveredScenario[],
  productExpectationOperations: ReadonlySet<string> = new Set(),
): ScenarioInventory {
  const scenarios = discovered.map((scenario): ClassifiedScenario => {
    if (isNightwatchOwnSpecification(scenario.specPath)) {
      // Not a product claim at all. Deliberately NOT NO_OPERATION_BINDING:
      // that would describe a product claim we could not bind, which is a
      // materially different and much more flattering statement.
      return Object.freeze({
        ...scenario,
        classification: 'OUTSIDE_SCOPE' as const,
        reason: 'NIGHTWATCH_OWN_SPECIFICATION' as const,
      });
    }
    // A product-specification scenario. Admitted only when an expectation for
    // its operation exists; otherwise the absence is recorded, never assumed.
    const operationId = scenario.requirementTitle;
    if (operationId !== null && productExpectationOperations.has(operationId)) {
      return Object.freeze({ ...scenario, classification: 'CHECKABLE' as const, reason: 'PRODUCT_EXPECTATION_ADMITTED' as const });
    }
    return Object.freeze({ ...scenario, classification: 'NO_OPERATION_BINDING' as const, reason: 'NO_MATCHING_OPERATION' as const });
  });

  const byClassification = Object.fromEntries(SCENARIO_CLASSIFICATIONS.map((value) => [value, 0])) as Record<ScenarioClassification, number>;
  const byReason: Record<string, number> = Object.fromEntries(SCENARIO_CLASSIFICATION_REASONS.map((value) => [value, 0]));
  for (const scenario of scenarios) {
    byClassification[scenario.classification] += 1;
    byReason[scenario.reason] = (byReason[scenario.reason] ?? 0) + 1;
  }
  return Object.freeze({
    schemaVersion: SCENARIO_INVENTORY_VERSION,
    discoveredCount: discovered.length,
    classifiedCount: scenarios.length,
    totalityHolds: discovered.length === scenarios.length,
    byClassification: Object.freeze(byClassification),
    byReason: Object.freeze(byReason),
    scenarios: Object.freeze(scenarios),
  });
}

/**
 * Parse scenario headings out of one already-read spec file. Structural only:
 * it reads HEADINGS, never the bullet text beneath them, because the bullets
 * are natural language and interpreting them is what this campaign forbids.
 */
export function parseScenarioHeadings(specPath: string, text: string): readonly DiscoveredScenario[] {
  const scenarios: DiscoveredScenario[] = [];
  let requirementTitle: string | null = null;
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const requirement = /^###\s+Requirement:\s*(.+?)\s*$/.exec(line);
    if (requirement !== null) { requirementTitle = requirement[1] ?? null; continue; }
    const scenario = /^####\s+Scenario:\s*(.+?)\s*$/.exec(line);
    if (scenario !== null) {
      scenarios.push(Object.freeze({
        specPath, requirementTitle, scenarioTitle: scenario[1] ?? '', line: index + 1,
      }));
    }
  }
  return Object.freeze(scenarios);
}
