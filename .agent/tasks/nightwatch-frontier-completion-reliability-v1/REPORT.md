# Report — nightwatch-frontier-completion-reliability-v1

Status: IN_PROGRESS

## Campaign

```text
Campaign: Nightwatch Frontier Completion & Deep Reliability
Task ID: nightwatch-frontier-completion-reliability-v1
Starting SHA: f99df10cdcbae5a6f291c781a650501f386de83c
Implementation anchor: 919dba0a890df88c1dda9a9f846b77dedf29751b
Live HEAD: DISCOVER_FROM_GIT
```

## Starting truth

Base `f99df10` == `origin/main`, canonical clean, one session worktree.
Predecessor `nightwatch-plan-explain-coherence-v1` COMPLETE/STOP.

**What the previous reports got right.** `src/core/alphausHandoff/`,
`src/core/c12Readiness/`, `docs/C12-OPERATOR-RUNBOOK.md`,
`docs/ALPHAUS-FINDING-HANDOFF-CONTEXT.md`, `src/core/aiReview/`, and the
campaign/campaignIntel/changeIntel machinery all exist as described. The
human-review-only invariant, the external-publication prohibition, and the
absence of bounty scoring were verified, not assumed. The predecessor test
batch ran 79/79 green.

**Discrepancies discovered.** Three, all material:

1. The reported "clean gate PASS" and green full regression were both run
   against a checkout whose `node_modules` still contained a package the
   manifest no longer declared. A fresh install fails. See DEF-FC-03.
2. Two hardening rules were defined but never invoked, so the checker was
   enforcing less than it appeared to. See DEF-FC-02.
3. The reported ~5% residual renderer-stall rate did not reproduce in 100
   consecutive iterations.

## Architecture changes

**Finding lifecycle and review** (`src/core/findingReview/`). Post-dossier
states with `REVIEW_PENDING` as the only non-terminal state. A decision
produces a receipt bound to the finding, dossier and handoff digests, the
source SHA, campaign id, handoff version, and privacy-projection version.
`verifyReviewCurrent` recomputes every bound digest from current artifacts,
so a mutated or regenerated dossier, a rebased source, or a re-versioned
projection fails closed with `FINDING_REVIEW_STALE`. A second decision on a
decided record is refused. Key reordering is not a mutation: the digest is
computed over canonically sorted JSON.

**Review authority.** Every receipt carries
`organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY'` and an explicit
`notEquivalentTo: ['LESLIE_GENUINE', 'LESLIE_INVALID', 'PONDR_APPROVED']`.
A receipt claiming any other authority is rejected, not honoured.

**Relationships** (`src/core/findingIntel/`). `EXACT_SAME_FINDING`,
`PROBABLE_DUPLICATE`, `RELATED_FINDING`, `SHARED_DEFECT_CLASS`,
`REGRESSION_CANDIDATE`, `UNRELATED`, `UNKNOWN` — derived only from
executable fingerprint, expectation identity, semantic contract, sanitized
failure signature, route, source lineage, and replay outcome. Prose is
never an input. Every result exposes counterevidence alongside evidence and
carries `advisoryOnly: true` with
`finalVerdictAuthority: 'HUMAN_ORGANIZATIONAL'`.

**Duplicates.** A `PROBABLE_DUPLICATE` is a lead with a `possibleOriginalId`
pointer, evidence, counterevidence, and a confidence class. It is never an
organizational duplicate verdict.

**Recurrence.** `FIRST_SEEN`, `RECURRENT`, `REGRESSION_CANDIDATE`,
`KNOWN_EXISTING`, `UNKNOWN_HISTORY`, bound to campaign timestamps, source
SHA lineage, and finding identities. `REGRESSION_CANDIDATE` requires both a
proven prior fix and a moved source lineage; neither is inferable from the
other, and absent history the mechanical verdict stands unchanged.

**Defect classes.** Grouping by shared semantic invariant (contract first,
expectation as fallback). Singletons are not classes. A member whose replay
outcome contradicts the class is listed as a counterexample, not a member,
and caps class confidence.

**Expectation provenance and confidence.** Ranked provenance with machine
contracts strongest. Weak provenance (`SYNTHETIC_ORACLE`, `HEURISTIC`,
`UNKNOWN`) caps claimable confidence, so weak expectation evidence cannot
masquerade as a confirmed defect. `PROVEN` requires a mechanical proof
artifact and is refused otherwise. Confidence is categorical throughout —
no invented probabilities.

**Human filing report.** A private, copyable Markdown document labelling
every section textually (FACT / RECOMMENDATION / MECHANICAL DERIVATION /
ADVISORY / UNKNOWN / HUMAN DECISION REQUIRED), never by colour alone.
Ambiguous impact renders UNKNOWN; `production` never implies
`production_outage`; `customer_escaped` is never rewritten to `self_found`;
a team without evidence renders UNKNOWN and a named team without evidence
is refused. Every scalar and list field is sentinel-scanned.

