# Proposal — W11 autonomous yield proof

## Why

The autonomous bug-hunting programme has completed W0-W10 and stopped with two
questions unanswered, both recorded as unproven in the parent programme state:

- strict historical `EXACT_REDISCOVERY` is unproven (W8 and W9 both measured 0);
- a previously unknown Alphaus defect is unproven.

W10 closed the structural reason W9 wasted every reproduction attempt — a
repository-major source index showed the reasoner one repository with zero
executable coverage — and lifted reproduction attempts that reached real
contained execution from 0/7 to 6/6. What W10 did not do, and explicitly
declined to force, was measure yield against known truth or hunt for an unknown
defect.

Group 12 of the production-completion programme exists for exactly that, and it
is entirely open. It requires a recorded provider prerequisite, a preflight that
refuses below a threshold, owner authorization for a successor wave, a strict
`EXACT_REDISCOVERY` run with per-case disposition, correct `ENVIRONMENT_BLOCKED`
denominator handling, a frozen unknown-defect campaign, materially broad
execution, mechanical yield accounting, admission only through the existing
path, an honest statement of limits, published yield, and full validation.

Two facts measured at `158a97b8` shape what this wave can honestly claim.

**The historical provider no longer exists.** W9 and W10 both used
`opencode-go/omen-alpha`. It is absent from the current 341-entry model list. A
current provider must be selected, and selecting it by observed score would
contaminate the very measurement the wave exists to produce.

**Reproduction capability is concentrated in one repository.** The census over
all eight admitted repositories finds 4,124 eligible source files, 1,120
executable and 152 distinct executable targets — and every one of them is in
`mobingilabs/ouchan`. The other seven contribute zero. Investigation breadth is
eight repositories; execution breadth is one.

**The strict-EXACT-eligible real corpus is small.** Of 255 mined historical
records and 234 definable cases, exactly 5 carry both a non-empty
`knownFailingTest` and a `minedReplay`, which strict EXACT requires.

## What Changes

W11 EXERCISES the W7-W10 stack rather than rewriting it. It adds the frozen
evaluation definitions, the measurement harnesses and the yield accounting
needed to execute and close Group 12 truthfully, and it repairs Nightwatch only
where live execution proves a concrete defect.

The wave is explicitly permitted to conclude with zero exact rediscoveries and
zero admitted findings. It is not permitted to manufacture either.

## Impact

- Group 12 (12.1-12.12) closes with measured evidence.
- The governed README and current-state yield surfaces carry a measured figure
  rather than an unproven one.
- The parent programme's `strict EXACT unproven` and `previously unknown
  defect unproven` entries are replaced by measured outcomes, whatever they are.
- No DEV, NEXT or production contact; no sibling mutation; no external
  publication; no weakening of admission criteria.
