## Context

qualifyL6RuntimeCapability runs synthetic Node and Chrome probes, then returns a constant-shaped READY object. The Node probe records UDP as CONNECTED when send() succeeds, but directDenied never checks that field. The browser lane starts parent TCP/UDP listeners without passing either endpoint to Chrome, and maps *.invalid to ~NOTFOUND, so zero listener hits do not establish that speculative traffic was attempted and contained. runRestrictedOops later discards the qualification context and separately resolves Bubblewrap and target paths for a new namespace.

## Goals / Non-Goals

**Goals:** complete and non-vacuous probe decisions; exact executable/policy identity; same-generation qualification-to-use binding; fail-closed unsupported/ambiguous results; privacy-safe receipts; adversarial and mutation proof.

**Non-Goals:** replacing Bubblewrap, authorizing DEV/production contact, broadening relay destinations, installing dependencies, or implementing during this planning campaign.

## Decisions

### Model each claim as a witnessed probe

Each proof field has a manifest entry naming the stimulus, positive-control result, contained outcome, parent observer outcome, timeout/completion state, and expected decision. A field becomes PROVEN only when all required evidence is present and internally coherent. Unknown keys, duplicate probe IDs, missing probes, suppressed stimuli, and mere absence of observer hits are NOT_PROVEN.

### Exercise browser behavior rather than infer it

The browser qualification uses deterministic local fixtures that induce the exact DNS, TCP, HTTP, upgrade, QUIC/UDP, background, and descendant classes being claimed. Test endpoints are explicitly wired into the stimulus or a browser-observable resolver harness. Positive controls prove the observers and fixture can detect an escape; contained runs must show the attempted class was either denied by the namespace or passed only through the bounded relay.

### Bind proof to use

Qualification returns an opaque single-use or freshness-bounded handle containing safe digests/identities for Bubblewrap, Node, Chrome when applicable, bootstrap/control code, launch policy, and host/kernel capability facts. Authenticated launch consumes that handle and revalidates the exact files and policy immediately before spawn; mismatch, replacement, race, expiry, or reuse refuses before target workspace or secret-bearing state creation.

### Eliminate synthetic production authority

READY construction is internal to successful qualification. Tests use explicit test-only factories that cannot enter the production import graph. Assertions validate opaque receipt structure and exact generation rather than accepting a caller-constructed object of constants.

## Risks / Trade-offs

- Browser stimuli vary across Chrome versions; exact toolchain identity and categorical unsupported outcomes keep drift honest.
- Descriptor-backed execution may require platform-specific handling; if exact binding cannot be achieved, authenticated execution remains blocked.
- Qualification becomes more expensive, so bounded freshness may be used only when the consumed runtime identities remain unchanged.

## Migration Plan

1. Define probe manifest, receipt, runtime identity, handle, and blocker schemas.
2. Make Node and browser probes complete, positive-controlled, and decision-table driven.
3. Bind qualification and launch identities, then remove constant READY authority.
4. Add executing fault/mutation coverage and update campaign/architecture receipts.

## Open Questions

None. A proof field may be unavailable, but it may never be marked PROVEN from omitted or unexercised evidence.
