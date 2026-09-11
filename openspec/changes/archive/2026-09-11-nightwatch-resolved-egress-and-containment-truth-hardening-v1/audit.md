# Audit: Resolved Egress + Containment Truth Hardening

Change ID: nightwatch-resolved-egress-and-containment-truth-hardening-v1
Planner status: SELECTED FOR NEXT CAMPAIGN
Planning baseline: 4981b212eed46ffde1edac2b175f1bd1b1f826d2
Target branch: main
Safety scope: LOCAL / repository source / synthetic loopback only
Execution budget: approximately 12 productive engineering hours

## Audit method and current repository state

This is a fresh successor audit after the completed durable-artifact / Control Center truth-hardening campaign.

Planner inventory was taken from the exact recursive Git tree at main 4981b212eed46ffde1edac2b175f1bd1b1f826d2. The Git tree response was complete (truncated=false).

Current tracked-tree census:

- 1,334 tracked blobs
- 274 tracked tree objects
- 14,615,257 tracked bytes
- 409 files under src/
- 233 files under tests/
- 51 files under bin/
- 436 files under .agent/
- 112 files under corpus/
- 30 files under docs/
- 15 files under openspec/
- 14 files under ui/
- 6 files under config/
- dominant extensions: 692 TypeScript, 493 Markdown, 73 JSON, 52 MJS

There are no open GitHub issues and no open pull requests competing with campaign selection.

The previous implementation anchor c3d69039d4f2a9969118d877b432c6b4a2f5d09c is three commits behind the planning baseline. The intervening diff changes only task continuity / reports / docs / OpenSpec task truth; no runtime source, test, environment config, browser contract, proxy implementation, or safety policy file changed. Therefore the containment code inspected below is current at the planning baseline.

The local executor MUST still repeat a literal NUL-safe git ls-files census and read/classify every tracked regular file before implementation. The remote planner tree is an inventory and targeted semantic audit, not permission to skip the repository's H0 all-file execution gate.

## Architecture reviewed

The audit deep-read the current load-bearing containment path:

- src/core/safety/outboundPolicy.ts
- src/core/safety/hosts.ts
- src/core/safety/realRunGate.ts
- src/browser/contract.ts
- src/browser/context.ts
- src/browser/network/fetchGuard.ts
- src/browser/observers/containmentEffect.ts
- src/proxy/policyAdapter.ts
- src/proxy/server.ts
- src/proxy/runtime.ts
- src/proxy/events.ts
- src/proxy/types.ts
- src/core/evidence/runRecorder.ts
- playwright.config.ts and specialized Playwright configs
- tests/globalSetup.ts
- tests/unit/proxy.test.ts
- tests/unit/safety.test.ts
- tests/smoke/proxy.smoke.ts
- tests/smoke/safety.smoke.ts
- config/environments/local.json
- config/environments/dev.json
- config/environments/next.json
- config/environments/production.json
- docs/SAFETY_MODEL.md
- current task/OpenSpec/roadmap/state material from the completed campaigns

The existing browser containment stack is substantial and should be preserved:

- L0 raw-CDP Fetch guard
- L1 Playwright route policy
- L2 WebSocket policy
- L3 service-worker / shared-worker containment
- L4 unrouted-request detection and download cancellation
- L5 mandatory loopback forward proxy
- explicit --proxy-bypass-list=<-loopback>
- --disable-quic
- --force-webrtc-ip-handling-policy=disable_non_proxied_udp
- multiple Chromium background-networking restrictions
- fail-closed real-run preflight
- sanitized proxy evidence

The next campaign is not a rewrite of those layers.

## Selected findings

### F-01 — approved hostname is not bound to the actual socket destination

Planner severity candidate: HIGH containment correctness. Mandatory executable reproduction.

OutboundPolicy decides on the URL hostname. policyAdapter preserves that hostname in ProxyTarget. After a decision of allow, src/proxy/server.ts delegates destination resolution back to Node:

- forward HTTP: http.request({ hostname: target.hostname, ... })
- CONNECT: net.connect({ host: target.hostname, ... })
- WebSocket HTTP Upgrade: net.connect({ host: target.hostname, ... })

This means the hostname is policy-approved before the address that will actually receive the TCP connection is known. There is no owning resolver step, no resolved-address class validation, and no binding between an accepted DNS answer and the socket dial.

The existing statement "denied/unknown destinations are rejected locally before DNS/TCP" remains true for hostname-denied requests. The missing invariant is stronger:

> An allowed hostname must not become authority to dial an arbitrary address returned by name resolution.

A compromised, poisoned, stale, or surprising resolver answer can therefore redirect an allowlisted hostname toward an address class Nightwatch never intended to treat as that environment. The current policy has no place to reject loopback aliases, private/link-local ranges, unspecified/multicast/reserved ranges, or mixed safe+unsafe answers after hostname approval.

This is a containment identity gap, not evidence that current Alphaus DNS is malicious. The campaign must use only synthetic resolvers and loopback fixtures; it must never query real Alphaus DNS to prove the flaw.

Required BEFORE probes:

1. allowlisted synthetic hostname -> exact safe loopback fixture
2. same hostname -> disallowed loopback alias
3. same hostname -> mixed allowed + disallowed answer set
4. malformed resolver address
5. empty answer set
6. resolver error
7. IPv4, IPv6, and IPv4-mapped IPv6 edge cases
8. HTTP forward, CONNECT, and WebSocket Upgrade
9. prove a hostname-policy deny never invokes the resolver
10. prove the current server has no resolved-address policy in the path

