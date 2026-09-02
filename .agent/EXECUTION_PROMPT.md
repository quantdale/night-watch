# EXECUTION PROMPT — Exact-Head CI Baseline Repair and Truth Reconciliation

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-exact-head-ci-baseline-repair-v1
OpenSpec: openspec/changes/nightwatch-exact-head-ci-baseline-repair-v1/
Planned-From: c3fed38abd281e8648c039ac3befe8034c13e868
Target Branch: main
Predecessor Task ID: nightwatch-php-readonly-proof-c06-v1
Predecessor Status: COMPLETE

## Mission

Exact-head Actions run `33572572053` at
`c3fed38abd281e8648c039ac3befe8034c13e868` is the first run that bootstrapped
the runner and executed `gate:ci`. It failed two real synthetic-campaign cases
and left `PATCH_INTEGRITY` and `WORKSPACE_INTEGRITY` `NOT_RUN`.

Determine exactly why those two cases fail on the real GitHub Ubuntu/Node-20
environment, repair the root causes without weakening any safety invariant,
restore an exact-head green CI baseline, and repair project truth so it
describes what actually happened instead of the zero-step platform block that
was true for older runs.

This is a bounded prerequisite/repair campaign before C-10.

## Authority

This campaign authorizes repository-local and GitHub-CI repair only. It grants
no new product or runtime authority, and it TIGHTENS one: the deep L6
containment lane is now required to be proven wherever the host can provide it,
and its absence must be explicitly classified in the authoritative receipt.

No production, NEXT or DEV contact, authenticated browsing, auth capture or
refresh, credential or auth-state inspection, customer-data or datastore
access, AWS/GCP/IAM/Kubernetes discovery, sibling-repository write, or external
publication is authorized or performed. Sibling Alphaus repositories are read
only, through the existing confined read-only boundary, and their ABSENCE must
never masquerade as valid evidence.

C-10, C-11 through C-14 and `PROD_OBSERVE` are NOT implemented here. C-06
remains closed and fail-closed; the PHP read-only proof must not be weakened to
manufacture a non-zero eligible population.

C-00's `ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY` invariant
governs the work: all implementation happens in the owned session worktree
`session/nightwatch-exact-head-ci-baselin-5b773376`, never in the canonical
checkout.
