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

### NW-04 — make autonomous campaign checkpoints bounded and crash-safe

**The review rated the crash consequences "strongly indicated". They are now
executed.** Measured through the consumer's own entry point,
`loadLocalCampaignCheckpoint`, the pre-repair loader given an 8 MB+ checkpoint
read and decoded the whole file and then threw:

```
Unexpected token 'x', "xxxxxxxxxx"... is not valid JSON
```

One observation proving both defects at once: the unbounded read, and a
content window of the checkpoint's own bytes — which are investigation state —
leaking into the diagnostic.

**Repair.** `src/core/agentRuntime/checkpointStore.ts` is the single
publication and read path.

| Property | How |
| --- | --- |
| generations | every document carries `checkpointGeneration`, one greater than the generation it replaced; additive, because `parseCheckpoint` reads named fields and ignores the rest, so a pre-NW-04 checkpoint reads as generation 0 |
| same-ID writers | compare-generation: the on-disk generation is re-read immediately before the rename, and a change since staging refuses with `CHECKPOINT_GENERATION_CONFLICT` |
| bound before allocate | the size comes from the `lstat`, so an oversized file is refused without being read; a proposed document is measured before staging |
| atomic visibility | owner-only same-directory temporary opened `wx`, fsynced, boundary revalidated, renamed; owned temporaries removed in `finally` |
| corrupt evidence | preserved exactly where it is; a corrupt predecessor is **not** treated as an empty slot, so publication refuses rather than overwriting it |
| no delete before durable progress | a fresh run moves the previous checkpoint to `<file>.superseded` instead of unlinking it, keeping exactly one superseded document per id |
| content-free diagnostics | corrupt, truncated, non-object and oversized states report through the M5 taxonomy |

Two limits are stated in the module rather than overclaimed. Compare-generation
converts the common interleaving from silent loss into a reported refusal and
guarantees the loser's bytes are never half-written into the winner's file,
but it does not eliminate the final rename race — this is single-host local
operation, not a distributed lock. And durability is qualified: the module
fsyncs the file and the containing directory where the platform allows, and
claims atomic **visibility** — a reader sees the complete previous or the
complete next document — rather than universal fsync semantics.

**Regression.** Thirteen cases in
`tests/unit/nw04CheckpointDurability.test.ts`. Crash injection uses hooks that
exist only in the primitive's signature: no campaign input DTO, CLI flag or
config file carries them, so a reasoner cannot reach them.

| Case | Asserts |
| --- | --- |
| crash at `afterStage`, `beforeRename`, `afterRename` | exactly one COMPLETE generation is visible; before the rename the previous bytes are byte-identical, after it the new generation is complete; no partial file and no temporary residue in either direction |
| competing same-id writer | a second publish interleaved precisely between staging and rename; the loser is refused and the winner's generation-2 document is intact |
| republish inode | changes, proving rename rather than in-place truncation |
| oversized stored / proposed | both refused; the stored file is preserved at its original size |
| corrupt and truncated state | `CHECKPOINT_CORRUPT`, bytes preserved, publication refuses to overwrite, no fragment of a planted value in message, stack or own properties |
| symlinked destination, out-of-directory target | refused; an external sentinel keeps its bytes |
| superseding | the previous document is readable under `.superseded`, exactly one is retained, superseding nothing is not an error |
| pre-NW-04 document | reads as generation 0 and advances to 1 |
| consumer-level | the campaign loader bounds oversized state and reports corruption without content — **fails against the pre-repair loader** |

**Acceptance.**

| Criterion | Evidence |
| --- | --- |
| recovery observes the complete previous or complete next generation | the three-step crash matrix, each step asserting which one and that it is complete |
| silent clobber is impossible | the interleaved same-id writer is refused by code, and the winner's document is verified intact |
| input allocation is capped | refused from the `lstat` size before any read; also enforced on the proposed payload |
| corrupt state yields content-free diagnostics and remains available | fragment search over message, stack and own properties; the corrupt bytes are asserted unchanged afterwards |
| old valid checkpoint readers keep working | the pre-NW-04 compatibility case, plus `w10LongRunResilience`'s existing pre-W9 and W9-era resume proofs — 60 passed across the campaign, runtime and checkpoint suites |

