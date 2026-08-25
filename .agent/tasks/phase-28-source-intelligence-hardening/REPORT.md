# Phase 28 Report

Task ID: phase-28-source-intelligence-hardening
Phase: 28-EVIDENCE-DRIVEN-SOURCE-INTELLIGENCE-HARDENING
Status: COMPLETE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Campaign

Phase 28 hardened Nightwatch's approved-source intelligence using a fresh
source census, bounded rejection taxonomy, exact resolver diagnostics,
resource budgets, dependency/currentness tests, operator integration, and an
expanded synthetic/adversarial matrix. The campaign remained
LOCAL / SOURCE / SYNTHETIC only. Its objective was trustworthy mechanical
coverage, not a larger coverage number.

## Starting state

Starting SHA: `09979f6d8f22dc28d9a07bdf99e263578ee0b3e9`.

That SHA was also live `main` and `origin/main` after the mandatory fetch and
prune. Phase 27 was complete and was not reopened. Its relevant terminal
baseline was 6 current repositories; 1,732 files considered, 1,092 read,
1,078 admitted, 654 rejected, 12,449,877 bytes; 128 operations; 127 route
proofs and request contracts; 83 response contracts; 175 semantic
observations; 118 proven and 10 rejected joins; 13 response-flow attempts,
0 proven, 13 rejected, 0 resolved calls, and maximum depth 0; lifecycle
45/80/3; and Phase 24 3 eligible / 125 excluded.

## Fresh census

The current approved source was rescanned through the existing confined
read-only boundary. The six current repository SHAs were:

- blue-sdk-go `8883ee3d3a073352626c8c35e20e9fc5ed765373`
- blueapi `691422e5dc81afd263d064986fb50fcb3ea432a9`
- grpc-chunk-parser `66802f281698dfcf0903f0a117d4637fce3fd945`
- ouchan `565f00a87fb7616cc23c45d4ffeabee38a41c65f`
- ripple-api `27bb007ad0c798800b6bd3b29760c966422966e7`
- ripple-ui `d80b161b684d9153c7e5acaa65ae1752d93d8ba9`

The source snapshot is `srcsnapshot:sha256:04ff583971865f335902f5ad`.
Inventory is 1,732 considered / 1,092 read / 1,078 admitted / 654 rejected,
12,449,877 bytes, 440 directories, 2 bounded budget rejections, and zero
symlink/path rejections. The source configuration digest is
`srcconfig:sha256:e8bdfc8f0e58d7d93a87215`.

The fresh ephemeral producer census classified variable-return handlers as
34 literal/control-flow, 16 multiple-assignment, 12 no-local-assignment, and
4 opaque-assignment cases. Zero strict single-assignment direct-literal
producers passed the admission gate. No raw source or runtime value was
retained.

## Decision

Phase 28 remained a hardening campaign. `LOCAL_PRODUCER_ALIAS_FLOW` was not
admitted because current approved source contains no strict candidate with
the required exact local identity, complete reaching definitions, static
terminal shape, bounded dependencies, and falsifiable positive/negative
matrix. This is an evidence decision, not a missed coverage claim.

The remaining response-flow population is 9 dynamic-dispatch rejections, 3
unsupported-helper-syntax rejections, and 1 incomplete-branch rejection.
Other prominent proof-gap categories are 7 analyzer dynamic-key/incomplete
branch rows, 15 analyzer unsupported-syntax/incomplete-branch rows, 9
missing-symbol rows, and 1 outside-scope row. All remain fail-closed.

## Implementation

- Added schema-v3, bounded, deterministic source-gap taxonomy over sanitized
  inventory and surface facts. Dimensions include repository, language,
  route/handler, proof states, analyzer/version, rejection family/code,
  syntax, control flow, return expression, declaration resolution, lexical
  budget, currentness, and ambiguity.
- Added bounded rejection-family vocabulary and preserved the resolver's
  categorical flow reason through the source-surface boundary instead of
  collapsing every flow failure to generic unsupported syntax.
- Added source-byte, tokenizer, return-site, declaration-index, and resolved
  declaration budgets. Budget exhaustion has distinct safe categories and
  never creates proof. The tokenizer now avoids unnecessary token-array copies
  and rejects source/token limits before deep analysis.
- Added taxonomy-version cache identity, same-SHA stale-content tests,
  dependency/currentness invalidation tests, deterministic before/after
  taxonomy deltas, and exact handling for duplicate or repeated dependencies.
- Integrated taxonomy, deltas, and advisory performance metrics into the
  existing source discovery, response-flow, graph, invalidation, review,
  explain/operator, Phase 24, CLI, and quality-gate seams.
- Added `source-gaps` operator output. Human and JSON output agree on all
  semantic counters, taxonomy digest, proof-gap counts, and portfolio counts;
  timing is explicitly advisory and not part of deterministic identity.
