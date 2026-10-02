# SPEC — nightwatch-final-completion-review5-v1 (frozen intent)

## Identity

- Task ID: `nightwatch-final-completion-review5-v1`
- Phase: `COMPLETION_REVIEW5_V1`
- CHILD OF: `nightwatch-final-product-completion-v1`
- Campaign class: `COMPLETION_REVIEW5_V1`
- Project verdict effect: `PRESERVE`
- Continuity protocol: `nightwatch.agent-continuity.v2`
- Starting SHA: `d68bb1a7c7cf244da654815a1e7f266e1985f30c`
- Canonical change: `openspec/changes/nightwatch-final-completion-review5-v1/`

## Objective

Resolve **every** finding of the independent review-5 (R5-01..R5-18, recorded
verbatim in `openspec/changes/nightwatch-final-completion-review5-v1/audit.md`) so the paused parent
terminal campaign can resume at M9 task 10.4 on sound, reachable certification.
Owner decision D-152 (2026-10-02, "both"): keep OD-2 and do Track A and Track B
together in this one bounded child.

## Frozen scope

1. **Track A — integrity and product fixes (first).** A1 archive-move
   integrity; A2 deletions and `--no-renames`; A3 receipt verification
   completeness (clean emit, closed subject sets); A4 behavioural guard
   coverage plus a committed mutation harness; A5 AST DEV-launcher effect
   analysis; A6 CLI correctness and a behavioural shared-parser rule; A7 CI
   record truth; A8 small truths; A9 process and continuity (claim journal,
   `npm run prepush`, record corrections, parent prose sync).
2. **Track B — reachable certification (second).** B1 the Certification
   Producer Matrix designed and strict-validated BEFORE any Track B code, with
   the persistence mechanism recorded in D-152; B2 a real producer for every
   condition and lane and the UI receipt fixed; B3 clean-clone verifiability
   with content-addressed receipt names; B4 a verifiable, unspoofable yield
   receipt tied to the parent's 12.3 authorization; B5 a topology verdict that
   verifies the receipt; B6 a fixture-repository proof of 16/16 MET.
3. **Close-out (C).** Focused suites + `gate:dev` + `gate:milestone` (mutation
   harness: zero survivors) + `hardening:rules`; the full authoritative set
   exit 0; integration with exact-head CI green; release and remove with
   `--delete-branch`; `gate:clean` from canonical with no live session; REPORT
   with a per-ID disposition table for R5-01..R5-18; archival with spec sync;
   ACTIVE_TASK routed to the parent at M9 task 10.4.

## Frozen rules

- **Order:** Track A before Track B; B1 (the Producer Matrix) complete and
  validated before B2.
- **Exit rule (no review-6 by default):** if Track B cannot make all 16
  conditions reachable honestly, STOP and report which ones and why; do not
  keep adding machinery. The owner then decides whether to narrow OD-2.
- **Mutation testing is behavioural and committed:** every guard added or fixed
  has a behavioural test (a source-text anchor alone never counts); every
  registered mutant is DETECTED; the mutation harness runs in `gate:milestone`.
- **Certification evidence is clean-clone verifiable:** no receipt that lives
  only in a git-ignored host directory may certify anything CI or `gate:clean`
  checks. OD-5 stands: receipts are tamper-evident, not tamper-proof; no
  wording may call them forgery-proof or unforgeable. OD-6 stands.
- **Integrate only through `npm run prepush`** once A9.2 lands; until then run
  its components by hand.
- **Tick honestly:** a tick on an unintegrated commit carries `(implemented; CI
  pending)`; drop the marker by annotation once exact-head CI is observed green.
  Never close a group or the child without an observed green exact-head CI at
  the tip that contains the close-out.
- **Claim every canonical commit** under a live MAINTENANCE claim recorded in
  the claim journal.
- **Never change a truthful record to satisfy a guard.** Fix the guard, or
  record the conflict and STOP.
- **The parent owns the single-use grants** (12.3 paid run, 15.4 npm query).
- The repository is temporarily public: nothing secret, customer-derived,
  authentication-bearing or identifying may be published; no new absolute home
  path. No Alphaus DEV/NEXT/production contact. No force-push, no history
  rewrite.
- **STOP conditions:** a Producer Matrix row cannot be completed honestly; any
  condition is still unreachable after B6; a fix would weaken a guard;
  exact-head CI is red for a reason outside scope; canonical dirty / a
  formatter rewrites tracked files / `origin/main` advances unexpectedly / a
  push is rejected; an owner decision is needed beyond D-152.

## Declared Deletions

The advertised deletions for this session (measured against the session base
`d68bb1a7c7cf244da654815a1e7f266e1985f30c`). Every tracked-file deletion is listed here before it happens.

- `openspec/changes/nightwatch-final-completion-review5-v1/audit.md`
  (archived by move to `openspec/changes/archive/<dated>-nightwatch-final-completion-review5-v1/audit.md` at close-out)
- `openspec/changes/nightwatch-final-completion-review5-v1/design.md` (archived by move at close-out)
- `openspec/changes/nightwatch-final-completion-review5-v1/proposal.md` (archived by move at close-out)
- `openspec/changes/nightwatch-final-completion-review5-v1/tasks.md` (archived by move at close-out)
- `openspec/changes/nightwatch-final-completion-review5-v1/specs/review5-closure/spec.md` (archived by move at close-out)

## Completion Criteria

The child is COMPLETE only when: every review-5 finding has exactly one
recorded disposition with evidence; every registered mutant is DETECTED by
behaviour and the mutation harness reports zero survivors; the focused suites,
`gate:dev`, `gate:milestone` and the full authoritative set all exit 0;
exact-head CI at the integrated close-out tip is green and recorded; the
session is released and removed with `--delete-branch`; `gate:clean` runs from
canonical with no live session and its receipt is recorded as it actually
shows; the REPORT carries the per-ID disposition table; the change is archived
with spec sync; and ACTIVE_TASK routes back to the parent at M9 task 10.4. If
the exit rule fires, the child instead ends BLOCKED with the unreachable
conditions listed and an exact owner question.
