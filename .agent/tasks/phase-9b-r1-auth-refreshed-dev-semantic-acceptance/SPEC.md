# Nightwatch Phase 9B-R1 — Auth-Refreshed Contained DEV Semantic Acceptance Retry

## Task purpose

Execute the fresh owner-authorized retry
(`PHASE_9B_R1_AUTH_REFRESHED_DEV_SEMANTIC_ACCEPTANCE_ONLY`, Phase
`9B-R1-CONTAINED-DEV-SEMANTIC-ACCEPTANCE`) of the contained DEV semantic
acceptance, using the ALREADY VALIDATED Phase 9B harness (substantive
implementation `cdfdf314839fd782a962e4096b68b32641a93db2`, exact
implementation CI 31934803846) with NO reimplementation:

```
FRESH HUMAN-REFRESHED AUTH (external DEV storage state)
  + FRESH REMOTE SOURCE TRUTH (read-only metadata)
  + EXACT GREEN HARNESS (cdfdf31 semantics, current exact-head CI)
  + ONE FIXED KNOWN_READ JOURNEY (ripple-common-exchange-read)
  + FIRST observation + ONE fresh-context REPLAY
  + SAFE SEMANTIC EVALUATION RECEIPTS
  + ZERO SAFETY / PRIVACY VIOLATIONS
  -> terminal token: PASS | PASS_WITH_REPRODUCIBLE_SEMANTIC_MISMATCH | BLOCKED
```

The original Phase 9B authorization is SPENT and its task stays
`BLOCKED_HISTORICAL` (D-56): the original launcher ran once but the browser
context was never created (expired auth cookie), so actual DEV journey
pairs = 0, DEV observation passes = 0, product response bodies observed =
0. R1 is a NEW, independent authorization after the owner's human-led
`npm run auth:capture` refresh.

## Authorization

- Authorization class: `PHASE_9B_R1_AUTH_REFRESHED_DEV_SEMANTIC_ACCEPTANCE_ONLY`
- Phase: `9B-R1-CONTAINED-DEV-SEMANTIC-ACCEPTANCE`
- Protocol: `CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2`
- Permitted: R1 strict-v2 task records; one documentation/continuity
  checkpoint (NO source/harness changes) committed + pushed with exact
  green CI BEFORE any DEV contact; fresh read-only remote source checks;
  fresh derivation of the selected expectation from the exact approved
  snapshot; structural/boolean auth validation only (NO auth:capture, NO
  credentials); ONE `npm run phase9b:real` invocation (FIRST + one
  fresh-context REPLAY); safe receipt evidence; private/local sanitized
  acceptance evidence; docs/continuity closure (D-57 expected); normal
  Nightwatch commits/pushes.
- Forbidden: reuse of the original Phase 9B authorization; another
  automatic retry; a second journey; fallback to payer/account inventory;
  random exploration; new endpoint authority; NEXT; production; mutation;
  POST/PUT/PATCH/DELETE; DB; infrastructure; deployment binding; Phase 6;
  screenshots; authenticated traces; raw-body persistence; arbitrary
  DOM/text capture; AI/model execution; Alphaus source writes; selfDev;
  promotion; catalog mutation; variant-B adoption; publication; any
  Nightwatch implementation patching after the real launcher invocation.

## Established starting state

- Task ID: `phase-9b-r1-auth-refreshed-dev-semantic-acceptance`
- Starting SHA (expected at authorization time):
  `05def7abf92818c7de48fba658579397b236def7`
  (HEAD == origin/main == expected SHA; worktree clean — CASE D).
- Validated Phase 9B harness implementation:
  `cdfdf314839fd782a962e4096b68b32641a93db2` (exact CI 31934803846,
  completed/success); original blocked-task closure `05def7a` (exact CI
  31935514865, completed/success). Harness source verified byte-identical
  between cdfdf31 and HEAD (`git diff cdfdf31..HEAD -- src/ bin/ tests/
  playwright.phase9b.config.ts package.json .github/` empty).
- Original Phase 9B: `PHASE_9B_STATUS: BLOCKED`,
  `PHASE_9B_DEV_RESULT: NOT_PROVEN`,
  `PHASE_9B_BLOCKER: PHASE_9B_BLOCKED_HUMAN_AUTH_ACTION_REQUIRED` (D-56);
  launcher invoked exactly once, browser context never created, zero DEV
  contact, zero artifacts. Historical; not reopened.
- Prior fresh source snapshot (historical reference): ripple-api master
  `169df39d3cdf56c88f98d45d06eae6e48c3d8f6d`, ripple-ui dev
  `818ce2da19a25b31d715221c8cde30aae837fd77`; selected evidence digest
  `ev:sha256:608265368c9a086f43c94e5c`. CURRENT remote values must be
  re-discovered, not reused blindly.
- External auth state: `$HOME/.nightwatch/auth/ripple-dev-state.json`
  (owner states HUMAN-REFRESHED before this session; structural/boolean
  validation only).
- Canonical DEV target: `https://appdev.alphaus.cloud/ripple/` (env dev).

## Scope

- New docs only: `.agent/tasks/phase-9b-r1-auth-refreshed-dev-semantic-
  acceptance/{SPEC,PLAN,STATE,REPORT}.md`, `.agent/ACTIVE_TASK.md`
  transition, and a small truthful current-state wording for the R1
  pre-run checkpoint. NO changes to `src/`, `bin/`, `tests/`,
  `playwright.phase9b.config.ts`, `package.json`, `.github/`, or any
  harness surface.
