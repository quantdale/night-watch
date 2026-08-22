# ACCEPTANCE MATRIX — Phase 16A

## A — Portfolio integrity
- Only existing approved/read-only members can appear.
- Every member has deterministic identity + provenance/currentness.
- Unknown/stale/unavailable authority-critical evidence fails closed.

## B — Scoring integrity
- Identical normalized input => identical score/components/digest.
- Duplicate pressure never raises novelty.
- Blocking owner/safety state dominates every positive factor.
- SHA-only movement with unchanged normalized evidence does not create novelty.

## C — Allocation integrity
- Total allocated budget never exceeds configured total.
- Per-member ceiling/floor and retry ceiling enforced.
- Starvation prevention works without overriding safety/currentness blockers.
- Tie-breaking deterministic.

## D — Yield accounting
- No raw customer/auth/product values in durable yield records.
- Useful-yield counters derived from existing sanitized Nightwatch lifecycle evidence.
- Synthetic/historical estimates explicitly distinguished from real-world yield.

## E — Manifest / replan
- Manifest strict/versioned/deterministic.
- Changed contract/derivation/authority triggers correct replan/invalidation.
- Runtime execution requires a separate owner authorization and is impossible from this phase alone.

## F — Shadow simulation
- >=3 identical runs byte-equivalent.
- Baseline vs optimized allocation metrics reported without real-world uplift claim.
- At least 50 deterministic portfolio/scenario fixtures spanning stale, blocked, high-duplicate, starved, source-moved, partial-coverage, replayable, non-replayable, and equal-score ties.

## G — Compatibility
Focused Phase 12/13/14/15 compatibility green; campaign:synthetic green; owner-provenance green if touched; typecheck/hardening/continuity/project/diff green.

## Quality floors
`authorityEscapeCount=0`
`stalePositiveRankCount=0`
`budgetOverflowCount=0`
`duplicatePositiveNoveltyCount=0`
`determinismMismatchCount=0`
`privacyLeakCount=0`
`unauthorizedTargetCount=0`
`syntheticAsRealClaimCount=0`
