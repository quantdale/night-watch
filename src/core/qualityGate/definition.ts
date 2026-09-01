import qualityGateDefinition from '../../../config/quality-gate.v1.json';
import semanticCompatibilityDefinition from '../../../config/semantic-compatibility.v1.json';

export const QUALITY_GATE_SCHEMA = 'nightwatch.quality-gate.v1' as const;
export const QUALITY_GATE_RECEIPT_SCHEMA = 'nightwatch.quality-gate-receipt.v1' as const;
export const SEMANTIC_COMPATIBILITY_SCHEMA = 'nightwatch.semantic-compatibility.v1' as const;

export const QUALITY_GATE_COMMAND_KEYS = [
  'GATE_DEFINITION',
  'TYPECHECK',
  'HARDENING_CHECK',
  'HANDOFF_CHECK',
  'PROJECT_CHECK',
  'AGENT_CONTINUITY',
  'SEMANTIC_COMPATIBILITY',
  'OWNER_PROVENANCE',
  'SYNTHETIC_CAMPAIGN',
  'PATCH_INTEGRITY',
  'WORKSPACE_INTEGRITY',
] as const;

export type QualityGateCommandKey = typeof QUALITY_GATE_COMMAND_KEYS[number];
export type QualityGateTimeoutClass = 'SHORT' | 'MEDIUM' | 'LONG';

export interface QualityGateGroup {
  readonly id: string;
  readonly commandKey: QualityGateCommandKey;
  readonly required: boolean;
  readonly environmentRequirements: readonly string[];
  readonly timeoutClass: QualityGateTimeoutClass;
  readonly dependsOn: readonly string[];
  readonly ciCapable: boolean;
  readonly cleanCheckoutCapable: boolean;
  readonly requiresSiblingTopology: boolean;
  readonly preDevRelevant: boolean;
  readonly expectedFailClosedBehavior: string;
}

export interface QualityGateDefinition {
  readonly schemaVersion: typeof QUALITY_GATE_SCHEMA;
  readonly definitionName: string;
  readonly groups: readonly QualityGateGroup[];
}

export interface SemanticCompatibilitySuite {
  readonly phase: number;
  readonly files: readonly string[];
}

export interface SemanticCompatibilityDefinition {
  readonly schemaVersion: typeof SEMANTIC_COMPATIBILITY_SCHEMA;
  readonly requiredPhaseRange: { readonly first: number; readonly last: number };
  readonly execution: {
    readonly project: 'nightwatch';
    readonly workers: 1;
    readonly serial: true;
    readonly expectedSkipPolicy: string;
  };
  readonly phaseSuites: readonly SemanticCompatibilitySuite[];
  readonly supportFiles: readonly string[];
  readonly intentionalDuplicateFileReasons: readonly string[];
}

const GROUP_ID_RE = /^[A-Z][A-Z0-9_]{1,63}$/;
const SAFE_TEST_FILE_RE = /^tests\/(?:unit|smoke)\/[A-Za-z0-9._/-]+\.test\.ts$/;
const COMMAND_SET = new Set<string>(QUALITY_GATE_COMMAND_KEYS);

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`QUALITY_GATE_${label}_INVALID`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`QUALITY_GATE_${label}_INVALID`);
  return value;
}

function asBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`QUALITY_GATE_${label}_INVALID`);
  return value;
}

function asStringArray(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.length === 0)) {
    throw new Error(`QUALITY_GATE_${label}_INVALID`);
  }
  return Object.freeze(value.slice() as string[]);
}

function parseGroup(value: unknown, index: number): QualityGateGroup {
  const record = asRecord(value, `GROUP_${index}`);
  const id = asString(record.id, `GROUP_${index}_ID`);
  if (!GROUP_ID_RE.test(id)) throw new Error(`QUALITY_GATE_GROUP_ID_INVALID:${id}`);
  const commandKey = asString(record.commandKey, `GROUP_${id}_COMMAND`);
  if (!COMMAND_SET.has(commandKey)) throw new Error(`QUALITY_GATE_UNKNOWN_COMMAND:${commandKey}`);
  const timeoutClass = asString(record.timeoutClass, `GROUP_${id}_TIMEOUT`);
  if (timeoutClass !== 'SHORT' && timeoutClass !== 'MEDIUM' && timeoutClass !== 'LONG') {
    throw new Error(`QUALITY_GATE_TIMEOUT_INVALID:${id}`);
  }
  return {
    id,
    commandKey: commandKey as QualityGateCommandKey,
    required: asBoolean(record.required, `GROUP_${id}_REQUIRED`),
    environmentRequirements: asStringArray(record.environmentRequirements, `GROUP_${id}_ENVIRONMENT`),
    timeoutClass,
    dependsOn: asStringArray(record.dependsOn, `GROUP_${id}_DEPENDENCIES`),
    ciCapable: asBoolean(record.ciCapable, `GROUP_${id}_CI`),
    cleanCheckoutCapable: asBoolean(record.cleanCheckoutCapable, `GROUP_${id}_CLEAN`),
    requiresSiblingTopology: asBoolean(record.requiresSiblingTopology, `GROUP_${id}_SIBLING`),
    preDevRelevant: asBoolean(record.preDevRelevant, `GROUP_${id}_PREDEV`),
    expectedFailClosedBehavior: asString(record.expectedFailClosedBehavior, `GROUP_${id}_FAIL_CLOSED`),
  };
}

