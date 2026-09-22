# Nightwatch audit backlog inventory (READ-ONLY recon)

Repo: `/home/dalepalaca/.nightwatch/worktrees/nightwatch-priority-audit-remedi-0e17af9c`
HEAD: `24098097` (branch `session/nightwatch-priority-audit-remedi-0e17af9c`)

## Audit source

Single master document: `openspec/changes/nightwatch-exhaustive-repository-audit-proposals-v1/audit.md` (717 lines).
- Finding ledger table (main 43 IDs): `audit.md:114-153`
- M1 dispositions (001–014): `audit.md:157-175`; M2 (015–022): `audit.md:177-197`
- M3 (023–043): `audit.md:200-221`; M5 admits **044–047**: `audit.md:326-346`; M6 admits **048**: `audit.md:357-365`
- Severity rationale: `audit.md:493-610`; validation ledger: `audit.md:612-712`
Supporting: same dir `proposal.md`, `design.md`, `tasks.md`; per-finding task dirs under `.agent/tasks/nightwatch-*` and one dedicated `openspec/changes/<name>-v1` per material finding (45 total).
Total IDs: **48** (NW-AUD-001…048). 45 material → 45 apply-ready but (mostly) unimplemented changes; 002/008 DUPLICATE, 003 NOT_AN_ISSUE.
Confidence is **High for every finding** (column constant in ledger). Severity as listed below.

## Status legend
- **IMPL** = implemented on this branch (commit(s) noted, verified against source)
- **PLAN-CAMPAIGN** = authorized next in active campaign `nightwatch-priority-audit-remediation-sequence-v1` (0/14 tasks done)
- **PLAN-BACKLOG** = dedicated apply-ready change exists, zero tasks done
- **DUP / N-I** = duplicate of existing programme / not an issue
Class: **SAFETY** = safety-blocking (bypass/falsely attest owner policy, containment, authorization, redaction, provenance, secret/customer-data boundary); **DEBT** = product/correctness debt (no direct boundary bypass).

## Inventory

