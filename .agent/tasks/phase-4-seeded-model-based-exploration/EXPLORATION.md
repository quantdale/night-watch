# Phase 4 Exploration Envelopes and Seed Ledger

Status: `PRE_REAL_READY_REAL_BLOCKED_ON_HUMAN_AUTH`

Required envelopes are E1/J1 payer exchange, E2/J2 common exchange, and E3/J3
account inventory. The source-reviewed boundaries are:

| envelope | route class | admitted action IDs | network envelope |
|---|---|---|---|
| E1/J1 | `/payer-exchange-rate-v2` | J1 vendor local views, J1 status local views, trusted return-to-anchor | no action-caused request for local actions; anchor family `ripple.payer-exchange.read`; mutation family forbidden |
| E2/J2 | `/global-exchange-rate-v2` | J2 AWS/Azure vendor reads, trusted return-to-anchor | `ripple.common-exchange.read`; mutation family forbidden |
| E3/J3 | `/accounts` | J3 account/billing-group local sort; trusted return-to-anchor | no action-caused request for local sort; anchor families `ripple.billing-groups.read` and `ripple.account-inventory.read`; J3 vendor switch stale/excluded |

The three envelopes have branching approved paths. E3 is intentionally local
only because the current tracking-ref delta changed the vendor request graph.
No live DOM crawling was used. The fixed real corpus has not executed because
the external DEV auth state failed boolean preflight before context creation.

The fixed real budget is two preselected seeds per envelope plus at most one
exact-sequence reproduction per envelope with a nontrivial path: six fresh
contexts and up to three fresh reproduction contexts. No seeds have been
executed yet; the preselected corpus is recorded in the implementation ledger
before the real gate.

## Frozen seed corpus

| envelope | seed A | seed B | purpose |
|---|---|---|---|
| E1/J1 | `0x0000000000000101` | `0x0000000000000102` | two deterministic local-filter branches |
| E2/J2 | `0x0000000000000201` | `0x0000000000000202` | two deterministic known-read vendor branches |
| E3/J3 | `0x0000000000000301` | `0x0000000000000302` | two deterministic local-sort branches |

The corpus is fixed before DEV execution and is not tuned to historical
anomalies.

Runtime-unavailable controls are recorded and excluded deterministically. A
new host, production destination, known mutation, action-caused UNKNOWN, route
escape, or fatal oracle stops the current run; a known mutation stops all real
Phase 4 execution.
