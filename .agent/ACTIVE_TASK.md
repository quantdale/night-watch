# Active Task

Task ID: nightwatch-prod-observe-safety-kernel-c11-v1
Phase: PROD_OBSERVE_SAFETY_KERNEL_C11_V1
Title: C-11 PROD_OBSERVE Safety Kernel
Status: COMPLETE
Task directory: .agent/tasks/nightwatch-prod-observe-safety-kernel-c11-v1
Starting SHA: 060fef41205b29210d9bd8416aca97c03b028e4f
Last validated implementation SHA: 787966061beb91de0002fd114ca04e488b44be48
Last checkpoint: exact-head GitHub run 33665872548 / job 100367351818 at 150dfcc passed all eleven required groups on Node 20 with receipt receipt:sha256:1d991b9a10d4cad618c0f533, SEMANTIC_COMPATIBILITY 2,032/2,019/13/0 and SYNTHETIC_CAMPAIGN 366/366; gate:local PASS receipt:sha256:2ff143e71ea8974847053723 and gate:clean PASS on Node 20 with inner receipt receipt:sha256:997ebf6461843448173e889d and siblingWrites 0; canonical regression 3,141 total / 3,128 passed / 13 skipped / 0 failed; 110 C-11 tests all gate-registered; 38-entry one-fault denial matrix over all eighteen gates with zero mock-server contact on every pre-dispatch denial; 22/22 hardening negative probes detected; DEF-C11-1 through DEF-C11-6 introduced by this campaign, all found, repaired and reported
Current milestone: COMPLETE / STOP — M1 through M8 are closed
Next action: STOP — C-11 is COMPLETE and certified by exact-head CI run 33665872548 / job 100367351818 at 150dfcc with all eleven required groups PASS. C-12 P1 PASSIVE PRODUCTION OBSERVATION is the next production critical-path campaign and is NOT authorized: it would be the first campaign involving real production observation and requires a new explicit owner authorization after review of the completed C-11 evidence. C-11 grants no authority over real production
Authorization class: NIGHTWATCH_PROD_OBSERVE_SAFETY_KERNEL_C11_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 060fef41205b29210d9bd8416aca97c03b028e4f
LAST_VALIDATED_IMPLEMENTATION_SHA: 787966061beb91de0002fd114ca04e488b44be48
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 787966061beb91de0002fd114ca04e488b44be48
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_PROD_OBSERVE_SAFETY_KERNEL_C11_V1_STATUS: COMPLETE

## Routing and safety

C-11 implements the `PROD_OBSERVE` production-qualification kernel against
MOCK/SYNTHETIC production ONLY. Its objective is to make Nightwatch
demonstrably incapable of issuing a production request unless every required
machine authority grants it, and to show which authority denied when one does.

The design reconciliation is complete. Five historical requirements are
SUPERSEDED by independent-review findings F-09 through F-13, P1 passive
observation is DEFERRED per F-13, and the historical "eleven ordered gates"
labelled `G0`-`G11` — twelve identifiers, with an acceptance criterion phrased
as a COUNT — is replaced by `nightwatch.production-admission-chain.v1`, a
versioned NAMED ordered chain of eighteen gates carrying a definition digest.
Identity fails closed where a count cannot.

This is a repository-local, offline, synthetic-only campaign. No real
production, DEV or NEXT contact is authorized or performed. Mock production is
loopback-only with no external DNS and no real Alphaus host. No credential,
auth-state, cookie or token is created, requested or read. No cloud, IAM,
Kubernetes or datastore access; no sibling-repository write; no external
publication.

D-4 stands: production does not join `SUPPORTED_ENVIRONMENTS` and
`config/environments/production.json` remains structurally unloadable.
`KNOWN_PRODUCTION_HOSTS` stays DENY-ONLY in every mode and is never inverted.
C-06 remains fail-closed and `READ_ONLY_PROVEN` is not increased. C-10 privacy
and C-10.5 provenance are consumed, not modified.

C-12 P1 real production observation is NOT authorized, NOT started, and
requires new explicit owner authorization after review of the completed C-11
evidence.

All work happens in the owned session worktree
`session/nightwatch-prod-observe-safety-k-5d5e338f`; the canonical checkout is
never used for implementation.
