# Active Task

Task ID: phase-2a-controlled-observation
Phase: 2A
Title: First Controlled Authenticated Ripple Dev/Next Observation
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-2a-controlled-observation
Starting SHA: 3a2712185250cd4e3591ee4037b28e06e8a0417e
Current SHA: 6c0d9737fa147eaaaee8796979f419a8ab007567
Last validated implementation SHA: 6c0d9737fa147eaaaee8796979f419a8ab007567
Current milestone: M7 — First controlled authenticated landing observation (IN_PROGRESS)
Last checkpoint: 2026-08-11 — root cause found: DEV /ripple/ renders auth-layout, not dashboard shell
`nightwatch-20260811T072928Z-d840-first` passed the pre-real-run gate 13/13,
then completed one guarded passive observation. The final origin/path was
`https://appdev.alphaus.cloud` / `/ripple/`; both main documents were
`200 text/html`, `#app` was seen and removed, and the immediate replacement
was a bounded `element` with `rootBranch=unknown-element`. Neither the
source-backed loading branch nor dynamic-layout/QLayout markers was observed.
The source reload signal was captured before the second same-path reload, so
this run earns `SOURCE_PROVEN_EXPECTED_BOOTSTRAP_RELOAD`; the earlier run's
`RELOAD_CAUSE_UNRESOLVED` correction remains valid for that earlier artifact.
Five allowlisted chunk requests were not completed by observation cleanup;
wrong-content failures, runtime exceptions, unhandled rejections, CSP
violations, and product console errors were zero. Auth replay effectiveness
remains `UNRESOLVED`. Readiness failed, so replay was correctly NOT RUN.
The external DEV storage-state path and contents remain outside Nightwatch.
Validation checkpoint: `npx tsc --noEmit` PASS; `npx playwright test` **218
passed, 0 failed**; authenticated privacy review **2/2**; `npm run agent:check`
PASS with the expected approved `CHECKPOINT_ADVANCE` warning; and
`git diff --check` PASS. Nightwatch changes are task-state documentation only.
Next action: keep M7 IN_PROGRESS and await an explicit later decision; do not
rerun, repair, replay, or begin Phase 2B.
