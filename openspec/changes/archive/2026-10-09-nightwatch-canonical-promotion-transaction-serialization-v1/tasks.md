Implementation is explicitly outside the planning-only audit campaign that
created this change. These tasks are declared not in scope for the current
task; none has been performed.

## 1. Freeze authority and reproduce the race safely

- [ ] ~~1.1 In a separately authorized implementation session, confirm the
  retained promotion authority remains `NONE` and re-audit apply/storage/tests
  for intervening transaction changes.~~
- [ ] ~~1.2 Build two distinct synthetic promotions and approvals against one
  clean repository head/preimage and add a barrier-driven process test that
  demonstrates both current applies can reach the write boundary.~~
- [ ] ~~1.3 Add killed-process fixtures for every boundary from approval
  consumption through terminal receipt, with exact write/target/store counts.~~

## 2. Add private transaction schemas and storage

- [ ] ~~2.1 Define strict prepared, consumption, write-attempt, observation,
  durability, receipt, terminal, and reconciliation records with canonical
  digests, bounded fields, and privacy-safe enums.~~
- [ ] ~~2.2 Implement a symlink-safe, owner-only, bounded append-only operation
  store and repository/target exclusive lease with durable no-replace writes.~~
- [ ] ~~2.3 Add read-only inspection that validates record order/digests,
  duplicate/missing stages, lease state, target digests, and Git status without
  mutation.~~
- [ ] ~~2.4 Test malformed, truncated, reordered, duplicate, symlinked,
  permission-divergent, oversized, and stale-looking transaction state.~~

## 3. Serialize and revalidate canonical apply

- [ ] ~~3.1 Acquire the repository/checkpoint/target transaction before
  approval consumption; reject competing/incomplete operations regardless of
  approval ID.~~
- [ ] ~~3.2 Re-run owner/C-00 authority, exact head/source/contract, clean
  status, fixed target/parent identities, preimage, plan, approval, and
  postimage checks while holding authority.~~
- [ ] ~~3.3 Durably commit prepared and approval-consumed stages in the required
  order, preserving existing per-approval no-replace consumption.~~
- [ ] ~~3.4 Revalidate mutable repository/target identities immediately before
  write and prove every disagreement reaches zero canonical writes.~~

## 4. Make the one write durable and truth-coupled

- [ ] ~~4.1 Qualify safe staging, file flush/verify, atomic same-directory
  rename, parent-directory sync, and postimage verification before consumption.~~
- [ ] ~~4.2 Replace best-effort directory sync with fail-closed staged outcomes
  and record write-attempted before the source-write boundary.~~
- [ ] ~~4.3 Couple `APPLIED` and success receipt to exact postimage, one-file
  changeset, file/directory durability, immutable receipt, and terminal record.~~
- [ ] ~~4.4 Preserve `canonicalSourceWrites: 1` and explicit uncertainty for
  every failure after rename; never retry or roll back automatically.~~

## 5. Add non-writing reconciliation

- [ ] ~~5.1 Implement explicit owner reconciliation that observes exact
  preimage/postimage/divergent state and appends a recovery record without
  renderer invocation or target mutation.~~
- [ ] ~~5.2 Keep future apply blocked for corrupt/uncertain operations and
  prevent approval reuse, transaction reset, silent lease deletion, or
  inference from missing files.~~
- [ ] ~~5.3 Add preimage, postimage-with-complete-durability,
  postimage-with-uncertain-durability, divergent, and missing-target cases.~~

## 6. Concurrency, fault, privacy, and mutation proof

- [ ] ~~6.1 Race distinct approvals repeatedly and prove total writes at most
  one, loser consumption zero, and coherent final target/journal/receipt state.~~
- [ ] ~~6.2 Inject faults at every store, consume, stage, flush, close, verify,
  identity check, rename, directory sync, observation, receipt, and terminal
  boundary; prove honest restart inspection.~~
- [ ] ~~6.3 Register mutations for approval-keyed locking, missing recheck,
  second-write recovery, swallowed sync, success without receipt/terminal,
  unsafe path identity, writing reconciliation, and authority bypass.~~
- [ ] ~~6.4 Prove public/durable errors omit paths, raw errors, source bytes,
  candidate prose, credentials, environment/customer data, and publication or
  Git authority.~~

## 7. Acceptance and handoff

- [ ] ~~7.1 Run focused promotion/sandbox/catalog/provenance/policy/project-state
  suites, root/bin typechecks, hardening/mutations, validation-universe,
  agent/workspace/project checks, local gate, clean gate, and full regression.~~
- [ ] ~~7.2 Preserve `NEXT_PROMOTION_AUTHORITY: NONE`, update durable truth only
  for implemented mechanics, strict-validate this change, inspect privacy/diff,
  and integrate only through an owned C-00 session.~~
