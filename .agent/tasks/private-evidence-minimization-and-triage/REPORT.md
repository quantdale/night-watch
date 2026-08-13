# NIGHTWATCH — PRIVATE EVIDENCE MINIMIZATION + AUTONOMOUS TRIAGE

Status: `IN_PROGRESS` pending the final documentation checkpoint. The
implementation is complete and validated locally; this report records the
owner freeze, the application-only architecture, and the exact remaining
closure action.

## 1. Checkpoint identity

- Starting SHA: `2792795ae69a5535a769180e3e2f38096a186769`.
- Phase 6 implementation/history preserved: latest significant implementation
  `483fbe4f41f235e3e1e0a12e0613954f3db4aefe`; prior clean checkpoint
  `2792795ae69a5535a769180e3e2f38096a186769`.
- Final implementation SHA: `1e694c8966a68779fb3cbd4059b0b67a0d427a7a`.
- Final checkpoint SHA: recorded in the final closure commit after this report
  is synchronized.
- Final clean HEAD: recorded with the final checkpoint SHA.
- Nightwatch branch: `main`.
- Nightwatch Git remote privacy: `NO_REMOTE`; no remote was configured or
  pushed.

## 2. Phase 6 owner decision

- Phase 6 previous status: `M7 BLOCKED` because authoritative runtime-to-
  datastore deployment mapping and designated scope were unavailable.
