# Audit — Control Center UI completion

Audited live at `11c9ea62405c5b9b0eddd011fb7083da83348ee7`, with the canonical
checkout and `origin/main` equal and the tree clean at the start of the audit.
Every number below was measured here, not copied from a predecessor record.

## What is already true, and is not re-opened

`nightwatch-residual-closure-and-lane-qualification-v1` is terminal COMPLETE.
R-01 through R-07 are CLOSED and are not reopened by this change. The three
lanes it left `UNAVAILABLE_CAPABILITY` by authority, and the
`BLOCKED_EXTERNAL` CI state, are unchanged here: this change requires no
network egress, no owner harness and no live app.

Re-verified independently at the starting SHA:

- `npm run typecheck` PASS.
- `npm run hardening:check` PASS.
- `ui/control-center`: `typecheck` PASS, `vitest run` 41 passed across 2
  files, `build` PASS at 301,078 bytes.
- Browser workflow lane 4 passed / 0 failed from the canonical checkout.

## The measured gap

All nine views in `VIEW_DEFINITIONS` are reachable and each has a render
branch, so `PlaceholderView` is unreachable. The UI is not missing screens.
What it is missing is the evidence it already holds.

### Client-side truncation presented as completeness

`GraphCanvas` computed `graph.nodes.slice(0, 24)` and `graph.edges.slice(0,
48)` on a fixed three-column grid. The execution-graph adapter bounds its
projection with `CONTROL_CENTER_LIMITS`: `defaultGraphNodes` 250,
`maxGraphNodes` 1000, `defaultGraphEdges` 500, `maxGraphEdges` 2000. The
footer then read `{graph.edges.length} edges` and, when `truncated` was
false, the pill read `Complete`.

`truncated` is the server's answer about the server's bound. It has never
spoken for a slice the client applied afterwards. An edge whose endpoints fell
outside the first 24 nodes was dropped with no disclosure at all.

This is the same defect C-15b corrected on the source graph. Its own comment
in `App.tsx` names `nodes.slice(0, 24)` and `edges.slice(0, 48)` as the thing
it removed; the sibling view kept both calls.

### Contracts fetched in full, rendered in part

Measured by comparing each `readonly` field of every `export interface` in
`ui/control-center/src/types.ts` against `App.tsx`:

- `RunDetailSnapshot` — `repositories`, `countsByEventType`,
  `countsBySeverity`, `screenshotCount`, `hardFailureCodes`, `noteCodes`:
  fetched on every run inspection, rendered nowhere.
- `RunListItemSnapshot` — `browser`, `endedAt`, `hardFailureCount`.
- `TimelineSnapshot` — `truncated` and `nextAfterSeq`. The request is a single
  `limit=100` page with no continuation, so a cut timeline was
  indistinguishable from a short run.
- `SafetySnapshot` — `checks`, `blockedOperationClasses`, `authMode`. The
  Safety Center's own hero reads "Unknown checks stay visible as unknown",
  and no check was rendered anywhere; `checks.length` appeared in one Overview
  metric card. A count cannot say which check is unknown.
- `ReadinessSnapshot` — `applies`, `sourceContracts.approvedTargets`,
  `targetsWithActiveFamily`, `currentnessCounts`, `staleTargets`,
  `unavailableTargets`, `campaign.comparedKeys`, `campaign.driftKeys`,
  `analyzer.pinnedVersion`, `analyzer.observedVersion`,
  `analyzer.versionConsistent`, `verification.deferredDimensions`,
  `verification.notMeasuredDimensions`, `verification.allDeferredToHardening`,
  `unresolvedBlockers[].detailCode`, `externalCiClassification`,
  `ownerScope.frozenOperationCount`, `ownerScope.matchesFrozenMarkers`.
- `MetaSnapshot` — `authorizationClass`, `externalNetwork`, `findingsStorage`,
  `ownerScopeStatus`, `ownerScopeReason`, `features`. `meta` was fetched for
  one boolean, `localReviewDecision`, and otherwise discarded.
- `HealthSnapshot` — `productReadiness`.
- `SourceSummarySnapshot` — `capabilities`, `inventoryDigest`,
  `proofChain.phase24Excluded`, `stageStatusCounts`, `proofFamilies` and all
  nine of its fields.
- `SourceSurfaceSnapshot` — `sourceSha`, `evidenceDigest`, `handlerState`,
  `runtimeBinding`, `projectionCapability`, `replayCapability`,
  `differentialCapability`, `exclusionReasons`.
- `SourceSurfacesSnapshot` — `repositoryFilter`.
- `SystemMapSnapshot` — `layout.projectionVersion`.
- Reviewer values — `ReviewerRelationshipValue.counterevidence`,
  `ReviewerDuplicateSuggestion.basis`,
  `ReviewerDefectClassValue.sharedInvariant`,
  `ReviewerLocalReviewValue.transitionCount` and `notEquivalentTo`.

In a repository whose stated position is that absence of evidence is not
evidence of absence, an unrendered field is the worst available outcome: the
operator cannot distinguish a field that reported nothing from a field that
was never drawn.

### Markup and state with no stylesheet rule

Comparing every `className` literal in `App.tsx` against every class selector
in `styles.css`: `graph-controls`, `graph-search`, `graph-filter`,
`graph-zoom`, `graph-node-dimmed`, `graph-node-selected`, `graph-edge-dimmed`,
`graph-node-neutral` and `empty-state` are rendered and unstyled.

C-15b's source-graph toolbar therefore shipped as unstyled browser controls on
a dark panel, and its search box and evidence filter recomputed `dimmed` on
every node on every keystroke and changed no pixel. Two further classes,
`orbit-ring-outer` and `safety-grid`, are dangling modifiers with no rule and
no effect.

`typecheck`, the 41-test component suite and the browser workflow lane were
green throughout. None of them compares a contract to a render, or a class to
a stylesheet.

## Why no existing check caught any of this

- `hardening:check` asserts offline structural invariants over repository
  source; it does not read the UI package.
- `ui/control-center` `typecheck` proves the fields exist on the type. Reading
  a field is not required to typecheck, and neither is styling a class.
- `App.test.tsx` asserts what the views do render. A test suite cannot fail
  for an assertion nobody wrote.
- `controlCenterBrowser.browser.ts` qualifies that every navigable view loads
  without a page error and that no external request is made. A view that
  renders half its snapshot satisfies both.

The gap is a missing comparison, not a missing test.
