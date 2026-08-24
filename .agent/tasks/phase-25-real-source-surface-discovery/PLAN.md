# Phase 25 Living Plan

Task ID: phase-25-real-source-surface-discovery
Phase: 25-REAL-SOURCE-SURFACE-DISCOVERY
Authorization class: PHASE_25_REAL_SOURCE_SURFACE_DISCOVERY_LOCAL_SOURCE_SYNTHETIC_ONLY
Status: IN_PROGRESS
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Make approved source intelligence materially more useful without weakening
mechanical proof: safely inventory bounded source files, reuse existing
analyzers, derive route/contract evidence and exact joins, bridge safe
descriptors into Phase 24, and expose a local explainable review queue.

## Starting State

- Starting synchronized `main` SHA: `7beb18689cf2cd50d1d5383b34f51c2789cd0a54`.
- Phase 24 is terminal at `COMPLETE_LOCAL_BLOCKED_EXTERNAL_CI` and remains
  historical; its pure source-analysis adapter consumes caller-fed
  descriptors and is the integration authority.
- Existing Phase 20 analyzers, graph, cache, source expectation boundary, and
  Phase 24 portfolio/invalidation/selection are reused.
- The required prerequisite audit found source symlink escape, packed-ref
  misresolution, unsupported Git shapes, unsound TS range recognition, and
  serialized-length drift classification risks.

## Scope

M0–M14 below, limited to local/source/synthetic implementation and durable
tests/docs. The first approved universe is the existing source/registry scope;
unknown source remains a visible exclusion.

## Non-Goals

DEV/NEXT/production contact, auth reads, Alphaus writes, data/infrastructure
work, external publication, new execution authority, AI semantic authority,
generic parsing, and historical task rewrites.

## Safety Constraints

The permanent owner freeze, Phase 9/10 source admission rules, Phase 20
category-only projections, Phase 23 unified gate, and Phase 24 fail-closed
eligibility remain authoritative. All source access is bounded, no-follow,
read-only, regular-file-only, and source-text ephemeral.

## Architecture / Approach

1. Harden the single sibling-source module and prove supported `.git` shapes.
2. Add a data-only scan contract and a bounded snapshot inventory API with
   content-aware identity and operation counters.
3. Adapt inventory files to existing language analyzers; repair range and drift
   proof semantics before accepting wider output.
4. Add fixed route/operation evidence, mutation/read-only classification,
   request/response contract identities, exact cross-file joins, and a narrow
   evidence graph.
5. Convert only sufficiently proven surfaces to Phase 24 inputs, then reuse
   Phase 24 selection/invalidation and existing campaign intelligence.
6. Add local JSON/human review commands, adversarial matrices, cache tests,
   offline synthetic E2E, docs, compatibility registration, and full gates.

## Milestones

- M0 — bootstrap, topology verification, task activation, architecture seam
  audit. Status: COMPLETE.
- M1 — source-boundary security and Git-currentness hardening. Status: COMPLETE.
- M2 — versioned scan configuration and deterministic bounded inventory.
  Status: COMPLETE.
- M3 — analyzer integration and proof-soundness regression suite. Status:
  COMPLETE.
- M4 — route/operation discovery and evidence-backed read-only classification.
  Status: COMPLETE.
- M5 — request/response contracts and exact cross-file joins. Status:
  COMPLETE.
- M6 — source evidence graph and shape-aware contract drift. Status:
  COMPLETE.
- M7 — direct Phase 24 portfolio integration and runtime correlation. Status:
  COMPLETE.
- M8 — incremental invalidation, semantic lifecycle projection, and review
  priority. Status: COMPLETE.
- M9 — local review queue/operator explain surface and provenance routing.
  Status: COMPLETE.
- M10 — adversarial corpus, privacy, determinism, cache, and performance
  hardening. Status: COMPLETE.
- M11 — synthetic source-to-portfolio campaign integration. Status:
  COMPLETE.
- M12 — compatibility, quality gate, clean Node 20, and hardening closure.
  Status: IN_PROGRESS.
- M13 — fresh canonical and topology-correct isolated full regressions,
  repair, and parity. Status: NOT_STARTED.
- M14 — one exact-head Actions observation, durable docs, terminal closure,
  synchronized main. Status: NOT_STARTED.

## Validation Strategy