- Added 10 Phase 28 focused tests and wired them into the synthetic and gate
  inventories. The adversarial matrix covers malformed PHP, declaration and
  depth boundaries, cycles/fan-out, stale content, source/token budgets,
  branch/return-site budgets, privacy sentinels, and false-positive controls.

## Bugs and weaknesses found

The main architectural weakness was not in resolver safety but at the surface
boundary: precise resolver rejection codes were being hidden by a generic
diagnostic category. This made gap aggregation less actionable without making
the resolver unsound. Phase 28 corrected that distinction.

The source census also showed that the attractive local producer-flow feature
would currently require broad control-flow/data-flow reasoning. Admitting it
would have introduced speculative authority, so it remains excluded.

The first canonical and first isolated full runs each exposed one different
timing-sensitive pre-existing journey-fixture failure. The exact assertions
passed in narrow repetitions (canonical cancellation 4/4; isolated mutation
5/5), and second complete runs passed cleanly. No assertion was weakened and
no unrelated journey code was changed.

## Proof impact

Coverage did not increase. The following remained exactly at the Phase 27
values: 128 operations, 127 route proofs, 127 request contracts, 83 response
contracts, 175 semantic observations, 118 proven joins, 10 rejected joins,
13 flow attempts / 0 proven / 13 rejected, 0 resolved calls, maximum flow
depth 0, lifecycle 45 `DISCOVERED` / 80 `MECHANICALLY_PROVEN` /
3 `PROJECTABLE`, and Phase 24 128 considered / 3 eligible / 125 excluded.
No rejection reclassification is counted as a proof.

The new taxonomy records 45 proof-gap surfaces and 325 rejected diagnostics.
Its deterministic digest is
`source-gap-taxonomy:sha256:7adf9ef4eee0788461b34494`; the source discovery
digest is `source-surface-discovery:sha256:2d108b82aea01b1d61930698`.

| Metric | Phase 27 | Phase 28 final |
| --- | ---: | ---: |
| Files considered / read / admitted / rejected | 1,732 / 1,092 / 1,078 / 654 | 1,732 / 1,092 / 1,078 / 654 |
| Source bytes inspected | 12,449,877 | 12,449,877 |
| Operations / route proofs | 128 / 127 | 128 / 127 |
| Request / response contracts | 127 / 83 | 127 / 83 |
| Semantic observations | 175 | 175 |
| Joins proven / rejected | 118 / 10 | 118 / 10 |
| Flow attempts / proven / rejected | 13 / 0 / 13 | 13 / 0 / 13 |
| Resolved flow calls / max depth | 0 / 0 | 0 / 0 |
| Indexed PHP declarations | not previously measured | 766; max/file 60 |
| Lifecycle DISCOVERED / MECHANICALLY_PROVEN / PROJECTABLE | 45 / 80 / 3 | 45 / 80 / 3 |
| Phase 24 considered / eligible / excluded | 128 / 3 / 125 | 128 / 3 / 125 |
| Proof-gap surfaces / rejected diagnostics | not available as a bounded taxonomy | 45 / 325, taxonomy v3 |
| Strict local producer candidates | not captured | 0 |
| Oversized lexical population | 28 known Phase 27 exclusions | bounded source/token/index/return budgets; no silent truncation proof |
| Cache/currentness result | existing fail-closed behavior | PASS; taxonomy versioned, stale/relevant dependency cases rejected |
| Deterministic source snapshot | `srcsnapshot:sha256:04ff583971865f335902f5ad` | same |
| Representative scan/project timing | not previously measured | 2.893s total sample; 1.342s scan, 0.133s flow index, 0.012s resolve, 1.551s projection; advisory variance observed |
| Known false-positive admissions | 0 | 0 |

Current PHP maxima were 242,093 source bytes and 32,027 tokens, below the
400,000-byte response-flow source bound and 500,000-token tokenizer bound.
No source value was persisted as a diagnostic, taxonomy sample, cache entry,
or report field.

## Hardening impact

Taxonomy cardinality is bounded at 64 rows per dimension with bounded safe
samples and an explicit omitted-count category. The observed dimension row
counts are proof-domain 3, repository 1, language 2, route 2, handler 2,
response state 4, semantic state 4, analyzer 6, analyzer version 4,
rejection family 5, rejection code 10, syntax 7, control flow 3, return
expression 7, declaration resolution 3, lexical budget 1, currentness 1,
and ambiguity 3.

Diagnostics do not contain source fragments, tokens, literal payloads,
credentials, cookies, authorization strings, customer data, oversized string
contents, or raw parser/exception text. All privacy and adversarial fixtures
retain the hard-zero false-positive and leakage floors.

Resolver limits now distinguish depth/declaration, source-byte, declaration
index, branch/return-site, and lexical/token budgets. Currentness remains
bound to repository SHA, content digest, declaration identity, dependency
lineage, and cache/analyzer/taxonomy identity. Filesystem order is normalized;
reversed input and repeated runs produce the same structural digests.

