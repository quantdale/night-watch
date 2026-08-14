# Nightwatch Codebase Hardening Campaign I.1 Closeout

Status: `FROZEN INTENT`
Frozen: 2026-08-14

## Purpose

Repair the independently confirmed checkpoint terminal-integrity defect in
campaign budget exhaustion validation, add focused synthetic regression
coverage, reconcile the stale project-level current-state document, and
verify local and private-remote closure. This is a narrow corrective closeout
of Hardening Campaign I, not a feature campaign and not Phase 8.

## Established starting state

- Task ID: `codebase-hardening-campaign-1-1-closeout`.
- Canonical root: `/home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch`.
- Branch: `main`; remote: private `origin` → `quantdale/night-watch`.
- Starting SHA and starting `origin/main`: `ba5b518736281f48640982fcbdb6c874bc3e3123`.
- The historical `codebase-hardening-campaign-1` task remains `COMPLETE`.
- Phase 7 remains `COMPLETE`; Phase 6 remains
  `FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.
- No exact exhaustion-dimension field exists in the current checkpoint
  schema. Validation must therefore require a positive policy limit, exact
  full consumption, and zero remaining for at least one budget dimension.

## Confirmed defect

For `PARTIAL_BUDGET_EXHAUSTED` plus `BUDGET_EXHAUSTED`, the current validator
accepts any dimension whose remaining value is zero and whose used key exists.
The bounded real policy intentionally has `maxExplorationContexts = 0`, so an
unused initial checkpoint naturally contains a zero exploration remainder.
Corrupting only the terminal classification can therefore falsely terminalize
the campaign.

## Required outcome

The validator must accept budget exhaustion only when a generic dimension
satisfies:

```text
policy limit > 0 AND used == policy limit AND remaining == 0
```

The existing invariant `used + remaining == policy limit` remains mandatory
for every dimension. A zero-limit dimension never proves runtime exhaustion.

Regression coverage must exercise the public checkpoint/resume validation
seam and prove:

1. the exact bounded-policy false-positive checkpoint is rejected with a
   deterministic sanitized integrity reason before executor work;
2. a legitimate positive-cap fully-consumed checkpoint is accepted;
3. a disabled zero-cap dimension alongside a genuinely exhausted positive-cap
   dimension is accepted;
4. all applicable terminal-state checks remain fail-closed.

## Scope and safety boundary

This task is local, synthetic, static, and fixture-based. It may modify only
Nightwatch source, tests, task continuity files, and the durable current-state
document. It must not run real campaigns, auth capture, product journeys,
Phase 5 API execution, DEV/NEXT traffic, production, databases,
infrastructure, or external publication. The only external write is a
validated development checkpoint to the already-authorized private GitHub
remote. No Alphaus repository may be modified.

Real campaign caps remain unchanged, including the reviewed bounded profile:
6 browser contexts, 3 journey contexts, 0 exploration contexts, 6 API
executions, 8 replays, 4 minimization candidates, 24 actions, 15 minutes,
120-second test timeout, 1 promoted cluster, and 10 MiB private evidence.

## Historical-document rule

The previous hardening task and report remain historically accurate and are
not reopened or rewritten. The current-state document is reconciled with
Hardening I and this I.1 closeout using non-self-referential checkpoint
identities. The prior closure CI result is recorded as
`CONFIRMED_PASS_AT_HARDENING_CLOSURE` for `ba5b518...`; the new final SHA is
not called CI-successful until its own workflow completes successfully.

## Acceptance boundary

Close only after focused checkpoint/budget/resume/agent-state tests,
typecheck, hardening check, synthetic campaign, the full current local
Playwright suite, privacy/diff checks, source and documentation pushes, clean
local/remote equality, and exact final remote CI verification when safely
readable. If remote CI cannot be read, leave the closeout explicitly pending
remote verification rather than claiming success.
