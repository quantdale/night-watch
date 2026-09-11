# EXECUTION PROMPT — Nightwatch production completion programme

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: READY_FOR_EXECUTION
Campaign ID: nightwatch-production-completion-programme-v1
OpenSpec: openspec/changes/nightwatch-production-completion-programme-v1/
Planned-From: 36bd4930db978423f97e16f35250c2e66bfa112c
Target Branch: main
Predecessor Task ID: nightwatch-control-center-style-and-absence-truth-v1
Predecessor Status: COMPLETE

## Mission

Execute the bounded 21-group programme in
`openspec/changes/nightwatch-production-completion-programme-v1/tasks.md`.
The programme closes the record-level gaps F-01 … F-12 and the code-level
gaps F-13 … F-21 identified in `audit.md`: ledger truth and the spec
baseline; validation lane state; CI authority; a CLI contract; evidence
hygiene; workspace drift; documentation currency; Control Center residual
truth; supply-chain currency; deployment fact acquisition; contained DEV
semantic acceptance; autonomous yield; a release definition; dead
architecture; the CLI-to-implementation contract; structural rule soundness;
schema lifecycle; error taxonomy rendering; configuration contract and UI
decomposition; accessibility certification; and authenticated capability
lifecycle.

## Read first

1. `openspec/changes/nightwatch-production-completion-programme-v1/audit.md`
2. `openspec/changes/nightwatch-production-completion-programme-v1/tasks.md`
3. `.agent/tasks/nightwatch-production-completion-programme-v1/{SPEC,PLAN,STATE}.md`
4. `AGENTS.md`, `.agent/PLANS.md`, `docs/CURRENT_STATE.md`,
   `docs/SAFETY_MODEL.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`
5. Live Git/workspace/session truth before any change.

## Ordered workstreams

1. G1 ledger truth, then G2 validation lane state.
2. G14 dead architecture, then G15 CLI contract, G16 rule soundness,
   G17 schema lifecycle — in that order for the stated dependencies.
3. G3, G4, G5, G6, G7, G9, G20, G21 as independent surfaces.
4. G19, then G8, then G18 — all three touch the Control Center.
5. G10, G11, G12 as their owner decisions land.
6. G13 last by construction.

Each group: implement, register its checks, run its focused validation, tick
only what has evidence, integrate by fast-forward, continue.

## Constraints

```
CAMPAIGN: nightwatch-production-completion-programme-v1
CHILD TASK: NONE
WAVE: NONE

IMPLEMENTATION AUTHORIZED:
  the file surface named by each group in the OpenSpec change.

REAL PRODUCTION CONTACT:               NOT AUTHORIZED
NEW API ROUTE / ADAPTER / AUTHORITY:   NOT AUTHORIZED
NEXT / DEV EXECUTION:                  NOT AUTHORIZED unless a group's own
                                       owner decision explicitly grants it
NETWORK EGRESS / ADVISORY SCAN:        NOT AUTHORIZED unless G9's owner
                                       decision explicitly grants one query
SLACK / LESLIE / PONDR / NOTION:       NOT AUTHORIZED
EXTERNAL FILING:                       NOT AUTHORIZED
CREDENTIALS / DEPLOYMENT:              NOT AUTHORIZED
SIBLING WRITES:                        NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:          NOT AUTHORIZED
REOPENING A-01..A-04 OR R-01..R-04:    NOT AUTHORIZED
```

LOCAL only. Sibling repositories remain read-only. The permanent owner scope
freeze, the fail-closed egress policy, the C-10 privacy firewall, D-4
production unloadability and the C-00 protocol are unchanged. Never retire,
prune, adopt or edit another session; the foreign
`nightwatch-repository-hardening--e7b9be89` session is untouched.

## Validation

- Root: `npm run typecheck`, `node bin/hardening-check.mjs`,
  `npm run project:check`, `npm run agent:check`,
  `npm run validation:universe`, `npm run workspace:check`,
  `npm run handoff:check`, `npm run gate:local`.
- UI: `npm --prefix ui/control-center run typecheck|test|build`.
- Browser: `npm run control-center:ui:browser`.
- Full offline regression: `npm test` at the programme checkpoint.
- OpenSpec: `openspec validate --all`, `openspec list --specs`.
- Each group's own new lane as specified in `tasks.md`.

## Acceptance and completion gates

- Every task box is ticked with evidence or recorded with its exact
  blocking class, owner action and revisit condition; a terminal change has
  no open boxes that are actually done.
- `openspec validate --all` exits zero; `openspec/specs/` is non-empty.
- Every new check is registered and negative-probed; no test suppression.
- `gate:local` PASS from the owned session at the programme checkpoint; the
  full offline regression passes; project and task truth reconcile to the
  checkpoint; integration is fast-forward with `HEAD == origin/main`.

## Git and reporting

Commit per group from the owned session worktree, validate, integrate by
fast-forward push, verify `HEAD == origin/main`, and keep
`.agent/tasks/nightwatch-production-completion-programme-v1/STATE.md`
current at every milestone. A rejected push means stop and reconcile; never
force-push. Fill `REPORT.md` at closure with residual work, owner decisions,
safety events and honest limits.
