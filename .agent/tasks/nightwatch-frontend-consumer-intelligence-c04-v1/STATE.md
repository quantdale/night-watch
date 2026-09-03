# Task State

## Identity

Task ID: nightwatch-frontend-consumer-intelligence-c04-v1
Phase: FRONTEND_CONSUMER_INTELLIGENCE_C04_V1
Status: COMPLETE
Starting SHA: 7c0d5f5326be1983cf081888680f3c01f3f128f6
Last validated implementation SHA: 11cefb27ac366217f7092dcd7f66b3cfccac2fee
Last substantive checkpoint SHA: 11cefb27ac366217f7092dcd7f66b3cfccac2fee
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-frontend-consumer-int-82a0494b
Last checkpoint: exact-head GitHub job 100614907944 at 0323d5f passed all eleven required groups on Node 20 with receipt receipt:sha256:6cba46d8990802d39f4b4e26; gate:clean PASS with inner receipt receipt:sha256:9ad8e572fe6eed991f7a7dea and siblingWrites 0; canonical regression 3,338 total / 3,325 passed / 13 skipped / 0 failed; 382 consumer edges with ZERO non-literal SOURCE_FACTs and 164 proven backend joins; 16/16 negative probes detected; DEF-C04-1 and DEF-C04-2 introduced by this campaign, both found, repaired and reported
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 7c0d5f5326be1983cf081888680f3c01f3f128f6
LAST_VALIDATED_IMPLEMENTATION_SHA: 11cefb27ac366217f7092dcd7f66b3cfccac2fee
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 11cefb27ac366217f7092dcd7f66b3cfccac2fee
LAST_DOCUMENTATION_CHECKPOINT_SHA: 0323d5fb1b5960f9f17e2b1fa519cc85918dbfaf
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Derive frontend → backend route edges mechanically from the approved Vue and
JavaScript source, classify every path so that no non-literal path becomes a
`SOURCE_FACT`, and report the yield truthfully against a `≥ 400` criterion the
approved universe cannot satisfy.

## Current Milestone

COMPLETE / STOP — M1 through M7 are closed. 382 frontend consumer edges are
derived with zero non-literal SOURCE_FACTs and 164 proven backend joins,
certified by exact-head CI job 100614907944 at `0323d5f` with all eleven
required groups PASS. The historical `>= 400` criterion FAILS at 382, short by
18, and the shortfall is attributed to the single-repository frontend
boundary. C-15b is the next authorized campaign.

## Completed Milestones

- M1 — task record, OpenSpec change, ceiling estimate. Committed at `dd73dc5`.
- M2 — adversarial corpus asserted BEFORE the parser; it failed to import,
  which is the reproduction.
- M3 — `vueSfc.ts` + `frontendConsumer.ts`; 36/36 first run. The shared
  tokenizer gained an OPT-IN template-preserving mode; every existing caller
  lexes byte-identically and the phase25/26 and C-03 suites confirm it.
- M4 — `.vue` / `VUE` admitted; ripple-ui budget raised to 4,096 and the
  repository now enumerates COMPLETE at 1,329 of 1,329.
- M5 — `frontendJoin.ts`; `c04FrontendGraph` 14/14. 382 edges, 164 PROVEN
  joins, ZERO non-literal SOURCE_FACTs.
- M6 — `checkC04FrontendConsumerBoundary()`; both suites gate-registered with a
  membership assertion; 16 negative probes, 16 detected, 16 restored.

## Work In Progress

NONE.

## Exact Next Action