export function validateQualityGateDefinition(value: unknown): QualityGateDefinition {
  const record = asRecord(value, 'DEFINITION');
  if (record.schemaVersion !== QUALITY_GATE_SCHEMA) throw new Error('QUALITY_GATE_SCHEMA_UNSUPPORTED');
  const definitionName = asString(record.definitionName, 'DEFINITION_NAME');
  if (!Array.isArray(record.groups) || record.groups.length === 0) throw new Error('QUALITY_GATE_GROUPS_INVALID');
  const groups = record.groups.map((group, index) => parseGroup(group, index));
  const ids = new Set<string>();
  for (const group of groups) {
    if (ids.has(group.id)) throw new Error(`QUALITY_GATE_DUPLICATE_GROUP:${group.id}`);
    ids.add(group.id);
  }
  for (const group of groups) {
    for (const dependency of group.dependsOn) {
      if (!ids.has(dependency)) throw new Error(`QUALITY_GATE_UNKNOWN_DEPENDENCY:${group.id}:${dependency}`);
    }
  }
  return Object.freeze({ schemaVersion: QUALITY_GATE_SCHEMA, definitionName, groups: Object.freeze(groups) });
}

export function validateSemanticCompatibilityDefinition(value: unknown): SemanticCompatibilityDefinition {
  const record = asRecord(value, 'COMPATIBILITY_DEFINITION');
  if (record.schemaVersion !== SEMANTIC_COMPATIBILITY_SCHEMA) throw new Error('SEMANTIC_COMPATIBILITY_SCHEMA_UNSUPPORTED');
  const range = asRecord(record.requiredPhaseRange, 'COMPATIBILITY_PHASE_RANGE');
  if (typeof range.first !== 'number' || typeof range.last !== 'number' || range.first !== 9 || range.last !== 26) {
    throw new Error('SEMANTIC_COMPATIBILITY_PHASE_RANGE_INVALID');
  }
  const execution = asRecord(record.execution, 'COMPATIBILITY_EXECUTION');
  if (execution.project !== 'nightwatch' || execution.workers !== 1 || execution.serial !== true) {
    throw new Error('SEMANTIC_COMPATIBILITY_EXECUTION_INVALID');
  }
  const suitesValue = record.phaseSuites;
  if (!Array.isArray(suitesValue) || suitesValue.length === 0) throw new Error('SEMANTIC_COMPATIBILITY_SUITES_INVALID');
  const seenPhases = new Set<number>();
  const seenFiles = new Set<string>();
  const suites: SemanticCompatibilitySuite[] = [];
  for (const [index, item] of suitesValue.entries()) {
    const suite = asRecord(item, `COMPATIBILITY_SUITE_${index}`);
    if (typeof suite.phase !== 'number' || !Number.isFinite(suite.phase)) throw new Error('SEMANTIC_COMPATIBILITY_PHASE_INVALID');
    if (seenPhases.has(suite.phase)) throw new Error(`SEMANTIC_COMPATIBILITY_DUPLICATE_PHASE:${suite.phase}`);
    seenPhases.add(suite.phase);
    const files = asStringArray(suite.files, `COMPATIBILITY_FILES_${suite.phase}`);
    if (files.length === 0) throw new Error(`SEMANTIC_COMPATIBILITY_EMPTY_PHASE:${suite.phase}`);
    for (const file of files) {
      if (!SAFE_TEST_FILE_RE.test(file) || file.includes('..')) throw new Error(`SEMANTIC_COMPATIBILITY_FILE_INVALID:${file}`);
      if (seenFiles.has(file)) throw new Error(`SEMANTIC_COMPATIBILITY_DUPLICATE_FILE:${file}`);
      seenFiles.add(file);
    }
    suites.push({ phase: suite.phase, files });
  }
  for (let phase = 9; phase <= 26; phase += 1) {
    if (!suites.some((suite) => Math.floor(suite.phase) === phase)) throw new Error(`SEMANTIC_COMPATIBILITY_PHASE_OMITTED:${phase}`);
  }
  const supportFiles = asStringArray(record.supportFiles, 'COMPATIBILITY_SUPPORT_FILES');
  for (const file of supportFiles) {
    if (!SAFE_TEST_FILE_RE.test(file) || file.includes('..')) throw new Error(`SEMANTIC_COMPATIBILITY_FILE_INVALID:${file}`);
    if (seenFiles.has(file)) throw new Error(`SEMANTIC_COMPATIBILITY_DUPLICATE_FILE:${file}`);
    seenFiles.add(file);
  }
  const reasons = asStringArray(record.intentionalDuplicateFileReasons, 'COMPATIBILITY_DUPLICATE_REASONS');
  return Object.freeze({
    schemaVersion: SEMANTIC_COMPATIBILITY_SCHEMA,
    requiredPhaseRange: { first: 9, last: 26 },
    execution: {
      project: 'nightwatch' as const,
      workers: 1 as const,
      serial: true as const,
      expectedSkipPolicy: asString(execution.expectedSkipPolicy, 'COMPATIBILITY_SKIP_POLICY'),
    },
    phaseSuites: Object.freeze(suites),
    supportFiles,
    intentionalDuplicateFileReasons: reasons,
  });
}

export const QUALITY_GATE_DEFINITION = validateQualityGateDefinition(qualityGateDefinition);
export const SEMANTIC_COMPATIBILITY_DEFINITION = validateSemanticCompatibilityDefinition(semanticCompatibilityDefinition);

export function flattenSemanticCompatibilityFiles(definition = SEMANTIC_COMPATIBILITY_DEFINITION): readonly string[] {
  return Object.freeze([...definition.phaseSuites.flatMap((suite) => suite.files), ...definition.supportFiles]);
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}
