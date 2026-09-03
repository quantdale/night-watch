# SPEC — R-12 Certification Manifest + Project Truth Closure

Task ID: nightwatch-certification-truth-r12-v1
Phase: CERTIFICATION_TRUTH_R12_V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0
Predecessor Task ID: nightwatch-system-map-v2-c15b-v1
Predecessor Status: COMPLETE
Authorization class: NIGHTWATCH_CERTIFICATION_TRUTH_R12_V1

## Frozen intent

Close the test-registration and documentation-truth debt that C-15b recorded
against itself, BEFORE Nightwatch is expanded any further. A passing test file
is not certification until the authoritative gate actually runs it.

## Measured starting state

The gate has eleven required groups. Exactly three of them execute tests:
`SEMANTIC_COMPATIBILITY` (the suites named in
`config/semantic-compatibility.v1.json`), `OWNER_PROVENANCE` (three suites
named literally in `package.json`) and `SYNTHETIC_CAMPAIGN` (the suites named
in `config/synthetic-campaign.v1.json`). **No required group runs the full
canonical regression.** A suite absent from those manifests therefore never
executes in `gate:local`, `gate:clean` or CI, however green it is locally.

| Measure | Value |
|---|---|
| suites in `tests/unit` on disk | 238 |
| suites registered in the two authoritative manifests | 173 |
| suites in neither manifest | 65 |
| campaign task directories (`-(c\|r)N-vN`) | 11 |
| campaign certification suites unregistered | 6 |

The six unregistered certification suites, and their measured CI-safety:

| Campaign | Suite | Sibling-dependent? |
|---|---|---|
| C-01 | `tests/unit/sourceOperationCompleteness.test.ts` | no |
| C-01 | `tests/unit/sourceInventoryCompleteness.test.ts` | no |
| C-01 | `tests/unit/cacheCurrentness.test.ts` | no |
| C-01 | `tests/unit/callScopedSourceRead.test.ts` | no |
| C-02a | `tests/unit/c02aOpenApiAdmission.test.ts` | one block only |
| C-06 | `tests/unit/c06PhpReadOnlyProof.test.ts` | no |

C-15b's report named two of these six. C-01's four are additional debt this
campaign discovered and must not leave open.

C-06 is fully deterministic: it constructs disposable temporary repositories
and points `createSiblingSourceAccess` at those, never at
`DEFAULT_SIBLING_ROOT`. C-02a is deterministic except one `test.describe`
block ("the real committed blueapi artifact") which already carries
`test.skip(() => !siblingRepoAvailable(...))`. The synthetic-campaign runner
records `skipped` in its receipt and does not fail on it, so registering C-02a
is truthful in both topologies: locally the block runs, in CI it skips and the
receipt says so. **No deterministic counterpart needs to be fabricated, and no
suite will claim real-source execution it did not perform.**

## The structural defect behind the omission

Registration is enforced by hand-written per-campaign loops inside
`bin/hardening-check.mjs` — one each for C-02b, C-03, C-04 and C-15b. A
campaign author who does not add their own loop is detected by nothing. C-01,
C-02a and C-06 each shipped without one. The omission is not a typo in a list;
it is a missing totality rule.

## Scope

- Register all six suites in the correct authoritative lane.
- Replace the four hand-written registration loops with ONE declarative
  authority, `config/campaign-certification.v1.json`, enumerating every
  campaign, its owning task directory, its lane and its certification suites.
- Enforce totality mechanically: the registry is complete with respect to the
  campaign task directories, every declared suite exists on disk, and every
  declared suite is registered in its declared lane.
- Reconcile the master task ledger's current normative status for C-02b, C-03,
  C-04 and C-11, and the C-15b half of the C-15 row.
- Reconcile the `docs/CURRENT_STATE.md` checkpoint prose to the machine block
  it drifted away from, including the malformed six-cell row.

## Non-goals

- No new campaign. No repository admission. No source-analysis change.
- No renaming or restyling for its own sake, and no new abstraction layer.
- No weakening of any existing rule to make a suite register.
- No production or NEXT contact. C-12 is not begun.

## Absolute invariants

- A registration claim is never stronger than the execution that backs it: a
  suite that skips in a topology reports a skip, never a pass.
- Historical evidence stays historical. Superseded counts and failed CI
  anchors are preserved as such, never rewritten to look current.
- No tracked document predicts the SHA or CI run of the commit containing it.
- Every load-bearing rule added here has at least one negative probe that
  bites, and every probe is restored.

## Acceptance

1. All six unregistered certification suites execute in an authoritative gate
   group, in both the local and the clean/CI topology.
2. `config/campaign-certification.v1.json` is the single registration
   authority; the four hand-written loops are gone, not merely supplemented.
3. Registry totality holds: every campaign task directory is declared, every
   declared suite exists, every declared suite is registered in its lane.
4. No false CI topology claim: C-02a's real-source block is proven to skip
   truthfully where siblings are absent.
5. Master task ledger normative status correct for C-02b, C-03, C-04, C-11
   and the C-15b half of C-15; history preserved.
6. `CURRENT_STATE` checkpoint prose agrees semantically with the machine
   block; the malformed row is repaired; no bulk-set values.
7. Negative probes: C-02a deregistration, C-06 deregistration, C-15b
   deregistration, C-11 deregistration, suite deletion, registry shrinkage,
   stale task status, stale substantive anchor, fake campaign status — each
   DETECTED, each restored.
8. Canonical regression zero failures; `gate:local` PASS; `gate:clean` PASS;
   exact-head CI PASS; siblingWrites 0; worktree released.

## Declared Deletions

None.
