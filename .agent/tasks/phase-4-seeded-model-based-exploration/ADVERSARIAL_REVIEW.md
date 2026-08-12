# Phase 4 Pre-Real Adversarial Review

Review status: `PASS` — 2026-08-12 pre-real review.

This review is completed against the frozen Phase 4 SPEC and the implementation
checkpoint `8916e91ca3f983808f1385d27bd79e2aa54c4d5e`. It is a gate, not a
relaxation of the catalog.

| question | result | evidence / boundary |
|---|---|---|
| Is every admitted action source-proven? | PASS | `ACTIONS.md` records source file, symbol, SHA, locator, effect, and verdict for all 12 catalog actions. |
| Was a read-looking control admitted without semantic proof? | PASS | Edit, add, search, columns, row detail, pagination, and stale J3 vendor candidates are rejected. |
| Can an action persist a preference? | PASS | Search and visible-column controls are rejected; admitted actions are local selector state, local sort, trusted read, or return-anchor. |
| Can an admitted action trigger mutation? | PASS | Catalog forbids known mutation families; engine independently stops on `KNOWN_MUTATION`. |
| Can an admitted action cause UNKNOWN traffic? | PASS | Engine stops on action-attributed UNKNOWN; the hostile fixture tripwire is covered. |
| Are selectors customer-independent? | PASS | Only source-defined surface/option/column locators; no text discovery, row IDs, nth-child, or customer values. |
| Can a route escape the envelope? | PASS | Engine compares observed route class with both envelope and action expectation and stops on escape. |
| Can a seed override safety? | PASS | Safety and semantic filters precede canonical ordering and SplitMix64 choice. |
| Is RNG deterministic? | PASS | SplitMix64 v1, canonical uint64 seed format, derived-seed function, and same-seed tests. |
| Is candidate ordering deterministic? | PASS | Action IDs are canonical-sorted before eligibility and seeded tie-breaking. |
| Do state IDs contain customer data? | PASS | State schema is enum/boolean metadata only; privacy guard and identifier tests reject sensitive keys/values. |
| Can privacy normalization collapse meaningful states? | REVIEWED | State includes route, surface, structural flags, safe view enums, semantic families, auth class, terminal flags, and approved availability. Customer-specific distinctions remain intentionally out of scope. |
| Can cycles run indefinitely? | PASS | Depth, action, state, transition, route-change, duration, and visit limits are enforced. |
| Can the budget be bypassed? | PASS | Engine checks all declared limits before choice and emits precise termination reasons. |
| Does a fresh context reset state? | PASS | Real runner creates a fresh BrowserContext for every fixed seed and replay; no manual reverse path is used. |
| Is auth checked for every real context? | PASS | Existing boolean auth/readiness gate is required before context creation and each context uses the established external state path without reading its contents. |
| Could expired auth look like product divergence? | PASS | Auth/readiness failures terminate as `AUTH_INVALID`; they are not admitted as oracle anomalies. |
| Is the Phase 2C oracle engine duplicated? | PASS | The browser adapter reports through existing run/network/oracle infrastructure; Phase 4 only adds exploration state and transition evaluation. |
| Is host policy weakened? | PASS | Existing outbound policy remains authoritative; new hosts block and stop, with no wildcard/dynamic approval. |
| Are traces, screenshots, bodies, or DOM persisted? | PASS | Runner writes metadata-only JSON; trace/screenshot capture remains disabled. |
| Is arbitrary free-text fuzzing present? | PASS | No generic typing primitive or free-text domain exists in the catalog or planner. |
| Is Phase 3 priority able to make unsafe actions eligible? | PASS | Phase 3 is provenance/staleness/priority input only; catalog semantic verdict remains authoritative. |
| Can stale source semantics be used silently? | PASS | Catalog carries source SHA/freshness; stale model actions are excluded and J3 vendor switching is rejected. |
| Are passive UNKNOWN and action-caused UNKNOWN distinct? | PASS | Existing observer classification is preserved; return-anchor bootstrap traffic is passive, while intentional unknown is a hard stop. |
| Does exact replay substitute an action? | PASS | Strict replay executes recorded action IDs only and stops on precondition divergence. |
| Can Phase 4 begin Phase 5 functionality? | PASS | No Oops/API generation, datastore integration, AI planner, or self-development loop is present. |

## Validation evidence

- focused Phase 4 matrix: 16/16 passed;
- full Nightwatch Playwright suite: 308/308 passed;
- TypeScript: PASS;
- diff check: PASS;
- inherited safety, semantic, oracle, replay, privacy, and Phase 3 suites:
  included in the 308-test result and PASS;
