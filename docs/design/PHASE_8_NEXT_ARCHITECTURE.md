# Nightwatch Phase 8 — Next-Architecture Design Review

> Task: `phase-8-next-architecture-design-review` (Phase 8-DESIGN)
> Authorization: `PHASE_8_NEXT_ARCHITECTURE_DESIGN_REVIEW_ONLY`
> Starting SHA: `4e4bf0843c9e33682e026b3931599d1b2b713374`
> Date: 2026-08-15
> This document is a design record, not an implementation. It selects WHAT
> SHOULD COME NEXT; it does not execute it. The machine-checked project truth
> block is unchanged by this review.

---

## 1. Current state (verified)

| Fact | Value |
|---|---|
| Phase 8 | `IN_PROGRESS` (8A/8A.1/8A.1.1/8B/8B.0.1/8B.1.0/8B.1.0.1/8B.1.0.2 COMPLETE; 8B.1 `COMPLETE_VIA_SUCCESSFUL_RETRY_R1`) |
| Canonical catalog | count 1 — variant A (EXPAND_SUMMARY); raw digest `sha256:bd35b934...`; adoptedCaseId `adopted-case:sha256:90248aae...`; strategy `DECLARATIVE_REGRESSION_CATALOG_PROMOTION` |
| Variant B (EXPAND_THEN_COLLAPSE) | `AVAILABLE_NOT_ADOPTED` |
| Promotion authority | `NONE` (machine-enforced, `bin/project-state-check.mjs:172`) |
| contractDigest | `sha256:d8012fae...` (unchanged since R1.1) |
| Portfolio | frozen 2-variant `nightwatch.selfdev-synthetic-portfolio.v1`; selector returns B today, `null`/EXHAUSTED when A+B adopted |
| Catalog bound | `SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES = 64` (`adoptedCases.ts:40`), defensive ceiling, not architectural |
| One-shot approvals | 2 real approvals ever created (original `17c97035...` and R1 `e065f088...`); both consumed exactly once, permanently spent, immutable no-replace store |
| Rollback/unadopt machinery | NONE (by design; CLI forbids `--rollback`) |
| Test baselines | EMPTY / EXPAND_ONLY / EXPAND_AND_COLLAPSE prove catalog states 0/1/2 via the real renderer/stack |
| CI | 24-step hardening workflow; catalog integrity step cardinality-agnostic; project-memory truth check; completed-task continuity audit |
| Last validated implementation | `044c4a6e0095d14004cd50b44ceb47998e44e3ec` (preserved; this design docs commit is a documentation descendant) |

## 2. What Phase 8 has already proven (capability evidence table)

For each capability: phase that established it, the problem it solved, the
safety boundary, the evidence, current status, remaining limitation.

| # | Capability | Phase | Problem solved | Safety boundary | Evidence | Status | Remaining limitation |
|---|---|---|---|---|---|---|---|
| A | Bounded declarative proposal generation | 8A | Self-development must not start from code/patches | Data-only candidate (`nightwatch.selfdev-candidate.private.v1`), fixed registries, identity from stable semantics, 3-candidate/30s/120s caps | D-44; sessions; proposer tests | COMPLETE | Synthetic proposer class only |
| B | Deterministic evaluation | 8A | Candidate claims must not supply evaluation truth | Evaluator owns schema/scope/privacy/safety/duplicate/budget/coverage truth; contract manifest → contractDigest | D-44/D-45; contract v2 | COMPLETE | Contract version must advance on semantic change |
| C | Provenance / source binding | 8A.1 | Artifacts must bind to exact source | sourceBundleDigest (34 authoritative paths, length-prefixed), contractDigest, trust statuses `VERIFIED_EXACT_BASE`/`VERIFIED_SOURCE_EQUIVALENT_DESCENDANT` | D-45; trust.ts | COMPLETE | Excludes malicious-machine-owner threat |
| D | Replay | 8A.1 | Verification must reproduce exact semantics | Ordered stateful replay, fresh evaluator, constant clock, canonical byte comparison (`REPLAY_EXACT`) | D-45; replay.ts | COMPLETE | Non-replayable → classified, never guessed |
| E | Future-review eligibility | 8A.1.1 | Trust-valid ≠ eligible | `assessFutureReviewEligibility(value, current)` requires current source, genuine positive pass count, matching digests; fails closed | D-46; zero-pass TRUE_POSITIVE | COMPLETE | Per-artifact; requires current source view |
| F | Sandbox source adoption | 8B | Prove one adoption's effect without touching canonical | Disposable 0700 private mirror, exactly one atomic write, five metamorphic probes, `SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED` | D-47; plan/result IDs | COMPLETE | Sandbox-only, never canonical |
| G | Sandbox confinement | 8B.0.1 | Sandbox boundaries were attackable (4 TRUE_POSITIVES) | Base pre-validation, strategy binding, complete 5-probe invariant, truthful write accounting, loader lock fix | D-48 | COMPLETE | Owner-chown test env-conditional |
| H | Deterministic adopted-case catalog | 8B | Adopted semantics must be pure data with derived identity | Schema module + generated pure-data file, renderer-only, coverage re-derived, live contents bound into contractDigest, 0..64 | D-47; catalog tests | COMPLETE (1 entry) | No hand-edit path (by design) |
| I | Owner-scoped canonical promotion | 8B.1 | Canonical write must be owner-gated | `OWNER_GATED_ONE_FILE_ONLY`, `maximumCanonicalSourceWrites: 1`, `runtimeGitWrites: 0`, complete evidence chain | D-51; promotion types | COMPLETE (R1) | Fresh full chain required per adoption |
| J | One-shot approval | 8B.1 | Approval must be single-use | Content-addressed ID, claim-before-write, immutable no-replace store, `CANONICAL_ONE_FILE_ONLY` | 2 approvals, each consumed exactly once | COMPLETE | Per-adoption owner ceremony |
| K | Exact canonical APPLY | 8B.1 | Apply must be exact and atomic | 5 pre-write gates (clean repo, HEAD match, sourceBundleDigest, contractDigest, target preimage), single atomic write preserving mode, post-write changeset exactly [target] | Receipts `APPLIED`, writes 1/0/0 | COMPLETE | No runtime rollback (by design) |
| L | Fresh-process verification | 8B.1 | Verify must not trust the running process | Fresh load of repository modules, four metamorphic probes, `CANONICAL_APPLIED_VERIFIED_UNCOMMITTED` | Verification records | COMPLETE | Probes catalog-specific |
| M | Canonical commit / currentness | 8B.1 | Committed state must stay truth-bound | 7-status currentness vocabulary; dev session commits (runtime never); strict `SOURCE_MISMATCH` on any authoritative change | `COMMITTED_EXACT` at 24fc437; R1.1 regression | COMPLETE | 3/7 statuses test-covered |
| N | Catalog-aware proposer after adoption | 8B.1.0 | Proposer must not re-propose adopted semantics | Portfolio selector: fingerprint-not-adopted AND coverage-delta>0; EXHAUSTED is a healthy terminal | Post-R1 sessions select B | COMPLETE | Frozen 2-variant portfolio |
| O | One-entry continuation proof | 8B.1-R1 | Lifecycle must continue at count 1 | Exact one-entry future-state rehearsal (751/4/0); post-commit sessions select B, eligible true | Rehearsal; session `31935308...`/`12515f0e...` | COMPLETE | Exhaustion only fixture-proven |
| P | Continuity protocol v2 | 8B.1.0.2 | Completed-task contradictions must be mechanically invalid | Strict state machines, duplicate/placeholder rejection, history audit, CI step | 9/9 impossible states → 0/9 | COMPLETE | v1 legacy read-only |
| Q | Project-state protocol v1 | 8B.1-R1.1 | Project truth must be mechanically checked | Machine-checked truth block, read-only checker, CI step, `NEXT_PROMOTION_AUTHORITY: NONE` exact | 25 tests; CI step | COMPLETE | Status pins hard-coded (see §24) |
| R | Current safety authority model | 8B.1-R1.1.1 | Authority wording must be truthful | Six-point partition (D-51): sandbox-mirror write; canonical-promotion executor the ONLY runtime canonical writer; runtime never commits Git; candidates never write; no generic self-modification; dev session commits | D-51; hardening guard | COMPLETE | None identified |

