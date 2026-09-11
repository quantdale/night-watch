# Audit — Nightwatch production completion programme

Audited live in the canonical checkout at `36bd4930db978423f97e16f35250c2e66bfa112c`,
with `HEAD == origin/main`, working tree clean, on 2026-09-12. Every number
below was measured in this session unless it is explicitly labelled as a
recorded receipt from a prior campaign.

## Method

This audit is not a rediscovery of the architecture. Per the authority
precedence in `AGENTS.md`, it takes current runtime evidence first, then the
current implementation, then task `STATE.md` files, then durable docs. Where a
durable document and a task record disagree, the disagreement itself is
recorded as a finding rather than silently reconciled.

Executed here: `npm run typecheck`, `npm run hardening:check`,
`npm run project:check`, `npm run agent:check`, `npm run validation:universe`,
`npm run session:status`, `node bin/quality-gate-spec.mjs`, `openspec list`,
`openspec list --specs`, `openspec doctor`, plus direct filesystem and Git
inspection. `gate:local`, `gate:clean`, `npm test` and the browser lane were
NOT re-executed here; their most recent receipts are quoted as receipts, with
the SHA they were earned at.

## What is already true, and is not re-opened

The starting position is not a half-built system. Measured here:

- `npm run typecheck` — PASS, no diagnostics.
- `npm run hardening:check` — `PASS: offline structural invariants hold`.
- `npm run project:check` — PASS; `PROJECT_COMPLETION_STATUS:
  OPERATIONALLY_ACCEPTED`, `LAST_LOCALLY_VALIDATED_SHA: 88e3c3f`,
  `LAST_CLEAN_VALIDATED_SHA: c18db55`.
- `npm run agent:check` — `PASS with 2 warnings`;
  `tasks=148 strict_v2=117 legacy_v1=31 strict_errors=0 legacy_warnings=41`.
- `npm run validation:universe` — `PASS`, `digest=sha256:b735b90cf16c33f714…`,
  `discovered=432 authoritativeGate=255 classified=177 unclassified=0`.
- `npm run session:status` — `verdict=PASS reason=WORKSPACE_INTEGRITY_SATISFIED`,
  all seven workspace groups PASS, `attention=0`.
- `node bin/quality-gate-spec.mjs` — `PASS`, eleven required groups,
  `definitionDigest=sha256:4e676246bbfce731…`.
- `openspec doctor` — `OpenSpec root: ok`.

Recorded receipts at the last validated implementation `88e3c3f`:
`gate:local` all eleven groups PASS with `receipt:sha256:7945d6ad715fab8479e36d2a`;
full offline regression 4789 passed / 18 skipped / 0 failed; UI typecheck,
63 tests and build PASS; browser lane 4 passed / 0 failed.

None of this is re-opened by this programme. The completion gap is elsewhere.

## F-01 — The change ledger does not describe what is open

`openspec list` reports 57 changes, of which 16 show unchecked task
boxes — 150 open items in total, which reads as the project's remaining work.
Checked against `.agent/tasks/<id>/STATE.md`, which is the continuity-v2
authority:

| OpenSpec change | Ledger reads | `STATE.md` says |
|---|---|---|
| `…residual-closure-and-lane-qualification-v1` | 0/27 | COMPLETE |
| `…repository-hardening-implementation-v1` | 1/19 | COMPLETE |
| `…overnight-reliability-r13-v1` | 1/8 | COMPLETE |
| `…system-map-v2-transport-c15c-v1` | 4/7 | COMPLETE |
| `…system-map-v2-c15b-v1` | 0/11 | COMPLETE |
| `…frontend-consumer-intelligence-c04-v1` | 0/10 | COMPLETE |
| `…go-grpc-topology-binding-c03-v1` | 0/11 | COMPLETE |
| `…protobuf-source-intelligence-c02b-v1` | 0/12 | COMPLETE |
| `…production-privacy-firewall-c10-v1` | 21/24 | COMPLETE |
| `…truncation-truth-discovery-paging-c01-v1` | 7/8 | COMPLETE |
| `…continuous-deep-hardening-v1` | 0/10 | COMPLETE |
| `…post-acceptance-production-hardening-…-v1` | 0/15 | COMPLETE |
| `…operational-acceptance-v1` | 5/10 | COMPLETE |
| `…final-assurance-release-readiness-hardening-v1` | 82/83 | BLOCKED (terminal) |
| `…autonomous-bug-hunting-programme-v1` | 0/18 | IN_PROGRESS (held at W10) |