**A test that reported a leak that was not one.** The corrupt-state case
originally planted `PLANTED_NW04_CHECKPOINT_SECRET_…`, and an
eight-character window of it matched the error **code**
`CHECKPOINT_CORRUPT` inside the very diagnostic that was correctly
content-free. A planted value must share no vocabulary with the diagnostics,
the module name, or the test path; it is now
`ZZQQ7_XYLOPHONE_…_MARMALADE_74`.

### NW-05 — enforce one abortable Phase-5 relay deadline

**All four defects measured through the consumer.** Against the pre-repair
relay, 4 of the 11 new cases fail — one per defect — and the hung-auth case
consumed the **full 5.0 s** injected hang, which is the difference between
"late" and "unbounded".

| Defect | Repair |
| --- | --- |
| `fetch` received no `AbortSignal`, so a rejected race left DNS, socket, headers and body running | the operation's signal is created at the boundary and passed into `fetch`; aborting stops the transport |
| the timer wrapped one ATTEMPT, so a redirect got another full budget — 15 s bounding a 30 s operation | one deadline covers both attempts; each stage gets `remainingMs()` from the shared monotonic residual |
| auth-header acquisition sat outside the timer entirely | the deadline is created BEFORE auth, and auth runs under it |
| a deadline and a transport error were indistinguishable at the catch site | `DEADLINE_EXCEEDED` / `CALLER_ABORTED` / `TRANSPORT_FAILED`, frozen in `deadline.ts` with the owning stage, surfaced as `relayFailure` and `X-Nightwatch-Relay-Failure` |

Cancellation composes: a caller's signal aborts the operation's signal, and it
is the operation's signal that reaches the transport. `dispose()` is
idempotent, clears the timer and detaches the caller listener on every
terminal path, and a test proves a disposed timer cannot fire later. Body
consumption checks the signal each iteration and cancels the reader in a
`catch`, so no stream is left owned. The clock is monotonic
(`process.hrtime`), so a wall-clock adjustment mid-operation cannot extend or
collapse the budget.

**No wall-clock assertions.** Every case asserts an operation count, a signal
state or a call order, with time injected through a fake monotonic clock and
timer. A threshold test on a shared machine measures load, not the property —
and the doubled-redirect-budget defect in particular is proven by the redirect
attempt never being ISSUED, not by measuring how long it took.

**Acceptance.**

| Criterion | Evidence |
| --- | --- |
| one documented deadline covers the whole operation | the hung-auth case never reaches the transport (`fetches === 0`); the redirect case never issues the second attempt (`targets.length === 1`) |
| every terminal path disposes timers and aborts owned work | idempotent-dispose case with a live-timer count; the disposed timer cannot fire; body reader cancelled in `catch` |
| redirect count and total time remain bounded | the bounded-chain case: exactly 2 calls, second redirect `BLOCKED` not followed |
| error categories contain no secrets | `RelayOperationError` carries only a class and a stage name; the taxonomy case asserts each mapping |
| writes are never retried | no retry path exists; the bounded-chain case pins the call count |
| a valid near-deadline request still succeeds | asserted explicitly, so the repair cannot pass by failing everything |
| measured against the defect | 4 of 11 fail pre-repair; the 7 that pass are the new module's own unit cases and the two success controls |

**Two incidental corrections, recorded rather than folded in silently.** The
declared `maxBodyBytes` option was never read — `defaultFetch` hardcoded
2 MiB — so it is now wired with that same value as its default, leaving
behaviour identical while making the declared option real. And the two
duplicated `15_000` literals became one named constant.

