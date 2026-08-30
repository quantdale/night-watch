# EXECUTION PROMPT — Operational Acceptance

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: BLOCKED
Campaign ID: nightwatch-operational-acceptance-v1
OpenSpec: openspec/changes/nightwatch-operational-acceptance-v1/
Planned-From: a17c6aebaaf50a933bcd9be77474f0b9cf0b93dd
Target Branch: main
Predecessor Task ID: nightwatch-final-completion-and-l6-containment-v1
Predecessor Status: COMPLETE

## Mission

Clean the Nightwatch Git topology to a single canonical `main`, reclassify
historical `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED` as local/synthetic
certification only, and determine whether Nightwatch actually works against
the approved DEV system and problem it was built to inspect.

This is not permission to weaken fail-closed safety, contact production,
mutate DEV data, modify Alphaus repositories, or treat synthetic test counts
as operational acceptance.

## Permanent constraints

- No production contact.
- No DEV mutation.
- No infrastructure/data-layer operations excluded by owner policy.
- No Alphaus repository writes.
- No credentials, cookies, tokens, storage-state bytes, or raw findings in
  Git, task files, or GitHub.
- No force-push.
- Do not weaken project-state or continuity validators.

## Required workstreams

1. Canonical Git inventory, clone audit, and deletion of proven-redundant
   copies and extra branches.
2. Successor continuity-v2 task and operational-acceptance project-state
   pairing.
3. Local/clean preflight on a known SHA.
4. Serial real DEV launchers: phase2c, phase4, phase5, campaign prepare then
   resume.
5. Owner UX, second run, efficacy or explicit unproven, adversarial
   fail-closed cases.
6. One of four truthful operational verdicts.

## Terminal outcomes

Choose exactly one:

- `OPERATIONALLY_ACCEPTED`
- `REAL_SYSTEM_EXECUTION_VERIFIED_EFFICACY_UNPROVEN`
- `OPERATIONAL_ACCEPTANCE_BLOCKED`
- `OPERATIONAL_ACCEPTANCE_FAILED`

Do not use `COMPLETE` or `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED` as a
substitute for those distinctions.
