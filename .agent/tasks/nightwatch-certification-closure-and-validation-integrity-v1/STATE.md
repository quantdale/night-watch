# Task State

## Identity

Task ID: nightwatch-certification-closure-and-validation-integrity-v1
Phase: CERTIFICATION_CLOSURE_AND_VALIDATION_INTEGRITY_V1
Status: COMPLETE
Starting SHA: 521210f706b9383e20dd08d1bfd2f3c47b34687d
Branch: main
Last validated implementation SHA: a7a0853c627ef6773e9bd2f5ffa7f12042cde23a
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 521210f706b9383e20dd08d1bfd2f3c47b34687d
LAST_VALIDATED_IMPLEMENTATION_SHA: a7a0853c627ef6773e9bd2f5ffa7f12042cde23a
LAST_SUBSTANTIVE_CHECKPOINT_SHA: a7a0853c627ef6773e9bd2f5ffa7f12042cde23a
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_CERTIFICATION_CLOSURE_AND_VALIDATION_INTEGRITY_V1_STATUS: COMPLETE

## Objective

Remove the blockers and validation blind spots left after G16.9 and the
Control Center design-system campaign, then certify truthfully. Full intent in
`SPEC.md`; execution order in `PLAN.md`.

## Current Milestone

COMPLETE — all seven milestones are closed and the work is integrated.

Milestone ID: M7 — certification
Milestone status: COMPLETE
What is being attempted: nothing further. The work is integrated at
`789bddeb` with `HEAD == origin/main` verified.

## Completed Milestones

- **M1 COMPLETE_LOCAL — session `--dry-run` contract.** Root cause: `--dry-run`
  is a single global boolean (`parseArgs`, default at `:544`, set at `:559`)
  that exactly ONE command read — `commandIntegrate` at `:422`. `start`,
  `claim`, `release`, `reconcile` and `remove` all mutate and silently ignored
  it; `release` did not even receive `options` (the dispatcher called
  `commandRelease(context)`). `integrate` honoured it only AFTER a fetch that
  writes the remote-tracking refs, so even the one supported case was not a
  zero-mutation dry run.

  Fix: a declared `DRY_RUN_SUPPORT` table covering every dispatchable command,
  enforced at dispatch. The five mutating commands gained true zero-mutation
  plan reports; `integrate`'s guard moved ABOVE the fetch; `status`/`check`
  now REFUSE the flag (`SESSION_DRY_RUN_NOT_APPLICABLE`, exit 2) rather than
  accepting it as a silent no-op. `start` returns at the last instruction
  boundary that has mutated nothing — after every refusal and after the whole
  plan is computed, before `fs.mkdirSync`.

  Two real defects found while proving it:
  1. An explicit `--base` was never verified, so a dry run answered "this
     start could proceed" for a base that would make the real start fail at
     `git worktree add` — after creating the parent directory. Now
     `SESSION_BASE_INVALID` fails closed before the first mutation.
  2. `withoutComments()` in `bin/lib/hardening/kernel.mjs` strips block
     comments BEFORE line comments, so a `//` comment containing `/*` opens a
     phantom block comment that DELETES real code from the view every
     `read()`-based rule sees. Three C-00 rules failed loudly on my own
     comments containing `refs/remotes/**`. The dangerous direction is the
     silent one: a fail-if-present rule goes vacuous over the deleted span.
     Recorded here and carried into milestone C for repair with a probe.

  Proof: `tests/unit/workspaceIsolation.test.ts` gained NW-07, 13 cases, each
  asserting a full topology snapshot (worktree list, every ref, branch tips,
  HEAD, symref, status, index, the shared `worktrees/` tree, `info/exclude`,
  `hooks`, and the target path) byte-identical across the dry run. Cases cover
  clean admission, at-capacity refusal, invalid base, occupied path, invalid
  and valid fault-injection tokens, unsafe workspace, repetition, capacity
  non-consumption, the full mutating lifecycle, read-only refusal, help-text
  truth, and contract totality over `COMMANDS`. Negative probe: reintroducing
  the defect fails 5 of the 13, including the capacity case that is the exact
  recorded failure mode. 67/67 in the file pass; `typecheck`, `typecheck:bin`
  and `hardening:check` PASS. No session artefact leaked: the tests run against
  disposable fixtures under the test's own temporary directory.

