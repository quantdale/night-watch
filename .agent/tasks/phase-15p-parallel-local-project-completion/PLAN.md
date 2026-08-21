# PLAN — Phase 15P Parallel Local Project Completion

Task ID: phase-15p-parallel-local-project-completion
Phase: 15P-PARALLEL-LOCAL-PROJECT-COMPLETION
Continuity: nightwatch.agent-continuity.v2

## Purpose

Execute the remaining LOCAL/SOURCE implementation backlog as one parallel
campaign: up to 16 specialized sub-agents (A01–A16) implement in isolated
local worktrees; the parent integrates accepted patches into canonical main
in dependency waves with validation after each wave, then runs one larger
pre-hardening integration pack and hands off to the separately authorized
integrated hardening campaign.

## Starting State

- Program predecessor: Sessions 1–2 of
  `phase-15-four-session-local-project-completion` COMPLETE on main;
  Sessions 3–4 architectural backlog superseded into this task.
- Phase-15P session started at `e07630238d314f48718b1ca9fce2dc9ee31317eb`
  (HEAD == origin/main verified after fetch --prune).
- Session-1 convergence layer live:
  `src/oracles/expectations/lifecycle/*`, `src/core/identity/canonicalDigest.ts`.
- Session-2 campaign convergence live: candidate lifecycle state machine,
  V2-only certified replay path, truthful minimization evidence,
  promotion-result DTO, checkpoint runtime-contract compat, v2 dossiers,
  integrated campaign proof suite.

## Scope

The sixteen assignments A01–A16 exactly as frozen in SPEC.md. Parent-owned
integration waves:

- WAVE 1 foundation: A01, A02, A03, A04.
- WAVE 2 campaign runtime: A05, A06, A07, A09.
- WAVE 3 triage and operational surfaces: A08, A10, A11, A12.
- WAVE 4 convergence: A13, A14, A15, A16.

## Non-Goals

- No DEV/NEXT/production/real-campaign/data/infra/Phase-6 execution.
- No Alphaus sibling writes; no AI/selfDev/promotion authority.
- No Phase 11B / Phase 13B; no catalog mutation; no variant-B adoption.
- No final integrated hardening campaign (separate future authorization).
- No complete canonical/isolated Playwright regression in this task.
- No force-push, history rewrite, or remote swarm branches.

## Safety Constraints

- Fail-closed everywhere; unknown operations stay blocked by the owner gate.
- No credentials/auth state/customer data/secrets in source, artifacts, or
  .agent files; synthetic fixtures only.
- Sub-agents never mutate the canonical checkout; each works only in its own
  worktree and never pushes. Parent reviews every diff before cherry-pick.
- Fast-forward-only pushes from canonical main; stop and reconcile if
  origin/main advances.

## Architecture / Approach

Isolated `git worktree` per coding sub-agent under `/tmp/nightwatch-swarm-*`
on branches `swarm/aNN-<name>` cut from canonical main. Each sub-agent owns a
disjoint dependency cone, adds focused permanent tests, commits locally, and
returns the structured handoff contract (AGENT_ID, ASSIGNMENT, BASE_SHA,
BRANCH, WORKTREE, IMPLEMENTATION_SHA, FILES_CHANGED, PUBLIC_TYPES_OR_VERSIONS_
CHANGED, BEHAVIORAL_CHANGES, TEST_COMMANDS, RAW_TEST_COUNTS, KNOWN_RISKS,
OVERLAPS_FOUND, RECOMMENDED_INTEGRATION_ORDER). The parent cherry-picks
accepted commits one at a time in dependency order, resolves conflicts
semantically, validates per wave, and records everything in
SUBAGENT_LEDGER.md and INTEGRATION_LEDGER.md.

## Milestones

