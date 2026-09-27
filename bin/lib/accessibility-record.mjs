// @ts-check

/**
 * The G20 machine-readable accessibility certification record (design D3,
 * R2-51). The control-center browser lane writes it under the gitignored
 * artifacts/ scratch, exactly like the D-7 run receipts; `project:check`
 * consumes it. Pure parsing lives here so the probe and the focused tests
 * share one contract, and so a record that is absent, malformed, or not
 * actually certified can never resolve to MET.
 *
 * The record has exactly two sections, each owned by one browser test:
 * `certification` (status distinctions, measured contrast, structural audit)
 * and `keyboard` (operator workflows by keyboard alone plus the
 * focus-indicator contrast measurement). A section is RUNNING while its test
 * executes and PASS/FAIL afterwards, so a crashed or failed run can never
 * leave a stale PASS behind.
 */

export const ACCESSIBILITY_RECORD_SCHEMA = 'nightwatch.accessibility-certification.v1';
export const ACCESSIBILITY_RECORD_PATH = 'artifacts/accessibility/accessibility-certification.v1.json';
export const ACCESSIBILITY_RECORD_SECTIONS = Object.freeze(['certification', 'keyboard']);
/** WCAG 2.2 AA minimum contrast for a focus indicator. */
export const ACCESSIBILITY_FOCUS_INDICATOR_MINIMUM = 3;
const SHA_RE = /^[0-9a-f]{40}$/i;

/**
 * @param {unknown} raw
 * @returns {{
 *   ok: boolean,
 *   errors: string[],
 *   summary: {
 *     sha: string,
 *     updatedAt: string | null,
 *     measuredFocusIndicators: number,
 *     minimumFocusContrast: number,
 *   } | null,
 * }}
 */
export function parseAccessibilityCertificationRecord(raw) {
  /** @type {string[]} */
  const errors = [];
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['ACCESSIBILITY_RECORD_UNAVAILABLE'], summary: null };
  }
  const record = /** @type {Record<string, any>} */ (raw);
  if (record.schemaVersion !== ACCESSIBILITY_RECORD_SCHEMA) {
    errors.push(`ACCESSIBILITY_RECORD_SCHEMA_UNSUPPORTED:${String(record.schemaVersion)}`);
  }
  if (typeof record.nightwatchSha !== 'string' || !SHA_RE.test(record.nightwatchSha)) {
    errors.push('ACCESSIBILITY_RECORD_SHA_INVALID');
  }
  const sections = record.sections;
  if (sections === null || typeof sections !== 'object' || Array.isArray(sections)) {
    errors.push('ACCESSIBILITY_RECORD_SECTIONS_MISSING');
  } else {
    for (const name of ACCESSIBILITY_RECORD_SECTIONS) {
      const section = sections[name];
      if (section === null || typeof section !== 'object') {
        errors.push(`ACCESSIBILITY_SECTION_MISSING:${name}`);
        continue;
      }
      if (section.status !== 'PASS') {
        errors.push(`ACCESSIBILITY_SECTION_NOT_CERTIFIED:${name}:${String(section.status)}`);
      }
    }
    // R2-51 — the focus-indicator contrast measurement is part of the record:
    // a certification without at least one measured indicator, or with a
    // measured minimum below 3:1, is not a certification.
    const focusIndicator = sections.keyboard === null || typeof sections.keyboard !== 'object'
      ? undefined
      : sections.keyboard.focusIndicator;
    if (focusIndicator === null || typeof focusIndicator !== 'object' || Array.isArray(focusIndicator)) {
      errors.push('ACCESSIBILITY_FOCUS_INDICATOR_MISSING');
    } else {
      const measured = focusIndicator.measured;
      const minimum = focusIndicator.minimum;
      if (typeof measured !== 'number' || !Number.isFinite(measured) || measured < 1) {
        errors.push('ACCESSIBILITY_FOCUS_INDICATOR_UNMEASURED');
      }
      if (typeof minimum !== 'number' || !Number.isFinite(minimum) || minimum < ACCESSIBILITY_FOCUS_INDICATOR_MINIMUM) {
        errors.push(`ACCESSIBILITY_FOCUS_INDICATOR_BELOW_MINIMUM:${String(minimum)}`);
      }
    }
  }
  if (errors.length > 0) return { ok: false, errors, summary: null };
  const focusIndicator = sections.keyboard.focusIndicator;
  return {
    ok: true,
    errors: [],
    summary: {
      sha: String(record.nightwatchSha).toLowerCase(),
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : null,
      measuredFocusIndicators: Number(focusIndicator.measured),
      minimumFocusContrast: Number(focusIndicator.minimum),
    },
  };
}
