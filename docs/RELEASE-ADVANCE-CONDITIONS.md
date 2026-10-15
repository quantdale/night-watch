# Release advance conditions and verdict (F-12)

This document is the human surface of `nightwatch.release-certification.v1`. The
machine authority is `config/release-certification.v1.json`, the deterministic
judgement in `src/core/releaseCertification/index.ts` and the evaluation plus
advance refusal in `bin/project-state-check.mjs`, which re-evaluates everything
here from the tree as it stands; nothing on this page is hand-maintained truth.

## The verdict is never presented bare

Project completion status: `OPERATIONALLY_ACCEPTED`.
`<!--status:PROJECT_COMPLETION_STATUS=OPERATIONALLY_ACCEPTED-->`

The three counts that give the status meaning are carried with it:

- lanes proven: **9** `<!--status:VALIDATION_LANE_PROVEN_COUNT=9-->`
- lanes externally blocked with a current record: **0**
  `<!--status:VALIDATION_LANE_BLOCKED_EXTERNAL_COUNT=0-->`
- lanes never attempted: **1**
  `<!--status:VALIDATION_LANE_UNAVAILABLE_CAPABILITY_COUNT=1-->`
- separately, proven lanes carrying stale evidence: **1**
  `<!--status:VALIDATION_LANE_STALE_EVIDENCE_COUNT=1-->`

Those four figures are the LEDGER's declared lane-class counts
(`GOVERNED_STATUS_KEYS`, enforced by `hardening:check`). The live gate resolves each
lane's evidence at the certified checkpoint instead, and **live at HEAD `c931444a`
(2026-10-10) it measures `proven=0 externallyBlocked=0 neverAttempted=1
staleEvidence=10`**: all ten declared `PROVEN` lanes carry evidence that does not
resolve at the certified checkpoint, so none counts as proven today. Both measures are
true; only the second tells an operator what `project:check` says now. A surface
presenting `PROJECT_COMPLETION_STATUS` without the counts fails the render guard
(`PROJECT_STATE_VERDICT_PRESENTED_BARE`). Reconciled after the 2026-09-12 group-9 lane
flip (D-133); re-rendered from live output at M13 (2026-10-10).

Owner decision 13.8 is TAKEN (2026-09-12, D-129): `PROJECT_COMPLETION_STATUS`
stays `OPERATIONALLY_ACCEPTED` until all sixteen advance conditions are MET and
exact-head CI is green at the certified checkpoint; the only advance status is
`PROJECT_COMPLETE_AND_CI_CERTIFIED`, and it is not claimed. The record encodes
the taken decision as `nextStatus.state: DECIDED` with `decidedBy: D-129` (A-19).
External production track: `EXTERNAL_PREREQUISITE_UNMET`, never counted among the
advance conditions.

## The ordered advance conditions — LIVE rendering (2026-10-10)

A condition with no registered check fails the definition itself
(`PROJECT_STATE_RELEASE_DEFINITION_CHECK_UNBACKED`). The states below are the
**live** evaluation `npm run project:check` produced at HEAD `c931444a` on
2026-10-10 against the certified checkpoint `027367d9…` (`status: PASS`,
`conditionsMet: 0`, `conditionsUnmet: 16`, `certificationRefused: true`,
`advanceClaimed: false`, `checkoutClean: true`, `activeTaskContinuity: PASS`).

