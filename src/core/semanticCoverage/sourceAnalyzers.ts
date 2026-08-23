// Phase 20 — bounded syntax-aware source analyzers.
//
// This module expands the existing Phase 9–14 PHP analyzer without turning
// source inspection into a generic parser. Each positive pattern is fixed,
// bounded, and emits a safe structural shape. Anything outside those patterns
// is rejected with a stable reason; source text never enters a result DTO.

import {
  analyzeContract,
  analyzerEvidenceDigest,
  type AnalyzerFact,
  type ContractAnalysis,
} from "../../oracles/expectations/extract/analyzer";
import {
  CONTRACT_BEHAVIOR_CLASSES,
  CONTRACT_DISCOVERY_VERSION,
  sourceEvidenceDigest,
  type ContractBehaviorClass,
  type DiscoveredContractShape,
  type DiscoveryRejectionCode,
  type JsonTypeCategory,
  type ObservationSurfaceKind,
  type SourceArtifactInput,
  type SourceLanguage,
} from "./types";

export const SEMANTIC_SOURCE_ANALYZER_VERSION = "nightwatch.semantic-source-analyzers.v1" as const;
export const MAX_ANALYZER_SOURCE_CHARS = 2_000_000;
export const MAX_ANALYZER_OUTPUTS = 256;

export type SourceAnalyzerHint =
  | { readonly kind: "PHP_ROW_KEYS"; readonly accumulator: string; readonly pattern: "PUSH" | "ASSIGN" }
  | { readonly kind: "PHP_FIELD_TYPE"; readonly fieldVariable: string; readonly pattern: "EMPTY_CAST_OBJECT" | "EMPTY_ARRAY_OR_STRING_KEYS" }
  | { readonly kind: "PHP_BRANCH_TYPES"; readonly fieldVariable: string }
  | { readonly kind: "PHP_ENVELOPE_FIELDS"; readonly accumulator: string; readonly requiredFields: readonly string[] }
  | { readonly kind: "PHP_PAGINATION" };

export interface SourceAnalyzerArtifact extends SourceArtifactInput {
  readonly hints?: readonly SourceAnalyzerHint[];
}

export interface AnalyzerObservation {
  readonly analyzerId: string;
  readonly analyzerVersion: typeof SEMANTIC_SOURCE_ANALYZER_VERSION;
  readonly language: SourceLanguage;
  readonly symbol: string | null;
  readonly status: "MECHANICALLY_PROVABLE" | "REJECTED";
  readonly behaviorClass: ContractBehaviorClass | null;
  readonly shape: DiscoveredContractShape | null;
  readonly rejectionCode: DiscoveryRejectionCode | null;
  readonly rejectionDetail: string | null;
  readonly evidenceDigest: string;
  readonly observationSurfaces: readonly ObservationSurfaceKind[];
}

function invalid(reason: string): never {
  throw new Error(`SEMANTIC_SOURCE_ANALYZER_INVALID:${reason}`);
}

const SAFE_NAME_RE = /^[A-Za-z][A-Za-z0-9_.-]{0,96}$/;
const SAFE_REPO_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
const SAFE_SYMBOL_RE = /^[A-Za-z_][A-Za-z0-9_:$-]{0,159}$/;
const SAFE_SHA_RE = /^[0-9a-f]{40}$/;
const SAFE_PATH_SEGMENT_RE = /^[A-Za-z][A-Za-z0-9_.-]{0,96}$/;
const KNOWN_TYPES: readonly JsonTypeCategory[] = ["NULL", "BOOLEAN", "NUMBER", "STRING", "OBJECT", "ARRAY"];

function safeName(value: string, label: string): string {
  if (!SAFE_NAME_RE.test(value)) invalid(`${label}_UNSAFE`);
  return value;
}

function safeSymbol(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (!SAFE_SYMBOL_RE.test(value)) invalid("SYMBOL_UNSAFE");
  return value;
}

function safePath(value: string, label = "PATH"): readonly string[] {
  const parts = value.split(".");
  if (parts.length === 0 || parts.length > 16 || parts.some((part) => !SAFE_PATH_SEGMENT_RE.test(part))) invalid(`${label}_UNSAFE`);
  return parts;
}

function jsonType(value: string): JsonTypeCategory | null {
  const normalized = value.toUpperCase();
  return (KNOWN_TYPES as readonly string[]).includes(normalized) ? normalized as JsonTypeCategory : null;
}

