// G20 — accessibility certification for the built Control Center composition.
//
// F-20: the only human-facing surface had no accessibility evidence. This
// lane produces it on the BUILT bundle, over the real server and the real
// React composition:
//
//   * every status distinction the composition renders is paired within its
//     component family and must differ in accessible text or in a non-colour
//     computed property; a colour-only pair fails naming both values;
//   * every rendered foreground/background pair and every tone-coded non-text
//     status boundary is measured at its computed size/weight against WCAG
//     2.2 AA, with a reasoned exemption list that fails in both directions;
//   * each operator workflow (navigation, paging, run selection, graph
//     drill-down, filtering, review decision) is executed with the keyboard
//     alone, asserting visible focus, DOM reading order, no pointer-only
//     control and no unintended focus trap;
//   * the existing navigation contract (title set and main focused only for
//     operator navigation) is asserted, because keyboard testing is what
//     would otherwise regress it;
//   * a standard structural audit runs over every rendered view, states its
//     own limit, and never claims certification.
//
// The lane is additive. It changes no existing test and weakens no guard.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createControlCenterServer, type ControlCenterServerHandle } from '../../src/controlCenter/server/server';
import { createControlCenterServices } from '../../src/controlCenter/server/defaultCollector';
import { createCampaignAuthority } from '../../src/controlCenter/authorities/campaignAuthority';
import { ControlCenterReviewAuthority } from '../../src/controlCenter/authorities/reviewWriteAuthority';
import { createSourceAuthorityForTests, type SourceAuthoritySnapshot } from '../../src/controlCenter/authorities/sourceAuthority';
import type { FindingsAuthority, FindingsAuthoritySnapshot, FindingsDossierMetadata } from '../../src/controlCenter/authorities/findingsAuthority';
import type { RunAuthorityInput } from '../../src/controlCenter/adapters/runAdapter';
import type { RunEvidenceReader, RunEvidenceSnapshot } from '../../src/controlCenter/authorities/runEvidenceReader';
import type { ControlCenterCollector } from '../../src/controlCenter/server/collector';
import type { ControlCenterEventDto } from '../../src/controlCenter/contracts/events';
import type { RunEvent, RunSummary } from '../../src/core/evidence/types';
import type { SourcePhase24Integration, SourceSurfaceDiscovery } from '../../src/core/source/surfaces';
import type { RealSourceSurfaceDescriptor } from '../../src/core/source/surfaceTypes';
import type { SystemMapInput } from '../../src/core/systemMap/projections';
import { systemMapLevel, systemMapQuery, LEVEL_FOR_SEGMENT, QUERY_FOR_SEGMENT } from '../../src/controlCenter/adapters/systemMapAdapter';
import type { SystemMapLevelSegment, SystemMapQuerySegment } from '../../src/controlCenter/server/router';
import { provenReadOnlyProof } from '../helpers/readOnlyProofFixtures';
import { reviewerCorpus } from '../helpers/reviewerCorpus';
import {
  STRUCTURAL_AUDIT_LIMIT,
  auditStructure,
  contrastViolations,
  driveTabWalk,
  enumerateContrast,
  focusInventory,
  measureContrast,
  statusDistinctionViolations,
  structuralViolations,
  sweepStatusDistinctions,
  type ContrastExemption,
  type ContrastReport,
  type StatusSweep,
  type StructuralAuditResult,
  type StructuralExemption,
  type TabWalk,
} from './helpers/accessibility';
import { buildPhase24CandidatePortfolio, prioritizePhase24Portfolio, type Phase24CandidateInput } from '../../src/core/phase24';

const UI_ROOT = path.resolve(process.cwd(), 'ui/control-center/dist');
const TIMESTAMP = '2026-09-05T12:00:00.000Z';
const END_TIMESTAMP = '2026-09-05T12:00:01.000Z';
const SOURCE_SHA = 'a'.repeat(40);
const SOURCE_EVIDENCE = `ev:sha256:${'b'.repeat(24)}`;

// ---------------------------------------------------------------------------
// Synthetic authority composition. Deterministic: the same records, the same
// statuses, the same rendered pair set on every run.
// ---------------------------------------------------------------------------