- authenticated traces/screenshots/bodies/DOM: not enabled or persisted.

## Gate decision

`PHASE_4_PRE_REAL_EXPLORATION_READY` — all review questions and local gates
pass. The fixed serial DEV corpus remains bounded by the frozen SPEC and must
be recorded in STATE before the first context.

## DEV auto-login / MCP resume checkpoint

Review status: `PASS` — implementation checkpoint `5e6aeff9fed37df0bc11f376d0d346d1107e1e54`.

| threat / question | mitigation / result |
|---|---|
| `SECRET_IN_SOURCE`, Git, task docs, fixtures, or artifacts? | PASS — the provider stores only outside the workspace; tests use synthetic values; no real credential value is present in Nightwatch artifacts or task state. |
| Shell history or process argv exposure? | PASS — `npm run auth:configure` accepts no credential arguments and reads both fields from hidden TTY input; no credential environment fallback exists. |
| MCP transcript exposure? | PASS — `MCP_SECRET_INPUT_ALLOWED=false`; login uses in-process Playwright and no MCP fill/type/evaluate operation receives a credential. |
| Console, network, exception, or storage-state report exposure? | PASS — recorder is metadata-first; raw credential values never enter recorder/event data; failure categories are sanitized; state is external by path only. |
| DEV-only retrieval ordering? | PASS — exact target, allowlist, production-deny canary, proxy health, browser containment, and privacy checks run before provider retrieval; a production target test records zero provider calls. |
| Existing auth reuse and bounded refresh? | PASS — valid state is reused; refresh performs one source-backed submit, no retry loop, and validates a pending state in a fresh guarded context before atomic replacement. |
| MFA boundary and lockout protection? | PASS — MFA enters `HUMAN_MFA_WAIT`; no OTP bypass/retrieval; a rejected form stops without retry. |
| Personal Chrome or containment bypass through MCP? | PASS — no dedicated Nightwatch-owned loopback CDP launcher is proven; real authenticated MCP attachment is disabled and Playwright remains primary. |
| MCP DOM/screenshot/heap/raw-body leak? | PASS — authenticated screenshots, heap snapshots, broad snapshots/evaluations, and raw request inspection are prohibited; MCP is optional. |
| AUTH_SESSION_CREATION widening product safety? | PASS — auth session creation is separately recorded with `productStateMutation=false`; the Phase 4 product catalog remains passive/read-only. |

Synthetic validation at this checkpoint: focused auth/storage/MCP suite 32/32,
full suite 317/317, TypeScript PASS, diff check PASS. `list_pages` was checked
read-only and remained unavailable at `127.0.0.1:9222`; no MCP browser action
or authenticated data was accessed. The checkpoint is ready for the one-time
hidden local DEV credential configuration; Phase 5 remains unstarted.

## Post-real closure review

Review status: `PASS` — final implementation
`6bc3cfcebff749d477e3b65f8642db3ecfb6dd8b`, 2026-08-12.

The designated DEV credential was configured only through the hidden local
workflow. The provider remained external and owner-only; the real value was
not copied into Nightwatch files, task state, process arguments, MCP calls, or
evidence. The pre-retrieval DEV gate remained mandatory, valid external auth
state was reused for the final corpus, and the one successful refresh was
validated before atomic replacement. Two bounded refresh submissions were
made across the repaired failed attempt and the successful attempt; no retry
loop or MFA bypass occurred.

The final frozen matrix completed six fresh contexts. Every intentional action
was selected from the existing source-backed catalog, and the safety vector
was zero for production, proxy, unknown destinations/approvals, mutations,
action-caused UNKNOWN, and DB queries. Two selected actions ended in sanitized
runtime failure with no safety consequence; no product anomaly was admitted.
No final sequence was nontrivial, so the SPEC's conditional real exact replay
was not scheduled. Synthetic exact replay and no-substitution tests passed.

Chrome DevTools MCP discovery remains durable at 29 tools, but the actual
loopback endpoint was unavailable. Real authenticated attachment was therefore
disabled, `MCP_SECRET_INPUT_ALLOWED=false` remained enforced, and Playwright
was the sole executor. No MCP screenshot, heap, snapshot, broad evaluation,
raw network request, credential input, or unapproved action occurred. The
absence of MCP cross-checks is recorded as optional observation unavailable,
not as a Phase 4 failure.

Final validation: TypeScript PASS; focused auth/security suite 48/48; focused
Phase 4 model suite 16/16; full Playwright suite 318/318; final fixed corpus
6/6; agent continuity PASS; diff check PASS; privacy/sentinel scan PASS.
