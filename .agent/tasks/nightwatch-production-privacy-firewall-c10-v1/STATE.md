# Task State

## Identity

Task ID: nightwatch-production-privacy-firewall-c10-v1
Phase: PRODUCTION_PRIVACY_FIREWALL_C10_V1
Status: IN_PROGRESS
Starting SHA: a152889a71eec6c67d82b05e5984df6423fe88d4
Branch: session/nightwatch-production-privacy-fi-5af2d530
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: a152889a71eec6c67d82b05e5984df6423fe88d4
LAST_VALIDATED_IMPLEMENTATION_SHA: b99ce4e61166e52b554dd6ac07b7678b433959da
LAST_SUBSTANTIVE_CHECKPOINT_SHA: b99ce4e61166e52b554dd6ac07b7678b433959da
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_PRODUCTION_PRIVACY_FIREWALL_C10_V1_STATUS: IN_PROGRESS

## Objective

Make raw production/customer data structurally incapable of reaching persistent
Nightwatch artifacts: an allowlisted structural projection with no persistence
authority as the primary boundary, an independent persistence firewall as the
second, and the four around-the-boundary leakage paths (F-14 key names, F-16
request parameters, page console output, F-17 browser profile) closed, plus the
F-15 digest confusion and the F-18 Control Center exposure.

## Current Milestone

M11 — full validation and integration. M0 through M10 are closed.

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

Implementation and local/clean validation are complete. Remaining: C-00
integration, the exact-head GitHub Actions result, and the closeout records.

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

Integrate through the C-00 session mechanism
(`node bin/nightwatch-session.mjs integrate`), then obtain the exact-head
GitHub Actions result for the integrated head and record the run and job in
this file and in `REPORT.md`. Release the session worktree afterwards.

## Blockers

None.

## Safety Events

None.

## Defects

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

1. `cd /home/dalepalaca/.nightwatch/worktrees/nightwatch-production-privacy-fi-5af2d530`
   and run `node bin/nightwatch-session.mjs status`; a non-`PASS` verdict is a
   stop condition.
2. Read `SPEC.md`, then `PLAN.md`, then this file; resume from
   `## Exact Next Action`.
3. Run the smallest decisive validation for the open milestone before adding
   new work: `npm run typecheck` and `npm run hardening:check`.

## Completion Snapshot

Not complete. This section is filled at campaign close with the substantive
implementation SHA, the exact-head GitHub Actions run and job, the local and
clean gate receipts, the complete regression totals, the C-10 suite totals, and
the persistence-audit, sentinel-corpus and import-isolation results.
