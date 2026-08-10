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
`/ripple/dashboard`. The `#app` element declared in `public/index.html` is
the Vue bootstrap mount target, not the post-mount shell.

The lockfile resolves Vue `2.6.12` and Quasar `1.15.4`. `src/main.js` renders
`App` with `render: h => h(App)` and calls `vm.$mount('#app')`. `App.vue`
selects `default-layout` for authenticated route records; `DefaultLayout.vue`
passes static class `layout` to containerized `q-layout`. Quasar's QLayout
returns a root `DIV.q-layout-container`, so Vue's class inheritance produces
the source-backed post-mount shell marker:

```text
bootstrap mount selector: #app
post-mount shell selector: .q-layout-container.layout
post-mount shell element: DIV
```

## Root-cause analysis

- `targetConfirmed=false` was a Nightwatch contract mismatch: it required
  exact `/ripple/`, while source-proven authenticated navigation ends at
  `/ripple/dashboard`.
- The historical `appRootPresent=false` result came from querying the Vue
  bootstrap placeholder after mount. Vue 2.6.12 normally replaces that
  non-hydrating target, so the absence is expected and is not evidence of
  deployment/source divergence. Nightwatch now records it only as
  `bootstrapMountTargetPresent` and queries the rendered shell separately.
- `stabilityReached=false` was produced by the old generic network-idle wait:
  zero active requests and 750 ms quiet for up to 15 seconds. In the current
  structural timer, `routeStable=true` with `routeStableMs=0` was causal: the
  route stayed unchanged, but the old `#app` predicate never started the
  continuous interval. The repaired contract uses complete document readiness,
  the rendered shell, and unchanged route for 750 ms; benign recurring reads
  and exact locally blocked telemetry/Pylon/browser-background traffic do not
  create instability.

The three old booleans therefore were not three independent product failures.
The target mismatch was independent; the old stability timeout was a generic
network-idle result, and in the repaired contract a missing root is upstream
of structural stability.

The recurring `POST https://apidev.alphaus.cloud/m/blue/cost/v1/<ID>` HTTP 200
`application/json` invalid-JSON event remains `GENUINE_PROTOCOL_ANOMALY`,
subcause unresolved. It remains metadata-only oracle evidence and was not
made a readiness blocker.

## Repair

Repair implementation SHA: `701748ed516d83aa09b88e6e2a9875cec726142c`.

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

A local browser regression runs the actual Vue `2.6.12` UMD runtime against
`<body><div id="app"></div></body>` and verifies that `#app` disappears while
`DIV.q-layout-container.layout` is present. The readiness matrix rejects the
placeholder alone, requires the rendered shell, starts stability after delayed
shell appearance, resets on route/shell changes, and keeps safety/oracle
signals independent.

## Validation

- Focused readiness/mount/stability tests: **20 passed, 0 failed**.
- `npx tsc --noEmit`: PASS.
- Full local suite after the repair: **179 passed, 0 failed**.
- `npm run agent:check`: PASS with only the expected checkpoint-state
  classification during implementation/state transition.
- `git diff --check`: PASS.

No Alphaus repository was modified. No real Alphaus request, authenticated
retry, replay, production traffic, database query, mutation, external state
read/write, or real authenticated traffic occurred in this repair session.
The latest real run remains `nightwatch-20260810T140122Z-02d9` with gate
13/13 PASS and final `/ripple/dashboard`; replay remains NOT RUN. The external
auth state remains outside Nightwatch and uninspected.

## Exact fresh-session retry

Do not run in this repair session. In a fresh interactive session, after
reviewing the checkpoint:

```bash
npm run observe:authenticated -- \
  --env=dev \
  --storage-state="$HOME/.nightwatch/auth/ripple-dev-state.json"
```

Replay remains prohibited until that fresh first observation succeeds.
