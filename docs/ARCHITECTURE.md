# Nightwatch Architecture

Status: Phase 1.2 plus private local evidence triage, Phase 7 deterministic
campaigns, Phase 7B/7B.1/7B.1.1/7B.1.2/7B.2/7B.2.1/7B.3 bounded private AI
review assistance, the Phase 8A evaluated self-development sandbox foundation,
the Phase 8A.1/8A.1.1 trusted evaluation provenance/replay/eligibility
boundary, and the Phase 8B controlled source adoption sandbox. This document describes the implemented scaffold, browser
containment, and mandatory out-of-process L5 proxy. The future restricted
container is explicitly marked planned; nothing here starts Phase 2 product
testing. The safety model is normative and load-bearing — read
`docs/SAFETY_MODEL.md` alongside this document.

Design input: `NIGHTWATCH_RECON_B.md` (the full-stack oracle map,
`investigations/nightwatch_recon_b/`). Facts cited from it use its IDs
(E1–E10, L0–L5, §1–§14).

---

## 1. Purpose and goals

Nightwatch is a private, local, autonomous bug-hunting framework for Alphaus
products. It observes real browser journeys against Ripple (Phase 1) and,
in later phases, other products, then answers: **"is this sequence correct?"**
— where correctness is defined as deterministic, machine-checkable assertions
over the (request → response → persisted state) triple (RECON_B §1).

Phase 0/1 goals:

1. **Fail closed by default.** No production request can pass the outbound
   policy; unknown targets are denied; unselected environments are denied.
2. **Strictly read-only.** Phase 1 journeys perform no mutations; Nightwatch
   never writes to any Alphaus repository.
3. **Evidence-backed.** Every run produces a self-contained, redacted,
   deterministic artifact bundle under `artifacts/<run-id>/`.
4. **Self-tested.** Nightwatch's own unit and smoke tests prove the safety
   guarantees (see `docs/SAFETY_MODEL.md` §14).

The active roadmap is intentionally application-level: local source
intelligence, approved DEV browser/API execution, deterministic replay,
failure minimization, sanitized evidence, and private local triage. Phase 6's
real datastore execution and all infrastructure/deployment archaeology are
frozen by owner policy. They are not prerequisites for useful Nightwatch
operation and must fail locally before an external command or adapter is
invoked.

The platform reality that motivates the architecture (RECON_B §4, E1–E10):
application-level environment selection (SDK defaults, CLI flags, UI cookies,
hardcoded URLs) is *not* a boundary — most Alphaus clients default to
production. The only invariant point is the request itself as it leaves the
browser. Hence the architecture is built around request-level policy.

---

## 2. Module map

