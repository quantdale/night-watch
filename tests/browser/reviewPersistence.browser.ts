// Owner-local review persistence — the reviewer workflow in a real browser.
//
// Persistence is not complete when a unit test can read a file back. It is
// complete when a reviewer opens the surface, decides, reloads, navigates
// away and back, and — after the local server has been stopped and a new one
// started over the same store — still sees the decision they made. Everything
// below is that sentence, executed.
//
// The built UI is served by the real Control Center server over loopback, and
// every request the page makes is asserted to stay on 127.0.0.1. A review
// surface that reached the network would be a safety failure, not a bug.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createControlCenterServer, type ControlCenterServerHandle } from '../../src/controlCenter/server/server';
import { createControlCenterServices } from '../../src/controlCenter/server/defaultCollector';
import { ControlCenterReviewAuthority } from '../../src/controlCenter/authorities/reviewWriteAuthority';
import type { FindingsAuthority, FindingsAuthoritySnapshot, FindingsDossierMetadata } from '../../src/controlCenter/authorities/findingsAuthority';
import type { CampaignAuthority } from '../../src/controlCenter/authorities/campaignAuthority';
import { reviewerCorpus } from '../helpers/reviewerCorpus';

const UI_ROOT = path.resolve(process.cwd(), 'ui/control-center/dist');
const CAMPAIGN = 'browser-review-campaign';
const CLOCK = () => new Date('2026-09-05T12:00:00Z');

function tempStoreRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-review-browser-'));
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

/** Minimal campaign authority: the reviewer path reads only `generation`. */
function campaignAuthorityStub(): CampaignAuthority {
  return { snapshot: () => ({ generation: CAMPAIGN }) } as unknown as CampaignAuthority;
}

interface Served {
  readonly handle: ControlCenterServerHandle;
  readonly origin: string;
}

async function serve(
  root: string,
  dossiers: readonly FindingsDossierMetadata[],
  options: { readonly maxSseClients?: number } = {}
): Promise<Served> {
  const reviewAuthority = new ControlCenterReviewAuthority({ root, now: CLOCK });
  const findingsAuthority = findingsAuthorityOver(dossiers);
  const campaignAuthority = campaignAuthorityStub();
  // ONE services object, so the reviewer read and the decision write derive
  // the campaign identity from the same snapshot. Building them separately is
  // what produced a systematic BINDING_MISMATCH the first time this ran.
  const services = createControlCenterServices({
    findingsAuthority,
    campaignAuthority,
    reviewAuthority,
    runReader: { snapshot: () => ({ state: 'UNAVAILABLE', records: [], generation: null, reasonCodes: [] }) } as never,
    runSnapshotTtlMs: 0,
    sourceSnapshotTtlMs: 0,
  });
  const handle = createControlCenterServer({
    collector: services.collector,
    ...(services.reviewDecision === null ? {} : { reviewDecision: services.reviewDecision }),
    port: 0,
    uiRoot: UI_ROOT,
    ...(options.maxSseClients === undefined ? {} : { maxSseClients: options.maxSseClients }),
  });
  const address = await handle.start();
  return { handle, origin: `http://127.0.0.1:${address.port}` };
}

/** How many times the reviewer snapshot had to be retried across a run. */
let reviewerRetries = 0;

/**
 * Click a decision button.
 *
 * `dispatchEvent` rather than a real click, with one retry on a fresh
 * locator — the same idiom the existing Control Center browser suite uses.
 * The reviewer view re-renders on its background refresh and on server
 * events, so a located row can be detached between locate and click; a plain
 * click then lands on nothing and produces neither a decision nor a refusal,
 * which is the least diagnosable outcome available.
 */
async function clickDecision(page: Page, findingId: string, decision: string): Promise<void> {
  const button = rowFor(page, findingId).getByRole('button', { name: decision, exact: true });
  await expect(button).toBeVisible();
  try {
    await button.dispatchEvent('click');
  } catch {
    await rowFor(page, findingId).getByRole('button', { name: decision, exact: true }).dispatchEvent('click');
  }
}

