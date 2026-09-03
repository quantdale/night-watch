# C-05 Universe Discovery + Admission Hygiene — Report

- Starting SHA: `210cd0c8732a7ea5ba5aa5b7eef146d4f001d277`
- Resulting SHA: Live HEAD: DISCOVER_FROM_GIT
- Substantive implementation anchor: `4e0bfc19ea6794344c786b55034568e64fd7dfac`
- Certified exact-head checkpoint: `4e0bfc19ea6794344c786b55034568e64fd7dfac`, run `33796281169`
- Task objective: separate discovery from admission, make the owner-approved
  universe a single authority, stop persisting mutable Git state as normative
  configuration, prove at the read boundary that an unapproved repository is
  never read, and admit exactly the two owner-named repositories.
- Safety events: NONE
- Remaining blockers: none.
- Recommended next phase/task: C-08 deployment-fact binding.

## Measured baseline and result

| Measure | Before | After |
|---|---|---|
| git repositories discovered (depth ≤ 3) | 149 | 149 |
| repositories admitted | 6 | **8** |
| discovered but unapproved | 143 | 141 |
| source operations | 1,745 | **1,851** |
| blueapi / ouchan / ripple-api | 1,181 / 341 / 223 | 1,181 / 341 / 223 (unchanged) |
| blueinternal / wave-api | — / — | **51 / 55** |
| dropped operations | 0 | 0 |
| enumeration completeness | TRUNCATED, `remainingUnknown: true` | TRUNCATED, `remainingUnknown: true` |

The historical `≥ 900 operations` programme goal was **already exceeded at
1,745 before this campaign admitted anything**, so it is reported as an
observation and never used to justify an admission or a relaxed
classification. Enumeration remains TRUNCATED: admitting source did not
launder completeness into a clean number.

Static prediction matched parser output exactly — 51 and 55 were measured from
the artifacts before any code changed, and the parsers produced 51 and 55.
That agreement is the evidence that reusing the existing parsers was sound
rather than lucky.

## The three defects C-05 was authorized to fix

**Admission had two authorities.** `PHASE25_APPROVED_REPOSITORY_IDS` was
`RIPPLE_REPOSITORIES.filter(scope === 'IN_SCOPE')` INTERSECTED with the keys of
a local `APPROVED_ROOTS` literal, across two files. Neither was the
owner-approved universe; the membership rule was an intersection nobody had
written down, and a repository present in one record and absent from the other
was SILENTLY not admitted. Silence in the direction of reading less looks safe
and is unfalsifiable — you cannot distinguish a deliberate exclusion from a
bookkeeping slip.

`src/core/source/universe.ts` is now the single authority; `approvedScan.ts`
projects from it and holds no allowlist. `reconcileUniverseWithDependencyMap`
throws on EITHER direction of disagreement, because the two readings — the
owner approved a repository the model does not know, versus the model claims a
repository nothing may read — are not interchangeable and neither is guessable.

**Discovery did not exist.** There was nowhere to say "we can see 149
repositories and may read 8". `classifyDiscoveredRepositories` is
admission-free: it consults the authority and nothing else, never file
contents. `NON_ADMISSION_PROPERTIES` names the seven plausible shortcuts that
grant nothing, and two of them genuinely hold for `blueinternal` — it HAS an
OpenAPI document and it DOES sit beside the admitted `blueapi` — which is
exactly why they are named. An owner authorization is the reason, not adjacency.

**Mutable Git state was persisted as normative configuration.** Measured
against live Git with no fetch, the split was sharp: the checkout-local fields
(`checkedOutSha`, `branch`, `dirty`) were **18/18 accurate** because the
working copies had not moved, while the remote-relative fields (`trackingSha`,
`ahead`, `behind`) were **10/18 diverged** because the remotes had.

| Repository | persisted `behind` | live `behind` |
|---|---|---|
| `mobingilabs/ouchan` | 25 | **310** |
| `mobingilabs/ripple-ui` | 21 | **74** |
| `alphauslabs/blueapi` | 2 | **15** |
| `mobingilabs/ripple-api` | 0 | **12** |
| `alphauslabs/blue-sdk-go` | 1 | **6** |

The consequence was real, not latent: `bin/change-intelligence.mjs` published
those values in its shadow report under `freshness: LOCAL_TRACKING_REF_ONLY` —
a provenance label it did not have, having read a literal rather than a ref.
Those fields are gone from `RepoDefinition` and are observed from local refs at
report time, which now reports `ouchan` at 310.

`checkedOutSha` and `sourceMapSha` REMAIN, and that is deliberate: they are
PINS, not observations. `checkedOutSha` is what makes a staleness check
possible at all, and replacing it with a live read would make every such check
vacuously pass — a silent rebind, strictly worse than a stale value.

