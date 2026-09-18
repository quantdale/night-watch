# REPORT.md

Task: nightwatch-certification-closure-and-validation-integrity-v1

Status: COMPLETE

Final handoff for the certification-closure and validation-integrity campaign.

## Baseline

| | |
|---|---|
| Starting SHA | `521210f706b9383e20dd08d1bfd2f3c47b34687d` |
| Certified SHA | `b34da5f63395dce53f139665dd823711739381ef` |
| Integrated SHA | `789bddeb5d640b2fc2383f1e8e8a4f3523d31e43` — `HEAD == origin/main` verified |
| `origin/main` at start | `521210f7` — unchanged throughout; no reconcile needed |

## What this campaign actually found

Six objectives turned out to be one defect wearing six coats: a mechanism that
REPORTS more than it PROVES. Three of the six were GREEN beforehand, and two of
those were green only because nothing ever ran them.

| Surface | Reported | Actually proved |
|---|---|---|
| `start --dry-run` | "the planned action without mutating" | created a branch, a worktree and an ownership record |
| `hardening:rules` | a declared npm script | nothing selected it, and it was already RED |
| 60 TOTALITY rules | "every occurrence" | four stopped at the first failure |
| `withoutComments()` | a code-only view | deleted real code from 27 files' views |
| focus-ring rules | a `:focus-visible` rule exists | 1.08:1 on three control kinds |
| source currentness | admitted `27bb007a` | the sibling was at `4e3e200d` |

## Session dry-run (M1)

**Root cause.** `--dry-run` is a single global boolean (`parseArgs`, default
`:544`, set `:559`) that exactly ONE of eight commands read —
`commandIntegrate` at `:422`. `start`, `claim`, `release`, `reconcile` and
`remove` all mutate and ignored it; the dispatcher did not even pass `options`
to `commandRelease`. `integrate` honoured it only AFTER a fetch that writes the
remote-tracking refs, so the one supported case was not a zero-mutation dry run
either.

**Commands audited.** All eight. `status`/`check` are READ_ONLY; the other six
are MUTATING.

**Final contract.** A declared `DRY_RUN_SUPPORT` table, enforced at dispatch, so
a command cannot be added without declaring its contract. The six mutating
commands support genuine zero-mutation plans; `integrate`'s guard moved above
its fetch; `status`/`check` REFUSE the flag with
`SESSION_DRY_RUN_NOT_APPLICABLE` rather than accepting a silent no-op — a
silently ignored flag is precisely how this defect looked correct.

**Mutation proof.** `tests/unit/workspaceIsolation.test.ts` NW-07, 13 cases,
each asserting a full topology snapshot byte-identical across the dry run:
worktree list, every ref, branch tips, HEAD, symref, status, index, the shared
`worktrees/` tree, `info/exclude`, `hooks` and the target path. Cases cover
clean admission, at-capacity refusal, invalid base, occupied path, invalid and
valid fault-injection tokens, unsafe workspace, repetition, capacity
non-consumption, the full mutating lifecycle, read-only refusal, help-text
truth and contract totality over `COMMANDS`. Negative probe: reintroducing the
defect fails 5 of 13, including the capacity case that is the exact recorded
failure mode. No session artefact leaked — every case runs against a disposable
fixture.

**Second defect found while proving it.** An explicit `--base` was never
verified, so a dry run answered "this start could proceed" for a base that
would make the real start fail at `git worktree add` — after creating the
parent directory. Now `SESSION_BASE_INVALID`, before the first mutation.

## Hardening (M2, M3)

**Rule count 83. Probe count 94** (was 90).

**Gate integration.** A REQUIRED `HARDENING_PROBES` group between `HARDENING`
and `HANDOFF_TRUTH`; 11 required groups became 12. Wired through the
command-key union, the offline spec validator, the runtime dispatch and the
hardening rule that asserts the required-group list. Not optional and not
flag-guarded, because an optional probe lane reproduces the blind spot it
exists to close.

