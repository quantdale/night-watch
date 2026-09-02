// ---------------------------------------------------------------------------
// Nightwatch C-10.5 — production provenance derivation surface.
//
// This cone owns turning source intelligence into production vocabulary
// capabilities. It sits OUTSIDE `src/core/prodPrivacy/**` so the privacy cone
// keeps its `node:crypto`-only import profile (A8).
//
// `testOnlySeam` is deliberately NOT re-exported here: it is TEST ONLY and
// `hardening:check` restricts its importers to `tests/**`.
// ---------------------------------------------------------------------------

export * from './routeVocabularyDerivation';
export * from './keyVocabularyDerivation';