After each milestone: focused tests, typecheck where shared source changes,
hardening/compatibility cone, exact `STATE.md` update, then a validated direct
`main` checkpoint. Final commands include `npm run typecheck`,
`npm run hardening:check`, `npm run test:semantic-compat`,
`npm run campaign:synthetic`, `npm run test:owner-provenance`,
`npm run gate:local`, `npm run gate:clean`, `npm run agent:check`, and
`npm run project:check`, followed by the fresh canonical/isolated regressions.

## Decision Log

- M0: the current clean synchronized `main` is the only development
  authority; no feature branch or temporary development branch is created.
- M0: Phase 24 remains immutable history; Phase 25 extends its source adapter
  and consumes its portfolio rather than creating a parallel planner.
- M1: source access will support only explicitly validated `.git` directory,
  safe `.git` indirection, loose refs, packed refs, and detached HEAD. Any
  unsupported or unsafe shape fails closed.
- M1: same source SHA never makes a scan current by itself; inspected-content
  digests and config/analyzer versions participate in identity.
- M2: scan configuration accepts only fixed language extensions, analyzer
  identifiers, excluded-directory values, and bounded relative roots; no
  executable patterns or shell commands are represented.
- M2: inventory content identity is a full digest of the exact text read after
  metadata enumeration, so dirty same-SHA edits cannot reuse the prior result.
- M3: TS validation ranges are admitted only for the two mechanically proven
  outward guard forms; reversed, ambiguous, and unsupported operators remain
  rejected. Contract drift now compares supported shapes semantically rather
  than using serialized-size differences.
- M4: route discovery is fixed-pattern and source-only; safe structural
  handler identities are allowed, while source text remains ephemeral. Only
  exact current runtime bindings plus existing Phase 24 proof fields can
  qualify a candidate, and deployment equivalence remains unresolved.
- M5: cross-file joins resolve only exact allowlisted paths and exactly one
  declared symbol. Missing, multiple, stale, outside-scope, and unsupported
  references remain visible and non-authoritative; request/response schema
  files are accepted only through fixed static forms.
- M6: the existing semantic lifecycle graph now accepts additive source
  lineage nodes and stable route/handler/contract/runtime/replay/dossier edge
  reasons. The original Phase20–24 graph is byte-compatible when no Phase25
  surfaces are supplied.
- M7: extracted surfaces invoke the existing Phase24 source-snapshot adapter,
  portfolio builder, and selector directly. No Phase25 portfolio or planner is
  introduced; runtime correlation remains source/runtime evidence only and
  deployment equivalence stays unresolved.
- M8: source change reports compare bounded inventory and stable surface keys,
  while candidate state remains delegated to the Phase24 invalidation ledger.
  Any changed source SHA/evidence now invalidates dependent replay and dossier
  assumptions, including same-SHA inspected-content changes.
- M9: the review queue carries Phase24 rank/score plus deterministic proof,
  runtime, semantic-depth, replay, component, and source-change factors. These
  factors explain priority but cannot override Phase24 eligibility.
- M10: route duplicate detection is global across the bounded inventory;
  dynamic/ambiguous routes remain non-authoritative. The extraction cache is
  bounded and keyed by configured analyzer identity plus exact inspected
  snapshot digest, never by Git SHA alone.
- M11: the synthetic campaign proves source snapshot → extraction → Phase24
  portfolio → semantic evaluation → replay/dossier construction → no-contact
  rehearsal with zero network, auth, mutation, or raw-source persistence.

## Discoveries

- `resolveGitHead()` currently selects the first packed `refs/heads/*` line
  instead of the exact HEAD ref and does not safely handle all `.git` shapes.
- `createSiblingSourceAccess()` uses lexical confinement and follows file,
  directory, and repository-root symlinks.
- `TS_VALIDATION_RANGE` currently treats operator positions as lower/upper
  bounds without proving the guard's semantic orientation.
- `src/core/semanticCoverage/discovery.ts` currently compares serialized shape
  lengths for expansion/narrowing.
- A lower-cost worker bridge was installed but its run failed with
  `CONFIGURATION_ERROR: unable to determine Kimi version`; no worker finding
  is treated as evidence, and the main agent retains the audit authority.

## Deferred Work

Contained DEV acceptance, external CI recovery, unsupported dynamic routes,
deployment equivalence, infrastructure/data-layer operations, and any source
surface lacking mechanical proof remain deferred or excluded with explicit
reason codes.

## Completion Criteria

All applicable acceptance rows are proven with exact local evidence; no
Critical/High regression remains; the unified gate, clean checkout, fresh
canonical/isolated parity, continuity/project checks, and privacy review pass;
one exact-head Actions observation is classified truthfully; final task/docs
are closed; and `main` is clean with `HEAD == origin/main`.
