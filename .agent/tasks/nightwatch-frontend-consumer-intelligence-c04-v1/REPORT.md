# REPORT — C-04 Frontend Consumer Intelligence

Status: COMPLETE
Task ID: nightwatch-frontend-consumer-intelligence-c04-v1
Starting SHA: 7c0d5f5326be1983cf081888680f3c01f3f128f6
Certified head: 0323d5fb1b5960f9f17e2b1fa519cc85918dbfaf

## What this campaign added

Frontend → backend route edges, derived mechanically from the approved Vue and
JavaScript source, with every path classified so that no non-literal path can
become a `SOURCE_FACT`.

## Requirement ledger

| Requirement | Status | Evidence |
|---|---|---|
| A1 edges measured per class; ≥400 evaluated truthfully | PASS (criterion FAILS at 382) | measured below |
| A2 zero SOURCE_FACT from a non-literal path | PASS | `nonLiteralSourceFacts` 0; probes P1/B1 |
| A3 no query values or customer identifiers persisted | PASS | query and hash stripped; probe P2 |
| A4 method never defaulted to GET | PASS | probe P4 |
| A5 join categorical, never stronger than its input | PASS | probes P3/B6 |
| A6 truncation and completeness visible | PASS | enumeration COMPLETE, reported |
| A7 suites gate-registered; probes bite | PASS | 2 suites + membership assertion; 16/16 probes |
| A8 C-01 no-eviction holds | PASS | C-02b and C-03 regressions green |
| A9 regression / clean / exact-head CI green | PASS | see Validation |

## Measured yield

Over a **COMPLETE** enumeration of `mobingilabs/ripple-ui@d80b161b` — 1,329 of
1,329 files, 0 dropped:

| Measure | Value |
|---|---|
| consumer edges | **382** |
| `SOURCE_FACT` | 348 — `LITERAL` 138, `STRUCTURAL` 210 |
| `INFERENCE` | 4 — `PARTIAL_SEGMENT` |
| `UNKNOWN` | 30 — `DYNAMIC` 24, `UNRESOLVED` 6 |
| from `.js` / `.vue` | 360 / 22 |
| **non-literal SOURCE_FACTs** | **0** |

Backend join against the 1,745-operation population: **164 PROVEN**, 21
AMBIGUOUS, 161 MISSING, 34 DYNAMIC, 2 METHOD_MISMATCH. All eight `axios.create`
instances recovered.

### The ≥400 criterion — FAILS at 382, and my first estimate was wrong

The criterion is not met. It is short by 18, about 4.5%.

The SPEC originally recorded 211 call sites and concluded the criterion failed
"by roughly a factor of two". **That estimate was wrong.** It came from a
line-oriented grep, and ripple-ui writes most calls across two lines:

```js
return baseApi
  .get(url)
```

`billingGroups.js` alone has 29 real call sites where the grep saw 6. Counted
whitespace-insensitively the corpus is 388; the parser reports 382 because it
correctly excludes 7 commented-out calls. The estimate missed 45% of the
corpus, and its conclusion described the measuring instrument rather than the
source. The SPEC and the OpenSpec audit both carry the correction visibly.

The remaining shortfall belongs to the authorization boundary: the approved
frontend universe is one repository, and reaching 400 needs another, which C-05
owns. A further 5 `streamPromise(...)` gRPC-stream sites exist and are
deliberately unsupported, recorded so the yield statement is complete.

## What the measurements changed before implementation

- ripple-ui contains **zero** `axios.get('/literal')` call sites. A parser
  written to the historical design's assumed shape would have found nothing.
- `fetch(` appears 189 times, 145 of them the no-argument Vuex action
  `fetch()`. Treating it as an HTTP indicator would have manufactured ~188
  non-edges and pushed the headline number toward the criterion while
  measuring nothing.
- `Cookies.get(...)` appears 56 times. Only identifiers bound by `axios.create`
  are treated as clients.

## The budget finding, twice over

`ripple-ui` was TRUNCATED at 773 of 1,329 files and yielded **one** edge,
because the enumeration walk charges every directory entry and stopped before
`src/vuex/api/` where nearly every call lives. Raised to the existing 4,096
contract ceiling it enumerates COMPLETE and yields 382.

C-03 hit the identical wall on ouchan. Both campaigns were bounded by a default
per-repository budget rather than by their parsers, and neither contract
ceiling was raised.

## Defects introduced by this campaign

### DEF-C04-1 — the pre-implementation ceiling was measured wrongly
- **Symptom.** SPEC and audit recorded 211 call sites and a "factor of two"
  shortfall.
