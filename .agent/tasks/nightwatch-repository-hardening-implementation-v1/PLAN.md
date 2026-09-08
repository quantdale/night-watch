# nightwatch-repository-hardening-implementation-v1 — Execution Plan

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

`docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md` closed as a canonical review
whose execution had not started. It registers fourteen open findings across
the protocol trust boundary, private filesystem authority, autonomous state
durability, network lifecycle, the operator dashboard, and release evidence.

After this task, Nightwatch's reasoner-facing vocabularies reject inherited
and coerced values before they take effect; every private write is confined
by one topology-aware authority regardless of checkout location; autonomous
campaign state survives crashes and competing writers; owned asynchronous
work actually stops at its deadline; the dashboard exposes all of its bounded
data and only its enabled capabilities; and a release receipt names every
test and host capability it actually exercised.

## Starting State

- Task ID: `nightwatch-repository-hardening-implementation-v1`
- Starting SHA: `0ac7b3d037b5059f670eca715fc30adaf58e7334` (`origin/main` at open)
- Session branch: `session/nightwatch-repository-hardening--e7b9be89`
- Review baseline in the plan: `1942ea37757bbb914de6281f505ee6118b5c67f0`;
  reconciled source baseline `ed4e32602170e7e181b6e4841677fa8bff39d4ea`.
  Both are historical anchors, not live authority.

Established facts that must not be rediscovered:

- `nightwatch-autonomous-bug-hunting-programme-v1` W0-W10 are complete and
  certified. NW-15 is closed by that programme; W10's implementation anchor is
  `62d23e2622ab0a282584c5cf27d92b6b603f9192` and its certified documentation
  head is `ec3eacf61c1b5bd3557eaf90594aecb2cd633b4f`.
- The W10 census measured 4,109 eligible source files, 1,120 `EXECUTABLE_NOW`
  and 152 distinct executable targets; broader Go and non-Go executor classes
  were measured NO-GO. Do not revisit those decisions here.
- C-00 topology at open: canonical checkout on `main`, one live session for
  the bug-hunting programme, one stale W10 session pending owner release, and
  this session. Four of the eight permitted worktrees.
- `bin/workspace-integrity.mjs` owns worktree classification and the
  `maxWorktrees: 8` bound from `config/workspace-integrity.v1.json`;
  `bin/nightwatch-session.mjs` is the only surface that mutates worktree,
  branch or ownership state.
- The C-00 adversarial matrix in `tests/unit/workspaceIsolation.test.ts`
  already builds disposable synthetic repositories; new session tests extend
  it rather than inventing a second harness.

## Scope

The fourteen findings NW-01 through NW-14 as specified in the master plan's
findings register, their focused regressions, their acceptance evidence, their
status updates in that document, and the repository-level definition of done
at one candidate checkpoint.

Shared contracts this task may freeze: private-path authority, publication
and atomic-replace primitives, sensitive-diagnostic error taxonomy, relay
deadline taxonomy, control-center capability and pagination DTOs, and the
validation-universe inventory schema.

## Non-Goals

- Reopening W0-W10 or any of their runtime, memory or executor decisions.
- New product features, new languages, new executor classes, new campaign
  phases, or unrelated refactoring of healthy code.
- DEV / NEXT / production, cloud, datastore or infrastructure work.
- Strict `EXACT_REDISCOVERY` proof, previously-unknown-defect yield, or
  parent-programme completion claims.
- Mass migration of legacy v1 task records or rewriting historical receipts.
- Formal third-party accessibility certification.

## Safety Constraints

The SPEC's hard safety boundaries govern. Operationally:

- one writing agent, one worktree, one session identity; this task writes only
  in `session/nightwatch-repository-hardening--e7b9be89`;
- sibling repositories and other sessions are read-only; never retire, prune,
  adopt or edit another session, and never create capacity by removing one;
- no force push, no rebase or amend of another session's commits, no
  `git stash`, no broad `clean`/`restore`/`reset` outside owned paths;
- every adversarial test uses fabricated inputs in a disposable temporary
  directory and asserts that sentinels outside the authorized root are
  byte-identical afterwards;
- no credential, private finding, customer datum, or machine-specific
  absolute path enters Git;
- a gate is never weakened, and a test is never deleted or skipped, to
  produce green output. Declared deletions go in SPEC first.

## Architecture / Approach

Four principles, applied in dependency order:

1. **Membership before effect.** Closed vocabularies are checked by own-key
   membership and exhaustive dispatch, so an inherited or coerced value is
   rejected before it can reach a terminal state, a dossier or a tool lookup.
