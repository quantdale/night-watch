# Phase 21 Report

Status: COMPLETE — LOCAL / SOURCE / SYNTHETIC
Task ID: phase-21-semantic-gap-closure
Phase: 21-SEMANTIC-GAP-CLOSURE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Scope and checkpoints

Starting SHA: `7a5f6d2ba5ece3bd3a4b21d5a4a15b9504cbd2ae`.

Validated implementation checkpoint: `69b0343a939f6c6ae8ea7e3c1103bbf3eb8aea0a`
(`feat: implement phase 21 semantic gap closure`). The durable documentation
checkpoint is `04ad56c8baa904b8fc8537a41e4fa2e90602770b`; the final live SHA is
always discovered from Git (`LIVE_HEAD_AUTHORITY: GIT`). No Phase 19 or Phase
20 task history was modified.

## Exact baseline

The Phase 20 baseline was retained without redefinition:

- 6 source artifacts; 22 discovered candidates; 21 admitted; 1 unsupported
  syntax rejection.
- Graph: 157 nodes / 151 edges / 86 gaps.
- Campaign-facing gap reasons: differential projection 20, mechanically
  provable uncovered 16, replay 18, minimization 15, duplicate semantic
  coverage 2, analyzer unsupported 1.
- Mutation: 34 generated / 32 applicable / 32 detected / 0 surviving;
  31 benign controls / 0 benign false positives; 32 replayed / minimized /
  high-confidence.

The versioned `nightwatch.semantic-gap-closure.v1` ledger preserves all 86
baseline gap identities and records lifecycle, reason, blocker, privacy and
mechanical-proof constraints, required capability, cost, eligibility, status,
and verification evidence. Its baseline digest is
`gap-closure:sha256:a4f164f148737a8b9d1a04fd`.

## Gap closure result

The final synthetic graph is 239 nodes / 233 edges / 3 gaps. The ledger has:

- 83 `OBSOLETE_AFTER_GRAPH_REBUILD` records;
- 0 `OPEN_ACTIONABLE` records;
- 3 `IRREDUCIBLE_SOURCE_PROOF` records;
- no anonymous unsupported bucket.

The three residuals are one unsupported source syntax/not-admitted contract
and two duplicate-semantic-coverage records for which a mechanically proven
duplicate equivalence join is not available. The duplicate records remain
explicitly unresolved; they were not falsely merged. The final graph digest is
`contract-graph:sha256:7144051de1777896980d4c94`.

Baseline-to-final campaign gap movement is:

| Gap class | Baseline | Final status |
|---|---:|---|
| Differential projection | 20 | 0 actionable; paired and projected |
| Replay | 18 | 0; contract-bound adapters |
| Mechanically provable uncovered | 16 | 0 actionable; synthetic bindings |
| Minimization | 15 | 0; dependency-aware reductions |
| Duplicate semantic coverage | 2 | 2 source-proof irreducible |
| Analyzer unsupported | 1 | 1 source-proof irreducible |

The ledger's original reason inventory also records 15 scenario/oracle graph
states as closed after the graph rebuild. No closure is claimed for the three
residual proof boundaries.

## Implemented capabilities

Privacy-safe membership is versioned as
`nightwatch.semantic-membership-projection.v1`. It supports bounded
`ALL_ALLOWED`, `SOME_DISALLOWED`, `NONE_ALLOWED`, `EXACT_ALLOWED_SET`,
`STRICT_SUBSET`, `SUPERSET_OR_UNKNOWN_MEMBER`, `MISSING`, `AMBIGUOUS`,
`TRUNCATED`, required-member, and mutually-exclusive categories. Comparisons
against source-bound metadata happen only in an ephemeral projection context;
raw values, raw identity tokens, source enum literals, and reconstructible
members never enter returned DTOs, digests, dossiers, findings, or errors.
Hostile labels, duplicate probes, truncation, high-cardinality sets, path abuse,
and digest-correlation attempts are covered by the privacy corpus.

The source-bound membership mutation slice makes enum/set mutants truthful:
46 generated / 46 applicable / 46 detected / 0 surviving, 33 benign controls /
0 benign false positives, and 46 replayed / minimized / high-confidence.
The existing Phase 20 no-membership path remains metric-compatible.

Differential discovery is evidence-bound and deterministic: 22 candidate rows,
21 `PAIR_ADMITTED`, and 1 `NO_SECOND_SURFACE`; zero pairs are admitted from
names alone. Fixed alignment rules cover scalar-to-singleton-list,
ordered-list-to-set, and absent-to-null only where the contract proves the
equivalence. The integrated cross-surface campaign is included in the
67-mutant lifecycle measurement below; no separate generic similarity score is
used.