## The unapproved-read guarantee moved from output to call

`operations === 0` is a property of OUTPUT: an analyzer that opened every file
and derived nothing satisfies it exactly as well as one that opened nothing.
The sibling-source boundary — the single read path — now keeps a per-repository
ledger of `attempts`, `contentReads` and `admissionRefusals`, and enforces the
owner-approved set itself rather than relying on which repositories a scan
config happened to list. The intelligence CLI and the Control Center source
authority both pass it, so the gate is live in the real paths.

Three details decide whether the ledger is worth anything, and each is tested:
a refused enumeration returns a rejection REASON rather than an empty entry
list, because a refusal that looks like an empty repository is the ambiguity
the ledger exists to remove; git metadata is refused too, since currentness
could otherwise confirm existence and HEAD without "reading source"; and an
empty admitted ARRAY (admits nothing) is distinguished from an omitted OPTION
(enforces nothing, the pre-C-05 behaviour), because conflating them would
silently disable the gate for every unmigrated caller.

Proven against repositories that really exist on disk: `alphauslabs/blue`,
`mobingilabs/ripple-web` and `alphauslabs/bluectl` yield six attempted reads,
zero content reads and six counted refusals. Shown non-vacuous by the converse.

## Defects

| ID | Class | Summary |
|---|---|---|
| DEF-C05-1 | PRE_EXISTING | `npm run change:shadow` was broken at HEAD in both topologies: three modules gained imports outside their directory, moving tsc's inferred `rootDir` to `src/core` and the emitted entry to `changeIntelligence/index.js` while the script imported `index.js`. `rootDir` is now pinned to `src`. |
| DEF-C05-2 | PRE_EXISTING | The repositories root was `resolve(nightwatchRoot, '../..')`, which is `$HOME/.nightwatch` from a session worktree, so every git call failed with `ENOENT`. Forbidden by `AGENTS.md`; a hardening rule already guarded two other surfaces and this one had never been added. |
| DEF-C05-3 | PRE_EXISTING | The shadow report published persisted tracking state under `freshness: LOCAL_TRACKING_REF_ONLY`, a provenance label it did not have, reporting `ouchan` as 25 behind when it was 310 behind. |
| DEF-C05-4 | CAMPAIGN_INTRODUCED | Admitting `blueinternal` without registering its generated-artifact root left 51 operations qualified `DIRECT_SOURCE`, presenting generated output as hand-written source AND bypassing the deny-only production-admission gate. Caught by this campaign's own regression. |
| DEF-C05-5 | CAMPAIGN_INTRODUCED | A C-05 case required real sibling content with no skip guard, so it passed locally and failed exact-head CI — the exact local-versus-gate divergence R-12 existed to make visible. |

All five are reported rather than hidden because they were fixed.
DEF-C05-1 through DEF-C05-3 were invisible to every gate group, because none
runs `change:shadow`.

## Brittle assertions repaired, in two classes

The regression's eight failures were one real defect (DEF-C05-4) and seven
assertions that pinned the state of their day.

**Universe EQUALITY.** C-02b and C-03 each asserted the approved set equals
exactly the six repositories of their day, to defend "MY campaign admitted no
repository" — which defends it by asserting nobody ever admits anything. Both
now assert CONTAINMENT of the six they inherited. The universe's exact size is
asserted ONCE, in C-05's own suite, where a ninth repository fails loudly.
Three tests also used `blueinternal` as their unapproved example and now use
`alphauslabs/blue`, which is genuinely unapproved.

**Identity UNDER-SPECIFICATION** — the more interesting class, because these
were not merely dated. Two assertions identified an artifact by `sourcePath`
alone, silently assuming no two repositories could hold a file at
`openapiv2/apidocs.swagger.json`; `blueinternal` holds one at exactly that
path. A third compared the GLOBAL `generatedArtifactOperations` counter against
blueapi's own count, sound only while blueapi was the only admitted generated
root. The repository is now part of the identity in all three.

Separately, the C-10 privacy cone kept a hand-maintained COPY of the approved
set, to avoid importing the scan config and breaching A8. C-05 removed the
duplication rather than updating the copy: the cone derives from
`universe.ts`, a zero-import frozen-data leaf, so A8 holds by the dependency
being data-only — a stronger guarantee than two literals a test must keep equal.

## Process errors, recorded rather than buried

The negative probes restore with `git checkout --`. Run against files whose
C-05 changes were not yet committed, that "restore" discarded the changes
under test instead of reverting the probe. It happened TWICE: first losing the
`types.ts`, `approvedScan.ts` and `change-intelligence.mjs` edits, then losing
a freshly added hardening rule — which made a probe report NOT DETECTED for
the honest reason that the rule no longer existed. Both were caught by
VERIFYING the restore rather than trusting it, and all lost work was
reconstructed and re-verified. Commit-then-probe was adopted and followed for
the remainder. This is the destructive-restore hazard the repository's
Git-safety rules name, and it is recorded because the final 11/11 probe result
would otherwise read as clean evidence with no history.