| Module | Responsibility | Status |
|---|---|---|
| `src/core/environment/` | Fail-closed environment selection (`assertSupportedEnvironment`, `selectEnvironment`, `loadEnvironmentConfig`, shape validation). `production` is never selectable. | implemented |
| `src/core/safety/types.ts` | Shared safety contracts: `HostClass`, `Verdict`, `OutboundDecision`. | implemented |
| `src/core/safety/redaction.ts` | `RedactionLayer`: sensitive-header list, sensitive query params, secret-shape patterns (Bearer/JWT/AWS key/PEM/JSON secret fields), runtime secret registry. No I/O. | implemented |
| `src/core/safety/hosts.ts` | Explicit host classification tables: `KNOWN_PRODUCTION_HOSTS`, `DEV_HOSTS`, `NEXT_HOSTS`, `CLOUD_RUN_SUFFIX` (`.run.app`), `ALPHAUS_DOMAINS` (`alphaus.cloud`, `mobingi.com`). | *in flight* |
| `src/core/safety/outboundPolicy.ts` | `OutboundPolicy.decide(rawUrl): OutboundDecision`. Rule order: non-http → internal allow; env allowlist → allow; static asset list → allow; exact browser-background list → local block; optional support → local block; telemetry list → block-telemetry; known production → deny; `*.run.app` → deny; unknown `*.alphaus.cloud` → deny; `*.mobingi.com` → deny; localhost when not allowlisted → deny; else external deny. Pure logic, no I/O. | *in flight* |
| `src/core/safety/canary.ts` | Startup policy canary (`runCanary`, `defaultCanaryChecks`, `assertCanary`): asserts the policy/redaction/action tables behave as specified. Pure policy logic, zero network I/O. | *in flight* |
| `src/core/safety/actions.ts` | Passive action policy: `assertPassiveAction`, `classifyRippleAction`, `RIPPLE_MUTATION_PATTERNS`. Gates every journey step. | *in flight* |
| `src/core/evidence/types.ts` | Event contracts: `RunEvent`, `RunEventType`, `RunSummary`, `RepoSnapshotRecord`. | implemented |
| `src/core/evidence/runRecorder.ts` | `RunRecorder`: writes `artifacts/<run-id>/{manifest.json, events.jsonl, network.jsonl, console.jsonl, repositories.json, summary.json, screenshots/}`; shared `RedactionLayer`; injected clock for determinism; monotonic event sequencing. | *in flight* |
| `src/core/repositories/snapshotter.ts` | Read-only git snapshot collector: branch, HEAD SHA, upstream, ahead/behind, dirty state, last commit, timestamp. Never mutates a repo. | *in flight* |
| `src/browser/context/` | Playwright browser-context factory: system Chrome via `channel`, storage-state by path, tracing decision (disabled when authenticated state is in use), installs the request-inspection route. | *in flight* |
| `src/browser/observers/` | Console, page-error, and request-failed observers emitting redacted `RunEvent`s. | *in flight* |
| `src/browser/network/` | Request inspection: every request → `OutboundPolicy.decide` → verdict handling (allow / local block+abort / deny+abort+hard-failure), redacted request/response recording. | *in flight* |
| `src/proxy/` | Mandatory loopback L5 HTTP/CONNECT/Upgrade proxy, strict destination parser, canonical policy adapter, sanitized event log and runtime health state. | implemented |
| `src/browser/fixtures/` | Built-in fixture app for the default `local` scenario (`http://127.0.0.1:7311`): serves the candidate passive routes with deterministic responses; zero external network. | *in flight* |
| `src/oracles/protocol/passiveChecks.ts` | Generic passive protocol oracles: uncaught page errors, console errors, unexpected failed requests, unexpected production/unknown-host requests, malformed JSON, malformed NDJSON, navigation failure, stability timeout. | *in flight* |
| `src/core/policy/ownerScope.ts` | Central owner-scope gate. Allows local/source/contained DEV/replay/evidence operations and rejects frozen infrastructure, datastore, deployment, and external-publication classes with `OWNER_POLICY_BLOCKED`. | implemented |
| `src/core/policy/privateArtifacts.ts` | Owner-only local JSON store for private dossiers and summaries; immutable AI publication uses complete fsynced same-directory temporaries plus no-replace `linkSync`, while non-immutable workflows retain staged replacement semantics. Default root is outside the repository and has no publication API. | implemented |
| `src/core/triage/` | Deterministic minimization, sanitized fingerprint clustering/deduplication, browser/API differential, source relevance, conservative app-layer localization, dossier generation, recipes, and private summaries. | implemented |
| `src/core/aiReview/` | Strict sanitized AI input/output DTOs, L2/L3 eligibility, synthetic provider, optional loopback-only provider, non-executable oracle suggestions, owner review records, staleness, rendering, and private companion storage. No authority over deterministic evidence or execution. | implemented |
| `src/core/aiReview/localCanary.ts` | Fixed synthetic L2 fixture, strict canary arguments, one fresh session, one `BUG_CANDIDATE` call maximum, in-memory v2 validation, and sanitized non-persistent result metadata. | implemented |
| `src/core/selfDev/` | Explicit Phase 8A/8A.1/8A.1.1 companion subsystem: strict versioned DTOs, recomputed session identity, semantic state machine, fixed registries, bounded proposer/evaluator, ordered replay, future-review eligibility gate, and the empty data-only Phase 8B adopted-case catalog (`adoptedCases.ts` + `adoptedCaseCatalog.generated.ts`) whose live contents seed evaluator baseline state and are bound into `contractDigest`. Phase 8B.1.0 adds the bounded deterministic proposal portfolio (`portfolio.ts`: EXPAND_SUMMARY / EXPAND_THEN_COLLAPSE, frozen order, registry-derived coverage/fingerprints) and the pure catalog-aware novelty selector; the controller resolves the default alias to a concrete replay fixture; portfolio exhaustion is a valid terminal state. | implemented; no canonical adopter |
| `src/core/selfDevSandbox/` | Phase 8B sandbox-mutation authority boundary, distinct from the pure `selfDev` trust/evaluation domain: a pure deterministic adoption planner, immutable private plan/result storage, a disposable owner-private source mirror, and a bounded serial cache-isolated TypeScript sandbox loader that executes the modified sandbox evaluator to metamorphically prove one adoption's effect. Zero canonical source write, Git, AI, product, database/infrastructure, or publication authority. | implemented; sandbox-only, no canonical apply |
| `src/core/provenance/` | Fixed-path source-bundle/contract provenance and no-shell local Git metadata boundary; read-only only. | implemented |
| `bin/selfdev-synthetic.mjs` | Thin wrapper for one bounded synthetic v2 session with locally attested provenance, replay, immutable write, and read-back summary. | implemented |
| `bin/selfdev-verify.mjs` | Exact-ID read-only v1/v2 classifier, current-source assessment, and ordered replay verifier; no enumeration or mutation mode. | implemented |
| `bin/selfdev-adopt-sandbox.mjs` | Exact-ID `inspect`/`plan`/`run` CLI over the Phase 8B sandbox boundary; `run` requires the fixed `SANDBOX_ONLY` confirmation token. No latest/list/path/patch/model option and no apply/commit/push/promote/merge/install command. | implemented |
| `src/core/aiReview/ownerReview.ts` | Provider-free exact-ID owner snapshot loader, terminal-safe bug/oracle renderer, fixed confirmation semantics, projections, and v1 read-only handling. Read-only public service; no decision writer. | implemented |
| `src/core/aiReview/ownerDecision.ts` | Internal digest-bound decision writer; raw helper is private and the confirmed entry is loaded only by the owner-review CLI. Creates review provenance, atomically persists it, and strictly reads it back. | implemented |
| `bin/ai-owner-review.mjs` | Private human interface with only `show`, `status`, `decide`, and help; TTY gate, fixed decision boundary, sole tracked runtime loader of the internal decision writer, and no provider/network/Git/publication path. | implemented |
| `bin/ai-local-canary.mjs` | One-shot synthetic local-model canary wrapper; accepts only strict endpoint/model/timeout arguments and never reads findings or owns transport/process/publication authority. | implemented |
| `bin/agent-state.mjs` | Read-only task continuity validator: claimed-commit implementation/documentation SHA roles, STARTING_SHA lineage, live Git HEAD discovery, approved checkpoint classification, and COMPLETE-task source-drift closure. | implemented |
| `src/products/ripple/config.ts` | Ripple product config: candidate passive routes (dashboard, invoice list/detail, billing-group list/detail). | implemented |
| `scenarios/ripple/` | Runnable Phase 1 scenarios; `local.smoke.ts` targets the fixture app by default. | *in flight* |
| `config/environments/` | Per-environment allowlists and labels with provenance: `local.json`, `dev.json`, `next.json`; `production.json` documents the rejected surface only. | implemented |
| `bin/nightwatch.mjs` | Fail-closed CLI: `--env` required (missing/unsupported → exit 2), forwards to the Playwright runner. | implemented |
| `tests/` | Nightwatch's own unit tests (`tests/unit`) and smoke tests (`tests/smoke`). | *in flight* |
| `artifacts/` | Run evidence output. Gitignored; evidence is never committed. | scaffold |

