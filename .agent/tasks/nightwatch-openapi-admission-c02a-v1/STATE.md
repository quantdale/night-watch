# Task State

## Identity

Task ID: nightwatch-openapi-admission-c02a-v1
Phase: OPENAPI_ADMISSION_C02A_V1
Status: COMPLETE
Starting SHA: c64b56fff1237c489982a9d6cece7adea83c6387
Branch: session/nightwatch-openapi-admission-c02-602bf4e2
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: c64b56fff1237c489982a9d6cece7adea83c6387
LAST_VALIDATED_IMPLEMENTATION_SHA: 6a70061729b224a78eeaced009149457bf75cb5b
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 6a70061729b224a78eeaced009149457bf75cb5b
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_OPENAPI_ADMISSION_C02A_V1_STATUS: COMPLETE

## Objective

Admit `openapiv2` as an approved root of the already-admitted
`alphauslabs/blueapi` repository; recover its committed generated Swagger
artifact through the existing `parseOpenApiRoutes` machinery with zero new
parsers; bind `$ref` → `definitions` response contracts; classify the evidence
as `SOURCE_FACT (GENERATED_ARTIFACT)` with an explicit, fail-closed
generation-currency check; and bar generated evidence from ever being the sole
basis of a production admission — all without disturbing a single pre-C-02a
operation identity.

## Current Milestone

COMPLETE / STOP — M1 through M7 are closed.

## Work In Progress

NONE — the campaign is complete. C-02b is deliberately not started.

## Exact Next Action

STOP — C-02a is complete and locally certified. Do not begin C-02b in this
task; the next campaign is a new task with its own session worktree.

## Starting evidence

- openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/tasks.md (C-02a line)
- docs/design/PRODUCTION-OBSERVABILITY-MASTER-PLAN.md
- docs/design/PRODUCTION-OBSERVABILITY-INDEPENDENT-REVIEW.md (X-03, X-04)
- .agent/tasks/nightwatch-truncation-truth-discovery-paging-c01-v1/STATE.md, REPORT.md

## Completed Milestones

- **M1 root admission.** `APPROVED_ROOTS['alphauslabs/blueapi']` is
  `['billing', 'openapiv2']`. `blueinternal` is deliberately absent: it is not
  a member of `RIPPLE_REPOSITORIES` at all, so its admission is a REPOSITORY
  admission blocked behind C-05, not a per-root change.
- **M2 generated-artifact evidence.** New
  `src/core/source/generatedArtifact.ts` keeps three facts separate: the
  evidence qualifier (a pure function of repository + path), generation
  currency against the proto surface, and a deny-only production-admission
  gate with no `GRANTED` member by construction.
- **M3 `$ref` binding.** `parseOpenApiRoutes` now resolves each
  `responses[code].schema.$ref` against the document's own `definitions`.
  In-document only: a non-local reference is `REF_MALFORMED`, an absent name is
  `DEFINITION_MISSING`, an unsafe name is `DEFINITION_UNSAFE`. Nothing is
  fetched and nothing is dropped. Resolved bindings prove the response contract
  without a handler symbol, which a generated Swagger document does not have.
- **M4 surfacing.** Descriptor `v3 → v4` with `sourceEvidence`;
  `SourceContractEvidence.responseDefinitions`; three new discovery counters.
- **M5 focused regressions.** `tests/unit/c02aOpenApiAdmission.test.ts` — 18
  passed.
- **M6 measured population.** See Measurements.

## Measurements

Real read-only census over the approved universe, sibling checkouts at their
recorded SHAs (`alphauslabs/blueapi@691422e5dc81afd263d064986fb50fcb3ea432a9`,
`mobingilabs/ripple-api@27bb007ad0c798800b6bd3b29760c966422966e7`):

| Metric | Pre-C-02a | Post-C-02a |
|---|---|---|
| operations projected | 223 | 814 |
| `mobingilabs/ripple-api` | 223 | 223 |
| `alphauslabs/blueapi` | 0 | 591 |
| operations dropped | 0 | 0 |
| `routeProofs` | 222 | 813 |
| `requestContracts` | 222 | 813 |
| `responseContracts` | 58 | 649 |
| files considered / read / admitted | 1732 / 1092 / 1078 | 1733 / 1093 / 1079 |
| bytes read | 12,449,877 | 13,885,377 |

`223 + 591 = 814` exactly. There is no deduplication and no loss: the truthful
combined number is the arithmetic sum, because the generated artifact
contributes 591 distinct `(verb, path)` identities in a repository that
previously contributed none.

- `generatedArtifactOperations: 591`, all with
  `operation.language === 'OPENAPI'` and
  `sourcePath === 'openapiv2/apidocs.swagger.json'`.
- `openApiResponseDefinitionsBound: 970`,
  `openApiResponseDefinitionsUnresolved: 0`. The 970 comprises 591 `default`
  bindings and 379 `200` bindings; all 1,179 available definitions resolve
  in-document, so nothing is unresolved. 970 ≥ 400.
- All 591 blueapi surfaces reach `responseProof: PROVEN` — 591 ≥ 400 by the
  per-operation reading of the metric as well as the 970 per-binding reading.
