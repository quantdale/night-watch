# Source-Proof Soundness + Static Discovery Hardening — Execution Report

Status: IN_PROGRESS
Campaign result: LOCAL_ACCEPTANCE_COMPLETE_EXTERNAL_ACTIONS_RECORDED

Task ID: `nightwatch-source-proof-soundness-and-static-discovery-hardening-v1`
Phase: SOURCE-PROOF-SOUNDNESS-AND-STATIC-DISCOVERY-HARDENING-V1
CONTINUITY_PROTOCOL_VERSION: `nightwatch.agent-continuity.v2`
Starting SHA: `54090566dad7ba3f65c9ffb2a398e4fcf1fad52b`
Last validated implementation SHA: `15fe2c108d6b044f4e0b3a99d2b83e7feb81c157`
Last substantive checkpoint SHA: `15fe2c108d6b044f4e0b3a99d2b83e7feb81c157`

Closure documentation checkpoint `b4c6b715f90de5814ec8e939b1d255c36f32db5c`
was pushed without force. External GitHub Actions run `33031299302` matched
that head and completed `failure`; its sole job `98384195570` completed
`failure` with `steps: []`. This is external non-evidence, not a CI-green
claim. Final continuity synchronization remains in progress while the checker
is repaired to recognize the completed OpenSpec checklist as a planning-only
checkpoint.

## Executive summary

The campaign reproduced and repaired three source-proof integrity defects:

1. PHP direct-return analysis treated observed literal returns as exhaustive,
   allowing an implicit function-end fall-through to become a response and
   semantic proof.
2. TypeScript/JavaScript/Go route extraction matched route-shaped text inside
   comments, strings, templates, raw strings, and regex literals.
3. PHP handler declaration counting matched fake declarations in comments and
   strings, contaminating exact route-handler joins.

The repairs are bounded, deterministic, static, and fail closed. No new proof
family or Phase-24 authority was added. The final disposition is
`NO_SAFE_NEW_FAMILY`; existing authority remains the sole selector authority.

## Audit and scope

The activation baseline was `5409056`, with a NUL-safe 1,319/1,319 tracked-file
audit. The final audit after adding the lexical helper reviewed 1,320/1,320
regular tracked files, with 14,395,035 bytes, 287,839 lines, and manifest
digest `5cad2a5a8eb9336c52c4e8e741e666033c91ebec66cc64ed82bfba9cf5f45942`.
The source boundary remained local and approved-read-only; source text was
not persisted in returned DTOs, findings, fingerprints, task records, or
errors. The known marker sweep found only existing synthetic test sentinels.

No Alphaus repository was modified. No DEV/NEXT/production contact, auth or
credential read, datastore/cloud/infrastructure operation, publication,
runtime AI call, or canonical promotion occurred.

## Implementation

- `sourceAnalyzers.ts` now has a narrow PHP direct-return completeness guard.
  It preserves unconditional returns, terminal fallback returns, and complete
  top-level `if`/`elseif`/`else` branches, while rejecting implicit fallthrough,
  nested flow, loops, exceptions, yield, exit-like terms, malformed forms, and
  non-literal return expressions. The load-bearing response analyzer advanced
  from v3 to v4; alias and branch families remain separate.
- `source/lexical.ts` adds a bounded TS/JS/Go tokenizer that removes comments,
  opaque quoted/template/raw strings, regex literals, and malformed lexical
  regions before route matching. It preserves source order and existing caps.
- `source/surfaces.ts` uses token matches for static routes and exact PHP,
  TS/JS, and Go declaration counting. TS/JS receiver matching remains
  case-insensitive as before; Go HTTP methods remain exact uppercase. A cheap
  raw receiver/method/dot anchor only skips files with no possible route; it
  never creates route authority because all passing files are still tokenized.
- Post-scan content-digest mismatches now make handler/schema joins and the
  descriptor `SOURCE_STALE`; stale runtime catalog bindings remain distinct
  and map to Phase-24 candidate `DRIFTED` source version.
