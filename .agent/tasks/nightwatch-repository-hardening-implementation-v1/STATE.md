# Task State

STATE — nightwatch-repository-hardening-implementation-v1

## Identity

Task ID: nightwatch-repository-hardening-implementation-v1
Phase: REPOSITORY_HARDENING_IMPLEMENTATION_V1
Status: IN_PROGRESS
Campaign: nightwatch-repository-hardening-implementation-v1
Starting SHA: 0ac7b3d037b5059f670eca715fc30adaf58e7334
Last validated implementation SHA: 43368276a59f8439e51af7d3ccf7b0cc0215d4b5
Last substantive checkpoint SHA: 43368276a59f8439e51af7d3ccf7b0cc0215d4b5
Live HEAD authority: GIT
Branch: session/nightwatch-repository-hardening--e7b9be89
Last checkpoint: M10 / NW-08 complete and validated — the validation universe is mechanically complete at 425 discovered / 0 unclassified, digest-pinned and enforced in a required gate rule
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 0ac7b3d037b5059f670eca715fc30adaf58e7334
LAST_VALIDATED_IMPLEMENTATION_SHA: 43368276a59f8439e51af7d3ccf7b0cc0215d4b5
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 43368276a59f8439e51af7d3ccf7b0cc0215d4b5
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
LIVE_COMPLETION_CLAIM: NONE
PHASE_REPOSITORY_HARDENING_IMPLEMENTATION_V1_STATUS: IN_PROGRESS

## Objective

Execute the fourteen open findings of
`docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md` (NW-01 through NW-14) in the
plan's dependency order, then certify the repository-level definition of done
at one integrated candidate checkpoint. NW-15 is closed by the W10 owner and
is consumed, not re-executed.

## Current Milestone

Milestone ID: M11
Milestone status: IN_PROGRESS
What is being attempted: NW-14 — reconcile dependency, portability and release
documentation truth: the Vue 2.6.12 fixture advisory, the Node/OS/Bubblewrap/
Chrome capability matrix, and separating current operational guidance from the
indexed archives.

## Completed Milestones

- **M0 COMPLETE** — live execution truth established. `origin/main` and the
  canonical checkout are both `0ac7b3d037b5059f670eca715fc30adaf58e7334`
  (the canonical checkout was 16 commits behind at session open and was
  fast-forwarded, never reset). Workspace verdict PASS with four registered
  worktrees: canonical `CANONICAL_MAINTENANCE`, the bug-hunting programme's
  live `OWNED_SESSION`, the integrated W10 `STALE_SESSION` awaiting an owner
  release, and this task's `OWNED_SESSION`
  `nightwatch-repository-hardening--e7b9be89` claimed as session
  `sess-62fcc8aaf9fb` on base `0ac7b3d`. W10/NW-15 verified COMPLETE at
  implementation `62d23e2622ab0a282584c5cf27d92b6b603f9192` and documentation
  `ec3eacf61c1b5bd3557eaf90594aecb2cd633b4f`. SPEC, PLAN, STATE and REPORT
  written; `ACTIVE_TASK.md` routed to this campaign.
- **M1 COMPLETE (NW-06)** — `admitProspectiveWorktree` models the candidate
  registration against the same `maxWorktrees` policy the
  `WORKSPACE_WORKTREE_METADATA` invariant uses, and `commandStart` calls it
  before any mutation, refusing with
  `SESSION_START_REFUSED_PROSPECTIVE_TOPOLOGY`. `--allow-drift` does not
  bypass it. Creation is now transactional: a proof-gated rollback removes
  only the just-created worktree and branch after path, branch, HEAD and
  branch tip are each proven unchanged and the tree is clean, otherwise
  reporting `SESSION_START_ROLLBACK_INCOMPLETE`. The handed-over registration
  is verified against the same model afterwards, which is what holds the
  bound in the inherently non-atomic multi-process case. Nine cases added to
  `tests/unit/workspaceIsolation.test.ts`; 8 of 9 fail against the pre-repair
  code (the ninth is the below-bound admit control) and the concurrent case
  reproduced the defect with 4 registrations against a bound of 3. All 48
  cases in that file pass after the repair.
- **M2 COMPLETE (NW-01)** — `src/core/agentProtocol/closedVocabulary.ts` is
  the single closure primitive: `closedVocabulary` returns a `Set`-backed
  type guard that refuses non-strings without coercion, and `closedLookup`
  returns a `Map`-backed catalog whose `has` and `get` answer from one table.
  `validate.ts`, `tools.ts` and `src/core/autonomousFinding/dossier.ts` all
  use it, and `parseIntent` now dispatches `TERMINATE` explicitly and ends in
  `reject('UNKNOWN_INTENT')` instead of falling through. Seven cases in
  `tests/unit/nw01ClosedVocabularies.test.ts` cover eight inherited names
  across six vocabularies plus a coercion case and two compatibility
  controls; 5 fail against the pre-repair code. 69 passed across the NW-01,
  `agentProtocol`, `agentTools` and `dossierIdentityPropagation` suites.
  `agentProtocol.test.ts`, `agentTools.test.ts` and the new suite were added
  to `config/synthetic-campaign.v1.json` — the frozen protocol's own suite
  was in no manifest, so the authoritative gate had never run it.
- **M3 COMPLETE (NW-02)** — `src/core/policy/sourceTopology.ts` is the single
  topology authority. Its excluded set is built from absolute,
  checkout-independent facts: the sibling `REPOSITORIES` root (explicit root,
  then `NIGHTWATCH_REPOS_ROOT`, then `DEFAULT_SIBLING_ROOT`), the C-00
  session-worktree parent, and this checkout's own root as additional
  self-protection that can only refuse more. Ambiguity throws rather than
  falling back. `privateArtifacts.ts` and `productionFindingsStore.ts` inject
  it, and their duplicated local `isInside` helpers were deleted so
  containment exists in one place. Seven cases in
  `tests/unit/nw02PrivatePathTopology.test.ts` require the decision vector
  for six forbidden targets to be identical across three injected topologies.
  `checkC00WorkspaceIntegrity` now requires the exact
  `assertOutsideSourceTopology(root, '<error code>'` call form in both
  surfaces, no `__dirname`, and fail-closed ambiguity in the authority.
