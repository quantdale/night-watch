# C-10 Production Privacy Firewall

## Purpose

Nightwatch's current privacy boundary is a denylist: `RedactionLayer` scrubs
known-sensitive headers/params after observation, and `assertPrivatePayload`
sentinel-screens at the store boundary. That is adequate for DEV fixtures and
wrong in kind for production, where the sensitive material is *ordinary-looking
business values* — an account id, an invoice number, a cost figure, a company
name. After C-10, raw production bytes are structurally incapable of reaching
persistent artifacts: an allowlisted structural projection with no persistence
authority is the only route, and a second independent firewall re-validates at
the durable write.

## Starting State

- Task ID `nightwatch-production-privacy-firewall-c10-v1`.
- Starting SHA `a152889a71eec6c67d82b05e5984df6423fe88d4` (verified
  `origin/main` at campaign start; canonical checkout clean).
- Predecessor `nightwatch-exact-head-ci-baseline-repair-v1` COMPLETE at
  validated implementation `b99ce4e61166e52b554dd6ac07b7678b433959da`.
- C-06 COMPLETE and fail-closed; not touched by C-10.

Established facts that must NOT be rediscovered:

- `src/oracles/projections/types.ts` defines `ProjectionField { name, node }`.
  `serializer.ts` writes that raw `name` into canonical bytes, and
  `projectionDigest` hashes those bytes. **This is F-14 and F-15 in code**: the
  only digest family in the repository ingests unproven dynamic key literals.
- `identity.ts` `ProjectionContext` already maps raw values to *encounter-order*
  tokens (`entity#0001`), not hashes, and refuses `JSON.stringify`. This is a
  sound foundation for ephemeral value correlation and is reused, not replaced.
- `src/browser/context.ts` uses `browser.newContext()` only; there is no
  `launchPersistentContext` or `userDataDir` anywhere. F-17's verified finding
  holds: contexts are already ephemeral. The residual is during-session and
  crash-path residue.
- `runRecorder.ts` `authenticated` mode already suppresses screenshots and
  minimizes URLs/messages. It is a *mode*, not a production invariant.
- `findingsAuthority.ts:321` resolves the root through `privateArtifactRoot()`
  with no caller input; `createFindingsAuthorityForTests(root)` at line 327
  accepts an arbitrary root. F-18's "correct by accident" is exactly this.
- `bin/hardening-check.mjs` `checkPhase9SemanticCorePurity()` already walks
  `src/oracles/projections/` and greps for fs/net/process capability. Any new
  pure cone must follow that idiom and must not break it.
- `npm run handoff:check` requires TRACKED regular OpenSpec `audit.md`,
  `proposal.md`, `design.md`, `tasks.md` and >= 1 `specs/*/spec.md`, plus a real
  `main`-ancestor `Planned-From`.

## Scope

The eleven workstreams A-K of the campaign brief, plus the five `design.md
§6.5` acceptance classes and a deterministic persistence audit. Authoritative
enumeration lives in `SPEC.md`; it is not restated here to avoid two competing
copies of frozen intent.

## Non-Goals

No C-11 `PROD_OBSERVE`, no C-12/C-13/C-14, no production observation or
connectivity, no addition of production to `SUPPORTED_ENVIRONMENTS`, no loadable
`config/environments/production.json`, no weakening of C-06, no rewrite of the
Phase 9 DEV semantic projection, and no population of the production store from
any real environment.

## Safety Constraints

C-00 holds — implementation only in the owned session worktree. No `test.skip`,
no weakened privacy assertion, no removed failing test, no suppressed error, no
limit raised merely to pass, no retry to hide nondeterminism, no regex-only key
allowlist, no hash of a raw customer id presented as anonymization, and no
persisted salted hash of an enumerable field. Redaction stays defence in depth.
An `UNKNOWN` privacy classification denies persistence. Errors are categorical
and never interpolate raw input. Zero DEV/NEXT/production contact.

## Architecture / Approach

Two new module trees with a hard capability split:

| Tree | Capability | Contents |
|---|---|---|
| `src/core/prodPrivacy/**` | **PURE.** No fs, no net, no process, no publication. Import-isolated by `hardening:check`. | policy, key vocabulary, production projection types, projector, canonical serializer + structural digest, safe-evidence builder, parameter provenance |
| `src/core/prodEvidence/**` | Persistence. May touch fs. Accepts only `SAFE_PRODUCTION_EVIDENCE`. | persistence firewall, production findings store, persistence audit, browser-profile residue policy |

