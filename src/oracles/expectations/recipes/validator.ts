// ---------------------------------------------------------------------------
// Nightwatch Phase 9A.1 — strict recipe validator (SPEC §35).
//
// Rejects: unknown recipe fields, unknown extractor kinds, malformed
// parameters, absolute paths, path traversal, unbounded lists, arbitrary
// regex/script/expression fields, unsupported language/extractor pairing,
// malformed ids, contract/blueprint mismatches, empty key sets. Duplicate
// recipe IDs and unknown/mutation endpoint targets are rejected at the
// registry level (see registry.ts).
// ---------------------------------------------------------------------------

import {
  MAX_ITEM_FIELD_TYPE_CONTRACTS,
  MAX_RECIPE_EXTRACTORS,
  REAL_SOURCE_EXPECTATION_RECIPE_VERSION,
  REAL_SOURCE_EXPECTATION_RECIPE_VERSION_V2,
  type ExtractorParams,
  type RealSourceContract,
  type RealSourceExpectationBlueprint,
  type RealSourceExpectationRecipe,
  type RealSourceItemFieldTypeContract,
} from './types';
import { MAX_TYPE_SET_SIZE } from '../types';

export const MAX_RECIPE_SOURCE_PATHS = 8;
export const MAX_RECIPE_ITEM_KEYS = 64;
export const MAX_RECIPE_FIELD_PATHS = 64;
export const MAX_ID_LENGTH = 200;
export const MAX_SYMBOL_LENGTH = 200;
export const MAX_RECIPE_PATH_SEGMENT_LENGTH = 200;

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const SYMBOL_RE = /^[A-Za-z_][A-Za-z0-9_]{0,199}$/;
const CLASS_RE = /^[A-Za-z_\\][A-Za-z0-9_\\]{0,399}$/;
const PROJECTION_NODE_TYPES = new Set(['NULL', 'BOOLEAN', 'NUMBER', 'STRING', 'OBJECT', 'ARRAY']);
/** Fixed pattern -> proven JSON type set mapping (mirrors the extractor
 *  decision table; the validator enforces the recipe declares exactly the
 *  mechanically derivable set). */
const PATTERN_TO_ALLOWED_TYPES: Readonly<Record<'EMPTY_CAST_OBJECT' | 'EMPTY_ARRAY_OR_STRING_KEYS', readonly string[]>> = {
  // Canonical sorted order — the same normalization the contract validator
  // applies to declared allowedTypes.
  EMPTY_CAST_OBJECT: ['OBJECT'],
  EMPTY_ARRAY_OR_STRING_KEYS: ['ARRAY', 'OBJECT'],
};

function expectRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`REAL_SOURCE_RECIPE_INVALID:${label}-not-an-object`);
  }
  return value as Record<string, unknown>;
}

function expectString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`REAL_SOURCE_RECIPE_INVALID:${label}-not-a-string`);
  }
  return value;
}

function expectBoundedString(value: unknown, label: string, max: number, re?: RegExp): string {
  const text = expectString(value, label);
  if (text.length > max) throw new Error(`REAL_SOURCE_RECIPE_INVALID:${label}-too-long`);
  if (re !== undefined && !re.test(text)) throw new Error(`REAL_SOURCE_RECIPE_INVALID:${label}-malformed`);
  return text;
}

function expectId(value: unknown, label: string): string {
  return expectBoundedString(value, label, MAX_ID_LENGTH, ID_RE);
}

function assertNoUnknownFields(record: Record<string, unknown>, allowed: ReadonlySet<string>, label: string): void {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) throw new Error(`REAL_SOURCE_RECIPE_INVALID:${label}-unknown-field:${key}`);
  }
}

