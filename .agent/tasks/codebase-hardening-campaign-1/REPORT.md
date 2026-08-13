# Nightwatch Codebase Hardening Campaign I — Report

Status: COMPLETE

## Checkpoint identity

- Starting SHA: `c14aebff9ae85814aa31f518e7f8fa4afbdeb7da`.
- Final validated implementation SHA: `78cd8d60f6a743985d5b0eae2560f6d06c40dbe4`.
- Final substantive source checkpoint: `78cd8d60f6a743985d5b0eae2560f6d06c40dbe4`.
- Last non-self-referential pushed source SHA: `78cd8d60f6a743985d5b0eae2560f6d06c40dbe4`.
- The final documentation commit and clean `HEAD == origin/main` were
  verified after this report was committed; the exact final Git SHA is given
  in the completion response. A task report does not embed its own commit
  SHA, because that would be self-referential.
- Phase 7: `COMPLETE`; historical real run remains
  `PARTIAL_BUDGET_EXHAUSTED / BUDGET_EXHAUSTED`.
- Phase 6: `FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.

## Threat model and review tracks

The campaign addressed accidental durable-state corruption, stale or
cross-version state, malformed manually edited files, partial writes, resume
budget reset, ambient child-environment leakage, CWD/filesystem redirection,
policy provenance errors, executable substitution, misleading summaries,
incomplete compile/test coverage, and safety-code auditability. Malicious root,
OS/kernel compromise, and physical compromise remain out of scope; no
cryptographic key-management layer was added.

Five independent read-only tracks were run and reconciled by source evidence:

- A: campaign persistence, resume, and budget.
- B: process, environment, secret, and filesystem boundaries.
- C: network, environment, owner policy, and executable safety.
- D: triage and morning-brief evidence truthfulness.
- E: maintainability, typecheck, test, and CI coverage.

Workers did not edit the repository. No finding was accepted by vote alone.

## Findings confirmed and repaired

- Persisted manifest fingerprints were syntax-checked without independent
  recomputation. Runtime validation now reconstructs campaign ID and
  fingerprint and checks exact selection arrays, seeds, work order, identity,
  lineage, budgets, versions, owner scope, and unknown fields.
- Checkpoint reads lacked a complete runtime boundary. Resume now rejects
  malformed schema, counters, budget arithmetic, ledger/queue references,
  state/result combinations, safety/privacy counters, timestamps, terminal
  state, and version drift before any executor callback.
- The bounded profile could consume all browser coverage capacity before a
  qualifying reproduction. Deterministic feasibility analysis now reserves
  bounded reproduction/minimization capacity and reduces optional coverage
  before manifest freeze.
- Multi-dimensional budget reservations could partially charge, and an
  interrupted RUNNING marker could precede its reservation. Reservations are
  atomic and the reservation/checkpoint order is crash-safe for retry charge.
- Sensitive children inherited ambient `process.env`. Sensitive launchers now
  use one explicit allowlist builder and synthetic sentinel tests.
- Private/storage roots relied on CWD or weak path/permission checks. Stable
  roots, no-symlink checks, owner-only modes, atomic writes, fsync, and
  post-write validation are now used.
- Environment configuration had an ambient CWD fallback. The canonical
  repository config is now authoritative and malicious-CWD fixtures are
  ignored/rejected.
- Oops source SHA metadata did not bind executable bytes. The restricted
  adapter now validates an absolute owner-controlled regular executable,
  rejects symlink/substitution paths, hashes actual bytes with SHA-256, and
  compares the result to an expected digest.
- Morning briefs could make unresolved L0 observations look clean. Brief DTOs
  and headlines now distinguish no observations, transients, unresolved L0,
  budget-blocked reproduction, auth blocks, shared failures, Nightwatch
  defects, and admitted findings.
- Persisted candidate/brief material was too permissive. Structural allowlists
  now exclude executable callbacks and unknown nested fields; marker/regex
  privacy checks remain defense in depth.
- Root Playwright configs were incomplete for TypeScript, and launcher static
  checking/CI was absent. Root config inclusion, `// @ts-check`, bounded child
  pipes, `hardening:check`, and private read-only CI now exist.
