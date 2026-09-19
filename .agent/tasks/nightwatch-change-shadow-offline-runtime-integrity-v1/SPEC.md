# Change-shadow offline runtime integrity proposal

## Task purpose

Create and strict-validate an implementation-ready OpenSpec remediation for
NW-AUD-007 without implementing it.

## Established starting state

- Parent campaign: `nightwatch-exhaustive-repository-audit-proposals-v1`.
- Starting SHA: `34517c9ba11c97407168fe5879ee03794dfff3e3`.
- `bin/change-intelligence.mjs` describes its shadow path as offline but runs
  `npx tsc` twice before loading the source-intelligence core.
- `npx` is a local-or-remote package runner; the command has no no-install,
  offline, exact-package, or repository-local compiler admission.
- `package-lock.json` binds `node_modules/typescript` to exact version 5.9.3,
  but the active worktree has no installed TypeScript and the unsafe path was
  not executed.
- The completed shared TypeScript loader campaign allowed semantically
  different callers to remain separate, and the exact-runtime proposal
  explicitly excludes arbitrary developer commands.

## Required deliverables

- OpenSpec proposal, design, `source-analysis-runtime-hardening` delta spec,
  and implementation tasks.
- Repository-local lockfile-bound compiler admission; no package runner,
  installer, PATH compiler, or registry fallback.
- Admission before derivative mutation, unique bounded compiler workspaces,
  identity-safe cleanup, semantic parity, synthetic full-process proof, and
  non-vacuous mutations.
- Precise deduplication from already-owned general CLI output/path contracts.

## Non-goals

No compiler execution, dependency installation, network request, source or bin
implementation, report generation, sibling-repository read, Alphaus action,
CI run, or external publication.

## Safety constraints

Planning artifacts and local read-only evidence only. Do not run the normal
`change:shadow` command while local TypeScript is absent because its current
bootstrap is the issue under review.

## Declared Deletions

None.

## Acceptance criteria

- All four OpenSpec artifact classes exist and strict validation passes.
- The design preserves full-program compilation and established C-05/source
  semantics while eliminating automatic package resolution.
- Tests cover the real non-help path without real siblings or network.
- Implementation tasks are explicitly declared outside this planning task.