| # | Condition | Backing check | LIVE state at `027367d9` |
|---|---|---|---|
| 1 | `validation-lane-closure` | `validation-lane-state` | UNMET `EVIDENCE_ARTIFACT_ABSENT_AT_SHA` — all ten declared lanes `STALE_EVIDENCE` |
| 2 | `exact-head-ci-authority` | `ci-block-record` | UNMET — `TOPOLOGY_RECEIPT_ABSENT`: no local topology receipt at the certified checkpoint; CI is `EXECUTED_PASS` per the block record, but a run envelope is not local proof |
| 3 | `autonomous-yield-proof` | `yield-campaign-result` | UNMET — no qualifying yield-campaign receipt among the 42 newest runs |
| 4 | `completion-ledger-truth` | `ledger-agreement` | NOT_AT_CHECKPOINT `EVIDENCE_ARTIFACT_ABSENT_AT_SHA` (measured PASS on the working tree: `tasks=219`, `ledger_errors=0`) |
| 5 | `operator-cli-contract` | `operator-cli-sweep` | NOT_AT_CHECKPOINT `EVIDENCE_ARTIFACT_ABSENT_AT_SHA` |
| 6 | `documentation-currency` | `documentation-currency-rules` | NOT_AT_CHECKPOINT `EVIDENCE_ARTIFACT_ABSENT_AT_SHA` |
| 7 | `workspace-continuity-drift-closure` | `workspace-claims` | NOT_AT_CHECKPOINT `STALE_EVIDENCE` |
| 8 | `dependency-supply-chain-currency` | `dependency-advisory-lane` | NOT_AT_CHECKPOINT `EVIDENCE_ARTIFACT_ABSENT_AT_SHA` |
| 9 | `dead-architecture-closure` | `dead-architecture-closure-check` | NOT_AT_CHECKPOINT |
| 10 | `cli-implementation-contract` | `cli-implementation-contract` | NOT_AT_CHECKPOINT `STALE_EVIDENCE` |
| 11 | `structural-rule-soundness` | `structural-rule-registry` | NOT_AT_CHECKPOINT `STALE_EVIDENCE` |
| 12 | `schema-version-lifecycle` | `schema-version-lifecycle-check` | NOT_AT_CHECKPOINT |
| 13 | `ui-error-taxonomy-rendering` | `ui-error-taxonomy-check` | UNMET |
| 14 | `configuration-contract` | `configuration-contract-check` | NOT_AT_CHECKPOINT |
| 15 | `accessibility-certification` | `accessibility-certification` | UNMET `STALE_EVIDENCE` |
| 16 | `authenticated-capability-lifecycle` | `authenticated-capability-lifecycle-check` | NOT_AT_CHECKPOINT |

