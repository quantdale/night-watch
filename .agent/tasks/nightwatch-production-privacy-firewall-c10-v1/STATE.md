# Task State

## Identity

Task ID: nightwatch-production-privacy-firewall-c10-v1
Phase: PRODUCTION_PRIVACY_FIREWALL_C10_V1
Status: COMPLETE
Starting SHA: a152889a71eec6c67d82b05e5984df6423fe88d4
Branch: session/nightwatch-production-privacy-fi-5af2d530
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: a152889a71eec6c67d82b05e5984df6423fe88d4
LAST_VALIDATED_IMPLEMENTATION_SHA: 23523cc743c77b2250738caa980c218dab8671bb
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 23523cc743c77b2250738caa980c218dab8671bb
LAST_DOCUMENTATION_CHECKPOINT_SHA: 1234dafd269079de842d138bef86438609a445db
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_PRODUCTION_PRIVACY_FIREWALL_C10_V1_STATUS: COMPLETE

## Objective

Make raw production/customer data structurally incapable of reaching persistent
Nightwatch artifacts: an allowlisted structural projection with no persistence
authority as the primary boundary, an independent persistence firewall as the
second, and the four around-the-boundary leakage paths (F-14 key names, F-16
request parameters, page console output, F-17 browser profile) closed, plus the
F-15 digest confusion and the F-18 Control Center exposure.

## Current Milestone

COMPLETE / STOP — M0 through M12 are closed. C-10 was reopened once after an
apparently clean closure, because a review pass found DEF-C10-5; the repair is
validated locally, on the clean Node 20 gate, and by a fresh exact-head CI run.

## Completed Milestones

- M0 — task records and the OpenSpec change carrying the Workstream A
  persistence-cone audit. `handoff:check` PASS, `agent:check` PASS.
- M1 — Workstream A audit complete in `audit.md`: 16 durable-write sites and 22
  derived-state classes enumerated and classified; the single `UNKNOWN` (the
  existing `proj:sha256:` digest family) resolved by supersession.
- M2 — pure cone landed: `errors.ts` (closed reason/detail vocabularies, a
  constructor that physically cannot accept a free string), `policy.ts`
  (versioned fail-closed capability object), `keyVocabulary.ts`
  (`ProvenKeyVocabulary`), `types.ts` (the three boundary types).
- M3 — `projector.ts`: F-14 resolved. A key literal survives only as a proven
  member of a source-proven finite set; a dynamic key contributes its value's
  structure and the object's cardinality and nothing else.
- M5 — `prodEvidence/firewall.ts`: an INDEPENDENT closed-vocabulary re-walk at
  the durable write plus an independent digest re-derivation.
- M6 — `productionFindingsStore.ts`: `$HOME/.nightwatch/prod-findings/`,
  separate policy identity, 0700/0600, symlink refusal on every path
  component, atomic writes, bounded file count.
- M7 — F-18 resolved: `controlCenterExclusion.ts` plus wiring in
  `findingsAuthority.ts` on BOTH construction routes; Workstream K proved SSE
  is a constructed five-field allowlist that cannot carry a payload.
- M8 — `browserProfile.ts`: ephemeral private profiles, cache and crash dumps
  disabled, normal-exit and crash-path cleanup, categorical console events with
  no field a page string could occupy.
- M9 — `parameterProvenance.ts`: F-16 opaque-handle model with no function
  anywhere that accepts a concrete parameter value.
- M10 — `hardening:check` boundary rule (proven non-vacuous), the full
  acceptance suite (all five §6.5 classes) and the deterministic persistence
  audit; both C-10 suites registered in `config/synthetic-campaign.v1.json`
  (12 -> 14 files).
- M4 — `serializer.ts`: F-15 resolved. `prodstruct:sha256:` is value-free and
  unsalted; NUMBER writes as type alone; no branch emits an encounter token,
  a numeric ref or a dynamic key literal. No durable value digest exists.

## Verified Starting Facts

- `origin/main` = `a152889a71eec6c67d82b05e5984df6423fe88d4`, canonical
  checkout clean, single worktree at campaign start. Repository confirmed
  `quantdale/night-watch`.
