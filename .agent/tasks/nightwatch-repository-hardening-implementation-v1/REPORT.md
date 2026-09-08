# REPORT — nightwatch-repository-hardening-implementation-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Status: IN_PROGRESS

This is the evidence ledger for the execution of
`docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md`. It records what was actually
run and observed, not what was intended.

## Campaign identity

- Task: `nightwatch-repository-hardening-implementation-v1`
- Session branch: `session/nightwatch-repository-hardening--e7b9be89`
- Starting SHA: `0ac7b3d037b5059f670eca715fc30adaf58e7334`
- Scope: NW-01 through NW-14 of the master plan's findings register.
  NW-15 is closed by the W10 owner and consumed as input.

## M0 — execution truth

| Question | Answer at open |
| --- | --- |
| `origin/main` | `0ac7b3d037b5059f670eca715fc30adaf58e7334` |
| canonical checkout | `main`, clean, fast-forwarded from `4e0f17d` (16 behind) |
| registered worktrees | 4 of 8 permitted |
| workspace verdict | PASS — `WORKSPACE_INTEGRITY_SATISFIED` |
| this session | `OWNED_SESSION` `sess-62fcc8aaf9fb`, base CURRENT, clean |
| W10 / NW-15 | COMPLETE — implementation `62d23e26`, documentation `ec3eacf6` |
| open findings | 14 (NW-01 … NW-14) |

One warning is outstanding and is not this task's to clear: the integrated
W10 session worktree is `STALE_SESSION` pending an owner release. C-00
forbids altering another session, and capacity is not constrained.

## Findings evidence

Each finding gets its own section as it is executed: the live probe that
reproduced or contradicted the review evidence, the repair, the regression
that fails before and passes after, and the acceptance evidence.

### NW-06 — reject over-capacity sessions before creating worktrees

Live revalidation, before any change:

- `commandStart` (`bin/nightwatch-session.mjs`) calls `inspectWorkspace` and
  refuses only on a `FAIL` verdict for the *current* topology.
- `checkWorktreeMetadata` (`bin/workspace-integrity.mjs:437`) raises
  `WORKSPACE_WORKTREE_LIMIT_EXCEEDED` from
  `worktrees.length > maxWorktrees`, over worktrees that already exist. The
  candidate registration is never modelled.
- The same function, after a successful `git worktree add`, returns
  `SESSION_RECORD_WRITE_FAILED` with the branch and worktree already created
  and no rollback.

The review's own evidence — a ninth worktree created at the bound, then
`session:status` FAIL — is therefore structural, not incidental.

**Repair.** `admitProspectiveWorktree` in `bin/workspace-integrity.mjs`
models the candidate registration against the same policy the
`WORKSPACE_WORKTREE_METADATA` invariant reads, returning the registered
count, the prospective count, the bound and a refusal list.
`commandStart` calls it before any mutation and refuses with
`SESSION_START_REFUSED_PROSPECTIVE_TOPOLOGY`, listing
`WORKSPACE_PROSPECTIVE_WORKTREE_LIMIT_EXCEEDED` or
`WORKSPACE_PROSPECTIVE_WORKTREE_NAME_REGISTERED`. `--allow-drift` does not
bypass it: drift tolerance exists so an owner can start work in a workspace
that already has an unrelated violation, not so a new one can be created.

The session branch is proven absent before creation, so a rollback can never
delete a ref this invocation did not create. Past `git worktree add`, every
failure path calls `rollbackCreatedSession`, which removes only the
just-created worktree and branch and only after five proofs: the worktree
resolves to the exact created path, it is on the exact created branch, its
HEAD is still the exact base commit, its tree is clean, and the branch tip
has not moved. Any mismatch leaves everything untouched and reports
`SESSION_START_ROLLBACK_INCOMPLETE` with the specific unproven claim.

The registration handed to the owner is then verified against the same
integrity model — present, record valid, classified `STALE_SESSION`, and the
post count within the bound — rather than trusting that three successful
steps composed.

A narrow fault seam makes the rollback path provable:
`NIGHTWATCH_SESSION_FAULT_INJECTION` accepts exactly `AFTER_WORKTREE_ADD` or
`AFTER_RECORD_WRITE`, announces itself on stdout whenever active, and fails
closed with `SESSION_FAULT_INJECTION_INVALID` on any other value so an
unrecognised token can never degrade into "no injection". It reaches no other
command and can only cause a start to fail and roll back.

**Regression.** Nine cases in `tests/unit/workspaceIsolation.test.ts`, all
against disposable synthetic upstream+clone topologies: admission below the
bound; refusal at the bound with the existing session's record, the worktree
list and every branch tip asserted byte-identical afterwards; a bound of one
where the canonical checkout alone fills capacity; `--allow-drift` refused;
rollback after `worktree add`; rollback after the record write, including the
private git directory; an unrecognised fault token failing closed; a retained
unrelated session branch surviving a rollback; and three concurrent starts at
the bound. Bound cases lower `maxWorktrees` in a copy of the real policy, so
the rule under test is the shipped rule.

**Acceptance.**

