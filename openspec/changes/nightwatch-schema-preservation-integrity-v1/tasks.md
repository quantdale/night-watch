Implementation is explicitly outside the planning-only audit campaign that
created this change. These tasks are declared not in scope for the current
task; none has been performed.

## 1. Reproduce preservation gaps safely

- [ ] ~~1.1 Add synthetic stores proving >10,000 current candidates report `truncated: false` and unreadable/malformed candidates vanish from the current export.~~
- [ ] ~~1.2 Add an external-looking destination with a symlinked ancestor into a disposable repository and prove the current writer crosses the lexical boundary.~~
- [ ] ~~1.3 Add migration adapters using relative/symlink/hardlink aliases and prove current string comparison/constant retention can misreport safety.~~

## 2. Add truthful export inventory and receipts

- [ ] ~~2.1 Define v2 inventory/export/receipt schemas with bounded counts, safe failure classes, complete/partial/refused outcomes, and no lifecycle authority for partial output.~~
- [ ] ~~2.2 Snapshot matching candidates before limits, pin leaf identities, perform bounded no-follow reads, and detect listing/read replacement.~~
- [ ] ~~2.3 Refuse complete preservation on any omitted, unreadable, malformed, unsupported, or changed candidate; preserve diagnostic partial output only under explicit semantics.~~
- [ ] ~~2.4 Prove sanitizer bounds/redaction and output size against adversarial records.~~

## 3. Harden destination publication

- [ ] ~~3.1 Walk/pin existing destination ancestry, reject links and real routes into canonical/workspace paths, and validate the absent leaf before mutation.~~
- [ ] ~~3.2 Implement 0600 exclusive staging, bounded write, file flush/close/reopen digest verification, no-replace commit, and directory sync.~~
- [ ] ~~3.3 Add non-writing inspection/recovery for interrupted stage/commit/receipt states with path-redacted outcomes.~~

## 4. Prove non-destructive migration

- [ ] ~~4.1 Replace raw string comparison with qualified source/destination identities and exclusive destination publication.~~
- [ ] ~~4.2 Bind original preimage identity/digest and reread it after every attempted new-record write before claiming retention.~~
- [ ] ~~4.3 Add explicit RETAINED/CHANGED/MISSING/INDETERMINATE states and privacy-safe migration receipts.~~
- [ ] ~~4.4 Test aliases, destination races, corrupt transforms, disk/full faults, readback drift, original drift, and killed children at every boundary.~~

## 5. Enforcement and acceptance

- [ ] ~~5.1 Register structural/mutation checks for pre-slice truncation, swallowed record errors, unsafe ancestry, non-durable publication, string-only identity, and constant retention.~~
- [ ] ~~5.2 Run focused schema/export/migration/private-path suites, root/bin typechecks, hardening/mutations, validation universe, agent/workspace/project checks, local/clean gates, and full regression.~~
- [ ] ~~5.3 Update durable lifecycle documentation without running a migration/ORPHAN decision, strict-validate, inspect privacy/diff, and integrate only through an owned C-00 session.~~