A repaired path must resolve once through an owning bounded seam, validate the entire answer set conservatively, then dial an exact accepted numeric address without handing the hostname back to a second implicit resolver.

### F-02 — proxy evidence records policy allow before resolution/connection outcome

Planner severity candidate: MEDIUM operator-truth / observability.

server.ts records the classification before it creates the upstream request/socket. events.ts increments ProxySummary.allowed whenever event.decision === allow. A DNS failure, invalid answer, refused socket, or timeout can therefore coexist with an allow event even though no upstream connection was established.

This may be semantically acceptable if "allowed" is documented strictly as policy authorization, but the current evidence does not separately express resolution rejection, resolution failure, or successful destination binding. The new resolved-egress layer needs enough sanitized lifecycle truth that an operator/test cannot confuse:

- hostname policy authorized
- address resolution accepted
- socket dial attempted
- socket connected
- resolution/dial failed
- resolution policy denied

Do not persist raw customer data, request paths, query strings, headers, cookies, bodies, credentials, or unbounded resolver diagnostics. Raw destination IP persistence is not required for acceptance; address family/class and bounded categorical reason are sufficient unless an existing privacy authority explicitly permits more.

### F-03 — browser-process DNS activity remains an explicitly documented residual

Planner severity: real residual, but NOT authorization for Docker/root/network namespace work.

docs/SAFETY_MODEL.md currently states:

- browser background/speculative traffic is constrained by L5 and launch flags
- DNS prefetch itself is not visible to the proxy and is UNRESOLVED
- Phase 1.2 does not claim complete network isolation
- a future L6 container/network namespace remains planned

src/browser/contract.ts disables QUIC, non-proxied WebRTC, browser background networking, network hints, and related features. It does not establish a browser-process DNS resolver confinement guarantee.

This campaign must not falsify that residual. It may perform a deterministic LOCAL/SYNTHETIC qualification of additional Chromium resolver controls only if that proof performs zero external DNS/network contact and does not weaken the mandatory proxy path. If such a proof is not possible under repository-local authority, record BROWSER_DNS_PREFETCH_REMAINS_L6_RESIDUAL and leave L6 for a separately authorized campaign.

### F-04 — real-run gate proves proxy health/version, not resolved-egress binding

Planner severity candidate: MEDIUM/HIGH safety-contract identity.

ProxyRuntimeState currently carries:

- loopback address/host/port
- environment
- OUTBOUND_POLICY_VERSION
- event log path

realRunGate checks proxy presence, health, selected environment, and policy version. The hostname policy version does not identify whether the running proxy has the new resolver/address-binding behavior.

After this campaign, real-run safety must not be able to treat an older hostname-only proxy as equivalent to a resolved-egress-bound proxy. Add or deliberately evolve the appropriate containment runtime identity and test the mismatch path fail-closed.

Do not bump unrelated source analyzer, dossier, replay, semantic, or campaign identities.

### F-05 — current proxy tests do not exercise hostname-to-address binding

Planner severity candidate: HIGH test gap adjacent to F-01.

tests/unit/proxy.test.ts and tests/smoke/proxy.smoke.ts are strong for parser/policy equivalence and zero-connection evidence on denied literal destinations. Their upstream fixtures use 127.0.0.1 and 127.0.0.2 directly.

They do not currently prove:

- an allowlisted hostname is resolved through a Nightwatch-owned seam
- unsafe resolved addresses are rejected
- mixed answer sets fail closed
- the exact validated address, not the hostname, is handed to the socket
- HTTP / CONNECT / Upgrade share one resolution rule
- resolver errors/timeouts are categorical and bounded
- resolution-policy failures become hard containment failures in run evidence
- an old runtime-state version cannot satisfy the new gate

These tests are mandatory in the successor campaign.

## Non-selected / deferred candidates

### D-01 — actual L6 Docker/network namespace/firewall containment

Still real and still deferred. The generic next-campaign request does not override the repository's explicit requirement for separate authorization before Docker, root firewalling, or network-namespace work.

No Docker implementation, privileged network operations, iptables/nftables, namespace creation, or host networking mutation is authorized here.

### D-02 — DEV/NEXT/production resolution reconnaissance

Not authorized. Do not query real Alphaus DNS, contact product hosts, load authentication state, inspect data planes, or use runtime observations to discover address ranges.

The resolved-address policy must be designed from repository safety semantics and proven with synthetic inputs only.

### D-03 — source-proof or durable-artifact expansion

Rejected. The immediately preceding campaigns completed those areas with full local acceptance. Reopening them without a new reproduced defect would be manufactured scope.

### D-04 — broad campaign-orchestrator decomposition

Not selected. src/core/campaign/orchestrator.ts is large, but size is not itself a correctness defect. Refactor only when a specific reproduced failure justifies it.

### D-05 — GitHub Actions zero-step billing/platform condition

External condition. Do not churn CI to manufacture green evidence.

## Campaign objective selected

Restore the stronger containment invariant:

> Hostname authorization is necessary but not sufficient for egress. Every allowed proxy destination must resolve through one owned, bounded resolution boundary; every resolved address must satisfy the selected environment's address-class policy; and the socket must dial the exact validated numeric destination without re-resolving the hostname.

At the same time, make proxy evidence truthful about policy authorization versus resolution/connection outcome and keep the browser-process DNS/L6 residual explicit unless locally disproven.

## Planner stop condition

Planning ends after this OpenSpec change and .agent/EXECUTION_PROMPT.md are committed/pushed. The planner must not implement source changes.
