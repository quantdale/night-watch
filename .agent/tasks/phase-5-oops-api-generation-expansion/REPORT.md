# Nightwatch Phase 5 — Restricted OOPS + Generated Read-Only API Corpus

Status: `COMPLETE` — M0/M10 task creation, Phase 4 closure audit, current
OOPS audit, restricted adapter, catalog, local corpus, and pre-real gate are
complete; the frozen DEV ledger and final closure remain.

## Starting identity

- Starting Nightwatch SHA: `1d05c460ec0762c4587bb76f5d050a322f8f47a6`.
- Phase 4 implementation/checkpoint: `6bc3cfcebff749d477e3b65f8642db3ecfb6dd8b`.
- Phase 4 clean closure HEAD: `1d05c460ec0762c4587bb76f5d050a322f8f47a6`.
- Phase 6: `NOT STARTED`.

## Phase 4 closure reconciliation

The Phase 4 implementation and closure commits exist and are ancestral to
current HEAD. The native Phase 4 focused exploration suite passed 16/16,
TypeScript passed, `agent:check` passed with the approved-document warning,
and the closure worktree was clean before this task’s files were created.

The frozen source-defined exact-replay condition is the runner’s
`plannedActions.length > 1 && safetyIsZero(...)` selection predicate. The six
real matrix records each contain one planned action, so the exact-replay ledger
is `0/3 — NOT_APPLICABLE`; it is not relabeled as a pass and no nontrivial
sequence was skipped. Synthetic exact replay remains covered by the 16 tests.

The two Phase 4 `RUNTIME_FAILURE` records are retained as
`NIGHTWATCH_RUNTIME_ARTIFACT`: each followed successful anchor initialization,
attempted one approved action, returned `FAILED` with
`ACTION_TRANSITION_FAILED`, wrote an invalidated transition, and had no
semantic request delta or anomaly fingerprint. Both were fatal to their own
sequence but nonfatal to the corpus and had zero production/proxy/unknown/
mutation/action-unknown/DB safety counts. The E2 record additionally contains
non-causal optional font transport failures classified `DEV_INFRA_TRANSIENT`.
No product anomaly was admitted.

## Closure handoff

M10 final closure records the frozen DEV results, anomaly levels,
privacy/safety accounting, final adversarial review, and clean Nightwatch
handoff. Phase 6 was not started.

## M1 OOPS audit checkpoint

The current read-only OOPS source is `master` at
`c4a129feb0b97dc0ae39f32c39a92abe834567f2`, tracking `origin/master`, clean,
0 ahead/behind. The installed Homebrew binary is `oops 1.2.8`, SHA-256
`8a52c99261875657553149ff79d3ba07b4bcae9ea1b5f19a2c99af57797a4fd0`, and
embeds commit `009440549ac37582296a26e668d1f6f105e14b6b`; it is therefore a
`BINARY_SOURCE_MISMATCH` and will not be used as Phase 5 source evidence.

The current source confirms arbitrary HTTP URLs/methods, `#!` script expansion,
`prepare`/`check`/assertion scripts, inherited script environment, 0777 script
files, raw response logging/file output, pre-process hooks, distributed/cloud
integrations, and optional Slack/GitHub reporting. Its `httpexpect` client uses
Go's proxy-aware default transport and follows redirects without Nightwatch
host revalidation. Each previously reported OOPS security finding is
`CONFIRMED_CURRENT`. No OOPS scenario was executed. Direct authenticated OOPS
egress is prohibited; the Nightwatch restricted adapter and loopback relay are
the next implementation boundary.

## Current next action

Run the final validation, privacy/integrity, adversarial, and Alphaus-repo
integrity review, then close the task with a clean Nightwatch checkpoint.

## M2–M8 implementation and pre-real checkpoint

The Nightwatch implementation contains a strict restricted
OOPS dialect, deterministic source-backed API catalog/generator, loopback
operation relay, metadata-only oracle, bounded OOPS subprocess adapter,
ephemeral auth bridge, Phase 3 staleness hooks, and a durable six-scenario
corpus. The current source-built OOPS binary was exercised only against local
loopback fixtures. The local focused suite is 15 passed after the corpus,
auth, sandbox, and pre-process/notification rejection coverage.

The catalog is intentionally small and explicit:

- 11 operations inventoried: 6 KNOWN_READ, 4 KNOWN_MUTATION, 1 UNKNOWN;
- 6 generation-eligible reads, all generated and locally verified through the
  current source-built OOPS path;