- Continuity fields were ambiguous and the validator could not distinguish an
  approved documentation-only remote descendant from source drift. Explicit
  SHA fields and a narrow documentation-only advancement rule now preserve
  this distinction.

## Findings rejected, expected, or deferred

- Automated NEXT widening was not confirmed in the Phase 7 path. Automated
  credential-bearing execution is DEV-only; NEXT remains a separately visible
  human-led `auth:capture` exception.
- Production hosts, unknown hosts, mutation/UNKNOWN tripwires, and the Phase 6
  owner gate were already fail-closed and remain so.
- Oops shell=false, fixed arguments, explicit environment, bounded output,
  restricted KNOWN_READ, and prohibited-feature checks were already strong and
  were preserved.
- The multi-hour budget is a library profile with no supported launcher or
  resume upgrade path; launchers are statically checked for references.
- A broad orchestrator rewrite and mass JavaScript migration were deferred;
  characterization coverage and strict persistence seams gave a lower-risk
  audit improvement.

## Manifest integrity

Before: persisted reads validated shape, syntax, and selected compatibility but
did not independently recompute the manifest fingerprint.

After: campaign ID and manifest fingerprint are recomputed and compared
exactly. Selection arrays, seed set, work-item order/uniqueness, kind-specific
lineage, API operation identity, linked work, source snapshot/window, owner
scope, versions, budget derivations, and exact allowed fields are validated.
Corruption raises a sanitized `CAMPAIGN_MANIFEST_INTEGRITY_INVALID`-class
failure.

Tamper fixtures cover changed work-item ID/kind/journey/API identity/seed/order,
duplicate order/work, removal/addition, selection arrays, budget, source
snapshot/window, owner scope, versions, fingerprint, old-fingerprint plus
executable-field change, and unknown execution material. All modified logical
manifests reject unless rebuilt through canonical construction.

## Checkpoint integrity

Before: narrow schema/campaign checks could allow typed JSON to become resume
authority without exhaustive semantic validation.

After: strict validation checks exact schema, campaign ID, manifest fingerprint,
source/selection/seeds, finite non-negative counters, policy-minus-used budget
arithmetic, exact ledger coverage, duplicate/unknown/missing work, kind/state/
result/attempt semantics, safety/privacy counters, privacy status, queues,
cluster/candidate/dossier references, timestamps, version drift, and terminal
state. Validation runs before executor callbacks.

Corruption fixtures cover negative/reset/excess/incorrect budgets, duplicate or
unknown work, wrong kind, overlap/missing work, impossible terminal classes,
contradictory budget/auth states, negative safety, privacy mismatch, changed
campaign/fingerprint, unknown and duplicate cluster references, schema/type
errors, malformed JSON, and truncated JSON. Interrupted work persists as
`REPLAY_REQUIRED`; resume does not reset consumed budget.

## Budget feasibility

The confirmed real-run finding was genuine: the original six-browser-context
profile spent three contexts on J1/J2/J3 and three on E1/E2/E3, leaving no
fresh browser capacity for a qualifying L0 reproduction.

The absolute bounded caps were not increased:

| Dimension | Before | After |
|---|---:|---:|
| Total browser contexts | 6 | 6 |
| Journey contexts | 3 | 3 |
| Optional exploration contexts | 3 | 0 |
| API executions | 6 | 6 |
| Replays | 8 | 8 |
| Minimization candidates | 4 | 4 |
| Total actions | 24 | 24 |
| Runtime | 15 minutes | 15 minutes |
| Promoted clusters | 3 | 1 |

The planner reserves one browser/API/replay/action/minimization opportunity
for bounded triage, reduces optional exploration, and trims API breadth when
needed before freeze. Impossible profiles reject before execution. The
multi-hour profile remains unreachable from supported real launchers.

## Child-process audit

Sensitive launcher sites audited include Phase 7/5/4/2B/2C real launchers,
authenticated observation, auth capture, the Nightwatch CLI, observer gates,
Git/snapshot/Oops/sandbox subprocesses, and local preflight. The audit records
binary/argv, shell mode, environment source, CWD, timeout, buffer/output
handling, cleanup, and policy gates. Sensitive execution uses `shell: false`,
finite timeouts/buffers, and no arbitrary shell fragments.

Before: authenticated Phase 7 launch inherited the entire parent environment.

