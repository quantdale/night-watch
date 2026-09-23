export declare const TRANSPORT_CENSUS_SCHEMA: string;
export declare const TRANSPORT_REGISTRY_SCHEMA: string;
export declare const EFFECT_VOCABULARY: readonly string[];
export declare const EFFECT_CLASSES: readonly string[];

export interface TransportRegistryEntry {
  root: string;
  klass: string;
}

export declare const TRANSPORT_EFFECT_REGISTRY: readonly TransportRegistryEntry[];

export interface EffectSite {
  identity: string;
  file: string;
  line: number;
  effect: string;
  klass?: string;
  registryRoot?: string;
}

export interface TransportCensusViolation {
  code: 'UNKNOWN_EFFECT' | 'STALE_REGISTRY' | 'DUPLICATE_REGISTRY' | 'EMPTY_CENSUS';
  file: string;
  detail: string;
}

export interface TransportEffectCensus {
  schemaVersion: string;
  registrySchema: string;
  registrySize: number;
  siteCount: number;
  classifiedCount: number;
  byClass: Record<string, number>;
  byEffect: Record<string, number>;
  digest: string;
  sites: EffectSite[];
  violations: TransportCensusViolation[];
  ok: boolean;
}

export declare function maskSource(source: string): string;
export declare function discoverEffectSites(file: string, source: string): Array<{ identity: string; file: string; line: number; effect: string }>;
export declare function buildTransportEffectCensus(
  files: Array<{ file: string; source: string }>,
  registry?: readonly TransportRegistryEntry[],
): TransportEffectCensus;
