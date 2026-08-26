# Report — Source-Analysis Runtime Hardening

Task ID: nightwatch-source-analysis-runtime-hardening-v1
Phase: SOURCE-ANALYSIS-RUNTIME-HARDENING-V1
Status: IN_PROGRESS
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

This is the live handoff for the authorized OpenSpec campaign. It is not a
completion claim. The final report will replace this opening with the required
audit manifest, bottleneck evidence, implementation decisions, parity/digest
proof, adversarial results, validation ledger, performance/RSS measurements,
rejected candidates, Git/Actions truth, safety vector, and residual risks.

## Campaign routing

- OpenSpec change: `nightwatch-source-analysis-runtime-hardening-v1`
- Frozen planning source: `openspec/changes/nightwatch-source-analysis-runtime-hardening-v1/`
- Authorization: `NIGHTWATCH_SOURCE_ANALYSIS_RUNTIME_HARDENING_LOCAL_SOURCE_SYNTHETIC_ONLY`
- Starting SHA: `bebe357313b7210161c5524e90c442137a605aab`
- Target branch: `main`
- Scope: local/source/synthetic only; no DEV/NEXT/production or data/infra
  operations.

## Initial evidence

The repository was pulled fast-forward-only from `origin/main`, the tree was
clean, and local `HEAD == origin/main` at the starting SHA. The OpenSpec
change is complete as a planning artifact and exposes 53 ordered tasks.
`hardening:check` passed before activation. Continuity/project checks were
expected to reject the stale predecessor routing and will be re-run after
activation.

## Current status

M0 bootstrap and M1 exhaustive audit are complete. M2 differential parity
harness construction is in progress. No source implementation change has yet
been made by this campaign.

## M1 audit and baseline evidence

The deterministic tracked-file manifest used `git ls-files -z`, NUL-safe path
handling, and bytewise C-locale sorting. Every one of 1,303 tracked paths was
read and hashed; the manifest SHA-256 is
`e9269825ec1d63d7ca329b3bb674faaba0c7989fa1a483631ead3b4a442e422b`, the
per-file hash ledger SHA-256 is
`4a54cc1531c86ff5b4cadd450827c65c6522f87016db78476ddb341d7195e032`, and
the total is 14,211,727 bytes / 284,308 lines. Sanitized category counts are:
agent/tooling/planning 435; executable source 405; tests 228; fixture/corpus
112; bin CLI 49; durable docs 30; config/workflow 25; UI 14; scenario 1;
artifact scaffold 1; other 3.

The affected runtime-loader census found exactly 20 `.ts` require hooks under
`bin/`. All use ES2022/CommonJS/Node10 with `esModuleInterop` and
`skipLibCheck`, and all save/restore the prior extension hook in `finally`.
`bin/portfolio.mjs` uses a distinct compiler fingerprint path and is retained
outside this duplicate-hook migration. Source discovery has one production
operator caller (`bin/nightwatch-intelligence.mjs`), one Control Center
authority adapter, and synthetic/unit/browser consumers. The exact-read cone
is the confined sibling reader, scan inventory, response-flow index, handler
joins, per-operation observations, response declarations, readonly census and
semantic expectation paths.

Hygiene counts were TODO 11, FIXME 2, HACK 3, XXX 1, DEPRECATED 30,
dead-path 4 and duplicate 1,401 matches. Manual review classified affected
duplicate hits as intentional duplicate detection/deduplication, historical
records or fixtures; no unrelated cleanup is part of this campaign.

Baseline representative source commands all exited 0 with empty stderr:

| command | stdout bytes / SHA-256 | wall | peak RSS |
| --- | --- | ---: | ---: |
| source-scan | 685,354 / `5e6344a6…4dfdb66` | 12.89s | 265,104 KB |
| source-gaps | 29,150 / `63ec5588…854550c` | 10.97s | 261,424 KB |
| eligibility-census | 394,890 / `b338dafa…e93d452` | 10.28s | 263,088 KB |
| readonly-census | 18,024 / `bf6e6749…26e91ac` | 11.46s | 262,220 KB |
| surfaces | 1,829,001 / `d34bb0ee…3b9fff8` | 10.88s | 301,564 KB |

The inventory was six CURRENT repositories with 1,732 considered, 1,092 read,
1,078 admitted and 654 rejected files; the safe snapshot/config digests were
`srcsnapshot:sha256:04ff583971865f335902f5ad` and
`srcconfig:sha256:e8bdfc8f0e58d7d93a87215`. These baseline outputs are
sanitized and remain outside Git under `/tmp`.

## Safety statement

No product environment, authentication material, owner-only findings, data
store, cloud/infrastructure system, Alphaus sibling write, external
publication, runtime model, or self-development promotion path has been used.