- **M4 COMPLETE (NW-03)** — `safeSnapshotFileName` requires a strict
  basename with no dot-segment matching the pinned shape;
  `path.basename` alone would have been wrong, since it rewrites `../x.json`
  to `x.json` and converts an escape into a successful write elsewhere.
  `snapshotStateRoot` holds the state root to the NW-02 authority,
  `snapshotFilePath` joins then proves the result is a direct child, the
  directory is created from the proven root rather than the file's dirname,
  and `publishSnapshot` stages into an owner-only same-directory temporary
  opened `wx`, fsyncs, revalidates the boundary and renames, cleaning owned
  temporaries in `finally`. Eight cases; atomicity is measured by inode,
  which distinguishes rename from in-place truncation. 5 of 8 fail
  pre-repair. 74 passed across the Atlas and local-investigation suites.
- **M5 COMPLETE (NW-13)** — `src/core/policy/sensitiveDiagnostics.ts` renders
  diagnostics from allowlisted parts only (closed failure vocabulary, errno
  code, byte count, coarse path class plus twelve-hex digest) and has no
  free-text parameter, so content cannot pass through it by mistake. The
  three storage-state key-inspection helpers share one content-free reader;
  `environment/index.ts`, `privateArtifacts.ts` and `sandboxMirror.ts` now
  report errno codes rather than native messages. Five cases; 2 fail
  pre-repair. Measurement refined the finding: the leak is a ~20-character
  window centred on the offending token, not a prefix, and two of the three
  inspection helpers had no catch at all so the raw `SyntaxError` propagated.
- **M6 COMPLETE (NW-04)** — `src/core/agentRuntime/checkpointStore.ts` is the
  single publication and read path: additive `checkpointGeneration` stamping
  (a pre-NW-04 checkpoint reads as generation 0), compare-generation same-ID
  refusal with the residual rename race stated rather than hidden, size
  bounded from the `lstat` before any allocation, corrupt and truncated state
  preserved and reported through the M5 content-free taxonomy, publication
  through an owner-only same-directory temporary renamed into place, and a
  fresh run that moves the previous checkpoint to `<file>.superseded` instead
  of deleting it before durable progress exists. Thirteen cases including the
  three-step crash matrix and an interleaved same-id writer; the
  consumer-level case fails against the pre-repair loader, which read an 8 MB
  file whole and then leaked a content window in its `SyntaxError`.
- **M9 / NW-09 COMPLETE** — `--enable-local-review` is the only route to the
  write surface. It runs an owner-local preflight and builds both halves
  through `createControlCenterServices`, so the collector and the write
  handler cannot derive different campaign identities.
  `ControlCenterMetaDto.localReviewDecision` is filled by the SERVER from
  `options.reviewDecision === undefined` — the same expression that creates
  the route — so the reported capability and the served surface cannot
  disagree, asserted in both directions. The UI now gates its controls on
  that capability instead of the per-finding review identity, which answered
  a different question, and fails closed when the field is absent. Uncertain
  POST outcomes read back by review identity and never retry; UNKNOWN stays
  UNKNOWN. The launcher's blanket catch now echoes an allowlisted
  `CONTROL_CENTER_*` code only. 6 launcher cases (5 fail pre-repair, the
  sixth is the flag-refusal control) and 4 new UI cases (5 UI cases fail
  pre-repair including one updated existing case). UI 24 passed, UI
  typecheck/build PASS, server suites 68 passed.
- **M9 / NW-10 COMPLETE** — the review's diagnosis was incomplete and acting
  on it as written would have made the surface worse: NOTHING consumed the
  cursor. `boundedCollection` always sliced from index 0 and the default
  collector dropped `query.cursor`, so paging was cosmetic end to end and
  client cursor state alone would have re-appended page one forever. The
  repair starts at the bottom — `boundedCollection` slices from the cursor and
  reports what remains after the page; all five list adapters forward it; the
  collector passes it through. Two further defects surfaced: the reviewer
  adapter's cursor fallback was built from the page length so it re-emitted
  the same cursor on page two, and the reviewer AUTHORITY selects the page, so
  it needed the cursor too and now returns the `pageOffset` it used while the
  projection refuses to slice a pre-selected page twice. Client side, one
  `usePagedCollection` hook owns accumulation, identity deduplication,
  generation reset and explicit end/error states for all five bounded views.
  7 server cases (6 fail pre-repair) and 4 UI cases (all 4 fail pre-repair);
  101 passed across paging-adjacent server suites, UI 28 passed.
- **M9 COMPLETE (NW-09, NW-10, NW-11)** — NW-11 closed the client trust
  boundary: `CONTROL_CENTER_SNAPSHOT_CONTRACTS` pins the exact schema version
  and owned required fields for all sixteen endpoints, checked with
  `hasOwnProperty` so an inherited field is not mistaken for one the server
  sent, while unknown ADDED fields stay accepted for forward compatibility.
  Each request composes the caller's signal with its own controller and a
  finite 15-second deadline, disposes its timer on every path, reports
  TIMEOUT and ABORTED as distinct from NETWORK, and makes no request at all
  for an already-aborted caller; every App effect now aborts on cleanup.
  SSE invalidations coalesce leading-edge plus one trailing follow-up over a
  250 ms window, so bursts of 1 / 100 / 1000 events cost 1 / 2 / 2
  invalidations and unsubscribe disposes the pending timer. 13 cases, 10 fail
  pre-repair. UI 41 passed, UI typecheck and build PASS.