STOP — C-04 is COMPLETE and certified. C-15b
`nightwatch-system-map-v2-c15b-v1` is the next authorized campaign; both of its
hard dependencies (C-03 service topology, C-04 consumer edges) are now
satisfied.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-frontend-consumer-intelligence-c04-v1/SPEC.md` | frozen intent, measured ceiling | WRITTEN |
| `.agent/tasks/nightwatch-frontend-consumer-intelligence-c04-v1/PLAN.md` | living plan, seven milestones | WRITTEN |
| `.agent/tasks/nightwatch-frontend-consumer-intelligence-c04-v1/STATE.md` | this waypoint | WRITTEN |
| `.agent/tasks/nightwatch-frontend-consumer-intelligence-c04-v1/REPORT.md` | requirement ledger skeleton | WRITTEN |

## Validation Ledger

Command: `nightwatch-session.mjs start` / `claim`
Result: PASS
When: 2026-09-03
Relevant failure/output summary: C-03 released; canonical clean at 7c0d5f5;
session `sess-3472e47d7dc8` claimed on
`session/nightwatch-frontend-consumer-int-82a0494b`.

Command: measured the approved frontend universe
Result: recorded as the campaign ceiling
When: 2026-09-03
Relevant failure/output summary: `mobingilabs/ripple-ui@d80b161b` `src` holds
1,329 files (859 `.vue`, 387 `.js`) and 211 candidate HTTP call sites —
baseApi 123, blueApi 67, emailAuthApi 5, mfaApi 4, usersApi 3, loginApi 3,
statusApi 1, streamPromise 5. `mobingilabs/ripple-api` `src` is 95 PHP files
with zero frontend call sites. There are ZERO `axios.get('/literal')` sites;
the real shape is a function-local `url` variable then `blueApi.get(url)`.

Command: measured the real consumer graph after the `.vue` admission and the
ripple-ui budget correction
Result: 382 edges over a COMPLETE enumeration
When: 2026-09-03, session worktree
Relevant failure/output summary: ripple-ui enumerates COMPLETE at 1,329 of
1,329 files. 382 edges — 348 SOURCE_FACT (138 LITERAL, 210 STRUCTURAL), 4
INFERENCE, 30 UNKNOWN; 360 from `.js` and 22 from `.vue`. Join: 164 PROVEN, 21
AMBIGUOUS, 161 MISSING, 34 DYNAMIC, 2 METHOD_MISMATCH. All eight axios
instances recovered. `nonLiteralSourceFacts` is 0.

Command: 16 negative probes (10 hardening, 6 behavioural)
Result: 16/16 DETECTED, 16/16 RESTORED_PASS
When: 2026-09-03, session worktree
Relevant failure/output summary: no vacuous rule and no weak test this time;
every probe was detected on its first run.

## Decisions Made During This Task

Decision: record the `≥ 400` shortfall in the SPEC before writing any parser.
Reason: 211 candidate call sites exist in the entire approved universe, so the
criterion fails by roughly a factor of two regardless of parser quality. The
cause is the authorization boundary — reaching 400 needs another frontend
REPOSITORY, which §0 forbids and C-05 owns.
Evidence/constraint: per-receiver counts above.
Consequence: the campaign optimises for correct classification of the 211 real
sites and reports the criterion as a truthful FAIL with its attribution.

Decision: no `@vue/compiler-sfc`.
Reason: the campaign needs the `<script>` text out of an SFC. A bounded tag
scanner does that; a compiler would add a large dependency and a template AST
this campaign has no use for.

Decision: CORRECT the pre-implementation ceiling rather than quietly restate
it. Reason: the SPEC recorded 211 candidate call sites and "a factor of two"
shortfall. That was a line-oriented grep, and ripple-ui writes most calls
across two lines (`return baseApi` / `.get(url)`), so the estimate missed 45%
of the corpus. The true figure is 388 by text and 382 by parser — the parser
being lower because it correctly excludes 7 commented-out calls. The `>= 400`
criterion therefore fails by 18, not by half.
Evidence/constraint: whitespace-insensitive recount, and a per-file check
showing 29 real call sites in `billingGroups.js` where the grep saw 6.
Consequence: the SPEC and the OpenSpec audit both carry the correction
visibly, including why the first instrument was wrong.

Decision: the shared tokenizer's template preservation is OPT-IN.
Reason: route discovery has never needed template bodies and dropping them was
the safe default. Changing that default would alter what every existing caller
sees; an option changes nothing until asked for.

## Discoveries

- ripple-ui's calls are written multiline, which is why a line-oriented count
  under-reported the corpus by 45%. Any future frontend measurement in this
  repository should be whitespace-insensitive or token-based.
- Raising ripple-ui's file budget took the repository from TRUNCATED at 773
  files and ONE observed edge to COMPLETE at 1,329 files and 382 edges. Both
  frontend and Go topology campaigns were bounded by the same default budget
  rather than by their parsers.

- There are zero `axios.get('/literal')` call sites in ripple-ui. A parser
  written to the historical design's assumed shape would have found nothing at
  all, which is why the shapes were measured before the design was fixed.
- `fetch(` appears 189 times and is almost entirely the no-argument Vuex action
  `fetch()`, not an HTTP call. Counting it as one would have inflated the yield
  with non-edges.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- Any further frontend repository: `BLOCKED_BY_C05_REPOSITORY_ADMISSION`.

## Resume Recipe

Task complete. Do not resume; any follow-up starts as a new authorized task.

## Completion Snapshot

C-04 is COMPLETE and certified.

Final substantive checkpoint: recorded in the project-state block
Final documentation checkpoint: 0323d5fb1b5960f9f17e2b1fa519cc85918dbfaf
Live HEAD: DISCOVER_FROM_GIT
Tests: canonical regression 3,338 / 3,325 / 13 skipped / 0 failed; semantic
compatibility 2,033 / 2,020 / 13 / 0; synthetic campaign 561/561.
Artifacts: `src/core/source/vueSfc.ts`,
`src/core/source/frontendConsumer.ts`, `src/core/source/frontendJoin.ts`; the
`.vue` / `VUE` admission and ripple-ui budget correction; an opt-in
template-preserving mode on the shared tokenizer;
`checkC04FrontendConsumerBoundary()`; two registered suites.
Known issues: the `>= 400` criterion FAILS at 382; 5 `streamPromise` sites are
unsupported; the C-02a and C-06 suites remain unregistered in both gate
manifests (PRE_EXISTING).
Recommended next task: `nightwatch-system-map-v2-c15b-v1` (C-15b).
