# PLAN — nightwatch-cli-reasoner-gateway-v1 (Lane B)

1. `src/core/reasoner/cliReasoner.ts`
   - `CliReasonerConfig`, `resolveCliReasoner` (throws safe errors), `createCliReasonerDriver`
   - `classifyCliOutcome` (lifecycle precedence, exported + unit-tested)
   - `isRetryableReasonerFailure`, `describeReasonerResult` (secret-safe)
   - JSON stdin framing; whole-document then JSONL-last-record stdout parsing
   - streaming byte caps with early kill; deadline/abort/kill-grace/hard-ceiling
     timers; detached process-group termination; post-exit stdio grace
2. `src/core/reasoner/index.ts` — re-exports.
3. `tests/unit/reasonerCli.test.ts` — fake-CLI matrix (see SPEC).
4. `STATE.md` / `REPORT.md` — continuity + final report.
5. Validate: `npx tsc --noEmit`, focused playwright test, `node bin/hardening-check.mjs`.
6. Commit on session branch. No main push. No other-lane edits.