- The continuity checker now treats the exact OpenSpec change checklist path
  `openspec/changes/<change>/tasks.md` as a planning-only checkpoint, with a
  regression assertion; unrelated OpenSpec paths remain unapproved.

## Reproduction and differential result

The pre-fix probe run was 15 passing controls plus 8 expected failures. The
post-fix focused cone is 74/74. The final source discovery retains 128
operations, 127 route proofs, 127 request proofs, 118 proven / 10 rejected
joins, and zero ambiguous routes. The final discovery digest is
`source-surface-discovery:sha256:906830010ed198639d3c7b91`.

Compared with the safe baseline, operation identities did not change. The
only proof transitions are 40 `PROVEN -> UNSUPPORTED_REFERENCE` response and
semantic transitions caused by the reproduced PHP reachability defect; the
remaining 43 response-proof surfaces stay proven. Unexplained identity drift
is zero.

Final source snapshot and census digests:

- Snapshot: `srcsnapshot:sha256:04ff583971865f335902f5ad`
- Eligibility: `source-eligibility-census:sha256:2f97b732e0472df347f695a1`
- Read-only candidates: `source-readonly-candidate-census:sha256:c54347c14d4d1e5f95f18660`

The current eligibility result is 3 eligible / 125 excluded with zero
currentness failures. Read-only candidate families remain investigation-only:
direct pure-return 0, exact bounded declaration cone 13 attempts / 0 complete,
known-read registry 5 existing / 3 currently eligible, and GET-only 81 as a
negative control. The exact disposition is `NO_SAFE_NEW_FAMILY`.

## Performance and bounds

Fair pre-prefilter measurements from the disposable baseline were source-gaps
6.62 s / 264,956 KB, eligibility 6.03 s / 264,220 KB, and readonly 8.02 s /
264,992 KB. Final post-prefilter measurements were 4.76 s / 266,300 KB,
4.82 s / 266,084 KB, and 5.14 s / 268,644 KB. The prefilter removed
unnecessary token allocations while preserving lexical matching. Existing
2,000,000-byte source and 500,000-token limits remain enforced; the maximum
observed source was 242,093 bytes and maximum token population 32,027.

## Validation

- Focused Phase 25–28 plus call-scoped source-read tests: 74 passed.
- Real-source extraction/currentness/admission/parity and source metrics cone:
  60 passed.
- Synthetic campaign: 66 passed.
- Semantic compatibility: 1,901 total / 1,888 passed / 13 skipped / 0 failed.
- Owner provenance: 91 passed.
- Typecheck, hardening, quality-gate spec, and gate inventory: passed.
- Canonical Playwright enumeration: 2,555 tests in 209 files; five new tests,
  no added skips or weakened assertions.
- Local nine-group gate at implementation checkpoint: passed; receipt
  `receipt:sha256:5a514e065b287bc4e6fb4839`.
- Fresh Node20 disposable nine-group gate: passed; gate receipt
  `receipt:sha256:21240f63fcd5a926e094478c` and clean receipt
  `clean-receipt:sha256:95622c261d62483259844deb`.
- Project truth, continuity, and final tracked-file accounting passed. The
  implementation checkpoint `15fe2c1` was pushed without force and verified
  equal to `origin/main` with a clean tree.

The one exact-head GitHub Actions observation was run `33031299302` for head
`b4c6b715f90de5814ec8e939b1d255c36f32db5c`; the sole job was
`98384195570` (`Executable quality gate`), completed with `failure`, and had
`steps: []`. It is classified as external non-evidence under the repository's
zero-step billing/platform rule; local/source/synthetic validation remains the
terminal acceptance evidence.

## Safety and follow-up

The owner freeze remains intact. Unsupported dynamic/runtime/framework/data/
infrastructure/authenticated execution remains excluded. Future proof-family
work requires a fresh current-source census and separate authorization; this
campaign must not be used to infer promotion authority from candidate
availability. The task remains in progress only for the narrow
continuity-checkpoint policy repair described above. Any unrelated future work
requires a fresh task and authorization.
