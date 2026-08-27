# EXECUTION PROMPT — Resolved Egress + Containment Truth Hardening

Status: ACTIVE PLANNING HANDOFF — IMPLEMENTATION NOT STARTED
Change ID: nightwatch-resolved-egress-and-containment-truth-hardening-v1
Planned-From: 4981b212eed46ffde1edac2b175f1bd1b1f826d2
Target branch: main
OpenSpec: openspec/changes/nightwatch-resolved-egress-and-containment-truth-hardening-v1/
Expected productive budget: approximately 12 engineering hours
Safety authority: LOCAL / repository source / synthetic loopback fixtures only

## Mission

Pull/reconcile current quantdale/night-watch main and execute the OpenSpec change nightwatch-resolved-egress-and-containment-truth-hardening-v1 end-to-end as one autonomous campaign.

Do not resume the completed durable-artifact campaign. Create a fresh continuity-v2 task.

The objective is to strengthen Nightwatch's L5 egress invariant from:

"hostname is allowlisted"

to:

"hostname is allowlisted, every resolved address is policy-acceptable, and the socket dials the exact validated numeric destination without uncontrolled re-resolution."

Also make proxy evidence and pre-real-run identity truthful about this stronger containment contract.

Do not ask for routine confirmation. Resolve implementation details from repository truth, tests, and this OpenSpec. Stop only for a genuine authorization boundary, an unsafe ambiguity that cannot be conservatively resolved, or terminal completion.

## Why this campaign exists

Current main has a concrete unsolved containment seam.

In src/proxy/server.ts, after OutboundPolicy allows a hostname:

- HTTP uses http.request with target.hostname
- CONNECT uses net.connect with target.hostname
- WebSocket Upgrade uses net.connect with target.hostname

Node therefore resolves the actual socket destination after hostname authorization. Nightwatch does not own or validate the returned address set and does not bind the policy decision to the exact numeric destination.

Current proxy tests prove denied literal hosts/IPs receive zero connections. They do not prove address-class admission or exact hostname-to-socket binding.

A second adjacent truth gap exists: proxy events record allow before resolution/connection outcome, and ProxySummary.allowed counts those authorizations. Resolution denial/failure and successful exact binding are not distinct durable outcomes.

The real-run gate checks hostname policy version and proxy health but not a resolved-egress binding identity.

docs/SAFETY_MODEL.md also explicitly says browser speculative DNS remains unresolved and future L6 network namespace/container work is planned. That is real residual scope, but this campaign does NOT authorize Docker, root, firewall, or namespace implementation.

## Mandatory takeover

Read in this order:

1. AGENTS.md
2. .agent/PLANNER_HANDOFF.md
3. .agent/PLANS.md
4. this file
5. .agent/ACTIVE_TASK.md
6. docs/CURRENT_STATE.md
7. docs/SAFETY_MODEL.md
8. docs/DECISIONS.md
9. docs/ROADMAP.md
10. docs/ARCHITECTURE.md
11. completed predecessor STATE/REPORT
12. every file in openspec/changes/nightwatch-resolved-egress-and-containment-truth-hardening-v1/

Then:

- fetch origin/main
- compare takeover HEAD with Planned-From
- inspect every intervening diff
- create .agent/tasks/nightwatch-resolved-egress-and-containment-truth-hardening-v1/SPEC.md
- create PLAN.md, STATE.md, REPORT.md
- declare CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
- route .agent/ACTIVE_TASK.md to the fresh ACTIVE task
- record exact starting SHA/toolchain/dirty state/scope before source edits

## H0 — literal every-file audit is non-negotiable

Before implementation, scour the entire local checkout.

Use NUL-safe git ls-files and account for every tracked regular file.

Record:

- tracked count
- reviewed count
- tracked bytes
- tracked lines
- deterministic manifest/content digest
- subsystem classification
- active-runtime vs historical/docs disposition
- changed-since-planner disposition

Hard gate: reviewed == tracked.

Planner remote baseline at 4981b212... was 1,334 tracked blobs / 14,615,257 bytes. This is only a cross-check; local Git at takeover is authoritative.

At minimum mechanically search/disposition across the complete tree:

- TODO/FIXME/HACK/XXX/DEPRECATED
- test.skip/only and describe.skip/only
- ts-ignore/expect-error/eslint-disable
- eval/new Function/shell:true/child_process
- all dns.lookup/resolve APIs
- all http/https/fetch/net/socket/dgram primitives
- browser launch/proxy flags
- all ProxyEvent/ProxySummary/ProxyRuntimeState consumers
- all real-run gate consumers
- every env/host/address policy
- all writes/persistence that could capture resolver diagnostics
- every test/corpus fixture that asserts network safety

Historical .agent/docs files still count as reviewed. Do not waste the campaign rewriting completed history unless it contains a live conflicting instruction.

No production source edit before H0 + baseline are recorded in STATE.

## Reproduce before repair

The planner finding is not a license to blindly patch.

