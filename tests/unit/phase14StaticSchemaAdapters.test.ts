// ---------------------------------------------------------------------------
// Nightwatch Phase 14A — C2: focused static-schema / generated-interface /
// proto / chunk-contract adapter tests (SPEC §6, FIVE_CHANGE C2;
// ACCEPTANCE_MATRIX C07/E05/E06).
//
// Proves both positive generated/proto cases and deceptive comment/name-only
// cases fail closed with a precise blocker. No endpoint/target/transport
// authority is ever invented by the adapter.
// ---------------------------------------------------------------------------

import { expect, test } from "@playwright/test";
import {
  analyzeGeneratedInterfaceSchema,
  analyzeProtoMessageFieldShape,
  analyzeStaticSchema,
  analyzeStaticSchemaChunkContract,
  analyzerEvidenceDigest,
} from "../../src/oracles/expectations/extract/staticSchemaAdapters";
import {
  genInterfaceFinite,
  genInterfaceMissingFields,
  genInterfaceNotJson,
  genInterfaceCommentOnly,
  protoMessageFinite,
  protoPresentNoCardinality,
  protoMapUnsupported,
  protoOneofUnsupported,
  protoUnknownType,
  protoNoMessage,
  protoCommentOnly,
  stringLiteralFakeContract,
} from "../../corpus/phase14/source-fixtures";

test.describe("Phase 14A C2 — generated-interface adapter", () => {
  test("positive finite field shape proven", () => {
    const a = analyzeGeneratedInterfaceSchema(genInterfaceFinite);
    expect(a.status).toBe("PROVEN");
    expect(a.proofClass).toBe("GENERATED_INTERFACE_FIELD_SHAPE");
    const leaf = a.facts.find(
      (f) => f.itemKeys?.length === 1 && f.itemKeys[0] === "id",
    )!;
    expect(leaf.allowedTypes).toEqual(["STRING"]);
  });

  test("missing fields array fails GENERATED_SCHEMA_UNAVAILABLE", () => {
    const a = analyzeGeneratedInterfaceSchema(genInterfaceMissingFields);
    expect(a.status).not.toBe("PROVEN");
    expect(a.blockerCode).toBe("GENERATED_SCHEMA_UNAVAILABLE");
  });

  test("non-JSON source fails GENERATED_SCHEMA_UNAVAILABLE", () => {
    const a = analyzeGeneratedInterfaceSchema(genInterfaceNotJson);
    expect(a.status).not.toBe("PROVEN");
    expect(a.blockerCode).toBe("GENERATED_SCHEMA_UNAVAILABLE");
  });

  test("a comment-only interface (no fields) fails closed", () => {
    const a = analyzeGeneratedInterfaceSchema(genInterfaceCommentOnly);
    expect(a.status).not.toBe("PROVEN");
    expect(a.blockerCode).toBe("GENERATED_SCHEMA_UNAVAILABLE");
  });
});

test.describe("Phase 14A C2 — proto message adapter (positive)", () => {
  test("finite scalar/repeated/nested field shape proven with dotted paths", () => {
    const a = analyzeProtoMessageFieldShape(protoMessageFinite);
    expect(a.status).toBe("PROVEN");
    expect(a.proofClass).toBe("GENERATED_INTERFACE_FIELD_SHAPE");
    const paths = a.facts
      .filter((f) => f.itemKeys?.length === 1)
      .map((f) => f.itemKeys![0]!);
    expect(paths).toContain("id");
    expect(paths).toContain("created_at");
    expect(paths).toContain("active");
    expect(paths).toContain("address.street");
    expect(paths).toContain("address.zip");
    const tags = a.facts.find((f) => f.itemKeys?.[0] === "tags")!;
    expect(tags.repeated).toBe(true);
    expect(tags.allowedTypes).toEqual(["STRING"]);
    const created = a.facts.find((f) => f.itemKeys?.[0] === "created_at")!;
    expect(created.allowedTypes).toEqual(["NUMBER"]);
  });

  test("unified analyzeStaticSchema dispatches proto correctly", () => {
    const a = analyzeStaticSchema(protoMessageFinite, "proto-message");
    expect(a.status).toBe("PROVEN");
    const b = analyzeStaticSchema(genInterfaceFinite, "generated-interface");
    expect(b.status).toBe("PROVEN");
  });
});

