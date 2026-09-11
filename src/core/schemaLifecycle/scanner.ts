// ---------------------------------------------------------------------------
// Schema version lifecycle — scanner.
//
// Pure: the caller supplies the source files; this module never reads the
// filesystem. The regex is the SAME shape the campaign measured at `36bd493`
// (`nightwatch.<name>.v<n>`), so the discovered count is comparable across
// sessions and a scanner that silently stops matching fails loudly through
// the non-vacuous-count rule in validate.ts.
//
// A literal is matched in RAW text, comments included: a schema identifier
// written in a comment is still a claim about a versioned contract, and the
// declaration must acknowledge it. Code-only scanning was rejected because it
// would make the declared inventory disagree with the identifier text a
// reviewer actually sees in the file.
// ---------------------------------------------------------------------------

import { parseSchemaIdentifier, type DiscoveredSchemaIdentifier } from './types';

/** The identifier shape. Global so every occurrence in a file is seen. */
export const SCHEMA_IDENTIFIER_RE = /nightwatch\.[A-Za-z0-9_.-]+\.v[0-9]+/g;

export interface ScannedSourceFile {
  /** Repository-relative path, e.g. `src/core/campaign/checkpoint.ts`. */
  readonly path: string;
  readonly text: string;
}

/**
 * Discover every `nightwatch.<name>.v<n>` identifier under `src/`.
 *
 * Identifiers are deduplicated per file and returned sorted by identifier
 * then path, so the result is byte-stable across directory walks and
 * filesystems. A syntactically matched literal that does not parse (which the
 * regex makes impossible today) is dropped rather than guessed at; the
 * non-vacuous count is what protects against a scanner that matches nothing.
 */
export function discoverSchemaIdentifiers(files: readonly ScannedSourceFile[]): readonly DiscoveredSchemaIdentifier[] {
  const byIdentifier = new Map<string, { family: string; version: number; files: Set<string> }>();
  for (const file of files) {
    if (!file.path.startsWith('src/')) continue;
    const seenInFile = new Set<string>();
    for (const match of file.text.matchAll(SCHEMA_IDENTIFIER_RE)) {
      const identifier = match[0];
      if (seenInFile.has(identifier)) continue;
      seenInFile.add(identifier);
      const parsed = parseSchemaIdentifier(identifier);
      if (parsed === null) continue;
      const entry = byIdentifier.get(identifier);
      if (entry === undefined) {
        byIdentifier.set(identifier, { family: parsed.family, version: parsed.version, files: new Set([file.path]) });
      } else {
        entry.files.add(file.path);
      }
    }
  }
  return [...byIdentifier.entries()]
    .map(([identifier, entry]) => ({
      identifier,
      family: entry.family,
      version: entry.version,
      files: [...entry.files].sort((left, right) => left.localeCompare(right)),
    }))
    .sort((left, right) => left.identifier.localeCompare(right.identifier));
}
