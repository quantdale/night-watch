# NW-AUD-018 Implementation-Grade Census — `nightwatch-authenticated-evidence-minimization-integrity-v1`

Repo: `/home/dalepalaca/.nightwatch/worktrees/nightwatch-priority-audit-remedi-0e17af9c`
HEAD at census: `24098097` (planning baseline `34517c9`). Read-only: no files modified, no git mutations.

## 1. Planning artifacts (read first)

- `openspec/changes/nightwatch-authenticated-evidence-minimization-integrity-v1/proposal.md` — replace lexical path-segment classification with proven route templates; closed DTOs + one final persistence firewall; mode fixed before first publication; total writer census; adversarial tests.
- `.../design.md` — decisions: origin+proven-template or categorical unknown-route; one typed persistence firewall; mode fixed before publication/irreversible hardening transition; syntax-aware census proves totality.
- `.../tasks.md` — 5 sections, all tasks struck-through/out-of-scope for planning; **Phase 4 will implement**.
- `.../specs/authenticated-evidence-minimization-integrity/spec.md` — 5 requirements: provenance-bound URL identity; one closed persistence firewall; private-before-first-publication; categorical diagnostics; non-vacuous enforcement.
- `.agent/tasks/nightwatch-authenticated-evidence-minimization-integrity-v1/{SPEC,PLAN,STATE,REPORT}.md` — status COMPLETE/STOP (planning only). Discoveries recorded: `acme1234` survives the path heuristic; `writeRepositories` + `finalize` notes bypass `sanitizeAuthenticatedData`; late `enableAuthenticatedEvidence` does not harden the directory.

## 2. Live writer census — every writer beneath authenticated evidence / run roots

All paths relative to repo root; `RunRecorder` owns `artifacts/<run-id>/` (`src/core/evidence/runRecorder.ts:9-17` layout comment; dir built at `:95-97`).

### 2a. Inside RunRecorder (`src/core/evidence/runRecorder.ts`)

| # | Writer | File:line | Sanitized in authenticated mode? | Owner-only? |
|---|---|---|---|---|
| 1 | run directory creation `fs.mkdirSync(this.dir, {recursive:true})` | `:97` | n/a | chmod 0700 **only if constructed authenticated** `:98` |
| 2 | `manifest.json` constructor write (runId, timestamp, environment, product, browser, scenario, seed, nightwatchSha) | `:99-114` | **NO** — raw `JSON.stringify(manifest)`, bypasses `sanitizeAuthenticatedData` | chmod 0600 via `secureAuthenticatedArtifact` `:115,:119-122` (no-op when unauthenticated at construction) |
| 3 | `addManifestEntry(key,value)` — read/modify/write manifest | `:194-203` | **partial** — value passed through `sanitizeAuthenticatedData({value})` only when `this.authenticated` `:199`; key itself never screened | chmod 0600 `:202` |
| 4 | `proxy.jsonl` full rewrite of relevant proxy events | `:236-242` | **NO** — raw `JSON.stringify(e)` of `ProxyEvent`; no DTO validation | chmod 0600 `:242` |
| 5 | `events.jsonl` append | `:296-297` | yes when flag set at write time (`:283-286`) — events appended **before** a late transition stay raw | chmod 0600 `:297` |
| 6 | `network.jsonl` append (request/response mirror) | `:299-301` | same as #5 | `:301` |
| 7 | `console.jsonl` append | `:303-305` | same as #5 | `:305` |
| 8 | `screenshots/` mkdir + `page.screenshot` | `:324-334` | gated: authenticated returns `null` before any write `:315-322` | n/a (never written when auth) |
| 9 | `repositories.json` via `writeRepositories(snapshots)` | `:349-354` | **NO** — raw snapshots; no `sanitizeAuthenticatedData`, no DTO | chmod 0600 `:353` |
| 10 | `summary.json` via `finalize()` | `:356-401` | **NO** — `input.notes` copied raw `:395`; hardFailure messages/reasons copied from events `:377-385` (raw if written pre-transition); proxy summary merged raw `:394` | chmod 0600 `:400` |

### 2b. Outside RunRecorder but writing into / beside run roots

