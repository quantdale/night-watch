# SPEC.md

**Task:** nightwatch-production-privacy-firewall-c10-v1
**Campaign:** C-10 — Production Privacy Firewall
**Objective:** Make raw production/customer data structurally incapable of
reaching persistent Nightwatch artifacts, by replacing "redaction after
observation" with an allowlisted structural projection whose persistence API
cannot accept raw values, and by closing the four leakage paths that carry
production bytes *around* that boundary (F-14 key names, F-16 request
parameters, page console output, F-17 browser profile) plus the F-15 digest
confusion and the F-18 Control Center exposure.

**Frozen intent.** C-10 creates a privacy PREREQUISITE. It does not authorize
production observation, does not implement `PROD_OBSERVE`, and does not create
any production connectivity.

## Scope

- **Workstream A** — complete persistence-cone audit: every path capable of
  writing or indirectly exposing durable state, classified `SAFE_STRUCTURAL` /
  `DEV_ONLY` / `PRODUCTION_PROHIBITED` / `PRODUCTION_PROJECTED` /
  `EXTERNAL_SECRET_STATE` / `UNKNOWN`, with `UNKNOWN` treated as unsafe.
- **Workstream B (F-14)** — object key literals are data. A key may cross the
  production projection boundary only as a member of a source-proven finite key
  vocabulary carrying explicit provenance. Unproven/dynamic keys project as
  bounded structural information only: never the literal, never a digest
  derived from the literal.
- **Workstream C (F-15)** — two type-distinct digest families. An unsalted,
  value-free, cross-campaign-stable STRUCTURAL digest that may be persisted;
  and no durable value-derived digest at all. Ephemeral in-memory encounter
  correlation only, campaign-scoped, never persisted, never digested.
- **Workstream D** — a production projection cone with no persistence
  authority and a persistence cone that cannot accept raw response objects,
  expressed as three distinct types: `RAW_EPHEMERAL`,
  `SAFE_STRUCTURAL_PROJECTION`, `SAFE_PRODUCTION_EVIDENCE`.
- **Workstream E** — mechanical import isolation of the projection cone
  (no `node:fs`, `node:http(s)`, `node:net`, `node:dgram`, fetch clients,
  `child_process`, environment output destinations, publication connectors),
  enforced by `hardening:check`.
- **Workstream F** — an independent persistence firewall at the durable-write
  boundary that re-validates the approved DTO and rejects raw values, bodies,
  dynamic key literals, concrete URLs, headers, cookies, tokens, storage state,
  free text, authenticated DOM, screenshots, traces, out-of-contract nesting
  and unknown schema versions.
- **Workstream G** — a production artifact root (`$HOME/.nightwatch/prod-findings/`)
  distinct from the DEV findings root, owner-only 0700/0600, symlink-refusing,
  outside the repository/workspace, atomic, bounded, with its own policy
  identity and explicit schema.
- **Workstream H** — the Control Center findings authority is structurally
  incapable of reading the production store, by resolved-path equivalence,
  including through the test-only seam, enforced by a hardening invariant.
- **Workstream I** — production console text cannot persist; production
  screenshots and Playwright traces are contract failures; ephemeral browser
  profile controls (private path, restrictive permissions, disk cache off,
  crash dumps off, normal-exit and crash-path cleanup, stale-residue sweep).
- **Workstream J** — the privacy-side contract for future request-parameter
  provenance: owner-supplied values held external-only, Nightwatch state
  carrying opaque handles only, route-template URL identity, and validators
  proving no value can enter logs, budget keys, replay fingerprints,
  checkpoints, errors, receipts or persisted URLs. Model, validators and
  synthetic proof ONLY — no production request execution path.
- **Workstream K** — SSE/Control Center projection safety: prove only
  already-safe projected metadata can enter those channels and that SSE cannot
  become a side channel around the persistence boundary.
- **Acceptance** — all five `design.md §6.5` classes as meaningful executable
  tests (sentinel corpus, projection totality/property, boundary import
  isolation, error-path leakage, digest privacy) plus a deterministic
  persistence audit.

## Non-goals

- No C-11 `PROD_OBSERVE`, no C-12, C-13 or C-14.
- No production observation, no production connectivity, no addition of
  production to `SUPPORTED_ENVIRONMENTS`, and `config/environments/production.json`
  remains non-loadable.
- No real production, DEV or NEXT contact; no authenticated browsing; no
  credential or auth-state inspection; no datastore, cloud, IAM or Kubernetes
  access; no sibling-repository write; no external publication.
- No weakening of C-06 and no attempt to increase `READ_ONLY_PROVEN`.
- No rewrite of the Phase 9 DEV semantic projection
  (`nightwatch.semantic-projection.v1`); C-10 adds a versioned production
  sibling and leaves DEV compatibility intact where it is safe.
- No population of the production store from any real environment.

## Safety constraints

- C-00 holds: all implementation occurs in the owned session worktree
  `session/nightwatch-production-privacy-fi-5af2d530`, never in the canonical
  checkout.
- No forbidden shortcut: no `test.skip`, no weakened privacy assertion, no
  removed failing test, no suppressed error, no limit raised merely to pass, no
  retry introduced to hide nondeterminism, no regex-only key allowlist, no
  "looks like an identifier therefore safe", no hash of a raw customer id
  presented as anonymization, no persisted salted hash of an enumerable field.
- Redaction remains defence in depth and is never the primary boundary.
- An `UNKNOWN` privacy classification denies persistence.
- No raw input may be interpolated into an exception; errors are categorical.

## Declared Deletions

None. C-10 is additive: the Phase 9 DEV projection modules, their tests and the
existing private artifact store are retained. The existing DEV-scope assertion
that a key literal appears in `nightwatch.semantic-projection.v1` serialization
is RE-SCOPED in place (explicitly DEV-only) rather than deleted, and the
production cone is proven separately to forbid it.