The Playwright project launches Chromium with an explicit proxy from
`playwright.config.ts`; `tests/globalSetup.ts` binds and health-checks the
proxy before controlled browser execution. Loopback bypass is removed with
`--proxy-bypass-list=<-loopback>` and the A/B sink test is the empirical proof.

---

## 3. Run lifecycle

A Nightwatch run proceeds through the following stages:

1. **Environment selection** (`src/core/environment`). `bin/nightwatch.mjs`
   requires `--env=local|dev|next`; missing or unsupported → exit 2. The
   config file must exist, match its `name`, and pass shape validation;
   any failure → `EnvironmentSelectionError` (deny). `production` is not
   selectable (D-4).
2. **Startup canary** (`src/core/safety/canary.ts`). Before any browser is
   launched, the policy, redaction, and action tables are asserted against
   their expected behavior (production hosts deny, unknown Alphaus hosts
   deny, allowlist hosts allow, telemetry blocks, secrets redact, mutations
   reject). Zero network I/O: the canary is pure in-memory logic.
3. **Repository snapshot** (`src/core/repositories/snapshotter.ts`). Every
   tracked repo under `NIGHTWATCH_REPOS_ROOT` (default: the parent of the
   nightwatch directory, i.e. `REPOSITORIES/`) is snapshotted read-only:
   branch, HEAD SHA, upstream, ahead/behind, dirty count, last commit,
   timestamp. Written to `repositories.json`. The snapshot is evidence of
   *state*, not proof of *freshness* (RECON_B §3: local checkouts drift —
   e.g. `ouchan` was 19 commits behind origin/master; re-verify before
   trusting code-derived assumptions, per D-8/D-12).
4. **Mandatory L5 startup, then browser context with request inspection.**
   Playwright global setup starts the loopback proxy and health-checks it;
   `createNightwatchContext` repeats the health check, polls liveness during
   the run, and refuses or fatally records a missing/crashed proxy. A Chromium
   context (system Chrome via `channel: 'chrome'`) is then created;
   `context.route('**/*')` is installed *before* any
   page loads so that **every** request passes through the policy. Optional
   `NIGHTWATCH_STORAGE_STATE` (path only) loads authenticated state; when it
   is present, tracing is disabled and the run is marked authenticated.
   Otherwise the run is clearly marked UNAUTHENTICATED.
