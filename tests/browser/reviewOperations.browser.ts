// Review operations — the operator workflow in a real browser.
//
// The inventory is a read-only view over a store that is designed to grow
// forever and never delete evidence. Three things have to hold when a person
// is actually driving it, and none of them is provable from a unit test:
//
//   the surface offers no way to change the store, and running it does not;
//   CURRENT and HISTORICAL are distinguishable in the rendered page, in words
//     rather than in colour;
//   nothing reaches the network.
//
// The built UI is served by the real Control Center server over loopback, and
// every request the page makes is asserted to stay on 127.0.0.1.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createControlCenterServer, type ControlCenterServerHandle } from '../../src/controlCenter/server/server';
import { createControlCenterServices } from '../../src/controlCenter/server/defaultCollector';
import { ControlCenterReviewStoreAuthority } from '../../src/controlCenter/authorities/reviewStoreAuthority';
import { ControlCenterReviewAuthority } from '../../src/controlCenter/authorities/reviewWriteAuthority';
import { reviewBindingFor } from '../../src/controlCenter/authorities/reviewBinding';
import { ReviewStore } from '../../src/core/reviewStore';
import type { FindingsAuthority, FindingsAuthoritySnapshot, FindingsDossierMetadata } from '../../src/controlCenter/authorities/findingsAuthority';
import type { CampaignAuthority } from '../../src/controlCenter/authorities/campaignAuthority';
import { reviewerCorpus } from '../helpers/reviewerCorpus';

const UI_ROOT = path.resolve(process.cwd(), 'ui/control-center/dist');
const CAMPAIGN = 'browser-review-ops-campaign';
const CLOCK = () => new Date('2026-09-05T12:00:00Z');
/** Enough loops that a leak, a stale cache or a growing DOM would show. */
const LOOPS = 30;

function tempStoreRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-review-ops-browser-'));
  fs.chmodSync(root, 0o700);
  return root;
}

function findingsAuthorityOver(dossiers: readonly FindingsDossierMetadata[]): FindingsAuthority {
  return {
    snapshot: (): FindingsAuthoritySnapshot => ({
      schemaVersion: 'nightwatch.control-center-findings-authority.v1',
      state: 'AVAILABLE',
      dossiers,
      generation: 'browser-generation',
      reasonCodes: [],
    }),
  };
}

/**
 * A campaign authority whose snapshot actually VALIDATES.
 *
 * The collector runs every authority snapshot through a shape check and falls
 * back to an unavailable one — whose `generation` is null — when it fails. A
 * `{ generation }`-only stub therefore silently becomes "no campaign", and
 * every review seeded against the real campaign id reads STALE for a reason
 * that has nothing to do with what the test is about. That cost an hour here,
 * and the sibling reviewer suite never hit it because its decisions are
 * submitted THROUGH the server, so both sides use the same fallback.
 */
function campaignAuthorityStub(): CampaignAuthority {
  return {
    snapshot: () => ({
      schemaVersion: 'nightwatch.control-center-campaign-authority.v1',
      state: 'AVAILABLE',
      sourceCurrentness: 'CURRENT',
      plan: null,
      coverage: null,
      findingCount: 0,
      blockerCodes: [],
      sourceCurrentnessByMemberId: {},
      sourceGeneration: null,
      generation: CAMPAIGN,
    }),
  } as unknown as CampaignAuthority;
}

interface Served {
  readonly handle: ControlCenterServerHandle;
  readonly origin: string;
}

/**
 * `withWriteAuthority: false` models a Control Center with no review write
 * authority configured — the collector's documented opt-in default.
 *
 * It matters for more than coverage: constructing the WRITE authority creates
 * the store root, because its ReviewStore is built writable and
 * `ensureOwnerDirectory` mkdirs on construction. So "the store does not
 * exist" is only reachable when nothing has ever been able to write one,
 * which is exactly the configuration this models.
 */