- **M10 COMPLETE (NW-08)** — the live denominator was measured, not
  inherited: 341 tracked root test files, 227 in required lanes, **114 in no
  lane at all**, including `safety`, `redaction`, `proxy`, `devLoginSecurity`,
  `realRunGate`, `reviewStoreHardening` and five control-center suites. The
  deeper defect was that the gap was unobservable — the required lanes select
  from manifests and the inventory validated those declarations against each
  other, never against what existed on disk. 24 offline safety-relevant
  suites were promoted into the required lane (258 tests, 26 s), taking the
  authoritative gate from 227 to 252 unique files with zero duplicates.
  `bin/lib/validation-universe.mjs` then makes coverage mechanically
  complete: 425 discovered, 252 gate, 173 classified, **0 unclassified**
  across six classes each with a reason and its evidence lane, pinned by an
  `inventoryDigest`. Nine violations fail closed in a REQUIRED hardening
  rule, probed four ways against the live repository. 12 permanent cases.

## Work In Progress

M11 / NW-14 in this session worktree. No other lane is dispatched.
session once the NW-09 capability and pagination DTOs are frozen, because one
owner must hold the overlapping UI API and App surfaces.

## Findings register progress

| ID | Milestone | Status |
| --- | --- | --- |
| NW-06 | M1 | CLOSED — repaired, 9 regressions, 8 proven failing pre-repair |
| NW-01 | M2 | CLOSED — repaired, 7 regressions, 5 proven failing pre-repair |
| NW-02 | M3 | CLOSED — repaired, 7 regressions, consumer-level case proven failing pre-repair |
| NW-03 | M4 | CLOSED — repaired, 8 regressions, 5 proven failing pre-repair |
| NW-13 | M5 | CLOSED — repaired, 5 regressions, 2 proven failing pre-repair |
| NW-04 | M6 | CLOSED — repaired, 13 regressions, consumer-level case proven failing pre-repair |
| NW-05 | M7 | CLOSED — repaired, 11 regressions, 4 proven failing pre-repair |
| NW-12 | M8 | CLOSED — repaired, 11 regressions, quantified 38,216 bytes to 228 |
| NW-09 | M9 | CLOSED — repaired, 6 launcher + 4 UI regressions, 5 of each proven failing pre-repair |
| NW-10 | M9 | CLOSED — repaired at every layer, 7 server + 4 UI regressions, 6 and 4 proven failing pre-repair |
| NW-11 | M9 | CLOSED — repaired, 13 regressions, 10 proven failing pre-repair |
| NW-08 | M10 | CLOSED — 425 discovered / 252 gate / 173 classified / 0 unclassified, digest-pinned; 12 regressions plus four live probes |
| NW-14 | M11 | IN PROGRESS |
| NW-07 | M12 | NOT STARTED |
| NW-15 | — | CLOSED BY W10 OWNER — consumed, out of scope |

## Exact Next Action

1. Assess the Vue 2.6.12 development-fixture advisory: record scope,
   reachability, owner rationale and a review date, or replace/isolate the
   fixture with equivalent parser and readiness coverage. Do not claim a
   fixed advisory from a version number alone.
2. Document the supported-host capability matrix — Node, OS, Bubblewrap,
   system Chrome, IPv6 — so an unqualified host reports unsupported
   capability rather than inheriting a Linux pass.
3. Separate current operational guidance from the indexed archives in the
   five oversized central documents, without rewriting historical receipts.
4. Re-verify lockfile reproducibility with a clean offline install, and keep
   local / clean / host / CI claims separate.

## Superseded next action (M10 / NW-08, complete)

1. Discover the live validation universe: enumerate every tracked
   `.test.ts` / `.smoke.ts`, every UI test, every `bin/*.mjs`, and compare
   that discovered set against the union the required gate manifests actually
   select. The current measured denominator is 218 of 336 root test files
   registered; re-measure rather than trusting that number.
2. Classify every discovered item into exactly one required or explicitly
   excluded class, each exclusion carrying a reason and its own evidence lane,
   and measure indirect execution before declaring any test unrun.
3. Bind the gate receipt to an inventory digest with executed / skipped /
   unavailable counts, keeping local, clean-checkout, host-qualified and CI
   claims separate.
4. Prove an unclassified new test FAILS the gate rather than passing
   silently, using fixture repositories.

## Superseded next action (M9 / NW-11, complete)

1. Probe the live NW-11 evidence: confirm that `fetchSnapshot` checks only a
   schema-version PREFIX and then casts to `T`, that fetches carry no signal
   or deadline, and that each SSE event increments a shared refresh key with
   no burst coalescing.
2. Add exact per-endpoint runtime validators over the owned required fields
   and the exact schema version, so a forward-compatible added field is still
   accepted while a wrong shape never reaches render logic.
3. Compose navigation abort with a finite deadline so an obsolete or hung
   request is actually aborted rather than merely ignored, and dispose timers
   and listeners.
4. Coalesce SSE invalidations by generation/view over a bounded window with
   at most one in-flight refresh plus one dirty follow-up, consistent with the
   M8 server-side policy, and assert a documented bounded request count for
   1, 100 and 1000-event bursts.

## Superseded next action (M9 / NW-10, complete)

1. Probe the live NW-10 evidence: confirm that the server endpoints already
   expose `page.nextCursor` while `ui/control-center/src/api.ts` loaders
   request only limits, so records beyond the first 20 runs / 50
   findings-reviewer-source-coverage entries / first 100 timeline entries are
   unreachable.
2. Add per-view cursor state with opaque cursors, deduplication by stable
   identity, generation binding, reset on filter or snapshot-generation
   change, and explicit end / error / retry states. Keep the server caps and
   the current first-page behaviour.
3. Prove the UI reaches a record beyond EVERY first-page boundary with
   multi-page fixtures, and that a generation change resets rather than mixes
   pages.
4. Then NW-11: exact per-endpoint validators, composed navigation abort with
   a finite deadline, and bounded SSE-invalidation coalescing consistent with
   the M8 server policy.

## Superseded next action (M9 / NW-09, complete)

1. Probe the live NW-09 evidence: confirm that
   `bin/nightwatch-control-center.mjs` builds a default collector without
   `reviewAuthority` and a server without `reviewDecision`.
2. Freeze the capability DTO before touching the UI.
3. Add the launcher opt-in with an owner-local preflight.
4. Read back by review identity on an uncertain POST outcome.

## Superseded next action (M8, complete)

