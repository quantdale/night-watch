# EXECUTION PROMPT — review-5 corrective child campaign

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-final-completion-review5-v1
OpenSpec: openspec/changes/nightwatch-final-completion-review5-v1/
Planned-From: d68bb1a7c7cf244da654815a1e7f266e1985f30c
Target Branch: main
Predecessor Task ID: nightwatch-successor-campaign-engine-v1
Predecessor Status: COMPLETE

Child of: `nightwatch-final-product-completion-v1` (paused at M9 task 10.4,
canonical-routed before this child's session).

## Mission

Resolve every finding of the independent review-5 (`audit.md`, verbatim from the
owner's corrective prompt §3) inside one bounded child campaign, in two tracks:
Track A (real integrity and product defects) first, then Track B (make release
certification reachable, honestly, for all 16 conditions). Close the child with
the full authoritative validation set (committed mutation harness at zero
survivors), exact-head CI green, `gate:clean` from canonical, a per-ID
disposition table for R5-01..R5-18, archival with spec sync, and ACTIVE_TASK
routed back to the parent at "M9 task 10.4". Owner decision D-152: "both".

## Scope

Frozen by the change's `tasks.md` (groups A1-A9, B1-B6, C) and `design.md`
(D152-1..D152-5 and the Certification Producer Matrix). The review-5 scope is
closed; there is no review-6 by default. Exit rule: if Track B cannot make all
16 conditions reachable honestly, STOP and report which ones and why.

## Ordered workstreams

1. Track A, in order: A1 archive-move integrity, A2 deletions, A3 receipt
   verification completeness, A4 behavioural guard coverage and the mutation
   harness, A5 DEV-launcher AST effect analysis, A6 CLI correctness, A7 CI
   record truth, A8 small truths, A9 process and continuity.
2. Track B, in order: B1 the Producer Matrix (complete and strict-validated
   before B2), B2 producers, B3 clean-clone verifiability, B4 yield proof,
   B5 topology verdict, B6 reachability proof.
3. C close-out.

## Rules

- Mutation testing is behavioural and committed; a text anchor alone never
  counts.
- Never tick on an unintegrated commit without `(implemented; CI pending)`.
  Never close a group or the child without an observed green exact-head CI at
  the tip that contains the close-out.
- Never push without running `hardening:check`, `agent:check`, `project:check`,
  `typecheck`, `typecheck:bin` and the affected focused suites first (`npm run
  prepush` once A9.2 lands). Never commit on canonical without a live
  MAINTENANCE claim recorded in the claim journal.
- Never change a truthful record to satisfy a guard: fix the guard, or record
  the conflict and STOP.
- Receipts are tamper-evident only. No wording may call them forgery-proof or
  unforgeable.
- The parent owns the single-use grants (the 12.3 paid run, the 15.4 npm
  query). The repository is temporarily public: nothing secret,
  customer-derived, authentication-bearing or identifying may be published, and
  no new absolute home path may be added. No Alphaus DEV/NEXT/production
  contact. No force-push.
