# Task State

## Identity

Task ID: nightwatch-d181-cli-spend-enforcement-v1
Phase: D181_CLI_SPEND_ENFORCEMENT_V1
Status: COMPLETE
TASK_GROUP_LEDGER: nightwatch.task-group-ledger.v1
TASK_GROUPS_COMPLETE: 1,2,3,4,5,6
TASK_GROUP_NEXT: NONE
TASK_NEXT_ID: NONE
Starting SHA: 27223764d42fe23a9f407c062b2e0c4774a34f3d
Last validated implementation SHA: ff0ecc5712a0789d70a94ee152b8078704d8be8f
Last substantive checkpoint SHA: ff0ecc5712a0789d70a94ee152b8078704d8be8f
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: main
Last checkpoint: 2026-10-19 — the task opens at the verified HEAD
`27223764` on top of certified S6 `d78e6c55`. The defect trace is complete:
both production campaign paths (`campaign run`, `campaign resume`) omit
`spendCeiling` and `admitRunSpendCeiling` has no production caller, so the
metered route currently runs with no monetary admission at all.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 27223764d42fe23a9f407c062b2e0c4774a34f3d
LAST_VALIDATED_IMPLEMENTATION_SHA: ff0ecc5712a0789d70a94ee152b8078704d8be8f
LAST_SUBSTANTIVE_CHECKPOINT_SHA: ff0ecc5712a0789d70a94ee152b8078704d8be8f
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_D181_CLI_SPEND_ENFORCEMENT_V1_STATUS: COMPLETE

## Objective

Make the D-181 pre-request monetary admission genuinely enforced on the
production metered campaign path — before any provider call, across
pause/resume, and immune to any user-supplied "free" label — without touching
the grant record, executing inference, or weakening any certification rule.

## Current Milestone

COMPLETE — the D-181 CLI enforcement closure is finished at S7
`ff0ecc5712a0789d70a94ee152b8078704d8be8f`: the metered campaign path is
ceiling-bound before every provider dispatch, resume-held and identity-bound;
the exact-head CI run 39312575211 is green at the checkpoint; and the full
checkpoint-bound evidence set is re-earned there (25 receipts, verified
25/25) with the canonical and independent fresh-clone evaluators in exact
per-condition agreement (15/16 effective MET, `autonomous-yield-proof` UNMET
by design).
## Completed Milestones

- **M0 COMPLETE** — defect trace: `bin/nightwatch-agent.mjs` `campaign run`
  (runLocalCliCampaign call site) and `campaign resume`
  (resumeLocalCliCampaign call site) pass no `spendCeiling`;
  `admitRunSpendCeiling` has no production caller; `AgentRuntime` enforces the
  admission only when the optional parameter is defined. The Pi harness
  exposes no max-output-token flag, so the output bound is not wire-enforceable
  and the account-side hard stop is the required backstop.
- **M1 COMPLETE** (D-183) — the pure admissions in `spendCeiling.ts`:
  identity-bound ceilings (provider/model), the metered-run admission
  (valid ceiling, genuinely metered rate card, identity agreement, account-side
  hard stop) and the resume-equality admission (absent/widened/substituted
  refused; identical or tightened accepted). 10 focused tests.
- **M2 COMPLETE** — the campaign layer: the mechanical metering boundary
  (`isMeteredProviderRoute` over the resolved adapter identity), the
  fail-closed campaign admission before any effect, the ceiling persisted in
  the progress envelope under the secret-scanner-safe projection
  (`nightwatch.spend-ceiling-envelope.v1`, declared under D-130), and the
  resume held to the persisted declaration.
- **M3 COMPLETE** — the CLI: the owner-declared ceiling flags on `campaign
  run` and `campaign resume`, fail-closed validation (missing/malformed/zero-
  rate/identity/hard-stop), the wired chain CLI → local campaign →
  AgentRuntime → admitProviderCall, and the `--expected-investigations` /
  `--observe-repository` declarations made reachable (they were referenced and
  documented but undeclared, so the strict parser refused them).
- **M4 COMPLETE** — the eight-case real-CLI stub-provider suite (missing
  ceiling, malformed/zero-rate/partial, substitution, missing hard stop,
  authorized launch, exhausted budget zero-call refusal, the full
  pause/resume widen/reset/substitute matrix, and the mechanical fixture
  distinction) plus the validation-universe/execution-class registration;
  138/138 focused regression green.

## Work In Progress

None. Task complete; no work is open in this task's scope.
## Exact Next Action

STOP — task complete. The enforcement is closed at S7 with 15/16 effective
MET and condition #3 honestly UNMET. Any provider proof belongs to a new task
under a separate fresh owner authorization (the parent-12.5 grant with its
monetary cap and the account-side hard stop) and is not in scope here.
## Files Changed

None yet (this bootstrap record only).

## Validation Ledger

At `27223764` (bootstrap): the trace evidence is recorded above; no new
validation has run yet beyond the session bootstrap checks (session:status
PASS, workspace invariants PASS).