### NW-12 — bound SSE memory for slow or disconnected clients

**Quantified, not characterised.** One stalled fake writable and 201
published events: the pre-repair hub handed the socket **38,216 bytes**; the
repaired hub hands it **228** and nothing further. That measurement uses only
`subscribe`, `publish` and the socket's own byte count — the surface that
existed before the repair — so it fails for the defect rather than for a
missing method.

**The policy, chosen explicitly.**

| Part | Rule | Why |
| --- | --- | --- |
| 1 | while backpressured, retain exactly the NEWEST frame | invalidations need not be lossless: a client refetches a snapshot when notified, so N pending notifications and one produce the same refetch. Queued state is one frame by construction |
| 2 | heartbeats are never queued while backpressured | they carry no information and would displace the newest real invalidation |
| 3 | disconnect on `MAX_COALESCED_FRAMES` (32) or `MAX_STALL_MS` (30 s), whichever trips first | a slow client reconnects and refetches; a permanently stalled one must not be carried forever |

Healthy peers are unaffected: backpressure is per client and a stalled
client's frame is dropped rather than blocking the publish loop — asserted by
a peer receiving all 12 frames while the stalled peer holds one.

**Lifecycle.** The `drain` listener is attached ONCE per client, not per
write — attaching per write is how a listener leak starts. Removal detaches
every listener and is idempotent, so the request and the response both
emitting `close` cannot double-count. `disconnectCounts()` reports why
clients were dropped, as counters only: `WRITE_FAILED`, `COALESCE_LIMIT`,
`STALL_TIMEOUT`, `HUB_CLOSED`.

**Acceptance.**

| Criterion | Evidence |
| --- | --- |
| per-client queued state has a fixed bound | newest-only retention; `pendingFrames` is 0 or 1 in every case; byte count stops growing after the discovery write |
| stalled clients coalesce or disconnect within policy | exact coalesced count of 9 after 11 publishes; disconnection at the coalesce bound and at the stall bound, each with its own reason counter |
| healthy delivery continues | the healthy peer receives all 12 frames while its stalled neighbour holds one |
| cleanup leaves no registry entry, listener or timer | listener counts asserted 0 after a throwing write, after hub close, and after a self-close; removal is idempotent |
| the client cap still holds | a third subscriber is refused at a cap of 2, and normal delivery resumes after drain |

**An all-fail pre-repair result that was mostly meaningless.** All ten
original cases failed against the old hub — but most asserted
`clientDiagnostics()` or `disconnectCounts()`, methods the repair introduced,
so they failed on API absence rather than on the defect. The eleventh case
was added precisely to close that gap, and it is the one whose failure means
something. "Every case fails pre-repair" is worth nothing unless the failure
mode is the defect.

### NW-09 — expose review decisions through a deliberate shipped capability

**Live revalidation, and a second defect the review had not stated.** The
launcher called `createDefaultControlCenterCollector()` — the read-only half
of the factory — and never passed `reviewDecision`, so the documented
owner-local review workflow was unreachable from the shipped entry point. The
existing browser tests inject an authority directly, so they proved the
library path and never the shipped one.

The sharper defect is on the client. The UI gated its decision controls on
the per-finding `reviewIdentity`, which answers whether a review STORE
exists — not whether THIS server serves the write route. A read-only server
with a populated store therefore rendered working-looking controls whose POST
it would refuse as not found, and no DTO field let the UI know better.

**Repair.**

