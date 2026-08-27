# Durable Artifact + Control Center Truth Hardening

## Purpose

Repair reproduced durable-artifact validation and whole-dossier currentness
authority gaps while preserving historical valid artifacts, privacy, safety,
and the existing authority graph.

## Starting State

- Task: `nightwatch-durable-artifact-and-control-center-truth-hardening-v1`
- Starting SHA: `42ea9723c10f60cc02c663748c493c6c34f73116`
- Planned-from: `49034831377f243054261361b4d1a7d783c0fc4f`; the intervening
  change is planning-only documentation/OpenSpec content and is reviewed.
- Relevant owners: `src/core/artifactValidation/` and triage dossier
  validators own durable acceptance; findings authority owns sanitized
  metadata; adapter projects metadata; snapshot coordinator owns generation
  lifecycle; existing semantic validators remain their own authorities.
- Established boundaries: LOCAL / SOURCE / SYNTHETIC only, owner-frozen
  infrastructure/data layer, no external contact, no sibling writes.

## Scope

Fresh all-file audit; v1/v2 dossier mutation reproduction and strict runtime
validation; artifact-facade identity audit; bounded mutation audit of all
registered durable artifact kinds; one conservative findings currentness
reducer; Control Center authority/adapter differential and corruption proof;
full local and clean acceptance; truthful continuity/report/project closure.

## Non-Goals

Browser/product execution, DEV/NEXT/production access, authenticated state,
cloud/data/infrastructure work, external publication, AI/provider calls,
source execution, UI redesign, new command or selector authority, broad
orchestrator refactoring, unrelated schema/version changes, and test
weakening.

## Safety Constraints

Use synthetic fixtures and repository source only. Preserve read-only sibling
access, bounded parsing/validation, exact-key frozen schemas, categorical
privacy-safe errors, no raw-value echo, no arbitrary recursive graph walk, no
network/process/database/AI/persistence authority in pure cores, and no
external mutation or publication. The campaign runtime never commits or
pushes; only this development session may create validated Git checkpoints.

## Architecture / Approach

1. Activate and baseline the task, then run a literal NUL-safe local tracked
   manifest and classify every tracked regular path. Re-review all paths
   changed since the OpenSpec planning baseline.
2. Build focused pre-fix mutation and currentness probes from canonical
   producer outputs. Record only actual FALSE_ACCEPT outcomes and preserve
   valid positive controls.
3. Implement composable bounded dossier v1/v2 validators using existing
   owners/vocabularies, exact keys where frozen, strict prototypes, safe
   identifiers/timestamps/counts, nested source/reproduction/differential/
   fault/confidence/recipe/AI-ready validation, and mechanically derivable
   cross-field checks.
4. Audit the facade validation identity and all durable read consumers. Bump
   only the owning validation identity if the changed semantics are
   load-bearing; do not change unrelated source, semantic, replay, or schema
   identities.
5. Put whole-dossier currentness in one pure authority with conservative
   precedence: empty or UNKNOWN → `SOURCE_UNAVAILABLE`, otherwise stale
   tracking reference → `SOURCE_STALE`, otherwise all non-empty members must
   be current-class for `CURRENT`. Adapters project rather than strengthen.
6. Audit every `ARTIFACT_KIND_VERSION_ACCEPTANCE` kind with bounded nested
   mutations, repair only clearly owned local false accepts, and prove the
   Control Center corrupt-store/partial-state behavior.
7. Run focused slices after each change, then the full native quality cone,
   clean Node20 gate, canonical serial enumeration, privacy/diff audits, and
   exact-head external observation only if policy requires it.

## Milestones

### M0 — Takeover, activation, and exhaustive audit

- Objective: establish current Git/toolchain identity and review every
  tracked file before implementation.
- Areas: task records, manifest, docs/OpenSpec, source/config/tests/tooling,
  changed-since-baseline diff.
- Actions: activate v2 records; run baseline gates; read/hash/classify every
  tracked regular path; record counts, bytes, lines, digest, and dispositions.
- Acceptance: reviewed == tracked; no unreviewed executable path can consume
  dossiers/currentness; baseline checkpoint is pushed or otherwise recorded.
- Validation: `npm run agent:check`, `npm run agent:audit`,
  `npm run project:check`, `npm run hardening:check`,
  `npm run quality-gate:spec`, `npm run gate:inventory`, `git diff --check`.
- Status: COMPLETED

### M1 — Pre-fix red-team reproduction

- Objective: reproduce or falsify every planner dossier mutation and
  currentness claim before production behavior changes.
- Areas: artifact validators/facade, findings authority/adapter, collector.
- Actions: canonical v1/v2 one-field mutations; both validator paths; full
  currentness truth table and permutations through both public paths.
- Acceptance: exact before results, false accepts only when accepted, valid
  historical controls retained, no source behavior edit precedes the record.
- Validation: focused artifact/currentness/Control Center suites.
- Status: COMPLETED