**C-12 rehearsal** (`src/core/c12Rehearsal/`). A complete offline P1 session
driving the real `evaluateP1ObservationScope`,
`attachP1ObservationSession`, and `issueP1ObserveGrant` against mock edges
pinned to the unresolvable `.invalid` namespace. The receipt binds the
implementation SHA, P1 scope-chain version and definition digest, readiness
version, rehearsal-config digest, and scenario. Only the clean passive
scenario reaches `LOCAL_REHEARSAL_PASS`; Nightwatch traffic, UNKNOWN
attribution, zero qualifying events, and an engaged kill switch each fall
short rather than passing with a caveat. Every receipt on every path
carries `liveAuthorization: 'NOT_CONFERRED_SYNTHETIC_ONLY'`.

**Hardening.** Three new rules — `checkC12RehearsalBoundary`,
`checkFindingFrontierBoundary`, `checkDeclaredDependencyResolvability` —
plus two existing authority checks made occurrence-complete, plus
`tests/unit/hardeningRuleParity.test.ts` enforcing rule definition/call
parity.

## Environmental lane

```text
runs:              100 (two independent batches of 50)
failures:          0
failure rate:      0/100
root cause:        not reproduced at this commit
fix:               none required in this campaign
post-fix runs:     n/a
remaining owner decision: NONE on current evidence
```

The predecessor reported ~5% residual renderer-stall flakes and asked for a
retry-policy decision. That rate did not reproduce. At a true 5% rate, 0/100
has probability ≈0.6%, so the earlier rate is most consistent with a defect
already removed by the click-robustness commits `a4d35d0` (visibility-gated
dispatch for sibling Inspect clicks) and `b7a1272` (hardened sibling Inspect
clicks and 6b loop toggles against box stalls).

No retry policy was invented, and none is needed on this evidence. If a
stall recurs, the failing iteration must be captured and classified before
any retry is added — a retry would hide exactly the signal needed.

## Defects

### DEF-FC-01 — AI draft prose bound to the wrong candidate

- Symptom: an `AiBugDraft` written for one candidate could supply another
  candidate's handoff reproduction, expected, actual, impact, and
  uncertainties.
- Root cause: `facts()` consumed `bugDraft` without checking
  `bugDraft.candidateId` against `dossier.candidateId`.
- Fix: reject as `ALPHAUS_HANDOFF_INVALID:BUG_DRAFT_CANDIDATE_MISMATCH`.
- Regression: `tests/unit/alphausFindingHandoff.test.ts`; mutation M28.

### DEF-FC-02 — two hardening rules defined but never invoked

- Symptom: `checkC00WorkspaceIntegrity()` and
  `checkC10ProductionPrivacyBoundary()` were present, reviewed, and
  enforcing nothing; `checkAlphausHandoffBoundary()` ran twice.
- Minimal reproduction: `grep '^check\w*();' bin/hardening-check.mjs` and
  compare against `^function check\w*(`.
- Root cause: an edit adding new rule invocations replaced two existing
  invocation lines instead of appending. A defined-but-uncalled rule reads
  exactly like a live one, so review by inspection cannot catch it.
- Fix: invocations restored, duplicate removed.
- Regression: `tests/unit/hardeningRuleParity.test.ts` enforces parity in
  both directions plus no-duplicate-invocation; mutations M40, M41.

### DEF-FC-03 — a required devDependency removed as "unused"

- Symptom: a fresh `npm ci` followed by the full suite fails with
  `Error: Cannot find module 'vue/dist/vue.js'`.
- Minimal reproduction: clean clone, `npm ci`,
  `npx playwright test tests/unit/rippleReadiness.test.ts`.
- Root cause: campaign `nightwatch-unused-dep-removal-v1` removed `vue`
  after a reference scan that looked only for import/`from` specifiers.
  `tests/unit/rippleReadiness.test.ts` reaches it through
  `require.resolve('vue/dist/vue.js')`. The canonical checkout's stale
  `node_modules` still held the package, so the campaign's own full
  regression and its "clean gate PASS" claim both ran against residue.
- Fix: `vue@2.6.12` restored at the exact prior version. The test is not
  incidental — it proves against real Vue 2.6.12 that mounting replaces the
  `#app` bootstrap target with the rendered `.q-layout-container.layout`
  shell, the source-backed premise of the whole Ripple readiness contract.
  A hand-written stub would assert only its own fixture.
- Consequence accepted and documented: the low-severity Vue 2 `parseHTML`
  ReDoS advisory (GHSA-5j4c-8p2g-v4jx) returns. It is dev-only, offline, and
  parses a fixed local render function; the only non-major fix is Vue 3,
  which would destroy the fixture's purpose. `npm audit` reports 1 low, not
  0. Recorded as D-118; D-87's superseding note reconciled.