**Gate/receipt evidence.** Definition digest
`sha256:c85f42c58db95b81865b011600086eb6db854886ca652dd57d572a7475ad101e`,
computed at run time and never transcribed. Receipt
`receipt:sha256:1348f070e0f09eec5aad8af6`, persisted outside the repository,
carrying `HARDENING_PROBES` in both `groupIds` and `groups`. No past receipt was
edited. Probes HC-090 and HC-091 prove the gate can neither LOSE the group nor
DOWNGRADE it to optional without `hardening:check` going red.

**Why the campaign had rotted.** `checkActiveMilestoneProgression` resolves its
subject indirectly — `.agent/ACTIVE_TASK.md` → `Task directory:` → that task's
`STATE.md` — while probe HC-015 named a fixed task directory. When the active
task changed, the probe began mutating a file the rule no longer opens and
reported UNDETECTED while the rule worked perfectly. Probes may now write
`<ACTIVE_TASK_DIR>`, resolved by the campaign exactly as the rule resolves it;
an unresolvable placeholder throws rather than probing the wrong file.

**G16.5 quantifier audit.** All 83 rules classified and mechanically verified:
60 TOTALITY, 23 EXISTENCE, 21 carrying a recorded `firstMatch` singleton
justification. The two-value vocabulary is the minimum that describes the live
set; UNIQUENESS/EXACTLY_ONE, CARDINALITY and ABSENCE were each considered and
rejected with a reason rather than added for symmetry. Full table in the
change's `audit.md`, generated from the live registry.

**Rules corrected — four.** `checkAlphausHandoffBoundary`,
`checkFindingFrontierBoundary`, `checkC15bSystemMapBoundary` and
`checkC02bProtobufBoundary` each opened
`for (const subject of subjects) { if (bad) { fail(...); return; } }`, so the
FIRST failing subject abandoned the remaining subjects AND every assertion
below the loop. Each still passed its own probe, because one recorded mutation
produces one detected failure — which is exactly how the shape survived a
campaign built to catch dead guards. The first two reached that path for real.
All four now `continue`, and `checkRuleEngineSoundness` fails the shape
permanently, naming the loop line and the return line; nesting is computed by
indentation because the blanked view still contains strings and regex literals
and the first brace-matching form false-positived on a top-level try/catch.

**A fifth defect, in the kernel.** `withoutComments()` stripped block comments
with a regex BEFORE line comments, so a `//` comment containing a
block-comment opener ran to the next closer and DELETED the real code between
them from the view every `read()`-based rule sees. 27 tracked files contain
such a comment. A fail-if-absent rule fails loudly on that — which is how it
surfaced — but a fail-if-PRESENT rule goes silently vacuous over the deleted
span, so forbidden code could hide behind an ordinary-looking line comment.
Both code views now share one `commentMask` scanner, asserted behaviourally
rather than by inspecting the implementation's shape, and probed by HC-092.

**A sixth, across guards.** `checkActiveMilestoneProgression` required the PLAN
to read exactly `COMPLETE` while its sibling `nw07ContinuityCoherence` required
the PLAN to MATCH whatever the STATE reports — so a campaign whose milestones
are `COMPLETE_LOCAL` could satisfy one guard or the other, never both. The rule
also scanned only `M<n>`, so every `G<n>`-numbered campaign escaped it
entirely. It now captures the STATE token and asserts the binding both guards
actually express, over both identifier forms.

## ripple-api re-admission (M4)

| | |
|---|---|
| Old admitted SHA | `27bb007ad0c798800b6bd3b29760c966422966e7` |
| New admitted SHA | `4e3e200db3bda7b58bc250feb7f76997d95ae2cc` |
| Distance | 31 commits; the old SHA is a clean ancestor |

**Proof that the admission was semantic, not a SHA substitution.** All four
recipes were derived through `deriveRealSourceExpectations` at BOTH snapshots
and compared: 4 derived / 0 failures at each, identical invariant definitions,
and IDENTICAL `ev:sha256` evidence digests. That digest binds the normalized
source structure used to derive, so its equality is a statement about the
SOURCE rather than about the label on it. The old snapshot came from a
disposable `git archive` extraction whose four recipe source files were
verified byte-for-byte against the sibling's own old tree. Independently,
`ExchangeRate.php` (`636415c3`), `Account.php` (`357b1403`) and
`BillingGroup.php` (`27df7526`) are byte-identical across the move, and the
only changed recipe input, `Routing.yaml`, gained exactly seven lines — a
`checkpassword: true` on the `password` anchor and a `validate:` block on the
`updateUserPassword` route — neither touching any of the four admitted routes.

