# EXECUTION PROMPT — Reviewer Surface & Finding-Intelligence Scale

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-reviewer-surface-and-intel-scale-v1
OpenSpec: openspec/changes/nightwatch-reviewer-surface-and-intel-scale-v1/
Planned-From: 868761d2128d5155db454623bc2fa01622a57d33
Target Branch: main
Predecessor Task ID: nightwatch-frontier-completion-reliability-v1
Predecessor Status: COMPLETE

## Mission

Repair DEF-FC-04 and harden task/continuity metadata against
cross-campaign drift; implement the deferred Control Center finding and
reviewer experience over the certified FC-1 intelligence; measure
finding-intelligence cost at real scale and optimize only where a
measurement justifies it; add large-corpus Control Center testing and
endurance; re-certify privacy, mutation, clean-gate, regression and
deterministic fresh-process evidence; and reconcile every durable
document to the measured truth.

## Authority

```
IMPLEMENTATION AUTHORIZED:
  Nightwatch repository source, tests, schemas, contracts, CLI,
  .agent continuity tooling and hardening rules,
  Control Center server, authorities, adapters and React UI,
  finding intelligence and finding review cones,
  repository-owned synthetic scale corpora and measurement harnesses,
  browser and endurance lanes, documentation, OpenSpec,
  lifecycle state, diagnostics, commits, pushes,
  clean-clone certification

REAL PRODUCTION CONTACT:
  NOT AUTHORIZED

NEXT / DEV EXECUTION:
  NOT AUTHORIZED

C-12 / C-13 / C-14 LIVE EXECUTION:
  NOT AUTHORIZED IN THIS CAMPAIGN

C-08b:
  NOT AUTHORIZED

C-07 DEV:
  NOT AUTHORIZED

SLACK / LESLIE / PONDR / NOTION / EXTERNAL FILING:
  NOT AUTHORIZED

CREDENTIALS, DEPLOYMENT, SIBLING WRITES,
FORCE PUSH, HISTORY REWRITE:
  NOT AUTHORIZED
```

Repository-local and offline. No production contact, no NEXT contact, no
DEV request, no credential acquisition.

C-00 governs: all implementation happens in the owned session worktree
`session/nightwatch-reviewer-surface-and--30ec5809`. The canonical
checkout is never used for implementation.

## Ordered workstreams

1. W0 — repository truth, predecessor verification, DEF-FC-04 repair,
   continuity metadata hardened against cross-campaign drift (M1).
2. W1 — reviewer projection over `findingIntel` / `findingReview`:
   relationships, probable duplicates, recurrence, defect classes,
   expectation provenance, confidence, Alphaus recommendations, local
   review state, and explicit FACT / RECOMMENDATION / UNKNOWN classes
   (M2).
3. W2 — Control Center reviewer UI over that projection (M3).
4. W3 — finding-intelligence scale measurement at 1k / 5k / 10k: CPU,
   peak RSS, wall latency; locate the actual quadratic thresholds (M4).
5. W4 — measurement-justified optimization only, with re-measured
   before/after deltas at the same corpus sizes (M5).
6. W5 — large-corpus Control Center testing and endurance (M6).
7. W6 — privacy red team, mutation probes, fresh `npm ci` clean gate,
   full regression, deterministic fresh-process certification (M7).
8. W7 — CURRENT_STATE / ROADMAP / ARCHITECTURE reconciled to the measured
   scale envelope and the completed reviewer UI (M8).
9. W8 — certification, REPORT, and STOP (M9).

## Constraints

Extend the existing architecture; do not rewrite what already works. The
Control Center stays read-only by construction and the reviewer surface
projects cone output rather than re-authoring it. Every classification is
evidence-backed. UNKNOWN is first-class and never grants authority, and
never renders as a weak affirmative. A duplicate suggestion is never a
final verdict. Local review is never organizational sign-off. No bounty
scoring. No optimization without a recorded measurement that justifies
it, and no claimed improvement without a re-measured delta. No retry
policy may be invented to close the campaign; a stall is captured and
classified. Synthetic scale corpora never enter the owner-only finding
store. No force push, no history rewrite.

## Validation

`npm run typecheck`, `npm run hardening:check`, `npm run agent:check`,
`npm run handoff:check`, `npm run project:check`,
`npm run control-center:ui:typecheck`, `npm run control-center:ui:test`,
`npm run control-center:ui:browser`, `npm run gate:local`,
`node bin/frontier-determinism.mjs 20`, the scale harness at
1k / 5k / 10k in fresh processes, the large-corpus endurance lane
repeated to a statistically useful bound, a reversible mutation campaign
(0 survivors required), full regression, and `npm run gate:clean` on a
fresh `npm ci`.

## Completion gates

All milestones terminal; DEF-FC-04 repaired with a regression that fails
on the unrepaired document; the reviewer surface complete and
privacy-clean; the scale envelope measured and recorded at all three
sizes with any optimization backed by before/after numbers; 0 mutation
survivors; full regression green on the committed tree; gates green or
blockers documented with evidence; every durable document reconciled;
safety accounting all zero; STOP before any live C-12 / DEV / NEXT /
production work.
