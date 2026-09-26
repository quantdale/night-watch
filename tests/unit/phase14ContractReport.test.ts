// ---------------------------------------------------------------------------
// Nightwatch Phase 14A — C5: focused contract coverage observability / tooling
// tests (SPEC §5, FIVE_CHANGE C5; ACCEPTANCE_MATRIX H / C5 tooling).
//
// Exercises the deterministic report builder, the baseline-delta comparison, the
// corpus index validation, and the read-only CLI. The report is sanitized,
// deterministic, privacy-safe, and contains zero raw product/customer values.
// ---------------------------------------------------------------------------

import { expect, test } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildContractCoverageReport,
  compareBaselineCoverage,
  generateCorpusPhase14Index,
  renderContractCoverageReportText,
  sanitizeInventoryInput,
  validateCorpusPhase14Index,
  type ContractCoverageReport,
} from "../../src/oracles/expectations/extract/contractCoverageReport";
import type {
  CoverageInventoryEntry,
  CoverageInventoryReport,
} from "../../src/oracles/expectations/coverageInventory";
import { phase14Fixtures } from "../../corpus/phase14/source-fixtures";

const REPO_ROOT = path.resolve(__dirname, "..", "..");

function entry(
  overrides: Partial<CoverageInventoryEntry>,
): CoverageInventoryEntry {
  return {
    targetId: "x.read",
    approvedReadOnly: true,
    devReachable: false,
    observerClass: "JSON_SINGLE_BROWSER_API",
    recipeId: null,
    recipeVersion: null,
    historicalExpectationId: null,
    collectionExpectationId: null,
    sourceRepo: null,
    sourcePath: null,
    sourceSymbol: null,
    sourceSha: null,
    evidenceDigest: null,
    depthClass: "NONE",
    disposition: "APPROVED_NO_MECHANICAL_CONTRACT",
    blockerCode: null,
    analyzerProbe: null,
    resolverState: "NOT_APPLICABLE",
    currentness: "NOT_APPLICABLE",
    ...overrides,
  };
}

function sampleInventory(): CoverageInventoryReport {
  const entries: CoverageInventoryEntry[] = [
    entry({
      targetId: "ripple.account-inventory.read",
      recipeVersion: "nightwatch.real-source-expectation-recipe.v1",
      historicalExpectationId:
        "ripple.account-inventory.read.real-source-shape",
      collectionExpectationId:
        "ripple.account-inventory.read.real-source-collection",
      evidenceDigest: "ev:sha256:111111111111111111111111",
      depthClass: "SHAPE_COLLECTION",
      disposition: "APPROVED_AND_ADMITTED_COLLECTION",
      blockerCode:
        "TYPE_FLOW_AMBIGUOUS:account-inventory-no-proven-field-type-flow",
      analyzerProbe: [
        {
          proofClass: "LITERAL_ROW_FIELD_SET",
          status: "PROVEN",
          blockerCode: null,
          evidenceDigest: "ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa",
        },
        {
          proofClass: "SCALAR_TYPE_FROM_CAST",
          status: "AMBIGUOUS",
          blockerCode: "RUNTIME_VALUE_TYPE_UNPROVEN",
          evidenceDigest: "ev:sha256:bbbbbbbbbbbbbbbbbbbbbbbb",
        },
      ],
      resolverState: "RESOLVED",
      currentness: "CURRENT",
    }),
    entry({
      targetId: "ripple.billing-groups-legacy.read",
      depthClass: "NONE",
      disposition: "APPROVED_NOT_ADMITTED_AMBIGUOUS",
      blockerCode: "AMBIGUOUS_CONDITIONAL_BLOB_RUNTIME_COMPUTED",
      analyzerProbe: [
        {
          proofClass: "CHUNK_ITEM_METADATA",
          status: "AMBIGUOUS",
          blockerCode: "TRANSPORT_CONTRACT_UNPROVEN",
          evidenceDigest: "ev:sha256:cccccccccccccccccccccccc",
        },
      ],
      resolverState: "NOT_APPLICABLE",
      currentness: "NOT_APPLICABLE",
    }),
    entry({
      targetId: "ripple.billing-groups.read",
      observerClass: "JSON_CHUNKED_GRPC",
      depthClass: "NONE",
      disposition: "APPROVED_NOT_OBSERVABLE",
      blockerCode: "GRPC_CHUNKED_NO_PHP_MECHANICAL_CONTRACT",
      analyzerProbe: [
        {
          proofClass: "CHUNK_ITEM_METADATA",
          status: "AMBIGUOUS",
          blockerCode: "TRANSPORT_CONTRACT_UNPROVEN",
          evidenceDigest: "ev:sha256:dddddddddddddddddddddddd",
        },
      ],
      resolverState: "NOT_APPLICABLE",
      currentness: "NOT_APPLICABLE",
    }),
  ];
  return {
    remoteSha: "e026c85522d201724033f024456da3efa17fe07a",
    snapshotSha: "e026c85522d201724033f024456da3efa17fe07a",
    snapshotMatchesRemote: true,
    canonicalUnchanged: true,
    entries,
    metrics: {
      approvedTargetCount: 3,
      admittedHistoricalCount: 1,
      admittedCollectionCount: 1,
      deepTypeCount: 0,
      observerUnavailableCount: 1,
      ambiguousCount: 1,
      mechanicallyUncoveredCount: 2,
      newContractsAdded: 0,
      existingContractsDepthUplifted: 0,
      derivationFailures: 0,
      staleUnavailableFailures: 0,
    },
  };
}

