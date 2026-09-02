# REPORT.md

Task: nightwatch-production-privacy-firewall-c10-v1

Campaign: C-10 — Production Privacy Firewall

Status: IN_PROGRESS — reopened for the DEF-C10-5 route-provenance repair

Starting SHA: `a152889a71eec6c67d82b05e5984df6423fe88d4`
Validated implementation SHA: `69de7752ca92dc9c01f971e1c2e7d7efcb4569eb`
Documentation checkpoint SHA: `da551f0b875fe46acd8a6a9d64f9b16b07ce0734`

C-10 completing does NOT authorize production observation. It creates the
privacy prerequisite required by the later production kernel. The production
critical path remains C-11 -> C-12 -> C-13 -> C-14, and C-11 was not started.

## 1. Git and CI anchors

| Anchor | Value |
|---|---|
| Starting SHA (`origin/main` at campaign start) | `a152889a71eec6c67d82b05e5984df6423fe88d4` |
| Predecessor | `nightwatch-exact-head-ci-baseline-repair-v1`, COMPLETE at `b99ce4e61166e52b554dd6ac07b7678b433959da` |
| Substantive implementation SHA (locally and clean-gate validated) | `69de7752ca92dc9c01f971e1c2e7d7efcb4569eb` |
| Integrated `origin/main` | `da551f0b875fe46acd8a6a9d64f9b16b07ce0734` |
| Session branch | `session/nightwatch-production-privacy-fi-5af2d530` |
| Exact-head GitHub Actions | run `33597262624` / job `100143115528` at `da551f0b875fe46acd8a6a9d64f9b16b07ce0734` — **PASS**, Node 20, `environmentClass: CI`, all eleven required groups PASS, `receipt:sha256:2adf16776476b94f87e8c87c` |

## 2. Local and clean receipts

| Gate | Head | Result |
|---|---|---|
| `gate:local` (Node 22) | `69de7752` | PASS, all eleven groups, `receipt:sha256:531bf12aa22c7da419bedf92` |
| `gate:clean` (Node 20, fresh clone, `npm ci`) | `69de7752` | PASS, all eleven groups, `clean-receipt:sha256:ebe45a42352d5621b20c1036`, gate `receipt:sha256:8b79ac2ebd9718766e95a379`, `siblingWrites: 0` |
| `gate:ci` exact-head GitHub Actions | `da551f0b` | PASS, all eleven groups, `receipt:sha256:2adf16776476b94f87e8c87c` |

`GATE_DEFINITION`, `STATIC`, `HARDENING`, `HANDOFF_TRUTH`, `PROJECT_TRUTH`,
`AGENT_CONTINUITY`, `SEMANTIC_COMPATIBILITY`, `OWNER_PROVENANCE`,
`SYNTHETIC_CAMPAIGN`, `PATCH_INTEGRITY` and `WORKSPACE_INTEGRITY` all PASS in
both gates.

## 3. Regression totals

| Metric | Baseline (predecessor) | C-10 |
|---|---|---|
| Canonical Playwright regression | 2,839 total / 2,826 passed / 13 skipped / 0 failed | **2,920 total / 2,907 passed / 13 skipped / 0 failed** |
| Synthetic campaign | 12 files / 128 cases | **14 files / 209 cases**, `deepContainmentLane: PROVEN` |
| Semantic compatibility | — | 1,967 total / 1,954 passed / 13 skipped / 0 failed |
| C-10 suites | — | **81 tests in 2 files, 81 passed** |

The regression delta is exactly the 81 new C-10 cases. The pre-existing skip
count is unchanged at 13; no skip was added, and no test was removed.

## 4. Defects discovered and disposition

