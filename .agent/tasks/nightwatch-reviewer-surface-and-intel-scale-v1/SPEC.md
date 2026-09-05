# Spec — nightwatch-reviewer-surface-and-intel-scale-v1

Frozen intent. Living detail belongs in `PLAN.md`; operational waypoints in
`STATE.md`.

## Intent

Close the FC-1 deferred frontier in three parts, in order.

1. Repair DEF-FC-04 — cross-campaign task/continuity metadata drift — and
   make the class mechanically detectable rather than trusted to review.
2. Implement the deferred Control Center finding and reviewer experience
   over the already-certified FC-1 intelligence, with every element
   explicitly classified as mechanical FACT, advisory RECOMMENDATION, or
   UNKNOWN.
3. Measure finding-intelligence cost at 1k / 5k / 10k findings and
   optimize only where a recorded measurement justifies it; then prove
   the whole surface under large-corpus and endurance load and
   re-certify.

## Non-goals

- No live C-12 / C-13 / C-14 execution, no DEV, no NEXT, no production
  contact. The campaign stops before them.
- No C-08b, no C-07 DEV.
- No external filing (Slack / Leslie / Pondr / Notion).
- No bounty scoring surface.
- No optimization that a measurement does not justify.
- No retry policy invented to close the campaign.
- No rewrite of `findingIntel`, `findingReview`, or the Control Center
  authorities; they are extended and projected, not re-authored.

## Invariants

- The Control Center remains read-only by construction.
- UNKNOWN is first-class, never grants authority, and never renders as a
  weak affirmative.
- A duplicate suggestion is advisory and never a final verdict.
- Local review is never Alphaus organizational sign-off
  (`organizationalAuthority: NONE_LOCAL_REVIEW_ONLY`).
- No raw customer value crosses the reviewer projection boundary, into
  payloads or error messages.
- Synthetic scale corpora never enter the owner-only finding store.

## Declared Deletions

None.
