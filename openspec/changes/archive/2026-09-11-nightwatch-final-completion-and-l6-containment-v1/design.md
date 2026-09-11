## Context

Nightwatch currently has a mandatory loopback L5 proxy and browser-level
guards, but its OOPS sandbox only probes Bubblewrap's ability to create a
network namespace. The existing parent TCP relay cannot be reached from that
namespace, so the authenticated subprocess path is correctly disabled and
the repository cannot claim complete process/network isolation.

The campaign is local-only and may use only unprivileged Linux primitives,
synthetic loopback services and repository-owned fixtures. It must preserve
the owner scope freeze, private evidence boundaries and fail-closed behavior.
The implementation may conclude that L6 is unavailable; in that case the
unsupported state must remain mechanically visible and the terminal campaign
must remain blocked.

## Goals / Non-Goals

**Goals:**

- Define one versioned L6 runtime identity and a categorical capability receipt
  covering startup, readiness, direct DNS/TCP/UDP denial, approved relay flow,
  descendant inheritance and cleanup.
- Where the host supports it, run the contained target in an unprivileged
  network namespace with no external interface and communicate with the
  parent authority only through an explicitly inherited AF_UNIX transport.
- Put a namespace-local HTTP/CONNECT/WebSocket relay in front of browser or
  OOPS traffic; the parent side reuses the existing destination policy and
  exact-address binding rather than becoming a second policy engine.
- Couple the relay, target, descendants and teardown to one process-group
  lifecycle, and fail closed on startup, relay, liveness or cleanup failure.
- Prove the boundary with deterministic local adversarial fixtures and keep
  authenticated OOPS disabled unless every required proof is present.

**Non-Goals:**

- No root, sudo, privileged firewall, host iptables/nftables, host DNS or
  `/etc/hosts` mutation, system proxy, TLS interception, cloud access, or
  real product endpoint.
- No general-purpose network service, unrestricted SOCKS authority, arbitrary
  filesystem exposure, or new product policy authority.
- No change to owner authorization for DEV/NEXT/product operations. A proven
  L6 envelope still does not authorize a real campaign by itself.

## Decisions

1. **Use a network namespace plus AF_UNIX capability transport.** A
   `--unshare-net` Bubblewrap child has only namespace-local loopback; it
   cannot use the parent's TCP listener. A pre-opened, permissioned Unix
   socket (or socket pair) crosses only the intended IPC boundary and is not
   affected by the network namespace. The parent relay validates every
   request with the existing L5 policy and never accepts a raw socket-forward
   command.

2. **Run a small namespace-local proxy for browser compatibility.** Browsers
   support an HTTP proxy endpoint, not an inherited file descriptor. The
   contained helper binds an ephemeral `127.0.0.1` listener inside the
   namespace and forwards bounded HTTP, CONNECT and upgrade frames over the
   inherited AF_UNIX transport. Browser proxy configuration points only to
   that listener. OOPS receives the same namespace-local proxy through an
   explicit environment and cannot bypass it because its namespace has no
   external interface.

3. **Use a minimal read-only root view.** The namespace launcher exposes only
   the executable, required runtime/library directories, a generated minimal
   resolver configuration, and owner-only workspace paths. It does not bind
   the host's broad root, runtime sockets or credential directories. Any
   unsupported host layout causes `UNAVAILABLE`/`STARTUP_FAILED`, not a
   weaker fallback.

4. **Keep policy authority in the existing parent proxy.** The L6 helper is a
   transport adapter and lifecycle supervisor. Destination classification,
   answer-set checks, exact address binding, telemetry treatment and event-log
   failure semantics remain owned by the existing proxy/safety modules.

5. **Model readiness as a prerequisite and revocation signal.** A target is
   launched only after all startup probes and the parent relay handshake pass.
   Relay death, process death, probe failure or cleanup uncertainty changes
   the capability to a categorical failed-closed state and terminates the
   operation. No raw addresses, request bodies, credentials or customer data
   are included in the receipt.

6. **Keep the unsupported path explicit.** If Bubblewrap, required namespace
   operations, the minimal root view, browser launch, relay handshake or any
   adversarial proof is unavailable, the capability is not promotable and
   authenticated OOPS remains disabled. A local restricted synthetic fixture
   may continue to use the existing L5-only path only when it does not claim
   L6 protection.

## Risks / Trade-offs

- [Rootless namespace support differs by host] → Probe the exact operations,
  classify categorical unavailability, and never silently fall back for an
  authenticated operation.
- [Inherited descriptors can be misused by a malicious descendant] → Use a
  fixed framed protocol with request limits, parent-side policy checks and
  close-on-exec for all unrelated descriptors; descendants still cannot open
  network sockets outside namespace loopback.
- [Browser startup may require more files or sandbox features than the minimal
  root view exposes] → Treat missing dependencies as startup failure and
  qualify a fixed supported layout; do not bind the host root to make it pass.
- [A namespace-local proxy can obscure browser background traffic] → Record
  only categorical request decisions and exercise background/speculative
  fixtures; any unexpected direct or relay traffic is a hard failure.
- [Cleanup can race with descendants] → use a dedicated process group,
  bounded TERM/KILL escalation, explicit descendant liveness checks and
  owner-only temporary paths; cleanup uncertainty is a failed-closed result.

## Migration Plan

1. Add the capability/launcher/relay modules and synthetic fixtures behind the
   existing OOPS guard; keep current behavior as the fail-closed default.
2. Add unit and integration tests for all allowed/denied matrix rows, failure
   injection and process-tree cleanup.
3. Enable authenticated OOPS only when the implementation can produce a
   complete `READY` capability receipt on the current host and all tests pass.
4. Update gate/checker/docs/state only after implementation and qualification.
   If the host cannot prove L6, record the blocked outcome and retain the
   disabled route.

## Open Questions

- Which exact Chrome executable/library layout is available on the supported
  Node 20 qualification host, and can it launch inside the minimal root view?
- Does the installed Bubblewrap support descriptor preservation and the
  required namespace options without a user namespace policy failure?
- Can the existing proxy event API be reused through a bounded relay adapter
  without duplicating policy logic? If not, the capability remains blocked
  until an equivalent single authority is proven.
