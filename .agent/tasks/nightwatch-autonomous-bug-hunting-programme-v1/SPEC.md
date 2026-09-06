# Autonomous Bug-Hunting Programme

## Task purpose

Make Nightwatch autonomously discover, investigate, disprove or reproduce,
and package software defects with high-confidence evidence, sitting above
the existing deterministic safety kernel.

## Established starting state

- Task ID: `nightwatch-autonomous-bug-hunting-programme-v1`
- Starting SHA: `d1ebde90c1454b31d6b93d9df503a4c5f196d7c8`
- Canonical `origin/main` matched that SHA; working tree was clean.
- Predecessor `nightwatch-owner-local-review-persistence-v1` is COMPLETE.
- Stale session `session/nightwatch-review-operations-his-7431812c` exists
  and must not be touched.
- No `agentRuntime`, `ReasonerDriver`, Bug Atlas, or historical replay
  harness existed at start.
- `src/core/aiReview/` remains a bounded end-stage reviewer.
- DEV / NEXT / production / Slack / Leslie / Pondr are NOT AUTHORIZED.
- Owner scope is `FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.

## Required deliverables

- Frozen `src/core/agentProtocol/` contracts.
- Durable programme state (this task + `PROGRAMME.json`).
- Parallel Wave 1 lanes against frozen ownership.
- Autonomous proof: seeded positive discovery and false-anomaly rejection.
- Historical replay harness; real historical yield only if data exists.
- Human-review dossier with `humanReviewRequired` and publication prohibited.
- Quality gates and truthful certification.

## Explicit non-goals

- Overloading `aiReview` into a long-running controller.
- Obscura or alternate browsers.
- Slack / Leslie / Pondr / Notion / external filing.
- DEV/NEXT/production contact without independent authorization.
- Force-push, history rewrite, sibling-repo writes.
- Touching the pre-existing review-operations session worktree.

## Safety constraints

- Reasoner never receives unrestricted shell, Git mutation, raw Playwright,
  raw network, credentials, or production.
- Untrusted source/HTML/logs/API/history have zero instruction authority.
- Budget exhaustion is `SAFE_TERMINATION_CHECKPOINT`, never SUCCESS.
- Atlas inferences never upgrade into facts.

## Declared Deletions

None.

## Acceptance criteria

The twenty local completion bars in the programme brief, excluding a
previously unknown real Alphaus product bug if no real environment is
authorized. Real-world yield remains UNPROVEN when DEV is unauthorized.
