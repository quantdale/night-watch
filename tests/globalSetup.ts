// ---------------------------------------------------------------------------
// Nightwatch Playwright global setup — mandatory loopback L5 proxy.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { selectEnvironment } from '../src/core/environment';
import { OUTBOUND_POLICY_VERSION, OutboundPolicy } from '../src/core/safety/outboundPolicy';
import {
  proxyEventLogPath,
  proxyServerUrl,
  proxyStatePath,
  startOutboundProxy,
  writeProxyRuntimeState,
} from '../src/proxy/server';
import { checkProxyHealth } from '../src/proxy/runtime';

export default async function globalSetup(): Promise<() => Promise<void>> {
  const environment = selectEnvironment(process.env.NIGHTWATCH_ENV ?? 'local');
  const configuredAddress = proxyServerUrl();
  const configuredPort = Number(new URL(configuredAddress).port);
  const stateFile = proxyStatePath();
  const eventLog = proxyEventLogPath();
  const proxy = await startOutboundProxy({
    policy: new OutboundPolicy(environment),
    environment: environment.name,
    host: '127.0.0.1',
    port: configuredPort,
    eventLogPath: eventLog,
  });
  try {
    if (proxy.address !== configuredAddress || !(await checkProxyHealth({
      address: proxy.address,
      host: '127.0.0.1',
      port: proxy.port,
      environment: environment.name,
      policyVersion: OUTBOUND_POLICY_VERSION,
      eventLogPath: eventLog,
    }))) {
      throw new Error('Nightwatch outer proxy failed its startup health check');
    }
    writeProxyRuntimeState(
      {
        address: proxy.address,
        host: '127.0.0.1',
        port: proxy.port,
        environment: environment.name,
        policyVersion: OUTBOUND_POLICY_VERSION,
        eventLogPath: path.resolve(eventLog),
      },
      stateFile
    );
  } catch (err) {
    await proxy.close();
    throw err;
  }

  return async () => {
    await proxy.close();
    try {
      fs.unlinkSync(stateFile);
    } catch {
      // The state file is runtime scratch and may already be absent.
    }
    try {
      fs.unlinkSync(eventLog);
    } catch {
      // The event log is runtime scratch and may already be absent.
    }
  };
}