5. **Journey actions (all passive)** (`scenarios/*`, `src/core/safety/actions.ts`).
   The scenario walks the product's candidate routes. Every step passes
   `assertPassiveAction`; anything that cannot be proven passive is skipped
   and recorded, never executed (D-11). Observers (`console`, `pageerror`,
   `requestfailed`) run for the whole journey; the harness waits for
   stability before each assertion point (network quiet + no pending
   requests; persistent instability → `stability-timeout` oracle).
6. **Evidence finalize** (`src/core/evidence/runRecorder.ts`). The recorder
   closes the run: final `events.jsonl`/`network.jsonl`/`console.jsonl`
   flush, `summary.json` (counts, severity counts, hard failures,
   screenshots, `nightwatchSha`, proxy aggregates), `manifest.json` (artifact index and run
   identity), optional `trace.zip` and failure screenshots. A hard failure
   (denied outbound request) always fails the run and is recorded.

The resulting egress topology is:

```
Browser / browser-internal channels
          │
          ▼
Nightwatch L0–L4 browser controls
          │
          ▼
mandatory loopback L5 proxy  ──► approved target only
          │
          └── denied / unknown / malformed: local response, no DNS/TCP
```

The post-run evidence topology is:

```
source/change intelligence + contained browser/API evidence
        ↓
safe replay and bounded subsequence minimization
        ↓
sanitized fingerprint clustering and browser/API differential
        ↓
source relevance + conservative application-layer boundary
        ↓
owner-only local bug dossier / overnight summary / morning brief
```

Optional owner-invoked Phase 7B review is a one-way companion branch:

```
sanitized deterministic AI-ready package or Phase 3 structural change DTO
        ↓
AiReviewSession attempt/deadline authority
        ↓
strict input/local-provider validation
        ↓
final runtime/cap admission and cancellation context
        ↓
providerCalls += 1 immediately before private handler entry
        ↓
private synthetic provider or explicit loopback-local provider
        ↓
monotonic remaining-runtime cap + AbortSignal transport cancellation
        ↓
strict hostile-output validator
        ↓
immutable owner-only AI-generated/unreviewed v2 companion artifact
        ↓
separate exact-key digest-bound owner review record
        ↓
validated effective review projection with current-input freshness
```

The Phase 7B.2 human interface is a separate terminal-only branch over the
persisted artifact and review nodes; it never points back to `AiReviewSession`
or a provider:

```
explicit kind + exact artifact ID
        ↓
owner-only store read + persisted identity validation
        ↓
terminal-safe `[AI]`/`[SYSTEM]` snapshot rendering
        ↓
fixed owner decision boundary + TTY A/R/S/Q menu
        ↓
exact second confirmation token
        ↓
internal ownerDecision writer → createHumanReviewRecord →
writeHumanReview → complete fsynced temp → linkSync no-replace publication →
strict read-back validation
        ↓
digest-bound snapshot projection
```

`show` and `status` perform no write. `decide` can create only one v2
companion review for an unreviewed exact artifact; the AI artifact, evidence,
campaign, catalog, source, executable, publication, and Phase 8 state remain
unchanged. Terminal sanitizer output is plain text and marks freshness
`SNAPSHOT_ONLY_NOT_REEVALUATED`.

Phase 7B.3 adds a separate one-shot local-model canary branch. It is a
synthetic protocol check, not a campaign or product path:

```
fixed repository-owned synthetic L2 input
        ↓
strict endpoint/model argument validation
        ↓
fresh AiReviewSession without AiReviewArtifactStore
        ↓
one reviewBugCandidate call only
        ↓
LoopbackAiReviewProvider → /v1/chat/completions on explicit loopback only
        ↓
strict v2/reference/privacy/control validation in memory
        ↓
sanitized canary metadata → discard draft and model prose
```

`bin/ai-local-canary.mjs` accepts no prompt, evidence, file, finding, owner
decision, oracle, retry, tool/function, browser, product, publication, Git, or
runtime-installation argument. The controller fixes the operation to
`BUG_CANDIDATE`, enforces `providerCalls <= 1`, keeps `artifactPath=null`, and
does not load private findings. CI uses only the local HTTP fixture; a real
canary is optional and cannot run unless an already-installed model, exact
model identifier, and exact safe loopback endpoint are independently proven.

The branch cannot flow back into anomaly admission, evidence level, campaign
state, safety/privacy vectors, action/oracle catalogs, browser/API execution,
Phase 6, publication, Git, or source. Phase 7 campaign execution remains
deterministic and does not invoke this branch.

