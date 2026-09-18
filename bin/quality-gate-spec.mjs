#!/usr/bin/env node

// Offline validator and digest renderer for the data-only quality gate.
// Runtime command authority lives in bin/quality-gate.mjs; JSON cannot inject
// a shell command or select an unregistered operation.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli, invokedDirectly } from './lib/operator-cli.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const definitionPath = path.join(root, 'config', 'quality-gate.v1.json');
const compatibilityPath = path.join(root, 'config', 'semantic-compatibility.v1.json');

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'quality-gate-spec',
  entry: 'bin/quality-gate-spec.mjs',
  purpose: 'Validate the versioned quality-gate and compatibility definitions, then render their digest.',
  group: 'validate',
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: [],
};
const commandKeys = new Set([
  'GATE_DEFINITION', 'TYPECHECK', 'HARDENING_CHECK', 'HARDENING_PROBES', 'HANDOFF_CHECK', 'PROJECT_CHECK',
  'AGENT_CONTINUITY', 'SEMANTIC_COMPATIBILITY', 'OWNER_PROVENANCE',
  'SYNTHETIC_CAMPAIGN', 'PATCH_INTEGRITY', 'WORKSPACE_INTEGRITY',
]);
const timeoutClasses = new Set(['SHORT', 'MEDIUM', 'LONG']);
const idPattern = /^[A-Z][A-Z0-9_]{1,63}$/;
const filePattern = /^tests\/(?:unit|smoke)\/[A-Za-z0-9._/-]+\.test\.ts$/;

function fail(code) {
  throw new Error(code);
}

function readJson(file, code) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    fail(code);
  }
}

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}

function digest(value) {
  return `sha256:${crypto.createHash('sha256').update(canonical(value), 'utf8').digest('hex')}`;
}

function validateDefinition(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('QUALITY_GATE_DEFINITION_INVALID');
  if (value.schemaVersion !== 'nightwatch.quality-gate.v1') fail('QUALITY_GATE_SCHEMA_UNSUPPORTED');
  if (typeof value.definitionName !== 'string' || !value.definitionName) fail('QUALITY_GATE_NAME_INVALID');
  if (!Array.isArray(value.groups) || value.groups.length === 0) fail('QUALITY_GATE_GROUPS_INVALID');
  const ids = new Set();
  for (const group of value.groups) {
    if (!group || typeof group !== 'object' || Array.isArray(group)) fail('QUALITY_GATE_GROUP_INVALID');
    if (typeof group.id !== 'string' || !idPattern.test(group.id) || ids.has(group.id)) fail('QUALITY_GATE_GROUP_ID_INVALID');
    if (typeof group.commandKey !== 'string' || !commandKeys.has(group.commandKey)) fail(`QUALITY_GATE_UNKNOWN_COMMAND:${String(group.commandKey)}`);
    if (typeof group.required !== 'boolean' || !Array.isArray(group.environmentRequirements)) fail(`QUALITY_GATE_GROUP_FIELDS_INVALID:${group.id}`);
    if (!timeoutClasses.has(group.timeoutClass)) fail(`QUALITY_GATE_TIMEOUT_INVALID:${group.id}`);
    if (!Array.isArray(group.dependsOn) || group.dependsOn.some((dependency) => typeof dependency !== 'string')) fail(`QUALITY_GATE_DEPENDENCIES_INVALID:${group.id}`);
    if (typeof group.ciCapable !== 'boolean' || typeof group.cleanCheckoutCapable !== 'boolean' || typeof group.requiresSiblingTopology !== 'boolean' || typeof group.preDevRelevant !== 'boolean') fail(`QUALITY_GATE_CAPABILITIES_INVALID:${group.id}`);
    if (typeof group.expectedFailClosedBehavior !== 'string' || group.expectedFailClosedBehavior.length === 0) fail(`QUALITY_GATE_FAIL_CLOSED_INVALID:${group.id}`);
    ids.add(group.id);
  }
  for (let index = 0; index < value.groups.length; index += 1) {
    const group = value.groups[index];
    for (const dependency of group.dependsOn) {
      if (!ids.has(dependency)) fail(`QUALITY_GATE_UNKNOWN_DEPENDENCY:${group.id}:${dependency}`);
      const dependencyIndex = value.groups.findIndex((candidate) => candidate.id === dependency);
      if (dependencyIndex >= index) fail(`QUALITY_GATE_DEPENDENCY_ORDER_INVALID:${group.id}:${dependency}`);
    }
  }
  return value;
}

