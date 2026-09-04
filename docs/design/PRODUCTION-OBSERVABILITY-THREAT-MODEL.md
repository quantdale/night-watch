# Threat Model — Production-Aware Nightwatch

Scope: the target system described in `openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/design.md`. Every hazard is given
prevention (stop it), detection (see it), containment (bound it), evidence
(prove it happened or did not), recovery (return to a safe state), and the
required test that must exist before the hazard's stage is entered.

Severity: **C** catastrophic (customer or production harm) · **H** high
(privacy or safety-model breach) · **M** medium (false conclusions or wasted
authority) · **L** low.

Residual risk after all controls is stated per hazard; nothing is claimed to be
eliminated.

---

## Group 1 — Writing to production

### T-01 Accidental mutation via an admitted route · **C**
- **Prevention.** Three independent guards, all required: passive-only action
  policy; route-level `READ_ONLY_PROVEN` (two witnesses, §4); method
  restriction with no request body (G7). A GET binding alone never suffices.
- **Detection.** Post-condition evaluator asserts the response carries no
  mutation signal (`201`, `Location`, `Set-Cookie` on a read route) and the
  request carried no body.
- **Containment.** Serial execution, per-route budget 10, campaign terminates on
  the first anomaly of this class.
- **Evidence.** Per-request admission receipt naming both witnesses and their
  evidence digests.
- **Recovery.** Kill switch; demote to P0; the affected route's read-only proof
  is revoked pending re-derivation.
- **Test.** Adversarial corpus in which a route is `GET`-bound but its effect
  closure contains `updateItem`; assert `READ_ONLY_PROVEN` is refused and the
  route is never admitted.
- **Residual.** A handler that mutates through a callee outside the bounded
  closure depth. Mitigated by failing closed on depth overflow, so this can only
  occur if the write vocabulary is incomplete — hence T-02.

### T-02 Incomplete `WRITE_VOCABULARY` · **C**
- **Prevention.** Vocabulary is data-only, versioned, digest-bound, and derived
  by enumerating the *entire* DAO/method surface of the target repository, not
  by listing suspected names. Any callee name not classified as read **or**
  write makes the closure `AMBIGUOUS`, not read-only.
- **Detection.** Coverage metric: percentage of callee identifiers in the
  repository classified by the vocabulary; below 100 % blocks promotion.
- **Containment.** Unclassified identifier ⇒ no proof ⇒ no admission.
- **Evidence.** Vocabulary digest recorded on every read-only proof.
- **Recovery.** Bump vocabulary version; all dependent proofs invalidate.
- **Test.** Mutation test: remove one write name from the vocabulary and assert
  the affected proofs flip to `AMBIGUOUS`, not to `READ_ONLY_PROVEN`.

### T-03 GET endpoint with side effects · **C**
- Same controls as T-01. The design's core assumption is *exactly* this hazard:
  "assume a GET route may mutate state unless mechanically proven otherwise."
