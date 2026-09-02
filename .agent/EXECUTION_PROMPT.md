# EXECUTION PROMPT — R-11 Proxy/Gate Reliability Closure

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-proxy-gate-reliability-r11-v1
OpenSpec: openspec/changes/nightwatch-proxy-gate-reliability-r11-v1/
Planned-From: c423e33e3384dd3ec34bfd4e9d57d863f58bc190
Target Branch: main
Predecessor Task ID: nightwatch-c10-provenance-truth-closure-v1
Predecessor Status: COMPLETE

## Mission

Eliminate the two pre-existing reliability defects recorded as `OBS-C105-1`, so
that the C-11 `PROD_OBSERVE` safety kernel can be certified by a gate whose
red/green result carries information about repository content and whose
receipts survive being read.

OBS-C105-1 is REPRODUCED, not inferred. The allocator
(`reserveProxyPortLease`) is correct in all four brief-specified cases: it
claims a lease with an exclusive create, probes REAL TCP availability, refuses
an occupied endpoint, and advances through bounded candidates. The defect is in
`tests/unit/phase24ProxyLifecycle.test.ts`, which selected its port by a
`process.pid` lottery and then asserted `lease.port === preferred` — a
preference asserted as a guarantee. Full evidence in the OpenSpec `audit.md`.

The second defect is structural: the authoritative gate emits its receipt to
stdout only, and the clean-checkout wrapper recovers the inner receipt by
scraping stdout for a schema token. C-10.5 lost the original failing-group
detail exactly that way.

## Authority

Repository-local, offline, synthetic-only reliability hardening. This campaign
grants no new product or runtime authority and creates no production
connectivity.

No production, NEXT or DEV contact, authenticated browsing, auth capture or
refresh, credential or auth-state inspection, customer-data or datastore
access, AWS/GCP/IAM/Kubernetes discovery, sibling-repository write, or external
publication is authorized or performed. Sibling Alphaus repositories are read
only. Every socket is loopback-only and belongs either to the port-availability
probe or to a deliberately planted test listener.

C-11 `PROD_OBSERVE` is NOT implemented here and is hard-gated behind the R-11
completion gate. C-06 remains closed and fail-closed. C-10 privacy and C-10.5
provenance are untouched. Production remains non-loadable through ordinary
environment selection.

C-00's `ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY` invariant
governs the work: all implementation happens in the owned session worktree
`session/nightwatch-proxy-gate-reliabilit-6e648bc4`, never in the canonical
checkout.

## Ordered workstreams

R1 reproduction → R2 port-lease contract → R3 deterministic adversarial tests →
R4 bounded stress campaign → R5 durable gate receipts → R6 adversarial receipt
suite and hardening → R7 Stage-A truth reconciliation → R8 registration and
full validation → R9 integration and exact-head CI.

## Constraints

No force push, destructive reset, `skip-worktree`, `assume-unchanged`, hidden
Git configuration, untracked safety-critical change, test deletion,
`test.skip`, defect-hiding retry, timeout inflation as a correctness fix, gate
weakening, or bypass of `agent:check`, `project:check` or `handoff:check`.

No probabilistic port selection may remain in any proxy test: not random, not
`Date.now()`, not another PID formula, and not "find a free port, close the
socket, then assume it is still free". Every repeated run is an independent
invocation; no runner retry is configured or added.

No allocator safety property may be weakened: real TCP bind probing, exclusive
lease creation, process and token ownership, malformed and symlink fail-closed
handling, system-temp coordination across clones and worktrees, the bounded
candidate count, and never deleting a live non-owned lease.

The availability test seam must not be usable to weaken real proxy safety, and
hardening must enforce that the production call path uses the real OS
availability probe. Receipt persistence must be confined, atomic, privacy-safe,
and must never write into a tracked repository path or dirty a clean checkout.

## Validation

`typecheck`, `hardening:check`, `handoff:check`, `project:check`,
`agent:check`, `agent:audit`, `gate:inventory`, `test:semantic-compat`,
`campaign:synthetic`, the focused proxy lifecycle suite, all proxy suites, the
containment suites, the receipt suites, the project-state suites, the complete
canonical Playwright regression, `gate:local`, and repeated `gate:clean` — with
a meaningful repeated run of the previously flaky suite in BOTH the normal local
topology and the clean Node 20 topology, every attempt recorded including any
failure. Then integration and an exact-head GitHub Actions result with all
eleven required groups PASS.

## Completion gate

R-11 is COMPLETE only when: OBS-C105-1 reproduced or disproved; root cause
established with evidence; the test invariant matches the allocator contract;
no probabilistic port-selection assumption remains; occupied-port advancement
and orphan reclaim explicitly tested; real allocator safety preserved;
deterministic adversarial port tests green; stress evidence green with exact
counts; gate receipts durable; a failing group cannot be destroyed by output
filtering; receipt persistence privacy-safe; full regression zero failures; no
test skipped; no retry added; no timeout inflated; `gate:local` PASS; clean
Node 20 gate PASS; exact-head Actions PASS with all eleven required groups; the
canonical checkout clean; `origin/main` synchronized; `siblingWrites = 0`.

If any item fails, R-11 is reported incomplete and C-11 is NOT started.

## Outcome

COMPLETE. Every completion-gate condition holds. OBS-C105-1 was reproduced
deterministically and end-to-end — reproducing the exact `failedLocations`
value the CI receipt had recorded — and closed by correcting the test invariant
rather than the allocator, whose behaviour is unchanged. Gate receipts are
confined, atomic, digest-identical and persisted for failures as well as
passes, and the clean-checkout wrapper consumes the structured file instead of
scraping stdout. Stage-A documentation truth and the obsolete T-30/T-41/T-42
digest semantics are reconciled to D-113.

Certified by exact-head GitHub run `33656654543` / job `100336766433` at
`e11cf64` on Node 20 with receipt `receipt:sha256:e086ad8c508e9eeb3e40d24a`,
all eleven required groups PASS. Canonical regression 3,032 total / 3,019
passed / 13 skipped / 0 failed; `gate:local` PASS; `gate:clean` PASS twice as
independent invocations with identical inner receipts and `siblingWrites: 0`;
29/29 hardening negative probes detected.

Five defects introduced by this campaign — DEF-R11-1 through DEF-R11-5 — were
found, repaired and reported rather than folded away. Two were caught only by
negative probing and three only by the clean Node 20 gate.

C-11 `PROD_OBSERVE` is authorized to begin as its own separately auditable
task. R-11 grants no production connectivity.
