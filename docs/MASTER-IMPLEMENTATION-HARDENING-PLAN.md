# Nightwatch Master Implementation, Completion and Hardening Plan

Status: EXECUTION IN PROGRESS under `nightwatch-repository-hardening-implementation-v1` — canonical implementation plan. NW-15 closed by the W10 owner; NW-06 CLOSED; NW-01 through NW-05 and NW-07 through NW-14 open.

Review baseline: `1942ea37757bbb914de6281f505ee6118b5c67f0` (2026-09-08). Reconciled source baseline: `ed4e32602170e7e181b6e4841677fa8bff39d4ea`. These are historical anchors, not live Git authority. Discover current `HEAD` and `origin/main` before execution. This plan authorizes no implementation, environment contact, external publication, or change to the owner scope freeze.

## 1. Executive summary

Nightwatch is a substantial private, owner-local bug-hunting framework. It combines source discovery and mechanically derived contracts, contained browser/API observations, deterministic semantic oracles, replay and minimization, campaign orchestration, autonomous reasoner/tool loops, historical intelligence, and a local reviewer dashboard. Its main architectural strength is the separation of observation, proof, inference, and execution authority. Production observation remains separately gated; datastore and infrastructure operations remain frozen.

The repository needs selective repair rather than a rewrite. Its established semantic, provenance, source-safety, containment, and owner-policy foundations are strong. The newer autonomous, filesystem-persistence, release-accounting, and dashboard paths contain confirmed defects or incomplete workflows. Historical operational acceptance is evidence for its checkpoint, not blanket certification of the current autonomous programme.

The highest-priority confirmed defects are prototype-inherited enum acceptance in reasoner-facing validators, checkout-dependent private-path exclusions, Bug Atlas path escape and leaf-symlink writes, non-atomic autonomous checkpoint persistence, ineffective cancellation in the Phase-5 relay, sensitive JSON parse diagnostics, prospective worktree-capacity admission, and incomplete release-test accounting. No P0 is claimed: the review found no evidence of current arbitrary command authority, external boundary escape, or production contact.

The target is a reproducible private local tool whose closed vocabularies are mechanically closed, durable state survives interruption and competing writers, deadlines stop owned work, the dashboard exposes its bounded data and enabled capabilities truthfully, and release claims identify every test and host capability actually exercised. Unknown-bug yield remains an empirical outcome and never a quota that can weaken admission evidence.

## 2. Repository and system overview

### Inventory and method

The fixed baseline contains 2,151 tracked files: 581 source files, 357 tests, 71 bin/tool files, 14 UI files, 112 corpus fixtures, 978 planning/history files, and 38 other configuration/document files. Every tracked path and byte was inventoried and hashed. Repository-wide searches covered process, network, filesystem, timer, incompleteness, and skip surfaces. Deep inspection and bounded synthetic probes focused on trust boundaries and primary execution flows. Inventory coverage is not a claim that every branch ran or that every line received equal manual attention.

The review read only Nightwatch. It did not inspect real sibling source, credentials, owner findings, subscribed-provider state, or live environments. It did not contact DEV, NEXT, production, cloud, data stores, or external services. No full-suite, UI-browser, clean-clone, dependency-advisory, or exact-SHA CI pass is claimed by this planning review.

### Major boundaries and flows

| Area | Main flow | Current authority and state |
| --- | --- | --- |
| Environment and policy | `src/core/environment`, `src/core/policy`, `src/core/safety` | Unknown operations fail closed; datastore, infrastructure, and publication remain owner-frozen. |
| Browser and auth | `src/auth`, `src/browser`, observers, product adapters | External owner storage state, loopback/L5 controls, and authenticated trace restrictions. |
| Network and process | `src/proxy`, `src/core/oops`, `src/core/process` | Address admission, L6 capability qualification, child allowlists, categorical teardown. |
| API and data | `src/api/phase5`, `src/data/phase6` | Catalog-resolved read operations; real data execution is quarantined by owner policy. |
| Source intelligence | `src/core/source`, semantic coverage, change intelligence | Approved read-only roots, bounded inventory, SHA/content provenance, stale-source diagnostics. |
| Semantic evaluation | `src/oracles/**`, protocol | Bounded projection, mechanically admitted expectation, deterministic receipt; absence is not PASS. |
| Campaigns | campaign, portfolio, intelligence, phase modules | Frozen manifests, monotone budgets, replay, checkpoints, explicit terminal states. |
| Private triage | triage, review, finding intelligence, handoff | Exact reproduction identity, immutable review binding, human-only external disposition. |
| Autonomy | protocol → reasoner → runtime → tools/local investigation | Typed intents, host-owned budgets, untrusted source envelopes, mechanical admission. |
| Reproduction | owner-local reproduction, benchmarks, efficacy, atlases | W9 current-source Go execution; W10 capability-aware selection is active. |
| AI/self-development | AI review, self-dev, sandbox, promotion | Advice has no deterministic authority; promotion remains one-shot and separately authorized. |
| Production prerequisites | privacy, evidence, observe, provenance, C12 | Ordered local prerequisites confer no live authority. |
| Dashboard | control-center server/contracts/adapters and React UI | Loopback-only reads, bounded DTOs, SSE invalidation, optional injected review authority. |
| Tooling and continuity | `bin`, `.agent`, workflows, OpenSpec, docs | C-00 ownership, project/handoff checks, manifest-based quality gates. |

The root package is private TypeScript/CommonJS on Node 20 or newer, with Playwright as the root test runner. The React/Vite/Vitest UI has its own lockfile and validation. Root TypeScript excludes that UI and the JavaScript bin tools, so those require separate checks. Persistence is filesystem-based. Established immutable evidence/reviews use stronger staged or no-replace patterns than the newer mutable campaign and Atlas stores; a database is unnecessary for the bounded local target.

### Evidence and limits at review close

| Evidence | Result and meaning |
| --- | --- |
| `session:status` | PASS in an owned session at reconciled baseline. An earlier start created a ninth worktree before the integrity checker rejected it; the review removed only its own empty session. |
| Root `tsc --noEmit --incremental false` | PASS at the fixed baseline; compile evidence only. |
| All 64 tracked bin `.mjs` files with `node --check` | PASS at the fixed baseline; syntax only. |
| `hardening:check` | PASS at the fixed baseline; existing structural rules did not detect NW-01–NW-04. |
| `agent:check` | PASS with historical/stale-baseline warnings at reconciled baseline. The initial W10 routing mismatch was repaired by current `main`. |
| `handoff:check` | PASS at reconciled baseline. |
| `project:check` | Requires a clean checkout and is deferred until the documentation commit. |
| Synthetic probes | Executed confirmation for NW-01, NW-02, NW-03, NW-06, and NW-13 using fake temporary data only. |
| Full regression, UI runtime, clean gate, current CI | NOT EXECUTED here. Prior checkpoint reports remain historical evidence. |

After reconciliation with W10's next two commits, the live tree contains 329 ordinary root `.test.ts`/`.smoke.ts` files, up from 321 at the fixed baseline because W10 added focused tests. NW-08 deliberately uses the fixed 321-file comparison as reproducible evidence and requires current discovery before implementation.

## 3. Current-state assessment

### Complete and healthy within established scope

Owner-policy refusal, deterministic projection and semantic receipts, source-proof preconditions, manifest/budget binding, immutable private review identity, loopback Host/Origin checks, bounded snapshot caches, and many fixture-based safety checks are implemented. Preserve these boundaries and regression assertions. This classification does not certify unexecuted host or runtime scenarios.

### Implemented but requiring hardening

Reasoner protocol validation, private-path selection, campaign/Atlas persistence, Phase-5 deadlines, release selection, and dashboard transport need the targeted changes below. Host-specific containment and browser readiness require explicit capability-qualified evidence.

### Partial or missing within the local product

The server supports injected review decisions, but the shipped launcher does not deliberately enable them. Server cursors exist, while the UI cannot traverse all result pages. Fetch cancellation, DTO validation, burst coalescing, and slow-client SSE bounds are incomplete. Release tooling does not account for the full discovered root/UI test universe. Autonomous reproduction is constrained; W10 is already improving selection and must retain ownership of that work.

### Intentionally excluded or uncertain

Cloud deployment, datastore access, external publication, and production operation are outside the permanent owner scope. Current public dependency advisories, full browser accessibility, host L6 qualification, exact-checkpoint CI, and real unknown-defect yield require separate evidence. The documented Vue 2 fixture exception should remain until a current reachability assessment supports a specific replacement.

## 4. Findings register and executable task specifications

Priority meanings: P0 is demonstrated catastrophic failure requiring immediate containment; P1 is a high-impact authority/correctness/reliability defect or release prerequisite; P2 is material hardening or operator-workflow work; P3 is maintenance. Status is the state at this review checkpoint. Confidence distinguishes executed proof, confirmed source behavior, and validation still required. In each task, the title and recommended implementation define the objective and detailed implementation guidance; the problem/impact/root-cause field is the rationale; affected surfaces are scope. The remaining labeled fields define tests, validation, acceptance, dependencies, risks, and parallel ownership.

### NW-01 — Close reasoner-facing vocabularies against prototype inheritance

