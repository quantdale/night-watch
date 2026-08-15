# Phase 8B.1 — Owner-Gated Canonical Promotion — SPEC

Task ID: `phase-8b-1-owner-gated-canonical-promotion`

## Owner authorization

`PHASE_8B_1_ONE_CANONICAL_PROMOTION`. Authorized promotion count: exactly 1
(one candidate, one promotion intent, one approval, one approval
consumption, one canonical source write, one adopted catalog entry, one
promotion Git commit). Runtime Git write authority: none. Alphaus write
authority: none.

## Mission

Prove: given one exact current-source-eligible synthetic candidate whose
deterministic Phase 8B adoption plan has already been proven in a disposable
sandbox, Nightwatch can create one owner-approved canonical promotion intent,
consume that approval exactly once, atomically write the exact same
deterministic postimage to the fixed canonical adopted-case catalog,
independently verify the dirty canonical working tree in a fresh process,
and then allow the development session — never Nightwatch runtime — to
commit that exact one-file promotion only after all deterministic validation
passes.

## Trust chain

Clean current source -> fresh v2 selfDev session -> current-source
eligibility -> exact eligible candidate -> exact PASS evaluation -> exact
Phase 8B plan -> fresh sandbox-verified result (all five probes PASS) ->
canonical promotion intent -> explicit one-shot owner approval -> revalidate
clean current source -> atomic one-file canonical write -> dirty-worktree
canonical verification -> full local tests -> development-session Git
commit -> exact CI -> post-commit provenance verification -> STOP.

## New trust boundary

`src/core/selfDevPromotion/` — distinct from `src/core/selfDev/` (pure
evaluation) and `src/core/selfDevSandbox/` (disposable-mirror adoption).
Only this boundary may ever write the canonical adopted-case catalog target
at runtime, and it never performs a Git write; the one Git commit of its one
permitted write is always performed by the development session.

## Canonical write target

Exactly one: `src/core/selfDev/adoptedCaseCatalog.generated.ts`. No
caller-supplied target, path option, or directory option exists anywhere in
the new CLI.

## Owner policy

New distinct operation `SELF_DEVELOPMENT_CANONICAL_ADOPTION`, deliberately
added under `OWNER_SCOPE_POLICY_VERSION` bump to `nightwatch.owner-scope-policy.v2`
(a material authority expansion: canonical source-write authority did not
exist under v1). It authorizes only "apply one exact owner-approved
deterministic adopted-case postimage to the fixed canonical catalog." It does
not authorize any other file, Alphaus repo, Git, publication, product,
database, or infrastructure operation.

## Non-goals (explicitly out of scope)

Multiple canonical promotions in this task; bulk promotion; arbitrary source
changes; AI-selected/product-derived/customer-derived candidates; runtime Git
writes; Alphaus repository mutation; external publication; campaign/AI/
product/database/infrastructure integration into the promotion subsystem.