| # | Writer | File:line | Notes |
|---|---|---|---|
| 11 | `context.tracing.stop({path: path.join(recorder.dir,'trace.zip')})` | `src/browser/context.ts:534` | trace only started when `auth===null` (`:261-266`, `:233-236` forced off for auth) — safe today, but it is a direct fs publisher under the run root and belongs in the writer registry |
| 12 | `writeDestinationManifest()` direct `fs.writeFileSync(path.resolve(file))` | `src/core/evidence/destinationManifest.ts:242-244` | called into **authenticated** run dirs: `tests/manual/phase2a-authenticated.ts:777`, `tests/manual/phase2a-canary.ts:158` (`authenticated: true` at canary `:88`) — bypass writer |
| 13 | `writeAtomic(path.join(recorder.dir,'exploration.json'/'replay.json'))` | `tests/manual/phase4-real-exploration.ts:185-194, :341, :395` | recorders constructed `authenticated: true` at `:298, :370` — bypass writers |
| 14 | journey-comparison dir `fs.writeFileSync(path.join(root,'artifacts',…))` | `tests/manual/phase2b-real-journeys.ts:345-354` | adjacent `<runId>-comparison` dir, not through recorder |
| 15 | phase9b/10b acceptance evidence under artifacts dir | `tests/manual/phase9b-contained-dev-semantic.ts:808`, `tests/manual/phase10b-contained-dev-deep-semantic.ts` (same pattern), phase22 `writeOwnerResults` `tests/manual/phase22-contained-dev-semantic.ts:326-331` | semantic auxiliary writers next to authenticated run roots |
| 16 | phase7 campaign recorders under private store | `tests/manual/phase7-real-campaign.ts:882, :930` (`authenticated:true`, root `privateStore.root/runs`) + `writeRepositories :883, :931`, `finalize` notes with `JSON.stringify(safety)` `:910, :947` | owner-local but still bypasses #9/#10 sanitization |
| 17 | Proxy event log (upstream of `proxy.jsonl`) | `src/proxy/events.ts:33-40` (`ensureEventLog`, `appendProxyEvent` direct append) | host-level only by schema (`src/proxy/server.ts` validation ~`:220`), but no DTO gate at run-recorder ingestion |
| 18 | Semantic evaluation receipts → events stream | `src/browser/observers/networkObserver.ts` (semantic ledger; surfaced via `recorder.event`, ~`:1091-1196`) | pass through #5 only |
| 19 | Browser observers (network, console, page, stability, bootstrap, document-lifecycle, fetchGuard) | `src/browser/observers/*.ts`, `src/browser/network/fetchGuard.ts:77-175`, `src/core/journeys/engine.ts:178-276`, `src/products/ripple/journeys.ts:54-87` | all funnel through `recorder.event` — covered by #5/#6/#7 |
| 20 | directRunner/devAutoLogin manifest entries | `src/auth/directRunner.ts:399-400, :493, :528, :553`; `src/auth/devAutoLogin.ts:514` | use `addManifestEntry` (#3) — value-sanitized, key unscreened |

### 2c. Mode-dependent writers that self-disable

- screenshot capture: `runRecorder.ts:315-322` (authenticated → event + null).
- Playwright trace: `src/browser/context.ts:233-254` (auth forces `trace.enabled=false` + warn event, even vs `NIGHTWATCH_TRACE=on`).

## 3. Current URL/route minimization logic (the lexical heuristic)

- **`RedactionLayer.redactAuthenticatedUrl`** — `src/core/safety/redaction.ts:149-183`:
  - strips userinfo/query/hash unconditionally `:154-158`;
  - per-segment: decodes, then keeps the literal iff it matches `safeRouteWord = /^[a-z][a-z0-9._-]*$/` `:166` AND does not trip `looksLikeIdentifier` `:167-172` (`@`, ≥4-digit run, UUID-hex, or mixed-case+digits length≥8);
  - **defect**: `acme1234` (all lowercase) matches `safeRouteWord` and trips none of the identifier heuristics → persisted verbatim. Same for `accountabc`, `inv202506`, etc.
  - **second defect**: `catch` fallback `redacted.replace(/[?#].*$/, '')` `:180-182` — for an unparseable/relative URL, **no path minimization at all**; only query/fragment stripped.
- **Callers**:
  - `RunRecorder.redactUrl` mode switch — `src/core/evidence/runRecorder.ts:145-147`;
  - `sanitizeAuthenticatedMessage` `:159-163` (redactText + re-redact embedded URLs);
  - `sanitizeAuthenticatedData` `:165-191` — forbidden-key denylist regex `:167`, `url`→`redactAuthenticatedUrl` `:179`, `errorText`→`classifyNetworkFailure` `:180`, `message|text`→suppress `:181`, else `redactText` `:182`. Arbitrary other keys (e.g. `path`, `file`, `toPath`, nested identifier strings) pass through with only shape-redaction.
  - observers: `src/browser/observers/documentLifecycle.ts:93` calls `recorder.redaction.redactAuthenticatedUrl` **directly** (bypasses the mode switch — always minimizes; over-minimizes unauthenticated runs, under-abstracts);
  - `networkObserver.ts:462,672,761,1085,1195` and `fetchGuard.ts:108` use `recorder.redactUrl` (mode-aware).

## 4. Route-template / endpoint-authority sources (proof, not guessing)

Existing provenance machinery the implementation should reuse:

1. **`src/core/prodPrivacy/routeVocabulary.ts`** — `ProvenRouteVocabulary` (`:66-72`), exact-set membership `isSourceProvenRoute` `:148-154`, `assertSourceProvenRoute` `:180-193`, `NO_PROVEN_ROUTE_VOCABULARY` fail-closed sentinel `:76-79`, provenance classes `SOURCE_PROVEN_OPENAPI_OPERATION / SOURCE_PROVEN_PHP_ROUTE / SOURCE_PROVEN_FIXED_CONTRACT` `:48-54`, `MAX_PROVEN_ROUTE_TEMPLATES=4096` `:61`, `ev:sha256:<24>` digest `:63`. This is the model the spec's "origin + exact template" requirement maps onto.
2. **`src/core/prodPrivacy/evidence.ts:150-168`** — DTO validation calling `assertSourceProvenRoute`.
3. **`src/core/prodEvidence/firewall.ts:250-251`** and **`src/core/prodEvidence/persistenceAudit.ts:105-109, :219-227`** — persisted-route audit: `provenRouteTemplates` set, rejects routeTemplates containing `?&#`.
4. **`src/core/prodProvenance/routeVocabularyDerivation.ts:64-66`** — canonical member form `` `${method} ${routeTemplate}` `` (method+template = operation identity).
5. **C-02a admitted operations population (814 ops)** — referenced in `routeVocabulary.ts:13-16, :59-60`; sourced from `src/core/source/` (`protoDeclarations.ts:143 safeRouteTemplate`, `phpPipeline.ts:297-298`, `systemMap/input.ts:36`, `derivedEndpointSemantics.ts:100`, `deploymentBinding.ts:214-303`).
6. **Runtime endpoint registry (browser side)** — `src/core/safety/endpointSemantics.ts:15-27` `EndpointSemanticRule` (host+method+exact `path` or anchored `pathPattern`), `matchRippleEndpoint :81-101` returns **ruleId only, never the path** (`:86-89` comment: URL paths never returned for persistence); journey-supplied registry `src/products/ripple/journeyContracts.ts:335-348 buildRippleJourneyEndpointRegistry`; wired at `src/browser/context.ts:85, :329`. Default registry intentionally empty `endpointSemantics.ts:28`.
7. **Control Center bounded template type** — `src/controlCenter/contracts/common.ts:38, :82-86` `asSafeControlCenterRouteTemplate` (≤240 chars).

## 5. Authenticated-mode transition state

- **Established at construction**: `RunRecorderOptions.authenticated` `runRecorder.ts:42, :92`; dir mkdir `:97`; dir chmod 0700 only in that same branch `:98`; constructor manifest written `:114` **before** `enableAuthenticatedEvidence()` at `:116`.
- **Established late**: `enableAuthenticatedEvidence()` `:129-141` sets `this.authenticated = true` and appends `evidencePolicy` manifest entry. Called from `src/browser/context.ts:229` **after** storage-state resolution — i.e. after the recorder was constructed and after any caller events (e.g. `tests/smoke/authenticated.smoke.ts:159` emits `start` before `createNightwatchContext`).
- **Gaps (match planning discoveries; still live)**:
  - late transition never chmods `this.dir` to 0700 (only `:98` at construction) → directory stays umask-permissive;
  - late transition never retro-sanitizes already-appended events/manifest constructor fields;
  - no hardening of pre-existing files, no identity/permission verification, no fail-closed check — flag flip only; there is no path back to unauthenticated (implicitly irreversible) but nothing enforces "hardening transaction before next write";
  - constructor manifest write (`:99-114`) happens before the flag can take effect for value sanitization when `authenticated` option is true — fields are caller-controlled but unsanitized (scenario strings embed targetIds, e.g. `tests/manual/phase22-contained-dev-semantic.ts:176`).
- **Existing permission/symlink/publication primitives to reuse (not duplicate)**:
  - `src/core/policy/privateArtifacts.ts` — `ensureOwnerDirectory` (symlink walk + 0700 + owner check) `:139-149`, `assertNoSymlinkComponents` `:127-137`, `assertOwnerOnly` `:151-154`, atomic temp+`rename` publication `temporaryPayload→rename` `:199-235, :254-291`, immutable `linkSync` publication `:316-360`, dir fsync `:237-251`, pinned temporary-name recovery `TEMPORARY_FILE_RE :87-88, listTemporaries/removeTemporary :377-411`, `assertPrivateArtifactPath` `:416-424`, privacy gate `assertPrivatePayload :168-177` (structural-first).
  - `src/core/policy/privateScreening.ts` (NW-AUD-019, **reuse required**): `findStructuralPrivateFailure :78-145`, `containsStructuralPrivateShape :148-151`, `containsPrivatePayload :168-181`, text defense `containsPrivatePayloadShape :154-158`, bounds `PRIVATE_STRUCTURE_BOUNDS :42-48`, sentinels/secrets/labeled-value regexes `:10-37`, version tag `nightwatch.private-screening.v2 :7`.
  - Control Center reader hardening as read-side model: `src/controlCenter/authorities/runEvidenceReader.ts` — O_NOFOLLOW/stable reads `:216-249`, privacy block `:253-254`, messages redacted to `[REDACTED_EVENT_MESSAGE]` `:477`, notes collapsed to `['RUN_NOTE_PRESENT']` `:430`, events data allowlist `:58-65`.

## 6. Drift since planning (baseline `34517c9` → HEAD `24098097`)

`git diff --stat 34517c9..HEAD` over the relevant surface touches only:
- `src/core/policy/privateScreening.ts` (+173/-19: v1 text-only → **v2 structural authority**, `nightwatch.private-screening.v2`),
- `src/core/policy/privateArtifacts.ts` (structural-first `assertPrivatePayload`),
- `src/controlCenter/authorities/runEvidenceReader.ts`, `findingsAuthority.ts` (consume v2 screening),
- two aud019 tsc path-root fixes (change-intelligence/portfolio).

**No drift in `src/core/evidence/`, `src/core/safety/redaction.ts`, `src/browser/`, `src/auth/`** — every defect cited in the planning artifacts is still live at HEAD. The planning artifacts' claims remain accurate; the only staleness is that the design's "screening" reference now resolves to v2 structural screening, which strengthens (does not replace) what the firewall must call.

## 7. Dependency overlap with NW-AUD-019

- **Reuse (mandatory, duplication forbidden)**: the persistence firewall's value admission must call `containsPrivatePayload` / `findStructuralPrivateFailure` from `src/core/policy/privateScreening.ts` (v2) rather than inventing another key denylist — note the current `sanitizeAuthenticatedData` forbidden-key regex (`runRecorder.ts:167`) is a parallel, weaker mechanism that overlaps with `SENSITIVE_PRIVATE_KEYS` and should collapse into the shared authority plus a closed-DTO allowlist (allowlist, not denylist, per spec).
- **Reuse**: owner-only/symlink-safe/atomic-publication primitives from `privateArtifacts.ts` (or extract a shared module) for task 3.2 — `RunRecorder` currently does raw `writeFileSync`/`appendFileSync` + `chmod` with no symlink/owner/fsync/crash-consistency guarantees.
- **Reader compatibility**: `runEvidenceReader.ts` already collapses messages/notes — writer-side closed DTOs must stay within its `parseManifest`/`parseSummary`/`safeEventData` expectations or readers will start rejecting (`RUN_EVIDENCE_SCHEMA_INVALID`).
- **No overlap**: `ownerScope.ts`, proxy runtime, storage-state fixtures (separate mechanisms).

## 8. Likely affected tests (exact paths)

Core:
- `tests/unit/redaction.test.ts` (authenticated-URL test `:137-152` — the heuristic expectations change)
- `tests/unit/evidence.test.ts` (auth metadata `:225`, owner-only perms `:275`, finalize/notes `:176`, repositories `:376`, proxy sanitizer `:449-463`)
- `tests/smoke/authenticated.smoke.ts` (full authenticated smoke `:150-240`; `trace.zip` absence `:204`, manifest assertions `:206-216`, header-free network `:228`)
- `tests/smoke/safety.smoke.ts`, `tests/smoke/passive-run.smoke.ts` (`:123-131` secret-leak scans; trace presence `:158`), `tests/smoke/negative.smoke.ts`, `tests/smoke/proxy.smoke.ts`
- `tests/unit/documentLifecycle.test.ts` (`authenticated: true` `:85`; URL minimization of navigation paths)
- `tests/unit/bootstrapHooks.test.ts` (`:28,:105,:158`)
- `tests/unit/controlCenterRunEvidenceReader.test.ts` (writer/reader contract)
- `tests/unit/privateStructuralScreening.test.ts` (NW-AUD-019 authority the firewall must call)
- `tests/unit/privateArtifactAtomic.test.ts` (publication primitive reused for 3.2)
- `tests/unit/journeyEngine.test.ts`, `tests/unit/networkObserverSettlement.test.ts`, `tests/unit/observerSemanticLedger.test.ts`, `tests/unit/phase9a1GapReproduction.test.ts` (recorder event consumers)
- `tests/unit/authCaptureStages.test.ts` (`:70,:93` artifactsRoot), `tests/unit/authCaptureLauncher.test.ts`, `tests/unit/observeAuthenticatedRunner.test.ts` (authenticated runners)
- `tests/unit/p1Privacy.test.ts`, `tests/unit/phase15pPrivacyAuthority.test.ts`, `tests/unit/phase17EvidenceHardening.test.ts`, `tests/unit/durableArtifactTruthHardening.test.ts`, `tests/unit/phase15MinimizationEvidence.test.ts` (privacy/hardening gates; mutation registration per tasks 4.3)
- New suites implied by tasks.md: ordinary-ID corpus, writer-census/direct-writer mutation, mode-transition/permission/symlink/race tests.

## 9. Implementation risks

1. **Firewall placement**: the single choke point must sit immediately before every `fs` call in `RunRecorder` (10 sites, §2a) plus the external bypass writers (§2b #12-#16) — events appends are hot-path; structural screening budget (`maxNodes 10_000`) must not stall per-event writes.
2. **Late-transition ordering**: `context.ts:229` transitions after construction; a strict "mode before first publication" rule forces either constructor-time storage-state discovery or a real hardening transaction (chmod dir 0700, re-verify/re-hash existing files, refuse on unsafe identity) before the next write — this changes `createNightwatchContext` contract and the authenticated smoke fixture (`:159` writes pre-context).
3. **Reader compatibility**: closed DTOs must remain parseable by `runEvidenceReader.ts` (`parseManifest` requires exact core keys `:266-270`; `recordsAgreeWithSummary :541`); changing summary/notes shape risks `RUN_EVIDENCE_SCHEMA_INVALID`.
4. **Method+template identity**: proven vocabulary members are `METHOD /template` (`routeVocabularyDerivation.ts:64-66`) while authenticated URLs carry no method — reduction needs the endpoint registry (`endpointSemantics.ts`, ruleId-only) as the runtime matcher and the vocabulary as proof; unmatched → unknown-route marker per design (detail loss must be accepted by readers/tests).
5. **Mutation-test surface**: tasks 4.3 require registered mutations; `src/core/validation/executionClasses.ts:63` guard-source-mutation pattern means firewall mutations are serial-required — plan test execution accordingly.
6. **Scope boundary**: manual campaign writers (§2b) live under `tests/manual/` — the census/registry must cover them or explicitly classify them as non-run-root writers, or `hardening:check` totality (task 3.3) fails.

## 10. Potential sibling defects (report, out of scope for this task)

- **[High]** Relative/unparseable URL fallback skips path minimization entirely — `src/core/safety/redaction.ts:180-182`.
- **[High]** Late transition leaves run directory umask-permissive forever — `src/core/evidence/runRecorder.ts:97-98` vs `:129-141` (no dir hardening on enable).
- **[Medium]** Constructor manifest fields never sanitized even in authenticated mode — `runRecorder.ts:99-115`.
- **[Medium]** `proxy.jsonl` writer serializes raw events with no DTO/screen — `runRecorder.ts:236-242`.
- **[Medium]** `writeDestinationManifest` and phase4 `writeAtomic` publish directly into authenticated run dirs outside any recorder gate — `destinationManifest.ts:242-244`, `phase4-real-exploration.ts:341,395`.
- **[Medium]** `documentLifecycle.ts:93` calls `redaction.redactAuthenticatedUrl` directly, bypassing the recorder mode switch (always-minimize; inconsistent abstraction — safe direction, but it means unauthenticated runs get `<ID>` placeholders and the mode flag isn't the single authority).
- **[Low]** `addManifestEntry` screens the value but never the caller-chosen key (`runRecorder.ts:194-203`).
- **[Low]** `RunRecorder` has no symlink/owner/fsync guarantees on any file it writes, unlike `PrivateArtifactStore`.

## Start here

`src/core/evidence/runRecorder.ts` — it is the writer hub: constructor (`:85-117`), mode transition (`:129-141`), sanitizer (`:159-191`), and all 10 run-root write sites. Then `src/core/safety/redaction.ts:149-183` (the heuristic to replace) and `src/core/policy/privateScreening.ts` + `privateArtifacts.ts` (the NW-AUD-019 authorities to reuse).