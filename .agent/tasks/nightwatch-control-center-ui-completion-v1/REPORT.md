# REPORT — nightwatch-control-center-ui-completion-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Task ID: nightwatch-control-center-ui-completion-v1
Status: COMPLETE

Evidence ledger for this campaign. It records what was actually run and
observed, not what was intended. Receipts are written as they are produced.

## Campaign identity

- Task: `nightwatch-control-center-ui-completion-v1`
- Session branch: `session/nightwatch-control-center-ui-com-9a04214f`
- Session identity: `sess-da205e1a1006`
- Starting SHA: `11c9ea62405c5b9b0eddd011fb7083da83348ee7`
- Scope: U-01 through U-06 as registered in the OpenSpec `audit.md`.

## M0 — execution truth

`npm run session:status` verdict PASS. All seven workspace invariants PASS:
`WORKSPACE_INDEX_FLAGS`, `WORKSPACE_EXCLUDE_POLICY`, `WORKSPACE_HOOKS_POLICY`,
`WORKSPACE_WORKTREE_METADATA`, `WORKSPACE_CANONICAL_PROTECTION`,
`WORKSPACE_DECLARED_DELETIONS`, `WORKSPACE_INTEGRATION_READINESS`.

The predecessor `nightwatch-residual-closure-and-lane-qualification-v1` was
re-verified terminal COMPLETE and is untouched.

One correction was required to reach that verdict. The work was first
implemented in the canonical checkout, which `agent:check` refused with
`WORKSPACE_CANONICAL_DIRTY_WHILE_SESSION_LIVE` and
`STALE_IMPLEMENTATION_BASELINE`. The diff was transferred into this owned
session with `git apply --index`, byte-compared against the canonical working
tree (`diff` of both `git diff HEAD` outputs reported no difference), and only
then was the canonical checkout restored path-by-path to clean. No path outside
this campaign's own files was restored, and the stale
`nightwatch-repository-hardening--e7b9be89` session belonging to another owner
was not touched.

## M1 — U-01, the execution graph draws what the server sent

`GraphCanvas` computed `graph.nodes.slice(0, 24)` and `graph.edges.slice(0,
48)` against adapter bounds of 250/500 default and 1000/2000 maximum, then
printed `Complete` from the server's `truncated` field.

Both slices are removed. `layerAssignment` was generalized from
`SourceGraphSnapshot` to a structural `LayoutGraph` and is now shared by both
canvases. The canvas has pan, zoom, search, an eight-value execution-state
filter and selection. The footer reads `N nodes drawn · M match` and
`E of R edges drawn · zoom Zx`. Server truncation is quoted with its bound.
Edges whose endpoints are outside the projection are counted and named.

Adversarial verification: reintroducing `.slice(0, 24)` on the ordered node
list failed exactly the two tests that assert population and edge disclosure —
`draws every execution-graph node the server sent, past the old 24/48 cut` and
`discloses execution-graph truncation and edges pointing outside the
projection` — and both passed again on restore. The third new test covers the
search, filter and selection the old canvas did not have at all.

## M2 — U-02, run surfaces

Run detail now renders `repositories` (with dirty-tree state and file count),
`countsByEventType`, `countsBySeverity`, `screenshotCount`, `browser`,
`endedAt`, `hardFailureCount`, `hardFailureCodes` and `noteCodes`. The timeline
renders `truncated` and `nextAfterSeq`. The run list row carries `browser` and
`hardFailureCount`.

Empty cases are stated rather than omitted: absent provenance renders "Without
it, this run anchors to no revision", and an absent census renders "Empty does
not imply pass".

## M3 — U-03, the Safety Center lists its checks

`safety.checks` is rendered as a table of check code, state and reason code;
`blockedOperationClasses` as refused-operation chips; `authMode` and
`networkPosture` as rows. A new service-authority panel renders
`meta.authorizationClass`, `externalNetwork`, `findingsStorage`,
`ownerScopeStatus`, `ownerScopeReason`, `localReviewDecision`, the sorted
`features` map and `health.productReadiness`.

An empty check set renders "An empty check set is an absence of evidence, never
a pass", asserted by its own test.

## M4 — U-04, readiness shows its measurements