| ID | Title (short) | Sev | Conf | One-line problem | Status | Class |
|---|---|---|---|---|---|---|
| NW-AUD-001 | CI action supply-chain | Med | High | CI runs mutable `@v4` action refs; unanchored substring rule admits lookalike owners | PLAN-BACKLOG (`nightwatch-ci-action-supply-chain-integrity-v1`) | SAFETY |
| NW-AUD-002 | bin typecheck reporting-only | — | — | `bin/**` strict typecheck lane is `REPORTING`, not blocking | DUP → `nightwatch-production-completion-programme-v1` (tasks 15.7/15.11) | — |
| NW-AUD-003 | checks outside manifests | — | — | Historical concern; universe discovery proves 0 unclassified checks | N-I (NW-08 mechanism closed) | — |
| NW-AUD-004 | Toolchain identity | Med | High | Major-only `node@20` selection, unlocked pre-gate resolver, receipts record only `nodeMajor` | PLAN-BACKLOG (`nightwatch-exact-runtime-toolchain-identity-v1`) | SAFETY |
| NW-AUD-005 | Retention receipt crash truth | Med | High | Apply deletes all candidates after recording empty `STARTED` set; final-write failure can still exit 0 with `APPLIED` | PLAN-BACKLOG (`nightwatch-retention-crash-consistent-receipts-v1`) | DEBT (irreversible-delete evidence) |
| NW-AUD-006 | Session mutation authority binding | High | High | Lifecycle commands authorized the selected `--root` record, not the invoking checkout/session | **IMPL** `e54d7540` (+`bin/lib/session-authority.mjs`, `SESSION_MUTATION_ROOT_OVERRIDE_REFUSED` at `bin/nightwatch-session.mjs:1209`); change tasks 30/30 | SAFETY |
| NW-AUD-007 | Offline compiler bootstrap | Med | High | `change:shadow` acquired remote-capable `npx tsc` and rm -rf's shared compile root before admission | PLAN-BACKLOG — **partially drifted fixed**: `npx` replaced by `node_modules/.bin/tsc` (`bin/change-intelligence.mjs:37,57`); pre-admission `rmSync(compileRoot)` still present (`:35`) | DEBT |
| NW-AUD-008 | change:shadow CLI parser | — | — | No shared parser, absolute `outputPath` printed | DUP → production-completion `operator-cli-contract` | — |
| NW-AUD-009 | Local report publication | Med | High | Six report writers truncate-write directly; symlink/interruption can destroy or redirect reports | PLAN-BACKLOG (`nightwatch-local-report-publication-integrity-v1`) — **minor drift**: gate-topology receipt name now ISO stamp not `Date.now()` (`bin/gate-topology.mjs:597-598`), still direct write | DEBT |
| NW-AUD-010 | Release evidence lineage | High | High | `MET` only invalidated for strict ancestor; null/HEAD/missing/divergent evidence stayed MET; Git failure collapsed with negative | **IMPL** `78483ee8` — verified categorical `EXACT/STALE_ANCESTOR/GIT_INDETERMINATE` relations, EXACT-only certify (`src/core/releaseCertification/index.ts:16-91`); change tasks 18/23 (5 struck = evidence-repair/acceptance descoped, see notes) | SAFETY |
| NW-AUD-011 | Promotion apply serialization | Med | High | Two distinct approvals from one preimage can both pass preflight and write shared target; no per-target lease | PLAN-BACKLOG (`nightwatch-canonical-promotion-transaction-serialization-v1`); standing authority NONE | DEBT (owner-gated) |
| NW-AUD-012 | `.env` vs execution authority | Med | High | Validated config snapshot doesn't govern later launcher/child `process.env` reads; permissive parser | PLAN-BACKLOG (`nightwatch-configuration-layer-authority-integrity-v1`); cited files unchanged since audit | DEBT (containment-relevant defaults) |
| NW-AUD-013 | Schema preservation truth | High | High | Export can report `truncated:false` for omitted data; lexical-only ancestry; migration asserts retention unobserved | PLAN-BACKLOG (`nightwatch-schema-preservation-integrity-v1`) | SAFETY (symlink ancestor defeats boundary) |
| NW-AUD-014 | Child-process boundary totality | High | High | Rule checked manual 18-file list vs 53 importing modules; env spreads, acquiring `npx`, unbounded stdio | **IMPL** `ff62ff0b` — verified `bin/lib/childProcessCensus.mjs` + fail-on-unclassified (`process-and-network.mjs:76-80`); tasks 6/16 (sections 3–5 struck = full call-site conversion + mutation proof descoped) | SAFETY |
| NW-AUD-015 | Auth capability bundle txn | Med | High | Auto-refresh never writes digest sidecar; capture commits state and sidecar non-atomically | PLAN-BACKLOG (`nightwatch-auth-capability-bundle-transaction-integrity-v1`) | SAFETY |
| NW-AUD-016 | Proxy instance attestation | High | High | Proxy admission trusts self-asserted state file + any loopback 204; no per-start identity | PLAN-BACKLOG (`nightwatch-proxy-runtime-instance-attestation-v1`) | SAFETY |
| NW-AUD-017 | L6 qualification proof | High | High | All proof fields reported PROVEN though UDP omitted, browser probes untargeted, READY is constant constructor | PLAN-BACKLOG (`nightwatch-l6-qualification-proof-integrity-v1`) | SAFETY |
| NW-AUD-018 | Authenticated evidence minimization | High | High | URL redaction keeps lowercase IDs; constructor/repo-snapshot/notes serialize outside sanitizer; late mode switch doesn't harden dir | **PLAN-CAMPAIGN** M4, 0/14 tasks (`nightwatch-authenticated-evidence-minimization-integrity-v1`) | SAFETY |
| NW-AUD-019 | Private payload structural screening | Med | High | Quoted-key JSON (`{"token":...}`) defeated the labeled-value regex; store/readers relied on it | **IMPL** `21e3f47f` + `1b338d20` + `24098097` — verified `PRIVATE_VALUE_RE` quote-tolerant + structural walk primary (`src/core/policy/privateScreening.ts:22-25`), `nightwatch.private-screening.v2`, store+runEvidenceReader wired; **caveats: tasks 4.1–5.2 unchecked, 2.2/3.3 PARTIAL-deferred, dirty working tree, STATE.md stale** (see notes) | SAFETY |
| NW-AUD-020 | Semantic request admission | High | High | Unknown API requests continued passive/outside intent; 250 ms intent vs 10 s settlement; redirect backstop host-only | **PLAN-CAMPAIGN** M5, 0/14 tasks (`nightwatch-semantic-request-admission-integrity-v1`) | SAFETY |
| NW-AUD-021 | DEV credential use binding | High | High | Fill/force-submit not revalidated against the approved live document/form per secret-bearing effect | PLAN-BACKLOG (`nightwatch-dev-credential-use-binding-v1`) | SAFETY |
| NW-AUD-022 | Proxy evidence-effect ordering | Med | High | HTTP/CONNECT/Upgrade begin effect before awaited event append; evidence failure can miss current request | PLAN-BACKLOG (`nightwatch-proxy-evidence-effect-ordering-v1`) | SAFETY (containment evidence invariant) |
| NW-AUD-023 | Browser context transaction | High | High | Context/page created before fallible setup with no rollback; popup guard unawaited | PLAN-BACKLOG (`nightwatch-browser-context-guard-transaction-integrity-v1`) | SAFETY (per-page containment readiness) |
| NW-AUD-024 | Run evidence bundle txn | High | High | Dir reuse, manifest truncate-during-append, reset-to-`{}`, memory summary can diverge | PLAN-BACKLOG (`nightwatch-run-evidence-bundle-transaction-integrity-v1`) | SAFETY (central audit record) |
| NW-AUD-025 | Replay context provenance | High | High | Admission dedupes only run IDs; replay skips channels absent on both sides | PLAN-BACKLOG (`nightwatch-replay-context-provenance-integrity-v1`) | SAFETY (elevated-finding confidence) |
| NW-AUD-026 | Exploration postcondition | Med | High | Real runtime merges expected delta into state and returns it as observed — comparison tautological | PLAN-BACKLOG (`nightwatch-exploration-observed-postcondition-integrity-v1`) | DEBT |
| NW-AUD-027 | Prod-local persistence lifecycle | Med | High | Basename-prefix recursive delete, name+age sweep, overwrite race, audit returns clean when skipping entries | PLAN-BACKLOG (`nightwatch-production-persistence-lifecycle-integrity-v1`) | DEBT (destructive, owner-local) |
| NW-AUD-028 | Phase-5 relay caller authority | Med | High | Public operation ID is sole proof; any local process can trigger repeat authenticated reads, no budget | PLAN-BACKLOG (`nightwatch-phase5-relay-invocation-authority-v1`) | SAFETY (authenticated-read triggering) |
| NW-AUD-029 | Protocol dossier READY | High | High | v1 dossier constructor always emits READY; failed minimization can persist/ledger/promote | PLAN-BACKLOG (`nightwatch-protocol-dossier-readiness-integrity-v1`) | SAFETY (false acceptance evidence) |
| NW-AUD-030 | Triage evidence contracts | Med | High | Ordinal domain mismatch, trusted survivor digests, contradictory semantic receipts accepted | PLAN-BACKLOG (`nightwatch-triage-evidence-contract-integrity-v1`) | DEBT |
| NW-AUD-031 | Artifact validation bounds | Med | High | Unbounded recursive validators; raw leaf `Error.message` returned from facade | PLAN-BACKLOG (`nightwatch-durable-artifact-validation-bounds-v1`) | DEBT (privacy note on raw errors) |
| NW-AUD-032 | Phase-6 owner quarantine | Med | High | Owner policy lives only in default invoker; adapters accept arbitrary invokers/forgeable plan markers | PLAN-BACKLOG (`nightwatch-phase6-owner-scope-quarantine-integrity-v1`) | SAFETY (dormant until wired) |
| NW-AUD-033 | Budget reservation lifecycle | Med | High | Denial leaks occupancy; fabricated/foreign settlement mutates counters | PLAN-BACKLOG (`nightwatch-production-budget-reservation-lifecycle-integrity-v1`) | DEBT (production owner-gated) |
| NW-AUD-034 | Qualification/receipt authority | Med | High | PQ chain not recomputed; open resealing authenticates caller-assembled claims; P1 identity gaps | PLAN-BACKLOG (`nightwatch-production-observation-receipt-integrity-v1`) | DEBT (production owner-gated) |
| NW-AUD-035 | Response body acquisition | Med | High | `response.body()` fully buffered before size check; timeout abandons losing work uncanceled | PLAN-BACKLOG (`nightwatch-browser-response-acquisition-integrity-v1`) | DEBT |
| NW-AUD-036 | Source snapshot transaction | High | High | Unclosed HEAD interval; digest-mismatched route bytes still parsed; Phase 24 constant snapshot match; path TOCTOU | PLAN-BACKLOG (`nightwatch-source-snapshot-transaction-integrity-v1`) | SAFETY (source authority for semantics) |
| NW-AUD-037 | Real-source expectation authority | High | High | Shape-only proof + caller-supplied semantics; campaign mapper aliases target ID as expectation ID | PLAN-BACKLOG (`nightwatch-real-source-expectation-authority-integrity-v1`) | SAFETY (permanent admission rule) |
| NW-AUD-038 | Semantic receipt acceptance | Med | High | Identity not recomputed; `CONTAINED_DEV` caller-labeled; Phase 9B composes mismatched receipts | PLAN-BACKLOG (`nightwatch-semantic-receipt-acceptance-integrity-v1`) | SAFETY (acceptance evidence) |
| NW-AUD-039 | Partial-observation soundness | High | High | Per-item NOT_APPLICABLE ignored; PASS/equality certified over truncated prefixes | PLAN-BACKLOG (`nightwatch-semantic-partial-observation-soundness-v1`) | SAFETY (decisive false PASS) |
| NW-AUD-040 | Source analyzer proof | High | High | Regex-scan of raw source matches decoys/comments; output silently sliced at 256 | PLAN-BACKLOG (`nightwatch-semantic-source-analyzer-proof-soundness-v1`) | SAFETY (manufactured source proof) |
| NW-AUD-041 | Coverage evidence authority | High | High | Caller booleans/DTOs trusted; missing lifecycle evidence defaults to replayed/minimized/high-confidence | PLAN-BACKLOG (`nightwatch-semantic-coverage-evidence-authority-v1`) | SAFETY (manufactured coverage evidence) |
| NW-AUD-042 | Gap ledger integrity | Med | High | Status-override closure, baseline-only lossy rebuild, divergent counts, surface double-count | PLAN-BACKLOG (`nightwatch-semantic-gap-ledger-integrity-v1`) | DEBT |
| NW-AUD-043 | Change-selection staleness | Med | High | Map pins compared only to each other, not ChangeSet baseline/head; rename suppression one-sided | PLAN-BACKLOG (`nightwatch-change-intelligence-source-generation-integrity-v1`) | DEBT |
| NW-AUD-044 | Campaign resume reasoner identity | High | High | Resume rebuilds reasoner from caller fields; stored identity only echoed | PLAN-BACKLOG (`nightwatch-campaign-resume-reasoner-identity-binding-v1`) | SAFETY (campaign identity/attribution) |
| NW-AUD-045 | Resume budget arithmetic | Med | High | Paused usage subtracted from remainder and restored on resume → double-count | PLAN-BACKLOG (`nightwatch-investigation-resume-budget-arithmetic-integrity-v1`) | DEBT |
| NW-AUD-046 | Atlas fixture fallback | Med | High | Lane C atlas tools default to synthetic corpora/overlays; missing-fixture test vacuous | PLAN-BACKLOG (`nightwatch-agent-tool-fixture-fallback-integrity-v1`) | DEBT |
| NW-AUD-047 | Local finding admission grounding | Med | High | Missing `candidateIds` skips membership gate; empty provenance synthesized as `reproduction:<id>`; default title/severity authority-shaped | PLAN-BACKLOG (`nightwatch-local-finding-admission-grounding-integrity-v1`) | SAFETY (fabricated provenance refs) |
| NW-AUD-048 | Control Center status projection | Med | High | Boolean READY mapping shows failed/blocked/unread dossiers as INCOMPLETE | PLAN-BACKLOG (`nightwatch-control-center-finding-status-projection-integrity-v1`) | DEBT (UI truthfulness) |