- J1 payer exchange, J2 common exchange, and J3 account inventory/billing
  stream are UI bridges; legacy billing groups and billing-group exchange are
  API-only expansions;
- the historical malformed-JSON operation remains UNKNOWN and is excluded.

Bubblewrap 0.9.0 is available and its unprivileged network-namespace probe
passed. That namespace cannot reach a relay bound in the parent Nightwatch
network namespace, so authenticated OOPS DEV execution is disabled rather than
weakening the relay boundary. The native Nightwatch relay path is the only
real DEV fallback authorized by the frozen Phase 5 task. The real budget is
12 serial requests: one first execution and one fresh replay for each of the
six frozen reads.

## M8 pre-real gate

The pre-real gate is accepted as `PHASE_5_PRE_REAL_API_READY`. The frozen set
contains six source-proven `KNOWN_READ` operations: the J1 payer-exchange,
J2 common-exchange, J3 account-inventory and billing-group stream bridges, and
two API-only expansion reads. The budget is twelve total serial requests,
one first execution and one fresh replay per operation, with a 350ms delay.

The security review answers are durable in STATE.md. Generated scenarios cannot
execute shell/script/command/pre-process features, enable notification or
distributed modes, select arbitrary destinations, represent mutations or
UNKNOWN operations, or contain credentials/customer values. OOPS receives an
explicit non-secret environment allowlist and no application auth. The current
source-built OOPS path is local-fixture-only because its verified isolated
network namespace cannot reach the parent loopback relay; the native Nightwatch
relay is the sole permitted authenticated DEV fallback.

Pre-real validation passed: TypeScript, 15 focused Phase 5 tests, the full
Nightwatch Playwright suite (333 passed), `agent:check` (PASS with the approved
checkpoint-advance warning), and `git diff --check`. No real API request,
production attempt, mutation, database query, or secret leak has occurred.

## M9 preflight repair

The first opt-in DEV command failed at the Nightwatch preflight before any
relay or Alphaus API request. The runner used the meta-workspace root when
resolving the six source repositories, so all snapshots were invalid. This was
classified as a `NIGHTWATCH_GATE_DEFECT`, repaired in
`83f9d610f9ecc5c35422e91a83b9a3bc760ccadd` by resolving repositories from the
`REPOSITORIES` directory beside Nightwatch, and revalidated with TypeScript,
the 15-test focused Phase 5 suite, and diff-check. No API anomaly or safety
event resulted.

## M9 bounded DEV corpus result

The repaired runner completed run `nightwatch-20260812T141849Z-ca02` in DEV
through `NATIVE_NIGHTWATCH_RELAY_FALLBACK`. The frozen budget was honored
exactly: six serial first executions and six fresh serial replays, 12/12 total,
with the declared 350ms delay. The valid external owner-only auth state was
reused without refresh or MFA; no password, storage state, or token reached
OOPS.

All six operations passed both levels:

- J1 `ripple.payer-exchange.read`: `2xx`, JSON, valid JSON, matching
  first/replay fingerprint.
- J2 `ripple.common-exchange.read`: `2xx`, JSON, valid JSON, matching
  first/replay fingerprint.
- J3 `ripple.account-inventory.read`: `2xx`, JSON, valid JSON, matching
  first/replay fingerprint.
- J3 stream `ripple.billing-groups.read`: `2xx`, JSON, valid JSON chunks with
  complete stream, matching first/replay fingerprint.
- API-only `ripple.billing-groups-legacy.read`: `2xx`, JSON, valid JSON,
  matching first/replay fingerprint.
- API-only `ripple.billing-group-exchange.read`: `2xx`, JSON, valid JSON,
  matching first/replay fingerprint.

The sanitized ledger records `DEV_VERIFIED_FIRST` for all six first calls and
`DEV_VERIFIED_REPLAY` for all six fresh replays. No L0/L1/L2 API anomaly was
observed or promoted. Safety counters are all zero, and privacy counters are
metadata-only with zero raw bodies, forwarded response bodies, credentials, or
customer identifiers persisted. The ledger is intentionally kept in the
owner-only ignored `artifacts/` evidence directory; the corpus index retains
only its safe run summary.

## M10 final closure

Status: `COMPLETE`. Phase 4 was independently reconciled before Phase 5: its
exact real replay was `NOT_APPLICABLE`, proven from the frozen
`plannedActions.length > 1 && safetyIsZero(...)` predicate; its two runtime
failures remain `NIGHTWATCH_RUNTIME_ARTIFACT` with no request delta,
fingerprint, or product-anomaly admission. Phase 6 was not started.

