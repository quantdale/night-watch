# Resolved Egress + Containment Truth Hardening

## Task purpose

Strengthen the Nightwatch L5 proxy so hostname authorization is only the first
egress gate. Every allowed destination must pass one bounded, owned
resolution/address-policy boundary, and the upstream transport must dial the
exact validated numeric address without uncontrolled hostname re-resolution.
Proxy evidence and the real-run preflight identity must describe that stronger
contract truthfully.

## Starting state

- Task ID: `nightwatch-resolved-egress-and-containment-truth-hardening-v1`
- Planned-from SHA: `4981b212eed46ffde1edac2b175f1bd1b1f826d2`
- Execution starting SHA: `9a70e7f3e81255d56352b9efb291f0fb4f4f03de`
- Branch/remote: `main` / private `origin`
- The predecessor durable-artifact task is complete and immutable history.
- The pulled OpenSpec change is selected and implementation was not started.

## Required outcomes

1. Hostname-denied and locally blocked targets invoke no resolver and create no
   upstream socket.
2. Allowed HTTP, CONNECT, and WebSocket Upgrade targets share one resolver,
   complete answer-set validation, and exact-address binding authority.
3. Local resolution admits only exact `127.0.0.1` or `::1` transport addresses;
   external dev/next/static classes admit only globally routable unicast.
   Unsafe, malformed, mixed, empty, oversized, or mismatched answers fail
   closed before dialing.
4. Resolution and connect lifecycle outcomes are bounded, categorical, and
   privacy-safe. Hostname policy authorization is not reported as a successful
   connection, and resolved-address denial is a hard containment failure.
5. Proxy runtime state carries an explicit hostname-policy,
   resolved-address-policy, and exact-binding identity. Old or malformed
   state cannot satisfy the real-run gate.
6. Existing L0-L5 browser restrictions, host policy, read-only boundaries,
   privacy contracts, and authority identities remain unchanged or stronger.
7. Browser-process DNS remains explicitly an L6 residual unless a fully local,
   synthetic, zero-external-contact experiment proves a stronger control.
8. Focused, full local, clean Node 20, browser synthetic, continuity, project,
   and canonical serial acceptance are recorded with exact counts/timings.

## Scope

Repository source, synthetic loopback fixtures, pure address classification,
proxy resolution/binding, sanitized proxy evidence, runtime-state parsing and
real-run preflight identity, tests, and durable safety/architecture/task
documentation directly affected by the contract.

## Non-goals

No DEV/NEXT/production contact, real Alphaus DNS, authenticated state,
customer/data/datastore/cloud/infrastructure access, Docker, namespaces,
firewall/root networking, hosts-file or system-DNS changes, TLS MITM,
arbitrary child-process proxying, source execution, sibling writes,
publication, issue/PR/release actions, runtime AI/provider calls, unrelated
identity/schema changes, broad refactors, or workflow churn.

## Safety constraints

All tests use injected deterministic resolver records, literal local addresses,
and repository-owned loopback servers. Product/page/config input cannot inject
resolver callbacks or sockets. Pure classifier and resolver-policy modules
must have no filesystem, process, network, environment-mutation, persistence,
or AI authority. Resolver diagnostics and raw sensitive request data never
enter durable evidence. The real-run gate remains fail-closed and no
authenticated browser context is created by this campaign.

## Compatibility requirements

Existing hostname policy remains the first gate and its allowlists are not
broadened. The original hostname remains HTTP Host / CONNECT authority and
TLS identity; only the transport destination becomes the accepted numeric
address. Any changed durable event/summary or runtime-state shape is
deliberately versioned and all consumers are audited. Unrelated source,
semantic, replay, dossier, campaign, Control Center, and self-development
identities must not drift.

## Completion condition

The OpenSpec tasks have evidence-backed completion; all required synthetic
matrices and protocol differentials pass; safety vectors are zero; residual
browser DNS truth is documented; continuity files agree on terminal
`COMPLETE`/`STOP`; the validated checkpoint is pushed to `origin/main`; and
local `HEAD` equals `origin/main` with a clean worktree.
