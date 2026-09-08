# SPEC — nightwatch-repository-hardening-implementation-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Status: IN_PROGRESS
Task: nightwatch-repository-hardening-implementation-v1
Campaign: nightwatch-repository-hardening-implementation-v1
Planned-From: 0ac7b3d037b5059f670eca715fc30adaf58e7334
Live HEAD authority: GIT — rediscover live Git/workspace/session/project truth before implementation.
PROJECT_VERDICT_EFFECT: PRESERVE

## Mission

Execute `docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md` — the repository-wide
review that closed at `REVIEW COMPLETE — execution has not started` — through
its dependency-ordered roadmap and its repository-level definition of done.

The review registered fifteen findings, NW-01 through NW-15. NW-15 is the W10
reproduction-surface wave, which the autonomous bug-hunting programme has
already completed and certified; this campaign consumes its results and does
not reopen it. The remaining fourteen findings are this campaign's scope.

The objective is a reproducible private local tool in which closed
vocabularies are mechanically closed, private writes are confined
independently of checkout topology, durable state survives interruption and
competing writers, deadlines actually stop owned work, the dashboard exposes
its bounded data and only its enabled capabilities, and release claims
identify every test and host capability actually exercised.

This is intentionally a long campaign. Do not stop after recon, one finding,
one green suite, or one phase.

## Frozen predecessors — do not rebuild

Treat these as frozen unless live recon proves a concrete regression:

- W0-W10 of `nightwatch-autonomous-bug-hunting-programme-v1`, including the
  W9 `GO_VENDORED_PACKAGE_TEST` / `CURRENT_SOURCE_REPEATED_TEST_FAILURE`
  semantics and the W10 `nightwatch.reproduction-surface-map.v1` contracts;
- historical `PRE_FAIL_POST_PASS` and strict `EXACT_REDISCOVERY` semantics;
- the permanent owner scope freeze, L6 containment, Phase 9/9A.1/10 semantic
  admission rules, and mechanical dossier admission;
- immutable evidence/review store identities and their no-replace patterns.

Every repair in this campaign is additive or behaviour-preserving for valid
inputs. Persisted artifacts written by earlier schemas must keep reading.

## Findings in scope

| ID | Title | Priority | Roadmap phase |
| --- | --- | --- | --- |
| NW-06 | Reject over-capacity sessions before creating worktrees | P1 | 0 |
| NW-08 | Account for the complete test and package validation universe | P1 | 0 / 6 |
| NW-01 | Close reasoner-facing vocabularies against prototype inheritance | P1 | 1 |
| NW-02 | Make private-path exclusion independent of checkout topology | P1 | 1 |
| NW-03 | Confine and safely publish Bug Atlas snapshots | P1 | 1 |
| NW-13 | Remove sensitive input from parser diagnostics | P1 | 1 |
| NW-04 | Make autonomous campaign checkpoints bounded and crash-safe | P1 | 2 |
| NW-05 | Enforce one abortable Phase-5 relay deadline | P1 | 3 |
| NW-12 | Bound SSE memory for slow or disconnected clients | P2 | 3 |
| NW-09 | Expose review decisions through a deliberate shipped capability | P2 | 4 |
| NW-10 | Implement bounded end-to-end dashboard pagination | P2 | 4 |
| NW-11 | Validate and cancel dashboard requests and coalesce refreshes | P2 | 4 |
| NW-14 | Reconcile dependencies, portability, and release documentation | P2 | 6 |
| NW-07 | Keep continuity and project memory mechanically coherent | P2 | 0 / 6 |

NW-15 is out of scope: COMPLETE under its own W10 owner.

## Revalidation duty

Every finding is a review-time hypothesis, not established truth. Before
implementing one, reproduce its evidence against live code with a focused
probe or failing test. Where current code or W10 outcomes contradict the
plan, the live evidence wins: record the contradiction, update the finding
status with its resolution evidence, and preserve the original rationale.

A finding closed as ALREADY SATISFIED needs the same standard of proof as one
closed by a repair.

## Hard safety boundaries

LOCAL only.

