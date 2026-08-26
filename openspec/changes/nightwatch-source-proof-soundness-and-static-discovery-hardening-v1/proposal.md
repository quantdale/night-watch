# Proposal: Source-Proof Soundness + Static Discovery Hardening

Status: PLANNED — authorized for executor pickup; implementation is intentionally not started by this planning commit.
Change ID: nightwatch-source-proof-soundness-and-static-discovery-hardening-v1
Planning baseline: main at 266b5fcbb4c80125939f41df3bf9b5608654c753
Execution budget: approximately 12 productive engineering hours
Safety scope: LOCAL / approved read-only source / synthetic only

## Why this change

Nightwatch's latest source-analysis runtime hardening campaign is terminal and explicitly requires a fresh successor task. A new audit of the current source-to-campaign path found that the next high-value work is correctness, not another performance pass.

Current source-proof census from the latest completed campaign:

- 128 discovered source surfaces
- 127 route proofs
- 127 request contracts
- 83 response-contract surfaces
- 83 semantic-contract surfaces / 175 semantic observations
- 118 proven joins / 10 rejected joins
- 47 mutation-capable operations
- 5 independently proven read-only operations
- 5 exact runtime/replay bindings
- 3 Phase-24 eligible / 125 excluded
- first blockers: 44 response-contract, 37 mutability-classification, 43 read-only-proof, 1 route, 3 complete
- unsupported diagnostics include 115 control-flow, 9 dynamic-dispatch, 22 return-expression, and 179 unsupported-syntax observations

The prior proof-chain campaigns correctly refused to manufacture new authority from these gaps. This campaign keeps that rule.

The new planner audit identified two concrete soundness seams that must be reproduced before any coverage expansion:

1. The extended PHP direct-return response analyzer scans literal return arrays and can emit mechanically-provable response shapes without visibly establishing that all reachable function exits return a compatible response. A minimal if-branch with no else/fallback therefore has a plausible implicit-fall-through false-proof path. Because src/core/source/surfaces.ts marks responseProof and semanticProof PROVEN whenever at least one mechanically-provable shape exists, this is authority-bearing if reproduced.
2. Static TypeScript/JavaScript/Go route discovery and PHP handler declaration counting use regular expressions over raw source text. Code-like text inside comments or strings can therefore plausibly create spurious routes or declaration counts. Even where downstream gates later reject the surface, source inventory/join truth must not be contaminated by lexical false positives.

These are correctness and evidence-integrity concerns. They outrank cosmetic decomposition, lint adoption, further caching, or attempts to increase Phase-24 counts.

## Intended outcome

Harden the source-proof chain so a PROVEN route, handler join, response contract, semantic contract, or downstream candidate can only be produced from structurally reachable, lexically real source constructs within Nightwatch's existing bounded static-analysis model.

The executor SHALL:

- complete a literal tracked-file audit from the local checkout before implementation;
- reproduce or falsify every planner-identified soundness probe;
- repair confirmed false-proof / false-discovery paths fail-closed;
- version/invalidate proof identities when semantics change;
- preserve existing valid proofs unless a prior proof is shown unsound;
- run a fresh source/eligibility census after hardening;
- only attempt one additional exact static proof family if fresh evidence shows a mechanically complete family with positive and adversarial exemplars;
- otherwise spend the remaining budget strengthening adversarial coverage, lexical isolation, architecture boundaries, and regression evidence inside this scope.

## Non-goals

This change does NOT authorize:

- DEV, NEXT, production, authenticated product, data, infrastructure, or cloud contact;
- sibling-source writes;
- runtime PHP/framework execution or container/service emulation;
- dynamic dispatch inference, fuzzy symbol matching, or heuristic response proof;
- GET-implies-read-only promotion;
- new mutability, runtime-binding, replay, dossier, owner-policy, selection, publication, AI, or promotion authority;
- changing Phase-24 eligibility rules merely to increase eligible counts;
- disk-backed source/proof caches;
- workflow churn to mask zero-step GitHub Actions billing/platform failures;
- broad campaign-orchestrator refactoring;
- test deletion, skip addition, assertion weakening, or verdict caching.

## Success signal

The primary success signal is lower false-proof risk, not a higher eligible count.

A valid terminal result may reduce response/semantic/Phase-24 counts if the old count depended on an unsound proof. That is a correctness improvement and must be reported as such.

A coverage increase is acceptable only when it follows from a newly proven exact static family that passes the admission bar in the delta specification.

## Execution handoff

The authoritative executor instructions are in .agent/EXECUTION_PROMPT.md.

Before source edits, the executor must create a fresh native continuity-v2 task at:

.agent/tasks/nightwatch-source-proof-soundness-and-static-discovery-hardening-v1/

with SPEC.md, PLAN.md, STATE.md, and REPORT.md, and route .agent/ACTIVE_TASK.md to that task. The completed source-analysis-runtime-hardening task remains immutable history.
