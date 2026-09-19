Implementation is explicitly outside the planning-only audit campaign that
created this change. These tasks are declared not in scope for the current
task; none has been performed.

## 1. Freeze the journal contract

- [ ] ~~1.1 Define owned-key schemas for prepared, per-target outcome,
  terminal, recovery, inspection, and CLI-result records with bounded fields,
  fixed enums, canonical encodings, and full digest subjects.~~
- [ ] ~~1.2 Define the owner-local operation-directory layout, unpredictable
  operation identity, candidate-relative identity grammar, record ordering,
  size/count limits, permissions, and journal/evidence root separation.~~
- [ ] ~~1.3 Add parser and canonicalizer tests for valid records and every
  unknown, duplicate, missing, malformed, oversized, non-canonical,
  unsupported-version, privacy-forbidden, and digest-mismatched value.~~

## 2. Establish safe storage and exclusive operation authority

- [ ] ~~2.1 Implement path-confined journal discovery that rejects symlinks,
  irregular entries, duplicate operation identities, path escapes, and
  journal roots inside evidence candidates.~~
- [ ] ~~2.2 Implement owner-only root/operation creation and exclusive apply
  leasing without relying on PID liveness or age as takeover authority.~~
- [ ] ~~2.3 Qualify required regular-file exclusive-open, file flush,
  directory flush, reopen, and verification semantics per supported platform;
  refuse apply where the capability cannot be proven.~~
- [ ] ~~2.4 Add concurrent-process tests proving at most one prepared
  operation and zero losing-process removal callbacks.~~

## 3. Implement append-only durable records

- [ ] ~~3.1 Implement immutable prepared-record creation, durable commit,
  reread verification, and exact binding to plan/refusal/confirmation/source
  authority before removal is reachable.~~
- [ ] ~~3.2 Implement ordered immutable target-outcome records with a prepared
  digest link, safe result code, bounded postcondition, durable commit, and
  verification before the next removal.~~
- [ ] ~~3.3 Implement immutable terminal records that verify the complete
  candidate/outcome sequence, digest chain, totals, status, and completion
  time before success is returnable.~~
- [ ] ~~3.4 Prove every record uses exclusive creation, owner-only modes,
  symlink-safe descriptors, bounded serialization, close/error handling, and
  no overwrite of historical bytes.~~

## 4. Refactor apply around the transaction boundary

- [ ] ~~4.1 Extract narrow injectable persistence, removal, time, and identity
  dependencies without broadening deletion authority or exposing a general
  filesystem executor.~~
- [ ] ~~4.2 Enforce prepared-before-first-removal, outcome-before-next-removal,
  stop-on-recording-failure, and terminal-after-complete-outcomes ordering.~~
- [ ] ~~4.3 Preserve refusal-first planning, exact confirmation, interactive
  owner gating, whole-directory-only removal, symlink refusal, candidate
  bounds, immutable evidence contents, and no automatic retention.~~
- [ ] ~~4.4 Change result/exit semantics so preparation failure is `BLOCKED`,
  any post-mutation nonterminal state is `MUTATION_RECORD_INCOMPLETE`, and
  `APPLIED`/`PARTIAL`/`PRESERVED` require verified terminal truth.~~

## 5. Add inspection and explicit reconciliation

- [ ] ~~5.1 Implement bounded read-only journal inspection that distinguishes
  proven outcomes, incomplete targets, absent-without-proof uncertainty,
  present-without-outcome state, corruption, and valid terminal closure.~~
- [ ] ~~5.2 Add a precise recovery action to nonterminal CLI results while
  proving inspection performs no write, deletion, or mutation-authority
  acquisition.~~
- [ ] ~~5.3 Resolve the open reconciliation policy, then implement explicit
  owner-invoked immutable recovery records that preserve uncertainty and never
  retry deletion or edit prior records.~~
- [ ] ~~5.4 Keep all later applies blocked until reconciliation is durably
  terminal under the chosen fail-closed policy; prove failed reconciliation
  leaves the operation blocked.~~

## 6. Adversarial, privacy, and mutation proof

- [ ] ~~6.1 Add a deterministic fault matrix at every prepared, removal,
  outcome, and terminal boundary; assert exact durable bytes/state, exit class,
  and zero forbidden later callbacks.~~
- [ ] ~~6.2 Add child-process kill tests after preparation and around removal,
  outcome, and terminal transitions; prove the next invocation detects the
  incomplete operation before planning or mutation.~~
- [ ] ~~6.3 Add tamper/truncation/replacement/reordering/duplication/symlink,
  stale-lease, unsupported-platform, bounds-exhaustion, and path-alias tests.~~
- [ ] ~~6.4 Add privacy-contract tests proving journal records, diagnostics,
  and stdout omit artifact contents, credentials, environment, usernames,
  absolute/home paths, raw errors, and unbounded output.~~
- [ ] ~~6.5 Register non-vacuous production-surface mutations for disabled
  durable verification, success after terminal failure, incomplete-operation
  bypass, outcome reordering, symlink acceptance, and recovery re-deletion;
  prove detection and byte-for-byte restoration.~~

## 7. Documentation and certification

- [ ] ~~7.1 Document journal authority, result/exit meanings, read-only
  inspection, explicit reconciliation, incomplete-operation handling,
  supported durability platforms, and owner recovery procedure.~~
- [ ] ~~7.2 Update evidence lifecycle, safety, retention, hardening, validation,
  project-state, and continuity surfaces without relabeling historical
  best-effort receipts as crash-consistent operations.~~
- [ ] ~~7.3 Run focused unit/process tests, mutation checks, hardening rules,
  validation-universe checks, root/bin typechecks, local gate, and the required
  clean-checkout gate.~~
- [ ] ~~7.4 Strict-validate this change, inspect the deletion/privacy surface,
  integrate only through the owned C-00 session, and record exact-head CI
  evidence without projecting execution that did not occur.~~
