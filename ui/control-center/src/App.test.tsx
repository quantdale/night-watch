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
    expect(fetchMock).toHaveBeenCalledTimes(4);
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
    expect(await screen.findByRole('heading', { name: 'Runs' })).toBeVisible();
    expect(screen.getByText('Snapshot not connected')).toBeInTheDocument();
    expect(primaryNav.getAllByRole('link')).toHaveLength(7);
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
        };
        return Promise.resolve(responseFor(snapshots[path]));
      });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await screen.findByRole('alert');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Know the posture before the next run.' })).toBeVisible());
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });
});
