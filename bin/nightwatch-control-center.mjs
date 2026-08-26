#!/usr/bin/env node
/**
 * Nightwatch Control Center local launcher.
 *
 * The launcher accepts only a loopback port and a repository-confined built UI
 * root. It never accepts an environment/product flag, never opens a browser,
 * and never invokes a Nightwatch execution command.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_UI_ROOT = path.join(ROOT, 'ui', 'control-center', 'dist');
const DEFAULT_PORT = 7312;

function loadTypeScriptModule(file) {
  return loadRuntimeTypeScriptModule(file, { root: ROOT });
}

function parseArgs(args) {
  let port = DEFAULT_PORT;
  let uiRoot = DEFAULT_UI_ROOT;
  for (const arg of args) {
    if (arg === '--help') {
      process.stdout.write('nightwatch-control-center [--port=7312|0] [--ui-root=ui/control-center/dist]\n');
      process.exit(0);
    }
    if (arg.startsWith('--env') || arg === '--host' || arg === '--open' || arg === '--share') {
      throw new Error('CONTROL_CENTER_BAD_REQUEST');
    }
    if (arg.startsWith('--port=')) {
      const value = arg.slice('--port='.length);
      if (!/^\d+$/.test(value)) throw new Error('CONTROL_CENTER_BAD_REQUEST');
      port = Number(value);
      if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('CONTROL_CENTER_BAD_REQUEST');
      continue;
    }
    if (arg.startsWith('--ui-root=')) {
      const value = arg.slice('--ui-root='.length);
      const resolved = path.resolve(ROOT, value);
      const rootPrefix = `${ROOT}${path.sep}`;
      if (!resolved.startsWith(rootPrefix)) throw new Error('CONTROL_CENTER_PATH_REJECTED');
      uiRoot = resolved;
      continue;
    }
    throw new Error('CONTROL_CENTER_BAD_REQUEST');
  }
  return { port, uiRoot };
}

let handle;
try {
  const { port, uiRoot } = parseArgs(process.argv.slice(2));
  const serverModule = loadTypeScriptModule('src/controlCenter/server/index.ts');
  const collectorModule = loadTypeScriptModule('src/controlCenter/server/defaultCollector.ts');
  handle = serverModule.createControlCenterServer({
    collector: collectorModule.createDefaultControlCenterCollector(),
    port,
    uiRoot,
  });
  const address = await handle.start();
  process.stdout.write(`NIGHTWATCH_CONTROL_CENTER_READY http://127.0.0.1:${address.port}\n`);
  const shutdown = async () => {
    await handle.close();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  await new Promise(() => {});
} catch {
  if (handle !== undefined) await handle.close();
  process.stderr.write('CONTROL_CENTER_START_FAILED\n');
  process.exitCode = 2;
}
