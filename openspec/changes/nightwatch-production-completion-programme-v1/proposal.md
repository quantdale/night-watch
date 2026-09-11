# Proposal — Nightwatch production completion programme

## Why

Nightwatch is locally green and has never done its job. Measured at
`36bd493`: typecheck, `hardening:check`, `project:check`, `agent:check`,
`validation:universe` and `session:status` all PASS; the last validated
implementation carries `gate:local` eleven of eleven groups and a 4,789-test
offline regression. And across W7 through W10 the autonomous programme has
produced **0 admitted findings, 0 strict `EXACT_REDISCOVERY`, and 0
previously-unknown defects**, eighteen of its 432 declared checks have never
executed on any host, exact-head CI has never run a step across eleven
consecutive terminal campaigns, and `POSITIVE_DEPLOYMENT_FACTS` is 0 — which
makes the entire P2/P3 production path structurally unreachable rather than
merely unauthorized.

The project also cannot answer "what is left" from its own records. Fourteen
of the fifteen OpenSpec changes that read as open are terminal COMPLETE in
`.agent` truth, `openspec/specs/` does not exist, and no change has ever been
archived — so 57 proposals and 17,462 lines of append-heavy narrative are the
only statement of what this system is required to do.

A second pass traced the implementation rather than the records — a static
import graph over 1,088 files, the `bin` → `src` dynamic loading boundary, the
persisted-schema surface, the Control Center request and error paths, the
configuration surface and the structural-rule engine. It found nine further
gaps that no document mentions: **904 lines of confirmed dead architecture**,
one of which is precisely the versioned-DTO registry the system's 319 schemas
need; **no static contract at all between the 62-command CLI and the
implementation it loads by string path**; a 4,376-line untyped structural-rule
authority whose five positive assertions can be satisfied by a comment; **no
migration path for any persisted schema**, so one version bump silently orphans
the owner's accumulated review decisions; a **five-value API error taxonomy the
UI computes and never renders**, presenting a contract mismatch as a retryable
blip; nineteen undocumented environment variables, one of which names the
executable to spawn; **no accessibility evidence of any kind** for the only
human-facing surface, whose status encoding is colour; and an authentication
model whose expiry makes overnight autonomy stop working between one night and
the next with no signal.

This programme defines the remaining work to make Nightwatch genuinely
finished and genuinely usable: not more hardening of what is already proven,
but closure of the lanes that have never run, the yield that has never
happened, the facts that block the production path, the code that no longer
has a consumer, the contracts that exist only at runtime, and the truth
surfaces that misreport all of it. See `audit.md` for the measured basis of
every claim here; findings are cited as F-01 … F-21.

## What Changes

**Truth surfaces, so the backlog can be trusted (F-01, F-08).** Reconcile the
fifteen stale OpenSpec change ledgers against continuity-v2 task state, archive
every terminal change, and publish `openspec/specs/` as the first consolidated
capability baseline this project has had. Add a mechanical cross-check so a
change's task boxes and its task `STATE.md` status can never disagree again.
Extend the existing figure-ledger idea from numbers to status words so a
historical status in a 4,000-line archive cannot read as current.

**The four lanes that have never executed (F-02, F-11).** Resolve exact-head
CI to an executed run or a durably recorded block with a named owner action and
revisit condition; add the CI-topology clean gate D-110 identifies as the only
thing that could have caught the two runner-topology defects; execute a
read-only dependency advisory scan under bounded authorized egress, or record
its refusal with the same discipline; and give the 12 owner-manual and 6
live-app-smoke checks an executable, authorization-gated route.

**The yield the product exists for (F-03).** Open the successor wave: strict
`EXACT_REDISCOVERY` against the historical corpus, and a bounded
previously-unknown-defect campaign with mechanical admission, honest
false-positive accounting, and a stated non-result if the yield stays zero.

**BREAKING** — **the production path's real blocker (F-04).** C-08b read-only
`mochi` ingress manifest access is promoted from a deferred row to the
critical-path prerequisite it is. Until `POSITIVE_DEPLOYMENT_FACTS > 0`, C-13
and C-14 are specified as *refused*, not merely unauthorized, and the refusal
is enforced mechanically rather than by convention.

**Operator experience (F-05).** One CLI contract across 62 binaries and 110
scripts: every entry point answers `--help` without side effects, refuses
unknown arguments, and uses one exit-code and JSON-output convention. The
proof is that `quality-gate.mjs local --help` can never again execute a gate.

