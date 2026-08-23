# Phase 18 Defect Ledger

Phase 18 implementation defect entries use `DEF-18-XX` and include
reproducer, root cause, repair, permanent regression, and lifecycle status.

| ID | Reproducer | Root cause | Repair | Permanent regression | Status |
| --- | --- | --- | --- | --- | --- |
| DEF-18-01 | A Phase 15 semantic campaign with a fresh semantic finding could be marked ready/HIGH from aggregate replay/cluster counts even when the journey executor could not prove a reduced semantic replay. Reproduced by the F2/F11/F12 integration scenarios. | Replay closure did not carry the semantic finding identity and occurrence context into confidence/dossier decisions; exact-match and minimality counts were derived from aggregate status rather than an actual reduced evaluation. | Replay now binds occurrence kind/ordinal, expectation, predecessor context, and observation fingerprint; semantic fidelity receipts are strict and currentness/safety/determinism-aware; minimality is `NONE` and confidence remains unresolved when no matching reduced semantic replay exists. | Phase 15 campaign F2/F11/F12 integration regressions plus Phase 18 semantic replay, minimizer, and confidence/degradation tests. | REPRODUCED → ROOT_CAUSED → SOURCE_FIXED → PERMANENT_REGRESSION → FOCUSED_GREEN → AFFECTED_GREEN; FULL_GREEN pending canonical/isolated regression. |