- Predecessor `nightwatch-exact-head-ci-baseline-repair-v1` = COMPLETE, its
  validated implementation `b99ce4e61166e52b554dd6ac07b7678b433959da`.
- Session worktree `session/nightwatch-production-privacy-fi-5af2d530` claimed
  as `OWNED_SESSION`; `session:status` verdict PASS, all seven workspace groups
  PASS, `canonicalSafe=true`, `attention=0`.
- F-14 confirmed IN CODE: `src/oracles/projections/types.ts` `ProjectionField.name`
  holds the raw key literal; `serializer.ts:writeField` writes it into canonical
  bytes; `projectionDigest` hashes those bytes. The repository's only digest
  family therefore ingests unproven dynamic key literals — F-14 and F-15
  simultaneously.
- `identity.ts` tokens are encounter-order labels, not hashes, and the context
  refuses serialization. Sound foundation for ephemeral correlation.
- `src/browser/context.ts` uses `browser.newContext()` only; no
  `launchPersistentContext`, no `userDataDir`. F-17's verified finding holds.
- `findingsAuthority.ts:321` resolves the root internally;
  `createFindingsAuthorityForTests(root)` at line 327 accepts an arbitrary root
  — the named F-18 hole.

## Work In Progress

None. The DEF-C10-5 repair is implemented, fully revalidated, integrated and
CI-green.

## Files Changed

- `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md` — activated for C-10.
- `.agent/tasks/nightwatch-production-privacy-firewall-c10-v1/{SPEC,PLAN,STATE,REPORT}.md` — new.
- `openspec/changes/nightwatch-production-privacy-firewall-c10-v1/{audit,proposal,design,tasks}.md`
  and `specs/production-privacy-firewall/spec.md` — new.

## Validation Ledger