Create executable failing tests first for the public/owning proxy path.

### Reproduction A — hostname allow does not bind address

Use a synthetic injected resolver. No public DNS.

Required cases:

- allowlisted synthetic hostname -> 127.0.0.1
- same hostname -> 127.0.0.2
- safe + unsafe mixed answers
- malformed answer
- empty answer
- resolver error
- resolver never settles / bounded timeout
- IPv4
- IPv6
- IPv4-mapped IPv6

Prove current semantics, then implement the corrected invariant.

### Reproduction B — denied hostname must never resolve

Spy resolver call count.

Test:

- hard deny
- production-class deny
- unknown Alphaus deny
- external default deny
- telemetry local block
- optional-support local block
- browser-background local block

Expected: zero target resolver calls and zero upstream connections.

### Reproduction C — all protocols share one address authority

Exercise the same resolver matrix through:

- forward HTTP
- CONNECT
- WebSocket Upgrade
- WSS/HTTPS tunnel framing where the existing fixture can prove it without MITM

No protocol may own a weaker resolver rule.

### Reproduction D — exact dial

Instrument the connector locally.

The AFTER invariant must prove:

- resolver accepts numeric A
- socket receives numeric A
- socket does not receive the original hostname
- no second DNS lookup occurs in that connection attempt
- HTTP Host / CONNECT authority still contains original hostname

### Reproduction E — evidence truth

Capture current behavior for:

- policy allow + resolver failure
- policy allow + unsafe address
- policy allow + connect refusal
- policy allow + successful connection

Then make durable/sanitized evidence distinguish policy authorization from resolution/connect outcome. Do not log raw unbounded errors.

### Reproduction F — old runtime state

Build a valid current hostname-only ProxyRuntimeState fixture. After hardening, it must fail the new containment runtime/gate identity rather than masquerading as current.

## Implement one pure resolved-address classifier

Create the smallest owning pure module. Do not scatter CIDR logic across protocol handlers.

Cover exact boundary behavior for:

IPv4:
- unspecified
- exact loopback vs other loopback aliases
- RFC1918 private
- link-local
- CGNAT/shared
- documentation
- benchmark/testing
- multicast
- reserved/special-use
- global unicast

IPv6:
- unspecified
- loopback
- link-local
- unique-local
- multicast
- documentation/reserved
- IPv4-mapped
- global unicast

Do not classify CIDRs with fragile string-prefix regexes.

Target policy:

LOCAL:
- exact 127.0.0.1 / ::1 transport authority only, unless the current config explicitly proves another exact address

DEV/NEXT/static external:
- hostname must already pass existing OutboundPolicy
- resolved answers must be globally routable unicast
- special-use/private/local ranges fail closed
- mixed safe+unsafe answer set fails closed

Do not query live Alphaus DNS and do not invent CIDR allowlists.

If repository truth proves a real environment requires a non-global range, record a future explicit owner-reviewed address-policy need. Do not weaken the rule ad hoc in this local campaign.

## Implement one owned resolver seam

Requirements:

- called only after hostname allow
- tests inject deterministic address records only
- real resolver remains internal
- answer count bounded
- malformed/family mismatch rejected
- empty set rejected
- categorical errors only
- no arbitrary callback/socket injection from page/config
- logical timeout/bound so request cannot hang forever
- be truthful if OS lookup cannot be physically cancelled
- IP literals still pass address classification
- no global unbounded resolver cache

Validate the entire answer set before selecting/dialing. Do not drop an unsafe answer and proceed.

## Bind the socket to the validated numeric destination

HTTP:
- exact numeric connection
- original Host preserved
- no second uncontrolled hostname lookup

CONNECT:
- net.connect numeric address/family
- original hostname:port preserved as authority
- TLS remains browser-to-origin, no MITM

WebSocket Upgrade:
- same resolution helper
- numeric dial
- original Host preserved

If multiple accepted addresses are attempted, bound the attempt count and never re-resolve within the same connection attempt.

## Evidence and hard-failure semantics

Do not conflate "policy allowed" with "connected."

Prefer additive explicit bounded outcome truth such as:

- policyAuthorized
- resolutionDenied
- resolutionFailed
- connectAttempted
- connected
- connectFailed

Use the smallest schema consistent with existing artifacts/consumers.

A resolved-address policy denial is a containment violation and must fail the run.

Durable evidence must remain sanitized. Raw IP storage is not required. Address family/class + categorical reason is sufficient unless an existing privacy contract proves otherwise.

Audit every consumer if ProxyEvent/ProxySummary changes. Version deliberately; do not silently reinterpret durable data.

## Runtime identity

Do not rely on OUTBOUND_POLICY_VERSION alone if hostname policy semantics did not change.

The running proxy must expose an identity proving current:

- hostname policy version
- resolved-address policy version
- exact-address-binding contract

Update:

- proxy runtime state
- parser
- global setup
- direct runners
- realRunGate
- fixtures/tests
- docs