- **Priority / category / confidence / status:** P1; trust boundary and validation; CONFIRMED by execution; **CLOSED** — repaired and regression-proven under `nightwatch-repository-hardening-implementation-v1` M2.
- **Affected surfaces:** `src/core/agentProtocol/validate.ts`, `src/core/agentProtocol/tools.ts`, `src/core/autonomousFinding/dossier.ts`, their callers and focused tests.
- **Evidence:** ordinary objects created with `Object.fromEntries` are queried by truthiness. Synthetic invalid values such as `constructor` and `__proto__` passed intent, termination-reason, severity, environment, or confidence membership. `lookupAgentTool('constructor')` returned an inherited function although `isAgentToolId` correctly rejected it.
- **Problem, impact, root cause:** attacker/model-controlled strings can enter closed protocol states and map through non-exhaustive fallback behavior. No arbitrary command was demonstrated, but invalid terminal states, dossiers, or tool lookup results can acquire valid-looking authority. The root is prototype-bearing membership maps plus truthy lookup and default branches that silently reinterpret unknown discriminants.
- **Recommended implementation:** use `Set`, null-prototype records with explicit own-key checks, or existing closed-vocabulary helpers. Make intent dispatch exhaustive and reject unknown kinds before any callback or terminal-state construction. Apply one consistent primitive to every model-facing enum.
- **Constraints and compatibility:** preserve valid serialized schemas and valid tool IDs; do not broaden reasoner authority or coerce strings. Audit adjacent validators, while treating boolean `=== true` maps as safe unless evidence says otherwise.
- **Tests and validation:** table-test all `Object.prototype` names, symbols encoded as strings, boxed/coercible values, empty/mixed-case values, and valid controls. Assert invalid input invokes no tool callback and emits no valid checkpoint/dossier. Run protocol, autonomous-finding, resume compatibility, typecheck, hardening, and full offline regression.
- **Acceptance:** every closed vocabulary uses own membership; exhaustive dispatch has an unreachable assertion; every adversarial value fails categorically before effects; all existing valid fixtures remain byte/schema compatible where promised.
- **Dependencies / risks / parallelization:** independent after a legal C-00 session. One protocol lane should own shared validation helpers and these callers. Risk is accidental incompatibility with persisted valid intents; cover old checkpoints explicitly.

- **Resolution evidence (2026-09-08):** revalidated by running the new
  regression against the pre-repair code — 5 of its 7 cases failed and the 2
  that passed are the compatibility controls. The measurement also found a
  consequence the review had not stated: because `parseIntent` ended in an
  unguarded fallback rather than an exhaustive dispatch, an
  accepted-but-inherited intent kind was not merely admitted, it was
  reinterpreted as the last branch — `{kind: 'constructor', reason:
  'COMPLETE_WITH_FINDING'}` validated as a **TERMINATE intent**, minting a
  terminal state the model never named. A `String()` coercion on the
  termination reason additionally let any object with a cooperative
  `toString` name a member it did not equal.
  One closure primitive, `src/core/agentProtocol/closedVocabulary.ts`, now
  owns both questions: `closedVocabulary` returns a `Set`-backed type guard
  that refuses non-strings without coercion, and `closedLookup` returns a
  `Map`-backed catalog whose `has` and `get` answer from the same table.
  `validate.ts` uses it for the intent-kind and termination vocabularies and
  dispatches `TERMINATE` explicitly, ending in `reject('UNKNOWN_INTENT')`;
  `tools.ts` replaces the object-backed `TOOL_BY_ID`, so
  `lookupAgentTool('constructor')` is now `null` instead of an inherited
  function; `dossier.ts` uses it for severity, confidence and environment.
  Seven cases in `tests/unit/nw01ClosedVocabularies.test.ts` cover eight
  inherited names — `constructor`, `__proto__`, `toString`, `valueOf`,
  `hasOwnProperty`, `isPrototypeOf`, `propertyIsEnumerable`,
  `toLocaleString` — across intent kind, termination reason, tool id, and the
  three dossier vocabularies, plus a coercion case and two compatibility
  controls asserting every frozen member and a full valid dossier still
  build. 69 passed across the NW-01, `agentProtocol`, `agentTools` and
  `dossierIdentityPropagation` suites; `npm run typecheck` PASS.
  `agentProtocol.test.ts`, `agentTools.test.ts` and the new suite were also
  added to `config/synthetic-campaign.v1.json`: the frozen protocol's own
  suite was in no manifest, so the authoritative gate had never run it. That
  is recorded as NW-08 evidence.

### NW-02 — Make private-path exclusion independent of checkout topology

- **Priority / category / confidence / status:** P1; privacy and filesystem authority; CONFIRMED by synthetic execution; **CLOSED** — repaired and regression-proven under `nightwatch-repository-hardening-implementation-v1` M3.
- **Affected surfaces:** `src/core/policy/privateArtifacts.ts`, `src/core/prodEvidence/productionFindingsStore.ts`, and topology assumptions in auth/storage-state validators.
- **Evidence:** these modules derive repository/workspace roots from `__dirname`. The same configured synthetic path under a canonical `REPOSITORIES/nightwatch` tree was rejected with a canonical checkout `__dirname` but accepted when `__dirname` represented an external linked worktree.
- **Problem, impact, root cause:** a safety decision changes with the implementation checkout location, allowing private artifacts beneath canonical or sibling source trees in supported worktree topology. Worktree-location independence was implemented elsewhere but not adopted here.
- **Recommended implementation:** define one topology-aware, fail-closed authority for canonical Nightwatch root, sibling `REPOSITORIES` root, registered linked worktrees, and permitted owner-only state roots. Resolve configured paths with no-follow containment checks before creation. Require explicit test injection rather than deriving production authority from module location.
- **Constraints and compatibility:** use `DEFAULT_SIBLING_ROOT` or explicit `NIGHTWATCH_REPOS_ROOT`; reject ambiguity. Do not inspect or write siblings. Keep default owner paths and existing safe artifacts readable.
- **Tests and validation:** matrix canonical clone, linked worktree, relocated fresh clone, explicit root, missing/ambiguous root, symlinked ancestor, canonical/sibling/worktree targets, and valid owner directory. Assert identical decisions across topology.
- **Acceptance:** all real stores and secret-path validators reject every source/worktree root regardless of checkout location; valid owner state works; no machine-specific path enters Git.
- **Dependencies / risks / parallelization:** freeze this contract before NW-03/NW-04/NW-09 storage changes. A single private-state lane owns the shared primitive. Main risk is blocking legitimate legacy locations; provide categorical migration guidance without automatic moves.

- **Resolution evidence (2026-09-08):** revalidated through the consumers'
  own public paths, not the new module's. With
  `NIGHTWATCH_PRIVATE_STATE_DIR` pointed at the canonical Nightwatch checkout
  and run from a C-00 session worktree, the pre-repair
  `privateArtifactRoot()` and `new PrivateArtifactStore()` **accepted** it —
  the exclusion set was `$HOME/.nightwatch/worktrees`, so canonical and every
  sibling source tree were outside it. That case now throws
  `PRIVATE_ARTIFACT_ROOT_INSIDE_REPOSITORY`, and the production store throws
  `PRODUCTION_ARTIFACT_ROOT_INSIDE_REPOSITORY`.
  `src/core/policy/sourceTopology.ts` is the single authority. Its excluded
  set is built from absolute, checkout-independent facts: the sibling
  `REPOSITORIES` root (explicit root, then `NIGHTWATCH_REPOS_ROOT`, then
  `DEFAULT_SIBLING_ROOT` — the order the rest of the repository already
  uses), the C-00 session-worktree parent `$HOME/.nightwatch/worktrees`, and
  this checkout's own root as additional self-protection that can only refuse
  more, never define the shared answer. A non-absolute or blank configured
  root throws `SOURCE_TOPOLOGY_REPOSITORIES_ROOT_AMBIGUOUS` rather than
  falling back. Containment is lexical on normalized paths, which is sound
  only because the callers still refuse a symlink at every path component
  before creating anything; that ordering is documented in the module.
  Both consumers now inject the authority, and their duplicated local
  `isInside` helpers were deleted so containment exists in exactly one place.
  Seven cases in `tests/unit/nw02PrivatePathTopology.test.ts` assert the full
  decision vector for six forbidden targets — canonical checkout, the
  repositories root itself, two sibling subtrees, the worktree parent and
  another session worktree — across three injected topologies (canonical
  checkout, linked session worktree, relocated clone) and require the three
  vectors to be **identical**, plus the three legitimate owner roots allowed
  in all three, ambiguity failing closed, precedence order, self-protection,
  and the live end-to-end store case. All paths are fabricated; nothing under
  a real repositories root is created, and the refusal is asserted to happen
  before creation.
  `checkC00WorkspaceIntegrity` in `bin/hardening-check.mjs` now locks
  both surfaces: each must contain the exact
  `assertOutsideSourceTopology(root, '<its own error code>'` call and must not
  mention `__dirname`, and the authority itself must reference
  `DEFAULT_SIBLING_ROOT` and fail closed on ambiguity. The rule was probed by
  breaking it four ways; the first attempt passed because the surviving
  import line satisfied a substring test while the call site was replaced, so
  the rule was tightened to the call form and all four variants now fail.

### NW-03 — Confine and safely publish Bug Atlas snapshots

