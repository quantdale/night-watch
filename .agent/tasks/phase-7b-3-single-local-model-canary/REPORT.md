# NIGHTWATCH PHASE 7B.3 — SINGLE BOUNDED LOCAL-MODEL CANARY

## Status

HARNESS: PASS. REAL LOCAL-MODEL CANARY: NOT_RUN —
`LOCAL_RUNTIME_NOT_AVAILABLE`. No real provider call was made.

## Stable anchors

- Starting SHA: `18bc3fa8f64322b8b43c9ccd0b07b182668d1932`.
- Historical predecessor implementation/substantive anchor:
  `3916594f6e947f7f4665b23751c1d3ec03f5928b`.
- Harness implementation/executable source SHA:
  `5e7bad758efa7e5d87610c8b7878f6690bb0b821`.
- Documentation checkpoint before this closure:
  `a603c7db90172967631b8d3b09770761d46ac38e`.
- Live HEAD authority: discover local Git `HEAD` and `origin/main`.

## Harness result

The fixed fixture/controller, thin CLI, strict endpoint/model parser,
source-scoped hardening, deterministic CI step, and tests are complete.

- Fixture version: `nightwatch.local-model-canary-input.private.v1`.
- Fixture digest:
  `sha256:34db4fb404008607b0ab4980155b17d7e36540107fec5163888803ae997263c6`.
- Operation: `BUG_CANDIDATE` only.
- Input: synthetic L2 only; PASS privacy vector and zero safety vector.
- Structural call budget: one provider call maximum, zero oracle calls, zero
  retries.
- Persistence: no `AiReviewArtifactStore`; `artifactPath` is required to be
  `null`; model prose is never printed or persisted.
- CI: exact `Nightwatch hardening` run `31807365893` passed at the harness
  source SHA, including `Phase 7B.3 synthetic local-model canary harness`.

## Real canary result

`LOCAL_MODEL_CANARY_NOT_RUN / LOCAL_RUNTIME_NOT_AVAILABLE`.

Bounded discovery used only known runtime command existence checks, filtered
known-runtime process metadata, and repository-scoped configuration search. No
supported `ollama`, `llama-server`, `lms`, `lm-studio`, `local-ai`, or `vllm`
executable was available. No compatible preexisting runtime/model or explicit
endpoint/model configuration could be proven. No port scan, arbitrary
localhost probe, secret-environment read, runtime startup, installation,
download, cloud fallback, or model invocation occurred.

## Sanitized canary record

| Field | Result |
|---|---|
| Runtime class / identity | `NONE_DETECTED` / none |
| Runtime preexisting / task-started | `NONE_IDENTIFIED` / not started |
| Model identifier / presence proof | not proven / unavailable |
| Endpoint class | not run; no endpoint established |
| Provider class | not entered |
| Provider calls / loopback model requests | `0 / 0` |
| External AI requests | `0` |
| Result class | `NOT_RUN_RUNTIME_ABSENT` |
| Response digest / draft ID | not applicable |
| Artifact schema / evidence level | not generated / fixture L2 only |
| Reference validation / privacy validation | deterministic harness PASS / no real output |
| Artifact path | `NONE` |
| Raw model prose persisted | `0` |
| Private artifact writes | `0` |
| Owner-review writes | `0` |
| Product contacts (DEV/NEXT/prod) | `0 / 0 / 0` |
| Database / infrastructure operations | `0 / 0` |
| Publication / Git runtime writes | `0 / 0` |
| AI tool/function executions | `0` |
| Runtime cleanup | not applicable |

## Validation ledger

- `npm run typecheck`: PASS.
- `npm run hardening:check`: PASS.
- Focused local-canary tests: `10/10` PASS.
- Combined AI/loopback/canary tests: `78/78` PASS.
- Owner-provenance tests: `91/91` PASS.
- Agent-state tests: `32/32` PASS.
- Synthetic campaign: `27/27` PASS.
- Full deterministic Playwright suite: `523/523` PASS.
- Isolated full-history checkout: PASS — `npm ci --ignore-scripts`, typecheck,
  hardening, combined AI/loopback/canary `78/78`, owner-provenance `91/91`,
  agent-state `32/32`, campaign `27/27`, `agent:check`, and diff check.
- `git diff --check`: PASS.
- Privacy/capability review: PASS — no secrets, findings, raw model output,
  product imports, generic canary HTTP, process lifecycle, or publication/Git
  runtime paths in the new canary surface.
- Full deterministic CI: PASS — run `31807365893`, implementation SHA
  `5e7bad758efa7e5d87610c8b7878f6690bb0b821`.

## Architecture review

- Arbitrary prompt text: NO; the fixture is repository-defined.
- Real/private finding read or owner-finding enumeration: NO.
- More than one provider call or retry: NO; one structural review call is the
  maximum and the controller has no retry path.
- Oracle suggestion or owner review: NO.
- AI prose persistence: NO; no artifact store is constructed.
- Tools/functions/browser/campaign/auth/product paths: NO.
- Non-loopback host, HTTPS, cloud fallback, credentials, or API-key reads: NO.
- Model installation/download or unsafe runtime startup: NO; no lifecycle code
  is present and discovery found no runtime.
- Publication or Git mutation at runtime: NO.
- Evidence promotion or Phase 8 authorization from a PASS: NO; Phase 8 remains
  `NOT_STARTED`.

## Adversarial review

Deterministic coverage rejects HTTPS, LAN, `0.0.0.0`, missing-port, wrong-path,
credentialed, query, and fragment endpoints; invalid model identifiers and
uncapped timeouts; arbitrary prompt/file/input options; oversized input/output;
timeouts; unavailable providers; malformed/non-JSON output; invented
evidence/source references; owner-approval, tool, publication, shell, Phase 6,
and Phase 8 control language; second-call and retry attempts; and artifact
store injection. The loopback fixture proves one request, fixed path,
`stream:false`, no tools/functions, bounded body, expected model, and no
retry. Invalid CLI endpoints fail before network contact and sanitized errors
do not echo the endpoint or response body.

## Remaining debt and recommended next task

No automatic next task is authorized. If the owner later separately provides
safe evidence of an already-installed compatible local runtime/model and exact
loopback endpoint, a new bounded run may execute the one canary. It must not
install/download anything, use real evidence, or start Phase 8. Phase 8 remains
`NOT_STARTED`.

## Acceptance verdict

HARNESS: PASS.

REAL LOCAL-MODEL CANARY: NOT_RUN.

Reason: `LOCAL_MODEL_CANARY_NOT_RUN / LOCAL_RUNTIME_NOT_AVAILABLE`.

Provider calls: `0`; retry count: `0`; raw output persisted: `0`; external AI:
`0`; product contacts: `0`.
