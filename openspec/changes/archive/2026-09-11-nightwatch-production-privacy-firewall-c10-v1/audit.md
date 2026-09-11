# Audit — C-10 Production Privacy Firewall

Method: mechanical enumeration of every write/exposure site in `src/`
(`writeFileSync`, `appendFileSync`, `createWriteStream`, `writeFile(`,
`mkdirSync`, `renameSync`, `openSync`, screenshot/trace capture, HTTP response
and SSE emission), then per-site classification. Performed BEFORE any C-10 code
change, at `a152889a71eec6c67d82b05e5984df6423fe88d4`.

Classification vocabulary, per campaign brief §5:

| Class | Meaning |
|---|---|
| `SAFE_STRUCTURAL` | May carry only allowlisted structural information; safe for production evidence |
| `DEV_ONLY` | Legitimate today for DEV/local workflows; must be unreachable from the production cone |
| `PRODUCTION_PROHIBITED` | Must be structurally impossible in the production cone |
| `PRODUCTION_PROJECTED` | May exist in production ONLY as output of the C-10 projection boundary |
| `EXTERNAL_SECRET_STATE` | Owner-supplied secret state held outside Nightwatch; never Nightwatch-persisted |
| `UNKNOWN` | Provenance not established — treated as UNSAFE and denied persistence |

## A.1 Durable write sites (mechanical enumeration)

| # | Path | Writes | Class | Disposition under C-10 |
|---|---|---|---|---|
| 1 | `src/core/evidence/runRecorder.ts` | `artifacts/<runId>/` — `events.jsonl`, `network.jsonl`, `console.jsonl`, `proxy.jsonl`, `manifest.json`, `summary.json`, `repositories.json`, `screenshots/` | `DEV_ONLY` | Entire run-recorder artifact tree is unreachable from the production cone. Console JSONL, screenshots and traces are additionally `PRODUCTION_PROHIBITED`. |
| 2 | `src/core/policy/privateArtifacts.ts` | `$HOME/.nightwatch/findings/*.json` (DEV dossiers), `.tmp` staging | `DEV_ONLY` | Retained unchanged. C-10 must NOT reuse this root for production. |
| 3 | **NEW** `src/core/prodEvidence/**` | `$HOME/.nightwatch/prod-findings/` | `PRODUCTION_PROJECTED` | Created by C-10. Accepts `SAFE_PRODUCTION_EVIDENCE` only, re-validated by an independent firewall. |
| 4 | `src/proxy/events.ts`, `src/proxy/server.ts` | L5 proxy event log | `DEV_ONLY` | Records request identity. Under F-16 a concrete parameter must never reach it; C-10 supplies the route-template + opaque-handle contract that forbids it. |
| 5 | `src/proxy/portLease.ts` | `$TMPDIR/nightwatch-proxy-port-leases` | `SAFE_STRUCTURAL` | Port integers and pids only; no observation data. |
| 6 | `src/browser/fixtures/storageState.ts` | validates/chmods an owner-supplied storage-state file (0600) | `EXTERNAL_SECRET_STATE` | Never Nightwatch-authored content; never copied into evidence. Production storage state is `PRODUCTION_PROHIBITED` as persisted evidence. |
| 7 | `src/auth/devCredentialProvider.ts` | DEV auth material handling | `EXTERNAL_SECRET_STATE` | Out of the production cone entirely. |
| 8 | `src/core/oops/process.ts`, `src/core/oops/l6.ts` | `mkdtempSync` workspaces under `$TMPDIR` | `DEV_ONLY` | Bounded temp workspaces. Included in the C-10 persistence-audit sweep scope so residue cannot escape unmeasured. |
| 9 | `src/core/selfDevSandbox/sandboxMirror.ts`, `src/core/selfDevPromotion/apply.ts` | sandbox mirror / promotion apply | `DEV_ONLY` | Owner-gated, frozen (D-53); no production reachability. |
| 10 | `src/core/changeIntelligence/baseline.ts` | change baseline | `SAFE_STRUCTURAL` | Repository source facts only, no observation data. |
| 11 | `src/core/source/siblingSource.ts` | confined read-only sibling access | `SAFE_STRUCTURAL` | Read-only by construction; the single sibling seam. |
| 12 | `src/core/evidence/destinationManifest.ts` | destination manifest | `SAFE_STRUCTURAL` | Route/host identity; must be route-template only in production. |
| 13 | `src/controlCenter/authorities/findingsAuthority.ts` | reads `$HOME/.nightwatch/findings/`; emits a projected snapshot | `DEV_ONLY` | **F-18**: must become structurally incapable of resolving the production root, including via `createFindingsAuthorityForTests`. |
| 14 | `src/controlCenter/authorities/runEvidenceReader.ts` | reads the `artifacts/` run tree | `DEV_ONLY` | Same exclusion reasoning; the production cone produces no run tree. |
| 15 | `src/controlCenter/server/staticAssets.ts` | serves built UI assets | `SAFE_STRUCTURAL` | Static files only, no observation data. |
| 16 | `src/controlCenter/server/sse.ts` + `contracts/sanitize.ts` + adapters | HTTP/SSE emission | `SAFE_STRUCTURAL` | **Workstream K**: must carry projected metadata only and must never become a side channel around the persistence boundary. |

## A.2 Derived-state classes (brief §5 enumeration)

