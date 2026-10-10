## Context

`loadDotEnvLayer` returns a parsed map, `mergeDotEnvLayer` overlays declared names for validation, and the config view labels those values `ENV_FILE`. Startup call sites discard that merged object immediately afterward. `nightwatch.mjs` and `nightwatch-agent.mjs` then read `process.env` for reasoner/provider values and construct children from `process.env`; an `.env`-only value is consequently not authoritative. `reportUnknownEnvironmentVariables` receives the declared-only merged map, so an unknown name present only in `.env` disappears. `parseDotEnv` skips malformed lines and overwrites duplicates, while `parseEnvironmentSurface` does not reject unknown keys at the document, variable, shape, or assembled-read levels.

## Goals / Non-Goals

**Goals:** one admitted snapshot; exact CLI/process/file/default provenance; strict declaration and `.env` grammar; secret-safe refusals; identical validation/rendering/execution inputs; declared explicit child keys; executing and mutation proof.

**Non-Goals:** importing general dotenv semantics, variable interpolation, shell expansion, storing effective secrets, inheriting the entire parent environment, changing environment authorization, or introducing implementation in this planning task.

## Decisions

### Admit once and pass an immutable snapshot

A pure admission function returns declared effective rows plus a bounded runtime environment projection. Precedence is explicit: supported CLI override, non-empty process value, file value, declaration default. Callers cannot validate one map and execute from another.

### Use a deliberately small file grammar

The optional file accepts comments, blank lines, and one literal `NIGHTWATCH_NAME=value` assignment per line. It rejects malformed non-comment lines, invalid names, duplicate names, unknown names, NUL, unsupported quoting/escape/interpolation syntax, and values that fail the declared shape. Diagnostics name line and variable only; secret values never appear.

### Make declaration strictness recursive

The declaration parser uses exact key sets for its document, each variable, each shape variant, and each assembled read. It rejects duplicate modes, enum values, consumers, and assembled-read identities. The hardening rule invokes the same parser rather than maintaining a weaker partial parser.

### Child projection is explicit and declared

Host runtime keys remain a fixed inherited allowlist. Every explicit `NIGHTWATCH_*` key must exist in the declaration and must be sourced from the admitted snapshot or a typed fixed-literal override whose precedence is documented. Secret-bearing values are never rendered.

## Risks / Trade-offs

- Strict file parsing can reject previously ignored garbage; this is intentional fail-closed behavior with line-local remediation.
- Some commands intentionally require CLI selection even if `.env` supplies a value. Their command contract must declare that exception instead of accidentally ignoring the file layer.
- Passing a snapshot through launchers touches several call sites; tests must compare rendered provenance with actual child observation.

## Migration Plan

1. Add strict parsers and snapshot types behind focused tests.
2. Route config rendering and launchers through the same snapshot.
3. Bind child projection to declarations and convert call sites.
4. Add structural and mutation totality, then run full acceptance.

Rollback is code-only: no persistent configuration migration is introduced.

## Open Questions

None. The existing documented precedence and child-environment default-deny intent determine the design.
