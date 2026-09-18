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
import type { ControlCenterCollector } from '../../src/controlCenter/server/collector';
import { EVIDENCE_STATUSES } from '../../src/core/systemMap/model';
import {
  CONTROL_CENTER_SYSTEM_MAP_SCHEMA_VERSION,
  type ControlCenterSystemMapDto,
  type ControlCenterSystemMapQueryDto,
} from '../../src/controlCenter/contracts/systemMap';
import {
  EVIDENCE_STATUS_TREATMENTS,
  evaluateEvidenceTaxonomy,
  evidenceTreatmentFor,
} from '../../ui/control-center/src/systemMapEvidence';
import {
  BASE_ONLY_CLASSES,
  FORCED_NATIVE_PROPERTIES,
  classEffectViolations,
  sweepClassEffects,
  type ClassEffectSweep,
} from './helpers/classEffect';
import {
  MEDIA_EXEMPTIONS,
  PSEUDO_STATE_EXEMPTIONS,
  UNREACHABLE_SELECTORS,
  collectStylesheetSelectors,
  evaluateStylesheetReachability,
  matchStylesheetSelectors,
  replaceStylesheetSelector,
  type StylesheetSelector,
} from './helpers/stylesheetReachability';

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
    eventCount: 5,
    counts: { start: 1, journey: 1, policy: 1, oracle: 1, end: 1 },
    severityCounts: { info: 3, warn: 2 },
    hardFailures: [],
    screenshots: [],
    nightwatchSha: null,
  };
  const events: readonly RunEvent[] = [
    { seq: 1, ts: TIMESTAMP, type: 'start', severity: 'info', message: 'SENTINEL_EVENT_MESSAGE' },
    { seq: 2, ts: TIMESTAMP, type: 'journey', severity: 'info', message: 'SENTINEL_RAW_EVENT', data: { ROUTE_CLASS: 'SYNTHETIC_ROUTE' } },
    // The qualification walk renders the graph warning and blocked tones: a
    // policy event is BLOCKED by contract, a non-policy warn event WARNING.
    { seq: 3, ts: TIMESTAMP, type: 'policy', severity: 'warn', message: 'SENTINEL_POLICY' },
    { seq: 4, ts: TIMESTAMP, type: 'oracle', severity: 'warn', message: 'SENTINEL_ORACLE' },
    { seq: 5, ts: END_TIMESTAMP, type: 'end', severity: 'info', message: 'SENTINEL_EVENT_END' },
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

/**
 * Group 8.7/8.8 — a synthetic map answer that carries every core evidence
 * status. The approved projections cannot yet produce seven of the thirteen
 * values (no producer exists until C-12 and beyond); the rendering taxonomy
 * must still be proven over the whole vocabulary, so the composition is
 * injected at the collector seam as a synthetic wire DTO.
 */
function syntheticEvidenceMap(): ControlCenterSystemMapDto {
  const nodes = EVIDENCE_STATUSES.map((status, index) => ({
    nodeId: `evidence:${status.toLowerCase()}`,
    kind: 'HTTP_OPERATION',
    label: status,
    factCategory: 'SOURCE_FACT' as const,
    evidenceStatus: status,
    coverageState: 'PROVEN' as const,
    x: (index % 5) * 150,
    y: Math.floor(index / 5) * 96,
    layer: index % 5,
  }));
  const edges = nodes.slice(1).map((node, index) => ({
    edgeId: `evidence-edge-${index}`,
    fromNodeId: nodes[0]?.nodeId ?? 'evidence:mechanically_proven',
    toNodeId: node.nodeId,
    kind: 'EXPOSES',
    factCategory: 'SOURCE_FACT' as const,
    evidenceStatus: node.evidenceStatus,
  }));
  return {
    schemaVersion: CONTROL_CENTER_SYSTEM_MAP_SCHEMA_VERSION,
    level: 'L1_COMPANY',
    focusId: null,
    nodes,
    edges,
    nodeBound: { limit: 64, total: nodes.length + 1, projected: nodes.length, dropped: 1, truncated: true, remainingUnknown: false },
    edgeBound: { limit: 128, total: edges.length, projected: edges.length, dropped: 0, truncated: false, remainingUnknown: false },
    layout: {
      engineId: 'synthetic-evidence-layout',
      engineVersion: 'v1',
      graphDigest: 'synthetic:evidence:graph',
      layoutDigest: 'synthetic:evidence:layout',
      projectionVersion: 'synthetic:evidence:projection',
    },
    executionAuthority: 'NONE',
    mutationAuthority: 'NONE',
  };
}

function syntheticEvidenceQuery(): ControlCenterSystemMapQueryDto {
  return {
    ...syntheticEvidenceMap(),
    query: 'MUTATION_CAPABLE_ROUTES',
    measurement: 'UNMEASURED',
    blockingChain: [{ stage: 'EFFECT_PROOF', reason: 'NO_EFFECT_CLOSURE' }],
  };
}

/** The non-colour computed properties the taxonomy proof compares. */
const EVIDENCE_NON_COLOUR_PROPERTIES = Object.freeze([
  'stroke-dasharray', 'stroke-dashoffset', 'stroke-width', 'stroke-linecap',
  'stroke-linejoin', 'stroke-opacity', 'fill-opacity', 'opacity', 'shape-rendering',
]);

test('qualifies every built Control Center view over one synthetic authority composition', async ({ page }) => {
  test.setTimeout(120_000);
  expect(fs.existsSync(path.join(UI_ROOT, 'index.html'))).toBe(true);

  const pageErrors: string[] = [];
  const externalRequests: string[] = [];
  const classSweeps: ClassEffectSweep[] = [];
  const matchedSelectors = new Set<string>();
  const strippedSelectors = new Set<string>();
  const selectorErrors: string[] = [];
  let stylesheetSelectors: readonly StylesheetSelector[] = [];
  const captureStylesheetMatches = async (): Promise<void> => {
    if (stylesheetSelectors.length === 0) return;
    const result = await matchStylesheetSelectors(
      page,
      stylesheetSelectors.map((entry) => entry.selector),
      Object.keys(PSEUDO_STATE_EXEMPTIONS),
    );
    for (const selector of result.matched) matchedSelectors.add(selector);
    for (const selector of Object.keys(result.strippedMatched)) strippedSelectors.add(selector);
    for (const error of result.errors) selectorErrors.push(error);
  };
  const sweep = async (): Promise<void> => {
    classSweeps.push(await sweepClassEffects(page));
    await captureStylesheetMatches();
  };
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:')) externalRequests.push(request.url());
  });

  const sourceAuthority = createSourceAuthorityForTests(sourceSnapshot());
  const campaignAuthority = createCampaignAuthority({ sourceAuthority });
  const baseCollector = createDefaultControlCenterCollector({
    runReader: runReader(runInput()),
    sourceAuthority,
    campaignAuthority,
    findingsAuthority: { snapshot: findingsSnapshot },
    runSnapshotTtlMs: 10_000,
    sourceSnapshotTtlMs: 10_000,
  });
  // The map is served from the synthetic evidence DTO so the qualification
  // walk renders every taxonomy value, the truncated bound, an UNMEASURED
  // measurement and a blocking chain. Everything else comes from the real
  // synthetic authority composition above.
  const evidenceMap = syntheticEvidenceMap();
  const evidenceQuery = syntheticEvidenceQuery();
  const collector: ControlCenterCollector = {
    ...baseCollector,
    systemMapLevel: () => evidenceMap,
    systemMapQuery: () => evidenceQuery,
  };
  const handle = createControlCenterServer({ collector, port: 0, uiRoot: UI_ROOT });
  const address = await handle.start();
  const origin = `http://127.0.0.1:${address.port}`;

  try {
    await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Know the posture before the next run.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Local synthetic readiness' })).toBeVisible();

    // Group 8.1. Every selector in the BUILT stylesheet, extracted through the
    // browser's own CSSOM. The count is asserted before any reachability
    // claim, so an extractor that silently stops finding rules fails first.
    stylesheetSelectors = await collectStylesheetSelectors(page);
    expect(stylesheetSelectors.length, 'the built stylesheet yielded no selectors').toBeGreaterThan(100);

    // The readiness contract's own measurements, not just its verdict.
    await expect(page.getByRole('heading', { name: 'Everything the readiness contract states' })).toBeVisible();
    await sweep();

    // R-03. The stylesheet guard proves a rule EXISTS for every rendered
    // class; these assertions prove the interpolated tone families APPLY in
    // the built bundle, so a rule that is overridden or never reaches the
    // artifact fails. Two distinct tones must compute distinct backgrounds.
    type StatusToneReader = { getComputedStyle(element: unknown): { backgroundColor: string } };
    const statusToneBackground = async (selector: string): Promise<string> => page.locator(selector).first().evaluate((element) => (globalThis as unknown as StatusToneReader).getComputedStyle(element).backgroundColor);
    const readyBackground = await statusToneBackground('.status-ready');
    const warningBackground = await statusToneBackground('.status-warning');
    expect(readyBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(warningBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(readyBackground).not.toBe(warningBackground);

    await page.getByRole('link', { name: 'Safety Center' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'Safety is a posture, not a green badge.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What this surface can do' })).toBeVisible();
    // The individual safety checks and the service's declared authority. Both
    // were fetched by every build of this UI and rendered by none of them.
    await expect(page.getByRole('heading', { name: 'Every check, by name' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What this build declares about itself' })).toBeVisible();
    await sweep();

    // Group 8.1 reachability: before a run is selected, the Execution Graph
    // renders its empty view. Capturing it here reaches the empty-view family
    // on the built composition rather than listing it as unreachable.
    await page.getByRole('link', { name: 'Execution Graph' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'Select a run first.' })).toBeVisible();
    await captureStylesheetMatches();

    await page.getByRole('link', { name: 'Runs' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'Inspect what happened, in order.' })).toBeVisible();
    await expect(page.getByText('control-center-browser')).toBeVisible();
    await clickViewButton(page, 'Inspect');
    await expect(page.getByRole('heading', { name: 'control-center-browser' })).toBeVisible();
    await expect(page.getByText('Event Journey', { exact: true })).toBeVisible();
    // Repository provenance bounds every claim made from a run, so the built
    // panel must show it rather than fetch it and drop it.
    await expect(page.getByText('REPOSITORY PROVENANCE').first()).toBeVisible();
    await expect(page.getByText('EVENT CENSUS').first()).toBeVisible();
    await sweep();

    await page.getByRole('link', { name: 'Execution Graph' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'Trace the bounded run shape.' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Execution graph for run run-01-synthetic' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Journey', exact: true })).toBeVisible();
    // The canvas is interactive in the BUILT bundle, and its controls carry
    // real styles rather than unstyled browser defaults.
    await expect(page.getByRole('searchbox', { name: 'Search execution graph nodes' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Zoom and pan' })).toBeVisible();
    // The root TypeScript program deliberately excludes the DOM lib, so the
    // one browser-global this needs is named through a local structural type
    // rather than by widening the whole program.
    type StyleReader = { getComputedStyle(element: unknown): { backgroundColor: string } };
    const toolbarBackground = await page.locator('.graph-controls').first().evaluate((element) => (globalThis as unknown as StyleReader).getComputedStyle(element).backgroundColor);
    // A class with markup but no rule computes to the transparent default.
    expect(toolbarBackground).not.toBe('rgba(0, 0, 0, 0)');

    // The interpolated `graph-node-${tone}` family, computed on the drawn
    // nodes: SVG default stroke is `none`, so any non-`none` value proves the
    // tone rule applies to the built class.
    type GraphNodeReader = { getComputedStyle(element: unknown): { stroke: string } };
    const nodeStrokes = await page.locator('svg.execution-graph rect.graph-node').evaluateAll((elements) => elements.slice(0, 8).map((element) => (globalThis as unknown as GraphNodeReader).getComputedStyle(element).stroke));
    expect(nodeStrokes.length).toBeGreaterThan(0);
    for (const stroke of nodeStrokes) expect(stroke).not.toBe('none');
    await sweep();

    // Group 8.1 reachability: the graph's search dims non-matching nodes and
    // edges, and a node click selects. Both states are part of the
    // qualification walk, so the dimmed/selected rules are proven reachable
    // rather than listed as unreachable.
    await page.getByRole('searchbox', { name: 'Search execution graph nodes' }).fill('no-node-matches-this-search');
    await expect(page.locator('rect.graph-node-dimmed').first()).toBeVisible();
    await captureStylesheetMatches();
    await page.locator('svg.execution-graph g[role="button"]').first().dispatchEvent('click');
    await expect(page.locator('rect.graph-node-selected')).toHaveCount(1);
    await captureStylesheetMatches();
    await page.getByRole('searchbox', { name: 'Search execution graph nodes' }).fill('');
    await captureStylesheetMatches();

    await page.getByRole('link', { name: 'Campaign Intelligence' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'See the shape of coverage.' })).toBeVisible();
    await expect(page.getByText('synthetic-product')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Contract-stage coverage' })).toBeVisible();
    // The `stage-${tone}` family applies to the coverage chips in the bundle:
    // without the rule an element computes no border at all.
    type StageChipReader = { getComputedStyle(element: unknown): { borderTopWidth: string } };
    const stageBorderWidth = await page.locator('.stage-chip').first().evaluate((element) => (globalThis as unknown as StageChipReader).getComputedStyle(element).borderTopWidth);
    expect(stageBorderWidth).toBe('1px');
    await sweep();

    await page.getByRole('link', { name: 'Source Intelligence' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'Follow proof, currentness, and capability.' })).toBeVisible();
    await expect(page.getByText('/synthetic/read')).toBeVisible();
    // The pre-selection empty panel is a real composition state; capture it
    // before the Graph click replaces it.
    await captureStylesheetMatches();
    await page.getByRole('button', { name: 'Graph' }).click({ force: true });
    await expect(page.getByRole('img', { name: 'Bounded source intelligence graph' })).toBeVisible();
    // C-15b renamed this label to 'Complete within bounds'. The old assertion
    // kept passing only because the browser suite ran against a prebuilt dist
    // that predated the rename, so run it via control-center:ui:browser, which
    // builds first.
    await expect(page.getByText('Complete within bounds', { exact: true })).toBeVisible();
    await sweep();

    await page.getByRole('link', { name: 'Findings' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'Keep the signal, lose the raw evidence.' })).toBeVisible();
    await expect(page.getByText('Synthetic contract drift')).toBeVisible();
    await expect(page.getByText('Source Stale', { exact: true })).toBeVisible();
    await expect(page.getByText('Source Unavailable', { exact: true })).toBeVisible();
    await expect(page.getByText('Provenance recorded').first()).toBeVisible();
    await sweep();

    // RS-1 reviewer surface, over the same synthetic findings composition the
    // Findings view just used: the reviewer intelligence is derived from those
    // dossiers by the real cones, so this is a real end-to-end projection.
    await page.getByRole('link', { name: 'Reviewer' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'Separate what was proved from what is suggested.' })).toBeVisible();
    // The epistemic class is text on screen, not colour alone.
    await expect(page.getByText('UNKNOWN', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Final verdict: human organizational').first()).toBeVisible();
    await expect(page.getByText(/never equivalent to a Leslie genuine\/invalid verdict or a Pondr approval/)).toBeVisible();
    await sweep();

    // The system map is qualified in its own lane; the class-effect walk needs
    // it here too because it is the only view that renders the map classes.
    // The synthetic evidence DTO carries all thirteen statuses, the truncated
    // bound, an UNMEASURED query and a blocking chain, so every map state the
    // taxonomy and reachability checks need is produced by this walk.
    await page.getByRole('link', { name: 'System Map' }).click({ force: true });
    await expect(page.getByRole('region', { name: 'System map' })).toBeVisible();
    await expect(page.locator('g[data-evidence-status]')).toHaveCount(EVIDENCE_STATUSES.length);
    await expect(page.locator('.bound-truncated')).toBeVisible();
    await sweep();
    await page.getByRole('application').press('ArrowRight');
    await expect(page.locator('g.map-node.node-selected')).toHaveCount(1);
    await captureStylesheetMatches();
    await page.getByRole('button', { name: 'Mutation-capable routes', exact: true }).dispatchEvent('click');
    await expect(page.getByTestId('measurement-banner')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Blocking chain' })).toBeVisible();
    await expect(page.locator('button.chip-active')).toHaveCount(1);
    await captureStylesheetMatches();
    await page.getByRole('searchbox', { name: 'Search nodes' }).fill('no-node-matches-this-search');
    await expect(page.locator('.empty-state')).toBeVisible();
    await captureStylesheetMatches();
    await page.getByRole('searchbox', { name: 'Search nodes' }).fill('');
    await captureStylesheetMatches();

    // Group 8.7/8.8. The evidence-status taxonomy is total over the core
    // vocabulary, has no default bucket, and every status differs in a
    // NON-colour computed property. A fourteenth value fails the
    // completeness assertion and the lookup refuses it. The assertions run
    // while the synthetic map is mounted.
    const taxonomy = evaluateEvidenceTaxonomy(EVIDENCE_STATUSES, EVIDENCE_STATUS_TREATMENTS);
    expect(taxonomy.missing).toEqual([]);
    expect(taxonomy.unexpected).toEqual([]);
    expect(taxonomy.duplicateSignatures).toEqual([]);
    expect(EVIDENCE_STATUSES).toHaveLength(13);
    expect(evidenceTreatmentFor('SYNTHETIC_FOURTEENTH_STATUS')).toBeNull();
    expect(evaluateEvidenceTaxonomy([...EVIDENCE_STATUSES, 'SYNTHETIC_FOURTEENTH_STATUS']).missing).toEqual(['SYNTHETIC_FOURTEENTH_STATUS']);
    for (const status of EVIDENCE_STATUSES) {
      const treatment = evidenceTreatmentFor(status);
      expect(treatment).not.toBeNull();
      if (treatment === null) continue;
      const carrier = page.locator(`g[data-evidence-status="${status}"]`);
      await expect(carrier, `${status} was not rendered by the synthetic map`).toHaveCount(1);
      expect((await carrier.getAttribute('class'))?.split(/\s+/)).toContain(treatment.className);
    }
    type SvgStyleReader = { getComputedStyle(element: unknown): { getPropertyValue(property: string): string } };
    const statusSignatures = await page.locator('g[data-evidence-status]').evaluateAll((groups, properties) => groups.map((group) => {
      const circle = group.querySelector('circle:not(.map-node-hit)');
      if (circle === null) return { status: group.getAttribute('data-evidence-status'), signature: 'NO_CIRCLE' };
      const computed = (globalThis as unknown as SvgStyleReader).getComputedStyle(circle);
      return {
        status: group.getAttribute('data-evidence-status'),
        signature: (properties as readonly string[]).map((property) => `${property}:${computed.getPropertyValue(property)}`).join(';'),
      };
    }), [...EVIDENCE_NON_COLOUR_PROPERTIES]);
    expect(statusSignatures).toHaveLength(EVIDENCE_STATUSES.length);
    const signatures = statusSignatures.map((entry) => entry.signature);
    expect(signatures).not.toContain('NO_CIRCLE');
    expect(new Set(signatures).size, `statuses share a non-colour computed signature: ${JSON.stringify(statusSignatures)}`).toBe(EVIDENCE_STATUSES.length);

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

    // A-02. Every class the composition rendered must change a computed
    // property on at least one element that carries it, or be declared
    // base-only with a reason. The sweep is non-vacuous: it observed a large
    // class population, not an empty DOM.
    const observedClasses = new Set(classSweeps.flatMap((entry) => entry.observed));
    expect(observedClasses.size).toBeGreaterThan(100);
    const violations = classEffectViolations(classSweeps);
    expect(violations.undeclared, `classes with no computed effect: ${violations.undeclared.join(', ')}`).toEqual([]);
    expect(violations.stale, `declared base-only classes that now have an effect: ${violations.stale.join(', ')}`).toEqual([]);
    // Group 8.5. Native form controls are covered at runtime, on their
    // non-forced properties; an inert class on a control is named with the
    // element that carries it.
    expect(violations.nativeUndeclared, `classes inert on a native form control: ${violations.nativeUndeclared.map((entry) => `${entry.class}@${entry.element}`).join(', ')}`).toEqual([]);
    const nativeObservedClasses = new Set(classSweeps.flatMap((entry) => entry.nativeObserved));
    expect(nativeObservedClasses.size, 'no native form control was swept; the property-set coverage would be vacuous').toBeGreaterThan(0);
    expect(Object.keys(FORCED_NATIVE_PROPERTIES).length).toBeGreaterThan(0);
    expect(Object.keys(FORCED_NATIVE_PROPERTIES)).toContain('color');
    expect(Object.keys(FORCED_NATIVE_PROPERTIES)).toContain('background-color');
    for (const [property, reason] of Object.entries(FORCED_NATIVE_PROPERTIES)) {
      expect(reason.length, `forced property ${property} is excluded without a reason`).toBeGreaterThan(10);
    }
    // The exclusion is narrow: geometry, spacing, border width/style, font and
    // layout stay observable on native controls. Only colour-family
    // properties the form theme forces may be excluded.
    const excludedProperties = new Set(classSweeps.flatMap((entry) => entry.forcedProperties));
    expect([...excludedProperties].sort()).toEqual(Object.keys(FORCED_NATIVE_PROPERTIES).sort());
    for (const observable of ['padding-top', 'margin-top', 'font-size', 'border-top-width', 'border-top-style', 'display', 'gap']) {
      expect([...excludedProperties], `${observable} must stay observable on native controls`).not.toContain(observable);
    }

    // Group 8.6. An inert class added to a native control must fail unless it
    // is declared base-only. The probe proves the native coverage is not
    // vacuous: before this check existed the whole element was excluded.
    await page.evaluate(() => {
      const dom = globalThis as unknown as { document: { querySelector(selector: string): { classList: { add(name: string): void } } | null } };
      const control = dom.document.querySelector('button');
      if (control === null) throw new Error('NO_NATIVE_CONTROL');
      control.classList.add('synthetic-inert-native-probe');
    });
    const nativeProbeSweep = await sweepClassEffects(page);
    const nativeProbe = classEffectViolations([nativeProbeSweep]);
    expect(nativeProbe.nativeUndeclared.map((entry) => entry.class), 'an inert class on a native control escaped detection').toContain('synthetic-inert-native-probe');
    // The other direction of the rule: declared base-only with a reason, the
    // same inert class is suppressed, which is what "unless declared" means.
    const declaredProbe = classEffectViolations([nativeProbeSweep], {
      ...BASE_ONLY_CLASSES,
      'synthetic-inert-native-probe': 'negative probe: declared base-only with a reason so the suppression path is proven',
    });
    expect(declaredProbe.nativeUndeclared.map((entry) => entry.class)).not.toContain('synthetic-inert-native-probe');
    expect(declaredProbe.undeclared).toEqual([]);
    await page.evaluate(() => {
      const dom = globalThis as unknown as { document: { querySelector(selector: string): { classList: { remove(name: string): void } } | null } };
      dom.document.querySelector('.synthetic-inert-native-probe')?.classList.remove('synthetic-inert-native-probe');
    });

    // Group 8.7/8.8. The taxonomy's completeness and non-colour signatures
    // were asserted while the synthetic map was mounted; every treatment class
    // must also have changed a computed property in the accumulated sweeps.
    const observedEvidenceClasses = new Set(classSweeps.flatMap((entry) => entry.observed));
    for (const status of EVIDENCE_STATUSES) {
      const treatment = evidenceTreatmentFor(status);
      expect(treatment).not.toBeNull();
      if (treatment === null) continue;
      expect(observedEvidenceClasses.has(treatment.className), `${treatment.className} changed no computed property`).toBe(true);
    }

    // Group 8.1-8.4. Every selector in the built stylesheet is reachable in
    // the qualification composition, covered by a declared state/media
    // exemption, or listed as unreachable with its reason. The list fails in
    // both directions; the exemptions are declared by name.
    expect(selectorErrors, `selector extraction/matching errors: ${selectorErrors.join('; ')}`).toEqual([]);
    const reachability = evaluateStylesheetReachability({
      selectors: stylesheetSelectors,
      matched: [...matchedSelectors],
      strippedMatched: [...strippedSelectors],
      pseudoDeclarations: PSEUDO_STATE_EXEMPTIONS,
      mediaDeclarations: MEDIA_EXEMPTIONS,
      unreachable: UNREACHABLE_SELECTORS,
    });
    expect(reachability.selectorCount).toBeGreaterThan(0);
    expect(reachability.undeclared, `dead stylesheet selectors: ${reachability.undeclared.join(', ')}`).toEqual([]);
    expect(reachability.staleListings, `unreachable-list entries that are stale: ${reachability.staleListings.join(', ')}`).toEqual([]);
    expect(reachability.undeclaredPseudo, `undeclared state exemption: ${reachability.undeclaredPseudo.join(', ')}`).toEqual([]);
    expect(reachability.undeclaredMedia, `undeclared media exemption: ${reachability.undeclaredMedia.join(', ')}`).toEqual([]);
    expect(reachability.staleDeclarations, `exemptions declared but not present: ${reachability.staleDeclarations.join(', ')}`).toEqual([]);
    expect(reachability.reachable).toBeGreaterThan(0);
    expect(reachability.joinedByPseudo, 'no stateful pseudo selector was proven through its declaration').toBeGreaterThan(0);
    process.stdout.write(
      `[control-center-browser] stylesheet reachability: selectors=${reachability.selectorCount}` +
        ` reachable=${reachability.reachable} pseudo=${reachability.joinedByPseudo}` +
        ` media=${reachability.joinedByMedia} listed=${reachability.listedUnreachable}\n`,
    );
    process.stdout.write(
      `[control-center-browser] evidence taxonomy: statuses=${EVIDENCE_STATUSES.length}` +
        ` non-colour-signatures=${new Set(statusSignatures.map((entry) => entry.signature)).size}` +
        ` native-classes=${nativeObservedClasses.size}\n`,
    );

    // The both-directions rule, proved on the pure judgement: an unlisted
    // dead selector fails, and a listed selector that becomes reachable fails
    // as stale.
    const probeSelectors = [{ selector: '.reachable-probe', media: [] }, { selector: '.unreachable-probe', media: [] }];
    const cleanProbe = evaluateStylesheetReachability({
      selectors: probeSelectors,
      matched: ['.reachable-probe'],
      strippedMatched: [],
      pseudoDeclarations: {},
      mediaDeclarations: {},
      unreachable: { '.unreachable-probe': 'no producer in the synthetic composition' },
    });
    expect(cleanProbe.undeclared).toEqual([]);
    expect(cleanProbe.staleListings).toEqual([]);
    expect(evaluateStylesheetReachability({
      selectors: probeSelectors,
      matched: ['.reachable-probe'],
      strippedMatched: [],
      pseudoDeclarations: {},
      mediaDeclarations: {},
      unreachable: {},
    }).undeclared).toEqual(['.unreachable-probe']);
    expect(evaluateStylesheetReachability({
      selectors: probeSelectors,
      matched: ['.reachable-probe', '.unreachable-probe'],
      strippedMatched: [],
      pseudoDeclarations: {},
      mediaDeclarations: {},
      unreachable: { '.unreachable-probe': 'no producer in the synthetic composition' },
    }).staleListings).toEqual(['.unreachable-probe']);

    // Group 8.4 mutation proof: a live rule's selector is altered so nothing
    // can match it, and the lane's own judgement must fail naming it. The
    // rule is restored immediately; the restored judgement is clean.
    expect(await replaceStylesheetSelector(page, '.chip', '.synthetic-chip-dead-mutation'), 'the live .chip rule could not be located').toBe(true);
    const mutatedReport = evaluateStylesheetReachability({
      selectors: await collectStylesheetSelectors(page),
      matched: [...matchedSelectors],
      strippedMatched: [...strippedSelectors],
      pseudoDeclarations: PSEUDO_STATE_EXEMPTIONS,
      mediaDeclarations: MEDIA_EXEMPTIONS,
      unreachable: UNREACHABLE_SELECTORS,
    });
    expect(mutatedReport.undeclared, 'a mutated live selector that matches nothing was not detected').toContain('.synthetic-chip-dead-mutation');
    expect(await replaceStylesheetSelector(page, '.synthetic-chip-dead-mutation', '.chip')).toBe(true);
    const restoredReport = evaluateStylesheetReachability({
      selectors: await collectStylesheetSelectors(page),
      matched: [...matchedSelectors],
      strippedMatched: [...strippedSelectors],
      pseudoDeclarations: PSEUDO_STATE_EXEMPTIONS,
      mediaDeclarations: MEDIA_EXEMPTIONS,
      unreachable: UNREACHABLE_SELECTORS,
    });
    expect(restoredReport.undeclared).toEqual([]);

    expect(externalRequests).toEqual([]);
    expect(pageErrors).toEqual([]);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('SENTINEL_');
  } finally {
    await handle.close();
  }
});

/**
 * F-18. The failure path in the BUILT bundle.
 *
 * The success-path test above proves the composed views; this one proves the
 * taxonomy survives bundling and reaches the operator: a server refusal names
 * its HTTP status and action with no retry, a deliberate 404 is a disabled
 * capability rather than an outage, and a partial composition renders the
 * source that answered while naming the source whose payload failed its
 * contract. No server-supplied message reaches the DOM.
 */
test('renders the error taxonomy and partial composition in the built bundle', async ({ page }) => {
  test.setTimeout(120_000);
  expect(fs.existsSync(path.join(UI_ROOT, 'index.html'))).toBe(true);

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
    // 1. A server refusal on the runs list: kind, status and action, no retry.
    await page.route('**/api/v1/runs?*', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'SENTINEL_SERVER_MESSAGE' }) }));
    await page.goto(`${origin}/#runs`, { waitUntil: 'domcontentloaded' });
    const runAlert = page.locator('[data-error-kind="HTTP"][data-error-status="500"]');
    await expect(runAlert).toBeVisible();
    await expect(runAlert).toContainText('Failure class: HTTP 500');
    await expect(runAlert).toContainText('server defect');
    await expect(runAlert.getByRole('button', { name: 'Try again' })).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('SENTINEL_SERVER_MESSAGE');
    await page.unroute('**/api/v1/runs?*');

    // 2. A deliberate 404 on findings: the capability is off, not broken.
    await page.route('**/api/v1/findings?*', (route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
    await page.getByRole('link', { name: 'Findings' }).click({ force: true });
    const findingsAlert = page.locator('[data-error-kind="HTTP"][data-error-status="404"]');
    await expect(findingsAlert).toBeVisible();
    await expect(findingsAlert).toContainText('not enabled');
    await expect(findingsAlert).toContainText('configuration');
    await expect(findingsAlert.getByRole('button', { name: 'Try again' })).toHaveCount(0);
    await page.unroute('**/api/v1/findings?*');

    // 3. Partial campaign composition: the summary answers and its data
    //    renders, while the coverage payload fails its contract by name.
    await page.route('**/api/v1/campaign/coverage?*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ schemaVersion: 'nightwatch.control-center.campaign-coverage.v9', items: [] }) }));
    await page.getByRole('link', { name: 'Campaign Intelligence' }).click({ force: true });
    const coverageAlert = page.locator('[data-error-kind="INVALID_RESPONSE"]');
    await expect(coverageAlert).toBeVisible();
    await expect(coverageAlert).toContainText('nightwatch.control-center.campaign-coverage.v1');
    await expect(coverageAlert).toContainText('Retrying cannot succeed');
    await expect(page.getByText('What remains unresolved')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Contract-stage coverage' })).toHaveCount(0);
    await page.unroute('**/api/v1/campaign/coverage?*');
  } finally {
    await handle.close();
  }
});

/**
 * The declared viewport matrix: every view at every declared width.
 *
 * Before this, the three breakpoints in the stylesheet shipped UNRENDERED —
 * `playwright.config.ts` sets no viewport, so every browser lane measured
 * Playwright's 1280x720 default and nothing ever laid the console out at 820px
 * or 380px. A media query that no test renders is an assertion nobody checked.
 *
 * Four properties are asserted at every cell of the matrix, and each one is a
 * defect this campaign actually hit:
 *
 *   NO HORIZONTAL PAGE SCROLL. `1fr` is `minmax(auto, 1fr)`, so a grid column
 *   cannot shrink below its content and a wide panel pushes the whole page
 *   sideways. The raised type floor made that latent bug reachable.
 *
 *   POSTURE VISIBLE. Read-only and loopback-only are product posture, not fine
 *   print, and two media queries used to remove them to tidy narrow layouts.
 *   Matched on ACCESSIBLE TEXT, never on a class name, so restyling the
 *   carrier cannot silently satisfy it.
 *
 *   NO CLIPPED CONTROL. An interactive control whose box leaves the viewport
 *   is unreachable by pointer even when it is technically in the DOM.
 *
 *   THE TYPE FLOOR HOLDS, measured on COMPUTED font-size rather than on the
 *   declaration, so an inherited or breakpoint-overridden size cannot duck
 *   under it. The floor is read from the token block, not hard-coded here.
 */
/**
 * Minimal structural shapes for the matrix probe. The root TypeScript program
 * deliberately carries no `dom` lib, so browser globals are described here
 * rather than imported — the same approach `helpers/accessibility.ts` takes.
 */
interface MatrixRect { readonly left: number; readonly right: number; readonly width: number; readonly height: number }
interface MatrixStyle { readonly display: string; readonly visibility: string; readonly fontSize: string; readonly position: string; readonly overflowX: string; readonly overflowY: string }
interface MatrixNode { readonly nodeType: number; readonly textContent: string | null }
interface MatrixElement {
  readonly tagName: string;
  readonly className: unknown;
  readonly parentElement: MatrixElement | null;
  readonly childNodes: ArrayLike<MatrixNode>;
  readonly scrollWidth: number;
  readonly clientWidth: number;
  scrollLeft: number;
  closest(selector: string): MatrixElement | null;
  getBoundingClientRect(): MatrixRect;
}
interface MatrixDocument {
  readonly documentElement: MatrixElement;
  readonly body: MatrixElement & { readonly innerText: string };
  querySelectorAll(selector: string): ArrayLike<MatrixElement>;
}
interface MatrixWindow {
  readonly document: MatrixDocument;
  getComputedStyle(element: MatrixElement): MatrixStyle;
}

const DECLARED_VIEWPORTS = [1440, 1080, 820, 560, 380] as const;
const MATRIX_VIEWS = [
  'Overview', 'Safety Center', 'Runs', 'Execution Graph', 'Campaign Intelligence',
  'Source Intelligence', 'Findings', 'Reviewer', 'System Map',
] as const;

test('every view lays out and keeps its posture at every declared viewport width', async ({ page }) => {
  test.setTimeout(240_000);

  const typeFloor = Number(
    /--text-floor-px:\s*(\d+)/.exec(fs.readFileSync(path.resolve(process.cwd(), 'ui/control-center/src/styles.css'), 'utf8'))?.[1] ?? '0',
  );
  expect(typeFloor, 'the token block must declare --text-floor-px').toBeGreaterThanOrEqual(12);

  const sourceAuthority = createSourceAuthorityForTests(sourceSnapshot());
  const campaignAuthority = createCampaignAuthority({ sourceAuthority });
  const baseCollector = createDefaultControlCenterCollector({
    runReader: runReader(runInput()),
    sourceAuthority,
    campaignAuthority,
    findingsAuthority: { snapshot: findingsSnapshot },
    runSnapshotTtlMs: 10_000,
    sourceSnapshotTtlMs: 10_000,
  });
  const collector: ControlCenterCollector = {
    ...baseCollector,
    systemMapLevel: () => syntheticEvidenceMap(),
    systemMapQuery: () => syntheticEvidenceQuery(),
  };
  const handle = createControlCenterServer({ collector, port: 0, uiRoot: UI_ROOT });
  const address = await handle.start();
  const origin = `http://127.0.0.1:${address.port}`;

  const failures: string[] = [];
  let cellsMeasured = 0;
  let textNodesMeasured = 0;

  try {
    for (const width of DECLARED_VIEWPORTS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'Know the posture before the next run.' })).toBeVisible();

      for (const view of MATRIX_VIEWS) {
        // The primary navigation is a list of LINKS, not buttons, so this uses
        // the link role rather than `clickViewButton` (which serves the
        // in-view action buttons like Inspect).
        if (view !== 'Overview') {
          const link = page.getByRole('link', { name: view, exact: true });
          await expect(link, `${view}@${width}: navigation link must be reachable`).toBeVisible();
          await link.click();
        }
        // Settle fonts and the layout they force before measuring anything.
        await page.evaluate(async () => {
          const host = globalThis as unknown as {
            document: { fonts: { ready: Promise<unknown> } };
            requestAnimationFrame(callback: () => void): number;
          };
          await host.document.fonts.ready;
          await new Promise<void>((resolve) => {
            host.requestAnimationFrame(() => { host.requestAnimationFrame(() => resolve()); });
          });
        });

        const report = await page.evaluate((floor: number) => {
          const view$ = globalThis as unknown as MatrixWindow;
          const root = view$.document.documentElement;
          const clientWidth = root.clientWidth;

          // A control inside a bounded scroll or pan surface — the evidence
          // tables, the System Map canvas — is REACHABLE by scrolling that
          // surface, and requiring it to sit inside the viewport would forbid
          // dense tables entirely. What must never happen is the PAGE itself
          // scrolling, which is asserted separately below. So the clip check
          // skips anything with a scrollable ancestor and holds every other
          // control to the viewport.
          const insideScroller = (element: MatrixElement): boolean => {
            let node: MatrixElement | null = element.parentElement;
            while (node !== null && node !== view$.document.body) {
              const style = view$.getComputedStyle(node);
              // Only `auto`/`scroll` make hidden content REACHABLE. `hidden`
              // clips it away for good, so it must not excuse an overflow.
              if (/auto|scroll/.test(`${style.overflowX} ${style.overflowY}`)) return true;
              node = node.parentElement;
            }
            return false;
          };
          const clipped: string[] = [];
          const focusable = view$.document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]');
          for (const element of Array.from(focusable)) {
            const style = view$.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden') continue;
            const box = element.getBoundingClientRect();
            if (box.width <= 0.5 || box.height <= 0.5) continue;
            if (insideScroller(element)) continue;
            // The System Map paints its nodes into a bounded, PANNABLE SVG
            // viewport. A node outside the current view is reached by panning,
            // exactly as a row outside a scroll port is reached by scrolling.
            // The canvas itself is the control that must fit, and it is
            // covered by the page-overflow assertion.
            if (element.closest('svg') !== null) continue;
            if (box.left < -1 || box.right > clientWidth + 1) {
              clipped.push(`${element.tagName.toLowerCase()}.${String(element.className).split(' ')[0]} [${Math.round(box.left)}..${Math.round(box.right)}]`);
            }
          }

          // Posture is matched on rendered TEXT, never on a class name.
          const text = (view$.document.body.innerText ?? '').toLowerCase();
          const readOnly = text.includes('read-only') || text.includes('read only');
          const contained = text.includes('loopback') || text.includes('no external network') || text.includes('external egress');

          const small: string[] = [];
          let measured = 0;
          for (const element of Array.from(view$.document.querySelectorAll('*'))) {
            const own = Array.from(element.childNodes).some(
              (node) => node.nodeType === 3 && (node.textContent ?? '').trim().length > 0,
            );
            if (!own) continue;
            const style = view$.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden') continue;
            const box = element.getBoundingClientRect();
            if (box.width <= 0.5 || box.height <= 0.5) continue;
            measured += 1;
            const size = Number.parseFloat(style.fontSize);
            if (Number.isFinite(size) && size < floor - 0.01) {
              small.push(`${element.tagName.toLowerCase()}.${String(element.className).split(' ')[0]}=${size}px`);
            }
          }

          // Name the element that is actually forcing the page wide; an
          // overflow number alone sends the reader hunting.
          // When the page does move, name what is sticking out. An overflow
          // number on its own sends the reader hunting, and the culprit is
          // often NOT the widest element — a 1px absolutely-positioned
          // screen-reader span escaping a scroll port set the document width
          // here while the 1097px table beside it was clipped correctly.
          const ranked: { label: string; right: number }[] = [];
          for (const element of Array.from(view$.document.querySelectorAll('*'))) {
            const box = element.getBoundingClientRect();
            if (box.width <= 0.5 || box.right <= clientWidth + 1) continue;
            const style = view$.getComputedStyle(element);
            ranked.push({
              label: `${element.tagName.toLowerCase()}.${String(element.className).split(' ')[0]}(w=${Math.round(box.width)},right=${Math.round(box.right)},pos=${style.position})`,
              right: box.right,
            });
          }
          ranked.sort((a, b) => b.right - a.right);

          // The property that matters is whether the OPERATOR can scroll the
          // page sideways, not whether some descendant's unclipped layout box
          // extends past the fold. A table inside a bounded `overflow-x: auto`
          // port legitimately does the latter — that is what a scroll port is
          // for — while the document itself must not move. So this attempts a
          // real horizontal scroll and reports how far the page actually went.
          const before = root.scrollLeft;
          root.scrollLeft = 10_000;
          const reached = root.scrollLeft;
          root.scrollLeft = before;

          return {
            offenders: ranked.filter((entry) => entry.right <= root.scrollWidth + 1).slice(0, 4).map((entry) => entry.label),
            overflow: reached,
            clipped: clipped.slice(0, 5),
            readOnly, contained,
            small: Array.from(new Set(small)).slice(0, 5),
            measured,
          };
        }, typeFloor);

        cellsMeasured += 1;
        textNodesMeasured += report.measured;
        const cell = `${view}@${width}`;
        if (report.overflow > 1) failures.push(`${cell}: the PAGE scrolls horizontally by ${report.overflow}px — ${report.offenders.join('; ') || 'no offender found'}`);
        if (report.clipped.length > 0) failures.push(`${cell}: control clipped outside the viewport — ${report.clipped.join('; ')}`);
        if (!report.readOnly) failures.push(`${cell}: no read-only posture statement in the rendered text`);
        if (!report.contained) failures.push(`${cell}: no loopback/no-external-network posture statement in the rendered text`);
        if (report.small.length > 0) failures.push(`${cell}: rendered text below the ${typeFloor}px floor — ${report.small.join(', ')}`);
        expect(report.measured, `${cell}: measured zero text-bearing elements; the probe is broken rather than the view clean`).toBeGreaterThan(5);
      }
    }
  } finally {
    await handle.close();
  }

  // Non-vacuity before the verdict: an empty matrix satisfies "no failures".
  expect(cellsMeasured, 'the matrix must measure every view at every width').toBe(DECLARED_VIEWPORTS.length * MATRIX_VIEWS.length);
  expect(textNodesMeasured, 'the type-floor probe must measure real text').toBeGreaterThan(500);
  expect(failures, `viewport matrix failures:\n  ${failures.join('\n  ')}`).toEqual([]);
});