Fourteen of the fifteen are stale bookkeeping. Exactly one campaign,
`nightwatch-autonomous-bug-hunting-programme-v1`, is genuinely open, and its
`STATE.md` says `Work In Progress: None. No wave is active.` — it is parked
awaiting owner authorization, not mid-flight.

`docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md` line 3 states
`Status: EXECUTION COMPLETE … All fifteen findings are closed`, while its own
OpenSpec change shows 18 of 19 boxes unchecked. The doc is right and the
ledger is wrong.

`openspec list --specs` returns `No specs found`. `openspec/specs/` does not
exist. In 57 changes under a `spec-driven` schema, zero have been archived and
zero capability specs have ever been published, so there is no consolidated
statement anywhere of what this system is required to do — only 57 change
proposals and 17,462 lines of narrative docs.

This is the single largest obstacle to the question "what is left": the
project's own answer surface is untrustworthy.

## F-02 — Four declared validation lanes have never executed

`docs/CURRENT_STATE.md` §"Residual closure and lane qualification" resolves
every declared lane. Six are `PROVEN`. Four are not:

| Lane | Class | Recorded reason |
|---|---|---|
| Exact-checkpoint CI | `BLOCKED_EXTERNAL` | `NO_STEPS_BILLING_OR_PLATFORM_BLOCK`, `stepCount=0` |
| Online dependency advisory | `UNAVAILABLE_CAPABILITY` | needs authorized network egress |
| Owner manual harnesses (12) | `UNAVAILABLE_CAPABILITY` | needs DEV authentication and separate authorization |
| Live-app smoke (6) | `UNAVAILABLE_CAPABILITY` | needs DEV authentication and separate authorization |

Confirmed here against the universe classification: `MANUAL_OWNER=12`,
`LIVE_APP_SMOKE=6`. Eighteen declared checks out of 432 have never run on any
host. `project:check` reports `CI_OBSERVED_SHA: NONE`,
`CI_EXECUTED_SHA: NONE`, `CI_STATUS: NOT_OBSERVED`.

`.github/workflows/hardening.yml` is a single job with a 30-minute budget that
runs `npm run gate:ci`. It has never completed a step at any recent checkpoint.
`docs/ROADMAP.md` records the same zero-step block across Phase 12A, 13I, 14A,
15H, 16H, 16CH, 17, 23, 24, 27 and 28 — eleven consecutive terminal campaigns
whose CI claim is an external block. D-110 records that `gate:clean` cannot
substitute, because it clones into a temp directory on the SAME host and so
certifies checkout cleanliness rather than runner topology. Two real defects
(an absolute sibling source root, an absent Bubblewrap binary) reached a
checkpoint precisely because of that gap.

## F-03 — The product's own purpose has never been demonstrated

Nightwatch exists to find bugs in Alphaus products. Across W7 through W10 of
`nightwatch-autonomous-bug-hunting-programme-v1`, measured in its own
`STATE.md` and re-stated in two independent campaign closures:

- strict `EXACT_REDISCOVERY`: **0**;
- previously-unknown-defect yield: **0**;
- W9 final live campaign: 7 investigations, 28 grounded hypotheses,
  7 reproduction attempts, 7 `NOT_AVAILABLE`, 1 candidate, **0 admissions**,
  1 `MISSING_REPRODUCTION`;
