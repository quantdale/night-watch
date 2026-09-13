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
  // F-06 / group 5 (evidence lifecycle hygiene) — measured 2026-09-12 in the
  // canonical checkout. The unit is part of the measure id so a tagged figure
  // states the unit it means; the values are point-in-time measurements and
  // must be re-derived, not carried forward silently.
  { measureId: 'DISK_CHECKOUT_SOURCE_MIB', description: 'working-tree source size at the repository root, excluding .git, node_modules, artifacts and the ephemeral output roots', currentValue: 31, establishedBy: 'F-06 measurement 2026-09-12' },
  { measureId: 'DISK_CHECKOUT_GIT_MIB', description: 'Git metadata size included in a fresh clone', currentValue: 21, establishedBy: 'F-06 measurement 2026-09-12' },
  { measureId: 'DISK_NODE_MODULES_MIB', description: 'installed node_modules size after npm ci', currentValue: 48, establishedBy: 'F-06 measurement 2026-09-12' },
  { measureId: 'DISK_TYPICAL_RUN_KIB', description: 'median allocated size of one stored run artifact directory', currentValue: 20, establishedBy: 'F-06 measurement 2026-09-12 over 13394 run directories' },
  { measureId: 'DISK_ACCUMULATED_EVIDENCE_MIB', description: 'allocated size of the accumulated artifacts evidence store', currentValue: 921, establishedBy: 'F-06 measurement 2026-09-12' },
  { measureId: 'DISK_RUNNER_OUTPUT_MIB', description: 'allocated size of the 19 historical test-results roots', currentValue: 19, establishedBy: 'F-06 measurement 2026-09-12' },
  { measureId: 'DISK_SCRATCH_MIB', description: 'allocated size of the .tmp-* scratch trees', currentValue: 8, establishedBy: 'F-06 measurement 2026-09-12' },
]);

/**
 * A durable document that G-16 polices. Deliberately a short explicit list:
 * a wildcard would drag in campaign REPORTs, whose whole purpose is to record
 * the figures that were true at their own checkpoint.
 *
 * F-06 adds the host matrix: its §1 disk figures are host requirements a
 * reader takes as current, exactly like the census counts.
 */
export const POLICED_DOCUMENTS = Object.freeze(['docs/CURRENT_STATE.md', 'docs/HOST-CAPABILITY-MATRIX.md']);

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

// ---------------------------------------------------------------------------
// Group 7 / F-08 — the same narrow mechanism, extended from numbers to status
// words.
//
// A number and a status word are the same failure class: both are claims a
// reader takes as current. The figure ledger's answer was to declare the
// measures and their current values, and to police only the declared ones.
// The status ledger copies that narrowness exactly. F-08's lesson is that a
// heuristic sweep over capitalized tokens in 17,462 lines would be wrong;
// documents legitimately carry historical statuses, receipts and run ids.
//
// So only keys declared here are governed. A governed key stated in a document
// must either equal the current value declared here, extend it with a
// parenthetical state (`COMPLETE (…AWAITING_HARDENING)`), or sit on a line
// that explicitly names the checkpoint it describes: a date, a SHA, or the
// dedicated `<!--status:historical <checkpoint>-->` marker. Everything else is
// left alone.
//
// Data-only, like the figure ledger: the caller supplies document text. The
// markup is deliberately code-shaped — statuses are stated as `KEY: VALUE`,
// `KEY = VALUE` or the table form `| \`KEY\` | \`VALUE\` |`, so a governed key
// is matched where a document makes a status claim and not where a word merely
// resembles one.
// ---------------------------------------------------------------------------

export const STATUS_LEDGER_VERSION = 'nightwatch.status-word-ledger.v1' as const;

export const GOVERNED_STATUS_KINDS = ['PROJECT', 'PHASE', 'LANE_CLASS', 'LIVE_STATE', 'CAMPAIGN_DISPOSITION'] as const;
export type GovernedStatusKind = (typeof GOVERNED_STATUS_KINDS)[number];

export interface GovernedStatusKey {
  readonly key: string;
  /**
   * The CURRENT value. A document stating a different value is stale unless it
   * explicitly qualifies the statement as historical.
   */
  readonly currentValue: string;
  readonly kind: GovernedStatusKind;
  /** Where the current value is established. Prose for the reader; never parsed. */
  readonly establishedBy: string;
  /**
   * True when the README measured-status block must carry this key. The README
   * describes what the system has found; a governed key that is absent from the
   * block is an omission, not an absence statement.
   */
  readonly requiredInReadme?: boolean;
}

