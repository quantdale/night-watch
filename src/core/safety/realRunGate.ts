// ---------------------------------------------------------------------------
// Nightwatch — Phase 2A pre-real-run safety gate.
//
// This gate is intentionally separate from Playwright. It must complete before
// a real authenticated browser context is created, so a missing proxy,
// invalid state file, unsafe evidence setting, or repository ambiguity cannot
// be discovered only after credentials have entered a browser process.
//
// The pure evaluator is used by focused tests and by runners that already
// collected local facts. runRealRunGate() collects only local proxy/storage
// facts and performs no target DNS, TCP, browser, or authentication activity.
// ---------------------------------------------------------------------------

import type { EnvironmentConfig, EnvironmentName } from '../environment/types';
import { checkProxyHealth, readProxyRuntimeState } from '../../proxy/runtime';
import type { ProxyRuntimeState } from '../../proxy/types';
import { validateStorageStateFile } from '../../browser/fixtures/storageState';
import type { BrowserContainmentContract } from '../../browser/contract';
import { OutboundPolicy, OUTBOUND_POLICY_VERSION } from './outboundPolicy';
import { runCanary } from './canary';
import { isKnownProductionHost } from './hosts';

export const REAL_OBSERVATION_ENVIRONMENTS: readonly EnvironmentName[] = ['dev', 'next'];

export interface AuthenticatedEvidenceContract {
  metadataFirst: boolean;
  requestHeadersPersisted: boolean;
  requestBodiesPersisted: boolean;
  responseBodiesPersisted: boolean;
  queryValuesPersisted: boolean;
  querySanitized: boolean;
  storageStatePersisted: boolean;
  customerDomPersisted: boolean;
  screenshotsEnabled: boolean;
  tracesEnabled: boolean;
}
export interface PassiveActionContract {
  passiveOnly: boolean;
  mutationRegistryEnabled: boolean;
}

export interface RepositoryFreshnessContract {
  snapshotRecorded: boolean;
  snapshotsValid: boolean;
  alphausRepositoriesClean: boolean;
  nightwatchDirtyPaths: readonly string[];
  documentedNightwatchDirtyPaths: readonly string[];
}

export interface ProxyGateFacts {
  state: ProxyRuntimeState | null;
  healthy: boolean;
}

export interface RealRunGateInput {
  environment: EnvironmentConfig;
  uiUrl: string;
  storageStatePath: string | null;
  storageStateValid: boolean;
  /** Optional provenance supplied by a user-owned workflow; never persisted. */
  storageStateEnvironment?: string | null;
  proxy: ProxyGateFacts;
  browser: BrowserContainmentContract;
  evidence: AuthenticatedEvidenceContract;
  actions: PassiveActionContract;
  repositories: RepositoryFreshnessContract;
}

export interface RealRunGateCheck {
  name: string;
  status: 'PASS' | 'FAIL';
  detail: string;
}

export interface RealRunGateResult {
  pass: boolean;
  checks: RealRunGateCheck[];
}

export interface RealRunGateRuntimeOptions extends Omit<RealRunGateInput, 'storageStateValid' | 'proxy'> {
  proxyStateFile?: string;
}

function check(name: string, pass: boolean, detail: string): RealRunGateCheck {
  return { name, status: pass ? 'PASS' : 'FAIL', detail };
}

function hostEntry(entry: string): string {
  const value = entry.trim().toLowerCase();
  return value.startsWith('*.') ? `probe.${value.slice(2)}` : value;
}

function isProductionClassHost(host: string): boolean {
  const normalized = host.toLowerCase().replace(/^\*\./, '');
  return (
    isKnownProductionHost(normalized) ||
    normalized === 'run.app' ||
    normalized.endsWith('.run.app')
  );
}

function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function sameHostAndPort(a: URL, b: URL): boolean {
  return a.hostname.toLowerCase() === b.hostname.toLowerCase() && a.port === b.port;
}