Nine conditions carry `staleEvidence` (1, 4, 5, 6, 7, 8, 10, 11, 15); the rest
are `NOT_AT_CHECKPOINT` or plainly `UNMET`. **Zero of sixteen are MET.** The
certification is REFUSED, not merely unmet: `certificationRefused: true` with
`advanceClaimed: false`, so `project:check` exits 0 while refusing it. The
2026-09-12 table this replaces ("4 of 16 MET, 5 UNMET, 7 awaiting the group that
creates their check", checkpoint `88e3c3fb…`) is superseded: every check it
called UNAVAILABLE now exists and is wired, so the honest state is "measured and
not bound at this checkpoint", not "awaiting its check". Closing all sixteen at
one checkpoint S is `certify:evidence` (below), campaign task 15.3.

### The live exact-head CI observation (2026-10-10)

`gh run list --limit 1 --json databaseId,headSha,conclusion,status` returns
`[{"conclusion":"failure","databaseId":37881189722,"headSha":"88987013e93f9f4d147db6e2982f70529e9d72a4","status":"completed"}]`.
That run executed at `88987013` (= `origin/main`), `completed/failure`, gate receipt
`receipt:sha256:3fac6ebff9630c2f2fecbdec`, node v22.23.3 / npm 10.9.9,
`environmentClass: CI`: GATE_DEFINITION, STATIC, BIN_TYPECHECK_CEILING, HARDENING and
HARDENING_PROBES PASS, then `HANDOFF_TRUTH` TEST_FAILURE and the remaining nine groups
NOT_RUN. The cause is the continuity mismatch at that commit (ACTIVE_TASK `SESSION
WORKTREE: NONE` against STATE `Branch:
session/nightwatch-final-product-complet-bd061869`); the repair `ea26954e` is
committed in the campaign worktree but unintegrated, so it has no CI observation. The
newest GREEN run is `37125148449` at `545b24f3`. The billing block is retired (D-03 /
R2-61): Actions executes on every push, and a red run is repaired forward.

### Repository visibility (live, 2026-10-10)

`gh repo view quantdale/night-watch --json visibility,isPrivate` returns
`{"isPrivate":false,"visibility":"PUBLIC"}`. **The repository is PUBLIC.**
D-149's owner decision stands; returning it to private is an owner/admin action,
is PENDING, and is tracked as campaign task 15.8. No safety invariant depends on
the repository being private (`docs/SAFETY_MODEL.md` §33).

## The production path is an external track

C-12 → C-14 and P4 are excluded from the advance conditions by construction and
reported with their own status (`EXTERNAL_PREREQUISITE_UNMET` while
`POSITIVE_DEPLOYMENT_FACTS: 0`), so another organization's decision about `mochi`
access or observer identity cannot make the project permanently incompletable
while remaining visible. The G10.6/G10.13 path is taken (2026-09-12): the
authorized read-only `mochi` access is unavailable — no `mochi` checkout and no
`services/{env}/{appproxy,serviceproxy}/ingress.yaml` exists under the sibling
root — so C-13 and C-14 are recorded terminal in `docs/ROADMAP.md` and here
(D-134), and no deployment fact is claimed.

## Evidence binding and `STALE_EVIDENCE`

Every condition binds the SHA at which its evidence was earned. Evidence that
strictly precedes the certified checkpoint is reported `STALE_EVIDENCE`: the
condition does not count as met and the certification is refused. Advancing the
baseline therefore voids the prior observation until it is re-earned at the new
baseline; a `null` binding means no evidence has been earned yet. Until the
bindings are re-earned, the verdict reports the certification refused — the
intended consequence, not a gate failure: unmet and stale conditions fail
`project:check` only when an advance status is claimed.

## Producing and committing the evidence (review-5, D-152)

Evidence is produced at the certified checkpoint S by `npm run certify:evidence`; a COMMAND subject never measures the observing
checkout but a GUARDED MEASUREMENT ROOT — an exact clean checkout of S that the producer verifies (object identity, `HEAD == S`, tree, cleanliness) before the declared command executes there — while the observer is a documentary descendant of S (D-174).
`produce --subject <id>` measures one subject (a condition's live check, a fixed command run in the measurement root, or the GitHub Actions run at S) and STAGES
one allowlisted receipt under the git-ignored `artifacts/certification-staging/<S>/`;
a non-MET measurement writes a `NOT_MET` receipt that never verifies. `import
--subject <id>` stages an existing host receipt byte-for-byte once the real verifier
accepts it. `publish` copies the staged receipts the real verifier accepts into the
TRACKED `evidence/certification/<S>/<subject>.json`; `bind` then rewrites only the
value keys (`evidenceSha`, `receiptDigest`, `observedAt`, `executor`) of each binding
with a verified receipt. Both land in a documentary descendant of S, which never
counts as the implementation anchor (`project:check` refuses a
`LAST_SUBSTANTIVE_IMPLEMENTATION_SHA` touching only approved checkpoint paths). A
clean clone or CI runner verifies exactly what the host produced: the verifier reads
the tracked directory, and the four host-bound checks (exact-head CI authority,
autonomous yield, dependency assessment, accessibility record) consume the committed
measurement of S where the host capability is absent. The autonomous yield run
qualifies only against the GRANTED record in `config/yield-run-authorization.v1.json`
(NOT_GRANTED by default). Receipts are tamper-evident, not tamper-proof: no signature,
key or MAC, and nothing in them is a path, host, cookie, header or customer value.

## Owner decision (13.8), the documentary rule and the integration choreography

Taken 2026-09-12 (D-129), as stated above: the status stays `OPERATIONALLY_ACCEPTED`
until all sixteen ordered conditions are MET and exact-head CI is green at the
certified checkpoint, and `PROJECT_COMPLETE_AND_CI_CERTIFIED` remains the only advance
status and is not claimed. No new status name was added and none is needed: the
owner's decision applies the existing advance status under a stricter precondition, so
the gate and the certified condition set are unchanged. The full offline regression,
`gate:local`, `gate:clean` and `gate:topology`, the UI and browser lanes, the
documentary receipt commit and the fast-forward integration are the terminal
campaign's M14 choreography (tasks 15.1-15.6), culminating in a `main`-only clean
topology equal to `origin/main` with exact-head CI `EXECUTED_PASS` at S.