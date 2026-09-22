# Priority audit remediation sequence implementation

## Task purpose

Own the owner-authorized, serial implementation of five already-planned audit
remediations in one C-00 session: NW-AUD-010, NW-AUD-014, NW-AUD-019,
NW-AUD-018, and NW-AUD-020. Each remediation keeps its own OpenSpec identity;
this umbrella task owns orchestration, cross-phase integration audit, and final
certification.

## Established starting state

- Task ID: `nightwatch-priority-audit-remediation-sequence-v1`
- Starting SHA: `4a3df8cdc776c5ca47a9666f65afbd5c5519f092` (`main`, equal to
  `origin/main` at campaign start).
- Predecessor campaign `nightwatch-session-mutation-authority-binding-v1`
  (NW-AUD-006) is COMPLETE and integrated; its authority model is the C-00
  contract this campaign must use.
- All five target OpenSpec changes are strict-valid and planning-complete;
  their task STATEs are terminal planning-only records that remain historical
  truth and are not rewritten into implementation state.
- Live defects for all five findings were re-verified against this base during
  Phase-0 reconnaissance; none is SUPERSEDED_BY_LIVE_IMPLEMENTATION.
- Native checks at start: `session:status`, `workspace:check`, `agent:check`,
  `handoff:check`, `project:check`, `session:check` all PASS.

## Required deliverables

- One owned C-00 session worktree on
  `session/nightwatch-priority-audit-remedi-0e17af9c`, claimed under the
  NW-AUD-006 authority-binding contract (no `--root` on mutators; exact
  `--expect-session` / `--expect-head` where required).
- Umbrella continuity (this directory) and umbrella OpenSpec change, both
  strict-valid under continuity v2 / handoff v1.
- Phase 1 NW-AUD-010: categorical release-evidence lineage, exact-checkpoint
  certification, snapshot-bound HEAD, verdict digest, synthetic Git matrix,
  mutations.
- Phase 2 NW-AUD-014: total invocation-based child-process census, closed
  execution profiles, minimal environments, bounds and termination proof.
- Phase 3 NW-AUD-019: structural private-payload screening as primary
  authority, closed schemas/DTOs, total writer/reader census, adversarial
  corpus.
- Phase 4 NW-AUD-018: total authenticated-evidence typed firewall,
  provenance-bound route identity, writer census, safe publication and
  transition integrity (reusing Phase 3 primitives where correct).
- Phase 5 NW-AUD-020: pre-effect semantic request admission, immutable
  admission handles, causal generations, transport-total enforcement,
  zero-upstream refusal proof.
- Cross-phase integration audit, hardening probes with non-vacuous mutations,
  optimized-lane validation during work, one final full certification, honest
  OpenSpec/task closure, and C-00 integrate → release → remove with
  `HEAD == origin/main`.

## Non-goals

No Alphaus DEV/NEXT/production traffic, authenticated product execution,
customer data, real credentials, database/data-plane or cloud access, sibling
repository mutation, external publication, force push, history rewrite, or
automatic start of any audit remediation beyond the five named (NW-AUD-021+
stay backlog). No rewriting of the five planning-only task STATE records into
false implementation history.

## Safety constraints

LOCAL / OFFLINE / SYNTHETIC only, plus the single explicit fast-forward C-00
integration push to `origin main`. Every remediation is proven with synthetic
or local evidence. Unknown authority fails closed. Only one writer: this
session worktree.

## Declared Deletions

None.

## Acceptance criteria

- All five defects re-reproduced against live starting source, implemented,
  focused-regressed, adversarially/mutation-proven, and checkpointed in
  sequence with no skipped phase.
- Strict OpenSpec validation passes for the umbrella change and all five
  remediation changes after closure updates.
- `npm run validation:universe`, hardening, agent/handoff/project/workspace/
  session checks, `npm test`, `gate:local`, and `gate:clean` pass at final
  certification.
- C-00 lifecycle completes with `HEAD == origin/main`, session released and
  removed, terminal routing flipped, and safety counts all zero.
- Remaining audit backlog is enumerated and NOT auto-started.
