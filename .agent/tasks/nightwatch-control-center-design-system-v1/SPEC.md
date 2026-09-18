# SPEC.md

**Task:** nightwatch-control-center-design-system-v1
**Campaign:** Control Center design system

**Authorization.** ACTIVATED 2026-09-18 by explicit owner instruction. The
predecessor park record (`nightwatch-open-spec-truth-closure-v1`, 2026-09-14)
named its own unblock condition: "a fresh owner authorization opens its own
campaign task and session for this change". That authorization was given and
this task and its owned C-00 session are it. The park record's intent is
superseded, not contradicted — it forbade self-starting, which this is not.

**Objective:** Give the Control Center ONE design system, applied across all
nine views, and make the system's integrity mechanically enforced so it cannot
decay back. Concretely: a complete token block (colour, typography, spacing,
radius, elevation, motion); a 12px rendered-text floor; no palette literal or
divergent `var()` fallback outside the token block; a qualified responsive
matrix; and interactive boundaries that meet 3:1.

**Scope:** `ui/control-center/**`, `tests/browser/controlCenterBrowser.browser.ts`,
the viewport-matrix browser lane, `config/validation-universe.v1.json` lane
registration, this change's OpenSpec artefacts and this task directory.

**Non-goals:** no route, adapter, contract, bound, sanitizer, authority or
dependency change. No new runtime dependency, no CSS framework, no icon or
chart library, no light theme. No backend field is invented to improve a
visual. No rebrand: the blue-black `#0b1118` base and amber `#e4a853` accent
are Nightwatch's identity and are preserved.

**Safety constraints:** LOCAL only. Sibling repositories stay read-only. No
production, DEV or NEXT contact; no network egress; no credentials. C-00
governs: one owned session worktree, fast-forward integration, never
force-push. No quality gate is weakened, and no exemption list grows without a
written reason.

**Acceptance criteria:**

1. Every referenced custom property is defined, and every `var()` fallback
   literal equals its token's defined value — guarded, non-vacuously.
2. No palette literal outside the token block except a justified structural
   exemption list that fails in BOTH directions.
3. Every rendered text node measures >= 12px in the browser lane, with a
   non-zero measured count asserted.
4. Every one of the nine views renders at 1440 / 1080 / 820 / 560 / 380 with
   no horizontal page scroll, no clipped control, and the read-only /
   loopback-only posture visible and reachable at every width.
5. Controls whose boundary is their sole affordance meet 3:1.
6. Every pre-existing UI guard stays green with no exemption list longer than
   before.
7. UI typecheck, tests and build PASS; root hardening and validation PASS; the
   browser lane PASS.
8. Certification is DIFFERENTIAL against the base failure set, because
   `gate:local` and `npm test` are red at base for a pre-existing sibling-source
   reason outside this campaign. A green gate is not claimed and not engineered.

**Deliverables:** the token block and its integrity guards; the literal,
type-floor, responsive and boundary guards with recorded negative probes; the
restyled nine views; the viewport matrix lane; updated OpenSpec and task state;
`REPORT.md` with honest limits.

**## Declared Deletions:**

NONE