| When | Command | Result |
|---|---|---|
| M0 | `node bin/nightwatch-session.mjs status` | PASS — `OWNED_SESSION`, all seven workspace groups PASS, `canonicalSafe=true`, `attention=0` |
| M0 | `git rev-parse origin/main` | `a152889a71eec6c67d82b05e5984df6423fe88d4` — matches the expected starting state |
| M0 | `npm run handoff:check` | PASS — `IN_PROGRESS` bound to the C-10 task, `Planned-From` a real `main` ancestor |
| M0 | `npm run agent:check` | PASS with 2 pre-existing warnings (CHECKPOINT_ADVANCE, legacy v1 tasks) |
| M4 | `npm run typecheck` | PASS |
| M4 | `tests/unit/c10ProductionProjection.test.ts` | 33/33 PASS — sentinel key literals present in raw input, absent from projection, canonical bytes, digest input and evidence |
| M10 | `tests/unit/c10AcceptanceSuite.test.ts` | 48/48 PASS — all five §6.5 classes plus the persistence audit |
| M10 | `npm run hardening:check` | PASS; proven non-vacuous by injecting a `node:fs` import into the cone (2 errors) and restoring (PASS) |
| M10 | affected existing suites (Control Center / findings / projection / evidence / privacy / dossier / console / storage) | 581 passed, 2 skipped (pre-existing), 0 failed |
| M10 | `tests/unit/phase10Privacy.test.ts` | 8/8 PASS after re-scoping the DEV key-literal assertion in place |
| M11 | `npm run project:check` | PASS (after pointing live truth at the active C-10 campaign) |
| M11 | `npm run agent:check` / `agent:audit` | PASS; `tasks=100 strict_v2=77 strict_errors=0` |
| M11 | `npm run test:semantic-compat` | PASS — 1,967 total / 1,954 passed / 13 skipped / 0 failed |
| M11 | `npm run campaign:synthetic` | PASS — 14 files, 209/209, `deepContainmentLane: PROVEN` (was 12 files / 128) |
| M11 | complete canonical Playwright regression | 2,920 total / 2,907 passed / 13 skipped / 0 failed (baseline 2,839 / 2,826 / 13 / 0; delta is exactly the 81 new C-10 cases) |
| M11 | `npm run gate:local` @ `69de7752ca92dc9c01f971e1c2e7d7efcb4569eb` | PASS, all eleven groups, `receipt:sha256:531bf12aa22c7da419bedf92` |
| M11 | `npm run gate:clean` @ `69de7752ca92dc9c01f971e1c2e7d7efcb4569eb` | PASS, Node 20, all eleven groups, `clean-receipt:sha256:ebe45a42352d5621b20c1036` (gate `receipt:sha256:8b79ac2ebd9718766e95a379`) |
| M12 | `tests/unit/c10*.test.ts` after the DEF-C10-5 repair | 93/93 PASS (81 -> 93; 12 new route-identity cases) |
| M12 | `npm run hardening:check` | PASS; the DEF-C10-5 rule proven non-vacuous by TWO removal probes (evidence call, store call), after DEF-C10-6 showed the first version matched the import |
| M12 | `npm run campaign:synthetic` | PASS — 14 files, 221/221 (209 -> 221) |
| M12 | complete canonical Playwright regression | 2,932 total / 2,919 passed / 13 skipped / 0 failed (2,920 -> 2,932; delta is exactly the 12 new cases) |
| M12 | `npm run gate:local` @ `23523cc743c77b2250738caa980c218dab8671bb` | PASS, all eleven groups, `receipt:sha256:e9b6be885532544ed7233a02` |
| M12 | `npm run gate:clean` @ `23523cc743c77b2250738caa980c218dab8671bb` | PASS, Node 20, all eleven groups, `clean-receipt:sha256:6a1d1bc5870510c0b4dfedfe`, `siblingWrites: 0` |
| M12 | exact-head GitHub Actions run `33600603779` / job `100153229914` @ `1234dafd269079de842d138bef86438609a445db` | PASS — Node 20, `environmentClass: CI`, all eleven required groups PASS, `receipt:sha256:aecae84fb070b89734a6efc0`, `SYNTHETIC_CAMPAIGN` 221/221 |
| M11 | exact-head GitHub Actions run `33597262624` / job `100143115528` @ `da551f0b875fe46acd8a6a9d64f9b16b07ce0734` | PASS — Node 20, `environmentClass: CI`, all eleven required groups PASS, `receipt:sha256:2adf16776476b94f87e8c87c` |

## Decisions Made During This Task

- **D-C10-1** — additive versioned production projection rather than a v1
  rewrite; `ProjectionField.name` is load-bearing across Phase 9/9A.1/10/10A.
- **D-C10-2** — no durable value digest in the production persistence contract;
  the concept is removed rather than invented, and correlation is an ephemeral
  encounter token.
- **D-C10-3** — the tracked `design.md §6.2/§6.4` per-campaign salt is
  SUPERSEDED by independent-review F-15/MA-11/UA-11 and the supersession is
  recorded, not silently applied.
- **D-C10-4** — the key-vocabulary resolver is injected as a frozen value
  object, because its proof sources live behind filesystem loaders that would
  break projection-cone import isolation.

Full reasoning and evidence are in `PLAN.md` `## Decision Log`.

## Exact Next Action

STOP — C-10 is complete. Release the session worktree and fast-forward the
canonical checkout. Do NOT begin another campaign in this task. C-10 completing
does NOT authorize production observation; the next critical-path campaign is
C-11, the `PROD_OBSERVE` safety kernel, which requires its own explicit owner
authorization and its own task directory.

## Blockers

None.

## Safety Events

None.

## Defects

**DEF-C10-5 — a concrete customer identifier could be persisted as a "route
template" (F-16, CRITICAL).** Found by a review pass AFTER the campaign had
been closed and CI-certified green, which is the honest and uncomfortable fact
about it. `routeTemplate` is the only free-form string the production evidence
DTO persists, and both `toProductionEvidence` and the persistence firewall
validated it with `ROUTE_TEMPLATE_RE` alone. A literal path segment matches
`[A-Za-z0-9._~-]+`, which cannot distinguish `accounts` from `481516234299` or
`invoices` from `INV-2026-000731-SENTINEL`. Verified empirically: all of
`GET /v1/accounts/481516234299`,
`GET /v1/invoices/INV-2026-000731-SENTINEL` and
`GET /v1/billing/groups/bg-SENTINEL-8812` were ACCEPTED. Two of those three are
members of the campaign's own sentinel set.

