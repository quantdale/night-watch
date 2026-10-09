import Module, { createRequire } from 'node:module';

// Nightwatch — one bounded TypeScript runtime loader for local CLI entrypoints.
//
// This is a mechanics-only bridge. It never executes an environment, reads
// product data, persists source, or produces a proof. Compiler derivatives are
// retained only in a bounded process-local LRU and are keyed by every input
// that can affect the transpiled module.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Prefer the current working directory for the repository-local test/runtime
// transform, but retain direct absolute-bin invocation semantics by probing the
// entrypoint directory as a module-resolution anchor. The candidates are
// resolved without exposing paths or source in any returned value.
/**
 * The module-resolution anchors, probed in declared order. The first entry is
 * also the fallback anchor used when no local TypeScript resolves, hence the
 * fixed positional tuple rather than a plain array.
 *
 * @type {[string, string, string]}
 */
const requireAnchors = [
  path.join(process.cwd(), 'package.json'),
  path.join(path.dirname(path.resolve(process.argv[1] ?? process.cwd())), 'package.json'),
  path.join(path.dirname(path.resolve(process.argv[1] ?? process.cwd())), '..', 'package.json'),
];
let runtimeRequire = null;
for (const anchor of [...new Set(requireAnchors)]) {
  try {
    const candidate = createRequire(anchor);
    candidate.resolve('typescript');
    runtimeRequire = candidate;
    break;
  } catch {
    // Probe the next local anchor; the final require below preserves the
    // normal module-not-found error if TypeScript is unavailable everywhere.
  }
}
const require = runtimeRequire ?? createRequire(requireAnchors[0]);
const typescript = require('typescript');

export const TYPESCRIPT_RUNTIME_LOADER_VERSION = 'nightwatch.typescript-runtime-loader.v1';
export const DEFAULT_TYPESCRIPT_RUNTIME_PROFILE = 'NIGHTWATCH_NODE_ES2022_COMMONJS';
const MAX_MODULE_LIST = 128;
const MAX_CACHE_ENTRIES = 256;

const TYPESCRIPT_RUNTIME_PROFILES = Object.freeze({
  NIGHTWATCH_NODE_ES2022_COMMONJS: Object.freeze({
    target: typescript.ScriptTarget.ES2022,
    module: typescript.ModuleKind.CommonJS,
    moduleResolution: typescript.ModuleResolutionKind.Node10,
    esModuleInterop: true,
    skipLibCheck: true,
  }),
  NIGHTWATCH_NODE_ES2020_COMMONJS: Object.freeze({
    target: typescript.ScriptTarget.ES2020,
    module: typescript.ModuleKind.CommonJS,
    moduleResolution: typescript.ModuleResolutionKind.Node10,
    esModuleInterop: true,
    skipLibCheck: true,
  }),
});

const transpileCache = new Map();
let cacheHits = 0;
let cacheMisses = 0;
let cacheEvictions = 0;
let transpileCount = 0;