- **M2 COMPLETE_LOCAL — `hardening:rules` is gate-authoritative.** The campaign
  was dead code: a declared npm script no gate group, lane, validation-universe
  class or CI workflow selected. It was also already RED — HC-015 UNDETECTED —
  and nothing noticed, which is the whole blind spot in one line.

  HC-015 rotted structurally, not by neglect.
  `checkActiveMilestoneProgression` resolves its subject INDIRECTLY through
  `.agent/ACTIVE_TASK.md` -> `Task directory:` -> that task's `STATE.md`; the
  probe named a fixed task directory. When the active task changed, the probe
  began mutating a file the rule no longer opens and reported UNDETECTED while
  the rule worked perfectly. Probes may now write `<ACTIVE_TASK_DIR>`, which
  the campaign resolves exactly as the rule does, so probe and rule cannot
  disagree about what is under test; an unresolvable placeholder THROWS rather
  than falling back to a literal path and probing the wrong file.

  The gate gained a required `HARDENING_PROBES` group between `HARDENING` and
  `HANDOFF_TRUTH`: 11 required groups became 12, wired through the command-key
  union, the offline spec validator, the runtime dispatch and the rule that
  asserts the required-group list. Vacuity is now explicit — a campaign that
  selects no rule, or executes no probe, reports `VACUOUS_CAMPAIGN` and exits
  non-zero instead of being inferred from a zero rule count.

  Proof: `tests/unit/hardeningProbeCampaign.test.ts` (9 cases) runs the REAL
  campaign against a disposable repository holding a synthetic two-rule engine,
  so an undetected probe, an unproven rule, both vacuity modes, a probe error,
  created-file debris and the placeholder resolution are each exercised for
  real. `tests/unit/phase23QualityGate.test.ts` gained 7 cases including
  command-mapping TOTALITY over the shipped runner. Recorded probes HC-090 and
  HC-091 prove the gate cannot LOSE the group or DOWNGRADE it to optional
  without `hardening:check` going red — both DETECTED.

  `hardening:rules` now: `rules=83 probes=92 detected=92 undetected=0
  restored=81 statusUnchanged=true`, exit 0. Gate definition digest at this
  checkpoint: `sha256:c85f42c58db95b81865b011600086eb6db854886ca652dd57d572a7475ad101e`.

- **M3 COMPLETE_LOCAL — G16.5 rule-quantifier audit.** All 83 rules classified
  and mechanically verified: 60 TOTALITY, 23 EXISTENCE, 21 carrying a recorded
  `firstMatch` singleton justification. The full table is generated from the
  live registry into the change's `audit.md`. The two-value vocabulary is the
  minimum that describes the live set; UNIQUENESS/EXACTLY_ONE, CARDINALITY and
  ABSENCE were each considered and rejected with a reason rather than added for
  symmetry.

  Four TOTALITY rules abandoned their own scan: `fail(...); return;` inside the
  subject loop reported the FIRST failing subject and then skipped the
  remaining subjects AND every assertion below the loop
  (`checkAlphausHandoffBoundary`, `checkFindingFrontierBoundary`,
  `checkC15bSystemMapBoundary`, `checkC02bProtobufBoundary`). Each still passed
  its own probe, because one mutation produces one detected failure — which is
  exactly how the shape survived. The first two reached the abandon path for
  real, their cone lists coming from `gitFiles().filter(...)`, which returns an
  empty array without throwing; the other two read through
  `readIncludingComments`, which catches ENOENT itself, so their `catch`
  branches were dead. All four now `continue`.

  The class is closed permanently: `checkRuleEngineSoundness` fails a TOTALITY
  rule that returns immediately after failing inside a loop, naming the loop
  line and the return line. Nesting is computed by INDENTATION, not brace
  matching — the blanked view still contains strings and regex literals, and
  the first brace-matching form false-positived on a `return` in a top-level
  try/catch.

  The `withoutComments()` defect carried from milestone M1 is repaired: it
  stripped block comments with a regex BEFORE line comments, so a `//` comment
  containing a block-comment opener deleted real code up to the next closer
  from the view every `read()`-based rule sees. 27 tracked files contain such a
  comment. Both code views now share one `commentMask` scanner, and the
  property is asserted behaviourally rather than by inspecting the
  implementation's shape.

  Proof: `tests/unit/hardeningRuleQuantifiers.test.ts`, 6 cases running the
  REAL rules against disposable repositories with deliberately absent cones,
  including the exact G16.5 case — occurrence 1 valid, occurrences 2 and 3
  invalid, both reported. Negative-probed: restoring the early exit fails the
  multi-failure case. New probes HC-092 and HC-093, each verified to raise its
  OWN error code rather than merely a non-zero exit.

