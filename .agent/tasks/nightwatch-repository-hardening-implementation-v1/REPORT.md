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

### NW-02 — make private-path exclusion independent of checkout topology

**Live revalidation, through the consumers rather than the new module.** A
test that only exercises the replacement primitive cannot fail against the
defect, so the measurement runs through `privateArtifactRoot()` and the two
store constructors with a configured default root. With
`NIGHTWATCH_PRIVATE_STATE_DIR` pointed at the canonical Nightwatch checkout,
executed from this C-00 session worktree, the pre-repair code **accepted**
it: `path.resolve(__dirname, '..', '..', '..')` made the excluded set
`$HOME/.nightwatch/worktrees`, so canonical and every sibling source tree
were outside it. Owner findings could have been written beneath tracked
source. Post-repair the same call throws
`PRIVATE_ARTIFACT_ROOT_INSIDE_REPOSITORY`, and the production store throws
`PRODUCTION_ARTIFACT_ROOT_INSIDE_REPOSITORY`.

**Repair.** `src/core/policy/sourceTopology.ts` is the single authority. Its
excluded set is built only from absolute, checkout-independent facts:

| Root | Source | Covers |
| --- | --- | --- |
| sibling `REPOSITORIES` root | explicit option, then `NIGHTWATCH_REPOS_ROOT`, then `DEFAULT_SIBLING_ROOT` | the canonical Nightwatch checkout and every sibling company repository |
| `$HOME/.nightwatch/worktrees` | C-00 convention, home-relative | every linked implementation worktree |
| this checkout's own root | module location | self-protection only; in every supported topology it already lies inside one of the two above |

The third entry can only refuse more; it never defines the shared answer, and
tests can omit it. A non-absolute or blank configured root throws
`SOURCE_TOPOLOGY_REPOSITORIES_ROOT_AMBIGUOUS` rather than falling back to a
default. Containment is lexical on normalized paths, which is sound only
because the callers still refuse a symlink at every path component before
creating anything — that dependency is stated in the module rather than
assumed.

Both consumers now inject the authority, and their duplicated local
`isInside` helpers were deleted, so the containment judgement exists in
exactly one place.

**Regression.** Seven cases in `tests/unit/nw02PrivatePathTopology.test.ts`.
The central one builds the full decision vector for six forbidden targets —
the canonical checkout, the repositories root itself, two sibling subtrees,
the worktree parent, and another session worktree — under three injected
topologies (canonical checkout, linked session worktree, relocated clone) and
requires the three vectors to be **identical**, so a topology-dependent
answer fails as a whole rather than one assertion at a time. The rest cover
the three legitimate owner roots being allowed in all three topologies,
ambiguity failing closed, explicit-over-environment-over-default precedence,
the self-protection entry, the consumer-level measurement, and a live
end-to-end write into a disposable root. Every path is fabricated; nothing
under a real repositories root is created, and the refusal is asserted to
happen before creation.

**Acceptance.**

| Criterion | Evidence |
| --- | --- |
| all real stores reject every source/worktree root regardless of checkout location | six forbidden targets refused, decision vector identical across three topologies; both real stores throw their own documented codes |
| valid owner state still works | the three default owner roots allowed in all three topologies; a disposable injected root writes and reads end to end with `rootClass: 'INJECTED_TEST_ROOT'` |
| ambiguity fails closed | non-absolute and blank roots, a non-absolute home, and a non-absolute candidate each throw a distinct `SOURCE_TOPOLOGY_*` error |
| no machine-specific path enters Git | the suite's paths are all `/synthetic/...`; the live case derives its path from the resolved topology at runtime and asserts nothing was created |
| measured against the defect | with the consumers reverted, the consumer-level case fails: `privateArtifactRoot()` did not throw for a private root pointed at canonical source |
| structurally locked | `checkC00WorkspaceIntegrity` requires the exact `assertOutsideSourceTopology(root, '<error code>'` call in both surfaces, forbids `__dirname` in them, and requires the authority to reference `DEFAULT_SIBLING_ROOT` and fail closed |

**A rule that first proved nothing, recorded.** The initial hardening rule
tested for the identifier `assertOutsideSourceTopology` anywhere in the file.
Replacing only the call site — leaving the import — kept `hardening:check`
PASS while the containment decision had moved back into the consumer. The
rule now matches the call form with each store's own error code, and all four
probe variants fail as intended.

### NW-03 — confine and safely publish Bug Atlas snapshots

