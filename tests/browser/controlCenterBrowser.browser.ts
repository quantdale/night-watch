import { provenReadOnlyProof } from '../helpers/readOnlyProofFixtures';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createCampaignAuthority } from '../../src/controlCenter/authorities/campaignAuthority';
import { createSourceAuthorityForTests, type SourceAuthoritySnapshot } from '../../src/controlCenter/authorities/sourceAuthority';
import type { FindingsAuthoritySnapshot } from '../../src/controlCenter/authorities/findingsAuthority';
import type { RunEvidenceReader, RunEvidenceSnapshot } from '../../src/controlCenter/authorities/runEvidenceReader';
import { createDefaultControlCenterCollector } from '../../src/controlCenter/server/defaultCollector';
import { createControlCenterServer } from '../../src/controlCenter/server/server';
import type { ControlCenterEventDto } from '../../src/controlCenter/contracts/events';
import { buildPhase24CandidatePortfolio, prioritizePhase24Portfolio, type Phase24CandidateInput } from '../../src/core/phase24';
import type { SourcePhase24Integration, SourceSurfaceDiscovery } from '../../src/core/source/surfaces';
import type { RealSourceSurfaceDescriptor } from '../../src/core/source/surfaceTypes';
import type { RunEvent, RunSummary } from '../../src/core/evidence/types';
import type { RunAuthorityInput } from '../../src/controlCenter/adapters/runAdapter';
import type { FindingsDossierMetadata } from '../../src/controlCenter/authorities/findingsAuthority';

const UI_ROOT = path.resolve(process.cwd(), 'ui/control-center/dist');

/**
 * Click a view button with an explicit painted-button gate plus
 * box-independent dispatch (mirrors the systemMapV2 tail-chip shape):
 * the visibility assertion encodes the operator invariant and absorbs
 * transient layout stalls as waits, while `dispatchEvent` exercises the
 * real React handler without needing renderer boxes for scroll
 * coordinates. Every use here is followed by answer-specific
 * assertions, so a swallowed dispatch fails loud, never vacuous.
 * Retried once with a fresh locator.
 */
async function clickViewButton(page: Page, name: string): Promise<void> {
  const target = page.getByRole('button', { name, exact: true });
  await expect(target).toBeVisible();
  try {
    await target.dispatchEvent('click');
  } catch {
    await page.getByRole('button', { name, exact: true }).dispatchEvent('click');
  }
}

const TIMESTAMP = '2026-08-26T10:20:30.000Z';
const END_TIMESTAMP = '2026-08-26T10:20:31.000Z';
const SOURCE_SHA = 'a'.repeat(40);
const SOURCE_EVIDENCE = `ev:sha256:${'b'.repeat(24)}`;

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