## Validation

The following required checks passed:

- `npm run typecheck`
- `npm run hardening:check`
- `npm run quality-gate:spec` — digest
  `sha256:3d0a4c3f845f91c348a994bb056b130a286c3102e1f86267124328299fa26a47`,
  22 phases / 139 compatibility files
- `npm run gate:inventory` — 148 authoritative unique test files, no duplicates
- `npm run test:semantic-compat` — final gate execution 1,874 total / 1,861 passed / 13 skipped / 0 failed
- `npm run campaign:synthetic` — 49/49
- `npm run test:owner-provenance` — 91/91
- `npm run agent:check` — PASS, with only historical-v1/checkpoint warnings
- `npm run agent:audit` — 71 tasks, 47 strict v2, 24 historical v1, 0 strict errors
- `npm run project:check` — PASS
- `npm run gate:local` — PASS at terminal head `8aff7ab673c70e240aa8a77be1215e4b7ef87f35`,
  receipt `receipt:sha256:fd0101624bac91e329479b3a`
- `npm run gate:clean` — PASS, clean receipt
  `clean-receipt:sha256:aeab15e9ef1a373c0e0fa17a`, gate receipt
  `receipt:sha256:25321663031ff751513069ec`; Node20, clean before/after,
  no node_modules reuse, and sibling writes 0
- Phase 28 focused suite — 10/10
- Relevant Phase 25/26/27/28 regression suite — 22/22
- Canonical complete Playwright — 2,454 discovered / 2,438 passed /
  16 skipped / 0 failed, serial workers=1
- Topology-correct isolated complete Playwright — 2,454 discovered /
  2,438 passed / 16 skipped / 0 failed, serial workers=1; exact parity
- `git diff --check` — PASS

## External CI

The permitted bounded exact-head observer was run after the substantive
implementation checkpoint. GitHub Actions run `32819574544`, job
`97714690619` (`Executable quality gate`), matched exact head
`7e0b8c1ca584326dd8e7fa9bbf28ba8240fcf37c`, concluded failure with zero
executed steps, and was classified
`NO_STEPS_BILLING_OR_PLATFORM_BLOCK` / `REQUIRED_JOB_STEPS_EMPTY`. It is not
called green and is not classified as a Nightwatch product failure. No retry
loop or log retrieval was performed.

## Safety ledger

All prohibited real-world operation counts are zero:

- DEV, NEXT, production, authenticated browser state, and product requests: 0
- Product mutations, datastore/database/SQL queries, and customer-data reads: 0
- GCP/GKE/Kubernetes, AWS IAM/STS, runtime-role, and infrastructure actions: 0
- Alphaus repository writes, sibling installations, and sibling commits: 0
- Slack/email/messages, external issues, publication, and evidence uploads: 0
- Canonical self-development promotions and AI runtime execution: 0
- Raw private source/value persistence outside the ephemeral analyzer boundary: 0

Only local Git operations, confined read-only sibling-source reads, synthetic
fixtures, local browser fixtures, and the bounded GitHub Actions status read
were used.

## Git closure

Campaign start SHA: `09979f6d8f22dc28d9a07bdf99e263578ee0b3e9`. The substantive
implementation checkpoint was `7e0b8c1ca584326dd8e7fa9bbf28ba8240fcf37c`; the
validated documentation descendant before terminal closure was
`b58624b7dfb040dca68c402186ae36dae91e4b88`. Implementation and documentation
checkpoints were pushed directly to `origin/main` without force-push.

The final terminal documentation/report checkpoint is the commit containing
this report. Live `HEAD`, `origin/main`, branch, and cleanliness are verified
from Git after that commit; the report does not predict its own SHA.

## Remaining work

Ranked exclusions are intentionally deferred rather than promoted into proof:

1. Dynamic dispatch and variable callables remain the largest exact-flow
   rejection family (9 current attempts).
2. Branch-incomplete/unsupported helper syntax and dynamic-key producers
   remain bounded analyzer gaps (22 combined analyzer rows plus one flow
   branch gap).
3. Missing symbols, outside-scope results, property/service chains,
   factories/resources/DTOs, and opaque producers remain fail-closed.
4. Namespace/import, inheritance/trait/interface, magic/reflection/eval, and
   generic PHP data flow remain outside the proof model.
5. External Actions billing/platform execution remains unavailable; this is
   external evidence debt, not a reason to weaken local gates.

## Recommended next campaign

STOP. No meaningful successor implementation or hardening campaign is
justified by the final evidence. A future campaign should be selected only
after a fresh live `main` and approved-source census demonstrates either a
real exact proof family that passes the frozen admission gate or a concrete
current hardening defect. Phase 28's remaining exclusions are intentional
fail-closed boundaries, not artificial backlog.
