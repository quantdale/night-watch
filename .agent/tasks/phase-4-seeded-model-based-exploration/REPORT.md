# NIGHTWATCH PHASE 4 — SEEDED / MODEL-BASED EXPLORATION COMPLETE

Status: `COMPLETE` — the frozen Phase 4 corpus, secure DEV authentication
enabler, MCP safety review, validation, and durable handoff all passed.

- Starting SHA: `acdb4a27a953dbff2c3408815efe634468d4ad20`
- Validated Phase 3 implementation: `8d72ec9159cba450e4e9d763d0f9e9d0ba7a493b`
- Phase 3 checkpoint: `058a1ab4168324f346bd80f8fd3c2c3edec45c77`
- Phase 4 implementation SHA: `6bc3cfcebff749d477e3b65f8642db3ecfb6dd8b`
- Phase 4 code checkpoint: `6bc3cfcebff749d477e3b65f8642db3ecfb6dd8b`
- Phase 5: `NOT STARTED`

## Closure verdict

The existing Phase 4 SPEC acceptance criteria pass. The six predeclared real
DEV seeds ran serially in fresh BrowserContexts under the existing proxy,
production deny, semantic action catalog, model, mutation tripwire, and
metadata-first evidence policy. No product mutation, production attempt,
proxy violation, unknown destination/approval, action-caused UNKNOWN, or DB
query occurred.

The real corpus did not produce a nontrivial sequence: each seed selected one
source-approved action and then terminated. Therefore the SPEC's conditional
exact-replay requirement was not activated. Synthetic deterministic and strict
exact-replay coverage passed, and no real replay was silently substituted for a
nontrivial sequence.

Two source-approved actions ended in sanitized `RUNTIME_FAILURE` after their
selection; they produced no safety event, no product anomaly admission, and no
retry. The other four contexts ended at `SAFE_FRONTIER_EXHAUSTED`. This is
recorded as a bounded runtime anomaly, not hidden as a successful product
finding.

## Secure DEV auto-login

- Credential provider: narrow auth-only `external-owner-only-file` provider.
- DEV-only gate: exact DEV environment and approved UI/auth/API destinations,
  production-deny canary, healthy mandatory proxy, browser containment, and
  authenticated metadata-only privacy mode are all required before provider
  retrieval. Non-DEV rejection occurs before secret access.
- Configuration: `npm run auth:configure` completed once through hidden,
  non-echoing username/password prompts. The recorded result contains only
  `configured=true`, provider/environment/account alias, and valid permissions.
- Secret storage location class: external owner-only local Nightwatch secret
  namespace under `$HOME/.nightwatch/secrets/`; no secret contents or identity
  values are in Git, task state, logs, evidence, argv, or MCP calls.
- Auth-state storage: separate external owner-only storage-state namespace;
  valid state reuse remains preferred over login.
- Successful auth capture: `nightwatch-20260812T120534Z-b90c`.
- Refresh accounting: two bounded refresh attempts after configuration, two
  credential submissions, one successful capture/atomic replacement, and one
  sanitized pre-capture failure. The final six-context corpus performed zero
  additional refreshes because valid external state was reused.
- MFA: `0`; no second-factor bypass or automated OTP retrieval occurred.
- Capture semantics: `AUTH_SESSION_CREATION` with
  `productStateMutation=false`; authentication did not widen the product
  action catalog.
- Atomic replacement: pending state was validated for DEV provenance, token
  validity, domain/path applicability, page readability, and app/environment
  semantics before replacement; failed validation preserves the prior capture.
- Lockout protection: at most one credential submission per refresh operation;
  no indefinite retry loop.

## Chrome DevTools MCP

- Server: `mcp__chrome_devtools`.
- Discovered tools: `29`, preserved in STATE. Discovery was read-only.
- Attachment: `false`; the loopback endpoint at `127.0.0.1:9222` was
  unavailable. Real attachment remains explicitly disabled because a dedicated
  Nightwatch-owned CDP browser with proven containment was not available.
- Ownership: Nightwatch/Playwright remained the sole browser lifecycle and
  action owner; MCP was optional and had no control transitions.
- Remote debugging: no browser was launched or exposed; the required endpoint
  is loopback-only when present.
