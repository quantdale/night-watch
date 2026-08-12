# Phase 4 Safe-Action Catalog and Candidate Inventory

Catalog version: `nightwatch.safe-actions.phase4.v1` (planned)
Status: `SOURCE_ARCHAEOLOGY_PENDING`

The catalog is intentionally empty until source archaeology proves each action
from control handler through endpoint semantics. This document will contain
both admitted actions and rejected candidates; absence from the catalog never
means “not reviewed.” No live DOM crawling is permitted.

## Candidate schema

Each candidate will record: candidate ID, anchor, surface/control, source file
and symbol, source SHA/freshness, action type, precondition, locator strategy,
client-state effect, network effect, known reads, known mutations, unknown
endpoints, persisted preference effect, analytics effect, route effect,
expected state delta, replay safety, privacy risk, and verdict.

## Approved actions

None yet.

## Rejected-action ledger

None yet; populate explicitly during M2. Candidate verdicts include
`REJECT_MUTATION`, `REJECT_UNKNOWN`, `REJECT_PERSISTED_PREFERENCE`,
`REJECT_UNSTABLE_SELECTOR`, `REJECT_CUSTOMER_SPECIFIC`,
`REJECT_NONDETERMINISTIC`, `REJECT_OTHER`, and approved local/read classes.

## Review rule

A seed, model, runtime DOM, or visible label cannot promote a candidate. A
source change after catalog creation invalidates the relevant action until the
source delta is reviewed.