Worse, `tests/unit/c10ProductionProjection.test.ts` CERTIFIED the behaviour with
`expect(() => assertRouteTemplateOnly('GET /v1/accounts/' + SENTINEL_ACCOUNT_ID)).not.toThrow()`
— the same defect shape this campaign spent effort re-scoping out of
`phase10Privacy.test.ts`.

Why three checks missed it: the sentinel corpus planted query and path
parameters as BODY VALUES, which class B already proves are stripped
generically, and never in the route-identity position — the one persisted field
that can hold them. The persistence audit's route rule matched only `?` and
`&`, which a concrete path segment does not contain. And
`assertNoConcreteParameterValue` likewise screened only `?`, `#` and `&`.

Repaired by mirroring the F-14 answer instead of inventing a second mechanism:
`src/core/prodPrivacy/routeVocabulary.ts` makes route identity a proven member
of a source-proven finite route vocabulary (C-02a's 814 admitted operations are
the proof source), injected call-scoped with a `NO_PROVEN_ROUTE_VOCABULARY`
sentinel so omission is a type error. Membership is exact-set, so no syntactic
judgement is made anywhere; `ROUTE_TEMPLATE_RE` is retained ONLY as a
precondition on what may enter a vocabulary and is documented as never being
the authority. Unlike a dynamic key, a route has no safe structural reduction,
so unproven provenance DENIES persistence. Enforced at four boundaries:
construction, the firewall (provenance recorded), the durable write (membership
— the store now holds the vocabulary, because the firewall holds none), and the
post-hoc audit (`provenRouteTemplates`). Disposition: FIXED; the certifying
assertion is flipped to `.toThrow()` with a case per sentinel class in the path
position, plus a non-vacuity case proving those strings are shape-valid.

**DEF-C10-6 — the first DEF-C10-5 hardening rule was itself vacuous.** The new
rule tested for the bare identifier `assertSourceProvenRoute`, which also
matches the IMPORT line, so deleting the actual call still PASSED. Caught by
running the non-vacuity probe rather than trusting the rule. Repaired by
requiring the call bound to its injected vocabulary
(`assertSourceProvenRoute(request.routeVocabulary`,
`assertSourceProvenRoute(this.routeVocabulary`). Both removal probes now fail
closed. Disposition: FIXED.

**DEF-C10-1 — a node could carry a field belonging to a DIFFERENT node type.**
Found by the C-10 digest-privacy tamper case, not by review. The canonical
writer switched on `node.type` and wrote only that type's fields, so an
ARRAY-only field grafted onto an OBJECT node (`itemCount`) was silently
ignored — which meant the recomputed structural digest still MATCHED and the
persistence firewall accepted the tampered structure. Repaired by introducing
EXACT per-type field sets (`PRODUCTION_NODE_FIELDS_BY_TYPE` and its
evidence-form counterpart) and validating against the node's own type on both
boundaries. Disposition: FIXED, with a named regression case.

**DEF-C10-2 — the first non-vacuity assertion over-claimed.** The sentinel
corpus asserted that the raw JSON body contained every sentinel, including the
console and thrown-exception sentinels, which are planted in different
channels. The assertion failed honestly. Repaired by splitting the corpus into
`BODY_SENTINELS` and `CHANNEL_SENTINELS` and proving each enters its OWN
channel, so non-vacuity is now established per channel rather than assumed.
Disposition: FIXED. No absence assertion was weakened — all sentinels are still
swept for everywhere.