## 3. The actual Phase-8 objective (reconstruction)

Distinguish implemented mechanisms from phase objective. The durable source
states the phase arc as "Phase 8 — Evaluated self-development": 8A
evaluation authority without mutation; 8B controlled sandbox adoption; 8B.1
owner-gated canonical promotion. The R1 task SPEC states the objective most
precisely: "proving the complete durable lifecycle from an EMPTY canonical
catalog through one verified one-entry canonical adoption committed on
private main with exact green CI, then closing … with the portfolio still
offering candidate B — NOT exhausted."

Assessment of the candidate objective statements:

- A (evaluate proposals) — proven by 8A; a milestone, not the phase end.
- B (adopt in a sandbox) — proven by 8B; a milestone, not the phase end.
- **C (perform one owner-authorized canonical self-development promotion) —
  THE PHASE OBJECTIVE. Proven end-to-end by 8B.1-R1.**
- D (sustain a repeatable lifecycle of multiple owner-authorized canonical
  promotions) — NOT stated anywhere as a phase objective. The portfolio's
  second member and EXHAUSTED exist to make the FIRST adoption committable
  and to prove continuation; exhaustion is designed as a healthy terminal.
  Nothing in ROADMAP/DECISIONS promises "multiple canonical adoptions".
- E (autonomously develop itself) — contradicted by the entire owner-gated
  authority model (D-47/D-51, AGENTS.md "explicit owner authority for
  irreversible canonical promotion").

**Conclusion:** the strongest evidence-supported objective is C. Phase 8
set out to prove that Nightwatch can safely perform ONE owner-authorized
canonical self-development promotion with a complete, source-bound,
replayable evidence chain — and that the lifecycle continues after it.

## 4. First design question — is Phase 8 already complete?

**Arguments for closure now:**
- One real canonical owner-gated promotion succeeded and is committed
  (24fc437) with exact CI green including catalog integrity at count 1.
- Continuation was proven: fresh sessions at the committed HEAD select B,
  replay PASS, eligible true, contractDigest unchanged.
- Safety, provenance, continuity (v2) and project truth (v1) are hardened
  and CI-enforced; no unresolved safety blockers exist.
- B's availability proves lifecycle continuity without needing B's adoption.
- The original research objective (C) is achieved; nothing in the roadmap
  promises a second adoption.

**Arguments against closure now:**
- Only one real canonical adoption has been performed; live repeatability is
  unproven (fixture-proven only).
- Recovery after later promotions has no first-class design (though the
  original 8B.1 attempt demonstrated dev-session restore).
- EXHAUSTED is fixture-proven, not live.
- The owner workflow is ceremony-heavy (fresh chain per adoption).

**Resolution from evidence:** the arguments against closure concern live
re-demonstration of states already proven by fixtures and tests, and owner
ceremony. They do not identify an unproven capability of the machinery: the
promotion chain is generic, CI is cardinality-agnostic, tests prove
catalog states 0/1/2 and promotion to count 2, and EXHAUSTED is a designed
healthy terminal state with dedicated tests. The unique evidence a second
live adoption would add is operational (the project-state pin transition at
count 2 and a second owner ceremony), not architectural. **Phase 8's
objective is fulfilled; the question is not whether the machinery can do
more, but whether doing more is worth it.**

## 5. Architecture options

### Option A — CLOSE PHASE 8

Definition: Phase 8 objective considered fulfilled after one verified
owner-gated canonical adoption plus continuation proof. No further Phase 8
implementation. B remains available but unadopted. Future self-development
work becomes a new major phase only when a concrete need exists.

- Evidence sufficiency: HIGH — objective C proven live; continuation (O),
  truth (P, Q) and authority model (R) hardened.
- Conceptual cleanliness: HIGH — a phase closes when its objective is
  proven, with exit criteria now defined (§12), not when its machinery is
  exhausted.
- Risk reduction: HIGH — no further canonical source mutation; promotion
  machinery preserved intact for a future concrete need.
- Leaving B unadopted: ACCEPTABLE — B is a structural canary (see §23 of
  this document); its adoption has no production value.
- Phase 8 becomes COMPLETE: YES, via a separate authorized closure task
  (status pins make it a source change — §24).

### Option B — REPEATABLE OWNER-GATED ADOPTION LIFECYCLE

Definition: generalize the proven R1 process into a durable repeated
lifecycle; every future candidate independently requires fresh current
evidence, fresh sandbox proof, fresh future-state rehearsal, fresh promotion
intent, fresh one-shot owner approval, one APPLY, exact verification, CI,
STOP. Owner remains mandatory per adoption; no automatic promotion.

- What R1 mechanics already support: EVERYTHING in the promotion chain is
  generic — prepare/approve/apply/verify/status take exact promotion IDs,
  approval IDs are content-addressed per promotion, consumption is
  unique-per-approval, currentness is computed dynamically, catalog
  integrity is cardinality-agnostic, portfolio selection is catalog-aware,
  promotion flow tests prove promotion to count 2, project-state count
  derives from live source.
- What is still R1-specific: the STATUS pins — `PHASE_8B_1_STATUS:
  COMPLETE_VIA_SUCCESSFUL_RETRY_R1` is hard-pinned in
  `bin/project-state-check.mjs:174`; a second adoption changes catalog
  cardinality and the portfolio projection to EXHAUSTED, requiring a new
  status token + pin change + CURRENT_STATE block regeneration. Also the
  ceremony itself (fresh chain) is procedural, not code.
- Lifecycle generation/state numbering: nothing in the architecture needs
  generation counters — each promotion is an independent content-addressed
  chain; the catalog is the state.
- Approval uniqueness: already guaranteed (content-addressed per promotion,
  immutable no-replace store, claim-before-write).
- Currentness after source changes: already strict (SOURCE_MISMATCH on any
  authoritative change; a new adoption must start from fresh current
  source).
- Rollback semantics: unchanged — dev-session Git restore; no runtime
  rollback (see §9).
- Catalog cardinality changes: supported (0..64; count 2 is fixture-tested).
- Repeated proof burden: HIGH — full fresh chain + rehearsal per adoption.
- B as second acceptance canary: see §23 — NOT recommended now.

### Option C — OWNER REVIEW QUEUE, NO NEW PROMOTION AUTOMATION

Definition: Nightwatch continuously produces eligible declarative candidates
and private/sandbox evidence; canonical promotion remains a manually
launched separate owner operation; architecture adds a candidate queue,
readiness state, evidence package, owner decision.

- Owner usability: marginal gain — the deterministic portfolio enumerates
  at most 2 members; there is nothing to queue today.
- Evidence persistence: already exists (immutable session/plan/result
  artifacts with eligibility inspect).
- Stale candidate invalidation: already exists (source-currentness gates).
- Queue cardinality: portfolio is exhausted after B; a queue over ≤2 items
  is machinery without purpose.
- Source-currentness: unchanged.
- Verdict: adds persistence machinery that duplicates existing artifacts;
  meaningful only AFTER portfolio expansion. DEFER.

### Option D — MULTI-CANDIDATE / PORTFOLIO EXPANSION

Definition: expand proposal semantics beyond the current A/B portfolio
(more deterministic action/assertion combinations, broader local synthetic
regression coverage) before another real adoption.

- Is the A/B portfolio a test scaffold? YES — EXPAND_SUMMARY /
  EXPAND_THEN_COLLAPSE are synthetic regression cases over a local fixture
  state machine; they prove the machinery, they do not hunt Alphaus bugs.
- Would expansion produce bug-hunting capability? NO for synthetic-only
  semantics. It would produce more machinery-proof, not more findings.
- Combinatorial explosion / determinism / coverage identity / validation
  burden: manageable but pointless without real semantics.
- Belongs in Phase 8? NO — expansion belongs AFTER closure, as part of a
  bug-hunting-driven phase (Phase 9 concept), and only with semantics that
  reflect real bug-hunting value. DEFER.

### Option E — PROMOTION RECOVERY / ROLLBACK AS FIRST-CLASS ARCHITECTURE

Definition: formalize post-APPLY/post-commit recovery, revert provenance,
and failure-state lifecycle before another canonical adoption.

- Current rollback model: exactly the development-session Git restore
  (`git checkout HEAD -- <target>`), demonstrated in the original 8B.1
  BLOCKED attempt (byte-verified restore to `ffe3d635...`, then 83/83
  re-run). Runtime explicitly cannot undo ("the canonical write already
  happened and cannot be silently rolled back by this runtime boundary",
  apply.ts:210-213). Preimage is preserved in the promotion record
  (targetPreimageDigest); receipts/verifications are immutable.
- Sufficiency for A (post-APPLY/pre-commit failure): SUFFICIENT — accurate
  receipt + dev-session restore, proven.
- B (post-commit CI failure): SUFFICIENT — normal Git revert; currentness
  then truthfully reports SOURCE_MISMATCH for the reverted state.
- C (later semantic defect): SUFFICIENT — normal development remediation.
- D (owner removes adopted case): SUFFICIENT — regeneration via the trusted
  renderer without the entry + dev commit (the generated file is pure data
  produced only by the renderer).
- E (catalog corruption): SUFFICIENT — module-load validation fails closed;
  catalog-integrity CI fails; regenerate via renderer.
- Verdict: current model is sufficient for every scenario. First-class
  runtime rollback would MIRROR the write authority (a runtime capability
  to reverse a runtime write), contradicting the explicit anti-feature
  stance (CLI test forbids `--rollback`), and would add machinery without
  closing any demonstrated gap. REJECT as first-class; dev-session Git
  remains the model.

### Option F — AUTONOMOUS CANONICAL PROMOTION

Definition: Nightwatch itself promotes eligible candidates without explicit
per-adoption owner approval.

- Authority escalation: moves promotion initiation from owner (L4, one-shot
  approval) to runtime standing authority — a permanent delegation that
  violates the AGENTS.md principle "explicit owner authority for irreversible
  canonical promotion".
- Irreversible action: canonical source write + commit, executed without a
  human decision per occurrence.
- Error propagation: a mis-selected candidate becomes canonical without an
  owner review point; "adopt all eligible" loops become possible.
- Recursive self-modification: Nightwatch modifying its own canonical source
  without owner decision is precisely the generic self-modification
  authority D-51 rules out.
- Approval removal: one-shot approvals become standing capability — the
  opposite of the consumed-once design.
- Provenance/blast radius: evidence chain remains, but its authority anchor
  (owner decision) disappears.
- Violated principles: hard design principle #5 (explicit owner authority
  for irreversible canonical promotion), one-shot approvals, no-auto-loop,
  candidate availability != promotion authorization (it would make
  eligibility ≡ authority — collapsing the axes of §13).
