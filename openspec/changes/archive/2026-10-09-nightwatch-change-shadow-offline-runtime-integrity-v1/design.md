## Context

`bin/change-intelligence.mjs` is an operator-facing, local-only shadow command.
It compiles two TypeScript entry modules into a fixed ignored directory, loads
the emitted JavaScript, reads local Git metadata from admitted sibling
repositories, and writes sanitized selection metadata. Its header and durable
Phase 3/C-05 records describe that path as offline.

The compiler bootstrap does not uphold that claim. `compileCore()` runs
`npx tsc` twice. `npx` is explicitly a local-or-remote package runner; when a
repository-local binary cannot be resolved, it may acquire and execute a
package that is neither selected nor admitted by Nightwatch's lockfile. The
current worktree demonstrates the relevant missing-dependency state: there is
no local TypeScript installation, while `package-lock.json` binds TypeScript
5.9.3. Running the command was deliberately avoided because the suspected
failure path itself can contact a registry.

The completed source-analysis runtime campaign consolidated equivalent
`transpileModule` hooks but explicitly retained callers with different
compiler semantics. The shadow path is such a caller: its full `tsc` program
compilation follows transitive imports and reports type/program errors, while
the shared loader is a per-file transpiler. Retaining different semantics did
not authorize remote compiler discovery. The exact-runtime-toolchain proposal
governs certification Node/npm identities and explicitly excludes arbitrary
developer commands, so it also does not close this gap.

## Goals / Non-Goals

**Goals:**

- Make the normal `change:shadow` path mechanically offline from its first
  compiler action.
- Admit only the repository-local TypeScript installation corresponding to the
  exact `node_modules/typescript` entry in the committed lockfile.
- Preserve full-program `tsc` behavior, emitted layout, shadow selection
  semantics, and current C-05 source/Git admission rules.
- Refuse a missing, ambiguous, unsafe, or version-divergent compiler before
  deleting or creating compiler derivatives.
- Bound derivative storage and guarantee cleanup after success, compiler
  failure, signal-aware termination where supported, or later command failure.
- Prove the real entrypoint path with a synthetic local Git-repository fixture
  and package-manager sentinels rather than relying only on source matching.

**Non-Goals:**

- Installing dependencies, downloading TypeScript, choosing a new TypeScript
  version, or changing `package-lock.json`.
- Replacing full-program compilation with `transpileModule` unless exact
  diagnostic and runtime parity is independently proven.
- Changing change-intelligence algorithms, repository admission, Git
  freshness, report schema, source pins, or journey selection.
- Solving general CLI argument, exit-code, error-redaction, or path-output
  conventions; those are already owned by the production-completion operator
  CLI contract.
- Contacting Alphaus, executing a product, or adding authenticated, network,
  data, infrastructure, AI, self-development, or publication authority.

## Decisions

### Resolve the local TypeScript program directly, never through a package runner

Create a small bounded compiler-admission helper under `bin/lib/`. From the
Nightwatch root it reads the committed `package-lock.json`, requires exactly
one owned `node_modules/typescript` package entry, resolves the installed
`typescript/package.json` and declared `tsc` program from a repository-anchored
module resolver, and verifies:

- both resolved files remain inside the repository-local TypeScript package;
- relevant ancestors and leaves satisfy the repository's existing safe local
  dependency rules;
- installed and lockfile versions are exact and equal;
- the lock entry has its expected resolved/integrity shape; and
- the declared compiler program is a bounded regular file.

Invoke the admitted program as `process.execPath <absolute-local-tsc> ...`
with an argument vector and the sanitized child environment. Never search
`PATH` for `tsc` and never invoke `npx`, `npm exec`, another package manager,
or an installer. The returned public result contains only safe categorical
identity such as the exact version and a lock-entry digest; it never publishes
the resolved machine path.

Alternative considered: add `--no-install` or `--offline` to `npx`. That still
delegates package selection to a general package runner and leaves ambiguity
between the package name and binary name. Direct repository-local resolution
is smaller and mechanically excludes fallback acquisition.

Alternative considered: use `bin/lib/typescript-runtime-loader.mjs`. Its
per-file `transpileModule` contract does not provide the full-program checking
and transitive emit behavior currently used by `change:shadow`. Reuse is
allowed only if a future implementation proves identical diagnostics, emitted
module graph, stdout/stderr, exit status, and shadow payload; it is not assumed.

### Admit the compiler before any derivative mutation

Split compilation into preflight, workspace creation, two declared compile
steps, module load, and cleanup. Preflight resolves and validates the compiler,
source entry files, argument profile, and derivative-root policy without
removing or creating any path. A refusal returns one bounded category such as
`CHANGE_SHADOW_COMPILER_UNAVAILABLE`, `..._MISMATCH`, or `..._UNSAFE`.