- **M4 COMPLETE_LOCAL — `ripple-api` re-derivation and re-admission.** The
  admitted snapshot moves from `27bb007a` to
  `4e3e200db3bda7b58bc250feb7f76997d95ae2cc`, 31 commits later, on evidence.

  This was a fresh derivation, not a SHA rebinding. All four recipes were
  derived through `deriveRealSourceExpectations` at BOTH snapshots and
  compared: 4 derived / 0 failures at each, identical invariant definitions,
  and IDENTICAL `ev:sha256` evidence digests — the digest binds the normalized
  source structure used to derive, so equality is a statement about the source,
  not about the label. The old snapshot came from a disposable `git archive`
  extraction whose four recipe source files were verified byte-for-byte against
  the sibling's old tree. Independently, `ExchangeRate.php`, `Account.php` and
  `BillingGroup.php` are byte-identical across the move, and `Routing.yaml`
  gained exactly seven lines, on the `password` anchor and the
  `updateUserPassword` route — none of the four admitted routes. Verdict
  SEMANTICALLY_STABLE.

  Every `27bb007a` occurrence was traced to what reads it before being moved or
  left; nothing was global-search-replaced. Four CURRENT_SOURCE_AUTHORITY
  surfaces moved forward together — `catalog.ts` and
  `changeIntelligence/map.ts` MUST move together, because
  `evaluateApiLineage` compares one against the other and moving one alone
  manufactures a staleness that does not exist. Two STALE_CURRENT_REFERENCES
  were REBOUND to the authority rather than re-pinned, so they cannot go stale
  independently again: `checkCanonicalUnchanged()` (which also carried a
  hard-coded absolute sibling path) and the `phase25SurfaceDiscovery` fixture
  SHA. Historical records, synthetic fixtures and the journey `sourceEvidence`
  labels stay as they are.

  Result: the recorded 9-test failing set is gone for the right reason. The
  SEMANTIC_COMPATIBILITY lane is 2127 total / 2114 passed / 13 skipped / 0
  failed, was 3 failed. Negative probe: restoring the old SHA fails exactly the
  three currentness tests again. The sibling repository is untouched — HEAD,
  branch and `git status` identical before and after, and the reflog's newest
  entry is the owner's own earlier checkout.

- **M5 COMPLETE_LOCAL — Control Center focus-ring qualification (carried 6.4).**
  The keyboard walk already proved every control takes focus in reading order
  with a style that CHANGES; it ran at one viewport, and "the style differs" is
  satisfied by a ring nobody can see. The new matrix walks the real tab order
  in all nine views at all five declared widths — 45 cells — and measures the
  indicator from COMPUTED styles against the first opaque ancestor backdrop.

  It found 32 real defects. `div.table-scroll`, `input` and `select` matched no
  authored `:focus-visible` rule at all, so they fell back to Chrome's
  near-black user-agent ring: 1.08:1 for a scroll port and 1.17:1 for the
  System Map search and filter, against a 3:1 floor. The ring was drawn; it
  could not be seen. This is the same shape as the design-system campaign's
  D-01 finding, reached by a different route: there an undefined token rendered
  its light-theme fallback, here no rule matched at all.

  Three rules were added, all using the existing `--accent` token. The scroll
  port insets its ring, because the port is itself the clipping ancestor and an
  outset ring on the clipping element is the one ring guaranteed to be cut off.

  Two measurement corrections were needed, and both are recorded rather than
  papered over. `button.table-action` reported a clipped outline, but the
  stylesheet had already anticipated exactly that and adds border and fill cues
  — so the matrix now evaluates EVERY cue that changed on focus and qualifies a
  control when at least one is adequate, unclipped and on screen. To make that
  honest the unfocused signature is snapshotted before each walk, so a static
  border can never be counted as a focus indicator. Separately, an initial
  "more than one treatment" assertion was false: the shared outline is the
  primary indicator everywhere, so non-vacuity is now expressed as named
  control kinds the walk must reach.

  The rationale textarea is fixed by class rather than tag and is explicitly
  NOT claimed as qualified: it is disabled in the read-only qualification
  composition, its base selector was already declared unreachable for that
  reason, and the full selector is now declared the same way.

  Negative probe: degrading the focus token to `--surface` fails the lane
  naming the view, the width, the control, the treatment, the colour and the
  ratio. Browser lane 9/9 PASS; UI typecheck PASS; UI tests 101/101 PASS.

  One cross-guard contradiction surfaced and was repaired.
  `checkActiveMilestoneProgression` required the PLAN to read exactly
  `COMPLETE`, while its sibling `nw07ContinuityCoherence` required the PLAN to
  MATCH whatever the STATE says. A campaign whose milestones are
  `COMPLETE_LOCAL` could satisfy one or the other, never both. The rule also
  scanned only `M<n>`, so every `G<n>`-numbered campaign escaped it entirely.
  It now captures the STATE token and asserts the real binding — the PLAN
  agrees with the STATE — over both identifier forms.