There is deliberately no datastore or infrastructure branch in this flow.

Phase 8A is a separate companion branch and never enters the campaign or AI
review authority graph:

```
SYNTHETIC_DETERMINISTIC proposer (untrusted declarative data)
        ↓
strict nightwatch.selfdev-candidate.private.v1 DTO
        ↓
fixed LOCAL_SYNTHETIC fixture/action/assertion registries
        ↓
schema/scope/safety/privacy/duplicate/budget checks
        ↓
deterministic structural execution and computed coverage delta
        ↓
nightwatch.selfdev-evaluation.private.v1
        ↓
owner-only immutable self-development artifact → STOP
```

The candidate schema has no code, source, patch, diff, path, command, shell,
URL, endpoint, prompt, model, tool, function, Git, or output-path field.
Unknown action/assertion IDs and unsafe fixture or scope claims fail before
execution. The evaluator contains no `eval`, `Function`, callback, network,
browser, auth, database, infrastructure, AI-review, campaign, oracle
registration, Git, or repository-source-write capability. Results always carry
`adoptionStatus=NOT_AUTHORIZED_PHASE_8A`, `publication=PROHIBITED`, and zero
runtime writes/calls. Phase 8B source adoption is a distinct, separately
implemented boundary (below), not a hidden continuation of this graph.

### Phase 8A.1 trusted provenance and replay branch

Phase 8A.1 extends the companion branch without adding an adopter:

```text
untrusted bounded proposal descriptor
        ↓
strict candidate/evaluation v2 DTOs and canonical session ID
        ↓
semantic result-state + candidate/evaluation/baseline binding
        ↓
fixed sourceBundleDigest + evaluator contractDigest
        ↓
real local Git HEAD / clean authoritative paths
        ↓
ordered stateful replay with deterministic clock
        ↓
immutable exact-ID private v2 artifact + read-back
        ↓
derived trust assessment → STOP
```

The persisted envelope contains a strict bounded replay descriptor rather
than raw rejected proposals. Array order is authoritative because duplicate
and coverage state is stateful. `artifactId` is recomputed before a filename
is derived, and replay compares canonical bytes for every evaluation, not only
the result class. A valid hash over a forged stable fingerprint, coverage
delta, result class, candidate binding, baseline, or order therefore cannot
become trusted evidence.

The code-defined authoritative path manifest covers the self-development
core, local provenance boundary, owner-scope/private-artifact policy, runtime
wrappers, package manifests, and lockfile. Source bytes are hashed with
length-prefixed relative paths and exact bytes. The contract digest separately
covers schema versions, registries, budgets, policies, result-state and
replay versions. Only the provenance boundary may execute fixed no-shell
read-only Git metadata commands; the self-development core remains free of
Git, child-process, network, and source-write authority.

`VERIFIED_EXACT_BASE` and
`VERIFIED_SOURCE_EQUIVALENT_DESCENDANT` are integrity/currentness statuses,
not approval. Every successful assessment retains
`NOT_AUTHORIZED_PHASE_8A`, `PROHIBITED`, and zero side-effect counters. The
Phase 8B planner (below) consumes this trust chain's
`assessFutureReviewEligibility` output directly; a passing assessment alone
never writes source, mutates Git, invokes a model, or contacts a product.

### Phase 8B controlled source adoption sandbox

Phase 8B adds the first (and, deliberately, only) authority that may write
source at runtime — confined entirely to a disposable private mirror:

```text
exact v2 session artifact + current local source provenance
        ↓
assessFutureReviewEligibility(...) [Phase 8A.1.1, reused verbatim]
        ↓
exact eligible candidate + matching EVALUATED_PASS_NOT_ADOPTED evaluation
        ↓
base-independent adopted-case derivation (coverage re-derived, never trusted)
        ↓
canonical on-disk catalog check + content-addressed immutable plan
        ↓
TOCTOU revalidation (source bundle / contract / target preimage digests)
        ↓
disposable owner-private source mirror (fixed authoritative path set only)
        ↓
exactly one atomic write to the fixed target + exactly-one-file diff check
        ↓
bounded serial cache-isolated load of the MODIFIED sandbox evaluator
        ↓
four metamorphic probes (duplicate under new base / duplicate under
assertion variant / new coverage still passes / unsafe still rejected)
        ↓
sanitized immutable private result (SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED)
        ↓
sandbox cleanup
        ↓
canonical checkout proven byte-for-byte unchanged → STOP
```