| Concern | Repair |
| --- | --- |
| unreachable capability | `--enable-local-review`, the only route to the write surface |
| preflight | constructing the authority resolves the private review root through the shared private-artifact policy, which after NW-02/NW-03 refuses a root inside Nightwatch source, a sibling checkout or a linked worktree; a refusal fails the start rather than downgrading to read-only |
| two halves disagreeing | both built through `createControlCenterServices`, so collector and write handler cannot derive different campaign identities for the same state |
| capability truth | `ControlCenterMetaDto.localReviewDecision`, filled by the SERVER from `options.reviewDecision === undefined` — the same expression that creates the route — overwriting any collector value |
| UI gate | gated on that capability, not on `reviewIdentity`; an absent field is DISABLED |
| uncertain POST | `readBackReviewDecision` reports RECORDED / NOT_RECORDED / UNKNOWN by review identity, and never retries |
| opaque start failure | an allowlisted `CONTROL_CENTER_[A-Z_]+` code only — no native message, no path |
| operator visibility | the launcher prints `NIGHTWATCH_CONTROL_CENTER_LOCAL_REVIEW ENABLED\|DISABLED` |

`readOnly: true` and `mutationAuthority: 'NONE'` are unchanged and still
accurate: an owner-local review decision writes only to the owner's private
store and confers no product, execution or organizational authority. The DTO
reports the review route separately rather than overloading `readOnly`, and
says so in its own comment.

Why read-back rather than retry: the store refuses a second decision on the
same binding, so a retry either duplicates the request or returns
ALREADY_DECIDED — and the operator still cannot tell which attempt recorded
it. UNKNOWN is reported as unknown rather than upgraded to "not recorded",
which would invite a second decision the store may already hold. An identity
mismatch on read-back is UNKNOWN, not a match.

**Regression.** Six cases in
`tests/unit/nw09ShippedReviewCapability.test.ts` SPAWN the real launcher:
the default read-only server with POST answered 404/405 and meta DISABLED;
the opt-in where the route answers a review RESULT rather than "not found"
and meta says ENABLED; product and environment flags still refused; a bounded
start reason asserted to contain no `/home/` and no `Error` text; and both
disagreement directions — a collector claiming ENABLED cannot enable a route
the server does not serve, and one claiming DISABLED cannot hide a route it
does.

No case writes a decision through the shipped process, because the shipped
store is the operator's real one. That boundary is deliberate: write
behaviour stays proven against an injected temporary store in
`reviewerPersistence.test.ts`, and what these cases prove is which surface
the shipped entry point actually serves.

Four UI cases: controls hidden when the server reports DISABLED even though
the finding has a review identity; failing closed when an older server omits
the field; the uncertain-outcome read-back ending in the terminal state with
exactly ONE POST; and UNKNOWN reported as unknown when the read-back itself
cannot reach the server. One existing case was strengthened rather than
weakened — a response claiming organizational authority is still refused, and
now additionally reads back and reports that nothing was recorded.

**Acceptance.**

| Criterion | Evidence |
| --- | --- |
| documented opt-in works end to end from the actual launcher | the spawned launcher with `--enable-local-review` serves the route and reports ENABLED |
| default remains read-only | spawned default: POST 404/405, meta DISABLED, `readOnly: true` unchanged |
| server and UI capability state agree | the server overwrites the collector's advisory value; both disagreement directions asserted; the UI gates on that field and fails closed without it |
| no duplicate write on retry ambiguity | exactly one POST asserted; the client reads back instead of retrying |
| unavailable review store does not masquerade as read-only | the preflight failure fails the start with `CONTROL_CENTER_REVIEW_STORE_UNAVAILABLE` |
| loopback / Origin / CSRF / identity / no-replace guarantees retained | 68 passed across `reviewerPersistence`, `controlCenterServer`, `controlCenterContracts`, `controlCenterAdapters` |
| measured against the defect | 5 of 6 launcher cases and 5 UI cases fail pre-repair; the sixth launcher case is the flag-refusal control |
| UI lane green | UI 24 passed, UI typecheck PASS, UI build PASS (3 files, 292,622 bytes, no external references) |

### NW-10 — implement bounded end-to-end dashboard pagination

**The review's diagnosis was incomplete, and following it as written would
have made the surface worse.** The finding said the server accepts a cursor
and only the UI ignores it. Measurement showed nothing consumed the cursor at
all: `boundedCollection` always sliced from index 0, and the default collector
dropped `query.cursor` after the server had validated it. Paging was cosmetic
end to end — every list DTO advertised a continuation that no layer could
honour.

