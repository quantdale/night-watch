# Nightwatch

Private, local, autonomous bug-hunting framework for Alphaus products.
The active roadmap is **private evidence minimization and autonomous triage**:
contained DEV application evidence is reduced to deterministic, sanitized,
owner-reviewable dossiers.

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

## Authoritative local quality and source intelligence

The unified quality gate is the local authority for Nightwatch checks:

```bash
npm run gate:local       # serial local gate
npm run gate:clean       # disposable Node 20 checkout qualification
npm run campaign:synthetic
```

Phase 25–28 source intelligence is local, read-only, bounded, deterministic,
and raw-source-free. It scans only the fixed approved sibling-source universe
and feeds mechanically proven surfaces into the existing Phase 24 portfolio:

```bash
node bin/nightwatch-intelligence.mjs source-scan --repo=mobingilabs/ripple-api --json
node bin/nightwatch-intelligence.mjs surfaces --repo=mobingilabs/ripple-api --json
node bin/nightwatch-intelligence.mjs source-gaps --json
node bin/nightwatch-intelligence.mjs review-queue --repo=mobingilabs/ripple-api --json
node bin/nightwatch-intelligence.mjs explain-surface --repo=mobingilabs/ripple-api --surface=<safe-id> --json
```

Phase 26–28 add response-proof, semantic-proof, lifecycle, analyzer,
currentness, bounded-performance, and rejection-taxonomy metrics to the same
source views. `source-gaps` exposes only aggregate safe metadata, including
taxonomy v3 and deterministic before/after-compatible digests; it never emits
raw source, literal values, or a debug-source escape hatch. A surface is mechanically trusted
only when bounded source evidence proves it; dynamic values, incomplete
branches, ambiguous joins, mutation risk, and missing runtime authority remain
explicit exclusions. The source scan does not create a journey, authorize an
execution, or infer deployment equivalence.

The source views reject `--env` flags and never start a browser, read auth,
contact a product environment, or publish findings. Human-readable output is
available by omitting `--json`; owner review remains local. Real findings, if
created by an authorized future workflow, stay under owner-only
`$HOME/.nightwatch/findings/`. Any DEV campaign requires fresh authorization,
fresh source/currentness checks, and the existing exact-head external quality
gate; source discovery grants none.

For the authoritative local certification, use the unified gate and its
versioned inventory rather than an ad-hoc Phase-specific command:

```bash
npm run typecheck
npm run hardening:check
npm run quality-gate:spec
npm run gate:inventory
npm run test:semantic-compat
npm run gate:local
npm run gate:clean
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

## Permanent boundaries

- Phase 6 infrastructure/data-layer work is frozen by owner. The executable
  policy is `FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`;
  cloud, deployment, Kubernetes, AWS infrastructure, and datastore operation
  classes fail locally with `OWNER_POLICY_BLOCKED`.
- Nightwatch never asks coworkers for deployment metadata and never performs
  GCP/GKE/Kubernetes archaeology, AWS STS/IAM/runtime-role discovery, DynamoDB,
  BigQuery, Spanner, production SQL, or datastore metadata discovery.
- Nightwatch never posts to Slack, opens GitHub/Jira/Linear items, sends email,
  writes shared Drive/Notion/docs, uploads evidence, or creates PRs. Findings
  stop at owner-reviewed local dossiers.

## Repository boundaries

- Nightwatch may READ repos under `REPOSITORIES/alphauslabs` and
  `REPOSITORIES/mobingilabs` but never edits, commits, or installs into them.
- All implementation changes live under `REPOSITORIES/nightwatch/`.
- Phase 1 journeys are strictly read-only: no create/edit/save/delete,
  no finalize/calculate, no token generation, no commitments, no settings
  mutation. If an interaction cannot be proven passive, it is skipped.
- Credentials are never hardcoded, never copied into artifacts; authenticated
  state is referenced by file path (`NIGHTWATCH_STORAGE_STATE`) or not at all.

Private real findings use owner-only local storage outside this repository by
default (`$HOME/.nightwatch/findings/`). Synthetic fixtures and schemas may be
versioned; private real evidence is not.
