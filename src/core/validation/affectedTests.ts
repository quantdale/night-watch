// Affected-test selection (F-PERF-4).
//
// Deterministic changed-path -> test selection with fail-closed broadening.
// The selector is a pure function of the changed files, the authoritative test
// universe, the import graph, and a declared policy:
//
//   - an empty change set is a refusal, never a green selection of zero tests;
//   - safety, governance, test-infrastructure, shared-core and unmapped source
//     changes BROADEN to the full universe rather than narrow;
//   - a changed test file is always selected;
//   - declared always-run tests are always selected;
//   - an unmapped source file (one the import graph cannot place) broadens;
//   - graph traversal is bounded; exceeding the bound broadens.
//
// Pure: no filesystem, no Git, no clock, no child process.

export const AFFECTED_TESTS_SCHEMA = 'nightwatch.affected-tests.v1' as const;
export const MAX_VISITED_NODES = 20_000;

export interface AffectedTestsPolicy {
  /** Path prefixes whose change forces the full universe. */
  readonly broadenPrefixes: readonly string[];
  /** Test files selected regardless of impact. */
  readonly alwaysRun: readonly string[];
  /** Source path prefixes that make a changed file "source-like". */
  readonly sourcePrefixes: readonly string[];
}

export interface AffectedTestsResult {
  readonly schemaVersion: typeof AFFECTED_TESTS_SCHEMA;
  readonly ok: boolean;
  readonly code?: string;
  readonly changedFiles: readonly string[];
  readonly selectedTests: readonly string[];
  readonly broadened: boolean;
  readonly broadenReasons: readonly string[];
  readonly unmappedChangedFiles: readonly string[];
  readonly directMatches: readonly string[];
  readonly counts: { readonly changed: number; readonly universe: number; readonly selected: number };
}

export function deriveAffectedTests(input: {
  readonly changedFiles: readonly string[];
  readonly testFiles: readonly string[];
  readonly edges: readonly { readonly from: string; readonly to: string }[];
  readonly policy: AffectedTestsPolicy;
}): AffectedTestsResult {
  const changed = [...new Set(input.changedFiles)].sort();
  const universe = [...new Set(input.testFiles)].sort();
  const universeSet = new Set(universe);
  const empty = (code: string, selected: readonly string[], broadened: boolean, reasons: readonly string[], unmapped: readonly string[]): AffectedTestsResult => ({
    schemaVersion: AFFECTED_TESTS_SCHEMA,
    ok: code === 'AFFECTED_SELECTED' || code === 'AFFECTED_BROADENED',
    code,
    changedFiles: changed,
    selectedTests: [...selected].sort(),
    broadened,
    broadenReasons: reasons,
    unmappedChangedFiles: unmapped,
    directMatches: selected.filter((file) => changed.includes(file)),
    counts: { changed: changed.length, universe: universe.length, selected: selected.length },
  });

  if (changed.length === 0) return empty('AFFECTED_NO_CHANGED_FILES', [], false, ['no tracked change relative to the base'], []);

  const broadenReasons: string[] = [];
  for (const file of changed) {
    if (input.policy.broadenPrefixes.some((prefix) => file === prefix || file.startsWith(prefix))) {
      broadenReasons.push(`${file} matches a broaden prefix`);
    }
  }
  const graphNodes = new Set<string>();
  for (const edge of input.edges) {
    graphNodes.add(edge.from);
    graphNodes.add(edge.to);
  }
  // A changed TEST file is directly runnable and is selected below; it is
  // never "unmapped source", even when it has no import edges of its own.
  const unmappedChangedFiles = changed.filter((file) =>
    !universeSet.has(file)
    && input.policy.sourcePrefixes.some((prefix) => file.startsWith(prefix))
    && !graphNodes.has(file));
  for (const file of unmappedChangedFiles) broadenReasons.push(`${file} is not present in the impact graph`);

  const alwaysRun = [...new Set(input.policy.alwaysRun)].filter((file) => universeSet.has(file)).sort();
  if (broadenReasons.length > 0) {
    return empty('AFFECTED_BROADENED', universe, true, [...broadenReasons, ...alwaysRun.length > 0 ? ['declared always-run tests included'] : []], unmappedChangedFiles);
  }

  // Reverse adjacency: who imports the changed file, directly or transitively.
  const importersOf = new Map<string, string[]>();
  for (const edge of input.edges) {
    const list = importersOf.get(edge.to) ?? [];
    list.push(edge.from);
    importersOf.set(edge.to, list);
  }
  const impacted = new Set<string>();
  const queue: string[] = [];
  for (const file of changed) {
    if (graphNodes.has(file) && !impacted.has(file)) {
      impacted.add(file);
      queue.push(file);
    }
  }
  let visited = 0;
  while (queue.length > 0) {
    if (visited > MAX_VISITED_NODES) {
      return empty('AFFECTED_BROADENED', universe, true, [`impact traversal exceeded ${MAX_VISITED_NODES} nodes`], unmappedChangedFiles);
    }
    const current = queue.shift();
    if (current === undefined) break;
    visited += 1;
    for (const importer of importersOf.get(current) ?? []) {
      if (impacted.has(importer)) continue;
      impacted.add(importer);
      queue.push(importer);
    }
  }

  const selected = new Set<string>(alwaysRun);
  for (const file of changed) if (universeSet.has(file)) selected.add(file);
  for (const file of impacted) if (universeSet.has(file)) selected.add(file);
  if (selected.size === 0) {
    // A change that maps to no test is not a silent pass: the caller must see
    // the categorical answer and decide, and the fast lane treats it as a
    // refusal. Selecting the universe here would hide a broken policy.
    return empty('AFFECTED_NO_TESTS_MATCHED', [], false, ['no test in the universe is impacted by the change set'], unmappedChangedFiles);
  }
  return empty('AFFECTED_SELECTED', [...selected], false, [], unmappedChangedFiles);
}

/** Categorize an affected-selection result for a lane's exit semantics. */
export function affectedSelectionIsRunnable(result: AffectedTestsResult): boolean {
  return result.code === 'AFFECTED_SELECTED' || result.code === 'AFFECTED_BROADENED';
}
