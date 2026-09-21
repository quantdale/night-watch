## Audit scope

Read-only inspection performed at activation from
`8dd8b163b567b939b977649d6ba7c371cf230ee6`:

- `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md`, `.agent/README.md`,
  `.agent/PLANNER_HANDOFF.md`, `.agent/templates/*`.
- W13 task (`SPEC/PLAN/STATE/REPORT`) and its lane receipts
  (`evidence/r02-direct-time.txt`, `r02-direct-time-cpu.txt`,
  `r02-gate-timeout-receipt.json`) — read-only predecessor evidence.
- `AGENTS.md`, `docs/CURRENT_STATE.md` (machine-checked truth block and live
  state block).
- `package.json` scripts, `playwright.config.ts` and the phase/gate configs,
  `config/quality-gate.v1.json`, `config/validation-universe.v1.json`,
  `config/validation-lane-state.v1.json`, `config/synthetic-campaign.v1.json`,
  `config/semantic-compatibility.v1.json`.
- `bin/quality-gate.mjs`, `bin/quality-gate-clean.mjs`,
  `bin/semantic-compat.mjs`, `bin/campaign-synthetic.mjs`,
  `bin/validation-universe.mjs`, `bin/hardening-check.mjs`,
  `bin/planner-handoff-check.mjs`, `bin/lib/hardening/probe-campaign.mjs`.
- Discovery counts at activation: 372 unit + 5 smoke + 1 scenario test files,
  of which the synthetic manifest selects 105 files / 1,897 tests and the
  semantic manifest selects 149 disjoint files; reported full regression is
  5,310 tests.
- Structural facts mechanically counted: 29 test files shell out to git, 19
  reference owner-local state, 5 write `artifacts/`, 2 call `process.chdir`,
  16 test files bind servers (mostly port 0), 145 use `mkdtempSync`.
- Host at activation: load average 4.76 (20 cores) with four codex and one
  opencode agent running; one foreign owned session and four stale worktrees
  registered.

## Findings

1. No timing telemetry exists on the authoritative lanes; quality-gate
   receipts carry no durations, so validation-speed regressions are invisible
   until a fixed timeout fires. The clean-gate synthetic-lane timeout in W13
   is the observed consequence.
2. The full regression is a strict superset of the gate's test-executing
   lanes, so a lifecycle that runs `npm test` and `gate:local` executes the
   1,897 synthetic tests and the 149 semantic files twice.
3. The synthetic campaign is serial by an explicit determinism contract
   (`workers=1`, `retries=0`, `serial=true`) and measured at 422.94-643 s for
   1,897 tests; the gate's MEDIUM bound of 600 s therefore has negative
   headroom on a loaded host.
4. `playwright.config.ts` serializes all execution under D-1's original
   rationale; there is no per-file execution-class metadata, so any
   parallelization attempt would be heuristic rather than evidence-based.
5. Hardening probes spawn one Node process per probe (about 94 launches) and
   mutate the real checkout; the campaign is correctly serial and must stay
   that way per checkout.
6. There is no affected-test selection surface, so a small source change
   currently pays the full lane cost.
7. Isolation affordances already exist: cross-process dynamic proxy port
   leases with lease-suffixed runtime state files, and port-0 fixture
   servers. These are necessary but not sufficient for parallel shards; the
   per-file execution class is the missing authority.

## Risk assessment

- Parallelization risk is real for git-mutating, owner-local-state, and
  fixed-path tests. Mitigation is declared classes, fail-closed unknowns,
  per-shard isolation, and repeated-run flakiness evidence.
- Cache staleness risk is mitigated by digest keys over source SHA + config
  digest + tool version + schema version and by immutable-output-only caching.
- Clean-gate independence risk is mitigated by forbidding any reuse across the
  clean-checkout boundary.
- Fast-lane authority confusion is mitigated by explicit NOT-certification
  labelling and unchanged Tier 3 semantics.
- Measurement noise risk is mitigated by requesting owner-quiesced windows and
  recording host load with every measurement.

## Compliance

- All findings and planned work are local and read-only with respect to
  products and sibling repositories; no credentials, secrets, customer data,
  or owner-only state enter any artifact.
- No test, assertion, skip, hardening rule, hardening probe, synthetic
  scenario, or gate group is removed or weakened by this change.
- The canonical checkout was not modified; all work is committed from the
  owned session worktree.
