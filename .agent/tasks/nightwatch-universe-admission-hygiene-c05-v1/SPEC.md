# SPEC — C-05 Universe Discovery + Admission Hygiene

Task ID: nightwatch-universe-admission-hygiene-c05-v1
Phase: UNIVERSE_ADMISSION_HYGIENE_C05_V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 210cd0c8732a7ea5ba5aa5b7eef146d4f001d277
Predecessor Task ID: nightwatch-certification-truth-r12-v1
Predecessor Status: COMPLETE
Authorization class: NIGHTWATCH_UNIVERSE_ADMISSION_HYGIENE_C05_V1

## Frozen intent

Separate DISCOVERY from ADMISSION, make the owner-approved universe a single
authority, stop persisting mutable Git state as normative configuration, prove
mechanically that an unapproved repository is never READ, and admit exactly the
two owner-named repositories — `alphauslabs/blueinternal` and `wave-api` — and
no third.

A repository discovered is not a repository admitted.

## Measured starting state

| Measure | Value |
|---|---|
| git repositories discovered under the sibling root (depth ≤ 3) | **149** |
| repositories admitted | **6** |
| repositories discovered but unapproved | **143** |
| source operations | **1,745** |
| operations by repository | blueapi 1,181 / ouchan 341 / ripple-api 223 |
| operation projection limit | 4,096 |
| dropped operations | 0 |
| enumeration completeness | **TRUNCATED** (4,655 files examined, `totalFiles: null`, limit 12,288) |
| content-read completeness | COMPLETE (4,087 read, 4,052 admitted, 0 unreadable) |
| overall population state | **UNKNOWN**, `remainingUnknown: true` |

The historical `~148 discovered` figure is close but is NOT the acceptance
target; 149 is the current measurement. The historical `≥ 900 operations`
programme goal is **already exceeded at 1,745 before this campaign admits
anything**, so it is reported as an observation and is never a reason to
weaken classification.

Admitted repositories today: `mobingilabs/ripple-ui`, `mobingilabs/ripple-api`,
`mobingilabs/ouchan`, `alphauslabs/blueapi`, `alphauslabs/blue-sdk-go`,
`alphauslabs/grpc-chunk-parser`.

## The three defects

**1. Admission has two authorities.** `PHASE25_APPROVED_REPOSITORY_IDS` is
computed as `RIPPLE_REPOSITORIES.filter(scope === 'IN_SCOPE')` intersected with
the keys of `APPROVED_ROOTS`. A repository is admitted only if BOTH agree, so
neither is the owner-approved list and the real membership rule is an
intersection nobody states. Discovery does not exist as a separate concept at
all.

**2. Mutable Git state is persisted as normative source configuration.**
`src/core/changeIntelligence/map.ts` carries `checkedOutSha`, `trackingRef`,
`trackingSha`, `ahead`, `behind` and `dirty` per repository. Measured against
live Git at `210cd0c`, with no fetch and local refs only:

| Field class | Result |
|---|---|
| checkout-local (`checkedOutSha`, `branch`, `dirty`) | 18/18 accurate — the working copies have not moved |
| remote-tracking (`trackingSha`, `ahead`, `behind`) | **10 of 18 diverged** |

The divergence is not marginal: `mobingilabs/ouchan` persists `behind: 25` and
is actually **310** behind; `ripple-ui` persists 21 and is 74; `blueapi`
persists 2 and is 15. The fields that decay are exactly those depending on
something outside the checkout, and nothing detects the decay. This is the
defect: not that a number is wrong today, but that a reader cannot tell, and no
mechanism ever says.

**3. Nothing proves an unapproved repository is unread.** The claim rests on
`operations = 0` for unapproved repositories, which is a claim about OUTPUT.
An analyzer that opened a file and derived nothing would satisfy it.

## Scope

- Discovery as a first-class, admission-free operation over the sibling root.
- One canonical owner-approved admission authority; all consumers derive from
  it; no scanner-specific hidden allowlist.
- Mutable Git state removed from persisted normative configuration and queried
  live when needed; stable identity metadata may stay durable; historical
  snapshots stay historical.
- An instrumented source-read boundary proving `unapproved repository →
  analyzer source reads = 0`, measured at the read call, not at the output.
- `alphauslabs/blueinternal` admitted with root `openapiv2` through the
  EXISTING OpenAPI machinery — no second parser — with generated-artifact
  provenance and currentness.
- `mobingilabs/wave-api` admitted with its justified root set through the
  EXISTING PHP/YAML route parser.
- C-01 no-eviction: every pre-C-05 operation identity survives.

## Measured admission targets

**`alphauslabs/blueinternal`** — present, with `openapiv2/apidocs.swagger.json`
(Swagger 2.0, 111,416 bytes): **46 paths, 51 operations**, all 51 carrying an
`operationId`, 84 definitions. The historical `~57` estimate is HISTORICAL; the
measurement is 51 and 51 is what will be claimed.

**`wave-api`** — its exact identity from workspace truth is
**`mobingilabs/wave-api`**, not a top-level `wave-api`. PHP, 59 `.php` files,
and structurally identical to the already-admitted `mobingilabs/ripple-api`:
`src/App/Route/Config/Routing.yaml`, `src/App/Handler`, `src/App/Middleware`,
`src/App/Route/Providor`. Its route keys use the same `"get:/path":` form the
existing YAML parser already consumes (only the indent width differs, and the
parser is indent-relative): **55 route keys**. So the justified root is `src`
and no new parser is required.

## Non-goals

- No third repository admission. Discovery may surface 149; that grants nothing.
- No new parser where an existing one applies, and no unsound source fact
  created to raise a yield number.
- No weakening of classification, completeness, or truncation honesty.
- No write of any kind to a sibling repository.
- No production, NEXT or DEV contact. C-12 is not begun.

## Absolute invariants

- Discovery never implies admission. Existence, naming, language, organization,
  presence of OpenAPI, having routes, and filesystem adjacency are each
  explicitly insufficient.
- An unapproved repository's source is never opened by an analyzer, and that is
  proven at the read boundary rather than inferred from an empty output.
- No pre-C-05 operation identity is evicted unless the underlying source
  actually changed; the pre-set is a subset of the post-set.
- Completeness stays truthful: `TRUNCATED` and `remainingUnknown` are never
  converted into a clean number by admitting more source.
- Sibling repositories stay READ-ONLY. `siblingWrites` is 0.

## Acceptance

1. Discovery exists as an admission-free operation and reports the current
   universe.
2. Admission is a single owner-approved authority; every consumer derives from
   it; no hidden per-scanner allowlist remains.
3. Mutable Git state is no longer persisted as normative configuration; live
   values are queried when needed.
4. `unapproved repository → analyzer source reads = 0`, proven at the read
   boundary and negative-probed.
5. `alphauslabs/blueinternal` admitted; `openapiv2` yield measured through the
   existing OpenAPI parser with provenance and currentness; no duplicate parser.
6. `mobingilabs/wave-api` admitted with a justified root set through the
   existing parser; yield measured.
7. No third previously unapproved repository is admitted.
8. C-01 no-eviction holds as an asserted subset relation over real populations.
9. Source population reported in full: operations, per-repository, source
   facts, generated artifacts, response contracts, truncation, dropped,
   remainingUnknown, completeness.
10. Canonical regression zero failures; `gate:local` PASS; `gate:clean` PASS;
    exact-head CI PASS; `siblingWrites` 0; session released.

## Declared Deletions

None.
