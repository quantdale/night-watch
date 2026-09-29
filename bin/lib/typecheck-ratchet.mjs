// @ts-check
// VB-07 / corrections task 2.7 — the bin type-check ratchet judgement.
//
// The audit found the lane's "ratchet" was not one: a single ceiling over a
// 63-bin non-conforming surface, no total ceiling, and no failure when a
// ceiling grew stale (higher than the measured count), so the numbers could
// drift upward forever while the lane reported PASS. This module is the
// pure judgement; bin/bin-typecheck.mjs feeds it the measured counts.
//
// Three ratchet teeth, each a hard failure in EVERY mode:
//   - per-file ceiling EXCEEDED       the file grew past its ceiling;
//   - per-file ceiling STALE          the file improved but its ceiling was
//                                     not lowered in the same change — the
//                                     ratchet only turns one way (down);
//   - total ceiling EXCEEDED/STALE    the same teeth over the whole surface.
// Plus the annotation budget: the JSDoc `any`-widening annotation family
// (param/type/returns/return) is diagnostic-SILENCING, so a new one added only
// to lower counts is forbidden — the measured count is a budget the surface
// may never exceed.

/**
 * @typedef {{ bin: string, errors: number, maxErrors: number }} CeilingBreach
 * @typedef {{ code: string, detail: string }} RatchetError
 * @typedef {{
 *   perFile: ReadonlyMap<string, number>,
 *   totalCeiling: number | null,
 *   anyAnnotationBudget: number | null,
 * }} RatchetConfig
 */

/**
 * JSDoc and declaration annotations that silence diagnostics by widening a type
 * (RV-07 / corrections task 7.6 widened the original bare-`{any}` form):
 *   - a JSDoc type tag whose braces contain the `any` word anywhere — `{any}`,
 *     `{any[]}`, `{Array<any>}`, `{Record<string, any>}`, `{Promise<any>}`,
 *     `{{ field: any }}` — across param/type/returns/arg/argument/typedef/
 *     property/prop/template/callback/this;
 *   - the other JSDoc wildcards `{*}`, `{?}` and `{Object}`;
 *   - an `any` type position in a declaration file (`: any`, `<any`, `, any`,
 *     `| any`, `=> any`, `as any`, `extends any`).
 * Assembled at runtime so this detector's own source does not contain the
 * literal it forbids (the same hazard the inline-suppression detector dodges
 * with `@ts-` + `nocheck`).
 */
const ANY_TYPE_NAME = ['a', 'ny'].join('');
const WIDENING_TAGS = '(?:param|type|returns?|arg|argument|typedef|property|prop|template|callback|this)';
const JSDOC_ANY_PATTERN = new RegExp(`@${WIDENING_TAGS}\\s*\\{[^}]*\\b${ANY_TYPE_NAME}\\b[^}]*\\}`, 'g');
const JSDOC_WILDCARD_PATTERN = new RegExp(`@${WIDENING_TAGS}\\s*\\{\\s*(?:\\*|\\?|Object)\\s*\\}`, 'g');
const DECLARATION_ANY_PATTERN = new RegExp(`(?::|<|,|\\||=>|\\bas\\b|\\bextends\\b)\\s*${ANY_TYPE_NAME}\\b`, 'g');

/**
 * Count the diagnostic-silencing widening annotations across the supplied
 * sources (`.mjs` JSDoc forms; `.d.mts` declaration `any` positions). Each
 * occurrence counts once; the count is the ratchet budget.
 * @param {Iterable<{ file: string, source: string }>} sources
 */
export function countDiagnosticSilencingAnnotations(sources) {
  let total = 0;
  for (const source of sources) {
    if (source.file.endsWith('.d.mts')) {
      total += source.source.match(DECLARATION_ANY_PATTERN)?.length ?? 0;
    } else {
      total += source.source.match(JSDOC_ANY_PATTERN)?.length ?? 0;
      total += source.source.match(JSDOC_WILDCARD_PATTERN)?.length ?? 0;
    }
  }
  return total;
}