There is deliberately no `→ CANONICAL SOURCE WRITE` and no
`→ GIT COMMIT / PUSH` step. `src/core/selfDevSandbox/` is a boundary
distinct from `src/core/selfDev/`: the planner and executor import the pure
evaluation domain's trust/replay/validation functions but add no new Git,
network, AI, product, or database/infrastructure capability, and the
sandbox loader is confined by `fs.realpathSync` path comparison to a
disposable 0700 root outside the repository, the parent workspace, and the
private-findings root. The adopted-case catalog target file
(`adoptedCaseCatalog.generated.ts`) is the only file the executor may ever
rewrite, and only inside that disposable mirror. In canonical source the
same file is pure declarative generated data whose cardinality is a normal
supported state (Phase 8B.1-R1: 0..64 entries) enforced by the read-only
`bin/selfdev-catalog-integrity.mjs` check (validate + byte-exact canonical
render round-trip) in CI; the canonical catalog currently holds ONE adopted
entry.

`SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED` means exactly what it says: the
deterministic source transformation produced the expected behavior in a
private disposable mirror. It does not mean canonical-applied, owner-
approved-for-canonical-mutation, or Git-commit/push-authorized. Canonical
Phase 8B.1.0 establishes the bounded self-development model explicitly: the
deterministic proposal portfolio is FINITE (two variants), novelty is derived
from the live adopted catalog, and when every known safe case is represented
the system's future-review eligibility naturally becomes false — a healthy
terminal condition, not a defect. `passCandidateCount = 0` /
`futureReviewEligible = false` is a normal, successful session outcome; the
system never invents fake novelty (no timestamp/base-SHA/seed rotation, no
random actions, no coverage re-claiming). A future phase may deliberately
expand the portfolio or registry under separate authorization.

The Phase 8B.1.0 replay contract: the persisted replay descriptor always
names the CONCRETE selected portfolio fixture (`VALID_MATRIX_EXPAND` /
`VALID_MATRIX_EXPAND_COLLAPSE`), so replay never depends on whichever catalog
exists later; historical `VALID_MATRIX` descriptors remain exactly supported.
Test baselines are explicit: temporary source fixtures render the desired
adopted-catalog state (EMPTY / EXPAND_ONLY / EXPAND_AND_COLLAPSE) through the
real renderer and the full selfDev stack is loaded from the fixture source
root, so evaluation, replay, digests, and eligibility always share one
explicit state.

The future canonical
promotion is Phase 8B.1 — Owner-Gated Canonical Promotion — a separate,
`NOT_STARTED`, `NOT_AUTHORIZED` future task.

### Phase 8B.0.1 sandbox promotion-readiness closeout

Phase 8B.0.1 hardened the four trust boundaries of the chain above without
changing its shape:

- **Sandbox base pre-validation.** The chain now begins with
  `ensurePrivateSandboxBase()`: the code-defined base path
  (`$HOME/.nightwatch/selfdev-sandboxes`) is validated component-wise
  (lstat-first, symlink/non-directory fail closed, owner and private-mode
  fail closed, missing directories created only beneath validated parents
  with 0700 and immediately revalidated) BEFORE any chmod, mkdir beneath,
  mkdtemp, file creation, or cleanup. The base itself is never chmod-
  repaired; the private parent reuses the established private-artifact
  tightening convention; `$HOME`/ancestors are never chmodded or created.
  Sandbox instances are realpath-contained beneath the validated base and
  disjoint from the canonical repository, the parent workspace, and the
  findings root. Cleanup requires strict realpath child containment and
  lstat before recursive removal.
- **Adoption strategy binding.** Plans and results carry exactly one
  strategy class (`SELFDEV_ADOPTION_STRATEGY_CLASS`), enforced at runtime
  before any identity recomputation and cross-bound between plan and
  adopted case; the strategy version remains bound through the contract
  manifest into `contractDigest`.
- **Complete verified-result metamorphic invariants.** A verified result
  requires all five probes `PASS`; `NON_OVERREACH_PROBE_UNAVAILABLE` and
  `NON_OVERREACH_REGRESSION` are distinct executor failure classes, and
  neither can yield a verified result.
- **Truthful failure-path write accounting.** `sandboxSourceWrites` records
  the actual executed effect (0 before the single allowed write, 1 after),
  on success and failure alike, bounded 0..1, with canonical/Git/external
  counters always 0.

The residual race assumption is unchanged: protection covers preexisting
symlinked bases/parents, ordinary path confusion, accidental symlink
configuration, and symlink-target mutation before detection — NOT a
malicious machine owner who can rewrite the filesystem and
source/verifier concurrently.

