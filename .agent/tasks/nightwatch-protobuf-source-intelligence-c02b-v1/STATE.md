# Task State

## Identity

Task ID: nightwatch-protobuf-source-intelligence-c02b-v1
Phase: PROTOBUF_SOURCE_INTELLIGENCE_C02B_V1
Status: IN_PROGRESS
Starting SHA: fab7675883b15bdfc29bcc946d52b2762fe96b2f
Last validated implementation SHA: fc4f00a43386d117c3a76afa6058e49a312912df
Last substantive checkpoint SHA: fc4f00a43386d117c3a76afa6058e49a312912df
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-protobuf-source-intel-139a4f45
Last checkpoint: M4 closed — protobuf admitted as a language, parseProtoRoutes wired, DEF-C02B-1 found and repaired; blueapi yields 738 operations and ripple-api still yields 223
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: fab7675883b15bdfc29bcc946d52b2762fe96b2f
LAST_VALIDATED_IMPLEMENTATION_SHA: fc4f00a43386d117c3a76afa6058e49a312912df
LAST_SUBSTANTIVE_CHECKPOINT_SHA: fc4f00a43386d117c3a76afa6058e49a312912df
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Give Nightwatch bounded protobuf source intelligence over already-approved
roots: mechanically proven service and RPC symbols, streaming classification,
fail-closed `google.api.http` bindings, and a per-operation corroboration of
the C-02a generated OpenAPI artifact that cannot be satisfied by counting.

## Current Milestone

Milestone ID: M8 — integration, exact-head CI, closure
Milestone status: IN_PROGRESS
What is being attempted: run the full validation matrix with writes frozen for
`gate:clean`, integrate per C-00, observe exact-head CI, reconcile project
truth, complete the REPORT and release the session.

## Completed Milestones

- M1 — task record, OpenSpec change and measured baseline. Committed at
  `725fbad`. `agent:check` PASS (2 standing warnings), `handoff:check` PASS,
  `project:check` PASS, `workspace:check` PASS.
- M2 — adversarial corpus asserted BEFORE the parser existed.
  `tests/unit/c02bProtoLexer.test.ts` was written first and failed to even
  import, which is the reproduction: the modules did not exist.
- M3 — `src/core/source/protoLexer.ts` and
  `src/core/source/protoDeclarations.ts` implemented. 50/50 corpus assertions
  pass, and the parser independently reproduces the M1 line-regex baseline
  exactly.
- M4 — `PROTOBUF` and `.proto` admitted; `parseProtoRoutes` dispatched from
  `surfaces.ts`; `tests/unit/c02bProtoSurface.test.ts` 17/17. DEF-C02B-1 found
  and repaired. blueapi now yields 738 operations (591 artifact + 147 proto)
  and `mobingilabs/ripple-api` still yields its full 223.
- M5 — `src/core/source/protoCorroboration.ts` implemented;
  `tests/unit/c02bProtoCorroboration.test.ts` 17/17. All 147 real Billing
  operations MATCH the proto on verb and path; the artifact still does not
  reach CURRENT.
- M6 — `checkC02bProtobufBoundary()` added to `bin/hardening-check.mjs`;
  15 negative probes attempted, 15 detected, 15 restored to PASS. One vacuous
  test found and repaired.
- M7 — the three C-02b suites registered in
  `config/synthetic-campaign.v1.json`, with a membership assertion in
  `tests/unit/syntheticCampaignDiagnostics.test.ts` so the registration cannot
  be silently dropped.

## Work In Progress

M8. Nothing partial: M1-M7 are closed.

## Exact Next Action