- W10 live series, four HOUR_1 campaigns: reproduction attempts reaching real
  contained execution improved from 0/7 to 6/6, 5/5, 5/5 and 4/6, and
  `NOT_AVAILABLE` waste fell 7/7 → 0/6 — with **zero qualifying current-source
  failures, zero admissions, zero false positives**.

The machinery works; the yield is zero. The residual-closure campaign's own
recommendation names this as the next campaign and states it is "gated on
confirmed provider capability, not on repository work". A bug-hunting framework
that has never admitted a finding is not yet a usable bug-hunting framework,
whatever its gate receipts say.

## F-04 — `POSITIVE_DEPLOYMENT_FACTS` is zero, and it blocks the production path

`src/core/source/censusFigureLedger.ts` is the single derived-figure source.
Its current values:

```
SOURCE_OPERATIONS            1851   (C-05)
ADMITTED_REPOSITORIES           8   (C-05)
DISCOVERED_REPOSITORIES       149   (C-05)
DEPLOYMENT_BINDINGS          1851   (C-08)
POSITIVE_DEPLOYMENT_FACTS       0   (C-08)
SPEC_EXPECTATIONS            2114   (C-09)
OPENSPEC_SCENARIOS            332   (C-09)
```

The master plan's `≥ 900` operations target is met at 1,851, and every
operation carries a binding class. But **zero** operations carry a positive
route → endpoint deployment fact. The master plan states the consequence
directly: without C-08b read-only access to `mochi`'s
`services/{env}/{appproxy,serviceproxy}/ingress.yaml`, "P2 grants authority
from an `INFERENCE`, violating `I-3`".

So C-13 (bounded active production reads) and C-14 (bounded production replay)
are not merely unauthorized — they are structurally unreachable. No owner
authorization can unblock them while this figure is 0. C-08b is recorded as
organizationally blocked and is the true critical-path item.

## F-05 — The CLI surface has no contract, and one invocation proved it

`package.json` declares 110 scripts over 62 `bin/*.mjs` entry points. Measured:
28 of 62 bins mention `--help`; 34 do not. `bin/lib/` contains five shared
modules, none of which is an argument parser.

Demonstrated in this session: `node bin/quality-gate.mjs local --help` did not
print help. `bin/quality-gate.mjs:178` reads `process.argv[2]`, ignores every
later argument, and began executing the full authoritative gate. The command
had to be terminated after two minutes. A user asking a read-only question got
a multi-minute side-effecting run.

This is a direct contradiction of the repository's own fail-closed culture:
`bin/nightwatch.mjs` refuses with `fail-closed — no environment selected` when
given no `--env`, while the gate silently accepts an unknown flag. Unknown
arguments are accepted somewhere and refused elsewhere, with no stated rule.

There is also no single discovery surface. An operator's route into 110 scripts
is `README.md` prose plus reading `package.json`.

## F-06 — Evidence growth is bounded on paper, unbounded on disk

Measured in the canonical checkout:

- `artifacts/` — **919 MB**, 13,389 entries;
- 19 separate `test-results*` directories at the repository root, dating from
  2026-08-09 onward;
- `.tmp-narrow-test/` (920 K), `.tmp-narrow-test2/` (920 K),
  `.tmp-nightwatch/` (4.1 M), `.tmp-test/` (20 K).

All are correctly `.gitignore`d — nothing is tracked, and no privacy boundary
is crossed. The defect is operational, not safety-related: `R-06` delivered a
refusal-first retention capability and measured 13,368 entries, 204 refused,
13,164 candidates, ~670 MB reclaimable, then removed nothing because `--apply`
is the owner's decision. That decision has not been taken, no reclaim has ever
run, and `npm run hygiene:clean` does not address the nineteen historical
`test-results*` roots at all. A fresh clone plus one full regression is cheap;
this working copy is not.

## F-07 — Workspace and continuity drift that every guard reports as PASS

`npm run session:status` returns `verdict=PASS` and simultaneously reports:

```
self=canonical class=CANONICAL_MAINTENANCE branch=main
  task=nightwatch-control-center-render-truth-v1
worktree nightwatch-repository-hardening--e7b9be89 class=OWNED_SESSION
  task=nightwatch-repository-hardening-implementation-v1 live=true
```

The canonical checkout holds a `MAINTENANCE` claim naming
`nightwatch-control-center-render-truth-v1` — two campaigns stale; the active
task is `…style-and-absence-truth-v1`. And a live `OWNED_SESSION` worktree is
held open for `nightwatch-repository-hardening-implementation-v1`, whose
`STATE.md` says COMPLETE. R-05 released two stale worktrees and left this
class of drift able to recur, because the guard checks structural validity of a
claim, never whether the claim's task is still open.

`agent:check` additionally reports 31 legacy v1 task records carrying 41
warnings, never migrated and never declared permanently historical — a residual
item explicitly listed in the residual-closure change and left unchecked.

R-05 also recorded 16 non-merged branches "deliberately left for an owner
decision". That decision has not been taken.

## F-08 — Current truth is reachable only by knowing where not to look

`docs/` totals 17,462 lines across 11 files: `CURRENT_STATE.md` 3,999,
`DECISIONS.md` 4,663, `ROADMAP.md` 3,084, `ARCHITECTURE.md` 2,198,
`SAFETY_MODEL.md` 1,571. `docs/HOST-CAPABILITY-MATRIX.md` §5 states the problem
in the project's own words: these are "append-heavy historical records … in
which current and historical truth are interleaved", and directs the reader to
five documents instead.

That §5 short list is the right mitigation and it is unenforced. Nothing
mechanically prevents a future campaign from appending a status word to
`CURRENT_STATE.md` that contradicts the live-state v2 block, and nothing
detects a historical status word being read as current. `project:check` guards
one bounded block inside a 3,999-line file. The census ledger (F-04) guards
figures. Neither guards status words.

## F-09 — Control Center residual truth, stated by its own closure

`nightwatch-control-center-style-and-absence-truth-v1` closed A-01..A-04 and
recorded, verbatim, what it did not do:

- "Native form controls remain statically covered only" — they are excluded
  from the runtime computed-effect sweep because this browser environment
  forces their computed colours;
- "whole-stylesheet dead-rule detection is unperformed" — the guard proves
  every rendered class has an effective rule, never that every rule has a
  class. The map's four dead tone rules were found by hand;
- an evidence-status colour taxonomy for the system map is "recorded as
  deferred owner-facing work" — the map renders flat because the 13-value core
  evidence vocabulary and the removed 4-value stylesheet never intersected.

## F-10 — Contained DEV semantic acceptance has been blocked for four weeks

`docs/ROADMAP.md` records `PHASE_9B_STATUS: BLOCKED` /
`PHASE_9B_DEV_RESULT: NOT_PROVEN` /
`PHASE_9B_BLOCKER: PHASE_9B_BLOCKED_HUMAN_AUTH_ACTION_REQUIRED` since
2026-08-16. Phase 10A explicitly proved LOCAL/SYNTHETIC detection depth only and
states that any Phase 10B contained DEV acceptance requires separate owner
authorization. The semantic oracle layer — `src/oracles/**`, 54 files, 14,359
lines — has therefore never been evaluated against a real application.

## F-11 — The dependency argument rests entirely on reachability

`docs/HOST-CAPABILITY-MATRIX.md` §4 records `vue@2.6.12` as **END OF LIFE**
upstream, retained on a reachability argument alone, with four named review
conditions and a review date of 2026-09-09. It also states plainly that
`npm audit` and any registry-backed advisory query are `UNAVAILABLE`, not
clean: "An absent scan is never a passing scan." Four dependencies total, all
dev-only. The exposure is small and the accounting is honest — what is missing
is the one lane that could close it, and a scheduled re-review.

