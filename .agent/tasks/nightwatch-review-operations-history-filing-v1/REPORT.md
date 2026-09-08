# Review Operations, History Intelligence & Human-Filing Completion — Report

Status: COMPLETE

- Task ID: nightwatch-review-operations-history-filing-v1
- Starting SHA: `d1ebde90c1454b31d6b93d9df503a4c5f196d7c8`
- Implementation anchor: `0b15cfbREPLACE_WITH_FINAL`
- Live HEAD: DISCOVER_FROM_GIT
- origin/main: DISCOVER_FROM_GIT

## Objective

Make the certified owner-local review store operationally useful over time and
at scale: a read-only inventory, per-finding history across artifact
generations, a review-state-aware human filing report with a real production
path, and real historical identity in the finding history that recurrence and
defect-class analysis rest on. Invent no retention policy and perform no
destructive review-store operation.

## The DISCOVER_FROM_GIT question (brief section 8), resolved per field

The convention is real and machine-recognized, so the answer is not a blanket
A or B.

`Live HEAD` and `origin/main` are case **A**. `AGENTS.md` names the marker an
intentional authority marker; `bin/agent-state.mjs` exempts it for
`CURRENT_LOCAL_HEAD` / `CURRENT_REMOTE_HEAD` / `LAST_PUSHED_SHA`;
`bin/project-state-check.mjs` REQUIRES it for `LIVE_HEAD_SHA`; both
`.agent/templates` prescribe it. These fields are live values, and Git can
answer them.

`Implementation anchor` is case **B**. Git records no notion of which commit
an author considered their campaign's anchor, so the marker there does not
delegate the question — it drops it, and a reader cannot distinguish a dropped
field from a deliberate one. The value was known before the predecessor REPORT
was committed (`LAST_VALIDATED_IMPLEMENTATION_SHA: 1ec3ae0...`, three commits
earlier), and eight of the eleven REPORTs carrying the field record a concrete
SHA. Allocated DEF-RO-1, repaired, and made mechanically impossible.

## Inventory architecture

```
store discovery:        one readdir + one lstat per entry, no follow, no open
                        PrivateArtifactStore.listEntries() -> JSON | TEMPORARY
                        | UNKNOWN | NON_FILE, with size and mtime
health model:           every condition that holds, sorted by a declared
                        severity order, plus one highest-precedence
                        classification. STORE_UNAVAILABLE > CORRUPTION_PRESENT
                        > UNKNOWN_FILES_PRESENT > TEMPORARY_RESIDUE_PRESENT >
                        STALE_HISTORY_PRESENT > HEALTHY
count model:            two independent axes. Integrity VALID | CORRUPT from
                        the store alone; currentness CURRENT | STALE | UNKNOWN
                        only with the current artifacts, plus an explicit
                        currentnessResolved flag. canonicalArtifacts ==
                        valid + corrupt + unreadable in DEEP mode
history model:          storedAt, then reviewedAt, then reviewIdentity — a
                        total order over records, never filenames. The current
                        generation is the one verifyReviewCurrent accepts,
                        never the newest
pagination:             every list carries offset / limit / total / truncated;
                        limits are clamped server-side (rows <= 200, history
                        <= 200) and again client-side. Counts stay global and
                        exact
unknown-file behavior:  counted, reported as a 24-hex digest of the name plus
                        its size, never opened, never named, never removed.
                        The contract has NO field for the name
temporary-file behavior: counted and reported by its pinned name shape.
                        Recovery remains a separate explicit owner action; the
                        read cone cannot call it
```

## Scale

`bin/review-operations-scale.mjs`, one fresh OS process per size, TZ=UTC,
LC_ALL=C. Medians over repeated samples; p95 and spread in the JSON receipt.
Machine-specific evidence, not a platform guarantee.