Git continuity is intentionally separate from runtime authority. A validated
substantive implementation SHA is a stable historical anchor; approved
documentation descendants may advance live history without changing that
anchor. For a new implementation claim, `bin/agent-state.mjs` inspects the
claimed commit's own changed paths with read-only `git diff-tree` semantics and
fails closed on documentation-only or ambiguous merge roles; it also validates
the relationship to `STARTING_SHA`. The checker discovers local HEAD (and the
available `origin/main` ref) from Git at check time. It does not require a
persisted current-head field, does not compare a file to its containing commit,
and never rewrites state.

---

## 4. Outer proxy pipeline

`src/proxy/server.ts` accepts normal forward-proxy HTTP requests, CONNECT
authorities for HTTPS/WSS, and HTTP Upgrade requests for WebSockets. Each
target is parsed by `src/proxy/policyAdapter.ts` and delegated to the same
`OutboundPolicy.decide()` used by the browser consumers.

- `allow`: only then does the proxy forward HTTP or create the upstream TCP
  connection. HTTPS/WSS is tunneled; TLS is not intercepted.
- `block-telemetry`: return a local block response and record a sanitized
  telemetry event; no upstream connection is attempted.
- `deny` or malformed/unknown: return a local block response and record a
  fatal proxy event; DNS resolution and TCP are never attempted.

Proxy events contain timestamp, safe run label, protocol, normalized host and
port, classification, decision, rule ID, and safe reason. They never contain
headers, cookies, bodies, query strings, or tokens. `RunRecorder` copies only
the current run's event slice to `proxy.jsonl` and places aggregate counts in
`summary.json.proxy`.

## 5. Request inspection pipeline

The pipeline is the safety architecture's core. It has exactly one input —
a request about to leave the browser — and one source of authority — the
selected environment's config plus the static classification tables.

```
browser request (navigation / fetch / XHR / asset)
        │
        ▼
context.route('**/*')  ──►  normalize host (lowercase, strip port)
        │
        ▼
OutboundPolicy.decide(rawUrl)          [rule order, see §2 / SAFETY_MODEL §3]
        │
        ├── internal (non-http scheme: data:, blob:, javascript:) ──► ALLOW
        ├── env allowlist match            ──► ALLOW
        ├── static asset list match        ──► ALLOW
        ├── exact browser-background match ─► BLOCK-BROWSER-BACKGROUND (abort; recorded; not fatal)
        ├── telemetry list match           ──► BLOCK-TELEMETRY  (abort; recorded; not fatal)
        ├── known production               ──► DENY  (abort + hard-failure; always fatal)
        ├── *.run.app                      ──► DENY  (abort + hard-failure)
        ├── unknown *.alphaus.cloud        ──► DENY  (abort + hard-failure)
        ├── *.mobingi.com                  ──► DENY  (abort + hard-failure)
        ├── localhost (not allowlisted)    ──► DENY  (abort + hard-failure)
        └── anything else                  ──► DENY  (abort + hard-failure)
```

Verdict handling in `src/browser/network`:

- **allow** — the request proceeds (`route.continue()`). The request is
  recorded (method, redacted URL, redacted headers, resource type); on
  response, status, content type, and a redacted, size-capped body for
  JSON-ish content types are recorded.
- **deny** — the request is aborted (`route.abort()`) before it leaves the
  browser. A `hard-failure` event is raised; `hard-failure` is always in
  `failOn` and cannot be disabled. The run fails.
- **block-browser-background** — the exact reviewed Chromium background host
  is aborted locally; a category-specific sanitized event is recorded and the
  run remains non-fatal. Related hosts do not match this rule.
- **block-telemetry** — the request is aborted; a `telemetry` event is
  recorded. It is deliberately **not** fatal (real UIs emit telemetry; a
  dev/next journey must still be usable — D-5).

Everything that is persisted passes through the shared `RedactionLayer`
before the recorder writes it (D-6). The `blockedByPolicy`/`verdict`/`reason`
fields on request events document the policy's decision; `reason` strings are
constructed to be safe to persist (no secrets).

---

## 6. Determinism and injected clock

Evidence must be reproducible, because diffing evidence across runs is how
regressions are detected:

- The `RunRecorder` receives an **injected clock** (a `now()` function); run
  timestamps are derived from it, never from wall-clock reads inside the
  recorder.
- `NIGHTWATCH_RUN_ID` overrides the run id (tests use it to make runs
  addressable and comparable).
- `RunEvent.seq` is a monotonic sequence assigned by the recorder, so event
  order is well-defined even when JSONL lines carry identical timestamps.
- `summary.json` aggregates counts by event type and severity, hard
  failures, and the screenshots taken — a compact fingerprint of the run.

The snapshotter's `timestamp` and the run's `startedAt`/`endedAt` are the
only wall-clock-dependent fields; the injected clock covers run-internal
events (D-7).

