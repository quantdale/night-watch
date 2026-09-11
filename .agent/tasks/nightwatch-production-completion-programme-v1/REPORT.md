# REPORT — nightwatch-production-completion-programme-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Task ID: nightwatch-production-completion-programme-v1
Status: IN_PROGRESS

Evidence ledger for this campaign. It records what was actually run and
observed, not what was intended. Receipts are written as they are produced.

## Campaign identity

- Task: `nightwatch-production-completion-programme-v1`
- Session branch: `session/nightwatch-production-completion-3d648499`
  (session `sess-506a5055dcc2`, base `fe6226ad`)
- Starting SHA: `36bd4930db978423f97e16f35250c2e66bfa112c`
- Scope: the 21 task groups of
  `openspec/changes/nightwatch-production-completion-programme-v1/`.

## Planning checkpoint

Task directory, routing block and READY_FOR_EXECUTION handoff authored and
committed at `fe6226ad` before any implementation. The owned session was
created from that base and claimed; `session:status` reported PASS with
`class=OWNED_SESSION`.

## G1 — ledger truth and the spec baseline

Measured baseline at the session base: `openspec list` reported 57 changes,
17 with unchecked boxes (409 open including this programme's new 247), 149
task directories, 31 legacy v1 records, `openspec/specs/` absent.

Task/change pairing: 16 changes were divergent from continuity-v2 task
truth (14 terminal COMPLETE, 1 terminal BLOCKED, 1 IN_PROGRESS parked);
1 change (`nightwatch-production-observability-system-map-master-plan-v1`)
has open boxes and no task record, reported as `LEDGER_CHANGE_WITHOUT_TASK`.

Reconciliation: 119 boxes ticked only where the task STATE/REPORT/PLAN
records the work, 12 entries struck through with reasons, and 2 genuinely
undone entries carried verbatim into this programme (`CF-1` fuzz ≥20 cases;
`CF-2` local-model canary conditional). A machine check of the reconciliation
diff confirmed only checkbox state, strikethrough annotations and reasons
changed; no receipt, SHA, count or date was altered. The
`nightwatch-final-assurance-release-readiness-hardening-v1` open entry was
reconciled as BLOCKED with the L6 containment blocker preserved.

Agreement check: `bin/lib/openspec-ledger.mjs` now owns the parser and the
`inspectLedgerAgreement` diagnostics
(`LEDGER_TERMINAL_TASK_HAS_OPEN_ITEMS`, `LEDGER_CHANGE_WITHOUT_TASK`,
`LEDGER_TASK_WITHOUT_CHANGE`, `LEDGER_LEGACY_CHANGE`); `bin/agent-state.mjs`
runs it inside the required `AGENT_CONTINUITY` gate group. In reporting mode
over the whole tree it produced zero false positives;
`tests/unit/productionCompletionOpenWork.test.ts` negative-probes a terminal
task with an open box and proves a declared strikethrough is accepted.

Spec archive-validity: 41 historical change specs were structurally
repaired (headers, requirement bodies with SHALL/MUST, and scenarios derived
from their own wording; no prose deleted). `openspec validate --all` now
reports 59 passed / 0 failed.

Archiving and baseline: 54 terminal changes archived oldest-first; 56
capability specs published in `openspec/specs/`; the archive halted at the
first rebuilt-spec failure (`nightwatch-dev-soak-replay-yield-v1`) and only
resumed after repair — never with `--no-validate`.
`nightwatch-final-assurance-release-readiness-hardening-v1` is archived with
`--skip-specs` because it is terminal BLOCKED and its delta describes
undelivered behaviour; every classification is in
`openspec/changes/archive/ARCHIVE-INDEX.md`.

Open-work report: `npm run status:local` now renders
`nightwatch.open-work-report.v1` per non-terminal campaign from the same
parser (`src/core/readiness/openWork.ts`), with the open count net of
declared entries and the blocker's internal/external class; the JSON
document remains a single readiness model plus the derived `openWork`
section, stable across runs.

Validation receipts: `npm run typecheck` PASS; `bin/hardening-check.mjs`
PASS; `npm run validation:universe` PASS (discovered=434, unclassified=0,
digest refreshed); the focused suite 11 passed; `openspec validate --all`
59/0. `agent:check` reports zero ledger errors and one error:
`WORKSPACE_CANONICAL_DIRTY_WHILE_SESSION_LIVE`, caused by a concurrent
untracked planning artifact in the canonical checkout that belongs to
another writer. G1.18 integration and `gate:local` are therefore pending the
canonical checkout becoming clean.

## Current status

IN_PROGRESS. G1.1–G1.17 are complete with the receipts above; G1.18
integration is externally blocked as described. No completion claim is
made.

## G21 owner-held items — authenticated-capability documentation and the one-evaluator rule

Closed the two owner-held items of group 21 that remain after the
implementation (F-21). No code in `src/auth/capabilityLifecycle.ts` was
changed; the work is documentation plus one structural rule.

Documentation (derived from the implementation, not restated intent):
`README.md` gained an "Authenticated capability and its renewal" section;
`docs/SAFETY_MODEL.md` gained a closing "Authenticated capability lifecycle
safety boundary (F-21)" section (append-only, no archived line touched); and
`docs/HOST-CAPABILITY-MATRIX.md` §2 gained the owner-captured authenticated
storage-state row with its `UNAVAILABLE_CAPABILITY` acquisition condition.
All three state the sidecar fields and the no-secret redaction refusal, the
pre-flight before any browser/subprocess/socket/file, the six lifecycle
states with the single re-capture remedy, that `UNKNOWN_AGE` refuses, that no
automated renewal exists or is planned (it would require Nightwatch to hold
credentials), and the measured-cadence rule: as of the 2026-09-12 measurement
the owner-local store holds one artefact and no lifecycle record, so the
state is `UNKNOWN_AGE` and no renewal cadence is claimed.

Structural rule `checkAuthenticatedCapabilitySingleEvaluator` in
`bin/hardening-check.mjs`: code-only (comments blanked with line numbers
preserved), flags a second cookie-expiry evaluator in `src/`, `bin/` or
`tests/` outside `src/browser/fixtures/storageState.ts` with
`AUTH_CAPABILITY_SECOND_EXPIRY_EVALUATOR <file>:<line>`, asserts the allowed
evaluator still contains detector forms (non-vacuity), and does not match an
object-key write (`expires:`). Reversible probe HC-078 appends a read of
`cookie.expires` as well as a `{ expires: number }` write to
`src/auth/devCredentialProvider.ts`; the campaign detects it, proving the
write does not match and the read does.

Receipts: `node bin/hardening-check.mjs` PASS;
`node bin/hardening-check.mjs --probe-campaign --only=checkAuthenticatedCapabilitySingleEvaluator`
DETECTED HC-078; documentation-currency reporting mode 0 findings; focused
suites `storageState`, `authCaptureLauncher`, `authCaptureStages`,
`nw14HostCapabilityMatrix` and `documentLifecycle` 58 passed.

## G14 — dead architecture closure (14.1–14.5, 14.9–14.11)

The reference graph and both rules live in `bin/hardening-check.mjs`
(`buildReferenceGraph`, `checkSourceReachability`,
`checkModuleBarrierEnforcement`) with data-only
`config/reference-graph.v1.json`; no new `bin/lib` or test file was added, so
`validation:universe` remains on digest `sha256:e04d813efa7aa0bbbb1fa219`.
Resolver coverage: static import/export/require/literal dynamic import, the
bin loader string-literal paths (reusing the F-15 extractor), and
`require.resolve` specifiers. Non-vacuity: zero edges fails
`REFERENCE_GRAPH_EMPTY`; fewer than 100 parsed files fails
`REFERENCE_GRAPH_VACUOUS`. Reachability is forward from executable roots plus
`src` modules with a cross-directory inbound edge, which is what prevents the
two false-positive classes: the Control Center server (reached through the
`bin/nightwatch-control-center.mjs` loader edges) and the self-dev sandbox
planner/executor (reached through the adopt-sandbox loader list and the test
mirror); `require.resolve('vue/dist/vue.js')` is a recorded external edge.
Measured `--report-reachability`: files=1072, parsed=1072, edges=6238,
findings=0.

Retention fails both directions and is probed: HC-079 removes the
dtoFramework entry → unlisted dead modules reported; HC-080 appends a
consumer to a retained module → `REFERENCE_RETENTION_STALE`. Barrel
resolution: `src/core/provenance/index.ts` ENFORCED (five promotion
consumers, one test and five bins migrated; loader declaration regenerated;
HC-081 deep-import probe); nine barrels REMOVED and declared under
`## Declared Deletions` in the programme `SPEC.md` — `controlCenter`,
`campaignIntelligence`, `investigationMemory`, `localInvestigation`,
`ownerLocalReproduction`, `prodProvenance`, `reproductionSurface`,
`selfDevSandbox`, `systemAtlas`. `selfDevSandbox/index.ts` could not be
enforced without re-exporting `setSandboxBaseOverrideForTests`, which
`checkPhase8B01CloseoutIntegrity` forbids; its plan/run entry points remain
asserted directly and `checkPhase8BSandboxBoundary` still polices every
reach into the module. `checkC105ProvenanceAuthorityBoundary` no longer reads
the removed `prodProvenance/index.ts`; its generic TEST-ONLY seam scan
already covers the replacement surface.

Receipts: `node bin/hardening-check.mjs` PASS; `npm run hardening:rules` PASS
(79 rules, 81 probes, 81 detected, 0 undetected, status unchanged);
`npm run typecheck` PASS; `npm run validation:universe` PASS;
`npm run workspace:check` shows `WORKSPACE_DECLARED_DELETIONS=PASS` and
`WORKSPACE_INTEGRATION_READINESS=PASS` with only the pre-existing external
`WORKSPACE_CANONICAL_DIRTY_WHILE_SESSION_LIVE` error; focused suites
`cliImplementationContract`, `selfDevProvenance`, `selfDevAdoptionSandbox`,
`selfDevAdoptionPlan`, `selfDevCanonicalPromotionFlow`,
`selfDevSandboxConfinement`, `projectState` and `nw09ShippedReviewCapability`
191 passed, 1 skipped. The `checkBinExecutionCoverage` probe HC-021 was
repaired (two coverage sites, `all:true`) after concurrent group-21 test work
made its single-file mutation insufficient.

## Owner decision left open — G14.6–G14.8

No adoption or removal of `src/core/dtoFramework/` or
`src/core/adversarialCorpus/` is claimed. Both remain in the
reasoned-retention list of `config/reference-graph.v1.json` with
`reason: G14.6 owner decision OPEN`, so the reachability rule reports them as
owner-pending rather than deciding. Option A (adopt): migrate the four
built-in registrations (semantic evaluation receipt, triage replay plan,
campaign manifest, campaign checkpoint) to the registry and remove each
hand-rolled validator in the same change; consequence: one validator per
schema, but a real migration across the schema-lifecycle group. Option B
(remove): delete both subsystems and declare the deletions under
`## Declared Deletions`; consequence: less code, but no versioned-DTO
authority for the schema-lifecycle work. The safe default is to leave the
decision open, which is what this session did.

## Session result — groups implemented, partials, and owner decisions

Executed in one owned session (`sess-506a5055dcc2`) in parallel workstreams.
Every claim below has its command and result in the group's own tasks.md
records and the agent reports preceding this section.

| Group | Local result |
|---|---|
| G1 ledger truth | COMPLETE except integration (1.18) |
| G2 lane state as data | COMPLETE except integration (2.8) |
| G4 operator CLI | partial: parser, sweep, side-effect freedom, quality-gate migration and derived listing done; 31/63 bins migrated; rule off until all conform |
| G5 evidence hygiene | partial: refusal derivation, negative probe, single Playwright output root, 23-root dry-run and confirmation-token machinery done; reclaim and rule registration owner-held |
| G6 workspace drift | COMPLETE except owner actions 6.4-6.6/6.10 and 6.11 integration |
| G7 documentation currency | COMPLETE except 7.10 integration |
| G10 deployment facts | local guard/reader/track/unloadability/passive proofs done; 10.4 CURRENT_STATE leg, 10.6 access and 10.13 closure owner-held |
| G11 semantic acceptance | class as data, synthetic-never-DEV, auth gate and 9A.1-only route done; 11.3 owner-held |
| G13 release definition | 16 conditions, refusal, staleness, lane counts, production track and honesty record done; 13.8 owner-held |
| G14 dead architecture | reference graph and reachability rules done; 10 barrels resolved; 14.6 adoption/removal owner-held |
| G15 CLI contract | literal paths, path/symbol resolution, non-vacuity, tsconfig.bin.json and 30 executing tests done; 18/63 annotated, lane reporting not blocking |
| G16 rule soundness | code-only accessor, five conversions, quantifier audit, 79-rule registry and 81/81 mutation probes done; line-number retrofit and decomposition open |
| G17 schema lifecycle | 386 identifiers declared across 363 families; dispositions, migration/read-compatible proofs, VERSION_UNSUPPORTED split, export and resume explanation done; hardening registration, 17.4 and integration open |
| G20 accessibility | status/contrast/keyboard/structural lanes on the built bundle done, 0 colour-only and 0 contrast violations; registration pending |
| G21 auth lifecycle | sidecar, fail-closed pre-flight, launcher wiring, observable auth state and single-evaluator rule done; live-smoke scope, cadence measurement (no real capture yet) and integration open |
| G3, G8, G9, G12, G18, G19 | not started this session |

Full offline regression at the session tip: 5009 passed / 18 skipped / 0
failed. UI typecheck, 65 tests and build PASS. `node bin/hardening-check.mjs`
PASS; `npm run validation:universe` PASS (discovered=447, unclassified=0);
`npm run typecheck` PASS. Integration is blocked by
`WORKSPACE_CANONICAL_DIRTY_WHILE_SESSION_LIVE`: the canonical checkout holds
an untracked concurrent planning artifact
(`openspec/changes/nightwatch-control-center-design-system-v1/`) that belongs
to another writer and was not touched. Owner decisions listed in STATE.md
remain decisions to be taken, not work an agent may self-authorize.