function validateCompatibility(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('SEMANTIC_COMPATIBILITY_INVALID');
  if (value.schemaVersion !== 'nightwatch.semantic-compatibility.v1') fail('SEMANTIC_COMPATIBILITY_SCHEMA_UNSUPPORTED');
  if (value.requiredPhaseRange?.first !== 9 || value.requiredPhaseRange?.last !== 26) fail('SEMANTIC_COMPATIBILITY_PHASE_RANGE_INVALID');
  if (value.execution?.project !== 'nightwatch' || value.execution?.workers !== 1 || value.execution?.serial !== true) fail('SEMANTIC_COMPATIBILITY_EXECUTION_INVALID');
  if (!Array.isArray(value.phaseSuites) || value.phaseSuites.length === 0) fail('SEMANTIC_COMPATIBILITY_SUITES_INVALID');
  const phases = new Set();
  const files = new Set();
  for (const suite of value.phaseSuites) {
    if (!Number.isFinite(suite?.phase) || phases.has(suite.phase) || !Array.isArray(suite.files) || suite.files.length === 0) fail('SEMANTIC_COMPATIBILITY_SUITE_INVALID');
    phases.add(suite.phase);
    for (const file of suite.files) {
      if (typeof file !== 'string' || file.includes('..') || !filePattern.test(file) || files.has(file)) fail(`SEMANTIC_COMPATIBILITY_FILE_INVALID:${String(file)}`);
      if (!fs.existsSync(path.join(root, file))) fail(`SEMANTIC_COMPATIBILITY_FILE_MISSING:${file}`);
      files.add(file);
    }
  }
  for (const file of value.supportFiles ?? []) {
    if (typeof file !== 'string' || file.includes('..') || !filePattern.test(file) || files.has(file)) fail(`SEMANTIC_COMPATIBILITY_FILE_INVALID:${String(file)}`);
    if (!fs.existsSync(path.join(root, file))) fail(`SEMANTIC_COMPATIBILITY_FILE_MISSING:${file}`);
    files.add(file);
  }
  for (let phase = 9; phase <= 26; phase += 1) {
    if (![...phases].some((candidate) => Math.floor(candidate) === phase)) fail(`SEMANTIC_COMPATIBILITY_PHASE_OMITTED:${phase}`);
  }
  if (!Array.isArray(value.intentionalDuplicateFileReasons)) fail('SEMANTIC_COMPATIBILITY_DUPLICATE_REASONS_INVALID');
  return { phases: phases.size, files: files.size };
}

const cli = invokedDirectly(import.meta.url) ? defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url }) : { stop: true };
if (!cli.stop) {
try {
  const definition = validateDefinition(readJson(definitionPath, 'QUALITY_GATE_DEFINITION_UNREADABLE'));
  const compatibility = validateCompatibility(readJson(compatibilityPath, 'SEMANTIC_COMPATIBILITY_UNREADABLE'));
  const result = {
    status: 'PASS',
    schemaVersion: definition.schemaVersion,
    definitionDigest: digest(definition),
    requiredGroups: definition.groups.filter((group) => group.required).map((group) => group.id),
    compatibilitySchemaVersion: 'nightwatch.semantic-compatibility.v1',
    compatibilityPhaseCount: compatibility.phases,
    compatibilityFileCount: compatibility.files,
  };
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(JSON.stringify({ status: 'CONFIG_INVALID', code: error instanceof Error ? error.message : 'QUALITY_GATE_CONFIG_INVALID' }));
  process.exitCode = 1;
}
}
