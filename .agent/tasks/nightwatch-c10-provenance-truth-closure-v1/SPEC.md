# SPEC.md

**Task:** nightwatch-c10-provenance-truth-closure-v1
**Campaign:** C-10.5 — Provenance and Project-Truth Closure
**Objective:** Bind the C-10 production privacy vocabularies mechanically to
genuine source evidence, and reconcile repository project-state truth, so that
C-11 `PROD_OBSERVE` may rely on C-10 as a real prerequisite rather than on a
self-asserted provenance label.

**Frozen intent.** This is NOT a reopening of C-10's privacy architecture. The
structural projection boundary, the persistence firewall, the two digest
families and the Control Center exclusion all stand as C-10 landed them. This
campaign closes the residual AUTHORITY gap (a provenance label was sufficient
to mint a production-safe vocabulary) and the residual PROJECT-TRUTH gap (the
machine-checked project-state baseline still named a predecessor ancestor).

This campaign grants no production connectivity and does not implement C-11.

## Scope

- **Workstream A (A2)** — reproduce and record the residual provenance
  weakness as an executable synthetic negative test before repairing it.
- **Workstream B (A3)** — define the provenance authority model: explicit
  validated source-evidence capability types, replacing generic unbranded
  `{ provenanceClass, digest, values }` authority.
- **Workstream C (A4/A5)** — trusted adapters deriving route and key
  vocabularies from C-02a source intelligence, PHP route evidence and
  repository-owned fixed contracts. The provenance digest is COMPUTED from the
  validated evidence; no caller-supplied digest grants authority.
- **Workstream D (A6)** — capability forgery resistance, unforgeable at
  runtime rather than by TypeScript branding alone, including refusal of
  shape-matching JSON revival and refusal of test-seam capabilities in the
  production authority path.
- **Workstream E (A7)** — canonical binding of provenance identity to source
  identity, evidence class, source checkpoint, vocabulary contents, vocabulary
  version and completeness/currentness state, with intentional permutation
  semantics.
- **Workstream F (A8)** — preserve C-10 import isolation: the derivation
  adapter sits OUTSIDE `src/core/prodPrivacy/**`; the pure cone consumes only
  the resulting validated capability.
- **Workstream G (A9)** — reconcile `docs/CURRENT_STATE.md` live anchors to
  the checkpoint each field actually claims.
- **Workstream H (A10)** — strengthen `bin/project-state-check.mjs` to detect
  a mutually consistent but globally stale baseline, via an explicit
  cross-authority invariant against `.agent/ACTIVE_TASK.md`, without network
  access and without circular truth.
- **Workstream I (A11/A12)** — reconcile the C-10 certification numbers and
  the master-plan digest semantics.
- **Workstream J (A13)** — institutionalize persisted-POSITION sentinel
  coverage so a future free-form persisted field cannot be added without
  privacy coverage.

## Non-Goals

- No change to the C-10 projection algebra, firewall reasons or store layout
  beyond what provenance binding requires.
- No attempt to increase `READ_ONLY_PROVEN`; C-06 is not touched.
- No production, DEV or NEXT contact; no credential or auth-state inspection.
- No sibling-repository write; siblings remain read-only.
- C-11 `PROD_OBSERVE` is NOT started in this task.

## Safety Constraints

Repository-local and synthetic-only. All implementation happens in the owned
session worktree `session/nightwatch-c10-provenance-truth--ba3470bc`; the
canonical checkout is never used for implementation. Synthetic sentinels only —
no real customer identifier appears in any test or record.

## Completion Criteria

The A15 Stage-A completion gate in full: mechanically derived vocabularies,
computed provenance digests, content and source binding, fail-closed
incompleteness, test seams excluded from production authority, cone import
isolation retained, reconciled `CURRENT_STATE` anchors, a validator that
catches stale-baseline substitution, reconciled C-10 counts and digest
semantics, mechanically enforced persisted-field coverage, zero-failure full
regression, `gate:local` PASS, `gate:clean` PASS, exact-head CI PASS with all
eleven required groups, clean canonical checkout and synchronized `origin/main`.