So adding client cursor state alone would have produced a "load more" that
re-appended the first page forever, and identity deduplication would have
turned that into a button that visibly did nothing. The repair had to start at
the bottom.

**Repair, layer by layer.**

| Layer | Defect | Repair |
| --- | --- | --- |
| `adapters/common.ts` | always sliced `[0, limit)`; emitted a cursor it could not consume | `boundedCursorOffset` + slice `[offset, offset+limit)`; `truncated` now means "more remain AFTER this page"; past-the-end clamps to an empty final page; malformed falls back to page one |
| five list adapters | no cursor parameter | accept and forward it |
| `defaultCollector` | dropped `query.cursor` | passes it to every list projection |
| `reviewerAdapter` | corpus-aware `nextCursor` fallback built from the PAGE length, which equals the consumed count only on page one | measured from how far into the corpus the page reaches, so page two advances instead of re-emitting its own cursor |
| `reviewerAuthority` | selects the page with `ordering.slice(0, limit)`, so a cursor reaching only the projection had nothing left to select from | takes the cursor, returns the `pageOffset` it used |
| `reviewerAdapter` again | would then slice a pre-selected page a second time and skip records | `pageOffset` tells the two cases apart |
| `api.ts` | loaders requested only a limit | each takes an opaque cursor, screened against the shape the server accepts |
| `App.tsx` | no continuation state | one `usePagedCollection` hook for all five bounded views |

Deduplication is by stable identity, not position, because the cursor is an
offset into a snapshot: if the list shifts between pages an item can
legitimately arrive twice, and rendering it twice would be a visible untruth.
A changed generation resets rather than mixes, since splicing two snapshots
into one table is the failure that guard exists for. A failed CONTINUATION
keeps the loaded pages and says so; only a failed FIRST page is a view-level
error.

**Regression.** Seven server cases in
`tests/unit/nw10PaginationContinuation.test.ts`: the slice-and-report
contract; paging a 23-item corpus at limit 5 to exhaustion in exactly 5 pages
reaching every record once; a cursor past the end; nine malformed cursors; the
reviewer projection advancing; the same over real HTTP with a 12-record corpus
asserting 12 distinct records across more than one request; and a traversal
cursor refused by the server before it reaches an adapter. Every paging loop
carries a hard iteration bound, so a non-terminating continuation fails as a
test rather than hanging.

Four UI cases: a record beyond the first page becomes reachable and earlier
pages are kept; an overlapping page yields 3 loaded records rather than 4; a
failed continuation keeps what was loaded and reports it without turning the
view into an error; and a single-page list offers no continuation control at
all rather than an inert button.

**Acceptance.**

| Criterion | Evidence |
| --- | --- |
| the UI reaches a record beyond each first-page boundary | the reviewer case reaches page two; the shared hook wires runs, findings, reviewer, coverage and surfaces through the same path |
| ordering and deduplication are deterministic | exhaustion case: 23 records, 5 pages, every record exactly once; overlap case: 3 loaded, not 4 |
| generation changes cannot mix snapshots | the hook clears the accumulator when an observed generation differs mid-paging |
| controls are keyboard-operable with visible state | the control is a `button` reached by role in every case, and states loaded count, end, and continuation failure |
| server caps preserved | limits still bounded by `boundedPageLimit`; the malformed-cursor case asserts the server refuses before an adapter sees it |
| requests stay bounded | the HTTP case asserts fewer than 12 requests for a 12-record corpus and terminates on a null cursor |
| measured against the defect | 6 of 7 server cases and all 4 UI cases fail against the pre-repair code |
| no regression | 101 passed across the paging-adjacent server suites; UI 28 passed; UI typecheck and build PASS |

### NW-11 — validate and cancel dashboard requests, and coalesce refreshes