Replay supports exact and contract-preserving semantic-equivalence outcomes,
representation changes, precondition/observation divergence, stale source,
changed contract, nondeterminism, non-reproduction, and invalid evidence.
Reproduction is bound to the semantic contract and occurrence identity. The
integrated campaign records 67 replay attempts, 67 exact reproductions, 0
replay gaps; equivalence/divergence classes are exercised by focused tests even
when this deterministic campaign's reproduced rows are exact.

Minimization supports relational, membership, differential, pagination,
ordering, aggregate, metamorphic, and multi-surface failures. Required
dependency edges are explicit; all 67 integrated detections have semantic
fixed-point proof, and removing a prerequisite is classified as precondition
divergence rather than a smaller equivalent finding.

Scenario-binding suggestions are deterministic and synthetic-only: 21 admitted
bindings, with no real-product execution authority. Coverage quality reaches
`FULL_LIFECYCLE` for 21 admitted contracts. The closure planner is deterministic
and ranks differential gaps first, while priority cannot authorize execution.
Graph normalization merges only an explicitly mechanically proven duplicate;
the two unproven duplicate shapes remain visible.

## Integrated mutation, replay, and quality measurements

The full Phase 21 synthetic campaign measures:

- 67 generated / 67 applicable / 67 detected / 0 surviving mutants;
- 54 benign controls / 0 benign false positives;
- 67 replayed / 67 minimized / 67 high-confidence detections;
- 21 full-lifecycle contracts.

Four of seven metamorphic relation kinds are exercised: stable order,
idempotent normalization, irrelevant-field invariance, and pagination
monotonicity. Duplicate-input normalization, deterministic grouping, and
presentation identity remain `NOT_JUSTIFIED` with exact source-proof reasons.

The adversarial corpus is 151 cases across 23 families, including 63 new
Phase 21 cases across 10 added families. Operation telemetry is deterministic:
175 projection derivations, 16 membership comparisons, 1 graph rebuild, 22
pair-discovery rows, 67 replay preparations, 268 minimization probes, and 67
mutation-generation units.

## Nightwatch defects found and repaired

The first complete Phase 9–21 cone found three additive CLI compatibility
defects: Phase 21 had displaced historical `plan`/`contracts` fields, and an
explicit child-process exit truncated the larger gap JSON. The wrapper now
drains output and preserves legacy fields while adding Phase 21 views. The
repaired cone passes without weakening existing assertions.

The first isolated-suite attempt had a test-topology setup defect: aggregate
sibling links were one directory too deep for the resolver. It was not a
Nightwatch implementation failure; a fresh clone with links at the expected
parent established the passing isolated result.

## Validation

- Focused Phase 19–21 compatibility tests: 48/48, 0 failures.
- Phase 9–21 compatibility cone: 1,295/1,295, 0 failures, 0 unexpected
  skips.
- `npm run campaign:synthetic`: 27/27.
- `npm run test:owner-provenance`: 91/91.
- `npm run typecheck`: PASS.
- `npm run hardening:check`: PASS.
- Canonical full Playwright: 2,333 enumerated / 2,329 passed / 4 skipped /
  0 failed.
- Topology-correct isolated full Playwright: exact same 2,333 / 2,329 / 4 / 0.
- Exact skip identity parity: `tests/unit/phase5Api.test.ts:197`, `:246`,
  `:280`, and `tests/unit/selfDevSandboxConfinement.test.ts:147`.

`npm run agent:check` and `npm run project:check` pass on the clean documentation
checkpoint with strict errors 0 and project-state PASS. External Actions is not
claimed green: the one permitted inspection observed run `32672981417` for the
pushed documentation checkpoint, job `97276539731` (`Local hardening checks`),
both `failure`, with `steps=[]`. This is the external billing/spending
restriction pattern; no retry was made and local results remain separate.

## Terminal Git record

- Implementation commit: `69b0343a939f6c6ae8ea7e3c1103bbf3eb8aea0a`.
- Documentation commit: `04ad56c8baa904b8fc8537a41e4fa2e90602770b`.
- Final live SHA: `DISCOVER_FROM_GIT` at the time this report is committed;
  final response must report the exact value discovered after the closure
  documentation push.
- Branch: `main`; pushes were non-forced; the final worktree must remain clean
  and `HEAD == origin/main`.

## Safety

No DEV/NEXT/production contact, authenticated browser state, database or
datastore query, cloud/GCP/GKE/AWS operation, sibling write, publication,
message, credential, raw real evidence, AI authority, self-development
promotion, or execution-authority expansion occurred. The permanent owner
scope freeze remains in force.