function normalizeSurfaces(values: readonly ObservationSurfaceKind[]): readonly ObservationSurfaceKind[] {
  if (!Array.isArray(values) || values.length > 8) invalid("SURFACES");
  const allowed: readonly ObservationSurfaceKind[] = ["API", "BROWSER", "REPLAY", "SYNTHETIC"];
  if (values.some((value) => !allowed.includes(value))) invalid("SURFACE");
  return [...new Set(values)].sort();
}

function evidence(input: {
  readonly analyzerId: string;
  readonly language: SourceLanguage;
  readonly symbol: string | null;
  readonly status: AnalyzerObservation["status"];
  readonly behaviorClass: ContractBehaviorClass | null;
  readonly shape: DiscoveredContractShape | null;
  readonly rejectionCode: DiscoveryRejectionCode | null;
  readonly rejectionDetail: string | null;
}): string {
  return sourceEvidenceDigest({
    schemaVersion: CONTRACT_DISCOVERY_VERSION,
    analyzerVersion: SEMANTIC_SOURCE_ANALYZER_VERSION,
    ...input,
  });
}

function proven(input: {
  readonly analyzerId: string;
  readonly language: SourceLanguage;
  readonly symbol: string | null;
  readonly behaviorClass: ContractBehaviorClass;
  readonly shape: DiscoveredContractShape;
  readonly surfaces: readonly ObservationSurfaceKind[];
}): AnalyzerObservation {
  const base = {
    analyzerId: input.analyzerId,
    analyzerVersion: SEMANTIC_SOURCE_ANALYZER_VERSION,
    language: input.language,
    symbol: input.symbol,
    status: "MECHANICALLY_PROVABLE" as const,
    behaviorClass: input.behaviorClass,
    shape: input.shape,
    rejectionCode: null,
    rejectionDetail: null,
  };
  return { ...base, evidenceDigest: evidence(base), observationSurfaces: normalizeSurfaces(input.surfaces) };
}

function rejected(input: {
  readonly analyzerId: string;
  readonly language: SourceLanguage;
  readonly symbol: string | null;
  readonly code: DiscoveryRejectionCode;
  readonly detail?: string;
  readonly surfaces: readonly ObservationSurfaceKind[];
}): AnalyzerObservation {
  const base = {
    analyzerId: input.analyzerId,
    analyzerVersion: SEMANTIC_SOURCE_ANALYZER_VERSION,
    language: input.language,
    symbol: input.symbol,
    status: "REJECTED" as const,
    behaviorClass: null,
    shape: null,
    rejectionCode: input.code,
    rejectionDetail: input.detail ?? null,
  };
  return { ...base, evidenceDigest: evidence(base), observationSurfaces: normalizeSurfaces(input.surfaces) };
}