function runRecords(): readonly RunAuthorityInput[] {
  return Array.from({ length: 25 }, (_, index) => {
    const runId = `run-a11y-${String(index + 1).padStart(2, '0')}`;
    const events: readonly RunEvent[] = index === 0
      ? [
          { seq: 1, ts: TIMESTAMP, type: 'start', severity: 'info', message: 'SENTINEL_EVENT_START' },
          { seq: 2, ts: TIMESTAMP, type: 'journey', severity: 'info', message: 'SENTINEL_JOURNEY' },
          { seq: 3, ts: TIMESTAMP, type: 'journey-step', severity: 'warn', message: 'SENTINEL_STEP' },
          { seq: 4, ts: TIMESTAMP, type: 'request', severity: 'info', message: 'SENTINEL_REQUEST' },
          { seq: 5, ts: TIMESTAMP, type: 'response', severity: 'info', message: 'SENTINEL_RESPONSE' },
          { seq: 6, ts: TIMESTAMP, type: 'policy', severity: 'warn', message: 'SENTINEL_POLICY' },
          { seq: 7, ts: TIMESTAMP, type: 'issue', severity: 'error', message: 'SENTINEL_ISSUE' },
          { seq: 8, ts: TIMESTAMP, type: 'oracle', severity: 'warn', message: 'SENTINEL_ORACLE' },
          { seq: 9, ts: END_TIMESTAMP, type: 'end', severity: 'info', message: 'SENTINEL_EVENT_END' },
        ]
      : [
          { seq: 1, ts: TIMESTAMP, type: 'start', severity: 'info', message: 'SENTINEL_EVENT_START' },
          { seq: 2, ts: TIMESTAMP, type: 'end', severity: 'info', message: 'SENTINEL_EVENT_END' },
        ];
    const summary: RunSummary = {
      runId,
      environment: 'LOCAL_SYNTHETIC',
      product: 'synthetic-product',
      browser: 'chromium',
      scenario: `a11y-run-${String(index + 1).padStart(2, '0')}`,
      startedAt: TIMESTAMP,
      endedAt: END_TIMESTAMP,
      durationMs: 1_000,
      passed: true,
      eventCount: events.length,
      counts: { start: 1, end: 1 },
      severityCounts: { info: events.length },
      hardFailures: [],
      screenshots: [],
      nightwatchSha: null,
    };
    return { summary, events };
  });
}

function runReader(records: readonly RunAuthorityInput[]): RunEvidenceReader {
  const snapshot: RunEvidenceSnapshot = {
    state: 'AVAILABLE',
    records: [...records],
    generation: `cc-run-generation:sha256:${'5'.repeat(24)}`,
    reasonCodes: [],
  };
  return {
    snapshot: () => snapshot,
    find: (runId) => records.find((record) => record.summary.runId === runId) ?? null,
  };
}

function sourceSurface(): RealSourceSurfaceDescriptor {
  return {
    schemaVersion: 'nightwatch.real-source-surface-descriptor.v5',
    surfaceId: 'synthetic.surface.read',
    targetId: 'synthetic.target.read',
    operation: {
      operationId: 'synthetic.operation.read',
      repository: 'approved/repo-a',
      sourceSha: SOURCE_SHA,
      sourcePath: 'SENTINEL_SOURCE_PATH.php',
      language: 'PHP',
      evidenceDigest: SOURCE_EVIDENCE,
      method: 'GET',
      routeTemplate: '/synthetic/read',
      handlerSymbol: 'SENTINEL_HANDLER',
      handlerPath: 'SENTINEL_HANDLER_PATH.php',
      requestReference: null,
      responseReference: null,
      transport: 'HTTP_API',
      routeProof: 'PROVEN',
      routeRejectionReason: null,
      readOnlyClassification: 'PROVEN_READ_ONLY',
      runtimeBinding: 'RUNTIME_BOUND_EXACT',
      targetId: 'synthetic.target.read',
      deploymentStatusUnresolved: true,
    },
    source: { repoId: 'approved/repo-a', sha: SOURCE_SHA, evidenceDigest: SOURCE_EVIDENCE },
    relevantFiles: ['SENTINEL_SOURCE_PATH.php'],
    joins: [{ kind: 'ROUTE_HANDLER', fromIdentity: 'SENTINEL_RAW_IDENTITY', toIdentity: 'SENTINEL_RAW_PATH', state: 'PROVEN', evidenceDigest: SOURCE_EVIDENCE }],
    contract: {
      requestContractId: null,
      requestEvidenceDigest: null,
      requestProof: 'MISSING_SYMBOL',
      requestFieldCount: 0,
      responseContractId: null,
      responseEvidenceDigest: null,
      responseProof: 'MISSING_SYMBOL',
      semanticContractIds: [],
      semanticProof: 'MISSING_SYMBOL',
      responseAnalyzerDiagnostics: [],
      responseFlow: null,
      responseDefinitions: [],
    },
    componentProvenance: { state: 'EXACT_COMPONENT', repository: 'approved/repo-a', packageName: 'fixtures', component: 'SENTINEL_COMPONENT', confidence: 'HIGH' },
    currentness: 'CURRENT',
    lifecycle: 'PROJECTABLE',
    projectionCapability: 'PROJECTABLE',
    replayCapability: 'SUPPORTED',
    differentialCapability: 'SUPPORTED',
    exclusionReasons: [],
    sourceEvidence: {
      schemaVersion: 'nightwatch.source-evidence-provenance.v1',
      evidenceClass: 'SOURCE_FACT',
      qualifier: 'DIRECT_SOURCE',
      generationCurrency: null,
      productionAdmission: { state: 'NOT_DENIED_BY_EVIDENCE_CLASS', denialCodes: [] },
    },
    readOnlyProof: provenReadOnlyProof(),
    deterministicDigest: `surface:sha256:${'c'.repeat(24)}`,
  };
}

