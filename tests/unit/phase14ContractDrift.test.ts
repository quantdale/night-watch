// ---------------------------------------------------------------------------
// Nightwatch Phase 14A — C4: focused deterministic source-contract drift /
// currentness intelligence tests (SPEC §4, FIVE_CHANGE C4; ACCEPTANCE_MATRIX
// E10 / G07-G08).
//
// Exercises the drift classifier (src/oracles/expectations/extract/contractDrift)
// against controlled classified pairs. The classifier uses normalized evidence
// digests and explicit derivation semantics, never raw source-SHA equality
// alone, and never interprets runtime behavior or customer values.
//
// Every drift class from the FIVE_CHANGE C4 specification is asserted, plus
// privacy-safe serialization and inventory-level drift.
// ---------------------------------------------------------------------------

import { expect, test } from "@playwright/test";
import {
  classifyContractDrift,
  classifyInventoryDrift,
  driftFromAnalyses,
  driftFromProbes,
} from "../../src/oracles/expectations/extract/contractDrift";
import {
  MECHANICAL_ANALYZER_VERSION,
  type AnalyzerBlockerCode,
  type AnalyzerFact,
  type ContractAnalysis,
} from "../../src/oracles/expectations/extract/analyzer";

/** Structural probe shape used by the drift layer (defined in coverageInventory). */
type AnalyzerProbe = { status: string; evidenceDigest: string };

function mk(
  status: ContractAnalysis["status"],
  facts: readonly AnalyzerFact[],
  blockerCode: AnalyzerBlockerCode | null = null,
): ContractAnalysis {
  return {
    analyzerVersion: MECHANICAL_ANALYZER_VERSION,
    language: "php",
    symbol: null,
    status,
    proofClass: facts[0]?.proofClass ?? null,
    facts,
    blockerCode,
    safeEvidence: JSON.stringify({ status, facts }),
  };
}

const PROVEN_STRING: AnalyzerFact = {
  proofClass: "SCALAR_TYPE_FROM_CAST",
  fieldName: "x",
  allowedTypes: ["STRING"],
};
const PROVEN_STRING_NUMBER: AnalyzerFact = {
  proofClass: "SCALAR_TYPE_FROM_CAST",
  fieldName: "x",
  allowedTypes: ["STRING", "NUMBER"],
};
const PROVEN_NUMBER_ONLY: AnalyzerFact = {
  proofClass: "SCALAR_TYPE_FROM_CAST",
  fieldName: "x",
  allowedTypes: ["NUMBER"],
};