- **Priority / category / confidence / status:** P1; filesystem integrity; CONFIRMED by execution; **CLOSED** — repaired and regression-proven under `nightwatch-repository-hardening-implementation-v1` M4.
- **Affected surfaces:** `src/core/bugAtlas/snapshot.ts` and Bug Atlas callers/tests.
- **Evidence:** a synthetic `fileName: '../synthetic-escape.json'` wrote outside the configured state directory. An existing leaf symlink was followed and its external synthetic target overwritten. The current check covers the directory leaf, then calls direct `writeFileSync` on the destination.
- **Problem, impact, root cause:** configurable path components are not confined, leaf identity is not verified, and direct truncation exposes unrelated files and partial snapshots.
- **Recommended implementation:** remove arbitrary filename path authority or accept only a strict basename; join then prove containment. Publish with an owner-only same-directory temporary file and no-follow/no-clobber or explicitly versioned atomic-replace semantics. Revalidate parent and leaf identity at the publication boundary and clean owned temporaries on failure.
- **Constraints and compatibility:** retain snapshot schema and default location. Do not follow symlinks or auto-delete suspicious owner files. Reuse a shared primitive only if its mutability semantics match.
- **Tests and validation:** traversal variants, absolute paths, separators, dot segments, ancestor/leaf symlinks, races at injectable publication steps, permission failures, and success/readback. Sentinels outside the state root must remain byte-identical.
- **Acceptance:** every output is inside the authorized root; unsafe names and symlinks fail before mutation; interruption yields a complete prior or new snapshot; no residue remains after controlled failures.
- **Dependencies / risks / parallelization:** depends on NW-02 path authority and informs NW-04 atomic primitives. Keep one storage owner until contracts freeze. Risk is changing overwrite behavior; specify it explicitly.

- **Resolution evidence (2026-09-08):** revalidated, and the pre-repair
  measurement did real damage worth recording: the case that points the state
  directory at the canonical Nightwatch checkout **created that directory and
  wrote a 0600 snapshot into the tracked checkout**. The residue was removed
  and the canonical checkout returned to clean; the regression now scopes a
  `finally` cleanup to the exact fabricated name it chose, so the measurement
  cannot leave it behind again. No sibling repository was touched, verified by
  a read-only scan of every sibling's porcelain status.
  A second consequence the review had not stated: because the directory was
  created from `path.dirname(file)`, an escaping `fileName` also created and
  chmodded `0700` a directory outside the authorized root — the escape
  mutated the filesystem before the write even happened.
  Repair: `safeSnapshotFileName` requires the name to be exactly its own
  basename, contain no dot-segment and match the pinned
  `^[A-Za-z0-9][A-Za-z0-9._-]{0,160}\.json$` shape. `path.basename` alone
  would have been wrong — it silently rewrites `../x.json` to `x.json`,
  converting an escape attempt into a successful write to a different file.
  `snapshotStateRoot` holds the state root to the NW-02 topology authority
  (`BUG_ATLAS_STATE_ROOT_INSIDE_REPOSITORY`), `snapshotFilePath` joins and
  then PROVES the result is a direct child of the proven root, the directory
  is created from that proven root rather than from the file's dirname, every
  path component is lstat-checked before and after creation, and
  `publishSnapshot` stages the bytes into an owner-only same-directory
  temporary opened `wx`, fsyncs, revalidates the publication boundary, and
  `rename`s into place, removing owned temporaries in `finally`.
  `listSnapshotTemporaries` recognises only the pinned temporary shape, so
  recovery can never report or remove a file it did not create.
  Replace semantics are stated explicitly rather than inherited: a snapshot
  is mutable state, so a republish deliberately replaces the previous file,
  but only by renaming over a destination proven to be a regular, owner-only,
  non-symlink file.
  Eight cases in `tests/unit/nw03AtlasSnapshotConfinement.test.ts` cover ten
  unsafe names (traversal, nested, dot-segment, absolute, empty, extensionless,
  hidden), a leaf symlink whose target sentinel must stay byte-identical, a
  symlinked ancestor, a state root inside real source, the round trip, and the
  frozen default name. Atomicity is measured by INODE: a direct
  `writeFileSync` truncates and rewrites the same inode, while a
  temporary-plus-rename always yields a different one, so the test
  distinguishes the mechanism rather than asserting an unobservable claim. One
  case is labelled a control because normalisation runs before publication and
  it passes pre-repair too. 5 of the 8 fail against the pre-repair code.
  Consumer suites after the repair: `bugAtlas`, `systemAtlas`,
  `localInvestigationProviders` and the new suite — 74 passed.

### NW-04 — Make autonomous campaign checkpoints bounded and crash-safe

- **Priority / category / confidence / status:** P1; durability and autonomous correctness; CONFIRMED source behavior, crash consequences now EXECUTED; **CLOSED** — repaired and regression-proven under `nightwatch-repository-hardening-implementation-v1` M6.
- **Affected surfaces:** `src/core/agentRuntime/localCampaign.ts`, newer checkpoint adapters, recovery CLI/tests, and any shared mutable JSON-state primitive.
- **Evidence:** the local campaign store directly truncates the destination then chmods it, performs unbounded read before decoding, and can delete an existing same-ID checkpoint before new durable progress exists. Directory and basic symlink checks do not provide publication atomicity or writer coordination.
- **Problem, impact, root cause:** interruption, disk pressure, or competing same-ID processes can corrupt or silently lose owner progress. Mutable campaign state was implemented separately from stronger established persistence patterns.
- **Recommended implementation:** define generation and same-ID writer semantics; bound file size before allocation; write canonical bytes to a same-directory owner-only temporary, sync as supported, atomically replace under verified identity, sync the directory where meaningful, then publish generation metadata. Preserve corrupt evidence and fail categorically. Use a lock/lease or compare-generation protocol appropriate to one-host local operation.
- **Constraints and compatibility:** keep old valid checkpoint readers; distinguish immutable no-replace reviews from mutable replaceable checkpoints. Never delete corrupt/old owner evidence automatically to make startup succeed.
- **Tests and validation:** deterministic crash injection before write, mid-write, before/after rename and sync; simultaneous same-ID writers; stale generation; oversized/truncated/malformed state; resume old schemas; full byte-budget and W9/W10 checkpoint compatibility.
- **Acceptance:** recovery observes either the complete previous generation or complete next generation; silent clobber is impossible; input allocation is capped; corrupt state yields content-free diagnostics and remains available for owner action.
- **Dependencies / risks / parallelization:** depends on NW-02 and shared publication decisions from NW-03. One persistence lane should implement the primitive and migrate consumers incrementally. Durability varies by filesystem, so document qualified guarantees rather than claiming universal fsync semantics.

- **Resolution evidence (2026-09-08):** the review rated the crash
  consequences "strongly indicated"; they are now executed. Measured through
  the consumer's own entry point, `loadLocalCampaignCheckpoint`, the
  pre-repair loader given an 8 MB+ checkpoint read and decoded the whole file
  and then threw
  `Unexpected token 'x', "xxxxxxxxxx"... is not valid JSON` — one measurement
  proving both the unbounded read and a content-window leak of the
  checkpoint's own bytes, which are investigation state.
  `src/core/agentRuntime/checkpointStore.ts` is now the single publication and
  read path.
  **Generations.** Every published document carries `checkpointGeneration`,
  one greater than the generation it replaced. The field is additive:
  `parseCheckpoint` reads named fields and ignores the rest, so a pre-NW-04
  checkpoint reads as generation 0 and the next write becomes 1. Proven by a
  dedicated old-reader case.
  **Same-ID writers.** Single-host local operation, so the protocol is
  compare-generation rather than a lock: the on-disk generation is re-read
  immediately before the rename, and a change since staging refuses with
  `CHECKPOINT_GENERATION_CONFLICT`. The limit is stated in the module rather
  than overclaimed — it converts the common interleaving from silent loss into
  a reported refusal, and the loser's bytes are never half-written into the
  winner's file, but it does not eliminate the final rename race.
  **Bounded reads.** The size is taken from the `lstat` and refused before any
  allocation; corrupt, truncated and non-object documents are
  `CHECKPOINT_CORRUPT` with the M5 content-free taxonomy, and the file is
  left exactly where it is.
  **Never delete owner evidence.** A corrupt predecessor is not treated as an
  empty slot: publication refuses rather than overwriting it. And a fresh run
  no longer DELETES the stored checkpoint for its id before durable progress
  exists — `supersedeStoredCheckpoint` moves it to `<file>.superseded`,
  keeping exactly one superseded document per id so the store stays bounded.
  **Durability is qualified, not claimed.** The module fsyncs the file and the
  containing directory where the platform allows, and documents that what it
  guarantees is atomic VISIBILITY — a reader sees the complete previous or the
  complete next document — rather than universal fsync semantics.
  Thirteen cases in `tests/unit/nw04CheckpointDurability.test.ts`: the crash
  matrix at all three publication steps (each asserting exactly one complete
  generation, no partial file and no temporary residue), a competing same-id
  writer interleaved precisely between staging and rename, inode-level proof
  that a republish renames rather than truncating in place, oversized stored
  and oversized proposed documents, corrupt and truncated state preserved and
  reported without content, symlinked destination and out-of-directory
  refusals, superseding, and pre-NW-04 compatibility. Crash injection uses
  hooks that exist only in the primitive's signature — no campaign input DTO,
  CLI flag or config file carries them, so a reasoner cannot reach them.
  The consumer-level case fails against the pre-repair loader. Campaign,
  runtime, checkpoint, byte-accounting, W10 capability-carry and long-run
  resilience suites: 60 passed.

