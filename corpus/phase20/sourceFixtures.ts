// Phase 20 synthetic-only source corpus. These are inert source strings for
// bounded analyzer tests; they are never executed or treated as real product
// support.

import type { SourceAnalyzerArtifact } from "../../src/core/semanticCoverage/sourceAnalyzers";

export const PHASE20_SOURCE_SHA = "0000000000000000000000000000000000000020";
export const PHASE20_SOURCE_SHA_CHANGED = "0000000000000000000000000000000000000021";

const surfaces = ["API", "BROWSER", "SYNTHETIC"] as const;

export const PHASE20_TYPESCRIPT_ARTIFACT: SourceAnalyzerArtifact = {
  artifactId: "phase20.typescript.behavior",
  language: "TYPESCRIPT",
  repoId: "synthetic/phase20-product",
  sha: PHASE20_SOURCE_SHA,
  relativePath: "src/contracts/summary.ts",
  symbol: "summaryContract",
  observationSurfaces: surfaces,
  sourceText: `
    const schema = {
      required: ["id", "status"],
      status: { enum: ["open", "closed"] },
      amount: { type: "NUMBER", default: 0 }
    };
    function validate(value: number) {
      if (value < 0 || value > 100) { throw new Error("bounded"); }
    }
    const normalized = value.trim().toLowerCase();
    items.sort((left, right) => left.rank - right.rank);
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    if (obj.enabled && !obj.detail) { throw new Error("dependent"); }
    const visible = items.filter((item) => item.visible);
  `,
};

export const PHASE20_OPENAPI_ARTIFACT: SourceAnalyzerArtifact = {
  artifactId: "phase20.openapi.summary",
  language: "OPENAPI",
  repoId: "synthetic/phase20-product",
  sha: PHASE20_SOURCE_SHA,
  relativePath: "openapi/summary.json",
  symbol: null,
  observationSurfaces: ["API", "SYNTHETIC"],
  sourceText: JSON.stringify({
    type: "object",
    properties: {
      id: { type: "STRING" },
      status: { type: "STRING", enum: ["open", "closed"] },
      amount: { type: "NUMBER", minimum: 0, maximum: 100, default: 0 },
    },
    required: ["id", "status"],
  }),
};

export const PHASE20_GO_ARTIFACT: SourceAnalyzerArtifact = {
  artifactId: "phase20.go.summary",
  language: "GO",
  repoId: "synthetic/phase20-product",
  sha: PHASE20_SOURCE_SHA,
  relativePath: "internal/summary/model.go",
  symbol: "Summary",
  observationSurfaces: ["API", "SYNTHETIC"],
  sourceText: 'type Summary struct {\n ID string `json:"id"`\n Status string `json:"status"`\n Optional *string `json:"optional,omitempty"`\n}',
};

export const PHASE20_PHP_ARTIFACT: SourceAnalyzerArtifact = {
  artifactId: "phase20.php.summary",
  language: "PHP",
  repoId: "synthetic/phase20-product",
  sha: PHASE20_SOURCE_SHA,
  relativePath: "src/Handler/Summary.php",
  symbol: "buildSummary",
  observationSurfaces: ["API", "SYNTHETIC"],
  hints: [{ kind: "PHP_ROW_KEYS", accumulator: "res", pattern: "PUSH" }],
  sourceText: `<?php
    function buildSummary($source) {
      $res[] = ['id' => 1, 'status' => 'open', 'amount' => 0];
      return $res;
    }
  `,
};

export const PHASE20_PHP_PAGINATION_ARTIFACT: SourceAnalyzerArtifact = {
  artifactId: "phase20.php.pagination",
  language: "PHP",
  repoId: "synthetic/phase20-product",
  sha: PHASE20_SOURCE_SHA,
  relativePath: "src/Handler/Pagination.php",
  symbol: "listSummary",
  observationSurfaces: ["API", "SYNTHETIC"],
  hints: [{ kind: "PHP_PAGINATION" }],
  sourceText: `<?php
    function listSummary($source) {
      $pageSize = 2;
      return $source;
    }
  `,
};

export const PHASE20_UNSUPPORTED_ARTIFACT: SourceAnalyzerArtifact = {
  artifactId: "phase20.unsupported.syntax",
  language: "JAVASCRIPT",
  repoId: "synthetic/phase20-product",
  sha: PHASE20_SOURCE_SHA,
  relativePath: "src/contracts/dynamic.js",
  symbol: "dynamicContract",
  observationSurfaces: ["API"],
  sourceText: 'const key = getRuntimeKey(); output[key] = loadValue();',
};

export const PHASE20_DRIFTED_TYPESCRIPT_ARTIFACT: SourceAnalyzerArtifact = {
  ...PHASE20_TYPESCRIPT_ARTIFACT,
  artifactId: "phase20.typescript.behavior.drifted",
  sha: PHASE20_SOURCE_SHA_CHANGED,
  sourceText: PHASE20_TYPESCRIPT_ARTIFACT.sourceText.replace("amount: { type: \"NUMBER\", default: 0 }", "amount: { type: \"STRING\", default: \"unknown\" }"),
};

export const PHASE20_SOURCE_ARTIFACTS: readonly SourceAnalyzerArtifact[] = [
  PHASE20_TYPESCRIPT_ARTIFACT,
  PHASE20_OPENAPI_ARTIFACT,
  PHASE20_GO_ARTIFACT,
  PHASE20_PHP_ARTIFACT,
  PHASE20_PHP_PAGINATION_ARTIFACT,
  PHASE20_UNSUPPORTED_ARTIFACT,
];
