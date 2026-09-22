export declare const PRIVATE_CONSUMER_CENSUS_SCHEMA: string;
export declare const PRIVATE_CONSUMER_REGISTRY_SCHEMA: string;
export declare const CONSUMER_CLASSES: readonly string[];
export declare const CONSUMER_ACTIVITIES: readonly string[];
export declare const SCREENING_API: readonly string[];
export declare const STORE_WRITE_API: readonly string[];
export declare const STORE_READ_API: readonly string[];

export interface RegistryEntry {
  root: string;
  klass: string;
  capabilities: readonly string[];
}

export declare const PRIVATE_CONSUMER_REGISTRY: readonly RegistryEntry[];

export interface ConsumerActivity {
  file: string;
  activities: string[];
  screenSites: Array<{ api: string; line: number }>;
  writeSites: Array<{ api: string; line: number }>;
  readSites: Array<{ api: string; line: number }>;
  referencesStore: boolean;
  constructsStore: boolean;
}

export interface ConsumerNode {
  identity: string;
  file: string;
  class: string;
  registryRoot: string;
  activities: string[];
  screenCalls: number;
  writeCalls: number;
  readCalls: number;
}

export interface CensusViolation {
  code: 'UNKNOWN_CONSUMER' | 'STALE_REGISTRY' | 'DUPLICATE_REGISTRY' | 'CAPABILITY_BYPASS' | 'EMPTY_CENSUS';
  file: string;
  detail: string;
}

export interface PrivateConsumerCensus {
  schemaVersion: string;
  registrySchema: string;
  registrySize: number;
  consumerCount: number;
  productionConsumerCount: number;
  writerCount: number;
  screenCallCount: number;
  byClass: Record<string, number>;
  digest: string;
  consumers: ConsumerNode[];
  violations: CensusViolation[];
  ok: boolean;
}

export declare function maskSource(source: string): string;
export declare function discoverConsumerActivity(file: string, source: string): ConsumerActivity;
export declare function buildPrivateConsumerCensus(
  files: Array<{ file: string; source: string }>,
  registry?: readonly RegistryEntry[],
): PrivateConsumerCensus;