---

## 7. External toolchain

| Component | Choice | Notes |
|---|---|---|
| Runtime | Node ≥ 20 (developed on Node 22) | `engines: ">=20"` in `package.json` |
| Test runner | Playwright Test (`@playwright/test` 1.62.1) | Single runner for unit, smoke, and scenario suites (D-1); TS transpile built-in |
| Language | TypeScript 5.7, strict, `noUncheckedIndexedAccess` | `tsc --noEmit` via `npm run typecheck` |
| Browser | System Google Chrome via `channel: 'chrome'` | No bundled download by default (D-14); fallback: `npx playwright install chromium` + remove the `channel` line |
| Config | JSON per environment under `config/environments/` | Shape-validated at load; `resolveJsonModule` |
| Runner | `bin/nightwatch.mjs` (Node ESM) | Wraps the Playwright CLI with fail-closed env handling |

No runtime dependencies beyond Playwright; all packages are devDependencies
(`@playwright/test`, `typescript`, `@types/node`).

---

## 8. Boundaries

- Nightwatch may **read** repos under `REPOSITORIES/alphauslabs` and
  `REPOSITORIES/mobingilabs` (for snapshots, provenance, and later change
  intelligence) but never edits, commits to, or installs into them.
- All implementation changes live under `REPOSITORIES/nightwatch/`.
- Evidence never leaves the machine by default; artifacts are gitignored
  (`artifacts/*`, `.env`, `test-results/`, `dist/`).
- Credentials are never stored in the repository. Authenticated state is
  referenced by file path (`NIGHTWATCH_STORAGE_STATE`) or not at all
  (D-13); the default is a clearly-marked UNAUTHENTICATED run.
- The snapshotter runs read-only git commands only (`status --porcelain`,
  `rev-parse`, `log`, `for-each-ref`); it never fetches, checks out, or
  writes config (D-8).
- The active evidence store is private and local. Dossiers are written
  atomically with owner-only permissions under the external default root
  `$HOME/.nightwatch/findings/`; repository-local `.nightwatch/` is ignored
  for injected test stores. No external publication connector exists.
- Phase 7B/7B.2.1 AI review artifacts are companion data in the same owner-only
  external store. Only synthetic fixtures, schemas, code, tests, and sanitized
  task/project documentation are committed. No raw prompt, response,
  credential, customer value, finding, transcript, or model secret enters Git.
- The only AI provider classes are synthetic local and explicit loopback local.
  The loopback adapter fixes the endpoint path, requires `http:` loopback
  hosts, bounds bytes/time, sends no credentials, follows no redirects, and
  has no proxy/cloud fallback.
- The public AI execution surface is `AiReviewSession`; exported validators,
  storage, rendering, and review helpers cannot invoke a provider. The shared
  final provider-admission boundary is the only provider call path. Generated v2 artifacts
  remain unreviewed; owner decisions are companion records and never rewrite
  model identity or artifact bytes.
- The Phase 7B.2.1 owner CLI is a provider-free human interface. It accepts only
  exact artifact IDs, never enumerates private findings, requires a TTY and
  two-step decision confirmation, routes its sole write through the internal
  review factory/private store and no-replace primitive, and cannot publish,
  execute, or write Git. The public AI-review index exposes no decision writer.

---

## 9. Deliberately NOT in Phase 1

The mission's DO-NOT-IMPLEMENT list for Phase 1 — kept explicit so later
phases claim each item deliberately (see `docs/ROADMAP.md`):

- **`production` as a supported environment.** Never. `production.json`
  exists only to document the rejected surface (D-4).
- **Any mutation.** create/edit/save/delete, finalize/calculate/recalculate,
  token generate/revoke, commitment purchase/apply, registration, settings
  mutation, and anything not provably passive — skipped, never executed
  (SAFETY_MODEL §5).
- **Authenticated traffic with traces on.** Tracing is disabled whenever
  storage state is in use.
- **API/oops integration** — Go subprocesses, `bluectl` raw-input replay,
  the L0–L5 confirmation ladder. Phase 5.
- **Read-only data oracles** — store-vs-store equality checks, narrow
  PK/SK queries. Phase 6.
- **Generative/model exploration** — contract-driven request generation.
  Phase 4.
- **Change intelligence** — freshness-driven re-verification and
  change-directed scenario generation. Phase 3.
- **AI assistance and autonomous self-development.** Phases 7–8.
- **Anything resembling production writes**, prod experiments, or large
  datastore scans (the do-not-scan tables from
  `DOCUMENTATIONS/docs/DB_SCHEMA_REFERENCE.md` are out of reach until the
  narrow-query oracles of Phase 6).
