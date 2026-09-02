# Active Task

Task ID: nightwatch-prod-observe-safety-kernel-c11-v1
Phase: PROD_OBSERVE_SAFETY_KERNEL_C11_V1
Title: C-11 PROD_OBSERVE Safety Kernel
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-prod-observe-safety-kernel-c11-v1
Starting SHA: 060fef41205b29210d9bd8416aca97c03b028e4f
Last validated implementation SHA: 060fef41205b29210d9bd8416aca97c03b028e4f
Last checkpoint: 2026-09-03 — C-11 opened at the R-11 closure head 060fef4; the design reconciliation is complete and nightwatch.production-admission-chain.v1 defines a versioned NAMED ordered chain of eighteen gates, replacing the historical "eleven gates" labelled G0-G11 (twelve identifiers) whose acceptance criterion was phrased as a count
Current milestone: M2 — authorization class and separation
Next action: Create src/core/prodObserve/ and implement the PROD_OBSERVE authorization class with one-shot ALREADY_CONSUMED semantics, the external observation config loader with the F-09 integrity requirements, the independent production allowlist built solely from that config, and productionRunGate as a decision path sharing no branch with realRunGate
Authorization class: NIGHTWATCH_PROD_OBSERVE_SAFETY_KERNEL_C11_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 060fef41205b29210d9bd8416aca97c03b028e4f
LAST_VALIDATED_IMPLEMENTATION_SHA: 060fef41205b29210d9bd8416aca97c03b028e4f
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 060fef41205b29210d9bd8416aca97c03b028e4f
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_PROD_OBSERVE_SAFETY_KERNEL_C11_V1_STATUS: IN_PROGRESS

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