test.describe("Phase 14A C5 — report builder", () => {
  test("deterministic: identical input yields identical digest and stable JSON", () => {
    const a = buildContractCoverageReport({ inventory: sampleInventory() });
    const b = buildContractCoverageReport({ inventory: sampleInventory() });
    expect(a).toEqual(b);
    expect(a.digest).toBe(b.digest);
    expect(a.digest).toMatch(/^ev:sha256:[0-9a-f]{24}$/);
    // Stable JSON: canonicalJson sorts keys, so re-stringifying is identical.
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test("counts: approved / admitted historical / admitted collection", () => {
    const r = buildContractCoverageReport({ inventory: sampleInventory() });
    expect(r.approvedTargetCount).toBe(3);
    expect(r.admittedHistoricalCount).toBe(1);
    expect(r.admittedCollectionCount).toBe(1);
  });

  test("depth classes, proof classes, and blockers grouped by stable code", () => {
    const r = buildContractCoverageReport({ inventory: sampleInventory() });
    expect(r.depthClasses["SHAPE_COLLECTION"]).toBe(1);
    expect(r.depthClasses["NONE"]).toBe(2);
    expect(r.proofClasses["LITERAL_ROW_FIELD_SET"]?.proven ?? 0).toBe(1);
    expect(r.proofClasses["SCALAR_TYPE_FROM_CAST"]?.ambiguous ?? 0).toBe(1);
    expect(r.proofClasses["CHUNK_ITEM_METADATA"]?.ambiguous ?? 0).toBe(2);
    expect(
      r.blockersByCode["AMBIGUOUS_CONDITIONAL_BLOB_RUNTIME_COMPUTED"],
    ).toBe(1);
    expect(r.blockersByCode["GRPC_CHUNKED_NO_PHP_MECHANICAL_CONTRACT"]).toBe(1);
    expect(r.blockersByCode["TRANSPORT_CONTRACT_UNPROVEN"]).toBe(2);
  });

  test("unresolved mechanical coverage gaps enumerated", () => {
    const r = buildContractCoverageReport({ inventory: sampleInventory() });
    const byId = new Map(
      r.unresolvedMechanicalCoverageGaps.map((g) => [g.targetId, g]),
    );
    expect(byId.get("ripple.billing-groups-legacy.read")!.blockerCode).toBe(
      "AMBIGUOUS_CONDITIONAL_BLOB_RUNTIME_COMPUTED",
    );
    expect(byId.get("ripple.billing-groups.read")!.disposition).toBe(
      "APPROVED_NOT_OBSERVABLE",
    );
    expect(r.unresolvedMechanicalCoverageGaps).toHaveLength(2);
  });

  test("drift classifications integrated from C4", () => {
    const drift = [
      {
        targetId: "ripple.account-inventory.read",
        driftClass: "EVIDENCE_UNCHANGED_SHA_MOVED" as const,
        prevDigest: "ev:sha256:111111111111111111111111",
        currDigest: "ev:sha256:111111111111111111111111",
        prevStatus: "CURRENT",
        currStatus: "CURRENT",
        detail: "",
      },
      {
        targetId: "ripple.billing-groups.read",
        driftClass: "CONTRACT_BECAME_PROVABLE" as const,
        prevDigest: null,
        currDigest: "ev:sha256:dddddddddddddddddddddddd",
        prevStatus: null,
        currStatus: "PROVEN",
        detail: "",
      },
    ];
    const r = buildContractCoverageReport({
      inventory: sampleInventory(),
      drift,
    });
    expect(r.driftClasses["EVIDENCE_UNCHANGED_SHA_MOVED"] ?? 0).toBe(1);
    expect(r.driftClasses["CONTRACT_BECAME_PROVABLE"] ?? 0).toBe(1);
    const account = r.normalizedEvidenceIdentities.find(
      (i) => i.targetId === "ripple.account-inventory.read",
    );
    expect(account?.driftClass ?? "").toBe("EVIDENCE_UNCHANGED_SHA_MOVED");
  });

  test("privacy-safe: no raw product/customer values; sentinel guard active", () => {
    const r = buildContractCoverageReport({ inventory: sampleInventory() });
    expect(r.privacySafe).toBe(true);
    const serialized = JSON.stringify(r);
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain("AKIA");
    expect(serialized).not.toContain("password=");
  });
});

test.describe("Phase 14A C5 — baseline comparison (no uplift is honest)", () => {
  test("self-compare yields zero additions/strengthenings", () => {
    const inv = sampleInventory();
    const delta = compareBaselineCoverage(inv, inv);
    expect(delta.additions).toHaveLength(0);
    expect(delta.strengthenings).toHaveLength(0);
    expect(delta.depthUplifted).toBe(0);
  });

  test("a target becoming admitted is reported as an addition only when proven", () => {
    const baseline = sampleInventory();
    const legacyAdmitted = entry({
      targetId: "ripple.billing-groups-legacy.read",
      depthClass: "SHAPE_COLLECTION",
      disposition: "APPROVED_AND_ADMITTED_COLLECTION",
      blockerCode: null,
      evidenceDigest: "ev:sha256:eeeeeeeeeeeeeeeeeeeeeeee",
      analyzerProbe: [
        {
          proofClass: "CHUNK_ITEM_METADATA",
          status: "PROVEN",
          blockerCode: null,
          evidenceDigest: "ev:sha256:eeeeeeeeeeeeeeeeeeeeeeee",
        },
      ],
      resolverState: "RESOLVED",
      currentness: "CURRENT",
    });
    const base = sampleInventory();
    const current: CoverageInventoryReport = {
      ...base,
      entries: [base.entries[0]!, legacyAdmitted, base.entries[2]!],
      metrics: { ...base.metrics, admittedCollectionCount: 2 },
    };
    const delta = compareBaselineCoverage(baseline, current);
    expect(delta.additions).toContain("ripple.billing-groups-legacy.read");
  });
});

test.describe("Phase 14A C5 — strict input + corpus index", () => {
  test("sanitizeInventoryInput rejects unknown fields", () => {
    const bad = { ...sampleInventory(), evilField: "x" } as unknown;
    expect(() => sanitizeInventoryInput(bad)).toThrow(
      /CONTRACT_REPORT_UNKNOWN_FIELD/,
    );
  });

  test("sanitizeInventoryInput rejects privacy sentinels", () => {
    const bad = JSON.parse(JSON.stringify(sampleInventory()));
    bad.remoteSha = "sk-12345secret";
    expect(() => sanitizeInventoryInput(bad)).toThrow(/PRIVACY_SENTINEL/);
  });

  test("corpus/phase14 index validation: >=30 fixtures, deterministic, no duplicates", () => {
    const v = validateCorpusPhase14Index(phase14Fixtures);
    expect(v.fixtureCount).toBeGreaterThanOrEqual(30);
    expect(v.deterministic).toBe(true);
    expect(v.duplicateContentCount).toBe(0);
    expect(v.ok).toBe(true);
  });

  test("corpus index generation is deterministic", () => {
    const a = generateCorpusPhase14Index(phase14Fixtures);
    const b = generateCorpusPhase14Index(phase14Fixtures);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.length).toBe(Object.keys(phase14Fixtures).length);
    for (const e of a) expect(e.digest).toMatch(/^ev:sha256:[0-9a-f]{24}$/);
  });
});

test.describe("Phase 14A C5 — text renderer", () => {
  test("renders the required sections", () => {
    const text = renderContractCoverageReportText(
      buildContractCoverageReport({ inventory: sampleInventory() }),
    );
    expect(text).toContain("approved targets:");
    expect(text).toContain("admitted historical:");
    expect(text).toContain("depth classes:");
    expect(text).toContain("proof classes");
    expect(text).toContain("blockers by code:");
    expect(text).toContain("unresolved mechanical coverage gaps:");
    expect(text).toContain("privacy-safe: true");
  });
});

test.describe("Phase 14A C5 — read-only CLI", () => {
  function runCli(args: string[]): {
    status: number | null;
    stdout: string;
    stderr: string;
  } {
    const result = spawnSync(
      process.execPath,
      [path.join(REPO_ROOT, "bin", "phase14-contract-health.mjs"), ...args],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        timeout: 120_000,
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    return {
      status: result.status,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  }

  test("--help prints usage and exits cleanly", () => {
    const r = runCli(["--help"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(
      "Nightwatch Phase 14A contract coverage health CLI",
    );
  });

  test("--inventory json + text outputs a sanitized report", () => {
    const tmp = path.join(os.tmpdir(), `nw-phase14-inv-${Date.now()}.json`);
    fs.writeFileSync(tmp, JSON.stringify(sampleInventory()));
    try {
      const json = runCli(["--inventory", tmp, "--format", "json"]);
      expect(json.status).toBe(0);
      const parsed = JSON.parse(json.stdout) as ContractCoverageReport;
      expect(parsed.approvedTargetCount).toBe(3);
      expect(parsed.privacySafe).toBe(true);
      expect(json.stdout).not.toContain("sk-");

      const text = runCli(["--inventory", tmp, "--format", "text"]);
      expect(text.status).toBe(0);
      expect(text.stdout).toContain("unresolved mechanical coverage gaps:");
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  });

  test("strict rejection: unknown field in inventory fails closed", () => {
    const tmp = path.join(os.tmpdir(), `nw-phase14-bad-${Date.now()}.json`);
    const bad = { ...sampleInventory(), injectedField: "x" } as Record<
      string,
      unknown
    >;
    fs.writeFileSync(tmp, JSON.stringify(bad));
    try {
      const r = runCli(["--inventory", tmp, "--format", "json"]);
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/CONTRACT_REPORT_UNKNOWN_FIELD|ERROR/);
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  });

  test("--snapshot builds a live inventory from the disposable source snapshot", () => {
    // The live disposable snapshot directory may be absent in some environments;
    // when present, the CLI must build a full 6-target report with no writes.
    const snapshotDir = "/tmp/nightwatch-ripple-snapshot-e026c855";
    if (!fs.existsSync(path.join(snapshotDir, ".git"))) {
      test.skip(true, "disposable snapshot not present in this environment");
      return;
    }
    const r = runCli([
      "--snapshot",
      snapshotDir,
      "--sha",
      "e026c85522d201724033f024456da3efa17fe07a",
      "--format",
      "json",
    ]);
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout) as ContractCoverageReport;
    expect(parsed.approvedTargetCount).toBe(6);
    expect(parsed.privacySafe).toBe(true);
  });
});

// D-10 / D-11 / D-12 — the live `--snapshot` test above is gated on a
// hard-coded /tmp disposable snapshot with no tracked creator (its skip is
// declared in the canonical allowlist and visible in the shard skip reports).
// This synthetic twin always runs: it materializes its own snapshot root and
// proves the snapshot path is read-only, registry-driven and privacy-safe.

test.describe("C5 — synthetic twin for the declared /tmp-snapshot skip", () => {
  test("the snapshot path builds a read-only, registry-driven, privacy-safe report from its own root", () => {
    // Local runner: the owned runCli helper is scoped to its own describe.
    const runHealthCli = (args: string[]) => {
      const result = spawnSync(
        process.execPath,
        [path.join(REPO_ROOT, "bin", "phase14-contract-health.mjs"), ...args],
        { cwd: REPO_ROOT, encoding: "utf8", timeout: 120_000, maxBuffer: 16 * 1024 * 1024 },
      );
      return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
    };
    const snapshotDir = fs.mkdtempSync(path.join(os.tmpdir(), "nw-phase14-snapshot-twin-"));
    try {
      fs.mkdirSync(path.join(snapshotDir, ".git"), { recursive: true });
      fs.writeFileSync(path.join(snapshotDir, ".git", "HEAD"), "ref: refs/heads/main\n");
      const before = new Set(
        fs.readdirSync(snapshotDir).concat(fs.readdirSync(path.join(snapshotDir, ".git")))
      );
      const r = runHealthCli([
        "--snapshot",
        snapshotDir,
        "--sha",
        "e026c85522d201724033f024456da3efa17fe07a",
        "--format",
        "json",
      ]);
      expect(r.status).toBe(0);
      const parsed = JSON.parse(r.stdout) as ContractCoverageReport;
      // The approved count comes from the registry, never from the snapshot's
      // file contents: an empty root can approve nothing and invent no target.
      expect(parsed.approvedTargetCount).toBe(6);
      expect(parsed.privacySafe).toBe(true);
      // Read-only: the CLI writes nothing into the snapshot root.
      const after = new Set(
        fs.readdirSync(snapshotDir).concat(fs.readdirSync(path.join(snapshotDir, ".git")))
      );
      expect([...after]).toEqual([...before]);
    } finally {
      fs.rmSync(snapshotDir, { recursive: true, force: true });
    }
  });
});