test.describe("Phase 14A C4 — drift / currentness classification", () => {
  test("EVIDENCE_UNCHANGED_SHA_MOVED: identical normalized evidence, source SHA moved", () => {
    const prev = mk("PROVEN", [PROVEN_STRING]);
    const curr = mk("PROVEN", [PROVEN_STRING]);
    const c = driftFromAnalyses({
      targetId: "t",
      prev,
      curr,
      sourceAvailable: true,
      sourceStale: false,
    });
    expect(c.driftClass).toBe("EVIDENCE_UNCHANGED_SHA_MOVED");
    expect(c.prevDigest).toBe(c.currDigest);
  });

  test("EVIDENCE_CHANGED_COMPATIBLE: both provable, prev types are a subset of curr", () => {
    const prev = mk("PROVEN", [PROVEN_STRING]);
    const curr = mk("PROVEN", [PROVEN_STRING_NUMBER]);
    const c = driftFromAnalyses({
      targetId: "t",
      prev,
      curr,
      sourceAvailable: true,
      sourceStale: false,
    });
    expect(c.driftClass).toBe("EVIDENCE_CHANGED_COMPATIBLE");
    expect(c.prevDigest).not.toBe(c.currDigest);
  });

  test("EVIDENCE_CHANGED_BREAKING: both provable, a previously proven type was removed", () => {
    const prev = mk("PROVEN", [PROVEN_STRING]);
    const curr = mk("PROVEN", [PROVEN_NUMBER_ONLY]);
    const c = driftFromAnalyses({
      targetId: "t",
      prev,
      curr,
      sourceAvailable: true,
      sourceStale: false,
    });
    expect(c.driftClass).toBe("EVIDENCE_CHANGED_BREAKING");
    expect(c.prevDigest).not.toBe(c.currDigest);
  });

  test("DERIVATION_VERSION_CHANGED: analyzer version movement is distinct from evidence movement", () => {
    const prev = mk("PROVEN", [PROVEN_STRING]);
    const curr = mk("PROVEN", [PROVEN_STRING]);
    const c = driftFromAnalyses({
      targetId: "t",
      prev,
      curr,
      sourceAvailable: true,
      sourceStale: false,
      prevVersion: "nightwatch.mechanical-contract-analyzer.v1",
      currVersion: "nightwatch.mechanical-contract-analyzer.v2",
    });
    expect(c.driftClass).toBe("DERIVATION_VERSION_CHANGED");
  });

  test("SOURCE_STALE: current snapshot SHA does not match", () => {
    const c = classifyContractDrift({
      targetId: "t",
      prevDigest: "ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa",
      currDigest: "ev:sha256:bbbbbbbbbbbbbbbbbbbbbbbb",
      prevStatus: "PROVEN",
      currStatus: "PROVEN",
      prevVersion: null,
      currVersion: null,
      sourceAvailable: true,
      sourceStale: true,
    });
    expect(c.driftClass).toBe("SOURCE_STALE");
  });

  test("SOURCE_UNAVAILABLE: source not available", () => {
    const c = classifyContractDrift({
      targetId: "t",
      prevDigest: null,
      currDigest: null,
      prevStatus: null,
      currStatus: null,
      prevVersion: null,
      currVersion: null,
      sourceAvailable: false,
      sourceStale: false,
    });
    expect(c.driftClass).toBe("SOURCE_UNAVAILABLE");
  });

  test("CONTRACT_BECAME_AMBIGUOUS: previously PROVEN, now not provable", () => {
    const c = classifyContractDrift({
      targetId: "t",
      prevDigest: "ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa",
      currDigest: "ev:sha256:bbbbbbbbbbbbbbbbbbbbbbbb",
      prevStatus: "PROVEN",
      currStatus: "AMBIGUOUS",
      prevVersion: null,
      currVersion: null,
      sourceAvailable: true,
      sourceStale: false,
    });
    expect(c.driftClass).toBe("CONTRACT_BECAME_AMBIGUOUS");
  });

  test("CONTRACT_BECAME_PROVABLE: previously ambiguous, now provable", () => {
    const c = classifyContractDrift({
      targetId: "t",
      prevDigest: "ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa",
      currDigest: "ev:sha256:bbbbbbbbbbbbbbbbbbbbbbbb",
      prevStatus: "AMBIGUOUS",
      currStatus: "PROVEN",
      prevVersion: null,
      currVersion: null,
      sourceAvailable: true,
      sourceStale: false,
    });
    expect(c.driftClass).toBe("CONTRACT_BECAME_PROVABLE");
  });

  test("NO_APPROVED_TARGET: no approved target evaluated", () => {
    const c = classifyContractDrift({
      targetId: "t",
      prevDigest: null,
      currDigest: null,
      prevStatus: null,
      currStatus: null,
      prevVersion: null,
      currVersion: null,
      sourceAvailable: true,
      sourceStale: false,
    });
    expect(c.driftClass).toBe("NO_APPROVED_TARGET");
  });
});