- **M6 COMPLETE_LOCAL — production-completion tail closure.** Six items closed,
  each against the exact text it recorded: 8.11, 16.5, 16.12, 18.13, 19.14 and
  21.15. For groups 8, 18, 19 and 21 the final item was the ONLY unticked
  entry, so every substantive preceding item was already complete. Two named a
  specific blocker and both are genuinely gone rather than waived: 19.14's
  three untracked concurrent-writer files are all tracked at this SHA, and
  16.12's sibling drift was removed by derivation rather than by re-pinning —
  its recorded blocker text is preserved verbatim and marked UNBLOCKED beside
  the evidence. 55 programme items remain open; every one is owner-gated or a
  separate substantive group, and none was ticked merely because this campaign
  named it.

- **CERTIFICATION — GREEN at `b34da5f6`.** `gate:local` PASS over all 12
  required groups, definition digest
  `sha256:c85f42c58db95b81865b011600086eb6db854886ca652dd57d572a7475ad101e`,
  receipt `receipt:sha256:1348f070e0f09eec5aad8af6`. `SEMANTIC_COMPATIBILITY`
  2127 total / 2114 passed / 13 skipped / 0 failed, against 3 failed at the
  campaign base; `SYNTHETIC_CAMPAIGN` 1897 / 1897 / 0 failed, against 6 failed.
  Full offline regression 5249 passed / 0 failed / 18 skipped. Strict OpenSpec
  64 passed / 0 failed.

  This is a real green, not a differential one, and it is a STRONGER green than
  the gate could previously produce: the definition carries 12 required groups
  rather than 11, and the added one executes the rule mutation campaign. Before
  this campaign a green gate meant the hardening rules RAN; it now means they
  DETECT — 83 rules, 94 probes, each mutation required to be caught, every file
  restored byte-for-byte and `git status` verified unchanged. The working tree
  was clean after both the gate and the full regression.

## Measured Baseline

Recorded at `521210f7` before any change (see `PLAN.md` for the full list):

- `hardening:rules` exits 1 — `rules=83 probes=90 detected=89 undetected=1
  restored=80 statusUnchanged=true`; HC-015 UNDETECTED.
- Sibling `ripple-api` HEAD `4e3e200db3bda7b58bc250feb7f76997d95ae2cc`;
  `27bb007a` is a clean ancestor, 31 commits back.
- Of the four admitted recipes' source files, `ExchangeRate.php`,
  `Account.php` and `BillingGroup.php` are BYTE-IDENTICAL across the two SHAs
  (blobs `636415c3`, `357b1403`, `27df7526`). Only `Routing.yaml` changed, by
  +7 lines, and the change touches only the `password` anchor and the
  `updateUserPassword` route — none of the four admitted routes.

## Blockers

- NONE currently.

## Safety Events

- NONE. No production, DEV or NEXT contact; no network egress; no credentials;
  no sibling write. Sibling `ripple-api` read with `rev-parse`, `cat-file`,
  `diff` and `status` only; its pre-existing untracked `AGENTS.md` was observed
  and left exactly as found.

## Exact Next Action

TASK COMPLETE. No further action. The owner-gated production-completion items
stay OPEN with the named owner action each requires, listed in `REPORT.md`;
none is self-authorized here. `gate:clean` and CI lanes were not run and are
not claimed.

## Resume Recipe

Task complete. Do not resume this campaign. The production-completion items it
did not close are owner-gated and each is listed in `REPORT.md` with the named
owner action it still requires; those are owner decisions, not a continuation
of this work. `gate:clean` and the CI lanes were not run here and are not
claimed.

## Work In Progress

NONE. The task is COMPLETE.

## Files Changed

- `bin/nightwatch-session.mjs` — `DRY_RUN_SUPPORT` table, dispatch guard, plan
  emitters, zero-mutation dry-run branches for the five mutating commands,
  `integrate`'s guard moved above the fetch, explicit `--base` verification,
  truthful help text.
- `tests/unit/workspaceIsolation.test.ts` — NW-07, 13 cases.
- `.agent/ACTIVE_TASK.md`, this task directory, the OpenSpec change.

## Validation Ledger

