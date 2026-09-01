# Proposal — Nightwatch Production Observability & System Map Master Plan

## Why

Nightwatch is safe, deeply hardened, and almost blind.

A fresh whole-system audit executed on 2026-09-01 starting at `HEAD 784d553` (local `main` advanced
to `54df439` mid-session under a concurrent predecessor-task closure; no
measurement below depends on that advance)
measured what Nightwatch actually understands about the Alphaus system, using
Nightwatch's own read-only scanner rather than its documentation:

- The workspace holds **148 company repositories** (55 `alphauslabs/`, 93
  `mobingilabs/`); **46** have 2026 commits. Nightwatch's approved source
  universe is **6** repositories (`src/core/source/approvedScan.ts:11-16`).
- Of those 6, exactly **one** repository produces any operation at all. The
  live `campaign:eligibility-census` reports **128 operations, 100 % from
  `mobingilabs/ripple-api`, 100 % route-language `YAML`, handler language PHP
  for 126 of 128**. Go, protobuf, TypeScript and Vue contribute **zero**
  operations despite being scanned.
- `mobingilabs/ripple-api/src/App/Route/Config/Routing.yaml` declares **223**
  `"METHOD:/path"` route keys. Nightwatch admits **128** and silently drops
  **95** at `MAX_DISCOVERED_OPERATIONS = 128` (`src/core/source/surfaces.ts:59`).
  The `routeOperationsTruncated` counter exists (`surfaces.ts:818,836,875`) but
  is surfaced by **no** CLI, Control Center contract, ledger, or document.
- `alphauslabs/blueapi` — an **already approved** repository — declares **599
  RPCs**, every one carrying `option (google.api.http)` with an explicit
  `get`/`post`/`put`/`delete`/`patch` binding (189 GET). Nightwatch reads
  **zero bytes** of it: `.proto` is absent from `SOURCE_SCAN_EXTENSIONS`
  (`src/core/source/scanTypes.ts:18`), so its single approved-root file is
  rejected `SOURCE_LANGUAGE_UNSUPPORTED`.
- Only **5 of 128** operations are `PROVEN_READ_ONLY`, and the proof is not
  source-derived: `readOnlyClassification` (`surfaces.ts:156-162`) requires a
  match against `PHASE5_API_CATALOG`, an **11-entry hand-written catalog**.
  There is no mechanical read-only proof family at all.
- The end-to-end runtime footprint is **3 journeys, 11 catalog operations,
  9 exploration actions, 1 product, 1 environment (DEV)**.
- Truthful yield to date: **zero product findings**. The last campaigns
  terminated `SOAK_COMPLETE_PRODUCT_CANDIDATES_REPLAY_INCONCLUSIVE` and
  `REPLAY_SOURCE_FRESHNESS_UNCONFIRMED`.

Meanwhile the evidence needed to fix this is already on local disk and unread:
`blueapi`/`blueinternal` HTTP-annotated protos (662 RPCs), `ouchan`'s
`services-catalog/SERVICES.md` (131 services) and 17 `Register*Server` sites,
`ripple-ui`'s `src/config/common.js` environment matrix plus ~150 `vuex/api`
modules of literal API paths, `ouchan`/`ripple-openspec` OpenSpec corpora
(**≈350 `Requirement:` and ≈820 `Scenario:` blocks** of WHEN/THEN product
behaviour), and CI configs that mechanically bind every sampled repository to
an `ouchan/services/<name>` deployment and a `mochi-{dev,next,prod}` cluster.

Production is deliberately unsupported (D-4, `docs/ROADMAP.md:1836`). That was
correct for Phase 0/1. It is now the largest single limit on Nightwatch's
usefulness, because the product's real defects live where the customers are.

## Change

Produce the canonical, evidence-backed master plan that carries Nightwatch from
"one truncated PHP route table on DEV" to a **production-aware, read-only-first
autonomous bug-hunting observatory** with a whole-system map.

This change is **planning only**. It creates:

- `audit.md` — the whole-system evidence baseline (Nightwatch as-built +
  148-repository census, every claim provenance-bound and evidence-classed).
- `design.md` — the target architecture: the whole-system fact model,
  `PROD_OBSERVE`, the privacy firewall, System Map V2, the coverage ledgers and
  the bug-hunting pipeline, with alternatives considered and rejected.
- `docs/design/PRODUCTION-OBSERVABILITY-THREAT-MODEL.md` — 34 hazards with prevention / detection / containment /
  evidence / recovery / required test.
- `docs/design/PRODUCTION-OBSERVABILITY-MASTER-PLAN.md` — the canonical dependency-ordered implementation programme:
  gap matrix, 15 campaigns, critical path, parallelism, and the hard
  production-readiness gates.
- `tasks.md` — the campaign decomposition future sessions execute from.
- `specs/` — requirement deltas for the three new capabilities
  (`prod-observe`, `whole-system-map`, `coverage-ledger`).

## Expected result

A future frontier or coding agent can open `docs/design/PRODUCTION-OBSERVABILITY-MASTER-PLAN.md`, pick campaign
`C-01`, and begin implementing without rediscovering the project — and can
prove, before any production request is ever issued, that every gate in
`§ Readiness gates` is satisfied.

The plan's load-bearing conclusions are:

1. The bottleneck is **not** safety and **not** oracle depth. It is **source
   reach and read-only proof**. Both are fixable with bounded, deterministic,
   parser-backed analysis of evidence already on disk.
2. Production observation should be built as a **separate authorization class
   and separate executable mode** (`PROD_OBSERVE`), never as a fourth entry in
   the existing environment allowlist.
3. Read-only status must become a **mechanically proven, source-bound,
   two-witness property** — never an HTTP-method inference and never a
   hand-curated catalog.
4. Privacy must move from **denylist scrubbing after observation** to
   **allowlist structural projection before persistence**, enforced by a
   process boundary that raw response bytes cannot cross.

## Exclusions

No implementation. No Nightwatch source, test, safety-rule, allowlist,
environment-config or authentication change. No production enablement. No DEV,
NEXT or production campaign. No HTTP request to any company service. No
authentication. No credential, cookie, token, storage-state, customer-data,
database, cloud, IAM or Kubernetes access. No modification of any company
repository. No new runtime authority of any kind is granted by this document —
`docs/design/PRODUCTION-OBSERVABILITY-MASTER-PLAN.md` describes work that remains **NOT AUTHORIZED** until each
campaign receives its own explicit owner authorization.
