# Nightwatch Architecture

Status: Phase 20 terminal local/source/synthetic implementation checkpoint
`c58684046d66b2a68234a06c62dea889829d4110` (focused, compatibility,
canonical, and topology-correct isolated full regressions green with exact
parity; external CI is blocked/unobservable after one post-push inspection),
with Phase 19 integrated campaign intelligence and Phase 18 terminal historical context,
building on the Phase 16CH
terminal (canonical and isolated full regression 2232/4/0; CI externally
blocked), plus Phase 1.2
containment, private local evidence triage, Phase 7 deterministic
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
| `src/core/campaign/runtimeProfile.ts` | Single source-backed linkage for approved runtime journeys, envelopes, operations and deterministic seeds; consumed by portfolio selection and the real adapter. | implemented; read-only |
| `src/core/portfolio/` | Deterministic portfolio model, scoring/allocation, replan, manifest, runtime-profile universe, inert handoff admission, monotone budget mapping, exact-one work-item binding and prepare/resume identity. | implemented; local/source/synthetic only |
| `src/core/campaign/runtimeValidation.ts` | Strict handoff, plan, authorization and manifest document boundary with bounded categorical errors; unsafe external field names are sanitized. | implemented; fail-closed |
| `src/core/aiReview/` | Strict sanitized AI input/output DTOs, L2/L3 eligibility, synthetic provider, optional loopback-only provider, non-executable oracle suggestions, owner review records, staleness, rendering, and private companion storage. No authority over deterministic evidence or execution. | implemented |
| `src/core/aiReview/localCanary.ts` | Fixed synthetic L2 fixture, strict canary arguments, one fresh session, one `BUG_CANDIDATE` call maximum, in-memory v2 validation, and sanitized non-persistent result metadata. | implemented |
| `src/core/selfDev/` | Explicit Phase 8A/8A.1/8A.1.1 companion subsystem: strict versioned DTOs, recomputed session identity, semantic state machine, fixed registries, bounded proposer/evaluator, ordered replay, future-review eligibility gate, and the data-only Phase 8B adopted-case catalog (`adoptedCases.ts` + `adoptedCaseCatalog.generated.ts`, produced only by the deterministic renderer; currently ONE adopted entry, 0..64 cardinality a supported state) whose live contents seed evaluator baseline state and are bound into `contractDigest`. Phase 8B.1.0 adds the bounded deterministic proposal portfolio (`portfolio.ts`: EXPAND_SUMMARY / EXPAND_THEN_COLLAPSE, frozen order, registry-derived coverage/fingerprints) and the pure catalog-aware novelty selector; the controller resolves the default alias to a concrete replay fixture; portfolio exhaustion is a valid terminal state. | implemented; canonical promotion via the separate owner-gated Phase 8B.1 executor |
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
promotion was Phase 8B.1 — Owner-Gated Canonical Promotion — a separate,
owner-gated task that has since completed via the authorized retry
(Phase 8B.1-R1, commit `24fc437`; Phase 8B.1 = COMPLETE VIA SUCCESSFUL
RETRY R1). Its canonical-promotion executor (`src/core/selfDevPromotion/`)
may rewrite the exact canonical target only after the complete promotion
evidence/approval chain (fresh session, sandbox proof, intent, one-shot
approval, APPLY, fresh-process verify), and the development session —
never runtime code — commits the promoted result. The Phase 8B sandbox
executor remains strictly mirror-only. Together these are the ONLY two
source-mutation authorities for the generated catalog; there is no generic
runtime self-modification authority, and candidate availability never
implies promotion authority (variant B is AVAILABLE_NOT_ADOPTED with
NEXT_PROMOTION_AUTHORITY NONE). The generated file's header comment
(produced by `renderAdoptedCatalogSource`) states this partition
explicitly; ordinary development must not hand-edit the generated file.

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

## Phase 8 next-architecture design review (record)

> Task `phase-8-next-architecture-design-review` (Phase 8-DESIGN),
> authorization `PHASE_8_NEXT_ARCHITECTURE_DESIGN_REVIEW_ONLY`, 2026-08-15,
> starting SHA `4e4bf0843c9e33682e026b3931599d1b2b713374`. This section is
> the dedicated design record; the decision entry is `docs/DECISIONS.md`
> D-52; the roadmap record is `docs/ROADMAP.md` (Phase 8 design-review
> section). Docs-only review — no implementation, no promotion, no catalog
> mutation. The machine-checked project-state block is unchanged (catalog
> count 1, variant B AVAILABLE_NOT_ADOPTED, promotion authority NONE).

### Recommendation

```
PHASE_8_NEXT_ARCHITECTURE: CLOSE_PHASE_8
SECONDARY_LATER_OPTION: REPEATABLE_OWNER_GATED_ADOPTION (VIABLE_LATER)
REJECTED: AUTONOMOUS_PROMOTION (BY_DESIGN), RUNTIME_ROLLBACK_MACHINERY
DEFERRED: OWNER_REVIEW_QUEUE, PORTFOLIO_EXPANSION
```

### Current state (verified)

- Catalog count 1 (variant A / EXPAND_SUMMARY; digest `sha256:bd35b934...`;
  adoptedCaseId `adopted-case:sha256:90248aae...`; strategy
  `DECLARATIVE_REGRESSION_CATALOG_PROMOTION`); variant B
  (EXPAND_THEN_COLLAPSE) AVAILABLE_NOT_ADOPTED; `NEXT_PROMOTION_AUTHORITY:
  NONE` machine-enforced (`bin/project-state-check.mjs:172`).
- Phase 8 IN_PROGRESS; 8B.1 COMPLETE_VIA_SUCCESSFUL_RETRY_R1 (original
  attempt BLOCKED/CLOSED, approval `17c97035...` spent; R1 approval
  `e065f088...` consumed exactly once).
- Portfolio frozen 2-variant `nightwatch.selfdev-synthetic-portfolio.v1`;
  selector returns B today, `null`/EXHAUSTED at A+B. EXHAUSTED is a designed
  healthy terminal state (0 PASS, eligible false, session succeeds).
- Catalog bound `SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES = 64` (defensive, not
  architectural; duplicates impossible by construction; saturation happens
  far below 64 with a fixed registry).
