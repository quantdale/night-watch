# Nightwatch Phase 2A — Controlled Observation Checkpoint

Status: `IN_PROGRESS` / `USER_ACTION_REQUIRED` at M7. This checkpoint repairs
the HUMAN_WAIT oracle handling; it does not claim authenticated observation or
Phase 2A completion.

## Real failure and historical source

Run: `nightwatch-20260810T052211Z-cdd4`.

- Stages through `TARGET_VERIFICATION`: PASS for the configured DEV Ripple
  target `https://appdev.alphaus.cloud/ripple/`.
- Failure: `HUMAN_WAIT` → `SAFETY_MONITOR_FAILED`;
  `monitor-reason: OTHER`, `guard-type: oracle`,
  `event-category: malformed-json`.
- Cleanup: PASS. External auth state: MISSING.
- Recoverable records: `2026-08-10T05:23:12.976Z` and
  `2026-08-10T05:23:16.201Z`; `POST`;
  origin `https://apidev.alphaus.cloud`; path
  `/m/blue/cost/v1/<ID>`; status `200`; Content-Type
  `application/json`; Content-Length unavailable.
- Expected protocol: `json`; observed protocol: `invalid-json`.
- Endpoint classification: `UNKNOWN`; no path-level semantic registry entry
  exists, and HTTP method alone is insufficient to infer mutation.

No response content, request content, credentials, cookies, tokens, customer
data, or storage-state contents were inspected or recorded.

## Classification and cause

Classification: `GENUINE_PROTOCOL_ANOMALY` at the observed protocol-contract
layer, not a false-positive parser applicability event. The parser correctly
ran for a complete-capture candidate declaring `application/json`. The exact
server-versus-truncated-transport subcause is unresolved because body content
and historical Content-Length are unavailable and were not recovered.

The fatal path was a monitor-severity defect. `RunMonitor.recordIssue()` folded
configured oracle failures into the shared `failed` bit, and the direct runner
converted that bit into `SAFETY_MONITOR_FAILED / OTHER`. It was not a
containment failure.

## Repaired behavior

Implementation SHA: `6443baf` (`fix: separate auth oracle anomalies from safety failures`).

- Safety hard failures and oracle failures are tracked separately.
- Auth capture stops HUMAN_WAIT only for safety/containment, browser,
  lifecycle, proxy, guard, production, unknown-destination, or equivalent
  hard failures; protocol anomalies remain sanitized evidence.
- Plain JSON parsing is limited to explicit JSON (or absent Content-Type with
  unambiguous JSON shape), complete non-redirect non-204/205 responses.
- HTML/text, NDJSON/JSON-seq/streaming, redirects, empty responses, and
  incomplete captures are not sent through the plain JSON parser.
- Oracle evidence contains category, anomaly severity, origin/path, method,
  status, content type, expected/observed protocol, and endpoint classification;
  it contains no response content.
- True safety failures remain fatal and network containment is unchanged.

## Validation

- Focused oracle/monitor/direct-runner tests: **20 passed, 0 failed**.
- Synthetic direct-runner capture: **1 passed, 0 failed**.
- Full Playwright suite: **153 passed, 0 failed**.
- `npx tsc --noEmit`: PASS.
- `git diff --check`: PASS.
- `npm run agent:check`: PASS with the expected stale-baseline warning before
  the implementation commit; final checkpoint validation is recorded in STATE.

No authenticated observation, `observe:gate`, Phase 2B work, production
traffic, database query, mutation, credential use, real auth-state write, or
Alphaus repository modification occurred in this repair session.

## Exact next human action

From an interactive terminal, a human may retry the guarded capture only:

```bash
mkdir -p "$HOME/.nightwatch/auth"
npm run auth:capture -- --env=dev --output="$HOME/.nightwatch/auth/ripple-dev-state.json"
```

Do not run authenticated observation until the external state exists and a
fresh local `observe:gate` passes. Do not begin Phase 2B.
