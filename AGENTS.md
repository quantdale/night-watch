# Nightwatch Agent Contract

This repository is a private, read-only-by-default bug-hunting framework. All
implementation changes belong here. Do not contact a real Alphaus environment,
query a database, mutate production data, or modify Alphaus repositories as
part of normal development.

## Canonical Git topology and checkpoint policy

The canonical writable Git root is
`/home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch`. Its canonical
remote is the private `origin`
(`https://github.com/quantdale/night-watch.git`) on `main`. The parent
workspace is intentionally not a Git repository; do not restore its retired
`.git` metadata or use the preserved accidental-Git backup.

Nightwatch development sessions may commit and push only validated durable
checkpoints from this repository to `origin main`. Before each push, validate
the scoped work, inspect the diff and privacy surface, and verify local
`HEAD == origin/main` after the push. If `origin/main` advances or a push is
rejected, stop and reconcile; never force-push. The campaign runtime never
commits, pushes, or publishes runtime findings. Real findings remain in the
owner-only local store outside GitHub.

## Session bootstrap

Before substantial work:

1. Confirm the current directory is inside this Nightwatch Git repository.
2. Read this file.
3. Read `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`,
   `docs/DECISIONS.md`, and `docs/ROADMAP.md`. Read `docs/ARCHITECTURE.md`
   when architecture is relevant.
4. Read `.agent/ACTIVE_TASK.md`.
5. For an `IN_PROGRESS` task, read its `SPEC.md`, `PLAN.md`, and `STATE.md`
   in that order, then resume from `STATE.md`.

Do not restart investigation or planning merely because the conversation is
fresh. The active task files are the execution memory.

## Authority and scope

When sources disagree, use this precedence:

`current tests/runtime evidence` > `current implementation` >
`active task STATE/PLAN` > `durable docs/decisions` > `recon handoffs` >
`assumptions`.

Record disagreements, prefer the stronger/current evidence, and update the
stale durable document. Never silently reconcile contradictions.

Do not broadly rediscover established facts: do not rescan Alphaus repos,
repeat Recon A/B/C/D, re-audit Nightwatch architecture, reread unrelated
files, or rerun completed experiments by default. Re-verify only when the
active task requires it, implementation depends on it, repository freshness
may invalidate it, or current evidence contradicts it; use the narrowest
decisive check.

Nightwatch may read Alphaus repositories only when explicitly required and
must never modify them. Preserve the existing fail-closed, read-only safety
model. No credentials, auth state, bearer tokens, cookies, customer data, or
other secrets may enter source, artifacts, or `.agent` files. Safe path
references are allowed; tests use synthetic fake values only.

## Permanent owner scope freeze