/** Repository-relative path: never absolute, no traversal, no backslash. */
function expectSourcePath(value: unknown, label: string): string {
  const text = expectBoundedString(value, label, 400);
  if (text.startsWith('/') || text.includes('..') || text.includes('\\')) {
    throw new Error(`REAL_SOURCE_RECIPE_INVALID:${label}-escape`);
  }
  if (!text.includes('.')) throw new Error(`REAL_SOURCE_RECIPE_INVALID:${label}-no-extension`);
  return text;
}

function expectStringList(value: unknown, label: string, max: number, itemMax: number): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > max) {
    throw new Error(`REAL_SOURCE_RECIPE_INVALID:${label}-unbounded`);
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < value.length; i++) {
    const item = expectBoundedString(value[i], `${label}[${i}]`, itemMax);
    if (seen.has(item)) throw new Error(`REAL_SOURCE_RECIPE_INVALID:${label}-duplicate:${item}`);
    seen.add(item);
    out.push(item);
  }
  return out;
}

function validatePhpFunctionListRowKeys(value: unknown): ExtractorParams {
  const record = expectRecord(value, 'extractor');
  const symbol = expectBoundedString(record['symbol'], 'extractor.symbol', MAX_SYMBOL_LENGTH, SYMBOL_RE);
  const accumulator = expectBoundedString(record['accumulator'], 'extractor.accumulator', 64, /^[A-Za-z_][A-Za-z0-9_]{0,63}$/);
  const pattern = expectString(record['pattern'], 'extractor.pattern');
  if (pattern !== 'PUSH' && pattern !== 'ASSIGN') throw new Error('REAL_SOURCE_RECIPE_INVALID:extractor.pattern-unsupported');
  assertNoUnknownFields(record, new Set(['kind', 'symbol', 'accumulator', 'pattern']), 'extractor');
  return { kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol, accumulator, pattern };
}

function validatePhpFunctionReturnsListOfBuilder(value: unknown): ExtractorParams {
  const record = expectRecord(value, 'extractor');
  const symbol = expectBoundedString(record['symbol'], 'extractor.symbol', MAX_SYMBOL_LENGTH, SYMBOL_RE);
  const accumulator = expectBoundedString(record['accumulator'], 'extractor.accumulator', 64, /^[A-Za-z_][A-Za-z0-9_]{0,63}$/);
  const builderSymbol = expectBoundedString(record['builderSymbol'], 'extractor.builderSymbol', MAX_SYMBOL_LENGTH, SYMBOL_RE);
  assertNoUnknownFields(record, new Set(['kind', 'symbol', 'accumulator', 'builderSymbol']), 'extractor');
  return { kind: 'PHP_FUNCTION_RETURNS_LIST_OF_BUILDER', symbol, accumulator, builderSymbol };
}

function validatePhpRouteGetBinding(value: unknown): ExtractorParams {
  const record = expectRecord(value, 'extractor');
  const routePath = expectBoundedString(record['routePath'], 'extractor.routePath', 400);
  if (!routePath.startsWith('/')) throw new Error('REAL_SOURCE_RECIPE_INVALID:extractor.routePath-not-a-path');
  if (routePath.includes('..')) throw new Error('REAL_SOURCE_RECIPE_INVALID:extractor.routePath-escape');
  const client = expectBoundedString(record['client'], 'extractor.client', 400, CLASS_RE);
  const method = expectBoundedString(record['method'], 'extractor.method', MAX_SYMBOL_LENGTH, SYMBOL_RE);
  assertNoUnknownFields(record, new Set(['kind', 'routePath', 'client', 'method']), 'extractor');
  return { kind: 'PHP_ROUTE_GET_BINDING', routePath, client, method };
}

