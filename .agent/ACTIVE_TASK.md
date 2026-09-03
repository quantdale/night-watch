# Active Task

Task ID: nightwatch-certification-truth-r12-v1
Phase: CERTIFICATION_TRUTH_R12_V1
Title: R-12 Certification Manifest + Project Truth Closure
Status: COMPLETE
Task directory: .agent/tasks/nightwatch-certification-truth-r12-v1
Starting SHA: cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0
Last validated implementation SHA: 506d64fd878d2d02a7e93b28d8b515ab4fd97691
Last checkpoint: exact-head GitHub run 33784345028 / job 100745379741 at 5cc7835 passed all eleven required groups on Node 20 with receipt receipt:sha256:855c3279c6ecb3d30a69ad24; gate:local and gate:clean PASS with siblingWrites 0; canonical regression 3,428/3,415/13/0; the synthetic gate lane went from 619 to 738 cases, of which 116 newly execute in CI and exactly 3 skip truthfully; DEF-R12-1 and DEF-R12-2 both PRE_EXISTING and both repaired
Current milestone: COMPLETE / STOP — M1 through M8 are closed and all eight acceptance rows PASS
Next action: STOP — R-12 is COMPLETE and certified. The next authorized campaign in this overnight portfolio is C-05 universe discovery and admission hygiene; C-12 remains NOT AUTHORIZED and requires new explicit owner authorization
Authorization class: NIGHTWATCH_CERTIFICATION_TRUTH_R12_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0
LAST_VALIDATED_IMPLEMENTATION_SHA: 506d64fd878d2d02a7e93b28d8b515ab4fd97691
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 506d64fd878d2d02a7e93b28d8b515ab4fd97691
LAST_DOCUMENTATION_CHECKPOINT_SHA: 5cc783572bf7f943e3168a7ae98c2106ee963cff
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_CERTIFICATION_TRUTH_R12_V1_STATUS: COMPLETE

## Routing and safety

R-12 closes the certification debt C-15b recorded against itself, and the
documentation drift that accumulated behind it, before Nightwatch is expanded
further.

The measured defect: the authoritative gate has eleven required groups, exactly
three of which execute tests, and each of those runs only the suites named in a
versioned manifest. No required group runs the full canonical regression. Six
campaign certification suites — C-01's four completeness suites, C-02a's
OpenAPI admission suite and C-06's PHP read-only-proof suite — are named in no
manifest, so the gate has never run any of them.

The omission is structural. Registration is enforced by four hand-written
per-campaign loops in `bin/hardening-check.mjs`; three campaigns never wrote
one and nothing noticed. R-12 replaces those loops with one declarative
registry and one totality rule anchored to the campaign task ledger.

Truthfulness is the binding constraint. C-02a's real-source block already
self-skips without the read-only sibling checkouts, and the synthetic-campaign
receipt records that skip rather than counting it as a pass. R-12 adds no
deterministic stand-in that would claim real-source execution CI did not
perform, and weakens no existing rule so that a suite can register.

No repository admission. No source-analysis change. No new campaign. No
production contact and no NEXT contact; C-12 remains NOT AUTHORIZED and is not
begun.

All work happens in the owned session worktree
`session/nightwatch-certification-truth-r-cd8904c5`; the canonical checkout is
never used for implementation.