| Criterion | Evidence |
| --- | --- |
| over-capacity start fails before mutation | refusal cases: exit 1, no `SESSION_WORKTREE_CREATED`, worktree list and branch tips unchanged, `worktrees/` directory unchanged |
| post-mutation failure returns to the exact prior topology or reports a bounded owner state | both injection cases: `SESSION_START_ROLLED_BACK: ROLLBACK_COMPLETE` with `WORKTREE_REMOVED,BRANCH_DELETED`, topology equal to the pre-start snapshot; every unproven claim has its own `ROLLBACK_REFUSED_*` reason |
| no existing session is modified | the owned session's ownership record is byte-identical after the refusal; a retained unrelated branch keeps its exact tip through a rollback |
| `session:status` remains PASS | `integrityJson` verdict PASS after every case; `workspace:check` and `session:check` PASS in the live session |
| measured against the defect | 8 of the 9 new cases fail against the pre-repair code; the ninth is the below-bound admit control. The concurrent case reproduced the defect directly: 4 registrations against a bound of 3 |
| no regression in the C-00 matrix | 48 passed / 0 failed in `tests/unit/workspaceIsolation.test.ts` |

**Contradiction of the plan's own recommendation, recorded.** The plan asked
only for pre-mutation admission plus rollback. Measurement showed that is not
sufficient: prospective admission is per-process, `git worktree add` is not
serialized against it, and three concurrent starts at the bound produced four
registrations. The bound is therefore held by the post-creation verification
and rollback, with admission as the fast, informative refusal. The
concurrent case is a required regression.

### NW-01 — close reasoner-facing vocabularies against prototype inheritance

**Live revalidation, and one finding the review had not stated.** The five
membership tables were `Object.fromEntries` objects queried by truthiness, so
every `Object.prototype` name passed. Measured against the pre-repair code,
5 of the 7 new cases fail. The measurement also showed the consequence is
worse than admission: `parseIntent` ended with the TERMINATE branch rather
than dispatching it, so `{kind: 'constructor', reason:
'COMPLETE_WITH_FINDING'}` validated as a **TERMINATE intent** — an
accepted-but-unknown discriminant was reinterpreted as a terminal state the
model never named. `String(value.reason)` compounded it: any object with a
cooperative `toString` could name a termination reason it did not equal.
`lookupAgentTool('constructor')` returned an inherited function while
`isAgentToolId('constructor')` correctly returned false, so the two answers
disagreed about the same table.

**Repair.** `src/core/agentProtocol/closedVocabulary.ts` is the single
closure primitive. `closedVocabulary` returns a `Set`-backed type guard that
refuses non-strings outright rather than coercing them; `closedLookup`
returns a `Map`-backed catalog whose `has` and `get` answer from one table,
so they cannot disagree. `Set` and `Map` carry no prototype inheritance:
membership is exactly what was inserted.

`validate.ts` uses it for the intent-kind and termination vocabularies and
dispatches `TERMINATE` explicitly, ending in `reject('UNKNOWN_INTENT')` so a
future vocabulary addition without a branch refuses rather than falling into
the previous case. `tools.ts` replaces the object-backed `TOOL_BY_ID`.
`src/core/autonomousFinding/dossier.ts` uses it for severity, confidence and
environment. No vocabulary was narrowed and no call site's valid behaviour
changed.

**Regression.** Seven cases in `tests/unit/nw01ClosedVocabularies.test.ts`
over eight inherited names — `constructor`, `__proto__`, `toString`,
`valueOf`, `hasOwnProperty`, `isPrototypeOf`, `propertyIsEnumerable`,
`toLocaleString` — across intent kind, termination reason, tool id, dossier
severity, dossier confidence and dossier environment, plus the `toString`
coercion case. Two are compatibility controls: every frozen termination
reason and every catalog tool still validate, and a full valid draft still
builds with its pinned authority block.

**Acceptance.**

| Criterion | Evidence |
| --- | --- |
| prototype-name probes fail before effects | all eight names rejected on all six vocabularies; the intent case asserts `UNKNOWN_INTENT`, not a TERMINATE acceptance |
| no coercion path into a member | an object whose `toString` returns `COMPLETE_WITH_FINDING` is `MALFORMED_OUTPUT` |
| `lookupAgentTool` returns no inherited function | `lookupAgentTool(name)` is `null` for all eight names, and agrees with `isAgentToolId` |
| valid persisted protocol inputs remain compatible | every `AGENT_TERMINATION_REASONS` member validates; every `AGENT_TOOL_CATALOG` id resolves to its exact frozen descriptor; a valid dossier builds with `humanReviewRequired: true` and `externalPublication: 'PROHIBITED'` |
| measured against the defect | 5 of 7 fail pre-repair; the 2 that pass are the compatibility controls |
| no regression on the touched surfaces | 69 passed across NW-01, `agentProtocol`, `agentTools`, `dossierIdentityPropagation`; `typecheck` PASS |

**Gate-registration finding, recorded as NW-08 evidence.**
`config/synthetic-campaign.v1.json` did not list
`tests/unit/agentProtocol.test.ts` or `tests/unit/agentTools.test.ts`, and no
required gate group runs `tests/unit` wholesale — so the authoritative gate
had never executed the frozen trust boundary's own regressions. Both, and the
new NW-01 suite, are now registered in that required lane. A guard the gate
never runs is not a guard.

## Validation receipts

Recorded per milestone as they are produced. No receipt is copied from a
predecessor campaign or from a worker summary.

## Safety events

NONE.

## Honest limits

- No DEV, NEXT, production, cloud or datastore contact occurred or is
  authorized.
- No sibling repository was written.
- Completion of this campaign grants no publication or organizational release
  authority, and proves neither strict `EXACT_REDISCOVERY` nor
  previously-unknown-defect yield.