2. **One authority per decision.** Private-path containment, publication
   atomicity, and operation deadlines each get a single owner that consumers
   inject rather than re-derive from module location or per-attempt timers.
3. **Bound before allocate.** Readers cap size and verify file identity
   before reading; writers stage to an owner-only same-directory temporary and
   replace atomically under verified identity, cleaning owned temporaries in
   `finally`.
4. **Truthful surface.** Capability, staleness, page continuation,
   unavailability and exclusion are represented explicitly. Absent, skipped,
   unavailable and zero-step never render as PASS.

Shared contracts freeze before their consumers change, and integration order
follows the roadmap: trust and path primitives, then persistence, then
lifecycles, then the operator surface, then release accounting.

## Milestones

### M0 — Establish execution truth

- **Objective:** a live baseline and a revalidation order, so no repair is
  built on review-time prose.
- **Files / areas:** `.agent/tasks/nightwatch-repository-hardening-implementation-v1/*`,
  `.agent/ACTIVE_TASK.md`, `docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md`.
- **Actions:** discover live `HEAD`/`origin/main`, worktree and session
  truth; open this task with frozen intent and owned paths; route
  `ACTIVE_TASK.md` to it; record the W10 outcome this campaign consumes.
- **Acceptance:** `session:status` PASS in this owned session; `agent:check`
  and `handoff:check` PASS with the new routing; the task's four documents
  exist and agree.
- **Validation:** `npm run session:status`, `npm run workspace:check`,
  `npm run agent:check`, `npm run handoff:check`.
- **Status:** IN_PROGRESS

### M1 — NW-06 prospective worktree admission and bounded rollback

- **Objective:** an over-capacity `start` fails before mutation, and any
  post-mutation failure returns to the exact prior topology or reports a
  bounded owner-action state.
- **Files / areas:** `bin/nightwatch-session.mjs`, `bin/workspace-integrity.mjs`
  admission helper, `tests/unit/workspaceIsolation.test.ts`, C-00 docs.
- **Actions:** evaluate the candidate registration against the same canonical
  integrity model before `worktree add`; after creation verify claim and
  metadata, and on an owned partial failure remove only the just-created
  session and branch after identity/SHA/path proof; report both the original
  failure and the rollback outcome.
- **Acceptance:** at the limit, no ninth registration is created and no
  existing session changes; injected failures after branch, worktree and
  record creation each restore the prior topology or report a bounded state;
  `session:status` remains PASS.
- **Validation:** the C-00 matrix suite plus new NW-06 cases at 0, 7 and 8
  worktrees; `npm run workspace:check`.
- **Status:** COMPLETE — nine cases added, 8 of 9 fail against the pre-repair
  code, all 48 cases in the C-00 file pass after it. The bound cases use a
  policy-lowered `maxWorktrees` so the shipped rule is exercised without
  creating eight worktrees.

### M2 — NW-01 closed reasoner-facing vocabularies

- **Objective:** inherited or coerced protocol values have no effects.
- **Files / areas:** `src/core/agentProtocol/validate.ts`,
  `src/core/agentProtocol/tools.ts`, `src/core/autonomousFinding/dossier.ts`,
  their callers and focused tests.
- **Actions:** replace prototype-bearing membership maps and truthy lookups
  with own-key membership and exhaustive dispatch; remove default branches
  that reinterpret unknown discriminants.
- **Acceptance:** `constructor`, `__proto__`, `toString` and coercible values
  are rejected for intent, termination reason, severity, environment and
  confidence; `lookupAgentTool` returns no inherited function; valid persisted
  protocol inputs still load.
- **Validation:** focused protocol/dossier suites plus the prototype probe
  matrix; `npm run typecheck`.
- **Status:** COMPLETE — one closure primitive
  (`src/core/agentProtocol/closedVocabulary.ts`) owns membership and lookup;
  5 of the 7 new cases fail against the pre-repair code and the 2 that pass
  are the compatibility controls.

### M3 — NW-02 topology-independent private-path policy

- **Objective:** one fail-closed authority decides private-path containment
  identically from any supported checkout location.
- **Files / areas:** `src/core/policy/privateArtifacts.ts`,
  `src/core/prodEvidence/productionFindingsStore.ts`, auth/storage-state
  validators.
- **Actions:** define the canonical root, sibling `REPOSITORIES` root,
  registered linked worktrees and permitted owner-state roots as injected
  configuration resolved from `DEFAULT_SIBLING_ROOT` or an explicit
  `NIGHTWATCH_REPOS_ROOT`; resolve configured paths with no-follow
  containment before creation; require explicit test injection instead of
  `__dirname` authority.
