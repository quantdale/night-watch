# SPEC — nightwatch-cli-reasoner-gateway-v1 (Lane B)

## Goal
Headless CLI transport implementing the frozen `ReasonerDriver` contract in
`src/core/agentProtocol/reasoner.ts`. Provider-neutral: no vendor names,
endpoints, SDKs, or credentials anywhere in the lane.

## Contract (from frozen protocol)
- `ReasonerDriver.complete(request, options): Promise<ReasonerCallResult>`
- Framing: `ReasonerTurnRequest` in, `ReasonerTurnResponse` out.
- Caps: `REASONER_STDOUT_BYTE_CAP` (1 MiB), `REASONER_STDERR_BYTE_CAP` (256 KiB).
- Failure classes reused verbatim; validation via `validateReasonerTurnResponse`,
  `classifyOutputSize`, `classifyRawOutput` (never forked).

## Safety requirements
- Executable resolution: absolute path (realpath-canonicalized, regular file,
  executable bit) OR a basename present in a caller-supplied allowlist and
  resolved through `PATH` without a shell. No vendor hard-code.
- `spawn` with `shell: false` only. Safe argv: bounded count/length, NUL-free,
  secret-pattern-free (secrets travel via allowlisted env, never argv).
- Child env = `buildChildEnvironment` base + caller `extraEnv` whose keys must
  match `^[A-Z][A-Z0-9_]*$` and be present in caller `allowedEnvKeys`.
- Deadline timeout, AbortSignal cancellation, kill escalation
  SIGTERM → (grace) → SIGKILL, process-group kill (`detached: true` +
  `kill(-pid)`), post-exit stdio grace for grandchild-held pipes.
- Secret-safe: byte counts and classes only in results/logs; captured
  stdout/stderr never embedded in errors or descriptions.

## Failure precedence (documented in code)
CANCELLED → OVERSIZE_OUTPUT → TIMEOUT → HUNG_CHILD → HUNG_GRANDCHILD →
CLI_CRASH → NONZERO_EXIT → SECRET_ECHO → OVERSIZE (backstop) →
PARTIAL_OUTPUT → GARBAGE_OUTPUT → MALFORMED_OUTPUT / validator class
(UNKNOWN_INTENT, UNSAFE_INTENT, UNKNOWN_TOOL, UNAUTHORIZED_ENVIRONMENT,
SECRET_ECHO).

## Retry table (`isRetryableReasonerFailure`)
Retryable (transient): TIMEOUT, HUNG_CHILD, HUNG_GRANDCHILD, CLI_CRASH,
NONZERO_EXIT, PARTIAL_OUTPUT, PROVIDER_FAILURE.
Not retryable (deterministic / operator-action): MALFORMED_OUTPUT,
GARBAGE_OUTPUT, OVERSIZE_OUTPUT, SECRET_ECHO, UNKNOWN_INTENT, UNSAFE_INTENT,
UNKNOWN_TOOL, UNAUTHORIZED_ENVIRONMENT, CANCELLED.

## Tests (deterministic fake CLIs via `node -e`; no subscription)
happy JSON turn, malformed, garbage, oversize, timeout, crash (SIGABRT),
nonzero exit, hung child (SIGTERM trap → escalation), hung grandchild
(pipe held open), secret echo, cancellation (mid-flight + pre-aborted),
partial, no `shell:true` (metachar literal argv + marker-file absence),
process-tree termination (grandchild reaped), retry table, resolution
rejections.