### M2 — Strict dossier runtime validation

- Objective: reject malformed nested v1/v2 durable dossiers at the owning
  validator and facade while preserving valid producer-built history.
- Areas: dossier validators/helpers, artifact facade, focused mutation tests.
- Actions: implement bounded exact nested validation and invariants; add
  deterministic privacy/prototype/nonmutation tests; audit version identity.
- Acceptance: every reproduced dossier FALSE_ACCEPT is rejected by both
  owning and facade validators; compatibility decisions are explicit.
- Validation: focused artifact suite, typecheck, hardening, privacy tests.
- Status: COMPLETED

### M3 — Facade-wide mutation audit and currentness convergence

- Objective: disposition every registered artifact kind and eliminate the
  duplicated optimistic currentness reducer.
- Areas: all facade validators; findings authority/adapter/metadata.
- Actions: bounded nested mutation matrix; repair clear adjacent defects;
  centralize conservative reducer; add order/parity and malformed pre-gate
  tests; preserve relevance/confidence distinction unless owning semantics
  require stricter total-evidence behavior.
- Acceptance: all kinds have producer/validator/mutation/privacy dispositions;
  mixed stale/unknown never becomes CURRENT; one reducer authority remains.
- Validation: facade-wide, Control Center, authority, adapter, server,
  snapshot, typecheck, hardening suites.
- Status: COMPLETED — `FACADE_AUDIT.json` records 14/14 canonical fixtures and
  55/55 rejected bounded mutations; the shared reducer and collector pre-gate
  passed the focused Control Center cone.

### M4 — Control Center integration and adversarial closure

- Objective: prove sanitized partial corruption/currentness/generation
  behavior and no authority/safety regression.
- Areas: findings store/collector, snapshot coordinator, server, UI boundary,
  canonical synthetic browser fixtures as applicable.
- Actions: malformed+valid store tests; generation refresh failure; source
  currentness labels; server restrictions; built UI/browser only if touched.
- Acceptance: corrupt dossier never yields a valid row; valid rows under
  explicit UNKNOWN remain sanitized; GET authoritative/SSE advisory; no new
  prohibited capability.
- Validation: Control Center tests/build/browser if applicable, campaign and
  privacy regressions.
- Status: COMPLETED — malformed JSON/value stores, malformed authority
  snapshots, generation changes, server restrictions, SSE advisory behavior,
  failed-refresh fallback, and built UI/browser qualification are covered.

### M5 — Full acceptance and terminal Git closure

- Objective: pass the current full acceptance cone, record evidence, and
  push a clean terminal checkpoint.
- Areas: quality gates, clean checkout, Playwright enumeration, task/report/
  project docs, Git and optional exact-head Actions observation.
- Actions: run native commands discovered from current package/config; repair
  every introduced Critical/High failure; update OpenSpec, STATE, REPORT,
  project docs only where durable truth changed; commit/push and verify heads.
- Acceptance: all local/clean gates pass; exact skip counts are recorded;
  safety counters are zero; terminal files agree with COMPLETE and next action
  STOP; remote equals local; tree clean.
- Validation: full prompt/OpenSpec list, `git diff --check`, final privacy
  audit, and one exact-head Actions observation at most if required.
- Status: IN_PROGRESS

## Validation Strategy

Use focused public-path reproductions before edits, then run owning validator,
facade, authority/adapter, server/snapshot, privacy, hardening, typecheck,
campaign, project, continuity, local quality, clean Node20, and canonical
serial suites after each relevant slice. Record exact pass/fail/skip totals,
receipts, and any external zero-step classification. Never treat a narrow
focused result as proof of a full-cone requirement.

## Decision Log

- 2026-08-27 — Activated a fresh task at live `42ea9723c10f…` because the
  pulled execution prompt is a new campaign; preserved the completed
  source-proof task as immutable history.
- 2026-08-27 — Kept all work LOCAL / SOURCE / SYNTHETIC under the permanent
  owner freeze; the OpenSpec explicitly forbids external and authority-expanding
  actions.

## Discoveries

- The requested pull advanced `main` from `4903483` to `42ea972`; the
  intervening diff is the new planning handoff/OpenSpec documentation only.
- Current prompt is implementation-not-started and requires fresh audit,
  reproduction before fixes, and a new continuity-v2 task.

## Deferred Work

Browser DNS/L6, source-proof expansion, broad orchestrator refactoring, and
all owner-frozen or separately authorized external work remain deferred.

## Completion Criteria

All OpenSpec task groups have evidence-backed completion; every registered
artifact kind has a bounded mutation disposition; reproduced dossier false
accepts are fixed; conservative currentness is owned once and integrated
through Control Center; full local and clean acceptance passes; safety vectors
are zero; task/project/docs truth is coherent; final validated checkpoint is
pushed to `origin/main`, confirmed equal to local `HEAD`, and the terminal
next action is STOP.
