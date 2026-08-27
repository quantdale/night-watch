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
  const expectedKeys = [
    'address', 'host', 'port', 'environment', 'policyVersion', 'containmentVersion',
    'resolvedAddressPolicyVersion', 'addressBindingVersion', 'eventLogPath',
  ].sort();
  const actualKeys = Object.keys(value).sort();
  if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) {
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
    state.address !== (state.host === '::1' ? `http://[::1]:${state.port}` : `http://127.0.0.1:${state.port}`)
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
