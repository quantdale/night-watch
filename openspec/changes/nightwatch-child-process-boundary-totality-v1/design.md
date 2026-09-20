## Context

`checkChildProcessBoundaries` loops over a literal 18-file array, rejects `...process.env`, `shell:true`, missing `timeout`, inherited stdio, and missing `maxBuffer` only in those files. Its global pass merely rejects shell-capable `exec`/`execFile` spellings and excludes hardening-rule sources. It does not enumerate invocation nodes or wrappers and has no completeness receipt. Current bypasses include full environment spread in `gate-topology` and `review-mutation-campaign`, default environment inheritance across many Git/GitHub/tool calls, and an unbounded `phase22-dev` child using `stdio: 'inherit'`.

## Goals / Non-Goals

**Goals:** syntax-aware totality; per-call execution classes; minimal explicit environments; credential scoping; exact offline tools; time/output/process-tree bounds; executing secret/network/fault proof; deterministic census.

**Non-Goals:** banning all subprocesses, removing required Git/GitHub observations, redesigning L6 containment, authorizing DEV execution, installing packages, or implementing during this planning campaign.

## Decisions

### Discover calls rather than files

The checker resolves imports/requires of `node:child_process`, aliases, namespace calls, and approved wrapper functions to invocation nodes. Every discovered node has a stable source identity and exactly one classification record. Unknown dynamic access, computed executable selection, unclassified wrappers, duplicate records, and stale records fail closed. A non-zero census and digest make coverage measurable.

### Closed execution profiles

Profiles include `LOCAL_METADATA`, `OFFLINE_REPOSITORY_TOOL`, `TEST_LANE`, `SCOPED_REMOTE_OBSERVER`, and `AUTHENTICATED_CONTAINED`. Each fixes required environment, executable provenance, network/credential authority, timeout, output/stdin, shell, and termination properties. Exceptions are per call, not per file.

### Environment and credentials are capabilities

Every call supplies an explicit environment. Most use the common allowlist. Remote observer calls receive only the named token/host variables they require and never pass them to unrelated Git, test, compiler, or browser processes. Tests inject randomized forbidden sentinels and inspect real child environments.

### Offline means no acquisition

Offline profiles resolve repository-installed binaries directly from the lockfile installation, never `npx` auto-resolution/download. Execution occurs with network-denial proof appropriate to the platform or a qualified unsupported outcome; PATH cannot substitute another executable.

### Bounds include descendants and streaming

Every process has a deadline, byte ceilings per stream, controlled stdin, no shell, and process-group/descendant termination. `stdio: inherit` is disallowed for authority-bearing/operator launchers; bounded forwarding preserves operator output.

## Risks / Trade-offs

- Total classification is a sizeable migration across many low-risk metadata calls, but a generated census keeps it mechanical.
- Some calls require GitHub credentials; explicit scoped exceptions retain functionality while reducing exposure.
- Platform process-tree behavior differs; unsupported termination guarantees fail closed for authority-bearing profiles.

## Migration Plan

1. Build read-only AST census and compare it with the current manual rule.
2. Define profiles/classification registry and convert highest-authority leaks first.
3. Convert remaining calls/wrappers and require zero unclassified/stale entries.
4. Add cross-process/mutation campaigns, then full acceptance.

No subprocess with external or authenticated authority is run by this planning change.

## Open Questions

None. The existing safety-model sentence already requires the total boundary; implementation must make the rule match it.