**Expectations: 4 unchanged, 0 changed, 0 retired.** Nothing was ambiguous, so
no lifecycle retirement was needed.

**Contracts examined and classified.** Every `27bb007a` occurrence was traced to
what reads it before being moved or left; nothing was global-search-replaced.
Four CURRENT_SOURCE_AUTHORITY surfaces moved forward together —
`src/api/phase5/catalog.ts`, `src/core/changeIntelligence/map.ts`,
`src/products/ripple/explorationCatalog.ts`, and `src/data/phase6/catalog.ts`
which already derived from the first. The first two MUST move together, because
`evaluateApiLineage` compares one against the other and moving one alone
manufactures a staleness that does not exist; `phase5Api`'s FRESH assertion is
what holds that pair honest. Six STALE_CURRENT_REFERENCES were REBOUND to the
one authority rather than re-pinned, so they cannot drift independently again.
Historical records, synthetic fixtures and the journey `sourceEvidence` labels
stay as they are; the recipe registry header records the re-admission
ADDITIVELY beside the original and Phase 10A entries. The full classification
table is in the change's `audit.md`.

**Failures gone for the right reason.** The recorded nine-test set
(`oracleExpectationRealSource:63`, `phase12CoverageInventory:344`,
`realSourceCanary:86`, and six C-0x tests) was reproduced exactly at the
campaign base and now passes. Negative probe: restoring the old SHA fails
exactly those three currentness tests again.

**Sibling untouched.** HEAD `4e3e200d`, branch `master` and
`git status` (`?? AGENTS.md`, pre-existing and not ours) identical before and
after. Only `rev-parse`, `cat-file`, `archive`, `diff`, `status` and `log` were
used. The reflog's newest entry is the owner's own earlier checkout, which is
the drift this campaign was authorized to admit.

## Control Center (M5)

**Focus matrix result.** 45 cells — nine views × five declared widths
(1440/1080/820/560/380) — all measured directly; no carrier-set argument was
needed. Over 100 controls measured, and the walk is required to reach
`a.nav-item`, `button.table-action`, `div.system-map-canvas`, `div.table-scroll`,
`input` and `select`; the last two kinds are what a `button, a, input` sweep
misses.

**Defects found and fixed — 32.** `div.table-scroll`, `input` and `select`
matched NO authored `:focus-visible` rule, because the stylesheet styled only
`button` and `a`. All three fell back to Chrome's near-black user-agent ring:
1.08:1 for a scroll port and 1.17:1 for the System Map search and filter,
against the 3:1 WCAG 2.2 1.4.11 floor. The ring was drawn; it could not be
seen. Three rules were added, all using the existing `--accent` token; the
scroll port insets its ring because the port is itself the clipping ancestor.

**Two measurement corrections, recorded not papered over.**
`button.table-action` reported a clipped outline, but the stylesheet had
already anticipated that and adds border and fill cues — so the matrix now
evaluates every cue that CHANGED on focus and qualifies a control when at least
one is adequate, unclipped and on screen, with the unfocused signature
snapshotted before each walk so a static border is never counted. An initial
"more than one treatment" assertion was simply false and was replaced by named
control kinds.

**Negative probe.** Degrading the focus token to `--surface` fails the lane
naming the view, the width, the control, the treatment, the colour and the
ratio.

**No redesign.** No information-architecture change, no new visual language, no
token removed or renamed. The rationale textarea is fixed by class and is
explicitly NOT claimed as qualified: it is disabled in the read-only
qualification composition, its base selector was already declared unreachable
for that reason, and the full selector is now declared the same way following
the existing `.review-action:disabled` precedent.

## Production-completion tails