/**
 * Judge the measured per-file counts against the declared ratchet.
 * Pure: the caller measures; this only decides.
 *
 * Rules (each a hard error):
 *   - a NON-CONFORMING bin (errors > 0) must declare a ceiling
 *     (BIN_TYPECHECK_CEILING_MISSING) — the surface may not hold a
 *     non-conforming bin the ratchet does not see;
 *   - errors > ceiling            → BIN_TYPECHECK_CEILING_EXCEEDED
 *   - 0 < errors < ceiling        → BIN_TYPECHECK_CEILING_STALE (lower it)
 *   - errors === 0 && ceiling > 0 → BIN_TYPECHECK_CEILING_STALE too (the
 *     file is clean; its ceiling must be removed or zeroed in the same
 *     change)
 *   - the same teeth over the summed diagnostics when a totalCeiling is
 *     declared (BIN_TYPECHECK_TOTAL_CEILING_*);
 *   - silencing annotations above the budget
 *     (BIN_TYPECHECK_ANY_ANNOTATION_BUDGET_EXCEEDED).
 *
 * @param {{
 *   perFile: ReadonlyMap<string, number>,
 *   total?: number,
 *   annotations: number,
 *   config: RatchetConfig,
 * }} input
 * @returns {RatchetError[]}
 */
export function judgeRatchet(input) {
  /** @type {RatchetError[]} */
  const errors = [];
  const { perFile, annotations, config } = input;
  // The total judges the WHOLE tsc surface (entry points plus bin/lib); the
  // caller supplies it explicitly so library diagnostics cannot escape the
  // total ceiling. Falls back to the judged per-file sum when omitted.
  const totalDiagnostics = input.total ?? [...perFile.values()].reduce((sum, count) => sum + count, 0);

  for (const [bin, count] of perFile) {
    const ceiling = config.perFile.get(bin);
    if (count > 0 && (ceiling === undefined || ceiling === null)) {
      errors.push({
        code: 'BIN_TYPECHECK_CEILING_MISSING',
        detail: `${bin} has ${count} diagnostics and no declared ceiling; every non-conforming bin is a ratchet entry`,
      });
      continue;
    }
    if (ceiling === undefined || ceiling === null) continue;
    if (count > ceiling) {
      errors.push({
        code: 'BIN_TYPECHECK_CEILING_EXCEEDED',
        detail: `${bin} has ${count} diagnostics; ceiling ${ceiling} (ratchet: lower it, never raise it)`,
      });
    } else if (count < ceiling) {
      errors.push({
        code: 'BIN_TYPECHECK_CEILING_STALE',
        detail: `${bin} has ${count} diagnostics but its ceiling is ${ceiling}; lower the ceiling to ${count} in the same change (the ratchet only turns down)`,
      });
    }
  }

  if (config.totalCeiling === null || config.totalCeiling === undefined) {
    errors.push({
      code: 'BIN_TYPECHECK_TOTAL_CEILING_MISSING',
      detail: 'the bin type-check surface requires a measured total ceiling',
    });
  } else {
    const total = totalDiagnostics;
    if (total > config.totalCeiling) {
      errors.push({
        code: 'BIN_TYPECHECK_TOTAL_CEILING_EXCEEDED',
        detail: `the surface carries ${total} diagnostics; total ceiling ${config.totalCeiling}`,
      });
    } else if (total < config.totalCeiling) {
      errors.push({
        code: 'BIN_TYPECHECK_TOTAL_CEILING_STALE',
        detail: `the surface carries ${total} diagnostics but the total ceiling is ${config.totalCeiling}; lower the total ceiling to ${total} in the same change`,
      });
    }
  }

  if (config.anyAnnotationBudget === null || config.anyAnnotationBudget === undefined) {
    errors.push({
      code: 'BIN_TYPECHECK_ANY_ANNOTATION_BUDGET_MISSING',
      detail: 'the diagnostic-silencing any-annotation budget is required',
    });
  } else if (annotations > config.anyAnnotationBudget) {
    errors.push({
      code: 'BIN_TYPECHECK_ANY_ANNOTATION_BUDGET_EXCEEDED',
      detail: `${annotations} diagnostic-silencing any-annotations over the budget ${config.anyAnnotationBudget}; a new any-widening annotation added only to lower counts is forbidden`,
    });
  } else if (annotations < config.anyAnnotationBudget) {
    errors.push({
      code: 'BIN_TYPECHECK_ANY_ANNOTATION_BUDGET_STALE',
      detail: `${annotations} diagnostic-silencing any-annotations remain but the budget is ${config.anyAnnotationBudget}; lower the budget to ${annotations} in the same change`,
    });
  }

  return errors;
}