**Operational hygiene and drift (F-06, F-07).** A bounded, owner-gated evidence
reclaim that actually runs; cleanup of the 19 historical `test-results*` roots
and 4 scratch trees; a claim-staleness rule so a `MAINTENANCE` or `OWNED_SESSION`
claim naming a COMPLETE task is reported as attention rather than PASS; and
closure of the 31 legacy v1 records and 16 undecided branches.

**Residual correctness (F-09, F-10).** Whole-stylesheet dead-rule detection,
native form-control runtime coverage, and the deferred evidence-status colour
taxonomy. Phase 9B/10B contained DEV semantic acceptance gets an explicit
unblock path or a permanent, reasoned closure.

**Dead and unbound architecture (F-13, F-14).** Remove or adopt the two
subsystems nothing references, resolve the eleven module barriers no consumer
imports, and add the reachability rule over source that R-12's totality rule
already provides for tests.

**The CLI-to-implementation boundary (F-15, F-16).** Statically verify all 198
dynamic module paths and the symbols read from them; type-check `bin/**`, which
is 14,000 lines of the surface an operator touches and is excluded from
`typecheck` today; execute every entry point in at least one test, including
the twelve that no test mentions; and make the structural-rule engine sound —
comment-stripped positive assertions, occurrence-complete rules, a mutation
probe per rule, and decomposition of the 4,376-line file.

**BREAKING** — **persisted schema lifecycle (F-17).** Every one of the 319
schemas is declared as persisted or in-memory; a persisted version change must
carry a `MIGRATE`, `READ_COMPATIBLE` or `ORPHAN` disposition; stores gain
`VERSION_UNSUPPORTED` as distinct from `CORRUPT`; and an owner gains a
sanitized export before anything is orphaned.

**The operator's error experience (F-18, F-19).** Render all five API error
kinds distinguishably — a contract mismatch is a defect, not a retry — extend
the differential render harness to the failure path, disclose partial
composition failures, and give the environment surface a declaration,
validation and a printable effective configuration.

**The human surface (F-20).** Status encoding that survives without colour,
measured contrast on the rendered palette, keyboard-complete operator
workflows, and decomposition of the 1,786-line `App.tsx`.

**Authenticated autonomy (F-21).** Lifecycle metadata on every captured
artefact, a pre-flight that refuses an expired or unknown-age one before any
effect, observable authentication state, and the trade-off documented where an
operator reads it.

**A definition of done (F-12).** State mechanically what advances
`PROJECT_COMPLETION_STATUS` beyond `OPERATIONALLY_ACCEPTED`, so a campaign can
be the last one.

Nothing in this proposal weakens the permanent owner scope freeze, the
fail-closed egress policy, the C-00 worktree protocol, the privacy firewall, or
any existing authorization gate. Several capabilities below are explicitly
owner or organizational decisions; those are specified as decisions to be
taken, with their blocking conditions named, not as work an agent may
self-authorize.

## Capabilities

### New Capabilities

- `completion-ledger-truth`: the OpenSpec change ledger, the archived spec
  baseline, and the mechanical agreement between a change's tasks and its
  continuity-v2 task state.
- `validation-lane-closure`: every declared lane resolves to `PROVEN`,
  `BLOCKED_EXTERNAL` or `UNAVAILABLE_CAPABILITY` with live evidence, including
  the CI-topology clean gate and an executable route for the 18 never-run
  checks.
- `exact-head-ci-authority`: an executed exact-head CI run, or a recorded
  external block carrying its run identity, block class, owner action and
  revisit condition — never an uninspected lane and never a projected pass.
- `autonomous-yield-proof`: strict `EXACT_REDISCOVERY` and
  previously-unknown-defect yield, with mechanical admission, false-positive
  control, and an honest stated non-result.
- `deployment-fact-acquisition`: raising `POSITIVE_DEPLOYMENT_FACTS` above
  zero through C-08b read-only manifest access, and the mechanical refusal of
  every production read that would otherwise grant authority from an inference.
- `production-observation-readiness`: what Nightwatch must build and prove
  before C-12/C-13/C-14 can be authorized, and what it must refuse until then.
- `contained-dev-semantic-acceptance`: the Phase 9B/10B unblock path for the
  54-file semantic oracle layer, or its reasoned permanent closure.
- `operator-cli-contract`: one help, argument-refusal, exit-code and output
  contract across every `bin/*.mjs` and every npm script.
- `evidence-lifecycle-hygiene`: bounded, owner-gated, actually-executed
  reclaim of run evidence, scratch trees and historical test-results roots.