- **Root cause.** A line-oriented grep against a corpus written multiline.
- **Fix.** Whitespace-insensitive recount, per-file verification, and the
  parser's own measurement over a complete enumeration. Both documents
  corrected in place with the reason visible.
- **Disposition.** REPAIRED. A campaign that records a baseline has to be
  willing to say when the baseline was wrong.

### DEF-C04-2 — the census harness outgrew its bounds
- **Symptom.** `eligibilityCensus.test.ts:211` failed with `status: null`.
- **Root cause.** The test spawns the census CLI with a 60s timeout. At 1,745
  operations a full census takes ~1m55s and renders 5.3 MB, so the spawn timed
  out — the same misleading symptom the `maxBuffer` note in that test already
  described.
- **Fix.** Timeout 300s (≈2.5× measured) and maxBuffer 128 MB, with the
  measured numbers recorded in the comment.
- **Disposition.** REPAIRED. A harness limit, not a product fact.

## Negative probes

16 attempted, 16 detected, 16 restored — 10 against `hardening:check`
(partial-segment promotion, query stripping, join upgrade, method defaulting,
client recognition, tokenizer default, toolchain dependency, filesystem
authority, suite deregistration, blueinternal admission) and 6 behavioural
(partial-segment as fact, cross-function resolution, comment exclusion, Vue
template leakage, reassignment, ambiguous-match resolution).

None was vacuous on its first run.

## Validation

| Check | Result |
|---|---|
| `typecheck`, `hardening:check`, `handoff:check` | PASS |
| `agent:check`, `workspace:check`, `gate:inventory` | PASS |
| `test:semantic-compat` | PASS 2,033 / 2,020 / 13 skipped / 0 failed |
| `campaign:synthetic` | PASS 561 / 561, containment lane PROVEN |
| canonical regression | PASS 3,338 / 3,325 / 13 skipped / 0 failed |
| `gate:clean` | PASS at 0323d5f, inner `receipt:sha256:9ad8e572fe6eed991f7a7dea`, clean `clean-receipt:sha256:9774da785bc2325d42d690fa`, siblingWrites 0 |
| exact-head CI | PASS, run `33744974...` job `100614907944`, receipt `receipt:sha256:6cba46d8990802d39f4b4e26`, all 11 groups |

Failed attempts, none omitted:

- CI at `fca9dd19` — run `33744658077` / job `100614259482`, FAIL,
  `PROJECT_TRUTH` only, receipt `receipt:sha256:188784f2dc3355363e709692`.
  PROJECT_TRUTH_ORDERING; not retried.
- `test:semantic-compat` reported TIMEOUT once, while another full playwright
  suite was still running on the same machine. Timed on a quiet machine the
  same suite completes in **11m38s** against a 20-minute bound and passes
  2,033 / 2,020 / 13 / 0; a clean re-run passes too. Classified ENVIRONMENT
  (contention), NOT flake — there are two clean passes and an identified cause.
  Discovery cost did grow with the corpus, measured 8.9s → 11.1s per call, and
  that is recorded rather than waved away.
- `campaign:synthetic` failed once on `eligibilityCensus.test.ts:211` — that is
  DEF-C04-2 above, fixed.

## Safety confirmation

- Zero production, DEV and NEXT contact. No network, credentials, cookies,
  auth state or customer data. Query strings and fragments are stripped before
  persistence, so no runtime value enters durable evidence.
- Zero sibling writes (`siblingWrites: 0`). Siblings read only.
- No repository admitted. `.vue` is a LANGUAGE admission. Contract ceilings
  unchanged.
- No rendering, execution, bundling, browser, sibling `node_modules`, or
  frontend toolchain dependency.
- C-11 unchanged. C-12 NOT started.
- No force push, no history rewrite, no destructive git operation.

## What C-15b receives

382 classified consumer edges, 164 of them joined to a specific backend
operation with provenance, and an explicit class on every one. That is the
input for the operator query "show the path from this UI control to the backend
handler".

## Deferred

- Any further frontend repository: `BLOCKED_BY_C05_REPOSITORY_ADMISSION`.
- The 5 `streamPromise(...)` gRPC-stream consumer sites: a real pattern this
  campaign does not support, recorded rather than silently excluded.
- `tests/unit/c02aOpenApiAdmission.test.ts` and
  `tests/unit/c06PhpReadOnlyProof.test.ts` remain in neither gate manifest.
  PRE_EXISTING across three campaigns now; it wants its own authorized change.