function allExpectedHostsAllowed(
  policy: OutboundPolicy,
  hosts: readonly string[],
  kind: string
): { pass: boolean; detail: string } {
  if (hosts.length === 0) return { pass: false, detail: `${kind} host contract is empty` };
  for (const rawHost of hosts) {
    const normalized = hostEntry(rawHost);
    if (isProductionClassHost(normalized)) {
      return { pass: false, detail: `${kind} host contract contains a production-class destination` };
    }
    const decision = policy.decide(`https://${normalized}/`);
    if (decision.verdict !== 'allow') {
      return { pass: false, detail: `${kind} host contract is not allowlisted by the selected policy` };
    }
  }
  return { pass: true, detail: `${hosts.length} ${kind.toLowerCase()} host(s) explicitly allowlisted` };
}

function evaluateProxy(input: RealRunGateInput): RealRunGateCheck[] {
  const state = input.proxy.state;
  const checks: RealRunGateCheck[] = [];
  checks.push(check('proxy-bound', state !== null, 'loopback proxy runtime state is present'));
  if (state === null) {
    checks.push(check('proxy-health', false, 'proxy health could not be checked'));
    checks.push(check('proxy-contract', false, 'proxy runtime contract is unavailable'));
    return checks;
  }

  const expectedAddress = state.host === '::1' ? `http://[::1]:${state.port}` : `http://127.0.0.1:${state.port}`;
  checks.push(check('proxy-health', input.proxy.healthy, input.proxy.healthy ? 'proxy health endpoint returned healthy' : 'proxy health endpoint is unavailable'));
  checks.push(
    check(
      'proxy-contract',
      state.address === expectedAddress &&
        state.port > 0 &&
        state.policyVersion === OUTBOUND_POLICY_VERSION &&
        state.environment === input.environment.name,
      'loopback binding, selected environment, and policy version agree'
    )
  );
  return checks;
}

