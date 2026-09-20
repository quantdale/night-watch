# Exhaustive Nightwatch repository audit ledger

## Audit identity

- Campaign: `nightwatch-exhaustive-repository-audit-proposals-v1`
- Starting commit: `34517c9ba11c97407168fe5879ee03794dfff3e3`
- Starting tree: `9b6c1982251e2afa70877745b7787284e9f96a52`
- Tracked-path inventory SHA-256: `939fe42065e7923e9dfd56eb46bfda38c8a2bb2e40127accc8efed75ab6a77f6`
- Tracked paths: `2,593`
- Scope: Nightwatch repository only; local read-only inspection and deterministic synthetic validation
- Write boundary: this task's continuity and OpenSpec planning artifacts only
- Product implementation: not authorized

## Evidence precedence

1. Current deterministic tests and runtime evidence.
2. Current implementation and configuration.
3. Current published OpenSpec requirements and active change artifacts.
4. Active task state and plans.
5. Durable architecture, safety, decisions, roadmap, and historical handoffs.

A candidate is not a finding until current evidence establishes its failure mode, reachability, and consequence. Historical prose, TODOs, skipped tests, advisories, or suspicious patterns are leads only.

## Candidate lifecycle

`OBSERVED -> SUBSTANTIATED -> MATERIAL -> PROPOSED`

Terminal alternatives: `DUPLICATE`, `NOT_AN_ISSUE`, `NON_MATERIAL`, or `DEFERRED_EXTERNAL_EVIDENCE`.

Every candidate record must contain: stable ID, affected paths, subsystem, failure mode, trigger/reachability, consequence, existing mitigations, evidence, severity dimensions, confidence, existing-plan comparison, disposition, and owning proposal when material.

## Severity rubric

| Dimension | Questions |
|---|---|
| Safety/privacy | Can this bypass owner policy, containment, authorization, redaction, provenance, or secret/customer-data boundaries? |
| Correctness/integrity | Can it fabricate success, lose or corrupt evidence/state, misclassify a finding, or violate a deterministic contract? |
| Blast radius | Does it affect one optional tool path, one campaign, every local run, or a durable release/continuity authority? |
| Reachability | Is the trigger ordinary, adversarial but authorized, configuration-dependent, or blocked by a stronger boundary? |
| Likelihood/recurrence | Is it deterministic, race-dependent, scale-dependent, stale-state-dependent, or only theoretical? |

Severity and evidence confidence are recorded separately. Critical/High requires a credible reachable path to the claimed consequence.

## Frozen tracked-tree coverage denominator

The following top-level classes are exhaustive and mutually exclusive for the starting snapshot. Counts sum to `2,593`.

| Class | Tracked paths | Planned inspection | Status | Candidate IDs | Final disposition |
|---|---:|---|---|---|---|
| `.agent/` | 781 | continuity-v2 tasks, templates, execution handoff, historical/current authority | PENDING | — | — |
| `src/` | 626 | all runtime subsystems and trust boundaries | PENDING | — | — |
| `openspec/` | 417 | published specs, active changes, archive/deduplication, schema validity | PENDING | — | — |
| `tests/` | 410 | unit/browser/smoke/manual/helpers/fixtures, assertion strength and gaps | PENDING | — | — |
| `bin/` | 118 | CLI, gates, validators, generators, session/workspace/release tooling | IN_PROGRESS | NW-AUD-001, NW-AUD-004, NW-AUD-005, NW-AUD-006, NW-AUD-007, NW-AUD-008, NW-AUD-009, NW-AUD-010 | Phase 23 workflow guard, clean-checkout toolchain/receipt path, evidence-retention apply/receipt path, C-00 session mutator authority, change-shadow compiler/bootstrap, ignored report/receipt publication, and release evidence lineage inspected; remaining bin surfaces pending |
| `corpus/` | 113 | fixture/corpus integrity, authority separation, generated/historical boundaries | PENDING | — | — |
| `docs/` | 40 | architecture, safety, decisions, roadmap, current-state and design truth | IN_PROGRESS | — | — |
| `ui/` | 32 | Control Center static UI, accessibility, responsive and interaction behavior | PENDING | — | — |
| `config/` | 26 | environment, workspace, gates, policies, registries and bounds | IN_PROGRESS | NW-AUD-002, NW-AUD-004 | gate/universe/lane/dependency records inspected; exact runtime identity is absent; remaining configuration pending |
| Root and integration files | 30 | manifests, lockfile, TypeScript/Playwright configs, CI, env example, scenarios and agent integrations | IN_PROGRESS | NW-AUD-001, NW-AUD-002, NW-AUD-003, NW-AUD-004 | package, TypeScript, Playwright, CI workflow, runtime selector, and validation topology inspected; remaining root surfaces pending |