1. Probe the live NW-12 evidence in `src/controlCenter/server/sse.ts`:
   confirm that `response.write`'s false return is ignored, so a stalled
   consumer's queued bytes grow without bound while the client count stays
   capped.
2. Choose and document ONE per-client policy — retain only the newest
   invalidation while backpressured, or close the client after a bounded
   queue or time threshold — and coordinate it with the NW-11 burst policy
   before the UI lane starts.
3. Track drain, close and error with deterministic listener and timer
   removal, so cleanup leaves no registry entry.
4. Drive it with fake writable streams that never drain, asserting bounded
   bytes, events and listeners, that healthy peers keep receiving, and that
   termination is deterministic; verify the cases fail against the pre-repair
   server.

## Superseded next action (M7, complete)

1. Probe the live NW-05 evidence in `src/api/phase5/relay.ts`: `defaultFetch`
   passes no `AbortSignal`, `withTimeout` rejects via `Promise.race` without
   aborting upstream work, and it is applied per attempt so a redirect
   receives another full `timeoutMs` — confirm the doubled bound and the
   surviving body read with a fake transport.
2. Freeze the timeout-versus-network-failure taxonomy before editing, so a
   deadline cannot be misreported as a transport error.
3. Create one monotonic deadline and `AbortController` at the operation
   boundary and thread the remaining budget and signal through auth-header
   acquisition, connection, redirect and body consumption; abort and cancel
   bodies on timeout or caller cancellation and await bounded cleanup.
4. Assert operation counts, signals, body cancellation and timer disposal
   rather than wall-clock thresholds, and prove no owned work remains after
   the cleanup grace.

## Superseded next action (M6, complete)

1. Probe the live NW-04 evidence in `src/core/agentRuntime/localCampaign.ts`:
   confirm the direct truncate-then-chmod publication, the unbounded read
   before decoding, and the path that can delete an existing same-ID
   checkpoint before new durable progress exists.
2. Freeze the generation and same-ID writer semantics before changing any
   consumer, and keep every pre-W9, W9 and W10 checkpoint readable.
3. Cap file size before allocation; stage canonical bytes to an owner-only
   same-directory temporary, sync where supported, replace atomically under
   verified identity, then publish generation metadata. Preserve corrupt
   evidence and fail categorically with content-free diagnostics from the
   M5 taxonomy.
4. Add the crash matrix — before write, mid-write, before and after rename —
   plus simultaneous same-ID writers, stale generation, oversized, truncated
   and malformed state, and W9/W10 checkpoint resume; verify the cases fail
   against the pre-repair store.

## Superseded next action (M5, complete)

1. Probe the live NW-13 evidence: plant fabricated secret text at the
   beginning, middle and end of malformed JSON and confirm that
   `src/browser/fixtures/storageState.ts` still surfaces a native parser
   message carrying a prefix of it.
2. Freeze the sensitive-diagnostic taxonomy first — missing, oversized,
   unsafe path, malformed JSON, schema-invalid must stay distinguishable —
   then convert those boundaries to categorical content-free codes and drop
   native causes that could cross a log.
3. Sweep the analogous credential and private-store parsers and the CLI error
   rendering for the same `err.message` wrapping.
4. Add the planted-secret search over every captured output — returned error,
   stderr, logs, receipts and generated artifacts — and verify it fails
   against the pre-repair code.

## Superseded next action (M4, complete)

1. Probe the live NW-03 evidence: confirm that `src/core/bugAtlas/snapshot.ts`
   still accepts a configured `fileName` containing a traversal segment and
   still follows an existing leaf symlink, using fabricated paths and
   sentinels in a disposable directory.
2. Accept only a strict basename, join then prove containment through the
   NW-02 authority, and publish through an owner-only same-directory
   temporary with explicit replace semantics, revalidating parent and leaf
   identity at the publication boundary and cleaning owned temporaries in
   `finally`.
3. Keep the snapshot schema and default location unchanged; state the
   overwrite semantics explicitly rather than inheriting them.
4. Add the traversal, absolute-path, separator, dot-segment, ancestor-symlink
   and leaf-symlink cases with byte-identical sentinel assertions outside the
   state root, and verify they fail against the pre-repair code.

## Superseded next action (M3, complete)

1. Probe the live NW-02 evidence: confirm that
   `src/core/policy/privateArtifacts.ts` and
   `src/core/prodEvidence/productionFindingsStore.ts` still derive their
   repository and workspace roots from `__dirname`, and reproduce the
   topology-dependent decision — the same configured path accepted from a
   linked worktree and rejected from the canonical checkout.
2. Freeze the shared path authority before touching any consumer, since
   NW-03, NW-04 and NW-09 all build on it: canonical Nightwatch root,
   sibling `REPOSITORIES` root, registered linked worktrees and permitted
   owner-state roots, resolved from `DEFAULT_SIBLING_ROOT` or an explicit
   `NIGHTWATCH_REPOS_ROOT`, failing closed on ambiguity, with no-follow
   containment checks before creation.
3. Convert the consumers to inject that authority instead of deriving it, and
   keep existing safe owner artifacts readable.
4. Add the topology matrix — canonical clone, linked worktree, relocated
   fresh clone, explicit root, missing and ambiguous root, symlinked
   ancestor, and canonical/sibling/worktree targets — and assert identical
   decisions across topology, verifying it fails against the pre-repair
   code.

## Files Changed