### OOPS identity and containment

- Source: `alphauslabs/oops@c4a129feb0b97dc0ae39f32c39a92abe834567f2`, clean
  `master`/`origin/master`, ahead/behind 0/0.
- Installed Homebrew OOPS 1.2.8 was a source mismatch and was not used.
- Nightwatch-controlled source build: OOPS v1.2.46 from the pinned source;
  binary SHA-256 `ffa29496cf65b4e239ab4ade6001322f2be546492be26901bd4e2d8c092ad57c`.
- Current source audit reconfirmed arbitrary URLs/methods, scripts, inherited
  script environment, permissive temporary files, raw output, redirects,
  direct/proxy sockets, hooks, cloud/distribution, and notifications. All prior
  findings are `CONFIRMED_CURRENT`.
- Restricted profile: `nightwatch.oops-profile.phase5.v1`.
- Adapter: `nightwatch.oops-adapter.phase5.v1`.
- Shell/script/command/pre-process/notification/distributed/cloud features,
  arbitrary URLs, mutations, UNKNOWN operations, credentials, customer values,
  and unsupported OOPS keys reject before process start.
- Child environment uses an explicit allowlist; the synthetic parent sentinel
  was absent. OOPS argv contains only fixed local arguments, and no auth was
  passed to OOPS. Local scenario files were owner-only and mode 0600.
- Bubblewrap 0.9.0 namespace probe passed, but its isolated network cannot
  reach the parent relay. Authenticated OOPS execution is therefore
  `OOPS_REAL_DEV_EXECUTION_DISABLED_BY_SANDBOX`; local OOPS fixture execution
  remains allowed. Real DEV used the native Nightwatch relay fallback.
- Relay binds to loopback, accepts only catalog operation IDs, resolves DEV
  destinations itself, injects auth in Nightwatch memory, manually revalidates
  redirects, and cannot act as an open proxy. Production and unknown targets
  are not representable.
- OOPS stdout/stderr are bounded and sanitized. Local fake-body assertion
  failure tests found zero sentinel leakage; authenticated response bodies are
  never forwarded to OOPS or persisted.

### Catalog, generator, and lineage

- Catalog: `nightwatch.api-catalog.phase5.v1`.
- Inventoried 11 operations: 6 `KNOWN_READ`, 4 `KNOWN_MUTATION`, 1 `UNKNOWN`;
  generation eligible 6, generated 6, local-OOPS verified 6, blocked 5.
- J1 bridge: `ripple.payer-exchange.read`.
- J2 bridge: `ripple.common-exchange.read`.
- J3 bridges: `ripple.account-inventory.read` and the chunked
  `ripple.billing-groups.read`.
- API-only expansion: `ripple.billing-groups-legacy.read` and
  `ripple.billing-group-exchange.read`.
- All four mutation operations are explicitly cataloged and permanently
  generation-blocked. The historical malformed-JSON operation remains
  `ripple.historical-blue-cost.unknown`, `UNKNOWN`,
  `HISTORICAL_ANOMALY_PRESENT`, and was not deliberately replayed.
- Generator: `nightwatch.scenario-generator.phase5.v1`; scenario identity is
  deterministic from operation/catalog/hydration/oracle versions. Durable
  templates contain only typed runtime placeholders and a relay operation ID;
  no customer identifiers, credentials, request bodies, or response bodies.
- Phase 3 lineage/staleness integration passed. Every real operation was
  `FRESH`; relevant source changes mark operations review-required rather than
  silently executing stale semantics. Browser/API operation lineage is shared.

### Local differential and real ledger

- Local fixture matrix passed for JSON, chunked JSON, 204, 404, 500, wrong
  content type, malformed JSON, slow response, connection close, bounded large
  response, approved redirect, and forbidden redirect.
- Native Nightwatch and current-source OOPS local execution agreed on semantic
  outcomes; OOPS assertion failures remain distinct from process failures.
- Real run: `nightwatch-20260812T141849Z-ca02`, DEV,
  `NATIVE_NIGHTWATCH_RELAY_FALLBACK`, 12/12 serial requests.
- First/replay results: all six `DEV_VERIFIED_FIRST`; all six fresh replays
  `DEV_VERIFIED_REPLAY`. No L0, L1, or L2 API anomaly candidate.
- The five single-document operations returned 2xx/application-json/valid JSON
  with matching first/replay fingerprints. The billing-group stream returned
  valid, complete JSON chunks with a matching first/replay fingerprint.