### `src/` subsystem denominator

| Subsystem | Tracked paths | Audit wave | Status |
|---|---:|---|---|
| `src/core/` | 465 | M2/M3/M4/M5/M7 by responsibility | PENDING |
| `src/oracles/` | 54 | M4 | PENDING |
| `src/controlCenter/` | 43 | M6 | PENDING |
| `src/browser/` | 14 | M2/M3 | PENDING |
| `src/products/` | 12 | M3 | PENDING |
| `src/data/` | 11 | M3/M5 | PENDING |
| `src/api/` | 10 | M3 | PENDING |
| `src/proxy/` | 9 | M2 | PENDING |
| `src/auth/` | 6 | M2 | PENDING |
| `src/state/`, `src/mcp/` | 2 | M3/M5 | PENDING |

### `tests/` denominator

| Test class | Tracked paths | Status |
|---|---:|---|
| `tests/unit/` | 372 | PENDING |
| `tests/manual/` | 12 | PENDING |
| `tests/helpers/` | 8 | PENDING |
| `tests/browser/` | 7 | PENDING |
| `tests/smoke/` | 5 | PENDING |
| `tests/fixtures/` | 5 | PENDING |
| `tests/globalSetup.ts` | 1 | PENDING |

## Existing planning authority index

The starting tree contains 50 published capability specs and 10 non-archived OpenSpec changes. Status reported by `openspec list --json` at activation:

- Complete: `nightwatch-current-source-unknown-yield-w12-v1`, `nightwatch-certification-closure-and-validation-integrity-v1`, `nightwatch-validation-classification-and-skip-truth-v1`, `nightwatch-published-spec-baseline-integrity-v1`, `nightwatch-continuity-live-waypoint-binding-v1`.
- In progress: `nightwatch-production-completion-programme-v1`, `nightwatch-autonomous-yield-proof-w11-v1`, `nightwatch-control-center-design-system-v1`, `nightwatch-autonomous-bug-hunting-programme-v1`, `nightwatch-production-observability-system-map-master-plan-v1`.

An existing change counts as duplicate coverage only when its normative requirements and tasks close the exact observed failure mode. Status labels and title similarity are insufficient.

## Durable document read ledger

| Document | Coverage | Audit-relevant authority extracted | Status |
|---|---|---|---|
| `AGENTS.md` | complete | C-00 ownership, source precedence, owner scope freeze, task/continuity/project-state protocols, destructive/deletion policy | COMPLETE |
| `docs/SAFETY_MODEL.md` | complete (1–1,656) | fail-closed host/action/redaction rules; L0–L6 boundaries; auth/private-store/reasoner constraints; semantic/source and self-development authority partitions; historical versus current acceptance evidence | COMPLETE |
| `docs/ARCHITECTURE.md` | complete (1–2,325) | module map and run lifecycle; authority/data-flow boundaries; source/semantic/campaign/Control Center architectures; current L6 and reviewer/review-store designs; relocated inventory explicitly historical | COMPLETE |
| `docs/CURRENT_STATE.md` | complete through line 4,186 | `OPERATIONALLY_ACCEPTED`; current project-state and live-task blocks are mechanically owned; CI non-evidence is distinct from local validation; historical counts and anchors cannot be treated as live facts; NW-01–NW-14 and later Control Center closures prevent duplicate proposals | COMPLETE |
| `docs/DECISIONS.md` | complete decision-title inventory; foundational decisions and current D-101–D-138 authority bodies inspected, with older phase decisions cross-checked through Safety/Architecture/Current State | C-00, exact-head CI, validation, dependency, privacy, owner-scope, and current yield decisions constrain remediation; historical duplicated IDs use E-1 aliases | COMPLETE |
| `docs/ROADMAP.md` | complete phase/current-section inventory; current production/yield/Control Center sections inspected and historical phase authority cross-checked through Current State | current open work is explicitly separated from completed historical phases; W12 is partial/provider-blocked; configuration/bin-typecheck/release items already belong to the production-completion programme | COMPLETE |