/** Wait for a decision to resolve either way, and fail loudly on a refusal. */
async function expectDecisionAccepted(page: Page, findingId: string): Promise<void> {
  const decided = rowFor(page, findingId).getByText('Decided');
  const refused = rowFor(page, findingId).getByText(/^Refused: /);
  await expect(decided.or(refused)).toBeVisible({ timeout: 30_000 });
  if (await refused.isVisible().catch(() => false)) {
    throw new Error(`decision refused for ${findingId}: ${await refused.textContent()}`);
  }
}

/**
 * Open the reviewer view.
 *
 * A reload issued while the previous page's reviewer fetch is still in flight
 * aborts it, and the view then shows its documented "Reviewer intelligence
 * unavailable" state with a Retry control. Under the full browser lane —
 * where this workflow reloads thirty times alongside the other suites — that
 * happens occasionally. It is a transient local fetch abort, not a
 * persistence failure, so it is retried ONCE through the surface's own retry
 * affordance rather than waited out with a sleep.
 *
 * The retry is counted, and the tests assert the count stays small. A silent
 * unlimited retry would turn a genuinely broken reviewer into a slow pass.
 */
async function openReviewer(page: Page, origin: string): Promise<void> {
  await page.goto(`${origin}/#reviewer`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'Reviewer' }).click({ force: true });
  const heading = page.getByRole('heading', { name: 'Separate what was proved from what is suggested.' });
  if (await heading.isVisible().catch(() => false)) return;

  const unavailable = page.getByText('Reviewer intelligence unavailable');
  if (await unavailable.isVisible().catch(() => false)) {
    reviewerRetries += 1;
    await page.getByRole('button', { name: 'Retry' }).click({ force: true });
  }
  await expect(heading).toBeVisible();
}

/**
 * The reviewer-index row for one finding.
 *
 * Scoped to the table carrying the Decision column: the view also renders a
 * "Recommendations, not decisions" table keyed by the same finding id, so an
 * unscoped row locator matches two rows and the strict-mode violation is
 * correct — the test would otherwise have been asserting about whichever row
 * happened to come first.
 */
function reviewerTable(page: Page) {
  return page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Decision', exact: true }) });
}

function rowFor(page: Page, findingId: string) {
  return reviewerTable(page).getByRole('row').filter({ has: page.getByText(findingId, { exact: true }) });
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
    // Console errors are attributed by RESPONSE rather than by text: the
    // browser's "Failed to load resource" line names no path, so asserting on
    // it would either be vacuous or unexplainable.
    if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text());
  });
  return { external, errors, failedRequests };
}

/**
 * `/api/v1/events` is the ONLY endpoint whose failures are permitted here,
 * and only because it is a long-lived stream that this workflow repeatedly
 * interrupts. Thirty reloads leave previous EventSources briefly un-reaped,
 * so the hub's deliberate eight-client bound answers 503; and a reload that
 * lands mid-connect aborts the stream, which the browser reports as 502.
 * Both are the stream behaving correctly under a workload that is not a
 * realistic single reviewer's.
 *
 * Every OTHER endpoint stays strict. Suppressing the whole check would have
 * hidden a failing reviewer read or decision write behind an unrelated known
 * bound, which is the entire value of the assertion.
 */
function unexpectedFailures(guard: Guard): readonly string[] {
  return guard.failedRequests.filter((entry) => !entry.endsWith(' /api/v1/events'));
}