### NW-05 — Enforce one abortable Phase-5 relay deadline

- **Priority / category / confidence / status:** P1; network lifecycle and bounded execution; CONFIRMED source behavior; **CLOSED** — repaired and regression-proven under `nightwatch-repository-hardening-implementation-v1` M7.
- **Affected surfaces:** `src/api/phase5/relay.ts`, auth-header acquisition, redirects, response-body handling, and relay tests.
- **Evidence:** default `fetch` receives no `AbortSignal`. A `Promise.race` timeout rejects without aborting upstream work; auth-header work is outside the timer, and a redirect receives another full timeout.
- **Problem, impact, root cause:** the caller can receive a terminal timeout while DNS/socket/body work remains active. Per-attempt timers do not form an end-to-end deadline, and resource ownership is split across helpers.
- **Recommended implementation:** create one monotonic deadline and `AbortController` at the operation boundary; pass remaining budget and signal through auth, fetch, redirect, and body consumption. Abort and cancel bodies on timeout/caller cancellation; await bounded cleanup and normalize diagnostics.
- **Constraints and compatibility:** preserve catalog/address/redirect admission and never retry writes. Maintain injected fetch seams for offline tests; do not weaken TLS or host checks.
- **Tests and validation:** hung auth, connection, headers, body, redirect, caller abort, abort race, and successful near-deadline requests using synthetic loopback/fake transports. Assert calls, signals, body cancellation, timer disposal, and no work after cleanup grace.
- **Acceptance:** one documented deadline covers the whole operation; every terminal path disposes timers and aborts owned work; redirect count and total time remain bounded; error categories contain no secrets.
- **Dependencies / risks / parallelization:** independent after Phase 0. A dedicated API lane can run beside protocol/storage work. Risk is misclassifying timeout versus network failure; freeze taxonomy before editing.

- **Resolution evidence (2026-09-08):** all four defects reproduce and are
  measured through `executeNativePhase5Operation`, the consumer's own entry
  point. Against the pre-repair relay, 4 of the 11 new cases fail, one per
  defect — and the hung-auth case took the full **5.0 s** injected hang,
  proving the credential fetch was unbounded rather than merely late.
  `src/api/phase5/deadline.ts` freezes the taxonomy and owns the lifecycle.
  One `createRelayDeadline` is created at the operation boundary, **before**
  auth-header acquisition, and covers auth, connection, headers, redirect and
  body. `remainingMs()` is a monotonic residual budget the stages share, so a
  redirect no longer receives a second full `timeoutMs` — the previous
  per-attempt timer let a 15 s bound govern a 30 s operation. A caller's
  signal composes into the operation's signal, and it is the operation's
  signal that reaches `fetch`, so aborting stops the transport instead of
  abandoning it. `dispose()` is idempotent and clears both the timer and the
  caller listener on every terminal path.
  The taxonomy is the part the review asked to freeze first:
  `DEADLINE_EXCEEDED`, `CALLER_ABORTED` and `TRANSPORT_FAILED` are distinct,
  carry the stage that owned the budget, and are surfaced on the observation
  as `relayFailure` and on the relay response as
  `X-Nightwatch-Relay-Failure`. The oracle result stays `NETWORK_FAILURE`, so
  no existing consumer changes. Body consumption checks the signal each
  iteration and cancels the reader in a `catch`, so no stream is left owned.
  Two incidental corrections in the same file, recorded rather than silently
  folded in: the declared `maxBodyBytes` option was never read — it now feeds
  the body cap with the value the function always hardcoded, so behaviour is
  unchanged — and the two 15 s literals became one named constant.
  Eleven cases in `tests/unit/nw05RelayDeadline.test.ts`. Every assertion is
  an operation count, a signal state or a call order; time is injected through
  a fake monotonic clock and timer, because a wall-clock threshold on a shared
  machine measures load rather than the property. Cases cover deadline expiry
  and residual budget, caller-abort composition including an already-aborted
  caller, idempotent disposal with a proof that a disposed timer cannot fire,
  a hung stage naming its stage, the taxonomy, hung auth, the shared redirect
  budget, signal and budget delivery to the fetcher, caller abort mid-flight,
  a successful near-deadline request that must NOT be failed, and the bounded
  redirect chain. `phase5Api`, `phase5Fixture` and `phase23QualityGate`: 35
  passed.

### NW-06 — Reject over-capacity sessions before creating worktrees

- **Priority / category / confidence / status:** P1; workspace safety and developer operations; CONFIRMED by execution; **CLOSED** — repaired and regression-proven under `nightwatch-repository-hardening-implementation-v1` M1.
- **Affected surfaces:** `bin/nightwatch-session.mjs`, workspace-integrity helpers and C-00 tests/docs.
- **Evidence:** with eight registered worktrees, `start` passed the precheck, created a ninth, and only then caused `WORKSPACE_WORKTREE_LIMIT_EXCEEDED`. The review stopped and removed only its own empty worktree to restore PASS.
- **Problem, impact, root cause:** the command validates current topology rather than prospective topology and lacks transactional rollback after partial creation.
- **Recommended implementation:** compute the candidate registration against the same canonical integrity model before mutation. After creation, verify claim/metadata atomically; on any owned partial failure, remove only the just-created session and branch if provably unchanged, then report the original and rollback outcomes.
- **Constraints and compatibility:** never prune, release, adopt, or modify another session to make room. Preserve single-worktree exceptions and remote-ref integration behavior.
- **Tests and validation:** boundaries at 0, 7, and 8 worktrees; injected failures after branch/worktree/claim creation; name collisions; concurrent starts; symlink/metadata anomalies. Assert no ninth registration and no changes to existing sessions.
- **Acceptance:** over-capacity start fails before mutation; every post-mutation failure either returns to the exact prior topology or reports a bounded owner-action state; `session:status` remains PASS.
- **Dependencies / risks / parallelization:** first implementation phase because it protects later lanes. Coordinate with all live session owners. Risk is rollback deleting an unrelated ref; require identity/SHA/path proof before cleanup.
- **Resolution evidence (2026-09-08):** revalidated in live source before any
  change — `commandStart` inspected the topology that already existed and
  `checkWorktreeMetadata` compared `worktrees.length > maxWorktrees` over
  already-registered worktrees, so the candidate was never modelled.
  `admitProspectiveWorktree` (`bin/workspace-integrity.mjs`) now evaluates the
  candidate registration against the same policy before any mutation, and
  `commandStart` refuses with `SESSION_START_REFUSED_PROSPECTIVE_TOPOLOGY`.
  `--allow-drift` does not bypass it. Creation is transactional: every
  post-mutation failure calls a proof-gated rollback that removes only the
  just-created worktree and branch after the path, branch name, HEAD and
  branch tip are each proven unchanged and the tree is clean, and otherwise
  reports `SESSION_START_ROLLBACK_INCOMPLETE` for owner action. The
  registration handed to the owner is verified against the same integrity
  model afterwards, which is what holds the bound under the inherently
  non-atomic multi-process case. Nine cases added to the C-00 adversarial
  matrix in `tests/unit/workspaceIsolation.test.ts`: bounds at 1, 2 and 3
  worktrees, `--allow-drift`, injected failures after `worktree add` and
  after the record write, an unrecognised fault token failing closed, a
  retained unrelated branch surviving a rollback, and three concurrent starts
  at the bound. Measured against the pre-repair code, 8 of the 9 fail and the
  ninth is the below-bound admit control; the concurrent case reproduced the
  defect directly with 4 registrations against a bound of 3. After the repair
  all 48 cases in that file pass, and `hardening:check`, `workspace:check`
  and `session:check` are PASS.

### NW-07 — Keep continuity and project memory mechanically coherent

- **Priority / category / confidence / status:** P2; documentation/release truth; PARTLY RESOLVED, residual work NOT STARTED.
- **Affected surfaces:** `.agent/ACTIVE_TASK.md`, programme/child PLAN/STATE/REPORT, `docs/CURRENT_STATE.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`, and continuity checkers.
- **Evidence:** the fixed baseline had an active routing worktree mismatch; current `main` repairs it and `agent:check`/`handoff:check` pass. Residual drift remains: the parent PLAN progression lags STATE/W10, five central documents exceed 14,000 lines with current and historical truth interwoven, and decision IDs D-29 through D-34 are duplicated.
- **Problem, impact, root cause:** humans and agents can follow stale prose even when structured fields pass. Append-heavy memory and incomplete cross-document checks leave multiple apparent current authorities.
- **Recommended implementation:** retain history but add generated/indexed current views; make decision IDs unique with an alias/erratum record rather than rewriting evidence; reconcile the live programme PLAN through its owner; extend deterministic checks for milestone progression and cross-links where an unambiguous rule exists.
- **Constraints and compatibility:** do not mass-migrate legacy v1 tasks or relabel historical SHAs. `CURRENT_STATE` remains a snapshot, not Git authority. W10 owner controls active programme records.
- **Tests and validation:** fixtures for stale worktree references, duplicate fields/IDs, PLAN-vs-STATE progression, historical aliases, and terminal/live combinations; agent/project/handoff checks on clean and intentionally invalid fixtures.
- **Acceptance:** one discoverable current view agrees with active structured state; decision identities are unambiguous; live PLAN/STATE progression agrees; history remains immutable and readable.
- **Dependencies / risks / parallelization:** W10 coordination required. A continuity lane owns `.agent` and central docs. Risk is false rejection of historical prose; apply new strict rules only to explicitly versioned live schemas.

