# EXECUTION PROMPT — C-10.5 Provenance and Project-Truth Closure

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-c10-provenance-truth-closure-v1
OpenSpec: openspec/changes/nightwatch-c10-provenance-truth-closure-v1/
Planned-From: cb631cc4af3c3572f4cbf78da04a8265075fbfa5
Target Branch: main
Predecessor Task ID: nightwatch-production-privacy-firewall-c10-v1
Predecessor Status: COMPLETE

## Mission

Bind the C-10 production privacy vocabularies mechanically to genuine source
evidence, and reconcile repository project-state truth, so that C-11
`PROD_OBSERVE` may rely on C-10 as a real prerequisite rather than on a
self-asserted provenance label.

C-10 shipped a real consumption boundary with an unowned minting side:
`createProvenRouteVocabulary` and `createProvenKeyVocabulary` accepted a
caller-chosen provenance class, any shape-valid `ev:sha256:<24hex>` digest and
arbitrary members, and no non-test producer existed anywhere. Every
`SOURCE_PROVEN_*` capability in the shipped system came from a test fixture.
Authority moves from a label the caller asserts to an identity trusted code
computes.

## Authority

Repository-local, synthetic-only provenance and project-truth hardening. This
campaign grants no new product or runtime authority and creates no production
connectivity.

No production, NEXT or DEV contact, authenticated browsing, auth capture or
refresh, credential or auth-state inspection, customer-data or datastore
access, AWS/GCP/IAM/Kubernetes discovery, sibling-repository write, or external
publication is authorized or performed. Sibling Alphaus repositories are read
only.

C-11 `PROD_OBSERVE` is NOT implemented here and is hard-gated behind the
Stage-A completion gate. C-06 remains closed and fail-closed; no attempt is
made to increase `READ_ONLY_PROVEN`. Production is NOT added to
`SUPPORTED_ENVIRONMENTS` and `config/environments/production.json` remains
non-loadable.

C-00's `ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY` invariant
governs the work: all implementation happens in the owned session worktree
`session/nightwatch-c10-provenance-truth--ba3470bc`, never in the canonical
checkout.

## Ordered workstreams

A2 reproduction → A3 authority model → A4 route derivation → A5 key derivation
→ A6 forgery resistance → A7 content binding → A8 import isolation → A9
`CURRENT_STATE` reconciliation → A10 project-state validator repair → A11
certification reconciliation → A12 digest-semantics reconciliation → A13
persisted-position sentinel rule → A14 full validation → A15 completion gate.

## Constraints

No force push, destructive reset, `skip-worktree`, `assume-unchanged`, hidden
Git configuration, untracked safety-critical change, test deletion,
`test.skip`, defect-hiding retry, timeout inflation as a correctness fix, gate
weakening, or bypass of `agent:check`, `project:check` or `handoff:check`.
Synthetic sentinels only; no real customer identifier in any test or record.

## Validation

`typecheck`, `hardening:check`, `handoff:check`, `project:check`,
`agent:check`, `agent:audit`, `gate:inventory`, `test:semantic-compat`,
`campaign:synthetic`, all C-10 suites, the new provenance-binding suites, the
affected source-intelligence suites, the project-state validator suites, the
complete canonical Playwright regression, `gate:local`, `gate:clean`, then
integration and an exact-head GitHub Actions result with all eleven required
groups PASS.

## Completion gate

The Stage-A gate in full: mechanically derived vocabularies, computed
provenance digests, contents bound to evidence identity, source identity bound,
incomplete evidence failing closed, test-only construction unable to produce
production authority, the pure cone still import-isolated, reconciled
`CURRENT_STATE` live anchors, a validator that catches mutually consistent
stale-baseline substitution, reconciled C-10 counts and digest semantics,
mechanically enforced persisted-free-form-field coverage, a zero-failure full
regression, `gate:local` PASS, `gate:clean` PASS, exact-head CI PASS with all
eleven gate groups, a clean canonical checkout and a synchronized `origin/main`.

If any item fails, Stage A is reported incomplete and C-11 is NOT started.
