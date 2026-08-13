# Nightwatch Codebase Hardening Campaign I

Status: `FROZEN INTENT`
Frozen: 2026-08-14

## Task purpose

Adversarially review the current Nightwatch implementation and repair
evidence-backed weaknesses at persistence, resume, budget, process,
filesystem, configuration, policy, provenance, evidence-summary, typecheck,
CI, privacy, and auditability boundaries. The outcome is a more predictable
private/local hardening baseline without adding bug-hunting capability,
starting Phase 8, or executing a real DEV campaign.

## Established starting state

- Task ID: `codebase-hardening-campaign-1`
- Starting SHA: `c14aebff9ae85814aa31f518e7f8fa4afbdeb7da`
- Canonical root: `/home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch`
- Branch and remote: `main`, private `origin`, `quantdale/night-watch`.
- Bootstrap state: clean worktree and `HEAD == origin/main` at the starting
  SHA.
- Phase 7 remains a completed historical task; it is not reopened.
- Phase 6 remains `FROZEN_BY_OWNER` for
  `INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`; real data/infrastructure
  operations are permanently out of scope.
- Runtime findings, credentials, storage state, authenticated evidence,
  customer values, and private dossiers remain outside GitHub.
- The preferred validation plane is local, synthetic, static, and fixture-based.

## Threat model

This task protects primarily against accidental durable-state corruption,
stale or cross-version state, malformed manually edited campaign files,
partial writes, future regressions, resume budget reset, unexpected shell
environment secrets reaching children, unsafe CWD/filesystem redirection,
incorrect policy provenance, executable substitution, ambiguous target policy,
misleading owner summaries, incomplete compile/test coverage, and safety code
that is difficult to audit.

It does not attempt to protect against a malicious root user controlling the
machine, a fully compromised OS/kernel, or physical machine compromise. No
cryptographic key-management system is required unless current evidence makes
one necessary.

## Required deliverables

- Recorded independent read-only review tracks and a frozen finding ledger.
- Runtime recomputation and cross-field validation for frozen manifests.
- Strict checkpoint/resume validation before any executor callback.
- Deterministic budget-feasibility handling that makes reproduction capacity
  truthful within existing bounded caps.
- Explicit allowlisted child environments with synthetic secret-sentinel tests.
- Stronger private-artifact filesystem and environment-config provenance
  boundaries, including CWD and symlink adversarial coverage.
- Explicit real-target policy with production remaining impossible.
- Oops executable provenance binding, or a documented quarantine if local
  evidence proves a safe repair cannot be made in scope.
- Morning briefs that distinguish no observations from unresolved L0 evidence,
  budget blocks, shared failures, and admitted findings.
- Complete root TypeScript config coverage and proportionate static checks for
  safety-critical JavaScript launchers.
- A deterministic repository-native hardening check when supported by current
  structure, and private read-only CI when it can be implemented safely.
- Continuity SHA semantics that distinguish validated implementation,
  substantive, documentation, pushed, local, and remote checkpoints.
- Large-module and orchestrator audit; only characterization-protected
  narrowly justified refactoring may be performed.
- Integrated synthetic adversarial fixtures, local validation, and a clean
  source-only checkout check.
- Durable completion state, report, validated source checkpoints, and remote
  verification.

## Explicit non-goals

- No Phase 8 or new bug-hunting feature.
- No real DEV campaign, auth capture against DEV, real journey/exploration,
  production request, product mutation, database query, infrastructure query,
  cloud/deployment archaeology, or external publication.
- No modification of Alphaus repositories.
- No private findings, credentials, storage state, customer data, raw
  authenticated evidence, or secrets in source, tests, artifacts, task state,
  CI logs, or GitHub.
- No increase to real campaign caps merely to make a test pass.
- No broad framework upgrade, mass launcher conversion, or monolithic
  orchestrator rewrite.
- No force-push, runtime Git push, issue/PR automation, Slack/email, or ticket
  creation.

## Safety constraints

- Preserve `FROZEN_BY_OWNER` and fail-closed `OWNER_POLICY_BLOCKED` behavior.
- Use only synthetic values for secret and customer-like test data.
- Treat persisted JSON and child-process inputs as untrusted until runtime
  validated; TypeScript interfaces and casts are not validators.
- Keep product network, production, DEV, NEXT, database, infrastructure, and
  external-publication activity at zero during this task. Private source
  checkpoint pushes to `origin/main` are the only intended external write.
- Do not read or write owner credentials, storage state, or private findings.
- Validate each milestone before moving to the next and update STATE before
  changing subproblems or ending a session.

## Acceptance criteria

1. Phase 7 remains `COMPLETE`; Phase 6 remains `FROZEN_BY_OWNER`.
2. Manifest fingerprint and all executable/cross-field identity material are
   recomputed and compared on persisted reads; tampering is rejected.
3. Checkpoint invariants, budget arithmetic, ledger references, result/state
   combinations, and version drift are rejected before executor callbacks.
4. Bounded initial planning cannot silently promise reproduction capacity that
   its frozen resource profile cannot provide.
5. Authenticated children do not inherit arbitrary parent environment values;
   shell/process sites are classified and synthetic sentinels stay absent.
6. Private roots/files and environment config are independent of arbitrary CWD
   and reject unsafe symlink/path/permission cases within supported platforms.
7. Real credential-bearing automation is explicitly DEV-only unless a separate
   documented, tested exception is proven; production remains impossible.
8. Oops binary contents are bound to a verified local digest or remain behind
   an explicit fail-closed provenance quarantine.
9. Morning briefs surface unresolved L0 and budget-blocked evidence clearly.
10. All root TypeScript configs are checked; proportionate JS/static checks,
    hardening checks, and safe private CI pass where implemented.
11. Synthetic/local adversarial campaigns, required existing tests,
    `npm run agent:check`, and `git diff --check` pass; no real DEV run occurs.
12. A final validated Nightwatch checkpoint is pushed without private runtime
    evidence, local `HEAD == origin/main`, the tree is clean, and the report
    records the architecture/adversarial review and any deferred debt.