function candidate(): Phase24CandidateInput {
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
  const portfolio = buildPhase24CandidatePortfolio({ candidates: [candidate()] });
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

function runInput(): RunAuthorityInput {
  const summary: RunSummary = {
    runId: 'run-01-synthetic',
    environment: 'LOCAL_SYNTHETIC',
    product: 'synthetic-product',
    browser: 'chromium',
    scenario: 'control-center-browser',
    startedAt: TIMESTAMP,
    endedAt: END_TIMESTAMP,
    durationMs: 1_000,
    passed: true,
    eventCount: 3,
    counts: { start: 1, journey: 1, end: 1 },
    severityCounts: { info: 3 },
    hardFailures: [],
    screenshots: [],
    nightwatchSha: null,
  };
  const events: readonly RunEvent[] = [
    { seq: 1, ts: TIMESTAMP, type: 'start', severity: 'info', message: 'SENTINEL_EVENT_MESSAGE' },
    { seq: 2, ts: TIMESTAMP, type: 'journey', severity: 'info', message: 'SENTINEL_RAW_EVENT', data: { ROUTE_CLASS: 'SYNTHETIC_ROUTE' } },
    { seq: 3, ts: END_TIMESTAMP, type: 'end', severity: 'info', message: 'SENTINEL_EVENT_END' },
  ];
  return { summary, events };
}

function runReader(input: RunAuthorityInput): RunEvidenceReader {
  const snapshot: RunEvidenceSnapshot = {
    state: 'AVAILABLE',
    records: [input],
    generation: `cc-run-generation:sha256:${'5'.repeat(24)}`,
    reasonCodes: [],
  };
  return {
    snapshot: () => snapshot,
    find: (runId) => input.summary.runId === runId ? input : null,
  };
}

function findingsSnapshot(): FindingsAuthoritySnapshot {
  const dossier: FindingsDossierMetadata = {
    schemaVersion: 'nightwatch.bug-dossier.private.v1',
    status: 'READY',
    candidateId: 'candidate-synthetic-01',
    title: 'Synthetic contract drift',
    firstObserved: TIMESTAMP,
    lastObserved: END_TIMESTAMP,
    routeClass: '/synthetic/read',
    oracleFingerprint: `fp:sha256:${'6'.repeat(24)}`,
    evidenceLevel: 'L2',
    reproduction: { result: 'REPRODUCED', count: 2, minimalityGuarantee: 'BOUNDED_MINIMAL' },
    technicalSeverity: 'HIGH',
    triagePriority: 'P1',
    confidence: { level: 'HIGH' },
    sourceCurrentness: 'CURRENT',
    semanticFinding: true,
    expectationId: 'fixture.synthetic-read.real-source-deep',
    semanticContractId: 'inv:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
    contentDigest: `cc-dossier-content:sha256:${'7'.repeat(24)}`,
  };
  const staleDossier: FindingsDossierMetadata = {
    ...dossier,
    candidateId: 'candidate-synthetic-stale',
    title: 'Synthetic stale finding',
    oracleFingerprint: `fp:sha256:${'8'.repeat(24)}`,
    sourceCurrentness: 'SOURCE_STALE',
  };
  const unavailableDossier: FindingsDossierMetadata = {
    ...dossier,
    candidateId: 'candidate-synthetic-unavailable',
    title: 'Synthetic unavailable finding',
    oracleFingerprint: `fp:sha256:${'9'.repeat(24)}`,
    sourceCurrentness: 'SOURCE_UNAVAILABLE',
  };
  return {
    schemaVersion: 'nightwatch.control-center-findings-authority.v1',
    state: 'AVAILABLE',
    dossiers: [dossier, staleDossier, unavailableDossier],
    generation: `cc-findings-generation:sha256:${'7'.repeat(24)}`,
    reasonCodes: [],
  };
}

test('qualifies every built Control Center view over one synthetic authority composition', async ({ page }) => {
  test.setTimeout(120_000);
  expect(fs.existsSync(path.join(UI_ROOT, 'index.html'))).toBe(true);

  const pageErrors: string[] = [];
  const externalRequests: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:')) externalRequests.push(request.url());
  });

  const sourceAuthority = createSourceAuthorityForTests(sourceSnapshot());
  const campaignAuthority = createCampaignAuthority({ sourceAuthority });
  const collector = createDefaultControlCenterCollector({
    runReader: runReader(runInput()),
    sourceAuthority,
    campaignAuthority,
    findingsAuthority: { snapshot: findingsSnapshot },
    runSnapshotTtlMs: 10_000,
    sourceSnapshotTtlMs: 10_000,
  });
  const handle = createControlCenterServer({ collector, port: 0, uiRoot: UI_ROOT });
  const address = await handle.start();
  const origin = `http://127.0.0.1:${address.port}`;

  try {
    await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Know the posture before the next run.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Local synthetic readiness' })).toBeVisible();

    await page.getByRole('link', { name: 'Safety Center' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'Safety is a posture, not a green badge.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What this surface can do' })).toBeVisible();

    await page.getByRole('link', { name: 'Runs' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'Inspect what happened, in order.' })).toBeVisible();
    await expect(page.getByText('control-center-browser')).toBeVisible();
    await clickViewButton(page, 'Inspect');
    await expect(page.getByRole('heading', { name: 'control-center-browser' })).toBeVisible();
    await expect(page.getByText('Event Journey', { exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Execution Graph' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'Trace the bounded run shape.' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Execution graph for run run-01-synthetic' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Journey', exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Campaign Intelligence' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'See the shape of coverage.' })).toBeVisible();
    await expect(page.getByText('synthetic-product')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Contract-stage coverage' })).toBeVisible();

    await page.getByRole('link', { name: 'Source Intelligence' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'Follow proof, currentness, and capability.' })).toBeVisible();
    await expect(page.getByText('/synthetic/read')).toBeVisible();
    await page.getByRole('button', { name: 'Graph' }).click({ force: true });
    await expect(page.getByRole('img', { name: 'Bounded source intelligence graph' })).toBeVisible();
    // C-15b renamed this label to 'Complete within bounds'. The old assertion
    // kept passing only because the browser suite ran against a prebuilt dist
    // that predated the rename, so run it via control-center:ui:browser, which
    // builds first.
    await expect(page.getByText('Complete within bounds', { exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Findings' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'Keep the signal, lose the raw evidence.' })).toBeVisible();
    await expect(page.getByText('Synthetic contract drift')).toBeVisible();
    await expect(page.getByText('Source Stale', { exact: true })).toBeVisible();
    await expect(page.getByText('Source Unavailable', { exact: true })).toBeVisible();
    await expect(page.getByText('Provenance recorded').first()).toBeVisible();

    // RS-1 reviewer surface, over the same synthetic findings composition the
    // Findings view just used: the reviewer intelligence is derived from those
    // dossiers by the real cones, so this is a real end-to-end projection.
    await page.getByRole('link', { name: 'Reviewer' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'Separate what was proved from what is suggested.' })).toBeVisible();
    // The epistemic class is text on screen, not colour alone.
    await expect(page.getByText('UNKNOWN', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Final verdict: human organizational').first()).toBeVisible();
    await expect(page.getByText(/never equivalent to a Leslie genuine\/invalid verdict or a Pondr approval/)).toBeVisible();

    await page.getByRole('link', { name: 'Runs' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'Inspect what happened, in order.' })).toBeVisible();
    await clickViewButton(page, 'Inspect');
    await expect(page.getByRole('heading', { name: 'control-center-browser' })).toBeVisible();
    await expect.poll(() => handle.events.clientCount).toBe(1);
    handle.publish({
      schemaVersion: 'nightwatch.control-center.event.v1',
      type: 'run.updated',
      entityId: null,
      sequence: 1,
      snapshotDigest: null,
    } as unknown as ControlCenterEventDto);
    await expect(page.getByRole('heading', { name: 'control-center-browser' })).toBeVisible();
    await expect(page.locator('tr.row-selected')).toContainText('control-center-browser');

    // Totality, not a fixed count. The suite previously said "seven views" and
    // kept passing when an eighth and ninth were added: an unqualified view
    // must fail this test, not slip past it. Every navigable view must have
    // been visited above.
    const navigated = new Set<string>();
    for (const link of await page.getByRole('navigation', { name: 'Primary' }).getByRole('link').all()) {
      navigated.add((await link.getAttribute('href')) ?? '');
    }
    const visited = new Set(['#', '#safety', '#runs', '#execution-graph', '#campaigns', '#source-intelligence', '#findings', '#reviewer', '#system-map']);
    const unqualified = [...navigated].filter((href) => !visited.has(href));
    expect(unqualified, `navigable views with no browser qualification: ${unqualified.join(', ')}`).toEqual([]);
    expect(navigated.size).toBe(visited.size);

    expect(externalRequests).toEqual([]);
    expect(pageErrors).toEqual([]);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('SENTINEL_');
  } finally {
    await handle.close();
  }
});