**Closed — six.** 8.11, 16.5, 16.12, 18.13, 19.14, 21.15. For groups 8, 18, 19
and 21 the final item was the ONLY unticked entry, so every substantive
preceding item was already complete. Two named a specific blocker and both are
genuinely gone: 19.14's three untracked concurrent-writer files are all tracked
at this SHA, and 16.12's sibling drift was removed by derivation rather than by
re-pinning — its recorded blocker text is preserved verbatim and marked
UNBLOCKED beside the evidence.

**Left open — 55**, every one owner-gated or a separate substantive group. None
was ticked because this campaign named it. The owner actions each still needs:
G3.11 select the CI route; G5.3 approve the evidence reclaim and retention;
G6.4/6.5/6.10 clear the canonical RELEASED maintenance record and the foreign
worktree disposition; G9.1 authorize one bounded registry query (network
egress); G10.6/10.13 obtain or refuse the access, then record the decision;
G11.3 unblock or close Phase 9B/10B; G12.3 authorize the successor yield wave
(provider-dependent); G13.8 name the status beyond `OPERATIONALLY_ACCEPTED`;
G14.6 adopt or remove `dtoFramework`; G17.4 decide the presumed disposition;
CF-1 and CF-2 carried items. G2/F-02 `lanes:manual` remains undelivered.

## Validation

All at `b34da5f6` unless noted.

| Lane | Result |
|---|---|
| `typecheck` | PASS |
| `typecheck:bin` | PASS (conformance 14/70, REPORTING mode) |
| `hardening:check` | PASS — 83 rules |
| `hardening:rules` | PASS — rules=83 probes=94 detected=94 undetected=0 restored=83 statusUnchanged=true (RED at base: undetected=1) |
| `validation:universe` | PASS — 489 discovered, 0 unclassified |
| `session:status` / `session:check` / `workspace:check` | PASS |
| `agent:check` | PASS (39 warnings — legacy v1 tasks and other owners' stale worktrees) |
| `handoff:check` | PASS |
| `project:check` | PASS |
| `control-center:ui:typecheck` | PASS |
| `control-center:ui:test` | 101/101 PASS |
| `control-center:ui:build` | PASS |
| `control-center:ui:browser` | 9/9 PASS including the focus matrix |
| `gate:local` | **PASS — 12/12 required groups** |
| `npm test` | **5249 passed / 0 failed / 18 skipped** |
| `openspec validate --all --strict` | 64 passed / 0 failed |

Gate group detail: `SEMANTIC_COMPATIBILITY` 2127 total / 2114 passed / 13
skipped / 0 failed (3 failed at base); `SYNTHETIC_CAMPAIGN` 1897 / 1897 / 0
failed (6 failed at base); `OWNER_PROVENANCE` 91 passed. The working tree was
clean after both the gate and the full regression.

**Lanes NOT claimed.** `gate:clean` was not run; `gate:ci` and any external CI
observation were not run; the DEV/NEXT, authenticated, advisory-network and
owner-manual lanes remain unavailable or unauthorized and are not claimed as
PASS.

**On the strength of this green.** It is not the same green as before. The
definition carries 12 required groups rather than 11, and the added one
executes the rule mutation campaign. Previously a green gate meant the
hardening rules RAN; it now means they DETECT.

## Safety

| | |
|---|---|
| Production contact | NONE |
| DEV / NEXT contact | NONE |
| Sibling writes | NONE — verified identical HEAD, branch and `git status` before and after |
| Network egress | NONE beyond `git fetch origin` and the integration push |
| Credentials | NONE read, written or stored |
| Destructive operations | NONE across paths not owned by this session |

One incident, self-inflicted and recorded: `campaign:synthetic` was started
twice concurrently, and the second run's mutations raced the first run's
restores, leaving probe residue in `src/core/reviewStore/store.ts`. It was
caught by the suite, proven to be MINE by running the same suites at the
campaign base SHA (28/28 PASS there) rather than assumed pre-existing, restored
with a single file-scoped `git checkout --`, and re-run serially to a clean
result. The lesson is recorded because the campaign's own
`statusUnchanged=true` cannot detect residue in a file that was already dirty
when the run began — the byte-restore check covers only files that run touched.

## Verdict

COMPLETE_LOCAL. Local certification is green and truthful at `b34da5f6`. CI and
clean-checkout lanes were not run here and are not claimed.
