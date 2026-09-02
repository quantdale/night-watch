# Active Task

Task ID: nightwatch-production-privacy-firewall-c10-v1
Phase: PRODUCTION_PRIVACY_FIREWALL_C10_V1
Title: C-10 Production Privacy Firewall
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-production-privacy-firewall-c10-v1
Starting SHA: a152889a71eec6c67d82b05e5984df6423fe88d4
Last validated implementation SHA: 69de7752ca92dc9c01f971e1c2e7d7efcb4569eb
Last checkpoint: C-10 was REOPENED after closure — DEF-C10-5 found that routeTemplate was validated by shape alone, so a concrete customer identifier could be persisted as a route template; the repair makes route identity a source-proven vocabulary membership and is green at 93 C-10 tests pending full revalidation
Current milestone: M12 — DEF-C10-5 route-provenance repair (M0 through M11 remain closed)
Next action: re-run the full validation battery for the DEF-C10-5 repair, integrate through the C-00 session mechanism, and obtain a fresh exact-head GitHub Actions result; F-16 must not be recorded as resolved and C-10 must not be recorded as COMPLETE until that closes
Authorization class: NIGHTWATCH_PRODUCTION_PRIVACY_FIREWALL_C10_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: a152889a71eec6c67d82b05e5984df6423fe88d4
LAST_VALIDATED_IMPLEMENTATION_SHA: 69de7752ca92dc9c01f971e1c2e7d7efcb4569eb
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 69de7752ca92dc9c01f971e1c2e7d7efcb4569eb
LAST_DOCUMENTATION_CHECKPOINT_SHA: da551f0b875fe46acd8a6a9d64f9b16b07ce0734
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
