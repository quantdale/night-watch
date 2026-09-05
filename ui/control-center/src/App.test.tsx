import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App, ControlCenterErrorBoundary } from './App';
import { CONTROL_CENTER_API_PATHS } from './api';
import { VIEW_DEFINITIONS } from './types';
import type { OverviewSnapshot } from './types';

const overview: OverviewSnapshot = {
  health: {
    schemaVersion: 'nightwatch.control-center.health.v1',
    status: 'UP',
    scope: 'LOCAL_LOOPBACK_ONLY',
    readOnly: true,
    productReadiness: 'NOT_REPORTED',
  },
  meta: {
    schemaVersion: 'nightwatch.control-center.meta.v1',
    apiVersion: 'v1',
    service: 'NIGHTWATCH_CONTROL_CENTER',
    scope: 'LOCAL_LOOPBACK_ONLY',
    authorizationClass: 'CONTROL_CENTER_LOCAL_READ_ONLY_UI_ONLY',
    readOnly: true,
    executionAuthority: 'NONE',
    mutationAuthority: 'NONE',
    productContact: 'DISABLED',
    externalNetwork: 'DISABLED',
    findingsStorage: 'OWNER_LOCAL_ONLY',
    ownerScopeStatus: 'FROZEN_BY_OWNER',
    ownerScopeReason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE',
    features: { readiness: true, safety: true },
    limits: { maxPageLimit: 50, maxTimelineLimit: 100, maxGraphDepth: 4 },
  },
  readiness: {
    schemaVersion: 'nightwatch.control-center.readiness.v1',
    scope: 'LOCAL_SYNTHETIC',
    readyClaim: 'LOCAL_SYNTHETIC_ONLY',
    category: 'READY_LOCAL_SYNTHETIC',
    state: 'READY',
    applies: true,
    sourceContracts: {
      totalFamilies: 12,
      activeFamilies: 10,
      archivedFamilies: 2,
      approvedTargets: 8,
      targetsWithActiveFamily: 8,
      currentnessCounts: { CURRENT: 8 },
      staleTargets: [],
      unavailableTargets: [],
    },
    campaign: { category: 'PINNED_CONSISTENT', comparedKeys: ['one'], driftKeys: [], unmeasured: false },
    checkpointCompatibility: 'CURRENT_SCHEMA',
    analyzer: { pinnedVersion: 'synthetic', observedVersion: 'synthetic', availability: 'AVAILABLE', versionConsistent: true, blocked: false },
    verification: { deferredDimensions: [], notMeasuredDimensions: [], allDeferredToHardening: false },
    unresolvedBlockers: [],
    externalCi: 'UNKNOWN',
    externalCiClassification: 'UNMEASURED_UNKNOWN',
    ownerScope: { status: 'FROZEN_BY_OWNER', reason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE', frozenOperationCount: 3, matchesFrozenMarkers: true },
  },
  safety: {
    schemaVersion: 'nightwatch.control-center.safety.v1',
    state: 'UNKNOWN',
    scope: 'LOCAL_LOOPBACK_ONLY',
    readOnly: true,
    authMode: 'OWNER_LOCAL_ONLY_NO_AUTH_SESSION',
    networkPosture: 'LOOPBACK_ONLY_EXTERNAL_EGRESS_DISABLED',
    rawEvidenceExposure: 'DISABLED',
    ownerScope: { status: 'FROZEN_BY_OWNER', reason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE' },
    operationPolicy: { controlCenter: 'READ_ONLY', productContact: 'DISABLED', execution: 'NONE', mutation: 'NONE', database: 'OUT_OF_SCOPE', infrastructure: 'OUT_OF_SCOPE', publication: 'DISABLED' },
    continuity: { state: 'CURRENT', branch: 'synthetic', headSha: null, checkpointDigest: null },
    checks: [],
    blockedOperationClasses: [],
  },
  source: {
    schemaVersion: 'nightwatch.control-center.source-summary.v3',
    state: 'UNAVAILABLE',
    inventoryDigest: null,
    repositoryCount: 0,
    surfaceCount: 0,
    currentness: [],
    lifecycle: [],
    proof: [],
    capabilities: [],
    gapReasons: ['SOURCE_REPOSITORY_UNAVAILABLE'],
    proofChain: null,
    completeness: {
      state: 'UNKNOWN',
      coverageState: 'UNMEASURED',
      limit: 0,
      total: null,
      examined: 0,
      projected: 0,
      dropped: 0,
      truncated: false,
      remainingUnknown: true,
      enumeration: { state: 'UNKNOWN', limit: 0, examinedFiles: 0, totalFiles: null, droppedFiles: null, remainingUnknown: true },
      contentRead: { state: 'UNKNOWN', candidateFiles: 0, readFiles: 0, admittedFiles: 0, droppedFiles: 0, unreadableFiles: 0 },
    },
  },
};


// ---------------------------------------------------------------------------
// Review-store operations fixtures.
//
// The store deliberately contains one of everything an operator might have to
// look at: a current review, a historical one, a corrupt generation, an
// interrupted publish, and a file Nightwatch did not write whose NAME carries
// a sentinel. The last one is the point of the digest projection.
// ---------------------------------------------------------------------------

const reviewStoreSnapshot = {
  schemaVersion: 'nightwatch.control-center.review-store.v1',
  state: 'AVAILABLE',
  exists: true,
  depth: 'DEEP',
  currentnessResolved: true,
  counts: {
    entries: 5, canonicalArtifacts: 3, validArtifacts: 2, corruptArtifacts: 1, unreadableArtifacts: 0,
    temporaryArtifacts: 1, unknownEntries: 1, nonFileEntries: 0, uniqueFindings: 1, generations: 2,
    findingsWithMultipleGenerations: 1, current: 1, stale: 1, unknownCurrentness: 0,
  },
  bytes: { total: 4096, canonical: 3072, temporary: 512, unknown: 512, nonFile: 0 },
  health: { conditions: ['CORRUPTION_PRESENT', 'UNKNOWN_FILES_PRESENT', 'TEMPORARY_RESIDUE_PRESENT', 'STALE_HISTORY_PRESENT'], classification: 'CORRUPTION_PRESENT' },
  byDecision: [{ code: 'ACCEPT_EVIDENCE', count: 1 }, { code: 'MARK_INSUFFICIENT', count: 1 }],
  byResultingState: [{ code: 'INSUFFICIENT_EVIDENCE', count: 1 }, { code: 'REVIEWED', count: 1 }],
  oldestStoredAt: '2026-09-01T10:00:00Z',
  newestStoredAt: '2026-09-05T10:00:00Z',
  corruption: [{ fileName: 'review.aaaaaaaaaaaa.bbbbbbbbbbbbbbbbbbbbbbbb.json', code: 'REVIEW_STORE_CORRUPT' }],
  corruptionPage: { offset: 0, limit: 50, total: 1, truncated: false },
  unknownEntries: [{ nameDigest: 'review-unknown-entry:aaaaaaaaaaaaaaaaaaaaaaaa', bytes: 512, kind: 'UNKNOWN' }],
  unknownEntriesPage: { offset: 0, limit: 50, total: 1, truncated: false },
  temporaries: [{ name: '.nightwatch-123-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.tmp', bytes: 512 }],
  temporariesPage: { offset: 0, limit: 50, total: 1, truncated: false },
  findings: [{ findingId: 'candidate-review-1', generations: 2, currentGenerations: 1, staleGenerations: 1, unknownGenerations: 0 }],
  findingsPage: { offset: 0, limit: 50, total: 1, truncated: false },
  inventoryDigest: 'review-inventory:cccccccccccccccccccccccc',
  readOnly: true,
  retentionPolicy: 'NONE_OWNER_DECISION_PENDING',
  organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
};

const generation = (identity: string, currentness: 'CURRENT' | 'STALE', decision: string, resultingState: string, storedAt: string) => ({
  reviewIdentity: identity,
  sourceSha: 'synthetic.no-source-evidence',
  campaignId: 'campaign.local.1',
  dossierDigest: 'dossier:aaaaaaaaaaaaaaaaaaaaaaaa',
  findingDigest: 'finding:bbbbbbbbbbbbbbbbbbbbbbbb',
  reviewedAt: storedAt,
  storedAt,
  decision,
  resultingState,
  currentness,
  staleReason: currentness === 'STALE' ? 'FINDING_REVIEW_STALE_DOSSIERDIGEST' : null,
  expectationId: null,
  semanticContractId: null,
  identityAbsenceReason: 'REVIEW_BINDING_CARRIES_NO_SEMANTIC_IDENTITY',
  organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
});

const reviewHistorySnapshot = {
  schemaVersion: 'nightwatch.control-center.review-history.v1',
  findingId: 'candidate-review-1',
  state: 'CURRENT',
  generations: [
    generation('cccccccccccccccccccccccc', 'CURRENT', 'MARK_INSUFFICIENT', 'INSUFFICIENT_EVIDENCE', '2026-09-05T10:00:00Z'),
    generation('dddddddddddddddddddddddd', 'STALE', 'ACCEPT_EVIDENCE', 'REVIEWED', '2026-09-01T10:00:00Z'),
  ],
  page: { offset: 0, limit: 50, total: 2, truncated: false },
  currentGeneration: 'cccccccccccccccccccccccc',
  staleGenerationCount: 1,
  corruption: [],
  decisionChangedAcrossGenerations: true,
  currentExpectationId: 'expectation.invoice-total',
  currentSemanticContractId: null,
  organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
};

const reviewFilingSnapshot = {
  schemaVersion: 'nightwatch.control-center.review-filing.v1',
  findingId: 'candidate-review-1',
  reviewState: 'CURRENT',
  markdown: '# Synthetic finding\n\n## Local review (FACT: current local decision, not organizational sign-off)\n\n- Decision: MARK_INSUFFICIENT -> INSUFFICIENT_EVIDENCE\n',
  distribution: 'PRIVATE_LOCAL_MANUAL_COPY_ONLY',
  organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
};

function responseFor(value: unknown): Response {
  return { ok: true, status: 200, json: async () => value } as Response;
}

function installFetch(value: OverviewSnapshot = overview): ReturnType<typeof vi.fn> {
  const snapshots: Record<string, unknown> = {
    [CONTROL_CENTER_API_PATHS.health]: value.health,
    [CONTROL_CENTER_API_PATHS.meta]: value.meta,
    [CONTROL_CENTER_API_PATHS.readiness]: value.readiness,
    [CONTROL_CENTER_API_PATHS.safety]: value.safety,
    [CONTROL_CENTER_API_PATHS.sourceSummary]: value.source,
    '/api/v1/source/surfaces?limit=50': { schemaVersion: 'nightwatch.control-center.source-surfaces.v1', items: [], page: { limit: 50, nextCursor: null, truncated: false }, repositoryFilter: null },
    '/api/v1/findings?limit=50': { schemaVersion: 'nightwatch.control-center.findings.v1', state: 'UNAVAILABLE', items: [], page: { limit: 50, nextCursor: null, truncated: false } },
    '/api/v1/runs?limit=20': { schemaVersion: 'nightwatch.control-center.run-list.v1', items: [], page: { limit: 20, nextCursor: null, truncated: false } },
    [CONTROL_CENTER_API_PATHS.campaignSummary]: { schemaVersion: 'nightwatch.control-center.campaign.v1', planState: 'UNAVAILABLE', sourceCurrentness: 'UNAVAILABLE', ownerScopeStatus: 'FROZEN_BY_OWNER', ownerScopeReason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE', planDigest: null, coverageDigest: null, counts: { candidates: 0, selected: 0, excluded: 0, coveredContracts: 0, executionOnly: 0, oracleOnly: 0, replayGaps: 0, minimizationGaps: 0, staleSourceGaps: 0, semanticAuthorityGaps: 0, findings: 0 }, blockerCodes: ['CAMPAIGN_SOURCE_UNAVAILABLE'], reasonCodes: ['SOURCE_UNAVAILABLE'] },
    '/api/v1/campaign/coverage?limit=50': { schemaVersion: 'nightwatch.control-center.campaign-coverage.v1', items: [], page: { limit: 50, nextCursor: null, truncated: false }, fullyCoveredContractCount: 0 },
    '/api/v1/review-store/inventory?limit=50&offset=0': reviewStoreSnapshot,
    '/api/v1/review-store/history/candidate-review-1?limit=50&offset=0': reviewHistorySnapshot,
    '/api/v1/review-store/filing/candidate-review-1': reviewFilingSnapshot,
  };
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    expect(init?.method).toBe('GET');
    expect(init?.credentials).toBe('omit');
    const path = String(input);
    return Promise.resolve(responseFor(snapshots[path]));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('Control Center UI shell', () => {
  beforeEach(() => {
    window.location.hash = '';
    installFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the overview through parallel bounded GET snapshots', async () => {
    const fetchMock = installFetch();
    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading local snapshots');
    expect(await screen.findByRole('heading', { name: 'Know the posture before the next run.' })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(screen.getByText('No checks reported')).toBeInTheDocument();
    expect(screen.getByText('Absence of blockers is not a proof of product pass.')).toBeInTheDocument();
  });

  it('exposes all approved navigation views with keyboard-friendly links', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Know the posture before the next run.' });
    const primaryNav = within(screen.getByRole('navigation', { name: 'Primary' }));
    const runsLink = primaryNav.getByRole('link', { name: 'Runs' });
    expect(runsLink).toHaveAttribute('href', '#runs');
    await user.click(runsLink);
    expect(await screen.findByRole('heading', { name: 'Inspect what happened, in order.' })).toBeVisible();
    expect(screen.getByText('No local runs recorded')).toBeInTheDocument();
    // Derived from VIEW_DEFINITIONS, never a literal. A hard-coded count is
    // how a new panel ships without navigation qualification noticing: the
    // number stays green because nobody changed it, and the assertion's name
    // ("all approved navigation views") keeps claiming totality it no longer
    // has. Every declared view must be reachable, and nothing else may be.
    const navLinks = primaryNav.getAllByRole('link');
    expect(navLinks).toHaveLength(VIEW_DEFINITIONS.length);
    expect(navLinks.map((link) => link.textContent).sort()).toEqual(VIEW_DEFINITIONS.map((view) => view.label).sort());
    await user.click(primaryNav.getByRole('link', { name: 'Safety Center' }));
    expect(await screen.findByRole('heading', { name: 'Safety is a posture, not a green badge.' })).toBeVisible();
    expect(screen.getByText('Source inventory unavailable')).toBeInTheDocument();
    await user.click(primaryNav.getByRole('link', { name: 'Campaign Intelligence' }));
    expect(await screen.findByRole('heading', { name: 'See the shape of coverage.' })).toBeVisible();
    expect(screen.getByText('No coverage rows reported. Empty coverage does not prove pass.')).toBeInTheDocument();
    await user.click(primaryNav.getByRole('link', { name: 'Source Intelligence' }));
    expect(await screen.findByRole('heading', { name: 'Follow proof, currentness, and capability.' })).toBeVisible();
    expect(screen.getByText('No source surfaces available. This is an unavailable/empty inventory, not proof of no routes.')).toBeInTheDocument();
    await user.click(primaryNav.getByRole('link', { name: 'Findings' }));
    expect(await screen.findByRole('heading', { name: 'Keep the signal, lose the raw evidence.' })).toBeVisible();
    expect(screen.getByText('Owner-local findings are unavailable. No finding or pass claim is made.')).toBeInTheDocument();
  });

  it('keeps navigation and controls local, typed, and keyboard reachable', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: 'Know the posture before the next run.' });
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main-content');
    // The permitted hrefs are DERIVED from the declared view set for the same
    // reason as the count above: a literal alternation silently stops
    // covering a view the moment one is added.
    const permittedHrefs = new Set(VIEW_DEFINITIONS.map((view) => (view.id === 'overview' ? '#' : `#${view.id}`)));
    for (const link of within(screen.getByRole('navigation', { name: 'Primary' })).getAllByRole('link')) {
      expect(permittedHrefs.has(link.getAttribute('href') ?? '')).toBe(true);
    }
    for (const button of screen.getAllByRole('button')) expect(button).toHaveAttribute('type', 'button');
    expect(document.querySelectorAll('img, iframe, object, embed')).toHaveLength(0);
  });


  it('separates the current review from historical ones by text, not by colour', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Know the posture before the next run.' });
    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Review Store' }));
    expect(await screen.findByRole('heading', { name: 'See what the store holds, and change none of it.' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: /History/ }));
    expect(await screen.findByRole('heading', { name: 'candidate-review-1' })).toBeVisible();

    // The distinction is TEXT. A reader in monochrome, or through a screen
    // reader, must be able to tell which decision is in force.
    expect(screen.getByText('CURRENT REVIEW')).toBeInTheDocument();
    expect(screen.getByText('HISTORICAL REVIEW')).toBeInTheDocument();
    expect(screen.getByText('binds to the current artifact')).toBeInTheDocument();
    expect(screen.getByText('does not bind to the current artifact')).toBeInTheDocument();
    // Both decisions are visible on their own rows: a stale review is
    // evidence, not noise. Scoped to the row, because the same decision
    // vocabulary also appears in the store-wide tally above.
    const currentRow = screen.getByText('CURRENT REVIEW').closest('tr');
    const historicalRow = screen.getByText('HISTORICAL REVIEW').closest('tr');
    expect(within(currentRow as HTMLElement).getByText('Mark Insufficient')).toBeInTheDocument();
    expect(within(historicalRow as HTMLElement).getByText('Accept Evidence')).toBeInTheDocument();
    // The stale row says WHY it no longer binds.
    expect(within(historicalRow as HTMLElement).getByText('Finding Review Stale Dossierdigest')).toBeInTheDocument();
  });

  it('reports every health condition rather than one collapsed word', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Know the posture before the next run.' });
    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Review Store' }));
    await screen.findByRole('heading', { name: 'See what the store holds, and change none of it.' });
    const conditions = within(screen.getByTestId('review-store-conditions'));
    for (const label of ['Corruption Present', 'Unknown Files Present', 'Temporary Residue Present', 'Stale History Present']) {
      expect(conditions.getByText(label), label).toBeInTheDocument();
    }
    // Stale history is explained as the store working, not as a fault.
    expect(screen.getByText('Historical evidence is present. This is the store working as designed, not a fault.')).toBeInTheDocument();
  });

  it('never names an unrecognized store entry, and offers no way to remove one', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Know the posture before the next run.' });
    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Review Store' }));
    await screen.findByRole('heading', { name: 'See what the store holds, and change none of it.' });
    expect(screen.getByText('review-unknown-entry:aaaaaaaaaaaaaaaaaaaaaaaa')).toBeInTheDocument();
    expect(screen.getByText('A name Nightwatch did not choose is never echoed. These files are not opened, not interpreted, and not removed.')).toBeInTheDocument();
    // No destructive control exists anywhere on the surface.
    for (const button of screen.getAllByRole('button')) {
      expect(button.textContent ?? '').not.toMatch(/delete|remove|prune|repair|archive|clean/i);
    }
    expect(screen.getByText(/Nothing in this view deletes, repairs, archives or rewrites a review/)).toBeInTheDocument();
  });

  it('renders the private filing report on request and marks it local', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Know the posture before the next run.' });
    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Review Store' }));
    await screen.findByRole('heading', { name: 'See what the store holds, and change none of it.' });
    await user.click(screen.getByRole('button', { name: /History/ }));
    await screen.findByRole('heading', { name: 'candidate-review-1' });
    await user.click(screen.getByRole('button', { name: /Filing report/ }));
    const report = await screen.findByTestId('filing-report');
    expect(report.textContent).toContain('## Local review (FACT: current local decision, not organizational sign-off)');
    expect(screen.getByText(/Nothing here submits it anywhere/)).toBeInTheDocument();
  });

  it('contains unavailable service errors without echoing raw error text', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('SENTINEL_RAW_SERVICE_ERROR'))));
    render(<App />);
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(document.body).not.toHaveTextContent('SENTINEL_RAW_SERVICE_ERROR');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('contains render failures behind a safe error boundary', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function ThrowingView(): never {
      throw new Error('SENTINEL_COMPONENT_FAILURE');
    }
    render(<ControlCenterErrorBoundary><ThrowingView /></ControlCenterErrorBoundary>);
    expect(screen.getByRole('heading', { name: 'This view could not be rendered.' })).toBeVisible();
    expect(document.body).not.toHaveTextContent('SENTINEL_COMPONENT_FAILURE');
    fireEvent.click(screen.getByRole('button', { name: 'Return to the dashboard' }));
    expect(screen.getByRole('heading', { name: 'This view could not be rendered.' })).toBeVisible();
    consoleError.mockRestore();
  });

  it('keeps retry behavior bounded to another local snapshot read', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('SENTINEL_NETWORK'))
      .mockImplementation((input: RequestInfo | URL) => {
        const path = String(input);
        const snapshots: Record<string, unknown> = {
          [CONTROL_CENTER_API_PATHS.health]: overview.health,
          [CONTROL_CENTER_API_PATHS.meta]: overview.meta,
          [CONTROL_CENTER_API_PATHS.readiness]: overview.readiness,
          [CONTROL_CENTER_API_PATHS.safety]: overview.safety,
          [CONTROL_CENTER_API_PATHS.sourceSummary]: overview.source,
        };
        return Promise.resolve(responseFor(snapshots[path]));
      });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await screen.findByRole('alert');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Know the posture before the next run.' })).toBeVisible());
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it('renders distinct run outcomes, ordered timeline data, and a bounded graph', async () => {
    const user = userEvent.setup();
    const run = {
      runId: 'run-01:synthetic', environment: 'LOCAL_SYNTHETIC', product: 'ripple', browser: 'chromium', scenario: 'smoke',
      startedAt: '2026-08-26T10:20:30.000Z', endedAt: '2026-08-26T10:20:31.000Z', durationMs: 1000, status: 'PASSED', passed: true,
      eventCount: 2, hardFailureCount: 0, oracleFindingCount: 0, nightwatchSha: null,
    };
    const runs = {
      schemaVersion: 'nightwatch.control-center.run-list.v1',
      items: [run, { ...run, runId: 'run-02:synthetic', status: 'ORACLE_ONLY', passed: false }, { ...run, runId: 'run-03:synthetic', status: 'SAFETY_FAILURE', passed: false }, { ...run, runId: 'run-04:synthetic', status: 'BLOCKED', passed: false }, { ...run, runId: 'run-05:synthetic', status: 'INCOMPLETE', passed: false }],
      page: { limit: 20, nextCursor: null, truncated: false },
    };
    const responses: Record<string, unknown> = {
      [CONTROL_CENTER_API_PATHS.health]: overview.health,
      [CONTROL_CENTER_API_PATHS.meta]: overview.meta,
      [CONTROL_CENTER_API_PATHS.readiness]: overview.readiness,
      [CONTROL_CENTER_API_PATHS.safety]: overview.safety,
      [CONTROL_CENTER_API_PATHS.sourceSummary]: overview.source,
      '/api/v1/runs?limit=20': runs,
      '/api/v1/runs/run-01:synthetic': { schemaVersion: 'nightwatch.control-center.run-detail.v1', run, repositories: [], countsByEventType: [], countsBySeverity: [], screenshotCount: 0, hardFailureCodes: [], noteCodes: [] },
      '/api/v1/runs/run-01:synthetic/timeline?afterSeq=0&limit=100': { schemaVersion: 'nightwatch.control-center.timeline.v1', runId: run.runId, afterSeq: 0, events: [{ seq: 1, timestamp: run.startedAt, eventType: 'start', severity: 'info', messageCode: 'RUN_STARTED', dataCodes: [] }, { seq: 2, timestamp: run.endedAt, eventType: 'end', severity: 'info', messageCode: 'RUN_FINISHED', dataCodes: [] }], nextAfterSeq: null, truncated: false },
      '/api/v1/runs/run-01:synthetic/execution-graph': { schemaVersion: 'nightwatch.control-center.execution-graph.v1', runId: run.runId, nodes: [{ nodeId: 'node-run', kind: 'RUN', state: 'PASSED', label: 'Smoke', eventSeq: null, reasonCode: null }, { nodeId: 'node-policy', kind: 'POLICY', state: 'BLOCKED', label: 'Policy', eventSeq: 2, reasonCode: 'POLICY_BLOCKED' }], edges: [{ edgeId: 'edge-01', fromNodeId: 'node-run', toNodeId: 'node-policy', kind: 'CONTAINS', proof: 'OBSERVED', eventSeq: 2 }], nodeLimit: 250, edgeLimit: 500, truncated: false },
    };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe('GET');
      return Promise.resolve(responseFor(responses[String(input)]));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await screen.findByRole('heading', { name: 'Know the posture before the next run.' });
    const primaryNav = within(screen.getByRole('navigation', { name: 'Primary' }));
    await user.click(primaryNav.getByRole('link', { name: 'Runs' }));
    expect(await screen.findByRole('heading', { name: 'Inspect what happened, in order.' })).toBeVisible();
    expect(screen.getAllByText('Oracle Only').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Safety Failure').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Blocked').length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole('button', { name: 'Inspect' })[0]!);
    expect(await screen.findByRole('heading', { name: 'smoke' })).toBeVisible();
    expect(screen.getByText('Run Started')).toBeInTheDocument();
    await user.click(primaryNav.getByRole('link', { name: 'Execution Graph' }));
    expect(await screen.findByRole('heading', { name: 'Trace the bounded run shape.' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Execution graph for run run-01:synthetic' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/runs/run-01:synthetic/execution-graph', expect.objectContaining({ method: 'GET' }));
  });

  it('preserves campaign counts and coverage gaps without inventing a score', async () => {
    const user = userEvent.setup();
    const responses: Record<string, unknown> = {
      [CONTROL_CENTER_API_PATHS.health]: overview.health,
      [CONTROL_CENTER_API_PATHS.meta]: overview.meta,
      [CONTROL_CENTER_API_PATHS.readiness]: overview.readiness,
      [CONTROL_CENTER_API_PATHS.safety]: overview.safety,
      [CONTROL_CENTER_API_PATHS.sourceSummary]: overview.source,
      [CONTROL_CENTER_API_PATHS.campaignSummary]: { schemaVersion: 'nightwatch.control-center.campaign.v1', planState: 'AVAILABLE', sourceCurrentness: 'CURRENT', ownerScopeStatus: 'FROZEN_BY_OWNER', ownerScopeReason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE', planDigest: 'plan:sha256:aaaaaaaaaaaaaaaaaaaaaaaa', coverageDigest: 'coverage:sha256:bbbbbbbbbbbbbbbbbbbbbbbb', counts: { candidates: 3, selected: 2, excluded: 1, coveredContracts: 1, executionOnly: 1, oracleOnly: 1, replayGaps: 1, minimizationGaps: 0, staleSourceGaps: 0, semanticAuthorityGaps: 1, findings: 1 }, blockerCodes: [], reasonCodes: [] },
      '/api/v1/campaign/coverage?limit=50': { schemaVersion: 'nightwatch.control-center.campaign-coverage.v1', items: [{ memberId: 'member-01', product: 'ripple', surface: 'summary', contractId: 'contract-01', sourceCurrentness: 'CURRENT', stages: [{ stageCode: 'EXECUTION', state: 'PROVEN', reasonCodes: [] }, { stageCode: 'REPLAY', state: 'GAP', reasonCodes: ['REPLAY_UNAVAILABLE'] }], gapReasons: ['REPLAY_UNAVAILABLE'], fullyCovered: false }], page: { limit: 50, nextCursor: null, truncated: false }, fullyCoveredContractCount: 0 },
    };
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => Promise.resolve(responseFor(responses[String(input)]))));
    render(<App />);
    await screen.findByRole('heading', { name: 'Know the posture before the next run.' });
    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Campaign Intelligence' }));
    expect(await screen.findByRole('heading', { name: 'See the shape of coverage.' })).toBeVisible();
    expect(screen.getByText('summary · contract-01')).toBeInTheDocument();
    expect(screen.getByText('Gap present')).toBeInTheDocument();
    expect(screen.getByText('Replay · Gap')).toBeInTheDocument();
    expect(screen.queryByText('Score', { exact: true })).not.toBeInTheDocument();
  });

  it('renders source proof descriptors and a bounded source graph', async () => {
    const user = userEvent.setup();
    const sourceSummary = {
      ...overview.source,
      state: 'AVAILABLE' as const,
      repositoryCount: 1,
      surfaceCount: 1,
      currentness: [{ key: 'SOURCE_STALE', count: 1 }],
      completeness: {
        state: 'COMPLETE' as const,
        coverageState: 'PROVEN' as const,
        limit: 4096,
        total: 1,
        examined: 1,
        projected: 1,
        dropped: 0,
        truncated: false,
        remainingUnknown: false,
        enumeration: { state: 'COMPLETE' as const, limit: 1000, examinedFiles: 10, totalFiles: 10, droppedFiles: 0, remainingUnknown: false },
        contentRead: { state: 'COMPLETE' as const, candidateFiles: 10, readFiles: 10, admittedFiles: 10, droppedFiles: 0, unreadableFiles: 0 },
      },
    };
    const sourceSurfaces = {
      schemaVersion: 'nightwatch.control-center.source-surfaces.v1',
      items: [{
        surfaceId: 'surface-01', repositoryId: 'repo-01', sourceSha: null, evidenceDigest: null,
        language: 'PHP', method: 'GET' as const, routeTemplate: '/safe/summary', handlerState: 'EXACT' as const,
        routeProof: 'PROVEN' as const, readOnlyClassification: 'PROVEN_READ_ONLY' as const,
        runtimeBinding: 'RUNTIME_BOUND_EXACT' as const, currentness: 'SOURCE_STALE' as const,
        lifecycle: 'MECHANICALLY_PROVEN', projectionCapability: 'SUPPORTED' as const,
        replayCapability: 'UNPROVEN' as const, differentialCapability: 'UNSUPPORTED' as const, exclusionReasons: [],
      }],
      page: { limit: 50, nextCursor: null, truncated: false }, repositoryFilter: null,
    };
    const sourceGraph = {
      schemaVersion: 'nightwatch.control-center.source-graph.v1', surfaceId: 'surface-01', depth: 2,
      nodes: [
        { nodeId: 'surface-01', kind: 'SURFACE', label: '/safe/summary', proof: 'PROVEN', currentness: 'SOURCE_STALE', lifecycle: 'MECHANICALLY_PROVEN', capability: 'SUPPORTED' },
        { nodeId: 'request-01', kind: 'REQUEST_CONTRACT', label: 'Request', proof: 'OBSERVED', currentness: 'SOURCE_STALE', lifecycle: null, capability: 'UNPROVEN' },
      ],
      edges: [{ edgeId: 'edge-01', fromNodeId: 'surface-01', toNodeId: 'request-01', kind: 'JOINS_REQUEST', proof: 'OBSERVED' }],
      nodeLimit: 250, edgeLimit: 500, truncated: false,
    };
    const responses: Record<string, unknown> = {
      [CONTROL_CENTER_API_PATHS.health]: overview.health,
      [CONTROL_CENTER_API_PATHS.meta]: overview.meta,
      [CONTROL_CENTER_API_PATHS.readiness]: overview.readiness,
      [CONTROL_CENTER_API_PATHS.safety]: overview.safety,
      [CONTROL_CENTER_API_PATHS.sourceSummary]: sourceSummary,
      '/api/v1/source/surfaces?limit=50': sourceSurfaces,
      '/api/v1/source/graph?depth=2&surface=surface-01': sourceGraph,
    };
    const fetchMock = vi.fn((input: RequestInfo | URL) => Promise.resolve(responseFor(responses[String(input)])));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await screen.findByRole('heading', { name: 'Know the posture before the next run.' });
    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Source Intelligence' }));
    expect(await screen.findByRole('heading', { name: 'Follow proof, currentness, and capability.' })).toBeVisible();
    expect(screen.getByText('/safe/summary')).toBeInTheDocument();
    expect(screen.getAllByText('Source Stale').length).toBeGreaterThan(0);
    expect(screen.getByText('Proven Read Only')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Graph' }));
    expect(await screen.findByRole('img', { name: 'Bounded source intelligence graph' })).toBeInTheDocument();
    expect(screen.getByText('Request')).toBeInTheDocument();
    // C-15b renamed the pill from "Bounded" to state what bounded MEANS.
    expect(screen.getByText('Complete within bounds')).toBeInTheDocument();
    // And the view is now interactive rather than a fixed grid.
    expect(screen.getByRole('searchbox', { name: 'Search graph nodes' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Zoom and pan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/source/graph?depth=2&surface=surface-01', expect.objectContaining({ method: 'GET' }));
  });

  it('visibly marks a truncated, enumeration-bounded source population', async () => {
    const user = userEvent.setup();
    const sourceSummary = {
      ...overview.source,
      state: 'AVAILABLE' as const,
      repositoryCount: 2,
      surfaceCount: 4096,
      currentness: [{ key: 'CURRENT', count: 4096 }],
      completeness: {
        // Projection dropped a known 104, and the file walk was bounded, so
        // the true total is not knowable at all.
        state: 'UNKNOWN' as const,
        coverageState: 'UNKNOWN' as const,
        limit: 4096,
        total: null,
        examined: 4200,
        projected: 4096,
        dropped: 104,
        truncated: true,
        remainingUnknown: true,
        enumeration: { state: 'TRUNCATED' as const, limit: 512, examinedFiles: 512, totalFiles: null, droppedFiles: null, remainingUnknown: true },
        contentRead: { state: 'COMPLETE' as const, candidateFiles: 512, readFiles: 512, admittedFiles: 512, droppedFiles: 0, unreadableFiles: 0 },
      },
    };
    const responses: Record<string, unknown> = {
      [CONTROL_CENTER_API_PATHS.health]: overview.health,
      [CONTROL_CENTER_API_PATHS.meta]: overview.meta,
      [CONTROL_CENTER_API_PATHS.readiness]: overview.readiness,
      [CONTROL_CENTER_API_PATHS.safety]: overview.safety,
      [CONTROL_CENTER_API_PATHS.sourceSummary]: sourceSummary,
      '/api/v1/source/surfaces?limit=50': {
        schemaVersion: 'nightwatch.control-center.source-surfaces.v1',
        items: [],
        page: { limit: 50, nextCursor: null, truncated: true },
        repositoryFilter: null,
      },
    };
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => Promise.resolve(responseFor(responses[String(input)]))));
    render(<App />);
    await screen.findByRole('heading', { name: 'Know the posture before the next run.' });
    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Source Intelligence' }));
    expect(await screen.findByRole('heading', { name: 'Follow proof, currentness, and capability.' })).toBeVisible();

    // The population panel exists and separates the two upstream dimensions.
    expect(screen.getByText('POPULATION COMPLETENESS')).toBeVisible();
    expect(screen.getByText('ENUMERATION')).toBeVisible();
    expect(screen.getByText('CONTENT READ')).toBeVisible();

    // The truncated population is never presentable as a complete one: the
    // total is explicitly unknown and the dropped count is shown.
    expect(screen.getByText('4096, total unknown')).toBeVisible();
    expect(screen.getByText('total unknown')).toBeVisible();
    expect(screen.getByText('104')).toBeVisible();
    expect(screen.getAllByText('Truncated').length).toBeGreaterThan(0);

    // Warning tone, not the neutral/ready tone a complete population gets.
    const warned = (label: string): boolean => screen.getAllByText(label).some((node) => /warning/.test(node.className) || /warning/.test(node.parentElement?.className ?? ''));
    expect(warned('Unknown')).toBe(true);
    expect(warned('Truncated')).toBe(true);
    expect(warned('Yes')).toBe(true);
  });

  it('renders sanitized finding metadata without raw dossier fields', async () => {
    const user = userEvent.setup();
    const finding = {
      findingId: 'cc-finding-candidate-01', fingerprint: 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa', clusterId: null,
      title: 'Read contract drift', product: 'ripple', surface: 'summary', severity: 'HIGH' as const,
      confidence: 'HIGH' as const, evidenceLevel: 'L2' as const, reproduction: 'REPRODUCED' as const,
      reproductionCount: 2, minimized: true, sourceCurrentness: 'SOURCE_STALE' as const, dossierStatus: 'READY' as const,
      firstObservedAt: '2026-08-26T10:20:30.000Z', lastObservedAt: '2026-08-26T10:20:31.000Z',
      categoryCode: 'PROTOCOL_FINDING', provenanceDigest: 'cc-finding:sha256:bbbbbbbbbbbbbbbbbbbbbbbb',
      rawEvidence: 'SENTINEL_RAW_EVIDENCE', sourcePath: 'SENTINEL_SOURCE_PATH', requestBody: 'SENTINEL_REQUEST_BODY',
    };
    const responses: Record<string, unknown> = {
      [CONTROL_CENTER_API_PATHS.health]: overview.health,
      [CONTROL_CENTER_API_PATHS.meta]: overview.meta,
      [CONTROL_CENTER_API_PATHS.readiness]: overview.readiness,
      [CONTROL_CENTER_API_PATHS.safety]: overview.safety,
      [CONTROL_CENTER_API_PATHS.sourceSummary]: overview.source,
      '/api/v1/findings?limit=50': { schemaVersion: 'nightwatch.control-center.findings.v1', state: 'AVAILABLE', items: [finding], page: { limit: 50, nextCursor: null, truncated: false } },
    };
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => Promise.resolve(responseFor(responses[String(input)]))));
    render(<App />);
    await screen.findByRole('heading', { name: 'Know the posture before the next run.' });
    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Findings' }));
    expect(await screen.findByRole('heading', { name: 'Keep the signal, lose the raw evidence.' })).toBeVisible();
    expect(screen.getByText('Read contract drift')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getAllByText('Source Stale').length).toBeGreaterThan(0);
    expect(screen.getByText('Provenance recorded')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('SENTINEL_RAW_EVIDENCE');
    expect(document.body).not.toHaveTextContent('SENTINEL_SOURCE_PATH');
    expect(document.body).not.toHaveTextContent('SENTINEL_REQUEST_BODY');
  });

  // RS-1 reviewer view. The three failures worth testing for are: an advisory
  // suggestion presented as a verdict, an UNKNOWN presented as a weak yes, and
  // a value crossing the privacy boundary onto the screen.
  it('labels every reviewer element and never renders UNKNOWN as a weak yes', async () => {
    const user = userEvent.setup();
    const element = (epistemicClass: string, value: unknown, basis: readonly string[] = []) => ({ epistemicClass, value, basis });
    const item = {
      findingId: 'cc-reviewer-01',
      relationship: element('RECOMMENDATION', {
        relationship: 'PROBABLE_DUPLICATE', confidence: 'SUPPORTED', possibleOriginalId: 'cc-reviewer-00',
        counterevidence: ['MISSING_COMPARISON_INPUT'], advisoryOnly: true, finalVerdictAuthority: 'HUMAN_ORGANIZATIONAL',
      }, ['SAME_FINGERPRINT']),
      probableDuplicates: [{ findingId: 'cc-reviewer-00', relationship: 'PROBABLE_DUPLICATE', confidence: 'SUPPORTED', basis: ['SAME_FINGERPRINT'], advisoryOnly: true, finalVerdictAuthority: 'HUMAN_ORGANIZATIONAL' }],
      recurrence: element('FACT', { recurrence: 'RECURRENT', priorFindingId: 'cc-reviewer-00' }, ['RECURRENT']),
      defectClass: element('UNKNOWN', null, ['NO_DEFECT_CLASS_IDENTIFIED']),
      expectationProvenance: element('FACT', 'MACHINE_CONTRACT', ['MACHINE_CONTRACT']),
      confidence: element('UNKNOWN', null, ['INSUFFICIENT']),
      alphausRecommendation: {
        severity: element('RECOMMENDATION', 'CRITICAL', ['DOSSIER_TECHNICAL_SEVERITY']),
        catchStage: element('RECOMMENDATION', 'PR_REVIEW', ['LOCAL_PRE_REVIEW_OBSERVATION']),
        source: element('RECOMMENDATION', 'SELF_FOUND', ['NIGHTWATCH_LOCAL_DISCOVERY']),
        team: element('UNKNOWN', null, []),
      },
      localReview: element('UNKNOWN', null, ['REVIEW_PENDING']),
      unknowns: ['NO_LOCAL_REVIEW_STORE'],
      rawRationale: 'SENTINEL_REVIEW_PROSE',
    };
    const responses: Record<string, unknown> = {
      [CONTROL_CENTER_API_PATHS.health]: overview.health,
      [CONTROL_CENTER_API_PATHS.meta]: overview.meta,
      [CONTROL_CENTER_API_PATHS.readiness]: overview.readiness,
      [CONTROL_CENTER_API_PATHS.safety]: overview.safety,
      [CONTROL_CENTER_API_PATHS.sourceSummary]: overview.source,
      '/api/v1/reviewer?limit=50': {
        schemaVersion: 'nightwatch.control-center.reviewer.v1', state: 'AVAILABLE', items: [item],
        page: { limit: 50, nextCursor: null, truncated: false },
        finalVerdictAuthority: 'HUMAN_ORGANIZATIONAL', organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
      },
    };
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => Promise.resolve(responseFor(responses[String(input)]))));
    render(<App />);
    await screen.findByRole('heading', { name: 'Know the posture before the next run.' });
    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Reviewer' }));
    expect(await screen.findByRole('heading', { name: 'Separate what was proved from what is suggested.' })).toBeVisible();

    // The epistemic class is TEXT, not colour alone: monochrome and screen
    // readers must carry the same distinction.
    expect(screen.getAllByText('FACT').length).toBeGreaterThan(0);
    expect(screen.getAllByText('RECOMMENDATION').length).toBeGreaterThan(0);
    expect(screen.getAllByText('UNKNOWN').length).toBeGreaterThan(0);

    // A duplicate suggestion is shown as advisory, never as a verdict.
    expect(screen.getByText('Advisory. Not a duplicate verdict.')).toBeInTheDocument();
    expect(screen.getAllByText('Final verdict: human organizational').length).toBeGreaterThan(0);

    // UNKNOWN elements state that they were not determined; there is no
    // rendering path that turns them into a low-confidence affirmative.
    expect(screen.getAllByText(/Not determined/).length).toBeGreaterThan(0);
    expect(document.body).not.toHaveTextContent('Insufficient confidence');

    // Local review is never organizational sign-off, on the surface itself.
    expect(screen.getByText(/never equivalent to a Leslie genuine\/invalid verdict or a Pondr approval/)).toBeInTheDocument();

    // Nothing outside the contract reaches the screen.
    expect(document.body).not.toHaveTextContent('SENTINEL_REVIEW_PROSE');
  });

  // Owner-local review persistence. The failures worth testing for are: a
  // decision control offered when nothing can be written, a terminal decision
  // still offering to be changed, a refusal reported as a success, and a local
  // decision presented as organizational sign-off.
  const reviewerItem = (overrides: Record<string, unknown> = {}) => {
    const element = (epistemicClass: string, value: unknown, basis: readonly string[] = []) => ({ epistemicClass, value, basis });
    return {
      findingId: 'cc-reviewer-01',
      relationship: element('UNKNOWN', null, []),
      probableDuplicates: [],
      recurrence: element('UNKNOWN', null, []),
      defectClass: element('UNKNOWN', null, []),
      expectationProvenance: element('FACT', 'MACHINE_CONTRACT', ['MACHINE_CONTRACT']),
      confidence: element('FACT', 'HIGH_CONFIDENCE', ['HIGH_CONFIDENCE']),
      alphausRecommendation: {
        severity: element('RECOMMENDATION', 'CRITICAL', ['DOSSIER_TECHNICAL_SEVERITY']),
        catchStage: element('RECOMMENDATION', 'PR_REVIEW', ['LOCAL_PRE_REVIEW_OBSERVATION']),
        source: element('RECOMMENDATION', 'SELF_FOUND', ['NIGHTWATCH_LOCAL_DISCOVERY']),
        team: element('UNKNOWN', null, []),
      },
      localReview: element('UNKNOWN', null, []),
      reviewIdentity: 'a'.repeat(24),
      unknowns: ['NO_LOCAL_REVIEW'],
      ...overrides,
    };
  };

  const reviewerResponses = (item: unknown): Record<string, unknown> => ({
    [CONTROL_CENTER_API_PATHS.health]: overview.health,
    [CONTROL_CENTER_API_PATHS.meta]: overview.meta,
    [CONTROL_CENTER_API_PATHS.readiness]: overview.readiness,
    [CONTROL_CENTER_API_PATHS.safety]: overview.safety,
    [CONTROL_CENTER_API_PATHS.sourceSummary]: overview.source,
    '/api/v1/reviewer?limit=50': {
      schemaVersion: 'nightwatch.control-center.reviewer.v1',
      state: 'AVAILABLE',
      items: [item],
      page: { limit: 50, nextCursor: null, truncated: false },
      finalVerdictAuthority: 'HUMAN_ORGANIZATIONAL',
      organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
    },
  });

  const openReviewer = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
    render(<App />);
    await screen.findByRole('heading', { name: 'Know the posture before the next run.' });
    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Reviewer' }));
    await screen.findByRole('heading', { name: 'Separate what was proved from what is suggested.' });
  };

  it('offers no decision control when there is no owner-local review store', async () => {
    const user = userEvent.setup();
    const responses = reviewerResponses(reviewerItem({ reviewIdentity: null, unknowns: ['NO_LOCAL_REVIEW_STORE'] }));
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => Promise.resolve(responseFor(responses[String(input)]))));
    await openReviewer(user);

    expect(screen.getByText('No owner-local review store')).toBeInTheDocument();
    // Not a disabled button, and not a button that would fail on click: no
    // control at all, because there is nothing it could bind to.
    expect(screen.queryByRole('button', { name: 'Accept Evidence' })).not.toBeInTheDocument();
  });

  it('offers only the canonical decisions, and records one locally', async () => {
    const user = userEvent.setup();
    const responses = reviewerResponses(reviewerItem());
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(input), init });
        if (String(input) === CONTROL_CENTER_API_PATHS.reviewerDecision) {
          return Promise.resolve(
            responseFor({ schemaVersion: 'nightwatch.control-center.review-decision.v1', result: 'ACCEPTED', reviewIdentity: 'a'.repeat(24), organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY' })
          );
        }
        return Promise.resolve(responseFor(responses[String(input)]));
      })
    );
    await openReviewer(user);

    // Exactly the five canonical decisions. No free-form state mutation.
    for (const label of ['Accept Evidence', 'Request Followup', 'Mark Insufficient', 'Mark Duplicate Candidate', 'Supersede']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /leslie/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pondr/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Accept Evidence' }));

    await waitFor(() => expect(screen.getByText(/Recorded locally/)).toBeInTheDocument());
    // The success message itself refuses the organizational reading.
    expect(screen.getByText('Recorded locally. This is not Leslie or Pondr sign-off.')).toBeInTheDocument();

    const write = calls.find((call) => call.url === CONTROL_CENTER_API_PATHS.reviewerDecision);
    expect(write).toBeDefined();
    expect(write!.init?.method).toBe('POST');
    // The identity submitted is the identity the surface was SHOWN.
    expect(JSON.parse(String(write!.init?.body))).toMatchObject({
      findingId: 'cc-reviewer-01',
      reviewIdentity: 'a'.repeat(24),
      decision: 'ACCEPT_EVIDENCE',
    });
    // The header a cross-origin form cannot set.
    expect((write!.init?.headers as Record<string, string>)['X-Nightwatch-Local-Review']).toBe('1');
  });

  it('removes the controls once a decision is terminal and shows the receipt', async () => {
    const user = userEvent.setup();
    const decided = reviewerItem({
      localReview: {
        epistemicClass: 'FACT',
        value: {
          state: 'REVIEWED', decision: 'ACCEPT_EVIDENCE', reviewedAt: '2026-09-05T12:00:00Z',
          transitionCount: 1, bindingCurrentness: 'CURRENT',
          organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
          notEquivalentTo: ['LESLIE_GENUINE', 'LESLIE_INVALID', 'PONDR_APPROVED'],
        },
        basis: ['REVIEWED'],
      },
      unknowns: [],
    });
    const responses = reviewerResponses(decided);
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => Promise.resolve(responseFor(responses[String(input)]))));
    await openReviewer(user);

    expect(screen.getByText('Decided')).toBeInTheDocument();
    expect(screen.getByText('2026-09-05T12:00:00Z')).toBeInTheDocument();
    expect(screen.getByText('Terminal. A second decision is refused by the server.')).toBeInTheDocument();
    for (const label of ['Accept Evidence', 'Request Followup', 'Mark Insufficient', 'Mark Duplicate Candidate', 'Supersede']) {
      expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
    }
  });

  it('still offers a decision when the stored one is stale, and does not show it as live', async () => {
    const user = userEvent.setup();
    const stale = reviewerItem({
      localReview: {
        epistemicClass: 'UNKNOWN',
        value: {
          state: 'REVIEWED', decision: 'ACCEPT_EVIDENCE', reviewedAt: '2026-09-05T12:00:00Z',
          transitionCount: 1, bindingCurrentness: 'STALE',
          organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
          notEquivalentTo: ['LESLIE_GENUINE', 'LESLIE_INVALID', 'PONDR_APPROVED'],
        },
        basis: ['REVIEWED'],
      },
      unknowns: ['LOCAL_REVIEW_STALE'],
    });
    const responses = reviewerResponses(stale);
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => Promise.resolve(responseFor(responses[String(input)]))));
    await openReviewer(user);

    // The stale decision is visible, and it is labelled UNKNOWN rather than
    // rendered as a live decision.
    expect(screen.getByText('Binding Stale')).toBeInTheDocument();
    expect(screen.getByText(/Local review stale/i)).toBeInTheDocument();
    // The current artifacts have not been reviewed, so a decision is offered.
    expect(screen.getByRole('button', { name: 'Accept Evidence' })).toBeInTheDocument();
  });

  it('reports a server refusal as a refusal, never as a success', async () => {
    const user = userEvent.setup();
    const responses = reviewerResponses(reviewerItem());
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        if (String(input) === CONTROL_CENTER_API_PATHS.reviewerDecision) {
          return Promise.resolve(
            responseFor({ schemaVersion: 'nightwatch.control-center.review-decision.v1', result: 'ALREADY_DECIDED', reviewIdentity: null, organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY' })
          );
        }
        return Promise.resolve(responseFor(responses[String(input)]));
      })
    );
    await openReviewer(user);

    await user.click(screen.getByRole('button', { name: 'Accept Evidence' }));
    await waitFor(() => expect(screen.getByText('Refused: Already Decided')).toBeInTheDocument());
    expect(screen.queryByText(/Recorded locally/)).not.toBeInTheDocument();
  });

  it('refuses a response that claims organizational authority', async () => {
    const user = userEvent.setup();
    const responses = reviewerResponses(reviewerItem());
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        if (String(input) === CONTROL_CENTER_API_PATHS.reviewerDecision) {
          // A response that came back claiming Leslie authority is a breach,
          // not a success, and the client refuses it too.
          return Promise.resolve(
            responseFor({ schemaVersion: 'nightwatch.control-center.review-decision.v1', result: 'ACCEPTED', reviewIdentity: 'a'.repeat(24), organizationalAuthority: 'LESLIE_GENUINE' })
          );
        }
        return Promise.resolve(responseFor(responses[String(input)]));
      })
    );
    await openReviewer(user);

    await user.click(screen.getByRole('button', { name: 'Accept Evidence' }));
    await waitFor(() => expect(screen.getByText('Refused: Request Failed')).toBeInTheDocument());
    expect(screen.queryByText(/Recorded locally/)).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('LESLIE_GENUINE');
  });

  it('states plainly when reviewer intelligence is unavailable', async () => {
    const user = userEvent.setup();
    const responses: Record<string, unknown> = {
      [CONTROL_CENTER_API_PATHS.health]: overview.health,
      [CONTROL_CENTER_API_PATHS.meta]: overview.meta,
      [CONTROL_CENTER_API_PATHS.readiness]: overview.readiness,
      [CONTROL_CENTER_API_PATHS.safety]: overview.safety,
      [CONTROL_CENTER_API_PATHS.sourceSummary]: overview.source,
      '/api/v1/reviewer?limit=50': {
        schemaVersion: 'nightwatch.control-center.reviewer.v1', state: 'UNAVAILABLE', items: [],
        page: { limit: 0, nextCursor: null, truncated: false },
        finalVerdictAuthority: 'HUMAN_ORGANIZATIONAL', organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
      },
    };
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => Promise.resolve(responseFor(responses[String(input)]))));
    render(<App />);
    await screen.findByRole('heading', { name: 'Know the posture before the next run.' });
    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Reviewer' }));
    expect(await screen.findByRole('heading', { name: 'Separate what was proved from what is suggested.' })).toBeVisible();
    // Absence of findings is never presented as absence of defects.
    expect(screen.getByText(/This is not a claim that no defects exist/)).toBeInTheDocument();
  });
});