**DEF-C10-4 — five C-10 cases were Node-version dependent.** The clean Node 20
gate failed five acceptance cases that pass under Node 22. All five used a
dynamic `await import()` of a TypeScript path, which the Playwright transform
resolves differently across Node majors. The production code was already
correct; the TESTS carried a loader assumption. Repaired by converting to
static imports — the idiom every other suite uses — so the cases hold in both
topologies. No test was skipped, weakened or removed and the assertions are
byte-identical. Disposition: FIXED; `gate:clean` then PASSED with all eleven
groups. This is the same class of defect the predecessor campaign existed to
repair, and it was caught before integration rather than in CI.

**DEF-C10-3 — the hardening capability pattern matched a method call.** The new
rule's `exec(`/`fetch(` pattern matched `regex.exec(`, which is not a process
capability. Repaired with a negative lookbehind so only a bare global matches;
the call site was also rewritten to `matchAll`. Disposition: FIXED. The rule
was then verified non-vacuous against a real `node:fs` import.

## Discoveries

- **DISC-C10-1** — the repository's single digest family
  (`proj:sha256:`) is simultaneously the F-14 and F-15 defect: it is the
  structural comparison digest AND it ingests raw dynamic key literals.
- **DISC-C10-3** — the session worktree had no `node_modules`; `npm ci
  --ignore-scripts` is required in a fresh worktree before `typecheck` or any
  suite runs, otherwise `tsc` resolves to a newer global TypeScript that
  rejects the repository's `moduleResolution=node10`.
- **DISC-C10-2** — `runRecorder` authenticated mode already suppresses
  screenshots and minimizes URLs, but it is a mode toggled by callers, not a
  production invariant; C-10 must not rely on it as the production boundary.

## Deferred / Follow-Up

None recorded yet.

## Resume Recipe

Task complete. Do not resume this task. The C-10 production privacy firewall is
closed — implementation, local, clean Node 20 and exact-head CI validation,
integration and truth records are all done — and its session worktree is
released. C-10 does NOT authorize production observation; the next
critical-path campaign is C-11 `PROD_OBSERVE`, which requires a new
authorization and its own task directory.

## Completion Snapshot

- **Starting SHA:** `a152889a71eec6c67d82b05e5984df6423fe88d4`
- **Substantive implementation SHA (local + clean gates):** `23523cc743c77b2250738caa980c218dab8671bb`
- **Documentation checkpoint (exact-head CI validated):** `1234dafd269079de842d138bef86438609a445db`
- **Exact-head CI (final):** run `33600603779` / job `100153229914` at
  `1234dafd`, Node 20, `environmentClass: CI`, PASS, all eleven required groups
  PASS, `receipt:sha256:aecae84fb070b89734a6efc0`
- **Exact-head CI (pre-repair, historical):** run `33597262624` / job
  `100143115528` at `da551f0b`, PASS — green, but the campaign was NOT actually
  complete at that point; DEF-C10-5 was still open and certified by a test
- **Local gate:** PASS @ `23523cc`, `receipt:sha256:e9b6be885532544ed7233a02`
- **Clean Node 20 gate:** PASS @ `23523cc`,
  `clean-receipt:sha256:6a1d1bc5870510c0b4dfedfe`, `siblingWrites: 0`
- **Canonical regression:** 2,932 total / 2,919 passed / 13 skipped / 0 failed
  (baseline 2,839 / 2,826 / 13 / 0; delta is exactly the 93 new C-10 cases)
- **Synthetic campaign:** 14 files, 221/221, `deepContainmentLane: PROVEN`
- **C-10 suites:** 93 tests in 2 files, 93 passed
- **Sentinel corpus:** zero sentinel bytes under any permitted root; non-vacuous
  per channel; sweep proven capable of failing
- **Persistence audit:** CLEAN, zero violations, bounded counts
- **Import isolation:** PASS, and the hardening rule proven non-vacuous
- **Defects:** DEF-C10-1 through DEF-C10-6, all FIXED. DEF-C10-5 was found by review AFTER an apparently clean CI-green closure and is the most serious of them; DEF-C10-6 was a vacuous hardening rule guarding that very fix
- **Safety:** no test or safety authority weakened; C-06 untouched; zero
  DEV/NEXT/production contact; zero credential inspection; zero
  sibling-repository writes; C-11 not started