function validatePhpItemFieldTypeFlow(value: unknown): ExtractorParams {
  const record = expectRecord(value, 'extractor');
  const symbol = expectBoundedString(record['symbol'], 'extractor.symbol', MAX_SYMBOL_LENGTH, SYMBOL_RE);
  const fieldVariable = expectBoundedString(record['fieldVariable'], 'extractor.fieldVariable', 64, /^[A-Za-z_][A-Za-z0-9_]{0,63}$/);
  const pattern = expectString(record['pattern'], 'extractor.pattern');
  if (pattern !== 'EMPTY_CAST_OBJECT' && pattern !== 'EMPTY_ARRAY_OR_STRING_KEYS') {
    throw new Error('REAL_SOURCE_RECIPE_INVALID:extractor.pattern-unsupported');
  }
  assertNoUnknownFields(record, new Set(['kind', 'symbol', 'fieldVariable', 'pattern']), 'extractor');
  return { kind: 'PHP_ITEM_FIELD_TYPE_FLOW', symbol, fieldVariable, pattern };
}

function validateItemFieldTypeContract(value: unknown, index: number): RealSourceItemFieldTypeContract {
  const record = expectRecord(value, `itemFieldTypeContracts[${index}]`);
  const field = expectBoundedString(record['field'], `itemFieldTypeContracts[${index}].field`, MAX_RECIPE_PATH_SEGMENT_LENGTH);
  const itemIndex = record['itemIndex'];
  if (typeof itemIndex !== 'number' || !Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex > 999) {
    throw new Error(`REAL_SOURCE_RECIPE_INVALID:itemFieldTypeContracts[${index}].itemIndex-out-of-range`);
  }
  const allowedTypes = record['allowedTypes'];
  if (!Array.isArray(allowedTypes) || allowedTypes.length === 0 || allowedTypes.length > MAX_TYPE_SET_SIZE) {
    throw new Error(`REAL_SOURCE_RECIPE_INVALID:itemFieldTypeContracts[${index}].allowedTypes-unbounded`);
  }
  const seen = new Set<string>();
  for (let i = 0; i < allowedTypes.length; i++) {
    const type = expectBoundedString(allowedTypes[i], `itemFieldTypeContracts[${index}].allowedTypes[${i}]`, 32);
    if (!PROJECTION_NODE_TYPES.has(type)) {
      throw new Error(`REAL_SOURCE_RECIPE_INVALID:itemFieldTypeContracts[${index}].allowedTypes-unsupported:${type}`);
    }
    if (seen.has(type)) {
      throw new Error(`REAL_SOURCE_RECIPE_INVALID:itemFieldTypeContracts[${index}].allowedTypes-duplicate:${type}`);
    }
    seen.add(type);
  }
  const canonical = [...seen].sort() as ('NULL' | 'BOOLEAN' | 'NUMBER' | 'STRING' | 'OBJECT' | 'ARRAY')[];
  assertNoUnknownFields(record, new Set(['field', 'itemIndex', 'allowedTypes']), `itemFieldTypeContracts[${index}]`);
  return { field, itemIndex, allowedTypes: canonical };
}

function validateContract(value: unknown): RealSourceContract {
  const record = expectRecord(value, 'expectedContract');
  const topLevel = expectString(record['topLevel'], 'expectedContract.topLevel');
  if (topLevel !== 'ARRAY') throw new Error('REAL_SOURCE_RECIPE_INVALID:expectedContract.topLevel-unsupported');
  const requiredItemKeys = expectStringList(
    record['requiredItemKeys'],
    'expectedContract.requiredItemKeys',
    MAX_RECIPE_ITEM_KEYS,
    MAX_RECIPE_PATH_SEGMENT_LENGTH,
  );
  assertNoUnknownFields(record, new Set(['topLevel', 'requiredItemKeys']), 'expectedContract');
  return { topLevel, requiredItemKeys };
}

