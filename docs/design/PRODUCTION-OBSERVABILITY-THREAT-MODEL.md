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
- **Prevention.** Per-campaign salt, never persisted.
- **Test.** Two campaigns over identical data must produce different digests.

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

## Summary — what remains unresolved after all controls

| # | Residual | Why it cannot be closed here |
|---|---|---|
| R-1 | A production side effect invisible in source (DB trigger, downstream write, middleware analytics) | Requires runtime/state introspection that the owner scope freezes. Bounded by per-route budget and the P1-before-P2 requirement. |
| R-2 | Route → runtime host binding (U-1) | The `mochi` Ingress manifests are not in this workspace. Until then no route can be `DEPLOYMENT_FACT`-bound and P2 must use the client-side host matrix, which is weaker evidence. |
| R-3 | Organizationally enforced read-only observer identity (U-3) | Organizational decision outside Nightwatch. P4 is gated on it; P2/P3 are designed not to depend on it. |
| R-4 | DNS prefetch invisibility | Mitigated only by making L6 mandatory in production; not eliminated. |
| R-5 | Cache warming from reads | Inherent to observation. |