async function serve(
  root: string,
  dossiers: readonly FindingsDossierMetadata[],
  options: { readonly withWriteAuthority?: boolean } = {}
): Promise<Served> {
  const services = createControlCenterServices({
    findingsAuthority: findingsAuthorityOver(dossiers),
    campaignAuthority: campaignAuthorityStub(),
    ...(options.withWriteAuthority === false ? {} : { reviewAuthority: new ControlCenterReviewAuthority({ root, now: CLOCK }) }),
    // Injected so the browser lane reads the temporary store rather than the
    // operator's real one.
    reviewStoreAuthority: new ControlCenterReviewStoreAuthority({ root }),
    runReader: { snapshot: () => ({ state: 'UNAVAILABLE', records: [], generation: null, reasonCodes: [] }) } as never,
    runSnapshotTtlMs: 0,
    sourceSnapshotTtlMs: 0,
  });
  const handle = createControlCenterServer({
    collector: services.collector,
    ...(services.reviewDecision === null ? {} : { reviewDecision: services.reviewDecision }),
    port: 0,
    uiRoot: UI_ROOT,
  });
  const address = await handle.start();
  return { handle, origin: `http://127.0.0.1:${address.port}` };
}

interface Guard {
  readonly external: string[];
  readonly errors: string[];
  readonly failedRequests: string[];
}

function guardAgainstEgress(page: Page): Guard {
  const external: string[] = [];
  const errors: string[] = [];
  const failedRequests: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:')) external.push(request.url());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) failedRequests.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text());
  });
  return { external, errors, failedRequests };
}

/**
 * `/api/v1/events` is the ONLY endpoint whose failures are tolerated, and only
 * because it is a long-lived stream this workflow repeatedly interrupts.
 * Every other endpoint stays strict, because suppressing the whole check
 * would hide a failing inventory read behind an unrelated known bound.
 */
function unexpectedFailures(guard: Guard): readonly string[] {
  return guard.failedRequests.filter((entry) => !entry.endsWith(' /api/v1/events'));
}

let inventoryRetries = 0;

/** Open the review-store view, retrying ONCE through the surface's own control. */
async function openReviewStore(page: Page, origin: string): Promise<void> {
  await page.goto(`${origin}/#review-store`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'Review Store' }).click({ force: true });
  const heading = page.getByRole('heading', { name: 'See what the store holds, and change none of it.' });
  if (await heading.isVisible().catch(() => false)) return;
  const unavailable = page.getByText('Review store unavailable');
  if (await unavailable.isVisible().catch(() => false)) {
    // Counted, and asserted small. A silent unlimited retry would turn a
    // genuinely broken surface into a slow pass.
    inventoryRetries += 1;
    await page.getByRole('button', { name: 'Retry' }).click({ force: true });
  }
  await expect(heading).toBeVisible();
}

function findingRow(page: Page, findingId: string) {
  return page
    .getByRole('table')
    .filter({ has: page.getByRole('columnheader', { name: 'Generations', exact: true }) })
    .getByRole('row')
    .filter({ has: page.getByText(findingId, { exact: true }) });
}

/** The generation table in the history panel, by its own column set. */
function generationTable(page: Page) {
  return page
    .getByRole('table')
    .filter({ has: page.getByRole('columnheader', { name: 'Generation', exact: true }) });
}

function generationRow(page: Page, label: 'CURRENT REVIEW' | 'HISTORICAL REVIEW') {
  return generationTable(page).getByRole('row').filter({ has: page.getByText(label, { exact: true }) });
}

/** A snapshot of every observable property of the store directory. */
function storeSnapshot(root: string): string {
  return JSON.stringify(
    fs.readdirSync(root).sort().map((name) => {
      const stat = fs.lstatSync(path.join(root, name));
      return { name, size: stat.size, mode: stat.mode, mtimeMs: stat.mtimeMs, ino: stat.ino };
    })
  );
}

