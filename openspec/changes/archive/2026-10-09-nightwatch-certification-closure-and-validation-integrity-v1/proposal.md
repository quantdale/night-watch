# Proposal — Certification closure and validation integrity

## Why

Two campaigns closed recently and each left a concrete, measured blocker
behind. Measured live at `521210f7`:

**The probe campaign is dead code that nothing runs, and it is already red.**
`package.json` declares `hardening:rules` (`hardening-check.mjs
--probe-campaign`), the mutation campaign that proves each of the 83 hardening
rules actually detects the violation it claims to guard. No gate group, no
validation-universe class, no lane and no CI workflow selects it. Running it at
the campaign base gives:

```
[probe] checkActiveMilestoneProgression UNDETECTED HC-015
[probe] rules=83 probes=90 detected=89 undetected=1 restored=80 statusUnchanged=true
exit 1
```

`hardening:check` is green, `gate:local` is green, and the command that proves
the rules work has been failing invisibly. HC-015 rotted for a structural
reason: `checkActiveMilestoneProgression` follows `.agent/ACTIVE_TASK.md` to the
ACTIVE task's `STATE.md`, while the probe hardcodes the production-completion
programme's `STATE.md`. The moment the active task changed, the probe began
mutating a file the rule no longer reads. This is the second instance of the
class after HC-059, and the class stays open for as long as nothing executes
the campaign.

**`nightwatch-session.mjs start --dry-run` mutates.** `--dry-run` is documented
globally as "report the planned action without mutating". It is a single global
boolean that exactly ONE of the eight commands reads. `start` follows the real
creation path and creates a branch, a worktree and an ownership record while
printing a plan — silently consuming `maxWorktrees` capacity and tripping
`SESSION_START_REFUSED_PROSPECTIVE_TOPOLOGY` for the next real start. `claim`,
`release`, `reconcile` and `remove` ignore the flag entirely; `release` is not
even passed `options`. `integrate` honours it only after a fetch that writes the
remote-tracking refs. This sits in the C-00 tooling every campaign depends on.

**G16.5 is open.** All 83 rules carry a declared `quantifier`, and 60 declare
TOTALITY, but the engine self-check can only catch one shape of dishonesty: a
non-global `.exec()`/`.match()` with no recorded singleton justification. A
rule that stops at the first failing occurrence, or reports one line where it
promises every line, passes today.

**The `ripple-api` admission is stale.** The sibling checkout has advanced from
the admitted `27bb007a` to `4e3e200d`, failing three `SEMANTIC_COMPATIBILITY`
tests and six `campaign:synthetic` C-0x tests. G16.12 is blocked on it.

**Control Center task 6.4 is carried.** Focus-ring contrast at every declared
width was never qualified.

## What Changes

- The `--dry-run` contract becomes truthful for every dispatchable command:
  supported with genuine zero-mutation semantics, or refused before mutation.
- `hardening:rules` becomes a REQUIRED gate group, `HARDENING_PROBES`, between
  `HARDENING` and `HANDOFF_TRUTH`, registered through the gate-definition
  machinery and appearing in receipts.
- Probe HC-015 and the indirection class behind it are repaired, so a probe
  whose rule follows the active task cannot silently stop mutating the file the
  rule reads.
- Every registered rule's quantifier is audited; TOTALITY rules report every
  failing occurrence; the engine self-check gains the patterns it could not see.
- The `ripple-api` expectations are re-derived and re-admitted against the
  current source on mechanical evidence, never by SHA substitution.
- Control Center focus-ring contrast is qualified at every declared width.
- Production-completion items whose only remaining requirement is validation,
  integration or release evidence are closed with that evidence.

## Impact

The authoritative gate gains a required group, so its definition digest changes
legitimately and a `gate:local` PASS after this change is materially stronger
than the one before it: it now proves the hardening rules detect violations
rather than merely that they ran.

Owner-gated programme items are untouched and stay open.