### NW-08 — Account for the complete test and package validation universe

- **Priority / category / confidence / status:** P1; release evidence; STRONGLY INDICATED by manifest inventory; NOT STARTED.
- **Affected surfaces:** quality-gate manifests/inventory, `package.json`, UI scripts, `.github/workflows/hardening.yml`, bin syntax checks, release receipts/docs.
- **Evidence:** at the fixed baseline, explicit semantic/synthetic/provenance manifests selected 208 unique ordinary test files while 321 tracked `.test.ts`/`.smoke.ts` files existed; 113 were outside that explicit union, including smoke and newer agent runtime/protocol/reviewer/control-center/proxy/safety areas. The workflow calls `gate:ci`; UI and bin checks are separate. Indirect execution must be measured before declaring individual tests wholly unrun.
- **Problem, impact, root cause:** release PASS does not mechanically classify the discovered test/package universe. Data-only group inventory validates declarations but does not compare them to all executable tests.
- **Recommended implementation:** build deterministic discovery and classification for root tests, UI tests/typecheck/build, bin syntax/lint, host-qualified tests, clean-clone checks, and explicit exclusions. Bind receipts to discovered inventory digest and executed/skipped/unavailable counts. Keep local, clean, host, and CI claims separate.
- **Constraints and compatibility:** do not blindly add host/external suites to offline CI. Every exclusion needs a reason and its own required evidence lane. Avoid duplicate execution unless it serves a documented independent claim.
- **Tests and validation:** add fixture repos for new/unclassified/deleted tests, duplicate selection, skips, zero-step groups, UI failure, and unavailable host capability. Compare actual runner collection where feasible. Run complete offline and UI lanes after classification.
- **Acceptance:** every discovered executable test/check belongs to exactly one required or explicitly excluded class; no green receipt can omit a new test silently; exact counts and inventory digest are recorded; CI workflow executes its stated classes.
- **Dependencies / risks / parallelization:** inventory can start early and closes after changed surfaces stabilize. One release lane owns manifests/workflow. Risk is excessive runtime; optimize grouping only after coverage is explicit.
- **Partial progress (2026-09-08, M2-M5):** ten previously unmanifested
  suites were registered in the required `SYNTHETIC_CAMPAIGN` lane as each
  finding closed, including `agentProtocol.test.ts` and `agentTools.test.ts`
  — the frozen trust boundary's own regressions, which the authoritative gate
  had never executed. Two further additions,
  `tests/unit/selfDevAdoptionSandbox.test.ts` and
  `tests/unit/privateArtifactAtomic.test.ts`, were **reverted**: they are
  already selected by the required `SEMANTIC_COMPATIBILITY` and
  `OWNER_PROVENANCE` lanes, and `bin/quality-gate-inventory.mjs` correctly
  reported them as `UNCLASSIFIED_DUPLICATE`, failing
  `tests/unit/phase23QualityGate.test.ts`. The gate's own no-duplicate
  invariant works. Current measurement at this head: the authoritative gate
  selects **218 unique test files** with zero duplicates, against **336**
  collected test files and **4,713** collected tests — so roughly 118 files
  remain outside the explicit union. That is the live denominator M10 must
  classify; the fixed-baseline 208/321 comparison remains the reproducible
  historical anchor.

### NW-09 — Expose review decisions through a deliberate shipped capability

- **Priority / category / confidence / status:** P2; operator workflow and authorization; CONFIRMED source behavior; **CLOSED** — repaired and regression-proven under `nightwatch-repository-hardening-implementation-v1` M9.
- **Affected surfaces:** `bin/nightwatch-control-center.mjs`, default collector, control-center server/auth contracts, UI capability rendering, owner docs/browser tests.
- **Evidence:** the shipped launcher constructs a default collector without `reviewAuthority` and a server without `reviewDecision`. POST is denied and UI controls are disabled. Existing browser tests inject authority directly, so they do not prove the shipped path.
- **Problem, impact, root cause:** a supported local capability exists as library injection but has no deliberate owner-facing activation path; implementation and product workflow diverged.
- **Recommended implementation:** keep read-only default. Add an explicit launcher flag/config plus owner-local preflight that creates one immutable authority and injects it into collector and server. Expose a truthful capability DTO. For uncertain POST outcomes, read back by review identity; never automatic retry.
- **Constraints and compatibility:** retain loopback, Host/Origin, CSRF/content-type, identity, stale/conflict, no-replace, and privacy guarantees. No remote review or shared connector.
- **Tests and validation:** shipped CLI E2E: default refusal, opt-in decision, restart/readback, duplicate/conflict, stale artifact, malformed body, uncertain response/readback, disabled capability UI, and keyboard submission.
- **Acceptance:** documented opt-in works end to end from the actual launcher; default remains read-only; server/UI capability state agrees; restart preserves immutable review identity; no duplicate write on retry ambiguity.
- **Dependencies / risks / parallelization:** depends on NW-02 path policy and stable server contracts. Dashboard-server lane may combine with NW-12; coordinate UI lane. Main risk is accidental write enablement, addressed by negative default tests.

- **Resolution evidence (2026-09-09):** revalidated in live source — the
  launcher called `createDefaultControlCenterCollector()` (the read-only half
  of the factory) and never passed `reviewDecision`, so the documented
  owner-local review workflow was unreachable from the shipped entry point.
  The measurement also found a second, sharper defect the review had not
  stated: the UI gated its decision controls on the per-finding
  `reviewIdentity`, which answers whether a review STORE exists, not whether
  THIS server serves the write route. A read-only server with a populated
  store therefore rendered working-looking controls whose POST it would
  refuse as not found, and nothing in the DTO let the UI know.
  Repair: `--enable-local-review` is the only way to obtain the write route.
  It runs an owner-local preflight — constructing the authority resolves the
  private review root through the shared private-artifact policy, which after
  NW-02/NW-03 refuses a root inside Nightwatch source, a sibling checkout or
  a linked worktree — then builds BOTH halves through
  `createControlCenterServices`, so the collector and the write handler
  cannot derive a different campaign identity for the same state. A preflight
  refusal fails the start rather than silently downgrading to a read-only
  server, and the launcher prints
  `NIGHTWATCH_CONTROL_CENTER_LOCAL_REVIEW ENABLED|DISABLED` so the operator
  is told which surface they got.
  `ControlCenterMetaDto.localReviewDecision` is the truthful capability, and
  the SERVER fills it from `options.reviewDecision === undefined` — the same
  expression that decides whether the route exists — overwriting any
  collector value. The two therefore cannot disagree, which is asserted in
  both directions. `readOnly: true` and `mutationAuthority: 'NONE'` are
  unchanged and still accurate: an owner-local review decision writes only to
  the owner's private store and confers no product, execution or
  organizational authority, and the DTO says so rather than overloading
  `readOnly`.
  Uncertain POST outcomes now read back by review identity and never retry:
  `readBackReviewDecision` reports RECORDED, NOT_RECORDED or UNKNOWN, and
  UNKNOWN is reported as unknown rather than upgraded to "not recorded",
  which would invite a second decision the store may already hold. An
  identity mismatch on read-back is UNKNOWN, not a match.
  The blanket `catch {}` that printed only `CONTROL_CENTER_START_FAILED` now
  echoes an allowlisted `CONTROL_CENTER_[A-Z_]+` code and nothing else, so an
  operator can tell a rejected UI root from an unavailable review store
  without a native message carrying a path.
  Six cases in `tests/unit/nw09ShippedReviewCapability.test.ts` SPAWN the real
  launcher: default read-only with POST 404/405 and meta DISABLED; the opt-in
  with the route answering a review result rather than "not found" and meta
  ENABLED; product/environment flags still refused; a bounded start reason
  with no path and no `Error` text; and both disagreement directions. No case
  writes a decision through the shipped process, because the shipped store is
  the operator's real one — write behaviour stays proven against an injected
  temporary store in `reviewerPersistence.test.ts`. 5 of the 6 fail against
  the pre-repair code; the sixth is the flag-refusal control.
  Four UI cases added: controls hidden when the server reports DISABLED even
  though the finding has an identity, failing closed when an older server
  omits the field, the uncertain-outcome read-back with exactly one POST, and
  UNKNOWN reported as unknown. One existing case was updated rather than
  weakened: a response claiming organizational authority is still refused,
  and now additionally reads back and reports that nothing was recorded. 5 of
  the UI cases fail against the pre-repair UI. UI suite 24 passed, UI
  typecheck and build PASS; server suites 68 passed.

### NW-10 — Implement bounded end-to-end dashboard pagination

