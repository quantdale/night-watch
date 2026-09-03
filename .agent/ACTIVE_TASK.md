# Active Task

Task ID: nightwatch-universe-admission-hygiene-c05-v1
Phase: UNIVERSE_ADMISSION_HYGIENE_C05_V1
Title: C-05 Universe Discovery + Admission Hygiene
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-universe-admission-hygiene-c05-v1
Starting SHA: 210cd0c8732a7ea5ba5aa5b7eef146d4f001d277
Last validated implementation SHA: 210cd0c8732a7ea5ba5aa5b7eef146d4f001d277
Last checkpoint: baseline measured read-only at 210cd0c — 149 repositories discovered, 6 admitted, 143 unapproved; 1,745 operations (blueapi 1,181 / ouchan 341 / ripple-api 223) with enumeration TRUNCATED and remainingUnknown true; 10 of 18 persisted remote-tracking Git fields diverged from live, worst ouchan behind 25 vs 310; blueinternal openapiv2 measured at 51 operations and mobingilabs/wave-api at 55 route keys
Current milestone: M2 — one canonical owner-approved admission authority, with discovery separated from admission
Next action: collapse the two-list admission intersection into one canonical owner-approved authority so a repository named in one record and absent from the other becomes a declared error rather than a silent non-admission, then add the admission-free discovery operation
Authorization class: NIGHTWATCH_UNIVERSE_ADMISSION_HYGIENE_C05_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 210cd0c8732a7ea5ba5aa5b7eef146d4f001d277
LAST_VALIDATED_IMPLEMENTATION_SHA: 210cd0c8732a7ea5ba5aa5b7eef146d4f001d277
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 210cd0c8732a7ea5ba5aa5b7eef146d4f001d277
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_UNIVERSE_ADMISSION_HYGIENE_C05_V1_STATUS: IN_PROGRESS

## Routing and safety

C-05 makes one sentence mechanical: a repository DISCOVERED is not a repository
ADMITTED.

The measured defect: 149 git repositories sit under the sibling root and six
are admitted, but nothing states that as a rule. Admission is computed as
`RIPPLE_REPOSITORIES` filtered to `scope === 'IN_SCOPE'` INTERSECTED with the
keys of `APPROVED_ROOTS`, across two files, so neither list is the
owner-approved universe and a repository present in one and absent from the
other is silently dropped rather than reported. Discovery does not exist as a
concept, so there is nowhere to say "we can see 149 and may read 6".

Two further measured defects. `src/core/changeIntelligence/map.ts` persists
mutable Git state as normative configuration; the checkout-local fields are
currently accurate but 10 of 18 remote-tracking fields have diverged, with
`ouchan` recording `behind: 25` while actually 310 behind, and nothing detects
it. And the claim that unapproved repositories are unread rests on
`operations = 0`, a property of OUTPUT that an analyzer which opened files and
derived nothing would also satisfy.

C-05 admits exactly two owner-named repositories and no third:
`alphauslabs/blueinternal` root `openapiv2` (measured 51 operations, not the
historical ~57) and `mobingilabs/wave-api` root `src` (measured 55 route keys)
— both through EXISTING parsers, with no new parser and no unsound source fact
created to raise a yield.

Yield is an observation, never a target. The historical `>= 900 operations`
programme goal is already exceeded at 1,745 before this campaign admits
anything, so it can never justify admitting a repository or relaxing a
classification. Enumeration stays TRUNCATED with `remainingUnknown: true`.

Sibling repositories are READ-ONLY: never written, never modified, never
committed to, and no generated artifact is placed inside one. Discovery may
surface hundreds of repositories; that grants nothing. No production contact
and no NEXT contact; C-12 remains NOT AUTHORIZED and is not begun.

All work happens in the owned session worktree
`session/nightwatch-universe-admission-hy-418aba0f`; the canonical checkout is
never used for implementation.