All three parts share one seam, so they were repaired together.

**Validation.** `isSnapshot` accepted any object whose `schemaVersion` merely
STARTED WITH `nightwatch.control-center.` and then cast the payload to the
requested type. A findings response therefore satisfied a reviewer read, and a
`.v1` payload satisfied the `.v3` source-summary reader.
`CONTROL_CENTER_SNAPSHOT_CONTRACTS` pins the exact version and the owned
required fields for all sixteen endpoints. Membership is
`Object.prototype.hasOwnProperty`, not `in`: a field inherited from a
prototype is not a field the server sent. Unknown ADDED fields remain
accepted deliberately — rejecting them would break forward compatibility with
a server that grew one, so the contract checks the version exactly and the
fields this client reads, and nothing more.

**Deadline and cancellation.** `fetch` received no signal, so an effect's
cleanup suppressed the state update while the transport kept running, and a
hung request had no termination at all. Each request now composes the
caller's signal with its own `AbortController` and a finite 15-second
deadline, and disposes the timer in `finally` on every path. TIMEOUT and
ABORTED are distinct error kinds from NETWORK, because an operation this
client ended is not the same fact as a service that could not be reached, and
collapsing them would send the operator after the wrong problem. An
already-aborted caller signal makes no request at all. Every effect in
`App.tsx` — overview, run detail and timeline, execution graph, campaign
summary, source graph, system map, and the paged hook — now aborts on cleanup.

**Burst coalescing.** Every notification incremented the shared refresh key
directly, and one server-side snapshot change can emit several notifications,
so a burst amplified local load in proportion to the server's chattiness. The
policy is leading edge plus one trailing follow-up over a 250 ms window: the
first event invalidates immediately so the UI stays responsive, everything
else in the window collapses into exactly one further invalidation, and a
continuing stream costs one per window rather than one per event.

**Regression.** Thirteen cases in `ui/control-center/src/api.test.ts`.

| Case | What it pins |
| --- | --- |
| exact contract with a future added field | forward compatibility is not sacrificed to validation |
| a same-namespace payload from another endpoint | the prefix check was the defect |
| an older version of the same endpoint | `.v0` does not satisfy `.v1` |
| each required field deleted in turn | the owned fields are actually required |
| an inherited `items` and `page` | own-key membership, not `in` |
| `null`, a number, a string, an array | non-objects refused outright |
| the signal reaching `fetch` | the transport is cancellable, which the defect lacked |
| an already-aborted caller | no request is issued for obsolete work |
| a hung request at the deadline | TIMEOUT, not an indefinite wait |
| timer count after success | no timer left armed against a completed operation |
| bursts of 1 / 100 / 1000 | 1 / 2 / 2 invalidations — a documented bound independent of burst size |
| ten events per window over five windows | at most one refresh per window |
| unsubscribe with a queued follow-up | the pending timer is disposed and nothing fires afterwards |

**Acceptance.**

| Criterion | Evidence |
| --- | --- |
| unsupported DTOs never reach render logic | every mismatch case rejects before returning; the loaders are the only path into the views |
| obsolete and hung work is aborted | signal asserted at the transport; already-aborted makes no request; the deadline case terminates |
| timers and listeners are disposed | timer count zero after success; unsubscribe disposes the window timer; the caller's abort listener is removed in `finally` |
| event bursts cause a documented bounded number of requests | 1 / 2 / 2 for 1 / 100 / 1000 events, and ≤ 6 for fifty events across five windows |
| the UI reports actionable safe states | TIMEOUT and ABORTED carry their own operator-facing labels, distinct from NETWORK |
| forward-compatible DTO additions are not rejected | the added-field case passes |
| measured against the defect | 10 of the 13 fail against the pre-repair client; the 3 that pass are the acceptance and disposal controls |
| UI lane green | UI 41 passed, UI typecheck PASS, UI build PASS |

### NW-08 — account for the complete test and package validation universe