At the implementation tips (2026-10-19/20):
- `tests/unit/spendCeiling.test.ts` — 10/10 (metered-run, identity and
  resume admissions; the D-181 factory extended with the authorized
  provider/model identity).
- `tests/unit/cliSpendEnforcement.test.ts` — 8/8 real-CLI stub-provider cases
  (missing ceiling, malformed/zero-rate/partial, substitution, missing hard
  stop, authorized launch, exhausted-budget zero-call refusal, the
  pause/resume widen-reset-substitute matrix, the mechanical fixture
  distinction).
- Focused regression batch — 138/138; `tests/unit/cliRegressionsR5.test.ts`
  11/11 with the flag-parity pin extended to the full consumed surface.
- `npm run hardening:rules` — 274/274; `npm run hardening:mutants` — 126/126
  detected; `npm run typecheck` and `npm run typecheck:bin` — 77/77, 0
  errors (the widening-annotation budget stayed at its pinned zero).
- `npm run prepush` — PASS (11 steps, 6276/6276); `npm run gate:milestone` —
  PASS (12 steps).

At S7 `ff0ecc57` (the certified checkpoint, 2026-10-20):
- Exact-head GitHub Actions run `39312575211` (job `118265697191`) — SUCCESS
  at exactly the checkpoint.
- `npm run gate:local` (authoritative gate) — PASS, 15/15 groups; `npm run
  gate:clean` (pristine fresh clone) — PASS, 15/15 groups, sibling identity
  unchanged; the six COMMAND lanes through the guarded measurement root —
  all PASS.
- `certify-evidence verify` — 25/25 tracked receipts valid, 0 invalid;
  canonical vs independent fresh-clone evaluator — EXACT per-condition
  agreement (15/16 MET; condition #3 UNMET).

## Decisions Made During This Task

None yet; D-183 will record the enforcement closure.

## Discoveries

- The production gap is exactly as reported: the ceiling plumbing exists
  below the CLI and has no production caller above it.
- `pi --help` exposes no max-output-token option, so a wire-enforced output
  bound is unavailable through the harness.

## Blockers

None in this task's scope. The provider proof is gated on the owner/account-
side actions recorded under Deferred / Follow-Up and D-183 (the parent-12.5
approval with its monetary cap, the account-side revocation and auto-top-up
confirmations, the account-side hard stop, and the prepared stale-credential-
copy removal).
## Safety Events

- CI governance disclosure (recorded, not omitted): three documentary-
  descendant runs are RED in history — `dbdfb10b` and `414a12a3` on the
  documentation-freshness date rule (the UTC date rolled over while
  `docs/CURRENT_STATE.md`'s header still read 2026-10-19) and `8ae68b18` on
  the append-only archive rule (the header-date bump modified a protected
  line without the same-commit declared correction the registry's own
  pattern requires — the pairing must travel WITH the line change). The
  causes are identified and the procedure is fixed: any future header bump is
  one commit carrying both the line change and its `document-role-corrections`
  entry. The certified checkpoint's own exact-head run (39312575211 at
  `ff0ecc57`) is GREEN and is the CI the certification binds; the red
  documentary runs are recorded here rather than omitted.
- Session governance: the host rebooted mid-choreography, which correctly
  ended the boot-digest claim (STALE_SESSION); the documented adoption
  recovery (`claim --adopt`) restored a live claim while keeping the base,
  branch and every commit (`sess-c2193e63e05d` → `sess-10bf568c4cd2`).
- No provider contacted (every provider in the tests is a stub), no credit
  consumed, no credential touched, no grant record changed.

## Deferred / Follow-Up

- The parent-12.5 provider run and its owner approval (external, future).

## Resume Recipe

Task complete. Do not resume this task. Any future provider proof requires a
separate fresh owner authorization (the parent-12.5 grant with its monetary
cap) and belongs to a new task; nothing here is resumed or left mid-flight.
The certification state at closure is S7 `ff0ecc57` with 15/16 effective MET.
## Completion Snapshot

Complete — the task is closed at S7 `ff0ecc5712a0789d70a94ee152b8078704d8be8f`.
Both production defects traced and closed: the metered campaign path now
carries its monetary ceiling through the whole chain (CLI → local campaign →
AgentRuntime → admitProviderCall → dispatch) and refuses before any provider
call on a missing ceiling, malformed declaration, zero-rate card, identity
substitution, unenforceable output bound or projected overspend; the ceiling
is persisted scanner-safely and a resume can neither widen, reset nor
substitute it; the two undeclared R6 flags are declared and pinned; and the
eight-case real-CLI stub-provider suite plus the pure admission tests (10)
prove it. Focused regression 138/138; prepush and the milestone gate green
(6276/6276); 274/274 hardening probes and 126/126 behavioural mutants;
exact-head CI green at S7 (run 39312575211); the S7 evidence set re-earned and
verified (25/25) with exact canonical/fresh-clone per-condition agreement
(15/16, condition #3 UNMET).