After: child environments are default-deny allowlists containing only proven
runtime variables, explicit `NIGHTWATCH_*` values, and required safe locale,
path, home, temp, display, and Playwright settings. Raw child stdout/stderr is
pipe-bounded and not forwarded. Human auth remains an explicit parent-terminal
wait around a headed browser.

The fake sentinel fixture covers AWS, Google, GitHub, Slack, OpenAI,
Anthropic, NPM, SSH, custom, and randomized parent variables. All unrelated
sentinels are absent: PASS.

## Filesystem and configuration boundaries

Private artifacts and storage state use stable module/repository-derived roots,
not arbitrary launch CWD. Real roots/files require external location, regular
file checks, owner checks where available, owner-only modes, safe names, no
path traversal, no symlink components, exclusive temporary creation, fsync,
atomic rename, and post-write permission checks.

Synthetic tests cover Nightwatch/workspace/nested/unrelated CWDs, malicious CWD
config, root/parent/destination/state/credential symlinks, path escape,
permission failures, and interrupted/colliding temporary writes. The
authoritative environment config never comes from a fake CWD file.

## Target policy and production deny

Automated credential-bearing observation is explicitly DEV-only and requires
exact storage-state provenance. NEXT is supported only in the distinct
human-led auth-capture flow. Production selection, known production hosts, and
unknown sibling hosts remain denied before network/executor callbacks. No
production attempt occurred.

## Oops provenance

The restricted Oops boundary retains shell=false, fixed arguments, explicit
allowlisted environment, bounded output, owner-only temporary workspace, and
prohibited-feature validation. It additionally hashes the actual binary and
requires exact expected digest equality. Source repository HEAD remains
separate provenance metadata; source SHA alone is not claimed to prove binary
contents. No unrestricted Oops mode or Alphaus source build was run.

## Morning brief truthfulness

Owner-facing summaries now distinguish:

- no anomalies observed;
- no admitted reproducible product anomalies;
- unresolved L0 candidates;
- reproduction blocked by budget;
- transients not reproduced;
- admitted L1/L2 findings;
- shared DEV failure;
- auth blocked;
- Nightwatch internal defect.

The matrix covers zero observations, benign transient, one/three L0 candidates,
budget exhaustion, admitted L1/L2, failure storm, auth block, partial budget,
and clean completion. Unresolved L0 evidence cannot render as an ordinary
clean headline.

## Typecheck, static checks, and CI

- `tsconfig.json` includes `playwright*.config.ts`; all root Playwright config
  files are covered by `npm run typecheck`.
- High-value safety launchers use `// @ts-check`, explicit child environment,
  shell=false, timeouts, bounded output, and no raw output forwarding.
- `npm run hardening:check` is deterministic and offline. It checks launcher
  boundaries, target policy, multi-hour references, private tracked paths,
  Phase 6 owner gating, config coverage, and Node syntax.
- `.github/workflows/hardening.yml` uses `contents: read`, no secrets, no
  authenticated/DEV runs, no databases/infrastructure, no artifact upload,
  and a bounded timeout. It runs install, typecheck, hardening, agent-state,
  synthetic campaign, and diff checks. It does not prove real authenticated
  target behavior or local owner filesystem permissions.

## Dependencies and continuity

Dependencies were audited and unchanged: existing Playwright, TypeScript/
Node-types, and Vue packages remain the declared surface. No framework upgrade,
new lint/security stack, or advisory gate was introduced. Clean installation
reported the pre-existing Vue 2 EOL notice and one low audit advisory; this
campaign did not broaden dependency scope.

Continuity fields distinguish validated implementation, substantive checkpoint,
documentation checkpoint, pushed SHA, and local/remote verification. Source
drift remains stale; only the narrow approved task/documentation paths may
advance after a validated source baseline. The validator accepts an approved
documentation-only remote descendant without requiring STATE.md to contain its
own commit hash.

## Maintainability, exhaustiveness, errors, and privacy

Large/high-risk modules were reviewed by responsibility, state/branch density,
coupling, duplicated invariant logic, error paths, trust-boundary mixing, and
focused coverage. No size-only refactor was justified. The orchestrator keeps
characterization coverage and now has strict persistence seams; broad
decomposition remains deferred.

