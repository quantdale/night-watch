# Residual Closure and Lane Qualification

Task ID: nightwatch-residual-closure-and-lane-qualification-v1

## Task purpose

Resolve the four lanes the repository hardening campaign left recorded
UNAVAILABLE into three honest classes, prove the ones this host can prove,
and close the bookkeeping that campaign deliberately deferred. The observable
outcome is that no lane is carried as unavailable when it demonstrably runs,
no externally blocked lane is indistinguishable from an uninspected one, and
local evidence growth has a bounded, refusal-first retention policy.

## Established starting state

- Task ID: `nightwatch-residual-closure-and-lane-qualification-v1`
- Starting SHA: `58bbf2d028ce2d59e6c5616ffeeb65ab43eec142`
- Predecessor `nightwatch-repository-hardening-implementation-v1` is terminal
  COMPLETE. NW-01 through NW-15 are CLOSED. Do not reopen them.
- Live audit at the starting SHA: `typecheck`, `hardening:check`,
  `handoff:check`, `project:check`, `workspace:check` PASS; `agent:check`
  PASS with 4 warnings; `validation:universe` PASS with 427 discovered and 0
  unclassified at digest `sha256:063ecd1f416bdcb540aff7a7`.
- The browser workflow lane executed 4 passed / 0 failed in 3.8 minutes from
  the canonical checkout during the audit. `google-chrome` and `bwrap` are
  present. That run is evidence, not a receipt.
- All 100 most recent GitHub Actions runs concluded `failure` in about three
  seconds each with no step executed. Run `34287959085` job `102267798769`
  is annotated as a payment/spending-limit block.
- `artifacts/` holds 13,367 run directories totalling 915 MB; the working
  tree is 1.2 GB. `hygiene` observes generated outputs but prunes nothing.
- Two stale session worktrees claim terminal-COMPLETE tasks; 25 merged
  `session/*` branches remain; 31 legacy v1 task records carry 41 warnings.

## Required deliverables

- R-01 the browser workflow lane executed inside this owned session, with a
  recorded receipt and an updated host-capability lane state.
- R-02 the observed CI block recorded with run identity, annotation and
  block class, with `CI_STATUS` left non-passing.
- R-03 a `docs/CURRENT_STATE.md` closure section for the predecessor campaign
  in the established shape, and validated-SHA fields either advanced to a
  checkpoint whose receipts exist or refused with a mechanical reason.
- R-04 `--enable-local-review`, what it enables and the owner-local review
  store location documented in `README.md`; `bin/phase14-contract-health.mjs`
  invocable from a documented script.
- R-05 the two stale session worktrees released through the session CLI, the
  merged session branches removed, and the legacy v1 records migrated or
  declared permanently historical.
- R-06 a refusal-first evidence retention capability: reporting by default,
  removal behind an explicit owner flag, a provably-refused set for anything
  referenced by tracked state, and regression coverage including the
  reclaim-nothing outcome.
- R-07 the planning-only `READY_FOR_EXECUTION` handoff checkpoint made
  landable again, by asserting the predecessor binding in project-state
  truth instead of a binding the handoff protocol forbids, with a
  regression covering the planning and active prompt states.
- One certified checkpoint with every declared lane resolved to `PROVEN`,
  `BLOCKED_EXTERNAL` or `UNAVAILABLE_CAPABILITY`.

## Explicit non-goals

- Reopening NW-01 through NW-15, or re-deriving their acceptance evidence.
- The real-yield campaign, strict `EXACT_REDISCOVERY`, and
  previously-unknown-defect yield. These remain 0 and belong to a separate
  authorized successor gated on confirmed provider capability.
- Splitting or restructuring the five append-heavy archive documents.
- Promoting the 84 `FULL_REGRESSION` suites into the authoritative gate.
- Any network egress, including an online dependency-advisory scan.
- Clearing the GitHub billing block, which is an owner action outside this
  repository.
- DEV, NEXT, production, cloud, datastore, external filing, publication, and
  the owner-run manual and live-app harnesses.

## Safety constraints

- LOCAL only. Sibling repositories remain read-only. No credential, auth
  state or real finding enters Git.
- Implementation happens in this campaign's owned session worktree. The
  canonical checkout stays clean while an owned session is live.
- Retention never rewrites, truncates or replaces an artifact, and never
  removes one it cannot prove unreferenced. Immutable evidence and review
  store no-replace identity patterns are preserved exactly.
- No stale worktree belonging to a live holder is released, adopted, edited
  or removed. Worktree capacity is never created by removing another owner's
  session.
- No gate is weakened and no test deleted or skipped to produce green output.
  Skipped, unavailable and zero-step never mean PASS.
- Integration is by fast-forward compare-and-swap to `origin main` only.
  Never force-push, never rewrite history.

## Declared Deletions

None.

## Acceptance criteria

- The browser workflow lane's recorded state names this session and a receipt
  produced inside it; a canonical-checkout run does not satisfy it.
- Project state distinguishes an externally blocked CI lane from an
  uninspected one, names the observed run and reason, and still reports a
  non-passing CI status.
- `docs/CURRENT_STATE.md` carries the predecessor closure section, and every
  pre-existing historical section, receipt and SHA in it is byte-identical.
- `README.md` names `--enable-local-review`, its effect and the review store
  location; `npm run` exposes the phase-14 contract-health check.
- `workspace:check` and `agent:check` report zero stale-session-worktree
  warnings, or each remaining one is explained by a live holder.
- Retention refuses every artifact referenced by tracked state, removes
  nothing without the owner flag, and has a passing regression for the
  refusal set and for the reclaim-nothing outcome.
- Root typecheck, `hardening:check`, the full classified offline regression,
  `gate:local` and the UI lanes pass at the candidate checkpoint, and
  `validation:universe` still reports zero unclassified tests.
- A protocol-valid planning prompt passes `handoff:check` and
  `project:check` together, and a planning prompt naming the wrong
  predecessor still fails with the existing error codes.
- Every declared lane resolves to exactly one of the three classes, and no
  absent run is recorded as a pass.