No documentation inconsistency is admitted as a finding merely because historical prose differs from current machine truth. A candidate requires evidence that a current consumer trusts the stale statement or that required durable truth is internally contradictory.

## Finding ledger

| ID | State | Severity | Confidence | Subsystem | Summary | Evidence | Existing-plan relation | Owning change |
|---|---|---|---|---|---|---|---|---|
| NW-AUD-001 | PROPOSED | Medium | High | CI / supply chain / hardening | Authoritative CI executes two mutable `@v4` action refs, while the enforcing rule accepts an unanchored substring and can admit lookalike owners or suffixed refs | `.github/workflows/hardening.yml:22,26`; `bin/lib/hardening/rules/validation-and-gates.mjs:239-240`; probe registry has no action-identity mutation | No existing published requirement or active change pins third-party actions; exact-head CI spec is extended rather than duplicated | `nightwatch-ci-action-supply-chain-integrity-v1` |
| NW-AUD-004 | PROPOSED | Medium | High | clean/CI certification / toolchain supply chain / reproducibility | CI selects the moving major `20`; clean certification may execute unlocked `node@20` before the gate; receipts record only `nodeMajor`, so different Node/npm identities can produce indistinguishable certification evidence | `.github/workflows/hardening.yml:28`; `bin/quality-gate-clean.mjs:65-90,128-135,192-213`; `tests/unit/gateReceiptPersistence.test.ts:500-508`; `rg --fixed-strings node@20` finds no lock/manifest owner | Existing specs require a fresh supported Node 20 checkout but do not bind an exact version, payload integrity, pre-install admission, or receipt parity; CI action pinning is a prerequisite, not duplicate coverage | `nightwatch-exact-runtime-toolchain-identity-v1` |
| NW-AUD-005 | PROPOSED | Medium | High | evidence retention / irreversible mutation / audit receipts | Apply durably records only an empty `STARTED` deleted set before removing every candidate, then best-effort overwrites the same receipt; a crash loses per-target truth and final-write failure can still return `APPLIED` with exit zero | `bin/evidence-retention.mjs:304-315,392-422,453-460`; `tests/unit/evidenceRetention.test.ts:153-264`; production-completion `evidence-lifecycle-hygiene/spec.md:32-44` | Existing retention ownership requires deletion recording and normal-path tests, but no active/published requirement owns crash-consistent per-target outcomes, exclusive apply, incomplete-operation recovery, or non-success on finalization failure | `nightwatch-retention-crash-consistent-receipts-v1` |
| NW-AUD-006 | PROPOSED | High | High | C-00 session/worktree ownership / integration | Every lifecycle command accepts arbitrary `--root`; release rewrites the selected live record without caller binding, and integrate treats the selected target's `OWNED_SESSION` class as sufficient to reach its fetch/push path | `bin/nightwatch-session.mjs:86-134,398-416,469-531,654-735`; canonical-CWD dry runs against the live audit session planned both record replacement and fast-forward integration; current `workspaceIsolation.test.ts` proves direct second-claim refusal but has no foreign-release/integrate matrix | Published C-00 requires one writer/session and owner-only lifecycle actions, but no active change binds mutation invocation to current checkout/session or serializes record revisions | `nightwatch-session-mutation-authority-binding-v1` |
| NW-AUD-007 | PROPOSED | Medium | High | change intelligence / offline compiler bootstrap / derivative lifecycle | The offline `change:shadow` path invokes `npx tsc` twice, so missing local dependencies can trigger remote moving-package resolution; it deletes a fixed shared compile root before compiler admission, allowing refusal-time mutation and concurrent-run interference | `bin/change-intelligence.mjs:20-62,132-136`; `package-lock.json` exact `node_modules/typescript` 5.9.3 entry; worktree has no local TypeScript; `tests/unit/cliImplementationContract.test.ts:423-430` exercises help only | Completed source-runtime hardening preserved different compiler semantics but did not authorize package resolution; exact certification toolchain explicitly excludes arbitrary developer commands; generic CLI output/argument work is separate | `nightwatch-change-shadow-offline-runtime-integrity-v1` |
| NW-AUD-009 | PROPOSED | Medium | High | local ignored artifacts / report and certification-receipt publication | Six current-report writers truncate directly after recursive directory creation, and gate topology directly writes millisecond-named receipts; prepared links can redirect writes, interrupted replacement can destroy the last complete report, and same-millisecond runs can overwrite history | `bin/{cache-key-contract,record-identity,release-freshness,silent-zero-output,test-oracle-quality,change-intelligence,gate-topology}.mjs`; `src/core/schemaLifecycle/declarations.ts`; `.gitignore`; direct-write census and existing publisher comparison | Retention journal, gate-receipt transport, private stores, schema export, and generic CLI contracts have different authority or scope; no active change owns the complete seven-writer ignored-artifact boundary | `nightwatch-local-report-publication-integrity-v1` |
| NW-AUD-010 | PROPOSED | High | High | project release certification / Git evidence provenance | A raw `MET` condition is invalidated only when its evidence is a strict ancestor; null, later `HEAD`, missing, future, and divergent evidence retain MET, while Git negative and operational failure are collapsed | `src/core/releaseCertification/index.ts:350-381`; `bin/project-state-check.mjs:1012-1028`; `config/release-certification.v1.json`; `tests/unit/projectState.test.ts:1726-1818` | Production-completion defines release binding but its implemented/tested rule covers only stale ancestors; CI/toolchain changes bind different identities | `nightwatch-release-evidence-lineage-integrity-v1` |