/**
 * The governed status keys and their CURRENT values. Values are normalized
 * (`[A-Z0-9_]`, runs of other characters collapsed to `_`) on both sides, so
 * `COMPLETE (HARDENED_LOCAL_SOURCE_SYNTHETIC)` in a table and
 * `COMPLETE_HARDENED_LOCAL_SOURCE_SYNTHETIC` compare equal.
 *
 * The phase/project values are derived from `docs/CURRENT_STATE.md`'s
 * "What exists now" table and its machine-checked `nightwatch.project-state.v2`
 * and `nightwatch.live-state.v1` blocks; the lane values are derived from
 * `config/validation-lane-state.v1.json`; the README keys name the four things
 * §5's current-truth instruction asks the README to state — lane classes,
 * measured yield, semantic acceptance class and production-track stage —
 * including the lanes that have never executed.
 */
export const GOVERNED_STATUS_KEYS: readonly GovernedStatusKey[] = Object.freeze([
  { key: 'REMOTE_STATUS', currentValue: 'PRIVATE_REMOTE_CONFIRMED', kind: 'PROJECT', establishedBy: 'docs/CURRENT_STATE.md current status table' },
  { key: 'PHASE_7B_2_STATUS', currentValue: 'COMPLETE', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_7B_2_1_STATUS', currentValue: 'COMPLETE', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_7B_3_STATUS', currentValue: 'HARNESS_COMPLETE_LOCAL_MODEL_CANARY_NOT_RUN', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_8_STATUS', currentValue: 'COMPLETE', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_8A_STATUS', currentValue: 'COMPLETE', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_8A_1_STATUS', currentValue: 'COMPLETE', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_8A_1_1_STATUS', currentValue: 'COMPLETE', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_8B_STATUS', currentValue: 'COMPLETE', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_8B_0_1_STATUS', currentValue: 'COMPLETE', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_8B_1_STATUS', currentValue: 'COMPLETE_VIA_SUCCESSFUL_RETRY_R1', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_9_STATUS', currentValue: 'COMPLETE', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_9A_1_STATUS', currentValue: 'COMPLETE', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_9B_STATUS', currentValue: 'BLOCKED', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2 (D-56; superseded by 9B-R1)' },
  { key: 'PHASE_9B_R1_STATUS', currentValue: 'COMPLETE', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_9_ORACLE_DEPTH_STATUS', currentValue: 'COMPLETE', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_10_STATUS', currentValue: 'COMPLETE', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_10A_STATUS', currentValue: 'COMPLETE', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_10B_STATUS', currentValue: 'COMPLETE', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_12A_STATUS', currentValue: 'BLOCKED_EXTERNAL_CI', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_13I_STATUS', currentValue: 'BLOCKED_EXTERNAL_CI', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_14A_STATUS', currentValue: 'BLOCKED_EXTERNAL_CI', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_15H_STATUS', currentValue: 'BLOCKED_EXTERNAL_CI', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_16A_STATUS', currentValue: 'COMPLETE', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_16B_STATUS', currentValue: 'BLOCKED_RUNTIME_BINDING_MISSING', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_16C_STATUS', currentValue: 'COMPLETE', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_16CH_STATUS', currentValue: 'BLOCKED_EXTERNAL_CI', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_16H_STATUS', currentValue: 'BLOCKED_EXTERNAL_CI', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_17_STATUS', currentValue: 'COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_22_STATUS', currentValue: 'BLOCKED_BEFORE_DEV', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_23_STATUS', currentValue: 'COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_24_STATUS', currentValue: 'COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_25_STATUS', currentValue: 'COMPLETE_LOCAL_SOURCE_EXPANSION', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_26_STATUS', currentValue: 'COMPLETE_LOCAL_SOURCE_EXPANSION', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_27_STATUS', currentValue: 'COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_28_STATUS', currentValue: 'COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_RESPONSE_FLOW_PROOF_BINDING_HARDENING_STATUS', currentValue: 'COMPLETE_LOCAL_NOT_CI_VERIFIED', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_CONTROL_CENTER_AUTHORITY_INTEGRATION_V2_STATUS', currentValue: 'COMPLETE_LOCAL_READ_ONLY_SYNTHETIC', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_READONLY_ELIGIBILITY_PROOF_EXPANSION_V1_STATUS', currentValue: 'COMPLETE_LOCAL_NOT_CI_VERIFIED', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_SOURCE_TO_CAMPAIGN_PROOF_CHAIN_EXPANSION_V1_STATUS', currentValue: 'COMPLETE_LOCAL_NOT_CI_VERIFIED', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_REPOSITORY_SYSTEMIC_OPTIMIZATION_V1_STATUS', currentValue: 'COMPLETE_LOCAL_NOT_CI_VERIFIED', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'PHASE_DURABLE_ARTIFACT_AND_CONTROL_CENTER_TRUTH_HARDENING_V1_STATUS', currentValue: 'COMPLETE_LOCAL_NOT_CI_VERIFIED', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'MA_8_F_13_STATUS', currentValue: 'COMPLETE', kind: 'PROJECT', establishedBy: 'docs/CURRENT_STATE.md current status table' },
  { key: 'AH_1_STATUS', currentValue: 'COMPLETE', kind: 'PROJECT', establishedBy: 'docs/CURRENT_STATE.md current status table' },
  { key: 'W7_REAL_LOCAL_INVESTIGATION_SUBSTRATE_STATUS', currentValue: 'COMPLETE_LOCAL_NOT_CI_VERIFIED', kind: 'PROJECT', establishedBy: 'docs/CURRENT_STATE.md current status table' },
  { key: 'W8_AUTONOMOUS_EFFICACY_REAL_LOCAL_SUBSTRATE_STATUS', currentValue: 'COMPLETE_LOCAL_NOT_CI_VERIFIED', kind: 'PROJECT', establishedBy: 'docs/CURRENT_STATE.md current status table' },
  { key: 'W9_OWNER_LOCAL_DETERMINISTIC_REPRODUCTION_YIELD_STATUS', currentValue: 'COMPLETE_LOCAL_NOT_CI_VERIFIED', kind: 'PROJECT', establishedBy: 'docs/CURRENT_STATE.md current status table' },
  { key: 'W10_REPRODUCTION_SURFACE_COVERAGE_AUTONOMOUS_YIELD_STATUS', currentValue: 'COMPLETE_LOCAL_NOT_CI_VERIFIED', kind: 'PROJECT', establishedBy: 'docs/CURRENT_STATE.md current status table' },
  { key: 'C_12_STATUS', currentValue: 'PENDING_EXTERNAL_OWNER_PREREQUISITES', kind: 'PROJECT', establishedBy: 'docs/CURRENT_STATE.md current status table' },
  { key: 'C_12_REHEARSAL_STATUS', currentValue: 'LOCAL_REHEARSAL_PASS', kind: 'PROJECT', establishedBy: 'docs/CURRENT_STATE.md current status table' },
  { key: 'FC_1_STATUS', currentValue: 'COMPLETE', kind: 'PROJECT', establishedBy: 'docs/CURRENT_STATE.md current status table' },
  { key: 'ENVIRONMENTAL_LANE_STATUS', currentValue: 'NO_RESIDUAL_FLAKE_REPRODUCED', kind: 'LANE_CLASS', establishedBy: 'docs/CURRENT_STATE.md current status table' },
  { key: 'PROJECT_COMPLETION_STATUS', currentValue: 'OPERATIONALLY_ACCEPTED', kind: 'PROJECT', establishedBy: 'docs/CURRENT_STATE.md current status table / nightwatch.project-state.v2', requiredInReadme: true },
  { key: 'CI_STATUS', currentValue: 'NOT_OBSERVED', kind: 'PROJECT', establishedBy: 'docs/CURRENT_STATE.md current status table / nightwatch.project-state.v2' },
  { key: 'AUTH_STATUS', currentValue: 'VALID', kind: 'PROJECT', establishedBy: 'docs/CURRENT_STATE.md current status table' },
  { key: 'REMOTE_CI_STATUS', currentValue: 'CONFIRMED_PASS_AT_HARDENING_CLOSURE', kind: 'PROJECT', establishedBy: 'docs/CURRENT_STATE.md current status table' },
  { key: 'PROJECT_VERDICT_EFFECT', currentValue: 'PRESERVE', kind: 'CAMPAIGN_DISPOSITION', establishedBy: 'docs/CURRENT_STATE.md current status table' },
  { key: 'PHASE_6_STATUS', currentValue: 'FROZEN_BY_OWNER', kind: 'PHASE', establishedBy: 'docs/CURRENT_STATE.md What-exists-now table / nightwatch.project-state.v2' },
  { key: 'POST_PHASE_9_ARCHITECTURE_DESIGN_STATUS', currentValue: 'COMPLETE', kind: 'PROJECT', establishedBy: 'docs/CURRENT_STATE.md current status table' },
  { key: 'NEXT_PHASE_STATUS', currentValue: 'DESIGNED_NOT_STARTED_NOT_AUTHORIZED', kind: 'PROJECT', establishedBy: 'docs/CURRENT_STATE.md current status table' },
  { key: 'POST_PHASE_10_ARCHITECTURE_DESIGN_STATUS', currentValue: 'COMPLETE', kind: 'PROJECT', establishedBy: 'docs/CURRENT_STATE.md current status table' },
  { key: 'LIVE_TASK_STATUS', currentValue: 'IN_PROGRESS', kind: 'LIVE_STATE', establishedBy: 'docs/CURRENT_STATE.md nightwatch.live-state.v1' },
  { key: 'LIVE_PROJECT_COMPLETION_STATUS', currentValue: 'OPERATIONALLY_ACCEPTED', kind: 'LIVE_STATE', establishedBy: 'docs/CURRENT_STATE.md nightwatch.live-state.v1' },
  { key: 'LIVE_PROJECT_VERDICT_EFFECT', currentValue: 'PRESERVE', kind: 'LIVE_STATE', establishedBy: 'docs/CURRENT_STATE.md nightwatch.live-state.v1' },
  { key: 'VALIDATION_LANE_PROVEN_COUNT', currentValue: '9', kind: 'LANE_CLASS', establishedBy: 'config/validation-lane-state.v1.json', requiredInReadme: true },
  { key: 'VALIDATION_LANE_STALE_EVIDENCE_COUNT', currentValue: '1', kind: 'LANE_CLASS', establishedBy: 'config/validation-lane-state.v1.json', requiredInReadme: true },
  { key: 'VALIDATION_LANE_BLOCKED_EXTERNAL_COUNT', currentValue: '0', kind: 'LANE_CLASS', establishedBy: 'config/validation-lane-state.v1.json', requiredInReadme: true },
  { key: 'VALIDATION_LANE_UNAVAILABLE_CAPABILITY_COUNT', currentValue: '1', kind: 'LANE_CLASS', establishedBy: 'config/validation-lane-state.v1.json', requiredInReadme: true },
  { key: 'MEASURED_YIELD_ADMITTED_FINDINGS', currentValue: '0', kind: 'PROJECT', establishedBy: 'F-03 audit measurement (no admission ever recorded)', requiredInReadme: true },
  { key: 'MEASURED_YIELD_EXACT_REDISCOVERY', currentValue: '0', kind: 'PROJECT', establishedBy: 'F-03 audit measurement (strict EXACT_REDISCOVERY is 0)', requiredInReadme: true },
  { key: 'SEMANTIC_ACCEPTANCE_CLASS', currentValue: 'COMPLETE_LOCAL_SYNTHETIC', kind: 'PROJECT', establishedBy: 'D-54 / D-59 (no DEV acceptance; Phase 9B/10B require separate authorization)', requiredInReadme: true },
  { key: 'SEMANTIC_DEV_RESULT', currentValue: 'NOT_PROVEN', kind: 'PROJECT', establishedBy: 'D-54 (contained DEV semantic acceptance is unproven)', requiredInReadme: true },
  { key: 'PRODUCTION_TRACK_STAGE', currentValue: 'EXTERNAL_PREREQUISITE_UNMET', kind: 'PROJECT', establishedBy: 'src/core/productionTrack/stages.ts', requiredInReadme: true },
  { key: 'EXACT_CHECKPOINT_CI_LANE', currentValue: 'PROVEN', kind: 'LANE_CLASS', establishedBy: 'config/validation-lane-state.v1.json (executed: GitHub Actions run 34705274649 at 66df26b7)', requiredInReadme: true },
  { key: 'OWNER_MANUAL_LANE', currentValue: 'UNAVAILABLE_CAPABILITY', kind: 'LANE_CLASS', establishedBy: 'config/validation-lane-state.v1.json (never executed)', requiredInReadme: true },
  { key: 'LIVE_APP_SMOKE_LANE', currentValue: 'UNAVAILABLE_CAPABILITY', kind: 'LANE_CLASS', establishedBy: 'config/validation-lane-state.v1.json (never executed)', requiredInReadme: true },
  { key: 'DEPENDENCY_ADVISORY_LANE', currentValue: 'PROVEN', kind: 'LANE_CLASS', establishedBy: 'config/validation-lane-state.v1.json (executed 2026-09-12; one low, unreachable vue advisory)', requiredInReadme: true },
]);

/** The explicit form that makes a status line historical, with its checkpoint. */
export const STATUS_HISTORICAL_MARKER_PREFIX = '<!--status:historical' as const;
const STATUS_HISTORICAL_MARKER = /<!--status:historical[^>]*?(?:\d{4}-\d{2}-\d{2}|[0-9a-f]{7,40})[^>]*?-->/;

export function normalizeStatusValue(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/**
 * A line explicitly names the checkpoint it describes when it carries a date,
 * a seven-or-more-character SHA, a historical marker, or a historical word.
 * The word list is deliberately small and the check is deliberately lenient in
 * this direction: a false "historical" classification leaves a stale-looking
 * line unpunished, while a false "current" classification would fail correct
 * historical prose.
 */
export function isHistoricalStatusLine(line: string): boolean {
  if (STATUS_HISTORICAL_MARKER.test(line)) return true;
  if (/\d{4}-\d{2}-\d{2}/.test(line)) return true;
  if (/\b[0-9a-f]{7,40}\b/.test(line)) return true;
  return /supersed|previously|at the time|terminal|archiv/i.test(line);
}

export const STATUS_VIOLATION_REASONS = ['STALE_STATUS_WORD'] as const;
export type StatusViolationReason = (typeof STATUS_VIOLATION_REASONS)[number];

export interface GovernedStatusViolation {
  readonly documentPath: string;
  readonly line: number;
  readonly key: string;
  readonly statedValue: string;
  readonly currentValue: string;
  readonly reason: StatusViolationReason;
}

export interface GovernedStatusCheckResult {
  readonly schemaVersion: typeof STATUS_LEDGER_VERSION;
  readonly documentsChecked: number;
  readonly governedStatementsFound: number;
  readonly violations: readonly GovernedStatusViolation[];
  readonly holds: boolean;
}

interface StatusOccurrence {
  readonly key: string;
  readonly value: string;
}

/**
 * Every governed status statement on a line. Two forms are recognized, because
 * a status is stated as a field in prose and as a table cell in the current
 * truth tables:
 *
 *     PHASE_8_STATUS: COMPLETE
 *     PHASE_8_STATUS = COMPLETE
 *     | `PHASE_8_STATUS` | `COMPLETE_VIA_SUCCESSFUL_RETRY_R1` |
 */
export function governedStatusOccurrences(line: string): readonly StatusOccurrence[] {
  const occurrences: StatusOccurrence[] = [];
  for (const entry of GOVERNED_STATUS_KEYS) {
    const table = new RegExp(`\\|\\s*\`?${entry.key}\`?\\s*\\|\\s*\`([^\`]+)\``);
    const tableMatch = table.exec(line);
    if (tableMatch !== null && tableMatch[1] !== undefined) {
      occurrences.push(Object.freeze({ key: entry.key, value: normalizeStatusValue(tableMatch[1]) }));
    }
    const field = new RegExp(`\\b${entry.key}\\b\\s*[:=]\\s*\`?\\s*([A-Za-z0-9_]+)`);
    const fieldMatch = field.exec(line);
    if (fieldMatch !== null && fieldMatch[1] !== undefined) {
      occurrences.push(Object.freeze({ key: entry.key, value: normalizeStatusValue(fieldMatch[1]) }));
    }
  }
  return occurrences;
}

/**
 * A stated value is the current value when it equals it or extends it with a
 * parenthetical qualifier, e.g. `COMPLETE (HARDENED_LOCAL_SOURCE_SYNTHETIC)`.
 * The ledger's value is the required prefix; the extension cannot change the
 * meaning of the head.
 */
export function statusValueIsCurrent(statedValue: string, currentValue: string): boolean {
  if (statedValue === currentValue) return true;
  return statedValue.startsWith(`${currentValue}_`);
}

export function checkGovernedStatusWords(
  documents: readonly { readonly path: string; readonly text: string }[],
): GovernedStatusCheckResult {
  const ledger = new Map(GOVERNED_STATUS_KEYS.map((entry) => [entry.key, entry.currentValue]));
  const violations: GovernedStatusViolation[] = [];
  let statements = 0;
  for (const document of documents) {
    const lines = document.text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      for (const occurrence of governedStatusOccurrences(line)) {
        statements += 1;
        const currentValue = ledger.get(occurrence.key);
        if (currentValue === undefined) continue;
        if (statusValueIsCurrent(occurrence.value, currentValue)) continue;
        if (isHistoricalStatusLine(line)) continue;
        violations.push(Object.freeze({
          documentPath: document.path,
          line: index + 1,
          key: occurrence.key,
          statedValue: occurrence.value,
          currentValue,
          reason: 'STALE_STATUS_WORD',
        }));
      }
    }
  }
  return Object.freeze({
    schemaVersion: STATUS_LEDGER_VERSION,
    documentsChecked: documents.length,
    governedStatementsFound: statements,
    violations: Object.freeze(violations),
    holds: violations.length === 0,
  });
}