- MCP credential-input policy: `MCP_SECRET_INPUT_ALLOWED=false`. No real
  password was sent through MCP `fill`, `fill_form`, `type_text`, or
  `evaluate_script`.
- Network cross-check: `NOT_AVAILABLE` — no safe MCP attachment; Nightwatch's
  sanitized network attribution remains authoritative.
- Console/runtime cross-check: `NOT_AVAILABLE` — no safe MCP attachment;
  Nightwatch's categorized runtime evidence remains authoritative.
- Privacy: `PASS`. No MCP page, DOM, screenshot, trace, heap, request body,
  response body, header, cookie, or credential was accessed.
- Explicitly prohibited for authenticated real work: credential-input tools,
  broad `take_snapshot`, `take_screenshot`, `take_heapsnapshot`, raw
  `get_network_request`, arbitrary `evaluate_script`, and any unapproved
  click/fill/navigation. `lighthouse_audit`, `upload_file`, and `drag` were not
  used.
- Phase 4 remains fully functional without MCP: `YES`.

## Real Phase 4 corpus

Frozen catalog fingerprint:
`catalog_5aa12cbf727d4935abf186b675d132ad1b4763e00785995763a501d517443a2a`

Budget: six seeds, max six actions/depth, 12 states, 12 transitions, four
route changes, 120 seconds/context, and at most three conditional replay
contexts. All contexts were fresh, used the fixed model/catalog, and recorded
`REUSED_EXTERNAL_STATE`, `autoRefresh=false`, `mfaOccurred=false`, and
`mcpAttached=false`.

| run ID | envelope / seed | action | result | states / transitions |
|---|---|---|---|---|
| `nightwatch-20260812T121232Z-2e48-E1-J1-payer-exchange-0` | E1/J1 / `0x0000000000000101` | `p4.j1.return-anchor` | `SAFE_FRONTIER_EXHAUSTED` | 2 / 1 |
| `nightwatch-20260812T121232Z-2e48-E1-J1-payer-exchange-1` | E1/J1 / `0x0000000000000102` | `p4.j1.vendor-local.azure` | `RUNTIME_FAILURE` | 2 / 1 |
| `nightwatch-20260812T121232Z-2e48-E2-J2-common-exchange-0` | E2/J2 / `0x0000000000000201` | `p4.j2.vendor-read.aws` | `RUNTIME_FAILURE` | 2 / 1 |
| `nightwatch-20260812T121232Z-2e48-E2-J2-common-exchange-1` | E2/J2 / `0x0000000000000202` | `p4.j2.return-anchor` | `SAFE_FRONTIER_EXHAUSTED` | 2 / 1 |
| `nightwatch-20260812T121232Z-2e48-E3-J3-account-inventory-0` | E3/J3 / `0x0000000000000301` | `p4.j3.sort-billinggroup` | `SAFE_FRONTIER_EXHAUSTED` | 2 / 1 |
| `nightwatch-20260812T121232Z-2e48-E3-J3-account-inventory-1` | E3/J3 / `0x0000000000000302` | `p4.j3.sort-billinggroup` | `SAFE_FRONTIER_EXHAUSTED` | 2 / 1 |

State and transition identifiers from the final matrix:

- E1/J1 `0101`: states
  `state_9e2b8ad83be91c6edf8d1fad68377e96cc56d19a6ce293902e99d57284dbfee7`
  → `state_02cec5dd873e1b67ceafeb3391f24544f28e337921d03cb1d6d64b9af8a29a75`;
  transition `transition_e7dbc76b7b56d832af649e773c91e1ad5a4ae0a4d094e6e364534bd6ad88e715`.
- E1/J1 `0102`: states
  `state_9e2b8ad83be91c6edf8d1fad68377e96cc56d19a6ce293902e99d57284dbfee7`
  → `state_21bc0c6dcb0ad4c870b8eac6903c90868be5174bf65f97e273f4c8c5b6b2dcae`;
  transition `transition_4aa9b6a86d48ce77b19289174d9298ce21c8d74e293bdf8da3ab3f5c46d4c29f`.