function fromExistingAnalysis(input: {
  readonly analysis: ContractAnalysis;
  readonly language: SourceLanguage;
  readonly symbol: string | null;
  readonly analyzerId: string;
  readonly surfaces: readonly ObservationSurfaceKind[];
  readonly requested: ContractBehaviorClass;
}): AnalyzerObservation {
  const { analysis } = input;
  if (analysis.status !== "PROVEN") {
    const mapped: DiscoveryRejectionCode = analysis.blockerCode === "DYNAMIC_KEY_FLOW"
      ? "DYNAMIC_KEY_FLOW"
      : analysis.blockerCode === "RUNTIME_VALUE_TYPE_UNPROVEN"
        ? "RUNTIME_VALUE_UNPROVEN"
        : analysis.blockerCode === "BRANCH_SET_INCOMPLETE"
          ? "BRANCH_SET_INCOMPLETE"
          : analysis.blockerCode === "SOURCE_UNAVAILABLE"
            ? "SOURCE_UNAVAILABLE"
            : "UNSUPPORTED_SYNTAX";
    return rejected({ analyzerId: input.analyzerId, language: input.language, symbol: input.symbol, code: mapped, detail: analysis.blockerCode ?? undefined, surfaces: input.surfaces });
  }
  const facts: readonly AnalyzerFact[] = analysis.facts;
  const first = facts[0];
  if (first === undefined) return rejected({ analyzerId: input.analyzerId, language: input.language, symbol: input.symbol, code: "UNSUPPORTED_SYNTAX", detail: "empty-proof", surfaces: input.surfaces });
  let shape: DiscoveredContractShape | null = null;
  let behavior = input.requested;
  if (first.itemKeys !== undefined && input.requested === "REQUIRED_FIELD") {
    const fields = [...new Set(first.itemKeys)].sort();
    shape = { kind: "FIELD_SET", fields, requiredFields: fields, optionalFields: [] };
  } else if (first.fieldName !== undefined && first.allowedTypes !== undefined) {
    const allowedTypes = [...new Set(first.allowedTypes.map(jsonType).filter((value): value is JsonTypeCategory => value !== null))].sort();
    if (allowedTypes.length === 0) return rejected({ analyzerId: input.analyzerId, language: input.language, symbol: input.symbol, code: "RUNTIME_VALUE_UNPROVEN", detail: "unknown-json-type", surfaces: input.surfaces });
    shape = { kind: "FIELD_TYPE", field: safeName(first.fieldName, "FIELD"), allowedTypes };
    behavior = "FIELD_TYPE";
  } else if (first.cardinality !== undefined) {
    shape = { kind: "PAGINATION", collectionPath: ["items"], pageSize: first.cardinality, orderingPath: null };
    behavior = "PAGINATION";
  }
  if (shape === null) return rejected({ analyzerId: input.analyzerId, language: input.language, symbol: input.symbol, code: "UNSUPPORTED_SYNTAX", detail: "proof-shape-unmapped", surfaces: input.surfaces });
  return proven({ analyzerId: input.analyzerId, language: input.language, symbol: input.symbol, behaviorClass: behavior, shape, surfaces: input.surfaces });
}

function parseLiteralType(value: string): JsonTypeCategory | null {
  const trimmed = value.trim();
  if (trimmed === "null") return "NULL";
  if (trimmed === "true" || trimmed === "false") return "BOOLEAN";
  if (/^-?[0-9]+(?:\.[0-9]+)?$/.test(trimmed)) return "NUMBER";
  if (/^(?:'[^'\\\n]{0,160}'|\"[^\"\\\n]{0,160}\")$/.test(trimmed)) return "STRING";
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) return "ARRAY";
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return "OBJECT";
  return null;
}

function commaSeparatedLiterals(value: string): readonly string[] | null {
  const pieces = value.split(",").map((piece) => piece.trim()).filter((piece) => piece.length > 0);
  if (pieces.length === 0 || pieces.length > 32 || pieces.some((piece) => parseLiteralType(piece) === null)) return null;
  return pieces;
}

