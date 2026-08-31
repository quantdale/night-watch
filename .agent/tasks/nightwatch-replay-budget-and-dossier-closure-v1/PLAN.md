# Nightwatch Replay Budget and Dossier Closure — Plan

Task ID: nightwatch-replay-budget-and-dossier-closure-v1
Phase: REPLAY_BUDGET_DOSSIER_CLOSURE_V1
Status: IN_PROGRESS
Starting SHA: 4834e4da1ec40fbad9736f0a12d1d8f610cb622d
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## M0 — Reconstruct and reproduce budget starvation

Status: IN_PROGRESS

- Validate clean main/origin parity and current gates.
- Read the completed soak REPORT/STATE and owning campaign budget code.
- Build a deterministic local regression reproducing:
  three required journey contexts -> fresh admitted candidate -> reproduction
  queue -> reservation refused with BUDGET_EXHAUSTED before replay executor.
- Prove the failure is budget allocation, not DVR-011 admission, replay
  identity, auth, capture, or product classification.

## M1 — Design bounded replay reservation semantics

Status: NOT_STARTED

Evaluate the smallest safe design. Acceptable directions include a dedicated
reproduction reserve, collection/reproduction sub-budgets, or deterministic
budget transfer/reallocation. Do not blindly raise limits.

Required invariants:

- bounded total execution remains explicit;
- at most the authorized replay count can execute;
- no candidate means no reproduction contact;
- stale/historical candidates cannot consume replay budget;
- incomplete capture cannot consume product-replay authority;
- collection work cannot silently steal protected replay reserve if reserve is
  required by the chosen design;
- reproduction cannot steal unrelated API/exploration budget without an
  explicit deterministic rule;
- checkpoint/resume preserves exact budget state;
- source/version drift invalidates stale prepared work;
- interruption cannot double-spend budget;
- duplicate candidate/cluster identities cannot multiply replay authority;
- all budget decisions are deterministic and sanitized.

## M2 — Implement + adversarial validation

Status: NOT_STARTED

Implement the owning budget change with tests for:

- pre-fix starvation reproducer;
- one eligible candidate obtains one replay reservation;
- zero-candidate campaign uses no replay reserve;
- multiple candidates cannot exceed cap;
- duplicate identities do not multiply reserve;
- resume after interruption cannot double spend;
- stale manifest/source drift fails before replay;
- auth/capture/framework failures do not become replayable;
- exhausted total budget remains fail closed;
- minimization/dossier only follow successful admitted reproduction.

Run focused campaign/replay/checkpoint tests, typecheck, hardening, semantic
compatibility, owner provenance, synthetic campaign, gate:local, and gate:clean.

## M3 — Fresh guarded DEV confirmation

Status: NOT_STARTED

After owner-managed auth/readiness validation, prepare a fresh current-source
campaign. Do not reuse soak checkpoints or historical candidates.

Run only enough real DEV work to obtain a fresh DVR-011-admitted candidate and
exercise the new bounded replay reservation. Prefer the stable account
malformed-json path only if it reappears naturally under current evidence.

Maximum real confirmation target:

- up to 3 fresh campaign attempts;
- up to 3 attack replay executions total;
- at most 1 minimization/dossier chain required for success.

Every attempt remains independent evidence; retries do not erase failures.

## M4 — Candidate -> replay -> dossier closure

Status: NOT_STARTED

If a fresh candidate is admitted:

- prove the replay reservation came from the new bounded budget semantics;
- execute replay;
- classify reproduced / product-state drift / precondition divergence /
  auth/environment divergence / framework capture / invalid replay;
- if reproduced, run bounded minimization;
- produce a sanitized dossier if existing readiness rules permit;
- verify fingerprint, cluster, replay-plan, minimization, and dossier identity.

If no fresh candidate appears within the authorized sample, close as
REPLAY_BUDGET_FIXED_DEV_CONFIRMATION_STARVED rather than weakening admission.

## M5 — Final certification

Status: NOT_STARTED

Run final focused/full gates, clean Node20 validation, canonical/isolated
parity when runtime behavior changed materially, single exact-head CI
inspection, continuity/project reconciliation, clean Git push, and terminal
report.