- **Acceptance:** the canonical / linked-worktree / relocated-clone /
  explicit-root / ambiguous-root / symlinked-ancestor matrix yields identical
  decisions; valid owner state still works; no machine-specific path is
  written into Git.
- **Validation:** the new topology matrix suite; `npm run hardening:check`.
- **Status:** COMPLETE — `src/core/policy/sourceTopology.ts` is the single
  authority, both consumers inject it, their duplicated `isInside` helpers are
  deleted, and a call-form hardening rule locks both surfaces. The
  consumer-level case fails against the pre-repair code.

### M4 — NW-03 Bug Atlas confinement and safe publication

- **Objective:** every Atlas output lands inside the authorized root, and an
  interruption yields a complete prior or new snapshot.
- **Files / areas:** `src/core/bugAtlas/snapshot.ts` and its callers/tests.
- **Actions:** accept only a strict basename, join then prove containment,
  publish through an owner-only same-directory temporary with no-follow
  no-clobber or explicit versioned atomic replace, revalidate parent and leaf
  identity at the publication boundary, and clean owned temporaries on
  failure.
- **Acceptance:** traversal, absolute-path, separator, dot-segment, ancestor-
  and leaf-symlink variants fail before mutation; sentinels outside the state
  root stay byte-identical; no residue after controlled failures.
- **Validation:** the Atlas publication suite with injectable failure points.
- **Status:** COMPLETE — strict basename, proven containment on the NW-02
  authority, temporary-plus-rename publication, and inode-level atomicity
  measurement. 5 of the 8 cases fail against the pre-repair code.

### M5 — NW-13 content-free parser diagnostics

- **Objective:** no sensitive input content reaches any diagnostic surface.
- **Files / areas:** `src/browser/fixtures/storageState.ts` and analogous
  credential/private-store JSON parsers and CLI error rendering.
- **Actions:** convert parse and schema failures at sensitive boundaries into
  categorical content-free codes, retaining distinctions between missing,
  oversized, unsafe-path, malformed-JSON and schema-invalid; drop native
  causes that could cross a log.
- **Acceptance:** planted fake secrets at the beginning, middle and end of
  malformed input appear in no returned error, stderr, log, receipt or
  artifact, while the operator still receives a stable category.
- **Validation:** the planted-secret search suite over all captured outputs.
- **Status:** COMPLETE — one allowlist-only diagnostic taxonomy with no
  free-text parameter; the leak is a window rather than a prefix, so the
  regression searches for any fragment across message, stack, cause and own
  properties. 2 of the 5 cases fail against the pre-repair code.

### M6 — NW-04 bounded crash-safe autonomous checkpoints

- **Objective:** recovery observes either the complete previous or the
  complete next generation, and same-ID writers cannot silently clobber.
- **Files / areas:** `src/core/agentRuntime/localCampaign.ts`, checkpoint
  adapters, recovery CLI and tests.
- **Actions:** define generation and same-ID writer semantics; cap file size
  before allocation; stage canonical bytes to an owner-only same-directory
  temporary, sync where supported, replace atomically under verified
  identity, then publish generation metadata; preserve corrupt evidence and
  fail categorically.
- **Acceptance:** crash injection before write, mid-write and before/after
  rename each recovers a complete generation; simultaneous same-ID writers
  are detected; oversized, truncated and malformed state is bounded and
  reported without content; pre-W9, W9 and W10 checkpoints still resume.
- **Validation:** the crash matrix plus W9/W10 checkpoint compatibility
  suites and byte-budget reconciliation.
- **Status:** NOT_STARTED

### M7 — NW-05 one abortable Phase-5 relay deadline

- **Objective:** a single monotonic deadline covers auth, connection,
  redirects and body, and every terminal path aborts owned work.
- **Files / areas:** `src/api/phase5/relay.ts`, auth-header acquisition,
  redirect and body handling, relay tests.
- **Actions:** create one deadline and `AbortController` at the operation
  boundary and thread the remaining budget and signal through every stage;
  abort and cancel bodies on timeout or caller cancellation; await bounded
  cleanup and normalize diagnostics; freeze the timeout-versus-network
  taxonomy first.
- **Acceptance:** hung auth, connection, headers, body, redirect and caller
  abort all terminate with disposed timers and no active owned work after the
  cleanup grace; redirect count and total time stay bounded; error categories
  contain no secrets; writes are never retried.
- **Validation:** the relay lifecycle suite over synthetic loopback and fake
  transports, asserting signals and call counts rather than wall clocks.
- **Status:** NOT_STARTED

### M8 — NW-12 bounded per-client SSE state

- **Objective:** a stalled client has a fixed queued-state bound and cannot
  degrade healthy peers.