## F-12 — No stated definition of "done" for the project as a whole

`PROJECT_COMPLETION_STATUS` is `OPERATIONALLY_ACCEPTED`. Every recent campaign
closure states that it "preserved, not advanced" that status, and
`PROJECT_VERDICT_EFFECT: PRESERVE` appears in each. Nothing states what would
advance it. §7 of the master plan is a repository-level definition of done for
that plan's fifteen findings, not for the product.

The result is that "production-usable" has no mechanical meaning here, so no
campaign can ever be the last one. This programme's final capability exists to
fix that.

---

# Second pass — tracing the implementation

The findings above (F-01 … F-12) came from validators, task state and durable
documents. They are true and they are not what the code says. This pass traced
the implementation itself: a full static import graph over 1,088 files, the
`bin` → `src` dynamic loading boundary, the persisted-schema surface, the
Control Center request path end to end, the UI's error path, the configuration
surface, and the structural-rule engine.

## What the second pass checked and found sound

Recorded so the backlog is not read as a list of everything that was looked at.

- **Type safety.** `strict: true` and `noUncheckedIndexedAccess: true` at the
  root; 2 `as any` in all of `src`, 0 `@ts-ignore`/`@ts-expect-error`, 0 empty
  `catch` blocks.
- **The Control Center HTTP surface.** Bound to `127.0.0.1` only and rejects
  any other host at construction; `Host` and `Origin` validated against the
  live port (DNS-rebind); `maxHeaderSize` 8 KiB; `headersTimeout` and
  `requestTimeout` 5 s, `keepAliveTimeout` 1 s; `clientError` destroys the
  socket; the body reader enforces its cap on bytes *received*, not on the
  declared `Content-Length`; percent-encoded traversal screened on the path
  and deliberately not on the query, with the reason recorded; the write route
  requires a custom header (CSRF) and rejects any query string.
- **The SSE hub.** NW-12's per-client bound is real: newest-frame-only
  retention, heartbeats dropped under backpressure, two independent
  disconnect bounds, one `drain` listener per client, counters-only
  diagnostics.
- **The snapshot coordinator.** In-flight coalescing per key, bounded TTL and
  entry count, a failed refresh never served as `CURRENT`.
- **`GH_TOKEN` / `GITHUB_TOKEN`.** Suspected as an egress surface; it is not.
  `bin/quality-gate.mjs:22` strips both from every child environment, and they
  are forwarded deliberately and only to the two `gh`-based CI observers.
- **`read()` in the structural gate.** Fails closed on a missing file rather
  than returning `''` — the trap that would have silently passed every rule
  over a renamed file is not present.
- **Persisted-state validation.** The review store checks prototype, exact key
  set, status, instant format and every version field, and refuses on any
  mismatch. The campaign checkpoint refuses an unknown runtime contract
  version rather than resuming across it.

## F-13 — 904 lines of confirmed dead architecture, one of it load-bearing by design

A static import graph over 1,088 files, corrected for the dynamic `bin` → `src`
loader, resolves to two subsystems with **zero references to any export,
anywhere in `src`, `tests`, `bin` or `ui`**:

| Subsystem | Files | Lines | Exports checked | References outside its own directory |
|---|---|---|---|---|
| `src/core/dtoFramework/` | 4 | 519 | 18 | 0 |
| `src/core/adversarialCorpus/` | 2 | 385 | 12 | 0 |

Both typecheck, both ship, and neither is counted by anything: the validation
universe is a totality rule over *tests*, so an unreferenced source subsystem is
invisible to it.

`dtoFramework` is the more serious of the two, because of what it is.
`registry.ts` exports `registerDtoKind`, `validateVersionedDto`,
`getReadableDtoVersions`, `hasDtoKind` and `stableUnderlyingErrorCode`;
`types.ts` defines `DtoVersionValidator`, `DtoCoherenceRule` and
`DtoCoherenceViolation`; `builtinRegistrations.ts` registers the semantic
evaluation receipt, the triage replay plan, the campaign manifest and the
campaign checkpoint. It is a versioned-DTO registry with per-version validators
and cross-field coherence rules — precisely the abstraction F-17 below shows the
system needs — built, registered, and never wired to a single consumer. Each of
the 319 schemas hand-rolls its own validation instead.