**The count was stale; the deeper problem was that the gap was
unobservable.** Measured live: 341 tracked root `.test.ts`/`.smoke.ts` files,
227 selected by required lanes, **114 in no lane at all**, including
`safety`, `redaction`, `proxy`, `devLoginSecurity`, `realRunGate`,
`reviewStoreHardening` and five control-center suites. The review's `208 of
321` was directionally right and numerically stale.

But the gate's required lanes select from versioned manifests, and the
data-only inventory validated those declarations *against each other* —
never against what existed on disk. So a newly added test joined the
repository and every gate stayed green without it. No amount of registering
files fixes that; the missing thing was a relationship between the gate and
the set of tests that exist.

**Repair, part one — coverage.** Twenty-four offline, deterministic,
safety-relevant suites promoted into the required SYNTHETIC_CAMPAIGN lane.
Measured cost: 258 tests in 26 seconds, so the runtime objection the plan
anticipated does not apply to them. The authoritative gate went from 227 to
252 unique test files, with `gate:inventory` reporting zero duplicate
executions.

**Repair, part two — completeness.** `bin/lib/validation-universe.mjs` is a
pure judgement over three inputs:

| Input | Source | Why that source |
| --- | --- | --- |
| what exists | tracked Git paths | an untracked scratch file cannot enter the universe, and a tracked one cannot escape it |
| what the gate runs | the same manifests the required lanes execute from | it cannot claim coverage the gate does not provide |
| how the rest is covered | `config/validation-universe.v1.json` | each class carries a reason and the evidence lane that DOES cover it |

`AUTHORITATIVE_GATE` is derived, never declarable — a declaration must not be
able to claim gate coverage a lane does not give it.

Live result: **425 discovered, 252 authoritative gate, 173 classified, 0
unclassified.** FULL_REGRESSION 84 (`npm test`), BIN_SYNTAX 66
(`node --check`), MANUAL_OWNER 12, LIVE_APP_SMOKE 6, BROWSER_WORKFLOW 3,
UI_LANE 2. Discovery was widened beyond the review's scope to include
`tests/browser/*.browser.ts` and `tests/manual/*.ts`, because they are
executable checks and omitting them would be the same mistake at smaller
scale.

**Enforcement.** `checkValidationUniverse` runs the judgement in a REQUIRED
hardening group, and the declaration pins an `inventoryDigest` over all three
inputs. Nine violations fail closed: unclassified; double-classified; a
declared file missing from disk; a lane selecting a file that does not exist;
an excluded class claiming a file the gate runs; a class with no reason, no
evidence lane, or no members; an unknown class name; and digest drift. A
vacuous pass is refused if discovery finds implausibly few tests.

**Acceptance.**

| Criterion | Evidence |
| --- | --- |
| every discovered test belongs to exactly one required or excluded class | 252 + 173 = 425 = discovered, asserted as an equation in the live case |
| no green receipt can omit a new test silently | a new unclassified `.test.ts` fails `hardening:check` with `VALIDATION_UNIVERSE_UNCLASSIFIED`, probed against the live repository |
| every exclusion names a reason and its own evidence lane | enforced per class; a missing reason or lane is its own violation |
| exact counts and inventory digest recorded | 425 / 252 / 173 / 0 and `sha256:b35012e4e1e9a3e575b0de38` |
| local, clean, host and CI claims stay separate | the classes name distinct lanes; nothing was moved into CI that needs a host or a network |
| no duplicate execution without an independent claim | `gate:inventory` duplicates: none, across 252 files |
| the rule bites | four live probes — unclassified file, stale digest, double classification, gate contradiction — each fails with its own code; 12 permanent cases cover every path |

**Honest limit.** Promoting the remaining 84 FULL_REGRESSION suites into the
authoritative gate is a runtime decision this campaign did not take. What
changed is that the decision is now explicit, digest-pinned and enforced
instead of invisible.

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