### Counts
- Implemented: **4** (006, 010, 014, 019)
- Campaign-authorized next: **2** (018 → 020)
- Backlog (apply-ready, unimplemented): **39**
- Non-material: **3** (002 DUP, 003 N-I, 008 DUP)
- SAFETY among remaining: 001, 004, 013, 015, 016, 017, 018, 020, 021, 022, 023, 024, 025, 028, 029, 032, 036, 037, 038, 039, 040, 041, 044, 047 (24). DEBT among remaining: 005, 007, 009, 011, 012, 026, 027, 030, 031, 033, 034, 035, 042, 043, 045, 046, 048 (17).

## Notes

### Implementation verification (live source)
- **NW-AUD-006** — task `nightwatch-session-mutation-authority-binding-v1` tasks.md **30/30 checked**; `bin/lib/session-authority.mjs` new (+322 lines); `nightwatch-session.mjs` +777/−136; refusal code present at `bin/nightwatch-session.mjs:1209`. Fully implemented. Correction to brief: 006 landed in `e54d7540`, *not* 78483ee8/ff62ff0b (those are 010/014).
- **NW-AUD-010** — `78483ee8`. Verified categorical evidence relations + EXACT-only certification + `GIT_INDETERMINATE` separation at `src/core/releaseCertification/index.ts:16-91`; `bin/project-state-check.mjs` +92 lines. Core audit text fully addressed. Caveat: 5 tasks remain `- [ ] ~~struck~~` (evidence-record repair 5.1–5.3, acceptance 7.1–7.2) — descoped/deferred, not executed as written.
- **NW-AUD-014** — `ff62ff0b`. Verified fail-on-unclassified census at `bin/lib/hardening/rules/process-and-network.mjs:76-80`, census module `bin/lib/childProcessCensus.mjs` (431 lines), env spreads closed in `gate-topology.mjs`/`review-mutation-campaign.mjs`, `npx`→`node_modules/.bin`. Caveat: change tasks sections 3 (convert every remaining call site), 4 (mutation proof), 5 (acceptance) are struck-through unchecked — totality claim rests on census-closed profiles, not per-site conversion; worth confirming intent before treating as fully closed.
- **NW-AUD-019** — `21e3f47f` + `1b338d20` + `24098097`. Audit text **substantially addressed**: quoted-key regex bypass fixed (`PRIVATE_VALUE_RE` now `["']?\s*[:=]\s*["']?`, `src/core/policy/privateScreening.ts:22-25`), structural walk is primary authority, `PrivateArtifactStore` + `runEvidenceReader` + `findingsAuthority` wired, adversarial suite `tests/unit/privateStructuralScreening.test.ts` added, schema v2. **Not fully closed**: tasks 2.2 (branded DTOs) and 3.3 (generated consumer census) marked `[PARTIAL: …deferred]`; adversarial/acceptance tasks 4.1–5.2 unchecked; tasks.md header still says "none has been performed" (stale).
- **NW-AUD-018 / NW-AUD-020** — confirmed planned-only: both changes have **0/14** tasks checked; campaign STATE.md lists them as M4/M5 upcoming.

