# AH-1 Alphaus Finding Handoff + C-12 Operator Readiness — Report

Status: COMPLETE

## Campaign

```text
Campaign: AH-1 Alphaus-compatible human-review finding handoff + C-12 operator readiness + durable documentation reconciliation
Task ID: nightwatch-alphaus-finding-handoff-c12-readiness-v1
Starting SHA: 4ca990f9bead33ae5626c4ae4f21dc833f41aec2
Implementation anchor: 4c263e1c690110de07cea826166e06b70df1ca7e
Final SHA: Live HEAD: DISCOVER_FROM_GIT (see Git section at release)
Status: COMPLETE
```

## Authorization accounting (final)

```text
real production contacts: 0
production reads: 0
production writes: 0
NEXT operations: 0
DEV operations: 0
Slack writes: 0
Leslie actions: 0
Pondr writes: 0
external publications: 0
credential changes: 0
production config changes: 0
deployments: 0
restarts: 0
sibling writes: 0
destructive Git operations: 0
force pushes: 0
```

## Architecture delivered

- `src/core/alphausHandoff/` — `nightwatch.alphaus-finding-handoff.v1`:
  pure BugDossier projection with facts/recommendations/authority
  separation, UNKNOWN first-class, whole-draft sentinel scan (extended with
  email/SSN shapes on the draft edge), literal non-weakable authority
  block, bounty-identifier screening in caller prose, closed vocabularies
  for severity/catch-stage/source/evidence-level/minimality/fault-boundary/
  confidence/count.
- `src/core/c12Readiness/` — `nightwatch.c12-readiness.v1`: pure advisory
  preflight over caller-supplied descriptors, ten BLOCKED_* codes,
  all-blockers report, window started/expired/capped, exact dotted hostname,
  PROVEN-only deployment fact, attribution, inspected-never-consumed
  authorization, kill-switch armed + not engaged.
- `bin/c12-preflight.mjs` (`npm run c12:preflight`): fresh per-run
  tsc compile, report-only stdout, 64 KiB descriptor cap, exit 0/2/1.
- `docs/C12-OPERATOR-RUNBOOK.md`: ten-row ledger, placeholder-only
  checklist, teardown procedure. `docs/ALPHAUS-FINDING-HANDOFF-CONTEXT.md`:
  Slack-derived evidence with EXPLICIT/OBSERVED/INFERRED/OPEN classes,
  pilot-sensitive, non-canonical. OpenSpec change with proposal/design/
  tasks/audit/spec.
- Registration: AH-1 certification entry (3 suites), synthetic-lane
  entries, `checkAlphausHandoffBoundary` (cone isolation + literal values
  + transport patterns) and `checkDocumentationFreshness`, both defined,
  invoked, and negative-probed.

## Tests (final)

- `tests/unit/alphausFindingHandoff.test.ts` — 40/40 (schema, severity,
  catch-stage, source, team/owner, privacy incl. email/SSN/bounty-word,
  authority/scoring, shape refusals).
- `tests/unit/c12ReadinessPreflight.test.ts` — 31/31 (contract incl. future
  window + single-label, CLI operability incl. size cap).
- `tests/unit/alphausHandoffProperties.test.ts` — 7/7 (448 seeded cases,
  HANDOFF_SEED 0xA41F, PREFLIGHT_SEED 0xC12E).
- `npm run typecheck` — clean. `npm run hardening:check` — PASS (59/59).
- `npm run agent:check` — 0 strict errors. `npm run project:check` — PASS.
- `npm run gate:local` at `ca1fb0c` — 11/11 PASS, receipt
  `receipt:sha256:025570f11a841beba9d79eac` (SEMANTIC 2033/2020/13/0, OWNER
  91/91, SYNTHETIC 1129/1129/0).
- Full regression `npm test` — 3807 passed / 13 skipped / 0 failed.
- `npm run gate:clean` — PASS on Node 20 at `ca1fb0c`, install PASS,
  inner receipt `receipt:sha256:400193b4521e1aa961dbac62`.

## Mutation campaign

```text
introduced: 22
detected: 22
survived: 0
```

AH1-M01..M16 (provenance, sentinel, source remap, team default, code owner,
outage inference, severity default, bounty field, humanReview, executable,
publication, connector import, deployment/subject/attribution/wildcard
gates) + M17..M22 (email/SSN alternates, future window, single-label,
bounty prose, authority literal, dynamic import). Driver
`/tmp/ah1_mutation.py` (untracked); every probe byte-restored
(digest-verified) with post-campaign green re-pass.