- Verdict: **REJECTED_BY_DESIGN**. Reconsideration would require: (1) a
  separate explicit owner decision to change the authority model; (2) a new
  owner-policy capability; (3) per-promotion provenance of the owner's
  standing delegation; (4) proof that some concrete bug-hunting need cannot
  be served by the owner-gated chain. None of that exists today.

### Additional options (G+)

Repository evidence suggests no genuinely distinct additional architecture
beyond A-F. Candidates considered and rejected as non-distinct: "live
rehearsal cadence" (procedure, not architecture), "readiness one-command"
(a UI improvement over the existing chain — evaluated in §20, not a
separate architecture), "closure + bug-hunting redirect" (the execution of
Option A, specified in §31). No option invented to inflate the analysis.

## 6. Evaluation matrix (1-5; 5 best unless noted)

Criteria: 1 bug-finding value · 2 self-development value · 3 safety ·
4 owner control · 5 reversibility · 6 provenance strength ·
7 deterministic testability · 8 implementation complexity (5=low) ·
9 operational burden (5=low) · 10 conceptual simplicity ·
11 incremental value beyond current system · 12 future extensibility ·
13 recursive-failure risk (5=low) · 14 fit with private/local model.

| Option | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | Sum |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A close | 3 | 2 | 5 | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 3 | 4 | 5 | 5 | 61 |
| B repeat lifecycle | 1 | 3 | 4 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 2 | 4 | 4 | 4 | 52 |
| C queue | 1 | 1 | 4 | 4 | 4 | 4 | 4 | 3 | 3 | 3 | 1 | 2 | 4 | 4 | 42 |
| D portfolio expansion | 2 | 2 | 4 | 4 | 4 | 4 | 4 | 3 | 3 | 3 | 2 | 3 | 4 | 4 | 46 |
| E rollback machinery | 1 | 1 | 3 | 3 | 2 | 3 | 3 | 2 | 3 | 2 | 1 | 2 | 3 | 3 | 32 |
| F autonomous promotion | 2 | 3 | 1 | 1 | 1 | 2 | 3 | 2 | 2 | 2 | 3 | 2 | 1 | 1 | 26 |

Explanations (abbreviated; full rationale in §5):

- A: no new writes (safety 5, simplicity 5, burden 5); keeps the proven
  machinery for future use (extensibility 4); incremental value 3 because
  the remaining value is the bug-hunting redirect, not self-development.
- B: high proof burden (9=3), low bug-hunting value (1) — a second synthetic
  adoption finds no Alphaus bugs; safety 4 (still owner-gated, but more
  exposure of the promotion surface); conceptually good (4) but premature.
- C: machinery over purpose; queue is empty after B (1, 1, 11=1).
- D: only useful with real semantics; synthetic expansion adds no findings
  (1); complexity/burden 3.
- E: mirrors write authority (reversibility 2 — a runtime revert is a
  second irreversible-capable surface); contradicts anti-feature stance.
- F: authority collapse, recursion risk (13=1), violates the operating model
  (14=1, 3=1, 4=1).

