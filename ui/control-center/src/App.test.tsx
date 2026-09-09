import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App, ControlCenterErrorBoundary } from './App';
import { CONTROL_CENTER_API_PATHS } from './api';
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
    // NW-09. The decision controls are gated on the SERVER's capability, so a
    // fixture that exercises the decision workflow must report it. The
    // read-only default is covered by its own case below.
    localReviewDecision: 'ENABLED',
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
    expect(primaryNav.getAllByRole('link')).toHaveLength(9);
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
    for (const link of within(screen.getByRole('navigation', { name: 'Primary' })).getAllByRole('link')) {
      expect(link.getAttribute('href')).toMatch(/^#(?:|safety|runs|execution-graph|campaigns|source-intelligence|findings|reviewer|system-map)$/);
    }
    for (const button of screen.getAllByRole('button')) expect(button).toHaveAttribute('type', 'button');
    expect(document.querySelectorAll('img, iframe, object, embed')).toHaveLength(0);
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


  // The Safety Center's own heading promises that "Unknown checks stay visible
  // as unknown". Until this suite, nothing rendered a check at all: `checks`
  // was fetched, counted once on the Overview, and never listed.
  async function openPosture(user: ReturnType<typeof userEvent.setup>, snapshot: OverviewSnapshot, view: 'Safety Center' | 'Overview'): Promise<void> {
    const responses: Record<string, unknown> = {
      [CONTROL_CENTER_API_PATHS.health]: snapshot.health,
      [CONTROL_CENTER_API_PATHS.meta]: snapshot.meta,
      [CONTROL_CENTER_API_PATHS.readiness]: snapshot.readiness,
      [CONTROL_CENTER_API_PATHS.safety]: snapshot.safety,
      [CONTROL_CENTER_API_PATHS.sourceSummary]: snapshot.source,
    };
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => Promise.resolve(responseFor(responses[String(input)]))));
    render(<App />);
    await screen.findByRole('heading', { name: 'Know the posture before the next run.' });
    if (view === 'Safety Center') {
      await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Safety Center' }));
      await screen.findByRole('heading', { name: 'Safety is a posture, not a green badge.' });
    }
  }

  it('lists every safety check by name, and what the surface refuses outright', async () => {
    const user = userEvent.setup();
    await openPosture(user, {
      ...overview,
      safety: {
        ...overview.safety,
        state: 'WARNING',
        checks: [
          { checkCode: 'LOOPBACK_BIND', state: 'PASS', reasonCode: 'BOUND_TO_LOOPBACK' },
          { checkCode: 'EVIDENCE_EXPOSURE', state: 'UNKNOWN', reasonCode: 'NOT_MEASURED' },
        ],
        blockedOperationClasses: ['PRODUCT_CONTACT', 'MUTATION'],
      },
    }, 'Safety Center');

    expect(screen.getByText('LOOPBACK_BIND')).toBeInTheDocument();
    expect(screen.getByText('Bound To Loopback')).toBeInTheDocument();
    // The unknown check is visible AS unknown, which is the promise the
    // heading above it makes.
    expect(screen.getByText('EVIDENCE_EXPOSURE')).toBeInTheDocument();
    expect(screen.getByText('Not Measured')).toBeInTheDocument();
    expect(screen.getByText('PRODUCT_CONTACT')).toBeInTheDocument();
    expect(screen.getByText('MUTATION')).toBeInTheDocument();
    // Meta authority, which was fetched for one boolean and otherwise dropped.
    expect(screen.getByText('Control Center Local Read Only Ui Only')).toBeInTheDocument();
    expect(screen.getByText('Owner Local Only')).toBeInTheDocument();
  });

  it('calls an empty safety check set unknown rather than letting it read as clean', async () => {
    const user = userEvent.setup();
    await openPosture(user, overview, 'Safety Center');

    expect(screen.getByText('No safety checks reported. An empty check set is an absence of evidence, never a pass.')).toBeInTheDocument();
    expect(screen.getAllByText('None reported').length).toBeGreaterThan(0);
  });

  it('shows the readiness measurements behind the state, including the unmeasured ones', async () => {
    const user = userEvent.setup();
    await openPosture(user, {
      ...overview,
      readiness: {
        ...overview.readiness,
        sourceContracts: { ...overview.readiness.sourceContracts, targetsWithActiveFamily: 6, staleTargets: ['target-alpha'], unavailableTargets: ['target-beta'] },
        campaign: { category: 'DRIFTED', comparedKeys: ['one'], driftKeys: ['coverage-key'], unmeasured: false },
        analyzer: { pinnedVersion: '1.2.3', observedVersion: '1.2.4', availability: 'AVAILABLE', versionConsistent: false, blocked: false },
        verification: { deferredDimensions: ['REPLAY'], notMeasuredDimensions: ['DIFFERENTIAL'], allDeferredToHardening: false },
        unresolvedBlockers: [{ code: 'CI_BILLING', kind: 'EXTERNAL', detailCode: 'GITHUB_BILLING_BLOCK' }],
      },
    }, 'Overview');

    expect(screen.getByText('target-alpha')).toBeInTheDocument();
    expect(screen.getByText('target-beta')).toBeInTheDocument();
    expect(screen.getByText('coverage-key')).toBeInTheDocument();
    // A pinned version that is not the observed version is stated as a
    // disagreement, not rounded to READY.
    expect(screen.getByText('1.2.3')).toBeInTheDocument();
    expect(screen.getByText('1.2.4')).toBeInTheDocument();
    expect(screen.getByText('Inconsistent')).toBeInTheDocument();
    // Deferred and never-measured are different facts and stay separate.
    expect(screen.getByText('REPLAY')).toBeInTheDocument();
    expect(screen.getByText('DIFFERENTIAL')).toBeInTheDocument();
    // The blocker is named with its detail code rather than counted.
    expect(screen.getByText('CI_BILLING')).toBeInTheDocument();
    expect(screen.getByText('Github Billing Block')).toBeInTheDocument();
    expect(screen.getByText('Unmeasured Unknown')).toBeInTheDocument();
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

  // The execution-graph canvas used to draw `nodes.slice(0, 24)` /
  // `edges.slice(0, 48)` and then label the result "Complete". These fixtures
  // are deliberately larger than those cuts, so a reintroduced slice fails.
  const executionRun = {
    runId: 'run-01:synthetic', environment: 'LOCAL_SYNTHETIC', product: 'ripple', browser: 'chromium', scenario: 'smoke',
    startedAt: '2026-08-26T10:20:30.000Z', endedAt: '2026-08-26T10:20:31.000Z', durationMs: 1000, status: 'PASSED', passed: true,
    eventCount: 2, hardFailureCount: 0, oracleFindingCount: 0, nightwatchSha: null,
  };

  function executionGraphFixture(options: { readonly nodeCount: number; readonly danglingEdges: number; readonly truncated: boolean }): unknown {
    const nodes = Array.from({ length: options.nodeCount }, (_unused, index) => ({
      nodeId: `node-${String(index).padStart(2, '0')}`,
      kind: 'JOURNEY_STEP',
      state: index % 8 === 3 ? 'FAILED' : 'PASSED',
      label: `Step ${String(index).padStart(2, '0')}`,
      eventSeq: index,
      reasonCode: null,
    }));
    const edges: { edgeId: string; fromNodeId: string; toNodeId: string; kind: string; proof: string; eventSeq: number | null }[] = nodes.slice(0, -1).map((node, index) => ({
      edgeId: `edge-${String(index).padStart(2, '0')}`,
      fromNodeId: node.nodeId,
      toNodeId: nodes[index + 1]!.nodeId,
      kind: 'PRECEDES',
      proof: 'OBSERVED',
      eventSeq: index,
    }));
    for (let index = 0; index < options.danglingEdges; index += 1) {
      edges.push({ edgeId: `edge-dangling-${index}`, fromNodeId: nodes[0]!.nodeId, toNodeId: `node-outside-${index}`, kind: 'PRECEDES', proof: 'OBSERVED', eventSeq: null });
    }
    return { schemaVersion: 'nightwatch.control-center.execution-graph.v1', runId: executionRun.runId, nodes, edges, nodeLimit: 250, edgeLimit: 500, truncated: options.truncated };
  }

  async function openExecutionGraph(user: ReturnType<typeof userEvent.setup>, graph: unknown): Promise<void> {
    const responses: Record<string, unknown> = {
      [CONTROL_CENTER_API_PATHS.health]: overview.health,
      [CONTROL_CENTER_API_PATHS.meta]: overview.meta,
      [CONTROL_CENTER_API_PATHS.readiness]: overview.readiness,
      [CONTROL_CENTER_API_PATHS.safety]: overview.safety,
      [CONTROL_CENTER_API_PATHS.sourceSummary]: overview.source,
      '/api/v1/runs?limit=20': { schemaVersion: 'nightwatch.control-center.run-list.v1', items: [executionRun], page: { limit: 20, nextCursor: null, truncated: false } },
      '/api/v1/runs/run-01:synthetic': { schemaVersion: 'nightwatch.control-center.run-detail.v1', run: executionRun, repositories: [], countsByEventType: [], countsBySeverity: [], screenshotCount: 0, hardFailureCodes: [], noteCodes: [] },
      '/api/v1/runs/run-01:synthetic/timeline?afterSeq=0&limit=100': { schemaVersion: 'nightwatch.control-center.timeline.v1', runId: executionRun.runId, afterSeq: 0, events: [], nextAfterSeq: null, truncated: false },
      '/api/v1/runs/run-01:synthetic/execution-graph': graph,
    };
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => Promise.resolve(responseFor(responses[String(input)]))));
    render(<App />);
    await screen.findByRole('heading', { name: 'Know the posture before the next run.' });
    const primaryNav = within(screen.getByRole('navigation', { name: 'Primary' }));
    await user.click(primaryNav.getByRole('link', { name: 'Runs' }));
    await user.click(await screen.findByRole('button', { name: 'Inspect' }));
    await user.click(primaryNav.getByRole('link', { name: 'Execution Graph' }));
    await screen.findByRole('img', { name: 'Execution graph for run run-01:synthetic' });
  }

  it('draws every execution-graph node the server sent, past the old 24/48 cut', async () => {
    const user = userEvent.setup();
    await openExecutionGraph(user, executionGraphFixture({ nodeCount: 40, danglingEdges: 0, truncated: false }));

    // 40 > 24, and 39 edges > the old 48-edge consideration window only in
    // kind; the decisive assertion is that nothing is dropped silently.
    expect(screen.getAllByRole('button', { name: /^Step \d\d, JOURNEY_STEP, (?:PASSED|FAILED)$/ })).toHaveLength(40);
    expect(screen.getByText('40 nodes drawn · 40 match')).toBeInTheDocument();
    expect(screen.getByText('39 of 39 edges drawn · zoom 1.00x')).toBeInTheDocument();
    expect(screen.getByText('Complete within bounds')).toBeInTheDocument();
  });

  it('filters and searches the execution graph without hiding the population size', async () => {
    const user = userEvent.setup();
    await openExecutionGraph(user, executionGraphFixture({ nodeCount: 40, danglingEdges: 0, truncated: false }));

    await user.type(screen.getByRole('searchbox', { name: 'Search execution graph nodes' }), 'Step 07');
    // The denominator never shrinks to the filtered set: 40 were drawn.
    expect(screen.getByText('40 nodes drawn · 1 match')).toBeInTheDocument();

    await user.clear(screen.getByRole('searchbox', { name: 'Search execution graph nodes' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by execution state' }), 'FAILED');
    expect(screen.getByText('40 nodes drawn · 5 match')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Step 03, JOURNEY_STEP, FAILED' }));
    expect(screen.getByText('Selected: Step 03')).toBeInTheDocument();
  });

  it('discloses execution-graph truncation and edges pointing outside the projection', async () => {
    const user = userEvent.setup();
    await openExecutionGraph(user, executionGraphFixture({ nodeCount: 30, danglingEdges: 2, truncated: true }));

    expect(screen.getByText('29 of 31 edges drawn · zoom 1.00x')).toBeInTheDocument();
    expect(screen.getByText('2 edge(s) reference a node outside this projection')).toBeInTheDocument();
    // `truncated` is the SERVER's bound. It is reported as such, and never as
    // a completeness claim.
    expect(screen.getByText('Truncated at 250 nodes / 500 edges')).toBeInTheDocument();
    expect(screen.getByText('This graph is truncated')).toBeInTheDocument();
    expect(screen.queryByText('Complete within bounds')).not.toBeInTheDocument();
  });

  // The run-detail contract has always carried repository provenance, event
  // censuses, a screenshot count, hard-failure codes and note codes. The panel
  // fetched every one of them and rendered none, so a run with a hard failure
  // code and a dirty working tree read exactly like a clean one.
  it('renders the run-detail fields it fetches, including provenance and failure codes', async () => {
    const user = userEvent.setup();
    const responses: Record<string, unknown> = {
      [CONTROL_CENTER_API_PATHS.health]: overview.health,
      [CONTROL_CENTER_API_PATHS.meta]: overview.meta,
      [CONTROL_CENTER_API_PATHS.readiness]: overview.readiness,
      [CONTROL_CENTER_API_PATHS.safety]: overview.safety,
      [CONTROL_CENTER_API_PATHS.sourceSummary]: overview.source,
      '/api/v1/runs?limit=20': { schemaVersion: 'nightwatch.control-center.run-list.v1', items: [executionRun], page: { limit: 20, nextCursor: null, truncated: false } },
      '/api/v1/runs/run-01:synthetic': {
        schemaVersion: 'nightwatch.control-center.run-detail.v1',
        run: executionRun,
        repositories: [{ repositoryId: 'nightwatch', branch: 'main', headSha: 'abcdef0123456789', state: 'CURRENT', dirty: true, dirtyFileCount: 3 }],
        countsByEventType: [{ eventType: 'request', count: 12 }],
        countsBySeverity: [{ severity: 'critical', count: 1 }],
        screenshotCount: 4,
        hardFailureCodes: ['ORACLE_HARD_FAILURE'],
        noteCodes: ['REPLAY_UNAVAILABLE'],
      },
      '/api/v1/runs/run-01:synthetic/timeline?afterSeq=0&limit=100': { schemaVersion: 'nightwatch.control-center.timeline.v1', runId: executionRun.runId, afterSeq: 0, events: [{ seq: 1, timestamp: executionRun.startedAt, eventType: 'start', severity: 'info', messageCode: 'RUN_STARTED', dataCodes: [] }], nextAfterSeq: 42, truncated: true },
    };
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => Promise.resolve(responseFor(responses[String(input)]))));
    render(<App />);
    await screen.findByRole('heading', { name: 'Know the posture before the next run.' });
    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Runs' }));
    await user.click(await screen.findByRole('button', { name: 'Inspect' }));
    await screen.findByRole('heading', { name: 'smoke' });

    expect(screen.getByText('ORACLE_HARD_FAILURE')).toBeInTheDocument();
    expect(screen.getByText('REPLAY_UNAVAILABLE')).toBeInTheDocument();
    expect(screen.getByText('Screenshots')).toBeInTheDocument();
    expect(screen.getByText('Request')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    // Provenance, and the dirty working tree that bounds every claim from it.
    expect(within(screen.getByRole('row', { name: /nightwatch/ })).getByText('main')).toBeInTheDocument();
    expect(screen.getByText('Dirty · 3 file(s)')).toBeInTheDocument();
    expect(screen.getByText('abcdef012345…')).toBeInTheDocument();
    // A single bounded timeline page that stops early says so.
    expect(screen.getByText('This timeline is truncated')).toBeInTheDocument();
    expect(screen.getByText(/the run continues after sequence 42/)).toBeInTheDocument();
  });

  it('says plainly when a run reports no provenance rather than leaving the row out', async () => {
    const user = userEvent.setup();
    const responses: Record<string, unknown> = {
      [CONTROL_CENTER_API_PATHS.health]: overview.health,
      [CONTROL_CENTER_API_PATHS.meta]: overview.meta,
      [CONTROL_CENTER_API_PATHS.readiness]: overview.readiness,
      [CONTROL_CENTER_API_PATHS.safety]: overview.safety,
      [CONTROL_CENTER_API_PATHS.sourceSummary]: overview.source,
      '/api/v1/runs?limit=20': { schemaVersion: 'nightwatch.control-center.run-list.v1', items: [executionRun], page: { limit: 20, nextCursor: null, truncated: false } },
      '/api/v1/runs/run-01:synthetic': { schemaVersion: 'nightwatch.control-center.run-detail.v1', run: executionRun, repositories: [], countsByEventType: [], countsBySeverity: [], screenshotCount: 0, hardFailureCodes: [], noteCodes: [] },
      '/api/v1/runs/run-01:synthetic/timeline?afterSeq=0&limit=100': { schemaVersion: 'nightwatch.control-center.timeline.v1', runId: executionRun.runId, afterSeq: 0, events: [{ seq: 1, timestamp: executionRun.startedAt, eventType: 'start', severity: 'info', messageCode: 'RUN_STARTED', dataCodes: [] }], nextAfterSeq: null, truncated: false },
    };
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => Promise.resolve(responseFor(responses[String(input)]))));
    render(<App />);
    await screen.findByRole('heading', { name: 'Know the posture before the next run.' });
    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Runs' }));
    await user.click(await screen.findByRole('button', { name: 'Inspect' }));
    await screen.findByRole('heading', { name: 'smoke' });

    expect(screen.getByText('No repository provenance recorded. Without it, this run anchors to no revision.')).toBeInTheDocument();
    expect(screen.getByText('No event census reported. Empty does not imply pass.')).toBeInTheDocument();
    expect(screen.getAllByText('None reported')).toHaveLength(2);
    expect(screen.queryByText('This timeline is truncated')).not.toBeInTheDocument();
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

  /**
   * NW-09. The decision controls must be gated on the SERVER's capability.
   * Before the repair the UI inferred availability from the per-finding
   * review identity, which answers a different question — whether a review
   * STORE exists — so a read-only server still rendered controls whose POST
   * it would refuse as not found.
   */
  it('offers no decision control when the server reports the write route disabled', async () => {
    const user = userEvent.setup();
    const responses = reviewerResponses(reviewerItem());
    responses[CONTROL_CENTER_API_PATHS.meta] = { ...overview.meta, localReviewDecision: 'DISABLED' };
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => Promise.resolve(responseFor(responses[String(input)]))));
    await openReviewer(user);

    // The finding HAS a review identity: only the server capability is
    // missing, which is exactly the case the old gate could not see.
    expect(screen.getByText('Read-only server')).toBeInTheDocument();
    expect(screen.getByText(/--enable-local-review/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept Evidence' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /Rationale/ })).not.toBeInTheDocument();
  });

  it('fails closed when the server has not reported a capability at all', async () => {
    const user = userEvent.setup();
    const responses = reviewerResponses(reviewerItem());
    // An older server omits the field entirely. Absence is not permission.
    const { localReviewDecision: _omitted, ...withoutCapability } = overview.meta as unknown as Record<string, unknown>;
    responses[CONTROL_CENTER_API_PATHS.meta] = withoutCapability;
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => Promise.resolve(responseFor(responses[String(input)]))));
    await openReviewer(user);

    expect(screen.getByText('Read-only server')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept Evidence' })).not.toBeInTheDocument();
  });

  it('reads back by review identity when the POST outcome is uncertain, and never retries', async () => {
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
    const pendingResponses = reviewerResponses(reviewerItem());
    const decidedResponses = reviewerResponses(decided);
    let reviewerReads = 0;
    let posts = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url === CONTROL_CENTER_API_PATHS.reviewerDecision) {
          posts += 1;
          // The connection dies after the server has already recorded it:
          // the classic uncertain outcome.
          return Promise.reject(new Error('socket hang up'));
        }
        if (url === '/api/v1/reviewer?limit=50') {
          reviewerReads += 1;
          // The first read is the initial render; the read-back afterwards
          // sees the decision the lost response had already recorded.
          return Promise.resolve(responseFor(reviewerReads === 1 ? pendingResponses[url] : decidedResponses[url]));
        }
        return Promise.resolve(responseFor(pendingResponses[url]));
      })
    );
    await openReviewer(user);

    await user.click(screen.getByRole('button', { name: 'Accept Evidence' }));
    // The read-back confirms the lost response had recorded it, so the row
    // refreshes into its terminal state rather than reporting a failure the
    // operator would act on by deciding again.
    await waitFor(() => expect(screen.getByText('Decided')).toBeInTheDocument());
    expect(screen.getByText('Terminal. A second decision is refused by the server.')).toBeInTheDocument();
    // Exactly one POST. A retry would either duplicate the request or return
    // ALREADY_DECIDED without telling the operator which attempt recorded it.
    expect(posts).toBe(1);
    // The read-back happened: the initial render plus at least one more read.
    expect(reviewerReads).toBeGreaterThan(1);
    expect(screen.queryByText(/Refused/)).not.toBeInTheDocument();
    expect(screen.queryByText(/read-back shows nothing was recorded/)).not.toBeInTheDocument();
  });

  it('says the outcome is unknown when the read-back itself cannot reach the server', async () => {
    const user = userEvent.setup();
    const responses = reviewerResponses(reviewerItem());
    let reviewerReads = 0;
    let posts = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url === CONTROL_CENTER_API_PATHS.reviewerDecision) {
          posts += 1;
          return Promise.reject(new Error('socket hang up'));
        }
        if (url === '/api/v1/reviewer?limit=50') {
          reviewerReads += 1;
          if (reviewerReads > 1) return Promise.reject(new Error('socket hang up'));
          return Promise.resolve(responseFor(responses[url]));
        }
        return Promise.resolve(responseFor(responses[url]));
      })
    );
    await openReviewer(user);

    await user.click(screen.getByRole('button', { name: 'Accept Evidence' }));
    // UNKNOWN is reported as unknown. It is not upgraded to "not recorded",
    // which would invite a second decision the store may already hold.
    await waitFor(() => expect(screen.getByText(/Whether it was recorded is unknown/)).toBeInTheDocument());
    expect(posts).toBe(1);
  });

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
    // The binding line now also carries the transition count the contract
    // sends; the currentness word it asserts is unchanged.
    expect(screen.getByText(/^Binding Stale · \d+ transition\(s\)$/)).toBeInTheDocument();
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
    // NW-09. The client refuses the breach, which makes the outcome uncertain,
    // so it reads back by review identity instead of retrying. The read-back
    // shows nothing recorded, which is the truth the operator needs.
    await waitFor(() => expect(screen.getByText(/read-back shows nothing was recorded/)).toBeInTheDocument());
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

  /**
   * NW-10. Every list DTO advertised `page.nextCursor` and every loader
   * requested only a limit, so records past the first page were unreachable
   * from the UI. These cases page the reviewer list, which is the one with a
   * decision surface attached and therefore the one where an unreachable
   * record matters most.
   */
  describe('bounded pagination', () => {
    const pageOf = (ids: readonly string[], nextCursor: string | null) => ({
      schemaVersion: 'nightwatch.control-center.reviewer.v1',
      state: 'AVAILABLE',
      items: ids.map((id) => reviewerItem({ findingId: id, reviewIdentity: `identity-${id}` })),
      page: { limit: 50, nextCursor, truncated: nextCursor !== null },
      finalVerdictAuthority: 'HUMAN_ORGANIZATIONAL',
      organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
    });

    function pagedFetch(pages: Record<string, unknown>, onRequest?: (url: string) => void) {
      return vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        onRequest?.(url);
        if (url.startsWith('/api/v1/reviewer?')) {
          const supplied = pages[url];
          if (supplied === undefined) return Promise.reject(new Error(`unexpected reviewer request ${url}`));
          return Promise.resolve(responseFor(supplied));
        }
        return Promise.resolve(responseFor(reviewerResponses(reviewerItem())[url]));
      });
    }

    it('reaches a record beyond the first page', async () => {
      const user = userEvent.setup();
      const requested: string[] = [];
      vi.stubGlobal('fetch', pagedFetch({
        '/api/v1/reviewer?limit=50': pageOf(['finding-a', 'finding-b'], '2'),
        '/api/v1/reviewer?limit=50&cursor=2': pageOf(['finding-c'], null),
      }, (url) => { if (url.startsWith('/api/v1/reviewer?')) requested.push(url); }));
      await openReviewer(user);

      // A finding id renders in both the reviewer table and the
       // recommendations table, so reachability is asserted with getAllByText
       // and the loaded COUNT is the unambiguous witness.
      expect(screen.getAllByText('finding-a').length).toBeGreaterThan(0);
      // Unreachable before the repair.
      expect(screen.queryAllByText('finding-c')).toHaveLength(0);
      expect(screen.getByText('2 reviewer findings loaded')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Load more reviewer findings' }));
      await waitFor(() => expect(screen.getAllByText('finding-c').length).toBeGreaterThan(0));
      // Earlier pages are kept, not replaced.
      expect(screen.getAllByText('finding-a').length).toBeGreaterThan(0);
      expect(screen.getByText('3 reviewer findings loaded')).toBeInTheDocument();
      // The end is stated, and the control is gone rather than inert.
      expect(screen.getByText('All loaded.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Load more reviewer findings' })).not.toBeInTheDocument();
      expect(requested).toEqual(['/api/v1/reviewer?limit=50', '/api/v1/reviewer?limit=50&cursor=2']);
    });

    it('deduplicates by identity when a page overlaps', async () => {
      const user = userEvent.setup();
      vi.stubGlobal('fetch', pagedFetch({
        '/api/v1/reviewer?limit=50': pageOf(['finding-a', 'finding-b'], '2'),
        // The corpus shifted between pages, so an item repeats. A positional
        // cursor makes this legitimate; rendering it twice would not be.
        '/api/v1/reviewer?limit=50&cursor=2': pageOf(['finding-b', 'finding-c'], null),
      }));
      await openReviewer(user);
      await user.click(screen.getByRole('button', { name: 'Load more reviewer findings' }));

      await waitFor(() => expect(screen.getAllByText('finding-c').length).toBeGreaterThan(0));
      // Three distinct records from two pages of two: the repeat was dropped.
      // Four would mean the overlap rendered twice.
      expect(screen.getByText('3 reviewer findings loaded')).toBeInTheDocument();
      expect(screen.queryByText('4 reviewer findings loaded')).not.toBeInTheDocument();
    });

    it('keeps the loaded pages when a continuation fails, and says so', async () => {
      const user = userEvent.setup();
      vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url === '/api/v1/reviewer?limit=50') {
          return Promise.resolve(responseFor(pageOf(['finding-a', 'finding-b'], '2')));
        }
        if (url.startsWith('/api/v1/reviewer?limit=50&cursor=')) {
          return Promise.reject(new Error('socket hang up'));
        }
        return Promise.resolve(responseFor(reviewerResponses(reviewerItem())[url]));
      }));
      await openReviewer(user);
      await user.click(screen.getByRole('button', { name: 'Load more reviewer findings' }));

      await waitFor(() => expect(screen.getByText(/The next page could not be loaded/)).toBeInTheDocument());
      // A failed continuation is not a failed view: what was loaded stays.
      expect(screen.getAllByText('finding-a').length).toBeGreaterThan(0);
      expect(screen.getAllByText('finding-b').length).toBeGreaterThan(0);
      expect(screen.getByText('2 reviewer findings loaded')).toBeInTheDocument();
      expect(screen.queryByText('Reviewer intelligence unavailable')).not.toBeInTheDocument();
    });

    it('offers no continuation when the first page is the whole list', async () => {
      const user = userEvent.setup();
      vi.stubGlobal('fetch', pagedFetch({
        '/api/v1/reviewer?limit=50': pageOf(['finding-a'], null),
      }));
      await openReviewer(user);

      expect(screen.getByText('All loaded.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Load more reviewer findings' })).not.toBeInTheDocument();
    });
  });
});