/** @param {string} value */
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Render a value as a key-stable string. The input is the cache-key field set,
 * so the object branch reads through a record view of the non-null object the
 * guard established.
 *
 * @param {unknown} value
 * @returns {string}
 */
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => canonical(entry)).join(',')}]`;
  const record = /** @type {Record<string, unknown>} */ (value);
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
}

/**
 * @param {string} name
 * @returns {typescript.CompilerOptions}
 */
function profileFor(name) {
  if (typeof name !== 'string' || !Object.hasOwn(TYPESCRIPT_RUNTIME_PROFILES, name)) {
    throw new Error('TYPESCRIPT_RUNTIME_PROFILE_UNSUPPORTED');
  }
  return TYPESCRIPT_RUNTIME_PROFILES[/** @type {keyof typeof TYPESCRIPT_RUNTIME_PROFILES} */ (name)];
}

/**
 * @param {string} file
 * @param {string} root
 * @returns {string}
 */
function resolveModulePath(file, root) {
  if (typeof file !== 'string' || file.length === 0 || file.includes('\0')) throw new Error('TYPESCRIPT_RUNTIME_MODULE_INVALID');
  const resolved = path.resolve(root, file);
  if (!resolved.toLowerCase().endsWith('.ts')) throw new Error('TYPESCRIPT_RUNTIME_MODULE_NOT_TYPESCRIPT');
  return resolved;
}

/**
 * @param {string} filename
 * @param {string} sourceText
 * @param {string} profileName
 * @param {typescript.CompilerOptions} compilerOptions
 * @returns {string}
 */
function cacheKey(filename, sourceText, profileName, compilerOptions) {
  return sha256(canonical({
    loaderVersion: TYPESCRIPT_RUNTIME_LOADER_VERSION,
    typescriptVersion: typescript.version,
    profileName,
    compilerOptions,
    filename,
    sourceDigest: sha256(sourceText),
  }));
}

/**
 * @param {string} key
 * @param {string} outputText
 */
function remember(key, outputText) {
  transpileCache.delete(key);
  transpileCache.set(key, outputText);
  while (transpileCache.size > MAX_CACHE_ENTRIES) {
    const oldest = transpileCache.keys().next().value;
    if (oldest === undefined) break;
    transpileCache.delete(oldest);
    cacheEvictions += 1;
  }
}

/**
 * @param {string} filename
 * @param {string} sourceText
 * @param {string} profileName
 * @param {typescript.CompilerOptions} compilerOptions
 * @returns {{ key: string, outputText: string, cached: boolean }}
 */
function outputFor(filename, sourceText, profileName, compilerOptions) {
  const key = cacheKey(filename, sourceText, profileName, compilerOptions);
  const cached = transpileCache.get(key);
  if (cached !== undefined) {
    transpileCache.delete(key);
    transpileCache.set(key, cached);
    cacheHits += 1;
    return { key, outputText: cached, cached: true };
  }
  cacheMisses += 1;
  transpileCount += 1;
  const outputText = typescript.transpileModule(sourceText, {
    fileName: filename,
    compilerOptions,
  }).outputText;
  return { key, outputText, cached: false };
}

/**
 * The CommonJS loader internals this bridge patches. `_compile` is a
 * `Module.prototype` member and `_resolveFilename` a `Module` static; both
 * exist on every Node runtime Nightwatch supports, but neither is part of the
 * public `node:module` typings, so their exact shapes are declared once here
 * and asserted at their single points of use.
 *
 * @typedef {{ _resolveFilename: (request: string, parent: Module, isMain: boolean, options: unknown) => string }} ModuleResolveFilenameStatic
 *
 * @typedef {{ _compile: (content: string, filename: string) => unknown }} ModuleCompileInternals
 */

/**
 * @template T
 * @param {string} profileName
 * @param {() => T} callback
 * @returns {T}
 */
function withTypeScriptHook(profileName, callback) {
  const compilerOptions = profileFor(profileName);
  const previous = require.extensions['.ts'];
  const moduleClass = /** @type {typeof Module & ModuleResolveFilenameStatic} */ (Module);
  const originalResolveFilename = moduleClass._resolveFilename;
  require.extensions['.ts'] = (module, filename) => {
    const sourceText = fs.readFileSync(filename, 'utf8');
    const compiled = outputFor(filename, sourceText, profileName, compilerOptions);
    /** @type {Module & ModuleCompileInternals} */ (module)._compile(compiled.outputText, filename);
    if (!compiled.cached) remember(compiled.key, compiled.outputText);
  };
  // Node 22+ require() for CommonJS-compiled TS modules fails to resolve
  // bare sibling imports (e.g. require('./collector') when only
  // ./collector.ts exists). Hook Module._resolveFilename to try the .ts
  // extension when resolution fails and the parent is a .ts module.
  moduleClass._resolveFilename = function (request, parent, isMain, options) {
    try {
      return originalResolveFilename.call(this, request, parent, isMain, options);
    } catch (err) {
      const errorCode = /** @type {NodeJS.ErrnoException | undefined} */ (err)?.code;
      if (
        errorCode === 'MODULE_NOT_FOUND' &&
        parent?.filename?.endsWith('.ts') &&
        !request.endsWith('.ts') &&
        !request.endsWith('.js') &&
        !request.startsWith('node:')
      ) {
        const tsRequest = `${request}.ts`;
        try {
          return originalResolveFilename.call(this, tsRequest, parent, isMain, options);
        } catch {
          // fall through to the original error
        }
      }
      throw err;
    }
  };
  try {
    return callback();
  } finally {
    moduleClass._resolveFilename = originalResolveFilename;
    if (previous === undefined) delete require.extensions['.ts'];
    else require.extensions['.ts'] = previous;
  }
}

/**
 * The options a loader call accepts. Both fields are optional at runtime, so
 * the optionality lives in the `Partial` wrapper rather than in the field list.
 *
 * @typedef {{ root: string, profile: string }} TypeScriptRuntimeLoaderCallOptions
 */

/**
 * @param {string} file
 * @param {Partial<TypeScriptRuntimeLoaderCallOptions>} options
 */
export function loadTypeScriptModule(file, options = {}) {
  const root = options.root ?? process.cwd();
  const profileName = options.profile ?? DEFAULT_TYPESCRIPT_RUNTIME_PROFILE;
  const filename = resolveModulePath(file, root);
  return withTypeScriptHook(profileName, () => require(filename));
}

/**
 * The runtime accepts arbitrary input and validates it before use; the
 * declared element type is the valid case the guard establishes.
 *
 * @param {string[]} files
 * @param {Partial<TypeScriptRuntimeLoaderCallOptions>} options
 */
export function loadTypeScriptModules(files, options = {}) {
  if (!Array.isArray(files) || files.length === 0 || files.length > MAX_MODULE_LIST) throw new Error('TYPESCRIPT_RUNTIME_MODULE_LIST_INVALID');
  const root = options.root ?? process.cwd();
  const profileName = options.profile ?? DEFAULT_TYPESCRIPT_RUNTIME_PROFILE;
  const filenames = files.map((file) => resolveModulePath(file, root));
  return withTypeScriptHook(profileName, () => filenames.map((filename) => require(filename)));
}

export function clearTypeScriptRuntimeTranspileCache() {
  transpileCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
  cacheEvictions = 0;
  transpileCount = 0;
}

export function typeScriptRuntimeTranspileCacheStats() {
  return Object.freeze({
    hits: cacheHits,
    misses: cacheMisses,
    evictions: cacheEvictions,
    transpiles: transpileCount,
    entries: transpileCache.size,
    maxEntries: MAX_CACHE_ENTRIES,
  });
}

export function typeScriptRuntimeProfileNames() {
  return Object.freeze(Object.keys(TYPESCRIPT_RUNTIME_PROFILES));
}
