// ---------------------------------------------------------------------------
// Nightwatch Phase 16A — campaign portfolio layer (public barrel).
//
// Deterministic, pure, local/synthetic-only planner surface:
//   W1 types        — versioned portfolio model + strict parsers
//   W2 scoring      — explainable deterministic priority score
//   W3 allocation   — bounded budget allocator with caps/floors/starvation
//   W4 yield        — sanitized novelty/yield accounting
//   W5 manifest     — versioned deterministic campaign-plan manifest
//   W6 replan       — change-aware reuse/reprioritize/invalidate classifier
//   W7 simulator    — baseline-vs-optimized shadow backtest
//   W8 report       — operator renderers, plan comparison, DEV handoff
//
// The planner NEVER grants runtime authority; execution of any produced plan
// requires a separately granted owner authorization.
// ---------------------------------------------------------------------------

export * from "./types";
export * from "./scoring";
export * from "./allocation";
export * from "./yield";
export * from "./manifest";
export * from "./replan";
export * from "./simulator";
export * from "./report";
export * from "./runtimeBinding";
