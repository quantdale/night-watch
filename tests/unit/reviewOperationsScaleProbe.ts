// ---------------------------------------------------------------------------
// Review-operations scale probe. ONE CELL PER PROCESS.
//
// Run by bin/review-operations-scale.mjs, never by the test runner: it builds
// tens of thousands of files. It is a `.ts` (not a `.test.ts`) so playwright's
// testMatch does not collect it.
//
// What it measures, and why each one:
//
//   discovery   — one readdir + lstat per entry. The floor for every other
//                 number here, and the one that scales with the STORE.
//   shallow     — classification by name, opening nothing. What an operator
//                 gets when they only want to know how big the thing is.
//   deep        — every artifact opened and validated. The honest cost of an
//                 answer about decisions, dates and corruption.
//   history     — one finding's generations. This is the number that would
//                 betray a per-row store scan hiding behind a paged surface.
//   reviewer    — the page a reviewer ACTUALLY OPENS, measured with the store
//                 wired in, so a review-store regression cannot hide behind
//                 the cheapest possible page.
//   json        — serializing the wire payload, because a bounded document
//                 over a 50k store is a claim that has to be true.
//
// Every timing is a MEDIAN over repeated calls with a reported spread. A
// single sample on a shared machine is a number, not a measurement.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ReviewStore, inventoryReviewStore, reviewHistoryFor } from '../../src/core/reviewStore';
import { ControlCenterReviewStoreAuthority } from '../../src/controlCenter/authorities/reviewStoreAuthority';
import { projectReviewStoreInventory } from '../../src/controlCenter/adapters/reviewStoreAdapter';
import { projectReviewer } from '../../src/controlCenter/adapters/reviewerAdapter';
import { reviewerInputsFromFindings } from '../../src/controlCenter/authorities/reviewerAuthority';
import { ControlCenterReviewAuthority } from '../../src/controlCenter/authorities/reviewWriteAuthority';
import { currentReviewArtifacts, reviewBindingFor } from '../../src/controlCenter/authorities/reviewBinding';
import { reviewerCorpus, type CorpusFinding } from '../helpers/reviewerCorpus';

const CAMPAIGN = 'campaign/c1';
/** One finding gets this many generations, so history paging is real. */
const DEEP_HISTORY_GENERATIONS = 50;

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2 : (sorted[middle] as number);
}

function percentile(values: readonly number[], fraction: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1))] as number;
}

interface Timing {
  readonly medianMs: number;
  readonly p95Ms: number;
  readonly minMs: number;
  readonly maxMs: number;
  readonly samples: number;
}

function timed(samples: number, run: () => void): Timing {
  const durations: number[] = [];
  for (let index = 0; index < samples; index += 1) {
    const started = process.hrtime.bigint();
    run();
    durations.push(Number(process.hrtime.bigint() - started) / 1e6);
  }
  return {
    medianMs: Number(median(durations).toFixed(3)),
    p95Ms: Number(percentile(durations, 0.95).toFixed(3)),
    minMs: Number(Math.min(...durations).toFixed(3)),
    maxMs: Number(Math.max(...durations).toFixed(3)),
    samples,
  };
}

function storeFootprint(root: string): { readonly files: number; readonly bytes: number } {
  let files = 0;
  let bytes = 0;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    files += 1;
    bytes += fs.statSync(path.join(root, entry.name)).size;
  }
  return { files, bytes };
}