Decision is not by arithmetic alone — the matrix confirms the qualitative
analysis: A dominates on safety, simplicity, and burden while retaining
extensibility.

## 7. Authority ladder (weakest → strongest)

Using current repository terminology:

- **L0 — read-only evaluation**: `SELF_DEVELOPMENT_SYNTHETIC_EVALUATION`
  (controller, evaluator, replay, trust assessment). Who initiates: any
  session. No side effects.
- **L1 — private immutable evidence**: owner-only private artifact store
  (`~/.nightwatch`), exact-ID no-replace. Who initiates: the session
  (runtime), under L0 authority.
- **L2 — sandbox mirror mutation**: `SELF_DEVELOPMENT_SANDBOX_ADOPTION`;
  disposable 0700 private mirror, one atomic write, five probes. Who
  initiates: owner-invoked CLI (`selfdev:adopt-sandbox`, token `SANDBOX_ONLY`).
- **L3 — owner-reviewed promotion intent**: `selfdev:promote-canonical
  prepare` — content-addressed intent binding the full evidence chain. Who
  initiates: owner-invoked CLI.
- **L4 — one-shot owner approval**: `approve` with token
  `CANONICAL_ONE_FILE_ONLY`; content-addressed, consumed once. Who
  initiates: owner only.
- **L5 — bounded canonical source write**: `apply` —
  `SELF_DEVELOPMENT_CANONICAL_ADOPTION`; exactly one write to
  `src/core/selfDev/adoptedCaseCatalog.generated.ts`. Who initiates:
  owner-invoked CLI after approval.
- **L6 — development Git commit/push**: the development session commits the
  promoted result; runtime promotion code never commits. Who initiates:
  owner/development session.

Per-option highest authority required and initiator:

- A: L0 (analysis) + docs commits L6-by-dev-session; initiator: this review
  (L0) / owner (closure task).
- B: L5 per adoption + L4 approval; initiator: owner per adoption.
- C: L0/L1 (queue production) — no new authority; initiator: session.
- D: L0 (portfolio is data/source change — actually a source change, so
  L6 dev-commit); initiator: owner.
- E: L5-mirroring new write/revert capability — escalates runtime authority;
  initiator: owner (but rejected).
- F: standing L4+ (approval removal) — the maximum escalation; initiator:
  runtime (rejected).

## 8. Candidate / eligibility / authority separation

Three independent axes, unchanged and enforced:

- A. CANDIDATE EXISTS — variant B exists: YES.
- B. CANDIDATE IS CURRENTLY ELIGIBLE — B reported eligible at the validated
  source checkpoint (fresh sessions `31935308...`, `12515f0e...`): YES.
- C. OWNER AUTHORITY EXISTS — B promotion authority: NO
  (`NEXT_PROMOTION_AUTHORITY: NONE`, machine-enforced).

Any design that collapses these axes is invalid. Option F collapses B ≡ C
(eligibility would imply authority). Option C preserves them (queue holds
A-axis entries without C). Option B preserves them (each adoption creates a
fresh C). Option A preserves them (B stays at A+B states).

## 9. Repeatability analysis (hypothetical, NOT authorized)

Trace for a hypothetical second adoption (B):

```
catalog [A]  →  B sandbox proof (fresh chain)  →  B canonical adoption
→  catalog [A,B]  →  proposer EXHAUSTED
```

- Is EXHAUSTED a success state? YES by design — `passCandidateCount 0`,
  `futureReviewEligible false`, session completes normally, CLI exit 0
  (portfolio tests: exhausted checkout 160 passed; `portfolioStatus
  'EXHAUSTED'`).
- Owner experience at exhaustion: the default session reports
  `portfolioStatus EXHAUSTED`; inspect reports `eligible false` with zero
  candidates and creates no plan. No error, no fake novelty.
- Project-state reflection: `NEXT_PORTFOLIO_MEMBER: EXHAUSTED` is already a
  legal projected value (`project-state-check.mjs:259,296`); the machine
  block would change `AVAILABLE_NOT_ADOPTED` → `EXHAUSTED` and the count to
  2; `PHASE_8B_1_STATUS` would need a new token + pin change (source change).
- Should Phase 8 close at exhaustion? Yes — exhaustion is the designed
  terminal; closure was already proposed in this review.
- Does the current architecture handle it? Yes — the machinery is
  fixture-proven for the full transition; only the status-pin update and
  block regeneration are needed (a small source change).
- What would a real acceptance prove beyond fixtures? Only the live owner
  ceremony and the live pin transition. §24 shows that is operational, not
  architectural, evidence.

## 10. Portfolio exhaustion as a normal state

- Existing semantics: zero-PASS / future-review-ineligible are first-class
  (`assessFutureReviewEligibility` returns eligible false; trust remains
  genuinely valid); `selectNextSyntheticProposalVariant` returns null;
  CLI reports EXHAUSTED; tests cover it exhaustively.