| ID | Defect | Disposition |
|---|---|---|
| DEF-C10-1 | A projected node could carry a field belonging to a DIFFERENT node type. The canonical writer switched on `node.type` and wrote only that type's fields, so an ARRAY-only field grafted onto an OBJECT node was silently ignored — the recomputed structural digest still MATCHED and the persistence firewall accepted the tampered structure. Found by the digest-privacy tamper case, not by review. | **FIXED** — exact per-type field sets (`PRODUCTION_NODE_FIELDS_BY_TYPE` and its evidence-form counterpart) validated on both boundaries, pinned by a named regression case. |
| DEF-C10-2 | The first non-vacuity assertion over-claimed: it required the raw JSON body to contain the console and thrown-exception sentinels, which are planted in different channels. | **FIXED** — the corpus is split into `BODY_SENTINELS` and `CHANNEL_SENTINELS` and each is proven to enter its OWN channel. No absence assertion was weakened; all sentinels are still swept for everywhere. |
| DEF-C10-3 | The new hardening capability pattern matched `regex.exec(`, which is not a process capability. | **FIXED** — negative lookbehind so only a bare global matches; the call site was also rewritten to `matchAll`. Rule then verified non-vacuous against a real `node:fs` import. |
| DEF-C10-4 | Five C-10 acceptance cases were Node-version dependent: a dynamic `await import()` of a TypeScript path resolves differently across Node majors, so the clean Node 20 gate failed cases that pass under Node 22. Production code was correct; the TESTS carried a loader assumption. | **FIXED** — converted to static imports, the idiom every other suite uses, holding in both topologies. Assertions byte-identical. Caught before integration rather than in CI. |

## 5. Before / after projection contract

| | Before (Phase 9 DEV, `nightwatch.semantic-projection.v1`) | After (C-10 production, `nightwatch.production-projection.v1`) |
|---|---|---|
| Object key literal | `ProjectionField.name` carries the RAW key; `serializer.ts` writes it into canonical bytes; `projectionDigest` hashes it | A literal survives only as a proven member of a source-proven finite key vocabulary |
| Unproven / dynamic key | persisted verbatim | literal DROPPED; only bounded cardinality and the value's structure survive |
| String value | type + presence + class + encounter token | type + EMPTY/NONEMPTY class; token is ephemeral and stripped before evidence |
| Number value | type + `numeric#NNNN` reference | type ALONE in persisted structure — a monetary amount is indistinguishable from a count |
| Digest | one family, `proj:sha256:`, ingesting key literals | `prodstruct:sha256:` STRUCTURAL only: value-free, unsalted, cross-campaign comparable |
| Persistence authority | projection and persistence not separated by capability | projection cone import-isolated with NO persistence; persistence accepts only the approved DTO |
| Raw input | `unknown` through helpers | one bounded, call-scoped `RawEphemeralSource` that yields once and refuses serialization |

The DEV projection is UNCHANGED and remains correct for DEV. It is load-bearing
for Phase 9/9A.1/10/10A admission, `semanticStateEquals`, path-based
expectations, `TYPE_IN_SET` and the PHP row-key contracts, so C-10 added a
versioned production sibling rather than rewriting it (D-C10-1).

## 6. Dynamic-key treatment (F-14, RESOLVED)

A key literal is data unless proven otherwise. Proof is membership in a
`ProvenKeyVocabulary`: a frozen value object carrying a finite bounded key set,
a provenance class (`SOURCE_PROVEN_OPENAPI_DEFINITION` from C-02a,
`SOURCE_PROVEN_PHP_ROW_KEYS`, or `SOURCE_PROVEN_FIXED_CONTRACT`) and an
`ev:sha256` provenance digest binding it to its source. There is deliberately
no `ASSUMED` or `MANUAL` member: a provenance label alone grants nothing.

The vocabulary is constructed OUTSIDE the cone and passed call-scoped, because
its proof sources live behind filesystem loaders that would break import
isolation (D-C10-4). No regular expression over key names is accepted as proof
anywhere.

Per object, the classification is `ALL_SOURCE_PROVEN`,
`BOUNDED_DYNAMIC_KEY_COLLECTION`, `MIXED` or `UNRESOLVED`. `UNRESOLVED` DENIES
persistence at both boundaries. A dynamic key contributes its count and its
value's structure only — never the literal, and never a digest derived from it,
because a digest over an enumerable domain (a 12-digit AWS account id, a
`YYYYMM` period) is invertible by enumeration and is not anonymization. Dynamic
entries are ordered by their own value-free structural bytes, so no ordering
information about the dropped keys survives. A caller must pass either a
vocabulary or the explicit `NO_PROVEN_VOCABULARY` sentinel: omission is a type
error, so ambiguous provenance cannot arrive by default.

## 7. Structural digest semantics (F-15, RESOLVED)

