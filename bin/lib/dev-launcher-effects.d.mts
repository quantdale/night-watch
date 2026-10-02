// Types for the DEV-launcher effect analysis (`bin/lib/dev-launcher-effects.mjs`).
export interface LauncherEffect { line: number; text: string; region: 'BEFORE_GUARD' | 'BEFORE_SHORT_CIRCUIT' }
export interface LauncherAnalysis { guardFound: boolean; shortCircuitFound: boolean; effects: LauncherEffect[]; problems: string[] }
export const FS_MUTATIONS: ReadonlySet<string>;
export function analyzeDevLauncher(code: string, fileName?: string, options?: { pureLocals?: ReadonlySet<string> }): LauncherAnalysis;
export const DEV_LAUNCHER_MUTANT_SAMPLES: ReadonlyArray<{ id: string; name: string; before?: string; between?: string; imports?: string; expectRegion?: LauncherEffect['region'] }>;
export function composeSyntheticLauncher(sample: { before?: string; between?: string; imports?: string }): string;
export function devLauncherAnalysisSelfTest(): string[];