A readiness-detail panel renders `applies`, `approvedTargets`,
`targetsWithActiveFamily`, `currentnessCounts`, `staleTargets`,
`unavailableTargets`, `comparedKeys`, `driftKeys`, `pinnedVersion`,
`observedVersion`, `versionConsistent`, `blocked`, `deferredDimensions`,
`notMeasuredDimensions`, `allDeferredToHardening`, every unresolved blocker
with its `detailCode`, `externalCiClassification`, `frozenOperationCount` and
`matchesFrozenMarkers`.

Deferred and never-measured dimensions are separate lists. A pinned version
that differs from the observed version renders as `Inconsistent`, asserted by
test.

## M5 — U-02, remaining surfaces

Source surfaces gained `runtimeBinding`, `handlerState`, the three capability
states, `sourceSha`, `evidenceDigest` and `exclusionReasons`. The proof-chain
panel gained `phase24Excluded`, the three digest-presence rows,
`stageStatusCounts` and the full `proofFamilies` portfolio ordered by rank.
The summary gained a capability rollup and inventory-digest presence, and the
surface page header names its `repositoryFilter`. Reviewer cells gained
`counterevidence`, duplicate `basis`, `sharedInvariant`, `transitionCount` and
`notEquivalentTo`. The system-map provenance footer gained
`layout.projectionVersion`.

## M6 — U-05, every rendered class has a rule

Added: `.graph-controls`, `.graph-search`, `.graph-filter`, `.graph-zoom` and
their inputs and buttons; `.graph-node-dimmed`, `.graph-node-selected`,
`.graph-node-neutral`, `.graph-edge-dimmed`; `.empty-state`; `.code-chip-row`,
`.code-chip-label`, `.code-chip` and its four tones; `.census-columns`,
`.census-heading`; `.row-note-warning`; `.panel-full`.

Removed: the `orbit-ring-outer` and `safety-grid` modifier classes, which had
no rule and no effect. Their base classes did all the work, and inventing a
rule for either would have changed the design to satisfy a checker.

## M7 — U-06, mechanical guards

`ui/control-center/src/styles.test.ts` — three assertions: the class extraction
is non-vacuous, every rendered class has a rule, and every concrete value an
interpolated family can produce is named. On its first run it failed on real
content, reporting `orbit-ring-outer` and `safety-grid`; both were then removed.
Verified adversarially by renaming `.graph-node-selected` in the stylesheet,
which failed the interpolated-family assertion.

`ui/control-center/src/contractCoverage.test.ts` — three assertions: the field
extraction is non-vacuous, every contract field appears in `App.tsx` or in the
exempt set, and no exempt entry names a field the contracts no longer declare.
The exempt set has three entries, each with its reason: `schemaVersion`
(validated by the API layer, which refuses a mismatched response),
`afterSeq` (the request cursor the shell itself sent) and `advisoryOnly` (a
`true` literal rendered as prose).

Both checks state in their own headers that they are name-level over `App.tsx`
and do not prove placement.

Registration: `config/validation-universe.v1.json` UI_LANE gained both files
and `inventoryDigest` advanced from `sha256:b20bde104a58e1e4ed5c128a` to
`sha256:e6ad9456574d63403ba96436`. Two intermediate failures are recorded
because they are instructive: `VALIDATION_UNIVERSE_DECLARED_MISSING_FILE` for
each suite while untracked, then `VALIDATION_UNIVERSE_DIGEST_DRIFT`.

## Validation receipts

| Command | Result | Notes |
|---|---|---|
| `npm --prefix ui/control-center run typecheck` | PASS | no diagnostics |
| `npm --prefix ui/control-center run test` | PASS | 55 passed / 4 files, from 41 / 2 |
| `npm --prefix ui/control-center run build` | PASS | 3 files, 321,234 bytes, no external references |
| `npm run typecheck` | PASS | no diagnostics |
| `node bin/hardening-check.mjs` | PASS | offline structural invariants hold |
| `npm run control-center:ui:browser` | PASS | 4 passed / 0 failed |
| `npm run session:status` | PASS | verdict PASS, seven invariants PASS |
| `npm run campaign:synthetic` | PASS | 1797/1797, `deepContainmentLane` PROVEN |
| `npm run gate:local` | PASS | all eleven groups at `fa5bef0`, receipt `receipt:sha256:8f5e1452a0a909c6721ce272` |

