#!/usr/bin/env node

// R-11 test support: a bounded child that reserves ONE real proxy port lease
// and holds it, so the parallel-allocator case gets genuine cross-process,
// real-OS-TCP coverage instead of a same-process simulation.
//
// TEST SUPPORT ONLY. It uses the PRODUCTION allocator unchanged and cannot
// reach the TEST-ONLY availability seam, so it adds no authority. It opens no
// socket of its own: the only bind is the allocator's own short-lived
// availability probe on loopback.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModule } from '../../../bin/lib/typescript-runtime-loader.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const { reserveProxyPortLease } = loadTypeScriptModule(path.resolve(here, '../../../src/proxy/portLease.ts'));

const preferredPort = Number(process.argv[2]);
if (!Number.isInteger(preferredPort)) {
  process.stderr.write('R11_CHILD_PREFERRED_PORT_INVALID');
  process.exit(2);
}

const lease = reserveProxyPortLease({ preferredPort });
process.stdout.write(`R11_LEASE_PORT=${lease.port}\n`);
// Hold the lease until the parent kills us, so the parent observes real
// concurrent ownership rather than a sequence of released leases.
const keepAlive = setInterval(() => {}, 1_000);
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => { clearInterval(keepAlive); lease.release(); process.exit(0); });
}
