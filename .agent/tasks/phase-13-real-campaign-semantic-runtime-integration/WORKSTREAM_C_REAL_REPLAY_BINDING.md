# Workstream C — Real Replay Binding Without Runtime Execution

Parent task: `phase-13-real-campaign-semantic-runtime-integration`
Authority: local/source only. No DEV.

## C1. Goal

Make the real campaign candidate constructors capable of producing truthful replay callbacks backed by validated Phase 13 replay plans, without executing those callbacks against DEV in this phase.

## C2. Preserve the minimizer

`src/core/triage/minimizer.ts` remains the reduction authority. Phase 13 supplies better replay truth; it does not build a second reducer.

## C3. Binding architecture

Separate:

1. candidate -> frozen replay descriptor/plan base;
2. reduced sequence -> validated occurrence plan;
3. candidate-kind guard;
4. runtime executor boundary;
5. `CandidateReplayOutcome` classification.

Pure planning modules must not import browser/network/fs/auth/relay.

The real manual campaign adapter may bind runtime executors, but ordinary/local tests use doubles and never contact product hosts.

## C4. Exact replay

Every supported candidate must establish exact replay semantics independently from reduced replay.

Exact replay must:

- retain every original occurrence;
- preserve contract/catalog/source identity;
- reproduce only exact anomaly fingerprint;
- fail on safety/privacy/currentness mismatch;
- never be inferred from the first observation alone.

## C5. API binding

For the existing Phase 5 approved single-operation candidate:

- frozen operation ID only;
- no arbitrary method/path/host/params;
- exact replay invokes existing restricted operation executor boundary;
- non-empty reduced candidate is the same one operation and therefore minimization may truthfully be UNCHANGED;
- empty or multi-operation plan invalid.

No Phase 13A API call occurs.

## C6. Exploration binding

For exploration candidates:

- replay only retained original Phase 4 action occurrences;
- resolve each occurrence to existing APPROVED safe action;
- KNOWN_READ or LOCAL_ONLY only;
- no SERVER_STATE effect;
- approved route effect only;
- do not call the exploration planner to fill removed actions;
- enforce original envelope/route/precondition closure.

## C7. Journey binding

Inspect journey engine/contracts mechanically.

If safe subset execution is possible without inventing steps or route semantics:

- implement a frozen-subset executor over original allowed step occurrences;
- validate dependency/precondition closure before browser executor exposure;
- removed prerequisite -> INVALID, no browser contact;
- route remains within frozen journey contract.

If not mechanically safe:

- keep exact replay support;
- make reduced replay explicitly unsupported/fail-closed;
- document why;
- do not claim real journey minimization support.

A broad productivity task is not permission to fabricate a generic journey interpreter.

## C8. Semantic reproduction

For semantic candidates, replay success requires the same safe semantic identity:

- target/expectation;
- invariant definition;
- evidence/derivation identity consistent with the frozen campaign bundle;
- receipt/finding anomaly fingerprint exact match.

`PARTIAL_COVERAGE`, PASS, N/A, stale/unavailable, INTERNAL_ERROR, or different anomaly fingerprint do not reproduce the target anomaly.

## C9. Runtime containment inheritance

Future real execution must remain behind existing:

- explicit manual launcher;
- canonical DEV environment gate;
- external auth state gate;
- L0–L5 containment;
- KNOWN_READ/mutation tripwire;
- metadata-first privacy policy;
- trace/screenshot restrictions.

Phase 13A only proves source wiring and synthetic executor behavior.

## C10. Remove misleading generic stub use

After Phase 13 integration, `invalidReducedReplay()` must not remain attached to a candidate class whose safe replay binding is claimed complete.

If one class remains unsupported, use an explicit class-specific fail-closed reason rather than a generic stub that obscures capability status.

## C11. Tests

Minimum:

1. pre-fix generic stub attachment reproduction;
2. API exact plan/binding;
3. API multi-original rejection;
4. exploration exact binding;
5. exploration reducible binding;
6. exploration removed prerequisite rejection;
7. journey exact binding;
8. journey reducible positive if supported;
9. journey unsupported explicit if not supported;
10. duplicate occurrence correct selection;
11. changed fingerprint non-reproduction;
12. partial semantic non-reproduction;
13. stale bundle rejection;
14. safety nonzero rejection;
15. privacy nonzero rejection;
16. executor exception fail-closed;
17. no planner invocation during reduction;
18. no new action authority;
19. deterministic repeat;
20. no browser/network invocation in ordinary unit matrix.

## C12. Acceptance

Every supported real candidate class has a source-bound truthful replay capability model. Unsupported classes are explicit. No DEV is contacted and no runtime authority expands.
