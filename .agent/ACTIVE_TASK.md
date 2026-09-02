# Active Task

Task ID: nightwatch-production-privacy-firewall-c10-v1
Phase: PRODUCTION_PRIVACY_FIREWALL_C10_V1
Title: C-10 Production Privacy Firewall
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-production-privacy-firewall-c10-v1
Starting SHA: a152889a71eec6c67d82b05e5984df6423fe88d4
Last validated implementation SHA: b99ce4e61166e52b554dd6ac07b7678b433959da
Last checkpoint: campaign opened from the predecessor's validated exact-head CI baseline; task records and the dedicated OpenSpec change carrying the Workstream A persistence-cone audit are written
Current milestone: M0 — task records and OpenSpec change
Next action: track the OpenSpec change, run handoff:check and agent:check, then begin M1/M2 — the pure production privacy cone (policy, proven key vocabulary, production projection types)
Authorization class: NIGHTWATCH_PRODUCTION_PRIVACY_FIREWALL_C10_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: a152889a71eec6c67d82b05e5984df6423fe88d4
LAST_VALIDATED_IMPLEMENTATION_SHA: b99ce4e61166e52b554dd6ac07b7678b433959da
LAST_SUBSTANTIVE_CHECKPOINT_SHA: b99ce4e61166e52b554dd6ac07b7678b433959da
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_PRODUCTION_PRIVACY_FIREWALL_C10_V1_STATUS: IN_PROGRESS

## Routing and safety

C-10 makes raw production/customer data structurally incapable of reaching
persistent Nightwatch artifacts. The primary boundary is an allowlisted
structural projection whose persistence API cannot accept raw values; redaction
remains defence in depth only. The campaign closes independent-review findings
F-14 (key names are data), F-15 (digest family confusion), F-16 (parameter
provenance privacy model only), F-17 (browser profile residue) and F-18
(Control Center exclusion from the production store).

This is a repository-local, synthetic-only privacy-hardening campaign. No real
production, DEV or NEXT contact is authorized or performed. No authenticated
browsing, no credential or auth-state inspection, no datastore, cloud, IAM or
Kubernetes access, no sibling-repository write, no external publication. The
production findings store is built and synthetically tested; it is NEVER
populated from a real environment.

C-10 completing does NOT authorize production observation. C-11 `PROD_OBSERVE`,
C-12, C-13 and C-14 are NOT started here. C-06 remains COMPLETE and fail-closed
and is not weakened; no attempt is made to increase `READ_ONLY_PROVEN`.

All work happens in the owned session worktree
`session/nightwatch-production-privacy-fi-5af2d530`; the canonical checkout is
never used for implementation.
