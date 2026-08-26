# Control Center Authority Integration + Whole-Repository Hardening V2 Report

Status: COMPLETE
Task ID: nightwatch-control-center-authority-integration-v2
Phase: CONTROL-CENTER-AUTHORITY-INTEGRATION-V2
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Starting SHA: ccbb57721d99020667881481411aa961d12229e5
Last validated implementation SHA: 76f5de9b09cdba930d89c7b74247c6579232a436
Last substantive checkpoint SHA: 76f5de9b09cdba930d89c7b74247c6579232a436
Last documentation checkpoint SHA: 061804f64cefd251fa58388bb519804bff990eed
Live HEAD authority: GIT
Final CI authority: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Terminal handoff

The V2 campaign is complete as a local, loopback-only, read-only, synthetic
integration. The normal launcher now composes bounded local run evidence,
approved source intelligence, Phase 24/campaign intelligence, and owner-local
finding metadata through the existing V1 adapters and server. The seven-view
Control Center remains an observability surface, not a new execution or truth
authority.

The validated substantive implementation is
`76f5de9b09cdba930d89c7b74247c6579232a436`. The final documentation
checkpoint recorded here was known before this report was committed; live HEAD
and any later documentation descendant are discovered from Git. External CI
was not run for this campaign and is not claimed green.

## Authoritative producer, reader, and consumer map

| Surface | Existing producer/authority | Bounded reader or bridge | Existing consumer |
|---|---|---|---|
| Runs, timeline, execution graph | `RunRecorder` manifests, summaries, typed events, and repository metadata under the repository-owned `artifacts/` root | `src/controlCenter/authorities/runEvidenceReader.ts` | Run/timeline/graph adapters, loopback routes, and the Runs/Execution views |
| Source summary and surfaces | Approved sibling-source scan, cache/currentness, and source-surface discovery | `src/controlCenter/authorities/sourceAuthority.ts` | Source adapter, source routes, and the Source view |
| Campaign and coverage | Phase 24 source-derived portfolio/selection plus existing campaign-intelligence coverage, impact, and planner contracts | `src/controlCenter/authorities/campaignAuthority.ts` | Campaign adapter, campaign routes, and the Campaign view |
| Findings | Owner-local private artifact root, dossier validators, and the existing triage artifact facade | `src/controlCenter/authorities/findingsAuthority.ts` | Findings adapter, findings route, and the Findings view |
| Health, readiness, meta, and safety | Existing V1 default collector authorities | Existing collector/adapter path | Overview and Safety views |

The composition path is one bounded in-process read:

`authority producer -> fixed reader/bridge -> snapshot coordinator -> existing adapter allowlist -> loopback API/SSE -> UI view`.

Raw event messages, response bodies, source text, customer values, private
dossier evidence, credentials, cookies, traces, screenshots, arbitrary paths,
and console/network payloads stop before the public DTO boundary. Phase 24
remains the sole campaign selection authority; source intelligence remains the
sole source authority; the existing evidence records remain the run authority.

## Cache, generation, and currentness rules

- `ControlCenterSnapshotCoordinator` has exactly two fixed cache keys,
  `run-evidence` and `authority`, with at most two entries and a configured TTL
  capped at ten seconds.
- A successful read stores only validated domain snapshots and a digest-only
  generation identity. The authority generation composes source, campaign, and
  findings generations, so campaign data cannot be paired with a different
  source incarnation.
- Same-key refreshes share one in-flight promise. A failed refresh exposes its
  explicit categorical fallback and retains only the last-known-good generation
  as diagnostic metadata; stale data is never relabeled CURRENT.
- Failed entries remain bounded and retry after expiry. Shutdown is terminal:
  it clears entries, refuses new refreshes, and does not retain a completing
  in-flight read.
- SSE is advisory notification-only state. Its fixed event allowlist rejects
  unsafe identities, unknown types, extra fields, and replayed/out-of-order
  sequences; GET snapshots remain authoritative. The hub is bounded and
  terminal after close.

## Adversarial coverage and disposition

The reader and server matrices cover unsafe IDs, traversal, symlinks,
non-regular files, oversized records, unstable reads, unknown schemas,
duplicate sequence/identity records, malformed evidence, privacy sentinels,
source stale/unavailable/cache drift, campaign selector drift, malformed or
partial private dossiers, permission/mode failures, duplicate findings,
coordinator coalescing and shutdown races, unsafe/replayed SSE events,
loopback/access-method violations, external-request attempts, raw sentinel
leakage, console/page errors, bundle policy, and loss of selected-run state
across advisory refresh.

The built-server synthetic browser qualification proves non-empty Overview,
Safety, Runs, Execution, Campaign, Source, and Findings views through the
normal launcher composition. It also proves selected-run stability across an
advisory SSE notification and rejects external requests and raw sentinels.

## Whole-repository hardening audit