Old/malformed containment state must fail closed before authenticated browser creation.

Do not load authenticated state during this campaign.

## Browser DNS workstream — bounded, no false claim

Existing browser hardening already disables QUIC, non-proxied WebRTC UDP, background networking, network hints, and fetching hints, and mandates the loopback proxy.

The docs still correctly say speculative DNS is unresolved.

You may investigate stronger Chromium resolver controls only if a deterministic zero-external-contact experiment can prove them mechanically and the normal proxy path remains functional.

Do NOT:

- add random Chrome flags because they sound relevant
- query external DNS to test
- edit system hosts/DNS
- use root/admin networking
- install Docker
- create network namespaces
- alter firewall rules

If no valid local proof exists, record exactly:
BROWSER_DNS_PREFETCH_REMAINS_L6_RESIDUAL

That is a valid campaign result and is more correct than a false "full network isolation" claim.

## Regression rules

Do not weaken existing:

- hostname allow/deny policy
- known production host table
- environment selection
- L0 CDP guard
- L1 route policy
- L2 WebSocket policy
- L3 worker containment
- L4 detection
- L5 mandatory proxy
- proxy bypass restriction
- QUIC disable
- WebRTC non-proxied UDP disable
- auth trace/privacy rules
- read-only action policy
- data/infra freeze
- sibling read-only policy
- publication prohibition
- source-proof/campaign/replay/dossier authority

No test deletion, skip addition, assertion loosening, or silent snapshot rewrite to obtain green.

Correctness drift must be categorized:
- INTENTIONAL_CONTAINMENT_DELTA
- EXPECTED_VERSION_INVALIDATION
- UNEXPLAINED_DRIFT

UNEXPLAINED_DRIFT blocks completion.

## Validation

Use current repository-native scripts, not stale assumptions.

At minimum record:

- npm run typecheck
- npm run hardening:check
- focused proxy tests
- new classifier/resolver/binding tests
- safety tests
- realRunGate tests
- RunRecorder/proxy evidence tests
- proxy smoke
- browser containment contract tests
- privacy/redaction tests
- npm run test:owner-provenance
- npm run gate:inventory
- npm run campaign:synthetic where applicable
- npm run test:semantic-compat if durable shared identity changed
- npm run agent:check
- npm run agent:audit
- npm run project:check
- npm run gate:local
- npm run gate:clean / current clean Node20 equivalent
- canonical complete serial Playwright regression
- git diff --check
- tracked secret/private artifact audit
- focused before/after wall time/open-handle check

Run the clean Node20 acceptance in a disposable clean checkout/worktree. Prove no dependency on untracked hosts/DNS overrides or developer-machine state.

If Control Center/UI DTOs are not touched, do not manufacture UI work. If proxy summary schema reaches them, run the exact affected UI/unit/build/browser cone.

## 12-hour productive work shape

Use tasks.md as the detailed checklist.

Suggested:

- H0-1.5: takeover + literal every-file audit + baseline
- H1.5-3: red-team resolver/address/evidence/runtime reproductions
- H3-5: classifier + resolver authority
- H5-7: exact-address HTTP/CONNECT/WS binding + races/timeouts
- H7-8.5: evidence/runtime gate/version integration
- H8.5-9.5: browser DNS residual qualification + adversarial cases
- H9.5-11: full local/clean regressions + fixes
- H11-12: docs/continuity/exact-head evidence/final push

This is a productive budget, not an instruction to idle. If all acceptance is truly complete early, stop. If Critical/High in-scope defects remain, prioritize correctness and truthful INCOMPLETE/BLOCKED state.

## Safety hard boundaries

The final safety vector must remain:

- DEV contacts: 0
- NEXT contacts: 0
- production contacts: 0
- live Alphaus DNS reconnaissance: 0
- authenticated storage-state loads: 0
- customer/data/datastore ops: 0
- cloud/infra ops: 0
- sibling writes: 0
- publication: 0
- external runtime AI/model calls: 0
- Docker/network namespace/firewall/root networking changes: 0
- force pushes: 0

Synthetic loopback server/socket activity required by tests is allowed.

## Git / continuity / closure

After each durable milestone:

implement -> validate -> repair -> update STATE -> commit/push validated checkpoint when appropriate.

At final:

- all OpenSpec requirements/tasks backed by evidence
- REPORT includes every reproduction, matrix, identity delta, test count, timing, and safety vector
- docs/SAFETY_MODEL.md accurately states stronger L5 resolved-egress binding
- docs keep browser-process DNS / actual L6 residual truthful if still unresolved
- CURRENT_STATE / ROADMAP / DECISIONS / ARCHITECTURE updated only for durable changed truth
- .agent/ACTIVE_TASK.md terminal COMPLETE
- next action STOP
- push final main
- verify origin/main == local HEAD
- classify exact-head Actions truthfully; zero-step remains external billing/platform blocked
- stop; do not select another campaign