Only after admission may the command create a unique per-invocation derivative
directory below a validated ignored root. A fixed shared output directory is
not reused across invocations. This prevents concurrent runs from deleting or
loading one another's partial output. The current pinned `rootDir: src`,
CommonJS, ES2022, Node module-resolution, interop, and skip-lib-check options
remain explicit and shared between both compile calls.

Alternative considered: continue deleting the fixed compile root at startup.
That permits a missing compiler or another invocation to destroy useful
diagnostic state and creates cross-process races. Unique derivatives with a
bounded cleanup owner are simpler.

### Treat compiler output as disposable and non-authoritative

Emitted JavaScript is a derivative bridge, never a proof, source snapshot,
selection authority, or durable artifact. The owner invocation records the
exact paths it creates, loads only the two expected emitted entry modules from
that directory, and removes the directory in `finally`. Failure cleanup must
not follow symlinks or remove a path whose identity no longer matches the
owned workspace. Bounded stale derivatives, if any remain after an
untrappable process death, are refused or cleaned only through an explicit
identity-safe maintenance rule; the command must not recursively delete an
unproven path.

The durable shadow report remains separate from compiler derivatives. Any
general report-publication hardening discovered later is adjudicated on its own
evidence rather than smuggled into this compiler fix.

### Prove the executable path, not only the helper

Add unit tests for lockfile and installed-package admission plus a full-process
test that constructs the bounded set of synthetic local Git repositories
needed by the current change-intelligence map. It runs the real entrypoint with
`NIGHTWATCH_REPOS_ROOT` pointed at that fixture and package-manager/`npx` trap
executables placed first on `PATH`. The command must complete using the local
compiler, produce the expected sanitized report class, and leave every trap
sentinel absent.

A separate missing-local-compiler case exercises the admission helper against
an isolated repository fixture and proves no derivative or report callback is
reached. Structural hardening and mutation probes complement the process test
by rejecting reintroduced `npx`/`npm exec`, PATH-based `tsc`, admission after
workspace mutation, version-check bypass, shared compile roots, and missing
cleanup. The mutation set must restore bytes exactly.

### Preserve established authority and public behavior

The change must not weaken owner-approved repository membership, sibling-source
read confinement, local tracking-ref truth, pinned-source visibility, sanitized
report contents, deterministic selection, or the rule that shadow mode never
invokes DEV. Existing C-05, change-intelligence, CLI contract, hardening,
validation-universe, local-gate, and clean-checkout checks remain in the
acceptance cone.

## Risks / Trade-offs

- **A checkout without installed dependencies can no longer bootstrap the
  command implicitly** → return a precise environment-unavailable category and
  direct the operator to the repository's explicit lockfile installation
  procedure; never download from inside the command.
- **Direct resolution can accidentally accept a hoisted or symlinked global
  compiler** → anchor resolution at the Nightwatch root and prove confinement
  to its local dependency tree before execution.
- **Switching compiler invocation can alter diagnostics or output layout** →
  preserve the exact option vector and compare emitted entry identities,
  failure status, and end-to-end report semantics under deterministic fixtures.
- **Cleanup can itself be unsafe after path replacement** → bind cleanup to
  the unique directory identity created by this invocation and refuse rather
  than recursively traverse an unexpected replacement.
- **A process killed with an untrappable signal can leave derivatives** → use
  unique non-authoritative directories and an identity-safe bounded stale
  policy; never represent cleanup as crash-atomic.
- **Full-process fixtures add Git setup cost** → keep the repository count
  equal to the bounded current map, use minimal commits, and retain focused
  helper tests for the larger malformed matrix.

## Migration Plan

1. Add focused failing tests for absent local TypeScript, version disagreement,
   unsafe resolution, no-mutation-before-admission, and forbidden runners.
2. Implement the local compiler-admission helper and safe identity result.
3. Refactor `change-intelligence.mjs` to preflight first, use a unique bounded
   derivative workspace, invoke the local compiler program directly, and clean
   by owned identity.
4. Add the synthetic end-to-end repository fixture, success/failure parity
   checks, structural rule, and non-vacuous mutation probes.
5. Run the focused source/change-intelligence/CLI suites, root and bin
   typechecks, hardening and mutation validation, validation-universe checks,
   local gate, clean gate, and complete offline regression.
6. Update operator and architecture truth only where the implemented command
   contract changed, then integrate through an owned C-00 session.

Rollback restores the last known locally compiled implementation only if it
still meets the no-package-runner/offline contract. Reintroducing `npx tsc`, a
PATH-resolved compiler, or implicit installation is not an acceptable rollback.

## Open Questions

- Which existing safe-path helper most closely matches read-only admission of
  a repository-local installed package without importing an authority intended
  for owner-private artifacts? Resolve during implementation and keep the
  helper's semantics explicit.
- Should both TypeScript entry modules be compiled in one program invocation or
  remain two invocations? Preserve current emitted/runtime behavior first;
  combine only if diagnostics, layout, ordering, and failure semantics are
  proven equal.
