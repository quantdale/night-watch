# Corrective campaign — Report

Status: COMPLETE
Task ID: nightwatch-final-completion-corrections-v1
Phase: COMPLETION_CORRECTIONS_V1
CHILD OF: nightwatch-final-product-completion-v1
Starting SHA: 1d47e2eef1ef029560ace12e31571624602eab0b

Active child-campaign report; the final report (with every finding's
disposition) is written at close-out (task 6.4). The 31 audit findings were
re-verified at the parent base `1d47e2ee` before any edit: 21 STILL_PRESENT,
5 CHANGED, 2 COMPLETED_LATER (VB-04 and VD-05's rule, both landed in the
parent's `a784e668`), and 3 follow-on defects (CF-01, CF-02, CF-03) were
recorded where later parent work built on a defective surface.

Safety events: no Alphaus environment, database, cloud, credential, or
external publication contact; no sibling repository mutation; no force push
or history rewrite; all testing local/synthetic. External contact is OD-3
only. The owner authorized one canonical restore command
(`git checkout -- <the 16 files>`) on 2026-09-28 (RESUME_PROMPT §1);
canonical was verified clean with `workspace:check` PASS afterwards.

## Close-out (2026-10-01)

Close-out status: COMPLETE. Every finding has exactly one disposition.

**Milestones.** M1 bootstrap/preconditions; M2 formatter policy; M3 certification
anchors (VB-01..VB-07); M4 validation spine (VC-01..VC-11 + CF-04/CF-05); M5
release probes (4.1-4.9); M6 ledger/continuity truth (5.1-5.6); M6.5 review-2
corrections (7.1-7.15); M6.6 review-3 corrections (8.1-8.16); M7 close-out
(6.2-6.4). 73 tasks ticked.

**Audit findings.** The 29 re-verified findings (22 STILL_PRESENT, 6 CHANGED,
1 COMPLETED_LATER) and the follow-on defects CF-01..CF-05 are closed or
honestly recorded: VB-01..VB-07 (tasks 2.1-2.8), VC-01..VC-11 (3.1-3.12),
VD-01..VD-05 + CF-01..CF-03 (4.1-4.9), VA-01..VA-05 (5.1-5.6); VE-01 (6.1);
CF-04/CF-05 repaired at the M4 CI gate. Review-2's RV-01..RV-20 (7.1-7.15) and
review-3's R3-01..R3-17 (8.1-8.16) are closed with their regressions/probes.

**Validation.** `npm test` 5848/0/34; `gate:dev` PASS (5848/0); `gate:milestone`
PASS (12 steps, full probe campaign 209/209); `gate:local` 15/15 groups PASS
(`receipt:sha256:030bc83d1ef06cc219167f3d`, TOPOLOGY PROVEN/BUBBLEWRAP); UI
105/105; `campaign:synthetic` PASS; `openspec validate --all --strict` 125/125;
`gate:clean` PASS at `b4d0c611` (`clean-receipt:sha256:bdae336ff5a8c9a182ac9430`).
Exact-head CI: 36717972936 (`f887e76b`), 36790169165 (`027367d9`), 36796334869
(`14efed2e`), 36797226757 (`b4d0c611`) — all 15/15 GREEN.

**Recorded deviations.** FLAKE-003 (OPEN: full-lane browser/monitor timing under
host contention; 9/5824 at `0f4b911b`, isolation and bounded-load runs pass);
CORR-CORR-002 (recorded violation, history not rewritten); the 7.14 rewording
(disclosed by annotation); the temporary public visibility (D-149 Decision 2;
owner reverts at parent 15.x); the retained session branch
`session/nightwatch-final-completion-corr-c45f0e9d` (0 unique commits, orphan
attention).

**Handoff.** ACTIVE_TASK routes back to `nightwatch-final-product-completion-v1`
IN_PROGRESS with Next action "M9 task 10.2 remainder". The change is archived as
`2026-10-01-nightwatch-final-completion-corrections-v1` with `--skip-specs`.

## Review-4 corrections (2026-10-01, appended — never rewritten)

Appended by review-4 task 5.2 (R4-20). Nothing above this heading was edited:
the historical bytes of this report are preserved, and every correction below is
a dated, appended annotation.

**Header figures corrected.** The paragraph above says "31 audit findings …
21 STILL_PRESENT, 5 CHANGED, 2 COMPLETED_LATER". The measured re-verification at
the parent base `1d47e2ee` was **29 findings: 22 STILL_PRESENT, 6 CHANGED,
1 COMPLETED_LATER** (VB-04; VD-05's rule also landed in the parent, recorded
below). The "31" conflated the 29 findings with the count including follow-on
defects. The follow-on defects CF-01..CF-05 are additional, not findings.

**Per-ID disposition table (all 71 IDs).** Every ID below appears individually
with exactly one disposition and the task(s) that carried it.

| ID | Task(s) | Disposition |
| --- | --- | --- |
| `VB-01` | 2.1 | CLOSED (task 2.1; regression/probe recorded in the close-out section) |
| `VB-02` | 2.2 | CLOSED (task 2.2; regression/probe recorded in the close-out section) |
| `VB-03` | 2.3 | CLOSED (task 2.3; regression/probe recorded in the close-out section) |
| `VB-04` | 1.3,2.4,7.13 | CLOSED (was COMPLETED_LATER: the rule landed in the parent a784e668) |
| `VB-05` | 2.4,2.5 | CLOSED (task 2.4,2.5; regression/probe recorded in the close-out section) |
| `VB-06` | 2.6 | CLOSED (task 2.6; regression/probe recorded in the close-out section) |
| `VB-07` | 1.3,2.7 | CLOSED (task 1.3,2.7; regression/probe recorded in the close-out section) |
| `VC-01` | 3.1,7.12,7.15,8.12 | CLOSED, then RESTORED by review-4 R4-16 (task 4.3): the storage-state live cookie-readability test is back in the required list |
| `VC-02` | 3.2 | CLOSED (task 3.2; regression/probe recorded in the close-out section) |
| `VC-03` | 3.3,3.12 | CLOSED (task 3.3,3.12; regression/probe recorded in the close-out section) |
| `VC-04` | 3.4,3.6 | CLOSED (task 3.4,3.6; regression/probe recorded in the close-out section) |
| `VC-05` | 3.5 | CLOSED (task 3.5; regression/probe recorded in the close-out section) |
| `VC-06` | 1.3,3.6 | CLOSED (task 1.3,3.6; regression/probe recorded in the close-out section) |
| `VC-07` | 1.3,3.7,7.11 | CLOSED (task 1.3,3.7,7.11; regression/probe recorded in the close-out section) |
| `VC-08` | 3.8 | CLOSED (task 3.8; regression/probe recorded in the close-out section) |
| `VC-09` | 3.9 | CLOSED (task 3.9; regression/probe recorded in the close-out section) |
| `VC-10` | 3.10 | CLOSED (task 3.10; regression/probe recorded in the close-out section) |
| `VC-11` | 3.11 | CLOSED (task 3.11; regression/probe recorded in the close-out section) |
| `VD-01` | 1.3,4.1 | CLOSED (task 1.3,4.1; regression/probe recorded in the close-out section) |
| `VD-02` | 4.2 | CLOSED (task 4.2; regression/probe recorded in the close-out section) |
| `VD-03` | 1.3,4.3 | CLOSED (task 1.3,4.3; regression/probe recorded in the close-out section) |
| `VD-04` | 1.3,4.4 | CLOSED (task 1.3,4.4; regression/probe recorded in the close-out section) |
| `VD-05` | 1.3,4.5 | CLOSED (was COMPLETED_LATER: the rule landed in the parent a784e668) |
| `VA-01` | 5.1,5.2 | CLOSED (task 5.1,5.2; regression/probe recorded in the close-out section) |
| `VA-02` | 1.3,5.6 | CLOSED (task 1.3,5.6; regression/probe recorded in the close-out section) |
| `VA-03` | 5.3 | CLOSED (task 5.3; regression/probe recorded in the close-out section) |
| `VA-04` | 5.4 | CLOSED (task 5.4; regression/probe recorded in the close-out section) |
| `VA-05` | 5.5 | CLOSED (task 5.5; regression/probe recorded in the close-out section) |
| `VE-01` | 1.2,1.3,6.1 | CLOSED (task 1.2,1.3,6.1; regression/probe recorded in the close-out section) |
| `CF-01` | 1.3,4.7,7.13 | CLOSED (task 1.3,4.7,7.13; regression/probe recorded in the close-out section) |
| `CF-02` | 4.8 | CLOSED (task 4.8; regression/probe recorded in the close-out section) |
| `CF-03` | 1.3,4.9,6.4,7.13 | CLOSED (task 1.3,4.9,6.4,7.13; regression/probe recorded in the close-out section) |
| `CF-04` | 3.12,7.13,8.15 | CLOSED at the M4 CI gate: run 36552500573 at 3c9c1a06 (the earlier 491b5ef9 observation cannot be cited as its proof — that run failed overall) |
| `CF-05` | 3.12,6.4 | CLOSED: the ledger-cap fixture paces on the observer drain signal (3c9c1a06) |
| `RV-01` | 7.1 | CLOSED (task 7.1; regression/probe recorded in the close-out section) |
| `RV-02` | 7.2 | CLOSED (task 7.2; regression/probe recorded in the close-out section) |
| `RV-03` | 7.3 | CLOSED (task 7.3; regression/probe recorded in the close-out section) |
| `RV-04` | 7.4 | CLOSED (task 7.4; regression/probe recorded in the close-out section) |
| `RV-05` | 7.4 | CLOSED (task 7.4; regression/probe recorded in the close-out section) |
| `RV-06` | 7.5 | CLOSED (task 7.5; regression/probe recorded in the close-out section) |
| `RV-07` | 7.6 | CLOSED (task 7.6; regression/probe recorded in the close-out section) |
| `RV-08` | 7.6 | CLOSED (task 7.6; regression/probe recorded in the close-out section) |
| `RV-09` | 7.7 | CLOSED (task 7.7; regression/probe recorded in the close-out section) |
| `RV-10` | 7.8 | CLOSED (task 7.8; regression/probe recorded in the close-out section) |
| `RV-11` | 7.9,8.15 | CLOSED (task 7.9,8.15; regression/probe recorded in the close-out section) |
| `RV-12` | 7.10 | CLOSED (task 7.10; regression/probe recorded in the close-out section) |
| `RV-13` | 7.11 | CLOSED (task 7.11; regression/probe recorded in the close-out section) |
| `RV-14` | 7.12 | CLOSED (task 7.12; regression/probe recorded in the close-out section) |
| `RV-15` | 7.12 | CLOSED (task 7.12; regression/probe recorded in the close-out section) |
| `RV-16` | 7.13 | CLOSED (task 7.13; regression/probe recorded in the close-out section) |
| `RV-17` | 4.7,4.8,4.9 | CLOSED (task 4.7,4.8,4.9; regression/probe recorded in the close-out section) |
| `RV-18` | 7.13 | CLOSED (task 7.13; regression/probe recorded in the close-out section) |
| `RV-19` | 7.14 | CLOSED with a narrowing: the formatter policy is real (R4-17 re-verified it) but the behavioural control only ran where a Prettier binary existed |
| `RV-20` | 7.14 | CLOSED (task 7.14; regression/probe recorded in the close-out section) |
| `R3-01` | 8.1 | CLOSED (task 8.1; regression/probe recorded in the close-out section) |
| `R3-02` | 8.2 | CLOSED (task 8.2; regression/probe recorded in the close-out section) |
| `R3-03` | 8.3 | CLOSED (task 8.3; regression/probe recorded in the close-out section) |
| `R3-04` | 8.3 | CLOSED (task 8.3; regression/probe recorded in the close-out section) |
| `R3-05` | 8.4 | CLOSED (task 8.4; regression/probe recorded in the close-out section) |
| `R3-06` | 8.5 | CLOSED (task 8.5; regression/probe recorded in the close-out section) |
| `R3-07` | 8.6 | CLOSED (task 8.6; regression/probe recorded in the close-out section) |
| `R3-08` | 8.7 | CLOSED (task 8.7; regression/probe recorded in the close-out section) |
| `R3-09` | 8.8 | CLOSED (task 8.8; regression/probe recorded in the close-out section) |
| `R3-10` | 8.9 | CLOSED (task 8.9; regression/probe recorded in the close-out section) |
| `R3-11` | 8.10 | CLOSED (task 8.10; regression/probe recorded in the close-out section) |
| `R3-12` | 8.11 | CLOSED (task 8.11; regression/probe recorded in the close-out section) |
| `R3-13` | 8.12 | CLOSED; extended by review-4 R4-16 (task 4.3) with the correct required list |
| `R3-14` | 8.13 | CLOSED with a narrowing: the parent-cwd control ran a node one-liner, not Prettier (R4-17, task 4.4) |
| `R3-15` | 8.14 | CLOSED (task 8.14; regression/probe recorded in the close-out section) |
| `R3-16` | 3.12,4.1,4.5,4.9,7.9,7.14,8.15 | CLOSED (task 3.12,4.1,4.5,4.9,7.9,7.14,8.15; regression/probe recorded in the close-out section) |
| `R3-17` | 8.16 | CLOSED (task 8.16; regression/probe recorded in the close-out section) |

**Tick annotations (task 8.2-8.16 and 7.15).** Those ticks were committed on
session commits that had not been integrated and carried no
`(implemented; CI pending)` annotation. The first push carrying them was
`673e2ddb`, and its exact-head CI run `36787018515` was **RED**
(SYNTHETIC_CAMPAIGN TEST_FAILURE; the SHA-bound topology artifact was never
produced). The group was CI-observed GREEN later, at `027367d9` (run
`36790169165`). The ticks stand; the missing annotation is recorded here.

**Task 6.4 DONE note.** `6.4` (write the final report, archive with spec sync,
route ACTIVE_TASK back to the parent) was ticked without a DONE note. DONE:
this report and the archive
`openspec/changes/archive/2026-10-01-nightwatch-final-completion-corrections-v1/`
were produced, and ACTIVE_TASK was routed back to the parent at M9 10.2
remainder by `a408d31b`.

**CI-run pairing correction (`a408d31b`).** The commit message pairs the
advanced baseline `027367d9` with "CI 36797226757 green". Run `36797226757`
executed at `b4d0c611` (the child close-out head), not at `027367d9`. The
exact-head run for `027367d9` is `36790169165` (green, all 15 groups). Both
statements are true of their own SHA; the pairing in the message was
inaccurate and is corrected here. The `gate:clean`
receipt `clean-receipt:sha256:bdae336ff5a8c9a182ac9430` was emitted at
`b4d0c611`, as the message's own parenthetical says.

**STATE CF-04 attribution (STATE.md lines 673-676).** The
`36537649045` at `491b5ef9` observation says "the CF-04 fix PROVEN" on the
strength of SYNTHETIC_CAMPAIGN's skip policy PASS 14/0. That run FAILED overall
(SEMANTIC_COMPATIBILITY, `observerSemanticLedger:138`), so it cannot be cited as
the CF-04 proof. CF-04's proof is the M4 CI gate at `3c9c1a06` (run
`36552500573`, SYNTHETIC_CAMPAIGN 1966/1926/40/0 with skipPolicy PASS 40/0).
The historical line is preserved; this annotation governs.

**CORR-PERF-001 re-encode.** The `oldLineExcerpt` of `CORR-PERF-001` in
`config/document-role-corrections.v1.json` encodes the archive line's em dash as
`\u2014`, while `oldLineSha256` is the digest of the LITERAL line. The excerpt is
therefore a re-encoding of the same line, not a byte-identical copy. The digest
— the field the pairing rule actually uses — is unaffected; the excerpt is
presentation. Recorded here so a future reader does not read the mismatch as a
corrupted registration.
