// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — read-only source expectation adapter (SPEC §32, §56,
// §57).
//
// ONE implementation serves both the synthetic fixture source
// (corpus/phase9/source-fixture) and any real read-only Alphaus checkout:
// static text extraction only — no eval, no dynamic import, no execution of
// application code, no build scripts, no dependency installation.
//
// The adapter recognizes `@nightwatch-contract` annotation blocks containing
// declarative expectation JSON (schemaVersion, expectationId, targetKind,
// targetId, projectionContract, invariantDefinitions). Provenance is bound
// from the caller-supplied source snapshot — it is never embedded in the
// source text itself. Real Alphaus source without these annotations yields
// zero derived expectations (documented; real-source expectations must be
// admitted only when the annotation pattern exists — this adapter never
// guesses semantics from arbitrary source).
// ---------------------------------------------------------------------------

import { validateExpectationBatch } from './validator';
import type { SemanticExpectation, SourceProvenance } from './types';

/** Marker for declarative expectation blocks inside source text. */
const CONTRACT_MARKER = '@nightwatch-contract';

/** Bounded scanner: a source file may carry at most this many contract
 *  blocks, each at most this many characters. */
const MAX_CONTRACT_BLOCKS = 64;
const MAX_BLOCK_CHARS = 20_000;

export interface DerivationInput {
  /** Static source text (read-only file content). */
  readonly sourceText: string;
  /** Provenance bound from the caller's source snapshot. */
  readonly provenance: SourceProvenance;
}

export interface DerivationResult {
  readonly expectations: readonly SemanticExpectation[];
  readonly blockCount: number;
}

/** Extract declarative expectation JSON blocks from static source text. */
function extractContractBlocks(sourceText: string): string[] {
  const blocks: string[] = [];
  const lines = sourceText.split(/\r?\n/);
  let current: string[] | null = null;
  const flush = (): void => {
    if (current !== null) {
      const block = current.join('\n').trim();
      if (block.length > 0) blocks.push(block);
      current = null;
    }
  };
  for (const line of lines) {
    const trimmed = line.trim();
    // The marker must START the comment (`// @nightwatch-contract ...`);
    // prose mentions of the marker inside other comments must not trigger.
    if (trimmed.startsWith(`// ${CONTRACT_MARKER}`) || trimmed.startsWith(`//${CONTRACT_MARKER}`)) {
      flush();
      current = [];
      // Inline JSON after the marker is supported: `// @nightwatch-contract {"..."}`
      const inline = trimmed.slice(trimmed.indexOf(CONTRACT_MARKER) + CONTRACT_MARKER.length).trim();
      if (inline.startsWith('{')) current.push(inline);
      continue;
    }
    if (current !== null) {
      const content = trimmed.startsWith('//') ? trimmed.slice(2).trim() : trimmed;
      if (content === '' || content.startsWith('*/') || content.startsWith('*')) {
        if (content === '') continue; // blank line inside block
      }
      current.push(content);
    }
  }
  flush();
  return blocks;
}

/** Derive expectations from static source text. Throws bounded
 *  `SEMANTIC_EXPECTATION_INVALID` classifications for malformed blocks. */
export function deriveExpectations(input: DerivationInput): DerivationResult {
  const blocks = extractContractBlocks(input.sourceText);
  if (blocks.length > MAX_CONTRACT_BLOCKS) {
    throw new Error('SEMANTIC_EXPECTATION_INVALID:too-many-contract-blocks');
  }
  const rawExpectations: unknown[] = [];
  for (const block of blocks) {
    if (block.length > MAX_BLOCK_CHARS) {
      throw new Error('SEMANTIC_EXPECTATION_INVALID:contract-block-too-large');
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(block);
    } catch {
      throw new Error('SEMANTIC_EXPECTATION_INVALID:contract-block-not-json');
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('SEMANTIC_EXPECTATION_INVALID:contract-block-not-an-object');
    }
    if ('sourceProvenance' in (parsed as Record<string, unknown>)) {
      // Provenance is adapter-authoritative (bound from the caller's source
      // snapshot); a contract block must never claim its own.
      throw new Error('SEMANTIC_EXPECTATION_INVALID:contract-block-carries-provenance');
    }
    rawExpectations.push({ ...(parsed as Record<string, unknown>), sourceProvenance: input.provenance });
  }
  const expectations = validateExpectationBatch(rawExpectations);
  return { expectations, blockCount: blocks.length };
}