function phase24Candidate(): Phase24CandidateInput {
  return {
    surfaceKey: 'synthetic.surface.read',
    targetId: 'synthetic.target.read',
    product: 'synthetic-product',
    source: { repoId: 'approved/repo-a', sha: SOURCE_SHA, evidenceDigest: SOURCE_EVIDENCE },
    sourceAvailable: true,
    sourceSnapshotMatches: true,
    relevantFiles: ['SENTINEL_SOURCE_PATH.php'],
    route: { endpointId: 'synthetic.endpoint.read', method: 'GET', routeTemplate: '/synthetic/read', transport: 'SYNTHETIC' },
    routeIdentityProven: true,
    contract: { contractId: 'synthetic.contract.read', requestDigest: `request:sha256:${'d'.repeat(24)}`, responseDigest: `response:sha256:${'e'.repeat(24)}`, version: 'v1' },
    contractIdentityProven: true,
    behaviorOwner: { repository: 'approved/repo-a', packageName: 'fixtures', component: 'SENTINEL_COMPONENT', confidence: 'HIGH' },
    behaviorOwnerProven: true,
    sourceVersion: 'CURRENT',
    semanticExpectationId: 'synthetic.expectation.read',
    semanticContractProven: true,
    semanticPreconditions: ['SOURCE_CURRENT'],
    semanticPreconditionsBound: true,
    materialClass: 'COLLECTION',
    authRequirement: 'NONE',
    environmentRequirement: 'DEV_ONLY',
    mutationClassification: 'NONE',
    readOnlySuitable: true,
    projectionSafe: true,
    replay: { strategy: 'FIRST_REPLAY', planIdentity: 'synthetic.replay.read', maxContexts: 2, prerequisites: ['SOURCE_CURRENT'] },
    expectedEvidenceValue: 'HIGH',
    selectionPriority: 10,
    anticipatedInvariantCount: 1,
  };
}

function sourceSnapshot(): SourceAuthoritySnapshot {
  const portfolio = buildPhase24CandidatePortfolio({ candidates: [phase24Candidate()] });
  const selection = prioritizePhase24Portfolio({ portfolio, maxCandidates: 1 });
  const discovery = {
    surfaces: [sourceSurface()],
    inventory: { repositories: [{ repoId: 'approved/repo-a', status: 'CURRENT' }] },
    deterministicDigest: `discovery:sha256:${'1'.repeat(24)}`,
  } as unknown as SourceSurfaceDiscovery;
  const phase24 = {
    discovery,
    snapshotAnalyses: [],
    portfolio,
    selection,
    deterministicDigest: `integration:sha256:${'2'.repeat(24)}`,
  } as unknown as SourcePhase24Integration;
  return {
    schemaVersion: 'nightwatch.control-center-source-authority.v1',
    state: 'AVAILABLE',
    inventoryDigest: `srcsnapshot:sha256:${'3'.repeat(24)}`,
    repositoryCount: 1,
    repositoryStatuses: [{ repoId: 'approved/repo-a', currentness: 'CURRENT' }],
    discovery,
    phase24,
    generation: `cc-source-generation:sha256:${'4'.repeat(24)}`,
    reasonCodes: [],
  };
}