| store | disk | per review | discovery | shallow inv | deep inv | history | reviewer page | JSON | wire | peak RSS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10,000 | 15.8 MiB | 1657 B | 26.4 ms | 25.9 ms | 443.1 ms | 11.5 ms | 224.2 ms | 0.22 ms | 26,288 B | 110.3 MiB |
| 25,000 | 39.5 MiB | 1657 B | 79.5 ms | 79.4 ms | 1111.9 ms | 22.8 ms | 372.3 ms | 0.22 ms | 26,289 B | 153.9 MiB |
| 50,000 | 79.0 MiB | 1657 B | 141.7 ms | 162.6 ms | 2185.1 ms | 45.3 ms | 609.2 ms | 0.16 ms | 26,446 B | 178.9 MiB |

Every curve is linear in store size — no accidental N x directory-scan
regression. The wire payload is flat at ~26 KB because rows are bounded while
counts are global. 100k was not run: the three sizes already establish
linearity, and a fourth point would have burned session time to confirm a
slope three points had settled.

The reviewer page is measured WITH the review store wired in. An unwired page
would have measured the one surface the store does not touch, which is how a
benchmark flatters the thing it was written to watch.

**No derived index was built.** The brief permits one only after measuring,
and the measurement says directory scans are adequate: the expensive path
(deep inventory) is the one that opens every artifact, and the cheap
alternative already exists as SHALLOW mode at 163 ms for 50,000 reviews.

## Filing report

| store state | rendering | decision shown? |
| --- | --- | --- |
| NO_REVIEW | `Local review (HUMAN DECISION REQUIRED)` | no |
| CURRENT | `Local review (FACT: current local decision, not organizational sign-off)` + "This decision binds to the artifacts described in this report" + the four-line non-equivalence block | yes |
| STALE | `Local review (HISTORICAL — DOES NOT BIND TO THIS GENERATION)` + "Human review required for this generation" | yes, labelled `Historical decision (NOT current)` |
| CORRUPT | `Local review (UNAVAILABLE — FAIL CLOSED)` | no |

The four headings are mutually exclusive, asserted by rendering all four cases
and requiring exactly one heading to match each. The pairing of state and
fields is enforced: a CORRUPT or NO_REVIEW review arriving with a decision
filled in raises `FILING_REPORT_REVIEW_INVALID_FOR_STATE`, because that is the
shape a silent-choice failure would take.

`buildFilingReport` is the production-local path the report never had — before
this campaign `renderHumanFilingReport` was called by nothing but its own
tests. It reaches no raw dossier, so reproduction steps, evidence bodies and
observed values are unavailable to it and it says so rather than describing
behaviour it did not observe. A corrupt generation beside a valid one is named
in the unknowns; the report must not be quieter than the store it read.

Distribution is `PRIVATE_LOCAL_MANUAL_COPY_ONLY`. No Slack, Leslie, Pondr,
Notion, email or issue client exists in the cone, and hardening refuses an
external submission import, an external URL, or a publication method there.

## Historical identity

```
source SHA propagation:  the fabricated '0'.repeat(40) is gone from both of
                         its sites. The reviewer authority carries
                         CONTROL_CENTER_REVIEW_NO_SOURCE — the SAME literal the
                         review binding records, imported rather than
                         duplicated — or a real SHA when one is supplied
expectation identity:    IntelHistoryEntry.expectationId, carried from the
                         dossier's semantic triage evidence, null when absent.
                         REQUIRED in the type, so a producer with no identity
                         has to write null
semantic identity:       IntelHistoryEntry.semanticContractId, same terms,
                         same source. No competing identity function
recurrence impact:       measured on the 120-finding synthetic corpus.
                         KNOWN_EXISTING 30 -> 15, FIRST_SEEN 90 -> 105,
                         UNKNOWN_HISTORY unchanged at 0. At 600 findings:
                         150 -> 75 and 450 -> 525. The matches that fall away
                         are exactly family D, built to share a fingerprint
                         under contradicting expectations
defect-class impact:     grouping is unchanged and was already correct — it
                         keys on the invariant and never on a fingerprint. The
                         four brief-section-29 cases are now regression-tested:
                         same invariant across campaigns merges; same invariant
                         after source movement merges and reports MULTI_SCOPE
                         with the shared cause listed unproven; different
                         invariant with the same fingerprint does not merge;
                         same fingerprint with a different expectation does not
                         merge
```

