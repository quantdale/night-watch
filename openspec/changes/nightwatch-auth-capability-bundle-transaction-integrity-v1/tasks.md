Implementation is explicitly outside the planning-only audit campaign that created this change. These tasks are declared not in scope for the current task; none has been performed.

## 1. Establish the complete boundary

- [ ] ~~1.1 In a separately authorized implementation session, syntax-discover every storage-state/lifecycle writer and authenticated consumer, emit a stable census/digest, and fail on unclassified or stale entries.~~
- [ ] ~~1.2 Add tests proving direct capture and automatic DEV refresh currently publish different lifecycle outcomes, including refresh leaving `UNKNOWN_AGE`.~~
- [ ] ~~1.3 Define versioned generation, pointer, lease, recovery, and preflight-identity schemas with strict exact-key parsers and bounded fields.~~

## 2. Implement bundle publication and recovery

- [ ] ~~2.1 Stage owner-only immutable storage state and lifecycle record from the same bytes; revalidate inode/size/metadata/digest before commit.~~
- [ ] ~~2.2 Implement destination-scoped writer exclusion, fsync/rename/current-pointer ordering, previous-generation retention, and categorical incomplete-state recovery.~~
- [ ] ~~2.3 Constrain all paths/ancestors/leaves, reject aliases/symlinks, and make cleanup generation-owned and idempotent.~~

## 3. Convert writers and consumers

- [ ] ~~3.1 Convert direct auth capture, automatic DEV refresh, adoption, and synthetic capture to the shared transaction; remove independent publication authority.~~
- [ ] ~~3.2 Return a versioned generation identity from lifecycle preflight and bind every authenticated launcher to final exact-generation revalidation.~~
- [ ] ~~3.3 Add explicit valid-legacy-pair migration and metadata-only status reporting without inferring capture age or deleting the old pair before durable success.~~

## 4. Adversarial proof

- [ ] ~~4.1 Inject interruption/failure at every write, fsync, rename, pointer, directory-sync, cleanup, and recovery boundary; prove previous-or-new visibility.~~
- [ ] ~~4.2 Exercise same-process and cross-process races, stale/live leases, symlink/ancestor/alias swaps, byte changes, expiry at final admission, and reader/writer overlap.~~
- [ ] ~~4.3 Run secret sentinels through records, errors, status, manifests, and recovery; prove no secret/customer value or unsafe path is emitted.~~
- [ ] ~~4.4 Register mutations for writer bypass, missing fsync, early pointer switch, skipped digest recheck, generation switch after preflight, and premature prior-generation deletion.~~

## 5. Acceptance and migration handoff

- [ ] ~~5.1 Run focused and full tests, root/bin typechecks, writer census, hardening/mutations, continuity/workspace/project checks, local/clean/topology gates, and full regression with exact results.~~
- [ ] ~~5.2 Update auth lifecycle/runbook/safety documentation, strict-validate this change, inspect privacy/diff, and integrate only through an owned C-00 session without a real auth capture.~~