- **Files / areas:** `src/controlCenter/server/sse.ts`, connection lifecycle
  and server tests.
- **Actions:** honour `response.write` backpressure with an explicit policy —
  retain only the newest invalidation while backpressured, or close the client
  after a bounded queue or time threshold — and track drain, close and error
  with deterministic listener and timer removal.
- **Acceptance:** fake writables that never drain produce bounded bytes,
  events and listeners; stalled clients coalesce or disconnect within policy;
  healthy peers keep receiving; cleanup leaves no registry entry.
- **Validation:** the SSE backpressure suite with fake writable streams.
- **Status:** NOT_STARTED

### M9 — NW-09 / NW-10 / NW-11 operator dashboard workflow

- **Objective:** the shipped launcher offers a documented opt-in review
  capability, every bounded page is reachable, and client requests are
  validated, cancellable and coalesced.
- **Files / areas:** `bin/nightwatch-control-center.mjs`, control-center
  server/auth/capability contracts, `ui/control-center/src/api.ts`,
  `ui/control-center/src/App.tsx`, browser tests.
- **Actions:** freeze the capability and pagination DTOs; add the launcher
  opt-in with owner-local preflight and one immutable authority injected into
  collector and server; add cursor state with identity deduplication and
  generation binding per view; add exact per-endpoint validators, composed
  navigation abort with a finite deadline, and bounded SSE-invalidation
  coalescing.
- **Acceptance:** default stays read-only and opt-in works end to end from
  the actual launcher with restart readback and no duplicate write on
  ambiguity; the UI reaches a record beyond every first-page boundary without
  mixing generations; unsupported DTOs never reach render logic; a 1000-event
  burst causes a documented bounded number of requests; primary flows pass
  keyboard, focus, announcement and retry checks.
- **Validation:** control-center server suites, UI tests, UI typecheck and
  build, and the shipped-CLI browser workflow.
- **Status:** NOT_STARTED

### M10 — NW-08 complete classified validation universe

- **Objective:** every discovered executable test or check belongs to exactly
  one required or explicitly excluded class.
- **Files / areas:** quality-gate manifests and inventory, `package.json`,
  UI scripts, `.github/workflows/hardening.yml`, bin syntax checks, release
  receipts and docs.
- **Actions:** build deterministic discovery and classification for root
  tests, UI test/typecheck/build, bin syntax and lint, host-qualified tests,
  clean-clone checks and explicit exclusions; measure indirect execution
  before declaring a test unrun; bind receipts to an inventory digest with
  executed, skipped and unavailable counts; keep local, clean, host and CI
  claims separate.
- **Acceptance:** no green receipt can omit a newly added test; every
  exclusion carries a reason and its own evidence lane; exact counts and the
  inventory digest are recorded; the CI workflow executes its stated classes.
- **Validation:** fixture repositories for new, unclassified and deleted
  tests, duplicate selection, skips, zero-step groups, UI failure and
  unavailable host capability; then the complete offline and UI lanes.
- **Status:** NOT_STARTED

### M11 — NW-14 dependency, portability and release documentation truth

- **Objective:** dependency and platform claims carry current evidence, and
  the supported current path is unambiguous.
- **Files / areas:** root and UI manifests and lockfiles, fixture
  dependencies, bin validation, platform qualification, `README.md`,
  `docs/CURRENT_STATE.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`,
  `docs/DECISIONS.md`.
- **Actions:** assess advisories and reachability read-only where network
  policy allows; replace or isolate the Vue 2.6.12 fixture only with
  equivalent parser/readiness coverage; document the Node/OS/Bubblewrap/Chrome
  capability matrix; separate current operational guidance from indexed
  archives.
- **Acceptance:** each retained advisory records scope, reachability, owner
  rationale and review date; supported packages and tools have explicit
  gates; install and host requirements are unambiguous; lockfile
  reproducibility is preserved.
- **Validation:** clean offline install, lockfile diff review, root and UI
  typecheck/tests/build, bin syntax and lint, documentation link and schema
  checks.
- **Status:** NOT_STARTED

### M12 — NW-07 residual continuity and project-memory coherence

- **Objective:** one discoverable current view agrees with active structured
  state, and decision identities are unambiguous.
- **Files / areas:** `.agent/ACTIVE_TASK.md`, programme and child
  PLAN/STATE/REPORT, `docs/CURRENT_STATE.md`, `docs/DECISIONS.md`,
  `docs/ROADMAP.md`, continuity checkers.
