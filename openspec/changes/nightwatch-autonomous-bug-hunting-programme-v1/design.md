# Design — autonomous bug-hunting programme

## Principle

The model decides what is worth investigating. Nightwatch decides what the
model is allowed to do.

## Frozen protocol

`src/core/agentProtocol/` is the only shared type authority for Wave 1+.
Lanes import it and do not fork it.

- Intents: CALL_TOOL, FORM_HYPOTHESIS, PROPOSE_CANDIDATE, REJECT_CANDIDATE,
  REPLAN, PAUSE, CANCEL, TERMINATE.
- Unsafe kinds (SHELL, GIT_MUTATION, RAW_PLAYWRIGHT, RAW_NETWORK, …) reject.
- Tools: thirteen catalog ids, each with authorization class, environment,
  network contact, and mutation=NONE.
- ReasonerDriver: CLI-first, structured JSON, byte caps, timeout, fail
  classes for malformed/garbage/oversize/crash/secret-echo.
- Runtime: PLAN→OBSERVE→ANALYZE→HYPOTHESIZE→VERIFY→TRIAGE→REPLAN with
  checkpoint/resume and budget ceilings 1h/4h/8h/overnight.
- Atlas: bounded retrieval; INFERENCE never upgrades to SOURCE_FACT.
- Benchmark: hidden ground truth; leakage classes fail closed.
- Finding: S1–S4 recommendation; humanReviewRequired; publication prohibited.

## Lane ownership

A `src/core/agentRuntime/` (includes lifecycle/observability)
B `src/core/reasoner/`
C `src/core/agentTools/`
D `src/core/bugAtlas/`
E `src/core/systemAtlas/` overlay; does not mutate `systemMap` kinds
F `src/core/benchmark/`
G `src/core/autonomousFinding/` projects onto existing handoff; does not
  become Leslie

`src/core/aiReview/` stays the end-stage reviewer.

## Authorization

`AUTONOMOUS_AGENT_LOCAL` is allowed. DEV/NEXT/production remain unauthorized
until an independent owner grant. Browser/API catalog entries exist but
fail `UNAUTHORIZED_ENVIRONMENT` unless that environment is in the runtime
context.