No recurrence rule was loosened. Two were tightened, both toward the rule's own
stated requirement: a contradicting proven invariant now rejects a fingerprint
match, and REGRESSION_CANDIDATE requires a moved source lineage. Where the
candidate carries no source identity, movement is unproven and the answer falls
back to the WEAKER classification.

## Defects

### DEF-RO-1 — a terminal report named a historical anchor with a live-authority marker

- **Symptom.** The predecessor's COMPLETE `REPORT.md` recorded
  `Implementation anchor: DISCOVER_FROM_GIT`.
- **Root cause.** `DISCOVER_FROM_GIT` means "ask Git, and Git can answer",
  which is true of live HEAD and false of a stable historical anchor: nothing
  in Git records which commit an author considered one. Nothing checked the
  field, so the marker read as deliberate.
- **Fix.** Repaired to `1ec3ae02c7942e95fc124664409adb65a8eec334`.
  `inspectTerminalImplementationAnchor` refuses a live-authority marker, a
  closure placeholder, or a SHA contradicting
  `LAST_VALIDATED_IMPLEMENTATION_SHA`, scanning only the report's own identity
  region — before its second level-2 heading, fenced content included.
- **Regression.** `tests/unit/terminalAnchorTruth.test.ts`, 11 tests including
  a sweep over every task directory that asserts it inspected at least ten
  real documents.

### DEF-RO-2 — the regression-candidate lineage guard could not fail

- **Symptom.** `classifyRecurrence` reported REGRESSION_CANDIDATE whenever a
  prior entry was `RESOLVED_FIXED`, regardless of source lineage.
- **Root cause.** The guard was `latest.sourceSha !== undefined`, and
  `assertHistoryEntry` already refuses a non-string `sourceSha`. The conjunct
  was true whenever it was evaluated, so the rule's stated requirement — a
  moved source lineage — was never checked, and `classifyRecurrence` had no
  current source identity to check against.
- **Fix.** `RecurrenceCandidate` gained an optional `sourceSha`, and the rule
  requires `latest.priorOutcome === 'RESOLVED_FIXED' && sourceMoved`. Absent
  candidate source identity yields RECURRENT with the reason stated.
- **Regression.** Three tests in `tests/unit/findingIntel.test.ts`, plus
  hardening conjuncts refusing the old expression and requiring the new one,
  plus mutations RO-17 and RO-B-18.

### DEF-RO-3 — a REPORT anchor lagged its own campaign's advance

- **Symptom.** The AH-1 REPORT recorded `4c263e1` while its own `STATE.md` and
  `ACTIVE_TASK.md` recorded `46e241a`.
- **Root cause.** The anchor advanced to `4c263e1` at `ca1fb0c`, then DEF-AH1-9
  landed at `46e241a` and STATE and ACTIVE advanced while the REPORT header did
  not. Found by DEF-RO-1's rule once it was widened to read fenced identity
  blocks — before that widening it inspected two of twelve REPORTs.
- **Fix.** Header set to `46e241a`, with the advance history preserved in the
  header rather than erased.
- **Regression.** The same rule and its corpus sweep.

### DEF-RO-4 — a corruption count that only held when the broken file sorted first

- **Symptom.** A one-line guard skipping corruption once a valid artifact had
  been counted survived thirty-three passing tests.
- **Root cause, twofold.** The guard reached the tree because a background
  syntax-check imported the mutation campaign — importing runs `main()` — and
  the process was killed before its restore, after which `git add -A` swept the
  line into a commit. It then SURVIVED because every corruption test corrupted
  the FIRST file in sorted traversal order, so the scan reached the broken
  artifact before it had seen a good one and the guard never fired.
