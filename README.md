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

Authenticated OOPS subprocesses are enabled only after the versioned
`nightwatch.process-network-containment.v1` qualification reaches `READY`.
The qualified L6 envelope is an unprivileged Bubblewrap network namespace
with no external interface, a minimal read-only root view, a bounded
namespace-local proxy, and an inherited AF_UNIX control channel to the existing
L5/Phase 5 relay authority. Direct DNS/TCP/UDP/HTTP/HTTPS and descendant
escapes fail closed; unsupported host layouts remain unavailable rather than
falling back to an uncontained process. The deterministic proof is in
`tests/unit/l6Containment.test.ts` and is run by `npm run campaign:synthetic`.

## Host requirements and validation lanes

`docs/HOST-CAPABILITY-MATRIX.md` is the current answer to what a host must
provide, which lane proves what, and which dependency claims still carry
evidence. An unqualified host reports unsupported capability and never
inherits a pass. The five central `docs/` documents remain append-heavy
archives; that matrix's §5 names the short list to read for current truth.

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

## Local Control Center

Build and start the loopback-only operational view:

```bash
npm run control-center:ui:build
npm run control-center:start
# http://127.0.0.1:7312
```

The normal launcher reads bounded local authorities when they are present:
validated run summaries/timelines from repository-owned `artifacts/`, current
approved source intelligence, Phase 24 campaign/coverage state, and metadata
from valid owner-local findings under `$HOME/.nightwatch/findings/`. Health,
readiness, and safety continue to use their existing authorities. Missing,
stale, unavailable, blocked, malformed, or partial state stays explicitly
classified; the Control Center never fabricates fresh success or becomes a
second selector, findings store, or run authority.

The server binds only to `127.0.0.1`, accepts read-only GET/HEAD/SSE access,
and serves a repository-confined built UI. It does not start browsers or
commands, contact DEV/NEXT/production or external hosts, read authentication
state, mutate repositories/data, or publish findings. SSE is advisory only;
GET snapshots remain authoritative.

### Opt-in local review (off by default)

Recording a review decision is a separate, deliberately opt-in capability.
Without it the Control Center is strictly `GET, HEAD` and the write route does
not exist at all — it is omitted rather than disabled:

```bash
npm run control-center:start -- --enable-local-review
```

With the flag, one loopback route records an owner-local decision. Reviews
live **outside the repository**, in `$HOME/.nightwatch/reviews` (override with
`NIGHTWATCH_REVIEW_STORE_DIR`), owner-only, never committed and never
deleted automatically. A review is keyed by its complete binding, so a
regenerated artifact yields a new review instead of overwriting the old one,
and the launcher refuses to start with the flag if that store is missing or
is not a real directory (`CONTROL_CENTER_REVIEW_STORE_UNAVAILABLE`).

The reviewer surface answers `NO_LOCAL_REVIEW_STORE` (no authority
configured), `NO_LOCAL_REVIEW` (a store, no decision for this finding),
`CURRENT` (a live decision) or `STALE` (a real decision that no longer binds
to current artifacts — displayed, and displayed as UNKNOWN).

`ACCEPT_EVIDENCE` and its siblings are owner-local and advisory. They are not
Leslie genuine, not Pondr approved, and not a bounty acceptance.

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

### Local evidence retention

Nightwatch writes one artifact directory per run and never overwrites one, so
the store grows without bound. Retention is refusal-first and read-only by
default:

```bash
npm run retention:status              # report only; removes nothing
npm run retention:plan                # dry run, same guarantees
node bin/evidence-retention.mjs --apply --keep-recent=100   # owner-gated
```

`status` and `plan` never mutate. `--apply` is the explicit owner flag and is
deliberately not an `npm run` shortcut. The plan computes what must be
REFUSED before what may be removed, and refuses:

- any artifact whose name appears in tracked project state (`.agent`, `docs`,
  `openspec`, `config`) — it is load-bearing evidence;
- the newest `--keep-recent` directories, as the working set;
- anything unmeasurable, and everything at all if the reference scan could not
  complete — an incomplete scan cannot prove a negative;
- anything that is not a plain directory, including symlinks.

Removal operates on whole unreferenced run directories only. No artifact is
ever rewritten, truncated or replaced, so the immutable-evidence and
no-replace identity patterns the evidence and review stores rely on are
preserved. Reclaiming nothing is a valid outcome, reported as `PRESERVED`.

Contract coverage health over an exact source snapshot is available as
`npm run contract:health -- --snapshot=<dir> --sha=<sha>` (or
`--inventory=<file.json>`); it is source-only and read-only.

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
