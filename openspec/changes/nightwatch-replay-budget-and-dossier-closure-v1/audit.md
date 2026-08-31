# Audit — Replay Budget and Dossier Closure

The completed soak established that capture is no longer the dominant blocker:
54/56 observations captured completely, BODY_UNAVAILABLE was 0, account reached
4/5 Phase 7 campaigns, and strict DVR-011 admission emitted 8 fresh product
candidates across 2 stable fingerprints.

The next failure occurs after admission. Each full campaign consumes all three
journey-context slots on the required payer/common/account collection journeys.
When a current candidate queues reproduction, reserve admission fails with
BUDGET_EXHAUSTED before replay executor entry. Four independent fresh campaigns
showed the same boundary.

Therefore the next evidence-backed investment is not another soak and not a
candidate-admission change. It is a bounded replay-reservation architecture
repair plus a small fresh DEV confirmation.
