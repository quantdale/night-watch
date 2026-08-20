// ---------------------------------------------------------------------------
// Nightwatch Phase 14A — C2: bounded static-schema / generated-interface /
// proto / chunk-contract adapters (SPEC §6, FIVE_CHANGE C2).
//
// These adapters consume authoritative STATIC contract sources that are
// already inside the approved source set: generated/interface JSON schemas
// and proto message definitions. They are authority-neutral and bounded:
//
//   - no endpoint / target / route / transport authority is created;
//   - comments and names never prove transport semantics;
//   - missing generated source fails GENERATED_SCHEMA_UNAVAILABLE;
//   - ambiguous chunk framing fails TRANSPORT_CONTRACT_UNPROVEN;
//   - unsupported schema constructs (map<>, oneof, unknown types) fail closed.
//
// The generated-interface path reuses the versioned analyzer
// (extract/analyzer.ts). The proto path is a NEW bounded finite-field
// extractor. Both produce the analyzer's normalized ContractAnalysis shape so
// evidence digests and drift classification stay coherent with C1/C4.
//
// Pure module: no fs/network/child-process/browser/AI/DB/selfDev.
// ---------------------------------------------------------------------------

import {
  analyzeContract,
  analyzerEvidenceDigest,
  MECHANICAL_ANALYZER_VERSION,
  type AnalyzerBlockerCode,
  type AnalyzerFact,
  type AnalyzerProofClass,
  type ContractAnalysis,
} from "./analyzer";

const MAX_SOURCE_CHARS = 2_000_000;
const MAX_PROTO_DEPTH = 6;

// ---------------------------------------------------------------------------
// Local result constructors (mirror analyzer.ts so digests stay coherent).
// ---------------------------------------------------------------------------

function buildAnalysis(
  language: "generated-interface" | "php",
  symbol: string | null,
  status: ContractAnalysis["status"],
  proofClass: AnalyzerProofClass | null,
  facts: readonly AnalyzerFact[],
  blockerCode: AnalyzerBlockerCode | null,
): ContractAnalysis {
  const ordered = [...facts].sort((a, b) =>
    JSON.stringify(a).localeCompare(JSON.stringify(b)),
  );
  const safeEvidence = JSON.stringify({
    language,
    symbol,
    status,
    proofClass,
    facts: ordered,
    blockerCode,
  });
  return {
    analyzerVersion: MECHANICAL_ANALYZER_VERSION,
    language,
    symbol,
    status,
    proofClass,
    facts: ordered,
    blockerCode,
    safeEvidence,
  };
}

function proven(
  language: "generated-interface" | "php",
  symbol: string | null,
  proofClass: AnalyzerProofClass,
  facts: readonly AnalyzerFact[],
): ContractAnalysis {
  return buildAnalysis(language, symbol, "PROVEN", proofClass, facts, null);
}

function blocker(
  blockerCode: AnalyzerBlockerCode,
  language: "generated-interface" | "php",
  symbol: string | null,
  proofClass: AnalyzerProofClass,
  detail?: string,
): ContractAnalysis {
  const facts: AnalyzerFact[] =
    detail === undefined ? [] : [{ proofClass, detail }];
  return buildAnalysis(
    language,
    symbol,
    "AMBIGUOUS",
    proofClass,
    facts,
    blockerCode,
  );
}

function unavailable(
  blockerCode: AnalyzerBlockerCode,
  language: "generated-interface" | "php",
  symbol: string | null,
): ContractAnalysis {
  return buildAnalysis(language, symbol, "UNAVAILABLE", null, [], blockerCode);
}

// ---------------------------------------------------------------------------
// Generated-interface adapter (reuses the versioned analyzer).
// ---------------------------------------------------------------------------

/** Bounded generated/interface JSON field-shape proof. */
export function analyzeGeneratedInterfaceSchema(
  sourceText: string,
): ContractAnalysis {
  return analyzeContract({
    language: "generated-interface",
    sourceText,
    symbol: null,
    proofClass: "GENERATED_INTERFACE_FIELD_SHAPE",
  });
}

// ---------------------------------------------------------------------------
// Proto message adapter (NEW bounded finite-field extractor).
// ---------------------------------------------------------------------------

type ProtoJsonType =
  | "NULL"
  | "BOOLEAN"
  | "NUMBER"
  | "STRING"
  | "OBJECT"
  | "ARRAY";