function main(): void {
  const size = Number.parseInt(process.argv[2] ?? '10000', 10);
  if (!Number.isSafeInteger(size) || size < 100 || size > 200_000) throw new Error('size must be 100..200000');

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-review-scale-'));
  fs.chmodSync(root, 0o700);

  // The corpus the reviewer surface will page over. Bounded well below the
  // store size: a real operator reviews a few hundred findings while the
  // store accumulates every generation of every one of them.
  const corpusSize = Math.min(500, size);
  const corpus = reviewerCorpus(corpusSize);
  const writer = new ReviewStore({ root });

  // Seed: every corpus finding gets a current review, then generations are
  // added until the store reaches `size`. One finding gets a deep history so
  // the history measurement is not a one-row lookup.
  let written = 0;
  const at = (index: number): string =>
    `2026-09-05T${String(10 + Math.floor(index / 3600) % 12).padStart(2, '0')}:${String(Math.floor(index / 60) % 60).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}Z`;
  const put = (dossier: CorpusFinding): void => {
    writer.putDecision({
      binding: reviewBindingFor(dossier, { campaignId: CAMPAIGN }),
      decision: written % 3 === 0 ? 'ACCEPT_EVIDENCE' : written % 3 === 1 ? 'REQUEST_FOLLOWUP' : 'MARK_INSUFFICIENT',
      reviewedAt: at(written),
      storedAt: at(written),
      rationale: 'local triage',
    });
    written += 1;
  };

  for (const dossier of corpus) put(dossier);
  const deepFinding = corpus[0] as CorpusFinding;
  for (let generation = 1; generation < DEEP_HISTORY_GENERATIONS; generation += 1) {
    put({ ...deepFinding, contentDigest: `${deepFinding.contentDigest}-gen-${generation}` } as CorpusFinding);
  }
  // Historical generations spread across the corpus until the store is full.
  let filler = 0;
  while (written < size) {
    const dossier = corpus[filler % corpus.length] as CorpusFinding;
    put({ ...dossier, contentDigest: `${dossier.contentDigest}-hist-${filler}` } as CorpusFinding);
    filler += 1;
  }

  const footprint = storeFootprint(root);
  const reader = new ReviewStore({ root, createIfMissing: false });
  const authority = new ControlCenterReviewStoreAuthority({ root });
  const context = { dossiers: corpus, campaignId: CAMPAIGN };

  const discovery = timed(5, () => { reader.entries(); });
  const shallow = timed(3, () => { inventoryReviewStore(reader, { depth: 'SHALLOW' }); });
  const deep = timed(3, () => { inventoryReviewStore(reader); });
  const deepResolved = timed(3, () => { authority.inventory({ context }); });

  const history = timed(20, () => { reviewHistoryFor(reader, deepFinding.candidateId, currentReviewArtifacts(deepFinding, { campaignId: CAMPAIGN })); });
  const historyDocument = reviewHistoryFor(reader, deepFinding.candidateId, currentReviewArtifacts(deepFinding, { campaignId: CAMPAIGN }));

  // The page a reviewer actually opens: fifty rows WITH the review store
  // wired in. Measuring an unwired page here would flatter the store by
  // measuring the one surface it does not touch.
  const reviewWriteAuthority = new ControlCenterReviewAuthority({ root });
  const reviewerPage = timed(3, () => {
    projectReviewer(
      reviewerInputsFromFindings({
        dossiers: corpus,
        campaignId: CAMPAIGN,
        limit: 50,
        localReviewLookup: reviewWriteAuthority.localReviewLookup({ campaignId: CAMPAIGN }),
        reviewIdentityFor: (dossier) => reviewWriteAuthority.identityFor(dossier, { campaignId: CAMPAIGN }),
      }),
      50
    );
  });

  const inventoryDocument = authority.inventory({ context });
  const wire = projectReviewStoreInventory(inventoryDocument);
  const serialized = JSON.stringify(wire);
  const json = timed(20, () => { JSON.stringify(projectReviewStoreInventory(inventoryDocument)); });

  // Peak RSS after everything above. Measured, not predicted.
  const memory = process.memoryUsage();

  process.stdout.write(
    `${JSON.stringify({
      size,
      corpusSize,
      storeFiles: footprint.files,
      storeBytes: footprint.bytes,
      bytesPerReview: Math.round(footprint.bytes / Math.max(1, footprint.files)),
      discovery,
      shallowInventory: shallow,
      deepInventory: deep,
      deepInventoryWithCurrentness: deepResolved,
      historyLookup: history,
      historyGenerations: historyDocument.page.total,
      historyRows: historyDocument.generations.length,
      reviewerPage,
      jsonSerialize: json,
      wirePayloadBytes: serialized.length,
      inventoryRows: wire.findings.length,
      validArtifacts: inventoryDocument.counts.validArtifacts,
      uniqueFindings: inventoryDocument.counts.uniqueFindings,
      currentArtifacts: inventoryDocument.counts.byCurrentness.CURRENT,
      staleArtifacts: inventoryDocument.counts.byCurrentness.STALE,
      peakRssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
    })}\n`
  );

  fs.rmSync(root, { recursive: true, force: true });
}

main();