function findingsAuthorityOver(dossiers: readonly FindingsDossierMetadata[]): FindingsAuthority {
  return {
    snapshot: (): FindingsAuthoritySnapshot => ({
      schemaVersion: 'nightwatch.control-center-findings-authority.v1',
      state: 'AVAILABLE',
      dossiers,
      generation: `cc-findings-generation:sha256:${'7'.repeat(24)}`,
      reasonCodes: [],
    }),
  };
}

/** A product/service/operation chain so L1 has a PRODUCT to drill into. */
function systemMapInput(): SystemMapInput {
  return {
    operations: [{
      operationId: 'op-0',
      repoId: 'approved/repo-a',
      sourceSha: SOURCE_SHA,
      method: 'GET',
      routeTemplate: '/synthetic/read',
      factCategory: 'SOURCE_FACT',
      readOnlyClassification: 'PROVEN_READ_ONLY',
      routeProof: 'PROVEN',
      protoServiceIdentity: 'synthetic.v1.Synthetic',
      blockingStage: 'EFFECT_PROOF',
      blockingReason: 'NO_EFFECT_CLOSURE',
    }],
    serviceBindings: [{
      protoServiceIdentity: 'synthetic.v1.Synthetic',
      serviceDirectory: 'services/synthetic',
      repoId: 'approved/repo-a',
      sourceSha: SOURCE_SHA,
      factCategory: 'SOURCE_FACT',
      proven: true,
    }],
    consumerEdges: [],
    findings: [],
    operationPopulationTotal: 1,
    productOfRepository: { 'approved/repo-a': 'synthetic-product' },
  };
}

interface Served {
  readonly handle: ControlCenterServerHandle;
  readonly origin: string;
  readonly reviewRoot: string;
}

async function serve(): Promise<Served> {
  const reviewRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-a11y-browser-'));
  fs.chmodSync(reviewRoot, 0o700);
  const sourceAuthority = createSourceAuthorityForTests(sourceSnapshot());
  const campaignAuthority = createCampaignAuthority({ sourceAuthority });
  const reviewAuthority = new ControlCenterReviewAuthority({ root: reviewRoot, now: () => new Date(TIMESTAMP) });
  const services = createControlCenterServices({
    runReader: runReader(runRecords()),
    sourceAuthority,
    campaignAuthority,
    findingsAuthority: findingsAuthorityOver(reviewerCorpus(4, { newestFirstIds: false })),
    reviewAuthority,
    runSnapshotTtlMs: 0,
    sourceSnapshotTtlMs: 0,
  });
  const mapInput = systemMapInput();
  const collector: ControlCenterCollector = {
    ...services.collector,
    systemMapLevel: (segment: SystemMapLevelSegment, focusId: string | null) => systemMapLevel(mapInput, LEVEL_FOR_SEGMENT[segment] as never, focusId),
    systemMapQuery: (segment: SystemMapQuerySegment, focusId: string | null) => systemMapQuery(mapInput, QUERY_FOR_SEGMENT[segment] as never, focusId),
  };
  const handle = createControlCenterServer({
    collector,
    ...(services.reviewDecision === null ? {} : { reviewDecision: services.reviewDecision }),
    port: 0,
    uiRoot: UI_ROOT,
  });
  const address = await handle.start();
  return { handle, origin: `http://127.0.0.1:${address.port}`, reviewRoot };
}

async function closeServed(served: Served): Promise<void> {
  await served.handle.close();
  fs.rmSync(served.reviewRoot, { recursive: true, force: true });
}

function guardAgainstEgress(page: Page): { readonly external: string[]; readonly errors: string[] } {
  const external: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:')) external.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return { external, errors };
}

function expectCleanWalk(walk: TabWalk, label: string): void {
  expect(walk.pointerOnly, `${label}: pointer-only controls`).toEqual([]);
  expect(walk.trap, `${label}: unintended focus trap`).toBeNull();
  expect(walk.orderViolation, `${label}: focus order diverges from DOM order`).toBeNull();
  expect(walk.focusFailures, `${label}: focus failures`).toEqual([]);
}

/**
 * Reasoned exemption lists. Both are empty: the built composition meets every
 * measured requirement, and an entry is only legal while its pair actually
 * fails (the checker fails in both directions, exercised by the unit probe
 * with synthetic fixtures). Adding a reason here is the deliberate act; a
 * silent skip is not possible.
 */