NOT AUTHORIZED:

- DEV / NEXT / production contact; cloud, datastore or infrastructure work;
- C-07 DEV, C-08b, C-12 / C-13 / C-14 live execution;
- Slack / Leslie / Pondr / Notion; external filing or comment;
- credential, deployment or owner-scope-freeze changes;
- sibling repository writes; sibling roots stay read-only;
- force push, rebase of another session, amend of integrated history,
  destructive Git recovery, `git stash`, or broad `clean`/`restore`/`reset`
  across paths this session does not own;
- retiring, pruning, adopting or editing another session to create capacity;
- arbitrary reasoner shell / Git / network / filesystem authority;
- weakening a gate, deleting a test, or lowering an admission requirement to
  produce green output.

Offline tests use fabricated inputs only: no credentials, no private owner
findings, no customer data, no environment contact.

## Required deliverables

For each in-scope finding:

1. a focused adversarial regression that fails against the defect and passes
   after the repair, using synthetic inputs in disposable directories;
2. the repair itself, additive and old-reader compatible;
3. the finding's own acceptance criteria satisfied with exact recorded
   evidence — counts, receipts, codes, not adjectives;
4. an updated finding status in the master plan with resolution evidence.

For the campaign:

5. the repository-level definition of done in plan section 7, item by item,
   with each unavailable external/host lane reported as UNAVAILABLE rather
   than inherited as PASS;
6. full certification at one integrated candidate checkpoint.

## Milestone map

| Milestone | Content |
| --- | --- |
| M0 | Execution truth: live Git/session/workspace baseline, plan reconciliation, per-finding revalidation order |
| M1 | NW-06 prospective worktree admission and bounded rollback |
| M2 | NW-01 closed reasoner-facing vocabularies |
| M3 | NW-02 topology-independent private-path policy |
| M4 | NW-03 Bug Atlas confinement and safe publication |
| M5 | NW-13 content-free parser diagnostics |
| M6 | NW-04 bounded crash-safe autonomous checkpoints |
| M7 | NW-05 single abortable Phase-5 relay deadline |
| M8 | NW-12 bounded per-client SSE state |
| M9 | NW-09 / NW-10 / NW-11 operator dashboard workflow |
| M10 | NW-08 complete classified test and package universe |
| M11 | NW-14 dependency, portability and release documentation truth |
| M12 | NW-07 residual continuity and project-memory coherence |
| M13 | Repository certification at one candidate checkpoint |

Shared path, error and DTO contracts freeze before their consumers change.

## Completion criteria

1. Every in-scope finding is CLOSED with acceptance evidence, or explicitly
   DEFERRED with impact, reason, owner decision and revisit condition.
2. No unresolved P0/P1 remains in local release scope.
3. `session:status`, `workspace:check`, `agent:check`, `handoff:check`,
   `project:check`, `hardening:check` and `git diff --check` pass at the
   candidate checkpoint.
4. Root typecheck, UI typecheck/tests/build, the complete classified offline
   regression, `npm test`, `gate:local` and a fresh `gate:clean` pass, with
   exact receipts recorded.
5. Prototype-name and coercion probes fail before effects; valid persisted
   protocol inputs still load.
6. Every private store and auth path rejects canonical, sibling, linked
   worktree, traversal and unsafe-symlink targets, with synthetic sentinels
   unchanged.
7. Crash injection yields the complete prior or new checkpoint generation;
   same-ID writers cannot silently clobber.
8. Timeout, cancel and disconnect leave no active owned fetch, read or
   process after the cleanup grace period.
9. Every discovered executable test or check belongs to exactly one required
   or explicitly excluded class, with an inventory digest recorded.
10. Git contains no raw findings, auth state, credentials, customer data or
    transient machine paths.
11. Work is committed in this owned session and integrated only by verified
    fast-forward compare-and-swap.

Completion of this campaign grants no DEV/NEXT/production, publication or
organizational release authority.

## Declared Deletions

NONE.

Any tracked-file deletion discovered to be necessary is declared here, with
its reason, before the commit that performs it.