The DEV Phase 9 projection (`nightwatch.semantic-projection.v1`) is left
untouched: it is load-bearing for Phase 9/9A.1/10/10A admission,
`semanticStateEquals`, path-based expectations and dossier semantic evidence.
C-10 adds the versioned production sibling
`nightwatch.production-projection.v1`. This is the §19 "versioned replacement"
answer and the §18 "DEV projection compatibility may remain where safe" rule.

Three distinct types carry the boundary:

- `RAW_EPHEMERAL` — a call-scoped reader over raw bytes. Never stored.
- `SAFE_STRUCTURAL_PROJECTION` — allowlisted structural nodes; MAY carry
  ephemeral encounter tokens for in-memory correlation.
- `SAFE_PRODUCTION_EVIDENCE` — the only persistable DTO. Carries NO encounter
  token, NO numeric ref, NO key literal that is not source-proven.

Key provenance (F-14) is a contract, not a heuristic:

- `ProvenKeyVocabulary` — a frozen value object: finite key set + provenance
  class + provenance digest, constructed OUTSIDE the pure cone and passed
  call-scoped, so the cone never imports a schema loader (which would break
  import isolation).
- Per-object key classification: `ALL_SOURCE_PROVEN` /
  `BOUNDED_DYNAMIC_KEY_COLLECTION` / `MIXED` / `UNRESOLVED`.
  `UNRESOLVED` denies persistence.
- A dynamic key contributes cardinality and its value's structure only.

Digest families (F-15) are named so they cannot be merged:

- `prodstruct:sha256:<24>` — production STRUCTURAL digest. Unsalted,
  deterministic, cross-campaign comparable. Ingests type, shape, cardinality,
  source-proven key literals and key-provenance class ONLY. Never a value,
  never an unproven key literal, never an encounter token or numeric ref.
- No durable value digest exists. The concept is REMOVED from the production
  persistence contract rather than invented, per the brief's explicit
  instruction. Ephemeral encounter tokens cover in-analysis correlation.

## Milestones

### M0 — Records and OpenSpec — Status: IN_PROGRESS
Objective: truthful task records and a dedicated OpenSpec change carrying the
Workstream A audit.
Files: `.agent/tasks/nightwatch-production-privacy-firewall-c10-v1/*`,
`openspec/changes/nightwatch-production-privacy-firewall-c10-v1/*`.
Acceptance: `npm run agent:check`, `npm run handoff:check` pass with the
OpenSpec change tracked.

### M1 — Workstream A persistence-cone audit — Status: NOT_STARTED
Objective: the complete data-flow graph, classified, in `audit.md`.
Acceptance: every enumerated class from the brief §5 appears with a
classification and a named code path; zero `UNKNOWN` left unresolved without an
explicit fail-closed disposition.

### M2 — Pure cone: policy, key vocabulary, types — Status: NOT_STARTED
Objective: `ProductionPrivacyPolicy` (versioned, fail-closed construction),
`ProvenKeyVocabulary`, and the production projection DTO vocabulary.
Acceptance: focused unit suite; `typecheck`.

### M3 — Production projector (F-14) — Status: NOT_STARTED
Objective: raw -> `SAFE_STRUCTURAL_PROJECTION` with key provenance.
Acceptance: sentinel key proven present in raw input and absent after the
boundary; property/totality corpus green.

### M4 — Serializer + structural digest (F-15) — Status: NOT_STARTED
Objective: canonical production serialization and `prodstruct:sha256:`.
Acceptance: digest privacy suite — stability, value-insensitivity, key-literal
exclusion, no salt, no durable value digest, families not interchangeable.

### M5 — Safe evidence DTO + persistence firewall (D, F) — Status: NOT_STARTED
Objective: `SAFE_PRODUCTION_EVIDENCE` builder and an INDEPENDENT re-validating
firewall at the durable-write boundary.
Acceptance: firewall rejects every denylisted class with categorical codes and
zero raw interpolation.

### M6 — Production artifact root (G) — Status: NOT_STARTED
Objective: `$HOME/.nightwatch/prod-findings/` store, separate policy identity,
0700/0600, symlink-refusing, atomic, bounded.
Acceptance: synthetic store suite against an INJECTED temp root; the default
root is asserted to RESOLVE correctly without being created.

### M7 — Control Center exclusion (H, K) — Status: NOT_STARTED
Objective: resolved-path-equivalence rejection of the production root in both
the normal authority and the test seam, plus SSE projection safety.
Acceptance: DEV findings still work; production-root injection rejected;
symlink/path-equivalence tricks fail; hardening invariant added.