| Path | Purpose | Status |
| --- | --- | --- |
| `.agent/tasks/nightwatch-repository-hardening-implementation-v1/SPEC.md` | frozen intent | CREATED |
| `.agent/tasks/nightwatch-repository-hardening-implementation-v1/PLAN.md` | living execution plan | CREATED |
| `.agent/tasks/nightwatch-repository-hardening-implementation-v1/STATE.md` | continuity waypoint | IN_PROGRESS |
| `.agent/tasks/nightwatch-repository-hardening-implementation-v1/REPORT.md` | evidence ledger | INITIAL |
| `.agent/ACTIVE_TASK.md` | campaign routing | UPDATED |
| `.agent/EXECUTION_PROMPT.md` | campaign handoff prompt | REPLACED |
| `openspec/changes/nightwatch-repository-hardening-implementation-v1/**` | frozen OpenSpec change | CREATED |
| `bin/workspace-integrity.mjs` | `admitProspectiveWorktree` prospective admission | MODIFIED |
| `bin/nightwatch-session.mjs` | pre-mutation admission, proof-gated rollback, post-creation verification, narrow fault seam | MODIFIED |
| `tests/unit/workspaceIsolation.test.ts` | nine NW-06 cases; fixture policy override; session env injection | MODIFIED |
| `AGENTS.md` | C-00 admission and rollback behaviour | MODIFIED |
| `src/core/agentProtocol/closedVocabulary.ts` | the one vocabulary/lookup closure primitive | CREATED |
| `src/core/agentProtocol/validate.ts` | own-key membership, no coercion, exhaustive intent dispatch | MODIFIED |
| `src/core/agentProtocol/tools.ts` | `Map`-backed tool catalog | MODIFIED |
| `src/core/agentProtocol/index.ts` | export the closure primitive | MODIFIED |
| `src/core/autonomousFinding/dossier.ts` | own-key severity/confidence/environment | MODIFIED |
| `tests/unit/nw01ClosedVocabularies.test.ts` | seven NW-01 cases over eight inherited names | CREATED |
| `config/synthetic-campaign.v1.json` | register the protocol, private-store and review-store suites the required gate lane never ran | MODIFIED |
| `src/core/policy/sourceTopology.ts` | the one topology-aware private-path authority | CREATED |
| `src/core/policy/privateArtifacts.ts` | inject the authority; drop the local containment helper | MODIFIED |
| `src/core/prodEvidence/productionFindingsStore.ts` | inject the authority; drop the local containment helper | MODIFIED |
| `src/core/policy/index.ts` | export the topology authority | MODIFIED |
| `tests/unit/nw02PrivatePathTopology.test.ts` | seven NW-02 cases over three injected topologies | CREATED |
| `bin/hardening-check.mjs` | call-form lock on both private-path surfaces | MODIFIED |
| `src/core/bugAtlas/snapshot.ts` | strict basename, proven containment, temporary-plus-rename publication | MODIFIED |
| `tests/unit/nw03AtlasSnapshotConfinement.test.ts` | eight NW-03 cases with sentinel and inode assertions | CREATED |
| `src/controlCenter/contracts/meta.ts` | `localReviewDecision` capability contract | MODIFIED |
| `src/controlCenter/adapters/metaAdapter.ts` | advisory capability, server-authoritative | MODIFIED |
| `src/controlCenter/server/server.ts` | capability filled from the route-creating option | MODIFIED |
| `bin/nightwatch-control-center.mjs` | `--enable-local-review` opt-in, preflight, bounded start reason | MODIFIED |
| `ui/control-center/src/types.ts` | capability field, absent means DISABLED | MODIFIED |
| `ui/control-center/src/api.ts` | `readBackReviewDecision` for uncertain outcomes | MODIFIED |
| `ui/control-center/src/App.tsx` | capability gate and read-back reporting | MODIFIED |
| `tests/unit/nw09ShippedReviewCapability.test.ts` | six shipped-launcher and disagreement cases | CREATED |
| `ui/control-center/src/App.test.tsx` | four NW-09 cases; one existing case strengthened | MODIFIED |
| `src/core/policy/sensitiveDiagnostics.ts` | allowlist-only diagnostic taxonomy | CREATED |
| `src/browser/fixtures/storageState.ts` | content-free parse/IO diagnostics; one shared reader for the three inspection helpers | MODIFIED |
| `src/core/environment/index.ts` | content-free config read/parse diagnostics | MODIFIED |
| `src/core/selfDevSandbox/sandboxMirror.ts` | errno-only base diagnostic | MODIFIED |
| `src/core/source/siblingRoot.ts` | leaf constant so the topology authority does not drag in the sibling reader | CREATED |
| `src/core/selfDev/provenanceManifest.ts` | trust root closed over the new imports | MODIFIED |
| `tests/unit/nw13SensitiveDiagnostics.test.ts` | five NW-13 cases with fragment search over message, stack, cause and own properties | CREATED |
| `src/core/agentRuntime/checkpointStore.ts` | generation-bearing bounded atomic checkpoint publication and read | CREATED |
| `src/core/agentRuntime/localCampaign.ts` | publish/read through the store; supersede instead of delete on a fresh run | MODIFIED |
| `tests/unit/nw04CheckpointDurability.test.ts` | thirteen NW-04 cases including the three-step crash matrix | CREATED |
| `src/api/phase5/deadline.ts` | frozen relay failure taxonomy and the one abortable operation deadline | CREATED |
| `src/api/phase5/relay.ts` | one deadline threaded through auth, connection, redirect and body; signal reaches `fetch`; `maxBodyBytes` wired | MODIFIED |
| `tests/unit/nw05RelayDeadline.test.ts` | eleven NW-05 cases with injected time and count-based assertions | CREATED |
| `src/controlCenter/server/sse.ts` | per-client backpressure policy, two disconnection bounds, deterministic listener lifecycle | MODIFIED |
| `tests/unit/nw12SseBackpressure.test.ts` | eleven NW-12 cases over fake writables, including an API-free byte bound | CREATED |
| `docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md` | document status and NW-06 resolution evidence | MODIFIED |

## Validation Ledger

M9 full regression at the reconciled M9 head: `npm test` — **4743 passed / 18
skipped / 0 failed**, 8.5 minutes. UI lane: 41 passed, typecheck PASS, build
PASS (3 files, 297,422 bytes, no external references). `npm run typecheck`,
`npm run hardening:check`, `npm run agent:check` PASS.

Two regressions were introduced during M9 and repaired before integration.
Both were caught by EXISTING guards, which is the outcome those guards exist
for:

- `reviewStoreHardening` M-18 failed with `mutation anchor must occur exactly
  once`. NW-10 added `boundedCursorOffset` to the import line the mutation
  probe anchors on in `reviewerAuthority.ts`. The anchor was updated to the
  current text; the mutation itself — inject persistence authority and require
  the hardening rule to catch it — is unchanged. 23 passed after the fix.
