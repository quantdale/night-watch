# Design — DEV Capture Soak, Replay, and Yield

Use existing guarded serial launchers and strict current-source identity. The
campaign is observation-heavy rather than feature-heavy: ten Phase 2C
invocations, five Phase 4 runs, five Phase 5 cycles, and five fresh Phase 7
campaigns are the target sample unless a stop-worthy Nightwatch defect
intervenes.

Capture reliability is measured only for intentional source-reviewed known
reads; passive/background diagnostics remain observable but do not poison
journey capture health. Every result is categorical and retained. A retry is a
new sample.

Attack replay authority comes only from fresh current-manifest DVR-011-admitted
product candidates. Historical fingerprints can support comparison but cannot
authorize execution. If the full soak yields no candidate, replay closes as
starved rather than healthy.

Any Critical/High Nightwatch defect suspends real execution until local
reproduction, root-cause repair, regression, and gate validation are complete.
After executable changes, stale manifests are quarantined and a fresh
current-source campaign is prepared.
