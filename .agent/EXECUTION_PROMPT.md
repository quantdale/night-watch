# EXECUTION PROMPT — C-11 `PROD_OBSERVE` Safety Kernel

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-prod-observe-safety-kernel-c11-v1
OpenSpec: openspec/changes/nightwatch-prod-observe-safety-kernel-c11-v1/
Planned-From: 060fef41205b29210d9bd8416aca97c03b028e4f
Target Branch: main
Predecessor Task ID: nightwatch-proxy-gate-reliability-r11-v1
Predecessor Status: COMPLETE

## Mission

Implement and certify the `PROD_OBSERVE` production-qualification kernel
against MOCK/SYNTHETIC production only, so that Nightwatch is demonstrably
incapable of issuing a production request unless every required machine
authority grants it.

C-11 is Production Qualification ONLY. It does not perform C-12/P1 real
production observation, and it grants no authority over real production.

The design reconciliation is COMPLETE and recorded in the OpenSpec `audit.md`
and `design.md`. Do not implement the historical text blindly: five historical
requirements are SUPERSEDED by independent-review findings F-09 through F-13,
P1 is DEFERRED per F-13, and the "eleven ordered gates" labelled `G0`–`G11` —
twelve identifiers — is replaced by `nightwatch.production-admission-chain.v1`,
a versioned NAMED ordered chain of eighteen gates with a definition digest and a
documented mapping from the historical identifiers.

## Authority

Repository-local, offline, synthetic-only production-qualification hardening.
This campaign creates NO production connectivity.

No real production, NEXT or DEV contact, authenticated browsing, auth capture
or refresh, credential or auth-state inspection, customer-data or datastore
access, AWS/GCP/IAM/Kubernetes discovery, sibling-repository write, or external
publication is authorized or performed. Sibling Alphaus repositories are read
only. Mock production is loopback-only with no external DNS and no real Alphaus
host.

D-4 stands: production does not join `SUPPORTED_ENVIRONMENTS` and
`config/environments/production.json` remains structurally unloadable. C-06
remains fail-closed and `READ_ONLY_PROVEN` is not increased. C-10 privacy and
C-10.5 provenance are consumed, not modified.

C-12 is NOT authorized and is NOT begun.

C-00's `ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY` invariant
governs the work: all implementation happens in the owned session worktree
`session/nightwatch-prod-observe-safety-k-5d5e338f`, never in the canonical
checkout.

## Ordered workstreams

C1 design reconciliation (complete) → C2 authorization class and separation →
C3 the eighteen-gate admission chain → C4 budgets, breakers and containment →
C5 mock production and the one-fault denial matrix → C6 positive path and PQ
receipt → C7 hardening, gate registration and full validation → C8 integration
and exact-head CI.

## Constraints

No force push, destructive reset, `skip-worktree`, `assume-unchanged`, hidden
Git configuration, untracked safety-critical change, test deletion,
`test.skip`, defect-hiding retry, timeout inflation as a correctness fix, gate
weakening, or bypass of `agent:check`, `project:check` or `handoff:check`.

`KNOWN_PRODUCTION_HOSTS` remains DENY-ONLY in every mode and must never be
inverted or imported by the production policy. `realRunGate` must gain no
production branch and no mode parameter. Shared modules must take policy by
injection with NO default; missing policy denies. No production
`context.storageState()` persistence path may exist.

Concrete parameter values may not enter authorization state, receipts, logs,
budget keys, replay keys, fingerprints, errors, checkpoints or persistent route
identities. Budgets reserve BEFORE dispatch and are consumed on reservation.
Breakers are terminal. The kill switch is evaluated at entry AND immediately
before dispatch.

Every pre-dispatch denial must be proven to leave the mock server's
received-request count at ZERO, asserted network-side; an internal boolean is
not accepted as evidence.

## Validation