const CONTRAST_EXEMPTIONS: Readonly<Record<string, ContrastExemption>> = Object.freeze({});
const STRUCTURAL_EXEMPTIONS: Readonly<Record<string, StructuralExemption>> = Object.freeze({});

/**
 * The root TypeScript program has no DOM lib, so the active element is read
 * through a locally named structural type instead of the global `document`.
 */
interface ActiveElementView {
  readonly document: {
    readonly activeElement: { readonly tagName: string; readonly textContent: string | null } | null;
  };
}

async function focusedTag(page: Page): Promise<string> {
  return page.evaluate(() => {
    const view = globalThis as unknown as ActiveElementView;
    return view.document.activeElement?.tagName.toLowerCase() ?? 'body';
  });
}

async function focusedText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const view = globalThis as unknown as ActiveElementView;
    return (view.document.activeElement?.textContent ?? '').trim();
  });
}

const VIEW_MARKERS: ReadonlyArray<{ readonly id: string; readonly heading: string }> = [
  { id: 'overview', heading: 'Know the posture before the next run.' },
  { id: 'safety', heading: 'Safety is a posture, not a green badge.' },
  { id: 'runs', heading: 'Inspect what happened, in order.' },
  { id: 'execution-graph', heading: 'Trace the bounded run shape.' },
  { id: 'campaigns', heading: 'See the shape of coverage.' },
  { id: 'source-intelligence', heading: 'Follow proof, currentness, and capability.' },
  { id: 'findings', heading: 'Keep the signal, lose the raw evidence.' },
  { id: 'reviewer', heading: 'Separate what was proved from what is suggested.' },
];

// ---------------------------------------------------------------------------
// 20.1–20.6, 20.10, 20.11 — status distinctions, contrast, structural audit.
// ---------------------------------------------------------------------------

