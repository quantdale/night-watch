# Active Task

Task ID: nightwatch-control-center-design-system-v1
Phase: CONTROL_CENTER_DESIGN_SYSTEM_V1
Title: Nightwatch Control Center design system
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-control-center-design-system-v1
Starting SHA: efd1dc5c81a55db00e7698257c8b49b51a6703c5
Last validated implementation SHA: faacf8262dea0c6a42bf03242d5d1c44d6f70e9e
Last checkpoint: G1 rebaseline and activation. The change was parked
2026-09-14 with the unblock condition "a fresh owner authorization opens its
own campaign task and session"; that authorization was given 2026-09-18 and
this task and its owned session are it. Every figure in the historical audit
was re-measured at `efd1dc5c`: D-01's three undefined tokens are DEAD (neither
defined nor referenced, so the 1.08:1 defect is not reproducible and is not
claimed as fixed here), while D-02, D-03, D-04 and D-05 are all still present
and re-measured exactly. `App.tsx` is decomposed, so the audit's line
references are stale. UI baseline at the starting SHA: typecheck, 88 tests and
build PASS.
Current milestone: G1 rebaseline and activation
Next action: declare the complete token block and write the token-integrity
guard (change tasks 2.1, 2.3, 2.4), then negative-probe it in both directions.
Owner decisions stay OPEN; none is self-authorized.
Authorization class: CONTROL_CENTER_DESIGN_SYSTEM_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: efd1dc5c81a55db00e7698257c8b49b51a6703c5
LAST_VALIDATED_IMPLEMENTATION_SHA: faacf8262dea0c6a42bf03242d5d1c44d6f70e9e
LAST_SUBSTANTIVE_CHECKPOINT_SHA: faacf8262dea0c6a42bf03242d5d1c44d6f70e9e
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_CONTROL_CENTER_DESIGN_SYSTEM_V1_STATUS: IN_PROGRESS

## Outcome

Not yet certified. The campaign executes the 8 task groups of
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
WAVE: G1_REBASELINE_AND_ACTIVATION
SESSION WORKTREE: session/nightwatch-control-center-design-5eb78e61

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