`typecheck`, `hardening:check`, `handoff:check`, `project:check`,
`agent:check`, `agent:audit`, `gate:inventory`, `test:semantic-compat`,
`campaign:synthetic`, all proxy suites, all containment suites, all C-10 and
C-10.5 suites, all C-11 suites, all receipt suites, all environment suites, all
authorization suites, all privacy and persistence suites, all budget and
breaker suites, the complete canonical Playwright regression, `gate:local`, and
`gate:clean`. Then integration and an exact-head GitHub Actions result with all
eleven required groups PASS.

Commit before running a gate and do not touch the tree while one runs: a dirty
checkout voids `PATCH_INTEGRITY` and the clean gate outright. This is R-11's
recorded lesson.

## Completion gate

C-11 is COMPLETE only when: R-11 remains closed; the reconciled design is
implemented; the gate-count ambiguity is resolved by name; D-4 is intact;
production remains ordinarily non-loadable; the external-only config
architecture exists; the production allowlist is independent of the deny table;
a separate production run gate exists; import graphs are mechanically
separated; the authoritative ordered admission chain is defined and versioned;
every gate is individually tested; all one-fault cases deny; every pre-dispatch
denial is proven to leave zero mock-server requests; the kill switch is checked
at entry and pre-dispatch with the revocation race tested; the observer-identity
and organizational-window gates are present; source provenance is mechanically
bound; C-06 is not weakened; opaque parameter semantics are preserved; the
privacy firewall is mandatory; containment qualification is explicit; budgets
are race-safe; breakers are terminal; `Set-Cookie` cannot persist auth state;
screenshots, traces and raw console text remain impossible to persist; the
positive synthetic path succeeds; the PQ receipt is valid and tamper-resistant;
the persistence audit is clean; there is zero real production, DEV and NEXT
contact and zero credential inspection; `siblingWrites = 0`; every C-11 suite
is gate-registered; the canonical regression has zero failures and no new
skips; `gate:local` PASS; clean Node 20 gate PASS; exact-head GitHub Actions
PASS with all eleven groups; the worktree is clean; `origin/main` is
synchronized; and the session is released.

If any item fails, C-11 is reported incomplete and C-12 is NOT started.

## Outcome

COMPLETE. Every completion-gate condition holds. The `PROD_OBSERVE` kernel is
implemented and qualified against MOCK production only, and it creates no
production connectivity: the cone contains no network client, so it cannot
contact anything even if every gate were bypassed.

The historical "eleven gates" labelled `G0`-`G11` — twelve identifiers, with an
acceptance criterion phrased as a COUNT — is replaced by
`nightwatch.production-admission-chain.v1`, a versioned NAMED ordered chain of
eighteen gates carrying a definition digest, with the mapping kept
machine-checkable in source. A 38-entry one-fault denial matrix falsifies every
gate individually, each denial proven network-side to leave the mock server's
received-request count at ZERO. The positive synthetic path lands exactly one
GET on loopback with budget reserved first and the one-shot grant CONSUMED.

Certified by exact-head GitHub run `33665872548` / job `100367351818` at
`150dfcc` on Node 20 with receipt `receipt:sha256:1d991b9a10d4cad618c0f533`,
all eleven required groups PASS. Canonical regression 3,141 total / 3,128
passed / 13 skipped / 0 failed; `gate:local` PASS; `gate:clean` PASS on Node 20
with `siblingWrites: 0`; 22/22 hardening negative probes detected.

Six defects introduced by this campaign — DEF-C11-1 through DEF-C11-6 — were
found, repaired and reported. Two were caught only by building the one-fault
matrix, three only by negative probing, and one only by the clean Node 20 gate.

D-4 is intact, production remains ordinarily non-loadable,
`KNOWN_PRODUCTION_HOSTS` stays deny-only and unreachable from the cone, C-06 is
not weakened, and zero credentials were inspected.

NEXT CRITICAL-PATH CAMPAIGN: C-12 P1 PASSIVE PRODUCTION OBSERVATION. It is NOT
authorized and NOT started: it would be the first campaign involving real
production observation and requires a new explicit owner authorization after
review of the completed C-11 evidence.
