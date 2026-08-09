# Nightwatch Phase 2A — First Controlled Authenticated Ripple Dev/Next Observation

## Task purpose

Prove that Nightwatch can safely observe one explicitly selected authenticated
Ripple `dev` or `next` session using only passive/read-only behavior, mandatory
outer proxy containment, browser guards, minimized evidence, and deterministic
generic oracles. The observable outcome is a sanitized, repeatable first real
runtime contract and a truthful Phase 2A report; this task does not begin
journey implementation or autonomous bug hunting.

## Established starting state

- Task ID: `phase-2a-controlled-observation`
- Starting SHA: `3a2712185250cd4e3591ee4037b28e06e8a0417e`
- Phase 1.3 continuity handoff is complete and reconciled: the starting HEAD
  is a clean descendant of `1994eaca9f8b67cf7d31cdffd66ebdc600379c90`, and
  the intervening commit changed only approved continuity/documentation state
  files.
- Phase 1.2 browser and loopback-proxy containment is established and locally
  validated; production hosts remain forbidden.
- The legacy Ripple shell and current MFEs are established design inputs; the
  prior Ripple/backend recon findings and Recon A/B/C/D must not be repeated.
- The historical intermediate `api.alphaus.cloud` contact remains documented
  with unknown path, method, credentials, and response; do not contact
  production to investigate it.

## Required deliverables

- Repaired continuity-validator SHA semantics with focused synthetic tests and
  updated continuity documentation/templates.
- Explicit single-environment real-target configuration and a non-authenticated
  preflight command.
- Metadata-first authenticated evidence minimization with synthetic privacy
  tests.
- Manual external storage-state capture/validation workflow, if needed.
- Pre-real-run safety gate, unauthenticated canary, one authenticated landing
  observation, one fresh-context replay, sanitized destination manifest, and
  passive oracle results.
- Updated sanitized project runtime documentation and complete task
  `STATE.md`/`REPORT.md` handoff.

## Explicit non-goals

- Production browsing or production requests.
- CRUD, settings, invoice, recalculation, exchange-rate, billing-group,
  commitment, token, user, or RBAC actions.
- Database queries, API fuzzing, random/generative/model exploration, DeepSeek,
  oops, automated bug submission, Phase 2B journeys, replay/oracle expansion,
  change intelligence, or container/L6 work.
- Broad Alphaus repository reconnaissance or modification.

## Safety constraints

- Select exactly one of `dev` or `next`; `prod` is never selectable and is
  never dynamically allowlisted. Any target, auth-host, API-host, or runtime
  ambiguity aborts.
- Every real browser context must use the mandatory healthy fail-closed
  loopback proxy and existing browser guards. No direct browser networking.
- Use only a valid externally supplied Playwright storage state or a human-led
  headed capture helper. Never receive, print, copy, automate, or persist
  credentials, MFA codes, tokens, cookies, or customer data.
- Real authenticated evidence is metadata-first: no auth headers/cookies,
  bodies, arbitrary query values, storage, DOM dumps, screenshots, or traces by
  default. Real-run artifacts stay local and Git-ignored.
- API safety uses a semantic endpoint/action registry: `KNOWN_READ` may be
  observed, `KNOWN_MUTATION` is blocked, and `UNKNOWN` is recorded and blocked
  or aborts before deliberate triggering. HTTP method alone is insufficient.
- Do not query or mutate any datastore or Alphaus repository.
- If a human input or narrow host approval is required, checkpoint completely,
  leave `ACTIVE_TASK` `IN_PROGRESS`, and stop with `USER_ACTION_REQUIRED`.

## Acceptance criteria

- All Phase 2A milestones are recorded in the living plan and state.
- Continuity SHA semantics distinguish `SYNCED`, approved continuity-only
  checkpoint advance, and implementation/source/test/config staleness without
  rewriting state or treating arbitrary descendants as synchronized.
- Exactly one explicit `dev` or `next` target passes preflight; production and
  unknown destinations remain denied.
- Manual/external authentication is safe, state remains outside the repo and
  artifacts, and authenticated traces/evidence minimization are enforced.
- The first authenticated Ripple landing observation and one fresh-context
  replay complete without deliberate mutation, database access, production
  contact, or silently allowed unknown destination.
- Sanitized manifest, passive oracle verdicts, artifact privacy review, and
  runtime provenance documentation are complete.
- `npx tsc --noEmit`, `npx playwright test`, `npm run agent:check`,
  `git diff --check`, and focused Phase 2A tests pass; Alphaus repositories are
  unchanged; the Nightwatch handoff is committed with a clean tree.