These are in-memory structures that become durable only through A.1 sites; each
is classified by what it is ALLOWED to contain in the production cone.

| Class | Owner (representative) | Class | Production rule |
|---|---|---|---|
| JSON / JSONL evidence | `runRecorder`, `privateArtifacts` | `DEV_ONLY` | Production writes only through the new prod store. |
| Screenshots | `runRecorder.screenshot()` | `PRODUCTION_PROHIBITED` | Contract failure if enabled in the production cone. |
| Playwright traces | `src/browser/context.ts` tracing options | `PRODUCTION_PROHIBITED` | Contract failure if enabled in the production cone. |
| Console events | `src/browser/observers/consoleObserver.ts` | `PRODUCTION_PROHIBITED` | Page-provided text must never persist; categorical events only, or the observer absent. |
| Network events | `src/browser/observers/networkObserver.ts` | `PRODUCTION_PROJECTED` | Structural projection only. |
| URLs / query params / path params | observers, proxy, destination manifest | `PRODUCTION_PROJECTED` | Route template only; concrete identifiers never retained. |
| Headers / cookies / auth tokens | observers, `RedactionLayer` | `PRODUCTION_PROHIBITED` | Never persisted in any form. |
| Storage state | `browser/fixtures/storageState.ts` | `EXTERNAL_SECRET_STATE` | Owner-held; never Nightwatch-persisted. |
| Dossier data / findings | `src/core/triage/**` | `DEV_ONLY` | Production findings use the separate prod schema and store. |
| Run summaries | `runRecorder.summary()` | `DEV_ONLY` | No production run tree exists. |
| Checkpoints | `src/core/campaign/checkpoint.ts` | `SAFE_STRUCTURAL` | **F-16**: no concrete parameter value may enter a checkpoint. |
| Replay records / fingerprints | `src/core/journeys/fingerprint.ts`, `journeys/contract.ts` | `SAFE_STRUCTURAL` | **F-16**: no concrete parameter value may enter a fingerprint. |
| Digests | `src/oracles/projections/serializer.ts` | `UNKNOWN` → unsafe | **F-14/F-15**: the existing `proj:sha256:` family ingests unproven key literals. Superseded for production by `prodstruct:sha256:`. |
| Budget keys | `src/core/campaignIntelligence/planner.ts` | `SAFE_STRUCTURAL` | **F-16**: keyed by route template, never by concrete identifier. |
| Temporary files | `privateArtifacts` `.tmp`, `oops` `mkdtemp`, `portLease` | `SAFE_STRUCTURAL` | In persistence-audit scope; residue must be measured, not assumed. |
| Browser profiles | Playwright ephemeral context dir | `PRODUCTION_PROHIBITED` as residue | **F-17**: private ephemeral path, restrictive permissions, disk cache off, crash dumps off, normal-exit AND crash-path cleanup, stale-residue sweep. |
| Crash output | Chromium crash dumps | `PRODUCTION_PROHIBITED` | Disabled in the production cone. |
| Control Center state | `controlCenter/adapters/**` | `DEV_ONLY` | Structurally excluded from the production store (F-18). |
| SSE state | `controlCenter/server/sse.ts` | `SAFE_STRUCTURAL` | Projected metadata only (Workstream K). |
| Logs | console/`stdout` across bins | `SAFE_STRUCTURAL` | Categorical reason codes only in the production cone. |
| Error messages | every `throw` in the cone | `SAFE_STRUCTURAL` | Categorical codes only; no raw interpolation. |

## A.3 Findings

- **AUD-1 (F-14, confirmed in code).** `ProjectionField.name` in
  `src/oracles/projections/types.ts` carries the raw object key literal.
  `serializer.ts:writeField` writes it verbatim into the canonical bytes. The
  key literal therefore survives projection, serialization, the digest, and any
  downstream dossier conversion. In this domain objects are routinely keyed by
  AWS account id, MSP id, billing-group id or company name — Nightwatch's own
  `EMPTY_ARRAY_OR_STRING_KEYS` extractor exists because dynamic string keys
  occur in Ripple responses. This is a real leak, not a theoretical one.
- **AUD-2 (F-15, confirmed in code).** `projectionDigest` is the repository's
  ONLY digest family. It is used for structural comparison AND it ingests
  unproven dynamic key literals. Structural comparison and value privacy cannot
  both be served by it.
- **AUD-3 (F-18, confirmed in code).** `createFindingsAuthority()` resolves the
  root internally, but `createFindingsAuthorityForTests(root)` accepts an
  arbitrary root and calls `privateArtifactRoot(root)`. Exclusion of the
  production store is therefore "correct by accident", exactly as the
  independent review states.
- **AUD-4 (F-17, verified in Nightwatch's favour).** No `launchPersistentContext`
  and no `userDataDir` anywhere in `src/`. Contexts are already ephemeral. The
  residual risk is during-session profile content and crash-path residue.
- **AUD-5.** `runRecorder` authenticated mode already suppresses screenshots and
  minimizes URLs and messages. It is a caller-toggled MODE, not a production
  invariant; C-10 must not treat it as the production boundary.
- **AUD-6.** No `UNKNOWN` classification is left standing: the single
  `UNKNOWN` entry (the existing digest family) is resolved by superseding it
  with a value-free production structural digest and denying the old family any
  production persistence authority.
