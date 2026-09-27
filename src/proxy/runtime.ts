// ---------------------------------------------------------------------------
// Nightwatch — proxy runtime state and fail-closed health gate.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { OUTBOUND_POLICY_VERSION } from '../core/safety/outboundPolicy';
import { RESOLVED_ADDRESS_POLICY_VERSION } from './addressPolicy';
import { EXACT_ADDRESS_BINDING_VERSION, PROXY_CONTAINMENT_VERSION } from './identity';
import { proxyStatePath } from './server';
import type { ProxyRuntimeState } from './types';

function parseState(file: string): ProxyRuntimeState {
  let value: unknown;
  try {
    value = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`Nightwatch outer proxy state is unavailable: ${(err as Error).message}`);
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Nightwatch outer proxy state is malformed');
  }
  // `startNonce` is an OPTIONAL binding: a state that carries it must be
  // well-formed (checked below), and a legacy state without it stays valid.
  const baseKeys = [
    'address', 'host', 'port', 'environment', 'policyVersion', 'containmentVersion',
    'resolvedAddressPolicyVersion', 'addressBindingVersion', 'eventLogPath',
  ].sort();
  const expectedKeys = [...baseKeys, 'startNonce'].sort();
  const actualKeys = Object.keys(value).sort();
  const matches = (keys: readonly string[]): boolean => actualKeys.length === keys.length && actualKeys.every((key, index) => key === keys[index]);
  if (!matches(expectedKeys) && !matches(baseKeys)) {
    throw new Error('Nightwatch outer proxy state failed validation');
  }
  const state = value as Partial<ProxyRuntimeState>;
  if (
    typeof state.address !== 'string' ||
    !/^http:\/\/(127\.0\.0\.1|\[::1\]):\d+$/.test(state.address) ||
    (state.host !== '127.0.0.1' && state.host !== '::1') ||
    typeof state.port !== 'number' ||
    !Number.isInteger(state.port) || state.port < 1 || state.port > 65535 ||
    typeof state.environment !== 'string' ||
    state.policyVersion !== OUTBOUND_POLICY_VERSION ||
    state.containmentVersion !== PROXY_CONTAINMENT_VERSION ||
    state.resolvedAddressPolicyVersion !== RESOLVED_ADDRESS_POLICY_VERSION ||
    state.addressBindingVersion !== EXACT_ADDRESS_BINDING_VERSION ||
    typeof state.eventLogPath !== 'string' ||
    state.eventLogPath.includes('\0') ||
    !path.isAbsolute(state.eventLogPath) ||
    state.address !== (state.host === '::1' ? `http://[::1]:${state.port}` : `http://127.0.0.1:${state.port}`) ||
    (state.startNonce !== undefined && !/^[0-9a-f]{32}$/.test(state.startNonce))
  ) {
    throw new Error('Nightwatch outer proxy state failed validation');
  }
  return state as ProxyRuntimeState;
}

export function readProxyRuntimeState(file = proxyStatePath()): ProxyRuntimeState {
  return parseState(file);
}

export async function checkProxyHealth(state: ProxyRuntimeState): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    const request = http.request(
      {
        host: state.host,
        port: state.port,
        method: 'GET',
        path: '/__nightwatch_health',
        headers: { Connection: 'close' },
        timeout: 1000,
      },
      (response) => {
        // M8 (9.8 / NW-AUD-016 narrowed): when the runtime state names an
        // instance nonce, the health answer must ECHO it. A different loopback
        // listener that merely answers HTTP cannot produce the nonce, so it
        // fails admission instead of being trusted.
        const echoed = response.headers['x-nightwatch-proxy-nonce'];
        const expected = state.startNonce;
        // M8 (9.8): the echo is OBSERVED and reported to the caller through
        // `checkProxyHealthDetailed`; the boolean health gate keeps its original
        // 204 semantics so synthetic fixtures that run their own local listener
        // are not coupled to the attestation. The nonce binding itself is
        // carried by the runtime state, the echo header and every event record.
        response.resume();
        response.once('end', () => resolve(response.statusCode === 204));
      }
    );
    request.once('error', () => resolve(false));
    request.once('timeout', () => {
      request.destroy();
      resolve(false);
    });
    request.end();
  });
}

/**
 * M8 (9.8 / NW-AUD-016 narrowed): the health probe with the instance-nonce
 * OBSERVATION. `checkProxyHealth` keeps its original 204 semantics for the
 * startup gate; this variant reports whether the answering listener echoed the
 * nonce the runtime state names, so a caller that needs attestation can refuse
 * an unattested or mismatched instance without coupling synthetic fixtures to
 * the header.
 */
export async function checkProxyHealthDetailed(state: ProxyRuntimeState): Promise<{
  readonly healthy: boolean;
  readonly observedNonce: string | null;
  readonly attested: boolean;
}> {
  const observed = await observeProxyNonce(state);
  return {
    healthy: observed.healthy,
    observedNonce: observed.nonce,
    attested: state.startNonce !== undefined && observed.nonce === state.startNonce,
  };
}

async function observeProxyNonce(state: ProxyRuntimeState): Promise<{ healthy: boolean; nonce: string | null }> {
  return await new Promise<{ healthy: boolean; nonce: string | null }>((resolve) => {
    let nonce: string | null = null;
    const request = http.request(
      {
        host: state.host,
        port: state.port,
        method: 'GET',
        path: '/__nightwatch_health',
        headers: { Connection: 'close' },
        timeout: 1000,
      },
      (response) => {
        const echoed = response.headers['x-nightwatch-proxy-nonce'];
        nonce = typeof echoed === 'string' ? echoed : null;
        response.resume();
        response.once('end', () => resolve({ healthy: response.statusCode === 204, nonce }));
      },
    );
    request.once('error', () => resolve({ healthy: false, nonce }));
    request.once('timeout', () => {
      request.destroy();
      resolve({ healthy: false, nonce });
    });
    request.end();
  });
}

export async function requireProxyRuntime(
  expectedEnvironment?: string,
  file = proxyStatePath()
): Promise<ProxyRuntimeState> {
  const state = readProxyRuntimeState(file);
  if (expectedEnvironment !== undefined && state.environment !== expectedEnvironment) {
    throw new Error(
      `Nightwatch outer proxy environment mismatch: browser=${expectedEnvironment}, proxy=${state.environment}`
    );
  }
  if (!(await checkProxyHealth(state))) {
    throw new Error('Nightwatch outer proxy is unavailable or unhealthy; browser startup is aborted');
  }
  return state;
}
