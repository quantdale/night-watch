# Nightwatch

Private, local, autonomous bug-hunting framework for Alphaus products.
**Phase 1.2** — scaffold, layered browser safety, mandatory loopback egress
proxy, passive Ripple observer, evidence recorder, and synthetic containment
self-tests. Phase 2 product testing has not started.

> The default `local` scenario targets a built-in fixture app and performs
> **zero** network I/O beyond `127.0.0.1`. No production request can pass the
> outbound-request policy (see `docs/SAFETY_MODEL.md`).

## Safety in one paragraph

Nightwatch **fails closed** on every outbound request: the browser harness and
mandatory outer loopback proxy inspect every request, and the policy allows only hosts explicitly listed in
the selected environment's allowlist. Known production hosts
(`api.alphaus.cloud`, `bluerpc.alphaus.cloud`, `login.alphaus.cloud`,
`blue.alphaus.cloud`, `app.alphaus.cloud`, `*.mobingi.com`, `*.run.app`),
unknown Alphaus hosts, and unexpected external hosts are all DENIED — the
request is aborted before leaving the browser and the run hard-fails.
Host classification is explicit, never string-matching on "prod".
All evidence passes through a redaction layer before persistence.

## Quickstart

```bash
npm install
npx playwright install chromium   # only if system Chrome is unavailable
                                  # (default config drives system Chrome)
npm run typecheck
npm test                          # unit + smoke tests of Nightwatch itself
```

Run the Phase 1 passive Ripple scenario (local fixture, fully offline):

```bash
npm run scenario -- --env=local
# artifacts/<run-id>/  contains manifest.json, repositories.json,
#                      events.jsonl, network.jsonl, console.jsonl, proxy.jsonl,
#                      summary.json,
#                      trace.zip, screenshots (on failure)
```

Point at a real local Ripple dev server (still fail-closed against prod):

```bash
npm run scenario -- --env=local --ui-url=http://127.0.0.1:8080
```

## Layout

```
src/core/environment/   fail-closed env selection + config loading
src/core/safety/        outbound-request policy, canary, action policy, redaction
src/core/evidence/      run recorder (artifacts/<run-id>), event contracts
src/core/repositories/  read-only repo snapshot collector
src/browser/            Playwright harness: observers, network, fixtures
src/proxy/              mandatory loopback HTTP/CONNECT/Upgrade egress gate
src/oracles/protocol/   generic passive protocol oracles
src/products/ripple/    Ripple product config + passive action table
scenarios/ripple/       runnable Phase 1 scenarios
config/environments/    per-env host allowlists (local/dev/next; prod rejected)
tests/                  Nightwatch's own unit + smoke tests
docs/                   ARCHITECTURE, SAFETY_MODEL, CURRENT_STATE, ROADMAP, DECISIONS
artifacts/              run evidence (gitignored)
```

## Boundaries

- Nightwatch may READ repos under `REPOSITORIES/alphauslabs` and
  `REPOSITORIES/mobingilabs` but never edits, commits, or installs into them.
- All implementation changes live under `REPOSITORIES/nightwatch/`.
- Phase 1 journeys are strictly read-only: no create/edit/save/delete,
  no finalize/calculate, no token generation, no commitments, no settings
  mutation. If an interaction cannot be proven passive, it is skipped.
- Credentials are never hardcoded, never copied into artifacts; authenticated
  state is referenced by file path (`NIGHTWATCH_STORAGE_STATE`) or not at all.
