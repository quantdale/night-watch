# Session mutation authority binding proposal

## Task purpose

Create and strict-validate an implementation-ready OpenSpec remediation for
NW-AUD-006 without implementing it.

## Established starting state

- Parent campaign: `nightwatch-exhaustive-repository-audit-proposals-v1`.
- Starting SHA: `34517c9ba11c97407168fe5879ee03794dfff3e3`.
- Every lifecycle command accepts `--root`, which becomes the target context.
- `release` writes the selected live record without verifying current-checkout
  or invoking-session ownership.
- `integrate` verifies only that the selected target is an `OWNED_SESSION`, so
  a process in canonical can select and reach another session's push path.
- Non-mutating dry runs from canonical against the live audit session proved
  both cross-root paths reachable.

## Required deliverables

- OpenSpec proposal, design, `concurrency-workspace-hardening` delta spec, and
  implementation tasks.
- Current-checkout/code binding, explicit session/HEAD expectations,
  continuity admission, serialized record CAS, command-role restrictions,
  pre-network integration checks, recovery, and adversarial proof.
- Precise cooperative same-user threat boundary and strict validation.

## Non-goals

No lifecycle implementation, record mutation, Git ref/worktree mutation,
network/fetch/push, credential, environment, CI, or Alphaus action.

## Safety constraints

Planning artifacts and read-only/dry-run evidence only. The parent owned
session remains the sole writer; the live ownership record must remain intact.

## Declared Deletions

None.

## Acceptance criteria

- All four OpenSpec artifact classes exist and strict validation passes.
- Remediation prevents confused-deputy cross-session mutation without claiming
  cryptographic isolation from a malicious process sharing the OS account.
- Integration admission reaches neither fetch nor push on authority mismatch.
- Implementation tasks are explicitly declared outside this planning task.