/** Evaluate a collected local safety contract. This function performs no I/O. */
export function evaluateRealRunGate(input: RealRunGateInput): RealRunGateResult {
  const checks: RealRunGateCheck[] = [];
  const env = input.environment;
  const policy = new OutboundPolicy(env);

  const realEnv = REAL_OBSERVATION_ENVIRONMENTS.includes(env.name);
  checks.push(
    check(
      'environment-selection',
      realEnv,
      realEnv ? `exactly one supported real environment selected: ${env.name}` : 'environment must be exactly dev or next; production is forbidden'
    )
  );

  const selected = parseUrl(input.uiUrl);
  const configured = parseUrl(env.uiBaseUrl);
  const targetPass =
    realEnv &&
    selected !== null &&
    configured !== null &&
    selected.protocol === 'https:' &&
    configured.protocol === 'https:' &&
    selected.username === '' &&
    selected.password === '' &&
    selected.search === '' &&
    selected.hash === '' &&
    sameHostAndPort(selected, configured) &&
    policy.decide(input.uiUrl).verdict === 'allow';
  checks.push(
    check(
      'target-agreement',
      targetPass,
      targetPass ? 'HTTPS UI target, verified config host, and browser policy agree' : 'UI target must be an explicit HTTPS host matching the selected verified environment'
    )
  );

  const api = allExpectedHostsAllowed(policy, env.apiHosts ?? [], 'API');
  checks.push(check('api-host-contract', api.pass, api.detail));
  const auth = allExpectedHostsAllowed(policy, env.authHosts ?? [], 'Auth');
  checks.push(check('auth-host-contract', auth.pass, auth.detail));

  const canary = runCanary(policy);
  checks.push(
    check(
      'production-deny-canary',
      canary.pass,
      canary.pass ? `policy canary passed (${canary.total} checks; no network I/O)` : `policy canary failed (${canary.failures.length} check(s))`
    )
  );

  checks.push(...evaluateProxy(input));

  const storagePass = input.storageStatePath !== null && input.storageStateValid;
  const provenancePass = input.storageStateEnvironment === undefined || input.storageStateEnvironment === null || input.storageStateEnvironment === env.name;
  checks.push(
    check(
      'authentication-state',
      storagePass && provenancePass,
      storagePass && provenancePass
        ? 'external storage state is structurally valid and environment-compatible'
        : 'external storage state is missing, invalid, or has mismatched provenance'
    )
  );

  const browserValues = Object.values(input.browser);
  checks.push(
    check(
      'browser-containment',
      browserValues.length === 7 && browserValues.every(Boolean),
      browserValues.length === 7 && browserValues.every(Boolean)
        ? 'mandatory proxy, guards, worker blocks, transport restrictions, and auth trace policy are enabled'
        : 'required browser containment setting is missing or disabled'
    )
  );

  const evidencePass =
    input.evidence.metadataFirst &&
    !input.evidence.requestHeadersPersisted &&
    !input.evidence.requestBodiesPersisted &&
    !input.evidence.responseBodiesPersisted &&
    !input.evidence.queryValuesPersisted &&
    input.evidence.querySanitized &&
    !input.evidence.storageStatePersisted &&
    !input.evidence.customerDomPersisted &&
    !input.evidence.screenshotsEnabled &&
    !input.evidence.tracesEnabled;
  checks.push(
    check(
      'authenticated-evidence',
      evidencePass,
      evidencePass ? 'authenticated metadata-first minimization is enabled' : 'authenticated evidence minimization is incomplete'
    )
  );

  checks.push(
    check(
      'passive-action-registry',
      input.actions.passiveOnly && input.actions.mutationRegistryEnabled,
      input.actions.passiveOnly && input.actions.mutationRegistryEnabled
        ? 'passive-only mode and mutation registry are enabled'
        : 'passive-only mode or mutation registry is missing'
    )
  );

  const dirty = new Set(input.repositories.nightwatchDirtyPaths);
  const documented = new Set(input.repositories.documentedNightwatchDirtyPaths);
  const undocumented = [...dirty].filter((path) => !documented.has(path));
  const repositoryPass =
    input.repositories.snapshotRecorded &&
    input.repositories.snapshotsValid &&
    input.repositories.alphausRepositoriesClean &&
    undocumented.length === 0;
  checks.push(
    check(
      'repository-freshness',
      repositoryPass,
      repositoryPass
        ? 'read-only freshness snapshot is recorded and repository scope is clean or documented'
        : 'repository freshness snapshot is missing/invalid or contains undocumented changes'
    )
  );

  return { pass: checks.every((item) => item.status === 'PASS'), checks };
}

/** Throw a safe, precise error when a pre-real-run gate does not pass. */
export class RealRunGateError extends Error {
  constructor(result: RealRunGateResult) {
    const failures = result.checks
      .filter((item) => item.status === 'FAIL')
      .map((item) => `${item.name}: ${item.detail}`)
      .join('; ');
    super(`Phase 2A pre-real-run safety gate FAILED: ${failures}`);
    this.name = 'RealRunGateError';
  }
}

export function assertRealRunGate(result: RealRunGateResult): void {
  if (!result.pass) throw new RealRunGateError(result);
}

/** Collect local proxy/storage facts, then evaluate the same pure gate. */
export async function runRealRunGate(opts: RealRunGateRuntimeOptions): Promise<RealRunGateResult> {
  let proxyState: ProxyRuntimeState | null = null;
  let proxyHealthy = false;
  try {
    proxyState = readProxyRuntimeState(opts.proxyStateFile);
    proxyHealthy = await checkProxyHealth(proxyState);
  } catch {
    // The evaluator emits a precise safe failure without exposing local paths.
  }

  let storageStateValid = false;
  if (opts.storageStatePath !== null) {
    try {
      validateStorageStateFile(opts.storageStatePath);
      storageStateValid = true;
    } catch {
      // The evaluator emits a precise safe failure without exposing state data.
    }
  }

  return evaluateRealRunGate({
    ...opts,
    proxy: { state: proxyState, healthy: proxyHealthy },
    storageStateValid,
  });
}