- `tests/unit/workspaceIsolation.test.ts` — 67/67 PASS (NW-07: 13/13).
- NW-07 negative probe — 5/13 FAIL with the defect reintroduced, as required.
- `npm run typecheck` — PASS.
- `npm run typecheck:bin` — PASS (conformance 14/70, REPORTING mode).
- `npm run hardening:check` — PASS, 83 rules.
- `npm run hardening:rules` — RED at base (HC-015 UNDETECTED); GREEN after
  milestone B: `rules=83 probes=92 detected=92 undetected=0 restored=81
  statusUnchanged=true`, exit 0.
- `tests/unit/hardeningProbeCampaign.test.ts` — 9/9 PASS.
- `tests/unit/phase23QualityGate.test.ts` — 14/14 PASS.
- `node bin/quality-gate-spec.mjs` — PASS, 12 required groups.
- `npm run validation:universe` — PASS (489 discovered, 0 unclassified).
- `tests/unit/hardeningRuleQuantifiers.test.ts` — 6/6 PASS.
- `npm run hardening:rules` after milestone M3 — `rules=83 probes=94
  detected=94 undetected=0 restored=83 statusUnchanged=true`, exit 0.
- `npm run test:semantic-compat` after milestone M4 — PASS, 2127 total / 2114
  passed / 13 skipped / 0 failed (was 3 failed at base).
- Focused re-admission suites — `realSourceCanary`, `oracleExpectationRealSource`,
  `phase12CoverageInventory`, `phase5Api`, `phase25SurfaceDiscovery`, and the
  104 C-0x cases: all PASS.
- `npm run control-center:ui:typecheck` PASS; `control-center:ui:test` 101/101
  PASS; `control-center:ui:build` PASS.
- `npm run control-center:ui:browser` — 9/9 PASS including the focus matrix
  (45 cells, every declared width x every view).
- Focus-matrix negative probe — degrading the token fails the lane naming the
  view, width, control, treatment, colour and ratio.
- `npm run handoff:check` PASS; `npm run project:check` PASS;
  `npm run workspace:check` PASS; `npm run agent:check` PASS.
- `npx openspec validate --all --strict` — 64 passed / 0 failed.
- `npm run gate:local` at `b34da5f6` — PASS, 12/12 required groups.
- `npm test` at `b34da5f6` — 5249 passed / 0 failed / 18 skipped, exit 0.

## Decisions Made During This Task

- Read-only commands refuse `--dry-run` instead of accepting it silently.
- The dry-run plan names its candidate session name as a CANDIDATE, because the
  name carries four random bytes and a real start draws a fresh suffix.

## Discoveries

Recorded under the measured-baseline section above and under Discoveries in
`PLAN.md`. The duplication that briefly appeared here came from a literal
section name inside this very section matching a scripted edit anchor.

## Deferred / Follow-Up

- Owner-gated production-completion items stay OPEN.

## Completion Snapshot

COMPLETE and integrated at `789bddeb`, with `HEAD == origin/main` verified and
the session released through the session CLI.

All seven milestones are closed. Certification is GREEN and real, not
differential: `gate:local` PASS over all 12 required groups at `b34da5f6`, full
offline regression 5249 passed / 0 failed / 18 skipped, strict OpenSpec 64
passed / 0 failed. The campaign base carried 3 `SEMANTIC_COMPATIBILITY` and 6
`campaign:synthetic` failures; both lanes are now zero.

The green is also STRONGER than the gate could previously produce. The
definition carries 12 required groups where it carried 11, and the added group
executes the rule mutation campaign — so a green gate now means the 83
hardening rules DETECT their violations, not merely that they ran.

Delivered: a truthful `--dry-run` contract across all eight session commands,
proven by a 13-case topology-snapshot suite; `hardening:rules` made
gate-authoritative with the rot CLASS behind HC-015 closed by shared
indirection; all 83 rule quantifiers audited with four TOTALITY rules repaired
and the abandon-shape permanently detectable; the `ripple-api` admission moved
to `4e3e200d` on derivation evidence rather than SHA substitution; and
focus-ring contrast qualified across 9 views x 5 widths, which found 32 real
defects invisible to every existing guard.

Six defects were found that nothing was looking for: an unverified `--base`, a
`withoutComments()` scanner deleting real code from every rule's view across 27
files, a cross-guard contradiction that made `COMPLETE_LOCAL` unsatisfiable, a
milestone rule that had silently skipped every `G<n>` campaign, and the two
focus classes above.

Seven guards added or repaired, every one negative-probed against real source
and restored. Six production-completion tails closed against their exact
recorded requirements; 55 items left open, each owner-gated and each listed
with its named owner action.