`prodstruct:sha256:<24>` is computed only from privacy-approved structural
information — node types, shape, cardinality, key-provenance classification and
source-proven key literals. It is unsalted, deterministic, stable across
equivalent runs and environments, comparable across campaigns, and persistable.
It is safe precisely because the canonical bytes it hashes contain no value and
no unproven key literal: the writer has no branch that emits an encounter
token, a numeric reference or a dynamic key literal.

The families cannot be merged or confused: distinct prefixes, distinct types,
and the persistence firewall refuses the Phase 9 `proj:sha256:` family by name.

## 8. Ephemeral value-correlation semantics

No durable value-derived digest exists. Nothing in C-10 required durable value
correlation, so per the campaign brief the concept was REMOVED from the
production persistence contract rather than invented, and the policy object
records `durableValueDigest: 'ABSENT'`. Correlation within one in-memory
analysis uses encounter-ORDER tokens (`enc#NNNN`, `num#NNNN`) — not hashes and
not derived from the value. They exist only in the ephemeral projection, are
stripped when evidence is built, and are rejected BY NAME by the firewall.
There is therefore no salt to persist and no low-entropy value hash to invert.

## 9. Production artifact-root design (Workstream G)

`$HOME/.nightwatch/prod-findings/`, a separate namespace from the DEV findings
root with its own policy identity (`nightwatch.production-artifact-policy.v1`,
`storageClass: OWNER_ONLY_LOCAL_PRODUCTION`,
`controlCenterVisibility: STRUCTURALLY_EXCLUDED`). Mode 0700 directories, 0600
files, symlink refusal at EVERY path component, repository and workspace
exclusion, atomic write via `openSync('wx') → fsync → rename`, bounded file
count, and an explicit evidence schema. There is no `writeRaw`, no
`attachScreenshot` and no `attachTrace`: the only write method takes evidence
that must pass the firewall, and the store re-validates on read too.

The store was built and synthetically tested against INJECTED disposable roots.
The suite asserts the DEFAULT root RESOLVES correctly without creating it. It
was never populated from any real environment.

## 10. Control Center exclusion proof (F-18, RESOLVED)

Exclusion is by RESOLVED PATH EQUIVALENCE, not string comparison: candidate and
production roots are resolved through `realpath` as far as they exist, and
containment is tested in BOTH directions so neither the production root nor any
ancestor of it can be handed to the authority. Both the default production root
and any environment-configured one are refused. The rule is applied on EVERY
construction route — `createFindingsAuthority()` and the test-only
`createFindingsAuthorityForTests()` — so a seam cannot become production
authority, and `hardening:check` asserts both call sites plus the use of
`realpathSync`.

Proven: normal DEV findings still work; production-root injection is refused
with `FINDINGS_ROOT_PRODUCTION_EXCLUDED`; a symlink pointing at the store is
refused; dot-segment and trailing-separator equivalence tricks are refused.
Workstream K additionally proved SSE cannot be a side channel — the event
contract is a CONSTRUCTED five-field allowlist (`schemaVersion`, `type`,
`entityId`, `sequence`, `snapshotDigest`) that discards arbitrary fields and
refuses unknown types, so a notification carries a digest at most and never the
state itself.

## 11. Console, profile and temporary-file handling (Workstream I)

Production console text cannot persist: `projectProductionConsoleEvent` returns
`{ consoleType, count }` and has NO field a page-provided string could occupy.
The page text is accepted as a parameter purely so the boundary is explicit and
testable, and is discarded. A planted console sentinel is proven absent from
every durable output. An unknown console type degrades to `other` rather than
passing through.

Production screenshots and Playwright traces are contract failures: the policy
object cannot be constructed with either enabled, and
`assertProductionCaptureAllowed` refuses a request categorically.

Browser profile: private ephemeral path with 0700 permissions, disk and media
cache disabled, crash dumps disabled (`--disable-breakpad`,
`--disable-crash-reporter`), cleanup on normal exit, and
`sweepStaleProductionProfiles` for the interrupted/crashed path. Cleanup
refuses any directory this module did not name. Stale profile residue is a
first-class violation class in the persistence audit. No real production
browser was launched.

## 12. Parameter-provenance privacy model (F-16)