Intermediate failures, recorded rather than smoothed over:

- root `typecheck` failed once on `TS2304: Cannot find name 'getComputedStyle'`
  in the browser test. The root program deliberately excludes the DOM lib, so
  the global is named through a local structural type instead of widening the
  program.
- the browser lane failed once on a Playwright strict-mode violation:
  `getByText('REPOSITORY PROVENANCE')` matched two elements. Resolved with
  `.first()`.

## Safety events

NONE. No product contact, no network egress, no execution or mutation
authority, no publication. No route, adapter, contract field, server bound or
sanitizer was changed. Every field newly rendered was already sanitized and
already sent.

## Residual work, with owner decisions

- A placement-level coverage check is deferred; both new checks are name-level
  and say so.
- The source graph still skips endpoint-less edges silently. The execution
  graph now discloses them. Left asymmetric to keep this diff to the registered
  findings.

## Honest limits

- The two coverage checks prove a name reaches `App.tsx`. They do not prove the
  field renders in the right view, or that a stylesheet rule is visually
  correct.
- The browser lane's computed-style assertion covers one class,
  `.graph-controls`. It proves that rules apply in the built bundle; it does
  not prove every rule does.
- `gate:local` PASS is a LOCAL receipt from this host. External CI remains
  `BLOCKED_EXTERNAL` under the predecessor's classification and is not claimed
  green here.
- Under the owner's completion directive, the certified checkpoint
  `70113ef7f5fb73a48a61f2bf171bf553ed795270` was integrated by fast-forward to
  `origin/main` and verified; a fresh `gate:local` at that checkpoint
  re-passed all eleven groups with receipt
  `receipt:sha256:25e3ad1c24e108328675b48e`.

## M8 — certification

`gate:local` was run from this owned session at the committed implementation
checkpoint, twice, and both results are recorded.

At `9b30e27` it returned `TEST_FAILURE`: eight groups PASS —
`GATE_DEFINITION`, `STATIC`, `HARDENING`, `HANDOFF_TRUTH`, `PROJECT_TRUTH`,
`AGENT_CONTINUITY`, `SEMANTIC_COMPATIBILITY`, `OWNER_PROVENANCE` — with
`SYNTHETIC_CAMPAIGN` failing and `PATCH_INTEGRITY` and `WORKSPACE_INTEGRITY`
therefore `NOT_RUN`. Receipt `receipt:sha256:2c3f7290f0a9e5c67ba1fa4a`.

Running `campaign:synthetic` directly isolated it: 1796 of 1797 passed with
`deepContainmentLane` PROVEN, and one failure at
`tests/unit/nw07ContinuityCoherence.test.ts:80`. That test reads whichever
task `ACTIVE_TASK.md` points at — this one, as of the registration — and
requires that every milestone STATE reports COMPLETE has a `### M<n>` section
in PLAN carrying a `- **Status:** COMPLETE` line. This task's records used
their own format, so the extraction matched nothing and the test's own
anti-vacuity assertion fired rather than iterating an empty set and passing.
Both records were rewritten into the predecessor campaign's shape at
`fa5bef0`, and `campaign:synthetic` then reported 1797 of 1797.

At `fa5bef0` `gate:local` returned `PASS` with all eleven groups PASS and
receipt `receipt:sha256:8f5e1452a0a909c6721ce272`.

The failure is recorded because it is instructive in both directions: the
sandbox lane was never implicated, and the guard that caught it was an
anti-vacuity assertion of exactly the kind M7 added to this campaign's own two
new checks.

## Integration

PERFORMED. A fresh `gate:local` at the certified tip `70113ef` passed all
eleven required groups with receipt `receipt:sha256:25e3ad1c24e108328675b48e`.
Under the owner's completion directive, the certified checkpoint
`70113ef7f5fb73a48a61f2bf171bf553ed795270` was then integrated from
`session/nightwatch-control-center-ui-com-9a04214f` by fast-forward push to
`origin/main`, and `HEAD == origin/main` was verified at that SHA
(`SESSION_INTEGRATED`). No force and no history rewrite.
