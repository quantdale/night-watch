## Context

`bin/evidence-retention.mjs` currently writes one `STARTED` receipt containing
an empty deleted set, removes every admitted candidate directory, and then
overwrites that same pathname with the final result. Both writes are
best-effort. A crash between removal and the overwrite leaves no durable
target outcome, while a final-write failure returns `receiptFinalized: false`
without changing an `APPLIED` or `PARTIAL` result into CLI failure. The
irreversible filesystem state can therefore disagree with both the receipt
and the process exit status.

Retention remains an explicit owner action over already-unreferenced,
whole-directory evidence candidates. The design must preserve that narrow
authority, never inspect or rewrite artifact contents, never infer that a
missing path was deleted by Nightwatch, and never turn recovery into an
automatic second deletion attempt.

## Goals / Non-Goals

**Goals:**

- Durably bind the exact reviewed plan and confirmation authority before the
  first mutation.
- Preserve an append-only outcome trail across crashes at every deletion and
  persistence boundary.
- Make `APPLIED`, `PARTIAL`, and exit success possible only after a durable,
  verified terminal record exists.
- Block overlapping or subsequent applies while any operation is incomplete,
  corrupt, or uncertain.
- Provide bounded, read-only inspection and explicit owner reconciliation
  without inventing historical certainty or repeating deletion.
- Keep journal files owner-only, path-confined, symlink-safe, bounded, and
  integrity-checked without claiming resistance to an owner who can rewrite
  the entire local store.

**Non-Goals:**

- Adding automatic retention, new deletion eligibility, recursive
  best-effort cleanup, or unattended recovery.
- Reconstructing whether an absent target was deleted by Nightwatch when no
  durable outcome proves it.
- Re-deleting a target during recovery or treating absence as successful
  deletion evidence.
- Making evidence artifacts mutable, storing raw artifact/customer content in
  the journal, or publishing retention history.
- Implementing this proposal during the planning-only audit campaign.
- Granting product, Alphaus, database, cloud, network, credential, or sibling
  repository write authority.

## Decisions

### Record each operation as an append-only journal directory

Each apply creates a unique operation directory under an owner-only local
retention journal root. Its versioned records are immutable once committed:

- `prepared.json` binds the operation ID, schema version, source SHA, reviewed
  plan digest, refusal-set digest, confirmation-token digest, creation time,
  and ordered candidate identifiers and sizes;
- bounded per-target outcome records bind sequence number, candidate identity,
  attempted action, safe result code, observed postcondition, and the prepared
  record digest; and
- `terminal.json` binds the prepared/outcome digest chain, exact totals,
  terminal status, completion time, and recovery state.

Records contain only already-safe candidate-relative identities, bounded
counts/sizes, digests, timestamps, and fixed enums. They never contain artifact
contents, absolute/home paths, credentials, environment values, raw errors, or
unbounded command output.

An append-only operation was chosen over overwriting a single receipt because
an overwrite erases the last known-good state and cannot show which outcome
was durable before interruption. A database or general write-ahead-log
dependency was rejected as unnecessary authority and complexity for a small
local owner tool.

### Make persistence precede and follow every irreversible boundary

The complete prepared record must be durably committed and re-read before any
remove callback is reachable. After each removal attempt, its outcome record
must be durably committed and re-read before the next target is attempted. A
terminal record is committed only after the expected outcome sequence is
complete and internally consistent.

Durable commit means bounded serialization into a new regular file opened
exclusively, file flush and close, directory metadata flush, and subsequent
schema/digest verification through a separately opened descriptor. A platform
where the required durability or safe-open primitives are unavailable is not
admitted for apply.

There remains an unavoidable crash window after a filesystem removal succeeds
but before its outcome record commits. Recovery classifies that target as
`OUTCOME_UNCERTAIN`; it does not claim that Nightwatch deleted it. This
preserves truth even though it cannot provide atomicity across two independent
filesystem operations.

Alternative considered: pre-record every target as deleted. That would make a
pre-removal crash falsely claim an irreversible action and is rejected.

### Serialize apply and fail closed on every incomplete operation

An apply obtains an exclusive journal-root lease before creating its prepared
record. Lease acquisition and operation discovery reject symlinks, irregular
files, duplicate identities, unsupported schema versions, corrupt digests,
and ambiguous state. A live competing operation is `RETENTION_APPLY_BUSY`; an
abandoned, incomplete, corrupt, or uncertain operation is
`RETENTION_RECONCILIATION_REQUIRED`. In every case, no removal callback runs.

Process liveness alone cannot authorize takeover because PID reuse and host
restart are ambiguous. A stale-looking lease may be reported, but it is never
silently removed and never makes an incomplete journal safe to ignore.

Alternative considered: last-writer-wins receipts guarded only by a PID in the
filename. That does not serialize independent processes or recover an
interrupted operation and is rejected.

### Separate read-only inspection from explicit reconciliation