## Property tests

Seeds and invariants per file header; 448 cases; 0 failures. Invariants:
authority literals, source preservation, provenance-gated severity,
production-never-outage, sentinel rejection, READY-iff-prerequisites,
INFERRED-never-admits.

## Defects discovered

- DEF-AH1-1: property fixture used non-canonical fault boundary
  (`APPLICATION`); gate SYNTHETIC caught 4 failures. Repaired with
  canonical sampling.
- DEF-AH1-2: plain email/SSN bypassed sentinel (independent review, High).
  Repaired with draft-edge extension + 2 tests + M17.
- DEF-AH1-3: future window reported READY. Repaired with start check +
  test + M18.
- DEF-AH1-4: hardening missed dynamic import/subpath/bare/global
  transports. Repaired with broadened patterns + M22.
- DEF-AH1-5: authority presence-check bypassable. Repaired with literal
  checks + M21.
- DEF-AH1-6: bounty identifiers admissible in caller prose. Repaired with
  screening + test + M20.
- DEF-AH1-7: single-label host admitted. Repaired with dot requirement +
  test + M19.
- DEF-AH1-8: unbounded CLI descriptor read. Repaired with 64 KiB cap +
  test.
- Accepted boundaries (documented in design): caller honesty for asserted
  evidence, presented-fact coherence, `pr_review` unreachable at v1,
  receipt-length rationale, undefined→null for optional fields,
  `withoutComments` limits (mega-campaign follow-up).

## C-12 readiness ledger

```text
implementation binding: SATISFIED (repository-side; MA-8 anchor + AH-1 head)
PQ evidence: EXTERNAL_REQUIRED
operator subject: EXTERNAL_REQUIRED
scope config: EXTERNAL_REQUIRED
deployment fact: BLOCKED (C-08b organizationally blocked)
attribution: EXTERNAL_REQUIRED (binding)
privacy destination: EXTERNAL_REQUIRED
kill switch: SATISFIED (mechanism) + EXTERNAL (arming)
window: EXTERNAL_REQUIRED (values)
authorization — EXTERNAL_REQUIRED (fresh C-12-specific)
```

C-12 is NOT READY, NOT authorized, NOT executed. Zero production contact.

## Alphaus documentation

Owner-supplied Slack facts recorded in
`docs/ALPHAUS-FINDING-HANDOFF-CONTEXT.md` with evidence classes; strong:
S1–S4 terms, SLAs, filing fields, human-filing requirement, sign-off,
customer-escaped zero-point behavior; uncertain: point tables, prevention
bonus, accountability arithmetic, LOW/MEDIUM/HIGH mapping, rewards.
Deliberately NOT encoded: bounty arithmetic, team/owner inference,
duplicate/genuine verdicts.

## Documentation reconciliation

CURRENT_STATE header/CI/critical-path updated, MA_8/AH_1/C_12 topology
rows, live-state block; D-116/D-117; ROADMAP resolution annotation;
stale-phrase sweep clean; `checkDocumentationFreshness` added and
negative-probed.

## CI

Exact-head CI inspected once per policy at release (see Git section). The
recent standing signature is `runner_id = 0`, empty runner name, zero
steps (`NO_STEPS_EXTERNAL_NON_EVIDENCE`); no rerun loop, no workflow
changes to stimulate runners.

## Git

```text
Starting HEAD: 4ca990f9bead33ae5626c4ae4f21dc833f41aec2
Final HEAD: (filled at release; live HEAD authority: GIT)
origin/main: (verified HEAD == origin/main at release)
worktree: session/nightwatch-alphaus-finding-hando-c009d87c (removed at release)
live sessions: none (released at close)
changed files: (see commit list)
commits: bfc4bfd, cb6e338, 2a299cf, 8d33c82, f14457b, 4c263e1, ca1fb0c, a6a5b61 (+ closure)
force push: 0
```

## Final programme state

```text
MA-8/F-13: COMPLETE
AH-1: COMPLETE
C-12: PENDING EXTERNAL/OWNER PREREQUISITES (NOT authorized, NOT begun)
C-08b: organizationally blocked
C-07 DEV: NOT AUTHORIZED
C-13: not begun
```

Next recommended campaign: the finding-intelligence + human-review +
C-12-simulation follow-up (separately authorized; NOT begun here).

```text
C-12 WAS NOT EXECUTED BY THIS CAMPAIGN.
```
