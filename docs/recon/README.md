# Nightwatch Reconnaissance Archive

Nightwatch's design was derived from **four independent reconnaissance
tracks**, each covering a distinct capability question:

| Track | Subject |
|---|---|
| A — Product/Browser | Ripple and related UI surfaces as test targets |
| B — Full-Stack Oracle | Cross-layer deterministic verification sources |
| C — QA Capability | Existing test infrastructure and reusable primitives |
| D — Change Intelligence / Autonomy | Nightly execution, state, and self-development |

## What is physically present

Only **RECON_B** is in the workspace, at
`investigations/nightwatch_recon_b/NIGHTWATCH_RECON_B.md` (workspace
root). It is the normative recon source cited by ID (E1–E10, §1–§14) in
`docs/SAFETY_MODEL.md` and `docs/DECISIONS.md`.

**RECON_A, RECON_C, and RECON_D are NOT present on disk.** Their entries
below are **handoff summaries from the mission brief**, not original
report contents — they must not be cited as if they were the reports.
Treat them as unverified until the sources are copied here.

## Cross-report findings

### Track B — Full-Stack Oracle (original report present)

- cross-layer deterministic oracles are preferable to AI judgement;
- Blue/legacy APIs use differing protocol/error behavior;
- environment isolation is a critical risk;
- L0-L5 evidence ladder exists.

### Track A — Product/Browser

> **HANDOFF SUMMARY — original report not yet archived; treat as unverified until the source is copied here.**

- Ripple legacy shell + new MFEs are both relevant;
- api_type/environment behavior can fall back toward production;
- existing Cypress/shared auth patterns are useful references;
- Ripple provides a large deterministic browser surface;
- commitment MFEs are test-light.

### Track C — QA Capability

> **HANDOFF SUMMARY — original report not yet archived; treat as unverified until the source is copied here.**

- oops is useful later as an API/integration execution primitive;
- ai-driven-bug-hunting is primarily a specification/input source;
- current test infrastructure has significant execution/coverage gaps.

### Track D — Change Intelligence / Autonomy

> **HANDOFF SUMMARY — original report not yet archived; treat as unverified until the source is copied here.**

- future nightly execution should be change-directed;
- persistent machine-readable state must replace LLM conversational memory;
- self-development must eventually be evaluated against frozen external
  regression/evaluation sets.

## Promotion rule

When the original RECON_A/C/D reports are found, copy them into this
directory (`docs/recon/`) and promote the handoff summaries above to
"original report present" status — re-verify the summaries against the
sources and replace them with accurate excerpts where they differ.