test.describe("Phase 14A C4 — probe-level and inventory-level drift", () => {
  test("driftFromProbes: same evidence SHA moved vs changed evidence", () => {
    const probe = {
      status: "PROVEN",
      evidenceDigest: "ev:sha256:deadbeefdeadbeefdeadbeef",
    } as const satisfies AnalyzerProbe;
    const moved = driftFromProbes({
      targetId: "t",
      prevProbe: probe,
      currProbe: probe,
      sourceAvailable: true,
      sourceStale: false,
    });
    expect(moved.driftClass).toBe("EVIDENCE_UNCHANGED_SHA_MOVED");

    const other = {
      status: "PROVEN",
      evidenceDigest: "ev:sha256:cafef00dcafef00dcafef00d",
    } as const satisfies AnalyzerProbe;
    const changed = driftFromProbes({
      targetId: "t",
      prevProbe: probe,
      currProbe: other,
      sourceAvailable: true,
      sourceStale: false,
    });
    expect(changed.driftClass).toBe("EVIDENCE_CHANGED_COMPATIBLE");
  });

  test("classifyInventoryDrift: per-target drift across a baseline and current inventory", () => {
    const baseline = {
      entries: [
        {
          targetId: "a.read",
          analyzerProbe: [
            {
              status: "PROVEN",
              evidenceDigest: "ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa",
            },
          ] as readonly AnalyzerProbe[],
        },
        {
          targetId: "b.read",
          analyzerProbe: [
            {
              status: "AMBIGUOUS",
              evidenceDigest: "ev:sha256:bbbbbbbbbbbbbbbbbbbbbbbb",
            },
          ] as readonly AnalyzerProbe[],
        },
      ],
    };
    // a.read: identical evidence -> moved; b.read: became provable.
    const current = {
      entries: [
        {
          targetId: "a.read",
          analyzerProbe: [
            {
              status: "PROVEN",
              evidenceDigest: "ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa",
            },
          ] as readonly AnalyzerProbe[],
        },
        {
          targetId: "b.read",
          analyzerProbe: [
            {
              status: "PROVEN",
              evidenceDigest: "ev:sha256:cccccccccccccccccccccccc",
            },
          ] as readonly AnalyzerProbe[],
        },
      ],
    };
    const out = classifyInventoryDrift(baseline, current, {
      sourceAvailable: true,
      sourceStale: false,
    });
    const byId = new Map(out.map((d) => [d.targetId, d]));
    expect(byId.get("a.read")!.driftClass).toBe("EVIDENCE_UNCHANGED_SHA_MOVED");
    expect(byId.get("b.read")!.driftClass).toBe("CONTRACT_BECAME_PROVABLE");
  });
});

test.describe("Phase 14A C4 — privacy-safe serialization", () => {
  test("no customer/raw values leak into a drift classification", () => {
    const c = driftFromAnalyses({
      targetId: "t",
      prev: mk("PROVEN", [PROVEN_STRING]),
      curr: mk("PROVEN", [PROVEN_STRING_NUMBER]),
      sourceAvailable: true,
      sourceStale: false,
    });
    const serialized = JSON.stringify(c);
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain("AKIA");
    expect(serialized).not.toContain("password=");
    expect(serialized).not.toContain("Bearer ");
    // The classification carries safe categorical provenance only.
    expect(c).toHaveProperty("driftClass");
    expect(c).toHaveProperty("prevDigest");
    expect(c).toHaveProperty("currDigest");
  });

  test("drift class vocabulary is bounded and explicitly named", () => {
    const classes = new Set<string>();
    classes.add(
      driftFromAnalyses({
        targetId: "t",
        prev: mk("PROVEN", [PROVEN_STRING]),
        curr: mk("PROVEN", [PROVEN_STRING]),
        sourceAvailable: true,
        sourceStale: false,
      }).driftClass,
    );
    expect(classes.size).toBeGreaterThan(0);
    // Every emitted class is one of the documented categorical vocabulary.
    const allowed = new Set([
      "EVIDENCE_UNCHANGED_SHA_MOVED",
      "EVIDENCE_CHANGED_COMPATIBLE",
      "EVIDENCE_CHANGED_BREAKING",
      "DERIVATION_VERSION_CHANGED",
      "SOURCE_STALE",
      "SOURCE_UNAVAILABLE",
      "CONTRACT_BECAME_AMBIGUOUS",
      "CONTRACT_BECAME_PROVABLE",
      "NO_APPROVED_TARGET",
    ]);
    for (const c of classes) expect(allowed.has(c)).toBe(true);
  });
});
