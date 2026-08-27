# Proposal: Resolved Egress + Containment Truth Hardening

Status: PLANNED — authorized for executor pickup; implementation is not started by this planning commit.
Change ID: nightwatch-resolved-egress-and-containment-truth-hardening-v1
Planning baseline: 4981b212eed46ffde1edac2b175f1bd1b1f826d2
Target branch: main
Execution budget: approximately 12 productive engineering hours
Safety authority: LOCAL / repository source / synthetic loopback fixtures only

## Why this change

Nightwatch's L5 proxy is the outer application-level egress gate. Its hostname policy is fail-closed for denied destinations, but the current allowed path delegates DNS and connection creation directly to Node after hostname approval. The actual numeric socket destination is therefore outside the policy identity that was approved.

That is the most valuable remaining local containment seam after the source-proof, source-analysis-runtime, durable-artifact, and Control Center currentness campaigns were completed.

The same audit found an evidence-truth issue adjacent to that seam: proxy events count hostname policy allows before resolution/connection outcome, while the real-run gate has no distinct identity proving that the active proxy implements resolved-address binding.

The repository also explicitly documents browser speculative DNS as unresolved. This proposal does not pretend application code can provide a root/network-namespace guarantee. It hardens what can be owned locally and preserves the residual truthfully.

## Intended outcome

By campaign completion:

1. Every allowed HTTP/CONNECT/WebSocket proxy destination passes through one explicit resolver/address-validation boundary.
2. Hostname-denied requests never invoke target resolution.
3. Local environment resolution accepts only the exact intended loopback address class.
4. External dev/next/static destinations cannot silently resolve to loopback/private/link-local/unspecified/multicast/reserved/special-use destinations; the executor must implement a standards-backed conservative classification and prove it with synthetic addresses.
5. Mixed safe+unsafe resolver answers fail closed.
6. The upstream socket uses an exact validated numeric address and does not re-resolve the hostname.
7. Host header / CONNECT authority semantics remain bound to the original approved hostname while the transport dials the validated address.
8. Resolver and dial failures are bounded and represented by sanitized categorical evidence.
9. Proxy/runtime safety identity changes so an old hostname-only proxy cannot satisfy a new real-run gate.
10. Existing hostname policy, L0-L5 browser protections, QUIC/WebRTC restrictions, privacy rules, and environment allowlists remain at least as strict.
11. Browser DNS prefetch is either locally/synthetically qualified with a zero-external-contact proof or remains explicitly documented as an L6 residual.
12. Full local, clean Node 20, browser synthetic, continuity, and canonical serial regression gates pass.
13. No DEV/NEXT/production/auth/data/cloud/infrastructure/publication/sibling-write/runtime-AI action occurs.

## Non-goals

This change does NOT authorize:

- Docker or container runtime installation
- network namespace creation
- iptables/nftables/firewall mutation
- root/administrator networking operations
- real Alphaus DNS lookups for discovery or proof
- DEV, NEXT, or production product contact
- authenticated storage state
- customer/data/datastore/cloud/infrastructure access
- TLS interception or MITM
- certificate pinning redesign
- proxying arbitrary child processes
- new product mutation authority
- source execution from sibling repositories
- publication, issue/PR creation, release creation, evidence upload
- runtime cloud AI/model calls
- changes to campaign selection, source-proof, semantic, replay, dossier, self-dev, or Control Center authority unless required by the containment contract itself
- broad refactors justified only by file size
- CI workflow churn to hide the known zero-step billing/platform condition

## Address-policy principle

The executor must not invent current Alphaus IP ranges.

The safe default model is semantic address classes:

- local environment: exact intended loopback only
- dev/next/static external hosts: globally routable unicast only
- reject unsafe/special classes conservatively

If existing repository contracts prove a stricter model, use it. If a necessary real-environment address class cannot be justified from repository truth, fail closed and record the future configuration requirement rather than guessing a CIDR.

## Compatibility principle

Existing URL hostname policy remains the first gate. Resolved-address policy is an additional gate, not a replacement.

The original hostname/authority remains the HTTP Host/TLS tunnel semantic identity. The validated numeric address is only the transport destination.

Any evidence/runtime schema change must be deliberately versioned and migrated through existing validators/consumers. Do not silently reinterpret an old field.

## Success signals

Primary:

- synthetic allowlisted hostname -> safe resolved address connects
- same hostname -> unsafe resolved address produces zero upstream connections
- mixed answer set produces zero upstream connections
- hostname policy deny causes zero resolver calls
- HTTP, CONNECT, and WebSocket Upgrade all use the same resolver policy
- tests prove the socket receives the approved numeric address rather than the original hostname
- old runtime containment identity fails the new gate
- resolution-policy failures become hard-failure evidence without sensitive leakage

Secondary:

- resolver/dial errors cannot hang the suite indefinitely
- proxy summary clearly distinguishes policy authorization from containment failure
- local browser launch contract remains proxy-mandatory and transport-restricted
- no unexplained test-count, skip, privacy, authority, or identity drift

## Execution handoff

The authoritative one-shot executor instructions are in .agent/EXECUTION_PROMPT.md.

Before source edits create:

- .agent/tasks/nightwatch-resolved-egress-and-containment-truth-hardening-v1/SPEC.md
- .agent/tasks/nightwatch-resolved-egress-and-containment-truth-hardening-v1/PLAN.md
- .agent/tasks/nightwatch-resolved-egress-and-containment-truth-hardening-v1/STATE.md
- .agent/tasks/nightwatch-resolved-egress-and-containment-truth-hardening-v1/REPORT.md

Then route .agent/ACTIVE_TASK.md to the new ACTIVE task. Preserve all completed predecessor tasks as immutable history.