- E2/J2 `0201`: states
  `state_39c233d5a46b08babdcc885dbe116e3abc4bab68440d103499d3cf75e6f25787`
  → `state_1695eeb3b60694ec7f7b49dba190226ee80337f21b9682de2c0ee02151b22150`;
  transition `transition_b75419fdd03065010146d1706d06f9fa39bed4e50fc2fa75fa5d4371797714a5`.
- E2/J2 `0202`: states
  `state_39c233d5a46b08babdcc885dbe116e3abc4bab68440d103499d3cf75e6f25787`
  → `state_34d8e8f5c8004d6599c142ab8aaa0bea9398c796e5426b595318f28148a1681f`;
  transition `transition_a4001006c648de5a01a5c0e9adb98721aecc52dd438db08fb546bf46e1a5550d`.
- E3/J3 `0301` and `0302`: shared states
  `state_1118841a72bde72edb56ca23fb8254e312e54a3b68d3d2882350d582597f0aa0`
  → `state_9e9f8e0e7421a1ab0cc68437386af48ed434253f91479c42f2e8a958cedeb8d7`;
  transition `transition_4d31df444d030117bbc0d969e94bf10b39a0956957c9ed817e3ed55594d2aad0`.

Exact replay IDs: none. All six final `plannedActions` arrays had length one;
the frozen SPEC schedules exact replay only after a nontrivial sequence.
Synthetic exact replay and no-substitution behavior passed the Phase 4 model
tests.

Safety vector for every real record:

`productionAttempts=0, proxyViolations=0, unknownDestinations=0,
unknownApprovals=0, knownMutations=0, actionCausedUnknown=0, dbQueries=0`.

Privacy: `PASS`; authenticated traces and screenshots were disabled, and
evidence remained metadata-first.

## Threat-model closure

`SECRET_IN_SOURCE`, `SECRET_IN_GIT`, `SECRET_IN_SHELL_HISTORY`,
`SECRET_IN_PROCESS_ARGS`, `SECRET_IN_MCP_TRANSCRIPT`, `SECRET_IN_CONSOLE`,
`SECRET_IN_NETWORK_EVIDENCE`, `SECRET_IN_EXCEPTION`, and
`SECRET_IN_STORAGE_STATE_REPORTING`: mitigated by hidden interactive input,
external owner-only storage, narrow auth-only retrieval, sanitized failure
categories, no credential-bearing evidence objects, and
`MCP_SECRET_INPUT_ALLOWED=false`.

`MCP_ATTACHES_PERSONAL_BROWSER`, `MCP_BYPASSES_PROXY`,
`MCP_NAVIGATES_PRODUCTION`, `MCP_ARBITRARY_CLICK`, `MCP_DOM_DATA_LEAK`, and
`MCP_SCREENSHOT_LEAK`: prevented by disabling real MCP attachment when a
dedicated contained browser could not be proven; Playwright remained the sole
executor and the existing Nightwatch policy remained authoritative.

`ACCOUNT_LOCKOUT`, `MFA_BYPASS`: mitigated by one bounded submission per
refresh, stop-on-rejection, no OTP retrieval, and `MFA count=0`.

Final adversarial answers: login was DEV-only; secret retrieval was gated;
the real secret is absent from Git/task state/argv/evidence; the provider is
narrow and owner-only; replacement is atomic; MFA was preserved; MCP did not
attach, control, or introduce an unrecorded transition; all six contexts were
fresh and within budget; no Phase 5 work started.

## Validation and handoff

- `npx tsc --noEmit`: PASS.
- Focused credential/auth/storage/containment/MCP suite: 48 passed.
- Focused Phase 4 exploration model suite: 16 passed.
- `npx playwright test --project=nightwatch --reporter=line`: 318 passed.
- Final fixed `npm run explore:phase4 -- --env=dev`: 6/6 contexts completed.
- `npm run agent:check`: PASS after closure documentation, with only the
  expected approved-document checkpoint warning while the clean handoff SHA
  is recorded.
- `git diff --check`: PASS.
- Fake-secret/sentinel artifact scan and structural secret/argv scans: PASS.
- Alphaus repositories: read-only integrity preserved; no Alphaus repository
  was modified.
- Nightwatch: clean HEAD at final handoff; only Nightwatch was committed.

Recommended next task only: `PHASE 5 — OOPS + API GENERATION / EXPANSION`.
Do not start it from this task.