- Operation-identity preservation: comparing the pre-C-02a census rows against
  the post-C-02a rows, `0` of the 223 pre-C-02a
  `(repository, operationId, surfaceId)` identities are missing, and the `591`
  additions are all `alphauslabs/blueapi`.
- Completeness stays truthful: `state: UNKNOWN`, `truncated: false`,
  `droppedOperations: 0`, `totalOperations: null`,
  `remainingUnknown: true`, `enumerationCompleteness: TRUNCATED`,
  `contentReadCompleteness: COMPLETE`. The expansion did not manufacture a
  COMPLETE claim.

## Files Changed

- .agent/ACTIVE_TASK.md
- .agent/tasks/nightwatch-openapi-admission-c02a-v1/SPEC.md (new)
- .agent/tasks/nightwatch-openapi-admission-c02a-v1/PLAN.md (new)
- .agent/tasks/nightwatch-openapi-admission-c02a-v1/STATE.md (new)
- .agent/tasks/nightwatch-openapi-admission-c02a-v1/REPORT.md (new)
- src/core/source/generatedArtifact.ts (new)
- src/core/source/approvedScan.ts
- src/core/source/surfaceTypes.ts
- src/core/source/surfaces.ts
- tests/unit/c02aOpenApiAdmission.test.ts (new)
- tests/unit/controlCenterAdapters.test.ts
- tests/unit/controlCenterAuthorityIntegration.test.ts
- tests/browser/controlCenterBrowser.browser.ts
- docs/CURRENT_STATE.md
- docs/DECISIONS.md
- docs/ROADMAP.md
- openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/tasks.md

## Validation Ledger

- `npx tsc --noEmit` — exit 0.
- Focused Playwright `tests/unit/c02aOpenApiAdmission.test.ts` — 18 passed.
- `node bin/hardening-check.mjs` — PASS.
- Real approved source, read-only whole-population census
  (`node bin/nightwatch-intelligence.mjs eligibility-census --json`):
  `examinedOperations: 814`, `projectedOperations: 814`,
  `droppedOperations: 0`, `truncated: false`, `state: UNKNOWN`,
  per repository `alphauslabs/blueapi` 591/591/0 and
  `mobingilabs/ripple-api` 223/223/0; `routeProofs: 813`,
  `requestContracts: 813`, `responseContracts: 649`;
  discovery counters `generatedArtifactOperations: 591`,
  `openApiResponseDefinitionsBound: 970`,
  `openApiResponseDefinitionsUnresolved: 0`.
- Full canonical Playwright regression — 2,771 passed / 13 skipped / 0 failed.
  The regression and both gates ran at
  `316ac761aa5de99da06db39ca0e242834a574467`, the documentation-only descendant
  of the implementation commit
  `6a70061729b224a78eeaced009149457bf75cb5b` that wires these checkpoint SHAs.
  Its source tree is byte-identical to the implementation commit's; only
  `.agent` and `docs` differ.
- `npm run gate:local` — PASS at `gitHead 316ac761aa5de99da06db39ca0e242834a574467`,
  Node 22, `environmentClass: LOCAL`, all eleven required groups PASS
  (SEMANTIC_COMPATIBILITY 1,950 total / 1,937 passed / 13 skipped / 0 failed;
  OWNER_PROVENANCE 91; SYNTHETIC_CAMPAIGN 128), receipt
  `receipt:sha256:f901ce1e76c083cb867fd3e7`.
- `npm run gate:clean` — PASS at
  `sourceHead 316ac761aa5de99da06db39ca0e242834a574467`, Node 20,
  `installResult: PASS`, `gateResult: PASS`, all eleven groups PASS, receipt
  `receipt:sha256:9a9be194536773d5dd2df458`.
- Final certification pass at the closeout commit
  `35cb82da9c91519bc2a4a6795431af1e06c31660`:
  `npm run gate:local` PASS, Node 22, all eleven groups PASS, receipt
  `receipt:sha256:2e078aeabcbf539e411ed437`; `npm run gate:clean` PASS,
  Node 20, `installResult: PASS`, `gateResult: PASS`, all eleven groups PASS,
  receipt `receipt:sha256:808ae7475f4c43c9de5afcbc`.

## Decisions Made During This Task

- **The generated artifact is source evidence, but generated source evidence.**
  It is classed `SOURCE_FACT` with a `GENERATED_ARTIFACT` qualifier rather than
  being demoted to a weaker evidence class. Demotion would have been dishonest:
  the file is committed, exact and mechanically parseable. The qualifier
  carries the real limitation — it mirrors the protos only as of the last time
  somebody ran the generator.
- **Absence of a corroborator is UNKNOWN, never CURRENT.** C-02b owns the proto
  surface, so `PROTO_SURFACE_CORROBORATIONS` is empty and every generated
  surface reports `GENERATION_CORROBORATOR_UNAVAILABLE`. A snapshot mismatch,
  a duplicate record and a malformed count are all UNKNOWN too. Only an exact
  single corroboration at the same SHA with a matching operation count yields
  CURRENT.