const PROTO_SCALARS: Readonly<Record<string, ProtoJsonType>> = Object.freeze({
  string: "STRING",
  bytes: "STRING",
  bool: "BOOLEAN",
  int32: "NUMBER",
  int64: "NUMBER",
  uint32: "NUMBER",
  uint64: "NUMBER",
  sint32: "NUMBER",
  sint64: "NUMBER",
  fixed32: "NUMBER",
  fixed64: "NUMBER",
  sfixed32: "NUMBER",
  sfixed64: "NUMBER",
  float: "NUMBER",
  double: "NUMBER",
});

interface ProtoField {
  readonly name: string;
  readonly jsonType: ProtoJsonType;
  readonly repeated: boolean;
}

function stripProtoComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/#[^\n]*/g, " ")
    .replace(/\/\/[^\n]*/g, " ");
}

function collectMessageNames(text: string): Set<string> {
  const names = new Set<string>();
  const re = /\bmessage\s+([A-Za-z_][A-Za-z0-9_]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) names.add(m[1]!);
  return names;
}

function firstMessageName(text: string): string | null {
  const m = /\bmessage\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(text);
  return m ? m[1]! : null;
}

/** Extract the `{ ... }` body of `message NAME` with balanced-brace matching. */
function extractMessageBody(text: string, name: string): string | null {
  const openRe = new RegExp(
    `\\bmessage\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`,
  );
  const open = openRe.exec(text);
  if (open === null) return null;
  let i = open.index + open[0].length;
  let depth = 1;
  const start = i;
  while (i < text.length && depth > 0) {
    const c = text[i]!;
    if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i);
    }
    i += 1;
  }
  return null;
}

/** Remove whole `keyword NAME { ... }` blocks (enum/oneof/service/...) so their
 *  interior is not mistaken for top-level field declarations. */
function removeBlocks(body: string, keywords: readonly string[]): string {
  let out = body;
  for (const kw of keywords) {
    const re = new RegExp(`\\b${kw}\\s+[A-Za-z_][A-Za-z0-9_.]*\\s*\\{`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(out)) !== null) {
      let i = m.index + m[0].length;
      let depth = 1;
      while (i < out.length && depth > 0) {
        const c = out[i]!;
        if (c === "{") depth += 1;
        else if (c === "}") {
          depth -= 1;
          if (depth === 0) {
            out = out.slice(0, m.index) + " " + out.slice(i + 1);
            break;
          }
        }
        i += 1;
      }
      // Re-scan from the start after a removal (reset stale lastIndex).
      re.lastIndex = 0;
      m = re.exec(out);
      if (m === null) break;
    }
  }
  return out;
}

const FIELD_RE =
  /^\s*(repeated\s+)?([A-Za-z_][A-Za-z0-9_.]*(?:<[^>]*>)?)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\d+\s*;/gm;

function collectProtoFields(
  text: string,
  name: string,
  depth: number,
): { ok: boolean; fields: ProtoField[] } {
  if (depth > MAX_PROTO_DEPTH) return { ok: false, fields: [] };
  const body = extractMessageBody(text, name);
  if (body === null) return { ok: false, fields: [] };
  const cleaned = removeBlocks(body, [
    "enum",
    "oneof",
    "service",
    "extend",
    "group",
    "map",
  ]);
  const knownMessages = collectMessageNames(text);
  const fields: ProtoField[] = [];
  // matchAll clones FIELD_RE, so recursion cannot pollute a shared lastIndex
  // and cause the outer scan to restart (which previously looped forever).
  for (const m of cleaned.matchAll(FIELD_RE)) {
    const repeated = m[1] !== undefined;
    const type = m[2]!;
    const fieldName = m[3]!;
    const scalar = PROTO_SCALARS[type];
    if (scalar !== undefined) {
      fields.push({ name: fieldName, jsonType: scalar, repeated });
      continue;
    }
    if (type.startsWith("map<")) {
      // map<> is an associative container; not a finite scalar/known message.
      return { ok: false, fields: [] };
    }
    if (knownMessages.has(type)) {
      const sub = collectProtoFields(text, type, depth + 1);
      if (!sub.ok) return { ok: false, fields: [] };
      for (const sf of sub.fields) {
        fields.push({
          name: `${fieldName}.${sf.name}`,
          jsonType: sf.jsonType,
          repeated: sf.repeated,
        });
      }
      continue;
    }
    // Unknown type (imported, any, custom, malformed) => unsupported.
    return { ok: false, fields: [] };
  }
  return { ok: true, fields };
}

