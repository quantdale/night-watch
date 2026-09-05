# Reviewer Surface & Finding-Intelligence Scale — Report

- Starting SHA: `868761d2128d5155db454623bc2fa01622a57d33`
- Resulting SHA: Live HEAD: DISCOVER_FROM_GIT
- Task objective: repair DEF-FC-04 and harden task/continuity metadata
  against cross-campaign drift; implement the deferred Control Center
  reviewer experience over the certified FC-1 finding intelligence;
  measure finding-intelligence cost at 1k/5k/10k and optimize only where
  measured; add large-corpus and endurance coverage; re-certify; and
  reconcile durable documentation.
- Changes: see `STATE.md` `## Files Changed`. In summary — the continuity
  routing rule and its regressions; a reviewer contract, projection and
  authority plus the `/api/v1/reviewer` route; the Control Center reviewer
  view; a fresh-process scale harness and probe; one page-scoping
  optimization; large-corpus and endurance suites; RS-1 hardening;
  documentation.
- Tests/validation: see `STATE.md` `## Validation Ledger`.
- Decisions: D-REV-1 (DEF-FC-04 identifier allocation), D-REV-2 (the
  routing block is made structured because a checker cannot bind prose),
  D-REV-3 (cone prose is never projected onto the public surface; the
  reviewer basis is categorical), D-REV-4 (page-scoped intelligence, with
  paged output proven byte-identical to exhaustive).