test('the built composition encodes status beyond colour, meets measured contrast, and passes the structural subset per view', async ({ page }) => {
  test.setTimeout(300_000);
  expect(fs.existsSync(path.join(UI_ROOT, 'index.html'))).toBe(true);
  const guard = guardAgainstEgress(page);
  const served = await serve();
  const statusSweeps: StatusSweep[] = [];
  const contrastReports: ContrastReport[] = [];
  const audits: StructuralAuditResult[] = [];
  const pointerOnly: string[] = [];
  const measure = async (view: string): Promise<void> => {
    statusSweeps.push(await sweepStatusDistinctions(page));
    contrastReports.push(measureContrast(await enumerateContrast(page)));
    audits.push(await auditStructure(page, view));
    pointerOnly.push(...(await focusInventory(page)).pointerOnly);
  };

  try {
    // Overview.
    await page.goto(served.origin, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: VIEW_MARKERS[0]!.heading })).toBeVisible();
    await measure('overview');

    // Safety Center.
    await page.getByRole('link', { name: 'Safety Center' }).click({ force: true });
    await expect(page.getByRole('heading', { name: VIEW_MARKERS[1]!.heading })).toBeVisible();
    await measure('safety');

    // Runs, with a selected run so run detail, provenance and timeline render.
    await page.getByRole('link', { name: 'Runs' }).click({ force: true });
    await expect(page.getByRole('heading', { name: VIEW_MARKERS[2]!.heading })).toBeVisible();
    const inspect = page.locator('button.table-action').first();
    await expect(inspect).toBeVisible();
    await inspect.dispatchEvent('click');
    await expect(page.getByText('REPOSITORY PROVENANCE').first()).toBeVisible();
    await expect(page.locator('tr.row-selected')).toContainText('a11y-run-01');
    await measure('runs');

    // Execution graph.
    await page.getByRole('link', { name: 'Execution Graph' }).click({ force: true });
    await expect(page.getByRole('heading', { name: VIEW_MARKERS[3]!.heading })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Execution graph for run run-a11y-01' })).toBeVisible();
    await measure('execution-graph');

    // Campaign intelligence.
    await page.getByRole('link', { name: 'Campaign Intelligence' }).click({ force: true });
    await expect(page.getByRole('heading', { name: VIEW_MARKERS[4]!.heading })).toBeVisible();
    await measure('campaigns');

    // Source intelligence, with a selected surface so the source graph renders.
    await page.getByRole('link', { name: 'Source Intelligence' }).click({ force: true });
    await expect(page.getByRole('heading', { name: VIEW_MARKERS[5]!.heading })).toBeVisible();
    const graph = page.locator('button.table-action').first();
    await expect(graph).toBeVisible();
    await graph.dispatchEvent('click');
    await expect(page.getByRole('img', { name: 'Bounded source intelligence graph' })).toBeVisible();
    await measure('source-intelligence');

    // Findings.
    await page.getByRole('link', { name: 'Findings' }).click({ force: true });
    await expect(page.getByRole('heading', { name: VIEW_MARKERS[6]!.heading })).toBeVisible();
    await measure('findings');

    // Reviewer, including the decision controls (capability is ENABLED here).
    await page.getByRole('link', { name: 'Reviewer' }).click({ force: true });
    await expect(page.getByRole('heading', { name: VIEW_MARKERS[7]!.heading })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accept Evidence' }).first()).toBeVisible();
    await measure('reviewer');

    // System map.
    await page.getByRole('link', { name: 'System Map' }).click({ force: true });
    await expect(page.getByRole('region', { name: 'System map' })).toBeVisible();
    await measure('system-map');

    expect(guard.external).toEqual([]);
    expect(guard.errors).toEqual([]);
  } finally {
    await closeServed(served);
  }

  // --- 20.1/20.2/20.3: status distinctions on the built composition ------
  const statusSweep: StatusSweep = {
    observations: statusSweeps.flatMap((sweep) => sweep.observations),
    toneCarrierCount: statusSweeps.reduce((total, sweep) => total + sweep.toneCarrierCount, 0),
    unannotated: statusSweeps.flatMap((sweep) => sweep.unannotated),
  };
  const statusReport = statusDistinctionViolations(statusSweep);
  expect(statusSweep.unannotated, `tone carriers with no status annotation: ${statusSweep.unannotated.join(', ')}`).toEqual([]);
  expect(statusSweep.toneCarrierCount).toBeGreaterThan(0);
  expect(statusReport.families.length).toBeGreaterThanOrEqual(6);
  expect(statusReport.values).toBeGreaterThan(5);
  expect(statusReport.pairsEvaluated).toBeGreaterThan(0);
  expect(
    statusReport.colourOnly,
    `status pairs distinguishable only by colour: ${statusReport.colourOnly.map((pair) => `${pair.family}:${pair.valueA}/${pair.valueB}=${pair.toneA}/${pair.toneB}`).join(', ')}`,
  ).toEqual([]);

  // --- 20.4/20.5/20.6: contrast on the rendered DOM -----------------------
  const contrastReport: ContrastReport = {
    pairs: contrastReports.flatMap((report) => report.pairs),
    exclusions: contrastReports.flatMap((report) => report.exclusions),
  };
  const textPairs = contrastReport.pairs.filter((pair) => pair.kind !== 'non-text-status');
  const boundaryPairs = contrastReport.pairs.filter((pair) => pair.kind === 'non-text-status');
  expect(textPairs.length, 'rendered foreground/background text pairs').toBeGreaterThan(50);
  expect(boundaryPairs.length, 'rendered non-text status boundaries').toBeGreaterThan(0);
  const findings = contrastViolations(contrastReport, CONTRAST_EXEMPTIONS);
  const formatPair = (pair: (typeof findings.undeclared)[number]): string =>
    `${pair.kind} ${pair.element} "${pair.text}" fg=${pair.foreground} bg=${pair.background} ratio=${pair.ratio.toFixed(2)} required=${pair.required}`;
  expect(findings.undeclared, `rendered pairs below WCAG 2.2 AA: ${findings.undeclared.map(formatPair).join(' | ')}`).toEqual([]);
  expect(findings.stale, `contrast exemptions that name no failing pair: ${findings.stale.join(', ')}`).toEqual([]);
  expect(findings.measured).toBe(contrastReport.pairs.length);

  // --- 20.10/20.11: structural audit per view, and its stated limit -------
  const structural = structuralViolations(audits, STRUCTURAL_EXEMPTIONS);
  expect(structural.checks.length).toBe(15);
  expect(structural.elementsChecked).toBeGreaterThan(0);
  expect(
    structural.undeclared,
    `structural violations without a reasoned exemption: ${structural.undeclared.map((violation) => `${violation.check}@${violation.element}: ${violation.detail}`).join(' | ')}`,
  ).toEqual([]);
  expect(structural.stale, `structural exemptions that name no observed violation: ${structural.stale.join(', ')}`).toEqual([]);
  expect(pointerOnly, `controls reachable only by pointer: ${pointerOnly.join(', ')}`).toEqual([]);
  // The lane's own output states what automated auditing did and did not do.
  // eslint-disable-next-line no-console
  console.log(`[accessibility-certification] structural audit: ${STRUCTURAL_AUDIT_LIMIT}; views=${audits.length}; text pairs=${textPairs.length}; boundary pairs=${boundaryPairs.length}; status pairs=${statusReport.pairsEvaluated}`);
  test.info().annotations.push({ type: 'accessibility-audit-limit', description: STRUCTURAL_AUDIT_LIMIT });
});