- Regression: `checkDeclaredDependencyResolvability()` fails closed when
  tracked source resolves an undeclared package, covering `require.resolve`,
  dynamic `import()`, and `from` alike; mutation M18.

## Privacy red team

Sentinel categories planted and rejected: `CUSTOMER_SENTINEL`,
`ACCOUNT_SENTINEL`, `EMAIL_SENTINEL`, `COST_SENTINEL`, `TOKEN_SENTINEL`,
`Bearer` tokens, JWT-shaped values, AWS-shaped keys, PEM private-key
headers, and email addresses.

Surfaces exercised: every `IntelFindingDescriptor` field (findingId,
expectationId, semanticContractId, failureSignature, route, sourceLineage),
recurrence finding and campaign identities, and every scalar and list field
of the human filing report including the reviewer-authored review block.

Two mutations (M31, M32) initially survived: the intel cone's sentinel
screen existed but nothing exercised it — the only test named "sentinel"
was exercising a different function in the triage cone. Both are now
detected. Result: no sentinel escapes the approved projection.

## Mutation campaign

```text
introduced: 41
detected:   39
controls:   2  (M03, M19 — comment-only, correctly did not fail)
survived:   0
restore drift: 0 (every file byte-identical after restore)
```

Categories: finding truth, authority, durability, privacy, classification,
C-12, dependency truth, hardening self-integrity.

This took three rounds. Round 1 left 6 survivors; round 2 left 8. Every
survivor was a genuine coverage gap, and each was closed with a real test
rather than a weakened assertion:

- regression-chronology preconditions (M04, M05)
- review organizational authority, both what receipts carry and what
  verification rejects (M11, M12)
- C-12 live authorization on every receipt path and every scenario (M13, M15)
- the findingIntel sentinel screen (M31, M32)
- exhaustive report field scanning (M33)
- the Alphaus vocabulary constants and reproduction-result validation
  (M25–M27, M30)

Two hardening literal checks were made occurrence-complete after M12/M13
proved that an `includes(literal)` rule passes while an unsafe value sits on
another line, because a safe occurrence elsewhere in the file satisfies it.

M16 is recorded as an **equivalent mutant with evidence**, not a survivor:
the rehearsal denies at admission before attach, so the attach-level
kill-switch probe is unreachable from rehearsal inputs, and the mid-session
kill switch is proven in `tests/unit/p1Attribution.test.ts:260`
(`killSwitchProbe: () => polls >= 3`).

## Determinism

```text
fresh-process runs:      20
unique semantic digests: 1
```

`node bin/frontier-determinism.mjs 20` compiles the probe cone fresh to a
disposable directory, then runs it in 20 fresh OS processes with
deliberately varied `TZ` (UTC / Asia/Manila) and `LC_ALL` (C /
en_US.UTF-8), so an environment-sensitive output cannot hide behind a fixed
environment. Covered: relationship classification and digests, recurrence,
defect classes and their digests, provenance ranking, review artifact
digests (including key-order stability), and the C-12 rehearsal receipt.

## Full regressions

```text
#1 (pre-commit, dirty tree):  3883 passed / 2 failed / 13 skipped
#2 (committed tree 919dba0):  3885 passed / 0 failed / 13 skipped
```

The two failures in #1 were `selfDevAdoptionCli` expecting
`SELFDEV_ARTIFACT_NOT_FOUND` and receiving
`SELFDEV_AUTHORITATIVE_SOURCE_DIRTY`. `package.json` is a
selfDev-authoritative path and the DEF-FC-03 fix left it uncommitted; the
guard fired correctly. Both pass on the committed tree. This is recorded
rather than quietly dropped: it is the difference between a real regression
and a precondition, and only the committed-tree run is authoritative.

Baseline for comparison: the predecessor reported 3814 passed / 0 failed /
13 skipped. The suite grew by 71 tests; the skip inventory is unchanged at
13.

## Authorization accounting

```text
production contacts: 0
production reads:    0
production writes:   0

NEXT:                0
DEV:                 0

Slack:               0
Leslie:              0
Pondr:               0

credentials:         0
deployments:         0
restarts:            0

sibling writes:      0
force pushes:        0
history rewrites:    0
```

## Programme state

```text
MA-8/F-13:          COMPLETE (unchanged)
AH-1:               COMPLETE (unchanged)
this campaign:      see Status above
C-08b:              NOT AUTHORIZED (unchanged, external)
C-07 DEV:           NOT AUTHORIZED (unchanged)
C-12:               PENDING_EXTERNAL_OWNER_PREREQUISITES;
                    local rehearsal LOCAL_REHEARSAL_PASS,
                    live authorization NOT conferred
C-13:               NOT AUTHORIZED (unchanged)
environmental lane: no residual flake reproduced (0/100)
```

No owner-gated or frozen scope was unlocked.