- `phase23QualityGate` reported `UNCLASSIFIED_DUPLICATE` for
  `tests/unit/reviewerProjection.test.ts`: registering it in the
  synthetic-campaign lane would have executed it twice, since another
  required lane already selects it. The registration was removed rather than
  the assertion relaxed — the plan's own NW-08 constraint forbids duplicate
  execution without a documented independent claim. `gate:inventory` now
  reports zero duplicates across 227 unique authoritative test files.

M0: `npm run session:status` PASS (`WORKSPACE_INTEGRITY_SATISFIED`, self
`OWNED_SESSION`, clean, base CURRENT). `npm run agent:check` PASS with 3
warnings, all pre-existing: the stale-implementation-baseline notice against
the inherited W10 anchor, 31 legacy v1 task records, and the integrated W10
session worktree awaiting an owner release. `npm run handoff:check` PASS,
receipt campaign `nightwatch-repository-hardening-implementation-v1`,
planned-from `0ac7b3d`. `npm run workspace:check` PASS.

**M8 confirming shard sweep at the NW-12 head** — the full suite in four
foreground shards, each reconciled against its own collection:

| Shard | Collected | Passed | Skipped | Failed |
|---|---:|---:|---:|---:|
| 1/4 | 1190 | 1190 | 0 | 0 |
| 2/4 | 1188 | 1187 | 1 | 0 |
| 3/4 | 1190 | 1178 | 12 | 0 |
| 4/4 | 1180 | 1175 | 5 | 0 |
| total | **4748** | **4730** | **18** | **0** |

339 test files collected. The campaign has added 35 tests across six new
suites since its own M2 baseline of 4713, and the skip count is unchanged at
18 throughout — no suite has quietly started declining to run.

M8: `tests/unit/nw12SseBackpressure.test.ts` — 11 passed. Against the
pre-repair hub, the API-free case FAILED with 38,216 queued bytes where the
bound is 228. Ten of the eleven fail against the old hub, but only that one
fails for the right reason: the others assert `clientDiagnostics()` and
`disconnectCounts()`, which did not exist before the repair, so they would
fail on API absence. Recorded rather than counted as ten measurements.
`controlCenterServer`, `c10AcceptanceSuite`, `phase23QualityGate` — 85
passed. The authoritative gate now selects 223 unique test files with zero
duplicates.

M7: `tests/unit/nw05RelayDeadline.test.ts` — 11 passed; 4 fail against the
pre-repair relay, one per defect (unbounded auth, doubled redirect budget,
missing abort signal, uncomposed caller cancellation). The pre-repair
hung-auth case consumed the full 5.0 s injected hang. `phase5Api`,
`phase5Fixture` and `phase23QualityGate` — 35 passed. `npm run typecheck` and
`npm run hardening:check` PASS. The authoritative gate now selects 221 unique
test files with zero duplicates.

**M6 confirming shard sweep at the NW-04 head** — the full suite in four
foreground shards, each reconciled against its own collection:

| Shard | Collected | Passed | Skipped | Failed |
|---|---:|---:|---:|---:|
| 1/4 | 1190 | 1190 | 0 | 0 |
| 2/4 | 1221 | 1220 | 1 | 0 |
| 3/4 | 1135 | 1123 | 12 | 0 |
| 4/4 | 1180 | 1175 | 5 | 0 |
| total | **4726** | **4708** | **18** | **0** |

M6: `tests/unit/nw04CheckpointDurability.test.ts` — 13 passed. With
`localCampaign.ts` reverted to the pre-repair loader, the consumer-level case
FAILED: an 8 MB+ checkpoint was read and decoded whole and threw
`Unexpected token 'x', "xxxxxxxxxx"... is not valid JSON`, proving the
unbounded read and a content-window leak in one observation. Surrounding
suites after the repair: `localCampaign`, `campaignEndurance`,
`campaignStrategyMemory`, `localCampaignByteAccounting`,
`w10CampaignCapabilityCarry`, `w10LongRunResilience`, `realLocalCampaignPath`,
`agentRuntime`, `checkpoint`, `phase23QualityGate` — 60 passed.
`npm run typecheck` and `npm run hardening:check` PASS. The authoritative gate
now selects 219 unique test files with zero duplicates.

**M5 confirming shard sweep at the committed head `e32ab5d`** — the full
suite, four foreground shards, fully reconciled against collection:

| Shard | Collected | Passed | Skipped | Failed |
|---|---:|---:|---:|---:|
| 1/4 | 1190 | 1190 | 0 | 0 |
| 2/4 | 1208 | 1207 | 1 | 0 |
| 3/4 | 1137 | 1125 | 12 | 0 |
| 4/4 | 1178 | 1173 | 5 | 0 |
| total | **4713** | **4695** | **18** | **0** |

`npx playwright test --list` reports 4713 tests in 336 files, and the four
shard `--list` sets were differenced against the full set to confirm they
partition it exactly, so passed + skipped accounts for every collected test.
Three earlier receipts were discarded rather than recorded: two background
`npm test` runs killed mid-flight by session rotation (4635 and 1562 of 4708
collected), and the first shard sweep, whose three real failures are
diagnosed below.

M5 first shard sweep, before those failures were resolved (the full suite in
four foreground shards,
because two consecutive background `npm test` runs were killed mid-flight by
session rotation and were discarded rather than recorded):

| Shard | Collected | Passed | Skipped | Failed |
|---|---:|---:|---:|---:|
| 1/4 | 1190 | 1190 | 0 | 0 |
| 2/4 | 1208 | 1207 | 1 | 0 |
| 3/4 | 1137 | 1124 | 12 | 1 |
| 4/4 | 1178 | 1171 | 5 | 2 |
| total | 4713 | 4692 | 18 | 3 |

All three failures were diagnosed rather than accepted:

- `phase23QualityGate` "executable drift inventory" — REAL, introduced by
  this campaign. Registering `selfDevAdoptionSandbox.test.ts` and
  `privateArtifactAtomic.test.ts` in `SYNTHETIC_CAMPAIGN` duplicated suites
  already selected by the required `SEMANTIC_COMPATIBILITY` and
  `OWNER_PROVENANCE` lanes, and `quality-gate-inventory` reported both as
  `UNCLASSIFIED_DUPLICATE`. Both additions were reverted; the inventory now
  reports 218 unique files and zero duplicates, and the suite passes.
- two `selfDevAdoptionCli` cases — NOT a regression. Both fail with
  `SELFDEV_AUTHORITATIVE_SOURCE_DIRTY` because the self-dev CLI refuses to
  run against an uncommitted authoritative source tree, and this campaign's
  trust-root files were uncommitted at the time of the sweep. Re-verified
  against the clean committed tree: `selfDevAdoptionCli`,
  `phase23QualityGate` and `selfDevAdoptionSandbox` — 29 passed. The lesson
  is recorded rather than worked around: these two cases are sensitive to
  working-tree cleanliness, so a mid-milestone sweep with uncommitted
  authoritative source will always show them red.

M5: `tests/unit/nw13SensitiveDiagnostics.test.ts` — 5 passed; 2 fail against
the pre-repair code. 52 passed across `storageState`, `environmentSelection`,
`authCaptureStages`, `privateArtifactAtomic` and `selfDevSandbox`.
`npm run typecheck` and `npm run hardening:check` PASS.

M4: `tests/unit/nw03AtlasSnapshotConfinement.test.ts` — 8 passed; 5 fail
against the pre-repair module. Consumer suites: `bugAtlas`, `systemAtlas`,
`localInvestigationProviders` and the new suite — 74 passed.
`npm run typecheck` and `npm run hardening:check` PASS.

M3: `tests/unit/nw02PrivatePathTopology.test.ts` — 7 passed. With the
consumers reverted to the pre-repair code, the consumer-level case FAILED:
`privateArtifactRoot()` did not throw for a `NIGHTWATCH_PRIVATE_STATE_DIR`
pointed at the canonical Nightwatch checkout, run from this session
worktree. Surrounding suites after the repair: `privateArtifacts`,
`storageState` 35 passed; `privateArtifactAtomic`, `privateTriage`,
`c10ProductionProjection`, `c11ProdObserveEvidence`, `reviewStore` 168
passed. `npm run typecheck` PASS. `npm run hardening:check` PASS, and the new
rule was probed by breaking it four ways — the first attempt passed because a
surviving import satisfied a substring test, so the rule was tightened to the
call form and all four variants then failed.

M2 full regression at the M2 tree: `npm test` — **4675 passed / 18 skipped /
0 failed**, 15.7 minutes. This is the campaign's own measured baseline; it is
not compared against the W10 report's 4565/16, because W10's later commits
changed the suite between that receipt and this tree.

M2: `tests/unit/nw01ClosedVocabularies.test.ts` with `agentProtocol`,
`agentTools` and `dossierIdentityPropagation` — 69 passed / 0 failed after
the repair. Pre-repair measurement of the seven new cases: 5 failed, 2 passed
(the compatibility controls). `npm run typecheck` PASS.
`npm run hardening:check` PASS.

M1: `tests/unit/workspaceIsolation.test.ts` — 48 passed / 0 failed after the
repair. Pre-repair measurement of the same nine new cases: 8 failed, 1 passed
(the below-bound admit control). `node --check` over all 64 tracked
`bin/*.mjs`: PASS. `npm run hardening:check` PASS. `npm run workspace:check`
and `npm run session:check` PASS.

Accepted predecessor certification, not re-run here:

- W10 `gate:local` and clean-clone receipts recorded in the W10 REPORT;
- W10 full `npm test` and focused suite counts recorded in the W10 REPORT.

The validated baseline is this campaign's M1 implementation `43368276a59f8439e51af7d3ccf7b0cc0215d4b5`; the inherited baseline it advanced from was the certified W10 implementation `62d23e2622ab0a282584c5cf27d92b6b603f9192`.

## Decisions Made During This Task

Decision: open this work as its own campaign task, not a W11 wave.
Reason: the bug-hunting programme's authorization class and frozen records
cover autonomous yield; these findings are repository-wide hardening.

Decision: consume NW-15 instead of executing it.
Reason: W10 closed and certified under its own owner.

Decision: follow the plan's dependency order rather than priority alone.
Reason: NW-03, NW-04 and NW-09 consume the NW-02 path authority, and
NW-10/NW-11 consume frozen NW-09 DTOs.

Decision: do not release or remove the stale W10 session worktree.
Reason: C-00 forbids altering another session; capacity is not constrained at
four of eight.

## Discoveries

Discovery: NW-06 reproduces in live source exactly as the review recorded.
Evidence: `commandStart` in `bin/nightwatch-session.mjs` inspects current
topology, and `checkWorktreeMetadata` at `bin/workspace-integrity.mjs:437`
tests `worktrees.length > maxWorktrees` over already-registered worktrees
only. The candidate registration is never modelled, and the same function
returns on a failed ownership-record write with the branch and worktree
already created.

Discovery: an all-fail pre-repair result can be mostly meaningless. Evidence:
all ten original NW-12 cases failed against the old hub, but most asserted
`clientDiagnostics()` or `disconnectCounts()` — methods the repair
introduced — so they failed on API absence rather than on the defect. An
eleventh case was added that uses only `subscribe`, `publish` and the
socket's own byte count, and it fails for the right reason with a number
attached. "Every case fails pre-repair" is worth nothing unless the failure
mode is the defect.

Discovery: a planted-secret fragment search can report a leak that is not
one. Evidence: the NW-04 corrupt-state case planted
`PLANTED_NW04_CHECKPOINT_SECRET_...`, and an eight-character window of it
matched the error CODE `CHECKPOINT_CORRUPT` in the very diagnostic that was
correctly content-free. The planted value must share no vocabulary with the
diagnostics, the module name or the test path; it is now
`ZZQQ7_XYLOPHONE_..._MARMALADE_74`.