test.describe("Phase 14A C2 — proto present but no transport / cardinality guarantee", () => {
  test("chunk/transport contract from a static schema fails TRANSPORT_CONTRACT_UNPROVEN", () => {
    // A proto message exists (finite field shape is provable) but the adapter
    // must NOT invent chunk/cardinality semantics from it.
    const shape = analyzeProtoMessageFieldShape(protoPresentNoCardinality);
    expect(shape.status).toBe("PROVEN");
    const chunk = analyzeStaticSchemaChunkContract(protoPresentNoCardinality);
    expect(chunk.status).not.toBe("PROVEN");
    expect(chunk.blockerCode).toBe("TRANSPORT_CONTRACT_UNPROVEN");
  });

  test("comment-only proto never proves a chunk/transport contract", () => {
    const chunk = analyzeStaticSchemaChunkContract(protoCommentOnly);
    expect(chunk.blockerCode).toBe("TRANSPORT_CONTRACT_UNPROVEN");
  });
});

test.describe("Phase 14A C2 — proto negative / deceptive cases fail closed", () => {
  test("map<> unsupported", () => {
    const a = analyzeProtoMessageFieldShape(protoMapUnsupported);
    expect(a.status).not.toBe("PROVEN");
    expect(a.blockerCode).toBe("UNSUPPORTED_SYNTAX");
  });

  test("oneof unsupported", () => {
    const a = analyzeProtoMessageFieldShape(protoOneofUnsupported);
    expect(a.status).not.toBe("PROVEN");
    expect(a.blockerCode).toBe("UNSUPPORTED_SYNTAX");
  });

  test("unknown/imported type fails RUNTIME_VALUE_TYPE_UNPROVEN", () => {
    const a = analyzeProtoMessageFieldShape(protoUnknownType);
    expect(a.status).not.toBe("PROVEN");
    expect(a.blockerCode).toBe("RUNTIME_VALUE_TYPE_UNPROVEN");
  });

  test("no message defined fails GENERATED_SCHEMA_UNAVAILABLE", () => {
    const a = analyzeProtoMessageFieldShape(protoNoMessage);
    expect(a.status).not.toBe("PROVEN");
    expect(a.blockerCode).toBe("GENERATED_SCHEMA_UNAVAILABLE");
  });

  test("comment-only proto (no message) fails closed", () => {
    const a = analyzeProtoMessageFieldShape(protoCommentOnly);
    expect(a.status).not.toBe("PROVEN");
    expect(a.blockerCode).toBe("GENERATED_SCHEMA_UNAVAILABLE");
  });

  test("string-literal fake contract fails GENERATED_SCHEMA_UNAVAILABLE", () => {
    // A string that LOOKS like a schema but is not JSON/structure.
    const a = analyzeGeneratedInterfaceSchema(stringLiteralFakeContract);
    expect(a.status).not.toBe("PROVEN");
    expect(a.blockerCode).toBe("GENERATED_SCHEMA_UNAVAILABLE");
  });
});

test.describe("Phase 14A C2 — determinism & privacy", () => {
  test("deterministic identical digest for repeated analysis", () => {
    const a1 = analyzeProtoMessageFieldShape(protoMessageFinite);
    const a2 = analyzeProtoMessageFieldShape(protoMessageFinite);
    const a3 = analyzeProtoMessageFieldShape(protoMessageFinite);
    expect(analyzerEvidenceDigest(a1)).toBe(analyzerEvidenceDigest(a2));
    expect(analyzerEvidenceDigest(a2)).toBe(analyzerEvidenceDigest(a3));
  });

  test("no privacy sentinel reaches safe derived evidence", () => {
    const a = analyzeProtoMessageFieldShape(protoMessageFinite);
    expect(a.safeEvidence).not.toContain("sk-");
    expect(a.safeEvidence).not.toContain("AKIA");
    expect(JSON.stringify(a)).not.toContain("password=");
  });
});