- `workspace-continuity-drift-closure`: claim staleness as a first-class
  workspace verdict, plus closure of legacy task records and undecided
  branches.
- `documentation-currency`: a mechanically enforced boundary between current
  truth and the append-only archives, extending the census-figure idea to
  status words.
- `control-center-residual-truth`: whole-stylesheet dead-rule detection,
  native form-control runtime coverage, and the evidence-status colour
  taxonomy.
- `dependency-supply-chain-currency`: an executed advisory assessment, a
  scheduled re-review of the EOL Vue fixture, and a Node/OS support matrix
  bound to evidence.
- `release-definition-and-verdict`: the mechanical definition of done that
  says what advances `PROJECT_COMPLETION_STATUS`.
- `dead-architecture-closure`: reachability over source, the two unreferenced
  subsystems, and the eleven unimported module barriers.
- `cli-implementation-contract`: static verification of the 198 dynamic module
  paths and their symbols, type checking for `bin/**`, and an executing test
  for every entry point.
- `structural-rule-soundness`: comment-proof positive assertions,
  occurrence-complete rules, a mutation probe per rule, and a decomposed,
  type-checked rule authority.
- `schema-version-lifecycle`: persisted-versus-in-memory schema declaration,
  migration dispositions, `VERSION_UNSUPPORTED` as distinct from `CORRUPT`, and
  a sanitized owner export.
- `ui-error-taxonomy-rendering`: all five error kinds rendered
  distinguishably, failure-path coverage in the render harness, and partial
  composition disclosure.
- `configuration-contract`: a declared, validated, printable environment
  surface; schema-validated environment files; and the reasoner executable as a
  documented, validated configuration surface.
- `accessibility-certification`: non-colour status encoding, measured
  contrast, keyboard-complete workflows, and a decomposed `App.tsx`.
- `authenticated-capability-lifecycle`: capture lifecycle metadata, a
  fail-closed pre-flight, observable authentication state, and the documented
  renewal cadence.

### Modified Capabilities

None. `openspec/specs/` is empty — this programme's `completion-ledger-truth`
capability is what creates the baseline that future changes will modify.

## Impact

**Code.** `bin/**` (62 entry points, one new shared argument contract),
`bin/quality-gate*.mjs`, `bin/workspace-integrity.mjs`,
`bin/agent-state.mjs`, `bin/project-state-check.mjs`,
`bin/evidence-retention.mjs`, `bin/nightwatch-hygiene.mjs`,
`src/core/qualityGate/**`, `src/core/source/censusFigureLedger.ts`,
`src/core/source/deploymentBinding.ts`, `src/core/prodObserve/**`,
`src/core/agentRuntime/**`, `src/core/ownerLocalReproduction/**`,
`src/oracles/**`, `ui/control-center/**`, `config/validation-universe.v1.json`,
`config/quality-gate.v1.json`, `.github/workflows/hardening.yml`,
`bin/lib/typescript-runtime-loader.mjs`, `bin/hardening-check.mjs` (decomposed),
`src/core/dtoFramework/**` and `src/core/adversarialCorpus/**` (adopted or
removed), the eleven `index.ts` barrels, `src/core/reviewStore/**`,
`src/core/campaign/checkpoint.ts`, `src/browser/fixtures/storageState.ts`,
`src/auth/**`, `ui/control-center/src/{App.tsx,api.ts,types.ts}` (decomposed),
`config/environments/*.json`, `.env.example`, `tsconfig.json` plus a new
`tsconfig.bin.json`.

**Documents.** `docs/CURRENT_STATE.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`,
`docs/HOST-CAPABILITY-MATRIX.md`, `docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md`,
`README.md`, `AGENTS.md`, plus a new `openspec/specs/` tree and 56 archived
changes.

**External and organizational dependencies, none of which an agent may
self-authorize.** GitHub Actions billing or an alternative runner (F-02);
authorized outbound network egress for one advisory query (F-11); DEV
authentication for 18 checks (F-02) and for Phase 9B/10B (F-10); read-only
`mochi` repository access (F-04); a provider capability confirmation for the
yield campaign (F-03); and owner decisions on evidence reclaim, 16 branches and
the legacy task records (F-06, F-07).

**Not in scope.** No change to the owner scope freeze, the outbound-request
policy, the L6 containment envelope, the C-10 privacy firewall, the C-00
protocol, or any existing authorization boundary. No production contact. No
external publication. No Alphaus repository is modified.