- Phase 6 new status: `FROZEN_BY_OWNER`.
- Reason: `INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.
- Durable interpretation: `OWNER_DECISION_SUPERSEDES_BLOCKER`,
  `PHASE_6_FROZEN`, `NO_EXTERNAL_ACTION_REQUIRED`.
- This is not `COMPLETE`, `FAILED`, `BLOCKED_WAITING_FOR_HANDOFF`, or
  `ABANDONED_DUE_TO_IMPLEMENTATION_DEFECT`.
- Historical frozen datastore budget: maximum 6, used 0, remaining 6;
  real data oracles D1/D2/D3 preserved as local design artifacts.
- Prior phases 0/1/1.1/1.2, 1.3, 2A/2B/2C, 3, 4, and 5 remain closed.

## 3. Permanent scope and disclosure policy

- Infrastructure freeze: GCP/GKE/Kubernetes, `kubectl`, Cloud Asset,
  deployment/logging/Artifact Registry archaeology, service-account
  investigation, AWS STS/IAM/runtime-role/account discovery, and deployment
  configuration are owner-policy blocked.
- Datastore freeze: DynamoDB, BigQuery, Spanner, production SQL, datastore
  metadata, and all real Phase 6 data-oracle execution are owner-policy
  blocked.
- External-disclosure freeze: no Slack, email, GitHub issue/PR, Jira, Linear,
  shared Drive, shared Notion/docs, upload, coworker request, customer
  response, or automatic publication path exists.
- Private output stops at an owner-reviewed local dossier. The deterministic
  package is AI-ready data only; no LLM is integrated and AI is prohibited
  from deciding failure, overriding safety/oracles, inventing results, or
  triggering external access.

## 4. Executable freeze enforcement

- Policy: `nightwatch.owner-scope-policy.v1`, implemented in
  `src/core/policy/ownerScope.ts`.
- Unknown operation classes fail closed.
- Phase 6 real-query path: `GatedReadToolInvoker` calls the owner gate before
  any connector/executor and returns `OWNER_POLICY_BLOCKED` for all three
  datastore classes. Synthetic adapters remain available for local tests.
- GKE/cloud code paths: no active Nightwatch executor; all frozen classes fail
  before an external callback. No cloud command was run for this task.
- Historical Phase 6 artifacts are preserved; no historical code was deleted
  to hide the previous infrastructure blocker.

## 5. New task and schema versions

Task: `private-evidence-minimization-and-triage`.

- `nightwatch.owner-scope-policy.v1`
- `nightwatch.failure-minimization.private.v1`
- `nightwatch.anomaly-cluster.private.v1`
- `nightwatch.bug-dossier.private.v1`
- `nightwatch.overnight-summary.private.v1`
- `nightwatch.morning-brief.private.v1`
- `nightwatch.ai-ready-evidence.private.v1`
- `nightwatch.private-artifact-policy.v1`
- `nightwatch.triage-compatibility.private.v1`

## 6. Minimization

- Algorithm: deterministic ddmin-style subsequence reduction followed by a
  deterministic one-deletion audit.
- Candidate authority: every candidate is made only from action occurrences
  already present in the original source-approved sequence. No new action,
  selector, route, request, or value can be introduced.
- Replay admission: DEV-only, auth-valid, outbound-policy-clean,
  source-approved safe-action catalog, `KNOWN_READ`/`LOCAL_ONLY`, route
  envelope, mutation/UNKNOWN tripwires, privacy policy, and zero safety vector.
- Exact anomaly identity: the candidate must reproduce the same sanitized
  anomaly fingerprint; a different failure is not a reproduction.
- Minimality guarantee: `1-MINIMAL` only after the complete one-deletion audit;
  otherwise `BOUNDED_MINIMAL`; no global minimum claim is made.
- Real DEV budget: one fresh exact replay plus at most four reduced candidate
  evaluations and five total replays (`REAL_DEV_MINIMIZATION_BUDGET`).
- Synthetic budget: 64 reduced candidates and 65 total replays.
- Result fields include original sequence, minimal reproducing sequence,
  removed actions, reproduction count, fingerprint, model/catalog/source
  versions, confidence, guarantee, and budget accounting.
- Natural real anomaly: none was admitted during this task, so no real DEV
  minimization was run and no product bug was manufactured.

## 7. Synthetic minimization and dossier matrix

The local matrix exercises:

- deterministic single-action UI failure;
- prefix-required and middle-action dependency failures;
- stateful action-order dependency and cycle/duplicate action occurrences;
- non-reproducible and flaky/transient outcomes;
- precondition and route divergence as `INVALID`, not product failure;
- non-monotonic and irreducible two-action failures;
- minimizable five-step failure;
- exact fingerprint mismatch, safety rejection, and budget exhaustion;
- API/protocol failure, shared browser/API failure, transient resource
  failure, known Nightwatch false positive, non-reproduced anomaly,
  source-correlated change, unrelated source change;
- privacy sentinel rejection, incomplete-write recovery state, and legacy
  Phase 2C/Phase 4/Phase 5 compatibility adapters.

## 8. Clustering, deduplication, differential, and source correlation

- Clustering model: exact stable fingerprint plus sanitized journey/envelope,
  oracle, route class, operation family, status class, content-type class,
  runtime category, structural state, failure action, source-impact region,
  and browser/API result class.
- Timing: bounded timing noise is excluded from identity; `TRANSIENT` is kept
  distinct so a transient resource symptom cannot over-merge with a stable
  product anomaly.
- Deduplication: one primary cluster/dossier with bounded occurrence run IDs;
  repeated overnight seeds contribute counts, not duplicate reports.
- Browser/API differential: `UI_FAILURE_API_PASS`,
  `BROWSER_API_FAILURE_AGREE`, `BROWSER_API_DIVERGE`, or `NOT_AVAILABLE`.
  It strengthens an application-layer discriminator only and always carries
  `rootCauseClaim: NONE`.
- Source correlation: Phase 3 dependency edges classify
  `DIRECT_CHANGE_RELEVANCE`, `SHARED_CHANGE_RELEVANCE`,
  `TRANSITIVE_CHANGE_RELEVANCE`, `NO_CURRENT_CHANGE_RELEVANCE`, or `UNKNOWN`.
  Source candidates are never called deployed causes; deployment status stays
  `DEPLOYMENT_STATUS_UNRESOLVED`.
- Source freshness: `SOURCE_CURRENT_LOCALLY`,
  `LOCAL_TRACKING_REF_ONLY`, `REMOTE_FRESHNESS_CONFIRMED`, or `UNKNOWN` only
  when supported by the input evidence.
- Relevant Alphaus before-state: a narrow read-only baseline was captured for
  seven source-relevant repositories. Branch, HEAD, tracking ref, and dirty
  counts were recorded; no cleanup, reset, stash, fetch, or write occurred.
  Existing dirty counts were not attributed to Nightwatch.

## 9. Fault boundary and confidence

- Boundaries: `AUTH`, `ROUTER`, `UI_COMPONENT`, `CLIENT_STATE`, `API_CLIENT`,
  `API_TRANSPORT`, `BACKEND_HANDLER`, `PROTOCOL`, `RESOURCE_LOADING`, and
  `UNKNOWN`.
- No `DATASTORE` boundary is emitted.
- Confidence is categorical (`HIGH`, `MEDIUM`, `LOW`, `UNRESOLVED`) and
  considers fresh-context reproduction, minimal-sequence reproduction,
  browser/API differential, source relevance, oracle reliability, safety, and
  known Nightwatch false-positive risk. No fake percentage is produced.
- Technical severity, confidence, and triage priority remain separate.

## 10. Private dossier, recipe, summaries, and storage

- Dossier schema: `nightwatch.bug-dossier.private.v1`.
- Dossier identity is deterministic from sanitized fingerprint, journey/API
  family, and schema; timestamps are not identity inputs.
- Dossier status is `INCOMPLETE` until packaging completes; writes are atomic,
  owner-readable only, and a partial write cannot become `READY`.
- Dossiers answer what failed, reproduction status/count, shortest approved
  path, app-layer boundary candidates, source candidates, alternatives ruled
  out, missing evidence, confidence, safety, privacy, and human verification.
- Human recipe uses approved action IDs and structural route/oracle classes;
  it excludes credentials, customer/account identifiers, names, costs, raw
  bodies, cookies, DOM, screenshots, and traces.
- `L4_DATASTORE = OUT_OF_SCOPE_BY_OWNER` is explicit in every dossier.
- Overnight summary includes runs, journeys/envelopes, seeds, passes, unique
  clusters, reproduced/non-reproduced transients, Nightwatch defects, top
  dossier IDs, coverage gaps, safety counters, privacy, and datastore scope.
- Morning brief ranks local dossiers by priority and exposes source areas and
  unresolved questions without external publication.
- Storage class: `OWNER_ONLY_LOCAL`; default root is outside the repository at
  the operator's local `.nightwatch/findings` namespace, mode 0700/0600,
  atomic writes. Injected temporary roots are test-only. Retention is bounded
  to 100 occurrence records, owner-controlled for unresolved findings, and
  does not auto-delete active findings.

## 11. False-positive and historical status

- Cataloged Nightwatch defects include expired-auth replay, context-only auth
  evidence, Vue `#app` lifecycle misunderstanding, navigation cancellation,
  policy-cancellation comparison, and stale selector/model state.
