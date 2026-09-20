Implementation is explicitly outside the planning-only audit campaign that
created this change. These tasks are declared not in scope for the current
task; none has been performed.

## 1. Freeze inventory and compatibility

- [ ] ~~1.1 In a separately authorized implementation session, re-run the
  ignored-artifact writer census and confirm the seven callers, declared
  schemas, default paths, explicit-output behavior, consumers, and existing
  size/count bounds have not drifted.~~
- [ ] ~~1.2 Create the checked publication inventory with one live caller,
  schema validator, maximum byte bound, default destination policy,
  publication profile, and test owner for every entry.~~
- [ ] ~~1.3 Capture deterministic valid payloads and preceding-destination
  bytes for every caller, plus current stdout/stderr, exit, permissions,
  discovery, and topology-receipt cardinality behavior.~~
- [ ] ~~1.4 Add failing structural tests for an unclassified writer, stale
  inventory row, missing validator/bound/profile, and direct publication from
  an inventoried caller.~~

## 2. Implement common admission and safe path handling

- [ ] ~~2.1 Add `bin/lib/local-report-publisher.mjs` with explicit
  `CURRENT_REPLACE` and `APPEND_IMMUTABLE` profiles and no network,
  subprocess, product, repository-discovery, or external publication
  authority.~~
- [ ] ~~2.2 Serialize the complete payload in memory, apply the exact schema,
  enforce the inventoried byte bound, and compute the content digest before
  any destination-directory, staging-file, or published-file mutation.~~
- [ ] ~~2.3 Implement bounded destination resolution and stable-identity path
  validation for repository-confined defaults and deliberate explicit output
  files; refuse traversal, symlink/broken-link ancestors or leaves, irregular
  types, escapes, and identity disagreement.~~
- [ ] ~~2.4 Map every filesystem/schema/bounds failure to safe categorical
  results that omit absolute/home paths, raw host errors, payload data,
  environment values, and credentials.~~
- [ ] ~~2.5 Add callback-spy and external-sentinel tests proving every
  preflight refusal occurs before mutation and preserves the preceding report,
  requested leaf, and external target byte-for-byte.~~

## 3. Implement atomic current-report replacement

- [ ] ~~3.1 Create unpredictable same-directory staging files exclusively at
  mode `0600`; write, flush, close, reopen, type/size/digest verify, and
  revalidate parent/destination identities before commit.~~
- [ ] ~~3.2 Atomically replace the current-report destination, order the
  required directory flush before success, and refuse unqualified platforms
  without falling back to a direct or truncating write.~~
- [ ] ~~3.3 Bind staging cleanup to the exact invocation token and filesystem
  identity so failure never deletes another process's or stale staging file.~~
- [ ] ~~3.4 Add injected-fault tests at create, partial write, flush, close,
  reopen, digest verification, identity recheck, rename, and directory-sync
  boundaries, proving old-or-new completeness and non-success on failure.~~
- [ ] ~~3.5 Race child processes publishing distinct generations and prove
  each completion is linearized, every observable file is schema-valid and
  complete, and the final bytes equal exactly one generation.~~

## 4. Implement immutable topology receipt publication

- [ ] ~~4.1 Define the bounded sortable-time/content-digest/invocation-token
  filename shape without changing the receipt payload schema or treating the
  filename as stronger authority than verified content.~~
- [ ] ~~4.2 Stage and verify each receipt privately, commit with an exclusive
  no-replace operation, retry only the bounded invocation component on a real
  collision, and flush directory metadata before persisted success.~~
- [ ] ~~4.3 Update topology receipt discovery and focused consumers to accept
  existing timestamp-only history plus the new filename shape while reading
  and validating receipt content rather than inferring truth from names.~~
- [ ] ~~4.4 Preserve truthful `--no-receipt` behavior and make every failed
  finalization non-success without replacing or deleting historical receipts.~~
- [ ] ~~4.5 Force equal timestamps and identical payloads across concurrent
  real gate-topology processes; prove one distinct `0600`, schema-valid,
  immutable receipt per successful invocation and unchanged collision
  sentinels.~~

## 5. Migrate every current-report caller

- [ ] ~~5.1 Migrate cache-key contract and record identity to
  `CURRENT_REPLACE`, preserving payload schemas, analytical verdicts, default
  destinations, and admitted explicit-output behavior.~~
- [ ] ~~5.2 Migrate release freshness, silent-zero-output, and test-oracle
  quality to `CURRENT_REPLACE` with the same compatibility and safety
  constraints.~~
- [ ] ~~5.3 Coordinate with the offline change-shadow implementation and
  migrate change-intelligence report publication only after its compiler and
  derivative preflight succeeds; preserve C-05 repository/source authority.~~
- [ ] ~~5.4 Invoke each real CLI in isolated synthetic repositories for
  success, schema failure, overflow, ancestor symlink, leaf symlink, irregular
  leaf, preceding-report, permissions, and private-error cases.~~

## 6. Enforce completeness and non-vacuity

- [ ] ~~6.1 Enable the structural rule that reconciles CLI artifact metadata,
  persisted-schema declarations, source writers, inventory rows, publisher
  profiles, validators, bounds, and test ownership.~~
- [ ] ~~6.2 Register independent mutation probes for a removed inventory row,
  changed profile, direct write, admission after mutation, skipped schema/size
  bound, followed symlink, nonexclusive staging, replaceable receipt, omitted
  flush/verification, weak mode, unsafe cleanup, raw error/path, and
  success-after-publication-failure.~~
- [ ] ~~6.3 Prove each mutation changes bytes, fails its intended focused
  control, restores bytes exactly, and leaves no destination/staging/sentinel
  residue.~~
- [ ] ~~6.4 Add validation-universe classification and authoritative-gate
  ownership for every new check so the publication boundary cannot regress as
  an advisory-only lane.~~

## 7. Acceptance and handoff

- [ ] ~~7.1 Run all focused publisher, seven real-CLI, schema lifecycle,
  topology receipt, output compatibility, concurrency, fault-injection,
  permissions, privacy, and mutation suites with exact counts.~~
- [ ] ~~7.2 Run root and bin typechecks, schema checks, hardening checks/rules/
  mutations, validation-universe, project/agent/workspace checks, local gate,
  exact-toolchain clean gate, and the complete offline regression.~~
- [ ] ~~7.3 Update architecture, operator, artifact lifecycle, schema, decision,
  and task truth only where implementation changed current behavior; preserve
  historical receipts and do not relabel ignored reports as Git authority.~~
- [ ] ~~7.4 Strict-validate this change, inspect the full diff/privacy and
  deletion surfaces, integrate only through an owned C-00 session, and report
  exact-head CI as executed evidence or explicit non-evidence.~~