/** Bounded proto message finite-field-shape proof.
 *  Fails closed on map<>, oneof, unknown/imported types, and missing source. */
export function analyzeProtoMessageFieldShape(
  sourceText: string,
  messageName: string | null = null,
): ContractAnalysis {
  if (sourceText.length > MAX_SOURCE_CHARS)
    return unavailable("SOURCE_UNAVAILABLE", "generated-interface", null);
  let cleaned = stripProtoComments(sourceText);
  cleaned = cleaned.replace(
    /^\s*(package|import|syntax|option)\b[^\n;]*;?\s*$/gm,
    "",
  );
  // Unsupported constructs fail closed (never guessed as a field shape).
  if (/\bmap\s*</.test(cleaned))
    return blocker(
      "UNSUPPORTED_SYNTAX",
      "generated-interface",
      null,
      "GENERATED_INTERFACE_FIELD_SHAPE",
      "proto-map-unsupported",
    );
  if (/\boneof\b/.test(cleaned))
    return blocker(
      "UNSUPPORTED_SYNTAX",
      "generated-interface",
      null,
      "GENERATED_INTERFACE_FIELD_SHAPE",
      "proto-oneof-unsupported",
    );

  const target = messageName ?? firstMessageName(cleaned);
  if (target === null)
    return blocker(
      "GENERATED_SCHEMA_UNAVAILABLE",
      "generated-interface",
      null,
      "GENERATED_INTERFACE_FIELD_SHAPE",
      "no-message",
    );

  const result = collectProtoFields(cleaned, target, 0);
  if (!result.ok)
    return blocker(
      "RUNTIME_VALUE_TYPE_UNPROVEN",
      "generated-interface",
      null,
      "GENERATED_INTERFACE_FIELD_SHAPE",
      "unrecognized-proto-type",
    );
  if (result.fields.length === 0)
    return blocker(
      "GENERATED_SCHEMA_UNAVAILABLE",
      "generated-interface",
      null,
      "GENERATED_INTERFACE_FIELD_SHAPE",
      "empty-fields",
    );

  const aggregate: AnalyzerFact = {
    proofClass: "GENERATED_INTERFACE_FIELD_SHAPE",
    itemKeys: [...new Set(result.fields.map((f) => f.name))].sort(),
    allowedTypes: [...new Set(result.fields.map((f) => f.jsonType))].sort(),
  };
  const leafFacts: AnalyzerFact[] = result.fields.map((f) => ({
    proofClass: "GENERATED_INTERFACE_FIELD_SHAPE",
    itemKeys: [f.name],
    allowedTypes: [f.jsonType],
    repeated: f.repeated || undefined,
    itemTypes: f.repeated ? [f.jsonType] : undefined,
  }));
  return proven(
    "generated-interface",
    null,
    "GENERATED_INTERFACE_FIELD_SHAPE",
    [aggregate, ...leafFacts],
  );
}

// ---------------------------------------------------------------------------
// Chunk / transport contract adapter (honest: no transport authority invented).
// ---------------------------------------------------------------------------

/** A static generated/proto schema proves field shape ONLY. It NEVER proves
 *  transport / chunk / cardinality semantics, no matter what a comment, route
 *  name, or field name suggests. Fail closed explicitly. */
export function analyzeStaticSchemaChunkContract(
  _sourceText: string,
): ContractAnalysis {
  return blocker(
    "TRANSPORT_CONTRACT_UNPROVEN",
    "generated-interface",
    null,
    "CHUNK_ITEM_METADATA",
    "no-static-schema-chunk-proof",
  );
}

// ---------------------------------------------------------------------------
// Unified adapter entry point.
// ---------------------------------------------------------------------------

export type StaticSchemaKind = "generated-interface" | "proto-message";

export function analyzeStaticSchema(
  sourceText: string,
  kind: StaticSchemaKind,
  messageName: string | null = null,
): ContractAnalysis {
  if (kind === "proto-message")
    return analyzeProtoMessageFieldShape(sourceText, messageName);
  return analyzeGeneratedInterfaceSchema(sourceText);
}

/** Re-export the analyzer digest so adapter consumers share derivation identity. */
export { analyzerEvidenceDigest, MECHANICAL_ANALYZER_VERSION };