- Execution: fresh remote freshness (gh api), disposable /tmp snapshot if
  needed, fresh derivation at the approved snapshot, resolver restricted to
  `ripple.common-exchange.read`, structural auth precheck, exact-head CI
  gate, ONE launcher invocation (FIRST + REPLAY), safe summaries/receipts,
  post-run privacy audit + safety vector + sibling integrity.
- Closure: safe tracked docs (CURRENT_STATE/ROADMAP/ARCHITECTURE/DECISIONS/
  SAFETY_MODEL/PHASE_9_ROADMAP/PHASE_9B_TASK_SPEC) with D-57; final exact
  CI; 96-item report; STOP.

## Non-Goals

- No harness reimplementation or patching; no second journey; no fallback;
  no third attempt; no R2; no auth:capture inside this session; no
  credential handling; no new endpoint authority; no NEXT/production; no
  mutation; no DB/infra; no deployment binding; no screenshots/traces/DOM
  capture; no raw persistence; no AI; no Alphaus writes; no selfDev/
  promotion/catalog; no variant-B adoption; no publication; no Phase 9
  next-phase implementation; no reopening of the original Phase 9B task.

## Safety Constraints

- Fail-closed, read-only toward Alphaus; canonical sibling checkouts never
  mutated (no fetch/checkout/reset/pull/merge/rebase/clean inside them);
  disposable /tmp snapshots only.
- Containment stack unchanged (L0-L5; traces OFF; screenshots OFF;
  response-body persistence OFF; customer DOM persistence OFF; mutation
  registry enabled; canonical DEV target exact). No Phase 9B shortcut
  context.
- Raw response text transient, in-memory only; never in receipts, findings,
  dossiers, evidence files, terminal, CI, or Git.
- Pre-browser hard gates: fresh source freshness PASS, derivation + resolver
  RESOLVED, exact-head CI green, auth structural + expiry PASS, proxy
  healthy, canonical target exact, traces/screenshots false. ANY failure ->
  NO launcher invocation.
- Hard semantic outcomes on the selected target (NO_EXPECTATION,
  SOURCE_STALE, SOURCE_UNAVAILABLE, INVALID_INPUT, PROJECTION_LIMIT_EXCEEDED,
  INTERNAL_ERROR) in either pass -> acceptance NOT proven; no retry.
- Zero hard safety counters required in both passes; any nonzero -> hard
  failure.
- After the ONE launcher invocation: NO implementation patching; a harness
  runtime defect -> `PHASE_9B_R1_BLOCKED_HARNESS_RUNTIME_DEFECT` and STOP.

## Success criteria

One of the terminal tokens with truthful evidence:

- `PHASE_9B_R1: COMPLETE_DEV_SEMANTIC_ACCEPTANCE_VERIFIED`,
  `PHASE_9B_R1_DEV_RESULT: PASS` — FIRST + REPLAY decisive PASS under the
  same expectationId/targetId/source SHA/evidence digest, no anomaly;
  `PHASE_9_STATUS: COMPLETE`.
- `PHASE_9B_R1: COMPLETE_DEV_SEMANTIC_ACCEPTANCE_VERIFIED`,
  `PHASE_9B_R1_DEV_RESULT: PASS_WITH_REPRODUCIBLE_SEMANTIC_MISMATCH` — both
  passes reproduce the same safe anomaly category/fingerprint; mismatch
  UNDER_INVESTIGATION; `PHASE_9_STATUS: COMPLETE`.
- `PHASE_9B_R1: BLOCKED`, `PHASE_9B_R1_DEV_RESULT: NOT_PROVEN` with an
  exact blocker (`PHASE_9B_R1_BLOCKED_AUTH_REFRESH_INVALID`,
  `PHASE_9B_R1_BLOCKED_AUTH_EXPIRED_BEFORE_FIRST`,
  `PHASE_9B_R1_BLOCKED_AUTH_EXPIRED_BEFORE_REPLAY`,
  `PHASE_9B_R1_BLOCKED_REAL_SOURCE_CONTRACT_DRIFT`,
  `PHASE_9B_R1_BLOCKED_JOURNEY_SOURCE_DRIFT`,
  `PHASE_9B_R1_BLOCKED_SOURCE_FRESHNESS_UNRESOLVED`,
  `PHASE_9B_R1_BLOCKED_EXACT_HEAD_CI`, `PHASE_9B_R1_BLOCKED_CONTAINMENT`,
  `PHASE_9B_R1_BLOCKED_SEMANTIC_NONDETERMINISM`,
  `PHASE_9B_R1_BLOCKED_HARNESS_RUNTIME_DEFECT`, or an exact AUTH/PROTOCOL/
  JOURNEY/CONTAINMENT blocker).

Always: exactly one launcher invocation; zero mutation; zero production;
zero DB/infra; zero raw customer-value persistence; zero silent semantic
failure; truthful report with the explicit product-contact accounting
(launcherInvocations / browserContextsCreated / devObservationPasses /
completedJourneyPairs); NEXT ACTION STOP.

## Stop conditions

Any pre-launcher gate failure -> STOP with the exact blocker BEFORE invoking
the launcher. Any safety/privacy violation -> immediate STOP. Source
advanced between freshness check and launch -> STOP. Auth fails between
FIRST and REPLAY -> STOP (`PHASE_9B_R1_BLOCKED_AUTH_EXPIRED_BEFORE_REPLAY`).
Semantic nondeterminism (FIRST PASS / REPLAY ANOMALY or materially
different fingerprints) -> STOP. After the ONE launcher run: STOP; any R2
requires a fresh owner authorization.
