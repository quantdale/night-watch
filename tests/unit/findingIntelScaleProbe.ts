// ---------------------------------------------------------------------------
// RS-1 finding-intelligence scale probe (local-only, deterministic).
//
// Runs the REAL finding-intelligence entry points over a deterministic
// synthetic corpus and reports CPU time, peak RSS and wall latency per stage.
// It is a measurement instrument, not a test: it asserts nothing and it is
// run in a fresh OS process per corpus size by bin/finding-intel-scale.mjs, so
// one size's allocations cannot flatter the next.
//
// Every stage carries a wall-clock budget. A stage that exceeds it stops and
// reports how much work it completed, which yields a rate. Reporting
// "BUDGET_EXCEEDED after 3,214,000 of 49,995,000 pairs" is a measurement; a
// harness that hangs is not.
//
// The corpus is synthetic and in-memory. Nothing is written, nothing reaches
// the owner-only finding store, and no value in it resembles customer data.
//
// Usage: node <compiled>.js <findings> [budgetMs]
// ---------------------------------------------------------------------------

import { classifyRecurrence, classifyRelationship, groupDefectClasses } from '../../src/core/findingIntel';
import type { IntelFindingDescriptor, IntelHistoryEntry } from '../../src/core/findingIntel';
import { projectReviewer } from '../../src/controlCenter/adapters/reviewerAdapter';
import { reviewerInputsFromFindings } from '../../src/controlCenter/authorities/reviewerAuthority';
import type { FindingsDossierMetadata } from '../../src/controlCenter/authorities/findingsAuthority';

const SIZE = Number.parseInt(process.argv[2] ?? '1000', 10);
const BUDGET_MS = Number.parseInt(process.argv[3] ?? '60000', 10);

/**
 * Deterministic corpus. A fixed 32-bit mixer, not Math.random: the same size
 * must produce the same corpus in every process, or the measurements are not
 * comparable across runs.
 */
function mix(seed: number): number {
  let value = seed >>> 0;
  value = Math.imul(value ^ (value >>> 16), 2246822507) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 3266489909) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function hex(value: number, length: number): string {
  return value.toString(16).padStart(8, '0').repeat(Math.ceil(length / 8)).slice(0, length);
}

/**
 * Shape chosen to exercise the classifier rather than to flatter it: about one
 * finding in twenty shares a fingerprint with an earlier one (so duplicate and
 * recurrence paths are actually taken), a tenth carry no fingerprint (so the
 * UNKNOWN path is taken), and contract identities repeat across a bounded set
 * (so defect classes actually form).
 */
function corpus(size: number): readonly IntelFindingDescriptor[] {
  const out: IntelFindingDescriptor[] = [];
  for (let index = 0; index < size; index += 1) {
    const noise = mix(index * 2654435761);
    const duplicateOf = index >= 20 && noise % 20 === 0 ? index - 20 : index;
    const missingFingerprint = noise % 10 === 3;
    out.push({
      findingId: `scale-finding-${String(index).padStart(6, '0')}`,
      fingerprint: missingFingerprint ? null : `fp:sha256:${hex(mix(duplicateOf), 24)}`,
      expectationId: `expectation-${duplicateOf % 64}`,
      semanticContractId: noise % 4 === 0 ? `contract-${duplicateOf % 32}` : null,
      failureSignature: `signature-${duplicateOf % 128}`,
      route: `route/${index % 16}`,
      sourceLineage: `lineage-${index % 8}`,
      replayOutcome: noise % 7 === 0 ? 'INVALID' : 'FAILURE',
    });
  }
  return out;
}

function dossiers(size: number): readonly FindingsDossierMetadata[] {
  return corpus(size).map((descriptor, index) => ({
    schemaVersion: 'nightwatch.control-center-findings-dossier.v1',
    status: 'READY',
    candidateId: descriptor.findingId,
    title: null,
    firstObserved: new Date(Date.UTC(2026, 0, 1) + index * 60_000).toISOString(),
    lastObserved: new Date(Date.UTC(2026, 0, 1) + index * 60_000).toISOString(),
    routeClass: descriptor.route,
    oracleFingerprint: descriptor.fingerprint ?? 'not-a-fingerprint',
    evidenceLevel: 'L2',
    reproduction: { result: 'REPRODUCED', count: 1, minimalityGuarantee: 'BOUNDED_MINIMAL' },
    technicalSeverity: 'HIGH',
    triagePriority: 'P2',
    confidence: { level: 'HIGH' },
    sourceCurrentness: 'CURRENT',
    semanticFinding: index % 3 === 0,
  })) as unknown as readonly FindingsDossierMetadata[];
}

