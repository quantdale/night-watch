// @ts-check
// R5-12 / review-5 task B2.1 — the closed certification subject table.
//
// One row per condition and lane of the Certification Producer Matrix
// (`openspec/changes/nightwatch-final-completion-review5-v1/design.md`). A subject
// is certifiable ONLY where its producer is declared here, and the receipt schema
// table (`receipt-schemas.mjs`) derives its closed subject set from this module, so
// a receipt cannot name a subject whose producer does not exist.
//
// Routes (which receipt schema certifies the subject):
//   CERTIFICATION  the new `nightwatch.certification-evidence-receipt.v1`
//   UI_HARNESS     the repaired UI-harness receipt (condition ui-error-taxonomy-rendering)
//   GATE_COPY      the existing quality-gate receipt, copied through verbatim
//   CLEAN_COPY     the existing clean-checkout receipt, copied through verbatim
//   NONE           no receipt: a recorded, current, unexpired unavailable lane
//
// Producers (how a CERTIFICATION receipt's `checkState` is obtained):
//   PROJECT_CHECK  the live check a release-certification condition names, read from the
//                  project-state verdict (the SAME check function the evaluator uses)
//   COMMAND        a fixed allowlisted command; exit 0 is MET, anything else NOT_MET
//   OBSERVE_CI     a read-only GitHub Actions observation of the run at S

/**
 * The TRACKED evidence directory (relative to the repository root): a receipt committed at
 * `evidence/certification/<sha>/<subject>.json` is read by the verifier in addition to the
 * host-local ignored directory of its kind, so CI and `gate:clean` verify what the host produced.
 */
export const CERTIFICATION_EVIDENCE_DIRECTORY = 'evidence/certification';

/** @typedef {{ id: string, kind: 'CONDITION' | 'LANE', route: 'CERTIFICATION' | 'UI_HARNESS' | 'GATE_COPY' | 'CLEAN_COPY' | 'NONE', producer: 'PROJECT_CHECK' | 'COMMAND' | 'OBSERVE_CI' | 'COPY_THROUGH' | 'UNAVAILABLE', command: readonly string[] | null, checkOf: string | null }} CertificationSubject */

/**
 * @param {string} id
 * @param {'CONDITION' | 'LANE'} kind
 * @param {CertificationSubject['route']} route
 * @param {CertificationSubject['producer']} producer
 * @param {readonly string[] | null} command
 * @param {string | null} checkOf
 * @returns {CertificationSubject}
 */
function subject(id, kind, route, producer, command = null, checkOf = null) {
  return Object.freeze({ id, kind, route, producer, command: command === null ? null : Object.freeze([...command]), checkOf });
}

/** The 15 conditions certified by the new schema through their live check. */
const PROJECT_CHECK_CONDITIONS = Object.freeze([
  'validation-lane-closure',
  'exact-head-ci-authority',
  'autonomous-yield-proof',
  'completion-ledger-truth',
  'operator-cli-contract',
  'documentation-currency',
  'workspace-continuity-drift-closure',
  'dependency-supply-chain-currency',
  'dead-architecture-closure',
  'cli-implementation-contract',
  'structural-rule-soundness',
  'schema-version-lifecycle',
  'configuration-contract',
  'accessibility-certification',
  'authenticated-capability-lifecycle',
]);

/** @type {readonly CertificationSubject[]} */
export const CERTIFICATION_SUBJECTS = Object.freeze([
  ...PROJECT_CHECK_CONDITIONS.map((id) => subject(id, 'CONDITION', 'CERTIFICATION', 'PROJECT_CHECK')),
  subject('ui-error-taxonomy-rendering', 'CONDITION', 'UI_HARNESS', 'COPY_THROUGH'),
  subject('root-compile', 'LANE', 'CERTIFICATION', 'COMMAND', ['npm', 'run', '--silent', 'typecheck']),
  subject('bin-parse', 'LANE', 'CERTIFICATION', 'COMMAND', ['npm', 'run', '--silent', 'typecheck:bin']),
  subject('structural-invariants', 'LANE', 'CERTIFICATION', 'COMMAND', ['npm', 'run', '--silent', 'hardening:check']),
  subject('authoritative-gate', 'LANE', 'GATE_COPY', 'COPY_THROUGH'),
  subject('full-regression', 'LANE', 'CERTIFICATION', 'COMMAND', ['npm', 'test']),
  subject('clean-checkout', 'LANE', 'CLEAN_COPY', 'COPY_THROUGH'),
  subject('ui', 'LANE', 'CERTIFICATION', 'COMMAND', ['npm', 'run', '--silent', 'gate:ui']),
  subject('browser-workflow', 'LANE', 'CERTIFICATION', 'COMMAND', ['npm', 'run', '--silent', 'control-center:ui:browser']),
  subject('owner-manual', 'LANE', 'NONE', 'UNAVAILABLE'),
  subject('exact-checkpoint-ci', 'LANE', 'CERTIFICATION', 'OBSERVE_CI'),
  subject('dependency-advisory', 'LANE', 'CERTIFICATION', 'PROJECT_CHECK', null, 'dependency-supply-chain-currency'),
]);

/** The subjects the new certification schema may certify (closed). */
export const CERTIFICATION_SCHEMA_SUBJECTS = Object.freeze(
  CERTIFICATION_SUBJECTS.filter((entry) => entry.route === 'CERTIFICATION').map((entry) => entry.id),
);

/**
 * @param {string} id
 * @returns {CertificationSubject | null}
 */
export function certificationSubject(id) {
  return CERTIFICATION_SUBJECTS.find((entry) => entry.id === id) ?? null;
}
