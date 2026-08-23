import { expect, test } from "@playwright/test";
import {
  generateSyntheticFixtures,
  measureSyntheticMutationDetection,
} from "../../src/core/semanticCoverage";
import {
  phase20CapabilityBindings,
  phase20DifferentialContracts,
  phase20Inventory,
  phase20MetamorphicRelations,
  phase20RelationalContracts,
} from "../../corpus/phase20/contracts";
import { phase21MembershipBindings, phase21MembershipContracts } from "../../corpus/phase21/contracts";

test.describe("Phase 21 membership mutation applicability", () => {
  test("makes source-bound wrong-enum and set mutants applicable end to end", () => {
    const candidates = phase20Inventory().candidates;
    const membershipContracts = phase21MembershipContracts();
    const membershipBindings = phase21MembershipBindings();
    const fixtures = generateSyntheticFixtures({
      candidates,
      relationalContracts: phase20RelationalContracts(),
      differentialContracts: phase20DifferentialContracts(),
      metamorphicRelations: phase20MetamorphicRelations(),
      membershipContracts,
      membershipBindings,
    });
    const measurement = measureSyntheticMutationDetection({
      fixtures,
      candidates,
      relationalContracts: phase20RelationalContracts(),
      differentialContracts: phase20DifferentialContracts(),
      metamorphicRelations: phase20MetamorphicRelations(),
      membershipContracts,
      membershipBindings,
    });
    const sourceEnumRows = measurement.rows.filter((row) => row.mutationClass === "WRONG_ENUM" && row.contractId !== "phase20.browser-api-summary");
    expect(sourceEnumRows.length).toBeGreaterThanOrEqual(2);
    expect(sourceEnumRows.every((row) => row.applicable && row.detected && row.replayed && row.minimized && row.highConfidence)).toBe(true);
    const membershipRows = measurement.rows.filter((row) => row.contractId.endsWith(".set"));
    expect(membershipRows).toHaveLength(16);
    expect(new Set(membershipRows.map((row) => row.mutationClass))).toEqual(new Set(["BASELINE_VALID", "WRONG_ENUM", "MISSING_ENUM_MEMBER", "UNEXPECTED_SET_MEMBER", "EXACT_SET_MISMATCH", "SUBSET_VIOLATION", "SUPERSET_VIOLATION", "BENIGN_ALTERNATIVE"]));
    expect(membershipRows.filter((row) => row.expectedViolation).every((row) => row.applicable && row.detected)).toBe(true);
    expect(measurement.mutantsGenerated).toBe(46);
    expect(measurement.mutantsApplicable).toBe(46);
    expect(measurement.mutantsDetected).toBe(46);
    expect(measurement.mutantsSurviving).toBe(0);
    expect(measurement.benignControls).toBe(33);
    expect(measurement.benignFalsePositives).toBe(0);
    expect(measurement.replayedDetections).toBe(46);
    expect(measurement.minimizedDetections).toBe(46);
    expect(measurement.highConfidenceDetections).toBe(46);
    expect(JSON.stringify(measurement)).not.toContain("open");
    expect(JSON.stringify(measurement)).not.toContain("closed");
    expect(JSON.stringify(measurement)).not.toContain("synthetic-unknown-member");
  });

  test("does not change the Phase 20 baseline when membership authority is omitted", () => {
    const candidates = phase20Inventory().candidates;
    const fixtures = generateSyntheticFixtures({ candidates, relationalContracts: phase20RelationalContracts(), differentialContracts: phase20DifferentialContracts(), metamorphicRelations: phase20MetamorphicRelations() });
    const measurement = measureSyntheticMutationDetection({ fixtures, candidates, relationalContracts: phase20RelationalContracts(), differentialContracts: phase20DifferentialContracts(), metamorphicRelations: phase20MetamorphicRelations(), });
    expect(measurement.mutantsGenerated).toBe(34);
    expect(measurement.mutantsApplicable).toBe(32);
    expect(measurement.mutantsDetected).toBe(32);
    expect(measurement.mutantsSurviving).toBe(0);
    expect(measurement.benignControls).toBe(31);
    expect(measurement.benignFalsePositives).toBe(0);
    expect(phase20CapabilityBindings().length).toBeGreaterThan(0);
  });
});