- **Priority / category / confidence / status:** P2; completeness and usability; CONFIRMED source behavior; **CLOSED** — repaired and regression-proven under `nightwatch-repository-hardening-implementation-v1` M9.
- **Affected surfaces:** `ui/control-center/src/api.ts`, `App.tsx` views/state, server pagination contracts and browser tests.
- **Evidence:** server endpoints accept cursor or `afterSeq` and DTOs expose continuations, but UI loaders request only limits and do not consume cursors. Records beyond the first 20 runs, 50 findings/reviewer/source/coverage entries, or first 100 timeline entries are unreachable.
- **Problem, impact, root cause:** bounded server APIs were added without client continuation state, making larger valid local datasets incomplete to the operator.
- **Recommended implementation:** add per-view load-more or accessible paging with opaque cursor state, deduplication by stable identity, generation binding, reset on filters/snapshot generation, and explicit end/error/retry states. Keep server caps.
- **Constraints and compatibility:** do not fetch all pages eagerly or mix generations. Preserve bounded rendering and current first-page behavior.
- **Tests and validation:** multi-page fixtures for every cursor endpoint and timeline sequence; empty/duplicate/stale cursor, generation change, page error/retry, navigation reset, keyboard focus, and small viewport. Assert requests/cached items remain bounded.
- **Acceptance:** the UI reaches a record beyond each first-page boundary; ordering/deduplication is deterministic; generation changes cannot mix snapshots; controls are keyboard-operable with visible state.
- **Dependencies / risks / parallelization:** freeze server DTO/capability contracts after NW-09. One UI writer should own API and App changes. Risk is large accumulated DOM; cap retained pages or virtualize only if measurement requires it.

- **Resolution evidence (2026-09-09):** the review's diagnosis was
  incomplete, and acting on it as written would have made the surface worse.
  The finding said the server accepts a cursor and only the UI loaders ignore
  it. Measurement showed **nothing** consumed the cursor:
  `boundedCollection` always sliced from index 0, and the default collector
  dropped `query.cursor` entirely. The server validated the query parameter
  and then discarded it. So paging was cosmetic end to end — passing the
  cursor back returned page one — and adding client cursor state alone would
  have produced a "load more" that re-appended the first page forever, which
  identity deduplication would have rendered as a button that did nothing.
  The repair therefore starts at the bottom. `boundedCollection` now takes a
  cursor, slices `[offset, offset+limit)`, and reports `truncated` as "more
  remain AFTER this page", which is what a continuation needs; a cursor past
  the end yields an empty final page rather than restarting, and a malformed
  one falls back to the first page as defence in depth behind the server's own
  `CONTROL_CENTER_PATH_REJECTED`. All five list adapters accept and forward
  it, and the default collector passes `query.cursor` through.
  Two further defects surfaced while wiring it. The reviewer adapter's
  corpus-aware `nextCursor` fallback was built from the PAGE length, which
  equals the consumed count only on page one — so it re-emitted the same
  cursor on page two and paged forever in place; it is now measured from how
  far into the corpus the page reaches. And the reviewer AUTHORITY selects the
  page (`ordering.slice(0, limit)`), so a cursor that reached only the
  projection had nothing left to select from: the authority now takes the
  cursor and returns the `pageOffset` it used, and the projection refuses to
  slice a second time when handed a pre-selected page.
  Client side: every loader takes an opaque cursor screened against the shape
  the server accepts, and one `usePagedCollection` hook owns accumulation,
  deduplication by stable identity, generation-change reset, and explicit
  end/error states for all five bounded views — runs, findings, reviewer,
  campaign coverage and source surfaces. Deduplication is by identity rather
  than position because the cursor is a snapshot offset: a shifted list can
  legitimately resend an item, and rendering it twice would be a visible
  untruth. A failed CONTINUATION keeps the loaded pages and says so; only a
  failed FIRST page is a view-level error.
  Seven server cases in `tests/unit/nw10PaginationContinuation.test.ts` page a
  corpus to exhaustion through the pure adapters and then over real HTTP,
  asserting every record is reached exactly once and that paging terminates; 6
  of the 7 fail against the pre-repair stack. Four UI cases prove a record
  beyond the first page becomes reachable, an overlapping page is deduplicated
  to 3 records rather than 4, a failed continuation keeps what was loaded, and
  a single-page list offers no continuation control at all; all 4 fail against
  the pre-repair UI. No regression: 101 passed across the paging-adjacent
  server suites, UI 28 passed, UI typecheck and build PASS.

### NW-11 — Validate and cancel dashboard requests and coalesce refreshes

- **Priority / category / confidence / status:** P2; client reliability and resource bounds; CONFIRMED source behavior; NOT STARTED.
- **Affected surfaces:** UI API client, React effects, SSE refresh scheduling, error/status components and tests.
- **Evidence:** `fetchSnapshot` checks only a schema-version prefix then casts generic `T`; fetches have no signal/deadline. Effect cleanup suppresses state updates but leaves transport active. Each SSE event increments a shared refresh key and can refresh overview plus the current view without burst coalescing.
- **Problem, impact, root cause:** malformed DTOs cross the trust boundary, obsolete navigation retains work, hung requests lack termination, and bursts can amplify local load.
- **Recommended implementation:** exact per-endpoint runtime validators derived from shared contracts or bounded explicit schemas; compose navigation abort with a finite deadline; normalize safe errors; coalesce SSE invalidations by generation/view over a bounded window and allow at most one in-flight refresh plus one dirty follow-up.
- **Constraints and compatibility:** preserve unavailable/stale/error distinctions and accessibility announcements. Avoid a large new dependency unless code generation and bundle evidence justify it.
- **Tests and validation:** wrong schema/version/shape/size, hung fetch, caller abort, deadline, rapid navigation, unmount, late result, 1/100/1000-event bursts, reconnect, and valid controls. Assert abort signals and bounded request counts.
- **Acceptance:** unsupported DTOs never reach render logic; obsolete/hung work is aborted; timers/listeners are disposed; event bursts cause a documented bounded number of requests; UI reports actionable safe states.
- **Dependencies / risks / parallelization:** share one UI lane with NW-10 after contract freeze. Coordinate burst policy with NW-12. Risk is rejecting forward-compatible DTO additions; validate owned required fields and exact schema version intentionally.

### NW-12 — Bound SSE memory for slow or disconnected clients

- **Priority / category / confidence / status:** P2; server availability and resource lifecycle; CONFIRMED source behavior; **CLOSED** — repaired and regression-proven under `nightwatch-repository-hardening-implementation-v1` M8.
- **Affected surfaces:** `src/controlCenter/server/sse.ts`, connection lifecycle and server tests.
- **Evidence:** client count is capped, but the code ignores `response.write(false)`. A stalled consumer can accumulate queued bytes until disconnect or process pressure.
- **Problem, impact, root cause:** connection count is bounded while per-connection output memory is not; the implementation treats a writable stream as fire-and-forget.
- **Recommended implementation:** choose an explicit per-client policy: retain only the newest invalidation while backpressured, or close the client after a bounded queue/time threshold. Track drain/close/error and remove listeners/timers deterministically. Invalidation events need not be lossless because clients refetch snapshots.
- **Constraints and compatibility:** preserve loopback and event schema; never let one slow client block healthy clients.
- **Tests and validation:** fake writable streams returning false, delayed/no drain, close/error races, rapid events, client-cap interaction, and healthy peers. Assert bounded bytes/events/listeners and deterministic termination/coalescing.
- **Acceptance:** per-client queued state has a fixed bound; stalled clients coalesce or disconnect within policy; healthy delivery continues; cleanup leaves no registry/listener entry.
- **Dependencies / risks / parallelization:** dashboard-server lane with NW-09; coordinate invalidation semantics with NW-11. Risk is frequent reconnect for slow clients; document and test the chosen behavior.

- **Resolution evidence (2026-09-08):** quantified against the pre-repair hub
  through a case that uses ONLY the pre-existing public surface —
  `subscribe`, `publish`, and the socket's own byte count. With one stalled
  fake writable and 201 published events, the old hub handed it **38,216
  bytes**; the repaired hub hands it **228** and nothing further. That
  separation is the finding.
  The policy is chosen and documented rather than left implicit, in three
  parts. (1) Invalidation events need not be lossless — clients refetch a
  snapshot when notified, so N pending notifications and one pending
  notification produce the same refetch. While a client is backpressured the
  hub therefore retains exactly the NEWEST frame, so per-client queued state
  is one frame by construction. (2) Heartbeats are never queued while
  backpressured: they carry no information and would displace the newest real
  invalidation. (3) A client that never drains is disconnected, on whichever
  of two independent bounds trips first — `MAX_COALESCED_FRAMES` (32) replaced
  frames or `MAX_STALL_MS` (30 s) backpressured — because a slow client
  reconnects and refetches while a permanently stalled one must not be
  carried forever.
  Lifecycle is deterministic: the `drain` listener is attached ONCE per
  client rather than per write (attaching per write is how a listener leak
  starts), removal detaches every listener, removal is idempotent so the
  request and response both emitting `close` cannot double-count, and
  `disconnectCounts()` reports why clients were dropped as counters only —
  `WRITE_FAILED`, `COALESCE_LIMIT`, `STALL_TIMEOUT`, `HUB_CLOSED`.
  Eleven cases in `tests/unit/nw12SseBackpressure.test.ts`, all driving fake
  writables so "never drains" is exact, with time injected so nothing sleeps:
  the API-free byte bound, newest-only retention with an exact coalesced
  count, newest-frame delivery on drain, disconnection at each of the two
  bounds, heartbeats neither queued nor exempt from the stall bound, a
  healthy peer receiving all 12 frames while a stalled peer holds one, a
  throwing write, hub close, double-`close` idempotence, and the client cap
  with normal resumption after drain. Ten of the eleven also fail against the
  old hub, but only the API-free case fails for the RIGHT reason — the others
  assert `clientDiagnostics()` and `disconnectCounts()`, which did not exist
  before the repair. That distinction is recorded rather than presented as
  ten independent measurements. `controlCenterServer`, `c10AcceptanceSuite`
  and `phase23QualityGate`: 85 passed.