- Next architecture needs: (a) an explicit owner-visible exhausted
  explanation — already exists in the CLI status line and portfolio tests;
  (b) no-op behavior — already exists; (c) a portfolio expansion pathway —
  exists as a designed future capability under separate authorization
  (ARCHITECTURE.md:392-404 "A future phase may deliberately expand the
  portfolio or registry under separate authorization").
- Nothing new is required. EXHAUSTED must NOT be misinterpreted as failure
  — the design records this as doctrine.

## 11. Artifact lifecycle map

| Artifact | Mutable/Immutable | Private/Git | Source-bound | Reusable | Invalidation |
|---|---|---|---|---|---|
| selfDev session | immutable (exact-ID no-replace) | private (`~/.nightwatch`) | sourceBundle+contract digests | replay only | source/contract drift → legacy/unverified |
| candidate | immutable, data-only | inside session/eval | base-independent identity | duplicate-checkable | once adopted → duplicate forever |
| evaluation | immutable | private | bound to candidate + baseline | replay only | source drift |
| replay descriptor | immutable | private | fixture-concrete | historical replay only | contract version change |
| eligibility assessment | derived (not stored as authority) | n/a | current-source-aware | per current source | any source change |
| adoption plan | immutable | private | target preimage + digests | one sandbox run | PLAN_STALE/TARGET_PREIMAGE_STALE |
| sandbox result | immutable | private | pre/post digests | evidence only | source drift (historical truth stays) |
| promotion intent | immutable | private | HEAD + digests | one approve | PROMOTION_SOURCE_ADVANCED |
| approval | immutable, consumed-once | private | promotion ID + preimage + postimage | NEVER | consumed; no reset/delete path |
| apply receipt | immutable | private | observed postimage | evidence | none (historical truth) |
| verification | immutable | private | fresh-load probes | evidence | source drift → SOURCE_MISMATCH (historical truth stays) |
| commit/currentness | Git truth | Git | 7-status vocabulary | n/a | any authoritative change → SOURCE_MISMATCH |

Repeated adoption exposes no lifecycle ambiguity: every artifact is
content-addressed per chain; a second chain cannot collide (see §19
identity). The one genuinely sticky point is the CURRENT_STATE machine block
and status pins, which are snapshots, not artifacts — updated by the
development session at adoption.

## 12. Source-change invalidation (R1.1/R1.1.1 lesson)

R1.1/R1.1.1 proved even comment-only changes in authoritative source make
historical promotion exactness stale. Explicit model for repeated adoption:

- Historical evidence remains historical truth: always — old
  verifications/receipts stay exact records of their source state
  (`CANONICAL_PROMOTION_SOURCE_MISMATCH` is the CORRECT result for old
  verification after source change, per the R1.1 regression test).
- Artifacts unusable for future promotion: any artifact whose source
  bundle/contract/preimage no longer matches current source.
- What must be regenerated: session → sandbox proof → intent → approval →
  apply → verify, all from fresh current source (the R1 retry did exactly
  this after the BLOCKED attempt).
- What remains semantic catalog truth: adopted-case identity is
  base-independent (fixture/actions/assertions/coverage/strategy); the
  catalog entry survives source changes; `contractDigest` changes only when
  the declared contract changes (e.g. catalog contents).
- When source-equivalent descendant semantics are accepted: only for
  documentation-only descendants (`VERIFIED_SOURCE_EQUIVALENT_DESCENDANT`
  trust; `COMMITTED_SOURCE_EQUIVALENT_DESCENDANT` currentness) where
  authoritative bytes are unchanged.
- When exact source equality is mandatory: for promotion preparation,
  approval binding, APPLY, and COMMITTED_EXACT verification. Currentness is
  NOT weakened.

## 13. Rollback model

Current: no runtime rollback (by design). The development session is the
only reversal authority: `git checkout HEAD -- <target>` pre-commit
(proven in original 8B.1: byte-verified restore, then 83/83 re-run); normal
Git revert post-commit. Receipts truthfully record `canonicalSourceWrites:
1` on failure paths.

Sufficiency (from §5 Option E): A post-APPLY/pre-commit — sufficient
(proven); B post-commit CI failure — sufficient (revert; currentness
truthfully reports SOURCE_MISMATCH); C later semantic defect — sufficient
(development remediation); D owner-removal — sufficient (renderer
regeneration without the entry + dev commit); E catalog corruption —
sufficient (validation fails closed).

Future architecture: adoption removal is NOT needed as a runtime operation;
normal Git revert / development remediation (renderer-driven regeneration)
is the model. A runtime UNADOPT capability would mirror the canonical write
authority and is rejected for the same reason runtime rollback is rejected.

## 14. Removal / unadoption question

A catalog can grow (0..64). Does it need UNADOPT / RETIRE / DISABLE?

- Identity/provenance history: adoptedCaseId is base-independent; a removed
  entry's identity would remain in historical evidence — fine.
- Proposer rediscovery: after removal, the selector would see the
  fingerprint as not-adopted and re-propose it — CORRECT behavior for a
  removal; the owner decision to remove is the authority.
- Historical evidence: unchanged (immutable).
- Current contract digest: changes (catalog contents are contract-bound) —
  accurate.
- Rollback semantics: dev-session operation; no runtime path.
- **Verdict: NOT NEEDED YET.** Removal is a development operation via the
  trusted renderer + dev commit. A first-class UNADOPT would be machinery
  for a scenario that has never occurred and that normal Git/renderer
  remediation already covers.

## 15. Catalog growth bound

- `SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES = 64` (`adoptedCases.ts:40`);
  enforced in `validateAdoptedCatalog` (`CATALOG_TOO_LARGE`) and the
  planner (`CATALOG_FULL`).
- Why the limit exists: a defensive ceiling preventing unbounded growth
  from a pathological proposer/registry; 64 is defensive, not architectural
  — the selector is catalog-aware, so duplicates are impossible by
  construction and coverage saturation (EXHAUSTED) happens long before 64
  with any fixed registry.
- Performance at growing cardinality: trivial — the catalog is a small
  array compared into fingerprints/coverage sets per session.
- Duplicate/fingerprint behavior: equivalentFingerprint derived from the
  action registry; adoption of any variant is detected regardless of count.
- contractDigest: stable (contents bound, not count-sensitive hash
  algorithm); project-state reporting: count derived from live source.
- No change recommended; limit stays 64.

## 16. Owner experience (per viable option)

**Option A (closure + bug-hunting redirect):** owner runs the closure task
(separate authorization); project-state pins updated to COMPLETE; roadmap
selects the next bug-hunting investment. Owner sees: full validation +
CI green; catalog unchanged; B still available (or archived in history).

**Option B (repeat lifecycle), when a real candidate exists:** owner runs
`selfdev:adopt-sandbox inspect/plan/run` → sees SANDBOX_VERIFIED evidence →
runs `selfdev:promote-canonical prepare` → reviews intent (promotion ID,
preimage/postimage digests, target path) → `approve` with
`CANONICAL_ONE_FILE_ONLY` → `apply` → fresh-process `verify` → dev-session
commit → exact CI. Stale → `PROMOTION_SOURCE_ADVANCED` / `TARGET_PREIMAGE_
MISMATCH` fail closed; candidate unavailable → inspect reports eligible
false; exhausted → CLI reports EXHAUSTED (no-op); CI fails → dev-session
revert + remediation; success → catalog count +1, project-state block
regenerated, CI green.

**Options C/D/E/F:** no owner workflow is meaningfully improved; each adds
ceremony or authority without a new capability (see §5).

## 17. Automation boundary (safe vs authority-bearing)

Safe to automate WITHOUT increasing authority (all already exist or are
read-only): current-source candidate generation (portfolio selector);
read-only eligibility (assessFutureReviewEligibility); sandbox inspect;
future-state rehearsal (disposable clone); report/evidence summary;
stale-artifact detection (currentness vocabulary).

Authority-bearing, must remain owner-explicit: canonical prepare ONLY IF it
creates promotion authority (it does — the intent is the L3 anchor);
approval (L4); APPLY (L5); Git commit (L6).

Recommended boundary: automate everything below L3; keep L3-L6 as explicit
owner-invoked steps with exact-ID CLI. This boundary already exists; no new
automation is proposed.

## 18. What should remain manual

- **Approval (`approve`, token `CANONICAL_ONE_FILE_ONLY`)** — the one
  irreversible-authority decision; the owner must read the intent (exact
  target, preimage, postimage, chain IDs) and consciously consume the
  one-shot token. Mechanism for value: the token is content-bound to the
  promotion; a mistaken approval cannot be redirected to another promotion
  (`WRONG_PROMOTION_FOR_APPROVAL`).
- **APPLY (`apply`)** — executes the single canonical write; manual
  invocation keeps the write causally tied to the owner's just-given
  approval and to the owner's review of the pre-write gates.
- **Git commit of the promoted result** — the runtime never commits; the
  development session commits so the adoption enters history only after
  the owner inspected the post-apply state.
- **Catalog removal / regeneration** (if ever needed) — a development
  operation, not runtime.

Why human authority is valuable at each: these are the only steps with
irreversible (or history-making) effects; each is bound to content so the
human decision is informed, and each is one-shot so the decision is fresh.

## 19. One-command readiness concept (evaluate only)

Concept: `selfdev:promotion-readiness` performing session + eligibility +
sandbox proof + future-state rehearsal + evidence summary, then STOP.

- Value: reduces ceremony error without authority escalation (all stages
  are L0/L1/L2 read-only or sandbox-confined).
- Current status: the chain already exists as separate exact-ID commands;
  a readiness orchestrator is a convenience wrapper, not a new capability.
- Verdict: reasonable IF a repeatable lifecycle is ever authorized
  (Option B); NOT needed for closure. No implementation now.

## 20. Should B be a real second canary?

Arguments for: proves repeatability with a non-empty catalog; proves the
transition to EXHAUSTED live; validates the one-shot lifecycle twice;
catches hidden count=1 assumptions.

Arguments against: B exists primarily as a structural canary (8B.1.0's
purpose was to prove the second adoption would NOT recreate the count=1
blocker — and the fixtures already prove it); little to no production
value (a synthetic regression case over the local fixture state machine);
repeated source mutation solely for proof is unnecessary; fixtures already
cover one-entry and exhausted states; canonical source should not be
mutated for ceremony.

**Verdict: NOT NOW.** B adoption should occur only if a future need
requires live repeatability evidence (e.g. before building new machinery on
the promotion chain) AND the owner authorizes it fresh. It is not a
Phase 8 completion requirement.

## 21. Should the portfolio be expanded before B?

- Current portfolio purpose: prove the machinery across catalog states —
  achieved.
- Two synthetic semantics are enough for the machinery proof.
- Adding variants before adopting B would invalidate the clean A→B
  experiment (the portfolio order and selection contract are frozen and
  contract-bound; changing them is a contract change).
- Portfolio expansion belongs AFTER Phase 8 closure, as part of a
  bug-hunting-driven phase, and only with semantics that carry real
  bug-hunting value.
- **Verdict: NO expansion before B; no expansion in Phase 8.**

## 22. Self-development value vs demonstration value

- Adopted case A: does its canonical adoption materially improve
  Nightwatch? NO — it adds one synthetic regression case
  (EXPAND_SUMMARY over the local fixture) to the evaluator's baseline. It
  does not find Alphaus bugs.
- It is an acceptance canary: its value is proving that the owner-gated
  promotion machinery works end to end on canonical source — which was the
  phase objective (C).
- Consequence for the next architecture: further canonical adoptions of
  synthetic variants have canary value only; real self-development value
  requires candidates with real bug-hunting semantics, which is a future
  phase concern, not Phase 8 promotion ceremony.

## 23. Bug-hunting roadmap alignment

Nightwatch's ultimate purpose is Alphaus bug hunting. Assessment:

- More Phase 8 promotion machinery (B adoption, queue, portfolio
  expansion, rollback machinery) adds self-development demonstration value
  and authority exposure, with near-zero bug-hunting return.
- Returning investment to campaign exploration, source-change correlation,
  differential testing, minimization/clustering, better test oracles,
  safer DEV coverage, and report quality has direct bug-hunting return.
- **The next major capability should be a bug-hunting investment, not
  another promotion feature.** This is the core decision criterion and it
  decides the recommendation (§26).

## 24. Phase 7 / Phase 8 interaction

- Phase 8 is a companion branch: it never enters the campaign runtime, AI
  review, anomaly admission, source relevance, fault boundaries, or owner
  drafts (8A boundary; ARCHITECTURE.md:266).
- Phase 8 could feed the campaign only via its truth protocols (continuity
  v2, project-state v1) and its disciplined evidence-chain pattern — both
  already exist.
- The next major capability should be in the campaign/oracle/triage space
  (Phase 9 concept), not another promotion feature. No implementation.

## 25. AI boundary

- Phase 7B AI remains non-oracle/non-controller; the selfDev proposer is
  `SYNTHETIC_DETERMINISTIC`.
- None of options A-E gives AI candidate-generation authority, safety
  decisions, promotion authority, or patch generation: A/E/C are
  non-AI; B's chain is deterministic + owner; D's portfolio is registry-
  derived. Option F would be dangerous for other reasons, and even F does
  not name AI as controller — but any future design must keep AI out of
  candidate generation authority, safety decisions, promotion authority,
  and patch generation. No model is run in this review.

## 26. Threat models (top three options: A, B, D)

Common failure modes table (A close / B repeat / D expand):

| Failure mode | Precondition | Effect | Detection | Prevention | Rollback/recovery | Residual risk |
|---|---|---|---|---|---|---|
| Stale source used for promotion | authoritative change after chain start | wrong-base evidence | digest gates fail closed | fresh chain from current source | restart chain | low (ceremony) |
| Stale approval reused | copy of consumed approval | second write attempt | `ALREADY_CONSUMED` + immutable store | claim-before-write | re-approve fresh only | low |
| Wrong candidate adopted | owner approves wrong intent | wrong canonical entry | owner reviews intent (pre/post digests) | content-bound approval | dev-session revert | low (human) |
| Catalog duplicate | adoption of adopted fingerprint | duplicate entry | `DUPLICATE_ID` validation; selector novelty | registry-derived fingerprints | renderer regen | ~none |
| Source overreach (write beyond target) | executor bug | multi-file changeset | post-write changeset check (`CHANGESET_INVALID`) | single-write executor + tests | revert | low |
| Second write | apply retry | second canonical write | consume-before-write + 1-write bound | one-shot approval claim | n/a (blocked) | ~none |
| Runtime Git mutation | executor bug | repo history tamper | `runtimeGitWrites: 0` + receipt/verification | no git helper exported | n/a | ~none |
| Full-suite regression | adoption semantics clash | broken tests | CI matrices | state-explicit baselines | revert | low (fixture-proven) |
| Provenance drift | source change after commit | old verification stale | `SOURCE_MISMATCH` | strict currentness | re-verify from current source | low |
| Owner confusion | ceremony complexity | wrong/duplicate steps | exact-ID CLI; tokens | one-command readiness (if B authorized) | dev-session restore | moderate (manual) |
| Repeated adoption loop | automation bug | multiple adoptions | no auto-loop by design; one APPLY per approval | approval one-shot | n/a | ~none |
| EXHAUSTED misinterpreted as failure | exhaustion after B | false alarm | CLI reports EXHAUSTED (no error) | doctrine + tests | n/a | low |

Residual risks are concentrated in the human owner step and in ceremony —
the exact places automation must NOT reach (L4-L6).

## 27. Recommended state machine (for the recommended option, A + its closure task)

States fitting the current architecture:

```
CLOSURE_DESIGNED (this review)
   ↓ (separate owner authorization + source change to pins)
PHASE_8_CLOSURE_APPROVED
   ↓
PINS_UPDATED → project-state block regenerated (count 1, COMPLETE statuses)
   ↓
VALIDATED (full suite + project:check + CI green)
   ↓
CLOSED — Phase 8 COMPLETE; roadmap selects next bug-hunting phase
```

Explicit alternative states (recorded, not executed):

```
STALE      — source advanced during closure → restart from fresh source
BLOCKED    — owner declines / authorization not granted → remains IN_PROGRESS
DEFERRED   — closure postponed → Phase 8 stays IN_PROGRESS (current state)
```

No new runtime states are introduced. The catalog states (EMPTY /
one-entry / EXHAUSTED) are unchanged; the recommendation does not advance
the catalog.

## 28. Authority transition table (for the recommended closure task)

| State | Operation | Required evidence | Authority | Side effects | Next states | Replay/retry |
|---|---|---|---|---|---|---|
| CLOSURE_DESIGNED | design review (this task) | evidence table + options + recommendation | L0 + owner authorization | docs only | CLOSURE_APPROVED / BLOCKED / DEFERRED | n/a (one review) |
| CLOSURE_APPROVED | update `bin/project-state-check.mjs` pins + hardening + tests + CURRENT_STATE block + docs | clean source, full validation | owner-authorized implementation task | source + docs change | PINS_UPDATED | fresh from clean source |
| PINS_UPDATED | full regression + project:check + CI | green suite + project:check | same task | commit + push | VALIDATED | repair + re-run |
| VALIDATED | mark Phase 8 COMPLETE in continuity records + roadmap | green CI at exact HEAD | same task | docs closure | CLOSED | none |
| CLOSED | STOP | n/a | n/a | n/a | future phase | task complete |

## 29. One-shot semantics (preserved for any future adoption)

- Approval: one-shot — consumed once, never refreshed, never reused.
- APPLY: one-shot per approval — one canonical write per consumed approval.
- Candidate/promotion pair: one promotion per evidence chain; a fresh
  candidate/adoption lifecycle gets a FRESH approval, but a spent approval
  is NEVER reused.
- Target preimage: bound per promotion; a source change invalidates the
  chain (fresh chain required).
- No ambiguity: "a fresh adoption may have a fresh approval; a spent
  approval is never refreshed."

## 30. Identity requirements (for a future repeated lifecycle)

Identity is already collision-free per chain: candidate (content-addressed
semantics), adopted case (base-independent `adopted-case:sha256:...`),
plan/result/promotion/approval/receipt/verification (content-addressed
under their own schemas with cross-bindings). A second adoption cannot
collide with R1 artifacts: approval IDs differ by promotion ID + digests;
adopted-case IDs differ by semantics (B ≠ A). Identity gap identified:
NONE in the artifacts; the only shared mutable identity is the
CURRENT_STATE machine block (a snapshot updated by the dev session).
No schema changes proposed.

## 31. Serialization / concurrency

- Two simultaneously prepared promotions: promotion IDs are content-
  addressed; a second APPLY would fail HEAD/digest gates after the first
  commit (`PROMOTION_SOURCE_ADVANCED`).
- Stale promotion after another canonical change: currentness gates fail
  closed.
- Two approvals: approval store is exact-ID no-replace; claims are
  atomic (`ALREADY_CONSUMED`).
- Concurrent CLI invocation: apply's consume-before-write serializes on
  the immutable claim record; sandbox loader has a serial lock.
- Verdict: current exact preimage/current-source gates already fail
  closed; no additional serialization recommended.

## 32. Catalog write count

- Any future adoption remains exactly ONE canonical source write per
  approved promotion (`maximumCanonicalSourceWrites: 1`).
- Operation-local counter vs historical catalog count: receipts count
  writes per operation (always 0 or 1); the catalog count is historical
  state (1 today; 2 after a B adoption; 0..64 bounded). The two are
  distinct and both are already truthful; a repeatable lifecycle does not
  confuse them. No change.

## 33. Project-state protocol evolution

Current: count 1, B available, authority NONE. Possible future: count 2,
portfolio EXHAUSTED.

- `nightwatch.project-state.v1` already expresses EXHAUSTED as a legal
  projected member value; count/digest derive from live source. So
  count-2/exhausted is expressible with a block regeneration.
- What it does NOT yet express: any Phase-8 status beyond
  `IN_PROGRESS`/`COMPLETE_VIA_SUCCESSFUL_RETRY_R1` — the pins
  (`project-state-check.mjs:172-174`) are the smallest evolution point.
  Smallest evolution: add legal status tokens (e.g. `PHASE_8_STATUS:
  COMPLETE` after closure, or a second-adoption status for 8B.1) + update
  pins + tests. Protocol version stays v1 (the block shape does not
  change; only legal values do).
- No protocol modification is made by this review.

## 34. Continuity protocol

- A repeated-adoption task would work naturally under
  `nightwatch.agent-continuity.v2`: the R1 retry already demonstrated an
  IN_PROGRESS → COMPLETE chain with terminal fields; a second adoption is
  the same shape. The closure task likewise fits.
- Missing semantics: NONE identified. v2 has no concept of "phase
  completion" — that belongs to project-state v1 pins, not continuity.
- No continuity redesign.

## 35. CI capacity

- Catalog integrity step: cardinality-agnostic (EMPTY/one/two all PASS).
- Phase 8 matrices: state-explicit (fixtures), count-2 safe.
- Project-state step: derives from live source; the only count-sensitive
  input is the CURRENT_STATE machine block (regenerated at adoption).
- Continuity audit: cardinality-independent.
- Hard-coded count=1 assumption: NONE in CI. Recorded finding: the pins
  at `bin/project-state-check.mjs:172-174` hard-code the STATUS tokens,
  which is the actual (small) source change for closure or second
  adoption.
- Verdict: a repeated one→two adoption would already pass CI given the
  block regeneration + pin update.

## 36. Test baseline capacity

- EMPTY / EXPAND_ONLY / EXPAND_AND_COLLAPSE prove catalog states 0/1/2
  including controller behavior, CLI behavior, adoption eligibility, and
  exhausted semantics (portfolio 30 tests; catalog 15; promotion flow 8).
- What a real B promotion would add beyond tests: only the live owner
  ceremony and the live pin/block transition (§24). No new test-state
  knowledge.
- Recorded gap (relevant only to a future second adoption): no promotion
  flow test starts from a two-entry baseline (a second adoption's postimage
  would be count 3 — currently untested). A future authorized B adoption
  task should add that baseline; this review does not.

## 37. Unique evidence gap each option closes

- A (close): closes the "no exit criteria / indefinite IN_PROGRESS" gap —
  defines PHASE_8_COMPLETE and hands the roadmap to bug hunting. It does
  NOT close any machinery evidence gap (none remains that matters).
- B (repeat): closes "live second adoption + live EXHAUSTED + live pin
  transition" — operational evidence only, at the cost of ceremony +
  source change.
- C (queue): closes nothing not already covered by artifacts/eligibility.
- D (expansion): closes "larger portfolio coverage" — synthetic only; no
  bug-hunting gap.
- E (rollback): closes a demonstrated gap in nothing — the dev-session
  model already covers every scenario.
- F (autonomous): closes the "owner must be present" gap by REMOVING the
  owner — the opposite of a safe gap closure.

## 38. Final decision matrix

| Option | New capability | Evidence gap closed | Source changes | Owner authority | Canonical writes | Safety risk | Complexity | Operational cost | Benefit | Recommendation |
|---|---|---|---|---|---|---|---|---|---|---|
| A close | exit criteria + bug-hunting redirect | indefinite-phase gap | pins (closure task, separate auth) | L4-level (owner auth for closure task) | 0 | minimal | low | low | high (focus) | **RECOMMEND** |
| B repeat lifecycle | second live adoption | live ceremony + pin transition | pins + block (small) | L4+L5 per adoption | 1 per adoption | low (guarded) | low (chain exists) | high (ceremony) | low for synthetic B | VIABLE_LATER |
| C queue | queue/readiness UI | none | medium | none new | 0 | low | medium | medium | low | DEFER |
| D portfolio expansion | more variants | synthetic coverage | medium | L6 dev-commit | 0 | low | medium | medium | low (synthetic) | DEFER |
| E rollback machinery | runtime revert | none | medium-high | escalates runtime write | 0 | medium | high | high | negative | REJECT |
| F autonomous promotion | self-promotion | none (destroys authority) | high | removes owner | unbounded | high | high | high | negative | REJECT |

## 39. Primary recommendation

```
PHASE_8_NEXT_ARCHITECTURE:
  CLOSE_PHASE_8
```

Rationale (summary): the Phase 8 objective — one owner-authorized canonical
self-development promotion with a complete source-bound evidence chain, plus
continuation — is fulfilled with live evidence and hardened truth
protocols. The remaining options re-demonstrate fixture-proven states
(live ceremony) or add authority/complexity without bug-hunting value.
Nightwatch's purpose is Alphaus bug hunting; the next investment belongs
there, not in more self-development promotion machinery. Phase 8 should
close via a separate authorized closure task (the pins make it a source
change); variant B stays AVAILABLE_NOT_ADOPTED with authority NONE.

```
SECONDARY_LATER_OPTION:
  REPEATABLE_OWNER_GATED_ADOPTION
```

The promotion chain is generic and ready; it should be used only when a
real candidate with bug-hunting value exists (fresh owner authorization per
adoption), not for B-as-ceremony.

Rejected options: F (autonomous promotion) — REJECTED_BY_DESIGN, named
authority principle: it replaces per-adoption owner approval with standing
runtime authority, violating AGENTS.md's "explicit owner authority for
irreversible canonical promotion" and the one-shot-approval / no-auto-loop
principles, and it collapses candidate-eligibility-authority into one axis.
E (runtime rollback) — REJECTED: dev-session Git restore covers every
scenario; a runtime revert mirrors the write authority.

## 40. Phase naming decision

The recommended work is **Phase 8 closure** (A), not Phase 8C, not Phase
8B.2, not Phase 9:

- Phase 8B.2 would imply capability work inside the 8B.1 lineage — none is
  recommended.
- Phase 8C would invent a label for closure; the roadmap explicitly records
  "No Phase 8C exists" and nothing in this review creates a Phase 8
  capability.
- Phase 9 is reserved for the next bug-hunting capability, selected by a
  separate roadmap decision after closure.
- "Phase 8 closure" is the roadmap-semantics-true name.

## 41. Explicit PHASE_8_COMPLETE criteria

Phase 8 is COMPLETE when ALL of the following hold (they hold today):

1. Owner-gated canonical promotion proven live: one real adoption
   committed (24fc437) with fresh-process verification
   (`CANONICAL_PROMOTION_COMMITTED_EXACT`) and exact CI green at count 1.
2. Continuation after adoption proven: fresh current-source sessions
   replay PASS and select the next portfolio member with eligibility true;
   catalog-aware proposer verified (capabilities N/O).
3. Current-source truth hardened: project-state v1 and continuity v2
   machine-enforced and CI-green (capabilities P/Q/R).
4. No unresolved safety blockers: all Phase 8 safety vectors zero;
   promotion authority NONE; variant B AVAILABLE_NOT_ADOPTED.

Closure execution (flipping `PHASE_8_STATUS` to COMPLETE in the machine
block + pins + docs) is a separate authorized task — the design review
records the criteria but does not perform the flip (source change).

## 42. Non-goals of this review (explicit)

- No B adoption; no sandbox run; no promotion chain; no catalog mutation.
- No implementation of the recommended architecture.
- No project-state block / pin change; no owner-policy change.
- No AI/model execution; no product/DEV/NEXT/production/DB/infra activity.
- No Alphaus repo writes; no publication.

## 43. Implementation boundary

- This review changes only `.agent/**` and `docs/**` (task records, design
  artifact, D-52, ROADMAP, CURRENT_STATE narrative).
- The recommended closure task changes `bin/project-state-check.mjs`
  (status pins), `bin/hardening-check.mjs` (guard text), focused tests,
  and docs — a source change requiring separate authorization. Nothing here
  executes it.
- `AGENTS.md` unchanged (no new permanent operating rule; the existing
  contract already covers this design).

## 44. Migration implications

- No runtime/schema/artifact migration. The catalog, portfolio, contract,
  and all stores are untouched.
- Project-state: legal values may gain `PHASE_8_STATUS: COMPLETE` in the
  future closure task; block shape unchanged.
- Continuity: no change; the closure task uses the standard v2 lifecycle.
- Docs: CURRENT_STATE narrative updated; historical Phase 8 records
  preserved verbatim.

## 45. Proposed next task (implementation-ready spec — NOT authorized)

**Task name:** Phase 8 Final Closure & Phase 9 Roadmap Selection

- Phase name: Phase 8 closure (roadmap semantics; no Phase 8C).
- Objective: mark Phase 8 COMPLETE (machine block + pins + docs), freeze
  the canonical-promotion research boundary (machinery preserved, no new
  Phase 8 promotion work), and select the next bug-hunting investment
  (Phase 9 concept) via a roadmap decision record.
- Authorization class: `PHASE_8_CLOSURE_AND_ROADMAP_SELECTION_ONLY` (fresh
  owner authorization required — NOT granted by this review).
- Allowed files: `bin/project-state-check.mjs` (status pins + tests),
  `bin/hardening-check.mjs` (guard text), `tests/unit/projectState.test.ts`
  (new legal tokens), `docs/**`, `.agent/**`. No selfDev runtime code, no
  portfolio, no promotion, no catalog file.
- Forbidden authority: no approval, no APPLY, no adoption, no catalog
  mutation, no B promotion, no owner-policy change, no AI/model, no
  product/DB/infra, no publication.
- State machine: DESIGNED → APPROVED (owner) → PINS_UPDATED → VALIDATED →
  CLOSED; STALE/BLOCKED/DEFERRED explicit.
- Acceptance criteria: `PHASE_8_STATUS: COMPLETE` machine-enforced;
  project:check + agent:check + agent:audit + catalog integrity +
  hardening green; full suite green; exact CI green; roadmap records the
  selected next investment as DESIGNED/NOT_STARTED/NOT_AUTHORIZED; task
  closed under continuity v2 with terminal fields.
- Tests: extend project-state tests to legal COMPLETE token; hardening
  guard text update; no weakening of existing tests.
- CI: existing 24 steps; project-memory truth check now enforces COMPLETE.
- Safety vector: canonical catalog writes 0, promotion intents 0,
  approvals 0, APPLY 0, adoptions 0, external 0; Nightwatch source + docs
  commits expected only.
- Stop conditions: any need to mutate the catalog, portfolio, contract, or
  promotion machinery → STOP and return for re-design; any source drift →
  restart from fresh current source; CI failure → repair before closing.

## 46. Acceptance criteria for THIS design review

- Exactly one primary recommendation token (§39) with evidence-based
  rationale — satisfied.
- Design artifact covers all required sections — this document.
- Decision record appended (D-52), roadmap records the design with
  NOT_AUTHORIZED markers, CURRENT_STATE machine block mechanically
  unchanged.
- All read-only validations pass; docs commit pushed fast-forward; exact
  CI green; worktree clean.
- Task closed COMPLETE under continuity v2 with terminal fields.

## 47. Final principle

The system has proven the full chain — deterministic proposal → evaluation
→ source-bound replay → eligibility → sandbox adoption → owner-gated
canonical promotion → one real canonical adoption → clean committed
verification → current-source continuation → durable task truth → durable
project truth. The existence of candidate B proves continuation; it does
not establish that adopting B is valuable. The answer to "what new
Nightwatch capability is worth the added authority, complexity, and proof
burden?" is: for Phase 8, none further — close it and invest the next
authorization in bug hunting.
