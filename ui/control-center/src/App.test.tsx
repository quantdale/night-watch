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
    schemaVersion: 'nightwatch.control-center.source-summary.v1',
    state: 'UNAVAILABLE',
    inventoryDigest: null,
    repositoryCount: 0,
    surfaceCount: 0,
    currentness: [],
    lifecycle: [],
    proof: [],
    capabilities: [],
    gapReasons: ['SOURCE_REPOSITORY_UNAVAILABLE'],
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
    '/api/v1/runs?limit=20': { schemaVersion: 'nightwatch.control-center.run-list.v1', items: [], page: { limit: 20, nextCursor: null, truncated: false } },
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
    expect(primaryNav.getAllByRole('link')).toHaveLength(7);
    await user.click(primaryNav.getByRole('link', { name: 'Safety Center' }));
    expect(await screen.findByRole('heading', { name: 'Safety is a posture, not a green badge.' })).toBeVisible();
    expect(screen.getByText('Source inventory unavailable')).toBeInTheDocument();
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
});