- [x] M0 Baseline: adopt prior Session-2 closure artifacts (integrated proof test + continuity), extend checker allowlist for mandated 15P artifacts, create 15P task files, verify agent:check + project:check, commit + push baseline.
- [x] M1 WAVE 1 integrated: A01+A02+A03+A04 patches accepted, cherry-picked in dependency order, typecheck + focused foundation tests + git diff --check green, canonical checkpoint pushed.
- [x] M2 WAVE 2 integrated: A05+A06+A07+A09 patches integrated, typecheck + focused replay/minimization/campaign/checkpoint tests + campaign:synthetic + git diff --check green, canonical checkpoint pushed.
- [x] M3 WAVE 3 integrated: A08+A10+A11+A12 patches integrated, typecheck + focused triage/dossier/tooling/schema tests + git diff --check green, canonical checkpoint pushed.
- [x] M4 WAVE 4 integrated: A13+A14+A15+A16 patches integrated, typecheck + hardening:check + focused privacy/authority/adversarial/integration tests + campaign:synthetic + git diff --check green, canonical checkpoint pushed.
- [x] M5 Final integration pack: typecheck, hardening:check, campaign:synthetic, test:owner-provenance (if cone touched), agent:check, project:check, git diff --check; all NEW tests from A01–A16 plus directly affected Phase 9–14 compatibility suites; synthetic release-candidate rehearsal >= 3 green repeats; all hard floors zero.
- [x] M6 Handoff closure: COMPLETE — HARDENING_HANDOFF.md fully populated incl. machine-readable changed-file list (73 files) from starting SHA to final implementation SHA `42c5a7e1ab3f438a9c82688f2eee645d3c548d64`; docs updated (CURRENT_STATE, ROADMAP, DECISIONS); terminal statuses set; final canonical checkpoint pushed fast-forward; HEAD == origin/main; clean tree.

## Validation Strategy

Per sub-agent: focused permanent tests in its isolated worktree (never the
full repository suite). Per wave: parent runs typecheck, wave-scoped focused
tests, git diff --check, plus campaign:synthetic for waves 2 and 4. Final:
the M5 integration pack. Raw counts recorded in STATE.md Validation Ledger,
INTEGRATION_LEDGER.md, and HARDENING_HANDOFF.md. Deferred suites are recorded
NOT_RUN / DEFERRED_TO_INTEGRATED_HARDENING, never PASS.

## Decision Log

- D-15P-1: One parallel campaign supersedes the four-session EXECUTION SHAPE;
  architectural/safety requirements are preserved verbatim from the session
  specs (owner directive in PHASE_15_PARALLEL_16_AGENT_IMPLEMENTATION_LOCAL_ONLY).
- D-15P-2: Worktree-per-sub-agent integration model; if a sub-agent cannot
  safely use an isolated worktree it is downgraded to read-only analysis /
  review and the parent performs its source mutations serially.
- D-15P-3: Checker allowlist extended only for the owner-mandated 15P
  artifacts (PROPOSAL, SUBAGENT_LEDGER, INTEGRATION_LEDGER), enumerated
  explicitly, mirroring the M6b precedent.
- D-15P-4: Known external CI billing block is recorded once per push and
  never retried in a loop; local/source evidence is the acceptance authority
  until Actions executes for live HEAD.

## Discoveries

- Bootstrap found legitimate uncommitted prior-session work: the Session-2
  pending closure (continuity updates, candidateLifecycle comment-truth fix)
  plus the untracked Workstream-G integrated proof test with one stale draft
  leg-tag assertion (`'B'` vs actual leg tag `'API_DIVERGENCE'`). Repaired
  and validated (4/4) rather than discarded; adopted into the 15P baseline.
- HEAD == origin/main == `e07630238d314f48718b1ca9fce2dc9ee31317eb` at
  session start; no fast-forward needed.

## Deferred Work

- Final integrated hardening campaign (owner token
  `PHASE_15_INTEGRATED_HARDENING_LOCAL_ONLY`): complete canonical Playwright,
  topology-correct isolated complete Playwright, exhaustive Phase 1–14
  compatibility, repository-wide adversarial fuzz, complete historical
  migration matrix, final CI-equivalent reproduction.
- Any non-touched dependency cone outside the sixteen assignments.

## Completion Criteria

All sixteen assignments integrated focused-green or precisely blocker-
documented; four waves validated and pushed; final rehearsal >= 3 green
repeats with all hard floors zero; HARDENING_HANDOFF.md complete; terminal
state IMPLEMENTATION_COMPLETE_AWAITING_INTEGRATED_HARDENING (or
PARTIAL_IMPLEMENTATION_BLOCKED with enumerated blockers); HEAD == origin/main;
clean tree; NEXT ACTION: STOP.
