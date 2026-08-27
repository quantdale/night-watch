# Nightwatch — Variant B Canonical Promotion + Control Center CLI Hardening

## Task purpose

Execute two bounded workstreams:

1. **Workstream A — Variant B canonical promotion:** adopt the second portfolio variant (EXPAND_THEN_COLLAPSE) into the canonical adopted-case catalog through the proven Phase 8B.1 owner-gated mechanism, bringing the catalog to 2 entries and the portfolio to EXHAUSTED.

2. **Workstream B — Control Center CLI Node 22 fix:** repair the TypeScript runtime loader so that the standalone `nightwatch-control-center.mjs` CLI launcher works on Node 22, fixing the `.ts` extension resolution gap when compiled CommonJS re-exports require sibling `.ts` modules.

## Starting state

- Task ID: `nightwatch-variant-b-adoption-and-cli-hardening`
- Starting SHA: `9372ec81caf9a23816c1d5b5a1eca5f20e6208bc`
- Branch/remote: `main` / private `origin`
- Catalog: 1 adopted entry (variant A: EXPAND_SUMMARY), count=1, digest `401b2c67...`
- Portfolio: variant B (EXPAND_THEN_COLLAPSE) is AVAILABLE_NOT_ADOPTED, NEXT_PROMOTION_AUTHORITY: NONE
- Control Center: UI builds, 51 unit tests pass, standalone CLI fails on Node 22 with `ERR_MODULE_NOT_FOUND`
- The Phase 8B.1-R1 retry consumed its approval and is immutable terminal history

## Authorization

Owner authorizes exactly one additional canonical promotion (variant B) via this task. Authorization class: `NIGHTWATCH_VARIANT_B_CANONICAL_PROMOTION_AND_CLI_HARDENING_V1`.

## Required outcomes

1. Control Center standalone CLI works on Node 22.22.1 (`node bin/nightwatch-control-center.mjs --port 7317` starts and serves).
2. One fresh canonical promotion executed: clean source → fresh v2 selfDev → eligibility → candidate → PASS evaluation → Phase 8B plan → sandbox-verified result → promotion intent → owner approval → canonical write → fresh-process verify → dirty-tree local validation → development-session Git commit.
3. Catalog count goes from 1→2; portfolio goes to EXHAUSTED; post-commit session proves EXHAUSTED with passCandidateCount 0.
4. Full local regression passes, including the dirty-tree window.
5. Documentation updated (CURRENT_STATE: NEXT_PROMOTION_AUTHORITY from NONE to SPENT, catalog digest, variant B as ADOPTED; ROADMAP: Phase 8B.1 portfolio status).

## Scope

- `bin/lib/typescript-runtime-loader.mjs` — Module._resolveFilename hook for `.ts` extension fallback
- Control Center `index.ts` — re-export pattern (if needed after loader fix)
- Full 8B.1 promotion chain: selfDev session, sandbox proof, promotion intent, approval, apply, verify
- `tests/unit/` — CLI loader regression tests
- `docs/CURRENT_STATE.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md` — project truth updates

## Non-goals

No second adoption beyond variant B; no generic runtime Git write; no product, AI, database, infrastructure, publication, or DEV/NEXT/production contact; no changes to Phase 8B.1-R1 historical records; no architectural changes to the promotion mechanism.

## Safety constraints

- Zero DEV/NEXT/production contact, zero product mutation, zero database/infrastructure queries, zero external AI/model calls, zero publication, zero Alphaus writes.
- Runtime Git write authority is permanently zero; the development session (this agent) performs the Git commit after validation.
- Exactly ONE canonical source write (variant B apply), one approval consumption, one Git commit for the promotion.
- All Control Center testing uses loopback synthetic fixtures only; no external state.

## Completion condition

- Control Center CLI starts and serves `http://127.0.0.1:7317/api/health` on Node 22
- Catalog has exactly 2 entries (A + B)
- Full local regression passes (including dirty-tree window)
- Typecheck, hardening, agent:check, project:check, and catalog-integrity all pass
- The validated promotion commit is pushed to `origin/main`, local HEAD == origin/main, clean worktree