| Audit area | Coverage and disposition |
|---|---|
| Safety and authority | Control Center impact-root review found no Critical/High defect; owner-scope freeze, loopback binding, read-only routes, and domain-authority ownership remain enforced |
| Continuity and recovery | ACTIVE_TASK, STATE, PLAN, and REPORT use continuity v2; strict history audit reported zero strict errors; legacy v1 records remain warnings-only |
| Determinism and provenance | Reader ordering, generation digests, source currentness, Phase 24 selection, cache identity, SSE sequence handling, and synthetic browser data are deterministic and provenance-bound |
| Persistence and privacy | Public projections are allowlisted metadata; owner-local findings remain outside Git; no raw source/body/customer/auth material crossed the projection boundary |
| Concurrency, process, and filesystem | No HTTP child process, shell, network, watcher, browser action, Git mutation, arbitrary root, or broad cleanup path is reachable from the Control Center cone |
| Validation, gates, and CI | Static, hardening, project truth, continuity, semantic compatibility, owner provenance, synthetic campaign, local, clean Node20, UI, browser, and full regression checks passed; external CI was not run |
| Workspace and generated output | Hygiene status remains PRESERVED with dirty/missing/prunable/unlinked/ambiguous state untouched; generated-output retention is observe-only and owner-controlled |

The audit reproduced one low-risk hygiene reporting defect: the ignored-output
probe disabled untracked entries and therefore always reported zero. The repair
only changed the bounded read-only Git observation mode and added a no-mutation
synthetic regression. No cleanup or deletion was performed. No Critical or
High defect was reproduced.

## Changed public contracts and runtime surfaces

- Run collection adds explicit collection state/reason projection while
  preserving historical V1 fixtures and detail/timeline DTO compatibility.
- Source, campaign, and findings adapters consume additive authority metadata,
  generation, and categorical state projections; raw internal authority
  structures remain private to their readers.
- The snapshot coordinator defines bounded generation, fallback, coalescing,
  TTL, and terminal-shutdown behavior for the default collector.
- The SSE event contract is a fixed sanitized notification allowlist with
  bounded subscribers and replay-safe sequencing; it does not carry snapshot
  authority.
- The launcher exposes only a repository-confined built UI and loopback port;
  it rejects environment/product, host, sharing, open, and path escapes.
- The hygiene command reports ignored generated output without adding automatic
  deletion or mutation authority.

## Validation ledger

- `npm run typecheck` — PASS.
- `npm run hardening:check` — PASS.
- Affected Control Center/hygiene Playwright suite — PASS, 48 passed, 0 failed.
- `npm run control-center:ui:typecheck` — PASS.
- `npm run control-center:ui:test` — PASS, 11 passed, 0 failed.
- `npm run control-center:ui:build` — PASS, 257471 bytes total; no external
  references or embedded content.
- `npm run control-center:ui:browser` — PASS, 1 passed, 0 failed.
- Built loopback `agent-browser` visual check — PASS; Overview and Runs were
  inspected locally with no external/authenticated state.
- `npm run agent:audit` — PASS, zero strict v2 errors; expected legacy-history
  warnings remain.
- `npm run project:check` — PASS, project-state v1 and promotion authority
  `NONE`.
- `npm run quality-gate:spec` and `npm run gate:inventory` — PASS.
- `npm run test:semantic-compat` — PASS, 1,883 total / 1,870 passed / 13
  skipped / 0 failed across 22 phases and 141 files.
- `npm run test:owner-provenance` — PASS, 91/91.
- `npm run campaign:synthetic` — PASS, 61/61.
- `npm run gate:local` — PASS, receipt
  `receipt:sha256:0418c067ad0839582ef21427`; all nine required groups passed,
  including semantic compatibility 1,871 passed / 13 skipped / 0 failed,
  owner provenance 91/91, and synthetic campaign 61/61.
- `npm run gate:clean` — PASS, Node20 `npm ci` disposable checkout; receipt
  `clean-receipt:sha256:8cc28a83b3c1a90629fba0ce`; clean before/after, no auth
  or owner finding state, and zero sibling writes.
- `npm run hygiene:status` — PASS/PRESERVED after the full regression: 17
  registrations, 35 branches, 0 safe cleanup targets, 0 applied actions, 3
  generated-output families, and 10,061 ignored entries; no workspace or
  generated output was removed.
- `npm test -- --workers=1` — PASS, 2,518 enumerated / 2,502 passed / 16
  skipped / 0 failed.
- `git diff --check` — PASS; the final documentation/privacy review found no
  credential, bearer-key, private-key, raw customer-value, or owner-finding
  material.

## Privacy, safety, and external-state review

All implementation and validation stayed local, loopback-only, read-only, and
synthetic. There was no DEV, NEXT, production, authenticated browser/API,
database/datastore, cloud/infrastructure, sibling write, publication,
message/issue, real campaign, auth capture, or external CI operation. The
owner-frozen infrastructure/data policy remains unchanged. Real findings and
authenticated state remain outside Git under the owner-only local policy.

## Deferred / follow-up

Remote hosting, execution or mutation controls, raw evidence/source drill-down,
database/index persistence, multi-user authentication, graph-engine changes,
generated-output retention policy, and all owner-blocked infrastructure/data
work remain out of scope. Any future campaign must use a new task, fresh
authorization, and fresh evidence rather than reopening this completed task.

## Continuity and Git closure

M0–M8 are terminal. ACTIVE_TASK, STATE, PLAN, and REPORT agree on COMPLETE;
the current milestone, work-in-progress, next action, resume recipe, and
completion snapshot are terminal; and the plan contains no open milestones.
The final non-forced push completed after validation, and a clean read-only Git
check verified local `HEAD == origin/main`. The live head is intentionally not
duplicated in this report; discover it from Git under the declared authority.