test('the reviewer records a local decision that survives reload, navigation and a server restart', async ({ page }) => {
  test.setTimeout(180_000);
  expect(fs.existsSync(path.join(UI_ROOT, 'index.html'))).toBe(true);

  const root = tempStoreRoot();
  const dossiers = reviewerCorpus(6, { newestFirstIds: false });
  const target = dossiers[0] as FindingsDossierMetadata;
  const untouched = dossiers[1] as FindingsDossierMetadata;
  const guard = guardAgainstEgress(page);

  let served = await serve(root, dossiers);
  try {
    // --- open the reviewer, and see an honest absence -------------------
    await openReviewer(page, served.origin);
    await expect(rowFor(page, target.candidateId)).toBeVisible();
    await expect(rowFor(page, target.candidateId).getByText('No Local Review')).toBeVisible();
    await expect(rowFor(page, target.candidateId).getByRole('button', { name: 'Accept Evidence' })).toBeVisible();

    // The store really is empty at this point.
    expect(fs.readdirSync(root)).toEqual([]);

    // --- submit a local decision ---------------------------------------
    await rowFor(page, target.candidateId).getByRole('textbox').fill('Replay reproduced the projection mismatch.');
    await clickDecision(page, target.candidateId, 'Accept Evidence');
    // The durable outcome, not the transient confirmation: a successful
    // decision refreshes the surface, and the refreshed row replaces the
    // "Recorded locally" line with the terminal state. Asserting the message
    // would be racing the refresh that proves the write actually landed.
    // The message itself is covered by the UI unit tests, which hold the
    // snapshot still.
    await expectDecisionAccepted(page, target.candidateId);

    // It reached the owner-local store, outside the repository.
    const written = fs.readdirSync(root);
    expect(written).toHaveLength(1);
    expect(written[0]).toMatch(/^review\.[0-9a-f]{12}\.[0-9a-f]{24}\.json$/);

    // --- reload: the decision is still there ---------------------------
    await page.reload({ waitUntil: 'domcontentloaded' });
    await openReviewer(page, served.origin);
    await expect(rowFor(page, target.candidateId).getByText('Decided')).toBeVisible();
    // Twice, legitimately: once in the Local review cell as the recorded
    // decision, once in the Decision cell as the receipt.
    await expect(rowFor(page, target.candidateId).getByText('Accept Evidence', { exact: true })).toHaveCount(2);
    await expect(rowFor(page, target.candidateId).getByText('Binding Current')).toBeVisible();
    // Terminal: the controls are gone, not merely disabled.
    await expect(rowFor(page, target.candidateId).getByRole('button', { name: 'Accept Evidence' })).toHaveCount(0);
    await expect(rowFor(page, target.candidateId).getByText('Terminal. A second decision is refused by the server.')).toBeVisible();

    // An unreviewed neighbour is unaffected and still says so.
    await expect(rowFor(page, untouched.candidateId).getByText('No Local Review')).toBeVisible();

    // --- navigate away and back ----------------------------------------
    await page.getByRole('link', { name: 'Findings' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'Separate what was proved from what is suggested.' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Reviewer' }).click({ force: true });
    await expect(rowFor(page, target.candidateId).getByText('Decided')).toBeVisible();

    // --- restart the local server over the SAME store -------------------
    await served.handle.close();
    served = await serve(root, dossiers);
    await openReviewer(page, served.origin);
    await expect(rowFor(page, target.candidateId).getByText('Decided')).toBeVisible();
    await expect(rowFor(page, target.candidateId).getByText('Binding Current')).toBeVisible();

    // --- the reviewed artifact changes: the decision goes stale ---------
    await served.handle.close();
    const regenerated = dossiers.map((dossier) =>
      dossier.candidateId === target.candidateId
        ? ({ ...dossier, contentDigest: `cc-dossier-content:sha256:${'f'.repeat(24)}` } as FindingsDossierMetadata)
        : dossier
    );
    served = await serve(root, regenerated);
    await openReviewer(page, served.origin);

    // Shown, and shown as not-live. The stored receipt was NOT deleted.
    await expect(rowFor(page, target.candidateId).getByText('Binding Stale')).toBeVisible();
    await expect(rowFor(page, target.candidateId).getByText('Local Review Stale')).toBeVisible();
    expect(fs.readdirSync(root)).toHaveLength(1);
    // The current artifacts are unreviewed, so a decision is offered again.
    await expect(rowFor(page, target.candidateId).getByRole('button', { name: 'Accept Evidence' })).toBeVisible();

    // Deciding again creates a SECOND generation; the first survives.
    await clickDecision(page, target.candidateId, 'Request Followup');
    await expectDecisionAccepted(page, target.candidateId);
    expect(fs.readdirSync(root)).toHaveLength(2);

    // --- nothing left the machine --------------------------------------
    expect(guard.external).toEqual([]);
    expect(guard.errors).toEqual([]);
    expect(unexpectedFailures(guard)).toEqual([]);
    // And the surface never claimed organizational authority.
    const body = (await page.textContent('body')) ?? '';
    expect(body).not.toContain('LESLIE_GENUINE');
    expect(body).not.toContain('PONDR_APPROVED');
    expect(body).toContain('Owner-local only. Never organizational sign-off.');
  } finally {
    await served.handle.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('the reviewer persistence workflow holds over 30 consecutive decisions', async ({ page }) => {
  test.setTimeout(600_000);

  const root = tempStoreRoot();
  // 30 distinct findings, so each pass is a genuinely new decision rather
  // than the same one re-observed.
  const dossiers = reviewerCorpus(30, { newestFirstIds: false });
  const guard = guardAgainstEgress(page);
  // A RAISED event-stream bound, for this test only.
  //
  // The hub's default is eight concurrent clients, and a reload leaves the
  // previous EventSource briefly un-reaped. Thirty rapid reloads exhaust that
  // bound, and the resulting reconnect storm keeps the reviewer list
  // re-rendering hard enough that decision clicks land on detached rows —
  // which showed up as a decision producing neither a success nor a refusal,
  // progressively later in the run as pressure built.
  //
  // Thirty reloads in four minutes is not a realistic single reviewer, so the
  // bound is raised HERE rather than the surface being changed to suit the
  // harness. The default bound stays exercised by the primary workflow test
  // above, whose failed-request allowance documents it.
  const served = await serve(root, dossiers, { maxSseClients: 64 });

  try {
    let passes = 0;
    for (const dossier of dossiers) {
      await openReviewer(page, served.origin);
      const row = rowFor(page, dossier.candidateId);
      await expect(row.getByText('No Local Review')).toBeVisible();

      await clickDecision(page, dossier.candidateId, 'Accept Evidence');
      await expectDecisionAccepted(page, dossier.candidateId);

      // Re-read from the server, not from the optimistic client state.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await openReviewer(page, served.origin);
      await expect(rowFor(page, dossier.candidateId).getByText('Decided')).toBeVisible();
      await expect(rowFor(page, dossier.candidateId).getByText('Binding Current')).toBeVisible();
      passes += 1;

      // The store grows by exactly one per pass: no pass silently overwrote
      // an earlier one, which a store keyed on the finding id would have.
      expect(fs.readdirSync(root)).toHaveLength(passes);
    }

    expect(passes).toBe(30);
    expect(fs.readdirSync(root)).toHaveLength(30);
    // The retry is an allowance for an aborted fetch, not a way to make a
    // broken reviewer pass slowly. Over 60+ opens it must stay rare.
    expect(reviewerRetries).toBeLessThan(10);

    // Every decision is still current after the whole run.
    await openReviewer(page, served.origin);
    for (const dossier of dossiers) {
      await expect(rowFor(page, dossier.candidateId).getByText('Decided')).toBeVisible();
    }

    expect(guard.external).toEqual([]);
    expect(guard.errors).toEqual([]);
    // Every reviewer read and every decision write succeeded across the run;
    // the only permitted failures are the bounded event-stream refusals.
    expect(unexpectedFailures(guard)).toEqual([]);
  } finally {
    await served.handle.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
