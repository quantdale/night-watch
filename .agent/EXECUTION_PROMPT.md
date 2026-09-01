# EXECUTION PROMPT — Concurrency and Workspace Hardening (C-00)

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-concurrency-workspace-hardening-c00-v1
OpenSpec: openspec/changes/nightwatch-concurrency-workspace-hardening-c00-v1/
Planned-From: 2517c26a019bbf8aa53008cd57658b917cc79bea
Target Branch: main
Predecessor Task ID: nightwatch-replay-budget-and-dossier-closure-v1
Predecessor Status: COMPLETE

## Mission

Prevent concurrent Nightwatch development agents from sharing mutable
checkout/index state and mechanically detect corruption of repository-global
Git state.

This is `MA-13` from the independent second-reviewer architecture review
(review §11, threat `T-48` OBSERVED, ordering finding `F-26`, baseline finding
`F-32`), classified `MUST FIX BEFORE IMPLEMENTATION` and placed first on the
revised critical path
`C-00 → C-01 → C-02a → C-06(PHP) → C-10 → C-11 → C-12 → C-13 → C-14`.

The enforced invariant is
`ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY`. Agents may share
the append-only object database; they must never share a working tree or an
index. Because `git worktree` does not isolate `info/exclude`, hooks or
`config`, isolation is combined with deterministic hygiene invariants over the
shared common directory, a declared-deletion gate, and a fast-forward-only,
never-force-push integration protocol serialized at the canonical `main` ref.

Do not implement C-01. Do not grant new product or runtime authority. Do not
contact DEV, NEXT, or production. Exercise destructive Git behaviour only
against disposable synthetic repositories.

## Current next action

STOP — C-00 is complete and locally certified. Do not begin C-01 in this
campaign, and do not run an implementation session in the canonical checkout.
The next campaign is a new task with its own session worktree.

## Working protocol for this campaign

Work inside the owned C-00 session worktree on branch
`session/c00-a396cd1f`, claimed for this task. Run `npm run session:status`
before substantial work; a `FAIL` verdict is a stop condition. Integrate with
`node bin/nightwatch-session.mjs integrate`, which fast-forward-pushes the
session branch onto canonical `main` and verifies the result. The final remote
topology remains `main` only.