- **The production-admission gate can only deny.** `state` is
  `DENIED | NOT_DENIED_BY_EVIDENCE_CLASS`; there is no `GRANTED` member, so no
  caller can read a grant out of it. `GENERATED_ARTIFACT` with no
  `DIRECT_SOURCE` corroboration denies with
  `GENERATED_ARTIFACT_SOLE_EVIDENCE` even when currency is provably CURRENT.
- **In-document `$ref` resolution needs no handler.** The handler-analyzer
  route requires `handlerState === 'PROVEN'`, which a generated Swagger
  document can never satisfy. Rather than weaken that requirement, the OpenAPI
  definition binding is a separate, explicitly labelled proof path with its own
  `OPENAPI_RESPONSE_DEFINITION` join kind.
- **Definition bindings travel by object identity, not by descriptor field.**
  `SourceOperationDescriptor` is untouched, so every pre-C-02a `operationId`
  and `surfaceId` is bit-identical. The bindings are carried from parsed route
  to contract through a `Map` keyed on the operation object.
- **`SAFE_ROUTE_RE` admits `&`.** One real gRPC-gateway custom-method template,
  `/v1/invoice/{date}:create&savesettings`, was otherwise collapsed to `/` and
  marked `SOURCE_SYNTAX_UNSUPPORTED`. Widening the character class can only
  promote a previously-unsupported template to an exact one; it can never
  rewrite an already-safe template. Proven inert: all 223 pre-C-02a operation
  identities are unchanged.
- **The descriptor schema version advances `v3 → v4`.** Adding `sourceEvidence`
  to the digest core changes every `deterministicDigest`. That is made explicit
  by the version bump rather than hidden by excluding the block from the core.
  `surfaceId` and `operationId` — the actual identities — are unaffected.

## Blockers

NONE

## Discoveries

- The independent review's `591` is exact, not approximate:
  `openapiv2/apidocs.swagger.json` at `691422e5` has 462 paths and 591
  verb-bound operations (get 185, post 253, put 91, delete 60, patch 2), with
  1,179 `definitions`, and every one of the 591 operations carries at least one
  resolvable in-document response `$ref`.
- Only 379 of the 591 operations declare a `200` response schema; the other 212
  declare only `default`. Counting resolvable response bindings across all
  status codes yields 970, and counting operations with at least one bound
  response contract yields 591. Both readings clear the ≥ 400 acceptance
  criterion; the 200-only subset (379) does not, which is why the metric is
  reported as bindings and as contract-proven operations rather than as
  success-schema count.
- `alphauslabs/blueapi` sorts before `mobingilabs/ripple-api`, so C-02a is
  exactly the adversarial case C-01's round-robin projection was built for. It
  held: zero drops in either repository.

## Safety Events

NONE. One process deviation occurred and was repaired immediately: the first
three source edits were applied to the canonical checkout instead of the
session worktree because relative paths resolved against the session's start
directory. The exact files (`src/core/source/approvedScan.ts`,
`src/core/source/surfaceTypes.ts`, `src/core/source/surfaces.ts`) were copied
into the owned worktree and restored in canonical with a path-scoped
`git restore`; canonical returned to a clean tree with no commit, no other
path touched, and no other session's work involved. Every subsequent edit used
absolute worktree paths.

## Deferred / Follow-Up

- C-02b supplies the proto-surface corroborator that turns the generated
  artifact's `UNKNOWN` currency into `CURRENT` or `STALE`.
- The artifact occupies 72 % of `maxFileBytes`; the headroom is unchanged and
  is not C-02a's to raise.
- `blueinternal/openapiv2` (~57 operations) remains claimed by C-05.
- Generated OpenAPI operations declare no handler symbol, so all 591 carry an
  `UNSUPPORTED_REFERENCE` `ROUTE_HANDLER` join. JOIN_GRAPH is consequently the
  top-ranked proof-gap family post-C-02a (607 gap surfaces). Closing it needs
  the proto service ↔ RPC symbol from C-02b and the topology binding of C-03.

## Resume Recipe

STOP — task complete. C-02a is closed and locally certified; `REPORT.md` holds
the closure evidence. C-02b is a NEW task with a NEW session worktree created
through `node bin/nightwatch-session.mjs start`; it does not resume this one.

## Completion Snapshot

- Every acceptance criterion in `SPEC.md` is met; see `REPORT.md` for the
  criterion-by-criterion table.
- `blueapi/openapiv2` admitted; `blueapi` roots are exactly
  `['billing', 'openapiv2']`; `alphauslabs/blueinternal` remains outside the
  repository universe.
- 591 blueapi operations extracted through the existing `parseOpenApiRoutes`,
  each with verb, path and a distinct `operationId`; 970 response contracts
  bound through in-document `definitions`, 0 unresolved.
- Every generated surface carries `SOURCE_FACT (GENERATED_ARTIFACT)`
  provenance, `UNKNOWN` generation currency, and a `DENIED` production
  admission.
- All 223 pre-C-02a operation identities present; 0 operations dropped in
  either repository; completeness remains `UNKNOWN` / `remainingUnknown: true`
  rather than a manufactured COMPLETE.
- No new product or runtime authority was created. C-02b not started.