Discovery: this campaign repeated the recorded DEF-12 defect exactly, and
only the broad suite caught it. Evidence: `SELFDEV_AUTHORITATIVE_PATHS` is
both the provenance digest input and the file set copied into every self-dev
sandbox fixture mirror, and its own comment says the list "must stay
transitively closed over the authoritative set's imports". NW-02 added
`privateArtifacts.ts -> ./sourceTopology` and NW-13 added
`-> ./sensitiveDiagnostics` without extending it, so all 15
`selfDevAdoptionSandbox` cases failed with `Cannot find module`. The focused
per-milestone suites did not include that file, so NW-02 shipped the breakage
and M5's wider run found it. Repaired by extending the trust root,
introducing `src/core/source/siblingRoot.ts` so the topology authority needs
only a one-constant leaf instead of the whole sibling-reader cone, and adding
`checkSelfDevTrustRootClosure` to enforce the closure mechanically.

Discovery: the first version of that closure rule passed while proving
nothing, in a new way. Evidence: the manifest carries prose INSIDE the array
literal, and an apostrophe in it — "the authoritative set's imports" —
shifted the quote pairing of a naive `'([^']+)'` scan, so the extracted
"entries" were the text BETWEEN entries. Zero of 54 ended in `.ts`, the
closure loop iterated an empty set, and the rule reported PASS against all
three deliberately broken manifests. Fixed by stripping comments first, and
made structurally non-vacuous by failing when fewer than half the declared
entries parse as TypeScript paths. Both the closure rule and the
anti-vacuity guard were then probed and fire.

Discovery: NW-03's escape mutated the filesystem before the write. Evidence:
`saveBugAtlasSnapshot` created the directory from `path.dirname(file)`, so an
escaping `fileName` also created and chmodded `0700` a directory outside the
authorized root, independently of where the snapshot bytes then landed.

Discovery: the pre-repair NW-03 measurement wrote into the canonical
checkout. Evidence: running the state-root case against the pre-repair module
created `REPOSITORIES/nightwatch/synthetic-nw03-atlas-state/` containing a
0600 `bug-atlas-snapshot.json`. It was removed, the canonical checkout is
clean, no sibling was touched (verified by a read-only porcelain scan of every
sibling), and the regression now scopes a `finally` cleanup to the exact
fabricated name so the measurement cannot leave residue again.

Discovery: `path.basename` is the wrong guard for a configurable file name.
Evidence: it rewrites `../synthetic-escape.json` to `synthetic-escape.json`,
so a rule built on it would turn a refused escape into a silent successful
write to a different file. The check requires the name to EQUAL its own
basename instead.

Discovery: a substring hardening rule can be satisfied by the import line
alone. Evidence: the first NW-02 rule tested for `assertOutsideSourceTopology`
anywhere in the file, so replacing only the call site — leaving the import —
kept `hardening:check` PASS while the containment decision had moved back
into the consumer. The rule now requires the exact call form with each
store's own error code, and was re-probed four ways.

Discovery: NW-01's unguarded fallback was worse than "invalid enums are
accepted". Evidence: `parseIntent` ended with the TERMINATE branch instead of
dispatching it, so `{kind: 'constructor', reason: 'COMPLETE_WITH_FINDING'}`
validated as a TERMINATE intent — an accepted-but-unknown discriminant was
reinterpreted as a terminal state the model never named. The
`String(value.reason)` coercion compounded it: any object with a cooperative
`toString` could name a termination reason it did not equal.

Discovery: the frozen protocol's own test suite was in no gate manifest.
Evidence: `config/synthetic-campaign.v1.json` did not list
`tests/unit/agentProtocol.test.ts` or `tests/unit/agentTools.test.ts`, and no
required gate group runs `tests/unit` wholesale, so the authoritative gate
had never executed the trust boundary's regressions. Registered as part of
M2; this is live NW-08 evidence, not a separate finding.

Discovery: the prospective admission alone cannot hold the worktree bound.
Evidence: three concurrent `start` invocations at a bound of 3 with 2
registered all passed admission and produced 4 registrations against the
pre-repair code. Admission is per-process and `git worktree add` is not
serialized against it, so the invariant is actually held by the
post-creation verification plus rollback. The concurrent case is therefore a
required regression, not an optional one.

Discovery: the canonical checkout was 16 commits behind `origin/main` at
session open, because `nightwatch-session.mjs integrate` advances the remote
ref and leaves the local `main` ref behind. It was fast-forwarded before any
truth was read from it.

## Blockers

None.

## Safety Events

One, self-inflicted by a pre-repair measurement and fully remediated.

`SAFETY-M4-01` — running the NW-03 state-root case against the PRE-REPAIR
module created `REPOSITORIES/nightwatch/synthetic-nw03-atlas-state/` in the
canonical checkout and wrote a 0600 `bug-atlas-snapshot.json` into it. That is
the defect behaving exactly as the finding describes. The directory was
untracked and created by this session, so it was removed; the canonical
checkout is clean. No sibling repository was written — verified by a read-only
porcelain scan of every sibling under the repositories root. The regression
now scopes a `finally` cleanup to the exact fabricated directory name, so
re-measuring the defect cannot leave residue behind.

Lesson recorded: measuring a filesystem-escape defect executes the escape. A
pre-repair measurement of a containment finding must clean up on the failure
path, not only the success path.

## Deferred / Follow-Up

- Strict `EXACT_REDISCOVERY`, unknown-defect yield and parent-programme
  completion remain separate and unproven.
- DEV / NEXT / production, cloud and datastore work remain out of scope.
- Release of the integrated W10 session worktree is an owner decision.

## Resume Recipe

1. Read `.agent/ACTIVE_TASK.md` and this task's SPEC, PLAN, STATE, REPORT.
2. Read `docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md` sections 4, 6 and 7.
3. Discover live Git, worktree and session truth; claim this session with
   `claim --task nightwatch-repository-hardening-implementation-v1 --adopt`
   if its holder is no longer live.
4. Continue from `## Exact Next Action`. Do not reopen W0-W10.

## Completion Snapshot

Not complete. Populate only after M0-M13 and full certification close
truthfully.