### NW-13 — Remove sensitive input from parser diagnostics

- **Priority / category / confidence / status:** P1; privacy and diagnostics; CONFIRMED by execution; **CLOSED** — repaired and regression-proven under `nightwatch-repository-hardening-implementation-v1` M5.
- **Affected surfaces:** `src/browser/fixtures/storageState.ts` and analogous credential/private-store JSON parsers and CLI error rendering.
- **Evidence:** the storage-state JSON catch includes the native parser message. On Node 22.22.1, malformed synthetic input caused the thrown error to contain a prefix of the planted secret text.
- **Problem, impact, root cause:** runtime parser diagnostics may echo credential-bearing content into terminal logs or artifacts. Wrapping `err.message` assumes native messages are content-free.
- **Recommended implementation:** convert parse/schema failures at sensitive boundaries to categorical, content-free codes with safe path class or digest only where needed. Retain detailed native causes only in memory if they cannot cross logs, or discard them.
- **Constraints and compatibility:** do not hide whether failure is missing, oversized, unsafe path, malformed JSON, or schema-invalid. Never include raw bytes, tokens, cookies, or excerpts.
- **Tests and validation:** planted fake secrets in malformed JSON at beginning/middle/end, invalid UTF-8 handling where applicable, schema errors, nested thrown causes, CLI stderr, logs, and generated artifacts. Search all outputs for planted values and substrings.
- **Acceptance:** no planted secret or content excerpt appears in any returned error, stderr, log, receipt, or artifact; operators still receive a stable category and remediation.
- **Dependencies / risks / parallelization:** align with NW-02/NW-04 private-state primitives. Can be a focused subtask after error taxonomy freezes. Risk is loss of debugging context; record safe byte length/hash only if policy permits and utility is proven.

- **Resolution evidence (2026-09-08):** revalidated and refined. The review
  described "a prefix of the planted secret text"; measurement on Node 22.22.1
  shows the leak is a **window** of roughly twenty characters centred on the
  offending token, so the excerpt can be a prefix, a middle fragment or a
  suffix depending on where the malformation sits:
  `Unexpected token 'o', ..."_ABCDEF": oops}" is not valid JSON`. The
  invariant is therefore "no fragment", not "no prefix", and the regression
  searches for the longest substring of the planted value of length six or
  more across the message, the stack, the `cause` chain and every own
  property of the thrown object.
  The sweep also found that two of the three key-inspection helpers called
  `JSON.parse` with **no catch at all**, so the raw `SyntaxError` propagated
  with its window intact — a more direct leak than the wrapped site the
  review named. Both are measured: pre-repair, `validateStorageStateFile`
  leaked `"_MARKER"` and `inspectStorageStateKeyPresence` leaked content too.
  Repair: `src/core/policy/sensitiveDiagnostics.ts` is the shared taxonomy.
  `sensitiveDiagnostic` renders only allowlisted parts — a failure class from
  a closed vocabulary, an errno **code** (never its message), a byte count,
  and a coarse path class plus twelve-hex path digest — and has deliberately
  **no free-text parameter**, so a caller cannot pass content through it by
  mistake. The three inspection helpers share one content-free reader. The
  five distinctions the operator needs (missing, unreadable, oversized,
  unsafe path, malformed JSON, schema-invalid) are preserved, because
  collapsing them would trade a privacy bug for a diagnosability bug; the
  existing `/not valid JSON/` assertion in `tests/unit/storageState.test.ts`
  still matches. Analogous sites converted: `src/core/environment/index.ts`
  (config read and parse), and errno-only wrapping in
  `src/core/policy/privateArtifacts.ts` and
  `src/core/selfDevSandbox/sandboxMirror.ts`.
  `src/core/reviewStore/store.ts` was inspected and needed no change: it
  reads through `PrivateArtifactStore.readJson`, which already throws the
  content-free `PRIVATE_ARTIFACT_CORRUPT`, and its other wrapped messages are
  Nightwatch-generated codes.
  Five cases in `tests/unit/nw13SensitiveDiagnostics.test.ts`; 2 fail against
  the pre-repair code and the 3 that pass are the taxonomy and category
  controls. 52 passed across the storage-state, environment, auth-capture and
  private-store suites.

### NW-14 — Reconcile dependencies, portability, and release documentation

- **Priority / category / confidence / status:** P2; maintainability and release qualification; MIXED, current audit required; NOT STARTED.
- **Affected surfaces:** root/UI manifests and lockfiles, fixture dependencies, bin validation, platform qualification, README/current-state/roadmap/architecture/decisions.
- **Evidence:** install emits known Vue 2.6.12 deprecation warning; repository history documents it as a development fixture with an earlier low advisory. Root TypeScript excludes UI and bin JavaScript. Central documents are large and mix historical/current material. No current online advisory scan was run by this review.
- **Problem, impact, root cause:** dependency and platform claims can outlive their evidence; separate packages/tools can escape a root-only check; historical documentation obscures the current supported path.
- **Recommended implementation:** perform a read-only current advisory and reachability assessment when network policy allows; replace or isolate the Vue fixture only with equivalent parser/readiness coverage; add explicit UI/bin lanes under NW-08; document Node/OS/Bubblewrap/Chrome capability matrices and split current operational guidance from indexed archives.
- **Constraints and compatibility:** do not upgrade blindly or claim fixed advisories from version numbers alone. Preserve deterministic fixtures and lockfile reproducibility. Do not rewrite historical receipts.
- **Tests and validation:** clean offline installs, dependency reachability report, lockfile diff review, root/UI typecheck/tests/build, bin syntax/lint, supported-host qualification, documentation link/schema checks.
- **Acceptance:** every retained advisory has scope/reachability/owner rationale and review date; supported packages/tools have explicit gates; install/host requirements and historical-vs-current docs are unambiguous.
- **Dependencies / risks / parallelization:** close with NW-08 after feature fixes stabilize. Dependency migration may be isolated if lockfile ownership is exclusive. Risks include fixture semantic drift and non-reproducible toolchain changes.

### NW-15 — Complete W10 reproduction-surface coverage and autonomous-yield proof

- **Priority / category / confidence / status:** P1 programme outcome; autonomous efficacy; CURRENT MEASURED EVIDENCE, IN PROGRESS under `nightwatch-reproduction-surface-coverage-autonomous-yield-v1`.
- **Affected surfaces:** W10 reproduction-surface contracts/census/selection, investigation memory/runtime/checkpoints, fixed corpus, owner-local proofs, campaign evidence and programme records.
- **Evidence:** W9 ended with seven of seven reproduction attempts `NOT_AVAILABLE`. W10 M0 established that 1,120 of 4,109 eligible files and 152 distinct targets were already executable, but repository-major truncation hid them. Current integrated selection moves the live 32-entry window from 1 to 8 repositories and 0 to 5 distinct executable targets. The fixed 59-case, seven-attempt benchmark improves `NOT_AVAILABLE` from 1.0000 to 0.7143 and executable selection from 0 to 0.2857. Broader Go/non-Go executor classes were measured NO-GO. The reconciled W10 head now carries capability across investigation boundaries. Its Run B reached all eight repositories and five executable packages but attempted no reproduction, so its zero `NOT_AVAILABLE` outcomes are not a success-rate proof. Capability-aware Run C and terminal W10 closure remain active-owner work.
- **Problem, impact, root cause:** capability existed but was invisible before a verification turn; selection structurally guaranteed wasted attempts. Remaining proof must show persisted capability-aware behavior and long-run resilience without manufacturing findings.
- **Recommended implementation:** finish the already-specified W10 task. Preserve W9 executor, evidence, retry, byte, and checkpoint compatibility; persist bounded neutral readiness; complete mechanically distinct real local proofs and multiple substantial provider campaigns only under existing authorization; report unavailable categories and denominators exactly.
- **Constraints and compatibility:** W10 owner has exclusive authority. This plan does not dispatch or modify it. No network install, arbitrary package scripts, sibling writes, DEV/NEXT/production, or weakened admission. A newly found bug is not completion criteria.
- **Tests and validation:** W10 contract/census/memory/benchmark/resilience suites; pre-W9/pre-W10 checkpoint resume; real owner-local toolchain proofs in disposable trees; exact ledger reconciliation; sibling integrity; substantial authorized local campaigns; full/clean certification.
- **Acceptance:** all W10 milestones and continuity fields close truthfully; selection improvement is source-current and denominator-honest; no safety regression; live results separate attempts, executable outcomes, unavailable reasons, candidates, and admissions.
- **Dependencies / risks / parallelization:** remain with the active W10 lane. Integrate applicable protocol/persistence fixes before final long runs through owner coordination. Provider quota/auth may block empirical campaigns and must be recorded as external unavailable, never converted into PASS.

## 5. Target architecture and desired end state

