# NIGHTWATCH PHASE 8A — EVALUATED SELF-DEVELOPMENT SANDBOX FOUNDATION

## Status

Implementation, local regression, isolated full-history validation, and scoped
architecture review are complete. Documentation closure is in progress; the
exact final GitHub hardening workflow and its Phase 8A step remain to be
observed after the documentation checkpoint push.

## Stable anchors

- Starting SHA: `9cb70d2b74075f731f787884cd1837e7b36fcf48`.
- Validated implementation SHA: `d2a2978ede7c29d04e95f1625a736ce7c26004f9`.
- Substantive checkpoint: `d2a2978ede7c29d04e95f1625a736ce7c26004f9`.
- Documentation checkpoint before this closure: the implementation
  checkpoint; the final documentation descendant remains Git-discovered.
- Live HEAD authority: discover local Git `HEAD` and `origin/main`.

Phase 7B.3 remains `COMPLETE — HARNESS PASS; REAL CANARY NOT_RUN /
LOCAL_RUNTIME_NOT_AVAILABLE`. Phase 8 is `IN_PROGRESS`; Phase 8A is the only
authorized slice; Phase 8B is `NOT_STARTED`. Phase 6 remains
`FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.

## Owner authorization and trust model

The durable owner instruction is `PROCEED WITH THE NEXT PHASE.` It authorizes
Phase 8A only. The proposer is untrusted declarative data. Deterministic
Nightwatch evaluator code owns validation, scope, safety, privacy, duplicate,
budget, execution, regression, and coverage truth. No adopter is implemented.

```
untrusted proposal → strict DTO → fixed local registries
→ deterministic evaluation → private sanitized result → STOP
```

## Candidate and evaluation contracts

- Candidate schema: `nightwatch.selfdev-candidate.private.v1`.
- Evaluation schema: `nightwatch.selfdev-evaluation.private.v1`.
- Candidate kind: `SYNTHETIC_REGRESSION_CASE` only; it is data, not code.
- Proposer class: `SYNTHETIC_DETERMINISTIC` only.
- Fixture target: `LOCAL_SYNTHETIC` only.
- Candidate IDs are `candidate:<sha256>` over canonical stable semantic fields;
  timestamps, filesystem paths, and randomness are excluded.
- Unknown exact-key fields, code/source/patch/diff/path/command/shell/script/
  URL/endpoint/prompt/model/tool/function/Git/output-path fields, unsafe
  fixtures, unknown actions/assertions, arbitrary expressions, fake coverage,
  malformed IDs, oversized values, and nonzero safety declarations reject
  before execution.
- Passing class: `EVALUATED_PASS_NOT_ADOPTED`.
- Adoption: `NOT_AUTHORIZED_PHASE_8A` / authority `NONE`.
- Publication: `PROHIBITED` / authority `NONE`.

## Budgets and deterministic gates

- Candidates per session: 3.
- Actions per candidate: 8.
- Assertions per candidate: 8.
- Candidate evaluation runtime: 30 seconds.
- Total synthetic session runtime: 120 seconds.
- Duplicate detection uses semantic identity and fixed equivalent
  action/assertion fingerprints; it does not scrape broad source state.
- Coverage delta is computed from fixed structural fixture evidence. Candidate
  claims and subjective/AI scores do not determine it.

The full synthetic matrix produced: valid candidate A →
`EVALUATED_PASS_NOT_ADOPTED` with positive coverage; timestamp-equivalent
candidate B → `REJECTED_DUPLICATE`; safety-escalating candidate C →
`REJECTED_SAFETY`. All three had zero source/Git/external side-effect
counters.

## Authority review

- Real model/provider authority: NONE; no model was installed, downloaded,
  called, or reused from Phase 7B.
- Source mutation authority: NONE at runtime; no candidate code or patch class
  exists and no repository source writer is reachable.
- Git runtime authority: NONE; no Git command is present in selfdev runtime.
- Alphaus write authority: NONE; sibling repositories were not modified.
- Product/browser/auth/DEV/NEXT/production authority: NONE.
- Database/infrastructure authority: NONE; Phase 6 owner freeze remains.
- Publication authority: NONE; results are private local evidence only.
- Oracle registration authority: NONE; structural oracle metadata is fixed and
  no executable/generated oracle is registered.
- Evidence/admission authority: NONE; selfdev results cannot alter evidence
  level, campaign outcome, anomaly admission, source relevance, fault
  boundary, existing oracle truth, or AI owner-review drafts.
- Automatic adoption or Phase 8B trigger: NONE.

The source-scoped hardening check verifies no AI-review/campaign/oracle,
browser/auth/product/Phase 6/data/infrastructure/network/Git/child-process or
filesystem-write import/path enters `src/core/selfDev`. It also verifies the
candidate field denylist, sole proposer, explicit action/assertion registries,
private namespace, and no-adoption result constants.

## Private artifact and privacy result

`SelfDevPrivateArtifactStore` reuses the hardened owner-only immutable private
store under the separate `self-development` namespace. Persisted content is a
sanitized bounded session result, not a finding, morning brief, AI draft,
source patch, or public artifact. Exact duplicate publication is read-back
verified; conflicting bytes fail closed. Synthetic CLI/e2e persistence passed.

Privacy scan: PASS. No credential, token, cookie, customer identity, email,
AWS account, payer, billing group, invoice, cost, ticket, raw body/DOM,
screenshot, trace, authenticated state, or real model output entered source,
task state, project docs, or committed artifacts.

## Validation ledger

- TypeScript: PASS (`npm run typecheck`).
- Hardening: PASS (`npm run hardening:check`).
- Phase 8A focused suite: PASS, 23/23.
- Candidate schema suite included all forbidden-field runtime rejections.
- Owner policy: PASS, 2/2.
- Private artifact atomic regression: PASS, 8/8.
- Agent-state fixture suite: PASS, 32/32.
- Existing AI/canary boundary suite: PASS, 98/98.
- Existing owner-provenance suite: PASS, 91/91.
- Synthetic campaign: PASS, 27/27.
- Full current Playwright suite: PASS, 546/546.
- Synthetic CLI help and A/B/C matrix: PASS; private sanitized result only.
- `npm run agent:check`: PASS with the expected stale-baseline warning before
  the actual implementation anchor was recorded.
- `git diff --check`: PASS.
- Scoped secret-shape/privacy scan: PASS.

## Isolated clean checkout

A fresh full-history clone at `d2a2978ede7c29d04e95f1625a736ce7c26004f9`
passed `npm ci --ignore-scripts`, typecheck, hardening, Phase 8A 23/23,
AI/canary/provenance 106/106, agent-state 32/32, synthetic campaign 27/27,
`agent:check`, and `git diff --check`. The clone was disposable and outside
the canonical workspace; it used synthetic fixtures only.

## Safety vector

For Phase 8A runtime evaluation: DEV contacts 0; NEXT contacts 0; production
contacts 0; product mutations 0; database queries 0; infrastructure queries 0;
external AI calls 0; real model calls 0; publication 0; runtime Git writes 0;
Nightwatch runtime source writes 0; Alphaus writes 0.

## Remaining debt and verdict

Phase 8B controlled source adoption, real-model proposers, executable oracle
generation, and any broader self-development capability remain deferred and
require new explicit authorization. The acceptance verdict is pending only
the exact final remote CI observation; no implementation blocker remains.