test('the operator inspects the store, its history and a filing report without changing any of it', async ({ page }) => {
  test.setTimeout(600_000);
  expect(fs.existsSync(path.join(UI_ROOT, 'index.html'))).toBe(true);

  const root = tempStoreRoot();
  const dossiers = reviewerCorpus(6, { newestFirstIds: false });
  const target = dossiers[0] as FindingsDossierMetadata;
  const unreviewed = dossiers[1] as FindingsDossierMetadata;
  const guard = guardAgainstEgress(page);

  // Seed the store directly: two generations of one finding, so the history
  // has something to distinguish. The FIRST binds to the dossier the server
  // will serve, the second does not — so the view must show one CURRENT and
  // one HISTORICAL, and must not pick the newest.
  const writer = new ReviewStore({ root });
  writer.putDecision({
    binding: reviewBindingFor(target, { campaignId: CAMPAIGN }),
    decision: 'ACCEPT_EVIDENCE',
    reviewedAt: '2026-09-01T10:00:00Z',
    storedAt: '2026-09-01T10:00:00Z',
    rationale: 'reviewed against the current dossier',
  });
  writer.putDecision({
    binding: reviewBindingFor({ ...target, contentDigest: `cc-dossier-content:sha256:${'e'.repeat(24)}` } as FindingsDossierMetadata, { campaignId: CAMPAIGN }),
    decision: 'MARK_INSUFFICIENT',
    reviewedAt: '2026-09-05T10:00:00Z',
    storedAt: '2026-09-05T10:00:00Z',
    rationale: 'reviewed against a different generation',
  });
  // A file Nightwatch did not write. It must be counted, never named, and
  // still be here when the workflow finishes.
  const stranger = 'customer-CUSTOMER_SENTINEL-invoice.json';
  fs.writeFileSync(path.join(root, stranger), '{"secret":"CUSTOMER_SENTINEL"}', { mode: 0o600 });

  const before = storeSnapshot(root);
  let served = await serve(root, dossiers);

  try {
    // --- the inventory ---------------------------------------------------
    await openReviewStore(page, served.origin);
    await expect(page.getByText('Historical evidence is present. This is the store working as designed, not a fault.')).toBeVisible();
    await expect(page.getByText('A name Nightwatch did not choose is never echoed. These files are not opened, not interpreted, and not removed.')).toBeVisible();
    // The stranger's name never reaches the rendered page.
    expect(await page.content()).not.toContain('CUSTOMER_SENTINEL');
    expect(await page.content()).not.toContain('invoice');
    // No destructive control exists on the surface.
    for (const label of ['Delete', 'Remove', 'Prune', 'Repair', 'Archive', 'Clean']) {
      await expect(page.getByRole('button', { name: new RegExp(label, 'i') }), label).toHaveCount(0);
    }

    // --- drill into the generation history --------------------------------
    await findingRow(page, target.candidateId).getByRole('button', { name: /History/ }).click({ force: true });
    await expect(page.getByRole('heading', { name: target.candidateId })).toBeVisible();

    // --- current vs historical, in WORDS ----------------------------------
    // Scoped to the generation table: the metric card label "Current review"
    // renders uppercase through CSS, and an unscoped locator matches it.
    await expect(generationRow(page, 'CURRENT REVIEW')).toHaveCount(1);
    await expect(generationRow(page, 'HISTORICAL REVIEW')).toHaveCount(1);
    await expect(generationTable(page).getByText('binds to the current artifact', { exact: true })).toBeVisible();
    await expect(generationTable(page).getByText('does not bind to the current artifact', { exact: true })).toBeVisible();
    // The CURRENT one is the OLDER generation, because it is the one that
    // binds — not the newest, which is what a recency guess would pick.
    await expect(generationRow(page, 'CURRENT REVIEW').getByText('Accept Evidence')).toBeVisible();
    await expect(generationRow(page, 'HISTORICAL REVIEW').getByText('Mark Insufficient')).toBeVisible();

    // --- the filing report -------------------------------------------------
    await page.getByRole('button', { name: /Filing report/ }).click({ force: true });
    const report = page.getByTestId('filing-report');
    await expect(report).toBeVisible();
    const reportText = (await report.textContent()) ?? '';
    expect(reportText).toContain('## Local review (FACT: current local decision, not organizational sign-off)');
    expect(reportText).toContain('a Leslie genuine verdict');
    expect(reportText).toContain('a Pondr approval');
    expect(reportText).toContain('PRIVATE/LOCAL artifact.');
    await expect(page.getByText(/Nothing here submits it anywhere/)).toBeVisible();

    // --- back to the reviewer, and back again ------------------------------
    await page.getByRole('link', { name: 'Reviewer' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'Separate what was proved from what is suggested.' })).toBeVisible();
    await page.getByRole('link', { name: 'Review Store' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'See what the store holds, and change none of it.' })).toBeVisible();

    // --- a finding with no stored review ------------------------------------
    await expect(findingRow(page, unreviewed.candidateId)).toHaveCount(0);

    // --- the loop ------------------------------------------------------------
    for (let loop = 0; loop < LOOPS; loop += 1) {
      await openReviewStore(page, served.origin);
      await findingRow(page, target.candidateId).getByRole('button', { name: /History/ }).click({ force: true });
      await expect(generationRow(page, 'CURRENT REVIEW')).toHaveCount(1);
      await expect(generationRow(page, 'HISTORICAL REVIEW')).toHaveCount(1);
      await page.getByRole('button', { name: /Filing report/ }).click({ force: true });
      await expect(page.getByTestId('filing-report')).toBeVisible();

      // Reload against the LIVE server, and wait for the view before doing
      // anything else: the point of the reload is that the state survives it.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'See what the store holds, and change none of it.' })).toBeVisible();

      // Every fifth loop, restart the server over the SAME store: the view is
      // a projection of durable state, not of a process's memory.
      if (loop % 5 === 4) {
        // Park the page first. A page left pointing at a server that is
        // about to close keeps its snapshot fetches and its EventSource in
        // flight, and they land as 502s that have nothing to do with the
        // surface under test — which would either fail the containment
        // assertion or, worse, get it relaxed until it proved nothing.
        await page.goto('about:blank', { waitUntil: 'domcontentloaded' });
        await served.handle.close();
        served = await serve(root, dossiers);
      }
    }

    // --- the store is byte-identical -----------------------------------------
    // The whole claim of this surface, checked against every observable
    // property including inode and mtime: thirty loops of reading changed
    // nothing at all.
    expect(storeSnapshot(root)).toBe(before);
    expect(fs.existsSync(path.join(root, stranger))).toBe(true);

    // --- containment ----------------------------------------------------------
    expect(guard.external, `external requests: ${guard.external.join(', ')}`).toEqual([]);
    expect(guard.errors, `page errors: ${guard.errors.join(' | ')}`).toEqual([]);
    expect(unexpectedFailures(guard), `failed requests: ${guard.failedRequests.join(', ')}`).toEqual([]);
    // The retry affordance exists for a transient local fetch abort. If it is
    // being used constantly, the surface is broken and the loop is hiding it.
    expect(inventoryRetries, `inventory retries across ${LOOPS} loops`).toBeLessThan(5);
  } finally {
    await served.handle.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('an unavailable review store is reported honestly rather than as an empty one', async ({ page }) => {
  test.setTimeout(120_000);
  const root = path.join(tempStoreRoot(), 'never-created');
  const dossiers = reviewerCorpus(3, { newestFirstIds: false });
  const guard = guardAgainstEgress(page);
  const served = await serve(root, dossiers, { withWriteAuthority: false });
  try {
    await openReviewStore(page, served.origin);
    await expect(page.getByText('The review store is not present. No claim is made about its contents.')).toBeVisible();
    await expect(page.getByText('The store could not be read. No claim is made about its contents.')).toBeVisible();
    expect(guard.external).toEqual([]);
    expect(unexpectedFailures(guard)).toEqual([]);
  } finally {
    await served.handle.close();
  }
});