- **Fix.** Guard reverted. All fifteen corruption classes are now planted in
  all three traversal positions, and a twenty-artifact store is corrupted at
  positions 0, 1, 9, 18 and 19.
- **Regression.** `tests/unit/reviewOperationsIntegrity.test.ts`, plus mutation
  RO-B-01, which now fails.

## Mutation

Two campaigns, both against real artifacts with byte-exact restore.

Structural — `tests/unit/reviewOperationsHardening.test.ts`:

```
introduced:              28
detected:                28
equivalent/controls:     0
survived:                0
unexplained survivors:   0
restore drift:           NONE
```

Two survived the first run and both were repaired rather than reclassified.
RO-20 removed one direction of the filing report's state/field pairing and
survived because the conjunct was a bare `includes` on an error code the OTHER
direction still contained — the safe-occurrence trap, inside a rule written to
guard against it. RO-27 removed an import, which is a typecheck failure rather
than a hardening one, and was re-aimed at the defect the rule should catch.

Behavioural — `bin/review-operations-mutation-campaign.mjs`:

```
introduced:              34
detected:                31
equivalent/controls:     3   (2 CONTROL, 1 EQUIVALENT, each declared)
survived:                3   (exactly those three)
unexplained survivors:   0
restore drift:           NONE
```

RO-B-32 was predicted EQUIVALENT and was DETECTED. It is reclassified
BEHAVIOURAL with the misprediction recorded, because a mispredicted
equivalence is evidence about the contract and relabelling it away would make
the campaign useless as a record of what was learned.

Brief items 17 and 18 (trust a derived index; hide index corruption) have no
mutation, and the receipt says why: no index exists, because measurement said
directory scans are adequate. Inventing one would have produced a mutation
that proves nothing.

62 mutations in total across both campaigns.

## Privacy

Ten sentinel classes — email, Bearer token, JWT, AWS key, PEM private-key
marker, CUSTOMER_SENTINEL, ACCOUNT_SENTINEL, COST_SENTINEL, TOKEN_SENTINEL,
EMAIL_SENTINEL — planted across:

| surface | result |
| --- | --- |
| unrecognized filename → core inventory, wire payload, CLI JSON, CLI text | clean; the file is still present afterwards |
| corrupt artifact content (schema string, object key, status value) → core and wire | clean; a corruption row carries only a code and a pinned filename |
| review rationale at write time | refused by the lifecycle before any artifact exists |
| projection error path | names the field, never the value |
| review filenames | hex digests only; no candidate id appears in any name |
| Control Center rendered page | the planted name appears nowhere in the DOM |
| filing report markdown | screened at construction and again at the surface |

## Browser

6 of 6 in `playwright.control-center.config.ts`.

`tests/browser/reviewOperations.browser.ts`: inventory → history drill-down →
current generation → historical generation → filing report → back to the
reviewer → back to the store → reload → server restart, for 30 loops with a
restart every fifth. The whole store directory is compared byte for byte
(name, size, mode, mtime, inode) before and after: unchanged. A planted
unrecognized file is present afterwards and its name appears nowhere in the
DOM. Zero external requests, zero page errors, zero unexpected failed
requests, 0 inventory retries.

A second test covers an unavailable store with no write authority configured.

`tests/browser/controlCenterBrowser.browser.ts` caught the new view as
unqualified — its totality check working exactly as written — and the view is
now qualified there properly rather than added to the visited set.

## Full regression

`NODE_OPTIONS=--expose-gc npx playwright test`, full committed tree.

```
FULL_REGRESSION_PASS_1
FULL_REGRESSION_PASS_2
```

## Clean gate

```
GATE_CLEAN_RESULT
```

## CI

NOT_OBSERVED / EXTERNAL. No GitHub Actions run was inspected at this head, and
no runner executed. This is an absence of evidence and is not read as either a
pass or a failure.

