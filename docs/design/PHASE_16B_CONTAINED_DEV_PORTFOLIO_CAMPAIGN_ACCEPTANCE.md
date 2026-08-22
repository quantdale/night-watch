# Phase 16B — Contained DEV Portfolio Campaign Acceptance

## Design intent

Phase 16B is the first runtime acceptance of the Phase-16A portfolio planner after Phase-16H local hardening. It does not expand Nightwatch authority. It consumes the existing deterministic portfolio/handoff artifacts and the existing campaign runtime under a separately granted owner token.

## Architectural path

`approved target registry -> portfolio model -> scoring -> allocation -> campaign-plan manifest -> inert DEV handoff -> owner authorization -> existing campaign runtime -> checkpoint/resume -> observation -> semantic/protocol evaluation -> replay/minimization -> clustering/confidence -> private dossier/report`

Every arrow reuses an existing hardened subsystem. Phase 16B must not create a second runtime executor or alternate owner-policy path.

## Runtime principles

1. Handoff data stays inert until owner authorization is present.
2. Authorization changes permission, not plan identity, target scope, budget, or safety policy.
3. Every runtime action is re-checked by the canonical owner policy immediately before execution.
4. Production/NEXT/unknown destinations fail closed at existing containment layers.
5. Read-only campaign actions only; no mutation fallback.
6. A changed/stale source or incompatible campaign fingerprint invalidates the frozen plan before executor use.
7. Authenticated runtime evidence remains metadata-first and private-safe; traces stay off.
8. Planner/shadow yield metrics are prioritization inputs only, never an oracle for product correctness.

## Expected result

The useful output is an evidence-backed answer to: can the hardened portfolio plan be admitted and executed safely through the existing real DEV campaign path, with exact budget/member reconciliation and truthful anomaly handling? A zero-finding answer is acceptable.
