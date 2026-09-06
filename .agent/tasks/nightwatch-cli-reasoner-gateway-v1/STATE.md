# STATE — nightwatch-cli-reasoner-gateway-v1 (Lane B)

Status: COMPLETE. All 25 focused tests pass twice consecutively; typecheck
clean; no leaked child processes; hardening:check has one pre-existing,
out-of-scope error (docs/CURRENT_STATE.md header date; forbidden file,
unchanged by this lane, failing on base too).

Implementation: src/core/reasoner/{cliReasoner.ts,index.ts} (~690 lines).
Tests: tests/unit/reasonerCli.test.ts (25 tests, fake-CLI matrix).

Key decisions (see SPEC.md):
- JSONL = whole-document first, else last record-looking line (trailing noise
  tolerated). Leading non-JSON stays GARBAGE per frozen classifyRawOutput.
- Lifecycle precedence: CANCELLED > OVERSIZE > TIMEOUT > HUNG_CHILD >
  HUNG_GRANDCHILD > CLI_CRASH > NONZERO_EXIT; then content: SECRET_ECHO >
  size > PARTIAL > GARBAGE > MALFORMED/validator class.
- HUNG_CHILD = SIGTERM ignored past kill grace (SIGKILL escalation required).
- Executable: absolute+realpath+regular+exec-bit, or allowlisted basename via
  manual PATH search. No vendor hard-code. No shell (spawn shell:false only).
- Retryable: TIMEOUT, HUNG_CHILD, HUNG_GRANDCHILD, CLI_CRASH, NONZERO_EXIT,
  PARTIAL_OUTPUT, PROVIDER_FAILURE.
