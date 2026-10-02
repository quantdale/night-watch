## Context

The parent campaign `nightwatch-final-product-completion-v1` is paused at the
clean checkpoint `d68bb1a7` (documentation-only descendant of `2e0cfda0`,
whose exact-head CI run 36916725274 is GREEN, 15/15 groups). The release
verdict is 0/16 conditions met, certification refused (fail-closed). The
review-4 child is closed and archived. Review-5 (`audit.md`, reproduced
verbatim from `RESUME_PROMPT_5.md` §3) is the complete scope of this change.

The parent's design decisions and owner decisions OD-1..OD-6 stay in force.
This change adds the owner decision "both" (below), recorded as **D-152** in
`docs/DECISIONS.md`, and resolves the review-5 findings without weakening any
guard.

## Goals / Non-Goals

**Goals.** Close the real integrity defects first (Track A): archive-move
smuggling, rename-hidden deletions, receipts that verify from a dirty tree or
for subjects their producer never ran, guard families that are text anchors,
the DEV-launcher effect scan, the CLI regressions, the CI record, the small
truths, and the process breaches. Then make certification reachable honestly
(Track B): a real producer for every one of the 16 conditions and 11 lanes,
verifiable from a clean clone, ending in a fixture-repository proof of 16/16.

**Non-Goals.** No cryptographic receipt authentication (OD-5), no parent
milestone work (M9 10.4 onward stays in the parent), no use of the parent's
single-use grants (the 12.3 paid run and the 15.4 npm query), no new product
scope, no Alphaus DEV/NEXT/production contact, no new absolute home path, no
publication, and no review-6 by default.

## Owner decision (verbatim, source: `RESUME_PROMPT_5.md` header and §1)

> **Owner decision (2026-10-02): "both".** Keep OD-2 (target
> `PROJECT_COMPLETE_AND_CI_CERTIFIED` under D-129, all 16 conditions). Do two
> things together in one bounded child campaign,
> `nightwatch-final-completion-review5-v1`:
>
> - **Track A — integrity and product fixes.** Real defects. Do this track first.
> - **Track B — make certification reachable, honestly.** Every one of the 16
>   conditions gets a real producer that can be verified from a clean clone.

## Decisions

### D152-1. Order is Track A, then B1, then B2..B6

Track A fixes (groups A1–A9) land first, each with its regression test and its
mutants, one commit per fix. Track B starts only after the Producer Matrix
below is complete for all 16 conditions and all 11 lanes and the change is
strict-validated. A row that cannot be completed honestly is an owner question
(STOP), never a guess.

### D152-2. Mutation testing is behavioural and committed

Every guard added or fixed is covered by a behavioural test; a source-text
anchor alone never counts. Every R5-05/R5-06 mutant is registered as a probe
and DETECTED. One committed mutation harness applies each registered mutant to
a scratch copy, runs `hardening:check` plus the guard's focused tests, and
fails on any survivor; it runs in `gate:milestone`.

### D152-3. Certification evidence is verified from a clean clone

A receipt that lives only in git-ignored host directories certifies nothing
CI or `gate:clean` checks. The persistence mechanism is chosen in task B1.1 and
recorded in D-152. The recommended mechanism: receipts produced at the
certified checkpoint S are committed as tracked files under one approved,
schema-validated evidence path, in a documentary descendant of S. OD-5 still
holds: receipts are tamper-evident, not tamper-proof.

### D152-4. Exit rule

If Track B cannot make all 16 conditions reachable honestly, the campaign
STOPs and reports which conditions and why; it does not keep adding machinery.
The owner then decides whether to narrow OD-2.

### D152-5. One bootstrap commit; the ledger registration is mechanically second

The task-ID ledger records the 40-hex SHA of the bootstrap commit whose
`tasks.md` is the ID baseline, and a commit cannot contain its own hash. The
change, its continuity and PLAN M0 are therefore ONE commit, and the ledger
registration that names that commit follows immediately in the same unpushed
batch. Both are pushed together; no intermediate state is ever pushed.

## Certification Producer Matrix

Filled in task B1.1 (EMPTY until then); Track B code does not start until
every row is complete and this change strict-validates. One row per condition
and per lane. Columns: the producer command and the gate group that runs it;
the receipt kind and schema; the closed subject set; the verdict field(s);
where the receipt is persisted; how a clean clone (CI, `gate:clean`) verifies
it; and which commit S it binds to and how a documentary descendant commits it.

### Conditions (16)

| # | Subject | Producer command | Gate group | Receipt kind / schema | Closed subject set | Verdict field(s) | Persistence | Clean-clone verification | Binds to S / documentary-descendant route | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `validation-lane-closure` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 2 | `exact-head-ci-authority` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 3 | `autonomous-yield-proof` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 4 | `completion-ledger-truth` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 5 | `operator-cli-contract` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 6 | `documentation-currency` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 7 | `workspace-continuity-drift-closure` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 8 | `dependency-supply-chain-currency` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 9 | `dead-architecture-closure` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 10 | `cli-implementation-contract` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 11 | `structural-rule-soundness` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 12 | `schema-version-lifecycle` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 13 | `ui-error-taxonomy-rendering` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 14 | `configuration-contract` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 15 | `accessibility-certification` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 16 | `authenticated-capability-lifecycle` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |

### Lanes (11)

| # | Subject | Producer command | Gate group | Receipt kind / schema | Closed subject set | Verdict field(s) | Persistence | Clean-clone verification | Binds to S / documentary-descendant route | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 17 | `root-compile` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 18 | `bin-parse` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 19 | `structural-invariants` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 20 | `authoritative-gate` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 21 | `full-regression` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 22 | `clean-checkout` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 23 | `ui` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 24 | `browser-workflow` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 25 | `owner-manual` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 26 | `exact-checkpoint-ci` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |
| 27 | `dependency-advisory` | TBD (B1.1) | TBD | TBD | TBD | TBD | TBD | TBD | TBD | EMPTY |

## Risks / Trade-offs

- **Reachability may genuinely be impossible for a condition** (for example a
  condition whose only honest producer is the owner's paid run). That is the
  exit rule's case: STOP and report, never fabricate a producer.
- **The mutation harness adds gate time.** It runs in `gate:milestone` only,
  against scratch copies, with a declared per-mutant bound.
- **Evidence in git is public while the repository is public** (D-149): the
  committed receipts carry only classification tokens, hashes and subjects,
  never a path, cookie, header or customer value.
