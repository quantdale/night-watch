## Context

The preceding reliability/yield/state campaign is terminal and preserved the
project verdict as `OPERATIONALLY_ACCEPTED`. Its fresh DEV attempt stopped
before browser-context creation because the owner-managed session was no
longer usable. The owner has now completed the guarded human-led DEV capture,
which produced a validated external storage state outside the repository.

This successor is an evidence campaign, not a product change. It consumes the
existing serial, read-only Phase 2C, Phase 4, Phase 5, and campaign launchers
and records sanitized results in owner-local runtime storage.

## Goals / Non-Goals

**Goals:**

- Measure a bounded repeated Phase 2C result with every attempt retained as an
  independent observation.
- Run the existing Phase 4, Phase 5, campaign prepare/resume, and safe replay
  paths once each when their guards pass.
- Distinguish clean replay, product variation, auth, environment, timing, and
  Nightwatch framework outcomes without retry-based relabeling.
- Verify cleanup and persisted campaign state after each real operation.
- Preserve project-state truth and the existing accepted verdict unless
  evidence requires an explicit fail-closed transition.

**Non-Goals:**

- No production, NEXT, mutation, infrastructure, database, datastore, or
  sibling-repository access.
- No credential inspection, secret capture, raw authenticated evidence, or
  external publication.
- No new proof family, oracle relaxation, product fix, or autonomous verdict
  promotion.
- No reopening or editing of the completed predecessor task.

## Decisions

1. **Use a new continuity-v2 task.** The predecessor remains a historical
   terminal record. The successor begins at the live Git head and binds a new
   OpenSpec change and execution prompt.

2. **Preserve acceptance while observing.** The active task declares the
   explicit `PRESERVE` verdict effect while the run is bounded and read-only.
   A result that genuinely invalidates acceptance must stop the campaign and
   be represented through the existing explicit `REEVALUATE` protocol; it may
   not be hidden in a retry or documentation note.

3. **Serial, fixed sample.** Run three independent Phase 2C invocations,
   followed by one Phase 4 invocation, one Phase 5 invocation, and one
   campaign prepare/resume. Serial execution limits load and makes timing,
   state, and cleanup attribution unambiguous.

4. **Existing authority only.** The approved launchers remain responsible for
   host, proxy, auth, mutation, and evidence gates. This task does not create a
   second browser or network path.

5. **Sanitized evidence only.** Record counts, timestamps, journey/step IDs,
   safe classifications, fingerprints, and bounded diagnostics. Never copy
   storage-state bytes, credentials, raw DOM, raw responses, or customer
   values into task files or Git.

## Risks / Trade-offs

- [DEV data or timing drift] → retain categorical outcomes and run IDs rather
  than treating a later clean retry as proof of determinism.
- [Authentication expires mid-run] → stop safely and classify the affected
  operation as auth divergence; do not refresh automatically.
- [Campaign interruption or stale state] → inspect the existing checkpoint
  and cleanup receipts after each operation before proceeding.
- [A real Nightwatch defect appears] → stop unrelated work, reproduce locally
  where possible, add regression coverage, and use a separate implementation
  checkpoint before resuming evidence collection.
- [No new product observation is available] → report the measured sample as
  unavailable rather than converting an auth/environment result into PASS.