function validateBlueprint(value: unknown): RealSourceExpectationBlueprint {
  const record = expectRecord(value, 'blueprint');
  const expectationId = expectId(record['expectationId'], 'blueprint.expectationId');
  const limitsRecord = expectRecord(record['projectionContractLimits'], 'blueprint.projectionContractLimits');
  const allowedLimits = new Set(['maxDepth', 'maxFieldsPerObject', 'maxArrayItemsInspected', 'maxProjectionNodes', 'maxIdentityTokens', 'maxNumericRefs', 'maxRawInputBytes']);
  const projectionContractLimits: Record<string, number> = {};
  for (const key of Object.keys(limitsRecord)) {
    if (!allowedLimits.has(key)) throw new Error(`REAL_SOURCE_RECIPE_INVALID:blueprint.projectionContractLimits-unknown-field:${key}`);
    const value = limitsRecord[key];
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      throw new Error(`REAL_SOURCE_RECIPE_INVALID:blueprint.projectionContractLimits.${key}-invalid`);
    }
    projectionContractLimits[key] = value;
  }
  const rootType = expectString(record['rootType'], 'blueprint.rootType');
  if (rootType !== 'ARRAY') throw new Error('REAL_SOURCE_RECIPE_INVALID:blueprint.rootType-unsupported');
  const itemIndex = record['itemIndex'];
  if (typeof itemIndex !== 'number' || !Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex > 999) {
    throw new Error('REAL_SOURCE_RECIPE_INVALID:blueprint.itemIndex-out-of-range');
  }
  const itemFieldPaths = expectStringList(
    record['itemFieldPaths'],
    'blueprint.itemFieldPaths',
    MAX_RECIPE_FIELD_PATHS,
    MAX_RECIPE_PATH_SEGMENT_LENGTH,
  );
  assertNoUnknownFields(
    record,
    new Set(['expectationId', 'projectionContractLimits', 'rootType', 'itemIndex', 'itemFieldPaths']),
    'blueprint',
  );
  return { expectationId, projectionContractLimits, rootType, itemIndex, itemFieldPaths };
}