## M1 candidate dispositions

| ID | State | Summary | Decisive evidence | Disposition |
|---|---|---|---|---|
| NW-AUD-001 | PROPOSED | Mutable CI action identity plus substring-allowlist false negative | Current workflow uses `actions/checkout@v4` and `actions/setup-node@v4`; current regex `/actions\/(?:checkout|setup-node)@v4/` is unanchored, so `evil/actions/checkout@v4` and `actions/checkout@v4-suffix` match; action code runs before repository-owned gate | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-002 | DUPLICATE | `bin/**` is parse-checked but its strict typecheck lane remains reporting-only | `config/bin-typecheck.v1.json` is `REPORTING`; authoritative gate `STATIC` runs root `typecheck` only; production-completion tasks 15.7 and 15.11 explicitly require full conformance and blocking registration | Exact failure mode already owned by `nightwatch-production-completion-programme-v1`; no duplicate change |
| NW-AUD-003 | NOT_AN_ISSUE | Historical concern that tests/checks could sit outside authoritative manifests | `npm run validation:universe` discovers 494 checks: 257 authoritative + 237 explicitly classified + 0 unclassified; digest `sha256:039d60d15518fc56c463d66b` | Current NW-08 mechanism closes the historical R-12 lead |
| NW-AUD-004 | PROPOSED | Major-only runtime selection plus an unlocked pre-gate clean resolver and major-only receipts | CI uses `node-version: 20`; clean fallback invokes `npm exec --yes --package=node@20`, which is absent from `package-lock.json`; it accepts any Node 20 patch and returns only `nodeMajor`; the outer PASS receipt has `nodeRequirement: '20'` and no Node/npm version or payload identity; existing receipt test checks transport/digest disagreement only | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-005 | PROPOSED | Irreversible retention deletion is not transactionally bound to durable per-target/terminal truth | The initial receipt records `status: STARTED` and `deletedSet: []`; all candidates are then removed before one final overwrite; `writeReceipt` catches every error and returns null; the returned result remains `APPLIED`/`PARTIAL` with `receiptFinalized: false`, while the CLI exits non-zero only for `BLOCKED`; current tests cover only the successful path | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-006 | PROPOSED | C-00 mutators authorize a selected target record rather than the invoking session | `parseArgs` admits `--root` for all commands and `main` resolves it before dispatch; `release` replaces that record without checking `OWNED_SESSION` or caller context; `integrate` checks only the selected target's class and can fetch/push it; from canonical, zero-mutation dry runs against the live audit session emitted `SESSION_RELEASE_RECORD REPLACE ...` and `SESSION_INTEGRATION_READY` | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-007 | PROPOSED | An offline operator command can acquire/execute an ungoverned compiler and mutates a shared derivative root before admission | `compileCore()` first recursively removes and recreates `.tmp-nightwatch/change-intelligence`, then invokes bare `npx tsc` twice; the exact locked TypeScript package is not installed in this worktree, and the existing process test exits through `--help` before compilation | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-008 | DUPLICATE | `change:shadow` accepts no governed shared CLI parser and prints its machine-specific absolute `outputPath` | The entrypoint checks only whether `--help`/`-h` occurs anywhere, ignores every other argument, and serializes absolute `outputPath`; production-completion `operator-cli-contract` already requires every `bin/*.mjs` to share parsing, reject unknown arguments before effects, and omit machine-specific paths | Exact failure class already owned by `nightwatch-production-completion-programme-v1`; no duplicate change |
| NW-AUD-009 | PROPOSED | Ignored local reports and topology receipts bypass safe publication | Five fixed `current.json` writers plus change-intelligence call `mkdirSync` then direct `writeFileSync`; gate topology does the same with `${Date.now()}.json`; schema declarations classify the outputs as persisted/private, while no complete inventory or guard prevents bypass | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-010 | PROPOSED | Release evidence is not required to equal the certified checkpoint | The evaluator changes MET only for a strict ancestor; null/HEAD-descendant/missing/future/divergent identities remain MET, and `gitReadOnly(...merge-base...) !== null` cannot distinguish ordinary non-ancestry from object/command failure; tests set all-met ancestry to false and probe only one stale ancestor | MATERIAL → dedicated strictly-valid OpenSpec change |