Nightwatch is a private local project. The active roadmap is confined to local
source intelligence, contained DEV browser/API testing, deterministic replay,
failure minimization, sanitized evidence, and private local triage. The owner
decision is executable in `src/core/policy/ownerScope.ts`:
`FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.

Nightwatch must not autonomously execute or request GCP/GKE/Kubernetes/cloud
deployment archaeology, AWS infrastructure/IAM/STS/runtime-role discovery,
DynamoDB/BigQuery/Spanner/production SQL or datastore metadata operations,
deployment-owner handoffs, or external publication. Unknown operation classes
fail closed with `OWNER_POLICY_BLOCKED` before an executor callback. Existing
Phase 6 types and synthetic adapters are preserved for compatibility, while
real data execution is quarantined behind that owner gate.

Real findings belong in owner-only local state (default
`$HOME/.nightwatch/findings/`), never in a shared connector, message system,
remote repository, or Alphaus repository. Chrome DevTools MCP remains optional
and subordinate to Playwright containment; it never receives credentials or
raw authenticated evidence.

Phase 7 campaign commands are local and bounded: `npm run campaign:synthetic`
executes the repository-owned deterministic fixture matrix, while
`npm run campaign:real -- --env=dev` is an explicit opt-in for one guarded
DEV campaign and requires the external owner-only storage state. The real
launcher is serial, fail-closed, and never runs in production, publishes
findings, or performs infrastructure/data operations.

## Phase 9 semantic oracles (permanent rule)

Phase 9 is `COMPLETE_LOCAL_SYNTHETIC` (D-54). Semantic oracles
(`src/oracles/projections/**`, `src/oracles/expectations/**`,
`src/oracles/invariants/**`, `src/oracles/semantic/**`) are ADDITIVE to the
protocol oracles and deterministic only: raw customer values never cross the
projection boundary, never persist, and never enter findings, fingerprints,
dossiers, or error messages; expectations are declarative, provenance-bound
(repo @ SHA), and fail closed when source is stale or unavailable; the
semantic core has no AI/selfDev/Phase6/infra/network/persistence authority
(hardening-guarded). Contained DEV acceptance of the semantic layer requires
a separate owner authorization (provisionally Phase 9B); none is standing.

## Phase 9A.1 real-source expectation admission (permanent rule)

Phase 9A.1 (D-55) established the ONLY route from real Alphaus source to a
real-product semantic expectation: a versioned data-only recipe
(`nightwatch.real-source-expectation-recipe.v1`) + fixed bounded
syntax-aware extractor + deterministic source-evidence digest
(`ev:sha256:<24>` over the normalized source structure used to derive) +
approved read-only target + exact current source snapshot, admitted through
`deriveRealSourceExpectations` (fail-closed on contract drift). Rules:

- Alphaus repositories are NEVER annotated or modified for Nightwatch;
  `@nightwatch-contract` remains valid for synthetic fixtures only.
- A provenance label alone never grants semantic authority: an expectation
  without mechanically verified derivation evidence is not a real-source
  expectation (synthetic expectations can never be relabeled as real —
  `REAL_SOURCE_EXPECTATION_PROOF_MISSING` semantics).
- Expectations are never silently re-bound to a new SHA; a changed source
  requires fresh derivation/re-admission.
- Every semantic evaluation yields a safe receipt
  (`nightwatch.semantic-evaluation-receipt.v1`); NO_EXPECTATION, SOURCE_
  STALE, SOURCE_UNAVAILABLE, NOT_APPLICABLE and INTERNAL_ERROR are never
  PASS; zero findings never proves PASS.
- Semantic-hook failures are never silent: safe INTERNAL_ERROR receipts;
  privacy-contract violations escalate through the existing safety
  architecture.
- The recipe/extractor/admission/resolver/receipt cores have no
  eval/child-process/fs/network/DB/AI/selfDev/persistence authority
  (hardening-guarded); the ONLY sibling-source access is the read-only
  path-confined module `src/core/source/siblingSource.ts`.

## Phase 10 deeper real-source semantic contracts (permanent rule)

Phase 10A (D-59) extended the Phase 9A.1 admission bridge with mechanically
proven DEEPER contracts, LOCAL/SYNTHETIC only:

- Recipe schema v2 (`nightwatch.real-source-expectation-recipe.v2`) carries
  item-level field type contracts (`itemFieldTypeContracts`:
  field/itemIndex/allowedTypes) proven by the fixed bounded
  `PHP_ITEM_FIELD_TYPE_FLOW` extractor (patterns `EMPTY_CAST_OBJECT` ⇒
  ['OBJECT'], `EMPTY_ARRAY_OR_STRING_KEYS` ⇒ ['ARRAY','OBJECT']; any other
  assignment pattern ⇒ `TYPE_FLOW_AMBIGUOUS` — admission is never weakened
  to fit the source). v1 recipes stay byte-meaning-stable; the retired v1
  recipes for the enriched targets are archived data-only under
  `corpus/phase10/historical/` and never re-enter the active registry.
- Deeper invariants come ONLY from mechanically established CURRENT source
  flow. A class constant, a cast in one branch, a variable name, or a
  design document alone never proves a contract: the finite-key/
  object-key-set class stays NOT admitted while the output-key flow cannot
  be tied to a source-defined set (`SOURCE_ENUM_FLOW_UNPROVEN`). The new
  fixed invariant `TYPE_IN_SET` (bounded 1..6 known ProjectionNodeType
  values; missing path / empty-uninspected parent ⇒ NOT_APPLICABLE;
  observed ∈ set ⇒ PASS; outside ⇒ VIOLATED) is the ONLY invariant
  vocabulary addition.
- Deep expectation IDs (`...real-source-deep`) are distinct identities;
  historical shape IDs (`...real-source-shape`) stay historical-only and
  Phase 9B-R1's DEV evidence remains truthful at its old checkpoint. The
  normalized type-flow extraction participates in the ev:sha256 evidence
  digest; the digest canonical form and both extraction loops (admission +
  resolver) fail closed on unknown kinds.
- Phase 10A proved LOCAL/SYNTHETIC detection depth only: NO DEV validation
  was performed and none is implied; any Phase 10B contained DEV acceptance
  requires a separate owner authorization
  (`PHASE_10B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY`).

## Task and checkpoint discipline

Any multi-milestone, long-running, architecture-changing, safety-sensitive,
or compaction-prone task uses `.agent/tasks/<task-id>/` with `SPEC.md`,
`PLAN.md`, `STATE.md`, and `REPORT.md`. `PLAN.md` is living; `SPEC.md` is
frozen intent; `STATE.md` is the concise operational waypoint; `REPORT.md` is
the final handoff. Project docs under `docs/` describe what Nightwatch is and
must not become minute-by-minute logs.

Update `STATE.md` after each milestone, design decision, unexpected constraint,
significant validation, safety event, before a substantially different
subproblem, before ending a session, and whenever context may be compacted or
lost. Checkpoint often enough that losing the conversation costs at most one
small unit of work.

Durable Git continuity records stable historical anchors, not a prediction of
the commit that contains the record. `LAST_VALIDATED_IMPLEMENTATION_SHA` names
the substantive implementation that passed validation;
`LAST_SUBSTANTIVE_CHECKPOINT_SHA` names that closure anchor, and
`LAST_DOCUMENTATION_CHECKPOINT_SHA` may name an approved documentation
descendant. Live local and remote HEAD are discovered from Git. `Current SHA`,
`CURRENT_LOCAL_HEAD`, `CURRENT_REMOTE_HEAD`, and `LAST_PUSHED_SHA` are legacy
historical compatibility fields only and must never be compared as persisted
live authority. Documentation-only descendants remain checkpoint advances and
must not be relabeled as implementation commits.

For every milestone: implement, run its defined validation, repair failures,
record the exact result in `STATE.md`, then advance. If required validation
fails, stop accumulating unrelated changes and repair it first. Keep discoveries
outside scope under `Deferred / Follow-Up`.

## Continuity protocol v2 (agent continuity)

Every non-NONE active task declares, in both `.agent/ACTIVE_TASK.md` and the
matching `STATE.md`:

```
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
```

Under v2 the checker enforces a cross-file task-status state machine:

- COMPLETE is a semantic state, not a label: ACTIVE/STATE/REPORT statuses
  agree; the current phase-specific status (`PHASE_<TOKEN>_STATUS`) normalizes
  to COMPLETE; current milestone, work-in-progress, next action and resume
  recipe are terminal; the completion snapshot is complete; PLAN live
  milestones are closed; no unresolved closure placeholders remain.
- BLOCKED means actually blocked: `## Blockers` is non-empty and the exact
  next action is STOP or a concrete unblock condition.
- IN_PROGRESS means actually active: a real current milestone and a concrete
  next action, and no false COMPLETE claim.
- Duplicate canonical structured fields are errors even when values are
  identical (`DUPLICATE_CONTINUITY_FIELD` with line numbers).
- Future-value placeholders such as `(filled after push)` / `(filled at
  close)` are rejected in COMPLETE live/final fields. `DISCOVER_FROM_GIT`,
  `LIVE_HEAD_AUTHORITY: GIT` and `FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD`
  are intentional authority markers, not placeholders.
- Tracked documents record only SHAs and CI run IDs already known before the
  document commit; live HEAD is discovered from Git; a document never predicts
  the SHA or CI run of the commit that contains itself.
- `npm run agent:check` strict-validates the active task and every v2 task
  directory; `npm run agent:audit` reports the full history inventory.
  Historical tasks without the marker remain readable legacy v1 records
  (warnings only) — do not mass-migrate them; migrate individually only when a
  future task directly depends on them.

## Project-memory truth (project-state v1)

`npm run project:check` validates the machine-checked truth block in
`docs/CURRENT_STATE.md` (`nightwatch.project-state.v1`) against mechanically
derivable source:

- `CURRENT_STATE` is a project SNAPSHOT, never its own Git/checkpoint
  authority. Live HEAD comes from Git; the current implementation checkpoint
  comes from `.agent/ACTIVE_TASK.md` + task `STATE.md` under continuity v2.
  Do not add generic live anchor rows (e.g. `LAST_VALIDATED_IMPLEMENTATION_SHA`)
  to CURRENT_STATE — they are rejected by project:check as competing
  duplicate authority. Historical phase-qualified anchors stay valid.
- The canonical adopted-case catalog is produced only through the
  deterministic renderer; never hand-edit
  `adoptedCaseCatalog.generated.ts`.
- CANDIDATE AVAILABILITY ≠ PROMOTION AUTHORITY: variant B may remain
  `AVAILABLE_NOT_ADOPTED` while `NEXT_PROMOTION_AUTHORITY: NONE`; project:check
  enforces NONE exactly.
- PHASE 8 IS COMPLETE (D-53): the canonical-promotion research boundary is
  closed, but the owner-gated machinery is retained — not frozen. Candidate
  availability never grants promotion authority, and any future canonical
  promotion requires a separately authorized concrete task (concrete
  bug-hunting-value candidate + fresh owner authorization + fresh
  current-source evidence + fresh one-shot approval + one bounded APPLY).

## Recovery

If context may have been compacted or certainty is lost: stop editing; read
`.agent/ACTIVE_TASK.md`, then the task `SPEC.md`, `PLAN.md`, and `STATE.md`;
inspect `git status`/diff; reconcile state with the working tree; run the
smallest decisive validation; update `STATE.md`; and continue its `Exact Next
Action`. The working tree and tests outrank remembered conversation.

A fresh session loads project state and the active task, verifies Git state,
and resumes the exact next action. It does not begin with broad repository
exploration.

When complete, run all acceptance checks, update plan statuses, fill the state
completion snapshot and `REPORT.md`, update project docs when appropriate, set
`ACTIVE_TASK.md` to `COMPLETE` or `NONE`, commit within Nightwatch, and leave a
clean tree unless an exception is explicitly recorded.
