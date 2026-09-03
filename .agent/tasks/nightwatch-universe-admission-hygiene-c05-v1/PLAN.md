# C-05 Universe Discovery + Admission Hygiene

## Purpose

After C-05, "which repositories may Nightwatch read" is one owner-approved
statement rather than an unstated intersection of two lists; discovering a
repository grants nothing; the fact that an unapproved repository is unread is
proven where the read would happen; and no normative configuration file
pretends to know a Git fact that changed underneath it.

## Starting State

Task `nightwatch-universe-admission-hygiene-c05-v1`; starting SHA
`210cd0c8732a7ea5ba5aa5b7eef146d4f001d277`; predecessor
`nightwatch-certification-truth-r12-v1` COMPLETE, certified at CI run
`33784345028`.

Established by measurement and not to be rediscovered:

- 149 git repositories under the sibling root at depth ≤ 3; 6 admitted; 143
  unapproved.
- 1,745 operations: blueapi 1,181, ouchan 341, ripple-api 223. Limit 4,096,
  dropped 0, enumeration TRUNCATED, `remainingUnknown: true`, contentRead
  COMPLETE.
- Admission today = `RIPPLE_REPOSITORIES(scope IN_SCOPE)` ∩ keys of
  `APPROVED_ROOTS`, in `src/core/source/approvedScan.ts` and
  `src/core/changeIntelligence/map.ts`.
- Persisted Git state: checkout-local fields all accurate; **10 of 18
  remote-tracking fields diverged**, worst `ouchan behind: 25` vs live 310.
- `alphauslabs/blueinternal` present; `openapiv2/apidocs.swagger.json` is
  Swagger 2.0 with 46 paths / **51 operations** / 84 definitions, every
  operation carrying an `operationId`.
- `wave-api` is **`mobingilabs/wave-api`**; PHP; identical layout to
  `ripple-api`; **55 route keys** in the parser's existing `"get:/path":` form.

## Scope

Discovery/admission separation; one admission authority; live-not-persisted Git
state; instrumented read boundary with a zero-read proof; blueinternal and
wave-api admission; no-eviction regression; full population report.

## Non-Goals

No third repository admission; no duplicate parser; no unsound source fact to
raise a yield; no classification or completeness weakening; no sibling write;
no production, NEXT or DEV contact.

## Safety Constraints

Sibling repositories are READ-ONLY — never written, never modified, never
committed to, and no generated artifact is placed inside one. `siblingWrites`
stays 0. Discovery enumerates repository metadata only and must not read source
from an unapproved repository. All implementation inside the owned session
worktree `session/nightwatch-universe-admission-hy-418aba0f`.

## Architecture / Approach

**Admission authority.** One canonical module states the owner-approved
repository identities and their approved roots. `PHASE25_APPROVED_REPOSITORY_IDS`
becomes a projection of that authority instead of an intersection with the
change-intelligence map, so a repository present in one list and absent from
the other is a declared error rather than a silent non-admission.

**Discovery.** A separate, admission-free operation that enumerates repository
identity metadata under the sibling root and classifies each as ADMITTED or
DISCOVERED_NOT_ADMITTED. It reports counts and identities and nothing derived
from file contents.

**Live Git state.** The persisted mutable fields are removed from the normative
record. Where a consumer needs current checkout or tracking state it queries
the existing read-only sibling-Git surface. Stable identity (repoId,
productRole, scope) stays durable; the historical snapshot values are retained
as explicitly historical if any consumer still needs them.

**Read-boundary instrumentation.** `src/core/source/siblingSource.ts` is the
only sibling-source read path. It gains a counted, per-repository read ledger
so the claim becomes `analyzerSourceReads[unapprovedRepo] === 0` measured at
the call, with a negative probe that attempts a read and is refused.

**Admissions.** `blueinternal` root `openapiv2` reuses `parseOpenApiRoutes`
exactly as C-02a did for `blueapi/openapiv2`; the artifact is
`SOURCE_FACT (GENERATED_ARTIFACT)` with currentness. `mobingilabs/wave-api`
root `src` reuses the existing YAML route parser and the C-06 PHP proof
pipeline; nothing new is written for it.

## Milestones

- M1 Task record, OpenSpec change, measured baseline — COMPLETE
- M2 Single admission authority; discovery separated from admission — NOT_STARTED
- M3 Mutable Git state de-persisted; live query path — NOT_STARTED
- M4 Read-boundary instrumentation and the zero-read proof — NOT_STARTED
- M5 Admit `alphauslabs/blueinternal` (`openapiv2`), measure yield — NOT_STARTED
- M6 Admit `mobingilabs/wave-api` (`src`), measure yield — NOT_STARTED
- M7 No-eviction regression and full population report — NOT_STARTED
- M8 Hardening probes, validation, integration, exact-head CI, closure — NOT_STARTED

## Validation Strategy

`typecheck`, `hardening:check`, `handoff:check`, `project:check`,
`agent:check`, `agent:audit`, `workspace:check`, `gate:inventory`,
`test:semantic-compat`, `campaign:synthetic`, the C-01/C-02a/C-02b/C-03/C-04/
C-06 suites, the new C-05 suites, `source-gaps` before and after, the full
canonical regression, `gate:local`, `gate:clean`, exact-head GitHub Actions.

## Decision Log

- 2026-09-04 — Report 51 blueinternal operations, not the historical ~57.
  Reason: 51 is what `apidocs.swagger.json` actually contains at the current
  checkout. Evidence: 46 paths, 51 verb entries, all with `operationId`.
  Consequence: the historical estimate is preserved as historical and refuted
  explicitly rather than quietly matched.
- 2026-09-04 — Admit `mobingilabs/wave-api` through the existing YAML route
  parser with no parser change. Reason: its `Routing.yaml` uses the same
  `"get:/path":` key form as `ripple-api`, and the parser is indent-relative,
  so the 2-space vs 4-space difference is immaterial. Evidence: 55 matching
  route keys; identical `src/App/{Handler,Middleware,Route/Providor}` layout.
- 2026-09-04 — Treat the persisted-Git-state defect as a divergence-detection
  failure rather than a stale-value incident. Reason: the checkout-local fields
  are all currently accurate, so claiming "the data is stale" would be false;
  the real fault is that 10 of 18 remote-tracking fields have diverged with
  nothing to notice.

## Discoveries

- The `wave-api` identity in the authorization is not a top-level directory; it
  resolves to `mobingilabs/wave-api`. §28 requires establishing this from
  workspace truth rather than assuming, and the assumption would have failed.
- Three sibling-root-shaped directories sit beside the real org directories:
  `nightwatch-isolated-20-sibling-root`,
  `nightwatch-isolated-20-final-sibling-root` and
  `nightwatch-reliability-yield-and-state-protocol-v1`. They are OUTSIDE the
  Nightwatch repository, so C-05 may only REPORT them; classification as
  fixture-vs-leak belongs to R-13 §105 and removing anything is not authorized
  here.

## Deferred Work

R-13 §105 owns classifying the three leftover sibling-root directories.
A future reliability campaign owns the 59 non-campaign infrastructure suites
that R-12 recorded as outside the authoritative gate manifests.

## Completion Criteria

The ten acceptance rows of `SPEC.md`, each carried in the REPORT requirement
ledger with exact evidence.
