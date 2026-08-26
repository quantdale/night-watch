export const TYPESCRIPT_RUNTIME_LOADER_VERSION: string;
export const DEFAULT_TYPESCRIPT_RUNTIME_PROFILE: string;

export interface TypeScriptRuntimeLoaderOptions {
  readonly root?: string;
  readonly profile?: string;
}

export function loadTypeScriptModule<T = unknown>(file: string, options?: TypeScriptRuntimeLoaderOptions): T;
export function loadTypeScriptModules<T = unknown>(files: readonly string[], options?: TypeScriptRuntimeLoaderOptions): T[];
export function clearTypeScriptRuntimeTranspileCache(): void;
export function typeScriptRuntimeTranspileCacheStats(): {
  readonly hits: number;
  readonly misses: number;
  readonly evictions: number;
  readonly transpiles: number;
  readonly entries: number;
  readonly maxEntries: number;
};
export function typeScriptRuntimeProfileNames(): readonly string[];
