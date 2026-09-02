# EXECUTION PROMPT — C-10 Production Privacy Firewall

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-production-privacy-firewall-c10-v1
OpenSpec: openspec/changes/nightwatch-production-privacy-firewall-c10-v1/
Planned-From: a152889a71eec6c67d82b05e5984df6423fe88d4
Target Branch: main
Predecessor Task ID: nightwatch-exact-head-ci-baseline-repair-v1
Predecessor Status: COMPLETE

## Mission

Make raw production bytes, customer identifiers, business values, credentials,
authenticated DOM/text and concrete request parameters structurally incapable of
crossing into persistent evidence. Replace the denylist boundary (redaction
after observation, sentinel screening at the store) with an allowlisted
structural projection that has no persistence authority, backed by an
independent persistence firewall at the durable write.

Close the four paths that carry production bytes AROUND the boundary — request
URLs and parameters (F-16), key names admitted as "shape" (F-14), page console
output, and the on-disk browser profile (F-17) — plus the F-15 digest-family
contradiction and the F-18 Control Center exposure.

## Authority

Repository-local, synthetic-only privacy hardening. This campaign grants no new
product or runtime authority and creates no production connectivity.

No production, NEXT or DEV contact, authenticated browsing, auth capture or
refresh, credential or auth-state inspection, customer-data or datastore access,
AWS/GCP/IAM/Kubernetes discovery, sibling-repository write, or external
publication is authorized or performed. Sibling Alphaus repositories are read
only, through the existing confined read-only boundary.

C-11 `PROD_OBSERVE`, C-12, C-13 and C-14 are NOT implemented here. C-06 remains
closed and fail-closed. Production is NOT added to `SUPPORTED_ENVIRONMENTS` and
`config/environments/production.json` remains non-loadable.

C-00's `ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY` invariant
governs the work: all implementation happens in the owned session worktree
`session/nightwatch-production-privacy-fi-5af2d530`, never in the canonical
checkout.

## Ordered workstreams

A persistence-cone audit → B key provenance (F-14) → C digest families (F-15) →
D typed projection boundary → E import isolation → F persistence firewall →
G production artifact root → H Control Center exclusion (F-18) →
I console/screenshots/traces/browser profile (F-17) → J parameter provenance
(F-16) → K SSE projection safety → acceptance suite (five §6.5 classes) →
persistence audit → full validation → integration and exact-head CI.

## Validation

`typecheck`, `hardening:check`, `handoff:check`, `project:check`, `agent:check`,
`agent:audit`, `gate:inventory`, `test:semantic-compat`, `campaign:synthetic`,
all C-10 privacy/projection/evidence/Control-Center/browser suites, the complete
canonical Playwright regression, `gate:local`, `gate:clean`, then integration
and an exact-head GitHub Actions result with all eleven required groups PASS.
