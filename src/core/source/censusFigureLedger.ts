// C-16 / G-16 — one derived figure source.
//
// G-16's authoritative definition, from
// `docs/design/PRODUCTION-OBSERVABILITY-MASTER-PLAN.md`:
//
//   | G-16 | Stale duplicate figures in durable docs | "83 / 175 / 45-80-3"
//   reads as current | ONE DERIVED FIGURE SOURCE | fix: make the census the
//   only writer of these figures; retire superseded narratives | assert: no
//   document contains a census figure absent from the current ledger |
//   check: doc/ledger equality check in the gate |
//
// It had no owning campaign; C-16 owns it. It is also NOT a prioritisation
// requirement, which the orphan row's phrasing ("G-16 and EIG owners")
// actively invites you to assume — and assuming it would have left the actual
// documentation-truth requirement unimplemented while an EIG module got built.
//
// The risk is live rather than theoretical. This overnight campaign has been
// writing measured figures into `docs/CURRENT_STATE.md` all night — 1,851
// operations, 2,114 expectations, 332 scenarios — and every one of those is a
// number a future reader will take as current.
//
// The mechanism is deliberately narrow. It does NOT try to find every number in
// every document: that would be a heuristic, and a wrong one, since documents
// legitimately carry historical figures, receipt digests, run identifiers and
// SHAs. Instead the LEDGER declares which census measures exist and what each
// currently is, and a document may state a census figure only in a form the
// ledger supports.
//
// Data-only: no filesystem authority. The caller supplies document text.

export const CENSUS_LEDGER_VERSION = 'nightwatch.census-figure-ledger.v1' as const;

/**
 * The census measures that exist, and their CURRENT values.
 *
 * This is the "one derived figure source" G-16 asks for. A number appearing in
 * a durable document must be either a value this ledger currently carries, or
 * explicitly marked historical.
 */
export interface CensusFigure {
  readonly measureId: string;
  /** What the number counts. Prose for the reader; never parsed. */
  readonly description: string;
  readonly currentValue: number;
  /** The campaign whose evidence established it. */
  readonly establishedBy: string;
}

export const CENSUS_FIGURES: readonly CensusFigure[] = Object.freeze([
  { measureId: 'SOURCE_OPERATIONS', description: 'source operations across the admitted universe', currentValue: 1851, establishedBy: 'C-05' },
  { measureId: 'ADMITTED_REPOSITORIES', description: 'repositories in the owner-approved universe', currentValue: 8, establishedBy: 'C-05' },
  { measureId: 'DISCOVERED_REPOSITORIES', description: 'git repositories discovered under the sibling root', currentValue: 149, establishedBy: 'C-05' },
  { measureId: 'DEPLOYMENT_BINDINGS', description: 'operations carrying a deployment binding', currentValue: 1851, establishedBy: 'C-08' },
  { measureId: 'POSITIVE_DEPLOYMENT_FACTS', description: 'positive route to endpoint deployment facts', currentValue: 0, establishedBy: 'C-08' },
  { measureId: 'SPEC_EXPECTATIONS', description: 'admitted spec-derived expectations', currentValue: 2114, establishedBy: 'C-09' },
  { measureId: 'OPENSPEC_SCENARIOS', description: 'OpenSpec scenarios in the corpus', currentValue: 332, establishedBy: 'C-09' },
]);

/**
 * A durable document that G-16 polices. Deliberately a short explicit list:
 * a wildcard would drag in campaign REPORTs, whose whole purpose is to record
 * the figures that were true at their own checkpoint.
 */
export const POLICED_DOCUMENTS = Object.freeze(['docs/CURRENT_STATE.md']);

/**
 * The ONE marker that makes a tagged figure explicitly historical, so a
 * superseded narrative can be RETIRED rather than deleted — which is what
 * G-16's fix asks for, and what this repository already does elsewhere.
 *
 * It is a single dedicated tag rather than a list of words. A first draft of
 * this module exempted any line containing `historical`, `refuted`,
 * `superseded`, `previously`, `no longer` or `was ` — and `was ` alone would
 * have silently exempted a large fraction of English prose, including lines
 * carrying live figures. An exemption that fires by accident is worse than no
 * exemption, because the check then passes while proving nothing. Marking a
 * figure historical must be a deliberate act.
 */
export const HISTORICAL_MARKER = '<!--census:historical-->';

export const CENSUS_VIOLATION_REASONS = ['FIGURE_NOT_IN_LEDGER', 'MEASURE_UNKNOWN'] as const;
export type CensusViolationReason = (typeof CENSUS_VIOLATION_REASONS)[number];

export interface CensusViolation {
  readonly documentPath: string;
  readonly line: number;
  readonly measureId: string;
  readonly statedValue: number;
  readonly ledgerValue: number | null;
  readonly reason: CensusViolationReason;
}

export interface CensusCheckResult {
  readonly schemaVersion: typeof CENSUS_LEDGER_VERSION;
  readonly documentsChecked: number;
  readonly taggedFiguresFound: number;
  readonly violations: readonly CensusViolation[];
  readonly holds: boolean;
}

/**
 * The tag form a document uses to state a census figure:
 *
 *     <!--census:SOURCE_OPERATIONS=1851-->
 *
 * An explicit tag rather than free-text scanning, for the same reason C-08
 * refused to infer a deployment fact from a hostname: guessing which numbers in
 * a document are census figures produces both false positives and false
 * negatives, and neither is acceptable in a truth check. A document that wants
 * a checked figure says so.
 */
const CENSUS_TAG = /<!--\s*census:([A-Z_]{1,64})=(-?\d{1,12})\s*-->/g;

export function checkCensusFigures(documents: readonly { readonly path: string; readonly text: string }[]): CensusCheckResult {
  const ledger = new Map(CENSUS_FIGURES.map((figure) => [figure.measureId, figure.currentValue]));
  const violations: CensusViolation[] = [];
  let tagged = 0;
  for (const document of documents) {
    const lines = document.text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      // A line carrying the explicit marker is exempt: retiring a superseded
      // narrative is the fix, and deleting history is not.
      if (line.includes(HISTORICAL_MARKER)) continue;
      CENSUS_TAG.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = CENSUS_TAG.exec(line)) !== null) {
        tagged += 1;
        const measureId = match[1] ?? '';
        const statedValue = Number.parseInt(match[2] ?? '', 10);
        if (!ledger.has(measureId)) {
          violations.push(Object.freeze({ documentPath: document.path, line: index + 1, measureId, statedValue, ledgerValue: null, reason: 'MEASURE_UNKNOWN' }));
          continue;
        }
        const ledgerValue = ledger.get(measureId)!;
        if (ledgerValue !== statedValue) {
          violations.push(Object.freeze({ documentPath: document.path, line: index + 1, measureId, statedValue, ledgerValue, reason: 'FIGURE_NOT_IN_LEDGER' }));
        }
      }
    }
  }
  return Object.freeze({
    schemaVersion: CENSUS_LEDGER_VERSION,
    documentsChecked: documents.length,
    taggedFiguresFound: tagged,
    violations: Object.freeze(violations),
    holds: violations.length === 0,
  });
}