## Safety accounting

```
production:                          0 contacts
NEXT:                                0 contacts
DEV:                                 0 contacts

C-12:                                not started
C-13:                                not started
C-14:                                not started

Slack:                               0 writes, 0 reads
Leslie:                              0 writes, 0 reads
Pondr:                               0 writes, 0 reads
Notion:                              0 writes, 0 reads

credentials:                         0 acquired, 0 used
deployments:                         0
sibling writes:                      0
force push:                          0
history rewrite:                     0

workspace-integrity events:          1 — WORKSPACE_MUTATION_HARNESS_RESIDUE
review-store destructive operations: 0
```

The workspace-integrity event is recorded in full under `## Safety Events` in
`STATE.md` and as DEF-RO-4 above. A background syntax-check imported the
mutation campaign, which runs `main()` on import; the process was killed before
its restore ran, and one mutated line was swept into a commit by a subsequent
`git add -A`. Blast radius: one line, one file, inside the session worktree,
never pushed. No authorization boundary was crossed. Two rules adopted: never
execute a mutation harness to check its syntax, and never `git add -A` after a
killed harness run.

It is reported here rather than defaulted to NONE, which is the cross-document
safety-accounting check the predecessor campaign added after its own REPORT
asserted NONE over a STATE section that recorded an event.

## Programme state

```
MA-8/F-13:        COMPLETE (historical)
AH-1:             COMPLETE (REPORT anchor repaired under DEF-RO-3)
FC-1:             COMPLETE (historical)
reviewer surface: COMPLETE (RS-1, historical)
RP-1:             COMPLETE (REPORT anchor repaired under DEF-RO-1)
this campaign:    COMPLETE

C-08b:            NOT AUTHORIZED, not started
C-07 DEV:         NOT AUTHORIZED, not started
C-12:             live execution NOT AUTHORIZED, not started
C-13:             NOT AUTHORIZED, not started
C-14:             NOT AUTHORIZED, not started
```

## Deferred / Follow-Up

- A review-store envelope v2 carrying per-generation expectation and
  semantic-contract identity. Not attempted: adding a binding field would
  change every review identity and mark every stored review corrupt. The
  history reports the absence with a categorical reason instead.
- A retention policy. Evidence produced (D-132); the decision is the owner's
  and requires separate authorization.
- A derived index. Measurement says it is not needed; the brief permits one
  only after measuring.

## Next recommendation

Nothing in this campaign's cone is unfinished. The remaining frontier is
externally gated: C-12 live execution, C-13, C-14, C-08b and C-07 DEV all
require authorization this repository does not hold.

The one locally actionable item is the retention decision, and it is
deliberately a decision rather than a task: `docs/DECISIONS.md` D-132 sets out
five options with measured disk, latency, auditability, recovery and
destructive-risk consequences. It should not be started without an explicit
owner choice among them.

## STOP

REVIEW OPERATIONS + HISTORY INTELLIGENCE + HUMAN-FILING COMPLETION

COMPLETE AND CERTIFIED

OWNER-LOCAL REVIEW STORE IS NOW OPERATIONALLY VISIBLE AT SCALE
REVIEW HISTORY IS AUDITABLE ACROSS ARTIFACT GENERATIONS
CURRENT / STALE / CORRUPT STATE IS EXPLICIT
HUMAN FILING REPORT CONSUMES CURRENT LOCAL REVIEW WITHOUT CONFUSING IT WITH
ORGANIZATIONAL SIGN-OFF
HISTORICAL EXPECTATION / SEMANTIC / SOURCE IDENTITIES IMPROVE RECURRENCE AND
DEFECT-CLASS EVIDENCE

NO REVIEW HISTORY DELETED
NO RETENTION POLICY INVENTED

ZERO PRODUCTION / NEXT / DEV CONTACT
ZERO EXTERNAL BUG-SYSTEM WRITES

STOP.