### M8 — Console, screenshots, traces, browser profile (I) — Status: NOT_STARTED
Objective: production-specific invariants, not accidental consequences of
authenticated mode; ephemeral profile controls and crash-path cleanup.
Acceptance: planted console sentinel absent from all durable outputs;
enabling a production screenshot or trace is a contract failure.

### M9 — Parameter provenance (J) — Status: NOT_STARTED
Objective: opaque-handle privacy model + validators + synthetic proof. No
production request execution path.
Acceptance: no value in logs, budget keys, replay fingerprints, checkpoints,
errors, receipts or persisted URL; route-template URL identity.

### M10 — Import isolation + acceptance suite + persistence audit — Status: NOT_STARTED
Objective: `hardening:check` rule for the pure cone; all five §6.5 classes;
deterministic persistence audit over every permitted root.
Acceptance: audit reports bounded counts and zero categorical violations.

### M11 — Full validation and integration — Status: NOT_STARTED
Objective: the complete §21 command set, then integration and an exact-head
GitHub Actions result.
Acceptance: all eleven gate groups PASS at the exact head.

## Validation Strategy

Per milestone: the focused suite + `npm run typecheck` + `npm run hardening:check`.
Before completion, in this order (cheap fail-closed checks first):
`typecheck`, `hardening:check`, `handoff:check`, `project:check`, `agent:check`,
`agent:audit`, `gate:inventory`, `test:semantic-compat`, `campaign:synthetic`,
the C-10/projection/evidence/Control-Center/browser suites, the complete
canonical Playwright regression, `gate:local`, `gate:clean`, then integrate and
obtain exact-head CI.

Tests inject disposable roots. No test writes to the real
`$HOME/.nightwatch/prod-findings/` or the real workspace root.

## Decision Log

- **2026-09-02 — D-C10-1: additive versioned production projection, not a v1
  rewrite.** Reason: `ProjectionField.name` is load-bearing for `shape.ts`,
  `semanticStateEquals`, path-based expectations, `TYPE_IN_SET` and the PHP
  row-key contracts; rewriting v1 ripples into Phase 9/9A.1/10/10A admission and
  the canonical regression. Evidence: `src/oracles/projections/shape.ts`,
  `serializer.ts`, `bin/hardening-check.mjs` Phase 9/10 checks. Consequence:
  `nightwatch.semantic-projection.v1` is explicitly re-scoped as the DEV
  projection; the production cone is a separate versioned sibling.
- **2026-09-02 — D-C10-2: no durable value digest in the production
  persistence contract.** Reason: brief §7 requires removing the concept if not
  actually required; nothing in C-10 needs durable value correlation, and any
  such digest over an enumerable domain (account id, `YYYYMM` period) is
  invertible. Consequence: only `prodstruct:sha256:` may be persisted;
  correlation is ephemeral encounter tokens, campaign-scoped, never persisted.
- **2026-09-02 — D-C10-3: tracked design text is SUPERSEDED, not silently
  contradicted.** `design.md §6.2/§6.4` specify a per-campaign salted digest;
  independent-review F-15 / MA-11 / UA-11 supersede that as a direct internal
  contradiction. Per the AGENTS.md precedence rule the disagreement is recorded
  and the stale durable document updated, never silently reconciled.
- **2026-09-02 — D-C10-4: the key-vocabulary resolver is INJECTED.** Reason:
  the F-14 proof sources (C-02a OpenAPI `definitions`, `PHP_FUNCTION_LIST_ROW_KEYS`)
  live behind fs-touching loaders; importing them into the projection cone would
  break Workstream E import isolation and the existing Phase 9 purity check.
  Consequence: `ProvenKeyVocabulary` is a frozen value object constructed
  outside the cone and passed call-scoped.

## Discoveries

Recorded as they are found; see `STATE.md` for the live list.

## Deferred Work

Recorded as found; C-11 through C-14 remain out of scope by construction.

## Completion Criteria

Every item in the campaign brief §22 is true, with receipts: F-14 and F-15
resolved, raw values structurally unable to enter persistent production
evidence, the cone import-isolated, the persistence boundary independently
validating, the production root distinct and owner-only, Control Center
structurally excluded, production console/screenshots/traces impossible,
temp/profile/crash residue covered, the opaque-handle parameter model in place,
SSE proven non-bypassing, all five acceptance classes and the persistence audit
green, full regression + local gate + clean Node 20 gate + exact-head GitHub CI
green with all eleven groups PASS, truth records updated, canonical checkout
clean, `origin/main` synchronized, session released, and zero environment
contact.