// ---------------------------------------------------------------------------
// 20.7/20.8/20.9 — keyboard-complete operator workflows, visible and ordered
// focus, no pointer-only control, no trap, and the navigation contract.
// ---------------------------------------------------------------------------

test('every operator workflow completes by keyboard alone, with visible reading-order focus and the navigation contract intact', async ({ page }) => {
  test.setTimeout(600_000);
  expect(fs.existsSync(path.join(UI_ROOT, 'index.html'))).toBe(true);
  const guard = guardAgainstEgress(page);
  const served = await serve();

  try {
    // --- 20.9: initial load never focuses main and sets the title ---------
    await page.goto(served.origin, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: VIEW_MARKERS[0]!.heading })).toBeVisible();
    await expect(page).toHaveTitle(/Nightwatch Control Center/);
    const initialFocus = await focusedTag(page);
    expect(initialFocus, 'initial load must not move focus into main').not.toBe('main');
    await expect(page.locator('#main-content')).not.toBeFocused();

    // --- 20.9: a background refresh never focuses main or re-announces -----
    await expect.poll(() => served.handle.events.clientCount).toBe(1);
    const titleBeforeRefresh = await page.title();
    served.handle.publish({
      schemaVersion: 'nightwatch.control-center.event.v1',
      type: 'run.updated',
      entityId: null,
      sequence: 1,
      snapshotDigest: null,
    } as unknown as ControlCenterEventDto);
    await page.waitForTimeout(500);
    expect(await focusedTag(page), 'background refresh must not steal focus').not.toBe('main');
    expect(await page.title()).toBe(titleBeforeRefresh);

    // --- 20.7: view navigation by keyboard --------------------------------
    const toRuns = await driveTabWalk(page, { stopWhen: (step) => step.name === 'Runs' });
    expectCleanWalk(toRuns, 'navigate to Runs');
    expect(toRuns.steps.at(-1)?.name).toBe('Runs');
    await page.keyboard.press('Enter');
    await expect(page).toHaveTitle(/Runs/);
    await expect(page.locator('#main-content')).toBeFocused();

    // --- 20.7: select a run by keyboard -----------------------------------
    const toRun = await driveTabWalk(page, { stopWhen: (step) => step.name === 'Inspect' });
    expectCleanWalk(toRun, 'select a run');
    await page.keyboard.press('Enter');
    await expect(page.getByText('REPOSITORY PROVENANCE').first()).toBeVisible();
    await expect(page.locator('tr.row-selected')).toContainText('a11y-run-01');

    // --- 20.7: page a bounded collection by keyboard ----------------------
    const toPage = await driveTabWalk(page, { stopWhen: (step) => step.name.startsWith('Load more runs') });
    expectCleanWalk(toPage, 'page the run list');
    await page.keyboard.press('Enter');
    await expect(page.getByText('All loaded.')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(25);
    expect(await focusedTag(page), 'the continuation control leaves the document when exhausted').toBe('body');

    // --- 20.7: navigate to the execution graph by keyboard ----------------
    const toGraph = await driveTabWalk(page, { stopWhen: (step) => step.name === 'Execution Graph' });
    expectCleanWalk(toGraph, 'navigate to Execution Graph');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: VIEW_MARKERS[3]!.heading })).toBeVisible();
    await expect(page.locator('#main-content')).toBeFocused();

    // --- 20.7: filter by keyboard (search text, then the select) ----------
    const toSearch = await driveTabWalk(page, { stopWhen: (step) => step.descriptor === 'input' });
    expectCleanWalk(toSearch, 'focus the graph search');
    await page.keyboard.type('policy');
    await expect(page.locator('.graph-footer')).toContainText('1 match');
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Backspace');
    await expect(page.locator('.graph-footer')).toContainText('10 nodes drawn');
    await page.keyboard.press('Tab');
    const selectFocus = await focusedTag(page);
    expect(selectFocus).toBe('select');
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.graph-footer')).toContainText('0 match');
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('.graph-footer')).toContainText('10 nodes drawn');

    // --- 20.7: drill into a graph node by keyboard ------------------------
    const toNode = await driveTabWalk(page, { stopWhen: (step) => step.descriptor === 'g' });
    expectCleanWalk(toNode, 'select a graph node');
    await page.keyboard.press('Enter');
    await expect(page.locator('.graph-node-selected')).toHaveCount(1);
    await expect(page.getByText(/^Selected:/)).toBeVisible();

    // --- 20.7: drill down in the system map by keyboard -------------------
    const toMapLink = await driveTabWalk(page, { direction: 'backward', stopWhen: (step) => step.name === 'System Map' });
    expectCleanWalk(toMapLink, 'walk back to System Map');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: 'System map' })).toBeVisible();
    const toCanvas = await driveTabWalk(page, { stopWhen: (step) => step.descriptor === 'div.system-map-canvas' });
    expectCleanWalk(toCanvas, 'focus the system map canvas');
    const drill = page.getByRole('button', { name: /^Drill into Product/ });
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await page.keyboard.press('ArrowDown');
      if (await drill.isVisible().catch(() => false)) break;
    }
    await expect(drill).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Product: synthetic-product' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^services\/synthetic,/ })).toBeVisible();

    // --- 20.7: the review decision by keyboard, read back from the store --
    const toReviewer = await driveTabWalk(page, { direction: 'backward', stopWhen: (step) => step.name === 'Reviewer' });
    expectCleanWalk(toReviewer, 'walk back to Reviewer');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: VIEW_MARKERS[7]!.heading })).toBeVisible();
    const target = reviewerCorpus(4, { newestFirstIds: false })[0] as FindingsDossierMetadata;
    const row = page.getByRole('table')
      .filter({ has: page.getByRole('columnheader', { name: 'Decision', exact: true }) })
      .getByRole('row')
      .filter({ has: page.getByText(target.candidateId, { exact: true }) });
    await expect(row.getByText('No Local Review')).toBeVisible();
    const toRationale = await driveTabWalk(page, { stopWhen: (step) => step.descriptor === 'textarea.review-rationale' });
    expectCleanWalk(toRationale, 'focus the review rationale');
    await page.keyboard.type('Reproduced by keyboard alone.');
    await page.keyboard.press('Tab');
    const firstDecision = await focusedText(page);
    expect(firstDecision).toBe('Accept Evidence');
    await page.keyboard.press('Enter');
    await expect(row.getByText('Decided')).toBeVisible({ timeout: 30_000 });
    expect(fs.readdirSync(served.reviewRoot)).toHaveLength(1);

    // Persisted read-back: a fresh load still shows the decision.
    await page.reload({ waitUntil: 'domcontentloaded' });
    const toReviewerAgain = await driveTabWalk(page, { stopWhen: (step) => step.name === 'Reviewer' });
    expectCleanWalk(toReviewerAgain, 'navigate back to Reviewer after reload');
    await page.keyboard.press('Enter');
    const reloadedRow = page.getByRole('table')
      .filter({ has: page.getByRole('columnheader', { name: 'Decision', exact: true }) })
      .getByRole('row')
      .filter({ has: page.getByText(target.candidateId, { exact: true }) });
    await expect(reloadedRow.getByText('Decided')).toBeVisible();
    await expect(reloadedRow.getByText('Binding Current')).toBeVisible();

    // --- 20.8: a full walk escapes; no trap, no skipped focus -------------
    const toOverview = await driveTabWalk(page, { direction: 'backward', stopWhen: (step) => step.name === 'Overview' });
    expectCleanWalk(toOverview, 'walk back to Overview');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: VIEW_MARKERS[0]!.heading })).toBeVisible();
    // The full-document traversal starts from a fresh load, where focus is on
    // the document body: every focusable is visited exactly in DOM order and
    // the walk runs off the end rather than cycling.
    await page.goto(served.origin, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: VIEW_MARKERS[0]!.heading })).toBeVisible();
    const fullWalk = await driveTabWalk(page, { limit: 250 });
    expect(fullWalk.escaped, 'a full forward walk must escape the document, not cycle a trap').toBe(true);
    expectCleanWalk(fullWalk, 'full Overview walk');
    expect(fullWalk.steps.length).toBeGreaterThan(10);

    expect(guard.external).toEqual([]);
    expect(guard.errors).toEqual([]);
  } finally {
    await closeServed(served);
  }
});