- **Actions:** add generated indexed current views while retaining history;
  make decision IDs unique through an alias or erratum record rather than
  rewriting evidence — D-29 through D-34 are duplicated; reconcile the
  programme PLAN progression with its owner; extend deterministic checks for
  milestone progression and cross-links only where an unambiguous rule exists
  and only against explicitly versioned live schemas.
- **Acceptance:** agent, project and handoff checks pass on clean fixtures
  and reject intentionally invalid ones; live PLAN and STATE progression
  agree; history stays immutable and readable; legacy v1 records are not
  mass-migrated.
- **Validation:** continuity fixture suites plus `npm run agent:check`,
  `npm run handoff:check`, `npm run project:check`.
- **Status:** NOT_STARTED

### M13 — Repository certification at one candidate checkpoint

- **Objective:** the repository-level definition of done, item by item, with
  honest unavailable lanes.
- **Actions:** run the full certification set at the integrated head; record
  exact counts and receipts; record residual P2/P3 with impact, reason, owner
  decision and revisit condition; close continuity and the findings register.
- **Acceptance:** every definition-of-done item is satisfied or explicitly
  reported unavailable with its own evidence requirement; no unresolved
  P0/P1 remains in local release scope.
- **Validation:** `npm run typecheck`, `npm run hardening:check`,
  `npm run agent:check`, `npm run handoff:check`, `npm run project:check`,
  `npm run workspace:check`, `npm run session:check`, `npm test`,
  `npm run gate:local`, a fresh Node 20 `npm run gate:clean`, UI lanes, and
  `git diff --check`.
- **Status:** NOT_STARTED

## Validation Strategy

Each milestone begins with a probe that reproduces the finding's evidence
against live code and ends with a focused regression that fails before the
repair and passes after it. Assertions prefer operation counts, error codes
and byte identity over wall-clock thresholds.

After every milestone: run its own suite, then the suites of the surfaces it
touched, record exact results in `STATE.md`, and only then advance. After any
reconciliation with `origin/main`, rerun the affected suites — a pre-reconcile
pass never certifies post-reconcile code.

Certification at M13 is independent: the orchestrating session reruns the full
set at the integrated head rather than trusting per-milestone summaries.

## Decision Log

- 2026-09-08 — Open this campaign as its own task rather than a wave of
  `nightwatch-autonomous-bug-hunting-programme-v1`. Reason: the programme's
  authorization class is autonomous bug hunting and its records freeze
  W0-W10, while these findings are repository-wide hardening across
  protocol, filesystem, network, dashboard and release surfaces. Evidence:
  the programme's `ACTIVE_TASK` next action holds at W10 and directs a
  successor wave into its own task directory. Consequence: `ACTIVE_TASK.md`
  routes to this task; the programme record stays terminal and untouched.
- 2026-09-08 — Consume NW-15 rather than execute it. Reason: W10 closed and
  certified under its own owner. Evidence: `ACTIVE_TASK` child status
  COMPLETE at implementation `62d23e26` and documentation `ec3eacf6`.
  Consequence: NW-15 is recorded CLOSED-BY-OWNER in the findings register and
  is out of this task's scope.
- 2026-09-08 — Follow the master plan's dependency order rather than
  priority order alone. Reason: NW-03, NW-04 and NW-09 all consume the NW-02
  path authority, and NW-10/NW-11 consume frozen NW-09 DTOs. Consequence: the
  milestone order is M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9 → M10 → M11
  → M12 → M13, and shared contracts freeze before consumers change.

## Discoveries

- NW-06 confirmed in live source before implementation: `commandStart`
  (`bin/nightwatch-session.mjs`) calls `inspectWorkspace` on the *current*
  topology, and `checkWorktreeMetadata` (`bin/workspace-integrity.mjs:437`)
  compares `worktrees.length > maxWorktrees` for worktrees that already
  exist. The candidate registration is never modelled, so at the bound the
  precheck passes and `git worktree add` creates the over-limit registration.
  The same function then returns on a failed record write with the worktree
  and branch already created and no rollback.

## Deferred Work

- Strict `EXACT_REDISCOVERY`, previously-unknown-defect yield, and
  parent-programme completion remain separate and unproven.
- DEV / NEXT / production, cloud and datastore work remain out of scope.
- Multi-language reproduction executor classes stay NO-GO per the W10 census.
- Release of the stale W10 session worktree is an owner decision; this task
  does not touch another session.

## Completion Criteria

The SPEC's completion criteria, in full. In short: every in-scope finding
CLOSED with acceptance evidence or explicitly DEFERRED with an owner
decision; no unresolved P0/P1 in local release scope; the repository-level
definition of done satisfied or honestly reported unavailable at one
integrated candidate checkpoint; and the work integrated by verified
fast-forward from this owned session.
