// ---------------------------------------------------------------------------
// Owner-local review persistence — scale probe.
//
// Not a `.test.ts`: this is run by bin/review-persistence-scale.mjs in ONE
// FRESH OS PROCESS PER CELL, so no cell's numbers are flattered by another
// cell's warm JIT or settled heap.
//
// It measures the SERVED path — the authority plus the projection, with the
// review store wired in exactly as the collector wires it — across corpus
// sizes and review-store populations. The question is not "is persistence
// fast" but "does persistence change the shape of the served path", so the
// same page is measured with 0%, 10%, 50% and 100% of the corpus reviewed.
//
// It measures. It makes no pass/fail claim beyond completing.
//
// Usage: node reviewPersistenceScaleProbe.js <size> <reviewedPercent>
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { projectReviewer } from '../../src/controlCenter/adapters/reviewerAdapter';
import { reviewerInputsFromFindings } from '../../src/controlCenter/authorities/reviewerAuthority';
import { ControlCenterReviewAuthority } from '../../src/controlCenter/authorities/reviewWriteAuthority';
import { reviewBindingFor } from '../../src/controlCenter/authorities/reviewBinding';
import { ReviewStore } from '../../src/core/reviewStore';
import type { FindingsDossierMetadata } from '../../src/controlCenter/authorities/findingsAuthority';
import { reviewerCorpus } from '../helpers/reviewerCorpus';

const CAMPAIGN = 'review-scale-campaign';
const PAGE_LIMIT = 50;
const REVIEWED_AT = '2026-09-05T10:00:00Z';

function millis(start: bigint): number {
  return Number(process.hrtime.bigint() - start) / 1e6;
}

function directoryBytes(root: string): { readonly files: number; readonly bytes: number } {
  let files = 0;
  let bytes = 0;
  for (const entry of fs.readdirSync(root)) {
    const stat = fs.statSync(path.join(root, entry));
    if (stat.isFile()) {
      files += 1;
      bytes += stat.size;
    }
  }
  return { files, bytes };
}

function main(): void {
  const size = Number.parseInt(process.argv[2] ?? '1000', 10);
  const reviewedPercent = Number.parseInt(process.argv[3] ?? '0', 10);
  if (!Number.isInteger(size) || size < 2 || size > 200_000) throw new Error('size out of range');
  if (!Number.isInteger(reviewedPercent) || reviewedPercent < 0 || reviewedPercent > 100) throw new Error('percent out of range');

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-review-scale-'));
  fs.chmodSync(root, 0o700);

  try {
    // `newestFirstIds: true` reverses identifier order against chronological
    // order, so the served page is the NEWEST findings — the ones with the
    // most history behind them, and the page a reviewer actually opens.
    const corpus: readonly FindingsDossierMetadata[] = reviewerCorpus(size);

    // Populate the store to the requested density. Reviews are spread across
    // the corpus rather than clustered, so the served page is not accidentally
    // all-reviewed or all-unreviewed at any percentage.
    const populateStart = process.hrtime.bigint();
    const store = new ReviewStore({ root });
    let written = 0;
    if (reviewedPercent > 0) {
      const stride = Math.max(1, Math.round(100 / reviewedPercent));
      for (let index = 0; index < corpus.length; index += 1) {
        if (index % stride !== 0) continue;
        store.putDecision({
          binding: reviewBindingFor(corpus[index] as FindingsDossierMetadata, { campaignId: CAMPAIGN }),
          decision: 'ACCEPT_EVIDENCE',
          reviewedAt: REVIEWED_AT,
          storedAt: REVIEWED_AT,
        });
        written += 1;
      }
    }
    const populateMs = millis(populateStart);
    const store2 = directoryBytes(root);

    const authority = new ControlCenterReviewAuthority({ root, now: () => new Date(REVIEWED_AT) });
    const lookup = authority.localReviewLookup({ campaignId: CAMPAIGN });

    // 1. The served page WITHOUT persistence — the predecessor's baseline.
    const baselineStart = process.hrtime.bigint();
    const baseline = projectReviewer(
      reviewerInputsFromFindings({ dossiers: corpus, campaignId: CAMPAIGN, limit: PAGE_LIMIT }),
      PAGE_LIMIT
    );
    const baselineMs = millis(baselineStart);

    // 2. The served page WITH persistence wired exactly as the collector does.
    const servedStart = process.hrtime.bigint();
    const served = projectReviewer(
      reviewerInputsFromFindings({
        dossiers: corpus,
        campaignId: CAMPAIGN,
        limit: PAGE_LIMIT,
        localReviewLookup: lookup,
        reviewIdentityFor: (dossier) => authority.identityFor(dossier, { campaignId: CAMPAIGN }),
      }),
      PAGE_LIMIT
    );
    const servedMs = millis(servedStart);

    // 3. Store lookup alone, for the page, so the persistence cost is
    //    attributable rather than buried in the whole served path.
    const page = served.items.map((item) => item.findingId);
    const byId = new Map(corpus.map((dossier) => [dossier.candidateId, dossier]));
    // A FRESH lookup, so the request-scoped directory listing is paid for
    // inside the measurement rather than reused from the served page above.
    const pageLookup = authority.localReviewLookup({ campaignId: CAMPAIGN });
    const lookupStart = process.hrtime.bigint();
    let resolved = 0;
    for (const findingId of page) {
      const dossier = byId.get(findingId);
      if (dossier !== undefined && pageLookup(dossier) !== null) resolved += 1;
    }
    const lookupMs = millis(lookupStart);

    const currentOnPage = served.items.filter((item) => item.localReview.epistemicClass === 'FACT').length;

    process.stdout.write(
      `${JSON.stringify({
        size,
        reviewedPercent,
        storeFiles: store2.files,
        storeBytes: store2.bytes,
        reviewsWritten: written,
        populateMs: Number(populateMs.toFixed(1)),
        baselinePageMs: Number(baselineMs.toFixed(1)),
        servedPageMs: Number(servedMs.toFixed(1)),
        pageLookupMs: Number(lookupMs.toFixed(2)),
        pageRows: served.items.length,
        pageReviewsResolved: resolved,
        pageCurrentReviews: currentOnPage,
        baselineRows: baseline.items.length,
        peakRssBytes: process.memoryUsage().rss,
      })}\n`
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main();