This is a placeholder implementation at the architectural level: the
abstraction exists, the system does not use it, and nothing detects the gap.

## F-14 — eleven module barriers that nothing imports

Eleven `index.ts` barrels have zero importers:

```
src/controlCenter/index.ts              src/core/prodProvenance/index.ts
src/core/campaignIntelligence/index.ts  src/core/provenance/index.ts
src/core/dtoFramework/index.ts          src/core/reproductionSurface/index.ts
src/core/investigationMemory/index.ts   src/core/selfDevSandbox/index.ts
src/core/localInvestigation/index.ts    src/core/systemAtlas/index.ts
src/core/ownerLocalReproduction/index.ts
```

Each declares a module's intended public surface — `campaignIntelligence`
exports 15 symbols, `selfDevSandbox` 10, `localInvestigation` 6 — and every
consumer reaches past it into deep paths instead. The boundary these files
declare is therefore not the boundary the system has, so a module's public
surface cannot be reasoned about, narrowed, or guarded. `src/controlCenter/index.ts`
is the clearest case: the Control Center's own entry point is unused, and
`bin/nightwatch-control-center.mjs` loads `server/server.ts` directly.

## F-15 — there is no static contract between the CLI and the implementation

The 62 `bin/*.mjs` entry points reach the TypeScript implementation through
`bin/lib/typescript-runtime-loader.mjs`, which transpiles a module at runtime
from a **string path**. Measured: **198 distinct `src/**/*.ts` paths referenced
as string literals** across the bins, 69 `loadTypeScriptModule(` and 13
`loadTypeScriptModules(` call sites.

All 198 paths currently resolve to real files — that was verified here. Nothing
verifies it continuously, and nothing verifies anything past the path:

- `tsconfig.json` `include` is `["src", "tests", "scenarios", "config",
  "corpus", "playwright*.config.ts"]`. **`bin/**` is excluded by construction**,
  so ~14,000 lines of the shipped command surface get no type checking at all.
- The `BIN_SYNTAX` lane is `node --check` — a parse, not a resolution and not a
  type check.
- Only **3 of 62** bins have a `.d.mts` declaration
  (`agent-continuity-protocol`, `agent-state`, `planner-handoff-protocol`).
- **12 bins are not mentioned in any test**: `efficacy-corpus`,
  `frontier-determinism`, `phase22-dev`, `phase22-real`, `phase23-ci`,
  `phase23-dev`, `phase23-predev`, `phase2b-real`, `phase9b-real`,
  `review-mutation-campaign`, `selfdev-provenance`, `semantic-compat`.

So a renamed export, a changed signature, a moved module or a reordered
parameter is caught by neither `typecheck` nor `node --check`, and surfaces only
when that specific bin executes. For twelve of them, nothing ever executes them.
This is the largest untested, untyped surface in the repository, and it is the
surface an operator actually touches.

## F-16 — the structural-invariant authority is untyped JavaScript matching text

`bin/hardening-check.mjs` is 4,376 lines — the single largest file in the
repository — and is the authority for every offline structural invariant,
including the validation-universe completeness rule that makes R-12's totality
rule work. It is plain JavaScript excluded from `typecheck`.

Its 70 `check*` rules are all called — verified here by comparing definitions to
call sites, so the dead-rule class is absent. What they assert is the concern:
**644 `.test(` and 84 `.includes(` matcher calls over the text of 198 source
files**. `withoutComments()` exists and is applied at 72 sites. Thirteen
assertion sites apply a matcher directly to `read(...)` with no comment
stripping, and **five of those are fail-if-absent positives** — lines 108, 184,
863, 1868 and 3697 — where a comment containing the matched text satisfies the
rule while the code does whatever it likes. Line 108 is the sharpest example:

```js
if (!/env\s*!==\s*['"]dev['"]/.test(read(file))) fail(`${file} does not enforce DEV-only automated credential execution`);
```

The rule that proves DEV-only credential execution is satisfied by the string
`env !== 'dev'` appearing anywhere in the file, including in a comment
explaining why the check exists.

Thirty-six sites use `matchAll`/global match, so most rules are not
occurrence-complete either: a single safe occurrence can satisfy a rule while
another line in the same file is unsafe.

## F-17 — 319 versioned schemas, no migration, and the owner's data is the cost

`src` declares **319 distinct `nightwatch.<name>.v<n>` schema identifiers**, and
**25 names already carry more than one version** — `bug-dossier.private` has 18
version literals, `real-source-expectation-recipe` 15,
`minimization-budget.private` 13, `quality-gate-receipt` 6.

Persisted state fails closed on any mismatch, which is right, and there is no
path forward from it, which is not:

- `src/core/reviewStore/store.ts:102` — `record.schemaVersion !==
  REVIEW_STORE_SCHEMA_VERSION` ⇒ `REVIEW_STORE_VERSION_UNSUPPORTED`; same for
  `lifecycleVersion` and the receipt's `schemaVersion`. The read policy's four
  answers are `NO_REVIEW`, `CURRENT`, `STALE`, `CORRUPT` — there is no
  `MIGRATABLE`.
- `src/core/campaign/checkpoint.ts:341` —
  `CAMPAIGN_CHECKPOINT_RUNTIME_CONTRACT_VERSION_UNSUPPORTED` refuses the resume.

Reviews live in `$HOME/.nightwatch/reviews`, are keyed by their complete
binding, are never overwritten and are never deleted automatically. They are the
owner's accumulated judgement and the most valuable state the system holds. One
schema bump makes every one of them unreadable, with no migration, no export, no
warning at bump time, and no count of what was orphaned. The same bump abandons
every in-flight campaign checkpoint.

Nothing today tells an author that a version literal they are editing is a
persisted one.

## F-18 — the UI produces five error kinds and renders one

`ui/control-center/src/types.ts:432`:

```ts
export type ApiErrorKind = 'NETWORK' | 'HTTP' | 'INVALID_RESPONSE' | 'TIMEOUT' | 'ABORTED';
```

`api.ts` produces all five correctly and carries the HTTP status alongside:
`ControlCenterApiError` has both `kind` and `status`, the fetch path
distinguishes a timeout from a caller abort from a transport failure, and it
raises `INVALID_RESPONSE` when the payload fails the client-side contract
validator.

`App.tsx` reads neither field. Thirteen error sites collapse to one shape:

```
if (state.kind === 'error') return <DataErrorState title="Run list unavailable" onRetry={onRetry} />;
```

The operator consequence is not cosmetic. `INVALID_RESPONSE` means the server
returned a payload the client's own contract rejected — a genuine
server/client contract mismatch, exactly the defect class this project builds
guards for — and it is presented as a transient failure with a retry button
that can never succeed. A `404` from a deliberately disabled capability reads
identically to a `503`, and both read identically to a dropped connection.

This is the same defect the four Control Center campaigns closed on the success
path: data fetched, carried across the boundary, never rendered. Their guards do
not catch it because both the contract-coverage and the differential-render
guard operate on **snapshot contracts**, and `ApiErrorKind` is not a snapshot
field — it only exists on the failure path, which the fixture generator never
produces.

## F-19 — nineteen undocumented environment variables, one of which names an executable

`.env.example` documents 7 variables. `src` and `bin` read **26**, and some are
assembled by string concatenation at runtime (the scan recovers fragments such
as `NIGHTWATCH_L` and `NIGHTWATCH_PHASE_`), so the true surface cannot be
enumerated statically at all.

