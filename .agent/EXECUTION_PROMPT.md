# EXECUTION PROMPT — PHP Read-Only Proof (C-06)

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-php-readonly-proof-c06-v1
OpenSpec: openspec/changes/nightwatch-php-readonly-proof-c06-v1/
Planned-From: 93ea6ebc19ad2e27ff63c9dca3d3b8b21c8cdf57
Target Branch: main
Predecessor Task ID: nightwatch-openapi-admission-c02a-v1
Predecessor Status: COMPLETE

## Mission

Replace the eleven-row hand-catalog read-only authority for `ripple-api` PHP
routes with a mechanically derived, fail-closed proof rooted at the route's
FULLY RESOLVED middleware pipeline plus its handler.

The independent review's F-01 counterexample is the reason: Ripple's
middleware pipeline sits outside every handler closure, and one middleware
performs an outbound call to an external host on every request. A
handler-rooted proof calls such a route read-only. C-06 roots the closure at
the pipeline, replaces the binary write vocabulary with an eight-kind effect
lattice, makes admission kind-diverse and effect-mandatory, and REPORTS the
resulting count instead of targeting it.

C-00's `ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY` invariant
governs the work: all implementation happens in the owned session worktree,
never in the canonical checkout.

## Authority

C-06 grants no new product or runtime authority. It REMOVES one: catalog
membership stops being a read-only classifier. No DEV, NEXT or production
contact, credential inspection, datastore, cloud/IAM/Kubernetes access,
sibling-repository write, or publication is authorized or performed. Sibling
Alphaus repositories are read only, through the existing confined
`SiblingSourceAccess` boundary.

C-06 delivers the PHP lane only. `W-DECLARED_VERB` (C-02b), `W-EFFECT_RPC`
(C-03) and `W-SPEC` (C-09) remain unimplemented and report `UNSUPPORTED`.