- Historical J2 font status: `L0_NOT_REPRODUCED`,
  `HISTORICAL_NOT_REPRODUCED`; it is not promoted to a product dossier.
- Historical malformed-JSON status: `UNKNOWN`/
  `HISTORICAL_ANOMALY_PRESENT` only unless a current deterministic run admits
  it; it is not automatically treated as a current product bug.

## 12. Safety, privacy, and publication ledger

- Production attempts: 0 in this task.
- Proxy violations: 0.
- Unknown destinations: 0.
- Unknown approvals: 0.
- Product mutations: 0.
- Action-caused `UNKNOWN`: 0.
- Database queries: 0; Phase 6 is permanently out of scope.
- Infrastructure queries: 0 in this task.
- External publication attempts: 0.
- Credentials persisted: 0; credential provider was not printed, copied, or
  passed to browser automation/MCP.
- Raw customer values, account identifiers, costs, tokens, cookies, request or
  response bodies, DOM, screenshots, and authenticated traces in new dossiers:
  0.
- Privacy tests planted customer/account/email/cost/token sentinels and
  required zero occurrences in generated dossier output; PASS.
- Existing production containment was not weakened. The historical Phase 1.1
  accidental production contact remains documented and is not rewritten as
  “never contacted production.”

## 13. Validation

- Focused owner-policy/Phase 6/private-triage suite: 27/27 PASS.
- Full Playwright suite: 361/361 PASS after the final synthetic-matrix tests.
- TypeScript (`npm run typecheck` / `npx tsc --noEmit`): PASS.
- `npm run agent:check`: PASS; final closure must be `SYNCED` or an approved
  documentation-only checkpoint advance.
- `git diff --check`: PASS.
- Alphaus repository integrity: PASS for the narrow read-only baseline; no
  Alphaus repository was modified, committed, cleaned, reset, or stashed.
- Nightwatch Git status before final closure: implementation checkpoint clean;
  only approved task/documentation files remain for the closure checkpoint.

## 14. Architecture and adversarial review

- Architecture review: PASS. The active stack is source intelligence → safe
  selection → contained DEV browser/API → replay → bounded minimization →
  sanitized evidence → private triage. There is no datastore branch.
- Adversarial review: PASS. Frozen operation classes fail before external
  callbacks; unknown policy classes fail closed; candidate actions cannot be
  introduced; fingerprints must match; preconditions/safety/privacy are gates;
  incomplete artifacts cannot be READY; source relevance is not root cause;
  AI is not an oracle; external publication is prohibited.
- Nightwatch defects found and repaired during implementation: synthetic
  fixture semantics, minimizer budget accounting, cluster feature privacy
  validation, transitive-source fixture linkage, private artifact status
  ordering, and the explicit all-datastore freeze regression. No product,
  Alphaus-source, infrastructure, or datastore defect was found.
- Remaining unresolved findings: no natural DEV product anomaly was available
  for bounded real minimization; deployment identity and datastore binding
  remain deliberately unresolved/out of scope; optional contained MCP
  cross-check remains deferred and non-blocking.

## 15. Acceptance verdict

All local acceptance criteria are met: Phase 6 is durably frozen rather than
completed; its live path is blocked; the new private minimization/triage task,
schemas, tests, compatibility adapters, safety boundary, privacy policy,
source correlation, dossiers, summaries, and clean recovery state exist; full
validation passes; Alphaus repositories remain read-only and unchanged; and no
external action is required.

Final verdict: pending the final documentation-only closure commit, then
`COMPLETE`.

## 16. Recommended next private/local task

Expand the owner-private synthetic corpus and, only when a naturally admitted
contained DEV anomaly appears, consume the existing strict real minimization
budget and enrich local dossier ranking. Do not return to Phase 6 datastore,
cloud, deployment, or infrastructure work.
