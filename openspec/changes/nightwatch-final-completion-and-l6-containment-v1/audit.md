# Fresh Current-Head Audit Ledger

Campaign: `nightwatch-final-completion-and-l6-containment-v1`
Audit status: IN_PROGRESS
Audit baseline: `6743401eabdbf1d3eca1d87a2dbdc3fc8cd53a20`
Scope: tracked Nightwatch repository paths only; synthetic/local execution

## Required census

- [ ] Enumerate every tracked path with `git ls-files -z`.
- [ ] Read or hash every regular tracked file and classify every path.
- [ ] Record reviewed/tracked/regular/non-regular/missing counts, bytes, LF
  lines, path digest and content digest.
- [ ] Compare the result with the predecessor audit and explain every delta.

## Required review surfaces

- [ ] Runtime source, tests, fixtures, generated files and private boundaries.
- [ ] Process, DNS, TCP, UDP, HTTP, HTTPS, WebSocket and browser lifecycle.
- [ ] Persistence/evidence/privacy/path/symlink/error/recovery boundaries.
- [ ] Dependencies, Node/npm assumptions, Control Center and build outputs.
- [ ] Quality gates, workflows, skips, retries, task/project/handoff truth and
  current-facing documentation.

## Initial remediation matrix

| ID | Severity | Area | Initial disposition |
| --- | --- | --- | --- |
| L6-01 | P1 | Rootless process/DNS/network containment is not yet proven | Reproduce; implement only if safe and mechanically provable; otherwise retain fail-closed blocker |
| TRUTH-01 | P1 | M3/M8 and CI/SHA semantics require fresh current-head reconciliation | Verify validators and add regression if needed |
| AUDIT-01 | P2 | Fresh all-file and skip/retry/dependency/resource evidence is not yet recorded | Complete before certification |
