# Phase 17 Report

Status: COMPLETE (LOCAL / SOURCE / SYNTHETIC; EXTERNAL CI BLOCKED)
Phase: 17-CHANGE-AWARE-CAMPAIGN-EVIDENCE-HARDENING
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

Final Git SHA: DISCOVER_FROM_GIT
Starting SHA: `e8af0c46f5f32c5d8bf80ca8041bb535ac64d7d2`
Last validated implementation SHA: `482ed51814ce8e8f7d67de7edc9a98786240430c`
Last substantive checkpoint SHA: `482ed51814ce8e8f7d67de7edc9a98786240430c`
Last documentation checkpoint SHA: `482ed51814ce8e8f7d67de7edc9a98786240430c`
Live HEAD authority: `DISCOVER_FROM_GIT`; the final documentation descendant
must be checked against `origin/main` and the Nightwatch tree before handoff.

## Phase 16CH final status

Phase 16CH remains terminal `BLOCKED_EXTERNAL_CI`: canonical and topology-
correct isolated regressions were both 2232 passed / 4 skipped / 0 failed,
with Actions run `32624917568` / job `97158631282` executing zero steps under
the known billing/spending block. Phase 16D was not reopened or authorized.

## Campaign and workstreams completed

- W1 Change-aware portfolio bridge: connected existing bounded source-selection
  evidence to the approved Phase 16 allocator through a pure overlay with
  explicit direct/shared/transitive/fallback/stale/irrelevant/unlinked cases.
- W2 Parser/privacy hardening: strict baseline admission, own-field checks,
  canonical ordering, reference consistency, bounded provenance, and safe
  categorical diagnostics.
- W3 Replay evidence truth: repeated action IDs cannot be reconstructed into
  occurrence-specific proven minimality; historical result bytes remain
  compatible.
- W4 Corpus/determinism: nine synthetic source-change fixtures plus privacy,
  malformed-document, replay, and repeated-allocation determinism coverage.
- W5 Operator/docs truth: bounded reason tokens and selection-context digest
  are carried into the manifest; task/project architecture and safety records
  are aligned to the final evidence.

## Defects found, root causes, fixes, and regressions

- DEF-17-01: ordinary JSON identity made property-order permutations produce
  different change/correlation identities. Fixed with canonical stable JSON
  and optional-undefined normalization; permanent permutation regressions pass.
- DEF-17-02: baseline JSON was trusted through a type assertion. Fixed with a
  strict bounded parser and atomic-write prevalidation; malformed, duplicate,
  unsafe, and contradictory fixtures pass closed.
- DEF-17-03: duplicate diagnostics echoed hostile values. Fixed with bounded
  `safeErrorDetail` projection; hostile duplicate and identity/URL fixtures
  prove no raw value enters the diagnostic.
- DEF-17-04: public minimality evidence matched repeated actions by ID rather
  than occurrence. Fixed by rejecting ambiguous proof reconstruction while
  retaining historical result shape; live reducer and fabricated-evidence
  regressions pass.
- DEF-17-05: required fields could be inherited from a hostile prototype.
  Fixed by requiring own properties; prototype-boundary regression passes.
- DEF-17-06: broad identity redaction rejected the legitimate product target
  `ripple-account-inventory.read`. Fixed by requiring an identifier-shaped
  value after an identity label; the first integrated run's seven failures
  are gone, and the product-target positive control plus full parity pass.

## Architectural and capability changes

`src/core/portfolio/changeImpact.ts` is a pure, bounded source-to-portfolio
bridge. It consumes a validated `SelectionResult` and an approved portfolio,
requires explicit journey linkage, reuses the canonical allocator, and has no
filesystem, network, process, browser, database, AI, self-development, or
executor authority. Source paths, headers, URLs, explanations, and raw values
do not cross the overlay boundary.

Change and source-correlation identities now use the canonical serializer;
baseline documents are versioned and fail closed; repeated replay evidence is
occurrence-honest; manifests can carry deterministic categorical selection
reasons and a source-context digest without changing legacy no-overlay bytes.