function analyzeTypeScript(artifact: SourceAnalyzerArtifact): AnalyzerObservation[] {
  const text = artifact.sourceText;
  const surfaces = artifact.observationSurfaces;
  const out: AnalyzerObservation[] = [];
  const requiredMatches = [...text.matchAll(/required\s*:\s*\[([^\]]{1,2048})\]/g)];
  for (const match of requiredMatches) {
    const values = commaSeparatedLiterals(match[1] ?? "");
    if (values === null || values.some((value) => !/^['\"][A-Za-z][A-Za-z0-9_.-]{0,96}['\"]$/.test(value))) {
      out.push(rejected({ analyzerId: "TS_STATIC_REQUIRED_FIELDS", language: artifact.language, symbol: safeSymbol(artifact.symbol), code: "MALFORMED_STATIC_SCHEMA", detail: "required-array", surfaces }));
      continue;
    }
    const fields = values.map((value) => value.slice(1, -1)).sort();
    out.push(proven({ analyzerId: "TS_STATIC_REQUIRED_FIELDS", language: artifact.language, symbol: safeSymbol(artifact.symbol), behaviorClass: "REQUIRED_FIELD", shape: { kind: "FIELD_SET", fields, requiredFields: fields, optionalFields: [] }, surfaces }));
  }

  const enumMatches = [...text.matchAll(/([A-Za-z][A-Za-z0-9_.-]{0,96})\s*:\s*\{\s*enum\s*:\s*\[([^\]]{1,4096})\]/g)];
  for (const match of enumMatches) {
    const field = safeName(match[1] ?? "", "FIELD");
    const values = commaSeparatedLiterals(match[2] ?? "");
    if (values === null) {
      out.push(rejected({ analyzerId: "TS_STATIC_ENUM", language: artifact.language, symbol: safeSymbol(artifact.symbol), code: "MALFORMED_STATIC_SCHEMA", detail: "enum-array", surfaces }));
      continue;
    }
    out.push(proven({ analyzerId: "TS_STATIC_ENUM", language: artifact.language, symbol: safeSymbol(artifact.symbol), behaviorClass: "FINITE_ENUM", shape: { kind: "FINITE_ENUM", field, valueCount: values.length, valueSetDigest: sourceEvidenceDigest(values) }, surfaces }));
  }

  const defaultMatches = [...text.matchAll(/([A-Za-z][A-Za-z0-9_.-]{0,96})\s*:\s*\{\s*default\s*:\s*([^,}\n]{1,160})/g)];
  for (const match of defaultMatches) {
    const field = safeName(match[1] ?? "", "FIELD");
    const defaultType = parseLiteralType(match[2] ?? "");
    if (defaultType === null) {
      out.push(rejected({ analyzerId: "TS_STATIC_DEFAULT", language: artifact.language, symbol: safeSymbol(artifact.symbol), code: "RUNTIME_VALUE_UNPROVEN", detail: "default-expression", surfaces }));
      continue;
    }
    out.push(proven({ analyzerId: "TS_STATIC_DEFAULT", language: artifact.language, symbol: safeSymbol(artifact.symbol), behaviorClass: "DEFAULT_VALUE", shape: { kind: "DEFAULT", field, defaultType }, surfaces }));
  }

  const typeMatches = [...text.matchAll(/([A-Za-z][A-Za-z0-9_.-]{0,96})\s*:\s*\{\s*type\s*:\s*['\"](NULL|BOOLEAN|NUMBER|STRING|OBJECT|ARRAY)['\"]\s*\}/g)];
  for (const match of typeMatches) {
    const field = safeName(match[1] ?? "", "FIELD");
    const type = jsonType(match[2] ?? "");
    if (type === null) continue;
    out.push(proven({ analyzerId: "TS_STATIC_FIELD_TYPE", language: artifact.language, symbol: safeSymbol(artifact.symbol), behaviorClass: "FIELD_TYPE", shape: { kind: "FIELD_TYPE", field, allowedTypes: [type] }, surfaces }));
  }

  const rangeMatches = [...text.matchAll(/if\s*\(\s*([A-Za-z][A-Za-z0-9_.-]{0,96})\s*(<|<=|>|>=)\s*(-?[0-9]+(?:\.[0-9]+)?)\s*\|\|\s*\1\s*(<|<=|>|>=)\s*(-?[0-9]+(?:\.[0-9]+)?)\s*\)\s*\{?\s*throw\b/g)];
  for (const match of rangeMatches) {
    const field = safeName(match[1] ?? "", "FIELD");
    const leftOperator = match[2];
    const left = Number(match[3]);
    const rightOperator = match[4];
    const right = Number(match[5]);
    if (!Number.isFinite(left) || !Number.isFinite(right) || left > right || !["<", "<=", ">", ">="].includes(leftOperator ?? "") || !["<", "<=", ">", ">="].includes(rightOperator ?? "")) {
      out.push(rejected({ analyzerId: "TS_VALIDATION_RANGE", language: artifact.language, symbol: safeSymbol(artifact.symbol), code: "UNSUPPORTED_SYNTAX", detail: "range-order", surfaces }));
      continue;
    }
    out.push(proven({ analyzerId: "TS_VALIDATION_RANGE", language: artifact.language, symbol: safeSymbol(artifact.symbol), behaviorClass: "RANGE_BOUND", shape: { kind: "RANGE", field, lowerBound: left, upperBound: right, lowerInclusive: leftOperator === "<=", upperInclusive: rightOperator === ">=" }, surfaces }));
  }

  const normalizationMatches = [...text.matchAll(/([A-Za-z][A-Za-z0-9_.-]{0,96})\.trim\(\)\.(toLowerCase|toUpperCase)\(\)/g)];
  for (const match of normalizationMatches) {
    const field = safeName(match[1] ?? "", "FIELD");
    const operation = match[2] === "toLowerCase" ? "LOWERCASE" as const : "UPPERCASE" as const;
    out.push(proven({ analyzerId: "TS_NORMALIZATION_FLOW", language: artifact.language, symbol: safeSymbol(artifact.symbol), behaviorClass: "NORMALIZATION", shape: { kind: "NORMALIZATION", field, operations: ["TRIM", operation] }, surfaces }));
  }

  const sortMatches = [...text.matchAll(/([A-Za-z][A-Za-z0-9_.-]{0,96})\.sort\(\(\s*([A-Za-z][A-Za-z0-9_]*)\s*,\s*([A-Za-z][A-Za-z0-9_]*)\s*\)\s*=>\s*\2\.([A-Za-z][A-Za-z0-9_.-]*)\s*-\s*\3\.\4\s*\)/g)];
  for (const match of sortMatches) {
    const collectionPath = safePath(match[1] ?? "", "COLLECTION");
    const itemField = safePath(match[4] ?? "", "ITEM_FIELD");
    out.push(proven({ analyzerId: "TS_SORT_ORDER", language: artifact.language, symbol: safeSymbol(artifact.symbol), behaviorClass: "SORT_ORDER", shape: { kind: "SORT_ORDER", collectionPath, itemField, direction: "ASCENDING" }, surfaces }));
  }

  const reduceMatches = [...text.matchAll(/([A-Za-z][A-Za-z0-9_.-]{0,96})\.reduce\(\(\s*([A-Za-z][A-Za-z0-9_]*)\s*,\s*([A-Za-z][A-Za-z0-9_]*)\s*\)\s*=>\s*\2\s*\+\s*\3\.([A-Za-z][A-Za-z0-9_.-]*)\s*,\s*0\s*\)/g)];
  for (const match of reduceMatches) {
    out.push(proven({ analyzerId: "TS_AGGREGATION_FLOW", language: artifact.language, symbol: safeSymbol(artifact.symbol), behaviorClass: "AGGREGATION", shape: { kind: "AGGREGATION", collectionPath: safePath(match[1] ?? "", "COLLECTION"), numericFieldPath: safePath(match[4] ?? "", "NUMERIC_FIELD"), scalarPath: ["total"], operation: "SUM" }, surfaces }));
  }

  const presenceMatches = [...text.matchAll(/if\s*\(\s*(!?)([A-Za-z][A-Za-z0-9_.-]{0,96})\s*&&\s*(!?)([A-Za-z][A-Za-z0-9_.-]{0,96})\s*\)\s*\{?\s*throw\b/g)];
  for (const match of presenceMatches) {
    const left = safePath(match[2] ?? "", "CONDITION");
    const right = safePath(match[4] ?? "", "TARGET");
    const inverted = (match[1] ?? "") === "!";
    const targetInverted = (match[3] ?? "") === "!";
    if (inverted === targetInverted) {
      out.push(rejected({ analyzerId: "TS_PRESENCE_RELATION", language: artifact.language, symbol: safeSymbol(artifact.symbol), code: "RELATION_PROOF_MISSING", detail: "non-conditional-presence", surfaces }));
    } else {
      out.push(proven({ analyzerId: "TS_PRESENCE_RELATION", language: artifact.language, symbol: safeSymbol(artifact.symbol), behaviorClass: "FIELD_PRESENCE_RELATION", shape: { kind: "PRESENCE_RELATION", conditionPath: left, targetPath: right, conditionExpected: !inverted }, surfaces }));
    }
  }

  const filterMatches = [...text.matchAll(/([A-Za-z][A-Za-z0-9_.-]{0,96})\.filter\(\(\s*([A-Za-z][A-Za-z0-9_]*)\s*\)\s*=>\s*\2\.([A-Za-z][A-Za-z0-9_.-]*)\s*\)/g)];
  for (const match of filterMatches) {
    out.push(proven({ analyzerId: "TS_FILTERING_FLOW", language: artifact.language, symbol: safeSymbol(artifact.symbol), behaviorClass: "FILTERING", shape: { kind: "FILTERING", collectionPath: safePath(match[1] ?? "", "COLLECTION"), predicateClass: "FIELD_PRESENT" }, surfaces }));
  }

  return out;
}

function analyzeGo(artifact: SourceAnalyzerArtifact): AnalyzerObservation[] {
  const surfaces = artifact.observationSurfaces;
  const match = /type\s+[A-Za-z][A-Za-z0-9_]*\s+struct\s*\{([\s\S]{1,20000})\}/m.exec(artifact.sourceText);
  if (match === null) return [rejected({ analyzerId: "GO_STRUCT_TAGS", language: "GO", symbol: safeSymbol(artifact.symbol), code: "UNSUPPORTED_SYNTAX", detail: "struct-shape", surfaces })];
  const fields: string[] = [];
  const required: string[] = [];
  const optional: string[] = [];
  const types: AnalyzerObservation[] = [];
  const lines = (match[1] ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const field = /^([A-Z][A-Za-z0-9_]*)\s+(\*?)([A-Za-z][A-Za-z0-9_\[\]]*)\s+`json:"([A-Za-z][A-Za-z0-9_.-]{0,96})(,omitempty)?"`$/.exec(line);
    if (field === null) {
      if (line.includes("json:")) return [rejected({ analyzerId: "GO_STRUCT_TAGS", language: "GO", symbol: safeSymbol(artifact.symbol), code: "UNSUPPORTED_SYNTAX", detail: "struct-field", surfaces })];
      continue;
    }
    const name = safeName(field[4] ?? "", "FIELD");
    fields.push(name);
    if (field[2] === "" && field[5] === undefined) required.push(name); else optional.push(name);
    const mapped = field[3] === "string" ? "STRING" : field[3] === "bool" ? "BOOLEAN" : /^(?:int|uint|float)/.test(field[3] ?? "") ? "NUMBER" : field[3]?.startsWith("[]") ? "ARRAY" : "OBJECT";
    types.push(proven({ analyzerId: "GO_STRUCT_FIELD_TYPE", language: "GO", symbol: safeSymbol(artifact.symbol), behaviorClass: "FIELD_TYPE", shape: { kind: "FIELD_TYPE", field: name, allowedTypes: [mapped] }, surfaces }));
  }
  if (fields.length === 0) return [rejected({ analyzerId: "GO_STRUCT_TAGS", language: "GO", symbol: safeSymbol(artifact.symbol), code: "MALFORMED_STATIC_SCHEMA", detail: "no-json-fields", surfaces })];
  return [proven({ analyzerId: "GO_STRUCT_TAGS", language: "GO", symbol: safeSymbol(artifact.symbol), behaviorClass: required.length > 0 ? "REQUIRED_FIELD" : "OPTIONAL_FIELD", shape: { kind: "FIELD_SET", fields: [...new Set(fields)].sort(), requiredFields: [...new Set(required)].sort(), optionalFields: [...new Set(optional)].sort() }, surfaces }), ...types];
}

interface OpenApiProperty {
  readonly type?: unknown;
  readonly enum?: unknown;
  readonly minimum?: unknown;
  readonly maximum?: unknown;
  readonly exclusiveMinimum?: unknown;
  readonly exclusiveMaximum?: unknown;
  readonly default?: unknown;
}

function analyzeOpenApi(artifact: SourceAnalyzerArtifact): AnalyzerObservation[] {
  const surfaces = artifact.observationSurfaces;
  let parsed: unknown;
  try { parsed = JSON.parse(artifact.sourceText); } catch { return [rejected({ analyzerId: "OPENAPI_STATIC_SCHEMA", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), code: "MALFORMED_STATIC_SCHEMA", detail: "json", surfaces })]; }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return [rejected({ analyzerId: "OPENAPI_STATIC_SCHEMA", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), code: "MALFORMED_STATIC_SCHEMA", detail: "root", surfaces })];
  const root = parsed as Record<string, unknown>;
  const properties = root.properties;
  if (properties === null || typeof properties !== "object" || Array.isArray(properties)) return [rejected({ analyzerId: "OPENAPI_STATIC_SCHEMA", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), code: "MALFORMED_STATIC_SCHEMA", detail: "properties", surfaces })];
  const requiredValues = Array.isArray(root.required) ? root.required.filter((value): value is string => typeof value === "string") : [];
  const fields = Object.keys(properties as Record<string, unknown>).filter((value) => SAFE_NAME_RE.test(value)).sort();
  if (fields.length === 0 || fields.length !== Object.keys(properties as Record<string, unknown>).length) return [rejected({ analyzerId: "OPENAPI_STATIC_SCHEMA", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), code: "FIELD_NAME_UNSAFE", detail: "property-name", surfaces })];
  const out: AnalyzerObservation[] = [proven({ analyzerId: "OPENAPI_REQUIRED_FIELDS", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), behaviorClass: requiredValues.length > 0 ? "REQUIRED_FIELD" : "OPTIONAL_FIELD", shape: { kind: "FIELD_SET", fields, requiredFields: requiredValues.map((value) => safeName(value, "REQUIRED_FIELD")).sort(), optionalFields: fields.filter((field) => !requiredValues.includes(field)).sort() }, surfaces })];
  for (const field of fields) {
    const property = (properties as Record<string, OpenApiProperty>)[field];
    if (property === undefined || property === null || typeof property !== "object") return [rejected({ analyzerId: "OPENAPI_STATIC_SCHEMA", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), code: "MALFORMED_STATIC_SCHEMA", detail: "property-shape", surfaces })];
    if (typeof property.type === "string") {
      const type = jsonType(property.type);
      if (type === null) return [rejected({ analyzerId: "OPENAPI_STATIC_SCHEMA", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), code: "RUNTIME_VALUE_UNPROVEN", detail: "property-type", surfaces })];
      out.push(proven({ analyzerId: "OPENAPI_FIELD_TYPE", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), behaviorClass: "FIELD_TYPE", shape: { kind: "FIELD_TYPE", field, allowedTypes: [type] }, surfaces }));
    }
    if (Array.isArray(property.enum) && property.enum.length > 0 && property.enum.length <= 32) {
      out.push(proven({ analyzerId: "OPENAPI_ENUM", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), behaviorClass: "FINITE_ENUM", shape: { kind: "FINITE_ENUM", field, valueCount: property.enum.length, valueSetDigest: sourceEvidenceDigest(property.enum) }, surfaces }));
    }
    const minimum = typeof property.minimum === "number" ? property.minimum : null;
    const maximum = typeof property.maximum === "number" ? property.maximum : null;
    if (minimum !== null || maximum !== null) {
      out.push(proven({ analyzerId: "OPENAPI_RANGE", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), behaviorClass: "RANGE_BOUND", shape: { kind: "RANGE", field, lowerBound: minimum, upperBound: maximum, lowerInclusive: property.exclusiveMinimum !== true, upperInclusive: property.exclusiveMaximum !== true }, surfaces }));
    }
    if (property.default !== undefined) {
      const type = parseLiteralType(JSON.stringify(property.default));
      if (type === null) return [rejected({ analyzerId: "OPENAPI_STATIC_SCHEMA", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), code: "RUNTIME_VALUE_UNPROVEN", detail: "default", surfaces })];
      out.push(proven({ analyzerId: "OPENAPI_DEFAULT", language: "OPENAPI", symbol: safeSymbol(artifact.symbol), behaviorClass: "DEFAULT_VALUE", shape: { kind: "DEFAULT", field, defaultType: type }, surfaces }));
    }
  }
  return out;
}

