# Phase 23 — Executable CI Gate Unification, Clean-Checkout Qualification, and Conditional Contained DEV Acceptance

Status: FROZEN INTENT
Task ID: phase-23-executable-ci-dev-acceptance
Phase: 23-EXECUTABLE-CI-DEV-ACCEPTANCE
Authorization class: PHASE_23_CI_GATE_RECOVERY_AND_BOUNDED_DEV_ACCEPTANCE_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Objective

Replace the historical hand-maintained GitHub Actions matrix with one
versioned, deterministic, privacy-safe Nightwatch quality gate shared by
local qualification, a disposable clean checkout, GitHub Actions, and the
pre-DEV authority check. Restore trustworthy exact-head CI observability and,
only if every executable gate passes, exercise exactly one bounded Phase 22
DEV campaign with freshly derived source and manifest identities.

Phase 19, Phase 20, Phase 21, and Phase 22 are terminal historical records.
This task is additive and must not reopen, rewrite, or relabel them.

## Starting authority

Bootstrap starts from synchronized `main` at:

`ac3df00195eef846a8e9e42615e90b4b912877d2`

The current implementation and executable safety model outrank this frozen
intent. The permanent owner decision remains
`FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.

## Authorized scope

- additive Nightwatch quality-gate specification, fixed command registry,
  runner, inventory, receipts, CI classifier, and pre-DEV authority logic;
- deterministic semantic compatibility manifest and Phase 9–23 entry point;
- read-only workflow simplification and static workflow/gate parity checks;
- disposable clean-checkout and Linux-equivalent local qualification;
- bounded Nightwatch-owned loopback proxy port/process lease hardening;
- read-only source freshness re-discovery and source-proof re-admission;
- owner-only DEV auth structural readiness checks without copying or printing
  secrets;
- a freshly generated metadata-only manifest and no-contact dry run;
- exactly one serial bounded DEV campaign only after `READY_FOR_DEV`.

## Prohibited scope

No NEXT or production contact, mutation, database/datastore access, cloud or
infrastructure archaeology, sibling writes, publication, messaging, AI or
self-development authority, unbounded crawling, arbitrary routes/selectors,
credentials, raw authenticated evidence, screenshots, traces, DOM/raw-body
persistence, storage-state copying, or CI bypass. Unknown operation classes
fail closed before executor callbacks. GitHub billing/platform failures are
classified as external execution blocks and are never worked around in
repository code.

## Required outcomes

1. `nightwatch.quality-gate.v1` is data-only, versioned, digestible, and uses
   fixed code mappings; unknown groups and command keys fail closed.
2. Local, clean-checkout, and Actions execution invoke the same gate runner;
   `.github/workflows/hardening.yml` is an environment bootstrap plus
   `npm run gate:ci`, with no authenticated product execution or evidence
   upload.
3. A stable `test:semantic-compat` command covers the current Phase 9–23
   compatibility cone exactly once per authoritative test file, with a
   regression proving current phases cannot silently disappear.
4. Inventory tooling measures old and new command/file duplication and
   requires reason codes for intentional historical repetition.
5. Safe `nightwatch.quality-gate-receipt.v1` receipts include exact head,
   lockfile digest, environment class, group results, bounded counts, and a
   deterministic receipt identity without secrets or raw logs.
6. Clean-checkout qualification proves no node_modules reuse, `npm ci
   --ignore-scripts`, clean Git state, sanitized environment, and verified
   process teardown. Port leases prevent unrelated local runs from sharing a
   fixed proxy port.
7. External CI classification distinguishes genuine execution from
   `steps=[]`/billing-platform blocking, and pre-DEV authority requires the
   exact current head, gate digest, executed required jobs, and green results.
8. Phase 22 source candidates are freshly re-evaluated and a new Phase 23
   manifest identity is generated; the historical Phase 22 manifest is never
   executable authority.
9. The terminal state is truthful: either one bounded DEV campaign completes
   after `READY_FOR_DEV`, or the task closes with a precise blocked state and
   zero DEV observations.

## Hard bounds for the optional DEV campaign

- maximum targets: 3;
- exactly one FIRST plan per target;
- at most one fresh-context replay per target;
- maximum contexts: 6;
- retries, mutations, NEXT contacts, production contacts, and dynamic target
  discovery: 0;
- one serial launcher invocation, with no exploratory expansion after a
  finding.

## Terminal alternatives

- `COMPLETE_DEV_ACCEPTANCE` — exact current Actions gate executed green and
  the single bounded DEV campaign completed safely;
- `COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI` — all local/clean qualification is
  complete but Actions is externally blocked before execution;
- `BLOCKED_AUTH`, `BLOCKED_SOURCE_DRIFT`, or `BLOCKED_SAFETY_GATE` — the
  corresponding mandatory pre-DEV gate fails after CI execution.

No local green result substitutes for external CI, and zero synthetic or
real findings never proves a product-wide absence of bugs.