### Findings whose cited code has drifted since the audit (audit start `34517c9b`, 112 commits back)
1. **NW-AUD-006** — cited `bin/nightwatch-session.mjs:86-134,398-416,469-531,654-735` no longer map; file rewritten by its own remediation (new `bin/lib/session-authority.mjs`). Finding superseded by implementation.
2. **NW-AUD-010** — cited `src/core/releaseCertification/index.ts:350-381` / `bin/project-state-check.mjs:1012-1028` rewritten by `78483ee8`; boolean-ancestor defect gone, citations stale.
3. **NW-AUD-014** — cited manual 18-file list in `process-and-network.mjs:27-66` replaced by census; audit's "18" also noted as a planning miscount (impl records 17/18).
4. **NW-AUD-019** — cited `privateScreening.ts:14-38` regex rewritten; `privateArtifacts.ts:154-158,254-267` + Control Center readers changed by `21e3f47f`.
5. **NW-AUD-007 — important partial drift**: cited "bare `npx tsc` twice" (`bin/change-intelligence.mjs:20-62,132-136`) is **no longer true** — NW-AUD-014 work replaced it with `node_modules/.bin/tsc` (also commits `1b338d20`, `24098097` "local-tsc path root repair"). The pre-admission `rmSync(compileRoot)` half (`:35`) still matches the audit. 007 is now half-fixed incidentally; the owning change should be re-scoped before implementation.
6. **NW-AUD-009** — cited gate-topology `${Date.now()}.json` receipt now an ISO stamp (`bin/gate-topology.mjs:597`); collision window narrowed but direct-write/symlink gap remains as cited.
7. All other cited files checked (`evidence-retention.mjs`, `selfDevPromotion/apply.ts`, `devAutoLogin.ts`, `proxy/server.ts`, `redaction.ts`, `runRecorder.ts`, `journeys/*`, `triage/*`, `oracles/*`, `semanticCoverage/*`, `phase6/*`, `hardening.yml`, `environmentSurface.ts` etc.) — **no diff since `34517c9b`**; audit citations for those still accurate.

### Campaign / state observations (read-only; no files modified)
- Active campaign authorizes only 010→014→019→018→020; the other **39 material findings are the true remaining backlog** after 018/020.
- **Dirty working tree at recon time**: unstaged mods to `src/controlCenter/authorities/findingsAuthority.ts` and `src/core/policy/privateScreening.ts` (in-flight M3 polish) — owner/session should checkpoint before integration.
- **STATE.md stale**: `.agent/tasks/nightwatch-priority-audit-remediation-sequence-v1/STATE.md` still records last checkpoint `ff62ff0b` (M2) and "reproduce NW-AUD-019" as next action, while three `aud019` commits have already landed — continuity record lags HEAD by 3 commits.
- Umbrella audit task `.agent/tasks/nightwatch-exhaustive-repository-audit-proposals-v1/REPORT.md:9` confirms: 45 material findings ↔ 45 strict-valid unimplemented changes, IDs 001, 004–048 excluding 002/003/008.