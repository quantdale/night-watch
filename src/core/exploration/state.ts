import { createHash } from 'node:crypto';
import type {
  ExplorationEnvelope,
  ExplorationState,
  ExplorationStateInput,
  SafeAction,
  SafeScalar,
} from './types';
import {
  EXPLORATION_STATE_SCHEMA_VERSION,
  EXPLORATION_TRANSITION_SCHEMA_VERSION,
  type ExplorationTransition,
  type ExplorationBudget,
  type SafeScalarMap,
} from './types';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort().map((key) => [key, canonicalize(record[key])]));
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function sortedMap(map: Readonly<Record<string, SafeScalar>>): SafeScalarMap {
  return Object.fromEntries(Object.keys(map).sort().map((key) => [key, map[key]!])) as SafeScalarMap;
}

function sortedBooleans(map: Readonly<Record<string, boolean>>): Readonly<Record<string, boolean>> {
  return Object.fromEntries(Object.keys(map).sort().map((key) => [key, map[key]!])) as Readonly<Record<string, boolean>>;
}

const FORBIDDEN_STATE_TOKENS = /customer|account|resource|cost|body|response|request|cookie|token|secret|html|dom|text|name/i;

function assertSafeKey(key: string): void {
  if (FORBIDDEN_STATE_TOKENS.test(key)) throw new Error(`privacy-unsafe state key: ${key}`);
  if (!/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(key)) throw new Error(`non-canonical state key: ${key}`);
}

function assertSafeScalar(value: SafeScalar, path: string): void {
  if (typeof value === 'string' && (value.length > 80 || /[\r\n]/.test(value))) {
    throw new Error(`privacy-unsafe state value: ${path}`);
  }
}

function assertSafeMap(map: Readonly<Record<string, SafeScalar>>, path: string): void {
  for (const [key, value] of Object.entries(map)) {
    assertSafeKey(key);
    assertSafeScalar(value, `${path}.${key}`);
  }
}

export function assertPrivacySafeStateInput(input: ExplorationStateInput): void {
  if (input.product !== 'ripple') throw new Error('Phase 4 state product must be Ripple');
  if (!/^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/.test(input.routeClass)) {
    throw new Error('state routeClass must be a sanitized approved route class');
  }
  if (input.surface.length > 80 || !/^[A-Za-z0-9_.-]+$/.test(input.surface)) {
    throw new Error('state surface must be a sanitized surface enum');
  }
  for (const key of Object.keys(input.structuralFlags)) assertSafeKey(key);
  for (const key of Object.keys(input.terminalFlags)) assertSafeKey(key);
  assertSafeMap(input.safeViewState, 'safeViewState');
  for (const id of input.availableActionIds) {
    if (!/^[A-Za-z0-9_.-]{1,120}$/.test(id)) throw new Error('state action availability is not canonical');
  }
  for (const family of input.semanticReadFamilies) {
    if (!/^[A-Za-z0-9_.:-]{1,120}$/.test(family)) throw new Error('state semantic family is not canonical');
  }
  if (!['AUTHENTICATED_DEV', 'AUTH_INVALID', 'UNKNOWN'].includes(input.authStateClass)) {
    throw new Error('state auth class is not canonical');
  }
}

export function stateIdentityInput(input: ExplorationStateInput): ExplorationStateInput {
  assertPrivacySafeStateInput(input);
  return {
    product: input.product,
    surface: input.surface,
    routeClass: input.routeClass,
    structuralFlags: sortedBooleans(input.structuralFlags),
    safeViewState: sortedMap(input.safeViewState),
    availableActionIds: [...new Set(input.availableActionIds)].sort(),
    semanticReadFamilies: [...new Set(input.semanticReadFamilies)].sort(),
    authStateClass: input.authStateClass,
    terminalFlags: sortedBooleans(input.terminalFlags),
  };
}

export function createExplorationState(input: ExplorationStateInput): ExplorationState {
  const identity = stateIdentityInput(input);
  return {
    schemaVersion: EXPLORATION_STATE_SCHEMA_VERSION,
    ...identity,
    stateId: `state_${sha256(canonicalJson({ schemaVersion: EXPLORATION_STATE_SCHEMA_VERSION, ...identity }))}`,
  };
}

export function transitionIdentity(fromStateId: string, actionId: string, toStateId: string): string {
  return `transition_${sha256(canonicalJson({
    schemaVersion: EXPLORATION_TRANSITION_SCHEMA_VERSION,
    fromStateId,
    actionId,
    toStateId,
  }))}`;
}

export function createTransition(input: Omit<ExplorationTransition, 'schemaVersion' | 'transitionId'>): ExplorationTransition {
  return {
    schemaVersion: EXPLORATION_TRANSITION_SCHEMA_VERSION,
    ...input,
    transitionId: transitionIdentity(input.fromStateId, input.actionId, input.toStateId),
  };
}

export function catalogFingerprint(actions: readonly SafeAction[]): string {
  const canonicalActions = [...actions].sort((a, b) => a.actionId.localeCompare(b.actionId));
  return `catalog_${sha256(canonicalJson({ version: 'nightwatch.safe-actions.phase4.v1', actions: canonicalActions }))}`;
}

export function modelFingerprint(envelope: ExplorationEnvelope, budget: ExplorationBudget): string {
  return `model_${sha256(canonicalJson({
    modelVersion: 'nightwatch.exploration-model.phase4.v1',
    envelope,
    budget,
  }))}`;
}