No dead production file or export was removed. The measurable technical-debt
reduction is the removal of duplicate identity serialization in two consumers,
the replacement of a baseline type assertion with runtime admission, and the
centralization of bounded diagnostic projection.

## Semantic, portfolio, replay, and triage evidence

The new semantic capability is conservative impact prioritization: source
changes can rank already-approved campaign members without pretending that
stale, fallback, ambiguous, irrelevant, or unlinked evidence proves impact.
No new semantic oracle class or real-product expectation was invented in this
task; deeper semantic invariant expansion remains deferred to a future local /
source / synthetic task with benign controls.

Portfolio ranking is deterministic, tie-stable, budget-gated, and explains
bounded reason categories. Replay evidence refuses unstable occurrence claims.
Triage confidence is not inflated by fallback or stale source evidence, and
the existing semantic/protocol compatibility cone remains green.

## Corpus and determinism

- Source-change corpus: 9 fixtures covering direct, shared, transitive,
  irrelevant, ambiguous, deleted, renamed, stale, and simultaneous changes.
- Phase 17 focused matrix after DEF-17-06 coverage: 27 passed / 0 failed.
- Repeated source-aware allocation: three byte-identical runs.
- Privacy/authority determinism assertions: zero raw diagnostic leaks, zero
  positive fallback/stale lifts, zero target-name inference, and zero identity
  permutation mismatches in the exercised matrix.

## Validation

- `npm run typecheck`: PASS.
- `npm run hardening:check`: PASS.
- Phase 17 focused: 27 passed / 0 failed.
- Readiness/rehearsal plus Phase 17 repair matrix: 52 passed / 0 failed.
- Affected change-intelligence/portfolio/replay cone: 142 passed / 0 failed.
- `npm run campaign:synthetic`: 27 passed / 0 failed.
- `npm run test:owner-provenance`: 91 passed / 0 failed (serial rerun; the
  one concurrent port collision was a harness artifact, not a source defect).
- `npm run agent:check`: strict errors 0; historical legacy-task warnings are
  retained, and terminal continuity is evidence-backed.
- `npm run agent:audit`: strict v2 errors 0; legacy v1 history remains
  readable with warnings only.
- `npm run project:check`: PASS; catalog count/digest unchanged and promotion
  authority remains `NONE`.
- `git diff --check`: PASS.
- Canonical `npx playwright test --project=nightwatch --workers=1`:
  2259 passed / 4 skipped / 0 failed out of 2263.
- Fresh isolated clone with `npm ci`, read-only aggregate sibling symlinks,
  `NIGHTWATCH_SIBLING_ROOT`, and `NIGHTWATCH_PROXY_PORT=19123`: 2259 passed /
  4 skipped / 0 failed out of 2263; exact parity and clean isolated tree.
- Skip inventory in both full runs: `tests/unit/phase5Api.test.ts:195`,
  `:244`, `:278`, and `tests/unit/selfDevSandboxConfinement.test.ts:143`.

## CI truth

Actions run `32628613509` / job `97167784939` for the pushed implementation
checkpoint was inspected once. The run completed as failure before any job
step executed (`steps=[]`) under the known external billing/spending block.
It is not represented as CI green and was not retried.

## Safety

All remain zero: DEV contacts, NEXT contacts, production contacts,
authenticated product sessions, product mutations, customer/data-plane
operations, database/datastore/cloud/infra operations, Alphaus sibling writes,
external publication, credential leaks, and real-finding persistence.

## Deferred work and next best target

Phase 16D, Phase 6 expansion, Phase 11B/13B, sibling writes, external
coordination, publication, and real-environment semantic acceptance remain
unauthorized. The next best development target is a separately scoped local /
source / synthetic semantic-oracle depth program that consumes the new impact
categories, adds benign controls for each business-behavior anomaly class,
and preserves the same fail-closed provenance and privacy boundaries.

This task is terminal. Future work must start in a new task directory with
fresh authority and a fresh repository audit.
