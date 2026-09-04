# EXECUTION PROMPT — Unused Vue DevDependency Removal

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-unused-dep-removal-v1
OpenSpec: openspec/changes/nightwatch-unused-dep-removal-v1/
Planned-From: ae959663d22e6c9191f3ef7a9ebed7f081fc4fe9
Target Branch: main
Predecessor Task ID: nightwatch-control-center-click-robustness-v1
Predecessor Status: COMPLETE

## Mission

Remove the unused `vue` devDependency (sole audit finding), prove
install/typecheck/scenario green with truth checkers, and integrate.
Manifest/lockfile only. Local/synthetic only.

## Authority

```
IMPLEMENTATION AUTHORIZED:
  package.json + package-lock.json vue removal only

REAL PRODUCTION CONTACT:
  NOT AUTHORIZED

C-12 EXECUTION:
  NOT AUTHORIZED IN THIS CAMPAIGN

C-08b:
  NOT AUTHORIZED

C-07 DEV:
  NOT AUTHORIZED
```

Repository-local and offline. No production contact, no NEXT contact, no
DEV request, no credential acquisition.

C-00 governs: all implementation happens in the owned session worktree
`session/nightwatch-unused-dep-removal-v1-ca39c497`.

## Ordered workstreams

1. Task record, OpenSpec change, routing — BEFORE code (M1).
2. Removal + install/typecheck/scenario/checkers (M2).
3. REPORT, integration, release, worktree removal (M3).

## Constraints

Manifest/lockfile only; verify install from scratch; no force push; no
history rewrite.