NW-AUD-001 severity is Medium rather than High: compromise or malicious
movement of an upstream action identity is an external precondition, and the
workflow grants only `contents: read`. Impact is nevertheless material because
the action can read private source and alter the workspace/conditions observed
by the later authoritative gate.

NW-AUD-004 severity is Medium rather than High: the ordinary consequence is
unreproducible or disagreeing certification rather than direct owner-policy
bypass, and exploitation of the clean bootstrap requires upstream/cache
compromise or operator execution on a non-20 host. It remains material because
the moving executable is selected before the repository gate, is outside the
project lockfile, and exact runtime disagreement is absent from authoritative
receipts. The proposal intentionally separates this selected-toolchain identity
from NW-AUD-001's setup-action code identity and requires both controls.

NW-AUD-005 severity is Medium rather than High: apply is an explicit,
non-interactive-refused owner operation over candidates already proven
unreferenced, so the defect does not broaden deletion eligibility or bypass an
external trust boundary. It is nevertheless material because deletion is
irreversible, the failure can deterministically report process success without
the required final record, and interruption can leave the only durable receipt
claiming an empty deleted set. The remediation preserves uncertainty across
the unavoidable post-delete/pre-outcome crash window rather than fabricating
atomicity.

NW-AUD-006 severity is High rather than Critical: a local process sharing the
owner's OS account and Git credentials is a prerequisite, and repository-only
coordination cannot claim hostile same-user isolation. Within Nightwatch's
actual multi-agent concurrency model, however, the path is direct and requires
no record corruption: a foreign checkout can release another live owner,
enable adoption, or invoke that session's fast-forward integration path. That
undermines the primary C-00 isolation and release checkpoint, can publish
unreviewed committed work, and is absent from the current adversarial suite.

NW-AUD-007 severity is Medium rather than High: an operator must explicitly
run the shadow command in a dependency-missing or resolution-divergent
checkout, and the ordinary consequence is ungoverned local code execution or
an unavailable/corrupted local report rather than direct product authority.
It remains material because the command's documented offline boundary is
false at its first compiler action, the selected package is not constrained by
the lockfile on that path, and a fixed derivative root is mutated before the
compiler is admitted. The proposal preserves full-program compilation rather
than silently weakening the command to per-file transpilation.

NW-AUD-009 severity is Medium rather than High: each path requires an explicit
local command and a prepared unsafe workspace or rare collision, and the
ignored reports ordinarily carry sanitized/recomputable local truth rather
than product credentials or external write authority. It remains material
because a link can redirect a direct write into an owner file, interruption can
destroy the only preceding complete report, and topology collisions can erase
certification history while reporting normal success. The proposal preserves
intentional explicit output selection but requires safe file identity and
separates atomic current replacement from immutable receipt authority.