Integrate the session branch to `origin/main` by verified fast-forward, observe
exact-head GitHub Actions, record the CI result in the project-state block,
then run `gate:local` and `gate:clean` with campaign writes frozen and close.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/ACTIVE_TASK.md` | route the active task to C-02b | WRITTEN |
| `.agent/EXECUTION_PROMPT.md` | campaign handoff header for C-02b | WRITTEN |
| `.agent/tasks/nightwatch-protobuf-source-intelligence-c02b-v1/SPEC.md` | frozen intent | WRITTEN |
| `.agent/tasks/nightwatch-protobuf-source-intelligence-c02b-v1/PLAN.md` | living plan, eight milestones | WRITTEN |
| `.agent/tasks/nightwatch-protobuf-source-intelligence-c02b-v1/STATE.md` | this waypoint | WRITTEN |
| `.agent/tasks/nightwatch-protobuf-source-intelligence-c02b-v1/REPORT.md` | requirement ledger skeleton | WRITTEN |
| `openspec/changes/nightwatch-protobuf-source-intelligence-c02b-v1/audit.md` | pre-implementation audit, findings A-1..A-7 | WRITTEN |
| `openspec/changes/nightwatch-protobuf-source-intelligence-c02b-v1/proposal.md` | why and what | WRITTEN |
| `openspec/changes/nightwatch-protobuf-source-intelligence-c02b-v1/design.md` | layering, bounding, corroboration rule | WRITTEN |
| `openspec/changes/nightwatch-protobuf-source-intelligence-c02b-v1/tasks.md` | T1..T12 | WRITTEN |
| `openspec/changes/nightwatch-protobuf-source-intelligence-c02b-v1/specs/protobuf-source-intelligence/spec.md` | ADDED requirements | WRITTEN |
| `docs/CURRENT_STATE.md` | live-state v2 block re-pointed from C-11 to this campaign | COMMITTED 725fbad |
| `tests/unit/c02bProtoLexer.test.ts` | adversarial corpus, HTTP matrix, streaming matrix | 50/50 PASS |
| `src/core/source/protoLexer.ts` | bounded tokenizer; the only module that knows comment/string syntax | IMPLEMENTED |
| `src/core/source/protoDeclarations.ts` | bounded recursive-descent reader and fact model | IMPLEMENTED |
| `src/core/source/scanTypes.ts` | `PROTOBUF` language, `.proto` extension | COMMITTED |
| `src/core/source/scan.ts` | `.proto` -> `PROTOBUF` extension mapping | COMMITTED |
| `src/core/source/approvedScan.ts` | `.proto` in the approved extension list | COMMITTED |
| `src/core/source/surfaces.ts` | `parseProtoRoutes`, evidence-class-scoped route ambiguity (DEF-C02B-1) | COMMITTED |
| `tests/unit/c02bProtoSurface.test.ts` | admission, real surface, no-eviction, DEF-C02B-1 regression | 17/17 PASS |
| `tests/unit/c02aOpenApiAdmission.test.ts` | three assertions rescoped from "the repository" to "the artifact" | 18/18 PASS |
| `src/core/source/protoCorroboration.ts` | per-operation corroboration, seven outcomes, scope limits | IMPLEMENTED |
| `tests/unit/c02bProtoCorroboration.test.ts` | A-4 gate, outcome vocabulary, real-surface measurement | 17/17 PASS |
| `bin/hardening-check.mjs` | `checkC02bProtobufBoundary()` — six guarded invariants | PASS |
| `config/synthetic-campaign.v1.json` | the three C-02b suites gate-registered | PASS |
| `tests/unit/syntheticCampaignDiagnostics.test.ts` | membership assertion for the C-02b suites | PASS |
| `docs/CURRENT_STATE.md` | substantive anchor advanced to f479b02; CI evidence advanced to dbc7c153 EXECUTED_FAIL; live CI narrative rewritten truthfully | COMMITTED |

## Validation Ledger

Command: `npm run session:status`
Result: PASS
When: 2026-09-03, canonical checkout, before the session worktree was created
Relevant failure/output summary: verdict PASS, WORKSPACE_INTEGRITY_SATISFIED,
all seven workspace groups PASS, canonical clean.

Command: `git rev-parse HEAD` / `git rev-parse origin/main`
Result: PASS
When: 2026-09-03
Relevant failure/output summary: both `fab7675883b15bdfc29bcc946d52b2762fe96b2f`,
matching the expected starting state; working tree clean; one worktree.

Command: `npm run agent:check`
Result: PASS
When: 2026-09-03, session worktree
Relevant failure/output summary: PASS with 2 warnings — CHECKPOINT_ADVANCE over
the continuity/documentation allowlist, and the standing 24 legacy v1 tasks
warning. Six schema errors were repaired first: STATE required headings, the
40-character SHA anchors, and PROJECT_VERDICT_EFFECT placement.

Command: `npm run handoff:check`
Result: PASS
When: 2026-09-03, session worktree
Relevant failure/output summary: initially FAIL with
HANDOFF_OPENSPEC_FILE_UNTRACKED and HANDOFF_OPENSPEC_SPEC_MISSING; the OpenSpec
change must be tracked, not merely present. PASS after `git add`.

Command: `npm run project:check`
Result: PASS except the expected dirty-checkout code
When: 2026-09-03, session worktree
Relevant failure/output summary: the live-state v2 block had to be re-pointed
from C-11 to this campaign. `LIVE_COMPLETION_CLAIM` takes only NONE or
COMPLETE, so an IN_PROGRESS task declares NONE. Only
PROJECT_STATE_CHECKOUT_DIRTY remains, which clears at the checkpoint commit.

Command: `npm run workspace:check`
Result: PASS
When: 2026-09-03, session worktree
Relevant failure/output summary: session worktree classed OWNED_SESSION,
base CURRENT, drift false, canonicalSafe true, attention 0.

Command: `npx playwright test tests/unit/c02bProtoLexer.test.ts`
Result: PASS 50/50
When: 2026-09-03, session worktree
Relevant failure/output summary: the first run could not import the suite at
all, which is the pre-implementation reproduction. After M3 one assertion
failed: a non-`google.api.http` option on an RPC was asserted `ABSENT` but the
reader returns `UNSUPPORTED_OPTION`. The reader is right and the assertion was
imprecise — an option WAS present — so the test now asserts
`UNSUPPORTED_OPTION` plus an empty binding set, which still carries the
load-bearing claim that no route escapes a string literal.

Command: parser measurement of `alphauslabs/blueapi@691422e5`
`billing/v1/billing.proto`
Result: PASS — matches the M1 baseline exactly
When: 2026-09-03, session worktree
Relevant failure/output summary: 1 service `blueapi.billing.v1.Billing`, 147
RPCs, 238 messages, 147 bindings all `PROVEN`, GET 39 / POST 64 / PUT 25 /
PATCH 2 / DELETE 17, 91 WILDCARD bodies and 56 ABSENT, 114 unary / 0
client-streaming / 33 server-streaming / 0 bidirectional, 9,686 tokens, 1,121
comments discarded, completeness COMPLETE with zero malformed declarations and
zero ceiling drops. `mobingilabs/ouchan` `types.proto`: 0 services, 5 messages,
COMPLETE.

Command: `npx playwright test tests/unit/c02bProtoSurface.test.ts`
Result: PASS 17/17
When: 2026-09-03, session worktree
Relevant failure/output summary: two genuine failures on the way. (1) A
hand-spread scan config was rejected `REAL_SOURCE_SCAN_INVALID:CONFIG_DIGEST`
— the digest guard working correctly; the fixture now rebuilds the config
through `createRealSourceScanConfig`. (2) DEF-C02B-1, below.

Command: `npx playwright test` over phase25 x4, c02a, c06, eligibilityCensus,
readonlyCandidateCensus
Result: PASS 82/82 after the C-02a rescope; 79/82 before it
When: 2026-09-03, session worktree
Relevant failure/output summary: three C-02a assertions said "every blueapi
surface" where they meant "every surface from the generated artifact". That was
true only while the artifact was blueapi's sole yield. Rescoped to the artifact
path, and a new positive assertion added that the proto surface in the same
repository is DIRECT_SOURCE with null currency — so the rescope proves
something rather than merely excusing the proto.

Command: `npx tsc --noEmit`
Result: PASS
When: 2026-09-03, session worktree
Relevant failure/output summary: one error first — `SourceLanguage` in the
semantic analyzers does not include PROTOBUF. Rather than widen that union to a
language no analyzer can read, PROTOBUF now joins YAML in the guard that keeps
non-handler languages out of the analyzer path.

Command: `npx playwright test tests/unit/c02bProtoCorroboration.test.ts`
Result: PASS 17/17
When: 2026-09-03, session worktree
Relevant failure/output summary: measured against the real
`openapiv2/apidocs.swagger.json` and `billing/v1/billing.proto` at
`691422e5`: 147 MATCH, 0 PATH_MISMATCH, 0 METHOD_MISMATCH, 0 PROTO_ONLY, 0
OPENAPI_ONLY, 444 out of scope. State UNCORROBORATABLE, so
`toProtoSurfaceCorroboration` returns null and blueapi's generation currency
stays UNKNOWN with its production admission DENIED.

Command: 15 negative probes (10 against `hardening:check`, 5 behavioural
against the suites), each mutate -> run -> restore -> run
Result: 15/15 DETECTED, 15/15 RESTORED_PASS
When: 2026-09-03, session worktree
Relevant failure/output summary: two of my own hardening rules were over-broad
on first run and were tightened before probing — one matched the words
`protoc-gen-openapiv2` inside a comment describing a real annotation, the other
matched the comment in `approvedScan.ts` that documents blueinternal's absence.
Both are the C-11 lesson about plausible rules matching irrelevant occurrences
of the same identifier, caught here rather than shipped. Probe B3 then found a
genuinely vacuous test; see the discovery below.

Command: `npm run test:semantic-compat`
Result: PASS
When: 2026-09-03, session worktree at f479b02
Relevant failure/output summary: 2,033 total / 2,020 passed / 13 skipped / 0
failed across 22 phases and 146 files.

Command: `npm run campaign:synthetic`
Result: PASS
When: 2026-09-03, session worktree at f479b02
Relevant failure/output summary: 21 files, 451 total / 451 passed / 0 failed,
`deepContainmentLane: PROVEN`. Up from C-11's 366 by exactly the 85 tests of
the three newly registered C-02b suites.

Command: `npx playwright test --project=nightwatch --workers=1` (full canonical
regression)
Result: PASS
When: 2026-09-03, session worktree at f479b02
Relevant failure/output summary: 3,228 total / 3,215 passed / 13 skipped / 0
failed in 7.1 minutes. C-11 recorded 3,141 at its checkpoint; 86 of the +87 are
attributable to this campaign (85 in the three C-02b suites, 1 gate-membership
assertion). The residual +1 is not a campaign effect: this run reports
`deepContainmentLane: PROVEN` where C-11's CI reported
`NOT_EXERCISED_BWRAP_UNAVAILABLE`, so an additional containment test executes
here. Exact-head CI settles it.

Command: `npm run gate:local`
Result: FAIL — PROJECT_TRUTH only, classified PROJECT_TRUTH_ORDERING
When: 2026-09-03, session worktree at f479b02
Relevant failure/output summary: receipt
`receipt:sha256:b28d31c552ae9ab2f6c1e081`, persisted to
`/tmp/nightwatch-gate-receipts/local-f479b022cc47.json`. GATE_DEFINITION,
STATIC, HARDENING and HANDOFF_TRUTH PASS; PROJECT_TRUTH TEST_FAILURE with
`PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE` and
`PROJECT_STATE_CI_BASELINE_STALE`; the remaining seven groups NOT_RUN because
AGENT_CONTINUITY depends on PROJECT_TRUTH.

This is the expected cross-authority ordering, not a defect and not a flake.
It was confirmed mechanically rather than assumed: advancing the substantive
anchor alone clears `SUBSTANTIVE_BASELINE_STALE` and leaves
`CI_BASELINE_STALE`, which can only clear once a real CI run on the new head
is recorded. C-11's own history took the same three commits — 7879660
substantive, b8cd4e8 anchors, 150dfcc CI result — so the route is the
repository's documented one.

Command: integration and exact-head CI observation
Result: CI EXECUTED and FAILED, exactly as the ordering invariant predicts
When: 2026-09-03
Relevant failure/output summary: `node bin/nightwatch-session.mjs integrate`
advanced `origin/main` to `dbc7c1531069f96d12e021988199a66573aaf7f1` by
verified fast-forward. Run `33680080322` / job `100414245016` on Node 20,
receipt `receipt:sha256:40ee80f6601978eb0c13c9cb`: GATE_DEFINITION, STATIC,
HARDENING and HANDOFF_TRUTH PASS; PROJECT_TRUTH TEST_FAILURE; seven groups
NOT_RUN. Classification: PROJECT_TRUTH_ORDERING, matching the local prediction
group for group. No rerun was attempted — rerunning could not change the
result, because the input the gate objects to is the project block, not the
build.

## Decisions Made During This Task

Decision: corroborate the generated artifact per operation identity, never by
operation count.
Reason: `evaluateGenerationCurrency` returns `CURRENT` when
`protoOperationCount === artifactOperationCount`. The artifact carries 147
`Billing`-tagged operations and the proto carries 147 RPCs, so populating the
existing seam with a count would flip blueapi from `UNKNOWN` to `CURRENT` — and
out of a production-admission denial — without comparing one route.
Evidence/constraint: measured 147 vs 147; `operationId` is `Billing_<RpcName>`,
an exact join key. Recorded as OpenSpec audit finding A-4.

Decision: keep proto facts in their own model rather than widening
`ParsedRoute`.
Reason: streaming and service identity are not route properties, and C-03
consumes them directly rather than through route discovery.
Evidence/constraint: `ParsedRoute` (`surfaces.ts:115`) has no field for either.

Decision: the reader reports `UNSUPPORTED_OPTION` distinctly from `ABSENT`.
Reason: "no annotation" and "an annotation this reader does not understand" are
different facts about the surface, and collapsing them would hide the second.
Evidence/constraint: `openapiv2_operation` options appear on real RPCs.

Decision: route ambiguity is scoped to the evidence class.
Reason: a committed generated artifact and the source it was generated FROM are
one witness expressed twice. Treating them as rivals marked 147 real routes
AMBIGUOUS and dropped them from PROVEN_MUTATION_CAPABLE to UNSUPPORTED.
Evidence/constraint: measured before/after; `classifySourceEvidenceQualifier`
already distinguishes the two classes, so the fix reuses C-02a's own vocabulary
rather than inventing a special case. Two same-class declarations of one route
are still AMBIGUOUS, asserted directly and also by the pre-existing Phase 25
`ambiguousRoutes === 2` fixture.

Decision: corroboration is scoped by service, and partial coverage is a LIMIT
rather than a divergence.
Reason: the artifact mirrors roughly fifteen services and only `Billing` sits
in an approved root. Counting the other 444 operations as OPENAPI_ONLY would
blame the artifact for a boundary Nightwatch chose; ignoring them would let 147
corroborated operations certify 591.
Evidence/constraint: measured 591 total, 147 `Billing`-tagged, 444 out of
scope. `ARTIFACT_COVERS_UNREADABLE_SERVICES` records the reason explicitly.
Consequence: the truthful C-02b outcome for blueapi is that every readable
operation agrees exactly AND the artifact still cannot be certified. Both
halves are reported.

Decision: a renamed path placeholder is a divergence, not a normalization.
Reason: the artifact is meant to be a faithful mirror, and `{id}` vs
`{thingId}` is exactly the drift the check exists to catch.

Decision: probes must mutate faithfully or they prove nothing.
Reason: B3's first mutation replaced the unknown-verb-key rejection with
`continue`, which stalls the cursor on the `:` so the block fails for an
unrelated reason and the probe read as NOT_DETECTED against a test that WAS
vacuous. Deleting the rule outright is the faithful mutation, and it exposed
the real gap.
Consequence: a probe that comes back NOT_DETECTED is investigated as a possible
bad probe as well as a possible bad rule.

## Defects introduced by this campaign

DEF-C02B-1 — a generated mirror was treated as a rival declaration.
- Symptom: admitting `billing/v1/billing.proto` degraded all 147 matching
  operations in `openapiv2/apidocs.swagger.json` from `routeProof: PROVEN` /
  `readOnlyClassification: PROVEN_MUTATION_CAPABLE` to `AMBIGUOUS` /
  `UNSUPPORTED`, and changed their `operationId` (the `evidenceDigest` was
  unchanged, so nothing was lost — but every downstream consumer keyed on
  `operationId` would have seen 147 identities disappear and 147 appear).
- Reproduction: discover blueapi with and without `.proto` admitted and diff
  the operation identities; 147 differ. Caught by the C-01 no-eviction
  assertion written for this campaign, which is the assertion earning its keep.
- Root cause: the duplicate-route key in `surfaces.ts` was
  `repoId:method:routeTemplate`, with no notion of evidence class. Before
  C-02b, no repository could contain both a generated artifact and its own
  generator input, so the gap was unreachable.
- Fix: the key now includes `classifySourceEvidenceQualifier(...)`, so rivalry
  is judged within an evidence class.
- Regression: three assertions in `tests/unit/c02bProtoSurface.test.ts` — the
  cross-class pair stays PROVEN, two same-class protos stay AMBIGUOUS, and the
  real 591 artifact operations keep `PROVEN`.
- Disposition: REPAIRED.

## Discoveries

- VACUOUS TEST FOUND AND REPAIRED. "An unknown HTTP verb is never coerced to a
  known one" asserted `{ fetch: "/v1/real" }` is MALFORMED — but a block with
  no verbs at all is rejected by a different check, so deleting the unknown-key
  rule left the test green. The replacement pairs the unknown key with a valid
  one (`{ get: "/v1/real" fetch: "/v1/ghost" }`): with the rule the binding is
  MALFORMED, without it `/v1/ghost` silently disappears and the RPC reads as a
  clean GET. Re-probed: DETECTED, and by the new assertion specifically.
- The parser reproduces the independent line-regex baseline exactly on all ten
  measured dimensions. Two methods measuring the same number by different means
  is the strongest evidence available here that neither is fabricating.
- Acceptance A1 is met at exactly 147, not above it: every RPC in the file
  carries exactly one `google.api.http` binding and there are no
  `additional_bindings` anywhere in the approved universe. The ambiguity
  machinery is therefore exercised only by synthetic fixtures, which is worth
  stating plainly rather than implying real coverage.

- The approved universe contains exactly two `.proto` files. The whole C-02b
  yield comes from `alphauslabs/blueapi` `billing/v1/billing.proto`;
  `mobingilabs/ouchan` `pkg/sapphire/proto/v1/types.proto` declares zero
  services and is the honest negative case.
- The historical "~90 streaming RPCs" expectation counts the whole blueapi
  repository. Inside the approved universe the measured figure is 33
  server-streaming, 0 client-streaming, 0 bidirectional, out of 147 RPCs.
- Protobuf is blocked today by the extension and language lists, not by root
  admission: `billing/v1/billing.proto` is already inside an approved root and
  is rejected `SOURCE_LANGUAGE_UNSUPPORTED`.
- `tests/unit/c02aOpenApiAdmission.test.ts` and
  `tests/unit/c06PhpReadOnlyProof.test.ts` appear in neither gate manifest, and
  CI runs only `npm run gate:ci`. To be confirmed mechanically during
  validation and reported as a pre-existing condition.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- Protobuf source in unadmitted `blueapi` roots and in repositories outside the
  universe: `BLOCKED_BY_C05_REPOSITORY_ADMISSION`.
- Registration of the pre-existing C-02a and C-06 suites in the authoritative
  gate, if the discovery above is confirmed.

## Resume Recipe

1. Read SPEC.
2. Read PLAN.
3. Inspect git status and current SHA in the session worktree.
4. Run the smallest relevant validation.
5. Continue Exact Next Action.

## Completion Snapshot

Populate only when complete.