interface StageMeasurement {
  readonly stage: string;
  readonly status: 'COMPLETED' | 'BUDGET_EXCEEDED';
  readonly wallMs: number;
  readonly cpuUserMs: number;
  readonly cpuSystemMs: number;
  readonly peakRssBytes: number;
  readonly heapUsedDeltaBytes: number;
  /** Unit of work the stage performed, and how many of them. */
  readonly workUnit: string;
  readonly workCompleted: number;
  readonly workPlanned: number;
}

function measure(stage: string, workUnit: string, workPlanned: number, run: () => number): StageMeasurement {
  const cpuBefore = process.cpuUsage();
  const heapBefore = process.memoryUsage().heapUsed;
  const wallBefore = performance.now();
  const workCompleted = run();
  const wallMs = performance.now() - wallBefore;
  const cpu = process.cpuUsage(cpuBefore);
  const heapUsedDeltaBytes = process.memoryUsage().heapUsed - heapBefore;
  return {
    stage,
    status: workCompleted >= workPlanned ? 'COMPLETED' : 'BUDGET_EXCEEDED',
    wallMs: Math.round(wallMs * 1000) / 1000,
    cpuUserMs: Math.round(cpu.user / 10) / 100,
    cpuSystemMs: Math.round(cpu.system / 10) / 100,
    // maxRSS is the high-water mark for the whole process, so it is reported
    // per stage as "peak so far" rather than as a per-stage delta it is not.
    peakRssBytes: process.resourceUsage().maxRSS * 1024,
    heapUsedDeltaBytes,
    workUnit,
    workCompleted,
    workPlanned,
  };
}

const descriptors = corpus(SIZE);
const stages: StageMeasurement[] = [];

// Stage 1: exhaustive pairwise relationship classification. This is the
// suspected quadratic, so it is measured directly rather than inferred.
const plannedPairs = (SIZE * (SIZE - 1)) / 2;
stages.push(
  measure('PAIRWISE_RELATIONSHIPS', 'pair', plannedPairs, () => {
    const deadline = performance.now() + BUDGET_MS;
    let pairs = 0;
    for (let i = 1; i < descriptors.length; i += 1) {
      for (let j = 0; j < i; j += 1) {
        classifyRelationship(descriptors[i] as IntelFindingDescriptor, descriptors[j] as IntelFindingDescriptor);
        pairs += 1;
      }
      // Checked per outer iteration: a per-pair clock read would measure the
      // clock as much as the classifier.
      if (performance.now() > deadline) return pairs;
    }
    return pairs;
  })
);

// Stage 2: recurrence against a growing history — the shape the reviewer
// authority actually uses, where entry k is classified against k-1 entries.
stages.push(
  measure('RECURRENCE_AGAINST_HISTORY', 'classification', SIZE, () => {
    const deadline = performance.now() + BUDGET_MS;
    const history: IntelHistoryEntry[] = [];
    let done = 0;
    for (const [index, descriptor] of descriptors.entries()) {
      classifyRecurrence(
        { findingId: descriptor.findingId, fingerprint: descriptor.fingerprint, campaignId: 'scale-campaign', observedAtMs: index * 60_000 },
        history
      );
      history.push({
        findingId: descriptor.findingId,
        fingerprint: descriptor.fingerprint,
        campaignId: 'scale-campaign',
        observedAtMs: index * 60_000,
        sourceSha: '0'.repeat(40),
        priorOutcome: 'UNKNOWN',
      });
      done += 1;
      if ((index & 0xff) === 0 && performance.now() > deadline) return done;
    }
    return done;
  })
);

// Stage 3: defect-class grouping over the whole corpus at once.
stages.push(
  measure('DEFECT_CLASS_GROUPING', 'member', SIZE, () => {
    groupDefectClasses(
      descriptors.map((descriptor) => ({
        findingId: descriptor.findingId,
        semanticContractId: descriptor.semanticContractId,
        expectationId: descriptor.expectationId,
        sourceScope: descriptor.route ?? 'UNKNOWN_SCOPE',
        replayOutcome: descriptor.replayOutcome,
      }))
    );
    return SIZE;
  })
);

// Stage 4: the reviewer path end to end, exactly as the Control Center calls
// it. Its pairwise limit is left at the default so the measurement reflects
// what a browser request would actually cost today.
const snapshot = dossiers(SIZE);
stages.push(
  measure('REVIEWER_AUTHORITY_AND_PROJECTION', 'finding', SIZE, () => {
    const inputs = reviewerInputsFromFindings({ dossiers: snapshot, campaignId: 'scale-campaign' });
    projectReviewer({ findings: inputs }, 50);
    return SIZE;
  })
);

process.stdout.write(
  `${JSON.stringify({
    schemaVersion: 'nightwatch.finding-intel-scale-probe.v1',
    findings: SIZE,
    budgetMs: BUDGET_MS,
    nodeMajor: Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10),
    stages,
  })}\n`
);