function analyzePhp(artifact: SourceAnalyzerArtifact): AnalyzerObservation[] {
  const surfaces = artifact.observationSurfaces;
  const symbol = safeSymbol(artifact.symbol);
  if (symbol === null) return [rejected({ analyzerId: "PHP_FIXED_FLOW", language: "PHP", symbol, code: "SOURCE_UNAVAILABLE", detail: "symbol-required", surfaces })];
  const hints = artifact.hints ?? [
    { kind: "PHP_ROW_KEYS", accumulator: "res", pattern: "PUSH" },
    { kind: "PHP_ROW_KEYS", accumulator: "res", pattern: "ASSIGN" },
  ];
  const out: AnalyzerObservation[] = [];
  for (const hint of hints) {
    switch (hint.kind) {
      case "PHP_ROW_KEYS":
        out.push(fromExistingAnalysis({ analysis: analyzeContract({ language: "php", sourceText: artifact.sourceText, symbol, proofClass: "LITERAL_ROW_FIELD_SET", accumulator: hint.accumulator, pattern: hint.pattern }), language: "PHP", symbol, analyzerId: `PHP_ROW_KEYS_${hint.pattern}`, surfaces, requested: "REQUIRED_FIELD" }));
        break;
      case "PHP_FIELD_TYPE":
        out.push(fromExistingAnalysis({ analysis: analyzeContract({ language: "php", sourceText: artifact.sourceText, symbol, proofClass: "SCALAR_TYPE_FROM_CAST", fieldVariable: hint.fieldVariable, pattern: hint.pattern }), language: "PHP", symbol, analyzerId: "PHP_FIELD_TYPE_FLOW", surfaces, requested: "FIELD_TYPE" }));
        break;
      case "PHP_BRANCH_TYPES":
        out.push(fromExistingAnalysis({ analysis: analyzeContract({ language: "php", sourceText: artifact.sourceText, symbol, proofClass: "BRANCH_UNION_TYPE_SET", fieldVariable: hint.fieldVariable }), language: "PHP", symbol, analyzerId: "PHP_BRANCH_TYPE_FLOW", surfaces, requested: "FIELD_TYPE" }));
        break;
      case "PHP_ENVELOPE_FIELDS":
        out.push(fromExistingAnalysis({ analysis: analyzeContract({ language: "php", sourceText: artifact.sourceText, symbol, proofClass: "RETURN_ENVELOPE_FIELD_PRESENCE", accumulator: hint.accumulator, requiredFields: hint.requiredFields }), language: "PHP", symbol, analyzerId: "PHP_ENVELOPE_FIELDS", surfaces, requested: "REQUIRED_FIELD" }));
        break;
      case "PHP_PAGINATION":
        out.push(fromExistingAnalysis({ analysis: analyzeContract({ language: "php", sourceText: artifact.sourceText, symbol, proofClass: "CHUNK_ITEM_METADATA" }), language: "PHP", symbol, analyzerId: "PHP_PAGINATION_FLOW", surfaces, requested: "PAGINATION" }));
        break;
    }
  }
  return out;
}

