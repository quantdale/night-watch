// ---------------------------------------------------------------------------
// Nightwatch Phase 8B — bounded sandbox TypeScript module loader.
//
// Loads only exact absolute files beneath one resolved sandbox root, using
// the already-installed local `typescript` package (the same pattern the
// existing selfdev-*.mjs CLIs use). No network, no npm install, no
// candidate-provided module specifier. Execution is process-global-state
// serial: the require.extensions hook and require.cache are shared Node
// state, so only one sandbox load may be in flight at a time.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

let loadInFlight = false;

export class SelfDevSandboxLoaderBusyError extends Error {
  constructor() {
    super('SELFDEV_SANDBOX_LOADER_BUSY');
    this.name = 'SelfDevSandboxLoaderBusyError';
  }
}

/**
 * Loads one or more absolute `.ts` files beneath `sandboxRoot` under a single
 * transpile-hook installation, so they share one require cache (an entry
 * point's internal relative imports resolve to the same instances as a
 * sibling entry point loaded in the same call). Clears any stale cache
 * entries under the sandbox root before loading and all newly-loaded entries
 * after, so repeated sandbox runs never leak state across each other.
 */
export function loadSandboxModules(absoluteEntryPaths: readonly string[], sandboxRoot: string, nodeModulesAnchorPath: string): readonly unknown[] {
  if (loadInFlight) throw new SelfDevSandboxLoaderBusyError();
  loadInFlight = true;
  const resolvedSandboxRoot = fs.realpathSync(sandboxRoot);
  // Anchored inside the canonical repository (which has real node_modules),
  // never inside the sandbox mirror. Absolute-path requires for mirrored
  // `.ts` files below are unaffected by this anchor; only the loader's own
  // bare `require('typescript')` actually needs node_modules resolution.
  const requireFn = createRequire(nodeModulesAnchorPath);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const typescript = requireFn('typescript') as typeof import('typescript');
  const previousHandler = requireFn.extensions['.ts'];
  const loadedIds: string[] = [];

  requireFn.extensions['.ts'] = (module: NodeModule, filename: string) => {
    const resolvedFilename = fs.realpathSync(filename);
    if (resolvedFilename !== resolvedSandboxRoot && !resolvedFilename.startsWith(resolvedSandboxRoot + path.sep)) {
      throw new Error('SELFDEV_SANDBOX_LOADER_PATH_ESCAPE');
    }
    loadedIds.push(filename);
    const source = fs.readFileSync(filename, 'utf8');
    const output = typescript.transpileModule(source, {
      fileName: filename,
      compilerOptions: {
        target: typescript.ScriptTarget.ES2022,
        module: typescript.ModuleKind.CommonJS,
        moduleResolution: typescript.ModuleResolutionKind.Node10,
        esModuleInterop: true,
        skipLibCheck: true,
      },
    }).outputText;
    (module as unknown as { _compile(code: string, filename: string): void })._compile(output, filename);
  };

  try {
    for (const key of Object.keys(requireFn.cache)) {
      if (key === resolvedSandboxRoot || key.startsWith(resolvedSandboxRoot + path.sep)) delete requireFn.cache[key];
    }
    return absoluteEntryPaths.map((entryPath) => requireFn(entryPath) as unknown);
  } finally {
    if (previousHandler === undefined) delete requireFn.extensions['.ts'];
    else requireFn.extensions['.ts'] = previousHandler;
    for (const id of loadedIds) delete requireFn.cache[id];
    loadInFlight = false;
  }
}