- **Residual.** A side effect invisible in source (e.g. a database trigger, a
  downstream service's own write, an analytics write in middleware). Explicitly
  **UNRESOLVED**; partially mitigated by requiring P1 passive observation before
  P2 and by the per-route budget of 10.

### T-04 Mutation through redirect or middleware · **H**
- **Prevention.** L0 Fetch guard re-evaluates every follow-up against the
  production policy; off-allowlist redirect targets are blocked pre-network.
- **Detection.** Redirect chain recorded with each hop's verdict.
- **Containment.** Redirect depth ≤ 2; a redirect changing method is fatal.
- **Test.** Fixture serving `302` to an admitted host with a `POST` follow-up;
  assert hard failure.

### T-05 "No dry-run, no rollback" temptation · **C**
- **Prevention.** Design prohibition: no create-then-delete, no
  transaction-and-abort, no "safe" test entity. Encoded as a hardening rule
  forbidding any mutation verb in the production cone.
- **Test.** Hardening check asserting no `POST|PUT|PATCH|DELETE` literal reaches
  the production request builder.

---

## Group 2 — Classification and proof integrity

### T-06 Malicious or incorrect route classification · **H**
- **Prevention.** Classification is derived, never authored; the derivation
  input is repo@SHA; the recipe/vocabulary is owner-reviewed and digest-bound.
- **Detection.** Re-derivation at every campaign prepare; digest mismatch is
  `SOURCE_STALE`.
- **Evidence.** `ev:sha256:<24>` over the normalized extraction.
- **Test.** Byte-level tamper of a source file ⇒ proof invalidates.

### T-07 Source false positive (a proof that is simply wrong) · **H**
- **Prevention.** Two independent witnesses of different kinds; a single-witness
  surface is DEV-only.
- **Detection.** Precedent exists — D-79 reproduced two false-positive
  admissions (same-class `$this` binding across files; a named static call
  binding to a non-static method) and repaired them. That failure mode is real
  and recurring.
- **Containment.** Every new proof family enters at `READ_ONLY_SINGLE_WITNESS`.
- **Test.** Each proof family ships with a negative corpus of at least the
  historical false positives.

### T-08 Stale source · **M**
- **Prevention.** Snapshot frozen at prepare; SHA + evidence digest bound.
- **Detection.** `classifyExpectationCurrentness` (existing).
- **Containment.** `SOURCE_STALE` ⇒ no authority; never `PASS`.
- **Test.** Existing `phase10Currentness` suite, extended to production gates.

### T-09 Source/runtime drift · **M**
- **Prevention.** Impossible to prevent; drift is a property of the world.
- **Detection.** Contradiction between a `RUNTIME_FACT` and a `SOURCE_FACT`
  raises finding class `SOURCE_RUNTIME_DRIFT`.
- **Containment.** Drift on a route immediately demotes its read-only proof to
  `AMBIGUOUS` for subsequent campaigns.
- **Test.** Synthetic response with a key absent from the proven contract ⇒
  drift finding, and the route is not re-admitted.

### T-10 Silent truncation producing false completeness · **H**
- The measured, live instance of this class (bug B-1: 95 of 223 routes dropped).
- **Prevention.** Remove fixed caps in favour of paging; where a bound is
  genuinely required, make exceeding it an error, not a silent `continue`.
- **Detection.** `TRUNCATED` is a first-class state in every ledger, contract
  and view.
- **Containment.** `truncated > 0` invalidates completeness claims for that
  dimension.
- **Test.** Fixture with `limit + 1` routes ⇒ assert `truncated = 1` appears in
  the CLI projection, the Control Center contract, and the coverage ledger.

---

## Group 3 — Network and browser containment

### T-11 Wrong production host · **C**
- **Prevention.** Exact allowlist inside `PROD_OBSERVE` only; no wildcards; no
  substring matching (D-3).
- **Detection/Containment/Evidence/Recovery/Test.** As the existing L1/L5 canary
  suite, re-run against the production policy object.

### T-12 DNS rebinding / resolved-address mismatch · **C**
- **Prevention.** Complete-answer-set admission; global-unicast requirement;
  exact numeric dial; no second lookup.
- **Test.** Existing `addressPolicy` negative matrix, re-parameterized for
  production hosts.

### T-13 Browser bypass (QUIC, WebRTC, prefetch) · **H**
- **Prevention.** `--disable-quic`, non-proxied UDP disabled, mandatory L6
  namespace for every production run.
- **Residual.** DNS prefetch is not visible as a proxy event — **UNRESOLVED**
  in DEV today; L6 makes it unreachable, which is why L6 is mandatory in
  production rather than optional.

### T-14 Service workers · **H**
- Blocked natively plus init-script stub; any `serviceworker` event is fatal.

### T-15 WebSockets · **H**
- **Denied outright** in `PROD_OBSERVE` v1 — stricter than DEV, because a
  duplex channel cannot be method-restricted.

### T-16 Background requests and telemetry · **M**
- Blocked-not-failed with the same explicit host tables as DEV; production
  adds no new allow entries.

### T-17 SDK defaults reaching production from a DEV run · **H**
- Already the RECON_B E1 hazard; unchanged. DEV/NEXT policies continue to deny
  production hosts. `PROD_OBSERVE` cannot be entered from a DEV launcher.

---

## Group 4 — Volume, availability, and blast radius

### T-18 Retry storm · **H**
- **Prevention.** No automatic retry anywhere in the production cone; retries
  are an explicit, budgeted, owner-configured count of at most 1.
- **Detection.** Request counter per route.
- **Containment.** Token bucket reserved before execution, never refunded.
- **Test.** Inject persistent 5xx; assert exactly one attempt and a
  circuit-breaker open.

### T-19 Replay storm · **H**
- Bounded by the existing replay-reservation ledger; ≤ 2 production replays per
  candidate; reservations are terminal on resume so an interruption cannot
  double-spend.

### T-20 Infinite campaign · **M**
- `maxRuntimeMs`, global request budget, monotonic clock, checkpointed budget.
- **Test.** Force a stalled response; assert deadline termination with budget
  intact.

### T-21 API rate-limit impact on real users · **C**
- **Prevention.** Serial execution; ≤ 1 request / 2 s per service; global cap
  200.
- **Detection.** Any `429` anywhere opens the global breaker immediately.
- **Recovery.** Terminate; demote to P0; owner review before the next campaign.

### T-22 Account lockout of the observer identity · **H**
- **Prevention.** No credential guessing, no auth retry, no login automation in
  production; storage state is captured by a human out of band.
- **Detection.** Any `401`/`403` terminates the campaign rather than retrying.

### T-23 Cache invalidation / warming side effects · **M**
- **Prevention.** Read requests only, no cache-busting parameters, no
  `Cache-Control: no-cache` injection.
- **Residual.** A read can still populate a cache. Accepted as inherent to any
  observation; bounded by the request budget.

### T-24 Runtime outage mistaken for a product defect · **M**
- **Prevention.** Health probe before and after each work item.
- **Detection.** Anomaly confidence is capped when the service breaker is open
  or a health probe failed.
- **Containment.** Outage-window observations are classified
  `ENVIRONMENT_UNSTABLE`, never `PRODUCT_ANOMALY`.
- **Test.** Fixture that returns 503 mid-campaign; assert no candidate is
  admitted.

### T-25 Malformed server response crashing the analyzer · **M**
- Bounded parser, size caps, categorical errors, `INTERNAL_ERROR` receipt that
  is never `PASS`.

---

## Group 5 — Privacy

### T-26 Auth-state leakage · **C**
- **Prevention.** External path-only reference; values read into locals for
  boolean checks only; tracing always disabled; screenshots prohibited in
  production.
- **Detection.** Persistence audit over the entire private root after every
  campaign.
- **Test.** Fake-secret suite extended with production shapes.

### T-27 Customer data persisted because Nightwatch observed it · **C**
- **Prevention.** Allowlist structural projection; no code path copies a leaf
  value; raw bytes never cross the projection boundary.
- **Detection.** Sentinel corpus; projection-totality property test.
- **Containment.** Store boundary re-screens and fails closed.
- **Evidence.** Every persisted record carries the projection version.
- **Test.** §6.5 of `openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/design.md`, all five, green before P1.

### T-28 Private material in logs, errors, screenshots, traces · **H**
- **Prevention.** Categorical error codes only; no interpolation of observed
  content into any message; screenshots/traces prohibited.
- **Test.** Error-path leakage test over the whole production cone.

### T-29 Findings accidentally published · **C**
- **Prevention.** No connector exists; `EXTERNAL_PUBLICATION` is a frozen owner
  operation; the production store is a separate root outside Git;
  `.gitignore` covers it; `hardening-check` asserts no tracked file matches the
  private-artifact patterns.
- **Test.** Existing private-surface hardening rule extended to the production
  root.

### T-30 Digest used as a customer join key · **M**
- **Prevention (current, D-113).** There is NO durable value-derived digest to
  join on. The only persistable family is the STRUCTURAL digest
  `prodstruct:sha256:<24>`, computed from privacy-approved structural
  information only — node types, shape, cardinality, key-provenance
  classification and source-proven key literals. A NUMBER serializes as its
  type alone, so a monetary amount is indistinguishable from a count and no
  customer value contributes any input. Within a single in-memory analysis,
  correlation uses encounter-ORDER tokens that are never persisted and never
  digested.
- **Test.** The persistence firewall refuses any non-`prodstruct:` digest
  family by name, including the DEV `proj:sha256:` family; the policy object
  records `durableValueDigest: 'ABSENT'` and cannot be constructed otherwise;
  planted sentinel values appear in no persisted digest input.
- **SUPERSEDED (historical).** This entry previously read "Prevention:
  per-campaign salt, never persisted. Test: two campaigns over identical data
  must produce different digests." That is obsolete under D-113 and its test
  was the exact OPPOSITE of the current requirement: the structural digest is
  deliberately unsalted and deterministic so that two campaigns over identical
  structure DO produce identical digests, which is what makes cross-campaign
  new-deployment detection possible. There is no salt, because there is no
  durable value digest to salt.

---

## Group 6 — Agency and authority

### T-31 Agent hallucination becoming authority · **H**
- **Prevention.** Every authority is a machine check over content-addressed
  evidence; no natural-language artifact grants execution. `docs/design/PRODUCTION-OBSERVABILITY-MASTER-PLAN.md`
  itself grants nothing.
- **Detection.** `agent:check` / `project:check` cross-file state machine.

### T-32 AI-generated action authority · **H**
- **Prevention.** D-32 preserved; AI consumes only sanitized projections and
  emits non-executable artifacts with `humanReviewRequired: true`,
  `executable: false`, `externalPublication: PROHIBITED`; hardening rules
  forbid the AI cone from importing campaign/browser/auth modules.

### T-33 Unsafe UI control · **H**
- **Prevention.** Control Center is GET/HEAD-only with no mutation route; the
  design forbids adding one; any future trigger must be a separate CLI.
- **Test.** Assert every non-GET method returns 405 and that the route table
  contains no mutating handler.

### T-34 Owner authorization replayed or over-scoped · **H**
- **Prevention.** One-shot, scoped, expiring tokens with the existing
  `ALREADY_CONSUMED` semantics from the Phase 8B.1 promotion chain; a token
  authorizes exactly one stage transition for one campaign.
- **Detection.** Token ledger; re-use fails closed.
- **Test.** Replay a consumed token; assert refusal.

---

## Group 7 — Second-review additions (T-35 … T-48)

Added by the independent second review
(`docs/design/PRODUCTION-OBSERVABILITY-INDEPENDENT-REVIEW.md`).
`T-01`…`T-34` above are the first explorer's and are preserved unchanged.

Note on `T-13`: `--disable-quic` and
`--force-webrtc-ip-handling-policy=disable_non_proxied_udp` are **existing**
controls (`src/browser/contract.ts:21-22`), not proposed ones.

### T-35 Middleware/framework pipeline effect outside the handler closure · **C** · MEASURED
- **Instance.** `mobingilabs/ripple-api/src/App/Middleware/MarketplaceSubscriptionMiddleware.php:18,26,36,100`
  performs an outbound `curl` to a hard-coded **production** `api.alphaus.cloud`
  webhook from `__invoke`, with no HTTP method guard, on every request in any
  route group whose config enables `x-header`
  (`src/App/Route/Providor/RouteProvidor.php:74`).
- **Prevention.** Root `W-EFFECT_CLOSURE` at the route's fully resolved
  middleware pipeline **plus** handler, derived mechanically from the app
  bootstrap and the per-route `middleware` config. Unresolvable pipeline ⇒
  `AMBIGUOUS`.
- **Detection.** Admission receipt names every pipeline element analysed;
  an element count of zero for a route that declares middleware is a hard error.
- **Containment.** No proof ⇒ no admission.
- **Evidence.** Pipeline resolution digest recorded on each read-only proof.
- **Recovery.** Invalidate every proof derived with a handler-only closure.
- **Test.** This exact route/middleware pair as a permanent negative fixture:
  assert a GET on an `x-header` group is refused `READ_ONLY_PROVEN`.
- **Residual.** None once the closure root is corrected; the effect itself
  remains and is covered by T-36.
- **Classification.** Preventable.

### T-36 Transitive production contact induced via the system under test · **H**
- **Prevention.** Not preventable by Nightwatch. L0–L6 govern Nightwatch's own
  egress; they cannot govern a server calling production on Nightwatch's behalf.
- **Detection.** Source-level: any outbound call in a route's resolved closure
  is recorded on the operation as `INDUCED_EGRESS` with its destination class.
- **Containment.** Per-route budget bounds Nightwatch-originated requests only.
  The induced fan-out multiplier is `UNKNOWN` and must be reported as such.
- **Evidence.** `INDUCED_EGRESS` annotations from the source model.
- **Recovery.** Withdraw the route from the production admission list.
- **Test.** Assert a route with a production-destined induced call is never
  auto-admitted to `PROD_OBSERVE`.
- **Residual.** R-6.
- **Classification.** Detectable in source; not containable; partly accepted.

### T-37 Cross-repository callee inside a read closure · **C**
- **Prevention.** An unresolved or out-of-universe callee makes the closure
  `AMBIGUOUS`. Never treat "outside the repository" as "no effect".
- **Detection.** Callee-resolution coverage metric per proof.
- **Containment.** No proof ⇒ no admission.
- **Test.** A GET handler calling an out-of-universe symbol ⇒ refusal.
- **Classification.** Preventable.

### T-38 Asynchronous or queued write from a read handler · **C**
- **Prevention.** Replace the binary write vocabulary with an effect-kind
  lattice covering `MESSAGE_PUBLISH`, `CACHE_WRITE`, `SESSION_WRITE`,
  `AUDIT_WRITE`, `EXTERNAL_CALL`, raw SQL literals and ORM
  `save`/`persist`/`flush`, in addition to `DATA_WRITE`.
- **Detection.** `UNCLASSIFIED > 0` blocks promotion.
- **Test.** A GET whose closure publishes to a queue ⇒ refusal.
- **Classification.** Preventable.

### T-39 Audit/access-log write on the read path · **M**
- **Prevention.** Not preventable — many read paths legitimately write an audit
  row. Requires an explicit owner policy **per effect kind**, recorded on each
  proof, rather than a silent exception inside the vocabulary.
- **Detection.** Effect-kind breakdown reported per proof and in the ledger.
- **Test.** Assert `AUDIT_WRITE` never silently classifies as `PURE_READ`.
- **Classification.** Accepted residual under explicit owner policy.

### T-40 Production request-parameter provenance · **H**
- **Prevention.** Real customer identifiers are required to construct a
  meaningful production read. They must be owner-supplied, stored external-only
  (D-13/D-20 discipline), referenced internally by an **opaque handle**, and
  resolved only inside the request builder.
- **Detection.** Admission gate refusing any request whose concrete parameters
  did not come from the approved source.
- **Containment.** Values never enter logs, budget keys, digest inputs,
  fingerprints, ledgers, errors or checkpoints.
- **Test.** Sentinel parameter value; assert it appears nowhere outside the
  in-memory request builder.
- **Classification.** Preventable.

### T-41 Key-name leakage through the "shape" allowlist · **C**
- **Prevention (current, D-112/D-113/C-10.5).** A key literal may be persisted
  only if it is a PROVEN MEMBER of a key vocabulary derived mechanically from
  validated source evidence — never because it matched a shape. Since C-10.5
  that vocabulary must additionally carry PRODUCTION authority, enforced at the
  persistence boundary. An untrusted or dynamic key literal (account id, MSP
  id, company name) is NOT hashed into durable evidence: it projects to
  STRUCTURAL facts only — bounded key cardinality plus a key-provenance
  classification — and the literal is discarded rather than transformed.
- **Detection.** Projection-totality over every persisted position, enforced by
  the inventory-driven coverage rule (C-10.5 A13) rather than by a corpus
  organized by value class.
- **Test.** A response object keyed by a 12-digit account id: assert no key
  literal is persisted, AND that no digest anywhere in the persisted record
  took that literal as input.
- **Classification.** Preventable.
- **SUPERSEDED (historical).** This entry previously said dynamic string keys
  "project to cardinality plus digest". Digesting an untrusted key literal is
  now forbidden: a low-entropy identifier hashed into durable evidence is a
  reversible correlation key, and there is no durable value-digest family for it
  to live in (D-113). Cardinality and provenance class survive; the literal does
  not, in any form.

### T-42 Digest-family collision between salting and cross-run comparison · **H**
- **Prevention (current, D-113).** The contradiction is resolved by REMOVING one
  side of it, not by keeping two families. The production persistence contract
  has exactly ONE digest concept and one deliberate absence:
  - `prodstruct:sha256:<24>` — STRUCTURAL. Value-free, unsalted, deterministic,
    stable across runs and environments, comparable across campaigns, and
    persistable. Safe precisely because the canonical bytes it hashes contain no
    value and no unproven key literal.
  - durable value digest — **ABSENT**. Not "unsalted", not "unpersisted":
    non-existent. Nothing in the production contract required durable value
    correlation, so the concept was removed rather than invented, and the
    versioned policy object records `durableValueDigest: 'ABSENT'`.
  In-run correlation uses encounter-ORDER tokens that are never persisted and
  never digested, so there is no salt to persist and no low-entropy value hash
  to invert.
- **Detection.** Contract-level type separation plus a persistence firewall that
  refuses any other digest family BY NAME, so an unrecognized family fails
  closed rather than being accepted as "some digest".
- **Test.** Structural digests are stable across campaigns over identical
  structure; the policy object cannot be constructed with any other value for
  `durableValueDigest`; the firewall rejects the DEV `proj:sha256:` family.
- **Classification.** Preventable.
- **SUPERSEDED (historical).** This entry previously specified a second family,
  "a **salted value digest** (per-campaign, never persisted, never compared)",
  and `design.md §6.2/§6.4` specified a per-campaign salt. Independent review
  F-15 (with MA-11 and UA-11) showed the two-family model was itself the
  contradiction: a family that is never persisted and never compared has no
  consumer, while §9.4 simultaneously required cross-campaign structural
  comparison. D-113 supersedes both the master-plan text and this entry.

### T-43 Observer session side effects · **H**
- **Prevention.** No login automation, no auth retry, no credential refresh.
- **Detection.** Any `401`/`403` terminates the campaign.
- **Containment.** Reads may still extend a session, evict the human's
  concurrent session under single-session enforcement, or rotate a token and
  invalidate the operator's saved storage state.
- **Recovery.** Owner re-captures storage state out of band.
- **Test.** Assert no code path writes `context.storageState()` in the
  production cone, and no rotated `Set-Cookie` is persisted.
- **Classification.** Detectable and recoverable.

### T-44 WAF, bot-mitigation or SOC response to automated traffic · **H**
- **Prevention.** Serial execution, ≤ 1 req/2 s per service, global cap, and a
  new gate `G-ORG` requiring an owner-attested observation window.
- **Detection.** Any `403` from an edge/WAF class response opens the global
  breaker.
- **Containment.** Corporate egress IP ban and on-call alert noise are
  organizational costs; bounded by the window gate and prior notification.
- **Test.** Fixture returning a WAF-class block; assert immediate global
  breaker open and campaign termination.
- **Classification.** Containable.

### T-45 Attribution and compliance of automated production reads · **H**
- **Prevention.** `ORG_ENFORCED_READ_ONLY` observer identity, which is an
  attribution control as well as a capability control.
- **Detection.** `observerIdentityClass` recorded on every run.
- **Containment.** None available under `ORDINARY_USER`: production audit logs
  will attribute automated traffic to a human.
- **Test.** Assert a campaign refuses to start when the recorded identity class
  is below the stage minimum.
- **Residual.** R-7 when `ORG_ENFORCED_READ_ONLY` is unavailable; requires
  written owner acceptance before P2.
- **Classification.** Preventable, else accepted residual.

### T-46 Minimization synthesizing an unproven request variant · **C**
- **Prevention.** In production, minimization may only **remove** steps. Any
  minimized request must independently re-satisfy G4, G5 and G7 before issue;
  parameter mutation into an unproven shape is prohibited.
- **Detection.** Each replayed/minimized request carries its own admission
  receipt.
- **Test.** Minimizer proposing a mutated parameter ⇒ refusal.
- **Classification.** Preventable.

### T-47 Numeric acceptance target pressuring proof weakening · **H**
- **Prevention.** Remove `≥ 200 READ_ONLY_PROVEN` as a pass/fail gate. The gate
  is zero false positives on the negative corpus plus 100 % callee
  classification coverage; the achieved count is reported as an observation.
- **Detection.** Any change that increases the count while reducing negative
  corpus coverage is a gate failure.
- **Test.** Vocabulary-removal and witness-removal mutation tests must flip
  proofs to `AMBIGUOUS`, never to `READ_ONLY_PROVEN`.
- **Classification.** Preventable.

### T-48 Concurrent-agent workspace corruption destroying in-progress evidence · **M** · OBSERVED
- **Instance.** During the first exploration a concurrent session set
  `skip-worktree` on `docs/ROADMAP.md`, added the planning change directory to
  `.git/info/exclude`, and **deleted** the in-progress `audit.md`.
- **Prevention.** Campaign C-00: per-agent `git worktree` on a session-owned
  branch; file-ownership rule; prohibition on `git clean -fd`,
  `git checkout -- <path>`, `git restore` and `git stash` outside owned paths.
- **Detection.** `agent:check` repository-hygiene invariant — no
  `skip-worktree`/`assume-unchanged` bits, `.git/info/exclude` matches a
  committed digest, `.git/hooks` contains only samples.
- **Containment.** Worktrees isolate index and checkout; the object store is
  append-only.
- **Recovery.** Fast-forward-only integration; never force-push, never rebase
  another session's commits.
- **Test.** Assert the hygiene invariant fails when a `skip-worktree` bit is set.
- **Classification.** Preventable.

## Summary — what remains unresolved after all controls

| # | Residual | Why it cannot be closed here |
|---|---|---|
| R-1 | A production side effect invisible in source (DB trigger, downstream write, middleware analytics) | Requires runtime/state introspection that the owner scope freezes. Bounded by per-route budget and the P1-before-P2 requirement. |
| R-2 | Route → runtime host binding (U-1) | The `mochi` Ingress manifests are not in this workspace. Until then no route can be `DEPLOYMENT_FACT`-bound and P2 must use the client-side host matrix, which is weaker evidence. |
| R-3 | Organizationally enforced read-only observer identity (U-3) | Organizational decision outside Nightwatch. P4 is gated on it; P2/P3 are designed not to depend on it. |
| R-4 | DNS prefetch invisibility | Mitigated only by making L6 mandatory in production; not eliminated. |
| R-5 | Cache warming from reads | Inherent to observation. |

### Second-review residuals

| # | Residual | Why it cannot be closed here |
|---|---|---|
| R-6 | Induced downstream production load is unmeasured (T-36) | Requires visibility into the callee's own egress, outside Nightwatch and outside the owner scope. |
| R-7 | Attribution under `ORDINARY_USER` (T-45) | Organizational; closed only by `ORG_ENFORCED_READ_ONLY`. |
| R-8 | Browser profile bytes on disk during a session and after a crash | Inherent to running a real browser; bounded by ephemeral paths, disabled disk cache, and crash-path cleanup in the persistence audit. |

**Narrowing of `R-1`.** `R-1` ("a production side effect invisible in source")
must no longer absorb middleware-level effects. T-35 is a side effect that
**is** visible in source and was missed only because the analysis was rooted at
the handler. `R-1` now covers only effects genuinely invisible in source:
database triggers, a downstream service's own writes, and infrastructure-level
analytics.

### MA-8 / D-115 P1 reconciliation (historical analysis above stands)

T-13's "mandatory L6 namespace for every production run" is refined for P1:
an operator-provided already-loaded page cannot be placed in a fresh
namespace Nightwatch creates (F-13). For P1's attach-only observer the
replacement is the stated passive-cone invariant — no traffic-initiation
capability, no page-mutation capability, every observed request counted and
attributed with UNKNOWN failing closed, bounded scope/window/host, mandatory
projection (D-115). R-4's mitigation therefore reads "L6 mandatory, except P1
under the D-115 invariant" rather than changing R-4's UNRESOLVED status: DNS
prefetch invisibility is still not eliminated, and a P1 session observing
during prefetch-heavy application behavior accounts that traffic as
UNKNOWN — which denies PASS rather than waving it through.