**Live revalidation, which executed the escape.** Measuring a
filesystem-escape defect means performing it. Against the pre-repair module,
the case that points the state directory at the canonical Nightwatch checkout
created that directory and wrote a 0600 `bug-atlas-snapshot.json` into the
tracked checkout. That residue was removed, the canonical checkout is clean,
and a read-only porcelain scan confirmed no sibling repository was touched.
The regression now scopes a `finally` cleanup to the exact fabricated name it
chose, so re-measuring cannot leave it behind. Recorded as `SAFETY-M4-01`.

The measurement also showed a consequence beyond the review's description:
because the directory was created from `path.dirname(file)`, an escaping
`fileName` created and chmodded `0700` a directory outside the authorized
root — the escape mutated the filesystem before any write.

**Repair.**

| Defect | Repair |
| --- | --- |
| `path.join(root, fileName)` with no containment | `safeSnapshotFileName` requires the name to EQUAL its own basename, contain no dot-segment, and match the pinned `^[A-Za-z0-9][A-Za-z0-9._-]{0,160}\.json$`; then `snapshotFilePath` joins and PROVES the result is a direct child of the proven root |
| directory created from the file's dirname | created from `snapshotStateRoot`, the proven root |
| state root could be inside tracked source | held to the NW-02 authority — `BUG_ATLAS_STATE_ROOT_INSIDE_REPOSITORY` |
| only the leaf lstat-checked | every path component checked, before and after creation |
| `writeFileSync` straight onto the destination | `publishSnapshot` stages into an owner-only same-directory temporary opened `wx`, fsyncs, revalidates the boundary, then `rename`s; owned temporaries removed in `finally` |
| overwrite semantics inherited | stated: a snapshot is mutable state, so a republish deliberately replaces — but only by renaming over a destination proven regular, owner-only and non-symlink |
| recovery could touch unknown files | `listSnapshotTemporaries` recognises only the pinned temporary shape |

`path.basename` alone would have been the wrong guard: it rewrites
`../synthetic-escape.json` to `synthetic-escape.json`, converting a refused
escape into a silent successful write to a different file.

**Regression.** Eight cases in
`tests/unit/nw03AtlasSnapshotConfinement.test.ts`: ten unsafe names
(traversal at one and two levels, nested, dot-prefixed, absolute, `..`, `.`,
empty, extensionless, hidden) with the escape target's sentinel asserted
byte-identical and the state root asserted unchanged; an existing leaf
symlink whose external target must survive; a symlinked ancestor of the state
directory; a state root inside the real repositories tree; the normal
save/load round trip with mode `0600`; the frozen default name; and the
atomicity case.

**Atomicity is measured, not asserted.** A direct `writeFileSync` truncates
and rewrites the SAME inode, so a concurrent reader or an interrupted write
sees a partial snapshot; a same-directory temporary published by `rename`
always yields a DIFFERENT inode. The test compares inodes across a
republish, which distinguishes the mechanism. One further case is labelled a
**control** in the test itself, because normalisation runs before publication
so it passes pre-repair too — it guards the ordering, not the atomicity.

**Acceptance.**

| Criterion | Evidence |
| --- | --- |
| every output is inside the authorized root | ten unsafe names refused; the escape target's sentinel byte-identical; the state root's listing unchanged |
| unsafe names and symlinks fail before mutation | refusals throw before any create; the symlink target keeps its sentinel bytes and the link itself is left in place, unfollowed |
| interruption yields a complete prior or new snapshot | inode changes across a republish, proving rename rather than in-place truncation; exactly one file remains and no temporary survives |
| no residue after controlled failures | `fs.readdirSync(stateRoot)` equals `[BUG_ATLAS_SNAPSHOT_FILE]` after every refusal and after every publish |
| schema and default location retained | `BUG_ATLAS_SNAPSHOT_FILE` still `bug-atlas-snapshot.json`; an explicit safe alternate name still accepted; round trip returns the same records |
| measured against the defect | 5 of the 8 cases fail against the pre-repair module |
| no consumer regression | `bugAtlas`, `systemAtlas`, `localInvestigationProviders` and the new suite — 74 passed |

### NW-13 — remove sensitive input from parser diagnostics

**Live revalidation, which refined the finding.** The review recorded "a
prefix of the planted secret text". Measured directly on Node 22.22.1, the
leak is a **window** of roughly twenty characters centred on the offending
token:

```
Unexpected token 'o', ..."_ABCDEF": oops}" is not valid JSON
```

