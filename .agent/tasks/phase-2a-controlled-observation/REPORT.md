# NIGHTWATCH PHASE 2A — AUTHENTICATED BOOTSTRAP DIAGNOSTICS READY

Status: `IN_PROGRESS` / M7. This checkpoint does not run the real retry,
replay, or Phase 2B.

## Latest real observation

Run: `nightwatch-20260811T012811Z-9045`

- Pre-real-run gate: **13/13 PASS**.
- Environment/origin: authenticated DEV / `https://appdev.alphaus.cloud`.
- Final path: `/ripple/`.
- `document.readyState`: `complete`.
- Top-level frame: present; frames `1`, iframes `0`.
- Body: present; safe child count `8`.
- Source-backed rendered shell: `DIV.q-layout-container.layout`, absent.
- `routeStable=true` at the final sample, `routeStableMs=0`.
- `stabilityReached=false`; navigation was not in progress; page remained open.
- Fatal page errors: `0`.
- Destination manifest: `3` expected, `7` blocked, `0` unresolved.
- Production attempts, proxy violations, mutations, and DB queries: `0`.
- Replay: **NOT RUN**.
- M7: **IN_PROGRESS**.

## Classification

No product bootstrap root cause is proven from the existing evidence.

| Candidate | Result | Evidence basis |
|---|---|---|
| `AUTH_STATE_REPLAY_INEFFECTIVE` | Not established | Structural storage-state loading/provenance passed and was recorded before navigation; no auth redirect or auth-status evidence exists. Staying at `/ripple/` alone is insufficient. |
| `ENTRY_DOCUMENT_WRONG_OR_UNEXPECTED` | Not established | Both document loads were `200 text/html` from the approved DEV `/ripple/` path. |
| `CRITICAL_ASSET_LOAD_FAILURE` | Ruled out by current metadata | App/vendor entry assets completed twice with `200 text/javascript`; all `112` JavaScript responses and observed CSS/HTML/font/image/SVG responses were HTTP 200. Six failures were expected containment. |
| `JAVASCRIPT_BOOTSTRAP_EXCEPTION` | Not established | Historical pageerror count was `0`, but the old observer did not capture all runtime categories. |
| `ROUTER_BOOTSTRAP_FAILURE` | Unresolved | The final path stayed at `/ripple/`, but route-transition/router-start evidence was not captured. |
| `EXPECTED_RESOURCE_BLOCK_CAUSED_BOOTSTRAP_FAILURE` | No evidence | Blocked resources were telemetry, optional Pylon support, or reviewed browser-background traffic; no blocked dependency was proven required. Containment is unchanged. |
| `DEPLOYMENT_SOURCE_DIVERGENCE` | Unresolved | Observed `/ripple/static/` paths agree with the reviewed source/build configuration, but no safe deployment identity or execution proof exists. |
| `OBSERVER_BLIND_SPOT` | Confirmed as a Nightwatch gap | The old observer lacked separate unhandled-rejection, CSP, resource-error, module/chunk, and route-transition diagnostics. |
| `OTHER / UNRESOLVED` | Current product result | Execution, router start, auth effectiveness, and the second document load remain unresolved without prohibited content inspection or a fresh instrumented run. |

The known malformed JSON anomaly remains separate:
`POST https://apidev.alphaus.cloud/m/blue/cost/v1/`, HTTP 200,
`application/json`, invalid JSON. Its subcause remains unresolved; no body was
inspected and it is not treated as the shell-bootstrap cause.

## Diagnostic repair

Implementation SHA: `952be215a0d65843e2fb7f8d15e0c28a7d7b142a`.

Files changed:

- `src/browser/observers/bootstrapHooks.ts` — opt-in fixed-category hooks for
  unhandled rejection, CSP, resource/runtime errors, and route transitions.
- `src/products/ripple/bootstrapDiagnostics.ts` — sanitized resource merger,
  bootstrap counters, failure metadata, observer coverage, and conservative
  A–I classification. Diagnostic confirmation requires `/ripple/dashboard`;
  it cannot treat `/ripple/` as authenticated success.
- `src/browser/context.ts` and `tests/manual/phase2a-authenticated.ts` — enable
  the layer only for the Phase 2A authenticated observer and persist the
  summary in sanitized manifest/comparison metadata.
- `src/browser/observers/networkObserver.ts` — resource type, status,
  content-type, completion, policy, failure, and ordering metadata.
- `src/browser/observers/pageObserver.ts` and `consoleObserver.ts` — safe
  source origin/path metadata only.
- `src/core/evidence/types.ts` — bootstrap event category.
- `tests/unit/bootstrapHooks.test.ts` and
  `tests/unit/rippleBootstrapDiagnostics.test.ts` — local synthetic coverage.

No selector, stability interval, containment rule, or replay behavior changed.
No response bodies, request bodies, cookies, tokens, storage-state contents,
DOM, text, identity, screenshots, or traces are recorded by the new layer.

## Validation and safety

- Focused bootstrap/hooks/readiness tests: **35 passed, 0 failed**.
- Full `npx playwright test`: **194 passed, 0 failed**.
- `npx tsc --noEmit`: PASS.
- `git diff --check`: PASS for staged implementation and task-state changes.
- `npm run agent:check`: PASS with one expected approved `CHECKPOINT_ADVANCE`
  warning for the task-state files.
- No Alphaus repository was modified.
- No new real Alphaus traffic, production traffic, replay, mutation, DB query,
  auth-state read, or body inspection occurred in this diagnostic session.

## Exact next action

Do not execute in this diagnostic implementation session. In a later fresh
authorized session, run exactly:

```bash
npm run observe:authenticated -- \
  --env=dev \
  --storage-state="$HOME/.nightwatch/auth/ripple-dev-state.json"
```

Inspect only its sanitized bootstrap summary. Do not run replay unless the
instrumented first observation satisfies the unchanged readiness contract, and
do not begin Phase 2B.
