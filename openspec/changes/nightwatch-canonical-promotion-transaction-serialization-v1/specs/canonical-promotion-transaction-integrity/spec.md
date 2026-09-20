## ADDED Requirements

### Requirement: Canonical apply is globally serialized per repository target
The system SHALL acquire one exclusive, durable apply transaction for the canonical repository/checkpoint/fixed-target preimage before consuming an approval or making a source write. The authority SHALL serialize distinct promotions and approvals, not merely repeated use of one approval.

#### Scenario: Distinct approvals race from one preimage
- **WHEN** two valid promotions with different fresh approvals concurrently apply against the same clean head and target preimage
- **THEN** exactly one transaction may consume its approval and reach the source-write boundary, while the other fails before approval consumption or source mutation

#### Scenario: An incomplete transaction exists
- **WHEN** a new apply discovers a live, abandoned, corrupt, or uncertain operation for the canonical target
- **THEN** it performs no approval consumption or source write and requires inspection/reconciliation

### Requirement: Mutable preconditions are revalidated under apply authority
While holding the exclusive transaction, the system SHALL revalidate owner/C-00 authority, canonical repository identity, exact head, source and contract digests, clean status, fixed target path, parent and leaf identities/types, target preimage, plan, approval, and rendered postimage before consumption and again at the final relevant boundary before rename.

#### Scenario: Target changes after initial preflight
- **WHEN** target bytes, target identity, parent identity, HEAD, or dirty set changes before atomic commit
- **THEN** apply terminates without a source write and records the exact safe refusal stage

#### Scenario: Repository is not the authorized owned checkout
- **WHEN** a caller selects another checkout or lacks the fresh concrete promotion authority
- **THEN** transaction acquisition fails before private-state or source mutation

### Requirement: Transaction stages are immutable and truthful
The system SHALL durably record immutable prepared, approval-consumed, write-attempted, target-observed, durability, receipt-committed, and terminal stages linked by exact transaction and digest identity. A transaction that reaches `write-attempted` SHALL permanently spend its maximum one-source-write budget even when later state is uncertain.

#### Scenario: Process dies after approval consumption
- **WHEN** apply terminates after the consumption record but before source commit
- **THEN** the journal exposes a spent approval and incomplete transaction, the target is not automatically rewritten, and later apply remains blocked pending reconciliation

#### Scenario: Process dies after rename before receipt
- **WHEN** the canonical postimage may have been renamed but no verified terminal receipt exists
- **THEN** the operation is non-success/uncertain and neither restart nor reconciliation performs another source write

### Requirement: Applied success requires file and directory durability
The system SHALL exclusively stage, flush, close, reopen and verify the exact postimage, atomically rename it after identity revalidation, durably synchronize the parent directory, re-read the committed target, and verify the one-file changeset before `APPLIED` or a success receipt is legal. Required durability SHALL NOT be best-effort.

#### Scenario: Platform cannot qualify directory durability
- **WHEN** the required parent-directory synchronization primitive is unavailable
- **THEN** apply is refused before approval consumption and source write

#### Scenario: Directory synchronization fails after rename
- **WHEN** rename succeeded but directory synchronization or post-commit verification fails
- **THEN** the result is non-success with `canonicalSourceWrites: 1` and uncertain durability; no `APPLIED` receipt is emitted

### Requirement: Recovery observes but never repeats canonical mutation
Inspection and reconciliation SHALL validate transaction records and compare the fixed target with exact prepared preimage/postimage digests. They SHALL NOT invoke the renderer write, rename/copy the target, reuse an approval, delete ambiguous records, or infer success from absence alone.

#### Scenario: Target equals exact preimage after interruption
- **WHEN** inspection proves the target remains the prepared preimage and no source commit was durably recorded
- **THEN** it reports no surviving canonical change while preserving the spent/incomplete transaction truth

#### Scenario: Target is neither preimage nor postimage
- **WHEN** target bytes diverge from both admitted digests
- **THEN** reconciliation reports outcome uncertainty, leaves bytes unchanged, and blocks future apply

### Requirement: Transaction records preserve privacy and bounded authority
Transaction, error, inspection, and receipt surfaces SHALL contain only bounded IDs, fixed relative target identity, digests, enums, counts, and safe timestamps. They SHALL NOT contain source/catalog bytes, candidate prose, absolute/home paths, raw host errors, credentials, environment values, customer data, Git-write authority, or publication authority.

#### Scenario: Underlying error contains a private path
- **WHEN** a store, filesystem, or Git observation fails with a raw machine path
- **THEN** public and durable outputs contain only the mapped categorical failure

### Requirement: Concurrency and interruption enforcement is non-vacuous
Authoritative tests SHALL race distinct approvals in real child processes and terminate apply at every transaction/write boundary. Mutation probes SHALL detect approval-keyed serialization, missing under-authority revalidation, second-write recovery, swallowed directory sync, success without terminal receipt, unsafe path identity, and writing reconciliation.

#### Scenario: Distinct-approval process race
- **WHEN** child processes are released together after constructing two valid independently approved promotions for one preimage
- **THEN** total canonical source writes across both processes are at most one and journal/approval/receipt/target truth agrees with the sole winner or explicit uncertainty

#### Scenario: A transaction control is mutated away
- **WHEN** a registered probe disables one mandatory serialization, durability, recovery, or authority control
- **THEN** the intended focused test fails and exact source bytes are restored after the probe

### Requirement: Hardening grants no standing promotion authority
The hardened machinery SHALL retain `NEXT_PROMOTION_AUTHORITY: NONE` and SHALL require a separately authorized concrete candidate, fresh current-source evidence, fresh one-shot approval, and one bounded apply transaction. Correct transaction mechanics SHALL NOT imply permission to execute them.

#### Scenario: Candidate is available without fresh authority
- **WHEN** a portfolio member is `AVAILABLE_NOT_ADOPTED` but no new owner authorization exists
- **THEN** apply is refused before transaction creation and all canonical/private/Git write counters remain zero
