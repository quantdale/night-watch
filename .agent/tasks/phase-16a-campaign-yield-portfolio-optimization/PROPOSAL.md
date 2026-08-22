# Phase 16A — Campaign Yield & Portfolio Optimization

Status at publication: NONE
Authorization at publication: NOT_GRANTED
Required execution token: `PHASE_16A_CAMPAIGN_YIELD_PORTFOLIO_LOCAL_ONLY`
Starting predecessor: Phase 15H terminal locally verified / externally CI-blocked.

## Goal

Turn Nightwatch's now-hardened whole-system architecture into a higher-yield bug-hunting planner: rank and allocate campaign work across existing approved read-only surfaces, reduce starvation/duplication, make source-change and semantic coverage evidence load-bearing, and produce a deterministic owner-gated campaign manifest ready for a later contained DEV run.

## Why now

Phase 15H proved the local architecture across all phase families. The remaining bottleneck is no longer correctness of the internal platform; it is campaign selection quality and useful bug-yield per bounded execution budget.

## Boundaries

Local/source/synthetic only. No DEV/NEXT/production execution, no real campaign, no browser/API product execution, no data-plane access, no Alphaus sibling writes, no Phase 6 expansion, no Phase 11B/13B, no new endpoint/target authority, no AI/model oracle authority, no selfDev/promotion/catalog mutation.

## Success

A deterministic portfolio planner, bounded budget allocator, novelty/yield scoring, starvation controls, campaign-plan manifest, backtest/simulation evidence, operator tooling, and a separate owner-gated DEV handoff. Zero real execution is expected in this phase.
