# Active Task

Task ID: nightwatch-control-center-design-system-v1
Phase: CONTROL_CENTER_DESIGN_SYSTEM_V1
Title: Nightwatch Control Center design system
Status: COMPLETE
Task directory: .agent/tasks/nightwatch-control-center-design-system-v1
Starting SHA: efd1dc5c81a55db00e7698257c8b49b51a6703c5
Last validated implementation SHA: 1fc8eb6d4cd2cde22d6c65647538123d0457af26
Last checkpoint: G1–G7 complete. The Control Center has one design system
applied across all nine views, with its integrity mechanically enforced: 53
tokens (was 18), zero colour literals outside the token block (was 54 distinct
across 69 occurrences), zero `var()` fallbacks (was 14, ten of them describing a
second light theme), a 12px rendered type floor (was 84 font-sizes across 19
values with 49 below it), and the three breakpoints RENDERED for the first time
as a 9-view x 5-width matrix. Four real layout defects and two D-04 posture
removals were fixed, not documented. Differential certification: the
`gate:local` receipt matches base group-for-group and count-for-count
(2120/2104/13/3, same three failed locations); `npm test` is 5201 passed / 13
failed / 18 skipped against base 5198 / 12 / 18.
Current milestone: COMPLETE — G8 certification closed; all eight groups closed
Next action: TASK COMPLETE. Task 6.4 (focus-ring contrast at every declared
width) is CARRIED and needs its own authorization; the sibling `ripple-api`
re-admission is an owner action.
Owner decisions stay OPEN; none is self-authorized.
Authorization class: CONTROL_CENTER_DESIGN_SYSTEM_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: efd1dc5c81a55db00e7698257c8b49b51a6703c5
LAST_VALIDATED_IMPLEMENTATION_SHA: 1fc8eb6d4cd2cde22d6c65647538123d0457af26
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 1fc8eb6d4cd2cde22d6c65647538123d0457af26
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_CONTROL_CENTER_DESIGN_SYSTEM_V1_STATUS: COMPLETE

## Outcome

COMPLETE and integrated at `2f45cfc4`. The campaign executed the 8 task groups of
`openspec/changes/nightwatch-control-center-design-system-v1/tasks.md`:
token block and integrity guard, literal-free stylesheet, type floor and the
restyle it forces, responsive truth, boundary contrast, registration and
validation, certification.

## Mission

Give the Control Center ONE design system across all nine views, and make its
integrity mechanical so the measured drift cannot silently return. Preserve
every existing UI truth guard — render, absence, contract coverage, placement,
class-effect, stylesheet coverage, System Map taxonomy, keyboard and
accessibility. Never weaken a gate or lengthen an exemption list to pass.

Read in this order:

1. `openspec/changes/nightwatch-control-center-design-system-v1/audit.md`
   (including the `# Rebaseline — measured at efd1dc5c` section, which wins
   over the historical audit wherever they disagree)
2. `openspec/changes/nightwatch-control-center-design-system-v1/{proposal,design,tasks}.md`
3. `.agent/tasks/nightwatch-control-center-design-system-v1/{SPEC,PLAN,STATE}.md`
4. `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`,
   `docs/DECISIONS.md`, then live Git/workspace/session truth.

## Frozen predecessor outcomes

Do not rebuild unless live recon finds a concrete regression:

- `nightwatch-control-center-style-and-absence-truth-v1` is terminal COMPLETE
  and integrated at `36bd493`. A-01 through A-04 are CLOSED; do not reopen
  them.
- `nightwatch-control-center-render-truth-v1`,
  `nightwatch-control-center-placement-coverage-v1`,
  `nightwatch-control-center-ui-completion-v1` and
  `nightwatch-residual-closure-and-lane-qualification-v1` are terminal
  COMPLETE.
- `nightwatch-production-completion-programme-v1` remains IN_PROGRESS. Its
  G16.9/16.10/16.11 decomposition is integrated at `efd1dc5c`; its G16.12,
  G16.5, G8, G9, G12, G18 and G19.14 tails stay open under their own
  authorizations and are NOT executed here.
- The permanent owner scope freeze, L6 containment, and immutable evidence
  and review store identities are unchanged.

## Routing and safety

```
CAMPAIGN: nightwatch-control-center-design-system-v1
CHILD TASK: NONE
WAVE: G8_CERTIFICATION
SESSION WORKTREE: NONE

IMPLEMENTATION AUTHORIZED:
  The Control Center design system across `ui/control-center/**`, the browser
  qualification lane `tests/browser/controlCenterBrowser.browser.ts` and its
  viewport matrix, `config/validation-universe.v1.json` lane registration,
  this change's OpenSpec artefacts, this task directory, Nightwatch docs, and
  commits/pushes/integration from one owned C-00 session worktree.

REAL PRODUCTION CONTACT:               NOT AUTHORIZED
NEW API ROUTE / ADAPTER / AUTHORITY:   NOT AUTHORIZED
NEW RUNTIME DEPENDENCY:                NOT AUTHORIZED
NEXT / DEV EXECUTION:                  NOT AUTHORIZED
NETWORK EGRESS / ADVISORY SCAN:        NOT AUTHORIZED
SLACK / LESLIE / PONDR / NOTION:       NOT AUTHORIZED
EXTERNAL FILING:                       NOT AUTHORIZED
CREDENTIALS / DEPLOYMENT:              NOT AUTHORIZED
SIBLING WRITES:                        NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:          NOT AUTHORIZED
REOPENING TERMINAL FINDINGS:           NOT AUTHORIZED
WEAKENING A GATE OR GROWING AN
  EXEMPTION LIST TO PASS:              NOT AUTHORIZED
```

LOCAL only. Sibling repositories remain read-only. Never retire, prune, adopt
or edit another session, and never create worktree capacity by removing one.

C-00 governs all writers: one writing agent == one owned worktree == one
session identity. The canonical checkout is not an implementation worktree.