Privacy model, validators and synthetic proof only — NO production request
execution path was created. Values are owner-supplied and stored external-only
like storage state; Nightwatch state holds an `OpaqueParameterHandle`
(`pph_<32 hex>`), a random label minted by the owner's external store and NOT a
digest of the value. `createOpaqueParameterHandle` takes no value parameter, so
there is no overload or option through which a concrete customer identifier can
enter Nightwatch state. `SafeRouteIdentity` binds a route TEMPLATE to its
handles and fails closed on a missing or unmatched placeholder.
`assertRouteTemplateOnly` and `assertNoConcreteParameterValue` are the checks
logs, budget keys, replay fingerprints, checkpoints, errors, receipts and
persisted URLs use; `assertHandleNotValue` refuses a raw value supplied where a
handle is required.

## 13. Acceptance results

| Class | Result |
|---|---|
| A. Sentinel corpus | PASS — 17 sentinels across scalars, numbers, customer/account/company/invoice/monetary values, free text, dynamic and nested dynamic keys, query/path parameters, headers, cookies, console text, thrown errors, dialog text and replay inputs. Zero sentinel bytes anywhere under any permitted root. Non-vacuous per channel, and the sweep is proven capable of failing by a planted-leak case. |
| B. Projection totality | PASS — 18-member deterministic corpus (deep nesting, arrays, dynamic maps, nested dynamic maps, repeats, empties, unicode keys and values, hostile keys, bounds, cycles, unsupported inputs); >40 literals checked, none crossing the boundary; every numeric value yields byte-identical structure. |
| C. Boundary import isolation | PASS — the cone imports no fs/net/process/publication module, `node:crypto` is its only node builtin, it references no persistence or process capability and never reads the environment, and raw bytes enter through the single call-scoped reader. Enforced additionally by `hardening:check`, verified non-vacuous. |
| D. Error-path leakage | PASS — 28 failure branches forced; every error is `REASON` or `REASON:DETAIL` from two closed vocabularies, with no extra segment and no sentinel. The error constructor physically cannot accept a free string. |
| E. Digest privacy | PASS — structural stability across runs, value insensitivity, dynamic-key-literal exclusion, source-proven-key significance, ephemeral tokens present in projection and absent from evidence, no persisted salt or low-entropy value hash, families not interchangeable, and tamper detection. |
| Persistence audit | CLEAN — zero violations across every permitted root, with bounded counts; proven capable of detecting sentinels, screenshots, traces, storage state, console payloads, unsafe permissions and browser-profile residue. |

## 14. Confirmations

- **No test or safety authority was weakened.** No `test.skip` was added; no
  privacy assertion was weakened; no failing test was removed; no error was
  suppressed; no limit was raised to make a test pass; no retry was introduced.
  The Phase 10 DEV key-literal assertion was RE-SCOPED IN PLACE with an added
  production counter-proof, not deleted. C-06 is untouched and remains
  fail-closed, and no attempt was made to increase `READ_ONLY_PROVEN`. The
  synthetic campaign grew (12→14 files, 128→209 cases); nothing was removed
  from it. `hardening:check` gained a rule and lost none.
- **Zero environment contact.** No production, DEV or NEXT contact; no
  authenticated browsing; no auth capture or refresh; no credential or
  auth-state inspection; no datastore, cloud, IAM or Kubernetes access; no
  sibling-repository write (`siblingWrites: 0` in the clean receipt); no
  external publication. No browser was launched against any environment. The
  production store was never populated from a real environment, and the real
  `$HOME/.nightwatch/prod-findings/` was never created — every filesystem
  assertion used a disposable injected root.
- **No production connectivity was created.** Production was not added to
  `SUPPORTED_ENVIRONMENTS`, `config/environments/production.json` remains
  non-loadable, and C-11 was not started.

## 15. Remaining deferred work

- **C-11 `PROD_OBSERVE` safety kernel** — must independently implement and
  prove the separate safety kernel and its ordered request gates against
  mock/synthetic production. C-10 creates the privacy prerequisite only and
  does NOT authorize production observation.
- **The future request-construction boundary** where an opaque handle resolves
  to a concrete value belongs to C-11/C-13. C-10 supplies the privacy contract
  and validators that boundary must satisfy; it deliberately does not build it.
- **Wiring the production cone into a live observation path** is out of scope
  by construction: no production caller exists, and none may until C-11.
- **`design.md §6.2/§6.4` supersession** — the master-plan text still specifies
  a per-campaign salted digest. C-10 records the F-15/MA-11/UA-11 supersession
  in its own OpenSpec change and decision log; folding it back into the
  master-plan design document is a documentation follow-up owned by the master
  plan, not by C-10.
