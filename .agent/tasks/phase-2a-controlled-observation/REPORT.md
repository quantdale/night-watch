# Nightwatch Phase 2A — Authenticated Readiness Contract Repair

Status: `IN_PROGRESS` / M7. This repair does not run the real retry, replay, or
Phase 2B.

## Source contract

Current source inspected narrowly:

- Repository: `REPOSITORIES/mobingilabs/ripple-ui`
- Branch: `dev`
- Exact HEAD: `d80b161b684d9153c7e5acaa65ae1752d93d8ba9`
- Freshness: same SHA as the existing Nightwatch source snapshot. The source
  worktree is behind upstream by 17 commits and has unrelated local changes;
  relevant routing/bootstrap/root files are clean. It was not modified.

At this SHA, Ripple's Vue Router base is `/ripple/`; authenticated `/` and
`/login` are redirected to `/dashboard`, producing the final browser route
`/ripple/dashboard`. The shell mount is `#app`, declared in
`public/index.html` and used by `vm.$mount('#app')` in `src/main.js`.

## Root-cause analysis

- `targetConfirmed=false` was a Nightwatch contract mismatch: it required
  exact `/ripple/`, while source-proven authenticated navigation ends at
  `/ripple/dashboard`.
- `appRootPresent=false` came from the runtime query finding no source-backed
  `#app` in the sampled final document. The selector itself is source-correct;
  deployment-versus-timing cause is unresolved without prohibited DOM/body
  inspection. No selector weakening was made.
- `stabilityReached=false` was produced by the old generic network-idle wait:
  zero active requests and 750 ms quiet for up to 15 seconds. It was
  independent of target and app-root predicates. The repaired authenticated
  contract uses complete document readiness, `#app`, and unchanged route for
  750 ms; benign recurring reads and exact locally blocked telemetry/Pylon/
  browser-background traffic do not create instability. Missing `#app` is an
  upstream prerequisite for structural stability; target confirmation remains
  independent.

The three old booleans therefore were not three independent product failures.
The target mismatch was independent; the old stability timeout was a generic
network-idle result, and in the repaired contract a missing root is upstream
of structural stability.

The recurring `POST https://apidev.alphaus.cloud/m/blue/cost/v1/<ID>` HTTP 200
`application/json` invalid-JSON event remains `GENUINE_PROTOCOL_ANOMALY`,
subcause unresolved. It remains metadata-only oracle evidence and was not
made a readiness blocker.

## Repair

Implementation SHA: `ed337d75966f8af20130df32e084459da74dff50`.

Changed files:

- `src/products/ripple/readiness.ts`
- `src/browser/observers/stability.ts`
- `tests/manual/phase2a-authenticated.ts`
- `tests/unit/rippleReadiness.test.ts`

Target safety remains bounded to the exact configured origin and `/ripple/`
namespace. Production, unknown, auth-host-final, host-root, and unrelated
paths remain non-final or fatal under the existing policy. Privacy remains
structural and metadata-only; no customer text, identity, financial value,
DOM dump, body, screenshot, trace, or storage-state content is used.

## Validation

- Focused readiness/runner/gate tests: **21 passed, 0 failed**.
- Readiness matrix: **12 passed, 0 failed**.
- `npx tsc --noEmit`: PASS.
- `npx playwright test`: **171 passed, 0 failed**.
- `npm run agent:check`: PASS with only the expected checkpoint-state
  classification during implementation/state transition.
- `git diff --check`: PASS.

No Alphaus repository was modified. No real Alphaus request, authenticated
observation, replay, production traffic, database query, mutation, external
state read/write, or real authenticated traffic occurred in this repair
session. The external auth state remains outside Nightwatch and uninspected.

## Exact fresh-session retry

Do not run in this repair session. In a fresh interactive session, after
reviewing the checkpoint:

```bash
npm run observe:authenticated -- \
  --env=dev \
  --storage-state="$HOME/.nightwatch/auth/ripple-dev-state.json"
```

Replay remains prohibited until that fresh first observation succeeds.