A read-only inspection command validates all journal records and compares each
prepared candidate with its durable outcome and current path state. It reports
only mechanically proven facts:

- a valid outcome proves the recorded attempt/result;
- a prepared candidate with no outcome is incomplete;
- an absent target without a durable successful outcome is uncertain, not
  retrospectively deleted;
- a present target without an outcome remains unattempted/uncertain; and
- corruption or digest disagreement remains tampering/uncertainty.

Any future owner-authorized reconciliation writes a new immutable recovery
record; it never edits prior records, repeats deletion, or upgrades an
uncertain outcome to proven success. A terminal recovery record may close the
operation only with an explicit non-success class that preserves every
uncertainty. New apply remains blocked until that bounded reconciliation has
been durably completed.

### Align result and exit semantics with durable terminal truth

Pre-mutation preparation failure yields `BLOCKED`, records no deletion, and
exits non-zero. Any error after a removal callback becomes reachable but before
terminal verification yields `MUTATION_RECORD_INCOMPLETE`, exits non-zero, and
names the read-only inspection/reconciliation action. `APPLIED` and `PARTIAL`
are legal only when the corresponding terminal record has been durably
verified. `PRESERVED` remains legal only for a terminal no-deletion operation.

Stdout is a bounded mirror of durable state, never substitute authority. An
uncaught signal or process death naturally remains non-success because no
verified terminal record exists; the next invocation detects the incomplete
journal before planning or mutation.

### Prove the boundary with injected faults and child-process interruption

Persistence, removal, and time/identity operations receive narrow injectable
dependencies in tests. A fault matrix covers every boundary before/after
prepared commit, each target removal, each outcome commit, and terminal commit.
Child-process tests terminate execution at representative real process
boundaries and then run inspection/new apply. Concurrency tests race two apply
processes. Tamper tests truncate, replace, reorder, duplicate, symlink, or alter
records. Callback spies prove no mutation after any refusal.

The mutation registry must target the real implementation surfaces so a
disabled flush/verification, success-on-finalization-failure, missing
incomplete-operation check, outcome reordering, symlink acceptance, or
recovery re-delete is detected non-vacuously.

### Bound and isolate journal retention

The journal root is separate from evidence candidate roots and is never itself
eligible for evidence retention. Discovery has fixed operation/record/byte
limits. Limit exhaustion blocks apply with a safe reason rather than pruning
history. Any later journal archival or deletion requires a separate explicit
owner policy and is outside this change.

## Risks / Trade-offs

- **A crash can still occur between deletion and outcome commit** -> preserve
  the prepared intent and classify the target as uncertain; never fabricate
  atomicity or retry deletion.
- **Durability primitives vary by filesystem/platform** -> qualify supported
  platforms explicitly and refuse apply where exclusive safe-open, flush, or
  directory durability cannot be established.
- **Append-only records consume local space** -> enforce strict per-operation
  and discovery bounds; require a separate reviewed policy for archival.
- **A stale lease can require manual action** -> provide precise read-only
  diagnostics and explicit reconciliation rather than unsafe automatic
  takeover.
- **Journal corruption can block future retention** -> retain immutable digest
  evidence and deterministic recovery instructions; safety takes precedence
  over deletion availability.
- **Per-target flushes make retention slower** -> candidate counts are already
  bounded and owner-invoked; truthful crash recovery outweighs throughput.

## Migration Plan

1. In a future authorized implementation session, define the owned-key journal
   schemas, safe enums, canonical digest subjects, and bounded path layout.
2. Add symlink-safe journal-root discovery, exclusive lease acquisition, and
   durability capability qualification with refusal-only tests first.
3. Add prepared, outcome, terminal, and recovery writers/readers with
   round-trip, corruption, privacy, and bounds coverage.
4. Refactor retention apply behind injectable mutation/persistence seams and
   enforce prepared-before-remove and outcome-before-next ordering.
5. Change CLI results/exits and add the read-only inspection plus explicit
   reconciliation workflow.
6. Add fault-injection, killed-child, concurrent-apply, tamper, hardening, and
   mutation tests before enabling the new apply path.
7. Update operator and safety documentation, run the full validation cone,
   and integrate only through the owned C-00 session protocol.

Existing historical receipts remain historical evidence and are not relabeled
as journal operations. Migration must not scan or mutate evidence artifacts.
Rollback may disable apply and retain journals for inspection; rollback to the
current best-effort overwrite path is forbidden once a journaled mutation has
occurred.

## Open Questions

- Which currently supported filesystems/platforms provide the exact directory
  durability semantics required by the implementation? Resolve with local
  synthetic qualification tests before admitting apply on each platform.
- Should explicit reconciliation terminalize an uncertain operation or leave
  it permanently open while an owner waiver permits later unrelated applies?
  Choose one fail-closed, auditable policy before implementation; neither
  option may reinterpret uncertainty as successful deletion.
