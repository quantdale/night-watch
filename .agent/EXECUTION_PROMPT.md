# EXECUTION PROMPT — review-4 corrective child campaign

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-final-completion-review4-v1
OpenSpec: openspec/changes/nightwatch-final-completion-review4-v1/
Planned-From: 67eb30981b4bb4d6bb6959b9afee9345938f5750
Target Branch: main
Predecessor Task ID: nightwatch-successor-campaign-engine-v1
Predecessor Status: COMPLETE

Child of: `nightwatch-final-product-completion-v1` (paused, canonical-routed).

## Mission

Resolve every finding of the independent review-4 (`audit.md`, verbatim from the
owner's corrective prompt §3) inside one bounded child campaign, then close the
child with the full authoritative validation set, exact-head CI green,
`gate:clean` from canonical, a per-ID disposition table for R4-01..R4-24,
archival with spec sync, and ACTIVE_TASK routed back to the parent at
"M9 task 10.2 remainder (60/76 declared; next bin `auth-configure`)".

## Scope

Frozen by the change's `tasks.md` (groups 1-7) and `design.md` (OD-5, OD-6 and
D150-1..D150-8). The review-4 scope is closed: a new finding enters scope only
when it is HIGH severity AND lies on the certification path; every other new
finding goes to the parent census with a disposition. There is no review-5 by
default.

## Ordered workstreams

1. Certification soundness (OD-5, OD-6) — R4-01..R4-07, D-150.
2. Guard robustness — R4-08, R4-09 (mutant families, behavioural fixtures).
3. CI truth — R4-10..R4-13.
4. Product correctness — R4-14..R4-18.
5. Ledger and records — R4-19, R4-20.
6. Hygiene and continuity — R4-22, R4-23.
7. Close-out — R4-21, R4-24 and the close-out choreography.

## Rules

- Never tick on an unintegrated commit without `(implemented; CI pending)`.
  Never close a group or the child without an observed green exact-head CI at
  the tip that contains the close-out.
- Never push without running `hardening:check`, `agent:check` and
  `project:check` locally first. Never commit on canonical without a live
  MAINTENANCE claim.
- Never change a truthful record to satisfy a guard: fix the guard, or record
  the conflict and STOP.
- Receipts are tamper-evident only. No wording may call them forgery-proof or
  unforgeable.
- The parent owns the single-use grants (the 12.3 paid run, the 15.4 npm
  query). The repository is temporarily public: nothing secret,
  customer-derived, authentication-bearing or identifying may be published,
  and no new absolute home path may be added. No Alphaus DEV/NEXT/production
  contact. No force-push.
