# Fresh Current-Head Audit Ledger

Campaign: `nightwatch-final-completion-and-l6-containment-v1`
Audit status: H0_COMPLETE_M1_IN_PROGRESS
Audit baseline: `6743401eabdbf1d3eca1d87a2dbdc3fc8cd53a20`
Scope: tracked Nightwatch repository paths only; synthetic/local execution

## Required census

- [x] Enumerate every tracked path with `git ls-files -z`.
- [x] Read or hash every regular tracked file and classify every path.
- [x] Record reviewed/tracked/regular/non-regular/missing counts, bytes, LF
  lines, path digest and content digest.
- [x] Compare the result with the predecessor audit and explain every delta.

### H0 receipt

The live NUL-safe manifest at `HEAD=31a8b02e40c782b76c189cc422ba356c47603dac`
contained `1389` tracked paths. All `1389` were present, regular, readable and
hashed; non-regular and missing counts were both `0`, so reviewed count equals
tracked count. Aggregate size was `15128308` bytes and `302189` LF lines.
The path-manifest digest was
`sha256:8f8a0eb842cc8f538a7d196c226893daf07eba704eab2a8ab349b7a1219d7d21`;
the content manifest digest (sorted `path\0sha256(file)\0` records) was
`sha256:8a244561ccbb151f497154ba9978e78bee4c37302abd469dd989ac71d17bdbbf`.

Role counts were: `agent-continuity=460`, `config=26`,
`corpus-fixture=112`, `durable-doc-history=66`, `gate-tooling=57`,
`root-metadata=2`, `runtime-source=412`, `test=240`, `UI=14`.
The classifier was deterministic and path-based: agent/task metadata,
tests/scenarios, corpus, UI, `src`, tooling/gates, docs/OpenSpec and root
metadata were assigned to those roles; role assignment is review metadata,
not runtime authority.

Compared with the predecessor's recorded `1372` at `e26b649`, the exact Git
tree at that baseline was `1372`; the subsequent validated repair checkpoint
added five tracked paths (the four successor-task continuity files and the
deterministic OOPS fixture), making the `72af3a8`/`6743401` tree `1377`.
This campaign added twelve tracked planning/continuity paths: four successor
task files, six successor OpenSpec artifacts including two specs and the
required audit ledger, the OpenSpec route marker, and `openspec/config.yaml`.
There were no deletions or unexplained paths; the current total is therefore
`1389`. The old `1372` report did not include the five paths added by the
repair checkpoint and is retained as historical evidence.

## Required review surfaces

- [x] Runtime source, tests, fixtures, generated files and private boundaries.
- [x] Process, DNS, TCP, UDP, HTTP, HTTPS, WebSocket and browser lifecycle.
- [x] Persistence/evidence/privacy/path/symlink/error/recovery boundaries.
- [x] Dependencies, Node/npm assumptions, Control Center and build outputs.
- [x] Quality gates, workflows, skips, retries, task/project/handoff truth and
  current-facing documentation.

The full regular-file read/hash pass and aggregate scans covered all tracked
paths. The scan totals were: markers `80` matches / `33` files;
skip/retry/only/fixme/slow `653` / `225`; suppressions `4` / `4`;
process-launch terms `391` / `116`; network primitive terms `366` / `84`;
filesystem/path-safety terms `2679` / `384`; lifecycle terms `232` / `57`;
authority/currentness terms `18838` / `1130`; secret-like terms `2786` /
`418`; dynamic-evaluation terms `69` / `46`. These are discovery counts,
not defect counts; historical prose and test fixtures account for many hits.

## Initial remediation matrix

| ID | Severity | Area | Initial disposition |
| --- | --- | --- | --- |
| L6-01 | P1 | Rootless process/DNS/network containment is not yet proven | Reproduce direct child/descendant DNS/TCP/UDP/HTTP escape and relay topology; implement only if safe and mechanically provable; otherwise retain fail-closed blocker |
| L6-02 | P1 | OOPS launch currently uses plain `spawn`, while comments describe an absent namespace | Bind launch to a proven capability or correct the truth boundary and regression-test pre-spawn failure |
| L6-03 | P1 | Browser speculative DNS remains outside the L5 proxy authority | Prove namespace denial or retain explicit L6 residual; do not claim complete containment |
| TRUTH-01 | P1 | M3/M8 blocker semantics and SHA/CI roles need a single current successor authority | Add blocked-vs-complete and exact-SHA regressions; preserve historical records |
| SKIP-01 | P2 | Fresh exact skip/retry identity census is not yet recorded | Enumerate nested and canonical skips; classify every identity before certification |
| DEP-01 | P2 | Root retains legacy `vue@2.6.12` and the dependency audit needs current evidence | Determine actual role/vulnerability impact; remove only if unused and safe |
| AUDIT-01 | P2 | Fresh dependency/UI/resource/Control Center evidence is not yet recorded | Complete before certification |
