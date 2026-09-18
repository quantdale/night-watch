# Active Task

Task ID: nightwatch-certification-closure-and-validation-integrity-v1
Phase: CERTIFICATION_CLOSURE_AND_VALIDATION_INTEGRITY_V1
Title: Certification closure and validation integrity
Status: COMPLETE
Task directory: .agent/tasks/nightwatch-certification-closure-and-validation-integrity-v1
Starting SHA: 521210f706b9383e20dd08d1bfd2f3c47b34687d
Last validated implementation SHA: b34da5f63395dce53f139665dd823711739381ef
Last checkpoint: Milestones M1-M6 COMPLETE_LOCAL and certification GREEN at
b34da5f6: gate:local PASS over 12 required groups, full regression 5249 passed
/ 0 failed / 18 skipped, OpenSpec 64/64. The focus matrix found and
fixed 32 real defects: three control kinds matched no authored :focus-visible
rule and fell back to Chrome UA near-black at 1.08:1. The ripple-api
admitted snapshot moved to `4e3e200d` on derivation evidence: identical
invariants and identical ev:sha256 digests at both SHAs. The session `--dry-run`
contract is truthful, and `hardening:rules` is now executed by the
authoritative gate as the required `HARDENING_PROBES` group (11 required groups
became 12). The campaign was dead code AND already red — HC-015 UNDETECTED —
which is the blind spot in one line; it now reports 83 rules / 92 probes / 92
detected, exit 0.

Earlier detail: `--dry-run` was a global boolean that exactly one command read, so
`start` created a branch, a worktree and an ownership record while reporting a
plan. A declared `DRY_RUN_SUPPORT` table now covers every dispatchable command
and is enforced at dispatch; five mutating commands gained zero-mutation plan
reports, `integrate`'s guard moved above its fetch, and the two read-only
commands refuse the flag instead of ignoring it. Two further defects surfaced
while proving it: an unverified explicit `--base`, now failing closed before
the first mutation, and a `withoutComments()` line-comment defect in the
hardening kernel that silently deletes real code from every `read()`-based
rule's view, carried into milestone M3.
Current milestone: COMPLETE — all seven milestones closed and integrated
Next action: TASK COMPLETE. The owner-gated production-completion items stay
OPEN with the named owner action each requires; none is self-authorized here.
`gate:clean` and CI lanes were not run and are not claimed.
Owner decisions stay OPEN; none is self-authorized.
Authorization class: CERTIFICATION_CLOSURE_AND_VALIDATION_INTEGRITY_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 521210f706b9383e20dd08d1bfd2f3c47b34687d
LAST_VALIDATED_IMPLEMENTATION_SHA: b34da5f63395dce53f139665dd823711739381ef
LAST_SUBSTANTIVE_CHECKPOINT_SHA: b34da5f63395dce53f139665dd823711739381ef
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_CERTIFICATION_CLOSURE_AND_VALIDATION_INTEGRITY_V1_STATUS: COMPLETE

## Mission

Remove the concrete blockers and validation blind spots that remain after the
G16.9 hardening-rule-engine decomposition and the Control Center design-system
campaign, then obtain a truthful green local certification if the repository
actually qualifies for one.

Read in this order:

1. `.agent/tasks/nightwatch-certification-closure-and-validation-integrity-v1/{SPEC,PLAN,STATE}.md`
2. `openspec/changes/nightwatch-certification-closure-and-validation-integrity-v1/{proposal,tasks}.md`
3. `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`,
   `docs/DECISIONS.md`, then live Git/workspace/session truth.

## Frozen predecessor outcomes

Do not rebuild unless live recon finds a concrete regression:

- `nightwatch-control-center-design-system-v1` is terminal COMPLETE and
  integrated at `2f45cfc4`. Its carried task 6.4 (focus-ring contrast at every
  declared width) is executed HERE under this campaign's authorization; nothing
  else in that campaign is reopened.
- `nightwatch-production-completion-programme-v1` remains IN_PROGRESS. Its
  G16.9/16.10/16.11 decomposition is integrated. Its G16.5 and G16.12 tails are
  executed here; its owner-gated items stay OPEN.
- The permanent owner scope freeze, L6 containment, and the immutable evidence
  and review store identities are unchanged.

## Routing and safety

```
CAMPAIGN: nightwatch-certification-closure-and-validation-integrity-v1
CHILD TASK: NONE
WAVE: COMPLETE
SESSION WORKTREE: NONE

IMPLEMENTATION AUTHORIZED:
  `bin/nightwatch-session.mjs`, `bin/lib/hardening/**`, `bin/quality-gate*.mjs`,
  `config/quality-gate.v1.json`, `config/hardening-rule-probes.v1.json`,
  `config/validation-universe.v1.json`, `src/core/qualityGate/definition.ts`,
  the real-source expectation and provenance surfaces required by one
  owner-authorized `ripple-api` re-derivation and re-admission pass, the
  Control Center browser qualification lane, this change's OpenSpec artefacts,
  this task directory, Nightwatch docs, and commits/pushes/integration from one
  owned C-00 session worktree.

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
SIBLING READ (ripple-api, read-only):  AUTHORIZED, one re-derivation pass
```

LOCAL only. The sibling `mobingilabs/ripple-api` checkout is READ ONLY: no
checkout, reset, rebase, fetch or file edit, no execution of its application
code, no dependency installation inside it. Never retire, prune, adopt or edit
another session, and never create worktree capacity by removing one.

C-00 governs all writers: one writing agent == one owned worktree == one
session identity. The canonical checkout is not an implementation worktree.
