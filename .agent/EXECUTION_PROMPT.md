# EXECUTION PROMPT — Truncation Truth, Discovery Paging, and Early Coverage Surfacing (C-01)

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-truncation-truth-discovery-paging-c01-v1
OpenSpec: openspec/changes/nightwatch-truncation-truth-discovery-paging-c01-v1/
Planned-From: 68e64a143d40aea051df186e050b3c0fa33d6ae5
Target Branch: main
Predecessor Task ID: nightwatch-concurrency-workspace-hardening-c00-v1
Predecessor Status: COMPLETE

## Mission

Establish mechanical truncation truth across source enumeration, content
reading, and operation projection, and surface it through the census, CLI,
and Control Center (C-15a) without changing runtime admission authority.

C-00's `ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY`
invariant and its hygiene, deletion-gate, and fast-forward-only integration
protocol remain in force as historical COMPLETE. C-01 removes the silent
`MAX_DISCOVERED_OPERATIONS = 128` operation-projection cap in favour of the
exported `MAX_PROJECTED_OPERATIONS = 4096` dealt round-robin per repository
(no silent eviction); introduces the shared vocabulary
`src/core/source/completeness.ts` (`COMPLETE | TRUNCATED | UNKNOWN`,
conservative order `COMPLETE < TRUNCATED < UNKNOWN`, `worstCompleteness`
with zero args ⇒ UNKNOWN, `isComplete` for COMPLETE only, seven R2 coverage
states with `coverageAuthorityEffect: DENY | NO_EFFECT` and no `GRANT`);
splits `SourceScanCounters.budgetRejections` into the disjoint
`enumerationBudgetRejections` / `contentBudgetRejections` and places a new
`SourceInventoryCompleteness` (`nightwatch.source-inventory-completeness.v1`)
on `RealSourceSnapshotInventory` with independent `enumeration` and
`contentRead` dimensions and per-repository rows (`totalFiles: null`,
`droppedFiles: null`, `remainingUnknown: true` for an aborted walk; policy
exclusions `SOURCE_LANGUAGE_UNSUPPORTED` / `SOURCE_PRIVACY_REJECTED` never
truncation); adds the single shared projection
`src/core/source/populationCompleteness.ts`
(`nightwatch.source-population-completeness.v1`) carried as
`SourceEligibilityCensusSummary.population` (census v2→v3) and
`ReadOnlyCandidateCensus.population` (v1→v2) and in every
`bin/nightwatch-intelligence.mjs` source projection; raises
`buildPhase24CandidatePortfolio` to `MAX_PHASE24_CANDIDATES = 4096` (still
fail-closed); and ships C-15a `nightwatch.control-center.source-summary.v2
→ v3` with a `completeness` block and a POPULATION COMPLETENESS panel with
separate ENUMERATION and CONTENT READ pills (unavailable fallback is
UNKNOWN/UNMEASURED with `total: null`).

Measured in this worktree with `node bin/nightwatch-intelligence.mjs
source-gaps`: `routeOperationsFound: 223`, `routeOperationsTruncated: 0`,
`responseContracts: 58`, `requestContracts: 222`, `routeProofs: 222`,
`semanticContracts: 90`, `joinsAttempted: 223`, `joinsProven: 207`,
discovery digest `source-surface-discovery:sha256:21de18a23a387d7b816db3c0`;
per repository `mobingilabs/ripple-api` enumeration COMPLETE (96 files) /
content COMPLETE, `mobingilabs/ouchan` and `mobingilabs/ripple-ui`
enumeration TRUNCATED (`SOURCE_FILE_COUNT_EXCEEDED`). D-105 resolves
43-vs-83 as one metric (analyzer v3 vs v4, both over the 128 cap since
43+9+76=128) with the first honest whole-population figure 58 of 223.
Coverage may deny authority and never grants it. Do not implement C-02a.

## Current next action

C-01 implementation is complete and focused-green in the owned session
worktree; full validation has not yet run and nothing has been committed.
Run `npm run gate:local` from this worktree, repair any failure, then run
the clean-checkout gate, then close out (`REPORT.md`, `ACTIVE_TASK.md`
truth update) and integrate through `node bin/nightwatch-session.mjs
integrate` over the C-00 fast-forward protocol. Do not start C-02a, do not
change analyzer semantics to force historical figures to agree, and do not
run an implementation session in the canonical checkout.

## Working protocol for this campaign

Work inside the owned C-01 session worktree on branch
`session/nightwatch-truncation-truth-disc-b84ac363`, claimed for this task.
Run `npm run session:status` before substantial work; a `FAIL` verdict is a
stop condition. The OpenSpec for this campaign is
`openspec/changes/nightwatch-truncation-truth-discovery-paging-c01-v1/`.
Integrate with `node bin/nightwatch-session.mjs integrate`, which
fast-forward-pushes the session branch onto canonical `main` and verifies
`HEAD == origin/main`; the merge reconciles by merging `origin/main` into
the session branch (never rewriting) and aborts on conflict. The final
remote topology remains `main` only. C-02a must NOT be started in this
campaign.
