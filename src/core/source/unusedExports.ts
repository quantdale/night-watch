// ---------------------------------------------------------------------------
// Exported value symbols with no reachable consumer (D-17).
//
// The reference-graph rule (`checkSourceReachability`) proves that a MODULE
// has a consumer. It cannot see anything finer: a module may be genuinely
// reachable while half of its exported surface is named by nobody at all. The
// R1 Lane D audit counted 122 such symbols in `src/`, then measured nothing
// ever again, so the number could only drift upward.
//
// This module is the JUDGEMENT half of the whole-`src/` ratchet. It is pure:
// the caller supplies an already-scanned observation — which exported value
// symbols exist, and which tracked files reference each identifier — and this
// module decides. It reads no filesystem, resolves no paths and performs no
// I/O, so the same judgement runs inside `bin/hardening-check.mjs`, inside a
// unit test, and in a clean clone without a toolchain.
//
// The measurement is deliberately CONSERVATIVE: a symbol counts as referenced
// whenever any tracked file outside its own definer names the identifier in
// executable code (a type position, a namespace member, a string-free AST
// identifier). Over-counting a reference understates the debt, which can only
// make the ratchet harder to trip — never a false failure.
// ---------------------------------------------------------------------------

export const UNUSED_EXPORT_REPORT_VERSION = 'nightwatch.unused-export-report.v1' as const;

/** The kinds of exported VALUE symbol this ratchet counts. Types never enter. */
export const UNUSED_EXPORT_KINDS = ['FUNCTION', 'CLASS', 'ENUM', 'VARIABLE'] as const;
export type ExportedValueKind = (typeof UNUSED_EXPORT_KINDS)[number];

/**
 * One exported value symbol, with the files that reference its identifier.
 * `referencingFiles` MUST include the defining file: a symbol whose identifier
 * is never named again — not even by its own module — has an empty list, and
 * the judgement refuses that observation rather than reading it as zero.
 */
export interface ExportedValueSymbol {
  /** Repository-relative path of the defining module, e.g. `src/core/x.ts`. */
  readonly file: string;
  readonly line: number;
  readonly kind: ExportedValueKind;
  readonly name: string;
  readonly referencingFiles: readonly string[];
}

/** The pinned ceiling. `count` is the measured total at the recording SHA. */
export interface UnusedExportBudget {
  readonly count: number;
  /** Why this ceiling exists; a bare number is not a recorded decision. */
  readonly reason: string;
}

export interface UnusedExportFinding {
  readonly code: string;
  readonly detail: string;
}

export interface UnusedExportJudgement {
  readonly schemaVersion: typeof UNUSED_EXPORT_REPORT_VERSION;
  /** Every exported value symbol observed across `src/`. */
  readonly exportedValueSymbols: number;
  /** Exported value symbols with no consumer outside their own module. */
  readonly unreferencedCount: number;
  /** The pinned ceiling the count was measured against. */
  readonly budgetCount: number;
  /** Stable, sorted `file:line kind name` identity of every unreferenced symbol. */
  readonly unreferenced: readonly string[];
  readonly findings: readonly UnusedExportFinding[];
}

/** A symbol nobody names again — not even its own module — is unscannable. */
export function symbolIdentity(symbol: ExportedValueSymbol): string {
  return `${symbol.file}:${symbol.line} ${symbol.kind} ${symbol.name}`;
}

/**
 * A symbol is UNREFERENCED when every file that names its identifier is its
 * own definer. An identifier named only inside its own module has no consumer:
 * exporting it buys nothing and costs a surface that nothing exercises.
 */
export function isUnreferencedExportedValue(symbol: ExportedValueSymbol): boolean {
  return symbol.referencingFiles.every((file) => file === symbol.file);
}

/**
 * The whole-`src/` ratchet judgement.
 *
 * Fails closed in every direction that matters:
 *   - an observation that names no exported value symbol at all means the
 *     scanner is broken, not that the repository is clean;
 *   - a symbol whose `referencingFiles` omits its own definer is an internally
 *     inconsistent observation, so the whole judgement refuses rather than
 *     guessing which side is wrong;
 *   - the budget must be a finite non-negative integer with a stated reason,
 *     because "the count may never grow" is a decision, not a constant.
 */
export function judgeUnusedExports(input: {
  readonly symbols: readonly ExportedValueSymbol[];
  readonly budget: UnusedExportBudget;
}): UnusedExportJudgement {
  const budget = input.budget;
  /** @type {UnusedExportFinding[]} */
  const findings: UnusedExportFinding[] = [];

  if (!Number.isInteger(budget.count) || budget.count < 0) {
    findings.push({ code: 'UNUSED_EXPORT_BUDGET_COUNT_INVALID', detail: `the pinned count is ${String(budget.count)}; a ratchet needs a finite non-negative integer` });
  }
  if (typeof budget.reason !== 'string' || budget.reason.trim().length < 12) {
    findings.push({ code: 'UNUSED_EXPORT_BUDGET_REASON_MISSING', detail: 'the pinned unused-export count carries no stated reason' });
  }

  const unreferenced: string[] = [];
  let exportedValueSymbols = 0;
  for (const symbol of input.symbols) {
    exportedValueSymbols += 1;
    if (
      typeof symbol.file !== 'string'
      || symbol.file.length === 0
      || typeof symbol.name !== 'string'
      || symbol.name.length === 0
      || !Number.isInteger(symbol.line)
      || symbol.line < 1
      || !(UNUSED_EXPORT_KINDS as readonly string[]).includes(symbol.kind)
    ) {
      findings.push({ code: 'UNUSED_EXPORT_SYMBOL_SHAPE_INVALID', detail: `an observed symbol has no usable identity: ${JSON.stringify(symbol)}` });
      continue;
    }
    if (!Array.isArray(symbol.referencingFiles)) {
      findings.push({ code: 'UNUSED_EXPORT_REFERENCE_LIST_INVALID', detail: `${symbolIdentity(symbol)} carries no reference list` });
      continue;
    }
    if (!symbol.referencingFiles.includes(symbol.file)) {
      // The definer names its own declaration, so its absence means the index
      // is wrong. Refusing is the only safe reading: the alternative would
      // silently add the symbol to the debt the ratchet measures.
      findings.push({ code: 'UNUSED_EXPORT_REFERENCE_INDEX_INCONSISTENT', detail: `${symbolIdentity(symbol)} is not referenced by its own defining module; the identifier index is broken` });
      continue;
    }
    if (isUnreferencedExportedValue(symbol)) unreferenced.push(symbolIdentity(symbol));
  }
  unreferenced.sort((left, right) => left.localeCompare(right));

  // Discovery, not cleanliness: zero symbols means the scan matched nothing.
  if (exportedValueSymbols === 0) {
    findings.push({ code: 'UNUSED_EXPORT_SCAN_VACUOUS', detail: 'zero exported value symbols were observed under src/; the scan is broken rather than the repository clean' });
  }
  if (Number.isInteger(budget.count) && budget.count >= 0 && unreferenced.length > budget.count) {
    findings.push({
      code: 'UNUSED_EXPORT_COUNT_GROWN',
      detail: `${unreferenced.length} exported value symbols under src/ have no consumer outside their own module, above the pinned ceiling of ${budget.count}; adopt a consumer, remove the export, or lower the pin deliberately with a recorded reason`,
    });
  }

  return {
    schemaVersion: UNUSED_EXPORT_REPORT_VERSION,
    exportedValueSymbols,
    unreferencedCount: unreferenced.length,
    budgetCount: budget.count,
    unreferenced,
    findings,
  };
}