Runtime validators cover manifest, checkpoint, brief, work state/result,
reproduction, evidence, safety, and privacy classes. A broad `assertNever`
rewrite was deferred where it would not improve current auditability. Safety,
owner-policy, privacy, auth, version-drift, corrupt-state, budget, and internal
defect classifications remain distinct and sanitized.

Durable manifest, checkpoint, candidate, dossier, and brief DTOs allowlist
approved metadata structurally. Regex/marker privacy defenses remain as a
second layer. No credentials, storage state, private findings, customer
identifiers/values, raw authenticated bodies, DOM, screenshots, or traces were
persisted or committed.

## Validation results

- Focused integrated hardening sweep: `135/135` passed, one worker.
- Storage/auth regression sweep: `30/30` passed.
- Agent-state validator tests: `14/14` passed.
- Synthetic campaign: `24/24` passed.
- Full existing Playwright suite: `396/396` passed, one worker.
- `npm run typecheck`: PASS.
- `npm run hardening:check`: PASS.
- `for f in bin/*.mjs; do node --check "$f"; done`: PASS.
- `npm run agent:check`: PASS with the expected approved-documentation
  checkpoint warning before and after the final documentation push.
- `git diff --check`: PASS.
- Clean source-only checkout at `78cd8d6`: `npm ci --ignore-scripts`,
  typecheck, hardening check, and synthetic campaign all PASS; no runtime or
  private files were present.
- No real DEV campaign, auth capture, real journey/exploration, or real Phase 5
  API execution was run.

## Safety and privacy counters

- Product DEV contacts: 0.
- NEXT contacts: 0.
- Production attempts: 0.
- Database queries: 0.
- Infrastructure queries: 0.
- External publication attempts: 0.
- Credentials/storage state persisted: 0.
- Customer values persisted: 0.
- Alphaus repositories modified: 0.
- Runtime campaign Git pushes: 0.
- Development pushes: only validated source/documentation checkpoints to the
  authorized private `origin/main`.

## Architecture review

- Corrupted manifest executes undetected: NO.
- Corrupted checkpoint resets budget: NO.
- Checkpoint references unknown work: NO.
- Arbitrary parent secret enters audited authenticated child: NO.
- CWD changes authoritative environment config: NO.
- CWD redirects private artifacts into the repository: NO.
- Supported symlink/path redirects real private artifacts: NO.
- NEXT becomes an automated credential target: NO.
- Unverified Oops executable masquerades as expected build: NO within the
  restricted adapter.
- Initial bounded coverage silently starves promised reproduction: NO; reserve
  is analyzed before freeze.
- Unresolved L0 candidates disappear behind a clean headline: NO.
- All root TypeScript configs are checked: YES.
- Remote CI independently proves useful source/fixture invariants: YES; its
  non-goals are explicit.
- Orchestrator remains reasonably auditable: YES through strict persistence
  seams and characterization coverage; decomposition debt is explicit.

## Final adversarial review

Manifest corruption, checkpoint corruption, budget reset, replay starvation,
environment/argv leakage, shell execution, CWD/repository confusion, symlink
escape, path traversal, unsafe permissions, private Git surface, production or
NEXT widening, owner-scope bypass, Phase 6 reachability, Oops substitution,
raw child output, unsafe catch conversion, misleading briefs, CI secrets/DEV
execution/artifacts, and runtime Git publication were explicitly rechecked.
Scoped defects were repaired; expected controls remain unchanged.

## Remaining hardening debt

- No real DEV regression was run by owner direction. A future separately
  approved task may perform the smallest DEV check if needed; this task has no
  evidence that requires it.
- The orchestrator and several diagnostics modules remain large; further
  extraction should be separately characterized and owner-approved.
- GitHub Actions execution itself remains pending until GitHub schedules the
  private workflow; local-equivalent checks and its safety design pass here.
- The existing Vue 2 lifecycle/dependency advisory remains outside this
  narrowly scoped hardening campaign.

## Acceptance verdict

PASS. The hardening campaign added no feature phase or bug-hunting capability,
preserved Phase 7 completion and the Phase 6 owner freeze, performed no real
product/DEV/production/data/infrastructure activity, passed the local and
synthetic validation ledger, and left a validated private source plus durable
task closure ready for final Git equality verification.
