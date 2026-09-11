# Audit — R-12

Audited at `cdfe9d7865dbf95f1cadfde1cf8e318bcd7a11a0` in the canonical
checkout, read-only, before any implementation.

## Gate topology

`config/quality-gate.v1.json` defines eleven required groups:
GATE_DEFINITION, STATIC, HARDENING, HANDOFF_TRUTH, PROJECT_TRUTH,
AGENT_CONTINUITY, SEMANTIC_COMPATIBILITY, OWNER_PROVENANCE,
SYNTHETIC_CAMPAIGN, PATCH_INTEGRITY, WORKSPACE_INTEGRITY.

Test-executing groups, and what selects their suites:

| Group | Selector |
|---|---|
| SEMANTIC_COMPATIBILITY | `config/semantic-compatibility.v1.json` — 22 phase suites + 22 support files |
| OWNER_PROVENANCE | three suites named literally in `package.json` |
| SYNTHETIC_CAMPAIGN | `config/synthetic-campaign.v1.json` — 27 files |

`npm test` (`playwright test`, all 238 suites) is NOT a gate group. This is
the finding: gate coverage is manifest-scoped, and the canonical regression is
a separate human-run observation.

## Registration census

238 suites in `tests/unit`; 173 appear in the two manifests; 65 do not. Of the
65, six are campaign certification suites:

- `tests/unit/sourceOperationCompleteness.test.ts` (C-01)
- `tests/unit/sourceInventoryCompleteness.test.ts` (C-01)
- `tests/unit/cacheCurrentness.test.ts` (C-01)
- `tests/unit/callScopedSourceRead.test.ts` (C-01)
- `tests/unit/c02aOpenApiAdmission.test.ts` (C-02a)
- `tests/unit/c06PhpReadOnlyProof.test.ts` (C-06)

The remaining 59 are non-campaign infrastructure suites and are out of R-12's
frozen scope; they are recorded here so their exclusion is explicit rather
than silent.

## CI executability

`tests/unit/c06PhpReadOnlyProof.test.ts` builds disposable temporary
repositories and points `createSiblingSourceAccess` at those; it never reads
`DEFAULT_SIBLING_ROOT`. Fully CI-safe.

`tests/unit/c02aOpenApiAdmission.test.ts` has five `test.describe` blocks. Four
are inline-fixture deterministic. The fifth, "the real committed blueapi
artifact", carries `test.skip(() => !siblingRepoAvailable(BLUEAPI) ||
!siblingRepoAvailable(RIPPLE_API))` at line 313. CI-safe with a truthful skip.

The four C-01 suites contain no `test.skip`, no `DEFAULT_SIBLING_ROOT` and no
sibling existence probe. Fully CI-safe.

`bin/campaign-synthetic.mjs` parses `passed`, `skipped`, `didNotRun` and
`failed` into its receipt and exits non-zero only on a non-zero Playwright
status. A skip is recorded, not failed, and not silently folded into `passed`.

## Enforcement census

`bin/hardening-check.mjs` enforces registration in four hand-written loops:
line 2547 (C-02b, 3 suites), 2654 (C-03, 2), 2751 (C-04, 2), 2853 (C-15b, 2).
There is no generic rule, so a campaign that omits its loop is unprotected.
C-01, C-02a and C-06 each omitted one.

## Campaign ledger

Eleven task directories match `-(c|r)N[a-z]*-vN`: C-00, C-01, C-02a, C-02b,
C-03, C-04, C-06, C-10, C-11, C-15b, R-11. All eleven report
`Status: COMPLETE`. This bounded, real campaign metadata is a stronger
completeness source than a test-filename pattern.

## Documentation drift

`openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/tasks.md`
still carries `- [ ]` for C-02b (line 54), C-03 (55), C-04 (56) and C-11 (70),
all of which are COMPLETE with registered suites and recorded certification.
Line 77's C-15 row says "C-15b graph rebuild remains open"; C-15b is COMPLETE
and certified at run 33750522362, while C-15c is genuinely open.

`docs/CURRENT_STATE.md`'s "Project-state v2" prose table names `7879660`,
`2a64369` and `3c4756c` with a C-11/R-11 narrative, while the machine block
below it carries `29a1bbd` and `c7707218…` at C-15b with `EXECUTED_PASS`. The
validator does not read the prose, so the drift is invisible to it. The
`LAST_SUBSTANTIVE_IMPLEMENTATION_SHA` row is additionally malformed: six cells
in a five-column table, concatenating a C-11 "Why" and an R-11 "Why".