- Auth: existing external owner-only DEV state reused; no refresh, MFA,
  password, storage-state transfer, or OOPS credential transfer.
- Chrome DevTools MCP remained unavailable/nonblocking; no raw browser network
  data, DOM, screenshot, cookie, or auth-header inspection was used.

### Safety, privacy, and integrity accounting

Exact Phase 5 real-run counts:

| Counter | Result |
| --- | ---: |
| Production attempts | 0 |
| Proxy/relay violations | 0 |
| Unknown destinations | 0 |
| Unknown approvals | 0 |
| KNOWN_MUTATION invocations | 0 |
| Scenario-caused UNKNOWN | 0 |
| Product mutations | 0 |
| Database queries | 0 |
| Secret leaks | 0 |

Privacy result: `PASS`. Raw bodies persisted 0; response bodies forwarded to
OOPS 0; credentials persisted 0; customer identifiers persisted 0. The real
ledger is metadata-only and owner-only in ignored local evidence storage.

The first preflight-only failure was a Nightwatch defect, not an API result:
the runner resolved source repositories two levels above `REPOSITORIES`, making
all snapshots invalid. It stopped before relay/API execution and was repaired
in `83f9d610f9ecc5c35422e91a83b9a3bc760ccadd`; the repaired gate and real run
then passed.

Alphaus integrity remained read-only. Final HEADs match the audited source
identities: Ripple UI `d80b161b...` (dirty 8), Ripple API `27bb007a...`
(dirty 1), Ouchan `565f00a8...` (dirty 71), Blue API `691422e5...` (dirty 1),
Blue Go SDK `8883ee3d...` (dirty 1), grpc-chunk-parser `66802f28...` (dirty 0),
and OOPS `c4a129fe...` (dirty 0). These pre-existing dirty counts were
preserved; no Alphaus repository was modified, reset, stashed, cleaned, or
committed.

### Validation and architecture review

- Focused Phase 5 suite: 15 passed.
- Full Nightwatch Playwright suite: 333 passed.
- TypeScript: PASS.
- `npm run agent:check`: PASS; the expected warning is limited to the
  implementation SHA preceding approved Nightwatch continuity/corpus docs.
- `git diff --check`: PASS.
- Architecture review: a new source-proven read can be added through a catalog
  entry plus hydration and oracle profiles; no bespoke subprocess/browser code
  is required. Mutation/UNKNOWN rejection is automatic, Phase 3 can stale the
  scenario, and UI/API operation lineage is shared.

### Final adversarial review

1. OOPS received a real password: no.
2. OOPS inherited parent secrets: no; allowlist and sentinel test passed.
3. Generated scenario shell execution: impossible/rejected.
4. Pre-process hooks: rejected and never invoked.
5. Slack/GitHub/PubSub/distributed reporting: disabled/rejected.
6. Arbitrary hosts: impossible; operation-ID relay only.
7. Production reachability: blocked and not representable.
8. Redirect escape: revalidated and blocked.
9. Open-proxy abuse: prevented by catalog resolution.
10. Raw body in durable evidence: no.
11. OOPS stdout response-body leak: local sentinel clear; real OOPS auth path disabled.
12. Durable customer identifiers: none.
13. Safety classified by method/name alone: no; source semantics and provenance used.
14. UNKNOWN executed: no.
15. KNOWN_MUTATION executed: no.
16. Scenario-caused UNKNOWN: 0.
17. Product mutation: 0.
18. Production database query: 0.
19. OOPS modified: no.
20. Other Alphaus repository modified: no.
21. API anomaly over-promoted: no anomalies occurred.
22. Historical malformed JSON chased without admission: no.
23. OOPS/adapter failures separated from API outcomes: yes.
24. Replay fresh: yes; separate fresh relay/auth context and unchanged logical scenario.
25. Generator deterministic: yes; corpus-vs-generator regression passed.
26. Phase 6 started: no.

### Acceptance verdict

`PHASE_5_ACCEPTANCE_COMPLETE`. Phase 4 caveats are preserved, restricted OOPS
integration and source-generated read-only corpus are closed, safety/privacy
counts are zero, the frozen real corpus has first plus fresh replay for every
promoted operation, validation passes, Alphaus repositories are unchanged, and
Nightwatch is ready for the next separately created task.

Recommended next task only: `PHASE 6 — READ-ONLY DATA-LAYER EVIDENCE /
CROSS-LAYER ORACLES`. Do not start it from this Phase 5 task state.