Keep deterministic authority beneath the reasoner. Model output must match closed vocabularies through own-key membership and exhaustive dispatch; recommendations cannot mint proof, tools, authorization, or terminal reasons. Semantic expectations remain source-bound. UNKNOWN, NOT_AVAILABLE, stale state, bounded termination, and partial coverage remain visible.

Use one topology-aware private-path policy for all real stores and secret-path validators. Use narrow test seams that production CLIs cannot select accidentally. Reuse filesystem primitives only when semantics match: immutable reviews retain no-replace identity, while mutable checkpoints receive explicit generation and atomic replacement. Readers bound size before allocation and reject unsafe file identity.

Give every asynchronous operation one owner for deadline, cancellation, cleanup, and terminal diagnostics. Preserve no-retry review decisions; ambiguous POST outcomes use identity readback. Bound SSE bytes and client refresh activity as well as connection count. Prefer operation-count assertions over flaky wall-clock thresholds.

The dashboard exposes bounded pages, explicit stale/error/unavailable states, and only capabilities enabled by the server. Keyboard access, focus, status announcements, and retry behavior are workflow acceptance criteria. Loopback, Host/Origin, CSP, privacy, and source authority remain unchanged.

Release readiness combines independent source/compile, behavioral, browser, filesystem/process-host, clean-checkout, and CI evidence. Local/clean certification and exact-SHA executed CI remain separate claims. The target is production-quality private local software, not production-environment deployment.

## 6. Dependency-ordered implementation roadmap

| Phase | Tasks and measurable outcome | Dependencies and gates |
| --- | --- | --- |
| 0 — Establish execution truth | NW-06; reconcile NW-07 live routing/PLAN through current owners; create full NW-08 discovered-test inventory. | Legal owned worktree, workspace PASS, current Git evidence. Never retire another session. |
| 1 — Close trust and private-path defects | NW-01, NW-02, NW-03, NW-13. Invalid enums have no effects; all private writes are confined; parser output is content-free. | Freeze shared path/error contracts first. Focused adversarial tests green. |
| 2 — Make autonomous state recoverable | NW-04. Atomic generations, bounded reads, explicit same-ID semantics, old checkpoint compatibility. | NW-02/NW-03 primitives; crash matrix green. |
| 3 — Bound resource lifecycles | NW-05 and NW-12. End-to-end abort and per-client SSE bound. | Trust primitives integrated; synthetic cleanup/pressure proofs green. |
| 4 — Complete operator workflow | NW-09, NW-10, NW-11. Shipped opt-in review, all pages reachable, validated/cancelled/coalesced requests. | Server capability/DTO contracts frozen; browser workflow green. |
| 5 — Complete measured autonomy | NW-15 via its existing W10 owner. Preserve compatibility and close live/local evidence honestly. | Applicable Phase 1–3 fixes integrated before final long runs; provider availability remains external. |
| 6 — Consolidate release truth | Finish NW-08 and NW-14; reconcile NW-07 current views. Every test/tool/package classified and docs current. | Changed surfaces stable; complete offline/UI/host lanes as applicable. |
| 7 — Certify one checkpoint | Execute the definition of done; record residual P2/P3 and external unavailable evidence. | P0/P1 closed or explicitly outside permanent scope; clean commit and exact evidence. |

### Parallel ownership and integration

Use no more than available C-00 capacity. Each writer gets one owned session/branch/worktree. This document recommends lanes but does not itself authorize delegation.

- Protocol lane: NW-01 validation and regressions.
- Private-state lane: freeze shared path/publication/error contracts, then NW-02–NW-04 and NW-13. Subdivide consumers only after non-overlapping ownership is explicit.
- API lifecycle lane: NW-05.
- Dashboard server lane: NW-09 and NW-12. UI lane: NW-10 and NW-11 after contracts freeze; one owner for the overlapping UI API/App surfaces.
- Release/continuity lane: NW-06–NW-08 and NW-14, with active programme-owner agreement for `.agent` files.
- W10 lane remains separately owned. Consume its results; do not duplicate its runtime/memory work.

Integrate shared filesystem and HTTP contracts first, then independent protocol/API/server repairs. UI and certification follow integrated contracts. Remote compare-and-swap serializes integration. A rejected push requires reconciliation, never force. Preserve historical artifact and schema identities through explicit readers/migrations.

## 7. Repository-level definition of done

1. Every finding has evidence satisfying its acceptance criteria. No unresolved P0/P1 remains in local release scope. A deferred P2/P3 names impact, reason, owner decision, and revisit condition.
2. `session:status`, `workspace:check`, `agent:check`, `handoff:check`, `project:check`, `hardening:check`, and `git diff --check` pass at the candidate checkpoint. Task state, deletions, and SHA roles agree.
3. Root typecheck, UI typecheck/tests/build, complete classified offline regression, and browser workflow pass. Every discovered test is executed or explicitly excluded with a separate evidence requirement. Skipped, unavailable, and zero-step never mean PASS.
4. Prototype-name/coercion probes fail before effects; valid persisted protocol inputs remain compatible.
5. Every private store/auth path rejects canonical, sibling, linked-worktree, traversal, and unsafe-symlink targets. Synthetic sentinels remain unchanged. Sensitive input never appears in diagnostics or artifacts.
6. Crash injection yields the complete prior or new checkpoint generation. Same-ID writers cannot silently clobber. Oversized/corrupt state is bounded, preserved, and reported honestly.
7. Timeout/cancel/disconnect leaves no active owned fetch/read/process after cleanup grace. One deadline covers auth, redirects, and bodies. Slow SSE clients have a fixed queued-state bound.
8. The shipped launcher proves read-only default plus opt-in review, restart/readback, stale/conflict handling, and uncertain-outcome readback. Paging reaches beyond every first-page boundary without mixed generations.
9. Unsupported DTOs become safe errors; hung/obsolete requests abort; notification bursts have bounded refresh counts. Primary flows pass keyboard, focus, announcement, retry, and supported-viewport checks without overclaiming formal conformance.
10. Performance evidence names workload, host/runtime, operations, latency, and peak memory. Existing 1k/5k/10k correctness guards remain; new thresholds correspond to measured pressure.
11. Clean-checkout reproducibility, host qualification, and exact-checkpoint CI are reported independently. An external CI block is neither test failure nor pass.
12. W10 results remain source-current and denominator-honest, separating historical/current, EXACT/non-EXACT, unavailable/executable, candidate/admission, and known/unknown defects.
13. Supported commands, private-state locations, capabilities, recovery, and validation lanes are documented. Git contains no raw findings, auth state, credentials, customer data, or transient machine paths.
14. Validated work is committed in its owned session, integrated only by fast-forward compare-and-swap, verified against `origin/main`, and left clean with terminal continuity. Completion grants no DEV/NEXT/production/publication authority.

### External, host, and manual evidence boundaries

- Subscribed-provider quota or owner authentication can block W10 empirical campaigns. Deterministic implementation and offline proof should continue; the live lane remains UNAVAILABLE until the owner capability is present.
- Linux/Bubblewrap, system Chrome, IPv6, proxy teardown, and parent-death behavior require qualified supported-host execution. Other hosts must report unsupported capability rather than inherit a Linux pass.
- Exact-checkpoint GitHub Actions depends on the external CI service. Record its run ID and executed SHA when available; do not project execution from a local workflow parse.
- A current public dependency advisory assessment needs permitted network access and a reachability review. The existing fixture exception remains historical evidence until then.
- Keyboard, focus, announcements, responsive layout, and owner workflow need browser automation plus a bounded manual usability/accessibility check. This establishes the documented workflow, not formal third-party accessibility certification.
- DEV/NEXT/production, cloud/data-store work, external filing, and organizational release approval remain separately gated or permanently out of scope. They are not blockers to the private-local definition of done.

## 8. Instructions for future implementation agents

1. Read this plan, `AGENTS.md`, `.agent/ACTIVE_TASK.md`, and the owning task SPEC/PLAN/STATE before editing.
2. Discover Git/worktree/session truth. Stop writes on workspace FAIL. Never delete or alter another session to create capacity.
3. Revalidate the finding narrowly against current code and W10 outcomes. Record contradictions using current runtime/tests over this plan.
4. Open an explicitly authorized task with frozen intent, owned paths, deletion declarations, continuity v2, and a concrete first milestone. This plan grants no implementation or external authority.
5. Execute dependency and priority order. Preserve valid behavior, historical identities, safety boundaries, and old-reader compatibility unless the task specifies a bounded migration.
6. Add focused behavioral regressions with fake inputs. Do not use credentials, private findings, sibling writes, arbitrary scripts, or environment contact in offline tests.
7. Validate each milestone, repair failures in scope, record exact counts/receipts and update STATE before changing subproblem. Never weaken a gate to produce green output.
8. Agree on shared contracts and non-overlapping ownership before parallel work. Reconcile remote advances; never force-push, stash another lane, or overwrite its files.
9. Update the finding status when acceptance is proven or current evidence invalidates it. Preserve the original rationale and resolution evidence.
10. Treat UNKNOWN, skipped, unavailable, stale, bounded, partial, and zero-step literally. Do not close tasks through labels alone.
11. Escalate newly discovered P0/P1 defects and reorder dependencies. Keep unrelated infrastructure/data/product expansion outside scope.
12. Complete repository-wide certification, privacy/diff review, continuity, commit, integration verification, and cleanup before declaring the implementation programme complete.
