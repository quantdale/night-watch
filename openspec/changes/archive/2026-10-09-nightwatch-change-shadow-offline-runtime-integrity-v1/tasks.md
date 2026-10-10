Implementation is explicitly outside the planning-only audit campaign that
created this change. These tasks are declared not in scope for the current
task; none has been performed.

## 1. Reconfirm evidence and freeze compatibility

- [ ] ~~1.1 In a separately authorized implementation session, re-run the
  tracked-bin/compiler census and verify that `change:shadow` still invokes
  `npx tsc`, the local TypeScript lock entry is exact, and no later change
  already closes the offline bootstrap path.~~
- [ ] ~~1.2 Capture reference compiler arguments, emitted entry paths,
  diagnostic/exit behavior, loaded exports, sanitized report shape, selection
  identities, and cleanup state for deterministic success and failure
  fixtures.~~
- [ ] ~~1.3 Add failing focused tests that demonstrate missing local TypeScript
  can reach the current package-runner path without executing a real network
  request.~~

## 2. Implement repository-local compiler admission

- [ ] ~~2.1 Add a bounded `bin/lib/` helper that reads the owned
  `node_modules/typescript` lockfile entry and rejects missing, unknown,
  duplicate, malformed, non-exact, or integrity-less shapes.~~
- [ ] ~~2.2 Resolve `typescript/package.json` and its declared compiler program
  from a Nightwatch-root-anchored resolver; prove confinement, safe file
  types/ancestors, and exact installed-versus-lockfile version equality.~~
- [ ] ~~2.3 Return a bounded categorical admission result and safe version/
  lock-entry identity that contains no local path, environment value, raw
  package data, or command output.~~
- [ ] ~~2.4 Add callback-spy tests for absent, mismatched, malformed,
  ambiguous, symlinked, escaped, unreadable, and irregular compiler states,
  proving the compiler and every downstream callback remain unreachable.~~

## 3. Replace the package-runner compile path

- [ ] ~~3.1 Refactor `bin/change-intelligence.mjs` so compiler/source/profile
  preflight completes before any derivative creation, deletion, sibling read,
  or report write.~~
- [ ] ~~3.2 Replace both `npx tsc` calls with
  `process.execPath <admitted-local-compiler> <argument-vector>` using the
  sanitized child environment and existing resource/time bounds.~~
- [ ] ~~3.3 Preserve the explicit ES2022/CommonJS/Node-resolution/interoperability/
  skip-lib-check/rootDir/outDir profile and expected emitted entry locations;
  keep the two compile programs separate unless full parity proves combining
  them safe.~~
- [ ] ~~3.4 Remove every normal-path `npx`, `npm exec`, PATH `tsc`, registry,
  installer, or automatic resolver fallback and map unavailable/mismatch/
  unsafe admission to the repository-wide environment-refusal convention.~~

## 4. Isolate and clean compiler derivatives

- [ ] ~~4.1 Replace the fixed shared compile root with a unique
  per-invocation directory under a validated ignored temporary root and bind an
  owned identity to its creation.~~
- [ ] ~~4.2 Load only the two expected emitted modules from the owned
  directory; reject missing, extra-authority, escaped, replaced, or irregular
  entry targets before import.~~
- [ ] ~~4.3 Remove the owned derivative in `finally` after success and every
  catchable failure without recursively deleting an identity-divergent path or
  another invocation's output.~~
- [ ] ~~4.4 Add success, compile-failure, import-failure, later-command-failure,
  replacement-race, concurrent-run, and bounded stale-derivative tests.~~

## 5. Prove real offline execution and semantic parity

- [ ] ~~5.1 Build minimal synthetic Git repositories for every bounded map
  member under an isolated `NIGHTWATCH_REPOS_ROOT`, with no dependency on real
  Alphaus checkouts or network state.~~
- [ ] ~~5.2 Execute the real non-help entrypoint with `npx`, npm package-runner,
  and PATH-`tsc` trap programs first on `PATH`; assert success, expected
  sanitized output/report class, and zero trap sentinels.~~
- [ ] ~~5.3 Compare hardened versus reference loaded exports, changeset and
  selection identities/order, reviewed-repository semantics, report schema,
  exit status, diagnostics, and no-DEV execution for deterministic success and
  failure cases.~~
- [ ] ~~5.4 Prove a missing or mismatched local compiler reaches no derivative,
  sibling Git, report, subprocess-runner, or network/package callback and
  leaves pre-existing files byte-identical.~~

## 6. Structural and mutation hardening

- [ ] ~~6.1 Add a structural rule that rejects package runners, PATH compiler
  lookup, automatic installation, or registry access in the change-shadow
  compile cone while allowing only the admitted local compiler helper.~~
- [ ] ~~6.2 Register independent non-vacuous mutations for reintroduced `npx`
  and `npm exec`, PATH `tsc`, admission-after-mutation, exact-version bypass,
  shared compile root, cross-invocation import, and omitted cleanup.~~
- [ ] ~~6.3 Run the mutations against real governed surfaces, prove every
  control loss is detected, and verify byte-for-byte restoration with no
  residual derivative or report mutation.~~

## 7. Acceptance and handoff

- [ ] ~~7.1 Run focused change-intelligence, C-05 source-admission, runtime
  loader, CLI implementation/contract, cleanup/concurrency, privacy, and
  deterministic parity suites.~~
- [ ] ~~7.2 Run root and bin typechecks, `npm run hardening:check`, hardening
  rules/mutations, `npm run validation:universe`, `npm run project:check`,
  `npm run agent:check`, `npm run gate:local`, the exact-toolchain clean gate,
  and the complete offline regression with exact pass/skip/fail counts.~~
- [ ] ~~7.3 Update source-analysis runtime, operator, host-capability, current
  state, decision, and task records only where implementation changed durable
  truth; do not relabel historical shadow evidence.~~
- [ ] ~~7.4 Strict-validate this change, inspect the full privacy and diff
  surface, integrate only through the owned C-00 session, and report exact-head
  CI as executed evidence or explicit non-evidence.~~