Undocumented and operationally significant:

| Variable | Effect |
|---|---|
| `NIGHTWATCH_REASONER_CLI` | names the executable the agent runtime spawns; defaults to `process.execPath` |
| `NIGHTWATCH_REASONER_SCRIPT` | an argument pushed into that command line |
| `NIGHTWATCH_REASONER_PROVIDER`, `NIGHTWATCH_REASONER_MODEL` | provider identity recorded in evidence |
| `NIGHTWATCH_PROXY_LEASE_PATH`, `NIGHTWATCH_PROXY_LEASE_TOKEN`, `NIGHTWATCH_PROXY_PORT` | the outer containment proxy's lease |
| `NIGHTWATCH_HEADED` | whether the browser is visible |
| `NIGHTWATCH_PRINT_CLI`, `NIGHTWATCH_PRINT_ARGS`, `NIGHTWATCH_PRINT_DEBUG` | the print-reasoner path |
| `GOMODCACHE`, `TMPDIR`, `LANG`, `PATH`, `HOME` | inherited host surface |

`bin/nightwatch-agent.mjs` does refuse to start when no reasoner CLI is
configured (`REASONER_CLI_NOT_CONFIGURED`), which is the right shape. What is
missing is that the configuration surface has no declaration, no validation and
no documentation: an operator cannot discover it, and a typo in a variable name
is silently a default rather than an error.

`config/environments/*.json` are loaded with a name check
(`local | dev | next`) and no schema validation of the host lists themselves.

## F-20 — the only human-facing surface has no accessibility evidence

Three separate campaign closures state "no formal accessibility certification"
as a thing not claimed. None scheduled one. Measured in
`ui/control-center/src/`:

- `App.tsx` is **1,786 lines** in one file, holding all nine views, 36
  components and 68 hook call sites. `main.tsx` is 9 lines; there is no router,
  no view module, no component directory.
- 53 `aria-*` attributes and 16 `role=` attributes, added ad hoc.
- **No `axe`, `jest-axe` or any accessibility tooling** in the UI's
  dependencies; 8 lines across five test files mention aria, role, keyboard or
  focus at all.
- 125 `color:` declarations with no contrast measurement anywhere.

The style campaign proved every rendered class changes a computed property. It
did not, and could not, prove that any of those changes is perceivable. For a
surface whose entire purpose is letting a human distinguish `FACT` from
`RECOMMENDATION` from `UNKNOWN`, and `PROVEN` from `UNPROVEN` from `TRUNCATED`,
colour-only encoding with no contrast evidence is a correctness gap, not a
polish item.

## F-21 — autonomy expires with a cookie

`bin/auth-capture.mjs` is explicit about what it is: a **human-led interactive
capture**. It launches a headed Chrome, the human performs login and MFA, and
Nightwatch writes a Playwright storage-state file to an owner-supplied absolute
path outside the repository. Nightwatch never receives the credentials — the
design is right.

The consequence is structural. Every authenticated capability in the system
depends on that artefact: the 12 `MANUAL_OWNER` checks, the 6 `LIVE_APP_SMOKE`
checks, Phase 9B/10B DEV semantic acceptance, `journey:phase2c`,
`explore:phase4`, `api:phase5`, `campaign:real`, and C-12 passive observation.

`src/browser/fixtures/storageState.ts` reasons carefully about cookie expiry
when *reading* a state file — `expired`, `hasFutureExpiry`, session cookies
treated as unexpired for the session. There is no corresponding lifecycle for
the artefact itself: no recorded capture time, no declared validity window, no
staleness check before a lane starts, and no signal that says "your captured
state has expired; re-capture before running". `src/auth/directRunner.ts` and
`src/auth/devCredentialProvider.ts` contain zero occurrences of `expir`.

A framework designed to run bounded overnight campaigns has an authentication
model that silently stops working between one night and the next, and reports
it as whatever failure the expired session happens to produce downstream.
