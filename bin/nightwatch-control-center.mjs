#!/usr/bin/env node
/**
 * Nightwatch Control Center local launcher.
 *
 * The launcher accepts only a loopback port, a repository-confined built UI
 * root, and an explicit opt-in for owner-local review decisions. It never
 * accepts an environment/product flag, never opens a browser, and never
 * invokes a Nightwatch execution command.
 *
 * NW-09. Review persistence shipped as library injection only: this launcher
 * built a collector with no review authority and a server with no
 * `reviewDecision`, so the documented owner-local review workflow could not
 * be reached from the actual entry point. The browser tests injected an
 * authority directly, so they proved the library path and never the shipped
 * one.
 *
 * The default is unchanged and stays read-only. `--enable-local-review` is
 * the only way to obtain the write route, and it builds ONE authority through
 * `createControlCenterServices`, which constructs the collector and the write
 * handler together so both derive a review binding the same way.
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
  let enableLocalReview = false;
  for (const arg of args) {
    if (arg === '--help') {
      process.stdout.write(
        'nightwatch-control-center [--port=7312|0] [--ui-root=ui/control-center/dist] [--enable-local-review]\n'
      );
      process.exit(0);
    }
    if (arg.startsWith('--env') || arg === '--host' || arg === '--open' || arg === '--share') {
      throw new Error('CONTROL_CENTER_BAD_REQUEST');
    }
    if (arg === '--enable-local-review') {
      enableLocalReview = true;
      continue;
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
  return { port, uiRoot, enableLocalReview };
}

/**
 * Owner-local preflight for the review store.
 *
 * Constructing the authority is itself the preflight: it resolves the private
 * review root through the shared private-artifact policy, which refuses a root
 * inside Nightwatch source, a sibling checkout or a linked worktree, refuses a
 * symlinked component, and requires owner-only permissions. A refusal here
 * must NOT silently downgrade to a read-only server — the operator asked for
 * the write surface, and starting without it would misreport what they got.
 */
function buildLocalReviewAuthority() {
  const authorityModule = loadTypeScriptModule('src/controlCenter/authorities/reviewWriteAuthority.ts');
  const authority = new authorityModule.ControlCenterReviewAuthority();
  const root = authority.storeRoot;
  const stat = fs.lstatSync(root, { throwIfNoEntry: false });
  if (stat === undefined || !stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error('CONTROL_CENTER_REVIEW_STORE_UNAVAILABLE');
  }
  return authority;
}

let handle;
try {
  const { port, uiRoot, enableLocalReview } = parseArgs(process.argv.slice(2));
  const serverModule = loadTypeScriptModule('src/controlCenter/server/index.ts');
  const collectorModule = loadTypeScriptModule('src/controlCenter/server/defaultCollector.ts');
  // Both halves from ONE factory when review is enabled, so the collector and
  // the write handler cannot derive a different campaign identity for the same
  // state and refuse every write as BINDING_MISMATCH.
  const services = enableLocalReview
    ? collectorModule.createControlCenterServices({ reviewAuthority: buildLocalReviewAuthority() })
    : { collector: collectorModule.createDefaultControlCenterCollector(), reviewDecision: null };
  handle = serverModule.createControlCenterServer({
    collector: services.collector,
    port,
    uiRoot,
    // Omitted entirely when null: an `undefined` option is what keeps the
    // route from existing, and passing `null` would not.
    ...(services.reviewDecision === null ? {} : { reviewDecision: services.reviewDecision }),
  });
  const address = await handle.start();
  process.stdout.write(`NIGHTWATCH_CONTROL_CENTER_READY http://127.0.0.1:${address.port}\n`);
  process.stdout.write(
    `NIGHTWATCH_CONTROL_CENTER_LOCAL_REVIEW ${services.reviewDecision === null ? 'DISABLED' : 'ENABLED'}\n`
  );
  const shutdown = async () => {
    await handle.close();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  await new Promise(() => {});
} catch (error) {
  if (handle !== undefined) await handle.close();
  // A bounded categorical reason. The previous blanket catch printed only
  // CONTROL_CENTER_START_FAILED, so an operator whose review store was
  // unavailable could not tell that from a bad port. Only allowlisted codes
  // are echoed: anything else stays generic rather than forwarding a native
  // message that may carry a path or file content.
  const code = error instanceof Error ? error.message : '';
  const reported = /^CONTROL_CENTER_[A-Z_]{1,64}$/.test(code) ? code : 'CONTROL_CENTER_START_FAILED';
  process.stderr.write(`${reported}\n`);
  process.exitCode = 2;
}