export function validateRealSourceRecipe(value: unknown): RealSourceExpectationRecipe {
  const record = expectRecord(value, 'recipe');
  const schemaVersion = expectString(record['schemaVersion'], 'schemaVersion');
  if (schemaVersion !== REAL_SOURCE_EXPECTATION_RECIPE_VERSION && schemaVersion !== REAL_SOURCE_EXPECTATION_RECIPE_VERSION_V2) {
    throw new Error(`REAL_SOURCE_RECIPE_INVALID:schemaVersion-unsupported:${schemaVersion}`);
  }
  const isV2 = schemaVersion === REAL_SOURCE_EXPECTATION_RECIPE_VERSION_V2;
  const recipeId = expectId(record['recipeId'], 'recipeId');
  const targetId = expectId(record['targetId'], 'targetId');
  const repoId = expectBoundedString(record['repoId'], 'repoId', MAX_ID_LENGTH, ID_RE);
  const sourcePaths = expectStringList(record['sourcePaths'], 'sourcePaths', MAX_RECIPE_SOURCE_PATHS, 400);
  for (let i = 0; i < sourcePaths.length; i++) {
    sourcePaths[i] = expectSourcePath(sourcePaths[i], `sourcePaths[${i}]`);
  }
  const extractorValues = record['extractors'];
  if (!Array.isArray(extractorValues) || extractorValues.length === 0 || extractorValues.length > MAX_RECIPE_EXTRACTORS) {
    throw new Error('REAL_SOURCE_RECIPE_INVALID:extractors-unbounded');
  }
  const extractors: ExtractorParams[] = [];
  const seenKinds = new Set<string>();
  for (let i = 0; i < extractorValues.length; i++) {
    const extractorValue = expectRecord(extractorValues[i], `extractors[${i}]`);
    const extractorKind = expectString(extractorValue['kind'], `extractors[${i}].kind`);
    if (seenKinds.has(extractorKind)) {
      throw new Error(`REAL_SOURCE_RECIPE_INVALID:extractors[${i}].kind-duplicate:${extractorKind}`);
    }
    seenKinds.add(extractorKind);
    let extractor: ExtractorParams;
    switch (extractorKind) {
      case 'PHP_FUNCTION_LIST_ROW_KEYS':
        extractor = validatePhpFunctionListRowKeys(extractorValue);
        break;
      case 'PHP_FUNCTION_RETURNS_LIST_OF_BUILDER':
        extractor = validatePhpFunctionReturnsListOfBuilder(extractorValue);
        break;
      case 'PHP_ROUTE_GET_BINDING':
        extractor = validatePhpRouteGetBinding(extractorValue);
        break;
      case 'PHP_ITEM_FIELD_TYPE_FLOW':
        extractor = validatePhpItemFieldTypeFlow(extractorValue);
        break;
      default:
        throw new Error(`REAL_SOURCE_RECIPE_INVALID:extractors[${i}].kind-unsupported:${extractorKind}`);
    }
    extractors.push(extractor);
  }
  const expectedContract = validateContract(record['expectedContract']);
  const blueprint = validateBlueprint(record['blueprint']);
  const allowedRecipeFields = new Set([
    'schemaVersion', 'recipeId', 'targetId', 'repoId', 'sourcePaths', 'extractors',
    'expectedContract', 'blueprint',
  ]);
  let itemFieldTypeContracts: RealSourceItemFieldTypeContract[] = [];
  if (isV2) {
    const contractValues = record['itemFieldTypeContracts'];
    if (!Array.isArray(contractValues) || contractValues.length === 0 || contractValues.length > MAX_ITEM_FIELD_TYPE_CONTRACTS) {
      throw new Error('REAL_SOURCE_RECIPE_INVALID:itemFieldTypeContracts-unbounded');
    }
    itemFieldTypeContracts = contractValues.map((c, i) => validateItemFieldTypeContract(c, i));
    const contractFields = new Set<string>();
    for (const contract of itemFieldTypeContracts) {
      if (contractFields.has(contract.field)) {
        throw new Error(`REAL_SOURCE_RECIPE_INVALID:itemFieldTypeContracts-duplicate-field:${contract.field}`);
      }
      contractFields.add(contract.field);
    }
    allowedRecipeFields.add('itemFieldTypeContracts');
  }
  assertNoUnknownFields(record, allowedRecipeFields, 'recipe');

  // Unsupported language/extractor pairing: the route binding extractor
  // requires a Routing.yaml source path; the row-keys / builder-list
  // extractors require a PHP handler path.
  const hasRoutingYaml = sourcePaths.some((p) => p.endsWith('Routing.yaml'));
  const hasPhpHandler = sourcePaths.some((p) => p.endsWith('.php'));
  for (const extractor of extractors) {
    if (extractor.kind === 'PHP_ROUTE_GET_BINDING' && !hasRoutingYaml) {
      throw new Error('REAL_SOURCE_RECIPE_INVALID:route-binding-without-routing-yaml');
    }
    if (
      (extractor.kind === 'PHP_FUNCTION_LIST_ROW_KEYS' ||
        extractor.kind === 'PHP_FUNCTION_RETURNS_LIST_OF_BUILDER' ||
        extractor.kind === 'PHP_ITEM_FIELD_TYPE_FLOW') &&
      !hasPhpHandler
    ) {
      throw new Error('REAL_SOURCE_RECIPE_INVALID:row-keys-without-php-handler');
    }
  }

  // Blueprint/contract consistency: every item field must be a member of the
  // source-established key set (the expectation never asserts a field the
  // source contract does not carry), and the key set must be non-empty.
  if (expectedContract.requiredItemKeys.length === 0) {
    throw new Error('REAL_SOURCE_RECIPE_INVALID:expectedContract.requiredItemKeys-empty');
  }
  const keySet = new Set(expectedContract.requiredItemKeys);
  for (const field of blueprint.itemFieldPaths) {
    if (!keySet.has(field)) {
      throw new Error(`REAL_SOURCE_RECIPE_INVALID:blueprint.itemFieldPaths-not-in-contract:${field}`);
    }
  }

  // Top-level ARRAY must be proven by at least one list-bearing extractor.
  const provesTopLevelArray = extractors.some(
    (extractor) =>
      (extractor.kind === 'PHP_FUNCTION_LIST_ROW_KEYS' && extractor.pattern === 'PUSH') ||
      extractor.kind === 'PHP_FUNCTION_RETURNS_LIST_OF_BUILDER',
  );
  if (!provesTopLevelArray) {
    throw new Error('REAL_SOURCE_RECIPE_INVALID:top-level-array-unproven');
  }

  // Phase 10A deep-contract consistency (v2 only):
  // 1. every type-contract field must be a member of the source-established
  //    row key set AND of the blueprint item field paths (the expectation
  //    never asserts a field the source contract does not carry);
  // 2. every type contract must have EXACTLY ONE matching type-flow
  //    extractor (fieldVariable == field) whose fixed pattern proves exactly
  //    the declared allowedTypes (no weaker/stronger claim).
  if (isV2) {
    for (const contract of itemFieldTypeContracts) {
      if (!keySet.has(contract.field)) {
        throw new Error(`REAL_SOURCE_RECIPE_INVALID:itemFieldTypeContracts-field-not-in-contract:${contract.field}`);
      }
      if (!blueprint.itemFieldPaths.includes(contract.field)) {
        throw new Error(`REAL_SOURCE_RECIPE_INVALID:itemFieldTypeContracts-field-not-in-blueprint:${contract.field}`);
      }
      const matching = extractors.filter(
        (extractor): extractor is Extract<ExtractorParams, { kind: 'PHP_ITEM_FIELD_TYPE_FLOW' }> =>
          extractor.kind === 'PHP_ITEM_FIELD_TYPE_FLOW' && extractor.fieldVariable === contract.field,
      );
      if (matching.length !== 1) {
        throw new Error(`REAL_SOURCE_RECIPE_INVALID:itemFieldTypeContracts-missing-type-flow-extractor:${contract.field}`);
      }
      const proven = PATTERN_TO_ALLOWED_TYPES[matching[0]!.pattern];
      const declared = [...contract.allowedTypes].sort();
      if (proven.length !== declared.length || proven.some((type, i) => type !== declared[i])) {
        throw new Error(`REAL_SOURCE_RECIPE_INVALID:itemFieldTypeContracts-type-set-mismatch:${contract.field}`);
      }
    }
    // Every type-flow extractor must back a declared contract (no orphan
    // evidence).
    for (const extractor of extractors) {
      if (extractor.kind === 'PHP_ITEM_FIELD_TYPE_FLOW' && !itemFieldTypeContracts.some((c) => c.field === extractor.fieldVariable)) {
        throw new Error(`REAL_SOURCE_RECIPE_INVALID:type-flow-extractor-without-contract:${extractor.fieldVariable}`);
      }
    }
  }

  return isV2
    ? { schemaVersion, recipeId, targetId, repoId, sourcePaths, extractors, expectedContract, blueprint, itemFieldTypeContracts }
    : { schemaVersion, recipeId, targetId, repoId, sourcePaths, extractors, expectedContract, blueprint };
}

/** Batch validation: rejects duplicate recipe IDs. */
export function validateRealSourceRecipeBatch(values: readonly unknown[]): RealSourceExpectationRecipe[] {
  const seen = new Set<string>();
  const out: RealSourceExpectationRecipe[] = [];
  for (const value of values) {
    const recipe = validateRealSourceRecipe(value);
    if (seen.has(recipe.recipeId)) {
      throw new Error(`REAL_SOURCE_RECIPE_INVALID:duplicate-recipe-id:${recipe.recipeId}`);
    }
    seen.add(recipe.recipeId);
    out.push(recipe);
  }
  return out;
}
