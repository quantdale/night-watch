// ---------------------------------------------------------------------------
// Nightwatch Phase 15P A10 round 2 — programmatic local readiness service.
//
// `createLocalReadinessService` wraps ONE frozen summary model
// (`nightwatch.local-readiness.v1`) behind a small facade:
//
//   summary()  -> the single LocalReadinessSummary both renderers derive from
//   json()     -> renderLocalReadinessJson(summary)   (memoized)
//   text()     -> renderLocalReadinessText(summary)   (memoized)
//   category() -> summary.category
//
// The model is summarized exactly once at construction time; repeated calls
// return identical bytes for identical inputs (deterministic, no clock). This
// is a pure in-process facade: same authority profile as the core (no fs, no
// network, no child processes, no environment access, no persistence). The CLI
// (bin/nightwatch-status.mjs) keeps consuming the module functions directly.
// ---------------------------------------------------------------------------

import { renderLocalReadinessJson, renderLocalReadinessText, summarizeLocalReadiness } from './localReadiness';
import type { LocalReadinessCategory, LocalReadinessInput, LocalReadinessSummary } from './types';

export interface LocalReadinessService {
  /** The ONE frozen summary model all other methods derive from. */
  summary(): LocalReadinessSummary;
  /** Deterministic machine-readable rendering (stable bytes per input). */
  json(): string;
  /** Deterministic concise text rendering (stable bytes per input). */
  text(): string;
  /** Readiness category shortcut over the same frozen model. */
  category(): LocalReadinessCategory;
}

/** Build a readiness service over one explicit input (fail-closed on invalid). */
export function createLocalReadinessService(input: LocalReadinessInput): LocalReadinessService {
  const summary = summarizeLocalReadiness(input);
  let jsonCache: string | undefined;
  let textCache: string | undefined;
  return {
    summary: () => summary,
    json: () => {
      if (jsonCache === undefined) jsonCache = renderLocalReadinessJson(summary);
      return jsonCache;
    },
    text: () => {
      if (textCache === undefined) textCache = renderLocalReadinessText(summary);
      return textCache;
    },
    category: () => summary.category,
  };
}
