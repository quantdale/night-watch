# PROPOSAL — Phase 16C Portfolio Runtime Binding & Real Approved Universe

Task ID: `phase-16c-portfolio-runtime-binding-real-universe`
Phase: `16C-PORTFOLIO-RUNTIME-BINDING-REAL-UNIVERSE`
Publication status: DESIGNED_NOT_STARTED_NOT_AUTHORIZED

## Problem

Phase 16B stopped correctly at `BLOCKED_RUNTIME_BINDING_MISSING`. Current source has a hardened deterministic Phase-16A/16H portfolio plan + inert DEV handoff, but the existing Phase-7 real campaign launcher/prepare-resume flow has no consumer for either artifact, no consumer for the handoff authorization token, no deterministic mapping from portfolio members/units to runtime work items/budget dimensions, and the default portfolio fixtures include synthetic-only identities with no real runtime counterpart.

## Goal

Implement and harden, entirely locally, the missing safe bridge **inside the existing campaign prepare/resume architecture**:

1. a deterministic builder over the **current real approved Nightwatch runtime universe**;
2. a strict handoff/plan admission + authorization gate;
3. a monotone-restrictive mapping from selected portfolio members/budgets into the existing campaign runtime profile;
4. checkpoint/resume fingerprint binding so drift fails before executor use;
5. an opt-in launcher input path that feeds the existing prepare/resume flow without introducing a second executor.

The handoff remains `executable:false`; the separate authorization is what permits the existing runtime to consume it. Portfolio data never creates authority.

## Non-goals

No DEV/NEXT/production contact, no real campaign, no authenticated browser, no new endpoint/target authority, no data-plane/DB/infra, no Phase-6 expansion, no Alphaus sibling writes, no AI/model authority, no selfDev/promotion/catalog mutation, no Phase 11B/13B execution.

## Successor

If this task is locally hardened and terminal, a future separately authorized Phase 16D may retry the single bounded contained-DEV acceptance campaign. This task itself never performs that retry.