- Safety events: ONE workspace-integrity event, class WORKSPACE_HARNESS,
  detected by this repository's own guard and repaired before closure. At
  M9 an agent-harness `ScheduleWakeup` call wrote ten `**/.claude/...`
  patterns into the SHARED `$GIT_COMMON_DIR/info/exclude` and left a
  `.claude/scheduled_tasks.lock` in the canonical checkout. C-00 requires
  that shared file to hold zero effective patterns, so
  `npm run agent:check` failed closed with ten `WORKSPACE_EXCLUDE_DRIFT`
  errors. The stock comment-only git template was restored and the stale
  lock removed; the patterns were deliberately NOT migrated into the
  tracked `.gitignore`, because encoding a tooling side effect as
  repository policy would be the wrong resolution. `agent:check` returned
  to PASS and `WORKSPACE_EXCLUDE_POLICY` to green. Full record in
  `STATE.md` `## Safety Events`.
  This is a workspace/harness event only. No unauthorized repository or
  product action followed from it, and no authorization boundary was
  crossed: no production, NEXT, DEV, or live C-12 contact. No credential
  access. No sibling-repository write. No force push. No history rewrite.
  No external filing.
  (Corrected under DEF-RP-1: this line previously read
  `Safety events: NONE`, contradicting the event recorded in this same
  campaign's `STATE.md`. See the owner-local review persistence campaign.)
- Deferred items: see `## Deferred / Follow-Up` in `STATE.md`.
- Remaining blockers: none.
- Recommended next phase/task: see `## Next recommendation` below.

## Defects

### DEF-FC-04 — cross-campaign task/continuity metadata drift

- Symptom: `.agent/ACTIVE_TASK.md` carried a `## Routing and safety` block
  written for a previous campaign while its identity fields named the
  current one, and `npm run agent:check` returned PASS.
- Minimal reproduction, from committed history only:
  `git show 48c0a60:.agent/ACTIVE_TASK.md` shows the block authored for
  `nightwatch-plan-explain-coherence-v1` — "IMPLEMENTATION AUTHORIZED: one
  focused coherence test file only", worktree
  `session/nightwatch-plan-explain-coherenc-faaf601a`.
  `git show 0c5cb42:.agent/ACTIVE_TASK.md` shows FC-1 opening with the
  identity fields rewritten and that block byte-identical.
  `git show 868761d:.agent/ACTIVE_TASK.md` shows FC-1 closing with it still
  in place, while FC-1's `STATE.md` records branch
  `session/nightwatch-frontier-completion-r-9e1b3a60`.
- Root cause: a campaign-open commit rewrites the structured fields and
  leaves the prose. Continuity v2 validates the structured fields and the
  cross-file status machine; no rule read the block. The block is what an
  agent consults to decide what it may write, so this is an authority
  defect, not a cosmetic one.
- Fix: the block declares `CAMPAIGN` and `SESSION WORKTREE` inside its
  authority fence, and `inspectActiveTaskRouting()` binds both to the
  active task's identity and its `STATE.md` branch. The session-worktree
  scan is occurrence-complete: a rule satisfied by one correct mention
  would pass while another line still named a retired worktree, which is
  exactly the shape that let this survive a campaign.
- Regression: `tests/unit/activeTaskRoutingBinding.test.ts` binds the rule
  to the real historical documents via `git show`, not only to fixtures;
  `tests/unit/agent-state.test.ts` adds four end-to-end probes that the
  rule is INVOKED, not merely defined. Mutations M16, M17, M18.

## Architecture changes

Three additions, all local and read-only:

- `src/controlCenter/contracts/reviewer.ts` — the epistemic-class contract.
- `src/controlCenter/adapters/reviewerAdapter.ts` — the projection.
- `src/controlCenter/authorities/reviewerAuthority.ts` — findings snapshot
  onto the real cone entry points, page-scoped.

Plus `/api/v1/reviewer` through router, collector, server and default
collector; `ReviewerView` in the Control Center UI; `npm run intel:scale`
with its probe; and the RS-1 hardening rule.

The finding cones were NOT modified. That is deliberate and it is also the
control for the optimization: the three raw-cone measurements are
unchanged before and after, so the improvement is entirely in what the
served path asks of them.

## Measured scale envelope

See `STATE.md` `## Measured scale envelope (M4, before optimization)` and
`(M5, after optimization)` for the full tables, and `docs/ARCHITECTURE.md`
for the durable record. The headline:

```text
served reviewer path @ 10,000 findings
  before:  30,264 ms   QUADRATIC   peak RSS 118.6 MiB
  after:       26.0 ms LINEAR      peak RSS  98.8 MiB
worst-case page (newest 50) @ 10,000 findings
  after:      359.5 ms LINEAR
```

Nothing was optimized without a measurement, and nothing was claimed
without a re-measurement. Defect-class grouping was left alone because it
is linear at 7.2 ms for 10,000 findings, and a shared-key index over
relationship candidates was rejected on the classifier's own rules rather
than after building it.

## Independent final review

Adversarial questions asked, and how each is answered mechanically:

- *Can a duplicate suggestion become a verdict?* Every relationship the
  cone marks `advisoryOnly` projects as RECOMMENDATION, and one that has
  lost that marking is rejected rather than promoted (M01).
- *Can UNKNOWN read as a weak yes?* UNKNOWN carries no value and no
  advisory pointer; an UNKNOWN arriving with a pointer is rejected (M02);
  the UI renders the class as text, not colour alone (M19, M20).
- *Can local review become organizational sign-off?* Every payload and
  element carries `NONE_LOCAL_REVIEW_ONLY`, re-checked at the surface, and
  a receipt claiming otherwise never reaches a screen (M04).
- *Can a stale review show as live?* A binding that is not CURRENT
  projects as UNKNOWN (M07).
- *Can privacy leak?* Sentinels are rejected in every free field and the
  error path names fields, never values (M05); payloads are scanned at
  1k/5k/10k.
- *Can the optimization change an answer?* Paged output is compared to
  exhaustive output at five page sizes, and recurrence is checked to still
  account for findings absent from the page (M12, M14).
- *Can the surface claim a complete page?* Truncation is derived from the
  corpus total, not from the array that arrived (M08).
- *Can the surface guess above the pairwise limit?* It reports UNKNOWN
  with `RELATIONSHIP_NOT_ANALYSED_ABOVE_PAIRWISE_LIMIT` (M13).
- *Can the displayed Alphaus vocabulary drift from AH-1's?* Hardening pins
  the deliberate literal duplicate to the original (M15).
- *Can a benchmark flatter itself?* It did, once: identifier order matched
  chronological order so the page was the cheapest findings.
  `REVIEWER_WORST_CASE_PAGE` measures the page a reviewer actually opens.
- *Can a hardening rule pass while proving nothing?* One did — two guards
  existed, so `includes(literal)` survived deleting one. It is now a
  totality relation, and all six RS-1 branches are probed by deliberate
  mutation.
- *Can a new view escape browser qualification?* The lane said "all seven
  built views" while nine existed. It is now a totality check over the live
  navigation.
- *Can a flake be retried away?* No retry was added anywhere. Latency
  bounds are loose against measurement and tight against regression.

## Next recommendation

A local review store. The reviewer surface reports local review as UNKNOWN
with `NO_LOCAL_REVIEW_STORE` because none exists; the lifecycle and the
immutable binding are already built and certified in
`src/core/findingReview/`, so what is missing is owner-local persistence
and the read path to it. That would turn the last UNKNOWN column on the
surface into real state, and it needs no fresh authorization.

Second: dossier metadata carries no expectation or semantic-contract
identity, which is why defect classes are usually absent and relationships
rest on fingerprint evidence alone. Carrying those identities into
`FindingsDossierMetadata` would make the existing classifier markedly more
useful without changing a single classification rule.

C-12 live execution, C-13, C-14, C-08b and C-07 DEV remain external and
unauthorized. Nothing in this campaign advances them.

Status: COMPLETE (every value above is actual;
never leave future-value placeholders such as "(filled after push)" in a
COMPLETE report; live final HEAD/CI are Git/GitHub-Actions authority).
