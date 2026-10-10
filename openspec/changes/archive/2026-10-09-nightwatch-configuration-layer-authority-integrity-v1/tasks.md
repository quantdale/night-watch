Implementation is explicitly outside the planning-only audit campaign that
created this change. These tasks are declared not in scope for the current
task; none has been performed.

## 1. Reproduce and freeze the configuration contract

- [ ] ~~1.1 In a separately authorized implementation session, add an executing fixture proving an `.env`-only value is rendered/validated but absent from the current runtime child.~~
- [ ] ~~1.2 Add fixtures for unknown file-only names, malformed lines, duplicates, unreadable files, unknown declaration keys, and secret-safe diagnostics.~~

## 2. Implement strict input admission

- [ ] ~~2.1 Add recursive exact-key declaration parsing, duplicate checks, bounded input, and one shared parser used by hardening and runtime.~~
- [ ] ~~2.2 Replace permissive `.env` parsing/catch-all absence with a bounded literal grammar and categorical absent/unreadable/malformed results.~~
- [ ] ~~2.3 Define immutable admitted snapshot/provenance types and explicit CLI/process/file/default precedence.~~

## 3. Bind launchers and child environments

- [ ] ~~3.1 Route config rendering, Nightwatch CLI, agent CLI, Control Center, and direct environment selection through one admitted snapshot per command.~~
- [ ] ~~3.2 Remove post-admission reads of declared values from ambient `process.env`; pass typed values/snapshots explicitly.~~
- [ ] ~~3.3 Require explicit child `NIGHTWATCH_*` keys to exist in the declaration and preserve the fixed inherited host-key allowlist.~~
- [ ] ~~3.4 Document and test any command-specific explicit-CLI requirement without silently ignoring lower layers.~~

## 4. Prove coherence and privacy

- [ ] ~~4.1 Add cross-process precedence tests comparing config output, admitted receipt, and child-observed values.~~
- [ ] ~~4.2 Test file mutation after admission, secret redaction, unknown-variable closest-name reporting, NUL/oversize/quoting/interpolation refusal, and no effects on refusal.~~
- [ ] ~~4.3 Add total call-site enumeration plus mutation probes for discarded snapshots, ambient re-reads, permissive parsing, undeclared explicit keys, and provenance drift.~~

## 5. Acceptance and handoff

- [ ] ~~5.1 Run focused configuration/child-environment/CLI suites, root/bin typechecks, hardening/mutations, validation universe, agent/workspace/project checks, local/clean gates, and full regression.~~
- [ ] ~~5.2 Update durable documentation and examples, strict-validate this change, inspect privacy/diff, and integrate only through an owned C-00 session.~~
