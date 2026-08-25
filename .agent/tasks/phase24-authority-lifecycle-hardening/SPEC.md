# Nightwatch Executor Campaign — Phase 24 Authority Lifecycle + Whole-Repository Hardening

Task ID: phase24-authority-lifecycle-hardening
Phase: 24-AUTHORITY-LIFECYCLE-HARDENING
Authorization class: PHASE_24_AUTHORITY_LIFECYCLE_HARDENING_LOCAL_SOURCE_SYNTHETIC_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Frozen intent

Continue the planner-authorized Nightwatch hardening campaign from the live
Git state after a fresh bounded source census. The campaign has three
mandatory stages: first, harden Phase 24 authority lifecycle and stale
artifact invalidation semantics; second, perform a genuine whole-repository
hardening audit and repair reproduced Critical or High defects, with only
bounded Medium repairs; third, inventory and safely reconcile local
worktrees, branches, generated output, and workspace hygiene while adding a
durable dry-run-first hygiene mechanism.

The campaign is local, source-read-only, deterministic, and synthetic-only.
Phase 24 remains the sole candidate and portfolio authority. No new
promotion authority is created. The owner freeze remains executable policy:
infrastructure, cloud, Kubernetes, IAM, datastore, production SQL, runtime
role, deployment archaeology, external publication, and real product
execution are out of scope.

## Starting evidence

The live Nightwatch checkout is `main` at `755cb2e611355011c9d249142b2c2bf4f112327a`,
equal to `origin/main`. The approved local source census is current for all
six repositories and has config digest
`srcconfig:sha256:e8bdfc8f0e58d7d93a87215`, snapshot digest
`srcsnapshot:sha256:04ff583971865f335902f5ad`, 1,732 files considered, 1,092
read, 1,078 admitted, 654 rejected, and 12,449,877 bytes read. The six
source SHAs are recorded as safe identity only:

- `alphauslabs/blue-sdk-go` — `8883ee3d3a073352626c8c35e20e9fc5ed765373`
- `alphauslabs/blueapi` — `691422e5dc81afd263d064986fb50fcb3ea432a9`
- `alphauslabs/grpc-chunk-parser` — `66802f281698dfcf0903f0a117d4637fce3fd945`
- `mobingilabs/ouchan` — `565f00a87fb7616cc23c45d4ffeabee38a41c65f`
- `mobingilabs/ripple-api` — `27bb007ad0c798800b6bd3b29760c966422966e7`
- `mobingilabs/ripple-ui` — `d80b161b684d9153c7e5acaa65ae1752d93d8ba9`

The baseline discovery remains 128 bounded operations, 127 route proofs,
127 request contracts, 83 response contracts, 175 semantic observations, 118
proven joins, 10 rejected joins, and 13 response-flow attempts with no
proven flow. These values are evidence to compare, not authority to promote
or execute.

## Scope

Stage A must audit and, where a deterministic defect is reproduced, repair
the Phase 24 authority lifecycle cone: candidate identity and incarnation,
source snapshot/currentness, source availability, invalidation ledger,
portfolio and selection authority, replay plans and results, rehearsal,
dossiers, manifests, caches, triage, semantic receipts, and observability.
The audit covers the Phase 24 core modules and all downstream consumers named
by the execution prompt, plus relevant Phase 25–28, response-flow, source,
provenance, campaign-intelligence, repository, and project-state seams.

Required adversarial coverage includes stable logical candidates with changed
SHA/evidence/currentness, candidate-ID changes, removal/reappearance and key
reuse, per-repository availability and recovery, omitted versus asserted
`sourceSnapshotMatches`, and old/new manifest, replay, dossier, selection,
and cache artifacts. Every admitted artifact must be bound to the canonical
authority and exact source incarnation, or fail closed.

Stage B must inspect the whole repository across safety/containment,
continuity/recovery/idempotence, determinism/provenance, concurrency/process/
filesystem/workspace, input/failure semantics, tests/gates/negative space,
and dead assumptions. Reproducible Critical and High defects are in scope;
Medium repairs are bounded to defects with clear local evidence.

Stage C must inventory Git worktrees and branches, dirty/untracked state,
reachability, generated outputs, and ignored output families. It must never
discard dirty, unmerged, or ambiguous work. Only safe clean registrations
whose tips are reachable from canonical main may be removed, with normal
worktree removal followed by pruning and normal branch deletion. A durable
`hygiene:status` and dry-run-first `hygiene:clean`/`--apply` mechanism is
required if the existing repository has no equivalent.

## Non-goals

- No DEV, NEXT, production, browser authentication, real campaign, database,
  cloud, infrastructure, deployment, or external API contact.
- No Alphaus repository modification, installation, publication, message,
  issue, pull request, or finding upload.
- No raw sibling source, credentials, cookies, bearer values, customer data,
  literal payloads, or owner-only findings in Git, task files, diagnostics,
  caches, fingerprints, dossiers, or error messages.
- No broad rewrite of Phase 24 authority, no autonomous canonical promotion,
  and no Phase 9B/10B contained-DEV acceptance.
- No force-push, hard reset, broad clean, branch deletion by force, or forced
  worktree removal.

## Required completion evidence

The final task report must enumerate the Phase 24 authority graph audited,
the whole-repository audit inventory and disposition, the initial and final
hygiene inventory, source census and SHAs, every changed contract and version,
privacy/safety review, exact validation results, and final local/remote Git
equality. The task remains active until all mandatory stages and acceptance
checks are complete; a green Phase 24-focused suite alone is insufficient.