so the excerpt is a prefix, a middle fragment, or a suffix depending on where
the malformation sits — and a document whose syntax error is far from the
secret leaks nothing at all. The invariant is therefore "no fragment", not
"no prefix", and the regression searches for the longest substring of the
planted value of length six or more.

The sweep also found something worse than the site the review named: two of
the three key-inspection helpers called `JSON.parse` with **no catch at
all**, so the raw `SyntaxError` propagated with its window intact.
Pre-repair, `validateStorageStateFile` leaked `"_MARKER"` and
`inspectStorageStateKeyPresence` leaked content too.

**Repair.** `src/core/policy/sensitiveDiagnostics.ts` is the shared taxonomy.
`sensitiveDiagnostic` renders only allowlisted parts and has deliberately
**no free-text parameter**, so a caller cannot route content through it even
by mistake:

| Part | What it is | What it is not |
| --- | --- | --- |
| `failure` | one of seven closed classes | free text |
| `errno` | the errno **code**, shape-checked | the errno message, which embeds the path |
| `bytes` | a non-negative integer | a content length that reveals a value |
| `target` | rendered as coarse class + twelve-hex digest | the path itself |

The three inspection helpers share one content-free reader. Errno-only
wrapping replaced native messages in `src/core/environment/index.ts`,
`src/core/policy/privateArtifacts.ts` and
`src/core/selfDevSandbox/sandboxMirror.ts`.

The five distinctions an operator needs — missing, unreadable, oversized,
unsafe path, malformed JSON, schema-invalid — are all preserved. Collapsing
them into one opaque failure would have traded a privacy bug for a
diagnosability bug, and the existing `/not valid JSON/` assertion in
`tests/unit/storageState.test.ts` still matches.

`src/core/reviewStore/store.ts` was inspected and needed **no change**: it
reads through `PrivateArtifactStore.readJson`, which already throws the
content-free `PRIVATE_ARTIFACT_CORRUPT`, and its other wrapped messages are
Nightwatch-generated codes rather than native output. Recorded so the
finding's "analogous parsers" clause is answered rather than assumed.

**Acceptance.**

| Criterion | Evidence |
| --- | --- |
| no planted secret or excerpt in any returned error, stderr, log, receipt or artifact | five malformed shapes × two entry points; the search covers message, stack, `cause` and every own property of the thrown object |
| operators still receive a stable category | `/not valid JSON/` still matches; a missing file yields a different category; the closed vocabulary retains all seven classes |
| content cannot be smuggled through the renderer | no free-text parameter; an unknown failure class, an unsafe errno and a negative byte count each throw |
| measured against the defect | 2 of the 5 cases fail pre-repair; the 3 that pass are the taxonomy and category controls |
| no regression on the touched surfaces | 52 passed across `storageState`, `environmentSelection`, `authCaptureStages`, `privateArtifactAtomic`, `selfDevSandbox` |

### A regression this campaign introduced, and the rule that now prevents it

NW-02 added `privateArtifacts.ts -> ./sourceTopology` and NW-13 added
`-> ./sensitiveDiagnostics`. `SELFDEV_AUTHORITATIVE_PATHS` is both the
provenance digest input and the exact file set copied into every self-dev
sandbox fixture mirror, and its own comment records that the list "must stay
transitively closed over the authoritative set's imports" — the DEF-12
lesson. Neither addition extended it, so all 15 `selfDevAdoptionSandbox`
cases failed with `Cannot find module`. The per-milestone focused suites did
not include that file, so NW-02 shipped the breakage and the M5 shard sweep
found it.

Repaired three ways: the trust root was extended and is closed again;
`src/core/source/siblingRoot.ts` now holds `DEFAULT_SIBLING_ROOT` as a leaf
constant so the topology authority needs one string rather than the whole
sibling-reader cone; and `checkSelfDevTrustRootClosure` enforces the closure
mechanically — every relative import of every listed TypeScript file must
itself be listed.

**That rule's first version passed while proving nothing, in a new way.** The
manifest carries prose *inside* the array literal, and an apostrophe in it —
"the authoritative set's imports" — shifted the quote pairing of a naive
`'([^']+)'` scan so the extracted "entries" were the text *between* entries.
Zero of 54 parsed as `.ts`, the closure loop iterated an empty set, and the
rule reported PASS against all three deliberately broken manifests. It now
strips comments first, and fails outright when fewer than half the declared
entries parse as TypeScript paths — a rule that cannot find its subject must
not report success. Both the closure check and the anti-vacuity guard were
then probed and fire: dropping any one of the four new trust-root entries is
reported by name, including the two transitive cases.

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