NW-AUD-010 severity is High rather than Critical: it does not itself make a
failing check pass, choose the pending owner status, or grant product/external
authority. It is nevertheless the central durable release-certification gate,
and the defect lets absent or different Git objects be represented as evidence
for the certified checkpoint. A future advance can therefore satisfy every raw
check while bypassing the exact-lineage condition that makes the verdict about
those bytes rather than another tree.

## Validation ledger

| Command/evidence | Result | Purpose |
|---|---|---|
| `npm run session:status` | PASS | Owned current C-00 worktree; canonical safe |
| `npm run agent:check` | PASS with pre-existing unrelated warnings | Continuity-v2 and workspace routing |
| `openspec status --change nightwatch-exhaustive-repository-audit-proposals-v1` | 4/4 complete | Umbrella change is apply-ready |
| `openspec validate nightwatch-exhaustive-repository-audit-proposals-v1 --strict` | PASS | Umbrella schema/requirements validity |
| `git ls-files` inventory | 2,593 paths; top-level counts reconcile | Frozen coverage denominator |
| `npm run validation:universe` | PASS; 494 discovered / 257 authoritative / 237 classified / 0 unclassified | Close historical manifest-coverage lead |
| `npm run quality-gate:spec` | PASS; 12 required groups / 149 compatibility files | Confirm current gate definition |
| `npm run gate:inventory` | PASS; authoritative workflow command count 1 / 257 unique test files / 0 duplicate executions | Confirm current gate topology |
| `npm run typecheck:bin` | ENVIRONMENT UNAVAILABLE in owned worktree: no `node_modules/typescript`; no dependency install authorized | Not a product failure; static configuration and existing recorded ownership used |
| `npm run schema:check`, `npm run hardening:check`, `npm run project:check` | ENVIRONMENT UNAVAILABLE for the same absent local TypeScript toolchain | Deferred to a dependency-equipped validation checkpoint; `workspace:check` remained PASS |
| `openspec validate nightwatch-ci-action-supply-chain-integrity-v1 --strict` | PASS; 4/4 artifacts complete | NW-AUD-001 remediation is apply-ready |
| `openspec validate nightwatch-exact-runtime-toolchain-identity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-004 remediation is apply-ready |
| `openspec validate nightwatch-retention-crash-consistent-receipts-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-005 remediation is apply-ready |
| canonical-CWD `release --root <live-session> --dry-run` | REPRODUCED; planned live ownership-record replacement; zero mutation | Establish NW-AUD-006 reachability safely |
| canonical-CWD `integrate --root <live-session> --dry-run` | REPRODUCED; planned foreign session fast-forward; zero fetch/push | Establish NW-AUD-006 integration reachability safely |
| `openspec validate nightwatch-session-mutation-authority-binding-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-006 remediation is apply-ready |
| static `change:shadow` compiler/lock/test ownership inspection | SUBSTANTIATED WITHOUT EXECUTION; normal path calls `npx tsc` twice, local TypeScript absent, full process coverage help-only | Establish NW-AUD-007 while avoiding the remote-capable path |
| `openspec validate nightwatch-change-shadow-offline-runtime-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-007 remediation is apply-ready |
| static seven-writer/schema/path/publisher inspection | SUBSTANTIATED WITHOUT ARTIFACT MUTATION; six current-report writers and one topology receipt writer publish directly with no complete guard | Establish NW-AUD-009 and its exact denominator safely |
| `openspec validate nightwatch-local-report-publication-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-009 remediation is apply-ready |
| static release evaluator/Git adapter/config/test inspection | SUBSTANTIATED READ-ONLY; only stale ancestors override MET and the other relation classes are untested/unrejected | Establish NW-AUD-010 without editing release truth |
| `openspec validate nightwatch-release-evidence-lineage-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-010 remediation is apply-ready |

## Completion audit

Not yet eligible. Most coverage rows remain pending, M1 still has uninspected
bin/config/generator/release/checkpoint surfaces, and later runtime/UI/test waves
have not started. Seven material findings currently map one-to-one to seven
strict-valid issue-specific remediation changes; that partial portfolio is not
evidence of whole-repository completeness.