/** Analyze one bounded source artifact with fixed syntax-aware patterns. */
export function analyzeSourceArtifact(artifact: SourceAnalyzerArtifact): readonly AnalyzerObservation[] {
  if (typeof artifact.sourceText !== "string" || artifact.sourceText.length > MAX_ANALYZER_SOURCE_CHARS) {
    return [rejected({ analyzerId: "BOUNDARY", language: artifact.language, symbol: safeSymbol(artifact.symbol), code: "SOURCE_TOO_LARGE", detail: "source-cap", surfaces: artifact.observationSurfaces })];
  }
  if (/(?:PRIVACY_SENTINEL|CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|Bearer\s+|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(artifact.sourceText)) {
    return [rejected({ analyzerId: "BOUNDARY", language: artifact.language, symbol: safeSymbol(artifact.symbol), code: "PRIVACY_UNSAFE_SOURCE", detail: "sentinel", surfaces: artifact.observationSurfaces })];
  }
  if (!SAFE_NAME_RE.test(artifact.artifactId) || !SAFE_REPO_ID_RE.test(artifact.repoId) || !SAFE_SHA_RE.test(artifact.sha) || artifact.relativePath.startsWith("/") || artifact.relativePath.includes("..")) {
    return [rejected({ analyzerId: "BOUNDARY", language: artifact.language, symbol: safeSymbol(artifact.symbol), code: "SOURCE_PATH_INVALID", detail: "provenance", surfaces: artifact.observationSurfaces })];
  }
  let output: AnalyzerObservation[];
  switch (artifact.language) {
    case "PHP": output = analyzePhp(artifact); break;
    case "TYPESCRIPT":
    case "JAVASCRIPT": output = analyzeTypeScript(artifact); break;
    case "GO": output = analyzeGo(artifact); break;
    case "OPENAPI": output = analyzeOpenApi(artifact); break;
    default: output = [rejected({ analyzerId: "BOUNDARY", language: artifact.language, symbol: safeSymbol(artifact.symbol), code: "UNSUPPORTED_LANGUAGE", surfaces: artifact.observationSurfaces })];
  }
  if (output.length === 0) output = [rejected({ analyzerId: "BOUNDARY", language: artifact.language, symbol: safeSymbol(artifact.symbol), code: "UNSUPPORTED_SYNTAX", detail: "no-fixed-pattern", surfaces: artifact.observationSurfaces })];
  if (output.length > MAX_ANALYZER_OUTPUTS) output = output.slice(0, MAX_ANALYZER_OUTPUTS);
  return output;
}

/** Stable summary used by inventory/cache callers; it never includes source. */
export function analyzerSetIdentity(): string {
  return sourceEvidenceDigest({ version: SEMANTIC_SOURCE_ANALYZER_VERSION, existing: CONTRACT_DISCOVERY_VERSION, behaviors: CONTRACT_BEHAVIOR_CLASSES });
}

/** Exposed only for tests that prove the existing analyzer is still composed. */
export function existingAnalyzerIdentity(analysis: ContractAnalysis): string {
  return analyzerEvidenceDigest(analysis);
}