- No rollback/unadopt machinery (by design; CLI forbids `--rollback`).
- Test baselines EMPTY / EXPAND_ONLY / EXPAND_AND_COLLAPSE prove catalog
  states 0/1/2 via the real renderer/stack; CI catalog-integrity step is
  cardinality-agnostic; no hard-coded count=0/1 assumption remains in
  tests or CI (the CURRENT_STATE machine block is the only count-sensitive
  input, regenerated by the dev session at adoption).
- Last validated implementation `044c4a6e0095d14004cd50b44ceb47998e44e3ec`
  (preserved; design docs commits are documentation descendants).

### Phase 8 objective (reconstructed from durable source)

The strongest evidence-supported objective is: **one owner-authorized
canonical self-development promotion with a complete source-bound evidence
chain, plus continuation** (R1 SPEC: "proving the complete durable lifecycle
from an EMPTY canonical catalog through one verified one-entry canonical
adoption committed on private main with exact green CI, then closing … with
the portfolio still offering candidate B — NOT exhausted"). A (evaluate) and
B (sandbox adopt) were milestones; D (repeatable multi-adoption lifecycle)
was never a stated objective — the portfolio's second member and EXHAUSTED
exist to make the FIRST adoption committable and to prove continuation; E
(autonomous self-development) contradicts the owner-gated authority model.

### Capability evidence table (what Phase 8 proved)

| Capability | Phase | Evidence | Status |
|---|---|---|---|
| A bounded declarative proposal generation | 8A | data-only candidate schema, fixed registries, semantic identity, caps | COMPLETE |
| B deterministic evaluation | 8A | evaluator owns all gates; contract manifest → contractDigest | COMPLETE |
| C provenance / source binding | 8A.1 | sourceBundleDigest (34 paths) + contractDigest + trust statuses | COMPLETE |
| D replay | 8A.1 | ordered stateful replay, canonical byte comparison | COMPLETE |
| E future-review eligibility | 8A.1.1 | source-currentness-aware gate; zero-pass artifact correctly ineligible | COMPLETE |
| F sandbox source adoption | 8B | disposable mirror, one atomic write, five probes | COMPLETE |
| G sandbox confinement | 8B.0.1 | 4 TRUE_POSITIVES fixed (base, strategy, probes, accounting) | COMPLETE |
| H deterministic adopted-case catalog | 8B | schema module + generated pure data, renderer-only, coverage re-derived | COMPLETE (1 entry) |
| I owner-scoped canonical promotion | 8B.1 | OWNER_GATED_ONE_FILE_ONLY, max 1 write, runtime never commits | COMPLETE (R1) |
| J one-shot approval | 8B.1 | content-addressed, claim-before-write, immutable no-replace | COMPLETE |
| K exact canonical APPLY | 8B.1 | 5 pre-write gates, single atomic write, exact changeset | COMPLETE |
| L fresh-process verification | 8B.1 | fresh module load, four probes, CANONICAL_APPLIED_VERIFIED_UNCOMMITTED | COMPLETE |
| M canonical commit / currentness | 8B.1 | 7-status vocabulary; COMMITTED_EXACT; strict SOURCE_MISMATCH | COMPLETE |
| N catalog-aware proposer after adoption | 8B.1.0 | fingerprint+coverage selector; EXHAUSTED healthy terminal | COMPLETE |
| O one-entry continuation proof | 8B.1-R1 | rehearsal at count 1 (751/4/0); post-commit sessions select B | COMPLETE |
| P continuity protocol v2 | 8B.1.0.2 | strict state machines; 9/9 impossible states → 0/9 | COMPLETE |
| Q project-state protocol v1 | 8B.1-R1.1 | machine-checked truth block; NONE enforced exactly | COMPLETE |
| R current safety authority model | 8B.1-R1.1.1 | six-point partition (D-51); truthful wording | COMPLETE |

### Options and verdicts

- **A — CLOSE PHASE 8 (RECOMMENDED).** Objective proven live; continuation
  proven; truth protocols hardened; B unadopted is acceptable (structural
  canary). Arguments against closure (live repeatability, live EXHAUSTED,
  ceremony) re-demonstrate fixture-proven states; the unique evidence a
  second adoption adds is operational, not architectural.
- **B — REPEATABLE OWNER-GATED ADOPTION LIFECYCLE (VIABLE_LATER).** The
  promotion chain is fully generic (content-addressed per chain, unique
  one-shot approvals, cardinality-agnostic CI, count-2 flow tests). The
  only R1-specific bits are the project-state status pins
  (`bin/project-state-check.mjs:173-174`), the CURRENT_STATE block
  regeneration, and the ceremony. Executing it now for B adds zero
  bug-hunting value; reserve for a real candidate under fresh
  authorization.
- **C — OWNER REVIEW QUEUE (DEFER).** Meaningless for a 2-member portfolio;
  duplicates existing immutable artifacts and eligibility inspect.
- **D — MULTI-CANDIDATE / PORTFOLIO EXPANSION (DEFER).** The A/B portfolio
  is a test scaffold; synthetic expansion proves machinery, not bug
  hunting. Belongs after closure with real semantics (ARCHITECTURE.md
  healthy-terminal doctrine: "A future phase may deliberately expand the
  portfolio or registry under separate authorization").
- **E — PROMOTION RECOVERY / ROLLBACK AS FIRST-CLASS (REJECT).** Current
  model (development-session Git restore, proven in the original 8B.1
  BLOCKED attempt; runtime explicitly cannot undo; preimage preserved in
  records) covers every scenario: post-APPLY/pre-commit failure, post-commit
  CI failure, later semantic defect, owner-removal (renderer regeneration),
  catalog corruption (validation fails closed). A runtime revert would
  mirror the canonical write authority the model deliberately excludes.
- **F — AUTONOMOUS CANONICAL PROMOTION (REJECTED_BY_DESIGN).** Replaces
  per-adoption owner approval with standing runtime authority, violating
  the explicit-owner-authority principle, one-shot-approval and no-auto-loop
  principles, and the availability/eligibility/authority axis separation;
  creates generic self-modification authority D-51 rules out. Reconsider
  only via a separate owner decision changing the authority model, with
  concrete bug-hunting need and per-promotion provenance of the standing
  delegation.
- Additional options: no genuinely distinct option found beyond A-F
  (readiness one-command is a convenience wrapper over the existing chain,
  not a new architecture).

### Evaluation matrix (1-5; 5 best; complexity/burden 5=low; recursion risk 5=low)

| Option | bug-find | self-dev | safety | owner | revers. | proven. | determin. | complex. | burden | simple | increm. | extens. | recurs. | fit | Σ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A close | 3 | 2 | 5 | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 3 | 4 | 5 | 5 | 61 |
| B repeat | 1 | 3 | 4 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 2 | 4 | 4 | 4 | 52 |
| C queue | 1 | 1 | 4 | 4 | 4 | 4 | 4 | 3 | 3 | 3 | 1 | 2 | 4 | 4 | 42 |
| D expand | 2 | 2 | 4 | 4 | 4 | 4 | 4 | 3 | 3 | 3 | 2 | 3 | 4 | 4 | 46 |
| E rollback | 1 | 1 | 3 | 3 | 2 | 3 | 3 | 2 | 3 | 2 | 1 | 2 | 3 | 3 | 32 |
| F autonomous | 2 | 3 | 1 | 1 | 1 | 2 | 3 | 2 | 2 | 2 | 3 | 2 | 1 | 1 | 26 |

Decision is not arithmetic alone; A dominates on safety, simplicity, and
burden while retaining extensibility.

### Authority ladder (weakest → strongest)

L0 read-only evaluation (`SELF_DEVELOPMENT_SYNTHETIC_EVALUATION`) → L1
private immutable evidence (owner-only store, exact-ID no-replace) → L2
sandbox mirror mutation (`SELF_DEVELOPMENT_SANDBOX_ADOPTION`, token
`SANDBOX_ONLY`) → L3 owner-reviewed promotion intent (prepare) → L4 one-shot
owner approval (`CANONICAL_ONE_FILE_ONLY`, consumed once) → L5 bounded
canonical source write (apply, `SELF_DEVELOPMENT_CANONICAL_ADOPTION`, one
write to the fixed target) → L6 development Git commit/push (runtime never
commits). Per-option highest authority: A L0+docs; B L5 per adoption (owner
initiated); C/D L0/L6; E escalates runtime write authority (rejected); F
standing L4+ (rejected).

### Axis separation (invariant)

CANDIDATE EXISTS (B: yes) ≠ CANDIDATE ELIGIBLE (B: yes at validated source
checkpoint) ≠ OWNER AUTHORITY (B: NONE, machine-enforced). Any design
collapsing these axes is invalid (F collapses eligibility ≡ authority).

### Repeatability and exhaustion (hypothetical, not executed)

[A] → B sandbox proof → B canonical adoption → [A,B] → proposer EXHAUSTED.
EXHAUSTED is a success state (0 PASS, eligible false, normal session, CLI
exit 0; fixture-proven incl. 160 passed at A+B); project-state expresses it
as a legal projected member; the pins/block transition is a small source
change; a real acceptance would add only live ceremony evidence. Doctrine:
EXHAUSTED must never be misinterpreted as failure.

### Source-change invalidation model (R1.1/R1.1.1 lesson)

Historical evidence stays historical truth forever; artifacts for future
promotion must be regenerated from fresh current source; adopted-case
semantics are base-independent (catalog truth survives source changes);
source-equivalent descendant acceptance applies ONLY to
documentation-only descendants with unchanged authoritative bytes; exact
source equality is mandatory for prepare/approve/APPLY/COMMITTED_EXACT.
Currentness is never weakened.

### Threat model (top three: A, B, D — condensed)

Stale source → digest gates fail closed (restart chain); stale approval →
`ALREADY_CONSUMED` + immutable store; wrong candidate → owner reviews
content-bound intent; catalog duplicate → selector novelty + DUPLICATE_ID
(≈none); source overreach → post-write changeset check; second write →
consume-before-write; Git mutation → no git helper exported; full-suite
regression → state-explicit baselines; provenance drift → SOURCE_MISMATCH;
owner confusion → exact-ID CLI + tokens; repeated-adoption loop →
one-APPLY-per-approval; EXHAUSTED misinterpreted → CLI status + doctrine.
Residual risk concentrates in the human owner step (L4-L6), which
automation must not reach.

### State machine (recommended option)

```
CLOSURE_DESIGNED (this review)
  ↓ (separate owner authorization + source change to project-state pins)
PHASE_8_CLOSURE_APPROVED
  ↓
PINS_UPDATED → project-state block regenerated (COMPLETE statuses)
  ↓
VALIDATED (full suite + project:check + CI green)
  ↓
CLOSED — Phase 8 COMPLETE; roadmap selects next bug-hunting phase
```

STALE (source advanced → restart from fresh source), BLOCKED (owner
declines → stays IN_PROGRESS), DEFERRED (postponed → current state). No new
runtime states; catalog states unchanged.

### Authority transition table (closure task)

CLOSURE_DESIGNED (design review; L0 + owner auth; docs only) →
CLOSURE_APPROVED (update pins + hardening + tests + block + docs; owner-
authorized implementation task) → PINS_UPDATED (full validation; commit +
push) → VALIDATED (green CI at exact HEAD) → CLOSED (mark COMPLETE in
continuity records + roadmap; STOP). Replay/retry: fresh from clean source
on any failure.

### One-shot semantics (preserved for any future adoption)

Approval one-shot (consumed once, never refreshed/reused); APPLY one-shot
per approval; one promotion per evidence chain; a fresh lifecycle gets a
FRESH approval, a spent approval is NEVER reused; target preimage bound per
promotion (source change invalidates the chain).

### Identity, concurrency, write accounting

Identity is collision-free per chain (content-addressed, cross-bound;
adopted-case IDs base-independent; no gap vs R1 artifacts; the CURRENT_STATE
block is a dev-session snapshot, not an artifact). Concurrency: exact
preimage/current-source gates + immutable claim store + serial sandbox
loader already fail closed; no additional serialization needed. Write
accounting: operation-local counter (0..1 per receipt) vs historical catalog
count (0..64) are distinct and both truthful.

### Project-state / continuity / CI / test capacity

Project-state v1 expresses EXHAUSTED and any count via live derivation; the
smallest evolution is legal status tokens for the pins (protocol version
stays v1). Continuity v2 handles a repeated-adoption or closure task
naturally (R1 pattern); no missing semantics. CI: catalog-integrity
cardinality-agnostic; project-memory check derives from live source;
agent:audit cardinality-independent; a one→two adoption would already pass
CI given block regeneration + pin update. Tests: 0/1/2 states proven;
recorded gap — no promotion flow test starts from a two-entry baseline
(count-3 postimage untested; only relevant to a future second adoption).

### PHASE_8_COMPLETE criteria (all hold today)

1. Owner-gated canonical promotion proven live (24fc437;
   CANONICAL_PROMOTION_COMMITTED_EXACT; exact CI at count 1).
2. Continuation after adoption proven (fresh sessions replay PASS, select B,
   eligible true).
3. Current-source truth hardened (project-state v1 + continuity v2
   machine-enforced, CI green).
4. No unresolved safety blockers (safety vectors zero; authority NONE).

Closure execution (flipping PHASE_8_STATUS to COMPLETE) is a separate
authorized task — the pins make it a source change.

### Non-goals, implementation boundary, migration

Non-goals: B adoption, sandbox run, promotion chain, catalog mutation,
project-state block/pin change, owner-policy change, AI/model, product/
DB/infra/DEV/NEXT/production, Alphaus writes, publication. Boundary: this
review changes `.agent/**` and `docs/**` only; the closure task changes
`bin/project-state-check.mjs` pins, `bin/hardening-check.mjs` guard text,
focused tests, and docs — separately authorized. Migration: none
(runtime/schema/artifact untouched); project-state gains legal values in
the future closure task; historical records preserved verbatim.

### Proposed next task (implementation-ready; NOT authorized)

**Phase 8 Final Closure & Phase 9 Roadmap Selection** — phase "Phase 8
closure" (not 8C, not Phase 9); authorization class
`PHASE_8_CLOSURE_AND_ROADMAP_SELECTION_ONLY`; objective: mark Phase 8
COMPLETE (machine block + pins + docs), freeze the canonical-promotion
research boundary, select the next bug-hunting investment. Allowed files:
`bin/project-state-check.mjs` (status pins + tests), `bin/hardening-check.mjs`
(guard text), `tests/unit/projectState.test.ts` (legal tokens), `docs/**`,
`.agent/**`. Also add `docs/design/**` (or the specific file) to
`bin/agent-state.mjs` `APPROVED_CHECKPOINT_PATHS` for future design
documents. Forbidden: approval, APPLY, adoption, catalog mutation, B
promotion, owner-policy change, AI/model, product/DB/infra, publication.
State machine: DESIGNED → APPROVED → PINS_UPDATED → VALIDATED → CLOSED
(STALE/BLOCKED/DEFERRED explicit). Acceptance: PHASE_8_STATUS COMPLETE
machine-enforced; all checks + full suite + exact CI green; roadmap records
the next investment as DESIGNED/NOT_STARTED/NOT_AUTHORIZED; closed under
continuity v2 with terminal fields. Stop conditions: any need to mutate the
catalog/portfolio/contract/promotion machinery → STOP and re-design; source
drift → restart fresh; CI failure → repair before closing.

### Final principle

The system proved the full chain through one real canonical adoption and
durable truth protocols. Candidate B proves continuation; it does not
establish that adopting B is valuable. The next Nightwatch capability worth
new authority/complexity/proof is in bug hunting, not in further Phase 8
promotion machinery.

### Closure execution (Phase 8 final closure & Phase 9 roadmap selection)

The authorized closure task
(`phase-8-final-closure-phase-9-roadmap-selection`,
`PHASE_8_CLOSURE_AND_ROADMAP_SELECTION_ONLY`, 2026-08-15) executed the
recommendation above (D-53):

- **Phase 8 research boundary: COMPLETE.** `PHASE_8_STATUS` is pinned to
  COMPLETE in `bin/project-state-check.mjs` and the machine-checked truth
  block; the regression matrix proves COMPLETE passes, IN_PROGRESS and
  arbitrary values fail, and `PHASE_8_STATUS COMPLETE` coexists with
  `NEXT_PROMOTION_AUTHORITY NONE` (the closure-safety invariant).
- **Implemented canonical promotion machinery: retained.** The owner-gated
  chain (L3-L6, one-shot approvals, cardinality-agnostic CI) is untouched
  and remains available for a future concrete candidate under fresh owner
  authorization. Phase 8 is COMPLETE, not FROZEN; no global execution block
  was added.
- **Standing promotion authority: none.** `NEXT_PROMOTION_AUTHORITY: NONE`
  machine-enforced; candidate availability (variant B) never grants
  authority.
- **Checkpoint model:** `docs/design/*.md` single-level Markdown is now an
  approved documentation-checkpoint path (narrow pattern with negative
  tests); `docs/design/PHASE_9_ROADMAP.md` is the repository-native Phase 9
  design document.
- **Phase 9: selected architecture only, implementation absent.** The
  evidence-backed primary bottleneck is insufficient semantic oracle
  depth; the selected direction is `DETERMINISTIC_ORACLE_DEPTH` (Phase 9 —
  Deterministic Semantic Oracle Depth), fully specified (architecture,
  state machine, test strategy, success criteria, future-task spec) in
  `docs/design/PHASE_9_ROADMAP.md`. `PHASE_9_STATUS:
  DESIGNED_NOT_STARTED_NOT_AUTHORIZED`;
  `PHASE_9_IMPLEMENTATION_AUTHORITY: NOT_GRANTED`. The architecture of the
  retained machinery does not imply B adoption and grants no Phase 9
  authority.

## Phase 9 implementation (record)

> Task `phase-9-deterministic-semantic-oracle-depth` (Phase 9-ORACLE-DEPTH),
> authorization `PHASE_9_ORACLE_DEPTH_IMPLEMENTATION_ONLY`, 2026-08-16,
> starting SHA `09a940340aaa537706d07140995de9bd26d0fdfd`, substantive
> implementation `e74185bf7b83783c2b7421e675ea2d3bb9053482` (exact
> implementation CI 31929017844, 29/29 steps green incl. the Phase 9
> matrix step). Decision D-54; design record `docs/design/PHASE_9_ROADMAP.md`
> §17.

### Semantic oracle depth architecture (implemented)

```
EPHEMERAL RAW OBSERVATION (bounded, in-memory only)
  -> SANITIZED SEMANTIC PROJECTION        src/oracles/projections/**
       (nightwatch.semantic-projection.v1: paths, types, presence, shape,
        bounded counts, opaque identity tokens, numeric relation refs)
  -> SOURCE EXPECTATION + CROSS-STEP      src/oracles/expectations/**
     INVARIANT ORACLES                     src/oracles/invariants/**
       (nightwatch.semantic-expectation.v1, fixed invariant vocabulary)
  -> SEMANTIC FINDING                     src/oracles/semantic/**
       (nightwatch.semantic-oracle-finding.v1, categorical fingerprints)
  -> EXISTING ANOMALY/ADMISSION/TRIAGE    src/core/campaign/**,
     -> DOSSIER (additive sanitized        src/core/triage/**
        semanticEvidence,
        nightwatch.semantic-dossier-evidence.v1)
```

Raw customer scalars never cross the projection boundary. `ProjectionContext`
maps raw identities/numbers to opaque encounter tokens/refs in memory only
(never serialized). Numeric relations emit facts only. Expectations are
declarative contracts validated strictly, provenance-bound (repo @ SHA) with
fail-closed staleness, derived by ONE static source adapter shared by the
synthetic fixture and real read-only checkouts (never executes application
code). The network observer gains a narrowly typed semantic hook (transient
raw text -> safe findings only); the Phase 5 protocol oracle and its DTO are
unchanged, composed with a semantic channel (protocol failure
short-circuits). Campaign budget/admission/promotion authority and triage
authority are unchanged; the dossier schema is extended additively
(protocol-only dossiers unchanged). The semantic core is statically guarded
(hardening) against AI/selfDev/Phase6/infra/transport/persistence/campaign
imports and process/network/persistence capability.

`PHASE_9_ORACLE_DEPTH_STATUS: COMPLETE` (local/synthetic).
`PHASE_9_DEV_ACCEPTANCE: RECOMMENDED_SEPARATE_AUTHORIZATION` (Phase 9B, not
executed). Phase 6 remains `FROZEN_BY_OWNER`; AI remains non-authoritative;
catalog byte-identical `sha256:bd35b934...`; B AVAILABLE_NOT_ADOPTED;
`NEXT_PROMOTION_AUTHORITY: NONE`; `PHASE_8_STATUS: COMPLETE`.

## Phase 9A.1 real-source expectation admission & evaluation observability (record)

> Task `phase-9a-1-real-source-expectation-admission` (Phase
> 9A.1-REAL-SOURCE-EXPECTATION), authorization
> `PHASE_9_REAL_SOURCE_EXPECTATION_ADMISSION_ONLY`, 2026-08-16, starting SHA
> `91a64e597bc0b28653fe53bf46e291126963baa5`, substantive implementation
> `cfc2aaa65227b2caf26d2d51533bf32ecc489028` (exact implementation CI
> 31932079316, 29/29 steps green incl. the Phase 9A.1 matrix step). Decision
> D-55; design record `docs/design/PHASE_9_ROADMAP.md` §18; Phase 9B
> future-task spec `docs/design/PHASE_9B_TASK_SPEC.md` (design only).

### Real-source admission chain (implemented)

```
REAL READ-ONLY SOURCE (repo @ 40-hex SHA, read-only sibling checkout)
  -> DATA-ONLY RECIPE            src/oracles/expectations/recipes/**
       (nightwatch.real-source-expectation-recipe.v1: targetId, repoId,
        sourcePaths, fixed extractor sequence, expectedContract, blueprint)
  -> BOUNDED SYNTAX-AWARE        src/oracles/expectations/extract/**
     EXTRACTION                  (PHP lexer: PUSH/ASSIGN row-literal keys,
                                  builder-list returns, Routing.yaml route
                                  bindings; never executes application code)
  -> SOURCE-EVIDENCE DIGEST      ev:sha256:<24> over the canonical
                                  normalized extraction (never the whole
                                  repository)
  -> ADMISSION                    src/oracles/expectations/admission.ts
       (contract drift / missing source / missing repo -> fail-closed)
  -> ADMITTED EXPECTATION        (SemanticExpectation + provenance incl.
                                  evidenceDigest)
  -> ATOMIC RESOLUTION           src/oracles/expectations/resolver.ts
       (expectation + its EXACT current source snapshot; sha + re-extracted
        evidence must match; stale/unavailable never PASS)
  -> SAFE EVALUATION RECEIPT     src/oracles/semantic/receipts.ts
       (nightwatch.semantic-evaluation-receipt.v1, nine outcomes)
```

The only sibling-source access lives in `src/core/source/siblingSource.ts`
(read-only, path-confined, no child processes, no network), injected through
interfaces — the expectation/receipt cores are statically guarded
(hardening) against fs/process/network/AI/selfDev/Phase6/persistence
capability. Synthetic expectations can never be relabeled as real: the
resolver rejects expectations without a registered recipe, without an
evidence digest, or whose digest does not match the real source
re-extraction (`REAL_SOURCE_EXPECTATION_PROOF_MISSING` semantics).

`PHASE_9A_1_STATUS: COMPLETE`. `PHASE_9B_DEV_READINESS:
READY_FOR_SEPARATE_AUTHORIZATION`. `PHASE_9B_STATUS:
DESIGNED_NOT_STARTED_NOT_AUTHORIZED`. Phase 6 remains `FROZEN_BY_OWNER`; AI
remains non-authoritative; catalog byte-identical `sha256:bd35b934...`; B
AVAILABLE_NOT_ADOPTED; `NEXT_PROMOTION_AUTHORITY: NONE`;
`PHASE_8_STATUS: COMPLETE`.

## Phase 10A deeper real-source semantic contracts (record)

> Task `phase-10-deeper-real-source-semantic-contracts` (Phase
> 10A-DEEPER-REAL-SOURCE-SEMANTICS), authorization
> `PHASE_10_DEEPER_SEMANTIC_IMPLEMENTATION_ONLY`, 2026-08-16, starting SHA
> `c3393ce54ef53d10451da2465d0327a0796bcf4f`, substantive implementation
> `6cef0c45b0733c3a7179789b360eeaba40ab931b` (exact implementation CI
> 31946005458, 32/32 steps green incl. the Phase 10 matrix step). Decision
> D-59; implementation/acceptance record
> `docs/design/PHASE_10_DEEPER_SEMANTIC_CONTRACTS.md`.

### Deeper real-source contract chain (implemented, additive to 9A.1)

```
CURRENT READ-ONLY SOURCE (repo @ 40-hex SHA; 169df39d verified read-only)
  -> RECIPE v2                  src/oracles/expectations/recipes/**
       (nightwatch.real-source-expectation-recipe.v2 = v1 semantics +
        itemFieldTypeContracts: field, itemIndex, allowedTypes)
  -> TYPE-FLOW EXTRACTION       src/oracles/expectations/extract/php.ts
       (PHP_ITEM_FIELD_TYPE_FLOW: fixed patterns EMPTY_CAST_OBJECT ->
        ['OBJECT'], EMPTY_ARRAY_OR_STRING_KEYS -> ['ARRAY','OBJECT'];
        any other assignment pattern -> TYPE_FLOW_AMBIGUOUS; no execution)
  -> SOURCE-EVIDENCE DIGEST     ev:sha256:<24> over ALL canonical
                                 extractions incl. the type-flow record
                                 (canonicalExtraction fails closed on
                                 unknown kinds; admission + resolver fail
                                 closed on unknown extractor kinds)
  -> ADMISSION                  src/oracles/expectations/admission.ts
       (v2 branch: per-contract extraction == declared allowedTypes or
        TYPE_FLOW_CONTRACT_MISMATCH; derivation v2)
  -> DEEPER INVARIANT           single allowed type -> TYPE_MATCH
                                 (existing vocabulary); multi type ->
                                 TYPE_IN_SET (new fixed invariant:
                                 missing path / empty-uninspected parent ->
                                 NOT_APPLICABLE; observed in set -> PASS;
                                 outside -> VIOLATED)
  -> SAFE FINDING/RECEIPT       unchanged (categorical metadata only;
                                 TYPE_IN_SET violations map to
                                 TYPE_CONTRADICTED / TYPE_IN_SET classes)
```

Current-source evidence (re-verified 2026-08-16, read-only remote
metadata): mobingilabs/ripple-api master `169df39d…`; `ExchangeRate.php`
byte-identical to the Phase 5 pin. Common-exchange `exchange_rate` is
ALWAYS a JSON OBJECT (empty case `(object)`-cast to `{}` — the D-58 "ARRAY
when empty" claim is refuted by the actual cast direction); payer-exchange
is OBJECT-or-ARRAY (`[]` when no rates). Finite output-key sets are
NOT mechanically provable (`SOURCE_ENUM_FLOW_UNPROVEN` —
`CURRENCY_RANGE_VALIDATE` is write-path validation only), so no
finite-key invariant, no class-constant extractor, and no
`OBJECT_KEYS_SUBSET_OF` were added — only mechanically proven source flow
becomes oracle truth. Deep expectation IDs `...real-source-deep`;
historical `...real-source-shape` IDs stay historical-only (archived v1
recipes under `corpus/phase10/historical/`; Phase 9B-R1 evidence remains
truthful at its old checkpoint). Semantic expectation DTO stays
`nightwatch.semantic-expectation.v1` (envelope unchanged; vocabulary
additive). Corpus `corpus/phase10/**`: 4 seeded deep defects (baseline
shape-only 0/4 vs enriched 4/4), 10 benign (0 FP), sentinel/unknown-key
sweeps (0 leaks), determinism 3/0, currentness A–E fail-closed, synthetic
campaign/dossier integration with baseline zero semantic evidence;
owner-local canary at 169df39d: 4/4 derived, depths [2,2,3,3] (L3+ = 2/4).

`PHASE_10_DEEPER_SEMANTIC: COMPLETE`; `PHASE_10A_STATUS: COMPLETE`; DEV
validation NOT_RUN; `PHASE_10B_DEV_ACCEPTANCE:
RECOMMENDED_SEPARATE_AUTHORIZATION` (separate owner authorization
required; `tests/manual/phase9b-contained-dev-semantic.ts` must be
repointed to the deep expectation ID in that future task). Phase 9 remains
terminal COMPLETE; Phase 6 remains `FROZEN_BY_OWNER`; AI remains
non-authoritative; catalog byte-identical `sha256:bd35b934...`; B
AVAILABLE_NOT_ADOPTED; `NEXT_PROMOTION_AUTHORITY: NONE`;
`PHASE_8_STATUS: COMPLETE`.

## Phase 9B contained DEV semantic acceptance (record)

> Task `phase-9b-contained-dev-semantic-acceptance` (Phase
> 9B-CONTAINED-DEV-SEMANTIC-ACCEPTANCE), authorization
> `PHASE_9B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY`, 2026-08-16, starting
> SHA `62ec80426035e979b563135d858bdc1438d84fb4`, substantive implementation
> `cdfdf314839fd782a962e4096b68b32641a93db2` (exact implementation CI
> 31934803846, 29/29 steps green incl. the Phase 9B harness matrix step).
> Decision D-56; design record `docs/design/PHASE_9_ROADMAP.md` §19.
> Terminal: `PHASE_9B_STATUS: BLOCKED` /
> `PHASE_9B_DEV_RESULT: NOT_PROVEN` /
> `PHASE_9B_BLOCKED_HUMAN_AUTH_ACTION_REQUIRED` — the ONE authorized
> launcher execution stopped fail-closed at the pre-browser auth gate
> (expired external DEV storage-state cookie); zero DEV contact.

### Phase 9B harness (implemented)

```
NIGHTWATCH CONTEXT                    src/browser/context.ts
  NightwatchContextOptions.semanticOracle?  (optional; no global default)
    -> createNetworkObserver({ semanticOracle })  (Phase 9A.1 seam)
PHASE 9B PURE CORE                    src/core/phase9b/**
  freshness.ts   A-F classifier: USE_REVIEWED_SNAPSHOT /
                 REDERIVE_FRESH_SNAPSHOT / BLOCK + exact tokens
  preflight.ts   13-check metadata-only readiness gate (ANY FAIL ->
                 NO DEV CONTACT; no browser context is created)
  summary.ts     normalized safe pass summaries + one-pass acceptance gate
                 (decisive = invariantPassCount > 0 or ANOMALY) + replay
                 comparison (never raw values, never receiptId equality)
GATED LAUNCHER                        bin/phase9b-real.mjs (+ pure arg
  parser bin/phase9b-launcher-args.mjs): --env=dev + --storage-state only;
  no journey selector, no URL override; one-shot NIGHTWATCH_PHASE_9B_REAL=1
RUNNER                               tests/manual/phase9b-contained-dev-semantic.ts
  fixed ripple-common-exchange-read pair (FIRST + ONE fresh-context replay)
  through the existing Phase 2B machinery (runRealRunGate,
  createNightwatchContext, runDeclarativeJourney, endpoint registry, auth
  readability, replay comparison, proxy/safety accounting); resolver
  exposed ONLY for ripple.common-exchange.read bound to the freshness-
  approved snapshot (ripple-api @ 169df39d, digest
  ev:sha256:608265368c9a086f43c94e5c); safe receipt summaries; structural
  privacy audit
```

The freshness gate is read-only remote metadata (`gh api` branch heads) +
disposable /tmp mirrors at the exact remote SHAs (gh api tarballs + a
synthetic pinned git ref; no canonical sibling mutation, no source
commits). The pre-dev readiness gate includes: nightwatch HEAD clean, exact
implementation CI green, source freshness PASS, real expectation
derived=1/current=1, DEV-reachable + KNOWN_READ, mutation steps 0, auth
structural PASS, proxy healthy, canonical DEV target exact, traces/
screenshots off. The gated launcher ran exactly once and failed closed at
the auth gate; the harness (wiring, classifier, gate, summaries, launcher,
matrices) is implemented, validated and CI-proven. Phase 6 remains
`FROZEN_BY_OWNER`; AI remains non-authoritative; catalog byte-identical
`sha256:bd35b934...`; B AVAILABLE_NOT_ADOPTED;
`NEXT_PROMOTION_AUTHORITY: NONE`; `PHASE_8_STATUS: COMPLETE`.

## Phase 9B-R1 auth-refreshed contained DEV semantic acceptance (record)

> Task `phase-9b-r1-auth-refreshed-dev-semantic-acceptance` (Phase
> 9B-R1-CONTAINED-DEV-SEMANTIC-ACCEPTANCE), authorization
> `PHASE_9B_R1_AUTH_REFRESHED_DEV_SEMANTIC_ACCEPTANCE_ONLY`, 2026-08-16,
> starting SHA `05def7abf92818c7de48fba658579397b236def7`. NO source
> changes: the validated Phase 9B harness (`cdfdf314839fd782a962e4096b68b32641a93db2`,
> exact implementation CI 31934803846) ran unmodified; R1 docs checkpoint
> `f88b6f1` (exact CI 31938800275, 29/29 steps green). Decision D-57;
> design record `docs/design/PHASE_9_ROADMAP.md` §20.
> Terminal: `PHASE_9B_R1: COMPLETE_DEV_SEMANTIC_ACCEPTANCE_VERIFIED` /
> `PHASE_9B_R1_DEV_RESULT: PASS` / `PRODUCT_SEMANTIC_MISMATCH:
> NONE_OBSERVED` / `PHASE_9_STATUS: COMPLETE`.

### R1 execution (ONE launcher invocation, clean acceptance)

The gated launcher ran exactly once (`NIGHTWATCH_PHASE_9B_CI_RUN_ID=
31938800275`, `--env=dev`, canonical DEV URL). Pre-browser gates all PASS:
fresh remote source truth (ripple-api master `169df39d…`, ripple-ui dev
`818ce2da…` re-discovered read-only; disposable /tmp mirrors at the exact
SHAs), fresh re-derivation at the approved snapshot (REDERIVE_FRESH_
SNAPSHOT, derivationOk true) + restricted resolver RESOLVED, human-refreshed
auth structural/boolean gates (expired=false), exact-head CI, proxy/
containment, canonical target. FIRST and REPLAY (fresh BrowserContext)
each produced: resolvedExpectationCount 1, receiptCount 1, PASS 1,
ANOMALY 0, NOT_APPLICABLE 0, decisiveEvaluationCount 1, invariantPassCount
3, safety all zero — under expectation `ripple.common-exchange.read.real-
source-shape` @ `mobingilabs/ripple-api` `169df39d` (evidence digest
`ev:sha256:608265368c9a086f43c94e5c`). Semantic and journey replay
comparisons deterministic; zero hard semantic outcomes; zero safety
violations; structural privacy audit PASS (no screenshots/traces/
storage-state copies/media; trace disabled; live auth readability VALID
both passes; zero semantic-oracle events); recorders finalized passed=true.
Product contact accounting: launcherInvocations 1, browserContextsCreated
2, devObservationPasses 2, completedJourneyPairs 1. The bridge is proven
end-to-end on canonical contained DEV with the privacy/safety contract
intact. Original Phase 9B stays BLOCKED historical (D-56); Phase 6 remains
`FROZEN_BY_OWNER`; AI remains non-authoritative; catalog byte-identical
`sha256:bd35b934...`; B AVAILABLE_NOT_ADOPTED;
`NEXT_PROMOTION_AUTHORITY: NONE`; `PHASE_8_STATUS: COMPLETE`;
`PHASE_9_STATUS: COMPLETE`.

## Phase 16CH portfolio runtime-binding hardening (terminal local architecture)

The Phase-16C portfolio seam is now hardened locally at
`794b32df443ae8c9a520182ef97b7a2c9985ba82`. The production-shaped path is
strictly layered:

```text
canonical runtime profile
  -> derived real approved universe
  -> inert portfolio plan + handoff
  -> strict admission + consumption-only authorization
  -> monotone-restrictive budget mapping
  -> exact-one existing work-item binding
  -> optional manifest binding identity
  -> prepare (zero executor callbacks)
  -> frozen checkpoint / resume revalidation
  -> owner policy
  -> existing single executor
```

The universe builder derives linkage from canonical registries and excludes
synthetic fixture identities. Binding identity includes the load-bearing
portfolio fields while the optional manifest field preserves historical
no-binding bytes. Resume rejects plan, universe, mapping, binding, version or
checkpoint drift before executor construction and asks for fresh
authorization. The runtime plan remains inert (`executable:false`), and the
launcher has one strict plan/authorization pair.

Phase 16CH repaired two observed defects without expanding authority: reserve
double-counting in feasibility arithmetic and unsafe external unknown-field
diagnostics. The adversarial corpus has 171 scenarios with three byte-identical
runs and thirteen zero quality floors. Canonical and topology-correct isolated
full regressions are exactly 2,232 passed / 4 skipped / 0 failed. This is
LOCAL/SOURCE/SYNTHETIC evidence only; CI was externally blocked before steps,
and Phase 16D remains separately owner-gated and unauthorized.

## Phase 17 change-aware campaign and evidence hardening (terminal local architecture)

Phase 17 adds a pure bridge from the established Phase 3 source selector into
the Phase 16 approved portfolio without changing runtime authority:

```text
bounded SelectionResult
  -> categorical impact overlay
  -> deterministic effective member scores
  -> canonical portfolio allocator
  -> sanitized manifest reasons + selection-context digest
```

`src/core/portfolio/changeImpact.ts` accepts only a validated selection result
and an already-approved portfolio. It never scans source, reads files,
contacts a network, constructs a browser, or calls an executor. Explicit
journey linkage is required; target names are never guessed. Direct/shared/
transitive evidence receives bounded lifts, while fallback, stale, unknown,
irrelevant, and unlinked cases receive no positive source lift. A global
fallback degrades direct-looking sibling reasons to the fallback disposition,
so partial source knowledge cannot inflate confidence. Only categorical
impact classes, reason codes, confidence, priority, and bounded counts cross
the bridge; paths, explanations, and source evidence do not.

The identity boundary now uses canonical stable JSON for change and source
correlation identities, normalizing omitted optional fields. Baseline files
are parsed as strict versioned documents with own-field checks, bounded
records, canonical ordering, SHA/changeset/status consistency, and safe
provenance. Shared validator diagnostics use a bounded projection that
redacts secret-, identity-, and URL-shaped values. The minimizer keeps its
historical result schema, but `buildMinimalityEvidence` refuses to reconstruct
occurrence-specific proven minimality from repeated action IDs.

The implementation is local/source/synthetic only. The nine-case
`corpus/phase17/changeImpactFixtures.ts` matrix and 27-test Phase 17 suite
cover direct, shared, transitive, irrelevant, ambiguous, deleted, renamed,
stale, and simultaneous changes, malformed documents, hostile diagnostics,
repeated-action replay, and three-run byte stability. Phase 16D remains
separately unauthorized; Phase 6 is frozen and no sibling repository is
modified. The first integrated run caught a legitimate `ripple-account-
inventory.read` target being rejected by broad identity redaction; the
identifier-shaped repair is covered by a positive control and the final
canonical/isolated 2259 passed / 4 skipped / 0 failed exact-parity proof.
Actions run 32628613509 / job 97167784939 executed zero steps under the known
external billing/spending block, so this architecture evidence is local green,
not CI green.

## Phase 19 integrated campaign-intelligence architecture

Phase 19 composes the existing selection, semantic, replay, minimization, and
triage authorities through a pure bounded planning/evidence layer:

source/change intelligence
  -> behavior-level impact report
  -> staged semantic coverage matrix
  -> explainable campaign plan and priority
  -> scenario/oracle outcomes and sanitized yield
  -> replay fidelity V4 and minimization V2
  -> bounded stability and confidence
  -> semantic/protocol finding clusters
  -> deterministic owner dossier and coverage learning

The campaign-intelligence DTOs are versioned and additive. They contain safe
identities, categorical reasons, bounded scores, source-currentness status,
coverage stages, replay divergence, proof strength, stability class,
confidence degradation, and remediation hints. They do not invoke an executor,
browser, process, filesystem, network, database, AI, self-development, or
persistence path. The bounded cache keys complete sanitized inputs and
source-currentness, so changed source cannot reuse an old impact/coverage
report.

The product boundary is a generic read-only adapter contract. Ripple is the
only real registered adapter; the second adapter is synthetic-only and exists
to test generic planning and semantic binding. The local operator commands
expose status, plan, coverage, campaign preview, findings, and explain output
without accepting an environment selector or contacting DEV/NEXT.

## Phase 20 semantic coverage saturation architecture

Phase 20 extends the established path rather than introducing another oracle
or prioritizer:

```text
bounded sibling-source text
  -> fixed syntax-aware contract analyzers
  -> provenance-bound discovery/admission/currentness
  -> deterministic contract graph and lifecycle gaps
  -> semantic expectations and safe observation features
  -> relational / differential / metamorphic evaluation
  -> contract-derived synthetic fixtures and mutants
  -> Phase 19 coverage facts, gap reasons, planner, replay, minimization
  -> dossier v4 derivation chain and local operator views
```

The inventory currently covers 22 candidates from 6 synthetic source artifacts
(21 mechanically provable/admitted, 1 explicit unsupported-syntax rejection).
The graph contains 157 nodes, 151 edges, and 86 gaps. Relational semantics
provide 13 bounded kinds, the synthetic corpus binds 12 relation records, and
cross-surface comparison uses one explicitly declared browser/API pair with
nine permanent outcomes. Three metamorphic relations exercise a seven-kind
vocabulary. Projection depth remains category-only: type, presence,
cardinality, ordering, set cardinality, relation truth, bounded aggregate
relations, and safe digests; raw values never cross the boundary.

Synthetic measurement generated 34 mutants, 32 applicable and detected, 0
surviving, 31 benign controls, and 0 false positives. Graph gaps and surviving
mutants are additive inputs to the existing Phase 19 coverage/planner
authority; priority cannot authorize execution. Source-keyed caches are
bounded and include source identity/digest in their key, while unknown syntax,
stale evidence, unsupported projections, and unsafe paths fail closed.

## Phase 21 semantic gap closure architecture

Phase 21 closes lifecycle gaps through the existing Phase 19/20 seams. It does
not create a new execution authority:

```text
Phase 20 graph + exact gap census
  -> versioned closure ledger and deterministic closure plan
  -> ephemeral source-bound membership comparison
  -> explicit surface evidence and fixed semantic alignment
  -> synthetic mutation and differential campaign
  -> contract-bound replay equivalence
  -> dependency-aware semantic minimization
  -> coverage quality, graph normalization, dossier V5, operator views
```

Membership is categorical and bounded. Opaque allowed/observed values are
compared only inside the ephemeral projection context; result objects contain
categories, bounded cardinalities, and safe digests, never raw members or
identity tokens. Differential pairing requires explicit source-bound
equivalence evidence; scalar/list, absent/default, and set alignment rules are
versioned and unknown transformations fail closed. Replay reproduction is
bound to the semantic contract and occurrence identity, while minimization
retains explicit prerequisite edges and the original violation identity.

The terminal synthetic graph is 239 nodes / 233 edges / 3 residual gaps,
with 21 admitted cross-surface pairs and 21 full-lifecycle contracts. The
remaining residuals are one unsupported source proof and two duplicate-
equivalence joins that lack mechanical proof. Coverage and operator output are
local, additive, deterministic, and authority-inert.
