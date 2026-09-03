# Active Task

Task ID: nightwatch-certification-truth-r12-v1
Phase: CERTIFICATION_TRUTH_R12_V1
Title: R-12 Certification Manifest + Project Truth Closure
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-certification-truth-r12-v1
Starting SHA: cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0
Last validated implementation SHA: cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0
Last checkpoint: baseline measured at cdfe9d7 — 238 suites on disk, 173 registered across the two authoritative manifests, 65 unregistered, 6 of them campaign certification suites (C-01 x4, C-02a, C-06); no required gate group runs the full canonical regression
Current milestone: M2 — register the six unregistered certification suites in their correct authoritative lane
Next action: add the six suites to config/synthetic-campaign.v1.json, then introduce config/campaign-certification.v1.json and the generic totality rule that replaces the four hand-written per-campaign registration loops
Authorization class: NIGHTWATCH_CERTIFICATION_TRUTH_R12_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0
LAST_VALIDATED_IMPLEMENTATION_SHA: cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0
LAST_SUBSTANTIVE_CHECKPOINT_SHA: cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_CERTIFICATION_TRUTH_R12_V1_STATUS: IN_PROGRESS

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