## Validation

| Check | Result |
|---|---|
| `typecheck`, `hardening:check`, `handoff:check`, `project:check`, `agent:check`, `workspace:check`, `gate:inventory` | all PASS |
| `tests/unit/c05UniverseAdmission.test.ts` | 28 passed / 0 failed |
| negative probes Q1–Q11 | **11/11 DETECTED**, all restored, tree clean after each |
| canonical regression, first attempt | 8 FAILED — triaged, not retried |
| **canonical regression** at `85dd8a6` | **3,457 / 3,444 / 13 skipped / 0 failed**, 0 failure blocks |
| **`gate:local`** at `85dd8a6` | PASS, eleven groups, receipt `receipt:sha256:0cc29da4b4503cd981855940`, synthetic lane 767/767 |
| **`gate:clean`** at `85dd8a6` | PASS, eleven groups, Node 20, **`siblingWrites: 0`**, inner `receipt:sha256:841e75dcd27b04660842fa24`, outer `clean-receipt:sha256:3832909fbab478cff4828f50` |
| exact-head CI, first attempt | run `33795270499` at `8cb055c` FAILED — one location, DEF-C05-5 |
| **exact-head CI** | **PASS**, run `33796281169` / `4e0bfc1`, eleven groups, Node 20, receipt `receipt:sha256:f313d77bf52b8b06dbde2e5c` |

## CI skip accounting

| `SYNTHETIC_CAMPAIGN` | total | passed | skipped | failed |
|---|---|---|---|---|
| `5cc7835` (post-R-12) | 738 | 704 | 34 | 0 |
| `8cb055c` (first C-05 attempt) | 767 | 732 | 34 | **1** |
| `4e0bfc1` (certified) | 767 | 732 | **35** | 0 |

C-05 added 29 cases: **28 execute in CI and exactly 1 skips** — the single case
needing real sibling content. The middle row is retained because it shows the
repair transformed a failure into a truthful skip rather than removing a test.

**Scope stated plainly:** CI verifies the deterministic authority, discovery,
ledger and de-persistence properties. The real-source YIELD figures — 51
blueinternal and 55 wave-api operations, and the 1,851 population — are
verified against the actual checkouts LOCALLY, because CI has no sibling
repositories. That is the same scope C-02a's 591 has always had, and it is
stated rather than implied.

## Requirement ledger

| # | Acceptance requirement | Status | Evidence |
|---|---|---|---|
| 1 | Discovery exists as an admission-free operation | PASS | `classifyDiscoveredRepositories`; 7 suite cases including truncation and admitted-but-not-discovered |
| 2 | Admission is a single owner-approved authority; no hidden allowlist | PASS | `universe.ts`; `approvedScan.ts` holds no `APPROVED_ROOTS`; probes Q1, Q2, Q8; the C-10 cone duplication removed |
| 3 | Mutable Git state no longer persisted as normative config | PASS | 5 fields removed from `RepoDefinition` and every map entry; pins retained; probes Q3, Q4, Q6, Q7 |
| 4 | `unapproved repository → analyzer source reads = 0`, proven at the read boundary | PASS | per-repository ledger; 7 cases incl. three REAL unapproved repositories at 0 content reads / 6 refusals; probes Q9–Q11 |
| 5 | `blueinternal` admitted; `openapiv2` yield measured; no duplicate parser | PASS | **51 operations** through the existing `parseOpenApiRoutes`; `GENERATED_ARTIFACT` qualifier; currency `UNKNOWN`/`GENERATION_CORROBORATOR_UNAVAILABLE` |
| 6 | `mobingilabs/wave-api` admitted with a justified root set; yield measured | PASS | **55 operations** through the existing YAML parser, no parser change; identity established from workspace truth |
| 7 | No third previously unapproved repository admitted | PASS | `ownerApprovedRepositoryIds()` asserted as an exact eight-item literal; `C05_ADMITTED_REPOSITORY_IDS`; probe Q1 |
| 8 | C-01 no-eviction holds as a subset relation | PASS | `sourceOperationCompleteness` and C-02a's C-01 invariants both pass; blueapi/ouchan/ripple-api counts unchanged |
| 9 | Source population reported in full | PASS | the table above; `droppedOperations: 0`; enumeration still TRUNCATED with `remainingUnknown: true` |
| 10 | Regression, local, clean and exact-head CI green; siblingWrites 0; released | PASS | regression 0 failed; both gates PASS; CI PASS at `4e0bfc1`; `siblingWrites: 0`; session released |

Status: COMPLETE
