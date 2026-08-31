// ---------------------------------------------------------------------------
// Nightwatch executable-source identity boundary.
// ---------------------------------------------------------------------------

/**
 * Git pathspecs used to identify the latest executable Nightwatch change.
 * Protocol/task records and project narrative are continuity inputs, not
 * runtime implementation bytes, so documentation-only checkpoints must not
 * invalidate a prepared campaign manifest.
 */
export const NIGHTWATCH_IMPLEMENTATION_PATHSPEC = Object.freeze([
  '.',
  ':(exclude)AGENTS.md',
  ':(exclude).agent/**',
  ':(exclude)docs/**',
  ':(exclude)openspec/**',
] as const);
